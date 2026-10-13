'use strict';
const fs = require('fs');
const P = 'app/src/main/java/com/redundantstudios/arcade/MainActivity.kt';
const NL = fs.readFileSync(P, 'utf8').includes('\r\n') ? '\r\n' : '\n';
let L = fs.readFileSync(P, 'utf8').split(NL);

const already = t => L.some(l => (l || '').includes(t));
const insertAfter = (pred, block, label) => {
  if (already(block[0].trim().slice(0, 30))) { console.log('SKIP ' + label); return; }
  const i = L.findIndex(pred);
  if (i < 0) { console.log('MISS ' + label); process.exit(1); }
  L.splice(i + 1, 0, ...block);
  console.log('OK   ' + label);
};

insertAfter(
  (l, k) => l.trim() === 'bindHome()' && L[k + 1] === '    }',
  [
    '',
    '        // Update conversation, once the home screen exists: notice a',
    '        // completed upgrade, then offer a new one. Doing it here rather than',
    '        // in onResume means it cannot interrupt a game the player just left.',
    '        updateCoordinator?.onHomeReady()',
  ],
  'onHomeReady() after onCreate bindHome()'
);

insertAfter(
  (l) => l.trim() === 'maybeAskNotificationPermission()',
  [
    '',
    '        // Install any flexible update that finished downloading, and resume a',
    '        // flow that was interrupted. The Play docs require this on every',
    '        // entry point, not just at launch.',
    '        updateCoordinator?.onResume()',
  ],
  'onResume() hook'
);

insertAfter(
  (l) => l.indexOf('NotificationChannels.ensure(this)') >= 0,
  [
    '        // Registers the Play update ActivityResult launcher, so it has to be',
    '        // built during onCreate rather than lazily.',
    '        updateCoordinator = UpdateCoordinator(this)',
  ],
  'coordinator constructed in onCreate'
);

insertAfter(
  (l) => /private lateinit var allGames/.test(l || ''),
  [
    '    private var updateCoordinator: UpdateCoordinator? = null',
    '',
  ],
  'field declared'
);

insertAfter(
  (l) => /^import com\.redundantstudios\.arcade\.util\./.test(l || ''),
  ['import com.redundantstudios.arcade.updates.UpdateCoordinator'],
  'import added'
);

fs.writeFileSync(P, L.join(NL));
console.log('\nverify:');
const out = fs.readFileSync(P, 'utf8');
console.log('  onHomeReady x1 :', (out.match(/updateCoordinator\?\.onHomeReady\(\)/g) || []).length === 1);
console.log('  onResume x1    :', (out.match(/updateCoordinator\?\.onResume\(\)/g) || []).length === 1);
console.log('  constructed x1 :', (out.match(/updateCoordinator = UpdateCoordinator\(this\)/g) || []).length === 1);
console.log('  field x1       :', (out.match(/private var updateCoordinator/g) || []).length === 1);
console.log('  import x1      :', (out.match(/import com\.redundantstudios\.arcade\.updates\.UpdateCoordinator/g) || []).length === 1);