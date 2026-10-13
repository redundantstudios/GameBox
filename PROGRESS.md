# Project Progress

## Mimic / Knot Away / Truth or Dare — final pass, all three LOCKED — 2026-10-13

All three verified on device and frozen. Any further request becomes a numbered pass on top.

### MIMIC — LOCKED
- **The middle disc showed a player name instead of the stage.** In Last Standing and Own Pattern it
  printed `p.name`, so it read `P5` while a pattern was showing, and `MIMI` when arriving straight
  from MIMI mode (the name was left over from the previous mode). It now shows `WATCH` while the
  pattern plays, and the player's own name during their turn. `WATCH` wears a fixed slate
  (`#3F5570`) that is not in the player palette, so it can never be read as somebody's turn; the
  name wears that player's colour. Solo is unchanged - it is your own marble, so it shows your name.
- **ADD A TILE sat on top of the tiles, then on top of the bottom seat circle.** The seats are on a
  ring of radius `R`, so the lowest is centred at `cy+R` and its edge reaches `cy+R+RP`; the pill was
  placed at `cy+MR*2.35`, which lands inside that circle on a normal phone. It is now measured from the
  real bottom of the board and clamped so a short screen cannot push it off the edge.
- **The start-page back button was a filled triangle on a flat outlined circle** - and it was not even
  `backBtn()`, which only serves the setup and how-to popups. `drawTitle()` drew its own. Both now use
  the same `clayCircleBtn(CREAM, C_DARK)` as the settings gear and share one `drawBackArrow`.
- **The arrow pointed right and sat off-centre.** First the apex was on the right; then the extents
  ran `-0.8r` to `+1.5r`, leaving it visibly right of centre. Now symmetric at `-0.78r`..`+0.78r`.
- **`SFX is not defined` on the mode-setup back button** — a previous pass added `SFX.tap()` to two
  handlers, but MIMIC has no `SFX` object: its audio is `tapN()`/`clayTone()`/`toneAt()`. Both threw
  mid-handler. Removed; `uiTick()` already plays the click.
- **Volume.** Ticks were firing at 0.08–0.30 into a 0.95 master. One `SND_BOOST=1.45` on the peak gain
  of each of the three tone helpers, clamped below 1 so layered voices cannot clip.
- BEST SCORE moved from the top-right corner to centred under HOW TO PLAY, anchored to the title
  geometry (`g.howY`/`g.btnH`) so it tracks the button at any screen size.

### KNOT AWAY — LOCKED
- **Hint/undo appeared to reset.** `restartLevel()` restored `G.undoSnap`/`G.hintSnap`, a snapshot taken
  once when the level loaded and never updated, so a retry handed back the pre-use count. Both read live
  from `save.undo`/`save.hint` now; snapshots deleted, and the save is flushed before leaving the game.
- **The level-unlock ad never fired.** `rewarded()` is declared inside the shell integration IIFE, so it
  is NOT global — calling it from the game block threw a `ReferenceError` and nothing happened on tap.
  Now `window.__shellRewarded('knotaway.level_unlock', ...)`, the same door the hint/undo refill uses,
  with a guard that toasts `AD NOT AVAILABLE` if the bridge is missing.
- **Rewarded ad to open the next level for 30 minutes.** The offer sits on the first locked level — the
  one whose predecessor is open — never on any other. Gold chip + pulsing ring, tap opens a confirm
  sheet, then a toast naming the level. Three stars promotes the level to a permanent unlock; otherwise
  it lapses after 30 minutes and expired grants are pruned on load.
- **Live countdown on the tile, above the level number.** Absolute expiry is kept on the element as
  `data-until`, so a reload mid-countdown resumes the right number instead of restarting from 30:00.
  Gold, turning red in the last minute. Ticks once a second, tied to `showScreen` so it only runs
  while the level list is open. Also shown on the in-game HUD chip for that level.
- **`locked` class was applied to OPEN levels** — the condition read `unlocked&&!tmp`. Caught by a
  runtime test, not by the syntax or boot checks: level 1 rendered dimmed with lock styling from the
  first launch. Now `!unlocked&&!tmp`.

