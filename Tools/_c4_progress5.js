'use strict';
const fs = require('fs');
const f = 'PROGRESS.md';
let s = fs.readFileSync(f, 'utf8');
if (/director pass 4/.test(s)) { console.log('already recorded'); process.exit(0); }

const ENTRY = [
  '## Connect Four — director pass 4: the lag, at any cost — 2026-10-12',
  '### Measured, full board, before -> after',
  '```',
  '                        before    after',
  'Janky frames            458 (71%)  53 (1.93%)',
  '50th percentile         14ms      11ms',
  '90th percentile         20ms      12ms',
  '99th percentile         25ms      18ms',
  'Slow issue draw cmds    458       53',
  'High input latency      12998     5103',
  '```',
  '- **The settled marbles were all being rotated.** `drawMarble()` rotates only when `spin` is truthy, and',
  '  settled marbles were passed their stale `m.spin` (`spinV` is 0 for them, but `spin` keeps whatever angle',
  '  the last bounce left). So every marble on the board did a save/translate/rotate/restore plus a',
  '  non-axis-aligned blit - 42 of them once it filled. **That is why it got worse with every turn and',
  '  fall, and it is the single biggest thing here.** They now draw unrotated.',
  '- **Audio node churn.** One drop built ~21 nodes: a four-oscillator clink per bounce plus a seven-node',
  '  first contact, all feeding one ConvolverNode. Bounces now use a two-tone clink with no noise burst and',
  '  no reverb send.',
  '- **The back button was being restyled 2.5x a second.** The shell poll assigned `style.display`',
  '  unconditionally, so during play it rewrote `display:\'none\'` onto a button already set to none - a',
  '  forced style invalidation in the WebView, forever. It only writes on change now. This was most of the',
  '  input-latency figure.',
  '- **The bot felt slow because it was.** ~2.0-2.3s of deliberate delay per move: a 0.9s watchdog before',
  '  `scheduleAI()` was even called, a 0.55-0.9s "thinking" pause, then 480ms before release. Now 0.3s /',
  '  0.26-0.40s / 240ms.',
  '- **Drop sound** lowered again per the director: `.032` sweep / `.028` body tone, band 760->1900Hz.',
  '',
  '',
].join('\n');

s = s.replace('## Connect Four — director pass 3: performance, and LOCKED — 2026-10-12\n',
  ENTRY + '## Connect Four — director pass 3: performance, and LOCKED — 2026-10-12\n');
fs.writeFileSync(f, s);
console.log('OK   PROGRESS.md updated');