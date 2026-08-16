# Phase 4 — `game-asset-creation` 다이어트

- task ID: `implement_20260816_141036/phase-4`
- 작업 유형: `skill-maintenance`
- 상태: `PLANNED`

## 1. 작업 전 계약

| 항목 | 값 |
|---|---|
| baseline HEAD | `870d3d0e4b809313e980cfeb4c6f420ca83b904b` |
| 대상 skill baseline SHA | `c6289a18d04706b3f5a5621d76d18a964c65be3d` |
| preplan patch | **없음** — 이 스킬은 계획 전 변경이 없다 |
| Phase 3 승인 manifest (사슬 대상) | `0cc0f4a39e87020571ec5331e78854a456bbb682a130ca6c79c78605d208a6b8` |
| 현재 줄 수 | 95 |
| 참고 예산 | 80~100 — **네 스킬 중 유일하게 이미 예산 안** |

허용 경로: `skills/game-asset-creation/**`, Phase 4 보고서·manifest, Phase 4 체크박스.
금지: 다른 세 스킬, 계약, 계획 본문, `scripts/**`, pipeline.

target contract: `skill-inventory.md` **A-01 ~ A-08**.
회귀 corpus: 8사례 양방향 전수 — 특히 `new-sprite-sheet`와 `approved-frame-spacing`.

## 2. 이 Phase의 핵심 — A-04 ↔ A-02 모순

**줄 수를 줄이는 Phase가 아니다.** 이미 예산 안이고, 고칠 것은 스킬이 자기 범위를 두 군데서
다르게 말하는 것이다.

| 위치 | 말하는 것 |
|---|---|
| frontmatter | `Scope is pixel-preserving repositioning of already-approved frames` |
| 적용 범위 23~24행 | "캐릭터 스프라이트 **제작**", "동작별 시트 **생성**" |
| 비목표 | "포즈 재해석 또는 동작 추가", "프레임 수 변경", "1개의 프레임을 새 캐릭터처럼 다시 생성" 금지 |

**셋 다 사실이다. 두 모드가 있는데 frontmatter가 하나만 말하고, 비목표가 그 하나의 불변식을
스킬 전체의 금지처럼 적었다.** 그래서 "격투 캐릭터 시트 새로 만들어줘"라는 요청에 이 스킬이
자기 본질을 부정하게 된다.

계획서 119행이 해소 방향을 이미 정했다 — **본질은 생성·편집·검수이고, 픽셀 보존 교정은 그
하위 저자유도 모드다.**

corpus 회귀:

| 사례 | 기대 |
|---|---|
| `new-sprite-sheet` "격투 캐릭터 idle/punch/kick 시트 새로 만들어줘" | asset 수용 — **생성 모드가 살아 있어야 한다** |
| `approved-frame-spacing` "승인된 5개 프레임 중 1~3번을 4~5번 간격으로. 그림은 건드리지 말고" | asset 수용 — **교정 모드의 불변식이 살아 있어야 한다** |

## 3. 편집 계획

| # | 작업 | 근거 |
|---|---|---|
| 1 | frontmatter가 **두 모드를 다 말하게** 한다. 생성·편집·검수가 본질, 픽셀 보존 교정은 하위 모드이며 그 모드의 불변식(픽셀·순서·기준선·프레임 수 불변)을 명시 | A-02·A-04, 계획서 119행 |
| 2 | `## 비목표`를 **교정 모드 한정**으로 범위 지정. 생성 모드에서는 새 포즈·새 프레임이 정상 작업이다 | A-04 |
| 3 | frontmatter의 5프레임 구체 사례를 `references/spacing-algorithm.md`로 보낸다 | A-08 (`MOVE`) |
| 4 | `agents/openai.yaml`을 같은 범위로 동기화 | 계획서 380행 |

**A-08 목적지 소유 확인(사고 전에 검증).**

```
references/spacing-algorithm.md:3   "프레임 중심 간격을 등차수열로 맞추고 기준선을 고정하는 계산 절차"
                              :27   "4번과 5번 에셋의 중심 간격을 기준값으로 사용한다"
                              :60   "재배치 후 중심 간격이 다음을 만족해야 한다"
```

