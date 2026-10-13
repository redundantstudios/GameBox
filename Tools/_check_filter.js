'use strict';
/* Run the REAL filter + comparator logic against the REAL catalogue manifests,
   so "is 1P showing on the 2 PLAYER page" is answered from the data rather than
   from the code reading correctly. */
const fs = require('fs');
const path = require('path');

const dir = 'app/src/main/assets/games';
const PARTY = new Set(['mimic', 'truth-or-dare']);

function parse(id) {
  const s = fs.readFileSync(path.join(dir, id, 'index.html'), 'utf8');
  const head = s.slice(0, s.indexOf('-->') >= 0 ? s.indexOf('-->') : 4000);
  const g = (k) => {
    const m = head.match(new RegExp('^\\s*' + k + ':\\s*(.+)$', 'm'));
    return m ? m[1].trim() : null;
  };
  return {
    id,
    title: (g('title') || id),
    min: parseInt(g('minPlayers') || '1', 10),
    max: parseInt(g('maxPlayers') || '1', 10),
  };
}

const NEW = new Set(['colour-rush', 'ember', 'orrery', 'sheepdog-trials', 'pool-8ball',
  'midnight-overdrive', 'magnet-pull', 'kiro', 'root-io', 'carroms']);

// mirror of the Kotlin
const fitsExactly = (g, p) => {
  if (PARTY.has(g.id)) return false;
  if (p === 1) return g.min === 1;          // canPlayWithBots is true for these
  return g.min <= p && g.max >= p;
};
const fitsNearby = (g, p) => {
  if (PARTY.has(g.id)) return false;
  if (!NEW.has(g.id)) return false;          // NEW cohort only
  for (let n = g.min; n <= g.max; n++) if (Math.abs(n - p) === 1) return true;
  return false;
};

const games = fs.readdirSync(dir).filter(d => fs.statSync(path.join(dir, d)).isDirectory()).map(parse);

console.log('catalogue: ' + games.length + ' games\n');
let problems = [];

for (const p of [1, 2, 3, 4, 5]) {
  const shown = games.filter(g => fitsExactly(g, p) || fitsNearby(g, p));
  const wrong = shown.filter(g => !fitsExactly(g, p));
  console.log('--- ' + p + ' PLAYER page: ' + shown.length + ' games ---');
  console.log('  exact    : ' + shown.filter(g => fitsExactly(g, p)).map(g => g.title).join(', '));
  console.log('  near-miss: ' + (wrong.length ? wrong.map(g => g.title + ' (NEW)').join(', ') : 'none'));
  if (wrong.some(g => !NEW.has(g.id))) {
    problems.push(p + 'P page shows a non-NEW near miss: ' + wrong.filter(g => !NEW.has(g.id)).map(g => g.title));
  }
  if (wrong.length) console.log('  ^ these are all NEW cohort, which is the rule');
  console.log('');
}

console.log(problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : 'RULE HOLDS: only NEW games ever appear off their exact seat count');