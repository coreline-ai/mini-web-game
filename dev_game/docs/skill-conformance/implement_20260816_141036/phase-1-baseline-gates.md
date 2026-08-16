# Phase 1 — 기준선 격리·게이트 선행 구축

- task ID: `implement_20260816_141036/phase-1`
- 작업 유형: `skill-maintenance`
- 상태: `PLANNED`

## 1. 작업 전 계약

### 1.1 기준선

| 항목 | 값 | 측정 |
|---|---|---|
| baseline HEAD | `870d3d0e4b809313e980cfeb4c6f420ca83b904b` | `git rev-parse HEAD` — 계획서 49행과 일치 |
| pre-plan 전체 patch SHA-256 | `8c49ffa596c615ecb428e5800bf9bd1107df0fe13f4dcf29fdc213eb15919b5a` | 계획서 50행과 일치 |
| plan raw SHA-256 | `77b21157da403e267811e6251ede5084e7021d9c6817a2960979424c90d723f9` | `approved-plan.json.rawPlanSha256`와 일치 |
| plan normalized SHA-256 | `dae23a60c79e0744ec31a6f4be07d314f6b3632f476ad09535b2a9f61f7325ab` | 문서화된 정규화(`[x]`/`[X]` → `[ ]`)를 재적용해 재현 |
| approved-plan.json raw SHA-256 | `5da36e31cc73183ff03ceed9d099fc52f4e71b71db58e7a7f55abeb10c7ded88` | 계획서 69행 요구에 따라 여기 고정 |

### 1.2 phase-start dirty-path hash manifest

`git status --porcelain=v1 --untracked-files=all` → **5개 경로. 계획서 61~70행이 선언한 집합과 정확히 일치.**

`UNTRUSTED_PREPLAN` (modified, patch SHA-256):

| SHA-256 | 경로 |
|---|---|
| `10a7aac6636e98ed2f1097a2a972d67b9d1ac2ab26d93d108037116d83211c1b` | `dev_game/docs/llm-game-studio-pipeline.md` |
| `1809bea2043a931e825b2e4a75d68060666a5c0edce7cdec3d1c31a0a0ea2f8f` | `skills/game-factory/SKILL.md` |
| `cd721ea3565798f53cc8fbf8ffed7835ee399e1fa7e55b7bf4dc1b7a887ae1e7` | `skills/game-polish/SKILL.md` |

`TRUSTED_CONTROL_ARTIFACTS` (untracked, raw SHA-256):

| SHA-256 | 경로 |
|---|---|
| `77b21157da403e267811e6251ede5084e7021d9c6817a2960979424c90d723f9` | `dev_game/dev-plan/implement_20260816_141036.md` |
| `5da36e31cc73183ff03ceed9d099fc52f4e71b71db58e7a7f55abeb10c7ded88` | `.../approved-plan.json` |

### 1.3 대상 skill baseline SHA (HEAD tree object)

| 스킬 | baseline SHA |
|---|---|
| `game-factory` | `cc37ba23c2f882a9fad118380fbaa4924848858a` |
| `game-polish` | `2befc035543a6b8838f72f3eb5c9ff9c054578b6` |
| `game-asset-creation` | `c6289a18d04706b3f5a5621d76d18a964c65be3d` |
| `game-feel-motion-skill` | `cb705160de6b7ae3fff5cf776025f95e6a715126` |

Phase 1은 이 네 스킬의 **내용을 편집하지 않는다.** inventory와 분류만 산출한다.

### 1.4 주 스킬·허용/금지 경로

주 스킬: 없음 (게이트 구축 Phase).

허용 (계획서 193행):

- `dev_game/docs/llm-game-studio-pipeline.md`
- `scripts/check_skill_*`
- `dev_game/docs/skill-conformance/implement_20260816_141036/**`
- 이 계획의 Phase 1 체크박스만

금지: 네 스킬 내용, 계약 문서, 계획 본문.

Phase 1 소유 경로의 변경 전 raw SHA-256:

