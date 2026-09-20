package com.redundantstudios.arcade.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.SoundPool
import android.os.Build
import com.redundantstudios.arcade.R
import com.redundantstudios.arcade.util.SettingsManager

/**
 * The shell's sound identity.
 *
 * A quiet, warm marimba loop under the shell screens plus a small set of UI
 * blips (tap / select / back / tick) recorded from the same instrument, so
 * everything sounds like one instrument instead of stock Android clicks.
 *
 * Rules:
 *  - Nothing plays unless Settings says sound is on and the volume is > 0.
 *  - The loop belongs to the SHELL screens: it starts in [ThemedActivity] and
 *    pauses with the activity, so it never fights a game's own audio.
 *  - Everything follows the master volume from Settings.
 */
object ShellAudio {

    private var soundPool: SoundPool? = null
    private var bgm: MediaPlayer? = null
    private var appContext: Context? = null

    private var tapId = 0
    private var selectId = 0
    private var backId = 0
    private var tickId = 0

    private var lastTickAt = 0L

    /** How loud the ambient loop sits under the UI, relative to the master volume. */
    private const val BGM_GAIN = 0.32f

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

    /** 0 when sound is off; otherwise the master volume from Settings, 0..1. */
    private fun master(): Float {
        if (appContext == null) return 0f
        return if (SettingsManager.soundEnabled) {
            (SettingsManager.soundVolume / 100f).coerceIn(0f, 1f)
        } else 0f
    }

    fun tap(context: Context) = play(context, tapId, 0.9f)

    fun select(context: Context) = play(context, selectId, 0.95f)

    fun back(context: Context) = play(context, backId, 0.85f)

    /** Slider feedback, throttled so dragging does not machine-gun. */
    fun tick(context: Context) {
        val now = System.currentTimeMillis()
        if (now - lastTickAt < 110) return
        lastTickAt = now
        play(context, tickId, 0.75f)
    }

    private fun play(context: Context, id: Int, gain: Float) {
        init(context)
        val master = master()
        if (master <= 0f) return
        soundPool?.play(id, master * gain, master * gain, 1, 0, 1f)
    }

    /**
     * Start (or resume) the ambient loop and apply the current master volume.
     * Safe to call on every resume - it only starts playback when sound is on.
     */
    fun startBgm(context: Context) {
        init(context)
        val master = master()
        if (bgm == null) {
            bgm = try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    MediaPlayer.create(
                        context.applicationContext, R.raw.bgm_shell,
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                            .build(), 0
                    )
                } else {
                    MediaPlayer.create(context.applicationContext, R.raw.bgm_shell)
                }
            } catch (_: Exception) {
                null
            }?.apply { isLooping = true }
        }
        val player = bgm ?: return
        val volume = master * BGM_GAIN
        player.setVolume(volume, volume)
        if (volume <= 0f) {
            if (player.isPlaying) player.pause()
        } else if (!player.isPlaying) {
            player.start()
        }
    }

    /** Shell screen went to the background (or a game took over). */
    fun pauseBgm() {
        try {
            bgm?.takeIf { it.isPlaying }?.pause()
        } catch (_: Exception) {
        }
    }

    /** Re-apply the current settings (called after volume/toggle changes). */
    fun refresh(context: Context) = startBgm(context)

    fun release() {
        pauseBgm()
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
