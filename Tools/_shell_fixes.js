'use strict';
const fs = require('fs');

/* ---- 1. Truth or Dare was not being treated as a party game ----
   The set holds "truthordare" but the integrated id is "truth-or-dare", so the
   entry never matched: the game fell into the N-player grid and carried an
   "NP" badge, which is exactly the "it is a party game" complaint. */
{
  const f = 'app/src/main/java/com/redundantstudios/arcade/ui/ModeActivity.kt';
  let s = fs.readFileSync(f, 'utf8');
  const from = 'val PARTY_GAME_IDS = setOf("truthordare", "last-balloon")';
  const to = 'val PARTY_GAME_IDS = setOf("truth-or-dare", "last-balloon")';
  if (!s.includes(from)) { console.log('MISS party ids'); }
  else { s = s.replace(from, to); fs.writeFileSync(f, s); console.log('OK   party id fixed'); }
}

/* ---- 2. Cap the N-player grid at 5 ----
   The grid is built from every game's own min..max, so a party-sized game kept
   conjuring 6, 7 and 8 PLAYER tiles for counts nothing offers. Five is the cap. */
{
  const f = 'app/src/main/java/com/redundantstudios/arcade/MainActivity.kt';
  let s = fs.readFileSync(f, 'utf8');
  const from =
    '        val bucketed = games.filter { it.id !in ModeActivity.PARTY_GAME_IDS }\n' +
    '        val counts = bucketed.flatMap { (it.minPlayers..it.maxPlayers).toList() }\n' +
    '        val supportedCounts = counts.distinct().sorted()';
  const to =
    '        val bucketed = games.filter { it.id !in ModeActivity.PARTY_GAME_IDS }\n' +
    '        /* The grid stops at five. A game declaring 6..10 players kept\n' +
    '         * conjuring 6, 7, 8, 9 and 10 PLAYER tiles - categories for counts\n' +
    '         * nothing in the catalogue offers, and the source of the stray "6\n' +
    '         * PLAYER" card. Party-sized games belong under PARTY GAMES. */\n' +
    '        val counts = bucketed.flatMap {\n' +
    '            val lo = it.minPlayers.coerceAtLeast(1)\n' +
    '            val hi = minOf(it.maxPlayers, MAX_N_PLAYER_TILE)\n' +
    '            if (lo > hi) emptyList() else (lo..hi).toList()\n' +
    '        }\n' +
    '        val supportedCounts = counts.distinct().sorted()';
  if (!s.includes(from)) { console.log('MISS grid build'); }
  else {
    s = s.replace(from, to);
    if (!/MAX_N_PLAYER_TILE/.test(s.split('const')[0])) {
      s = s.replace('class MainActivity : ThemedActivity() {',
        'class MainActivity : ThemedActivity() {\n\n' +
        '    /** The N-player grid stops here. See deriveModes. */\n' +
        '    private val MAX_N_PLAYER_TILE = 5');
    }
    fs.writeFileSync(f, s);
    console.log('OK   grid capped at 5');
  }
}

/* ---- 3. Carroms is a four-player game ---- */
{
  const f = 'app/src/main/assets/games/carroms/index.html';
  let s = fs.readFileSync(f, 'utf8');
  if (/maxPlayers: 6/.test(s)) {
    s = s.replace('maxPlayers: 6', 'maxPlayers: 4');
    fs.writeFileSync(f, s);
    console.log('OK   carroms maxPlayers 4');
  } else console.log('     carroms: already 4');
}

/* ---- 4. Truth or Dare is a ten-player party game ---- */
{
  const f = 'app/src/main/assets/games/truth-or-dare/index.html';
  let s = fs.readFileSync(f, 'utf8');
  if (/maxPlayers: 8/.test(s)) {
    s = s.replace('maxPlayers: 8', 'maxPlayers: 10');
    fs.writeFileSync(f, s);
    console.log('OK   truth-or-dare maxPlayers 10');
  } else console.log('     truth-or-dare: already 10');
}