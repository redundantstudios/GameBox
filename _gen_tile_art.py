"""Hand-drawn tile artwork for every game - CUSTOM, one composition each.

This replaces the "emoji on a gradient" look of _gen_tiles.py. Every game gets
a small bespoke vector drawing (dice, planet, bomb, chick, ...) coded below
with plain PIL shapes, so each tile reads as its own game even at a glance and
no font/emoji availability can ever break it (no .notdef boxes possible).

What it produces
    app/src/main/res/drawable-nodpi/tile_<id>.png   (512x512 emblem)

How the shell uses it
    GameAdapter looks up "tile_<gameId>" by name at bind time. Missing file ->
    the tile falls back to the flat manifest colour, so the app never breaks.

Design language (STYLE.md, "flat pop" + studio palette)
    * rounded square, vertical lit gradient of the manifest tileColor
    * faint dot grid + inner keyline (same texture family as the shell bg)
    * one big CENTRED CUSTOM DRAWING in cream, with a soft drop shadow
    * small accent details reuse the tile colour darkened/lightened - the
      icon and the tile always feel like one piece

Usage
    python _gen_tile_art.py              # all games (bundled + fallback list)
    python _gen_tile_art.py ludo chess   # regenerate only these ids
"""
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

import _gen_tiles as G  # reuse the manifest reading + colour/plumbing helpers

CREAM = (255, 255, 252, 240)
HALO = (255, 255, 255, 34)


def dark(base, amount=0.55, alpha=220):
    c = G.mix(base, (0, 0, 0), amount)
    return (c[0], c[1], c[2], alpha)


def light(base, amount=0.45, alpha=220):
    c = G.mix(base, (255, 255, 255), amount)
    return (c[0], c[1], c[2], alpha)


def rrect(d, box, r, **kw):
    d.rounded_rectangle(box, radius=r, **kw)


# ---------------------------------------------------------------- game art ---
# One function per game id: fn(d, S, base) draws on the icon layer, centred in
# the 512x512 canvas. Keep every drawing inside roughly 70..S-70.

def ludo_die(d, S, base):
    # one big die, "5" face with dark pips, soft offset echo behind
    r = int(S * 0.30)
    box = (S / 2 - r, S / 2 - r, S / 2 + r, S / 2 + r)
    d.ellipse((box[0] - 14, box[1] - 6, box[2] - 14, box[3] - 6),
              fill=dark(base, 0.4, 90))
    rrect(d, box, int(r * 0.28), fill=CREAM)
    pip = int(S * 0.045)
    off = r * 0.52
    for cx, cy in ((-off, -off), (off, -off), (0, 0), (-off, off), (off, off)):
        x, y = S / 2 + cx, S / 2 + cy
        d.ellipse((x - pip, y - pip, x + pip, y + pip), fill=dark(base))


def planetmerge_planet(d, S, base):
    # ringed planet: sphere + bands + ring passing behind and in front
    r = int(S * 0.24)
    cx, cy = S / 2, S / 2 - S * 0.02
    ring_w = r * 2.05
    tilt = 0.30
    d.arc((cx - ring_w, cy - ring_w * tilt, cx + ring_w, cy + ring_w * tilt),
          0, 180, fill=light(base), width=int(S * 0.035))              # ring back
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=CREAM)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=dark(base, 0.35, 120),
              width=int(S * 0.012))
    d.arc((cx - r, cy - r * 0.15, cx + r, cy + r * 1.4), 200, 340,
          fill=light(base), width=int(S * 0.030))                      # bands
    d.arc((cx - r * 0.9, cy - r * 0.6, cx + r * 0.9, cy + r * 0.5), 210, 330,
          fill=light(base), width=int(S * 0.022))
    d.arc((cx - ring_w, cy - ring_w * tilt, cx + ring_w, cy + ring_w * tilt),
          180, 360, fill=CREAM, width=int(S * 0.035))                  # ring front
    d.ellipse((cx + ring_w * 0.55, cy - r * 1.5, cx + ring_w * 0.72,
               cy - r * 1.33), fill=CREAM)                             # moon


