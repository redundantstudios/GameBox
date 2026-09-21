import io, re
kg = io.open('backup_pm_knowngood.html', encoding='utf-8').read()
sh = io.open(r'app\src\main\assets\games\planetmerge\index.html', encoding='utf-8').read()
print('kg len', len(kg))
print('kg font-face count:', len(re.findall('@font-face', kg)), 'Fredoka:', kg.count('Fredoka'))
i = kg.find('<style>')
print('kg style start:', repr(kg[i:i+300]))
ends = [e.end() for e in re.finditer(r"format\('woff2'\)\}", sh)]
print('sh woff2 ends:', ends)
j = sh.find(':root')
print('sh :root at', j, repr(sh[j:j+220]))
