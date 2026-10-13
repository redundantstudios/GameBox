'use strict';
const fs = require('fs');
const path = require('path');
const s = fs.readFileSync(
  path.join('app', 'src', 'main', 'assets', 'games', 'knot-away', 'index.html'), 'utf8');

let all = true;
const T = (label, re) => {
  const ok = re instanceof RegExp ? re.test(s) : !!re;
  if (!ok) all = false;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label);
};

/* Only look INSIDE script blocks - `&amp;` in markup is a legitimate entity
   (the game has <h3>UNDO &amp; HINT</h3>) and was never a problem. The bug this
   guard exists for is HTML-escaped text leaking into executable JS. */
const scripts = [...s.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)]
  .map(m => m[1]).join('\n');
T('no &amp; inside script blocks', !/&amp;/.test(scripts));

console.log('--- 1. BGM at boot ---');
T('graph + music at boot', /try\{ if\(AudioSys\.unlock\(\)&&save\.settings\.music\)AudioSys\.startMusic\(\); \}catch\(e\)\{\}/);
T('pointerdown retry kept', /document\.addEventListener\('pointerdown',\(\)=>\{/);
T('not stuck in a callback', !/showScreen\('home'\);\s*\r?\n\s*setTimeout\(function\(\)\{ try\{ unlock\(\)/.test(s));

console.log('--- 2. themed back button ---');
T('parchment gradient', /radial-gradient\(circle at 35% 28%,#FFF6E2,#EFDFBC 58%,#D8C096\)/);
T('chevron centred', /align-items:center;justify-content:center/);
T('plays game tap', /try\{ AudioSys\.sfx\('click'\); \}/);
T('still exits', /if\(prevBtn\)\{ prevBtn\(ev\); return; \}/);

console.log('--- 3/4. persistent kit ---');
T('kit helper', /const KIT_START=2;/);
T('seeded at 2', /if\(typeof save\.undo!=='number'\)save\.undo=KIT_START;/);
T('stored in save', /if\(kind==='undo'\)save\.undo\+=n; else save\.hint\+=n;/);
T('not per-run', /undoLeft:0,hintLeft:0,kitGranted:true/);
T('re-seeded per level', /G\.undoLeft=save\.undo; G\.hintLeft=save\.hint;/);
T('undo use persists', /G\.undoLeft--;save\.undo=Math\.max\(0,save\.undo-1\);persist\(\);/);
T('hint use persists', /G\.hintLeft--;save\.hint=Math\.max\(0,save\.hint-1\);persist\(\);/);
T('reward persists', /G\.undoLeft\+\+;giveKit\('undo',1\);/);

console.log('--- 5. back button only on start page ---');
T('class driven', /classList\.toggle\('on',onHome\)/);
T('only when changed', /if\(onHome!==window\.__shellBackBtn\.__wasHome\)/);

console.log('--- 6. pause sheet survives home ---');
T('showScreen closes sheets', s.indexOf("if(name!=='game'){ try{ closePanels(); }catch(e){} }") >= 0);

console.log('--- integrity ---');
T('no stray code at top', /^<!DOCTYPE html>\r?\n<!--\r?\nSTUDIO_GAME_MANIFEST/.test(s));

console.log('\n' + (all ? 'ALL KNOT AWAY CHECKS PASS' : 'SOME CHECKS FAILED'));