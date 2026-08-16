# Phase 3 — `game-polish` 다이어트

- task ID: `implement_20260816_141036/phase-3`
- 작업 유형: `skill-maintenance`
- 상태: `PLANNED` — **SKILL.md 본문은 아직 한 글자도 편집하지 않았다**

## 1. 작업 전 계약

### 1.1 기준선

| 항목 | 값 |
|---|---|
| baseline HEAD | `870d3d0e4b809313e980cfeb4c6f420ca83b904b` |
| 대상 skill baseline SHA (HEAD tree) | `2befc035543a6b8838f72f3eb5c9ff9c054578b6` |
| `skills/game-polish/SKILL.md` preplan patch SHA-256 | `cd721ea3565798f53cc8fbf8ffed7835ee399e1fa7e55b7bf4dc1b7a887ae1e7` |
| Phase 2 승인 manifest (사슬 링크 대상) | `bf3d2a3278b49b84c74b3ab3f2235b40f8a78d5aea344990487c97ad473e8bee` |
| 현재 줄 수 | 174 |
| 참고 예산 | 100~130 |

### 1.2 허용/금지 경로

허용 (계획서 195행): `skills/game-polish/**`, Phase 3 보고서·manifest, Phase 3 체크박스만.
금지: 다른 세 스킬, 계약 문서, 계획 본문, `scripts/**`, pipeline.

Phase 1(10개)·Phase 2(4개) 승인물은 불변이어야 한다.

### 1.3 target contract

`skill-inventory.md`의 **P-01 ~ P-20**. `KEEP` 규범이 사라지면 BLOCKED.
`MOVE`/`DELETE`/링크는 **목적지를 끝까지 확인한 뒤에만** — Phase 2의 G-1·H-2가 같은 뿌리였다.

회귀 corpus: `routing-corpus.json` **8사례 전부를 양방향(수용 + 배제)으로** 대조한다.
Phase 2의 H-1이 "표의 행마다 다른 기준"이었으므로 이번엔 모든 행에 같은 질문을 던진다.

### 1.4 완료 조건

- **G-5a·G-5b 둘 다 해소** (아래 §3)
- P-01~P-20 계약 준수, `KEEP` 소실 0건
- corpus 8사례 양방향 전수 통과
- command inventory 2개(polish 소유) 충족 — `polish-gate`, `polish-imagegen-targeted`
- 게이트 6종 + `quick_validate` 통과
- Phase 1·2 승인물 14개 불변
- Phase 3 manifest가 Phase 2 보고서·manifest를 **정본 경로로** 담고 자기 것은 배제
- 독립 reviewer `PASS` — 판정 줄은 구현자가 채우지 않는다

## 2. `UNTRUSTED_PREPLAN` patch 심판 (승인 요청)

hunk 4개.

### H1 — core premise 블록에 `(quoted from post-production-qa-contract.md §0 — that file is the source)` 추가

**판정: 거부. 다른 문안으로 대체 제안.**

주석이 **사실이 아니다.** 블록 5줄 중 계약이 소유하는 것은 1줄뿐이다.

```
"No game is finished in one pass"                계약 내 0건
"Every capture session finds defects"            계약 내 0건
"never downgraded to a known gap"                계약 내 1건  ← 유일
```

계약 §0의 실제 내용은 다른 세 줄이다 — `"눈으로 봤을 때 괜찮음" is not evidence.` /
`A defect found in capture is fixed and re-captured, never downgraded to a known gap.` /
`Every visible shape in a final capture must have a declared identity.`

즉 블록의 나머지는 **polish 자신의 본질 선언**이고 인용이 아니다. 주석을 그대로 두면 다음
독자가 블록 전체를 중복으로 오인해 지울 수 있다 — 스킬의 본질이 계약에 있다고 잘못 믿고서.

**대체 문안**(마지막 줄에만 붙인다):

```
(the last line is the contract's §0 rule; the rest is this skill's own premise)
```

