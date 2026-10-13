'use strict';
const fs = require('fs');
const GAMES = [
  { id: 'knot-away', src: 'sources/Playable Games/knot Away.html', art: ['knot_away_tile_img.jpeg', 'tile_knot_away.jpg'] },
  { id: 'carroms', src: 'sources/Playable Games/carromsNew.html', art: ['carrom_tile_img.png', 'tile_carroms.png'] },
  { id: 'truth-or-dare', src: 'sources/Playable Games/truthOrDare.html', art: ['truth_or_dare_tile_img.png', 'tile_truth_or_dare.png'] },
];

for (const g of GAMES) {
  const s = fs.readFileSync(g.src, 'utf8');
  const lines = s.split(/\r?\n/);
  console.log('========== ' + g.id + ' ==========');
  console.log('  bytes:', s.length, '| script blocks:', (s.match(/<script/g) || []).length,
    '| has manifest:', /STUDIO_GAME_MANIFEST/.test(s),
    '| has Studio shim:', /window\.Studio\s*=|var Studio=/.test(s),
    '| has Game obj:', /window\.Game\s*=/.test(s));
  console.log('  art:', fs.existsSync('sources/Shell Art/' + g.art[0]) ? g.art[0] + ' -> ' + g.art[1] : 'MISSING ART');

  // audio / settings
  const flags = {
    AudioContext: /AudioContext/.test(s),
    'settings var': /(var|let|const)\s+settings\s*=/.test(s),
    'settings.volume': /settings\.volume/.test(s),
    localStorage: /localStorage/.test(s),
    'showInterstitial': /showInterstitial/.test(s),
    'showRewardedAd': /showRewardedAd/.test(s),
    'showBanner': /showBanner/.test(s),
    'tryNativeAd': /tryNativeAd/.test(s),
    canvas: /<canvas/.test(s),
  };
  Object.entries(flags).forEach(([k, v]) => { if (v) console.log('    has ' + k); });

  // screen / state names worth knowing
  const states = new Set();
  lines.forEach(l => {
    const m = /(?:screen|state|overlay|phase)\s*=\s*'([a-zA-Z]+)'/g;
    let x; while ((x = m.exec(l)) !== null) states.add(x[1]);
  });
  console.log('  states:', [...states].slice(0, 18).join(' '));

  // buttons
  const btns = [];
  lines.forEach(l => {
    const m = /(?:id|onclick)\s*=?\s*["']([A-Za-z0-9_-]{3,24})["']/g;
    let x; while ((x = m.exec(l)) !== null) { if (/btn|btn|play|home|menu|again|resume|restart|quit|exit|close|start|next|back/i.test(x[1])) btns.push(x[1]); }
  });
  console.log('  buttons:', [...new Set(btns)].slice(0, 22).join(' '));
  console.log('');
}