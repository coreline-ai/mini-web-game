import { SPEC } from '../data/spec.js';

const market = SPEC.marketPanic || {};

export const UI_FONT = "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', Arial, sans-serif";
export const HEAVY_FONT = "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Arial Black', Arial, sans-serif";

export const MARKET_CONFIG = {
  initialPortfolio: market.initialPortfolio ?? 100,
  initialRisk: market.initialRisk ?? 28,
  initialConfidence: market.initialConfidence ?? 72,
  riskFailure: market.riskFailure ?? 100,
  confidenceFailure: market.confidenceFailure ?? 0,
  actions: market.actions || ['BUY', 'SELL', 'HEDGE', 'CASH'],
  tickers: market.tickers || [],
  stages: market.stages || [],
};

export const TICKER_LABELS = {
  MARKET: '전체 시장',
  NOVA: '노바 AI',
  VOLT: '그린 볼트',
  BIOZ: '바이오젠',
  GRID: '아이언 그리드',
  SAFE: '세이프푸드',
  CBNK: '크립토뱅크',
};

export const STAGE_LABELS = {
  MARKET: '시장',
  'OPENING BELL': '개장 직후',
  'EARNINGS STORM': '실적 폭풍',
  'RUMOR SPIRAL': '루머 소용돌이',
  'CIRCUIT BREAKER': '서킷 브레이커',
};

export const EVENT_TYPE_LABELS = {
  bullish: '호재',
  bearish: '악재',
  macro: '거시 뉴스',
  event: '이벤트',
  rumor: '루머',
  fake: '가짜뉴스',
  systemic: '시장 충격',
  defensive: '방어주',
  news: '뉴스',
};

export const TERMINAL_LABELS = {
  'CIRCUIT BREAKER': '서킷 브레이커',
  'INVESTOR RUN': '투자심리 붕괴',
  'MARGIN CALL': '마진콜',
  'BAD STREAK': '연속 오판',
  'RUMOR TRAP': '루머 함정',
  'TARGET MISSED': '목표 미달',
  'MASTER TRADER': '마스터 트레이더',
  'MARKET SAVED': '시장 생존',
  'GAME OVER': '게임 오버',
};

export const TERMINAL_REASON_LABELS = {
  'Risk reached 100': '위험도가 100에 도달했습니다',
  'Confidence collapsed': '신뢰도가 바닥났습니다',
  'Portfolio breached floor': '자산이 생존 기준 아래로 떨어졌습니다',
  'Three wrong calls on one ticker': '같은 종목에서 3번 연속 오판했습니다',
  'Too many fake signal hits': '가짜뉴스에 너무 많이 당했습니다',
  'Return target missed': '수익 목표를 달성하지 못했습니다',
  'Risk too high at close': '마감 시점 위험도가 너무 높습니다',
  'No successful hedge': '필수 헤지 성공이 없습니다',
  'Confidence too low': '신뢰도가 기준보다 낮습니다',
  'Closing bell survived': '마감 종까지 버텼습니다',
};

export function tickerLabel(idOrTicker) {
  const id = typeof idOrTicker === 'string' ? idOrTicker : idOrTicker?.id;
  return TICKER_LABELS[id] || id || '시장';
}

export function stageLabel(stageOrName) {
  const name = typeof stageOrName === 'string' ? stageOrName : stageOrName?.name;
  return STAGE_LABELS[name] || name || '시장';
}

export function eventTypeLabel(type) {
  return EVENT_TYPE_LABELS[type] || EVENT_TYPE_LABELS.news;
}

function sourceGrade(event) {
  if (!event) return 'B';
  if (event.sourceGrade) return event.sourceGrade;
  if (event.fake || event.type === 'rumor') return 'C';
  if (event.type === 'event' || event.type === 'bullish' || event.type === 'bearish') return 'A';
  return 'B';
}

function horizonLabel(event) {
  if (!event) return '장중';
  if (event.horizon) return event.horizon;
  if (event.type === 'systemic' || event.magnitude >= 1.35) return '즉시';
  if (event.type === 'macro' || event.type === 'defensive') return '중기';
  return '장중';
}

function volatilityScore(event) {
  if (!event) return 2;
  return Math.max(1, Math.min(5, Math.round((event.magnitude || 1) * 2.6)));
}

function scopeLabel(event) {
  return event?.ticker === 'MARKET' ? '시장 전체' : '개별 종목';
}

export function signalLabel(event) {
  if (!event) return '시장 브리핑';
  return `출처 ${sourceGrade(event)} · ${scopeLabel(event)}`;
}

export function terminalLabel(title) {
  return TERMINAL_LABELS[title] || title || TERMINAL_LABELS['GAME OVER'];
}

export function terminalReason(reason) {
  return TERMINAL_REASON_LABELS[reason] || reason || '마감 종이 울렸습니다';
}

export function actionHint(event) {
  if (!event) return '정보를 해석하세요';
  return `변동 ${volatilityScore(event)}/5 · ${horizonLabel(event)} · 검증 ${sourceGrade(event)}`;
}

export const ACTION_META = {
  BUY: {
    label: '매수',
    short: '상승 베팅',
    color: 0x22c55e,
    textColor: '#dcfce7',
  },
  SELL: {
    label: '매도',
    short: '하락 베팅',
    color: 0xef4444,
    textColor: '#fee2e2',
  },
  HEDGE: {
    label: '헤지',
    short: '위험 축소',
    color: 0x38bdf8,
    textColor: '#e0f2fe',
  },
  CASH: {
    label: '현금',
    short: '관망',
    color: 0xfacc15,
    textColor: '#fef9c3',
  },
};

