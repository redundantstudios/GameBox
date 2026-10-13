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

console.log('--- 1. landing lag ---');
T('vibrate once on first contact', /if\(first&&pow>\.35\) vibrate\(Math\.round\(8\+pow\*14\)\);/);
T('no per-bounce vibrate',         !/vibrate\(first\?Math\.round\(8\+pow\*14\):4\)/.test(s));
T('burst scaled on bounces',       /const nf=first\?1:\.32;/);
T('wood dust first-contact only',  /if\(first&&pow>\.55\)woodDust/);
T('ring first-contact only',       /if\(first\)ring\(X,Y,/);
T('3 bounces not 4',               /if\(sp>m\.minv&&m\.b<3\)\{/);

console.log('--- 2 / 7. home button + return to start ---');
T('home shows interstitial',       /shellAd\(function\(\)\{ goIntro\(\); \},'connectfour\.home'\)/);
T('home plays tap then ad',        /\$\('#btnHome'\)\.addEventListener\('click',\(\)=>\{\r?\n {3}SFX\.tap\(\);/);

console.log('--- 3. start back button ---');
T('wood gradient applied',   /radial-gradient\(circle at 35% 30%,#a97844,#7c5426 62%,#5a3a15\)/);
T('cream glyph on wood',     /border:1px solid #3a2410;color:#f3e2c2/);
T('plays game tap sound',    /themeShellBack[\s\S]{0,1400}try\{ SFX\.tap\(\); \}/);
T('wraps shell handler',     /var prev=b\.onclick;[\s\S]{0,200}if\(prev\)\{ prev\(ev\); return; \}/);
T('polls for the button',    /setInterval\(function\(\)\{\s*\n {2}var b=window\.__shellBackBtn;/);

console.log('--- 4. start-up animation ---');
T('skips intro bg when hidden', /if\(introEl\.classList\.contains\('off'\)\)return;/);
T('caches by size',             /const key=vw\+"x"\+vh\+"@"\+dpr;[\s\S]{0,80}if\(key===_introBGKey\)return;/);
T('JPEG not PNG encode',        /toDataURL\('image\/jpeg',0\.9\)/);
T('no PNG encode for intro bg', !/introEl\.style\.backgroundImage='url\('\+cn\.toDataURL\('image\/png'\)/.test(s));

console.log('--- 5. win: panel then ad ---');
T('win shows panel first',   /showPlaque\(m\.p\);\r?\n\s*setTimeout\(function\(\)\{ shellAd\(function\(\)\{\},'connectfour\.over\.win'\)/);
T('draw shows panel first',  /showPlaque\(0\);\r?\n\s*setTimeout\(function\(\)\{ shellAd\(function\(\)\{\},'connectfour\.over\.draw'\)/);
T('no ad wrapping the panel', !/shellAd\(function\(\)\{ setTimeout\(function\(\)\{ if\(seq===S\.seq\) showPlaque/.test(s));

console.log('--- 6. drop sound ---');
T('launch rewritten',   /launch\(pan\)\{\r?\n\s*const p=pan\|\|0;/);
T('quieter sweep',      /noise\(\{fc:760,fe:1900,dur:\.055,vol:\.032/);
T('body tone added',    /tone\(\{f:210,f2:135,dur:\.05,vol:\.028/);
T('harsh tick removed', /noise\(\{fc:5200,dur:\.018,vol:\.05\*vol/);
T('no 6.8k scratch',    !/fc:6800/.test(s));

console.log('--- integrity ---');
T('no stray true tokens', !/true\s*\(function\(\)/.test(s));
T('doctype intact',       /^<!DOCTYPE html>\r?\n<!--\r?\nSTUDIO_GAME_MANIFEST/.test(s));
T('settings push kept',   /window\.Game\.setSettings\(settings\)/);

console.log('\n' + (all ? 'ALL CONNECT FOUR ISSUE FIXES IN PLACE' : 'SOME CHECKS FAILED'));