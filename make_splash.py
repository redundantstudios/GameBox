# One-off: build padded splash logo from brand image (matches generate_icons.py section 4)
import os
from PIL import Image

img_full = Image.open('brand/red-studios-logo.jpg').convert('RGBA')
d = []
for item in img_full.getdata():
    if item[0] < 40 and item[1] < 40 and item[2] < 40:
        d.append((0, 0, 0, 0))
    else:
        d.append(item)
img_full.putdata(d)

canvas = 1152
inner = int(canvas * 0.66)
aspect = img_full.height / img_full.width
if aspect >= 1:
    img_full = img_full.resize((int(inner / aspect), inner), Image.Resampling.LANCZOS)
else:
    img_full = img_full.resize((inner, int(inner * aspect)), Image.Resampling.LANCZOS)

splash = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
splash.paste(img_full, ((canvas - img_full.width) // 2, (canvas - img_full.height) // 2), img_full)
splash.save('app/src/main/res/drawable/splash_logo.png')
print('splash_logo.png regenerated:', splash.size)