### TRUTH OR DARE — LOCKED
- **The back button was a `position:fixed` white circle containing a single `‹` character, floating
  over the `<h1>`** — hence the title overlap. It is now a real `.icon-btn` using the game's own
  `#i-back` sprite (added), living in the top row: `space-between` puts it on the far left, square with
  help and gear on the right. The visibility toggle uses `grid`, not `block`, so the icon-btn grid
  centring survives.
- Footer now reads **REDUNDANT STUDIOS** (the `ARCADE PARTY` wordmark left the top row to make room).
- **GIVE ME ANOTHER removed** — button and handler. The handler had to go too: `$('#plansBtn')
  .onclick` would have dereferenced null and thrown, killing every binding below it in the block.
  The plans overlay stays in the markup, unreachable.
- How-to list renumbered after losing its redraw step.

### Verification note
- Parse + boot smoke is NOT sufficient here. It let through two real runtime bugs this session (an
  inverted `locked` class, and a temporal dead zone that would have broken the level list entirely).
  `Tools/_ka_runtime.js` / `_ka_runtime2.js` lift the real `renderLevels`/`lvlOpen`/`adEligible`/
  `tempLevel`/`fmtRemain` out of the game IIFE and execute them against a stub DOM. Worth extending
  to the other games before they ship.
- Mid-session a regex in a patch script truncated `carroms/index.html` from 2669 lines to 1698. It was
  recovered from the built APK and confirmed byte-identical by SHA-256 before the audio fix was
  re-applied. Hash-check assets after any bulk text surgery.
- Splices have repeatedly left orphan braces/`</section>`/`});` that parse cleanly only when they do
  not. Several caught pre-build, but the pattern is worth eliminating.

## Carroms — director pass 2: 5 issues, LOCKED — 2026-10-12
- **LOCKED.** Treat `app/src/main/assets/games/carroms/index.html` as frozen: no drive-by edits. Any new
  request becomes a numbered pass on top, recorded here.
- **Back button disappeared from the start page — my own regression.** The previous pass gated it on
   `__shellScreen==='home' && !Panels.isOpen()`, but the home page is ITSELF a panel (`.panel.home` shown
  inside the overlay), so `Panels.isOpen()` is true there as well and the button was hidden everywhere.
  The correct test is whether the panel on screen is `p-home`.
- **The double tap sound was the back button itself.** It is a `<button>`, so the global pointerdown handler
  played the click for it — and its own onclick played it again. Removed the second one; the global covers
  it. (A `_clickClaimed` guard with a `setTimeout(...,0)` release could not have caught this: `click`
  fires after `pointerup`, a separate task, so the flag had already cleared.)
- **Panel transitions: the director wanted SMOOTHER and LONGER, which is the opposite of the last pass.**
  `pop` is now .44s on a soft `cubic-bezier(.22,.75,.28,1)` with a three-keyframe fade-in, and the backdrop
  eases in over .34s so the sheet is never sliding over a snapping backdrop.
- **Seat 1 is always HUMAN.** Every seat offered a BOT/HUMAN toggle, so P1 could be a bot too — which is
  how a bot-only game was reachable. P1 now renders a fixed, non-clickable HUMAN chip and the click handler
  refuses to set index 0 to bot. Subtitle reworded from "PICK BOT OR HUMAN" to "PICK WHO PLAYS".
- **How to Play had no way out.** The card steps (welcome, congratulations) offered only a forward button.
  Added a quiet CANCEL under CONTINUE on the welcome card (clears tutorial state and returns to the start
  page) and BACK on the congratulations card (returns to the aiming lesson).

## Carroms — director pass: 6 issues — 2026-10-12
- **Glitchy panel transitions.** `Panels.show()` toggled `showing` on every panel in one pass, so the
  outgoing and incoming panels animated simultaneously while the backdrop was still fading. Now the
  outgoing panel is unmounted first and the incoming one is mounted on the next frame, so the `pop`
  keyframes cannot overlap the backdrop. The keyframe itself was also softened from `scale(.9)` + 16px
  of travel to `scale(.965)` + 8px.
