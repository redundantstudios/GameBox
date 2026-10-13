'use strict';
const fs = require('fs');
const P = 'app/src/main/java/com/redundantstudios/arcade/notifications/ArcadeNotifier.kt';
const NL = fs.readFileSync(P, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const L = fs.readFileSync(P, 'utf8').split(NL);

/** Find the index of the line that closes the `fun` starting at `from`, by
 *  counting braces. The previous attempt matched on indentation and ran to
 *  EOF, truncating the file - never do that again. */
function closeOfFun(from) {
  let d = 0, started = false;
  for (let k = from; k < L.length; k++) {
    for (const ch of L[k]) {
      if (ch === '{') { d++; started = true; }
      else if (ch === '}') { d--; if (started && d === 0) return k; }
    }
  }
  return -1;
}

const has = t => L.some(l => (l || '').includes(t));

/* ---- 1. replace the fixed daily challenge with the ten-message rotation ---- */
{
  const i = L.findIndex(l => /fun postDailyChallenge\(/.test(l || ''));
  if (i < 0) { console.log('MISS postDailyChallenge'); process.exit(1); }
  const end = closeOfFun(i);
  if (end < 0) { console.log('MISS close'); process.exit(1); }
  console.log('   replacing lines ' + (i + 1) + '-' + (end + 1));

  // swallow the doc comment above it
  let start = i;
  while (start > 0 && /^\s*(\*|\/\*\*)/.test(L[start - 1])) start--;

  L.splice(start, end - start + 1,
    '    /**',
    '     * The daily nudge. One of [DailyMessages]\' ten variants, chosen at random',
    '     * once per day and stored, so a retried worker cannot reshuffle the text',
    '     * mid-day and never repeats yesterday\'s pick.',
    '     *',
    '     * Replaces the old fixed "today\'s <game> challenge" card, which named a',
    '     * game the player may not have opened in months.',
    '     */',
    '    fun postDailyNudge(context: Context) {',
    '        val msg = DailyMessages.today(SettingsManager.todayDailyMessageIndex(DailyMessages.all.size))',
    '        post(context, NotificationChannels.CH_DAILY, msg.title, msg.body, msg.route)',
    '        SettingsManager.lastNotifDay = SettingsManager.today()',
    '    }');
  console.log('OK   daily rotation replaces the fixed challenge');
}

/* ---- 2. update notifications ---- */
if (!has('fun postUpdateAvailable')) {
  const i = L.findIndex(l => /^object ArcadeNotifier \{/.test((l || '').trim()));
  if (i < 0) { console.log('MISS object'); process.exit(1); }
  L.splice(i + 1, 0,
    '',
    '    // ------------------------------------------------------------------',
    '    // App updates',
    '    // ------------------------------------------------------------------',
    '',
    '    /**',
    '     * "A quick update is ready". Deliberately the same promises as the in-app',
    '     * dialog: new games are coming, Play downloads in the background, and the',
    '     * app restarts once to finish. Deduped per offered versionCode so a',
    '     * six-hourly check cannot turn into a repeated nudge.',
    '     */',
    '    fun postUpdateAvailable(context: Context, force: Boolean = false) {',
    '        if (!force && SettingsManager.updateNotifiedVersion != 0) return',
    '        post(',
    '            context,',
    '            NotificationChannels.CH_UPDATE,',
    '            context.getString(com.redundantstudios.arcade.R.string.notif_update_title),',
    '            context.getString(com.redundantstudios.arcade.R.string.notif_update_body),',
    '            "home"',
    '        )',
    '    }',
    '',
    '    fun postUpdateComplete(context: Context) {',
    '        post(',
    '            context,',
    '            NotificationChannels.CH_UPDATE,',
    '            context.getString(com.redundantstudios.arcade.R.string.notif_update_done_title),',
    '            context.getString(com.redundantstudios.arcade.R.string.notif_update_done_body),',
    '            "home"',
    '        )',
    '    }');
  console.log('OK   update notifications added');
} else console.log('SKIP update notifications already there');

fs.writeFileSync(P, L.join(NL));
const out = fs.readFileSync(P, 'utf8');
console.log('\nverify:');
console.log('  lines      :', out.split(NL).length);
console.log('  post kept  :', /private fun post\(/.test(out));
console.log('  streak kept:', /fun postStreakSave/.test(out));
console.log('  news kept  :', /fun postNews/.test(out));
console.log('  dev kept   :', /fun postDevTest/.test(out));
console.log('  nudge      :', /fun postDailyNudge/.test(out));
console.log('  challenge gone:', !/postDailyChallenge/.test(out));