package com.nasrinai.movo.r8;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.Log;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import java.io.File;
import java.io.FileOutputStream;
import java.util.Objects;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;
import org.json.JSONArray;
import org.json.JSONTokener;

/**
 * Opt-in minified-release acceptance on a CLEAN disposable emulator only.
 * No app hooks, WebView debugging, real account, provider login or store purchase.
 * Uses framework classes to avoid shared AndroidX dependencies in the minified target process.
 */
public final class ReleaseBridgeSmokeTest extends Instrumentation {
    private static final String PACKAGE = "com.nasrinai.movo";
    private static final String VAULT_KEY = "sb-movo-r8-smoke-auth-token";
    private static final String RESTART_KEY = "sb-movo-r8-restart-auth-token";
    private static final String VALUE = "SYNTHETIC_R8_VAULT_VALUE_NOT_A_SESSION";
    private static final String ACCOUNT = "ce9eb35d-7060-46b4-8cef-bc3bbcd70001";
    private Bundle arguments;
    private Activity activity;
    private Context target;

    @Override
    public void onCreate(Bundle arguments) {
        super.onCreate(arguments);
        this.arguments = arguments == null ? new Bundle() : arguments;
        start();
    }

    @Override
    public void onStart() {
        String test = arguments.getString("movoTest", "");
        String phase = arguments.getString("movoPersistencePhase", "");
        Throwable failure = null;
        try {
            assertTrue("Enable only with movoR8Smoke=true", "true".equals(arguments.getString("movoR8Smoke")));
            if (test.equals("seedOfflineWallet")) seedWalletBeforeLaunch();
            launchRelease();
            switch (test) {
                case "bridgeVaultPersistsAcrossActivityRecreation":
                    bridgeVaultPersistsAcrossActivityRecreation();
                    break;
                case "seedOfflineWallet":
                    awaitJs("synthetic wallet restored by the real startup bridge",
                        "!!document.querySelector('main[data-view=\"Home\"]') && " +
                        savedWalletCondition() + " && " +
                        "JSON.parse(localStorage.getItem('movo.preferences.v3'))?.onboarded===true", 45000);
                    break;
                case "offlineWalletLogoStyleAndSyntheticOAuthCallback":
                    offlineWalletLogoStyleAndSyntheticOAuthCallback();
                    break;
                case "processPersistencePhase":
                    processPersistencePhase(phase);
                    break;
                default:
                    throw new AssertionError("Unknown MOVO release smoke test: " + test);
            }
        } catch (Throwable error) {
            failure = error;
        } finally {
            try {
                closeActivity();
            } catch (Throwable cleanup) {
                if (failure == null) failure = cleanup;
                else failure.addSuppressed(cleanup);
            }
        }
        Bundle result = new Bundle();
        String label = phase.isEmpty() ? test : phase;
        if (failure == null) {
            result.putString(REPORT_KEY_STREAMRESULT, "\nMOVO_R8_SMOKE_PASS " + label + "\n");
            finish(Activity.RESULT_OK, result);
        } else {
            result.putString(REPORT_KEY_STREAMRESULT, "\n" + Log.getStackTraceString(failure));
            finish(Activity.RESULT_CANCELED, result);
        }
    }

    private void launchRelease() throws Exception {
        target = getTargetContext();
        assertEquals("Never run this on another package", PACKAGE, target.getPackageName());
        assertEquals("Smoke test must target the non-debuggable RELEASE APK", 0,
            target.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE);
        // Refuse a device containing any non-test native auth credential.
        for (String key : target.getSharedPreferences("movo_auth_ciphertext", Context.MODE_PRIVATE).getAll().keySet()) {
            assertTrue("Use a clean disposable emulator; existing native auth data detected",
                key.equals(VAULT_KEY) || key.equals(RESTART_KEY) || key.equals("movo-finance-cache-key-v1"));
        }
        Intent launch = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
            .setClassName(PACKAGE, PACKAGE + ".MainActivity").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity = startActivitySync(launch);
        awaitJs("cold bundled WebView and JavaScript bridge", "document.readyState === 'complete' && " +
            "document.querySelector('#root')?.children.length > 0 && typeof window.Capacitor?.nativePromise === 'function'", 45000);
    }

