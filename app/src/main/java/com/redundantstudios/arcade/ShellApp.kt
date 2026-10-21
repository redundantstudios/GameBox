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
        try {
            /*
             * THE APP WAS OPENED. The ad clock starts here.
             *
             * The interstitial gap is measured from the last ad, so with nothing
             * recorded - a fresh install, or the first session - there was no gap
             * at all and the very first ad was allowed the instant the player
             * lost their first game. The worst possible moment for it.
             *
             * The process starting is the honest signal that the app was
             * opened. It is also what makes this work for a player who goes to
             * the home screen and straight back into a game: the clock is
             * anchored once, when the app opens, and not every time an
             * activity changes.
             */
            com.redundantstudios.arcade.ads.AdPolicy.onAppOpened(this)
        } catch (e: Throwable) {
            Log.w("ShellApp", "ad clock anchor skipped: ${e.message}")
        }
        try {
            /*
             * The AD CLOCK STARTS WHEN THE APP IS OPENED.
             *
             * The interstitial gap is measured from the last ad, so with nothing
             * recorded - a fresh install, or the first session - there was no
             * gap at all and the very first ad was allowed the instant the
             * player lost their first game. The worst possible moment for it.
             *
             * Anchoring the clock to the app's foreground entry means the
             * player gets their time first, and the ad arrives later, when it
             * is least unwelcome. Coming back to the app restarts it too: a
             * player who left and came back should not be met with an ad
             * either.
             *
             * The signal is the count of STARTED activities crossing from zero
             * to one, which is the app coming to the front. Opening a game from
             * the home screen does not move that count, so it does not count as
             * opening the app - which is the point: the player has to actually
             * leave and come back for the clock to restart.
             */
            var started = 0
            var awayConfirmed = false
            var awayCheck: Runnable? = null
            val main = android.os.Handler(android.os.Looper.getMainLooper())
            registerActivityLifecycleCallbacks(object : Application.ActivityLifecycleCallbacks {
                override fun onActivityStarted(activity: android.app.Activity) {
                    started++
                    if (started == 1) {
                        val pendingAwayCheck = awayCheck
                        if (pendingAwayCheck != null) {
                            main.removeCallbacks(pendingAwayCheck)
                            awayCheck = null
                        }
                        /* Only re-anchor if the app was genuinely in the
                           BACKGROUND, not merely passing between two activities
                           of its own.

                           The count of started activities dips to zero for a
                           moment every time a game is closed and the home
                           screen comes back - the log showed it doing exactly
                           that, 19 seconds after a game was opened. Anchoring
                           on every dip meant a player who played a few short
                           games and returned to the menu each time would
                           never be shown a single ad, because the clock was
                           restarted every time they came home. That is the
                           opposite of what the clock is for.

                           So a dip only counts as the background if the count
                           is STILL zero a moment later. A transition inside the
                           app comes back within milliseconds and is
                           disregarded; time spent on the home screen or in
                           another app does not. */
                        if (awayConfirmed) {
                            awayConfirmed = false
                            try {
                                com.redundantstudios.arcade.ads.AdPolicy.onAppOpened(this@ShellApp)
                            } catch (e: Throwable) {
                                Log.w("ShellApp", "ad clock anchor skipped: ${e.message}")
                            }
                        }
                    }
                }
                override fun onActivityStopped(activity: android.app.Activity) {
                    started = (started - 1).coerceAtLeast(0)
                    if (started == 0) {
                        val check = Runnable {
                            awayCheck = null
                            if (started == 0) awayConfirmed = true
                        }
                        awayCheck = check
                        main.postDelayed(check, 1500)
                    }
                }
                override fun onActivityCreated(activity: android.app.Activity, state: android.os.Bundle?) {}
                override fun onActivityResumed(activity: android.app.Activity) {}
                override fun onActivityPaused(activity: android.app.Activity) {}
                override fun onActivitySaveInstanceState(activity: android.app.Activity, state: android.os.Bundle) {}
                override fun onActivityDestroyed(activity: android.app.Activity) {}
            })
        } catch (e: Throwable) {
            Log.w("ShellApp", "ad clock anchor not installed: ${e.message}")
        }
    }
}
