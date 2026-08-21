import Phaser from 'phaser';
import { SPEC } from './data/spec.js';
import BootScene from './scenes/BootScene.js';
import LoadingScene from './scenes/LoadingScene.js';
import HomeScene from './scenes/HomeScene.js';
import GameScene from './scenes/GameScene.js';
import PauseScene from './scenes/PauseScene.js';
import GameOverScene from './scenes/GameOverScene.js';

export { SPEC, SCENES } from './data/spec.js';

export default {
  type: Phaser.AUTO,
  parent: 'game',
  width: SPEC.canvas.width,
  height: SPEC.canvas.height,
  backgroundColor: SPEC.canvas.backgroundColor,
  render: {
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
    roundPixels: false,
    powerPreference: 'high-performance'
  },
  scale: {
    mode: SPEC.canvas.scaleMode === 'cover' ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: SPEC.canvas.width,
    height: SPEC.canvas.height
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  fps: {
    target: SPEC.performance.targetFps || 60,
    forceSetTimeOut: false
  },
  scene: [BootScene, LoadingScene, HomeScene, GameScene, PauseScene, GameOverScene]
};
