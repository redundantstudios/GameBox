# Testing the ad system

The ad governor (`AdPolicy`) decides *when* an ad may show. This file is about
proving it does what you agreed. Per `AGENT.md` you are the tester - I do not
drive the app - so this exists so you know what to press and what a correct
result looks like.

---

## Before you start

**Use a debug build.** It uses Google's test ad units, so you get a real sample
ad every time. A release build uses the live units, which serve nothing to an
unauthorised phone - every ad would silently fail and you would be debugging
nothing. `DEPLOY.bat` already installs debug.

**Check the log.** This is your evidence, and I cannot get it for you:

```cmd
adb logcat -c
adb logcat -s AdPolicy NativeBridge AdMobManager
```

`AdPolicy` prints the reason for **every** decision:

| Log line | Meaning |
|---|---|
| `Rewarded denied by policy: CAP_REACHED` | Player has used all 5 this game |
| `Revive REFUSED: already used this game` | Second revive - correct, by design |
| `Rewarded suppressed: 43s of the 60s cooldown left` | Too soon after the last one |
| `Interstitial suppressed: 122s of the 180s gap left` | Too soon after the last one |
| `Interstitial REFUSED: app exit (AdMob policy)` | Correct - never an ad on exit |
| `Interstitial suppressed: user's first session` | Correct for a fresh install |
| `Interstitial shown (#1 this session)` | One shown - the cap is working |
| `Rewarded earned (revive): rewarded=1/5 revives=1` | A reward was granted |

---

## Test 1 - a rewarded ad works at all

1. Open **Root.io** (clearest ad UI). Play until you die.
2. Tap **Watch Ad to Continue**.
3. A Google test ad should appear. Watch to the end.

**Expect:** back in the game, alive, log shows
`Rewarded earned (revive): rewarded=1/5 revives=1`.

**If no ad appears and nothing happens at all** - that is the old bug (a request
dropped before it reaches the shell). Send me the log; do not work around it.

---

## Test 2 - the revive cap (your "one revive only" rule)

1. Fresh game, play, die, **revive** (watch the ad).
2. Keep playing, die again.

**Expect:** no revive button, or an explanation. Log shows
`Revive REFUSED: already used this game` and the game says *"You have used all
your ad rewards for now."* - a sentence, not a raw token. **A second death must
be a real loss.** If you can revive twice, tell me immediately; that is the most
important rule in the system.

> Reaching this naturally is slow (60s between rewarded ads). To go fast, exit
> and reopen the app first - a new game resets the per-game caps, so the whole
> sequence is ~2 minutes.

---

## Test 3 - the per-game rewarded cap (5)

Same game, keep taking rewards until the 6th attempt.

**Expect:** 5 succeed, the 6th is refused with *"all your ad rewards for now"*,
log shows `CAP_REACHED`. Then **open a different game** and the offer works
again - a fresh allowance per game, as you decided.

---

## Test 4 - the interstitial gap (180s)

1. Play a game, finish it, tap **Play Again**. An ad shows.
2. Immediately exit to the shell, open a *different* game, finish it, tap Play
   Again.

**Expect:** **no ad the second time**, log says
`Interstitial suppressed: Ns of the 180s gap left`. This proves the gap is
**app-wide** - the old system reset per screen, so bouncing between games used
to defeat it.

3. Wait out the 180s and try again - the ad should now show.

---

## Test 5 - the AdMob non-negotiables

These get an app **disabled** if broken, so they matter more than revenue:

- **Never an ad on app exit.** Finish a game, hit Back to the arcade, exit the
  app. No ad at any point.
- **Never back-to-back.** No sequence should show two interstitials in a row.
- **Never mid-play.** No ad while a round is live - only from a game-over or
  results screen.
- **No ad on the very first session.** Uninstall, reinstall, play a few games.
  **Expect zero interstitials all session** (`user's first session`). Open the
  app again tomorrow and they resume.

---

## Test 6 - offline (the important one)

1. Turn the network off (`adb shell svc wifi disable` or just switch it off).
2. Tap a rewarded offer.

**Expect:** a clear *"Check your internet connection"* dialog, the button
re-enabled, and **no reward granted** (`unavailable` in the log).

An ad that silently does nothing is the worst outcome, because the player
concludes the button is broken. If you see silence, that's a bug - report it.

---

## Test 7 - the two new offers

**Balloon Battle** (landscape): finish a bout. The results card should show an
orange **"WATCH AD - SPEED BOOST + SHIELD NEXT MATCH"** above PLAY AGAIN /
MENU. Watch the ad and the next bout starts with the shield and speed boost.
PLAY AGAIN and MENU must still work normally.

**Memory Grab**: finish a round. **"WATCH AD - BIGGER BOARD"** on the results
card. Watch the ad and the next round is the 24-card HARD board.

Neither is a "continue" button on purpose - neither game can be lost, so a
continue button would be a lie. Both boost the *next* round instead.

---

## What to send me

The **logcat output** plus three facts is enough: which game and what you
tapped, what you saw (nothing / message / ad played), and the `AdPolicy` +
`NativeBridge` lines from that moment.

```cmd
adb logcat -d -s AdPolicy NativeBridge AdMobManager
```

---