- **One tap, two click sounds.** A global `pointerdown` listener played the click for any button, AND
  several button handlers played it again themselves — so those buttons fired it twice. The global is
  now the single owner and claims the sound once per press; the two handlers that duplicated it (theme
  grid cell, profile cards) no longer call it.
- **Theme unlock confirmation.** Tapping a locked theme went straight into the ad. There is now a
  confirmation sheet: title, "Watch an ad to unlock <name> for 2 hours?", a swatch of the theme, a note
  about it working offline, and WATCH AD & UNLOCK / NOT NOW. The ad only runs on an explicit YES.
  NOTE: the panel had to be positioned with `position:fixed; inset:0; margin:auto` — as an overlay flex
  item it rendered low in the sheet with its second button off the bottom while every other panel
  centred fine, and `align-self`/`margin:auto 0` did not correct it. Fixed positioning also keeps the
  shared `pop` keyframes from overriding its transform and making it jump on open.
- **Game-over ad: it already had one** (`carroms.gameover`), but it fired BEFORE the panel was mounted.
  Reordered to panel-first, ad immediately after, matching the Connect Four ordering.
- **Back button.** Repainted in the game palette (cream/gold, Baloo 2, `:active` press) and driven by the
   game's own poll with `!important` rules so the shell's inline display loses either way. It now shows
   on the start page ONLY — a settings or theme sheet is an overlay on the start page rather than its own
   screen, so `__shellScreen` stays 'home' while one is open and the button has to hide for those too.
- **First tap / BGM.** `audioEnsure()` was only called from a `pointerdown` listener, so the graph was
  built on the first touch: the game opened silent and that tap did nothing but arm audio. The shell
  lifts the autoplay gate, so the graph and the BGM are built at load.

## Connect Four — director pass 4: the lag, at any cost — 2026-10-12
### Measured, full board, before -> after
```
                        before    after
Janky frames            458 (71%)  53 (1.93%)
50th percentile         14ms      11ms
90th percentile         20ms      12ms
99th percentile         25ms      18ms
Slow issue draw cmds    458       53
High input latency      12998     5103
```
- **The settled marbles were all being rotated.** `drawMarble()` rotates only when `spin` is truthy, and
  settled marbles were passed their stale `m.spin` (`spinV` is 0 for them, but `spin` keeps whatever angle
  the last bounce left). So every marble on the board did a save/translate/rotate/restore plus a
  non-axis-aligned blit - 42 of them once it filled. **That is why it got worse with every turn and
  fall, and it is the single biggest thing here.** They now draw unrotated.
- **Audio node churn.** One drop built ~21 nodes: a four-oscillator clink per bounce plus a seven-node
  first contact, all feeding one ConvolverNode. Bounces now use a two-tone clink with no noise burst and
  no reverb send.
- **The back button was being restyled 2.5x a second.** The shell poll assigned `style.display`
  unconditionally, so during play it rewrote `display:'none'` onto a button already set to none - a
  forced style invalidation in the WebView, forever. It only writes on change now. This was most of the
  input-latency figure.
- **The bot felt slow because it was.** ~2.0-2.3s of deliberate delay per move: a 0.9s watchdog before
  `scheduleAI()` was even called, a 0.55-0.9s "thinking" pause, then 480ms before release. Now 0.3s /
  0.26-0.40s / 240ms.
- **Drop sound** lowered again per the director: `.032` sweep / `.028` body tone, band 760->1900Hz.

## Connect Four — director pass 3: performance, and LOCKED — 2026-10-12
- **Locked.** Treat `app/src/main/assets/games/connect-four/index.html` as frozen: no drive-by edits.
  Any new request becomes a numbered pass on top, recorded here.
### Performance — measured, not guessed
- `adb shell dumpsys gfxinfo com.redundantstudios.arcade` BEFORE:
  `Total frames 643 / Janky 458 (71%)`, `50th 14ms 90th 20ms 95th 22ms 99th 25ms`,
  `Slow issue draw commands: 458`, `GPU 50th 2ms / 99th 4ms`.
  The janky count matching "slow draw commands" exactly, with GPU time at 2-4ms, is the tell: the cost
  is **CPU-side draw-command recording**, not the GPU. (Lesson: profile before optimising - two earlier
  passes on this were aimed at the wrong layer.)
