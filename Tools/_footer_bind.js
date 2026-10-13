'use strict';
const fs = require('fs');

/* footer_brand is now "Redundant Studios - v%1$s". A layout cannot pass a
   format argument, so both activities set the text in code. Binding it to
   BuildConfig.VERSION_NAME also means the footer can never claim a version
   the package does not carry - which is exactly the drift that had it reading
   "v1.0" inside a 1.1.0 build. */

const MAIN = 'app/src/main/java/com/redundantstudios/arcade/MainActivity.kt';
const SET = 'app/src/main/java/com/redundantstudios/arcade/SettingsActivity.kt';

const BIND = [
  '        /* Footer reads the real package version, not a hardcoded string. */',
  '        findViewById<TextView>(R.id.footer)?.let {',
  '            it.text = getString(R.string.footer_brand, BuildConfig.VERSION_NAME)',
  '        }',
];

// --- MainActivity -------------------------------------------------------
{
  let s = fs.readFileSync(MAIN, 'utf8');
  if (s.includes('R.id.footer')) { console.log('SKIP main footer'); }
  else {
    const i = s.indexOf('        updateCoordinator?.onHomeReady()');
    if (i < 0) { console.log('MISS main anchor'); process.exit(1); }
    s = s.slice(0, i) + BIND.join('\n') + '\n\n' + s.slice(i);
    if (!/^import com\.redundantstudios\.arcade\.BuildConfig$/m.test(s)) {
      const imp = s.indexOf('import com.redundantstudios.arcade.');
      s = s.slice(0, imp) + 'import com.redundantstudios.arcade.BuildConfig\n' + s.slice(imp);
    }
    if (!/^import android\.widget\.TextView$/m.test(s)) {
      s = 'import android.widget.TextView\n' + s;
    }
    fs.writeFileSync(MAIN, s);
    console.log('OK   MainActivity binds the footer');
  }
}

// --- SettingsActivity ---------------------------------------------------
{
  let s = fs.readFileSync(SET, 'utf8');
  if (s.includes('R.id.footer')) { console.log('SKIP settings footer'); }
  else {
    const i = s.indexOf('        setContentView(R.layout.activity_settings)');
    if (i < 0) { console.log('MISS settings anchor'); process.exit(1); }
    const at = i + '        setContentView(R.layout.activity_settings)'.length;
    s = s.slice(0, at) + '\n\n' + BIND.join('\n') + s.slice(at);
    if (!/^import com\.redundantstudios\.arcade\.BuildConfig$/m.test(s)) {
      const imp = s.lastIndexOf('import com.redundantstudios.arcade.');
      s = s.slice(0, imp) + 'import com.redundantstudios.arcade.BuildConfig\n' + s.slice(imp);
    }
    if (!/^import android\.widget\.TextView$/m.test(s)) {
      s = 'import android.widget.TextView\n' + s;
    }
    fs.writeFileSync(SET, s);
    console.log('OK   SettingsActivity binds the footer');
  }
}

// --- strip the layout default so nothing renders a bare "%1$s" ----------
for (const p of ['app/src/main/res/layout/activity_main.xml', 'app/src/main/res/layout/activity_settings.xml']) {
  let s = fs.readFileSync(p, 'utf8');
  if (!s.includes('android:text="@string/footer_brand"')) continue;
  s = s.replace(/\n\s*android:text="@string\/footer_brand"/, '');
  fs.writeFileSync(p, s);
  console.log('OK   removed hardcoded text from ' + p.split('/').pop());
}