# LLM Game Studio Pipeline — Idea → Plan → Custom Build → QA

> 목적: `dev_game`을 몇 개의 고정 archetype만 찍어내는 템플릿이 아니라, 사용자의 임의 게임 아이디어를 **LLM 게임 전문 개발팀 방식**으로 기획·설계·구현·검증하는 제작 파이프라인으로 정의한다. 최종 목표는 단순 데모가 아니라 **고품질 1차 프로덕션급 데모**다.

## 0. 핵심 원칙

```text
Archetype은 가능한 게임의 한계가 아니다.
Archetype은 빠르게 출발하기 위한 참고 패턴이다.
```

따라서 사용자가 새 아이디어를 던졌을 때 factory는 “지원되는 템플릿이 없다”로 멈추지 않는다. 먼저 게임 디렉터 관점으로 핵심 재미를 분석하고, 기존 패턴이 맞으면 재사용하며, 맞지 않으면 새 게임 루프와 시스템을 직접 설계해서 구현한다.

## 0.1 Production Demo 강제 계약

`dev_game` 산출물은 Foundation starter에서 멈추면 안 된다. 완료 보고 전 [`production-demo-quality-contract.md`](production-demo-quality-contract.md)를 따라 아래 게이트를 통과해야 한다.

```bash
npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/<game-id> --require-gpt-imagegen
```

개별 게이트 명령은 여기 적지 않는다. [`production-demo-quality-contract.md`](production-demo-quality-contract.md) §4가 단일 원본이다.

강제 항목:

- `assets/asset-manifest.json`에 `qualityTier: "production-demo"` 명시
- 런타임 에셋은 모두 해당 게임 전용으로 신규 생성, `assetIsolation.mode: "per-game"` 명시
- 스테이지/테마 배경 최소 3종, PNG/WebP/JPG, canvas 기준 크기 이상
- 주요 gameplay 에셋은 `quality: "production-demo"`; 핵심 에셋 SVG placeholder 금지
- 이미지 에셋은 Codex `imagegen` 스킬 provenance(`method: codex-gpt-imagegen-skill`, `sourceSkill: imagegen`)를 가져야 함
- runtime에 `window.__GAME_LAYOUT_BOUNDS__` 노출
- UI safe-area/overlap 자동 QA 통과
- scene-first artboard/slice-map 기준으로 runtime 화면 재조합 QA 통과

이 항목이 없으면 “완료”가 아니라 “production-demo 미통과”로 보고한다.

## 1. 기존 starter와 새 목표의 차이

| 구분 | 기존 `dev_game` starter | 목표 `LLM Game Studio` |
|---|---|---|
| 입력 | `game-spec.json` 중심 | 자연어 아이디어 + 제약 + 레퍼런스 |
| 생성 방식 | 정해진 dodge형 skeleton | 기획 후 필요한 구조를 맞춤 구현 |
| Archetype | 사실상 구현 범위 | 참고 패턴 / 가속 장치 |
| 완료 기준 | 파일 생성, build, canvas, PLAY | 장르 고유 핵심 액션 + production-demo 품질 게이트 통과 |
| QA | 공통 smoke 위주 | 공통 QA + 장르별 gameplay QA + production-demo QA + visual-layout QA |
| 보고 | “생성 완료” | 구현 범위, 미구현, 검증 증거, 다음 개선 |

## 2. 제작 에이전트 역할

| 역할 | 책임 | 산출물 |
|---|---|---|
| Game Director | 아이디어를 게임다운 한줄 피치와 차별점으로 정리 | `01-GDD.md` 핵심 피치/타깃/재미 |
| Game Designer | 조작, 룰, 점수, 실패, 보상, 난이도 설계 | 코어 루프, 밸런스 표, 스테이지/이벤트 |
| Technical Architect | Phaser 씬·엔티티·시스템 구조 설계 | `02-TECH-DESIGN.md` 구조/데이터/상태흐름 |
| Gameplay Engineer | 실제 조작/충돌/스폰/효과 구현 | `src/scenes`, `src/entities`, `src/systems` |
| Asset Director | 에셋 목록, 스타일가이드, 프롬프트, manifest | `03-ASSET-AUDIO-PLAN.md`, assets manifest |
| Audio Designer | BGM/SFX 역할, 트리거, 루프/볼륨 설계 | audio manifest, placeholder/생성 오디오 |
| QA Agent | 공통/장르별 smoke, 화면, 에셋, 사운드 검증 | `04-QA-PLAN.md`, QA 결과 |
| Adversarial Reviewer | “이게 진짜 그 게임인가?”를 반대 관점에서 검토 | `05-ADVERSARIAL-REVIEW.md` |

