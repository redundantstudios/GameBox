#!/usr/bin/env node
/*
 * _validate_chess.js - offline correctness harness for the shell chess game.
 *
 * It does NOT re-implement anything: it lifts the Engine straight out of the
 * shipped app/src/main/assets/games/chess/index.html (the director's build),
 * then:
 *   1. runs the standard perft suite (castling, en passant, promotions, pins);
 *   2. replays the solution of every puzzle in puzzles.js through Engine.make,
 *      which throws on any illegal move - so all 10,500 rows are proven
 *      playable end-to-end before the pack is trusted at boot.
 *
 * Usage: node _validate_chess.js
 */
const fs = require('fs');
const path = require('path');

const HTML = path.join('app', 'src', 'main', 'assets', 'games', 'chess', 'index.html');
const PUZZLES = path.join('app', 'src', 'main', 'assets', 'games', 'chess', 'puzzles.js');

/* ---------- 1. lift the engine out of the shipped game ---------- */
const html = fs.readFileSync(HTML, 'utf8');
const start = html.indexOf('const P=1,N=2');
const end = html.indexOf('/* \u2550\u2550\u2550 BOT');
if (start < 0 || end < 0 || end <= start) {
  console.error('FATAL: could not locate the Engine block in ' + HTML);
  process.exit(2);
}
const engine = new Function(html.slice(start, end) + '\nreturn Engine;')();

/* ---------- 2. perft suite ---------- */
// Known-good node counts (Chess Programming Wiki "Perft Results").
const PERFT = [
  ['startpos', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [20, 400, 8902, 197281]],
  ['kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['ep+pins', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['promotions', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['promo+pin', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
  ['middlegame', 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', [46, 2079, 89890]],
];

console.log('=== 1. perft (move-generation correctness) ===');
let perftFail = 0;
for (const [label, fen, expect] of PERFT) {
  const cells = [];
  for (let d = 1; d <= expect.length; d++) {
    engine.loadFEN(fen);
    const got = engine.perft(d);
    const ok = got === expect[d - 1];
    if (!ok) perftFail++;
    cells.push(`d${d}=${got}${ok ? '' : ` (want ${expect[d - 1]})`}`);
  }
  console.log(`  ${label.padEnd(11)} ${cells.join('  ')}`);
}
console.log(perftFail === 0 ? '  ALL PERFT OK' : `  ${perftFail} PERFT MISMATCHES`);

/* ---------- 3. replay every puzzle solution ---------- */
console.log('\n=== 2. puzzles.js solution replay (Engine.make throws on any illegal move) ===');
if (!fs.existsSync(PUZZLES)) {
  console.error('FATAL: ' + PUZZLES + ' missing - run: python _gen_puzzles.py');
  process.exit(2);
}
global.window = {};
eval(fs.readFileSync(PUZZLES, 'utf8'));
const book = global.window.CHESS_PUZZLES || {};

const PROMO = { q: 5, r: 4, b: 3, n: 2 };
const uciToMove = (u) => ({
  from: engine.sqFromName(u.slice(0, 2)),
  to: engine.sqFromName(u.slice(2, 4)),
  promo: u.length >= 5 ? (PROMO[u[4].toLowerCase()] || 0) : 0,
});

let puzzles = 0, moves = 0, bad = 0, overEarly = 0;
const failures = [];

for (const cat of Object.keys(book)) {
  for (const puz of book[cat]) {
    puzzles++;
    const [id, fen, solution] = puz;
    try {
      engine.loadFEN(fen);
    } catch (e) {
      bad++;
      if (failures.length < 12) failures.push(`${id} [${cat}] bad FEN: ${e.message}`);
      continue;
    }
    const seq = String(solution).trim().split(/\s+/);
    try {
      for (const wanted of seq) {
        moves++;
        const res = engine.make(uciToMove(wanted)); // throws if illegal
        if (res.over && wanted !== seq[seq.length - 1]) overEarly++;
      }
    } catch (e) {
      bad++;
      if (failures.length < 12) failures.push(`${id} [${cat}] "${wanted}" -> ${e.message}`);
    }
  }
}

console.log(`  puzzles        : ${puzzles}`);
console.log(`  solution plies : ${moves}`);
console.log(`  illegal/failed : ${bad}`);
if (overEarly) console.log(`  ended mid-line : ${overEarly}`);
if (failures.length) {
  console.log('  first failures :');
  for (const f of failures) console.log('    - ' + f);
}

/* ---------- 4. verdict ---------- */
const ok = perftFail === 0 && bad === 0 && overEarly === 0;
console.log('\n=== VERDICT: ' + (ok ? 'PASS' : 'FAIL') + ' ===');
process.exit(ok ? 0 : 1);
