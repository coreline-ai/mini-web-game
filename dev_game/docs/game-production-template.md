# Game Production Template — Concept → Scenario → Assets → Build → Test → Deploy

> 목적: 임의의 작은 모바일/웹 게임 아이디어를 LLM 게임 전문 개발팀 방식으로 기획·설계·구현·검증할 수 있도록, 아이디어 선정부터 배포/운영까지의 과정을 표준화한다.

## 0. 제작 철학 — 아이디어가 먼저, archetype은 참고

`dev_game`은 몇 가지 고정 장르만 찍어내는 도구가 아니다. 사용자가 자연어로 던진 아이디어를 먼저 게임 디렉터 관점에서 해석하고, 기존 archetype이 맞으면 빠르게 출발점으로 사용하며, 맞지 않으면 새 게임 루프를 설계한다.

완료 기준은 “템플릿이 생성되었는가”가 아니라 “해당 아이디어의 핵심 재미가 실제 플레이에서 검증되었는가”이다.

권장 세부 절차는 [`llm-game-studio-pipeline.md`](llm-game-studio-pipeline.md)를 따른다.

## 0.1 Production Demo Quality Contract

이 템플릿의 완료 목표는 단순 데모가 아니라 **고품질 1차 프로덕션급 데모**다. 세부 강제 기준은 [`production-demo-quality-contract.md`](production-demo-quality-contract.md)를 따른다.

필수 완료 게이트:

```bash
npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/<game-id>
```

`factory:qa`만 통과한 Foundation starter는 완료물이 아니라 구현 출발점이다. production-demo 완료 전에는 stage/theme 배경 3종, 주요 에셋 quality 필드, gpt 이미지젠 스킬 provenance, per-game asset isolation, layout bounds registry, UI overlap 검증이 필요하다. 공통 에셋 풀은 두지 않는다. 새 게임의 런타임 에셋은 항상 해당 게임 전용으로 신규 생성한다.

## 1. 왜 이 템플릿이 필요한가

단순히 “게임 정하기 → 시나리오 → 에셋 → 구현 → 테스트 → 배포”만으로는 실제 제작 중 누락되는 부분이 많다. 특히 모바일 캐주얼 게임은 **코어 루프 검증, 에셋 스타일 일관성, 경제/보상 설계, 성능, 저장/광고/분석, 출시 후 운영**이 빠지면 완성도가 급격히 낮아진다.

이 문서는 매번 새 게임을 만들 때 아래 산출물을 순서대로 만들고 검증하는 것을 목표로 한다.

```text
레퍼런스 분석
→ 게임 후보 선정
→ 원페이지 피치
→ GDD/시나리오
→ 시스템/경제/난이도 설계
→ 에셋·오디오 스타일가이드
→ AI 에셋 생성/정리
→ 기술 아키텍처
→ MVP 구현
→ 콘텐츠 확장
→ QA/밸런싱/성능
→ 배포
→ 운영/업데이트
```

## 2. 기존 프로세스에서 빠진 부분 체크

| 단계 | 사용자가 제시한 흐름 | 빠진/보강해야 할 항목 | 왜 필요한가 |
|---|---|---|---|
| 0 | 게임 정하기 | 레퍼런스/시장 분석, 타깃 플레이어, 차별점 | “비슷한 게임”과 비교해야 중복/약점을 줄일 수 있음 |
| 1 | 시나리오 만들기 | 30초 코어 루프, 조작 검증, 실패/보상 루프 | 시나리오보다 먼저 “재미가 반복되는가”를 검증해야 함 |
| 2 | 시나리오에 맞는 신규 에셋 | 아트 디렉션, 스타일가이드, 게임별 에셋 목록, 네이밍 규칙, 라이선스/생성 출처 | 에셋 품질/일관성/독립성이 게임 품질을 좌우함 |
| 3 | 구현 시작 | 기술 선택, 상태 흐름, 데이터 스키마, 저장/세이브, CI | 구현 중 구조가 흔들리지 않게 함 |
| 4 | 테스트 | 자동 빌드, 수동 QA 시나리오, 성능/FPS/메모리, 모바일 화면 검증 | “실행됨”과 “플레이 가능함”은 다름 |
| 5 | 배포 | 배포 환경, 버전, 릴리즈 노트, 롤백, 스토어/웹 메타 | 외부 유저에게 안정적으로 전달해야 함 |
| 6 | 없음 | 분석/로그, 밸런스 패치, 이벤트/시즌, 사용자 피드백 루프 | 출시 후 게임이 살아남는 핵심 |

