package com.redundantstudios.arcade.ads

import android.app.Activity
import android.util.Log
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback

class AdMobManager(private val activity: Activity) {
    private val TAG = "AdMobManager"
    private var rewardedAd: RewardedAd? = null
    private var isLoading = false

    fun loadRewardedAd() {
        if (isLoading || rewardedAd != null) return

        isLoading = true
        val adRequest = AdRequest.Builder().build()

        RewardedAd.load(activity, "ca-app-pub-3940256099942544/5224354917",
            adRequest, object : RewardedAdLoadCallback() {
                override fun onAdFailedToLoad(adError: LoadAdError) {
                    Log.e(TAG, "Rewarded ad failed to load: ${adError.message}")
                    isLoading = false
                    rewardedAd = null
                }

                override fun onAdLoaded(ad: RewardedAd) {
                    Log.d(TAG, "Rewarded ad loaded successfully")
                    isLoading = false
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
}
