#!/usr/bin/env python3
with open('app/src/main/assets/games/planetmerge/index.html', 'rb') as f:
    content = f.read()

# Remove all Studio.ads.banner('hide') calls
old1 = b"Studio.ads.banner('hide');"
content = content.replace(old1, b'')

# Remove all Studio.ads.banner('show') calls
old2 = b"Studio.ads.banner('show');"
content = content.replace(old2, b'')

with open('app/src/main/assets/games/planetmerge/index.html', 'wb') as f:
    f.write(content)

print('Removed all Studio.ads.banner calls')
print('Total banner hide removals:', content.replace(old1, b'').count(b"") if old1 in content else 0)