이 심판은 Phase 2의 G-1·H-2와 **같은 검사를 사고 전에 한 결과**다. 목적지를 먼저 확인했다.

### H2 — `defect classes A–N` → `defect classes`

**판정: 채택.** 계약은 A–O 15개다(Phase 2에서 실측). factory의 H1과 동일 사안.

### H3 — 14개 클래스 표 삭제 + 포인터·드리프트 일화

**판정: 채택.** inventory P-05(`KEEP`, 사전 변경 채택 대상)·P-06(`KEEP`, 중복 표 경고 일화).
표는 계약 §1·§2가 소유하고, 남는 일화는 **행동을 바꾼다** — 실제로 클래스 O가 커밋 `0053f78`에서
계약에 추가됐을 때 이 사본은 갱신되지 않았고 아무도 몰랐다.

### H4 — 게이트 명령 5줄 → 1줄 + 계약 §4 포인터

**판정: 채택.** Phase 2의 G-1 교훈을 적용해 위임을 끝까지 확인했다.

```
production-gate.mjs:220  customRequired = mode==='custom-loop-full' || (v2 && custom-loop)
production-gate.mjs:221  → custom-loop-full-qa.mjs
custom-loop-full-qa.mjs:36,49  → captured-state-qa / hq-screen-quality-qa
```

v2 게임에서 삭제된 게이트들은 전부 체인 안이다. 커버리지 손실 없음. inventory P-14
(`polish-gate` command inventory)와 일치.

| hunk | 판정 |
|---|---|
| H1 | **거부** — 주석이 사실과 다름. 대체 문안 제안 |
| H2 | 채택 |
| H3 | 채택 |
| H4 | 채택 |

## 3. 승인 후 편집 계획 (아직 실행하지 않음)

### 3.1 G-5 — 이 Phase의 핵심 (Phase 2가 남긴 비대칭)

현재 polish frontmatter의 음성 경계는 하나뿐이다.

```
Do not use for creating a new game — that is game-factory.
```

**두 개가 빠져 있고, 하나는 corpus 회귀가 지금 실패 중이다.**

| # | 결함 | corpus 근거 | 상태 |
|---|---|---|---|
| G-5a | 기존 게임의 **새 기능·모드 추가**가 배제되지 않음 | `expansion-on-existing-game` | 예방 |
| G-5b | **첫 production-demo PASS 전** acceptance defect가 배제되지 않음 | `acceptance-defect-before-first-pass` | **실패 중** |

G-5b 실측(Phase 2 §5.1):

```
요청  "방금 만든 게임인데 버튼이 겹쳐 있어. 아직 게이트도 안 돌렸어"
polish 양성: "… reports gameplay/GUI/audio/input bugs in an already-generated game"  ← 걸린다
polish 음성: "Do not use for creating a new game" — 이것뿐
```

**핵심은 조건을 옮기는 것이다.** `이미 생성된 게임의 버그` → **`첫 production-demo PASS를 받은
게임의 버그`**. 그래야 `defect-after-first-pass`는 계속 수용하고 `acceptance-defect-before-
first-pass`는 배제한다. 제안 문안:

```
Use when the user asks for 후보정, 게임 보정, 게임 다듬기, polish the game, fix what the
video/screenshot shows, QA fix pass, post-production pass, or reports gameplay/GUI/audio/input
bugs in a game that has already passed its first production-demo gate. Do not use before that
first PASS — acceptance defects there belong to game-factory. Do not use to create a new game
or to add a new feature or mode to an existing one — that is game-factory expansion.
```

### 3.2 나머지 편집

| # | 작업 | inventory 근거 |
|---|---|---|
| 1 | H2·H3·H4 채택, **H1은 대체 문안** | §2 |
| 2 | loop 4의 클래스별 "어디를 읽나" 표 12줄 → 1줄 | P-09 (`LINK`) |
| 3 | loop 5의 state-sample 필드 나열 6줄 → 계약 링크 | P-13 (`LINK`) |
| 4 | `agents/openai.yaml`을 SKILL과 같은 범위로 동기화 (G-5 반영) | 계획서 353행 |

