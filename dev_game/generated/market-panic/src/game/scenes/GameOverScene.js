import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { SaveData } from '../systems/SaveData.js';
import { terminalLabel, terminalReason } from '../config/marketConfig.js';
import DomSceneUI from '../ui/DomSceneUI.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super(SCENES.GAMEOVER); }
  create(data = {}) {
    const { width, height } = SPEC.canvas;
    const score = data.score || 0;
    const isBest = SaveData.record(score);
    this.add.rectangle(0, 0, width, height, 0x070814).setOrigin(0);
    if (this.textures.exists(ASSET_KEYS.backgrounds.stage4)) {
      const bg = this.add.image(width / 2, height / 2, ASSET_KEYS.backgrounds.stage4).setAlpha(0.78);
      const scale = Math.max(width / bg.width, height / bg.height);
      bg.setScale(scale);
    }
    const title = terminalLabel(data.title || (data.win ? 'MARKET SAVED' : 'GAME OVER'));
    this.domUi = new DomSceneUI(this, 'GameOver', data.win ? 'mp-gameover-ui is-win' : 'mp-gameover-ui', `
      <section class="mp-modal-card mp-gameover-card" data-layout-id="gameover-panel">
        <h2 data-layout-id="gameover">${title}</h2>
        <p class="mp-terminal-reason">${terminalReason(data.reason)}</p>
        <strong class="mp-terminal-score" data-layout-id="score">점수 ${score}</strong>
        <div class="mp-terminal-metrics">
          <span>자산 ${Number(data.portfolio || 0).toFixed(1)}</span>
          <span>수익 ${Number(data.returnPct || 0).toFixed(1)}%</span>
          <span>위험 ${Number(data.risk || 0).toFixed(1)}</span>
          <span>신뢰 ${Number(data.confidence || 0).toFixed(1)}</span>
        </div>
        <div class="mp-terminal-best">최고 점수 ${SaveData.getBest()}${isBest ? '  신기록!' : ''}</div>
        <button class="mp-menu-button mp-gameover-retry" data-layout-id="retry" type="button">다시 도전</button>
        <button class="mp-menu-button mp-gameover-home" data-layout-id="home" type="button">홈으로</button>
      </section>
    `);
    this.domUi.on('.mp-gameover-retry', () => this.scene.start(SCENES.GAME));
    this.domUi.on('.mp-gameover-home', () => this.scene.start(SCENES.HOME));
  }
}