    private void closeActivity() throws Exception {
        if (activity == null) return;
        try {
            screenshot("last-state.png");
        } finally {
            runOnMainSync(() -> activity.finish());
        }
    }

    private void recreateActivity() {
        Activity original = activity;
        ActivityMonitor monitor = addMonitor(PACKAGE + ".MainActivity", null, false);
        try {
            runOnMainSync(original::recreate);
            Activity recreated = monitor.waitForActivityWithTimeout(45000);
            assertTrue("Expected a new MainActivity after recreation", recreated != null && recreated != original);
            activity = recreated;
            waitForIdleSync();
        } finally {
            removeMonitor(monitor);
        }
    }

    private void bridgeVaultPersistsAcrossActivityRecreation() throws Exception {
        assertBridgeContracts();
        screenshot("cold-bridge.png");
        JSONObject result = asyncJs("(async () => {const C=window.Capacitor;" +
            "await C.nativePromise('MovoNative','secureSet',{key:" + quote(VAULT_KEY) + ",value:" + quote(VALUE) + "});" +
            "return await C.nativePromise('MovoNative','secureGet',{key:" + quote(VAULT_KEY) + "});})()");
        assertEquals(VALUE, result.getString("value"));
        String saved = target.getSharedPreferences("movo_auth_ciphertext", Context.MODE_PRIVATE).getString(VAULT_KEY, "");
        assertFalse("Vault must persist ciphertext, never the synthetic plaintext", saved.contains(VALUE));
        assertTrue("Native AES-GCM IV:ciphertext record missing", saved.contains(":"));
        recreateActivity();
        awaitJs("bridge after Activity recreation", "typeof window.Capacitor?.nativePromise === 'function'", 45000);
        assertEquals(VALUE, asyncJs("window.Capacitor.nativePromise('MovoNative','secureGet',{key:" + quote(VAULT_KEY) + "})").getString("value"));
        JSONObject removed = asyncJs("(async () => {await window.Capacitor.nativePromise('MovoNative','secureRemove',{key:" + quote(VAULT_KEY) + "});" +
            "return await window.Capacitor.nativePromise('MovoNative','secureGet',{key:" + quote(VAULT_KEY) + "});})()");
        assertTrue("secureGet must return null after removal", removed.isNull("value"));
        assertFalse("secureRemove must remove the persisted ciphertext",
            target.getSharedPreferences("movo_auth_ciphertext", Context.MODE_PRIVATE).contains(VAULT_KEY));
    }

    private String savedWalletCondition() {
        // Unencrypted app versions retain the exact plaintext fixture-ID check.
        // Both compiler variants of encrypted app source require no plaintext
        // copy and must render the fixture balance;
        // the subsequent card/finish checks verify its ACCOUNT-keyed style too.
        if (!"true".equals(arguments.getString("movoExpectEncryptedFinance", "false"))) {
            return "JSON.parse(localStorage.getItem('movo.local.accounts.v1'))?.[0]?.id===" + quote(ACCOUNT);
        }
        return "(() => {const raw=localStorage.getItem('movo.local.accounts.v1');" +
            "const sealed=JSON.parse(localStorage.getItem('movo.finance.sealed.v1:movo.local.accounts.v1'));" +
            "return raw===null && sealed?.__movo_finance_sealed_v1===1 && sealed.alg==='XCHACHA20-POLY1305' && " +
            "typeof sealed.n==='string' && sealed.n.length===32 && typeof sealed.c==='string' && sealed.c.length>24 && " +
            "localStorage.getItem('movo.finance.vault.initialized.v1')==='v1' && " +
            "document.querySelector('main')?.textContent.includes('125.50');})()";
    }

