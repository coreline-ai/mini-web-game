import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { SaveData } from '../systems/SaveData.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayout } from '../systems/LayoutRegistry.js';
import { AudioManager } from '../systems/AudioManager.js';
import { configureLogicalScene } from '../systems/LogicalViewport.js';

export default class ResultScene extends Phaser.Scene {
  constructor() { super(SCENES.RESULT); }
  create(data = {}) {
    configureLogicalScene(this);
    AudioManager.stopMusic();
    const { width, height } = SPEC.canvas;
    const score = data.score || 0; SaveData.record(score);
    this.add.image(width / 2, height / 2, ASSET_KEYS.bgBridge).setDisplaySize(width, height).setTint(0x647787);
    this.add.rectangle(0, 0, width, height, 0x020c14, 0.55).setOrigin(0);
    this.add.rectangle(width / 2, 336, 348, 490, 0x03131e, 0.93).setStrokeStyle(2, 0x55e6bd, 0.85);
    this.add.text(width / 2, 126, 'MISSION COMPLETE', { fontFamily: 'Arial Black, Arial', fontSize: '31px', color: '#66f1c2', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    this.add.text(width / 2, 174, data.reason || 'EXTRACTION SECURED', { fontFamily: 'Arial Black, Arial', fontSize: '11px', color: '#b9d4dd' }).setOrigin(0.5);
    this.add.image(width / 2, 262, ASSET_KEYS.heroGunship).setDisplaySize(310, 175);
    const rank = score >= 6500 ? 'S' : score >= 4200 ? 'A' : 'B';
    this.add.text(58, 366, `RANK\n${rank}`, { fontFamily: 'Arial Black, Arial', fontSize: '23px', color: '#ffcf63', align: 'center' });
    this.add.text(170, 360, `SCORE  ${String(score).padStart(6, '0')}\nACCURACY  ${data.accuracy || 0}%\nCONVOY  ${Math.round((data.convoyHp || 0) / 10)}%`, { fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#ffffff', lineSpacing: 9 });
    this.retry = makeTextButton(this, width / 2, 626, 'FLY AGAIN', () => this.time.delayedCall(32, () => this.scene.start(SCENES.BRIEFING)), 270, 62);
    this.home = makeTextButton(this, width / 2, 708, 'COMMAND', () => this.time.delayedCall(32, () => this.scene.start(SCENES.HOME)), 220, 52, 0x6e91a0);
    publishLayout(this, [{ id: 'retry', obj: this.retry.bg }, { id: 'home', obj: this.home.bg }]);
  }
}
