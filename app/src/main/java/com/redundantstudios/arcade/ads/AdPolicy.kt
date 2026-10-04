package com.redundantstudios.arcade.ads

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log

/**
 * The app-wide ad governor.
 *
 * WHY THIS EXISTS
 * Every game used to carry its own ad policy in its own HTML: Root.io fired an
 * interstitial "every 4th retry", Ember had three separate interstitial call
 * sites, Sheepdog three, Pool-8Ball three, and three games had no ads at all.
 * A per-game counter cannot see what the previous game did, so there was no
 * way to express "one ad per three minutes ACROSS the app", and no way to stop
 * a player being shown an ad every 15 seconds in one game and not at all in
 * the next. Adding a game meant writing a new policy in game code.
 *
 * So the policy lives here, in the shell, in front of the bridge. A game asks
 * *whether* it may show an ad; this decides *when*. The numbers come from
 * FuturePlans/AD_SYSTEM_RESEARCH.md and were agreed by the director, then revised
 * at the director's request: a 120s interstitial gap, revives limited to one per
 * run, and NO cap on cosmetics, themes or other in-game rewards - those are
 * uncapped, because a player watching an ad TO GET something is not being abused
 * by being offered a second one.
 *
 * Two tiers of decision, deliberately different:
 *  - REWARDED is player-initiated. Suppressing it silently looks like a broken
 *    button, so it always answers with a REASON the game can show.
 *  - INTERSTITIAL is a bonus break. Suppressing it is SILENT, because nagging
 *    a player who did not ask for anything is exactly the behaviour the
 *    research says loses users.
 */
object AdPolicy {

    private const val TAG = "AdPolicy"
    private const val PREFS = "ad_policy"

    /* ---- Agreed numbers (AD_SYSTEM_RESEARCH.md section 3) ---- */

    /**
     * Minimum gap between ANY two interstitials, app-wide.
     *
     * THE ONLY INTERSTIATIAL LIMIT. There used to be a hard "1 per app session"
     * cap on top of this, which meant that after a player's first interstitial
     * nothing else could ever show again until the app was closed and relaunched
     * - so the 180s gap almost never got the chance to matter, and an interstitial
     * system effectively showed one ad per launch.
     *
     * The cap is gone. Frequency is now the gap alone: once 180s have passed an
     * ad is READY, and it waits there until the player taps a natural break
     * (Play Again / Home / Menu). The ad never fires on a timer by itself, so it
     * can never ambush someone mid-action - the player's own tap is what shows
     * it, which is why no separate count is needed.
     */
    const val INTERSTITIAL_GAP_MS = 180_000L

    /**
     * How long into a brand-new player's FIRST session interstitials stay
     * suppressed.
     *
     * The old rule was "no interstitial, ever, in the first session". That is
     * defensible for the first thirty seconds and wrong for the first hour: a
     * new player who immediately likes the app and plays a long session would
     * never see a single ad break, and clearing app data to test made it look
     * like the ad was broken. Three minutes protects the install moment - where
     * an unexpected ad is most likely to cost the install - and then gets out of
     * the way. Every other gate (once per session, 180s gap, no ad on exit)
     * still applies exactly as before.
     */
    const val FIRST_SESSION_GRACE_MS = 180_000L

    /**
     * NO LONGER ENFORCED - kept only so the unit tests have a stable number and so
     * rewardedRemaining(NORMAL) has something to report. The check that used to
     * refuse the 6th reward was removed from [checkRewarded]: cosmetics, themes
     * and in-game rewards are uncapped at the director's request. The only
     * rewarded cap that still bites is [REVIVE_CAP_PER_GAME].
     */
    const val REWARDED_CAP_PER_GAME = 5

