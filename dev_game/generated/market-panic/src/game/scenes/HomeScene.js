import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { SaveData } from '../systems/SaveData.js';
import { AudioManager } from '../systems/AudioManager.js';
import DomSceneUI from '../ui/DomSceneUI.js';
import { openHelpOverlay } from '../ui/HelpOverlay.js';

export default class HomeScene extends Phaser.Scene {
  constructor() { super(SCENES.HOME); }
  create() {
    AudioManager.stopMusic();
    const { width, height } = SPEC.canvas;
    this.add.rectangle(0, 0, width, height, 0x07111f).setOrigin(0);
    if (this.textures.exists('bg_0')) {
      const bg = this.add.image(width / 2, height / 2, 'bg_0').setAlpha(0.92);
      const scale = Math.max(width / bg.width, height / bg.height);
      bg.setScale(scale);
    }
    this.add.image(width / 2, height * 0.31, ASSET_KEYS.player).setDisplaySize(112, 112);
    this.domUi = new DomSceneUI(this, 'Home', 'mp-home-ui', `
      <h1 data-layout-id="title">마켓 패닉</h1>
      <p class="mp-home-subtitle" data-layout-id="subtitle">뉴스를 해석해 한 번만 결정하세요</p>
      <section class="mp-home-panel" data-layout-id="menu-panel">
        <ol data-layout-id="rules">
          <li>출처·변동·시간축 해석</li>
          <li>뉴스 종목을 직접 선택</li>
          <li>뉴스당 한 번만 행동 결정</li>
        </ol>
        <strong class="mp-home-goal">목표: 수익·위험·신뢰 균형</strong>
        <div class="mp-home-best" data-layout-id="best">최고 점수 ${SaveData.getBest()}</div>
        <button class="mp-menu-button mp-home-play" data-layout-id="play" type="button">게임 시작</button>
        <button class="mp-menu-button mp-home-help" data-layout-id="help" type="button">? 도움말</button>
        <button class="mp-menu-button mp-home-sound" data-layout-id="sound" type="button">${AudioManager.mute ? '소리 끔' : '소리 켬'}</button>
      </section>
    `);
    this.domUi.on('.mp-home-play', () => {
      AudioManager.unlock(this);
      AudioManager.playSfx(this, ASSET_KEYS.sfxStart, 0.55);
      this.scene.start(SCENES.GAME);
    });
    this.domUi.on('.mp-home-help', (_event, button) => {
      openHelpOverlay(this.domUi);
      button.disabled = false;
    });
    this.domUi.on('.mp-home-sound', (_event, button) => {
      AudioManager.setMute(this, !AudioManager.mute);
      button.textContent = AudioManager.mute ? '소리 끔' : '소리 켬';
      button.disabled = false;
    });
  }
}
