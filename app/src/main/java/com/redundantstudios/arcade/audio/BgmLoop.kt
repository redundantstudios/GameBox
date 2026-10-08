package com.redundantstudios.arcade.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.util.Log
import android.os.SystemClock
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Seamless, fade-able background music for the shell.
 *
 * WHY THIS EXISTS
 * The loop used to run on `MediaPlayer` with `isLooping = true`, and that is
 * where "a hard click once per loop / the BGM keeps cutting" came from: on
 * every wrap MediaPlayer restarts the file, and because a pad is not at zero
 * amplitude at its ends the restart is a step in the waveform - an audible
 * click, every single loop. No MediaPlayer setting removes it, and
 * `setOnCompletionListener` + `seekTo` is worse (it adds a gap on top).
 *
 * So the loop is decoded ONCE to raw PCM (MediaExtractor + MediaCodec - both
 * framework APIs, and Vorbis is a mandatory Android codec) and streamed into
 * an `AudioTrack` by a small feeder thread whose read position simply wraps
 * back to zero. Wrapping an index is sample-exact: no seek, no gap, no click,
 * for as long as the shell is open.
 *
 * FADES
 * The feeder applies the gain per SAMPLE while it copies, so ramps are smooth
 * by construction and can never click - however abruptly the shell asks for
 * silence. `setTarget()` only says where the ramp is heading.
 */
internal class BgmLoop(context: Context, private val resId: Int) {

    private companion object {
        const val TAG = "BgmLoop"

        /** Frames per write: small enough to react to fades, big enough for slack. */
        const val CHUNK_FRAMES = 1024

        /** Fade speed: full scale in this many milliseconds. */
        const val FADE_MS = 2200f

        /** Below this the loop counts as silent and the track is parked. */
        const val SILENT = 0.0005f
    }

    private val appContext = context.applicationContext

    /** Where the volume is heading, 0..1. Written by the UI thread. */
    @Volatile private var target = 0f

    /** Where the volume is right now, 0..1. Owned by the feeder thread. */
    private var gain = 0f

    @Volatile private var released = false

    private var channels = 2
    private var sampleRate = 44100

    private var track: AudioTrack? = null
    private var worker: Thread? = null

    /** True while the AudioTrack is playing (feeder thread only). */
    private var playing = false

    /**
     * True when the loop is parked/silent, i.e. the next start can be cut
     * straight to full level without a click (feeder thread only).
     *
     * Separate from [playing]: the track is also not playing for the moment
     * between `play()` and the first write, and the AudioTrack buffer itself
     * needs priming before that first sample is audible.
     */
    private var wasFaded = true

    // ------------------------------------------------------------------
    // Streaming PCM hand-off
    //
    // The decode and the playback are two SEPARATE threads and they overlap.
    // Decoding this 155s track takes ~9s on device, so waiting for the whole
    // thing before playing anything is what the player hears as "the music
    // starts a few seconds late". Instead the decoder publishes growing
    // snapshots of the PCM as it goes and the feeder plays them straight away:
    // half a second of audio is decoded in ~30ms, so sound starts essentially
    // with the app.
    //
    // Snapshots are immutable holders rather than a size field beside an array
    // field, because the decoder swaps in a LARGER array as it grows. If the
    // feeder could read the size before the array it would see a new length
    // against the old, short array and walk off the end of it. Reading one
    // reference gives a matched (array, length) pair every time.
    // ------------------------------------------------------------------

    private class Snap(val data: ShortArray, val size: Int, val total: Int)

    /** -1 total means "not fully decoded yet", so the feeder must not wrap. */
    @Volatile private var snap = Snap(ShortArray(1 shl 16), 0, -1)

    /** Set if the decode gave up, so a feeder waiting on data can give up too. */
    @Volatile private var decodeFailed = false

    /**
     * True once the decoder has read the asset's real sample rate and channel
     * count.
     *
     * CRITICAL, NOT COSMETIC. [feed] builds its AudioTrack from these fields,
     * and it now runs on its own thread alongside the decoder instead of after
     * it. Without this gate the feeder wins the race, sees the 44100 default,
     * and opens the track at 44100Hz while the PCM is 32000Hz - which does not
     * sound wrong, it sounds like a chipmunk: the music plays 44100/32000 =
     * 1.38x fast for the whole session. The two must be the same number.
     */
    @Volatile private var formatReady = false

