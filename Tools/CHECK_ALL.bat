@echo off
rem One command to verify EVERYTHING before a build.
rem
rem WHY THIS IS A SINGLE SCRIPT
rem     Two real bugs shipped past a "the file parses" check:
rem       1. root.io read `save.unlocked` before `save` was assigned. The whole
rem          game script died at load and the player saw the static menu over a
rem          black canvas. Every syntax check passed.
rem       2. egg-rush read `let state` ~370 lines before its declaration, a
rem          temporal-dead-zone ReferenceError. Same visible symptom, and the
rem          game had been unplayable the whole time.
rem     Parsing is not booting. So this script actually EXECUTES every game.
rem
rem     It is verification only - it never rewrites an asset. Use
rem     `node Tools\_integrate_games.js` deliberately when you mean to
rem     regenerate, so a check can never silently overwrite your work.
rem
rem     Run from the repo root:   Tools\CHECK_ALL.bat
setlocal
cd /d "%~dp0.."

echo.
echo === 1/5  integrated games (manifest, back button, no network) ===
node Tools\_verify_integrated.js
if errorlevel 1 goto :fail

echo.
echo === 2/5  every game actually boots, runs frames, and opens its menus ===
node Tools\_smoke_games.js
if errorlevel 1 goto :fail

echo.
echo === 3/5  rewarded-ad contract (no grant-on-refusal, no shared callback) ===
node Tools\_ad_contract_check.js
if errorlevel 1 goto :fail

echo.
echo === 4/5  ad governor (caps, cooldown, interstitial policy) ===
rem run.bat prints "RESULT: PASS" or "RESULT: FAIL" and exits non-zero on failure.
rem Read the verdict from its output rather than trusting errorlevel (errorlevel
rem propagation through `call` in batch has burned us before).
call Tools\adtest\run.bat > "%TEMP%\adtest_result.txt" 2>&1
findstr /C:"RESULT: PASS" "%TEMP%\adtest_result.txt" >nul
if errorlevel 1 goto :fail

echo.
echo === 5/5  done ===
echo All checks completed. Review any FAIL above before building.
exit /b 0

:fail
echo.
echo CHECKS FAILED - do not ship this build.
exit /b 1
