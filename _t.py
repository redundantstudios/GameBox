import re
s=open('app/src/main/assets/games/balloon-battle/index.html',encoding='utf-8').read()
for m in re.finditer(r'<(div|button|span|section|h1|h2)[^>]*>',s):
    print(s[:m.start()].count("\n")+1, m.group(0)[:130])
