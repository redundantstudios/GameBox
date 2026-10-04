package com.redundantstudios.arcade.bridge

import android.content.Context
import android.content.SharedPreferences
import android.os.Vibrator
import android.os.VibrationEffect
import android.os.Build
import android.os.VibratorManager
import android.webkit.JavascriptInterface
import android.util.Log
import com.redundantstudios.arcade.ads.AdPolicy

class NativeBridge(private val context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("studio_games", Context.MODE_PRIVATE)

    @JavascriptInterface
    fun save(key: String, json: String) {
        prefs.edit().putString(key, json).apply()
        Log.d("NativeBridge", "Saved: $key -> $json")
    }

    @JavascriptInterface
    fun load(key: String): String? {
        val value = prefs.getString(key, null)
        Log.d("NativeBridge", "Loaded: $key -> $value")
        return value
    }

    @JavascriptInterface
    fun haptic(ms: Int) {
        Log.d("NativeBridge", "Haptic request: ${ms}ms")
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            manager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(ms.toLong(), VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(ms.toLong())
        }
    }

    /**
     * Rewarded ad.
     *
     * THE GOVERNOR LIVES HERE, not in the games.
     *
     * Ten games call `Studio.ads.rewarded(...)` (the modern shim) and ten older
     * ones call `showRewardedAd(callback)` directly with a one-argument call.
     * Both arrive at this method, so this is the one place every rewarded ad
     * in the app passes through - which is exactly what makes the cap
     * app-wide rather than per-game. Deciding it inside each game is what let
     * a player see an ad every 15 seconds in one game and none in the next.
     *
     * @param callback  name of the JS function to call back.
     * @param placement short tag for logs and for inferring the reward kind.
     *   Nullable: legacy games pass only the callback.
     * @param kind      "revive" for a continue-after-death. Nullable - see
     *   [rewardKindFor], which infers it from the placement when omitted, so a
     *   legacy game's "continue" revive is still capped at one.
     */
    @JavascriptInterface
    fun showRewardedAd(callback: String, placement: String?, kind: String?) {
        val rewardKind = rewardKindFor(placement, kind)
        Log.d(
            "NativeBridge",
            "Rewarded requested: callback=$callback placement=$placement kind=$rewardKind"
        )
        val verdict = AdPolicy.checkRewarded(context, rewardKind)
        if (verdict != AdPolicy.Verdict.ALLOWED) {
            /* A rewarded ad is player-initiated, so silence would look like a
               broken button. The game is told WHY, so it can say so. */
            Log.d("NativeBridge", "Rewarded denied by policy: $verdict")
            /* UNIVERSAL OFFLINE NOTICE.
               Offline is the one refusal the player can actually DO something
               about, and the one they cannot work out on their own - every game
               otherwise shows its own wording, or nothing at all. Announcing it
               once from the shell means a player who is genuinely offline is
               told so consistently, whichever game they are in. The per-game
               message still arrives too, so nothing is swallowed. */
            if (verdict == AdPolicy.Verdict.OFFLINE) {
                /* `this` here is the NativeBridge, not a screen. The bridge is
                   constructed with the GameActivity (see the addJavascriptInterface
                   call), so that is the Activity the popup belongs on. The cast
                   is a safe ?: so a future non-Activity context cannot crash the
                   game - the worst outcome would be a missing popup. */
                (context as? android.app.Activity)?.let {
                    OfflineNotifier.announceOnce(it)
                }
            }
            /* The remaining milliseconds are handed over so the game can say "ready in
               47s" and re-arm the offer itself, instead of the vague "give it a
               moment" that a bare token forced on every game. Which clock is read
               depends on the KIND: a revive and a level unlock have different
               gaps, and reporting the wrong one would tell the player the offer
               is ready long before it actually is. */
            val remainingMs = when (rewardKind) {
                AdPolicy.RewardKind.UNLOCK -> AdPolicy.unlockCooldownRemainingMs()
                AdPolicy.RewardKind.REVIVE -> AdPolicy.rewardedCooldownRemainingMs()
                else -> 0L
            }
            NativeBridgeContext.callback?.invoke(
                callback,
                AdPolicy.token(verdict, remainingMs)
            )
            return
        }
        NativeBridgeContext.adHandler?.invoke(callback, placement ?: "", rewardKind.name)
    }

    /**
     * Interstitial ad.
     *
     * Governed here for the same reason as rewarded: it is the single funnel
     * for every interstitial in the app. "exit" is refused outright because
     * AdMob disallows an interstitial on app exit.
     *
     * A denied interstitial is released SILENTLY ("skipped"). The player never
     * asked for one, so telling them "no ads for you right now" would be
     * nagging - and nagging is precisely what loses users.
     */
    @JavascriptInterface
    fun showInterstitial(callback: String, placement: String?) {
        Log.d("NativeBridge", "Interstitial requested: callback=$callback placement=$placement")
        val verdict = AdPolicy.checkInterstitial(context, placement ?: "")
        if (verdict != AdPolicy.Verdict.ALLOWED) {
            Log.d("NativeBridge", "Interstitial denied by policy: $verdict")
            NativeBridgeContext.callback?.invoke(callback, "skipped")
            return
        }
        NativeBridgeContext.interstitialHandler?.invoke(callback, placement ?: "")
    }

    /**
     * Works out whether a request is a REVIVE (capped at one per game, because
     * an uncapped revive removes the game's failure state) or a NORMAL reward
     * (capped at five per game).
     *
     * Modern games pass an explicit kind. Legacy games pass only a placement
     * name, so the name is inspected: every one of them labels its
     * continue-after-death offer "continue", "revive" or "life" (that is what
     * the original CrazyGames SDK called these placements). Inferring from the
     * name is what stops a legacy game's revive from dodging the one-per-game
     * cap just because it was integrated before this field existed.
     */
    private fun rewardKindFor(placement: String?, kind: String?): AdPolicy.RewardKind {
        if (kind != null) {
            return when {
                kind.equals("revive", ignoreCase = true) -> AdPolicy.RewardKind.REVIVE
                /* "unlock" is explicit so a game can say what it wants without
                   relying on the placement string matching a guessy word list. */
                kind.equals("unlock", ignoreCase = true) -> AdPolicy.RewardKind.UNLOCK
                else -> AdPolicy.RewardKind.NORMAL
            }
        }
        val p = placement?.lowercase().orEmpty()
        val isRevive = REVIVE_PLACEMENT_WORDS.any { p.contains(it) }
        /* Checked BEFORE the revive list: a placement like "level-unlock-3"
           describes progression, not a continue-after-death. */
        val isUnlock = UNLOCK_PLACEMENT_WORDS.any { p.contains(it) }
        return when {
            isUnlock -> AdPolicy.RewardKind.UNLOCK
            isRevive -> AdPolicy.RewardKind.REVIVE
            else -> AdPolicy.RewardKind.NORMAL
        }
    }

    private val REVIVE_PLACEMENT_WORDS = listOf("continue", "revive", "extra_life", "extralife", "rescue")
    private val UNLOCK_PLACEMENT_WORDS = listOf("unlock")

    @JavascriptInterface
    fun showBanner() {
        Log.d("NativeBridge", "Show banner requested")
        NativeBridgeContext.bannerHandler?.invoke(true)
    }

    @JavascriptInterface
    fun hideBanner() {
        Log.d("NativeBridge", "Hide banner requested")
        NativeBridgeContext.bannerHandler?.invoke(false)
    }

    @JavascriptInterface
    fun exitGame() {
        NativeBridgeContext.exitHandler?.invoke()
    }

    /**
     * A NEW RUN began inside the current game screen ("Play Again" / "Retry").
     *
     * WHY THE GAME HAS TO SAY SO
     *     The per-game ad caps are reset by GameActivity when it opens. A
     *     restart happens IN PAGE, so the Activity is never recreated and that
     *     reset never runs again - the second run inherited the first run's
     *     spent revive and was refused with CAP_REACHED, and the game then hid
     *     its continue button in a brand-new run. See AdPolicy.onRunStarted.
     *
     * ZERO ARGUMENTS, and the JS must call `newRun()`: addJavascriptInterface
     * matches by EXACT arity, so passing even one argument throws.
     */
    @JavascriptInterface
    fun newRun() {
        Log.d("NativeBridge", "New run reported by the game")
        NativeBridgeContext.runHandler?.invoke()
    }
}

