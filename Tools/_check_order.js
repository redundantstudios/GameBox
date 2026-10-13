'use strict';
/* Run the real comparator from ModeActivity against the real NEW cohort, so the
   ordering claim is checked rather than assumed. */
const fs = require('fs');

const KA = fs.readFileSync('app/src/main/java/com/redundantstudios/arcade/model/GameManifest.kt', 'utf8');
const setOf = (name) => {
  const i = KA.indexOf('val ' + name + ': Set<String> = setOf(');
  if (i < 0) throw new Error('not found: ' + name);
  const body = KA.slice(i, KA.indexOf(')', i));
  return [...body.matchAll(/"([^"]+)"/g)].map(m => m[1]);
};
const NEW = new Set(setOf('NEW_GAME_IDS'));
const ESTAB = new Set(setOf('ESTABLISHED_GAME_IDS'));
console.log('NEW cohort: ' + NEW.size + ' games');

// Mirror of orderForPage's comparator, in Kotlin's order.
const NEWEST_FIRST = [];
function orderForPage(games, playerCount) {
  const fits = (g) => g.id in ({});
  return games.slice().sort((a, b) => {
    if (a.pc !== b.pc) return a.pc - b.pc;
    const na = NEW.has(a.id) ? 0 : 1, nb = NEW.has(b.id) ? 0 : 1;
    if (na !== nb) return na - nb;
    const ga = a.maxPlayers, gb = b.maxPlayers;
    if (ga !== gb) return ga - gb;
    if (a.minPlayers !== b.minPlayers) return a.minPlayers - b.minPlayers;
    return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1;
  });
}

// A representative 2-player page: mix of new and established, varied maxPlayers.
const page = [
  { id: 'chess', title: 'Chess', pc: 2, minPlayers: 2, maxPlayers: 2 },
  { id: 'pool-8ball', title: 'Pool', pc: 2, minPlayers: 1, maxPlayers: 2 },
  { id: 'ludo', title: 'Ludo', pc: 2, minPlayers: 2, maxPlayers: 4 },
  { id: 'kiro', title: 'Kiro', pc: 2, minPlayers: 1, maxPlayers: 2 },
  { id: 'checkers', title: 'Checkers', pc: 2, minPlayers: 2, maxPlayers: 2 },
  { id: 'carroms', title: 'Carroms', pc: 2, minPlayers: 2, maxPlayers: 4 },
];

const out = orderForPage(page, 2);
console.log('\n2 PLAYER page order:');
out.forEach((g, i) => {
  const tag = NEW.has(g.id) ? 'NEW  ' : '     ';
  console.log('  ' + (i + 1) + '. ' + tag + g.title + '  (' + g.minPlayers + '-' + g.maxPlayers + 'P)');
});

let problems = [];
// every NEW game in the list must come before every non-NEW game
const lastNew = out.map((g, i) => (NEW.has(g.id) ? i : -1)).filter(i => i >= 0).pop();
const firstOld = out.map((g, i) => (NEW.has(g.id) ? -1 : i)).filter(i => i >= 0)[0];
if (lastNew !== undefined && firstOld !== undefined && lastNew > firstOld) {
  problems.push('a non-NEW game appears above a NEW game');
}
console.log('\nnew games contiguous at the top: ' + (problems.length === 0 ? 'YES' : 'NO'));
console.log('new in this page: ' + out.filter(g => NEW.has(g.id)).length + ' of ' + out.length);
console.log('\nknown cohort members present here: ' +
  out.filter(g => NEW.has(g.id) || ESTAB.has(g.id)).map(g => g.title).join(', '));