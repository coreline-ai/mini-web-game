import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { SaveData } from '../systems/SaveData.js';
import { AudioManager } from '../systems/AudioManager.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayout } from '../systems/LayoutRegistry.js';
import { addCoverImage } from '../ui/BackgroundArt.js';
import { configureLogicalScene } from '../systems/LogicalViewport.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';

const REASONS = { CONTAINED: '모든 불꽃을 껐습니다', OBJECTIVE_LOST: '마을 또는 변전소가 파괴되었습니다', TIME_EXPIRED: '불이 남은 채 제한 시간이 끝났습니다' };
const OBJECTIVE_NAMES = { village: '마을', substation: '변전소', refuge: '보호구역' };

export default class GameOverScene extends Phaser.Scene {
  constructor() { super(SCENES.GAMEOVER); }
  create(data = {}) {
    configureLogicalScene(this);
    AudioManager.stopMusic();
    const { width, height } = SPEC.canvas;
    const terminal = data.terminal || { outcome: 'loss', reason: 'RESPONSE ENDED', score: 0, stars: 0, resources: { water: 0, fuel: 0 }, objectives: {} };
    const won = terminal.outcome === 'win';
    const isBest = SaveData.record(terminal.score || 0);
    SaveData.setBestStars(terminal.stars || 0);
    addCoverImage(this, won ? 'bg_0' : 'bg_2', -50, 0.66);
    this.add.rectangle(0, 0, width, height, won ? 0x071d17 : 0x21100d, 0.68).setOrigin(0).setDepth(-40);
    this.resultText = this.add.text(width / 2, 88, won ? '산불 진압 성공' : '작전 실패', { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: won ? '34px' : '36px', color: won ? '#baf0cc' : '#ff9c7d', stroke: '#07100c', strokeThickness: 7 }).setOrigin(0.5);
    this.reasonText = this.add.text(width / 2, 138, REASONS[terminal.reason] || '작전이 종료되었습니다', { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '14px', color: '#f4e7c5' }).setOrigin(0.5);
    this.statusPanel = this.add.rectangle(width / 2, 295, 320, 260, won ? 0x0d3327 : 0x351c17, 0.95)
      .setStrokeStyle(2, won ? 0x72d8ad : 0xe07858, 0.72);
    const resultIconKey = won ? ASSET_KEYS.uiContainment : ASSET_KEYS.fxFire;
    this.resultIcon = this.textures.exists(resultIconKey) ? this.add.image(width / 2, 250, resultIconKey).setDisplaySize(130, 130) : null;
    this.statusText = this.add.text(width / 2, 382, won ? '핵심 목표 보호 완료' : '방어 경로를 다시 설계하세요', {
      fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '16px', color: won ? '#baf0cc' : '#ffc0a9',
    }).setOrigin(0.5);
    this.starsText = this.add.text(width / 2, 452, `${'★'.repeat(terminal.stars || 0)}${'☆'.repeat(3 - (terminal.stars || 0))}`, { fontFamily: 'Arial Black, Arial', fontSize: '40px', color: '#ffd35e' }).setOrigin(0.5);
    this.scoreText = this.add.text(width / 2, 505, `점수 ${terminal.score || 0}${isBest ? '  최고 기록' : ''}`, { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '21px', color: '#ffffff' }).setOrigin(0.5);
    const objectiveLine = Object.entries(terminal.objectives || {}).map(([id, value]) => `${OBJECTIVE_NAMES[id] || id} ${value}`).join('  ');
    this.detailText = this.add.text(width / 2, 556, `${objectiveLine}\n남은 물 ${Math.floor(terminal.resources?.water || 0)}  연료 ${Math.floor(terminal.resources?.fuel || 0)}`, { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '12px', color: '#c8ddd4', align: 'center', lineSpacing: 8 }).setOrigin(0.5);
    this.retryBtn = makeTextButton(this, width / 2, 670, '다시 출동', () => this.scene.start(SCENES.GAME), 250, 64, { oneShot: true, fireOn: 'pointerup' });
    this.homeBtn = makeTextButton(this, width / 2, 755, '처음 화면', () => this.scene.start(SCENES.HOME), 210, 56, { oneShot: true, fireOn: 'pointerup' });
    const layout = [{ id: 'gameover', obj: this.resultText }, { id: 'reason', obj: this.reasonText }, { id: 'status-panel', obj: this.statusPanel }, { id: 'stars', obj: this.starsText }, { id: 'score', obj: this.scoreText }, { id: 'retry', obj: this.retryBtn.bg }, { id: 'home', obj: this.homeBtn.bg }];
    publishLayout(this, layout);
    this.time.delayedCall(60, () => publishLayout(this, layout));
  }
}
