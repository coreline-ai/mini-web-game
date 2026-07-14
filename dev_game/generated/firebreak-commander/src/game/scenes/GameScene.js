import Phaser from 'phaser';
import { SCENES } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { FIREBREAK_CONFIG } from '../config/firebreakConfig.js';
import { PINE_RIDGE_STAGE } from '../config/stagePineRidge.js';
import { AudioManager } from '../systems/AudioManager.js';
import { Juice } from '../systems/Juice.js';
import { SaveData } from '../systems/SaveData.js';
import CommandSystem from '../systems/CommandSystem.js';
import FireSimulationSystem from '../systems/FireSimulationSystem.js';
import ResourceSystem from '../systems/ResourceSystem.js';
import ScoreSystem from '../systems/ScoreSystem.js';
import StageDirector from '../systems/StageDirector.js';
import WindSystem from '../systems/WindSystem.js';
import { clearLayout, publishLayout } from '../systems/LayoutRegistry.js';
import CommandDock from '../ui/CommandDock.js';
import GridRenderer from '../ui/GridRenderer.js';
import HudUI from '../ui/HudUI.js';
import MissionCoach from '../ui/MissionCoach.js';
import { addCoverImage } from '../ui/BackgroundArt.js';
import { configureLogicalScene } from '../systems/LogicalViewport.js';
import { RULE_TEXT, getGameRulesSnapshot } from '../config/gameRules.js';

const MESSAGES = {
  INVALID_PATH: '방화선을 놓을 수 없는 지형입니다', NO_FUEL: '연료가 부족합니다', NO_RESOURCES: '물 또는 연료가 부족합니다',
  COOLDOWN: '헬기가 물을 다시 싣고 있습니다', ROAD_ONLY: '소방차는 회색 도로에만 배치할 수 있습니다', ENGINE_LIMIT: RULE_TEXT.engineLimit, OCCUPIED: '이미 소방차가 있는 도로입니다',
};
const COMMAND_NAMES = { firebreak: '방화선', helicopter: '헬기', engine: '소방차', idle: '취소' };
const OBJECTIVE_NAMES = { village: '마을', substation: '변전소', refuge: '보호구역' };

