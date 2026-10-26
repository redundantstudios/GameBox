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

    /* WHERE THE WINDOW MEASURED RIGHT, KEPT FOR THE NEXT OPEN AND THE NEXT FIT.
       The position of an oversized window is platform-specific (ColorOS
       centres it, the ZTE obeys lp.x to the letter), so the correct offset is
       measured after the layout - i.e. after frames are already on screen.
       Playing it as "wrong offset now, correction after the first frame" was
       the visible part of the jitter at every open: the window landed a
       half-band off, then the correction snapped it - on the ZTE a 40px kick
       over and after every rotation. The offset that measured good is
       remembered per display size, in memory and in a prefs file, so it also
       covers the first open of a fresh process. */
    private const val FIT_PREFS = "game_window_fit"
    private val goodOffsets = java.util.concurrent.ConcurrentHashMap<String, IntArray>()

    @Volatile
    private var rememberedLoaded = false

    /** The key under which one display's good offset is remembered. */
    private fun offsetKey(dw: Int, dh: Int): String = dw.toString() + " x " + dh

    /** The good offsets remembered by previous sessions, once per process. */
    private fun ensureOffsetsLoaded(ctx: android.content.Context) {
        if (rememberedLoaded) return
        synchronized(this) {
            if (rememberedLoaded) return
            try {
                val prefs = ctx.getSharedPreferences(FIT_PREFS, android.content.Context.MODE_PRIVATE)
                for ((key, value) in prefs.all) {
                    val parts = (value as? String)?.split(",") ?: continue
                    if (parts.size != 2) continue
                    val x = parts[0].toIntOrNull() ?: continue
                    val y = parts[1].toIntOrNull() ?: continue
                    goodOffsets.putIfAbsent(key, intArrayOf(x, y))
                }
            } catch (_: Throwable) {
                // A missing prefs file just means the offsets will be (re)measured.
            }
            rememberedLoaded = true
        }
    }

    /** Store [x],[y] as the offset that rendered right for [dw]x[dh]. */
    private fun rememberGoodOffset(dw: Int, dh: Int, x: Int, y: Int, ctx: android.content.Context) {
        val prev = goodOffsets.put(offsetKey(dw, dh), intArrayOf(x, y))
        if (prev != null && prev[0] == x && prev[1] == y) return
        try {
            ctx.getSharedPreferences(FIT_PREFS, android.content.Context.MODE_PRIVATE)
                .edit()
                .putString(offsetKey(dw, dh), x.toString() + "," + y.toString())
                .apply()
        } catch (_: Throwable) {
            // The in-memory value above already covers this session.
        }
    }

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
    fun fitWindowToDisplay(window: Window, root: android.view.View? = null) {
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
            ensureOffsetsLoaded(ctx)
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
               position is measured afterwards (see correctWindowOffset):
               wherever the view landed, it is moved so its edge sits on the
               display's edge. That is the whole point of the cutout
               workaround - the game covers the screen - and it no longer
               depends on what the platform does with an oversized window.

               The correction has to happen on EVERY fit, not once: the caller
               runs this again after the first layout and after every
               rotation, and each run puts the half-band guess back. So the
               correction is called from here, and every path that fits the
               window (this one and applyCutoutModeToView) ends with it.

               AND THE OFFSET THAT MEASURED GOOD IS REMEMBERED (offsetKey):
               the first open of an orientation still starts from the half-band
               guess and needs one correction, but the offset that ended up
               right is fed back on every later open and fit, which then
               becomes a no-op. Without the memory, every open re-did the
               kick: the window flipped in sitting half a band off the edge,
               drew, and snapped 40px sideways - on the screen the player is
               watching, on every game. */
            val remembered = goodOffsets[offsetKey(dw, dh)]
            val wantX = remembered?.get(0) ?: -Math.round(bandW / 2f)
            val wantY = remembered?.get(1) ?: -Math.round(bandH / 2f)
            val lp = window.attributes
            if (lp.width == dw && lp.height == dh && lp.x == wantX && lp.y == wantY) {
                /* Already exactly where it has to be: leave the attributes
                   alone. An assignment would still walk the view root, and a
                   no-value-change traversal is the definition of buying
                   nothing while the player is watching. */
            } else {
                lp.width = dw
                lp.height = dh
                lp.x = wantX
                lp.y = wantY
                window.attributes = lp
                android.util.Log.i("GameJS", "[cutout] full display " + dw + "x" + dh +
                    " band=" + bandW + "x" + bandH + " at=" + wantX + "," + wantY)
            }
            if (root != null) correctWindowOffset(root, dw, dh)
        } catch (e: Throwable) {
            android.util.Log.i("GameJS", "[cutout] fit failed: " + e)
        }
    }

    /**
     * Put the view's edge on the display's edge, wherever the platform put it.
     *
     * The window is the size of the display, but an oversized window is not
     * placed the same way on every ROM: the OPPO (ColorOS) centres one that
     * is bigger than its parent bounds, the ZTE puts it exactly where lp.x
     * says. A fixed offset can therefore only be right on one of them.
     *
     * So the position is MEASURED once the layout has happened
     * (getLocationOnScreen) and the window is shifted by the difference.
     * Where the platform already did the right thing, this is a no-op.
     *
     * The offset that measured good is remembered (offsetKey, in a prefs file
     * per display size) and fed back by the next fit, so the window starts on
     * the right edge instead of correcting its way there.
     *
     * Without it, one of the two devices always ends up with a band of the
     * display that the app does not cover.
     */
    fun correctWindowOffset(root: android.view.View, dw: Int, dh: Int) {
        try {
            val wm = root.context.getSystemService(android.content.Context.WINDOW_SERVICE)
                    as? android.view.WindowManager ?: return
            root.post {
                try {
                    val loc = IntArray(2)
                    root.getLocationOnScreen(loc)
                    val dx = -loc[0]
                    val dy = -loc[1]
                    val lp = root.layoutParams as? WindowManager.LayoutParams
                    if (dx != 0 || dy != 0) {
                        if (lp != null) {
                            lp.x += dx
                            lp.y += dy
                            wm.updateViewLayout(root, lp)
                            android.util.Log.i("GameJS",
                                "[cutout] corrected from " + loc[0] + "," + loc[1] +
                                " by " + dx + "," + dy)
                            rememberGoodOffset(dw, dh, lp.x, lp.y, root.context)
                        }
                    } else if (lp != null) {
                        /* Landed exactly on the edge as-is: THIS window offset
                           is the good one for this display - remember it so
                           the next open starts there. */
                        rememberGoodOffset(dw, dh, lp.x, lp.y, root.context)
                    }
                } catch (e: Throwable) {
                    android.util.Log.i("GameJS", "[cutout] correction failed: " + e)
                }
            }
        } catch (e: Throwable) {
            android.util.Log.i("GameJS", "[cutout] correction failed: " + e)
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
                if (act != null) fitWindowToDisplay(act.window, root)
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
