import {
  ACTION_META,
  actionHint,
  signalLabel,
  stageLabel,
  tickerLabel,
} from '../config/marketConfig.js';
import { SPEC } from '../data/spec.js';

function goalText(stage) {
  const returnTarget = Number(stage?.returnTarget || 0);
  const portfolioWin = stage?.portfolioWin ? ` 또는 자산 ${stage.portfolioWin}` : '';
  return `목표 +${returnTarget}%${portfolioWin}  위험<${stage?.riskCeiling ?? 100}  신뢰>=${stage?.confidenceFloor ?? 0}`;
}

function signed(value) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}`;
}

function trendClass(trend) {
  if (trend > 0.35) return 'is-up';
  if (trend < -0.35) return 'is-down';
  return 'is-flat';
}

function sparkPoints(trend, seed = 0) {
  const amp = Math.min(18, 6 + Math.abs(trend) * 2.1);
  const slope = Math.max(-14, Math.min(14, trend * -1.8));
  const points = [];
  for (let i = 0; i <= 8; i += 1) {
    const x = 4 + i * 10;
    const y = 26 + Math.sin(i * 0.95 + seed) * amp * 0.45 + slope * (1 - i / 8);
    points.push(`${x.toFixed(1)},${Math.max(5, Math.min(45, y)).toFixed(1)}`);
  }
  return points.join(' ');
}

export default class DomGameUI {
  constructor(scene, handlers = {}) {
    this.scene = scene;
    this.handlers = handlers;
    this.visible = true;
    this.lastTickerIds = '';
    this.cardEls = new Map();
    this.actionButtons = [];
    this.feedback = {
      text: '뉴스당 1회 결정\n종목을 고르고 행동을 선택하세요',
      tone: 'neutral',
    };

    this.root = document.createElement('div');
    this.root.className = 'mp-game-ui';
    this.root.dataset.marketPanicDomUi = 'true';
    this.root.innerHTML = `
      <section class="mp-panel mp-hud" data-layout-id="hud-panel">
        <div class="mp-hud-stage" data-ref="stage"></div>
        <div class="mp-hud-time" data-ref="time"></div>
        <button class="mp-pause-button" type="button" data-layout-id="pause" data-ref="pause" aria-label="일시정지">Ⅱ</button>
        <div class="mp-hud-portfolio" data-ref="portfolio"></div>
        <div class="mp-hud-return" data-ref="return"></div>
        <div class="mp-meter mp-meter-risk">
          <span>위험</span>
          <i><b data-ref="riskFill"></b></i>
        </div>
        <div class="mp-meter mp-meter-confidence">
          <span>신뢰</span>
          <i><b data-ref="confidenceFill"></b></i>
        </div>
      </section>
      <section class="mp-panel mp-news" data-layout-id="news-panel">
        <div class="mp-news-kicker" data-ref="newsKicker"></div>
        <div class="mp-news-headline" data-ref="newsHeadline"></div>
        <div class="mp-news-meta" data-ref="newsMeta"></div>
      </section>
      <section class="mp-panel mp-goal" data-layout-id="goal-panel">
        <div class="mp-goal-main" data-ref="goal"></div>
        <div class="mp-goal-hint" data-ref="hint"></div>
      </section>
      <section class="mp-stock-list" data-ref="stocks"></section>
      <section class="mp-feedback is-neutral" data-ref="feedback"></section>
      <section class="mp-actions" data-ref="actions"></section>
    `;
    document.body.appendChild(this.root);

    this.refs = Object.fromEntries(
      [...this.root.querySelectorAll('[data-ref]')].map((el) => [el.dataset.ref, el]),
    );
    this.refs.pause.addEventListener('click', (event) => {
      event.preventDefault();
      this.handlers.onPause?.();
    });

    this.createActionButtons();
    this.syncBounds();
    this.scene.scale.on('resize', this.syncBounds, this);
    this.scene.events.once('shutdown', () => this.destroy());
  }

  createActionButtons() {
    const symbol = { BUY: '▲', SELL: '▼', HEDGE: '◆', CASH: '●' };
    this.refs.actions.innerHTML = '';
    this.actionButtons = [];
    for (const action of ['BUY', 'SELL', 'HEDGE', 'CASH']) {
      const meta = ACTION_META[action];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `mp-action mp-action-${action.toLowerCase()}`;
      button.dataset.action = action;
      button.dataset.layoutId = `action-${action.toLowerCase()}`;
      button.innerHTML = `<strong>${symbol[action]} ${meta.label}</strong><span>${meta.short}</span>`;
      button.addEventListener('click', (event) => {
        event.preventDefault();
        if (button.disabled) return;
        this.handlers.onAction?.(action);
      });
      this.refs.actions.appendChild(button);
      this.actionButtons.push(button);
    }
  }

  syncBounds() {
    if (!this.root?.isConnected) return;
    const bounds = this.scene.scale.canvasBounds;
    const gameSize = this.scene.scale.gameSize;
    if (!bounds || !gameSize) return;
    const sx = bounds.width / SPEC.canvas.width;
    const sy = bounds.height / SPEC.canvas.height;
    this.root.style.left = '0px';
    this.root.style.top = '0px';
    this.root.style.width = `${SPEC.canvas.width}px`;
    this.root.style.height = `${SPEC.canvas.height}px`;
    this.root.style.transform = `translate(${bounds.left}px, ${bounds.top}px) scale(${sx}, ${sy})`;
    this.root.style.display = this.visible ? 'block' : 'none';
    this.publishLayout();
  }

  setVisible(value) {
    this.visible = Boolean(value);
    if (this.root) this.root.style.display = this.visible ? 'block' : 'none';
    this.publishLayout();
  }

  setStageMessage(text) {
    this.feedback = { text, tone: 'info' };
    this.updateFeedback();
  }

  setDecisionPrompt() {
    this.feedback = {
      text: '새 뉴스 도착\n뉴스를 해석해 한 번만 결정하세요',
      tone: 'info',
    };
    this.updateFeedback();
  }

  setDecisionLockedMessage() {
    this.feedback = {
      text: '이미 결정했습니다\n다음 뉴스까지 기다리세요',
      tone: 'info',
    };
    this.updateFeedback();
  }

  setActionResult(result) {
    const meta = ACTION_META[result.action];
    const text = `${result.label}: ${tickerLabel(result.ticker)} ${meta?.label || result.action}
