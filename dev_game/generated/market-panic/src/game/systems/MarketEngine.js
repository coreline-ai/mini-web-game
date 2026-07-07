import { MARKET_CONFIG, MARKET_EVENTS } from '../config/marketConfig.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function tickerMap() {
  const out = new Map();
  for (const ticker of MARKET_CONFIG.tickers) out.set(ticker.id, ticker);
  return out;
}

export default class MarketEngine {
  constructor() {
    this.tickersById = tickerMap();
    this.stageIndex = 0;
    this.portfolio = MARKET_CONFIG.initialPortfolio;
    this.risk = MARKET_CONFIG.initialRisk;
    this.confidence = MARKET_CONFIG.initialConfidence;
    this.score = 0;
    this.elapsedMs = 0;
    this.eventTimerMs = 0;
    this.eventSerial = 0;
    this.goodHedges = 0;
    this.fakeHits = 0;
    this.wrongStreak = 0;
    this.lastWrongTicker = '';
    this.terminal = null;
    this.currentEvent = null;
    this.currentEventKey = '';
    this.decisionMade = false;
    this.lastDecision = null;
    this.selectedTickerId = this.stage.activeTickers[0] || MARKET_CONFIG.tickers[0]?.id || 'NOVA';
    this.prices = {};
    this.trends = {};
    for (const ticker of MARKET_CONFIG.tickers) {
      this.prices[ticker.id] = 100;
      this.trends[ticker.id] = 0;
    }
    this.nextEvent();
  }

  get stage() {
    return MARKET_CONFIG.stages[this.stageIndex] || MARKET_CONFIG.stages[0] || {
      name: 'MARKET',
      durationSeconds: 60,
      activeTickers: MARKET_CONFIG.tickers.map((t) => t.id),
      returnTarget: 10,
      portfolioFloor: 60,
      riskCeiling: 80,
      confidenceFloor: 20,
      eventIntervalMs: 4000,
      volatility: 1,
    };
  }

  get timeLeft() {
    return Math.max(0, this.stage.durationSeconds - this.elapsedMs / 1000);
  }

  get returnPct() {
    return this.portfolio - 100;
  }

  get activeTickers() {
    return this.stage.activeTickers.map((id) => this.tickersById.get(id)).filter(Boolean);
  }

  get panicLevel() {
    const stagePressure = this.stageIndex * 12;
    const timePressure = (1 - this.timeLeft / Math.max(1, this.stage.durationSeconds)) * 30;
    return clamp(stagePressure + timePressure + this.risk * 0.28, 0, 100);
  }

  setSelectedTicker(id) {
    if (this.decisionMade) return false;
    if (this.stage.activeTickers.includes(id)) this.selectedTickerId = id;
    return this.selectedTickerId === id;
  }

  nextEvent() {
    const active = new Set([...this.stage.activeTickers, 'MARKET']);
    const stageFakeBudget = this.stage.fakeSignals || 0;
    const candidates = MARKET_EVENTS.filter((event) => {
      if (!active.has(event.ticker)) return false;
      if (event.fake && stageFakeBudget <= 0) return false;
      if (this.stageIndex < 2 && event.type === 'systemic') return false;
      return true;
    });
    this.currentEvent = candidates[(this.eventSerial * 14 + this.stageIndex * 17) % candidates.length] || MARKET_EVENTS[0];
    this.eventSerial += 1;
    this.currentEventKey = `${this.stageIndex}:${this.eventSerial}:${this.currentEvent?.id || 'event'}`;
    this.decisionMade = false;
    this.lastDecision = null;
    this.eventTimerMs = 0;
    this.applyEventPulse(this.currentEvent);
  }

  applyEventPulse(event) {
    if (!event) return;
    const targets = event.ticker === 'MARKET' ? this.stage.activeTickers : [event.ticker];
    for (const id of targets) {
      const beta = this.tickersById.get(id)?.beta || 1;
      this.trends[id] = clamp((this.trends[id] || 0) + event.direction * event.magnitude * beta * 1.8, -7, 7);
    }
  }

