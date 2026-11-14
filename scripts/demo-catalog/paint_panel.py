# -*- coding: utf-8 -*-
"""Paint colour photos from a real car photo: a close-up of real white car paint (with its real light,
reflections, creases and panel gaps) is recoloured in linear light, so it reads as the same panel
photographed in the new colour.

    python3 -I scripts/demo-catalog/paint_panel.py <source.webp> <x0,y0,x1,y1> <out.webp> <hex> <gloss|metallic|pearl|matte> [seed]

- the white paint's shading (its luminance relative to the panel's own mid level) becomes the new
  colour's shading; what is brighter than the paint (sky, trees, softboxes) stays as clear-coat reflection;
- metallic: deeper flop (shadows fall off faster) and fine flakes that sparkle only in the highlights;
- matte: no sharp reflections, the light is spread into a soft, even sheen with a fine texture.
The crop must show paint only (dark gaps and creases stay dark by themselves).

The five catalog colours were made with:
    A=scripts/demo-catalog/assets; O=$A/universal
    paint_panel.py $A/cobalt/cobalt-headlight-05.webp 0,0,560,420     $O/universal-paint-v2-01.webp '#2B2B2B' matte
    paint_panel.py $A/gentra/gentra-headlight-04.webp 0,115,520,505   $O/universal-paint-v2-02.webp '#6E1527' metallic
    paint_panel.py $A/gentra/gentra-headlight-02.webp 0,140,440,470   $O/universal-paint-v2-03.webp '#3A3D3C' metallic
    paint_panel.py $A/cobalt/cobalt-taillight-01.webp 880,0,1448,426  $O/universal-paint-v2-04.webp '#E8A93A' gloss
    paint_panel.py $A/cobalt/cobalt-headlight-05.webp 0,0,560,420     $O/universal-paint-v2-05.webp '#16205A' metallic
"""
import sys

import numpy as np
from PIL import Image, ImageFilter

W, H = 1448, 1086


def to_lin(a):
    a = a / 255.0
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)


def to_srgb(a):
    a = np.clip(a, 0, 1)
    return np.where(a <= 0.0031308, a * 12.92, 1.055 * np.power(a, 1 / 2.4) - 0.055) * 255


def recolour(src, box, hexcol, finish, seed=1):
    rng = np.random.default_rng(seed)
    im = Image.open(src).convert('RGB').crop(box)
    # keep 4:3, then bring to the catalog size with a gentle sharpen against the upscale softness
    im = im.resize((W, H), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    rgb = to_lin(np.asarray(im, np.float32))
    Y = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)

    ref = np.percentile(Y, 55)                  # the paint's own mid level
    s = Y / max(ref, 1e-4)                       # 1 = plain paint, <1 shade, >1 reflection
    refl = np.clip(s - 1.0, 0, None)             # what is brighter than the paint: reflections
    refl_rgb = rgb / np.maximum(Y[..., None], 1e-4) * refl[..., None]   # keep the reflection's own colour

    base = to_lin(np.array([int(hexcol[i:i + 2], 16) for i in (1, 3, 5)], np.float32))
    shade = np.clip(s, 0, 1)[..., None]

    if finish == 'matte':
        soft = np.asarray(Image.fromarray(np.clip(s / 3 * 255, 0, 255).astype(np.uint8)).filter(
            ImageFilter.GaussianBlur(22)), np.float32) / 255 * 3
        # keep the panel's form (crowns light, recesses dark) but no sharp reflections
        light = 0.30 + 0.80 * np.clip(soft, 0, 1.5)
        out = base * light[..., None] * (0.55 + 0.45 * shade)
        out = out * (1 + (rng.random((H, W, 1)) - 0.5) * 0.05)          # fine matte texture
        out = out + 0.04 * np.clip(soft - 1, 0, None)[..., None]         # faint, wide sheen
    else:
        flop = 1.35 if finish in ('metallic', 'pearl') else 1.0
        out = base * shade ** flop * 0.95
        coat = 0.55 if finish == 'gloss' else 0.45
        out = out + refl_rgb * coat * (1 - 0.35 * np.mean(base))           # clear coat reflections
        if finish in ('metallic', 'pearl'):
            flakes = (rng.random((H, W)) > 0.982) * rng.random((H, W))
            lit = np.clip(s - 0.75, 0, None)
            tint = np.clip(base * 1.8 + 0.18, 0, 1) if finish == 'metallic' else np.array([0.85, 0.9, 1.0])
            out = out + (flakes * lit * 0.55)[..., None] * tint
            out = out + base * np.clip(s - 0.9, 0, None)[..., None] * 0.6   # bright metallic face in the light

    a = to_srgb(out) + rng.normal(0, 1.6, (H, W, 1))                    # sensor grain like the photo's
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


if __name__ == '__main__':
    src, box, out, hexcol, finish = sys.argv[1:6]
    seed = int(sys.argv[6]) if len(sys.argv) > 6 else 1
    recolour(src, tuple(int(v) for v in box.split(',')), hexcol, finish, seed).save(out, 'WEBP', quality=92)
    print(out)