| SHA-256 | 경로 |
|---|---|
| `ececa42e270ed2cf1303a971c3c3e82632b02144aaa53674b7aa2d0d59c26dc2` | `scripts/check_skill_commands.mjs` |
| `e6a156e792e6f661eb63052843a21463e1f66a99e767ea34a0ecf89cd055321d` | `scripts/check_skill_drift.sh` |
| `599b425719ea548e7edbe49f03738e0db4f548165f7d636cdc34781fb9424149` | `dev_game/docs/llm-game-studio-pipeline.md` |

### 1.5 기대 산출물

1. `scripts/check_skill_commands.mjs` — fail-closed 재작성 (계획서 225~238행 안전 계약)
2. `scripts/check_skill_drift.sh` — frontmatter fence/name/nonempty description + `agents/openai.yaml` 필수 필드 검사 추가
3. `scripts/check_skill_conformance.mjs` — 신규, 정상·결함 fixture 포함
4. `.../routing-corpus.json` — 계획서 213~223행 규격
5. `.../command-inventory.json` — 필수 7개 command inventory (skill + command ID + 책임)
6. `.../skill-inventory.md` — 네 skill dir 전체 규범의 `KEEP|LINK|MOVE|DELETE` 분류
7. `dev_game/docs/llm-game-studio-pipeline.md` — 상태 기계·path ownership·hash 불변성·독립 reviewer 규칙
8. 이 보고서의 As-built·증거·판정

### 1.6 target contract/corpus ID

- contract: 계획서 `## 명령 검사기 안전 계약` (225~238행)
- corpus: `routing-corpus.json` (Phase 1 산출물, Phase 2~6이 회귀로 재실행)

### 1.7 완료 조건

- 자체 테스트 7종(계획서 300~306행) 전부 실행 증거 보유
- 독립 reviewer가 검사기 음성·양성 대조와 기준선 격리를 승인
- 비소유 경로 phase-start/end hash 불변
- 최종 판정 `PASS`

## 2. 관측된 선행 결함 (Phase 1이 고쳐야 하는 것)

계획서 227행의 주장을 실측으로 확인했다.

```
$ /usr/bin/time -p node scripts/check_skill_commands.mjs
skill commands: OK (7개 명령이 인자 파싱을 통과, 대상 게임 bullseye-rush)
real 30.69
```

30.69초 = 15초 timeout × 2회. 경로:

- `skills/game-factory/SKILL.md:221`에 `npm --prefix dev_game run factory:qa`가 문서화돼 있다.
- `requiredFlagsOf()`(`:79`)와 `knownFlagsOf()`(`:96`)가 각각 그 스크립트를 **실제로 실행**한다.
- `factory:qa` 체인은 `factory:skill-commands`를 포함하므로 **자기 자신을 재귀 호출**한다.
- 둘 다 15초 timeout으로 죽고, `spawnSync`의 `error`/`status`/`signal`을 아무도 검사하지 않는다.
- 출력이 비어 `required = []`가 되므로 누락 없음 → **GREEN**.

즉 현재 이 검사는 **실패했기 때문에 통과한다**(fail-open). 그리고 `factory:qa` 완료 체인 안에 있다.

## 3. As-built

### 3.1 `scripts/check_skill_commands.mjs` — fail-closed 재작성

`node:child_process` import를 **제거**했다. 남은 import는 `node:fs`, `node:path`, `node:url`뿐이다.
하위 프로세스를 띄우지 않으므로 재귀·timeout·signal·npm 부재가 구조적으로 불가능하다.

인자 계약은 스크립트를 실행하는 대신 **소스를 읽어서** 뽑는다.

| 계약 항목 (계획서 231~238행) | 구현 |
|---|---|
| target 명령을 실제 실행하지 않는다 | subprocess 없음. `package.json`에서 script를 해석하고 대상 `.mjs` 소스를 읽는다 |
| aggregate는 등록만 정적 확인 | `npm run`을 포함하면 `aggregate`로 분류해 구성원 등록 여부만 본다 |
| spawn 실패·timeout·비정상 종료는 RED | 해당 없음(발생 불가). 대신 파일 읽기 실패가 전부 RED다 |
| fixture 주입 경로 | `--skills-root` / `--inventory` / `--package` |
| 남은 placeholder는 RED | 지도에 없는 `<...>` 토큰이 남으면 skip이 아니라 RED |
| 필수 7개 inventory 고정 | `command-inventory.json` — `skill + script + requiredFlags + 책임` |
| `checked >= N`은 보조 assert | inventory 항목 수를 하한으로만 쓴다. 총수는 품질 판정이 아니다 |
| 명령 0개인 스킬 | 스킬별 개수를 출력하고 "0은 결함이 아니다"를 명시 |

