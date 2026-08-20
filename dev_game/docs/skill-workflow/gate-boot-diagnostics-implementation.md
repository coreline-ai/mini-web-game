# 구현 기록 — gate-boot-diagnostics

## 결함 — 도구가 자기 실패를 설명하지 못했다

`visual-layout-qa`·`scene-composite-qa`의 씬 대기는 이렇게 쓰여 있었다.

```js
await page.waitForFunction(() => ...scene === 'Loading', { timeout: 10000 }).catch(() => {});
await inspectCurrentPage(page, 'loading', ...)   // → "__GAME_LAYOUT_BOUNDS__ missing or empty"
```

타임아웃이 침묵하고, 다음 검사가 결과만 보고한다. 로그에 남는 것은 "레지스트리가 비었다"뿐이고
원인 판별에 필요한 것은 전부 버려진다 — 몇 초 기다렸는지, 게임 객체가 있는지, 루프가 도는지,
GL 컨텍스트가 살았는지, 로더가 어디서 멈췄는지.

그 공백을 사람이 추측으로 메웠다. 2026-08-20 이 저장소에서 같은 실패를 두고 세 번 원인을
단정했고 **세 번 다 재측정에서 배제됐다.**

| 추측 | 배제 근거 |
|---|---|
| 호스트 메모리 압력(스왑 포화) | 실패 구간 swapout 증가 0, `memory_pressure` 여유 53% |
| 특정 뷰포트 크기 | 뷰포트 4종 단독 부팅 24/24 |
| 대상 게임의 텍스처 총량(배경 85MiB) | 배경이 작은 다른 게임도 같은 비율(5/6) 실패 |

## 계측을 붙이자 첫 실패에서 원인이 나왔다

```
1080x1920 loading-wait: 10003ms 안에 도달 못함 —
  scene=(none) game=booted renderType=2 canvas=1170x2532 glLost=false glError=0
  active=[] rafTicks=725 loop=stopped frame=0 visibility=visible
```

읽는 방법이 정해져 있다.

- `rafTicks=725` → 브라우저는 프레임을 **725회 발행했다.** "프레임이 안 돈다"는 가설도 배제.
- `loop=stopped frame=0` → 그런데 **Phaser 게임 루프가 시작되지 않았다.**
- `game=booted`, `renderType=2`, `glLost=false`, `glError=0` → 게임 객체·WebGL·컨텍스트는 정상.

Phaser 3는 `TextureManager`가 기본 텍스처 준비를 알린 뒤에야 루프를 시작한다. 즉 부팅은 됐고
프레임도 오는데 그 준비 신호가 오지 않은 상태다 — 게임 코드가 아니라 렌더러/디코드 경로다.

## 원인 확정과 수정 — 소프트웨어 GL 경로

두 도구가 `--use-gl=swiftshader`를 각자 하드코딩하고 있었다. 그건 최신 Chromium에서 대체된
경로이고, 실패한 실행에는 항상 `Framebuffer status: Framebuffer Unsupported`가 함께 났다.
하드코딩이라 **비교 측정 자체가 불가능**했으므로 먼저 갈아 끼울 수 있게 만들고 쟀다.

| 경로 | visual-layout | scene-composite(픽셀 검사 포함) |
|---|---|---|
| `--use-gl=swiftshader` (이전 기본) | 9/10 | — |
| `--use-angle=swiftshader` + `--enable-unsafe-swiftshader` | **22/22** | **12/12** |

렌더러를 바꾸면 픽셀 판정이 흔들릴 수 있어 `scene-composite`의 픽셀 검사까지 12/12로 확인했다.
플레이크를 체계적 실패로 바꾸지 않았다는 확인이 이 수정의 조건이었다.

기본값을 ANGLE로 바꾸되 `GAME_QA_GL=gl`로 옛 경로를 되돌릴 수 있게 남겼다 — 되돌릴 수 없으면
다음 사람이 같은 비교를 못 한다.

## 파일별 변경

| 파일 | 변경 |
|---|---|
| `lib/browser-boot-diagnostics.mjs` (신규) | `awaitScene`(침묵하지 않는 대기), `bootDiagnostics`, `installFrameCounter`(RAF 카운터 주입), `summarizeDiagnostics`, `writeDiagnostics`, `classifyPageError`, `browserLaunchArgs` |
| `visual-layout-qa.mjs` | 대기 계측, 프레임 카운터 주입, 실행 인자 공용화, 렌더러 잡음 분류, 진단 파일·요약 출력 |
| `scene-composite-qa.mjs` | 같음 |
| `production-pass-receipt-qa.mjs` | 대조군 8개 추가(ANGLE 기본, gl 되돌리기 가능, 잡음 분류 양/음성, 두 도구의 공용 인자·대기 계측·프레임 카운터·진단 기록) |

## 부수로 닫은 잠재 결함

두 도구는 `pageerror`를 전부 hard error로 취급했다. 게임들의 자체 어댑터(`qa/_helpers.mjs`)는
같은 swiftshader 메시지를 렌더러 잡음으로 분류한다. 도구 쪽 분류가 더 엄격하면 **정상 부팅한
실행도 드라이버 메시지 하나로 실패**할 수 있다. 같은 분류로 맞추되 버리지 않고 개수와 표본을
출력한다 — 조용히 무시하면 분류가 은폐가 된다.

## 남은 범위 (이 task 밖)

같은 하드코딩이 **각 게임의 `qa/_helpers.mjs`에도 있다.** 오늘 keeper가 `input-hostility`·
`test:lifecycle`에서 떨어진 것이 그 어댑터들이다. 게임 파일 여러 개를 건드리는 일이라 선언한
범위에 넣지 않았다. 후속 작업으로 남긴다 — 그 전까지 v2 게임의 어댑터 단계는 같은 플레이크를
갖는다.
