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


    // Auth credentials are persisted only in the device-bound Keychain and
    // unavailable until the device is unlocked. No iCloud Keychain/backup sync.
    private let authService = "com.nasrinai.movo.auth.v1"

    private func authQuery(_ key: String) -> [String: Any] {
        return [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: authService,
            kSecAttrAccount as String: key
        ]
    }

    private func authKey(_ call: CAPPluginCall) -> String? {
        guard let key = call.getString("key"),
              (key == "movo-autolog-key" || (key.hasPrefix("sb-") && key.contains("-auth-token"))),
              key.count < 128 else {
            call.reject("invalid_secure_auth_key")
            return nil
        }
        return key
    }

    @objc func secureGet(_ call: CAPPluginCall) {
        guard let key = authKey(call) else { return }
        var query = authQuery(key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound {
            call.resolve(["value": NSNull()])
        } else if status == errSecSuccess, let data = item as? Data,
                  let value = String(data: data, encoding: .utf8) {
            call.resolve(["value": value])
        } else {
            call.reject("secure_auth_read_failed")
        }
    }

    @objc func secureSet(_ call: CAPPluginCall) {
        guard let key = authKey(call) else { return }
        guard let value = call.getString("value") else {
            call.reject("invalid_secure_auth_value")
            return
        }
        var add = authQuery(key)
        let valueData = Data(value.utf8)
        add[kSecValueData as String] = valueData
        add[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        let result = SecItemAdd(add as CFDictionary, nil)
        if result == errSecDuplicateItem {
            let updated: [String: Any] = [
                kSecValueData as String: valueData,
                kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            ]
            if SecItemUpdate(authQuery(key) as CFDictionary, updated as CFDictionary) != errSecSuccess {
                call.reject("secure_auth_write_failed")
                return
            }
        } else if result != errSecSuccess {
            call.reject("secure_auth_write_failed")
            return
        }
        call.resolve()
    }

    @objc func secureRemove(_ call: CAPPluginCall) {
        guard let key = authKey(call) else { return }
        let status = SecItemDelete(authQuery(key) as CFDictionary)
        if status == errSecSuccess || status == errSecItemNotFound {
            call.resolve()
        } else {
            call.reject("secure_auth_delete_failed")
        }
    }

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
