# 프로젝트·포함 스킬 전문가 검토

- 검토일: 2026-08-16 KST
- 대상: 루트 Phaser 게임, `dev_game` 게임 팩토리/QA, 프로젝트 내장 스킬 4종, CI·배포·문서
- 방식: 정적 코드 검토, 부정 테스트, 빌드/E2E/팩토리 게이트 실행, 스킬 구조·메타데이터·검증기 검토
- 심각도: `S1` 완료/게임 성립을 잘못 판정하는 핵심 결함, `S2` 출시·운영 전 수정 권고, `S3` 유지보수 개선

## 1. 총평

이 저장소는 단일 미니게임보다 **게임 제작 플랫폼**에 가깝다. 루트 게임의 시스템 분리, 에셋 provenance, 런타임 파일 allowlist, 다중 뷰포트 QA, 스킬 단일 원본/심링크 구조는 강점이다.

반면 현재 가장 큰 위험은 두 가지다.

1. `game-factory`의 기본 one-command 경로가 빌드·브라우저·엄격 provenance 검증 없이도 결과를 `Production-demo`라고 선언할 수 있다.
2. 루트 게임은 모바일 첫 진입에 약 34.8MB의 런타임 에셋을 한 번에 선로딩하며, 보스 중 발생한 스테이지 전환을 영구히 놓칠 수 있다.

| 영역 | 평가 | 요약 |
|---|---:|---|
| 루트 게임 구조 | 7/10 | config·scene·system 분리는 양호하나 상태 전환 회귀 테스트가 부족 |
| 루트 게임 런타임/모바일 | 4/10 | 과도한 선로딩과 스테이지 전환 누락 위험 |
| 게임 팩토리·QA | 6/10 | 아티팩트 품질 게이트는 강하지만 기본 완료 판정과 게임 의미 검증에 구멍 |
| 포함 스킬 설계 | 7/10 | 경계·참조 구조는 좋으나 트리거 중첩과 실행 불가능 명령 존재 |
| 테스트·CI·배포 | 6/10 | 팩토리 CI는 강함, 루트 게임 PR 게이트는 약함 |
| 문서·에셋 정합성 | 5/10 | 최신 PNG 런타임과 기존 SVG manifest/README가 충돌 |

## 2. 우선순위별 발견 사항

### S1-01. 기본 `factory:make`가 깨진 산출물도 Production Demo로 인증할 수 있음

근거:

- `dev_game/generator/scripts/make-game.mjs:28`의 기본 게이트는 `demo`다.
- `dev_game/generator/scripts/make-game.mjs:210-219`는 기본 경로에서 `production-demo-qa`만 실행하고 `✔ Done. Production-demo game`을 출력한다.
- 이 경로는 `npm run build`, 브라우저 smoke, image-quality, visual-layout, scene-composite를 실행하지 않는다.
- `skills/game-factory/SKILL.md:80-92`는 같은 기본 명령을 전체 파이프라인 fast path로 제시한다.

부정 테스트 결과:

- `src/main.js`에 문법 오류를 삽입한 `/tmp/bullseye-rush`가 `production-demo-qa --require-gpt-imagegen`을 통과했지만 실제 `vite build`는 실패했다.
- 생성 영수증 SHA와 다른 WebP를 넣은 `/tmp/last-minute-keeper`가 기본 `production-demo-qa`를 통과했고, `--require-gpt-imagegen`을 추가했을 때만 실패했다.
- 기본 `make-game` 호출은 이 엄격 provenance 플래그도 전달하지 않는다.

영향: “완료”라는 가장 중요한 상태가 거짓 양성이 될 수 있다.

권고:

1. `factory:make` 기본값을 `--gate full`로 바꾼다.
2. `demo`는 `artifact-contract-only`처럼 오해 없는 이름으로 바꾸고 완료 선언을 금지한다.
3. 성공 판정은 반드시 build + runtime delivery + strict provenance + browser/layout/composite를 포함한다.
4. `PRODUCTION-DEMO-NOT-VERIFIED.json`은 full gate 성공 시에만 제거한다. 현재 성공 경로에는 제거 코드가 없다.
5. `--from qa`에서는 아트 host preflight를 실행하지 않는다. 현재는 QA-only 재개도 Codex/imagegen host 상태에 종속된다.

### S1-02. 보스 중 스테이지 전환이 발생하면 배경·안내가 영구 누락됨

근거:

- `src/scenes/GameScene.js:180-187`은 먼저 `StageManager.update()`로 인덱스를 전진시킨다.
- `src/scenes/GameScene.js:251-255`의 `onStageChange()`는 보스가 활성 상태면 즉시 반환한다.
- 이후 같은 스테이지는 `changed: false`가 되므로 보스 종료 후 재적용되지 않는다.

재현 계산:

- 중간 보스는 120초에 시작해 약 32초 지속된다.
- 146초 스테이지 6 전환은 보스 중 무시된다.
- 153초에는 이미 StageManager 인덱스가 6이라 `changed: false`다.
- 최종 보스 중 220초 스테이지 8도 같은 방식으로 누락될 수 있다.

