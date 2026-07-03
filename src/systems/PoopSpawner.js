import { GC } from '../config/gameConfig.js';

// 낙하 똥 오브젝트 풀. 종류별 크기·속도·궤적·회전/애니·판정 적용.
export default class PoopSpawner {
  constructor(scene) {
    this.scene = scene;
    this.onDodge = null; // (poop) => void
    this.onPoisonLand = null; // (x) => void — 독똥이 바닥 통과 시
    this.group = scene.physics.add.group({
      defaultKey: 'poop_basic_01',
      maxSize: GC.POOP.POOL_MAX,
      allowGravity: false,
    });
  }

  get activeCount() {
    return this.group.countActive(true);
  }

  spawn(type, baseSpeed) {
    if (this.activeCount >= GC.POOP.POOL_MAX) return;
    const variant = Phaser.Utils.Array.GetRandom(type.variants);
    const speed = baseSpeed * type.speedMul;
    const halfPad = type.size / 2 + GC.POOP.EDGE_PAD;

    let x;
    let y = GC.POOP.SPAWN_Y;
    let vx = 0;
    let vy = speed;
    if (type.diagonal) {
      const fromLeft = Math.random() < 0.5;
      x = fromLeft ? -type.size / 2 : GC.WIDTH + type.size / 2;
      y = Phaser.Math.Between(-120, 260);
      vx = (fromLeft ? 1 : -1) * speed * 0.55;
      vy = speed * 0.9;
    } else {
      // 화면 전체 너비에 균등 스폰(좌우 대칭). 똥은 depth 5로 HUD(depth 19) 뒤를 지나므로
      // 상단 HUD와 겹쳐도 시각적 혼동이 없다.
      x = Phaser.Math.Between(halfPad, GC.WIDTH - halfPad);
    }

    const poop = this.group.get(x, y, variant.key);
    if (!poop) return;

    poop.enableBody(true, x, y, true, true);
    if (type.anim && this.scene.anims.exists(type.anim)) {
      poop.play(type.anim);
    } else {
      poop.anims.stop();
      poop.setTexture(variant.key);
    }
    poop.setDepth(5).setDisplaySize(type.size, type.size);

    const sx = poop.scaleX || 1;
    const r = (poop.width / 2) * type.hit;
    const off = poop.width / 2 - r;
    poop.body.setCircle(r, off, off);
    poop.body.setAllowGravity(false);
    poop.setVelocity(vx, vy);
    poop._bvx = vx;
    poop._bvy = vy;

    if (type.rotate && !type.anim) poop.body.setAngularVelocity(type.golden ? 180 : Phaser.Math.Between(-220, 220) || 160);
    else poop.body.setAngularVelocity(0);

    poop._dodged = false;
    poop._near = false;
    poop._dodge = type.dodge;
    poop._harmless = !!type.harmless;
    poop._golden = !!type.golden;
    poop._poison = !!type.poison;
  }

  update() {
    this.group.children.each((poop) => {
      if (!poop.active) return;
      const out = poop.y > GC.POOP.DESPAWN_Y || poop.x < -240 || poop.x > GC.WIDTH + 240;
      if (out) {
        if (!poop._dodged) {
          poop._dodged = true;
          if (poop._poison && this.onPoisonLand) this.onPoisonLand(Phaser.Math.Clamp(poop.x, 60, GC.WIDTH - 60));
          if (this.onDodge) this.onDodge(poop);
        }
        this.disable(poop);
      }
    });
  }

  // 슬로우(시계 파워업): 활성 똥 속도를 factor로 스케일
  applySlow(factor) {
    this.group.children.each((poop) => {
      if (poop.active) poop.setVelocity(poop._bvx * factor, poop._bvy * factor);
    });
  }

  disable(poop) {
    poop.anims.stop();
    poop.body.setAngularVelocity(0);
    poop.setAngle(0);
    poop.disableBody(true, true);
  }

  reset() {
    this.group.children.each((p) => this.disable(p));
  }
}
