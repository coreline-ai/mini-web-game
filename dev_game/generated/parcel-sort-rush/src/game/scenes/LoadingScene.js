import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { IMAGE_PATHS, AUDIO_PATHS } from '../constants/gameKeys.js';
import LoadingUI from '../ui/LoadingUI.js';
import { publishLayoutBounds } from '../systems/LayoutBounds.js';

export default class LoadingScene extends Phaser.Scene {
  constructor() { super(SCENES.LOADING); }
  preload() {
    const ui = new LoadingUI(this);
    this.loadingUi = ui;
    this.failedAssetKeys = [];
    publishLayoutBounds(this, ui.getLayoutItems());
    this.load.on('progress', (v) => {
      ui.setProgress(v);
      publishLayoutBounds(this, ui.getLayoutItems());
    });
    this.load.on('loaderror', (file) => {
      const key = file?.key || file?.src || 'unknown';
      this.failedAssetKeys.push(String(key));
      ui.status.setText('에셋 로딩 재시도 준비 중...');
      publishLayoutBounds(this, ui.getLayoutItems());
    });
    for (const [key, path] of Object.entries(IMAGE_PATHS)) this.load.image(key, path);
    if (SPEC.audio?.enabled) {
      for (const [key, path] of Object.entries(AUDIO_PATHS)) this.load.audio(key, path);
    }
  }
  create() {
    if (this.loadingUi) {
      this.loadingUi.setProgress(1);
      publishLayoutBounds(this, this.loadingUi.getLayoutItems());
    }
    const startHome = () => {
      if (typeof window !== 'undefined') delete window.__RELEASE_LOADING__;
      this.scene.start(SCENES.HOME);
    };
    if (this.failedAssetKeys?.length) {
      const failed = [...new Set(this.failedAssetKeys)].slice(0, 4).join(', ');
      this.loadingUi?.status?.setText(`에셋 로딩 실패: ${failed}`);
      publishLayoutBounds(this, this.loadingUi.getLayoutItems());
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        const tries = Number(url.searchParams.get('assetRetry') || '0');
        if (tries < 2) {
          url.searchParams.set('assetRetry', String(tries + 1));
          this.time.delayedCall(650, () => window.location.replace(url.toString()));
          return;
        }
      }
      this.loadingUi?.status?.setText('네트워크 오류입니다. 새로고침 해주세요.');
      return;
    }
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('qaHoldLoading')) {
      window.__RELEASE_LOADING__ = startHome;
      return;
    }
    this.time.delayedCall(520, startHome);
  }
}
