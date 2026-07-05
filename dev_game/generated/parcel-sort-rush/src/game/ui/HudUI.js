import { SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { makeImageTextButton } from './MobileButton.js';

export default class HudUI {
  constructor(scene, onPause) {
    const { width } = SPEC.canvas;
    this.leftPanel = scene.add.image(28, 24, ASSET_KEYS.ui.hudPanel).setOrigin(0).setDisplaySize(520, 168).setDepth(90);
    this.scoreText = scene.add.text(70, 48, 'SCORE 0', { fontFamily: 'Arial Black, Arial', fontSize: '38px', color: '#ffffff', stroke: '#000', strokeThickness: 7 }).setDepth(91);
    this.comboText = scene.add.text(70, 98, 'COMBO 0', { fontFamily: 'Arial Black, Arial', fontSize: '29px', color: '#58f29b', stroke: '#000', strokeThickness: 5 }).setDepth(91);
    this.stageText = scene.add.text(70, 138, 'STAGE 1', { fontFamily: 'Arial Black, Arial', fontSize: '27px', color: '#ffd35a', stroke: '#000', strokeThickness: 5 }).setDepth(91);

    this.rightPanel = scene.add.image(width - 480, 34, ASSET_KEYS.ui.hudPanelCompact).setOrigin(0).setDisplaySize(280, 132).setDepth(90);
    this.lifeText = scene.add.text(width - 448, 58, 'LIFE 3', { fontFamily: 'Arial Black, Arial', fontSize: '32px', color: '#ff6172', stroke: '#000', strokeThickness: 6 }).setDepth(91);
    this.sortedText = scene.add.text(width - 448, 105, 'SORT 0', { fontFamily: 'Arial Black, Arial', fontSize: '25px', color: '#ffffff', stroke: '#000', strokeThickness: 5 }).setDepth(91);

    // Keep pause out of the Android/assistive floating-bubble hotspot near the
    // top-right corner while preserving one-hand reach.
    this.pause = makeImageTextButton(scene, width - 96, 190, '', ASSET_KEYS.ui.buttonPause, onPause, 112, 112, '50px');
    this.pause.bg.setDepth(92);
    for (const piece of this.pause.pieces) piece.setDepth(piece === this.pause.bg ? 92 : piece.depth + 61);
  }

  update(state) {
    this.scoreText.setText('SCORE ' + state.score);
    this.comboText.setText('COMBO ' + state.combo + '  BEST ' + state.bestCombo);
    this.stageText.setText((state.rush ? 'RUSH!  ' : '') + 'STAGE ' + state.stage);
    this.lifeText.setText('LIFE ' + state.lives);
    this.sortedText.setText('SORT ' + state.sorted + ' / MISS ' + state.missed);
  }

  setVisible(v) {
    for (const item of [this.leftPanel, this.scoreText, this.comboText, this.stageText, this.rightPanel, this.lifeText, this.sortedText]) item.setVisible(v);
    this.pause.setVisible(v);
  }

  getLayoutItems() {
    return [
      { id: 'game-hud-left-panel', object: this.leftPanel },
      { id: 'game-hud-right-panel', object: this.rightPanel },
      { id: 'game-pause-button', object: this.pause.bg },
      { id: 'game-hud-score-text', object: this.scoreText, mustBeInside: 'game-hud-left-panel', innerPadding: 4, allowOverlapWith: ['game-hud-left-panel'] },
      { id: 'game-hud-combo-text', object: this.comboText, mustBeInside: 'game-hud-left-panel', innerPadding: 4, allowOverlapWith: ['game-hud-left-panel'] },
      { id: 'game-hud-stage-text', object: this.stageText, mustBeInside: 'game-hud-left-panel', innerPadding: 4, allowOverlapWith: ['game-hud-left-panel'] },
      { id: 'game-hud-life-text', object: this.lifeText, mustBeInside: 'game-hud-right-panel', innerPadding: 4, allowOverlapWith: ['game-hud-right-panel'] },
      { id: 'game-hud-sort-miss-text', object: this.sortedText, mustBeInside: 'game-hud-right-panel', innerPadding: 4, allowOverlapWith: ['game-hud-right-panel'] },
    ];
  }
}
