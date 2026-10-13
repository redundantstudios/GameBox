'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/java/com/redundantstudios/arcade/GameActivity.kt', 'utf8');
const seen = new Set();
(s.match(/getStringExtra\([^)]*\)/g) || []).forEach(m => seen.add(m));
(s.match(/EXTRA_[A-Z_]+\s*=\s*"[^"]+"/g) || []).forEach(m => seen.add(m));
[...seen].forEach(m => console.log(m));