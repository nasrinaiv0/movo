import UIKit
import Capacitor

/// Liquid Glass on iOS 26 (UIGlassEffect); a system blur material on earlier iOS versions.
private func chromeGlassEffect() -> UIVisualEffect {
    #if compiler(>=6.2)
    if #available(iOS 26.0, *) {
        let glass = UIGlassEffect(style: .regular)
        glass.isInteractive = true
        return glass
    }
    #endif
    return UIBlurEffect(style: .systemThinMaterial)
}

private func flag(_ value: JSValue?) -> Bool {
    if let bool = value as? Bool { return bool }
    if let number = value as? NSNumber { return number.boolValue }
    return false
}

private func number(_ value: JSValue?) -> Int {
    if let int = value as? Int { return int }
    if let number = value as? NSNumber { return number.intValue }
    if let double = value as? Double { return Int(double) }
    return -1
}

/// Icons arrive as PNGs rendered from the web app's own icon set, so native and web icons match exactly.
private func chromeImage(_ base64: String?, template: Bool = true) -> UIImage? {
    guard let base64 = base64, let data = Data(base64Encoded: base64), let image = UIImage(data: data, scale: 3) else { return nil }
    return image.withRenderingMode(template ? .alwaysTemplate : .alwaysOriginal)
}

private extension UIColor {
    convenience init?(hex: String?) {
        guard var text = hex?.trimmingCharacters(in: .whitespaces), text.hasPrefix("#") else { return nil }
        text.removeFirst()
        guard text.count == 6, let value = UInt32(text, radix: 16) else { return nil }
        self.init(red: CGFloat((value >> 16) & 0xff) / 255, green: CGFloat((value >> 8) & 0xff) / 255, blue: CGFloat(value & 0xff) / 255, alpha: 1)
    }
}

/// A glass surface that reports layout changes (used to keep the dock's selection capsule in place).
private final class GlassSurface: UIVisualEffectView {
    var onLayout: (() -> Void)?

    /// `clear` gives a plain, transparent container (no glass, no border): used for the top bar's buttons.
    init(radius: CGFloat, clear: Bool = false) {
        super.init(effect: clear ? nil : chromeGlassEffect())
        translatesAutoresizingMaskIntoConstraints = false
        layer.cornerRadius = radius
        layer.cornerCurve = .continuous
        clipsToBounds = true
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }

    override func layoutSubviews() {
        super.layoutSubviews()
        onLayout?()
    }
}

/// The soft blur behind the top bar fades out at its lower edge, like the iOS scroll edge effect.
private final class FadingBlur: UIVisualEffectView {
    private let fade = CAGradientLayer()

    init() {
        super.init(effect: UIBlurEffect(style: .systemUltraThinMaterial))
        translatesAutoresizingMaskIntoConstraints = false
        fade.colors = [UIColor.black.cgColor, UIColor.black.cgColor, UIColor.clear.cgColor]
        fade.locations = [0, 0.62, 1]
        layer.mask = fade
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }

    override func layoutSubviews() {
        super.layoutSubviews()
        fade.frame = bounds
    }
}

private final class ChromeButton: UIButton {
    private let dot = UIView()

    init(size: CGFloat) {
        super.init(frame: .zero)
        translatesAutoresizingMaskIntoConstraints = false
        imageView?.contentMode = .scaleAspectFit
        dot.backgroundColor = .systemRed
        dot.layer.cornerRadius = 4
        dot.isHidden = true
        dot.isUserInteractionEnabled = false
        dot.translatesAutoresizingMaskIntoConstraints = false
        addSubview(dot)
        NSLayoutConstraint.activate([
            widthAnchor.constraint(equalToConstant: size),
            heightAnchor.constraint(equalToConstant: size),
            dot.widthAnchor.constraint(equalToConstant: 8),
            dot.heightAnchor.constraint(equalToConstant: 8),
            dot.topAnchor.constraint(equalTo: topAnchor, constant: size * 0.2),
            dot.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -size * 0.2)
        ])
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }

    /// `fill` draws the button as a filled circle (the Plus action); other buttons have no background.
    func configure(image: UIImage?, label: String?, showDot: Bool, tint: UIColor, fill: UIColor? = nil) {
        setImage(image, for: .normal)
        tintColor = fill == nil ? tint : .white
        backgroundColor = fill
        layer.cornerRadius = fill == nil ? 0 : bounds.width / 2
        layer.cornerCurve = .circular
        accessibilityLabel = label
        dot.isHidden = !showDot
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        if backgroundColor != nil { layer.cornerRadius = bounds.width / 2 }
    }
}

