// keeperConfig.js — Rules Contract 단일 원본.
//
// 이 파일의 숫자가 게임 규칙의 유일한 출처다. GameScene/UI/도움말/GDD는 전부 여기서
// 읽거나 이 값을 반영하며, 어디에도 같은 숫자를 다시 적지 않는다. 런타임은 이 객체를
// window.__GAME_RULES__로 공표하고 factory:docs-runtime-sync-qa가 문서와 대조한다.

// 신호 코드 — 요청 기호가 요구하는 펄스 나열. 's' = 짧게, 'l' = 길게.
export const SIGNAL_CODES = Object.freeze({
  'port-turn': Object.freeze({ glyph: '◀', label: '좌현 변침', code: Object.freeze(['s', 's', 'l']) }),
  'starboard-turn': Object.freeze({ glyph: '▶', label: '우현 변침', code: Object.freeze(['l', 's', 's']) }),
  'slow-hold': Object.freeze({ glyph: '⏸', label: '감속 대기', code: Object.freeze(['s', 'l', 's']) }),
  'enter-harbour': Object.freeze({ glyph: '⚓', label: '입항 허가', code: Object.freeze(['l', 's', 'l']) }),
  'rock-warning': Object.freeze({ glyph: '⚠', label: '암초 회피', code: Object.freeze(['s', 'l', 'l', 's']) }),
});

// 스테이지 계약 — 각 스테이지는 (목표, 보상, 다음 상태)를 데이터로 선언한다.
// 마지막 스테이지의 next가 'dawn'이라 승리 터미널이 반드시 도달 가능하다(결함 클래스 E).
export const STAGES = Object.freeze([
  Object.freeze({ index: 1, backdrop: 'bg_0', quota: 4, maxConcurrent: 1, patienceMs: 14000, spawnGapMs: 2600, codes: ['port-turn', 'starboard-turn', 'slow-hold'], reward: 'stage-clear-bonus', next: 2 }),
  Object.freeze({ index: 2, backdrop: 'bg_1', quota: 5, maxConcurrent: 2, patienceMs: 12500, spawnGapMs: 2400, codes: ['port-turn', 'starboard-turn', 'slow-hold', 'enter-harbour'], reward: 'stage-clear-bonus', next: 3 }),
  Object.freeze({ index: 3, backdrop: 'bg_2', quota: 6, maxConcurrent: 3, patienceMs: 11000, spawnGapMs: 2200, codes: ['port-turn', 'starboard-turn', 'slow-hold', 'enter-harbour', 'rock-warning'], reward: 'stage-clear-bonus', next: 4 }),
  Object.freeze({ index: 4, backdrop: 'bg_3', quota: 7, maxConcurrent: 4, patienceMs: 9500, spawnGapMs: 2000, codes: ['port-turn', 'starboard-turn', 'slow-hold', 'enter-harbour', 'rock-warning'], reward: 'stage-clear-bonus', next: 5 }),
  Object.freeze({ index: 5, backdrop: 'bg_4', quota: 6, maxConcurrent: 3, patienceMs: 10500, spawnGapMs: 2100, codes: ['port-turn', 'starboard-turn', 'slow-hold', 'enter-harbour', 'rock-warning'], reward: 'dawn', next: 'dawn' }),
]);

export const KEEPER_RULES = Object.freeze({
  goal: 'guide-every-ship-safely-until-dawn',
  progressMetric: 'ships-guided',
  // 입력 판정
  longPressMs: 260,          // 이 이상 누르면 장점(▬)
  inputResetMs: 2400,        // 마지막 펄스 후 이 시간이 지나면 입력 버퍼를 비운다
  // 실패
  wreckAllowance: 3,         // 난파 3회 → 패배
  wrongCodePenaltyRatio: 0.45, // 오답 시 인내심을 이 비율만큼 즉시 깎는다
  // 점수
  guideScore: 100,
  comboStep: 1,
  comboMax: 5,
  swiftBonus: 50,            // 인내심 절반 이상 남기고 성공 시
  swiftThresholdRatio: 0.5,
  stageClearBonus: 300,
  // 선박
  shipTypes: Object.freeze(['ship-cargo', 'ship-fishing', 'ship-ferry']),
  stages: STAGES,
  signalCodes: SIGNAL_CODES,
});

// 셸이 기대하는 이름. spec의 rules와 함께 __GAME_RULES__로 공표된다.
export const CUSTOM_GAME_CONFIG = KEEPER_RULES;
export default KEEPER_RULES;
