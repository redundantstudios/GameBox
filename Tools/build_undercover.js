#!/usr/bin/env node
/* Build / validate UnderCover's embedded word data.
 *
 * The JSON file is authoritative:
 *   sources/Playable Games/Undercover_Production_Curated_Pairs.json
 *
 * The game is a single offline HTML file, so the runtime data is embedded.
 * This script regenerates the embedded WORD_CATEGORIES block from the JSON,
 * then re-parses it and verifies that both are exactly equal.
 *
 * Usage:
 *   node Tools/build_undercover.js            regenerate the HTML data block
 *   node Tools/build_undercover.js --check    validate without writing
 *   node Tools/build_undercover.js --verbose  print every category
 *
 * Exit code is non-zero when validation fails or (with --check) the HTML is
 * out of sync. Run this before every build, and keep the JSON as the only
 * place word pairs are edited.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const JSON_FILE = path.join(ROOT, 'sources', 'Playable Games', 'Undercover_Production_Curated_Pairs.json');
const HTML_FILE = path.join(ROOT, 'sources', 'Playable Games', 'UnderCover.html');
const START = '/* WORD_CATEGORIES_START */';
const END = '/* WORD_CATEGORIES_END */';
const FREE_CATEGORY_COUNT = 3;

const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has('--check') || args.has('--verify');
const VERBOSE = args.has('--verbose') || args.has('-v');

const problems = [];
const warnings = [];
const fail = (msg) => problems.push(msg);
const warn = (msg) => warnings.push(msg);

const normWord = (s) => String(s).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const pairKey = (pair) => [normWord(pair[0]), normWord(pair[1])].sort().join('|');

function readJson() {
  let raw;
  try {
    raw = fs.readFileSync(JSON_FILE, 'utf8').replace(/^\uFEFF/, '');
  } catch (e) {
    throw new Error('Cannot read ' + JSON_FILE + ': ' + e.message);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error('Invalid JSON in ' + path.basename(JSON_FILE) + ': ' + e.message);
  }
  if (!Array.isArray(data)) throw new Error('Top level must be an array of categories.');
  return data;
}

function validate(data) {
  if (!data.length) fail('The database is empty.');

  const ids = new Set();
  const names = new Set();
  const pairsSeen = new Map();
  let pairTotal = 0;
  let freeCount = 0;

  data.forEach((cat, ci) => {
    const at = 'category[' + ci + ']';
    if (!cat || typeof cat !== 'object' || Array.isArray(cat)) {
      fail(at + ' is not an object.');
      return;
    }
    if (typeof cat.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cat.id)) {
      fail(at + '.id must be a lowercase slug (a-z, 0-9, single hyphens).');
    } else if (ids.has(cat.id)) {
      fail(at + '.id is duplicated: ' + cat.id);
    } else {
      ids.add(cat.id);
    }
    if (typeof cat.name !== 'string' || !cat.name.trim()) {
      fail(at + '.name must be a non-empty string.');
    } else if (names.has(cat.name)) {
      fail(at + '.name is duplicated: ' + cat.name);
    } else {
      names.add(cat.name);
    }
    if (typeof cat.free !== 'boolean') fail(at + '.free must be true or false.');
    if (cat.free) freeCount++;

    if (!Array.isArray(cat.pairs) || !cat.pairs.length) {
      fail(at + '.pairs must be a non-empty array.');
      return;
    }

    cat.pairs.forEach((pair, pi) => {
      const pat = at + '.pairs[' + pi + ']';
      if (!Array.isArray(pair) || pair.length !== 2) {
        fail(pat + ' must be a two-item array [civilian, imposter].');
        return;
      }
      if (typeof pair[0] !== 'string' || typeof pair[1] !== 'string') {
        fail(pat + ' must contain two strings.');
        return;
      }
      if (!pair[0].trim() || !pair[1].trim()) {
        fail(pat + ' contains a blank word.');
        return;
      }
      if (pair[0] !== pair[0].trim() || pair[1] !== pair[1].trim()) {
        fail(pat + ' has leading or trailing whitespace.');
      }
      if (normWord(pair[0]) === normWord(pair[1])) {
        fail(pat + ' uses the same word twice: ' + pair.join(' / '));
      }
      pairTotal++;
    });

    /* Duplicates are checked globally, not per category: the old database had
       the same comparison in two categories, and after merging they would be
       drawn twice. The key ignores case, punctuation and word order. */
    cat.pairs.forEach((pair) => {
      if (!Array.isArray(pair) || pair.length !== 2) return;
      if (typeof pair[0] !== 'string' || typeof pair[1] !== 'string') return;
      const key = pairKey(pair);
      if (pairsSeen.has(key)) {
        const prev = pairsSeen.get(key);
        fail('Duplicate pair "' + pair.join(' / ') + '" in ' + cat.name +
             ' (also in ' + prev.category + ' as "' + prev.pair.join(' / ') + '").');
      } else {
        pairsSeen.set(key, { category: cat.name, pair: pair.slice() });
      }
    });
  });

  if (freeCount !== FREE_CATEGORY_COUNT) {
    fail('Expected exactly ' + FREE_CATEGORY_COUNT + ' free categories, found ' + freeCount + '.');
  }
  if (!pairTotal) fail('No word pairs found.');

  /* Editorial guard: the free tier must stay universal. This is a warning,
     not a hard failure, so a deliberate future change is still possible. */
  const cultural = /(telugu|tollywood|indian|india|bollywood|cricket|festival|cinema|celebr)/i;
  data.filter(c => c.free).forEach(c => {
    if (typeof c.id === 'string' && cultural.test(c.id)) {
      warn('Free category "' + c.name + '" looks culture-specific; the free tier is meant to be universal.');
    }
  });

  return { pairTotal, freeCount };
}

