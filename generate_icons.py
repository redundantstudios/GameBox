import os
from PIL import Image, ImageDraw, ImageOps

def generate_assets():
    source_path = 'brand/red-studios-logo.jpg'
    if not os.path.exists(source_path):
        print(f"Error: {source_path} not found")
        return

    # 1. Extract R Glyph
    img = Image.open(source_path).convert('RGBA')

    # Threshold black background to transparent
    datas = img.getdata()
    newData = []
    for item in datas:
        # Threshold near-black (R,G,B < 40)
        if item[0] < 40 and item[1] < 40 and item[2] < 40:
            newData.append((0, 0, 0, 0))
        else:
            newData.append(item)
    img.putdata(newData)

    # Remove wordmark: Crop the top ~75% of the image
    width, height = img.size
    img = img.crop((0, 0, width, int(height * 0.75)))

    # Find bounding box of glyph
    bbox = img.getbbox()
    if not bbox:
        print("Error: No glyph found")
        return
    img = img.crop(bbox)

    # Make it a square centered glyph
    glyph_w, glyph_h = img.size
    side = max(glyph_w, glyph_h)
    glyph_square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    offset_x = (side - glyph_w) // 2
    offset_y = (side - glyph_h) // 2
    glyph_square.paste(img, (offset_x, offset_y), img)

    # 2. Generate Foreground Adaptive Asset (108x108)
    fg_size = 108
    fg_bg = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
    glyph_fg_size = int(fg_size * 0.66)
    scaled_fg = glyph_square.resize((glyph_fg_size, glyph_fg_size), Image.Resampling.LANCZOS)
    offset_fg = (fg_size - glyph_fg_size) // 2
    fg_bg.paste(scaled_fg, (offset_fg, offset_fg), scaled_fg)

    fg_path = 'app/src/main/res/drawable/ic_launcher_foreground.png'
    os.makedirs(os.path.dirname(fg_path), exist_ok=True)
    fg_bg.save(fg_path)

    # 3. Generate Icons
    densities = {
        'mdpi': 48,
        'hdpi': 72,
        'xhdpi': 96,
        'xxhdpi': 144,
        'xxxhdpi': 192
    }

    bg_color = (0x1A, 0x1A, 0x1A, 255) # #1A1A1A

    for name, size in densities.items():
        # Background square
        icon_bg = Image.new('RGBA', (size, size), bg_color)

        # Foreground Glyph (scaled to ~66% of size)
        glyph_size = int(size * 0.66)
        scaled_glyph = glyph_square.resize((glyph_size, glyph_size), Image.Resampling.LANCZOS)

        # Composite
        icon = icon_bg.copy()
        offset = (size - glyph_size) // 2
        icon.paste(scaled_glyph, (offset, offset), scaled_glyph)

        # Save ic_launcher.png
        path = f'app/src/main/res/mipmap-{name}/ic_launcher.png'
        os.makedirs(os.path.dirname(path), exist_ok=True)
        icon.convert('RGB').save(path)

        # Save ic_launcher_round.png
        mask = Image.new('L', (size, size), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, size, size), fill=255)

        round_icon = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        round_icon.paste(icon, (0, 0), mask)
        round_path = f'app/src/main/res/mipmap-{name}/ic_launcher_round.png'
        round_icon.convert('RGB').save(round_path)

    # 4. Splash Logo (padded to safe circle so Android 12+ round mask never clips it)
    img_full = Image.open(source_path).convert('RGBA')
    datas_f = img_full.getdata()
    newData_f = []
    for item in datas_f:
        if item[0] < 40 and item[1] < 40 and item[2] < 40:
            newData_f.append((0, 0, 0, 0))
        else:
            newData_f.append(item)
    img_full.putdata(newData_f)

    canvas = 1152
    inner = int(canvas * 0.66)
    aspect = img_full.height / img_full.width
    if aspect >= 1:
        img_full = img_full.resize((int(inner / aspect), inner), Image.Resampling.LANCZOS)
    else:
        img_full = img_full.resize((inner, int(inner * aspect)), Image.Resampling.LANCZOS)

    splash = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
    off_x = (canvas - img_full.width) // 2
    off_y = (canvas - img_full.height) // 2
    splash.paste(img_full, (off_x, off_y), img_full)

    splash_path = 'app/src/main/res/drawable/splash_logo.png'
    os.makedirs(os.path.dirname(splash_path), exist_ok=True)
    splash.save(splash_path)

    print("All assets generated successfully")

if __name__ == "__main__":
    generate_assets()
