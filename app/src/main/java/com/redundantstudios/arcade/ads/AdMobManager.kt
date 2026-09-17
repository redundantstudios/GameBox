package com.redundantstudios.arcade.ads

import android.app.Activity
import android.util.Log
import android.view.ViewGroup
import android.widget.FrameLayout
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback

class AdMobManager(private val activity: Activity) {
    private val TAG = "AdMobManager"

    // Rewarded
    private var rewardedAd: RewardedAd? = null
    private var isRewardedLoading = false

    // Interstitial
    private var interstitialAd: InterstitialAd? = null
    private var isInterstitialLoading = false
    private var lastInterstitialTime = 0L
    private var sessionStartTime = System.currentTimeMillis()

    fun loadRewardedAd() {
        if (isRewardedLoading || rewardedAd != null) return
        isRewardedLoading = true
        val adRequest = AdRequest.Builder().build()
        RewardedAd.load(activity, "ca-app-pub-3940256099942544/5224354917",
            adRequest, object : RewardedAdLoadCallback() {
                override fun onAdFailedToLoad(adError: LoadAdError) {
                    Log.e(TAG, "Rewarded ad failed to load: ${adError.message}")
                    isRewardedLoading = false
                    rewardedAd = null
                }
                override fun onAdLoaded(ad: RewardedAd) {
                    Log.d(TAG, "Rewarded ad loaded successfully")
                    isRewardedLoading = false
                    rewardedAd = ad
                }
            })
    }

    fun showRewardedAd(onRewardEarned: () -> Unit, onAdClosed: () -> Unit) {
        rewardedAd?.let { ad ->
            ad.show(activity) { reward ->
                Log.d(TAG, "User earned reward: ${reward.amount}")
                onRewardEarned()
            }
            ad.fullScreenContentCallback = object : com.google.android.gms.ads.FullScreenContentCallback() {
                override fun onAdDismissedFullScreenContent() {
                    Log.d(TAG, "Rewarded ad dismissed")
                    rewardedAd = null
                    loadRewardedAd()
                    onAdClosed()
                }
                override fun onAdFailedToShowFullScreenContent(error: com.google.android.gms.ads.AdError) {
                    Log.e(TAG, "Rewarded ad failed to show: ${error.message}")
                    rewardedAd = null
                    loadRewardedAd()
                    onAdClosed()
                }
            }
        } ?: run {
            Log.w(TAG, "Rewarded ad not loaded yet")
            onAdClosed()
        }
    }

    fun loadInterstitialAd() {
        if (isInterstitialLoading || interstitialAd != null) return
        isInterstitialLoading = true
        val adRequest = AdRequest.Builder().build()
        InterstitialAd.load(activity, "ca-app-pub-3940256099942544/1033173712",
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

        interstitialAd?.let { ad ->
            ad.show(activity)
            ad.fullScreenContentCallback = object : com.google.android.gms.ads.FullScreenContentCallback() {
                override fun onAdDismissedFullScreenContent() {
                    Log.d(TAG, "Interstitial ad dismissed")
                    lastInterstitialTime = System.currentTimeMillis()
                    interstitialAd = null
                    loadInterstitialAd()
                    onAdClosed()
                }
                override fun onAdFailedToShowFullScreenContent(error: com.google.android.gms.ads.AdError) {
                    Log.e(TAG, "Interstitial ad failed to show: ${error.message}")
                    interstitialAd = null
                    loadInterstitialAd()
                    onAdClosed()
                }
            }
        } ?: run {
            Log.w(TAG, "Interstitial ad not loaded yet")
            onAdClosed()
        }
    }

    fun loadBannerAd(container: ViewGroup, onLoaded: (() -> Unit)? = null) {
        val adView = AdView(activity).apply {
            setAdSize(AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdUnitWidth(activity)))
            adUnitId = "ca-app-pub-3940256099942544/6300978111"
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