export default class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }

  create(data = {}) {
    configureLogicalScene(this);
    this.isOver = false;
    this.accumulator = 0;
    this.draggingFirebreak = false;
    this.coachOpen = false;
    this.inputLockedUntil = 0;
    this.reduceEffects = SaveData.getSettings().reduceEffects;
    this.warnedObjectives = new Set();
    this.seed = Number(data.seed ?? PINE_RIDGE_STAGE.seed) >>> 0;
    this.backgrounds = [0, 1, 2].map((index) => addCoverImage(this, `bg_${index}`, -60 + index, index === 0 ? 0.56 : 0));
    this.backgroundIndex = 0;
    this.add.rectangle(0, 0, 390, 844, 0x03110c, 0.5).setOrigin(0).setDepth(-40);
    this.add.rectangle(0, 106, 390, 566, 0x10291f, 0.82).setOrigin(0).setDepth(-20);
    this.simulation = new FireSimulationSystem(PINE_RIDGE_STAGE, FIREBREAK_CONFIG);
    this.simulation.reset(this.seed);
    this.resources = new ResourceSystem(FIREBREAK_CONFIG.resources);
    this.score = new ScoreSystem(FIREBREAK_CONFIG.scoring);
    this.wind = new WindSystem(FIREBREAK_CONFIG.windSchedule);
    this.commands = new CommandSystem(this.simulation, this.resources, FIREBREAK_CONFIG);
    this.director = new StageDirector(this.simulation, this.wind, this.commands, this.resources, this.score, FIREBREAK_CONFIG);
    this.renderer = new GridRenderer(this, this.simulation, FIREBREAK_CONFIG);
    this.hud = new HudUI(this, () => this.openPause(), () => this.openCoach());
    this.dock = new CommandDock(this, (command) => this.selectCommand(command));
    this.messagePanel = this.add.rectangle(195, 686, 370, 48, 0x061a15, 0.96).setStrokeStyle(1.5, 0xe5ad62, 0.5).setDepth(40);
    this.messageText = this.add.text(195, 686, RULE_TEXT.initialStatus, { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '11px', color: '#f1d29d', align: 'center', wordWrap: { width: 350 } }).setOrigin(0.5).setDepth(41);
    this.coach = new MissionCoach(this, () => this.closeCoach());
    this.coachOpen = !SaveData.hasSeenClarityCoach();
    this.coach.setVisible(this.coachOpen);
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.visibilityHandler = () => { if (document.hidden && !this.isOver) this.openPause(); };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.installDebugHook();
    AudioManager.playGameplayMusic(this);
    this.refreshView();
    this.time.delayedCall(80, () => this.refreshView());
  }

  selectCommand(command) {
    if (this.isOver || this.coachOpen) return;
    const selected = this.commands.select(command);
    this.dock.setSelected(selected);
    this.showMessage(selected === 'idle' ? '행동 선택을 취소했습니다' : `${COMMAND_NAMES[selected]} 선택 · 아래 안내대로 조작하세요`);
    this.refreshView();
  }

  onPointerDown(pointer) {
    if (this.isOver || this.coachOpen || this.time.now < this.inputLockedUntil) return;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const cell = this.renderer.cellFromWorld(world.x, world.y);
    if (!cell) return;
    const selected = this.commands.selected;
    if (selected === 'firebreak') {
      this.draggingFirebreak = true;
      this.commands.beginFirebreak(cell);
    } else if (selected === 'helicopter') {
      const result = this.commands.dropWater(cell);
      if (result.ok) {
        this.score.registerCooling(result);
        AudioManager.playSfx(this, ASSET_KEYS.sfxWater, 0.7);
        this.playHelicopterDrop(cell);
        this.impact(0x83d9ff, 0.002, 10);
        this.showMessage(`헬기 물 투하 완료 · 불 ${result.extinguished.length}칸 진압`);
      } else this.showMessage(MESSAGES[result.reason] || result.reason, true);
      this.dock.setSelected(this.commands.selected);
    } else if (selected === 'engine') {
      const result = this.commands.deployEngine(cell);
      if (result.ok) { AudioManager.playSfx(this, ASSET_KEYS.sfxEngine, 0.65); this.impact(0x88e6b8, 0.002, 10); this.showMessage('소방차 배치 완료 · 주변 화점을 자동 냉각합니다'); }
      else this.showMessage(MESSAGES[result.reason] || result.reason, true);
      this.dock.setSelected(this.commands.selected);
    }
    this.refreshView();
  }

  onPointerMove(pointer) {
    if (this.coachOpen || !this.draggingFirebreak || !pointer.isDown) return;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const cell = this.renderer.cellFromWorld(world.x, world.y);
    if (!cell) return;
    this.commands.extendFirebreak(cell);
    this.refreshView();
  }

  onPointerUp() {
    if (this.coachOpen || !this.draggingFirebreak) return;
    this.draggingFirebreak = false;
    const result = this.commands.commitFirebreak();
    if (result.ok) {
      AudioManager.playSfx(this, ASSET_KEYS.sfxFirebreak, 0.65);
      this.playDozer(result.cells);
      this.impact(0xf0c27a, 0.002, 8);
      this.showMessage(`방화선 완성 · ${result.placed}칸의 연료를 제거했습니다`);
    } else this.showMessage(MESSAGES[result.reason] || result.reason, true);
    this.dock.setSelected(this.commands.selected);
    this.refreshView();
  }

  update(_time, delta) {
    if (this.isOver || this.coachOpen) return;
    this.accumulator += Math.min(delta, 250);
    let processed = 0;
    while (this.accumulator >= FIREBREAK_CONFIG.simulation.tickMs && processed < FIREBREAK_CONFIG.simulation.maxCatchUpTicks) {
      this.accumulator -= FIREBREAK_CONFIG.simulation.tickMs;
      processed += 1;
      const result = this.director.step();
      for (const stageEvent of result.stageEvents || []) {
        if (stageEvent.type === 'WIND_SHIFT') { AudioManager.playSfx(this, ASSET_KEYS.sfxWindShift, 0.75); this.showMessage(`풍향 변화 · ${stageEvent.wind.direction} 방향, 세기 ${stageEvent.wind.speed}`, true); this.setBackgroundIndex(this.wind.currentIndex); }
        if (stageEvent.type === 'EMBER_WARNING') { AudioManager.playSfx(this, ASSET_KEYS.sfxWarning, 0.8); this.showMessage('비화 경고 · 5초 뒤 불씨가 뛰어오릅니다', true); }
        if (stageEvent.type === 'EMBER_EVENT') this.showMessage(stageEvent.ember.ok ? '불씨 착지 · 새로운 화점이 생겼습니다' : '불씨가 안전 지형에 떨어졌습니다', true);
        if (stageEvent.type === 'SPOT_FIRE_WARNING') { AudioManager.playSfx(this, ASSET_KEYS.sfxWarning, 0.8); this.showMessage(`${stageEvent.label} 경고 · 5초 뒤 표시 지점 발화`, true); }
        if (stageEvent.type === 'SPOT_FIRE_EVENT') { AudioManager.playSfx(this, ASSET_KEYS.sfxIgnite, 0.7); this.impact(0xff623f, 0.006, 22); this.showMessage(`${stageEvent.label} 발생 · 새 화점을 막으세요`, true); }
      }
      for (const damage of result.events?.objectiveDamage || []) {
        if (damage.integrity > 50 || this.warnedObjectives.has(damage.id)) continue;
        this.warnedObjectives.add(damage.id);
        AudioManager.playSfx(this, ASSET_KEYS.sfxWarning, 0.85);
        this.impact(0xff3e32, 0.008, 28);
        this.showMessage(`${OBJECTIVE_NAMES[damage.id]} 위험 · 내구도 ${Math.ceil(damage.integrity)}`, true);
      }
      if (result.events?.ignited?.length) this.showMessage(`불길 확산 · 새로 ${result.events.ignited.length}칸이 붙었습니다`, true);
      if (result.terminal) { this.finish(result.terminal); break; }
      this.refreshView();
    }
    if (processed >= FIREBREAK_CONFIG.simulation.maxCatchUpTicks) this.accumulator = 0;
  }

  refreshView() {
    const wind = this.wind.update(this.simulation.tick);
    const validation = this.commands.selected === 'firebreak' ? this.commands.validateFirebreak() : { invalid: [] };
    this.renderer.draw({
      risk: this.simulation.predictRisk(wind, 3), preview: this.commands.preview, invalid: validation.invalid, engines: this.commands.engines,
    });
    this.hud.update({ score: this.score.getScore(), remainingSeconds: this.director.getRemainingSeconds(), wind, resources: this.resources.snapshot(), objectives: this.simulation.objectives, activeFire: this.simulation.getStats().activeFireCells });
    const entries = [
      ...this.hud.getLayoutEntries(), ...this.dock.getLayoutEntries(), { id: 'playfield', obj: this.renderer.hitZone }, { id: 'alert-strip', obj: this.messagePanel, allowOverlap: true }, { id: 'alert-text', obj: this.messageText }, ...this.coach.getLayoutEntries(),
    ];
    publishLayout(this, entries);
  }

  showMessage(message, warning = false) {
    this.messageText.setText(message).setColor(warning ? '#ffba8c' : '#d7efe5');
  }

  openCoach() {
    if (this.isOver || !this.coach) return;
    this.draggingFirebreak = false;
    this.commands.preview = [];
    this.coachOpen = true;
    this.coach.setVisible(true);
    this.refreshView();
  }

  closeCoach() {
    if (!this.coach) return;
    this.coachOpen = false;
    this.coach.setVisible(false);
    this.inputLockedUntil = this.time.now + 150;
    SaveData.setClarityCoachSeen();
    this.showMessage(RULE_TEXT.recommendedFirstAction);
    this.refreshView();
  }

  impact(color, shake = 0, hapticMs = 0) {
    if (this.reduceEffects) return;
    Juice.flash(this, color, 70);
    if (shake > 0) Juice.shake(this, shake, 130);
    if (hapticMs > 0 && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(hapticMs);
  }

  gridWorld(cell) {
    const { originX, originY, cellSize } = FIREBREAK_CONFIG.grid;
    return { x: originX + (cell.x + 0.5) * cellSize, y: originY + (cell.y + 0.5) * cellSize };
  }

  playHelicopterDrop(cell) {
    if (!this.textures.exists(ASSET_KEYS.helicopter)) return;
    const target = this.gridWorld(cell);
    const helicopter = this.add.image(430, Math.max(150, target.y - 90), ASSET_KEYS.helicopter).setDisplaySize(112, 74).setDepth(36).setAngle(-8);
    if (this.textures.exists(ASSET_KEYS.fxWater)) {
      const splash = this.add.image(target.x, target.y, ASSET_KEYS.fxWater).setDisplaySize(34, 34).setDepth(34).setAlpha(0);
      const splashScaleX = splash.scaleX;
      const splashScaleY = splash.scaleY;
      this.tweens.add({ targets: splash, alpha: 0.9, scaleX: splashScaleX * 1.7, scaleY: splashScaleY * 1.7, duration: 360, delay: 320, yoyo: true, onComplete: () => splash.destroy() });
    }
    this.tweens.add({ targets: helicopter, x: target.x, y: target.y - 24, duration: 420, ease: 'Cubic.easeOut', yoyo: true, hold: 180, onComplete: () => helicopter.destroy() });
  }

  playDozer(path = []) {
    if (!path.length || !this.textures.exists(ASSET_KEYS.dozer)) return;
    const start = this.gridWorld(path[0]);
    const end = this.gridWorld(path[path.length - 1]);
    const dozer = this.add.image(start.x, start.y, ASSET_KEYS.dozer).setDisplaySize(54, 54).setDepth(35);
    this.activeDozer = dozer;
    dozer.setFlipX(end.x < start.x);
    this.tweens.add({ targets: dozer, x: end.x, y: end.y, duration: Math.max(260, path.length * 105), ease: 'Sine.easeInOut', onComplete: () => { dozer.destroy(); if (this.activeDozer === dozer) this.activeDozer = null; } });
  }

  setBackgroundIndex(index) {
    const nextIndex = Math.max(0, Math.min(this.backgrounds.length - 1, index));
    if (nextIndex === this.backgroundIndex || !this.backgrounds[nextIndex]) return;
    const previous = this.backgrounds[this.backgroundIndex];
    const next = this.backgrounds[nextIndex];
    this.backgroundIndex = nextIndex;
    this.tweens.add({ targets: previous, alpha: 0, duration: 700 });
    this.tweens.add({ targets: next, alpha: 0.56, duration: 700 });
  }

  finish(terminal) {
    if (this.isOver) return;
    this.isOver = true;
    AudioManager.stopMusic();
    AudioManager.playSfx(this, terminal.outcome === 'win' ? ASSET_KEYS.sfxStageClear : ASSET_KEYS.sfxGameOver, 0.75);
    this.time.delayedCall(450, () => this.scene.start(SCENES.GAMEOVER, { terminal }));
  }

  openPause() {
    if (this.isOver || this.scene.isPaused()) return;
    AudioManager.pauseMusic();
    this.hud.setVisible(false); this.dock.setVisible(false); this.messagePanel.setVisible(false); this.messageText.setVisible(false);
    this.scene.launch(SCENES.PAUSE);
    this.scene.pause();
  }

  onResume() {
    if (this.isOver) return;
    this.hud.setVisible(true); this.dock.setVisible(true); this.messagePanel.setVisible(true); this.messageText.setVisible(true);
    AudioManager.resumeMusic(); this.refreshView();
  }

  debugState() {
    const stats = this.simulation.getStats();
    const wind = this.wind.get();
    return {
      seed: this.seed, simTick: this.simulation.tick, stagePhase: wind.phase, windDirection: wind.direction, windSpeed: wind.speed,
      ...stats, water: this.resources.water, fuel: this.resources.fuel, selectedCommand: this.commands.selected,
      activeFireSprites: stats.activeFireCells, activeSmokeSprites: 0, activeParticles: 0,
      terminalState: this.director.terminal, activeBgmInstances: AudioManager.currentMusic ? 1 : 0,
      sceneStackSize: this.scene.manager.getScenes(true).length, gridHash: this.simulation.getGridHash(), engines: this.commands.snapshot().engines,
      resourceCounts: {
        tweens: this.tweens?.getTweens?.().length || 0,
        timers: this.time?.getAllEvents?.().length || 0,
        listeners: ['pointerdown', 'pointermove', 'pointerup'].reduce((sum, event) => sum + (this.input?.listenerCount?.(event) || 0), 0) + (this.events?.listenerCount?.(Phaser.Scenes.Events.RESUME) || 0),
      },
      interaction: {
        visualCellSize: FIREBREAK_CONFIG.grid.cellSize,
        touchTargetSize: FIREBREAK_CONFIG.grid.touchTargetSize,
        snapMode: 'nearest-cell-centre',
      },
      actionCounts: this.commands.snapshot().actionCounts,
      uiLanguage: 'ko', remainingSeconds: this.director.getRemainingSeconds(), coachVisible: this.coachOpen, missionText: this.messageText.text, commandHint: this.dock.hint.text,
      coach: this.coach?.snapshot() || null,
      activeDozer: this.activeDozer ? { width: this.activeDozer.displayWidth, height: this.activeDozer.displayHeight, scaleX: this.activeDozer.scaleX, scaleY: this.activeDozer.scaleY, x: this.activeDozer.x, y: this.activeDozer.y } : null,
    };
  }

  installDebugHook() {
    if (typeof window === 'undefined') return;
    window.__FIREBREAK_DEBUG__ = {
      get: () => this.debugState(),
      advanceTicks: (count = 1) => {
        for (let i = 0; i < Math.max(0, count); i += 1) {
          const result = this.director.step();
          if ((result.stageEvents || []).some((event) => event.type === 'WIND_SHIFT')) this.setBackgroundIndex(this.wind.currentIndex);
          if (result.terminal) break;
        }
        this.refreshView();
        return this.debugState();
      },
      setWind: (direction, speed = 1) => { this.wind.current = { ...this.wind.current, direction, speed }; this.refreshView(); return this.debugState(); },
      igniteCell: (x, y) => { const result = this.simulation.igniteCell(x, y, 0.9, 'debug'); this.refreshView(); return result; },
      previewFirebreak: (cells) => { this.commands.preview = cells.map((cell) => ({ ...cell })); this.commands.selected = 'firebreak'; this.refreshView(); return this.commands.validateFirebreak(); },
      commitFirebreak: () => { const result = this.commands.commitFirebreak(); this.refreshView(); return result; },
      dropWater: (x, y) => { const result = this.commands.dropWater({ x, y }); if (result.ok) this.score.registerCooling(result); this.refreshView(); return result; },
      deployTruck: (x, y) => { const result = this.commands.deployEngine({ x, y }); this.refreshView(); return result; },
      openCoach: () => { this.openCoach(); return this.debugState(); },
      closeCoach: () => { this.closeCoach(); return this.debugState(); },
      snapCell: (x, y) => this.renderer.cellFromWorld(Number(x), Number(y)),
      forceWin: () => { const terminal = this.director.buildTerminal('win', 'CONTAINED'); this.director.terminal = terminal; this.finish(terminal); return terminal; },
      forceLose: () => { const terminal = this.director.buildTerminal('loss', 'OBJECTIVE_LOST'); this.director.terminal = terminal; this.finish(terminal); return terminal; },
      getGridHash: () => this.simulation.getGridHash(),
    };
    window.__GAME_RULES__ = getGameRulesSnapshot();
  }

  cleanup() {
    this.input.off('pointerdown', this.onPointerDown, this);
    this.input.off('pointermove', this.onPointerMove, this);
    this.input.off('pointerup', this.onPointerUp, this);
    this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    if (typeof window !== 'undefined') { delete window.__FIREBREAK_DEBUG__; delete window.__GAME_RULES__; }
    clearLayout();
  }
}
