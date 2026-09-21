"""Generates the square tile artwork for every game, FROM the game file itself.

This is the shell's tile-image layer. It reads each game's STUDIO_GAME_MANIFEST
(id, title, tileColor) and turns it into a ready-to-place tile image, so a new
game needs no hand-made art to look like it belongs in the grid.

What it produces
    app/src/main/res/drawable-nodpi/tile_<id>.png   (512x512 emblem)

How the shell uses it
    GameAdapter looks up "tile_<gameId>" by name at bind time. If the file
    exists the emblem is shown; if it does not, the tile falls back to the flat
    manifest colour. So the app NEVER breaks when tiles have not been generated
    -- which is why these PNGs are gitignored, like the .ogg audio.

Design language (matches STYLE.md, "flat pop" + the studio palette)
    * rounded square, radius 24% -- echoes the shell's card radius
    * vertical gradient: colour lightened 20% at the top, darkened 20% at the
      bottom, so a flat manifest colour becomes a lit surface
    * a faint dot grid over the top (the same texture the shell background uses)
    * a thinned inner keyline near the edge, like our chunky borders
    * one big glyph, centred, with a soft drop shadow

Glyph resolution order
    1. "tileGlyph: <emoji or letter>" in the game's manifest, if present
    2. the GLYPHS table below, keyed by game id
    3. a monogram from the title's initials

Usage
    python _gen_tiles.py              # bundled games in assets/games/*
    python _gen_tiles.py --all        # also the playable games not bundled yet
    python _gen_tiles.py Chess.html   # one game file
"""
import io
import os
import re
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Windows consoles default to cp1252, which cannot print an emoji in the summary
# table. Force UTF-8 so the report never crashes on a glyph.
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

SIZE = 512
ROOT = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(ROOT, 'app', 'src', 'main', 'assets', 'games')
OUTDIR = os.path.join(ROOT, 'app', 'src', 'main', 'res', 'drawable-nodpi')

EMOJI_FONT = r'C:\Windows\Fonts\seguiemj.ttf'
SYMBOL_FONT = r'C:\Windows\Fonts\seguisym.ttf'
BOLD_FONTS = (r'C:\Windows\Fonts\segoeuib.ttf', r'C:\Windows\Fonts\arialbd.ttf',
              r'C:\Windows\Fonts\bahnschrift.ttf')

# Emoji / glyph per game id. Any emoji here is COLR-rendered in colour by Pillow.
GLYPHS = {
    'ludo': '\U0001F3B2',            # dice
    'planetmerge': '\U0001FA90',     # ringed planet
    'chess': '\u265E',               # black knight
    'checkers-gould': '\u26C0',      # white draughts man
    'bomb-relay': '\U0001F4A3',      # bomb
    'last-balloon': '\U0001F388',    # balloon
    'balloon-battle': '\U0001F388',
    'chicken-chaos': '\U0001F414',   # chicken
    'egg-rush': '\U0001F95A',        # egg
    'memory-grab': '\U0001F9E0',     # brain
    'pen-fight': '\U0001F58A',       # pen
    'snakes-ladders': '\U0001F40D',  # snake
    'tic-tac-toe': '\u274C',         # cross mark
    'connect-four': '\U0001F535',    # blue circle
    'dots-and-boxes': '\u25AA',      # small square
    'daadi': '\u26AB',               # black circle (stone)
    'board-game': '\U0001F3E0',      # house (property game)
}

# Playable games that are not bundled in the shell yet -- no manifest to read,
# so this table carries the tile values we intend to give them (see GAME_IDEAS.md).
FALLBACKS = {
    'Chess.html': ('chess', 'Chess', '#37474F'),
    'BombRelay.html': ('bomb-relay', 'Bomb Relay', '#E2483F'),
    'LastBaloon.html': ('last-balloon', 'Last Balloon', '#2D9CDB'),
    'PenFight.html': ('pen-fight', 'Pen Fight', '#2F63CF'),
    'EggRush.html': ('egg-rush', 'Egg Rush', '#F2B441'),
    'MemeoryGrab.html': ('memory-grab', 'Memory Grab', '#8E6FD8'),
    'balloonFight.html': ('balloon-battle', 'Balloon Battle', '#F2724B'),
    'Chicken Chaos.html': ('chicken-chaos', 'Chicken Chaos', '#6BCB4A'),
}


