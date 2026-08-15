// make-audio.mjs — 이 게임 전용 오디오를 합성한다. 외부 서비스·라이브러리 없음.
//
// 1차 산출물이 "음질이 아주 낮다"는 지적을 받은 이유는 셋이다:
//   1. BGM 16kHz — 8kHz 위가 통째로 없어 전화기 소리처럼 먹먹하다
//   2. 순수 사인파 + 선형 감쇠 — 배음이 없어 악기가 아니라 신호음으로 들린다
//   3. 어택/릴리즈 엔벨로프 부재 — 시작·끝에서 파형이 0이 아니라 클릭이 난다
//      (실측: wreck.wav 시작 진폭 0.150)
//
// 그래서 여기서는 44.1kHz, 배음 스택 + 개별 감쇠, 코사인 페이드 엔벨로프, 간이 리버브,
// 루프 이음매 크로스페이드를 쓴다. BGM은 지연 로드라 길이·용량 여유가 있다.

import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'assets', 'audio');
const SR = 44100;

// ── 기본 유틸 ───────────────────────────────────────────────────────────────
const TAU = Math.PI * 2;
const clamp = (v) => Math.max(-1, Math.min(1, v));

// 결정적 노이즈 — 실행마다 같은 파일이 나와야 영수증·회귀가 성립한다.
function makeNoise(seed = 12345) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 0x100000000) * 2 - 1;
  };
}

// 코사인 페이드 — 선형보다 부드럽고 클릭이 없다.
function fade(t, dur, attack, release) {
  if (t < attack) return 0.5 - 0.5 * Math.cos(Math.PI * (t / attack));
  const rStart = dur - release;
  if (t > rStart) return 0.5 - 0.5 * Math.cos(Math.PI * (1 - (t - rStart) / release));
  return 1;
}

const expDecay = (t, tau) => Math.exp(-t / tau);

// 종·램프 계열 음색. 배음마다 감쇠 상수가 다르다(고배음이 먼저 사라진다) — 이것이
// 사인파와 실제 악기를 가르는 가장 큰 차이다. 약간의 비배음성(inharmonicity)도 넣는다.
function bell(t, f0, { partials = [1, 2.01, 3.02, 4.07, 5.4], gains = [1, 0.5, 0.28, 0.14, 0.07], tau = 0.5 } = {}) {
  let v = 0;
  for (let i = 0; i < partials.length; i += 1) {
    v += Math.sin(TAU * f0 * partials[i] * t) * gains[i] * expDecay(t, tau / (1 + i * 0.55));
  }
  return v;
}

// 톱니 근사(배음 합) — 패드/베이스용. 부분음 수를 제한해 에일리어싱을 피한다.
function saw(t, f, n = 8) {
  let v = 0;
  for (let k = 1; k <= n; k += 1) v += Math.sin(TAU * f * k * t) / k;
  return v * 0.55;
}

// 1극 저역 통과 — 패드를 부드럽게, 노이즈를 파도처럼 만든다.
function lowpass(buf, cutoff) {
  const a = Math.exp(-TAU * cutoff / SR);
  let y = 0;
  for (let i = 0; i < buf.length; i += 1) { y = (1 - a) * buf[i] + a * y; buf[i] = y; }
  return buf;
}

// 슈뢰더 리버브 축약판 — 콤 4개 + 올패스 2개. 공간감이 생기면 "밖에서 나는 소리"가 된다.
function reverb(buf, { mix = 0.28, decay = 0.62 } = {}) {
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ d, buf: new Float32Array(d), i: 0 }));
  const allpasses = [225, 556].map((d) => ({ d, buf: new Float32Array(d), i: 0 }));
  const wet = new Float32Array(buf.length);
  for (let n = 0; n < buf.length; n += 1) {
    let acc = 0;
    for (const c of combs) {
      const out = c.buf[c.i];
      c.buf[c.i] = buf[n] + out * decay;
      c.i = (c.i + 1) % c.d;
      acc += out;
    }
    acc *= 0.25;
    for (const ap of allpasses) {
      const out = ap.buf[ap.i];
      const inp = acc + out * 0.5;
      ap.buf[ap.i] = inp;
      ap.i = (ap.i + 1) % ap.d;
      acc = out - inp * 0.5;
    }
    wet[n] = acc;
  }
  for (let n = 0; n < buf.length; n += 1) buf[n] = buf[n] * (1 - mix) + wet[n] * mix;
  return buf;
}

