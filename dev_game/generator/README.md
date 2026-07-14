# dev_game Generator

`dev_game/generator`는 `Don't Get Pooped!` 수준의 **모바일 세로형 Phaser/Vite 아케이드 게임**을 빠르게 시작하기 위한 스캐폴드 자동 생성기입니다.

## 범위

포함:

- Phaser 3 + Vite starter
- Boot / Loading / Home / Game / Pause / GameOver
- 한 손 조작(`drag` 기본)
- 낙하 장애물, 수집물, 점수, 최고점 저장
- 기본 이미지 SVG와 절차적 WAV 사운드 플레이스홀더
- 모바일 safe-area, pause on hidden, 오디오 unlock

제외:

- 백엔드, 서버 랭킹, 로그인
- 광고 SDK, 결제/IAP
- 외부 이미지 서비스 직접 호출
- 네이티브 앱 패키징 자동화
- 멀티플레이, 레벨 에디터, ECS 대형 구조

## 사용법

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

생성 후:

```bash
cd dev_game/generated/poop-dodge-demo
npm install
npm run dev
npm run build
```


## 신규 아이디어 제작 흐름

새 게임은 `examples/poop-dodge.spec.json`을 복사해 새 spec을 만들고 `--out ../generated/<game-id>`로 생성합니다. 생성된 starter는 최소 Foundation이므로, 실제 게임 수준의 씬/시스템/에셋 구조는 저장소 루트의 현재 `Don't Get Pooped!` 프로젝트 형식을 참고해 확장합니다.

자세한 절차는 [`../docs/new-game-start-guide.md`](../docs/new-game-start-guide.md)를 확인합니다.

## CLI 옵션

| 옵션 | 설명 |
|---|---|
| `--name <name>` | spec 없이 생성할 때 프로젝트 이름 |
| `--title <text>` | 화면 표시 제목 |
| `--spec <file>` | game-spec JSON |
| `--out <dir>` | 생성 위치 |
| `--template arcade-vertical` | 현재 지원 템플릿, 고정 |
| `--controls drag\|tap-lane\|swipe` | 입력 방식 |
| `--width <number>` / `--height <number>` | 기준 캔버스 크기 |
| `--with-pwa` | webmanifest 생성 |
| `--with-sfx` / `--no-sfx` | procedural WAV 생성 여부, `--no-sfx`는 생성 spec의 `audio.enabled=false`까지 반영 |
| `--dry-run` | 파일 목록만 출력 |
| `--validate-only` | spec 검증만 실행 |
| `--force` | 기존 output 삭제 후 생성 |

## 검증 기준

- `npm run validate`가 spec을 통과해야 합니다.
- `npm run smoke`가 starter 파일을 생성하고 필수 파일, Phaser import, config 순환 import 방지, `--no-sfx` 출력을 확인합니다.
- `npm run asset-qa`가 이미지 manifest, SVG 안전성/크기, WAV duration/peak/silence/용량을 확인합니다.
- `npm run browser-smoke`가 생성된 프로젝트를 install/build/preview한 뒤 모바일 viewport에서 canvas 렌더와 PLAY 진입 console/page error를 확인합니다.
- `npm run qa`는 validate → smoke → asset-qa → browser-smoke 전체 Foundation 게이트입니다.
- production-demo 완료 전에는 루트에서 `npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/<game-id> --viewports 390x844,430x932,1080x1920`를 실행합니다. 이 통합 게이트는 `production-demo-qa`, `image-quality-qa`, `visual-layout-qa`, `scene-composite-qa`까지 포함합니다.
- DPR/source-size 이슈 또는 market-event coverage를 검증할 때는 별도로 `npm --prefix dev_game run factory:hq-screen-quality-qa -- --project dev_game/generated/<game-id>`를 실행합니다. market-event 검증은 `marketConfig.js`가 있는 게임 또는 `--require-market-events` 옵션에서만 필수입니다.
- `factory:scene-composite-qa`는 실제 브라우저 화면을 캡처해 버튼 상단 깨짐, 잘린 stamp/warning 아이콘, 투명/끊긴 박스·컨베이어, 외부 tooltip overlay 같은 파일 단위 QA가 놓치는 화면 결함을 검사합니다.
- `factory:image-quality-qa`, `factory:scene-composite-qa`, `factory:hq-screen-quality-qa`는 Python Pillow가 필요합니다.

## 안전 규칙

- `--force`는 무조건 삭제하지 않습니다. 기본 생성 루트(`dev_game/generated/<game-id>`), 빈 디렉터리, 또는 `.dev-game-generated.json` 마커가 있는 기존 생성물만 덮어씁니다.
- CLI는 `schemaVersion`에 따라 `game-spec.v1.schema.json` 또는 `game-spec.v2.schema.json`을 로드하며, 수치 범위·색상·배열·추가 필드를 검증합니다.
- 현재 starter는 one-hit survival만 지원합니다. `lives.start/max`는 1, `ui.showLives`는 false여야 합니다.
- `browser-smoke`가 Chromium 바이너리를 찾지 못하면 `npx playwright install chromium` 또는 CI의 `npm --prefix dev_game exec playwright install chromium`을 실행합니다.

## Schema v2 custom-loop

기존 `arcade-vertical`은 `game-spec.v1.schema.json` 호환 경로입니다. player/falling-hazard/collectible 의미가 맞지 않는 신규 게임은 `game-spec.v2.schema.json`과 `--template custom-shell`을 사용합니다.

```bash
node generator/src/cli.mjs --spec generator/examples/custom-loop-shell.spec.json --template custom-shell --out generated/custom-loop-shell
node generator/scripts/migrate-spec-v2.mjs --spec <v1.json> --out <v2.json> --mode custom-loop
npm run factory:production-gate -- --project generated/<game-id> --mode custom-loop-full
```

custom-shell은 gameplay를 추측하지 않으며 `implementationStatus: foundation` 상태에서는 Production Demo QA가 실패합니다. 장르 고유 vertical slice, rules, required asset roles, capture matrix, clarity/input/session adapter를 구현한 뒤에만 `production-demo`로 승격합니다.
