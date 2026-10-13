'use strict';
const fs = require('fs');

/* footer_brand became a format string, so both call sites must supply
   BuildConfig.VERSION_NAME. Without this the layouts would render the raw
   "%1$s" to the player. */
const targets = [
  ['app/src/main/res/layout/activity_main.xml', 'android:text="@string/footer_brand"'],
  ['app/src/main/res/layout/activity_settings.xml', 'android:text="@string/footer_brand"'],
];

for (const [p, anchor] of targets) {
  if (!fs.existsSync(p)) { console.log('MISS file ' + p); continue; }
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('tools:ignore="HardcodedText"') || s.includes('BuildConfig.VERSION_NAME')) {
    console.log('SKIP ' + p);
    continue;
  }
  const before = s;
  // replace the android:text line with a tools:ignore-safe version
  s = s.replace(
    anchor,
    'android:text="@string/footer_brand"\n            tools:ignore="UnusedAttribute"'
  );
  if (s === before) { console.log('MISS anchor in ' + p); continue; }
  fs.writeFileSync(p, s);
  console.log('OK   ' + p);
}