    /** Set when playback work starts, so first-audio can be timed from it. */
    private val startedAt = SystemClock.elapsedRealtime()

    /**
     * Decodes the asset on a background thread, feeding playback as it goes.
     * Safe to call repeatedly; only the first call does work.
     */
    fun prepare() {
        if (worker != null || released) return
        worker = Thread({
            /* One extra thread: the decode has to keep running while the feeder
               is playing, which a single sequential decode-then-feed cannot do. */
            val decoder = Thread({ decodeToBuffer() }, "shell-bgm-decode").apply {
                priority = Thread.MIN_PRIORITY
                start()
            }
            try {
                feed()
            } catch (e: Exception) {
                Log.w(TAG, "BGM playback stopped", e)
            }
            decoder.interrupt()
        }, "shell-bgm-feed").apply {
            priority = Thread.MIN_PRIORITY
            start()
        }
    }

    /**
     * Where the music should be right now. The feeder ramps towards it at
     * sample rate, so 0 is a fade-out, not a cut.
     */
    fun setTarget(level: Float) {
        target = level.coerceIn(0f, 1f)
    }

    fun release() {
        released = true
        target = 0f
        worker?.interrupt()
        worker = null
        try {
            track?.pause()
            track?.flush()
            track?.release()
        } catch (_: Exception) {
        }
        track = null
    }

    // ------------------------------------------------------------------
    // Decode into growing snapshots while the feeder plays them
    // ------------------------------------------------------------------

    /** Appends one decoded buffer, growing and republishing the snapshot. */
    private fun publish(buffer: ByteBuffer) {
        val shorts = buffer.remaining() / 2
        if (shorts <= 0) return
        val cur = snap
        if (cur.size + shorts > cur.data.size) {
            var cap = cur.data.size
            while (cap < cur.size + shorts) cap = cap shl 1
            val bigger = cur.data.copyOf(cap)
            buffer.order(ByteOrder.nativeOrder()).asShortBuffer().get(bigger, cur.size, shorts)
            snap = Snap(bigger, cur.size + shorts, cur.total)
        } else {
            buffer.order(ByteOrder.nativeOrder()).asShortBuffer().get(cur.data, cur.size, shorts)
            snap = Snap(cur.data, cur.size + shorts, cur.total)
        }
    }

    /** Marks the end of the track, which is what lets the feeder wrap. */
    private fun publishTotal() {
        val cur = snap
        snap = Snap(cur.data, cur.size, cur.size)
    }

    private fun decodeToBuffer() {
        try {
            decode()
        } catch (e: Exception) {
            Log.w(TAG, "BGM decode failed, music disabled", e)
            decodeFailed = true
            return
        } catch (e: OutOfMemoryError) {
            Log.w(TAG, "BGM too large to decode", e)
            decodeFailed = true
            return
        }
        if (released) return
        val cur = snap
        if (cur.size == 0) {
            decodeFailed = true
            return
        }
        publishTotal()
        Log.d(
            TAG,
            "decoded ${cur.size / channels} frames @ ${sampleRate}Hz, ${channels}ch " +
                "in ${SystemClock.elapsedRealtime() - startedAt}ms"
        )
    }

