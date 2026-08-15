import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayout, clearLayout } from '../systems/LayoutRegistry.js';
import { px, font, PALETTE, BUTTON } from '../config/theme.js';
import { KEEPER_RULES, SIGNAL_CODES } from '../config/keeperConfig.js';
import { judge, renderCode, requestOf } from '../systems/SignalCodec.js';
import PatternInput from '../systems/PatternInput.js';
import ShipRouting from '../systems/ShipRouting.js';
import StageDirector from '../systems/StageDirector.js';
import { AudioManager } from '../systems/AudioManager.js';
import { SaveData } from '../systems/SaveData.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }

  create() {
    const { width, height } = SPEC.canvas;
    this.rng = new Phaser.Math.RandomDataGenerator([String(this.time.now)]);
    this.rules = KEEPER_RULES;
    this.score = 0;
    this.combo = 0;
    this.wrecks = 0;
    this.ended = false;

    // ── 배경 (배경이 소유하는 것: 등대·암초·바다. 런타임이 소유하는 것: 배·FX)
    this.backdrop = this.add.image(width / 2, height / 2, 'bg_0').setDepth(-20);
    this.fitBackdrop(this.backdrop);
    this.backdropNext = this.add.image(width / 2, height / 2, 'bg_0').setDepth(-19).setAlpha(0);
    this.fitBackdrop(this.backdropNext);
    this.add.rectangle(0, 0, width, height, 0x04101d, 0.28).setOrigin(0).setDepth(-18);

    // ── HUD
    this.scoreText = this.add.text(px(16), px(14), '0', {
      fontFamily: 'Arial Black,Arial', fontSize: font(26), color: PALETTE.text,
      stroke: '#04101d', strokeThickness: px(3),
    }).setDepth(20);
    this.comboText = this.add.text(px(16), px(46), '', {
      fontFamily: 'Arial Black,Arial', fontSize: font(15), color: '#ffcf6b',
      stroke: '#04101d', strokeThickness: px(3),
    }).setDepth(20);
    this.progressText = this.add.text(width / 2, px(20), '', {
      fontFamily: 'Arial', fontSize: font(15), color: PALETTE.text,
      align: 'center', stroke: '#04101d', strokeThickness: px(3),
    }).setOrigin(0.5, 0).setDepth(20);
    this.wreckText = this.add.text(width / 2, px(48), '', {
      fontFamily: 'Arial', fontSize: font(14), color: '#ff9d9d',
      align: 'center', stroke: '#04101d', strokeThickness: px(3),
    }).setOrigin(0.5, 0).setDepth(20);

    this.pause = makeTextButton(this, width - px(38), px(52), 'Ⅱ', () => this.openPause(),
      { variant: 'icon', oneShot: false });
    this.pause.bg.setDepth(20); this.pause.txt.setDepth(21);
    this.help = makeTextButton(this, width - px(38), px(52 + 66), '?', () => this.openHelp(),
      { variant: 'icon', oneShot: false });
    this.help.bg.setDepth(20); this.help.txt.setDepth(21);

    // ── 신호 코드 패널 (UI가 소유 — 게임플레이 오브젝트와 시각적으로 명확히 분리)
    this.buildCodePanel(width, height);

    // ── 램프 버튼 (생성된 아트를 쓰되, 없으면 절차적 폴백은 두지 않는다.
    //    혼합 소유(Class L)를 만들지 않기 위해 아트가 없으면 로드 에러로 드러낸다.)
    const lampY = height * 0.885;
    this.lampSize = px(140);
    this.lamp = this.add.image(width / 2, lampY, 'btn-lamp')
      .setDisplaySize(this.lampSize, this.lampSize).setDepth(20).setInteractive({ useHandCursor: true });
    this.lampGlow = this.add.image(width / 2, lampY, 'fx-beam-pulse')
      .setDisplaySize(px(280), px(280)).setDepth(19).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);

    // CLEAR를 화면 맨 아래 가로 버튼으로 두면 세로 공간을 통째로 먹어 바다가 좁아진다.
    // 램프 옆 아이콘 버튼으로 옮기면 엄지 사정거리는 그대로면서 한 층이 사라진다.
    this.clearBtn = makeTextButton(this, width * 0.17, lampY, '⌫',
      () => this.input_.clear('manual'), { variant: 'icon' });
    this.clearBtn.bg.setDepth(20); this.clearBtn.txt.setDepth(21);

    // ── 시스템
    this.input_ = new PatternInput(this, {
      longPressMs: this.rules.longPressMs,
      resetMs: this.rules.inputResetMs,
      onPulse: (pulse) => this.onPulse(pulse),
      onReset: () => this.renderBuffer(),
    });
    this.routing = new ShipRouting(this, {
      unit: px(1), rules: this.rules,
      onWreck: () => this.onWreck(),
    });
    this.director = new StageDirector({
      rules: this.rules,
      onStageChange: (stage) => this.onStageChange(stage),
      onVictory: () => this.finish('win'),
    });

    this.bindLamp();
    this.publishRules();
    this.refreshHud();
    this.publish();
    if (this.cache.audio.exists('bgm-gameplay')) AudioManager.playMusic(this, 'bgm-gameplay');

    this.installDebugHooks();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  // 캡처 드라이버 전용 훅. 실제 입력을 흉내 내는 대신 상태를 직접 만들 수 있어야
  // 결정적인 캡처가 나온다(타이밍에 의존하면 캡처가 산발적으로 실패한다).
  installDebugHooks() {
    if (typeof window === 'undefined') return;
    window.__KEEPER_DEBUG__ = {
      get: () => this.qaSnapshot(),
      // 대기 중인 배를 강제로 하나 만들고 포커스에 올린다.
      // 스테이지가 허용한 동시 대기 수를 넘겨 강제 등장시키면, 실제 플레이에서 나올 수 없는
      // 화면이 증거로 남는다(스테이지 1은 1척인데 캡처에는 2척). 상한을 지킨다.
      forceShip: (requestId) => {
        if (this.routing.waitingShips().length >= this.director.stage.maxConcurrent) return null;
        const ship = this.routing.spawn();
        if (!ship) return null;
        if (requestId) ship.requestId = requestId;
        ship.glyph.setText(requestOf(ship.requestId)?.glyph || '?');
        ship.settleNow();
        this.renderBuffer();
        return ship.snapshot();
      },
      // 램프를 실제 입력 경로로 두드린다 — 판정 로직을 우회하지 않는다.
      pulse: (kind) => { this.input_.buffer.push(kind === 'l' ? 'l' : 's'); this.onPulse(kind === 'l' ? 'l' : 's'); },
      typeCode: (pulses) => { for (const p of pulses) window.__KEEPER_DEBUG__.pulse(p); },
      // 지금 판정 대상인 배의 **정답 코드 앞부분**을 친다. 임의의 펄스를 넣으면 오답으로
      // 판정돼 버퍼가 비워지고, "입력 중" 캡처가 빈 화면이 된다(실제로 그렇게 찍혔다).
      typePrefix: (count) => {
        const ship = this.routing.focusShip();
        if (!ship) return null;
        const code = ship.expectedCode().slice(0, count);
        for (const p of code) window.__KEEPER_DEBUG__.pulse(p);
        return { requestId: ship.requestId, typed: code };
      },
      waitingCount: () => this.routing.waitingShips().length,
      setStage: (index) => {
        const stage = this.rules.stages[Math.max(0, Math.min(this.rules.stages.length - 1, index - 1))];
        this.director.stageIndex = stage.index - 1;
        this.director.guidedThisStage = 0;
        this.onStageChange(stage);
        this.refreshHud();
      },
      forceWin: () => this.finish('win'),
      forceLose: () => { this.wrecks = this.rules.wreckAllowance; this.finish('loss'); },
    };
  }

  fitBackdrop(img) {
    const { width, height } = SPEC.canvas;
    const s = Math.max(width / (img.width || width), height / (img.height || height));
    img.setScale(s);
  }

  buildCodePanel(width, height) {
    // 화면을 세 층으로 나눈다: 바다(항로) → 코드 패널 → 램프.
    //
    // 패널 이미지의 **안쪽 필드**는 이미지의 세로 14.8~85.2% / 가로 7.1~92.8%뿐이다(실측).
    // 3행(라벨·코드·버퍼)을 넣으면 필드 높이 165를 넘겨 라벨이 위 테두리를, 버퍼가 아래
    // 테두리를 침범했다. 요청과 코드를 한 줄에 나란히 놓아 2행으로 줄인다 —
    // 읽는 순서(무엇을 원하나 → 어떤 코드인가)도 왼→오른쪽으로 자연스러워진다.
    const panelY = height * 0.745;
    const panelH = px(78);
    const panelW = width - px(36);
    if (this.textures.exists('panel-code')) {
      this.panel = this.add.image(width / 2, panelY, 'panel-code')
        .setDisplaySize(panelW, panelH).setDepth(18);
    } else {
      this.panel = this.add.rectangle(width / 2, panelY, panelW, panelH, PALETTE.panel, 0.9)
        .setStrokeStyle(px(2), PALETTE.accentDim).setDepth(18);
    }
    const fieldLeft = width / 2 - panelW / 2 + panelW * 0.071;
    const fieldRight = width / 2 + panelW / 2 - panelW * 0.072;
    const inset = px(26);

    this.targetLabel = this.add.text(fieldLeft + inset, panelY - px(14), '대기 중', {
      fontFamily: 'Arial', fontSize: font(13), color: PALETTE.textDim,
    }).setOrigin(0, 0.5).setDepth(19);
    this.targetCode = this.add.text(fieldRight - inset, panelY - px(14), '—', {
      fontFamily: 'Arial Black,Arial', fontSize: font(15), color: '#ffcf6b',
    }).setOrigin(1, 0.5).setDepth(19);
    // 입력 중 플레이어가 계속 보는 줄이라 가장 크게, 가운데에 둔다.
    this.bufferText = this.add.text(width / 2, panelY + px(14), '', {
      fontFamily: 'Arial Black,Arial', fontSize: font(16), color: '#f4e9d6',
    }).setOrigin(0.5).setDepth(19);
  }

  bindLamp() {
    this.lamp.on('pointerdown', (pointer) => {
      if (!this.input_.beginPress(pointer)) return;
      this.lamp.setDisplaySize(this.lampSize * 0.94, this.lampSize * 0.94);
      this.tweens.add({ targets: this.lampGlow, alpha: 0.85, duration: 90 });
    });
    const release = (pointer) => {
      const before = this.input_.activePointerId;
      this.input_.endPress(pointer);
      if (before !== null) {
        this.lamp.setDisplaySize(this.lampSize, this.lampSize);
        this.tweens.add({ targets: this.lampGlow, alpha: 0, duration: 220 });
      }
    };
    this.lamp.on('pointerup', release);
    this.lamp.on('pointerupoutside', release);
    this.lamp.on('pointerout', release);
  }

  // ── Rules Contract 공표 (runtime config → __GAME_RULES__ → UI/문서 단방향)
  publishRules() {
    if (typeof window === 'undefined') return;
    window.__GAME_RULES__ = {
      durationSeconds: SPEC.rules.durationSeconds,
      goal: SPEC.rules.goal,
      progressMetric: SPEC.rules.progressMetric,
      requiredObjectives: SPEC.rules.requiredObjectives,
      failConditions: SPEC.rules.failConditions,
      commands: SPEC.rules.commands,
      wreckAllowance: this.rules.wreckAllowance,
      stages: this.rules.stages.map((s) => ({ index: s.index, quota: s.quota, maxConcurrent: s.maxConcurrent })),
    };
  }

  onPulse(pulse) {
    const ship = this.routing.focusShip();
    this.renderBuffer();
    AudioManager.playSfx(this, pulse === 'l' ? 'sfx-long' : 'sfx-short', 0.55);
    if (!ship) return;
    const verdict = judge(this.input_.buffer, ship.expectedCode());
    if (verdict === 'complete') this.resolveShip(ship, true);
    else if (verdict === 'wrong') this.resolveShip(ship, false);
  }

  resolveShip(ship, success) {
    const swift = ship.patienceRatio() >= this.rules.swiftThresholdRatio;
    this.input_.clear(success ? 'accepted' : 'rejected');
    if (success) {
      this.combo = Math.min(this.rules.comboMax, this.combo + this.rules.comboStep);
      this.score += this.rules.guideScore * this.combo + (swift ? this.rules.swiftBonus : 0);
      this.spawnFx('fx-route-ring', ship.sprite.x, ship.sprite.y, 0.9);
      AudioManager.playSfx(this, 'sfx-accepted');
      ship.routeOut(() => {
        const result = this.director.registerGuided();
        this.refreshHud();
        if (result.advanced && !result.victory) {
          this.showBanner('STAGE CLEAR');
          AudioManager.playSfx(this, 'sfx-stage-clear');
        }
      });
    } else {
      this.combo = 0;
      ship.damagePatience(this.rules.wrongCodePenaltyRatio);
      this.spawnFx('fx-wreck-flash', ship.sprite.x, ship.sprite.y, 0.6);
      this.cameras.main.shake(120, 0.004);
      AudioManager.playSfx(this, 'sfx-wreck', 0.45);
    }
    this.refreshHud();
  }

  onWreck() {
    if (this.ended) return;
    this.wrecks += 1;
    this.combo = 0;
    this.spawnFx('fx-sea-spray', SPEC.canvas.width / 2, SPEC.canvas.height * 0.5, 1);
    AudioManager.playSfx(this, 'sfx-wreck');
    this.refreshHud();
    if (this.wrecks >= this.rules.wreckAllowance) this.finish('loss');
  }

  onStageChange(stage) {
    this.routing.setStage(stage);
    const key = stage.backdrop;
    if (!this.textures.exists(key)) return;
    this.backdropNext.setTexture(key);
    this.fitBackdrop(this.backdropNext);
    this.backdropNext.setAlpha(0);
    this.tweens.add({
      targets: this.backdropNext, alpha: 1, duration: 700,
      onComplete: () => {
        // 크로스페이드가 끝난 뒤에만 스왑한다 — 도중에 바꾸면 한 프레임 깜빡인다.
        this.backdrop.setTexture(key);
        this.fitBackdrop(this.backdrop);
        this.backdropNext.setAlpha(0);
      },
    });
  }

  spawnFx(key, x, y, scale) {
    if (!this.textures.exists(key)) return;
    const fx = this.add.image(x, y, key).setDisplaySize(px(180 * scale), px(180 * scale))
      .setDepth(15).setAlpha(0.95).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: fx, alpha: 0, scaleX: fx.scaleX * 1.5, scaleY: fx.scaleY * 1.5,
      duration: 420, ease: 'Sine.easeOut',
      // 소멸은 반드시 onComplete에서 — 남은 FX가 화면에 눌어붙는 것을 막는다(Class C).
      onComplete: () => fx.destroy(),
    });
  }

  showBanner(text) {
    const { width, height } = SPEC.canvas;
    const banner = this.add.text(width / 2, height * 0.42, text, {
      fontFamily: 'Arial Black,Arial', fontSize: font(30), color: '#ffcf6b',
      stroke: '#04101d', strokeThickness: px(5),
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({
      targets: banner, alpha: 0, y: banner.y - px(40), duration: 1100, ease: 'Sine.easeIn',
      onComplete: () => banner.destroy(),
    });
  }

  renderBuffer() {
    const ship = this.routing.focusShip();
    if (ship) {
      const req = requestOf(ship.requestId);
      this.targetLabel.setText(`${req?.glyph || '?'}  ${req?.label || ''}`);
      this.targetCode.setText(renderCode(ship.expectedCode()));
    } else {
      this.targetLabel.setText('대기 중');
      this.targetCode.setText('—');
    }
    this.bufferText.setText(renderCode(this.input_.buffer));
  }

  refreshHud() {
    const s = this.director.snapshot();
    this.scoreText.setText(String(this.score));
    this.comboText.setText(this.combo > 1 ? `COMBO ×${this.combo}` : '');
    this.progressText.setText(`STAGE ${s.stage}/${s.stageCount}   인도 ${s.guidedThisStage}/${s.quota}`);
    this.wreckText.setText(`난파 ${this.wrecks}/${this.rules.wreckAllowance}`);
    this.renderBuffer();
  }

  openPause() {
    if (this.ended) return;
    this.input_.setEnabled(false);
    this.scene.launch(SCENES.PAUSE);
    this.scene.pause();
  }

  openHelp() {
    if (this.ended) return;
    this.input_.setEnabled(false);
    this.scene.launch(SCENES.PAUSE, { help: true });
    this.scene.pause();
  }

  // Pause에서 돌아올 때 입력을 다시 연다.
  resumeFromOverlay() {
    this.input_.setEnabled(true);
  }

  update(_time, delta) {
    if (this.ended) return;
    this.director.tick(delta);
    this.routing.update(delta);
    this.renderBuffer();
    this.publish();
  }

  finish(outcome) {
    if (this.ended) return;
    this.ended = true;
    this.input_.setEnabled(false);
    this.routing.clearAll();
    const best = Math.max(SaveData.getSettings().best || 0, this.score);
    SaveData.setSettings({ best });
    AudioManager.stopMusic();
    this.scene.start(SCENES.GAMEOVER, {
      outcome, score: this.score, best,
      guided: this.director.snapshot().guidedTotal,
      stage: this.director.snapshot().stage,
      wrecks: this.wrecks,
    });
  }

  publish() {
    publishLayout(this, [
      { id: 'score', obj: this.scoreText },
      { id: 'progress-metric', obj: this.progressText },
      { id: 'wreck-count', obj: this.wreckText },
      { id: 'code-panel', obj: this.panel, allowOverlapWith: ['target-code'] },
      { id: 'target-code', obj: this.targetCode, allowOverlapWith: ['code-panel'] },
      { id: 'signal-lamp', obj: this.lamp },
      { id: 'clear-signal', obj: this.clearBtn.bg },
      { id: 'pause', obj: this.pause.bg },
      { id: 'help', obj: this.help.bg },
    ], {
      requiredIds: ['score', 'progress-metric', 'wreck-count', 'code-panel', 'signal-lamp', 'pause', 'help'],
    });
  }

  // QA 훅 — 상태 샘플이 읽는 기계 판독 가능한 진실.
  qaSnapshot() {
    return {
      scene: SCENES.GAME,
      score: this.score,
      combo: this.combo,
      wrecks: this.wrecks,
      ended: this.ended,
      director: this.director.snapshot(),
      routing: this.routing.snapshot(),
      input: this.input_.snapshot(),
      activeTweens: this.tweens.getTweens().length,
      activeTimers: this.time.getAllEvents?.().length ?? 0,
      audio: AudioManager.snapshot(),
    };
  }

  // shutdown에서 모든 리스너·타이머·트윈·풀을 반납한다(결함 클래스 K).
  teardown() {
    this.input_?.destroy();
    this.routing?.destroy();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.lamp?.removeAllListeners();
    clearLayout();
  }
}
