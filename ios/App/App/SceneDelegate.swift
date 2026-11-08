import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var sensitiveSnapshotCover: UIView?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = MainViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    // Opaque cover prevents personal finance data appearing in iOS app-switcher
    // snapshots, including while external authentication browsers are open.
    func sceneWillResignActive(_ scene: UIScene) {
        guard let window = window, sensitiveSnapshotCover == nil else { return }
        let cover = UIView(frame: window.bounds)
        cover.backgroundColor = .systemBackground
        cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        let title = UILabel(frame: cover.bounds)
        title.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        title.text = "MOVO"
        title.textAlignment = .center
        title.textColor = .secondaryLabel
        title.font = .systemFont(ofSize: 24, weight: .semibold)
        cover.addSubview(title)
        window.addSubview(cover)
        sensitiveSnapshotCover = cover
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        sensitiveSnapshotCover?.removeFromSuperview()
        sensitiveSnapshotCover = nil
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
