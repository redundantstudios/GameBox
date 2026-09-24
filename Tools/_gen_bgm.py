"""Regenerates the shell BGM, and it is seamless BY CONSTRUCTION.

Playback history, so the next take does not repeat old mistakes:
  * take 1 was too busy - a marimba arpeggio every bar made it "a song".
  * take 2 was the right mood but had a HARD CLICK on every wrap. Two causes:
    a crossfaded seam still bumps when the two blended signals are unrelated,
    and MediaPlayer re-seeks the file on each loop (see BgmLoop.kt for the
    playback half of the fix).
  * take 3 fixed the waveform seam mathematically. take 4 keeps that
    guarantee and changes the MATERIAL: a slower, slightly brighter evening
    pad.
  * take 5 swapped the harmony to C-major morning, but structurally it was
    the same slow pad - on a phone speaker it was indistinguishable. Rejected.
  * take 6 (this one) is a full rewrite of the MATERIAL: an upbeat 120 BPM
    arcade bounce - bouncy gated bass on every beat, plucky off-beat arps,
    soft kick + hat pulses, and a cheerful lead phrase. Fun and energetic.
    Synthesis moved from an ffmpeg aevalsrc monster-expression to numpy
    (renders in seconds instead of ~20 minutes); ffmpeg only encodes.

How seamlessness is guaranteed:
  * every tone's frequency is snapped to k / L (k integer), so each tone
    completes a whole number of cycles inside the loop and sample N-1 flows
    into sample 0 with no step.
  * every rhythmic envelope is exp(-r*mod(t, P)) or a cosine whose period P
    divides L exactly (beat 0.5 s, eighth 0.25 s, bar 2 s, loop 40 s all
    line up), so the groove is periodic in L too.
  * chord crossfades are cosine rise/fall pairs that sum to exactly 1 with
    their neighbour, INCLUDING across the seam.
  * the lead notes live entirely inside the loop with (near) zero amplitude
    at both ends, so the wrap can never truncate one.
Verify any take with:  python _check_loop.py
"""
import os
import shutil
import subprocess
import wave

import numpy as np

L = 40.0            # loop length in seconds: 18 bars at 108 BPM (72 beats)
BPM = 108.0
BAR = 60.0 / BPM * 4   # 2.2222 s per bar; exactly 98000 samples at 44.1 kHz
XF = 0.15           # chord crossfade length
SR = 44100

ROOT = os.path.dirname(os.path.abspath(__file__))
WAV = os.path.join(ROOT, '_bgm_render.wav')
OUT = os.path.join(ROOT, 'app', 'src', 'main', 'res', 'raw', 'bgm_shell.ogg')

# Funk vamp: E9 - E9 - A9 (three-bar cycle, 6 times per loop).
# 9th chords + syncopation = funk. Tones chosen for tiny phone speakers.
VOICES = [
    (82.41, [329.63, 415.30, 587.33, 739.99]),   # E9  (E G# D F#)
    (82.41, [329.63, 415.30, 587.33, 739.99]),   # E9
    (110.00, [440.00, 554.37, 783.99, 987.77]),  # A9  (A C# G B)
]
HARMONICS = (1.0, 0.35, 0.12)   # bass warmth; upper harmonics audible on phones
PAD_AMP = 0.0
BASS_AMP = 0.085
ARP_AMP = 0.0
KICK_AMP = 0.095
HAT_AMP = 0.013
LEAD_AMP = 0.040
STAB_AMP = 0.036
SNARE_AMP = 0.050

N = int(L * SR)
BARS = 18
BAR_S = N // BARS          # 98000 samples per bar (exact)
STEP = BAR_S // 16         # one 16th note
t = np.arange(N) / SR
SNAP = lambda f: round(f * L) / L   # k/L-grid frequency


def tone(freq, amp, phase=0.0, detune=True):
    """One note: detuned sine pair per harmonic (warm) or plain, periodic in L."""
    freq = SNAP(freq)
    out = np.zeros(N)
    for h, h_amp in enumerate(HARMONICS, start=1):
        f = freq * h
        if detune:
            for sign in (-2 / L, 2 / L):
                out += amp * h_amp * np.sin(2 * np.pi * (f + sign) * t
                                            + phase * h)
        else:
            out += amp * h_amp * np.sin(2 * np.pi * f * t + phase * h)
    return out


def pluck(period, offset, decay, attack=350.0):
    """Percussive gate: fast ~2 ms rise then exp decay, repeated every
    `period` (which divides L, so the pattern is periodic in L). The rise
    starts at zero so re-attacks never step the waveform (no clicks)."""
    m = np.mod(t - offset, period)
    return (1 - np.exp(-attack * m)) * np.exp(-decay * m)


def _ramp(dist):
    """Cosine ramp 0 -> 1 centred on dist = 0, spanning +/-XF/2. `dist` is
    reduced with a wrap-safe signed mod, so ramps stay correct across the
    loop seam (e.g. bar 20's boundary at t = 40 == t = 0)."""
    s = (dist + L / 2) % L - L / 2
    x = np.clip((s + XF / 2) / XF, 0.0, 1.0)
    return 0.5 - 0.5 * np.cos(np.pi * x)


def window(i):
    """Crossfade window for the chord on bar `i`: rises over the XF before the
    bar and falls over the XF after it. Ramps of neighbouring bars are exact
    antiphase cosines, so their sum is 1 everywhere INCLUDING across the seam."""
    return _ramp(t - i * BAR) * _ramp((i + 1) * BAR - t)



