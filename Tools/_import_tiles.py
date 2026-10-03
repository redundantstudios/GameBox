"""Imports the real tile artwork from sources/Shell Art into the Android
resources, replacing the generated emblems for the six newly integrated games.

The generated emblems are placeholders so a new game never looks broken; where
finished art exists it is always the better tile. The import is a one-off (it
needs the source art), and the result is committed like the generated PNGs.

    python _import_tiles.py
"""
import os
import re

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, 'sources', 'Shell Art')
OUTDIR = os.path.join(ROOT, 'app', 'src', 'main', 'res', 'drawable-nodpi')

SIZE = 512


def res_name(game_id):
    '''Android resource names allow only a-z, 0-9 and _ - same rule as
    _gen_tiles.py and GameAdapter, so the file name matches what is looked up.'''
    return 'tile_' + re.sub(r'[^a-z0-9]+', '_', game_id.strip().lower()).strip('_')

# game id -> source artwork file in sources/Shell Art
TILES = {
    'colour-rush':        'colour_rush_tile_img.png',
    'midnight-overdrive': 'MidNight_Overdrive_tile_img.png',
    'sheepdog-trials':    'sheep_dog_tile_img.png',
    'pool-8ball':         '8-Ball-Pool_tile_imag',
    'ember':              'Ember_tile_img.jpeg',
    'orrery':             'orrery_tile_img.jpeg',
    'echo':               'echo_tile_img.png',
    'magnet-pull':        'magnet_pull_tile_img.png',
    'kiro':               'kiro_tile_img.jpeg',
    'root-io':            'root.io_tile_img.jpeg',
}


def square(im):
    """Centre-crops to a square, scales to SIZE, and quantises.

    The source art is large detailed illustration; as a straight PNG it landed
    around 350 KB per tile, which is a lot of APK for a 512px emblem. The tiles
    are displayed small in a grid, so an adaptive 256-colour palette keeps them
    visually identical at a fraction of the size.
    """
    w, h = im.size
    side = min(w, h)
    im = im.crop(((w - side) // 2, (h - side) // 2,
                  (w - side) // 2 + side, (h - side) // 2 + side))
    im = im.convert('RGB').resize((SIZE, SIZE), Image.LANCZOS)
    return im.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.Dither.NONE)


def main():
    for gid, art in TILES.items():
        src = os.path.join(ART, art)
        if not os.path.exists(src):
            print('SKIP  %-20s no art: %s' % (gid, art))
            continue
        # PNG only, and the file name must be a valid Android resource name
        # (a-z, 0-9, _ only) - GameAdapter applies the same rule when it looks
        # the tile up, so the two halves stay in lockstep.
        out = os.path.join(OUTDIR, '%s.png' % res_name(gid))
        im = Image.open(src)
        # PNG only: a sibling file of the same base name (tile_x.jpg) next to
        # tile_x.png is a duplicate-resource build error, so imported art is
        # written as the .png and any stale sibling is removed.
        for ext in ('.jpg', '.jpeg', '.webp'):
            stale = out[:-4] + ext
            if os.path.exists(stale):
                os.remove(stale)
                print('      removed duplicate %s' % os.path.basename(stale))
        square(im).save(out, 'PNG', optimize=True)
        print('OK    %-20s %-34s %d KB' % (gid, art, round(os.path.getsize(out) / 1024)))


if __name__ == '__main__':
    main()