// 루프 이음매 제거 — 끝 구간을 앞머리에 겹쳐 섞는다. 이게 없으면 반복마다 툭 소리가 난다.
function seamless(buf, crossSec = 0.5) {
  const c = Math.floor(crossSec * SR);
  if (c * 2 >= buf.length) return buf;
  const out = buf.slice(0, buf.length - c);
  for (let i = 0; i < c; i += 1) {
    const w = i / c;
    out[i] = out[i] * w + buf[buf.length - c + i] * (1 - w);
  }
  return out;
}

function normalize(buf, target) {
  let peak = 0;
  for (const v of buf) peak = Math.max(peak, Math.abs(v));
  if (peak <= 0) return buf;
  const g = target / peak;
  for (let i = 0; i < buf.length; i += 1) buf[i] = clamp(buf[i] * g);
  return buf;
}

function render(seconds, fn) {
  const n = Math.floor(seconds * SR);
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i += 1) buf[i] = fn(i / SR, i);
  return buf;
}

function writeWav(name, buf, rate = SR) {
  const n = buf.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) b.writeInt16LE(Math.round(clamp(buf[i]) * 32767), 44 + i * 2);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), b);
  return b.length;
}

// ── SFX ─────────────────────────────────────────────────────────────────────

// 단점: 등대 램프의 짧은 섬광. 맑은 종 음색.
const pulseShort = () => {
  let b = render(0.36, (t) => bell(t, 1046, { tau: 0.28 }) * fade(t, 0.36, 0.004, 0.12) * 0.7);
  return normalize(reverb(b, { mix: 0.22, decay: 0.5 }), 0.86);
};

// 장점: 같은 음색을 유지음으로. 단점과 음색이 같아야 "같은 램프"로 들린다.
const pulseLong = () => {
  let b = render(0.72, (t) => {
    const body = bell(t, 1046, { tau: 1.4 });
    const shimmer = Math.sin(TAU * 1046 * 2.01 * t) * 0.12 * (0.6 + 0.4 * Math.sin(TAU * 5.5 * t));
    return (body + shimmer) * fade(t, 0.72, 0.006, 0.2) * 0.62;
  });
  return normalize(reverb(b, { mix: 0.24, decay: 0.55 }), 0.86);
};

// 항로 수락: 상승 3음 아르페지오 + 잔향.
const routeAccepted = () => {
  const notes = [659.25, 880, 1318.5];
  let b = render(1.1, (t) => {
    let v = 0;
    notes.forEach((f, i) => {
      const s = i * 0.11;
      if (t >= s) v += bell(t - s, f, { tau: 0.55 }) * 0.6;
    });
    return v * fade(t, 1.1, 0.005, 0.35) * 0.5;
  });
  return normalize(reverb(b, { mix: 0.3, decay: 0.6 }), 0.84);
};

// 난파: 저역 충격 + 목재 파열 + 물 소리. 성공음과 정반대 색이어야 한다.
const wreckSfx = () => {
  const nz = makeNoise(4242);
  let b = render(1.6, (t) => {
    const thud = Math.sin(TAU * (110 - 70 * Math.min(1, t * 3)) * t) * expDecay(t, 0.35) * 0.9;
    const crack = nz() * expDecay(t, 0.12) * 0.5;
    const water = nz() * expDecay(Math.max(0, t - 0.15), 0.9) * 0.22;
    return (thud + crack + water) * fade(t, 1.6, 0.003, 0.45) * 0.7;
  });
  b = lowpass(b, 2600);
  return normalize(reverb(b, { mix: 0.26, decay: 0.6 }), 0.9);
};