- Cause: per frame the old code stroked two arcs for every filled cell and filled an ellipse for every
  settled marble - ~250 path operations at a full board, redrawn 60x a second from data that never
  changes. The arcs sit at fixed hole positions and the contact shadow is a soft blob, so both are now
  baked into one overlay canvas (`buildOverlay()`) rebuilt only when the grid changes, and blitted.
- `drawMarble()` also blitted three images per marble (shadow, body, gloss) - 126 on a full board -
  when body and gloss never move relative to each other. They are pre-composed into `MSPR[p].full`,
  so a marble is now 2 blits.
- AFTER: `Total frames 2826 / Janky 66 (2.3%)`, `50th 10ms 90th 13ms 95th 18ms 99th 21ms`,
  `Slow issue draw commands: 64`. Jank 71% -> 2.3%; p90 back inside the 16.7ms budget.
### Regression I caused, and fixed
- **The wooden start page went flat.** The pass-2 `resize()` guard replaced the single line
  `buildTable();buildBoard();buildIntroBG();` with the guard plus `buildTable();buildBoard();` -
  silently dropping the `buildIntroBG()` call, so the plank never painted and the start page fell back
  to the flat CSS `#a57743`. **When replacing a line, verify the replacement covers every call on it.**
### Drop sound
- Softened one more step: sweep `1.5k->4.2k @ .10` (hissy) -> `820->2100 @ .05` -> `760->1900 @ .032`,
  body tone `240->150 @ .045` -> `210->135 @ .028`.

## Connect Four — director pass 2: 5 issues — 2026-10-12
## Connect Four — director pass 2: 5 issues — 2026-10-12
- **Intermittent lag: the bot search ran on the main thread.** Medium/hard negamax had a 220ms / 480ms
  budget and executed synchronously, so *every bot turn* froze the whole game for up to nearly half a
  second — exactly the reported "sometimes smooth, sometimes very laggy" (smooth while the marble moved,
  hard-stuck on every bot move). `engine` was turned into a named `engineFactory` so its source can be
  handed to a Web Worker (`const engine=(()=>{...})()` only kept `{choose}`, and `{}.toString()` is
  `[object Object]`). The search now runs off-thread; `easyMove()` reads live state so it stays inline but
  does no search. Falls back to the original synchronous path if the Worker cannot start.
- **No input until the marble settles.** It used to allow a drop while one was still in the air and
  queued the choice in `S.pending` to replay on landing. `canAct()` now also requires `!anyFalling()`,
  which gates the aim drag, the drop and the keyboard together.
- **Slow after an interstitial, two causes.** (a) A fullscreen ad stops rAF for its whole duration, so
  on return the frame clock is stale, the particle backlog is old and the board textures are usually
  gone from the GPU — `afterAd()` now resyncs all of it and is called on every ad return via `shellAd()`.
  (b) Ad show/hide fires a burst of resize events and *each one* rebuilt a full-screen table canvas and
  re-bored all 42 holes — `resize()` now early-returns when the geometry is unchanged.
- **Back button glyph off-centre.** The shell poll writes `style.display` every 400ms, which discarded
  the flex centring and pinned the chevron into the corner. The button is now styled with `!important`
  rules in both directions and this game drives visibility with its own class poll.
- **MENU on the win plaque now requests an interstitial.**
- **Bonus fix found while testing MENU:** `showIntro()` never reset which pane was showing, so leaving
  mid-game after PLAY returned you to the opponent/skill *setup*, not the start page. It now
  `switchView('ipMain')`.

## Connect Four — director pass: 6 issues — 2026-10-12
## Connect Four — director pass: 6 issues — 2026-10-12
### 1. Landing stutter (the biggest one)
- **`navigator.vibrate()` fired on every bounce**, not once per drop. A single marble bounced up to four
  times, so a landing did up to five IPC calls into the system vibrator service — at exactly the moment
  the marble settled and the eye is on it. Now one buzz, on the first contact above a power threshold.
- **Every bounce fired a full particle burst.** `impact()` ran the same spark + wood-dust + ring set on
  each of the 4–5 impacts, so one drop sprayed five bursts and jolted the whole board five times.
  Later bounces now scale to ~1/3, and the wood dust and shockwave ring are first-contact only.
