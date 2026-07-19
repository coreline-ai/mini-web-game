import Phaser from 'phaser';
import { SPEC, SCENES } from './data/spec.js';
import BootScene from './scenes/BootScene.js';
import LoadingScene from './scenes/LoadingScene.js';
import BattleLoadingScene from './scenes/BattleLoadingScene.js';
import HomeScene from './scenes/HomeScene.js';
import ArsenalScene from './scenes/ArsenalScene.js';
import GameScene from './scenes/GameScene.js';
import PauseScene from './scenes/PauseScene.js';
import GameOverScene from './scenes/GameOverScene.js';

export { SPEC, SCENES } from './data/spec.js';

const headless = typeof navigator !== 'undefined' && /HeadlessChrome/i.test(navigator.userAgent);

export default {
  type: headless ? Phaser.CANVAS : Phaser.AUTO,
  parent: 'game',
  width: SPEC.canvas.width,
  height: SPEC.canvas.height,
  backgroundColor: SPEC.canvas.backgroundColor,
  scale: {
    mode: SPEC.canvas.scaleMode === 'cover' ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: true, pixelArt: false, roundPixels: false, powerPreference: 'high-performance' },
  physics: { default: 'arcade', arcade: { debug: false, fps: 60 } },
  fps: { target: SPEC.performance.targetFps || 60, forceSetTimeOut: false },
  scene: [BootScene, LoadingScene, BattleLoadingScene, HomeScene, ArsenalScene, GameScene, PauseScene, GameOverScene],
};
