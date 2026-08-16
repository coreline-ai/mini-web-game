# 스킬 inventory — KEEP / LINK / MOVE / DELETE

Phase 1 산출물. Phase 2~5는 이 표를 계약으로 삼는다. **여기 없는 규범을 지우면 범위 밖 변경이고,
여기서 `KEEP`인 규범이 사라지면 독립 reviewer가 BLOCKED한다.**

분류 기준(계획서 132~139행):

| 분류 | 뜻 |
|---|---|
| `KEEP` | 트리거·입력·핵심 순서·stop/route·필수 출력·완료 판정 — SKILL.md에 남는다 |
| `LINK` | 권위 문서가 소유하는 수치·결함 분류·게이트 목록 — "언제 어느 문서를 읽는지"만 남긴다 |
| `MOVE` | 반복 로직은 script로, 드문 상세는 reference/contract로 |
| `DELETE` | 날짜별 일화, 중복 명령, 장황한 근거, 일반 모델이 아는 설명 |

`DELETE`의 단서: **행동을 바꾸지 않는 일화만 지운다.** 다음 독자의 선택을 바꾸는 일화는 `KEEP`이다.
2026-08-16에 이 저장소는 "중복 표는 언젠가 어긋난다"는 문장을 일부러 남겼고, 그 문장이 없었으면
같은 표가 다시 복사됐을 것이다.

측정 기준선: `game-factory` 317 / `game-polish` 174 / `game-asset-creation` 95 /
`game-feel-motion-skill` 90 = 676줄.

---

## game-factory (317줄 → 목표 140~180)

