// Shooter — 슛 예고. 공이 날아오기 전에 방향을 읽을 창을 만든다.
//
// 예고가 없으면 순수 반사신경 게임이 되고, 예고가 너무 길면 정적이 된다. 슛 종류마다
// telegraphMs가 다른 것이 난이도의 실체다(헤딩 260ms vs 감아차기 700ms).

import { HULL } from '../config/spriteMetrics.js';

export default class Shooter {
  // groundY는 슈터의 **발끝**이 닿을 지면이다. 스프라이트 중심이 아니다 — 생성 이미지는
  // 아래쪽 투명 여백이 자산마다 달라서(striker는 10.4%) 중심으로 놓으면 공중에 뜬다.
  constructor(scene, { unit, groundY, widthPx }) {
    this.scene = scene;
    this.u = unit;
    this.groundY = groundY;
    this.sprite = scene.add.image(0, groundY, 'striker')
      .setDepth(12).setVisible(false);
    // 원근 크기. 키퍼(px(120))는 골라인 0.913에, 슈터는 0.52에 선다. 같은 사람이 그만큼
    // 멀리 있으므로 키퍼의 절반 남짓으로 그린다. 기존 150*unit은 캔버스 폭의 38%였고,
    // 먼 거리의 인물이 키퍼보다 커 보였다.
    this.baseWidth = widthPx;
  }

  // 발끝을 groundY에 맞춘 스프라이트 중심 y.
  seatedY(displayHeight) {
    const bottomFrac = HULL.striker?.bottom ?? 0.08;
    return this.groundY - displayHeight * (0.5 - bottomFrac);
  }

  // 백스윙 → 발사. 발사 순간을 콜백으로 알린다.
  telegraph(x, type, onFire) {
    const key = 'striker';
    if (this.scene.textures.exists(key)) this.sprite.setTexture(key);
    const scale = this.baseWidth / (this.sprite.width || this.baseWidth);
    this.sprite.setScale(scale);
    this.sprite.setPosition(x, this.seatedY(this.sprite.displayHeight))
      .setVisible(true).setAlpha(0).setAngle(0);
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