## 3. 표준 제작 단계

### Phase 0. 레퍼런스 분석 & 게임 후보 선정

| 산출물 | 체크리스트 |
|---|---|
| Reference Matrix | 3~5개 게임의 코어 루프, 조작, 난이도, 보상, 메타, 아트, 오디오 분석 |
| Game Candidate Sheet | 게임명 후보, 타깃 유저, 한줄 피치, 1분 재미, 5분 난이도, 차별점 |
| Risk List | 구현 난이도, 에셋 난이도, 카피캣 위험, 모바일 조작성 위험 |

완료 조건:
- “왜 이 게임을 지금 만들 가치가 있는가?”에 한 문장으로 답할 수 있음
- MVP에서 버릴 기능과 꼭 넣을 기능이 구분됨

### Phase 1. 원페이지 피치 & 코어 루프

| 항목 | 예시 템플릿 |
|---|---|
| 한줄 피치 | “한 손 드래그로 똥을 피하며 5분 뒤 미친 난이도에 도전하는 세로형 레트로 생존 아케이드” |
| 30초 루프 | 이동 → 위험 회피 → 점수/코인/콤보 피드백 → 난이도 상승 → 반복 |
| 실패 루프 | 피격 → 결과 확인 → 코인/기록 확인 → 재시작/이어하기 |
| 보상 루프 | 코인 획득 → 스킨/배경 해금 → 다음 판 동기 부여 |

완료 조건:
- 30초 안에 재미가 느껴지는 프로토타입 목표가 명확함
- 조작이 한 문장으로 설명됨

### Phase 2. GDD/시나리오/시스템 설계

필수 문서:
- `docs/scenario-full.md`: 세계관, 게임 흐름, 스테이지, 보스, 이벤트
- `docs/design-spec.md`: 좌표계, 판정, 점수, 난이도, 아이템, 경제
- `docs/content-matrix.md`: 캐릭터, 적, 배경, 아이템, UI, 오디오 목록

체크리스트:
- 시작/플레이/일시정지/게임오버/상점/랭킹 상태 흐름
- 스테이지별 적 종류와 난이도 파라미터
- 점수 공식과 콤보/보상 공식
- 저장 데이터 구조
- 광고/이어하기 정책
- 접근성: 음소거, 터치 영역, 색상 의존도 최소화

### Phase 3. 아트/오디오 에셋 파이프라인

| 영역 | 산출물 |
|---|---|
| Art Direction | 팔레트, 외곽선, 그림자, 카메라 거리, UI 라운드/두께 규칙 |
| Prompt Sheet | 캐릭터/적/아이템/배경/UI/이펙트/애니메이션 프롬프트 |
| Asset Manifest | key, path, size, frame, usage, status |
| Audio Manifest | music, sfx, ui, duration, volume, trigger |
| Integration Guide | Phaser/Unity 로딩 키, atlas/spritesheet 규칙 |

완료 조건:
- 모든 에셋에 사용처가 있음
- 배경은 기준 해상도 이상이며 stage/theme 최소 3종 존재함
- 에셋은 기존 프로젝트/다른 게임을 참조하지 않고 해당 게임 패키지 안에 독립 존재함
- UI와 게임 오브젝트 스타일이 섞이지 않음
- OGG/PNG/SVG 등 런타임 포맷이 결정됨
- 이미지 에셋은 Asset QA Gate와 Production Demo QA Gate를 통과함
- 사운드 에셋은 Audio QA Gate를 통과하고 pause/home/background 상태 제어가 확인됨

### Phase 3.0 Codex imagegen skill asset rule

최종 production-demo 이미지는 `gpt 이미지젠 스킬` 경로로 생성한다. 생성물에는 외부 이미지 서비스 runner를 두지 않으며, `$CODEX_HOME/generated_images/**`의 결과를 프로젝트 `assets/**`로 복사/통합한다. manifest provenance는 `method: codex-gpt-imagegen-skill`, `sourceSkill: imagegen`, `promptHash`를 가져야 한다. 품질 미달 이미지는 재생성한다.

### Phase 3.1 이미지 에셋 QA Gate

이미지 에셋은 생성 자체보다 **게임에서 고품질로 읽히는지**가 중요하다. `Asset QA Agent`는 아래 기준으로 통과/실패를 판정한다.