- Bounce count 4 → 3.
### 4. Start-up animation
- **`resize()` always ran `buildIntroBG()`, which ends in `toDataURL()` on a full-screen canvas.**
  `closeIntro()` calls `resize()` 50ms after hiding the start page — so every time a match began, the
  app was **PNG-encoding a 1080x2400 canvas**, hundreds of milliseconds of jank right as the board
  appears. Now: skipped entirely while the start page is hidden, cached by size, and encoded as JPEG.
### 3. Start back button
- The shell injects a plain white circle sized for a generic light game. On this dark walnut board it
  read as a sticker, and it exited silently while everything else made a sound. Repainted in the game's
  own `.barbtn` wood gradient with the cream chevron and the `:active` press, and it now plays `SFX.tap()`.
  It WRAPS the shell handler rather than replacing it, so it still exits.
### 2 / 7. Home button and returning to the start page
- `#btnHome` now requests an interstitial and returns to the start page once the ad closes.
### 5. Win order
- The ad was *wrapping the call that shows the plaque*: ad → wait 1050ms → panel. Reversed — the win
  panel shows first, then the interstitial is requested the instant after. Same for a drawn game.
### 6. Drop sound
- `launch()` was a single narrow noise sweep, 1.5kHz up to 4.2kHz at vol .10 — thin and hissy, more like
  static than a marble leaving your finger. Replaced with a quieter low-mid sweep plus a short body tone.
- The 6.8kHz highpass tick over the landing clink was the harshest part; narrowed to 5.2kHz and pulled back.
### Latent crash found and fixed while verifying
- `resize()` returns early (retrying in 60ms) when the script runs before the WebView has laid out, so
  for the first frames BOTH board sprites are null. An earlier fix guarded only `tableSprite`;
  `boardSprite` was still passed straight to `drawImage`, which threw `TypeError: The provided value is
  not of type (...)` on every frame until the retry landed. `loop()` now skips drawing until both exist.
  (And `buildTable()` was sizing its sprite with a bare `vw*dpr` while `buildBoard()` clamped with
  `Math.max(2,…)` — same root cause, one frame earlier.)
- **Lesson: when patching a file by split/replace, verify the replacement line count.** A `splice(i, 3, …)`
  intended to replace 5 lines ate `g.save()` and `const ie=S.introT;`, producing 1082
  `ReferenceError: ie is not defined` per run. Recovery was to regenerate from source and reapply the
  whole patch chain rather than hand-repair. A repair script also joined lines with the BOOLEAN `CRLF`
  instead of the string `'\r\n'`, and `Array.join` coerced it into the literal text `true` between
  every pair of lines — worth never repeating.

## Connect Four — LOCKED, first integration pass — 2026-10-12
- **File:** `app/src/main/assets/games/connect-four/index.html` (from `sources/Playable Games/ConnectFour.html`).
- **Manifest** at the very top, before `<!DOCTYPE html>` — `id: connect-four` / `minPlayers: 1` /
  `maxPlayers: 2` / `aiSupport: full` / `tileColor: #B0824B` / `bannerBg: #150C05`. 1–2 because it is
  pass-and-play 2P *or* 1P against Oakley, the same shape as Chess.
- **The volume slider did nothing to this game.** Every voice ran through one master gain pinned at
  `.95`, so the shell's volume never reached it — the missing-master problem Bomb Relay had.
  `SFX.setVolume()` now retunes that one node, and the in-game SOUND switch drives it too.
- **Audio graph built at load, not on the first tap.** It was created from a `pointerdown` listener,
  so the game opened silent and the first tap only armed audio instead of doing what it hit. The shell
  lifts Chromium's autoplay gesture gate, so it is built on load; the listener stays as a retry.
- **Storage moved onto the shell.** `kv()` wrapped `localStorage`, so the settings and the in-progress
  board behind CONTINUE both died with a data clear. It now prefers `NativeBridge.save/load` and keeps
  `localStorage` (then an in-memory map) as the fallback for a plain browser tab.
