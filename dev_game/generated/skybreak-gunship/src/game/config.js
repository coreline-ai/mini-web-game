import Phaser from 'phaser';
import { SPEC, SCENES } from './data/spec.js';
import BootScene from './scenes/BootScene.js';
import LoadingScene from './scenes/LoadingScene.js';
import HomeScene from './scenes/HomeScene.js';
import BriefingScene from './scenes/BriefingScene.js';
import GameScene from './scenes/GameScene.js';
import PauseScene from './scenes/PauseScene.js';
import ResultScene from './scenes/ResultScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import { PHYSICAL_HEIGHT, PHYSICAL_WIDTH } from './systems/LogicalViewport.js';

export { SPEC, SCENES } from './data/spec.js';

export default {
  type: Phaser.CANVAS,
  parent: 'game',
  width: PHYSICAL_WIDTH,
  height: PHYSICAL_HEIGHT,
  backgroundColor: SPEC.canvas.backgroundColor,
  scale: {
    mode: SPEC.canvas.scaleMode === 'cover' ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: { default: 'arcade', arcade: { debug: false } },
  input: { activePointers: 3 },
  fps: { target: SPEC.performance.targetFps || 60, forceSetTimeOut: false },
  render: { antialias: true, pixelArt: false, roundPixels: false, transparent: false },
  scene: [BootScene, LoadingScene, HomeScene, BriefingScene, GameScene, PauseScene, ResultScene, GameOverScene],
};