| QA 축 | 통과 기준 | 실패 예시 | 확인 방법 |
|---|---|---|---|
| 해상도/비율 | manifest의 기준 크기와 일치, 배경은 기준 해상도 이상 | 1080×1920 배경이 카드 비율로 생성됨 | `identify`, manifest diff |
| 투명도 | 캐릭터/아이템/적은 배경 투명, 불필요한 흰 박스 없음 | PNG 주변 흰 배경, 검은 테두리 잔상 | alpha 채널 검사, checkerboard preview |
| 크롭/여백 | 오브젝트가 잘리지 않고 8~15% 안전 여백 유지 | 머리/발/이펙트가 이미지 밖으로 잘림 | contact sheet 육안 검수 |
| 스타일 일관성 | 외곽선, 광원, 그림자, 채도, 렌더링 톤 통일 | 캐릭터마다 화풍/두께/시점이 다름 | reference sheet 비교 |
| 판독성 | 실제 게임 크기에서 0.2초 안에 위험/보상 구분 | 코인과 적 색이 비슷함 | 1080×1920 실제 배치 스크린샷 |
| AI 결함 | 손가락/눈/텍스트/프레임 왜곡 없음 | 손가락 6개, 이상한 한글, 깨진 얼굴 | 확대 검수 + 실제 크기 검수 |
| 애니메이션 | 프레임 중심점/스케일/광원 일관 | 걷기 프레임마다 키가 튐 | spritesheet frame overlay |
| 충돌 친화성 | 시각 크기와 히트박스 설계가 분리 가능 | 투명 여백 때문에 판정이 어긋남 | debug hitbox overlay |
| 파일 최적화 | 용량/포맷이 런타임에 적절 | 1개 아이콘이 수 MB | `du`, 압축/atlas 검사 |
| 라이선스/출처 | 생성 프롬프트/모델/외부 출처 기록 | 출처 불명 이미지 혼입 | asset manifest field 검사 |

Asset QA Agent 산출물:

```text
assets/qa/asset-qa-report.md
assets/qa/contact-sheet.png
assets/qa/failures/*.png 또는 issue 목록
```

판정:
- `PASS`: 바로 게임 적용 가능
- `FIX`: 프롬프트/크롭/리사이즈/투명도 수정 후 재검수
- `REJECT`: 스타일/해상도/AI 결함이 커서 재생성

### Phase 3.2 사운드 에셋 생성 & QA Gate

모든 게임은 최소 오디오 팩을 가진 상태로 MVP를 시작한다. 무음 프로토타입은 피드백 품질을 검증하기 어렵다.

| 분류 | 최소 에셋 | 권장 길이 | 예시 트리거 |
|---|---|---:|---|
| UI | button, confirm, cancel | 0.05~0.2s | 버튼, 탭, 메뉴 전환 |
| Gameplay SFX | move/dodge, collect, hit, warning | 0.08~0.8s | 이동, 회피, 획득, 피격 |
| Reward SFX | coin, combo, new best, mission clear | 0.2~1.2s | 보상/기록/업적 |
| Power/Boss SFX | powerup, boss appear, boss attack, boss defeat | 0.3~1.5s | 파워업/보스 상태 변화 |
| Music | menu loop, gameplay loop, optional boss loop | 20~90s loop | 홈/게임/보스 |
| Ambient | optional environment loop | 10~60s loop | 배경 테마 |

Audio QA 기준:

| QA 축 | 통과 기준 | 확인 방법 |
|---|---|---|
| 포맷 | Web: OGG Vorbis 우선, 필요 시 MP3/AAC fallback | `ffprobe` |
| 샘플레이트 | 44.1kHz 또는 프로젝트 표준 | `ffprobe` |
| 루프 | BGM loop seam이 튀지 않음 | waveform/실청 |
| 클리핑 | 피크 깨짐 없음, 과도한 loudness 없음 | meter/실청 |
| 믹스 | SFX가 BGM 위에서 들림, UI가 너무 크지 않음 | 게임 내 실청 |
| 중복 재생 | dodge/click 같은 반복음은 throttle/variation 존재 | runtime QA |
| 상태 제어 | pause/home/background에서 음악 정지 또는 pause | runtime QA |
| manifest | key/path/category/trigger/volume/duration 기록 | audio manifest 검사 |

### Phase 3.3 게임별 필수 에셋 팩

아래 항목은 파일을 공유하라는 뜻이 아니다. 새 게임마다 같은 종류의 역할 에셋을 **해당 게임 전용으로 신규 생성**한다. 런타임 공통 에셋 풀, 루트 에셋 참조, 다른 generated 게임 에셋 재사용은 금지한다.

