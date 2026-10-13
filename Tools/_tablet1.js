'use strict';
const fs = require('fs');
const NL = f => fs.readFileSync(f, 'utf8').includes('\r\n') ? '\r\n' : '\n';

/* ---- 1. MainActivity: mode grid follows the width ---- */
{
  const F = 'app/src/main/java/com/redundantstudios/arcade/MainActivity.kt';
  let s = fs.readFileSync(F, 'utf8');
  const from = '    modeRecyclerView.layoutManager = GridLayoutManager(this, 2)';
  const to = '    modeRecyclerView.layoutManager = GridLayoutManager(this, 2)\n' +
    '    // Two columns on a phone, more once there is room for them.\n' +
    '    ResponsiveGrid.apply(modeRecyclerView)';
  if (s.includes('ResponsiveGrid.apply')) console.log('SKIP  main grid already responsive');
  else if (!s.includes(from)) { console.log('MISS  main grid line'); process.exit(1); }
  else {
    s = s.replace(from, to);
    const imp = s.indexOf('import com.redundantstudios.arcade.ui.');
    if (imp < 0) { console.log('MISS  import anchor'); process.exit(1); }
    // already in the same package? ModeActivity is .ui, MainActivity is root
    s = s.slice(0, imp) + 'import com.redundantstudios.arcade.ui.ResponsiveGrid\n' + s.slice(imp);
    fs.writeFileSync(F, s);
    console.log('OK    MainActivity mode grid is responsive');
  }
}

/* ---- 2. ModeActivity: game grid follows the width ---- */
{
  const F = 'app/src/main/java/com/redundantstudios/arcade/ui/ModeActivity.kt';
  let s = fs.readFileSync(F, 'utf8');
  // the game grid is declared in XML with app:layoutManager; set it in code too
  const anchor = 'val filteredGames = when {';
  if (s.includes('ResponsiveGrid.apply')) console.log('SKIP  mode grid already responsive');
  else if (!s.includes(anchor)) { console.log('MISS  mode anchor'); process.exit(1); }
  else {
    s = s.replace(anchor,
      '        // Two columns on a phone, more once there is room for them.\n' +
      '        ResponsiveGrid.apply(findViewById(R.id.gamesRecyclerView))\n\n' +
      '        val filteredGames = when {');
    fs.writeFileSync(F, s);
    console.log('OK    ModeActivity game grid is responsive');
  }
}

/* ---- 3. cap the content column on a wide screen ----
   Without this the header, buttons and settings rows stretch edge to edge on a
   1200px tablet while the text stays phone sized, which reads as a mistake.
   A max-width container centred in the parent keeps the comfortable phone
   proportions and just centres them. */
{
  const F = 'app/src/main/res/values/dimens.xml';
  let d = '';
  if (fs.existsSync(F)) d = fs.readFileSync(F, 'utf8');
  const block =
    '<!-- Phone value: no cap, the screen is the column. -->\n' +
    '    <dimen name="content_max_width">0dp</dimen>\n';
  if (d.includes('content_max_width')) console.log('SKIP  dimens already there');
  else if (!d) {
    fs.writeFileSync(F,
      '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    ' + block + '</resources>\n');
    console.log('OK    dimens.xml created');
  } else {
    fs.writeFileSync(F, d.replace('</resources>', '    ' + block + '</resources>'));
    console.log('OK    content_max_width added to dimens.xml');
  }
}

/* sw600dp: cap the column so a tablet centres a phone-sized layout */
{
  const dir = 'app/src/main/res/values-sw600dp';
  if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); console.log('OK    values-sw600dp created'); }
  const F = dir + '/dimens.xml';
  if (fs.existsSync(F)) { console.log('SKIP  sw600dp dimens exists'); }
  else {
    fs.writeFileSync(F,
      '<?xml version="1.0" encoding="utf-8"?>\n' +
      '<resources>\n' +
      '    <!-- Tablet: hold the content to a comfortable reading column and centre\n' +
      '         it, rather than stretching every button across 1200px. -->\n' +
      '    <dimen name="content_max_width">640dp</dimen>\n' +
      '</resources>\n');
    console.log('OK    values-sw600dp/dimens.xml written');
  }
}