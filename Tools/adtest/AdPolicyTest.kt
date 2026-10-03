package com.redundantstudios.arcade.ads



/**
 * Exercises the REAL AdPolicy source (compiled alongside it, not a copy of it).
 *
 * The caps are the whole point of the ad governor and they are pure decision
 * logic, so they can be checked without a device. Testing a transcription
 * instead would be worthless: a transcription can pass while the shipped code
 * is wrong, which is exactly the failure this harness exists to prevent.
 */
/**
 * An in-memory [AdPolicy.Store], so the caps can be checked on a plain JVM.
 *
 * The test drives the REAL AdPolicy source - this is not a transcription of it.
 * A transcription can pass while the shipped code is wrong, which is exactly the
 * failure this harness exists to prevent.
 *
 * AdPolicy takes its persistence through a two-method interface, so no Android
 * object is ever constructed: android.jar's methods are stubs that throw
 * "Stub!", and Context is an abstract class that cannot be proxied at all.
 * DummyContext is therefore never dereferenced - it exists only to satisfy the
 * signature.
 */
class MemStore(var sessions: Long = 0L) : AdPolicy.Store {
    override fun sessionsEverSeen(): Long = sessions
    override fun saveSessionsSeen(value: Long) { sessions = value }
}

object AdPolicyTest {

    private var passed = 0
    private var failed = 0

    private fun check(name: String, condition: Boolean) {
        if (condition) {
            passed++
            println("  PASS  $name")
        } else {
            failed++
            println("  FAIL  $name")
        }
    }

    private fun eq(name: String, actual: Any?, expected: Any?) {
        check("$name (got $actual)", actual == expected)
    }

    /** Past the first session, so only the rule under test applies. */
    private fun established() {
        val s = MemStore()
        AdPolicy.resetForTest(with = s)
        AdPolicy.onShellHomeShown(DummyContext)
        s.sessions = 5L
    }

    /**
     * Never dereferenced: the in-memory store means no Context method is ever
     * called. It exists only to satisfy AdPolicy's signatures.
     */
    private val DummyContext: android.content.Context? = null

    /**
     * A clock the test can move. The caps are time-based, so without this the
     * test could only ever prove the refusals - asking for five rewarded ads
     * back to back against the real clock earns exactly one, which reads as a
     * broken cap when in fact the cooldown is working.
     */
    private var time = 1_000_000L

    init {
        // android.util.Log is a stub jar that throws on use; this test is about
        // decisions, not log lines.
        AdPolicy.logger = { }
        AdPolicy.clock = { time }
    }

    /** Moves past the rewarded cooldown so the next request is eligible. */
    private fun skipCooldown() { time += AdPolicy.REWARDED_COOLDOWN_MS + 1000 }

