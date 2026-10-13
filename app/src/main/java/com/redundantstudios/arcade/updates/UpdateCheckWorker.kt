package com.redundantstudios.arcade.updates

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.redundantstudios.arcade.notifications.ArcadeNotifier
import com.redundantstudios.arcade.util.SettingsManager

/**
 * Background update check, every six hours.
 *
 * Only ever runs on a package installed from Play - anything else gets
 * [AppUpdate.State.Unavailable] and this worker does nothing. Cheap enough to
 * run often; the notification is deduped per offered versionCode.
 */
class UpdateCheckWorker(
    context: Context,
    params: WorkerParameters
) : Worker(context, params) {

    override fun doWork(): Result {
        val context = applicationContext

        if (!ArcadeNotifier.canPost(context)) return Result.success()

        // Nothing to say to someone who never asked to hear from us.
        if (!SettingsManager.newsEnabled) return Result.success()

        AppUpdate.check(context) { state ->
            if (state != AppUpdate.State.Available) return@check
            AppUpdate.availableVersionCode(context) { offered ->
                if (offered <= 0) return@availableVersionCode
                // Already offered in-app for this release, or already announced.
                if (SettingsManager.updatePromptedVersion == offered) return@availableVersionCode
                if (SettingsManager.updateNotifiedVersion == offered) return@availableVersionCode
                SettingsManager.updateNotifiedVersion = offered
                ArcadeNotifier.postUpdateAvailable(context, force = true)
            }
        }

        return Result.success()
    }
}

/**
 * Fires when Play installs an update, so "the update finished" reaches the
 * player even if they do not reopen the app straight away.
 *
 * The cold-start comparison in [UpdateCoordinator] is the backstop for the
 * case where this is missed (the receiver does not fire when the update
 * arrives as part of a Play-driven restart on some OEM builds).
 */
class PackageReplacedReceiver : android.content.BroadcastReceiver() {
    override fun onReceive(ctx: Context?, intent: android.content.Intent?) {
        val context = ctx ?: return
        if (intent?.action != android.content.Intent.ACTION_MY_PACKAGE_REPLACED) return
        if (!ArcadeNotifier.canPost(context)) return
        // Never announce an update to an install that has only just arrived.
        if (SettingsManager.lastSeenVersion == null) return
        ArcadeNotifier.postUpdateComplete(context)
    }
}