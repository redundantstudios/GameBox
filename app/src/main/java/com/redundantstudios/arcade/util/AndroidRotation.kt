package com.redundantstudios.arcade.util

import android.app.Activity
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.graphics.Bitmap
import android.os.Build
import android.util.DisplayMetrics
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.animation.PathInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import androidx.core.view.drawToBitmap

/**
 * The portrait <-> landscape turn, played as ONE continuous motion.
 *
 * A live layout cannot be rotated cleanly mid-render, so the screen being left
 * is snapshotted into a bitmap that floats above everything:
 *
 *   shell screen  --snapshot-->  rotated away (-90 deg, shrinking, fading)
 *   [display turns]
 *   game screen   --live view--> rotated in (+90 -> 0 deg, growing, fading in)
 *
 * Both halves run on the same 400 ms FastOutSlowIn curve, so the two motions
 * read as a single turn of the screen rather than two separate animations.
 * [ScreenState] is the state machine that keeps it honest: back is ignored
 * while a turn is in flight, and `onConfigurationChanged` only plays the entry
 * animation for a turn the shell actually started.
 *
 * The reverse (a landscape game returning to the portrait shell) is the exact
 * mirror image - see [playGameExitAndTurn] and [playShellEntry].
 */
object AndroidRotation {

    /** Where the app is in the turn. Back press respects every non-settled state. */
    enum class ScreenState { SHELL, ROTATING_TO_GAME, GAME, ROTATING_TO_SHELL }

    private const val TAG = "AndroidRotation"

    /** One turn, one duration: both halves must match or the join is visible. */
    private const val TURN_MS = 400L

    /** FastOutSlowInInterpolator's own curve, without the extra dependency. */
    private val EASE = PathInterpolator(0.4f, 0.0f, 0.2f, 1.0f)

    /** Current phase of the turn. */
    @Volatile
    var state: ScreenState = ScreenState.SHELL
        private set

    /** Snapshot of the screen a turn is leaving (taken by that screen itself). */
    private var shellShot: Bitmap? = null

    /** A landscape config change is expected (we asked for the turn). */
    private var landingFlag = false

    /** A portrait config change is expected (a landscape game is leaving). */
    private var returningFlag = false

    /** The shell screen should animate itself back in on its next resume. */
    private var shellReturn = false

    /** Invoked once the game canvas has finished rotating into place. */
    private var onLanded: (() -> Unit)? = null

    /** True while a turn is in flight: back press is ignored in these states. */
    fun isRotating(): Boolean =
        state == ScreenState.ROTATING_TO_GAME || state == ScreenState.ROTATING_TO_SHELL

    /** True when a shell snapshot is waiting for the game screen to use it. */
    fun hasShellShot(): Boolean = shellShot != null

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

    // ---- geometry + capture ------------------------------------------------

    /**
     * scaleRatio = portrait width / portrait height, e.g. 1080/2400 = 0.45.
     *
     * That is the scale at which the portrait screen fits inside the landscape
     * bounds once it has been turned 90 deg, which is what makes the snapshot
     * and the game's entry read as the same object turning. Taken from the real
     * display, never from a view, because a view's size is exactly what is
     * changing during the turn.
     */
    fun ratio(activity: Activity): Float {
        val (w, h) = realSize(activity)
        val shortSide = minOf(w, h).toFloat()
        val longSide = maxOf(w, h).toFloat()
        if (longSide <= 0f || shortSide <= 0f) return 1f
        return shortSide / longSide
    }

