"""
shell_policy.py - The Redundant Arcade decision layer.

Laya does not write or plan here. It answers fixed, pre-decided policy
questions about work in THIS project, so the same judgement is applied
every time instead of re-argued each session.

Every rule below is lifted from the project's own documents, not invented:

  CONTRACT.md  - no network calls, file-size tiers, manifest + SDK required
  AGENT.md     - BUILD.bat is the only build, ad bridge is delicate,
                 agents must not self-test on device
  PROGRESS.md  - the __studioAdCb underscore bug, LOCKED game freezes

The decision layer has three jobs:
  1. CLASSIFY  which lane a request is in
  2. GATE      is this safe unattended, or does a human sign off first
  3. PRESCRIBE which gate commands must run before the change can ship
"""

from typing import Any

# ----------------------------------------------------------------------
# 1. LANES - every kind of work this project actually does
# ----------------------------------------------------------------------

# LANES is the hot path. Measured per-question latency on this CPU box:
#   lane 74.5 s | risk 10.7 s | needs_human 4.8 s | scope 2.9 s
# The lane question dominates because all 8 criteria share one head token
# budget (head_max_len). Long prose descriptions filled that budget and the
# forward pass grew with it. So the criteria below are deliberately TINY -
# a few keywords each. Full prose lives in LANE_REFERENCE below, for humans
# and for prompts, and is never sent to the model.
LANES: dict[str, str] = {
    "locked_game_edit": "edit a LOCKED shipped game already in PROGRESS.md",
    "new_game_integration": "wire a finished game from sources/ into assets/games",
    "game_visual_polish": "colours, layout, easing, juice, shake, particles, sound, HUD look",
    "shell_platform": "Kotlin app, Gradle, WebView, activities, nav, theme, BUILD/DEPLOY",
    "ads_and_monetisation": "AdMob banner, interstitial, rewarded, reward callback, SKIP, UMP",
    "release_and_publish": "version bump, keystore, app-release.aab, BUNDLE, store listing",
    "docs_and_progress": "PROGRESS.md, HANDOFF.md, CONTRACT.md, STYLE.md, AGENT.md, prompts/",
    "tooling_and_checks": "scripts under Tools/, CHECK_ALL.bat, syntax and ad audits",
}

#: Human-readable meaning of each lane. Documentation and prompt material;
#: NOT sent to the model, so it can be as long as it needs to be.
LANE_REFERENCE: dict[str, str] = {
    "locked_game_edit": (
        "Editing a game already marked LOCKED in PROGRESS.md: bomb-relay, "
        "balloon-battle, chicken-chaos, memory-grab, egg-rush, last-balloon, "
        "pen-fight. Frozen and shipped, so a change becomes a numbered pass "
        "recorded in PROGRESS.md, never a drive-by fix."
    ),
    "new_game_integration": (
        "Wiring a finished game from sources/ into app/src/main/assets/games/ "
        "so it gains a STUDIO_GAME_MANIFEST, the window.Game lifecycle, ads "
        "and a tile."
    ),
    "game_visual_polish": (
        "Making a game look or feel better: colours, layout, spacing, easing, "
        "screenshake, particles, juice, sound design, readability, tile and "
        "HUD appearance. Pixels and motion, not game rules."
    ),
    "shell_platform": (
        "Changing the Kotlin Android app itself: Gradle, BUILD.bat, DEPLOY.bat, "
        "activities, the WebView, navigation, themes, the game grid, or any "
        "file under app/src/main/java."
    ),
    "ads_and_monetisation": (
        "Anything AdMob: banner, interstitial, rewarded ads, the reward "
        "callback, ad reasons, SKIP and POWER buttons, UMP consent, or ad "
        "store policy. A one-character callback typo already shipped once and "
        "dropped every reward silently."
    ),
    "release_and_publish": (
        "Shipping to the store: version bumps, the release keystore, "
        "app-release.aab, BUNDLE.bat, store listing, icons and splash."
    ),
    "docs_and_progress": (
        "Updating the project's own records: PROGRESS.md, HANDOFF.md, "
        "CONTRACT.md, STYLE.md, AGENT.md, game prompts under prompts/, or "
        "plans under FuturePlans/."
    ),
    "tooling_and_checks": (
        "Writing or fixing the scripts under Tools/ such as "
        "_check_js_syntax.js, _ad_audit.js, _boot_smoke.js, CHECK_ALL.bat, and "
        "the art, audio and puzzle generators."
    ),
}

