# -*- coding: utf-8 -*-
"""Procedural studio-style product renders (PIL, 2x supersampled -> 1200x900 JPEG)."""
import math
import zlib

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, S = 1200, 900, 2


def rgb(h):
    if isinstance(h, tuple):
        return h
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(ch * 2 for ch in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    a, b = rgb(a), rgb(b)
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def shade(c, f):
    """f<1 darkens, f>1 lightens toward white."""
    c = rgb(c)
    if f <= 1:
        return tuple(int(v * f) for v in c)
    t = min(1.0, f - 1)
    return tuple(int(v + (255 - v) * t) for v in c)


def font(size):
    for name in ('/System/Library/Fonts/Helvetica.ttc', '/System/Library/Fonts/SFNS.ttf', '/Library/Fonts/Arial.ttf'):
        try:
            return ImageFont.truetype(name, size * S)
        except Exception:
            pass
    try:
        return ImageFont.load_default(size * S)
    except Exception:
        return ImageFont.load_default()


class Cv:
    def __init__(self, dark=False):
        self.dark = dark
        self.im = Image.new('RGBA', (W * S, H * S))
        top, bot = (('#2b2e36', '#121317') if dark else ('#f6f7f9', '#d5d9df'))
        arr = _grad_arr(W * S, H * S, 'v', top, bot)
        # floor: darker lower band
        fy = int(H * S * 0.72)
        floor = _grad_arr(W * S, H * S - fy, 'v', mix(top, bot, 0.85) if not dark else '#1b1d23', bot if not dark else '#0d0e11')
        arr[fy:] = floor
        arr[fy - 3:fy + 3] = np.clip(arr[fy - 3:fy + 3] * (0.97 if not dark else 1.2), 0, 255)
        self.im = Image.fromarray(arr.astype('uint8'), 'RGB').convert('RGBA')

    # ---------------------------------------------------------- core
    def _apply(self, box, draw_fn, fill, grad, blur, alpha):
        pad = int(blur * 3 * S) + 2
        x0, y0, x1, y1 = [int(v * S) for v in box]
        x0, y0, x1, y1 = x0 - pad, y0 - pad, x1 + pad, y1 + pad
        x0c, y0c = max(0, x0), max(0, y0)
        x1c, y1c = min(W * S, x1), min(H * S, y1)
        if x1c <= x0c or y1c <= y0c:
            return
        mask = Image.new('L', (x1 - x0, y1 - y0), 0)
        d = ImageDraw.Draw(mask)
        draw_fn(d, x0, y0)
        if blur:
            mask = mask.filter(ImageFilter.GaussianBlur(blur * S))
        if alpha < 255:
            mask = mask.point(lambda v: int(v * alpha / 255))
        mask = mask.crop((x0c - x0, y0c - y0, x1c - x0, y1c - y0))
        w, h = x1c - x0c, y1c - y0c
        if grad:
            arr = _grad_arr(w, h, *grad)
            layer = Image.fromarray(arr.astype('uint8'), 'RGB')
        else:
            layer = Image.new('RGB', (w, h), rgb(fill))
        self.im.paste(layer, (x0c, y0c), mask)

    @staticmethod
    def _sc(pts, ox, oy):
        return [(p[0] * S - ox, p[1] * S - oy) for p in pts]

    def poly(self, pts, fill='#000', grad=None, blur=0, alpha=255):
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        self._apply((min(xs), min(ys), max(xs), max(ys)),
                    lambda d, ox, oy: d.polygon(self._sc(pts, ox, oy), fill=255), fill, grad, blur, alpha)

    def ell(self, box, fill='#000', grad=None, blur=0, alpha=255):
        x0, y0, x1, y1 = box
        self._apply(box, lambda d, ox, oy: d.ellipse([x0 * S - ox, y0 * S - oy, x1 * S - ox, y1 * S - oy], fill=255), fill, grad, blur, alpha)

    def circ(self, cx, cy, r, fill='#000', grad=None, blur=0, alpha=255):
        self.ell((cx - r, cy - r, cx + r, cy + r), fill, grad, blur, alpha)

    def rrect(self, box, r, fill='#000', grad=None, blur=0, alpha=255):
        x0, y0, x1, y1 = box
        self._apply(box, lambda d, ox, oy: d.rounded_rectangle([x0 * S - ox, y0 * S - oy, x1 * S - ox, y1 * S - oy], r * S, fill=255), fill, grad, blur, alpha)

    def line(self, pts, width, fill='#000', grad=None, blur=0, alpha=255):
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        hw = width / 2 + 1
        box = (min(xs) - hw, min(ys) - hw, max(xs) + hw, max(ys) + hw)

        def fn(d, ox, oy):
            sp = self._sc(pts, ox, oy)
            d.line(sp, fill=255, width=int(width * S), joint='curve')
            for p in (sp[0], sp[-1]):
                r = width * S / 2
                d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=255)
        self._apply(box, fn, fill, grad, blur, alpha)

    def arc(self, box, a0, a1, width, fill='#000', grad=None, blur=0, alpha=255):
        x0, y0, x1, y1 = box
        hw = width / 2 + 1
        self._apply((x0 - hw, y0 - hw, x1 + hw, y1 + hw),
                    lambda d, ox, oy: d.arc([x0 * S - ox, y0 * S - oy, x1 * S - ox, y1 * S - oy], a0, a1, fill=255, width=int(width * S)),
                    fill, grad, blur, alpha)

    def text(self, xy, s, size, fill='#fff', anchor='mm', alpha=255):
        layer = Image.new('RGBA', self.im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        d.text((xy[0] * S, xy[1] * S), s, font=font(size), fill=rgb(fill) + (alpha,), anchor=anchor)
        self.im = Image.alpha_composite(self.im, layer)

    def shadow(self, cx, cy, rx, ry, a=110):
        self.ell((cx - rx, cy - ry, cx + rx, cy + ry), '#000', blur=18, alpha=a if not self.dark else min(255, a + 60))

    def glow(self, cx, cy, r, color, a=170, blur=None):
        self.circ(cx, cy, r, color, blur=blur or r * 0.45, alpha=a)

    def save(self, path):
        self.im.convert('RGB').resize((W, H), Image.LANCZOS).save(path, 'JPEG', quality=88, optimize=True)


def _grad_arr(w, h, mode, c1, c2=None):
    if mode in ('metal_h', 'metal_v'):
        n = w if mode == 'metal_h' else h
        t = np.linspace(0, 1, n)
        f = 0.50 + 0.55 * np.sin(np.pi * t) ** 1.2 + 0.55 * np.exp(-((t - 0.28) / 0.07) ** 2) - 0.12 * np.exp(-((t - 0.78) / 0.10) ** 2)
        base = np.array(rgb(c1), dtype=float)
        col = np.where(f[:, None] <= 1, base[None, :] * f[:, None], base[None, :] + (255 - base[None, :]) * np.clip(f[:, None] - 1, 0, 1))
        col = np.clip(col, 0, 255)
        return np.repeat(col[None, :, :], h, 0) if mode == 'metal_h' else np.repeat(col[:, None, :], w, 1)
    a, b = np.array(rgb(c1), dtype=float), np.array(rgb(c2), dtype=float)
    if mode == 'v':
        t = np.linspace(0, 1, h)[:, None, None] * np.ones((1, w, 1))
    elif mode == 'h':
        t = np.linspace(0, 1, w)[None, :, None] * np.ones((h, 1, 1))
    else:  # diagonal
        yy, xx = np.mgrid[0:h, 0:w]
        t = ((xx / max(w, 1) + yy / max(h, 1)) / 2)[:, :, None]
    return a + (b - a) * t


def metal(c='#9ca3af'):
    return ('metal_h', c)


def metalv(c='#9ca3af'):
    return ('metal_v', c)


# ======================================================================= wheels
def spoke_poly(cx, cy, ang, r0, r1, w0, w1, twist=0.0):
    ca, sa = math.cos(ang), math.sin(ang)
    cb, sb = math.cos(ang + twist), math.sin(ang + twist)
    pts = []
    for (r, w, c, s) in ((r0, w0, ca, sa), (r1, w1, cb, sb)):
        pts.append((cx + r * c - w * s, cy + r * s + w * c))
    for (r, w, c, s) in ((r1, w1, cb, sb), (r0, w0, ca, sa)):
        pts.append((cx + r * c + w * s, cy + r * s - w * c))
    # order: left0,left1,right1,right0
    return [pts[0], pts[1], pts[2], pts[3]]


def render_wheel(cv, sp):
    cx, cy, R = 600, 430, 340
    style, n, col, lip = sp['style'], sp['n'], sp['col'], sp['lip']
    cv.shadow(cx, cy + R - 10, R * 0.95, 34, 120)
    cv.circ(cx, cy, R, '#0e0e10')
    cv.circ(cx, cy, R * 0.985, grad=('d', '#2a2b2f', '#0c0c0e'))
    for i in range(72):  # tread blocks
        a = math.radians(i * 5)
        cv.circ(cx + R * 0.965 * math.cos(a), cy + R * 0.965 * math.sin(a), 5.5, '#050506', alpha=210)
    cv.circ(cx, cy, R * 0.86, grad=('d', '#202125', '#0f0f11'))
    cv.arc((cx - R * 0.93, cy - R * 0.93, cx + R * 0.93, cy + R * 0.93), 200, 250, 3, '#6b6e75', alpha=120)
    # rim lip
    cv.circ(cx, cy, R * 0.80, grad=('d', shade(lip, 1.35), shade(lip, 0.55)))
    cv.circ(cx, cy, R * 0.775, '#0a0a0c')
    cv.circ(cx, cy, R * 0.755, grad=('d', '#17181b', '#050506'))
    # brake disc + caliper
    cv.circ(cx, cy, R * 0.60, grad=('d', '#8a8e96', '#3b3e44'))
    cv.circ(cx, cy, R * 0.54, grad=('d', '#6d7078', '#2f3237'))
    for rr in (0.57, 0.50):
        cv.arc((cx - R * rr, cy - R * rr, cx + R * rr, cy + R * rr), 0, 360, 2, '#25272b', alpha=160)
    cv.arc((cx - R * 0.56, cy - R * 0.56, cx + R * 0.56, cy + R * 0.56), -42, 38, R * 0.17, '#c4161c')
    cv.arc((cx - R * 0.56, cy - R * 0.56, cx + R * 0.56, cy + R * 0.56), -42, -20, R * 0.17, '#e5333a', alpha=140)
    cv.circ(cx, cy, R * 0.26, grad=('d', '#4a4d54', '#1d1e22'))
    # spokes
    r0, r1 = R * 0.15, R * 0.745
    base = rgb(col)
    hi = shade(col, 1.45)
    lo = shade(col, 0.55)
    off = -math.pi / 2
    if style == 'disc':
        cv.circ(cx, cy, R * 0.745, grad=('d', hi, lo))
        for i in range(n * 2):
            a = off + i * math.pi / n
            p0 = (cx + R * 0.42 * math.cos(a), cy + R * 0.42 * math.sin(a))
            p1 = (cx + R * 0.64 * math.cos(a), cy + R * 0.64 * math.sin(a))
            cv.line([p0, p1], R * 0.06, '#09090b', alpha=230)
        cv.circ(cx, cy, R * 0.30, grad=('d', shade(col, 1.2), shade(col, 0.7)))
        cv.arc((cx - R * 0.7, cy - R * 0.7, cx + R * 0.7, cy + R * 0.7), 0, 360, 3, shade(col, 1.6), alpha=140)
    else:
        for i in range(n):
            a = off + i * 2 * math.pi / n
            if style == 'multi':
                w0 = math.pi * r0 / n * 1.7 if n <= 6 else math.pi * r0 / n * 1.2
                w0 = min(w0, R * 0.17)
                w1 = max(R * 0.028, math.pi * r1 / n * 0.42)
                poly = spoke_poly(cx, cy, a, r0, r1, w0, w1)
                cv.poly(poly, grad=('d', hi, lo))
                inner = spoke_poly(cx, cy, a, r0 + 6, r1 - 10, w0 * 0.35, w1 * 0.3)
                cv.poly(inner, shade(col, 1.6), alpha=110)
            elif style == 'split':
                da = 0.20 * 2 * math.pi / n
                for sgn in (-1, 1):
                    poly = spoke_poly(cx, cy, a + sgn * da, r0, r1, R * 0.045, R * 0.032)
                    cv.poly(poly, grad=('d', hi, lo))
            elif style == 'mesh':
                tw = 0.55 * 2 * math.pi / n * 2
                for sgn in (-1, 1):
                    poly = spoke_poly(cx, cy, a, r0, r1, R * 0.022, R * 0.022, twist=sgn * tw)
                    cv.poly(poly, grad=('d', hi, lo))
        cv.arc((cx - r1, cy - r1, cx + r1, cy + r1), 0, 360, R * 0.03, grad=None, fill=shade(col, 0.85))
    # outer lip highlight ring
    cv.arc((cx - R * 0.795, cy - R * 0.795, cx + R * 0.795, cy + R * 0.795), 190, 260, 4, '#ffffff', alpha=190)
    # hub + cap
    cv.circ(cx, cy, R * 0.185, grad=('d', shade(col, 1.4), shade(col, 0.5)))
    for i in range(5):
        a = off + i * 2 * math.pi / 5
        cv.circ(cx + R * 0.115 * math.cos(a), cy + R * 0.115 * math.sin(a), R * 0.022, '#0b0b0d')
    cv.circ(cx, cy, R * 0.062, grad=('d', '#e5e7eb', '#6b7280'))
    cv.circ(cx, cy, R * 0.032, '#111')
    # sheen over the whole tyre/wheel
    cv.ell((cx - R * 0.95, cy - R * 0.95, cx + R * 0.1, cy - R * 0.05), '#ffffff', blur=40, alpha=34)


# ======================================================================= car silhouette
def car_pts(s=1.0, ox=0, oy=0):
    def m(p):
        return (p[0] * s + ox, p[1] * s + oy)
    return m


def render_car(cv, sp, accent_only=False):
    part = sp.get('part', 'lip')
    acc = sp.get('col', '#3b82f6')
    zoom = sp.get('zoom', 1.0)
    ox, oy = sp.get('ox', 0), sp.get('oy', 0)
    m = car_pts(zoom, ox, oy)

    def P(pts):
        return [m(p) for p in pts]
    gy = 640
    cv.shadow(*m((600, gy + 28)), 470 * zoom, 30 * zoom, 130)
    body = [(168, 596), (158, 528), (168, 478), (196, 462), (338, 448), (420, 340), (470, 316), (690, 316), (790, 420),
            (936, 446), (1010, 472), (1046, 512), (1050, 572), (1036, 596)]
    cv.poly(P(body), grad=('v', '#aab1bb', '#5f6672'))
    # window glass
    cv.poly(P([(356, 450), (428, 352), (472, 332), (686, 332), (772, 424), (780, 440)]), grad=('d', '#26303d', '#0e141c'))
    cv.poly(P([(560, 334), (578, 334), (640, 440), (620, 440)]), '#aab1bb')  # B pillar
    cv.line(P([(214, 520), (900, 504)]), 3 * zoom, '#7c8491', alpha=190)  # shoulder line
    cv.line(P([(200, 560), (940, 560)]), 2 * zoom, '#4b5260', alpha=120)
    # lamps
    cv.poly(P([(1000, 480), (1040, 504), (1034, 520), (988, 506)]), '#fef9c3')
    cv.poly(P([(166, 486), (190, 480), (192, 506), (170, 512)]), '#b91c1c')
    # wheel arches + wheels
    for wx in (320, 882):
        cv.circ(*m((wx, 596)), 92 * zoom, '#14161a')
        cv.circ(*m((wx, 596)), 76 * zoom, grad=('d', '#2a2c31', '#0a0a0c'))
        cv.circ(*m((wx, 596)), 52 * zoom, grad=('d', '#c9ccd2', '#6b7078'))
        for i in range(5):
            a = i * 2 * math.pi / 5
            cv.line([m((wx + 10 * math.cos(a), 596 + 10 * math.sin(a))), m((wx + 46 * math.cos(a), 596 + 46 * math.sin(a)))], 9 * zoom, '#31343a')
        cv.circ(*m((wx, 596)), 11 * zoom, '#111')
    cv.ell((m((190, 456))[0], m((190, 456))[1], m((520, 470))[0], m((520, 490))[1]), '#fff', blur=14, alpha=40)

    def accent(poly, carbon=False):
        base = ('v', shade(acc, 1.25), shade(acc, 0.65))
        cv.poly(P(poly), grad=base)
        if carbon:
            xs = [p[0] for p in P(poly)]
            ys = [p[1] for p in P(poly)]
        cv.poly(P(poly), '#fff', alpha=0)
    if part in ('lip', 'full'):
        accent([(1022, 592), (1074, 604), (1068, 622), (864, 622), (868, 600)])
        cv.glow(*m((1040, 612)), 60 * zoom, acc, 110)
    if part in ('skirt', 'full'):
        accent([(404, 596), (800, 596), (790, 624), (412, 624)])
        cv.glow(*m((600, 612)), 90 * zoom, acc, 80)
    if part in ('diffuser', 'full'):
        accent([(160, 592), (306, 596), (284, 640), (140, 632)])
        for i in range(5):
            cv.line(P([(172 + i * 28, 604), (160 + i * 28, 634)]), 4 * zoom, shade(acc, 0.45))
        cv.glow(*m((210, 618)), 60 * zoom, acc, 110)
    if part in ('bumper', 'full'):
        accent([(950, 470), (1034, 504), (1050, 572), (1034, 598), (918, 598), (946, 530)])
        cv.poly(P([(990, 548), (1040, 556), (1038, 580), (984, 576)]), '#0b0d11')
        cv.glow(*m((1000, 540)), 70 * zoom, acc, 90)
    if part == 'flare':
        for wx in (320, 882):
            cv.arc((*m((wx - 104, 596 - 104)), *m((wx + 104, 596 + 104))), 180, 360, 16 * zoom, acc)
            cv.glow(*m((wx, 506)), 70 * zoom, acc, 70)
    if part == 'hood':
        accent([(796, 424), (936, 446), (1014, 474), (1002, 486), (930, 462), (800, 442)])
        cv.glow(*m((900, 450)), 80 * zoom, acc, 90)


def render_spoiler(cv, sp):
    sp = dict(sp, zoom=1.55, ox=-190, oy=-290)
    render_car(cv, dict(sp, part='none'))
    m = car_pts(1.55, -190, -290)

    def P(pts):
        return [m(p) for p in pts]
    c = sp['col']
    t = sp['type']
    hi = shade(c, 1.5)
    if t == 'gt':
        for x in (230, 300):
            cv.poly(P([(x - 5, 452), (x + 5, 452), (x + 8, 372), (x - 8, 372)]), grad=('h', '#555a63', '#1c1e22'))
        cv.poly(P([(150, 362), (350, 344), (356, 362), (158, 382)]), grad=('v', hi, shade(c, 0.5)))
        cv.poly(P([(146, 350), (166, 352), (170, 392), (150, 390)]), shade(c, 0.4))
        cv.poly(P([(340, 336), (360, 334), (364, 372), (346, 372)]), shade(c, 0.4))
        for i in range(10):  # carbon weave hint
            cv.line(P([(160 + i * 19, 380 - i * 1.7), (168 + i * 19, 362 - i * 1.7)]), 2, shade(c, 0.35), alpha=120)
    elif t == 'lip':
        cv.poly(P([(170, 478), (194, 458), (260, 452), (262, 462), (206, 470), (180, 490)]), grad=('v', hi, shade(c, 0.5)))
    elif t == 'duck':
        cv.poly(P([(162, 482), (184, 436), (270, 444), (272, 456), (200, 458), (172, 494)]), grad=('v', hi, shade(c, 0.5)))
    elif t == 'roof':
        cv.poly(P([(414, 346), (426, 318), (500, 308), (500, 322), (440, 330), (428, 358)]), grad=('v', hi, shade(c, 0.5)))
    cv.glow(*m((230, 440)), 90, shade(c, 1.5), 40)


# ======================================================================= lighting
def render_head(cv, sp):
    col, amber = sp['col'], sp.get('amber', False)
    for side in (0, 1):
        def X(x):
            return x if side == 0 else 1200 - x
        def pts(lst):
            return [(X(x), y) for x, y in lst]
        shape = [(90, 330), (200, 300), (520, 320), (540, 470), (470, 560), (130, 570), (86, 470)]
        cv.shadow(X(310), 610, 230, 20, 100)
        cv.poly(pts(shape), grad=('d', '#2a2e36', '#07080b'))
        cv.poly(pts([(110, 340), (200, 316), (510, 334), (524, 460), (460, 540), (140, 548), (104, 460)]), grad=('v', '#14161b', '#050608'))
        # DRL
        cv.line(pts([(122, 372), (210, 346), (500, 358)]), 14, '#ffffff', alpha=255)
        cv.line(pts([(122, 372), (210, 346), (500, 358)]), 34, col, blur=10, alpha=170)
        if amber:
            cv.line(pts([(130, 520), (300, 528), (456, 520)]), 11, '#fbbf24')
            cv.line(pts([(130, 520), (300, 528), (456, 520)]), 26, '#f59e0b', blur=8, alpha=130)
        for px, py, pr in ((250, 450, 64), (390, 452, 64)):
            cv.glow(X(px), py, pr * 1.6, col, 90)
            cv.circ(X(px), py, pr + 8, grad=('d', '#e5e7eb', '#4b5563'))
            cv.circ(X(px), py, pr, grad=('d', '#0b1220', '#020409'))
            cv.circ(X(px), py, pr * 0.62, grad=('d', shade(col, 1.5), shade(col, 0.45)))
            cv.circ(X(px - 14), py - 16, pr * 0.2, '#ffffff', alpha=220)
        cv.arc((X(130) - 30 if side == 0 else X(130) - 30, 330, X(130) + 30, 380), 180, 270, 3, '#9ca3af', alpha=100)


def render_tail(cv, sp):
    col, bar = sp['col'], sp.get('bar', False)
    dark = shade(col, 0.35)
    cv.shadow(600, 640, 520, 24, 110)
    for side in (0, 1):
        X = (lambda x: x) if side == 0 else (lambda x: 1200 - x)
        shape = [(90, 360), (330, 330), (520, 360), (520, 520), (320, 560), (110, 540), (86, 450)]
        cv.poly([(X(x), y) for x, y in shape], grad=('d', shade(col, 0.95), dark))
        cv.poly([(X(x), y) for x, y in [(108, 372), (330, 346), (506, 372), (506, 508), (320, 544), (122, 526), (102, 450)]], grad=('v', shade(col, 0.55), '#150304'))
        for i in range(9):  # LED dots
            cv.circ(X(150 + i * 38), 432 + math.sin(i / 2) * 8, 9, '#ffe4e6')
            cv.glow(X(150 + i * 38), 432 + math.sin(i / 2) * 8, 22, '#ef4444', 140)
        cv.line([(X(120), 490), (X(300), 500), (X(480), 480)], 10, '#fecaca')
        cv.line([(X(120), 490), (X(300), 500), (X(480), 480)], 28, '#ef4444', blur=9, alpha=150)
        cv.arc((X(300) - 190, 340, X(300) + 190, 420), 190, 350, 5, '#ffffff', alpha=90)
    if bar:
        cv.rrect((505, 406, 695, 438), 14, grad=('v', '#2a0709', '#12030a'))
        cv.line([(520, 422), (680, 422)], 8, '#fecaca')
        cv.line([(520, 422), (680, 422)], 24, '#ef4444', blur=8, alpha=180)


def render_bulb(cv, sp):
    col = sp['col']
    for cx in (370, 830):
        cv.shadow(cx, 730, 130, 16, 100)
        cv.glow(cx, 270, 190, col, 120)
        cv.rrect((cx - 70, 560, cx + 70, 700), 14, grad=('h', '#2f333a', '#0d0e11'))  # base
        for i in range(7):
            cv.rrect((cx - 92, 410 + i * 20, cx + 92, 422 + i * 20), 5, grad=('metal_h', '#9ca3af'))
        cv.rrect((cx - 56, 330, cx + 56, 420), 10, grad=('metal_h', '#d1d5db'))
        cv.rrect((cx - 40, 250, cx + 40, 336), 8, grad=('v', '#ffffff', col))
        cv.glow(cx, 290, 70, '#ffffff', 220, blur=28)
        cv.rrect((cx - 44, 700, cx + 44, 760), 6, '#bfa14a')


def render_lens(cv, sp):
    col = sp['col']
    cv.shadow(600, 770, 320, 24, 110)
    cv.glow(600, 430, 360, col, 70)
    cv.circ(600, 430, 300, grad=('d', '#f1f5f9', '#475569'))
    cv.circ(600, 430, 276, grad=('d', '#1b1e24', '#050608'))
    cv.circ(600, 430, 232, grad=('d', '#e5e7eb', '#6b7280'))
    cv.circ(600, 430, 212, grad=('d', '#0b1220', '#020409'))
    cv.circ(600, 430, 150, grad=('d', shade(col, 1.6), shade(col, 0.4)))
    cv.circ(600, 430, 96, grad=('d', '#e0f2fe', col))
    cv.circ(560, 390, 36, '#fff', alpha=190, blur=6)
    for i in range(8):
        a = i * math.pi / 4
        cv.circ(600 + 254 * math.cos(a), 430 + 254 * math.sin(a), 7, '#111827')


def render_fog(cv, sp):
    col = sp['col']
    for cx in (350, 850):
        cv.shadow(cx, 700, 190, 18, 100)
        cv.glow(cx, 430, 270, col, 80)
        cv.circ(cx, 430, 200, grad=('d', '#9ca3af', '#1f2937'))
        cv.circ(cx, 430, 178, grad=('d', '#111827', '#030507'))
        cv.circ(cx, 430, 150, grad=('d', shade(col, 1.6), shade(col, 0.5)))
        cv.circ(cx, 430, 90, grad=('d', '#ffffff', col))
        cv.circ(cx - 40, 390, 28, '#fff', alpha=190, blur=5)


def render_lightbar(cv, sp):
    col = sp['col']
    cv.shadow(600, 640, 520, 24, 110)
    cv.glow(600, 400, 480, col, 40)
    cv.rrect((80, 330, 1120, 520), 28, grad=('v', '#2a2d33', '#07080a'))
    cv.rrect((100, 350, 1100, 500), 20, grad=('v', '#0f1115', '#030405'))
    n = 18
    for i in range(n):
        x = 130 + i * (940 / (n - 1))
        for y in (395, 455):
            cv.circ(x, y, 24, grad=('d', '#f8fafc', '#94a3b8'))
            cv.circ(x, y, 14, '#ffffff')
            cv.glow(x, y, 34, col, 140)
    cv.rrect((60, 380, 90, 470), 10, '#3b3f46')
    cv.rrect((1110, 380, 1140, 470), 10, '#3b3f46')


def render_underglow(cv, sp):
    col = sp['col']
    render_car(cv, dict(sp, part='none', col='#6b7280'))
    cv.ell((200, 600, 1000, 690), col, blur=26, alpha=230)
    cv.line([(250, 640), (950, 640)], 7, '#ffffff', alpha=230)
    cv.line([(250, 640), (950, 640)], 30, col, blur=10, alpha=200)


# ======================================================================= suspension
def helix(cv, cx, y0, y1, turns, rx, col, thick):
    pitch = (y1 - y0) / turns
    for i in range(turns):
        y = y0 + i * pitch + pitch * 0.5
        cv.arc((cx - rx, y - 28, cx + rx, y + 28), 8, 172, thick, grad=None, fill=shade(col, 0.6))
        cv.arc((cx - rx, y - 28, cx + rx, y + 28), 12, 168, thick * 0.55, grad=None, fill=col)
        cv.arc((cx - rx + 6, y - 24, cx + rx - 6, y + 24), 40, 100, thick * 0.2, grad=None, fill=shade(col, 1.6), alpha=170)


def render_coilover(cv, sp):
    col = sp['col']
    cx = 600
    cv.shadow(cx, 810, 200, 22, 120)
    cv.rrect((cx - 70, 80, cx + 70, 150), 14, grad=('metal_h', '#6b7280'))     # top mount
    cv.circ(cx, 115, 14, '#0b0b0d')
    cv.rrect((cx - 16, 140, cx + 16, 400), 4, grad=('metal_h', '#e5e7eb'))     # rod
    cv.rrect((cx - 56, 380, cx + 56, 760), 18, grad=('metal_h', '#3a3e46'))    # body
    cv.rrect((cx - 62, 610, cx + 62, 668), 8, grad=('metal_h', col))            # anodised collar
    for i in range(6):
        cv.line([(cx - 60, 620 + i * 9), (cx + 60, 620 + i * 9)], 2, shade(col, 0.45), alpha=190)
    helix(cv, cx, 190, 620, 9, 112, col, 18)
    cv.rrect((cx - 70, 600, cx + 70, 622), 6, grad=('metal_h', '#6b7280'))      # lower spring seat
    cv.rrect((cx - 46, 742, cx + 46, 800), 10, grad=('metal_h', '#6b7280'))     # bottom bracket
    cv.circ(cx, 772, 14, '#0b0b0d')


def render_spring(cv, sp):
    col = sp['col']
    cx = 600
    cv.shadow(cx, 810, 220, 22, 120)
    helix(cv, cx, 130, 760, 12, 150, col, 22)
    cv.rrect((cx - 160, 110, cx + 160, 134), 8, grad=('metal_h', '#6b7280'), alpha=0)
    cv.line([(cx - 150, 760), (cx + 150, 760)], 4, shade(col, 0.5), alpha=0)


def render_shock(cv, sp):
    col = sp['col']
    cx = 600
    cv.shadow(cx, 810, 180, 22, 120)
    cv.rrect((cx - 20, 110, cx + 20, 420), 4, grad=('metal_h', '#e5e7eb'))
    cv.ell((cx - 60, 70, cx + 60, 150), None, grad=('metal_h', '#6b7280'))
    cv.circ(cx, 110, 18, '#0b0b0d')
    cv.rrect((cx - 64, 400, cx + 64, 760), 22, grad=('metal_h', '#2e3239'))
    cv.rrect((cx - 66, 470, cx + 66, 520), 6, grad=('metal_h', col))
    cv.rrect((cx - 40, 744, cx + 40, 810), 12, grad=('metal_h', '#6b7280'))
    cv.circ(cx, 782, 14, '#0b0b0d')
    for i in range(4):
        cv.line([(cx - 60, 560 + i * 34), (cx + 60, 560 + i * 34)], 2, '#0a0a0c', alpha=140)


def render_air(cv, sp):
    cx = 600
    cv.shadow(cx, 820, 230, 22, 120)
    cv.rrect((cx - 140, 130, cx + 140, 190), 12, grad=('metal_h', '#6b7280'))
    cv.rrect((cx - 24, 70, cx + 24, 136), 6, grad=('metal_h', '#d1d5db'))
    for i, (y0, y1) in enumerate(((190, 360), (330, 520), (500, 680))):
        cv.ell((cx - 175, y0, cx + 175, y1), None, grad=('metal_h', '#1f2229'))
        cv.line([(cx - 168, (y0 + y1) / 2), (cx + 168, (y0 + y1) / 2)], 3, '#4b5160', alpha=150)
    for y in (360, 520):
        cv.rrect((cx - 116, y - 14, cx + 116, y + 14), 6, grad=('metal_h', '#9ca3af'))
    cv.rrect((cx - 140, 680, cx + 140, 740), 12, grad=('metal_h', '#6b7280'))
    cv.line([(cx + 140, 160), (900, 160), (900, 300)], 12, '#2563eb')
    cv.circ(900, 310, 22, grad=('metal_h', '#9ca3af'))


def render_bar(cv, sp):
    col = sp['col']
    cv.shadow(600, 780, 430, 22, 110)
    pts = [(240, 270), (240, 560), (400, 650), (800, 650), (960, 560), (960, 270)]
    cv.line(pts, 58, shade(col, 0.5))
    cv.line(pts, 48, col)
    cv.line([(p[0] - 8, p[1] - 8) for p in pts], 12, shade(col, 1.6), alpha=170)
    for p in ((240, 270), (960, 270)):
        cv.circ(p[0], p[1], 46, grad=('metal_h', '#6b7280'))
        cv.circ(p[0], p[1], 20, '#0b0b0d')
    for x in (440, 760):
        cv.rrect((x - 40, 618, x + 40, 686), 14, grad=('metal_h', '#374151'))


# ======================================================================= interior
def render_steer(cv, sp):
    col, acc = sp['col'], sp['acc']
    cx, cy = 600, 430
    cv.shadow(cx, 780, 330, 24, 120)
    pts = []
    for i in range(0, 361, 5):
        a = math.radians(i)
        x, y = cx + 300 * math.cos(a), cy + 300 * math.sin(a)
        pts.append((x, min(y, cy + 245)))
    cv.line(pts, 78, shade(col, 0.45))
    cv.line(pts, 66, col)
    cv.line([(p[0] - 5, p[1] - 5) for p in pts[:60]], 10, shade(col, 2.2), alpha=130)
    for i in range(0, 72, 2):  # stitching
        a = math.radians(i * 5)
        x, y = cx + 300 * math.cos(a), min(cy + 300 * math.sin(a), cy + 245)
        cv.circ(x, y, 3, acc, alpha=230)
    for ex, ey in ((330, 465), (870, 465), (600, 660)):
        cv.line([(cx, cy + 10), (ex, ey)], 56, shade(col, 0.45))
        cv.line([(cx, cy + 10), (ex, ey)], 46, col)
    cv.circ(cx, cy + 10, 96, grad=('d', shade(col, 1.5), shade(col, 0.5)))
    cv.circ(cx, cy + 10, 64, grad=('d', '#3f434b', '#0b0c0e'))
    cv.rrect((cx - 7, cy - 295, cx + 7, cy - 245), 3, acc)
    for dx in (-205, 205):
        for dy in (0, 30):
            cv.circ(cx + dx, cy + 22 + dy - 15, 11, grad=('d', '#d1d5db', '#4b5563'))


def render_seat(cv, sp):
    col, acc = sp['col'], sp['acc']
    cv.shadow(600, 800, 300, 26, 130)
    cv.poly([(410, 700), (790, 700), (800, 590), (410, 590)], grad=('v', shade(col, 1.1), shade(col, 0.4)))   # base
    cv.poly([(410, 120), (790, 120), (840, 330), (820, 600), (380, 600), (360, 330)], grad=('h', shade(col, 0.55), shade(col, 0.55)))
    cv.poly([(470, 150), (730, 150), (760, 330), (748, 584), (452, 584), (440, 330)], grad=('d', shade(col, 1.35), shade(col, 0.6)))
    cv.rrect((495, 90, 705, 270), 30, grad=('v', shade(col, 1.25), shade(col, 0.55)))
    cv.rrect((527, 150, 545, 220), 8, '#050506')
    cv.rrect((655, 150, 673, 220), 8, '#050506')
    cv.line([(600, 280), (600, 584)], 38, acc, alpha=210)
    for yy in range(300, 570, 36):
        cv.line([(470, yy), (730, yy)], 2, shade(col, 0.3), alpha=140)
    cv.poly([(398, 330), (448, 330), (448, 584), (402, 584)], grad=('h', shade(col, 0.5), shade(col, 1.0)), alpha=210)
    cv.poly([(752, 330), (802, 330), (798, 584), (752, 584)], grad=('h', shade(col, 1.0), shade(col, 0.5)), alpha=210)


def render_screen(cv, sp):
    col = sp['col']
    cv.shadow(600, 770, 470, 24, 120)
    cv.rrect((120, 190, 1080, 700), 34, grad=('d', '#2c2f36', '#0a0b0d'))
    cv.rrect((150, 214, 1050, 676), 18, grad=('v', shade(col, 0.55), '#05070b'))
    cv.rrect((180, 244, 640, 646), 14, grad=('v', '#0f172a', '#020617'))
    for i in range(6):
        cv.line([(180, 300 + i * 56), (640, 340 + i * 44)], 2, '#1e293b')
        cv.line([(220 + i * 84, 246), (260 + i * 84, 646)], 2, '#1e293b')
    cv.line([(210, 610), (300, 480), (430, 450), (560, 330), (620, 280)], 12, col)
    cv.circ(620, 280, 20, '#fff')
    cv.text((860, 300), '12:45', 76, '#ffffff')
    cv.text((860, 372), 'Android Auto  •  CarPlay', 28, '#9ca3af')
    for i, ic in enumerate(('#22c55e', '#3b82f6', '#f59e0b', '#ef4444')):
        x = 710 + i * 100
        cv.rrect((x, 440, x + 84, 524), 22, grad=('v', shade(ic, 1.2), shade(ic, 0.6)))
    for i, ic in enumerate(('#a855f7', '#06b6d4', '#eab308', '#ec4899')):
        x = 710 + i * 100
        cv.rrect((x, 550, x + 84, 634), 22, grad=('v', shade(ic, 1.2), shade(ic, 0.6)))


def render_ambient(cv, sp):
    col = sp['col']
    cv.rrect((0, 0, W, H), 0, '#050608', alpha=0)
    cv.poly([(0, 330), (600, 270), (1200, 330), (1200, 900), (0, 900)], grad=('v', '#16181d', '#050608'))
    cv.poly([(0, 330), (600, 270), (1200, 330), (1200, 380), (600, 330), (0, 380)], grad=('v', '#24272e', '#0e1014'))
    pts = [(40, 480), (300, 420), (600, 400), (900, 420), (1160, 480)]
    cv.line(pts, 60, col, blur=22, alpha=190)
    cv.line(pts, 10, '#ffffff')
    cv.line(pts, 24, col, alpha=230)
    cv.line([(60, 640), (600, 700), (1140, 640)], 40, shade(col, 0.9), blur=18, alpha=150)
    cv.line([(60, 640), (600, 700), (1140, 640)], 7, '#ffffff', alpha=240)
    for x in (230, 970):
        cv.rrect((x - 90, 540, x + 90, 590), 12, '#07080a')
        for k in range(6):
            cv.line([(x - 80, 548 + k * 7), (x + 80, 548 + k * 7)], 2, '#1b1d22')


def render_dash(cv, sp):
    col, acc = sp['col'], sp['acc']
    cv.poly([(80, 330), (600, 250), (1120, 330), (1120, 640), (80, 640)], grad=('v', shade(col, 1.2), shade(col, 0.4)))
    cv.line([(110, 600), (600, 560), (1090, 600)], 4, acc)
    for i in range(30):
        cv.circ(110 + i * 33, 600 - math.sin(i / 30 * math.pi) * 40 + 0, 2.5, acc)
    for cx in (360, 840):
        cv.rrect((cx - 140, 380, cx + 140, 440), 12, '#0a0b0d')
        for k in range(8):
            cv.line([(cx - 130, 388 + k * 6), (cx + 130, 388 + k * 6)], 2, '#262930')
    cv.circ(600, 470, 90, grad=('d', '#2a2d33', '#07080a'))
    cv.circ(600, 470, 62, grad=('d', '#0b1220', '#020409'))
    cv.line([(600, 470), (640, 440)], 5, acc)
    cv.rrect((70, 330, 1130, 360), 10, shade(col, 0.5))


def render_pedals(cv, sp):
    col = sp['col']
    cv.shadow(600, 790, 380, 22, 120)
    for (x0, x1, y0, y1) in ((260, 470, 220, 700), (520, 640, 330, 700), (690, 940, 220, 700)):
        cv.rrect((x0, y0, x1, y1), 22, grad=('metal_h', col))
        for yy in range(y0 + 40, y1 - 20, 34):
            for xx in range(int(x0 + 28), int(x1 - 20), 34):
                cv.circ(xx, yy, 7, '#15171b')
        cv.rrect((x0, y1 - 40, x1, y1), 12, '#15171b', alpha=180)


def render_mats(cv, sp):
    col = sp['col']
    for ox, mirror in ((190, 1), (640, -1)):
        pts = [(ox + 30, 110), (ox + 330, 110), (ox + 350, 330), (ox + 330, 560), (ox + 350, 760), (ox + 40, 760), (ox + 10, 560), (ox + 30, 330)]
        cv.shadow(ox + 190, 790, 190, 18, 100)
        cv.poly(pts, grad=('d', shade(col, 1.25), shade(col, 0.45)))
        inner = [(ox + 50, 140), (ox + 310, 140), (ox + 326, 330), (ox + 308, 540), (ox + 326, 730), (ox + 56, 730), (ox + 34, 540), (ox + 50, 330)]
        cv.line(inner + [inner[0]], 3, '#c7a76b', alpha=210)
        for yy in range(160, 720, 26):
            for xx in range(ox + 70, ox + 300, 26):
                cv.circ(xx + (13 if (yy // 26) % 2 else 0), yy, 3, shade(col, 0.3), alpha=150)
        cv.rrect((ox + 120, 640, ox + 240, 700), 10, shade(col, 0.4), alpha=210)


# ======================================================================= exhaust
TIPCOL = {
    'chrome': ('metal_v', '#d4d4d8'),
    'black': ('metal_v', '#27272a'),
    'ti': ('metal_v', '#a1a1aa'),
}


def tip_fill(kind):
    if kind == 'blue':
        return ('v', '#d6b25b', '#2f56d6')
    return TIPCOL.get(kind, TIPCOL['chrome'])


def draw_tip(cv, x0, x1, cy, r, kind):
    cv.rrect((x0, cy - r, x1, cy + r), 6, grad=tip_fill(kind))
    cv.ell((x1 - r * 0.45, cy - r, x1 + r * 0.45, cy + r), None, grad=tip_fill(kind))
    cv.ell((x1 - r * 0.25, cy - r * 0.82, x1 + r * 0.25, cy + r * 0.82), '#050506')
    cv.line([(x0 + 14, cy - r * 0.6), (x1 - 20, cy - r * 0.6)], 5, '#ffffff', alpha=130)


def render_exhaust(cv, sp):
    n, tk, body = sp['tips'], sp['tipcol'], sp['body']
    cv.shadow(600, 800, 520, 22, 120)
    ys = {1: [450], 2: [370, 530], 4: [310, 410, 510, 610]}[n]
    cy = 460
    cv.rrect((110, cy - 30, 300, cy + 30), 8, grad=('metal_v', '#9ca3af'))   # inlet pipe
    cv.rrect((60, cy - 46, 130, cy + 46), 6, grad=('metal_v', '#6b7280'))      # flange
    cv.rrect((250, cy - 130, 800, cy + 130), 70, grad=('metal_v', body))
    for x in (360, 540, 700):
        cv.line([(x, cy - 124), (x, cy + 124)], 3, '#52525b', alpha=150)
    cv.rrect((270, cy - 120, 780, cy - 90), 14, '#ffffff', alpha=60, blur=3)
    r = 54 if n < 4 else 38
    for y in ys:
        cv.rrect((780, y - 22, 880, y + 22), 6, grad=('metal_v', '#9ca3af'))
        draw_tip(cv, 860, 1010, y, r, tk)


def render_tip(cv, sp):
    cv.shadow(600, 780, 460, 22, 120)
    for y in (330, 560):
        draw_tip(cv, 130, 960, y, 78, sp['tipcol'])


def render_valve(cv, sp):
    body = sp.get('body', '#9ca3af')
    cv.shadow(600, 780, 460, 22, 120)
    cv.rrect((80, 400, 1120, 500), 14, grad=('metal_v', '#9ca3af'))
    cv.rrect((440, 300, 760, 600), 30, grad=('metal_h', body))
    cv.circ(600, 450, 108, grad=('d', '#3a3e46', '#0e0f12'))
    cv.circ(600, 450, 70, grad=('d', '#9ca3af', '#3b3f46'))
    cv.circ(600, 450, 20, '#0b0b0d')
    cv.rrect((540, 240, 660, 308), 14, grad=('metal_h', '#374151'))
    cv.line([(600, 240), (600, 150), (760, 100)], 8, '#111827')
    cv.rrect((60, 380, 130, 520), 8, grad=('metal_v', '#6b7280'))
    cv.rrect((1070, 380, 1140, 520), 8, grad=('metal_v', '#6b7280'))


def render_downpipe(cv, sp):
    cv.shadow(600, 800, 470, 22, 120)
    pts = [(110, 270), (380, 270), (520, 330), (560, 520), (680, 650), (1040, 650)]
    cv.line(pts, 78, '#4b5563')
    cv.line(pts, 66, '#9ca3af')
    cv.line([(p[0] - 4, p[1] - 12) for p in pts], 14, '#f3f4f6', alpha=190)
    cv.rrect((420, 360, 640, 560), 60, grad=('metal_h', '#78716c'))
    for y in (410, 460, 510):
        cv.line([(425, y), (635, y)], 3, '#3f3f46', alpha=190)
    cv.rrect((70, 220, 130, 320), 6, grad=('metal_v', '#6b7280'))
    cv.rrect((1030, 600, 1090, 700), 6, grad=('metal_v', '#6b7280'))


# ======================================================================= wrap / paint
def render_roll(cv, sp):
    col, sheen = sp['col'], sp['sheen']
    cv.shadow(620, 760, 520, 26, 120)
    cv.poly([(340, 250), (1070, 330), (1070, 690), (340, 670)], grad=('d', col, sheen))
    cv.poly([(340, 250), (1070, 330), (1070, 380), (340, 300)], '#fff', alpha=60)
    cv.line([(460, 280), (700, 520), (760, 690)], 8, '#ffffff', alpha=50)
    cv.circ(340, 460, 210, grad=('d', shade(col, 1.1), shade(col, 0.45)))
    for rr in (190, 160, 130, 100):
        cv.arc((340 - rr, 460 - rr, 340 + rr, 460 + rr), 0, 360, 3, shade(col, 0.4), alpha=170)
    cv.circ(340, 460, 78, grad=('d', '#d6b88a', '#a07a4a'))
    cv.circ(340, 460, 58, '#161214')
    cv.arc((140, 260, 540, 660), 190, 260, 8, '#ffffff', alpha=120)
    cv.rrect((860, 590, 1030, 650), 10, '#ffffff', alpha=220)
    cv.line([(878, 612), (1010, 612)], 5, '#111827', alpha=220)
    cv.line([(878, 632), (980, 632)], 5, '#6b7280', alpha=220)


def render_ppf(cv, sp):
    col = sp['col']
    cv.shadow(620, 760, 520, 26, 110)
    cv.poly([(340, 250), (1070, 330), (1070, 690), (340, 670)], grad=('d', '#f0f9ff', col), alpha=170)
    for k in range(5):
        cv.line([(520 + k * 120, 300 + k * 10), (400 + k * 120, 690)], 18, '#ffffff', alpha=70, blur=6)
    cv.circ(340, 460, 210, grad=('d', '#ffffff', col), alpha=190)
    for rr in (190, 160, 130, 100):
        cv.arc((340 - rr, 460 - rr, 340 + rr, 460 + rr), 0, 360, 3, '#94a3b8', alpha=140)
    cv.circ(340, 460, 78, grad=('d', '#d6b88a', '#a07a4a'))
    cv.circ(340, 460, 58, '#161214')
    cv.arc((140, 260, 540, 660), 190, 260, 8, '#ffffff', alpha=190)
    cv.rrect((860, 590, 1030, 650), 10, '#1d4ed8', alpha=230)
    cv.text((945, 620), 'PPF', 34, '#ffffff')


def render_bottle(cv, sp):
    col, label = sp['col'], sp['label']
    cv.shadow(600, 800, 220, 22, 120)
    cv.rrect((500, 300, 700, 780), 40, grad=('metal_h', col))
    cv.rrect((530, 200, 670, 310), 18, grad=('metal_h', '#17181b'))
    cv.rrect((580, 150, 620, 210), 8, grad=('metal_h', '#17181b'))
    cv.rrect((508, 430, 692, 700), 12, label)
    cv.text((600, 500), 'CERAMIC', 38, col)
    cv.text((600, 556), '9H', 70, col)
    cv.line([(530, 620), (670, 620)], 4, col, alpha=200)
    cv.text((600, 664), 'PRO COATING', 22, '#6b7280')
    cv.rrect((520, 320, 548, 760), 12, '#ffffff', alpha=70)


def render_spray(cv, sp):
    col = sp['col']
    cv.shadow(600, 800, 420, 22, 120)
    for x in (380, 600, 820):
        cv.rrect((x - 80, 330, x + 80, 770), 30, grad=('metal_h', col))
        cv.ell((x - 80, 290, x + 80, 360), None, grad=('metal_h', shade(col, 1.4)))
        cv.rrect((x - 46, 200, x + 46, 310), 14, grad=('metal_h', '#f43f5e' if x == 600 else '#3f3f46'))
        cv.rrect((x - 14, 170, x + 14, 210), 4, '#d1d5db')
        cv.rrect((x - 80, 480, x + 80, 640), 0, '#f8fafc', alpha=235)
        cv.text((x, 535), 'PLASTI', 26, '#111827')
        cv.text((x, 580), 'DIP', 46, '#e11d48')
        cv.rrect((x - 62, 340, x - 40, 740), 10, '#fff', alpha=60)


# ======================================================================= other
def render_dashcam(cv, sp):
    col = sp['col']
    cv.shadow(600, 770, 380, 22, 120)
    cv.rrect((540, 130, 660, 250), 18, grad=('metal_h', '#3b3f46'))
    cv.rrect((350, 240, 850, 560), 56, grad=('d', '#31353d', col))
    cv.rrect((370, 260, 830, 540), 44, grad=('v', '#1a1c21', '#07080a'))
    cv.circ(520, 400, 110, grad=('d', '#9ca3af', '#2a2d33'))
    cv.circ(520, 400, 92, grad=('d', '#0b0e18', '#020308'))
    cv.circ(520, 400, 58, grad=('d', '#312e81', '#050510'))
    cv.circ(520, 400, 26, grad=('d', '#6366f1', '#1e1b4b'))
    cv.circ(496, 374, 12, '#fff', alpha=200)
    cv.rrect((680, 350, 800, 450), 14, grad=('v', '#0f172a', '#020617'))
    cv.text((740, 400), 'REC', 32, '#ef4444')
    cv.circ(790, 300, 9, '#ef4444')
    cv.glow(790, 300, 24, '#ef4444', 140)
    cv.rrect((860, 340, 880, 420), 6, '#6b7280')
    cv.rrect((860, 440, 880, 480), 6, '#6b7280')


def render_brake(cv, sp):
    col = sp['col']
    cx, cy, R = 520, 450, 330
    cv.shadow(cx, 800, 330, 22, 120)
    cv.circ(cx, cy, R, grad=('d', '#a1a5ad', '#3b3e44'))
    cv.circ(cx, cy, R * 0.93, grad=('d', '#8a8e96', '#2b2d32'))
    for ring, cnt in ((0.80, 36), (0.68, 30), (0.56, 24)):
        for i in range(cnt):
            a = i * 2 * math.pi / cnt + ring
            cv.circ(cx + R * ring * math.cos(a), cy + R * ring * math.sin(a), 9, '#15161a')
    cv.circ(cx, cy, R * 0.40, grad=('d', '#60646c', '#202226'))
    cv.circ(cx, cy, R * 0.26, '#15161a')
    for i in range(5):
        a = i * 2 * math.pi / 5 - math.pi / 2
        cv.circ(cx + R * 0.33 * math.cos(a), cy + R * 0.33 * math.sin(a), 16, '#0a0a0c')
    cv.arc((cx - R * 0.82, cy - R * 0.82, cx + R * 0.82, cy + R * 0.82), -40, 42, 150, col)
    cv.arc((cx - R * 0.82, cy - R * 0.82, cx + R * 0.82, cy + R * 0.82), -40, -10, 150, '#ffffff', alpha=70)
    cv.rrect((cx + 160, cy - 52, cx + 300, cy + 24), 8, '#f8fafc', alpha=230)
    cv.text((cx + 230, cy - 14), 'BREMBO', 20, '#111827')
    for yy in (-120, 120):
        cv.circ(cx + 262, cy + yy, 14, grad=('d', '#d1d5db', '#4b5563'))


def render_nuts(cv, sp):
    col = sp['col']
    cv.shadow(600, 780, 430, 22, 110)
    pos = [(300, 330), (520, 330), (740, 330), (410, 560), (630, 560), (850, 560)]
    for (x, y) in pos:
        hexpts = [(x + 92 * math.cos(math.radians(60 * i + 30)), y + 92 * math.sin(math.radians(60 * i + 30))) for i in range(6)]
        cv.poly(hexpts, grad=('d', shade(col, 1.6), shade(col, 0.45)))
        hex2 = [(x + 74 * math.cos(math.radians(60 * i + 30)), y + 74 * math.sin(math.radians(60 * i + 30))) for i in range(6)]
        cv.poly(hex2, grad=('d', shade(col, 1.2), shade(col, 0.6)))
        cv.circ(x, y, 34, '#0a0a0c')
        cv.arc((x - 34, y - 34, x + 34, y + 34), 200, 260, 4, '#fff', alpha=150)


def render_intake(cv, sp):
    col = sp['col']
    cv.shadow(600, 790, 470, 22, 120)
    cv.rrect((80, 390, 520, 520), 40, grad=('metal_v', '#27272a'))
    cv.rrect((480, 360, 560, 550), 14, grad=('metal_v', '#9ca3af'))
    cv.poly([(560, 330), (1040, 200), (1040, 700), (560, 570)], grad=('v', shade(col, 1.2), shade(col, 0.5)))
    for i in range(24):
        x = 560 + i * 20
        top = 330 - (x - 560) * (130 / 480)
        bot = 570 + (x - 560) * (130 / 480)
        cv.line([(x, top + 6), (x, bot - 6)], 3, shade(col, 0.4), alpha=170)
    cv.ell((1000, 200, 1090, 700), None, grad=('metal_h', '#6b7280'))
    cv.ell((1010, 230, 1080, 670), '#0b0b0d')
    cv.rrect((130, 372, 190, 540), 8, grad=('metal_v', '#9ca3af'))


def render_radiator(cv, sp):
    cv.shadow(600, 790, 450, 22, 120)
    cv.rrect((180, 200, 1020, 700), 14, grad=('v', '#b0b4bb', '#6c7078'))
    cv.rrect((120, 190, 220, 710), 18, grad=('metal_h', '#1f2229'))
    cv.rrect((980, 190, 1080, 710), 18, grad=('metal_h', '#1f2229'))
    for x in range(230, 980, 14):
        cv.line([(x, 215), (x, 685)], 2, '#3f4249', alpha=200)
    for y in range(225, 690, 40):
        cv.line([(185, y), (1015, y)], 2, '#9ca3af', alpha=110)
    cv.rrect((920, 130, 1010, 200), 10, grad=('metal_h', '#d1d5db'))
    cv.circ(965, 130, 28, grad=('metal_h', '#6b7280'))
    cv.rrect((60, 270, 130, 330), 8, '#111')
    cv.rrect((1070, 570, 1140, 630), 8, '#111')


def render_box(cv, sp):
    col = sp['col']
    cv.shadow(600, 790, 520, 24, 120)
    cv.line([(250, 620), (250, 700)], 22, '#6b7280')
    cv.line([(950, 620), (950, 700)], 22, '#6b7280')
    cv.rrect((120, 690, 1080, 716), 8, grad=('metal_v', '#4b5563'))
    cv.poly([(80, 600), (112, 480), (300, 380), (860, 360), (1040, 440), (1120, 600), (1080, 640), (120, 640)], grad=('v', shade(col, 1.9), shade(col, 0.4)))
    cv.poly([(112, 480), (300, 380), (860, 360), (1040, 440), (1120, 600), (1080, 640), (120, 640), (80, 600)], '#ffffff', alpha=0)
    cv.line([(130, 560), (1090, 560)], 4, '#000', alpha=120)
    cv.line([(600, 380), (600, 640)], 4, '#000', alpha=80)
    cv.line([(150, 480), (320, 396), (840, 378), (1000, 440)], 12, '#ffffff', alpha=90, blur=3)
    cv.text((860, 600), 'THULE', 34, '#d1d5db')


def render_sensor(cv, sp):
    col = sp['col']
    cv.shadow(600, 790, 450, 22, 110)
    for i, x in enumerate((220, 420, 620, 820)):
        cv.circ(x, 300, 84, grad=('d', '#6b7280', '#101114'))
        cv.circ(x, 300, 70, grad=('d', shade(col, 1.4), shade(col, 0.5)))
        cv.circ(x, 300, 38, grad=('d', '#27272a', '#050506'))
        cv.circ(x - 16, 284, 12, '#fff', alpha=160)
    cv.rrect((260, 520, 940, 690), 34, grad=('d', '#2a2d33', '#07080a'))
    cv.rrect((290, 548, 910, 662), 20, grad=('v', '#020617', '#0a0f1f'))
    for i, c in enumerate(('#22c55e', '#22c55e', '#eab308', '#f97316', '#ef4444')):
        cv.rrect((330 + i * 108, 590, 410 + i * 108, 628), 10, c)
    cv.rrect((1000, 540, 1100, 680), 14, grad=('d', '#3b3f46', '#111')) if False else None


RENDER = {
    'wheel': render_wheel, 'car': render_car, 'spoiler': render_spoiler,
    'head': render_head, 'tail': render_tail, 'bulb': render_bulb, 'lens': render_lens, 'fog': render_fog,
    'bar_light': render_lightbar, 'glow': render_underglow,
    'coilover': render_coilover, 'spring': render_spring, 'shock': render_shock, 'air': render_air, 'bar': render_bar,
    'wheelsteer': render_steer, 'seat': render_seat, 'screen': render_screen, 'ambient': render_ambient,
    'dash': render_dash, 'pedals': render_pedals, 'mats': render_mats,
    'exhaust': render_exhaust, 'tip': render_tip, 'valve': render_valve, 'downpipe': render_downpipe,
    'roll': render_roll, 'ppf': render_ppf, 'bottle': render_bottle, 'spray': render_spray,
    'dashcam': render_dashcam, 'brake': render_brake, 'nuts': render_nuts, 'intake': render_intake,
    'radiator': render_radiator, 'box': render_box, 'sensor': render_sensor,
}


def render(spec, key, path, variant=0):
    k = spec['k']
    if k == 'bar' and spec.get('light'):
        k = 'bar_light'
    dark = (zlib.crc32(key.encode()) + variant) % 2 == 1
    if k in ('ambient',):
        dark = True
    cv = Cv(dark=dark)
    RENDER['car'] if k == 'car' else None
    RENDER[k](cv, spec)
    cv.save(path)
