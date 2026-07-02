#!/usr/bin/env python3
"""Generate retro arcade OGG SFX for Don't Get Pooped!.

Pipeline: procedural WAV synthesis -> ffmpeg OGG Vorbis conversion.
No external sample libraries are used.
"""
from __future__ import annotations

import math
import random
import struct
import subprocess
import wave
from pathlib import Path

SR = 44100
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "audio"
TMP = ROOT / ".tmp_audio_build"
random.seed(20260702)


def clamp(v: float, lo: float = -1.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def env_decay(t: float, dur: float, attack: float = 0.005, decay_pow: float = 2.0) -> float:
    if t < 0 or t > dur:
        return 0.0
    if t < attack:
        return t / max(attack, 1e-6)
    x = (t - attack) / max(dur - attack, 1e-6)
    return max(0.0, (1.0 - x) ** decay_pow)


def sine(freq: float, t: float) -> float:
    return math.sin(2 * math.pi * freq * t)


def square(freq: float, t: float) -> float:
    return 1.0 if sine(freq, t) >= 0 else -1.0


def tri(freq: float, t: float) -> float:
    phase = (freq * t) % 1.0
    return 4.0 * abs(phase - 0.5) - 1.0


def softclip(x: float) -> float:
    return math.tanh(x * 1.25)


def one_pole_lowpass(samples: list[float], cutoff_hz: float) -> list[float]:
    rc = 1.0 / (2.0 * math.pi * cutoff_hz)
    dt = 1.0 / SR
    alpha = dt / (rc + dt)
    y = 0.0
    out = []
    for x in samples:
        y += alpha * (x - y)
        out.append(y)
    return out


def normalize(samples: list[float], peak: float = 0.88) -> list[float]:
    m = max((abs(x) for x in samples), default=1.0)
    if m < 1e-9:
        return samples
    gain = peak / m
    return [softclip(x * gain) for x in samples]


def write_wav(path: Path, samples: list[float]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    samples = normalize(samples)
    with wave.open(str(path), "wb") as wf:
        # ffmpeg's built-in Vorbis encoder in this environment supports stereo,
        # so write dual-mono stereo WAV before OGG conversion.
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        data = bytearray()
        for s in samples:
            v = struct.pack("<h", int(clamp(s) * 32767))
            data += v + v
        wf.writeframes(bytes(data))


def convert_ogg(wav: Path, ogg: Path) -> None:
    ogg.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(wav),
            "-c:a",
            "vorbis",
            "-strict",
            "-2",
            "-q:a",
            "5",
            str(ogg),
        ],
        check=True,
    )


def render(name: str, dur: float, fn, subdir: str = "sfx") -> None:
    n = int(SR * dur)
    samples = [fn(i / SR, i) for i in range(n)]
    wav = TMP / subdir / f"{name}.wav"
    ogg = OUT / subdir / f"{name}.ogg"
    write_wav(wav, samples)
    convert_ogg(wav, ogg)


def sfx_button_click(t: float, i: int) -> float:
    dur = 0.085
    e = env_decay(t, dur, attack=0.001, decay_pow=3.4)
    click = square(1600, t) * 0.55 + sine(2600, t) * 0.35
    return click * e


def sfx_dodge_tick(t: float, i: int, base: float = 980) -> float:
    dur = 0.105
    e = env_decay(t, dur, attack=0.002, decay_pow=2.8)
    freq = base + 300 * (t / dur)
    return (tri(freq, t) * 0.45 + sine(freq * 2.01, t) * 0.18) * e


def sfx_coin_ding(t: float, i: int) -> float:
    dur = 0.42
    notes = [(0.00, 880, 0.42), (0.08, 1320, 0.34), (0.18, 1760, 0.28)]
    s = 0.0
    for start, freq, amp in notes:
        tt = t - start
        if tt >= 0:
            s += sine(freq, tt) * env_decay(tt, dur - start, 0.004, 2.4) * amp
            s += sine(freq * 2, tt) * env_decay(tt, dur - start, 0.002, 3.0) * amp * 0.15
    return s


def sfx_near_miss(t: float, i: int) -> float:
    dur = 0.36
    # Whoosh body: filtered deterministic noise with rising pitch shimmer.
    rush_env = math.sin(math.pi * min(max(t / 0.26, 0), 1)) ** 0.7 if t < 0.26 else 0.0
    noise = random.uniform(-1, 1)
    shimmer = sine(520 + 1900 * (t / dur), t) * 0.18
    body = (noise * 0.55 + shimmer) * rush_env
    # Tick reward at the end.
    tt = t - 0.245
    tick = 0.0
    if tt >= 0:
        tick = (square(1380, tt) * 0.26 + sine(2480, tt) * 0.18) * env_decay(tt, 0.105, 0.0015, 3.0)
    return body + tick


def sfx_warning_beep(t: float, i: int) -> float:
    s = 0.0
    for start in [0.0, 0.24, 0.48]:
        tt = t - start
        if 0 <= tt < 0.15:
            e = env_decay(tt, 0.15, 0.003, 1.4)
            s += (square(740, tt) * 0.35 + sine(1480, tt) * 0.18) * e
    return s


def sfx_hit_splat(t: float, i: int) -> float:
    dur = 0.46
    # Low descending thud + wet noisy body.
    f = 170 - 95 * min(t / dur, 1)
    thud = sine(f, t) * env_decay(t, 0.35, 0.002, 1.8) * 0.75
    noise_env = env_decay(t, 0.24, 0.001, 1.2)
    wet = random.uniform(-1, 1) * noise_env * 0.42
    # Tiny sticky pops.
    pop = 0.0
    for start, freq in [(0.06, 330), (0.12, 260), (0.18, 220)]:
        tt = t - start
        if tt >= 0:
            pop += sine(freq, tt) * env_decay(tt, 0.07, 0.001, 3.0) * 0.25
    return thud + wet + pop


def sfx_game_over(t: float, i: int) -> float:
    notes = [(0.00, 392), (0.24, 330), (0.48, 262), (0.78, 196)]
    s = 0.0
    for start, freq in notes:
        tt = t - start
        if tt >= 0:
            e = env_decay(tt, 0.42, 0.006, 1.7)
            s += sine(freq, tt) * e * 0.5
            s += tri(freq / 2, tt) * e * 0.18
    return s


def sfx_powerup_shield(t: float, i: int) -> float:
    dur = 0.58
    sweep = 360 + 1100 * (t / dur)
    s = sine(sweep, t) * env_decay(t, dur, 0.006, 1.6) * 0.38
    s += sine(sweep * 1.5, t) * env_decay(t, dur, 0.006, 2.1) * 0.2
    return s


def main() -> None:
    TMP.mkdir(exist_ok=True)
    render("button_click", 0.085, sfx_button_click, "ui")
    render("dodge_tick_01", 0.105, lambda t, i: sfx_dodge_tick(t, i, 980), "sfx")
    render("dodge_tick_02", 0.105, lambda t, i: sfx_dodge_tick(t, i, 1060), "sfx")
    render("dodge_tick_03", 0.105, lambda t, i: sfx_dodge_tick(t, i, 900), "sfx")
    render("near_miss_whoosh_tick", 0.36, sfx_near_miss, "sfx")
    render("coin_ding", 0.42, sfx_coin_ding, "sfx")
    render("warning_beep", 0.68, sfx_warning_beep, "sfx")
    render("hit_splat", 0.46, sfx_hit_splat, "sfx")
    render("game_over_jingle", 1.25, sfx_game_over, "sfx")
    render("powerup_shield", 0.58, sfx_powerup_shield, "sfx")


if __name__ == "__main__":
    main()
