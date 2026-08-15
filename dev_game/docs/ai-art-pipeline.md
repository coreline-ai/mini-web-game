# AI Art Pipeline — 프로덕션급 에셋 생산

`dev_game`가 "고품질 1차 프로덕션급 데모"를 실제로 **생산**하는 핵심 단계다. 게이트(`production-demo-qa`)가 검사만 하던 것을, 이 파이프라인이 진짜 AI 아트로 채운다.

> ## ⚠️ 게임 완성도 티어 — 무엇으로 개발하나
>
> **전제:** Claude는 이미지를 만들지 못한다(네이티브 이미지 생성 도구 없음). 프로덕션급 이미지 에셋은
> `gpt 이미지젠 스킬`(`codex exec` → `.system/imagegen`, ChatGPT 인증, 외부 인증값 불필요)으로만 나온다.
> **다만 그것이 "Claude는 이 파이프라인을 못 쓴다"는 뜻은 아니다** — Claude는 `codex exec`를 서브프로세스로
> 띄워 같은 아트를 얻는다. 실행 절차는 [호스트 어댑터](#호스트-어댑터)를 따른다.
>
> **⭐ 최고 완성도 — Codex 단독:** 게임 코드와 이미지 에셋을 **모두 Codex 한 환경에서 네이티브로 생산**한다.
> 크로스툴 핸드오프가 없어 가장 높은 완성도의 프로덕션 MVP가 나온다. 아트 완성도 최우선이면 이 경로.
>
> **하이브리드 = Claude(엔진·로직·QA·프롬프트) + Codex(프로덕션 이미지 에셋).** shell-out 어댑터로 한 세션에서 처리한다.
>
> **금지 — Claude가 직접 만든 2D 플레이스홀더로 완료 보고.** `image-quality-qa`에서 FAIL하며, 게이트를 낮춰 우회해서도 안 된다.
> 아트를 못 만드는 환경이면 `--skip-art`로 구조만 만들고 **production-demo 미통과**로 보고한다.

## 호스트 어댑터

이 파이프라인은 특정 CLI 전용이 아니다. **게이트는 프로세스가 아니라 산출물을 검사한다** — `production-demo-qa`는 manifest의 provenance만 확인하고 누가 스크립트를 실행했는지 묻지 않는다. 그래서 아래 두 어댑터가 같은 완료 판정을 공유한다.

| 자기 진단 | 어댑터 | 아트 취득 경로 |
|---|---|---|
| 내장 `image_gen` 도구를 직접 쓸 수 있다 | `codex-native` | 내장 imagegen 직접 호출 또는 `factory:imagegen` |
| 쓸 수 없다 (Claude Code 등) | `claude-shellout` | `factory:imagegen` — 내부에서 `codex exec`를 스폰한다 |
| 쓸 수 없지만 셸은 있다 (기타 호스트) | `shell-sidecar` | 동일. Node ≥18 · codex CLI · ChatGPT 로그인이 필요하며, 스킬은 `install_game_factory_skill.sh --dest <path>`로 설치한다 |
| 셸이 없다 (웹 채팅 LLM) | — | **지원하지 않는다.** 이 파이프라인의 아트 경로는 서브프로세스 실행을 전제한다 |

`codex-imagegen.mjs`는 평범한 Node 스크립트이고 `codex exec`를 서브프로세스로 띄운다. **호출자가 Codex일 필요가 없다.** 어댑터 선택은 사람이 지정하지 않고 아래 Step 0이 판정한다.

### Step 0 — 능력 확인 (아트 전 필수)

```bash
npm --prefix dev_game run factory:host-preflight            # 정적 검사, 무비용
npm --prefix dev_game run factory:host-preflight -- --deep  # 실제 1장 생성까지 검증
npm --prefix dev_game run factory:host-preflight -- --json  # 기계 판독
```

codex 바이너리(실호출 검증) · `codex login status` 인증 · chroma-key helper 존재 · python3+PIL을 확인하고, 실패 시 항목별 복구 방법과 함께 exit 1 한다. `factory:make`는 이 검사를 스테이지 0으로 자동 실행하므로 **아트 불가 호스트는 스캐폴드조차 만들지 않고 중단**한다(`--skip-art` 지정 시 생략).

정적 검사는 "설치·인증은 정상인데 image_gen이 응답하지 않는" 상태를 잡지 못한다. 장시간 생성을 시작하기 전 `--deep` 1회 실행을 권장한다.

### 실행 규약 — 장시간 생성 다루기

이미지 1장이 약 40초, 게임 1개의 계획 자산은 3~25개다. 즉 한 번의 `--only all`이 수 분~십수 분이며, **호출자의 명령 타임아웃(예: Claude Code Bash 툴 최대 600초)을 넘기는 것이 정상**이다. 따라서:

1. **본 생성은 백그라운드 1회**로 돌리고 로그를 폴링한다. 청크 분할을 1차 수단으로 쓰지 않는다.
   ```bash
   npm --prefix dev_game run factory:imagegen -- --project <dir> --only all
   ```
2. **중단·실패 시 재개**한다. 같은 명령에 `--skip-existing`을 붙이면 검증을 통과한 자산은 건너뛰고 없거나 깨진 것만 다시 만든다.
   ```bash
   npm --prefix dev_game run factory:imagegen -- --project <dir> --only all --skip-existing
   ```
3. **개별 자산만 재시도**할 때는 `--id` 글롭 또는 `--only <카테고리>`로 좁힌다. 실패 시 스크립트가 재시도 명령을 직접 출력한다.
   ```bash
   npm --prefix dev_game run factory:imagegen -- --project <dir> --only sprites --skip-existing --id "hero*"
   ```
4. **preflight 실패로 아트가 불가능하면** `--skip-art`로 구조만 만들고 production-demo 미통과로 보고한다. 플레이스홀더를 채워 완료로 보고하지 않는다.

`--skip-existing`은 디스크 자산을 "새로 생성했을 때와 같은 기준"으로 검증한다 — 크기 미달이나 알파 없는(투명화 실패) 자산은 재사용하지 않고 재생성하며, 파싱할 수 없는 포맷은 덮어쓰지 않고 보존한다.

## 한 번에 만들기 (make-game) — 권장

아이디어/스펙 하나로 스캐폴드→기획문서→AI 아트→검증까지 한 명령에 끝낸다:

```bash
# 스펙으로
npm --prefix dev_game run factory:make -- --spec generator/examples/poop-dodge.spec.json --out generated/poop-dodge
# 이름만으로 (기본 스펙 + AI 아트)
npm --prefix dev_game run factory:make -- --name "Meteor Dash" --out generated/meteor-dash

# 옵션: --stages N | --skip-art(구조만) | --gate none|demo|full | --with-pwa | --no-sfx
```

> **경로 기준 주의:** `npm --prefix dev_game`은 작업 디렉터리를 `dev_game/`으로 잡는다. 따라서 `--spec`·`--out` 모두 **`dev_game/` 기준 상대경로**여야 한다. `--out dev_game/generated/x`로 쓰면 `dev_game/dev_game/generated/x`에 생성된다. `--out`을 생략하면 `dev_game/generated/<game-id>`가 기본값이다. 반면 `node dev_game/generator/src/cli.mjs …` 형태는 리포 루트에서 실행하므로 리포 기준 경로를 쓴다.

`make-game.mjs`가 아래 4단계를 순서대로 실행하고, 각 단계 실패 시 중단한다. 세부 제어가 필요하면 아래 개별 스크립트를 직접 쓴다.

## 전체 흐름

```
아이디어 → host-preflight → cli.mjs(스캐폴드) → productionize.mjs → codex-imagegen.mjs → 게이트
             아트 가능?        Foundation         기획문서5+asset-plan   실제 AI 아트 생성      production-gate GREEN
             불가면 여기서 중단                    +배경 골격+manifest    +게임에 배선
```

| 단계 | 스크립트 | 산출물 |
|---|---|---|
| 0. 호스트 확인 | `factory:host-preflight` | 아트 취득 가능 여부 판정 — 불가 시 스캐폴드 전에 중단 (`--skip-art`면 생략) |
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
- `--skip-existing` / `--id <glob>`: 중단된 실행을 재개하거나 실패한 자산만 다시 만든다. 자세한 규약은 [호스트 어댑터](#호스트-어댑터)의 실행 규약 참조.
- 크로마키 제거에 실패한 자산은 **불투명 상태로 조용히 통과하지 않는다** — 자산별 사유(helper 부재 / 실행 실패)를 출력하고 exit 1 한다. helper 부재는 Step 0에서 미리 잡힌다.

### 게임 연동 (wireGameToAssets)
`publicDir: assets`이므로 `assets/characters/player.png` → Phaser 로드 경로 `characters/player.png`.
- LoadingScene: 스프라이트 svg→production PNG 경로 remap + `bg_0..N` 스테이지 배경 로드
- StageManager: `bg_0..N` 텍스처로 배경 표시 + 난이도 레벨↑ 시 크로스페이드 전환
- HomeScene: 단색 → `bg_0` 이미지


## Path A / Path B — 자동 경로와 수동 경로

아트를 만드는 경로는 둘이고 **둘 다 적법**하다. 게이트는 산출물만 보므로 판정 기준도 같다.

| | Path A — 자동 | Path B — 수동 |
|---|---|---|
| 입력 | `asset-plan.json` | `art-prompts.md` |
| 실행 | `factory:imagegen` | 에이전트가 built-in `image_gen`을 직접 호출 |
| 프롬프트 | 스크립트가 조립 | 사람이 씬별로 작성·기록 |
| 적합한 상황 | 표준 아케이드, 대량 자산 | custom-loop, 씬별 세밀 연출 (예: `firebreak-commander`) |
| manifest | 스크립트가 기록 | **작성자가 직접 기록 — 아래 계약 준수 필수** |

Path A는 provenance를 자동으로 채우므로 실수할 여지가 없다. Path B는 사람이 채우므로 아래 체크리스트가 계약이다.

### Path B 최소 계약 — 게이트가 실제로 검사하는 필드 전수

`factory:production-demo-qa -- --require-gpt-imagegen` 기준이며, 각 항목은 `production-demo-qa.mjs`의 검사와 1:1 대응한다. 모든 필드는 `entry.provenance.X`에 두는 것을 권장하지만 `entry.X`도 fallback으로 허용된다.

**A. 모든 엔트리(`stageBackgrounds` + `images`) — 상시 검사**

| # | 필드 | 요구 |
|---|---|---|
| 1 | `provenance.source` | `"generated-for-game"` |
| 2 | `provenance.generatedFor` | 게임 id와 정확히 일치 |
| 3 | `provenance.reusedFrom` / `copiedFrom` / `sourceProject` | **없어야 한다** (재사용·공유 자산 금지) |
| 4 | `provenance.sourceApi` / `sourceService` | **없어야 한다** (외부 이미지 서비스 경로 금지) |
| 5 | `provenance.method` | `openai-` · `service-` · `sdk-` 로 **시작하면 거부** |

**B. 모든 엔트리 — `--require-gpt-imagegen` 시 추가 검사**

| # | 필드 | 요구 |
|---|---|---|
| 6 | `provenance.method` | `"codex-gpt-imagegen-skill"` |
| 7 | `provenance.model` | `"gpt 이미지젠 스킬"` 또는 `"openai-builtin-image_gen (version opaque)"` |
| 8 | `provenance.sourceSkill` | `"imagegen"` |
| 9 | `provenance.promptHash` | 비어 있지 않은 문자열 |

**C. manifest 최상위 `imagegen` 블록**

| # | 필드 | 요구 |
|---|---|---|
| 10 | `imagegen.method` | `"codex-gpt-imagegen-skill"` |
| 11 | `imagegen.model` | 7번과 같은 허용 집합 |
| 12 | `imagegen.sourceSkill` | `"imagegen"` |

**D. 계약 외 권장 산출물** — 게이트가 강제하진 않지만 Path B의 재현성을 만든다.

- `art-prompts.md`에 씬별 프롬프트 원문 기록
- 네이티브 원본을 `assets/_source/**`에 보존하고, 리샘플했다면 `provenance.nativeSize`·`rawPath` 기록 → [§2.0.5 Declared Resample](production-demo-quality-contract.md#declared-resample--네이티브-출력이-마스터-규격에-못-미칠-때)

### ⚠️ method / model 혼동 함정

**5번과 7번이 정반대로 동작한다.**

```jsonc
// 올바름
"method": "codex-gpt-imagegen-skill",
"model":  "openai-builtin-image_gen (version opaque)"   // ← model에는 허용값

// 즉시 FAIL — method가 openai- 로 시작하면 외부 서비스로 간주되어 거부된다
"method": "openai-builtin-image_gen",
```

`model`의 `openai-builtin-image_gen (version opaque)`은 **허용값**이지만, 같은 문자열을 `method`에 넣으면 규칙 5에 걸려 거부된다. 두 필드를 바꿔 넣으면 에러 메시지만으로는 원인을 알기 어려우니 주의한다. `model`이 두 값을 모두 허용하는 이유는 built-in 도구가 모델 버전을 노출하지 않기 때문이며, provenance를 증명하는 것은 `method` + `sourceSkill`이다.

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
   - 배경: 해상도 하한은 [§2.0.5](production-demo-quality-contract.md#205-공통-고해상도-에셋-규격--authoritative-source) + 색수 ≥8000 + 엣지분산 ≥100 (본 게임 실측: 16K~25K / 172~480)
   - 코어 스프라이트: role별 최소변(플레이어 320px+, 택배/소품 220px+, chute/목표물 260px+ 등) + 색 ≥3000 + 엣지 ≥150 + 투명 필수
   - UI ≥96px·색1500·엣지100 / FX·feedback ≥128px·색3000·엣지200
   - **placeholder 자동 탈락**: 색<2000 또는 엣지<60 (절차적 draft는 색≈1085/엣지≈16 → 절대 통과 불가)
3. **필수 집합 강제**: 배경 3+ / spec의 `requiredAssetRoles` / button·pause UI / feedback·FX (v1만 player/hazard/collectible compatibility role 사용) — 하나라도 manifest에 없으면 FAIL (코드 폴백으로 출시 금지).
4. 미달 시 조치는 하나뿐: **더 강한 프롬프트로 imagegen 재생성**. 게이트 완화·수치 조작·수동 편집으로 우회하지 않는다.

## 고품질 재생성 프롬프트 원칙

이미지 품질이 부족하면 수정 코드로 덮지 말고 다시 생성한다. 프롬프트에는 다음을 명시한다.

- `high-quality mobile game production asset`, `crisp clean outline`, `consistent lighting`, `no watermark`, `no random text`
- 배경: `vertical portrait`, `safe central play area`, `layered depth`, `no characters`, `no UI` — 요청 픽셀 크기는 §2.0.5 제작 원본 규격을 그대로 쓴다
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

## 시트·모션 워크플로 — 어느 스킬을 언제 쓰나

프레임 시트와 모션 에셋은 `game-factory`/`game-polish`만으로 끝나지 않는다. 저장소에는 이 층을 담당하는 스킬이 둘 더 있고, 넷의 역할은 겹치지 않는다.

| 단계 | 담당 | 산출물 |
|---|---|---|
| 1. 설계 | `game-feel-motion-skill` | 프레임 수·셀 크기·gap·margin·pivot·baseline, Block/Approve 판정 |
| 2. 생성 | `game-factory` (Path A/B) | 실제 시트 이미지 + manifest provenance |
| 3. 교정 | `game-asset-creation` | 간격·기준선이 어긋난 시트의 **픽셀 불변 재배치** |
| 4. 후보정 | `game-polish` | 런타임 캡처에서 드러난 결함의 분류·수정·재캡처 |

### 규칙 1 — 설계 선행

시트를 생성하기 **전에** `game-feel-motion-skill`로 브리프를 확정한다. 고정 셀 크기·gap·margin·pivot·baseline과 비중첩 계약(어떤 부위도 이웃 셀을 침범하지 않는다) 없이 프롬프트를 쓰면, 바깥 셀이 캔버스 경계에서 잘리는 결함이 반복된다. 이 계약이 없는 시트는 생성 자체를 승인하지 않는다.

### 규칙 2 — 생성 경로는 크로마키

dev_game 안에서는 **flat 마젠타 배경 생성 후 크로마키 제거**가 정본이다(내장 image_gen은 투명 배경을 직접 보장하지 않는다). `game-asset-creation`의 생성 프롬프트 템플릿은 `transparent background`를 모델에 직접 요구하는데, 그것은 투명 출력을 보장하는 외부 호스트를 전제한 문구다. dev_game에서 그 템플릿을 쓸 때는 해당 줄을 크로마 문구로 교체하고, 스타일 지시에는 `asset-plan.json`의 `styleGuide.bible`을 주입한다.

### 규칙 3 — 생성과 교정의 경계

둘은 다른 행위이고 게이트에서 다르게 취급된다.

| | 생성 | 교정 |
|---|---|---|
| 정의 | 새 픽셀을 만든다 | 승인된 프레임을 **잘라서 옮긴다** |
| 요건 | Path A/B provenance 필수(`method`·`sourceSkill`·`promptHash`) | `provenance.postProcessing`에 교정 사실 기록 |
| 판별 | — | 픽셀·포즈·스케일·순서 중 하나라도 바뀌면 교정이 아니라 생성이다 |

따라서 cut-and-paste 재배치는 "bad art를 코드로 덮지 말라"는 **재생성 우선 규칙의 대상이 아니다**. 원본이 흐리거나 잘려 있으면 재생성이지만, 프레임 자체는 정상이고 배치만 어긋났다면 교정이 옳은 해법이다. 재생성을 1회 시도해도 같은 결함이 반복되면 교정으로 전환한다.

### 규칙 4 — 수치 우선순위

dev_game 안에서는 [§2.0.5 공통 고해상도 에셋 규격](production-demo-quality-contract.md#205-공통-고해상도-에셋-규격--authoritative-source)과 [§2.0.3 역할별 Alpha/패딩 계약](production-demo-quality-contract.md#203-역할별-이미지-alpha패딩-품질-계약)이 **항상 우선**한다. `game-feel-motion-skill`이 예시로 드는 고정 px 값(margin/gap)은 셀 배치를 계산하기 위한 것이며 최종 판정 규격이 아니다. 두 값이 어긋나면 계약을 따른다.

### 후보정에서의 연결

`post-production-qa-contract.md` Class L의 원인 중 `alpha-bbox-clipping`과 `wrong-direction`은 시트 배치 문제인 경우가 많다. 이때 소스 수정 도구가 `game-asset-creation`이고, 애니메이션이 런타임에 실제 적용되는지(Class A)를 판정하는 어휘는 `game-feel-motion-skill`의 Block/Approve 기준을 쓴다.

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
- 에셋은 **최대 네이티브 해상도로 생성**하고 게임에서 축소 표시한다(크리스프). 제작 원본 규격은 §2.0.5를 따른다. 네이티브 출력이 그에 못 미치면 배경에 한해 [Declared Resample](production-demo-quality-contract.md#declared-resample--네이티브-출력이-마스터-규격에-못-미칠-때)을 적용하며(raw 보존 + `nativeSize` 기록), 스프라이트/UI/FX는 확대하지 않고 재생성한다.
- 이미지가 흐리거나 찌그러지거나 스타일이 맞지 않거나 배경/패널 잔여물이 보이면 통합하지 말고 더 강한 고품질 프롬프트로 재생성한다.
- 생성된 프로젝트(`generated/*`)는 `.gitignore` 대상 — 재현 자산은 파이프라인 스크립트지 산출물이 아니다.

### 해상도·패딩 단일 원본

구체적인 배경/아트보드/캐릭터/시트/오브젝트/UI/아이콘 해상도와 6~10% 패딩, 회전·FX 최대 12% 예외는 [`production-demo-quality-contract.md`의 공통 고해상도 에셋 규격](production-demo-quality-contract.md#205-공통-고해상도-에셋-규격--authoritative-source)을 따른다. 이 문서에는 다른 숫자를 두지 않는다.
