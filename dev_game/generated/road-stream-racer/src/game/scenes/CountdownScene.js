import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { fontPx, strokePx } from '../utils/scale.js';
import { publishLayout, clearLayout } from '../systems/LayoutRegistry.js';

export default class CountdownScene extends Phaser.Scene {
  constructor() { super(SCENES.COUNTDOWN); }

  create() {
    const { width, height } = SPEC.canvas;
    this.add.image(width / 2, height / 2, ASSET_KEYS.roadFlatLoop).setDisplaySize(width, height).setDepth(1);
    this.add.image(width / 2, height / 2, ASSET_KEYS.forestSideOverlay).setDisplaySize(width, height).setDepth(2);
    this.add.rectangle(0, 0, width, height, 0x07111d, 0.28).setOrigin(0).setDepth(3);
    this.player = this.add.sprite(width / 2, height * 0.82, ASSET_KEYS.player, 0).setDisplaySize(330, 330).setDepth(4);
    if (this.anims.exists('player_drive')) this.player.play('player_drive');
    this.countText = this.add.text(width / 2, height * 0.38, '3', {
      fontFamily: '"Arial Black", Arial, sans-serif',
      fontSize: fontPx(180),
      color: '#ffffff',
      stroke: '#07111d',
      strokeThickness: strokePx(18),
    }).setOrigin(0.5).setDepth(5);
    this.subText = this.add.text(width / 2, height * 0.52, '준비', {
      fontFamily: '"Arial Black", Arial, sans-serif',
      fontSize: fontPx(52),
      color: '#aef5ff',
      stroke: '#07111d',
      strokeThickness: strokePx(8),
    }).setOrigin(0.5).setDepth(5);

    const qaFastCountdown = typeof location !== 'undefined' && /sceneCompositeQa|visualLayoutQa/.test(location.search || '');
    const countdownMs = qaFastCountdown ? 520 : Math.max(2200, (SPEC.session.countdownSeconds || 3) * 1000);
    const frames = [
      { label: '3', sub: '준비' },
      { label: '2', sub: '좌우 탭' },
      { label: '1', sub: '드래그 이동' },
      { label: 'GO', sub: '출발!' },
    ];
    const frameMs = countdownMs / frames.length;
    frames.forEach((frame, index) => {
      this.time.delayedCall(index * frameMs, () => {
        this.countText.setText(frame.label);
        this.subText.setText(frame.sub);
        this.countText.setScale(0.72);
        this.tweens.add({ targets: this.countText, scale: 1, duration: 160, ease: 'Back.easeOut' });
      });
    });
    this.time.delayedCall(countdownMs + 140, () => this.scene.start(SCENES.GAME));
    publishLayout(this, [{ id: 'countdown', obj: this.countText }, { id: 'countdown-tip', obj: this.subText }]);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, clearLayout);
  }
}
