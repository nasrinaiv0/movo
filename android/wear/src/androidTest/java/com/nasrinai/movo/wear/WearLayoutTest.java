package com.nasrinai.movo.wear;

import android.graphics.Bitmap;
import android.graphics.Rect;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.Test;
import org.junit.runner.RunWith;
import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.scrollTo;
import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.matcher.ViewMatchers.withText;
import static org.junit.Assert.*;

/** Runs on real Wear emulator surfaces; no paired phone, credentials or financial fixtures. */
@RunWith(AndroidJUnit4.class)
public final class WearLayoutTest {
    private Button button(View view) {
        if (view instanceof Button && "Quick Log on phone".contentEquals(((Button) view).getText())) return (Button) view;
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int i = 0; i < group.getChildCount(); i++) {
                Button found = button(group.getChildAt(i));
                if (found != null) return found;
            }
        }
        return null;
    }

    @Test public void enlargedActionIsFullyVisibleAndFitsRoundDisplay() throws Exception {
        try (ActivityScenario<WearActivity> scenario = ActivityScenario.launch(WearActivity.class)) {
            onView(withText("Quick Log on phone")).perform(scrollTo());
            scenario.onActivity(activity -> {
                Button action = button(activity.getWindow().getDecorView());
                assertNotNull(action);
                Rect visible = new Rect();
                assertTrue(action.getGlobalVisibleRect(visible));
                assertEquals(action.getWidth(), visible.width());
                assertEquals(action.getHeight(), visible.height());
                float density = activity.getResources().getDisplayMetrics().density;
                assertTrue("Touch target must be at least 48dp", visible.height() >= 48 * density);
                assertTrue("Text must grow the button rather than clipping", action.getLayout().getHeight()
                        <= action.getHeight() - action.getCompoundPaddingTop() - action.getCompoundPaddingBottom());
                if (activity.getResources().getConfiguration().isScreenRound()) {
                    float w = activity.getResources().getDisplayMetrics().widthPixels;
                    float h = activity.getResources().getDisplayMetrics().heightPixels;
                    float radius = Math.min(w, h) / 2;
                    int[] location = new int[2]; action.getLocationOnScreen(location);
                    for (int x : new int[] { location[0], location[0] + action.getWidth() }) {
                        for (int y : new int[] { location[1], location[1] + action.getHeight() }) {
                            assertTrue("Action corner is clipped by round display", Math.hypot(x - w / 2, y - h / 2) <= radius + 1);
                        }
                    }
                }
            });
            Bitmap screenshot = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
            assertNotNull(screenshot);
            File file = new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null), "wear-layout.png");
            try (FileOutputStream out = new FileOutputStream(file)) { assertTrue(screenshot.compress(Bitmap.CompressFormat.PNG, 100, out)); }
            screenshot.recycle();
        }
    }

    @Test public void unreachablePhoneCannotLeaveTheActionDisabledForever() {
        try (ActivityScenario<WearActivity> scenario = ActivityScenario.launch(WearActivity.class)) {
            onView(withText("Quick Log on phone")).perform(scrollTo(), click());
            AtomicBoolean enabled = new AtomicBoolean(false);
            long deadline = SystemClock.uptimeMillis() + 17000;
            while (!enabled.get() && SystemClock.uptimeMillis() < deadline) {
                scenario.onActivity(activity -> enabled.set(button(activity.getWindow().getDecorView()).isEnabled()));
                if (!enabled.get()) SystemClock.sleep(100);
            }
            assertTrue("A failed or timed-out handoff must allow another deliberate tap", enabled.get());
        }
    }
}
