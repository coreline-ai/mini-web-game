import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { SaveData } from '../systems/SaveData.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayout } from '../systems/LayoutRegistry.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super(SCENES.GAMEOVER); }
  create(data = {}) {
    const { width, height } = SPEC.canvas;
    const score = Math.max(0, Math.floor(data.score || 0));
    const reward = Math.max(0, Math.floor(data.reward || 0));
    const kills = Math.max(0, Math.floor(data.kills || 0));
    const elapsed = Math.max(0, Math.floor(data.elapsed || 0));
    const isBest = SaveData.record(score);
    const progress = SaveData.awardRun(data.runId || `${Date.now()}`, reward, kills);
    this.add.image(width / 2, height / 2, 'bg_4').setDisplaySize(width, height);
    this.add.rectangle(0, 0, width, height, 0x020508, 0.68).setOrigin(0);
    // Keep the result headline and epilogue completely above the bordered
    // results panel. The previous panel top crossed through "방어선 붕괴".
    this.panel = this.add.rectangle(width / 2, 1385, width - 150, 1710, 0x061014, 0.9).setStrokeStyle(5, 0xb05246, 0.72);
    this.goText = this.add.text(width / 2, 260, '방어선 붕괴', { fontFamily: 'Arial Black, Arial', fontSize: '92px', color: '#ff9b87', stroke: '#020708', strokeThickness: 14 }).setOrigin(0.5);
    this.epilogue = this.add.text(width / 2, 430, `DAY ${String(data.day || 1).padStart(2, '0')} · 헬리오 코어가 침묵했다.\n다음 작전에서는 영구 강화된 무기로 방어를 재개한다.`, { fontFamily: 'Arial', fontSize: '36px', color: '#dce8e3', align: 'center', lineSpacing: 16, wordWrap: { width: width - 240 } }).setOrigin(0.5);
    this.scoreText = this.add.text(width / 2, 700, `SCORE ${score}`, { fontFamily: 'Arial Black, Arial', fontSize: '72px', color: '#f2e5c7', stroke: '#020708', strokeThickness: 10 }).setOrigin(0.5);
    if (isBest) this.add.text(width / 2, 800, 'NEW BEST', { fontFamily: 'Arial Black, Arial', fontSize: '38px', color: '#8df7d6' }).setOrigin(0.5);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0'); const ss = String(elapsed % 60).padStart(2, '0');
    this.statsText = this.add.text(width / 2, 1010, `생존 ${mm}:${ss}\n처치 ${kills}  ·  엘리트 ${data.elites || 0}  ·  타이탄 ${data.bosses || 0}\n획득 결정 +${reward}  ·  현재 보유 ${progress.cores}`, { fontFamily: 'Arial Black, Arial', fontSize: '39px', color: '#d7eee8', align: 'center', lineSpacing: 26 }).setOrigin(0.5);
    this.retryBtn = makeTextButton(this, width / 2, 1430, '즉시 재도전', () => this.scene.start(SCENES.GAME), 720, 148, { oneShot: true });
    this.arsenalBtn = makeTextButton(this, width / 2, 1640, '무기고에서 강화', () => this.scene.start(SCENES.ARSENAL), 720, 132, { oneShot: true });
    this.homeBtn = makeTextButton(this, width / 2, 1830, '홈으로', () => this.scene.start(SCENES.HOME), 600, 116, { oneShot: true });
    this.bestText = this.add.text(width / 2, 2070, `최고 점수 ${SaveData.getBest()}  ·  누적 처치 ${progress.totalKills}`, { fontFamily: 'Arial Black, Arial', fontSize: '32px', color: '#a5c7c0' }).setOrigin(0.5);
    this.layout = [
      { id: 'result-panel', obj: this.panel, allowOverlap: true }, { id: 'gameover', obj: this.goText }, { id: 'epilogue', obj: this.epilogue },
      { id: 'score', obj: this.scoreText }, { id: 'stats', obj: this.statsText }, { id: 'retry', obj: this.retryBtn.bg },
      { id: 'arsenal', obj: this.arsenalBtn.bg }, { id: 'home', obj: this.homeBtn.bg },
    ];
    const pub = () => publishLayout(this, this.layout, { requiredIds: this.layout.map((e) => e.id) });
    pub(); this.time.delayedCall(80, pub); this.scale.on('resize', pub);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', pub));
  }
}
