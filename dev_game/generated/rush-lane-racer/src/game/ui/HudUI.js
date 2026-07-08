import { SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { makeTextButton } from './MobileButton.js';
import { objectBounds } from '../systems/LayoutRegistry.js';

function effectLabel(effects) {
  const bits = [];
  if (effects.shield > 0) bits.push('SHIELD ' + effects.shield);
  if (effects.nitroMs > 0) bits.push('NITRO ' + Math.ceil(effects.nitroMs / 1000));
  if (effects.magnetMs > 0) bits.push('MAG ' + Math.ceil(effects.magnetMs / 1000));
  if (effects.slowMs > 0) bits.push('SLOW ' + Math.ceil(effects.slowMs / 1000));
  return bits.length ? bits.join(' · ') : 'READY';
}

export default class HudUI {
  constructor(scene, onPause) {
    const { width } = SPEC.canvas;
    this.scene = scene;
    this.panel = scene.add.rectangle(28, 28, 510, 205, 0x07111e, 0.72).setOrigin(0).setStrokeStyle(5, 0x7ee9ff, 0.8).setDepth(60);
    this.scoreText = scene.add.text(58, 48, 'SCORE 0', { fontFamily: 'Arial Black, Arial', fontSize: '42px', color: '#ffffff', stroke: '#000000', strokeThickness: 7 }).setDepth(61);
    this.stageText = scene.add.text(58, 112, 'STAGE 1', { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#ffdf4a', stroke: '#000000', strokeThickness: 6 }).setDepth(61);
    this.comboText = scene.add.text(58, 158, 'COMBO 0', { fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#7effff', stroke: '#000000', strokeThickness: 5 }).setDepth(61);
    this.coinPanel = scene.add.rectangle(width - 390, 48, 270, 86, 0x07111e, 0.66).setOrigin(0).setStrokeStyle(4, 0xffdf4a, 0.75).setDepth(60);
    this.coinIcon = scene.add.image(width - 345, 91, ASSET_KEYS.coin).setDisplaySize(58, 58).setDepth(61);
    this.coinText = scene.add.text(width - 300, 63, '0', { fontFamily: 'Arial Black, Arial', fontSize: '48px', color: '#ffdf4a', stroke: '#000000', strokeThickness: 8 }).setDepth(61);
    this.effectText = scene.add.text(width / 2, 62, 'READY', { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#bdeeff', stroke: '#000000', strokeThickness: 5 }).setOrigin(0.5).setDepth(61);
    this.pause = makeTextButton(scene, width - 82, 88, 'Ⅱ', onPause, 106, 106, 0x147bd7, '54px');
    this.pause.bg.setDepth(60); this.pause.shadow.setDepth(59); this.pause.shine.setDepth(61); this.pause.txt.setDepth(62);
  }

  update(state) {
    this.scoreText.setText('SCORE ' + state.score);
    this.stageText.setText((state.stage >= 10 && state.level > 10 ? 'ENDLESS ' : 'STAGE ') + state.stage + '  LV ' + state.level);
    this.comboText.setText('COMBO ' + state.combo + '  DODGE ' + state.avoided);
    this.coinText.setText(String(state.coins));
    this.effectText.setText(state.warning ? '⚠ SPEED ZONE ⚠' : effectLabel(state.effects));
    this.effectText.setColor(state.warning ? '#ffdf4a' : '#bdeeff');
  }

  getLayoutItems() {
    return [
      objectBounds(this.scene, this.panel, 'hud-panel', { allowOverlap: true }),
      objectBounds(this.scene, this.scoreText, 'hud-score'),
      objectBounds(this.scene, this.stageText, 'hud-stage'),
      objectBounds(this.scene, this.comboText, 'hud-combo'),
      objectBounds(this.scene, this.coinPanel, 'coin-panel', { allowOverlap: true }),
      objectBounds(this.scene, this.coinIcon, 'coin-icon'),
      objectBounds(this.scene, this.coinText, 'coin-text'),
      objectBounds(this.scene, this.effectText, 'effect-label'),
      objectBounds(this.scene, this.pause.bg, 'pause-button', { allowStretch: true }),
    ];
  }

  setVisible(v) {
    for (const item of [this.panel, this.scoreText, this.stageText, this.comboText, this.coinPanel, this.coinIcon, this.coinText, this.effectText]) item.setVisible(v);
    this.pause.setVisible(v);
  }
}