def _bar_env(hits, decay_base=8.0):
    """One bar of a percussive envelope from (16th-step, decay) hits. Built at
    bar length (exact sample count) and tiled, so the groove is periodic in L."""
    b = np.zeros(BAR_S)
    n = np.arange(BAR_S) / SR
    for step, decay in hits:
        seg = (1 - np.exp(-500 * n)) * np.exp(-decay * n)
        b[step * STEP:] += seg[:BAR_S - step * STEP]
    return np.tile(b, BARS)


def _wrap_add(out, start, sig):
    """Add `sig` at absolute sample `start`, wrapping any tail past the loop
    end back to t=0 (safe because all carriers are periodic in L)."""
    start %= N
    L1 = min(len(sig), N - start)
    out[start:start + L1] += sig[:L1]
    if L1 < len(sig):
        out[:len(sig) - L1] += sig[L1:]


def channel(flip):
    """One channel; `flip` mirrors phases for stereo width."""
    ph = 0.9 if flip else 0.0
    out = np.zeros(N)

    # -- drums: kick on 1 & the "a" of 2, snare on 2 & 4, hats on 16ths ----
    kick = _bar_env([(0, 24.0), (7, 26.0)])
    out += KICK_AMP * kick * np.sin(2 * np.pi * SNAP(150) * t)

    snare = _bar_env([(4, 30.0), (12, 30.0)])
    out += SNARE_AMP * snare * (
        np.sin(2 * np.pi * SNAP(1850) * t)
        + 0.7 * np.sin(2 * np.pi * SNAP(2450) * t + 1.3))

    hat_hits = [(s, 70.0) for s in range(16)]
    hat = _bar_env(hat_hits)
    accent = (np.arange(BARS * 16) % 2 == 1).astype(float) * 0.5 + 0.75
    hat_amp = np.repeat(accent, STEP)
    out += HAT_AMP * hat * hat_amp * np.sin(2 * np.pi * SNAP(8200) * t)

    # -- slap bass: syncopated root/octave/fifth riff per chord ------------
    for i in range(BARS):
        root, _ = VOICES[i % 3]
        fifth = root * 1.5
        riff = [(0, root, 6.0), (3, root, 8.0), (6, root * 2, 9.0),
                (8, root, 7.0), (11, fifth, 9.0), (14, root * 2, 10.0)]
        for step, freq, decay in riff:
            start = (i * BAR_S) + step * STEP
            seg_len = min(int(1.2 * SR), N)
            k = np.arange(seg_len)
            tt = ((start + k) % N) / SR
            env = (1 - np.exp(-500 * k / SR)) * np.exp(-decay * k / SR)
            _wrap_add(out, start, BASS_AMP * env
                      * np.sin(2 * np.pi * SNAP(freq) * tt + ph))

    # -- funky chord stabs on the "and" of 2 and 4 --------------------------
    for i in range(BARS):
        _, notes = VOICES[i % 3]
        for step, decay in ((6, 5.0), (14, 5.5)):
            start = (i * BAR_S) + step * STEP
            seg_len = min(int(1.0 * SR), N)
            k = np.arange(seg_len)
            tt = ((start + k) % N) / SR
            env = (1 - np.exp(-500 * k / SR)) * np.exp(-decay * k / SR)
            sig = np.zeros(seg_len)
            for n, f in enumerate(notes):
                sig += np.sin(2 * np.pi * SNAP(f) * tt + 0.4 * n + ph)
            _wrap_add(out, start, STAB_AMP * env * sig)

    # -- funky lead lick (E major pentatonic + b7) on the E9 bars ----------
    RIFF = [(0, 659.26), (2, 587.33), (4, 493.88), (6, 587.33),
            (10, 739.99), (12, 659.26), (14, 493.88)]
    for i in range(BARS):
        if i % 3 == 2:
            continue    # leave the A9 bars breathing
        for step, freq in RIFF:
            start = (i * BAR_S) + step * STEP
            seg_len = int(0.30 * SR)
            k = np.arange(seg_len)
            tt = ((start + k) % N) / SR
            env = (1 - np.exp(-k / SR / 0.012)) * np.exp(-8.0 * k / SR)
            _wrap_add(out, start, LEAD_AMP * env
                      * np.sin(2 * np.pi * SNAP(freq) * tt))

    # -- sparkle shimmer, periodic in 10 s and 20 s ---------------------------
    out += 0.008 * np.sin(2 * np.pi * SNAP(2093) * t) * (
        0.5 - 0.5 * np.cos(2 * np.pi * t / 10))
    return out


def encode(src, dst):
    exe = shutil.which('ffmpeg')
    if exe:
        return subprocess.run([
            exe, '-y', '-hide_banner', '-loglevel', 'error',
            '-i', src, '-c:a', 'libvorbis', '-q:a', '2', dst,
        ], check=True)
    for guess in (r'C:\ffmpeg\ffmpeg\bin\ffmpeg.exe', r'C:\ffmpeg\bin\ffmpeg.exe'):
        if os.path.exists(guess):
            return subprocess.run([
                guess, '-y', '-hide_banner', '-loglevel', 'error',
                '-i', src, '-c:a', 'libvorbis', '-q:a', '2', dst,
            ], check=True)
    raise SystemExit('ffmpeg not found')


left, right = channel(False), channel(True)
peak = max(np.abs(left).max(), np.abs(right).max())
gain = 0.85 / peak
stereo = np.stack([left, right], axis=1) * gain
pcm = (np.clip(stereo, -1.0, 1.0) * 32767).astype('<i2')
with wave.open(WAV, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('rendered', WAV, 'peak in:', round(peak, 3))
encode(WAV, OUT)
os.remove(WAV)
print('wrote', OUT, os.path.getsize(OUT), 'bytes')
