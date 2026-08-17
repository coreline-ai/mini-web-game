# 구현 증거 — asset-plan-recovery

- task: `asset-plan-recovery`
- 일자: `2026-08-17`

## 문제 — 스킬이 시키는 일을 실행할 수 없었다

`game-factory`·`game-polish`는 나쁜 아트를 만나면 **재생성하라**고 지시하고, 그 명령은
`factory:imagegen -- --project <p> --skip-existing --id <asset>`이다. 그 명령은
`asset-plan.json`을 요구하는데 게임 19개 중 4개에 그 파일이 없다:
`last-light-zero-hour`, `iron-courier-last-line`, `firebreak-commander`, `parcel-sort-rush`.

실제로 두 게임이 그 벽에 막혔다.

```
last-light-zero-hour   fx-rocket-explosion-v1  hf 7.08 > 6      (재생성 필요)
iron-courier-last-line projectile-rifle 외 3   최소 변 256px 미달 (재생성 필요)

$ factory:imagegen --project generated/last-light-zero-hour --skip-existing --id fx-rocket-explosion-v1
asset-plan.json missing — run productionize.mjs first
```

## 발견 1 — 기존 조언이 파괴적이었다

`productionize.mjs`는 기획 문서(`docs/01~05`)를 다시 쓴다. `make-game`이 그 경고를 직접
출력한다("Hand edits in these files will be lost"). **자산 하나를 다시 만들려다 기획 문서를
잃는 것은 고치는 것이 아니다.** 오류 메시지를 복원 경로로 바꿨다.

## 발견 2 — 빈 프롬프트 방어가 없었다

`codex-imagegen`은 프롬프트를 문자열 연결로 쓴다: `${sp.prompt} Flat solid pure-magenta ...`.
빈 프롬프트면 **크로마키 보일러플레이트만으로 이미지를 만들고 production provenance로 기록**한다.
복원된 계획은 프롬프트가 비어 있을 수 있으므로, 복원 기능을 추가하는 것만으로 이 구멍이
활성화됐을 것이다. `assertPlanPrompts`로 계획 로드 직후 차단한다.

## 발견 3 — 프롬프트는 부분적으로만 복원된다

manifest는 `promptHash`만 담고 원문이 없다. `art-prompts.md`가 있으면 회수할 수 있는데,
**1:1로 이어지는 것은 사실상 배경뿐이다.** 실측(firebreak-commander):

```
backgrounds 3  프롬프트 회수됨 (1601 / 1725 / 1816자)
sprites 6      \
ui 3            > 프롬프트 하나가 시트 한 장을 만들었다 → 자산별 대응 없음
fx 3           /
```

`response-objects-sheet` 한 프롬프트가 스프라이트 6개를 만들었다. 그 프롬프트를 개별 자산에
붙이면 **"자산 하나 재생성"이 시트 전체 재생성**이 되므로 붙이지 않는다. 소실로 보고한다.

## 구현

| 파일 | 내용 |
|---|---|
| `asset-plan-recover.mjs` (신규) | manifest → asset-plan 골격 복원. 배경은 `stageBackgrounds`에서, 나머지는 `images`의 `type`으로 버킷 분류. `art-prompts.md`의 `Raw built-in output` 줄로 1:1 회수 |
| `codex-imagegen.mjs` | 빈 프롬프트 차단(`assertPlanPrompts`), 오류 메시지를 복원 경로로 교체 |
| `cli-contracts.json` / `package.json` | `factory:asset-plan-recover` 등록 |
| 두 SKILL.md | 재생성의 **전제조건** 명시 — asset-plan 필요, 프롬프트 소실 가능, productionize 금지 |
| `asset-plan-recover-qa.mjs` (신규) | 대조군, `factory:qa` 체인 |

fail-closed: 프롬프트가 소실된 항목이 있으면 `--allow-missing-prompts` 없이는 exit 1이다.
기존 `asset-plan.json`은 `--force` 없이 덮어쓰지 않는다.

## 결함 주입 검증

| 되돌린 것 | 결과 |
|---|---|
| 배경을 `images`에서 찾음 | 배경 대조군 ✗ |
| 시트 프롬프트를 개별 자산에 붙임 | `a sheet prompt must not be attached...` ✗ |
| `assertPlanPrompts` 호출 제거 | `imagegen must call assertPlanPrompts...` ✗ |
| `productionize` 조언 복구 | `imagegen must not advise productionize.mjs...` ✗ |

**대조군 하나가 공허했다.** `imagegen.includes('assertPlanPrompts(plan)')`로 검사했는데 그
문자열이 **함수 정의에도** 있어서 호출을 지워도 통과했다. 호출 지점을 정규식으로 검사하도록
고친 뒤 주입이 잡혔다.

## 남은 한계

- 프롬프트가 소실된 자산(시트 유래 또는 `art-prompts.md` 부재)은 **사람이 프롬프트를 새로
  써야** 재생성된다. 기계적으로 복원할 방법이 없다 — manifest가 원문을 저장하지 않았다.
- 시트 유래 자산의 올바른 재생성 단위는 자산이 아니라 **시트**다. manifest는 어느 시트에서
  잘렸는지 기록하지 않으므로, 그 관계를 복원하는 것은 별도 과제다.
- 따라서 `last-light-zero-hour`·`iron-courier-last-line`은 이 작업만으로 통과하지 않는다.
  막힌 지점이 "명령이 없다"에서 "프롬프트를 써야 한다"로 옮겨졌을 뿐이며, 그것이 정확한 상태다.
