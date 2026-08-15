// StageDirector — 스테이지 진행·배경 전환·터미널 판정.
//
// 난이도 축은 스테이지 인덱스와 경과 시간뿐이다(결함 클래스 D). 남은 인내심·점수·콤보처럼
// 플레이어가 회복할 수 있는 값은 절대 참조하지 않는다 — 그러면 잘할수록 쉬워지는 역주행이 생긴다.
//
// 각 스테이지는 (목표, 보상, 다음 상태)를 keeperConfig에 데이터로 선언하고, 마지막 스테이지의
// next가 'dawn'이라 승리 터미널이 구조적으로 도달 가능하다(결함 클래스 E).

export default class StageDirector {
  constructor({ rules, onStageChange, onVictory }) {
    this.rules = rules;
    this.onStageChange = onStageChange;
    this.onVictory = onVictory;
    this.reset();
  }

  reset() {
    this.stageIndex = 0;
    this.guidedThisStage = 0;
    this.guidedTotal = 0;
    this.elapsedMs = 0;
    this.finished = false;
  }

  get stage() {
    return this.rules.stages[this.stageIndex];
  }

  get stageNumber() {
    return this.stage.index;
  }

  get quota() {
    return this.stage.quota;
  }

  tick(deltaMs) {
    if (!this.finished) this.elapsedMs += deltaMs;
  }

  // 배 한 척을 안전하게 인도했을 때. 쿼타를 채우면 다음 스테이지 또는 승리.
  registerGuided() {
    this.guidedThisStage += 1;
    this.guidedTotal += 1;
    if (this.guidedThisStage < this.quota) return { advanced: false };
    const current = this.stage;
    if (current.next === 'dawn') {
      this.finished = true;
      this.onVictory?.();
      return { advanced: true, victory: true, reward: current.reward };
    }
    this.stageIndex += 1;
    this.guidedThisStage = 0;
    this.onStageChange?.(this.stage);
    return { advanced: true, victory: false, reward: current.reward, stage: this.stage };
  }

  snapshot() {
    return {
      stage: this.stageNumber,
      stageCount: this.rules.stages.length,
      guidedThisStage: this.guidedThisStage,
      quota: this.quota,
      guidedTotal: this.guidedTotal,
      elapsedMs: Math.round(this.elapsedMs),
      finished: this.finished,
    };
  }
}
