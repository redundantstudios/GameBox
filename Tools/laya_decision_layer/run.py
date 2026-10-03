"""
Standalone runner for the Redundant Arcade decision layer.

    python decision_layer.py                        # run the demo
    python decision_layer.py "add a rewarded skip to bomb relay"
    python decision_layer.py --json "<request>"     # machine readable
    python decision_layer.py --check                # audit the real games

--check is the useful one: it routes a realistic request against every game
currently in app/src/main/assets/games/ and reports which lanes and risks
came back, so you can see how the policy reads against real work.
"""

from __future__ import annotations

import json
import os
import sys

from decision_layer import DecisionLayer

GAMES_DIR = r"C:\Redundant Projects\Shell\app\src\main\assets\games"

DEMO = [
    "What does the bomb-relay index.html do? Just explain it, do not change anything.",
    "Fix a typo in a comment in the ludo game.",
    "Add a rewarded ad skip button to bomb-relay so players can skip the fuse.",
    "Regenerate the tile art for all the games with a new colour scheme.",
    "Update PROGRESS.md to record the new balloon-battle pass.",
    "Migrate the app to a new release keystore before the Play Store upload.",
    "Add a new game called connect-four from sources/Playable Games.",
    "Tweak the screenshake amplitude in midnight-overdrive to feel punchier.",
]


def main() -> int:
    layer = DecisionLayer()
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = [a for a in sys.argv[1:] if a.startswith("--")]

    if "--check" in flags:
        if not os.path.isdir(GAMES_DIR):
            print(f"Games dir not found: {GAMES_DIR}")
            return 1
        games = sorted(d for d in os.listdir(GAMES_DIR)
                       if os.path.isdir(os.path.join(GAMES_DIR, d)))
        print(f"\nRouting one realistic edit against each of {len(games)} games.\n")
        print(f"{'game':<20} {'lane':<22} {'risk':<14} {'action':<20}")
        print("-" * 78)
        for g in games:
            req = f"add a rewarded ad skip button to the {g} game"
            d = layer.decide(req)
            print(f"{g:<20} {d.lane:<22} {d.risk:<14} {d.action:<20}")
        print("-" * 78)
        return 0

    requests = [" ".join(args)] if args else DEMO

    print("=" * 74)
    print("REDUNDANT ARCADE - LAYA DECISION LAYER".center(74))
    print("System 1 classifies and gates. Claude Code / Cline does the work.".center(74))
    print("=" * 74)

    results = []
    for r in requests:
        try:
            d = layer.decide(r)
        except Exception as e:  # noqa: BLE001
            print(f"ERROR  {r[:60]} -> {e}")
            continue
        print(d.render())
        print(f"  REQUEST  {r}")
        results.append(d.to_dict())

    if "--json" in flags:
        print(json.dumps(results, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
