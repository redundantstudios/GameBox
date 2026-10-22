@echo off
rem Build AND install the debug APK to the connected phone.
rem The adb path is NOT hardcoded: it used to point at one developer's SDK
rem folder, so the script only worked on their machine. It is looked up in
rem this order, and the first one that exists wins:
rem   %ADB%        - an explicit override
rem   %ANDROID_HOME% / %ANDROID_SDK_ROOT%\platform-tools\adb.exe
rem   %LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
rem   %USERPROFILE%\.android-sdk\platform-tools\adb.exe (the lead's SDK)
rem   adb on the PATH
call BUILD.bat
if errorlevel 1 (echo BUILD FAILED & exit /b 1)

set "ADB=%ADB%"
if not defined ADB (
  if defined ANDROID_HOME if exist "%ANDROID_HOME%\platform-tools\adb.exe" set "ADB=%ANDROID_HOME%\platform-tools\adb.exe"
)
if not defined ADB (
  if defined ANDROID_SDK_ROOT if exist "%ANDROID_SDK_ROOT%\platform-tools\adb.exe" set "ADB=%ANDROID_SDK_ROOT%\platform-tools\adb.exe"
)
if not defined ADB (
  if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
)
if not defined ADB (
  if exist "%USERPROFILE%\.android-sdk\platform-tools\adb.exe" set "ADB=%USERPROFILE%\.android-sdk\platform-tools\adb.exe"
)
if not defined ADB (
  for %%D in (adb.exe) do if not "%%D"=="adb.exe" set "ADB=%%D"
)
if not defined ADB (
  echo DEPLOY FAILED - no adb found. Set ADB, or ANDROID_HOME, or put adb on the PATH.
  exit /b 1
)

"%ADB%" install -r shell-debug.apk
if errorlevel 1 (echo INSTALL FAILED & exit /b 1)
rem Installed package is com.redundantstudios.arcade (namespace and
rem applicationId are now identical). The timestamp check below must
rem use the applicationId.
"%ADB%" shell dumpsys package com.redundantstudios.arcade | findstr lastUpdateTime
echo DONE - check the timestamp above matches now
