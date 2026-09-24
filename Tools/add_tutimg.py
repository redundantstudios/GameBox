#!/usr/bin/env python3
with open('manus-reference.html', 'rb') as f:
    content = f.read()

# Find the tutImg line and add src attribute
old = b'<img id="tutImg" class="tut-img">'
new = b'<img id="tutImg" class="tut-img" src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\'/%3E">'

if old in content:
    content = content.replace(old, new)
    with open('manus-reference.html', 'wb') as f:
        f.write(content)
    print('Added src to tutImg in Manus reference')
else:
    print('Pattern not found')
    # Try without the self-closing tag difference
    old2 = b'id="tutImg" class="tut-img">'
    idx = content.find(old2)
    if idx >= 0:
        print('Found at', idx, 'context:', repr(content[idx:idx+50]))