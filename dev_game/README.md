# dev_game — Game Production Template & Factory

`dev_game`는 모바일/웹 게임을 반복 제작하기 위한 **LLM Game Studio형 개발 템플릿/자동 생성기 영역**입니다. 고정 archetype만 찍어내는 도구가 아니라, 아이디어를 기획·설계·구현·검증하는 제작 파이프라인입니다.

**중요:** 이 영역의 목표는 단순 실행 데모가 아니라 **고품질 1차 프로덕션급 데모**입니다. Foundation starter는 출발점일 뿐이며, 완료 판정은 `production-demo-qa --require-gpt-imagegen`와 `visual-layout-qa`까지 통과해야 합니다. 공통 런타임 에셋을 재사용하지 않습니다. 새 게임의 이미지/오디오/배경은 항상 해당 게임 전용으로 신규 생성해 generated 프로젝트 내부에 포함합니다. 이미지는 `gpt 이미지젠 스킬` 경로를 사용합니다.

> ⚠️ **게임 완성도 티어 — 무엇으로 개발하나.** Claude(에이전트)에는 네이티브 이미지 생성 도구가 없다. 프로덕션급 이미지 에셋은 **`gpt 이미지젠 스킬`**(ChatGPT 인증, 외부 인증값 불필요)으로만 나온다.
>
> - **⭐ 추천 — Codex 전용 개발 → 프로덕션 MVP (최고 완성도):** 게임 코드와 프로덕션 이미지를 모두 Codex 한 환경에서 네이티브로 생산. 크로스툴 핸드오프가 없어 완성도가 가장 높다. 아트 완성도 최우선이면 이 경로.
> - **완성도 높은 게임 (하이브리드) = Claude(엔진·로직·QA·프롬프트) + Codex(프로덕션 이미지 에셋).**
> - **Claude 단독 = 2D 플레이스홀더 / 저품질 (비추천).** Codex 단계를 건너뛰면 `image-quality-qa`에서 FAIL.
>
> 자세히: [`docs/ai-art-pipeline.md`](docs/ai-art-pipeline.md).

<!-- -->

> 🤖 **Claude Code 스킬로 사용하기:** 이 팩토리는 프로젝트 스킬 [`.claude/skills/game-factory/SKILL.md`](../.claude/skills/game-factory/SKILL.md)로 연결되어 있습니다.
> Claude Code에서 `/game-factory` 또는 "새 게임 만들어줘"라고 요청하면 컨셉 인터뷰 → 스펙 작성 → 생성 → QA → 확장까지 이 폴더의 생성기와 문서를 따라 자동 진행됩니다.

## 구성

| 경로 | 역할 |
|---|---|
| `docs/new-game-start-guide.md` | 아이디어 우선 신규 게임 제작 절차 |
| `docs/llm-game-studio-pipeline.md` | LLM 게임 전문 개발팀형 기획→설계→구현→QA 파이프라인 |
| `docs/production-demo-quality-contract.md` | 고품질 1차 프로덕션급 데모 강제 계약, 배경/에셋/UI QA 기준 |
| `docs/game-production-template.md` | 게임 선정 → 시나리오 → 에셋 → 구현 → 테스트 → 배포 표준 프로세스 |
| `docs/reference-analysis-4-games.md` | Crossy Road / Jetpack Joyride / Survivor.io / Super Hexagon 분석 |
| `docs/game-archetype-recipes.md` | 레퍼런스 구조를 제작 레시피로 변환 |
| `docs/common-game-systems-checklist.md` | 로딩 화면, 공통 씬, 저장, 오디오, QA foundation |
| `docs/automation-scope-proposals.md` | 병렬 에이전트 기반 자동화 개발 제안 |
| `generator/` | 신규 게임 자동 생성기, schema 기반 검증, 안전한 `--force`, 자동 QA 포함 |
| `generated/` | 생성된 게임 output 기본 위치 |

## generated 추적 정책

`dev_game/generated/*`는 기본적으로 재생성 가능한 output이지만, 완성 후보로 보존하는 curated 게임은 `.gitignore` allowlist에 명시해 tracked 상태와 ignore 정책을 일치시킵니다.

- tracked curated 게임: `bullseye-rush`, `castle-archer`, `jungle-arcshot`, `market-panic`, `meteor-dash`, `parcel-sort-rush`, `road-stream-racer`, `rush-lane-racer`, `sky-archer`, `target-shooter-rush`
- 항상 ignore: `node_modules/`, `dist/`, `qa-captures/`, `tmp/`, `scratch/`, `__pycache__/`, `*.pyc`
- `assets/asset-manifest.json`의 `provenance.sourceSheet` 또는 `rawPath`가 가리키는 source sheet는 runtime 필수 자산은 아니지만, tracked curated 게임의 asset provenance 재현성을 위해 보존합니다.
- 새 generated 게임을 커밋 대상으로 승격할 때는 `.gitignore` allowlist, manifest provenance, `06-FINAL-QA-SUMMARY.md`, `07-REGRESSION-CHECKLIST.md`를 함께 확인합니다.

