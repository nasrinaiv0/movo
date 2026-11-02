import UIKit
import Capacitor

/// The app's root view controller: Capacitor's web view plus MOVO's own native plugin (Face ID, glass chrome).
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(MovoNativePlugin())
    }
}
