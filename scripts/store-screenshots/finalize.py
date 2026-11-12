"""Re-saves the composed store screenshots as 24-bit RGB PNGs: no alpha channel (App Store rejects it) and no
embedded text metadata. Usage: python3 scripts/store-screenshots/finalize.py"""
import glob, os
from PIL import Image

root = os.path.join(os.path.dirname(__file__), '..', '..', 'store', 'screenshots')
for path in sorted(glob.glob(os.path.join(root, '*', '*.png'))):
    image = Image.open(path).convert('RGB')
    image.save(path, optimize=True)
    print(os.path.relpath(path, root), image.size, f'{os.path.getsize(path) / 1e6:.2f} MB')