// 스테이지 클리어: 무적 2성 — 이 게임의 정체성 사운드.
const stageClear = () => {
  let b = render(2.4, (t) => {
    const horn = (f, s, d) => {
      if (t < s || t > s + d) return 0;
      const lt = t - s;
      const swell = fade(lt, d, 0.18, 0.5);
      return (saw(lt, f, 6) * 0.5 + Math.sin(TAU * f * 0.5 * lt) * 0.35) * swell;
    };
    return (horn(196, 0, 0.95) + horn(261.6, 1.05, 1.2)) * 0.55;
  });
  b = lowpass(b, 1500);
  return normalize(reverb(b, { mix: 0.34, decay: 0.7 }), 0.8);
};

// ── BGM ─────────────────────────────────────────────────────────────────────
// 24초 루프, 4마디 코드 진행. 파도(필터드 노이즈 + LFO) 위에 패드와 저음이 얹힌다.

const CHORDS = [
  [110.0, 130.81, 164.81],   // Am
  [87.31, 130.81, 174.61],   // F
  [130.81, 164.81, 196.0],   // C
  [98.0, 123.47, 146.83],    // G
];

function seaBed(seconds, seed, intensity) {
  const nz = makeNoise(seed);
  const raw = render(seconds, (t) => {
    const swell = 0.45 + 0.55 * Math.sin(TAU * t / 7.5) * Math.sin(TAU * t / 11);
    return nz() * swell * intensity;
  });
  return lowpass(lowpass(raw, 900), 500);
}

function padLayer(seconds, barSec, gain, detune) {
  return render(seconds, (t) => {
    const bar = Math.floor(t / barSec) % CHORDS.length;
    const local = t - Math.floor(t / barSec) * barSec;
    const env = fade(local, barSec, barSec * 0.28, barSec * 0.45);
    let v = 0;
    for (const f of CHORDS[bar]) {
      v += saw(t, f, 6) * 0.33 + saw(t, f * detune, 5) * 0.16;
    }
    return v * env * gain;
  });
}

const homeLoop = () => {
  const SEC = 24, BAR = 6;
  const pad = lowpass(padLayer(SEC, BAR, 0.32, 1.004), 1200);
  const sea = seaBed(SEC, 9001, 0.30);
  // 멀리서 울리는 등대 종 — 12초마다 한 번.
  const bells = render(SEC, (t) => {
    const s = t % 12;
    return s < 3 ? bell(s, 523.25, { tau: 1.6 }) * 0.16 : 0;
  });
  let mix = new Float32Array(SEC * SR);
  for (let i = 0; i < mix.length; i += 1) mix[i] = pad[i] + sea[i] + bells[i];
  mix = reverb(mix, { mix: 0.4, decay: 0.72 });
  return normalize(seamless(mix, 1.2), 0.62);
};

const gameplayLoop = () => {
  const SEC = 24, BAR = 6;
  const pad = lowpass(padLayer(SEC, BAR, 0.26, 1.006), 1500);
  const sea = seaBed(SEC, 7331, 0.34);
  // 맥박 — 등대 회전에 맞춘 저음. 긴장을 만들되 리듬 게임처럼 앞서지는 않는다.
  const pulse = render(SEC, (t) => {
    const beat = t % 1.5;
    const bar = Math.floor(t / BAR) % CHORDS.length;
    const root = CHORDS[bar][0] * 0.5;
    return beat < 0.5 ? (Math.sin(TAU * root * beat) * 0.5 + saw(beat, root, 4) * 0.2) * expDecay(beat, 0.16) * 0.5 : 0;
  });
  let mix = new Float32Array(SEC * SR);
  for (let i = 0; i < mix.length; i += 1) mix[i] = pad[i] + sea[i] + pulse[i];
  mix = reverb(mix, { mix: 0.32, decay: 0.66 });
  return normalize(seamless(mix, 1.2), 0.66);
};

// ── 실행 ────────────────────────────────────────────────────────────────────
const files = {
  'pulse-short.wav': pulseShort,
  'pulse-long.wav': pulseLong,
  'route-accepted.wav': routeAccepted,
  'wreck.wav': wreckSfx,
  'stage-clear.wav': stageClear,
  'home-loop.wav': homeLoop,
  'gameplay-loop.wav': gameplayLoop,
};

for (const [name, fn] of Object.entries(files)) {
  const bytes = writeWav(name, fn());
  console.log(`  ${name.padEnd(22)} ${(bytes / 1024).toFixed(0).padStart(5)} KB`);
}
