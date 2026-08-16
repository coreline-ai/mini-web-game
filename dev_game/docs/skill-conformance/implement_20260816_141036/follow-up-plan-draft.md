# 후속 계획 초안 — 스킬 게이트 도구 4건

`implement_20260816_141036` Phase 6이 인계하는 항목의 계획 초안이다.

## 이 문서가 여기 있는 이유 (경로 문제 — 판정 요청)

독립 검토는 이것을 `dev_game/dev-plan/implement_<신규타임스탬프>.md`로 만들라고 했다. 그런데
`path-ownership.json`의 `alwaysAllowed`는 **이 계획의 계획서 1개와 이 conformance 디렉터리**뿐이다.
`dev_game/dev-plan/` 아래 새 파일은 어느 Phase의 허용 경로도 아니므로, 거기 만들면
`check_skill_conformance.mjs`가 **범위 밖 변경**으로 RED를 낸다.

그래서 **허용 경로 안에 초안으로 둔다.** `dev_game/dev-plan/`으로 승격하는 것은 이 계획 밖의
별도 행위이며, 그 판정은 독립 reviewer가 한다. 여기서 임의로 옮기면 그것이 곧 경로 규칙 위반이다.

## 대상 — 네 건 전부 **도구의 결함**이지 스킬의 결함이 아니다

| ID | 발견 | 내용 | 현재 노출 |
|---|---|---|---|
| **K-1** | Phase 4 | `check_skill_drift.sh`의 구조 검사가 frontmatter를 **정규식으로만** 본다. YAML로 파싱되는지는 검사하지 않아, `description`에 콜론이 들어가 깨진 frontmatter를 통과시킨다 | 0 — 네 스킬 4/4 파싱 OK |
| **P1-4** | Phase 1 | `check_skill_gate_controls.mjs`(대조군 27종)가 **어떤 자동 체인에도 배선되지 않았다**. §0.1 대조가 사람의 기억에 의존한다 | 대조군이 회귀로 돌지 않음 |
| **P2-8** | Phase 1 | `check_skill_commands.mjs`의 required 추출이 스크립트의 **에러 문구**에 의존한다. `make-game.mjs`는 `[]`가 나와 `factory:make` 2개 명령이 손으로 적은 inventory에만 의존한다 | soft fail-open |
| **P2-9** | Phase 1 | 계획 체크박스 정규화가 **전역 치환**이라 산문 안의 `[x]`까지 바꾼다 | 실질 0 — 가릴 수 있는 변경이 `[x]`↔`[ ]`뿐 |

## 왜 이번 계획에서 고치지 않았는가

`approved-plan.json`은 Phase 1 manifest가 고정한 파일이다. 계획 본문을 고치면
정규화 hash가 바뀌고 → 승인서를 재발급해야 하고 → Phase 1 PASS가 무효화되고 → Phase 2~5의
manifest가 각각 직전을 담고 있으므로 **다섯 Phase가 연쇄로 열린다.**

그 값으로 사는 것이 없다. 네 건은 스킬의 결함이 아니고, 이 계획의 목적(계획서 12~16행)은
달성됐다.

그리고 형식이 나쁘다 — **마지막 Phase에서 계획을 고쳐 그 Phase가 하려는 일을 허용하는 것은,
의도가 선해도 "작업에 맞춰 기준을 움직이는 것"과 같은 모양이다.** 이 계획이 존재하는 이유가
그것을 막는 것이다.

## 제안 Phase 구성

### Phase 1. K-1 — 구조 검사가 실제 YAML을 본다

- `check_structure`가 frontmatter를 `yaml.safe_load`로 파싱하고, `name`·`description`이 매핑 키로
  실재하는지 확인한다.
