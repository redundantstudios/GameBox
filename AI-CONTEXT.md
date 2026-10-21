# AI-CONTEXT.md — the shared briefing

**Read this first.** It is the one file that tells you everything about this
project that you cannot infer from the code. `AGENT.md` holds the working
protocol (feedback → change → build → install → test). `CONTRACT.md` holds the
rules the shell and the games agree to. This file holds the map, the shared
surface, and the mistakes that have already cost this project time.

If you only read one thing, read this. If you are picking up a specific game,
also read the brief for whoever owns it.

---

## 1. What this is

An Android shell (`app/src/main/java/com/redundantstudios/arcade/`) that loads
25 single-file HTML games from `app/src/main/assets/games/` and runs them in a
WebView. Ads, audio, haptics, save data and the back button all live in the
shell; the games talk to it through a small JavaScript bridge.

**You are one of three people working on this at the same time.** See
section 4.

---

## 2. The map

```
app/src/main/assets/games/<game>/index.html    the game - ONE self-contained file
app/src/main/assets/shell/*.js                the shell's four page scripts - SHARED
app/src/main/java/com/redundantstudios/arcade/ the shell (Kotlin) - SHARED
app/src/main/res/raw/*.ogg                    the shell's sounds - COMMITTED, do not regenerate
app/src/main/assets/shell/dpr.js                 resolution cap + adaptive governor
app/src/main/assets/shell/fullscreen.js         fullscreen stub
app/src/main/assets/shell/canvaswatch.js        canvas-loss watcher (logs as "CW:")
app/src/main/assets/shell/audiotracker.js        AudioContext capture (logs as "AudioTrack:")
sources/                                     the ORIGINAL of every game - the spec
```

**A game is one file.** 23 of the 25 are a single `index.html`; `checkers`
and `chess` have one extra data file each. The games share no code with each
other. That is what makes parallel work on different games safe.

**The shell's sounds are committed.** `app/src/main/res/raw/*.ogg` is in git,
so every clone ships the same audio and the app runs immediately. The
generators in `Tools/_gen_audio.py` and `Tools/_gen_bgm.py` are for
*changing* a sound deliberately and they now **refuse to overwrite a
committed file** unless you pass `--force`. Do not regenerate them to "fix" a
sound — that is precisely how three developers ended up with three different
apps. The games' own sounds are not in `res/raw` at all: they are base64
embedded in each game's `index.html` and travel with the game file.

**The original is in `sources/`.** It is the reference for *art and gameplay* —
not a thing to edit, and not necessarily what shipped. The shipped file in
`app/src/main/assets/games/` has the studio's manifest, the bridge wiring, the
ad wiring and the four script tags added on top of it. When a user says
"that isn't how it looked", the original is where you check.

| shipped game | original in `sources/Playable Games/` |
|---|---|
| `balloon-battle` | `balloonFight.html` |
| `bomb-relay` | `BombRelay.html` |
| `carroms` | `carromsNew.html` |
| `checkers` | `checkers.html` |
| `chess` | `LockedGames/Chess.html` |
| `chicken-chaos` | `LockedGames/Chicken Chaos.html` |
| `chinese-checkers` | `Chinese Checkers.html` |
| `colour-rush` | `ColourRush.html` |
| `connect-four` | `ConnectFour.html` |
| `egg-rush` | `EggRush.html` |
| `ember` | `Ember.html` |
| `kiro` | `Kiro.html` |
| `knot-away` | `knot Away.html` |
| `last-balloon` | `LastBaloon.html` |
| `ludo` | `LockedGames/Ludo.html` |
| `magnet-pull` | `MagnetChangeThePull.html` |
| `memory-grab` | `MemeoryGrab.html` |
| `midnight-overdrive` | `MidNightOverdrive.html` |
| `mimic` | `Mimic.html` |
| `orrery` | `orrery.html` |
| `planetmerge` | **none found** - built in the studio, no original |
| `pool-8ball` | `8 Ball Pool.html` |
| `root-io` | `Root.io.html` |
| `sheepdog-trials` | `Sheepdog Trials.html` |
| `truth-or-dare` | `truthOrDare.html` |

---

## 3. The rules that actually matter

**Never change the art without being asked.** Not to "simplify", not to
"optimise", not to make a fix easier. If a fix needs the art changed, say so
and let the user decide. This is not a style preference — the user has already
had a sheep design altered and sent it back.

**Batch, never simplify.** When something is slow, the answer is to do the same
drawing with fewer canvas calls: one path for many shapes, a pre-rendered
sprite for something that does not change, the same path stroked twice in two
colours. The pixels must come out identical.

**A game's own limits are its own.** If a game caps its resolution at 1.5, do
not raise it to make it faster.

**Keep the contract.** `STUDIO_GAME_MANIFEST`, the `window.Game` lifecycle
(`pause` / `resume` / `destroy`), and the bridge calls the game already makes.
Read `CONTRACT.md` before adding a bridge method.

**The shell scripts are shared.** All four files in `app/src/main/assets/shell/`
are loaded by **all 25 games**. Changing one changes every game. The DPR cap
in particular is what keeps the games smooth on a weak phone — do not weaken it
to make one game look better.

---

## 4. Working with other people

Three people, three clones, three branches. **Fill this in before anyone
starts** — a proposed split is below, but the humans decide it:

| area | owner |
|---|---|
| `app/src/main/java/**` (the shell) | **lead** |
| `app/src/main/assets/shell/**` | **lead** |
| `balloon-battle` `bomb-relay` `carroms` `checkers` `chess` `egg-rush` `knot-away` `root-io` | bobby |
| `chinese-checkers` `colour-rush` `last-balloon` `ludo` `magnet-pull` `memory-grab` `midnight-overdrive` `mimic` `planetmerge` | badri |
| `connect-four` `ember` `orrery` `pool-8ball` `sheepdog-trials` `truth-or-dare` | lead |

