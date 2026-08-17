# Phase 1 구현 증거 — 경로 소유권 rename·경계 fail-closed

- 일자: `2026-08-17`
- 대상: `scripts/check_skill_conformance.mjs`, `scripts/check_skill_gate_controls.mjs`,
  `dev_game/docs/skill-conformance/implement_20260816_141036/path-ownership.json`
- 커밋: `443f4f2`

## 재현된 결함

```
$ git mv src/new.js danger/secret.js          # 허용 src/ → 금지 danger/
$ node scripts/check_skill_conformance.mjs --plan ... --repo-root <fixture>
  skill conformance: OK (계획 plan, 보고서 2개, 현재 Phase 2)
  exit=0, "범위 밖" 지적 0건

원인: git status --porcelain=v1 이 rename을 "R  old -> new" 한 줄로 낸다.
     slice(3) 이 그것을 **경로 하나의 문자열** "src/new.js -> danger/secret.js" 로 만들고,
     그 문자열이 허용 접두사 `src/` 로 시작하므로 통과한다.

$ echo x > plan.md.evil                        # 허용은 exact file `plan.md`
  exit=0                                       # p.startsWith(prefix) 가 통과시킨다

디렉터리 경계는 이미 정상이었다: src.evil.js, srcEVIL.js 둘 다 RED (실측)
```

## 구현

1. **rename을 두 경로로 받는다.** `git status --porcelain=v1 -z --no-renames --untracked-files=all`.
   `--no-renames`가 삭제+추가 두 줄로 분해하고, `-z`가 NUL 구분이라 공백·비ASCII 경로도 안전하다.
2. **경로 형태를 세 가지로 명시한다.** `matchesOwnedPath`:
   - `dir` — `/`로 끝남, 하위만
   - `prefix:<문자열>` — **명시 선언**한 접두사만
   - `file` — 완전 일치. 형태를 적지 않으면 이것으로 해석한다(fail-closed)
   선언 없는 접두사 매칭을 없앤 것이 `plan.md.evil` 구멍의 실제 수정이다.
3. **정본 마이그레이션.** `scripts/check_skill_`은 파일도 디렉터리도 아닌 맨 접두사였다.
   `prefix:scripts/check_skill_`로 선언했다. 이 항목을 놓치면 검사기 4종이 전부 범위 밖이 된다.
4. **committed 채널도 `-z`.** dirty만 고치면 비ASCII 경로가 C-quote로 돌아와 allowlist와 절대
   매칭되지 않고 **정상 작업이 범위 밖으로 오판된다**(독립 검토 발견).

## Attempt ledger

| # | 대상 | 결과 | 조치 |
|---|---|---|---|
| 1 | `-z --no-renames` + 세 형태 매처 | 47 대조군 OK | — |
| 2 | 결함 주입으로 자체 검증 | **rename 대조군 3개가 공허** | 아래 참조 |
| 3 | fixture 재배치 + 지문 강화 | 주입이 잡힘 | — |
| 4 | 독립 검토: committed 채널 `-z` 누락 | 오판 위험 | `-z` 추가 + 비ASCII 대조군 |

**2번이 중요하다.** `--no-renames`를 빼도 대조군 3개가 전부 초록이었다. 원인 두 가지:
- rename 원본 파일을 phase-1 커밋에 넣어, 대조군이 rename 처리가 아니라 **"금지 경로 커밋"**을
  잡고 있었다. 원본을 baseline 커밋으로 옮겼다.
- 지문이 `범위 밖 변경: danger/seed.js`였는데, 경로가 연결돼도(`danger/seed.js -> src/moved.js`)
  substring으로 매칭됐다. 지문을 `(dirty)`까지 포함해 좁혔다.

## 결함 주입 검증

| 되돌린 것 | 결과 |
|---|---|
| `--no-renames` 제거 | `real-git-rename-from-forbidden` 사유 불일치 ✗ (옛 경로가 `ger/seed.js`로 망가짐) |
| `-z` 제거 | `real-git-rename-spaced-path` 사유 불일치 ✗ (경로가 따옴표로 감싸짐) |
| 매처를 옛 `startsWith`로 | `real-git-file-prefix-lookalike` ✗, `real-git-declared-prefix` ✗ |
| committed에서 `-z` 제거 | `real-git-committed-nonascii-in-scope` 음성 대조 실패 ✗ |
| 실제 `git status` 갈래만 무력화 | `real-git-dirty-out-of-scope` ✗ (주입 fixture 대조군은 전부 초록 — 실전 경로를 보는 유일한 대조군임을 확인) |

## 남은 한계

- **gitignore된 경로의 범위 밖 변경은 보이지 않는다.** `--untracked-files=all`이 무시된 파일을
  포함하지 않기 때문이다. 실측: `.gitignore`에 `danger/`가 있으면 `danger/secret.js`를 써도
  GREEN이었다. `--ignored`를 켜면 `node_modules`가 쏟아져 검사가 무의미해지므로 켜지 않았다.
- `check_skill_conformance.mjs`는 계획마다 `--plan`이 달라 `factory:qa` 체인에 넣을 수 없다.
  대조군(fixture)만 매번 돈다.
