## Handoff 2026-09-20 (current)
- `main @ d7cc5f7` — shell builds, installs, runs (verified install 00:55:27, no inflation crash).
  Bundled games: `assets/games/ludo/` (2-4P), `assets/games/planetmerge/` (1P).
- Shell styling rounds landed: `bb78817` (ChunkyCardView + ShellBackgroundDrawable + mode/tile
  polish) and `d7cc5f7` (settings page rebuilt with SelectCard + shell→game settings sync +
  player-count preselect).
- Build gate: `BUILD.bat` → BUILD SUCCESSFUL, ~10.4 MB. JS gate for game scripts:
  `node -e` inline script parse (1 script, 0 errors). Root `shell-debug.apk` is the install artifact.
- Developer mode: Settings → INTERFACE → Developer mode (default OFF) is what makes
  `GameActivity` append `&dev=1`; that flag is what shows Ludo's `10X BOT TEST`. So the dev button
  is now hidden for real players **and** reachable for testing. Replaces the old BuildConfig.DEBUG rule.
- Settings propagation: shell writes `shell:settings` JSON into the `studio_games` prefs (the exact
  key the games' `Studio` shim reads) via `SettingsManager.syncToGameStore()`; `GameActivity` also
  pushes changes into a live game with `Game.setSettings(json)` on resume. Ludo implements it
  (sound/haptics/volume, volume via the SFX master gain).

### ⚠️ USER FEEDBACK 2026-09-20 00:58 — READ BEFORE ANY MORE UI WORK
> "i said use inspiration and use style from the designs but you took everything and dumped it in
> the shell. some things good and some not. **settings is a complete mess**."

Translation, so this mistake is not repeated:
- The Design--ref folder is **inspiration for style language**, NOT a checklist to copy 1:1.
  Do **not** transplant every element (floating glyph cards, tagline pill, chunky borders on
  every surface) into the shell.
- **Settings is the priority to fix.** Current implementation is overloaded: pill ON/OFF pairs for
  every boolean, triple pills for haptics, big chunky cards per section. Too heavy / too busy.
  Likely direction: simpler, calmer settings — one row per setting, compact, fewer boxes, keep the
  warm cream palette and rounded language but drop the visual noise.
- Keep what works (mode cards, tiles, palette, background *taste*) and dial the rest back.
- Ask the user which specific parts to keep before rewriting; do not do another sweeping pass blind.

#### Concrete defects visible in the 2026-09-20 00:59 Home screenshot (fix these, they are bugs not taste)
1. **Header overlap**: "REDUNDANT STUDIOS" wraps to 2 lines and the brown tagline pill is drawn on
   top of the second line ("STUDIOS"). Cause: title sits in a `Toolbar` of fixed `?attr/actionBarSize`
   height, so it cannot fit 30sp two-line text, and the pill is constrained to the toolbar bottom.
   Fix: either force a single line (`maxLines=1` + smaller size / `ellipsize`) or stop using Toolbar
   for the header and lay out title + pill in the ConstraintLayout with real spacing.
2. **Mojibake in the footer**: renders `Redundant Studios Â· v1.0`. The middle dot in
   `activity_main.xml` was corrupted by a PowerShell `Get-Content -Raw` / `Set-Content` round-trip
   (used when fixing "Design--ref" inside XML comments). `strings.xml` copies render correctly.
   Fix: replace the inline literal with a string resource, and **never** round-trip res XML through
   PowerShell text cmdlets — use the editor tool so encoding is preserved.
3. **Home vertical imbalance**: 4 cards on top, then a large empty band before the footer.
   Decide deliberately (bigger cards, or a "what's new / featured game" block) rather than leaving a gap.
4. **Background glyph cards** currently sit *behind* the content grid and a star pokes out from under
   the title — they need to be either much fainter or pushed to the outer margins so they read as
   texture, not as content.

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
