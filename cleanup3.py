#!/usr/bin/env python3
with open('app/src/main/assets/games/planetmerge/index.html', 'rb') as f:
    content = f.read()

# Remove the intro-back-btn JavaScript event listener
old_listener = b'on($("introBack"),"click",introBack)'
content = content.replace(old_listener, b'')

# Remove the introBack function definition
old_func = b'function introBack() {\n  console.log'
content = content.replace(old_func, b'function openHelp()')

# Remove the intro-back-btn HTML markup (already done earlier, but check)
old_markup = b'id="introBack"'
content = content.replace(old_markup, b'')

with open('app/src/main/assets/games/planetmerge/index.html', 'wb') as f:
    f.write(content)

print('Cleanup done')