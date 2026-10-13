import os
import glob
import shutil
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, 'sources', 'Shell Art')
DRAW = os.path.join(ROOT, 'app', 'src', 'main', 'res', 'drawable')
NOPI = os.path.join(ROOT, 'app', 'src', 'main', 'res', 'drawable-nodpi')

# Art file -> resource name (tile_<id> with dashes -> underscores).
MAP = {
    '8-Ball-Pool_tile_imag': 'pool_8ball',
    'balloon_battle_tile_img.png': 'balloon_battle',
    'bomb_relay_tile_img.png': 'bomb_relay',
    'carrom_tile_img.png': 'carroms',
    'checkers_tile_img.png': 'checkers',
    'chess_tile_img.png': 'chess',
    'chicken_chaos_tile.png': 'chicken_chaos',
    'chinese_chickers_tile_img.jpeg': 'chinese_checkers',
    'colour_rush_tile_img.png': 'colour_rush',
    'connect_4_tile_img.png': 'connect_four',
    'egg_rush_tile.png': 'egg_rush',
    'Ember_tile_img.jpeg': 'ember',
    'kiro_tile_img.jpeg': 'kiro',
    'knot_away_tile_img.jpeg': 'knot_away',
    'last_balloon_tile_img.jpeg': 'last_balloon',
    'ludo_tile_img.png': 'ludo',
    'magnet_pull_tile_img.png': 'magnet_pull',
    'memory_grab_tile_img.png': 'memory_grab',
    'MidNight_Overdrive_tile_img.png': 'midnight_overdrive',
    'mimic_tile_img.png': 'mimic',
    'orrery_tile_img.jpeg': 'orrery',
    'planet_merge_tile.png': 'planetmerge',
    'root.io_tile_img.jpeg': 'root_io',
    'sheep_dog_tile_img.png': 'sheepdog_trials',
    'truth_or_dare_tile_img.png': 'truth_or_dare',
}

SIZE = 512  # matches Tools/_gen_tiles.py SIZE - the previous shipped tiles

# Clear the previous tile sets so we rebuild from source cleanly.
for d in (DRAW, NOPI):
    for f in glob.glob(os.path.join(d, 'tile_*')):
        os.remove(f)

os.makedirs(NOPI, exist_ok=True)

total = 0
for src_name, res in sorted(MAP.items(), key=lambda kv: kv[1]):
    src = os.path.join(ART, src_name)
    if not os.path.exists(src):
        print('MISS ' + src_name)
        continue
    dst = os.path.join(NOPI, 'tile_' + res + '.jpg')
    with Image.open(src) as im:
        im.load()
        if im.mode not in ('RGB',):
            im = im.convert('RGB')
        # Square art already; resize to the previous shipped tile size.
        im = im.resize((SIZE, SIZE), Image.LANCZOS)
        im.save(dst, 'JPEG', quality=90, optimize=True, progressive=True)
    kb = os.path.getsize(dst) / 1024.0
    total += kb
    print('  %-24s %s  %6.0f KB' % ('tile_' + res, '%dx%d' % (SIZE, SIZE), kb))

print('\n%d tiles -> %s  (%.1f MB total)' % (len(MAP), NOPI, total / 1024.0))