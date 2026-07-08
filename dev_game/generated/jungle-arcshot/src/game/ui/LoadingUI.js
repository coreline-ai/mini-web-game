import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { fontPx, strokePx, su } from '../constants/tuning.js';

export default class LoadingUI {
  constructor(scene) {
    this.scene = scene;
    const { width, height } = SPEC.canvas;
    scene.add.rectangle(0, 0, width, height, 0x0b1024).setOrigin(0);
    this.barWidth = su(390 * 0.72);
    this.barHeight = su(18);
    this.barX = width / 2 - this.barWidth / 2;
    this.title = scene.add.text(width / 2, height * 0.34, SPEC.game.title, { fontFamily: 'Arial Black, Arial', fontSize: fontPx(34), color: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: strokePx(5) }).setOrigin(0.5);
    this.tip = scene.add.text(width / 2, height * 0.47, 'Loading assets...', { fontFamily: 'Arial', fontSize: fontPx(16), color: '#b9d7ff', align: 'center' }).setOrigin(0.5);
    this.barBack = scene.add.rectangle(width / 2, height * 0.58, this.barWidth, this.barHeight, 0xffffff, 0.18).setOrigin(0.5);
    this.bar = scene.add.rectangle(this.barX, height * 0.58, su(4), this.barHeight, 0x39e98a, 1).setOrigin(0, 0.5);
    this.percent = scene.add.text(width / 2, height * 0.63, '0%', { fontFamily: 'Arial Black, Arial', fontSize: fontPx(18), color: '#ffffff' }).setOrigin(0.5);
  }
  setProgress(v) {
    const p = Phaser.Math.Clamp(v, 0, 1);
    this.bar.width = Math.max(su(4), this.barWidth * p);
    this.percent.setText(Math.round(p * 100) + '%');
  }
}