영향: 스폰 풀은 새 스테이지를 사용하지만 화면 배경과 등장 배너는 이전 스테이지에 남아 플레이 정보가 어긋난다.

권고: 보스 중 전환을 `pendingStageChange`로 저장하고 보스 격파 직후 적용하거나, StageManager 인덱스 갱신 자체를 보스 종료까지 보류한다. 120→153초, 195→237초 시나리오를 회귀 테스트로 고정한다.

### S2-01. 모바일 첫 진입 에셋 예산이 과도함

측정:

- `src/config/gameConfig.js`에 선언된 실제 런타임 경로 90개: 약 **34.8MB**.
- `src/scenes/BootScene.js:39-93`이 배경 8종, 상점 카드, 캐릭터, 보스, 파워업, UI, 오디오를 모두 Home 전에 선로딩한다.
- 전체 `dist` 실파일: 약 **57.9MB**. `vite.config.js:11`의 `publicDir: 'assets'` 때문에 레거시 SVG, 중복 PNG, contact sheet까지 함께 배포된다.
- 로컬 브라우저 관측에서도 이미지/오디오 XHR 약 36.9MB가 Home 진입 전에 발생했다.

영향: 모바일 데이터·저속망에서 로딩 이탈 가능성이 높고, 8개 스테이지를 보지 않는 세션에도 전체 비용을 지불한다.

권고:

1. Boot는 Home/스테이지 1/기본 캐릭터/필수 UI만 로드한다.
2. 상점 에셋은 상점 진입 시, 보스/다음 배경은 직전 스테이지에서 prefetch한다.
3. PNG 배경·카드를 WebP/AVIF로 변환하고 역할별 해상도 예산을 둔다.
4. `publicDir` 전체 복사 대신 runtime allowlist 기반 복사를 루트 게임에도 적용한다.
5. 첫 화면 핵심 에셋 예산을 별도 게이트로 둔다.

### S2-02. `game-feel-motion-skill` 검증기가 포함 JSON Schema보다 약함

근거:

- `skills/game-feel-motion-skill/scripts/validate_spritesheet_manifest.py:29-33`은 Python의 `bool`을 정수로 인정한다.
- `:58-113`은 `id`, `type`, `motion`, `loop`의 타입/enum을 검증하지 않는다.
- 실제로 `id: 123`, `type: "banana"`, `motion: false`, `frames: true`, `loop: "yes"`인 manifest를 `[OK]`로 승인했다.
- 이는 `assets/templates/spritesheet-manifest.schema.json` 계약과 모순된다.

권고: JSON Schema 검증을 실제 스크립트에 통합하고, `bool`을 number/integer에서 명시적으로 제외한다. 유효/무효 fixture 기반 회귀 테스트를 추가한다.

### S2-03. `game-polish`의 타깃 에셋 재생성 명령이 실행 불가능함

근거:

- `skills/game-polish/SKILL.md:168`은 `factory:imagegen -- --skip-existing --id "<asset-id>"`를 안내한다.
- 실제 CLI는 `--project`가 필수라 해당 명령은 즉시 `Missing required --project <dir>`로 종료한다.

권고: `--project generated/<game-id>`를 포함하고, 스킬 문서의 모든 실행 예를 CI smoke fixture로 실행한다.

### S2-04. 루트 게임은 PR 단계 자동 검증이 없음

근거:

- 루트 `package.json` 테스트는 GameOver 저장 smoke 한 개뿐이다.
- `.github/workflows/deploy-pages.yml:3-16`은 `main` push와 수동 실행만 정의한다.
- 팩토리 workflow의 PR 검증은 강하지만 루트 `src/**` 변경은 대상이 아니다.

영향: 스테이지·보스·입력·상점·오디오 회귀가 main 병합 후 배포 job에서야 발견되거나, 현재 smoke 범위 밖이면 발견되지 않는다.

권고: 루트 전용 PR workflow에 `npm ci`, build, 저장 smoke, 실제 PLAY 입력 smoke, pause/resume, stage/boss transition, Pages subpath smoke를 추가한다.

### S2-05. 큐레이션 게임의 절대 CSS 에셋 URL을 production gate가 놓침

근거:

- `bullseye-rush`, `road-stream-racer`, `ghost-train-railgun` 일부 CSS가 `url("/backgrounds/...")`를 사용한다.
- `bullseye-rush` production gate는 통과했지만 빌드가 unresolved absolute URL 경고를 출력했다.
- 루트가 아닌 하위 경로 배포에서는 호스트 루트 `/backgrounds/...`를 요청하므로 깨질 수 있다.

권고: dist-runtime QA가 CSS/JS의 절대 런타임 URL도 스캔하고, production browser gate를 `/subpath/<game-id>/`에서 한 번 실행한다.

### S2-06. 스킬 트리거 경계가 메타데이터에서 겹침

근거:

