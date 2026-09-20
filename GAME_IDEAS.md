# Game Ideas — Redundant Studios living backlog

> **What this file is:** the permanent home for every game idea, half-idea, and "this would be
> funny" shower thought. Ideas do not live in chat, they live here.
> **Rule 0:** never delete an idea. Change its status. A shelved idea with a reason is worth
> more than a forgotten one.

---

## 0. How to use this file

Two speeds, on purpose — so a good idea never waits on formatting:

| Mode | Where | Effort | What it's for |
|---|---|---|---|
| **Inbox** | `§5` | one line, no rules | capture fast, sort later |
| **Entry** | `§6+` | fill the template in `§3` | an idea we actually intend to build |

**Status ladder** — an entry moves one step at a time:

```
IDEA  ->  PARKED  ->  PROTOTYPE  ->  SPEC'D  ->  BUILDING  ->  SHELL-READY  ->  SHIPPED
                                                                  |
                                                              SHELVED  (with a reason)
```

- `IDEA` — exists as words only.
- `PARKED` — worth building, deliberately not now (see the cross-cutting docs in `§7`).
- `PROTOTYPE` — a playable `.html` exists somewhere (project root or `assets/games/`).
- `SPEC'D` — hook, players, tier, and tile colour are written down (all four required).
- `BUILDING` — someone is inside the file right now.
- `SHELL-READY` — passes the `CONTRACT.md` checklist and can drop into `assets/games/<id>/`.
- `SHIPPED` — live in the shell with its `STUDIO_GAME_MANIFEST` block.

**Promotion gate:** an idea may not enter `BUILDING` until it answers, in one sentence each:
1. What is the hook? (why is this fun in 30 seconds)
2. Who plays it, and on one phone or several? (players + pass-n-play or not)
3. Which tier (see `CONTRACT.md §2`)? — the lightest renderer that delivers it.
4. What colour owns its tile in the shell grid?

**Non-negotiables for anything entering `assets/games/`:** `CONTRACT.md` compliance
(self-contained HTML, zero network calls, works from `file://`), a `STUDIO_GAME_MANIFEST`
block, the `window.Game` lifecycle (`pause` / `resume` / `destroy`), and a passing
`BUILD.bat` + fresh APK timestamp before it's called done (`AGENT.md`).

---

## 1. Status board (scan this first)

| ID | Game | Status | Players | Tier (est.) | Where it lives | Notes |
|---|---|---|---|---|---|---|
| RS-001 | **Ludo** | SHIPPED | 2–4 + bots | 1 (Canvas 2D) | `assets/games/ludo/` | rankings, 10X bot test in dev mode |
| RS-002 | **Planet Merge** | SHIPPED (needs own session) | 1 | 1 | `assets/games/planetmerge/` | known issues parked by user 2026-09-20 |
| RS-003 | **Chess** | PROTOTYPE | 1–2 (+bot) | 1 | `Chess.html` (untracked) | engine done; no manifest block yet |
| RS-004 | **Checkers — Gould's problems** | PROTOTYPE (data only) | 1 | 1 | `CHeckers_puzzels_goulds_problems_all.json` | 678 puzzles, no game shell yet |
| RS-005 | **Bomb Relay** | PROTOTYPE | 1–4 + bots | 1 | `BombRelay.html` (untracked) | pass-n-play party game, ~188 KB |
| RS-006 | **Last Balloon** | PROTOTYPE | 1–4 + bots | 1 | `LastBaloon.html` (untracked) | pass-n-play party game, ~110 KB |
| — | *your next idea* | IDEA | — | — | `§5 inbox` | — |

> Prototype sizes are the raw `.html` file size, which is the `CONTRACT.md` budget unit.

---

## 2. What we already know about shipping a game here

Drop-in shape (nothing else in the shell needs editing):

```
app/src/main/assets/games/<gameId>/
    index.html          <- single self-contained file
    (optional assets that are NOT served over network)
```

`ManifestParser` reads the `STUDIO_GAME_MANIFEST` comment block inside `index.html`:

| Field | Type | Effect in the shell |
|---|---|---|
| `id` | string | folder name, deep links, logs |
| `title` | string | tile label |
| `orientation` | `portrait` / `landscape` | forces the activity orientation |
| `minPlayers` / `maxPlayers` | int | which "N PLAYER" grids the game appears in (counts on Home are live) |
| `aiSupport` | `true` / `full` / `partial` / `none` | if it can seat bots, it also shows up in the 1 PLAYER grid |
| `online` | bool | reserved for the parked online plan |
| `tileColor` | hex | the game's tile colour in the shell grid — one solid colour per game |
| `version` | string | shown/logged, useful when we debug an old build |

