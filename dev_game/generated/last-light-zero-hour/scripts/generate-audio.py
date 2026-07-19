from pathlib import Path
import math
import random
import struct
import wave


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "audio"
OUT.mkdir(parents=True, exist_ok=True)
SR = 44100


def write_mono(name, seconds, sample_fn, gain=0.82):
    total = int(SR * seconds)
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        frames = bytearray()
        for i in range(total):
            t = i / SR
            value = max(-1, min(1, sample_fn(t, seconds))) * gain
            frames.extend(struct.pack("<h", int(value * 32767)))
        w.writeframes(frames)


def env(t, d, attack=0.008, release=0.12):
    return min(1, t / attack) * min(1, max(0, (d - t) / release))


rng = random.Random(2041)
noise = [rng.uniform(-1, 1) for _ in range(SR * 2)]


write_mono("ui-start.wav", 0.5, lambda t, d: env(t, d, .02, .16) * (math.sin(2*math.pi*(420+500*t)*t) + .45*math.sin(2*math.pi*(840+260*t)*t)))
write_mono("gatling.wav", 0.16, lambda t, d: env(t, d, .002, .08) * (.62*noise[int(t*SR)%len(noise)] + .55*math.sin(2*math.pi*(82-30*t)*t)))
write_mono("scatter.wav", 0.48, lambda t, d: env(t, d, .001, .28) * (.7*noise[int(t*SR)%len(noise)]*math.exp(-7*t) + .65*math.sin(2*math.pi*72*t)*math.exp(-5*t)))
write_mono("arc.wav", 0.62, lambda t, d: env(t, d, .004, .16) * (.48*math.sin(2*math.pi*(760+1800*t)*t) + .3*noise[int(t*SR*1.7)%len(noise)]*(1-t/d)))
write_mono("rocket.wav", 0.72, lambda t, d: env(t, d, .015, .3) * (.42*noise[int(t*SR*.7)%len(noise)] + .62*math.sin(2*math.pi*(115-55*t)*t)))
write_mono("rail.wav", 1.1, lambda t, d: env(t, d, .08, .3) * (.55*math.sin(2*math.pi*(190+950*t)*t) + .3*math.sin(2*math.pi*(880+1200*t)*t)))
write_mono("impact.wav", 0.24, lambda t, d: env(t, d, .001, .14) * (.7*noise[int(t*SR)%len(noise)]*math.exp(-10*t) + .45*math.sin(2*math.pi*105*t)))
write_mono("explosion.wav", 0.9, lambda t, d: env(t, d, .004, .44) * (.75*noise[int(t*SR*.45)%len(noise)]*math.exp(-3.8*t) + .55*math.sin(2*math.pi*(68-22*t)*t)))
write_mono("core-pickup.wav", 0.42, lambda t, d: env(t, d, .006, .12) * (.55*math.sin(2*math.pi*(640+740*t)*t) + .35*math.sin(2*math.pi*(960+900*t)*t)))
write_mono("overheat.wav", 0.75, lambda t, d: env(t, d, .03, .18) * (.45*noise[int(t*SR*1.3)%len(noise)] + .55*math.sin(2*math.pi*(260-90*t)*t)))
write_mono("zombie.wav", 0.85, lambda t, d: env(t, d, .08, .24) * (.52*math.sin(2*math.pi*(64+8*math.sin(t*18))*t) + .22*noise[int(t*SR*.3)%len(noise)]))
write_mono("last-stand.wav", 1.45, lambda t, d: env(t, d, .04, .55) * (.55*math.sin(2*math.pi*(150-55*t)*t) + .35*math.sin(2*math.pi*(78-28*t)*t)))


def write_music():
    seconds = 16
    total = SR * seconds
    with wave.open(str(OUT / "survival-loop.wav"), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        frames = bytearray()
        for i in range(total):
            t = i / SR
            beat = t % 2
            kick = math.sin(2*math.pi*(62-20*min(beat, .22))*beat) * math.exp(-10*beat)
            pulse = .22*math.sin(2*math.pi*55*t) + .12*math.sin(2*math.pi*82.5*t)
            alarm = .08*math.sin(2*math.pi*(330 + 12*math.sin(t*.7))*t)
            grit = .035*noise[int(t*SR*.21)%len(noise)]
            left = math.tanh((pulse + kick*.65 + alarm + grit) * 1.25)
            right = math.tanh((pulse + kick*.62 + .08*math.sin(2*math.pi*334*t) - grit) * 1.25)
            fade = min(1, t/.35, (seconds-t)/.35)
            frames.extend(struct.pack("<hh", int(left*fade*12000), int(right*fade*12000)))
        w.writeframes(frames)


write_music()
print(f"Generated {len(list(OUT.glob('*.wav')))} game-specific WAV assets in {OUT}")
