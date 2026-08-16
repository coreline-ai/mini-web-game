// ShotDirector — 언제 어떤 슛이 오는가. 스테이지 진행과 터미널 판정도 여기서 소유한다.
//
// 난이도 입력은 **스테이지 인덱스와 경과 시간뿐**이다. 남은 실점 여유·점수·콤보처럼
// 플레이어가 회복할 수 있는 값은 절대 참조하지 않는다(결함 클래스 D). 참조하면 잘할수록
// 쉬워지는 역주행이 생긴다.

export default class ShotDirector {
  constructor({ rules, rng, onStageChange, onVictory }) {
    this.rules = rules;
    this.rng = rng;
    this.onStageChange = onStageChange;
    this.onVictory = onVictory;
    this.reset();
  }

  reset() {
    this.stageIndex = 0;
    this.stageElapsedMs = 0;
    this.totalElapsedMs = 0;
    this.savesThisStage = 0;
    this.concededThisStage = 0;
    this.nextShotInMs = 900;
    this.finished = false;
  }

  get stage() { return this.rules.stages[this.stageIndex]; }
  get stageNumber() { return this.stage.index; }

  pickShotType() {
    const pool = this.stage.shots;
    return pool[Math.floor(this.rng.frac() * pool.length) % pool.length];
  }

  shouldDeflect() {
    return this.rng.frac() < this.stage.deflectChance;
  }

  // 다음 슛까지 남은 시간을 세고, 스테이지 시간이 끝나면 진행시킨다.
  // 반환값으로 "지금 쏴라"를 알린다 — 화면에 공이 없는 시간을 최소화하는 것이 목적이다.
  tick(deltaMs, liveBalls) {
    if (this.finished) return { fire: false };
    this.stageElapsedMs += deltaMs;
    this.totalElapsedMs += deltaMs;

    if (this.stageElapsedMs >= this.stage.durationMs) return this.advance();

    this.nextShotInMs -= deltaMs;
    if (this.nextShotInMs <= 0 && liveBalls < this.stage.maxLiveBalls) {
      // 경과 시간이 길수록 간격이 조금씩 좁아진다(스테이지 인덱스와 시간만 참조).
      const tighten = 1 - Math.min(0.25, this.stageElapsedMs / this.stage.durationMs * 0.25);
      this.nextShotInMs = this.stage.shotGapMs * tighten;
      return { fire: true, type: this.pickShotType(), deflect: this.shouldDeflect() };
    }
    return { fire: false };
  }

  advance() {
    const current = this.stage;
    const clean = this.concededThisStage === 0;
    if (current.next === 'full-time') {
      this.finished = true;
      this.onVictory?.();
      return { fire: false, advanced: true, victory: true, clean };
    }
    this.stageIndex += 1;
    this.stageElapsedMs = 0;
    this.savesThisStage = 0;
    this.concededThisStage = 0;
    this.nextShotInMs = 1200;
    this.onStageChange?.(this.stage);
    return { fire: false, advanced: true, victory: false, clean, stage: this.stage };
  }

  registerSave() { this.savesThisStage += 1; }
  registerConcede() { this.concededThisStage += 1; }

  snapshot() {
    return {
      stage: this.stageNumber,
      stageName: this.stage.name,
      stageCount: this.rules.stages.length,
      stageElapsedMs: Math.round(this.stageElapsedMs),
      stageDurationMs: this.stage.durationMs,
      savesThisStage: this.savesThisStage,
      concededThisStage: this.concededThisStage,
      finished: this.finished,
    };
  }
}
