@echo off
set JAVA_HOME=C:\Users\srinu\.jdk\jdk-17.0.10+7
set PATH=%JAVA_HOME%\bin;%PATH%
cd /d "%~dp0"
call C:\Users\srinu\.gradle-dist\gradle-8.5\gradle-8.5\bin\gradle.bat clean assembleDebug
if errorlevel 1 (echo BUILD FAILED & exit /b 1)
rem Give gradle a moment to finalize the APK before copying
ping -n 3 127.0.0.1 >nul
copy /Y app\build\outputs\apk\debug\app-debug.apk shell-debug.apk >nul
rem Sanity check: a valid debug APK is several MB
for %%F in (shell-debug.apk) do set APKSIZE=%%~zF
if %APKSIZE% LSS 1000000 (
  echo WARNING: shell-debug.apk looks truncated (%APKSIZE% bytes^) - retrying copy
  ping -n 4 127.0.0.1 >nul
  copy /Y app\build\outputs\apk\debug\app-debug.apk shell-debug.apk >nul
  for %%F in (shell-debug.apk) do set APKSIZE=%%~zF
)
echo BUILD OK - shell-debug.apk
echo Size: %APKSIZE% bytes
