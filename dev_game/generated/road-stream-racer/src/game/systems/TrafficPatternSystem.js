import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { setArcadeBox } from './CollisionSystem.js';

const TRAFFIC_KEYS = [ASSET_KEYS.trafficBlue, ASSET_KEYS.trafficYellow, ASSET_KEYS.trafficTruck];
const OBSTACLE_KEYS = [ASSET_KEYS.cone, ASSET_KEYS.barricade];
const TRAFFIC_WAKE_KEY = 'traffic_motion_wake';

export default class TrafficPatternSystem {
  constructor(scene) {
    this.scene = scene;
    this.traffic = scene.physics.add.group({ allowGravity: false, immovable: true, maxSize: 42 });
    this.items = scene.physics.add.group({ allowGravity: false, immovable: true, maxSize: 28 });
    this.roadLeft = SPEC.racing.road.left;
    this.roadRight = SPEC.racing.road.right;
    this.laneCount = SPEC.racing.lanes;
    this.laneWidth = (this.roadRight - this.roadLeft) / this.laneCount;
    this.nextPatternAt = 1550;
    this.patternIndex = 0;
    this.lastSafeLane = 1;
    this.motionFx = new Set();
  }

  laneX(lane) {
    return this.roadLeft + this.laneWidth * (lane + 0.5);
  }

  speedForLevel(level) {
    const start = SPEC.racing.road.scrollSpeedStart;
    const max = SPEC.racing.road.scrollSpeedMax;
    const t = Phaser.Math.Clamp((level - 1) / ((SPEC.difficulty.maxLevel || 12) - 1), 0, 1);
    return Phaser.Math.Linear(start, max, t);
  }

  spawnTraffic(lane, key, y = -230) {
    const textureKey = key || TRAFFIC_KEYS[this.patternIndex % TRAFFIC_KEYS.length];
    const sprite = this.traffic.get(this.laneX(lane), y, textureKey);
    if (!sprite) return null;
    sprite.enableBody(true, this.laneX(lane), y, true, true);
    sprite.setTexture(textureKey);
    sprite.setDepth(7);
    sprite.setAngle(0);
    sprite.setAlpha(1);
    sprite.motionPhase = Phaser.Math.Between(0, 628) / 100;
    sprite.motionKey = textureKey;
    sprite.setDisplaySize(textureKey === ASSET_KEYS.trafficTruck ? 260 : 230, textureKey === ASSET_KEYS.trafficTruck ? 330 : 290);
    sprite.nearMissAwarded = false;
    setArcadeBox(sprite, textureKey === ASSET_KEYS.trafficTruck ? 158 : 134, textureKey === ASSET_KEYS.trafficTruck ? 250 : 220, 0, 26);
    this.ensureVehicleFx(sprite);
    this.updateVehicleFx(sprite, 0, this.speedForLevel(1), 0);
    return sprite;
  }

  ensureVehicleFx(sprite) {
    if (sprite.motionShadow) return;
    if (!this.scene.textures.exists(TRAFFIC_WAKE_KEY)) {
      const g = this.scene.make.graphics({ add: false });
      g.fillStyle(0xbff8ff, 0.38);
      g.fillTriangle(64, 12, 92, 12, 78, 188);
      g.fillTriangle(118, 0, 154, 0, 136, 204);
      g.fillTriangle(164, 18, 192, 18, 178, 176);
      g.fillStyle(0xffffff, 0.2);
      g.fillTriangle(82, 0, 96, 0, 90, 112);
      g.fillTriangle(144, 10, 160, 10, 152, 136);
      g.generateTexture(TRAFFIC_WAKE_KEY, 224, 216);
      g.destroy();
    }
    sprite.motionShadow = this.scene.add.ellipse(sprite.x, sprite.y, 220, 58, 0x020913, 0.34)
      .setDepth(6)
      .setVisible(false);
    sprite.motionWake = this.scene.add.image(sprite.x, sprite.y, TRAFFIC_WAKE_KEY)
      .setDepth(6)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    this.motionFx.add(sprite.motionShadow);
    this.motionFx.add(sprite.motionWake);
  }

  updateVehicleFx(sprite, time, scrollSpeed, delta) {
    this.ensureVehicleFx(sprite);
    const isTruck = sprite.texture.key === ASSET_KEYS.trafficTruck;
    const speedT = Phaser.Math.Clamp((scrollSpeed - SPEC.racing.road.scrollSpeedStart) / Math.max(1, SPEC.racing.road.scrollSpeedMax - SPEC.racing.road.scrollSpeedStart), 0, 1);
    const pulse = 0.5 + Math.sin(time * 0.015 + (sprite.motionPhase || 0)) * 0.5;
    const lean = Math.sin(time * 0.004 + (sprite.motionPhase || 0)) * (isTruck ? 0.35 : 0.7);
    sprite.setAngle(lean);
    sprite.motionShadow
      .setPosition(sprite.x + 10, sprite.y + sprite.displayHeight * 0.17)
      .setSize(sprite.displayWidth * (isTruck ? 0.92 : 0.84), sprite.displayHeight * 0.2)
      .setAlpha(0.26 + speedT * 0.12)
      .setVisible(true);
    sprite.motionWake
      .setPosition(sprite.x, sprite.y + sprite.displayHeight * 0.53)
      .setDisplaySize(sprite.displayWidth * (isTruck ? 0.56 : 0.5), sprite.displayHeight * (0.28 + speedT * 0.1))
      .setAlpha(0.2 + pulse * 0.08 + speedT * 0.14)
      .setAngle(lean)
      .setVisible(true);
  }

