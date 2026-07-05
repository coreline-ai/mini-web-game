# AI Art Pipeline — 프로덕션급 에셋 생산

`dev_game`가 "고품질 1차 프로덕션급 데모"를 실제로 **생산**하는 핵심 단계다. 게이트(`production-demo-qa`)가 검사만 하던 것을, 이 파이프라인이 진짜 AI 아트로 채운다.

## 전체 흐름

```
아이디어 → cli.mjs(스캐폴드) → productionize.mjs → codex-imagegen.mjs → 게이트
             Foundation         기획문서5+asset-plan   실제 AI 아트 생성      production-gate GREEN
                                +배경 골격+manifest    +게임에 배선
```

| 단계 | 스크립트 | 산출물 |
|---|---|---|
| 1. 스캐폴드 | `cli.mjs` | Phaser/Vite Foundation(씬·시스템·SVG 플레이스홀더) |
| 2. 프로덕션화 | `factory:productionize -- --project <dir>` | 기획문서 01~05 + `asset-plan.json`(에셋별 생성 프롬프트+스타일가이드) + 래스터 배경 골격 + manifest(stageBackgrounds·assetIsolation·provenance) |
| 3. **AI 아트 생성** | `factory:imagegen -- --project <dir> [--only all\|backgrounds\|sprites\|wire]` | `asset-plan.json` 프롬프트로 실제 배경·스프라이트 PNG 생성, manifest 품질 승격, 게임 코드가 에셋을 로드/표시하도록 배선 |
| 4. 완료 게이트 | `factory:production-gate -- --project <dir>` | validate·smoke·asset-qa·browser-smoke·production-demo-qa·visual-layout-qa 전부 |

## 3단계: codex-imagegen (핵심)

`codex-imagegen.mjs`는 **Codex의 내장 `image_gen` 도구**를 `codex exec`로 구동해 아트를 만든다.

- **OPENAI_API_KEY 불필요.** Codex의 ChatGPT 로그인(auth.json) 인증으로 내장 image_gen이 동작한다. (별도 `gpt-image2` 스킬은 원시 API 키가 필요하므로 이 경로는 쓰지 않는다.)
- 작동하는 codex 바이너리를 자동 탐지한다(nvm 설치가 깨져 있어도 antigravity/vscode 확장의 네이티브 바이너리를 글롭으로 찾음). 필요 시 `DEVGAME_CODEX_BIN=/path/to/codex`로 지정.
- **배경**: 직접 생성(캔버스 크기 이상 래스터).
- **스프라이트**: flat 크로마키 배경으로 생성 후 `~/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py --auto-key border`로 투명화.
- 생성/존재하는 에셋을 manifest에서 `quality:"production-demo"` + `provenance:{source:"generated-for-game", generatedFor:<id>}`로 승격하고, 배경 3종+핵심 스프라이트가 모두 실아트면 `qualityTier:"production-demo"`로 올린다.
- `--only wire`: 재생성 없이, 이미 존재하는(또는 외부 생성/복원된) 에셋으로 **게임 코드만 배선**(LoadingScene가 PNG 경로 로드, StageManager가 배경 표시) + manifest 승격.

### 게임 연동 (wireGameToAssets)
`publicDir: assets`이므로 `assets/characters/player.png` → Phaser 로드 경로 `characters/player.png`.
- LoadingScene: 스프라이트 svg→production PNG 경로 remap + `bg_0..N` 스테이지 배경 로드
- StageManager: `bg_0..N` 텍스처로 배경 표시 + 난이도 레벨↑ 시 크로스페이드 전환
- HomeScene: 단색 → `bg_0` 이미지

## 예시 (meteor-dash 실제 생성)

```bash
cd /path/to/game-dd
node dev_game/generator/src/cli.mjs --spec <spec>.json --out dev_game/generated/meteor-dash --force
node dev_game/generator/scripts/productionize.mjs --project dev_game/generated/meteor-dash --spec <spec>.json
node dev_game/generator/scripts/codex-imagegen.mjs --project dev_game/generated/meteor-dash --only all
node dev_game/generator/scripts/production-gate.mjs --project dev_game/generated/meteor-dash   # GREEN
```

결과: 딥스페이스 배경 3종 + 우주비행사 히어로 + 용암 운석 + 황금 별(모두 투명 AI 아트), production-gate 전체 통과.

## 한계 / 주의
- 이미지 생성은 Codex ChatGPT 계정 쿼터를 소비한다(자율 nested 에이전트, 이미지당 ~40초).
- gpt-image-2는 native transparent를 지원하지 않으므로 스프라이트는 크로마키 제거에 의존한다(테두리 자동감지). 복잡한 실루엣은 재시도가 필요할 수 있다.
- 생성된 프로젝트(`generated/*`)는 `.gitignore` 대상 — 재현 자산은 파이프라인 스크립트지 산출물이 아니다.