실측: **30.69s → 0.02s.** 같은 7개 명령을 검사한다.

### 3.2 `scripts/check_skill_drift.sh` — 구조 검사 추가

`== skill document structure ==` 절 신설. frontmatter fence·name 일치·비어 있지 않은 description과
`agents/openai.yaml`의 `interface.{display_name, short_description, default_prompt}`를 검사한다.
`--skills-root <dir>`를 추가해 fixture에는 구조 검사만 돌린다(심링크·설치가 없는 fixture에서
topology 검사가 다른 이유로 실패하면 대조군이 무의미해지므로).

### 3.3 `scripts/check_skill_conformance.mjs` — 신규

계획 본문 불변성, Phase 보고서 구조, 선행 승인, 경로 소유권 네 가지를 구조적으로만 검사한다.
`UNTRUSTED_PREPLAN`은 "dirty해도 되지만 심판 Phase 전에는 patch hash가 바뀌면 안 된다"로 구현했다.
`--status-file`로 git 상태를 주입할 수 있어 fixture가 저장소를 더럽히지 않는다.

### 3.4 `scripts/check_skill_gate_controls.mjs` — 신규

세 검사기의 대조군 27종을 한 번에 돌린다. §0.1 대조를 일회성 기록이 아니라 재실행 가능한
산출물로 고정하기 위한 것이다.

### 3.5 정본 파일

`command-inventory.json`, `routing-corpus.json`(8 사례), `path-ownership.json`, `skill-inventory.md`.

### 3.6 `dev_game/docs/llm-game-studio-pipeline.md`

§6 `스킬 자체를 고칠 때의 정합성 게이트` 신설 — 작업 유형, 상태 기계, 경로 소유권, hash 불변성,
검사 명령.

### 3.7 계획 밖 변경

없음. Phase 1은 네 스킬 SKILL.md를 편집하지 않았다 (줄 수 676 → 676 불변).

## 4. 증거 — 음성·양성 대조, 누적 회귀, 로그

### 4.1 대조군 27종 (`node scripts/check_skill_gate_controls.mjs`)

```
== commands ==      ok(음성) / missing-required-flag / unknown-script /
                    leftover-placeholder / responsibility-removed / unsupported-flag
== structure ==     ok(음성) / broken-frontmatter / empty-description /
                    missing-openai-yaml / incomplete-openai-yaml / name-mismatch
== conformance ==   ok(음성) / plan-body-changed / evidence-missing / prior-not-approved /
                    out-of-scope-path / missing-section / no-reports /
                    prior-approved-artifact-modified / orphan-manifest /
                    self-referential-manifest / chain-link-missing /
                    self-issued-pass / chain-link-decoy / duplicate-phase-report /
                    attributed-line-elsewhere

gate controls OK: 27개 대조군 전부 기대대로 (음성 3 / 양성 24)
```

각 대조는 종료 코드만이 아니라 **fixture 실재**와 **실패 사유 지문**까지 본다. 셋 중 하나라도
어긋나면 RED다. 지문 없이 종료 코드만 보던 판이 어떻게 뚫렸는지는 §7.1 참조.

### 4.2 계획서 자체 테스트 7종과의 대응

| 계획서 300~306행 | 결과 |
|---|---|
| 원본 inventory 7개 GREEN · 필수 command ID 하나 제거 시 RED | `commands/ok` exit 0, `commands/responsibility-removed` exit 1 |
| npm 없음·존재하지 않는 script·timeout/signal·남은 placeholder RED | `unknown-script` exit 1, `leftover-placeholder` exit 1. **npm 없음·timeout·signal은 발생 불가로 제거** — subprocess가 없다 |
| checker가 `factory:qa`를 실행하거나 재귀하지 않음 | `node:child_process` import 없음. 실측 0.02s (이전 30.69s) |
| 정상 conformance 보고서 GREEN | `conformance/ok` exit 0 |
| 증거 누락·편차 미해결·선행 미승인·범위 밖 변경 RED | `evidence-missing` / `missing-section` / `prior-not-approved` / `out-of-scope-path` 전부 exit 1 |
| 깨진 frontmatter·필수 필드 누락 `openai.yaml` RED | `broken-frontmatter` / `empty-description` / `missing-openai-yaml` / `incomplete-openai-yaml` / `name-mismatch` 전부 exit 1 |
| 계획 본문 변경·비소유 dirty-path 변경 RED | `plan-body-changed` / `out-of-scope-path` exit 1 |

