import { GC, SCENES } from '../config/gameConfig.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  preload() {
    this.add
      .text(GC.WIDTH / 2, GC.HEIGHT / 2, 'LOADING...', { fontFamily: 'Arial', fontSize: '64px', color: '#fff' })
      .setOrigin(0.5);

    const A = GC.ASSETS;
    const assetUrl = (path) => {
      const base = import.meta.env.BASE_URL || '/';
      return `${base.endsWith('/') ? base : `${base}/`}${path}`;
    };
    const image = (key, path) => this.load.image(key, assetUrl(path));
    const isRaster = (path) => /\.(png|jpe?g|webp)$/i.test(path);
    const loadTexture = (item, w, h) => {
      if (item.type === 'image' || isRaster(item.path)) {
        image(item.key || item.tex || item.card, item.path);
      } else {
        svg(item.key || item.tex || item.card, item.path, w, h);
      }
    };
    const svg = (key, path, w, h) => this.load.svg(key, assetUrl(path), { width: w, height: h });
    const audio = (key, path) => this.load.audio(key, assetUrl(path));
    const sheet = (cfg) => {
      if (cfg.type === 'image' || isRaster(cfg.path)) {
        this.load.spritesheet(cfg.key, assetUrl(cfg.path), { frameWidth: cfg.frameW, frameHeight: cfg.frameH });
      } else {
        svg(cfg.key, cfg.path, cfg.renderW, cfg.renderH);
      }
    };

    // 배경 (풀스크린) + 카드 썸네일
    A.backgrounds.forEach((b) => {
      const path = b.path || `backgrounds/${b.key}.svg`;
      if (b.type === 'image' || /\.(png|jpe?g|webp)$/i.test(path)) {
        image(b.key, path);
      } else {
        svg(b.key, path, A.bg.w, A.bg.h);
      }
    });
    A.shopBackgrounds.forEach((b) => loadTexture({ key: b.card, path: b.cardPath, type: b.type }, 240, 360));

    // 캐릭터 정지 텍스처
    A.characters.forEach((c) => loadTexture(c, GC.PLAYER.SIZE, GC.PLAYER.SIZE));

    // 애니메이션 시트(단일 텍스처)
    const usedCharacterAnimations = new Set(A.characters.map((c) => c.walk).filter(Boolean));
    const animationSheets = [GC.ANIM.poopSpin, GC.ANIM.bossAttack];
    if (usedCharacterAnimations.has(GC.ANIM.playerWalk.key)) animationSheets.unshift(GC.ANIM.playerWalk);
    animationSheets.forEach((a) => sheet(a));

    // 똥 정지 variant (anim 종류 제외)
    this.poopSizes = this.collectPoopVariants();
    Object.entries(this.poopSizes).forEach(([key, v]) => loadTexture({ key, path: v.path, type: v.type }, v.size, v.size));

    // 보스
    const b = A.boss;
    [b.front, b.open, b.attack, b.hit].forEach((o) => loadTexture(o, b.size * 2, b.size * 2));
    loadTexture(b.projectile, b.projectile.size, b.projectile.size);

    // 파워업
    GC.POWERUPS.forEach((p) => loadTexture(p, p.size, p.size));

    // 프레임 텍스처(코인/하트/독바닥)
    A.frameTex.forEach((f) => loadTexture(f, f.size, f.size));

    // 이펙트
    A.effects.forEach((e) => loadTexture(e, 128, 128));

    // 메시지
    A.messages.forEach((m) => loadTexture(m, m.w, m.h));

    // UI
    A.ui.buttons.forEach((btn) => loadTexture(btn, A.ui.btnSize, A.ui.btnSize));
    A.ui.wideButtons.forEach((btn) => loadTexture(btn, 720, 190));
    loadTexture(A.ui.hudPanel, A.ui.hudPanel.w, A.ui.hudPanel.h);

    // 오디오
    const au = GC.AUDIO;
    Object.values(au.music || {}).forEach((m) => audio(m.key, m.path));
    audio(au.ui.buttonClick.key, au.ui.buttonClick.path);
    au.sfx.dodgeTicks.forEach((s) => audio(s.key, s.path));
    ['nearMiss', 'coin', 'warning', 'hit', 'gameOver', 'shield'].forEach((k) =>
      audio(au.sfx[k].key, au.sfx[k].path),
    );
  }

  create() {
    // 전역 마스터 볼륨(모든 SFX 볼륨을 낮춤)
    this.sound.volume = GC.MASTER_VOLUME;

    // 필수 텍스처 fallback
    GC.ASSETS.characters.forEach((c) => {
      if (!this.textures.exists(c.tex)) this.circleTex(c.tex, GC.PLAYER.SIZE, 0x4fa3ff);
    });
    GC.ASSETS.backgrounds.forEach((b) => {
      if (!this.textures.exists(b.key)) this.bgTex(b.key);
    });
    GC.ASSETS.shopBackgrounds.forEach((b) => {
      if (!this.textures.exists(b.card)) this.cardTex(b.card);
    });
    Object.entries(this.poopSizes).forEach(([key, v]) => {
      if (!this.textures.exists(key)) this.circleTex(key, v.size, 0x8a5a2b);
    });

    if (GC.ASSETS.characters.some((c) => c.walk === GC.ANIM.playerWalk.key)) {
      this.registerSheetAnim(GC.ANIM.playerWalk, 0x4fa3ff);
    }
    this.registerSheetAnim(GC.ANIM.poopSpin, 0x8a5a2b);
    this.registerSheetAnim(GC.ANIM.bossAttack, 0xdddddd);
    this.registerFrameAnim(GC.ANIM.coinSpin);
    this.registerFrameAnim(GC.ANIM.heartPulse);
    this.registerFrameAnim(GC.ANIM.poisonFloor);

    this.scene.start(SCENES.HOME);
  }

  collectPoopVariants() {
    const map = {};
    Object.values(GC.POOP_TYPES).forEach((t) => {
      if (t.anim) return; // 회전똥은 애니 시트 사용
      t.variants.forEach((v) => {
        if (!map[v.key]) map[v.key] = { path: v.path || `enemies/poop/${this.poopPath(v.key)}`, type: v.type, size: t.size };
      });
    });
    return map;
  }

  // config variant 키 → 실제 SVG 파일명
  poopPath(key) {
    const m = {
      poop_basic_01: 'poop_basic_01.svg', poop_basic_02: 'poop_basic_02.svg', poop_basic_03: 'poop_basic_03.svg',
      poop_large_01: 'poop_large_angry_01.svg', poop_large_02: 'poop_large_angry_02.svg', poop_large_03: 'poop_large_angry_03.svg',
      poop_small_01: 'poop_small_01.svg', poop_small_02: 'poop_small_02.svg', poop_small_03: 'poop_small_03.svg',
      poop_gold_01: 'poop_gold_01.svg', poop_gold_02: 'poop_gold_02.svg', poop_gold_03: 'poop_gold_03.svg',
      poop_poison_01: 'poop_poison_01.svg', poop_poison_02: 'poop_poison_02.svg', poop_poison_03: 'poop_poison_03.svg',
      poop_bird: 'poop_bird_fast.svg', poop_fake: 'poop_fake_shadow.svg',
    };
    return m[key] || `${key}.svg`;
  }

  registerSheetAnim(cfg, fallbackColor) {
    if (this.textures.exists(cfg.key)) {
      const tex = this.textures.get(cfg.key);
      for (let i = 0; i < cfg.frames; i++) {
        if (!tex.has(i)) tex.add(i, 0, i * cfg.frameW, 0, cfg.frameW, cfg.frameH);
      }
      if (!this.anims.exists(cfg.key)) {
        this.anims.create({
          key: cfg.key,
          frames: Array.from({ length: cfg.frames }, (_, i) => ({ key: cfg.key, frame: i })),
          frameRate: cfg.frameRate,
          repeat: cfg.repeat ?? -1, // 보스 공격 애니는 1회 재생(animationcomplete로 idle 복귀)
        });
      }
    } else {
      this.circleTex(cfg.key, cfg.frameW, fallbackColor);
      if (!this.anims.exists(cfg.key)) {
        this.anims.create({ key: cfg.key, frames: [{ key: cfg.key }], frameRate: 1, repeat: -1 });
      }
    }
  }

  registerFrameAnim(cfg) {
    const frames = cfg.frameKeys.filter((k) => this.textures.exists(k)).map((k) => ({ key: k }));
    if (frames.length === 0) return;
    if (!this.anims.exists(cfg.key)) {
      this.anims.create({ key: cfg.key, frames, frameRate: cfg.frameRate, repeat: -1 });
    }
  }

  circleTex(key, size, color) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const r = size / 2;
    g.fillStyle(0x000000, 1).fillCircle(r, r, r);
    g.fillStyle(color, 1).fillCircle(r, r, r - Math.max(3, size * 0.05));
    g.generateTexture(key, size, size);
    g.destroy();
  }

  bgTex(key) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillGradientStyle(0x1b2a4a, 0x1b2a4a, 0x0b0d1a, 0x0b0d1a, 1);
    g.fillRect(0, 0, GC.ASSETS.bg.w, GC.ASSETS.bg.h);
    g.generateTexture(key, GC.ASSETS.bg.w, GC.ASSETS.bg.h);
    g.destroy();
  }

  cardTex(key) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x10213b, 1).fillRoundedRect(0, 0, 240, 360, 24);
    g.lineStyle(6, 0xffffff, 0.45).strokeRoundedRect(3, 3, 234, 354, 22);
    g.fillStyle(0x4d86bd, 1).fillRect(0, 170, 240, 95);
    g.fillStyle(0x6cbd6b, 1).fillRect(0, 265, 240, 95);
    g.generateTexture(key, 240, 360);
    g.destroy();
  }
}
