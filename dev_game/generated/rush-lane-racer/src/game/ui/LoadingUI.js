import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { publishLayout, objectBounds } from '../systems/LayoutRegistry.js';

export default class LoadingUI {
  constructor(scene) {
    this.scene = scene;
    const { width, height } = SPEC.canvas;
    scene.add.rectangle(0, 0, width, height, 0x101827).setOrigin(0);
    this.panel = scene.add.rectangle(width / 2, height * 0.52, width * 0.72, height * 0.5, 0x07111e, 0.72).setStrokeStyle(7, 0x2df2ff, 0.7);
    this.title = scene.add.text(width / 2, height * 0.34, 'RUSH LANE\nRACER', { fontFamily: 'Arial Black, Arial', fontSize: '82px', color: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: 12 }).setOrigin(0.5);
    this.tip = scene.add.text(width / 2, height * 0.49, 'ENGINE STARTING...', { fontFamily: 'Arial Black, Arial', fontSize: '34px', color: '#b9d7ff', align: 'center', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
    this.barBack = scene.add.rectangle(width / 2, height * 0.59, width * 0.62, 32, 0xffffff, 0.16).setOrigin(0.5);
    this.bar = scene.add.rectangle(width * 0.19, height * 0.59, 6, 32, 0x24cc58, 1).setOrigin(0, 0.5);
    this.percent = scene.add.text(width / 2, height * 0.65, '0%', { fontFamily: 'Arial Black, Arial', fontSize: '36px', color: '#ffdf4a', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
    this.publishLayout();
  }
  publishLayout() {
    publishLayout(this.scene, 'Loading', [
      objectBounds(this.scene, this.panel, 'loading-panel', { allowOverlap: true }),
      objectBounds(this.scene, this.title, 'loading-title'),
      objectBounds(this.scene, this.tip, 'loading-tip'),
      objectBounds(this.scene, this.barBack, 'loading-progress', { allowOverlap: true }),
      objectBounds(this.scene, this.percent, 'loading-percent'),
    ], ['loading-panel', 'loading-title', 'loading-progress', 'loading-percent']);
  }
  setProgress(v) {
    const { width } = SPEC.canvas;
    const p = Phaser.Math.Clamp(v, 0, 1);
    this.bar.width = Math.max(6, width * 0.62 * p);
    this.percent.setText(Math.round(p * 100) + '%');
    this.publishLayout();
  }
}
