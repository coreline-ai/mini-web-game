# 구현 기록 — skybreak-adapter-gl-r3

## 무엇을

`skybreak-gunship`의 QA 어댑터 5개에서 `--use-gl=swiftshader` 하드코딩을 제거하고,
게임 안의 `qa/_browser-args.mjs` 한 곳으로 모았다. 앞서 다른 세 게임(keeper-last-light,
last-minute-keeper, firebreak-commander)에 적용한 것과 같은 변경이다.

## 왜 이 게임만 별도 task인가

이 게임 폴더는 `skybreak-first-receipt` PASS의 승인 범위 안이다. 그 사실을 확인하지 않고
먼저 고쳤고, `factory:qa` 안의 `verify-all`이 `E_PASS_DRIFT`로 **저장소 전체의 게이트를 멈춰
세웠다**(다른 게임 3개의 재게이팅까지 8연속 실패). 게이트가 옳다 — 봉인된 승인 범위가 조용히
바뀌면 그 승인은 의미가 없다.

규칙("편집한 뒤 범위를 넓히지 말고 되돌린 다음 다시 선언한다")대로 되돌리고, `--supersede`를
선언하는 이 task로 다시 했다. supersede가 옮겨 오는 drift는 상태 파일에 기록된다.

## 세 번 다시 선언한 이유 (절차 기록)

1. `skybreak-adapter-gl` — 영수증 경로를 범위에 넣었다. 그러면 PASS 이후 게이트가 영수증을
   고칠 때 **내 task의 봉인이 깨진다**. supersede는 PASS 시점에 효력이 생기므로 PASS 전에는
   게이트를 돌릴 수도 없다 — 순환이다. 철회.
2. `skybreak-adapter-gl-r2` — 선언 **전에** 편집한 상태로 시작해 baseline이 이미 패치된 상태였다.
   `E_NO_CHANGE`. 철회.
3. `skybreak-adapter-gl-r3` — 원복 → 선언 → 편집 순서로 진행. 정상.

절차의 요점: **영수증은 범위에 넣지 않는다**(PASS 이후 게이트가 쓰므로), 그리고 **선언이 편집보다
앞선다**(baseline이 편집 전 상태여야 변경이 보인다).

## 근거와 한계

기전은 생성기 도구에서 확인됐다: 같은 플래그가 `loop=stopped frame=0`(브라우저는 프레임을
주는데 Phaser 루프 미시작)을 냈고, `--use-angle=swiftshader`로 바꾸니 9/10 → 22/22가 됐다.

다만 **어댑터 단계에서의 효과는 측정되지 않았다** — 다른 게임에서 두 경로를 각 10회 재니
10/10 vs 10/10이었다(실패율 5~10% 가정 시 판별력 부족). 유지 근거는 기전, 조건 혼재 제거,
중복 제거(15곳 → 게임당 1곳)이며 측정된 개선이 아니다. 회귀는 배제했다(ANGLE에서 어댑터 통과).

## 검증

게이트는 이 task가 PASS로 봉인된 뒤에 돌린다 — supersede가 그때 효력을 갖기 때문이다.
결과는 이 문서가 아니라 그때 발급되는 영수증이 증명한다.
