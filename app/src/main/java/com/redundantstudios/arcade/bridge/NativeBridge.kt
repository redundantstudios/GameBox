package com.redundantstudios.arcade.bridge

import android.content.Context
import android.content.SharedPreferences
import android.os.Vibrator
import android.os.VibrationEffect
import android.util.Log

class NativeBridge(private val context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("studio_games", Context.MODE_PRIVATE)
    private val hapticsEnabled: Boolean
        get() = prefs.getString("shell:settings", "")?.let { json ->
            try {
                android.util.JsonReader(java.io.StringReader(json)).apply {
                    beginObject()
                    var haptics = true
                    while (hasNext()) {
                        val name = nextName()
                        when (name) {
                            "haptics" -> haptics = nextBoolean()
                        }
                    }
                    endObject()
                    close()
                }
                haptics
            } catch (e: Exception) {
                true
            }
        } ?: true

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
    fun getSetting(key: String): String? {
        return prefs.getString(key, null)
    }

    @JavascriptInterface
    fun haptic(ms: Int) {
        if (!hapticsEnabled) {
            Log.d("NativeBridge", "Haptic suppressed: haptics master-off")
            return
        }
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
    fun exitGame() {
        NativeBridgeContext.exitHandler?.invoke()
    }
}