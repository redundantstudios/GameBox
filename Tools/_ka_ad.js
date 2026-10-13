'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'knot-away', 'index.html');
const before = fs.readFileSync(F, 'utf8');
const NL = before.includes('\r\n') ? '\r\n' : '\n';
const lines = before.split(NL);
console.log('before: ' + lines.length + ' lines');
const edited = [];
const mark = n => { edited.push(n); console.log('OK   ' + n); };

/* ---------- 1. CSS for the ad chip and the toast ---------- */
{
  const i = lines.findIndex(l => /^\.tile\.shake\{/.test(l || ''));
  if (i < 0) { console.log('MISS css'); process.exit(1); }
  lines.splice(i + 1, 0,
    '/* "Watch an ad" chip shown on the one locked level that a rewarded ad can',
    '   open. Deliberately a span, not a button: the tile itself is already a',
    '   <button>, and a button inside a button is invalid and swallows taps. */',
    '.tile .ad-chip{display:flex;align-items:center;gap:4px;margin-top:4px;padding:3px 7px;',
    '  border-radius:999px;background:linear-gradient(#E8B04B,#C9862A);color:#3E2708;',
    '  font-size:8.5px;font-weight:900;letter-spacing:.08em;white-space:nowrap;',
    '  box-shadow:0 1px 0 #A96C18,0 2px 5px rgba(96,56,10,.22)}',
    '.tile .ad-chip svg{width:11px;height:11px;stroke:#3E2708;stroke-width:2.6;fill:none}',
    '.tile.ad-open{opacity:1;filter:none;box-shadow:0 0 0 3px #E8B04B,0 4px 0 #CBB083,0 7px 14px rgba(96,56,10,.16)}',
    '.tile.ad-open::after{content:"";position:absolute;inset:-3px;border-radius:18px;',
    '  border:2px solid rgba(232,176,75,.75);animation:adPulse 1.8s ease-in-out infinite;pointer-events:none}',
    '@keyframes adPulse{0%,100%{opacity:.25;transform:scale(1)}50%{opacity:.85;transform:scale(1.02)}}',
    '/* transient confirmation after an ad grant */',
    '.ka-toast{position:fixed;left:50%;bottom:12%;transform:translate(-50%,14px);z-index:9999;',
    '  padding:11px 18px;border-radius:999px;background:rgba(62,39,8,.95);color:#FFF6E9;',
    '  font-size:12.5px;font-weight:900;letter-spacing:.06em;white-space:nowrap;',
    '  box-shadow:0 6px 18px rgba(0,0,0,.3);opacity:0;pointer-events:none;',
    '  transition:opacity .2s,transform .2s}',
    '.ka-toast.show{opacity:1;transform:translate(-50%,0)}');
  mark('CSS: ad chip + toast');
}

/* ---------- 2. the confirm panel ---------- */
{
  const i = lines.findIndex(l => /<div class="panel" id="panel-tryagain">/.test(l || ''));
  if (i < 0) { console.log('MISS panel'); process.exit(1); }
  lines.splice(i, 0,
    '<div class="panel" id="panel-unlockad">',
    '  <div class="panel-kicker">WATCH AN AD</div>',
    '  <h2>OPEN LEVEL <span id="uaNum">2</span>?</h2>',
    '  <p class="sub" id="uaMsg">Unlock this level for 30 minutes. Finish it with 3 stars and it stays unlocked for good.</p>',
    '  <div class="panel-btns">',
    '    <button class="btn primary" id="btnUaGo">WATCH AD</button>',
    '    <button class="btn" id="btnUaNo">NOT NOW</button>',
    '  </div>',
    '</div>',
    '');
  mark('markup: panel-unlockad');
}

/* ---------- 3. unlock model + toast ---------- */
{
  const i = lines.findIndex(l => /function renderLevels\(\)/.test(l || ''));
  if (i < 0) { console.log('MISS renderLevels'); process.exit(1); }
  lines.splice(i, 0,
    "/* ---------- ad-opened levels ----------",
    '   save.unlocked is a COUNT of levels open from the start. A rewarded ad can',
    '   open exactly one more - the first locked level, i.e. the one whose',
    '   predecessor is already open - and only for 30 minutes. Three stars on it',
    '   promotes it to a permanent unlock, because finishing it is the real reward.',
    '   Only one level can be ad-opened at a time, so the offer never runs ahead',
    '   of the player. */',
    'const AD_UNLOCK_MS=30*60*1000;',
    'function tempLevel(){',
    '  const t=save.temp;',
    '  return (t && typeof t.until===\'number\' && Date.now()<t.until) ? t : null;',
    '}',
    'function lvlOpen(i){',
    '  if(i<save.unlocked)return true;',
    '  const t=tempLevel();',
    '  return !!(t && t.lvl===i);',
    '}',
    'function adEligible(i){',
    '  const t=tempLevel();',
    '  if(t && t.lvl===i) return false;   /* already ad-opened */',
    '  if(t) return false;                /* another level holds the offer */',
    '  return i===save.unlocked && i<totalLevels();',
    '}',
    'function grantAdLevel(i){',
    '  save.temp={lvl:i, until:Date.now()+AD_UNLOCK_MS};',
    '  persist();',
    '  kaToast(\'LEVEL \'+(i+1)+\' UNLOCKED FOR 30 MIN\');',
    '}',
    '/* Small confirmation after an ad - there was no toast in this game before. */',
    'let kaToastT=null;',
    'function kaToast(msg){',
    '  let t=document.getElementById(\'kaToast\');',
    '  if(!t){ t=document.createElement(\'div\'); t.id=\'kaToast\'; t.className=\'ka-toast\'; document.body.appendChild(t); }',
    '  t.textContent=msg;',
    '  requestAnimationFrame(()=>t.classList.add(\'show\'));',
    '  if(kaToastT)clearTimeout(kaToastT);',
    '  kaToastT=setTimeout(()=>{ t.classList.remove(\'show\'); },2400);',
    '}',
    '');
  mark('logic: ad unlock model + toast');
}

/* ---------- 4. draw the chip on the eligible tile ---------- */
{
  const i = lines.findIndex(l => /const unlocked=i<save\.unlocked,rec=save\.levels\[i\];/.test(l || ''));
  if (i < 0) { console.log('MISS tile line'); process.exit(1); }
  lines.splice(i, 1,
    '    const unlocked=lvlOpen(i),rec=save.levels[i],adOK=adEligible(i);');
  mark('tile: uses lvlOpen/adEligible');

  const j = lines.findIndex(l => /t\.className='tile'\+\(unlocked\?'':' locked'\)/.test(l || ''));
  if (j < 0) { console.log('MISS className'); process.exit(1); }
  lines.splice(j, 1,
    "    t.className='tile'+(unlocked?'':' locked')+((unlocked&&!rec)?' current':'')+(adOK?' ad-open':'');");
  mark('tile: ad-open class');

  const k = lines.findIndex(l => /:\`<span class="t-num">\$\{i\+1\}<\/span>\$\{LOCK_SVG\}\`;/.test(l || ''));
  if (k < 0) { console.log('MISS locked markup'); process.exit(1); }
  lines.splice(k, 1,
    '      :`<span class="t-num">${i+1}</span>${LOCK_SVG}${adOK?AD_CHIP:""}`;');
  mark('tile: chip markup');

  const c = lines.findIndex(l => /const LOCK_SVG=/.test(l || ''));
  lines.splice(c + 1, 0,
    "const AD_CHIP='<span class=\"ad-chip\"><svg viewBox=\"0 0 24 24\" stroke-linecap=\"round\" stroke-linejoin=\"round\">' +",
    "  '<path d=\"M5 3.5v13l11-6.5z\"/></svg>AD</span>';");
  mark('tile: AD_CHIP markup');

  // click behaviour: the eligible level opens the confirm sheet instead of shaking
  const h = lines.findIndex(l => /t\.addEventListener\('click',\(\)=>\{/.test(l || ''));
  if (h < 0) { console.log('MISS click'); process.exit(1); }
  lines.splice(h + 1, 0,
    '      if(adOK){ openAdConfirm(i); return; }');
  mark('tile: ad chip click opens confirm');
}

/* ---------- 5. confirm sheet + grant ---------- */
{
  const i = lines.findIndex(l => /function renderLevels\(\)/.test(l || ''));
  lines.splice(i, 0,
    'let uaIdx=0;',
    'function openAdConfirm(i){',
    '  uaIdx=i;',
    "  $('#uaNum').textContent=String(i+1);",
    "  $('#btnUaGo').onclick=function(){",
    '    closePanels();',
    "    rewarded('level_unlock', function(){",
    '      grantAdLevel(uaIdx);',
    '      renderLevels();',
    '    }, function(){',
    "      kaToast('AD NOT AVAILABLE');",
    '    });',
    '  };',
    "  $('#btnUaNo').onclick=function(){ AudioSys.sfx('click'); closePanels(); };",
    "  AudioSys.sfx('click');",
    '  openPanel(\'unlockad\');',
    '}',
    '');
  mark('logic: openAdConfirm');
}

/* ---------- 6. three stars promotes the ad unlock to permanent ---------- */
{
  const i = lines.findIndex(l => /save\.unlocked=Math\.max\(save\.unlocked,Math\.min\(totalLevels\(\),G\.lvlIdx\+2\)\);/.test(l || ''));
  if (i < 0) { console.log('MISS complete'); process.exit(1); }
  lines.splice(i, 1,
    '  /* Three stars on a level that was only ad-opened earns it permanently -',
    '     the line below already opens the one after it, but the ad-opened level',
    '     itself would have lapsed with the timer, so promote it here. */',
    '  if(st>=3 && save.temp && save.temp.lvl===G.lvlIdx){ delete save.temp; }',
    '  save.unlocked=Math.max(save.unlocked,Math.min(totalLevels(),G.lvlIdx+2));');
  mark('complete: 3 stars = permanent');
}

/* ---------- 7. drop a lapsed temporary unlock on load ---------- */
{
  const i = lines.findIndex(l => /loadState\(\);|if\(!save\|\|typeof save!=='object'\)save=\{unlocked:1/.test(l || ''));
  if (i < 0) { console.log('MISS load'); process.exit(1); }
  lines.splice(i + 1, 0,
    "  /* An ad-opened level that ran out is just gone; never resurrect it. */",
    '  if(save.temp && typeof save.temp.until===\'number\' && Date.now()>=save.temp.until) delete save.temp;');
  mark('load: prune expired ad unlock');
}

fs.writeFileSync(F, lines.join(NL));
const out = fs.readFileSync(F, 'utf8');
console.log('after:  ' + fs.readFileSync(F, 'utf8').split(NL).length + ' lines');
console.log('\nchecks:');
console.log('  edits:', edited.length + '/7');
console.log('  lvlOpen used :', /const unlocked=lvlOpen\(i\)/.test(out));
console.log('  chip markup  :', /AD_CHIP/.test(out));
console.log('  confirm wired:', /openAdConfirm/.test(out));
console.log('  30 min       :', /AD_UNLOCK_MS=30\*60\*1000/.test(out));
console.log('  3-star promo :', /st>=3 && save\.temp/.test(out));