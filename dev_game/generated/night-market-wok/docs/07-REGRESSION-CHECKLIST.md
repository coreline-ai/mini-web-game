# 07 · Regression Checklist — Night Market Wok

이후 `game-polish` 세션은 **새 증상을 보기 전에 이 목록부터 재실행**한다. 여기 있는 항목이 다시 재현되면 그것이 그 세션의 최우선 순위다.

## 자동 (한 줄 실행)

```bash
node scripts/cooking-loop-regression.mjs --port 4455
```

G1~G6, G8, EX 8개 assertion. 실패 시 exit 1.

## 수동 재현 시나리오 (캡처 리뷰에서 나온 것)

| # | 결함 | 재현 조건 | 확인값 |
|---|---|---|---|
| R1 | player 스프라이트 셀 경계 잘림 | `assets/characters/player.webp` 알파 bbox 측정 | 사방 pad > 0 |
| R2 | 홈 타이틀 세이프 마진 이탈 | 390×844 Home 캡처 | 타이틀 좌 ≥ 8px, 우 ≤ 382px |
| R3 | 티켓 패널↔제목 겹침 오탐 | 390×844 Game, `__GAME_LAYOUT_BOUNDS__` 확인 | `order-panel`/`order-title`에 `allowOverlapWith` 존재 |
| R4 | 런타임 자산 예산 초과 | `npm run build` 후 dist 크기 | `factory:dist-runtime-qa` OK (< 16MB) |
| R5 | **좌석 중복 표시(같은 손님·같은 주문)** | 게임 시작 직후 390×844 캡처, 좌석 2개 이상 착석 상태 | 손님 텍스처가 서로 다름 **그리고** 주문명이 서로 다름 |
| R6 | 좌석 재사용 시 이탈 애니메이션과 신규 착석 충돌 | 서빙/이탈 10사이클 | `seatConflicts === 0`, `visibleCustomers === activeCustomers` |

## 주의 — 지표 해석

`visibleCustomers`는 **이탈 중(`leaving`) 좌석을 제외**한다. 이탈 페이드아웃은 정상 동작이며 중복이 아니다. 실제 불변식 위반은 `seatConflicts > 0`(한 좌석이 동시에 `active`이면서 `leaving`)이다. 이 구분을 되돌리면 정상 이탈이 전부 결함으로 잡힌다.

## 난이도 계약 (변경 시 반드시 재확인)

`recipeConfig.js`의 난이도 입력은 `elapsedSec`와 `servedCount`뿐이어야 한다. 남은 인내심·점수·콤보를 난이도에 넣으면 class D 위반이다.

시작 티어의 `maxSteps`를 2로 되돌리면 해당 레시피가 1종뿐이라 **R5가 즉시 재발**한다.

## 후보정 세션 1에서 추가 (2026-08-15)

| # | 결함 | 재현 조건 | 확인값 |
|---|---|---|---|
| R7 | **canvas backing store가 DPR 미달** (화면 전체가 물러 보이는 지배적 원인) | 390×844 뷰포트, deviceScaleFactor 2로 로드 후 `canvas.width / getBoundingClientRect().width` | `backingScale >= min(devicePixelRatio, 3)`. 현재 논리 캔버스 1170×2532 → backingScale 3 |
| R8 | 스프라이트 알파 경계의 마젠타 오염 | `requiresAlpha` 자산의 반투명 띠(alpha 40~220) 색 측정 | **B/R ≤ 0.6**. 0.8 이상이면 크로마 잔여(빨강 아트는 B가 낮아 0.5 이하) |
| R9 | 스프라이트 내부 잔여 자홍 화소 | `alpha>60 & R>140 & B>140 & G<100` 화소 수 | 자산당 ≤ 5px |
| R10 | 배경 선명도 미달 | `factory:hq-screen-quality-qa` | 배경 엣지분산 ≥ 60 (stage-3는 재생성 후 181.7) |

### R7 재발 조건 — 반드시 읽을 것

`SPEC.canvas`를 390×844로 되돌리면 **R7이 즉시 재발**한다. Phaser 3.90에는 `resolution` 옵션이 없어 backing store는 논리 캔버스 크기와 같다. 논리 캔버스는 디자인 단위(390×844)의 정수배여야 하며, 모든 절대 픽셀값은 `tuning.js`의 `U`를 곱해 쓴다. `U` 없이 상수를 직접 넣으면 그 요소만 3배 작게 나온다.

배경 런타임 크기도 논리 캔버스 이상이어야 한다(현재 1440×3120 ≥ 1170×2532). 캔버스를 키우면서 배경을 그대로 두면 `production-demo-qa`가 실패한다.

### R8/R9 자동 측정

```bash
python3 - <<'PY'
from PIL import Image
import numpy as np, json
from pathlib import Path
man = json.loads(Path('assets/asset-manifest.json').read_text())
for e in man['images']:
    if not e.get('requiresAlpha'): continue
    im = np.array(Image.open(e['path']).convert('RGBA')).astype(int)
    r,g,b,a = im[...,0],im[...,1],im[...,2],im[...,3]
    band=(a>40)&(a<220); s=im[...,:3][band]
    br = s[:,2].mean()/max(s[:,0].mean(),1)
    mag = ((a>60)&(r>140)&(b>140)&(g<100)).sum()
    flag = 'FAIL' if br>0.6 or mag>5 else 'ok'
    print(f'{e["id"]:<22} B/R {br:4.2f}  자홍 {int(mag):4d}px  {flag}')
PY
```
