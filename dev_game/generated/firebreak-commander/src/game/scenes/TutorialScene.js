import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { SaveData } from '../systems/SaveData.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayout } from '../systems/LayoutRegistry.js';
import { addCoverImage } from '../ui/BackgroundArt.js';
import { configureLogicalScene } from '../systems/LogicalViewport.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { GAME_RULES, RULE_TEXT } from '../config/gameRules.js';

export default class TutorialScene extends Phaser.Scene {
  constructor() { super(SCENES.TUTORIAL); }
  create() {
    configureLogicalScene(this);
    const { width, height } = SPEC.canvas;
    addCoverImage(this, 'bg_0', -50, 0.48);
    this.add.rectangle(0, 0, width, height, 0x03120d, 0.76).setOrigin(0).setDepth(-40);
    this.title = this.add.text(width / 2, 48, '게임 규칙', { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '30px', color: '#f4e7c5' }).setOrigin(0.5);
    this.subtitle = this.add.text(width / 2, 86, '불이 목표에 닿기 전에 세 행동을 조합하세요.', { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '13px', color: '#9fdac5' }).setOrigin(0.5);
    this.goalPanel = this.add.rectangle(width / 2, 149, 342, 92, 0x102c22, 0.97).setStrokeStyle(2, 0xffbd65, 0.7);
    this.goalText = this.add.text(width / 2, 149, `${RULE_TEXT.winShort}\n${RULE_TEXT.failShort}`, {
      fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '14px', color: '#ffffff', align: 'center', lineSpacing: 9,
    }).setOrigin(0.5);
    const actions = [
      [ASSET_KEYS.dozer, `방화선  ·  연료 ${GAME_RULES.commands.firebreak.costs.fuelPerCell}/칸`, '불과 목표 사이 숲·초지를 연속으로 드래그'],
      [ASSET_KEYS.helicopter, `헬기  ·  물 ${GAME_RULES.commands.helicopter.costs.water} / 연료 ${GAME_RULES.commands.helicopter.costs.fuel}`, '급하게 번지는 불꽃 칸을 탭해 즉시 진압'],
      [ASSET_KEYS.engine, `소방차  ·  연료 ${GAME_RULES.commands.engine.costs.fuel}`, `남쪽 회색 도로에 최대 ${GAME_RULES.commands.engine.maxUnits}대를 배치해 자동 냉각`],
    ];
    this.actionPanels = [];
    actions.forEach(([key, title, body], index) => {
      const y = 280 + index * 116;
      const panel = this.add.rectangle(width / 2, y, 342, 98, 0x102c22, 0.96).setStrokeStyle(1.5, 0x5fc4a1, 0.5);
      const icon = this.textures.exists(key) ? this.add.image(62, y, key).setDisplaySize(70, 56) : null;
      const titleText = this.add.text(108, y - 18, title, { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '15px', color: '#f6d59a' }).setOrigin(0, 0.5);
      const bodyText = this.add.text(108, y + 17, body, { fontFamily: 'Apple SD Gothic Neo, Arial, sans-serif', fontSize: '12px', color: '#d4e8df', wordWrap: { width: 248 } }).setOrigin(0, 0.5);
      this.actionPanels.push({ panel, icon, titleText, bodyText });
    });
    this.strategyPanel = this.add.rectangle(width / 2, 626, 342, 66, 0x352815, 0.96).setStrokeStyle(1.5, 0xffbd65, 0.7);
    this.strategyText = this.add.text(width / 2, 626, '주황색 칸 = 다음 확산 위험\n추천 첫 순서  방화선 → 헬기 → 소방차', {
      fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '13px', color: '#ffd394', align: 'center', lineSpacing: 5,
    }).setOrigin(0.5);
    this.beginBtn = makeTextButton(this, width / 2, 715, '설명 확인 · 출동', () => {
      SaveData.setTutorialSeen(true);
      this.scene.start(SCENES.GAME);
    }, 276, 66, { oneShot: true, fireOn: 'pointerup' });
    this.backBtn = makeTextButton(this, width / 2, 795, '돌아가기', () => this.scene.start(SCENES.HOME), 180, 50, { oneShot: true, fireOn: 'pointerup' });
    const layout = [
      { id: 'tutorial-title', obj: this.title }, { id: 'tutorial-subtitle', obj: this.subtitle }, { id: 'goal-panel', obj: this.goalPanel },
      ...this.actionPanels.map(({ panel }, index) => ({ id: `action-panel-${index + 1}`, obj: panel })),
      { id: 'strategy-panel', obj: this.strategyPanel }, { id: 'begin', obj: this.beginBtn.bg }, { id: 'back', obj: this.backBtn.bg },
    ];
    publishLayout(this, layout);
    this.time.delayedCall(60, () => publishLayout(this, layout));
  }
}
