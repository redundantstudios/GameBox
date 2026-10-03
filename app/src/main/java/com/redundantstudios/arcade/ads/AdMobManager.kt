package com.redundantstudios.arcade.ads

import android.app.Activity
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.FrameLayout
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.RequestConfiguration
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewardedinterstitial.RewardedInterstitialAd
import com.google.android.gms.ads.rewardedinterstitial.RewardedInterstitialAdLoadCallback

class AdMobManager(private val activity: Activity) {
    private val TAG = "AdMobManager"

    // LIVE AdMob unit IDs (app ca-app-pub-9565881819222312).
    // These were Google's public TEST ids until this change. Shipping a bundle
    // with test ids serves no real ads and earns nothing, so they are now the
    // real units for this AdMob application.
    //
    // Kept in one place so they can be swapped or reverted in a single edit.
    /* DEV vs LIVE.
       Debug builds use Google's public TEST units, which always serve sample
       ads. Live units only serve to authorised devices, so on a dev phone every
       request came back "code=3 / No fill" and ads looked dead in every game.
       Release builds use the real units. The app id itself is split the same
       way in app/build.gradle (manifestPlaceholders). */
    private val isDebug = com.redundantstudios.arcade.BuildConfig.DEBUG

    /* The rewarded unit is a REWARDED INTERSTITIAL, so the test unit must be
       Google's rewarded-INTERSTITIAL sample, not the plain rewarded one.
       ca-app-pub-3940256099942544/5224354917 is the plain rewarded sample and
       the SDK rejects it for this format (the load came back as a format
       mismatch, which is why Continue never showed an ad and fell through to
       its failure path).
         5224354917 = Rewarded            -> WRONG format here
         5354046379 = Rewarded interstitial -> correct
       Release keeps the live rewarded-interstitial unit. */
    private val rewardedUnitId =
        if (isDebug) "ca-app-pub-3940256099942544/5354046379"
        else "ca-app-pub-9565881819222312/9051900990"

    private val interstitialUnitId =
        if (isDebug) "ca-app-pub-3940256099942544/1033173712"
        else "ca-app-pub-9565881819222312/1364982660"

    /**
     * Marks this device as an AdMob TEST device in debug builds.
     *
     * WHY THIS EXISTS: every request was coming back
     *   AdMobManager: Interstitial failed: code=3 ... message=No fill
     * on a phone that was online and VALIDATED. The app is registered with its
     * real AdMob app id and these are its real units, but the device is not an
     * authorised test device, so Google's servers decline to serve anything to
     * it. That is why ads looked dead in EVERY game at once - the call sites
     * were all correct, the SDK was simply never allowed to return an ad.
     *
     * Registering the device makes Google's own sample ads serve, so the ad path
     * is genuinely exercised while developing instead of silently no-filling.
     * Debug builds only: a release build keeps live traffic on the real units.
     */
    private fun registerTestDeviceIfDebug() {
        if (!com.redundantstudios.arcade.BuildConfig.DEBUG) return
        try {
            val id = android.provider.Settings.Secure.getString(
                activity.contentResolver, android.provider.Settings.Secure.ANDROID_ID
            )
            if (id.isNullOrBlank()) {
                Log.w(TAG, "No ANDROID_ID - cannot register this device as a test device")
                return
            }
            MobileAds.setRequestConfiguration(
                RequestConfiguration.Builder().setTestDeviceIds(listOf(id)).build()
            )
            Log.d(TAG, "Registered this device as an AdMob test device (debug build)")
        } catch (e: Exception) {
            Log.w(TAG, "Test-device registration failed: " + e.message)
        }
    }

    init {
        /* Runs at construction, i.e. before GameActivity issues its first
           rewarded/interstitial load. Registering from inside loadRewardedAd()
           was too late: the first interstitial request went out unregistered
           and came back "No fill" before the registration had happened. */
        registerTestDeviceIfDebug()
    }

    /**
     * The ad request every load below uses. Kept in one place so the test-device
     * setting and any future request-level options stay consistent.
     */
    private fun request(): AdRequest = AdRequest.Builder().build()

    // Rewarded
    private var rewardedAd: RewardedInterstitialAd? = null
    private var isRewardedLoading = false

    // A rewarded request can arrive before the ad finished loading (the game
    // preloads asynchronously). Silently doing nothing there is exactly the bug
    // that made "watch ad for +1 undo / +1 erase" look dead: the game closed its
    // offer popover, no ad ever appeared and no callback ever came back. So we
    // remember the callbacks, show the ad the moment it arrives, and - if it
    // never arrives - release the game's waiting UI with an explicit
    // "unavailable" result it can show a message for.
    private class PendingReward(
        val onReward: () -> Unit,
        val onClosed: () -> Unit,
        val onUnavailable: () -> Unit
    )

