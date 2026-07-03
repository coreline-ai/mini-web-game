#!/usr/bin/env python3
"""Generate loopable retro arcade BGM for Don't Get Pooped!.

Pipeline: procedural stereo WAV synthesis -> ffmpeg OGG Vorbis conversion.
No external samples, loops, or libraries are used.
"""
from __future__ import annotations

import json
import math
import random
import struct
import subprocess
import wave
from pathlib import Path

SR = 44100
BPM = 152
BEAT = 60.0 / BPM
BARS = 32
BEATS_PER_BAR = 4
DUR = BARS * BEATS_PER_BAR * BEAT
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "audio" / "music"
TMP = ROOT / ".tmp_audio_build" / "music"
random.seed(20260704)

TRACK_KEY = "music_arcade_survival_loop"
TRACK_NAME = "arcade_survival_loop"

NOTE_OFFSETS = {
    "C": -9, "C#": -8, "Db": -8,
    "D": -7, "D#": -6, "Eb": -6,
    "E": -5,
    "F": -4, "F#": -3, "Gb": -3,
    "G": -2, "G#": -1, "Ab": -1,
    "A": 0, "A#": 1, "Bb": 1,
    "B": 2,
}


def note(name: str) -> float:
    pitch = name[:-1]
    octave = int(name[-1])
    semitone = NOTE_OFFSETS[pitch] + (octave - 4) * 12
    return 440.0 * (2.0 ** (semitone / 12.0))


