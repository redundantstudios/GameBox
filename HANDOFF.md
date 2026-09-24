## Handoff 2026-09-20 (current) — shell UI pass 3
- `main @ 757fc6e` — shell builds (`BUILD.bat` green, ~10.4 MB), installed and visually verified on
  device `0015935AT001973` in BOTH themes. Bundled games: `assets/games/ludo/` (2-4P),
  `assets/games/planetmerge/` (1P).
- Verification shots from this pass: `_v2_home_dark.png`, `_v3_allgames_dark.png`,
  `_v5_settings_dark.png`, `_v6_home_light.png`.
- NEW: **ALL GAMES** — brand-green CTA band on Home opens `ModeActivity` with `EXTRA_ALL_GAMES`;
  that screen lists every bundled game and launches with `ModeActivity.defaultPlayers(game)`
  (2 players for multiplayer titles, 1 for single-player). Verified: tap Ludo from All Games
  -> `GameActivity: Launching game ludo: players=2`.
- NEW: `ThemedActivity` base class — inits settings and applies the theme before
  `super.onCreate()`, plus a self-healing `onResume` recreate check.
  `MainActivity`, `ModeActivity`, `SettingsActivity` extend it; `GameActivity` intentionally does
  NOT (a recreate there would reload the WebView and lose game progress).
- Shell styling rounds landed earlier: `bb78817`, `d7cc5f7`.
- Developer mode gating and settings propagation are unchanged (`10X BOT TEST`,
  `SettingsManager.syncToGameStore()` + `Game.setSettings(json)`).

### ⚠️ DARK-MODE ROOT CAUSE — remember this forever
A **custom Drawable inflated from XML** (`android:background="@drawable/bg_shell"`) is
constructed with the **APPLICATION context**, which never receives AppCompat's day/night
override configuration. Result: views went dark while the page background stayed light —
exactly the reported "dark theme only darkened the settings cards". Fix: build such drawables
from code with the **Activity** context, via `ThemedActivity.applyShellBackground()` right
after `setContentView()`. `bg_shell.xml` was deleted on purpose so nobody can reintroduce it.

### Reported Home defects — ALL FIXED and verified on device
1. Header overlap -> brand is a single-line auto-sized `AppCompatTextView` (no Toolbar, and the
   tagline pill is gone).
2. Footer mojibake -> `@string/footer_brand` ("Redundant Studios · v1.0"); the footer is only
   name + version.
3. Vertical imbalance -> band + label + grid are vertically centred inside a `fillViewport`
   NestedScrollView, so a short list splits the leftover space instead of dumping it all above
   the footer. If the user prefers it packed to the top, that is a one-line `gravity` change.
4. Background cards -> gone. The background is texture only: gradient + top-left bloom + dot
   grid + corner ripple arcs + tiny accent specks (`ShellBackgroundDrawable`).

Also fixed in this pass: the ChunkyCardView shadow seam (the shadow is now the exact card shape
translated by the offset, and the border is stroked inside the body edge), and the Settings theme
selector was inverted — `applyPair(on, off, value)` must be called as
`(selThemeDark, selThemeLight, isDark)`, otherwise picking Dark jumps back to Light.

### NEXT — agreed order (2026-09-20)
1. **Finish the shell first (Phase 0).** Open items: the **landscape orientation path verified** (it
   blocks four landscape games and no shipped game has ever run landscape), the remaining UI polish
   the user reports, a `category` manifest field + a PARTY entry on Home, and extracting the
   pass-n-play "pass to X" + screen-flip pattern once (it is hand-copied in Bomb Relay and Memory
   Grab today). Notifications release-hardening is deferred to store prep.
2. **Planet Merge — first game priority, its own dedicated session.** Several real issues; do not
   bundle anything else into that session. Rollback references:
   `backup_pm_knowngood.html`, `previous_pm.html`, `previous_known_good.html`. The shipped copy is
   `app/src/main/assets/games/planetmerge/index.html`.
3. **Chess integration.** The game is functionally complete; it needs the standard checklist
   (manifest, lifecycle, settings sync, ads) plus puzzle mode built from `sources/LockedGames/chess_puzzles.txt` —
   10 500 Lichess puzzles in easy/normal/hard buckets, 2.6 MB, so a packed subset must be chosen.
4. **Integration queue, one game at a time** — Chicken Chaos (manifest already valid, so essentially
   QA) → Memory Grab → Egg Rush → Balloon Battle → Bomb Relay → Last Balloon → Pen Fight. Full table
   and reasoning in `FuturePlans/GAME_IDEAS.md §11`.
5. **Game backlog and the two new rules** — `FuturePlans/GAME_IDEAS.md` holds the status board (§1), the roadmap
   (§11) and **§12, the game-work request-prompt template**. Rules that now stand: (a) **we never
   author a game from scratch here** — the finished source games in `sources/` are *finished, playable games awaiting
   shell integration*, not prototypes; (b) a new game is requested as a §12 **prompt** (the idea
   stated briefly + the shell-stack requirements), authored elsewhere, then integrated here.
6. **Audio assets are generated, NOT committed** — the `.ogg` files in `app/src/main/res/raw/`
   are gitignored on purpose, but the files themselves must stay on disk (the code references them as
   `R.raw.*`). On any fresh clone or new machine, run `python _gen_audio.py` and
   `python _gen_bgm.py` **before** `BUILD.bat`, otherwise the Kotlin `R.raw.*` references do not
   compile. `notif_chime.ogg` has no committed generator yet (see `BUILD.md`, "Audio Assets").


### ⚠️ USER FEEDBACK 2026-09-20 00:58 — ADDRESSED IN `757fc6e` (history below)
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
