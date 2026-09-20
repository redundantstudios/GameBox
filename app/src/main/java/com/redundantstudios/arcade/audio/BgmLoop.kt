package com.redundantstudios.arcade.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.util.Log
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
        const val FADE_MS = 700f

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
     * Decodes the asset on a background thread, then starts feeding. Safe to
     * call repeatedly; only the first call does work.
     */
    fun prepare() {
        if (worker != null || released) return
        worker = Thread({ decodeThenFeed() }, "shell-bgm").apply {
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
    // Decode once, then feed forever
    // ------------------------------------------------------------------

    private fun decodeThenFeed() {
        val data = try {
            decode()
        } catch (e: Exception) {
            Log.w(TAG, "BGM decode failed, music disabled", e)
            null
        } catch (e: OutOfMemoryError) {
            Log.w(TAG, "BGM too large to decode", e)
            null
        }
        if (data == null || data.isEmpty() || released) return
        Log.d(TAG, "decoded ${data.size / channels} frames @ ${sampleRate}Hz, ${channels}ch")
        try {
            feed(data)
        } catch (e: Exception) {
            Log.w(TAG, "BGM playback stopped", e)
        }
    }

    /**
     * Decodes the whole track into one interleaved 16-bit buffer. A whole-track
     * buffer is what makes the wrap exact: there is nothing to re-read later.
     */
    private fun decode(): ShortArray? {
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
            if (trackIndex < 0 || format == null) return null
            extractor.selectTrack(trackIndex)

            sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            val mime = format.getString(MediaFormat.KEY_MIME) ?: return null

            codec = MediaCodec.createDecoderByType(mime)
            codec.configure(format, null, null, 0)
            codec.start()

            val out = ShortArrayBuilder()
            val info = MediaCodec.BufferInfo()
            var inputDone = false
            var outputDone = false

            while (!outputDone && !released) {
                if (!inputDone) {
                    val inIndex = codec.dequeueInputBuffer(10_000)
                    if (inIndex >= 0) {
                        val buffer = codec.getInputBuffer(inIndex) ?: return null
                        val size = extractor.readSampleData(buffer, 0)
                        if (size < 0) {
                            codec.queueInputBuffer(
                                inIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM
                            )
                            inputDone = true
                        } else {
                            codec.queueInputBuffer(
                                inIndex, 0, size, extractor.sampleTime, 0
                            )
                            extractor.advance()
                        }
                    }
                }
                val outIndex = codec.dequeueOutputBuffer(info, 10_000)
                if (outIndex >= 0) {
                    val buffer: ByteBuffer? = codec.getOutputBuffer(outIndex)
                    if (buffer != null && info.size > 0) {
                        buffer.position(info.offset)
                        buffer.limit(info.offset + info.size)
                        out.append(buffer.order(ByteOrder.nativeOrder()))
                    }
                    codec.releaseOutputBuffer(outIndex, false)
                    if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
                        outputDone = true
                    }
                }
            }
            return out.toArray()
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
     * Streams the decoded PCM into an AudioTrack and wraps at the end of the
     * buffer. Wrapping an index is what makes the loop seamless - there is no
     * file to re-open and no seek, so nothing can insert a gap or a step.
     */
    private fun feed(data: ShortArray) {
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
                try {
                    Thread.sleep(20)
                } catch (_: InterruptedException) {
                    return
                }
                continue
            }
            if (!playing) {
                audioTrack.play()
                playing = true
            }

            var i = 0
            while (i < chunk.size) {
                if (gain < target) gain = (gain + step).coerceAtMost(target)
                else if (gain > target) gain = (gain - step).coerceAtLeast(target)
                chunk[i] = (data[pos] * gain).toInt().toShort()
                i++
                pos++
                if (pos == data.size) pos = 0
            }
            val written = audioTrack.write(chunk, 0, chunk.size)
            if (written < 0) {
                Log.w(TAG, "AudioTrack.write failed: $written")
                return
            }
        }
    }

    /** Growable 16-bit sample buffer - no boxing, no per-sample allocations. */
    private class ShortArrayBuilder {
        private var data = ShortArray(1 shl 18)
        private var size = 0

        fun append(buffer: ByteBuffer) {
            val shorts = buffer.remaining() / 2
            ensure(size + shorts)
            buffer.asShortBuffer().get(data, size, shorts)
            size += shorts
        }

        private fun ensure(capacity: Int) {
            if (capacity <= data.size) return
            var next = data.size
            while (next < capacity) next = next shl 1
            data = data.copyOf(next)
        }

        fun toArray(): ShortArray = data.copyOf(size)
    }
}
