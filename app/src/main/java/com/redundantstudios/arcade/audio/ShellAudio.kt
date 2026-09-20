package com.redundantstudios.arcade.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.SoundPool
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.redundantstudios.arcade.R
import com.redundantstudios.arcade.util.SettingsManager

/**
 * The shell's sound identity.
 *
 * A quiet, warm marimba loop under the shell screens plus a small set of UI
 * blips (tap / select / tick) recorded from the same instrument, so
 * everything sounds like one instrument instead of stock Android clicks.
 *
 * Rules:
 *  - Music and sound effects are separately switchable in Settings, and both
 *    follow the master volume.
 *  - The loop belongs to the SHELL screens. Host counting (not plain
 *    resume/pause) decides when it plays: with recreate(), the NEW activity
 *    resumes before the OLD one pauses, so a naive handler stops the music
 *    after a theme change. Counting hosts means the loop only truly pauses
 *    when the last shell screen is gone (background, or a game took over).
 *  - The loop always FADES. In, out, and on volume changes - never a cut.
 *  - `back()` is kept as an API slot for future dialogs/popups, but for now
 *    it plays the same subtle tap (no separate "back" sound by design).
 */
object ShellAudio {

    private var soundPool: SoundPool? = null
    private var bgm: MediaPlayer? = null
    private var appContext: Context? = null
    private val mainThread = Handler(Looper.getMainLooper())

    private var tapId = 0
    private var selectId = 0
    private var backId = 0
    private var tickId = 0

    private var lastTickAt = 0L

    /** How many shell activities are currently resumed. */
    private var hostCount = 0

    /** Where the loop volume is right now (0..1 of the BGM gain scale). */
    private var currentLevel = 0f
    private var fadeStep = 0

    /** How loud the ambient loop sits under the UI, relative to the master volume. */
    private const val BGM_GAIN = 0.32f

    /** Fade duration for in/out transitions. */
    private const val FADE_MS = 900L
    private const val FADE_STEPS = 12

    fun init(context: Context) {
        if (soundPool != null) return
        val app = context.applicationContext
        appContext = app
        SettingsManager.init(app)

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

    /** 0 when SFX are off; otherwise the master volume from Settings, 0..1. */
    private fun sfxLevel(): Float {
        if (appContext == null) return 0f
        return if (SettingsManager.soundEnabled) {
            (SettingsManager.soundVolume / 100f).coerceIn(0f, 1f)
        } else 0f
    }

    /** 0 when the music switch is off; otherwise the master volume, 0..1. */
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
    fun tapTiny(context: Context) = play(context, tapId, 0.3f)

    fun tapToggleOn(context: Context) = play(context, tapId, 0.35f, 1.12f)

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

    /** A shell screen came to the foreground. Starts (or resumes) with a fade. */
    fun hostResumed(context: Context) {
        init(context)
        hostCount++
        applyBgm()
    }

    /** A shell screen went away. Only the LAST host leaving pauses the loop. */
    fun hostPaused() {
        hostCount = (hostCount - 1).coerceAtLeast(0)
        if (hostCount == 0) applyBgm()
    }

    /** Re-apply the current settings (called after volume/toggle changes). */
    fun refresh(context: Context) {
        init(context)
        applyBgm()
    }

    private fun targetLevel(): Float =
        if (hostCount > 0) musicLevel() * BGM_GAIN else 0f

    private fun applyBgm() {
        val player = ensurePlayer() ?: return
        val target = targetLevel()
        if (target > 0f && !player.isPlaying && currentLevel <= 0f) {
            // Starting from silence: come in at a whisper and fade up.
            currentLevel = 0f
            player.setVolume(0f, 0f)
            try {
                player.start()
            } catch (_: Exception) {
                return
            }
        }
        fadeTo(player, target)
    }

    /** Ramps the loop volume to [target] in [FADE_STEPS] steps over [FADE_MS]. */
    private fun fadeTo(player: MediaPlayer, target: Float) {
        mainThread.removeCallbacksAndMessages(null)
        fadeStep = 0
        fun step() {
            fadeStep++
            val t = fadeStep.toFloat() / FADE_STEPS
            currentLevel = currentLevel + (target - currentLevel) * t
            if (fadeStep >= FADE_STEPS) {
                currentLevel = target
                player.setVolume(target, target)
                if (target <= 0f) {
                    try {
                        player.pause()
                    } catch (_: Exception) {
                    }
                }
                return
            }
            player.setVolume(currentLevel, currentLevel)
            mainThread.postDelayed(::step, FADE_MS / FADE_STEPS)
        }
        step()
    }

    private fun ensurePlayer(): MediaPlayer? {
        if (bgm != null) return bgm
        val app = appContext ?: return null
        bgm = try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                MediaPlayer.create(
                    app, R.raw.bgm_shell,
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build(), 0
                )
            } else {
                MediaPlayer.create(app, R.raw.bgm_shell)
            }
        } catch (_: Exception) {
            null
        }?.apply { isLooping = true }
        return bgm
    }

    fun release() {
        hostCount = 0
        mainThread.removeCallbacksAndMessages(null)
        try {
            bgm?.release()
        } catch (_: Exception) {
        }
        bgm = null
        soundPool?.release()
        soundPool = null
        appContext = null
    }
}
