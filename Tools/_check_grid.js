'use strict';
/* Mirror of ResponsiveGrid.spanCount, run across real screen widths so the
   column counts are checked rather than assumed. */
const MIN = 2, MAX = 6, TILE = 168, GAP = 14;

function spanCount(widthDp) {
  if (widthDp <= 0) return MIN;
  const n = Math.floor((widthDp + GAP) / (TILE + GAP));
  return Math.max(MIN, Math.min(MAX, n));
}

// Real devices: density -> dp width, portrait.
const DEVICES = [
  { name: 'small phone (5.0", 320dpi)', px: 720, dpi: 320 },
  { name: 'phone (6.1", 440dpi)', px: 1080, dpi: 440 },
  { name: 'large phone (6.9", 420dpi)', px: 1284, dpi: 420 },
  { name: 'phone landscape (6.1")', px: 2400, dpi: 440 },
  { name: 'small tablet (8", 320dpi)', px: 1280, dpi: 320 },
  { name: 'tablet 10.2" portrait', px: 1668, dpi: 264 },
  { name: 'tablet 10.2" landscape', px: 2388, dpi: 264 },
  { name: 'large tablet 12.9"', px: 2048, dpi: 264 },
  { name: 'foldable unfolded (7.6")', px: 2208, dpi: 373 },
];

console.log('device                        width(dp)   cols');
console.log('------------------------------------------------');
let bad = 0;
for (const d of DEVICES) {
  const dp = Math.round(d.px / (d.dpi / 160));
  const cols = spanCount(dp);
  const flag = (dp >= 600 && cols < 3) || (dp < 600 && cols !== 2) ? '  <-- check' : '';
  if (flag) bad++;
  console.log(d.name.padEnd(30) + String(dp).padStart(7) + String(cols).padStart(8) + flag);
}
console.log('\ncontent column cap (values-sw600dp): 640dp');

// 640dp cap vs column counts - does the cap fight the grid?
for (const dp of [600, 700, 800, 1280]) {
  const capped = Math.min(dp, dp >= 600 ? 840 : dp);
  console.log('  screen ' + dp + 'dp -> content column ' + capped + 'dp -> ' + spanCount(capped) + ' cols');
}

console.log('\nissues: ' + bad);
