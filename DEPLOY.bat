@echo off
call BUILD.bat
if errorlevel 1 (echo BUILD FAILED & exit /b 1)
C:\Users\srinu\.android-sdk\platform-tools\adb.exe install -r shell-debug.apk
rem The Play-facing applicationId (com.redundantstudios.minigames) is NOT the same
rem as the internal namespace (com.redundantstudios.arcade). The timestamp check
rem below must use the applicationId, or it always reports nothing.
C:\Users\srinu\.android-sdk\platform-tools\adb.exe shell dumpsys package com.redundantstudios.minigames | findstr lastUpdateTime
echo DONE - check the timestamp above matches now