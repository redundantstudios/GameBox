package com.redundantstudios.arcade.util

import android.os.Build
import android.view.View
import android.view.Window
import android.view.WindowInsets
import android.view.WindowInsetsController

/**
 * Full-screen ("immersive") mode for the shell's game screens.
 *
 * Landscape rotation is deliberately NOT custom any more. The game is authored
 * for the platform rotation: it draws its own branded portrait splash for the
 * brief portrait beat, the platform runs its native (smooth) rotation
 * animation, and the shell tells the game when the rotation has finished
 * (`Game.onOrientationChange`) so the menu can drop in. A custom snapshot
 * overlay lived here once; it fought the platform rotation and looked broken.
 */
object AndroidRotation {

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