const HANDCRAFTED_MARKET_EVENTS = [
  {
    id: 'ai-contract',
    headline: '노바 AI 대형 계약에 초기 서버 비용 조건이 붙었다',
    ticker: 'NOVA',
    direction: 1,
    magnitude: 0.92,
    type: 'event',
    good: ['BUY', 'HEDGE'],
    bad: ['SELL'],
    sourceGrade: 'A',
    horizon: '중기',
  },
  {
    id: 'volt-storage-orders',
    headline: '그린 볼트 주문 잔고는 늘었지만 납기 조건이 빡빡해졌다',
    ticker: 'VOLT',
    direction: 1,
    magnitude: 0.84,
    type: 'event',
    good: ['BUY', 'HEDGE'],
    bad: ['SELL'],
    sourceGrade: 'A',
    horizon: '단기',
  },
  {
    id: 'market-breadth-weak',
    headline: '지수는 버티지만 상승 종목 수가 줄어든다',
    ticker: 'MARKET',
    direction: -1,
    magnitude: 0.92,
    type: 'macro',
    good: ['HEDGE', 'CASH'],
    bad: ['BUY'],
    sourceGrade: 'B',
    horizon: '장중',
  },
  {
    id: 'rate-steady',
    headline: '금리 동결 뒤 성장주 기대와 차익실현 매물이 같이 나온다',
    ticker: 'NOVA',
    direction: 0.4,
    magnitude: 0.85,
    type: 'macro',
    good: ['HEDGE', 'BUY'],
    bad: ['SELL'],
    sourceGrade: 'B',
    horizon: '장중',
  },
  {
    id: 'volt-defect-probe',
    headline: '그린 볼트 품질 점검은 확대됐지만 출하 계획은 유지됐다',
    ticker: 'VOLT',
    direction: -1,
    magnitude: 1.08,
    type: 'event',
    good: ['SELL', 'HEDGE'],
    bad: ['BUY'],
    sourceGrade: 'A',
    horizon: '단기',
  },
  {
    id: 'market-vol-cools',
    headline: '변동성 지표는 식지만 거래대금도 함께 줄었다',
    ticker: 'MARKET',
    direction: 0.3,
    magnitude: 0.72,
    type: 'macro',
    good: ['HEDGE', 'CASH'],
    bad: ['SELL'],
    sourceGrade: 'B',
    horizon: '장중',
  },
  {
    id: 'volt-costs',
    headline: '그린 볼트 원가 부담 완화에 계약 재협상 요구가 붙었다',
    ticker: 'VOLT',
    direction: 1,
    magnitude: 0.72,
    type: 'news',
    good: ['BUY', 'HEDGE'],
    bad: ['SELL'],
    sourceGrade: 'B',
    horizon: '중기',
  },
  {
    id: 'ai-chip-delay',
    headline: '노바 AI 신형 칩 일정표에서 일부 검증 단계가 뒤로 밀렸다',
    ticker: 'NOVA',
    direction: -1,
    magnitude: 1.05,
    type: 'event',
    good: ['SELL', 'HEDGE'],
    bad: ['BUY'],
    sourceGrade: 'A',
    horizon: '단기',
  },
  {
    id: 'market-relief-bid',
    headline: '저가 매수세가 들어왔지만 참여 종목 폭은 좁다',
    ticker: 'MARKET',
    direction: 0.5,
    magnitude: 0.88,
    type: 'news',
    good: ['BUY', 'HEDGE'],
    bad: ['SELL'],
    sourceGrade: 'B',
    horizon: '장중',
  },
  {
    id: 'bio-readout',
    headline: '바이오젠 임상 결과 발표가 임박했다',
    ticker: 'BIOZ',
    direction: 1,
    magnitude: 1.2,
    type: 'event',
    good: ['BUY', 'HEDGE'],
    bad: ['CASH'],
  },
  {
    id: 'grid-backlog',
    headline: '아이언 그리드 수주 잔고가 늘었다',
    ticker: 'GRID',
    direction: 1,
    magnitude: 0.74,
    type: 'bullish',
    good: ['BUY'],
    bad: ['SELL'],
  },
  {
    id: 'guidance-cut',
    headline: '애널리스트들이 다음 분기 전망을 낮췄다',
    ticker: 'NOVA',
    direction: -1,
    magnitude: 0.95,
    type: 'bearish',
    good: ['SELL', 'HEDGE'],
    bad: ['BUY'],
  },
  {
    id: 'bio-trial-hold',
    headline: '바이오젠 임상 보류 통보가 나왔다',
    ticker: 'BIOZ',
    direction: -1,
    magnitude: 1.42,
    type: 'bearish',
    good: ['SELL', 'HEDGE'],
    bad: ['BUY'],
  },
  {
    id: 'market-defensive-shift',
    headline: '방어주로 자금이 빠르게 이동한다',
    ticker: 'MARKET',
    direction: -1,
    magnitude: 0.86,
    type: 'defensive',
    good: ['HEDGE', 'CASH'],
    bad: ['BUY'],
  },
  {
    id: 'grid-bid',
    headline: '아이언 그리드가 공공 입찰을 수주했다',
    ticker: 'GRID',
    direction: 1,
    magnitude: 0.75,
    type: 'bullish',
    good: ['BUY'],
    bad: ['SELL'],
  },
  {
    id: 'ai-margin-defense',
    headline: '노바 AI 마진 방어에 성공했다',
    ticker: 'NOVA',
    direction: 1,
    magnitude: 0.82,
    type: 'bullish',
    good: ['BUY'],
    bad: ['SELL', 'CASH'],
  },
  {
    id: 'grid-outage-probe',
    headline: '아이언 그리드 정전 조사가 확대됐다',
    ticker: 'GRID',
    direction: -1,
    magnitude: 0.96,
    type: 'bearish',
    good: ['SELL', 'HEDGE'],
    bad: ['BUY'],
  },
  {
    id: 'crypto-liquidity',
    headline: '크립토뱅크 유동성 루머가 퍼진다',
    ticker: 'CBNK',
    direction: -1,
    magnitude: 1.35,
    type: 'rumor',
    good: ['SELL', 'HEDGE', 'CASH'],
    bad: ['BUY'],
  },
  {
    id: 'safe-staple-demand',
    headline: '생필품 수요가 세이프푸드를 지지한다',
    ticker: 'SAFE',
    direction: 1,
    magnitude: 0.58,
    type: 'defensive',
    good: ['BUY', 'CASH'],
    bad: ['SELL'],
  },
  {
    id: 'bio-fast-track',
    headline: '바이오젠 신약이 신속심사에 들어갔다',
    ticker: 'BIOZ',
    direction: 1,
    magnitude: 1.28,
    type: 'event',
    good: ['BUY', 'HEDGE'],
    bad: ['SELL', 'CASH'],
  },
  {
    id: 'bio-unclear',
    headline: '바이오젠 승인 소식의 출처가 불분명하다',
    ticker: 'BIOZ',
    direction: 1,
    magnitude: 1.2,
    type: 'fake',
    fake: true,
    good: ['CASH', 'HEDGE'],
    bad: ['BUY'],
  },
  {
    id: 'cbnk-reserve-proof',
    headline: '크립토뱅크 준비금 보고서가 공개됐다',
    ticker: 'CBNK',
    direction: 1,
    magnitude: 1.18,
    type: 'event',
    good: ['BUY', 'HEDGE'],
    bad: ['SELL'],
  },
  {
    id: 'volt-subsidy-delay',
    headline: '보조금 심사 지연에 볼트가 흔들린다',
    ticker: 'VOLT',
    direction: -1,
    magnitude: 0.88,
    type: 'macro',
    good: ['SELL', 'HEDGE'],
    bad: ['BUY'],
  },
  {
    id: 'safe-defensive',
    headline: '세이프푸드로 방어 자금이 몰린다',
    ticker: 'SAFE',
    direction: 1,
    magnitude: 0.62,
    type: 'defensive',
    good: ['BUY', 'CASH'],
    bad: ['SELL'],
  },
  {
    id: 'bio-data-delay',
    headline: '바이오젠 데이터 공개가 지연됐다',
    ticker: 'BIOZ',
    direction: -1,
    magnitude: 1.16,
    type: 'event',
    good: ['SELL', 'HEDGE'],
    bad: ['BUY'],
  },
  {
    id: 'cbnk-wallet-halt',
    headline: '크립토뱅크 지갑 출금이 지연된다',
    ticker: 'CBNK',
    direction: -1,
    magnitude: 1.36,
    type: 'bearish',
    good: ['SELL', 'HEDGE'],
    bad: ['BUY'],
  },
  {
    id: 'insider-rumor',
    headline: '노바 AI 내부자 매도 루머가 번진다',
    ticker: 'NOVA',
    direction: -1,
    magnitude: 1.1,
    type: 'fake',
    fake: true,
    good: ['CASH', 'HEDGE'],
    bad: ['SELL'],
  },
  {
    id: 'grid-infra-budget',
    headline: '인프라 예산 증액 기대가 커진다',
    ticker: 'GRID',
    direction: 1,
    magnitude: 0.78,
    type: 'macro',
    good: ['BUY'],
    bad: ['SELL', 'CASH'],
  },
  {
    id: 'safe-recall-cost',
    headline: '세이프푸드 리콜 비용 우려가 나온다',
    ticker: 'SAFE',
    direction: -1,
    magnitude: 0.84,
    type: 'bearish',
    good: ['SELL', 'HEDGE'],
    bad: ['BUY'],
  },
  {
    id: 'rate-shock',
    headline: '금리 충격으로 시장 전체가 흔들린다',
    ticker: 'MARKET',
    direction: -1,
    magnitude: 1.45,
    type: 'systemic',
    good: ['HEDGE', 'CASH'],
    bad: ['BUY'],
  },
  {
    id: 'ai-upgrade-report',
    headline: '노바 AI 목표가 상향 보고서가 나왔다',
    ticker: 'NOVA',
    direction: 1,
    magnitude: 0.9,
    type: 'news',
    good: ['BUY'],
    bad: ['SELL', 'CASH'],
  },
  {
    id: 'cbnk-token-volume',
    headline: '크립토뱅크 거래량이 급증했다',
    ticker: 'CBNK',
    direction: 1,
    magnitude: 1.12,
    type: 'bullish',
    good: ['BUY'],
    bad: ['SELL'],
  },
  {
    id: 'stabilization',
    headline: '시장 안정 패키지 소문이 돈다',
    ticker: 'MARKET',
    direction: 1,
    magnitude: 1.25,
    type: 'systemic',
    good: ['BUY', 'HEDGE'],
    bad: ['SELL'],
  },
  {
    id: 'volt-copper-relief',
    headline: '원자재 하락분이 그린 볼트 계약 단가에 얼마나 반영될지 의견이 갈린다',
    ticker: 'VOLT',
    direction: 0.4,
    magnitude: 0.7,
    type: 'macro',
    good: ['HEDGE', 'BUY'],
    bad: ['SELL'],
    sourceGrade: 'B',
    horizon: '중기',
  },
  {
    id: 'bio-safety-rumor',
    headline: '바이오젠 안전성 경고 루머가 돈다',
    ticker: 'BIOZ',
    direction: -1,
    magnitude: 1.3,
    type: 'rumor',
    good: ['SELL', 'HEDGE', 'CASH'],
    bad: ['BUY'],
  },
  {
    id: 'panic-selling',
    headline: '패닉 매도가 전 종목으로 번진다',
    ticker: 'MARKET',
    direction: -1,
    magnitude: 1.65,
    type: 'systemic',
    good: ['HEDGE', 'CASH'],
    bad: ['BUY'],
  },
  {
    id: 'safe-margin-stable',
    headline: '세이프푸드 원가 안정이 확인됐다',
    ticker: 'SAFE',
    direction: 1,
    magnitude: 0.52,
    type: 'bullish',
    good: ['BUY', 'CASH'],
    bad: ['SELL'],
  },
  {
    id: 'grid-union-talks',
    headline: '아이언 그리드 노조 협상이 난항이다',
    ticker: 'GRID',
    direction: -1,
    magnitude: 0.72,
    type: 'bearish',
    good: ['SELL', 'HEDGE'],
    bad: ['BUY'],
  },
  {
    id: 'market-liquidity-drain',
    headline: '단기자금 경색 우려가 번진다',
    ticker: 'MARKET',
    direction: -1,
    magnitude: 1.52,
    type: 'systemic',
    good: ['HEDGE', 'CASH'],
    bad: ['BUY'],
  },
  {
    id: 'ai-private-invest-rumor',
    headline: '노바 AI 비공개 투자 루머가 돈다',
    ticker: 'NOVA',
    direction: 1,
    magnitude: 1.0,
    type: 'rumor',
    good: ['HEDGE', 'CASH'],
    bad: ['BUY'],
  },
  {
    id: 'volt-factory-rumor',
    headline: '그린 볼트 신공장 사진이 퍼진다',
    ticker: 'VOLT',
    direction: 1,
    magnitude: 1.06,
    type: 'rumor',
    good: ['CASH', 'HEDGE'],
    bad: ['BUY'],
  },
  {
    id: 'market-short-cover',
    headline: '공매도 되감기에 지수가 급반등한다',
    ticker: 'MARKET',
    direction: 1,
    magnitude: 1.32,
    type: 'systemic',
    good: ['BUY', 'HEDGE'],
    bad: ['SELL'],
  },
  {
    id: 'bio-partner-deal',
    headline: '바이오젠 공동개발 계약이 발표됐다',
    ticker: 'BIOZ',
    direction: 1,
    magnitude: 1.18,
    type: 'bullish',
    good: ['BUY'],
    bad: ['SELL', 'CASH'],
  },
  {
    id: 'cbnk-hack-fake',
    headline: '크립토뱅크 해킹 루머가 급확산된다',
    ticker: 'CBNK',
    direction: -1,
    magnitude: 1.46,
    type: 'fake',
    fake: true,
    good: ['CASH', 'HEDGE'],
    bad: ['SELL'],
  },
  {
    id: 'safe-quality-fake',
    headline: '세이프푸드 품질 루머 출처가 없다',
    ticker: 'SAFE',
    direction: -1,
    magnitude: 0.9,
    type: 'fake',
    fake: true,
    good: ['CASH', 'HEDGE'],
    bad: ['SELL'],
  },
  {
    id: 'ai-valuation-warning',
    headline: '노바 AI 고평가 경고가 나왔다',
    ticker: 'NOVA',
    direction: -1,
    magnitude: 0.98,
    type: 'bearish',
    good: ['SELL', 'HEDGE'],
    bad: ['BUY'],
  },
  {
    id: 'grid-contract-fake',
    headline: '아이언 그리드 해외계약 글이 돈다',
    ticker: 'GRID',
    direction: 1,
    magnitude: 1.0,
    type: 'fake',
    fake: true,
    good: ['CASH', 'HEDGE'],
    bad: ['BUY'],
  },
  {
    id: 'market-rate-cut-fake',
    headline: '출처 없는 긴급 금리인하 글이 돈다',
    ticker: 'MARKET',
    direction: 1,
    magnitude: 1.22,
    type: 'fake',
    fake: true,
    good: ['CASH', 'HEDGE'],
    bad: ['BUY'],
  },
  {
    id: 'volt-recall-rumor',
    headline: '그린 볼트 대규모 리콜 글이 돈다',
    ticker: 'VOLT',
    direction: -1,
    magnitude: 1.12,
    type: 'rumor',
    good: ['SELL', 'HEDGE', 'CASH'],
    bad: ['BUY'],
  },
  {
    id: 'safe-cash-rotation',
    headline: '고변동 장에서 세이프푸드가 강하다',
    ticker: 'SAFE',
    direction: 1,
    magnitude: 0.66,
    type: 'defensive',
    good: ['BUY', 'CASH'],
    bad: ['SELL'],
  },
  {
    id: 'cbnk-regulator-watch',
    headline: '크립토뱅크 감독 강화 소식이 나왔다',
    ticker: 'CBNK',
    direction: -1,
    magnitude: 1.2,
    type: 'bearish',
    good: ['SELL', 'HEDGE'],
    bad: ['BUY'],
  },
  {
    id: 'market-margin-wave',
    headline: '반대매매 경고가 잇따른다',
    ticker: 'MARKET',
    direction: -1,
    magnitude: 1.68,
    type: 'systemic',
    good: ['HEDGE', 'CASH'],
    bad: ['BUY'],
  },
  {
    id: 'bio-dilution-risk',
    headline: '바이오젠 추가 증자 가능성이 제기됐다',
    ticker: 'BIOZ',
    direction: -1,
    magnitude: 1.06,
    type: 'bearish',
    good: ['SELL', 'HEDGE'],
    bad: ['BUY'],
  },
  {
    id: 'ai-contract-cancel-fake',
    headline: '노바 AI 계약 해지 글이 떠돈다',
    ticker: 'NOVA',
    direction: -1,
    magnitude: 1.14,
    type: 'fake',
    fake: true,
    good: ['CASH', 'HEDGE'],
    bad: ['SELL'],
  },
  {
    id: 'safe-transport-cost',
    headline: '운송비 상승이 세이프푸드를 압박한다',
    ticker: 'SAFE',
    direction: -1,
    magnitude: 0.78,
    type: 'macro',
    good: ['SELL', 'HEDGE'],
    bad: ['BUY'],
  },
  {
    id: 'cbnk-settlement-shock',
    headline: '결제망 장애가 크립토뱅크를 흔든다',
    ticker: 'CBNK',
    direction: -1,
    magnitude: 1.58,
    type: 'systemic',
    good: ['HEDGE', 'CASH'],
    bad: ['BUY'],
  },
  {
    id: 'market-trading-halt-fake',
    headline: '거래정지 루머가 채팅방에 돈다',
    ticker: 'MARKET',
    direction: -1,
    magnitude: 1.34,
    type: 'fake',
    fake: true,
    good: ['CASH', 'HEDGE'],
    bad: ['SELL'],
  },
  {
    id: 'safe-policy-relief',
    headline: '식품 규제 완화 기대가 살아났다',
    ticker: 'SAFE',
    direction: 1,
    magnitude: 0.6,
    type: 'macro',
    good: ['BUY'],
    bad: ['SELL'],
  },
  {
    id: 'cbnk-listing-fake',
    headline: '크립토뱅크 상장 승인 글이 확산된다',
    ticker: 'CBNK',
    direction: 1,
    magnitude: 1.38,
    type: 'fake',
    fake: true,
    good: ['CASH', 'HEDGE'],
    bad: ['BUY'],
  },
];

