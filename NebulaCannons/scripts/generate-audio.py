#!/usr/bin/env python3
"""
Nebula Cannons — procedural audio asset generator.

Synthesizes every sound effect and the ambient music loop into real WAV
files under assets/sound/ using ONLY the Python standard library (wave +
math). No numpy, no external packages.

Run from the project root:

    python3 scripts/generate-audio.py
    npm run assets

The game plays these files when available and falls back to its built-in
Web Audio synthesizer if they are missing.
"""

import math
import os
import random
import struct
import wave

SR = 22050  # sample rate — small files, universally decodable
TAU = math.pi * 2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "sound")


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------

def write_wav(name, samples, peak=0.85):
    """Normalize + clip + write a 16-bit mono WAV."""
    path = os.path.join(OUT, name)
    n = len(samples)
    data = bytearray()
    for s in samples:
        v = max(-1.0, min(1.0, s))
        data += struct.pack("<h", int(v * 32767 * peak))
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(bytes(data))
    kb = os.path.getsize(path) // 1024
    print(f"  wrote {name:<14} {n / SR:6.2f}s  {kb:4d} KB")


def secs(t):
    return int(t * SR)


def sine(freq, n, phase=0.0, harmonics=()):
    """Sine with optional harmonic overtones (amplitude, ratio)."""
    out = []
    for i in range(n):
        t = i / SR
        v = math.sin(TAU * freq * t + phase)
        for amp, ratio in harmonics:
            v += amp * math.sin(TAU * freq * ratio * t + phase)
        out.append(v)
    return out


def noise(n, seed=None):
    rng = random.Random(seed)
    return [rng.uniform(-1.0, 1.0) for _ in range(n)]


def lowpass(samples, cutoff_start, cutoff_end):
    """One-pole lowpass with a linear cutoff sweep (Hz)."""
    out = []
    y = 0.0
    n = len(samples)
    for i, x in enumerate(samples):
        t = i / n if n else 1
        f = cutoff_start + (cutoff_end - cutoff_start) * t
        alpha = 1.0 - math.exp(-TAU * f / SR)
        y += alpha * (x - y)
        out.append(y)
    return out


def exp_decay(n, tau_s):
    tau = tau_s * SR
    return [math.exp(-i / tau) for i in range(n)]


def env_adsr(n, a_s=0.005, d_s=0.02, s_level=0.6, r_s=0.06):
    a, d, r = secs(a_s), secs(d_s), secs(r_s)
    s = n - a - d - r
    env = []
    for i in range(n):
        if i < a:
            env.append(i / max(1, a))
        elif i < a + d:
            env.append(1.0 - (1.0 - s_level) * (i - a) / max(1, d))
        elif i < a + d + max(0, s):
            env.append(s_level)
        else:
            rem = max(1, r)
            env.append(s_level * max(0.0, 1.0 - (i - a - d - max(0, s)) / rem))
    return env


def mix(*tracks, gain=1.0):
    n = max(len(t) for t in tracks) if tracks else 0
    out = [0.0] * n
    for t in tracks:
        for i, v in enumerate(t):
            out[i] += v * gain
    return out


def note(freq, dur_s, wave_type="sine", amp=0.4, attack=0.008, decay_tau=0.35):
    """A single synth note with a soft attack and exponential tail."""
    n = secs(dur_s)
    if wave_type == "triangle":
        body = sine(freq, n, harmonics=((0.22, 3),))
    elif wave_type == "square":
        body = sine(freq, n, harmonics=((0.34, 3), (0.2, 5)))
    else:  # sine
        body = sine(freq, n)
    env = env_adsr(n, attack, 0.01, 1.0, 0.0)
    tail = exp_decay(n, decay_tau)
    return [body[i] * env[i] * tail[i] * amp for i in range(n)]


# --------------------------------------------------------------------------
# sound effects
# --------------------------------------------------------------------------

