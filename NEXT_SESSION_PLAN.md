# NEXT SESSION PLAN — picked up from user feedback (2026-09-21, college exit)

Build+install gotcha from last session: verify `adb install` timestamp >= APK
LastWriteTime before reporting done (an install once beat the build).

## 1. Shell header title smaller
- `app/src/main/res/layout/activity_main.xml` — `brandTitle`:
  `textSize` 23sp -> ~17sp, `autoSizeMaxTextSize` 23sp -> 17sp.

## 2. Party tile icon redo
- Use `partyGames Icon without BG.png` (currently at repo root — move into
  `sources/`) as the source instead of the with-BG version.
- Regenerate `drawable-nodpi/ic_party.png` from it (transparent, fit not crop).
- Layout (`item_mode_card.xml`): since it's transparent, do NOT fill the whole
  tile. Constrain the icon to the UPPER region: top->parent top, bottom->top of
  `modeLabel` with a few dp margin, width 0dp inside parent margins,
  `scaleType=fitCenter`, so the art sits above the text with no overlap.

## 3. Chicken Chaos fullscreen (hide status bar)
- In `GameActivity` when `orientation == landscape` (or per-game flag): enable
  immersive mode — hide system bars via WindowInsetsControllerCompat
  (BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE) after the window attaches, and
  re-apply on focus change. Keep portrait games as-is.

## 4. Chicken Chaos back button
- Add a small back button on the MENU screen (canvas `uiBtn`, top-left,
  circle style like the mute button) -> `Studio.exitGame()`.
- Update `sources/Chicken Chaos.html` then copy to
  `assets/games/chicken-chaos/index.html` (plain copy, no patches needed).

## 5. Smooth landscape transition (no hard rotation cut)
- Current: instant system rotation + cross-fade (feels like a cut).
- Goal: fade WHILE rotating.
- Approach: for landscape games, in `GameActivity` before
  `requestedOrientation = SENSOR_LANDSCAPE`, run a short (~350ms) animation on
  the root view combining alpha 1->0 with a rotation drift (e.g. -8deg) /
  slight scale-up; on the config flip, reverse (alpha 0->1, rotation +8deg ->
  0). Use ViewPropertyAnimator with `withLayer()`. Set the target orientation
  at the fade midpoint so the system rotation lands inside the dimmed window.
- Alternative if that janks: keep fade but swap to
  `overridePendingTransition` with a custom fade+rotate anim pair
  (res/anim) applied only for landscape games.

## 6. Housekeeping
- Move `partyGames Icon without BG.png` -> `sources/`.
- Commit everything at session end (user locks after testing).
