'use strict';
const fs = require('fs');
const P = 'app/build.gradle';
let s = fs.readFileSync(P, 'utf8');

/* v1 shipped to closed testing, v2 added the in-app update system, v3 is what a
   v2 install gets offered. The completion popup compares against
   lastSeenVersion, which is null on a fresh install and is stamped on the first
   launch of any version, so only a genuine upgrade is treated as one. */
const before = s;
s = s.replace(/versionCode 2/, 'versionCode 3');
s = s.replace(/versionName "1\.1\.0"/, 'versionName "1.2.0"');

if (s === before) { console.log('MISS: version lines not found'); process.exit(1); }
fs.writeFileSync(P, s);

const out = fs.readFileSync(P, 'utf8');
console.log('OK   versionCode 2 -> 3');
console.log('OK   versionName 1.1.0 -> 1.2.0');
console.log('\nverify:');
console.log('  versionCode   :', /versionCode 3/.test(out));
console.log('  versionName   :', /versionName "1\.2\.0"/.test(out));
console.log('  no stale code2:', !/versionCode 2/.test(out));