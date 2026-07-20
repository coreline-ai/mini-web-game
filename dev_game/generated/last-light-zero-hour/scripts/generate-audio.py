"""Build the compact combat SFX library used by LAST LIGHT.

The first pass used long low-frequency sine tones. They stacked during dense
waves and read as a distracting "boooong" on phone speakers. This pass keeps
transients in the mid/high range, makes enemy cues brief, and leaves headroom
for the mixer instead of baking every asset at near-full scale.
"""

from pathlib import Path
import math
import random
import struct
import wave


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "audio"
OUT.mkdir(parents=True, exist_ok=True)
SR = 44100
RNG = random.Random(20410720)
NOISE = [RNG.uniform(-1.0, 1.0) for _ in range(SR * 3)]


def clamp(value):
    return max(-1.0, min(1.0, value))


def env(t, duration, attack=0.006, release=0.09):
    return min(1.0, t / max(attack, 0.0001)) * min(1.0, max(0.0, (duration - t) / max(release, 0.0001)))


def noise(t, rate=1.0):
    return NOISE[int(t * SR * rate) % len(NOISE)]


def bright_noise(t, rate=1.0):
    """A tiny differentiator keeps transient assets out of sub-bass."""
    index = int(t * SR * rate)
    return noise(t, rate) - NOISE[(index - 23) % len(NOISE)] * 0.68


def tone(t, frequency, phase=0.0):
    return math.sin(2.0 * math.pi * frequency * t + phase)


def write_mono(name, seconds, sample_fn, gain=0.56):
    total = int(SR * seconds)
    with wave.open(str(OUT / name), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(SR)
        frames = bytearray()
        for i in range(total):
            t = i / SR
            frames.extend(struct.pack("<h", int(clamp(sample_fn(t, seconds) * gain) * 32767)))
        output.writeframes(frames)


# UI and weapon transients: concise, directional and deliberately free of the
# old long 60–150Hz oscillator that made weapons sound like a horn.
write_mono(
    "ui-start.wav", 0.34,
    lambda t, d: env(t, d, .009, .13) * (
        .46 * tone(t, 690 + 820 * min(1, t / .18)) + .22 * tone(t, 1380 + 720 * min(1, t / .18)) + .10 * bright_noise(t, .7)
    ), .44,
)
write_mono(
    "gatling.wav", 0.105,
    lambda t, d: env(t, d, .001, .045) * (
        .78 * bright_noise(t, 1.65) * math.exp(-15 * t) + .22 * tone(t, 640) * math.exp(-20 * t)
    ), .47,
)
write_mono(
    "scatter.wav", 0.32,
    lambda t, d: env(t, d, .001, .16) * (
        .92 * bright_noise(t, .56) * math.exp(-8.8 * t) + .17 * tone(t, 310) * math.exp(-17 * t) + .08 * tone(t, 980) * math.exp(-11 * t)
    ), .50,
)
write_mono(
    "arc.wav", 0.42,
    lambda t, d: env(t, d, .002, .11) * (
        .34 * tone(t, 1280 + 1050 * t) + .26 * tone(t, 2540 + 760 * t, .7) + .27 * bright_noise(t, 2.6) * (1 - t / d)
    ), .40,
)
write_mono(
    "rocket.wav", 0.46,
    lambda t, d: env(t, d, .007, .18) * (
        .48 * bright_noise(t, .62) * (0.76 + .24 * math.sin(t * 38) ** 2) + .22 * tone(t, 430 - 90 * t) + .13 * tone(t, 910 - 210 * t)
    ), .45,
)
write_mono(
    "rail.wav", 0.72,
    lambda t, d: env(t, d, .018, .23) * (
        .32 * tone(t, 540 + 1850 * min(1, t / .28)) + .20 * tone(t, 1380 + 2300 * min(1, t / .25), .3) + .18 * bright_noise(t, 1.75) * math.exp(-2.4 * t)
    ), .42,
)
write_mono(
    "impact.wav", 0.17,
    lambda t, d: env(t, d, .001, .07) * (
        .72 * bright_noise(t, 1.25) * math.exp(-19 * t) + .16 * tone(t, 420) * math.exp(-22 * t)
    ), .43,
)
write_mono(
    "explosion.wav", 0.58,
    lambda t, d: env(t, d, .002, .24) * (
        .66 * bright_noise(t, .38) * math.exp(-3.6 * t) + .15 * tone(t, 118 - 34 * t) * math.exp(-10 * t) + .09 * tone(t, 680) * math.exp(-7 * t)
    ), .50,
)
write_mono(
    "core-pickup.wav", 0.28,
    lambda t, d: env(t, d, .004, .085) * (
        .40 * tone(t, 820 + 1050 * t) + .28 * tone(t, 1320 + 760 * t) + .07 * bright_noise(t, 1.3)
    ), .39,
)
write_mono(
    "overheat.wav", 0.42,
    lambda t, d: env(t, d, .012, .11) * (
        .28 * tone(t, 890 - 180 * t) + .24 * tone(t, 1170 - 210 * t) + .20 * bright_noise(t, 1.1) * math.exp(-2.7 * t)
    ), .40,
)
# Spitters fire this. It is intentionally an unobtrusive wet hiss/click rather
# than a long moan or a sub-heavy whoosh, because it can occur during waves.
write_mono(
    "zombie.wav", 0.27,
    lambda t, d: env(t, d, .003, .085) * (
        .52 * bright_noise(t, .92) * math.exp(-7.5 * t) + .14 * tone(t, 920 + 310 * math.sin(t * 21)) * math.exp(-8.2 * t)
    ), .34,
)
write_mono(
    "last-stand.wav", 0.74,
    lambda t, d: env(t, d, .026, .24) * (
        .28 * tone(t, 330 - 78 * t) + .20 * tone(t, 520 - 96 * t) + .12 * bright_noise(t, .7) * math.exp(-2.2 * t)
    ), .36,
)


def write_music():
    seconds = 16
    with wave.open(str(OUT / "survival-loop.wav"), "wb") as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(SR)
        frames = bytearray()
        for i in range(SR * seconds):
            t = i / SR
            bar = t % 4.0
            pulse = math.exp(-8.5 * (bar % 1.0))
            pad = .080 * tone(t, 174.6) + .053 * tone(t, 220.0) + .032 * tone(t, 261.6)
            shimmer = .018 * tone(t, 698.5 + 8 * math.sin(t * .33))
            tick = .050 * bright_noise(t, .19) * pulse
            left = math.tanh((pad + shimmer + tick + .010 * bright_noise(t, .12)) * 1.35)
            right = math.tanh((pad + shimmer - tick + .010 * bright_noise(t + .19, .12)) * 1.35)
            fade = min(1.0, t / .45, (seconds - t) / .45)
            frames.extend(struct.pack("<hh", int(left * fade * 7900), int(right * fade * 7900)))
        output.writeframes(frames)


write_music()
print(f"Generated {len(list(OUT.glob('*.wav')))} polished, low-fatigue game audio assets in {OUT}")
