## Handoff 2026-09-19 (current)
- `main @ a620101` — shell builds, installs, runs. Last verified on-device APK:
  19-19-2026 19:58 install time, built by `BUILD.bat` (root `shell-debug.apk`).
- Bundled games: `assets/games/ludo/` (2-4P, has its own SFX/AI/themes + SDK ad calls) and
  `assets/games/planetmerge/` (1P). All `test*` canaries deleted.
- Ads: `AdMobManager` uses Google **test** unit IDs and all three formats load. On-device proof:
  banner "Test Ad 320x50" rendered under the Ludo board. Rewarded/interstitial load confirmed
  in logcat (`Rewarded ad loaded successfully`, `Interstitial ad loaded successfully`).
- **Open thread: user reports no ads in normal play.** Root cause found and fixed in a620101
  (bridge ran off the UI thread -> AdMob `#008 Must be called on the main UI thread`; rewarded
  requests landing before load were dropped; Ludo swallowed the reward callback). Fix is
  committed + installed, awaiting the user's hands-on confirmation.
- Dev affordances that must not ship: Ludo `10X BOT TEST` button (New Game screen) and the
  `?dev=1` flag `GameActivity` appends to game URLs in debug builds only.
- `PROGRESS.md` now carries the current state, launch blockers, and the landmine list
  (UI-thread rule, dp-vs-px banner size, SettingsManager init, undefined reward arg, BUILD.bat
  history). Read it before touching ads or the bridge.

### Archive (superseded)
- settings phase (S3.1) work EXISTS but is BROKEN — preserved on
  branch wip/settings-broken (compile errors: NativeBridgeContext
  undefined, SettingsActivity dual companions + bad imports)
- main is at 9515b1d (S3.0) = last known-good shell
- planetmerge asset: check branch tree
  assets/games/planetmerge/index.html — if present and ~263KB with
  zero tokens, cherry-pick that file to main tomorrow OR re-copy
  from dist artifact
- TOMORROW on laptop: pull main → BUILD.bat → then EITHER redo
  settings phase properly with fixed spec, OR proceed to S3.2
  bundle with test games still present
- Launch checklist reminder: testred/testbridge/testlandscape
  canaries stay until planetmerge is verified on device
