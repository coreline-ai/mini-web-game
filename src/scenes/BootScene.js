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
    const svg = (key, path, w, h) => this.load.svg(key, path, { width: w, height: h });

    // 배경 (풀스크린) + 카드 썸네일
    A.backgrounds.forEach((b) => svg(b.key, `backgrounds/${b.key}.svg`, A.bg.w, A.bg.h));
    A.shopBackgrounds.forEach((b) => svg(b.card, b.cardPath, 240, 360));

    // 캐릭터 정지 텍스처
    A.characters.forEach((c) => svg(c.tex, c.path, GC.PLAYER.SIZE, GC.PLAYER.SIZE));

    // 애니메이션 시트(단일 텍스처)
    [GC.ANIM.playerWalk, GC.ANIM.poopSpin, GC.ANIM.bossAttack].forEach((a) =>
      svg(a.key, a.path, a.renderW, a.renderH),
    );

    // 똥 정지 variant (anim 종류 제외)
    this.poopSizes = this.collectPoopVariants();
    Object.entries(this.poopSizes).forEach(([key, v]) => svg(key, v.path, v.size, v.size));

    // 보스
    const b = A.boss;
    [b.front, b.open, b.attack, b.hit].forEach((o) => svg(o.key, o.path, b.size * 2, b.size * 2));
    svg(b.projectile.key, b.projectile.path, b.projectile.size, b.projectile.size);

    // 파워업
    GC.POWERUPS.forEach((p) => svg(p.key, p.path, p.size, p.size));

    // 프레임 텍스처(코인/하트/독바닥)
    A.frameTex.forEach((f) => svg(f.key, f.path, f.size, f.size));

    // 이펙트
    A.effects.forEach((e) => svg(e.key, e.path, 128, 128));

    // 메시지
    A.messages.forEach((m) => svg(m.key, m.path, m.w, m.h));

    // UI
    A.ui.buttons.forEach((btn) => svg(btn.key, btn.path, A.ui.btnSize, A.ui.btnSize));
    svg(A.ui.hudPanel.key, A.ui.hudPanel.path, A.ui.hudPanel.w, A.ui.hudPanel.h);

    // 오디오
    const au = GC.AUDIO;
    this.load.audio(au.ui.buttonClick.key, au.ui.buttonClick.path);
    au.sfx.dodgeTicks.forEach((s) => this.load.audio(s.key, s.path));
    ['nearMiss', 'coin', 'warning', 'hit', 'gameOver', 'shield'].forEach((k) =>
      this.load.audio(au.sfx[k].key, au.sfx[k].path),
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
    Object.entries(this.poopSizes).forEach(([key, v]) => {
      if (!this.textures.exists(key)) this.circleTex(key, v.size, 0x8a5a2b);
    });

    this.registerSheetAnim(GC.ANIM.playerWalk, 0x4fa3ff);
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
        if (!map[v.key]) map[v.key] = { path: `enemies/poop/${this.poopPath(v.key)}`, size: t.size };
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
          repeat: -1,
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
}
