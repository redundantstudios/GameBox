package com.redundantstudios.arcade.ui

import android.app.Activity
import android.os.Build
import com.redundantstudios.arcade.R

/**
 * The shell's navigation motion, kept in one place.
 *
 * ONE language for every page change: a SLIDE. Forward (deeper) navigation
 * pushes a page in from the right while the page beneath eases 30% to the left -
 * parallax, so the two pages read as one surface moving. Back pops the page out
 * to the right and brings the page beneath back from the left. Pure translation,
 * no alpha and no blur: nothing dissolves, and a translation is the cheapest
 * window animation there is, so it stays perfectly smooth.
 *
 * A GAME is a page and it moves BY ORIENTATION. A LANDSCAPE game rises up from the
 * bottom edge and sinks back down on the way out: its own display turn makes a side
 * slide. A PORTRAIT game uses its own full-width LEFT-to-RIGHT slide: it enters
 * from the left, the shell beneath drifts right, and exit reverses that motion.
 * Nothing here fights the platform's rotation.
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

    // ---- Games: the vertical pair for LANDSCAPE, the slide for PORTRAIT ------

    /**
     * The screen launching a game. A LANDSCAPE game RISES from the bottom edge
     * (`game_in`) while the page it came from eases 30% up and out (`game_out`) -
     * the vertical twin of [open]'s slide. A PORTRAIT game instead slides fully
     * from left to right, independent from normal shell-page navigation.
     */
    fun openGame(activity: Activity, landscape: Boolean) {
        if (!landscape) {
            // Portrait games deliberately travel LEFT -> RIGHT. The full-width
            // enter is distinct from the shell's 30% back-navigation parallax.
            overrideTransitions(
                activity,
                Activity.OVERRIDE_TRANSITION_OPEN,
                R.anim.portrait_game_in,
                R.anim.portrait_game_out
            )
            return
        }
        overrideTransitions(
            activity,
            Activity.OVERRIDE_TRANSITION_OPEN,
            R.anim.game_in,
            R.anim.game_out
        )
    }

    /**
     * Arms the game screen itself with its own orientation's motion, so it arrives
     * correctly even when something starts it without going through [openGame].
     */
    fun armGame(activity: Activity, landscape: Boolean) {
        openGame(activity, landscape)
        closeGame(activity, landscape)
    }

    /**
     * The game leaving: a LANDSCAPE game sinks back DOWN off the bottom
     * (`game_back_out`) while the shell page eases back in from above
     * (`game_back_in`) - the exact reverse of [openGame], so a game leaves the way
     * it arrived. A PORTRAIT game exits right while the shell returns from the left.
     */
    fun closeGame(activity: Activity, landscape: Boolean) {
        if (!landscape) {
            // Exact reverse: the portrait game exits to the right while the shell
            // returns from the left, matching the opening direction.
            overrideTransitions(
                activity,
                Activity.OVERRIDE_TRANSITION_CLOSE,
                R.anim.portrait_game_back_in,
                R.anim.portrait_game_back_out
            )
            return
        }
        overrideTransitions(
            activity,
            Activity.OVERRIDE_TRANSITION_CLOSE,
            R.anim.game_back_in,
            R.anim.game_back_out
        )
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