Shell integration points a game can use (via the JS `Studio` bridge) already exist for:
settings sync (`Game.setSettings`), rewarded ads (`showRewarded`), pause/resume/destroy, and
the offline guard. Coins and networking are designed but parked (`§7`).

---

## 3. Entry template (copy this block for every new idea)

```markdown
### RS-0XX — <Game name>
**Status:** IDEA · **Owner:** you · **Added:** YYYY-MM-DD · **Last touched:** YYYY-MM-DD

- **Hook (the 30-second pitch):**
- **Why us / why now:**
- **Players & mode:** (1P / pass-n-play / bots / online-later)
- **Session length target:**
- **Input:** (tap / hold / drag / tilt / microphone)
- **Core loop (3–5 beats):**
  1.
  2.
  3.
- **Win / lose / end condition:**
- **Juice list:** (screenshake, floating text, particles, sfx beats — see `CONTRACT.md §3`)
- **Art direction (one line):**
- **Tier + budget:** (e.g. Tier 1, target <= 300 KB)
- **Tile colour:** `#RRGGBB`
- **Manifest draft:** `id / orientation / minPlayers / maxPlayers / aiSupport / online`
- **Monetisation fit:** (banner-only? rewarded continue? cosmetic? coins later?)
- **Risks / unknowns:**
- **Next action:** (the single next concrete step)

<details><summary>Build log</summary>

- YYYY-MM-DD —

</details>
```

---

## 4. Shipped (reference entries — copy their shape, not their ideas)

### RS-001 — Ludo
**Status:** SHIPPED · 2–4 players + bots · Tier 1 · tile `#D94B4B`

- **Hook:** the board everyone knows, in your pocket, with pass-n-play.
- **What's real:** full rules, 1ST/2ND/3RD/4TH rankings with play continuing after a finisher,
  bot seats, `10X BOT TEST` behind developer mode, single clean AI dice sound.
- **Manifest truth:** `minPlayers 2`, `maxPlayers 4`, `aiSupport true`, `online false`.
- **Lesson banked:** rewarded callbacks must tolerate an *undefined* argument, or every theme
  unlock silently fails.

### RS-002 — Planet Merge
**Status:** SHIPPED, needs a dedicated fix session (parked by user 2026-09-20)

- **Manifest truth:** 1 player, `maxPlayers 1`.
- **Do not touch it as a side quest** — the user asked for a separate single-topic session.

---

## 5. Inbox — raw capture (one line, no format needed)

Add here first. Tag the source so future-us knows where it came from:
`[you]` said out loud · `[scan]` found in the repo · `[agent]` proposed, needs your verdict.

- [ ] `[scan]` Chess — `Chess.html` already has a real engine (negamax + alpha-beta + quiescence,
  FEN load/save, undo, castling, 3 difficulty tiers, daily puzzle). Needs a manifest block and a
  puzzle-count decision. See `§6.1`.
- [ ] `[scan]` Checkers puzzle pack — 678 *Gould's Problem Book* problems (American/English) as
  FEN + side + difficulty. Nothing built around it yet. See `§6.2`.
- [ ] `[scan]` Bomb Relay — pass-n-play party game, bomb fuse + mini-game challenges. See `§6.3`.
- [ ] `[scan]` Last Balloon — hold-to-inflate party game, persona bots. See `§6.4`.
- [ ] `[agent]` **Party-pack identity:** three of our four prototypes are "one phone, several
  humans, turn-based, funny" (Bomb Relay, Last Balloon, Ludo pass-n-play). That may be our
  actual brand promise — worth naming deliberately instead of drifting into it.
- [ ] `[agent]` **Puzzle-pack identity:** Chess + Checkers both come with real puzzle databases.
  A shared "Daily Puzzle" shell surface (one puzzle a day, per game, feeding the notification
  system) could reuse both data sets for cheap content. Needs your verdict on scope.
- [ ] `[you]` …
- [ ] `[you]` …
- [ ] `[you]` …

---

## 6. Entries

### 6.1 RS-003 — Chess
**Status:** PROTOTYPE · **Source:** `Chess.html` (137 KB, untracked in project root)

