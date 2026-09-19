#!/usr/bin/env python3
with open('app/src/main/assets/games/planetmerge/index.html', 'rb') as f:
    content = f.read()

# Remove the entire on(introBack) event listener line
old = b"on(\$('introBack'),'click',introBack);\n"
new = b''
content = content.replace(old, new)

# Also try without the semicolon+newline
old2 = b"on(\$('introBack'),'click',introBack)"
content = content.replace(old2, new)

with open('app/src/main/assets/games/planetmerge/index.html', 'wb') as f:
    f.write(content)

print('Done - removed introBack JS')