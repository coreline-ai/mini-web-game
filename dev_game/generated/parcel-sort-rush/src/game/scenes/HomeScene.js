import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { SaveData } from '../systems/SaveData.js';
import { AudioManager } from '../systems/AudioManager.js';
import { makeImageTextButton } from '../ui/MobileButton.js';
import { publishLayoutBounds } from '../systems/LayoutBounds.js';

function roundedPanel(scene, width, height, radius = 34) {
  const g = scene.add.graphics();
  g.fillStyle(0x061321, 0.74);
  g.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
  g.lineStyle(5, 0x79eeff, 0.72);
  g.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
  g.lineStyle(2, 0xffffff, 0.20);
  g.strokeRoundedRect(-width / 2 + 9, -height / 2 + 9, width - 18, height - 18, radius - 8);
  return g;
}

function itemSlot(scene, x, y, width, height, label, color = 0x7beeff) {
  const slot = scene.add.graphics();
  slot.fillStyle(0x051321, 0.72);
  slot.fillRoundedRect(x - width / 2, y - height / 2, width, height, 22);
  slot.lineStyle(4, color, 0.82);
  slot.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 22);
  slot.lineStyle(2, 0xffffff, 0.18);
  slot.strokeRoundedRect(x - width / 2 + 7, y - height / 2 + 7, width - 14, height - 14, 16);
  const text = scene.add.text(x, y + height / 2 - 27, label, {
    fontFamily: 'Arial Black, Arial',
    fontSize: '20px',
    color: '#d7fbff',
    stroke: '#001018',
    strokeThickness: 4,
  }).setOrigin(0.5);
  return { slot, text };
}

export default class HomeScene extends Phaser.Scene {
  constructor() { super(SCENES.HOME); }
  create() {
    AudioManager.stopMusic();
    const { width, height } = SPEC.canvas;
    this.add.image(width / 2, height / 2, ASSET_KEYS.backgrounds.day).setDisplaySize(width, height).setDepth(-50);
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.12).setDepth(-40);
    const title1 = this.add.text(width / 2, height * 0.15, 'PARCEL', { fontFamily: 'Arial Black, Arial', fontSize: '116px', color: '#ffffff', stroke: '#000', strokeThickness: 15 }).setOrigin(0.5);
    const title2 = this.add.text(width / 2, height * 0.225, 'SORT RUSH', { fontFamily: 'Arial Black, Arial', fontSize: '102px', color: '#ffd35a', stroke: '#000', strokeThickness: 15 }).setOrigin(0.5);
    this.add.text(width / 2, height * 0.30, '라벨을 보고 올바른 슈트로 드래그!', { fontFamily: 'Arial Black, Arial', fontSize: '34px', color: '#aeefff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);

    const demo = this.add.container(width / 2, height * 0.485);
    const demoFill = roundedPanel(this, 474, 292, 34);
    const demoFrame = this.add.image(0, 0, ASSET_KEYS.ui.panelCard).setDisplaySize(474, 292).setAlpha(1);
    const parcelSlot = itemSlot(this, -108, 26, 180, 156, 'BOX', 0xffd166);
    const chuteSlot = itemSlot(this, 118, 26, 180, 156, 'CHUTE', 0x7beeff);
    demo.add([demoFill, demoFrame, parcelSlot.slot, chuteSlot.slot]);
    demo.add(this.add.text(0, -82, 'A권역 → A 슈트', { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#aeefff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5));
    demo.add(this.add.image(-104, 18, ASSET_KEYS.parcels.north).setDisplaySize(178, 128));
    demo.add(this.add.image(116, 26, ASSET_KEYS.chutes.north).setDisplaySize(148, 168));
    demo.add([parcelSlot.text, chuteSlot.text]);

    this.add.text(width / 2, height * 0.63, 'BEST ' + SaveData.getBest(), { fontFamily: 'Arial Black, Arial', fontSize: '44px', color: '#ffffff', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5);
    this.playButton = makeImageTextButton(this, width / 2, height * 0.725, 'PLAY', ASSET_KEYS.ui.buttonPlay, () => {
      AudioManager.unlock(this);
      AudioManager.playSfx(this, ASSET_KEYS.sfxStart, 0.55);
      this.scene.start(SCENES.GAME);
    }, 540, 126, '64px');
    this.soundButton = makeImageTextButton(this, width / 2, height * 0.825, AudioManager.mute ? 'SOUND OFF' : 'SOUND ON', ASSET_KEYS.ui.buttonSound, () => {
      AudioManager.setMute(this, !AudioManager.mute);
      this.scene.restart();
    }, 440, 99, '38px');
    this.add.text(width / 2, height * 0.925, '정확도 · 콤보 · 러시 물량을 버텨라', { fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#89f7c1', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);

    publishLayoutBounds(this, [
      { id: 'home-title-parcel', object: title1 },
      { id: 'home-title-sort-rush', object: title2 },
      { id: 'home-demo-panel', object: demoFrame, allowOverlap: true },
      { id: 'home-play-button', object: this.playButton.bg },
      { id: 'home-sound-button', object: this.soundButton.bg },
    ]);
  }
}