    /**
     * Decodes the whole track, publishing it as it arrives. The buffer keeps
     * growing and is only ever appended to, so the feeder can start on the first
     * chunk and the wrap at the end is still sample-exact.
     */
    private fun decode() {
        val extractor = MediaExtractor()
        var codec: MediaCodec? = null
        try {
            appContext.resources.openRawResourceFd(resId).use { afd ->
                extractor.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
            }
            var trackIndex = -1
            var format: MediaFormat? = null
            for (i in 0 until extractor.trackCount) {
                val f = extractor.getTrackFormat(i)
                val mime = f.getString(MediaFormat.KEY_MIME) ?: continue
                if (mime.startsWith("audio/")) {
                    trackIndex = i
                    format = f
                    break
                }
            }
            if (trackIndex < 0 || format == null) return
            extractor.selectTrack(trackIndex)

            sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            val mime = format.getString(MediaFormat.KEY_MIME) ?: return
            /* The real format is now known. The feeder must not build its
               AudioTrack before this point - see [formatReady]. */
            formatReady = true

            codec = MediaCodec.createDecoderByType(mime)
            codec.configure(format, null, null, 0)
            codec.start()

            val info = MediaCodec.BufferInfo()
            var inputDone = false
            var outputDone = false

            /* THROUGHPUT, NOT CORRECTNESS, IS THE WHOLE GAME HERE.
               This loop used to queue ONE input buffer and take ONE output
               buffer per pass, with a 10ms blocking timeout on each. That
               serialises feeding against draining, so the codec is starved and
               spends most of the loop sitting in that timeout: decoding the
               155s track took 13.6s on device, which is exactly the "the music
               starts a few seconds late" delay - and no amount of warming the
               decode up earlier can hide 13.6s of work.

               So: queue everything the codec will take, drain everything it has
               produced, and only block when BOTH sides are genuinely empty. The
               blocking call is kept for that idle case, otherwise this spins. */
            while (!outputDone && !released) {
                /* 1. Feed, never blocking. */
                if (!inputDone) {
                    while (true) {
                        val inIndex = codec.dequeueInputBuffer(0)
                        if (inIndex < 0) break
                        val buffer = codec.getInputBuffer(inIndex) ?: return
                        val size = extractor.readSampleData(buffer, 0)
                        if (size < 0) {
                            codec.queueInputBuffer(
                                inIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM
                            )
                            inputDone = true
                            break
                        }
                        codec.queueInputBuffer(
                            inIndex, 0, size, extractor.sampleTime, 0
                        )
                        extractor.advance()
                    }
                }

                /* 2. Drain everything already decoded, never blocking. */
                var progressed = false
                while (true) {
                    val outIndex = codec.dequeueOutputBuffer(info, 0)
                    if (outIndex == MediaCodec.INFO_TRY_AGAIN_LATER) break
                    if (outIndex < 0) continue
                    progressed = true
                    val buffer: ByteBuffer? = codec.getOutputBuffer(outIndex)
                    if (buffer != null && info.size > 0) {
                        buffer.position(info.offset)
                        buffer.limit(info.offset + info.size)
                        publish(buffer.order(ByteOrder.nativeOrder()))
                    }
                    codec.releaseOutputBuffer(outIndex, false)
                    if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
                        outputDone = true
                        break
                    }
                }

                /* 3. Nothing moved and there is still input to give it: wait. */
                if (!progressed && !inputDone && !outputDone) {
                    val outIndex = codec.dequeueOutputBuffer(info, 10)
                    if (outIndex >= 0) {
                        val buffer: ByteBuffer? = codec.getOutputBuffer(outIndex)
                        if (buffer != null && info.size > 0) {
                            buffer.position(info.offset)
                            buffer.limit(info.offset + info.size)
                            publish(buffer.order(ByteOrder.nativeOrder()))
                        }
                        codec.releaseOutputBuffer(outIndex, false)
                        if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
                            outputDone = true
                        }
                    }
                }
            }
            return
        } finally {
            try {
                codec?.stop()
            } catch (_: Exception) {
            }
            try {
                codec?.release()
            } catch (_: Exception) {
            }
            extractor.release()
        }
    }

    /**
     * Plays the decoded PCM into an AudioTrack, wrapping at the end of the
     * buffer. Wrapping an index is what makes the loop seamless - there is no
     * file to re-open and no seek, so nothing can insert a gap or a step.
     *
     * It does NOT wait for the decode to finish: it starts on the first
     * published chunk and catches up as more arrives, only ever wrapping once
     * [Snap.total] says the whole track is there. Until then it pauses at the
     * frontier instead of wrapping onto samples that do not exist yet.
     */
    private fun feed() {
        /* Nothing below may run until the decoder has published the real
           format. See [formatReady] - skipping this plays the track at the
           wrong rate. */
        while (!released && !formatReady && !decodeFailed) {
            try {
                Thread.sleep(5)
            } catch (_: InterruptedException) {
                return
            }
        }
        if (released || decodeFailed || !formatReady) return
        Log.d(TAG, "AudioTrack at ${sampleRate}Hz x$channels (matches decoded PCM)")

        val minBytes = AudioTrack.getMinBufferSize(
            sampleRate,
            if (channels == 1) AudioFormat.CHANNEL_OUT_MONO else AudioFormat.CHANNEL_OUT_STEREO,
            AudioFormat.ENCODING_PCM_16BIT
        )
        if (minBytes <= 0) return
        // Generous slack so the feeder can never underrun while fading.
        val bufferBytes = (minBytes * 2).coerceAtLeast(CHUNK_FRAMES * channels * 2 * 4)

        val audioTrack = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(sampleRate)
                    .setChannelMask(
                        if (channels == 1) AudioFormat.CHANNEL_OUT_MONO
                        else AudioFormat.CHANNEL_OUT_STEREO
                    )
                    .build()
            )
            .setBufferSizeInBytes(bufferBytes)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()
        track = audioTrack
        if (audioTrack.state != AudioTrack.STATE_INITIALIZED) {
            Log.w(TAG, "AudioTrack not initialised, music disabled")
            return
        }

        val chunk = ShortArray(CHUNK_FRAMES * channels)
        // Per-sample ramp step: full scale takes FADE_MS.
        val step = 1f / (sampleRate * FADE_MS / 1000f)

        var pos = 0
        /* Half a second of audio before the first sample: enough that the track
           is never primed from an empty buffer, and it decodes in ~30ms. */
        val primeShorts = sampleRate * channels / 2
        var loggedFirstAudio = false
        while (!released) {
            if (target <= SILENT && gain <= SILENT) {
                // Faded out: park the hardware instead of streaming silence.
                if (playing) {
                    try {
                        audioTrack.pause()
                    } catch (_: Exception) {
                    }
                    playing = false
                }
                gain = 0f
                wasFaded = true
                try {
                    Thread.sleep(20)
                } catch (_: InterruptedException) {
                    return
                }
                continue
            }

            /* Wait for enough decoded audio to start, and never read past what
               the decoder has published. One snapshot per pass, so array and
               length always agree. */
            val cur = snap
            if (cur.size < primeShorts) {
                if (decodeFailed) return
                try {
                    Thread.sleep(5)
                } catch (_: InterruptedException) {
                    return
                }
                continue
            }
            val end = if (cur.total >= 0) cur.total else cur.size
            if (pos >= end) {
                if (cur.total >= 0 && cur.total > 0) {
                    pos = 0                      // whole track decoded: loop it
                } else {
                    try {
                        Thread.sleep(5)          // still decoding: hold position
                    } catch (_: InterruptedException) {
                        return
                    }
                    continue
                }
            }

            if (!playing) {
                audioTrack.play()
                playing = true
                if (!loggedFirstAudio) {
                    loggedFirstAudio = true
                    Log.d(TAG, "first audio written at +${SystemClock.elapsedRealtime() - startedAt}ms")
                }
                /* STARTING FROM SILENCE IS THE "DELAY" THE PLAYER HEARS.
                 * `gain` is 0 until the feeder ramps it up, and the ramp is a
                 * deliberate 2.2s fade so that pausing/resuming the music never
                 * clicks. But at COLD START there is no prior level to protect:
                 * nothing was playing a moment ago, so ramping from zero just
                 * means the loop takes over 2 seconds to become audible - on
                 * top of any decode time - and the app looks broken-silent at
                 * exactly the moment it should be sounding alive.
                 *
                 * So the first transition out of the parked state jumps straight
                 * to the target. Every subsequent change still fades. `wasFaded`
                 * tracks "we have been parked/silent", which is the only case
                 * where a cut cannot be heard - the track is not playing, so
                 * there is no waveform step to click. */
                if (wasFaded) {
                    gain = target
                }
                wasFaded = false
            }

            var i = 0
            val stop = minOf(end, pos + chunk.size)
            while (i < chunk.size && pos < stop) {
                if (gain < target) gain = (gain + step).coerceAtMost(target)
                else if (gain > target) gain = (gain - step).coerceAtLeast(target)
                chunk[i] = (cur.data[pos] * gain).toInt().toShort()
                i++
                pos++
            }
            /* Everything written was real audio; a zero tail would be a click. */
            while (i < chunk.size) chunk[i++] = 0
            val written = audioTrack.write(chunk, 0, chunk.size)
            if (written < 0) {
                Log.w(TAG, "AudioTrack.write failed: $written")
                return
            }
        }
    }

}
