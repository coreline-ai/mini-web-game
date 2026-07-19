export const STAGE_CONFIG = Object.freeze({
  id: 'burning-harbor',
  displayName: '불타는 항구',
  targetDurationSeconds: 540,
  acceptableDurationSeconds: { min: 420, max: 600 },
  world: { width: 16800, height: 720, groundY: 588, groundFasciaY: 606 },
  checkpointPolicy: 'segment-start',
  segments: Object.freeze([
    { id: 'shore-entry', name: '해안 진입', x: [0, 1800], targetSeconds: 40, mechanic: 'crouch-dodge-straight-fire', checkpointX: 120 },
    { id: 'container-yard', name: '컨테이너 전투', x: [1800, 4200], targetSeconds: 60, mechanic: 'vertical-route-intro', checkpointX: 1840 },
    { id: 'rescue-bay', name: '구조 선착장', x: [4200, 5900], targetSeconds: 50, mechanic: 'rescue-link', checkpointX: 4240 },
    { id: 'warehouse', name: '다층 창고', x: [5900, 8200], targetSeconds: 60, mechanic: 'two-lane-vertical-combat', checkpointX: 5940 },
    { id: 'escort-lane', name: '장갑차 호위', x: [8200, 9550], targetSeconds: 60, mechanic: 'escort', checkpointX: 8240 },
    { id: 'crane-arena', name: '크레인 센티널', x: [9550, 10950], targetSeconds: 60, mechanic: 'mini-boss', checkpointX: 9600 },
    { id: 'collapse-bridge', name: '붕괴 교량', x: [10950, 14000], targetSeconds: 60, mechanic: 'high-route-rescue-and-chain-destruction', checkpointX: 11000 },
    { id: 'iron-mole-arena', name: '아이언 몰', x: [14000, 16800], targetSeconds: 150, mechanic: 'three-phase-final-boss', checkpointX: 14100 },
  ]),
  rescues: Object.freeze([
    { id: 'engineer-01', type: 'engineer', x: 4720, y: 536, effect: { target: 'escort', repairHp: 140 }, score: 750 },
    { id: 'medic-01', type: 'medic', x: 5480, y: 430, effect: { target: 'player', healHp: 35 }, score: 750 },
    { id: 'artillery-01', type: 'artillery', x: 12190, platformId: 'collapse-down', optional: true, effect: { durationMs: 12000, salvoEveryMs: 2200, damage: 48 }, score: 1000 },
  ]),
  escort: Object.freeze({
    id: 'atlas-carrier', startX: 8260, endX: 9460, maxHp: 500, moveSpeed: 54,
    stopWhenEnemyWithinPx: 430, criticalHpRatio: 0.25, engineerRepairHp: 140,
    failure: ['vehicleHpZero', 'playerHpZero'], perfectHpRatio: 0.8,
    waves: [
      { atProgress: 0.08, enemies: { basicSoldier: 3, sentryDrone: 1 } },
      { atProgress: 0.35, enemies: { shieldSoldier: 2, grenadier: 1 } },
      { atProgress: 0.68, enemies: { basicSoldier: 3, grenadier: 1, sentryDrone: 2 } },
    ],
  }),
  destructibles: Object.freeze([
    { type: 'fuelDrum', count: 12, hp: 24, damage: 70, radius: 150, chainable: true },
    { type: 'containerLock', count: 6, hp: 38, damage: 42, radius: 105, chainable: true },
    { type: 'cranePart', count: 3, hp: 85, damage: 95, radius: 190, chainable: true },
    { type: 'bridgeJoint', count: 5, hp: 62, damage: 80, radius: 165, chainable: true },
    { type: 'enemyPowerCell', count: 8, hp: 30, damage: 55, radius: 125, chainable: true },
  ]),
  encounters: Object.freeze([
    { x: 760, id: 'tutorial-fire', enemies: { basicSoldier: 2 } },
    { x: 2050, id: 'container-crossfire', enemies: { basicSoldier: 4, grenadier: 1 } },
    { x: 3100, id: 'shield-intro', enemies: { basicSoldier: 2, shieldSoldier: 2 } },
    { x: 4550, id: 'rescue-pressure', enemies: { basicSoldier: 3, sentryDrone: 2 } },
    { x: 6200, id: 'warehouse-low', enemies: { shieldSoldier: 2, grenadier: 2 } },
    { x: 7350, id: 'warehouse-high', enemies: { basicSoldier: 3, sentryDrone: 3 } },
    { x: 11200, id: 'bridge-run-1', enemies: { basicSoldier: 4, grenadier: 1 } },
    { x: 12600, id: 'bridge-run-2', enemies: { shieldSoldier: 2, sentryDrone: 3 } },
  ]),
  weaponPickups: Object.freeze([
    { x: 2580, platformId: 'container-mid', weaponId: 'shotgun', ammo: 24 },
    { x: 6930, platformId: 'warehouse-down', weaponId: 'rocket', ammo: 8 },
    { x: 11550, platformId: 'collapse-mid', weaponId: 'rocket', ammo: 6 },
    { x: 14550, platformId: 'boss-vantage', weaponId: 'shotgun', ammo: 18 },
  ]),
  tacticalRules: Object.freeze({
    straightProjectileDodge: 'crouch',
    straightProjectileRoles: Object.freeze(['basicSoldier', 'shieldSoldier']),
    crouchBodyHeight: 72,
    jumpModel: Object.freeze({ gravityY: 1850, jumpVelocity: 690, theoreticalMaxRisePx: 128.68, maxAuthoredStepPx: 96, maxAuthoredGapPx: 48 }),
    highRouteRewards: Object.freeze(['shotgun', 'rocket', 'artillery-rescue']),
  }),
  traversal: Object.freeze({
    routes: Object.freeze([
      Object.freeze({ id: 'container-high', purpose: 'teach-jump-route', reward: 'shotgun' }),
      Object.freeze({ id: 'warehouse-high', purpose: 'flank-shields-and-remove-grenadiers', reward: 'rocket' }),
      Object.freeze({ id: 'collapse-high', purpose: 'optional-artillery-rescue', reward: 'artillery-rescue' }),
    ]),
    platforms: Object.freeze([
      // Container yard: the first support is 96px above ground; later steps
      // rise by 80px with touching/overlapping edges for mobile-safe jumps.
      Object.freeze({ id: 'container-entry', routeId: 'container-high', step: 1, ascent: true, centerX: 2310, surfaceY: 510, width: 300, texture: 'terrain-platform-support', purpose: 'route-entry' }),
      Object.freeze({ id: 'container-mid', routeId: 'container-high', step: 2, ascent: true, centerX: 2580, surfaceY: 430, width: 260, texture: 'terrain-platform-catwalk', purpose: 'shotgun-reward' }),
      Object.freeze({ id: 'container-high', routeId: 'container-high', step: 3, ascent: true, centerX: 2880, surfaceY: 350, width: 340, texture: 'terrain-platform-catwalk', purpose: 'rifle-sentry' }),
      Object.freeze({ id: 'container-down', routeId: 'container-high', step: 4, ascent: false, centerX: 3200, surfaceY: 430, width: 300, texture: 'terrain-platform-catwalk', purpose: 'grenadier-perch' }),
      Object.freeze({ id: 'container-exit', routeId: 'container-high', step: 5, ascent: false, centerX: 3500, surfaceY: 510, width: 320, texture: 'terrain-platform-support', purpose: 'route-exit' }),

      // Warehouse: low lane has shields, upper lane has stationary area denial
      // and the rocket counter weapon. Both lanes remain optional.
      Object.freeze({ id: 'warehouse-entry', routeId: 'warehouse-high', step: 1, ascent: true, centerX: 6020, surfaceY: 510, width: 300, texture: 'terrain-platform-support', purpose: 'route-entry' }),
      Object.freeze({ id: 'warehouse-mid', routeId: 'warehouse-high', step: 2, ascent: true, centerX: 6290, surfaceY: 430, width: 260, texture: 'terrain-platform-catwalk', purpose: 'flank-step' }),
      Object.freeze({ id: 'warehouse-high', routeId: 'warehouse-high', step: 3, ascent: true, centerX: 6600, surfaceY: 350, width: 360, texture: 'terrain-platform-catwalk', purpose: 'grenadier-perch' }),
      Object.freeze({ id: 'warehouse-down', routeId: 'warehouse-high', step: 4, ascent: false, centerX: 6930, surfaceY: 430, width: 300, texture: 'terrain-platform-catwalk', purpose: 'rocket-reward' }),
      Object.freeze({ id: 'warehouse-exit', routeId: 'warehouse-high', step: 5, ascent: false, centerX: 7240, surfaceY: 510, width: 340, texture: 'terrain-platform-support', purpose: 'route-exit' }),

      // Collapse bridge: an optional elevated rescue route pays off the jump
      // lesson with artillery support before the final arena.
      Object.freeze({ id: 'collapse-entry', routeId: 'collapse-high', step: 1, ascent: true, centerX: 11280, surfaceY: 510, width: 300, texture: 'terrain-platform-support', purpose: 'route-entry' }),
      Object.freeze({ id: 'collapse-mid', routeId: 'collapse-high', step: 2, ascent: true, centerX: 11550, surfaceY: 430, width: 260, texture: 'terrain-platform-catwalk', purpose: 'rocket-reward' }),
      Object.freeze({ id: 'collapse-high', routeId: 'collapse-high', step: 3, ascent: true, centerX: 11860, surfaceY: 350, width: 360, texture: 'terrain-platform-catwalk', purpose: 'grenadier-perch' }),
      Object.freeze({ id: 'collapse-down', routeId: 'collapse-high', step: 4, ascent: false, centerX: 12190, surfaceY: 430, width: 300, texture: 'terrain-platform-catwalk', purpose: 'artillery-rescue' }),
      Object.freeze({ id: 'collapse-exit', routeId: 'collapse-high', step: 5, ascent: false, centerX: 12500, surfaceY: 510, width: 340, texture: 'terrain-platform-support', purpose: 'route-exit' }),

      Object.freeze({ id: 'boss-vantage', centerX: 14550, surfaceY: 500, width: 420, texture: 'terrain-platform-support', purpose: 'boss-shotgun-vantage' }),
    ]),
  }),
  tutorials: Object.freeze([
    Object.freeze({ id: 'crouch-dodge', triggerX: 360, text: '직사 경고! S/↓ 또는 왼쪽 조이스틱↓로 숙이기', durationMs: 1800 }),
    Object.freeze({ id: 'container-high-route', triggerX: 1920, text: '상단 루트 · SPACE로 작업대 → 캣워크', durationMs: 1700 }),
    Object.freeze({ id: 'warehouse-two-lane', triggerX: 5920, text: '고지대 곡사병 제거 · 상단에 로켓 보급', durationMs: 1700 }),
    Object.freeze({ id: 'collapse-rescue', triggerX: 11020, text: '붕괴 구간 상단 루트 · 포병 구조', durationMs: 1700 }),
  ]),
  noveltyCadenceSeconds: { min: 10, max: 15 },
});

export function getSegmentAtX(x) {
  return STAGE_CONFIG.segments.find((segment) => x >= segment.x[0] && x < segment.x[1]);
}

export default STAGE_CONFIG;
