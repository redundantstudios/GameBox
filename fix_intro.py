#!/usr/bin/env python3
content = open('app/src/main/assets/games/planetmerge/index.html').read()
# Remove the intro-back-btn button from the overlay
old = '''<div class="overlay show" id="introOverlay">
  <button class="intro-back-btn" id="introBack" aria-label="Back">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
  </button>
  <div class="intro-bg-deco">'''
new = '''<div class="overlay show" id="introOverlay">
  <div class="intro-bg-deco">'''
content = content.replace(old, new)
open('app/src/main/assets/games/planetmerge/index.html', 'w').write(content)
print('Done - removed intro-back-btn')