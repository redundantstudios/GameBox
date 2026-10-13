'use strict';
const fs = require('fs');
const NL = f => fs.readFileSync(f, 'utf8').includes('\r\n') ? '\r\n' : '\n';

/* ---- 1. the "Send test notification" button in Settings ----
   This is unambiguously a development tool and it was shipping inside a
   player-facing screen. Removed from the layout and its handler unbound. */
{
  const F = 'app/src/main/res/layout/activity_settings.xml';
  let s = fs.readFileSync(F, 'utf8');
  const i = s.indexOf('android:id="@+id/btnTestNotif"');
  if (i < 0) { console.log('SKIP  btnTestNotif already gone from layout'); }
  else {
    // walk back to the start of the element (<Button ... >)
    const start = s.lastIndexOf('<', i);
    // walk forward to the element's own closing '/>'
    const end = s.indexOf('/>', i);
    if (start < 0 || end < 0) { console.log('MISS  btnTestNotif element bounds'); process.exit(1); }
    const el = s.slice(start, end + 2);
    s = s.slice(0, start) + s.slice(end + 2);
    fs.writeFileSync(F, s);
    console.log('OK    btnTestNotif removed from activity_settings.xml');
    console.log('      was: ' + el.replace(/\s+/g, ' ').slice(0, 90));
  }
}

{
  const F = 'app/src/main/java/com/redundantstudios/arcade/SettingsActivity.kt';
  let s = fs.readFileSync(F, 'utf8');
  const before = s.length;
  // drop any line that binds the button, or the string that names it
  s = s.split(/\r?\n/)
    .filter(l => !/btnTestNotif/.test(l))
    .join('\n');
  if (s.length === before) console.log('SKIP  no btnTestNotif binding in SettingsActivity');
  else { fs.writeFileSync(F, s); console.log('OK    SettingsActivity no longer binds btnTestNotif'); }

  // the string is now unused
  const S = 'app/src/main/res/values/strings.xml';
  let x = fs.readFileSync(S, 'utf8');
  x = x.replace(/\s*<string name="btn_send_test">[^<]*<\/string>/, '');
  fs.writeFileSync(S, x);
  console.log('OK    btn_send_test string removed');
}

/* ---- 2. chess: the simulated TEST AD panel ----
   Dead in the shell (showTestAd is only reached when window.NativeBridge is
   absent, i.e. a browser preview), but it is development scaffolding and the
   string "TEST INTERSTITIAL - SIMULATED" has no business in a shipped game. */
{
  const F = 'app/src/main/assets/games/chess/index.html';
  let s = fs.readFileSync(F, 'utf8');
  if (!/id="testAd"/.test(s)) { console.log('SKIP  chess test panel already gone'); }
  else {
    const start = s.indexOf('<div id="testAd" class="modalWrap">');
    const end = s.indexOf('</div>\n', s.indexOf('id="taBody"'));
    if (start < 0) { console.log('MISS  chess panel markup'); process.exit(1); }
    // find the balanced end of the modalWrap block by counting div tags
    let d = 0, i = start, endIdx = -1;
    const re = /<\/?div\b/g; re.lastIndex = start;
    let m;
    while ((m = re.exec(s))) {
      if (m[0] === '<div') d++; else d--;
      if (d === 0) { endIdx = m.index + '</div>'.length; break; }
    }
    if (endIdx < 0) { console.log('MISS  chess panel close'); process.exit(1); }
    s = s.slice(0, start) + s.slice(endIdx);
    console.log('OK    chess TEST AD panel markup removed');
  }
  fs.writeFileSync(F, s);
}