## Run everything: `Tools\CHECK_ALL.bat`

Run this before every build. It is verification only and never rewrites an asset.

```cmd
Tools\CHECK_ALL.bat
```

| Step | Tool | Catches |
|---|---|---|
| 1 | `_verify_integrated.js` | manifest, tile, back button, network calls |
| 2 | `_smoke_games.js` | **games that fail to boot** |
| 3 | `_ad_contract_check.js` | **rewards granted on a refusal** |
| 4 | `adtest\run.bat` | the ad caps themselves |

### Why step 2 exists: parsing is not booting

Two games shipped with a load-time `ReferenceError` while passing every syntax
check. The symptom in both cases was identical and deceptive: the menu drew
normally, because the menu is static HTML, over a dead canvas.

| Game | Cause | Visible as |
|---|---|---|
| root.io | `loadSave()` called `isUnlocked(s.sel)`, which reads the module-level `save` - still `undefined` because it is assigned by `save = loadSave()`. | menu over a black background |
| egg-rush | `checkOrient()` runs at load and read `state`, declared with `let` ~370 lines later. Temporal dead zone. | same; the game was unplayable |

The lesson generalises to load-order, not just `save`: **anything read during
load must be declared before the load path that reads it.** `_smoke_games.js`
executes each game's real script, runs the frame loop and opens its menus, so
this class of bug cannot reach a device again unnoticed.

`_smoke_games.js` reports honestly rather than guessing:

- `ok` - booted, ran frames, opened menus.
- `MANUAL` - does not terminate under the stub (currently `echo`, `ember`).
  Neither a pass nor a fail; these need a real device.
- `SKIP` - requests a WebGL context (`midnight-overdrive`). A GPU cannot be
  faked, so claiming a pass would be a fiction.

### The bridge arity trap (read this before adding a game)

**`addJavascriptInterface` matches by EXACT argument count. A short call THROWS; it does not default the missing arguments.** Kotlin default values do not help — they are not optional to the JavaScript bridge.

```kotlin
fun showRewardedAd(callback: String, placement: String?, kind: String?)  // 3
fun showInterstitial(callback: String, placement: String?)             // 2
```

```js
b.showRewardedAd(cb);            // THROWS - needs 3
b.showRewardedAd(cb, 'rootio', null);   // correct
b.showInterstitial(cb);          // THROWS - needs 2
b.showInterstitial(cb, '');      // correct
```

This shipped broken in **18 of 20** games for rewarded and **19 of 20** for interstitial. Combined, **no ad had ever been shown through the bridge in any game** — the governor, the caps and the policy were all correct and none of it was reachable.

It was invisible because every call sat inside `catch(_){ onFail('unavailable') }`, which turned "the call threw" into "no ad available", which reads exactly like a network problem. The log showed nothing at all.

**Rules for any new game:**

1. Always pass the full argument list. `kind=null` lets the bridge infer
   revive-vs-normal from the placement, so the once-per-game revive cap still
   applies.
2. Never let a `catch` report a bridge failure as a player-facing reason that
   means something else. There is a separate `bridge_error` token for it.
3. `_ad_contract_check.js` checks the arity of both methods against these
   signatures. It is part of `CHECK_ALL.bat` — run it.

### Reward: only `"granted"` may pay out

The bridge answers a rewarded request with exactly one of:

| Token | Meaning |
|---|---|
| `granted` | reward earned |
| `closed` | the player backed out |
| `unavailable` | no ad / offline |
| `limit_reached` | the once-per-game revive cap was hit |
| `cooldown` | 60s between rewarded ads |

Anything that treats a **refusal** as success hands out free value and quietly
defeats the cap. The shared shim did exactly that:

```js
if (result !== 'closed' && result !== 'unavailable') reward();  // WRONG
```

`limit_reached` and `cooldown` both passed that test, so hitting the cap granted
the reward anyway - in ten games, from one file. Two legacy games carried their
own copy of the same deny-list, and `checkers` had a looser variant that treated
a **null/empty** callback as granted.

All of them now gate on the explicit token, and every shim uses a **callback name
per request** (a single shared global let two overlapping requests race: the
first ad paid out the second action, and the overwritten request never settled).

The shape matters: a deny-list fails open, so any refusal token added later
silently becomes a payout. Keep it an allow-list.

### Known gap: half the catalogue has no integration entry

`Tools\_shell/games.js` defines only **10** of the 20 games. The other 10
(balloon-battle, bomb-relay, checkers, chess, chicken-chaos, egg-rush,
last-balloon, ludo, memory-grab, planetmerge) have no entry, so:

- they cannot be regenerated from `sources/`, and
- `_verify_integrated.js` never covered them - it only walks `games.js`.

They were fixed by hand-editing the asset, so **the source and the asset can now
drift**. When touching one of these ten, change both, and do not run
`_integrate_games.js` expecting it to pick the change up. Adding them to
`games.js` is the real fix, and should happen before more games land.

`adtest\run.bat` compiles the actual `AdPolicy.kt` that ships and checks every
cap, so a cap cannot pass while the shipped code is wrong. It also proves the
caps are *reachable* (that 5 rewards really can be earned) as well as that the
refusals fire - a suite that only checks refusals would happily pass a cap that
could never be hit.

