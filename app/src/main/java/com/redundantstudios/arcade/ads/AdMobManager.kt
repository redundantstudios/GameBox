package com.redundantstudios.arcade.ads

import android.app.Activity
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.ViewGroup
import android.widget.FrameLayout
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
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
    private val rewardedUnitId = "ca-app-pub-9565881819222312/9051900990"
    private val interstitialUnitId = "ca-app-pub-9565881819222312/1364982660"
    private val bannerUnitId = "ca-app-pub-9565881819222312/7621425947"

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

    /** How long a queued rewarded request waits for the ad before giving up. */
    private val pendingTimeoutMs = 7000L

    /**
     * The banner this manager put on screen. An AdView is a live view holding
     * its own Activity, so it is kept here to be handed back with the screen
     * instead of being dropped (see [destroy]).
     */
    private var bannerView: AdView? = null

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
        val adRequest = AdRequest.Builder().build()
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
                }
                override fun onAdLoaded(ad: RewardedInterstitialAd) {
                    Log.d(TAG, "Rewarded ad loaded successfully")
                    isRewardedLoading = false
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

    fun loadInterstitialAd() {
        if (destroyed || isInterstitialLoading || interstitialAd != null) return
        isInterstitialLoading = true
        val adRequest = AdRequest.Builder().build()
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
                }
                override fun onAdLoaded(ad: InterstitialAd) {
                    Log.d(TAG, "Interstitial ad loaded successfully")
                    isInterstitialLoading = false
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

        /* FREQUENCY CAPS.
           These used to hard-block the FIRST ad of a session outright
           (timeSinceStart < 60000), which is why no ad ever appeared: the
           player finished a match, tapped PLAY AGAIN inside a minute, and the
           request was discarded with a log line nobody reads. Every session's
           first interstitial is now allowed, and the guard only limits how
           OFTEN they repeat.

           60s between interstitials is still a sane cap - it is well inside
           Google's policy guidance - but it must not swallow the first one. */
        if (timeSinceLast < 60000) {
            Log.d(TAG, "Interstitial blocked: shown less than 60s ago")
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

    fun loadBannerAd(container: ViewGroup, onLoaded: (() -> Unit)? = null) {
        if (destroyed) return
        val adView = AdView(activity).apply {
            // AdSize expects width in dp, not raw pixels
            val density = activity.resources.displayMetrics.density
            val widthDp = (activity.resources.displayMetrics.widthPixels / density).toInt()
            setAdSize(AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, widthDp))
            adUnitId = bannerUnitId
            adListener = object : AdListener() {
                override fun onAdLoaded() {
                    Log.d(TAG, "Banner ad loaded")
                    // The game screen may already be gone (it left while the
                    // banner was still loading).
                    if (!destroyed) onLoaded?.invoke()
                }
                override fun onAdFailedToLoad(adError: LoadAdError) {
                    Log.e(TAG, describe("Banner", adError))
                }
            }
        }
        container.addView(adView)
        bannerView = adView
        adView.loadAd(AdRequest.Builder().build())
    }

    /**
     * Hand-back for everything this manager asked the SDK for.
     *
     * Called once the game screen is gone (see `GameActivity.releaseSurface`).
     * Without it, every open/close cycle left behind a banner AdView - and with
     * an AdView, the whole Activity that owns it - plus the rewarded and
     * interstitial objects the SDK was holding on its behalf. A few cycles of
     * that is what turned into the shell and the running game stuttering.
     *
     * Runs on the UI thread (the screen's teardown), which is where
     * `AdView.destroy()` is required to be called.
     */
    fun destroy() {
        destroyed = true
        mainHandler.removeCallbacks(pendingTimeoutRunnable)
        pendingReward = null
        rewardedAd = null
        interstitialAd = null
        bannerView?.let { view ->
            (view.parent as? ViewGroup)?.removeView(view)
            view.destroy()
        }
        bannerView = null
    }
}
