import { makeTextButton } from './MobileButton.js';
import { RULE_TEXT } from '../config/gameRules.js';

export default class CommandDock {
  constructor(scene, onSelect) {
    this.scene = scene;
    this.onSelect = onSelect;
    this.panel = scene.add.rectangle(195, 774, 374, 124, 0x061a15, 0.96).setStrokeStyle(2, 0x66c9a6, 0.7).setDepth(40);
    this.buttons = {
      firebreak: makeTextButton(scene, 68, 778, '방화선', () => onSelect('firebreak'), 108, 68),
      helicopter: makeTextButton(scene, 195, 778, '헬기', () => onSelect('helicopter'), 108, 68),
      engine: makeTextButton(scene, 322, 778, '소방차', () => onSelect('engine'), 108, 68),
    };
    this.hint = scene.add.text(195, 829, '아래 행동 중 하나를 선택하세요', { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '11px', color: '#a9cfc0' }).setOrigin(0.5).setDepth(42);
    for (const button of Object.values(this.buttons)) { button.bg.setDepth(41); button.txt.setDepth(42).setFontSize(18); }
  }

  setSelected(selected) {
    for (const [key, button] of Object.entries(this.buttons)) {
      if (key === selected) button.bg.setTint(0xffcf6d);
      else button.bg.clearTint();
    }
    const hints = {
      firebreak: RULE_TEXT.commandLine.firebreak,
      helicopter: RULE_TEXT.commandLine.helicopter,
      engine: RULE_TEXT.commandLine.engine,
      idle: '아래 행동 중 하나를 선택하세요',
    };
    this.hint.setText(hints[selected] || hints.idle);
  }

  setVisible(value) {
    this.panel.setVisible(value); this.hint.setVisible(value);
    for (const button of Object.values(this.buttons)) { button.bg.setVisible(value); button.txt.setVisible(value); }
  }

  getLayoutEntries() {
    return [
      { id: 'command-dock', obj: this.panel, allowOverlap: true }, { id: 'firebreak-button', obj: this.buttons.firebreak.bg },
      { id: 'helicopter-button', obj: this.buttons.helicopter.bg }, { id: 'engine-button', obj: this.buttons.engine.bg }, { id: 'command-hint', obj: this.hint },
    ];
  }
}
