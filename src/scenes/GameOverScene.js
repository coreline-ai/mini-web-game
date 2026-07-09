import { GC, SCENES } from '../config/gameConfig.js';
import { Save } from '../systems/SaveData.js';
import { Music } from '../systems/MusicManager.js';
import { FONT_BODY, FONT_HEAVY, fitTextWidth, formatCount, iconButton, imageTextButton, panel } from '../ui/UiKit.js';

// GameScene 위 오버레이. 이어하기(하트/코인) 또는 종료.
export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SCENES.GAMEOVER);
  }

  create(data) {
    this.gameKey = data?.gameKey ?? SCENES.GAME;
    // 사망 순간의 탭이 버튼을 즉시 누르지 않도록 잠깐 입력 잠금(오작동 방지)
    this.input.enabled = false;
    this.time.delayedCall(450, () => { this.input.enabled = true; });
    const game = this.scene.get(this.gameKey);
    const score = Number.isFinite(data?.score) ? data.score : game.score.getScore();
    const runCoins = game.coins.runCoins;
    const isNewBest = !!data?.isNewBest;

    this.add.rectangle(0, 0, GC.WIDTH, GC.HEIGHT, 0x000000, 0.92).setOrigin(0, 0);
    panel(this, GC.WIDTH / 2, 1040, 760, 980, { alpha: 0.84, strokeAlpha: 0.34, radius: 34, depth: 1 });

    if (this.textures.exists('msg_gameover')) {
      this.add.image(GC.WIDTH / 2, 420, 'msg_gameover').setDisplaySize(760, 240).setDepth(3);
    } else {
      this.add.text(GC.WIDTH / 2, 420, 'GAME OVER', { fontFamily: FONT_HEAVY, fontSize: '110px', color: '#ff5a5a' }).setOrigin(0.5).setDepth(3);
    }

    fitTextWidth(
      this.add.text(GC.WIDTH / 2, 690, `SCORE  ${formatCount(score)}`, { fontFamily: FONT_HEAVY, fontSize: '78px', color: '#fff', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(3),
      650,
    );
    fitTextWidth(
      this.add.text(GC.WIDTH / 2, 825, `BEST  ${formatCount(Save.best)}`, { fontFamily: FONT_BODY, fontSize: '54px', color: '#ffd54a' }).setOrigin(0.5).setDepth(3),
      560,
    );

    // 획득 코인
    this.add.image(GC.WIDTH / 2 - 60, 940, 'coin_01').setDisplaySize(56, 56).setDepth(3);
    this.add.text(GC.WIDTH / 2, 940, `+${formatCount(runCoins)}`, { fontFamily: FONT_HEAVY, fontSize: '50px', color: '#ffd54a' }).setOrigin(0, 0.5).setDepth(3);

    if (isNewBest) {
      const nb = this.add.text(GC.WIDTH / 2, 1040, 'NEW BEST!', { fontFamily: FONT_HEAVY, fontSize: '58px', color: '#00e676' }).setOrigin(0.5).setDepth(3);
      this.tweens.add({ targets: nb, scale: 1.12, duration: 500, yoyo: true, repeat: -1 });
    }

    // 이어하기 (무료 하트 or 코인)
    let btnY = 1190;
    if (game.canContinue()) {
      const free = game.freeContinuesLeft > 0;
      const label = free ? '이어하기 무료' : `이어하기 코인 ${GC.HEART.costCoins}`;
      imageTextButton(this, GC.WIDTH / 2, btnY, 'btn_wide_continue', label, () => this.continueRun(), {
        width: 620,
        height: 144,
        fontSize: '50px',
        maxTextWidth: 500,
        stroke: '#0b513b',
        strokeThickness: 5,
      }).setDepth(3);
      btnY += 170;
    }

    this.errorText = this.add
      .text(GC.WIDTH / 2, 1320, '', { fontFamily: FONT_BODY, fontSize: '34px', color: '#ff8a8a', align: 'center' })
      .setOrigin(0.5)
      .setDepth(3);

    imageTextButton(this, GC.WIDTH / 2, btnY, 'btn_wide_restart', '다시하기', () => this.exitTo(SCENES.GAME), {
      width: 600,
      height: 140,
      fontSize: '54px',
      maxTextWidth: 480,
      stroke: '#14315f',
      strokeThickness: 5,
    }).setDepth(3);

    iconButton(this, GC.WIDTH / 2 - 110, 1520, 'btn_home', () => this.exitTo(SCENES.HOME)).setDepth(3);
    iconButton(this, GC.WIDTH / 2 + 110, 1520, 'btn_shop', () => this.exitTo(SCENES.SHOP)).setDepth(3);
  }

  continueRun() {
    const game = this.scene.get(this.gameKey);
    if (!game.revive()) {
      this.errorText?.setText('코인이 부족합니다');
      return;
    }
    Music.play(this);
    this.scene.resume(this.gameKey);
    this.scene.stop();
  }

  exitTo(sceneKey) {
    const game = this.scene.get(this.gameKey);
    if (game) {
      if (game.bankCoins) game.bankCoins(); // 남은 코인 적립(멱등)
      if (game.recordScore) game.recordScore(); // 정식 종료 → 랭킹 1회 기록
    }
    Music.stop(this);
    this.scene.stop(this.gameKey);
    this.scene.start(sceneKey);
    this.scene.stop();
  }
}
