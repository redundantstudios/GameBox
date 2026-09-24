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
            val bitmap = Bitmap.createBitmap(content.width, content.height, Bitmap.Config.ARGB_8888)
            content.draw(Canvas(bitmap))
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
        if (isThemeOutOfSync()) {
            // A screen that comes back to the foreground with a stale theme
            // (a flip happened while it was stopped) fades itself too: shoot the
            // palette the user is about to leave, then rebuild.
            ThemeTransition.remember(this)
            recreate()
            return
        }
        playThemeTransition()
        ShellAudio.hostResumed(this)
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
    }
}
