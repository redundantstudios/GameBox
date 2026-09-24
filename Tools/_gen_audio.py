"""Synthesizes the shell's SFX identity and encodes it into res/raw.

Director's sound spec, per sound:
 - sfx_tap     : bright pop at ~G4 with a tiny bounce tail, 80-100 ms
 - sfx_on      : toggle ON  - two-tone ascending C5 -> E5, 120-150 ms
 - sfx_off     : toggle OFF - two-tone descending E5 -> C5, softer, 120-150 ms
 - sfx_radio   : soft tick with a high resonant ping tail, 80-100 ms
 - sfx_tick    : volume-slider tick (kept tiny; not in the spec list)
 - sfx_theme_dn: light->dark - descending whoosh into a low warm thud, 300 ms
 - sfx_theme_up: dark->light - ascending shimmer into an airy chime, 300 ms

Pure-numpy synthesis, encoded with ffmpeg to OGG Vorbis.
"""
import os
import shutil
import subprocess
import wave

import numpy as np

SR = 44100
ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'app', 'src', 'main', 'res', 'raw')
os.makedirs(OUT, exist_ok=True)

NOTE = {
    'C4': 261.63, 'G3': 196.00, 'G4': 392.00, 'B4': 493.88,
    'C5': 523.25, 'E5': 659.26, 'C6': 1046.50, 'E6': 1318.51,
}

def render(seconds):
    return np.zeros(int(seconds * SR), dtype=np.float64)


def env_exp(n, attack, decay):
    """Instant-attack, exponential-decay envelope (percussive)."""
    k = np.arange(n)
    a = 1.0 - np.exp(-attack * k / SR)
    return a * np.exp(-decay * k / SR)


def tone(buf, freq, at, dur, amp, decay=6.0, harm=(1.0, 0.28, 0.08), phase=0.0):
    """A bright mallet-ish tone with upper partials, added into buf at `at` s."""
    start = int(at * SR)
    n = int(dur * SR)
    end = min(start + n, len(buf))
    k = np.arange(end - start)
    env = env_exp(end - start, 900.0, decay)
    seg = np.zeros(end - start)
    for h, g in enumerate(harm, start=1):
        seg += amp * g * env * np.sin(2 * np.pi * freq * h * k / SR + phase)
    buf[start:end] += seg
    return buf


def pop(buf, freq, at, dur, amp, decay=9.0):
    """A soft 'pop' body: pitched sine + a click of low-passed noise."""
    tone(buf, freq, at, dur, amp, decay=decay, harm=(1.0, 0.15))
    start = int(at * SR)
    n = int(0.012 * SR)
    end = min(start + n, len(buf))
    rng = np.random.default_rng(7)
    noise = rng.uniform(-1.0, 1.0, end - start)
    # one-pole lowpass keeps the click soft rather than harsh
    out = np.empty_like(noise)
    acc = 0.0
    for i, v in enumerate(noise):
        acc += 0.35 * (v - acc)
        out[i] = acc
    buf[start:end] += amp * 0.5 * env_exp(end - start, 1200.0, 90.0) * out
    return buf


def sweep(buf, f0, f1, at, dur, amp, curve=1.4):
    """A smooth frequency sweep with a raised-cosine envelope (click-free)."""
    start = int(at * SR)
    n = int(dur * SR)
    end = min(start + n, len(buf))
    k = np.arange(end - start) / SR
    frac = k / dur
    f = f0 * (f1 / f0) ** (frac ** curve)
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.sin(np.pi * frac) ** 1.2
    buf[start:end] += amp * env * np.sin(ph)
    return buf


def normalize(buf, peak=0.82):
    m = np.max(np.abs(buf))
    if m < 1e-9:
        return buf
    return buf * (peak / m)


def encode(src, dst):
    exe = shutil.which('ffmpeg')
    if exe:
        return subprocess.run([exe, '-y', '-hide_banner', '-loglevel', 'error',
                               '-i', src, '-c:a', 'libvorbis', '-q:a', '4', dst],
                              check=True)
    for guess in (r'C:\ffmpeg\ffmpeg\bin\ffmpeg.exe', r'C:\ffmpeg\bin\ffmpeg.exe'):
        if os.path.exists(guess):
            return subprocess.run([guess, '-y', '-hide_banner', '-loglevel', 'error',
                                   '-i', src, '-c:a', 'libvorbis', '-q:a', '4', dst],
                                  check=True)
    raise SystemExit('ffmpeg not found')


def save(name, buf, peak=0.82):
    pcm = (np.clip(normalize(np.asarray(buf, dtype=np.float64), peak), -1, 1)
           * 32767).astype('<i2')
    wav = os.path.join(OUT, name + '.wav')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    encode(wav, os.path.join(OUT, name + '.ogg'))
    os.remove(wav)
    print(name, os.path.getsize(os.path.join(OUT, name + '.ogg')), 'bytes')

# __PART3__
