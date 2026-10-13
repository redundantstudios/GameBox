'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'carroms', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);
const find = (t, from = 0) => { for (let k = from; k < lines.length; k++) if (lines[k].includes(t)) return k; return -1; };
function one(t, replacement, label) {
  const i = find(t);
  if (i < 0) { console.log('MISS  ' + label); return; }
  lines.splice(i, 1, ...replacement);
  console.log('OK   ' + label);
}

/* ===== 1. BACK BUTTON VANISHED FROM THE START PAGE =====
   My previous condition was `__shellScreen==='home' && !Panels.isOpen()`. But
   the home page is ITSELF a panel (.panel.home shown inside the overlay), so
   Panels.isOpen() is true there too - which hid the button everywhere. The
   test has to be "is the panel on screen the home panel". */
one("  var on=(window.__shellScreen==='home')&&!Panels.isOpen();",
  [
    "  /* The home page is itself a panel (.panel.home inside the overlay), so",
    "     Panels.isOpen() is true there as well - gating on 'no panel open' hid",
    "     the button EVERYWHERE. The right test is whether the panel on screen is",
    "     the home panel: show for p-home, hide for every other sheet. */",
    "  var showing=document.querySelector('.panel.showing');",
    "  var on=(window.__shellScreen==='home')&&(!showing||showing.id==='p-home');",
  ],
  'back button shows on the start page only');

/* ===== 2. REMAINING DOUBLE TAP SOUND =====
   The themed back button is a <button>, so the global pointerdown handler plays
   the click for it - and its own onclick played it a second time. That was the
   duplicate the director kept hearing. The global handler covers it. */
one("    try{ S('click'); Hap.tap(); }catch(e){}",
  [
    "    /* No sound here: this is a <button>, so the global pointerdown handler",
    "       already plays the click for it. Playing it again here is what made one",
    '       tap sound twice. */',
  ],
  'back button no longer double-sounds');

/* ===== 3. SMOOTHER, LONGER PANEL TRANSITIONS =====
   The director wants these slower and smoother, not snappier - the opposite of
   the last pass. Longer, softer easing, and the panel now fades in as well as
   scaling so there is no hard pop at the start. */
one('@keyframes pop{from{transform:scale(.965) translateY(8px); opacity:0}}',
  [
    '@keyframes pop{',
    '  from{transform:scale(.94) translateY(14px); opacity:0}',
    '  60%{opacity:1}',
    '  to{transform:scale(1) translateY(0); opacity:1}',
    '}',
    '/* Deliberately unhurried: .44s on a soft ease-out-out. The previous .3s on a',
    '   snappy back-ease read as a hard snap, and paired with the backdrop fade it',
    '   looked like a glitch rather than a transition. */',
  ],
  'pop keyframe: slower, softer, fades in');
one('.panel.showing{display:block; animation:pop .3s cubic-bezier(.2,1.4,.4,1)}',
  ['.panel.showing{display:block; animation:pop .44s cubic-bezier(.22,.75,.28,1)}'],
  'panel animation .3s -> .44s, soft easing');
one('.panel.home.showing{display:flex; animation:pop .3s cubic-bezier(.2,1.4,.4,1)}',
  ['.panel.home.showing{display:flex; animation:pop .44s cubic-bezier(.22,.75,.28,1)}'],
  'home panel animation softened');
one('  opacity:0; pointer-events:none; transition:opacity .25s;',
  [
    '  /* Backdrop eases in a little ahead of the panel so the sheet is never',
    '     sliding over a backdrop that is still snapping on. */',
    '  opacity:0; pointer-events:none; transition:opacity .34s ease-out;',
  ],
  'backdrop fade slower');

/* ===== 4. NO BOT OPTION FOR THE HUMAN SEAT =====
   Every seat offered a BOT/HUMAN toggle, so seat 1 could be a bot too - which
   is how a bot-only game was possible. Seat 1 is the player, so it is always
   HUMAN and gets no toggle. */
one("  $('#profRow').innerHTML=Setup.types.map((t,i)=>`",
  [
    "  $('#profRow').innerHTML=Setup.types.map((t,i)=>`",
    "    <div class=\"pcard\">",
    "      <div class=\"pname\">${shortName(i)}</div>",
    "      <div class=\"ptog\">",
    "        ${i===0",
    "          ? '<div class=\"ptb on locked\">HUMAN</div>'",
    "          : `<button class=\"ptb${t==='bot'?' on':''}\" data-i=\"${i}\" data-t=\"bot\">BOT</button>`+",
    "            `<button class=\"ptb${t==='human'?' on':''}\" data-i=\"${i}\" data-t=\"human\">HUMAN</button>`}",
    "      </div>",
    "    </div>`).join('');",
  ],
  'profile: seat 1 is always HUMAN');