The proposed split puts the three heaviest games — `root-io`, `kiro`-class
work and `sheepdog-trials` — with different people, so a performance problem
in one does not serialise behind the same pair of eyes. It is a starting
point, not a decision.

**The rule that makes it work:** a game owner may change anything inside their
own game's folder, and may **ask** for a shell change but not make one. If
your fix needs something new from the shell, stop and say so — do not add it.

**Branch discipline:**

- Never commit straight to `main`. One branch per task:
  `bobby/colour-rush-joysticks`.
- `git pull --rebase` before you push. Rebase keeps history linear.
- Never merge locally. Push the branch and open a PR.
- Run the syntax gate before every push. It catches the mistakes below
  instantly, and it is one command.

---

## 5. The commands

```bash
# the syntax gate - run this after EVERY edit to a game
node -e "const fs=require('fs');const s=fs.readFileSync('PATH','utf8');const m=[...s.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)];m.forEach((x,i)=>{try{new Function(x[1])}catch(e){console.log('SYNTAX FAIL script#'+i+': '+e.message);process.exit(1)}});console.log('ALL SCRIPTS PARSE OK')"

# build
BUILD.bat

# build AND install to the connected phone
DEPLOY.bat

# read the game's own console output
adb logcat -d -s GameJS
```

`GameJS` carries the games' `console.log`. The shell's own lines come out as
`GameTransition`, `AdPolicy`, `NativeBridge` and `GameActivity`.

**The user tests the app, not you.** Read `AGENT.md` section "DO NOT TEST THE
APP YOURSELF". When a bug needs a log, ask the user to reproduce it and read
what they generate.

---

## 6. The mistakes that have already cost this project time

These are all real, and all of them were caught by the syntax gate or by
reading a diff afterwards. They are here so you do not repeat them.

**1. The HTML files have MIXED line endings.** Some lines are CRLF, some LF.
A multi-line search-and-replace will silently fail on a CRLF region and
succeed elsewhere, and you will believe you changed something you did not.
*Always check that the edit landed* — read the file back and look.

**2. Never find the end of a function by counting braces.** These files
contain JavaScript, which is full of braces, and string literals, which can
contain braces. A script that counts braces will stop in the wrong place and
delete a chunk of the file. Find a function by its line range, or match
braces while skipping strings and comments.

**3. `splice` needs a spread.** `arr.splice(i, n, [a, b])` inserts the array
as **one** element, and joining the file then writes it out as `a,b` on one
line. Use `arr.splice(i, n, ...[a, b])`.

**4. A terminal display can lie about a line.** When you copy a line out of
console output it may have picked up a trailing comma from the display
formatting. Copy code from the file, not from a printed line.

**5. Always run the syntax gate after editing.** Mistakes 1-4 all produce a
file that still *looks* fine. The gate catches them in a second.

**6. A change that is not built and installed does not exist.** `DEPLOY.bat`
in the same turn, every turn.

**7. The DPR cap and the governor are in the shell, not in the games.** If a
game is slow, look at *its own* draw calls first. A game that issues a
thousand canvas calls a frame is slow because of the calls, and no amount of
resolution reduction will help it.

---

## 7. How to find out why a game is slow

Most "it lags" reports are **canvas draw calls per frame**, not app size and
not file size. Measure before changing anything.

There is a tool for it:

```bash
node Tools/_profile_game.js app/src/main/assets/games/orrery/index.html
node Tools/_profile_game.js app/src/main/assets/games/sheepdog-trials/index.html "startLevel(23);state='play';"
```

It loads the game in a headless DOM, counts every 2D drawing call per frame
and attributes each one to the function that made it.

**The second argument matters.** Without it you are measuring the MENU, which
is usually much cheaper than the game, and the number you get can be less than
half of what the player actually pays. Pass the setup that reaches real play.

A worked example — Sheepdog Trials at a late level:

```
draw calls per frame : 3919
  ^ HIGH. On a phone this is the lag.
top functions:
  drawSheep              3306/frame  84%
  drawTree                196/frame   5%
  drawGrassClumps         106/frame   3%
```

**84% of the frame in one function.** That is where to look, and it is a
drawing that can be batched rather than simplified.

Measured figures from the last pass, for reference:

| game | before | after |
|---|---|---|
| sheepdog-trials | 4185 | 2155 |
| pool-8ball | 2015 | 1035 |
| orrery | 647 | 386 |
| ember | 249 | 113 |

The pattern is the same every time: a handful of functions account for most
of the frame, and they are usually drawing something that **does not change**
between frames. That is a sprite waiting to be made.

**Still slow after that?** The remaining costs are usually:

- a gradient or filter created inside the draw loop (create it once, outside);
- a path rebuilt every frame for something that never moves (build it once);
- the game doing real *computation* per frame, which no resolution change
  will fix — find what the computation is.

---

## 8. Where the shell's own log lines come from

| tag | what it is |
|---|---|
| `GameJS` | the games' `console.log` — their own words |
| `CW:` | canvas watcher: a backing store was lost or restored |
| `AudioTrack:` | the audio tracker's view of the game's AudioContexts |
| `QUAL:` | the resolution governor's decisions |
| `DPR:` | the resolution cap being applied |
| `AdPolicy` | the ad clock and the interstitial rules |
| `GameTransition` | page load timings |

**These exist because the cause of a bug was once guessed at and was wrong.**
The DPR cap was assumed to be working for weeks; the log showed it losing a
race with the game's own startup, and the cap had never once been running.
Read the log before you conclude anything about a runtime problem.
