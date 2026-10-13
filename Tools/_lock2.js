'use strict';
const fs = require('fs');
const f = 'PROGRESS.md';
let s = fs.readFileSync(f, 'utf8');

if (!/Carroms — director pass 3/.test(s)) {
  s = s.replace('## Carroms — director pass 2: 5 issues, LOCKED — 2026-10-12\n',
    '## Carroms — director pass 3: 2 issues, re-locked — 2026-10-12\n' +
    [
      '- **BGM was still silent until something was tapped.** `audioEnsure()` was only ever called from the',
      '  `pointerdown` listener; the previous "build it at boot" call had been placed in the SETUP flow, so it',
      '  never ran on the start page. It is now called at the end of boot, after the theme and switches are',
      '  applied so the first frame already has the right volume. Verified: `AudioTrack: installed` at launch,',
      '  before any touch.',
      '- **After the theme ad the player landed on the bare start page with no idea anything had changed.**',
      '  `closeAdConfirm()` hid the whole overlay BEFORE the ad, so finishing it dropped the player out of the',
      '  flow entirely. Now the sheet is dismissed but the overlay stays alive, and when the ad reports back the',
      '  grant runs, the theme page returns with the grid rebuilt, and a toast names the theme that was applied.',
      '  (The follow-up listener I first added could not have worked: `_cfGive` was already null by then, so',
      '  the toast branch was unreachable. Rewritten as a single `onclick` that wraps the grant.)',
      '- **Theme BACK -> Settings -> Home** already worked — `#p-theme` carries `data-to="p-settings"` and the',
      '  generic `.backbtn` handler routes it. The extra listener added in this pass was a duplicate that would',
      '  have fired `Panels.show(\'p-settings\')` twice per tap; removed.',
      '- **Chinese Checkers: LOCKED.** No further work without a numbered pass.',
      '',
      '',
    ].join('\n') +
    '## Carroms — director pass 2: 5 issues, LOCKED — 2026-10-12\n');
  console.log('OK   PROGRESS.md — Carroms locked, Chinese Checkers locked');
} else console.log('already recorded');