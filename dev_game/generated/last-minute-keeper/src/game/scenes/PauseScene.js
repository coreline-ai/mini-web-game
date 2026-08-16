import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayoutStable } from '../systems/LayoutRegistry.js';
import { px, font, PALETTE } from '../config/theme.js';
import { KEEPER_RULES } from '../config/keeperConfig.js';
import { AudioManager } from '../systems/AudioManager.js';

// 일시정지와 도움말은 같은 오버레이를 공유한다. 어느 쪽이든 게임은 정지하고 닫으면 복귀한다.
export default class PauseScene extends Phaser.Scene {
  constructor() { super(SCENES.PAUSE); }

  create(data = {}) {
    const { width, height } = SPEC.canvas;
    const isHelp = !!data.help;
    this.add.rectangle(0, 0, width, height, 0x03100a, 0.84).setOrigin(0);
    AudioManager.pauseMusic();

    this.title = this.add.text(width / 2, height * (isHelp ? 0.14 : 0.3),
      isHelp ? 'HOW TO KEEP' : 'PAUSED', {
        fontFamily: 'Arial Black,Arial', fontSize: font(30), color: PALETTE.text,
      }).setOrigin(0.5);

    if (isHelp) {
      const c = KEEPER_RULES.control;
      this.body = this.add.text(width / 2, height * 0.40, [
        '천천히 끌기  →  키퍼 이동',
        '빠르게 튕기기  →  다이빙 (도달 2배)',
        '공 근처에서 탭  →  펀칭',
      ].join('\n\n'), {
        fontFamily: 'Arial', fontSize: font(17), color: '#ffeaa0',
        align: 'center', lineSpacing: px(4),
      }).setOrigin(0.5);

      this.hint = this.add.text(width / 2, height * 0.60, [
        `다이빙 후 ${c.diveRecoveryMs}ms 동안 움직일 수 없다 — 남발하면 리바운드에 당한다`,
        '쳐낸 공은 살아 있다. 캐치하면 공이 죽고, 펀칭·다리막기는 살아남는다',
        `실점 ${KEEPER_RULES.concedeAllowance}회면 패배`,
      ].join('\n\n'), {
        fontFamily: 'Arial', fontSize: font(14), color: PALETTE.textDim,
        align: 'center', lineSpacing: px(4), wordWrap: { width: width - px(70) },
      }).setOrigin(0.5);
    }

    const resumeY = isHelp ? height * 0.78 : height * 0.5;
    this.resume = makeTextButton(this, width / 2, resumeY, 'RESUME', () => {
      this.scene.stop();
      this.scene.get(SCENES.GAME)?.resumeFromOverlay?.();
      AudioManager.resumeMusic();
      this.scene.resume(SCENES.GAME);
    }, { variant: 'primary', oneShot: true });

    this.home = makeTextButton(this, width / 2, resumeY + px(78), 'HOME', () => {
      AudioManager.stopMusic();
      this.scene.stop(SCENES.GAME);
      this.scene.start(SCENES.HOME);
    }, { variant: 'secondary', oneShot: true });

    publishLayoutStable(this, [
      { id: 'pause-title', obj: this.title },
      { id: 'resume', obj: this.resume.bg },
      { id: 'home', obj: this.home.bg },
    ], { requiredIds: ['pause-title', 'resume', 'home'] });
  }
}
