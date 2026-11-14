# -*- coding: utf-8 -*-
"""Any product photo -> 1448x1086 (4:3) without cutting the product off.

    python3 -I scripts/demo-catalog/fit43.py <src> <out.webp> [crop=x0,y0,x1,y1] [fill=x0,y0,x1,y1;...] [mode=blur]

- crop: optional first crop (pixels of the source);
- fill: boxes (after the crop) whose content, e.g. a seller's caption, is replaced by the surroundings
  (masked push-pull fill, then a little grain so it does not look flat);
- a photo wider than 4:3 is extended at the top and bottom, a narrower one at the sides: each row or column
  continues the photo's own edge colour, softened and blended in.
"""
import sys

import numpy as np
from PIL import Image, ImageFilter

W, H = 1448, 1086


def fill_boxes(im, boxes, rng):
    a = np.asarray(im, np.float32)
    mask = np.zeros(a.shape[:2], bool)
    for x0, y0, x1, y1 in boxes:
        mask[y0:y1, x0:x1] = True
    known = ~mask
    out = a.copy()
    # push-pull: average known pixels at coarse scales, then fill the hole from the finest scale that has data
    filled = np.zeros_like(a)
    have = np.zeros(mask.shape, bool)
    for r in (2, 4, 8, 16, 32, 64, 128):
        k = Image.fromarray((known * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(r))
        wsum = np.asarray(k, np.float32)[..., None] / 255
        val = np.stack([np.asarray(Image.fromarray((a[..., c] * known).astype(np.uint8)).filter(ImageFilter.BoxBlur(r)), np.float32)
                        for c in range(3)], -1)
        ok = (wsum[..., 0] > 0.15) & ~have & mask
        filled[ok] = (val / np.maximum(wsum, 1e-3))[ok]
        have |= ok
    out[mask] = filled[mask]
    out = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    soft = out.filter(ImageFilter.GaussianBlur(3))
    m = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))
    out = Image.composite(soft, out, m)
    g = np.asarray(out, np.float32) + (rng.normal(0, 1.8, a.shape[:2] + (1,)) * mask[..., None])
    return Image.fromarray(np.clip(g, 0, 255).astype(np.uint8))


def extend_rows(fg, W, H, rng):
    """fg already H tall in the other axis: place it in the middle of a W x H canvas, continuing its edges."""
    a = np.asarray(fg).astype(np.float32)
    side = (W - fg.width) // 2
    canvas = np.zeros((H, W, 3), np.float32)
    canvas[:, :side] = np.median(a[:, :8, :], axis=1)[:, None, :]
    canvas[:, side + fg.width:] = np.median(a[:, -8:, :], axis=1)[:, None, :]
    canvas[:, side:side + fg.width] = a
    out = Image.fromarray(canvas.clip(0, 255).astype(np.uint8))
    # The edge colours differ from row to row (streaks): smooth them along the edge, more the further out,
    # so the band fades into a soft out-of-focus backdrop.
    near = np.asarray(out.filter(ImageFilter.GaussianBlur(10)), np.float32)
    far = np.asarray(out.resize((W, max(2, H // 60)), Image.BILINEAR).resize((W, H), Image.BICUBIC), np.float32)
    far = np.asarray(Image.fromarray(far.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(20)), np.float32)
    dist = np.zeros((1, W), np.float32)
    xs = np.arange(W)
    dist[0] = np.where(xs < side, (side - xs) / max(side, 1), np.where(xs >= side + fg.width, (xs - side - fg.width + 1) / max(W - side - fg.width, 1), 0))
    t = np.clip(dist * 1.6, 0, 1)[..., None]
    sides = near * (1 - t) + far * t + rng.normal(0, 2.0, (H, W, 1))
    sides = Image.fromarray(sides.clip(0, 255).astype(np.uint8))
    mask = np.zeros((H, W), np.float32)
    mask[:, :side] = 1
    mask[:, side + fg.width:] = 1
    F = min(50, max(1, side))
    for i in range(F):
        t = (1 - i / F) ** 1.5 * 0.85
        mask[:, side + i] = np.maximum(mask[:, side + i], t)
        mask[:, side + fg.width - 1 - i] = np.maximum(mask[:, side + fg.width - 1 - i], t)
    return Image.composite(sides, out, Image.fromarray((mask * 255).astype(np.uint8)))


def fit_blurred(im, rng):
    """For photos taken on a car (busy edges): the gap is a blurred, zoomed copy of the photo itself."""
    r = im.width / im.height
    if r >= W / H:
        fg = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    else:
        fg = im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
    s = max(W / im.width, H / im.height) * 1.08
    bg = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (bg.width - W) // 2, (bg.height - H) // 2
    bg = bg.crop((x, y, x + W, y + H)).filter(ImageFilter.GaussianBlur(34))
    bg = Image.fromarray(np.clip(np.asarray(bg, np.float32) * 0.9 + rng.normal(0, 2.0, (H, W, 1)), 0, 255).astype(np.uint8))
    m = np.ones((fg.height, fg.width), np.float32)
    F = 36
    ramp = (np.arange(F) / F) ** 1.4
    if fg.height < H:
        m[:F, :] *= ramp[:, None]; m[-F:, :] *= ramp[::-1][:, None]
    if fg.width < W:
        m[:, :F] *= ramp[None, :]; m[:, -F:] *= ramp[::-1][None, :]
    bg.paste(fg, ((W - fg.width) // 2, (H - fg.height) // 2), Image.fromarray((m * 255).astype(np.uint8)))
    return bg


def fit(im, rng):
    r = im.width / im.height
    if abs(r - W / H) < 0.005:
        return im.resize((W, H), Image.LANCZOS)
    if r < W / H:  # narrow: extend the sides
        fg = im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
        return extend_rows(fg, W, H, rng)
    # wide: extend top and bottom (same thing on the transposed picture)
    fg = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS).transpose(Image.TRANSPOSE)
    return extend_rows(fg, H, W, rng).transpose(Image.TRANSPOSE)


if __name__ == '__main__':
    src, dst, *opts = sys.argv[1:]
    rng = np.random.default_rng(5)
    im = Image.open(src).convert('RGB')
    mode = 'edge'
    for o in opts:
        k, _, v = o.partition('=')
        if k == 'crop':
            im = im.crop(tuple(int(x) for x in v.split(',')))
        elif k == 'mode':
            mode = v
        elif k == 'fill':
            im = fill_boxes(im, [tuple(int(x) for x in b.split(',')) for b in v.split(';')], rng)
    out = fit_blurred(im, rng) if mode == 'blur' else fit(im, rng)
    out.filter(ImageFilter.UnsharpMask(radius=1.5, percent=40, threshold=2)).save(dst, 'WEBP', quality=92)
    print(dst, im.size)
