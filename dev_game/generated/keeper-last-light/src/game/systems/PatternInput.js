// PatternInput — 램프 버튼의 누름 길이를 짧게/길게로 번역해 펄스 버퍼를 만든다.
//
// 입력 견고성(결함 클래스 I) 요구사항을 여기서 전부 흡수한다:
//  - 멀티터치: 이미 눌린 포인터가 있으면 두 번째 포인터를 무시한다(양손 연타로 코드가
//    두 배로 들어가는 것을 막는다)
//  - 씬 전환/일시정지 중 입력 차단: setEnabled(false)로 즉시 잠근다
//  - pointerup을 놓친 경우(포인터가 밖으로 나가거나 브라우저가 취소): pointerupoutside와
//    pointercancel도 같은 경로로 처리해 버튼이 눌린 채 남지 않게 한다

export default class PatternInput {
  constructor(scene, { longPressMs, resetMs, onPulse, onReset }) {
    this.scene = scene;
    this.longPressMs = longPressMs;
    this.resetMs = resetMs;
    this.onPulse = onPulse;
    this.onReset = onReset;
    this.buffer = [];
    this.enabled = true;
    this.activePointerId = null;
    this.pressStartedAt = 0;
    this.idleTimer = null;
  }

  setEnabled(value) {
    this.enabled = !!value;
    if (!this.enabled) this.cancelPress();
  }

  cancelPress() {
    this.activePointerId = null;
    this.pressStartedAt = 0;
  }

  beginPress(pointer) {
    if (!this.enabled) return false;
    if (this.activePointerId !== null) return false; // multi-touch block
    this.activePointerId = pointer?.id ?? 0;
    this.pressStartedAt = this.scene.time.now;
    return true;
  }

  // 누름이 끝났을 때 호출. 짧으면 's', 길면 'l'을 버퍼에 넣고 콜백한다.
  endPress(pointer) {
    if (!this.enabled) return null;
    if (this.activePointerId === null) return null;
    if (pointer && (pointer.id ?? 0) !== this.activePointerId) return null;
    const heldMs = this.scene.time.now - this.pressStartedAt;
    this.cancelPress();
    const pulse = heldMs >= this.longPressMs ? 'l' : 's';
    this.buffer.push(pulse);
    this.armIdleReset();
    this.onPulse?.(pulse, this.buffer.slice());
    return pulse;
  }

  // 마지막 펄스 후 일정 시간 입력이 없으면 버퍼를 비운다. 반쯤 친 코드가 다음 배까지
  // 따라가 엉뚱한 오답을 만드는 것을 막는다.
  armIdleReset() {
    this.idleTimer?.remove();
    this.idleTimer = this.scene.time.delayedCall(this.resetMs, () => {
      if (this.buffer.length) this.clear('idle');
    });
  }

  clear(reason = 'manual') {
    this.buffer.length = 0;
    this.idleTimer?.remove();
    this.idleTimer = null;
    this.onReset?.(reason);
  }

  snapshot() {
    return { buffer: this.buffer.slice(), enabled: this.enabled, pressActive: this.activePointerId !== null };
  }

  destroy() {
    this.idleTimer?.remove();
    this.idleTimer = null;
    this.cancelPress();
    this.buffer.length = 0;
  }
}
