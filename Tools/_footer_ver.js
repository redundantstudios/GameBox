'use strict';
const fs = require('fs');
const P = 'app/src/main/res/values/strings.xml';
let s = fs.readFileSync(P, 'utf8');
const before = s;

/* The footer hardcoded "v1.0". versionName is now 1.1.0, so the shell was
   advertising a version that did not match the package it shipped in - and
   versionCode is exactly what the update flow keys off. Make it read from
   BuildConfig so the two can never drift again. */
s = s.replace(
  /<string name="footer_brand">[\s\S]*?<\/string>/,
  '<string name="footer_brand">Redundant Studios \\u00B7 v%1$s</string>'
);

if (s === before) { console.log('MISS footer_brand'); process.exit(1); }
fs.writeFileSync(P, s);
console.log('OK   footer_brand is now a format string');
console.log('  ', /<string name="footer_brand">[^<]*<\/string>/.exec(s)[0]);