`KEEP`은 지우지 않는다. 특히 **P-06**(중복 표 경고 일화)과 **P-11**(§3.1 적용성 경고 — 게이트가
없는 클래스가 있다는 사실)은 행동을 바꾸는 문장이므로 남긴다.

### 3.3 예산 미달 — 사전 신고

polish는 174줄 중 `LINK`/`MOVE` 대상이 **18줄뿐**이다. 예산 100~130에 도달하려면 `KEEP`을
잘라야 하고, 그것은 계획서 39행이 금지한다. Phase 2와 같이 사유 기록 후 진행한다.

전망: 174 → 약 156줄(G-5 문안이 frontmatter를 조금 늘린다).

## 4. As-built

**174 → 169줄.** `skills/game-polish/agents/openai.yaml` 1건 동기화.

### 4.1 G-5a·G-5b 해소 — 이 Phase의 핵심

frontmatter의 생명주기 조건을 **"이미 생성된 게임"에서 "첫 production-demo PASS를 받은 게임"으로
옮겼다.** 그것이 요점이었다 — `defect-after-first-pass`를 잃지 않으면서
`acceptance-defect-before-first-pass`만 떨어뜨린다.

```
… or reports gameplay/GUI/audio/input bugs in a game that has already passed its first
production-demo gate. Do not use before that first PASS — acceptance defects there belong to
game-factory. Do not use to create a new game or to add a new feature or mode to an existing
one — that is game-factory expansion.
```

### 4.2 계획에 없던 발견 — frontmatter에 클래스 목록 사본이 또 있었다

G-5 문안을 넣자 `quick_validate`가 **description 1084자(최대 1024)**로 실패했다. 원인을 보니
frontmatter가 결함 클래스를 12개 열거하고 있었다 — **본문에서 지운 것과 같은 표의 세 번째 사본**이다.

```
frontmatter 열거   12개
계약 클래스        15개 (A–O)
```

**이미 어긋나 있었다.** P-06이 경고한 바로 그것이다 — "동기화해야 하는 목록은 언젠가 동기화되지
않는다". 열거를 `a defect class from post-production-qa-contract.md`로 대체했다(867자).

이 발견은 길이 제한이 없었으면 드러나지 않았을 것이다. 기록해 둔다.

### 4.3 나머지 편집

| # | 작업 | 근거 |
|---|---|---|
| 1 | H1 **거부** → 대체 문안 `(the last line is the contract's §0 rule; the rest is this skill's own premise)` | §2 |
| 2 | H2·H3·H4 채택 | §2 |
| 3 | P-09 표 8줄 → 3줄 (색인 링크 + **F·G 매핑 `KEEP`**) | P-09 + I-1 |
| 4 | P-13 state-sample 필드 나열 → 계약 §F "최소 필드" 링크 | P-13 |
| 5 | `agents/openai.yaml` G-5 반영 | 계획서 353행 |

**I-1 정정 반영.** P-09 표의 `F, G` 행에 있던 "these govern step 5, not the code fix"는 계약이
소유할 수 없는 skill-local 매핑이다(계약 내 `step 5` 0건 — 계약은 polish의 단계 번호를 모른다).
색인은 링크로 보내고 그 매핑 한 줄만 남겼다.

`KEEP`은 지우지 않았다. **P-06**(중복 표 경고 일화)과 **P-11**(§3.1 적용성 경고 — B·C·D·M은
게이트가 아예 없다)은 행동을 바꾸는 문장이므로 남겼다.

### 4.4 예산 미달 — 사전 신고대로

| | |
|---|---|
| 결과 | **169줄** (참고 예산 100~130) |
| 사유 | `LINK` 대상이 애초에 17줄뿐이다. 나머지는 전부 `KEEP` |
| 잘랐다면 사라졌을 것 | full sweep 6종 목록(P-04 — 없으면 sweep이 임의가 된다), 심각도 triage 4단계, 재캡처 절차, exit criteria, P-06·P-11 경고 |

