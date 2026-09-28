"""Imports the director's finished tile artwork into the shell.

Tile images are now delivered as finished art (see sources/*.png). This script
centre-crops each one to a square, resizes it to a fixed 512 px and writes it
into drawable-nodpi under the name GameAdapter looks up by game id
(tile_<id with dashes as underscores>).

Sources are stored as PNG (lossless master); the app ships JPEG tiles, which
compress the same art to a fraction of the size with no visible loss - the
tiles are opaque, so JPEG needs no alpha and keeps the APK small.

    python _import_tiles.py            # every tile in the table
    python _import_tiles.py ludo chess # only these
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
# This script lives in Tools/, but sources/ and app/ are siblings of Tools at the
# repo root - so ROOT has to walk up one level or every lookup resolves inside
# Tools/ and silently reports MISSING for art that is actually there.
REPO = os.path.dirname(ROOT)
# The finished tile art lives in "sources/Shell Art" (the folder name has a
# space in it). sources/ is its parent and also holds a few older copies, so
# prefer Shell Art and fall back to sources/ per file.
SRC = os.path.join(REPO, "sources", "Shell Art")
SRC_FALLBACK = os.path.join(REPO, "sources")
OUT = os.path.join(REPO, "app", "src", "main", "res", "drawable-nodpi")
SIZE = 512

# source file name (in sources/) -> resource name (tile_<res>)
# Kept in step with the games bundled in app/src/main/assets/games. Anything
# missing here silently falls back to a flat manifest colour, so a new game
# needs a line added or its tile looks unfinished on the grid.
TILES = {
    "ludo_tile_img.png": "ludo",
    "chess_tile_img.png": "chess",
    "planet_merge_tile.png": "planetmerge",
    "chicken_chaos_tile.png": "chicken_chaos",
    "egg_rush_tile.png": "egg_rush",
    "checkers_tile_img.png": "checkers",
    "memory_grab_tile_img.png": "memory_grab",
    "bomb_relay_tile_img.png": "bomb_relay",
    "balloon_battle_tile_img.png": "balloon_battle",
    "carrom_tile_img.png": "carroms",
}


def square(img):
    """Centre-crop to a square the size of the shorter edge."""
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return img.crop((left, top, left + side, top + side))


def main(argv):
    wanted = {a.lower() for a in argv[1:]}
    total = 0
    n = 0
    for src_name, res in TILES.items():
        if wanted and res not in wanted:
            continue
        path = os.path.join(SRC, src_name)
        if not os.path.exists(path):
            # older copies of a few tiles still sit directly in sources/
            alt = os.path.join(SRC_FALLBACK, src_name)
            if os.path.exists(alt):
                path = alt
            else:
                print("MISSING source:", src_name)
                continue
        img = Image.open(path)
        img = img.convert("RGB")
        img = square(img).resize((SIZE, SIZE), Image.LANCZOS)
        jpg = os.path.join(OUT, "tile_%s.jpg" % res)
        img.save(jpg, "JPEG", quality=88, optimize=True, progressive=True)
        size = os.path.getsize(jpg)
        total += size
        n += 1
        print("wrote tile_%s.jpg  %dx%d  %.0f KB" % (res, img.size[0], img.size[1], size / 1024.0))
    # Remove the older PNG twins so the APK never ships both.
    for res in TILES.values():
        old = os.path.join(OUT, "tile_%s.png" % res)
        if os.path.exists(old):
            os.remove(old)
            print("removed tile_%s.png" % res)
    if n:
        print("total %.0f KB across %d tiles" % (total / 1024.0, n))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
