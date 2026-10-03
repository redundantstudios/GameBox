@echo off
rem Runs the REAL AdPolicy source on a plain JVM - no device, no Android runtime.
rem
rem WHY THIS EXISTS
rem The ad caps (1 revive per run, NO cap on cosmetics/themes/in-game rewards,
rem 120s interstitial gap) are the entire point of the ad governor, and they are
rem pure decision logic.
rem The first attempt at checking them was a JavaScript transcription of the
rem Kotlin, which proves nothing: a transcription can pass while the shipped
rem code is wrong. This compiles the actual file that ships, alongside a fake
rem Context, and asserts against it.
rem
rem It uses the Kotlin compiler already in the Gradle cache, so it needs no
rem network access. JUnit was not an option: only junit-bom POMs are cached,
rem not the jars, so a test dependency could not resolve offline.
rem
rem   Tools\adtest\run.bat
setlocal
set JAVA=C:\Users\srinu\.jdk\jdk-17.0.10+7\bin\java.exe
set G=%USERPROFILE%\.gradle\caches\modules-2\files-2.1
set KC=%G%\org.jetbrains.kotlin\kotlin-compiler-embeddable\1.9.22\9cd4dc7773cf2a99ecd961a88fbbc9a2da3fb5e1\kotlin-compiler-embeddable-1.9.22.jar
set KS=%G%\org.jetbrains.kotlin\kotlin-stdlib\1.9.22\d6c44cd08d8f3f9bece8101216dbe6553365c6e3\kotlin-stdlib-1.9.22.jar
set SR=%G%\org.jetbrains.kotlin\kotlin-script-runtime\1.9.22\f8139a46fc677ec9badc49ae954392f4f5e7e7c7\kotlin-script-runtime-1.9.22.jar
set DE=%G%\org.jetbrains.kotlin\kotlin-daemon-embeddable\1.9.22\20e2c5df715f3240c765cfc222530e2796542021\kotlin-daemon-embeddable-1.9.22.jar
set TR=%G%\org.jetbrains.intellij.deps\trove4j\1.0.20200330\3afb14d5f9ceb459d724e907a21145e8ff394f02\trove4j-1.0.20200330.jar
rem The compiler needs org.jetbrains.annotations on its OWN classpath, not just
rem the compile classpath: it emits @NotNull/@Nullable onto the bytecode and
rem fails with NoClassDefFoundError if the annotation classes are missing.
set AN=%G%\org.jetbrains\annotations\23.0.0\8cc20c07506ec18e0834947b84a864bfc094484e\annotations-23.0.0.jar
set AJ=C:\Users\srinu\.android-sdk\platforms\android-36\android.jar
set OUT=%TEMP%\adtest_out
set SRC=%~dp0..\..\app\src\main\java\com\redundantstudios\arcade\ads\AdPolicy.kt

if exist "%OUT%" rmdir /s /q "%OUT%"
mkdir "%OUT%"

"%JAVA%" -cp "%KC%;%KS%;%SR%;%DE%;%TR%;%AN%" org.jetbrains.kotlin.cli.jvm.K2JVMCompiler ^
  -nowarn -cp "%KS%;%AJ%" -d "%OUT%" ^
  "%SRC%" "%~dp0AdPolicyTest.kt"
if errorlevel 1 (echo COMPILE FAILED & exit /b 1)

"%JAVA%" -cp "%OUT%;%KS%;%AJ%" com.redundantstudios.arcade.ads.AdPolicyTest


