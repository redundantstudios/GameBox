'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'connect-four', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);

function idx(pred, from = 0) {
  for (let k = from; k < lines.length; k++) if (pred(lines[k])) return k;
  return -1;
}
function swap(startRe, endRe, replacement, label) {
  const i = idx(l => startRe.test(l));
  if (i < 0) { console.log('MISS start  ' + label); return false; }
  let j = i;
  while (j < lines.length && !endRe.test(lines[j])) j++;
  if (j >= lines.length) { console.log('MISS end    ' + label); return false; }
  lines.splice(i, j - i + 1, ...replacement);
  console.log('OK   ' + label);
  return true;
}
function swapOne(mustContain, replacement, label) {
  const i = idx(l => l.includes(mustContain));
  if (i < 0) { console.log('MISS  ' + label); return false; }
  lines.splice(i, 1, ...replacement);
  console.log('OK   ' + label);
  return true;
}

/* ===== 2. no input until the marble has settled ===== */
swapOne(
  "const canAct=()=>S.phase==='play'&&!S.locked&&!S.thinking&&!(S.mode==='ai'&&S.cur===2);",
  [
    '/* No input until the marble has come to rest. This used to allow it, and',
    '   queued the choice into S.pending to replay once the falling marble settled -',
    '   so you could flick a second move while the first was still in the air.',
    '   It now has to wait: canAct() is false while anything is falling, which',
    '   gates the aim drag, the drop and the keyboard alike. */',
    "const anyFalling=()=>S.marbles.some(m=>m.st==='fall');",
    "const canAct=()=>S.phase==='play'&&!S.locked&&!S.thinking&&!(S.mode==='ai'&&S.cur===2)&&!anyFalling();",
  ],
  'input blocked while a marble is falling');

/* ===== 5. win-popup MENU button shows an interstitial ===== */
swapOne(
  " $('#btnMenu').addEventListener('click',()=>{SFX.tap();goIntro();});",
  [
    " $('#btnMenu').addEventListener('click',()=>{",
    '   SFX.tap();',
    "   shellAd(function(){ goIntro(); },'connectfour.result.menu');",
    ' });',
  ],
  'win-popup MENU shows an interstitial');

/* ===== 3a. make the engine re-usable off-thread ===== */
swapOne('const engine=(()=>{',
  [
    '/* Kept as a named factory so its SOURCE can be handed to a Worker below -',
    '   `const engine=(()=>{...})()` only keeps the returned {choose} object, and',
    "   {}.toString() is '[object Object]'. */",
    'const engineFactory=()=>{',
  ],
  'engine becomes a named factory');

swapOne('  return{choose};',
  ['  return{choose};', '};', 'const engine=engineFactory();'],
  'engine factory closed + instantiated');

/* ===== 3b. run the search in a Worker ===== */
{
  const i = idx(l => l.includes('function scheduleAI(){'));
  if (i < 0) console.log('MISS scheduleAI');
  else {
    lines.splice(i, 0,
      '/* ================= AI off the main thread =================',
      '   The medium and hard bot run a negamax search with a 220ms / 480ms budget,',
      '   and it ran ON THE MAIN THREAD - so every single bot turn froze the whole',
      '   game for up to nearly half a second. That is precisely the reported',
      '   "sometimes smooth, sometimes very laggy": smooth whenever the marble was',
      '   moving, hard-stuck on every bot turn.',
      '   engineFactory() is self-contained (it takes the grid as an argument and uses',
      '   only Int8Array / Date / Math), so it moves into a Worker verbatim and the',
      '   frame loop never sees it. easyMove() reads live game state and stays inline,',
      '   but it does no search at all. If the Worker cannot start, the original',
      '   synchronous path is used. */',
      'let _aiWorker=null,_aiWorkerDead=false;',
      'function aiWorker(){',
      '  if(_aiWorkerDead)return null;',
      '  if(_aiWorker)return _aiWorker;',
      '  try{',
      '    const src=\'var engine=(\'+engineFactory.toString()+\')();\'+',
      "      'self.onmessage=function(e){var d=e.data;try{'+",
      "        'self.postMessage({col:engine.choose(d.grid,d.level).col});}'+",
      "        'catch(err){self.postMessage({col:-1});}}';",
      "    const url=URL.createObjectURL(new Blob([src],{type:'application/javascript'}));",
      '    _aiWorker=new Worker(url);',
      '    _aiWorker.onerror=function(){ _aiWorkerDead=true; _aiWorker=null; };',
      '    return _aiWorker;',
      '  }catch(e){ _aiWorkerDead=true; return null; }',
      '}',
      '');
    console.log('OK   aiWorker helper');
  }
}

/* ===== 3c. scheduleAI asks the worker instead of blocking ===== */
/* scheduleAI is rebuilt wholesale below - its nested timeouts are awkward to
   splice piecemeal. */
{
  const i = idx(l => /^function scheduleAI\(\)\{\s*$/.test(l));
  if (i < 0) console.log('MISS scheduleAI body');
  else {
    let j = i;
    while (j < lines.length && !/^\}$/.test(lines[j])) j++;
    lines.splice(i, j - i + 1,
      'function scheduleAI(){',
      "  if(S.mode!=='ai'||S.cur!==2||S.phase!=='play'||S.locked)return;",
      '  const id=++aiId;',
      '  S.thinking=true;refreshUI();',
      '  setTimeout(()=>{',
      "    if(id!==aiId||S.phase!=='play'||S.locked)return;",
      '    /* Everything after the column is known. */',
      '    const commit=(raw)=>{',
      "      if(id!==aiId||S.phase!=='play'||S.locked)return;",
      '      let col=raw;',
      '      if(!(col>=0)||S.ht[col]>=ROWS)col=firstValid();',
      '      if(col<0)return;',
      '      const wait=550+Math.random()*350;',
      '      setTimeout(()=>{',
      "        if(id!==aiId||S.phase!=='play'||S.locked)return;",
      '        const tryDrop=()=>{',
      "          if(id!==aiId||S.phase!=='play'||S.locked)return;",
      "          if(anyFalling()){setTimeout(tryDrop,80);return;}",
      '          S.thinking=false;',
      '          S.aim=col;S.aiAim=true;',
      '          SFX.clink(1.6,.12,panOf(cx(col)));',
      '          refreshUI();',
      '          setTimeout(()=>{',
      "            if(id!==aiId||S.phase!=='play'||S.locked)return;",
      '            drop(col);',
      '            refreshUI();',
      '          },480);',
      '        };',
      '        tryDrop();',
      '      },wait);',
      '    };',
      "    if(S.diff==='easy'){ let c=-1; try{c=easyMove();}catch(e){} commit(c); return; }",
      '    const w=aiWorker();',
      '    if(!w){',
      '      let c=-1; try{c=engine.choose(Array.from(S.grid),S.diff).col;}catch(e){}',
      '      commit(c); return;',
      '    }',
      '    const grid=Array.from(S.grid),level=S.diff;',
      '    const onMsg=function(ev){',
      '      try{ w.removeEventListener(\'message\',onMsg); }catch(e){}',
      '      commit(ev&&ev.data?ev.data.col:-1);',
      '    };',
      "    w.addEventListener('message',onMsg);",
      '    try{ w.postMessage({grid:grid,level:level}); }',
      '    catch(e){ try{w.removeEventListener(\'message\',onMsg);}catch(_){} commit(-1); }',
      '  },80);',
      '}',
      '');
    console.log('OK   scheduleAI uses the worker');
  }
}

fs.writeFileSync(FILE, lines.join(NL));
console.log('\nstage 1 written (' + lines.length + ' lines)');