  hideVehicleFx(sprite) {
    if (!sprite) return;
    sprite.motionShadow?.setVisible(false);
    sprite.motionWake?.setVisible(false);
  }

  spawnObstacle(lane, y = -210) {
    const key = OBSTACLE_KEYS[this.patternIndex % OBSTACLE_KEYS.length];
    const sprite = this.traffic.get(this.laneX(lane), y, key);
    if (!sprite) return null;
    sprite.enableBody(true, this.laneX(lane), y, true, true);
    sprite.setTexture(key);
    sprite.setDepth(8);
    sprite.setDisplaySize(key === ASSET_KEYS.cone ? 145 : 210, key === ASSET_KEYS.cone ? 145 : 150);
    sprite.nearMissAwarded = true;
    setArcadeBox(sprite, key === ASSET_KEYS.cone ? 90 : 150, key === ASSET_KEYS.cone ? 100 : 110);
    return sprite;
  }

  spawnCoin(lane, y = -180) {
    const coin = this.items.get(this.laneX(lane), y, ASSET_KEYS.coin);
    if (!coin) return null;
    coin.enableBody(true, this.laneX(lane), y, true, true);
    coin.setTexture(ASSET_KEYS.coin);
    coin.setDepth(6);
    coin.setDisplaySize(118, 118);
    coin.itemType = 'coin';
    if (this.scene.anims.exists('coin_spin')) coin.play('coin_spin');
    setArcadeBox(coin, 88, 88);
    return coin;
  }

  spawnBoost(lane, y = -220) {
    const pad = this.items.get(this.laneX(lane), y, ASSET_KEYS.boostPad);
    if (!pad) return null;
    pad.enableBody(true, this.laneX(lane), y, true, true);
    pad.setTexture(ASSET_KEYS.boostPad);
    pad.setDepth(5);
    pad.setAngle(0);
    pad.setAlpha(1);
    pad.setDisplaySize(220, 142);
    pad.itemType = 'boost';
    setArcadeBox(pad, 160, 90);
    return pad;
  }

  choosePattern(level) {
    if (this.patternIndex === 0) {
      this.lastSafeLane = 1;
      return { safeLane: 1, trafficLanes: [0] };
    }
    const safeLane = (this.lastSafeLane + Phaser.Math.Between(1, 2)) % this.laneCount;
    this.lastSafeLane = safeLane;
    const lanes = [0, 1, 2].filter((lane) => lane !== safeLane);
    const useTwoCars = level > 2 || this.patternIndex > 3;
    const trafficLanes = useTwoCars ? lanes : [lanes[this.patternIndex % lanes.length]];
    return { safeLane, trafficLanes };
  }

  update(time, delta, level, scrollSpeed) {
    if (time >= this.nextPatternAt) {
      const pattern = this.choosePattern(level);
      const offset = this.patternIndex % 2 === 0 ? 0 : -210;
      for (const lane of pattern.trafficLanes) {
        const key = TRAFFIC_KEYS[(this.patternIndex + lane) % TRAFFIC_KEYS.length];
        this.spawnTraffic(lane, key, -250 + offset);
      }
      const openHazardLane = [0, 1, 2].find((lane) => lane !== pattern.safeLane && !pattern.trafficLanes.includes(lane));
      if (this.patternIndex % 4 === 2 && Number.isInteger(openHazardLane)) this.spawnObstacle(openHazardLane, -360);
      if (this.patternIndex % 5 === 1) this.spawnBoost(pattern.safeLane, -520);
      else this.spawnCoin(pattern.safeLane, -500);
      this.patternIndex += 1;
      const interval = Phaser.Math.Clamp(1280 - level * 70, 620, 1280);
      this.nextPatternAt = time + interval;
    }

    const dy = scrollSpeed * (delta / 1000);
    for (const sprite of this.traffic.getChildren()) {
      if (!sprite.active) {
        this.hideVehicleFx(sprite);
        continue;
      }
      sprite.y += dy;
      if (TRAFFIC_KEYS.includes(sprite.texture.key)) this.updateVehicleFx(sprite, time, scrollSpeed, delta);
      else this.hideVehicleFx(sprite);
      if (sprite.y > SPEC.canvas.height + 300) {
        this.hideVehicleFx(sprite);
        sprite.disableBody(true, true);
      }
    }
    for (const item of this.items.getChildren()) {
      if (!item.active) continue;
      item.y += dy;
      if (item.itemType === 'coin') item.angle += delta * 0.05;
      else item.angle = 0;
      if (item.y > SPEC.canvas.height + 240) item.disableBody(true, true);
    }
  }

  motionFxVisibleCount() {
    let count = 0;
    for (const fx of this.motionFx) if (fx.visible) count += 1;
    return count;
  }

  destroy() {
    const sprites = Array.isArray(this.traffic?.children?.entries) ? this.traffic.children.entries : [];
    for (const sprite of sprites) this.hideVehicleFx(sprite);
    for (const fx of this.motionFx) fx.destroy();
    this.motionFx.clear();
  }
}
