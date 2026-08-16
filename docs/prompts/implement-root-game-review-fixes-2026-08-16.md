# 구현 프롬프트 — 루트 게임·인프라 지적 수정 (2026-08-16)

> 이 문서 전체를 새 세션에 붙여넣으면 그대로 작업이 시작된다.
> 저장소: `/Volumes/Eprojects/project_202606/game-dd` · 브랜치 `main`

---

## 배경

외부 전문가 검토(`docs/project-skills-expert-review-2026-08-16.md`)가 지적한 9건 중 **스킬 쪽
5건은 이미 수정·커밋됐다**(`74a027d`). 이 문서는 남은 **루트 게임·인프라 5건**을 다룬다.

전 항목을 대조군 붙여 직접 확인했다. 아래 "확인된 사실"은 추정이 아니라 실측이다.

| # | 항목 | 심각도 |
|---|---|---|
| 1 | 보스 중 스테이지 전환이 영구 누락된다 | **S1** |
| 2 | 모바일 첫 진입에 34.8MB를 선로딩한다 | S2 |
| 3 | 루트 게임에 PR 단계 자동 검증이 없다 | S2 |
| 4 | 절대 CSS 에셋 URL을 게이트가 놓친다 | S2 |
| 5 | 루트 에셋 manifest/README가 실제 런타임과 다르다 | S3 |

---

## 절대 규칙 — 이것을 어기면 작업 전체가 무효다

### 1. 대조군 없는 측정은 증거가 아니다 (`dev_game/docs/post-production-qa-contract.md` §0.1)

수정이 통했는지 판단하기 전에 **두 대조군을 통과**해야 한다.

- **음성 대조**: 알려진 **정상** 상태에서 검사가 GREEN인가
- **양성 대조**: 알려진 **결함** 상태에서 검사가 RED인가

이 규칙은 장식이 아니다. 직전 세션에서 이 함정에 **여섯 번** 빠졌다.

| 무엇이 틀렸나 | 잘못된 결론 |
|---|---|
| codex 스텁 `--version`이 `/codex/i`에 안 걸려 진짜 codex가 실행됨 | 성공을 "보존 실패"로 오독 |
| `page.evaluate`와 `page.screenshot` 사이 공이 60px 이동(그림자 높이 5 CSS px) | "그림자가 렌더 안 된다" — 두 번 |
| 플레이 봇이 도착 460ms 전에 다이브(지속 340ms) | "정답 행동이 처벌받는다" → 게임 밸런스를 잘못 바꿈 |
| 사본 디렉터리 이름이 `spec.game.id`와 달라 무손상 사본까지 차단됨 | "검토서가 틀렸다"고 보고할 뻔함 |
| 명령 검사기가 따옴표를 무시하고 토큰화 | 멀쩡한 문서를 오탐 |
| 명령 검사기가 `--help`를 붙여 인자 검증 **전에** 종료 | 결함을 못 잡는데 "잡는다"고 믿음 |

**전부 재현됐다.** 틀린 도구는 일관되게 틀린 값을 낸다 — 재현성은 정확성의 증거가 아니다.

### 2. 검사는 관찰이지 변경이 아니다

직전 세션에서 검사 스크립트가 인자를 실제로 넘겨 실행하는 바람에 `generated/my-game`이
생기고 `bullseye-rush`의 배경이 재생성됐다. 전수 게이트가 19→18로 떨어져서야 발견했다.
**검사 스크립트는 저장소를 수정하지 않는다.** 실행이 필요하면 임시 사본에서 한다.

### 3. 게이트 실패는 완료가 아니다

하나라도 실패하면 **production-demo 미통과**로 보고한다. "대체로 통과"는 없다.

### 4. 커밋·푸시

- 커밋은 작업 완료 후. **푸시는 사용자가 지시할 때만.**
- 원격과 갈라지면 **rebase**. force-push 금지.
- 커밋 메시지 끝에: `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

### 5. 개발 계획 문서

`dev_game/dev-plan/implement_<YYYYMMDD>_<HHMMSS>.md`를 기존 형식
(`implement_20260816_142000.md` 참고)으로 먼저 작성하고, 진행하며 체크박스를 닫는다.

---

## 작업 1 (최우선) — S1-02: 보스 중 스테이지 전환이 영구 누락된다

### 확인된 사실

`src/scenes/GameScene.js`:

```js
// :180-182 — 먼저 인덱스를 전진시킨다
const st = this.stageMgr.update(this.score.survivalMs);
if (st.changed) this.onStageChange(st);

