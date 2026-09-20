"""Synthesizes the shell's audio identity and encodes it into res/raw.

Sound language: warm wooden marimba/kalimba plucks over a soft pad - playful,
calm, and it sits well against the cream/brown studio palette.
 - bgm_shell  : 4-bar seamless loop, quiet enough to sit under the UI
 - sfx_tap    : short soft pop            (cards, tiles)
 - sfx_select : two-note rising blip      (choices, confirmations)
 - sfx_back   : two-note falling blip     (back navigation)
 - sfx_tick   : tiny tick                 (volume slider steps)
"""
import math, os, struct, subprocess, wave

SR = 44100
ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'app', 'src', 'main', 'res', 'raw')
os.makedirs(OUT, exist_ok=True)


def write_wav(name, samples):
    path = os.path.join(OUT, name + '.wav')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = bytearray()
        for s in samples:
            v = max(-0.98, min(0.98, s))
            frames += struct.pack('<h', int(v * 32767))
        w.writeframes(bytes(frames))
    return path


def to_ogg(wav_path):
    ogg = wav_path[:-4] + '.ogg'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav_path,
                    '-c:a', 'libvorbis', '-q:a', '4', ogg], check=True)
    os.remove(wav_path)
    return ogg


def pluck(freq, dur, decay=0.16, amp=0.5, bend=1.0, harm=((1, 1.0), (2, 0.30), (3, 0.10))):
    """Wooden marimba-ish pluck: partials with an exponential decay."""
    n = int(dur * SR)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        f = freq * (1.0 + (1.0 - bend) * 0.0)
        v = 0.0
        for mult, g in harm:
            v += g * math.sin(2 * math.pi * f * mult * t)
        out[i] = amp * v * math.exp(-t / decay)
    return out


def soft_chord(freqs, dur, amp=0.05):
    """Slow-attack pad so the loop has a floor under the plucks."""
    n = int(dur * SR)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        attack = min(1.0, t / 0.35)
        release = min(1.0, (dur - t) / 0.6)
        v = 0.0
        for f in freqs:
            v += math.sin(2 * math.pi * f * t) + 0.35 * math.sin(2 * math.pi * f * 2.001 * t)
        out[i] = amp * v / len(freqs) * attack * release
    return out


def mix_at(buf, snd, at_seconds, wrap=None):
    """Mix snd into buf at a position; wraps around the loop end for seamless loops."""
    start = int(at_seconds * SR)
    limit = len(buf) if wrap else len(buf)
    for i, v in enumerate(snd):
        j = start + i
        if wrap:
            j %= limit
        elif j >= limit:
            break
        buf[j] += v
    return buf


def normalize(samples, peak=0.85):
    m = max(1e-9, max(abs(s) for s in samples))
    k = peak / m
    return [s * k for s in samples]


# ---------------------------------------------------------------- BGM loop ---
BPM = 78
BEAT = 60.0 / BPM
BARS = 4
LOOP = BARS * 4 * BEAT          # 4 bars of 4/4
buf = [0.0] * int(LOOP * SR)

# One warm chord per bar: C - Am - F - G (C major, gentle and nostalgic).
CHORDS = [
    [261.63, 329.63, 392.00],          # C
    [220.00, 261.63, 329.63],          # Am
    [174.61, 220.00, 261.63],          # F
    [196.00, 246.94, 293.66],          # G
]
ROOTS = [130.81, 110.00, 87.31, 98.00]

for bar in range(BARS):
    t0 = bar * 4 * BEAT
    chord = CHORDS[bar]
    # Pad under the bar
    mix_at(buf, soft_chord(chord, 4 * BEAT, amp=0.055), t0, wrap=True)
    # Bass pluck on beats 1 and 3
    mix_at(buf, pluck(ROOTS[bar], 0.9, decay=0.30, amp=0.30), t0, wrap=True)
    mix_at(buf, pluck(ROOTS[bar] * 2, 0.7, decay=0.24, amp=0.20), t0 + 2 * BEAT, wrap=True)
    # Marimba arpeggio: chord tones + one passing pentatonic tone per bar
    arp = [chord[0], chord[1], chord[2], chord[1] * 2, chord[2], chord[1], chord[0] * 2, chord[1]]
    for step, f in enumerate(arp):
        t = t0 + step * (BEAT / 2)
        amp = 0.26 if step % 2 == 0 else 0.17
        mix_at(buf, pluck(f, 0.55, decay=0.20, amp=amp), t, wrap=True)

# Gentle slap-back echo for a bit of air (wrapped, so the loop stays seamless)
echo = buf[:]
for i, v in enumerate(echo):
    j = (i + int(0.24 * SR)) % len(buf)
    buf[j] += v * 0.22

write_wav('bgm_shell', normalize(buf, peak=0.55))
to_ogg(os.path.join(OUT, 'bgm_shell.wav'))

# ------------------------------------------------------------------- SFX -----
tap = [0.0] * int(0.14 * SR)
mix_at(tap, pluck(660, 0.14, decay=0.035, amp=0.8, harm=((1, 1.0), (2, 0.2))), 0)
write_wav('sfx_tap', normalize(tap, peak=0.7))
to_ogg(os.path.join(OUT, 'sfx_tap.wav'))

sel = [0.0] * int(0.34 * SR)
mix_at(sel, pluck(587.33, 0.22, decay=0.07, amp=0.55), 0.0)
mix_at(sel, pluck(880.00, 0.28, decay=0.10, amp=0.55), 0.085)
write_wav('sfx_select', normalize(sel, peak=0.72))
to_ogg(os.path.join(OUT, 'sfx_select.wav'))

back = [0.0] * int(0.32 * SR)
mix_at(back, pluck(493.88, 0.20, decay=0.07, amp=0.55), 0.0)
mix_at(back, pluck(329.63, 0.28, decay=0.11, amp=0.55), 0.085)
write_wav('sfx_back', normalize(back, peak=0.72))
to_ogg(os.path.join(OUT, 'sfx_back.wav'))

tick = [0.0] * int(0.05 * SR)
mix_at(tick, pluck(1567.98, 0.05, decay=0.012, amp=0.5, harm=((1, 1.0),)), 0)
write_wav('sfx_tick', normalize(tick, peak=0.5))
to_ogg(os.path.join(OUT, 'sfx_tick.wav'))

for f in sorted(os.listdir(OUT)):
    print(f, os.path.getsize(os.path.join(OUT, f)), 'bytes')
