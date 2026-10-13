'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/mimic/index.html';
const raw = fs.readFileSync(f, 'utf8');
const EOL = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);

const i = lines.findIndex(l => /\+' vol='\+settings\.volume/.test(l));
if (i < 0) { console.log('MISS'); process.exit(1); }
console.log('before:', lines[i].trim().slice(0, 96));
lines[i] = lines[i].replace(/\+' vol='\+settings\.volume/, "+' vol='+vol");
console.log('after :', lines[i].trim().slice(0, 96));
fs.writeFileSync(f, lines.join(EOL));

/* Nothing outside BLOCK 2 may touch the private name. */
const after = fs.readFileSync(f, 'utf8');
const blk = after.split('<script>');
const leaked = (blk[3] || '').match(/(^|[^\w.$'"])settings\s*[.=,)]/g) || [];
console.log('bare refs in BLOCK 3:', leaked.length);