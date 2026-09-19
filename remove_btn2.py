#!/usr/bin/env python3
with open('app/src/main/assets/games/planetmerge/index.html', 'rb') as f:
    content = f.read()

# Remove the intro-back-btn CSS (the .intro-back-btn selector and its subsequent .intro-bg-deco)
# Find the intro-back-btn and remove it along with the next selector
idx = content.find(b'intro-back-btn')
if idx >= 0:
    # Find .row.top after this point
    rest = content[idx:]
    next_sel = rest.find(b'.row.top')
    if next_sel >= 0:
        # Keep everything before intro-back-btn, and everything from .row.top onwards
        content = content[:idx] + rest[next_sel:]
        print('Removed intro-back-btn block (found .row.top)')
    else:
        # Find .intro-bg-deco
        end_sel = rest.find(b'.intro-bg-deco')
        if end_sel >= 0:
            content = content[:idx] + rest[end_sel:]
            print('Removed intro-back-btn block (found .intro-bg-deco)')
        else:
            # Just remove the selector entirely (first 130 bytes or so)
            content = content[:idx] + content[idx+130:]
            print('Removed intro-back-btn (truncated)')
    
    with open('app/src/main/assets/games/planetmerge/index.html', 'wb') as f:
        f.write(content)
    print('Done - removed intro-back-btn')
else:
    print('intro-back-btn not found')