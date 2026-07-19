import Phaser from 'phaser';
import './styles.css';
import { W, H } from './constants.js';
import BootScene from './scenes/BootScene.js';
import LoadingScene from './scenes/LoadingScene.js';
import HomeScene from './scenes/HomeScene.js';
import GameScene from './scenes/GameScene.js';
import PauseScene from './scenes/PauseScene.js';
import ResultScene from './scenes/ResultScene.js';
import { GAME_CONFIG } from './config/gameConfig.js';

const config = {
  type: Phaser.AUTO, parent: 'game', width: W, height: H, backgroundColor: '#07131d',
  render: { antialias: true, pixelArt: false, roundPixels: true },
  // Pointer 0 is reserved for the mouse. Four active touch pointers cover the
  // joystick plus fire, jump and grenade without dropping later contacts.
  input: { activePointers: 4, touch: { capture: true }, windowEvents: true },
  // EXPAND keeps the authored 720px logical height while widening the visible
  // game area on modern 19.5:9 / 21:9 phones instead of adding black side bars.
  scale: { width: W, height: H, mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: GAME_CONFIG.physics.gravityY }, debug: GAME_CONFIG.physics.debug } },
  fps: { target: 60, forceSetTimeOut: false },
  scene: [BootScene, LoadingScene, HomeScene, GameScene, PauseScene, ResultScene]
};
window.addEventListener('load', () => { window.__GAME__ = new Phaser.Game(config); });
