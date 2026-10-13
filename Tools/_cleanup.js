'use strict';
const fs = require('fs');
const base = 'app/src/main/java/com/redundantstudios/arcade/';
const NL = f => fs.readFileSync(f, 'utf8').includes('\r\n') ? '\r\n' : '\n';

// 1. Drop the old fixed daily challenge post - the worker now sends one of the
//    ten rotating messages, so nothing calls this.
{
  const f = base + 'notifications/ArcadeNotifier.kt';
  let L = fs.readFileSync(f, 'utf8').split(NL(f));
  const i = L.findIndex(l => /fun postDailyChallenge\(/.test(l || ''));
  if (i < 0) { console.log('SKIP postDailyChallenge already gone'); }
  else {
    let end = i;
    while (end < L.length && L[end].trim() !== '    }') end++;
    // also swallow the doc comment directly above
    let start = i;
    while (start > 0 && !/\S/.test(L[start - 1])) start--;
    while (start > 0 && (L[start - 1].trim().startsWith('*') || L[start - 1].trim().startsWith('/**'))) start--;
    L.splice(start, end - start + 1);
    fs.writeFileSync(f, L.join(NL(f)));
    console.log('OK   removed dead postDailyChallenge');
  }
}

// 2. ReminderScheduler: drop the unused context params.
{
  const f = base + 'notifications/ReminderScheduler.kt';
  let L = fs.readFileSync(f, 'utf8').split(NL(f));
  let n = 0;
  for (let k = 0; k < L.length; k++) {
    const before = L[k];
    L[k] = L[k].replace('private fun scheduleUpdateCheck(context: Context, wm: WorkManager)',
                        'private fun scheduleUpdateCheck(wm: WorkManager)');
    L[k] = L[k].replace('scheduleUpdateCheck(context, wm)', 'scheduleUpdateCheck(wm)');
    L[k] = L[k].replace('private fun delayUntilSlot(context: Context): Long',
                        'private fun delayUntilSlot(): Long');
    L[k] = L[k].replace('.setInitialDelay(delayUntilSlot(context), TimeUnit.MILLISECONDS)',
                        '.setInitialDelay(delayUntilSlot(), TimeUnit.MILLISECONDS)');
    if (L[k] !== before) n++;
  }
  fs.writeFileSync(f, L.join(NL(f)));
  console.log('OK   ReminderScheduler: ' + n + ' signature/call cleanups');
}

// 3. UpdateCheckWorker: stop shadowing `context`.
{
  const f = base + 'updates/UpdateCheckWorker.kt';
  let L = fs.readFileSync(f, 'utf8').split(NL(f));
  let n = 0;
  for (let k = 0; k < L.length; k++) {
    const before = L[k];
    L[k] = L[k].replace('override fun onReceive(context: Context?, intent: android.content.Intent?) {\n        val context = context ?: return',
      'override fun onReceive(ctx: Context?, intent: android.content.Intent?) {\n        val context = ctx ?: return');
    if (L[k] !== before) n++;
  }
  fs.writeFileSync(f, L.join(NL(f)));
  console.log('OK   PackageReplacedReceiver: shadowing fixed (' + n + ')');
}