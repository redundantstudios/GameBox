package com.redundantstudios.arcade.audio

import android.app.Activity
import android.app.Application
import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import com.redundantstudios.arcade.R
import com.redundantstudios.arcade.util.SettingsManager

/**
 * The shell's sound identity.
 *
 * A quiet ambient loop under the shell screens plus a small set of UI blips
 * (tap / select / tick) recorded from the same instrument, so everything
 * sounds like one instrument instead of stock Android clicks.
 *
 * Rules:
 *  - Music and sound effects are separately switchable in Settings.
 *  - The volume slider is the MUSIC volume. It brings the ambient loop up and
 *    down and nothing else - the UI blips have their own level, so turning
 *    the music down does not take the shell's taps with it. See [sfxLevel].
 *  - The games are given the same slider as their own master, and 21 of the 25
 *    have no volume control of their own, so it has to keep doing that.
 *  - The loop belongs to the SHELL screens. Host counting (not plain
 *    resume/pause) decides when it plays: with recreate(), the NEW activity
 *    resumes before the OLD one pauses, so a naive handler stops the music
 *    after a theme change. Counting hosts means the loop only truly pauses
 *    when the last shell screen is gone (background, or a game took over).
 *  - The loop always FADES, and it loops without a seam - both are handled by
 *    [BgmLoop] (sample-rate gain ramp, index wrap instead of a re-seek).
 *  - `back()` is kept as an API slot for future dialogs/popups, but for now
 *    it plays the same subtle tap (no separate "back" sound by design).
 */
object ShellAudio {

    private var soundPool: SoundPool? = null
    private var bgm: BgmLoop? = null
    private var appContext: Context? = null

    private var tapId = 0
    private var selectId = 0
    private var backId = 0
    private var tickId = 0

    private var lastTickAt = 0L

    /** How many shell activities are currently resumed. */
    private var hostCount = 0

    /**
     * How many activities of ANY kind are currently started - the shell's and
     * GameActivity's alike.
     *
     * THIS IS THE ONE THAT MATTERS, and it exists because music was playing
     * with no app on screen.
     *
     * [hostCount] alone could not be trusted to answer "is the app visible?":
     * it is incremented by `ThemedActivity.onResume` and decremented by
     * `ThemedActivity.onPause`, and it only counts the shell's own screens. Any
     * imbalance in that pair - a resume that is not matched by a pause, an
     * activity torn down on a path that skips one, a system restoring the task -
     * leaves the count positive while the player is on the home screen. The
     * music then has no reason to stop and no UI to explain it, and nothing
     * stops it short of killing the process.
     *
     * `onActivityStarted`/`onActivityStopped` is the framework's own answer to
     * that question, it is not derived from anything this app can get wrong,
     * and it counts every activity including the games. When it reaches zero
     * the app genuinely is not on screen any more - including the swipe-from-
     * recents case, which never reaches a destroy at all.
     */
    private var visibleCount = 0

    /** How loud the ambient loop sits under the UI, relative to the music volume. */
    private const val BGM_GAIN = 0.224f

    /**
     * Watch every activity's start/stop so the music can be tied to real
     * visibility instead of a counter this app maintains by hand.
     *
     * Registered once, from [installVisibilityWatch]. Deliberately NOT
     * unregistered and re-registered: the listener lives as long as the process,
     * which is exactly the lifetime the music has.
     */
    private class VisibilityWatch : Application.ActivityLifecycleCallbacks {
        override fun onActivityCreated(a: Activity, b: android.os.Bundle?) {}
        override fun onActivityStarted(a: Activity) { visibleCount++; leaveBackground() }
        override fun onActivityResumed(a: Activity) {}
        override fun onActivityPaused(a: Activity) {}
        override fun onActivityStopped(a: Activity) {
            visibleCount = (visibleCount - 1).coerceAtLeast(0)
            if (visibleCount == 0) enterBackground()
        }
        override fun onActivitySaveInstanceState(a: Activity, b: android.os.Bundle) {}
        override fun onActivityDestroyed(a: Activity) {}
    }