    /** Moves past the interstitial gap. */
    private fun skipGap() { time += AdPolicy.INTERSTITIAL_GAP_MS + 1000 }
    @JvmStatic
    fun main(args: Array<String>) {
        println("AdPolicy")
        println("")

        // --- REWARDED: normal rewards are UNCAPPED -------------------------
        run {
            established()
            AdPolicy.onGameOpened(DummyContext)
            var allowed = 0
            // Each attempt is spaced past the 60s cooldown, so a refusal here
            // can only be the CAP - which must never fire any more.
            repeat(12) {
                if (AdPolicy.checkRewarded(DummyContext, AdPolicy.RewardKind.NORMAL) == AdPolicy.Verdict.ALLOWED) {
                    allowed++
                    AdPolicy.onRewardedEarned(AdPolicy.RewardKind.NORMAL)
                }
                skipCooldown()
            }
            eq("all 12 normal rewards allowed (uncapped)", allowed, 12)
            eq(
                "a normal reward is still allowed well past the old cap of 5",
                AdPolicy.checkRewarded(DummyContext, AdPolicy.RewardKind.NORMAL),
                AdPolicy.Verdict.ALLOWED
            )
            // Must NOT report 0 - a game would hide a good offer button.
            check(
                "normal rewards never report themselves as spent",
                AdPolicy.rewardedRemaining(AdPolicy.RewardKind.NORMAL) > 0
            )
        }

        // --- REVIVE: capped per RUN, and a NEW RUN restores it ----------
        // The revive cap is the one cap that must still bite, and it has to
        // survive a restart: "Play Again" runs in page, so onGameOpened never
        // fires again and the player's second run would find the revive already
        // spent. This is the regression onRunStarted() exists to prevent.
        run {
            established()
            AdPolicy.onGameOpened(DummyContext)
            eq("1st revive allowed", AdPolicy.checkRewarded(DummyContext, AdPolicy.RewardKind.REVIVE), AdPolicy.Verdict.ALLOWED)
            AdPolicy.onRewardedEarned(AdPolicy.RewardKind.REVIVE)
            eq(
                "2nd revive REFUSED in the same run (a second death must be a loss)",
                AdPolicy.checkRewarded(DummyContext, AdPolicy.RewardKind.REVIVE),
                AdPolicy.Verdict.CAP_REACHED
            )
            eq("remaining revives", AdPolicy.rewardedRemaining(AdPolicy.RewardKind.REVIVE), 0)
            // The same run, restarted in page:
            AdPolicy.onRunStarted()
            eq(
                "a NEW RUN gets its revive back",
                AdPolicy.checkRewarded(DummyContext, AdPolicy.RewardKind.REVIVE),
                AdPolicy.Verdict.ALLOWED
            )
        }

        // --- REWARDED: the revive cap is per RUN, not per session --------
        run {
            established()
            AdPolicy.onGameOpened(DummyContext)
            AdPolicy.onRewardedEarned(AdPolicy.RewardKind.REVIVE); skipCooldown()
            eq("revive spent in game A", AdPolicy.checkRewarded(DummyContext, AdPolicy.RewardKind.REVIVE), AdPolicy.Verdict.CAP_REACHED)
            AdPolicy.onGameOpened(DummyContext)
            eq("a NEW game gets a fresh revive", AdPolicy.checkRewarded(DummyContext, AdPolicy.RewardKind.REVIVE), AdPolicy.Verdict.ALLOWED)
        }

        // --- REWARDED: no cooldown on NORMAL, cooldown on REVIVE ---------
        // Cosmetics must be completely free - no cap AND no waiting. A player
        // tapping WATCH AD on a second skin one second after the first has to be
        // let through; refusing them was the bug.
        run {
            established()
            AdPolicy.onGameOpened(DummyContext)
            AdPolicy.onRewardedEarned(AdPolicy.RewardKind.NORMAL)
            eq(
                "a normal reward immediately after another is ALLOWED (no cooldown)",
                AdPolicy.checkRewarded(DummyContext, AdPolicy.RewardKind.NORMAL),
                AdPolicy.Verdict.ALLOWED
            )
        }
        // A revive is the one rewarded action still throttled.
        run {
            established()
            AdPolicy.onGameOpened(DummyContext)
            AdPolicy.onRewardedEarned(AdPolicy.RewardKind.NORMAL)
            eq(
                "a revive immediately after another ad hits the 60s cooldown",
                AdPolicy.checkRewarded(DummyContext, AdPolicy.RewardKind.REVIVE),
                AdPolicy.Verdict.COOLDOWN
            )
            skipCooldown()
            eq(
                "past the cooldown the revive is allowed",
                AdPolicy.checkRewarded(DummyContext, AdPolicy.RewardKind.REVIVE),
                AdPolicy.Verdict.ALLOWED
            )
        }

        // --- INTERSTITIAL: refused on exit (an AdMob policy rule) ------
        run {
            established()
            AdPolicy.onGameOpened(DummyContext)
            eq(
                "interstitial on app exit is REFUSED",
                AdPolicy.checkInterstitial(DummyContext, "exit"),
                AdPolicy.Verdict.FORBIDDEN_PLACEMENT
            )
        }

        // --- INTERSTITIAL: a grace period on the first session ---------
        // A brand-new player is protected at the START of their first session
        // (that is the moment an unexpected ad is most likely to cost the
        // install), but a long first session still earns a break. The old rule
        // banned interstitials for the whole first session, which meant an
        // hour-long first session never saw one - and clearing app data to test
        // looked exactly like a broken ad.
        run {
            val store = MemStore()
            AdPolicy.resetForTest(with = store)
            AdPolicy.onShellHomeShown(DummyContext) // this IS session #1
            eq("sessions seen after first Home", AdPolicy.sessionsSeen(DummyContext), 1L)
            eq(
                "a brand-new user is protected at the start of session 1",
                AdPolicy.checkInterstitial(DummyContext, "break"),
                AdPolicy.Verdict.FIRST_SESSION
            )
            // Past the grace period the first session is treated normally, so a
            // long first session can still show one ad break.
            time += AdPolicy.FIRST_SESSION_GRACE_MS + 1_000
            eq(
                "session 1 becomes eligible after the grace period",
                AdPolicy.checkInterstitial(DummyContext, "break"),
                AdPolicy.Verdict.ALLOWED
            )
        }

        // --- INTERSTITIAL: the 180s gap is the ONLY limit ------------------
        // There is no per-session cap any more. The first ad is allowed, and the
        // next is blocked purely by the gap - so once that elapses the next one
        // shows, and it keeps working for as long as the player taps a break
        // button at least once per gap.
        run {
            established()
            AdPolicy.onGameOpened(DummyContext)
            eq("1st interstitial allowed", AdPolicy.checkInterstitial(DummyContext, "break"), AdPolicy.Verdict.ALLOWED)
            AdPolicy.onInterstitialShown()
            eq(
                "blocked only by the gap, not by a session cap",
                AdPolicy.checkInterstitial(DummyContext, "break"),
                AdPolicy.Verdict.COOLDOWN
            )
            skipGap()
            eq("after the gap elapses another interstitial is allowed", AdPolicy.checkInterstitial(DummyContext, "break"), AdPolicy.Verdict.ALLOWED)
            AdPolicy.onInterstitialShown()
            skipGap()
            eq("a THIRD interstitial is allowed too (no cap)", AdPolicy.checkInterstitial(DummyContext, "break"), AdPolicy.Verdict.ALLOWED)
        }

        // --- INTERSTITIAL: the gap is APP-WIDE across games ------------
        run {
            established()
            AdPolicy.onGameOpened(DummyContext)
            eq("allowed before any interstitial", AdPolicy.checkInterstitial(DummyContext, "break"), AdPolicy.Verdict.ALLOWED)
            AdPolicy.onInterstitialShown()

            // The player leaves and opens a DIFFERENT game. A per-screen counter
            // would reset here and let the next game show one immediately -
            // which is the exact bug this class exists to prevent.
            AdPolicy.onGameOpened(DummyContext)
            val verdict = AdPolicy.checkInterstitial(DummyContext, "break")
            check(
                "after switching games the interstitial gap still applies (got $verdict)",
                verdict == AdPolicy.Verdict.COOLDOWN || verdict == AdPolicy.Verdict.CAP_REACHED
            )
        }

        // --- The reason strings the games turn into on-screen text -----
        run {
            eq("cap token", AdPolicy.token(AdPolicy.Verdict.CAP_REACHED), "limit_reached")
            eq("cooldown token", AdPolicy.token(AdPolicy.Verdict.COOLDOWN), "cooldown")
            eq("offline token", AdPolicy.token(AdPolicy.Verdict.OFFLINE), "offline")
            eq("allowed token", AdPolicy.token(AdPolicy.Verdict.ALLOWED), "granted")
        }

        println("")
        println("  $passed passed, $failed failed")
        if (failed > 0) {
            println("  RESULT: FAIL")
            System.exit(1)
        }
        println("  RESULT: PASS")
    }
}