    private void offlineWalletLogoStyleAndSyntheticOAuthCallback() throws Exception {
        assertBridgeContracts();
        // ADB already isolated the entire emulator before this fresh app process booted.
        // Seeding runs in a separate process so we cannot click a document that is being replaced.
        runOnMainSync(() -> requireWebView(activity).setNetworkAvailable(false));
        awaitJs("offline Home rendered from the saved wallet", "navigator.onLine === false && " +
            "!!document.querySelector('main[data-view=\"Home\"]') && " +
            savedWalletCondition(), 45000);
        tapControl("Wallet button", "document.querySelector('.bottom-nav button[aria-label=Wallet]')");
        awaitJs("offline Wallet route", "!!document.querySelector('main[data-view=\"Wallet\"]')", 15000);
        String cardsFilter = "Array.from(document.querySelectorAll('.wallet-chip-bar button[data-chip]'))" +
            ".find(button=>button.textContent.trim()==='Cards')";
        tapControl("Cards filter", cardsFilter);
        awaitJs("selected Cards view with the bundled logo and saved finish", "(() => {" +
            "const screen=document.querySelector('main[data-view=Wallet]');" +
            "const card=screen?.querySelector('.adaptive-wallet-cards .credit-card');" +
            "const image=card?.querySelector('.ccx-logo img');" +
            "return (" + cardsFilter + ")?.getAttribute('aria-pressed')==='true' && " +
            "getComputedStyle(screen).opacity==='1' && !!card && " +
            "card.textContent.includes('BPI') && card.textContent.includes('7788') && card.classList.contains('ink-dark') && " +
            "getComputedStyle(card).getPropertyValue('--card-tint').trim()==='#7f8792' && " +
            "!!image && image.complete && image.naturalWidth>0 && " +
            "new URL(image.currentSrc).pathname==='/brands/offline/bpi.com.ph.png';})()", 20000);
        awaitJs("synthetic wallet fixture persisted in the required storage format", savedWalletCondition(), 1000);
        awaitWalletFrame();
        screenshot("offline-wallet.png");
        assertBridgeContracts();
        // A real Android ACTION_VIEW reaches Capacitor App -> the actual React
        // callback. This is a synthetic PROVIDER FAILURE, not a successful login.
        Intent callback = new Intent(Intent.ACTION_VIEW,
            Uri.parse("movo://auth-callback?error=r8_synthetic_denial"))
            .addCategory(Intent.CATEGORY_BROWSABLE).setPackage(PACKAGE)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        assertTrue("Release manifest lost the native OAuth callback route", target.getPackageManager().resolveActivity(callback, 0) != null);
        target.startActivity(callback);
        awaitJs("native callback reached the MOVO sign-in error handler",
            "document.body.innerText.includes('OA-PROVIDER') && !document.body.innerText.includes('r8_synthetic_denial')", 20000);
        screenshot("synthetic-oauth-failure.png");
    }

    /**
     * Optional REAL process-restart pair: invoke this same method in TWO separate
     * `am instrument` runs with -e movoPersistencePhase seed, then verify, and
     * `am force-stop com.nasrinai.movo` BETWEEN runs (outside instrumentation).
     * Killing the target from inside instrumentation kills its runner as well.
     */
    private void processPersistencePhase(String phase) throws Exception {
        assertTrue("Expected an explicit process-restart phase", phase.equals("seed") || phase.equals("verify"));
        assertBridgeContracts();
        if (phase.equals("seed")) {
            asyncJs("(async () => {await window.Capacitor.nativePromise('MovoNative','secureSet',{key:" + quote(RESTART_KEY) + ",value:" + quote(VALUE) + "}); return {};})()");
        } else {
            assertEquals("Native ciphertext/key must survive a separate instrumentation process", VALUE,
                asyncJs("window.Capacitor.nativePromise('MovoNative','secureGet',{key:" + quote(RESTART_KEY) + "})").getString("value"));
            asyncJs("(async () => {await window.Capacitor.nativePromise('MovoNative','secureRemove',{key:" + quote(RESTART_KEY) + "}); return {};})()");
        }
    }

