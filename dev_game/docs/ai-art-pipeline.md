# AI Art Pipeline — 프로덕션급 에셋 생산

`dev_game`가 "고품질 1차 프로덕션급 데모"를 실제로 **생산**하는 핵심 단계다. 게이트(`production-demo-qa`)가 검사만 하던 것을, 이 파이프라인이 진짜 AI 아트로 채운다.

> ## ⚠️ 게임 완성도 티어 — 무엇으로 개발하나
>
> **전제:** Claude는 이미지를 만들지 못한다(네이티브 이미지 생성 도구 없음). 프로덕션급 이미지 에셋은
> `gpt 이미지젠 스킬`(`codex exec` → `.system/imagegen`, ChatGPT 인증, 외부 인증값 불필요)으로만 나온다.
>
> **⭐ 추천 — Codex 전용으로 게임 개발 → 프로덕션 MVP (최고 완성도):** 게임 코드와 프로덕션급 이미지
> 에셋을 **모두 Codex 한 환경에서 네이티브로 생산**한다. 크로스툴 핸드오프가 없어 가장 높은 완성도의
> 프로덕션 MVP가 나온다. 아트 완성도를 최우선으로 하면 이 경로를 권장.
>
> **완성도 높은 게임 (하이브리드) = Claude(엔진·로직·QA·프롬프트) + Codex(프로덕션 이미지 에셋).**
>
> **Claude 단독 = 2D 플레이스홀더 / 저품질 (비추천).** Codex 단계를 건너뛰면 `image-quality-qa`에서 FAIL한다.

## 한 번에 만들기 (make-game) — 권장

아이디어/스펙 하나로 스캐폴드→기획문서→AI 아트→검증까지 한 명령에 끝낸다:

```bash
# 스펙으로
npm --prefix dev_game run factory:make -- --spec generator/examples/poop-dodge.spec.json --out dev_game/generated/poop-dodge
# 이름만으로 (기본 스펙 + AI 아트)
npm --prefix dev_game run factory:make -- --name "Meteor Dash" --out dev_game/generated/meteor-dash

# 옵션: --stages N | --skip-art(구조만) | --gate none|demo|full | --with-pwa | --no-sfx
```

`make-game.mjs`가 아래 4단계를 순서대로 실행하고, 각 단계 실패 시 중단한다. 세부 제어가 필요하면 아래 개별 스크립트를 직접 쓴다.

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
| 4. 완료 게이트 | `factory:production-gate -- --project <dir>` | validate·smoke·asset-qa·browser-smoke·production-demo-qa·image-quality-qa·visual-layout-qa·scene-composite-qa 전부 |

## 3단계: codex-imagegen (핵심)

`codex-imagegen.mjs`는 **Codex `imagegen` 스킬의 built-in `image_gen` 도구**를 `codex exec`로 구동해 아트를 만든다.

- 이미지 SDK runner, 외부 인증 대기, 외부 서비스 호출 스크립트를 생성물에 두지 않는다. `gpt 이미지젠 스킬` 경로만 사용한다.
- 작동하는 codex 바이너리를 자동 탐지한다(nvm 설치가 깨져 있어도 antigravity/vscode 확장의 네이티브 바이너리를 글롭으로 찾음). 필요 시 `DEVGAME_CODEX_BIN=/path/to/codex`로 지정.
- **배경**: 직접 생성(캔버스 크기 이상 래스터).
- **스프라이트**: flat 크로마키 배경으로 생성 후 `~/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py --auto-key border`로 투명화.
- 생성/존재하는 에셋을 manifest에서 `quality:"production-demo"` + `provenance:{source:"generated-for-game", generatedFor:<id>, method:"codex-gpt-imagegen-skill", sourceSkill:"imagegen", promptHash:<hash>}`로 승격하고, 배경 3종+핵심 스프라이트가 모두 실아트면 `qualityTier:"production-demo"`로 올린다.
- `--only wire`: 재생성 없이, 이미 존재하는(또는 외부 생성/복원된) 에셋으로 **게임 코드만 배선**(LoadingScene가 PNG 경로 로드, StageManager가 배경 표시) + manifest 승격.

### 게임 연동 (wireGameToAssets)
`publicDir: assets`이므로 `assets/characters/player.png` → Phaser 로드 경로 `characters/player.png`.
- LoadingScene: 스프라이트 svg→production PNG 경로 remap + `bg_0..N` 스테이지 배경 로드
- StageManager: `bg_0..N` 텍스처로 배경 표시 + 난이도 레벨↑ 시 크로스페이드 전환
- HomeScene: 단색 → `bg_0` 이미지


