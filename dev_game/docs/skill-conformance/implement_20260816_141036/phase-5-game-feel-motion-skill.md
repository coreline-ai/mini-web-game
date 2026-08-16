# Phase 5 — `game-feel-motion-skill` 다이어트

- task ID: `implement_20260816_141036/phase-5`
- 작업 유형: `skill-maintenance`
- 상태: `PASS`

## 1. 작업 전 계약

| 항목 | 값 |
|---|---|
| baseline HEAD | `870d3d0e4b809313e980cfeb4c6f420ca83b904b` |
| 대상 skill baseline SHA | `cb705160de6b7ae3fff5cf776025f95e6a715126` |
| preplan patch | **없음** |
| Phase 4 승인 manifest (사슬 대상) | `188e2eb2874c4ba035414cc2e371ea66e4b523910553c329e45d328456937bea` |
| 현재 줄 수 | 90 |
| 참고 예산 | 70~90 — **이미 예산 안** |

허용 경로: `skills/game-feel-motion-skill/**`, Phase 5 보고서·manifest, Phase 5 체크박스.
금지: 다른 세 스킬, 계약, 계획 본문, `scripts/**`, pipeline.

target contract: `skill-inventory.md` **M-01 ~ M-06**.

## 2. 이 Phase의 핵심 — M-02 · M-03 통합

계획서 403행: "Workflow와 Decision Tree를 5~7단계 흐름으로 합친다."

**둘 다 `KEEP`이다. 통합이지 삭제가 아니다.** `## Core Workflow` 10단계와 `## Decision Tree`
5분기는 같은 작업의 두 표현인데, 분기가 "무엇을 정의해야 하는가"를 갖고 있고 단계가 "순서"를
갖고 있다. 지금은 독자가 둘을 대조해야 한다.

**통합 후 5분기의 정의 항목이 하나도 사라지면 안 된다.**

| Decision Tree 분기 | 정의해야 할 것 (전부 보존) |
|---|---|
| player input / control feel | action abstraction, response window, buffering, cancellation, feedback timing |
| UI motion | state transition, duration, easing/spring, reduced-motion fallback, visual hierarchy |
| hit / reward / skill / transition feedback | motion vocabulary, VFX·audio·haptic, screen/camera impact, timing stack |
| generated image frames 필요 | sequential asset brief, fixed cell·pivot·baseline·gap·margin, non-overlap |
| final polish review 준비됨 | Block/Approve QA — readability·spacing·timing·accessibility·implementation contract |

## 3. 편집 계획

| # | 작업 | 근거 |
|---|---|---|
| 1 | `Core Workflow` 10단계 + `Decision Tree` 5분기 → **7단계 하나**. 분기는 1단계 안의 분류 표로 흡수 | M-02·M-03, 계획서 403행 |
| 2 | M-05 Resource Routing의 링크 11개를 **전부 실재 검증** | 계획서 406행 |
| 3 | M-01·M-04·M-06은 그대로 | `KEEP` |

**범위 밖으로 남기는 것**: `validate_spritesheet_manifest.py`의 fixture가 저장소 어디서도
실행되지 않는다(`skill-inventory.md:147~150`이 별건으로 기록). Phase 5에서 고치지 않는다.

**K-1 보상 통제**: 자체 테스트에 **네 스킬 YAML 파싱 수동 확인**을 포함한다. Phase 1의 구조
검사가 그 층을 보지 않으므로 사람이 대신 본다.

전망: 90 → 약 82줄.

## 4. As-built

**90 → 90줄.** 줄 수는 그대로다. **이 Phase의 성과는 축약이 아니라 통합이다** — 두 절이 같은
작업을 다르게 설명하던 것을 하나로 모았고, 분기의 정의 항목은 하나도 지우지 않았다.

### 4.1 M-02 · M-03 통합

`## Core Workflow` 10단계 + `## Decision Tree` 5분기 → **`## Core Workflow` 7단계 하나.**

분기 3개(입력/제어감, UI 모션, 히트·보상·전환 피드백)는 **1단계 안의 분류 표**로 흡수했다 —
"이 분류가 무엇을 정의해야 하는지를 결정하고, 여기서 틀리면 나머지 흐름이 잘못된 spec을
만든다"는 문장과 함께. 나머지 두 분기(생성 프레임 필요 / 최종 리뷰 준비)는 원래 순서상 4단계와
7단계이므로 그 자리에 흡수했다.

이전에는 독자가 두 절을 대조해야 했다. 이제 한 번 읽는다.

### 4.2 M-05 링크 검증

Resource Routing이 가리키는 **12개 경로 전부 실재 확인** — reference 5, template 6, script 1.
누락 0건.

### 4.3 범위 밖으로 남긴 것

`validate_spritesheet_manifest.py`의 fixture가 저장소 어디서도 실행되지 않는다
(`skill-inventory.md:147~150`). Phase 5에서 고치지 않았다 — 다이어트와 무관한 별건이다.

### 4.4 계획 밖 변경

없음. `skills/game-feel-motion-skill/SKILL.md` 1파일만 수정했다.
`agents/openai.yaml`은 이미 SKILL과 같은 범위를 말하고 있어 손대지 않았다.

## 5. 증거

### 5.1 분기 정의 항목 보존 — 전수

