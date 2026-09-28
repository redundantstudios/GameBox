@echo off
call BUILD.bat
if errorlevel 1 (echo BUILD FAILED & exit /b 1)
C:\Users\srinu\.android-sdk\platform-tools\adb.exe install -r shell-debug.apk
rem Installed package is com.redundantstudios.arcade (namespace and
rem applicationId are now identical). The timestamp check below must
rem use the applicationId.
C:\Users\srinu\.android-sdk\platform-tools\adb.exe shell dumpsys package com.redundantstudios.arcade | findstr lastUpdateTime
echo DONE - check the timestamp above matches now