목적지가 5프레임 사례를 **실제로 소유한다.** `MOVE` 유효. (F-13·F-14는 목적지가 소유하지 않아
`KEEP`으로 되돌렸던 것과 대조된다.)

`KEEP`은 지우지 않는다 — A-01(목적)·A-03(입력 가정)·A-05(핵심 원칙, 보존 불변식)·A-06(Resource
Routing)·A-07(최종 보고 형식).

전망: 95 → 약 93줄. **이 Phase는 줄 수가 목표가 아니다.**

## 4. As-built

**95 → 99줄.** 이 Phase는 줄 수를 줄이는 것이 목표가 아니었다 — 모순 해소에 표 하나가 들었다.

### 4.1 A-04 ↔ A-02 모순 해소

**두 모드를 명시적으로 갈랐다.** frontmatter가 둘 다 말하고, 본문에 자유도 표를 넣고,
`## 비목표`의 적용 범위를 교정 모드로 한정했다.

```markdown
| 모드 | 언제 | 자유도 |
| **생성·편집** | 시트가 아직 없거나 다시 그려야 할 때 | 새 포즈·새 프레임·새 동작이 정상 작업 |
| **픽셀 보존 교정** | 프레임이 승인됐고 간격·기준선·피벗·셀 크기만 어긋났을 때 | 픽셀·포즈·프레임 수·스케일·순서 불변 |
```

`## 비목표` 머리말:

> 아래는 **교정 모드의 불변식**이다. 생성·편집 모드에서는 새 포즈·새 프레임·프레임 수 변경이
> 정상 작업이므로 이 목록을 적용하지 않는다. 두 모드를 섞으면 "간격만 고쳐 달라"는 요청에
> 캐릭터가 다시 그려진다 — 그것이 이 목록이 막는 것이다.

### 4.2 A-08 `MOVE`

frontmatter와 목적 절의 5프레임 구체 사례(6줄)를 `references/spacing-algorithm.md` 링크로 대체.
목적지 소유를 **편집 전에** 확인했다(`:3`, `:27`, `:60`).

### 4.3 계획에 없던 발견 — 내 검사기가 못 보는 층

두 모드 문안의 첫 판이 `Has a second, low-freedom mode: correcting …`이었다.
**description 안의 콜론이 YAML 매핑으로 파싱돼 frontmatter가 깨졌다.**

```
quick_validate  →  Invalid YAML in frontmatter: mapping values are not allowed here
                   line 2, column 379
check_skill_drift.sh --skip-user  →  exit 0   ← 못 잡았다
```

**내 구조 검사(Phase 1 산출물)는 frontmatter를 정규식으로 본다.** fence·name·description 존재는
확인하지만 **YAML로 파싱되는지는 보지 않는다.** 깨진 frontmatter를 통과시킨다.

콜론을 em-dash로 바꿔 고쳤고, 네 스킬 전부 YAML 파싱을 확인했다(4/4 OK). 검사기 자체의 구멍은
`scripts/check_skill_*`에 있으므로 **Phase 4가 고칠 수 없다** — 고치면 Phase 1의 PASS가 무효가
된다. 미해결로 기록한다(§7.1 K-1).

### 4.4 `agents/openai.yaml`

두 모드와 "어느 모드인지 먼저 밝히라"를 반영. motion 라우팅 유지.

### 4.5 계획 밖 변경

없음. `skills/game-asset-creation/**` 2파일만 수정했다.

## 5. 증거

### 5.1 corpus 8사례 — 양방향 전수

| 사례 | 수용 | 배제 |
|---|---|---|
| `new-sprite-sheet` | asset ✓ `generating a new character sprite sheet or per-action frames` **(생성 모드 보존)** | polish ✓ |
| `approved-frame-spacing` | asset ✓ `already-approved frames, where pixels, pose, frame count, scale, and order must not change` **(교정 모드 불변식)** | motion ✓ |
| 나머지 6사례 | ✓ | ✓ (composite는 금지 스킬 없음) |

**8/8, 미충족 0건.** 두 모드가 각각 자기 corpus 사례로 회귀 고정됐다.

### 5.2 게이트