const TICKER_NEWS_PROFILES = {
  NOVA: {
    company: '노바 AI',
    product: 'AI 클라우드',
    customer: '대형 클라우드 고객',
    cost: 'GPU 임대료',
    region: '북미 데이터센터',
    regulator: '개인정보 규제',
    supplier: '칩 공급사',
    rival: '오픈소스 경쟁사',
  },
  VOLT: {
    company: '그린 볼트',
    product: 'ESS 배터리',
    customer: '전력망 사업자',
    cost: '리튬 조달가',
    region: '유럽 저장장치 시장',
    regulator: '안전 인증',
    supplier: '양극재 공급사',
    rival: '저가 중국 업체',
  },
  BIOZ: {
    company: '바이오젠',
    product: '면역 항암 후보물질',
    customer: '글로벌 제약 파트너',
    cost: '임상 운영비',
    region: '미국 병원 네트워크',
    regulator: '임상 심사',
    supplier: '위탁 생산사',
    rival: '동종 치료제',
  },
  GRID: {
    company: '아이언 그리드',
    product: '전력망 장비',
    customer: '공공 인프라 발주처',
    cost: '철강 단가',
    region: '중동 인프라 시장',
    regulator: '조달 심사',
    supplier: '부품 협력사',
    rival: '해외 EPC 업체',
  },
  SAFE: {
    company: '세이프푸드',
    product: '필수 소비재',
    customer: '대형 유통 채널',
    cost: '물류비',
    region: '동남아 유통망',
    regulator: '식품 표시 규정',
    supplier: '원재료 공급처',
    rival: 'PB 브랜드',
  },
  CBNK: {
    company: '크립토뱅크',
    product: '디지털 자산 결제망',
    customer: '핀테크 제휴사',
    cost: '보안 투자비',
    region: '아시아 결제 시장',
    regulator: '자금세탁방지 심사',
    supplier: '커스터디 파트너',
    rival: '스테이블 결제 앱',
  },
};