  update(deltaMs) {
    if (this.terminal) return null;
    this.elapsedMs += deltaMs;
    this.eventTimerMs += deltaMs;
    const interval = this.currentEventInterval();
    const eventChanged = this.eventTimerMs >= interval;
    if (eventChanged) this.nextEvent();

    const dt = deltaMs / 1000;
    const vol = this.stage.volatility || 1;
    for (const id of this.stage.activeTickers) {
      const trend = this.trends[id] || 0;
      const beta = this.tickersById.get(id)?.beta || 1;
      const wave = Math.sin((this.elapsedMs * 0.0017) + id.charCodeAt(0)) * vol * beta * 0.24;
      this.prices[id] = clamp(this.prices[id] + (trend * 0.08 + wave) * dt * 6, 42, 180);
      this.trends[id] = trend * 0.986;
    }

    this.risk = clamp(this.risk + (0.55 + this.stageIndex * 0.22 + vol * 0.18) * dt, 0, 100);
    this.confidence = clamp(this.confidence - (0.15 + this.stageIndex * 0.04) * dt, 0, 100);
    this.score = Math.max(0, Math.round(this.portfolio * 12 + this.returnPct * 80 + (100 - this.risk) * 4 + this.confidence * 3));

    this.checkFailure();
    if (!this.terminal && this.timeLeft <= 0) this.resolveStageEnd();
    return { eventChanged };
  }

  currentEventInterval() {
    const base = this.stage.eventIntervalMs || 4000;
    const finalRush = this.stage.finalRushSeconds && this.timeLeft <= this.stage.finalRushSeconds;
    const panicFactor = 1 - this.panicLevel * 0.0025;
    return Math.max(1700, base * (finalRush ? 0.62 : 1) * panicFactor);
  }

  applyAction(action) {
    if (this.terminal || !MARKET_CONFIG.actions.includes(action)) return null;
    if (this.decisionMade) {
      return {
        blocked: true,
        reason: 'already-decided',
        label: '결정 완료',
        action,
        ticker: this.selectedTickerId,
        portfolioDelta: 0,
        riskDelta: 0,
        confidenceDelta: 0,
      };
    }
    const event = this.currentEvent;
    const selected = this.selectedTickerId;
    const actsOnMarket = event?.ticker === 'MARKET';
    const relevant = actsOnMarket || event?.ticker === selected;
    const good = relevant && event.good?.includes(action);
    const bad = relevant && event.bad?.includes(action);
    const beta = this.tickersById.get(selected)?.beta || 1;
    const magnitude = (event?.magnitude || 1) * (this.stage.volatility || 1);
    let portfolioDelta = 0;
    let riskDelta = 0;
    let confidenceDelta = 0;
    let label = '중립';

    if (action === 'BUY') {
      portfolioDelta = (good ? 4.5 : bad ? -5.2 : 1.0) * magnitude * beta;
      riskDelta = (good ? 4 : bad ? 12 : 6) * magnitude;
      confidenceDelta = good ? 3.5 : bad ? -6 : 0.5;
    } else if (action === 'SELL') {
      portfolioDelta = (good ? 2.6 : bad ? -2.8 : 0.3) * magnitude;
      riskDelta = good ? -8 * magnitude : bad ? 4 * magnitude : -3;
      confidenceDelta = good ? 2.8 : bad ? -3.5 : 0.2;
    } else if (action === 'HEDGE') {
      portfolioDelta = (good ? 1.7 : -1.1) * magnitude;
      riskDelta = good ? -13 * magnitude : -5;
      confidenceDelta = good ? 4.2 : -0.8;
      if (good) this.goodHedges += 1;
    } else if (action === 'CASH') {
      portfolioDelta = event?.fake || event?.type === 'systemic' ? 0.8 : -0.7;
      riskDelta = event?.fake ? -9 : -4.5;
      confidenceDelta = event?.fake ? 5.5 : 1.2;
    }

    if (event?.fake && bad) {
      this.fakeHits += 1;
      confidenceDelta -= 6;
      riskDelta += 7;
    }

    if (bad) {
      this.wrongStreak = this.lastWrongTicker === selected ? this.wrongStreak + 1 : 1;
      this.lastWrongTicker = selected;
      label = event?.fake ? '루머에 흔들림' : '판단 실패';
    } else if (good) {
      this.wrongStreak = 0;
      this.lastWrongTicker = '';
      label = action === 'HEDGE' ? '리스크 방어' : action === 'CASH' ? '침착한 관망' : '판단 성공';
    } else {
      label = relevant ? '효과 제한' : '종목 불일치';
      confidenceDelta -= relevant ? 0 : 2.2;
      riskDelta += relevant ? 0 : 2.5;
    }

    this.portfolio = round1(clamp(this.portfolio + portfolioDelta, 0, 240));
    this.risk = round1(clamp(this.risk + riskDelta, 0, 100));
    this.confidence = round1(clamp(this.confidence + confidenceDelta, 0, 100));

    const priceKickTargets = event?.ticker === 'MARKET' ? this.stage.activeTickers : [selected];
    for (const id of priceKickTargets) {
      this.trends[id] = clamp((this.trends[id] || 0) + portfolioDelta * 0.24, -7, 7);
    }

    this.checkFailure();
    this.decisionMade = true;
    this.lastDecision = {
      label,
      good,
      bad,
      action,
      ticker: selected,
      portfolioDelta: round1(portfolioDelta),
      riskDelta: round1(riskDelta),
      confidenceDelta: round1(confidenceDelta),
      eventKey: this.currentEventKey,
    };
    return this.lastDecision;
  }

