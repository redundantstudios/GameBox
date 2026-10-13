'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'truth-or-dare', 'index.html');
const before = fs.readFileSync(F, 'utf8');
const NL = before.includes('\r\n') ? '\r\n' : '\n';
const lines = before.split(NL);
console.log('before: ' + lines.length + ' lines');
const done = [];
const ok = n => { done.push(n); console.log('OK   ' + n); };

/* ---------- 1. remove GIVE ME ANOTHER (markup + handler + how-to) ---------- */
{
  const i = lines.findIndex(l => /<button class="mini" id="btnRedraw">/.test(l || ''));
  if (i < 0) { console.log('MISS redraw markup'); process.exit(1); }
  lines.splice(i, 1);
  ok('removed the GIVE ME ANOTHER button');

  const h = lines.findIndex(l => /\$\('#btnRedraw'\)\.onclick=/.test(l || ''));
  if (h < 0) { console.log('MISS redraw handler'); process.exit(1); }
  let end = h;
  while (end < lines.length && lines[end].trim() !== '};') end++;
  lines.splice(h, end - h + 1,
    '/* The "GIVE ME ANOTHER" redraw was removed: it let a player skip a prompt they',
    '   had just been given. Finishing or voting is the only way out now. */');
  ok('removed the redraw handler');

  // renumber the how-to list, which lost a step
  lines.splice(lines.findIndex(l => /^2\. Got another prompt instead\?/.test((l || '').trim())), 1);
  const map = [
    [/^3\. When done, tap/, '2. When done, tap'],
    [/^4\. <b>Every other player votes/, '3. <b>Every other player votes'],
    [/^5\. Majority GG/, '4. Majority GG'],
  ];
  for (const [re, to] of map) {
    const k = lines.findIndex(l => re.test((l || '').trim()));
    if (k < 0) { console.log('MISS howto ' + re); continue; }
    lines[k] = lines[k].replace(re, to);
  }
  ok('how-to list renumbered');
}

/* ---------- 2. footer credit ---------- */
{
  const i = lines.findIndex(l => /<span class="brand">ARCADE PARTY<\/span>/.test(l || ''));
  if (i < 0) { console.log('MISS brand'); process.exit(1); }
  // the back button takes the left of the top row, so the wordmark moves down
  lines.splice(i, 1);
  ok('brand removed from the top row');

  const j = lines.findIndex(l => /<section id="scrGame" class="screen">/.test(l || ''));
  if (j < 0) { console.log('MISS scrGame'); process.exit(1); }
  lines.splice(j - 1, 0,
    '<div class="foot-brand">REDUNDANT STUDIOS</div>',
    '</section>',
    '');
  ok('footer added to the start screen');

  const c = lines.findIndex(l => /^\.brand\{/.test(l || ''));
  if (c < 0) { console.log('MISS brand css'); process.exit(1); }
  lines.splice(c + 1, 0,
    '.foot-brand{margin:18px auto 6px;text-align:center;font-family:var(--mono);font-size:10px;',
    '  font-weight:700;letter-spacing:.26em;color:var(--faint);opacity:.75}');
  ok('footer style');
}

/* ---------- 3. back button in the game's own language, top-left ---------- */
{
  const s = lines.findIndex(l => /<symbol id="i-gear"/.test(l || ''));
  if (s < 0) { console.log('MISS sprite'); process.exit(1); }
  lines.splice(s + 1, 0,
    '<symbol id="i-back" viewBox="0 0 24 24"><path d="M15 5 8 12l7 7"/></symbol>');
  ok('i-back sprite added');

  const a = lines.findIndex(l => /<div style="display:flex;gap:8px">/.test(l || ''));
  if (a < 0) { console.log('MISS toprow group'); process.exit(1); }
  // back button sits left of the group; top-row is space-between so it lands
  // on the far left, aligned with the help and gear buttons on the right.
  lines.splice(a, 0,
    '<button class="icon-btn td-back" id="tdBackBtn" aria-label="Back"><svg class="ic"><use href="#i-back"/></svg></button>',
    '');
  ok('back button markup in the top row');

  const b = lines.findIndex(l => /\/\* ---------- back button, start screen only ---------- \*\//.test(l || ''));
  if (b < 0) { console.log('MISS back block'); process.exit(1); }
  let end = b;
  while (end < lines.length && lines[end].trim() !== '}catch(e){}') end++;
  if (end >= lines.length) { console.log('MISS back end'); process.exit(1); }

  lines.splice(b, end - b + 1,
    '  /* ---------- back button, start screen only ----------',
    '     It used to be a fixed-positioned white circle containing the single',
    "     character &#8249;, floating over the <h1> - which is why it overlapped the",
    '     title and looked nothing like the rest of the game. It is now a real',
    '     .icon-btn using the same sprite and the same chrome as the help and gear',
    '     buttons, and it sits in the top row beside them: space-between puts it on',
    '     the far left, square with them on the right. */',
    '  try{',
    "    var btn=document.getElementById('tdBackBtn');",
    "    if(!btn){ btn=document.createElement('button'); btn.id='tdBackBtn';",
    "      btn.className='icon-btn td-back'; btn.setAttribute('aria-label','Back');",
    '      btn.innerHTML=\'<svg class="ic"><use href="#i-back"/></svg>\';',
    "      var row=document.querySelector('#scrSetup .top-row');",
    "      if(row&&row.firstChild)row.insertBefore(btn,row.firstChild);",
    "      else document.body.appendChild(btn);",
    '    }',
    "    btn.addEventListener('click',function(){ try{ S.tap(); }catch(e){} try{ if(B.exitGame)B.exitGame(); }catch(e){} });",
    '    window.__shellBackBtn=btn;',
    '  }catch(e){}');
  ok('back button rebuilt in the game style');

  // visibility toggle must not fight .icon-btn's display:grid
  const t = lines.findIndex(l => /window\.__shellBackBtn\.style\.display=onHome\?'block':'none';/.test(l || ''));
  if (t < 0) { console.log('MISS toggle'); process.exit(1); }
  lines.splice(t, 1,
    "        /* 'block' would drop the .icon-btn grid centring the glyph relies on */",
    "        window.__shellBackBtn.style.display=onHome?'grid':'none';");
  ok('visibility toggle uses grid');
}

fs.writeFileSync(F, lines.join(NL));
const out = fs.readFileSync(F, 'utf8');
console.log('after:  ' + fs.readFileSync(F, 'utf8').split(NL).length + ' lines');
console.log('\nchecks:');
console.log('  edits:', done.length + '/9');
console.log('  redraw gone   :', !/btnRedraw|GIVE ME ANOTHER/.test(out));
console.log('  back in row   :', /id="tdBackBtn"/.test(out) && /#scrSetup \.top-row/.test(out));
console.log('  uses sprite   :', /href="#i-back"/.test(out) && /<symbol id="i-back"/.test(out));
console.log('  no float      :', !/position:fixed[^;]*z-index:9998/.test(out));
console.log('  toggle = grid :', /onHome\?'grid':'none'/.test(out));
console.log('  footer        :', /foot-brand">REDUNDANT STUDIOS/.test(out));
console.log('  brand gone    :', !/ARCADE PARTY/.test(out));
console.log('  section pairs :', (out.match(/<section/g) || []).length === (out.match(/<\/section>/g) || []).length);