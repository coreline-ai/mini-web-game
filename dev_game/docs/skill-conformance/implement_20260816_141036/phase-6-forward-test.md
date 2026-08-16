# Phase 6 — 독립 포워드 테스트·최종 승인

- task ID: `implement_20260816_141036/phase-6`
- 작업 유형: `skill-maintenance`
- 상태: `PASS`

## 1. 작업 전 계약

| 항목 | 값 |
|---|---|
| baseline HEAD | `870d3d0e4b809313e980cfeb4c6f420ca83b904b` |
| Phase 5 승인 manifest (사슬 대상) | (§6) |
| 허용 경로 (계획서 198행) | conformance 증거와 Phase 6 체크박스**만** |
| 금지 | 스킬·계약·pipeline·`scripts/**`·계획 본문 — **그래서 K-1을 여기서 못 고친다** |

## 2. 독립 포워드 테스트 — 기대 답을 모르는 reviewer

계획서 428~429행대로, **원문 요청 8개만** 주고 `expected*`를 노출하지 않았다.
`dev_game/docs/skill-conformance/**`를 열지 말라고 명시했고, reviewer가 열지 않았음을 보고했다.

### 2.1 스킬 선택 — **8/8 일치**

| # | 요청 | corpus 기대 | 독립 판단 | |
|---|---|---|---|---|
| 1 | 좀비 피하기 게임 만들어줘 | factory | factory | ✓ |
| 2 | 방금 만든 게임, 버튼 겹침, 게이트 안 돌림 | factory | factory | ✓ |
| 3 | 지난주 완료 게임, 음악 겹침 | polish | polish | ✓ |
| 4 | 완료된 게임에 보스전 추가 | factory | factory (expansion) | ✓ |
| 5 | 승인 프레임 간격 보정 | asset | asset (교정 모드) | ✓ |
| 6 | 격투 시트 새로 생성 | asset | asset (생성 모드) | ✓ |
| 7 | 히트스톱·이징 값 | motion | motion | ✓ |
| 8 | 간격 + 타이밍 복합 | asset (분해) | **두 스킬로 분해** | ✓ |

**Phase 2·3이 만든 대칭 배제 문장 쌍이 실제로 작동한다.** reviewer 평:

> [2]/[3]/[4]는 factory와 polish 양쪽 description이 서로를 명시적으로 배제하는 문장을 대칭으로
> 갖고 있어서 본문을 열 이유가 없었다. **이 대칭 배제 문장 쌍이 이 저장소 라우팅 설계의 가장
> 잘 된 부분이다.**

[2]가 특히 중요하다 — G-5b가 닫히기 전이었다면 polish의 "fix what the video/screenshot shows"에
걸려 오라우팅됐을 요청이다. reviewer가 그 경로를 명시적으로 적었다: *"polish description의
'fix what the video/screenshot shows'만 보면 polish로 끌려가지만, 'in a game that has already
passed its first production-demo gate'와 배제 문장이 뒤집는다."*

### 2.2 corpus가 놓친 것 — 신규 finding 2건

**N-1 (높음) — description 층에 "저장소 안 게임용인가"라는 축이 없다**

[6] `new-sprite-sheet`가 8개 중 유일하게 **description → 본문 → 참조문서로 갈수록 답이 흔들린**
케이스다.

```
description 층   game-asset-creation ("especially 1990s arcade fighting game character animation sheets")
본문 층          동일 (적용 범위에 "동작별 시트 생성")
참조문서 층      ai-art-pipeline.md 표: "2. 생성 = game-factory (Path A/B)"   ← 실행 주체가 뒤집힘
```

reviewer 지적: *"`game-asset-creation` description은 'dev_game'이라는 단어를 한 번도 쓰지 않으므로,
처음 보는 사용자는 저장소 안 게임용이어도 그대로 asset-creation으로 직행하고 **factory의
provenance 체계(`method`·`sourceSkill`·`promptHash`)를 우회**하게 된다."*

이것은 이번 다이어트가 만든 결함이 **아니다** — 원래 있었고, blind test가 처음 드러냈다.
routing corpus의 `new-sprite-sheet` 사례도 이 축을 갖고 있지 않아 잡지 못했다.

**N-2 (중간) — 복합 요청의 실행 순서가 정의되지 않았다**

