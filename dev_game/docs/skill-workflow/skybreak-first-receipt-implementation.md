# 구현 증거 — skybreak-first-receipt

- task: `skybreak-first-receipt` (supersedes `plan-remediation-20260817-r2`)
- 일자: `2026-08-17`

## 목적

게이트·영수증 기계의 **첫 실사용**. Phase 0~3이 끝난 시점에 진짜 영수증을 가진 게임이
0개였다 — 15개 `legacy-pass`(제도 이전), 4개 `unknown`. 기계가 실제 작업에서 작동하는지는
돌려 봐야 알 수 있다.

## 왜 이 task가 필요한가 (r2 supersede)

`verify-all`을 `factory:qa`에 배선한 직후, 같은 커밋에서 계획서의 잔여 리스크 절을 갱신했다.
계획서는 r2의 승인물이므로 그 편집이 곧 drift다. 다음 `factory:qa`가 즉시 RED를 냈다.

```
[SKILL_TASK_GATE:E_PASS_DRIFT] plan-remediation-20260817-r2 PASS 이후 승인 범위가 변경됐다:
  dev_game/dev-plan/implement_20260817_155107.md
```

**배선한 지 한 커밋 만에 내가 그 규칙을 어겼고, 배선했기 때문에 즉시 잡혔다.** 이것이
`verify-all`을 만든 이유 그대로다.

## 수행

1. 후보 선정 — `unknown` 4개 중 `skybreak-gunship`(v2 custom-loop, production-demo,
   문서 7종, capture 12상태, 세션 리포트 보유)이 가장 완비돼 있었다.
2. 값싼 계약 게이트 선행 — `factory:production-demo-qa --require-gpt-imagegen` exit 0.
3. 전체 게이트 — `--mode custom-loop-full --viewports 390x844,430x932,1080x1920` exit 0.
4. 대상 게임을 추적으로 전환 — `dev_game/.gitignore`에 un-ignore 2줄(기존 16개 게임과 동일 형식).

## 실측 결과

| 확인 | 결과 |
|---|---|
| 영수증 발급 | `state: pass`, exit 0 — 저장소 최초의 `pass`(legacy 아님) |
| 게이트 시작 시 미검증 표식 | 실제 생성됨. 실행 중 status = `invalid` |
| 통과 후 표식 | 제거됨. 영수증은 그 뒤에만 쓰임 |
| `qaRunId` 교차 검증 | `2026-08-17T13-32-24-752Z` — 이번 실행의 세션과 일치(옛 2026-07-12 아님) |
| stale 탐지 | `vite.config.js` 한 줄 수정 → `stale`, 원복 → `pass` |

`vite.config.js`는 Phase 3 이전 지문(열거 방식)이 놓치던 파일이다. 실사용에서 그 수정이
효과를 내는 것을 확인했다.

## 추적 전환 판단

영수증은 프로젝트 지문을 봉인한다. 게임이 `.gitignore`에 가려져 있으면 검토자가 지문을
재현할 수 없고, 추적되는 파일이 **검증 불가능한 PASS를 주장**하게 된다 — 이 작업이 계속
없애온 패턴이다.

부분 추적은 성립하지 않는다. `assets/_source`(24.3 MB, 12 파일)를 제외하면 clone에서 지문이
달라진다:

```
영수증 지문        bdcb9f69f697ac3c
현재 지문          bdcb9f69f697ac3c
_source 없을 때    34306dfba0c89660   ← clone 관점이면 stale
```

그래서 146 파일 51.6 MB 전체를 추적한다. 기존 추적 게임 16개는 2~310 MB이며,
`castle-archer`·`firebreak-commander`는 `_source`까지 추적한다.

## 측정 도구 정정

`git check-ignore -v`로 무시 해제를 확인하려다 오판했다 — **부정 패턴에 걸려도 exit 0**을
내고 매칭된 규칙(`!generated/skybreak-gunship/**`)을 출력한다. 권위 있는 신호는
`git status`의 `??`(무시된 파일은 표시되지 않는다)와 `git add -n`이다.
