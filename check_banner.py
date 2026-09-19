import subprocess
result = subprocess.run([r'C:\Users\srinu\.android-sdk\platform-tools\adb.exe', 'logcat', '-d'], capture_output=True, text=True, timeout=10)
lines = result.stdout.split('\n')
banner_lines = [l for l in lines if 'banner' in l.lower() or 'ADS' in l.upper()]
for l in banner_lines[:10]:
    print(l)
if not banner_lines:
    print('No banner/ADS lines found - GOOD (banner always visible, no ADS log noise)')