[8]에서 corpus의 `expectedWorkOrder`는 `["asset 간격 교정 → PASS", "motion 타이밍 → PASS"]`인데,
독립 판단은 **반대 순서**를 제안했다.

> 1. `game-feel-motion-skill`: 목표 셀 크기·gap·pivot·baseline과 hitstop/이징 수치를 먼저 확정
>    — **간격 보정의 목표값 자체가 여기서 나온다.**
> 2. `game-asset-creation`: 그 목표값으로 픽셀 불변 재배치.

**독립 판단 쪽이 더 타당해 보인다.** 무엇으로 맞출지 모르는 채 간격을 옮길 수는 없다.
reviewer가 원인도 짚었다 — *"어느 SKILL.md도 '설계가 교정보다 먼저'라고 명시하지 않는다.
생성에 대해서만 `ai-art-pipeline.md` 규칙 1이 '설계 선행'을 못 박아 뒀고, **교정에는 그 문장이
없다**."*

분해 자체(어느 스킬이 어느 절을 맡는가)는 상호 라우팅 문장 쌍으로 정확히 갈렸다. 순서만 미정의다.

**N-3 (낮음, 결함 아님)** — [7]은 "이 게임이 첫 PASS를 받았는가"라는 상태 단서가 요청문에
없어 motion↔polish가 절반 모호했다. [2]에는 "아직 게이트도 안 돌렸어"가 있었다. 요청문의 성질이지
스킬의 결함이 아니다.

## 3. bounded task 4개 — 격리된 `/tmp` fixture

계획서 432~433행대로 외부 이미지 생성·네트워크·전역 설치 없이 수행했다. 저장소는 읽기만 했다.

### 3.1 절차 준수 — 4/4

| T | 스킬 | 시킨 대로 했는가 | 시키지 않은 일 | 멈추라는 데서 멈췄는가 |
|---|---|---|---|---|
| T1 | factory | ✓ §1→§2→§3→§3.5 | 없음 | ✓ 아트 직전 |
| T2 | polish | ✓ §0→§1→§2→§3 | 없음 | ✓ 수정 직전 |
| T3 | asset | ✓ 모드 판정→불변식→계산 절차 확인 | 없음 | ✓ 질문 후 정지 |
| T4 | motion | ✓ 분류→feel goal→수치→판정 | 없음 | ✓ Block으로 종료 |

**한 스킬이 다른 스킬의 일을 하려 든 경우는 없다.** 네 스킬의 경계 선언이 서로 맞물린다.

### 3.2 신규 finding — 실측으로 확인한 것

**N-4 (차단급) — 정직한 `hybrid` 선언이 v2 캡처 QA를 통째로 끈다**

```
game-spec.v2.schema.json  buildDecision enum: ['archetype-start', 'hybrid', 'custom-loop']
production-gate.mjs:220   customRequired = mode==='custom-loop-full'
                                        || (schemaVersion==='2.0.0' && buildDecision==='custom-loop')
```

**스키마가 `hybrid`를 허용하는데 게이트는 `custom-loop`만 본다.** `hybrid`로 정직하게 선언하고
`--mode`를 붙이지 않으면 `custom-loop-full-qa` 위임이 일어나지 않아 **captured-state /
first-play-clarity / input-hostility / session-continuity / docs-runtime-sync / lifecycle /
qa-session-report가 전부 skip된다.**

`game-factory/SKILL.md`는 `--mode custom-loop-full`을 언제 붙여야 하는지 조건을 적지 않았다.

**이것이 원래 사용자가 지목한 실패 형태다** — "기본 스킬에 정의되어 있는 작업을 안 해서 문제
있는 데모". 다이어트가 만든 결함이 아니라 원래 있었고, bounded task가 처음 드러냈다.

**N-5 (중간) — 내가 Phase 3에서 만든 거짓 보편 주장**

Phase 3에서 P-09 표를 축약하며 이렇게 썼다.

> Read the matched class's own section in contract §2 — **every class has one**, …

실측:

```
post-production-qa-contract.md:102   ## 2. 결함 클래스별 강제 규칙
                              :480   ## 3. 파이프라인 배치
                              :490   ### O. Play Layer Value …     ← §3 아래다
```