const GENERATED_TICKER_TEMPLATES = [
  { id: 'orders-margin', headline: '{company} {product} 주문은 늘었지만 {cost} 부담도 같이 커졌다', direction: 1, magnitude: 0.92, type: 'event', good: ['BUY', 'HEDGE'], bad: ['SELL'], sourceGrade: 'A', horizon: '장중' },
  { id: 'customer-pause', headline: '{customer}가 {company} 계약 검토 기간을 연장했다', direction: -1, magnitude: 0.96, type: 'event', good: ['SELL', 'HEDGE'], bad: ['BUY'], sourceGrade: 'A', horizon: '단기' },
  { id: 'supplier-relief', headline: '{supplier} 납품 지연이 완화됐다는 보고가 나왔다', direction: 1, magnitude: 0.74, type: 'news', good: ['BUY'], bad: ['SELL'], sourceGrade: 'B', horizon: '장중' },
  { id: 'cost-spike', headline: '{cost} 상승이 다음 분기 마진을 압박할 수 있다', direction: -1, magnitude: 0.86, type: 'macro', good: ['SELL', 'HEDGE'], bad: ['BUY'], sourceGrade: 'B', horizon: '중기' },
  { id: 'region-breakout', headline: '{region}에서 {company} 점유율이 예상보다 빠르게 움직인다', direction: 1, magnitude: 0.88, type: 'bullish', good: ['BUY'], bad: ['SELL', 'CASH'], sourceGrade: 'A', horizon: '중기' },
  { id: 'regulator-review', headline: '{regulator} 관련 추가 자료 요청이 접수됐다', direction: -1, magnitude: 1.04, type: 'event', good: ['SELL', 'HEDGE'], bad: ['BUY'], sourceGrade: 'A', horizon: '단기' },
  { id: 'rival-discount', headline: '{rival}가 공격적인 가격 정책을 예고했다', direction: -1, magnitude: 0.78, type: 'bearish', good: ['SELL'], bad: ['BUY'], sourceGrade: 'B', horizon: '중기' },
  { id: 'partner-demo', headline: '{customer} 공동 시연 일정이 앞당겨졌다', direction: 1, magnitude: 0.82, type: 'event', good: ['BUY', 'HEDGE'], bad: ['SELL'], sourceGrade: 'B', horizon: '단기' },
  { id: 'margin-mixed', headline: '{company} 매출 추정은 상향, 이익률 추정은 하향됐다', direction: 1, magnitude: 0.62, type: 'news', good: ['HEDGE', 'BUY'], bad: ['CASH'], sourceGrade: 'B', horizon: '중기' },
  { id: 'volume-unusual', headline: '{company} 장전 거래량이 평소보다 크게 튀었다', direction: 1, magnitude: 1.08, type: 'rumor', good: ['HEDGE', 'CASH'], bad: ['BUY'], sourceGrade: 'C', horizon: '즉시' },
  { id: 'chat-claim-up', headline: '익명 채널에 {company} 대형 발표설이 돌고 있다', direction: 1, magnitude: 1.18, type: 'fake', fake: true, good: ['CASH', 'HEDGE'], bad: ['BUY'], sourceGrade: 'C', horizon: '즉시' },
  { id: 'chat-claim-down', headline: '확인 안 된 계정이 {company} 계약 취소설을 퍼뜨렸다', direction: -1, magnitude: 1.2, type: 'fake', fake: true, good: ['CASH', 'HEDGE'], bad: ['SELL'], sourceGrade: 'C', horizon: '즉시' },
  { id: 'analyst-split', headline: '애널리스트들이 {company} 목표가를 서로 반대로 조정했다', direction: 0.2, magnitude: 0.72, type: 'news', good: ['HEDGE'], bad: ['BUY', 'SELL'], sourceGrade: 'B', horizon: '중기' },
  { id: 'insider-sale', headline: '{company} 임원 지분 변동 공시가 장중 해석을 흔든다', direction: -1, magnitude: 0.8, type: 'event', good: ['SELL', 'HEDGE'], bad: ['BUY'], sourceGrade: 'A', horizon: '장중' },
  { id: 'buyback-window', headline: '{company} 주주환원 검토 문구가 보고서에 추가됐다', direction: 1, magnitude: 0.76, type: 'bullish', good: ['BUY'], bad: ['SELL'], sourceGrade: 'B', horizon: '중기' },
  { id: 'inventory-build', headline: '{product} 재고가 늘며 단기 출하 속도에 의문이 생겼다', direction: -1, magnitude: 0.82, type: 'bearish', good: ['SELL', 'HEDGE'], bad: ['BUY'], sourceGrade: 'B', horizon: '단기' },
  { id: 'policy-tailwind', headline: '정책 초안이 {region}의 {product} 수요를 밀어줄 수 있다', direction: 1, magnitude: 0.9, type: 'macro', good: ['BUY', 'HEDGE'], bad: ['SELL'], sourceGrade: 'B', horizon: '중기' },
  { id: 'policy-headwind', headline: '새 규정 초안이 {company} 비용 구조를 복잡하게 만들 수 있다', direction: -1, magnitude: 0.88, type: 'macro', good: ['SELL', 'HEDGE'], bad: ['BUY'], sourceGrade: 'B', horizon: '중기' },
  { id: 'customer-concentration', headline: '{customer} 의존도가 다시 높아졌다는 분석이 나왔다', direction: -1, magnitude: 0.68, type: 'news', good: ['HEDGE', 'CASH'], bad: ['BUY'], sourceGrade: 'B', horizon: '중기' },
  { id: 'new-client', headline: '{company}가 신규 고객군을 열었다는 현장 메모가 나왔다', direction: 1, magnitude: 0.84, type: 'news', good: ['BUY'], bad: ['SELL'], sourceGrade: 'B', horizon: '장중' },
  { id: 'audit-delay', headline: '{company} 분기 자료 제출 시간이 늦어졌다', direction: -1, magnitude: 0.74, type: 'rumor', good: ['HEDGE', 'CASH'], bad: ['BUY', 'SELL'], sourceGrade: 'C', horizon: '즉시' },
  { id: 'short-interest', headline: '{company} 공매도 잔고가 높아진 상태에서 거래가 몰린다', direction: 1, magnitude: 1.1, type: 'news', good: ['HEDGE', 'BUY'], bad: ['SELL'], sourceGrade: 'B', horizon: '즉시' },
  { id: 'debt-rollover', headline: '{company} 차환 비용이 시장 예상보다 높게 책정됐다', direction: -1, magnitude: 0.92, type: 'macro', good: ['SELL', 'HEDGE'], bad: ['BUY'], sourceGrade: 'A', horizon: '중기' },
  { id: 'cash-buffer', headline: '{company} 현금성 자산이 방어 여력을 키웠다는 평가가 나왔다', direction: 1, magnitude: 0.58, type: 'defensive', good: ['BUY', 'CASH'], bad: ['SELL'], sourceGrade: 'A', horizon: '중기' },
  { id: 'execution-risk', headline: '{product} 확장 일정은 유지됐지만 실행 리스크가 남았다', direction: 0.3, magnitude: 0.7, type: 'event', good: ['HEDGE'], bad: ['BUY', 'SELL'], sourceGrade: 'A', horizon: '중기' },
  { id: 'quality-issue', headline: '{supplier} 품질 이슈가 {company} 납기에 영향을 줄 수 있다', direction: -1, magnitude: 0.94, type: 'bearish', good: ['SELL', 'HEDGE'], bad: ['BUY'], sourceGrade: 'B', horizon: '단기' },
  { id: 'upgrade-conditional', headline: '{company} 투자의견은 상향됐지만 조건부 문구가 붙었다', direction: 1, magnitude: 0.72, type: 'news', good: ['HEDGE', 'BUY'], bad: ['CASH'], sourceGrade: 'B', horizon: '장중' },
  { id: 'downgrade-valuation', headline: '{company} 성장성은 유지됐지만 밸류에이션 부담이 지적됐다', direction: -1, magnitude: 0.78, type: 'news', good: ['HEDGE', 'SELL'], bad: ['BUY'], sourceGrade: 'B', horizon: '장중' },
  { id: 'liquidity-squeeze', headline: '시장 유동성 악화가 {company} 변동성을 키우고 있다', direction: -1, magnitude: 1.12, type: 'systemic', good: ['HEDGE', 'CASH'], bad: ['BUY'], sourceGrade: 'B', horizon: '즉시' },
  { id: 'relief-rally', headline: '과매도 반등이 {company}로 번지는 중이다', direction: 1, magnitude: 0.96, type: 'systemic', good: ['BUY', 'HEDGE'], bad: ['SELL'], sourceGrade: 'B', horizon: '즉시' },
  { id: 'data-leak', headline: '{company} 미확인 실적표 이미지가 커뮤니티에 올라왔다', direction: 1, magnitude: 1.26, type: 'fake', fake: true, good: ['CASH', 'HEDGE'], bad: ['BUY'], sourceGrade: 'C', horizon: '즉시' },
  { id: 'negative-leak', headline: '{company} 손상된 내부 문건 캡처가 확산된다', direction: -1, magnitude: 1.28, type: 'fake', fake: true, good: ['CASH', 'HEDGE'], bad: ['SELL'], sourceGrade: 'C', horizon: '즉시' },
  { id: 'slow-burn', headline: '{region} 수요 지표가 천천히 {company}에 유리하게 기울고 있다', direction: 1, magnitude: 0.66, type: 'macro', good: ['BUY', 'CASH'], bad: ['SELL'], sourceGrade: 'B', horizon: '중기' },
  { id: 'overreaction', headline: '{company} 낙폭이 뉴스 강도보다 과하다는 반론이 나온다', direction: 1, magnitude: 0.86, type: 'news', good: ['BUY', 'HEDGE'], bad: ['SELL'], sourceGrade: 'B', horizon: '장중' },
  { id: 'crowded-long', headline: '{company} 매수 포지션이 과밀하다는 경고가 나왔다', direction: -1, magnitude: 0.9, type: 'news', good: ['HEDGE', 'SELL'], bad: ['BUY'], sourceGrade: 'B', horizon: '장중' },
  { id: 'board-change', headline: '{company} 이사회 변화가 전략 전환 가능성을 키운다', direction: 0.4, magnitude: 0.8, type: 'event', good: ['HEDGE'], bad: ['BUY', 'SELL'], sourceGrade: 'A', horizon: '중기' },
];