- **Load-order bug worth remembering.** The game's own script block runs first and boots itself, so its
  boot-time settings read happens BEFORE the shell block creates `window.Studio` — `Studio.settings`
  does not exist yet and the call quietly no-ops. The shell block therefore pushes `Game.setSettings(settings)`
  once at the end, after Studio is built. Without it the first frames play at the wrong level until
  `GameActivity.onResume` happens to correct it.
- **`window.Game` is layered, not replaced.** The game defines its own `setSettings` (it has to, to reach
  its audio graph); the shell block keeps a reference and calls through, rather than overwriting it.
- **Banner is game-page only.** The status plaque, HOW TO PLAY and SETTINGS are overlays drawn over that
  same page, so each blocks the strip via `__shellBlock`; leaving the intro hides it entirely.
- **Ads:** interstitial on a won match, a drawn match, PLAY AGAIN and RESTART. MENU and the shell back
  button are exits and stay ad-free.
- **Tile:** `tileGlyph: 4` in the manifest, generated by `Tools/_gen_tiles.py`.
- **Smoke harness:** `_boot_smoke.js` had no `toDataURL` on its element stub, so the run died on a
  harness gap (Connect Four bakes its intro plank to a data URL) rather than anything in the game. Added.

## Balloon Battle — LOCKED, next in queue — 2026-09-27
- **Next game to lock.** Last Balloon is being taken to party-game status by Badri and will be handed
  over as a finished file, so Balloon Battle is the game in hand now.
- Treat the shipped `app/src/main/assets/games/balloon-battle/index.html` as frozen once locked:
  no drive-by edits, and any new request becomes a numbered pass on top, recorded here.

## Bomb Relay — LOCKED (2026-09-26) / final pass 2026-09-27
### Final pass (2026-09-27) — verified working on device by the director
- **Rewarded-ad skip bug, root cause found via logcat (not by reading the code).** The game
  registered `window.__studioAdCb` but passed the callback name as `'_studioAdCb'` — one leading
  underscore. The shell evaluates `if(window.$jsFuncName){...}`, found nothing, and **silently
  dropped every reward**: the ad played, the reward was granted, the game never heard about it.
  Bomb Relay was the only game in the project with the single-underscore typo; every other game
  passes `'__studioAdCb'`. Fixed, plus `window._studioAdCb = window.__studioAdCb` as a self-heal
  alias so a future typo cannot swallow a reward again.
- **Fuse freeze.** A rewarded ad is fullscreen and outlasts a 26s solo round, so the bomb used to
  explode behind it and the (now delivered) reward was discarded on `G.phase==='boom'`. `gameTick()`
  now holds **only the fuse** while `adPending` is set — deliberately not the whole simulation,
  which was tried first and made a missed callback a permanently dead game. `adPending` is cleared
  by two independent paths (ad callback + 20s watchdog), so nothing can get stuck.
- **`btnSkip.disabled` is now cleared unconditionally first** in `updatePowerBtns()`; the old early
  return could leave SKIP stuck greyed out and unable to fire another ad.
- **5P.** Manifest `maxPlayers: 4 → 5`. This is truthful (the setup screen has 1P–5P and
  `launchFromShell` clamps to 5) and it creates the shell's **5 PLAYER** tile, which had no games at
  all before. Verified on device: `ModeActivity: Showing 1 games (allGames=false, players=5)`.
  Tile badge is `${maxPlayers}P`, so it now reads **5P**.
- **Solo HUD:** the "PLAYER 1" name badge is hidden in 1P (`G.n===1`) — one human, so it was noise.
- **Intro page:** content (bomb, logo, tagline, buttons) wrapped in `.menu-main` with `flex:1` +
  `justify-content:center` so it is vertically centred; BACK is corner-pinned and the studio credit
  is pinned to the bottom, so neither takes part in the centring. `#scr-menu` paints the game
  background full-bleed edge to edge.
- **1P setup:** the whole NAMES & COLORS block (`#crewBlock`) is hidden, leaving START MATCH as the
  only action. Seats now read `PLAYER n` in 2P–5P (seat 0 used to say "YOU" / "PLAYER 1 (YOU)").
