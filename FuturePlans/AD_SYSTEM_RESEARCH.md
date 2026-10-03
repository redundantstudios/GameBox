# Ad System Research — a balanced policy for Shell

Written before implementing anything, so the rules are decided first and the
code follows them. Sources are AdMob's own policy pages and ironSource/Unity
monetization guidance; the numbers quoted are the ones those sources state.

---

## 1. What the sources actually say

### Hard rules (AdMob policy — violation risks account action)

These are not "best practice", they are pass/fail:

- **No interstitial at app load or app exit.** *"Do not place interstitial ads
  on app load and when exiting apps as interstitials should only be placed in
  between pages of app content."* For app-open, AdMob recommends the **app open
  ad** format, not an interstitial.
- **No interstitial back-to-back.** *"Placing an interstitial ad immediately
  after another interstitial ad was shown to and closed by the user."*
- **No interstitial after every action.** *"You should place no more than one
  interstitial ad after every two user actions within your app. Please note that
  this requirement also applies when a user clicks the Back button."*
- **No surprise launches.** Interstitials only at *"logical breaks in between
  your app's content"* — not while a user is focused on a task. They explicitly
  warn about the latency trap: an ad intended for a page break can appear *after*
  the next page has loaded. The fix they prescribe is **pre-loading**, which is
  exactly what `AdMobManager` already does.
- **Never incentivise clicking.** *"Phrases such as 'click the ads' or similar
  language are not allowed."*
- **Rewarded must be opt-in and the reward must actually arrive.** A rewarded
  view only counts once the user reaches the end; skipping must not pay out.

### Soft guidance (ironSource / Unity, monetization practice)

- Tolerance is genre-dependent: hyper-casual users *expect* frequent ads;
  RPG/strategy users tolerate far less. Shell is **casual/hyper-casual**, which
  sits at the higher end of tolerance — but Shell is also a *party* app
  (pass-the-phone), which pushes the other way, because an ad interrupts
  several people at once.
- Reward ads: a commonly cited target is **3–5 per session**.
- Three levers to test independently: **capping** (how many per session),
  **pacing** (interval between them), **placement** (where + what reward).
- Test one lever at a time, ~2 weeks, watch **impressions, D1 retention, ARPU**.
  If frequency goes up and D1 drops without enough ARPU gain, back it off.
- **Segment.** Ad "whales" (heavy rewarded viewers) and payers should get
  *fewer or no* interstitials — they're your highest-LTV users and the most
  likely to churn from a forced ad.

---

## 2. What Shell does today (measured, not assumed)

I counted the ad call sites in all 20 games:

| | games |
|---|---|
| Rewarded wired | 15 |
| Interstitial wired | 16 |
| **No ads at all** | **balloon-battle, egg-rush, last-balloon** |

The real problem is not "which numbers to pick" — it's that **each game
implements its own policy in its own HTML**. Root.io's rule was "every 4th
retry"; Ember has 3 interstitial sites; Sheepdog has 3; Pool-8Ball has 3. There
is no shared rule, so:

- Two games can show a player an ad every 15 seconds in one and every 5 minutes
  in another, with no way to express "one ad per 3 minutes *across the app*".
- A per-game counter can't see what the previous game did.
- Fixing Magnet Pull means editing game HTML again, and the next game repeats it.

**Conclusion: the policy has to live in the shell, not in the games.** The
bridge already exists (`Studio.ads.rewarded/interstitial`); what's missing is a
governor in front of it.

---

## 3. Proposed policy

### The one-line version
Rewarded ads are **always opt-in and always the player's choice** — the shell
never forces one. Interstitials are **app-wide frequency-capped, never at app

### Rewarded rules (enforced in the shell)

- **Never forced.** The shell only ever shows one in response to a tap.
- **Never on app open or exit** — rewarded on exit is a policy violation and
  reads as a trap.
- **Session cap 5**, then the offer buttons are hidden with an honest message
  ("You've used all your ad rewards for now") rather than silently doing nothing.
- **Cooldown 60 s** between rewarded ads, to protect against a mash-tap loop.
- **Rate-limited by reward value**, not just count: the expensive rewards
  (revive, unlock) are capped tighter than cheap ones. Otherwise a player
  revives 5 times and the game has no failure state left.

### What the shell must do that it can't do today

1. **One global ad clock** in `AdMobManager`, persisted, shared across games.
2. **Ignore the game's ad frequency entirely.** The game asks *whether* it may
   show an ad; the shell decides *when*. Today the game's `every 4th retry`
   counter and the shell's 30 s pending-timeout are the only limits, and they
   don't see each other.
3. **Never leave a game hanging.** If the shell suppresses an ad, it must still
   answer the JS callback (`unavailable`), so the game can say why. This is
   already the right pattern in `runAdOrExplainOffline` and must be reused
   rather than re-invented per game.
4. **A visible "why not" only for rewarded** (player-initiated, so silence looks
   broken). Interstitials fail **silently** — a suppressed interstitial must
   never nag.

### Economy guardrail (the part people skip)