    private void assertBridgeContracts() throws Exception {
        JSONObject result = asyncJs("(async () => {const C=window.Capacitor; const required={" +
            "MovoNative:['secureSet','secureGet','secureRemove','installReferrer','requestReview','shareFriendInvite','copyFriendInvite']," +
            "App:['getLaunchUrl','addListener'],Preferences:['get','set','remove'],Browser:['open','close']," +
            "NativePurchases:['getProducts','getPurchases','purchaseProduct','restorePurchases']};" +
            "for(const [name,methods] of Object.entries(required)){const header=C.PluginHeaders?.find(p=>p.name===name);" +
            "if(!header || methods.some(m=>!header.methods.some(x=>x.name===m))) throw Error('Missing reflected contract: '+name);} " +
            "await C.nativePromise('App','getLaunchUrl',{}); return {ok:true};})()");
        assertTrue(result.getBoolean("ok"));
    }

    private void seedWalletBeforeLaunch() throws Exception {
        target = getTargetContext();
        assertEquals("Never seed another package", PACKAGE, target.getPackageName());
        SharedPreferences store = target.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        assertTrue("Fixture must precede the first app launch on a fresh installation", store.getAll().isEmpty());
        String legalDate = arguments.getString("movoLegalDate", "");
        String legalRevision = arguments.getString("movoLegalRevision", "");
        assertTrue("Pass the checked-out app's effective date as movoLegalDate", legalDate.matches("\\d{4}-\\d{2}-\\d{2}"));
        assertTrue("Invalid synthetic legal revision", legalRevision.isEmpty() || legalRevision.matches(legalDate + "-r[1-9]\\d*"));
        for (String key : target.getSharedPreferences("movo_auth_ciphertext", Context.MODE_PRIVATE).getAll().keySet()) {
            assertTrue("Use a clean disposable emulator; auth data appeared during startup",
                key.equals(VAULT_KEY) || key.equals(RESTART_KEY) || key.equals("movo-finance-cache-key-v1"));
        }
        JSONObject style = new JSONObject().put("cardKind", "credit").put("creditLimit", 5000)
            .put("chip", "silver").put("cardNetwork", "visa");
        JSONObject prefs = new JSONObject().put("onboarded", true).put("tutorialSeen", true)
            .put("planWelcomeSeen", true).put("legalAccepted", legalDate)
            .put("legalAcceptedAt", legalDate + "T00:00:00.000Z").put("profileName", "R8 Synthetic")
            .put("language", "en").put("country", "PH").put("currency", "PHP").put("theme", "light")
            .put("showBalance", true).put("cloudSyncEnabled", false).put("briefing", false)
            .put("accountStyles", new JSONObject().put(ACCOUNT, style))
            .put("cardStyles", new JSONObject().put(ACCOUNT, "finish:silver"));
        if (!legalRevision.isEmpty()) prefs.put("legalAcceptedRevision", legalRevision);
        JSONObject guestPreferences = new JSONObject().put("version", 1).put("ownerId", JSONObject.NULL)
            .put("prefs", prefs).put("stickers", new JSONArray());
        JSONObject compatibilityPreferences = new JSONObject();
        for (String key : new String[] { "onboarded", "tutorialSeen", "planWelcomeSeen", "language", "country", "currency", "theme", "showBalance" }) {
            if (prefs.has(key)) compatibilityPreferences.put(key, prefs.get(key));
        }
        String accounts = new JSONArray().put(new JSONObject().put("id", ACCOUNT).put("name", "R8 Synthetic Card")
            .put("institution_name", "BPI").put("account_type", "card").put("cardKind", "credit")
            .put("currency", "PHP").put("opening_balance", -125.5).put("mask", "7788").put("source", "Manual")).toString();
        assertTrue("Synthetic fixture must reach disk before starting React", store.edit()
            .putString("movo.preferences.v3", compatibilityPreferences.toString())
            .putString("movo.preferences.scope.v1.guest", guestPreferences.toString())
            .putString("movo.local.accounts.v1", accounts)
            .putString("movo.local.transactions.v1", "[]").commit());
        assertEquals(compatibilityPreferences.toString(), store.getString("movo.preferences.v3", null));
        assertEquals(guestPreferences.toString(), store.getString("movo.preferences.scope.v1.guest", null));
        assertEquals(accounts, store.getString("movo.local.accounts.v1", null));
        assertEquals("[]", store.getString("movo.local.transactions.v1", null));
    }

