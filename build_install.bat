@echo off
setlocal
set "PROJECT_DIR=C:\Users\MACHENN INNOVATIONS\Desktop\bobby\GameBox"
set "GRADLE=C:\Users\MACHENN INNOVATIONS\.gradle-dist\gradle-8.11.1\bin\gradle.bat"
set "ADB=C:\Users\MACHENN INNOVATIONS\AppData\Local\Android\Sdk\platform-tools\adb.exe"
set "JAVA_HOME=C:\Users\MACHENN INNOVATIONS\.jdk\jdk-17.0.20.1+1"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "%PROJECT_DIR%"
if errorlevel 1 (
    echo CD FAILED
    exit /b 1
)
echo === BUILDING APK ===
call "%GRADLE%" assembleDebug --no-daemon
if errorlevel 1 (
    echo BUILD FAILED
    exit /b 1
)
copy /y app\build\outputs\apk\debug\app-debug.apk shell-debug.apk
for %%I in (shell-debug.apk) do echo APK SIZE: %%~zI bytes
echo === INSTALLING ON DEVICE ===
"%ADB%" install -r shell-debug.apk
if errorlevel 1 (
    echo INSTALL FAILED
    exit /b 1
)
echo INSTALL SUCCESSFUL
echo === LAUNCHING SHELL ===
"%ADB%" shell am force-stop com.redundantstudios.arcade
"%ADB%" shell monkey -p com.redundantstudios.arcade -c android.intent.category.LAUNCHER 1 >nul 2>&1
ping -n 5 127.0.0.1 >nul
echo LAUNCHED
endlocal