/* drop the now-duplicated original rows that followed */
{
  const i = find("    <div class=\"pcard\">", find("  $('#profRow').innerHTML=Setup.types.map((t,i)=>`"));
  if (i >= 0) {
    /* remove the old 4 template lines (pcard/pname/ptog/buttons) up to the closing backtick join */
    let j = i;
    while (j < lines.length && lines[j].indexOf("</div>`).join('');") < 0) j++;
    if (j < lines.length) {
      lines.splice(i, j - i + 1);
      console.log('OK   removed the old profile template rows');
    } else console.log('MISS old template end');
  }
}
one("  Setup.types[+b.dataset.i]=b.dataset.t;",
  [
    '  const i=+b.dataset.i;',
    "  /* Seat 1 is the player - never a bot, and never a second one. This also",
    '     makes a bot-only game impossible, which was reachable before. */',
    "  if(i===0||b.dataset.t!=='bot'&&b.dataset.t!=='human')return;",
    '  if(i===0){ Setup.types[0]=\'human\'; return; }',
    '  Setup.types[i]=b.dataset.t;',
  ],
  'profile: seat 1 cannot be switched to bot');

/* ===== 5. A WAY OUT OF HOW TO PLAY =====
   The card steps (welcome and congratulations) offered only a forward button, so
   there was no way back out of the tutorial. Added a CANCEL / BACK button. */
one('<button class="btn green" id="tutBtn">CONTINUE</button>',
  [
    '<button class="btn green" id="tutBtn">CONTINUE</button>',
    '<button class="btn sec" id="tutCancel">CANCEL</button>',
  ],
  'tutorial: cancel button markup');
one('.panel.home{',
  [
    '/* Tutorial exit sits under the primary action, deliberately quiet. */',
    '#tutCancel{width:100%;margin-top:10px}',
    '.panel.home{',
  ],
  'tutorial cancel style');
one("    const b=$('#tutBtn');b.textContent=btn;b.onclick=fn;",
  [
    "    const b=$('#tutBtn');b.textContent=btn;b.onclick=fn;",
    "    /* Step 0 can be abandoned, step 3 can step back to the aiming lesson. */",
    "    const c=$('#tutCancel');",
    "    if(n===0){c.textContent='CANCEL';c.style.display='block';c.onclick=()=>this.abort();}",
    "    else if(n===3){c.textContent='BACK';c.style.display='block';c.onclick=()=>this.goto(2);}",
    "    else c.style.display='none';",
  ],
  'tutorial: cancel wired per step');
one('  card(title,text,btn,fn){',
  [
    '  card(title,text,btn,fn,n){',
  ],
  'card() takes the step');
/* pass the step through from the two card() call sites */
one("      this.card('Tutorial','Welcome! Before your first match, we will teach you the controls. Follow the instructions.','CONTINUE',()=>this.goto(1));",
  ["      this.card('Tutorial','Welcome! Before your first match, we will teach you the controls. Follow the instructions.','CONTINUE',()=>this.goto(1),0);"],
  'card step 0 passes its step');
one("      this.card('Congratulations','You are ready for the first match!','PLAY NOW',()=>this.finish());",
  ["      this.card('Congratulations','You are ready for the first match!','PLAY NOW',()=>this.finish(),3);"],
  'card step 3 passes its step');
one('  exit(){showHome()},',
  [
    '  /* Leaving the tutorial from the welcome card: clear its state completely and',
    '     go back to the start page, rather than stranding the player in a',
    '     half-started tutorial. */',
    '  abort(){ this.active=false;this.step=-1;this.finger(null);',
    "    $('#tutBack').classList.remove('show');$('#fingerHint').classList.remove('show');",
    "    $('#tutCancel').style.display='none';",
    "    setTopbar('menu');updateTurnPill();showHome(); },",
    '  exit(){showHome()},',
  ],
  'tutorial abort');

fs.writeFileSync(FILE, lines.join(NL));
const out = fs.readFileSync(FILE, 'utf8');
console.log('\nchecks:');
console.log('  back on home only :', /showing\.id==='p-home'/.test(out));
console.log('  no double sound    :', !/b\.onclick=function\(ev\)\{[\s\S]{0,200}S\('click'\)/.test(out));
console.log('  smoother anim      :', /\.44s cubic-bezier\(\.22,\.75,\.28,1\)/.test(out));
console.log('  seat1 human        :', /i===0\?'<div class="ptb on locked">HUMAN/.test(out));
console.log('  tut cancel         :', /id="tutCancel"/.test(out) && /this\.abort\(\)/.test(out));