    /**
     * Revives allowed per RUN. One. A second death in the same run is a loss.
     *
     * Reset by [onRunStarted] when a game starts a new run, because "Play Again"
     * happens in page and never reopens the Activity that calls [onGameOpened].
     * Without that reset a player used their single revive and then found the
     * continue button already gone in a brand-new run.
     */
    const val REVIVE_CAP_PER_GAME = 1

    /** Minimum gap between two rewarded ads, to absorb a mash-tap loop. */
    const val REWARDED_COOLDOWN_MS = 60_000L

    /**
     * Minimum gap between two LEVEL/PROGRESSION UNLOCKS.
     *
     * Cosmetics and in-game rewards are deliberately uncapped, but an unlock is
     * different in kind: it lets a player skip past progression. Sheepdog Trials
     * offers "watch an ad to unlock this trial", and with rewards otherwise
     * uncapped a player could tap through the whole level list in a minute and
     * never actually play it. This puts a floor under that specifically, without
     * re-capping anything else.
     *
     * Still a GAP, not a cap - the offer never disappears, it just becomes ready
     * again. Two minutes keeps it feeling optional while stopping a whole
     * ladder being unlocked in one sitting.
     */
    const val UNLOCK_GAP_MS = 120_000L

    /**
     * A session older than this is treated as a new one, so a phone left
     * face-up overnight does not inherit yesterday's caps.
     */
    private const val SESSION_MAX_AGE_MS = 4L * 60 * 60 * 1000

    private const val KEY_SESSIONS_SEEN = "sessions_seen"

    /**
     * Logging goes through here rather than straight to android.util.Log.
     *
     * Two reasons. android.util.Log is a stub in android.jar and throws
     * "Stub!" the moment a JVM test calls it, so the caps could not be
     * exercised off-device. And the governor is the piece whose decisions most
     * need explaining after the fact ("why did that ad not show?"), so it owns
     * the line it writes rather than scattering Log calls that a test cannot
     * intercept.
     */
    @Volatile
    var logger: (String) -> Unit = { msg -> Log.d(TAG, msg) }

    private fun log(message: String) { logger(message) }

    /**
     * The clock, indirected for the same reason as the logger.
     *
     * The caps are time-based - a 180s interstitial gap and a 60s rewarded
     * cooldown - so a test that cannot move time can only ever prove the
     * REFUSALS, never that the caps can actually be reached. Asking for 5
     * rewarded ads in a row against the real clock earns exactly 1, which
     * looks like a broken cap and is not one: the cooldown is doing its job.
     */
    @Volatile
    var clock: () -> Long = { System.currentTimeMillis() }

    private fun now(): Long = clock()

    /** What kind of reward the player is asking for. */
    enum class RewardKind {
        /** A normal reward: +1 undo, a cosmetic, a currency top-up. */
        NORMAL,

        /**
         * A "continue after death" revive. Capped hard at
         * [REVIVE_CAP_PER_GAME], because an uncapped revive removes the
         * failure state from the game entirely.
         */
        REVIVE,

        /**
         * Unlocking a level / progression step for an ad.
         *
         * A third kind because it needs its own rule. Cosmetics and in-game
         * rewards are uncapped, which is right - the player chose to watch. An
         * UNLOCK is different: it lets them move past content rather than
         * earn it, so it carries a [UNLOCK_GAP_MS] floor of its own.
         */
        UNLOCK
    }

    /** Why an ad was or was not allowed. */
    enum class Verdict {
        ALLOWED,

        /** Offline: the SDK cannot load anything. The game already explains. */
        OFFLINE,

        /** Too soon after the last one of this kind. */
        COOLDOWN,

        /** The per-game cap for this kind is used up. */
        CAP_REACHED,

        /** Interstitial asked for at app open/exit, which AdMob disallows. */
        FORBIDDEN_PLACEMENT,

        /** No interstitials at all on a user's very first session. */
        FIRST_SESSION
    }