def chess_pawn(d, S, base):
    cx = S / 2
    top = S * 0.30
    d.ellipse((cx - S * 0.095, top, cx + S * 0.095, top + S * 0.19), fill=CREAM)
    d.polygon([(cx - S * 0.13, top + S * 0.17), (cx + S * 0.13, top + S * 0.17),
               (cx + S * 0.10, top + S * 0.21), (cx - S * 0.10, top + S * 0.21)],
              fill=CREAM)                                              # collar
    d.polygon([(cx - S * 0.055, top + S * 0.19), (cx + S * 0.055, top + S * 0.19),
               (cx + S * 0.115, S * 0.66), (cx - S * 0.115, S * 0.66)],
              fill=CREAM)                                              # body
    rrect(d, (cx - S * 0.17, S * 0.66, cx + S * 0.17, S * 0.72),
          int(S * 0.02), fill=CREAM)                                   # base
    for x in (0.16, 0.28, 0.40):                                       # board hint
        d.rectangle((cx + S * x, S * 0.76, cx + S * (x + 0.10), S * 0.88),
                    fill=light(base, 0.35, 150))


def bomb_relay(d, S, base):
    cx, cy = S / 2, S / 2 + S * 0.05
    r = S * 0.24
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=CREAM)
    d.ellipse((cx - r * 0.55, cy - r * 0.55, cx - r * 0.05, cy - r * 0.05),
              fill=light(base, 0.5, 110))                              # highlight
    rrect(d, (cx - S * 0.055, cy - r - S * 0.035, cx + S * 0.055, cy - r + S * 0.02),
          int(S * 0.012), fill=dark(base))                             # cap
    d.arc((cx + S * 0.01, cy - r - S * 0.16, cx + S * 0.17, cy - r + S * 0.02),
          200, 340, fill=dark(base), width=int(S * 0.028))             # fuse
    sx, sy = cx + S * 0.155, cy - r - S * 0.115                        # spark
    for ang in range(0, 360, 45):
        x2 = sx + math.cos(math.radians(ang)) * S * 0.045
        y2 = sy + math.sin(math.radians(ang)) * S * 0.045
        d.line((sx, sy, x2, y2), fill=CREAM, width=int(S * 0.014))
    d.ellipse((sx - S * 0.022, sy - S * 0.022, sx + S * 0.022, sy + S * 0.022),
              fill=CREAM)


def balloon(d, S, base, count=1):
    spots = ([(S / 2, S * 0.42, S * 0.24)] if count == 1 else
             [(S * 0.38, S * 0.40, S * 0.185), (S * 0.63, S * 0.47, S * 0.155)])
    for i, (cx, cy, r) in enumerate(spots):
        fill = CREAM if i == 0 else light(base, 0.3, 235)
        d.ellipse((cx - r, cy - r * 1.15, cx + r, cy + r * 1.15), fill=fill)
        d.polygon([(cx - S * 0.025, cy + r * 1.13), (cx + S * 0.025, cy + r * 1.13),
                   (cx, cy + r * 1.30)], fill=fill)                    # knot
        pts = [(cx + math.sin((y - cy) / 26) * 9, y) for y in
               range(int(cy + r * 1.30), int(cy + r * 1.30) + int(S * 0.16), 6)]
        d.line(pts, fill=CREAM, width=int(S * 0.010))                  # string
        d.arc((cx - r * 0.6, cy - r * 0.85, cx + r * 0.1, cy - r * 0.15),
              220, 320, fill=HALO, width=int(S * 0.014))               # sheen


