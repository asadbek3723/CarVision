# Used once to turn the portrait wheel photos into the 4:3 assets in assets/universal (kept for new photos):
#   python3 -I scripts/demo-catalog/wheel43.py <photos dir> scripts/demo-catalog/assets/universal 31=universal-wheel-02 ...

"""Wheel photo -> 1448x1086 (4:3) landscape with the whole wheel kept.
- A photo tall enough to hold the wheel in a 4:3 band is cropped around it (crop=<centre y as a fraction>).
- Otherwise the photo stays whole in the middle and its plain studio backdrop is continued sideways:
  every row takes the colour of its own outer edge, so the backdrop's gradient simply carries on."""
import sys
import numpy as np
from PIL import Image, ImageFilter

W, H = 1448, 1086


def extend(im):
    fg = im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
    a = np.asarray(fg).astype(np.float32)
    side = (W - fg.width) // 2
    left = np.median(a[:, :10, :], axis=1)            # each row's left edge colour
    right = np.median(a[:, -10:, :], axis=1)
    canvas = np.zeros((H, W, 3), np.float32)
    canvas[:, :side] = left[:, None, :]
    canvas[:, side + fg.width:] = right[:, None, :]
    canvas[:, side:side + fg.width] = a
    out = Image.fromarray(canvas.clip(0, 255).astype(np.uint8))
    # soften only the filled sides vertically (no streaks), then blend the seams over 24 px
    sides = out.filter(ImageFilter.GaussianBlur(28))
    mask = np.zeros((H, W), np.float32)
    mask[:, :side] = 1
    mask[:, side + fg.width:] = 1
    F = 60
    for i in range(F):
        t = (1 - i / F) ** 1.5 * 0.85
        mask[:, side + i] = max(mask[0, side + i], t)
        mask[:, side + fg.width - 1 - i] = max(mask[0, side + fg.width - 1 - i], t)
    # fine grain like the photo's own sensor noise, so the extended backdrop is not a flat fill
    g = np.asarray(sides).astype(np.float32) + np.random.default_rng(7).normal(0, 2.2, (H, W, 1))
    sides = Image.fromarray(g.clip(0, 255).astype(np.uint8))
    m = Image.fromarray((mask * 255).astype(np.uint8))
    return Image.composite(sides, out, m)


def crop_band(im, cy, frac=None):
    w, h = im.size
    bh = round(frac * h) if frac else round(w * H / W)
    top = min(max(0, round(cy * h - bh / 2)), h - bh)
    band = im.crop((0, top, w, top + bh))
    return extend(band) if band.width / band.height < W / H - 0.005 else band.resize((W, H), Image.LANCZOS)


def to43(src, dst, crop=None):
    im = Image.open(src).convert('RGB')
    out = crop_band(im, *crop) if crop is not None else extend(im)
    out.save(dst, 'WEBP', quality=92)
    return im.size


if __name__ == '__main__':
    src_dir, out_dir = sys.argv[1], sys.argv[2]
    for spec in sys.argv[3:]:
        n, rest = spec.split('=')
        name, _, crop = rest.partition('@')
        ext = 'webp' if n in ('41', '44') else 'png'
        print(n, to43(f'{src_dir}/{n}.{ext}', f'{out_dir}/{name}.webp', tuple(float(v) for v in crop.split(':')) if crop else None), '->', name)