## 빠른 실행

```bash
cd dev_game/generator
npm run validate
npm run dry-run
npm run smoke
npm run asset-qa
npm run browser-smoke
npm run qa

node src/cli.mjs \
  --spec examples/poop-dodge.spec.json \
  --out ../generated/poop-dodge-demo \
  --force
```

생성된 게임 실행:

```bash
cd dev_game/generated/poop-dodge-demo
npm install
npm run dev
npm run build
```

### Curated 게임 10개 실행

현재 curated 게임 10개는 루트 명령으로 함께 관리할 수 있습니다.

```bash
cd dev_game
npm run games:list   # 게임별 고정 URL 확인
npm run games:build  # 10개 production build, 동시성 4
npm run games:smoke  # 게임별 HTTP + visible canvas 브라우저 검증
npm run games:dev    # 10개 개발 서버 동시 실행, Ctrl+C로 전체 종료
```

| 게임 | 개발 URL |
|---|---|
| `bullseye-rush` | `http://127.0.0.1:4310/` |
| `jungle-arcshot` | `http://127.0.0.1:4320/` |
| `road-stream-racer` | `http://127.0.0.1:4330/` |
| `castle-archer` | `http://127.0.0.1:4340/` |
| `parcel-sort-rush` | `http://127.0.0.1:4350/` |
| `target-shooter-rush` | `http://127.0.0.1:4360/` |
| `market-panic` | `http://127.0.0.1:4370/` |
| `meteor-dash` | `http://127.0.0.1:4380/` |
| `rush-lane-racer` | `http://127.0.0.1:4390/` |
| `sky-archer` | `http://127.0.0.1:4400/` |

일부 게임만 실행하거나 검증할 때는 옵션을 전달합니다.

```bash
npm run games:dev -- --only bullseye-rush,sky-archer
npm run games:smoke -- --only market-panic
```

고품질 1차 프로덕션급 데모 완료 게이트:

```bash
npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/<game-id> --require-gpt-imagegen
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/<game-id> --viewports 390x844,430x932,1080x1920
npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/<game-id> --require-gpt-imagegen --viewports 390x844,430x932,1080x1920
```


## Archetype 정책

```text
Archetype은 가능한 게임의 한계가 아니다.
Archetype은 빠르게 시작하기 위한 참고 패턴이다.
```

고정 템플릿으로 맞지 않는 아이디어는 `docs/llm-game-studio-pipeline.md`에 따라 GDD와 기술설계를 먼저 만들고, 공통 shell만 재사용한 뒤 gameplay 시스템을 custom 구현합니다.

## 정식 검증 스크립트

| 명령 | 검증 내용 |
|---|---|
| `npm run validate` | spec 필수값/모바일 portrait 규칙 검증 |
| `npm run smoke` | starter 파일 생성, 필수 파일, Phaser import, 순환 import, `--no-sfx` 출력 검증 |
| `npm run asset-qa` | 이미지 manifest, SVG 안전성/크기, WAV duration/peak/silence/용량, `--no-sfx` 오디오 미생성 검증 |
| `npm run browser-smoke` | 생성 게임 install/build/preview 후 모바일 viewport에서 canvas 렌더와 PLAY 진입 검증 |
| `npm run qa` | Foundation 검증 전체 실행. 이 명령만으로 production-demo 완료가 아님 |
| `npm --prefix dev_game run factory:dist-runtime-qa -- --project generated/<game-id>` | manifest runtime allowlist와 `dist` 파일 집합·SHA-256·용량 budget·금지 provenance 경로 검증 |
| `npm --prefix dev_game run factory:production-demo-qa -- --project <dir> --require-gpt-imagegen` | `qualityTier`, stage backgrounds 3종, 주요 에셋 quality, imagegen provenance, 필수 문서, layout registry 계약 검증 |
| `npm --prefix dev_game run factory:image-quality-qa -- --project <dir>` | Python Pillow 기반 role-aware 이미지 픽셀/알파/디테일 품질 검증 |
| `npm --prefix dev_game run factory:visual-layout-qa -- --project <dir> --viewports 390x844,430x932,1080x1920` | Playwright로 Loading/Home/Game/Pause/GameOver canvas 중앙 정렬, UI safe-area, bounds overlap 검증 |
| `npm --prefix dev_game run factory:scene-composite-qa -- --project <dir> --viewports 390x844,430x932,1080x1920` | Python Pillow + Playwright 기반 화면 단위 recomposition/pixel 결함 검증 |
| `npm --prefix dev_game run factory:hq-screen-quality-qa -- --project <dir>` | 선택형 HQ/DPR/source-size 검증. `marketConfig.js`가 있는 게임은 market-event depth도 함께 검증 |
| `npm --prefix dev_game run factory:production-gate -- --project <dir> --require-gpt-imagegen --viewports 390x844,430x932,1080x1920` | `qa` + `production-demo-qa` + `image-quality-qa` + `visual-layout-qa` + `scene-composite-qa` 통합 완료 게이트 |

