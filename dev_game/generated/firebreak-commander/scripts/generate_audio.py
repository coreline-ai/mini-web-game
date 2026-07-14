#!/usr/bin/env python3
from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path

RATE = 44100
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "audio" / "production"
OUT.mkdir(parents=True, exist_ok=True)


def clamp(value: float) -> float:
    return max(-0.96, min(0.96, value))


def write_wav(name: str, samples: list[float]) -> None:
    peak = max(0.001, max(abs(v) for v in samples))
    gain = min(1.0, 0.88 / peak)
    with wave.open(str(OUT / name), "wb") as target:
        target.setnchannels(1)
        target.setsampwidth(2)
        target.setframerate(RATE)
        target.writeframes(b"".join(struct.pack("<h", int(clamp(v * gain) * 32767)) for v in samples))


def env(t: float, duration: float, attack: float = 0.01, release: float = 0.12) -> float:
    return min(1.0, t / max(attack, 1e-6)) * min(1.0, max(0.0, duration - t) / max(release, 1e-6))


def tone(duration: float, frequencies: list[float], volume: float = 0.3, attack: float = 0.01, release: float = 0.12, noise: float = 0.0, seed: int = 1) -> list[float]:
    rng = random.Random(seed)
    count = int(duration * RATE)
    out = []
    for i in range(count):
        t = i / RATE
        value = sum(math.sin(2 * math.pi * f * t) / (index + 1) for index, f in enumerate(frequencies))
        value = value / max(1, len(frequencies)) + (rng.random() * 2 - 1) * noise
        out.append(value * volume * env(t, duration, attack, release))
    return out


def sweep(duration: float, start: float, end: float, volume: float, noise: float = 0.0, seed: int = 1) -> list[float]:
    rng = random.Random(seed)
    count = int(duration * RATE)
    phase = 0.0
    out = []
    for i in range(count):
        t = i / RATE
        p = t / duration
        phase += (start + (end - start) * p) / RATE
        value = math.sin(2 * math.pi * phase) + (rng.random() * 2 - 1) * noise
        out.append(value * volume * env(t, duration, 0.005, min(0.2, duration * 0.35)))
    return out


def mix(parts: list[tuple[list[float], float]], duration: float) -> list[float]:
    out = [0.0] * int(duration * RATE)
    for samples, offset in parts:
        start = int(offset * RATE)
        for i, value in enumerate(samples):
            if start + i >= len(out):
                break
            out[start + i] += value
    return out


def make_loop(duration: float, tense: bool) -> list[float]:
    rng = random.Random(51071 if tense else 9017)
    out = [0.0] * int(duration * RATE)
    chord = [110.0, 130.81, 164.81, 196.0] if tense else [82.41, 110.0, 146.83, 164.81]
    beat = 0.5 if tense else 0.75
    for i in range(len(out)):
        t = i / RATE
        slow = sum(math.sin(2 * math.pi * f * t) for f in chord) / len(chord)
        wind = (rng.random() * 2 - 1) * (0.018 if tense else 0.012)
        pulse_phase = (t % beat) / beat
        pulse = math.sin(2 * math.pi * 55 * t) * math.exp(-pulse_phase * 8) * (0.12 if tense else 0.06)
        ember = math.sin(2 * math.pi * (440 + 18 * math.sin(t * 0.7)) * t) * 0.012
        edge = min(1.0, t / 0.35, max(0.0, duration - t) / 0.35)
        out[i] = (slow * (0.105 if tense else 0.075) + pulse + ember + wind) * edge
    return out


write_wav("ui_click.wav", mix([(tone(0.08, [720, 1080], 0.55, release=0.05), 0), (tone(0.09, [980], 0.25, release=0.06), 0.05)], 0.16))
write_wav("draw_firebreak.wav", mix([(sweep(0.34, 190, 95, 0.38, 0.08, 13), 0), (tone(0.13, [72, 110], 0.42, release=0.1), 0.24)], 0.48))
write_wav("water_drop.wav", mix([(sweep(0.55, 540, 115, 0.32, 0.15, 27), 0), (tone(0.35, [130, 195], 0.2, release=0.2), 0.24)], 0.72))
write_wav("truck_deploy.wav", mix([(tone(0.18, [95, 142], 0.44, release=0.12), 0), (tone(0.12, [520, 760], 0.34, release=0.09), 0.15)], 0.34))
write_wav("fire_ignite.wav", sweep(0.42, 140, 520, 0.33, 0.19, 39))
write_wav("fire_extinguish.wav", mix([(sweep(0.48, 680, 120, 0.36, 0.08, 51), 0), (tone(0.3, [330, 495], 0.22, release=0.22), 0.28)], 0.72))
write_wav("wind_shift.wav", mix([(sweep(0.8, 95, 310, 0.3, 0.16, 77), 0), (tone(0.28, [440, 660], 0.34, release=0.2), 0.62)], 1.0))
write_wav("objective_warning.wav", mix([(tone(0.16, [330, 440], 0.42, release=0.08), 0), (tone(0.16, [330, 440], 0.42, release=0.08), 0.24), (tone(0.28, [220, 330], 0.42, release=0.18), 0.48)], 0.82))
write_wav("stage_clear.wav", mix([(tone(0.45, [261.63, 329.63, 392.0], 0.34, release=0.28), 0), (tone(0.62, [329.63, 415.3, 523.25], 0.38, release=0.42), 0.35)], 1.1))
write_wav("game_over.wav", mix([(sweep(0.65, 260, 72, 0.42, 0.05, 99), 0), (tone(0.7, [73.42, 92.5], 0.28, release=0.45), 0.4)], 1.2))
write_wav("home_ambient.wav", make_loop(18.0, tense=False))
write_wav("fireline_loop.wav", make_loop(24.0, tense=True))

print(f"generated {len(list(OUT.glob('*.wav')))} audio assets in {OUT}")