    private fun realSize(activity: Activity): Pair<Int, Int> {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val bounds = activity.windowManager.currentWindowMetrics.bounds
            if (bounds.width() > 0 && bounds.height() > 0) {
                return bounds.width() to bounds.height()
            }
        }
        val dm = DisplayMetrics()
        @Suppress("DEPRECATION")
        activity.windowManager.defaultDisplay.getRealMetrics(dm)
        return dm.widthPixels to dm.heightPixels
    }

    /**
     * Captures a laid-out view. Null when there is nothing to capture yet (a
     * zero-sized view would only produce a blank bitmap) or the platform
     * refuses the capture - every caller has a fallback, so a null here costs
     * the animation, never the navigation.
     */
    fun capture(view: View?): Bitmap? {
        if (view == null || view.width <= 0 || view.height <= 0) return null
        return try {
            view.drawToBitmap(Bitmap.Config.ARGB_8888)
        } catch (t: Throwable) {
            Log.w(TAG, "capture failed: ${t.message}")
            null
        }
    }

    /**
     * A shell screen calls this immediately before launching a LANDSCAPE game:
     * the snapshot must be taken while that screen is still the one on display.
     * A portrait game needs none of this and is left alone.
     */
    fun prepareGameEntry(activity: Activity, landscape: Boolean) {
        if (!landscape) {
            state = ScreenState.SHELL
            return
        }
        shellShot?.recycle()
        shellShot = capture(activity.window.decorView)
        state = ScreenState.SHELL
    }

    // ---- shell -> landscape game -------------------------------------------

    /**
     * The game screen's arrival, for a LANDSCAPE game. Call it once the game's
     * content has been laid out, with the container that holds the game canvas.
     *
     * 1. the shell snapshot (already captured by the shell screen) is floated
     *    above everything in a full-screen ImageView
     * 2. that snapshot turns away - 0 -> -90 deg, scaling 1 -> ratio, fading out
     * 3. when it has finished, the display is asked to turn
     * 4. `onConfigurationChanged` then rotates the game canvas in from +90 deg
     *
     * The container is made invisible first so nothing shows while the pivot is
     * still unknown; the entry animation brings it back.
     *
     * Without a snapshot (a cold start, a deep link, a failed capture) there is
     * nothing to turn away, so the display turn is simply asked for - the game
     * then still rotates itself in, so the arrival is never a hard cut.
     */
    fun playShellExitAndTurn(activity: Activity, container: View, onTurnLanded: () -> Unit) {
        val shot = shellShot
        shellShot = null
        container.alpha = 0f
        onLanded = onTurnLanded

        val decor = activity.window.decorView as? ViewGroup
        if (shot == null || decor == null) {
            shot?.recycle()
            armLandscapeTurn(activity)
            return
        }

        val overlay = ImageView(activity).apply {
            setImageBitmap(shot)
            scaleType = ImageView.ScaleType.FIT_XY
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            isClickable = false
            isFocusable = false
        }
        decor.addView(overlay)
        state = ScreenState.ROTATING_TO_GAME

        val target = ratio(activity)
        overlay.post {
            pivotCenter(overlay)
            overlay.animate()
                .rotation(-90f)
                .scaleX(target)
                .scaleY(target)
                .alpha(0f)
                .setDuration(TURN_MS)
                .setInterpolator(EASE)
                .withEndAction {
                    decor.removeView(overlay)
                    shot.recycle()
                    armLandscapeTurn(activity)
                }
                .start()
        }
    }

    /** Asks the display to turn, and marks the landscape change as ours. */
    private fun armLandscapeTurn(activity: Activity) {
        landingFlag = true
        activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
    }

    // ---- config changes ----------------------------------------------------

    /**
     * Called from the game screen's `onConfigurationChanged`.
     *
     * Returns true when the change was part of a turn the shell started, so the
     * game screen knows not to treat it as an ordinary resize:
     *
     * - landscape + a turn we asked for: the game canvas rotates in from
     *   +90 deg at `ratio`, growing to full size and fading up.
     * - portrait + a landscape game leaving: the shell is told to animate
     *   itself back in, and the game screen closes.
     */
    fun onOrientationChanged(
        activity: Activity,
        newConfig: Configuration,
        container: View?
    ): Boolean {
        if (newConfig.orientation == Configuration.ORIENTATION_LANDSCAPE && landingFlag) {
            landingFlag = false
            val done = onLanded
            onLanded = null
            if (container == null) {
                state = ScreenState.GAME
                done?.invoke()
                return true
            }
            state = ScreenState.ROTATING_TO_GAME
            val from = ratio(activity)
            // Invisible immediately: the pivot is only known once the new
            // orientation has been laid out, and a frame of full-size game
            // before the turn would read as a hard cut.
            container.alpha = 0f
            container.post {
                pivotCenter(container)
                container.rotation = 90f
                container.scaleX = from
                container.scaleY = from
                container.animate()
                    .rotation(0f)
                    .scaleX(1f)
                    .scaleY(1f)
                    .alpha(1f)
                    .setDuration(TURN_MS)
                    .setInterpolator(EASE)
                    .withEndAction {
                        state = ScreenState.GAME
                        done?.invoke()
                    }
                    .start()
            }
            return true
        }
        if (newConfig.orientation == Configuration.ORIENTATION_PORTRAIT && returningFlag) {
            returningFlag = false
            // The game screen is on its way out; the shell turns itself back in.
            shellReturn = true
            state = ScreenState.SHELL
            return true
        }
        return false
    }

    // ---- landscape game -> portrait shell ----------------------------------

    /**
     * A landscape game leaving (back press, or the game's own exit) - the exact
     * mirror of [playShellExitAndTurn]:
     *
     * 1. the game canvas is snapshotted into a full-screen overlay
     * 2. that snapshot turns away the other way - 0 -> +90 deg, scaling
     *    1 -> 1/ratio, fading out
     * 3. the display is asked to turn back to portrait
     * 4. `onConfigurationChanged` marks the shell, which animates itself in
     *    from -90 deg on its next resume (see [playShellEntry])
     *
     * `finish` is invoked once the portrait change has landed. A safety timer
     * runs it anyway if the turn never lands, so the player can never be
     * trapped on the game screen by a refused rotation.
     */
    fun playGameExitAndTurn(activity: Activity, gameView: View, finish: () -> Unit) {
        val shot = capture(gameView)
        val decor = activity.window.decorView as? ViewGroup
        val invScale = if (ratio(activity) > 0f) 1f / ratio(activity) else 1f

        if (shot == null || decor == null) {
            // Nothing to turn away: leave straight away, still telling the shell
            // to turn itself in so the return is not a cut.
            handBackToShell(finish)
            return
        }

        val overlay = ImageView(activity).apply {
            setImageBitmap(shot)
            scaleType = ImageView.ScaleType.FIT_XY
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            isClickable = false
            isFocusable = false
        }
        decor.addView(overlay)
        state = ScreenState.ROTATING_TO_SHELL

        overlay.post {
            pivotCenter(overlay)
            overlay.animate()
                .rotation(90f)
                .scaleX(invScale)
                .scaleY(invScale)
                .alpha(0f)
                .setDuration(TURN_MS)
                .setInterpolator(EASE)
                .withEndAction {
                    decor.removeView(overlay)
                    shot.recycle()
                    returningFlag = true
                    activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                    // A refused/parked rotation must never leave the player stuck.
                    decor.postDelayed({
                        if (returningFlag) {
                            returningFlag = false
                            handBackToShell(finish)
                        }
                    }, TURN_MS + 450L)
                }
                .start()
        }
    }

    /** Marks the shell for its turn-in, then lets the game screen go. */
    private fun handBackToShell(finish: () -> Unit) {
        shellReturn = true
        state = ScreenState.SHELL
        finish()
    }

    /**
     * A shell screen calls this on resume. When a landscape game has just left,
     * the shell turns itself in from -90 deg at `ratio` - the other half of the
     * motion the game played on its way out.
     */
    fun playShellEntry(activity: Activity) {
        if (!shellReturn) return
        shellReturn = false
        val content = activity.findViewById<ViewGroup>(android.R.id.content) ?: return
        val root = content.getChildAt(0) ?: return
        val from = ratio(activity)

        state = ScreenState.ROTATING_TO_SHELL
        root.alpha = 0f
        root.rotation = -90f
        root.scaleX = from
        root.scaleY = from
        root.post {
            pivotCenter(root)
            root.animate()
                .rotation(0f)
                .scaleX(1f)
                .scaleY(1f)
                .alpha(1f)
                .setDuration(TURN_MS)
                .setInterpolator(EASE)
                .withEndAction { state = ScreenState.SHELL }
                .start()
        }
    }

    /** The pivot is the exact centre of the view. Anything else throws it off screen. */
    private fun pivotCenter(view: View) {
        view.pivotX = view.width / 2f
        view.pivotY = view.height / 2f
    }
}
