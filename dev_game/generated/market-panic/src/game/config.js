import Phaser from 'phaser';
import { SPEC, SCENES } from './data/spec.js';
import BootScene from './scenes/BootScene.js';
import LoadingScene from './scenes/LoadingScene.js';
import HomeScene from './scenes/HomeScene.js';
import GameScene from './scenes/GameScene.js';
import PauseScene from './scenes/PauseScene.js';
import GameOverScene from './scenes/GameOverScene.js';

export { SPEC, SCENES } from './data/spec.js';

const RENDER_RESOLUTION = Math.min(Math.max(Number(globalThis.devicePixelRatio) || 1, 1), 2);

export default {
  type: Phaser.AUTO,
  parent: 'game',
  width: SPEC.canvas.width,
  height: SPEC.canvas.height,
  resolution: RENDER_RESOLUTION,
  backgroundColor: SPEC.canvas.backgroundColor,
  render: {
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
    roundPixels: false,
  },
  scale: {
    mode: SPEC.canvas.scaleMode === 'cover' ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: { default: 'arcade', arcade: { debug: false } },
  fps: { target: SPEC.performance.targetFps || 60, forceSetTimeOut: false },
  scene: [BootScene, LoadingScene, HomeScene, GameScene, PauseScene, GameOverScene],
};
