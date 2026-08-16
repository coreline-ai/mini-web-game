import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayout, clearLayout } from '../systems/LayoutRegistry.js';
import { px, font, PALETTE } from '../config/theme.js';
import { KEEPER_RULES, SHOT_TYPES } from '../config/keeperConfig.js';
import { GOAL_LINE_BY_STAGE, GOAL_MOUTH, PANEL_SLICE, SHOOTER_LINE, CROSSBAR_Y } from '../config/spriteMetrics.js';
import KeeperController, { KEEPER_STATE } from '../systems/KeeperController.js';
import ShotDirector from '../systems/ShotDirector.js';
import { judgeSave, reboundVector, scoreFor, SAVE } from '../systems/SaveJudge.js';
import { deflect } from '../systems/BallPhysics.js';
import Ball, { BALL_STATE } from '../entities/Ball.js';
import Keeper from '../entities/Keeper.js';
import Shooter from '../entities/Shooter.js';
import { AudioManager } from '../systems/AudioManager.js';
import { SaveData } from '../systems/SaveData.js';

const BALL_POOL = 4;

export default class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }

  create() {
    const { width, height } = SPEC.canvas;
    this.rng = new Phaser.Math.RandomDataGenerator([String(this.time.now)]);
    this.rules = KEEPER_RULES;
    this.score = 0;
    this.combo = 0;
    this.saves = 0;
    this.conceded = 0;
    this.ended = false;

    // 골라인은 배경 아트의 골대 위치에서 온다. 배경마다 다르므로 스테이지가 바뀌면 갱신한다.
    // 화면 비율로만 잡으면 키퍼가 골대 위 잔디에 서 있게 된다.
    this.goalY = height * GOAL_LINE_BY_STAGE[0];
    // height=1(크로스바 높이)인 공이 도착할 때 올라갈 화면 거리. 골라인이 배경마다 다르므로
    // 크로스바까지의 실제 간격도 함께 달라진다 — 고정 픽셀을 쓰면 어떤 스테이지에서는 공이
    // 골대 위로 넘어가 보인다.
    this.crossbarLiftPx = this.goalY - height * CROSSBAR_Y;
    this.u = px(1);

    this.buildBackdrop(width, height);
    this.buildHud(width, height);

    // ── 게임플레이 오브젝트 (배경은 골대·잔디·관중을 소유, 런타임은 이것들만)
    // 슈터는 잔디 위 균일 발사선에 선다. 이전에는 height * 0.20이라 다섯 배경 모두에서
    // 하늘 또는 관중석에 떠 있었다.
    this.shooter = new Shooter(this, { unit: this.u, groundY: height * SHOOTER_LINE, widthPx: px(66) });
    this.keeper = new Keeper(this, { unit: this.u, widthPx: px(120) });
    this.balls = Array.from({ length: BALL_POOL }, () => new Ball(this, { unit: this.u }));

    this.control = new KeeperController(this, {
      unit: this.u,
      control: this.rules.control,
      minX: width * (GOAL_MOUTH.left + 0.04),
      maxX: width * (GOAL_MOUTH.right - 0.04),
      homeX: width * 0.5,
    });

    this.director = new ShotDirector({
      rules: this.rules,
      rng: this.rng,
      onStageChange: (stage) => this.onStageChange(stage),
      onVictory: () => this.finish('win'),
    });

    this.bindInput(width, height);
    this.publishRules();
    this.refreshHud();
    this.publish();
    if (this.cache.audio.exists('bgm-gameplay')) AudioManager.playMusic(this, 'bgm-gameplay');

    this.installDebugHooks();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  // ── 화면 ──────────────────────────────────────────────────────────────────
  buildBackdrop(width, height) {
    this.backdrop = this.add.image(width / 2, height / 2, 'bg_0').setDepth(-20);
    this.fitBackdrop(this.backdrop);
    this.backdropNext = this.add.image(width / 2, height / 2, 'bg_0').setDepth(-19).setAlpha(0);
    this.fitBackdrop(this.backdropNext);
    this.rainLayer = null;
  }

  fitBackdrop(img) {
    const { width, height } = SPEC.canvas;
    const s = Math.max(width / (img.width || width), height / (img.height || height));
    img.setScale(s);
  }

  buildHud(width, height) {
    // 스코어보드는 **9-slice**. setDisplaySize로 늘리면 테두리가 한쪽만 두꺼워지고 베벨이
    // 뭉갠다(직전 게임 실측: 2.00:1 자산을 4.54:1로 늘려 좌우 1.47배).
    const panelW = width - px(40);
    const panelH = px(84);
    const panelY = px(58);
    if (this.textures.exists('panel-scoreboard')) {
      this.panel = this.add.nineslice(
        width / 2, panelY, 'panel-scoreboard', undefined,
        panelW / PANEL_SLICE.scale, panelH / PANEL_SLICE.scale,
        PANEL_SLICE.left, PANEL_SLICE.right, PANEL_SLICE.top, PANEL_SLICE.bottom,
      ).setScale(PANEL_SLICE.scale).setDepth(20);
    } else {
      this.panel = this.add.rectangle(width / 2, panelY, panelW, panelH, PALETTE.panel, 0.92)
        .setStrokeStyle(px(2), PALETTE.accentDim).setDepth(20);
    }
    const inset = px(24);
    const fieldLeft = width / 2 - panelW / 2 + PANEL_SLICE.left * PANEL_SLICE.scale + inset;
    const fieldRight = width / 2 + panelW / 2 - PANEL_SLICE.right * PANEL_SLICE.scale - inset;

    this.scoreText = this.add.text(fieldLeft, panelY - px(13), '0', {
      fontFamily: 'Arial Black,Arial', fontSize: font(22), color: PALETTE.text,
    }).setOrigin(0, 0.5).setDepth(21);
    this.stageText = this.add.text(fieldRight, panelY - px(13), '', {
      fontFamily: 'Arial', fontSize: font(14), color: PALETTE.textDim,
    }).setOrigin(1, 0.5).setDepth(21);
    this.statusText = this.add.text(width / 2, panelY + px(15), '', {
      fontFamily: 'Arial', fontSize: font(14), color: '#ffe066',
    }).setOrigin(0.5).setDepth(21);

    this.pauseBtn = makeTextButton(this, width - px(38), px(140), 'Ⅱ', () => this.openPause(), { variant: 'icon' });
    this.pauseBtn.bg.setDepth(20); this.pauseBtn.txt.setDepth(21);
    this.helpBtn = makeTextButton(this, width - px(38), px(206), '?', () => this.openHelp(), { variant: 'icon' });
    this.helpBtn.bg.setDepth(20); this.helpBtn.txt.setDepth(21);
  }

  // ── 입력 ──────────────────────────────────────────────────────────────────
  bindInput(width, height) {
    // 조작 영역은 화면 하단 절반 전체다. 키퍼를 직접 짚지 않아도 되게 해 엄지 이동을 줄인다.
    this.zone = this.add.zone(width / 2, height * 0.75, width, height * 0.5)
      .setOrigin(0.5).setInteractive();
    this.zone.on('pointerdown', (p) => {
      if (this.ended) return;
      this.control.beginPointer(p);
      this.tryPunch(p);
    });
    this.zone.on('pointermove', (p) => {
      if (this.ended || !p.isDown) return;
      const action = this.control.movePointer(p);
      if (action === 'dive') this.onDive();
    });
    const release = (p) => this.control.endPointer(p);
    this.zone.on('pointerup', release);
    this.zone.on('pointerupoutside', release);
  }

  onDive() {
    AudioManager.playSfx(this, 'sfx-whistle', 0.18);
    this.spawnFx('fx-glove', this.keeper.sprite.x, this.goalY - px(40), 0.9);
  }

  // 탭 펀칭 — 가까운 리바운드를 밀어낸다.
  tryPunch(pointer) {
    const near = this.liveBalls().find((b) => Math.abs(b.x - this.control.x) < this.rules.control.punchRange
      && Math.abs(b.y - this.goalY) < this.rules.control.punchRange);
    if (!near || near.state !== BALL_STATE.LIVE) return;
    const vec = reboundVector(SAVE.PUNCH, near, this.control.x, this.rules.rebound);
    near.rebound(vec, this.rules.rebound);
    AudioManager.playSfx(this, 'sfx-punch', 0.8);
    this.spawnFx('fx-glove', near.x, near.y, 1);
  }

  // ── 루프 ──────────────────────────────────────────────────────────────────
  update(_time, delta) {
    if (this.ended) return;
    const { width, height } = SPEC.canvas;

    this.control.update(delta);
    this.keeper.update(this.control, this.goalY);

    const bounds = { minX: width * 0.10, maxX: width * 0.90, minY: height * (SHOOTER_LINE - 0.04), maxY: height * 0.98 };
    for (const ball of this.balls) {
      const event = ball.update(delta, bounds, this.rules.rebound);
      if (event === 'goal-line') this.resolveAtLine(ball);
    }

    const live = this.liveBalls().length;
    const cue = this.director.tick(delta, live);
    if (cue.fire) this.fireShot(cue);
    if (cue.advanced && !cue.victory) this.onStageAdvanced(cue);

    this.refreshHud();
    this.publish();
  }

  liveBalls() { return this.balls.filter((b) => b.alive); }

  fireShot(cue) {
    const ball = this.balls.find((b) => !b.alive);
    if (!ball) return;
    const { width, height } = SPEC.canvas;
    const type = SHOT_TYPES[cue.type] || SHOT_TYPES.drive;
    const fromX = width * (0.28 + this.rng.frac() * 0.44);
    const toX = width * (0.18 + this.rng.frac() * 0.64);

    this.shooter.telegraph(fromX, type, () => {
      if (this.ended) return;
      ball.launch({ type, fromX, fromY: height * SHOOTER_LINE, toX, goalY: this.goalY, crossbarLiftPx: this.crossbarLiftPx });
      if (cue.deflect) this.time.delayedCall(220, () => { if (ball.alive) deflect(ball, this.rng); });
      AudioManager.playSfx(this, 'sfx-shot', 0.75);
      this.spawnFx('fx-turf', fromX, height * SHOOTER_LINE, 0.7);
    });
  }

  resolveAtLine(ball) {
    const reach = this.keeper.bodyHalfWidth(this.control);
    const grade = judgeSave(ball, this.control.x, reach, {
      diving: this.control.diving,
      catchMaxHeight: 0.55,
      blockMaxHeight: 0.75,
      catchMaxSpeed: 1300,
    });

    if (grade === SAVE.MISS) { this.concede(ball); return; }

    this.saves += 1;
    this.director.registerSave();
    this.combo = Math.min(this.rules.comboMax, this.combo + this.rules.comboStep);
    this.score += scoreFor(grade, this.rules) * this.combo;

    if (grade === SAVE.CATCH) {
      ball.retire();
      this.control.playCatch();
      AudioManager.playSfx(this, 'sfx-catch', 0.85);
      this.spawnFx('fx-glove', ball.x, ball.y, 1.1);
    } else {
      const vec = reboundVector(grade, ball, this.control.x, this.rules.rebound);
      const alive = ball.rebound(vec, this.rules.rebound);
      AudioManager.playSfx(this, grade === SAVE.PUNCH ? 'sfx-punch' : 'sfx-shot', 0.8);
      this.spawnFx('fx-impact', ball.x, ball.y, 0.9);
      if (!alive) this.spawnFx('fx-turf', ball.x, ball.y, 0.6);
    }
    this.refreshHud();
  }

  concede(ball) {
    ball.retire();
    this.conceded += 1;
    this.combo = 0;
    this.director.registerConcede();
    AudioManager.playSfx(this, 'sfx-net', 0.9);
    this.spawnFx('fx-net-ripple', ball.x, this.goalY, 1.4);
    this.cameras.main.shake(220, 0.006);
    this.refreshHud();
    if (this.conceded >= this.rules.concedeAllowance) this.finish('loss');
  }

  onStageAdvanced(cue) {
    if (cue.clean) this.score += this.rules.cleanStageBonus;
    AudioManager.playSfx(this, 'sfx-whistle', 0.7);
    this.showBanner(cue.clean ? 'CLEAN SHEET' : `STAGE ${this.director.stageNumber}`);
  }

  onStageChange(stage) {
    // 배경이 바뀌면 골라인도 그 배경의 값으로 옮긴다.
    const line = GOAL_LINE_BY_STAGE[stage.index - 1];
    if (typeof line === 'number') {
      this.goalY = SPEC.canvas.height * line;
      this.crossbarLiftPx = this.goalY - SPEC.canvas.height * CROSSBAR_Y;
    }
    const key = stage.backdrop;
    if (!this.textures.exists(key)) return;
    this.backdropNext.setTexture(key);
    this.fitBackdrop(this.backdropNext);
    this.backdropNext.setAlpha(0);
    this.tweens.add({
      targets: this.backdropNext, alpha: 1, duration: 700,
      onComplete: () => {
        this.backdrop.setTexture(key);
        this.fitBackdrop(this.backdrop);
        this.backdropNext.setAlpha(0);
      },
    });
    if (stage.index === 5) this.startRain();
  }

  startRain() {
    if (this.rainLayer || !this.textures.exists('fx-rain')) return;
    const { width, height } = SPEC.canvas;
    this.rainLayer = this.add.tileSprite(width / 2, height / 2, width, height, 'fx-rain')
      .setDepth(18).setAlpha(0.28);
  }

  spawnFx(key, x, y, scale) {
    if (!this.textures.exists(key)) return;
    const size = px(150 * scale);
    const fx = this.add.image(x, y, key).setDisplaySize(size, size)
      .setDepth(17).setAlpha(0.95).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: fx, alpha: 0, scaleX: fx.scaleX * 1.6, scaleY: fx.scaleY * 1.6,
      duration: 380, ease: 'Sine.easeOut',
      // 소멸은 onComplete에서 — 남은 FX가 화면에 눌어붙는 것을 막는다(클래스 C).
      onComplete: () => fx.destroy(),
    });
  }

  showBanner(text) {
    const { width, height } = SPEC.canvas;
    const banner = this.add.text(width / 2, height * 0.38, text, {
      fontFamily: 'Arial Black,Arial', fontSize: font(30), color: '#ffe066',
      stroke: '#07130c', strokeThickness: px(5),
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({
      targets: banner, alpha: 0, y: banner.y - px(40), duration: 1100, ease: 'Sine.easeIn',
      onComplete: () => banner.destroy(),
    });
  }

  refreshHud() {
    const s = this.director.snapshot();
    this.scoreText.setText(String(this.score));
    this.stageText.setText(`STAGE ${s.stage}/${s.stageCount} · ${s.stageName}`);
    const comboText = this.combo > 1 ? `  COMBO ×${this.combo}` : '';
    this.statusText.setText(`세이브 ${this.saves}   실점 ${this.conceded}/${this.rules.concedeAllowance}${comboText}`);
  }

  publishRules() {
    if (typeof window === 'undefined') return;
    window.__GAME_RULES__ = {
      durationSeconds: SPEC.rules.durationSeconds,
      goal: SPEC.rules.goal,
      progressMetric: SPEC.rules.progressMetric,
      requiredObjectives: SPEC.rules.requiredObjectives,
      failConditions: SPEC.rules.failConditions,
      commands: SPEC.rules.commands,
      concedeAllowance: this.rules.concedeAllowance,
      stages: this.rules.stages.map((s) => ({ index: s.index, name: s.name, maxLiveBalls: s.maxLiveBalls })),
    };
  }

  openPause() { if (!this.ended) { this.scene.launch(SCENES.PAUSE); this.scene.pause(); } }
  openHelp() { if (!this.ended) { this.scene.launch(SCENES.PAUSE, { help: true }); this.scene.pause(); } }
  resumeFromOverlay() { this.control.endPointer(null); }

  finish(outcome) {
    if (this.ended) return;
    this.ended = true;
    for (const b of this.balls) b.reset();
    const best = Math.max(SaveData.getSettings().best || 0, this.score);
    SaveData.setSettings({ best });
    AudioManager.stopMusic();
    this.scene.start(SCENES.GAMEOVER, {
      outcome, score: this.score, best,
      saves: this.saves, conceded: this.conceded,
      stage: this.director.snapshot().stage,
    });
  }

  publish() {
    publishLayout(this, [
      { id: 'scoreboard', obj: this.panel, allowOverlapWith: ['score', 'stage-label', 'status'] },
      { id: 'score', obj: this.scoreText, allowOverlapWith: ['scoreboard'] },
      { id: 'stage-label', obj: this.stageText, allowOverlapWith: ['scoreboard'] },
      { id: 'status', obj: this.statusText, allowOverlapWith: ['scoreboard'] },
      { id: 'pause', obj: this.pauseBtn.bg },
      { id: 'help', obj: this.helpBtn.bg },
    ], { requiredIds: ['scoreboard', 'score', 'status', 'pause', 'help'] });
  }

  // ── QA ────────────────────────────────────────────────────────────────────
  qaSnapshot() {
    return {
      scene: SCENES.GAME,
      score: this.score,
      combo: this.combo,
      saves: this.saves,
      conceded: this.conceded,
      ended: this.ended,
      director: this.director.snapshot(),
      keeper: this.keeper.snapshot(this.control),
      control: this.control.snapshot(),
      balls: this.balls.map((b) => b.snapshot()),
      liveBalls: this.liveBalls().length,
      activeTweens: this.tweens.getTweens().length,
      activeTimers: this.time.getAllEvents?.().length ?? 0,
      audio: AudioManager.snapshot(),
    };
  }

  installDebugHooks() {
    if (typeof window === 'undefined') return;
    window.__KEEPER_DEBUG__ = {
      get: () => this.qaSnapshot(),
      liveBalls: () => this.liveBalls().length,
      // 스테이지 동시 공 상한을 지킨다 — 넘기면 실제 플레이에 없는 화면이 증거로 남는다.
      forceShot: (typeId, opts = {}) => {
        if (this.liveBalls().length >= this.director.stage.maxLiveBalls) return null;
        const ball = this.balls.find((b) => !b.alive);
        if (!ball) return null;
        const { width, height } = SPEC.canvas;
        const type = SHOT_TYPES[typeId] || SHOT_TYPES.drive;
        ball.launch({
          type,
          fromX: width * (opts.fromX ?? 0.5),
          fromY: height * SHOOTER_LINE,
          toX: width * (opts.toX ?? 0.5),
          goalY: this.goalY,
          // 실제 발사와 같은 인자를 넘긴다. 하나라도 빠지면 캡처 증거가 실제 플레이와
          // 달라지고(여기서는 lift가 NaN이 된다), 그 증거로 통과 판정을 내리게 된다.
          crossbarLiftPx: this.crossbarLiftPx,
        });
        if (opts.progress) {
          // 비행 중간 상태를 즉시 만든다(캡처용). 물리를 우회하지 않고 적분을 앞당긴다.
          const steps = Math.floor(opts.progress * 40);
          for (let i = 0; i < steps; i += 1) ball.update(16, { minX: 0, maxX: width, minY: 0, maxY: height }, this.rules.rebound);
        }
        return ball.snapshot();
      },
      forceDive: (dir) => this.control.startDive(dir >= 0 ? 1 : -1),
      forceRebound: () => {
        const ball = this.liveBalls()[0] || null;
        if (!ball) return null;
        ball.rebound({ vx: 700, vy: -400 }, this.rules.rebound);
        return ball.snapshot();
      },
      setStage: (index) => {
        const stage = this.rules.stages[Math.max(0, Math.min(this.rules.stages.length - 1, index - 1))];
        this.director.stageIndex = stage.index - 1;
        this.director.stageElapsedMs = 0;
        this.onStageChange(stage);
        this.refreshHud();
      },
      forceWin: () => this.finish('win'),
      forceLose: () => { this.conceded = this.rules.concedeAllowance; this.finish('loss'); },
    };
  }

  teardown() {
    for (const b of this.balls) b.destroy();
    this.keeper?.destroy();
    this.shooter?.destroy();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.zone?.removeAllListeners();
    clearLayout();
  }
}
