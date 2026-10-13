package com.redundantstudios.arcade.updates

import android.app.Activity
import android.app.AlertDialog
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.FragmentActivity
import com.redundantstudios.arcade.BuildConfig
import com.redundantstudios.arcade.R
import com.redundantstudios.arcade.notifications.ArcadeNotifier
import com.redundantstudios.arcade.util.SettingsManager

/**
 * Drives the whole update conversation from one place:
 *
 *  - cold start, notice an upgrade and show the "you\'re up to date" popup;
 *  - home screen, notice an available release and offer it once;
 *  - on resume, install any FLEXIBLE download that finished, and resume a flow
 *    that was interrupted;
 *  - backstop, install a FLEXIBLE update that is sitting downloaded.
 *
 * Rate limiting is by versionCode, not by time: a release is offered once,
 * however many times the app is opened afterwards.
 */
/**
 * Deliberately a [FragmentActivity], not a plain `Activity`.
 * `registerForActivityResult` is a ComponentActivity method, and the Play
 * update flow needs it - typing this as `Activity` does not compile.
 */
class UpdateCoordinator(private val activity: FragmentActivity) {

    private val launcher: ActivityResultLauncher<IntentSenderRequest> =
        activity.registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { result ->
            when (result.resultCode) {
                Activity.RESULT_OK ->
                    // Play takes over: it installs and restarts the app. The
                    // completion popup is detected on the next cold start.
                    Unit

                Activity.RESULT_CANCELED ->
                    // "Later". Play closes; we simply do not ask again for
                    // this versionCode.
                    Unit

                else ->
                    // RESULT_IN_APP_UPDATE_FAILED, or a flow that Play refused.
                    // Do not retry in a loop - the background worker will pick
                    // it up and the next cold start will offer it again.
                    Unit
            }
        }

    /**
     * Call once, after the home screen exists.
     *
     * Order matters: the "up to date" popup first, because arriving in a new
     * version is the more important thing to tell someone, and the "ready to
     * update" prompt can wait until they have read it.
     */
    fun onHomeReady() {
        maybeShowCompleted()
        maybeOfferUpdate()
    }

    /**
     * Play restarts the app after installing, so there is no callback to hook.
     * The only reliable signal is the versionCode this process is running
     * being newer than the one we last stamped - and null last-seen means a
     * fresh install, which must never be treated as an upgrade.
     */
    private fun maybeShowCompleted() {
        val seen = SettingsManager.lastSeenVersion
        val running = BuildConfig.VERSION_CODE

        if (seen == null) {
            // First launch of this install. Stamp it; nothing to celebrate.
            SettingsManager.lastSeenVersion = running
            return
        }

        if (running <= seen) {
            // Ordinary launch, or we already stamped this version.
            SettingsManager.lastSeenVersion = running
            return
        }

        // Genuine upgrade.
        SettingsManager.lastSeenVersion = running
        if (SettingsManager.updateCompletedShown) return
        SettingsManager.updateCompletedShown = true

        AlertDialog.Builder(activity)
            .setTitle(R.string.update_done_title)
            .setMessage(R.string.update_done_body)
            .setPositiveButton(R.string.update_done_action) { _, _ ->
                ArcadeNotifier.postUpdateComplete(activity)
            }
            .setNegativeButton(R.string.not_now, null)
            .show()
    }

    private fun maybeOfferUpdate() {
        AppUpdate.check(activity) { state ->
            when (state) {
                AppUpdate.State.Available -> {
                    AppUpdate.availableVersionCode(activity) { offered ->
                        if (offered <= 0) return@availableVersionCode
                        if (SettingsManager.updatePromptedVersion == offered) return@availableVersionCode
                        // Stamp before showing, not after: if the dialog is
                        // killed by a rotation we still do not re-ask.
                        SettingsManager.updatePromptedVersion = offered
                        showOffer()
                    }
                }

                AppUpdate.State.InProgress ->
                    // A flow we started earlier was interrupted. Pick it back
                    // up rather than stacking a second dialog on top.
                    AppUpdate.start(activity, launcher) { }

                else -> Unit
            }
        }
    }

    private fun showOffer() {
        AlertDialog.Builder(activity)
            .setTitle(R.string.update_title)
            .setMessage(R.string.update_body)
            .setPositiveButton(R.string.update_now) { _, _ ->
                startFlow()
            }
            .setNegativeButton(R.string.update_later, null)
            .show()
    }

    private fun startFlow() {
        AppUpdate.start(activity, launcher) { outcome ->
            when (outcome) {
                AppUpdate.Outcome.Started -> Unit
                AppUpdate.Outcome.Declined -> Unit
                AppUpdate.Outcome.Failed ->
                    ArcadeNotifier.postUpdateAvailable(activity, force = true)
                AppUpdate.Outcome.NothingToDo -> Unit
            }
        }
    }

    /**
     * Call from onResume on every entry point, as the Play docs require.
     *
     * - A FLEXIBLE update that finished downloading gets installed here.
     * - An interrupted flow is resumed.
     */
    fun onResume() {
        AppUpdate.completeFlexible(activity)
    }
}