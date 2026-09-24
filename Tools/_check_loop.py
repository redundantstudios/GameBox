"""Verifies the shell BGM loop is genuinely seamless.

A "click" at the loop point is a discontinuity: the last sample and the first
sample disagree by far more than neighbours normally do. This decodes the OGG
to raw PCM and compares the wrap-around jump with the typical sample-to-sample
delta of the whole file. Also usable with the path of an older take, to prove
the previous version was the one clicking.

Usage: python _check_loop.py [path-to-ogg]
"""
import array
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SR = 44100
CH = 2


def ffmpeg():
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    for guess in (r'C:\ffmpeg\ffmpeg\bin\ffmpeg.exe', r'C:\ffmpeg\bin\ffmpeg.exe'):
        if os.path.exists(guess):
            return guess
    raise SystemExit('ffmpeg not found')


def decode(path):
    raw = subprocess.run(
        [ffmpeg(), '-v', 'error', '-i', path, '-f', 's16le', '-acodec', 'pcm_s16le',
         '-ac', str(CH), '-ar', str(SR), '-'],
        stdout=subprocess.PIPE, check=True).stdout
    samples = array.array('h')
    samples.frombytes(raw)
    return samples


def channel(samples, ch):
    return samples[ch::CH]


def stats(name, data):
    """Largest jump inside the file vs the jump across the loop seam."""
    deltas = [abs(data[i + 1] - data[i]) for i in range(len(data) - 1)]
    ordered = sorted(deltas)
    p999 = ordered[int(len(ordered) * 0.999)]
    worst = ordered[-1]
    wrap = abs(data[0] - data[-1])
    peak = max(max(data), -min(data))
    print('%-6s peak=%.3f fs  typical=%d  p99.9=%d  worst=%d  WRAP=%d  -> %s'
          % (name, peak / 32768.0, ordered[len(ordered) // 2], p999, worst, wrap,
             'SEAMLESS' if wrap <= max(p999, 1) else 'CLICK'))


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        ROOT, 'app', 'src', 'main', 'res', 'raw', 'bgm_shell.ogg')
    samples = decode(path)
    print('file:', path)
    print('duration: %.2f s' % (len(samples) / CH / SR))
    for ch in range(CH):
        stats('ch%d' % ch, channel(samples, ch))


main()
