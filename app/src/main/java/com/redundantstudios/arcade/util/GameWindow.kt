package com.redundantstudios.arcade.util

import android.os.Build
import android.view.View
import android.view.WindowManager
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
     * Make the window's content span the WHOLE display, including behind the
     * status and navigation bars.
     *
     * `goImmersive` alone only HIDES the bars. It says nothing about whether the
     * window is laid out inside them, and on a phone that still lays out inside
     * the system bars the game WebView was positioned below the status bar, so a
     * black band showed across the top of every game (seen on a friend's device).
     *
     * Calling this BEFORE `setContentView` is what actually makes the game cover
     * the full screen. On API 30+ the platform call is used; below that the
     * AndroidX equivalent covers the same ground, and it is a no-op where
     * edge-to-edge is already enforced.
     */
    fun goEdgeToEdge(window: Window) {
        try {
            // WindowCompat picks the right platform call per API level. (The
            // direct Window.setDecorFitsSystemWindows is deprecated from API 35,
            // where edge-to-edge is enforced anyway.)
            //
            // EXPERIMENT: the "fit insets" path (the app asking to fit the
            // display-cutout inset) may be what reserves the camera band, so
            // this call is switchable for an A/B test.
            androidx.core.view.WindowCompat.setDecorFitsSystemWindows(window, false)
        } catch (_: Throwable) {
            // Never let a cosmetic window tweak take the whole game down.
        }
        /* THE DISPLAY CUTOUT IS THE LAST BAND. Edge-to-edge above covers the
           status and navigation bars but says nothing about the camera hole.
           Measured on the OPPO A55 (CPH2219, ColorOS, corner punch-hole):
           the window frame sat at [115,0][2400,1080] - exactly the cutout
           width - with an "EffectLayer (Letterbox - left)" beside it, i.e. the
           platform letterboxed the game away from the camera. On this OS the
           corner cutout rides a LONG edge once the activity rotates, and only
           ALWAYS (API 30+) disables the long-edge avoidance; before that
           SHORT_EDGES is the strongest mode that exists. The system still
           draws the hole itself; the game flows underneath it. */
        applyCutoutMode(window)
    }

    /**
     * Declare that the window may draw into the display cutout.
     *
     * Called twice on purpose. The theme now carries the same declaration
     * (`windowLayoutInDisplayCutoutMode`), because the window attributes are
     * re-applied from the theme when the decor is created - which silently
     * discarded a value set before `setContentView`. This second call, made
     * after the decor exists, is the belt to that braces: the theme value
     * reaches the window manager at creation, this one makes sure nothing
     * later (a rotation, an inset pass) puts it back to the default.
     */
    /**
     * Declare that the window may draw into the display cutout.
     *
     * WHY THIS NEEDS TWO PATHS. The camera hole of the test phone (OPPO A55 /
     * CPH2219, ColorOS, Android 13) is a CORNER cutout, so in landscape it
     * sits on a long edge and the platform letterboxes the game away from it:
     * the window frame was measured at [115,0][2400,1080] - exactly the
     * cutout width - and the game ran with a dead strip beside the camera.
     *
     * The declaration itself is the documented one
     * (`layoutInDisplayCutoutMode = ALWAYS`), and the app-side value is
     * accepted (readback = 3). But it never reached the party that matters:
     * the FRAME is computed by the client (ViewRootImpl -> WindowLayout
     * .computeFrames, which skips the cutout only for ALWAYS), and the client
     * keeps its own copy of the attributes. `window.attributes = lp` does not
     * get it there: AppCompatActivity installs a WindowCallbackWrapper that
     * does not override `dispatchWindowAttributesChanged`, so that dispatch
     * is swallowed and the update is dropped.
     *
     * `WindowManager.updateViewLayout` is the public API that DOES reach the
     * view root (`ViewRootImpl.setLayoutParams` -> copyFrom -> a new
     * traversal -> the frame is recomputed with ALWAYS). It needs the decor
     * to be attached, so the caller re-runs this after the first layout and
     * after every rotation.
     */
    fun applyCutoutMode(window: Window) {
        try {
            val lp = window.attributes
            val mode =
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R)
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
                else
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            lp.layoutInDisplayCutoutMode = mode
            window.attributes = lp
            /* FLAG_LAYOUT_NO_LIMITS lets the window reach past the display's
               app bounds (where the cutout band comes from).

               FLAG_LAYOUT_INSET_DECOR is NOT cleared. It is deprecated in
               API 30, but it is what the shell's own screens carry, and
               they are the ones that come out full screen: a window with it
               lays its content out across the whole display, and a window
               without it is measured inside the decor - which is how the
               portrait games ended up running BELOW the status bar (the
               Orrery window measured [0,115][1080,2400] - a 115px band at
               the top, exactly the status bar + cutout height). Clearing it
               was a wrong turn from the cutout fight; restoring it fixes
               the portrait games without touching the landscape fix, which
               rests on the cutout mode and the explicit size below. */
            window.addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS)
            window.addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_INSET_DECOR)
            /* And the push that actually matters: into the view root, which is
               where the frame is computed. The decor of `window` is not always
               the attached one (it can be a stale, never-attached instance),
               so the caller passes the root of the hierarchy that IS on
               screen - see applyCutoutModeToView. */
        } catch (e: Throwable) {
            android.util.Log.e("GameJS", "[cutout] FAILED", e)
        }
    }

    /**
     * Make the window cover the WHOLE display, including the strip the
     * platform reserves for the camera hole or the status bar.
     *
     * WHY THIS EXISTS. Two separate strips, one rule:
     *
     *  - LANDSCAPE. The camera hole of the test phone (OPPO A55 / CPH2219,
     *    ColorOS, Android 13) is a CORNER cutout, so in landscape it lands on
     *    a long edge and the platform letterboxes the game away from it: the
     *    window frame measured [115,0][2400,1080] - exactly the cutout width
     *    - and the game ran 115px narrow with a dead strip (and the camera) in
     *    it. The documented cure is `layoutInDisplayCutoutMode = ALWAYS`, and
     *    the app sets it - but on this ROM the window manager does not keep
     *    that field: its own copy of the window's attributes stays at
     *    DEFAULT, while the flags we set (and the same parcel!) do arrive.
     *    Measured, not guessed.
     *
     *  - PORTRAIT. The window measured [0,115][1080,2400] - the game ran
     *    BELOW the status bar, with a 115px band at the top. That one was
     *    self-inflicted: the window was missing FLAG_LAYOUT_INSET_DECOR, the
     *    flag the shell's own screens carry, and a window without it is
     *    measured inside the decor.
     *
     * So the window is given the display's own size explicitly and shifted
     * by half the reserved strip on the axis that has one, which puts its
     * edge on the true edge of the screen: the game then draws behind the
     * hole (and under the status bar), which is what "full screen" has to
     * mean on a phone with a punch-hole.
     */
    fun fitWindowToDisplay(window: Window) {
        try {
            val ctx = window.context
            val wm = ctx.getSystemService(android.content.Context.WINDOW_SERVICE) as? android.view.WindowManager
            val display = wm?.currentWindowMetrics?.bounds
            if (display == null) return
            val dw = display.width()
            val dh = display.height()
            // The app's own metrics are the platform's app bounds (the display
            // minus the reserved strip); the window metrics are the display.
            val dm = ctx.resources.displayMetrics
            val bandW = (dw - dm.widthPixels).coerceAtLeast(0)
            val bandH = (dh - dm.heightPixels).coerceAtLeast(0)
            val lp = window.attributes
            lp.width = dw
            lp.height = dh
            /* WHERE THE WINDOW LANDS IS PLATFORM-DEPENDENT, SO IT IS CORRECTED
               AFTERWARDS RATHER THAN GUESSED HERE.
               This used to be a fixed half-band shift (lp.x = -band/2), on the
               reasoning that "the platform centres a window that is bigger
               than its parent bounds, so the offset that puts the edge on the
               screen is half the reserved strip". That is true on the OPPO
               (ColorOS centres it) and FALSE on the ZTE, where the frame
               landed exactly at lp.x:
                   mAttrs={(-40,0)(1612x720) ... layoutInDisplayCutoutMode=always}
               On the ZTE the half-band shift cost the game 40px of its LEFT
               edge (the left-hand player's joystick ran off-screen) and left
               the 40px at the other end of the display uncovered by the
               window - the black band beside the game, with the right-hand
               player's DASH button clipped in half by it.

               So the guess is kept as the starting point and the real
               position is measured afterwards (see applyCutoutModeToView):
               wherever the view landed, it is moved so its edge sits on the
               display's edge. That is the whole point of the cutout
               workaround - the game covers the screen - and it no longer
               depends on what the platform does with an oversized window. */
            lp.x = -Math.round(bandW / 2f)
            lp.y = -Math.round(bandH / 2f)
            window.attributes = lp
            android.util.Log.i("GameJS", "[cutout] full display " + dw + "x" + dh +
                " band=" + bandW + "x" + bandH + " at=" + lp.x + "," + lp.y)
        } catch (e: Throwable) {
            android.util.Log.i("GameJS", "[cutout] fit failed: " + e)
        }
    }

    /**
     * Push the "draw into the camera hole" declaration into the view root that
     * is actually on screen.
     *
     * `WindowManager.updateViewLayout` is the public API that reaches the
     * client (ViewRootImpl.setLayoutParams -> copyFrom -> a new traversal ->
     * the frame is recomputed with ALWAYS, which is the only thing that
     * removes the letterbox band around the cutout). The ordinary
     * `window.attributes = lp` does not get there, because AppCompatActivity
     * installs a WindowCallbackWrapper that does not override
     * `dispatchWindowAttributesChanged`, so that dispatch is swallowed.
     *
     * @param root the root view of the attached hierarchy (the WebView's
     *   `rootView` is the DecorView that the window manager knows about).
     */
    fun applyCutoutModeToView(root: android.view.View) {
        try {
            val lp = root.layoutParams as? WindowManager.LayoutParams ?: return
            val mode =
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R)
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
                else
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            lp.layoutInDisplayCutoutMode = mode
            val wm = root.context.getSystemService(android.content.Context.WINDOW_SERVICE)
                    as? android.view.WindowManager
            if (wm != null) {
                wm.updateViewLayout(root, lp)
                android.util.Log.i("GameJS", "[cutout] pushed mode=" + mode)
                val act = root.context as? android.app.Activity
                if (act != null) fitWindowToDisplay(act.window)
                /* PUT THE VIEW'S EDGE ON THE DISPLAY'S EDGE, WHEREVER THE
                   PLATFORM PUT IT. The window is the size of the display, but
                   an oversized window is not placed the same way on every ROM:
                   the OPPO (ColorOS) centres one that is bigger than its
                   parent bounds, the ZTE puts it exactly where lp.x says. The
                   guess in fitWindowToDisplay can only be a guess, so the
                   real position is measured here - once the layout has
                   happened - and the window is shifted by the difference.

                   Without this, one of the two devices always ends up with a
                   band of the display that the app does not cover: on the ZTE
                   the game lost 40px of its left edge and the black band sat
                   at the right, clipping the dash button in half. */
                root.post {
                    try {
                        val loc = IntArray(2)
                        root.getLocationOnScreen(loc)
                        val dx = -loc[0]
                        val dy = -loc[1]
                        if (dx != 0 || dy != 0) {
                            val lp2 = root.layoutParams as? WindowManager.LayoutParams
                            if (lp2 != null) {
                                lp2.x += dx
                                lp2.y += dy
                                wm.updateViewLayout(root, lp2)
                                android.util.Log.i("GameJS",
                                    "[cutout] corrected from " + loc[0] + "," + loc[1] +
                                    " by " + dx + "," + dy)
                            }
                        }
                    } catch (e: Throwable) {
                        android.util.Log.i("GameJS", "[cutout] correction failed: " + e)
                    }
                }
            }
        } catch (e: Throwable) {
            android.util.Log.i("GameJS", "[cutout] push failed: " + e)
        }
    }

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
