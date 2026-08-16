import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayoutStable } from '../systems/LayoutRegistry.js';
import { px, font, PALETTE } from '../config/theme.js';
import { HOME_LAYOUT } from '../config/uiDirection.js';
import { AudioManager } from '../systems/AudioManager.js';
import { SaveData } from '../systems/SaveData.js';
import { KEEPER_RULES } from '../config/keeperConfig.js';

// 홈 화면은 **팀 시트**다 (uiDirection: team-sheet-rows).
//
// 계약 §2.0.26이 요구하는 것은 첫 플레이 5요소의 *존재*이지 배치가 아니다. 앞 게임처럼
// 가운데 정렬 5줄 문단으로 쓰면 아트만 다른 같은 화면이 된다. 여기서는 경기 기록지처럼
// 좌측에 항목, 우측에 값을 놓고 행으로 쌓는다. 배치 좌표는 uiDirection이 소유한다.
export default class HomeScene extends Phaser.Scene {
  constructor() { super(SCENES.HOME); }

  create() {
    const { width, height } = SPEC.canvas;
    const L = HOME_LAYOUT;

    if (this.textures.exists('bg_0')) {
      this.add.image(width / 2, height / 2, 'bg_0').setDisplaySize(width, height).setDepth(-10);
      this.add.rectangle(0, 0, width, height, 0x07130c, 0.62).setOrigin(0).setDepth(-9);
    }

    // ── 타이틀 바 — 전광판 상단 띠
    // 전광판 패널. 화면 끝까지 채우지 않고 좌우를 띄운다 — 시스템 바가 아니라 경기장에
    // 걸린 판으로 읽혀야 하고, 실제로 화면 끝까지 채운 어두운 무채색 띠는 scene-composite
    // 게이트가 브라우저 툴팁 오버레이로 오인한다(실측). 채도를 준 짙은 피치 그린을 쓴다.
    const barH = px(96);
    const barX = width * (L.railX - 0.05);
    const barW = width * (L.valueX - L.railX + 0.10);
    this.add.rectangle(barX, height * L.titleBarY, barW, barH, 0x0d3b1c, 0.88)
      .setOrigin(0, 0.5).setDepth(1);
    this.add.rectangle(barX, height * L.titleBarY + barH / 2, barW, px(3), PALETTE.accent, 1)
      .setOrigin(0, 0.5).setDepth(2);
    this.title = this.add.text(width * L.railX, height * L.titleBarY, SPEC.game.title, {
      fontFamily: 'Arial Black,Arial', fontSize: font(20), color: PALETTE.text,
    }).setOrigin(0, 0.5).setDepth(3);
    // 부제는 우측 정렬이라 타이틀과 충돌할 수 있다. 레지스트리에 등록해 게이트가 잡게 한다 —
    // 등록하지 않으면 겹쳐도 통과한다(실제로 그렇게 겹친 채 캡처됐다).
    this.subtitle = this.add.text(width * L.valueX, height * L.titleBarY, '최후의 1분', {
      fontFamily: 'Arial', fontSize: font(12), color: '#ffe066',
    }).setOrigin(1, 0.5).setDepth(3);

    // ── 팀 시트 행 — 좌측 항목 / 우측 값. 첫 플레이 5요소를 이 형식으로 담는다.
    const rows = [
      ['목표', '추가시간까지 골문을 지킨다'],
      ['승리', `스테이지 ${KEEPER_RULES.stages.length} 통과`],
      ['패배', `실점 ${KEEPER_RULES.concedeAllowance}회`],
      ['첫 행동', '키퍼를 끌어 움직인다'],
      ['진행 지표', '스테이지 / 세이브 / 실점'],
      ['다이빙', `빠르게 튕기기 · 회복 ${KEEPER_RULES.control.diveRecoveryMs}ms`],
      ['리바운드', '쳐낸 공은 살아 있다 · 탭으로 펀칭'],
    ];
    const goalLines = [];
    rows.forEach(([label, value], i) => {
      const y = height * (L.sheetTopY + i * L.rowGap);
      // 행 구분선 — 기록지의 괘선
      this.add.rectangle(width * L.railX, y + px(17), width * (L.valueX - L.railX), px(1), 0xffffff, 0.14)
        .setOrigin(0, 0.5).setDepth(1);
      const isTip = i >= 5;
      const lab = this.add.text(width * L.railX, y, label, {
        fontFamily: 'Arial', fontSize: font(13), color: isTip ? '#ffe066' : PALETTE.textDim,
      }).setOrigin(0, 0.5).setDepth(3);
      this.add.text(width * L.valueX, y, value, {
        fontFamily: 'Arial Black,Arial', fontSize: font(14),
        color: isTip ? '#ffeaa0' : PALETTE.text,
      }).setOrigin(1, 0.5).setDepth(3);
      if (i < 5) goalLines.push(lab);
    });
    // 레이아웃 게이트가 "목표 블록"으로 읽을 대표 요소.
    this.goal = goalLines[0];

    // ── 행동 행 — 번호판 버튼 두 개를 가로로. 세로 스택을 쓰지 않는 것이 이 게임의 차이다.
    const actionY = height * L.actionRowY;
    this.play = makeTextButton(this, width * 0.30, actionY, 'PLAY',
      () => this.scene.start(SCENES.GAME), { variant: 'primary', oneShot: true, width: px(160) });

    const settings = SaveData.getSettings();
    AudioManager.setMuted(settings.mute);
    if (this.cache.audio.exists('bgm-home')) AudioManager.playMusic(this, 'bgm-home');
    else this.load.once('complete', () => { if (this.scene.isActive()) AudioManager.playMusic(this, 'bgm-home'); });

    this.soundBtn = makeTextButton(this, width * 0.74, actionY,
      settings.mute ? 'MUTED' : 'SOUND', () => {
        const next = !SaveData.getSettings().mute;
        SaveData.setSettings({ mute: next });
        AudioManager.setMuted(next);
        this.soundBtn.setLabel(next ? 'MUTED' : 'SOUND');
      }, { variant: 'secondary', width: px(130) });

    this.best = this.add.text(width * L.valueX, height * 0.925, `BEST  ${settings.best || 0}`, {
      fontFamily: 'Arial Black,Arial', fontSize: font(15), color: PALETTE.textDim,
    }).setOrigin(1, 0.5);

    // 첫 플레이 5요소를 **배치와 무관하게** 공표한다. 계약이 요구하는 것은 요소의 존재이지
    // 배치가 아니므로, 검사도 배치가 아니라 존재를 봐야 한다. 이전 어댑터는 특정 텍스트
    // 객체를 긁고 있어서 홈 구성을 바꾸자마자 내용이 그대로인데도 실패했다.
    this.firstPlayCopy = rows.map(([k, v]) => `${k} · ${v}`).join('\n');

    publishLayoutStable(this, [
      { id: 'home-title', obj: this.title },
      { id: 'home-subtitle', obj: this.subtitle },
      { id: 'home-goal', obj: this.goal },
      { id: 'play', obj: this.play.bg },
      { id: 'sound', obj: this.soundBtn.bg },
      { id: 'best', obj: this.best },
    ], { requiredIds: ['home-title', 'home-goal', 'play'] });
  }
}