    private var watchInstalled = false

    private fun installVisibilityWatch(app: Context) {
        if (watchInstalled) return
        watchInstalled = true
        /* applicationContext IS the Application; the cast is only there because
           Context does not declare the callback registration. If it ever is not
           one the watch is simply absent, and the BGM falls back to the old
           host counting rather than breaking anything. */
        (app.applicationContext as? Application)?.registerActivityLifecycleCallbacks(VisibilityWatch())
    }

    /**
     * The app left the screen. The music goes with it, and it goes QUICKLY.
     *
     * The normal ramp is 2.2 seconds, which is right for a volume slider you
     * can hear finish - and completely wrong here, because two seconds of music
     * continuing over the home screen is precisely the complaint. Leaving the
     * foreground uses a short ramp instead, which is still a ramp (so there is
     * no click on the AudioTrack) but is over before the launcher settles.
     */
    private fun enterBackground() {
        bgm?.setFastRamp(true)
        bgm?.setTarget(0f)
    }

    private fun leaveBackground() {
        bgm?.setFastRamp(false)
        applyBgm()
    }

    fun init(context: Context) {
        if (soundPool != null) return
        val app = context.applicationContext
        appContext = app
        SettingsManager.init(app)
        installVisibilityWatch(app)

        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        soundPool = SoundPool.Builder()
            .setMaxStreams(4)
            .setAudioAttributes(attrs)
            .build()
        tapId = soundPool!!.load(app, R.raw.sfx_tap, 1)
        selectId = soundPool!!.load(app, R.raw.sfx_select, 1)
        backId = soundPool!!.load(app, R.raw.sfx_back, 1)
        tickId = soundPool!!.load(app, R.raw.sfx_tick, 1)
    }

    /**
     * How loud the shell's UI blips are.
     *
     * NOT the volume slider. That slider is the MUSIC volume - it is there to
     * bring the ambient loop down under the games, and nothing else.
     *
     * It used to scale the taps as well, which meant the same slider that
     * quieted the music also quieted the feedback for touching things. The
     * worst of it was the slider's own tick: dragging the volume down made
     * the tick fade away with it, so the control you were using to set the
     * level went quiet as you lowered it. A UI that stops answering when you
     * turn it down feels broken, and a tap you can no longer hear is a tap
     * that is not doing its job.
     *
     * So the blips have their own level - the one they were authored at - and
     * the Sound switch is what turns them off. The per-sound gains below
     * (tap, select, back, tick) are relative to this.
     */
    private fun sfxLevel(): Float {
        if (appContext == null) return 0f
        return if (SettingsManager.soundEnabled) 1f else 0f
    }

    /** 0 when the music switch is off; otherwise the music volume from Settings, 0..1. */
    private fun musicLevel(): Float {
        if (appContext == null) return 0f
        return if (SettingsManager.musicEnabled) {
            (SettingsManager.soundVolume / 100f).coerceIn(0f, 1f)
        } else 0f
    }

    fun tap(context: Context) = play(context, tapId, 0.9f)

    fun select(context: Context) = play(context, selectId, 0.95f)

    /**
     * Reserved for dialogs/popups later; today it is just a subtle tap so
     * leaving a screen does not need its own sound.
     */
    fun back(context: Context) = play(context, tapId, 0.7f)

    /**
     * Toggle switches: a much softer, quieter tap. Switching ON gets a tiny
     * pitch-up variant of the same sound so on/off feel different without
     * being loud.
     */
    fun tapTiny(context: Context) = play(context, tapId, 0.55f)

    fun tapToggleOn(context: Context) = play(context, tapId, 0.65f, 1.12f)

    /**
     * One subtle blip for the volume slider; throttled against machine-gunning.
     */
    fun tick(context: Context) {
        val now = System.currentTimeMillis()
        if (now - lastTickAt < 140) return
        lastTickAt = now
        play(context, tickId, 0.45f)
    }

