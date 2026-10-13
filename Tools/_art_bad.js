'use strict';
const fs = require('fs');
const path = require('path');
const ART = path.join('sources', 'Shell Art');

['echo_tile_img.png', 'sheep_dog_tile_img.png', '8-Ball-Pool_tile_imag'].forEach(f => {
  const buf = fs.readFileSync(path.join(ART, f));
  console.log('=== ' + f + ' (' + (buf.length / 1024).toFixed(0) + ' KB) ===');
  console.log('  first 48 bytes hex : ' + buf.slice(0, 48).toString('hex').replace(/(.{16})/g, '$1 '));
  console.log('  first 48 bytes ascii: ' +
    buf.slice(0, 48).toString('latin1').replace(/[^\x20-\x7e]/g, '.'));
  // Look for an embedded known signature further in, in case it is a wrapper.
  const sigs = {
    png: [0x89, 0x50, 0x4E, 0x47], jpeg: [0xFF, 0xD8, 0xFF],
    psd: [0x38, 0x42, 0x50, 0x53], zip: [0x50, 0x4B, 0x03, 0x04],
    riff: [0x52, 0x49, 0x46, 0x46], gif: [0x47, 0x49, 0x46, 0x38],
  };
  for (const [name, sig] of Object.entries(sigs)) {
    const at = buf.indexOf(Buffer.from(sig));
    if (at >= 0) console.log('  contains ' + name + ' signature at offset ' + at);
  }
  console.log('');
});