# Project Progress

## Portrait game orientation from a landscape device — FIXED, awaiting director's device pass — 2026-09-25
- **Root cause found.** `GameActivity` declared `android:screenOrientation="unspecified"`, so the
  system chose the launch orientation from the sensor/user-rotation. On a phone held in landscape
  the activity was **created in a landscape configuration**, and only then did `onCreate`'s
  `requestedOrientation = PORTRAIT` turn it: the portrait game's first frame was genuinely sideways,
  and the display rotated to portrait afterwards. A runtime request alone can never close that
  window, because it runs *after* the launch configuration is already decided.
- **Fix (two layers, no overlay, no new screen):**
  1. `AndroidManifest.xml` — `GameActivity` now pins `android:screenOrientation="portrait"`, so the
     activity is always CREATED portrait whatever the caller, the sensor or a previous landscape
     game left behind.
  2. `GameActivity.onCreate` keeps its early `requestedOrientation = SCREEN_ORIENTATION_PORTRAIT`
     as the second layer (a launch that arrives with the activity already in the task).
  A **landscape** game is unaffected in intent: it is created portrait, then `setupOrientation`
  (game manifest) asks the display to turn, so the platform still animates a real rotation instead
  of the activity starting up already sideways.
- **`setupOrientation` no longer has an `unspecified` branch** — landscape turns the display,
  anything else stays portrait. `unspecified` was the bug: it hands the choice to the sensor.
- **Dead code removed:** the unused `ORIENTATION_AFTER_TRANSITION_MS` constant (the old
  "apply the orientation after the entry transition" idea) and an empty `gameRoot.post {}` whose
  comment claimed the orientation was still to be applied after the animation.
- **Device evidence (A059, `user_rotation=1` / display ROTATION_90 with Chrome in front, app task
  force-stopped so a brand-new instance was created while the display was landscape):**
  - portrait game (`checkers`): display went ROTATION_90 -> ROTATION_0, and logcat showed
    `page started/loaded/paint/reveal` with **no `config change` line at all** — the activity was
    created straight in portrait, which is exactly what the fix claims.
  - landscape game (`chicken-chaos`): `config change +946ms (2)` then page load/reveal at +1642ms,
    display ROTATION_90 — the real rotation is intact.
- **Still to confirm by the director on the device:** the visible symptom is gone when a portrait
  game is opened from a phone held in landscape (and that back-to-back landscape -> portrait game
  changes still read cleanly). Not to be treated as verified until then.


## Checkers puzzles — Gould set wired up and playable — 2026-09-24
- **`Checkers_puzzels_goulds_problems_all.json` is now live in the game.** All 678 records
  load from `app/src/main/assets/games/checkers/puzzles.js` (`window.CHECKERS_PUZZLES`),
  which `index.html` already loads via `<script src="puzzles.js">`. Tiers: 206 easy /
  262 medium / 210 hard, 0 rejected, DB builds in ~11 ms on device.
- **Three bugs were stopping every puzzle from being accepted, and the hub said
  "NO PUZZLES YET" for all three:**
  1. `pdnTo64()` mirrored the row but took the column parity from the *unflipped* row, so
     **all 32 PDN squares mapped onto light squares** - every puzzle board was nonsense.
     The runtime self-test that would have caught it is deliberately skipped in `boot()`.
  2. `verifyGould()` required the source `result` winner to be the side to move, but the
     JSON pairs them inverted in **641/678** records (`W,0-1` = 364; `B,1-0` = 277), so it
     threw away ~95% of the set by construction. The field is the source game's outcome,
     not the problem solution, so it is no longer a gate - the side to move is the solver.
  3. It demanded **exactly one** winning move inside 12 plies; real positions have several
     (`gould-008` has two at depth 12) and Gould's long wins need 20+ plies.
- **Puzzle mode is now "win the position" instead of "match one stored move."** Gould's
  JSON carries no solutions, and deep search cannot prove them on a phone, so
  `Tools/_gen_checkers_puzzles.js` bakes engine-ready coordinates at build time and the
  bot defends while the player must actually win (`botColor()`, `puzzleFailed()`,
  `matchesSolution()`; the bot now moves in puzzle mode too). Where offline search *did*
  prove a first move the instant-shop path still fires ("SHOT FOUND!"): 6 records so far.
  Tools: `_build_checkers_puzzles.js` (offline prover), `_gen_checkers_puzzles.js`
  (asset writer), `_check_checkers_db.js` (loads the asset through the real PZDB path).
- **Verified on device** (Pixel, debug): logcat `[checkers] gould DB: 678 checked,
  206 easy / 262 medium / 210 hard, 0 rejected`; hub reads "206 ready / 262 ready /
  210 ready"; a puzzle opens with every piece on a dark square and the bot replies.

