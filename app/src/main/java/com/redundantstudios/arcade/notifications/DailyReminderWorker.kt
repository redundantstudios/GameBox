package com.redundantstudios.arcade.notifications

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.redundantstudios.arcade.util.ManifestParser
import com.redundantstudios.arcade.util.SettingsManager
import java.util.Calendar

/**
 * The daily reminder. Every rule here is a hard skip: if any of them trips,
 * the worker posts NOTHING and succeeds — it never reschedules itself into
 * spamming (the 24h periodic cadence comes from ReminderScheduler).
 */
class DailyReminderWorker(
    context: Context,
    params: WorkerParameters
) : Worker(context, params) {

    override fun doWork(): Result {
        val context = applicationContext

        // 1. Master switch off -> never post.
        if (!SettingsManager.remindersEnabled) return Result.success()

        // 2. Permission not granted -> nothing to do.
        if (!ArcadeNotifier.canPost(context)) return Result.success()

        // 3. The user opened the shell today -> no nudge needed.
        if (SettingsManager.lastOpenDay == SettingsManager.today()) return Result.success()

        // 4. Already nudged today -> dedupe.
        if (SettingsManager.lastNotifDay == SettingsManager.today()) return Result.success()

        // 5. Quiet hours 21:30 -> 09:00 -> skip.
        if (inQuietHours()) return Result.success()

        // 6. Need at least one installed game to talk about.
        val games = ManifestParser.scanGames(context)
        if (games.isEmpty()) return Result.success()

        // 7. Pick today's challenge deterministically (stable per day), post it.
        val dayIndex = SettingsManager.today().hashCode().let { if (it < 0) -it else it }
        val game = games[dayIndex % games.size]
        ArcadeNotifier.postDailyChallenge(context, game)
        return Result.success()
    }

    private fun inQuietHours(): Boolean {
        val now = Calendar.getInstance()
        val hour = now.get(Calendar.HOUR_OF_DAY)
        val minute = now.get(Calendar.MINUTE)
        val afterNightStart = hour > 21 || (hour == 21 && minute >= 30)
        val beforeMorning = hour < 9
        return afterNightStart || beforeMorning
    }
}
