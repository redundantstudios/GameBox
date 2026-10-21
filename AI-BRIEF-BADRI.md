# AI BRIEF — Badri

**Copy everything below this line into your AI's chat as the first message.**

---

You are working on **Redundant Arcade**, an Android shell that loads 25
single-file HTML games in a WebView. I am one of three developers on it. I am
the shell owner; two other developers each own a set of games.

## First, read these three files in the repo

1. **`AI-CONTEXT.md`** — the shared briefing. The map, the rules, the
   commands, and the mistakes that have already cost this project time. Read
   it fully before you touch anything.
2. **`AGENT.md`** — the working protocol. The standing rule is
   feedback → change → build → install → test, and it applies to every turn.
3. **`CONTRACT.md`** — the rules the shell and the games agree to.

## Your scope

**The games you own are the ones the human names in their message to you.**
They will list them. That list is the truth.

The ownership table in `AI-CONTEXT.md` section 4 is a *proposal* the three
developers have not agreed yet — treat it as a draft, and let the human's
message override it.

**Everything inside your own game folders is yours.** A game lives at
`app/src/main/assets/games/<game>/index.html` and is one self-contained file.

**These are NOT yours — do not edit them:**

- `app/src/main/java/com/redundantstudios/arcade/**` — the shell
- `app/src/main/assets/shell/*.js` — the four page scripts every game loads
- `app/src/main/assets/games/<any game that is not yours>/**`

If a fix you are making needs a change in the shell, **stop and tell me**.
Do not add it yourself. The shell is shared and the other developer is
working in it at the same time.

## The rules that matter most

**Never change the art.** Not to simplify it, not to make a fix easier, not
to "clean it up". If a fix needs the art changed, say so and let the human
decide — this has already happened once and the change was sent back.

**When something is slow, batch the drawing, never simplify it.** The
original has to come out pixel-identical. One path for many shapes; a
pre-rendered sprite for something that does not change between frames; the
same path stroked twice in two colours.

**The original of each game is in `sources/Playable Games/`.** That is the
reference for how it is *supposed* to look and behave. The shipped file in
`app/src/main/assets/games/` has the studio's wiring added on top of it. When
a human says "it doesn't look right", check the original — that is where the
answer is.

**Do not weaken the shell's resolution cap** (`app/src/main/assets/shell/dpr.js`)
to make your game faster. It is what keeps all 25 games smooth on a weak
phone. If your game is slow, count its own draw calls first.

## How to work

1. **Read before you edit.** Open the game file and understand the part you
   are changing.
2. **Make the change.**
3. **Run the syntax gate.** It is the single most important step, because
   these files have mixed line endings and a bad edit can quietly break half
   the file:

   ```bash
   node -e "const fs=require('fs');const s=fs.readFileSync('app/src/main/assets/games/GAME/index.html','utf8');const m=[...s.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)];m.forEach((x,i)=>{try{new Function(x[1])}catch(e){console.log('SYNTAX FAIL script#'+i+': '+e.message);process.exit(1)}});console.log('ALL SCRIPTS PARSE OK')"
   ```

4. **Read the file back and check your edit landed.** The HTML files mix CRLF
   and LF, and a multi-line replace will silently miss a CRLF region.
5. **Build and install**: `DEPLOY.bat`. Never end a turn with an unbuilt
   change.
6. **Stop.** The human plays it and tells you what they see. Do not launch
   the app and drive it yourself — `AGENT.md` explains why.

**Never find the end of a function by counting braces.** These files are full
of JavaScript, which is full of braces. It will cut the file in the wrong
place.

## When a bug is reported to you

- Take the report as authoritative. Do not ask for proof, do not re-litigate
  it, do not defer it.
- If it is a runtime problem, the game's own console output comes out under
  the `GameJS` log tag. Ask the human to reproduce it and read the log they
  generate — do not reproduce it on their phone yourself.
- If it is a performance problem, count the draw calls per frame before
  changing anything. `AI-CONTEXT.md` section 7 says how.

## Git

- Work on a branch named for the task: `badri/short-description`.
- `git pull --rebase` before you push.
- Never commit straight to `main`, and never merge locally — push the branch
  and open a PR.
- Run the syntax gate before every push.

**End of brief.**
