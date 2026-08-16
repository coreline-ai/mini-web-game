// make-audio.mjs — 이 게임 전용 오디오를 합성한다. 외부 서비스·라이브러리 없음.
//
// 직전 게임에서 "음질이 아주 낮다"는 지적을 받은 원인 셋을 처음부터 피한다:
//   1. 저샘플레이트(16kHz) — 8kHz 위가 통째로 사라져 먹먹해진다 → 전부 44.1kHz
//   2. 순수 사인파 — 배음이 없어 악기가 아니라 신호음으로 들린다 → 배음 스택
//   3. 엔벨로프 부재 — 시작·끝에서 파형이 0이 아니라 클릭이 난다 → 코사인 페이드
//
// 축구장 소리는 등대와 음색 세계가 다르다: 가죽 임팩트(짧고 넓은 대역), 그물 흔들림
// (필터드 노이즈), 관중 웅성거림(저역 노이즈 + 느린 LFO), 휘슬(고역 삼각파).

import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'assets', 'audio');
const SR = 44100;
const TAU = Math.PI * 2;
const clamp = (v) => Math.max(-1, Math.min(1, v));

// 결정적 노이즈 — 실행마다 같은 파일이 나와야 영수증·회귀가 성립한다.
function makeNoise(seed = 12345) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return (s / 0x100000000) * 2 - 1; };
}

// 코사인 페이드 — 선형보다 부드럽고 클릭이 없다.
function fade(t, dur, attack, release) {
  if (t < attack) return 0.5 - 0.5 * Math.cos(Math.PI * (t / attack));
  const rs = dur - release;
  if (t > rs) return 0.5 - 0.5 * Math.cos(Math.PI * (1 - (t - rs) / release));
  return 1;
}
const expDecay = (t, tau) => Math.exp(-t / tau);

function saw(t, f, n = 8) {
  let v = 0;
  for (let k = 1; k <= n; k += 1) v += Math.sin(TAU * f * k * t) / k;
  return v * 0.55;
}
function tri(t, f, n = 6) {
  let v = 0;
  for (let k = 1; k <= n; k += 2) v += Math.sin(TAU * f * k * t) / (k * k);
  return v * 0.9;
}

function lowpass(buf, cutoff) {
  const a = Math.exp(-TAU * cutoff / SR);
  let y = 0;
  for (let i = 0; i < buf.length; i += 1) { y = (1 - a) * buf[i] + a * y; buf[i] = y; }
  return buf;
}
function highpass(buf, cutoff) {
  const a = Math.exp(-TAU * cutoff / SR);
  let yPrev = 0; let xPrev = 0;
  for (let i = 0; i < buf.length; i += 1) {
    const x = buf[i];
    const y = a * (yPrev + x - xPrev);
    buf[i] = y; yPrev = y; xPrev = x;
  }
  return buf;
}

