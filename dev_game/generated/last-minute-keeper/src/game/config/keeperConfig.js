// keeperConfig.js — Rules Contract 단일 원본.
//
// 이 파일의 숫자가 게임 규칙의 유일한 출처다. 시스템·UI·도움말·GDD는 전부 여기서 읽거나
// 이 값을 반영하며, 어디에도 같은 숫자를 다시 적지 않는다. 런타임은 이 객체를
// window.__GAME_RULES__로 공표하고 factory:docs-runtime-sync-qa가 문서와 대조한다.

// ── 조작 ────────────────────────────────────────────────────────────────────
// 두 층으로 나눈 것이 이 게임의 정체성이다: 느린 드래그로 따라가거나, 빠른 플릭으로
// 몸을 던지고 회복 시간을 대가로 치른다. 임계는 전부 여기서만 바꾼다.
// 판정 임계값. 씬에 하드코딩돼 있어서 Rules Contract(런타임 config → __GAME_RULES__ → UI/GDD)를
// 어기고 있었다 — 숫자를 바꿔도 문서와 UI가 따라오지 않는다는 뜻이다.
export const JUDGE = Object.freeze({
  catchMaxHeight: 0.55,   // 이 높이를 넘으면 손이 닿아야 한다 = 다이빙 필수
  blockMaxHeight: 0.75,   // 이 위는 몸으로 막을 수 없다
  catchMaxSpeed: 1300,    // 이보다 빠르면 잡지 못하고 쳐낸다
});

export const CONTROL = Object.freeze({
  // 이동 상한과 가속은 **골문 폭(842px)과 비행 시간**을 함께 보고 정해야 한다. 1500/9000일
  // 때 키퍼는 어떤 슛에서도 골문을 3~6번 왕복할 수 있었다(강슛 336%, 로빙 588%) — 위치
  // 선정에 값이 없어서 읽기·이동·커밋 중 앞의 둘이 공짜였다. 700/3000이면 강슛에서 중앙 →
  // 골포스트를 간신히 커버한다(167%). 100% 아래로는 내리지 않는다 — 못 닿는 슛은 난이도가
  // 아니라 불공정이다.
  dragMaxSpeed: 700,         // 논리px/초 — 키퍼 이동 상한. 순간이동을 막는다
  dragAccel: 3000,           // 논리px/초² — 관성. 방향 전환에 시간이 걸린다
  diveFlickSpeed: 2600,      // 논리px/초 — 이 속도를 넘는 포인터 이동은 다이브
  // diveTravel은 반드시 다이브 도달 반폭보다 **작아야** 한다.
  //
  // 300 / 도달 248이면 공 앞에 정확히 선 채로 다이빙할 때 몸이 도달 범위보다 멀리 날아가
  // 빗나간다. 높은 공은 다이빙 없이 막을 수 없으므로(judge.catchMaxHeight), 결과적으로
  // **정답 행동이 처벌받는다** — 실측에서 다이브 봇(50%)이 추적 전용 봇(55%)보다 낮았다.
  // 사용자가 "공을 어떻게 막는지 모르겠다"고 한 이유가 이것이다.
  //
  // 140 / 도달 298이면 제자리 다이빙도 닿고, 옆으로는 438px까지 뻗는다(서 있을 때 124px).
  diveDurationMs: 420,       // 몸이 뻗어 나가는 시간 — 창이 좁으면 타이밍이 아니라 운이 된다
  diveRecoveryMs: 620,       // 다이브 후 이동 불가 시간 — 커밋의 대가
  diveReachMultiplier: 2.4,  // 다이브 중 도달 범위 배수
  diveTravel: 140,           // 논리px — 다이브가 밀어내는 가로 거리 (도달 반폭보다 작을 것)
  punchRange: 210,           // 논리px — 이 안에 공이 있으면 탭으로 펀칭 가능
});

