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

| ID | Game | Status | Type | Players | Tier (est.) | Where it lives | One-line reminder |
|---|---|---|---|---|---|---|---|
| RS-001 | **Ludo** | SHIPPED | Board | 2–4 + bots | 1 | `assets/games/ludo/` | rankings, 10X bot test in dev mode |
| RS-002 | **Planet Merge** | SHIPPED (needs own session) | Puzzle | 1 | 1 | `assets/games/planetmerge/` | issues parked by user 2026-09-20 |
| RS-003 | **Chess** | PROTOTYPE | Classic | 1–2 (+bot) | 1 | `Chess.html` | engine done; no manifest block yet |
| RS-004 | **Checkers · Gould's problems** | PROTOTYPE (data only) | Puzzle | 1 | 1 | `CHeckers_puzzels_goulds_problems_all.json` | 678 puzzles, no game around them yet |
| RS-005 | **Bomb Relay** | PROTOTYPE | Party | 1–4 + bots | 1 | `BombRelay.html` | pass-n-play, fuse + mini-games |
| RS-006 | **Last Balloon** | PROTOTYPE | Party | 1–4 + bots | 1 | `LastBaloon.html` | hold-to-inflate tension curve |
| RS-007 | **Monopoly-style board game** | IDEA **(user's favourite)** | Board | 2–6 + bots | 1 | — | Indian + world boards, simplified map, our identity |
| RS-008 | **Party Pack** (shell section + games) | IDEA | Party | group on one phone | 1 | — | clue-and-guess, truth-or-dare, etc. |
| RS-009 | **Snakes & Ladders** | IDEA | Classic | 2–4 + bots | 1 | — | needs a real hook to beat the boredom |
| RS-010 | **Daadi (Jaadi)** | IDEA | Classic | 2 | 1 | — | nested squares / Nine Men's Morris |
| RS-011 | **Tic Tac Toe** | IDEA | Classic | 2 + bot | 1 | — | only worth it with juice + a twist |
| RS-012 | **Pen Fight** | PROTOTYPE (has issues) | Arena | up to 5 + AI | 2 (Matter.js) | `PenFight.html` | flick pens off the bench; physics engine must be local |
| RS-013 | **Connect Four** | IDEA | Classic | 2 + bot | 1 | — | drop-and-win, add gravity juice |
| RS-014 | **Dots & Boxes** | IDEA | Classic | 2–4 + bots | 1 | — | claim boxes, chain-reaction combo |
| RS-015 | **Chicken Chaos** | PROTOTYPE **(manifest ready)** | Arena | 2–4 + bots | 1 | `Chicken Chaos.html` | dash-and-carry arena; nearest to shippable |
| RS-016 | **Egg Rush** | PROTOTYPE | Arena | 2–4 + bots | 1 | `EggRush.html` | collect · rob · raid, landscape, golden eggs |
| RS-017 | **Memory Grab** | PROTOTYPE | Party | 2+ / vs AI | 1 | `MemeoryGrab.html` (filename has a typo) | memory pairs, hot-seat turn flip |
| RS-018 | **Balloon Battle** | PROTOTYPE | Arena | 2–4 | 1 | `balloonFight.html` | grab the pin, pop rivals' balloons |

> Sizes: prototype figures are raw `.html` size, the `CONTRACT.md` budget unit.
> **Type** is our own vocabulary, not a shell feature yet — see RS-008 for the "party section"
> shell work it implies.
> Two "PROTOTYPE (data only)" and "(manifest ready)" markers matter: they say how close a file is
> to dropping into `assets/games/`.


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
- [x] `[you]` **Party-pack identity — CONFIRMED 2026-09-20.** The user asked for a *party games
  section in the shell* plus small party games (clue-and-guess a word with a group, truth or dare).
  Three existing prototypes are already the same genre. Recorded as RS-008; needs a shell surface
  (a "PARTY" entry on Home + a manifest `category` field — not implemented yet).
- [ ] `[you]` Monopoly-style board game — the favourite. Indian board + other popular boards,
  simplified (fewer spaces), our own identity. See RS-007.
- [ ] `[you]` Snakes & Ladders (RS-009) · Daadi/Jaadi (RS-010) · Tic Tac Toe with juice + a twist
  (RS-011) · Connect Four (RS-013) · Dots & Boxes (RS-014) — all dumped 2026-09-20, entries in `§6`.
- [ ] `[you]` Pen Fight — developed, needs polish; "serious issues"; up to 5 players. See RS-012.
- [ ] `[scan]` Four more prototypes found in the project root: **Chicken Chaos** (RS-015, already
  has a valid manifest), **Egg Rush** (RS-016), **Memory Grab** (RS-017), **Balloon Battle**
  (RS-018). These are the "we were building it, not in development right now" files.
- [ ] `[agent]` **Puzzle-pack identity:** Chess + Checkers both come with real puzzle databases.
  A shared "Daily Puzzle" shell surface (one puzzle a day, per game, feeding the notification
  system) could reuse both data sets for cheap content. Needs your verdict on scope.
- [ ] `[agent]` **Category field:** RS-008 (party section) needs the shell to know a game's type.
  Proposal: add `category: board|classic|party|arena|puzzle` to the manifest, parse it alongside
  the other fields, and let Home show a PARTY band next to ALL GAMES. No game changes required.
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

### 6.5 RS-007 — Monopoly-style property board game ⭐ *user's favourite*
**Status:** IDEA (researched, not started) · **Added:** 2026-09-20 · **Asked for:** Indian board + other popular boards, simplified, with our own identity

- **Hook:** family game night on one phone — roll, buy, collect, ruin your friendships.
- **Boards:** an **India board** (our own city list and our own stations: railway junctions, plus
  our own "utility" pair), plus at least one more board later (world cities / a Telugu-AP board).
  Boards are just data, so a new board = a new list, not a new game.
- **The "simpler" cut you asked for:** a **shorter track** — a 7×7 perimeter is **24 spaces**
  instead of the usual 40 — with fewer property groups, one price tier per group, no mortgages at
  launch, and a fixed **45-minute ceiling** with an optional "quick rules" mode (~20 min).
- **Our identity (must be ours):** our own board art, our own card decks (our jokes, our studio
  in-jokes instead of licensed Chance cards), our own currency name per board, and our own name
  for the game. See the IP note below — this matters.
- **Core loop:** roll → move → land → buy/rent/card → build → someone goes bankrupt or the timer
  decides. Trading is the soul of the game, so the phone UI must make an offer **offer → counter →
  accept** in three taps.
- **Players:** 2–6 on one phone (pass-n-play), bots later. Bots are the expensive part (valuation +
  trade logic), so they are a **phase 2**, not a launch requirement.
- **Tier:** 1 (Canvas/DOM, 24 tiles is tiny). Tile colour: money-green `#2E9E5B` (Ludo owns red).
- **Manifest draft:** `id monopoly-ish`, `portrait`, `minPlayers 2`, `maxPlayers 6`,
  `aiSupport none` at first, `online false`.
- **⚠️ IP warning (the biggest risk here):** *Monopoly* is a Hasbro trademark and its board art,
  logo, card text and piece names are protected. The **mechanics** of property-trading games are
  not owned by anyone (they go back to *The Landlord's Game*, 1903) but we must not ship Hasbro
  trade dress, the name, or the exact 40-space layout. Our own name + our own board + our own
  cards keeps us clean. Play-safe: title it something of ours, never "Monopoly" in the store, the
  app, or the keyword list.
- **Other risks:** session length vs. a phone in hand (save-and-resume is mandatory); trading UI on
  a small screen; bot economics quality; keeping 6 players' cash visible without clutter.
- **Monetisation fit:** cosmetic boards and dice only, plus coins spend on board themes later
  (`COINS_ECONOMY_PLAN.md`). Never sell an in-game advantage in a game with money in it.
- **Open questions for you:** (1) how long should a full game be? (2) launch with hot-seat only,
  or must bots be in version 1? (3) do you want the India board to be real city names or invented
  places? (4) name ideas — I'll bring a shortlist when we start.
- **Next action:** research pass (rules variants, 24-space economy maths, what makes the last 10
  minutes cruel in a good way), then write the board data + a playable movement-only prototype.

### 6.6 RS-008 — Party Pack (shell section + the small party games)
**Status:** IDEA (direction confirmed by user 2026-09-20) · **Players:** a group sharing one phone

- **Hook:** the game you play *with* people in the room — phone in the middle, everyone shouting.
- **What you actually asked for:** a **party option in the shell**, then small party games
  (one person gives clues to a word while the group guesses; truth or dare; that family of things).
- **The architecture insight — build ONE framework, then content modules:**
  `PartyKit` (shared engine) provides: teams or players, a colour per player, a shared timer,
  a scoreboard, an interstitial "pass the phone to X" screen (with the screen flip we already do
  in Bomb Relay / Memory Grab), a round counter and a results screen. Each party game is then a
  **content module** on top of it. That is how we get six party games for the price of two.
- **First three modules (order of attack):**
  1. **Clue & Guess** — one player sees a word and gives clues; group guesses against a timer.
     Pass-the-phone by round, teams score. (Closest to what you described.)
  2. **Dumb Charades** — phone shows a word to the actor only; categories + difficulty tiers.
     This is the party game everyone in India already knows, and the phone replaces the paper.
  3. **Truth or Dare** — local-only content deck, clean/classic by default, with an explicit
     age toggle. Content must be written by us and reviewed for store rating (see risks).
- **Also on the shortlist:** Two Truths and a Lie · Would You Rather · Never Have I Ever ·
  Story Builder (each player adds one line) · Rapid Fire categories.
- **Shell work this implies (not implemented yet):**
  - a manifest `category` field (`board|classic|party|arena|puzzle`) parsed next to the others;
  - a **PARTY** band on Home (mirrors how ALL GAMES works today) or a filter on the Mode screen;
  - the existing pass-n-play mechanics (screen flip, "pass to X") reused rather than reinvented.
- **Tier 1, portrait**, group-sized text. Tile colour: party-pink/magenta.
- **Monetisation + policy notes:** party games are local-only (no network → no online-interaction
  declaration needed). Ads stay minimal — a banner on results only; an ad mid-shout kills the mood.
  Truth-or-dare content must be genuinely tame by default; age rating and content review are a real
  task, not a line item.
- **Risks:** a party game with weak content is dead on arrival — the writing is the product, so this
  needs a content session with you, not just code. Also: one phone means one small screen for
  everyone, so type must be huge and readable at arm's length.
- **Next action:** agree the three launch modules, then build `PartyKit` + Clue & Guess as the pilot.

### 6.7 RS-009 — Snakes & Ladders
**Status:** IDEA · **Type:** Classic / family · **Added:** 2026-09-20

- **Hook:** nobody's favourite game, everybody's ten minutes — the fastest session in the pack
  (~2–3 min) and the one a parent plays with a kid.
- **Honest read:** as a *game* it has zero decisions, so all the design work is **feel and speed**.
  Its job in the pack is to be the shortest, juiciest, most colourful tile, not the deepest.
- **Build:** 10×10 board as pure data (snakes/ladders tables per board, so a new board is a list),
  animated pawn hops, **bump-off** when landing on an occupied square (the only real interaction
  the game can have), roll-again on a 6 so a turn never stalls, and a full-screen "bitten"/"climbed"
  moment with shake + floating text + sfx.
- **Twist candidates — pick ONE for launch and keep a pure mode:**
  1. **Bribe the snake** — land on a snake head and spend one per-game token to climb instead.
  2. **Pick your ladder** — one reroll per player per game, used before rolling.
  3. **Indian board identity** — temple steps and mango-tree ladders, kites and monsoon clouds
     instead of generic snakes; *vaikuntapali* / Pachisi flavour. This one costs nothing extra
     and is the most "us".
- **Bot:** trivial (it just rolls) — good news for `aiSupport true` from day one.
- **Tier 1, portrait.** Tile colour: warm sand/yellow-orange. Manifest draft:
  `id snakes-ladders`, `minPlayers 2`, `maxPlayers 4`, `aiSupport true`.
- **Risks:** it feels cheap instantly if the juice is thin; the twist must not break the
  no-decisions innocence; keep the art friendly (this tile will be played by kids).
- **Next action:** choose the single twist + the board theme, then build board data + hop animation.

### 6.8 RS-010 — Daadi (Telugu "Jaadi") · the chalk-and-stones game
**Status:** IDEA (rules researched and verified 2026-09-20) · **Type:** Classic / heritage

- **Hook:** "the game the Andhra fisherfolk were said to be impossible to beat" — drawn on the
  ground with chalk, played with stones. Zero luck, pure thinking, and it is *ours*.
- **Verified rules (researched, not guessed):** this is the **Nine Men's Morris** family, known as
  **Daadi** in Telugu (literally "to attack"), and also **Navakankari** (Sanskrit), **Saalu Mane
  Ata / Char-Par** (Kannada), **Jodpi Ata**, **Muhle**, **Navkakri** (Gujarati). It is documented as
  a game of the fisherfolk of **Sorlagondi, Krishna district, Andhra Pradesh** — a community famous
  for being near-unbeatable at it.
  - Board: **three concentric squares joined by mid-lines = 24 points** (no equipment needed
    beyond chalk and stones).
  - Each player gets **9 pieces** (some local versions use 11).
  - **Phase 1 — placing:** players alternate placing a piece on any free point. Three of your
    pieces in a line (a **mill**) lets you **remove one of the opponent's pieces**.
  - **Phase 2 — moving:** pieces slide along the connected lines to adjacent free points;
    another mill = another capture.
  - **Flying (standard modern rule, optional here):** when a player is down to 3 pieces, their
    pieces may jump to any free point — this is what fixes an otherwise unwinnable stall.
  - **Win:** reduce the opponent to **2 pieces**, or **block every legal move** they have.
- **Your memory vs the record:** you remembered "two squares and more of them, like tic tac toe".
  That is the **nested-squares family** — but the version played in AP is the **3-square/24-point**
  one. There is also a simpler **two-square** variant used as a beginner board. **Open question:
  which one did you grow up with** — and do we ship both (small board = beginner, 24-point = full)?
- **Our identity (the reason this idea is strong):** it is *drawn on the ground*. Art direction =
  chalk lines on sand/rock, two kinds of stone as pieces (one smooth, one rough), a shoreline
  background, gulls and surf as ambience. No other store game looks like that, and it costs us
  nothing but taste.
- **Build:** the board is a **graph** — 24 nodes, 32 edges, plus the line sets that can form mills.
  State = node occupancy; phases = place → move → fly; win check = fewer than 3 pieces or zero
  legal moves.
- **Bot:** negamax/minimax with an evaluation of material + mills + mobility + blocked enemy pieces.
  A well-trodden problem, so "hard" can be genuinely strong — which also makes it a great fit for
  the future leaderboard and daily-puzzle work.
- **Tier 1, portrait, 2 players**, `aiSupport true`, tile colour: chalk-white on slate grey.
- **Monetisation:** banner only. A no-luck heritage game does not want coins in it.
- **Next action:** confirm the variant, then build the board renderer + mill/win logic (the rules
  engine is small and fully testable before any art exists).

### 6.9 RS-011 — Tic Tac Toe (juice + a twist)
**Status:** IDEA · **Type:** Classic · **Added:** 2026-09-20

- **Hook:** the world's smallest game — the only reason to ship it is to ship the *best-feeling*
  version of it, plus one twist nobody expects.
- **Honest read:** classic 3×3 with perfect play is a forced draw. Plain, it is a wasted tile.
  So ship it as a **three-mode package in one file**:
  1. **Classic (juiced)** — dust particles on placement, winning-line glow + screen shake, a bot
     that plays perfectly on hard and taunts a little.
  2. **Misère** — *three in a row loses*. Tiny rule change, real brain teaser, zero extra code.
  3. **Ultimate Tic Tac Toe** — nine small boards inside a 3×3 meta-grid; the square you play
     sends your opponent to the matching board. Deep, no luck, 2 players, hugely replayable.
     **This is the "new mechanic for fun" answer**, and the mode people will actually play twice.
- **Bots:** perfect play via negamax for Classic/Misère (the state space is tiny); depth-limited
  search for Ultimate — strong but fallible, which is exactly the fun range.
- **Tier 1, portrait.** Tile colour: chalk cyan. Manifest draft: `id tic-tac-toe`,
  `minPlayers 1`, `maxPlayers 2`, `aiSupport true`.
- **Policy:** public-domain folk game — no IP concerns at all.
- **Next action:** decide whether Ultimate ships at launch (I recommend yes — it is the selling
  point); then build Classic + Misère first, since both reuse the same board code.

### 6.10 RS-012 — Pen Fight
**Status:** PROTOTYPE (has issues — user, 2026-09-20) · **Source:** `PenFight.html` (77.5 KB)

- **Hook:** desk-warfare nostalgia — pull back, release, flick your rival's pen off the bench.
- **What's in the file (scanned):** a **bench prototype**, pulled-back flick control with an aiming
  line, "flick pens off", scoring **kill +1 / survivor +3**, landscape lock, a seat grid where you
  tap a seat to toggle **human / AI** (dashed = AI), an **AI skill** setting, rounds with
  "highest score wins", and physics-driven motion.
- **⚠️ The serious issue I can prove from the code (and it breaks our own contract):**
  it **loads Matter.js from a CDN**, and the file's own fallback message tells the user to download
  `matter.js` next to the HTML. That violates `CONTRACT.md §1.2` (*zero network calls at runtime*)
  and means **the game simply fails offline** — "Couldn't load the physics engine" on a phone with
  no internet is exactly the bug class we already fixed once for ads.
  **Fix:** inline Matter.js into the file (minified ≈ 150 KB → total ≈ 230 KB, comfortably inside the
  Tier-2 450 KB budget), or replace it with our own tiny circle-vs-circle collision code.
- **Other gaps to close before it ships:**
  1. No `STUDIO_GAME_MANIFEST` block (the shell cannot see it).
  2. No proper `window.Game` lifecycle — `resume` appears but `pause` / `destroy` / sim-clock
     freezing are not implemented, so a backgrounded game keeps simulating.
  3. **AI quality:** flick AI is the hard part (aim + power selection), and it is currently the
     weakest-feeling area. Plan: heuristic aim at the nearest enemy + a power search over a small
     candidate set, then tune.
- **Open question for you:** you said "some serious issues" — from the code I can only see the
  CDN/physics dependency, the missing manifest/lifecycle, and AI difficulty. **Tell me which ones
  you meant** and I will put them at the top of the entry.
- **Players:** up to 5 (hot-seat seats + AI), landscape, real-time physics (so it is an **Arena**-type
  game, not pass-n-play turn-based like Bomb Relay).
- **Tier 2 (physics)**, tile colour: ink blue. Manifest draft: `id pen-fight`, `landscape`,
  `minPlayers 2`, `maxPlayers 5`, `aiSupport true`.
- **Risks:** same-screen multi-touch control needs a layout where 5 players can each reach a
  control; physics must be deterministic enough that a "flick" feels repeatable; per-device frame
  rates can change flick distance, so keep input time-based, never frame-based.
- **Next action:** inline the physics engine, then add manifest + lifecycle, then playtest the AI.

### 6.11 RS-013 — Connect Four
**Status:** IDEA · **Type:** Classic · **Added:** 2026-09-20

- **Hook:** drop, clack, connect — the classic with real gravity and a satisfying *thunk*.
- **Build:** 7×6 grid, drop animation with a bounce, falling-dust particles, winning-line glow +
  shake, and a bot. Also: highlight the column on hover/drag so aiming feels physical.
- **The important design catch:** Connect Four is a **solved game** — with perfect play the first
  player always wins. So:
  - cap the "hard" bot at a depth where it is strong but **fallible** (a depth-7 search with a
    scoring tweak) — otherwise the player is guaranteed to lose when going second, which is not fun;
  - ship at least one **variant mode** as the differentiator:
    1. **Pop** — the official-ish extra rule: a player may remove one of *their own* bottom pieces
       (it pops up and out), which re-opens the board and kills stalemate play.
    2. **Power columns** — one column per game drops a "bomb" piece that clears the square below.
    3. **Blitz** — 10-second turns; the timer, not the maths, becomes the game.
- **Bots:** classic minimax + alpha-beta with a small transposition table (the game tree is tiny) —
  this is a well-trodden build, so it should be quick.
- **Tier 1, portrait.** Tile colour: cobalt blue. Manifest draft: `id connect-four`,
  `minPlayers 1`, `maxPlayers 2`, `aiSupport true`.
- **Next action:** decide which variant ships (my pick: Pop, because it is a real rule and it fixes
  the solved-game boredom), then build board + drop feel first, bot second.

### 6.12 RS-014 — Dots & Boxes
**Status:** IDEA · **Type:** Classic · **Added:** 2026-09-20

- **Hook:** the notebook game everyone played in school — but with a combo counter and a bot that
  punishes a careless chain.
- **Why it deserves a tile:** it has a *real* strategic layer (the **double-cross** sacrifice:
  giving your opponent a short chain to force them to open a long one for you). That means the game
  has depth that Tic Tac Toe does not, with zero luck.
- **Build:** grid sizes as data (4×4 beginner → 6×6 standard → 8×8 expert), tap a gap to draw a
  line, box completion animation with a satisfying fill + colour wash in the owner's colour,
  **chain-combo** counter that escalates sound/pitch per box in a run, and a "one more box!" pulse.
  - Player colours identify ownership; in 2–4 player mode each line keeps its owner's colour, so
    the board stays readable.
- **Bots:** greedy-first (always take a free box), then chain-aware: count chains, avoid opening a
  long chain, and use double-cross when behind on parity. That progression gives three difficulty
  tiers for free.
- **Twist candidates (optional):** bonus box (worth 3), a rare "bomb line" that clears adjacent
  claimed boxes, or a timed Blitz mode.
- **Tier 1, portrait.** Tile colour: graphite/violet. Manifest draft: `id dots-and-boxes`,
  `minPlayers 1`, `maxPlayers 4`, `aiSupport true`.
- **Monetisation:** banner only; cosmetic board colours later.
- **Next action:** build the grid + line/box model and the greedy bot, then measure whether the
  chain-aware bot feels smart enough (that is the whole game).

### 6.13 RS-015 — Chicken Chaos
**Status:** PROTOTYPE · **Source:** `Chicken Chaos.html` (97.5 KB) · **Closest to shippable of all**

- **Hook:** grab the chicken, dash away, don't get tackled — a same-screen scramble where everyone
  fights over one bird.
- **What's in the file (scanned):** a **full-screen canvas arena**, dash mechanic with cooldown
  (`DASH_SPEED`, dash trails), a chicken that **flees** from nearby players and takes them into
  account while being carried, carry/score logic with a carry timer, power-ups, particles and
  floating text, **SOLO VS BOT**, arena bounce/walls, safe-area handling, an explicit full-screen
  guarantee for older WebViews, error handling (`GAME ERROR`, `showFatal`/`runtimeError`), a
  `WINNER CHICKEN` result panel, and a **landscape lock**.
- **✅ It already has a valid `STUDIO_GAME_MANIFEST`** (the only prototype that does):
  `id: chicken-chaos`, `orientation: landscape`, `minPlayers: 2`, `maxPlayers: 4`,
  `aiSupport: true`, `online: false`, `tileColor: #6BCB4A`, `version: 1`.
- **✅ It also already has the Studio SDK block and a lifecycle** (`pause` / `resume` / `destroy`,
  and it references `showRewarded`).
- **What's left before it drops into `assets/games/chicken-chaos/`:**
  1. the `AGENT.md` inline-script syntax gate must pass;
  2. confirm the **landscape path** actually works in our shell — the app is portrait-locked today
     and no shipped game runs landscape yet (Egg Rush and Pen Fight have the same requirement);
  3. verify ads/pause behaviour on a real device, both themes, then screenshot the three key states.
- **Tier 1, landscape, 2–4 players + bots.** Tile colour already chosen: `#6BCB4A`.
- **Verdict:** this is the **cheapest third game** we own — mostly verification work, not authoring.
  If you want a fast win after the shell polish, this is the one.
- **Next action:** run the syntax gate, then a landscape device test.

### 6.14 RS-016 — Egg Rush
**Status:** PROTOTYPE · **Source:** `EggRush.html` (97.7 KB, "REVISION 5") · **Type:** Arena

- **Hook:** *COLLECT · ROB · RAID* — hoard eggs, steal them off rivals, and get them home.
- **What's in the file (scanned):** landscape arena, hens as players (red/yellow/blue/purple =
  P1–P4), egg states (loose / carried / delivered), **golden eggs** that score extra (`G×` counter),
  a **race mode with a target score**, bot count and "eggs to win" settings, a "RACE ONLY" option,
  steal/rob interaction between players, dash + magnet + shield-style power-ups, particles, a win
  panel with winner identity, and `PLAY AGAIN`.
- **Already present:** Studio SDK block and a lifecycle (`pause` / `resume` / `destroy`).
- **Missing:** `STUDIO_GAME_MANIFEST` (id/title/orientation/players/tile colour) — that is the main
  blocker; plus the syntax gate and a landscape device test.
- **Proposed manifest (user to confirm):** `id egg-rush`, `landscape`, `minPlayers 2`,
  `maxPlayers 4`, `aiSupport true`, `tileColor` a warm egg-yellow.
- **Design note:** rob/steal means a leader can be punished constantly — tune the "carrying makes you
  slower" mechanic so a big lead is risky but not impossible; that tension is what makes it funny.
- **Next action:** add the manifest, then device-test landscape + the race mode.

### 6.15 RS-017 — Memory Grab
**Status:** PROTOTYPE · **Source:** `MemeoryGrab.html` (57.8 KB — note the filename typo) · **Type:** Party

- **Hook:** *Remember. Match. Score.* — memory pairs you pass around the room, with no timer pressure.
- **What's in the file (scanned, from its own how-to-play copy):** cards start face-down, tap one to
  reveal, tap a second: **match = +1 and you keep your turn; no match = they hide and it passes on**.
  The **screen turns around on turn change** ("pass the phone!"), and in **BOTS mode the board stays
  facing you**. **No timer** — it ends when every pair is found, highest score wins.
  Menus: `PLAY TOGETHER` / `PLAY VS AI`, `SELECT PLAYERS`, `GAME PAUSED`, `MAIN MENU`,
  `MEMORY COMPLETE` / `FINAL SCORE`, plus a short-viewport guard for small screens.
- **Why it fits us:** it is a **party game with a real brain in it**, and it reuses the exact
  screen-flip idea Bomb Relay already proved. It is also the cheapest content to extend later
  (card sets are just data: animals, food, flags, our own studio art).
- **Already present:** Studio SDK block and lifecycle. **Missing:** the manifest block; also rename
  the file to `memory-grab` when it ships (the typo would otherwise become the folder name).
- **Proposed manifest (user to confirm):** `id memory-grab`, `portrait`, `minPlayers 2`,
  `maxPlayers 4`, `aiSupport true`, tile colour a soft violet.
- **Next action:** add the manifest + rename, then treat card-set themes as future content.

### 6.16 RS-018 — Balloon Battle
**Status:** PROTOTYPE · **Source:** `balloonFight.html` (74.4 KB) · **Type:** Arena

- **Hook:** *grab the pin, pop their balloons* — a sky-island scramble where the pin is the weapon
  and everybody wants it.
- **What's in the file (scanned):** a **sky-island arena**, a **pin** that spawns on a timer with a
  `GOT THE PIN` / `PIN EXPIRED` cycle, power-ups (shield, dash, speed) that drop out of bubbles,
  obstacles with proper collision push-out, elimination (`IT'S A DRAW`, winner detection), floating
  text + particles, a nameplate HUD per player, and a **seat-mapped layout** (`P1 BOTTOM`,
  `P2 BOTTOM`, locked seat mapping) so 2–4 players share one screen, plus `ROTATE YOUR DEVICE`
  (landscape) and `PLAY AGAIN`.
- **Already present:** a lifecycle (`pause` / `resume` / `destroy`).
- **Missing:** `STUDIO_GAME_MANIFEST`, the **Studio SDK block** (it is the one arena prototype
  without it), the syntax gate, and landscape verification.
- **Players:** 2–4 on one phone, real-time multi-touch — same class as Chicken Chaos and Egg Rush.
- **Proposed manifest (user to confirm):** `id balloon-battle`, `landscape`, `minPlayers 2`,
  `maxPlayers 4`, `aiSupport false` at first (a multi-touch arena needs real AI work for bots),
  tile colour a bright coral.
- **⚠️ Naming collision to resolve:** we already have **RS-006 Last Balloon** (hold-to-inflate party
  game) and now **Balloon Battle** (arena). Two balloon games is a discoverability problem and the
  names are too close. Decide when we get there: rename one (Last Balloon → "Don't Pop It!"), or
  ship the arena first.
- **Next action:** add the manifest + Studio block, then a landscape device test.

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

### Shell gaps these prototypes just exposed (all shell-side, none game-side)

| Gap | Why it matters | Status |
|---|---|---|
| **Landscape games** | Chicken Chaos, Egg Rush, Pen Fight and Balloon Battle are all landscape; the app is portrait-locked and no shipped game runs landscape yet. The `orientation` manifest field exists — the path is just unverified. | TO VERIFY |
| **`category` manifest field** | RS-008 (Party) and the Type column in `§1` have no shell representation. Without it there is no way to show a PARTY band or group games by kind. | NOT IMPLEMENTED |
| **Pass-n-play conventions** | "Pass the phone to X" + the screen flip are already implemented twice independently (Bomb Relay, Memory Grab). If we build the Party pack, extract them once instead of a third copy. | PATTERN TO EXTRACT |
| **Same-screen multi-touch arenas** | Chicken Chaos / Egg Rush / Balloon Battle put 2–4 people on one glass. Nothing in the shell has to change, but we have never tested multi-touch inside the WebView. | TO VERIFY |
| **Two balloon titles** | RS-006 Last Balloon vs RS-018 Balloon Battle — resolves before either ships. | DECISION LATER |

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

## 10. Inactive files in the repo (archive — not games)

These live in the project root so history is not lost, but they are **not** shell content and must
not be copied into `assets/games/`. Recording them here stops future-us from "discovering" them.

| File | What it actually is | Treat it as |
|---|---|---|
| `Ludo.html` | the original Ludo prototype (97 KB, predates the shipped `assets/games/ludo/`) | reference only — the shipped file is the truth |
| `PlanetMerge-old.html` | an old Planet Merge take | reference only |
| `previous_pm.html`, `previous_known_good.html`, `backup_pm_knowngood.html` | three known-good Planet Merge snapshots (~270 KB / 545 KB each) | rollback safety net while PM is being fixed |
| `manus-reference.html` | an external design/AI reference, not our code | reference only |
| `forensics/broken_planetmerge_2026-09-18.html` | the broken PM build kept for diagnosis | forensics |
| `Design--ref/*.jpeg`, `brand/red-studios-logo.jpg` | the design inspiration set and the brand logo | assets, keep |

**Rule:** a prototype lives in the root until it is shell-ready; only then does it get copied into
`assets/games/<id>/`. Never edit the root copy and the shipped copy in the same session without
noting which one won.

---

## Changelog of this file

- 2026-09-20 — created. Board seeded from the four prototypes found untracked in the project root
  (Chess, Checkers/Gould's, Bomb Relay, Last Balloon), the two shipped games, and the principles
  already agreed in the four parked system docs. Agent-proposed identity observations marked
  `[agent]` in `§5` are awaiting your verdict, not accepted truth.
- 2026-09-20 (later) — idea dump recorded: RS-007 Monopoly-style board game (the user's favourite,
  with the IP warning written down), RS-008 Party Pack + the `PartyKit` architecture, RS-009
  Snakes & Ladders, RS-010 **Daadi/Jaadi — rules researched and verified** (Nine Men's Morris
  family, 24 points, mills, AP fisherfolk heritage), RS-011 Tic Tac Toe (three-mode package with
  Ultimate as the twist), RS-012 Pen Fight (CDN physics dependency identified as a
  `CONTRACT.md` breach), RS-013 Connect Four (solved-game warning + Pop variant), RS-014 Dots &
  Boxes. Four further prototypes discovered in the root and recorded: RS-015 Chicken Chaos
  (**already has a valid manifest — cheapest third game**), RS-016 Egg Rush, RS-017 Memory Grab,
  RS-018 Balloon Battle. Added the Type column, the shell-gaps table in `§7`, and the `§10` archive
  of inactive repo files.

