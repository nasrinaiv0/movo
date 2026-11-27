package com.nasrinai.movo;

import android.graphics.Rect;
import android.view.View;
import androidx.core.content.ContextCompat;
import androidx.core.util.Consumer;
import androidx.window.java.layout.WindowInfoTrackerCallbackAdapter;
import androidx.window.layout.DisplayFeature;
import androidx.window.layout.FoldingFeature;
import androidx.window.layout.WindowInfoTracker;
import androidx.window.layout.WindowLayoutInfo;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Read-only, ephemeral window geometry. No financial data, storage, permissions or commands. */
@CapacitorPlugin(name = "MovoWindow")
public final class MovoWindowPlugin extends Plugin {
    private WindowInfoTrackerCallbackAdapter tracker;
    private WindowLayoutInfo layout;
    private View webView;
    private boolean observing;
    private String lastGeometry = "";
    private final Consumer<WindowLayoutInfo> callback = value -> { layout = value; publish(); };
    private final View.OnLayoutChangeListener resized = (v, l, t, r, b, ol, ot, or, ob) -> publish();

    @Override public void load() {
        getActivity().runOnUiThread(() -> {
            webView = getBridge().getWebView();
            webView.addOnLayoutChangeListener(resized);
            tracker = new WindowInfoTrackerCallbackAdapter(WindowInfoTracker.getOrCreate(getActivity()));
            observe();
        });
    }

    private void observe() {
        if (tracker == null || observing) return;
        tracker.addWindowLayoutInfoListener(getActivity(), ContextCompat.getMainExecutor(getContext()), callback);
        observing = true;
        publish();
    }

    private void stopObserving() {
        if (tracker != null && observing) tracker.removeWindowLayoutInfoListener(callback);
        observing = false;
    }

    private JSObject geometry() {
        JSObject value = new JSObject();
        int width = webView == null ? 0 : webView.getWidth();
        int height = webView == null ? 0 : webView.getHeight();
        value.put("width", width);
        value.put("height", height);
        JSArray folds = new JSArray();
        if (webView != null && layout != null && width > 0 && height > 0) {
            int[] origin = new int[2];
            webView.getLocationInWindow(origin);
            for (DisplayFeature feature : layout.getDisplayFeatures()) {
                if (!(feature instanceof FoldingFeature)) continue;
                FoldingFeature fold = (FoldingFeature) feature;
                Rect bounds = new Rect(fold.getBounds());
                bounds.offset(-origin[0], -origin[1]);
                // Preserve zero-width creases. Partially visible features do not split a WebView.
                if (bounds.right < 0 || bounds.bottom < 0 || bounds.left > width || bounds.top > height) continue;
                JSObject item = new JSObject();
                item.put("left", Math.max(0, bounds.left));
                item.put("top", Math.max(0, bounds.top));
                item.put("right", Math.min(width, bounds.right));
                item.put("bottom", Math.min(height, bounds.bottom));
                item.put("separating", fold.isSeparating());
                folds.put(item);
            }
        }
        value.put("folds", folds);
        return value;
    }

    private void publish() {
        if (!observing) return;
        JSObject value = geometry();
        String next = value.toString();
        if (next.equals(lastGeometry)) return;
        lastGeometry = next;
        notifyListeners("windowLayoutChanged", value);
    }

    @PluginMethod public void getWindowLayout(PluginCall call) {
        getActivity().runOnUiThread(() -> call.resolve(geometry()));
    }

    @Override protected void handleOnResume() { observe(); }
    @Override protected void handleOnPause() { stopObserving(); }
    @Override protected void handleOnDestroy() {
        stopObserving();
        if (webView != null) webView.removeOnLayoutChangeListener(resized);
        webView = null;
        layout = null;
    }
}
