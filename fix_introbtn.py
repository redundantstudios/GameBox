#!/usr/bin/env python3
with open('app/src/main/assets/games/planetmerge/index.html', 'rb') as f:
    content = f.read()

# Remove the intro-back-btn CSS
old_css = b'.intro-back-btn{position:fixed;top:24px;left:24px;width:48px;height:48px;border:none;background:#fff;color:#a58a68;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.1);transition:all .2s;z-index:21}\n\n\n.intro-bg-deco{position'
new_css = b'.intro-bg-deco{position'

if old_css in content:
    content = content.replace(old_css, new_css)
    print('Removed intro-back-btn CSS')
else:
    print('CSS pattern not found')

# Remove the intro-back-btn HTML markup  
old_markup = b'id="introBack"'
content = content.replace(old_markup, b'')

# Remove the JS event listener for introBack
old_listener = b'on($("introBack"),"click",introBack)'
content = content.replace(old_listener, b'')

# Remove the introBack function
old_func = b'function introBack()'
content = content.replace(old_func, b'function openHelp()')

with open('app/src/main/assets/games/planetmerge/index.html', 'wb') as f:
    f.write(content)

print('Done - cleaned up intro-back-btn')