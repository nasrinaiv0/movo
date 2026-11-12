package com.nasrinai.movo;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
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
