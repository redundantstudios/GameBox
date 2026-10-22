@echo off
rem Fast DEBUG loop - builds shell-debug.apk for the connected phone.
rem For Google Play upload use BUNDLE.bat (release .aab), not this file.
rem
rem The tool paths are NOT hardcoded: they were pinned to one developer's
rem home directory, which meant a fresh clone could not build at all. They
rem are looked up in this order, and the first one that exists wins:
rem   JAVA  - %JAVA_HOME%, then a JDK 17 next to the project, then java on PATH
rem   GRADLE- %GRADLE_HOME%, then gradle-dist next to the project, then gradle on PATH
cd /d "%~dp0"

set "PROJECT_DIR=%~dp0"

rem ---- JDK 17 (required by this project's AGP version) ----
rem A pre-set JAVA_HOME is only trusted if it really has a java.exe in it.
rem This machine carried JAVA_HOME pointing at an Android Studio jbr that
rem is not installed, and gradle refused to start ("JAVA_HOME is set to an
rem invalid directory") - which says nothing about the real cause. So an
rem unusable JAVA_HOME is cleared and the lookup below runs instead.
if defined JAVA_HOME if not exist "%JAVA_HOME%\bin\java.exe" set "JAVA_HOME="
rem A candidate is only accepted if the executable is really in it. A folder
rem that merely LOOKS like a JDK (or a gradle) would otherwise win the lookup
rem and then fail with "The system cannot find the path specified", which
rem says nothing about the real cause. There was a leftover gradle-8.5
rem directory with no bin\ in it, and it took the build down.
if not defined JAVA_HOME (
  for /f "delims=" %%D in ('dir /b /ad "%USERPROFILE%\.jdk\jdk-17*" 2^>nul') do if not defined JAVA_HOME if exist "%USERPROFILE%\.jdk\%%D\bin\java.exe" set "JAVA_HOME=%USERPROFILE%\.jdk\%%D"
)
if not defined JAVA_HOME (
  for /f "delims=" %%D in ('dir /b /ad "%PROJECT_DIR%..\.jdk\jdk-17*" 2^>nul') do if not defined JAVA_HOME if exist "%PROJECT_DIR%..\.jdk\%%D\bin\java.exe" set "JAVA_HOME=%PROJECT_DIR%..\.jdk\%%D"
)
if not defined JAVA_HOME (
  if exist "C:\Program Files\Android\Android Studio\jbr" set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
)
if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"

rem ---- Gradle ----
set "GRADLE_CMD="
if defined GRADLE_HOME (
  if exist "%GRADLE_HOME%\bin\gradle.bat" set "GRADLE_CMD=%GRADLE_HOME%\bin\gradle.bat"
)
if not defined GRADLE_CMD (
  for /f "delims=" %%D in ('dir /b /ad "%USERPROFILE%\.gradle-dist\gradle-*" 2^>nul') do if not defined GRADLE_CMD if exist "%USERPROFILE%\.gradle-dist\%%D\bin\gradle.bat" set "GRADLE_CMD=%USERPROFILE%\.gradle-dist\%%D\bin\gradle.bat"
)
if not defined GRADLE_CMD (
  for /f "delims=" %%D in ('dir /b /ad "%PROJECT_DIR%..\.gradle-dist\gradle-*" 2^>nul') do if not defined GRADLE_CMD if exist "%PROJECT_DIR%..\.gradle-dist\%%D\bin\gradle.bat" set "GRADLE_CMD=%PROJECT_DIR%..\.gradle-dist\%%D\bin\gradle.bat"
)
if not defined GRADLE_CMD (
  for %%D in (gradle.bat) do if not "%%D"=="gradle.bat" set "GRADLE_CMD=%%D"
)
if not defined GRADLE_CMD (
  echo BUILD FAILED - no gradle found. Set GRADLE_HOME, or put gradle.bat on the PATH.
  exit /b 1
)

call "%GRADLE_CMD%" clean assembleDebug
if errorlevel 1 (echo BUILD FAILED & exit /b 1)
rem The APK must EXIST before it is copied. Without this check a failed
rem compile (which gradle reports, but whose errorlevel did not survive the
rem call) left the PREVIOUS apk in place and the copy below silently
rem re-installed that stale build - which cost an afternoon of tests that
rem never ran.
if not exist "app\build\outputs\apk\debug\app-debug.apk" (
  echo BUILD FAILED - no APK was produced
  exit /b 1
)
rem Give gradle a moment to finalize the APK before copying
ping -n 3 127.0.0.1 >nul
copy /Y "app\build\outputs\apk\debug\app-debug.apk" "shell-debug.apk" >nul
if errorlevel 1 (echo COPY FAILED & exit /b 1)
rem Sanity check: a valid debug APK is several MB
for %%F in (shell-debug.apk) do set APKSIZE=%%~zF
if %APKSIZE% LSS 1000000 (
  echo WARNING: shell-debug.apk looks truncated (%APKSIZE% bytes^) - retrying copy
  ping -n 4 127.0.0.1 >nul
  copy /Y "app\build\outputs\apk\debug\app-debug.apk" "shell-debug.apk" >nul
  for %%F in (shell-debug.apk) do set APKSIZE=%%~zF
)
echo BUILD OK - shell-debug.apk
echo Size: %APKSIZE% bytes