Capping the *count* of rewarded ads is not enough; cap the *value*. A revive
every 2 minutes turns a skill game into a slot machine. Rule of thumb: **an
ad-earned reward should be worth less than ~10–15% of what the same reward costs
in normal play.** This is why the cap on expensive rewards should be stricter —
and it's the number to revisit once `FuturePlans/COINS_ECONOMY_PLAN.md` lands,
since coins make ad-vs-earn balancing measurable instead of guessed.

### Banners

Not off **for good** - the director has decided they return, but **per game, not
app-wide**: on titles where a bottom strip will not eat the playfield (planet
merge, chess, checkers were the examples). They are still disabled everywhere
today; see section 5. The reason for not switching them on globally is that with
20 short-form games a strip takes space the game genuinely needs, and whether a
game can afford one is a per-game judgement.

---

## 4. Metrics to watch after shipping

Without these, the numbers above are just opinions:

- Rewarded opt-in rate per placement (a low rate means the reward is worthless)
- Rewarded completion rate (target 70–90%)
- Interstitials per session per user
- **D1 retention** — the guardrail. If it moves down, back the cap off
- ARPU per DAU
- Rewarded usage split across players ("whales" vs everyone else), to inform
  the segmentation ironSource recommends

---

## 5. Decided (director, 2026-09-30)

| Question | Decision |
|---|---|
| Interstitial gap | **180s** - confirmed sufficient |
| Rewarded cap | **per game**, not per session |
| Revives | **one per game** - a second death is a loss |
| "Reduce ads" tier | planned, not ready yet; lives with the coins economy |
| Banners | **returning, but per game, not app-wide** |

### Banners are coming back - and this doc was wrong that they were simply off

The director's call: banners return on SPECIFIC games where a bottom strip will
not eat the playfield - planet merge, chess and checkers were the examples. Not
app-wide: with 20 short-form games, a strip on a game whose whole screen is the
board takes space the game needs.

Nothing is implemented yet. Banners are still a no-op everywhere, and the shim
comment in all 10 modern games records the decision so it is not re-litigated.
Turning one on means, per game: a manifest flag, the unit and strip restored in
AdMobManager/GameActivity, and `Studio.ads.banner()` calling through. Pick the
game first - the strip costs vertical space, and whether a game can afford it is
a per-game judgement, not a shell-wide setting.

---

## 6. What was built

`AdPolicy` (app/src/main/java/com/redundantstudios/arcade/ads/AdPolicy.kt) is the
governor, and it lives in **`NativeBridge`** - the single funnel every ad in the
app passes through. That placement is the whole point: ten games call
`Studio.ads.rewarded(...)` and ten older ones call `showRewardedAd(callback)`
directly, so a rule enforced in either of those places would only cover half the
catalogue. Games now ask *whether* they may show an ad; the shell decides *when*.

| Rule | Value | Where it bites |
|---|---|---|
| Rewarded cap | 5 per game | `checkRewarded` |
| Revive cap | 1 per game | `checkRewarded`, `RewardKind.REVIVE` |
| Rewarded cooldown | 60s | `checkRewarded` |
| Interstitial gap | 180s, app-wide | `checkInterstitial` |
| Interstitials per session | 1 | `checkInterstitial` |
| Interstitial on app exit | never | `checkInterstitial`, AdMob policy |
| Interstitials on a first session | never | `checkInterstitial` |

Two tiers, deliberately different:

- **Rewarded is player-initiated**, so a refusal is answered with a REASON
  (`limit_reached`, `cooldown`) rather than silence - the player tapped a
  button, and silence there reads as a broken app. `Studio.adsMessage()` turns
  the token into a sentence; Root.io shows it on its game-over panel.
- **Interstitial is a bonus**, so a refusal is answered with `skipped` and the
  game moves on. Telling a player who did not ask for anything "no ads for you
  right now" is nagging, and nagging is what loses users.

Revive detection needed care. The ten legacy games predate the `kind` argument
and pass only a callback, so `rewardKindFor` infers it from the placement name
(`continue`, `revive`, `life`, `rescue`) - every one of them labels its
continue-after-death offer with one of those. Without the inference a legacy
revive would have quietly dodged the one-per-game cap.

The old 2.5s guard in `AdMobManager` is now only a double-tap guard; the real
cap lives in `AdPolicy`.

### Testing

`Tools/adtest/run.bat` compiles the **real** `AdPolicy.kt` and asserts against
it: 20 checks, all passing. A transcription of the policy into JavaScript was
tried first and discarded - a copy can pass while the shipped code is wrong,
which is precisely the failure this harness exists to prevent.

Getting there needed two seams in production code, both of which are
improvements in their own right: `AdPolicy.Store` (a two-method interface
instead of raw SharedPreferences) and a `clock` hook, because the caps are
time-based and a test that cannot move time can only prove the refusals, never
that the caps are reachable. JUnit was not an option - only junit-bom POMs are
in the Gradle cache, not the jars.

The clock caught a real interaction on the first run: asking for 5 rewarded ads
back to back earns exactly 1, because the 60s cooldown refuses the rest. That
is the cooldown working correctly, not a broken cap - but it means **5 per game
requires about 4 minutes of play to actually reach.** Worth revisiting if the
cap feels unreachable in real play.