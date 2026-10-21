'use strict';
/* Which AdMob ids are actually inside the shipped bundle?
   Reads the AAB, pulls the dex files, and searches the real bytes. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const AAB = 'app-release.aab';
const TMP = path.join(process.env.TEMP, 'aabscan');
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

console.log('scanning ' + AAB + ' (' + fs.statSync(AAB).size + ' bytes)');

const adb = process.env.ADBDIR;
const list = execFileSync('powershell', ['-NoProfile', '-Command',
  `Add-Type -AssemblyName System.IO.Compression.FileSystem;
   $z=[System.IO.Compression.ZipFile]::OpenRead((Resolve-Path '${AAB}'));
   $z.Entries | ForEach-Object { $_.FullName };
   $z.Dispose()`], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);

const dex = list.filter(f => /classes\d*\.dex$/.test(f));
console.log('dex files: ' + dex.length);

let found = [];
for (const d of dex) {
  const out = path.join(TMP, path.basename(d));
  execFileSync('powershell', ['-NoProfile', '-Command',
    `Add-Type -AssemblyName System.IO.Compression.FileSystem;
     $z=[System.IO.Compression.ZipFile]::OpenRead((Resolve-Path '${AAB}'));
     $e=$z.Entries | Where-Object { $_.FullName -eq '${d}' };
     [System.IO.Compression.ZipFileExtensions]::ExtractToFile($e,'${out}',$true);
     $z.Dispose()`]);
  const buf = fs.readFileSync(out).toString('latin1');
  const re = /ca-app-pub-\d{9,20}\/\d{5,20}/g;
  const ids = buf.match(re) || [];
  found = found.concat(ids);
}

const uniq = [...new Set(found)].sort();
console.log('\nAdMob ids found inside the shipped dex:');
if (!uniq.length) console.log('  (none - the units are read from AdMobManager via BuildConfig)');
uniq.forEach(id => {
  const app = id.split('/')[0];
  const isTest = app.includes('3940256099942544');
  console.log('  ' + id + (isTest ? '   <-- GOOGLE TEST ID' : '   (live app)'));
});