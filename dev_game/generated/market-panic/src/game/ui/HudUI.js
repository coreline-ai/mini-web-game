import { makeTextButton } from './MobileButton.js';
import { HEAVY_FONT, stageLabel } from '../config/marketConfig.js';
import { makeSolidButtonTexture } from './ButtonSurface.js';
import { sharpenText } from './TextSharpness.js';

export default class HudUI {
  constructor(scene, onPause) {
    const width = scene.scale.gameSize.width;
    this.panel = scene.add.rectangle(width / 2, 70, width - 24, 116, 0x07111f, 0.96).setStrokeStyle(3, 0x38bdf8, 1).setDepth(20);
    this.stageText = sharpenText(scene.add.text(22, 17, '개장 직후', { fontFamily: HEAVY_FONT, fontSize: '16px', color: '#dbeafe', stroke: '#020617', strokeThickness: 3 })).setDepth(21);
    this.timeText = sharpenText(scene.add.text(width - 151, 17, '45.0초', { fontFamily: HEAVY_FONT, fontSize: '18px', color: '#ffffff', stroke: '#020617', strokeThickness: 4 })).setDepth(21);
    this.portfolioText = sharpenText(scene.add.text(22, 45, '자산 100.0', { fontFamily: HEAVY_FONT, fontSize: '17px', color: '#ffffff', stroke: '#020617', strokeThickness: 4 })).setDepth(21);
    this.returnText = sharpenText(scene.add.text(width - 191, 45, '수익 +0.0%', { fontFamily: HEAVY_FONT, fontSize: '16px', color: '#bbf7d0', stroke: '#020617', strokeThickness: 4 })).setDepth(21);
    this.riskLabel = sharpenText(scene.add.text(22, 76, '위험', { fontFamily: HEAVY_FONT, fontSize: '13px', color: '#fecaca', stroke: '#020617', strokeThickness: 3 })).setDepth(21);
    this.confLabel = sharpenText(scene.add.text(190, 76, '신뢰', { fontFamily: HEAVY_FONT, fontSize: '13px', color: '#bae6fd', stroke: '#020617', strokeThickness: 3 })).setDepth(21);
    this.riskBar = this.makeBar(scene, 62, 84, 108, 14, 0x111827, 0xef4444);
    this.confBar = this.makeBar(scene, 232, 84, 82, 14, 0x111827, 0x38bdf8);
    if (scene.textures.exists('ui_pause')) {
      const pauseTexture = makeSolidButtonTexture(scene, 'solid_pause_button', 50, 50, 0x16a34a, 0xecfdf5);
      const img = scene.add.image(width - 42, 42, pauseTexture).setDisplaySize(50, 50).setInteractive({ useHandCursor: true });
      const txt = sharpenText(scene.add.text(width - 42, 41, 'Ⅱ', { fontFamily: HEAVY_FONT, fontSize: '28px', color: '#ffffff', stroke: '#020617', strokeThickness: 5 })).setOrigin(0.5);
      img.on('pointerdown', () => { img.setScale(img.scaleX * 0.92, img.scaleY * 0.92); onPause && onPause(); });
      img.on('pointerup', () => img.setDisplaySize(50, 50));
      img.on('pointerout', () => img.setDisplaySize(50, 50));
      this.pause = { bg: img, txt, destroy: () => { img.destroy(); txt.destroy(); } };
    } else {
      this.pause = makeTextButton(scene, width - 54, 38, 'Ⅱ', onPause, 58, 48);
    }
    this.pause.bg.setDepth(20); this.pause.txt.setDepth(21);
    for (const obj of [this.stageText, this.timeText, this.portfolioText, this.returnText, this.riskLabel, this.confLabel, this.riskBar.bg, this.riskBar.fill, this.confBar.bg, this.confBar.fill]) {
      obj.setVisible(false);
    }
    this.domHud = this.createDomHud(scene);
    scene.events.once('shutdown', () => this.destroyDomHud());
  }
  makeBar(scene, x, y, width, height, bgColor, fillColor) {
    const bg = scene.add.rectangle(x, y, width, height, bgColor, 0.95).setOrigin(0, 0.5).setDepth(21);
    const fill = scene.add.rectangle(x, y, width, height, fillColor, 0.95).setOrigin(0, 0.5).setDepth(22);
    return { bg, fill, width };
  }
  update(snapshot) {
    const ret = snapshot.returnPct >= 0 ? `+${snapshot.returnPct.toFixed(1)}%` : `${snapshot.returnPct.toFixed(1)}%`;
    this.stageText.setText(stageLabel(snapshot.stageName));
    this.timeText.setText(`${snapshot.timeLeft.toFixed(1)}초`);
    this.portfolioText.setText(`자산 ${snapshot.portfolio.toFixed(1)}`);
    this.returnText.setText(`수익 ${ret}`);
    this.returnText.setColor(snapshot.returnPct >= 0 ? '#bbf7d0' : '#fecaca');
    this.riskBar.fill.width = Math.max(2, this.riskBar.width * snapshot.risk / 100);
    this.confBar.fill.width = Math.max(2, this.confBar.width * snapshot.confidence / 100);
    this.updateDomHud(snapshot, ret);
  }
  setVisible(v) {
    for (const obj of [this.panel, this.pause.bg, this.pause.txt]) obj.setVisible(v);
    if (this.domHud?.root) this.domHud.root.style.display = v ? 'block' : 'none';
  }
  layoutItems() {
    return [{ id: 'hud-panel', obj: this.panel }, { id: 'pause', obj: this.pause.bg }];
  }

