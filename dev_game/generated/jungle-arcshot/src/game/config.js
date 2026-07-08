import Phaser from 'phaser';
import { SPEC, SCENES } from './data/spec.js';
import BootScene from './scenes/BootScene.js';
import LoadingScene from './scenes/LoadingScene.js';
import HomeScene from './scenes/HomeScene.js';
import GameScene from './scenes/GameScene.js';
import PauseScene from './scenes/PauseScene.js';
import GameOverScene from './scenes/GameOverScene.js';

export { SPEC, SCENES } from './data/spec.js';

export const MAX_TARGET_DPR = 1;
export const RENDER_RESOLUTION = 1;
export const PHYSICAL_CANVAS = {
  width: SPEC.canvas.width,
  height: SPEC.canvas.height,
};

export function applyHiDpiCamera(scene) {
  const camera = scene.cameras?.main;
  if (!camera) return;
  camera.setScroll(0, 0);
  camera.setZoom(1);
  camera.setBounds(0, 0, SPEC.canvas.width, SPEC.canvas.height);
}

export default {
  type: Phaser.AUTO,
  parent: 'game',
  width: PHYSICAL_CANVAS.width,
  height: PHYSICAL_CANVAS.height,
  backgroundColor: SPEC.canvas.backgroundColor,
  scale: {
    width: PHYSICAL_CANVAS.width,
    height: PHYSICAL_CANVAS.height,
    zoom: 1,
    mode: SPEC.canvas.scaleMode === 'cover' ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true,
  },
  physics: { default: 'arcade', arcade: { debug: false } },
  fps: { target: SPEC.performance.targetFps || 60, forceSetTimeOut: false },
  scene: [BootScene, LoadingScene, HomeScene, GameScene, PauseScene, GameOverScene],
};