## Scene-first Artboard Workflow — 전체 화면 먼저, 분리 후 검증

고품질 게임 에셋은 개별 아이콘을 흩어서 만든 뒤 화면에 맞추는 방식만으로는 부족하다. 신규 게임은 먼저 대표 장면을 완성된 화면으로 설계하고, 그 화면에서 필요한 에셋을 분리해 runtime에 재조합한다.

필수 절차:

1. **장면 아트보드 생성**: Loading/Home/Game/Pause/GameOver를 게임 해상도 기준으로 먼저 만든다. 배경, playfield, HUD, 버튼, 결과 패널이 동시에 보이는 기준 이미지를 둔다.
2. **분리 계획 작성**: `asset-plan.json`에 `artboard`, `cropBox`, `role`, `displaySize`, `safePadding`, `sliceMode(plain/9-slice/sprite-sheet)`를 기록한다.
3. **에셋 분리/투명화**: crop 원본(`rawPath`)과 production PNG를 모두 남긴다. gameplay 오브젝트는 내부 면적이 사라지지 않도록 alpha coverage를 검사한다.
4. **런타임 재조합**: Phaser scene이 아트보드의 의도와 같은 배치·비율로 표시하는지 `__GAME_LAYOUT_BOUNDS__`에 registry를 남긴다.
5. **장면 캡처 QA**: `factory:scene-composite-qa`로 실제 브라우저 화면을 캡처해 버튼 라인, 잘린 stamp, 투명 박스, 끊긴 컨베이어, 외부 tooltip overlay를 자동 검사한다.

필수 QA 산출물:

```text
assets/artboards/home.png
assets/artboards/game.png
assets/artboards/pause.png
assets/artboards/gameover.png
assets/artboards/slice-map.json
assets/qa/contact-sheets/<scene>-comparison.png
dev_game/.tmp/scene-composite-qa/<game-id>/*.png
```

이 과정을 생략하면 파일별 QA는 통과했는데 실제 화면에서 박스/버튼/패널이 깨지는 문제가 다시 발생한다.

## 🔒 이미지 품질 강제 규정 (MANDATORY)

**모든 출시 이미지는 gpt 이미지젠 스킬 산출물이어야 한다. 임의/절차적/API 생성은 금지**되며, 게이트가 자동으로 강력 차단한다:

1. **provenance 강제**: `production-gate`가 `--require-gpt-imagegen`을 상시 주입 — 모든 manifest 이미지에 `method:"codex-gpt-imagegen-skill"`·`model`·`sourceSkill`·`promptHash`가 없으면 FAIL.
2. **역할별 픽셀 게이트** (`factory:image-quality-qa`, production-gate 내장): 본 프로젝트(똥 피하기) 출시 에셋 실측을 기준으로 하되, 신규 장르의 실제 표시 크기와 role을 반영해 판정한다.
   - 배경: **≥1080×1920** + 색수 ≥8000 + 엣지분산 ≥100 (본 게임: 1080×1920 / 16K~25K / 172~480)
   - 코어 스프라이트: role별 최소변(플레이어 320px+, 택배/소품 220px+, chute/목표물 260px+ 등) + 색 ≥3000 + 엣지 ≥150 + 투명 필수
   - UI ≥96px·색1500·엣지100 / FX·feedback ≥128px·색3000·엣지200
   - **placeholder 자동 탈락**: 색<2000 또는 엣지<60 (절차적 draft는 색≈1085/엣지≈16 → 절대 통과 불가)
3. **필수 집합 강제**: 배경 3+ / spec의 `requiredAssetRoles` / button·pause UI / feedback·FX (v1만 player/hazard/collectible compatibility role 사용) — 하나라도 manifest에 없으면 FAIL (코드 폴백으로 출시 금지).
4. 미달 시 조치는 하나뿐: **더 강한 프롬프트로 imagegen 재생성**. 게이트 완화·수치 조작·수동 편집으로 우회하지 않는다.

## 고품질 재생성 프롬프트 원칙

이미지 품질이 부족하면 수정 코드로 덮지 말고 다시 생성한다. 프롬프트에는 다음을 명시한다.

- `high-quality mobile game production asset`, `crisp clean outline`, `consistent lighting`, `no watermark`, `no random text`
- 배경: `vertical 1080x1920 or larger`, `safe central play area`, `layered depth`, `no characters`, `no UI`
- 스프라이트/버튼/패널: `flat solid chroma-key background`, `generous padding`, `not cropped`, `no shadow touching edge`, `consistent style sheet`
- UI: 버튼은 원본 비율 유지가 쉬운 9-slice/rounded rectangle 형태, 상단 하이라이트가 글자와 겹치지 않게 요청
- 실패 기준: blurry, squashed, clipped, gray/chroma residue, mismatched style, duplicated icon/text, canvas보다 작은 background