def chicken_chaos(d, S, base):
    cx, cy = S / 2, S * 0.54
    r = S * 0.21
    d.ellipse((cx - r, cy - r * 0.85, cx + r, cy + r * 0.95), fill=CREAM)  # body
    hx, hy = cx + r * 0.55, cy - r * 0.75
    d.ellipse((hx - r * 0.5, hy - r * 0.5, hx + r * 0.5, hy + r * 0.5), fill=CREAM)
    d.polygon([(hx + r * 0.45, hy - r * 0.05), (hx + r * 0.45, hy + r * 0.20),
               (hx + r * 0.78, hy + r * 0.10)], fill=(242, 100, 60, 255))  # beak
    d.ellipse((hx + r * 0.05, hy - r * 0.15, hx + r * 0.18, hy - r * 0.02),
              fill=dark(base))                                          # eye
    d.arc((cx - r * 0.75, cy - r * 0.15, cx + r * 0.15, cy + r * 0.75),
          200, 300, fill=light(base, 0.35, 150), width=int(S * 0.020))  # wing
    for fx, fy, a in ((0.20, 0.26, 25), (0.80, 0.22, -30)):             # feathers
        x, y = S * fx, S * fy
        d.arc((x - S * 0.04, y - S * 0.03, x + S * 0.04, y + S * 0.03),
              a, 180 + a, fill=CREAM, width=int(S * 0.012))


def egg_rush(d, S, base):
    for cx, cy, rx, ry, fill in (
            (S * 0.32, S * 0.50, S * 0.10, S * 0.13, light(base, 0.3, 225)),
            (S * 0.68, S * 0.52, S * 0.10, S * 0.13, light(base, 0.3, 225)),
            (S * 0.50, S * 0.56, S * 0.135, S * 0.175, CREAM)):
        d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=fill)
    cx, cy, rx, ry = S * 0.50, S * 0.56, S * 0.135, S * 0.175
    d.arc((cx - rx * 0.7, cy - ry * 0.8, cx + rx * 0.1, cy + ry * 0.1),
          220, 310, fill=HALO, width=int(S * 0.014))
    d.line([(cx - rx * 0.35, cy - ry * 0.25), (cx - rx * 0.1, cy - ry * 0.05),
            (cx - rx * 0.25, cy + ry * 0.15), (cx + rx * 0.05, cy + ry * 0.35)],
           fill=dark(base), width=int(S * 0.012))                       # crack


def memory_grab(d, S, base):
    # a pair of cards: face-down grid pattern + face-up question mark
    w, h = S * 0.22, S * 0.30
    rrect(d, (S * 0.24, S * 0.34, S * 0.24 + w, S * 0.34 + h),
          int(S * 0.03), fill=light(base, 0.3, 225))
    gx, gy = S * 0.24 + w * 0.28, S * 0.34 + h * 0.26
    for i in range(2):
        for j in range(2):
            d.ellipse((gx + i * w * 0.32 - S * 0.018,
                       gy + j * h * 0.30 - S * 0.018,
                       gx + i * w * 0.32 + S * 0.018,
                       gy + j * h * 0.30 + S * 0.018), fill=dark(base, 0.3, 160))
    rrect(d, (S * 0.52, S * 0.36, S * 0.52 + w, S * 0.36 + h),
          int(S * 0.03), fill=CREAM)
    d.text((S * 0.52 + w / 2, S * 0.36 + h / 2), '?', fill=dark(base),
           anchor='mm', font_size=int(S * 0.19))


