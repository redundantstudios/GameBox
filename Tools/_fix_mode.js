'use strict';
const fs = require('fs');
const F = 'app/src/main/java/com/redundantstudios/arcade/ui/ModeActivity.kt';
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
let L = fs.readFileSync(F, 'utf8').split(NL);

// 1. The earlier doc replacement left the original comment terminator behind,
//    so the comment ran on into the function signature.
{
  const i = L.findIndex((l, k) => l.trim() === '*/' && L[k + 1] && L[k + 1].trim().startsWith('@Suppress'));
  if (i < 0) { console.log('MISS orphan close'); process.exit(1); }
  L.splice(i, 1);
  console.log('OK   orphaned comment terminator removed');
}

// 2. NEW_GAME_IDS is a top-level property in the model package, not a member of
//    GameManifest. It has to be imported, exactly as GameAdapter does it.
{
  L = L.map(l => l.replace('{ if (it.id in GameManifest.NEW_GAME_IDS) 0 else 1 },',
                          '{ if (it.id in NEW_GAME_IDS) 0 else 1 },'));
  if (!L.some(l => l.indexOf('import com.redundantstudios.arcade.model.NEW_GAME_IDS') >= 0)) {
    const i = L.findIndex(l => l.indexOf('import com.redundantstudios.arcade.model.GameManifest') >= 0);
    L.splice(i + 1, 0, 'import com.redundantstudios.arcade.model.NEW_GAME_IDS');
    console.log('OK   NEW_GAME_IDS imported');
  }
  console.log('OK   reference unqualified');
}

fs.writeFileSync(F, L.join(NL));
console.log('\nverify:');
const out = fs.readFileSync(F, 'utf8');
console.log('  import present          :', out.includes('import com.redundantstudios.arcade.model.NEW_GAME_IDS'));
console.log('  unqualified reference   :', /it\.id in NEW_GAME_IDS/.test(out));
console.log('  no qualified leftover   :', !/GameManifest\.NEW_GAME_IDS/.test(out));
const dup = /\*\/\r?\n\s*\*\//.test(out);
console.log('  doubled comment close   :', dup);