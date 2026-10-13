package com.redundantstudios.arcade.updates

import android.app.Activity
import android.content.Context
import android.content.IntentSender
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.IntentSenderRequest
import androidx.fragment.app.FragmentActivity
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
// Play Core 2.x moved these three out of ...core.appupdate into
// ...core.install.model. The 1.x paths still in most tutorials do not compile.
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability

/**
 * The only place in the app that talks to Play Core.
 *
 * Play only ever reports an update for a package that was installed **from
 * Google Play**. A sideloaded build - which is every `./deploy.bat` install -
 * reports [State.Unavailable], and that is the correct answer, not a bug.
 *
 * A note on what Play will and will not do, because it shapes this whole flow:
 * once the player accepts an immediate update, Play downloads, installs and
 * restarts on its own even if the app is closed mid-download. But it will not
 * install anything the player has never agreed to. So "ask once, then it keeps
 * itself current" is the strongest behaviour available, and that is what
 * [UpdateCoordinator] builds on.
 */
object AppUpdate {

    enum class State {
        /** Not installed from Play, Play Store absent, or the task failed. */
        Unavailable,

        /** Running the newest published version. */
        UpToDate,

        /** A newer version is published and can be installed. */
        Available,

        /** We started a flow and Play is still working on it. */
        InProgress,

        /** A flow was started but did not finish cleanly. */
        Failed,
    }

    /**
     * Ask Play what the current state is. Safe from a background [Context] -
     * only starting a flow needs an Activity.
     */
    fun check(context: Context, onState: (State) -> Unit) {
        try {
            AppUpdateManagerFactory.create(context).appUpdateInfo
                .addOnSuccessListener { info ->
                    onState(
                        when {
                            info.updateAvailability() ==
                                UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS ->
                                State.InProgress

                            info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE ->
                                State.Available

                            else -> State.UpToDate
                        }
                    )
                }
                .addOnFailureListener { onState(State.Unavailable) }
        } catch (_: Throwable) {
            // Play Store missing, not signed in, or a OEM store in the way.
            onState(State.Unavailable)
        }
    }

    /** versionCode of the update on offer, or 0 when there is nothing to offer. */
    fun availableVersionCode(context: Context, onResult: (Int) -> Unit) {
        try {
            AppUpdateManagerFactory.create(context).appUpdateInfo
                .addOnSuccessListener { info ->
                    onResult(
                        if (info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE) {
                            runCatching { info.availableVersionCode() }.getOrDefault(0)
                        } else 0
                    )
                }
                .addOnFailureListener { onResult(0) }
        } catch (_: Throwable) {
            onResult(0)
        }
    }

    /**
     * Whether Play will allow the immediate flow here. Some listings and some
     * staged rollouts only permit the flexible one - asking for a flow the app
     * is not allowed to start returns RESULT_IN_APP_UPDATE_FAILED, so we ask
     * first and let [start] fall back.
     */
    fun immediateAllowed(context: Context, onResult: (Boolean) -> Unit) {
        try {
            AppUpdateManagerFactory.create(context).appUpdateInfo
                .addOnSuccessListener { info ->
                    onResult(info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE))
                }
                .addOnFailureListener { onResult(false) }
        } catch (_: Throwable) {
            onResult(false)
        }
    }

    /**
     * Launch the update flow.
     *
     * IMMEDIATE is preferred: Play then finishes the job itself and restarts
     * the app, which is exactly the "it updates in the background and the app
     * restarts" behaviour we promise the player. If the listing does not allow
     * it we drop to FLEXIBLE, which downloads in the background while the
     * player keeps playing and is installed by [completeFlexible].
     *
     * Returns false when there was nothing to start, so the caller can fall
     * back to its own "check again later" behaviour.
     */
    fun start(
        activity: FragmentActivity,
        launcher: ActivityResultLauncher<IntentSenderRequest>,
        onOutcome: (Outcome) -> Unit
    ): Boolean {
        return try {
            val manager = AppUpdateManagerFactory.create(activity)
            manager.appUpdateInfo.addOnSuccessListener { info ->
                val resuming =
                    info.updateAvailability() ==
                        UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS

                if (info.updateAvailability() != UpdateAvailability.UPDATE_AVAILABLE && !resuming) {
                    onOutcome(Outcome.NothingToDo)
                    return@addOnSuccessListener
                }

                val type =
                    if (info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                        AppUpdateType.IMMEDIATE
                    } else {
                        AppUpdateType.FLEXIBLE
                    }

                try {
                    manager.startUpdateFlowForResult(
                        info,
                        launcher,
                        AppUpdateOptions.newBuilder(type).build()
                    )
                } catch (_: IntentSender.SendIntentException) {
                    onOutcome(Outcome.Failed)
                }
            }.addOnFailureListener { onOutcome(Outcome.Failed) }
            true
        } catch (_: Throwable) {
            onOutcome(Outcome.Failed)
            false
        }
    }

    /**
     * Install a FLEXIBLE update that finished downloading. No-op for anything
     * else, so it is safe to call unconditionally on resume.
     */
    fun completeFlexible(context: Context) {
        try {
            AppUpdateManagerFactory.create(context).appUpdateInfo
                .addOnSuccessListener { info ->
                    try {
                        if (info.installStatus() == InstallStatus.DOWNLOADED) {
                            AppUpdateManagerFactory.create(context).completeUpdate()
                        }
                    } catch (_: Throwable) {
                        // completeUpdate() throws when nothing is pending.
                    }
                }
        } catch (_: Throwable) {
        }
    }

    enum class Outcome {
        /** The player accepted; Play now owns the rest. */
        Started,

        /** The player declined, or closed the Play dialog. */
        Declined,

        /** The flow failed, or Play refused to start it. */
        Failed,

        /** Already on the newest version by the time we asked. */
        NothingToDo,
    }
}