// ── 슛 종류 ─────────────────────────────────────────────────────────────────
// 종류마다 대응이 달라야 근육 기억이 통하지 않는다.
//   speed  : 논리px/초 (세로 낙하 속도)
//   curve  : 마그누스 가속 (논리px/초², 양수=오른쪽으로 휨)
//   height : 도착 시 공의 높이(0=지면, 1=크로스바) — 그림자 거리로 표현된다
// speed는 회랑 길이와 함께 읽어야 한다. 슈터를 잔디 위(0.52)로 내리면서 회랑이
// 0.653 → 0.393 캔버스 높이로 짧아졌으므로(비율 0.602) 속도를 같은 비율로 낮춰
// **비행 시간을 보존**했다. 텔레그래프 창(260~700ms)과 다이브 회복(620ms)이 반응 시간
// 기준으로 조율돼 있어서, 시간이 바뀌면 난이도가 통째로 바뀐다.
export const SHOT_TYPES = Object.freeze({
  drive: Object.freeze({ id: 'drive', label: '강슛', speed: 1053, curve: 0, height: 0.18, telegraphMs: 420 }),
  lob: Object.freeze({ id: 'lob', label: '로빙', speed: 602, curve: 0, height: 0.86, telegraphMs: 620 }),
  bender: Object.freeze({ id: 'bender', label: '감아차기', speed: 710, curve: 1500, height: 0.42, telegraphMs: 700 }),
  header: Object.freeze({ id: 'header', label: '헤딩', speed: 873, curve: 0, height: 0.62, telegraphMs: 260 }),
});

// ── 스테이지 계약 ───────────────────────────────────────────────────────────
// 각 스테이지는 (목표, 보상, 다음 상태)를 데이터로 선언한다. 마지막 스테이지의 next가
// 'full-time'이라 승리 터미널이 구조적으로 도달 가능하다(결함 클래스 E).
//
// 난이도는 스테이지 인덱스와 경과 시간만으로 결정된다. 남은 실점 여유·점수·콤보처럼
// 플레이어가 회복할 수 있는 값은 절대 참조하지 않는다(결함 클래스 D).
export const STAGES = Object.freeze([
  Object.freeze({
    index: 1, name: '슈팅 연습', backdrop: 'bg_0', durationMs: 42000,
    shots: ['drive', 'lob'], shotGapMs: 2600, maxLiveBalls: 1,
    deflectChance: 0, reward: 'stage-clear-bonus', next: 2,
  }),
  Object.freeze({
    index: 2, name: '프리킥', backdrop: 'bg_1', durationMs: 46000,
    shots: ['drive', 'lob', 'bender'], shotGapMs: 2400, maxLiveBalls: 1,
    deflectChance: 0.15, reward: 'stage-clear-bonus', next: 3,
  }),
  Object.freeze({
    index: 3, name: '코너킥 혼전', backdrop: 'bg_2', durationMs: 50000,
    shots: ['drive', 'header', 'bender'], shotGapMs: 2000, maxLiveBalls: 2,
    deflectChance: 0.3, reward: 'stage-clear-bonus', next: 4,
  }),
  Object.freeze({
    index: 4, name: '페널티', backdrop: 'bg_3', durationMs: 40000,
    shots: ['drive', 'bender'], shotGapMs: 3200, maxLiveBalls: 1,
    deflectChance: 0, reward: 'stage-clear-bonus', next: 5,
  }),
  Object.freeze({
    index: 5, name: '추가시간', backdrop: 'bg_4', durationMs: 54000,
    shots: ['drive', 'lob', 'bender', 'header'], shotGapMs: 1800, maxLiveBalls: 2,
    deflectChance: 0.35, reward: 'full-time', next: 'full-time',
  }),
]);

// ── 리바운드 ────────────────────────────────────────────────────────────────
// 쳐낸 공이 살아 있는 것이 "정적이지 않음"의 핵심 장치다. 다만 무한 연쇄는 막는다.
export const REBOUND = Object.freeze({
  maxChain: 3,               // 한 공이 이어질 수 있는 최대 리바운드 횟수
  liveMs: 2600,              // 이 시간이 지나면 공이 필드 밖으로 굴러 나간다
  punchSpeed: 1350,          // 펀칭이 밀어내는 속도
  parrySpeedRatio: 0.45,     // 몸으로 막았을 때 남는 속도 비율
});

export const KEEPER_RULES = Object.freeze({
  goal: 'keep-the-goal-until-stoppage-time-ends',
  progressMetric: 'saves-made',
  concedeAllowance: 5,       // 실점 5회 → 패배
  // 점수 — 세이브 등급에 차등을 둔다
  scoreCatch: 150,
  scorePunch: 100,
  scoreBlock: 70,
  comboStep: 1,
  comboMax: 6,
  cleanStageBonus: 400,
  judge: JUDGE,
  control: CONTROL,
  shotTypes: SHOT_TYPES,
  stages: STAGES,
  rebound: REBOUND,
});

// 셸이 기대하는 이름.
export const CUSTOM_GAME_CONFIG = KEEPER_RULES;
export default KEEPER_RULES;
