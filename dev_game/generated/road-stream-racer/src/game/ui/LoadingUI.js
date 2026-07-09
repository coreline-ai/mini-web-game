import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { fontPx, strokePx } from '../utils/scale.js';

export default class LoadingUI {
  constructor(scene) {
    this.scene = scene;
    const { width, height } = SPEC.canvas;
    scene.add.rectangle(0, 0, width, height, 0x111a24).setOrigin(0);
    scene.add.rectangle(width / 2, height * 0.5, width * 0.74, height * 0.78, 0x101820, 0.42)
      .setStrokeStyle(4, 0xffffff, 0.12);
    this.title = scene.add.text(width / 2, height * 0.34, SPEC.game.title, {
      fontFamily: '"Arial Black", Arial, sans-serif',
      fontSize: fontPx(76),
      color: '#ffffff',
      align: 'center',
      stroke: '#07111d',
      strokeThickness: strokePx(12),
    }).setOrigin(0.5);
    this.tip = scene.add.text(width / 2, height * 0.46, 'FHD 에셋 로딩 중', { fontFamily: 'Arial, sans-serif', fontSize: fontPx(34), color: '#b9d7ff', align: 'center', stroke: '#07111d', strokeThickness: strokePx(4) }).setOrigin(0.5);
    this.barBack = scene.add.rectangle(width / 2, height * 0.58, width * 0.72, 34, 0xffffff, 0.18).setOrigin(0.5);
    this.bar = scene.add.rectangle(width * 0.14, height * 0.58, 8, 34, 0x39e98a, 1).setOrigin(0, 0.5);
    this.percent = scene.add.text(width / 2, height * 0.64, '0%', { fontFamily: '"Arial Black", Arial, sans-serif', fontSize: fontPx(36), color: '#ffffff', stroke: '#07111d', strokeThickness: strokePx(5) }).setOrigin(0.5);
  }
  setProgress(v) {
    const { width } = SPEC.canvas;
    const p = Phaser.Math.Clamp(v, 0, 1);
    this.bar.width = Math.max(4, width * 0.72 * p);
    this.percent.setText(Math.round(p * 100) + '%');
  }
}