function dataView(data) {
  return data.map(c => ({
    id: c.id,
    name: c.name,
    free: c.free === true,
    pairs: (c.pairs || []).map(p => [p[0], p[1]])
  }));
}

function renderBlock(data) {
  const lines = ['const WORD_CATEGORIES = ['];
  data.forEach((cat, ci) => {
    lines.push('  { id: ' + JSON.stringify(cat.id) + ', name: ' + JSON.stringify(cat.name) +
               ', free: ' + (cat.free ? 'true' : 'false') + ', pairs: [');
    cat.pairs.forEach((pair, pi) => {
      lines.push('    [' + JSON.stringify(pair[0]) + ', ' + JSON.stringify(pair[1]) + ']' +
                 (pi === cat.pairs.length - 1 ? '' : ','));
    });
    lines.push('  ] }' + (ci === data.length - 1 ? '' : ','));
  });
  lines.push('];');
  return lines.join('\n');
}

function extractBlock(html) {
  const start = html.indexOf(START);
  const end = html.indexOf(END);
  if (start < 0 || end < 0) throw new Error('Missing WORD_CATEGORIES_START/END markers in the HTML.');
  if (html.indexOf(START, start + 1) >= 0) throw new Error('More than one WORD_CATEGORIES_START marker.');
  if (html.indexOf(END, end + 1) >= 0) throw new Error('More than one WORD_CATEGORIES_END marker.');
  if (end < start) throw new Error('WORD_CATEGORIES_END appears before START.');
  return html.slice(start + START.length, end).trim();
}

function parseBlock(block) {
  const value = vm.runInNewContext(block + '\nWORD_CATEGORIES;', Object.create(null), { timeout: 5000 });
  if (!Array.isArray(value)) throw new Error('Embedded block did not evaluate to an array.');
  return value;
}

function diffSummary(expected, actual) {
  const out = [];
  if (expected.length !== actual.length) {
    out.push('category count: JSON ' + expected.length + ', HTML ' + actual.length);
  }
  const n = Math.max(expected.length, actual.length);
  for (let i = 0; i < n; i++) {
    const a = expected[i], b = actual[i];
    if (!a || !b) { out.push('category ' + i + ': missing on one side'); continue; }
    if (a.id !== b.id) out.push('category ' + i + ': id "' + a.id + '" vs "' + b.id + '"');
    if (a.name !== b.name) out.push('category ' + i + ': name "' + a.name + '" vs "' + b.name + '"');
    if (a.free !== b.free) out.push('category ' + i + ': free ' + a.free + ' vs ' + b.free);
    if (a.pairs.length !== b.pairs.length) {
      out.push('category ' + i + ' (' + a.name + '): pair count ' + a.pairs.length + ' vs ' + b.pairs.length);
      continue;
    }
    for (let j = 0; j < a.pairs.length; j++) {
      if (a.pairs[j][0] !== b.pairs[j][0] || a.pairs[j][1] !== b.pairs[j][1]) {
        out.push('category ' + i + ' (' + a.name + ') pair ' + j + ': "' +
                 a.pairs[j].join(' / ') + '" vs "' + b.pairs[j].join(' / ') + '"');
        break;
      }
    }
    if (out.length >= 20) { out.push('...'); break; }
  }
  return out;
}

function main() {
  const data = readJson();
  const { pairTotal, freeCount } = validate(data);

  if (!CHECK_ONLY) {
    const html = fs.readFileSync(HTML_FILE, 'utf8').replace(/^\uFEFF/, '');
    const eol = html.includes('\r\n') ? '\r\n' : '\n';
    const start = html.indexOf(START);
    const end = html.indexOf(END);
    if (start < 0 || end < 0) throw new Error('Missing WORD_CATEGORIES_START/END markers in the HTML.');
    const block = renderBlock(dataView(data)).replace(/\n/g, eol);
    const next = html.slice(0, start + START.length) + eol + block + eol + html.slice(end);
    fs.writeFileSync(HTML_FILE, next, 'utf8');
    console.log('Wrote ' + path.relative(ROOT, HTML_FILE));
  }

  const html = fs.readFileSync(HTML_FILE, 'utf8').replace(/^\uFEFF/, '');
  const embedded = parseBlock(extractBlock(html));
  const expected = dataView(data);
  const actual = dataView(embedded);
  const same = JSON.stringify(expected) === JSON.stringify(actual);
  if (!same) {
    fail('Embedded HTML data does not match the JSON.');
    diffSummary(expected, actual).forEach(d => console.log('  ' + d));
  }

  if (warnings.length) {
    console.log('\nWARNINGS');
    warnings.forEach(w => console.log('  - ' + w));
  }
  if (problems.length) {
    console.error('\nFAILED (' + problems.length + ' problem' + (problems.length === 1 ? '' : 's') + ')');
    problems.forEach(p => console.error('  - ' + p));
    process.exit(1);
  }

  console.log('\nOK  ' + data.length + ' categories, ' + pairTotal + ' pairs, ' +
              freeCount + ' free / ' + (data.length - freeCount) + ' locked');
  console.log('    JSON and embedded HTML data are identical.');

  if (VERBOSE) {
    console.log('');
    data.forEach(c => {
      console.log('  ' + (c.free ? 'FREE ' : 'LOCK ') + c.name + ' (' + c.id + ') - ' + c.pairs.length + ' pairs');
    });
  }
  console.log('\nFREE TIER');
  data.filter(c => c.free).forEach(c => console.log('  ' + c.name + ' - ' + c.pairs.length + ' pairs'));
  console.log('\nTotal free pairs: ' + data.filter(c => c.free).reduce((a, c) => a + c.pairs.length, 0));
}

try {
  main();
} catch (e) {
  console.error('ERROR: ' + e.message);
  process.exit(1);
}
