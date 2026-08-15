// SignalCodec — 요청 기호와 빛 코드 사이의 번역·판정.
//
// 판정 로직을 입력 수집(PatternInput)과 분리한 이유: 입력은 시간에 의존하지만 판정은
// 순수 함수라, 분리해 두면 판정만 단위 테스트할 수 있고 "왜 오답인지"를 UI가 설명할 수 있다.

import { SIGNAL_CODES } from '../config/keeperConfig.js';

export const PULSE_GLYPH = Object.freeze({ s: '▪', l: '▬' });

export function requestIds() {
  return Object.keys(SIGNAL_CODES);
}

export function requestOf(id) {
  return SIGNAL_CODES[id] || null;
}

export function codeOf(id) {
  return SIGNAL_CODES[id]?.code || [];
}

export function renderCode(pulses) {
  return pulses.map((p) => PULSE_GLYPH[p] || '?').join(' ');
}

// 입력 버퍼가 목표 코드에 대해 어떤 상태인지 판정한다.
//   'pending'    아직 접두사로 유효 — 계속 입력받는다
//   'complete'   정확히 일치 — 성공
//   'wrong'      접두사에서 이미 어긋남 — 즉시 오답 처리
//
// 길이가 찰 때까지 기다리지 않고 접두사가 깨지는 순간 'wrong'을 반환하는 것이 중요하다.
// 그래야 플레이어가 틀린 걸 바로 알고, 남은 펄스를 헛되이 넣지 않는다.
export function judge(buffer, targetCode) {
  if (!targetCode?.length) return 'wrong';
  for (let i = 0; i < buffer.length; i += 1) {
    if (i >= targetCode.length || buffer[i] !== targetCode[i]) return 'wrong';
  }
  return buffer.length === targetCode.length ? 'complete' : 'pending';
}

// 스테이지가 허용한 요청 중 하나를 고른다. Phaser RNG를 주입받아 결정성을 유지한다.
export function pickRequest(rng, allowedIds) {
  const pool = allowedIds?.length ? allowedIds : requestIds();
  return pool[Math.floor(rng.frac() * pool.length) % pool.length];
}
