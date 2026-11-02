import UIKit
import Capacitor
import LocalAuthentication

/// MOVO's native bridge (JS name "MovoNative").
/// - Face ID / Touch ID for App Lock (LocalAuthentication; nothing leaves the device).
/// - The Liquid Glass top bar and dock (GlassChrome), mirrored from the web app's own header and dock.
@objc(MovoNativePlugin)
public class MovoNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MovoNativePlugin"
    public let jsName = "MovoNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "biometricStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setChrome", returnType: CAPPluginReturnPromise)
    ]

    private var chrome: GlassChrome?

    @objc func biometricStatus(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        let available = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        let type: String
        switch context.biometryType {
        case .faceID: type = "faceId"
        case .touchID: type = "touchId"
        default: type = available ? "biometric" : "none"
        }
        call.resolve(["available": available, "type": type])
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        let context = LAContext()
        context.localizedFallbackTitle = ""
        let reason = call.getString("reason") ?? "Unlock MOVO"
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, _ in
            call.resolve(["success": success])
        }
    }

    @objc func setChrome(_ call: CAPPluginCall) {
        let theme = call.getString("theme")
        let accent = call.getString("accent")
        let top = call.getObject("top")
        let dock = call.getObject("dock")
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let host = self.bridge?.viewController?.view else {
                call.reject("The app view is not ready.")
                return
            }
            if self.chrome == nil {
                self.chrome = GlassChrome(host: host) { [weak self] data in
                    self?.notifyListeners("chromeTap", data: data)
                }
            }
            self.chrome?.apply(theme: theme, accent: accent, top: top, dock: dock)
            call.resolve()
        }
    }
}
