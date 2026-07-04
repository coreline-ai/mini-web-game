# New Game Start Guide — dev_game으로 신규 아이디어 게임 만들기

> 목적: 새 게임 아이디어가 생겼을 때 `dev_game`으로 빠르게 playable starter를 만들고, 실제 프로젝트 수준으로 확장하는 절차를 고정한다.

## 1. 신규 아이디어 시작 순서

1. **아이디어를 1문장으로 고정**
   - 예: `한 손 드래그로 운석을 피하고 별을 모으는 60초 생존 게임`
2. **레퍼런스 2~4개 선정**
   - 조작감, 난이도 곡선, 보상 루프, 화면 구성을 각각 참고한다.
3. **spec JSON 작성**
   - `dev_game/generator/examples/poop-dodge.spec.json`을 복사해서 `game.id`, `title`, `hazards`, `collectibles`, `theme`, `scoring`을 바꾼다.
4. **starter 생성**
   - `dev_game/generator`에서 CLI로 `dev_game/generated/<game-id>`에 생성한다.
5. **자동 QA 통과**
   - `validate`, `smoke`, `asset-qa`, `browser-smoke`를 통과해야 구현을 시작한다.
6. **실제 프로젝트 형식으로 확장**
   - 생성 starter는 최소 Foundation이다. 상점, 랭킹, 보스, 배경/캐릭터 스킨, 고급 에셋 구조는 현재 루트 프로젝트 형식을 참고해 확장한다.

## 2. 기본 명령

```bash
cd dev_game/generator
cp examples/poop-dodge.spec.json examples/my-new-game.spec.json
# my-new-game.spec.json 수정

node src/cli.mjs \
  --spec examples/my-new-game.spec.json \
  --out ../generated/my-new-game \
  --force

cd ..
npm run factory:qa
```

생성된 게임 실행:

```bash
cd dev_game/generated/my-new-game
npm install
npm run dev
npm run build
```

## 3. 실제 프로젝트 형식 참고 기준

신규 게임이 starter를 넘어 실제 게임 프로젝트가 될 때는 현재 저장소 루트의 `Don't Get Pooped!` 구현을 참고한다.

| 실제 프로젝트 경로 | 참고할 내용 |
|---|---|
| `src/scenes/` | Home/Game/Pause/Shop/Ranking/Settings 등 실제 씬 분리 방식 |
| `src/systems/` | 점수, 코인, 난이도, 스폰, 파워업, 보스, 음악 시스템 분리 방식 |
| `src/entities/` | 플레이어 등 독립 엔티티 클래스 구조 |
| `src/ui/` | 공통 UI kit, 배경/viewport 처리 방식 |
| `src/config/` | 게임 밸런스/스테이지/아이템 설정 분리 방식 |
| `assets/manifest.json` | 실제 에셋 manifest 구성 방식 |
| `assets/audio/audio-manifest.json` | SFX/BGM 목록과 트리거 정리 방식 |
| `docs/DEV-GUIDE.md` | 구현/실행/검증 가이드 작성 방식 |
| `docs/impl-plan-mvp.md` | MVP 구현 계획 형식 |
| `docs/scenario-full.md` | 시나리오/스테이지/이벤트 문서화 형식 |

## 4. starter와 실제 프로젝트의 차이

| 구분 | `dev_game` starter | 실제 프로젝트 확장 |
|---|---|---|
| 목적 | 5~10분 안에 playable skeleton 생성 | 출시 가능한 게임 구조로 고도화 |
| 씬 | Boot/Loading/Home/Game/Pause/GameOver | Shop/Ranking/Settings/Boss/Event 등 추가 |
| 에셋 | placeholder SVG/WAV | 고품질 PNG/WebP/OGG + manifest QA |
| 시스템 | 점수, 저장, 스폰, 오디오 기본 | 난이도, 코인 경제, 파워업, 업적, 보스, 분석 |
| 검증 | `factory:qa` | build, browser QA, 모바일 레이아웃, 에셋/오디오 QA, 플레이 밸런스 |

## 5. 완료 기준

신규 아이디어 starter는 아래를 모두 통과해야 한다.

- [ ] `game.id`, `title`, `description`이 새 게임에 맞게 변경됨
- [ ] 핵심 조작과 실패 조건이 spec에 반영됨
- [ ] `npm run factory:validate` 통과
- [ ] `npm run factory:smoke` 통과
- [ ] `npm run factory:asset-qa` 통과
- [ ] `npm run factory:browser-smoke` 통과
- [ ] 실제 프로젝트 확장 시 참고할 루트 프로젝트 경로를 확인함
