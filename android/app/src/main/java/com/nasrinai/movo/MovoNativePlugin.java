package com.nasrinai.movo;

import android.content.ClipData;
import android.content.ClipDescription;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.BitmapFactory;
import android.net.Uri;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import java.util.UUID;
import android.os.Build;
import android.os.PersistableBundle;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.SecureRandom;
import java.util.concurrent.atomic.AtomicBoolean;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Device-only vault for Supabase auth values. The AES-256 key is generated
 * inside Android Keystore, is not exportable, and is not included in backups.
 * Preferences contain only ciphertext and per-record random GCM IVs.
 * A failed Keystore call NEVER falls back to storing credentials as plaintext.
 */
@CapacitorPlugin(name = "MovoNative")
public class MovoNativePlugin extends Plugin {
    private static final String KEY_ALIAS = "com.nasrinai.movo.auth.aes.v1";
    private static final String PREFS = "movo_auth_ciphertext";
    private static final String STORE_NAME = "AndroidKeyStore";
    private static final int GCM_TAG_BITS = 128;
    private static final int IV_SIZE = 12;

    private String friendInviteUrl(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !url.matches("https://movo\\.nasrinai\\.com/friend#invite=[A-Za-z0-9_-]{43}")) {
            call.reject("invalid_friend_invite");
            return null;
        }
        return url;
    }

    @PluginMethod
    public void shareFriendInvite(PluginCall call) {
        String url = friendInviteUrl(call);
        if (url == null) return;
        final Uri imageUri;
        String image = call.getString("image");
        try {
            if (image != null) {
                String prefix = "data:image/png;base64,";
                if (!image.startsWith(prefix) || image.length() > 1500000) throw new IllegalArgumentException();
                byte[] bytes = Base64.decode(image.substring(prefix.length()), Base64.DEFAULT);
                byte[] signature = {(byte)137,80,78,71,13,10,26,10};
                if (bytes.length < 24 || bytes.length > 1000000) throw new IllegalArgumentException();
                for (int i = 0; i < signature.length; i++) if (bytes[i] != signature[i]) throw new IllegalArgumentException();
                BitmapFactory.Options bounds = new BitmapFactory.Options(); bounds.inJustDecodeBounds = true;
                BitmapFactory.decodeByteArray(bytes, 0, bytes.length, bounds);
                if (bounds.outWidth < 1 || bounds.outHeight < 1 || bounds.outWidth > 1200 || bounds.outHeight > 1200) throw new IllegalArgumentException();
                File folder = new File(getContext().getCacheDir(), "friend-invites");
                if (!folder.isDirectory() && !folder.mkdirs()) throw new java.io.IOException();
                File[] previous = folder.listFiles();
                if (previous != null) for (File item : previous) {
                    if (item.lastModified() < System.currentTimeMillis() - 3600000L) item.delete();
                }
                File file = new File(folder, UUID.randomUUID().toString() + ".png");
                try (FileOutputStream output = new FileOutputStream(file)) { output.write(bytes); }
                imageUri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
                getBridge().getWebView().postDelayed(() -> file.delete(), 3600000L);
            } else imageUri = null;
        } catch (Exception error) { call.reject("invalid_friend_card"); return; }
        getActivity().runOnUiThread(() -> {
            Intent share = new Intent(Intent.ACTION_SEND);
            share.setType(imageUri == null ? "text/plain" : "image/png");
            if (imageUri != null) {
                share.putExtra(Intent.EXTRA_STREAM, imageUri);
                share.setClipData(ClipData.newRawUri("MOVO friend profile", imageUri));
                share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            }
            share.putExtra(Intent.EXTRA_TEXT, url);
            try {
                getActivity().startActivity(Intent.createChooser(share, null));
                call.resolve();
            } catch (android.content.ActivityNotFoundException e) {
                call.reject("share_unavailable");
            }
        });
    }

    @PluginMethod
    public void copyFriendInvite(PluginCall call) {
        String url = friendInviteUrl(call);
        if (url == null) return;
        getActivity().runOnUiThread(() -> {
            ClipboardManager clipboard = getContext().getSystemService(ClipboardManager.class);
            if (clipboard == null) {
                call.reject("clipboard_unavailable");
                return;
            }
            ClipData clip = ClipData.newPlainText("MOVO", url);
            PersistableBundle extras = new PersistableBundle();
            extras.putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true);
            clip.getDescription().setExtras(extras);
            clipboard.setPrimaryClip(clip);
            call.resolve();
        });
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private String validateKey(PluginCall call) {
        final String key = call.getString("key");
        if (key == null || !(key.equals("movo-autolog-key") || key.equals("movo-finance-cache-key-v1") || key.equals("movo-finance-vault-key-v1") || (key.startsWith("sb-") && key.contains("-auth-token"))) || key.length() >= 128) {
            call.reject("invalid_secure_auth_key");
            return null;
        }
        return key;
    }

    private SecretKey getOrCreateKey() throws Exception {
        final KeyStore store = KeyStore.getInstance(STORE_NAME);
        store.load(null);
        if (store.containsAlias(KEY_ALIAS)) {
            final KeyStore.Entry entry = store.getEntry(KEY_ALIAS, null);
            if (!(entry instanceof KeyStore.SecretKeyEntry)) throw new IllegalStateException("invalid_keystore_entry");
            return ((KeyStore.SecretKeyEntry) entry).getSecretKey();
        }
        final KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, STORE_NAME);
        final KeyGenParameterSpec spec = new KeyGenParameterSpec.Builder(KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setKeySize(256)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build();
        generator.init(spec);
        return generator.generateKey();
    }

    /**
     * Referral download links (api/download.js): Google Play keeps the "referrer" value of the store link that led to
     * this install, e.g. "utm_source=movo_referral&utm_medium=qr&movo_ref=M78038". Returns that text (or "" when there
     * is none, Play is unavailable, or the app was not installed from Play). Read once by src/lib/installReferral.js;
     * the app only keeps a valid referral code from it, and the server decides whether the code counts.
     */
    @PluginMethod
    public void installReferrer(PluginCall call) {
        final AtomicBoolean answered = new AtomicBoolean(false);
        final InstallReferrerClient client;
        try {
            client = InstallReferrerClient.newBuilder(getContext()).build();
        } catch (Exception e) {
            resolveReferrer(call, answered, "");
            return;
        }
        try {
            client.startConnection(new InstallReferrerStateListener() {
                @Override
                public void onInstallReferrerSetupFinished(int responseCode) {
                    String referrer = "";
                    if (responseCode == InstallReferrerClient.InstallReferrerResponse.OK) {
                        try {
                            final String value = client.getInstallReferrer().getInstallReferrer();
                            if (value != null && value.length() <= 1024) referrer = value;
                        } catch (Exception ignored) {
                            referrer = "";
                        }
                    }
                    try { client.endConnection(); } catch (Exception ignored) { }
                    resolveReferrer(call, answered, referrer);
                }

                @Override
                public void onInstallReferrerServiceDisconnected() {
                    resolveReferrer(call, answered, "");
                }
            });
        } catch (Exception e) {
            resolveReferrer(call, answered, "");
        }
    }

    private void resolveReferrer(PluginCall call, AtomicBoolean answered, String referrer) {
        if (!answered.compareAndSet(false, true)) return;
        final JSObject result = new JSObject();
        result.put("referrer", referrer);
        call.resolve(result);
    }

    /**
     * Rate MOVO (src/lib/reviewPrompt.js): Google Play's own in-app review card. Play decides whether it appears
     * (quota) and never reports what was rated; MOVO only learns that the flow finished.
     */
    @PluginMethod
    public void requestReview(PluginCall call) {
        final android.app.Activity activity = getActivity();
        final JSObject result = new JSObject();
        if (activity == null) {
            result.put("requested", false);
            call.resolve(result);
            return;
        }
        final ReviewManager manager = ReviewManagerFactory.create(activity);
        manager.requestReviewFlow().addOnCompleteListener(request -> {
            if (!request.isSuccessful()) {
                result.put("requested", false);
                call.resolve(result);
                return;
            }
            final ReviewInfo info = request.getResult();
            manager.launchReviewFlow(activity, info).addOnCompleteListener(done -> {
                result.put("requested", true);
                call.resolve(result);
            });
        });
    }

    @PluginMethod
    public void secureGet(PluginCall call) {
        final String key = validateKey(call);
        if (key == null) return;
        final String blob = prefs().getString(key, null);
        final JSObject out = new JSObject();
        if (blob == null) {
            out.put("value", org.json.JSONObject.NULL);
            call.resolve(out);
            return;
        }
        try {
            final String[] parts = blob.split(":", -1);
            if (parts.length != 2) throw new IllegalArgumentException("bad_ciphertext");
            final byte[] iv = Base64.decode(parts[0], Base64.NO_WRAP);
            if (iv.length != IV_SIZE) throw new IllegalArgumentException("bad_nonce");
            final byte[] ciphertext = Base64.decode(parts[1], Base64.NO_WRAP);
            final Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), new GCMParameterSpec(GCM_TAG_BITS, iv));
            // Bind encrypted data to its storage key to prohibit swapping values.
            cipher.updateAAD(key.getBytes(StandardCharsets.UTF_8));
            out.put("value", new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8));
            call.resolve(out);
        } catch (Exception e) {
            call.reject("secure_auth_read_failed");
        }
    }

    @PluginMethod
    public void secureSet(PluginCall call) {
        final String key = validateKey(call);
        if (key == null) return;
        final String value = call.getString("value");
        if (value == null) { call.reject("invalid_secure_auth_value"); return; }
        try {
            final Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey());
            final byte[] iv = cipher.getIV();
            if (iv.length != IV_SIZE) throw new IllegalStateException("bad_nonce");
            cipher.updateAAD(key.getBytes(StandardCharsets.UTF_8));
            final byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            final String blob = Base64.encodeToString(iv, Base64.NO_WRAP)
                    + ":" + Base64.encodeToString(encrypted, Base64.NO_WRAP);
            if (!prefs().edit().putString(key, blob).commit()) throw new IllegalStateException("commit_failed");
            call.resolve();
        } catch (Exception e) {
            call.reject("secure_auth_write_failed");
        }
    }

    @PluginMethod
    public void secureRemove(PluginCall call) {
        final String key = validateKey(call);
        if (key == null) return;
        if (prefs().edit().remove(key).commit()) call.resolve();
        else call.reject("secure_auth_delete_failed");
    }
}
