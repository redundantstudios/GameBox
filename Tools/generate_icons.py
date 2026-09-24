import os
from PIL import Image

# Brand asset generator - SPLASH ONLY.
#
# The LAUNCHER ICONS (mipmap-* + the adaptive-icon foreground) are built by
# Tools/_gen_launcher_icons.ps1 from sources/shellDesignReferences/app logo.jpeg -
# the app logo. They used to be built here out of brand/red-studios-logo.jpg, and
# re-running this file would have silently put the studio mark back on the home
# screen, so that job moved out. The splash keeps the studio mark on purpose:
# brand first, then the app.
#
# Run from anywhere:
#   python Tools/generate_icons.py

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def generate_splash(source_path='brand/red-studios-logo.jpg'):
    src = os.path.join(ROOT, source_path)
    if not os.path.exists(src):
        print("Error: %s not found" % src)
        return

    # The brand plate is a logo on a dark background: key out the near-black, then
    # pad to a safe circle so Android 12+'s round mask never clips the R.
    img = Image.open(src).convert('RGBA')
    flat = img.get_flattened_data() if hasattr(img, 'get_flattened_data') else img.getdata()
    data = [px if any(c >= 40 for c in px[:3]) else (0, 0, 0, 0) for px in flat]
    img.putdata(data)

    canvas = 1152
    inner = int(canvas * 0.66)
    aspect = img.height / img.width
    if aspect >= 1:
        img = img.resize((int(inner / aspect), inner), Image.Resampling.LANCZOS)
    else:
        img = img.resize((inner, int(inner * aspect)), Image.Resampling.LANCZOS)

    splash = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
    splash.paste(img, ((canvas - img.width) // 2, (canvas - img.height) // 2), img)

    out = os.path.join(ROOT, 'app', 'src', 'main', 'res', 'drawable',
                       'splash_logo.png')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    splash.save(out)
    print("splash_logo.png regenerated:", splash.size)


if __name__ == "__main__":
    generate_splash()