// :251-252 — 그런데 보스 중이면 아무것도 하지 않고 반환한다
onStageChange(st) {
  if (this.boss.active) return;
  ...
}
```

`st.changed`는 **그 프레임에만 참**이다. `StageManager`의 인덱스는 이미 전진했으므로 다음
프레임부터는 `changed: false`이고, 보스가 끝나도 그 전환은 **다시 오지 않는다.**

재현 계산:

- 중간 보스 120초 시작, 약 32초 지속
- 146초 스테이지 6 전환 → 보스 중이라 무시
- 153초 → 이미 인덱스가 6이라 `changed: false`
- 최종 보스 중 220초 스테이지 8도 같은 방식으로 누락

영향: 스폰 풀은 새 스테이지를 쓰는데 **배경과 등장 배너는 이전 스테이지**에 남는다. 플레이어가
보는 정보와 실제 난이도가 어긋난다.

### 해야 할 것

둘 중 하나를 고른다.

1. 보스 중 전환을 `pendingStageChange`에 저장하고 **보스 격파 직후 적용**한다.
2. 보스가 끝날 때까지 `StageManager`의 인덱스 갱신 자체를 보류한다.

1번이 난이도 진행을 늦추지 않아 더 낫다. 2번은 보스전이 길수록 전체 진행이 밀린다.

### 완료 조건

- [ ] 120→153초 시나리오 회귀 테스트 — 보스 종료 후 배경·배너가 스테이지 6으로 바뀐다
- [ ] 195→237초 시나리오 회귀 테스트 (최종 보스)
- [ ] **양성 대조**: 수정을 되돌리면 그 테스트가 RED가 된다
- [ ] **음성 대조**: 보스 없는 평범한 전환은 여전히 정상 동작한다
- [ ] `npm test`에 편입

---

## 작업 2 — S2-01: 모바일 첫 진입 34.8MB

### 확인된 사실 (실측)

```
src/config/gameConfig.js 선언 런타임 파일 90개 · 합계 34.8 MB  (90개 전부 실재)
dist 총량 57.9 MB
```

`src/scenes/BootScene.js:39-93`이 배경 8종, 상점 카드, 캐릭터, 보스, 파워업, UI, 오디오를
**전부 Home 진입 전에** 선로딩한다. `vite.config.js:11`의 `publicDir: 'assets'` 때문에 레거시
SVG·중복 PNG·contact sheet까지 배포된다.

8개 스테이지를 못 보고 끝나는 세션도 전체 비용을 낸다.

### 해야 할 것

1. Boot는 **Home/스테이지 1/기본 캐릭터/필수 UI만** 로드한다.
2. 상점 에셋은 상점 진입 시, 보스·다음 배경은 **직전 스테이지에서 prefetch**한다.
3. PNG 배경·카드를 WebP로 변환하고 역할별 해상도 예산을 둔다.
4. `publicDir` 전체 복사 대신 **runtime allowlist 기반 복사**를 루트 게임에도 적용한다
   (생성 게임에는 이미 있다 — `dist-runtime-qa.mjs`의 `assetLayout` 참고).
5. **첫 화면 핵심 에셋 예산을 게이트로 만든다.** 숫자를 정하고 넘으면 RED.

### 완료 조건

- [ ] Home 진입 전 네트워크 전송량이 선언한 예산 이하 (브라우저에서 실측)
- [ ] 게이트가 예산 초과를 잡는다 — **양성 대조로 확인**(일부러 큰 에셋을 Boot에 넣어 RED)
- [ ] 스테이지 8까지 플레이해도 필요한 에셋이 제때 로드된다 (지연 로드 누락 없음)
- [ ] `dist` 총량 감소를 수치로 보고

---

## 작업 3 — S2-04: 루트 게임에 PR 검증이 없다

### 확인된 사실

```
.github/workflows/deploy-pages.yml     → push(main) + workflow_dispatch만. pull_request 없음
.github/workflows/dev-game-factory.yml → pull_request 있으나 paths에 루트 'src/**'가 없다
루트 package.json test                 → node scripts/gameover-save-smoke.mjs 하나뿐
```

즉 루트 `src/**` 변경은 **main 병합 후 배포 job에서야** 문제가 드러나거나, 현재 smoke 범위
밖이면 아예 드러나지 않는다.

### 해야 할 것

루트 전용 PR workflow를 추가한다. 최소 항목:

- `npm ci`, `npm run build`
- 저장 smoke (기존)
- **실제 PLAY 입력 smoke** — 씬 진입이 아니라 입력이 상태를 바꾸는지
- pause/resume
- stage/boss transition (작업 1의 회귀 테스트)
- Pages subpath smoke (작업 4와 연결)

### 완료 조건

- [ ] PR에서 루트 `src/**` 변경 시 자동 실행된다
- [ ] **양성 대조**: 일부러 깨뜨린 브랜치에서 RED가 된다
- [ ] 실행 시간이 합리적이다 (수치 보고)

---

## 작업 4 — S2-05: 절대 CSS 에셋 URL을 게이트가 놓친다

### 확인된 사실

```
dev_game/generated/road-stream-racer/src/styles/mobile.css   → url(/...)
dev_game/generated/ghost-train-railgun/dist/assets/*.css     → url(/...)
dev_game/generated/bullseye-rush/dist/assets/*.css           → url(/...)
dev_game/generated/market-panic/dist/assets/*.css            → url(/...)
```

`bullseye-rush`는 production gate를 통과했지만 빌드가 unresolved absolute URL 경고를 냈다.
루트가 아닌 **하위 경로 배포**에서는 호스트 루트 `/backgrounds/...`를 요청하므로 깨진다.

### 해야 할 것

1. `dist-runtime-qa.mjs`가 **CSS/JS의 절대 런타임 URL도 스캔**하게 한다.
2. production browser gate를 **`/subpath/<game-id>/`에서 한 번 실행**한다. 루트에서만
   테스트하면 이 계열 결함이 구조적으로 안 잡힌다.
3. 위 4개 게임의 절대 URL을 상대 경로로 고친다.

### 완료 조건

- [ ] 절대 URL이 있는 산출물이 게이트에서 **RED**
- [ ] **음성 대조**: 상대 경로만 쓰는 산출물은 통과
- [ ] subpath 배포 smoke가 통과
- [ ] 전수 게이트 **19/19 유지**

---

## 작업 5 — S3-01: 루트 에셋 manifest/README가 실제와 다르다

### 확인된 사실

```
assets/manifest.json  → "format": "svg", "total_svg": 77   (정본처럼 선언)
assets/README.md      → standalone SVG와 OGG 10개를 현재 구성으로 설명
실제 런타임           → assets/imagegen/**/*.png 85개 + OGG 13개
```

### 해야 할 것

둘 중 하나.

1. 레거시임을 이름과 내용에 명시한다 (`manifest.legacy-svg.json` 등).
2. **런타임 config에서 manifest를 생성**해 단일 원본으로 만든다.

2번이 낫다 — 1번은 다음에 또 어긋난다.

### 완료 조건

- [ ] manifest가 실제 런타임 파일과 일치한다
- [ ] 2번을 택했다면 생성 스크립트가 있고 CI에서 불일치를 잡는다
- [ ] README가 현재 구성을 설명한다

---

## 최종 검증 (전 작업 후)

```bash
npm ci && npm run build && npm test
npm --prefix dev_game run factory:qa

