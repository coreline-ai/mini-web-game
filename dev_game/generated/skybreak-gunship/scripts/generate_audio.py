#!/usr/bin/env python3
"""Generate deterministic, game-specific Skybreak Gunship production-demo audio."""

from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "audio"
SR = 22_050


def envelope(t: float, duration: float, attack: float = 0.01, release: float = 0.08) -> float:
    return min(1.0, t / max(attack, 1e-6), (duration - t) / max(release, 1e-6))


def write(name: str, duration: float, synth, gain: float = 0.72) -> None:
    rng = random.Random(f"skybreak:{name}")
    frames = []
    for i in range(int(SR * duration)):
        t = i / SR
        value = max(-1.0, min(1.0, synth(t, duration, rng) * gain))
        frames.append(struct.pack("<h", int(value * 32767)))
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as wav:
        wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(SR)
        wav.writeframes(b"".join(frames))


def tone(freq: float, t: float, phase: float = 0.0) -> float:
    return math.sin(math.tau * freq * t + phase)


def noise(rng: random.Random) -> float:
    return rng.uniform(-1.0, 1.0)


def main() -> None:
    write("home_command_ambient", 8.0, lambda t, d, r: (
        0.22 * tone(55, t) + 0.12 * tone(82.5, t) + 0.08 * tone(110, t)
    ) * (0.7 + 0.3 * tone(0.125, t)))
    write("gunship_mission_loop", 12.0, lambda t, d, r: (
        0.19 * tone(55, t) + 0.11 * tone(110, t) +
        (0.18 * math.exp(-((t % 0.5) / 0.07)) * tone(90, t)) +
        0.025 * noise(r)
    ))
    write("rotor_interior_loop", 4.0, lambda t, d, r: (
        0.34 * tone(28, t) + 0.18 * tone(56, t) + 0.08 * tone(112, t) + 0.035 * noise(r)
    ) * (0.72 + 0.28 * tone(7, t)))
    write("boss_intercept_layer", 8.0, lambda t, d, r: (
        0.28 * tone(41.2, t) + 0.14 * tone(61.8, t) +
        0.18 * math.exp(-((t % 0.75) / 0.08)) * tone(124, t) + 0.025 * noise(r)
    ))

    write("gun_30mm", 0.34, lambda t, d, r: envelope(t, d, 0.002, 0.12) * (
        0.62 * noise(r) + 0.38 * tone(74 * (1 - t / d * 0.45), t)
    ))
    write("gun_overheat", 0.62, lambda t, d, r: envelope(t, d, 0.01, 0.14) * (
        0.45 * tone(720 - 420 * t / d, t) + 0.18 * noise(r)
    ))
    write("gun_ready", 0.34, lambda t, d, r: envelope(t, d, 0.01, 0.08) * (
        0.35 * tone(520, t) + 0.35 * tone(780, t)
    ))
    write("missile_lock_tick", 0.14, lambda t, d, r: envelope(t, d, 0.004, 0.04) * tone(880, t))
    write("missile_lock_complete", 0.42, lambda t, d, r: envelope(t, d, 0.006, 0.08) * (
        0.34 * tone(720 + 520 * t / d, t) + 0.22 * tone(1080 + 320 * t / d, t)
    ))
    write("missile_launch", 0.74, lambda t, d, r: envelope(t, d, 0.006, 0.18) * (
        0.5 * noise(r) * math.exp(-t * 2.1) + 0.26 * tone(95 + 180 * t / d, t)
    ))
    write("impact_metal", 0.26, lambda t, d, r: envelope(t, d, 0.001, 0.08) * (
        0.4 * noise(r) + 0.28 * tone(1180, t) + 0.18 * tone(1760, t)
    ))
    write("explosion_small", 0.78, lambda t, d, r: envelope(t, d, 0.002, 0.26) * (
        0.58 * noise(r) * math.exp(-t * 2.4) + 0.28 * tone(62, t)
    ))
    write("explosion_large", 1.25, lambda t, d, r: envelope(t, d, 0.003, 0.42) * (
        0.62 * noise(r) * math.exp(-t * 1.45) + 0.34 * tone(43, t)
    ))
    write("convoy_hit", 0.42, lambda t, d, r: envelope(t, d, 0.002, 0.15) * (
        0.4 * noise(r) + 0.25 * tone(88, t)
    ))
    write("civilian_warning", 0.65, lambda t, d, r: envelope(t, d, 0.01, 0.1) * (
        0.32 * tone(660 + 120 * (int(t / 0.16) % 2), t)
    ))
    write("boss_phase", 0.9, lambda t, d, r: envelope(t, d, 0.008, 0.2) * (
        0.28 * tone(96 + 220 * t / d, t) + 0.22 * tone(144 + 330 * t / d, t)
    ))
    write("mission_clear", 1.5, lambda t, d, r: envelope(t, d, 0.02, 0.25) * sum(
        0.14 * tone(freq, t) for freq in (261.6, 329.6, 392.0, 523.3)
    ))
    write("mission_failed", 1.3, lambda t, d, r: envelope(t, d, 0.02, 0.3) * (
        0.24 * tone(146.8 - 35 * t / d, t) + 0.2 * tone(110 - 25 * t / d, t)
    ))
    print(f"generated {len(list(OUT.glob('*.wav')))} wav files in {OUT}")


if __name__ == "__main__":
    main()