    private JSONObject asyncJs(String expression) throws Exception {
        eval("(() => {window.__movoR8Smoke={pending:true};Promise.resolve().then(()=>" + expression + ").then(value=>" +
            "{window.__movoR8Smoke={done:true,value:value??{}};},error=>{window.__movoR8Smoke={done:true,error:String(error?.message||error)};});})()");
        awaitJs("JavaScript/native promise completion", "window.__movoR8Smoke?.done===true", 20000);
        Object decoded = new JSONTokener(eval("JSON.stringify(window.__movoR8Smoke)")).nextValue();
        JSONObject result = new JSONObject((String) decoded);
        assertFalse("Native promise rejected: " + result.optString("error"), result.has("error"));
        return result.getJSONObject("value");
    }

    private void tapControl(String label, String button) throws Exception {
        String hit = "(() => {" +
            "const button=" + button + "; if(!button?.matches(':enabled')) return null;" +
            "const rect=button.getBoundingClientRect();" +
            "const x=rect.left+rect.width/2, y=rect.top+rect.height/2;" +
            "const top=document.elementFromPoint(x,y);" +
            "if(!rect.width || !rect.height || !top || !button.contains(top)) return null;" +
            "return JSON.stringify({x,y,viewportWidth:innerWidth});})()";
        awaitJs("visible and tappable " + label, hit, 15000);
        Object result = new JSONTokener(eval("screen coordinates of " + label, hit)).nextValue();
        assertTrue("Control stopped being tappable: " + label, result instanceof String);
        JSONObject point = new JSONObject((String) result);

        // Use WebView JavaScript only to locate the control. A real Android tap
        // exercises pointer/click navigation without a JS action callback
        // competing with the route change in the renderer.
        int[] origin = new int[2];
        int[] size = new int[2];
        runOnMainSync(() -> {
            WebView view = requireWebView(activity);
            view.getLocationOnScreen(origin);
            size[0] = view.getWidth();
            size[1] = view.getHeight();
        });
        double viewportWidth = point.getDouble("viewportWidth");
        assertTrue("Release WebView has no visible bounds", viewportWidth > 0 && size[0] > 0 && size[1] > 0);
        double scale = size[0] / viewportWidth;
        float x = (float) (point.getDouble("x") * scale);
        float y = (float) (point.getDouble("y") * scale);
        assertTrue("Tap falls outside the release WebView: " + label,
            x >= 0 && x < size[0] && y >= 0 && y < size[1]);
        long downTime = SystemClock.uptimeMillis();
        for (int action : new int[] {MotionEvent.ACTION_DOWN, MotionEvent.ACTION_UP}) {
            MotionEvent event = MotionEvent.obtain(downTime, SystemClock.uptimeMillis(), action,
                origin[0] + x, origin[1] + y, 0);
            try {
                event.setSource(InputDevice.SOURCE_TOUCHSCREEN);
                assertTrue("Android rejected tap input for " + label, getUiAutomation().injectInputEvent(event, false));
            } finally {
                event.recycle();
            }
        }
    }