# ----------------------------------------------------------------------
# 2. RISK - ordered, so the gate can escalate on the grade
# ----------------------------------------------------------------------

RISK_ORDER = ["trivial", "low", "medium", "high", "ship_blocking"]

RISK_CRITERIA: dict[str, str] = {
    "trivial": (
        "Read-only, or a comment or doc edit. Grep, list files, read, explain. "
        "Nothing on disk changes."
    ),
    "low": (
        "One contained revertible edit in a single file: copy, a CSS value, a "
        "colour, a string, an easing value. No build, no ads, no game state."
    ),
    "medium": (
        "A whole game file, gameplay or manifest changes, the Kotlin shell, "
        "regenerated art or audio, or several files at once. Needs BUILD.bat."
    ),
    "high": (
        "AdMob or the reward callback, the WebView bridge, the keystore, gradle "
        "or signing. A one-character callback typo already dropped every reward."
    ),
    "ship_blocking": (
        "Can fail Play Store submission or corrupt a shipped game: violating ad "
        "policy, a lost release key, a broken build, a regression to a LOCKED game."
    ),
}

# ----------------------------------------------------------------------
# 3. GATES - what must be checked before the change may ship
#    Real commands from the project, not invented steps.
# ----------------------------------------------------------------------

GATES: dict[str, str] = {
    "syntax": (
        "Every inlined script must parse. Run the node check from AGENT.md over "
        "the changed html file. A SYNTAX FAIL is a hard block on deploy."
    ),
    "contract": (
        "The changed game must still satisfy CONTRACT.md: STUDIO_GAME_MANIFEST "
        "present, window.Game lifecycle present, no network calls at runtime, "
        "and the file within its tier size budget."
    ),
    "ad_bridge": (
        "Any change near ads must keep the reward callback name exactly "
        "'__studioAdCb' with both leading underscores, and the ad must be "
        "marshalled onto the UI thread in Kotlin. Verify the callback actually "
        "fires rather than assuming it."
    ),
    "locked_regression": (
        "The game is LOCKED. Re-run the previous phase's acceptance checks per "
        "AGENT.md, record the change as a numbered pass in PROGRESS.md, and "
        "never ship an unbuilt edit."
    ),
    "build": (
        "BUILD.bat is the only build command. The change is not done until a "
        "fresh shell-debug.apk exists newer than the change."
    ),
    "on_device": (
        "The user tests on device. The agent must not launch the app, drive a "
        "game, or read logcat to judge how a game feels."
    ),
    "store_policy": (
        "User-facing changes must respect Play Store policy: no misleading ad "
        "placements, rewarded ads must grant what they promise, and consent "
        "must work with production AdMob IDs."
    ),
}

# ----------------------------------------------------------------------
# 4. THE DECISION LAYER - one pass, all questions
# ----------------------------------------------------------------------

SHELL_QUESTIONS: dict[str, Any] = {
    "lane": {
        "type": "choice",
        "instructions": "Which lane of work does this request belong to?",
        "criteria": LANES,
    },
    "risk": {
        "type": "choice",
        "instructions": "How risky is this change to the shipped app?",
        "criteria": RISK_CRITERIA,
    },
    "needs_human": {
        "type": "noul",
        "instructions": (
            "Should a human approve this change before it is made or shipped? "
            "Answer yes for anything touching ads, the WebView bridge, signing, "
            "the store bundle, or a game already marked LOCKED."
        ),
    },
    "scope": {
        "type": "score",
        "instructions": "How much of the project does this change touch?",
        "criteria": [
            "one file or one function, nothing else moves",
            "one whole game or one shell screen",
            "several games, or the shell and games together, or build and runtime",
        ],
    },
}

#: lane -> gates that must run. Looked up after routing.
LANE_GATES: dict[str, list[str]] = {
    "locked_game_edit":      ["locked_regression", "syntax", "contract", "build", "on_device"],
    "new_game_integration":  ["syntax", "contract", "ad_bridge", "build", "on_device"],
    "game_visual_polish":    ["syntax", "contract", "build", "on_device"],
    "shell_platform":        ["syntax", "build", "on_device"],
    "ads_and_monetisation":  ["syntax", "ad_bridge", "build", "on_device", "store_policy"],
    "release_and_publish":   ["build", "store_policy"],
    "docs_and_progress":     [],
    "tooling_and_checks":    ["syntax"],
}

