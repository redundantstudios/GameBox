package com.redundantstudios.arcade.notifications

import android.content.Context
import android.os.Build
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.redundantstudios.arcade.updates.UpdateCheckWorker
import com.redundantstudios.arcade.util.SettingsManager
import java.util.Calendar
import java.util.concurrent.TimeUnit

/**
 * Schedules the daily reminder as an inexact periodic job (no exact alarms —
 * a reminder does not need SCHEDULE_EXACT_ALARM, which is restricted on
 * Android 12+). The initial delay lands the first run on the chosen slot;
 * the 24h period keeps it there every day.
 */
object ReminderScheduler {

    private const val UNIQUE_WORK = "arcade_daily_reminder"
    private const val UNIQUE_UPDATE_WORK = "arcade_update_check"

    fun schedule(context: Context) {
        val wm = WorkManager.getInstance(context)
        if (!SettingsManager.remindersEnabled) {
            wm.cancelUniqueWork(UNIQUE_WORK)
        } else {
            val request = PeriodicWorkRequestBuilder<DailyReminderWorker>(24, TimeUnit.HOURS)
                .setInitialDelay(delayUntilSlot(), TimeUnit.MILLISECONDS)
                .build()
            wm.enqueueUniquePeriodicWork(UNIQUE_WORK, ExistingPeriodicWorkPolicy.UPDATE, request)
        }
        scheduleUpdateCheck(wm)
    }

    /**
     * The update check runs on its own cadence, independent of the daily
     * reminder: someone who has turned reminders off should still hear about
     * a new version, because an update is not a nudge, it is news.
     *
     * Six hours is frequent enough to notice a rollout without hammering Play.
     * The notification inside is deduped per versionCode, so frequency costs
     * nothing visible.
     */
    private fun scheduleUpdateCheck(wm: WorkManager) {
        val request = PeriodicWorkRequestBuilder<UpdateCheckWorker>(6, TimeUnit.HOURS)
            .setInitialDelay(2, TimeUnit.HOURS)
            .build()
        wm.enqueueUniquePeriodicWork(
            UNIQUE_UPDATE_WORK,
            ExistingPeriodicWorkPolicy.UPDATE,
            request
        )
    }

    /** Minutes until the next occurrence of the chosen reminder slot. */
    private fun delayUntilSlot(): Long {
        val slot = SettingsManager.reminderSlot.let {
            when (it) {
                "Morning" -> 9 to 30
                "Afternoon" -> 15 to 30
                else -> 19 to 30
            }
        }
        val now = Calendar.getInstance()
        val target = now.clone() as Calendar
        target.set(Calendar.HOUR_OF_DAY, slot.first)
        target.set(Calendar.MINUTE, slot.second)
        target.set(Calendar.SECOND, 0)
        if (!target.after(now)) target.add(Calendar.DAY_OF_YEAR, 1)
        return target.timeInMillis - now.timeInMillis
    }

    fun slotTime(): Pair<Int, Int> = when (SettingsManager.reminderSlot) {
        "Morning" -> 9 to 30
        "Afternoon" -> 15 to 30
        else -> 19 to 30
    }
}
