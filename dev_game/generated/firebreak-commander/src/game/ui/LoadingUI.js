import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';

export default class LoadingUI {
  constructor(scene) {
    this.scene = scene;
    const { width, height } = SPEC.canvas;
    scene.add.rectangle(0, 0, width, height, 0x0b1024).setOrigin(0);
    const loadingTitle = SPEC.game.title.toUpperCase().replace(' ', '\n');
    this.title = scene.add.text(width / 2, height * 0.31, loadingTitle, { fontFamily: 'Arial Black, Arial', fontSize: '31px', color: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: 5, lineSpacing: -5 }).setOrigin(0.5);
    this.tip = scene.add.text(width / 2, height * 0.47, '산불 대응 지도를 준비하고 있습니다...', { fontFamily: 'Apple SD Gothic Neo, Arial, sans-serif', fontSize: '16px', color: '#b9d7ff', align: 'center' }).setOrigin(0.5);
    this.barBack = scene.add.rectangle(width / 2, height * 0.58, width * 0.72, 18, 0xffffff, 0.18).setOrigin(0.5);
    this.bar = scene.add.rectangle(width * 0.14, height * 0.58, 4, 18, 0x39e98a, 1).setOrigin(0, 0.5);
    this.percent = scene.add.text(width / 2, height * 0.63, '0%', { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
  }
  setProgress(v) {
    const { width } = SPEC.canvas;
    const p = Phaser.Math.Clamp(v, 0, 1);
    this.bar.width = Math.max(4, width * 0.72 * p);
    this.percent.setText(Math.round(p * 100) + '%');
  }
}
