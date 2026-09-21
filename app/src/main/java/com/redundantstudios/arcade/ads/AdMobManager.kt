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
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback

class AdMobManager(private val activity: Activity) {
    private val TAG = "AdMobManager"

    // Ad unit IDs (Google's test IDs - swap for the real ones before release)
    private val rewardedUnitId = "ca-app-pub-3940256099942544/5224354917"
    private val interstitialUnitId = "ca-app-pub-3940256099942544/1033173712"
    private val bannerUnitId = "ca-app-pub-3940256099942544/6300978111"

    // Rewarded
    private var rewardedAd: RewardedAd? = null
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
    private val sessionStartTime = System.currentTimeMillis()

    /** How long a queued rewarded request waits for the ad before giving up. */
    private val pendingTimeoutMs = 7000L

    fun loadRewardedAd() {
        if (isRewardedLoading || rewardedAd != null) return
        isRewardedLoading = true
        val adRequest = AdRequest.Builder().build()
        RewardedAd.load(activity, rewardedUnitId,
            adRequest, object : RewardedAdLoadCallback() {
                override fun onAdFailedToLoad(adError: LoadAdError) {
                    Log.e(TAG, "Rewarded ad failed to load: ${adError.message}")
                    isRewardedLoading = false
                    rewardedAd = null
                    // Anyone already waiting on a tap must not be left hanging.
                    failPendingReward("load failed: ${adError.code}")
                }
                override fun onAdLoaded(ad: RewardedAd) {
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
        activity.runOnUiThread { showRewardedInternal(onRewardEarned, onAdClosed, onAdUnavailable) }
    }

    private fun showRewardedInternal(
        onRewardEarned: () -> Unit,
        onAdClosed: () -> Unit,
        onAdUnavailable: () -> Unit
    ) {
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

    fun loadInterstitialAd() {
        if (isInterstitialLoading || interstitialAd != null) return
        isInterstitialLoading = true
        val adRequest = AdRequest.Builder().build()
        InterstitialAd.load(activity, interstitialUnitId,
            adRequest, object : InterstitialAdLoadCallback() {
                override fun onAdFailedToLoad(adError: LoadAdError) {
                    Log.e(TAG, "Interstitial ad failed to load: ${adError.message}")
                    isInterstitialLoading = false
                    interstitialAd = null
                }
                override fun onAdLoaded(ad: InterstitialAd) {
                    Log.d(TAG, "Interstitial ad loaded successfully")
                    isInterstitialLoading = false
                    interstitialAd = ad
                }
            })
    }

    fun showInterstitialAd(onAdClosed: () -> Unit) {
        // Same threading rule as rewarded ads: show() must run on the UI thread.
        activity.runOnUiThread { showInterstitialInternal(onAdClosed) }
    }

    private fun showInterstitialInternal(onAdClosed: () -> Unit) {
        val now = System.currentTimeMillis()
        val timeSinceStart = now - sessionStartTime
        val timeSinceLast = now - lastInterstitialTime

        if (timeSinceStart < 60000) {
            Log.d(TAG, "Interstitial blocked: too early in session")
            onAdClosed()
            return
        }
        if (timeSinceLast < 120000) {
            Log.d(TAG, "Interstitial blocked: frequency cap")
            onAdClosed()
            return
        }

        val ad = interstitialAd
        if (ad == null) {
            Log.w(TAG, "Interstitial ad not loaded yet")
            loadInterstitialAd()
            onAdClosed()
            return
        }
        interstitialAd = null
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
                lastInterstitialTime = System.currentTimeMillis()
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
        val adView = AdView(activity).apply {
            // AdSize expects width in dp, not raw pixels
            val density = activity.resources.displayMetrics.density
            val widthDp = (activity.resources.displayMetrics.widthPixels / density).toInt()
            setAdSize(AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, widthDp))
            adUnitId = bannerUnitId
            adListener = object : AdListener() {
                override fun onAdLoaded() {
                    Log.d(TAG, "Banner ad loaded")
                    onLoaded?.invoke()
                }
                override fun onAdFailedToLoad(adError: LoadAdError) {
                    Log.e(TAG, "Banner ad failed to load: ${adError.message}")
                }
            }
        }
        container.addView(adView)
        adView.loadAd(AdRequest.Builder().build())
    }
}
