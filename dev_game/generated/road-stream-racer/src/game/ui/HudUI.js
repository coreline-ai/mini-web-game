import { SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { fontPx, strokePx } from '../utils/scale.js';

const HUD_TEXT_STYLE = {
  fontFamily: '"Arial Black", Arial, sans-serif',
  stroke: '#061016',
  strokeThickness: strokePx(5),
};

function makeHudButton(scene, x, y, width, height, textureKey, onClick) {
  const container = scene.add.container(x, y);

  const img = scene.add.image(0, 0, textureKey);
  img.setDisplaySize(width, height);

  container.add([img]);
  container.setSize(width, height);
  container.setInteractive({ useHandCursor: true });

  let locked = false;
  const reset = () => {
    locked = false;
    container.setAlpha(1);
    container.setScale(1);
  };
  container.on('pointerdown', () => {
    if (locked) return;
    locked = true;
    container.setAlpha(0.76);
    container.setScale(0.92);
    onClick?.();
  });
  container.on('pointerup', () => {
    container.setAlpha(1);
    container.setScale(1);
  });
  container.on('pointerout', () => {
    container.setAlpha(1);
    container.setScale(1);
  });
  return { bg: container, reset, destroy: () => container.destroy(true) };
}

function makeHudStrip(scene, x, y, width, height) {
  const container = scene.add.container(x, y).setDepth(20);
  const bg = scene.add.rectangle(0, 0, width, height, 0x092238, 0.84)
    .setOrigin(0)
    .setStrokeStyle(2, 0x5fe7ff, 0.64);
  const glow = scene.add.rectangle(7, 6, width - 14, 2, 0xb7fbff, 0.58).setOrigin(0);
  const shade = scene.add.rectangle(0, 0, width, height, 0x4edbff, 0.06).setOrigin(0);
  const divider1 = scene.add.rectangle(168, 12, 2, height - 24, 0x83efff, 0.36).setOrigin(0);
  const divider2 = scene.add.rectangle(286, 12, 2, height - 24, 0x83efff, 0.36).setOrigin(0);
  const divider3 = scene.add.rectangle(474, 12, 2, height - 24, 0x83efff, 0.36).setOrigin(0);

  const scoreText = scene.add.text(18, height / 2, '점수 0', {
    ...HUD_TEXT_STYLE,
    fontSize: fontPx(27),
    color: '#ffe56a',
  }).setOrigin(0, 0.5);

  const coinIcon = scene.add.image(198, height / 2, ASSET_KEYS.racerIconCoin).setDisplaySize(30, 30);
  const coinText = scene.add.text(222, height / 2, '0', {
    ...HUD_TEXT_STYLE,
    fontSize: fontPx(26),
    color: '#ffd95a',
  }).setOrigin(0, 0.5);

  const speedIcon = scene.add.image(320, height / 2, ASSET_KEYS.racerIconSpeed).setDisplaySize(30, 30);
  const speedText = scene.add.text(346, height / 2, '속도 0', {
    ...HUD_TEXT_STYLE,
    fontSize: fontPx(24),
    color: '#82e9ff',
  }).setOrigin(0, 0.5);

  const levelIcon = scene.add.image(510, height / 2, ASSET_KEYS.racerIconLevel).setDisplaySize(30, 30);
  const levelText = scene.add.text(536, height / 2, '1', {
    ...HUD_TEXT_STYLE,
    fontSize: fontPx(26),
    color: '#d4a3ff',
  }).setOrigin(0, 0.5);

  container.add([bg, shade, glow, divider1, divider2, divider3, scoreText, coinIcon, coinText, speedIcon, speedText, levelIcon, levelText]);
  container.setSize(width, height);
  return { container, scoreText, coinText, speedText, levelText };
}

export default class HudUI {
  constructor(scene, onPause, onHome) {
    const { width } = SPEC.canvas;

    this.panel = scene.add.container(0, 0).setDepth(19);
    const strip = makeHudStrip(scene, 230, 42, 600, 72);
    this.panel.add(strip.container);
    this.scoreText = strip.scoreText;
    this.coinText = strip.coinText;
    this.speedText = strip.speedText;
    this.levelText = strip.levelText;

    // 부스트 텍스트
    this.boostText = scene.add.text(width / 2, 152, '', { fontFamily: '"Arial Black", Arial, sans-serif', fontSize: fontPx(32), color: '#5cffbd', stroke: '#07111d', strokeThickness: strokePx(6) }).setOrigin(0.5).setDepth(20);

    this.home = makeHudButton(scene, 898, 78, 96, 96, ASSET_KEYS.racerUiHome, onHome);
    this.pause = makeHudButton(scene, 1000, 78, 96, 96, ASSET_KEYS.racerUiPause, onPause);

    this.pause.bg.setDepth(20);
    this.home.bg.setDepth(20);
  }
  update({ score, level, coins, speed, boostMs }) {
    this.scoreText.setText('점수 ' + score);
    this.coinText.setText(String(coins));
    this.speedText.setText('속도 ' + Math.round(speed));
    this.levelText.setText(String(level));
    this.boostText.setText(boostMs > 0 ? `부스트 ${Math.ceil(boostMs / 1000)}초` : '');
  }
  setVisible(v) {
    this.panel.setVisible(v);
    this.scoreText.setVisible(v);
    this.coinText.setVisible(v);
    this.speedText.setVisible(v);
    this.levelText.setVisible(v);
    this.boostText.setVisible(v);
    this.home.bg.setVisible(v);
    this.pause.bg.setVisible(v);
    if (v) {
      this.home.reset?.();
      this.pause.reset?.();
    }
  }
}
