// Shooter — 슛 예고. 공이 날아오기 전에 방향을 읽을 창을 만든다.
//
// 예고가 없으면 순수 반사신경 게임이 되고, 예고가 너무 길면 정적이 된다. 슛 종류마다
// telegraphMs가 다른 것이 난이도의 실체다(헤딩 260ms vs 감아차기 700ms).

export default class Shooter {
  constructor(scene, { unit, y }) {
    this.scene = scene;
    this.u = unit;
    this.y = y;
    this.sprite = scene.add.image(0, y, 'striker')
      .setDepth(12).setVisible(false);
    this.baseWidth = 150 * unit;
  }

  // 백스윙 → 발사. 발사 순간을 콜백으로 알린다.
  telegraph(x, type, onFire) {
    const key = 'striker';
    if (this.scene.textures.exists(key)) this.sprite.setTexture(key);
    const scale = this.baseWidth / (this.sprite.width || this.baseWidth);
    this.sprite.setScale(scale).setPosition(x, this.y).setVisible(true).setAlpha(0).setAngle(0);
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 120 });
    // 백스윙: 살짝 뒤로 기울었다가 차는 순간 앞으로. 방향 힌트가 되도록 기울기를 준다.
    this.scene.tweens.add({
      targets: this.sprite,
      angle: { from: -8, to: 10 },
      duration: type.telegraphMs,
      ease: 'Sine.easeIn',
      onComplete: () => {
        onFire?.();
        this.scene.tweens.add({
          targets: this.sprite, alpha: 0, duration: 220,
          onComplete: () => this.sprite.setVisible(false),
        });
      },
    });
  }

  destroy() { this.scene.tweens.killTweensOf(this.sprite); this.sprite.destroy(); }
}