    private var pendingReward: PendingReward? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private val pendingTimeoutRunnable = Runnable { failPendingReward("timed out waiting for the ad") }

    /** Releases a queued request that never got an ad, so no game hangs forever. */
    private fun failPendingReward(reason: String) {
        if (destroyed) return
        val queued = pendingReward ?: return
        pendingReward = null
        mainHandler.removeCallbacks(pendingTimeoutRunnable)
        Log.w(TAG, "Rewarded ad unavailable ($reason) - telling the game")
        activity.runOnUiThread { queued.onUnavailable() }
    }

    // Interstitial
    private var interstitialAd: InterstitialAd? = null
    private var isInterstitialLoading = false
    private var lastInterstitialTime = 0L

    /**
     * Minimum gap between two interstitials from the same game screen.
     *
     * Only long enough to stop a single tap registering twice. Every trigger
     * point is a deliberate tap on a game-over button, so a longer window would
     * only swallow ads the player explicitly asked for (see
     * showInterstitialInternal).
     */
    private val MIN_INTERSTITIAL_GAP_MS = 2500L

    /* A request that arrived before the ad was cached. It is held and shown the
       moment the load completes, so the first ad of a session is not lost to a
       race between "player tapped" and "SDK finished loading" - that race is
       exactly why no ad was appearing. */
    private var queuedInterstitial: (() -> Unit)? = null
    private val QUEUED_INTERSTITIAL_TIMEOUT_MS = 6000L
    private val queuedInterstitialTimeout = Runnable {
        val queued = queuedInterstitial ?: return@Runnable
        queuedInterstitial = null
        Log.w(TAG, "Queued interstitial never arrived - releasing the game")
        queued()
    }

    /* How long a queued rewarded request waits for the ad before giving up.

       This used to be 7s, and that was the cause of "the first balloon works,
       the rest don't": a rewarded-interstitial fetch that took 8s was declared a
       FAILURE, the game was told 'unavailable' and awarded nothing, and the ad
       that landed a second later had nobody waiting for it. The timeout is now
       only a safety net against a request that never resolves at all. */
    private val pendingTimeoutMs = 30000L

    /* A failed fetch is retried a few times with a growing gap instead of being
       written off. "No fill" is often momentary, and without a retry the next
       tap has nothing cached either - which is exactly the pattern reported. */
    private var rewardedLoadRetries = 0
    private val MAX_REWARDED_LOAD_RETRIES = 3
    private val rewardedRetryRunnable = Runnable { loadRewardedAd() }

    /**
     * True once the screen that owns this manager is gone. An ad load resolves
     * asynchronously, so a load started just before the game closed can call
     * back afterwards; every entry point checks this so no callback ever
     * touches a dead Activity.
     */
    @Volatile
    private var destroyed = false

    fun loadRewardedAd() {
        if (destroyed || isRewardedLoading || rewardedAd != null) return
        isRewardedLoading = true
        val adRequest = request()
        /* REWARDED INTERSTITIAL - not a plain Rewarded ad.
           The AdMob unit ca-app-pub-9565881819222312/9051900990 was created as a
           REWARDED INTERSTITIAL unit. Loading it with RewardedAd.load() is a
           format mismatch and the SDK rejects it outright: every request came
           back "Ad unit doesn't match format", so this unit could never serve.
           RewardedInterstitialAd is the API that matches this unit's type. */
        RewardedInterstitialAd.load(activity, rewardedUnitId,
            adRequest, object : RewardedInterstitialAdLoadCallback() {
                override fun onAdFailedToLoad(adError: LoadAdError) {
                    Log.e(TAG, describe("RewardedInterstitial", adError))
                    isRewardedLoading = false
                    rewardedAd = null
                    // Anyone already waiting on a tap must not be left hanging.
                    failPendingReward("load failed: ${adError.code}")
                    // Try again shortly. No fill and transient network errors are
                    // usually momentary; giving up on the first one left the next
                    // tap with no ad cached either.
                    if (!destroyed && rewardedLoadRetries < MAX_REWARDED_LOAD_RETRIES) {
                        rewardedLoadRetries++
                        val backoff = 1500L * rewardedLoadRetries
                        Log.d(TAG, "Retrying rewarded load in ${backoff}ms (attempt $rewardedLoadRetries)")
                        mainHandler.removeCallbacks(rewardedRetryRunnable)
                        mainHandler.postDelayed(rewardedRetryRunnable, backoff)
                    }
                }
                override fun onAdLoaded(ad: RewardedInterstitialAd) {
                    Log.d(TAG, "Rewarded ad loaded successfully")
                    isRewardedLoading = false
                    rewardedLoadRetries = 0
                    rewardedAd = ad
                    // A tap arrived while we were fetching: honour it now.
                    val queued = pendingReward
                    if (queued != null) {
                        pendingReward = null
                        mainHandler.removeCallbacks(pendingTimeoutRunnable)
                        Log.d(TAG, "Showing rewarded ad for the queued request")
                        showRewardedInternal(queued.onReward, queued.onClosed, queued.onUnavailable)
                    }
                }
            })
    }

