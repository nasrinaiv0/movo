import AppIntents
import Foundation
import UIKit

/// A Siri/Shortcuts entry point for a *review*, never unattended financial posting.
/// MOVO validates the input again in its React review flow. No secret or account
/// identifier travels in the URL; the user must confirm before saving a record.
@available(iOS 16.0, *)
struct ReviewMOVOExpenseIntent: AppIntent {
    static var title: LocalizedStringResource = "Review an expense in MOVO"
    static var description = IntentDescription("Open MOVO to review and confirm an expense.")
    static var openAppWhenRun: Bool = true

    @Parameter(title: "Amount")
    var amount: Double

    @Parameter(title: "Merchant")
    var merchant: String

    func perform() async throws -> some IntentResult {
        guard amount.isFinite, amount > 0, amount < 100_000_000 else {
            throw MOVOIntentError.invalidAmount
        }
        let name = merchant.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty, name.count <= 160 else {
            throw MOVOIntentError.invalidMerchant
        }
        var components = URLComponents()
        components.scheme = "movo"
        components.host = "log"
        components.queryItems = [
            URLQueryItem(name: "src", value: "siri_shortcut"),
            URLQueryItem(name: "amount", value: String(amount)),
            URLQueryItem(name: "merchant", value: name)
        ]
        guard let url = components.url else { throw MOVOIntentError.invalidURL }
        await MainActor.run { UIApplication.shared.open(url) }
        return .result()
    }
}

@available(iOS 16.0, *)
private enum MOVOIntentError: Error, LocalizedError {
    case invalidAmount, invalidMerchant, invalidURL
    var errorDescription: String? {
        switch self {
        case .invalidAmount: return "Enter a positive amount."
        case .invalidMerchant: return "Enter a merchant name up to 160 characters."
        case .invalidURL: return "MOVO could not prepare this expense."
        }
    }
}

@available(iOS 16.0, *)
struct MOVOAppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: ReviewMOVOExpenseIntent(),
            phrases: [
                "Review an expense in \(.applicationName)",
                "Track a purchase in \(.applicationName)"
            ],
            shortTitle: "Review expense",
            systemImageName: "creditcard"
        )
    }
}
