import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayout } from '../systems/LayoutRegistry.js';
import { AudioManager } from '../systems/AudioManager.js';
import { configureLogicalScene } from '../systems/LogicalViewport.js';

export default class BriefingScene extends Phaser.Scene {
  constructor() { super(SCENES.BRIEFING); }
  create(data = {}) {
    configureLogicalScene(this);
    const { width, height } = SPEC.canvas;
    this.add.image(width / 2, height / 2, ASSET_KEYS.bgConflict).setDisplaySize(width, height).setTint(0x445868);
    this.add.rectangle(0, 0, width, height, 0x020b12, 0.72).setOrigin(0);
    this.add.text(24, 32, '출격 전 확인', { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial', fontSize: '26px', color: '#ffffff' });
    this.add.text(24, 69, '목표: 구조차를 지키고 공격 헬기를 격추', { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial', fontSize: '12px', color: '#55dfff' });
    this.add.text(24, 105, '전장 드래그로 조준하고 아래 무기 버튼을 누르세요.\n첫 출격에는 조준 → 기관포 → 미사일 실전 훈련이 나옵니다.', { fontFamily: 'Apple SD Gothic Neo, Arial', fontSize: '13px', color: '#c7dce4', lineSpacing: 4 });
    this.card(24, 174, ASSET_KEYS.rifleman, '적군', '빨간 마름모', 0xff4b45, '조준 후 공격');
    this.card(24, 310, ASSET_KEYS.rescueTruck, '구조 차량', '하늘색 방패', 0x43dfff, '끝까지 보호');
    this.card(24, 446, ASSET_KEYS.civilians, '민간인', '흰 구조 원', 0xffffff, '절대 사격 금지');
    this.add.text(24, 602, '조작 방법', { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial', fontSize: '11px', color: '#66dfff' });
    this.add.text(24, 626, '① 전장 드래그  조준점 이동\n② 30MM 기관포 길게  연속 사격\n③ 유도 미사일 길게 → 잠금 100% → 손 떼기', { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial', fontSize: '12px', color: '#ffffff', lineSpacing: 7 });
    const returnToGame = Boolean(data.returnToGame);
    this.launch = makeTextButton(this, width / 2, 766, returnToGame ? '작전으로 돌아가기' : '전투 시작', () => {
      this.time.delayedCall(32, () => {
        if (returnToGame) { this.scene.stop(); this.scene.resume(SCENES.GAME); AudioManager.resumeMusic(); }
        else this.scene.start(SCENES.GAME);
      });
    }, 300, 66, 0xffb43b);
    publishLayout(this, [{ id: 'launch', obj: this.launch.bg }]);
  }
  card(x, y, key, title, marker, accent, note) {
    this.add.rectangle(x, y, 342, 116, 0x071925, 0.92).setOrigin(0).setStrokeStyle(1.5, accent, 0.8);
    this.add.image(x + 62, y + 58, key).setDisplaySize(94, 94);
    this.add.text(x + 124, y + 22, title, { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial', fontSize: '17px', color: `#${accent.toString(16).padStart(6, '0')}` });
    this.add.text(x + 124, y + 52, marker, { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial', fontSize: '11px', color: '#ffffff' });
    this.add.text(x + 124, y + 76, note, { fontFamily: 'Apple SD Gothic Neo, Arial', fontSize: '12px', color: '#abc4cd' });
  }
}
