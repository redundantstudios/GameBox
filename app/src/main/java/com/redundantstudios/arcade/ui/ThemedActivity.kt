package com.redundantstudios.arcade.ui

import android.app.Activity
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Bundle
import android.os.SystemClock
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.widget.NestedScrollView
import com.redundantstudios.arcade.audio.ShellAudio
import com.redundantstudios.arcade.util.SettingsManager

/**
 * Carries the visual state of each screen across a theme-flip recreation.
 *
 * Keyed by ACTIVITY CLASS, and that key is the whole point: a flip recreates
 * every screen on the back stack, so a single shared `scrollY` slot was being
 * overwritten by whichever screen paused last (the background Home screen
 * writes 0, the Settings page then restores 0). The page jumped to the top and
 * the cross-fade only appeared "sometimes" - whenever the last writer happened
 * to be the visible screen. Per-class frames make both deterministic.
 *
 * Frames are also timestamped: a recreated screen must consume its own frame
 * within a couple of seconds, otherwise a screen that was merely stopped long
 * ago would replay a stale fade when the user comes back to it.
 */
object ThemeTransition {

    /** One screen's pre-flip state. */
    class Frame(val snapshot: Bitmap?, val scrollY: Int, private val atMs: Long) {
        fun isFresh(): Boolean = SystemClock.uptimeMillis() - atMs < FRESH_MS
    }

    private const val FRESH_MS = 10000L

    /**
     * Longest edge, in pixels, of the bitmap a theme flip captures.
     *
     * The capture exists only to dissolve over the rebuilt screen for 600ms, so
     * full resolution buys nothing. A 1080x2392 ARGB_8888 bitmap is ~10MB,
     * allocated and drawn synchronously on the UI thread; 1080 is ~1/4 the
     * memory for a transition nobody can tell apart from the real thing.
     */
    private const val MAX_SNAPSHOT_EDGE = 1080

    private val frames = HashMap<String, Frame>()

    /** Screenshot [activity] as it looks right now and remember its scroll. */
    fun remember(activity: Activity) {
        val key = activity.javaClass.name
        frames.remove(key)?.snapshot?.recycle()
        frames[key] = Frame(capture(activity), scrollOf(activity), SystemClock.uptimeMillis())
    }

    /**
     * The frame belonging to [activity] if it is still fresh - removed from the
     * store, so a screen cross-fades exactly once per flip.
     */
    fun take(activity: Activity): Frame? {
        val frame = frames.remove(activity.javaClass.name) ?: return null
        if (frame.isFresh()) return frame
        frame.snapshot?.recycle()
        return null
    }

    /**
     * The CONTENT view, not the decor: the snapshot is laid over the rebuilt
     * content view, so shooting the decor (which includes the status bar) would
     * shift the old frame down by the status-bar height during the fade.
     */
    private fun capture(activity: Activity): Bitmap? {
        return try {
            val content = activity.findViewById<ViewGroup>(android.R.id.content)
            if (content == null || content.width == 0 || content.height == 0) return null
            val w = content.width
            val h = content.height
            /* This bitmap is only ever shown as a short dissolve over the rebuilt
               screen, so it does not need to be full resolution. At 1080x2392 a
               full-size ARGB_8888 capture is ~10 MB, allocated and drawn
               synchronously on the UI thread every time a theme flip happens -
               which is exactly the kind of allocation that makes an already busy
               phone stutter. Capping the long edge costs nothing visible and cuts
               the memory (and the copy) by roughly 4x. */
            val longEdge = maxOf(w, h)
            val scale = if (longEdge > MAX_SNAPSHOT_EDGE) MAX_SNAPSHOT_EDGE.toFloat() / longEdge else 1f
            val bw = (w * scale).toInt().coerceAtLeast(1)
            val bh = (h * scale).toInt().coerceAtLeast(1)
            val bitmap = if (scale < 1f) {
                Bitmap.createBitmap(bw, bh, Bitmap.Config.ARGB_8888)
            } else {
                Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
            }
            val canvas = Canvas(bitmap)
            if (scale < 1f) canvas.scale(scale, scale)
            content.draw(canvas)
            bitmap
        } catch (_: Exception) {
            null
        } catch (_: OutOfMemoryError) {
            null
        }
    }

    /** Scroll offset of the first scrollable view on the screen, if any. */
    private fun scrollOf(activity: Activity): Int {
        val content = activity.findViewById<ViewGroup>(android.R.id.content) ?: return 0
        return findScroll(content)?.scrollY ?: 0
    }

