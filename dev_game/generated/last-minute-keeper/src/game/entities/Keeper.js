// Keeper — 자세 표시와 판정 body.
//
// 자세는 시트가 아니라 단일 스프라이트 3장을 바꿔 끼운다(계약 기본값: 시트는 구조적 실패율이
// 높다). 다이브는 텍스처 교체 + 좌우 반전 + 기울기 트윈으로 연출한다.
//
// 판정 body는 KeeperController가 계산한 도달 범위를 그대로 쓴다. 보이는 스프라이트와
// body가 어긋나면 "닿았는데 안 막힌다"가 되므로(결함 클래스 M), 두 값을 한 곳에서 만든다.

import { KEEPER_STATE } from '../systems/KeeperController.js';
import { HULL } from '../config/spriteMetrics.js';

const POSE_TEXTURE = {
  [KEEPER_STATE.READY]: 'keeper-ready',
  [KEEPER_STATE.DIVING]: 'keeper-dive',
  [KEEPER_STATE.RECOVERING]: 'keeper-dive',
  [KEEPER_STATE.CATCHING]: 'keeper-catch',
};

export default class Keeper {
  constructor(scene, { unit, widthPx }) {
    this.scene = scene;
    this.u = unit;
    this.baseWidth = widthPx;
    this.sprite = scene.add.image(0, 0, 'keeper-ready').setDepth(16);
    this.applyPose(KEEPER_STATE.READY, 0);
    this.pose = KEEPER_STATE.READY;
  }

  applyPose(state, dir) {
    const key = POSE_TEXTURE[state] || 'keeper-ready';
    if (this.scene.textures.exists(key)) this.sprite.setTexture(key);
    const tex = this.sprite.width || this.baseWidth;
    const scale = this.baseWidth / tex;
    this.sprite.setScale(scale);
    // 다이브 스프라이트는 오른쪽으로 뻗은 그림이라, 왼쪽 다이브는 좌우 반전한다.
    this.sprite.setFlipX(state === KEEPER_STATE.DIVING || state === KEEPER_STATE.RECOVERING ? dir < 0 : false);
    this.sprite.setAngle(state === KEEPER_STATE.DIVING ? dir * 14 : 0);
  }

  update(controller, groundY) {
    if (controller.state !== this.pose) {
      this.applyPose(controller.state, controller.diveDir);
      this.pose = controller.state;
    }
    // 보이는 발끝이 골라인에 서도록 실측 여백을 반영한다. 스프라이트 경계로 놓으면
    // 자산마다 다른 높이에 뜬다(직전 게임에서 실제로 겪은 결함).
    const key = this.sprite.texture?.key || 'keeper-ready';
    const bottomFrac = HULL[key]?.bottom ?? 0.08;
    const h = this.sprite.displayHeight;
    this.sprite.setPosition(controller.x, groundY - h * (0.5 - bottomFrac));
  }

  // 판정 body — 보이는 몸통 폭 기준. 다이브 배수는 controller가 소유한다.
  bodyHalfWidth(controller) {
    const key = this.sprite.texture?.key || 'keeper-ready';
    const widthFrac = HULL[key]?.widthFrac ?? 0.6;
    const visibleHalf = (this.sprite.displayWidth * widthFrac) / 2;
    return controller.reachHalfWidth(visibleHalf);
  }

  snapshot(controller) {
    return {
      pose: this.pose,
      texture: this.sprite.texture?.key || null,
      x: Math.round(this.sprite.x),
      displayWidth: Math.round(this.sprite.displayWidth),
      bodyHalfWidth: Math.round(this.bodyHalfWidth(controller)),
      flipX: this.sprite.flipX,
    };
  }

  destroy() { this.sprite.destroy(); }
}
