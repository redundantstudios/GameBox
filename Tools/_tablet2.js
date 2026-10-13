'use strict';
const fs = require('fs');

/* Full-width headers are normal on a tablet. What reads as broken is content
   stretched edge to edge at phone text size - and above all a two-column grid
   of giant tiles. ResponsiveGrid fixes the grid; this caps and centres the
   scrolling column so the rest keeps comfortable proportions.

   Only applied to scroll containers and RecyclerViews, which support
   android:maxWidth directly. Deliberately not restructuring the
   ConstraintLayout roots. */

const JOBS = [
  ['activity_main.xml', 'homeScroll'],
  ['activity_mode.xml', 'gamesRecyclerView'],
  ['activity_settings.xml', 'settingsScroll'],
];

for (const [file, id] of JOBS) {
  const P = 'app/src/main/res/layout/' + file;
  let s = fs.readFileSync(P, 'utf8');
  if (s.includes('content_max_width')) { console.log('SKIP  ' + file + ' (already capped)'); continue; }

  const anchor = 'android:id="@+id/' + id + '"';
  const i = s.indexOf(anchor);
  if (i < 0) { console.log('MISS  ' + file + ' -> ' + id); continue; }

  // insert right after the android:layout_width line that follows the id
  const widthAt = s.indexOf('android:layout_width', i);
  const lineEnd = s.indexOf('\n', widthAt);
  if (widthAt < 0 || lineEnd < 0) { console.log('MISS  width line in ' + file); continue; }

  const insert = '\n        android:maxWidth="@dimen/content_max_width"' +
    '\n        android:layout_gravity="center_horizontal"';
  s = s.slice(0, lineEnd) + insert + s.slice(lineEnd);
  fs.writeFileSync(P, s);
  console.log('OK    ' + file + ' -> ' + id + ' capped and centred');
}

console.log('\nverify:');
for (const [file, id] of JOBS) {
  const s = fs.readFileSync('app/src/main/res/layout/' + file, 'utf8');
  console.log('  ' + file.padEnd(24) + (s.includes('content_max_width') ? 'ok' : 'MISSING'));
}