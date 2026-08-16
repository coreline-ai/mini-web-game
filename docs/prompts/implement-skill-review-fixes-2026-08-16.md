# 구현 프롬프트 — 스킬 전문가 검토 지적 수정 (2026-08-16)

> 이 문서 전체를 새 세션에 붙여넣으면 그대로 작업이 시작된다.
> 저장소: `/Volumes/Eprojects/project_202606/game-dd` · 브랜치 `main`

---

## 배경

외부 전문가 검토(`docs/project-skills-expert-review-2026-08-16.md`)가 이 저장소의 게임 팩토리
스킬에서 결함 9건을 지적했다. **전 항목을 대조군 붙여 재현 검증했고 모두 사실로 확인됐다.**

이번 작업은 그중 **스킬 쪽 5건**을 고친다. 루트 게임·인프라 쪽 5건(S1-02 보스 전환, S2-01 에셋
예산, S2-04 루트 PR CI, S2-05 subpath URL, S3-01 manifest)은 이번 범위 밖이다.

---

## 절대 규칙 — 이것을 어기면 작업 전체가 무효다

### 1. 대조군 없는 측정은 증거가 아니다 (`dev_game/docs/post-production-qa-contract.md` §0.1)

수정이 통했는지 판단하기 전에 **반드시 두 대조군을 통과**해야 한다.

- **음성 대조**: 알려진 **정상** 상태에서 검사가 GREEN인가
- **양성 대조**: 알려진 **결함** 상태에서 검사가 RED인가

이 규칙은 장식이 아니다. 이 검토를 검증하는 과정에서 첫 시도가 무효였다 — 결함 사본을 만들어
게이트에 넣었더니 차단되길래 "검토서가 틀렸다"고 결론 낼 뻔했는데, **무손상 사본도 똑같이
차단**됐다(디렉터리 이름이 spec id와 달라서). 음성 대조를 안 돌렸으면 정반대 보고를 했을 것이다.

같은 세션에서 이 함정에 세 번 빠졌다: codex 스텁이 `/codex/i`에 안 걸려 진짜 codex가 돌았고,
`page.evaluate`와 `page.screenshot` 사이 60px 이동으로 그림자를 "렌더 안 됨"이라 오판했고,
플레이 봇이 도착 460ms 전에 다이브(지속 340ms)해서 "정답 행동이 처벌받는다"는 없는 결함을
만들어 게임 밸런스까지 바꿨다. **셋 다 재현됐다** — 틀린 도구는 일관되게 틀린 값을 낸다.

### 2. 게이트 실패는 완료가 아니다

게이트가 하나라도 실패하면 **production-demo 미통과**로 보고한다. "대체로 통과"는 없다.

### 3. 커밋·푸시

- 커밋은 작업 완료 후 한다. **푸시는 사용자가 지시할 때만** 한다.
- 원격과 갈라지면 **rebase**. force-push 금지.
- 커밋 메시지는 한국어 본문 + 다음 줄로 마무리:
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

### 4. 개발 계획 문서

작업 전 `dev_game/dev-plan/implement_<YYYYMMDD>_<HHMMSS>.md`를 이 저장소의 기존 형식
(`implement_20260816_142000.md` 참고)으로 작성하고, 진행하며 체크박스를 닫는다.

---

## 작업 1 (최우선) — S1-01: 기본 완료 판정이 거짓 양성을 낸다

### 확인된 사실

`dev_game/generator/scripts/make-game.mjs`:

| 위치 | 내용 |
|---|---|
| `:28` | `const args = { stages: 3, gate: 'demo', ... }` — 기본 게이트가 `demo` |
| `:203-212` | `demo`면 `production-demo-qa.mjs`만 실행. **`--require-gpt-imagegen`을 넘기지 않는다** |
| `:216` | `const verified = !(args.gate === 'none' || args.skipArt)` |
| `:218` | 그 결과 `demo` 경로가 **자동으로** `✔ Done. Production-demo game`을 출력 |

이 경로는 `npm run build`, 브라우저 smoke, `image-quality-qa`, `visual-layout-qa`,
`scene-composite-qa`를 **하나도 실행하지 않는다.**

### 재현 (대조군 포함, 실측 완료)

프로젝트 디렉터리 이름은 반드시 `spec.game.id`와 같아야 한다 — 다르면 그 이유로 먼저 실패해서
테스트가 무효가 된다(위 §1의 함정).