bash scripts/check_skill_drift.sh --skip-user
node scripts/check_doc_constants.mjs
node scripts/check_ui_direction.mjs

# 전수 게이트 — 19/19 유지 확인 (숫자가 줄면 작업 중 무언가를 망가뜨린 것이다)
for d in dev_game/generated/*/; do
  g=$(basename "$d"); [ -f "$d/assets/asset-manifest.json" ] || continue
  npm --prefix dev_game run factory:production-demo-qa --silent -- \
    --project "generated/$g" --require-gpt-imagegen >/dev/null 2>&1 \
    && echo "OK   $g" || echo "FAIL $g"
done

git status --short   # 검사 스크립트가 저장소를 바꾸지 않았는지 반드시 확인 (규칙 2)
```

브라우저 게이트는 수 분이 걸린다. **백그라운드로 돌리고 로그를 폴링**할 것.

---

## 보고 형식

1. 작업별 수정 내용
2. **대조군 표 — 음성·양성 둘 다** (없으면 그 작업은 미완료)
3. 게이트 결과 (정확한 통과/실패)
4. 전수 게이트 숫자
5. 실측 수치 (에셋 예산 전후, CI 실행 시간, dist 총량)
6. 남은 항목과 다음 계획

---

## 참고 문서

| 문서 | 내용 |
|---|---|
| `docs/project-skills-expert-review-2026-08-16.md` | 원본 외부 검토 |
| `docs/prompts/implement-skill-review-fixes-2026-08-16.md` | 스킬 쪽 5건 (완료, `74a027d`) |
| `dev_game/docs/SKILL_EXPERT_REVIEW_game-factory_20260816.md` | 자체 평가 · 결함 인구조사 |
| `dev_game/docs/post-production-qa-contract.md` | §0.1 계측 도구 검증 · 결함 클래스 A~O |
| `dev_game/generator/scripts/completion-claim-qa.mjs` | 대조군을 갖춘 부정 테스트의 실제 예 |