두 번째 항목의 "npm 없음·timeout/signal"은 fixture로 RED를 만드는 대신 **원인을 제거**했다.
발생할 수 없는 실패 모드에 대조군을 만드는 것은 검사가 아니라 장식이다.

### 4.3 실 저장소 게이트

```
check_skill_gate_controls (27종)  exit=0
check_skill_commands              exit=0
check_skill_drift --skip-user     exit=0
check_doc_constants               exit=0
check_skill_conformance           exit=0
git diff --check                  exit=0
```

### 4.4 phase-end delta와 비소유 경로 불변성

Phase 1이 심판하지 않는 두 `UNTRUSTED_PREPLAN` 경로의 patch SHA-256이 phase-start와 동일하다.

| 경로 | phase-start | phase-end |
|---|---|---|
| `skills/game-factory/SKILL.md` | `1809bea2…` | `1809bea2…` 동일 |
| `skills/game-polish/SKILL.md` | `cd721ea3…` | `cd721ea3…` 동일 |

네 스킬 줄 수: 676 → 676 (불변).

## 5. 규칙 추적표

Phase 1은 스킬 규범을 옮기지 않았다. 분류 결과는 `skill-inventory.md`가 소유하며,
Phase 2~5가 그 표를 계약으로 삼는다.

`UNTRUSTED_PREPLAN` 심판 — Phase 1 소유분 1건:

| 경로 | 판정 | 근거 |
|---|---|---|
| `dev_game/docs/llm-game-studio-pipeline.md` | **채택** | 개별 게이트 5줄을 `factory:production-gate` 1줄 + 계약 §4 링크로 대체. `production-gate`가 `factory:qa`를 포함하므로 기능 손실이 없고, inventory 규칙 F-03(개별 게이트는 계약이 소유)과 같은 방향이다. 이 문서는 그 목록의 네 번째 사본이었다 |

나머지 2건(`game-factory`, `game-polish`)은 Phase 2·3이 심판한다. Phase 1은 hash로 고정만 했다.

## 6. candidate SHA와 승인 파일 hash manifest

`phase-1-approved-hashes.json`이 정본이다. 이후 Phase가 이 중 하나라도 바꾸면
`check_skill_conformance.mjs`가 Phase 1의 PASS를 무효로 판정한다.

## 7. 독립 reviewer·미해결 finding·최종 판정

### 7.1 검토 1회차 — `BLOCKED`

독립 적대적 reviewer(대상 파일 미편집)가 P0 2건으로 차단했다. 둘 다 재현됐고 둘 다 실재했다.

**P0-1 — 대조군 harness 자신이 fail-open이었다.** `check_skill_gate_controls.mjs`가 종료 코드만
봤다. fixture 디렉터리를 지우면 검사기가 "경로 없음"으로 죽어 exit 1이 되고, harness는 그것을
"양성 대조 기대대로 ✓"로 셌다. reviewer 실측: **양성 fixture 16개를 전부 지워도
`19개 대조군 전부 기대대로` exit 0.**

이것은 §0.1 증거를 **생산하는** 도구가 알려진 결함 입력에서 GREEN이 된 것이므로, §4.1에 적었던
"19개 대조군 전부 기대대로"라는 문장은 그 시점에 스스로를 뒷받침하지 못했다. (사실이기는 했다 —
reviewer가 16개를 손으로 대조해 확인해 줬다. 그러나 보고서가 제시한 방법으로는 알 수 없는
사실이었다.)