    private fun play(context: Context, id: Int, gain: Float, rate: Float = 1f) {
        init(context)
        val level = sfxLevel()
        if (level <= 0f) return
        soundPool?.play(id, level * gain, level * gain, 1, 0, rate)
    }

    // ------------------------------------------------------------------
    // Ambient loop with fades + host counting
    // ------------------------------------------------------------------

    /**
     * Start decoding the ambient loop NOW, without waiting for a host screen.
     *
     * Called from [com.redundantstudios.arcade.ShellApp], which exists before any
     * activity. The decode is a full PCM expansion of the asset on a background
     * thread, and it used to start in `onResume()` - after process start, the
     * launcher and the home screen had all completed - so the app opened to
     * silence and the music walked in seconds late. Decoding during the splash
     * window means it is already ready when the first shell screen resumes.
     *
     * It hands the loop NO level. That is the whole point of this change, and it
     * was a real bug playing music to an empty house.
     *
     * `Application.onCreate()` runs on EVERY process start - not just when the
     * player opens the app. This app schedules two WorkManager jobs, a reminder
     * every 24 hours and an update check every 6, and WorkManager starts the
     * process to run them. WorkManager also re-arms its jobs across a reboot.
     * So this function was being called, with no activity and no UI anywhere on
     * the screen, on a schedule the player never asked for - and it used to hand
     * the loop `musicLevel() * BGM_GAIN` directly instead of going through
     * [targetLevel]. Music therefore started playing in the background at some
     * arbitrary point in the day, kept playing after the phone was restarted,
     * and stopped only when the app was uninstalled and the jobs went with it.
     *
     * The decode is the part worth doing early and it still happens here. The
     * level is now [targetLevel], which is zero with nothing visible, so a
     * background process start decodes the loop and then leaves it silent. The
     * first real shell screen's [hostResumed] fades it in, and by then it is
     * already decoded - which was the original point of warming it up.
     */
    fun warmUp(context: Context) {
        init(context)
        val loop = ensureBgm() ?: return
        loop.setTarget(targetLevel())
    }

    /** A shell screen came to the foreground. Starts (or resumes) with a fade. */
    fun hostResumed(context: Context) {
        init(context)
        hostCount++
        applyBgm()
    }

    /** A shell screen went away. Only the LAST host leaving pauses the loop. */
    fun hostPaused() {
        hostCount = (hostCount - 1).coerceAtLeast(0)
        applyBgm()
    }

    /** Re-apply the current settings (called after volume/toggle changes). */
    fun refresh(context: Context) {
        init(context)
        applyBgm()
    }

    /**
     * The volume the music is allowed, right now.
     *
     * TWO conditions, and both must hold. `visibleCount > 0` is the important
     * one: it is the only thing standing between the player and music playing
     * to an empty home screen.
     */
    private fun targetLevel(): Float =
        if (visibleCount > 0 && hostCount > 0) musicLevel() * BGM_GAIN else 0f

    /**
     * Hand the wanted volume to the loop; it ramps there at sample rate, so
     * every change is a fade and there is never a cut or a click.
     */
    private fun applyBgm() {
        val loop = ensureBgm() ?: return
        /* A short ramp is for leaving the foreground; a long one is for
           everything else. Leaving background resets it so the two states do
           not depend on which happened to run last. */
        loop.setFastRamp(visibleCount == 0)
        loop.setTarget(targetLevel())
    }

    private fun ensureBgm(): BgmLoop? {
        bgm?.let { return it }
        val app = appContext ?: return null
        val loop = BgmLoop(app, R.raw.bgm_shell)
        bgm = loop
        loop.prepare()
        return loop
    }

    fun release() {
        hostCount = 0
        visibleCount = 0
        bgm?.release()
        bgm = null
        soundPool?.release()
        soundPool = null
        appContext = null
    }
}
