#!/usr/bin/env python3
with open('app/src/main/assets/games/planetmerge/index.html', 'rb') as f:
    content = f.read()

# Remove the specific remaining introBack event listener
old = b"on(\$('introBack'),'click',introBack)"
new = b''
content = content.replace(old, new)

with open('app/src/main/assets/games/planetmerge/index.html', 'wb') as f:
    f.write(content)

print('Done - removed last introBack JS reference')