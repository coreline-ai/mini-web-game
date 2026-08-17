# 독립 검토 — asset-plan-recovery

- reviewer: `asset-plan-recover-qa` + `factory:qa` (기계 판정)
- 판정: `PASS`

## 무엇이 증명됐나

대조군이 `factory:qa` 체인에서 매번 돌고, 네 갈래 결함 주입이 각각 해당 대조군을 RED로 만든다.

```
asset-plan recover QA OK: manifest 골격, 1:1 프롬프트 회수, 시트 프롬프트 미부착,
                          근거 없음 거부, imagegen 빈 프롬프트 차단·조언 배선
factory:qa                exit 0
gate controls             52개
```

빈 프롬프트 차단은 문자열 검사가 아니라 실제 실행으로도 확인했다:

```
$ codex-imagegen --project <빈 프롬프트 계획>
asset-plan에 프롬프트가 없는 항목이 있다: sprites/hero
```

## 자기 지적

대조군 하나가 공허했다 — `assertPlanPrompts(plan)` 문자열이 함수 **정의**에도 존재해
호출을 지워도 통과했다. 호출 지점 정규식으로 교체한 뒤 주입이 잡혔다. 이 세션에서 같은
유형(공허한 대조군)이 세 번째다: rename 대조군, 빈 범위 PASS 대조군, 그리고 이것.
**문자열 포함 검사는 정의와 호출을 구분하지 못한다**는 것을 규칙으로 기억해야 한다.

## 범위 판단

이 작업은 두 게임을 통과시키지 **않는다.** 막힌 지점을 "재생성 명령이 실행되지 않는다"에서
"프롬프트를 새로 써야 한다"로 옮긴 것이며, 후자는 기계가 대신할 수 없다(manifest가 원문을
저장하지 않았다). 통과시키려 프롬프트를 임의로 지어내는 것은 provenance 위조에 가깝고,
게이트가 요구하는 것도 아니다. 현재 상태가 정확하다.
