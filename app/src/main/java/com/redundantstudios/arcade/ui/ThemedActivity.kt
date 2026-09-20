package com.redundantstudios.arcade.ui

import android.app.Activity
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.widget.NestedScrollView
import com.redundantstudios.arcade.audio.ShellAudio
import com.redundantstudios.arcade.util.SettingsManager

/** Carries the visual state of a screen across a theme-flip recreation. */
object ThemeTransition {
    /** The screen as it looked in the old theme, captured just before the flip. */
    internal var snapshot: Bitmap? = null

    /** Where the page was scrolled, so the rebuilt page stays where it was. */
    internal var scrollY: Int = 0

    /** Screenshot the activity right now. Cheap: one draw pass, once per flip. */
    fun capture(activity: Activity) {
        try {
            val decor = activity.window.decorView
            if (decor.width == 0 || decor.height == 0) return
            val bitmap = Bitmap.createBitmap(decor.width, decor.height, Bitmap.Config.ARGB_8888)
            decor.draw(Canvas(bitmap))
            snapshot = bitmap
        } catch (_: Exception) {
            snapshot = null
        }
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
    }

    override fun onResume() {
        super.onResume()
        if (isThemeOutOfSync()) {
            recreate()
        } else {
            playThemeTransition()
            ShellAudio.hostResumed(this)
        }
    }

    override fun onPause() {
        super.onPause()
        ShellAudio.hostPaused()
    }

    /**
     * If a theme flip just happened: restore the scroll position, then fade
     * the captured old-theme screenshot away to reveal the new palette.
     */
    private fun playThemeTransition() {
        val snapshot = ThemeTransition.snapshot ?: return
        ThemeTransition.snapshot = null
        val content = findViewById<ViewGroup>(android.R.id.content) ?: return

        // Keep the reading position - the scroll jump the user kept seeing.
        findScrollView(content)?.let { scrollView ->
            val target = ThemeTransition.scrollY
            scrollView.post { scrollView.scrollTo(0, target) }
        }

        // Old frame on top of the rebuilt screen, dissolving out.
        val overlay = ImageView(this)
        overlay.setImageBitmap(snapshot)
        overlay.scaleType = ImageView.ScaleType.FIT_XY
        content.addView(
            overlay,
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
        overlay.animate()
            .alpha(0f)
            .setDuration(360L)
            .withEndAction {
                (overlay.parent as? ViewGroup)?.removeView(overlay)
                snapshot.recycle()
            }
            .start()
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
