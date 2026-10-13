'use strict';
const fs = require('fs');
const P = 'app/src/main/res/values/strings.xml';
let s = fs.readFileSync(P, 'utf8');
const before = s.length;

// Everything now lives in strings_update.xml. Leaving duplicates here would
// mean two copies of the same sentence, and editing the wrong one silently.
const NAMES = [
  'update_kicker', 'update_title', 'update_body', 'update_now', 'update_later',
  'update_done_kicker', 'update_done_title', 'update_done_body', 'update_done_action',
  'update_checking',
  'notif_update_title', 'notif_update_body', 'notif_update_done_title', 'notif_update_done_body',
  'notif_perm_title', 'notif_perm_body'
];
let removed = 0;
for (const n of NAMES) {
  const re = new RegExp('\\s*<string name="' + n + '"[\\s\\S]*?</string>', 'g');
  if (re.test(s)) { s = s.replace(re, ''); removed++; }
}
// the explanatory comment block that introduced them
s = s.replace(/\s*<!-- =+ in-app updates =+ -->[\s\S]*?(?=<string)/, '\n');
s = s.replace(/\s*<!-- first-launch permission ask[^>]*-->/g, '');

fs.writeFileSync(P, s);
console.log('removed ' + removed + ' duplicated strings');
console.log('strings.xml shrank by ' + (before - s.length) + ' bytes');
const leftover = NAMES.filter(n => new RegExp('name="' + n + '"').test(s));
console.log('leftovers: ' + (leftover.length ? leftover.join(', ') : 'none'));