def pen_fight(d, S, base):
    # a pen drawn at 45 degrees: rotated body + nib + click button
    ang = math.radians(-45)
    cx, cy = S / 2, S / 2

    def rot(x, y):
        dx, dy = x - cx, y - cy
        return (cx + dx * math.cos(ang) - dy * math.sin(ang),
                cy + dx * math.sin(ang) + dy * math.cos(ang))

    hw, ln = S * 0.055, S * 0.30
    body = [rot(cx - hw, cy - ln), rot(cx + hw, cy - ln),
            rot(cx + hw, cy + ln), rot(cx - hw, cy + ln)]
    d.polygon(body, fill=CREAM)
    nib = [rot(cx - hw, cy + ln), rot(cx + hw, cy + ln), rot(cx, cy + ln * 1.32)]
    d.polygon(nib, fill=dark(base))
    tip = [rot(cx - hw * 0.4, cy + ln * 1.22), rot(cx + hw * 0.4, cy + ln * 1.22),
           rot(cx, cy + ln * 1.32)]
    d.polygon(tip, fill=CREAM)
    rrect(d, (cx - hw, cy - ln - S * 0.02, cx + hw, cy - ln + S * 0.02),
          2, fill=dark(base))
    d.line(rot(cx - hw * 0.5, cy - ln * 0.55) + rot(cx - hw * 0.5, cy + ln * 0.6),
           fill=light(base, 0.35, 150), width=int(S * 0.012))


def snakes_ladders(d, S, base):
    # ladder rails + rungs on the left, a snake winding on the right
    lx = S * 0.32
    for dx in (-S * 0.055, S * 0.055):
        d.line((lx + dx, S * 0.24, lx + dx + S * 0.05, S * 0.78),
               fill=CREAM, width=int(S * 0.020))
    for t in (0.1, 0.3, 0.5, 0.7, 0.9):
        y = S * (0.24 + t * 0.54)
        x = lx + S * 0.05 * t
        d.line((x - S * 0.055 + S * 0.05 * t, y, x + S * 0.055 + S * 0.05 * t, y),
               fill=CREAM, width=int(S * 0.016))
    pts = [(S * (0.52 + 0.14 * math.sin(t * 5.2)), S * (0.26 + t * 0.42))
           for t in [i / 40.0 for i in range(41)]]
    d.line(pts, fill=CREAM, width=int(S * 0.026), joint='curve')
    hx, hy = pts[-1]
    d.ellipse((hx - S * 0.030, hy - S * 0.030, hx + S * 0.030, hy + S * 0.030),
              fill=CREAM)
    d.ellipse((hx + S * 0.008, hy - S * 0.012, hx + S * 0.018, hy - S * 0.002),
              fill=dark(base))


def tic_tac_toe(d, S, base):
    # the grid, one X and one O already played
    w = int(S * 0.020)
    for t in (0.36, 0.64):
        d.line((S * t, S * 0.22, S * t, S * 0.78), fill=CREAM, width=w)
        d.line((S * 0.22, S * t, S * 0.78, S * t), fill=CREAM, width=w)
    ox, oy, r = S * 0.29, S * 0.29, S * 0.075
    d.ellipse((ox - r, oy - r, ox + r, oy + r), outline=CREAM, width=w)
    xx, xy, rr = S * 0.71, S * 0.71, S * 0.055
    d.line((xx - rr, xy - rr, xx + rr, xy + rr), fill=CREAM, width=w)
    d.line((xx - rr, xy + rr, xx + rr, xy - rr), fill=CREAM, width=w)


def connect_four(d, S, base):
    # board frame with holes; some discs already dropped
    rrect(d, (S * 0.20, S * 0.24, S * 0.80, S * 0.78), int(S * 0.04),
          fill=light(base, 0.25, 200))
    step = (S * 0.80 - S * 0.20 - S * 0.10) / 3
    for i in range(4):
        for j in range(3):
            cx = S * 0.25 + i * step
            cy = S * 0.31 + j * step
            fill = (CREAM if (i + j) % 2 == 0 and (i, j) != (3, 2)
                    else dark(base, 0.35, 120))
            d.ellipse((cx - S * 0.038, cy - S * 0.038,
                       cx + S * 0.038, cy + S * 0.038), fill=fill)


