# Build Pipeline

The primary command to build the application is `BUILD.bat`.

## Build Process
Run the following command in the project root:
```cmd
BUILD.bat
```
This will:
1. Set the JDK 17 environment.
2. Run `gradle assembleDebug` using the local Gradle distribution.
3. Copy the resulting APK to `shell-debug.apk` in the project root.

## Audio Assets

**The audio is in git.** `app/src/main/res/raw/*.ogg` is committed, so a fresh
clone has the sounds and the app compiles and runs immediately.

It used to be the other way round - the files were generated and gitignored,
so every clone started with no audio at all, each developer had to install
ffmpeg and numpy and run two scripts, and each one produced a slightly
different file. The result was three developers testing three different apps.
The files are 1.3 MB in total, which is nothing.

| File | Used by | Notes |
|---|---|---|
| `bgm_shell.ogg` | the shell's ambient loop | seamless-by-construction loop |
| `sfx_tap.ogg` | `ShellAudio` | UI tap |
| `sfx_select.ogg` | `ShellAudio` | UI select |
| `sfx_back.ogg` | `ShellAudio` | back |
| `sfx_tick.ogg` | `ShellAudio` | volume-slider tick |
| `notif_chime.ogg` | `NotificationChannels` | notification chime |

**Do not regenerate them to "fix" a sound.** The generators are for CHANGING a
sound deliberately, and they now refuse to overwrite a committed file unless
you ask them to:

```cmd
python Tools/_gen_audio.py --force
python Tools/_gen_bgm.py --force
```

Without `--force` they print what they would have overwritten and stop.
That guard is the point: regenerating by accident is how the three apps
diverged in the first place.

The `.wav` intermediates are scratch and stay ignored.

- Requires **ffmpeg with `libvorbis`** on PATH (`_gen_bgm.py` also probes
  `C:\ffmpeg\...`).
- Verify any BGM take is seamless with: `python Tools/_check_loop.py`
- `_gen_bgm.py` overwrites the `bgm_shell.ogg` that `_gen_audio.py` writes,
  so run the BGM script **after** the audio one.
- The games' own sounds are not here at all - they are base64-embedded in each
  game's `index.html`, and travel with the game file.

## Deployment
To install the latest build:
```cmd
"C:\Users\srinu\.android-sdk\platform-tools\adb.exe" install -r shell-debug.apk
```

## Verification Reference
### UI Hierarchy Dump
```cmd
"C:\Users\srinu\.android-sdk\platform-tools\adb.exe" shell uiautomator dump /sdcard/ui.xml
"C:\Users\srinu\.android-sdk\platform-tools\adb.exe" shell "cat /sdcard/ui.xml"
```

### Logcat Filtering
```cmd
"C:\Users\srinu\.android-sdk\platform-tools\adb.exe" logcat -d -s ModeAdapter GameAdapter ManifestParser AdMobManager
```

### App State Control
```cmd
"C:\Users\srinu\.android-sdk\platform-tools\adb.exe" shell am force-stop com.redundantstudios.arcade
"C:\Users\srinu\.android-sdk\platform-tools\adb.exe" shell am start -n com.redundantstudios.arcade/.MainActivity
```
