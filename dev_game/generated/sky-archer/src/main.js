import Phaser from 'phaser';
import './styles/mobile.css';
import config from './game/config.js';
import { TARGET_DPR, LOGICAL_CANVAS, PHYSICAL_CANVAS } from './game/systems/HiDpi.js';

window.addEventListener('load', () => {
  const game = new Phaser.Game(config);
  window.__GAME__ = game;
  window.__SKY_ARCHER_RENDER_TARGET__ = { targetDpr: TARGET_DPR, logicalCanvas: LOGICAL_CANVAS, physicalCanvas: PHYSICAL_CANVAS };
});
