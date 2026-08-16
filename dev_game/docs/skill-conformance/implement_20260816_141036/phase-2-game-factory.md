# Phase 2 — `game-factory` 다이어트

- task ID: `implement_20260816_141036/phase-2`
- 작업 유형: `skill-maintenance`
- 상태: `PLANNED` — **SKILL.md 본문은 아직 한 글자도 편집하지 않았다**

계획서 288행과 독립 검토 P2-10에 따라, 이 보고서는 **사전 patch 심판만** 담는다. 승인 전에
본문을 편집하면 그 자체가 BLOCKED 사유다(2회차 검토에서 Phase 1이 같은 순서를 압축했고,
재발 시 BLOCKED로 못박혔다).

## 1. 작업 전 계약

### 1.1 기준선

| 항목 | 값 |
|---|---|
| baseline HEAD | `870d3d0e4b809313e980cfeb4c6f420ca83b904b` |
| 대상 skill baseline SHA (HEAD tree) | `cc37ba23c2f882a9fad118380fbaa4924848858a` |
| `skills/game-factory/SKILL.md` preplan patch SHA-256 | `1809bea2043a931e825b2e4a75d68060666a5c0edce7cdec3d1c31a0a0ea2f8f` |
| Phase 1 승인 manifest (사슬 링크 대상) | `746178e3b8c94a07a2d94492937049a6c481c9c78547d975912cd0c83702edc4` |
| 현재 줄 수 | 317 |
| 참고 예산 | 140~180 |

### 1.2 주 스킬·허용/금지 경로

주 스킬: `game-factory`. 보조 스킬 없음.

허용 (계획서 194행):

- `skills/game-factory/**`
- `dev_game/docs/skill-conformance/implement_20260816_141036/phase-2-*`
- 이 계획의 Phase 2 체크박스만

금지: 다른 세 스킬, 계약 문서, 계획 본문, `scripts/**`, pipeline.

**Phase 1 승인물은 건드릴 수 없다.** `check_skill_conformance.mjs`가 manifest 10개 파일의 hash
불변을 검사하며, 깨지면 Phase 1의 PASS가 무효가 되고 Phase 1부터 재검토한다.

### 1.3 target contract

`skill-inventory.md`의 **F-01 ~ F-30**이 이 Phase의 계약이다. `KEEP` 규범이 사라지면 BLOCKED다.
`MOVE`는 목적지가 그 내용을 **이미 소유할 때만** 유효하다(3회차 정정 — F-13·F-14는 목적지가
소유하지 않아 `KEEP`으로 되돌렸다).

회귀 corpus: `routing-corpus.json`의 `new-game`, `acceptance-defect-before-first-pass`,
`defect-after-first-pass`, `expansion-on-existing-game`.

### 1.4 완료 조건

- F-01~F-30 계약 준수, `KEEP` 규범 소실 0건
- F-30 해소 — 기존 게임 확장이 factory 책임임이 frontmatter에서 읽혀야 한다
- `check_skill_commands` command inventory 5개(factory 소유) 전부 충족
- `check_skill_drift --skip-user` 구조 검사 통과 (`agents/openai.yaml` 포함)
- routing corpus 4사례 통과
- Phase 1 승인 hash 10개 불변
- Phase 2 manifest가 Phase 1 보고서·manifest를 **정본 경로로** 담고 자기 자신은 담지 않음
- 독립 reviewer `PASS` — **판정 줄은 구현자가 채우지 않는다**

## 2. `UNTRUSTED_PREPLAN` patch 심판 (승인 요청)

`git diff -- skills/game-factory/SKILL.md`는 hunk 3개다. 규칙 ID별로 판정한다.

### H1 — `defect classes A–N` → `defect classes` (59~62행)

**판정: 채택**

실측 근거: 계약의 결함 클래스는 현재 **A–O 15개**다.

```
$ grep -oE '^### [A-Z]\b' dev_game/docs/post-production-qa-contract.md
A B C D E F G H I J K L M N O
```

`A–N`은 stale이었다. 열거를 지우면 SKILL이 계약의 클래스 수를 추적할 의무에서 벗어난다.
inventory F-04(Authoritative contracts = `KEEP`)와 충돌하지 않는다 — 남는 것은 "어느 계약이
무엇을 소유하는가"이고, 클래스 목록은 계약이 소유한다.

이 stale이 어떻게 생겼는지는 기록해 둘 가치가 있다. 클래스 O는 커밋 `0053f78`에서 계약에
추가됐고, 같은 문장을 복사해 둔 두 SKILL.md는 갱신되지 않았다. **동기화해야 하는 목록은
언젠가 동기화되지 않는다** — H3가 남기려는 문장이 바로 그 얘기다.