- **How To Play:** PREV/NEXT were the only buttons in the game not calling `SFX.click()` — paging was
  silent. Fixed. HINT button, `POWER.hints`, `FREE_HINTS` and the ad screen's hint copy all removed;
  SKIP is the only power, labelled plain "SKIP" with a red AD chip pinned to its top-right corner
  (`.pw-ad`) instead of the old "SKIP + AD" text, which overflowed the button on narrow frames.
- **Source parity:** `sources/Playable Games/BombRelay.html` carries the same behaviour, adapted to
  its own (older, divergent) power system. It still has **no manifest block** — it is a pre-integration
  draft, so a game copied from it must get one added at integration time.

## Bomb Relay — manifest restored, shippability pass (LOCKED) — 2026-09-26
- **File:** `app/src/main/assets/games/bomb-relay/index.html`
- **Why it "disappeared":** the file had **no `STUDIO_GAME_MANIFEST` block at all**. `ManifestParser.scanGames()`
  reads the first 30 lines of every `games/*/index.html`, looks for that marker, and skips the game
  with `"No manifest marker found"` when it's absent. The game was never visible in the shell — it was
  not deleted or reverted. `sources/Playable Games/BombRelay.html` never had one either.
  **Landmine: a new game copied from `sources/` must have the manifest added at integration time, or it
  silently never appears in the grid.**
- **Manifest added** (line 1, before `<!DOCTYPE html>`): `id: bomb-relay` / `title: Bomb Relay` /
  `orientation: portrait` / `minPlayers: 2` / `maxPlayers: 4` / `aiSupport: full` / `online: false` /
  `tileColor: fuse-red` / `version: 1`.
- **Audio graph rebuilt with a master gain.** Previously every voice connected straight to
  `ctx.destination`, so the shell's volume setting had no effect on this game at all. Now a
  `SFX.setVolume()` retunes one `GainNode`; `Studio.settings.volume` is read at boot and normalises
  both 0-1 and 0-100 forms, and the value persists to `bombrelay_vol`.
- **`window.Game` completed** to the locked-game contract: added `setSettings(s)` (the shell pushes
  sound/haptics/volume on `GameActivity.onResume` — without it, shell-side setting changes never
  reach a running game) and `onOrientationChange()`.
  **Landmine: the file header comment describes a `fitFrame()` helper that was never implemented.**
  The real frame fitter is `FX.resize()`. Calling the documented name throws.
- **HAPTICS toggle added** to the in-game SETTINGS screen. `Studio.settings.haptics` was read from the
  shell and honoured, but the game had no control for it, so the value was unreachable in-game.
  The SOUND FX switch now also reflects `Studio.settings.sound`, not just the local mute flag.
- **Ads verified in the correct places** (no change needed): banner only on `scr-game`, interstitial
  only on Game Over -> Rematch, rewarded opt-in on a fail. Confirmed firing on device
  (`AdRequestBrokerService` + Custom Tabs in logcat).
- **Evidence:** `node --check` clean on the extracted inline script; manifest parses with all 9 keys;
  logcat shows `ManifestParser: scan: bomb-relay -> parsed bomb-relay`; grid shows
  `BOMB RELAY / NEW / 4P`; game count went 9 -> 10. On-device: pass screen -> `CONTINUE` -> live round
  (`GREEN ONLY / TAP 5 GREEN DOTS`, fuse counting down, dots tappable, timer progressing). Home +
  relaunch survived with state intact and no `Uncaught` / `FATAL` in logcat.

## Egg Rush — new start page, BACK + settings, first tap audible (LOCKED) — 2026-09-26
- **File:** `app/src/main/assets/games/egg-rush/index.html` (manifest v2 + a changelog block at the
  top, Chicken Chaos style). **The shell was not touched** — the bridge already exposes everything
  this needed (`save` / `load` / `haptic` / `exitGame`) and the shell already turns landscape games.
- **Start page rebuilt** (the director's ask: the old screen was not readable at a glance). It is now
  the Chicken Chaos composition drawn with Egg Rush's own art: branding on the left (title, tagline,
  a nest with three eggs, a one-line how-to pill) and ONE cream board on the right holding
  MATCH / OPPONENTS / PLAYERS or BOTS / EGGS TO WIN / PLAY. Sliders are gone — every option is a
  one-tap segmented choice with one line of copy under it that says what the choice does
  ("First to bank 4 eggs wins. Golden eggs count double." / "Pass and play with 2 hens on one screen.").