// Simple singleton to hold handlers for async JS calls
object NativeBridgeContext {
    var callback: ((String, String) -> Unit)? = null
    var exitHandler: (() -> Unit)? = null

    /**
     * Rewarded request. The extra args are the placement tag and the reward
     * kind ("revive" or anything else) so AdPolicy can apply the right cap -
     * see AdPolicy.checkRewarded.
     */
    var adHandler: ((String, String, String) -> Unit)? = null

    /** Interstitial request, with the placement tag ("exit" is refused). */
    var interstitialHandler: ((String, String) -> Unit)? = null

    var bannerHandler: ((Boolean) -> Unit)? = null

    /**
     * A new run started inside the current game, so the per-run caps reset.
     * See [NativeBridge.newRun] and AdPolicy.onRunStarted.
     */
    var runHandler: (() -> Unit)? = null
}

/**
 * The one popup the app shows when an AD cannot be served for lack of network.
 *
 * WHEN IT FIRES - AND ONLY THEN
 *     Solely when the player has explicitly asked for an ad by tapping a
 *     rewarded offer (a revive, a cosmetic, a theme, an in-game reward). It is
 *     NOT a general "you are offline" banner: the app deliberately never tells
 *     a player they are offline just because they are offline. These games are
 *     downloaded and run entirely on-device, so being offline is a perfectly
 *     normal state and saying so unprompted is noise - and it was wrong to
 *     imply the game itself had stopped working.
 *     The only thing that genuinely needs a connection is the AD. So this popup
 *     appears at the one moment a player asked for something the app cannot
 *     currently give: they tapped "Watch Ad" and nothing came. Silent failure
 *     there reads as a broken game, which is why a message is warranted at all.
 *     Interstitials stay silent, per the rule above - nobody asked for one.
 *
 * ONE POPUP, ONE WORDING
 *     This used to be two different notices - a toast from here, and a separate
 *     dialog built inside GameActivity - so the same moment produced two
 *     different messages, or both at once.
 *
 * RATE LIMITING AND RE-ENTRY
 *     At most once per [WINDOW_MS], and never twice on top of itself. Without
 *     both guards, a player tapping "Watch Ad" repeatedly while offline would
 *     stack a dialog per tap and trap them in a queue of identical popups.
 *
 * The connectivity CHECK is not here - it lives in [AdPolicy.isOffline], which
 * requires a VALIDATED network rather than merely a connected one, so a
 * captive portal or a dropped data link is not mistaken for working wifi.
 */