### 4.5 계획 밖 변경

없음. `skills/game-polish/**` 2파일만 수정했다.

## 5. 증거 — corpus 8사례 양방향 전수, 게이트, 누적 회귀

### 5.1 corpus 8사례 — **모든 행에 같은 두 질문**

Phase 2의 H-1이 "표의 행마다 다른 기준"이었으므로, 이번엔 8행 전부에 (1) 기대 스킬이 이 상황을
양성으로 말하는가 (2) 금지 스킬이 명시 배제하는가 를 똑같이 던졌다.

| 사례 | 수용 | 배제 |
|---|---|---|
| `new-game` | factory ✓ | polish ✓ |
| `acceptance-defect-before-first-pass` | factory ✓ | polish ✓ **G-5b 닫힘** |
| `defect-after-first-pass` | polish ✓ | factory ✓ |
| `expansion-on-existing-game` | factory ✓ | polish ✓ **G-5a 닫힘** |
| `approved-frame-spacing` | asset ✓ | motion ✓ |
| `new-sprite-sheet` | asset ✓ | polish ✓ |
| `motion-timing` | motion ✓ | asset ✓ |
| `asset-plus-motion-composite` | asset ✓ | — (금지 스킬 없음) |

**8/8 통과, 미충족 0건.**

### 5.2 게이트

```
check_skill_gate_controls (27종)   exit=0
check_skill_drift --skip-user      exit=0   (트리거 배타성 포함)
check_skill_commands               exit=0   game-polish=2 유지
check_doc_constants                exit=0
quick_validate.py skills/game-polish        Skill is valid! (867자)
git diff --check                   exit=0
```

command inventory 2개(polish 소유) 충족 — `polish-gate`, `polish-imagegen-targeted`.

### 5.3 누적 회귀 — Phase 1·2 승인물

Phase 1 승인물 10개 불일치 **0건**, Phase 2 승인물 4개 불일치 **0건**.

네 스킬 662 → **657줄**.

## 6. 규칙 추적표 (P-01~P-20)

| ID | 분류 | 변경 후 위치 |
|---|---|---|
| P-01 `KEEP` | Authoritative contract | 그대로 |
| P-02 `KEEP` | Key paths | 그대로 (H2로 `A–N` 열거만 제거) |
| P-03 `KEEP` | loop 0 regression re-run | 그대로 |
| P-04 `KEEP` | full sweep 6종 목록 | 그대로 |
| P-05 `KEEP` | 계약 참조 문단 | 사전 변경 채택 (H3) |
| P-06 `KEEP` | 중복 표 경고 일화 | 그대로 — §4.2에서 이 문장이 옳았음이 다시 확인됐다 |
| P-07·P-08 `KEEP` | triage / reproduce | 그대로 |
| P-09 `LINK`+`KEEP` | 클래스별 표 8줄 → 색인 링크 + F·G 매핑 3줄 | I-1 반영 |
| P-10·P-11 `KEEP` | 교차 스킬 라우팅 / §3.1 경고 | 그대로 |
| P-12 `KEEP` | re-capture 절차 | 그대로 |
| P-13 `LINK` | state-sample 필드 나열 | 계약 §F 링크로 |
| P-14~P-19 `KEEP` | 게이트 명령·기록·exit criteria·scope·response·QA session | 그대로 (H4로 게이트 명령만 축약) |
| P-20 `KEEP`(신규) | 첫 PASS 이후만 담당 | frontmatter에 신설 (G-5b) |

## 7. 독립 reviewer·미해결 finding·최종 판정

(ADVERSARIAL_REVIEW에서 reviewer가 작성 — **이 줄은 구현자가 채우지 않는다**)

- 판정: `PASS` — reviewer: independent-adversarial-reviewer, phase-3 round 2 (reopened for N-5, re-approved), 2026-08-16
