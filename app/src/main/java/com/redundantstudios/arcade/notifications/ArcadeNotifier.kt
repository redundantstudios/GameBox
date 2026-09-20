package com.redundantstudios.arcade.notifications

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.redundantstudios.arcade.MainActivity
import com.redundantstudios.arcade.R
import com.redundantstudios.arcade.model.GameManifest
import com.redundantstudios.arcade.util.SettingsManager

/**
 * Builds and posts the shell's local notifications. 100% local: no FCM, no
 * server. Every notification deep-links into the shell via
 * [MainActivity.EXTRA_NOTIF_ROUTE].
 *
 * Sound + vibration come from the channel definition (custom marimba chime);
 * on pre-O devices they are set per-notification below.
 */
object ArcadeNotifier {

    private var nextId = 1000

    /** True when the OS will actually let us post (API 33 runtime permission). */
    fun canPost(context: Context): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
                PackageManager.PERMISSION_GRANTED
        } else {
            NotificationManagerCompat.from(context).areNotificationsEnabled()
        }

    // ------------------------------------------------------------------
    // Re-engagement (max 1/day - stamped by the worker)
    // ------------------------------------------------------------------

    fun postDailyChallenge(context: Context, game: GameManifest) {
        post(
            context,
            NotificationChannels.CH_DAILY,
            "Today's ${game.title} challenge is ready",
            "One board, a few minutes. Beat your best run!",
            "game:${game.id}"
        )
        SettingsManager.lastNotifDay = SettingsManager.today()
    }

    fun postStreakSave(context: Context, days: Int) {
        post(
            context,
            NotificationChannels.CH_STREAK,
            "Your ${days}-day streak ends tonight",
            "Two minutes is all it takes to keep it alive.",
            "home"
        )
        SettingsManager.lastNotifDay = SettingsManager.today()
    }

    // ------------------------------------------------------------------
    // News (fires once per new game id, on app start)
    // ------------------------------------------------------------------

    fun postNews(context: Context, game: GameManifest, moreCount: Int) {
        val title = if (moreCount > 0) {
            "${game.title} and $moreCount more just landed"
        } else {
            "${game.title} just landed in the arcade"
        }
        post(context, NotificationChannels.CH_NEWS, title, "Fresh on the shelf - give it a spin!", "game:${game.id}")
    }

    // ------------------------------------------------------------------
    // Developer test
    // ------------------------------------------------------------------

    fun postDevTest(context: Context) {
        post(
            context,
            NotificationChannels.CH_DEV,
            "Test notification",
            "If you can read this, notifications are wired up.",
            "home"
        )
    }

    // ------------------------------------------------------------------

    private fun post(context: Context, channel: String, title: String, body: String, route: String) {
        if (!canPost(context)) return

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(MainActivity.EXTRA_NOTIF_ROUTE, route)
        }
        val pending = PendingIntent.getActivity(
            context,
            (route.hashCode() + System.currentTimeMillis().toInt()) and 0x7fffffff,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val builder = NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(0xFF4CAF50.toInt())
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(pending)
            .setAutoCancel(true)

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            // Channels own sound/vibration on O+; below that we set them here.
            @Suppress("DEPRECATION")
            builder.setDefaults(NotificationCompat.DEFAULT_ALL)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
        }

        val notification = builder.build()

        try {
            NotificationManagerCompat.from(context).notify(nextId++, notification)
        } catch (_: SecurityException) {
        }
    }
}

