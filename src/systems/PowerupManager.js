import { GC } from '../config/gameConfig.js';

// 파워업 드롭 + 획득 효과(무적/속도/자석/슬로우/전멸) 관리.
export default class PowerupManager {
  constructor(scene) {
    this.scene = scene;
    this.active = {}; // effect -> 만료 시각(ms)
    this.onClear = null; // 번개: 화면 전멸 콜백
    this.onEffect = null; // 획득 알림 콜백(effect)
    this.group = scene.physics.add.group({ maxSize: 12, allowGravity: false });
  }

  maybeDrop(baseSpeed) {
    if (Math.random() > GC.POWERUP.dropChance) return;
    this.spawn(baseSpeed);
  }

  spawn(baseSpeed) {
    const total = GC.POWERUPS.reduce((s, p) => s + p.weight, 0);
    let roll = Math.random() * total;
    let def = GC.POWERUPS[0];
    for (const p of GC.POWERUPS) { roll -= p.weight; if (roll <= 0) { def = p; break; } }

    const x = Phaser.Math.Between(GC.POWERUP.size, GC.WIDTH - GC.POWERUP.size);
    const item = this.group.get(x, GC.POOP.SPAWN_Y, def.key);
    if (!item) return;
    item.enableBody(true, x, GC.POOP.SPAWN_Y, true, true);
    item.setDepth(7).setDisplaySize(GC.POWERUP.size, GC.POWERUP.size);
    item.body.setCircle(item.width / 2);
    item.body.setAllowGravity(false);
    item.setVelocity(0, GC.POWERUP.fallSpeed || baseSpeed * 0.9);
    // 회전: 물리 각속도로 연속 회전(똥과 동일 방식). 트윈 누수/각도 래핑 없이 매끄럽다.
    item.setAngle(0);
    item.body.setAngularVelocity(150);
    item._effect = def.effect;
    item._durationMs = def.durationMs;
  }

  // 획득
  pickup(item, nowMs) {
    if (!item.active) return null;
    const effect = item._effect;
    const dur = item._durationMs;
    item.disableBody(true, true);

    if (effect === 'clear') {
      if (this.onClear) this.onClear();
    } else {
      this.active[effect] = nowMs + dur;
    }
    if (this.onEffect) this.onEffect(effect);
    return effect;
  }

  update(nowMs) {
    for (const k of Object.keys(this.active)) {
      if (nowMs >= this.active[k]) delete this.active[k];
    }
    this.group.children.each((item) => {
      if (item.active && item.y > GC.POOP.DESPAWN_Y) item.disableBody(true, true);
    });
  }

  isActive(effect) {
    return !!this.active[effect];
  }

  activeList(nowMs) {
    return Object.entries(this.active).map(([effect, end]) => ({ effect, remainMs: end - nowMs }));
  }

  reset() {
    this.active = {};
    this.group.children.each((i) => i.disableBody(true, true));
  }
}
