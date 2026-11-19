package com.nasrinai.movo.r8;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.Log;
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
            launchRelease();
            switch (test) {
                case "bridgeVaultPersistsAcrossActivityRecreation":
                    bridgeVaultPersistsAcrossActivityRecreation();
                    break;
                case "seedOfflineWallet":
                    awaitJs("initial Home before writing the synthetic wallet", "!!document.querySelector('main[data-view=\"Home\"]')", 45000);
                    seedWallet();
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

    private void offlineWalletLogoStyleAndSyntheticOAuthCallback() throws Exception {
        assertBridgeContracts();
        // ADB already isolated the entire emulator before this fresh app process booted.
        // Seeding runs in a separate process so we cannot click a document that is being replaced.
        runOnMainSync(() -> requireWebView(activity).setNetworkAvailable(false));
        awaitJs("offline Home rendered from the saved wallet", "navigator.onLine === false && " +
            "!!document.querySelector('main[data-view=\"Home\"]') && " +
            "JSON.parse(localStorage.getItem('movo.local.accounts.v1'))?.[0]?.id===" + quote(ACCOUNT), 45000);
        clickJs("Wallet button", "document.querySelector('.bottom-nav button[aria-label=Wallet]')");
        awaitJs("offline Wallet route", "!!document.querySelector('main[data-view=\"Wallet\"]')", 15000);
        clickJs("Cards filter", "Array.from(document.querySelectorAll('.wallet-chip-bar button[data-chip]'))" +
            ".find(button=>button.textContent.trim()==='Cards')");
        awaitJs("bundled logo and saved card finish", "(() => {const c=document.querySelector('.credit-card');" +
            "const img=c?.querySelector('.ccx-logo img');return !!c && c.textContent.includes('BPI') && c.textContent.includes('7788') && " +
            "c.classList.contains('ink-dark') && getComputedStyle(c).getPropertyValue('--card-tint').trim()==='#7f8792' && " +
            "!!img && img.complete && img.naturalWidth>0 && new URL(img.currentSrc).pathname==='/brands/offline/bpi.com.ph.png';})()", 20000);
        awaitJs("synthetic wallet fixture persisted", "JSON.parse(localStorage.getItem('movo.local.accounts.v1'))[0].id===" + quote(ACCOUNT), 1000);
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

    private void seedWallet() throws Exception {
        String legalDate = arguments.getString("movoLegalDate", "");
        String legalRevision = arguments.getString("movoLegalRevision", "");
        assertTrue("Pass the checked-out app's effective date as movoLegalDate", legalDate.matches("\\d{4}-\\d{2}-\\d{2}"));
        assertTrue("Invalid synthetic legal revision", legalRevision.isEmpty() || legalRevision.matches(legalDate + "-r[1-9]\\d*"));
        for (String key : target.getSharedPreferences("movo_auth_ciphertext", Context.MODE_PRIVATE).getAll().keySet()) {
            assertTrue("Use a clean disposable emulator; auth data appeared during startup",
                key.equals(VAULT_KEY) || key.equals(RESTART_KEY) || key.equals("movo-finance-cache-key-v1"));
        }
        asyncJs("(async () => {" +
            "const old=JSON.parse(localStorage.getItem('movo.local.accounts.v1')||'[]');" +
            "const txs=JSON.parse(localStorage.getItem('movo.local.transactions.v1')||'[]');" +
            "const prefs=JSON.parse(localStorage.getItem('movo.preferences.v3')||'{}');" +
            "if(old.some(a=>a.id!==" + quote(ACCOUNT) + ") || txs.length || Object.keys(localStorage).some(k=>k.startsWith('sb-')) || (prefs.profileName && prefs.profileName!=='R8 Synthetic')) throw Error('Use a clean disposable emulator');" +
            "Object.assign(prefs,{onboarded:true,tutorialSeen:true,planWelcomeSeen:true,legalAccepted:" + quote(legalDate) + "," +
            (legalRevision.isEmpty() ? "" : "legalAcceptedRevision:" + quote(legalRevision) + ",") +
            "legalAcceptedAt:" + quote(legalDate + "T00:00:00.000Z") + ",profileName:'R8 Synthetic',language:'en',country:'PH',currency:'PHP'," +
            "theme:'light',showBalance:true,cloudSyncEnabled:false,briefing:false,accountStyles:{[" + quote(ACCOUNT) + "]:{cardKind:'credit',creditLimit:5000,chip:'silver',cardNetwork:'visa'}}," +
            "cardStyles:{[" + quote(ACCOUNT) + "]:'finish:silver'}});" +
            "const rows=[{id:" + quote(ACCOUNT) + ",name:'R8 Synthetic Card',institution_name:'BPI',account_type:'card',cardKind:'credit'," +
            "currency:'PHP',opening_balance:-125.5,mask:'7788',source:'Manual'}];" +
            "const values={'movo.preferences.v3':JSON.stringify(prefs),'movo.local.accounts.v1':JSON.stringify(rows),'movo.local.transactions.v1':'[]'};" +
            "for(const [key,value] of Object.entries(values)){localStorage.setItem(key,value);await window.Capacitor.nativePromise('Preferences','set',{key,value});} return {};})()");
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

    private void clickJs(String label, String button) throws Exception {
        awaitJs("enabled " + label, "!!(" + button + ")?.matches(':enabled')", 15000);
        assertEquals("Could not click " + label, "true", eval("(() => {" +
            "const target=" + button + ";if(!target||target.disabled)return false;target.click();return true;})()"));
    }

    private void awaitJs(String label, String expression, long timeoutMs) throws Exception {
        long end = SystemClock.uptimeMillis() + timeoutMs;
        while (SystemClock.uptimeMillis() < end) {
            if ("true".equals(eval("(() => {try{return !!(" + expression + ");}catch(_){return false;}})()"))) return;
            SystemClock.sleep(100);
        }
        String state = eval("JSON.stringify({view:document.querySelector('main')?.dataset.view, " +
            "online:navigator.onLine, visibility:document.visibilityState, " +
            "walletDisabled:document.querySelector('button[aria-label=Wallet]')?.disabled, " +
            "splash:!!document.getElementById('movo-splash')})");
        throw new AssertionError("Timed out waiting for " + label + "; page state: " + state);
    }

    private String eval(String script) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> value = new AtomicReference<>();
        AtomicReference<Throwable> failure = new AtomicReference<>();
        runOnMainSync(() -> {
            try { requireWebView(activity).evaluateJavascript(script, result -> { value.set(result); done.countDown(); }); }
            catch (Throwable error) { failure.set(error); done.countDown(); }
        });
        assertTrue("WebView JavaScript callback stalled", done.await(10, TimeUnit.SECONDS));
        if (failure.get() != null) throw new AssertionError("Release WebView unavailable", failure.get());
        return value.get();
    }

    private static String quote(String value) { return JSONObject.quote(value); }

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
