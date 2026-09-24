#!/usr/bin/env python3
"""
_gen_puzzles.py - build the chess puzzle asset from the Lichess puzzle export.

Input : chess_puzzles.txt   (JSON: {version, source, count, easy:[...], normal:[...], hard:[...]})
        - NOT committed (2.7 MB raw export); re-download from
          https://database.lichess.org/lichess_db_puzzle.csv.zst and convert, or
          ask a teammate for the file.
Output: app/src/main/assets/games/chess/puzzles.js
        window.CHESS_PUZZLES = {"easy":[...],"normal":[...],"hard":[...]}
        Each entry is [id, fen, solution(space separated uci), rating, themes].

Committed output: puzzles.js IS tracked so the app builds and plays out of the box.
Run this only when the puzzle data changes.
"""
import io
import json
import os
import sys

SRC = "chess_puzzles.txt"
DST = os.path.join("app", "src", "main", "assets", "games", "chess", "puzzles.js")
CATS = ("easy", "normal", "hard")


def main() -> int:
    if not os.path.exists(SRC):
        print(f"error: {SRC} not found (see the header of this script)")
        return 1

    with io.open(SRC, encoding="utf-8") as fh:
        data = json.load(fh)

    out = {}
    for cat in CATS:
        rows = data.get(cat) or []
        # Keep the 5 canonical fields, nothing else, so the asset stays compact.
        out[cat] = [[r[0], r[1], r[2], r[3], r[4] if len(r) > 4 else ""] for r in rows]
        print(f"  {cat:6s} {len(out[cat]):5d} puzzles")

    total = sum(len(v) for v in out.values())
    body = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    js = f"window.CHESS_PUZZLES={body};\n"

    os.makedirs(os.path.dirname(DST), exist_ok=True)
    with io.open(DST, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(js)

    print(f"wrote {DST}: {total} puzzles, {len(js) / 1048576:.2f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
