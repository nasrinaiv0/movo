package com.nasrinai.movo;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.activity.result.ActivityResultLauncher;
import androidx.browser.auth.AuthTabIntent;
import androidx.browser.customtabs.CustomTabsClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String AUTH_HOST = "auth-callback";
    private static final String CHROME_PACKAGE = "com.android.chrome";

    private final ActivityResultLauncher<Intent> googleAuthLauncher =
            AuthTabIntent.registerActivityResultLauncher(this, this::handleGoogleAuthResult);

    boolean openGoogleAuthTab(Uri authorizationUrl) {
        String scheme = googleAuthScheme();
        if (!authorizationUrl.isHierarchical() || !"https".equals(authorizationUrl.getScheme())
                || authorizationUrl.getHost() == null || authorizationUrl.getUserInfo() != null
                || !"/auth/v1/authorize".equals(authorizationUrl.getPath())
                || !"google".equals(authorizationUrl.getQueryParameter("provider"))
                || !(scheme + "://" + AUTH_HOST).equals(authorizationUrl.getQueryParameter("redirect_to"))) {
            throw new IllegalArgumentException("invalid_google_auth_url");
        }

        String provider = CustomTabsClient.getPackageName(this, null);
        if (provider == null || !CustomTabsClient.isAuthTabSupported(this, provider)) {
            if (!CustomTabsClient.isAuthTabSupported(this, CHROME_PACKAGE)) return false;
            provider = CHROME_PACKAGE;
        }

        AuthTabIntent authTab = new AuthTabIntent.Builder().build();
        authTab.intent.setPackage(provider);
        try {
            authTab.launch(googleAuthLauncher, authorizationUrl, scheme);
            return true;
        } catch (ActivityNotFoundException ignored) {
            // The browser can be disabled between discovery and launch.
            return false;
        }
    }

    private void handleGoogleAuthResult(AuthTabIntent.AuthResult result) {
        Uri callback = result.resultUri;
        if (result.resultCode != AuthTabIntent.RESULT_OK || callback == null
                || !googleAuthScheme().equals(callback.getScheme())
                || !AUTH_HOST.equals(callback.getEncodedAuthority())) return;

        // Match the existing deep-link route and keep its stricter JS code parser.
        onNewIntent(new Intent(Intent.ACTION_VIEW, callback));
    }

    private String googleAuthScheme() {
        return "com.nasrinai.movo.authcheck".equals(getPackageName()) ? "movo-authcheck" : "movo";
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MovoNativePlugin.class);
        super.onCreate(savedInstanceState);
        // Owner decision 2026-11-12: people may take screenshots of MOVO (FLAG_SECURE is no longer set while the
        // app is in use). The recent-apps preview still must not show balances, card details or QR codes:
        // Android 13+ keeps it blank; older versions cover it in onPause below.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            setRecentsScreenshotEnabled(false);
        }
    }

    @Override
    public void onPause() {
        // Android 12 and older take the recent-apps thumbnail as the app leaves the screen: mark the window secure
        // for that moment only, so the thumbnail is blank.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        }
        super.onPause();
    }

    @Override
    public void onResume() {
        super.onResume();
        // Back in use: screenshots and screen recording work again.
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
    }
}
