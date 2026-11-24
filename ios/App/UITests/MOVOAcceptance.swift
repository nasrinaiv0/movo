import XCTest
import Foundation

// Disposable CI simulator, no sign-in, no real user records or financial writes.
final class MOVOAcceptance: XCTestCase {
    @MainActor
    private func attach(_ name: String) {
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = name
        shot.lifetime = .keepAlways
        add(shot)
    }

    @MainActor
    private func tapIfVisible(_ element: XCUIElement, timeout: TimeInterval = 2) -> Bool {
        guard element.waitForExistence(timeout: timeout), element.isHittable, element.isEnabled else { return false }
        element.tap()
        return true
    }

    @MainActor
    func testGuestPlanningAndDeepLinkEntitlementGate() throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "com.nasrinai.movo")
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30))
        let web = app.webViews.firstMatch
        XCTAssertTrue(web.waitForExistence(timeout: 40), "MOVO WebView did not appear")
        // Follow real first-run controls. Do not inject local storage or bypass consent.
        let menu = app.buttons.matching(NSPredicate(format: "label == %@", "Menu")).firstMatch
        let deadline = Date().addingTimeInterval(90)
        while Date() < deadline {
            if tapIfVisible(app.buttons["Close MOVO plans"]) { continue }
            if tapIfVisible(app.buttons["Skip"]) { continue }
            let legal = web.staticTexts["Before you start"]
            if legal.exists {
                let age = web.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "I am at least 18 years old.")).firstMatch
                XCTAssertTrue(age.waitForExistence(timeout: 10), "Legal acknowledgement not accessible")
                let accept = web.buttons["Accept and continue"]
                if !accept.isEnabled { age.tap() }
                XCTAssertTrue(tapIfVisible(accept, timeout: 10), "Unable to accept synthetic guest setup")
                continue
            }
            if menu.exists && menu.isEnabled && menu.isHittable { break }
            Thread.sleep(forTimeInterval: 0.5)
        }
        XCTAssertTrue(tapIfVisible(menu, timeout: 10), "Guest navigation did not become ready")
        let planning = web.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Financial planning")).firstMatch
        XCTAssertTrue(tapIfVisible(planning, timeout: 15), "Financial Planning menu action missing")
        XCTAssertTrue(web.staticTexts["Financial planning"].waitForExistence(timeout: 15))
        XCTAssertTrue(web.staticTexts["Sign in to manage your financial records"].waitForExistence(timeout: 15) ||
                      web.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Sign in to manage your financial records")).firstMatch.exists,
                      "Guest financial records must require sign-in")
        attach("MOVO-guest-planning-verified")

        // Native URL delivery must result in the actual entitlement UI, not a SpringBoard prompt.
        app.open(URL(string: "movo://log?src=siri_shortcut&amount=12.34&merchant=Simulator%20Test")!)
        let open = springboard.alerts.buttons["Open"].firstMatch
        if open.waitForExistence(timeout: 5) { open.tap() }
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30))
        XCTAssertTrue(web.staticTexts["Unlock with Pro"].waitForExistence(timeout: 30), "Synthetic free guest deep link did not reach the automation entitlement gate")
        XCTAssertTrue(web.buttons["Close MOVO plans"].exists, "Expected actual MOVO plans sheet")
        XCTAssertFalse(web.buttons["Log"].exists, "Free guest must not be offered a financial posting action")
        attach("MOVO-deeplink-entitlement-verified")
    }
}