    /**
     * Milliseconds still to wait on the rewarded cooldown, or 0 if it has passed.
     *
     * A refusal that does not say how long is the same as a broken button: the
     * player is told to wait and then has to guess how long, so they either give
     * up on the reward or tap repeatedly. The game turns this into a live
     * countdown, which also means the offer visibly comes back on its own.
     */
    fun rewardedCooldownRemainingMs(): Long {
        val left = REWARDED_COOLDOWN_MS - (now() - lastRewardedAt)
        return if (left > 0L) left else 0L
    }

    /** Milliseconds left on the level-unlock gap, for the game's countdown. */
    fun unlockCooldownRemainingMs(): Long {
        val left = UNLOCK_GAP_MS - (now() - lastUnlockAt)
        return if (left > 0L) left else 0L
    }

    /** Milliseconds still to wait on the interstitial gap, or 0. See [rewardedCooldownRemainingMs]. */
    fun interstitialCooldownRemainingMs(): Long {
        val left = INTERSTITIAL_GAP_MS - (now() - lastInterstitialAt)
        return if (left > 0L) left else 0L
    }

    /**
     * The string handed back to the game. Games turn this into a message, so it
     * is part of the bridge contract - do not rename without updating the
     * Studio SDK block in every game.
     *
     * COOLDOWN CARRIES ITS REMAINING SECONDS as "cooldown:47". The bare token
     * made a timed refusal indistinguishable from a permanent one, so every
     * game fell back on vague wording ("give it a moment"). Games that only
     * compare against "granted" are unaffected; anything reading the token as a
     * plain string still sees a cooldown, it just learns how long is left.
     */
    fun token(v: Verdict, cooldownRemainingMs: Long = 0L): String = when (v) {
        Verdict.ALLOWED -> "granted"
        /* "offline" is deliberately NOT "unavailable". Collapsing the two is
           what produced the lie the player saw: "check your internet
           connection" while sitting on working wifi, because the real cause was
           an ad that simply had no fill. The game can only explain a problem
           accurately if it is told which problem it is. */
        Verdict.OFFLINE -> "offline"
        Verdict.COOLDOWN ->
            if (cooldownRemainingMs > 0L) {
                /* Round UP: a player told "0s" would tap again immediately and be
                   refused, which is the exact loop this number is meant to end. */
                "cooldown:" + ((cooldownRemainingMs + 999L) / 1000L)
            } else {
                "cooldown"
            }
        Verdict.CAP_REACHED -> "limit_reached"
        Verdict.FORBIDDEN_PLACEMENT -> "forbidden"
        Verdict.FIRST_SESSION -> "first_session"
    }

    /**
     * Is the device genuinely without internet?
     *
     * Requires NET_CAPABILITY_VALIDATED, not merely an active network: a
     * connected-to-but-dead link (captive portal, dead router, mobile data
     * that has dropped) reports an active network that cannot actually pass
     * traffic, and blaming the player's connection in that case is exactly the
     * misleading message this exists to prevent.
     *
     * Fails OPEN. If the check itself throws, or the service is missing, we
     * report "online" and let the request proceed. Blocking every ad on a
     * device because a permission or vendor bug broke a status query would be
     * a far worse failure than showing an ad that does not serve.
     */
    fun isOffline(context: Context?): Boolean {
        val ctx = context ?: return false
        return try {
            val cm = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            if (cm == null) return false
            val network = cm.activeNetwork ?: return true
            val caps = cm.getNetworkCapabilities(network) ?: return true
            !caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
        } catch (e: Exception) {
            false
        }
    }

    // ---- session state ----

    private var sessionStartedAt = 0L
    /* No interstitialsThisSession any more: the per-session cap is gone and the
       180s gap is the only limit, so there is no count to keep. */
    private var rewardedThisGame = 0
    private var revivesThisGame = 0
    private var lastRewardedAt = 0L
    /** Last LEVEL/PROGRESSION unlock, for the [UNLOCK_GAP_MS] floor. */
    private var lastUnlockAt = 0L
    /**
     * The last interstitial is APP-WIDE, so it is persisted: a player who plays
     * game A, leaves, opens game B and taps Play Again must still be inside the
     * 180s gap. An in-memory field would reset with each Activity and the cap
     * would do nothing across games - the exact bug this class exists to fix.
     */
    private var lastInterstitialAt = 0L

