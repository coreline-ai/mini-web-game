// 일회성 시각 이펙트 헬퍼. 이미지(SVG)를 튀어오르며 사라지게 한다.
export default class Effects {
  constructor(scene) {
    this.scene = scene;
  }

  // 폭발/연기/별링 등 한 번 재생 후 소멸
  pop(key, x, y, { scale = 1, endScale = 1.6, duration = 500, depth = 15, spin = 0 } = {}) {
    if (!this.scene.textures.exists(key)) return;
    const s = this.scene.add.image(x, y, key).setDepth(depth).setScale(scale * 0.5);
    this.scene.tweens.add({
      targets: s,
      scale: scale * endScale,
      alpha: 0,
      angle: spin,
      duration,
      ease: 'Cubic.Out',
      onComplete: () => s.destroy(),
    });
    return s;
  }

  // 플레이어 이동 잔상(트레일)
  trail(key, x, y, depth = 8) {
    if (!this.scene.textures.exists(key)) return;
    const s = this.scene.add.image(x, y, key).setDepth(depth).setScale(0.5).setAlpha(0.6);
    this.scene.tweens.add({ targets: s, alpha: 0, scale: 0.2, duration: 350, onComplete: () => s.destroy() });
  }

  floatText(x, y, text, color = '#ffffff', size = 60) {
    const t = this.scene.add
      .text(x, y, text, { fontFamily: 'Arial Black, Arial', fontSize: `${size}px`, color, stroke: '#000', strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(22);
    this.scene.tweens.add({ targets: t, y: y - 140, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }
}
