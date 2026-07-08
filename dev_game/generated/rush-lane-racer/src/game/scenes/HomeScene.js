import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { SaveData } from '../systems/SaveData.js';
import { AudioManager } from '../systems/AudioManager.js';
import RoadRenderer from '../systems/RoadRenderer.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayout, objectBounds, manualBounds } from '../systems/LayoutRegistry.js';

export default class HomeScene extends Phaser.Scene {
  constructor() { super(SCENES.HOME); }
  create() {
    AudioManager.stopMusic();
    const { width, height } = SPEC.canvas;
    this.road = new RoadRenderer(this, false);
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.18).setDepth(1);
    this.title1 = this.add.text(width / 2, height * 0.145, 'RUSH LANE', { fontFamily: 'Arial Black, Arial', fontSize: '104px', color: '#ffffff', align: 'center', stroke: '#122033', strokeThickness: 14 }).setOrigin(0.5).setDepth(3);
    this.title2 = this.add.text(width / 2, height * 0.215, 'RACER', { fontFamily: 'Arial Black, Arial', fontSize: '124px', color: '#ffdf4a', align: 'center', stroke: '#1a1010', strokeThickness: 16 }).setOrigin(0.5).setDepth(3);
    this.subtitle = this.add.text(width / 2, height * 0.295, 'DRAG LEFT / RIGHT · SURVIVE TRAFFIC', { fontFamily: 'Arial Black, Arial', fontSize: '32px', color: '#bdeeff', align: 'center', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(3);
    this.hero = this.add.image(width / 2, height * 0.475, ASSET_KEYS.player).setDisplaySize(370, 358).setDepth(5);
    this.best = this.add.text(width / 2, height * 0.665, 'BEST ' + SaveData.getBest(), { fontFamily: 'Arial Black, Arial', fontSize: '42px', color: '#ffffff', stroke: '#000', strokeThickness: 7 }).setOrigin(0.5).setDepth(5);
    this.playButton = makeTextButton(this, width / 2, height * 0.755, 'PLAY', () => { AudioManager.unlock(this); AudioManager.playSfx(this, ASSET_KEYS.sfxStart, 0.55); this.scene.start(SCENES.GAME); }, 520, 126, 0x24cc58, '70px');
    this.soundButton = makeTextButton(this, width / 2, height * 0.852, AudioManager.mute ? 'SOUND OFF' : 'SOUND ON', () => { AudioManager.setMute(this, !AudioManager.mute); this.scene.restart(); }, 380, 92, 0x187bd9, '40px');
    this.footer = this.add.text(width / 2, height * 0.935, '90s ARCADE · MOBILE SURVIVAL STARTER', { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#7ee9ff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(4);
    this.publishLayout();
  }
  publishLayout() {
    const { width, height } = SPEC.canvas;
    publishLayout(this, 'Home', [
      manualBounds(this, 'home-title', width * 0.16, height * 0.09, width * 0.68, height * 0.19),
      objectBounds(this, this.subtitle, 'home-subtitle'),
      objectBounds(this, this.hero, 'home-hero-car'),
      objectBounds(this, this.best, 'home-best'),
      objectBounds(this, this.playButton.bg, 'play-button', { allowStretch: true }),
      objectBounds(this, this.soundButton.bg, 'sound-button', { allowStretch: true }),
      objectBounds(this, this.footer, 'home-footer'),
    ], ['home-title', 'home-hero-car', 'play-button', 'sound-button']);
  }
  update(_time, delta) {
    this.road?.update(delta, 720, false, false, 1);
    this.publishLayout();
  }
}
