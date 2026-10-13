'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app', 'src', 'main', 'assets', 'games', 'connect-four', 'index.html');
let s = fs.readFileSync(f, 'utf8');
const CRLF = s.includes('\r\n');

/* A previous repair joined the split lines with the BOOLEAN CRLF instead of the
   string '\r\n'. Array.prototype.join coerces the separator, and Boolean(true)
   becomes the literal text "true" - so every line break in the whole file was
   replaced by the word "true", e.g. "</script>truetrue<script>true(function(){".
   There is exactly one such token per line break and none are real code, so
   splitting on it restores the line structure verbatim. */
const tokens = s.split('true');
console.log('  "true" tokens found: ' + tokens.length + '  (restoring line breaks)');

/* Rebuild newlines: a line break is a token boundary. Preserve the file's own
   newline convention. */
const lines = [];
for (let i = 0; i < tokens.length; i++) lines.push(tokens[i]);
let out = lines.join(CRLF ? '\r\n' : '\n');

/* Guard: the first token must be the empty string (file starts with a newline
   produced by the previous join). If not, we would be corrupting real code. */
if (tokens[0] !== '') {
  console.log('  WARNING: first token is not empty - a genuine "true" may exist.');
}

fs.writeFileSync(f, out);
console.log('  lines now: ' + out.split(/\r?\n/).length);
console.log('  head: ' + JSON.stringify(out.slice(0, 70)));