```
check_skill_gate_controls (27종)   exit=0
check_skill_drift --skip-user      exit=0
check_skill_commands               exit=0   asset=0 (정상 — inventory가 명시)
check_doc_constants                exit=0
quick_validate.py                  Skill is valid!
네 스킬 YAML 파싱                   4/4 OK
git diff --check                   exit=0
```

### 5.3 누적 회귀

Phase 1 승인물 10개 / Phase 2 4개 / Phase 3 4개 — 불일치 **0건**.
네 스킬 657 → **661줄** (asset +4).

## 6. 규칙 추적표 (A-01~A-08)

| ID | 분류 | 변경 후 위치 |
|---|---|---|
| A-01 `KEEP` | 목적 | 그대로 + 두 모드 표 신설 |
| A-02 `KEEP` | 적용 범위 (제작·생성) | **그대로 — 생성 모드가 본질임을 frontmatter가 이제 말한다** |
| A-03 `KEEP` | 입력 가정 | 그대로 |
| A-04 `KEEP` | 비목표 | 그대로 + 적용 범위를 교정 모드로 한정. **단 '배경·텍스트·UI 추가'는 두 모드 모두 적용**(L-1) |
| A-05~A-07 `KEEP` | 핵심 원칙 / Resource Routing / 최종 보고 형식 | 그대로 |
| A-08 `MOVE` | 5프레임 구체 사례 | `references/spacing-algorithm.md`로 (목적지 소유 확인) |

## 7. 독립 reviewer·미해결 finding·최종 판정

### 7.1 미해결 — K-1: 구조 검사가 YAML 파싱을 보지 않는다

`scripts/check_skill_drift.sh`의 구조 검사(Phase 1 산출물)가 **깨진 frontmatter를 통과시킨다.**

```
Has a second, low-freedom mode: correcting …    ← 콜론이 YAML 매핑으로 파싱됨
quick_validate                     Invalid YAML in frontmatter
check_skill_drift.sh --skip-user   exit 0        ← 못 잡음
```

원인: 구조 검사가 fence·name·description을 **정규식**으로 확인하고, 그 결과가 YAML로 파싱되는지는
보지 않는다. `broken-frontmatter` fixture는 fence 부재만 시험하므로 이 형태를 잡지 못한다.

**Phase 4가 고칠 수 없다.** `scripts/check_skill_*`는 Phase 1 소유이고, 고치면 Phase 1의 승인
manifest가 깨져 그 PASS가 무효가 된다. 계획 수정이 필요하다 — P1-4(gate controls 미배선)와 같은
성격이므로 함께 처리하는 것이 맞다고 본다.

**독립 reviewer 판정(4회차): 지금 고치지 않는다. Phase 6 계획 수정에서 P1-4와 함께 처리한다.**
유예가 아니라 **확정된 후속 작업**이다. 지금 고치면 Phase 1 manifest가 깨지고, 사슬 구조상
Phase 2·3·4가 연쇄로 무효화된다(각 Phase가 직전 manifest를 담는다). 현재 실 노출은 0이다.

**보상 통제**: Phase 5 자체 테스트에 네 스킬 YAML 파싱 수동 확인을 포함한다. 게이트가 못 보는
층을 사람이 대신 본다.

**Phase 6 계획 수정에 들어가야 할 것**: K-1(`check_structure`가 실제 YAML로 파싱 + 양성 대조
`unparseable-frontmatter` 추가), P1-4(대조군 자동 체인 배선), P2-8·P2-9 유예 확정 또는 처리.
계획 수정은 `approved-plan.json` 재발급을 수반하며, 그 시점에 Phase 1~5 manifest 사슬 전체를
재검증해야 한다.

### 7.2 관찰

이 Phase는 **네 스킬 중 유일하게 줄 수가 늘었다**(95 → 99). 모순 해소에 자유도 표가 필요했기
때문이다. 예산 80~100 안이므로 문제가 아니고, 오히려 "다이어트 = 줄이기"가 아니라는 것을
보여주는 사례다 — 스킬이 자기 범위를 두 군데서 다르게 말하던 것을 한 군데로 모은 것이 성과다.

(ADVERSARIAL_REVIEW에서 reviewer가 작성 — **이 줄은 구현자가 채우지 않는다**)

- 판정: `PASS` — reviewer: independent-adversarial-reviewer, phase-4 round 1, 2026-08-16
