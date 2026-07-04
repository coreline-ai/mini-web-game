import { GC, SCENES } from '../config/gameConfig.js';
import { FONT_BODY, FONT_HEAVY, fitTextWidth } from '../ui/UiKit.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  preload() {
    const loadingUi = this.buildLoadingUi();
    this.load.on('progress', loadingUi.setProgress);
    this.load.on('fileprogress', loadingUi.setFile);
    this.load.on('complete', () => loadingUi.setProgress(1));

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
    [
      'nearMiss', 'coin', 'warning', 'hit', 'gameOver', 'shield',
      'bossAppear', 'bossDefeat',
    ].forEach((k) => audio(au.sfx[k].key, au.sfx[k].path));
  }

  buildLoadingUi() {
    const cx = GC.WIDTH / 2;
    const bg = this.add.graphics().setDepth(0);
    bg.fillGradientStyle(0x0886c8, 0x0886c8, 0x0a1424, 0x0a1424, 1);
    bg.fillRect(0, 0, GC.WIDTH, GC.HEIGHT);
    bg.fillStyle(0xffffff, 0.16);
    for (let i = 0; i < 34; i++) {
      const x = 44 + ((i * 137) % (GC.WIDTH - 88));
      const y = 110 + ((i * 223) % 930);
      const r = 2 + (i % 3);
      bg.fillCircle(x, y, r);
    }
    bg.fillStyle(0x000000, 0.34);
    bg.fillRect(0, 0, GC.WIDTH, GC.HEIGHT);

    const panelG = this.add.graphics().setDepth(1);
    panelG.fillStyle(0x07101f, 0.76);
    panelG.fillRoundedRect(115, 360, 850, 1050, 42);
    panelG.lineStyle(5, 0x65eaff, 0.48);
    panelG.strokeRoundedRect(115, 360, 850, 1050, 42);
    panelG.lineStyle(2, 0xffffff, 0.22);
    panelG.strokeRoundedRect(135, 380, 810, 1010, 34);

    const title = this.add.text(cx, 475, "DON'T GET\nPOOPED!", {
      fontFamily: FONT_HEAVY,
      fontSize: '86px',
      color: '#ffffff',
      align: 'center',
      stroke: '#3a260c',
      strokeThickness: 12,
      lineSpacing: -10,
    }).setOrigin(0.5).setDepth(2);
    fitTextWidth(title, 760, 0.7);

    const spinner = this.add.container(cx, 760).setDepth(2);
    const poop = this.add.graphics();
    poop.lineStyle(8, 0x211105, 1);
    poop.fillStyle(0x8b4a1f, 1).fillEllipse(0, 48, 190, 72).strokeEllipse(0, 48, 190, 72);
    poop.fillStyle(0x9b5627, 1).fillEllipse(0, 4, 150, 78).strokeEllipse(0, 4, 150, 78);
    poop.fillStyle(0xb0662e, 1).fillEllipse(0, -44, 100, 60).strokeEllipse(0, -44, 100, 60);
    poop.fillStyle(0xc87935, 1).fillTriangle(-10, -72, 56, -88, 20, -36).strokeTriangle(-10, -72, 56, -88, 20, -36);
    poop.fillStyle(0xffffff, 1).fillCircle(-34, 14, 17).fillCircle(34, 14, 17);
    poop.fillStyle(0x111111, 1).fillCircle(-34, 16, 8).fillCircle(34, 16, 8);
    poop.lineStyle(7, 0x241103, 1).beginPath().arc(0, 38, 28, 0.08, Math.PI - 0.08).strokePath();
    poop.fillStyle(0xffad4d, 0.55).fillEllipse(-38, -28, 42, 20);
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.28).fillEllipse(0, 116, 230, 34);
    spinner.add([shadow, poop]);
    this.tweens.add({ targets: poop, angle: 360, duration: 1150, repeat: -1, ease: 'Linear' });
    this.tweens.add({ targets: spinner, y: 746, scale: 1.04, duration: 560, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    const loadingText = this.add.text(cx, 940, 'LOADING', {
      fontFamily: FONT_HEAVY,
      fontSize: '58px',
      color: '#ffd54a',
      stroke: '#000000',
      strokeThickness: 7,
    }).setOrigin(0.5).setDepth(2);

    let dots = 0;
    this.time.addEvent({
      delay: 280,
      loop: true,
      callback: () => {
        dots = (dots + 1) % 4;
        loadingText.setText(`LOADING${'.'.repeat(dots)}`);
      },
    });

    const barX = 180;
    const barY = 1030;
    const barW = 720;
    const barH = 64;
    const barBack = this.add.graphics().setDepth(2);
    barBack.fillStyle(0x031122, 0.95).fillRoundedRect(barX, barY, barW, barH, 26);
    barBack.lineStyle(5, 0xffffff, 0.82).strokeRoundedRect(barX, barY, barW, barH, 26);
    barBack.lineStyle(3, 0x45e9ff, 0.82).strokeRoundedRect(barX + 7, barY + 7, barW - 14, barH - 14, 20);

    const barFill = this.add.graphics().setDepth(3);
    const percentText = this.add.text(cx, barY + barH / 2, '0%', {
      fontFamily: FONT_HEAVY,
      fontSize: '34px',
      color: '#ffffff',
      stroke: '#061020',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(4);

    const fileText = this.add.text(cx, 1140, '에셋 준비 중', {
      fontFamily: FONT_BODY,
      fontSize: '34px',
      color: '#ffffffcc',
      align: 'center',
    }).setOrigin(0.5).setDepth(2);
    fitTextWidth(fileText, 700, 0.7);

    const tipList = [
      'TIP: 황금똥은 피하면 +500점!',
      'TIP: Near Miss는 20점 보너스!',
      'TIP: 우산은 10초 동안 보호해줘!',
      'TIP: 30초마다 WARNING 폭격이 온다!',
      'TIP: 번개 아이템은 화면을 정리한다!',
    ];
    const tipText = this.add.text(cx, 1260, tipList[Phaser.Math.Between(0, tipList.length - 1)], {
      fontFamily: FONT_HEAVY,
      fontSize: '34px',
      color: '#8eff5d',
      align: 'center',
      stroke: '#052100',
      strokeThickness: 4,
      wordWrap: { width: 760 },
    }).setOrigin(0.5).setDepth(2);
    this.tweens.add({ targets: tipText, alpha: 0.56, duration: 760, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    const drawProgress = (value) => {
      const pct = Phaser.Math.Clamp(value || 0, 0, 1);
      const fillW = Math.max(0, Math.floor((barW - 18) * pct));
      barFill.clear();
      if (fillW > 4) {
        barFill.fillGradientStyle(0x7cff00, 0x7cff00, 0x10b800, 0x10b800, 1);
        barFill.fillRoundedRect(barX + 9, barY + 9, fillW, barH - 18, 18);
        barFill.fillStyle(0xffffff, 0.34);
        barFill.fillRoundedRect(barX + 22, barY + 16, Math.max(0, fillW - 34), 13, 8);
        barFill.lineStyle(2, 0xffff66, 0.55);
        for (let x = barX + 22; x < barX + 9 + fillW - 14; x += 34) {
          barFill.lineBetween(x, barY + 47, x + 15, barY + 22);
        }
      }
      percentText.setText(`${Math.round(pct * 100)}%`);
    };

    const fileLabel = (file) => {
      const key = String(file?.key || '');
      const type = String(file?.type || 'asset');
      if (type.includes('audio')) return '사운드 에셋 불러오는 중';
      if (key.includes('bg') || key.includes('card')) return '배경 에셋 불러오는 중';
      if (key.includes('char') || key.includes('player')) return '캐릭터 에셋 불러오는 중';
      if (key.includes('poop') || key.includes('boss')) return '장애물 에셋 불러오는 중';
      if (key.includes('btn') || key.includes('hud') || key.includes('msg')) return 'UI 에셋 불러오는 중';
      return '게임 에셋 불러오는 중';
    };

    drawProgress(0);
    return {
      setProgress: drawProgress,
      setFile: (file) => {
        fileText.setText(fileLabel(file));
        fitTextWidth(fileText, 700, 0.7);
      },
    };
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
