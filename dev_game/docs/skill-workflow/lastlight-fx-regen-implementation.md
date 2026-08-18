# 구현 증거 — lastlight-fx-regen

- task: `lastlight-fx-regen`
- 일자: `2026-08-18`

## 시작점

`last-light-zero-hour`는 게이트에서 이미지 품질로 떨어져 있었다.

```
fx-rocket-explosion-v1 [fx] hf 7.08 > 6 — too noisy/oversharpened (재생성 필요)
```

앞선 판단은 "asset-plan 이 없어 재생성 경로가 없다 → 미통과로 남긴다"였다. 그건 절반만
맞았다. **새 프롬프트를 쓰는 것은 위조가 아니라 `game-factory`의 정상 작업**이다. 위조는
옛 프롬프트에서 나왔다고 주장하는 것이지, 새로 쓰는 것이 아니다.

## 1. fx 재생성

`factory:asset-plan-recover`로 계획 골격을 복원하고, hf(3x3 라플라시안 평균)를 낮추도록
프롬프트를 썼다 — 미세 파편·스파클·그레인·과선명을 명시적으로 금지하고 넓고 부드러운
볼륨을 요구했다. 통과 중인 형제 `fx-infected-burst`가 스타일 기준이다.

## 2. 내 가드가 targeted 재생성을 막고 있었다

첫 시도가 이렇게 죽었다.

```
asset-plan에 프롬프트가 없는 항목이 있다: backgrounds/phase-1-dawn, ... (17개)
```

`assertPlanPrompts`가 **계획 전체**를 요구했다. 자산 하나를 다시 만드는데 나머지 17개
프롬프트를 요구하면, 복원된 계획(프롬프트가 비어 있는 것이 정상)에서는 이 경로가 통째로
닫힌다. 가드의 목적은 "빈 프롬프트로 생성하지 마라"이지 "모든 항목에 프롬프트가 있어야
한다"가 아니다. **이번 실행이 실제로 만들 항목만** 보도록 좁혔다.

## 3. 배송 형태를 잘못 바꿨다가 되돌림

두 번째 시도는 성공했지만 런타임 내보내기가 fx 를 384px WebP 로 축소해
`width 384 < minWidth 1024` 로 떨어졌다. 원인을 보니 이 게임은 **fx 를 풀사이즈 PNG 로
배송**한다(형제 자산 1254px, manifest 12개가 PNG). `RUNTIME_MAX_SIDE.fx = 384` 는 다른
게임들의 모델이다.

manifest 의 `minWidth: 1024` 를 낮춰 통과시키는 것은 **요구를 깎아 통과시키는 것**이라
하지 않았다. 대신 `--no-runtime-export` 로 게임의 기존 배송 모델을 지켜 1024x1024 PNG 를
만들었다. 형제 자산과 같은 형태다.

## 4. 브라우저 게이트가 애초에 통과 불가능한 상태였다

이미지 품질이 통과하자 처음으로 브라우저 게이트에 도달했고 404 가 났다.

```
404 http://127.0.0.1:4185/mini-web-game/last-light-zero-hour/assets/index-*.js
canvas: 0
```

`vite.config.js` 가 빌드에만 절대 base 를 박고 있었다 — 저장소에서 이 게임만 그렇다
(Pages 배포 대상이라서). 로컬 preview 는 루트에서 서빙하므로 번들을 영원히 못 찾는다.
**이 게임은 브라우저 게이트를 통과할 수 없는 상태로 있었다.**

`base: './'` 로 통일했다. Pages 는 이 앱을 `/mini-web-game/last-light-zero-hour/` 아래에
두므로 문서 기준 상대 경로가 절대 경로와 같은 곳을 가리키고, `pages-artifact-smoke.mjs` 도
같은 접두사로 서빙하므로 배포 쪽 동작은 그대로다. 상대 빌드 후 preview 에서 404 0건,
canvas 1개를 실측했다.

**중간에 시험이 오염됐다**: `factory:visual-layout-qa` 가 자체적으로 재빌드해서 내 상대
빌드를 덮었고, 그래서 첫 검증이 "상대경로로도 404" 라는 잘못된 결론을 냈다. QA 없이 다시
재면서 바로잡았다.

## 5. 그제야 보인 실제 레이아웃 결함 2종

| 결함 | 원인 | 조치 |
|---|---|---|
| `loading-bar-back ↔ loading-bar-fill` 겹침 (3 뷰포트) | 진행 바 fill 이 track 안에 있는 것은 **설계**다. 검사기에 `allowOverlapWith` 예외 장치가 있는데 게임이 선언하지 않았고, **`LayoutRegistry` 가 그 필드를 검사기로 전달하지도 않았다** | 두 씬에서 쌍별 예외를 선언하고 `LayoutRegistry` 가 실어 보내도록 수정 |
| `weapon-gatling` 좌측 7.3px / `weapon-rail` 우측 초과 | 카드 x 가 `152 + i*284` 하드코딩. 논리 폭 1440 기준 여백 27px → 390 뷰포트에서 `27 × 390/1440 = 7.3px`, 요구 8px 를 0.7px 미달 | 폭에서 계산(여백 36)하도록 변경 — 카드 수가 바뀌어도 유지된다 |

기하 확인: `barBack` 은 중심 `width/2` 폭 `width*0.72`, `bar` 는 좌단 `width*0.14`
(= track 좌단과 일치) 높이 34 로 동일. 교과서적인 진행 바이므로 예외 선언이 옳다.

## 결과

```
image-quality-qa      OK (12 assets)
visual-layout-qa      OK (3 뷰포트)
production-gate       exit 0
영수증                발급, state: pass, gateProfile: compatibility
미검증 표식           제거됨 (성공 시에만)
라우팅                pass 16 / unknown 3 / invalid 1
```

## 범위 재선언

첫 task(`lastlight-fx-regen`)는 게임 디렉터리만 target 으로 잡았는데, 위 2번의 가드 수정이
`codex-imagegen.mjs` 와 그 대조군을 건드린다. 게이트가 `E_SCOPE` 로 막았고 — 옳다 —
`lastlight-fx-regen-r2` 로 범위를 정확히 다시 선언했다. 첫 task 는 PASS 에 도달한 적이 없어
supersede 대상이 아니므로 상태 파일만 철회했다.
