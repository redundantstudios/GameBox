package com.redundantstudios.arcade.bridge

import android.content.Context
import android.content.SharedPreferences
import android.os.Vibrator
import android.os.VibrationEffect
import android.os.Build
import android.os.VibratorManager
import android.webkit.JavascriptInterface
import android.util.Log

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

    @JavascriptInterface
    fun showRewardedAd(callback: String) {
        Log.d("NativeBridge", "Rewarded ad requested. Callback: $callback")
        NativeBridgeContext.adHandler?.invoke(callback)
    }

    @JavascriptInterface
    fun showInterstitial(callback: String) {
        Log.d("NativeBridge", "Interstitial ad requested. Callback: $callback")
        NativeBridgeContext.interstitialHandler?.invoke(callback)
    }

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
}

// Simple singleton to hold handlers for async JS calls
object NativeBridgeContext {
    var callback: ((String, String) -> Unit)? = null
    var exitHandler: (() -> Unit)? = null
    var adHandler: ((String) -> Unit)? = null
    var interstitialHandler: ((String) -> Unit)? = null
    var bannerHandler: ((Boolean) -> Unit)? = null
}