    private fun findScroll(view: View): NestedScrollView? {
        if (view is NestedScrollView) return view
        if (view is ViewGroup) {
            for (i in 0 until view.childCount) {
                findScroll(view.getChildAt(i))?.let { return it }
            }
        }
        return null
    }
}

/**
 * Base activity for every shell screen.
 *
 * Settings are initialised and the theme applied *before* `super.onCreate()` -
 * a cold start of any screen must already know the saved preferences.
 *
 * Theme flips land here as an automatic recreation (AppCompatDelegate resets
 * the night mode for every alive activity). To make that subtle instead of a
 * hard snap, the screen that starts the flip screenshots itself; when the
 * rebuilt screen resumes we lay that snapshot ON TOP and fade it out - a true
 * cross-fade from old theme to new - and re-apply the saved scroll position
 * underneath so the page never jumps to the top.
 */
abstract class ThemedActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        SettingsManager.init(this)
        SettingsManager.applyTheme()
        super.onCreate(savedInstanceState)
        // Screen-change motion is owned by one place: arm this screen's own
        // open/close animation, then dissolve its content in as soon as it has
        // been laid out (a plain View animation, so no platform version can
        // turn the transition back into a hard cut).
        // Shell navigation is a slide language: every page pushes in from the
        // right and pops back to the right, with a subtle motion blur that
        // resolves as the page settles. No dissolve, no hard cut.
        ShellTransition.armSelf(this)
    }

    override fun onResume() {
        super.onResume()
        if (isThemeOutOfSync() && !alreadyRebuiltForCurrentTheme()) {
            /* Guard against a rebuild loop.
               If the night configuration and the stored theme ever disagree and
               `recreate()` does not settle them, this test would pass again on
               every resume and the screen would rebuild itself for ever - a
               silent, app-wide performance collapse. One attempt per set of
               settings is enough: if it did not settle the disagreement, the
               right outcome is "show what we have", not "rebuild again". */
            themeRebuiltForCurrentSettings = true
            // A screen that comes back to the foreground with a stale theme
            // (a flip happened while it was stopped) fades itself too: shoot the
            // palette the user is about to leave, then rebuild.
            ThemeTransition.remember(this)
            recreate()
            return
        }
        themeRebuiltForCurrentSettings = false
        playThemeTransition()
        ShellAudio.hostResumed(this)
    }

    /** True once this screen has already rebuilt itself for the current theme. */
    private var themeRebuiltForCurrentSettings = false

    /**
     * Process-wide half of the rebuild-loop guard.
     *
     * The instance flag above is not enough on its own: `recreate()` builds a
     * BRAND NEW activity, so an instance flag starts false again and the same
     * mismatch would rebuild for ever. Remembering the theme the rebuild was
     * attempted for, across every instance, bounds it to one attempt per actual
     * theme change - which is all a real flip ever needs.
     */
    private fun alreadyRebuiltForCurrentTheme(): Boolean {
        val current = SettingsManager.appTheme + "|" + SettingsManager.signature()
        if (current == themeRebuiltForTheme) return true
        themeRebuiltForTheme = current
        return false
    }

    /**
     * Records this screen's look so the rebuild can cross-fade into the new
     * theme. A screen that STARTS a flip must call this before applying the
     * theme - without it that screen simply snaps, because its own onResume
     * never sees a stale theme and therefore never captures a frame. That was
     * the "the fade works, but not every time" bug: the flip always faded
     * somewhere, just not on the screen where the user pressed the button.
     */
    protected fun beginThemeFlip() {
        ThemeTransition.remember(this)
    }

    override fun onPause() {
        super.onPause()
        ShellAudio.hostPaused()
    }

    /**
     * If a theme flip just happened on this screen: put the page back where it
     * was, then dissolve the captured old-theme frame over the new palette.
     *
     * Nothing here touches transition state unless this screen owns a fresh
     * frame, so a flip on one screen can never affect another one.
     */
    private fun playThemeTransition() {
        val frame = ThemeTransition.take(this) ?: return

        val content = findViewById<ViewGroup>(android.R.id.content) ?: run {
            frame.snapshot?.recycle()
            return
        }

        // Keep the reading position: restoring AFTER the first layout pass is
        // what makes this reliable - a scroll applied too early gets clamped by
        // the not-yet-measured content height.
        findScrollView(content)?.let { scrollView ->
            if (frame.scrollY > 0) restoreScroll(scrollView, frame.scrollY)
        }

        val snapshot = frame.snapshot ?: return

        // Old frame on top of the rebuilt screen, dissolving out.
        val overlay = ImageView(this)
        overlay.setImageBitmap(snapshot)
        overlay.scaleType = ImageView.ScaleType.FIT_XY
        overlay.isClickable = false
        content.addView(
            overlay,
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
        overlay.animate()
            .alpha(0f)
            .setDuration(600L)
            .withEndAction {
                (overlay.parent as? ViewGroup)?.removeView(overlay)
                snapshot.recycle()
            }
            .start()
    }

    /** Applies [target] once now and again after the next layout pass. */
    private fun restoreScroll(scrollView: NestedScrollView, target: Int) {
        scrollView.post { scrollView.scrollTo(0, target) }
        scrollView.viewTreeObserver.addOnGlobalLayoutListener(
            object : android.view.ViewTreeObserver.OnGlobalLayoutListener {
                override fun onGlobalLayout() {
                    scrollView.scrollTo(0, target)
                    if (scrollView.viewTreeObserver.isAlive) {
                        scrollView.viewTreeObserver.removeOnGlobalLayoutListener(this)
                    }
                }
            }
        )
    }

    private fun findScrollView(view: View): NestedScrollView? {
        if (view is NestedScrollView) return view
        if (view is ViewGroup) {
            for (i in 0 until view.childCount) {
                findScrollView(view.getChildAt(i))?.let { return it }
            }
        }
        return null
    }

    /** True when the stored theme preference and the running config disagree. */
    private fun isThemeOutOfSync(): Boolean {
        val wantDark = SettingsManager.appTheme == "Dark"
        val isDark = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
            Configuration.UI_MODE_NIGHT_YES
        return wantDark != isDark
    }

    /**
     * Applies the ambient shell background to the screen root.
     *
     * This has to happen from code (never `android:background="@drawable/..."`):
     * a drawable inflated from XML is constructed with the *application*
     * context, which never receives AppCompat's day/night override
     * configuration. That is why the page used to keep its light gradient while
     * the views around it went dark. Passing the Activity context resolves the
     * night colours correctly.
     *
     * Call it right after `setContentView(...)`.
     */
    protected fun applyShellBackground() {
        val content = findViewById<ViewGroup>(android.R.id.content) ?: return
        val root = content.getChildAt(0) ?: return
        root.background = ShellBackgroundDrawable(this)
        // Every shell screen calls this immediately after setContentView(), so
        // it is also the right place to give the content its system-bar inset
        // back. See applyWindowInsets().
        applyWindowInsets()
    }

    /**
     * Keeps shell content clear of the status and navigation bars.
     *
     * Targeting SDK 36 turns on enforced edge-to-edge, so the window content now
     * runs under the system bars. The shell screens were built when the platform
     * still inset the window for us, so on the new target the Home page's title,
     * its settings gear and the whole first row of cards ended up underneath the
     * status bar (reported from the device).
     *
     * The GAME screen is deliberately NOT handled here - GameActivity wants the
     * full display and asks for edge-to-edge itself. Only the shell pages, which
     * are ordinary content screens, get the inset back as padding.
     *
     * The view's own XML padding is preserved: it is captured once when the
     * listener is installed and added to on every inset pass, so repeated calls
     * cannot stack the padding up.
     */
    protected fun applyWindowInsets() {
        val content = findViewById<ViewGroup>(android.R.id.content) ?: return
        val root = content.getChildAt(0) ?: return
        val baseLeft = root.paddingLeft
        val baseTop = root.paddingTop
        val baseRight = root.paddingRight
        val baseBottom = root.paddingBottom
        androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(
                androidx.core.view.WindowInsetsCompat.Type.systemBars()
            )
            view.setPadding(
                baseLeft + bars.left,
                baseTop + bars.top,
                baseRight + bars.right,
                baseBottom + bars.bottom
            )
            insets
        }
        androidx.core.view.ViewCompat.requestApplyInsets(root)
    }

    private companion object {
        /**
         * The theme signature the last rebuild-loop-guard attempt was made for.
         * Process-wide on purpose - see [alreadyRebuiltForCurrentTheme].
         */
        @Volatile
        private var themeRebuiltForTheme: String? = null
    }
}
