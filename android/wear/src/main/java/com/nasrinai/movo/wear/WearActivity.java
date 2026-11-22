package com.nasrinai.movo.wear;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.wear.remote.interactions.RemoteActivityHelper;
import androidx.wear.widget.SwipeDismissFrameLayout;
import com.google.common.util.concurrent.ListenableFuture;

/**
 * Minimal privacy-first watch companion. No banking data, permission, login,
 * network call, or transaction mutation can occur on the watch.
 * A user tap hands a fixed, parameter-free URI to the paired Android phone.
 */
public final class WearActivity extends Activity {
    private final int background = Color.BLACK;
    private final int foreground = Color.WHITE;
    private TextView status;
    private Button quickLog;
    private ScrollView scroll;
    private LinearLayout body;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private ListenableFuture<Void> request;
    private final Runnable requestTimeout = () -> {
        if (request != null && !request.isDone()) {
            request.cancel(false);
            request = null;
            quickLog.setEnabled(true);
            status.setText("Could not reach your phone. Open MOVO manually.");
        }
    };

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(background);
        getWindow().setNavigationBarColor(background);

        SwipeDismissFrameLayout root = new SwipeDismissFrameLayout(this);
        root.setBackgroundColor(background);
        root.addCallback(new SwipeDismissFrameLayout.Callback() {
            @Override public void onDismissed(SwipeDismissFrameLayout layout) { finish(); }
        });
        scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setVerticalScrollBarEnabled(true);
        scroll.setBackgroundColor(background);
        body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setGravity(Gravity.CENTER);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            fitRoundScreen(insets);
            return insets;
        });

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
        quickLog.setTextSize(14);
        quickLog.setPadding(dp(8), dp(12), dp(8), dp(12));
        quickLog.setOnClickListener(v -> openOnPhone());
        body.addView(quickLog, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        status = new TextView(this);
        status.setText(state == null ? "Your financial data stays on your phone." : state.getString("status", "Open MOVO manually on your phone."));
        status.setTextColor(Color.rgb(190, 210, 199));
        status.setTextSize(12);
        status.setGravity(Gravity.CENTER);
        status.setPadding(0, dp(13), 0, 0);
        body.addView(status);

        scroll.addView(body);
        root.addView(scroll, new SwipeDismissFrameLayout.LayoutParams(
                SwipeDismissFrameLayout.LayoutParams.MATCH_PARENT, SwipeDismissFrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);
        root.requestApplyInsets();
    }

    private void fitRoundScreen(WindowInsets insets) {
        // The inscribed rectangle keeps even enlarged, wrapping controls inside a round display.
        int round = getResources().getConfiguration().isScreenRound()
                ? Math.round(getResources().getDisplayMetrics().widthPixels * 0.146447f) : dp(16);
        scroll.setPadding(Math.max(round, insets.getSystemWindowInsetLeft()),
                Math.max(round, insets.getSystemWindowInsetTop()),
                Math.max(round, insets.getSystemWindowInsetRight()),
                Math.max(round, insets.getSystemWindowInsetBottom()));
    }

    @Override public boolean onGenericMotionEvent(MotionEvent event) {
        if (event.getAction() == MotionEvent.ACTION_SCROLL
                && event.isFromSource(InputDevice.SOURCE_ROTARY_ENCODER)) {
            int dy = Math.round(-event.getAxisValue(MotionEvent.AXIS_SCROLL)
                    * ViewConfiguration.get(this).getScaledVerticalScrollFactor());
            scroll.scrollBy(0, dy);
            return true;
        }
        return super.onGenericMotionEvent(event);
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        state.putString("status", request == null ? status.getText().toString() : "Open MOVO on your phone to continue.");
        super.onSaveInstanceState(state);
    }

    @Override protected void onDestroy() {
        handler.removeCallbacks(requestTimeout);
        if (request != null) request.cancel(false);
        request = null;
        super.onDestroy();
    }

    private void openOnPhone() {
        if (request != null) return;
        quickLog.setEnabled(false);
        status.setText("Connecting to phone…");
        Intent handoff = new Intent(Intent.ACTION_VIEW, Uri.parse("movo://wear-log"))
                .addCategory(Intent.CATEGORY_BROWSABLE);
        final ListenableFuture<Void> pending;
        try {
            pending = new RemoteActivityHelper(this, getMainExecutor()).startRemoteActivity(handoff, null);
        } catch (RuntimeException error) {
            quickLog.setEnabled(true);
            status.setText("Could not reach your phone. Open MOVO manually.");
            return;
        }
        request = pending;
        handler.postDelayed(requestTimeout, 15000);
        pending.addListener(() -> {
            if (isFinishing() || isDestroyed() || request != pending) return;
            handler.removeCallbacks(requestTimeout);
            request = null;
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