| ID | 절 | 줄 | 분류 | 근거 |
|---|---|---:|---|---|
| F-01 | Locate the project | 10 | `KEEP` | 필요한 입력 — 저장소를 못 찾으면 아무것도 못 한다 |
| F-02 | Key paths (계약 문서 3개 행) | 6 | `KEEP` | 어느 계약을 읽을지 |
| F-03 | Key paths (게이트 스크립트 9개 행) | 16 | `LINK` | 개별 게이트는 `production-demo-quality-contract.md` §4가 소유 |
| F-04 | Authoritative contracts | 10 | `KEEP` | 계약 소유 관계 표 — 다이어트의 근간 |
| F-05 | Non-negotiable production-demo standard | 15 | `KEEP` | 완료 판정. 여기가 무너지면 스킬의 목적이 사라진다 |
| F-06 | Fast path — one command | 14 | `KEEP` | 핵심 진입 명령. **단 87행 `--gate none\|demo\|full`은 stale — `artifact-contract-only`로 정정** |
| F-07 | Fast path 설명 문단 (90·92행) | 4 | `LINK` | host adapter·장기 실행 규칙은 `ai-art-pipeline.md#호스트-어댑터`가 소유 |
| F-08 | workflow 1. Idea intake | 14 | `KEEP` | 필요한 입력 |
| F-09 | workflow 2. Pattern fit decision | 11 | `KEEP` | 핵심 순서의 분기 |
| F-10 | workflow 3. Write planning artifacts | 21 | `KEEP` | 필수 출력. **코드블록으로 선언된 01~05는 19/19 지켜졌다** — 형식을 바꾸지 말 것 |
| F-11 | workflow 3.5 UI 방향 선언 (핵심 3문단) | 12 | `KEEP` | 계약 §2.0.26의 진입 조건과 게이트 이름 |
| F-12 | workflow 3.5 측정 서사 (156~165행) | 12 | `MOVE` | 두 게임 byte-identical 측정치는 계약 §2.0.26이 소유해야 한다. SKILL에는 "왜 매번 새로 선언하는가" 한 문장만 남긴다 |
| F-13 | workflow 4. Foundation 생성기 사용법 | 26 | `KEEP` | **처음에 `MOVE`로 분류했다가 정정했다.** 목적지로 지목한 `new-game-start-guide.md`에 `--dry-run`·`--no-sfx`·`--with-pwa`·`--validate-only`가 **0건**이다(독립 검토 실측). 목적지가 소유하지 않는 내용을 `MOVE`로 적으면 Phase 2는 둘 중 하나를 한다 — 목적지를 편집해 경로 소유권을 위반하거나, 그냥 지워서 규범을 잃거나. 목적지 보강은 계획 수정이므로 별건이다 |
| F-14 | workflow 5. 장르별 시스템 예시 목록 | 6 | `KEEP` | 같은 이유. `game-archetype-recipes.md`는 Archetype A/B/C를 다루고 `RoadSystem`·`ConveyorSystem`·`SortBin`은 **0건**이다 |
| F-15 | workflow 5. 프레임/모션 라우팅 문단 | 5 | `KEEP` | stop/route — asset·motion 경계 |
| F-16 | workflow 6. 게이트 명령 2줄 | 6 | `KEEP` | command inventory `factory-gate-v1` / `factory-gate-v2` |
| F-17 | workflow 6. 중복 제거 안내 (240행) | 2 | `KEEP` | 행동을 바꾸는 일화 — 없으면 네 번째 사본이 다시 생긴다 |
| F-18 | workflow 6. browser smoke 항목 | 9 | `KEEP` | 필수 출력 |
| F-19 | workflow 6. 후보정·캡처 설명 3문단 | 8 | `LINK` | `post-production-qa-contract.md`가 소유 |
| F-20 | workflow 6. Evidence handling | 8 | `KEEP` | 필수 출력 06/07. **산문이라 준수율이 낮다(18/19) — 코드블록 또는 목록으로 승격 검토** |
| F-21 | workflow 7. Completion standard 목록 | 16 | `KEEP` | 완료 판정 |
| F-22 | workflow 7. "게이트 없는 4항목" 문단 (282행) | 4 | `KEEP` | 행동을 바꾸는 일화 — GREEN을 전부의 증거로 읽는 것을 막는 유일한 문장 |
| F-23 | workflow 7. class O 문단 (284행) | 3 | `LINK` | 계약 §0.1이 소유 |
| F-24 | Scope limits | 4 | `KEEP` | stop 조건 |
| F-25 | Response format | 15 | `KEEP` | 필수 출력 |
| F-26 | Schema v2 완료 계약 (309~315, 317행) | 8 | `LINK` | 전부 계약·스키마가 소유 |
| F-27 | Schema v2 완료 명령 (316행) | 1 | `DELETE` | F-16과 같은 명령의 세 번째 사본 |

### game-factory 생명주기 경계 — 신규 `KEEP` (계획서 122~128행)

| ID | 내용 | 분류 |
|---|---|---|
| F-28 | 첫 production-demo PASS **전**의 acceptance defect는 factory가 닫는다 | `KEEP` (신규) |
| F-29 | 첫 PASS **이후** 별도 결함 세션은 polish로 넘긴다 | `KEEP` (신규) |
| F-30 | 기존 게임의 새 기능은 factory expansion 작업이다 | `KEEP` (신규) |

현재 frontmatter는 "Do not use on a game that already exists"라고만 해서 **F-30(기존 게임 확장)이
factory 책임인데 음성 경계처럼 읽힌다.** Phase 2가 고쳐야 한다.

---

## game-polish (174줄 → 목표 100~130)