- **BACK** (top left, cream round button, same pair as the gear) exits to the shell through
  `Studio.exitGame()` → `NativeBridge.exitGame()`. **Gear** (top right) opens a SETTINGS sheet with
  SOUND and HAPTICS ON/OFF pills; both write `shell:settings` as a **MERGE** (the old partial write
  in Chicken Chaos dropped `volume` / `music` / `haptic`) and menu choices persist in `egg-rush:pref`.
- **First-tap sound fixed at the source.** The context is created inside the unlocking gesture, so it
  is still `suspended` when that same tap's `click` handler runs — the sound was scheduled on a
  suspended context and thrown away (the "no sound until the second tap" bug). `playSnd` now queues
  while the context is not `running` and replays from `onstatechange`, with a silent warm-up buffer on
  unlock. The queue takes **UI sounds only** (`click` / `tick` / `go`), because the attract farm is
  alive behind this menu and its pickups could otherwise stand in for the unlocking tap.
- **Shell-owned turn:** the game's own `requestFullscreen()` / `screen.orientation.lock()` call is
  removed (same reason Chicken Chaos v3 removed it — it fought the shell's rotation). The ROTATE YOUR
  DEVICE overlay still covers a plain browser.
- **Lifecycle/contract:** `Game.setSettings(sound / haptics / volume)` added for the shell's resume
  push, `Game.onOrientationChange` added, and boot reads `shell:settings` so the game opens on the
  player's real choices. Haptics fire on menu taps (light), PLAY (medium) and the result card
  (success). The master gain is now `BASE_VOL × shell volume` instead of a fixed 0.5.
- **Evidence:** `node Tools/_check_js_syntax.js app/src/main/assets/games/egg-rush/index.html` →
  `ALL SCRIPTS PARSE OK`; `BUILD.bat` → `BUILD OK - shell-debug.apk` (18,068,435 bytes) and the
  `assets/games/egg-rush/index.html` entry inside the APK hashes identically to the source; headless
  Chrome renders at 740×360 and 1280×800 → `_egg_start_740x360.png`, `_egg_settings_740x360.png`
  (start page + settings sheet). A **live solo match was then play-smoke-tested headless at both sizes**
  through a temporary harness: mode picked, PLAY pressed, match running with the score chip, both player
  chips, the joystick, DASH, pause and sound buttons and the objective banner all laid out with no
  overflow or letterboxing. The harness (`_tmp_egg_play.html`, `_tmp_mkplay.js`, `_tmp_play_*.png`) was
  deleted afterwards, so the build contains no test scaffolding.
- **Landscape path DEVICE-VERIFIED (first landscape game to ship, 2026-09-26).** Installed with
  `adb install -r` on an AsteroidsIND A059 (1080×2392 panel) and the shell turned the display:
  `dumpsys display` reports `mCurrentOrientation=1` with `logicalFrame=Rect(0, 0 - 2392, 1080)`, and
  the GameActivity window lands at `frame=[126,0][2392,1080]` with `mDisplayRotation=ROTATION_90`.
  This device has a **left-side punch-hole camera**, so `displayCutout` reports
  `insets=Rect(126, 0 - 0, 0)` / `sideHint=LEFT` — the window is inset by exactly 126 px
  (`Requested w=2266`, 2392 − 126) and the start page screenshot shows the cutout strip as expected,
  with BACK sitting just inside the safe area and nothing drawn under the camera. The app's asset was
  pulled back off the device and hashes identically to the locked source
  (`DD1D0D78…4394F`), and `logcat` shows `GameActivity: Launching game egg-rush` plus
  `NativeBridge: Loaded: egg-rush:pref -> null` (the new pref read path on a first run).
- **Still to confirm by the director on the device:** BACK landing cleanly on the page the game was
  opened from, the pills agreeing with the shell's own Settings screen, and the first tap on the
  start page making a sound. (The two-column start page itself has now been seen at real size.)

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
