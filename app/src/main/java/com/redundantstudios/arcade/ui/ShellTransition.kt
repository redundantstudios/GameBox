package com.redundantstudios.arcade.ui

import android.app.Activity
import android.os.Build
import com.redundantstudios.arcade.R

/**
 * The shell's navigation motion, kept in one place.
 *
 * Shell pages: a SLIDE language. Forward (deeper) navigation pushes a page in
 * from the right while the page beneath eases 30% to the left - parallax, so the
 * two pages read as one surface moving. Back pops the page out to the right and
 * brings the page beneath back from the left. Pure translation, no alpha and no
 * blur: nothing dissolves, and a translation is the cheapest window animation
 * there is, so it stays perfectly smooth.
 *
 * Games: a PORTRAIT game slides exactly like every other page - its branded page
 * pushes in from the right while the page it came from eases away (see
 * [openGame]). A LANDSCAPE game plays NO window animation at all: its transition
 * is the display turning itself, and any window animation underneath that turn
 * could only fight it.
 *
 * Why this exists: Android 14 (API 34) replaced `overridePendingTransition`
 * with `overrideActivityTransition`, and for apps that target SDK 34+ the old
 * call is ignored. The theme still declares `windowAnimationStyle` (see
 * `NavWindowAnim`), but this makes the motion explicit for every screen change.
 */
object ShellTransition {

    // ---- Shell pages: slide ------------------------------------------------

    /** Call right after `startActivity(...)` on the screen opening the next one. */
    fun open(activity: Activity) {
        overrideTransitions(
            activity,
            Activity.OVERRIDE_TRANSITION_OPEN,
            R.anim.nav_in_right,
            R.anim.nav_out_left
        )
    }

    /** Call right before `finish()` on the screen that is closing. */
    fun close(activity: Activity) {
        overrideTransitions(
            activity,
            Activity.OVERRIDE_TRANSITION_CLOSE,
            R.anim.nav_in_left,
            R.anim.nav_out_right
        )
    }

    /**
     * Arms this screen's own open/close animation. Called from
     * [ThemedActivity.onCreate] so a screen slides even when something starts it
     * without going through [open] / [close].
     */
    fun armSelf(activity: Activity) {
        overrideTransitions(
            activity,
            Activity.OVERRIDE_TRANSITION_OPEN,
            R.anim.nav_in_right,
            R.anim.nav_out_left
        )
        overrideTransitions(
            activity,
            Activity.OVERRIDE_TRANSITION_CLOSE,
            R.anim.nav_in_left,
            R.anim.nav_out_right
        )
    }

    // ---- Games -------------------------------------------------------------

    /**
     * The screen launching a game. A portrait game uses the slide language it
     * shares with every other page; a landscape game is launched with no window
     * animation, because the display turn that follows IS its transition.
     */
    fun openGame(activity: Activity, landscape: Boolean) {
        if (landscape) instant(activity) else open(activity)
    }

    /** The screen a game returns to: the exact reverse of [openGame]. */
    fun closeGame(activity: Activity, landscape: Boolean) {
        if (landscape) instant(activity) else close(activity)
    }

    /** Arms a game screen itself with the same two directions of the motion. */
    fun armGame(activity: Activity, landscape: Boolean) {
        if (landscape) instant(activity) else armSelf(activity)
    }

    /**
     * 0 means "play no animation". A landscape game's window is left alone so the
     * platform's rotation animation is the only motion on screen - which is what
     * makes a portrait game turn smoothly into a landscape one instead of
     * appearing in landscape with an animation after it.
     */
    fun instant(activity: Activity) {
        overrideTransitions(activity, Activity.OVERRIDE_TRANSITION_OPEN, 0, 0)
        overrideTransitions(activity, Activity.OVERRIDE_TRANSITION_CLOSE, 0, 0)
    }

    // ---- plumbing ---------------------------------------------------------

    private fun overrideTransitions(activity: Activity, type: Int, enter: Int, exit: Int) {
        if (supportsExplicitTransitions()) {
            activity.overrideActivityTransition(type, enter, exit)
            return
        }
        @Suppress("DEPRECATION")
        activity.overridePendingTransition(enter, exit)
    }

    private fun supportsExplicitTransitions() =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE
}