const GENERATED_MARKET_TEMPLATES = [
  { id: 'breadth-thin', headline: '상승 종목 수는 줄고 지수만 버티는 장세가 이어진다', direction: -1, magnitude: 0.88, type: 'macro', good: ['HEDGE', 'CASH'], bad: ['BUY'], sourceGrade: 'B', horizon: '장중' },
  { id: 'liquidity-bid', headline: '장중 유동성 공급 기대가 시장 전반을 지지한다', direction: 1, magnitude: 0.94, type: 'macro', good: ['BUY', 'HEDGE'], bad: ['SELL'], sourceGrade: 'B', horizon: '즉시' },
  { id: 'fund-flow-out', headline: '주식형 펀드 환매 속도가 예상보다 빨라졌다', direction: -1, magnitude: 0.98, type: 'macro', good: ['SELL', 'HEDGE'], bad: ['BUY'], sourceGrade: 'B', horizon: '중기' },
  { id: 'fund-flow-in', headline: '기관 저가 매수 주문이 장중 여러 업종으로 퍼진다', direction: 1, magnitude: 0.92, type: 'news', good: ['BUY'], bad: ['SELL'], sourceGrade: 'B', horizon: '장중' },
  { id: 'margin-warning', headline: '증권사 반대매매 경고 문자가 증가했다', direction: -1, magnitude: 1.18, type: 'systemic', good: ['HEDGE', 'CASH'], bad: ['BUY'], sourceGrade: 'A', horizon: '즉시' },
  { id: 'policy-briefing', headline: '장 마감 전 정책 브리핑 가능성이 거론된다', direction: 0.6, magnitude: 0.9, type: 'rumor', good: ['HEDGE', 'CASH'], bad: ['BUY', 'SELL'], sourceGrade: 'C', horizon: '즉시' },
  { id: 'rate-sensitivity', headline: '금리 선물 움직임이 성장주와 방어주를 동시에 흔든다', direction: -1, magnitude: 1.04, type: 'macro', good: ['HEDGE'], bad: ['BUY'], sourceGrade: 'B', horizon: '장중' },
  { id: 'vol-compression', headline: '옵션 변동성 매도세가 지수 하단을 좁히고 있다', direction: 1, magnitude: 0.72, type: 'news', good: ['BUY', 'CASH'], bad: ['SELL'], sourceGrade: 'B', horizon: '장중' },
  { id: 'vol-breakout', headline: '변동성 매수 주문이 갑자기 늘며 방어 포지션이 몰린다', direction: -1, magnitude: 1.22, type: 'systemic', good: ['HEDGE', 'CASH'], bad: ['BUY'], sourceGrade: 'B', horizon: '즉시' },
  { id: 'index-rebalance', headline: '지수 리밸런싱 수급이 일부 대형주 가격을 왜곡한다', direction: 0.2, magnitude: 0.78, type: 'event', good: ['HEDGE'], bad: ['BUY', 'SELL'], sourceGrade: 'A', horizon: '장중' },
  { id: 'credit-spread', headline: '회사채 스프레드가 넓어지며 위험자산 선호가 흔들린다', direction: -1, magnitude: 1.08, type: 'macro', good: ['SELL', 'HEDGE'], bad: ['BUY'], sourceGrade: 'B', horizon: '중기' },
  { id: 'credit-relief', headline: '단기자금 금리가 안정되며 위험자산 매수세가 돌아온다', direction: 1, magnitude: 0.96, type: 'macro', good: ['BUY'], bad: ['SELL'], sourceGrade: 'B', horizon: '중기' },
  { id: 'foreign-flow', headline: '외국인 선물 포지션이 현물 시장보다 먼저 방향을 바꿨다', direction: 1, magnitude: 0.86, type: 'news', good: ['BUY', 'HEDGE'], bad: ['SELL'], sourceGrade: 'B', horizon: '장중' },
  { id: 'foreign-hedge', headline: '외국인 현물 매도와 선물 매수가 엇갈린 신호를 만든다', direction: 0.1, magnitude: 0.78, type: 'news', good: ['HEDGE'], bad: ['BUY', 'SELL'], sourceGrade: 'B', horizon: '장중' },
  { id: 'circuit-rumor', headline: '거래 제한 조치 캡처가 메신저방에 빠르게 퍼진다', direction: -1, magnitude: 1.36, type: 'fake', fake: true, good: ['CASH', 'HEDGE'], bad: ['SELL'], sourceGrade: 'C', horizon: '즉시' },
  { id: 'rescue-fake', headline: '확인 안 된 시장 안정 패키지 문건이 공유된다', direction: 1, magnitude: 1.28, type: 'fake', fake: true, good: ['CASH', 'HEDGE'], bad: ['BUY'], sourceGrade: 'C', horizon: '즉시' },
  { id: 'defensive-rotation', headline: '방어주 쏠림이 강해지며 성장주 체력이 시험받는다', direction: -1, magnitude: 0.86, type: 'defensive', good: ['HEDGE', 'CASH'], bad: ['BUY'], sourceGrade: 'B', horizon: '장중' },
  { id: 'cyclical-rotation', headline: '경기민감 업종으로 순환매가 번지며 지수 저점이 높아진다', direction: 1, magnitude: 0.82, type: 'macro', good: ['BUY'], bad: ['SELL'], sourceGrade: 'B', horizon: '장중' },
  { id: 'closing-imbalance', headline: '마감 동시호가 매수 불균형 예고가 일부 채널에 잡힌다', direction: 1, magnitude: 1.02, type: 'event', good: ['BUY', 'HEDGE'], bad: ['SELL'], sourceGrade: 'B', horizon: '즉시' },
  { id: 'closing-sell-imbalance', headline: '마감 동시호가 매도 불균형 추정치가 커졌다', direction: -1, magnitude: 1.04, type: 'event', good: ['SELL', 'HEDGE'], bad: ['BUY'], sourceGrade: 'B', horizon: '즉시' },
];

