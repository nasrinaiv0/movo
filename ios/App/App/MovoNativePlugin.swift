import UIKit
import Capacitor
import LocalAuthentication
import Security

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
        CAPPluginMethod(name: "setChrome", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "secureSet", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "secureGet", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "secureRemove", returnType: CAPPluginReturnPromise)
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

    // Keychain is intentionally a narrow device vault, not a general database.
    // Values are accessible only while the device is unlocked and never sync
    // to iCloud. A compromised WebView can still invoke the bridge: keep CSP
    // and content-injection protections; do not treat this as an XSS defense.
    private let secureService = "com.nasrinai.movo.device"
    private let allowedSecureKeys: Set<String> = ["automationKey"]

    private func secureAccount(_ call: CAPPluginCall) -> String? {
        guard let key = call.getString("key"), allowedSecureKeys.contains(key) else {
            call.reject("Unsupported secure storage key.")
            return nil
        }
        return key
    }

    private func baseQuery(_ account: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: secureService,
         kSecAttrAccount as String: account]
    }

    @objc func secureSet(_ call: CAPPluginCall) {
        guard let account = secureAccount(call), let value = call.getString("value"),
              !value.isEmpty, value.utf8.count <= 4096 else {
            call.reject("A non-empty value (up to 4096 bytes) is required.")
            return
        }
        DispatchQueue.global(qos: .userInitiated).async {
            let query = self.baseQuery(account)
            let data = Data(value.utf8)
            let attributes: [String: Any] = [
                kSecValueData as String: data,
                kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            ]
            let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
            let status: OSStatus
            if updateStatus == errSecItemNotFound {
                var insert = query
                attributes.forEach { insert[$0.key] = $0.value }
                status = SecItemAdd(insert as CFDictionary, nil)
            } else {
                status = updateStatus
            }
            if status == errSecSuccess { call.resolve() }
            else { call.reject("Secure storage unavailable (\(status)).") }
        }
    }

    @objc func secureGet(_ call: CAPPluginCall) {
        guard let account = secureAccount(call) else { return }
        DispatchQueue.global(qos: .userInitiated).async {
            var query = self.baseQuery(account)
            query[kSecReturnData as String] = kCFBooleanTrue
            query[kSecMatchLimit as String] = kSecMatchLimitOne
            var result: CFTypeRef?
            let status = SecItemCopyMatching(query as CFDictionary, &result)
            if status == errSecItemNotFound { call.resolve(["value": NSNull()]); return }
            guard status == errSecSuccess, let data = result as? Data,
                  let value = String(data: data, encoding: .utf8) else {
                call.reject("Secure storage unavailable (\(status)).")
                return
            }
            call.resolve(["value": value])
        }
    }

    @objc func secureRemove(_ call: CAPPluginCall) {
        guard let account = secureAccount(call) else { return }
        DispatchQueue.global(qos: .userInitiated).async {
            let status = SecItemDelete(self.baseQuery(account) as CFDictionary)
            if status == errSecSuccess || status == errSecItemNotFound { call.resolve() }
            else { call.reject("Secure storage unavailable (\(status)).") }
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
