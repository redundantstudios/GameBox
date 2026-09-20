package com.redundantstudios.arcade.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.os.Build

/**
 * Notification channels (Android 8+). Stable ids — never rename these, they
 * are per-install state once created.
 *
 * All gameplay channels use the custom marimba chime + vibration so they land
 * like a real game notification, not a silent system line. The dev channel
 * stays quiet by design (test surface, IMPORTANCE_MIN).
 */
object NotificationChannels {

    const val CH_DAILY = "arcade_daily"
    const val CH_STREAK = "arcade_streak"
    const val CH_NEWS = "arcade_news"
    const val CH_DEV = "arcade_dev"

    /** The custom "doorbell" — the shell's audible signature. */
    fun sound(context: Context): android.net.Uri =
        android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION)
            .let { default ->
                try {
                    val resId = context.resources.getIdentifier("notif_chime", "raw", context.packageName)
                    if (resId != 0) {
                        android.net.Uri.parse("android.resource://${context.packageName}/$resId")
                    } else default
                } catch (_: Exception) {
                    default
                }
            }

    fun ensure(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val audio = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        fun channel(id: String, name: String, importance: Int, sound: Boolean) {
            if (nm.getNotificationChannel(id) != null) return
            val ch = NotificationChannel(id, name, importance)
            if (sound) {
                ch.setSound(sound(context), audio)
                ch.enableVibration(true)
                ch.vibrationPattern = longArrayOf(0, 60, 70, 90)
            } else {
                ch.setSound(null, null)
                ch.enableVibration(false)
            }
            nm.createNotificationChannel(ch)
        }
        channel(CH_DAILY, "Daily challenge", NotificationManager.IMPORTANCE_HIGH, true)
        channel(CH_STREAK, "Come back and play", NotificationManager.IMPORTANCE_DEFAULT, true)
        channel(CH_NEWS, "New games & news", NotificationManager.IMPORTANCE_HIGH, true)
        channel(CH_DEV, "Developer tests", NotificationManager.IMPORTANCE_DEFAULT, true)
    }
}