### H2 — 게이트 명령 6줄 → 2줄 (230~241행)

**판정: 부분 채택** — 명령 대체는 채택, **삭제된 안내 문장 1줄은 복원한다.**

채택 근거(실측): `production-gate`는 아래를 **실제로 전부 실행**한다.

```
$ grep -oE "[a-z-]+\.mjs" dev_game/generator/scripts/production-gate.mjs | sort -u
custom-loop-full-qa.mjs   dist-runtime-qa.mjs   image-quality-qa.mjs
production-demo-qa.mjs    scene-composite-qa.mjs   visual-layout-qa.mjs
+ factory:qa (:160)
```

따라서 6줄을 2줄로 줄여도 **게이트 커버리지 손실이 없다.** inventory F-03(개별 게이트는 계약
§4가 소유)·F-16(게이트 명령 2줄 = command inventory `factory-gate-v1`/`factory-gate-v2`)과
같은 방향이다.

**삭제된 문장에 손실이 있다고 판단했으나, 그 판단은 틀렸다. 번복한다.**

원문 마지막 줄은 이랬다.

> Run `factory:hq-screen-quality-qa` separately when asset-fidelity or market-event coverage is
> in scope; DPR/backing-store coverage comes from `factory:captured-state-qa`.

내가 `production-gate.mjs`만 grep해 두 게이트가 0건이므로 "체인 밖"이라고 결론 냈다.
**위임을 따라가지 않았다.** 독립 검토가 잡았고, 재확인했다.

```
production-gate.mjs:221        run(customLoopFullQa, …)         ← v2/custom-loop에서 위임
custom-loop-full-qa.mjs:36     run(captured-state-qa.mjs)       ← 체인 안
custom-loop-full-qa.mjs:49     run(hq-screen-quality-qa.mjs)    ← 체인 안
```

이 계획이 다루는 production-demo 게임은 schema v2 custom-loop이므로 **그 경로에서 두 게이트는
자동 실행된다.** "체인 밖"은 v1에서만 참이다.

게다가 그 정보를 소유하는 표가 이미 있고(`post-production-qa-contract.md` §3.1), SKILL은
**이미 그 표로 가는 링크를 갖고 있으며**(`SKILL.md:62` — patch가 건드리지 않는다), 계약 §L이
삭제된 문장보다 정확하게 설명한다.

따라서 그 문장을 복원하면 F-17이 경고한 "네 개의 사본"에 **다섯 번째를 더하는 것**이고, 같은
Phase에서 H3(중복 제거 안내)를 채택하면서 그 안내가 금지하는 일을 하는 자기모순이 된다.

→ **H2 전면 채택. 복원 없음.**

이 오류는 F-13·F-14와 같은 계열이되 **방향이 반대다.** 그때는 목적지가 소유한다고 잘못
단정했고, 이번엔 아무도 소유하지 않는다고 잘못 단정했다. 교훈은 하나다 —
**`MOVE`든 `DELETE`든 목적지 후보를 전부 확인하고, 위임하는 스크립트는 위임 끝까지 따라간다.**

### H3 — 중복 제거 안내 문단 신설 (241행)

**판정: 채택**

inventory F-17이 이 문단을 `KEEP`으로 지정했다. 근거: 이 문장이 없으면 다섯 번째 사본이
생긴다. 실제로 Phase 1의 pipeline patch 채택 판단(§5)이 이 문장에 기대어 이루어졌다.

계획서 137행의 `DELETE` 기준("날짜별 일화")에 걸리는 것처럼 보이지만, `skill-inventory.md`가
그 기준을 **"행동을 바꾸지 않는 일화"**로 좁혔다. 이 문장은 다음 독자의 선택을 바꾼다.

### 심판 요약

| hunk | 판정 | 근거 |
|---|---|---|
| H1 | 채택 | 계약이 A–O로 자랐음을 실측(15개). 열거 제거가 정확 |
| H2 | **전면 채택** | 커버리지 손실 없음. 두 게이트는 v2 체인 안(위임 경로 실측), 계약 §3.1이 소유, SKILL이 이미 링크 |
| H3 | 채택 | inventory F-17이 `KEEP`으로 지정 |

## 3. 승인 후 편집 계획 (아직 실행하지 않음)

승인을 받으면 아래를 수행한다. **지금은 한 줄도 편집하지 않았다.**

독립 검토가 정정 3건(G-1·G-2·G-3)을 냈고 전부 반영했다.

