# dev_game — Game Production Template & Factory

`dev_game`는 현재 `Don't Get Pooped!` 프로젝트 수준의 모바일 세로형 웹 아케이드 게임을 반복 제작하기 위한 **분리된 개발 템플릿/자동 생성기 영역**입니다.

> 🤖 **Claude Code 스킬로 사용하기:** 이 팩토리는 프로젝트 스킬 [`.claude/skills/game-factory/SKILL.md`](../.claude/skills/game-factory/SKILL.md)로 연결되어 있습니다.
> Claude Code에서 `/game-factory` 또는 "새 게임 만들어줘"라고 요청하면 컨셉 인터뷰 → 스펙 작성 → 생성 → QA → 확장까지 이 폴더의 생성기와 문서를 따라 자동 진행됩니다.

## 구성

| 경로 | 역할 |
|---|---|
| `docs/new-game-start-guide.md` | 신규 아이디어를 starter로 만들고 실제 프로젝트 형식으로 확장하는 절차 |
| `docs/game-production-template.md` | 게임 선정 → 시나리오 → 에셋 → 구현 → 테스트 → 배포 표준 프로세스 |
| `docs/reference-analysis-4-games.md` | Crossy Road / Jetpack Joyride / Survivor.io / Super Hexagon 분석 |
| `docs/game-archetype-recipes.md` | 레퍼런스 구조를 제작 레시피로 변환 |
| `docs/common-game-systems-checklist.md` | 로딩 화면, 공통 씬, 저장, 오디오, QA foundation |
| `docs/automation-scope-proposals.md` | 병렬 에이전트 기반 자동화 개발 제안 |
| `generator/` | 신규 게임 자동 생성기, schema 기반 검증, 안전한 `--force`, 자동 QA 포함 |
| `generated/` | 생성된 게임 output 기본 위치 |

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


## 정식 검증 스크립트

| 명령 | 검증 내용 |
|---|---|
| `npm run validate` | spec 필수값/모바일 portrait 규칙 검증 |
| `npm run smoke` | starter 파일 생성, 필수 파일, Phaser import, 순환 import, `--no-sfx` 출력 검증 |
| `npm run asset-qa` | 이미지 manifest, SVG 안전성/크기, WAV duration/peak/silence/용량, `--no-sfx` 오디오 미생성 검증 |
| `npm run browser-smoke` | 생성 게임 install/build/preview 후 모바일 viewport에서 canvas 렌더와 PLAY 진입 검증 |
| `npm run qa` | 위 검증을 모두 순서대로 실행 |

`browser-smoke`는 Playwright를 사용하므로 처음에는 `npm --prefix dev_game install` 후 실행합니다.

## 범위 제한

이 factory는 `Don't Get Pooped!`급 MVP를 빠르게 만드는 것이 목적입니다.

포함:

- Phaser/Vite 2D 모바일 portrait starter
- Boot/Loading/Home/Game/Pause/GameOver
- 한 손 조작, 낙하 장애물, 수집물, 점수, 최고점 저장
- 기본 이미지/사운드 플레이스홀더
- 에셋/오디오 QA 기준 문서 + 자동 검사 스크립트

제외:

- 백엔드, 서버 랭킹, 로그인
- 광고 SDK, 결제/IAP
- AI 이미지 API 직접 연동
- 네이티브 앱 빌드 자동화
- 멀티플레이, 레벨 에디터, 대형 ECS/라이브옵스

## CI

`.github/workflows/dev-game-factory.yml`에서 `dev_game` 변경 시 `npm --prefix dev_game run factory:qa`를 실행합니다. Playwright Chromium도 CI에서 명시적으로 설치합니다.

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
