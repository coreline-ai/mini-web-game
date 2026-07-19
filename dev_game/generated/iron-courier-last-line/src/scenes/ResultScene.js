import Phaser from 'phaser';
import { ASSETS, COLORS, SCENES } from '../constants.js';
import { button, coverImage, cssScale, label, panel, panelContentInsets, resizePanel, responsiveFontSize } from '../ui.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { publishLayout } from '../systems/LayoutRegistry.js';
import { Audio } from '../audio.js';

export default class ResultScene extends Phaser.Scene {
  constructor() { super(SCENES.RESULT); }

  init(data) {
    this.result = { score: 0, rescued: 0, elapsed: 0, cleared: false, reason: '작전 실패', ...data };
  }

  create() {
    Audio.stopAll(this);
    SaveSystem.commitRun(this.result.score, this.result.cleared);
    if (this.result.cleared) Audio.sfx(this, 'sfx-victory', 0.55);

    this.background = this.add.image(0, 0, this.result.cleared ? ASSETS.bgBoss : ASSETS.bgContainers);
    this.grade = this.add.rectangle(0, 0, 1, 1, 0x04111a, 0.7); // asset-coverage-allow cinematic-color-grade
    this.resultPanel = panel(this, 0, 0, 820, 586).setAlpha(0.82);
    this.emblem = this.add.image(0, 0, this.result.cleared ? 'ui-mission-complete' : 'ui-mission-failed').setDisplaySize(106, 106).setDepth(80);
    this.stamp = label(this, 0, 0, this.result.cleared ? 'MISSION COMPLETE' : 'MISSION FAILED', 46, this.result.cleared ? '#76d275' : '#ff6b61');
    this.reasonText = label(this, 0, 0, this.result.reason, 22);
    this.scoreText = label(this, 0, 0, `점수  ${Math.round(this.result.score).toLocaleString('ko-KR')}`, 31, '#ffc857');
    this.rescueText = label(this, 0, 0, `구조 인원  ${this.result.rescued}`, 23, '#49d8d1');
    this.timeText = label(this, 0, 0, `작전 시간  ${Math.floor(this.result.elapsed / 60)}:${String(Math.floor(this.result.elapsed % 60)).padStart(2, '0')}`, 21, '#d7e9e8');
    const canContinue = !this.result.cleared && SaveSystem.hasContinue();
    const primaryLabel = this.result.cleared ? '재도전' : canContinue ? '이어서 하기' : '새 작전';
    const primaryAction = () => {
      if (canContinue) this.scene.start(SCENES.GAME, { mode: 'continue' });
      else { SaveSystem.clearContinue(); this.scene.start(SCENES.GAME, { mode: 'new' }); }
    };
    this.retry = button(this, 0, 0, primaryLabel, primaryAction, 220, 64, COLORS.orange);
    this.home = button(this, 0, 0, '기지로 복귀', () => this.scene.start(SCENES.HOME), 220, 64, COLORS.orange);
    this.retry.bg.setData('actionState', 'enabled');
    this.retry.bg.setData('actionType', canContinue ? 'continue' : this.result.cleared ? 'retry' : 'new');
    this.home.bg.setData('actionState', 'enabled');

    this.layoutViewport();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutViewport, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  fitSingleLine(textObject, preferredSize, maxWidth, minimumSize = 16) {
    textObject.setFontSize(preferredSize);
    if (textObject.width > maxWidth) {
      textObject.setFontSize(Math.max(minimumSize, Math.floor(preferredSize * maxWidth / textObject.width)));
    }
  }

  layoutViewport() {
    if (!this.resultPanel?.active) return;
    const camera = this.cameras.main;
    const viewW = camera.width;
    const viewH = camera.height;
    const centerX = viewW / 2;
    const centerY = viewH / 2;
    const panelWidth = Math.min(820, viewW - 48);
    const panelHeight = Math.min(586, viewH - 54);

    coverImage(this, this.background.setPosition(centerX, centerY), viewW, viewH);
    this.grade.setPosition(centerX, centerY).setSize(viewW, viewH);
    resizePanel(this.resultPanel, panelWidth, panelHeight).setPosition(centerX, centerY);

    this.emblem.setPosition(centerX, centerY - 282);
    this.stamp.setPosition(centerX, centerY - 158);
    this.reasonText.setPosition(centerX, centerY - 90);
    this.scoreText.setPosition(centerX, centerY - 25);
    this.rescueText.setPosition(centerX, centerY + 20);
    this.timeText.setPosition(centerX, centerY + 63);

    const scale = cssScale(this);
    const compact = (this.scale?.canvasBounds?.width ?? window.innerWidth) < 1100;
    const actionHeight = compact ? Math.max(64, 46 / Math.max(0.001, scale.y)) : 64;
    const actionFontSize = compact ? Math.max(24, 16 / Math.max(0.001, scale.y)) : 24;
    this.retry.setPosition(centerX - 130, centerY + 143).setDisplaySize(220, actionHeight).setFontSize(actionFontSize);
    this.home.setPosition(centerX + 130, centerY + 143).setDisplaySize(220, actionHeight).setFontSize(actionFontSize);

    const insets = panelContentInsets(this.resultPanel, 8);
    const contentWidth = panelWidth - insets.left - insets.right;
    this.fitSingleLine(this.stamp, responsiveFontSize(this, 46, 18), contentWidth - 12, 34);
    this.fitSingleLine(this.reasonText, responsiveFontSize(this, 22, 12.5), contentWidth - 24, 18);
    this.scoreText.setFontSize(responsiveFontSize(this, 31, 13));
    this.rescueText.setFontSize(responsiveFontSize(this, 23, 12.5));
    this.timeText.setFontSize(responsiveFontSize(this, 21, 12.5));

    const contentContainer = { id: 'result-panel', obj: this.resultPanel, insets };
    publishLayout(this, [
      { id: 'result-background', obj: this.background, role: 'background', meta: { scaleMode: 'aspect-cover' }, checkOverlap: false, checkClipping: false },
      { id: 'result-panel', obj: this.resultPanel, role: 'panel', checkOverlap: false },
      { id: 'mission-icon', obj: this.emblem, checkOverlap: false },
      { id: 'mission-title', obj: this.stamp, container: contentContainer },
      { id: 'mission-reason', obj: this.reasonText, container: contentContainer },
      { id: 'summary-score', obj: this.scoreText, container: contentContainer },
      { id: 'rescued-count', obj: this.rescueText, container: contentContainer },
      { id: 'operation-time', obj: this.timeText, container: contentContainer },
      { id: 'retry-action', obj: this.retry.bg, role: 'button', container: contentContainer },
      { id: 'retry-action-label', obj: this.retry.text, role: 'button-label', checkOverlap: false },
      { id: 'home-action', obj: this.home.bg, role: 'button', container: contentContainer },
      { id: 'home-action-label', obj: this.home.text, role: 'button-label', checkOverlap: false },
    ]);
  }

  cleanup() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutViewport, this);
  }
}
