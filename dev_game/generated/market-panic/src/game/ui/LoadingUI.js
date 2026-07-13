import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { HEAVY_FONT, UI_FONT } from '../config/marketConfig.js';
import { fontPx, strokePx, su } from '../constants/tuning.js';

export default class LoadingUI {
  constructor(scene) {
    this.scene = scene;
    const { width, height } = SPEC.canvas;
    if (scene.textures.exists(ASSET_KEYS.ui.loadingShell)) {
      const bg = scene.add.image(width / 2, height / 2, ASSET_KEYS.ui.loadingShell).setAlpha(0.88);
      const scale = Math.max(width / bg.width, height / bg.height);
      bg.setScale(scale);
      scene.add.rectangle(0, 0, width, height, 0x020617, 0.18).setOrigin(0);
    } else {
      scene.add.rectangle(0, 0, width, height, 0x0b1024).setOrigin(0);
    }
    this.title = scene.add.text(width / 2, height * 0.34, '마켓 패닉', { fontFamily: HEAVY_FONT, fontSize: fontPx(34), color: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: strokePx(5) }).setOrigin(0.5);
    this.tip = scene.add.text(width / 2, height * 0.47, '시장 데이터를 불러오는 중...', { fontFamily: UI_FONT, fontSize: fontPx(16), color: '#b9d7ff', align: 'center' }).setOrigin(0.5);
    this.barBack = scene.add.rectangle(width / 2, height * 0.58, width * 0.72, su(18), 0xffffff, 0.18).setOrigin(0.5);
    this.bar = scene.add.rectangle(width * 0.14, height * 0.58, su(4), su(18), 0x39e98a, 1).setOrigin(0, 0.5);
    this.percent = scene.add.text(width / 2, height * 0.63, '0%', { fontFamily: HEAVY_FONT, fontSize: fontPx(18), color: '#ffffff' }).setOrigin(0.5);
  }
  setProgress(v) {
    const { width } = SPEC.canvas;
    const p = Phaser.Math.Clamp(v, 0, 1);
    this.bar.width = Math.max(su(4), width * 0.72 * p);
    this.percent.setText(Math.round(p * 100) + '%');
  }
}
