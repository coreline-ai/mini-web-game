import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';

export default class LoadingUI {
  constructor(scene) {
    this.scene = scene;
    const { width, height } = SPEC.canvas;
    scene.add.rectangle(0, 0, width, height, 0x071218).setOrigin(0);
    scene.add.circle(width / 2, height * 0.34, 260, 0xe5b966, 0.055);
    scene.add.circle(width / 2, height * 0.34, 170, 0xe5b966, 0.08);
    this.title = scene.add.text(width / 2, height * 0.32, SPEC.game.title, { fontFamily: 'Arial Black, Arial', fontSize: '78px', color: '#f4ead3', align: 'center', stroke: '#020708', strokeThickness: 12 }).setOrigin(0.5);
    this.tip = scene.add.text(width / 2, height * 0.44, '헬리오 코어 방어망 동기화', { fontFamily: 'Arial', fontSize: '34px', color: '#9bcfc7', align: 'center' }).setOrigin(0.5);
    this.barBack = scene.add.rectangle(width / 2, height * 0.56, width * 0.72, 34, 0xffffff, 0.14).setOrigin(0.5);
    this.bar = scene.add.rectangle(width * 0.14, height * 0.56, 8, 34, 0xe5b966, 1).setOrigin(0, 0.5);
    this.percent = scene.add.text(width / 2, height * 0.61, '0%', { fontFamily: 'Arial Black, Arial', fontSize: '36px', color: '#ffffff' }).setOrigin(0.5);
  }
  setProgress(v) {
    const { width } = SPEC.canvas;
    const p = Phaser.Math.Clamp(v, 0, 1);
    this.bar.width = Math.max(8, width * 0.72 * p);
    this.percent.setText(Math.round(p * 100) + '%');
  }
}