```bash
S=/tmp/neg; rm -rf $S; mkdir -p $S/{control,tamper,syntax}
for k in control tamper syntax; do
  cp -R dev_game/generated/last-minute-keeper $S/$k/last-minute-keeper
  rm -rf $S/$k/last-minute-keeper/{node_modules,dist}
done
echo "((( ;" >> $S/syntax/last-minute-keeper/src/main.js
python3 -c "
import pathlib
p = pathlib.Path('$S/tamper/last-minute-keeper/assets/backgrounds/stage-1.webp')
b = bytearray(p.read_bytes()); b[-1] ^= 0xFF; p.write_bytes(bytes(b))"
```

| 상태 | 기본 게이트 | `--require-gpt-imagegen` |
|---|---|---|
| 무손상 (음성 대조) | 통과 ✓ | — |
| 문법 깨진 소스 | **통과** ✗ | — |
| 영수증 변조 | **통과** ✗ | 차단 ✓ |

### 해야 할 것

1. `factory:make` 기본 게이트를 **`full`** 로 바꾼다.
2. `demo`는 완료 선언을 금지한다. 이름을 `artifact-contract-only` 같은 오해 없는 것으로 바꾸고,
   이 경로도 `writeIncompleteMarker()`를 남기며 `verified = false`가 되게 한다.
   즉 `verified`는 **full gate가 실제로 통과했을 때만** 참이다.
3. `production-demo-qa` 호출에 **`--require-gpt-imagegen`을 항상 넘긴다.** strict provenance가
   옵트인이면 없는 것과 같다.
4. `PRODUCTION-DEMO-NOT-VERIFIED.json`을 **full gate 통과 시 삭제**한다. 현재 삭제 코드가 아예
   없어서 나중에 게이트를 통과시켜도 표식이 남는다(`make-game.mjs:81`).
5. `--from qa`로 재개할 때는 **art host preflight를 실행하지 않는다.** QA만 다시 돌리는데 Codex
   호스트 상태에 종속될 이유가 없다.
6. 위 3종 부정 테스트를 **회귀 테스트로 고정**한다. `dev_game/generator/scripts/`에 넣고
   `factory:qa` 체인에 편입한다. 음성 대조(무손상 사본 통과)를 **반드시 포함**할 것 —
   없으면 그 테스트 자체가 §1의 함정에 빠진다.

### 완료 조건

- [ ] 문법 깨진 소스가 기본 경로에서 **차단**된다
- [ ] 영수증 변조가 기본 경로에서 **차단**된다
- [ ] 무손상 사본은 여전히 **통과**한다 (음성 대조)
- [ ] `--gate demo`는 `✔ Done. Production-demo game`을 출력하지 않는다
- [ ] full gate 통과 후 `PRODUCTION-DEMO-NOT-VERIFIED.json`이 사라진다
- [ ] 새 부정 테스트가 `factory:qa`에서 자동 실행된다
- [ ] 기존 전수 게이트 **19/19 유지** (회귀 없음)

---

## 작업 2 — S2-02: motion manifest validator가 자기 스키마보다 약하다

### 확인된 사실

`skills/game-feel-motion-skill/scripts/validate_spritesheet_manifest.py`

- `:29-33` `require_number(integer=True)`가 Python `bool`을 정수로 인정한다 (`isinstance(True, int)`는 참)
- `:58` 필수 필드의 **존재만** 보고 타입·enum은 안 본다

실측 (양성/음성 대조 모두 확인):

```
id: 123 · type: "banana" · motion: false · frames: true · loop: "yes"  →  [OK]   ← 승인됨
정상 manifest                                                          →  [OK]   ← 음성 대조 정상
```

`skills/game-feel-motion-skill/assets/templates/spritesheet-manifest.schema.json` 계약과 모순된다.

### 해야 할 것

1. 검증기가 **동봉된 JSON Schema를 실제로 사용**하게 한다(또는 스키마와 동등한 타입·enum 검사).
2. `bool`을 number/integer에서 **명시적으로 배제**한다.
3. 유효/무효 fixture 기반 회귀 테스트를 추가하고 스킬의 `quick_validate.py` 경로에 넣는다.

### 완료 조건

- [ ] 위 잘못된 manifest가 **FAIL**
- [ ] 정상 manifest는 여전히 **OK** (음성 대조)
- [ ] fixture 회귀 테스트가 자동 실행된다

---

## 작업 3 — S2-03: 스킬 문서의 명령이 실행 불가능하다

### 확인된 사실

`skills/game-polish/SKILL.md:170`이 안내하는 명령:

```
factory:imagegen -- --skip-existing --id "<asset-id>"
```

실제 실행 결과: `Missing required --project <dir>` — 즉시 종료.

