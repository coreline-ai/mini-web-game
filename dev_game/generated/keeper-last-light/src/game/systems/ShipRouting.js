// ShipRouting — 배 풀 관리, 등장 간격, 동시 대기 수, 인내심 소진 감시.
//
// 풀을 쓰는 이유는 성능이 아니라 누수 방지다(결함 클래스 K). 매번 새 스프라이트를 만들면
// 리트라이를 반복할수록 파괴되지 않은 오브젝트가 쌓인다. 고정 풀은 상한이 구조적으로 보장된다.

import Ship, { SHIP_STATE } from '../entities/Ship.js';
import { pickRequest } from './SignalCodec.js';

// 항로 3개. 좌·우·좌로 엇갈려 배가 서로 가리지 않는다. y는 전부 수평선(≈0.49) 아래다.
const LANES = Object.freeze([
  Object.freeze({ y: 0.527, x: 0.27 }),
  Object.freeze({ y: 0.593, x: 0.66 }),
  Object.freeze({ y: 0.659, x: 0.29 }),
]);

const POOL_SIZE = 5; // 최대 동시 대기(3) + 퇴장 트윈 진행 중인 배(2) 여유

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

  // 지금 배가 서 있는 항로 목록. 퇴장 트윈이 도는 배도 아직 화면에 있으므로 점유로 센다.
  occupiedLanes() {
    const used = new Set();
    for (const s of this.pool) {
      if (s.state !== SHIP_STATE.RETIRED && s.laneIndex !== null && s.laneIndex !== undefined) used.add(s.laneIndex);
    }
    return used;
  }

  // 항로는 **비어 있는 곳**에만 배정한다. 예전에는 등장 순번(spawnedThisStage)을 항로 수로
  // 나눠 썼는데, 앞 배가 아직 대기 중인 항로에 다음 배가 그대로 들어와 두 척이 포개졌다
  // (캡처에서 화물선과 어선이 한 자리에 겹친 채 잡혔다).
  spawn() {
    const ship = this.pool.find((s) => s.state === SHIP_STATE.RETIRED);
    if (!ship) return null;
    const used = this.occupiedLanes();
    const idx = LANES.findIndex((_, i) => !used.has(i));
    if (idx < 0) return null;
    const { width, height } = this.scene.sys.game.canvas;
    // 항로는 반드시 **수평선 아래**여야 한다. 이전 배치(0.34~0.60)는 윗 두 항로가
    // 수평선 위라 배가 하늘에 떠 보였다 — 캡처 검토에서 잡힌 구도 결함이다.
    // 좌우를 번갈아 배치해 세로 간격을 좁히고도 서로 겹치지 않게 한다.
    const lane = LANES[idx];
    const laneY = height * lane.y;
    const textureKey = this.rules.shipTypes[Math.floor(this.scene.rng.frac() * this.rules.shipTypes.length) % this.rules.shipTypes.length];
    const requestId = pickRequest(this.scene.rng, this.stage.codes);
    ship.launch({
      textureKey: this.scene.textures.exists(textureKey) ? textureKey : this.rules.shipTypes[0],
      requestId,
      patienceMs: this.stage.patienceMs,
      laneY,
      // 화면 밖에서 가로질러 오면 다른 항로의 배를 통과하며 겹쳐 보인다(캡처에서 두 척이
      // 포개진 채로 잡혔다). 제자리에서 안개를 뚫고 나타나듯 짧게 표류하며 페이드인한다.
      fromX: width * lane.x - 70 * this.u,
      toX: width * lane.x,
    });
    ship.laneIndex = idx;
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
      this.spawn();
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