| 팩 | 포함 항목 |
|---|---|
| Loading Pack | 로고, 로딩바, 로딩 아이콘, 팁 패널 |
| UI Pack | play, pause, home, restart, settings, sound, shop, ranking 버튼 |
| Feedback Pack | warning, fantastic/combo, game over, new best 메시지 |
| FX Pack | explosion, smoke, sparkle, shield, hit flash |
| Audio Pack | UI click, warning, collect, hit, game over, gameplay loop |

### Phase 4. 기술 아키텍처 & 구현 계획

필수 결정:
- 엔진: Phaser 3 / Unity 2D / Godot 중 선택
- 기준 해상도: 예) 1080×1920 portrait
- 입력: 드래그/탭/좌우 버튼 등
- 오브젝트 풀링 범위
- 씬 구조: Boot/Loading/Home/Game/Pause/GameOver는 공통 Foundation
- 저장/랭킹/상점 데이터
- 오디오 상태 제어: 홈/일시정지/백그라운드에서 BGM 동작 규칙
- 배포 경로: GitHub Pages, Cloudflare Tunnel, Vercel, 앱 패키징
- 공통 기능 체크: `common-game-systems-checklist.md` 기준

구현 순서:
1. 부트/로딩/에셋 로더
2. 홈/게임/일시정지/게임오버 씬
3. 플레이어 입력
4. 적 스폰/충돌/점수
5. 난이도/스테이지
6. 코인/상점/저장
7. 파워업/보스/이벤트
8. 사운드/이펙트/진동
9. QA/배포

### Phase 5. MVP 제작

MVP 완료 조건:
- 설치/실행 명령 하나로 실행 가능
- 1분 플레이가 가능함
- 피격/게임오버/재시작이 안정적임
- 점수와 최고점이 저장됨
- 최소 1개 배경, 1개 플레이어, 1개 적, 1개 SFX가 적용됨

### Phase 6. 콘텐츠 확장

확장 우선순위:
1. 난이도 패턴과 예고 마커
2. 코인/상점/스킨
3. 파워업
4. 보스
5. 미션/업적
6. 시즌 이벤트
7. 광고/이어하기

### Phase 7. QA/밸런싱/성능

| 검증 | 체크 |
|---|---|
| Build Gate | `npm run build` 또는 엔진별 빌드 성공 |
| Runtime Smoke | 홈 → 플레이 → 일시정지 → 재개 → 게임오버 → 재시작 |
| Mobile Layout | 9:16, 노치/안전영역, 터치 영역, 텍스트 겹침 |
| Performance | 60 FPS 목표, 오브젝트 풀링, 메모리 증가 없음 |
| Balance | 30초 쉬움, 1분 도전, 5분 극한 난이도 |
| Asset QA | 배경 크기, imagegen provenance, 투명 배경, 프레임 간 크기, 색/외곽선 일관성 |
| Audio QA | 중복 재생 과다 없음, 음소거/일시정지 동작, 볼륨 밸런스 |

### Phase 8. 배포/릴리즈

필수 항목:
- 배포 URL
- 버전 태그
- 릴리즈 노트
- 스크린샷
- README 업데이트
- 롤백 방법
- known issues

### Phase 9. 운영/업데이트

출시 후 루프:
- 플레이 로그/피드백 수집
- 이탈 지점 확인
- 난이도/코인 밸런스 조정
- 신규 스킨/배경/시즌 이벤트 추가
- 주간/일일 미션 운영

## 4. 병렬 에이전트 제작 구조

| 에이전트 | 담당 | 산출물 | 독립 작업 가능 여부 |
|---|---|---|---|
| A. Game Analyst | 레퍼런스 게임 분석 | `reference-matrix.md` | 가능 |
| B. Game Designer | 코어 루프/난이도/경제 | `design-spec.md` | 가능, Analyst 결과 반영 필요 |
| C. Scenario Writer | 세계관/스테이지/보스/이벤트 | `scenario-full.md` | 가능 |
| D. Art Director | 스타일가이드/프롬프트/에셋 리스트 | `asset-plan.md` | 가능, Scenario와 계약 필요 |
| E. Asset QA Agent | 이미지 품질/해상도/투명도/일관성 검수 | `asset-qa-report.md`, contact sheet | 에셋 생성 후 가능 |
| F. Audio Designer | BGM/SFX 목록/트리거/볼륨/생성 | `audio-plan.md`, `audio-manifest.json` | 가능 |
| G. Audio QA Agent | 포맷/루프/볼륨/상태제어 검수 | `audio-qa-report.md` | 오디오 생성 후 가능 |
| H. Engineer | 씬/시스템/데이터/빌드 | `src/`, `impl-plan.md` | Foundation 이후 가능 |
| I. QA Agent | 테스트 매트릭스/버그 재현 | `qa-report.md` | 구현 이후 가능 |
| J. Release Agent | README/배포/릴리즈 체크 | README, deploy config | QA 이후 가능 |

