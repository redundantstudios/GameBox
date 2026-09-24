STUDIO STYLE — FLAT POP v1.0 (FINAL)
Identity sentence
"Pure, snappy, zero-clutter. The shell is a clean stage; the games are the show."

THE LAYER LAW (most important rule)
Shell = flat UI. Games = their own world.The shell NEVER competes with game art. A wooden pen-fight tile and apastel Planet-Merge tile sit side by side in the same grid, both correct.Games inside the WebView keep 100% of their own identity.

Shell design tokens
Background: #FAFAFA
Surface (bars): #1C1E24 (dark ink) or #FFFFFF with shadow 0 2px 8px rgba(0,0,0,.08)
Ink (text): #1C1E24
Muted text: #7A7F88
Tile colors: each game owns ONE solid color (pen fight #2F63CF, planet merge #E8912F, ...) — stored in the game manifest
Success/accent: #3FD06A · Danger: #E8584A · Gold: #FFD75E
Radius: tiles 14px, buttons 999px (pill), cards 12px
Shadows: flat design = almost none; only elevation on bars/sheets
Motion (the whole personality lives here)
Tile press: scale 1 → 0.93 → 1, 200ms, cubic-bezier(.3,1.5,.5,1)
Page/nav change: 250ms slide or fade, ONE easing everywhere
Numbers: pop-scale 1.3 on change, 200ms
Streak/celebrate: every 5th action gets a two-note rise + pulse
NO bounce, NO wobble, NO particles in the shell. Snap only.
Shell sound identity (synthesized, tiny)
UI tick: 700–900Hz sine, 30ms, vol .09
Select/confirm: 520→1400Hz sweep, 220ms, vol .2
Milestone: 392Hz + 587Hz triangle two-note, vol .2
No shell music. No ambient. Games handle their own audio inside.
Shell typography
Space Grotesk 500/700 only. Titles 17–19px, labels 9px capsletter-spacing 1.5px, big numbers 19–24px.
(Embed woff2, <25KB — no font CDNs.)
Game-facing rules (what games inherit)
Every game keeps its own art/sound world (per-game manifest coloris used ONLY for its tile in the shell grid).
In-game UI may echo Flat Pop restraint: big readable numbers,snap motion — but the game world obeys the game's own style bible.