def dots_and_boxes(d, S, base):
    # 3x3 dots, some connected, one box claimed
    xs = [S * 0.28, S * 0.50, S * 0.72]
    w = int(S * 0.016)
    for a, b in (((0, 0), (1, 0)), ((1, 0), (2, 0)), ((0, 0), (0, 1)),
                 ((1, 0), (1, 1)), ((2, 0), (2, 1)), ((0, 1), (1, 1)),
                 ((1, 1), (2, 1))):
        d.line((xs[a[0]], xs[a[1]], xs[b[0]], xs[b[1]]), fill=CREAM, width=w)
    d.rectangle((xs[0], xs[0], xs[1], xs[1]), fill=light(base, 0.35, 170))
    for x in xs:
        for y in xs:
            d.ellipse((x - S * 0.022, y - S * 0.022, x + S * 0.022, y + S * 0.022),
                      fill=CREAM)


def daadi(d, S, base):
    # the classic mill board: three nested squares + spokes + stones
    o = S * 0.24
    m = S / 2
    w = int(S * 0.016)
    for k in (0.0, 0.115, 0.23):
        d.rectangle((o + S * k, o + S * k, S - o - S * k, S - o - S * k),
                    outline=CREAM, width=w)
    for x, y in ((m, o), (m, S - o), (o, m), (S - o, m)):
        d.line((m + (x - m) * 0.22 if x != m else m,
                m + (y - m) * 0.22 if y != m else m, x, y),
               fill=CREAM, width=w)
    for x, y in ((o, o), (S - o, o), (o, S - o), (S - o, S - o), (m, m),
                 (m, o), (m, S - o), (o, m), (S - o, m)):
        d.ellipse((x - S * 0.026, y - S * 0.026, x + S * 0.026, y + S * 0.026),
                  fill=CREAM)
    d.ellipse((S - o - S * 0.026, S - o - S * 0.026,
               S - o + S * 0.026, S - o + S * 0.026), fill=dark(base))


def checkers_gould(d, S, base):
    # a crowned draughts man on a board square
    rrect(d, (S * 0.20, S * 0.20, S * 0.80, S * 0.80), int(S * 0.03),
          fill=light(base, 0.25, 140))
    cx = S / 2
    for i, (rx, ry) in enumerate(((0.20, 0.055), (0.155, 0.050), (0.115, 0.045))):
        cy = S * 0.50 + i * S * 0.055
        d.ellipse((cx - S * rx, cy - S * ry, cx + S * rx, cy + S * ry),
                  fill=CREAM)
    for k in (-1, 0, 1):                       # crown: three little triangles
        x = cx + k * S * 0.075
        d.polygon([(x - S * 0.022, S * 0.44), (x + S * 0.022, S * 0.44),
                   (x, S * 0.385)], fill=dark(base))


def board_game(d, S, base):
    # a winding game path: board, dashed route, start dot and finish square
    rrect(d, (S * 0.18, S * 0.22, S * 0.82, S * 0.80), int(S * 0.05),
          fill=light(base, 0.25, 170))
    pts = [(S * 0.26, S * 0.68), (S * 0.44, S * 0.68), (S * 0.44, S * 0.50),
           (S * 0.28, S * 0.50), (S * 0.28, S * 0.34), (S * 0.56, S * 0.34),
           (S * 0.56, S * 0.52), (S * 0.72, S * 0.52), (S * 0.72, S * 0.32)]
    for a, b in zip(pts, pts[1:]):
        ax, ay = a
        bx, by = b
        ln = max(abs(bx - ax), abs(by - ay))
        n = max(int(ln / (S * 0.045)), 2)
        for i in range(n + 1):
            if i % 2 == 0:
                t = i / n
                x, y = ax + (bx - ax) * t, ay + (by - ay) * t
                d.ellipse((x - S * 0.012, y - S * 0.012,
                           x + S * 0.012, y + S * 0.012), fill=CREAM)
    sx, sy = pts[0]
    d.ellipse((sx - S * 0.030, sy - S * 0.030, sx + S * 0.030, sy + S * 0.030),
              fill=CREAM)
    fx, fy = pts[-1]
    rrect(d, (fx - S * 0.030, fy - S * 0.030, fx + S * 0.030, fy + S * 0.030),
          int(S * 0.010), fill=CREAM)


