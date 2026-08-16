import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { publishLayoutStable } from '../systems/LayoutRegistry.js';
import { px, font, PALETTE } from '../config/theme.js';

const BACKDROPS = ['stage-1', 'stage-2', 'stage-3', 'stage-4', 'stage-5'];
const SPRITES = ['keeper-ready', 'keeper-dive', 'keeper-catch', 'match-ball', 'striker', 'defender'];
const UI = ['panel-scoreboard', 'btn-pause'];
const FX = ['fx-impact', 'fx-glove', 'fx-net-ripple', 'fx-turf', 'fx-rain'];

export default class LoadingScene extends Phaser.Scene {
  constructor() { super(SCENES.LOADING); }

  preload() {
    const ext = '.webp';
    // 첫 화면에 필요한 것만 선로드한다. 배경 5장과 BGM을 한 번에 올리면 큰 텍스처 업로드와
    // 오디오 디코드가 겹쳐 첫 화면이 몇 초씩 늦어진다(직전 게임에서 실측).
    this.load.image('bg_0', `backgrounds/${BACKDROPS[0]}${ext}`);
    SPRITES.forEach((id) => this.load.image(id, `characters/${id}${ext}`));
    UI.forEach((id) => this.load.image(id, `ui/${id}${ext}`));
    FX.forEach((id) => this.load.image(id, `fx/${id}${ext}`));
    this.load.audio('sfx-shot', 'audio/shot-impact.wav');
    this.load.audio('sfx-punch', 'audio/punch.wav');
    this.load.audio('sfx-catch', 'audio/catch.wav');
    this.load.audio('sfx-net', 'audio/net-ripple.wav');
    this.load.audio('sfx-whistle', 'audio/whistle.wav');
    this.load.on('loaderror', (file) => {
      this.failedAssets = this.failedAssets || [];
      this.failedAssets.push(file?.key || 'unknown');
    });
  }

  create() {
    const { width, height } = SPEC.canvas;
    this.cameras.main.setBackgroundColor(SPEC.canvas.backgroundColor);
    this.title = this.add.text(width / 2, height * 0.44, SPEC.game.title, {
      fontFamily: 'Arial Black,Arial', fontSize: font(30), color: PALETTE.text,
      align: 'center', wordWrap: { width: width - px(60) },
    }).setOrigin(0.5);
    this.status = this.add.text(width / 2, height * 0.53, 'Warming up…', {
      fontFamily: 'Arial', fontSize: font(15), color: PALETTE.textDim,
    }).setOrigin(0.5);

    if (typeof window !== 'undefined') window.__KEEPER_ASSET_ERRORS__ = this.failedAssets || [];

    publishLayoutStable(this, [
      { id: 'loading-title', obj: this.title },
      { id: 'loading-status', obj: this.status },
    ], { requiredIds: ['loading-title', 'loading-status'] });

    // 캡처 러너가 로딩 화면을 관측할 수 있게 하는 훅. 실사용 경로는 영향받지 않는다.
    const hold = typeof window !== 'undefined' && /(?:\?|&)qaHoldLoading=1/.test(window.location.search);
    const go = () => { this.scene.start(SCENES.HOME); this.queueRest(); };
    if (hold) { window.__RELEASE_LOADING__ = go; return; }
    this.time.delayedCall(140, go);
  }

  // 홈이 뜬 뒤 나머지를 조용히 채운다. 도착 전에 스테이지가 넘어가도 텍스처 부재를 확인하고
  // 현재 배경을 유지하므로 깨지지 않는다.
  queueRest() {
    const loader = this.scene.get(SCENES.HOME)?.load || this.load;
    BACKDROPS.slice(1).forEach((id, i) => {
      const key = `bg_${i + 1}`;
      if (!this.textures.exists(key)) loader.image(key, `backgrounds/${id}.webp`);
    });
    if (!this.cache.audio.exists('bgm-home')) loader.audio('bgm-home', 'audio/home-loop.wav');
    if (!this.cache.audio.exists('bgm-gameplay')) loader.audio('bgm-gameplay', 'audio/gameplay-loop.wav');
    loader.start();
  }
}