| # | 작업 | inventory 근거 |
|---|---|---|
| 1 | H1·H2·H3 **전면 채택** (복원 없음) | §2, G-1 |
| 2 | 87행 `--gate none\|demo\|full` → `none\|artifact-contract-only\|full` **+ "artifact-contract-only는 완료 게이트가 아니다" 한 마디** | F-06, G-4 (`make-game.mjs:11`) |
| 3 | 316행 schema v2 완료 명령 삭제 | F-27 (같은 명령의 세 번째 사본) |
| 4 | 309~315·317행을 계약 링크로 축약 | F-26 (`LINK`) |
| 5 | Key paths의 게이트 스크립트 9행을 계약 링크로 | F-03 (`LINK`) |
| 6 | 3.5절 측정 서사 `MOVE` + **판단 규칙 1문장 `KEEP`** | F-12, G-2 |
| 7 | 후보정·캡처 설명 3문단을 계약 링크로 | F-19 (`LINK`) |
| 8 | class O 문단을 §0.1 링크로 | F-23 (`LINK`) |
| 9 | frontmatter에 생명주기 경계 명시 — **F-30 해소** | F-28·F-29·F-30 (신규 `KEEP`) |
| 10 | `agents/openai.yaml`을 SKILL과 같은 범위로 동기화 | 계획서 326행 |
| 11 | **Fast path 설명 문단(90·92행)을 `ai-art-pipeline.md#호스트-어댑터` 링크로 축약** | F-07 (`LINK`), G-3 — 계획에서 빠져 있던 것 |

**G-2 정정 상세.** F-12의 `MOVE` 대상 12줄 중 마지막 판단 규칙은 목적지가 소유하지 않는다.

```
$ grep -ci "bug fix|버그 수정" dev_game/docs/production-demo-quality-contract.md  → 0
```

측정치(byte-identical·사다리·다른 작성자 비교)는 §2.0.26이 더 완전하게 갖고 있으므로 `MOVE`가
맞다. 그러나 **"버그 수정 이식은 옳고, 겉모습을 정하는 파일 복사는 아니다"**는 증거에서 나온
행동 규칙이고 계약은 증거만 갖고 있다. 그 한 문장은 `KEEP`이다. 12줄 → 3줄.

**G-5 후속 항목 (Phase 3 소유, 지금 편집 금지).** `game-polish` frontmatter의 음성 경계가
`Do not use for creating a new game`뿐이라 **"기존 게임의 새 기능"이 빠져 있다.** factory 쪽만
고치면 비대칭이 남는다. Phase 3 PLANNED에서 반드시 다룰 것.

**F-30이 이 Phase의 핵심 결함이다.** 현재 frontmatter는
`Do not use on a game that already exists under dev_game/generated — route repair work to
game-polish`라고만 해서, **기존 게임의 기능 확장이 factory 책임인데 음성 경계처럼 읽힌다.**
`routing-corpus.json`의 `expansion-on-existing-game`이 이 모순의 회귀 시험이다.

`KEEP`으로 지정된 것은 지우지 않는다. F-13(Foundation 사용법 26줄)·F-14(장르별 예시 6줄)는
목적지가 그 내용을 소유하지 않아 `KEEP`이므로 **남긴다.** 그 결과 예산 140~180에 도달하지
못할 것으로 본다(전망 약 285줄). 계획서 81행에 따라 줄 수는 완료 판정에 쓰지 않으며, 미달
사유를 As-built에 기록하고 진행한다.

## 4. As-built

**317 → 303줄.** `skills/game-factory/agents/openai.yaml` 1건 동기화.

### 4.1 F-30 해소 — frontmatter 생명주기 경계

이 Phase의 핵심 결함이었다. 기존 문장은 `Do not use on a game that already exists under
dev_game/generated — route repair work to game-polish.`였고, **기존 게임의 기능 확장이 factory
책임인데 음성 경계처럼 읽혔다.** 교체:

```
Also use to add a new feature or mode to a game that already exists under dev_game/generated
(expansion work), and to close acceptance defects found before that game's first
production-demo PASS. Do not use to repair a game that has already passed — route that to
game-polish.
```

F-28(첫 PASS 전 acceptance는 factory)·F-29(첫 PASS 후는 polish)·F-30(기존 게임 확장은 factory)을
한 문장으로 담는다.

### 4.2 나머지 편집

