import sys
path = r"C:\Users\MACHENN INNOVATIONS\Desktop\bobby\GameBox\app/src/main/assets/games/blind-fire/index.html"
with open(path, 'r') as f:
    content = f.read()
old_play = "($('#btnPlay').addEventListener('click',()=>{audio();renderChips();go('profile');S.tick()});"
new_play = "($('#btnPlay').addEventListener('click',()=>{audio();renderChips();go('profile');S.tick(); bfShowInterstitialIfReady();});"
old_profile = "($('#btnProfileBack').addEventListener('click',()=>{audio();go('setup')});"
new_profile = "($('#btnProfileBack').addEventListener('click',()=>{audio();go('setup'); bfShowInterstitialIfReady();});"
old_how = "($('#btnHow').addEventListener('click',()=>{audio();openHelp()});"
new_how = "($('#btnHow').addEventListener('click',()=>{audio();openHelp(); bfShowInterstitialIfReady();});"
count = 0
if old_play in content:
    content = content.replace(old_play, new_play)
    count += 1
    print('Replaced play')
if old_profile in content:
    content = content.replace(old_profile, new_profile)
    count += 1
    print('Replaced profile')
if old_how in content:
    content = content.replace(old_how, new_how)
    count += 1
    print('Replaced how')
with open(path, 'w') as f:
    f.write(content)
print(f'Done, replaced {count} lines')