### 안전한 병렬 순서

```text
Round 1: Analyst + Scenario + Art Direction 초안 + Tech Spike
Round 2: GDD 확정 + Asset Manifest + 구현 계획
Round 3: Foundation 구현 + 에셋 생성 + 오디오 생성
Round 4: Gameplay 구현 + UI 구현 + QA 케이스 작성
Round 5: 통합 QA + 밸런싱 + 배포 문서
Round 6: 릴리즈 + 운영 계획
```

## 5. 새 게임 시작용 체크리스트

```markdown
# New Game Kickoff Checklist

## 0. Game Choice
- [ ] 레퍼런스 4개 이상 분석
- [ ] 한줄 피치 작성
- [ ] 차별점 3개 정의
- [ ] MVP 범위와 제외 범위 정의

## 1. Design
- [ ] 30초 코어 루프
- [ ] 실패/재도전 루프
- [ ] 점수/보상/경제 공식
- [ ] 난이도 곡선
- [ ] 스테이지/보스/이벤트

## 2. Assets
- [ ] 스타일가이드
- [ ] 에셋 매니페스트
- [ ] 이미지 프롬프트
- [ ] 애니메이션 프롬프트
- [ ] 실제 게임 크기 contact sheet
- [ ] Asset QA Agent PASS/FIX/REJECT 리포트
- [ ] gpt 이미지젠 스킬 provenance + no 외부 서비스 runner 확인
- [ ] 오디오 목록과 트리거
- [ ] 최소 Audio Pack 생성(UI/수집/경고/피격/게임오버/BGM)
- [ ] Audio QA Agent 리포트
- [ ] 라이선스/출처 정리

## 3. Engineering
- [ ] 엔진/해상도/입력 방식 결정
- [ ] 씬 구조
- [ ] 데이터 저장 스키마
- [ ] 오브젝트 풀링 계획
- [ ] 구현 페이즈 계획

## 4. QA
- [ ] 자동 빌드 통과
- [ ] 모바일 레이아웃 QA
- [ ] 플레이 플로우 QA
- [ ] 성능/FPS/메모리 QA
- [ ] 사운드/일시정지/백그라운드 QA

## 5. Release
- [ ] README
- [ ] 스크린샷
- [ ] 배포 URL
- [ ] 릴리즈 노트
- [ ] known issues
- [ ] 다음 업데이트 계획
```

## 6. 템플릿 폴더 구조 권장안

> 실제 구현 단계에서는 아래 권장 구조와 함께 저장소 루트의 현재 `Don't Get Pooped!` 프로젝트 형식(`src/scenes`, `src/systems`, `src/ui`, `assets/manifest.json`, `docs/DEV-GUIDE.md`)을 참고한다. `dev_game`이 만든 starter는 최소 Foundation이고, 출시형 구조는 실제 프로젝트 패턴으로 확장한다.


```text
new-game/
├── docs/
│   ├── 00-reference-analysis.md
│   ├── 01-one-page-pitch.md
│   ├── 02-scenario.md
│   ├── 03-design-spec.md
│   ├── 04-asset-plan.md
│   ├── 05-audio-plan.md
│   ├── 06-implementation-plan.md
│   ├── 07-qa-plan.md
│   └── 08-release-plan.md
├── assets/
│   ├── imagegen/
│   ├── audio/
│   └── manifest.json
├── scripts/
│   ├── generate_assets.*
│   └── generate_audio.*
├── src/
└── README.md
```

## Schema v2 custom-loop vertical slice

기존 arcade Foundation 의미가 맞지 않으면 v2 `custom-shell`로 시작한다. 이 shell은 gameplay 완료물이 아니며, 1스테이지 vertical slice를 먼저 완성한다. 구현 완료 전 `implementationStatus: foundation`, 완료 후에만 `production-demo`를 사용한다. Rules Contract, required asset roles, declared capture matrix, first-play clarity, one-shot transition input, audio/persistence/long-run adapter를 포함하고 `factory:production-gate -- --mode custom-loop-full`로 검증한다. 에셋 해상도와 패딩 숫자는 production demo quality contract의 authoritative 표만 참조한다.
