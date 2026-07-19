/**
 * Global runtime contract for Armored Courier: Last Line.
 * Coordinates are authored against a 1280x720 landscape design canvas.
 */
export const GAME_CONFIG = Object.freeze({
  id: 'iron-courier-last-line',
  title: '철갑특송: 라스트 라인',
  englishTitle: 'Armored Courier: Last Line',
  version: '0.1.0',
  designWidth: 1280,
  designHeight: 720,
  minAspectRatio: 16 / 9,
  maxAspectRatio: 21 / 9,
  targetFps: 60,
  pixelArt: false,
  physics: {
    gravityY: 1850,
    worldBounds: { x: 0, y: 0, width: 16800, height: 720 },
    debug: false,
  },
  camera: {
    lerpX: 0.09,
    lerpY: 0.14,
    deadzoneWidth: 360,
    deadzoneHeight: 180,
    forwardLookPx: 294,
    forwardLookRatio: 0.23,
    maxShakeMs: 150,
  },
  performance: {
    maxActiveEnemies: 18,
    maxPlayerProjectiles: 72,
    maxEnemyProjectiles: 56,
    maxExplosions: 24,
    offscreenCullMargin: 320,
    lowFxParticleMultiplier: 0.45,
  },
  saveKey: 'iron-courier-last-line:v1',
});

export const PLAYER_CONFIG = Object.freeze({
  maxHp: 100,
  moveSpeed: 285,
  airMoveSpeed: 250,
  acceleration: 3200,
  drag: 3600,
  jumpVelocity: -690,
  maxFallVelocity: 980,
  coyoteTimeMs: 80,
  jumpBufferMs: 100,
  hurtInvulnerabilityMs: 900,
  meleeRange: 92,
  meleeDamage: 34,
  autoAimRange: 520,
  autoAimConeDeg: 12,
  aimDirections: 8,
  body: { width: 58, height: 122, offsetX: 54, offsetY: 50 },
  spawn: { x: 220, y: 520 },
});

export const SCORE_CONFIG = Object.freeze({
  basicSoldier: 100,
  shieldSoldier: 180,
  grenadier: 220,
  sentryDrone: 260,
  rescue: 750,
  destructibleChainStep: 75,
  escortPerfect: 2500,
  craneSentinel: 3500,
  ironMole: 10000,
  clearTimeParSeconds: 540,
  clearTimeBonusPerSecond: 20,
  remainingHpBonusPerPoint: 25,
});

export const INPUT_CONFIG = Object.freeze({
  keyboard: {
    left: ['A', 'LEFT'],
    right: ['D', 'RIGHT'],
    up: ['W', 'UP'],
    down: ['S', 'DOWN'],
    jump: ['SPACE'],
    shoot: ['J'],
    grenade: ['K'],
    pause: ['ESC'],
  },
  touch: {
    joystick: { x: 136, y: 574, radius: 82, deadzone: 0.16 },
    shoot: { x: 1122, y: 565, radius: 67 },
    jump: { x: 974, y: 594, radius: 62 },
    grenade: { x: 1182, y: 438, radius: 43 },
    pause: { x: 1228, y: 52, radius: 30 },
  },
});

export default GAME_CONFIG;