## 3. 표준 워크플로우

### Phase A. Idea Intake

입력은 자연어 한 문장이어도 된다.

```text
예: 회전하는 행성 위에서 점프하며 운석을 피하는 게임
```

필수 분석:

- 핵심 조작: 탭, 드래그, 홀드, 스와이프, 조합 여부
- 핵심 재미: 회피, 타이밍, 성장, 퍼즐, 리듬, 물리, 수집 등
- 세션 길이: 30초, 90초, 5분 이상 중 목표
- 실패 조건: 충돌, 추락, 시간초과, 체력 0 등
- 반복 동기: 점수, 코인, 업적, 해금, 랜덤성 등
- 모바일 적합성: 한 손 가능, 화면 가림, 세로/가로

### Phase B. Pattern Fit Decision

기존 archetype은 아래 질문에 답하기 위한 참고 자료다.

```text
이 아이디어의 핵심 루프가 기존 패턴과 70% 이상 같은가?
```

| 판단 | 처리 |
|---|---|
| 70% 이상 동일 | 해당 archetype을 시작점으로 사용하고 게임 고유 요소를 추가 |
| 40~70% 유사 | 공통 shell만 사용하고 gameplay 시스템은 새로 작성 |
| 40% 미만 | 새 custom loop를 설계하고 archetype은 참고만 함 |

금지:

- 기존 dodge 템플릿에 이름/에셋만 바꿔 끼워 넣기
- JSON에 기능명을 적고 실제 코드 구현 없이 완료 보고하기
- build 성공만으로 “프로덕션급”이라고 보고하기

### Phase C. GDD 작성

생성 위치 권장:

```text
dev_game/generated/<game-id>/docs/01-GDD.md
```

필수 목차:

1. 한줄 피치
2. 30초 코어 루프
3. 1분 쉬운 구간 / 5분 난이도 폭발 설계
4. 조작 방식
5. 실패/재시작 루프
6. 점수/보상/콤보
7. 난이도 곡선
8. 필수 에셋 목록
9. 필수 사운드 목록
10. MVP 포함/제외 범위

### Phase D. Technical Design 작성

생성 위치 권장:

```text
dev_game/generated/<game-id>/docs/02-TECH-DESIGN.md
```

필수 목차:

1. 씬 구조
2. 엔티티 구조
3. 시스템 구조
4. 입력 처리
5. 상태 흐름
6. 충돌/판정 규칙
7. 데이터/밸런스 config
8. 에셋/오디오 manifest
9. 성능/오브젝트 풀링
10. QA 자동화 대상

### Phase E. Implementation

공통 shell은 재사용한다.

```text
BootScene
LoadingScene
HomeScene
GameScene
PauseScene
GameOverScene
SaveData
AudioManager
LoadingUI
MobileButton
```

하지만 gameplay는 아이디어에 맞춰 새로 구현한다.

```text
src/entities/<GameSpecificEntity>.js
src/systems/<GameSpecificSystem>.js
src/config/<gameSpecificConfig>.js
```

예: 레이싱 게임이면 `RoadSystem`, `LaneSystem`, `PlayerCar`, `TrafficVehicle`, `NitroSystem`이 있어야 하며, 단순 `Spawner` 이름 변경으로 끝내면 실패다.

### Phase F. Asset / Audio

MVP 진행 중 placeholder는 허용될 수 있지만, **완료 보고 대상 production-demo에서는 placeholder-only 에셋이 허용되지 않는다.**

필수:

