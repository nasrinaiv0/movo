"""Turns capture.cjs screenshots into the WebP files the app ships. Usage: convert.py <captureDir> <public/tutorial>"""
import glob, os, sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
total = 0
for f in sorted(glob.glob(os.path.join(src, '*-light.png')) + glob.glob(os.path.join(src, '*-dark.png'))):
    im = Image.open(f).convert('RGB')
    assert im.size == (860, 1864), (f, im.size)
    target = os.path.join(out, os.path.basename(f)[:-4] + '.webp')
    im.save(target, 'WEBP', quality=74, method=6)
    total += os.path.getsize(target)
    print(f"{os.path.basename(target):34s} {os.path.getsize(target) // 1024:4d} KB")
print('total', total // 1024, 'KB')
