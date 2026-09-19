#!/usr/bin/env python3
with open('app/src/main/assets/games/planetmerge/index.html', 'rb') as f:
    content = f.read()

# Remove the introBack CSS class
old_css1 = b'.intro-back-btn{position:fixed;top:24px;left:24px;width:48px;height:48px;border:none;background:#fff;color:#a58a68;\ndisplay:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.1);transition:all .2s;z-index:21}'
old_css2 = b'.intro-back-btn:active{transform:scale(0.9);box-shadow:0 2px 6px rgba(0,0,0,0.1)}'
old_css3 = b'.intro-back-btn svg{width:24px;height:24px}'

content = content.replace(old_css1, b'')
content = content.replace(old_css2, b'')
content = content.replace(old_css3, b'')

# Remove the event listener
old_listener = b'on($("introBack"),"click",introBack)'
content = content.replace(old_listener, b'')

with open('app/src/main/assets/games/planetmerge/index.html', 'wb') as f:
    f.write(content)

print('Removed introBack CSS and event listener')