// 슈뢰더 리버브 축약판 — 경기장 공간감. 이게 있어야 "밖에서 나는 소리"가 된다.
function reverb(buf, { mix = 0.3, decay = 0.65 } = {}) {
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ d, buf: new Float32Array(d), i: 0 }));
  const aps = [225, 556].map((d) => ({ d, buf: new Float32Array(d), i: 0 }));
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
    for (const ap of aps) {
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

// 루프 이음매 제거 — 끝 구간을 앞머리에 겹쳐 섞는다.
function seamless(buf, crossSec = 1.2) {
  const c = Math.floor(crossSec * SR);
  if (c * 2 >= buf.length) return buf;
  const out = buf.slice(0, buf.length - c);
  for (let i = 0; i < c; i += 1) {
    const w = i / c;
    out[i] = out[i] * w + buf[buf.length - c + i] * (1 - w);
  }
  return out;
}

// 루프 파일의 시작점을 **영점 교차**로 옮긴다.
//
// 크로스페이드로 이음매를 없애도 파형이 0이 아닌 지점에서 시작하면 첫 재생 때 클릭이 난다
// (실측: 시작 진폭 0.19). 루프는 순환이므로 버퍼를 회전시켜도 내용은 그대로다 — 앞뒤가
// 모두 0에 가까운 지점을 찾아 거기서 시작하게 하면 이음매와 첫 재생을 동시에 해결한다.
function rotateToZeroCrossing(buf) {
  const window = Math.min(buf.length, Math.floor(SR * 2));
  let best = 0;
  let bestScore = Infinity;
  for (let i = 1; i < window; i += 1) {
    // 값이 0에 가깝고, 상승 방향인 지점을 고른다(하강 지점과 섞이면 위상이 튄다).
    if (buf[i - 1] > 0 || buf[i] < 0) continue;
    const score = Math.abs(buf[i]);
    if (score < bestScore) { bestScore = score; best = i; }
  }
  if (best === 0) return buf;
  const out = new Float32Array(buf.length);
  out.set(buf.subarray(best), 0);
  out.set(buf.subarray(0, best), buf.length - best);
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

// 슈팅 임팩트 — 가죽 공을 세게 찬 소리. 짧고 넓은 대역의 "퍽".
const shotImpact = () => {
  const nz = makeNoise(2201);
  let b = render(0.5, (t, i) => {
    const body = Math.sin(TAU * (190 - 130 * Math.min(1, t * 6)) * t) * expDecay(t, 0.09) * 0.9;
    const slap = nz() * expDecay(t, 0.035) * 0.75;
    return (body + slap) * fade(t, 0.5, 0.002, 0.2) * 0.8;
  });
  b = lowpass(b, 5200);
  return normalize(reverb(b, { mix: 0.24, decay: 0.55 }), 0.9);
};

// 펀칭 — 장갑이 공을 쳐내는 소리. 임팩트보다 짧고 높다.
const punch = () => {
  const nz = makeNoise(3307);
  let b = render(0.34, (t, i) => {
    const thump = Math.sin(TAU * 300 * t) * expDecay(t, 0.05) * 0.6;
    const glove = nz() * expDecay(t, 0.028) * 0.85;
    return (thump + glove) * fade(t, 0.34, 0.002, 0.14) * 0.8;
  });
  b = highpass(lowpass(b, 7000), 320);
  return normalize(reverb(b, { mix: 0.2, decay: 0.5 }), 0.88);
};

// 캐치 — 공을 품에 안는 소리. 임팩트가 죽고 가죽 마찰만 남는다.
const catchSfx = () => {
  const nz = makeNoise(4409);
  let b = render(0.42, (t, i) => {
    const grab = Math.sin(TAU * 150 * t) * expDecay(t, 0.06) * 0.5;
    const leather = nz() * expDecay(t, 0.12) * 0.4;
    return (grab + leather) * fade(t, 0.42, 0.004, 0.22) * 0.75;
  });
  b = lowpass(b, 3000);
  return normalize(reverb(b, { mix: 0.18, decay: 0.45 }), 0.82);
};

// 실점 — 그물이 출렁이고 관중이 탄식한다. 이 게임에서 가장 감정적인 소리.
const netRipple = () => {
  const nz = makeNoise(5501);
  let b = render(1.9, (t, i) => {
    // 그물: 짧은 마찰 후 느리게 떨림
    const mesh = nz() * expDecay(t, 0.22) * 0.55;
    const wobble = Math.sin(TAU * 46 * t) * expDecay(t, 0.5) * 0.3;
    // 관중 탄식: 0.25초 뒤 시작하는 저역 노이즈 스웰
    const crowd = t > 0.25 ? nz() * 0.5 * Math.sin(Math.PI * Math.min(1, (t - 0.25) / 1.4)) : 0;
    return (mesh + wobble + crowd * 0.6) * fade(t, 1.9, 0.003, 0.7) * 0.7;
  });
  b = lowpass(b, 2200);
  return normalize(reverb(b, { mix: 0.34, decay: 0.7 }), 0.9);
};

// 휘슬 — 스테이지 전환. 삼각파 + 롤링(구슬) 변조.
const whistle = () => {
  let b = render(0.85, (t) => {
    const roll = 1 + 0.05 * Math.sin(TAU * 42 * t);
    const core = tri(t, 2350 * roll, 5) * 0.6 + tri(t, 3100 * roll, 3) * 0.25;
    return core * fade(t, 0.85, 0.03, 0.25) * 0.55;
  });
  return normalize(reverb(b, { mix: 0.26, decay: 0.55 }), 0.78);
};

// ── BGM ─────────────────────────────────────────────────────────────────────
// 24초 루프. 관중 웅성거림 위에 낮은 코드 패드, 게임에는 심장 박동 같은 킥이 얹힌다.

const CHORDS = [
  [98.0, 123.47, 146.83],   // G
  [110.0, 130.81, 164.81],  // Am
  [87.31, 110.0, 130.81],   // F
  [98.0, 123.47, 174.61],   // G sus
];

function crowdBed(seconds, seed, intensity) {
  const nz = makeNoise(seed);
  const raw = render(seconds, (t) => {
    // 관중은 파도처럼 부풀었다 가라앉는다 — 서로 다른 주기 두 개를 곱해 반복감을 없앤다
    const swell = 0.5 + 0.5 * Math.sin(TAU * t / 6.5) * Math.sin(TAU * t / 9.5);
    return nz() * swell * intensity;
  });
  return lowpass(lowpass(raw, 1100), 620);
}

function padLayer(seconds, barSec, gain, detune) {
  return render(seconds, (t) => {
    const bar = Math.floor(t / barSec) % CHORDS.length;
    const local = t - Math.floor(t / barSec) * barSec;
    const env = fade(local, barSec, barSec * 0.3, barSec * 0.45);
    let v = 0;
    for (const f of CHORDS[bar]) v += saw(t, f, 6) * 0.32 + saw(t, f * detune, 5) * 0.15;
    return v * env * gain;
  });
}

const homeLoop = () => {
  const SEC = 24, BAR = 6;
  const pad = lowpass(padLayer(SEC, BAR, 0.30, 1.004), 1100);
  const crowd = crowdBed(SEC, 7717, 0.34);
  let mix = new Float32Array(SEC * SR);
  for (let i = 0; i < mix.length; i += 1) mix[i] = pad[i] + crowd[i];
  mix = reverb(mix, { mix: 0.4, decay: 0.72 });
  return normalize(rotateToZeroCrossing(seamless(mix)), 0.62);
};

const gameplayLoop = () => {
  const SEC = 24, BAR = 6;
  const pad = lowpass(padLayer(SEC, BAR, 0.24, 1.006), 1400);
  const crowd = crowdBed(SEC, 8821, 0.38);
  // 심장 박동 — 2박마다 낮은 킥. 긴장을 만들되 리듬 게임처럼 앞서지 않는다.
  const kick = render(SEC, (t) => {
    const beat = t % 1.2;
    if (beat >= 0.42) return 0;
    return Math.sin(TAU * (86 - 40 * beat) * beat) * expDecay(beat, 0.11) * 0.5;
  });
  let mix = new Float32Array(SEC * SR);
  for (let i = 0; i < mix.length; i += 1) mix[i] = pad[i] + crowd[i] + kick[i];
  mix = reverb(mix, { mix: 0.32, decay: 0.66 });
  return normalize(rotateToZeroCrossing(seamless(mix)), 0.68);
};

// ── 실행 ────────────────────────────────────────────────────────────────────
const files = {
  'shot-impact.wav': shotImpact,
  'punch.wav': punch,
  'catch.wav': catchSfx,
  'net-ripple.wav': netRipple,
  'whistle.wav': whistle,
  'home-loop.wav': homeLoop,
  'gameplay-loop.wav': gameplayLoop,
};

for (const [name, fn] of Object.entries(files)) {
  const bytes = writeWav(name, fn());
  console.log(`  ${name.padEnd(20)} ${(bytes / 1024).toFixed(0).padStart(5)} KB`);
}
