package com.redundantstudios.arcade.ui

import android.app.Activity
import android.os.Build
import android.view.ViewGroup
import com.redundantstudios.arcade.R

/**
 * The shell's screen-change motion, kept in one place.
 *
 * Why this exists: Android 14 (API 34) replaced `overridePendingTransition` with
 * `overrideActivityTransition`, and for apps that target SDK 34+ the old call is
 * ignored. The theme still declares `windowAnimationStyle`, but on new devices
 * that alone left the shell hard-cutting between screens. So every screen change
 * goes through here, and [playEnter] backstops it with a plain View animation
 * that cannot be ignored by any platform transition policy.
 */
object ShellTransition {

    /** Long enough to read as motion, short enough to never feel slow. */
    private const val ENTER_MS = 320L

    /** Call right after `startActivity(...)` on the screen opening the next one. */
    fun open(activity: Activity) = overrideTransitions(activity, Activity.OVERRIDE_TRANSITION_OPEN)

    /** Call right before `finish()` on the screen that is closing. */
    fun close(activity: Activity) = overrideTransitions(activity, Activity.OVERRIDE_TRANSITION_CLOSE)

    /**
     * Arms this screen's own open/close animation. Called from
     * [ThemedActivity.onCreate] so a screen is animated even when something
     * starts it without going through [open] / [close].
     */
    fun armSelf(activity: Activity) {
        if (!supportsExplicitTransitions()) return
        overrideTransitions(activity, Activity.OVERRIDE_TRANSITION_OPEN)
        overrideTransitions(activity, Activity.OVERRIDE_TRANSITION_CLOSE)
    }

    private fun overrideTransitions(activity: Activity, type: Int) {
        if (supportsExplicitTransitions()) {
            activity.overrideActivityTransition(type, R.anim.fade_in, R.anim.fade_out)
            return
        }
        @Suppress("DEPRECATION")
        activity.overridePendingTransition(R.anim.fade_in, R.anim.fade_out)
    }

    private fun supportsExplicitTransitions() =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE

    /**
     * Dissolves a freshly created screen's content in over the shell background.
     *
     * Alpha only, on purpose: the shell background is painted on this same root
     * view, so translating or scaling it would drag the gradient and expose the
     * window colour at the edges. A dissolve keeps the page anchored while the
     * new content settles in.
     */
    fun playEnter(activity: Activity) {
        val content = activity.findViewById<ViewGroup>(android.R.id.content) ?: return
        val root = content.getChildAt(0) ?: return
        root.alpha = 0f
        root.animate().alpha(1f).setDuration(ENTER_MS).start()
    }
}
