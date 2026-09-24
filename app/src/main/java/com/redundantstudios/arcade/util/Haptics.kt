package com.redundantstudios.arcade.util

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

object Haptics {

    /** Feedback burst matching the current profile — used as a live preview in Settings. */
    fun preview(context: Context) {
        if (!SettingsManager.vibrationEnabled) return
        val (durationMs, amplitude) = when (SettingsManager.hapticProfile) {
            "Soft" -> 15L to 96
            "Heavy" -> 60L to 255
            else -> 30L to 160 // Crisp
        }
        vibrate(context, durationMs, amplitude)
    }

    /** Short UI tap (cards, buttons). */
    fun tap(context: Context) {
        if (!SettingsManager.vibrationEnabled) return
        vibrate(context, 20L, 160)
    }

    private fun vibrate(context: Context, durationMs: Long, amplitude: Int) {
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            manager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(durationMs, amplitude))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(durationMs)
        }
    }
}
