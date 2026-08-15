// ShipRouting — 배 풀 관리, 등장 간격, 동시 대기 수, 인내심 소진 감시.
//
// 풀을 쓰는 이유는 성능이 아니라 누수 방지다(결함 클래스 K). 매번 새 스프라이트를 만들면
// 리트라이를 반복할수록 파괴되지 않은 오브젝트가 쌓인다. 고정 풀은 상한이 구조적으로 보장된다.

import Ship, { SHIP_STATE } from '../entities/Ship.js';
import { pickRequest } from './SignalCodec.js';

const POOL_SIZE = 6; // 최대 동시 대기(4) + 퇴장 트윈 진행 중인 배(2) 여유

export default class ShipRouting {
  constructor(scene, { unit, rules, onWreck, onArrive }) {
    this.scene = scene;
    this.u = unit;
    this.rules = rules;
    this.onWreck = onWreck;
    this.onArrive = onArrive;
    this.pool = Array.from({ length: POOL_SIZE }, () => new Ship(scene, { unit }));
    this.spawnAccumMs = 0;
    this.stage = rules.stages[0];
    this.spawnedThisStage = 0;
  }

  setStage(stage) {
    this.stage = stage;
    this.spawnAccumMs = 0;
    this.spawnedThisStage = 0;
  }

  waitingShips() {
    return this.pool.filter((s) => s.state === SHIP_STATE.WAITING);
  }

  // 화면에 남아 있는(퇴장 트윈 포함) 배 — 스테이지 전환 판정에 쓴다.
  liveShips() {
    return this.pool.filter((s) => s.state !== SHIP_STATE.RETIRED);
  }

  // 가장 급한 배(인내심이 가장 적게 남은 대기 배)를 판정 대상으로 삼는다.
  focusShip() {
    const waiting = this.waitingShips();
    if (!waiting.length) return null;
    return waiting.reduce((a, b) => (a.patienceLeft <= b.patienceLeft ? a : b));
  }

  spawn(laneIndex) {
    const ship = this.pool.find((s) => s.state === SHIP_STATE.RETIRED);
    if (!ship) return null;
    const { width, height } = this.scene.sys.game.canvas;
    const lanes = 4;
    const idx = laneIndex % lanes;
    const laneY = height * 0.34 + idx * (height * 0.085);
    const textureKey = this.rules.shipTypes[Math.floor(this.scene.rng.frac() * this.rules.shipTypes.length) % this.rules.shipTypes.length];
    const requestId = pickRequest(this.scene.rng, this.stage.codes);
    ship.launch({
      textureKey: this.scene.textures.exists(textureKey) ? textureKey : this.rules.shipTypes[0],
      requestId,
      patienceMs: this.stage.patienceMs,
      laneY,
      fromX: -160 * this.u,
      toX: width * (0.30 + 0.12 * idx),
    });
    this.spawnedThisStage += 1;
    this.onArrive?.(ship);
    return ship;
  }

  update(deltaMs) {
    // 인내심 소진 감시 — 소진된 배는 난파한다.
    for (const ship of this.pool) {
      if (ship.tick(deltaMs)) {
        ship.wreck(() => this.onWreck?.(ship));
      }
    }
    // 등장 스케줄
    const waiting = this.waitingShips().length + this.pool.filter((s) => s.state === SHIP_STATE.ARRIVING).length;
    if (waiting >= this.stage.maxConcurrent) return;
    if (this.spawnedThisStage >= this.stage.quota + 2) return; // 쿼타보다 조금만 더
    this.spawnAccumMs += deltaMs;
    if (this.spawnAccumMs >= this.stage.spawnGapMs) {
      this.spawnAccumMs = 0;
      this.spawn(this.spawnedThisStage);
    }
  }

  clearAll() {
    for (const ship of this.pool) ship.retire();
    this.spawnAccumMs = 0;
    this.spawnedThisStage = 0;
  }

  snapshot() {
    return {
      poolSize: this.pool.length,
      waiting: this.waitingShips().length,
      live: this.liveShips().length,
      ships: this.pool.map((s) => s.snapshot()),
    };
  }

  destroy() {
    for (const ship of this.pool) ship.destroy();
    this.pool.length = 0;
  }
}
