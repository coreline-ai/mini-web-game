import { GC } from '../config/gameConfig.js';

// 플레이어: 선택 캐릭터 사용. 소년은 걷기 애니, 그 외는 정지+바운스. 무적/속도 상태 지원.
export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, charDef) {
    const useWalk = charDef.walk && scene.anims.exists(charDef.walk);
    super(scene, GC.WIDTH / 2, GC.PLAYER.Y, useWalk ? charDef.walk : charDef.tex, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(10);
    this.setDisplaySize(GC.PLAYER.SIZE, GC.PLAYER.SIZE);
    if (useWalk) this.play(charDef.walk);

    const r = GC.PLAYER.HIT_RADIUS;
    // 표시=텍스처(150) 기준. setDisplaySize로 스케일이 걸려도 body는 텍스처 좌표를 쓰므로
    // 원 반경/오프셋을 표시 스케일에 맞춰 역산한다.
    const sx = this.scaleX || 1;
    const texR = r / sx;
    const off = this.width / 2 - texR;
    this.body.setCircle(texR, off, off + GC.PLAYER.HIT_OFFSET_Y / sx);
    this.body.setAllowGravity(false);

    this.halfW = GC.PLAYER.SIZE / 2;
    this.targetX = GC.WIDTH / 2;
    this.baseY = GC.PLAYER.Y;
    this.invincible = false;

    this.shadow = scene.add
      .ellipse(this.x, this.baseY + GC.PLAYER.SIZE * 0.42, GC.PLAYER.SIZE * 0.6, GC.PLAYER.SIZE * 0.16, 0x000000, 0.28)
      .setDepth(9);
  }

  setTargetX(x) {
    this.targetX = Phaser.Math.Clamp(x, this.halfW, GC.WIDTH - this.halfW);
  }

  setInvincible(v) {
    if (this.invincible === v) return;
    this.invincible = v;
    if (v) this.setTint(0x9fd0ff);
    else this.clearTint();
    this.setAlpha(v ? 0.85 : 1);
  }

  // body는 Phaser preUpdate가 자동 동기화 → updateFromGameObject 호출 금지(이중 이동 방지)
  step(timeMs, lerp = GC.PLAYER.LERP) {
    const prevX = this.x;
    this.x = Phaser.Math.Linear(this.x, this.targetX, lerp);
    this.dx = this.x - prevX;
    this.y = this.baseY + Math.sin(timeMs / 120) * GC.PLAYER.BOB_PX;

    if (Math.abs(this.dx) > 0.5) this.setFlipX(this.dx < 0);
    const tilt = Phaser.Math.Clamp(this.dx * 1.6, -GC.PLAYER.MAX_TILT, GC.PLAYER.MAX_TILT);
    this.angle = Phaser.Math.Linear(this.angle, tilt, 0.25);

    if (this.shadow) this.shadow.x = this.x;
  }

  destroy(fromScene) {
    if (this.shadow) this.shadow.destroy();
    super.destroy(fromScene);
  }
}
