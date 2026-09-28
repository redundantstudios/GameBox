@echo off
rem Builds the RELEASE Android App Bundle for Google Play closed testing.
rem Do NOT use BUILD.bat for this - that produces an unsigned debug APK, which
rem Play will reject.
rem
rem Why this file exists: an earlier upload was rejected with "You uploaded a
rem file that is not a well-formed zip archive". The cause was a ZERO-BYTE
rem app-release.aab - a placeholder had been created but no real bundle was ever
rem produced or copied. This script now fails loudly instead of leaving an empty
rem file sitting in Downloads to be uploaded by mistake.
set JAVA_HOME=C:\Users\srinu\.jdk\jdk-17.0.10+7
set PATH=%JAVA_HOME%\bin;%PATH%
cd /d "%~dp0"

echo Building release bundle ^(R8 + resource shrinking - several minutes^)...
call C:\Users\srinu\.gradle-dist\gradle-8.11.1\bin\gradle.bat bundleRelease
if errorlevel 1 (echo BUNDLE BUILD FAILED & exit /b 1)

set BUNDLE=app\build\outputs\bundle\release\app-release.aab
if not exist "%BUNDLE%" (echo BUNDLE MISSING: %BUNDLE% & exit /b 1)

rem A real AAB is many megabytes. Anything tiny means the build or the copy was
rem cut short, and uploading that is exactly the "not a well-formed zip" error.
for %%F in ("%BUNDLE%") do set BUNDLESIZE=%%~zF
if %BUNDLESIZE% LSS 1000000 (
  echo ERROR: bundle is only %BUNDLESIZE% bytes - truncated, do not upload
  exit /b 1
)

copy /Y "%BUNDLE%" app-release.aab >nul
for %%F in (app-release.aab) do set COPIED=%%~zF
if not "%COPIED%"=="%BUNDLESIZE%" (
  echo ERROR: copy size mismatch %COPIED% vs %BUNDLESIZE%
  exit /b 1
)

echo.
echo BUNDLE OK - app-release.aab
echo Size: %COPIED% bytes
echo Signed with release-key.jks ^(alias redstudios^)
echo.
echo Upload app-release.aab to Play Console -^> Test and release -^> Closed testing.