## 게임 필(game feel) 기본 탑재 — 생성물 표준 요건

cli.mjs가 생성하는 모든 게임은 아래를 **기본 포함**한다(단일 스프라이트만으로도 "살아있는" 느낌):

- **장르 정의 motion(필수):** 플레이어가 있는 게임은 이동/공격/피격 상태를, 지휘·퍼즐·시뮬레이션 게임은 명령 실행/위험 확산/성공·실패 feedback을 시간축에서 구분한다. player animation을 모든 장르에 강제하지 않되, 핵심 행동을 정적 스프라이트 교체만으로 끝내지 않는다.
- **Juice:** 피격 화면 흔들림·플래시, 획득/피격 시 AI FX 버스트(fx_collect/fx_hit).
- **StageManager:** 난이도 레벨↑에 따라 스테이지 배경 크로스페이드 전환.
- **버튼 피드백:** 누름 시 살짝 축소 후 복귀. AI 프레임 버튼은 `setDisplaySize`로 크기를 유지해야 하며, `setScale` 절대값을 쓰면 텍스처 원본 크기로 튀므로 금지.
- **레이아웃 게시:** Home/Game/Pause/GameOver 모든 씬이 `__GAME_LAYOUT_BOUNDS__`를 게시해 visual-layout-qa(겹침/safe-area)를 통과.

> production-demo 완료 기준: 핵심 상호작용은 **입력 전·실행 중·결과 상태가 시각적으로 구분**되어야 한다.

## 투명화/시트 통합 실패 방지

GPT Imagegen으로 만든 시트는 통합 단계에서 망가질 수 있다. 특히 flat/chroma 배경 제거 tolerance가 높으면 박스, 컨베이어, 버튼 bevel, stamp 외곽이 “투명 처리”되어 화면에서 속 빈 선화처럼 보인다.

통합 스크립트 필수 규칙:

- `remove_bg`는 단일 corner median만 믿지 말고 edge palette 또는 chroma-key 기준을 사용한다.
- gameplay 구조물(`parcel`, `vehicle`, `sort-bin`, `scanner`, `conveyor`)은 role별 alpha coverage gate를 가진다.
- raw crop과 production PNG를 모두 저장하고 manifest provenance에 `sourceSheet`, `rawPath`, `cropBox`를 남긴다.
- production PNG의 alpha bbox가 canvas edge에 너무 붙으면 UI/feedback은 실패 처리한다.
- stamp/badge는 square canvas를 사용하고, 투명 패딩 숫자는 production quality contract의 authoritative 6~10% 규격을 따른다.
- 버튼은 imagegen 결과를 그대로 비율 왜곡해 쓰지 않는다. 9-slice 또는 procedural button base 위에 텍스트를 얹고, imagegen은 장식/스킨으로 제한할 수 있다.
- panel/frame은 한 장짜리 raster를 무리하게 확대하지 않는다. rounded-rect/procedural panel 또는 9-slice frame을 기본으로 한다.
- 화면 QA는 Home뿐 아니라 Game/GameOver에서 실제 runtime screenshot을 확인한다. 컨베이어·도로·바닥·박스·버튼이 투명해 보이면 통합 실패다.

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
- built-in imagegen 경로는 투명 배경을 직접 보장하지 않으므로 스프라이트는 flat 크로마키 배경으로 생성 후 제거에 의존한다(테두리 자동감지). 복잡한 실루엣은 재시도가 필요할 수 있다.
- 에셋은 **최대 네이티브 해상도로 생성**하고 게임에서 축소 표시한다(크리스프). 배경은 canvas 이상, 권장 2160×3840 원본을 우선한다.
- 이미지가 흐리거나 찌그러지거나 스타일이 맞지 않거나 배경/패널 잔여물이 보이면 통합하지 말고 더 강한 고품질 프롬프트로 재생성한다.
- 생성된 프로젝트(`generated/*`)는 `.gitignore` 대상 — 재현 자산은 파이프라인 스크립트지 산출물이 아니다.

### 해상도·패딩 단일 원본

구체적인 배경/아트보드/캐릭터/시트/오브젝트/UI/아이콘 해상도와 6~10% 패딩, 회전·FX 최대 12% 예외는 [`production-demo-quality-contract.md`의 공통 고해상도 에셋 규격](production-demo-quality-contract.md#205-공통-고해상도-에셋-규격--authoritative-source)을 따른다. 이 문서에는 다른 숫자를 두지 않는다.
