@echo off
set JAVA_HOME=C:\Users\srinu\.jdk\jdk-17.0.10+7
set PATH=%JAVA_HOME%\bin;%PATH%
cd /d "%~dp0"
call C:\Users\srinu\.gradle-dist\gradle-8.5\gradle-8.5\bin\gradle.bat clean assembleDebug
if errorlevel 1 (echo BUILD FAILED & exit /b 1)
copy /Y app\build\outputs\apk\debug\app-debug.apk shell-debug.apk >nul
echo BUILD OK -> shell-debug.apk
for %%F in (shell-debug.apk) do echo Size: %%~zF bytes