COMPOSITIONS = {
    'ludo': ludo_die,
    'planetmerge': planetmerge_planet,
    'chess': chess_pawn,
    'checkers-gould': checkers_gould,
    'bomb-relay': bomb_relay,
    'last-balloon': lambda d, S, b: balloon(d, S, b, count=1),
    'balloon-battle': lambda d, S, b: balloon(d, S, b, count=2),
    'chicken-chaos': chicken_chaos,
    'egg-rush': egg_rush,
    'memory-grab': memory_grab,
    'pen-fight': pen_fight,
    'snakes-ladders': snakes_ladders,
    'tic-tac-toe': tic_tac_toe,
    'connect-four': connect_four,
    'dots-and-boxes': dots_and_boxes,
    'daadi': daadi,
    'board-game': board_game,
}


def render_tile(colour_hex, draw_fn, out_path):
    """Same stage dressing as _gen_tiles.py, but the glyph is DRAWN, not a font."""
    base = G.hex_rgb(colour_hex)
    top = G.mix(base, (255, 255, 255), 0.20)
    bottom = G.mix(base, (0, 0, 0), 0.22)
    S = G.SIZE

    canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    body = G.gradient(S, top, bottom).convert('RGBA')

    dots = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dots)
    for gy in range(17, S, 34):
        for gx in range(17, S, 34):
            dd.ellipse((gx - 2, gy - 2, gx + 2, gy + 2), fill=(255, 255, 255, 18))
    body = Image.alpha_composite(body, dots)

    radius = int(S * 0.24)
    canvas.paste(body, (0, 0), G.rounded_mask(S, radius))
    ring = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(ring).rounded_rectangle(
        (6, 6, S - 7, S - 7), radius=radius - 5,
        outline=(255, 255, 255, 46), width=max(2, S // 190))
    canvas = Image.alpha_composite(canvas, ring)

    # the drawing, with a soft shadow under it
    icon = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(icon), S, base)
    shadow = icon.filter(ImageFilter.GaussianBlur(S * 0.018))
    shadow = Image.composite(Image.new('RGBA', (S, S), (0, 0, 0, 120)), shadow,
                             shadow.split()[3])
    canvas.alpha_composite(shadow, dest=(0, int(S * 0.022)))
    canvas.alpha_composite(icon)

    final = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    final.paste(canvas, (0, 0), G.rounded_mask(S, radius))
    final.save(out_path, optimize=True)
    return os.path.getsize(out_path)


def all_targets():
    """(game_id, title, tileColor) for every game we know about."""
    found = {}
    if os.path.isdir(G.ASSETS):
        for name in sorted(os.listdir(G.ASSETS)):
            man = G.parse_manifest(os.path.join(G.ASSETS, name, 'index.html'))
            if man.get('id') and man.get('tileColor'):
                found[man['id']] = (man['id'],
                                    man.get('title') or man['id'],
                                    man['tileColor'])
    for gid, title, colour in G.FALLBACKS.values():
        found.setdefault(gid, (gid, title, colour))
    return found


def main(argv):
    G.os.makedirs(G.OUTDIR, exist_ok=True)
    targets = all_targets()
    only = [a for a in argv if not a.startswith('-')]
    if only:
        targets = {k: v for k, v in targets.items() if k in only}
    rows = []
    for gid in sorted(targets):
        _gid, title, colour = targets[gid]
        fn = COMPOSITIONS.get(gid)
        if fn is None:
            print('SKIP (no composition yet): %s' % gid)
            continue
        out = os.path.join(G.OUTDIR, '%s.png' % G.res_name(gid))
        size = render_tile(colour, fn, out)
        rows.append('%-18s %-16s %5d KB  %s' % (
            gid, title, size // 1024, os.path.relpath(out, G.ROOT)))
    for r in rows:
        print(r)
    print('%d tile(s) -> %s' % (len(rows), os.path.relpath(G.OUTDIR, G.ROOT)))


if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
    main(sys.argv[1:])
