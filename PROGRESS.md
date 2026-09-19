# Project Progress

## Current State — 2026-09-19
- `main @ a620101` = last known-good shell. `BUILD.bat` green, APK installed and running on
  device `0015935AT001973` (1080x2392 @420dpi).
- Bundled games: **ludo** (2-4P, portrait) and **planetmerge** (1P). Test canaries removed.
- App name: **Redundant Arcade**. Portrait-locked. Brand splash (Redundant Studios logo, black).

## Shipped and verified on device
- **Dark mode**: Settings toggle drives `AppCompatDelegate.setDefaultNightMode`; persists across
  process death; all shell surfaces (Home / Mode / Settings / toolbar) theme correctly.
- **Settings UI (design-ref)**: 4dp chunky brown borders, 20dp radii, green switches, green
  haptic pills (SOFT / CRISP / HEAVY) replacing RadioButtons, orange volume slider.
- **Haptic previews**: vibration toggle and haptic-profile change both fire an immediate preview buzz.
- **Home**: left-aligned bold title, mode cards with live game counts, 0-game modes hidden,
  empty states on Home and Mode page, re-scan of games on resume.
- **Game grid**: full-width 1:1 square tiles, chunky borders, press-squish animation.
- **Ludo**: 1ST / 2ND / 3RD / 4TH rankings — play continues after each finisher (no freeze);
  rank trophy + place text painted on the finished player's house square (no pawn badges);
  finished pawns laid out in a narrow numbered line (no overlap); single clean AI dice sound;
  `10X BOT TEST` dev button on the New Game screen (4 bots, 10x speed).
- **Ads (AdMob, Google test unit IDs)**: banner renders under the game; interstitial and
  rewarded both load. Banner verified visually ("Test Ad 320x50" under the Ludo board).

## Known landmines (learned the hard way)
- `@JavascriptInterface` bridge methods run on a **background thread**; every AdMob `show()`
  must be marshalled with `runOnUiThread`, and `fullScreenContentCallback` must be attached
  **before** `show()` or early events are lost.
- Banner ad size must come from **dp** (`AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize`)
  — passing raw pixels in an `AdSize` gets rejected for exceeding the screen.
- `SettingsManager.init()` must run in **every** entry activity; a cold `GameActivity` start
  skipped it and crashed before ads loaded.
- Ludo's rewarded callback must accept an **undefined** argument (the shell fires the callback
  with no value on success); testing `res==='granted'` swallowed every theme unlock.
- `BUILD.bat` once contained `echo BUILD OK -> shell-debug.apk`, which overwrote the APK with
  the literal text "BUILD OK". Never redirect into the APK path.

## Launch Blockers
- verify real UMP flow with production AdMob IDs + privacy policy URL before submission.
- S3.6.1: Reverted renderer priority policy. Cause: IllegalStateException when called after WebView attach. Lesson: Speculative perf APIs require build-gate AND on-device verification in same phase.
