"""Regenerates the shell BGM, and it is seamless BY CONSTRUCTION.

Playback history, so the next take does not repeat old mistakes:
  * take 1 was too busy - a marimba arpeggio every bar made it "a song".
  * take 2 was the right mood but had a HARD CLICK on every wrap. Two causes:
    a crossfaded seam still bumps when the two blended signals are unrelated,
    and MediaPlayer re-seeks the file on each loop (see BgmLoop.kt for the
    playback half of the fix).
  * take 3 fixed the waveform seam mathematically. take 4 (this one) keeps that
    guarantee and changes the MATERIAL: a slower, slightly brighter evening
    pad, so the shell does not sound like the same track as before.

How seamlessness is guaranteed:
  * every tone's frequency is snapped to k / L (k integer), so each tone
    completes a whole number of cycles inside the loop and sample N-1 flows
    into sample 0 with no step.
  * each chord is held by a rise/fall window pair that sums to exactly 1 with
    its neighbour (rise and fall are the same cosine in antiphase) INCLUDING
    across the seam, so the pad never dips or bumps at the wrap point.
  * the slow swells divide L, so they are periodic too.
  * chime notes live entirely inside the loop with zero amplitude at both ends,
    so the wrap can never truncate one.
Verify any take with:  python _check_loop.py
"""
import os
import shutil
import subprocess

L = 40.0            # loop length in seconds
SPAN = L / 4.0      # seconds per chord
SR = 44100
XF = 2.5            # chord crossfade length
DETUNE = 2          # detune in grid units (2/L Hz, about 0.05 Hz -> slow beat)

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'app', 'src', 'main', 'res', 'raw', 'bgm_shell.ogg')

# D major family, evening: Dmaj7 - Bm7 - Gmaj7 - A7, resolving back to D.
# Tones sit in the 200-550 Hz band because phone speakers roll off hard below
# that - it has to sound warm on a tiny speaker, not only on headphones.
VOICES = [
    (146.83, [293.66, 369.99, 440.00, 554.37]),   # Dmaj7
    (123.47, [246.94, 293.66, 369.99, 493.88]),   # Bm7
    (98.00, [196.00, 246.94, 293.66, 369.99]),    # Gmaj7
    (110.00, [220.00, 277.18, 329.63, 440.00]),   # A7 (the pull home)
]
HARMONICS = (1.0, 0.14)      # fundamental + a quiet octave, for warmth
PAD_AMP = 0.042
BASS_AMP = 0.060
SWELL = "(1.0+0.12*sin(2*PI*t/20))"

# Three quiet, slow chimes in 40 s: life without a tune.
BELLS = [
    (6.0, 880.00, 0.030, 0.15),
    (17.0, 739.99, 0.026, 0.17),
    (29.0, 1174.66, 0.022, 0.19),
]
BELL_DECAY = 1.9


def snap(freq):
    """Nearest frequency that completes a whole number of cycles in L."""
    return round(freq * L) / L


def tone_pair(freq, amp, phase):
    """One note as a detuned sine pair per harmonic - warm, and periodic in L."""
    terms = []
    for h, h_amp in enumerate(HARMONICS, start=1):
        k = round(freq * h * L)
        for sign in (-DETUNE, DETUNE):
            terms.append("%.4f*sin(2*PI*%.6f*t+%.2f)"
                         % (amp * h_amp, (k + sign) / L, phase * h))
    return '+'.join(terms)


def window(slot):
    """Rise/fall pair for the chord starting at `slot` (stored in st(slot/8))."""
    var = int(slot // 8)
    u = "mod(t-(%.1f-%.1f)+%.1f,%.1f)" % (slot, XF / 2, L, L)
    rise = "(0.5-0.5*cos(PI*min(st(%d,%s),%.1f)/%.1f))" % (var, u, XF, XF)
    fall = "(0.5+0.5*cos(PI*max(0,min(ld(%d)-%.1f,%.1f))/%.1f))" % (
        var, SPAN - XF / 2, XF, XF)
    return rise, fall


def channel(flip):
    """One channel; `flip` mirrors the detune phase for stereo width."""
    terms = []
    for i in range(len(VOICES)):
        slot = i * SPAN
        bass, notes = VOICES[i]
        rise, fall = window(slot)
        body = [tone_pair(f, PAD_AMP, 0.4 * n + (0.9 if flip else 0.0))
                for n, f in enumerate(notes)]
        body.append(tone_pair(bass, BASS_AMP, 0.25 if flip else 0.0))
        terms.append("(%s)*(%s)*(%s)" % (rise, fall, '+'.join(body)))

    # High shimmer an octave above the pad, breathing in 20 s and 10 s cycles
    # (both divide L, so they stay periodic too).
    terms.append(
        "0.014*sin(2*PI*%.6f*t)*(0.5-0.5*cos(2*PI*t/20))"
        "+0.010*sin(2*PI*%.6f*t+1.1)*(0.5-0.5*cos(2*PI*t/10))"
        % (snap(1318.51), snap(1108.73)))

    for t0, freq, amp, atk in BELLS:
        terms.append(
            "(between(t,%.1f,%.1f)*%.3f*exp(-%.2f*(t-%.1f))"
            "*(1-exp(-(t-%.1f)/%.2f))*sin(2*PI*%.6f*(t-%.1f)))"
            % (t0, t0 + 6, amp, BELL_DECAY, t0, t0, atk, snap(freq), t0))

    return "%s*(%s)" % (SWELL, '+'.join(terms))


def ffmpeg():
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    for guess in (r'C:\ffmpeg\ffmpeg\bin\ffmpeg.exe', r'C:\ffmpeg\bin\ffmpeg.exe'):
        if os.path.exists(guess):
            return guess
    raise SystemExit('ffmpeg not found')


expr = 'aevalsrc=%s|%s:s=%d:d=%s:c=stereo' % (
    channel(False).replace(',', '\\,'),
    channel(True).replace(',', '\\,'),
    SR, L)
print('expression length:', len(expr))
subprocess.run([
    ffmpeg(), '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', expr,
    '-af', 'volume=1.4',
    '-c:a', 'libvorbis', '-q:a', '1',
    OUT,
], check=True)
print('wrote', OUT, os.path.getsize(OUT), 'bytes')