### 해야 할 것

1. `--project generated/<game-id>`를 포함하도록 고친다.
2. **스킬 문서의 모든 실행 예를 CI smoke fixture로 실제 실행**한다. 문서에 적힌 명령이 도는지
   기계가 확인하지 않으면 이 결함은 반드시 재발한다.

### 완료 조건

- [ ] 고친 명령이 실제로 실행된다
- [ ] 4개 스킬 문서의 모든 실행 예가 smoke로 검증된다
- [ ] `check_skill_drift.sh` GREEN

---

## 작업 4 — S2-06: frontmatter 트리거가 겹친다

### 확인된 사실

```
game-factory description → 'post-production', 'post-production game QA' 포함
game-polish  description → 'post-production', 'QA fix pass', '후보정' 포함
```

frontmatter는 본문을 읽기 전에 적용되므로, 후보정 요청에서 두 스킬이 동시에 후보로 뜬다.
`game-asset-creation`과 `game-feel-motion-skill`도 sprite-sheet spacing 영역이 겹친다.

### 해야 할 것

description을 상호 배타적으로 정리한다.

| 스킬 | 담당 |
|---|---|
| `game-factory` | 새 게임 생성 · 기능 확장 |
| `game-polish` | 기존 게임의 결함 수정 |
| `game-asset-creation` | 승인된 프레임의 픽셀 보존 재배치 |
| `game-feel-motion-skill` | 모션 설계 · 런타임 판정 |

### 완료 조건

- [ ] 네 description에 중복 트리거 키워드가 없다
- [ ] `check_skill_drift.sh` GREEN

---

## 작업 5 — S3-02: generated 추적 정책 설명이 실제와 다르다

### 확인된 사실

- `skills/game-factory/SKILL.md:51-52,266`과 `skills/game-polish/SKILL.md:149`은
  `generated/**`가 기본적으로 전부 untracked라고 설명한다
- 실제 `dev_game/.gitignore`는 다수 게임을 예외 처리하며 **2,108개 파일이 추적 중**이다

### 해야 할 것

"게임별 allowlist 여부에 따라 다름"으로 고치고, `git check-ignore`로 실제 상태를 확인하도록
안내한다.

### 완료 조건

- [ ] 두 SKILL.md 설명이 실제 `.gitignore`와 일치
- [ ] `check_doc_constants.mjs` GREEN

---

## 최종 검증 (전 작업 후)

```bash
npm --prefix dev_game run factory:qa                    # 신규 부정 테스트 포함
bash scripts/check_skill_drift.sh --skip-user
node scripts/check_doc_constants.mjs
node scripts/check_ui_direction.mjs

# 전수 게이트 — 19/19 유지 확인
for d in dev_game/generated/*/; do
  g=$(basename "$d"); [ -f "$d/assets/asset-manifest.json" ] || continue
  npm --prefix dev_game run factory:production-demo-qa --silent -- \
    --project "generated/$g" --require-gpt-imagegen >/dev/null 2>&1 \
    && echo "OK   $g" || echo "FAIL $g"
done

# v2 custom-loop 대표 1종 전체 게이트
node dev_game/generator/scripts/production-gate.mjs \
  --project dev_game/generated/last-minute-keeper --mode custom-loop-full
```

브라우저 게이트는 수 분이 걸린다. **백그라운드로 돌리고 로그를 폴링**할 것 — 앞단 타임아웃에
걸려 재시작하면 시간만 버린다.

---

## 보고 형식

1. 작업별 수정 내용
2. **부정 테스트 결과 표 — 음성 대조 포함** (없으면 그 작업은 미완료)
3. 게이트 결과 (정확한 통과/실패)
4. 전수 게이트 숫자
5. 남은 항목과 다음 계획

---

## 참고 문서

| 문서 | 내용 |
|---|---|
| `docs/project-skills-expert-review-2026-08-16.md` | 원본 외부 검토 (S1~S3 전체) |
| `dev_game/docs/SKILL_EXPERT_REVIEW_game-factory_20260816.md` | 자체 평가 5.5/10 · 결함 인구조사 |
| `dev_game/docs/post-production-qa-contract.md` | §0.1 계측 도구 검증 · 결함 클래스 A~O · §3.1 적용 범위 |
| `dev_game/docs/production-demo-quality-contract.md` | §2.0.x 자산·UI 규격 · §4.1.1 QA 어댑터 |
| `skills/game-factory/SKILL.md` | 완료 기준 (게이트 없는 4개 항목이 명시돼 있음) |
