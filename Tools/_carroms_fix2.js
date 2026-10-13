'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app/src/main/assets/games', 'carroms', 'index.html');
let s = fs.readFileSync(f, 'utf8');

/* `&amp;&amp;` is HTML-escaped source leaking into a <script> block. Inside a
   script the entity is not decoded - it is a hard syntax error. */
const before = (s.match(/&amp;/g) || []).length;
s = s.replace(/&amp;/g, '&');
console.log('OK   unescaped ' + before + ' &amp; occurrence(s)');

/* Locked themes: behind a real rewarded ad. Re-run with the real indentation. */
const from = "c.onclick=()=>{\r\n      if(locked){\r\n        unlockTheme(th.id);\r\n        applyTheme(th.id);\r\n        S('queen');Hap.win();\r\n        toast(th.name+' unlocked for '+UNLOCK_HOURS+' hours');\r\n      }else{";
const to =
  'c.onclick=()=>{\r\n' +
  '      if(locked){\r\n' +
  '        /* This handed the theme over for a single free tap. Unlocking now\r\n' +
  '           asks the shell for a rewarded ad and only continues on a real\r\n' +
  "           grant, so dismissing the offer leaves the theme locked. */\r\n" +
  '        var id=th.id,name=th.name;\r\n' +
  '        var give=function(){unlockTheme(id);applyTheme(id);S(\'queen\');Hap.win();\r\n' +
  "          toast(name+' unlocked for '+UNLOCK_HOURS+' hours');};\r\n" +
  '        if(window.__shellRewarded){window.__shellRewarded("carroms.theme."+id,give);}\r\n' +
  '        else{give();}\r\n' +
  '      }else{';
if (!s.includes(from)) console.log('MISS locked theme rewarded');
else { s = s.replace(from, to); console.log('OK   locked theme needs a rewarded ad'); }

fs.writeFileSync(f, s);
console.log('\nchecks:');
console.log('  amp clean :', !/&amp;/.test(s));
console.log('  rewarded  :', /carroms\.theme\./.test(s));
console.log('  back arrow:', /&&!sheet/.test(s));