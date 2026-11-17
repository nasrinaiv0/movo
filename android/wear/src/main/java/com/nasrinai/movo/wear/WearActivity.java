package com.nasrinai.movo.wear;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.wear.remote.interactions.RemoteActivityHelper;
import com.google.common.util.concurrent.ListenableFuture;

/**
 * Minimal privacy-first watch companion. No banking data, permission, login,
 * network call, or transaction mutation can occur on the watch.
 * A user tap hands a fixed, parameter-free URI to the paired Android phone.
 */
public final class WearActivity extends Activity {
    private final int background = Color.rgb(9, 18, 14);
    private final int foreground = Color.WHITE;
    private TextView status;
    private Button quickLog;

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(background);
        getWindow().setNavigationBarColor(background);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(background);
        LinearLayout body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setGravity(Gravity.CENTER);
        body.setPadding(dp(18), dp(16), dp(18), dp(20));

        TextView title = new TextView(this);
        title.setText("MOVO");
        title.setTextSize(25);
        title.setTextColor(foreground);
        title.setTypeface(null, 1);
        title.setGravity(Gravity.CENTER);
        body.addView(title);

        TextView subtitle = new TextView(this);
        subtitle.setText("Money Organizer & Visual Outflow");
        subtitle.setGravity(Gravity.CENTER);
        subtitle.setTextSize(11);
        subtitle.setTextColor(Color.rgb(190, 210, 199));
        subtitle.setPadding(0, dp(5), 0, dp(14));
        body.addView(subtitle);

        quickLog = new Button(this);
        quickLog.setAllCaps(false);
        quickLog.setText("Quick Log on phone");
        quickLog.setContentDescription("Open MOVO Quick Log on your paired Android phone");
        quickLog.setTextColor(Color.WHITE);
        quickLog.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(9, 107, 58)));
        quickLog.setMinHeight(dp(48));
        quickLog.setOnClickListener(v -> openOnPhone());
        body.addView(quickLog, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(52)));

        status = new TextView(this);
        status.setText("Your financial data stays on your phone.");
        status.setTextColor(Color.rgb(190, 210, 199));
        status.setTextSize(12);
        status.setGravity(Gravity.CENTER);
        status.setPadding(0, dp(13), 0, 0);
        body.addView(status);

        scroll.addView(body);
        setContentView(scroll);
    }

    private void openOnPhone() {
        quickLog.setEnabled(false);
        status.setText("Connecting to phone…");
        Intent handoff = new Intent(Intent.ACTION_VIEW, Uri.parse("movo://wear-log"))
                .addCategory(Intent.CATEGORY_BROWSABLE);
        final ListenableFuture<Void> pending = new RemoteActivityHelper(this, getMainExecutor())
                .startRemoteActivity(handoff, null);
        pending.addListener(() -> {
            if (isFinishing() || isDestroyed()) return;
            quickLog.setEnabled(true);
            try {
                pending.get();
                status.setText("Continue in MOVO on your phone.");
            } catch (Exception error) {
                status.setText("Could not reach your phone. Open MOVO manually.");
            }
        }, getMainExecutor());
    }
}
