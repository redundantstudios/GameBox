import io

# NEW badge in the director's reference style: red ribbon banner with folded
# tails; the white "NEW" text is the TextView layered on this background.
# Vector drawable = crisp at any density, no APK bytes.
W, H = 90.0, 50.0
RY = 9.0        # ribbon half-height
BW = 56.0       # ribbon body width (centred)
NOTCH = 5.5     # swallow-tail notch depth
TAIL_W = 9.0    # tail fold width
TAIL_DY = 4.0   # tail vertical offset

cx = W / 2
bx0, bx1 = cx - BW / 2, cx + BW / 2
by0, by1 = (H / 2 - RY), (H / 2 + RY)
my = H / 2

def poly(pts, fill):
    d = "M%s Z" % " L".join("%.2f,%.2f" % (x, y) for (x, y) in pts)
    return ('    <path android:fillColor="%s" android:strokeColor="#5E120C" '
            'android:strokeWidth="1.6" android:strokeLineJoin="round" '
            'android:pathData="%s" />\n' % (fill, d))

parts = []
parts.append(poly([(bx0 - TAIL_W, my - RY + TAIL_DY - 4),
                   (bx0 + 6, my - RY + TAIL_DY - 4),
                   (bx0 + 6, my + RY + TAIL_DY),
                   (bx0 - TAIL_W + 4, my + RY + TAIL_DY + 5),
                   (bx0 - TAIL_W, my + RY + TAIL_DY - 6)], "#B0261E"))
parts.append(poly([(bx1 + TAIL_W, my - RY + TAIL_DY - 4),
                   (bx1 - 6, my - RY + TAIL_DY - 4),
                   (bx1 - 6, my + RY + TAIL_DY),
                   (bx1 + TAIL_W - 4, my + RY + TAIL_DY + 5),
                   (bx1 + TAIL_W, my + RY + TAIL_DY - 6)], "#B0261E"))
parts.append(poly([(bx1, by0), (bx0, by0), (bx0 + NOTCH, my),
                   (bx0, by1), (bx1, by1), (bx1 - NOTCH, my)], "#E33C32"))
parts.append('    <path android:fillColor="#F66C60" android:pathData="M%.2f,%.2f '
             'L%.2f,%.2f L%.2f,%.2f L%.2f,%.2f Z" />\n'
             % (bx0 + 5, by0 + 2, bx1 - 5, by0 + 2, bx1 - 8, by0 + 9, bx0 + 8, by0 + 9))

xml = ('<?xml version="1.0" encoding="utf-8"?>\n'
       '<!-- NEW marker on a freshly added game tile: red ribbon banner with\n'
       '     folded tails, per the director reference screenshots. Vector so it\n'
       '     stays crisp at any density and costs no APK bytes. -->\n'
       '<vector xmlns:android="http://schemas.android.com/apk/res/android"\n'
       '    android:width="45dp"\n'
       '    android:height="25dp"\n'
       '    android:viewportWidth="90"\n'
       '    android:viewportHeight="50">\n'
       + "".join(parts) + '</vector>\n')

io.open("app/src/main/res/drawable/bg_badge_new.xml", "w", encoding="utf-8",
        newline="\n").write(xml)
print("wrote bg_badge_new.xml (red ribbon banner with folded tails)")