**클래스 O는 §2에 없다.** 원래 표는 A–E·F–G·H–K·M·L·N만 열거하고 O를 다루지 않았지만
**완전성을 주장하지 않았다.** 내 축약이 없던 보편 주장을 추가했다. 이건 다이어트가 만든 결함이고
내 것이다.

(계약 §0.1 본문도 "§2 클래스 O 참조"라고 잘못 가리킨다 — 계약 쪽 결함은 별건.)

**N-6 (중간) — leaf 스킬 둘이 조정 문서를 모른다**

```
game-asset-creation      'dev_game' 0건   'ai-art-pipeline' 0건
game-feel-motion-skill   'dev_game' 0건   'ai-art-pipeline' 0건
```

`ai-art-pipeline.md:300`이 **"`game-asset-creation`의 생성 프롬프트 템플릿은 `transparent
background`를 요구하는데 dev_game에서는 마젠타 크로마키가 정본"**이라고 정정하는데,
`prompt-templates.md`에는 그 문구가 **2건 그대로** 있고 스킬은 정정을 가리키지 않는다.

조정 규칙이 상위 두 스킬(factory·polish)에만 배선돼 있어, leaf 스킬 단독 호출 경로에서는
조정이 적용되지 않는다.

### 3.3 스킬 문서에서 찾을 수 없어 추측해야 했던 것 — 15건

높음 6건만 옮긴다(전체는 bounded task 원문).

| 스킬 | 공백 |
|---|---|
| factory | `hybrid` → 스키마·게이트 매핑 없음 (N-4) |
| polish | **대상 game-id 미지정 시 절차 없음** — 후보 12개 |
| polish | **"첫 PASS 통과 여부" 확인 방법 없음** — 이 스킬 사용의 전제 조건인데 검증 수단 부재 |
| polish | "the three standard viewports" 숫자가 polish 어디에도 없다 (품질 계약 §4 명령줄에서 역추적) |
| motion | **`timing stack` 미정의** — 분류가 정의하라는 4개 중 하나인데 저장소 전체에서 SKILL.md 1회 등장 |
| motion | screen/camera impact 수치·haptic 규격 전무 |

**포인터 자체는 전부 살아 있었다.** 가리킨 문서에 내용이 없던 사례는 없다 — 위 셋(five
first-play elements, three standard viewports, timing stack)은 **가리킨 곳에 없고 다른 데
있거나 아예 없는** 경우다.

## 4. As-built — 이 Phase의 산출물은 증거다

Phase 6은 스킬을 편집하지 않는다(계획서 198행). 산출물은 blind forward test 1건, bounded task
4건, 아래 비교표, 후속 계획 초안, 그리고 이 보고서다. `skills/**`·`scripts/**` 변경 0건.

### 4.0 다이어트 전후 비교표

**두 기준선을 구분해 적는다.** 계획서 74~79행의 기준선은 **작업 트리**(preplan patch 적용 후)이고,
HEAD는 커밋된 상태다. 둘 다 사실이므로 섞지 않는다.

| 스킬 | HEAD | 계획 baseline | 현재 | 예산 |
|---|---:|---:|---:|---:|
| `game-factory` | 321 | 317 | **303** | 140~180 |
| `game-polish` | 190 | 174 | **169** | 100~130 |
| `game-asset-creation` | 95 | 95 | **99** | 80~100 |
| `game-feel-motion-skill` | 90 | 90 | **90** | 70~90 |
| 합계 | 696 | 676 | **661** | 490 이하 권장 |

### 4.1 실제로 없어진 것 — 중복

| 사본 | 전 → 후 |
|---|---|
| 개별 게이트 목록 (factory · polish · pipeline 3곳) | 3 → **0** |
| 결함 클래스 표 (polish 본문, 14행) | 1 → **0** |
| 결함 클래스 열거 (polish frontmatter, 12개) | 1 → **0** |
| 완료 명령 (factory, 세 번째 사본) | 1 → **0** |

frontmatter 사본은 **12개인데 계약은 15개(A–O)**로 이미 어긋나 있었다. `quick_validate`의 길이
제한이 우연히 드러낸 것이지 게이트가 잡은 것이 아니다.

### 4.2 예산 미달 3건 — 사유

| 스킬 | 결과 | 사유 |
|---|---|---|
| `game-factory` 303 / 140~180 | 미달 | `KEEP` 보존. F-13(Foundation 사용법 26줄)·F-14(장르별 예시)는 **목적지가 그 내용을 소유하지 않아** `KEEP`으로 되돌렸다. 기획문서 01~05 코드블록은 **19/19 대 18/19** 실측 근거가 있다 |
| `game-polish` 169 / 100~130 | 미달 | `LINK` 대상이 애초에 17줄뿐. full sweep 6종 목록이 없으면 sweep이 임의가 된다 |
| `game-feel-motion-skill` 90 / 70~90 | 상단 | 통합이 목표였고 정의 항목 23/23을 보존했다 |

계획서 39행(줄 수 목표를 위한 필수 안전 규칙 삭제 금지)과 81행(줄 수는 완료 판정에 쓰지 않는다)에
따라 사유 기록 후 진행했고, 세 Phase 모두 **사전 신고**했다.

### 4.3 KEEP / LINK / MOVE / DELETE 집계

| 스킬 | `KEEP` | `LINK` | `MOVE` | `DELETE` |
|---|---:|---:|---:|---:|
| `game-factory` (F-01~F-30) | 21 | 6 | 2 | 1 |
| `game-polish` (P-01~P-20) | 18 | 2 | 0 | 0 |
| `game-asset-creation` (A-01~A-08) | 7 | 0 | 1 | 0 |
| `game-feel-motion-skill` (M-01~M-06) | 6 | 0 | 0 | 0 |

**`KEEP`이 52개 중 52개 보존됐다** — 네 Phase 모두 독립 reviewer가 전수 대조로 확인했다.

## 5. 증거 — 게이트·회귀

```
check_skill_gate_controls (27종)   exit=0    음성 3 / 양성 24
check_skill_drift --skip-user      exit=0
check_skill_commands               exit=0    factory=5 polish=2 asset=0 motion=0
check_doc_constants                exit=0
check_skill_conformance            exit=0
quick_validate.py ×4                        Skill is valid! ×4
네 스킬 YAML 파싱                   4/4 OK    ← K-1 보상 통제
git diff --check                   exit=0
routing corpus 8사례 양방향          8/8
Phase 1(10)·2(4)·3(4)·4(4)·5(4) 승인물   불일치 0건
```

## 6. 전역 설치본 — 별도 후속 작업 (계획서 436행)

```
FAIL: Codex: game-asset-creation is STALE
FAIL: Codex: game-factory is STALE
FAIL: Codex: game-feel-motion-skill is STALE
FAIL: Codex: game-polish is STALE
--  Claude Code: 네 스킬 모두 not installed
```

`~/.codex/skills/`는 심링크가 아니라 **실제 복사본**이므로 이번 다이어트가 도달하지 않았다.
계획서 37행이 사용자 전역 설치·재설치를 제외 범위로 두었으므로 **별도 승인 작업**으로 보고한다.
`scripts/install_game_factory_skill.sh codex`가 그 수단이다.

## 7. 인계 — 후속 계획 (계획을 수정하지 않는다)

초안: `follow-up-plan-draft.md` (같은 디렉터리).

**경로 문제 — 판정 요청.** 독립 검토는 `dev_game/dev-plan/implement_<신규>.md`로 만들라고 했으나,
`path-ownership.json`의 `alwaysAllowed`는 이 계획서 1개와 이 conformance 디렉터리뿐이다.
`dev_game/dev-plan/` 아래 새 파일은 **어느 Phase의 허용 경로도 아니므로** 거기 만들면
`check_skill_conformance.mjs`가 범위 밖 변경으로 RED를 낸다. 허용 경로 안에 초안으로 두었다.
승격은 이 계획 밖의 별도 행위이며 판정을 요청한다.

인계 항목:

| ID | 내용 | 현재 노출 |
|---|---|---|
| K-1 | 구조 검사가 frontmatter를 YAML로 파싱하지 않는다 | 0 (네 스킬 4/4 OK) |
| P1-4 | 대조군 27종이 자동 체인에 배선되지 않았다 | 회귀로 안 돌아감 |
| P2-8 | required 추출이 에러 문구 의존 (`make-game.mjs` → `[]`) | soft fail-open |
| P2-9 | 체크박스 정규화 전역 치환 | 실질 0 |
| **N-1** | description 층에 "저장소 안 게임용인가" 축이 없어 factory provenance 우회 가능 | **blind test가 실증** |
| **N-2** | 복합 요청의 실행 순서 미정의 (교정에는 "설계 선행" 문장이 없다) | corpus와 blind test가 반대 순서 |
| **N-4** | **`hybrid` 선언이 v2 캡처 QA 8종을 조용히 끈다.** 스키마는 허용, 게이트는 `custom-loop`만 봄 | **차단급 — 실측 확인** |
| **N-5** | polish §4의 "every class has one"이 거짓. 클래스 O는 계약 §3 아래다 | **내가 Phase 3에서 만든 것** |
| **N-6** | leaf 스킬 둘(`asset`·`motion`)이 `ai-art-pipeline` 조정 규칙을 모른다. `transparent background` 정정이 도달하지 않음 | 중간 |
| — | polish에 대상 game-id 결정 절차·"첫 PASS 여부" 확인 방법이 없다 | 높음 |
| — | motion의 `timing stack` 미정의 (저장소 전체 1회 등장) | 높음 |
| — | `validate_spritesheet_manifest.py` fixture가 어디서도 실행되지 않는다 | 별건 |

## 7.5 N-5 해소 — Phase 3 재개방 (검토 1회차 BLOCKED 사유)

독립 검토가 Phase 6을 **N-5 하나로 BLOCKED**했다. 기준은 명확했다 — **다이어트가 만들었나,
드러냈나.**

| ID | 출처 | 판정 |
|---|---|---|
| **N-5** | **다이어트가 만듦** | **지금 고침 — Phase 3 재개방** |
| N-4 | 사전 결함 | 후속 계획 1순위 |
| N-1 · N-2 · N-6 · 공백 15건 | 사전 결함 | 후속 계획 |

거짓 진술을 후속으로 넘기는 것은 `known gap` 강등이고, **polish SKILL 자신이 인용한 계약 §0이
금지하는 동작**이다. 그리고 계획서 200~201행이 이 상황을 위해 만든 절차를 한 번도 쓰지 않고
끝내면 그 장치는 장식이 된다.

**정정**: `skills/game-polish/SKILL.md` — `contract §2 — every class has one` →
`the contract — §2 for classes A–N, §3 for class O`.

**사슬 재발급** (Phase 4·5의 내용은 바뀌지 않았다. 각 manifest의 사슬 항목만 갱신):

```
phase-3  66732ae33ea8544982bf0de3184f55cbf917ba14086441cdad6a41500f6a5fb5
phase-4  3facf2f54d401f8318e41ad497215a38beb6645786acb3728b428e58de55f403
phase-5  5ab6a53fd931a9095b36b73e9b7c1e2b8df8467600178bde273b643c225f31de
phase-6  3f5f92c8c14099e8e0f8e24560ddcf250854e31e0fcce6891f5d4963a54d6b48
phase-1  746178e3… (불변)   phase-2  bf3d2a32… (불변)
```

### 7.6 검사기의 한계 — 재개방이 상태로 모델링되지 않는다

이번 재개방에서 드러났다. `check_skill_conformance.mjs`는 Phase 3을 여전히
`PASS — reviewer: …, phase-3 round 1`으로 읽는다. **산출물이 바뀌었는데 판정 줄은 1회차 그대로다.**

manifest 사슬은 정상 작동한다 — 내가 재발급했으므로 hash는 맞고, **재발급하지 않았다면
`이전 PASS가 무효`로 잡혔을 것이다.** 그러나 "PASS 이후 재개방되어 재발급됨"이라는 상태 자체는
어디에도 기록되지 않는다. 이 보고서와 Phase 3 §7.1b가 산문으로만 남긴다.

**후속 계획 항목으로 올린다.** `VERDICTS` 집합에 `REOPENED`를 추가하거나, 판정 줄에 라운드를
누적 기록(`round 1 → reopened → round 2`)하는 방법이 있다. 내가 정할 사안이 아니다.

## 8. 독립 reviewer·미해결 finding·최종 판정

(ADVERSARIAL_REVIEW에서 reviewer가 작성 — **이 줄은 구현자가 채우지 않는다**)

- 판정: `PASS` — reviewer: independent-adversarial-reviewer, phase-6 round 1, 2026-08-16
