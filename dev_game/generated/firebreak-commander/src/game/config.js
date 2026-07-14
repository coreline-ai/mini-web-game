import Phaser from 'phaser';
import { SPEC, SCENES } from './data/spec.js';
import BootScene from './scenes/BootScene.js';
import LoadingScene from './scenes/LoadingScene.js';
import HomeScene from './scenes/HomeScene.js';
import TutorialScene from './scenes/TutorialScene.js';
import GameScene from './scenes/GameScene.js';
import PauseScene from './scenes/PauseScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import { PHYSICAL_HEIGHT, PHYSICAL_WIDTH } from './systems/LogicalViewport.js';

export { SPEC, SCENES } from './data/spec.js';

export default {
  // Codex in-app Browser/WebView may expose an incomplete WebGL context.
  // Force the Canvas renderer so the game can initialize reliably there.
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
  fps: { target: SPEC.performance.targetFps || 60, forceSetTimeOut: false },
  scene: [BootScene, LoadingScene, HomeScene, TutorialScene, GameScene, PauseScene, GameOverScene],
};