- 양성 대조 `unparseable-frontmatter` 추가 — `description`에 따옴표 없는 콜론이 든 fixture.
- 음성 대조: 현재 네 스킬 GREEN.
- **주의**: `broken-frontmatter` fixture는 fence 부재만 시험한다. 새 fixture는 fence가 멀쩡한데
  파싱이 깨지는 형태여야 한다 — 두 지문이 교차하지 않도록 전수 대조할 것.

### Phase 2. P1-4 — 대조군을 자동 체인에 배선

- `dev_game/package.json`에 `factory:skill-gate-controls` 등록.
- `factory:qa` 체인에 편입할지, 별도로 둘지 판정 필요 — `factory:qa`는 이미 10단계다.
- 배선 후 **대조군이 자기 자신을 재귀 호출하지 않는지** 확인할 것. `check_skill_commands`가
  같은 이유로 30.69초 동안 fail-open이었다.

### Phase 3. P2-8 — required 추출의 soft fail-open

- 소스에서 인자 계약을 못 뽑은 스크립트를 조용히 통과시키지 않는다. 경고 목록으로 출력하거나
  inventory에 `contractSource: "inventory-only"`를 명시.
- 실측: `production-gate.mjs` → `["--project"]`, `codex-imagegen.mjs` → `["--project"]`,
  **`make-game.mjs` → `[]`**.

### Phase 4. P2-9 — 체크박스 정규화 범위

- 줄 시작 목록 표지로 좁힌다: `/^(\s*[-*]\s*)\[[xX]\]/gm`.
- **승인서 재발급이 필요하다.** 이 계획의 승인서를 고치는 것이 아니라, 후속 계획이 자기
  승인서를 처음부터 좁은 정규화로 발급하면 된다.

### Phase 5. 통합 검증

- 대조군 27 → 29종 예상, 교차 매칭 0건.
- `implement_20260816_141036`의 Phase 1~5 manifest 사슬 전체 재검증 — 이 후속 작업이 그 파일들을
  건드리므로 **어느 PASS가 무효화되는지 명시적으로 판정해야 한다.**

## 승계해야 할 규약

이 계획이 6회차에 걸쳐 배운 것들이다. 후속 계획도 같은 규약을 쓴다.

| 규약 | 왜 |
|---|---|
| 새 검사기는 음성·양성 대조 **둘 다** 통과해야 증거다 | §0.1 |
| 대조는 종료 코드만이 아니라 **fixture 실재 + 실패 사유 지문**까지 본다 | harness 자신이 fail-open이었다 |
| 지문은 배타적이어야 하고, 바꾼 뒤 **전수 교차 매칭을 다시 돌린다** | 같은 습관을 3회 지적받았다 |
| manifest는 **자기 자신과 자기 Phase 보고서를 담지 않는다** | 담으면 그 Phase를 닫을 수 없다 |
| N ≥ 2 manifest는 직전 Phase를 **정본 경로로** 담는다 | 동명 사본 미끼로 사슬이 우회된다 |
| `PASS`는 **발급자 귀속**을 동반한다 | 구현자가 자기 발급했다 |
| `MOVE`·`DELETE`·링크는 **목적지가 이미 소유할 때만**. 위임하는 스크립트는 끝까지 따라간다 | 같은 뿌리의 오류를 3회 냈다 |
| 표를 채울 때 **모든 행에 같은 질문**을 던진다 | 행마다 기준이 다르면 그 표는 측정이 아니다 |
| 검사가 RED를 내면 **대상보다 검사를 먼저 의심**한다 | 줄바꿈·경로·grep 오탐이 반복됐다 |

## 미기록 별건

`skills/game-feel-motion-skill/assets/fixtures/{valid,invalid}-spritesheet-manifest.json`이
존재하고 `validate_spritesheet_manifest.py`가 각각 exit 0 / exit 1을 정확히 내지만,
**저장소 어디서도 이 fixture를 실행하지 않는다.** 검증기를 강화하고 회귀를 연결하지 않은 상태다.
P1-4와 같은 성격이므로 함께 다루는 것이 자연스럽다.