  createDomHud(scene) {
    if (typeof document === 'undefined') return null;
    const root = document.createElement('div');
    root.setAttribute('data-market-panic-hud', 'true');
    root.style.position = 'fixed';
    root.style.zIndex = '20';
    root.style.pointerEvents = 'none';
    root.style.color = '#ffffff';
    root.style.fontFamily = "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', Arial, sans-serif";
    root.style.fontWeight = '780';
    root.style.textShadow = '0 1px 0 rgba(2,6,23,0.72)';
    root.style.fontFeatureSettings = '"tnum" 1, "kern" 1';
    root.style.fontVariationSettings = '"wght" 780';
    root.style.contain = 'layout style paint';
    root.innerHTML = `
      <div data-role="stage"></div>
      <div data-role="time"></div>
      <div data-role="portfolio"></div>
      <div data-role="return"></div>
      <div data-role="risk-label">위험</div>
      <div data-role="risk-track"><div data-role="risk-fill"></div></div>
      <div data-role="conf-label">신뢰</div>
      <div data-role="conf-track"><div data-role="conf-fill"></div></div>
    `;
    document.body.appendChild(root);
    const dom = {
      root,
      stage: root.querySelector('[data-role="stage"]'),
      time: root.querySelector('[data-role="time"]'),
      portfolio: root.querySelector('[data-role="portfolio"]'),
      returnText: root.querySelector('[data-role="return"]'),
      riskLabel: root.querySelector('[data-role="risk-label"]'),
      riskTrack: root.querySelector('[data-role="risk-track"]'),
      riskFill: root.querySelector('[data-role="risk-fill"]'),
      confLabel: root.querySelector('[data-role="conf-label"]'),
      confTrack: root.querySelector('[data-role="conf-track"]'),
      confFill: root.querySelector('[data-role="conf-fill"]'),
      scene,
    };
    for (const el of [dom.riskTrack, dom.confTrack]) {
      el.style.position = 'absolute';
      el.style.background = '#111827';
      el.style.border = '1px solid #020617';
      el.style.overflow = 'hidden';
    }
    for (const el of [dom.riskFill, dom.confFill]) {
      el.style.height = '100%';
      el.style.width = '100%';
    }
    dom.riskFill.style.background = '#ef4444';
    dom.confFill.style.background = '#38bdf8';
    this.syncDomHudBounds(dom);
    return dom;
  }

  syncDomHudBounds(dom = this.domHud) {
    if (!dom?.root) return;
    const scene = dom.scene;
    const bounds = scene.scale.canvasBounds;
    const gameSize = scene.scale.gameSize;
    if (!bounds || !gameSize) return;
    const sx = bounds.width / gameSize.width;
    const sy = bounds.height / gameSize.height;
    const s = Math.min(sx, sy);
    const place = (el, x, y, width, height, size, color = '#ffffff', align = 'left') => {
      el.style.position = 'absolute';
      el.style.left = `${x * sx}px`;
      el.style.top = `${y * sy}px`;
      el.style.width = `${width * sx}px`;
      el.style.height = `${height * sy}px`;
      el.style.fontSize = `${size * s}px`;
      el.style.lineHeight = `${height * sy}px`;
      el.style.color = color;
      el.style.textAlign = align;
      el.style.whiteSpace = 'nowrap';
    };
    dom.root.style.left = `${bounds.left + 12 * sx}px`;
    dom.root.style.top = `${bounds.top + 12 * sy}px`;
    dom.root.style.width = `${366 * sx}px`;
    dom.root.style.height = `${116 * sy}px`;
    place(dom.stage, 10, 5, 150, 22, 16, '#dbeafe');
    place(dom.time, 242, 4, 96, 26, 20, '#ffffff', 'center');
    place(dom.portfolio, 10, 34, 150, 28, 18, '#ffffff');
    place(dom.returnText, 190, 34, 126, 28, 18, '#bbf7d0', 'center');
    place(dom.riskLabel, 10, 65, 42, 22, 14, '#fecaca');
    place(dom.confLabel, 178, 65, 42, 22, 14, '#bae6fd');
    Object.assign(dom.riskTrack.style, { left: `${54 * sx}px`, top: `${72 * sy}px`, width: `${108 * sx}px`, height: `${14 * sy}px` });
    Object.assign(dom.confTrack.style, { left: `${222 * sx}px`, top: `${72 * sy}px`, width: `${82 * sx}px`, height: `${14 * sy}px` });
  }

  updateDomHud(snapshot, ret) {
    if (!this.domHud) return;
    this.syncDomHudBounds(this.domHud);
    this.domHud.stage.textContent = stageLabel(snapshot.stageName);
    this.domHud.time.textContent = `${snapshot.timeLeft.toFixed(1)}초`;
    this.domHud.portfolio.textContent = `자산 ${snapshot.portfolio.toFixed(1)}`;
    this.domHud.returnText.textContent = `수익 ${ret}`;
    this.domHud.returnText.style.color = snapshot.returnPct >= 0 ? '#bbf7d0' : '#fecaca';
    this.domHud.riskFill.style.width = `${Math.max(2, snapshot.risk)}%`;
    this.domHud.confFill.style.width = `${Math.max(2, snapshot.confidence)}%`;
  }

  destroyDomHud() {
    this.domHud?.root?.remove();
    this.domHud = null;
  }
}
