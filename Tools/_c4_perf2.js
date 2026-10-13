'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'connect-four', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);
const find = (t, from = 0) => { for (let k = from; k < lines.length; k++) if (lines[k].includes(t)) return k; return -1; };
function one(mustContain, replacement, label) {
  const i = find(mustContain);
  if (i < 0) { console.log('MISS  ' + label); return; }
  lines.splice(i, 1, ...replacement);
  console.log('OK   ' + label);
}

/* ===== 1. SETTLED MARBLES WERE DRAWN THROUGH THE ROTATE PATH =====
   drawMarble() only rotates when `spin` is truthy. Settled marbles were passed
   their stale `m.spin` (spinV is 0 for them, but `spin` holds whatever angle the
   last bounce left), so EVERY marble on the board did a save/translate/rotate/
   restore plus a non-axis-aligned blit - 42 of them on a full board. That is the
   cost that grows with every turn, which is exactly the reported symptom. A
   resting marble does not spin, so it is drawn unrotated. */
one('drawMarble(cx(m.c)+m.ox,yOfGr(m.gr)+m.oy,m.p,m.spin,1,MAR_R*pulse,!!winSet&&!isW);',
  [
    '    /* spin, not m.spin: a settled marble has spinV=0 and does not rotate, but',
    '       its stale angle was truthy here, so every marble on the board took the',
    '       save/translate/rotate/restore path - 42 of them once it filled up. */',
    '    drawMarble(cx(m.c)+m.ox,yOfGr(m.gr)+m.oy,m.p,0,1,MAR_R*pulse,!!winSet&&!isW);',
  ],
  'settled marbles no longer rotate');

/* ===== 2. AUDIO NODE CHURN =====
   One drop built ~21 audio nodes: launch(2) + a four-oscillator clink per bounce
   plus a seven-node first contact. Over a full board that is hundreds of nodes
   feeding one ConvolverNode, and the churn shows up as intermittent stutter that
   builds up through a game. Bounces now use a two-oscillator clink with no noise
   burst and no reverb send. */
one('    clink(pitch,vol,pan){',
  [
    '    /* `heavy` = false for secondary bounces: two plain tones, no noise burst,',
    '       no reverb send. A full clink is four nodes through the convolver and was',
    '       built for every bounce of every drop. */',
    '    clink(pitch,vol,pan,heavy){',
    '      pitch=pitch||1;vol=vol==null?.6:vol;pan=pan||0;',
    '      if(heavy===false){',
    '        const f0=1850*pitch*(1+rnd(-.035,.035));',
    "        tone({f:f0,dur:.085,vol:.20*vol,type:'sine',pan});",
    "        tone({f:f0*2.71,dur:.05,vol:.08*vol,type:'sine',pan,at:.003});",
    '        return;',
    '      }',
  ],
  'clink: lightweight variant for bounces');

one('  SFX.clink((0.95+pow*.3)*(1+(ROWS-1-m.gr)*.05),.3+.7*pow,pan);',
  [
    '  /* Heavy (full clink + knock) on the first landing only. */',
    '  SFX.clink((0.95+pow*.3)*(1+(ROWS-1-m.gr)*.05),.3+.7*pow,pan,first);',
  ],
  'bounces use the light clink');

/* ===== 3. THE BOT FELT SLOW =====
   Roughly 2.0-2.3s of deliberate delay per bot move: a 0.9s watchdog before
   scheduleAI was even called, a 0.55-0.9s "thinking" pause, then 480ms more
   before the marble was released. None of that was gameplay. */
one('    if(S.aiWatch>.9){S.aiWatch=0;scheduleAI();}',
  ['    if(S.aiWatch>.3){S.aiWatch=0;scheduleAI();}'],
  'bot watchdog 0.9s -> 0.3s');
one('      const wait=550+Math.random()*350;',
  ['      const wait=260+Math.random()*140;'],
  'bot thinking pause halved');
one('            drop(col);\r\n            refreshUI();\r\n          },480);',
  ['            drop(col);\r\n            refreshUI();\r\n          },240);'],
  'bot aim-to-drop 480ms -> 240ms');

fs.writeFileSync(FILE, lines.join(NL));
const out = fs.readFileSync(FILE, 'utf8');
console.log('\nchecks:');
console.log('  settled unrotated :', /m\.p,0,1,MAR_R\*pulse/.test(out));
console.log('  light clink       :', /clink\(pitch,vol,pan,heavy\)/.test(out));
console.log('  heavy=first       :', /\.3\+pow,\.3\+pow,pan,first\)|,pan,first\)/.test(out));
console.log('  fast bot          :', /S\.aiWatch>\.3/.test(out) && /wait=260\+Math\.random\(\)\*140/.test(out));