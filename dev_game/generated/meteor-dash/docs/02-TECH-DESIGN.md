# 02 · Technical Design — Meteor Dash

## Engine & rendering
- Phaser 3 + Vite, logical canvas 390×844 (portrait).
- Scale.FIT + CENTER_BOTH; safe-area aware HUD.

## Scenes
Boot → Loading → Home → Game → Pause → GameOver.

## Systems
- **Spawner:** object-pooled falling hazards + collectibles; time-based difficulty curve.
- **StageManager:** swaps stage/theme background as elapsed time crosses thresholds.
- **Juice:** hit-flash, screen shake, particle burst on collect/hit, score pop.
- **LayoutRegistry:** publishes visible UI bounds to `window.__GAME_LAYOUT_BOUNDS__`
  so visual-layout-qa can detect HUD overlap / safe-area violations.
- **SaveData:** localStorage best-score + settings, corruption-safe.
- **AudioManager:** unlock on first input, mute persistence, pause on hidden.

## Performance
60fps target, object pooling, frame-rate-independent movement (delta-scaled).

## Asset loading
Backgrounds and core sprites are declared in assets/asset-manifest.json and loaded by key.


## 난이도 축 단조성 (폴리시 계약 §D)
난이도 입력은 `elapsedSec`(단조 증가) 단일 축: interval=lerp(start,max,t), speed=lerp(...), t=level/maxLevel, level=floor(elapsed/15). SHOWER 이벤트는 elapsed 파생 주기(22s)로만 발동하고, SHIELD 보상은 생존 보조일 뿐 난이도 입력을 되돌리지 않는다 — 보상이 플레이를 연장해도 압박은 계속 상승한다.

## 폴리시 세션 #1 추가 시스템
- ShowerEventSystem: idle→warning(배너)→active(Spawner.intervalScale 1/3)→보너스. GameScene.update에서 elapsedMs 구동.
- ShieldSystem: 낙하 아이템 풀(3), pickup→ring 표시, absorbHit()가 onHit를 가로챔(true=흡수), 무적 800ms, §A 준수(트윈 kill+alpha 복원).
- 움직임: 관성 이징(목표속도 dx×11, exp 스무딩), 방향전환 스쿼시&스트레치(기준 스케일 배수 트윈), 추진 트레일 파티클(onComplete destroy — §K), 속도 비례 애니 timeScale(0.7~1.6).
- 입력(§I): makeTextButton opts.once — PLAY/RETRY/HOME/RESUME 전이 버튼 one-shot 가드.
