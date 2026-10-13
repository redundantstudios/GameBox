'use strict';
const fs = require('fs');
const path = require('path');
const NL = f => fs.readFileSync(f, 'utf8').includes('\r\n') ? '\r\n' : '\n';

/* ============ 1. system back is ignored inside a game ============ */
{
  const F = 'app/src/main/java/com/redundantstudios/arcade/GameActivity.kt';
  const L = fs.readFileSync(F, 'utf8').split(NL(F));

  const old = '    override fun onBackPressed() {\n        exitGame()\n    }';
  const i = L.findIndex(l => l.trim() === 'override fun onBackPressed() {');
  if (i < 0) { console.log('MISS onBackPressed'); process.exit(1); }
  const end = (() => { let d = 0, s = false; for (let k = i; k < L.length; k++) { for (const c of L[k]) { if (c === '{') { d++; s = true; } else if (c === '}') { d--; if (s && d === 0) return k; } } } return -1; })();

  L.splice(i, end - i + 1,
    '    /**',
    '     * Back is disabled while a game is on screen.',
    '     *',
    '     * The director asked for this so a player cannot drop out of a game by',
    '     * reflex mid-turn - they are meant to leave through the in-game pause',
    '     * menu like everything else. The in-game back button (NativeBridge',
    '     * .exitGame) is untouched, so every game still has a way out.',
    '     *',
    '     * NOT a dead end, though: a broken or half-loaded game could fail to show',
    '     * that menu and strand someone with no way home. So the first two presses',
    '     * are swallowed with a hint, and a third within a couple of seconds',
    '     * always gets out. A trap is worse than a reflex.',
    '     */',
    '    private var backPressCount = 0',
    '    private var lastBackPressAt = 0L',
    '',
    '    private fun installBackBlock() {',
    '        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {',
    '            override fun handleOnBackPressed() = onSystemBackPressed()',
    '        })',
    '    }',
    '',
    '    private fun onSystemBackPressed() {',
    '        val now = android.os.SystemClock.elapsedRealtime()',
    '        // a press more than 2.5s after the last one restarts the count',
    '        backPressCount = if (now - lastBackPressAt > 2500) 1 else backPressCount + 1',
    '        lastBackPressAt = now',
    '        if (backPressCount >= 3) {',
    '            exitGame()',
    '            return',
    '        }',
    '        try {',
    '            android.widget.Toast.makeText(this, R.string.game_back_hint, android.widget.Toast.LENGTH_SHORT).show()',
    '        } catch (_: Throwable) {',
    '            // never let a hint crash a game',
    '        }',
    '    }');
  console.log('OK   onBackPressed replaced with a blocking callback');

  // install it in onCreate
  const c = L.findIndex(l => l.indexOf('addJavascriptInterface(NativeBridge(this@GameActivity)') >= 0);
  if (c < 0) { console.log('MISS onCreate anchor'); process.exit(1); }
  L.splice(c + 1, 0, '        installBackBlock()');
  console.log('OK   installBackBlock() called in onCreate');

  // import
  if (!L.some(l => l.indexOf('import androidx.activity.OnBackPressedCallback') >= 0)) {
    const imp = L.findIndex(l => /^import androidx\./.test(l || ''));
    L.splice(imp, 0, 'import androidx.activity.OnBackPressedCallback');
    console.log('OK   OnBackPressedCallback imported');
  }

  fs.writeFileSync(F, L.join(NL(F)));
}

/* ============ 2. the string it shows ============ */
{
  const F = 'app/src/main/res/values/strings.xml';
  let s = fs.readFileSync(F, 'utf8');
  if (s.includes('game_back_hint')) { console.log('SKIP string already there'); }
  else {
    s = s.replace('</resources>',
      '    <!-- Shown when someone presses system back inside a game. They are meant\n' +
      '         to leave through the in-game menu, but are never trapped. -->\n' +
      '    <string name="game_back_hint">Use the menu to leave the game</string>\n\n</resources>');
    fs.writeFileSync(F, s);
    console.log('OK   game_back_hint added');
  }
}

/* ============ 3. NEW games to the top of an N PLAYERS page ============ */
{
  const F = 'app/src/main/java/com/redundantstudios/arcade/ui/ModeActivity.kt';
  const L = fs.readFileSync(F, 'utf8').split(NL(F));

  const i = L.findIndex(l => l.indexOf('fun orderForPage(') >= 0);
  if (i < 0) { console.log('MISS orderForPage'); process.exit(1); }
  const cmp = L.findIndex((l, k) => k > i && l.indexOf('return games.sortedWith(') >= 0);
  if (cmp < 0) { console.log('MISS sortedWith'); process.exit(1); }

  const key = L.findIndex((l, k) => k > cmp && l.indexOf('{ groupFor(it) },') >= 0);
  if (key < 0) { console.log('MISS groupFor key'); process.exit(1); }

  L.splice(key, 1,
    '                    /* NEW games pin to the very top of the page, ahead of the',
    '                       maxPlayers grouping below. The director asked for new',
    '                       first, then everything else. */',
    '                    { if (it.id in GameManifest.NEW_GAME_IDS) 0 else 1 },',
    '                    { groupFor(it) },');

  // refresh the doc comment above the function
  const doc = L.findIndex((l, k) => k < i && l.indexOf('* Order an N PLAYER page:') >= 0);
  if (doc >= 0) {
    L.splice(doc, 3,
      '         * Order an N PLAYER page: games in the NEW cohort first, then the',
      '         * tightest-fitting games, then the ones that stretch to more people,',
      '         * and within each group the newest first, then A-Z.',
      '         */');
    console.log('OK   doc comment updated');
  }

  fs.writeFileSync(F, L.join(NL(F)));
  console.log('OK   NEW cohort pinned to the top of N PLAYERS pages');
}