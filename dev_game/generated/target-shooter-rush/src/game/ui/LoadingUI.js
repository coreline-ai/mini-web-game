import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { fontPx, strokePx, su } from '../constants/tuning.js';

export default class LoadingUI {
  constructor(scene) {
    this.scene = scene;
    const { width, height } = SPEC.canvas;
    this.backdrop = scene.add.rectangle(0, 0, width, height, 0x06111d, 0.72).setOrigin(0).setDepth(-20);
    this.title = scene.add.text(width / 2, height * 0.36, SPEC.game.title, { fontFamily: 'Arial Black, Arial', fontSize: fontPx(27), color: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: strokePx(5), wordWrap: { width: width - su(48) } }).setOrigin(0.5).setDepth(5);
    this.tip = scene.add.text(width / 2, height * 0.49, 'Loading assets...', { fontFamily: 'Arial', fontSize: fontPx(16), color: '#b9d7ff', align: 'center' }).setOrigin(0.5).setDepth(5);
    this.barBack = scene.add.rectangle(width / 2, height * 0.6, width * 0.72, su(18), 0xffffff, 0.18).setOrigin(0.5).setDepth(5);
    this.bar = scene.add.rectangle(width * 0.14, height * 0.6, su(4), su(18), 0x39e98a, 1).setOrigin(0, 0.5).setDepth(6);
    this.percent = scene.add.text(width / 2, height * 0.65, '0%', { fontFamily: 'Arial Black, Arial', fontSize: fontPx(18), color: '#ffffff' }).setOrigin(0.5).setDepth(5);
  }
  setProgress(v) {
    const { width } = SPEC.canvas;
    const p = Phaser.Math.Clamp(v, 0, 1);
    this.bar.width = Math.max(su(4), width * 0.72 * p);
    this.percent.setText(Math.round(p * 100) + '%');
  }
}
