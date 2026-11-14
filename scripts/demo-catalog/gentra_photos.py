# -*- coding: utf-8 -*-
"""Gentra part photos -> 4:3 catalog assets: crop to the part, blur number plates (and a shop's sign on a
plate), keep the product whole (fit43), then a clarity / sharpen pass.

    python3 -I scripts/demo-catalog/gentra_photos.py <photos dir>
"""
import os
import sys

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import fit43  # noqa: E402

OUT = os.path.join(HERE, 'assets', 'gentra')
# source, output, crop (source px), plate boxes (source px), fit mode
JOBS = [
    ('59.webp', 'gentra-headlight-06', (85, 140, 1385, 1115), [], 'edge'),
    ('70.png', 'gentra-headlight-06b', (80, 62, 560, 418), [(178, 222, 392, 288)], 'blur'),
    ('60.webp', 'gentra-headlight-07', (90, 260, 1190, 1085), [], 'edge'),
    ('61.webp', 'gentra-headlight-08', (0, 320, 1096, 1142), [], 'edge'),
    ('64.png', 'gentra-headlight-08b', (0, 85, 625, 554), [], 'edge'),
    ('62.png', 'gentra-headlight-08c', (90, 68, 614, 461), [], 'edge'),
    ('65.png', 'gentra-headlight-09', (40, 20, 447, 325), [], 'edge'),
    ('63.webp', 'gentra-taillight-01', (60, 20, 560, 625), [], 'blur'),
    ('66.png', 'gentra-bumper-01', (60, 0, 713, 490), [(278, 283, 502, 337)], 'edge'),
    ('69.webp', 'gentra-bumper-01b', (30, 0, 680, 488), [(438, 268, 644, 348)], 'edge'),
    ('67.webp', 'gentra-bumper-02', (140, 4, 910, 582), [(462, 328, 698, 390)], 'edge'),
    ('68.webp', 'gentra-bumper-03', (80, 0, 731, 488), [(436, 220, 692, 302)], 'edge'),
    ('71.webp', 'gentra-bumper-04', (470, 330, 1069, 779), [], 'edge'),
]


def blur_plate(im, box):
    region = im.crop(box)
    small = region.resize((max(1, region.width // 18), max(1, region.height // 18)), Image.BILINEAR)
    im.paste(small.resize(region.size, Image.NEAREST).filter(ImageFilter.GaussianBlur(5)), box)


def clarity(im):
    # local contrast (large-radius unsharp), then fine detail, a touch of saturation
    im = im.filter(ImageFilter.UnsharpMask(radius=24, percent=18, threshold=0))
    im = im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=70, threshold=3))
    return ImageEnhance.Color(im).enhance(1.05)


if __name__ == '__main__':
    src_dir = sys.argv[1]
    rng = np.random.default_rng(3)
    for src, name, crop, plates, mode in JOBS:
        im = Image.open(os.path.join(src_dir, src)).convert('RGB')
        for b in plates:
            blur_plate(im, b)
        im = im.crop(crop)
        out = fit43.fit_blurred(im, rng) if mode == 'blur' else fit43.fit(im, rng)
        clarity(out).save(os.path.join(OUT, f'{name}.webp'), 'WEBP', quality=92)
        print(name, im.size)