- 스테이지/테마 배경 최소 3종, PNG/WebP/JPG, 1080×1920 기준 이상
- 모든 런타임 에셋은 `dev_game/generated/<game-id>/assets/**` 내부에 존재하고 `provenance.source: generated-for-game`을 가진다
- 이미지는 `gpt 이미지젠 스킬` 경로로 생성하고, `method: codex-gpt-imagegen-skill`, `sourceSkill: imagegen`, `promptHash`를 manifest에 남긴다
- 생성물 안에 외부 이미지 서비스 runner나 서비스 호출 스크립트를 두지 않는다
- 주요 gameplay 에셋은 `quality: production-demo`로 manifest에 명시
- 플레이어/위험/보상 실루엣이 0.2초 안에 구분됨
- SVG/PNG 원본 비율 유지, 버튼/패널 비율 왜곡 금지
- 투명 배경 또는 검증된 chroma-key 제거 결과
- 전체 장면 아트보드 기준으로 분리한 crop/slice provenance 보존
- 모바일 축소 화면에서 판독 가능
- 배경은 stage/theme 최소 3종, canvas 이상이며 Loading/Home/Game/Pause/GameOver에서 자연스럽게 보임
- SFX: 버튼, 수집, 피격, 경고, 게임오버
- BGM: 홈/게임 또는 최소 게임 루프 1개, gameplay 중에만 재생되고 pause/home/background에서 정지

### Phase G. QA & Completion Audit

완료 조건은 아래가 모두 참이어야 한다.

| 게이트 | 완료 기준 |
|---|---|
| build | `npm run build` 통과 |
| common browser smoke | canvas 렌더, PLAY 진입, console/page error 없음 |
| gameplay smoke | 핵심 조작이 실제 상태/좌표/점수에 영향을 줌 |
| genre smoke | 그 장르로 보이게 하는 핵심 시스템이 동작 |
| asset QA | 깨진 이미지, 검은 박스, 비율 왜곡, 누락 없음 |
| production-demo QA | 품질 tier, 배경 3종, 주요 에셋 quality, 문서, layout registry 계약 통과 |
| visual-layout QA | Loading/Home/Game/Pause/GameOver canvas 중앙 정렬, safe-area, HUD/button/text/card overlap 자동 검출 통과 |
| scene-composite QA | 최종 스크린샷에서 버튼 슬롯, 잘린 stamp, 투명/끊긴 runtime 에셋, 외부 overlay 없음 |
| audio QA | 무음/과피크/트리거 누락 없음 |
| adversarial review | “스킨만 바꾼 기존 게임” 지적을 통과 |

## 4. 장르별 smoke 예시

| 장르 | smoke가 확인해야 하는 것 |
|---|---|
| Lane Racer | 드래그 좌우 이동, 차체 기울기, 도로 스크롤, 차선 장애물, 니트로/속도감, 충돌 |
| Vertical Shooter | 이동, 자동/수동 발사, 적 체력, 탄 충돌, 웨이브, 보스/엘리트 |
| Rhythm Tap | 박자 라인, 판정 타이밍, Perfect/Good/Miss, 콤보, 음악 동기화 |
| Physics Jumper | 중력, 점프/회전, 착지 판정, 낙하 실패, 카메라 추적 |
| Puzzle Merge | 선택/병합, 상태 변화, 목표 달성, 더 이상 이동 불가 판단 |
| Survival Arena | 이동, 적 추적, 자동 공격/스킬, 경험치/레벨업, 웨이브 증가 |

## 5. “완료” 보고 규칙

완료 보고는 반드시 아래를 포함한다.

- 실제 만든 게임명과 한줄 컨셉
- 사용한 archetype 또는 `custom-loop` 판단 이유
- 생성/수정한 주요 파일
- 실제 구현된 핵심 시스템
- 실행한 명령과 결과
- 브라우저 smoke에서 확인한 장면/상태
- 미구현 또는 다음 단계

금지 표현:

```text
프로덕션급 완료
완성
모든 기능 구현
```

위 표현은 completion audit이 실제로 모든 요구를 증명할 때만 사용한다.

## 6. 스킬 자체를 고칠 때의 정합성 게이트

위 §0~§5는 **게임을 만드는 작업**의 규칙이다. 이 절은 **스킬 문서 자체를 고치는 작업**의 규칙이다.

둘을 나누는 이유는 하나다. 게임 작업은 산출물이 스킬 밖에 있어서 게이트가 독립적으로 판정할 수
있지만, 스킬 유지보수는 **판정 기준 자체가 편집 대상**이다. 구현자가 완료를 선언하고 그 완료의
정의를 같은 세션에서 고치면 어떤 증거도 사후 합리화와 구분되지 않는다.

