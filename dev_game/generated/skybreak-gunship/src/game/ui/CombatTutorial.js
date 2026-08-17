import { SaveData } from '../systems/SaveData.js';

const FONT = 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif';

export default class CombatTutorial {
  constructor(scene, enabled = true) {
    this.scene = scene;
    this.active = Boolean(enabled);
    this.step = 0;
    this.target = null;
    this.missileLaunched = false;
    this.finishTimer = null;
    if (!this.active) return;

    this.panel = scene.add.rectangle(195, 160, 366, 88, 0x03131e, 0.96)
      .setStrokeStyle(2, 0xffc34e, 0.95).setDepth(114);
    this.stepText = scene.add.text(28, 128, '실전 훈련 1/3', {
      fontFamily: FONT, fontSize: '12px', color: '#ffcd65',
    }).setDepth(115);
    this.title = scene.add.text(195, 151, '빨간 적 위로 조준점을 옮기세요', {
      fontFamily: FONT, fontSize: '16px', color: '#ffffff', align: 'center',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(115);
    this.detail = scene.add.text(195, 180, '전장 화면을 손가락으로 드래그', {
      fontFamily: 'Apple SD Gothic Neo, Arial, sans-serif', fontSize: '12px', color: '#9eeeff',
    }).setOrigin(0.5).setDepth(115);
    this.arrow = scene.add.text(195, 211, '↓', {
      fontFamily: FONT, fontSize: '25px', color: '#ffcd65', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(115);
    scene.tweens.add({ targets: this.arrow, y: 219, duration: 420, yoyo: true, repeat: -1 });
    scene.coach?.setVisible(false);
    this.spawnAimTarget();
  }

  spawnAimTarget() {
    this.scene.spawnTarget({ at: -1, type: 'rifleman', x: 82, y: 306 });
    this.target = this.scene.targets.at(-1);
    this.freezeTarget(this.target);
  }

  spawnMissileTarget() {
    this.scene.spawnTarget({ at: -1, type: 'drone', x: 292, y: 268 });
    this.target = this.scene.targets.at(-1);
    this.freezeTarget(this.target);
    this.target.originX = this.target.sprite.x;
  }

  freezeTarget(target) {
    target.isTutorial = true;
    target.attackDisabled = true;
    target.expiresAt = 9999;
    target.controller?.destroy?.();
    target.controller = null;
    target.exposed = true;
  }

  update() {
    if (!this.active) return;
    if (this.step === 0 && this.target?.active) {
      const aimedTarget = this.scene.getTargetAt(this.scene.aim.x, this.scene.aim.y, true);
      if (aimedTarget === this.target) this.showGunStep();
    } else if (this.step === 1 && !this.target?.active) {
      this.showMissileStep();
    } else if (this.step === 2 && this.target && !this.target.active && !this.missileLaunched) {
      this.spawnMissileTarget();
    }
  }

  showGunStep() {
    this.step = 1;
    this.stepText.setText('실전 훈련 2/3');
    this.title.setText('적을 조준한 채 기관포를 누르세요');
    this.detail.setText('아래 [30MM 기관포] 버튼을 길게 누르기');
    this.arrow.setPosition(104, 724).setText('↓');
    this.scene.tweens.killTweensOf(this.arrow);
    this.scene.tweens.add({ targets: this.arrow, y: 735, duration: 420, yoyo: true, repeat: -1 });
  }

  showMissileStep() {
    this.step = 2;
    this.scene.weapon?.setGunHeld(false);
    this.spawnMissileTarget();
    this.stepText.setText('실전 훈련 3/3');
    this.title.setText('드론을 조준하고 미사일을 잠그세요');
    this.detail.setText('[유도 미사일] 길게 → LOCK 100% → 손 떼기');
    this.arrow.setPosition(286, 724);
    this.scene.tweens.killTweensOf(this.arrow);
    this.scene.tweens.add({ targets: this.arrow, y: 735, duration: 420, yoyo: true, repeat: -1 });
  }

  onMissileLaunch() {
    if (!this.active || this.step !== 2 || this.missileLaunched) return;
    this.missileLaunched = true;
    this.stepText.setText('훈련 완료');
    this.title.setText('좋습니다! 이제 호송 작전을 시작합니다');
    this.detail.setText('적 제거 · 민간인 사격 금지 · 구조차 보호');
    this.arrow.setVisible(false);
    this.finishTimer = this.scene.time.delayedCall(900, () => this.complete());
  }

  complete() {
    if (!this.active) return;
    this.active = false;
    SaveData.setTutorialDone(true);
    this.scene.targets.filter((target) => target.active && target.isTutorial).forEach((target) => this.scene.removeTarget(target, false));
    this.scene.score = 0;
    this.scene.combo = 1;
    this.scene.weapon.heat = 0;
    this.scene.weapon.overheated = false;
    this.scene.weapon.ammo = 4;
    this.scene.weapon.cooldown = 0;
    this.scene.weapon.shots = 0;
    this.scene.weapon.hits = 0;
    this.scene.coach?.setVisible(true);
    this.scene.startCoachHints?.();
    this.scene.warn('MISSION START · 구조차를 보호하세요', '#66f1c2');
    this.scene.tweens.add({
      targets: [this.panel, this.stepText, this.title, this.detail], alpha: 0, duration: 240,
      onComplete: () => [this.panel, this.stepText, this.title, this.detail, this.arrow].forEach((item) => item?.destroy()),
    });
  }

  destroy() {
    this.finishTimer?.remove(false);
  }
}
