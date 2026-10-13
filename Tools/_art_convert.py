import json
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
queue_path = os.path.join(ROOT, 'Tools', '_art_convert_queue.json')

with open(queue_path) as fh:
    queue = json.load(fh)

for src, dst, name in queue:
    # Two of the art files are AVIF wearing a .png name. AAPT2 will not accept
    # AVIF as a drawable, so re-encode. JPEG q=92 keeps a 1254px tile visually
    # identical while avoiding the multi-megabyte balloon a PNG would give here.
    with Image.open(src) as im:
        im.load()
        if im.mode not in ('RGB', 'L'):
            im = im.convert('RGB')
        im.save(dst, 'JPEG', quality=92, optimize=True, progressive=True)
    kb = os.path.getsize(dst) / 1024.0
    print('  %-30s -> %s  %6.0f KB  (AVIF re-encoded)'
          % (name, os.path.basename(dst), kb))

os.remove(queue_path)
print('%d converted' % len(queue))