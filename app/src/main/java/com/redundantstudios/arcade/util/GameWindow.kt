package com.redundantstudios.arcade.util

import android.os.Build
import android.view.View
import android.view.Window
import android.view.WindowInsets
import android.view.WindowInsetsController

/**
 * The one thing a game screen has to do to its own window: be full-screen.
 *
 * There is deliberately NO rotation animation here. A landscape game uses the
 * SHELL'S OWN MOTION - the same page slide every shell screen and every portrait
 * game uses (see `ShellTransition`) - and the display change itself is left to
 * the platform, which is the only thing that can actually make it. An
 * app-level turn laid on top of the platform's is what reads as a double
 * rotation.
 */
object GameWindow {

    /**
     * Sticky immersive: hides status + navigation bars, and stays hidden for
     * swipes from the edge (they reveal the bars only transiently). Call again
     * on focus/config changes - the system can restore the bars.
     */
    fun goImmersive(window: Window) {
        val decor = window.decorView
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            decor.windowInsetsController?.let { c ->
                c.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                c.systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            decor.systemUiVisibility =
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        }
    }
}