    /**
     * The two things AdPolicy needs from a Context, declared as an interface so
     * the caps can be exercised on a plain JVM (see Tools/adtest).
     *
     * android.content.Context is an abstract CLASS, so it cannot be proxied and
     * its android.jar methods are stubs that throw "Stub!" - neither is any use
     * for a test. This interface is the whole of AdPolicy's dependency on the
     * platform, which is also the honest description of it: the governor reads
     * one counter and remembers one number.
     */
    interface Store {
        fun sessionsEverSeen(): Long
        fun saveSessionsSeen(value: Long)
    }

    /** Reads and writes the one persisted value AdPolicy keeps. */
    private class PrefsStore(context: Context) : Store {
        private val prefs = context.applicationContext
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)

        override fun sessionsEverSeen(): Long = prefs.getLong(KEY_SESSIONS_SEEN, 0L)

        override fun saveSessionsSeen(value: Long) {
            prefs.edit().putLong(KEY_SESSIONS_SEEN, value).apply()
        }
    }

    /** The store in use. Replaced wholesale by [resetForTest]. */
    @Volatile
    private var store: Store = object : Store {
        override fun sessionsEverSeen(): Long = 0L
        override fun saveSessionsSeen(value: Long) = Unit
    }

    /** Wires the real preference-backed store. Called once, from Home. */
    fun attach(context: Context) {
        if (store !is PrefsStore && context != null) store = PrefsStore(context)
    }

    /**
     * Called when the player reaches Home.
     *
     * A session is the gap between two Home visits, not the process lifetime: a
     * player who backgrounds the app for an hour and comes back is a new session
     * and should not still be inside yesterday's cap.
     */
    fun onShellHomeShown(context: Context?) {
        if (store !is PrefsStore && context != null) store = PrefsStore(context)
        val now = now()
        val stale = sessionStartedAt == 0L || now - sessionStartedAt > SESSION_MAX_AGE_MS
        if (stale) {
            if (sessionStartedAt != 0L) log( "New session (>4h since last Home)")
            sessionStartedAt = now
            lastRewardedAt = 0L
            store.saveSessionsSeen(store.sessionsEverSeen() + 1)
        }
    }

    /** Total sessions this install has ever had. */
    fun sessionsSeen(context: Context?): Long {
        if (store !is PrefsStore && context != null) store = PrefsStore(context)
        return store.sessionsEverSeen()
    }

    /** A new game screen opened: reset the per-game caps, keep the app-wide ones. */
    fun onGameOpened(context: Context?) {
        onShellHomeShown(context)
        rewardedThisGame = 0
        revivesThisGame = 0
        log( "Game opened - per-game caps reset")
    }

    /**
     * A NEW RUN inside the same game screen - "Play Again" / "Retry".
     *
     * WHY THIS EXISTS
     *     [onGameOpened] resets the per-game caps, but it fires once per
     *     GameActivity. A game whose Play Again restarts IN PLACE - most of them
     *     do - never fires it again, so revivesThisGame stayed at 1 and the next
     *     run's revive was refused with CAP_REACHED. The game then hid its
     *     "Watch Ad to Continue" button in a brand-new run, which reads to the
     *     player as a broken revive.
     *
     *     The games' own model has always been per-run: root-io clears its
     *     reviveUsed flag on every startGame(). The shell cap now matches it.
     *
     * THREE COUNTERS, AND WHY EACH ONE
     *     revivesThisGame  - one revive per RUN, not one per app visit.
     *     rewardedThisGame - onRewardedEarned() counts a REVIVE towards this
     *                        too, so without resetting it the sixth run's revive
     *                        would hit the 5-cap and die in exactly the same way.
     *     lastRewardedAt   - the 60s cooldown. Run 1's revive otherwise blocks
     *                        run 2's, and a player who restarts quickly is told to
     *                        wait for an ad they have already watched. The
     *                        cooldown absorbs a mash-tap loop on ONE screen; a
     *                        deliberate restart is not one.
     *
     *     The interstitial clock is deliberately NOT reset: restarting a run
     *     must not let a player out-run the app-wide 180s gap.
     */
    fun onRunStarted() {
        rewardedThisGame = 0
        revivesThisGame = 0
        lastRewardedAt = 0L
        log("New run - per-run caps and cooldown reset")
    }

    /**
     * May an interstitial be shown right now?
     *
     * @param placement why the game is asking. "exit" is refused outright: AdMob
     *   disallows an interstitial on app exit, and an ad on the way out is the
     *   single most reliable way to lose a user.
     */
    fun checkInterstitial(context: Context?, placement: String): Verdict {
        val now = now()
        if (placement.equals("exit", ignoreCase = true)) {
            log( "Interstitial REFUSED: app exit (AdMob policy)")
            return Verdict.FORBIDDEN_PLACEMENT
        }
        if (sessionsSeen(context) <= 1L) {
            /* A brand-new player must not be ambushed by an ad in their first
               few minutes. But "never, all session" was too absolute: someone
               who installs the app and plays for an hour would never see a
               single ad break, and clearing app data looked exactly like a bug.
               So the first session gets a GRACE PERIOD rather than a total ban
               - protected at the start, eligible once they have actually stuck
               around. Every other gate still applies. */
            val intoSession = now() - sessionStartedAt
            if (intoSession < FIRST_SESSION_GRACE_MS) {
                val left = (FIRST_SESSION_GRACE_MS - intoSession) / 1000
                log( "Interstitial suppressed: first session, ${left}s of grace left")
                return Verdict.FIRST_SESSION
            }
        }
        if (now - lastInterstitialAt < INTERSTITIAL_GAP_MS) {
            val left = INTERSTITIAL_GAP_MS - (now - lastInterstitialAt)
            log( "Interstitial suppressed: ${left / 1000}s of the ${INTERSTITIAL_GAP_MS / 1000}s gap left")
            return Verdict.COOLDOWN
        }
        return Verdict.ALLOWED
    }

    /** Records that an interstitial was actually shown, restarting the gap. */
    fun onInterstitialShown() {
        lastInterstitialAt = now()
        log( "Interstitial shown - next one ready in ${INTERSTITIAL_GAP_MS / 1000}s")
    }

    /** May a rewarded ad be shown right now? */
    fun checkRewarded(context: Context?, kind: RewardKind): Verdict {
        onShellHomeShown(context)
        val now = now()
        return when {
            /* Checked FIRST, and separately from a load failure. "You are
               offline" and "no ad available right now" are different problems
               with different fixes for the player, and only a real connectivity
               check can tell them apart. */
            isOffline(context) -> {
                log("Rewarded REFUSED: device is offline")
                Verdict.OFFLINE
            }
            kind == RewardKind.REVIVE && revivesThisGame >= REVIVE_CAP_PER_GAME -> {
                log( "Revive REFUSED: already used this game")
                Verdict.CAP_REACHED
            }
            /* NO CAP AND NO COOLDOWN ON NORMAL REWARDS.
               Two rules used to sit here and both are gone:
                 - `rewardedThisGame >= REWARDED_CAP_PER_GAME`, which refused
                   the 6th cosmetic of a game, so a skin button would work and
                   then quietly stop paying out. That reads as a broken game,
                   not as a limit.
                 - an unconditional 60s cooldown, which refused a second
                   cosmetic for a minute. A player tapping "WATCH AD" on a
                   second skin was told to come back later, which is nonsense
                   for something they are choosing to watch.
               Cosmetics, themes and in-game rewards are now completely free:
               no total, no waiting. The only gates left on them are "are you
               online" and "did an ad actually serve".
               A mash-tap is still contained - by the games' own adBusy/adActive
               guards, and by AdMobManager keeping at most ONE queued request,
               so repeated taps collapse into a single ad rather than a burst. */
            /* The cooldown now applies ONLY to a revive, which is the one
               rewarded action worth throttling: it is the ad a player is most
               willing to watch, and it is already capped at one per run above. */
            kind == RewardKind.REVIVE && now - lastRewardedAt < REWARDED_COOLDOWN_MS -> {
                val left = REWARDED_COOLDOWN_MS - (now - lastRewardedAt)
                log( "Revive suppressed: ${left / 1000}s of the ${REWARDED_COOLDOWN_MS / 1000}s cooldown left")
                Verdict.COOLDOWN
            }
            /* A LEVEL UNLOCK carries its own, much longer floor. Rewards are
               otherwise uncapped, which is correct for a cosmetic, but an unlock
               moves the player PAST content rather than rewarding them for it.
               This is a gap, not a cap: the offer stays on screen and simply
               becomes ready again, and the seconds are sent back to the game so
               it can say when. */
            kind == RewardKind.UNLOCK && now - lastUnlockAt < UNLOCK_GAP_MS -> {
                val left = UNLOCK_GAP_MS - (now - lastUnlockAt)
                log( "Unlock suppressed: ${left / 1000}s of the ${UNLOCK_GAP_MS / 1000}s unlock gap left")
                Verdict.COOLDOWN
            }
            else -> Verdict.ALLOWED
        }
    }

    /** Records a rewarded view that was actually completed. */
    fun onRewardedEarned(kind: RewardKind) {
        rewardedThisGame++
        lastRewardedAt = now()
        if (kind == RewardKind.REVIVE) revivesThisGame++
        if (kind == RewardKind.UNLOCK) lastUnlockAt = now()
        /* "rewarded=N" with no "/5" on purpose: there is no cap on normal rewards
           any more, so printing a total out of a limit that is not enforced is
           misleading in the very log used to answer "why did that ad not pay?". */
        log(
            "Rewarded earned (${if (kind == RewardKind.REVIVE) "revive" else "normal"}): " +
                "rewarded=$rewardedThisGame (uncapped) revives=$revivesThisGame/$REVIVE_CAP_PER_GAME"
        )
    }

    /**
     * How many rewarded ads of this kind are left, so a game can hide a spent
     * offer button instead of leaving a dead one on screen.
     *
     * NORMAL REWARDS ARE UNCOUNTED. Cosmetics, themes and in-game rewards are
     * not capped any more, so returning 0 once five had been watched made a game
     * hide a perfectly good offer button - the exact "dead button" this function
     * exists to avoid, just triggered by the wrong thing. It now always reports
     * a remaining count for NORMAL, because there is no total to run out of.
     * Only a REVIVE can genuinely be spent, so only that returns 0.
     */
    fun rewardedRemaining(kind: RewardKind): Int {
        if (kind != RewardKind.REVIVE) return REWARDED_CAP_PER_GAME
        return (REVIVE_CAP_PER_GAME - revivesThisGame).coerceAtLeast(0)
    }

    /**
     * Test seam: forget every counter, and optionally swap in an in-memory store
     * so the caps can be checked without SharedPreferences.
     */
    fun resetForTest(context: Context? = null, with: Store? = null) {
        sessionStartedAt = 0L
        rewardedThisGame = 0
        revivesThisGame = 0
        lastUnlockAt = 0L
        lastRewardedAt = 0L
        lastInterstitialAt = 0L
        if (with != null) store = with
        if (context != null) store = PrefsStore(context)
    }
}
