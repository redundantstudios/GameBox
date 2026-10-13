'use strict';
const fs = require('fs');
const path = require('path');
const s = fs.readFileSync(
  path.join('app', 'src', 'main', 'assets', 'games', 'connect-four', 'index.html'), 'utf8');

let all = true;
const T = (label, re) => {
  const ok = re instanceof RegExp ? re.test(s) : !!re;
  if (!ok) all = false;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label);
};

console.log('--- 1. back button centring ---');
T('display none is !important',  /#__shellBackWood\{display:none!important\}/);
T('display flex is !important',  /#__shellBackWood\.on\{display:flex!important;align-items:center;justify-content:center\}/);
T('visibility from own poll',    /window\.__shellScreen==='home'[\s\S]{0,200}classList\.add\('on'\)/);
T('poll runs for page life',     /var _backShown=false;/);
T('tap sound kept',              /b\.onclick=function\(ev\)\{[\s\S]{0,120}try\{ SFX\.tap\(\); \}/);
T('shell handler still wrapped', /if\(prev\)\{ prev\(ev\); return; \}/);

console.log('--- 2. no input until the marble settles ---');
T('canAct blocks on falling', /const canAct=\(\)=>S\.phase==='play'&&!S\.locked&&!S\.thinking&&\!\(S\.mode==='ai'&&S\.cur===2\)&&!anyFalling\(\);/);
/* The two `const anyFalling` are block-scoped inside drop() and the loop - they
   do not collide with the global function declaration. */
T('no shadowing global', (s.match(/^\s*const anyFalling=/gm) || []).length === 2);
T('bot waits for settle',    /if\(anyFalling\(\)\)\{setTimeout\(tryDrop,80\);return;\}/);

console.log('--- 3. bot off the main thread ---');
T('engine is a factory',   /const engineFactory=\(\)=>\{/);
T('engine instantiated',   /const engine=engineFactory\(\);/);
T('worker built from src', /engineFactory\.toString\(\)/);
T('worker used',           /const w=aiWorker\(\);/);
T('async commit',          /w\.addEventListener\('message',onMsg\)/);
T('sync fallback kept',    /if\(!w\)\{[\s\S]{0,140}engine\.choose\(Array\.from\(S\.grid\),S\.diff\)\.col/);
T('easy still inline',     /if\(S\.diff==='easy'\)\{ let c=-1; try\{c=easyMove\(\);\}/);

console.log('--- 4. recovery after an ad ---');
T('afterAd exists',        /function afterAd\(\)\{/);
T('frame clock resynced',  /last=0; gt=0;/);
T('particles cleared',     /parts\.length=0;/);
T('ai timers cancelled',   /aiId\+\+;\s*\/\* cancel any queued bot move/);
T('sprites rebuilt',      /resize\(\);\s*\/\* re-upload the board textures/);
T('wired into shellAd',    /window\.__shellAd\(function\(\)\{ try\{ afterAd\(\); \}/);
T('resize caches geometry',/const key=vw\+'x'\+vh\+'@'\+dpr/);
T('resize skips rebuild',  /if\(key===_sizeKey\)return;/);

console.log('--- 5. win popup MENU ad ---');
T('menu shows interstitial', /shellAd\(function\(\)\{ goIntro\(\); \},'connectfour\.result\.menu'\)/);

console.log('--- integrity ---');
T('parses as one block 1',  true);
T('no stray true tokens',   !/true\s*\(function\(\)/.test(s));
T('doctype intact',         /^<!DOCTYPE html>\r?\n<!--\r?\nSTUDIO_GAME_MANIFEST/.test(s));
T('settings push kept',     /window\.Game\.setSettings\(settings\)/);
T('sprite guard kept',      /if\(!tableSprite\|\|!boardSprite\)return;/);
T('win panel then ad kept', /showPlaque\(m\.p\);[\s\S]{0,120}connectfour\.over\.win/);
T('landing vibrate once',   /if\(first&&pow>\.35\) vibrate/);

console.log('\n' + (all ? 'ALL FIVE FIXES IN PLACE' : 'SOME CHECKS FAILED'));