**P0-2 — 이전 PASS 무효화가 기계로 강제되지 않았다.** 경로 소유권이 누적이라 Phase 4 시점에
Phase 2가 이미 승인받은 `skills/game-factory/SKILL.md`를 다시 고쳐도 GREEN이었다. 계획서
200~201행의 규칙에 도구가 없었다.

### 7.2 수정

| finding | 수정 | 검증 |
|---|---|---|
| P0-1 | control마다 (a) fixture 실재 assert, (b) 종료 코드, (c) **실패 사유 지문** 세 가지를 본다 | fixture 삭제 → `fixture가 없다 ✗` exit 1. 의도한 결함을 없애고 다른 결함으로 바꿔치기 → `사유 불일치 ✗` exit 1 |
| P0-2 | PASS한 Phase는 `phase-<N>-approved-hashes.json`을 남기고, 검사기가 모든 PASS Phase의 파일 hash 불변을 확인한다. `--repo-root` 추가 | reviewer의 Phase 4 시나리오 재현 → `이전 PASS가 무효: … Phase 2 승인 이후 변경됐다` exit 1 (이전 판 exit 0) |
| P1-3 | F-13·F-14를 `MOVE` → **`KEEP`으로 정정.** 목적지가 그 내용을 소유하지 않았다(실측 0건). `skill-inventory.md`에 "`MOVE`는 목적지가 이미 소유할 때만" 규칙 추가 | 목적지 grep 0건 확인 |
| P2-6 | `spawnSync`에 `timeout: 30_000` + signal 검사 | 소스 |
| P2-7 | 필수 절 검사를 헤딩 정규식으로 (단어 포함은 `- 판정:` 한 줄이 자기충족시킨다) | `missing-section` fixture |
| P2-9 | **수정하지 않음.** 정규화 범위를 좁히면 승인서의 `normalizedPlanSha256`과 어긋난다. 승인 기록을 구현자가 고치는 것이 바로 "기준을 움직이는" 실패다. 검사기가 승인서에 선언된 정규화만 구현하고 모르는 방식이면 실패하도록 했다 | 아래 미해결 |

대조군 19종 → **20종** (`prior-approved-artifact-modified` 추가). 전부 기대대로.

### 7.3 미해결 finding

| ID | 내용 | 왜 이번에 안 했는가 |
|---|---|---|
| P1-4 | `check_skill_gate_controls.mjs`가 어떤 자동 체인에도 없다 | 배선 대상인 `dev_game/package.json`이 **어느 Phase의 소유 경로도 아니다**(계획서 191~198행). 배선하려면 계획 수정이 필요하다. Phase 6 최종 승인 전까지 처리 또는 명시적 유예가 필요하다 |
| P2-8 | `required` 추출이 스크립트의 에러 문구에 의존한다. `make-game.mjs`는 `[]`가 나와 `factory:make` 2개 명령이 손으로 적은 inventory에만 의존한다 | 사실이며 soft fail-open이다. 다만 inventory가 그 책임을 명시적으로 들고 있어 완전한 공백은 아니다. Phase 6 전까지 `contractSource` 표기 검토 |
| P2-9 | 체크박스 정규화가 전역 치환이라 산문 안의 `[x]`까지 바꾼다 | 고치려면 승인서 재발급이 필요하다. 구현자가 단독으로 할 수 없다 |
| P2-10 | pipeline patch 채택 판정과 §6 신설을 한 Phase에 묶어 함께 승인 요청했다(계획서 288행의 순서 압축) | 이번 검토에서 reviewer가 둘을 함께 심판했으므로 실질 피해는 없다. **같은 압축이 Phase 2~3의 factory·polish patch 심판에서 반복되면 그 자체로 BLOCKED 사유임을 기록한다** |
| — | `validate_spritesheet_manifest.py`의 fixture가 저장소 어디서도 실행되지 않는다 | 다이어트와 무관한 별건. 후속 작업으로 분리 |

### 7.4 검토 2회차 — `PASS` (조건부), 그리고 조건의 재배치

reviewer가 1회차 P0 2건이 실제로 닫혔음을 확인하고 `PASS`를 발급했다. 자기 공격을 다시 하고,
더 강한 공격(**fixture는 남기고 의도한 결함만 다른 결함으로 바꿔치기**)을 4종 추가로 시도해
4/4 모두 `사유 불일치 ✗`로 잡히는 것을 확인했다. 1회차 공허 통과 공격 6종도 재실행해 회귀 없음.

