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
