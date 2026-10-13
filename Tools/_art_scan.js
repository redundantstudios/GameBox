'use strict';
const fs = require('fs');
const path = require('path');

const ART = path.join('sources', 'Shell Art');

/* Android accepts these as drawable resource extensions. */
const OK_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

const files = fs.readdirSync(ART);

/* Sniff the real format from magic bytes - several files here have misleading or
   missing extensions ("8-Ball-Pool_tile_imag" has none at all). */
const sniff = buf => {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'png';
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'jpeg';
  if (buf.slice(0, 3).toString() === 'GIF') return 'gif';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  if (buf.slice(0, 2).toString() === 'BM') return 'bmp';
  return 'unknown(' + buf.slice(0, 4).toString('hex') + ')';
};

const dims = buf => {
  if (sniff(buf) === 'png') return buf.readUInt32BE(16) + 'x' + buf.readUInt32BE(20);
  if (sniff(buf) === 'jpeg') {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xFF) { i++; continue; }
      const m = buf[i + 1];
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
        return buf.readUInt16BE(i + 7) + 'x' + buf.readUInt16BE(i + 5);
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return '?';
};

console.log('=== sources/Shell Art ===');
files.sort().forEach(f => {
  const st = fs.statSync(path.join(ART, f));
  if (st.isDirectory()) { console.log('  [dir] ' + f); return; }
  const buf = fs.readFileSync(path.join(ART, f));
  const real = sniff(buf);
  const ext = path.extname(f).toLowerCase();
  const bad = ext && !OK_EXT.includes(ext);
  const noext = !ext;
  const flag = bad ? '  <-- extension not an Android drawable ext' :
             noext ? '  <-- NO extension' : '';
  console.log('  ' + f.padEnd(34) + real.padEnd(9) + dims(buf).padEnd(11) +
              (st.size / 1024).toFixed(0).padStart(6) + ' KB' + flag);
});