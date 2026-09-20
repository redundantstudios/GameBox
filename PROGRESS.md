# Project Progress

## Current State — 2026-09-20 (shell UI pass 3, `main @ 757fc6e`)
- **ALL GAMES** shipped: brand-green band on Home -> `ModeActivity(EXTRA_ALL_GAMES)` lists every
  bundled game; launching from there uses `ModeActivity.defaultPlayers(game)`.
- **Dark mode root cause fixed and verified in both themes.** A custom Drawable inflated from XML
  gets the *application* context, which never sees AppCompat's night override — that is why the
  page background stayed light while the views went dark. Backgrounds are now applied from code
  (`ThemedActivity.applyShellBackground()`), `bg_shell.xml` deleted, and `ThemedActivity` adds a
  self-healing `onResume` recreate check (stopped screens can no longer keep a stale theme).
- **ChunkyCardView leak fixed**: the shadow is the exact card shape translated by the offset and
  the border is stroked inside the body edge; press feedback is clipped to the rounded body.
- **Settings theme selector un-inverted** (`applyPair(selThemeDark, selThemeLight, isDark)`).
- Home header rebuilt: single-line auto-sized brand title, 34dp gear tucked into the corner, no
  tagline pill, footer is just "Redundant Studios · v1.0" from a string resource.
- Background is texture only (gradient + bloom + dot grid + corner ripples + specks) — the
  floating glyph cards the user disliked are gone.
- Mode/Settings headers: 64dp back button pulled 24dp toward the screen edge, title constrained
  beside it so they cannot collide.
- Notifications: implemented (channels + custom chime, WorkManager daily reminder with skip rules,
  permission ask after the first game launch, Settings section, dev test send). Play-Store
  hardening (exact alarms / battery-optimisation hint) deferred to release prep. See `NOTIFICATIONS.md`.
- Docs index for future sessions: `GAME_IDEAS.md` (game backlog + status board), `NOTIFICATIONS.md`,
  `LEADERBOARD_IDEA.md`, `ONLINE_MULTIPLAYER_PLAN.md`, `COINS_ECONOMY_PLAN.md`, plus the standing
  rules in `CONTRACT.md`, `STYLE.md`, `AGENT.md` and `HANDOFF.md`.

## Previous State — 2026-09-19
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
