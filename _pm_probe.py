import io
p = r'app\src\main\assets\games\planetmerge\index.html'
lines = io.open(p, encoding='utf-8').read().split('\n')
pat = "$('#"
hits = [(i, l.strip()[:150]) for i, l in enumerate(lines, 1) if pat in l]
print('hash-dollar hits:', len(hits))
for i, l in hits:
    print(i, l)