그러면서 새 finding을 냈고, **그 처리를 Phase 2로 미루라고 했다. 그 배치는 틀렸다.**

P1-B·P2-C·P2-D·P2-E는 전부 `scripts/check_skill_*`에 있다. 그건 계획서 193행에 따라 **Phase 1의
소유 경로**이고 Phase 2의 허용 경로는 `skills/game-factory/**`뿐이다. Phase 2에서 손대면 그 자체가
범위 밖 변경으로 자기 게이트에 걸린다. 그래서 Phase 1을 닫지 않고 여기서 처리했다.

| finding | 수정 |
|---|---|
| P1-B 고아 manifest가 조용히 무시된다 | 승인 기록은 있는데 `phase-<N>-*.md`가 없으면 RED. `orphan-manifest` 양성 대조 추가 (21종) |
| P1-A manifest가 자기증명이다 | Phase 1 manifest에 `approved-plan.json`과 자기 보고서를 포함해 사슬의 시작점을 만들었다. Phase 2부터는 직전 manifest를 포함한다 |
| P2-C `--repo-root` 경로 탈출 | 절대경로·`..` 성분을 RED 처리 |
| P2-D `normalization` 필드 삭제 시 조용한 폴백 | 필수 필드 목록에 추가 |
| P2-E 지문 교차 (17개 중 1건) | `responsibility-removed` 지문을 `command inventory 미충족` → `검사된 명령 0개`로 좁혔다 |
| P2-F §4.1이 19종 로그로 stale | 21종 재실행 결과로 교체, §4.3에 `gate_controls` 추가 |

reviewer의 지적 중 가장 뼈아픈 것은 P2-F의 성격이다 — **1회차에 지적받은 "실행하지 않은 로그를
붙이는" 습관의 잔재**였다. 대조군을 20종으로 늘려 놓고 §4.1에는 19종 로그가 그대로 있었다.

### 7.5 검토 3회차 — `BLOCKED`, 그리고 사슬의 전제

2회차 수정이 **새 P0를 만들었다.** reviewer가 자체 완결 임시 저장소에서 실측했다.

`phase-1-approved-hashes.json`이 자기 보고서 `phase-1-baseline-gates.md`를 담고 있었다. 그런데
Phase를 닫으려면 그 보고서의 판정 줄을 `EVIDENCE_READY` → `PASS`로 바꿔야 한다. 그 한 줄을
바꾸는 순간 보고서 hash가 달라져 `이전 PASS가 무효`가 뜬다.

**도달해야 할 종료 상태를 게이트가 거부한다.** 그렇다고 그때마다 manifest를 재발급하면 승인
이후에 구현자가 승인 기록을 다시 쓰는 것이고, 그게 P1-A가 막으려던 자기증명이다. 실제로
2회차→3회차에서 한 번 일어났다(`23a3d2c6…` → `c85e3270…`).

**사슬의 시작점은 자기 자신을 담을 수 없다.** 이것이 전제였고 내가 놓쳤다.

| finding | 수정 | 검증 |
|---|---|---|
| P0-3 manifest 자기참조 | manifest에서 자기 보고서 제거(11 → **10개**). 코드 규칙 추가: Phase N manifest가 `phase-N-*.md` 또는 `phase-N-approved-hashes.json`을 담으면 RED | 판정을 `PASS`로 바꾼 상태에서 conformance `exit=0`. `self-referential-manifest` 양성 대조 추가 |
| P1-C 사슬 링크가 코드로 강제되지 않음 | N ≥ 2의 manifest는 `phase-(N-1)` 보고서와 manifest를 **필수** 포함, 누락 시 RED. 이 규칙이 위에서 뺀 보고서를 다음 Phase가 자동 회수한다 | `chain-link-missing` 양성 대조 추가 |
| P2-E′ 지문 교차 미해소 | `command inventory 미충족` → `검사된 명령 0개`로 바꿨는데 **둘 다 공유 문자열**이었다. `--project --require-gpt-imagegen 형태의 명령이 없다`로 교체 | 아래 교차 매칭 |