- **Hook:** real chess against a bot that actually thinks, with a daily puzzle as the reason to
  come back tomorrow.
- **Already built (verified by scanning the file):**
  - Full move generation including castling and en passant; FEN load/save.
  - Search: `negamax` + alpha-beta + quiescence — not a random-mover bot.
  - Menu already reads *"Daily + 3 difficulty tiers"*.
  - Undo, per-move juice (piece pop, screen shake, capture bursts).
- **What's missing to ship:**
  1. No `STUDIO_GAME_MANIFEST` block, so the shell cannot see it yet.
  2. No `window.Game` lifecycle (`pause` / `resume` / `destroy`).
  3. Puzzle data is a **2.6 MB** file and must NOT ship as-is (tier budget). Options: trimmed
     subset, packed/compressed string, or daily-puzzle-only from a small curated set.
  4. Decide top bot strength vs. file size.
- **Data on hand:** `chess_puzzles.txt` — Lichess-sourced JSON, `count: 10500`, buckets
  easy / normal / hard, entries `[puzzleId, FEN, solutionMoves, rating, themes]`.
- **Proposed (user to confirm):** Tier 1, deep slate/ink tile, 1P + optional 2P local,
  `aiSupport true`, portrait.
- **Risks:** opening-move variety vs. "feels buggy"; puzzle legality checking; board readability
  on small phones.
- **Next action:** pick the puzzle subset size — that number drives every other decision.

### 6.2 RS-004 — Checkers · Gould's Problems
**Status:** PROTOTYPE (data only) · **Source:** `CHeckers_puzzels_goulds_problems_all.json` (260 KB)