def clamp(v: float, lo: float = -1.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def sine(freq: float, t: float) -> float:
    return math.sin(2 * math.pi * freq * t)


def square(freq: float, t: float, duty: float = 0.5) -> float:
    return 1.0 if (freq * t) % 1.0 < duty else -1.0


def tri(freq: float, t: float) -> float:
    phase = (freq * t) % 1.0
    return 4.0 * abs(phase - 0.5) - 1.0


def saw(freq: float, t: float) -> float:
    return 2.0 * ((freq * t) % 1.0) - 1.0


def softclip(x: float) -> float:
    return math.tanh(x * 1.15)


def perc_env(t: float, dur: float, attack: float = 0.004, decay_pow: float = 2.4) -> float:
    if t < 0 or t >= dur:
        return 0.0
    if t < attack:
        return t / max(attack, 1e-6)
    x = (t - attack) / max(dur - attack, 1e-6)
    return max(0.0, (1.0 - x) ** decay_pow)


def gate_env(t: float, dur: float, attack: float = 0.006, release: float = 0.035) -> float:
    if t < 0 or t >= dur:
        return 0.0
    if t < attack:
        return t / max(attack, 1e-6)
    if t > dur - release:
        return max(0.0, (dur - t) / max(release, 1e-6))
    return 1.0


def pan_gains(pan: float) -> tuple[float, float]:
    # equal-power pan, pan -1 left .. +1 right
    angle = (pan + 1.0) * math.pi / 4.0
    return math.cos(angle), math.sin(angle)


def add_stereo(left: list[float], right: list[float], start: float, dur: float, amp: float, pan: float, fn) -> None:
    l_gain, r_gain = pan_gains(pan)
    start_i = max(0, int(start * SR))
    end_i = min(len(left), int((start + dur) * SR))
    for i in range(start_i, end_i):
        tt = i / SR - start
        v = fn(tt) * amp
        left[i] += v * l_gain
        right[i] += v * r_gain


def add_kick(left: list[float], right: list[float], start: float, amp: float = 0.72) -> None:
    dur = 0.18
    def voice(t: float) -> float:
        f = 118.0 * (0.42 ** min(t / dur, 1.0)) + 42.0
        click = math.sin(2 * math.pi * 880 * t) * perc_env(t, 0.018, 0.001, 3.0) * 0.22
        body = sine(f, t) * perc_env(t, dur, 0.0015, 2.2)
        return body + click
    add_stereo(left, right, start, dur, amp, 0.0, voice)


def add_snare(left: list[float], right: list[float], start: float, amp: float = 0.38) -> None:
    dur = 0.16
    noise_seed = int(start * 1000) % 9973
    rnd = random.Random(noise_seed)
    noises = [rnd.uniform(-1, 1) for _ in range(int(SR * dur) + 8)]
    def voice(t: float) -> float:
        idx = min(len(noises) - 1, int(t * SR))
        e = perc_env(t, dur, 0.001, 1.6)
        tone = sine(185, t) * perc_env(t, 0.09, 0.001, 2.5) * 0.38
        return noises[idx] * e * 0.56 + tone
    add_stereo(left, right, start, dur, amp, 0.05, voice)


def add_hat(left: list[float], right: list[float], start: float, amp: float = 0.12, open_hat: bool = False, pan: float = 0.0) -> None:
    dur = 0.12 if open_hat else 0.055
    noise_seed = int(start * 2000) % 7919
    rnd = random.Random(noise_seed)
    noises = [rnd.uniform(-1, 1) for _ in range(int(SR * dur) + 8)]
    def voice(t: float) -> float:
        idx = min(len(noises) - 1, int(t * SR))
        metallic = square(7200, t, 0.34) * 0.25 + square(5100, t, 0.41) * 0.18
        return (noises[idx] * 0.52 + metallic) * perc_env(t, dur, 0.001, 2.6)
    add_stereo(left, right, start, dur, amp, pan, voice)


def add_bass(left: list[float], right: list[float], start: float, freq: float, length: float, amp: float = 0.28) -> None:
    def voice(t: float) -> float:
        e = gate_env(t, length, 0.004, 0.028)
        # Small pitch snap keeps it arcade-like without masking SFX.
        f = freq * (1.0 + 0.018 * math.exp(-t * 28.0))
        return (square(f, t, 0.48) * 0.44 + tri(f, t) * 0.34 + sine(f * 2, t) * 0.08) * e
    add_stereo(left, right, start, length, amp, -0.04, voice)


def add_arp(left: list[float], right: list[float], start: float, freq: float, length: float, amp: float, pan: float) -> None:
    def voice(t: float) -> float:
        e = perc_env(t, length, 0.003, 2.8)
        f = freq * (1.0 + 0.004 * sine(5.5, t))
        return (tri(f, t) * 0.44 + square(f * 2, t, 0.38) * 0.13) * e
    add_stereo(left, right, start, length, amp, pan, voice)


def add_lead(left: list[float], right: list[float], start: float, freq: float, length: float, amp: float = 0.18, pan: float = 0.0) -> None:
    def voice(t: float) -> float:
        e = gate_env(t, length, 0.008, 0.045)
        vibrato = 1.0 + 0.006 * sine(6.4, t)
        f = freq * vibrato
        return (square(f, t, 0.32) * 0.36 + tri(f, t) * 0.32 + sine(f * 2, t) * 0.08) * e
    add_stereo(left, right, start, length, amp, pan, voice)


def add_chord_pad(left: list[float], right: list[float], start: float, notes: list[float], length: float, amp: float = 0.06) -> None:
    def voice_factory(freq: float, detune: float):
        def voice(t: float) -> float:
            e = gate_env(t, length, 0.035, 0.08)
            f = freq * detune
            return (tri(f, t) * 0.48 + sine(f * 2, t) * 0.10) * e
        return voice
    for idx, freq in enumerate(notes):
        pan = [-0.35, 0.28, 0.05, 0.42][idx % 4]
        add_stereo(left, right, start, length, amp, pan, voice_factory(freq, 1.0 + (idx - 1) * 0.0015))


def render_track() -> tuple[list[float], list[float]]:
    n = int(DUR * SR)
    left = [0.0] * n
    right = [0.0] * n

    progression = [
        ([note("C3"), note("Eb3"), note("G3")], [note("C2"), note("G2"), note("C3"), note("Eb3")]),
        ([note("Ab2"), note("C3"), note("Eb3")], [note("Ab1"), note("Eb2"), note("Ab2"), note("C3")]),
        ([note("Bb2"), note("D3"), note("F3")], [note("Bb1"), note("F2"), note("Bb2"), note("D3")]),
        ([note("G2"), note("B2"), note("D3")], [note("G1"), note("D2"), note("G2"), note("B2")]),
    ]

    melody_a = [
        (0.00, "G4", 0.50), (0.50, "C5", 0.50), (1.00, "Bb4", 0.50), (1.50, "G4", 0.50),
        (2.00, "Eb5", 0.50), (2.50, "D5", 0.50), (3.00, "C5", 0.75),
    ]
    melody_b = [
        (0.00, "C5", 0.50), (0.50, "Eb5", 0.50), (1.00, "G5", 0.50), (1.50, "Eb5", 0.50),
        (2.00, "F5", 0.50), (2.50, "D5", 0.50), (3.00, "G4", 0.75),
    ]
    melody_c = [
        (0.00, "Bb4", 0.50), (0.50, "C5", 0.50), (1.00, "D5", 0.50), (1.50, "F5", 0.50),
        (2.00, "G5", 0.25), (2.25, "F5", 0.25), (2.50, "Eb5", 0.50), (3.00, "D5", 0.75),
    ]
    melody_d = [
        (0.00, "D5", 0.50), (0.50, "B4", 0.50), (1.00, "G4", 0.50), (1.50, "B4", 0.50),
        (2.00, "D5", 0.50), (2.50, "F5", 0.25), (2.75, "D5", 0.25), (3.00, "C5", 0.75),
    ]
    melodies = [melody_a, melody_b, melody_c, melody_d]

    # Rhythm section: clean, repetitive, mobile-friendly pulse.
    for bar in range(BARS):
        bar_t = bar * BEATS_PER_BAR * BEAT
        for b in range(4):
            t = bar_t + b * BEAT
            add_kick(left, right, t, 0.68 if b in (0, 2) else 0.22)
            if b in (1, 3):
                add_snare(left, right, t, 0.36)
            if bar >= 8 and b == 3:
                add_kick(left, right, t + BEAT * 0.50, 0.18)
        for h in range(8):
            t = bar_t + h * BEAT * 0.5
            add_hat(left, right, t, 0.105 if h % 2 == 0 else 0.075, open_hat=(bar >= 16 and h == 7), pan=-0.18 if h % 2 == 0 else 0.22)

    # Harmonic layers.
    for bar in range(BARS):
        bar_t = bar * BEATS_PER_BAR * BEAT
        chord, arp_notes = progression[bar % 4]
        add_chord_pad(left, right, bar_t, chord, BEAT * 4 - 0.08, 0.038 if bar < 8 else 0.055)

        # Bass: root/fifth/octave pattern, intentionally short so SFX has space.
        bass_pattern = [arp_notes[0], arp_notes[1], arp_notes[2], arp_notes[1], arp_notes[0], arp_notes[2], arp_notes[1], arp_notes[2]]
        for step, freq in enumerate(bass_pattern):
            if bar % 8 == 7 and step == 7:
                continue  # breathing gap before section loops
            add_bass(left, right, bar_t + step * BEAT * 0.5, freq, BEAT * 0.38, 0.24 if bar < 8 else 0.30)

        # 16th arpeggio activates after intro and grows in intensity.
        if bar >= 4:
            for step in range(16):
                freq = arp_notes[step % len(arp_notes)] * (2 if step % 4 == 3 else 1)
                amp = 0.065 if bar < 16 else 0.085
                pan = -0.45 if step % 2 == 0 else 0.45
                add_arp(left, right, bar_t + step * BEAT * 0.25, freq * 2, BEAT * 0.19, amp, pan)

    # Lead hooks on alternating 8-bar sections.
    for section_start in [8, 16, 24]:
        for local_bar in range(8):
            bar = section_start + local_bar
            if bar >= BARS:
                continue
            bar_t = bar * BEATS_PER_BAR * BEAT
            mel = melodies[bar % 4]
            for beat_pos, note_name, beat_len in mel:
                # Leave final half beat empty to make the loop return clean.
                if bar == BARS - 1 and beat_pos >= 3.0:
                    continue
                add_lead(left, right, bar_t + beat_pos * BEAT, note(note_name), beat_len * BEAT * 0.92, 0.16 if section_start < 24 else 0.20, pan=0.08)
                if section_start == 24:
                    add_lead(left, right, bar_t + beat_pos * BEAT + 0.012, note(note_name) * 2, beat_len * BEAT * 0.72, 0.055, pan=-0.22)

    # Tiny arcade pickup at section boundaries, subtle enough to not fight WARNING SFX.
    for bar in [8, 16, 24]:
        base = bar * BEATS_PER_BAR * BEAT - BEAT * 0.75
        for k, nm in enumerate(["C5", "Eb5", "G5"]):
            add_arp(left, right, base + k * BEAT * 0.18, note(nm), BEAT * 0.14, 0.10, 0.35)

    return master(left, right)


def master(left: list[float], right: list[float]) -> tuple[list[float], list[float]]:
    # Gentle high-pass to clear rumble.
    def highpass(channel: list[float], cutoff: float = 34.0) -> list[float]:
        rc = 1.0 / (2.0 * math.pi * cutoff)
        dt = 1.0 / SR
        alpha = rc / (rc + dt)
        y = 0.0
        prev_x = 0.0
        out = []
        for x in channel:
            y = alpha * (y + x - prev_x)
            prev_x = x
            out.append(y)
        return out

    left = highpass(left)
    right = highpass(right)

    # Normalize to conservative music peak; SFX remain dominant in-game.
    peak = max(max(abs(x) for x in left), max(abs(x) for x in right), 1e-9)
    gain = 0.74 / peak
    left = [softclip(x * gain) for x in left]
    right = [softclip(x * gain) for x in right]

    # Micro fade on first/last 20ms to prevent codec click while preserving loop feel.
    fade = int(SR * 0.02)
    for i in range(fade):
        g_in = i / fade
        g_out = (fade - i) / fade
        left[i] *= g_in
        right[i] *= g_in
        left[-1 - i] *= g_out
        right[-1 - i] *= g_out
    return left, right


def write_wav(path: Path, left: list[float], right: list[float]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        data = bytearray()
        for l, r in zip(left, right):
            data += struct.pack("<h", int(clamp(l) * 32767))
            data += struct.pack("<h", int(clamp(r) * 32767))
        wf.writeframes(bytes(data))


def convert_ogg(wav: Path, ogg: Path) -> None:
    ogg.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(wav),
        "-c:a", "vorbis", "-strict", "-2", "-q:a", "5",
        "-metadata", f"title=Don't Get Pooped! Arcade Survival Loop",
        "-metadata", "comment=Procedural project-generated retro arcade loop; no external samples",
        str(ogg),
    ], check=True)


def ffprobe(path: Path) -> dict:
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=codec_name,channels,sample_rate",
        "-of", "json", str(path),
    ], text=True)
    return json.loads(out)


def main() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    left, right = render_track()
    wav = TMP / f"{TRACK_NAME}.wav"
    ogg = OUT / f"{TRACK_NAME}.ogg"
    write_wav(wav, left, right)
    convert_ogg(wav, ogg)
    info = ffprobe(ogg)
    print(json.dumps({
        "key": TRACK_KEY,
        "path": f"audio/music/{TRACK_NAME}.ogg",
        "bpm": BPM,
        "bars": BARS,
        "durationSec": round(float(info["format"]["duration"]), 3),
        "sizeBytes": int(info["format"]["size"]),
        "codec": info["streams"][0]["codec_name"],
        "channels": info["streams"][0]["channels"],
        "sampleRate": int(info["streams"][0]["sample_rate"]),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
