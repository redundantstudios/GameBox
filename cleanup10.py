#!/usr/bin/env python3
with open('app/src/main/assets/games/planetmerge/index.html', 'rb') as f:
    content = f.read()

# Remove the introBack event listener - find the pattern and remove it
# The pattern is: introBack'),'click',introBack);
old = b"introBack'),'click',introBack);"
new = b''
content = content.replace(old, new)

with open('app/src/main/assets/games/planetmerge/index.html', 'wb') as f:
    f.write(content)

print('Done')