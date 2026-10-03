package com.redundantstudios.arcade

import android.app.Application
import android.util.Log
import com.redundantstudios.arcade.audio.ShellAudio
import com.redundantstudios.arcade.util.SettingsManager

/**
 * Warms the shell's audio while the splash screen is still up.
 *
 * WHY THIS EXISTS
 * The ambient loop decodes its asset to raw PCM on a background thread the
 * first time a shell screen asks for it. That request used to come from
 * `ShellAudio.hostResumed()`, which runs in `Activity.onResume()` - i.e. after
 * the launcher, the process start and the home screen have all finished. So
 * opening the app was silent for the length of the decode (plus a fade-in on
 * top of it) and the music walked in well after the UI was already up and being
 * tapped.
 *
 * An [Application] is created before ANY activity, so kicking the decode off
 * here gives it the whole of the cold-start window to finish. By the time the
 * home screen resumes the loop is already decoded and playing, and the music is
 * simply there from the first frame the player can see.
 */
class ShellApp : Application() {

    override fun onCreate() {
        super.onCreate()
        SettingsManager.init(this)
        try {
            ShellAudio.warmUp(this)
        } catch (e: Throwable) {
            // Audio is never worth failing app startup over.
            Log.w("ShellApp", "Audio warm-up skipped: ${e.message}")
        }
    }
}