def sfx_fire():
    n = secs(0.24)
    burst = lowpass(noise(n, seed=11), 1600, 220)
    env = exp_decay(n, 0.05)
    noise_track = [burst[i] * env[i] for i in range(n)]
    thump = sine(130, n, harmonics=((0.5, 0.5),))
    thump_env = exp_decay(n, 0.045)
    thump_track = [thump[i] * thump_env[i] * 0.8 for i in range(n)]
    out = mix(noise_track, thump_track, gain=0.8)
    # pitch sweep the thump manually for a meatier boom
    for i in range(secs(0.12)):
        freq = 130 * math.exp(-3.2 * i / secs(0.12))
        thump[i] = math.sin(TAU * freq * i / SR) * thump_env[i] * 0.8
    return out


def sfx_explosion():
    n = secs(0.6)
    burst = lowpass(noise(n, seed=42), 950, 55)
    env = exp_decay(n, 0.16)
    noise_track = [burst[i] * env[i] for i in range(n)]
    sub = sine(92, n, harmonics=((0.35, 0.5),))
    sub_env = exp_decay(n, 0.2)
    sub_track = [sub[i] * sub_env[i] * 0.9 for i in range(n)]
    return mix(noise_track, sub_track, gain=1.0)


def sfx_bounce():
    n = secs(0.1)
    tone = sine(220, n, harmonics=((0.3, 2), (0.12, 3)))
    env = exp_decay(n, 0.028)
    out = [tone[i] * env[i] for i in range(n)]
    for i in range(n):
        freq = 220 * math.exp(-8.0 * i / n)
        out[i] = math.sin(TAU * freq * i / SR) * env[i]
        out[i] += 0.25 * math.sin(TAU * freq * 1.5 * i / SR) * env[i]
    return out


def sfx_split():
    tracks = []
    for k, start in enumerate((0.0, 0.04, 0.08)):
        base = 760 - k * 60
        dur = 0.12
        n = secs(dur)
        pad = secs(start)
        chirp = [0.0] * n
        for i in range(n):
            freq = base * math.exp(-6.0 * i / n)
            chirp[i] = 0.7 * math.sin(TAU * freq * i / SR) * math.exp(-i / (0.03 * SR))
        tracks.append([0.0] * pad + chirp + [0.0] * (secs(0.24) - pad - n))
    return mix(*tracks, gain=0.8)


def sfx_thud():
    n = secs(0.16)
    tone = sine(120, n, harmonics=((0.3, 0.5),))
    env = exp_decay(n, 0.05)
    out = [tone[i] * env[i] for i in range(n)]
    for i in range(n):
        freq = 120 * math.exp(-6.5 * i / n)
        out[i] = math.sin(TAU * freq * i / SR) * env[i]
    return out


def sfx_damage():
    n = secs(0.17)
    env = exp_decay(n, 0.045)
    out = [0.0] * n
    for i in range(n):
        freq = 180 * math.exp(-5.0 * i / n)
        v = math.sin(TAU * freq * i / SR)
        v += 0.4 * math.sin(TAU * freq * 1.98 * i / SR)  # dissonant 2nd
        v += 0.25 * math.sin(TAU * freq * 2.99 * i / SR)
        out[i] = v * env[i]
    return out


def sfx_click():
    n = secs(0.06)
    tone = sine(660, n, harmonics=((0.4, 2),))
    env = exp_decay(n, 0.016)
    return [tone[i] * env[i] * 0.7 for i in range(n)]


def sfx_hover():
    n = secs(0.05)
    tone = sine(880, n)
    env = exp_decay(n, 0.014)
    return [tone[i] * env[i] * 0.35 for i in range(n)]


def sfx_error():
    n = secs(0.22)
    env = exp_decay(n, 0.06)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        seg = 1 if t < 0.11 else 0
        freq = (220 if seg == 0 else 176) * math.exp(-4.0 * (i - seg * secs(0.11)) / max(1, secs(0.11)))
        out[i] = (math.sin(TAU * freq * i / SR) + 0.35 * math.sin(TAU * freq * 2 * i / SR)) * env[i]
    return out


def sfx_move():
    n = secs(0.14)
    burst = lowpass(noise(n, seed=7), 340, 180)
    env = exp_decay(n, 0.05)
    return [burst[i] * env[i] * 0.55 for i in range(n)]


