import { SPEC } from '../data/spec.js';

export const PHASES = [
  { id: 'dawn', name: '새벽', start: 0, color: '#a8ced0', radio: '05:42 — 헬리오 코어 재가동. 북쪽 접근로에 소수 감염체가 포착됐다.' },
  { id: 'day', name: '낮', start: 35, color: '#f1c978', radio: '정오 출력 41%. 빛을 따라 러너 개체가 측면 골목으로 집결한다.' },
  { id: 'dusk', name: '황혼', start: 75, color: '#e68155', radio: '구조 신호가 아니라 유인 신호였다. 밀집 파형이 방어선으로 향한다.' },
  { id: 'night', name: '밤', start: 110, color: '#7fb7e5', radio: '야간 출력 상승. 시야 밖의 소리를 믿지 마라. 코어 주변만 지켜라.' },
  { id: 'bloodmoon', name: '블러드 문', start: 155, color: '#ff6a5e', radio: '경보: 초대형 생체 신호. 헬리오 파편 반응이 코어와 동기화된다.' },
];

export default class DayNightSystem {
  constructor(scene, onPhaseChange) {
    this.scene = scene;
    this.onPhaseChange = onPhaseChange;
    this.cycleSeconds = 180;
    this.phaseIndex = -1;
    this.day = 1;
    this.images = PHASES.map((phase, index) => scene.add.image(SPEC.canvas.width / 2, SPEC.canvas.height / 2, `bg_${index}`)
      .setDisplaySize(SPEC.canvas.width, SPEC.canvas.height)
      .setDepth(-30 + index * 0.001)
      .setAlpha(index === 0 ? 1 : 0));
    this.currentImage = this.images[0];
    this.vignette = scene.add.rectangle(0, 0, SPEC.canvas.width, SPEC.canvas.height, 0x02070a, 0.08).setOrigin(0).setDepth(-10);
  }

  phaseFor(elapsedSeconds) {
    const t = elapsedSeconds % this.cycleSeconds;
    let index = 0;
    for (let i = 0; i < PHASES.length; i += 1) if (t >= PHASES[i].start) index = i;
    return { index, phase: PHASES[index], cycleTime: t, day: Math.floor(elapsedSeconds / this.cycleSeconds) + 1 };
  }

  update(elapsedSeconds) {
    const state = this.phaseFor(elapsedSeconds);
    this.day = state.day;
    if (state.index !== this.phaseIndex) {
      const next = this.images[state.index];
      this.phaseIndex = state.index;
      next.setDepth(-20).setAlpha(0);
      const prev = this.currentImage;
      this.currentImage = next;
      this.scene.tweens.add({ targets: next, alpha: 1, duration: 1800, ease: 'Sine.easeInOut' });
      if (prev && prev !== next) this.scene.tweens.add({ targets: prev, alpha: 0, duration: 1800, ease: 'Sine.easeInOut' });
      this.vignette.setAlpha(state.index === 3 ? 0.22 : state.index === 4 ? 0.28 : 0.08);
      this.onPhaseChange?.(state.phase, state.day, state.index);
    }
    return state;
  }
}
