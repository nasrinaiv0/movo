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
                        .font(.title2)
                        .foregroundStyle(.green)
                        .accessibilityHidden(true)
                    Text("MOVO")
                        .font(.title2.bold())
                    Text("Money Organizer & Visual Outflow")
                        .font(.caption2)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                    Button {
                        bridge.requestQuickLog()
                    } label: {
                        Label("Quick Log on iPhone", systemImage: "plus.circle")
                            .font(.headline)
                            .fixedSize(horizontal: false, vertical: true)
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(bridge.isRequestPending)
                    .tint(Color(red: 0.03, green: 0.42, blue: 0.23))
                    .accessibilityHint("Continue logging in the MOVO app on your iPhone")
                    Text(bridge.message)
                        .font(.footnote)
                        .fixedSize(horizontal: false, vertical: true)
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
    @Published private(set) var isRequestPending = false
    private var requestID: UUID?

    override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    func requestQuickLog() {
        guard !isRequestPending else { return }
        guard WCSession.isSupported(),
              WCSession.default.activationState == .activated,
              WCSession.default.isReachable else {
            message = "Open MOVO on your iPhone to continue."
            return
        }
        message = "Contacting iPhone…"
        isRequestPending = true
        let id = UUID()
        requestID = id
        DispatchQueue.main.asyncAfter(deadline: .now() + 15) { [weak self] in
            self?.complete(id, message: "Open MOVO manually on your iPhone.")
        }
        WCSession.default.sendMessage(["action": "quickLog"], replyHandler: { [weak self] reply in
            DispatchQueue.main.async {
                let message = (reply["ok"] as? Bool) == true
                    ? "Open MOVO on your iPhone to finish."
                    : "Open MOVO manually on your iPhone."
                self?.complete(id, message: message)
            }
        }, errorHandler: { [weak self] _ in
            DispatchQueue.main.async {
                self?.complete(id, message: "Open MOVO manually on your iPhone.")
            }
        })
    }

    private func complete(_ id: UUID, message: String) {
        guard requestID == id else { return }
        requestID = nil
        isRequestPending = false
        self.message = message
    }

    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        // The watch has no access to the phone's sign-in state.
    }
}
