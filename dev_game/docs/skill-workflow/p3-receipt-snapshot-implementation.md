# Phase 3 구현 증거 — PASS receipt snapshot 무결성

- 일자: `2026-08-17`
- 대상: `dev_game/generator/scripts/lib/production-pass-receipt.mjs`,
  `production-gate.mjs`, `production-pass-receipt-qa.mjs`
- 커밋: `443f4f2`

## 재현된 결함

```
지문이 열거하던 것: package.json, index.html, src/**, qa/**, assets/**
실제 프로젝트에 있으나 놓친 것:
  vite.config.js, package-lock.json, README.md, asset-plan.json, scripts/, docs/
→ Vite 설정이나 lockfile을 바꿔도 영수증이 stale이 되지 않는다

TOCTOU: 지문을 writer 시점에 한 번만 계산했다. QA 도중 입력이 바뀌면
        **QA는 옛 파일을 보고 영수증은 새 파일을 봉인**한다.

symlink: readFileSync가 링크를 따라간다. 프로젝트 밖을 가리키는 링크가 봉인된다.
```

## 구현

1. **`canonicalSnapshot`** — 프로젝트 root 아래 **모든** regular file. 포함이 기본값이고
   생성 출력만 제외한다. 경로는 POSIX 상대경로, UTF-8 byte 오름차순 정렬,
   `F\0<path>\0<sha256>\n` record를 이어 해싱한다.
2. **제외는 경로로 판정한다.** 루트 한정(`node_modules`, `dist`, `qa-captures`,
   `.playwright-cli`, `coverage`, `.vite`, `PRODUCTION-DEMO-NOT-VERIFIED.json`)과
   어느 깊이(`.git`, `.DS_Store`)를 나눈다.
3. **symlink는 fail-closed**(`E_SNAPSHOT_SYMLINK`). 단 제외 판정이 **앞**이다.
4. **TOCTOU** — `beginGateSnapshot`(설치·빌드 뒤 고정) → 게이트 종료 시
   `assertSnapshotUnchanged` → `writePassReceipt`가 쓰기 직전 한 번 더 대조
   (`E_SNAPSHOT_DRIFT`). 미검증 표식은 지문이 아니라 별도 invalid 조건이므로 제외한다 —
   지문에 넣으면 표식을 남기는 것만으로 시작/종료 digest가 항상 달라진다.

## Attempt ledger

| # | 대상 | 결과 | 조치 |
|---|---|---|---|
| 1 | canonical snapshot + TOCTOU + symlink | receipt QA OK | — |
| 2 | 독립 검토: 제외를 **basename**으로 판정 (P1) | 중첩 경로가 통째로 비가시 | 루트 한정/어느 깊이로 분리 |
| 3 | 독립 검토: symlink된 `node_modules`가 게이트를 막음 (P2) | 완주 불가 | 제외 판정을 symlink 검사 앞으로 |
| 4 | 3번 수정이 `isDirectory()`로 갈라 symlink 디렉터리를 놓침 | 여전히 막힘 | 타입이 아니라 **이름**으로 판정 |

**2번 실측** — 아래 경로에 임의의 코드를 두면 지문에서 완전히 사라졌다. Vite는 이런 경로도
import하므로 PASS 뒤에 마음대로 바꿔도 영수증이 유효했다.

```
보이지 않음  src/dist/data.json          src/node_modules/x.js
보이지 않음  src/coverage/c.js           src/.vite/v.js
보이지 않음  assets/qa-captures/a.js     src/PRODUCTION-DEMO-NOT-VERIFIED.json
보이지 않음  src/.playwright-cli/p.js
감지        src/legit.js (대조)
```

수정 뒤 위 7개 전부 `감지 ✓`, 루트의 생성 출력 6종은 여전히 `제외 ✓`.

## 결함 주입 검증

| 되돌린 것 | 결과 |
|---|---|
| `canonicalSnapshot` → 열거 방식 | `snapshot covers vite config` 외 4건 ✗ |
| 제외 목록에 `docs`/`scripts` 추가 | `snapshot covers build script` ✗ |
| 제외를 다시 basename 전체로 | `nested exclusion name is content: src/dist/data.json` ✗ |
| symlink 가드 제거 | `symlink must fail snapshot creation` ✗ |
| 제외 판정을 symlink 검사 뒤로 | `SnapshotError: symlink가 있다: node_modules` (게이트 완주 불가) |
| `assertSnapshotUnchanged` 제거 | TOCTOU 대조군 2건 ✗ |
| writer 재대조 제거 | `writer must re-check the snapshot before writing` ✗ |
| 표식을 지문에 포함 | `the not-verified marker must not enter the snapshot` ✗ |

## 성능

독립 검토 실측: `bullseye-rush` 33 ms/66 파일/9.5 MB, `last-light-zero-hour` 121 ms/113 파일/52.5 MB,
`meteor-dash` 19 ms. 게이트당 약 4회 계산이므로 무시할 수준이다.

## 남은 한계

- 영수증 위조는 **닫히지 않았다.** `canonicalSnapshot`은 공개 파일의 공개 해시이고 서명이 없다.
  손으로 쓴 영수증을 막는 것은 `gateProfile`·`qaRunId` 교차 검증까지이며, 그것도 문턱일 뿐이다.
- `legacy-pass`에는 지문이 없다. 동결 allowlist의 15개 게임은 "통과한 적이 있다"만 뜻하며
  현재성은 증명되지 않는다.