    private void awaitJs(String label, String expression, long timeoutMs) throws Exception {
        long end = SystemClock.uptimeMillis() + timeoutMs;
        while (SystemClock.uptimeMillis() < end) {
            if ("true".equals(eval(label, "(() => {try{return !!(" + expression + ");}catch(_){return false;}})()"))) return;
            SystemClock.sleep(100);
        }
        String state = eval("JSON.stringify({view:document.querySelector('main')?.dataset.view, " +
            "online:navigator.onLine, visibility:document.visibilityState, " +
            "walletDisabled:document.querySelector('button[aria-label=Wallet]')?.disabled, " +
            "splash:!!document.getElementById('movo-splash')})");
        throw new AssertionError("Timed out waiting for " + label + "; page state: " + state);
    }

    private String eval(String script) throws Exception {
        return eval("release WebView inspection", script);
    }

    private String eval(String label, String script) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> value = new AtomicReference<>();
        AtomicReference<Throwable> failure = new AtomicReference<>();
        runOnMainSync(() -> {
            try { requireWebView(activity).evaluateJavascript(script, result -> { value.set(result); done.countDown(); }); }
            catch (Throwable error) { failure.set(error); done.countDown(); }
        });
        assertTrue("WebView JavaScript callback stalled: " + label, done.await(10, TimeUnit.SECONDS));
        if (failure.get() != null) throw new AssertionError("Release WebView unavailable", failure.get());
        return value.get();
    }

    private static String quote(String value) { return JSONObject.quote(value); }

    private void awaitWalletFrame() throws InterruptedException {
        CountDownLatch frame = new CountDownLatch(1);
        runOnMainSync(() -> {
            WebView view = requireWebView(activity);
            view.postVisualStateCallback(1, new WebView.VisualStateCallback() {
                @Override
                public void onComplete(long requestId) {
                    view.postOnAnimation(frame::countDown);
                }
            });
        });
        assertTrue("Wallet did not render an Android WebView frame", frame.await(10, TimeUnit.SECONDS));
        // The visual-state fence and following animation frame are the required
        // render signal. A global idle wait can stall on continuously animated UI.
    }

    private void screenshot(String name) throws Exception {
        Bitmap image = getUiAutomation().takeScreenshot();
        assertTrue("Instrumentation could not capture the disposable emulator", image != null);
        File folder = new File(target.getExternalFilesDir(null), "r8-smoke");
        assertTrue("Synthetic screenshot directory unavailable", folder.isDirectory() || folder.mkdirs());
        try (FileOutputStream output = new FileOutputStream(new File(folder, name))) {
            assertTrue("Synthetic screenshot write failed", image.compress(Bitmap.CompressFormat.PNG, 100, output));
        } finally { image.recycle(); }
    }

    private static void assertTrue(String message, boolean condition) {
        if (!condition) throw new AssertionError(message);
    }

    private static void assertTrue(boolean condition) {
        assertTrue("Expected true", condition);
    }

    private static void assertFalse(String message, boolean condition) {
        assertTrue(message, !condition);
    }

    private static void assertEquals(String message, Object expected, Object actual) {
        if (!Objects.equals(expected, actual)) {
            throw new AssertionError(message + " (expected " + expected + ", got " + actual + ")");
        }
    }

    private static void assertEquals(Object expected, Object actual) {
        assertEquals("Unexpected value", expected, actual);
    }

    private static WebView requireWebView(Activity activity) {
        WebView view = findWebView(activity.getWindow().getDecorView());
        if (view == null) throw new AssertionError("Release activity has no WebView");
        return view;
    }

    private static WebView findWebView(View view) {
        if (view instanceof WebView) return (WebView) view;
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int index = 0; index < group.getChildCount(); index++) {
                WebView found = findWebView(group.getChildAt(index));
                if (found != null) return found;
            }
        }
        return null;
    }
}
