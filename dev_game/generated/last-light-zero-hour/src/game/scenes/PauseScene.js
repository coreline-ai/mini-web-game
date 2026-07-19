import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { AudioManager } from '../systems/AudioManager.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayout } from '../systems/LayoutRegistry.js';

export default class PauseScene extends Phaser.Scene {
  constructor() { super(SCENES.PAUSE); }
  create() {
    const { width, height } = SPEC.canvas;
    this.add.rectangle(0, 0, width, height, 0x010507, 0.78).setOrigin(0);
    this.panel = this.add.rectangle(width / 2, height / 2, width - 190, 920, 0x071318, 0.97).setStrokeStyle(6, 0xe5b966, 0.62);
    this.pausedText = this.add.text(width / 2, height / 2 - 310, '방어 일시정지', { fontFamily: 'Arial Black, Arial', fontSize: '78px', color: '#f1e4c7', stroke: '#020708', strokeThickness: 12 }).setOrigin(0.5);
    this.tip = this.add.text(width / 2, height / 2 - 170, '기관포는 과열되기 전에 충전 무기로 교대하세요.\n드래그하는 동안 이동 방향이 수동 조준 방향이 됩니다.', { fontFamily: 'Arial', fontSize: '34px', color: '#b6d0ca', align: 'center', lineSpacing: 16 }).setOrigin(0.5);
    this.resumeBtn = makeTextButton(this, width / 2, height / 2 + 60, '계속 방어', () => { this.scene.stop(); this.scene.resume(SCENES.GAME); AudioManager.resumeMusic(); }, 690, 142, { oneShot: true });
    this.pHomeBtn = makeTextButton(this, width / 2, height / 2 + 260, '작전 포기 · 홈', () => { AudioManager.stopMusic(); this.scene.stop(SCENES.GAME); this.scene.start(SCENES.HOME); }, 690, 128, { oneShot: true });
    this.layout = [{ id: 'pause-panel', obj: this.panel, allowOverlap: true }, { id: 'paused', obj: this.pausedText, allowOverlap: true }, { id: 'resume', obj: this.resumeBtn.bg }, { id: 'home', obj: this.pHomeBtn.bg }];
    const pub = () => publishLayout(this, this.layout, { requiredIds: ['pause-panel', 'paused', 'resume', 'home'] });
    pub(); this.time.delayedCall(80, pub); this.scale.on('resize', pub);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', pub));
  }
}
