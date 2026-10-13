'use strict';
const fs = require('fs');
const P = 'app/src/main/java/com/redundantstudios/arcade/MainActivity.kt';
const NL = fs.readFileSync(P, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const L = fs.readFileSync(P, 'utf8').split(NL);

const has = t => L.some(l => (l || '').includes(t));

/* import: the field at 34 already references the type, so the import must go in. */
if (!has('import com.redundantstudios.arcade.updates.UpdateCoordinator')) {
  const i = L.findIndex(l => /^import com\.redundantstudios\.arcade\.util\./.test(l || ''));
  if (i < 0) { console.log('MISS import anchor'); process.exit(1); }
  L.splice(i, 0, 'import com.redundantstudios.arcade.updates.UpdateCoordinator');
  console.log('OK   import added');
} else console.log('SKIP import already there');

/* onHomeReady after onCreate's bindHome() */
if (!has('updateCoordinator?.onHomeReady()')) {
  const i = L.findIndex((l, k) => l.trim() === 'bindHome()' && L[k + 1] === '    }');
  if (i < 0) { console.log('MISS bindHome anchor'); process.exit(1); }
  L.splice(i + 1, 0,
    '',
    '        // Update conversation, once the home screen exists: notice a',
    '        // completed upgrade, then offer a new one. Doing it here rather than',
    '        // in onResume means it cannot interrupt a game the player just left.',
    '        updateCoordinator?.onHomeReady()');
  console.log('OK   onHomeReady wired');
} else console.log('SKIP onHomeReady already there');

/* onResume hook after the permission call */
if (!has('updateCoordinator?.onResume()')) {
  const i = L.findIndex(l => l.trim() === 'maybeAskNotificationPermission()');
  if (i < 0) { console.log('MISS permission anchor'); process.exit(1); }
  L.splice(i + 1, 0,
    '',
    '        // Install any flexible update that finished downloading, and resume a',
    '        // flow that was interrupted. The Play docs require this on every',
    '        // entry point, not just at launch.',
    '        updateCoordinator?.onResume()');
  console.log('OK   onResume wired');
} else console.log('SKIP onResume already there');

fs.writeFileSync(P, L.join(NL));
const out = fs.readFileSync(P, 'utf8');
console.log('\nverify:');
const n = re => (out.match(re) || []).length;
console.log('  onHomeReady :', n(/updateCoordinator\?\.onHomeReady\(\)/g));
console.log('  onResume    :', n(/updateCoordinator\?\.onResume\(\)/g));
console.log('  constructed :', n(/updateCoordinator = UpdateCoordinator\(this\)/g));
console.log('  field       :', n(/private var updateCoordinator/g));
console.log('  import      :', n(/import com\.redundantstudios\.arcade\.updates\.UpdateCoordinator/g));