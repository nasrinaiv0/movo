"""App Store icons must not carry an alpha channel: re-save the rendered badge icons as opaque RGB PNGs."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2] / 'ios/App/App/Assets.xcassets'
for path in sorted(root.glob('AppIcon-*.appiconset/AppIcon-*.png')):
    image = Image.open(path)
    rgb = Image.new('RGB', image.size, (18, 18, 19))
    rgb.paste(image, mask=image.split()[3] if image.mode == 'RGBA' else None)
    rgb.save(path, optimize=True)
    print('opaque', path.name, rgb.mode, rgb.size)