def jingle(notes):
    """Victory/defeat arpeggio from a list of (freq, start) pairs."""
    total = notes[-1][1] + 0.5
    n = secs(total)
    out = [0.0] * n
    for freq, start in notes:
        i0 = secs(start)
        note_len = secs(0.45)
        for i in range(min(note_len, n - i0)):
            t = i / SR
            env = math.exp(-i / (0.11 * SR)) * min(1.0, i / (0.008 * SR))
            v = math.sin(TAU * freq * t)
            v += 0.3 * math.sin(TAU * freq * 2 * t)
            v += 0.12 * math.sin(TAU * freq * 3 * t)
            out[i0 + i] += v * env * 0.4
    return out


def sfx_victory():
    return jingle([(523.25, 0.0), (659.25, 0.16), (783.99, 0.32), (1046.5, 0.48)])


def sfx_defeat():
    return jingle([(392.0, 0.0), (329.63, 0.18), (261.63, 0.36), (196.0, 0.54)])


# --------------------------------------------------------------------------
# music loop
# --------------------------------------------------------------------------

def music_loop():
    """Ambient 4-bar loop: Am → F → C → G. Bass + arp + pad, seamless."""
    bpm = 110.0
    beat = 60.0 / bpm          # seconds per quarter note
    bar = beat * 4             # seconds per bar
    bars = [
        # (bass freq, [arp freqs], [pad chord freqs])
        (110.00, [220.0, 261.63, 329.63, 440.0], [220.0, 261.63, 329.63]),
        (87.31,  [174.61, 220.0, 261.63, 349.23], [174.61, 220.0, 261.63]),
        (130.81, [261.63, 329.63, 392.0, 523.25], [261.63, 329.63, 392.0]),
        (98.0,   [196.0, 246.94, 293.66, 392.0], [196.0, 246.94, 293.66]),
    ]
    total = bar * len(bars)
    n = secs(total)
    out = [0.0] * n

    def add(i, v):
        if 0 <= i < n:
            out[i] += v

    for b, (bass, arps, pad) in enumerate(bars):
        t0 = b * bar
        # pad chord (soft, sustained over the bar)
        pad_n = secs(bar - 0.02)
        for pf in pad:
            for i in range(pad_n):
                t = i / SR
                att = min(1.0, i / (0.25 * SR))
                fade = min(1.0, (pad_n - i) / (0.02 * SR))
                v = math.sin(TAU * pf * t) * 0.16 * att * fade
                v += 0.05 * math.sin(TAU * pf * 2 * t) * att * fade
                add(secs(t0) + i, v)
        # bass: 8th notes
        for k in range(8):
            i0 = secs(t0 + k * beat / 2)
            ln = secs(beat * 0.44)
            for i in range(ln):
                t = i / SR
                env = math.exp(-i / (0.09 * SR)) * min(1.0, i / (0.004 * SR))
                v = math.sin(TAU * bass * t)
                v += 0.45 * math.sin(TAU * bass * 2 * t)
                v += 0.18 * math.sin(TAU * bass * 3 * t)
                add(i0 + i, v * env * 0.3)
        # arp: 8th notes, alternating pattern
        for k in range(8):
            i0 = secs(t0 + k * beat / 2)
            ln = secs(beat * 0.4)
            f = arps[(k + b) % 4]
            for i in range(ln):
                t = i / SR
                env = math.exp(-i / (0.06 * SR)) * min(1.0, i / (0.005 * SR))
                v = math.sin(TAU * f * t)
                v += 0.18 * math.sin(TAU * f * 3 * t)
                add(i0 + i, v * env * 0.22)
    return out


# --------------------------------------------------------------------------
# main
def sfx_pop():
    n = secs(0.14)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        freq = 300 + 600 * (i / n)
        out[i] = math.sin(TAU * freq * t) * math.exp(-t / 0.04) * 0.7
    return out


def sfx_bomb():
    n = secs(0.7)
    burst = lowpass(noise(n, seed=17), 520, 60)
    env = exp_decay(n, 0.18)
    out = [burst[i] * env[i] * 0.7 for i in range(n)]
    sub = sine(72, n, harmonics=((0.3, 0.5),))
    sub_env = exp_decay(n, 0.2)
    for i in range(n):
        t = i / SR
        freq = 72 * math.exp(-3.0 * t)
        out[i] += math.sin(TAU * freq * t) * sub_env[i] * 1.0
    return out