## Brand, badge and folder structure — 2026-09-24
- **New app logo: `sources/shellDesignReferences/app logo.jpeg`.** It is the launcher icon
  now - all five mipmap densities, the round variants, and the adaptive icon (the
  foreground is the art at 76% on a 108dp canvas, and the adaptive background is written
  to the artwork's own corner colour `#FEF6E3`, so the masked icon reads as one piece of
  art instead of a logo on a dark plate). Built by `Tools/_gen_launcher_icons.ps1`. The
  splash still shows the Red Studios mark from `brand/red-studios-logo.jpg` on purpose:
  brand first, then the app.
- **The NEW tile badge is now the director's orange ribbon** (folded left end,
  swallow-tail right end, deep-rust outline, cream NEW text), matching the provided art.
  `Tools/_gen_new_badge.py` generates the vector; the old red ribbon is gone.
- **The repo is reorganised** and every tool and doc was re-pointed at the new
  locations: `Tools/` (generators, validators, the syntax gates), `sources/` split into
  `LockedGames/`, `Playable Games/` and `shellDesignReferences/`, `FuturePlans/` (the
  backlog and the four plan docs), `brand/`, `prompts/`. The Planet Merge rollback copies
  are deleted, so the Planet Merge prompt now says so. All 20 prompt files + README were
  regenerated with the new paths.
- **Two footguns fixed in `Tools/`:** `_gen_launcher_icons.ps1` resolved its paths from
  its own folder (after the move it looked for `Tools/sources/...`); and
  `generate_icons.py` was a second launcher-icon generator still building the old studio
  mark - re-running it would have silently put the old logo back on the home screen, so it
  is now splash-only. All the generators resolve their paths from `__file__` and run from
  anywhere.
- **The moves are not committed yet** (`git status` shows the old paths as deletions and
  the new folders as untracked) - the next commit should be one rename commit.
## Shell notes — 2026-09-24 (game transition, per-game prompts, scratch cleanup)
- **Games move BY ORIENTATION.** A landscape game RISES from the bottom: the vertical
  pair `game_in` / `game_out` (up from the bottom edge while the page it came from eases
  30% up and out) on the way in, and `game_back_in` / `game_back_out` (sink back down the
  way it arrived) on the way out. A portrait game slides horizontally like every other
  page, because nothing is turning sideways underneath it; non-game pages never change.
  `ShellTransition.openGame / closeGame / armGame` take the orientation flag, wired at
  all three launch points (`MainActivity` deep link, `ModeActivity.launchGame`,
  `GameActivity` arm + exit) and read it from the game manifest.
- **One prompt file per game: `prompts/<manifest-id> prompt.md`** (20 files + `README.md`),
  generated by `Tools/_gen_game_prompts.py` from `FuturePlans/GAME_IDEAS.md` (§1 status board, §6 entries, §12
  prompt contract). Each file is a complete, handable build prompt: the idea, the target file,
  the manifest values, the game's own specifics, the 11 hard shell requirements, the do-not
  list, the definition of done (syntax gate -> build -> install) and the open questions. They
  are generated - edit the data in the script and re-run, never the files.
- **Local scratch is gone: about 1 GB of test images and one-off tooling was deleted** - the
  whole `_tmp/` tree (device screenshot frames, contact sheets, rotation logs, probe/patch
  scripts, the Chicken Chaos headless harness and its blueprint renderer), the four
  `sources/Screenshot_*.png` evidence shots, and three spent one-off scripts
  (`_cc_clicks.py`, `_cc_chess_puzzles.py`, `_knight_preview.py` + its preview PNG). Kept
  because they are tools, not tests: `_gen_*.py` generators, `_check_js_syntax.js`,
  `_validate_chess.js`, `_install_chess.py`, `_embed_font.py`, `_import_tiles.py`; kept because
  they are pending work: `_pm_fixes*.py` (Planet Merge) and `chekcers_pending fixes.txt`.

## Current State — 2026-09-23 (Chicken Chaos v3 pass — shipped and locked)
- `app/src/main/assets/games/chicken-chaos/index.html` is the shipped, **locked** copy
  (`STUDIO_GAME_MANIFEST version: 4`); the root `Chicken Chaos.html` stays reference-only.
- **Rules:** SCORE = **chickens caught**. The `/10` target and the early-win path are gone; a match
  always runs the full 60 s and the winner is whoever caught more (ties called as ties).
- **Text sizes:** every in-game text is a caption now, not a billboard — `GO!`, the countdown digits
  and `TIME UP!` are `ch*0.095–ch*0.115` (30–56 px here, ~1.3× the timer digits); the hint pill is
  `ch*0.036` (12–16 px) and hugs **its own text** (`measureTxt`) instead of a fixed plate. The hint
  sits in the **BOTTOM band** (`ch - safeB - h - ch*0.055`), clear of the HUD strip and of the corner
  joystick / dash controls.
