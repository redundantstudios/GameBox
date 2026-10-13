'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'knot-away', 'index.html');
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const L = fs.readFileSync(F, 'utf8').split(NL);
const ok = n => console.log('OK   ' + n);

function replaceFn(name, lines, upto) {
  const i = L.findIndex(l => new RegExp('^function ' + name + '\\(').test((l || '').trim()));
  if (i < 0) { console.log('MISS ' + name + ' (not yet present)'); return false; }
  let end = i;
  while (end < L.length && L[end].trim() !== '}') end++;
  if (upto) { while (end < L.length && L[end].trim() !== upto) end++; }
  L.splice(i, end - i + 1, ...lines);
  console.log('OK   ' + name);
  return true;
}

/* ---------- the unlock model: a LIST of ad grants, not one ----------
   The single `save.temp` slot meant that while a level was ad-unlocked, the
   next level got no offer at all - the player had to wait out 30 minutes or
   finish the first one. The rule the director gave is simpler: as soon as the
   level before it is open - including when that open state is one an ad bought
   for 30 minutes - the next one can be opened with an ad too.

   Grants are now a list. Existing saves carrying the old single `save.temp`
   are migrated on first read so nobody loses a running timer. */
replaceFn('tempLevel', [
  '/* Ad grants, newest last. A grant opens ONE level for 30 minutes. Several can',
  ' * be alive at once because each ad opens the next level and a temporary open',
  ' * counts as "the level before it is open".',
  ' *',
  ' * Reads the old single `save.temp` too, so a save written by the previous',
  ' * version keeps its running timer instead of silently losing it. */',
  'function tempGrants(){',
  '  const now=Date.now();',
  "  let a=Array.isArray(save.temps)?save.temps:[];",
  "  if(!a.length && save.temp && typeof save.temp.until==='number') a=[save.temp];",
  '  const live=a.filter(t=>t && typeof t.until===\'number\' && now<t.until);',
  '  /* drop anything that has run out so it cannot linger in the save */',
  '  if(live.length!==a.length){ save.temps=live; delete save.temp; }',
  '  return live;',
  '}',
  '/* the live grant for this level, or null */',
  'function tempFor(i){',
  '  const g=tempGrants();',
  '  for(let k=0;k<g.length;k++) if(g[k].lvl===i) return g[k];',
  '  return null;',
  '}',
]);

replaceFn('lvlOpen', [
  'function lvlOpen(i){',
  '  return i<save.unlocked || !!tempFor(i);',
  '}',
]);

/* firstLocked is new, not a replacement: insert it above adEligible. */
{
  const i = L.findIndex(l => /^\/\* Which level a rewarded ad can open|^\/\* The first level still shut/.test((l || '').trim()));
  if (i < 0) { console.log('MISS adEligible anchor'); process.exit(1); }
  L.splice(i, 0,
    '/* The first level still shut. This is what carries the offer: it is always',
    ' * exactly the level whose predecessor is open, whether that predecessor was',
    ' * finished outright or merely opened for 30 minutes by an ad. */',
    'function firstLocked(){',
    '  const total=totalLevels();',
    '  for(let i=0;i<total;i++) if(!lvlOpen(i)) return i;',
    '  return -1;',
    '}',
    '');
  console.log('OK   firstLocked (added)');
}

replaceFn('adEligible', [
  '/* Which level a rewarded ad can open: the first one still shut. */',
  'function adEligible(i){',
  '  const t=firstLocked();',
  '  return t>=0 && i===t;',
  '}',
]);

replaceFn('grantAdLevel', [
  'function grantAdLevel(i){',
  '  const g=tempGrants();',
  '  g.push({lvl:i, until:Date.now()+AD_UNLOCK_MS});',
  '  save.temps=g;',
  '  delete save.temp;',
  '  persist();',
  "  kaToast('LEVEL '+(i+1)+' UNLOCKED FOR 30 MIN');",
  '}',
]);

