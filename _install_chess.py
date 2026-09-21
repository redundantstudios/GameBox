#!/usr/bin/env python3
"""
_install_chess.py - install the director's Chess.html as the shell chess game.

Source: Chess.html (repo root, director-authored v0.7.1 - bot, puzzles, streaks,
shields, self-testing engine). This script copies it into the shell with only
the integration patches it needs, touching nothing else (no restyling):

  1. STUDIO_GAME_MANIFEST block (shell game discovery, portrait, 1-2 players).
  2. Studio.ads.banner() mapped to the shell bridge's showBanner()/hideBanner()
     (the draft called b.banner(...), which does not exist on the bridge, so the
     banner would never appear on device).
  3. The full 10,500-puzzle Lichess pack (games/chess/puzzles.js, window
     .CHESS_PUZZLES) replaces the inline packs at boot; the inline rows stay as
     the browser fallback. Boot skips re-walking the pack because
     _validate_chess.js already proved every row offline.

Run from the repo root:  python _install_chess.py
"""
import io
import os
import sys

SRC = "Chess.html"
DST = os.path.join("app", "src", "main", "assets", "games", "chess", "index.html")

MANIFEST = """<!--
STUDIO_GAME_MANIFEST
id: chess
title: Chess
orientation: portrait
minPlayers: 1
maxPlayers: 2
aiSupport: full
online: false
tileColor: #8A5A44
version: 0.7.1
-->
"""


def patch(src: str) -> str:
    n = 0

    def rep(old, new, what):
        nonlocal n
        if src.count(old) != 1:
            raise SystemExit(f"anchor not unique for {what}: {src.count(old)} hits")
        nonlocal_src = None  # noqa
        return new

    # --- 1. manifest -------------------------------------------------------
    i0 = src.index("<!--\nREDUNDANT STUDIOS")
    i1 = src.index("-->", i0) + len("-->")
    changelog = src[i0 + len("<!--"):i1 - len("-->")].strip()
    head = MANIFEST + "<!--\n" + changelog + "\n-->"
    src = src[:i0] + head + src[i1:]
    n += 1

    # --- 2. load the shell puzzle pack before the game script --------------
    anchor = "<script>\n/* \u2550\u2550\u2550 STUDIO SDK"
    if src.count(anchor) != 1:
        raise SystemExit("anchor not unique for puzzle script include")
    src = src.replace(
        anchor,
        '<script src="puzzles.js"></script>\n' + anchor,
        1,
    )
    n += 1

    # --- 3. banner bridge fix ---------------------------------------------
    old_banner = (
        "      banner(visible) {\n"
        "        const b = bridge();\n"
        "        if (b && b.banner) { try { b.banner(visible ? 'show' : 'hide'); } catch(e) {} }\n"
        "      },"
    )
    new_banner = (
        "      banner(visible) {\n"
        "        const b = bridge();\n"
        "        if (b) { try { if (visible) b.showBanner(); else b.hideBanner(); } catch(e) {} }\n"
        "      },"
    )
    if src.count(old_banner) != 1:
        raise SystemExit("anchor not unique for banner bridge fix")
    src = src.replace(old_banner, new_banner, 1)
    n += 1

    # --- 4. merge the shell puzzle pack over the inline packs --------------
    anchor = "],hard:[\n/* PASTE HARD PACK HERE */\n]};"
    if src.count(anchor) != 1:
        raise SystemExit("anchor not unique for puzzle pack merge")
    merge = anchor + """
/* Shell puzzle pack: the GameBox shell ships the full Lichess extraction as
   puzzles.js (window.CHESS_PUZZLES). It replaces the inline packs tier by
   tier; the inline rows above stay as the browser fallback. */
try {
  const SP = window.CHESS_PUZZLES || null;
  if (SP) {
    for (const tier of ["easy", "normal", "hard"]) {
      if (Array.isArray(SP[tier]) && SP[tier].length) PUZZLE_DATA[tier] = SP[tier];
    }
  }
} catch(e) { console.warn("[chess] shell puzzle pack not applied", e); }"""
    src = src.replace(anchor, merge, 1)
    n += 1

    # --- 5. skip the boot re-validation when the offline-verified pack is on
    anchor = "(function step(){\n    if(i>=cases.length){ validateChunked(restoreEng); return; }"
    if src.count(anchor) != 1:
        raise SystemExit("anchor not unique for validation skip")
    src = src.replace(anchor, """(function step(){
    if(i>=cases.length){
      if(window.CHESS_PUZZLES){
        /* The shell pack is already verified offline by _validate_chess.js
           (perft suite + every solution replayed). Re-walking 10,500 rows on
           device would hold input locked for seconds at boot. */
        testLock=false;
        console.log("[chess] shell puzzle pack detected (pre-validated offline) - skipping runtime re-validation");
        return;
      }
      validateChunked(restoreEng); return;
    }""", 1)
    n += 1

    print(f"  applied {n} patches")
    return src


def main() -> int:
    if not os.path.exists(SRC):
        print(f"error: {SRC} not found")
        return 1
    with io.open(SRC, encoding="utf-8") as fh:
        src = fh.read()
    out = patch(src)
    os.makedirs(os.path.dirname(DST), exist_ok=True)
    with io.open(DST, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(out)
    print(f"wrote {DST}: {len(out)} bytes (source {len(src)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