/// MOVO's native top bar and dock, drawn over the web view. The web app sends what to show; taps go back to it.
final class GlassChrome: NSObject {
    private weak var host: UIView?
    private let emit: ([String: Any]) -> Void
    private var accent = UIColor.systemGreen

    private let topBar = UIView()
    private let topBlur = FadingBlur()
    // Top bar buttons stand on the page with no capsule or border (owner, 2026-11-12); the soft blur behind the bar
    // keeps them readable over content.
    private let backGlass = GlassSurface(radius: 22, clear: true)
    private let backButton = ChromeButton(size: 44)
    private let titleLabel = UILabel()
    private let actionsGlass = GlassSurface(radius: 22, clear: true)
    private let actionsStack = UIStackView()
    private var actionButtons: [ChromeButton] = []
    private var titleAfterBack: NSLayoutConstraint!
    private var titleAtEdge: NSLayoutConstraint!

    private let dockGlass = GlassSurface(radius: 31)
    private let dockStack = UIStackView()
    private let selection = UIView()
    private var tabButtons: [ChromeButton] = []
    private var activeTab = -1
    private var showSelection = false

    init(host: UIView, emit: @escaping ([String: Any]) -> Void) {
        self.host = host
        self.emit = emit
        super.init()
        buildTopBar(in: host)
        buildDock(in: host)
    }

    // MARK: Layout

