package com.nasrinai.movo.wear;

import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Rect;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ScrollView;
import java.io.PrintWriter;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.Test;
import org.junit.runner.RunWith;
import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
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

    // Espresso scrollTo aligns the descendant edge, which can land inside the
    // round display's clipped padding. Center the actual view in its ScrollView
    // viewport and keep the independent full-visibility and corner assertions.
    private void centerAction(ActivityScenario<WearActivity> scenario) {
        scenario.onActivity(activity -> {
            Button action = button(activity.getWindow().getDecorView());
            assertNotNull(action);
            android.view.ViewParent parent = action.getParent();
            while (parent != null && !(parent instanceof ScrollView)) parent = parent.getParent();
            assertTrue("Quick Log must be inside its scrollable viewport", parent instanceof ScrollView);
            ScrollView viewport = (ScrollView) parent;
            Rect target = new Rect(0, 0, action.getWidth(), action.getHeight());
            viewport.offsetDescendantRectToMyCoords(action, target);
            int center = (viewport.getPaddingTop() + viewport.getHeight() - viewport.getPaddingBottom()) / 2;
            viewport.scrollTo(viewport.getScrollX(), Math.max(0, target.centerY() - center));
            float expected = Float.parseFloat(InstrumentationRegistry.getArguments().getString("expectedFontScale", "1.0"));
            assertEquals("Actual application font scale", expected, activity.getResources().getConfiguration().fontScale, 0.01f);
        });
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();
    }

    // View geometry can precede the compositor's scroll frame. Require the real
    // screenshot to contain the action's current tint inside its current bounds.
    private boolean showsRenderedAction(Bitmap shot, Rect bounds, int tint) {
        if (bounds.isEmpty() || bounds.left < 0 || bounds.top < 0
                || bounds.right > shot.getWidth() || bounds.bottom > shot.getHeight()) return false;
        // Android 14 UiAutomation can return a GPU-backed screenshot. Pixel reads
        // require a software copy; keep the original real capture for the artifact.
        Bitmap pixels = shot.getConfig() == Bitmap.Config.HARDWARE
                ? shot.copy(Bitmap.Config.ARGB_8888, false) : shot;
        assertNotNull("Readable screenshot copy", pixels);
        try {
            int insetX = Math.max(1, bounds.width() / 6);
            int insetY = Math.max(1, bounds.height() / 6);
            int stepX = Math.max(1, (bounds.width() - 2 * insetX) / 8);
            int stepY = Math.max(1, (bounds.height() - 2 * insetY) / 8);
            int matching = 0, samples = 0;
            for (int y = bounds.top + insetY; y < bounds.bottom - insetY; y += stepY) {
                for (int x = bounds.left + insetX; x < bounds.right - insetX; x += stepX) {
                    int pixel = pixels.getPixel(x, y);
                    if (Math.abs(Color.red(pixel) - Color.red(tint)) <= 20
                            && Math.abs(Color.green(pixel) - Color.green(tint)) <= 20
                            && Math.abs(Color.blue(pixel) - Color.blue(tint)) <= 20) matching++;
                    samples++;
                }
            }
            return samples > 0 && matching * 4 >= samples;
        } finally {
            if (pixels != shot) pixels.recycle();
        }
    }

    private Bitmap actionScreenshot(ActivityScenario<WearActivity> scenario) {
        long deadline = SystemClock.uptimeMillis() + 3000;
        do {
            InstrumentationRegistry.getInstrumentation().waitForIdleSync();
            Rect bounds = new Rect();
            int[] tint = new int[1];
            scenario.onActivity(activity -> {
                assertTrue("MOVO must keep foreground focus during capture", activity.hasWindowFocus());
                Button action = button(activity.getWindow().getDecorView());
                assertNotNull(action);
                assertTrue(action.getGlobalVisibleRect(bounds));
                assertEquals(action.getWidth(), bounds.width());
                assertEquals(action.getHeight(), bounds.height());
                assertNotNull(action.getBackgroundTintList());
                tint[0] = action.getBackgroundTintList().getColorForState(
                        action.getDrawableState(), action.getBackgroundTintList().getDefaultColor());
            });
            Bitmap shot = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
            if (shot != null) {
                boolean accepted = false;
                try {
                    accepted = showsRenderedAction(shot, bounds, tint[0]);
                    if (accepted) return shot;
                } finally {
                    if (!accepted) shot.recycle();
                }
            }
            SystemClock.sleep(100);
        } while (SystemClock.uptimeMillis() < deadline);
        throw new AssertionError("Captured frame never showed Quick Log inside its verified bounds");
    }

    private void capture(ActivityScenario<WearActivity> scenario, String name, boolean requireRenderedAction) throws Exception {
        File dir = InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null);
        assertNotNull(dir);
        Bitmap screenshot = requireRenderedAction ? actionScreenshot(scenario)
                : InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
        assertNotNull("In-test screenshot", screenshot);
        try {
        try (PrintWriter out = new PrintWriter(new File(dir, name + ".txt"))) {
            scenario.onActivity(activity -> {
                Button action = button(activity.getWindow().getDecorView());
                out.println("fontScale=" + activity.getResources().getConfiguration().fontScale);
                out.println("windowFocus=" + activity.hasWindowFocus());
                out.println("display=" + activity.getResources().getDisplayMetrics());
                if (action != null) {
                    Rect visible = new Rect();
                    int[] xy = new int[2]; action.getLocationOnScreen(xy);
                    out.println("action=" + action.getWidth() + "x" + action.getHeight()
                        + " at " + xy[0] + "," + xy[1] + " visible=" + action.getGlobalVisibleRect(visible) + " " + visible);
                    android.view.ViewParent p = action.getParent();
                    while (p != null && !(p instanceof ScrollView)) p = p.getParent();
                    if (p instanceof ScrollView) {
                        ScrollView v = (ScrollView) p;
                        out.println("viewport=" + v.getWidth() + "x" + v.getHeight() + " scrollY=" + v.getScrollY()
                            + " padding=" + v.getPaddingLeft() + "," + v.getPaddingTop() + "," + v.getPaddingRight() + "," + v.getPaddingBottom());
                    }
                }
            });
        }
        try (FileOutputStream out = new FileOutputStream(new File(dir, name + ".png"))) {
            assertTrue(screenshot.compress(Bitmap.CompressFormat.PNG, 100, out));
        }
        } finally { screenshot.recycle(); }
    }

    private void captureFailure(ActivityScenario<WearActivity> scenario, String name, Throwable failure) {
        try { capture(scenario, name, false); }
        catch (Throwable diagnostic) { failure.addSuppressed(diagnostic); }
    }

    @Test public void enlargedActionIsFullyVisibleAndFitsRoundDisplay() throws Exception {
        try (ActivityScenario<WearActivity> scenario = ActivityScenario.launch(WearActivity.class)) {
            scenario.onActivity(activity -> activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));
            try {
            centerAction(scenario);
            onView(withText("Quick Log on phone")).check(matches(isDisplayed()));
            scenario.onActivity(activity -> {
                assertTrue("MOVO must have foreground window focus", activity.hasWindowFocus());
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
                            assertTrue(String.format(java.util.Locale.ROOT, "Action corner (%d,%d) is clipped by round display: distance %.1f > radius %.1f; action %dx%d at (%d,%d) on %.0fx%.0f",
                                    x, y, Math.hypot(x - w / 2, y - h / 2), radius, action.getWidth(), action.getHeight(), location[0], location[1], w, h),
                                    Math.hypot(x - w / 2, y - h / 2) <= radius + 1);
                        }
                    }
                }
            });
            capture(scenario, "wear-layout", true);
            } catch (Exception | AssertionError failure) {
                captureFailure(scenario, "wear-layout-failure", failure);
                throw failure;
            }
        }
    }

    @Test public void unreachablePhoneCannotLeaveTheActionDisabledForever() {
        try (ActivityScenario<WearActivity> scenario = ActivityScenario.launch(WearActivity.class)) {
            scenario.onActivity(activity -> activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));
            try {
            centerAction(scenario);
            onView(withText("Quick Log on phone")).check(matches(isDisplayed())).perform(click());
            AtomicBoolean enabled = new AtomicBoolean(false);
            long deadline = SystemClock.uptimeMillis() + 17000;
            while (!enabled.get() && SystemClock.uptimeMillis() < deadline) {
                scenario.onActivity(activity -> enabled.set(button(activity.getWindow().getDecorView()).isEnabled()));
                if (!enabled.get()) SystemClock.sleep(100);
            }
            assertTrue("A failed or timed-out handoff must allow another deliberate tap", enabled.get());
            } catch (RuntimeException | AssertionError failure) {
                captureFailure(scenario, "wear-handoff-failure", failure);
                throw failure;
            }
        }
    }
}
