# 구현 기록 — gate-marker-drift-exempt

## 무엇을 고쳤나

`scripts/skill_task_gate.mjs`의 스냅샷에서 **추적되지 않는** `PRODUCTION-DEMO-NOT-VERIFIED.json`을
제외한다. 커밋된 표식은 그대로 스냅샷에 남는다.

## 왜

`production-gate.mjs`는 진입할 때 대상 게임 폴더에 그 표식을 쓰고, 모든 게이트가 통과하면
지운다(성공한 실행만 지운다 — 그것이 표식의 요점이다). 그런데 그 폴더가 봉인된 PASS task의
승인 범위 안이면, 표식이 생기는 순간 `factory:qa` 안의 `verify-all`이 `E_PASS_DRIFT`로 죽는다.

실측(2026-08-18):

```
$ npm --prefix dev_game run factory:production-gate -- \
    --project dev_game/generated/last-light-zero-hour --require-gpt-imagegen
...
[SKILL_TASK_GATE:E_PASS_DRIFT] lastlight-marker-untrack PASS 이후 승인 범위가 변경됐다:
  dev_game/generated/last-light-zero-hour/PRODUCTION-DEMO-NOT-VERIFIED.json
```

게이트가 **자기 자신이 만든 파일 때문에** 완주하지 못했다. 실패로 끝났으니 표식은 남고, 게임은
`stale`에서 `invalid`로 내려간다. 즉 스킬이 지시하는 유일한 절차(게이트를 돌려 영수증을 번다)가
그 게임에서는 실행 불가능했다. 이것은 게임의 결함이 아니라 게이트 두 개의 상호작용 결함이다.

같은 판단이 이미 `production-pass-receipt.mjs`에 있다 — canonical snapshot에서 이 표식만 따로
제외하고 이유를 적어 두었다("표식을 남기는 것만으로 지문이 바뀌면 게이트 시작과 종료의 digest가
항상 다르다"). 이 커밋은 그 판단을 task 게이트에도 적용한다.

## 왜 추적 여부로 갈랐나

처음엔 이름만 보고 무조건 제외했다. 그러자 `advance`가 즉시 `E_SCOPE`를 냈다:

```
[SKILL_TASK_GATE:E_SCOPE] 선언하지 않은 파일 변경:
  dev_game/generated/iron-courier-last-line/PRODUCTION-DEMO-NOT-VERIFIED.json
```

게이트가 옳았다. `iron-courier-last-line`의 표식은 9afe541에 **커밋돼 있다.** 그것은 게이트가
돌고 있다는 흔적이 아니라 "이 게임은 게이트를 통과하지 못했다"는 저장소가 공유하는 판정이다.
무조건 제외하면 승인 범위 안의 커밋된 파일이 사라져도 게이트가 보지 못한다.

그래서 경계를 **흔적(untracked) / 사실(tracked)** 로 그었다. `snapshot()`은 이제 `--cached`와
`--others --exclude-standard`를 따로 읽고, 표식은 추적되지 않을 때만 건너뛴다.

## 무엇을 약화시키지 않는가

- 게임의 `invalid` 판정은 여전히 파일 시스템을 보는 `production-pass-receipt.mjs`가 소유한다.
  이 제외는 표식의 효력이 아니라 표식이 **남의 승인 범위를 깨뜨리는 것**만 막는다.
- 제외는 basename이 정확히 일치하는 파일 하나에만 적용된다. 다른 새 파일은 그대로 drift다
  (대조군 `marker/control-drift`가 그것을 증명한다).
- 커밋된 표식은 제외되지 않는다 (대조군 `marker/tracked-not-exempt`).

## 검증

`scripts/skill_task_gate_qa.mjs`에 시나리오 6을 추가했다. 대조군 개수를 33 → 40으로 올렸다.

| 케이스 | 기대 | 무엇을 증명하나 |
|---|---|---|
| `marker/verify` | exit 0 | 봉인 자체는 정상 |
| `marker/exempt` | exit 0 | 추적되지 않는 표식은 drift가 아니다 |
| `marker/control-drift` | exit 1 `E_PASS_DRIFT` | 제외가 "새 파일 전부 무시"로 넓어지지 않았다 |
| `marker/exempt-still` | exit 0 | 대조군 파일을 지우면 다시 초록 — 원인이 표식이 아님 |
| `marker/tracked-not-exempt` | exit 1 `E_PASS_DRIFT` | 커밋된 표식은 제외 대상이 아니다 |

```
$ node scripts/skill_task_gate_qa.mjs
skill task gate QA OK: 40 assertions
```
