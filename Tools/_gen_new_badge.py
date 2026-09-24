import io
import os

# A compact green NEW flag inspired by the supplied reference, simplified for
# readability over busy game-tile artwork: one clean body, a folded-back right
# tail, a dark lower edge for separation, and restrained top gloss. The white
# NEW lettering remains an Android TextView layered over this crisp vector.
W, H = 108.0, 52.0
EDGE = "#087F5B"
BODY = "#12B886"
SHADOW = "#087A58"
GLOSS = "#42D3A0"


def poly(points, fill, stroke=None, width="1.8"):
    path = "M%s Z" % " L".join("%.2f,%.2f" % p for p in points)
    if stroke is None:
        return ('    <path android:fillColor="%s" android:pathData="%s" />\n'
                % (fill, path))
    return ('    <path android:fillColor="%s" android:strokeColor="%s" '
            'android:strokeWidth="%s" android:strokeLineJoin="round" '
            'android:pathData="%s" />\n' % (fill, stroke, width, path))


parts = [
    # Dark folded tail peeks behind the main flag at the right.
    poly([(88, 14), (103, 20), (88, 26)], SHADOW, EDGE, "1.5"),
    # Main green banner with a shallow swallow-tail/fold at the right.
    poly([(6, 12), (91, 12), (100, 19), (92, 26), (91, 40), (6, 40)],
         BODY, EDGE, "2.0"),
    # Crisp highlight and bottom shade make it read as a folded ribbon, but the
    # silhouette stays simple enough to work at tile size.
    poly([(11, 15), (88, 15), (91, 19), (11, 19)], GLOSS),
    poly([(10, 35), (88, 35), (91, 39), (10, 39)], SHADOW),
]

xml = ('<?xml version="1.0" encoding="utf-8"?>\n'
       '<!-- Compact green NEW flag for a newly added game tile. -->\n'
       '<vector xmlns:android="http://schemas.android.com/apk/res/android"\n'
       '    android:width="54dp"\n'
       '    android:height="26dp"\n'
       '    android:viewportWidth="108"\n'
       '    android:viewportHeight="52">\n'
       + "".join(parts) + '</vector>\n')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_PATH = os.path.join(ROOT, "app", "src", "main", "res", "drawable",
                        "bg_badge_new.xml")
io.open(OUT_PATH, "w", encoding="utf-8", newline="\n").write(xml)
print("wrote %s (green NEW flag)" % OUT_PATH)