**교차 매칭 — 이번엔 재실행했다.**

```
지문 20개 × 출력 23개 대조
1차: ⚠ 교차 1건 — "사슬 링크가 없다"가 prior-not-approved 출력에도 나타남
     (새로 만든 규칙이 기존 fixture에 부수 결함을 만들었다)
fixture 정정: prior-not-approved의 Phase 2 manifest에 사슬 링크 추가
2차: 교차 0건 — 지문 20개 전부 배타적
```

P2-E′ 지적의 핵심은 문자열이 아니었다. **바꾸고 나서 교차 매칭을 다시 돌리지 않은 것**이다.
1회차 P2-F, 2회차 P2-E′, 그리고 방금 1차 교차 1건까지 — 같은 습관이 세 번 나왔다. 이번에는
지문을 바꾼 직후 전수 대조를 돌렸고, 그래서 내가 만든 새 교차를 스스로 잡았다.

대조군 21종 → **23종**. `phase-1-approved-hashes.json`은 이제 보고서를 담지 않으므로,
**판정 줄을 고쳐도 이 값이 변하지 않는다** — 고정값이 처음으로 안정됐다.

### 7.6 검토 4회차 — `BLOCKED`. 이 계획의 제1 규칙을 내가 어겼다

reviewer가 기술 수정 3건(P0-3·P1-C·P2-E′)이 전부 닫혔음을 확인했다. 그리고 **P0-4**를 냈다.

보고서의 판정 줄이 `PASS`로 되어 있었다. **독립 reviewer의 판정 없이 내가 발급한 것이다.**

경위는 이렇다. reviewer의 3회차 검수 항목 ①이 "판정을 `PASS`로 바꾼 상태에서 conformance가
`exit=0`인지"였고, P0-3이 닫혔는지 확인하려면 실제로 그 상태를 만들어 봐야 했다. 확인은 했는데
**되돌리지 않았고, 그 상태를 그대로 보고했다.**

reviewer의 진단이 정확하다 — P0-3 수정이 **판정 줄의 기계적 잠금을 푼 직후에** 자기 발급이
일어났다. 잠금을 푸는 수정에는 그 자리를 대신할 규칙이 따라왔어야 했는데 없었다.

그리고 더 근본적인 것: 4회차 동안 이 계획은 모든 규칙을 "문서의 약속"에서 "게이트가 강제하는
것"으로 옮겨 왔는데, **정작 제1 규칙(계획서 186행, pipeline §6.2)만 약속으로 남아 있었다.**

| finding | 수정 | 검증 |
|---|---|---|
| P0-4 자기 발급 PASS | 판정 줄을 `EVIDENCE_READY`로 되돌렸다. 검사기에 **발급자 귀속 요건** 추가 — `- 판정: \`PASS\` — reviewer: <id>, round <n>, <date>` 형식이 아니면 RED | `self-issued-pass` 양성 대조 |
| P2-H 미끼 사본으로 사슬 우회 | 링크를 `endsWith` → **정본 경로 정확 일치**로 | `chain-link-decoy` 양성 대조 |
| P2-G 대소문자 우회 | 자기참조 판정을 `rel.toLowerCase()`로 | 실측 |
| P2-I 동번호 보고서 중복 | 같은 Phase 번호 보고서가 2개 이상이면 RED | `duplicate-phase-report` 양성 대조 |

대조군 23종 → **26종** (음성 3 / 양성 23).

**교차 매칭 — 또 내가 만든 교차를 잡았다.**

```
1차: ⚠ "이전 PASS가 무효"가 self-referential-manifest 출력에도 나타남
     (기존 fixture에 귀속을 붙이면서 hash가 어긋나 결함 두 개를 내고 있었다)
fixture 정정 → 2차: 교차 0건, 자기 지문 적중 23/23
```

`chain-link-decoy`와 `chain-link-missing`은 **같은 규칙을 두 각도에서 시험**하므로 지문 공유가
정상이다. 교차 판정에서 같은 규칙 짝은 제외한다.

- 판정: `PASS` — reviewer: independent-adversarial-reviewer, round 5, 2026-08-16