def sfx_laser():
    n = secs(0.2)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        freq = 1900 * math.exp(-9.0 * t) + 300
        out[i] = math.sin(TAU * freq * t) * math.exp(-t / 0.05) * 0.5
    return out


def sfx_missile():
    n = secs(0.32)
    burst = lowpass(noise(n, seed=23), 1800, 260)
    env = exp_decay(n, 0.09)
    return [burst[i] * env[i] * 0.7 for i in range(n)]


def sfx_drone():
    n = secs(0.45)
    out = [0.0] * n
    for k in range(2):
        for i in range(n):
            t = i / SR
            freq = (230 + k * 60) * (1 + 3.0 * i / n)
            out[i] += math.sin(TAU * freq * t) * math.exp(-t / 0.11) * 0.2
    return out


def sfx_mine():
    n = secs(0.15)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        freq = 520 * math.exp(-11.0 * t)
        v = math.sin(TAU * freq * t)
        v += 0.4 * math.sin(TAU * freq * 2.2 * t)
        out[i] = v * math.exp(-t / 0.035) * 0.5
    return out


def sfx_turret():
    n = secs(0.28)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        freq = 160 + 260 * math.sin(math.pi * i / n)
        out[i] = math.sin(TAU * freq * t) * math.exp(-t / 0.08) * 0.5
    return out


def sfx_gravity():
    n = secs(0.45)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        freq = 500 * math.exp(-5.0 * t) * (1 + 0.25 * math.sin(TAU * 22 * t))
        out[i] = math.sin(TAU * freq * t) * math.exp(-t / 0.12) * 0.6
    return out


def sfx_cryo():
    n = secs(0.5)
    out = [0.0] * n
    for k in range(3):
        start = int(secs(k * 0.07))
        dur = secs(0.24)
        for i in range(dur):
            freq = 1300 + k * 260
            idx = start + i
            if idx < n:
                out[idx] += math.sin(TAU * freq * idx / SR) * math.exp(-(idx - start) / (0.07 * SR)) * 0.3
    return out


def sfx_leech():
    n = secs(0.38)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        freq = 210 * math.exp(-3.5 * t)
        out[i] = math.sin(TAU * freq * t) * math.exp(-t / 0.11) * 0.4
    return out


def sfx_shield():
    n = secs(0.3)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        freq = 440 + 440 * (i / n)
        out[i] = math.sin(TAU * freq * t) * math.exp(-t / 0.08) * 0.45
    return out


def sfx_dirt():
    n = secs(0.18)
    env = exp_decay(n, 0.045)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        freq = 180 * math.exp(-8.0 * t)
        out[i] = math.sin(TAU * freq * t) * env[i] * 0.7
    gravel = lowpass(noise(secs(0.12), seed=44), 500, 200)
    gravel_env = exp_decay(secs(0.12), 0.03)
    for i in range(secs(0.12)):
        out[i] += gravel[i] * gravel_env[i] * 0.4
    return out


def sfx_smoke():
    n = secs(0.35)
    burst = lowpass(noise(n, seed=66), 900, 200)
    env = exp_decay(n, 0.09)
    return [burst[i] * env[i] * 0.55 for i in range(n)]


def sfx_zap():
    n = secs(0.4)
    out = [0.0] * n
    for k in range(3):
        start = int(secs(k * 0.06))
        dur = secs(0.16)
        for i in range(dur):
            freq = 1500 * math.exp(-9.0 * i / dur)
            v = math.sin(TAU * freq * i / SR)
            v += 0.5 * math.sin(TAU * freq * 1.5 * i / SR)
            env = math.exp(-i / (0.035 * SR))
            idx = start + i
            if idx < n:
                out[idx] += v * env * 0.5
    crack = lowpass(noise(secs(0.14), seed=77), 5000, 900)
    crack_env = exp_decay(secs(0.14), 0.03)
    for i in range(secs(0.14)):
        out[i] += crack[i] * crack_env[i] * 0.35
    return out