| # | 작업 | 결과 |
|---|---|---|
| 1 | preplan patch H1·H2·H3 전면 채택 | 복원 없음 (G-1) |
| 2 | `--gate none\|demo\|full` → `none\|artifact-contract-only\|full` + "완료 게이트가 아니다" 3줄 | F-06 + G-4 |
| 3·4 | Schema v2 절 9줄 → 3줄, 완료 명령 세 번째 사본 삭제 | F-26·F-27 |
| 5 | Key paths 게이트 스크립트 7행 → §3.1 링크 2행 | F-03 |
| 6 | 3.5절 측정 서사 10줄 → 판단 규칙 3줄 | F-12 + G-2 |
| 7 | 후보정·캡처 3문단 → 1문단 | F-19 |
| 8 | class O 문단 → §0.1 링크 1문장 | F-23 |
| 10 | `agents/openai.yaml` 게이트 목록 제거 (다섯 번째 사본이었다) | 계획서 326행 |
| 11 | Fast path 아트 설명 문단 압축 | F-07 (G-3) |

`KEEP` 규범은 하나도 지우지 않았다. 특히 F-13(Foundation 사용법 26줄)·F-14(장르별 예시 6줄)는
목적지가 그 내용을 소유하지 않으므로 그대로 남겼고, F-17(중복 제거 안내)·F-22(게이트 없는
4항목)는 행동을 바꾸는 일화이므로 남겼다.

### 4.3 예산 미달 — 사전 신고한 대로

| | |
|---|---|
| 결과 | **303줄** (참고 예산 140~180) |
| 사유 | `KEEP` 보존. F-13·F-14만 32줄이고, F-08~F-10·F-16·F-18·F-20~F-22·F-24·F-25가 전부 `KEEP`이다 |
| 잘랐다면 사라졌을 것 | Foundation 생성기 사용법(목적지 미소유), 장르별 시스템 예시(목적지 미소유), 게이트 없는 4항목 경고, 기획문서 01~05 코드블록(**산문으로 바꾸면 준수율이 떨어진다는 실측이 있다** — 코드블록 01~05는 19/19, 산문 06~07은 18/19) |

계획서 39행(줄 수 목표를 위한 필수 안전 규칙 삭제 금지)과 81행(줄 수는 완료 판정에 쓰지 않는다)에
따라 사유 기록 후 진행한다.

### 4.4 계획 밖 변경

없음. `skills/game-factory/**` 2파일만 수정했다.

## 5. 증거 — 음성·양성 대조, 누적 회귀, 로그

### 5.1 routing corpus — F-30 회귀 시험

**정정.** 처음에 "4사례 전부 통과"라고 적었으나, **검증 방법이 사례마다 달랐다.** 세 사례는
기대 스킬의 수용만 확인했고 `forbiddenPrimarySkills` 배제는 한 사례에서만 봤다. 양방향으로
다시 재니 한 건이 **미충족**이다.

| 사례 | 기대 스킬 수용 | 금지 스킬 배제 |
|---|---|---|
| `new-game` | factory ✓ `create a new game` | polish ✓ `Do not use for creating a new game` |
| `expansion-on-existing-game` | factory ✓ `add a new feature or mode to a game that already exists` **(F-30 해소)** | polish △ 양성 트리거가 없어 사실상 배제되나 명시적이지 않음 |
| `defect-after-first-pass` | polish ✓ | factory ✓ `Do not use to repair a game that has already passed` |
| `acceptance-defect-before-first-pass` | factory ✓ | **polish ✗ 미충족** |

미충족 근거(실측):

```
요청   "방금 만든 게임인데 캡처 보니까 버튼이 겹쳐 있어. 아직 게이트도 안 돌렸어"
corpus forbiddenPrimarySkills = ["game-polish"]
polish 양성: "… or reports gameplay/GUI/audio/input bugs in an already-generated game"
             → "버튼이 겹쳐 있어"가 정확히 여기 걸린다
polish 음성: "Do not use for creating a new game" — 이것뿐. 첫 PASS 전 배제가 없다
```

factory 쪽은 완결됐다. 수정 대상이 `skills/game-polish`이므로 **Phase 2는 고칠 수 없다.**
Phase 3 이월(아래 §7.1 G-5).

### 5.2 게이트

```
check_skill_gate_controls (27종)   exit=0
check_skill_drift --skip-user      exit=0   (구조 검사·트리거 배타성 포함)
check_skill_commands               exit=0   game-factory=5, 전체 7개 인자 계약 통과
check_doc_constants                exit=0
quick_validate.py skills/game-factory       Skill is valid!
```

command inventory 5개(factory 소유) 전부 충족 — `factory-make-from-idea`,
`factory-make-from-spec`, `factory-foundation-qa`, `factory-gate-v1`, `factory-gate-v2`.

### 5.3 Phase 1 승인물 불변

(§6 hash manifest 참조)