- **Hook:** 678 real historical checkers problems (*Gould's Problem Book*) solved one at a time —
  a pure "next puzzle" loop, no timer pressure.
- **Data truth (read from the file):** 1,094 source records → **678 puzzles** after de-duplication
  by FEN+result; 487 contain kings; difficulty is a deterministic piece-count heuristic
  (easy <= 6 pieces · normal 7–10 · hard >= 11), *not* a source-provided label.
  Entry shape: `{id:"gould-001", fen:"W:WK27,K23:BK28,12.", side, white[], black[], kingsW[],
  kingsB[], result, difficulty}`.
- **What's missing:** there is no game around the data yet — no board renderer, no solution
  checker, no manifest.
- **Scope-deciding question:** do we ship stored solutions per problem (verifiable — needs a
  solver or solution lines) or accept "player reports a win, next problem"?
- **Proposed (user to confirm):** Tier 1, ink/charcoal tile, portrait, `aiSupport none` (it is a
  puzzle, not an opponent).
- **Next action:** decide puzzle-vs-engine, then build the board renderer.

### 6.3 RS-005 — Bomb Relay
**Status:** PROTOTYPE · **Source:** `BombRelay.html` (188 KB, untracked)

- **Hook:** pass the phone, the bomb is ticking, complete the mini-challenge to survive, and the
  holder when the fuse hits 0:00 loses.
- **Already built (from the file's own copy):** *"1–4 PLAYERS · PASS N PLAY"*, per-player colours,
  robot buttons to make seats 2–4 bots, quick mini-games with their own objectives and hints,
  pass animation, a **screen flip for the next human player** so people sitting opposite each
  other can play, fuse countdown, escalating warnings, free hint/skip, round-based solo mode
  with local best ("N ROUNDS"), sponsored ad-break hooks, portrait lock.
- **What's missing:** `STUDIO_GAME_MANIFEST` + `window.Game` lifecycle; real ad calls must go
  through the shell's rewarded/banner bridge rather than the in-file stub; verify the
  pass-and-flip UX on a real phone in hand (it was built for a browser).
- **Proposed (user to confirm):** Tier 1, hot-orange tile, `minPlayers 1`, `maxPlayers 4`,
  `aiSupport true` (bots exist), portrait.
- **Monetisation fit:** banner on the round screen + rewarded skip/hint — natural, non-blocking.
- **Risks:** mini-game quality spread (a party game lives or dies on its weakest challenge);
  screen-flip confusion; keeping the fuse fair across phone sizes.
- **Next action:** play one full 4-player round on device and list which mini-games feel weak.

### 6.4 RS-006 — Last Balloon
**Status:** PROTOTYPE · **Source:** `LastBaloon.html` (110 KB, untracked)

- **Hook:** hold the pump, inflate the balloon, and hand it over before it pops — greed is funny
  right up until it isn't.
- **Already built (from the file's own copy):** *"a backyard party of poor decisions · 1–4
  players"*, hold-to-pump with release-to-end-turn, a meter that **exaggerates** while the
  balloon's true limit stays secret and shifts every game, creak/sweat/panic tells as it nears
  the limit, bot personas that pick their own personality, screen rotation between turns
  (1&3 vs 2&4, toggleable), rematch + home, backyard ambience with dandelion seeds and wind,
  local best tracking.
- **What's missing:** `STUDIO_GAME_MANIFEST` + `window.Game` lifecycle; verify the audio tells
  survive the shell's master-sound setting; check the balloon art at small screen sizes.
- **Proposed (user to confirm):** Tier 1, sky-blue tile, `minPlayers 1`, `maxPlayers 4`,
  `aiSupport true`, portrait.
- **Monetisation fit:** banner only — this is a short-session party game; rewarded ads would
  interrupt the mood.
- **Risks:** the whole game is one tension curve — if the tells are too generous it is trivial,
  too stingy and it feels random. Needs playtest tuning, not code.
- **Next action:** playtest the tells — decide whether the "creak" cue alone is enough.

---

## 7. Cross-cutting systems (these are not games — they are platforms)

Each has its own parked document so a game idea never has to carry platform decisions:

| System | Doc | Status |
|---|---|---|
| Global leaderboards (name · score · rank · nationality) | `LEADERBOARD_IDEA.md` | PARKED, post-launch |
| Online multiplayer (friend rooms → matchmaking) | `ONLINE_MULTIPLAYER_PLAN.md` | PARKED, post-launch |
| Coins economy (ads → coins → cosmetics) | `COINS_ECONOMY_PLAN.md` | PARKED, post-launch |
| Notifications (daily reminder, new-game news) | `NOTIFICATIONS.md` | IMPLEMENTED, Play-Store hardening near release |

**Rule:** if a new game needs one of the above, note it in the game entry and move on. Do not
build platform work as a side quest of a game.

---

## 8. Build-session playbook (when an idea graduates)

1. **Regression first** (`AGENT.md`): run `BUILD.bat`, confirm the APK timestamp is fresh, and
   re-check the previous phase's acceptance items before touching a new file.
2. **Copy the prototype into the shell:** `app/src/main/assets/games/<id>/index.html`. Leave the
   root `.html` where it is — it is the historical prototype, not a build input.
3. **Add the two required blocks:** `STUDIO_GAME_MANIFEST` (see `§2`) and the `window.Game`
   lifecycle with a sim-clock `pause` / `resume`, plus `destroy`.
4. **Route audio and haptics through the shell** so the master-sound and vibration settings in
   Settings actually govern the game (this was a real bug source in Ludo).
5. **Ads:** go through the shell bridge only. Google test unit IDs until release. Offline must
   show the "check your internet connection" path, never a fake ad.
6. **Syntax gate:** the `node -e` inline-script parse check from `AGENT.md` must pass and be
   quoted in the review request.
7. **Verify on device in BOTH themes**, and screenshot: menu, mid-game, game-over.
8. **Only then** flip the entry's status to `SHELL-READY` and update the board in `§1`.

---

## 9. Shelved / rejected — and why (so we don't relitigate)

| Idea | Verdict | Reason |
|---|---|---|
| Realtime rooms via Google Play Games Services | REJECTED | Play Games v2 dropped realtime multiplayer; effectively deprecated for new games. |
| P2P WebRTC for turn-based games | REJECTED (for now) | Same signalling-server work as a relay, with less control — see `ONLINE_MULTIPLAYER_PLAN.md §2`. |
| Loops / loot boxes for coins | REJECTED permanently | Breaks the anti-gamble charter in `COINS_ECONOMY_PLAN.md §1`. |
| Forcing bot mode when opening a bot-capable game from the 1 PLAYER grid | REJECTED | The game must open its own normal menu; the player chooses the mode. |
| Unity pipeline games inside the shell | PARKED | `CONTRACT.md §2`: big games are a separate pipeline, not shell content. |

---

## Changelog of this file

- 2026-09-20 — created. Board seeded from the four prototypes found untracked in the project root
  (Chess, Checkers/Gould's, Bomb Relay, Last Balloon), the two shipped games, and the principles
  already agreed in the four parked system docs. Agent-proposed identity observations marked
  `[agent]` in `§5` are awaiting your verdict, not accepted truth.