    private func buildTopBar(in host: UIView) {
        topBar.translatesAutoresizingMaskIntoConstraints = false
        topBar.alpha = 0
        host.addSubview(topBar)
        topBar.addSubview(topBlur)
        topBar.addSubview(backGlass)
        topBar.addSubview(titleLabel)
        topBar.addSubview(actionsGlass)
        backGlass.contentView.addSubview(backButton)
        actionsGlass.contentView.addSubview(actionsStack)

        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.font = .systemFont(ofSize: 22, weight: .bold)
        titleLabel.adjustsFontSizeToFitWidth = true
        titleLabel.minimumScaleFactor = 0.8
        titleLabel.accessibilityTraits = .header

        actionsStack.translatesAutoresizingMaskIntoConstraints = false
        actionsStack.axis = .horizontal
        actionsStack.spacing = 0

        backButton.addTarget(self, action: #selector(tapBack), for: .touchUpInside)

        let content = UILayoutGuide()
        topBar.addLayoutGuide(content)
        titleAfterBack = titleLabel.leadingAnchor.constraint(equalTo: backGlass.trailingAnchor, constant: 12)
        titleAtEdge = titleLabel.leadingAnchor.constraint(equalTo: topBar.leadingAnchor, constant: 20)
        NSLayoutConstraint.activate([
            topBar.topAnchor.constraint(equalTo: host.topAnchor),
            topBar.leadingAnchor.constraint(equalTo: host.leadingAnchor),
            topBar.trailingAnchor.constraint(equalTo: host.trailingAnchor),
            content.topAnchor.constraint(equalTo: host.safeAreaLayoutGuide.topAnchor),
            content.heightAnchor.constraint(equalToConstant: 56),
            content.leadingAnchor.constraint(equalTo: topBar.leadingAnchor),
            content.trailingAnchor.constraint(equalTo: topBar.trailingAnchor),
            topBar.bottomAnchor.constraint(equalTo: content.bottomAnchor, constant: 14),

            topBlur.topAnchor.constraint(equalTo: topBar.topAnchor),
            topBlur.leadingAnchor.constraint(equalTo: topBar.leadingAnchor),
            topBlur.trailingAnchor.constraint(equalTo: topBar.trailingAnchor),
            topBlur.bottomAnchor.constraint(equalTo: topBar.bottomAnchor),

            backGlass.leadingAnchor.constraint(equalTo: topBar.leadingAnchor, constant: 16),
            backGlass.centerYAnchor.constraint(equalTo: content.centerYAnchor),
            backButton.topAnchor.constraint(equalTo: backGlass.contentView.topAnchor),
            backButton.bottomAnchor.constraint(equalTo: backGlass.contentView.bottomAnchor),
            backButton.leadingAnchor.constraint(equalTo: backGlass.contentView.leadingAnchor),
            backButton.trailingAnchor.constraint(equalTo: backGlass.contentView.trailingAnchor),

            titleLabel.centerYAnchor.constraint(equalTo: content.centerYAnchor),
            titleLabel.trailingAnchor.constraint(lessThanOrEqualTo: actionsGlass.leadingAnchor, constant: -10),
            titleAtEdge,

            actionsGlass.trailingAnchor.constraint(equalTo: topBar.trailingAnchor, constant: -16),
            actionsGlass.centerYAnchor.constraint(equalTo: content.centerYAnchor),
            actionsStack.topAnchor.constraint(equalTo: actionsGlass.contentView.topAnchor, constant: 2),
            actionsStack.bottomAnchor.constraint(equalTo: actionsGlass.contentView.bottomAnchor, constant: -2),
            actionsStack.leadingAnchor.constraint(equalTo: actionsGlass.contentView.leadingAnchor),
            actionsStack.trailingAnchor.constraint(equalTo: actionsGlass.contentView.trailingAnchor)
        ])
    }

    private func buildDock(in host: UIView) {
        dockGlass.alpha = 0
        host.addSubview(dockGlass)
        dockGlass.contentView.addSubview(selection)
        dockGlass.contentView.addSubview(dockStack)
        dockStack.translatesAutoresizingMaskIntoConstraints = false
        dockStack.axis = .horizontal
        dockStack.distribution = .fillEqually
        selection.layer.cornerRadius = 25
        selection.layer.cornerCurve = .continuous
        selection.isUserInteractionEnabled = false
        dockGlass.onLayout = { [weak self] in self?.placeSelection(animated: false) }

        let nearSafeBottom = dockGlass.bottomAnchor.constraint(equalTo: host.safeAreaLayoutGuide.bottomAnchor, constant: 4)
        nearSafeBottom.priority = .defaultHigh
        NSLayoutConstraint.activate([
            dockGlass.leadingAnchor.constraint(equalTo: host.leadingAnchor, constant: 20),
            dockGlass.trailingAnchor.constraint(equalTo: host.trailingAnchor, constant: -20),
            dockGlass.heightAnchor.constraint(equalToConstant: 62),
            nearSafeBottom,
            dockGlass.bottomAnchor.constraint(lessThanOrEqualTo: host.bottomAnchor, constant: -12),
            dockStack.topAnchor.constraint(equalTo: dockGlass.contentView.topAnchor),
            dockStack.bottomAnchor.constraint(equalTo: dockGlass.contentView.bottomAnchor),
            dockStack.leadingAnchor.constraint(equalTo: dockGlass.contentView.leadingAnchor, constant: 6),
            dockStack.trailingAnchor.constraint(equalTo: dockGlass.contentView.trailingAnchor, constant: -6)
        ])
    }

    // MARK: Updates from the web app

    func apply(theme: String?, accent hex: String?, top: JSObject?, dock: JSObject?) {
        if let theme = theme {
            let style: UIUserInterfaceStyle = theme == "dark" ? .dark : .light
            topBar.overrideUserInterfaceStyle = style
            dockGlass.overrideUserInterfaceStyle = style
            host?.window?.overrideUserInterfaceStyle = style // status bar, keyboard and pickers follow MOVO's theme
        }
        if let color = UIColor(hex: hex) {
            accent = color
            selection.backgroundColor = color.withAlphaComponent(0.16)
        }
        if let top = top { applyTop(top) }
        if let dock = dock { applyDock(dock) }
    }

    private func applyTop(_ top: JSObject) {
        setVisible(topBar, !flag(top["hidden"]))
        titleLabel.text = top["title"] as? String ?? ""
        titleLabel.textColor = .label
        let hasBack = flag(top["back"])
        backGlass.isHidden = !hasBack
        titleAtEdge.isActive = !hasBack
        titleAfterBack.isActive = hasBack
        backButton.configure(image: chromeImage(top["backIcon"] as? String) ?? UIImage(systemName: "chevron.left"), label: top["backLabel"] as? String ?? "Back", showDot: false, tint: .label)

        let actions = (top["actions"] as? JSArray ?? []).compactMap { $0 as? JSObject }
        while actionButtons.count < actions.count {
            let button = ChromeButton(size: 40)
            button.tag = actionButtons.count
            button.addTarget(self, action: #selector(tapAction(_:)), for: .touchUpInside)
            actionButtons.append(button)
            actionsStack.addArrangedSubview(button)
        }
        for (index, button) in actionButtons.enumerated() {
            guard index < actions.count else { button.isHidden = true; continue }
            let action = actions[index]
            button.isHidden = false
            let primary = flag(action["primary"])
            button.configure(image: chromeImage(action["icon"] as? String), label: action["label"] as? String, showDot: flag(action["dot"]), tint: .label, fill: primary ? accent : nil)
            // A little room before the filled Plus; the plain icons sit edge to edge.
            if index > 0 { actionsStack.setCustomSpacing(primary ? 6 : 0, after: actionButtons[index - 1]) }
        }
        actionsGlass.isHidden = actions.isEmpty
    }

    private func applyDock(_ dock: JSObject) {
        setVisible(dockGlass, !flag(dock["hidden"]))
        let tabs = (dock["tabs"] as? JSArray ?? []).compactMap { $0 as? JSObject }
        while tabButtons.count < tabs.count {
            let button = ChromeButton(size: 50)
            button.tag = tabButtons.count
            button.addTarget(self, action: #selector(tapTab(_:)), for: .touchUpInside)
            tabButtons.append(button)
            dockStack.addArrangedSubview(button)
        }
        let active = number(dock["active"])
        for (index, button) in tabButtons.enumerated() {
            guard index < tabs.count else { button.isHidden = true; continue }
            let tab = tabs[index]
            let isActive = index == active
            let template = !flag(tab["original"])
            let icon = chromeImage((isActive ? tab["iconActive"] : tab["icon"]) as? String ?? tab["icon"] as? String, template: template)
            button.isHidden = false
            button.configure(image: icon, label: tab["label"] as? String, showDot: flag(tab["badge"]), tint: isActive ? accent : .secondaryLabel)
            button.accessibilityTraits = isActive ? [.button, .selected] : .button
        }
        showSelection = active >= 0 && active < tabs.count && !flag(tabs[active]["original"])
        let moved = active != activeTab
        activeTab = active
        dockGlass.layoutIfNeeded()
        placeSelection(animated: moved)
    }

    private func placeSelection(animated: Bool) {
        guard showSelection, activeTab >= 0, activeTab < tabButtons.count else {
            selection.alpha = 0
            return
        }
        let button = tabButtons[activeTab]
        let frame = dockStack.convert(button.frame, to: dockGlass.contentView).insetBy(dx: 2, dy: 6)
        let update = {
            self.selection.frame = frame
            self.selection.alpha = 1
        }
        if animated {
            UIView.animate(withDuration: 0.32, delay: 0, options: [.curveEaseOut, .beginFromCurrentState], animations: update)
        } else {
            update()
        }
    }

    private func setVisible(_ view: UIView, _ visible: Bool) {
        view.isUserInteractionEnabled = visible
        let target: CGFloat = visible ? 1 : 0
        guard view.alpha != target else { return }
        if UIAccessibility.isReduceMotionEnabled {
            view.alpha = target
        } else {
            UIView.animate(withDuration: 0.2, delay: 0, options: [.curveEaseOut, .beginFromCurrentState]) { view.alpha = target }
        }
    }

    // MARK: Taps

    @objc private func tapBack() { emit(["kind": "back"]) }
    @objc private func tapAction(_ sender: UIButton) { emit(["kind": "action", "index": sender.tag]) }
    @objc private func tapTab(_ sender: UIButton) { emit(["kind": "tab", "index": sender.tag]) }
}
