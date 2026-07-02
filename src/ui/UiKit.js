import { GC } from '../config/gameConfig.js';

// 메뉴 공용 UI 헬퍼.
export function playClick(scene) {
  if (scene.cache.audio.exists(GC.AUDIO.ui.buttonClick.key)) {
    scene.sound.play(GC.AUDIO.ui.buttonClick.key, { volume: 0.6 });
  }
}

export function iconButton(scene, x, y, key, onClick, size = 112) {
  const btn = scene.add.image(x, y, key).setDisplaySize(size, size).setInteractive({ useHandCursor: true });
  btn.on('pointerover', () => btn.setScale(btn.scaleX * 1.08));
  btn.on('pointerout', () => btn.setDisplaySize(size, size));
  btn.on('pointerdown', () => { playClick(scene); scene.tweens.add({ targets: btn, scale: btn.scaleX * 0.9, duration: 80, yoyo: true }); onClick(); });
  return btn;
}

export function textButton(scene, x, y, label, onClick, opts = {}) {
  const t = scene.add
    .text(x, y, label, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: opts.fontSize || '60px',
      color: opts.color || '#ffffff',
      backgroundColor: opts.bg || '#00000066',
      padding: { x: opts.padX ?? 46, y: opts.padY ?? 20 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  t.on('pointerover', () => t.setColor('#ffd54a'));
  t.on('pointerout', () => t.setColor(opts.color || '#ffffff'));
  t.on('pointerdown', () => { playClick(scene); onClick(); });
  return t;
}

// 상단 코인 표시
export function coinLabel(scene, coins) {
  scene.add.image(GC.WIDTH - 190, 60, 'coin_01').setDisplaySize(60, 60).setDepth(30);
  return scene.add
    .text(GC.WIDTH - 150, 32, `${coins}`, { fontFamily: 'Arial Black, Arial', fontSize: '52px', color: '#ffd54a', stroke: '#000', strokeThickness: 5 })
    .setDepth(30);
}
