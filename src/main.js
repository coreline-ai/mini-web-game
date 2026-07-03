import Phaser from 'phaser';
import { GC } from './config/gameConfig.js';
import { Save } from './systems/SaveData.js';
import BootScene from './scenes/BootScene.js';
import HomeScene from './scenes/HomeScene.js';
import ShopScene from './scenes/ShopScene.js';
import RankingScene from './scenes/RankingScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import GameScene from './scenes/GameScene.js';
import PauseScene from './scenes/PauseScene.js';
import GameOverScene from './scenes/GameOverScene.js';

const config = {
  type: Phaser.CANVAS,
  parent: 'game',
  backgroundColor: GC.BG_COLOR,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GC.WIDTH,
    height: GC.HEIGHT,
  },
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  input: { activePointers: 2 }, // 동시 터치 2개(이동 중에도 일시정지 버튼 터치 가능)
  scene: [BootScene, HomeScene, ShopScene, RankingScene, SettingsScene, GameScene, PauseScene, GameOverScene],
};

const game = new Phaser.Game(config);
window.__GAME = game; // 디버그/자동화 훅
window.__SAVE = Save;