### 6.1 작업 유형

| 유형 | 뜻 | 규칙 |
|---|---|---|
| `skill-execution` | 스킬을 **써서** 무언가를 만든다 | 적용 skill SHA를 동결한다. 작업 중 스킬 변경 금지 |
| `skill-maintenance` | 스킬 **자체를** 고친다 | baseline SHA·사전 고정 계약·candidate SHA를 대조한다 |

`skill-execution` 도중 스킬 결함을 발견하면 현재 작업을 `BLOCKED`하고 별도 `skill-maintenance`
작업으로 분리한다. 구현에 맞추려고 같은 작업에서 스킬을 조용히 고치는 것이 가장 흔한 실패다.

### 6.2 상태 기계

```text
PLANNED → IMPLEMENTING → EVIDENCE_READY → ADVERSARIAL_REVIEW → PASS → NEXT
                                                └→ BLOCKED
```

- 각 Phase는 **첫 파일 수정 전에** `PLANNED` 보고서가 있어야 한다.
- 구현자는 As-built를 쓰지만 `PASS`를 발급하지 않는다. **대상 파일을 편집하지 않은 독립 reviewer**가
  사전 고정 corpus와 대조표로 판정한다.
- `PASS` 없이 다음 Phase를 시작하지 않는다. 사용자 승인으로 `PASS`를 대체하지 않는다.
- 증거 누락·범위 밖 변경·검사기 fail-open은 어떤 사유로도 면제하지 않는다.

### 6.3 경로 소유권

Phase마다 편집 허용 경로를 사전에 고정하고, 그 밖의 변경은 현재 Phase를 `BLOCKED`한다.
계획 전부터 dirty였던 경로는 `UNTRUSTED_PREPLAN`으로 격리한다 — dirty인 것 자체는 위반이 아니지만,
이를 심판할 Phase가 오기 전에 내용이 바뀌면 그건 어느 Phase의 성과도 아닌 몰래 편집이다.

### 6.4 hash 불변성

승인된 계획은 읽기 전용이다. 실행 중 허용되는 변경은 체크박스 `[ ] → [x]` 하나뿐이며, 체크박스를
정규화한 뒤의 hash가 달라지면 계획이 자기 기준을 움직인 것이므로 즉시 `BLOCKED`다. 이전 Phase의
승인 파일 hash가 바뀌면 그 `PASS`를 무효화하고 해당 Phase부터 다시 검토한다.

### 6.5 검사 명령

```bash
node scripts/check_skill_conformance.mjs --plan <plan.md>
node scripts/check_skill_gate_controls.mjs
```

앞의 것은 위 §6.2~6.4를 구조적으로 검사하고, 뒤의 것은 **검사기들 자신의 음성·양성 대조**를 돌린다.
새 검사기의 출력은 두 대조를 모두 통과하기 전에는 증거가 아니다
([`post-production-qa-contract.md`](post-production-qa-contract.md) §0.1). 이 두 명령이 통과했다고
스킬 수정이 옳다는 뜻은 아니다 — 구조만 본다. 의미 정합성은 독립 reviewer의 대조표가 판정한다.

## Schema v1/v2 실행 분기

- `game-spec.v1.schema.json`: 기존 arcade-vertical Foundation 호환.
- `game-spec.v2.schema.json`: 신규 custom-loop. `buildDecision`, `implementationStatus`, `runtimeConfig`, `rules`, `requiredAssetRoles`, `captureMatrix`를 실제 구현 의미대로 기록한다.
- `--template custom-shell`은 gameplay를 추측하지 않는다. 1스테이지 vertical slice의 장르 고유 시스템을 직접 구현한 뒤 Production Gate로 승격한다.
- v1 변환은 `factory:migrate-spec-v2 -- --spec <v1> --out <v2> --mode custom-loop` skeleton을 사용하고 모든 TODO를 사람이 검토한다.
- v2 완료는 고정 Scene 목록이 아니라 declared capture states, Rules Contract, clarity, hostile input, session continuity와 same-run QA report로 판정한다.