자산 ${signed(result.portfolioDelta)}  위험 ${signed(result.riskDelta)}  신뢰 ${signed(result.confidenceDelta)}`;
    this.feedback = { text, tone: result.good ? 'good' : result.bad ? 'bad' : 'neutral' };
    this.updateFeedback();
  }

  update(snapshot, stage, eventLeft) {
    if (!this.root?.isConnected) return;
    this.syncBounds();
    this.refs.stage.textContent = stageLabel(snapshot.stageName);
    this.refs.time.textContent = `${snapshot.timeLeft.toFixed(1)}초`;
    this.refs.portfolio.textContent = `자산 ${snapshot.portfolio.toFixed(1)}`;
    this.refs.return.textContent = `수익 ${snapshot.returnPct >= 0 ? '+' : ''}${snapshot.returnPct.toFixed(1)}%`;
    this.refs.return.classList.toggle('is-down', snapshot.returnPct < 0);
    this.refs.riskFill.style.width = `${Math.max(2, snapshot.risk)}%`;
    this.refs.confidenceFill.style.width = `${Math.max(2, snapshot.confidence)}%`;

    const event = snapshot.event;
    this.refs.newsKicker.textContent = `${signalLabel(event)} · ${tickerLabel(event?.ticker || 'MARKET')}`;
    this.refs.newsHeadline.textContent = event?.headline || '시장이 개장했습니다.';
    this.refs.newsMeta.textContent = `공포 ${snapshot.panicLevel.toFixed(1)}  루머 실수 ${snapshot.fakeHits}`;
    this.refs.goal.textContent = goalText(stage);
    this.refs.hint.textContent = snapshot.decisionMade
      ? `결정 완료 · 다음 뉴스 ${eventLeft.toFixed(1)}초`
      : `뉴스당 1회 · ${actionHint(event)} · 다음 ${eventLeft.toFixed(1)}초`;

    this.updateCards(snapshot);
    this.setActionLocked(snapshot.decisionMade);
    this.updateFeedback();
    this.publishLayout();
  }

  setActionLocked(locked) {
    for (const button of this.actionButtons) {
      button.disabled = Boolean(locked);
      button.classList.toggle('is-locked', Boolean(locked));
    }
  }

  updateCards(snapshot) {
    const ids = snapshot.tickers.map((ticker) => ticker.id).join(',');
    if (ids !== this.lastTickerIds) {
      this.lastTickerIds = ids;
      this.cardEls.clear();
      this.refs.stocks.innerHTML = '';
      snapshot.tickers.forEach((ticker) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'mp-stock-card';
        button.dataset.ticker = ticker.id;
        button.dataset.layoutId = `stock-${ticker.id}`;
        button.innerHTML = `
          <span class="mp-stock-id"></span>
          <span class="mp-stock-name"></span>
          <span class="mp-stock-status"></span>
          <span class="mp-stock-price"></span>
          <svg class="mp-stock-spark" viewBox="0 0 88 50" aria-hidden="true"><polyline points=""></polyline></svg>
          <span class="mp-stock-trend"></span>
        `;
        button.addEventListener('click', (event) => {
          event.preventDefault();
          this.handlers.onSelectTicker?.(ticker.id);
        });
        this.refs.stocks.appendChild(button);
        this.cardEls.set(ticker.id, {
          root: button,
          id: button.querySelector('.mp-stock-id'),
          name: button.querySelector('.mp-stock-name'),
          status: button.querySelector('.mp-stock-status'),
          price: button.querySelector('.mp-stock-price'),
          spark: button.querySelector('polyline'),
          trend: button.querySelector('.mp-stock-trend'),
        });
      });
    }

    const target = snapshot.event?.ticker;
    snapshot.tickers.forEach((ticker, index) => {
      const els = this.cardEls.get(ticker.id);
      if (!els) return;
      const selected = snapshot.selectedTickerId === ticker.id;
      const newsTarget = target === 'MARKET' || target === ticker.id;
      els.root.classList.toggle('is-selected', selected);
      els.root.classList.toggle('is-news-target', newsTarget);
      els.id.textContent = ticker.id;
      els.name.textContent = tickerLabel(ticker);
      els.status.textContent = selected && newsTarget ? '뉴스·선택' : selected ? '선택됨' : newsTarget ? '뉴스' : '';
      els.price.textContent = ticker.price.toFixed(1);
      els.trend.textContent = `${ticker.trend >= 0 ? '+' : ''}${ticker.trend.toFixed(1)}`;
      els.root.classList.remove('is-up', 'is-down', 'is-flat');
      els.root.classList.add(trendClass(ticker.trend));
      els.spark.setAttribute('points', sparkPoints(ticker.trend, index * 0.7));
    });
  }

  updateFeedback() {
    this.refs.feedback.textContent = this.feedback.text;
    this.refs.feedback.className = `mp-feedback is-${this.feedback.tone}`;
  }

  publishLayout() {
    if (typeof window === 'undefined' || !this.root?.isConnected || !this.visible) return;
    const elements = [...this.root.querySelectorAll('[data-layout-id]')];
    const items = elements.map((el) => {
      const rect = el.getBoundingClientRect();
      const allowOverlapWith = elements
        .filter((other) => other !== el && (el.contains(other) || other.contains(el)))
        .map((other) => other.dataset.layoutId);
      return {
        id: el.dataset.layoutId,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        visible: rect.width > 0 && rect.height > 0,
        allowOverlapWith,
      };
    });
    window.__GAME_LAYOUT_BOUNDS__ = { scene: 'Game', items };
  }

  destroy() {
    this.scene?.scale?.off('resize', this.syncBounds, this);
    this.root?.remove();
    this.root = null;
  }
}