object OfflineNotifier {
    private const val WINDOW_MS = 60_000L
    private const val TAG = "OfflineNotifier"

    private var lastShownAt = 0L

    /** The dialog currently on screen, so a second one can never stack on it. */
    @Volatile
    private var showing: androidx.appcompat.app.AlertDialog? = null

    /**
     * @param activity the screen to show it over. Must be a real, resumed
     *   Activity - a dialog needs one, and a dead one would throw.
     */
    fun announceOnce(activity: android.app.Activity) {
        try {
            if (activity.isFinishing || activity.isDestroyed) return
            val now = System.currentTimeMillis()
            // Guard the time window AND re-entry: this is called from the
            // WebView's JavaScript thread too, and two taps can race.
            synchronized(this) {
                if (showing?.isShowing == true) return
                if (now - lastShownAt < WINDOW_MS) return
                lastShownAt = now
            }
            activity.runOnUiThread {
                try {
                    // Re-check on the UI thread: the activity may have gone away
                    // between the rate-limit check and this post.
                    if (activity.isFinishing || activity.isDestroyed) return@runOnUiThread
                    if (showing?.isShowing == true) return@runOnUiThread
                    showing = com.google.android.material.dialog.MaterialAlertDialogBuilder(activity)
                        .setTitle("Network connection error")
                        .setMessage(
                            "An internet connection is needed to show this ad. " +
                                "The game still works without one - please check your " +
                                "network and try again."
                        )
                        .setPositiveButton("Okay", null)
                        .setCancelable(true)
                        .create()
                        .also { dialog ->
                            dialog.setOnDismissListener { synchronized(this) { showing = null } }
                        }
                    showing?.show()
                    android.util.Log.d(TAG, "Ad network-error popup shown")
                } catch (e: Exception) {
                    // A popup is never worth crashing a game over.
                    android.util.Log.w(TAG, "Network popup failed: ${e.message}")
                }
            }
        } catch (e: Exception) {
            android.util.Log.w(TAG, "Network popup failed: ${e.message}")
        }
    }

    /** Called when connectivity is restored, so the next attempt can speak again. */
    @JvmStatic
    fun reset() {
        synchronized(this) { lastShownAt = 0L }
    }
}