    /**
     * NOTE: games call this through the WebView @JavascriptInterface bridge, which
     * runs on a background thread. AdMob's show() throws
     * "java.lang.IllegalStateException: #008 Must be called on the main UI thread",
     * which silently killed every rewarded ad (and therefore every theme unlock).
     * Everything below is marshalled onto the UI thread.
     */
    fun showRewardedAd(
        onRewardEarned: () -> Unit,
        onAdClosed: () -> Unit,
        onAdUnavailable: () -> Unit = onAdClosed
    ) {
        if (destroyed) return
        activity.runOnUiThread { showRewardedInternal(onRewardEarned, onAdClosed, onAdUnavailable) }
    }

    private fun showRewardedInternal(
        onRewardEarned: () -> Unit,
        onAdClosed: () -> Unit,
        onAdUnavailable: () -> Unit
    ) {
        if (destroyed) return
        val ad = rewardedAd
        if (ad == null) {
            Log.w(TAG, "Rewarded ad not loaded yet - queuing the request")
            pendingReward = PendingReward(onRewardEarned, onAdClosed, onUnavailable = onAdUnavailable)
            mainHandler.removeCallbacks(pendingTimeoutRunnable)
            mainHandler.postDelayed(pendingTimeoutRunnable, pendingTimeoutMs)
            loadRewardedAd()
            return
        }
        rewardedAd = null
        // Register the callback BEFORE show(), otherwise early events are missed.
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdShowedFullScreenContent() {
                // Cross-dissolve into the ad instead of a hard activity cut.
                activity.overridePendingTransition(
                    com.redundantstudios.arcade.R.anim.ad_fade_in,
                    com.redundantstudios.arcade.R.anim.ad_fade_out
                )
            }
            override fun onAdDismissedFullScreenContent() {
                Log.d(TAG, "Rewarded ad dismissed")
                // ...and cross-dissolve back into the game.
                activity.overridePendingTransition(
                    com.redundantstudios.arcade.R.anim.ad_fade_in,
                    com.redundantstudios.arcade.R.anim.ad_fade_out
                )
                loadRewardedAd()
                onAdClosed()
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                Log.e(TAG, "Rewarded ad failed to show: ${error.message}")
                loadRewardedAd()
                // The player never saw an ad, so this is "unavailable", not "closed".
                onAdUnavailable()
            }
        }
        ad.show(activity) { reward ->
            Log.d(TAG, "User earned reward: ${reward.amount} ${reward.type}")
            onRewardEarned()
        }
    }

    /**
     * Turns an AdMob load failure into a single readable line.
     *
     * "No fill" on its own is nearly useless for diagnosis - the same message
     * covers a brand-new ad unit with no inventory, a paused unit, a targeting
     * mismatch, or a consent problem. The numeric error code and the response
     * id are exactly what AdMob support asks for when investigating, and
     * neither was being logged, so every distinct failure looked identical.
     */
    private fun describe(format: String, error: LoadAdError): String {
        return "$format failed: code=${error.code} domain=${error.domain} " +
                "message=${error.message} responseId=${error.responseInfo?.responseId}"
    }

    private val MAX_INTERSTITIAL_LOAD_RETRIES = 3
    private var interstitialLoadRetries = 0
    private val interstitialRetryRunnable = Runnable { loadInterstitialAd() }

    fun loadInterstitialAd() {
        if (destroyed || isInterstitialLoading || interstitialAd != null) return
        isInterstitialLoading = true
        val adRequest = request()
        InterstitialAd.load(activity, interstitialUnitId,
            adRequest, object : InterstitialAdLoadCallback() {
                override fun onAdFailedToLoad(adError: LoadAdError) {
                    Log.e(TAG, describe("Interstitial", adError))
                    isInterstitialLoading = false
                    interstitialAd = null
                    // Release a queued request with a clear log, so a network
                    // problem is visible instead of looking like a dead button.
                    queuedInterstitial?.let { queued ->
                        queuedInterstitial = null
                        mainHandler.removeCallbacks(queuedInterstitialTimeout)
                        queued()
                    }
                    // Retry, like the rewarded load already does. Without this a
                    // single early "No fill" - which is normal, the first request
                    // often beats the ad inventory - left the interstitial dead
                    // for the WHOLE session, so Play Again / Home never showed
                    // anything even though the same unit works moments later.
                    if (!destroyed && interstitialLoadRetries < MAX_INTERSTITIAL_LOAD_RETRIES) {
                        interstitialLoadRetries++
                        val backoff = 1500L * interstitialLoadRetries
                        Log.d(TAG, "Retrying interstitial load in ${backoff}ms (attempt $interstitialLoadRetries)")
                        mainHandler.removeCallbacks(interstitialRetryRunnable)
                        mainHandler.postDelayed(interstitialRetryRunnable, backoff)
                    }
                }
                override fun onAdLoaded(ad: InterstitialAd) {
                    Log.d(TAG, "Interstitial ad loaded successfully")
                    isInterstitialLoading = false
                    interstitialLoadRetries = 0
                    interstitialAd = ad
                    // A request that was waiting for exactly this ad: show it now.
                    val queued = queuedInterstitial
                    if (queued != null) {
                        queuedInterstitial = null
                        mainHandler.removeCallbacks(queuedInterstitialTimeout)
                        lastInterstitialTime = System.currentTimeMillis()
                        showLoadedInterstitial(ad, queued)
                    }
                }
            })
    }

    fun showInterstitialAd(onAdClosed: () -> Unit) {
        if (destroyed) return
        // Same threading rule as rewarded ads: show() must run on the UI thread.
        activity.runOnUiThread { showInterstitialInternal(onAdClosed) }
    }

    private fun showInterstitialInternal(onAdClosed: () -> Unit) {
        val now = System.currentTimeMillis()
        val timeSinceLast = now - lastInterstitialTime

        /* DOUBLE-TAP GUARD ONLY.
           The real frequency cap (180s, one per session, never on exit, none on
           a first session) lives in AdPolicy and is checked by GameActivity
           BEFORE this method is reached. What is left here is just enough to
           stop one tap registering twice - a double-tap, or a game with two
           call sites firing in the same gesture. This used to be the entire
           policy at 2500ms, which is why a player could be shown an ad every
           few seconds and why "Play Again" showed one while "Home" seconds
           later silently did not. */
        if (timeSinceLast < MIN_INTERSTITIAL_GAP_MS) {
            Log.d(TAG, "Interstitial suppressed: same-tap guard (${timeSinceLast}ms ago)")
            onAdClosed()
            return
        }

        val ad = interstitialAd
        if (ad == null) {
            /* No ad cached yet. Preloading starts when the game opens, so this
               normally means the very first request beat the load. Show it as
               soon as it arrives rather than dropping the request. */
            Log.w(TAG, "Interstitial not loaded yet - queuing the request")
            queuedInterstitial = onAdClosed
            loadInterstitialAd()
            // Do not call onAdClosed here: the game is waiting on us, and it
            // advances when the ad actually shows. A 6s cap stops it hanging
            // forever if the network never delivers one.
            mainHandler.removeCallbacks(queuedInterstitialTimeout)
            mainHandler.postDelayed(queuedInterstitialTimeout, QUEUED_INTERSTITIAL_TIMEOUT_MS)
            return
        }
        interstitialAd = null
        lastInterstitialTime = System.currentTimeMillis()
        showLoadedInterstitial(ad, onAdClosed)
    }

    /**
     * Shows a loaded interstitial and wires the dismiss / fail paths.
     *
     * Extracted so the "request arrived after the load finished" and "request
     * arrived before it finished" paths share ONE implementation. As two copies
     * they could drift, and one would quietly do nothing - which is how the
     * first ad of a session went missing.
     */
    private fun showLoadedInterstitial(ad: InterstitialAd, onAdClosed: () -> Unit) {
        if (destroyed) {
            onAdClosed()
            return
        }
        // Register the callback BEFORE show(), otherwise early events are missed.
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdShowedFullScreenContent() {
                activity.overridePendingTransition(
                    com.redundantstudios.arcade.R.anim.ad_fade_in,
                    com.redundantstudios.arcade.R.anim.ad_fade_out
                )
            }
            override fun onAdDismissedFullScreenContent() {
                Log.d(TAG, "Interstitial ad dismissed")
                activity.overridePendingTransition(
                    com.redundantstudios.arcade.R.anim.ad_fade_in,
                    com.redundantstudios.arcade.R.anim.ad_fade_out
                )
                loadInterstitialAd()
                onAdClosed()
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                Log.e(TAG, "Interstitial ad failed to show: ${error.message}")
                loadInterstitialAd()
                onAdClosed()
            }
        }
        ad.show(activity)
    }

    /**
     * Hand-back for everything this manager asked the SDK for.
     *
     * Called once the game screen is gone (see `GameActivity.releaseSurface`).
     * Without it, every open/close cycle left the rewarded and interstitial
     * objects the SDK was holding on the SDK's behalf, and a few cycles of that
     * is what turned into the shell and the running game stuttering.
     *
     * Runs on the UI thread (the screen's teardown).
     */
    fun destroy() {
        destroyed = true
        mainHandler.removeCallbacks(pendingTimeoutRunnable)
        pendingReward = null
        rewardedAd = null
        interstitialAd = null
    }
}