def sfx_sticky():
    n = secs(0.4)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        freq = 320 * math.exp(-6.5 * t) * (1 + 0.25 * math.sin(TAU * 18 * t))
        out[i] = math.sin(TAU * freq * t) * math.exp(-t / 0.09) * 0.6
    return out


def sfx_flash():
    n = secs(0.3)
    burst = noise(n, seed=31)
    env = exp_decay(n, 0.05)
    out = [burst[i] * env[i] for i in range(n)]
    for i in range(n):
        t = i / SR
        out[i] *= math.sin(TAU * 900 * t) + 0.5 * math.sin(TAU * 1900 * t)
        out[i] *= 0.6
    return out


def sfx_whoosh():
    n = secs(0.55)
    burst = lowpass(noise(n, seed=88), 420, 980)
    env = exp_decay(n, 0.11)
    out = [burst[i] * env[i] for i in range(n)]
    rumble = sine(95, n, harmonics=((0.3, 0.5),))
    rumble_env = exp_decay(n, 0.12)
    for i in range(n):
        out[i] += rumble[i] * rumble_env[i] * 0.5
    return out


def sfx_plasma():
    n = secs(0.4)
    env = exp_decay(n, 0.09)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        freq = 210 * math.exp(-5.5 * t)
        v = math.sin(TAU * freq * t) + 0.35 * math.sin(TAU * freq * 0.5 * t)
        out[i] = v * env[i] * 0.9
    crack = lowpass(noise(secs(0.16), seed=55), 900, 300)
    crack_env = exp_decay(secs(0.16), 0.04)
    for i in range(secs(0.16)):
        out[i + 4] += crack[i] * crack_env[i] * 0.35
    return out


def sfx_boomerang():
    n = secs(0.42)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        freq = 260 + 1100 * math.sin(math.pi * i / n) ** 2
        env = math.exp(-abs(i - n / 2) / (0.06 * SR))
        out[i] = math.sin(TAU * freq * t) * env * 0.3
    return out


# --------------------------------------------------------------------------

def main():
    os.makedirs(OUT, exist_ok=True)
    print("Nebula Cannons — generating audio assets into assets/sound/")
    print(f"sample rate {SR} Hz, mono, 16-bit\n")

    write_wav("fire.wav", sfx_fire())
    write_wav("explosion.wav", sfx_explosion())
    write_wav("bounce.wav", sfx_bounce())
    write_wav("split.wav", sfx_split())
    write_wav("thud.wav", sfx_thud())
    write_wav("damage.wav", sfx_damage())
    write_wav("click.wav", sfx_click())
    write_wav("hover.wav", sfx_hover())
    write_wav("error.wav", sfx_error())
    write_wav("move.wav", sfx_move())
    write_wav("zap.wav", sfx_zap())
    write_wav("sticky.wav", sfx_sticky())
    write_wav("flash.wav", sfx_flash())
    write_wav("whoosh.wav", sfx_whoosh())
    write_wav("plasma.wav", sfx_plasma())
    write_wav("boomerang.wav", sfx_boomerang())
    write_wav("pop.wav", sfx_pop())
    write_wav("bomb.wav", sfx_bomb())
    write_wav("laser.wav", sfx_laser())
    write_wav("missile.wav", sfx_missile())
    write_wav("drone.wav", sfx_drone())
    write_wav("mine.wav", sfx_mine())
    write_wav("turret.wav", sfx_turret())
    write_wav("gravity.wav", sfx_gravity())
    write_wav("cryo.wav", sfx_cryo())
    write_wav("leech.wav", sfx_leech())
    write_wav("shield.wav", sfx_shield())
    write_wav("dirt.wav", sfx_dirt())
    write_wav("smoke.wav", sfx_smoke())
    write_wav("victory.wav", sfx_victory())
    write_wav("defeat.wav", sfx_defeat())
    write_wav("music.wav", music_loop(), peak=0.6)
    print("\nDone — 32 files. Re-run after editing this script to regenerate.")


if __name__ == "__main__":
    main()
