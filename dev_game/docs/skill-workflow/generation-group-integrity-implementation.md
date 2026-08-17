# 구현 증거 — generation-group-integrity

- task: `generation-group-integrity` (supersedes `asset-plan-recovery`)
- 일자: `2026-08-17`

## 이전 판단 정정

앞 작업에서 **"manifest는 어느 시트에서 잘렸는지 기록하지 않는다"**고 적었다. **틀렸다.**
관계는 이미 기록돼 있다 — 같은 생성에서 나온 자산은 `provenance.promptHash`를 공유한다.

```
firebreak-commander (Path B)   자산 12개 / 고유 해시 2개
  db681dff3ed96122  response-helicopter, fire-engine, firebreak-dozer,
                    pine-ridge-village, power-substation, wildlife-refuge
  e5af1f5b45cbe167  fx-fire, fx-water, fx-smoke, ui-wind, ui-pause, ui-containment

keeper-last-light   (Path A)   자산 11개 / 고유 해시 11개  ← 1:1, 묶음 없음
last-light-zero-hour           자산 13개 / 고유 해시 13개  ← 묶음 아님. 프롬프트가 그냥 소실
```

`last-light-zero-hour`를 "시트 문제"로 묶었던 것도 정정한다 — 그 게임은 1:1이고, 문제는
프롬프트 부재 하나뿐이다.

## 실제 결함 — 묶음을 쪼개면 manifest가 거짓말을 한다

`codex-imagegen`은 재생성한 **그 항목의** provenance만 새로 쓴다
(`e.provenance = imagegenProvenance(...)`). 그래서 묶음 6개 중 하나만 다시 만들면:

- 그 하나는 새 `promptHash`(id|prompt 공식)를 갖는다
- 나머지 5개는 **여전히 `db681dff3ed96122`를 주장한다**
- 그런데 이제 그 6개는 한 번의 생성에서 나온 것이 아니다

**아무 검사도 이것을 보지 않았다.** manifest가 거짓 관계를 담은 채 게이트를 통과한다.

## 구현

1. **`generationGroups(manifest)`** — `promptHash`를 공유하는 자산 묶음을 뽑는다. 혼자인 해시는
   묶음이 아니다.
2. **복원 계획이 묶음을 싣는다** — `plan.generationGroups`와 항목별 `generationGroup`.
   재생성 단위가 자산이 아니라는 사실이 계획을 읽는 사람과 도구 모두에게 보인다.
3. **`assertGroupNotSplit`** — `--id`가 묶음의 일부만 고르면 `codex-imagegen`이 멈춘다.
   glob(`fx-*`)로 고른 경우에도 계획의 모든 id에 대해 판정하므로 성립한다.

## 실측 동작

```
--id a1     → 생성 묶음을 쪼개는 재생성이다 — 이 자산들은 한 번의 생성에서 나왔다:
                sheet0001: 선택 a1 / 나머지 a2
--id 'a*'   → 통과 (묶음 전체)
--id solo   → 통과 (묶음 아님)
```

## 결함 주입 검증

| 되돌린 것 | 결과 |
|---|---|
| 혼자인 해시도 묶음으로 셈 | `only shared hashes form a group (got 2)` ✗ |
| 계획에 묶음을 싣지 않음 | `the recovered plan must carry generationGroups` ✗ |
| imagegen 묶음 검사 제거 | `imagegen must refuse to regenerate part of a generation group` ✗ |

배선 대조군은 **호출 지점**을 정규식으로 본다 — 앞 작업에서 문자열 포함 검사가 정의와 호출을
구분하지 못해 공허했던 것을 반복하지 않는다.

## 남은 한계

- 묶음 전체를 재생성하려면 **구성원 각자의 프롬프트**가 필요하다. Path B 시트 프롬프트는
  "여러 대상을 한 장에" 기술하므로 자산별로 나눠 쓰는 것은 사람의 일이다.
- `art-prompts.md`의 어느 블록이 어느 묶음인지는 **증명되지 않는다.** 그 해시들은 손으로 쓴
  것이라 현재 `promptHash(id, prompt)` 공식으로 재현되지 않는다(`sha256(prompt)`로도 불일치).
  묶음의 존재는 확실하지만 프롬프트 원문과의 연결은 추정이다 — 그래서 붙이지 않는다.
