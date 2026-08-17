# 구현 증거 — legacy-receipt-migration

- task: `legacy-receipt-migration`
- 일자: `2026-08-17`

## 목적

`legacy-pass`는 **"통과한 적이 있다"**일 뿐 현재성이 증명되지 않는다(지문 없음). 동결
allowlist에 있는 게임을 실제 게이트에 통과시켜 진짜 영수증으로 바꾸고, 번 게임은 목록에서
내린다. 목표는 **allowlist 0** — 다 끝나면 `legacy-pass` 개념 자체를 코드에서 지울 수 있다.

## 결과

| 게임 | spec | 결과 | 비고 |
|---|---|---|---|
| `keeper-last-light` | v2 | **pass** | custom-loop-full, allowlist에서 내림 |
| `last-minute-keeper` | v2 | **pass** | custom-loop-full, allowlist에서 내림 |
| `meteor-dash` | v1 | **pass** | compatibility 경로 첫 성공, allowlist에서 내림 |
| `last-light-zero-hour` | v1 | **미통과** | 아래 참조 (allowlist 대상 아님 — 원래 `unknown`) |

```
전: legacy-pass 15 / pass 1 / unknown 3
후: legacy-pass 12 / pass 4 / unknown 2 / invalid 1
allowlist 15 → 12
```

## last-light-zero-hour — production-demo 미통과

게이트가 이미지 품질에서 멈췄다.

```
Image quality QA failed:
- fx-rocket-explosion-v1 [fx] hf 7.08 > 6 — too noisy/oversharpened for production-demo (재생성 필요)
```

게이트의 지시는 "재생성"이다. 그런데 **이 게임에는 `asset-plan.json`이 없다**(자산 provenance가
`provenanceVersion: legacy-1`). `factory:imagegen`은 asset-plan을 요구하므로 targeted 재생성
경로 자체가 없다.

```
$ factory:imagegen --project generated/last-light-zero-hour --skip-existing --id fx-rocket-explosion-v1
asset-plan.json missing — run productionize.mjs first
```

시도 중 지웠던 자산은 `git checkout`으로 원본 복원했다(작업 트리 변경 없음). 이 게임을 통과
시키려면 asset-plan을 재구성하는 `game-factory` 작업이 선행돼야 하며, 이번 범위 밖이다.
**미통과로 보고하고 영수증을 발급하지 않았다.** 미검증 표식을 커밋해 clone에서도 `invalid`로
보이게 한다 — 실패를 지우지 않는다.

## 게이트가 실제로 한 일 (실측)

- 게이트 시작 시 미검증 표식 생성 → 실행 중 status `invalid`
- 실패 시 영수증 **미발급**, 표식 잔존 → `invalid` 유지
- 성공 시에만 표식 제거 후 영수증 기록
- 영수증 `qaRunId` = 그 실행이 만든 세션 `runId` (3건 모두 확인)

## allowlist 에서 내리는 이유

영수증이 정본이므로 목록에 남겨 두면 **영수증이 사라졌을 때 legacy 자격이 조용히 되살아난다.**
번 게임은 반드시 내린다. 내린 뒤에도 상태는 `pass` 그대로임을 확인했다(영수증이 정본).

## 순환 차단 재확인

`last-light-zero-hour`에 `qa-evidence/<id>-<date>.md`를 써 봤으나 상태는 `invalid` 그대로였다 —
동결 allowlist 밖이라 파일을 쓰는 것만으로 자격을 얻지 못한다(설계대로). 확인 후 파일 제거.
