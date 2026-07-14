import { SPEC } from '../data/spec.js';
import { makeTextButton } from './MobileButton.js';
import { GAME_RULES, RULE_TEXT } from '../config/gameRules.js';

const FONT = 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif';

export default class MissionCoach {
  constructor(scene, onClose) {
    const { width } = SPEC.canvas;
    this.backdrop = scene.add.rectangle(8, 112, width - 16, 592, 0x020b08, 0.88)
      .setOrigin(0).setDepth(80).setInteractive();
    this.backdrop.on('pointerdown', (_pointer, _x, _y, event) => event?.stopPropagation());
    this.panel = scene.add.rectangle(width / 2, 405, 350, 480, 0x0b2a20, 0.98)
      .setStrokeStyle(3, 0x70deb7, 0.9).setDepth(81);
    this.title = scene.add.text(width / 2, 192, RULE_TEXT.goalTitle, {
      fontFamily: FONT, fontSize: '27px', color: '#fff0bd', stroke: '#07100c', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(82);
    this.goal = scene.add.text(width / 2, 246, RULE_TEXT.coachGoal, {
      fontFamily: FONT, fontSize: '16px', color: '#ffffff', align: 'center', lineSpacing: 7,
      wordWrap: { width: 310 },
    }).setOrigin(0.5).setDepth(82);
    this.steps = scene.add.text(36, 310,
      `1  방화선  불과 목표 사이를 드래그  연료 ${GAME_RULES.commands.firebreak.costs.fuelPerCell}/칸\n\n2  헬기     불꽃 칸을 탭  물 ${GAME_RULES.commands.helicopter.costs.water} · 연료 ${GAME_RULES.commands.helicopter.costs.fuel}\n\n3  소방차  남쪽 회색 도로 탭  연료 ${GAME_RULES.commands.engine.costs.fuel}`, {
        fontFamily: FONT, fontSize: '14px', color: '#d8efe6', lineSpacing: 4,
      }).setDepth(82);
    this.tip = scene.add.text(width / 2, 505, '주황색 칸 = 다음 확산 위험\n추천 첫 순서  방화선 → 헬기 → 소방차', {
      fontFamily: 'Apple SD Gothic Neo, Arial, sans-serif', fontSize: '14px', color: '#ffc77d',
      align: 'center', lineSpacing: 6, wordWrap: { width: 310 },
    }).setOrigin(0.5).setDepth(82);
    this.startBtn = makeTextButton(scene, width / 2, 602, '이해했어요 · 시작', onClose, 260, 58);
    this.startBtn.bg.setDepth(83); this.startBtn.txt.setDepth(84).setFontSize(19);
    this.objects = [this.backdrop, this.panel, this.title, this.goal, this.steps, this.tip, this.startBtn.bg, this.startBtn.txt];
    this.setVisible(false);
  }

  setVisible(value) {
    this.visible = value;
    this.objects.forEach((object) => object.setVisible(value));
    if (value) this.backdrop.setInteractive();
    else this.backdrop.disableInteractive();
  }

  getLayoutEntries() {
    if (!this.visible) return [];
    return [
      { id: 'coach-backdrop', obj: this.backdrop, allowOverlap: true },
      { id: 'coach-panel', obj: this.panel, allowOverlap: true },
      { id: 'coach-title', obj: this.title, allowOverlapWith: ['coach-panel', 'coach-backdrop', 'playfield'] },
      { id: 'coach-goal', obj: this.goal, allowOverlapWith: ['coach-panel', 'coach-backdrop', 'playfield'] },
      { id: 'coach-steps', obj: this.steps, allowOverlapWith: ['coach-panel', 'coach-backdrop', 'playfield'] },
      { id: 'coach-tip', obj: this.tip, allowOverlapWith: ['coach-panel', 'coach-backdrop', 'playfield'] },
      { id: 'coach-start', obj: this.startBtn.bg, allowOverlapWith: ['coach-panel', 'coach-backdrop', 'playfield'] },
    ];
  }

  snapshot() {
    return { visible: this.visible, title: this.title.text, goal: this.goal.text, steps: this.steps.text, tip: this.tip.text };
  }
}
