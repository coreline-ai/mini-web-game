import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';

export default class LoadingUI {
  constructor(scene) {
    const { width, height } = SPEC.canvas;
    this.background = scene.add.rectangle(0, 0, width, height, 0x101923).setOrigin(0);
    this.panel = scene.add.rectangle(width / 2, height * 0.5, width * 0.74, height * 0.44, 0x07111a, 0.88).setStrokeStyle(8, 0x62d7ff, 0.72);
    this.title = scene.add.text(width / 2, height * 0.365, 'PARCEL\nSORT RUSH', { fontFamily: 'Arial Black, Arial', fontSize: '78px', color: '#ffffff', align: 'center', stroke: '#000', strokeThickness: 12 }).setOrigin(0.5);
    this.status = scene.add.text(width / 2, height * 0.505, '컨베이어 가동 준비 중...', { fontFamily: 'Arial Black, Arial', fontSize: '34px', color: '#aeefff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
    this.barBack = scene.add.rectangle(width / 2, height * 0.605, width * 0.56, 34, 0xffffff, 0.15).setOrigin(0.5);
    this.bar = scene.add.rectangle(width * 0.22, height * 0.605, 6, 34, 0x38e88b, 1).setOrigin(0, 0.5);
    this.percent = scene.add.text(width / 2, height * 0.67, '0%', { fontFamily: 'Arial Black, Arial', fontSize: '36px', color: '#ffd35a', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
  }
  setProgress(v) {
    const p = Phaser.Math.Clamp(v, 0, 1);
    this.bar.width = Math.max(6, SPEC.canvas.width * 0.56 * p);
    this.percent.setText(Math.round(p * 100) + '%');
  }
  getLayoutItems() {
    return [
      { id: 'loading-panel', object: this.panel },
      { id: 'loading-title', object: this.title, mustBeInside: 'loading-panel', innerPadding: 4, allowOverlapWith: ['loading-panel'] },
      { id: 'loading-status', object: this.status, mustBeInside: 'loading-panel', innerPadding: 4, allowOverlapWith: ['loading-panel'] },
      { id: 'loading-bar-back', object: this.barBack, mustBeInside: 'loading-panel', innerPadding: 4, allowOverlapWith: ['loading-panel', 'loading-bar-fill'] },
      { id: 'loading-bar-fill', object: this.bar, mustBeInside: 'loading-panel', innerPadding: 4, allowOverlapWith: ['loading-panel', 'loading-bar-back'] },
      { id: 'loading-percent', object: this.percent, mustBeInside: 'loading-panel', innerPadding: 4, allowOverlapWith: ['loading-panel'] },
    ];
  }
}
