import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayoutStable } from '../systems/LayoutRegistry.js';
import { px, font, PALETTE } from '../config/theme.js';
import { SIGNAL_CODES, KEEPER_RULES } from '../config/keeperConfig.js';
import { renderCode } from '../systems/SignalCodec.js';
import { AudioManager } from '../systems/AudioManager.js';

// 일시정지와 도움말은 같은 오버레이를 공유한다. 도움말로 열면 코드표가 함께 나오고,
// 어느 쪽이든 게임은 정지하며 닫으면 원래 상태로 복귀한다(first-play-clarity 요구사항).
export default class PauseScene extends Phaser.Scene {
  constructor() { super(SCENES.PAUSE); }

  create(data = {}) {
    const { width, height } = SPEC.canvas;
    const isHelp = !!data.help;
    this.add.rectangle(0, 0, width, height, 0x02080f, 0.82).setOrigin(0);
    AudioManager.pauseMusic();

    this.title = this.add.text(width / 2, height * (isHelp ? 0.14 : 0.3),
      isHelp ? 'SIGNAL CODES' : 'PAUSED', {
        fontFamily: 'Arial Black,Arial', fontSize: font(30), color: PALETTE.text,
      }).setOrigin(0.5);

    if (isHelp) {
      const lines = Object.values(SIGNAL_CODES)
        .map((r) => `${r.glyph}   ${r.label}\n      ${renderCode(r.code)}`).join('\n\n');
      this.body = this.add.text(width / 2, height * 0.42, lines, {
        fontFamily: 'Arial', fontSize: font(16), color: '#ffd98d',
        align: 'center', lineSpacing: px(4),
      }).setOrigin(0.5);
      this.hint = this.add.text(width / 2, height * 0.63,
        [
          `짧게 탭 = ▪   ·   ${KEEPER_RULES.longPressMs}ms 이상 = ▬`,
          '배 위의 기호를 보고 그 코드를 램프로 보낸다',
          `난파 ${KEEPER_RULES.wreckAllowance}회면 패배`,
        ].join('\n'), {
          fontFamily: 'Arial', fontSize: font(14), color: PALETTE.textDim,
          align: 'center', lineSpacing: px(6),
        }).setOrigin(0.5);
    }

    const resumeY = isHelp ? height * 0.78 : height * 0.5;
    this.resume = makeTextButton(this, width / 2, resumeY, 'RESUME', () => {
      this.scene.stop();
      const game = this.scene.get(SCENES.GAME);
      game?.resumeFromOverlay?.();
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
