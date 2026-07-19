import { SPEC } from '../data/spec.js';

export default class NarrativeRadioSystem {
  constructor(scene) {
    const x = 58; const y = 198; const w = SPEC.canvas.width - 116; const h = 188;
    this.panel = scene.add.rectangle(x, y, w, h, 0x061014, 0.78).setOrigin(0).setStrokeStyle(3, 0x6c9b91, 0.46).setDepth(80);
    this.tag = scene.add.text(x + 34, y + 24, 'HELIOS // 긴급 무전', { fontFamily: 'Arial Black, Arial', fontSize: '29px', color: '#e5b966' }).setDepth(81);
    this.text = scene.add.text(x + 34, y + 72, '05:42 — 헬리오 코어 재가동. 북쪽 접근로를 방어하라.', { fontFamily: 'Arial, sans-serif', fontSize: '34px', color: '#eff5ec', wordWrap: { width: w - 68 }, lineSpacing: 10 }).setDepth(81);
    this.timer = 0;
  }
  set(tag, message, accent = '#e5b966') {
    this.tag.setText(tag).setColor(accent);
    this.text.setText(message);
    this.panel.setAlpha(1); this.tag.setAlpha(1); this.text.setAlpha(1);
    this.timer = 7200;
  }
  update(delta) {
    if (this.timer <= 0) return;
    this.timer -= delta;
    if (this.timer < 900) {
      const a = Math.max(0.5, this.timer / 900);
      this.panel.setAlpha(0.78 * a); this.tag.setAlpha(a); this.text.setAlpha(a);
    }
  }
  entries() { return [{ id: 'radio-panel', obj: this.panel, allowOverlap: true }, { id: 'radio-tag', obj: this.tag, allowOverlap: true }, { id: 'radio-text', obj: this.text, allowOverlap: true }]; }
  destroy() { this.panel.destroy(); this.tag.destroy(); this.text.destroy(); }
}
