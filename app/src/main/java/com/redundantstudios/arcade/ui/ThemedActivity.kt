package com.redundantstudios.arcade.ui

import android.content.res.Configuration
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import com.redundantstudios.arcade.audio.ShellAudio
import com.redundantstudios.arcade.util.SettingsManager

/**
 * Base activity for every shell screen.
 *
 * Settings are initialised and the theme applied *before* `super.onCreate()` —
 * a cold start of any screen must already know the saved preferences.
 *
 * It also fixes the "dark theme only darkened some screens" bug: an activity
 * that is already stopped (sitting behind the screen where the theme was
 * switched) can keep its old configuration, so we re-check on every resume and
 * recreate only when the running configuration disagrees with the preference.
 */
abstract class ThemedActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        SettingsManager.init(this)
        SettingsManager.applyTheme()
        super.onCreate(savedInstanceState)
    }

    override fun onResume() {
        super.onResume()
        if (isThemeOutOfSync()) recreate()
        // The ambient loop belongs to the shell screens; it follows the
        // master volume from Settings and pauses whenever the shell is
        // backgrounded or a game takes over (see onPause).
        ShellAudio.startBgm(this)
    }

    override fun onPause() {
        super.onPause()
        ShellAudio.pauseBgm()
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
        val content = findViewById<View>(android.R.id.content) as? ViewGroup ?: return
        val root = content.getChildAt(0) ?: return
        root.background = ShellBackgroundDrawable(this)
    }
}