  checkFailure() {
    if (this.terminal) return;
    if (this.risk >= MARKET_CONFIG.riskFailure) this.terminal = { type: 'fail', title: '서킷 브레이커', reason: '위험도가 100에 도달했습니다' };
    else if (this.confidence <= MARKET_CONFIG.confidenceFailure) this.terminal = { type: 'fail', title: '투자심리 붕괴', reason: '신뢰도가 바닥났습니다' };
    else if (this.portfolio < (this.stage.portfolioFloor || 60)) this.terminal = { type: 'fail', title: '마진콜', reason: '자산이 생존 기준 아래로 떨어졌습니다' };
    else if (this.stageIndex === 1 && this.wrongStreak >= 3) this.terminal = { type: 'fail', title: '연속 오판', reason: '같은 종목에서 3번 연속 오판했습니다' };
    else if (this.stage.fakeSignalLimit && this.fakeHits > this.stage.fakeSignalLimit) this.terminal = { type: 'fail', title: '루머 함정', reason: '가짜뉴스에 너무 많이 당했습니다' };
  }

  resolveStageEnd() {
    const stage = this.stage;
    const returnOk = this.returnPct >= (stage.returnTarget || 0) || (stage.portfolioWin && this.portfolio >= stage.portfolioWin);
    const riskOk = this.risk < (stage.riskCeiling ?? 100);
    const confidenceOk = this.confidence >= (stage.confidenceFloor ?? 0);
    const hedgeOk = !stage.requiresGoodHedge || this.goodHedges > 0;
    if (!returnOk || !riskOk || !confidenceOk || !hedgeOk) {
      this.terminal = {
        type: 'fail',
        title: '목표 미달',
        reason: !returnOk ? '수익 목표를 달성하지 못했습니다' : !riskOk ? '마감 시점 위험도가 너무 높습니다' : !hedgeOk ? '필수 헤지 성공이 없습니다' : '신뢰도가 기준보다 낮습니다',
      };
      return;
    }

    if (this.stageIndex >= MARKET_CONFIG.stages.length - 1) {
      const master = this.returnPct >= (stage.masterTraderReturn || 999) && this.risk <= (stage.masterTraderRisk || -1);
      this.terminal = { type: 'win', title: master ? '마스터 트레이더' : '시장 생존', reason: '마감 종까지 버텼습니다' };
      return;
    }

    this.stageIndex += 1;
    this.elapsedMs = 0;
    this.eventTimerMs = 0;
    this.goodHedges = 0;
    this.wrongStreak = 0;
    this.lastWrongTicker = '';
    this.risk = round1(clamp(this.risk - 12, 0, 100));
    this.confidence = round1(clamp(this.confidence + 7, 0, 100));
    this.selectedTickerId = this.stage.activeTickers[0] || this.selectedTickerId;
    this.nextEvent();
  }

  snapshot() {
    return {
      stageIndex: this.stageIndex,
      stageName: this.stage.name,
      timeLeft: round1(this.timeLeft),
      portfolio: round1(this.portfolio),
      returnPct: round1(this.returnPct),
      risk: round1(this.risk),
      confidence: round1(this.confidence),
      panicLevel: round1(this.panicLevel),
      score: this.score,
      selectedTickerId: this.selectedTickerId,
      currentEventKey: this.currentEventKey,
      decisionMade: this.decisionMade,
      lastDecision: this.lastDecision,
      tickers: this.activeTickers.map((ticker) => ({
        ...ticker,
        price: round1(this.prices[ticker.id] || 100),
        trend: round1(this.trends[ticker.id] || 0),
      })),
      event: this.currentEvent,
      terminal: this.terminal,
      fakeHits: this.fakeHits,
      goodHedges: this.goodHedges,
    };
  }
}