def parse_manifest(path):
    """Pull id/title/tileColor/tileGlyph out of a game file. {} when absent."""
    try:
        s = io.open(path, encoding='utf-8', errors='ignore').read()
    except OSError:
        return {}
    m = re.search(r'STUDIO_GAME_MANIFEST(.*?)\*/', s, re.S)
    if not m:
        return {}
    out = {}
    for line in m.group(1).splitlines():
        line = line.strip().lstrip('*').strip()
        if ':' not in line:
            continue
        k, v = line.split(':', 1)
        out[k.strip()] = v.strip()
    return out


def hex_rgb(value, default='#888888'):
    v = (value or default).strip().lstrip('#')
    if len(v) == 3:
        v = ''.join(c * 2 for c in v)
    try:
        return tuple(int(v[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return hex_rgb(default)


def mix(c, other, amount):
    return tuple(round(c[i] + (other[i] - c[i]) * amount) for i in range(3))


def covers(font, ch):
    """True when the font really has a glyph for `ch`.

    Renders the character and compares it with a private-use codepoint that no
    font defines. Identical bitmaps mean we were handed a .notdef box, which is
    how the chess knight silently became an empty rectangle before.
    """
    try:
        a = font.getmask(ch)
        b = font.getmask('\uE000')
        return (a.size, bytes(a)) != (b.size, bytes(b))
    except Exception:
        return False


def monogram(title):
    words = [w for w in re.split(r'[^A-Za-z0-9]+', title or '') if w]
    if not words:
        return '?'
    if len(words) == 1:
        return words[0][:2].upper()
    return (words[0][0] + words[1][0]).upper()


def res_name(game_id):
    """Android resource names only allow a-z, 0-9 and _ -- so bomb-relay
    becomes tile_bomb_relay. GameAdapter uses the exact same rule when it
    looks the image up by name, which keeps the two halves in lockstep."""
    return 'tile_' + re.sub(r'[^a-z0-9]+', '_', game_id.strip().lower()).strip('_')


def rounded_mask(size, radius):
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def gradient(size, top, bottom):
    img = Image.new('RGB', (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        d.line([(0, y), (size, y)], fill=mix(top, bottom, y / (size - 1)))
    return img


def render(color_hex, glyph, out_path, title=''):
    base = hex_rgb(color_hex)
    top = mix(base, (255, 255, 255), 0.20)
    bottom = mix(base, (0, 0, 0), 0.22)

    canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    body = gradient(SIZE, top, bottom).convert('RGBA')

    # faint dot grid, same flavour as the shell background texture
    dots = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dots)
    step = 34
    for gy in range(step // 2, SIZE, step):
        for gx in range(step // 2, SIZE, step):
            dd.ellipse((gx - 2, gy - 2, gx + 2, gy + 2), fill=(255, 255, 255, 18))
    body = Image.alpha_composite(body, dots)

    radius = int(SIZE * 0.24)
    canvas.paste(body, (0, 0), rounded_mask(SIZE, radius))

    # inner keyline
    ring = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(ring).rounded_rectangle(
        (6, 6, SIZE - 7, SIZE - 7), radius=radius - 5,
        outline=(255, 255, 255, 46), width=max(2, SIZE // 190))
    canvas = Image.alpha_composite(canvas, ring)

    # glyph layer, then a soft shadow under it
    glyph_layer = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glyph_layer)
    drawn = False
    size = int(SIZE * 0.52)
    if glyph:
        # colour emoji first, then the monochrome symbol font (chess pieces,
        # draughts men, geometric marks), then plain bold text.
        chain = ((EMOJI_FONT, True), (SYMBOL_FONT, False), (BOLD_FONTS[0], False))
        for path, colour_ok in chain:
            if not os.path.exists(path):
                continue
            try:
                font = ImageFont.truetype(path, size)
            except OSError:
                continue
            if not covers(font, glyph):
                continue
            try:
                gd.text((SIZE / 2, SIZE / 2 - SIZE * 0.02), glyph, font=font,
                        anchor='mm', fill=(255, 255, 255, 240),
                        embedded_color=colour_ok)
            except Exception:
                continue
            drawn = True
            break
    if not drawn:
        font = ImageFont.truetype(
            next(f for f in BOLD_FONTS if os.path.exists(f)), int(SIZE * 0.46))
        gd.text((SIZE / 2, SIZE / 2 - SIZE * 0.02), monogram(title), font=font,
                anchor='mm', fill=(255, 255, 255, 240))
        drawn = True

    shadow = glyph_layer.filter(ImageFilter.GaussianBlur(SIZE * 0.018))
    shadow = Image.composite(
        Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 120)), shadow,
        shadow.split()[3])
    canvas = Image.alpha_composite(canvas, Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0)))
    canvas.alpha_composite(shadow, dest=(0, int(SIZE * 0.022)))
    canvas.alpha_composite(glyph_layer)

    # a soft top-light sheen so the surface reads as lit
    sheen = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(sheen).ellipse(
        (-SIZE * 0.35, -SIZE * 0.75, SIZE * 1.35, SIZE * 0.42),
        fill=(255, 255, 255, 26))
    canvas = Image.alpha_composite(canvas, sheen)
    canvas = Image.alpha_composite(
        Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0)), canvas)

    # keep the rounded silhouette after compositing
    final = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    final.paste(canvas, (0, 0), rounded_mask(SIZE, radius))
    final.save(out_path, optimize=True)
    return os.path.getsize(out_path)


def targets(argv):
    files = [a for a in argv if not a.startswith('--')]
    if files:
        return [(p, None) for p in files]
    found = []
    if os.path.isdir(ASSETS):
        for name in sorted(os.listdir(ASSETS)):
            page = os.path.join(ASSETS, name, 'index.html')
            if os.path.exists(page):
                found.append((page, None))
    if '--all' in argv or not found:
        for name, (gid, title, colour) in FALLBACKS.items():
            path = os.path.join(ROOT, name)
            if os.path.exists(path):
                found.append((path, (gid, title, colour)))
    return found


def main(argv):
    os.makedirs(OUTDIR, exist_ok=True)
    rows = []
    for path, override in targets(argv):
        man = parse_manifest(path)
        gid = man.get('id') or (override[0] if override else None)
        title = man.get('title') or (override[1] if override else None)
        colour = man.get('tileColor') or (override[2] if override else None)
        if not gid or not colour:
            print('SKIP (no manifest / no tileColor): %s' % os.path.basename(path))
            continue
        title = title or gid.replace('-', ' ').title()
        glyph = man.get('tileGlyph') or GLYPHS.get(gid) or ''
        out = os.path.join(OUTDIR, '%s.png' % res_name(gid))
        size = render(colour, glyph, out, title)
        rows.append((gid, title, colour, glyph or '(%s)' % monogram(title),
                     '%d KB' % round(size / 1024)))
    print('%-18s %-16s %-9s %-6s %s' % ('ID', 'TITLE', 'COLOUR', 'GLYPH', 'SIZE'))
    for r in rows:
        print('%-18s %-16s %-9s %-6s %s' % r)
    print('%d tile(s) -> %s' % (len(rows), os.path.relpath(OUTDIR, ROOT)))


if __name__ == '__main__':
    main(sys.argv[1:])

