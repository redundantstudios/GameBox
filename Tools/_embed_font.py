import base64
import io

P = "app/src/main/assets/games/chicken-chaos/index.html"
FONT = "app/src/main/assets/fonts/LuckiestGuy-Regular.ttf"

s = io.open(P, encoding="utf-8").read()
b64 = base64.b64encode(open(FONT, "rb").read()).decode()
old = ("@font-face{font-family:'Luckiest Guy';"
       "src:url('../../fonts/LuckiestGuy-Regular.ttf') format('truetype');"
       "font-display:swap}")
new = ("@font-face{font-family:'Luckiest Guy';font-display:block;"
       "src:url(data:font/truetype;base64," + b64 + ") format('truetype')}")
assert s.count(old) == 1, "font-face anchor hits: %d" % s.count(old)
s = s.replace(old, new, 1)
io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("embedded font: %d b64 chars; file now %d bytes" % (len(b64), len(s)))
