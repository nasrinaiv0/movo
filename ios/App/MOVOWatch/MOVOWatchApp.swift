import SwiftUI
import WatchConnectivity

/// No bank details, tokens, receipts, balances or transaction contents are
/// transferred to or persisted on Apple Watch. The iPhone performs the log.
@main
struct MOVOWatchApp: App {
    @StateObject private var bridge = WatchQuickLogBridge()

    var body: some Scene {
        WindowGroup {
            ScrollView {
                VStack(spacing: 10) {
                    Image(systemName: "wallet.pass.fill")
                        .font(.system(size: 26, weight: .medium))
                        .foregroundStyle(.green)
                        .accessibilityHidden(true)
                    Text("MOVO")
                        .font(.system(size: 23, weight: .bold, design: .rounded))
                    Text("Money Organizer & Visual Outflow")
                        .font(.system(size: 11))
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                    Button {
                        bridge.requestQuickLog()
                    } label: {
                        Label("Quick Log on iPhone", systemImage: "plus.circle")
                            .font(.system(size: 13, weight: .semibold))
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color(red: 0.03, green: 0.42, blue: 0.23))
                    .accessibilityHint("Continue logging in the MOVO app on your iPhone")
                    Text(bridge.message)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .accessibilityLabel(bridge.message)
                }
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 8)
                .padding(.vertical, 12)
            }
        }
    }
}

final class WatchQuickLogBridge: NSObject, ObservableObject, WCSessionDelegate {
    @Published var message = "Your financial information stays on your iPhone."

    override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    func requestQuickLog() {
        guard WCSession.isSupported(),
              WCSession.default.activationState == .activated,
              WCSession.default.isReachable else {
            message = "Open MOVO on your iPhone to continue."
            return
        }
        message = "Contacting iPhone…"
        WCSession.default.sendMessage(["action": "quickLog"], replyHandler: { [weak self] reply in
            DispatchQueue.main.async {
                self?.message = (reply["ok"] as? Bool) == true
                    ? "Open MOVO on your iPhone to finish."
                    : "Open MOVO manually on your iPhone."
            }
        }, errorHandler: { [weak self] _ in
            DispatchQueue.main.async {
                self?.message = "Open MOVO manually on your iPhone."
            }
        })
    }

    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        // The watch has no access to the phone's sign-in state.
    }
}
