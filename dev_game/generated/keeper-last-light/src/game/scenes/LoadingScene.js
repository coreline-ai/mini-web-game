import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { publishLayoutStable } from '../systems/LayoutRegistry.js';
import { U, px, font, PALETTE } from '../config/theme.js';

// 런타임 에셋 목록. 경로는 publicDir(assets) 기준이므로 assets/ 접두사를 뺀다.
const BACKDROPS = ['stage-1', 'stage-2', 'stage-3', 'stage-4', 'stage-5'];
const SHIPS = ['ship-cargo', 'ship-fishing', 'ship-ferry', 'ship-wreck'];
const UI = ['btn-lamp', 'btn-pause', 'panel-code'];
const FX = ['fx-beam-pulse', 'fx-route-ring', 'fx-wreck-flash', 'fx-sea-spray'];

export default class LoadingScene extends Phaser.Scene {
  constructor() { super(SCENES.LOADING); }

  preload() {
    // 생성 파이프라인이 런타임을 WebP로 내보내므로 .webp를 우선 시도한다.
    const ext = '.webp';
    // 스테이지 배경은 1장만 선로드한다. 5장을 한 번에 올리면 1440x3120 텍스처 5개(≈90MB)를
    // 동시에 업로드하느라 첫 화면이 몇 초씩 늦어진다 — 저사양 기기와 헤드리스 QA 모두에서
    // 실측된 지연이다. 나머지는 홈 진입 후 배경에서 채운다.
    this.load.image('bg_0', `backgrounds/${BACKDROPS[0]}${ext}`);
    SHIPS.forEach((id) => this.load.image(id, `characters/${id}${ext}`));
    UI.forEach((id) => this.load.image(id, `ui/${id}${ext}`));
    FX.forEach((id) => this.load.image(id, `fx/${id}${ext}`));
    this.load.audio('sfx-short', 'audio/pulse-short.wav');
    this.load.audio('sfx-long', 'audio/pulse-long.wav');
    this.load.audio('sfx-accepted', 'audio/route-accepted.wav');
    this.load.audio('sfx-wreck', 'audio/wreck.wav');
    this.load.audio('sfx-stage-clear', 'audio/stage-clear.wav');
    // BGM은 첫 화면에 필요 없다. 초기 페이로드에서 빼고 홈 진입 후 채운다 — 콜드 스타트
    // 로드 예산(6초)을 넘기던 가장 큰 항목이었다.
    this.load.on('loaderror', (file) => {
      // 개별 에셋 로드 실패는 조용히 넘기지 않는다 — QA 훅에 남겨 캡처에서 드러나게 한다.
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
    this.status = this.add.text(width / 2, height * 0.53, 'Lighting the lamp…', {
      fontFamily: 'Arial', fontSize: font(15), color: PALETTE.textDim,
    }).setOrigin(0.5);

    if (typeof window !== 'undefined') {
      window.__KEEPER_ASSET_ERRORS__ = this.failedAssets || [];
    }

    publishLayoutStable(this, [
      { id: 'loading-title', obj: this.title },
      { id: 'loading-status', obj: this.status },
    ], { requiredIds: ['loading-title', 'loading-status'] });

    // 캡처 러너가 로딩 화면을 관측할 수 있도록 하는 훅. 실사용 경로는 영향받지 않는다.
    const hold = typeof window !== 'undefined' && /(?:\?|&)qaHoldLoading=1/.test(window.location.search);
    const go = () => {
      this.scene.start(SCENES.HOME);
      this.queueRemainingBackdrops();
    };
    if (hold) { window.__RELEASE_LOADING__ = go; return; }
    this.time.delayedCall(140, go);
  }

  // 홈이 뜬 뒤 나머지 스테이지 배경을 조용히 채운다. 도착 전에 스테이지가 넘어가면
  // StageDirector가 텍스처 부재를 확인하고 현재 배경을 유지하므로 깨지지 않는다.
  queueRemainingBackdrops() {
    const loader = this.scene.get(SCENES.HOME)?.load || this.load;
    if (!this.cache.audio.exists('bgm-home')) loader.audio('bgm-home', 'audio/home-loop.wav');
    if (!this.cache.audio.exists('bgm-gameplay')) loader.audio('bgm-gameplay', 'audio/gameplay-loop.wav');
    BACKDROPS.slice(1).forEach((id, i) => {
      const key = `bg_${i + 1}`;
      if (!this.textures.exists(key)) loader.image(key, `backgrounds/${id}.webp`);
    });
    loader.start();
  }
}