`browser-smoke`는 Playwright를 사용하므로 처음에는 `npm --prefix dev_game install` 후 실행합니다.
`image-quality-qa`, `scene-composite-qa`, `hq-screen-quality-qa`는 Python Pillow가 필요합니다. 로컬에서 누락되면 `python3 -m pip install Pillow`로 준비합니다.

## 범위 제한

이 factory의 목표는 자연어 게임 아이디어를 **고품질 1차 프로덕션급 데모** 수준의 작은 웹 게임으로 만드는 것입니다. 기존 archetype은 가능한 게임의 한계가 아니라 빠르게 시작하기 위한 참고 패턴입니다.

포함:

- Phaser/Vite 2D 모바일 portrait starter
- Boot/Loading/Home/Game/Pause/GameOver
- 공통 Foundation: Boot/Loading/Home/Game/Pause/GameOver
- 아이디어 분석용 GDD/기술설계/QA 문서화 흐름
- 기존 archetype 참고 + 필요 시 custom-loop 구현
- 게임별 신규 생성 에셋, production-demo 배경/주요 에셋 manifest 계약과 에셋/오디오 QA 기준
- build/browser smoke, 장르별 gameplay smoke, production-demo QA, visual-layout QA 기준

제외:

- 백엔드, 서버 랭킹, 로그인
- 광고 SDK, 결제/IAP
- 외부 이미지 서비스 직접 연동
- 네이티브 앱 빌드 자동화
- 멀티플레이, 레벨 에디터, 대형 ECS/라이브옵스

## CI

`.github/workflows/dev-game-factory.yml`에서 `dev_game` 변경 시 foundation QA와 curated 10게임 matrix(build, dist-runtime, production-demo, image, HQ)를 실행합니다. 매일 `03:00 KST` 및 수동 실행에는 최대 동시성 2로 10게임 전체 production gate를 추가 실행합니다. 개별 게임을 완료 보고할 때도 `factory:production-gate -- --project ...`를 실행해야 합니다. Playwright Chromium도 CI에서 명시적으로 설치합니다.

`assetLayout` rollout marker가 있는 게임은 `publicDir: false`와 package-local runtime helper를 사용합니다. 따라서 `delivery: "runtime"`으로 명시된 파일만 dev server와 `dist`에 노출되고 `_source`, `references`, `imagegen/raw`, `imagegen/sheets` 같은 provenance 자료는 저장소에 보존되지만 배포되지 않습니다. 상세 계약은 [`docs/runtime-asset-delivery-contract.md`](docs/runtime-asset-delivery-contract.md)를 참고하세요.

## Game Factory Skill 설치

이 저장소는 재사용 가능한 스킬을 함께 제공합니다. 설치 스크립트로 대상별 자동 설치:

```bash
./scripts/install_game_factory_skill.sh          # Codex (~/.codex/skills)
./scripts/install_game_factory_skill.sh claude   # Claude Code (~/.claude/skills)
./scripts/install_game_factory_skill.sh all      # 둘 다
```

수동 설치 (재설치 시 기존 폴더를 먼저 삭제해야 중첩 복사가 되지 않습니다):

```bash
DEST="${CODEX_HOME:-$HOME/.codex}/skills"        # Claude는: "$HOME/.claude/skills"
mkdir -p "$DEST" && rm -rf "$DEST/game-factory"
cp -R skills/game-factory "$DEST/game-factory"
```

설치 후 도구를 다시 시작하고 호출합니다:

```text
Codex:       Use $game-factory to create a new mobile portrait arcade game from this idea: ...
Claude Code: /game-factory  또는  "새 게임 만들어줘: ..."
```

이 저장소 안에서 작업할 때는 설치 없이도 동작합니다 — 프로젝트 스킬 `.claude/skills/game-factory/SKILL.md`가 자동 발견됩니다.
`skills/game-factory/`(설치용)와 `.claude/skills/game-factory/`(프로젝트용)는 **항상 동일해야 하며**, CI가 두 복사본의 diff를 검사합니다.
