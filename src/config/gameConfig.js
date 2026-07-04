// 게임 전역 설정 — 모든 에셋 키/밸런스 상수 집중.
// (근거: docs/design-spec-supplement.md, docs/scenario-full.md)

export const GC = {
  WIDTH: 1080,
  HEIGHT: 1920,
  BG_COLOR: '#0b0d1a',

  MASTER_VOLUME: 0.4, // 전역 사운드 볼륨(모든 SFX에 곱해짐)

  PLAYER: {
    Y: 1740,
    SIZE: 150,
    HIT_RADIUS: 42,
    HIT_OFFSET_Y: 12,
    LERP: 0.35,
    SPEED_LERP: 0.55, // 슬리퍼 파워업 시 추종 가속
    MAX_TILT: 13,
    BOB_PX: 4,
  },

  POOP: { SPAWN_Y: -120, DESPAWN_Y: 2100, POOL_MAX: 80, EDGE_PAD: 12 },

  // 똥 종류. anim=회전 애니 시트 키, harmless=무해, golden=황금, diagonal=대각선, poison=바닥 잔류
  POOP_TYPES: {
    basic: { size: 104, hit: 0.65, speedMul: 1.0, dodge: 2, weight: 6,
      variants: [
        { key: 'poop_basic_01', path: 'imagegen/enemies/poop/poop_basic_01_imagegen.png', type: 'image' },
        { key: 'poop_basic_02', path: 'imagegen/enemies/poop/poop_basic_02_imagegen.png', type: 'image' },
        { key: 'poop_basic_03', path: 'imagegen/enemies/poop/poop_basic_03_imagegen.png', type: 'image' },
      ] },
    large: { size: 150, hit: 0.70, speedMul: 0.82, dodge: 3, weight: 4,
      variants: [
        { key: 'poop_large_01', path: 'imagegen/enemies/poop/poop_large_01_imagegen.png', type: 'image' },
        { key: 'poop_large_02', path: 'imagegen/enemies/poop/poop_large_02_imagegen.png', type: 'image' },
        { key: 'poop_large_03', path: 'imagegen/enemies/poop/poop_large_03_imagegen.png', type: 'image' },
      ] },
    small: { size: 70, hit: 0.60, speedMul: 1.3, dodge: 2, weight: 5,
      variants: [
        { key: 'poop_small_01', path: 'imagegen/enemies/poop/poop_small_01_imagegen.png', type: 'image' },
        { key: 'poop_small_02', path: 'imagegen/enemies/poop/poop_small_02_imagegen.png', type: 'image' },
        { key: 'poop_small_03', path: 'imagegen/enemies/poop/poop_small_03_imagegen.png', type: 'image' },
      ] },
    spin: { size: 104, hit: 0.60, speedMul: 1.05, dodge: 4, weight: 3, anim: 'poop_spin',
      variants: [{ key: 'poop_spin' }] },
    golden: { size: 108, hit: 0.60, speedMul: 1.15, dodge: 500, weight: 1, golden: true, rotate: true,
      variants: [
        { key: 'poop_gold_01', path: 'imagegen/enemies/poop/poop_gold_01_imagegen.png', type: 'image' },
        { key: 'poop_gold_02', path: 'imagegen/enemies/poop/poop_gold_02_imagegen.png', type: 'image' },
        { key: 'poop_gold_03', path: 'imagegen/enemies/poop/poop_gold_03_imagegen.png', type: 'image' },
      ] },
    bird: { size: 96, hit: 0.60, speedMul: 1.1, dodge: 5, weight: 2, diagonal: true,
      variants: [{ key: 'poop_bird', path: 'imagegen/enemies/poop/poop_bird_imagegen.png', type: 'image' }] },
    poison: { size: 104, hit: 0.62, speedMul: 1.0, dodge: 5, weight: 3, poison: true,
      variants: [
        { key: 'poop_poison_01', path: 'imagegen/enemies/poop/poop_poison_01_imagegen.png', type: 'image' },
        { key: 'poop_poison_02', path: 'imagegen/enemies/poop/poop_poison_02_imagegen.png', type: 'image' },
        { key: 'poop_poison_03', path: 'imagegen/enemies/poop/poop_poison_03_imagegen.png', type: 'image' },
      ] },
    fake: { size: 104, hit: 0.60, speedMul: 0.95, dodge: 0, weight: 3, harmless: true, rotate: true,
      variants: [{ key: 'poop_fake', path: 'imagegen/enemies/poop/poop_fake_imagegen.png', type: 'image' }] },
  },

  STAGES: [
    { t: 0, bg: 'bg_city', intro: '기본 똥', pool: ['basic'] },
    { t: 25, bg: 'bg_park', intro: '큰 똥', pool: ['basic', 'large'] },
    { t: 50, bg: 'bg_school', intro: '작은 똥', pool: ['basic', 'large', 'small'] },
    { t: 80, bg: 'bg_subway', intro: '회전 똥', pool: ['basic', 'large', 'small', 'spin'] },
    { t: 112, bg: 'bg_space', intro: '황금 똥', pool: ['basic', 'small', 'spin', 'golden'] },
    { t: 146, bg: 'bg_desert', intro: '새 똥', pool: ['basic', 'large', 'small', 'golden', 'bird'] },
    { t: 182, bg: 'bg_iceberg', intro: '독 똥', pool: ['basic', 'small', 'golden', 'bird', 'poison'] },
    { t: 220, bg: 'bg_lava', intro: '가짜 똥', pool: ['basic', 'large', 'small', 'golden', 'bird', 'poison', 'fake'] },
  ],

  DIFF: {
    BASE_SPEED: 380, MAX_SPEED: 1500, SPEED_RAMP: 9,
    BASE_INTERVAL: 900, MIN_INTERVAL: 180, INT_RAMP: 7,
    CONCURRENT_EVERY: 20, CONCURRENT_MAX_CAP: 40,
  },

  // 폭우(WARNING) 특수 이벤트
  RAIN: { everySec: 30, jitterSec: 3, durationMs: 4000, intervalMul: 0.35, safeLaneWidth: 200, bonus: 300 },

  SCORE: {
    SURVIVAL_PER_SEC: 10, NEAR_MISS: 20, NEAR_MISS_GAP: 44,
    BEST_KEY: 'dgp_best', MUTE_KEY: 'dgp_mute', SAVE_KEY: 'dgp_save',
  },

  COMBO: { fantastic: 100, master: 200, legend: 500, maxMultiplyAt: 500 },

  COIN: {
    dropChance: 0.4, perDrop: 4, goldenBonus: 8, size: 96, poolMax: 120,
    magnetRadius: 520, magnetSpeed: 1000, // 자석 파워업(획득 시 넓게 흡수)
    passiveMagnetRadius: 200, passiveMagnetSpeed: 520, // 상시: 가까이 갔을 때만 끌려옴
  },

  HEART: { size: 92, freeContinues: 1, costCoins: 50, reviveInvincMs: 2000 },

  POWERUPS: [
    { id: 'umbrella', key: 'pu_umbrella', path: 'imagegen/items/umbrella_shield_imagegen.png', type: 'image', effect: 'shield', durationMs: 10000, weight: 20, size: 104 },
    { id: 'slipper', key: 'pu_slipper', path: 'imagegen/items/slipper_speed_imagegen.png', type: 'image', effect: 'speed', durationMs: 8000, weight: 25, size: 104 },
    { id: 'magnet', key: 'pu_magnet', path: 'imagegen/items/magnet_coin_imagegen.png', type: 'image', effect: 'magnet', durationMs: 8000, weight: 25, size: 104 },
    { id: 'clock', key: 'pu_clock', path: 'imagegen/items/clock_slow_imagegen.png', type: 'image', effect: 'slow', durationMs: 5000, weight: 20, size: 104 },
    { id: 'lightning', key: 'pu_lightning', path: 'imagegen/items/lightning_clear_imagegen.png', type: 'image', effect: 'clear', durationMs: 0, weight: 10, size: 104 },
  ],
  POWERUP: { dropChance: 0.05, size: 104, fallSpeed: 420, slowFactor: 0.5 },

  // 보스 공통 기본값
  BOSS: { y: 340, size: 300, projSize: 92, anim: 'boss_attack' },
  // 3단 보스: 약한 → 중간 → 강력, 각 enterAtSec(생존초)에 한 번씩 등장
  // hpDrainPerSec = 생존으로 HP가 깎이는 속도 → 처치까지 걸리는 시간 = hp / drain
  // 난이도 상향: 1번=기존 2번, 2번=기존 3번, 3번=신규 최상급(전반적 난이도 UP)
  BOSSES: [
    { name: '약한 보스', enterAtSec: 50, hp: 110, hpDrainPerSec: 5, moveSpeed: 235, fireIntervalMs: 1200,
      projSpeed: 560, rageBelowHp: 40, shots: [0], rageShots: [-0.32, 0, 0.32], sizeMul: 1.0, tint: 0xffd27a, defeatCoins: 24, defeatScore: 1800 },
    { name: '중간 보스', enterAtSec: 120, hp: 160, hpDrainPerSec: 5, moveSpeed: 285, fireIntervalMs: 950,
      projSpeed: 650, rageBelowHp: 55, shots: [-0.2, 0.2], rageShots: [-0.5, -0.25, 0, 0.25, 0.5], sizeMul: 1.25, tint: 0xff9a9a, defeatCoins: 45, defeatScore: 4000 },
    { name: '강력 보스', enterAtSec: 195, hp: 210, hpDrainPerSec: 5, moveSpeed: 325, fireIntervalMs: 800,
      projSpeed: 730, rageBelowHp: 70, shots: [-0.3, 0, 0.3], rageShots: [-0.6, -0.36, -0.12, 0.12, 0.36, 0.6], sizeMul: 1.4, tint: 0xc98bff, defeatCoins: 75, defeatScore: 7000 },
  ],

  ANIM: {
    playerWalk: { key: 'player_walk', path: 'imagegen/characters/player_boy_walk_8frames_imagegen.png', type: 'image', frames: 8, frameW: 512, frameH: 512, renderW: 4096, renderH: 512, frameRate: 14 },
    poopSpin: { key: 'poop_spin', path: 'imagegen/enemies/poop/poop_spin_8frames_imagegen.png', type: 'image', frames: 8, frameW: 512, frameH: 512, renderW: 4096, renderH: 512, frameRate: 16 },
    bossAttack: { key: 'boss_attack', path: 'imagegen/enemies/boss/toilet_boss_attack_12frames_imagegen.png', type: 'image', frames: 12, frameW: 768, frameH: 768, renderW: 9216, renderH: 768, frameRate: 14, repeat: 0 },
    // 다중 텍스처 프레임 애니(키 배열)
    coinSpin: { key: 'coin_spin', frameKeys: ['coin_01', 'coin_02'], frameRate: 8 },
    heartPulse: { key: 'heart_pulse', frameKeys: ['heart_01', 'heart_02'], frameRate: 3 },
    poisonFloor: { key: 'poison_floor', frameKeys: ['poison_floor_01', 'poison_floor_02', 'poison_floor_03'], frameRate: 6 },
  },

  ASSETS: {
    bg: { w: 1080, h: 1920 },
    backgrounds: [
      { key: 'bg_city', path: 'imagegen/backgrounds/full/bg_city_game_imagegen.png', type: 'image' },
      { key: 'bg_park', path: 'imagegen/backgrounds/full/bg_park_game_imagegen.png', type: 'image' },
      { key: 'bg_school', path: 'imagegen/backgrounds/full/bg_school_game_imagegen.png', type: 'image' },
      { key: 'bg_subway', path: 'imagegen/backgrounds/full/bg_subway_game_imagegen.png', type: 'image' },
      { key: 'bg_space', path: 'imagegen/backgrounds/full/bg_space_game_imagegen.png', type: 'image' },
      { key: 'bg_desert', path: 'imagegen/backgrounds/full/bg_desert_game_imagegen.png', type: 'image' },
      { key: 'bg_iceberg', path: 'imagegen/backgrounds/full/bg_iceberg_game_imagegen.png', type: 'image' },
      { key: 'bg_lava', path: 'imagegen/backgrounds/full/bg_lava_game_imagegen.png', type: 'image' },
    ],
    // 캐릭터: tex=정지 텍스처, walk=걷기 애니 키(있으면 인게임에서 사용)
    characters: [
      { id: 'boy', tex: 'char_boy', path: 'imagegen/characters/player_boy_imagegen.png', type: 'image', name: '소년', price: 0 },
      { id: 'girl', tex: 'char_girl', path: 'imagegen/characters/player_girl_imagegen.png', type: 'image', name: '소녀', price: 60 },
      { id: 'office', tex: 'char_office', path: 'imagegen/characters/player_office_worker_imagegen.png', type: 'image', name: '직장인', price: 60 },
      { id: 'rabbit', tex: 'char_rabbit', path: 'imagegen/characters/player_rabbit_imagegen.png', type: 'image', name: '토끼', price: 200 },
      { id: 'cat', tex: 'char_cat', path: 'imagegen/characters/player_cat_imagegen.png', type: 'image', name: '고양이', price: 200 },
      { id: 'duck', tex: 'char_duck', path: 'imagegen/characters/player_duck_imagegen.png', type: 'image', name: '오리', price: 200 },
      { id: 'ninja', tex: 'char_ninja', path: 'imagegen/characters/player_ninja_imagegen.png', type: 'image', name: '닌자', price: 400 },
      { id: 'astronaut', tex: 'char_astro', path: 'imagegen/characters/player_astronaut_imagegen.png', type: 'image', name: '우주인', price: 400 },
    ],
    shopBackgrounds: [
      { key: 'bg_city', card: 'card_city', cardPath: 'imagegen/backgrounds/cards/bg_city_card_imagegen.png', type: 'image', name: '도시', price: 0 },
      { key: 'bg_park', card: 'card_park', cardPath: 'imagegen/backgrounds/cards/bg_park_card_imagegen.png', type: 'image', name: '공원', price: 60 },
      { key: 'bg_school', card: 'card_school', cardPath: 'imagegen/backgrounds/cards/bg_school_card_imagegen.png', type: 'image', name: '학교', price: 60 },
      { key: 'bg_subway', card: 'card_subway', cardPath: 'imagegen/backgrounds/cards/bg_subway_card_imagegen.png', type: 'image', name: '지하철', price: 60 },
      { key: 'bg_desert', card: 'card_desert', cardPath: 'imagegen/backgrounds/cards/bg_desert_card_imagegen.png', type: 'image', name: '사막', price: 220 },
      { key: 'bg_iceberg', card: 'card_iceberg', cardPath: 'imagegen/backgrounds/cards/bg_iceberg_card_imagegen.png', type: 'image', name: '빙하', price: 220 },
      { key: 'bg_space', card: 'card_space', cardPath: 'imagegen/backgrounds/cards/bg_space_card_imagegen.png', type: 'image', name: '우주', price: 400 },
      { key: 'bg_lava', card: 'card_lava', cardPath: 'imagegen/backgrounds/cards/bg_lava_card_imagegen.png', type: 'image', name: '용암', price: 400 },
    ],
    boss: {
      front: { key: 'boss_front', path: 'imagegen/enemies/boss/toilet_boss_front_imagegen.png', type: 'image' },
      open: { key: 'boss_open', path: 'imagegen/enemies/boss/toilet_boss_open_imagegen.png', type: 'image' },
      attack: { key: 'boss_attack_img', path: 'imagegen/enemies/boss/toilet_boss_attack_imagegen.png', type: 'image' },
      hit: { key: 'boss_hit', path: 'imagegen/enemies/boss/toilet_boss_hit_imagegen.png', type: 'image' },
      projectile: { key: 'boss_proj', path: 'imagegen/enemies/boss/toilet_projectile_poop_imagegen.png', type: 'image', size: 92 },
      size: 160,
    },
    effects: [
      { key: 'fx_explosion', path: 'imagegen/effects/common/explosion_imagegen.png', type: 'image' },
      { key: 'fx_smoke', path: 'imagegen/effects/common/smoke_puff_imagegen.png', type: 'image' },
      { key: 'fx_sparkle', path: 'imagegen/effects/common/sparkle_trail_imagegen.png', type: 'image' },
      { key: 'fx_star_ring', path: 'imagegen/effects/common/star_ring_imagegen.png', type: 'image' },
    ],
    messages: [
      { key: 'msg_warning', path: 'imagegen/messages/msg_warning_imagegen.png', type: 'image', w: 720, h: 220 },
      { key: 'msg_fantastic', path: 'imagegen/messages/msg_fantastic_imagegen.png', type: 'image', w: 780, h: 220 },
      { key: 'msg_gameover', path: 'imagegen/messages/msg_gameover_imagegen.png', type: 'image', w: 760, h: 240 },
    ],
    ui: {
      buttons: [
        { key: 'btn_home', path: 'imagegen/ui/button_home_imagegen.png', type: 'image' },
        { key: 'btn_pause', path: 'imagegen/ui/button_pause_imagegen.png', type: 'image' },
        { key: 'btn_ranking', path: 'imagegen/ui/button_ranking_imagegen.png', type: 'image' },
        { key: 'btn_restart', path: 'imagegen/ui/button_restart_imagegen.png', type: 'image' },
        { key: 'btn_settings', path: 'imagegen/ui/button_settings_imagegen.png', type: 'image' },
        { key: 'btn_shop', path: 'imagegen/ui/button_shop_imagegen.png', type: 'image' },
        { key: 'btn_sound', path: 'imagegen/ui/button_sound_imagegen.png', type: 'image' },
        { key: 'btn_trophy', path: 'imagegen/ui/button_trophy_imagegen.png', type: 'image' },
      ],
      wideButtons: [
        { key: 'btn_wide_play', path: 'imagegen/ui/wide/button_play_primary_imagegen.png', type: 'image' },
        { key: 'btn_wide_continue', path: 'imagegen/ui/wide/button_continue_imagegen.png', type: 'image' },
        { key: 'btn_wide_menu', path: 'imagegen/ui/wide/button_menu_wide_imagegen.png', type: 'image' },
        { key: 'btn_wide_restart', path: 'imagegen/ui/wide/button_restart_wide_imagegen.png', type: 'image' },
        { key: 'btn_wide_home', path: 'imagegen/ui/wide/button_home_wide_imagegen.png', type: 'image' },
        { key: 'btn_wide_sound_on', path: 'imagegen/ui/wide/button_sound_on_wide_imagegen.png', type: 'image' },
        { key: 'btn_wide_sound_off', path: 'imagegen/ui/wide/button_sound_off_wide_imagegen.png', type: 'image' },
        { key: 'btn_wide_danger', path: 'imagegen/ui/wide/button_danger_wide_imagegen.png', type: 'image' },
      ],
      hudPanel: { key: 'hud_panel', path: 'imagegen/ui/hud_panel_imagegen.png', type: 'image', w: 860, h: 264 },
      btnSize: 118,
    },
    // 단일 프레임 애니에 쓰이는 개별 텍스처(경로/크기)
    frameTex: [
      { key: 'coin_01', path: 'imagegen/items/coin_poop_01_imagegen.png', type: 'image', size: 72 },
      { key: 'coin_02', path: 'imagegen/items/coin_poop_02_imagegen.png', type: 'image', size: 72 },
      { key: 'heart_01', path: 'imagegen/items/heart_continue_01_imagegen.png', type: 'image', size: 92 },
      { key: 'heart_02', path: 'imagegen/items/heart_continue_02_imagegen.png', type: 'image', size: 92 },
      { key: 'poison_floor_01', path: 'imagegen/effects/hazard/poison_floor_01_imagegen.png', type: 'image', size: 150 },
      { key: 'poison_floor_02', path: 'imagegen/effects/hazard/poison_floor_02_imagegen.png', type: 'image', size: 150 },
      { key: 'poison_floor_03', path: 'imagegen/effects/hazard/poison_floor_03_imagegen.png', type: 'image', size: 150 },
    ],
  },

  AUDIO: {
    music: {
      arcadeSurvivalLoop: {
        key: 'music_arcade_survival_loop',
        path: 'audio/music/arcade_survival_loop.ogg',
        bpm: 152,
        bars: 32,
        volume: 0.28,
      },
    },
    ui: { buttonClick: { key: 'button_click', path: 'audio/ui/button_click.ogg' } },
    sfx: {
      dodgeTicks: [
        { key: 'dodge_tick_01', path: 'audio/sfx/dodge_tick_01.ogg' },
        { key: 'dodge_tick_02', path: 'audio/sfx/dodge_tick_02.ogg' },
        { key: 'dodge_tick_03', path: 'audio/sfx/dodge_tick_03.ogg' },
      ],
      nearMiss: { key: 'near_miss_whoosh_tick', path: 'audio/sfx/near_miss_whoosh_tick.ogg' },
      coin: { key: 'coin_ding', path: 'audio/sfx/coin_ding.ogg' },
      warning: { key: 'warning_beep', path: 'audio/sfx/warning_beep.ogg' },
      hit: { key: 'hit_splat', path: 'audio/sfx/hit_splat.ogg' },
      gameOver: { key: 'game_over_jingle', path: 'audio/sfx/game_over_jingle.ogg' },
      shield: { key: 'powerup_shield', path: 'audio/sfx/powerup_shield.ogg' },
    },
  },
};

export const SCENES = {
  BOOT: 'Boot', HOME: 'Home', SHOP: 'Shop', RANKING: 'Ranking', SETTINGS: 'Settings',
  GAME: 'Game', PAUSE: 'Pause', GAMEOVER: 'GameOver',
};
