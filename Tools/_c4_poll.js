'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'connect-four', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);

const i = lines.findIndex(l => l.includes("window.__shellBackBtn.style.display=onHome?'block':'none';"));
if (i < 0) { console.log('MISS back button poll'); process.exit(1); }

lines.splice(i, 1,
  "        /* Only write when it actually changes. This ran every 400ms and",
  "           assigned style.display unconditionally, so while a game was playing",
  "           it rewrote display:'none' onto a button that was already none - a",
  "           forced style invalidation in the WebView 2.5 times a second, for the",
  "           whole session. It showed up as input latency. */",
  "        if(onHome!==b.__wasHome){ b.__wasHome=onHome;",
  "          window.__shellBackBtn.style.display=onHome?'block':'none'; }");

fs.writeFileSync(FILE, lines.join(NL));
const out = fs.readFileSync(FILE, 'utf8');
console.log('OK   back button poll only writes on change');
console.log('  verify:', /if\(onHome!==b\.__wasHome\)/.test(out));