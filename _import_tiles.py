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
SRC = os.path.join(ROOT, "sources")
OUT = os.path.join(ROOT, "app", "src", "main", "res", "drawable-nodpi")
SIZE = 512

# source file name (in sources/) -> resource name (tile_<res>)
TILES = {
    "ludo_tile_img.png": "ludo",
    "chess_tile_img.png": "chess",
    "planet_merge_tile.png": "planetmerge",
    "chicken_chaos_tile.png": "chicken_chaos",
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
