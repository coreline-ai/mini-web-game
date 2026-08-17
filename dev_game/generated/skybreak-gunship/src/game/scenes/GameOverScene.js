import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { SaveData } from '../systems/SaveData.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayout } from '../systems/LayoutRegistry.js';
import { AudioManager } from '../systems/AudioManager.js';
import { configureLogicalScene } from '../systems/LogicalViewport.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super(SCENES.GAMEOVER); }
  create(data = {}) {
    configureLogicalScene(this);
    AudioManager.stopMusic();
    const { width, height } = SPEC.canvas;
    const score = data.score || 0; SaveData.record(score);
    this.add.image(width / 2, height / 2, ASSET_KEYS.bgConflict).setDisplaySize(width, height).setTint(0x4a3034);
    this.add.rectangle(0, 0, width, height, 0x140508, 0.62).setOrigin(0);
    this.add.rectangle(width / 2, 340, 348, 460, 0x120a0d, 0.94).setStrokeStyle(2, 0xff554f, 0.9);
    this.add.text(width / 2, 142, 'MISSION FAILED', { fontFamily: 'Arial Black, Arial', fontSize: '34px', color: '#ff655e', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    this.add.text(width / 2, 198, data.reason || 'CONVOY LOST', { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
    this.add.image(width / 2, 300, ASSET_KEYS.rescueTruck).setDisplaySize(160, 160).setTint(0x7b5555);
    this.add.text(width / 2, 414, `SCORE  ${String(score).padStart(6, '0')}\nACCURACY  ${data.accuracy || 0}%\nBEST  ${String(SaveData.getBest()).padStart(6, '0')}`, { fontFamily: 'Arial Black, Arial', fontSize: '16px', align: 'center', color: '#ffffff', lineSpacing: 10 }).setOrigin(0.5);
    this.retry = makeTextButton(this, width / 2, 620, 'RETRY MISSION', () => this.time.delayedCall(32, () => this.scene.start(SCENES.GAME)), 270, 62, 0xffb43b);
    this.home = makeTextButton(this, width / 2, 704, 'COMMAND', () => this.time.delayedCall(32, () => this.scene.start(SCENES.HOME)), 220, 52, 0x6e91a0);
    publishLayout(this, [{ id: 'retry', obj: this.retry.bg }, { id: 'home', obj: this.home.bg }]);
  }
}