| 항목 | |
|---|---|
| action abstraction / response window / buffering / cancellation | 보존 ✓ |
| reduced-motion fallback / visual hierarchy | 보존 ✓ |
| screen/camera impact / timing stack | 보존 ✓ |
| non-overlap (fixed cell·pivot·baseline·gap·margin) | 보존 ✓ |
| Block 조건 (readability, spacing, timing, accessibility, implementation contract) | 보존 ✓ |
| 이벤트 열거 `cooldown` · `menu action` · `state change` | **1차에 소실 → M-1로 분류 표에 복원 ✓** |

**측정 정정**: 마지막 항목이 1차 검사에서 `소실`로 나왔는데, **줄바꿈에 걸린 내 grep의
오탐**이었다(55행에 그대로 있다). 줄바꿈을 없애고 재검사해 확인했다. 같은 계열의 측정 오류가
이 세션에서 반복됐으므로 기록해 둔다 — **검사가 RED를 내면 대상보다 검사를 먼저 의심할 것.**

### 5.2 M-05 링크 12/12 실재

```
references/  final-pipeline · sequential-motion-assets · asset-generation-prompts ·
             motion-values-and-tokens · review-standards
assets/templates/  asset-brief · sequential-asset-brief · motion-qa-checklist ·
             spritesheet-manifest.schema.json · vfx-manifest.schema.json · motion-tokens.template.ts
scripts/     validate_spritesheet_manifest.py
```

### 5.3 게이트 + K-1 보상 통제

```
check_skill_gate_controls (27종)   exit=0
check_skill_drift --skip-user      exit=0
check_skill_commands               exit=0   motion=0 (정상 — inventory가 명시)
check_doc_constants                exit=0
quick_validate.py                  Skill is valid!
네 스킬 YAML 파싱                   4/4 OK      ← K-1 보상 통제
git diff --check                   exit=0
```

### 5.4 누적 회귀

Phase 1(10)·2(4)·3(4)·4(4) 승인물 — 불일치 **0건**.
corpus 8사례 양방향 — **8/8**.

## 6. 규칙 추적표 (M-01~M-06)

| ID | 분류 | 변경 후 위치 |
|---|---|---|
| M-01 `KEEP` | Overview (파이프라인 도식 + 비범위 선언) | 그대로 |
| M-02 `KEEP` | Core Workflow | **M-03과 통합해 7단계 하나로** |
| M-03 `KEEP` | Decision Tree | **M-02에 흡수** — 분기 3개는 1단계 분류 표, 2개는 4·7단계로 |
| M-04 `KEEP` | Required Outputs | 그대로 |
| M-05 `KEEP` | Resource Routing | 그대로 + 링크 12개 실재 검증 |
| M-06 `KEEP` | Non-Negotiables | 그대로 |

## 7. Phase 6 인계 — 계획을 수정하지 않는다

독립 검토 판정(Phase 5 1회차): **계획 수정안을 초안하지 말 것.** 후속 계획으로 넘긴다.

**계획 수정의 실제 비용.** `approved-plan.json`은 Phase 1 manifest가 고정한 파일이다. 계획 본문을
고치면 정규화 hash가 바뀌고 → 승인서를 재발급해야 하고 → Phase 1 PASS가 무효화되고 → Phase 2~5
manifest가 각각 직전을 담고 있으므로 **다섯 Phase가 연쇄로 열린다.**

**그 값으로 사는 것이 없다.** K-1·P1-4·P2-8·P2-9는 네 스킬의 결함이 아니라 **이 계획을 강제한
도구의 결함**이다. 계획의 목적(계획서 12~16행)은 달성됐고 도구 개선은 다른 작업이다.

그리고 형식이 나쁘다. **마지막 Phase에서 계획을 고쳐 그 Phase가 하려는 일을 허용하는 것은,
의도가 선해도 "작업에 맞춰 기준을 움직이는 것"과 같은 모양이다.** 이 계획이 존재하는 이유가
그것을 막는 것이다.

### 인계 항목 4건 — 유예가 아니라 구속력 있는 이관

| ID | 내용 |
|---|---|
| K-1 | `check_structure`가 frontmatter를 실제 YAML로 파싱하지 않는다. 양성 대조 `unparseable-frontmatter` 추가 필요 |
| P1-4 | `check_skill_gate_controls.mjs`(대조군 27종)가 어떤 자동 체인에도 배선되지 않았다 |
| P2-8 | `check_skill_commands`의 required 추출이 스크립트 에러 문구에 의존한다(`make-game.mjs`는 `[]`) |
| P2-9 | 계획 체크박스 정규화가 전역 치환이라 산문 안의 `[x]`까지 바꾼다 |

**Phase 6 전에 `dev_game/dev-plan/implement_<신규타임스탬프>.md`를 실제로 만든다.** 자체 baseline
HEAD, 대상 4건, 그리고 이 계획과 같은 절차(PLANNED → 증거 → 독립 PASS)를 갖춘다. 독립 reviewer가
그 문서의 raw hash를 Phase 6 PASS 시점에 고정한다.

**보상 통제**: 후속 계획이 닫힐 때까지 Phase 6 자체 테스트가 네 스킬 YAML 파싱을 수동 확인한다.

## 8. 독립 reviewer·미해결 finding·최종 판정

(ADVERSARIAL_REVIEW에서 reviewer가 작성 — **이 줄은 구현자가 채우지 않는다**)

- 판정: `PASS` — reviewer: independent-adversarial-reviewer, phase-5 round 1, 2026-08-16
