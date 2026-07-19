import Phaser from 'phaser';
import { ASSETS, COLORS, SCENES } from '../constants.js';
import { button, coverImage, cssScale, label, panel, panelContentBounds, panelContentInsets, resizePanel, responsiveFontSize } from '../ui.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { publishLayout } from '../systems/LayoutRegistry.js';
import { Audio } from '../audio.js';

export default class HomeScene extends Phaser.Scene {
  constructor() { super(SCENES.HOME); }

  create() {
    Audio.stopAll(this); Audio.playMusic(this, 'music-home', 0.2);
    const centerX = this.cameras.main.width / 2;
    const save = SaveSystem.load();
    this.continueState = save.continueRun;
    this.homeBg = this.add.image(centerX, this.cameras.main.height / 2, ASSETS.bgHarbor).setDepth(-10).setTint(0x9ecad0);
    this.homeShade = this.add.rectangle(centerX, this.cameras.main.height / 2, 1, 1, 0x04111a, 0.42).setDepth(-5); // asset-coverage-allow cinematic-color-grade
    this.homePanel = panel(this, centerX, 360, 760, 590).setAlpha(0.44).setDepth(-1);
    this.kicker = label(this, centerX, 105, 'ARMORED COURIER // ORIGINAL RUN & GUN', 18, '#49d8d1');
    this.title = label(this, centerX, 195, '철갑특송', 68, '#f7e7bd');
    this.subtitle = label(this, centerX, 258, 'LAST LINE', 34, '#ff8c42');
    this.premise = label(this, centerX, 326, '붕괴한 항구를 돌파하고 생존자와 수송차를 지켜라', 20, '#d7e9e8');
    const checkpointText = this.continueState ? ` · 체크포인트 ${this.continueState.segmentName}` : '';
    this.best = label(this, centerX, 382, `최고 점수 ${save.best.toLocaleString('ko-KR')}${checkpointText}`, 19, '#ffc857');
    this.continueButton = button(this, centerX - 130, 455, '이어서 하기', () => this.continueRun(), 230, 72, COLORS.cyan);
    this.playButton = button(this, centerX + 130, 455, '새 작전', () => this.startNewRun(), 230, 72, COLORS.orange);
    this.guide = label(this, centerX, 520, '', 17, '#b9d0d4');
    this.mobileGuide = label(this, centerX, 552, '', 16, '#8fb7bf');

    this.playButton.bg.setData('actionState', 'enabled');
    if (this.continueState) {
      this.continueButton.bg.setData('actionState', 'enabled').setData('checkpoint', this.continueState.encounterId);
    } else {
      this.continueButton.bg.disableInteractive().setAlpha(0.38).setTint(COLORS.steel).setData('actionState', 'disabled');
      this.continueButton.text.setAlpha(0.55);
    }

    this.layoutViewport();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutViewport, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutViewport, this);
      this.tweens.killTweensOf(this.homeBg);
    });
  }

  startNewRun() {
    Audio.sfx(this, 'sfx-ui');
    Audio.stopMusic();
    SaveSystem.clearContinue();
    this.scene.start(SCENES.GAME, { mode: 'new' });
  }

  continueRun() {
    const checkpoint = SaveSystem.getContinue();
    if (!checkpoint) return;
    Audio.sfx(this, 'sfx-ui');
    Audio.stopMusic();
    this.scene.start(SCENES.GAME, { mode: 'continue' });
  }

  layoutViewport() {
    if (!this.homePanel || !this.playButton || !this.continueButton) return;
    const viewW = this.cameras.main.width;
    const viewH = this.cameras.main.height;
    const centerX = viewW / 2;
    const canvasWidth = this.scale?.canvasBounds?.width ?? window.innerWidth;
    const compact = canvasWidth < 1100;
    const panelWidth = compact ? Math.min(920, viewW - 120) : 760;
    const panelHeight = compact ? 620 : 590;
    const supportSize = (base) => responsiveFontSize(this, base, 12.5);
    const scale = cssScale(this);

    this.tweens.killTweensOf(this.homeBg);
    this.homeBg.setPosition(centerX, viewH / 2);
    coverImage(this, this.homeBg, viewW, viewH);
    const baseScaleX = this.homeBg.scaleX;
    const baseScaleY = this.homeBg.scaleY;
    this.tweens.add({ targets: this.homeBg, scaleX: baseScaleX * 1.025, scaleY: baseScaleY * 1.025, duration: 6000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.homeShade.setPosition(centerX, viewH / 2).setSize(viewW, viewH).setDisplaySize(viewW, viewH);
    resizePanel(this.homePanel, panelWidth, panelHeight);
    this.homePanel.setPosition(centerX, 360);

    const place = (object, y) => object.setPosition(centerX, y);
    place(this.kicker, 105); this.kicker.setFontSize(supportSize(18));
    place(this.title, compact ? 201 : 195); this.title.setFontSize(68);
    place(this.subtitle, compact ? 270 : 258); this.subtitle.setFontSize(34);
    place(this.premise, 326); this.premise.setFontSize(supportSize(20));
    place(this.best, compact ? 363 : 382); this.best.setFontSize(supportSize(19));

    const resolvedButtonHeight = compact ? Math.max(72, 46 / Math.max(0.001, scale.y)) : 72;
    const buttonFontSize = compact ? Math.max(24, 16 / Math.max(0.001, scale.y)) : 24;
    const buttonY = compact ? 435 : 455;
    this.continueButton.setDisplaySize(230, resolvedButtonHeight).setFontSize(buttonFontSize).setPosition(centerX - 130, buttonY);
    this.playButton.setDisplaySize(230, resolvedButtonHeight).setFontSize(buttonFontSize).setPosition(centerX + 130, buttonY);

    this.guide.setText(compact
      ? '조이스틱 이동·숙이기 · 오른쪽 버튼 사격·점프·수류탄'
      : '이동 WASD · 숙이기 S/↓ · 점프 Space · 사격 J · 수류탄 K');
    this.mobileGuide.setText(compact
      ? '숙이기 조이스틱↓ · 직사탄 회피 · 점프로 캣워크 진입'
      : '모바일: 왼쪽 조이스틱↓ 숙이기 · 직사탄 회피 · 상단 구조물 점프');
    place(this.guide, compact ? 507 : 520); this.guide.setFontSize(supportSize(17));
    place(this.mobileGuide, compact ? 544 : 552); this.mobileGuide.setFontSize(supportSize(16));

    const safe = panelContentBounds(this.homePanel);
    const wrapWidth = Math.max(240, safe.width - 24);
    for (const object of [this.premise, this.best, this.guide, this.mobileGuide]) object.setWordWrapWidth(wrapWidth, true).setAlign('center');
    this.publishHomeLayout();
  }

  publishHomeLayout() {
    const content = { id: 'home-panel', obj: this.homePanel, insets: panelContentInsets(this.homePanel) };
    publishLayout(this, [
      { id: 'home-background', obj: this.homeBg, role: 'background', meta: { scaleMode: 'aspect-cover' }, checkOverlap: false, checkClipping: false },
      { id: 'home-panel', obj: this.homePanel, role: 'panel', meta: { safeInsets: panelContentInsets(this.homePanel) }, checkOverlap: false },
      { id: 'home-kicker', obj: this.kicker, meta: { frameSlot: 'header' } },
      { id: 'home-title', obj: this.title, container: content },
      { id: 'home-subtitle', obj: this.subtitle, container: content },
      { id: 'home-premise', obj: this.premise, container: content },
      { id: 'home-best', obj: this.best, container: content },
      { id: 'home-continue', obj: this.continueButton.bg, role: 'button', container: content },
      { id: 'home-continue-label', obj: this.continueButton.text, role: 'button-label', container: content, checkOverlap: false },
      { id: 'home-play', obj: this.playButton.bg, role: 'button', container: content },
      { id: 'home-play-label', obj: this.playButton.text, role: 'button-label', container: content, checkOverlap: false },
      { id: 'home-guide', obj: this.guide, container: content },
      { id: 'home-mobile-guide', obj: this.mobileGuide, container: content },
    ]);
  }
}
