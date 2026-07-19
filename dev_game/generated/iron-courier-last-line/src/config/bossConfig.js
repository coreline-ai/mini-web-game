const phase = (config) => Object.freeze(config);

export const BOSS_CONFIG = Object.freeze({
  craneSentinel: Object.freeze({
    id: 'craneSentinel', displayName: '크레인 센티널', type: 'miniBoss',
    maxHp: 2400, score: 3500, arena: { startX: 9550, endX: 10950 },
    weakPointMultiplier: 1.65, contactDamage: 24,
    parts: ['body', 'boom', 'claw', 'turret', 'weakCore'],
    attacks: Object.freeze({
      clawSlam: { telegraphMs: 640, damage: 28, cooldownMs: 2350, shockwaveSpeed: 420 },
      cargoDrop: { telegraphMs: 780, damage: 34, cooldownMs: 3100, markerMs: 820 },
      turretSweep: { telegraphMs: 480, damage: 10, shots: 7, gapMs: 130, cooldownMs: 2800 },
    }),
    enrageAtHpRatio: 0.35,
  }),
  ironMole: Object.freeze({
    id: 'ironMole', displayName: '굴착열차 아이언 몰', type: 'finalBoss',
    // Runtime QA showed the repaired flying waves leave too little runway for
    // a 3,600 HP endurance wall. 1,500 HP keeps all three authored phases but
    // fits the 150-second final-arena target with ordinary rifle play.
    maxHp: 1500, score: 10000, arena: { startX: 14400, endX: 16650 },
    contactDamage: 30, phaseTransitionInvulnerableMs: 1500,
    parts: ['chassis', 'drill', 'turret', 'missilePod', 'core', 'armorFront', 'armorRear'],
    phases: Object.freeze([
      phase({
        id: 'breach', index: 1, hpAboveRatio: 0.68, title: '철벽 돌파',
        exposedParts: ['turret', 'missilePod'], coreDamageMultiplier: 0,
        attacks: ['drillRush', 'turretBurst', 'debrisRain'], telegraphMinMs: 520,
        attackCooldownMs: 1900, moveSpeed: 105,
      }),
      phase({
        id: 'siege', index: 2, hpAboveRatio: 0.32, title: '공성 전개',
        exposedParts: ['missilePod', 'core'], coreDamageMultiplier: 1.35,
        attacks: ['missileGrid', 'groundFlame', 'drillShockwave'], telegraphMinMs: 430,
        attackCooldownMs: 1550, moveSpeed: 125,
      }),
      phase({
        id: 'lastLine', index: 3, hpAboveRatio: 0, title: '최후선 붕괴',
        exposedParts: ['core'], coreDamageMultiplier: 1.8,
        attacks: ['overdriveRush', 'coreBeam', 'collapseBarrage'], telegraphMinMs: 360,
        attackCooldownMs: 1220, moveSpeed: 155,
      }),
    ]),
    attackDefinitions: Object.freeze({
      drillRush: { telegraphMs: 650, damage: 34, speed: 470 },
      turretBurst: { telegraphMs: 520, damage: 11, shots: 8, gapMs: 105 },
      debrisRain: { telegraphMs: 780, damage: 26, markers: 5 },
      missileGrid: { telegraphMs: 620, damage: 30, markers: 6 },
      groundFlame: { telegraphMs: 500, damage: 9, durationMs: 2600 },
      drillShockwave: { telegraphMs: 540, damage: 28, waves: 2 },
      overdriveRush: { telegraphMs: 460, damage: 40, speed: 610 },
      coreBeam: { telegraphMs: 680, damage: 14, durationMs: 1450 },
      collapseBarrage: { telegraphMs: 410, damage: 28, markers: 8 },
    }),
  }),
});

export default BOSS_CONFIG;