| ID | 절 | 줄 | 분류 | 근거 |
|---|---|---:|---|---|
| P-01 | Authoritative contract | 4 | `KEEP` | 계약 소유 선언 |
| P-02 | Key paths | 12 | `KEEP` | 필요한 입력 경로 |
| P-03 | loop 0. Regression re-run first | 4 | `KEEP` | 핵심 순서의 첫 단계 |
| P-04 | loop 1. Intake — full sweep 6종 목록 | 20 | `KEEP` | 필요한 입력. 무엇을 캡처할지가 여기 없으면 sweep이 임의가 된다 |
| P-05 | loop 2. 결함 분류 — 계약 참조 문단 | 4 | `KEEP` | 이미 표를 지우고 링크로 바꾼 상태(사전 변경). 채택 대상 |
| P-06 | loop 2. 중복 표 경고 일화 | 3 | `KEEP` | 행동을 바꾸는 일화 — 표를 다시 복사하는 것을 막는다 |
| P-07 | loop 2. 심각도 triage 4단계 | 8 | `KEEP` | 핵심 순서 |
| P-08 | loop 3. Reproduce before fixing | 5 | `KEEP` | 핵심 순서 |
| P-09 | loop 4. 클래스별 "어디를 읽나" 표 | 12 | `LINK` | 계약 §2가 소유. 표 대신 "매칭된 클래스의 §2 절을 읽는다" 한 줄 |
| P-10 | loop 4. 교차 스킬 라우팅 2항목 | 4 | `KEEP` | stop/route |
| P-11 | loop 4. §3.1 적용성 경고 | 4 | `KEEP` | 게이트 없는 클래스가 있다는 사실은 행동을 바꾼다 |
| P-12 | loop 5. Re-capture 절차 | 18 | `KEEP` | 핵심 순서·필수 출력 |
| P-13 | loop 5. state-sample 필드 나열 | 6 | `LINK` | 계약이 소유 |
| P-14 | loop 6. 게이트 명령 1줄 | 3 | `KEEP` | command inventory `polish-gate` |
| P-15 | loop 7. Record and promote | 6 | `KEEP` | 필수 출력 06/07 |
| P-16 | loop 8. Exit criteria | 12 | `KEEP` | 완료 판정 |
| P-17 | Scope limits (자산 재생성 명령 포함) | 6 | `KEEP` | command inventory `polish-imagegen-targeted` |
| P-18 | Response format | 15 | `KEEP` | 필수 출력 |
| P-19 | 공통 QA Session 재사용 | 3 | `KEEP` | 핵심 순서의 단축 경로 |

### game-polish 생명주기 경계 — 신규 `KEEP`

| ID | 내용 | 분류 |
|---|---|---|
| P-20 | polish는 **첫 PASS 이후**의 결함만 맡는다. 첫 PASS 전 acceptance defect는 factory로 돌려보낸다 | `KEEP` (신규) |

polish는 174줄 중 `LINK`/`MOVE` 대상이 18줄뿐이다. **이 스킬은 이미 거의 본질만 남아 있다.**
100~130 예산을 억지로 맞추려면 `KEEP` 항목을 잘라야 하므로, 예산 미달을 사유와 함께 기록하고
진행한다(계획서 81행: 줄 수는 완료 판정에 쓰지 않는다).

---

## game-asset-creation (95줄 → 목표 80~100)

이미 예산 안이다. 다이어트가 아니라 **모순 해소**가 이 Phase의 일이다.

| ID | 절 | 줄 | 분류 | 근거 |
|---|---|---:|---|---|
| A-01 | 목적 | 11 | `KEEP` | 본질 |
| A-02 | 적용 범위 (23~24행 "제작·생성") | 11 | `KEEP` | **생성 모드는 본질이다. 지우면 안 된다** |
| A-03 | 입력 가정 | 19 | `KEEP` | 필요한 입력 |
| A-04 | 비목표 (59행 "프레임 재생성 금지") | 14 | `KEEP` | **단 A-02와의 모순 해소 필요** — 아래 참조 |
| A-05 | 핵심 원칙 | 10 | `KEEP` | 보존 불변식 |
| A-06 | Resource Routing | 10 | `KEEP` | stop/route |
| A-07 | 최종 보고 형식 | 13 | `KEEP` | 필수 출력 |
| A-08 | 5프레임 구체 사례 (frontmatter) | — | `MOVE` | `references/spacing-algorithm.md`가 소유 |