- **Chrome:** back / gear are the game's own **UNSELECTED toggle button** — `UI.btnDark`
  `rgba(60,50,35,.72)` with the `#241c10` outline, exactly the LOCAL / VS BOTS pair when they are
  OFF — and white icons. The in-game **pause keeps its ORIGINAL dark translucent disc**
  (`fill:'rgba(40,30,20,.6)'`, `stroke:'rgba(255,255,255,.4)'`), not the chrome face. The `DASH`
  caption is removed so the mirrored chevrons sit on the exact button centre.
- **HUD:** catch boxes are square, number-only and deliberately **smaller than the round pause
  button** (37 px vs 43 px here); the left group is right-aligned against the dead-centre timer and
  the right group starts past the pause.
- **Result card:** narrower than the first cut (`pw = ch*1.60` → 658 px here, was 776 = 90 % of the
  screen). The board is a **cream-to-wood vertical gradient**, the **LEFT half is a grass paddock
  sized to the bird** (`gh = 37.5*csc + pad*2.6`, so the grass reads as ground instead of an empty
  green column) carrying the **START-PAGE chicken** — plain white, no colour wash, drawn straight
  onto the canvas (`drawChickenAt` + `ck.open`), so the comb and beak can no longer be cropped by the
  old sprite box. The **RIGHT half** carries the win / tie headline in the **TIME UP! styling**
  (`#ffd23e` with the dark-brown `OUT` outline at `fs*0.16`) plus a 6 px accent rule in the winner's
  colour, `CHICKENS CAUGHT`, a one-row-per-player catch table (colour chip, colour name, count, the
  winner's row tinted **and** tagged `WINNER`) and PLAY AGAIN / MENU. No colour band, no stars.
- **Ads:** the interstitial never fires on match end (it covered the result card in the same frame);
  it fires when the player **chooses** — PLAY AGAIN or MENU — and the tap then continues into the new
  match / the start page. A second tap while an ad is in flight still acts immediately.
- **Feel:** chicken slowed (208 → 168, panic ×1.10, turn 4.6); per-second warning ticks over the last
  10 s, louder + haptic inside the last 5.
- **Locked-in plumbing:** first tap is audible again (the pre-unlock audio queue keeps only the
  newest, fresh request, so the idle cluck cannot steal it) plus an unlock warm-up buffer;
  `Game.setSettings` handles sound / haptics / volume pushed from the shell; the game's own WebView
  `requestFullscreen()` call is removed — the shell owns the landscape turn
  (`SCREEN_ORIENTATION_SENSOR_LANDSCAPE`).
- **Verification without touching the device:** `_tmp/cc_stub.js` + `_tmp/cc_headless.js` run the REAL
  shipped inline script in a stubbed DOM/canvas and measure every drawn path — now **56 assertions,
  ALL PASSED**: start-page chrome, the HUD row (4 boxes vs the pause size, timer dead-centre), the
  hint's bottom band, DASH-icon centring, the whole result card (width, gradient board, paddock,
  the chicken's parts/whiteness/uncropped beak, the row table, both buttons, band-free), the
  `TIME UP!` headline match, `Game.setSettings`, the ad-on-tap timing, the rewarded-callback landmine
  and the audio-unlock replay. The stub now tracks `scale()` inside save/restore (DPR baseline stays
  treated as identity, so everything stays in CSS px) — that is what exposed the real bird size.
  `_tmp/cc_blueprint.py` renders those draw calls (with their real colours) to
  `_tmp/cc_result_card.png`, `_tmp/cc_card_win.png` and `_tmp/cc_card_tie.png` for a layout eyeball,
  and `_tmp/cc_dump.js` prints the ops as JSON.
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
- Docs index for future sessions: `FuturePlans/GAME_IDEAS.md` (game backlog + status board + roadmap), `NOTIFICATIONS.md`,
  `FuturePlans/LEADERBOARD_IDEA.md`, `FuturePlans/ONLINE_MULTIPLAYER_PLAN.md`, `FuturePlans/COINS_ECONOMY_PLAN.md`, plus the standing
  rules in `CONTRACT.md`, `STYLE.md`, `AGENT.md` and `HANDOFF.md`.
- **Agreed order of work (2026-09-20) — `FuturePlans/GAME_IDEAS.md §11`:** finish the shell (landscape path,
  remaining polish, `category`/PARTY surface) → **Planet Merge fix in its own session** → **Chess
  integration** (manifest/lifecycle/ads + puzzle mode from `sources/LockedGames/chess_puzzles.txt`) → then the seven-game
  integration queue one at a time (Chicken Chaos, Memory Grab, Egg Rush, Balloon Battle, Bomb Relay,
  Last Balloon, Pen Fight) → then new games via request prompts (§12).
- **Two standing rules:** we never author a game from scratch in this repo — the finished games in
  `sources/` are *finished, playable games awaiting shell integration*, not prototypes; and a new
  game is requested as a `FuturePlans/GAME_IDEAS.md §12` prompt (brief idea + full shell-stack
  requirements).

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