- `game-factory` frontmatter가 `post-production game QA`까지 자신의 트리거로 선언한다.
- `game-polish`도 같은 후보정/QA fix pass를 핵심 트리거로 선언한다.
- 본문을 읽기 전에 적용되는 frontmatter 단계에서 두 스킬이 동시에 선택될 수 있다.
- `game-asset-creation`과 `game-feel-motion-skill`도 sprite-sheet spacing 영역이 일부 중첩된다.

권고: factory는 “새 게임/기능 확장”, polish는 “기존 게임 결함 수정”, asset-creation은 “승인 프레임의 픽셀 보존 재배치”, feel-motion은 “모션 설계·런타임 판정”으로 description을 상호 배타적으로 정리한다.

### S3-01. 루트 에셋 manifest/README가 현재 PNG 런타임과 불일치

- `assets/manifest.json:2-6`은 여전히 `format: svg`, `total_svg: 77`을 정본처럼 선언한다.
- `assets/README.md:1-38`도 standalone SVG와 OGG 10개를 현재 구성으로 설명한다.
- 실제 게임은 `assets/imagegen/**/*.png`와 OGG 13개를 사용한다.

권고: 레거시 manifest임을 명시해 이름을 바꾸거나, 런타임 config에서 manifest를 생성해 단일 원본으로 만든다.

### S3-02. 생성물 추적 정책 설명이 현재 `.gitignore` 예외와 다름

- `skills/game-factory/SKILL.md:51-52,266`과 `skills/game-polish/SKILL.md:149`은 `generated/**`가 기본적으로 전부 untracked라고 설명한다.
- 실제 `dev_game/.gitignore`는 다수 큐레이션 게임을 명시적으로 예외 처리하며 현재 2,000개 이상 생성 게임 파일이 추적된다.

권고: “게임별 allowlist 여부에 따라 다름”으로 고치고 `git check-ignore`로 실제 상태를 확인하도록 안내한다.

## 3. 포함 스킬별 평가

| 스킬 | 강점 | 핵심 개선 |
|---|---|---|
| `game-factory` | 계약 단일 원본, 강한 provenance/asset/layout 게이트, custom-loop 분기 | 기본 fast path를 full gate로 변경, gameplay 의미/승리 가능성 검증 추가 |
| `game-polish` | 증상→클래스→재현→수정→재캡처 루프가 명확 | 실행 예 수정, 수동 assertion의 신뢰성 보강 |
| `game-asset-creation` | 픽셀 보존·기준선·중심 간격 원칙이 구체적 | 반복 cut-and-paste/bbox 계산을 deterministic script로 승격, 메타데이터의 5프레임 예시 축약 |
| `game-feel-motion-skill` | progressive disclosure와 템플릿/QA 자료가 우수 | validator를 schema 수준으로 강화, manifest와 실제 이미지 non-overlap 검사 추가 |

스킬 폴더 형식, frontmatter, repo symlink topology, 로컬 Markdown 파일 링크는 모두 정상이다.

## 4. 검증 결과

| 검증 | 결과 |
|---|---|
| `npm run build` | PASS, JS chunk 크기 경고 존재 |
| `npm test` | PASS — GameOver save smoke |
| Pages 조립 산출물 smoke | PASS — 루트 + Last Light, 390×844 / 430×932 / 1080×1920 |
| `factory:qa` | PASS — skill drift, UI direction, spec, generation, asset, imagegen integrity, browser smoke |
| `factory:production-gate` on `bullseye-rush` 390×844 | PASS, schema v1 captureMatrix compatibility warning 및 절대 CSS URL 빌드 경고 존재 |
| 스킬 `quick_validate.py` 4종 | PASS |
| 스킬 topology/drift | PASS |
| Markdown 로컬 파일 링크 | PASS, 누락 0 |
| invalid spritesheet manifest 부정 테스트 | FAIL — 잘못된 manifest를 validator가 승인 |
| syntax-broken production-demo 부정 테스트 | FAIL — `production-demo-qa`가 승인 |
| tampered receipt 부정 테스트 | 취약점 재현 — 기본 gate는 변조를 승인, strict flag만 정상 차단 |

## 5. 권장 수정 순서

1. `factory:make` 기본 완료 판정을 full gate로 교체하고 false-positive 부정 테스트를 CI에 추가한다.
2. 루트 게임의 보스 중 stage transition pending 처리와 회귀 테스트를 추가한다.
3. 루트 에셋을 단계 로딩하고 runtime allowlist/WebP 기반으로 1차 로드 예산을 줄인다.
4. motion manifest validator와 polish 명령 예를 수정한다.
5. 루트 PR CI와 subpath asset URL 검사를 추가한다.
6. 스킬 frontmatter 경계, generated 추적 설명, 루트 asset manifest를 정리한다.

## 6. 현재 작업 트리 주의

검토 도중 다른 작업에서 `last-minute-keeper` 설정과 신규 play-profile QA 파일, 별도 스킬 리뷰 문서가 동시에 생성·수정되었다. 이 보고서는 해당 변경을 덮어쓰지 않았으며, 아직 추적/통합되지 않은 play-profile QA는 현재 production gate 기능으로 간주하지 않았다.