## 6. 규칙 추적표 (F-01~F-30)

| ID | 분류 | 변경 후 위치 |
|---|---|---|
| F-01 `KEEP` | Locate the project | 그대로 |
| F-02 `KEEP` | Key paths 계약 3행 | 그대로 |
| F-03 `LINK` | 게이트 스크립트 7행 | §3.1 applicability table 링크 2행으로 |
| F-04 `KEEP` | Authoritative contracts | 그대로 (H1로 `A–N` 열거만 제거) |
| F-05 `KEEP` | Non-negotiable standard | 그대로 |
| F-06 `KEEP` | Fast path | stale 플래그 정정 + `artifact-contract-only`는 완료 게이트가 아님 명시 |
| F-07 `LINK` | 아트 설명 문단 | `ai-art-pipeline.md#호스트-어댑터`로 축약 |
| F-08~F-10 `KEEP` | Idea intake / Pattern fit / 기획문서 01~05 | 그대로 (코드블록 형식 유지) |
| F-11 `KEEP` | UI 방향 선언 핵심 | 그대로 |
| F-12 `MOVE`+`KEEP` | 측정 서사 → 계약 §2.0.26 / 판단 규칙 1문장 남김 | 10줄 → 3줄 |
| F-13·F-14 `KEEP` | Foundation 사용법 / 장르 예시 | **그대로** (목적지 미소유) |
| F-15~F-18 `KEEP` | 라우팅·게이트 명령·중복 안내·browser smoke | 그대로 |
| F-19 `LINK` | 후보정·캡처 3문단 | 1문단으로 |
| F-20~F-22 `KEEP` | Evidence handling / Completion standard / 게이트 없는 4항목 | 그대로 |
| F-23 `LINK` | class O 문단 | §0.1 링크 1문장 |
| F-24·F-25 `KEEP` | Scope limits / Response format | 그대로 |
| F-26 `LINK` | Schema v2 세부 | 계약·스키마 링크로 |
| F-27 `DELETE` | 완료 명령 세 번째 사본 | 삭제 |
| F-28·F-29·F-30 `KEEP`(신규) | 생명주기 경계 | frontmatter에 신설 |

## 7. 독립 reviewer·미해결 finding·최종 판정

### 7.1 후속 항목 (Phase 3 소유, 이번에 편집 금지)

**G-5 (확장)** — `game-polish` frontmatter의 음성 경계가 `Do not use for creating a new game`
하나뿐이다. **두 개가 빠져 있다.** factory 쪽만 고치면 비대칭이 남는다.

| # | 빠진 음성 경계 | 근거 corpus 사례 |
|---|---|---|
| G-5a | 기존 게임의 **새 기능·모드 추가**는 factory (expansion) | `expansion-on-existing-game` |
| G-5b | **첫 production-demo PASS 전**의 acceptance defect는 factory | `acceptance-defect-before-first-pass` — 위 §5.1에서 **미충족 실측** |

Phase 3 PLANNED에서 **둘 다** 닫을 것. G-5b는 corpus 회귀가 실제로 실패하는 상태다.

### 7.2 내가 틀렸던 것 — 같은 뿌리의 실수 셋

| | 실수 | 뿌리 |
|---|---|---|
| G-1 | H2를 "체인 밖"이라 판정. `production-gate.mjs`만 grep하고 **위임을 안 따라갔다**(`:221` → `custom-loop-full-qa.mjs:36,49`) | 목적지를 끝까지 안 봄 |
| H-2 | F-26 링크를 `production-demo-quality-contract.md`·v2 스키마로 지목. 실측 **0/0/0**, 실제 소유처는 `post-production-qa-contract.md`(3/2/2) | 목적지를 끝까지 안 봄 |
| H-1 | corpus를 "4사례 전부 통과"로 보고. **`forbiddenPrimarySkills` 검증을 한 사례에만 적용**했다 | 검증 방법이 사례마다 달랐음 |

앞의 둘은 F-13·F-14와 같은 계열이다(그때는 목적지가 소유한다고, G-1에서는 아무도 소유하지
않는다고 잘못 단정). **`MOVE`든 `DELETE`든 링크든, 목적지 후보를 전부 확인하고 위임은 끝까지
따라간다.** 세 번째는 다른 종류다 — 같은 표의 행마다 다른 기준을 쓰면 그 표는 측정이 아니다.

(ADVERSARIAL_REVIEW에서 reviewer가 작성 — **판정 줄은 구현자가 채우지 않는다**)

- 판정: `PASS` — reviewer: independent-adversarial-reviewer, phase-2 round 1, 2026-08-16