/* ---------- the ticker now drives every live timer ---------- */
replaceFn('startAdTick', [
  '/* One timer drives every ad-opened level on screen, so two or three can count',
  ' * down together. Each badge carries its own absolute expiry, which is also why',
  ' * a reload resumes the right number instead of restarting from 30:00. */',
  'function startAdTick(){',
  '  stopAdTick();',
  '  if(!document.querySelector(\'#levelsGrid .t-timer\'))return;',
  '  const tick=function(){',
  '    const els=document.querySelectorAll(\'#levelsGrid .t-timer\');',
  '    if(!els.length){ stopAdTick(); return; }',
  '    let lapsed=false;',
  '    for(let k=0;k<els.length;k++){',
  '      const left=Number(els[k].getAttribute(\'data-until\'))-Date.now();',
  '      if(left<=0){ lapsed=true; break; }',
  "      els[k].textContent=fmtRemain(left);",
  "      els[k].classList.toggle('low',left<=60000);",
  '    }',
  '    if(lapsed){',
  '      stopAdTick();',
  '      /* re-prunes, which drops the run-out grants from the save */',
  '      tempGrants();',
  '      persist();',
  '      renderLevels();',
  "      kaToast('AD UNLOCK EXPIRED');",
  '    }',
  '  };',
  '  tick();',
  '  adTickId=setInterval(tick,1000);',
  '}',
], 'adTickId=setInterval(tick,1000);');

/* ---------- tile reads its own grant ---------- */
{
  const i = L.findIndex(l => /const tmp=\(tempLevel\(\)&&tempLevel\(\)\.lvl===i\)\?tempLevel\(\):null;/.test(l || ''));
  if (i < 0) { console.log('MISS tmp line'); process.exit(1); }
  L.splice(i, 1,
    '    /* the live ad grant for THIS level, if any */',
    '    const tmp=tempFor(i);');
  ok('tile uses tempFor');
}

/* ---------- 3 stars drops any grant on that level ---------- */
{
  const i = L.findIndex(l => /st>=3 && save\.temp && save\.temp\.lvl===G\.lvlIdx/.test(l || ''));
  if (i < 0) { console.log('MISS 3-star'); process.exit(1); }
  L.splice(i, 1,
    '  if(st>=3){',
    '    const g=tempGrants().filter(t=>t.lvl!==G.lvlIdx);',
    '    if(g.length!==tempGrants().length){ save.temps=g; delete save.temp; }',
    '  }');
  ok('3 stars clears the grant on that level');
}

/* ---------- load: prune, do not resurrect ---------- */
{
  const i = L.findIndex(l => /An ad-opened level that ran out is just gone/.test(l || ''));
  if (i < 0) { console.log('MISS prune'); process.exit(1); }
  L.splice(i, 1,
    '  /* An ad-opened level that ran out is just gone; never resurrect it. */',
    '  save.temps=(Array.isArray(save.temps)?save.temps:[]).filter(t=>t && typeof t.until===\'number\' && Date.now()<t.until);',
    '  delete save.temp;');
  ok('load prunes and migrates');
}

/* ---------- in-game HUD chip: show whichever grant covers this level ---------- */
{
  const i = L.findIndex(l => /const tmp=tempLevel\(\);/.test(l || ''));
  if (i < 0) { console.log('MISS hud'); process.exit(1); }
  L.splice(i, 1, '  const tmp=tempFor(G.lvlIdx);');
  ok('hud uses tempFor');
}

fs.writeFileSync(F, L.join(NL));
const out = fs.readFileSync(F, 'utf8');
console.log('\nchecks:');
console.log('  no tempLevel() left :', !/tempLevel\(\)/.test(out));
console.log('  grants list         :', /function tempGrants\(\)/.test(out));
console.log('  firstLocked         :', /function firstLocked\(\)/.test(out));
console.log('  eligibility         :', /i===t;/.test(out));
console.log('  migration           :', /delete save\.temp;/.test(out));