### A-04 ↔ A-02 모순 — Phase 4의 핵심 작업

frontmatter는 `Scope is pixel-preserving repositioning of already-approved frames`라고 선언하는데,
본문 23~24행은 "캐릭터 스프라이트 **제작**", "동작별 시트 **생성**"이라고 한다. 둘 다 사실이다.
**두 모드가 있는데 frontmatter가 하나만 말한다.**

해소 방향(계획서 119행): 본질은 "생성·편집·검수"이고, 픽셀 보존 교정은 그 **하위 저자유도 모드**다.
frontmatter가 두 모드를 다 말하되 교정 모드의 불변식(픽셀·순서·기준선 불변)을 명시한다.
routing corpus `new-sprite-sheet`와 `approved-frame-spacing`이 이 경계의 회귀 시험이다.

---

## game-feel-motion-skill (90줄 → 목표 70~90)

이미 예산 안이다. 통합이 이 Phase의 일이다.

| ID | 절 | 줄 | 분류 | 근거 |
|---|---|---:|---|---|
| M-01 | Overview | 18 | `KEEP` | 본질 |
| M-02 | Core Workflow | 13 | `KEEP` | 핵심 순서 — **M-03과 통합** |
| M-03 | Decision Tree | 19 | `KEEP` | 핵심 순서 — **M-02와 통합해 5~7단계 하나로** |
| M-04 | Required Outputs | 10 | `KEEP` | 필수 출력 |
| M-05 | Resource Routing | 14 | `KEEP` | stop/route (reference 5개 + template 6개 + validator) |
| M-06 | Non-Negotiables | 9 | `KEEP` | 완료 판정 |

### 별건 — 이번 계획 범위 밖으로 기록

`skills/game-feel-motion-skill/assets/fixtures/{valid,invalid}-spritesheet-manifest.json`이
존재하고 `validate_spritesheet_manifest.py`가 각각 exit 0 / exit 1을 정확히 낸다. 그러나
**저장소 어디서도 이 fixture를 실행하지 않는다**(`grep -rn validate_spritesheet_manifest` → 0건).
검증기를 강화하고 회귀 테스트를 연결하지 않은 상태다. 다이어트와 무관하므로 후속 작업으로 분리한다.

---

## 합계 전망

**`MOVE` 목적지 규칙 (P1-3에서 배운 것).** 어떤 규범을 `MOVE`로 분류하려면 **목적지가 그 내용을
이미 소유하고 있어야 한다.** 소유하지 않으면 `KEEP`이다. 목적지 보강은 그 문서를 소유한 Phase의
일이고, 이 계획에는 그런 Phase가 없다. F-12는 목적지(`production-demo-quality-contract.md`
§2.0.26)가 더 완전한 판을 이미 갖고 있음을 확인했으므로 `MOVE`가 유효하다.

| 스킬 | 현재 | `LINK`+`MOVE`+`DELETE` 대상 | 전망 | 예산 |
|---|---:|---:|---:|---:|
| game-factory | 317 | 약 39줄 + 신규 3항목 | 약 285 | 140~180 |
| game-polish | 174 | 약 18줄 + 신규 1항목 | 약 158 | 100~130 |
| game-asset-creation | 95 | 소폭 | 약 95 | 80~100 |
| game-feel-motion-skill | 90 | 통합으로 소폭 | 약 85 | 70~90 |

**factory와 polish는 이 분류만으로 예산에 도달하지 않는다.** 도달하려면 `KEEP` 항목을 잘라야 하고,
그건 계획서 39행(제외 범위: 줄 수 목표를 위한 필수 안전 규칙 삭제)이 금지한다. 따라서 예산 미달은
`BLOCKED` 사유가 아니라 **사유 기록 후 진행**으로 처리한다. 줄 수는 완료 판정에 쓰지 않는다(81행).