function fillHeadline(template, profile) {
  return template.replace(/\{(\w+)\}/g, (_match, key) => profile[key] || key);
}

function buildGeneratedTickerEvents() {
  const tickers = MARKET_CONFIG.tickers.length ? MARKET_CONFIG.tickers : Object.keys(TICKER_NEWS_PROFILES).map((id) => ({ id }));
  return tickers.flatMap((ticker) => {
    const profile = TICKER_NEWS_PROFILES[ticker.id];
    if (!profile) return [];
    return GENERATED_TICKER_TEMPLATES.map((template) => ({
      id: `${ticker.id.toLowerCase()}-${template.id}`,
      headline: fillHeadline(template.headline, profile),
      ticker: ticker.id,
      direction: template.direction,
      magnitude: template.magnitude,
      type: template.type,
      fake: template.fake === true,
      good: [...template.good],
      bad: [...template.bad],
      sourceGrade: template.sourceGrade,
      horizon: template.horizon,
    }));
  });
}

function dedupeEvents(events) {
  const seen = new Set();
  return events.filter((event) => {
    const key = event.id || `${event.ticker}:${event.headline}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const MARKET_EVENTS = dedupeEvents([
  ...HANDCRAFTED_MARKET_EVENTS,
  ...buildGeneratedTickerEvents(),
  ...GENERATED_MARKET_TEMPLATES.map((template) => ({
    ...template,
    ticker: 'MARKET',
  })),
]);
