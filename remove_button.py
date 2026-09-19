#!/usr/bin/env python3
with open('app/src/main/assets/games/planetmerge/index.html', 'rb') as f:
    content = f.read()

old = b'<div class="overlay show" id="introOverlay">\n  <button class="intro-back-btn" id="introBack" aria-label="Back">\n    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>\n  </button>\n  <div class="intro-bg-deco">'

new = b'<div class="overlay show" id="introOverlay">\n  <div class="intro-bg-deco">'

if old in content:
    content = content.replace(old, new)
    with open('app/src/main/assets/games/planetmerge/index.html', 'wb') as f:
        f.write(content)
    print('Successfully removed intro-back-btn')
else:
    print('Pattern not found')
    # Try simpler
    idx = content.find(b'intro-back-btn')
    print('intro-back-btn found at:', idx)