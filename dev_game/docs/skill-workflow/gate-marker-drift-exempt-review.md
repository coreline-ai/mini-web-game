# 독립 검토 — gate-marker-drift-exempt

- reviewer: `skill-task-gate-qa` (기계 판정)
- 판정: `PASS`

승인 근거는 사람의 의견이 아니라 대조군 하네스의 재현 가능한 판정이다. 하네스는 구현과 같은
커밋에 있고, 구현을 되돌리면 하네스가 빨갛게 된다.

```
$ node scripts/skill_task_gate_qa.mjs
✓ marker/start: exit=0, expected=0, fingerprint=PLANNED
✓ marker/pass: exit=0, expected=0, fingerprint=PASS
✓ marker/verify: exit=0, expected=0, fingerprint=PASS
✓ marker/exempt: exit=0, expected=0, fingerprint=PASS
✓ marker/control-drift: exit=1, expected=1, fingerprint=E_PASS_DRIFT
✓ marker/exempt-still: exit=0, expected=0, fingerprint=PASS
✓ marker/tracked-not-exempt: exit=1, expected=1, fingerprint=E_PASS_DRIFT
skill task gate QA OK: 40 assertions
```

## 검토자가 실제로 확인한 것

1. **제외가 좁다.** basename이 정확히 `PRODUCTION-DEMO-NOT-VERIFIED.json`인 파일만, 그리고
   추적되지 않을 때만 건너뛴다. `marker/control-drift`가 다른 새 파일은 여전히 drift임을,
   `marker/tracked-not-exempt`가 커밋된 표식은 제외 대상이 아님을 각각 단독으로 증명한다.
2. **구현이 대조군보다 먼저 좁아졌다.** 무조건 제외 판은 이 저장소에서 곧바로 `E_SCOPE`를 냈다
   (iron-courier의 커밋된 표식). 범위를 넓혀 통과시키지 않고 구현을 고쳤다.
3. **판정 소유권 불변.** `production-pass-receipt.mjs`는 손대지 않았다. 표식이 있는 게임은
   여전히 `invalid`다 — 실측: `iron-courier-last-line` state=invalid (exit 1).
4. **교착이 실측이라는 것.** 수정 전 `last-light-zero-hour`의 게이트 실행 로그에 `E_PASS_DRIFT`가
   남아 있다(구현 기록에 인용). 이 task가 PASS로 봉인되면 `lastlight-marker-untrack`이
   superseded가 되고 표식도 제외되므로 같은 명령이 완주할 수 있다. 그 결과는 이 문서가 아니라
   **그때 발급되는 영수증**이 증명한다 — 아직 일어나지 않은 일을 여기 적지 않는다.

## 남는 위험

커밋된 표식이 있는 게임을 승인 범위에 포함하는 task는 그 표식이 지워질 때 drift를 본다. 그것은
의도된 동작이다 — 커밋된 표식은 판정이므로, 조용히 사라지면 안 된다.
