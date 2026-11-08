package com.nasrinai.movo;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MovoNativePlugin.class);
        super.onCreate(savedInstanceState);
        // Privacy over convenience: OS screenshots and app-switcher previews
        // must not capture personal balances, card details or QR codes.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
    }
}
