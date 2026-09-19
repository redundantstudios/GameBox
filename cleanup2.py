#!/usr/bin/env python3
with open('app/src/main/assets/games/planetmerge/index.html', 'rb') as f:
    content = f.read()

# Remove the intro-back-btn CSS (single line)
old_css = b'.intro-back-btn{position:fixed;top:24px;left:24px;width:48px;height:48px;border-radius:50%;border:none;background:#fff;color:#a58a68;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.1);transition:all .2s;z-index:21}\n\n\n.intro-bg-deco{position'
new_css = b'.intro-bg-deco{position'

if old_css in content:
    content = content.replace(old_css, new_css)
    with open('app/src/main/assets/games/planetmerge/index.html', 'wb') as f:
        f.write(content)
    print('Removed intro-back-btn CSS')
else:
    print('CSS pattern not found')
    # Debug: show what's at that location
    idx = content.find(b'intro-back-btn')
    print('intro-back-btn found at:', idx)