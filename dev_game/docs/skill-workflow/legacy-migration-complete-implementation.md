# 구현 증거 — legacy-migration-complete

- task: `legacy-migration-complete`
- 일자: `2026-08-18`

## 목표와 결과

`legacy-pass`는 지문이 없어 **"통과한 적이 있다"**만 뜻한다. 동결 allowlist의 게임을 실제
게이트에 통과시켜 진짜 영수증으로 바꾸는 것이 목표였다.

```
시작:  legacy-pass 15 / pass 1  / unknown 3
종료:  legacy-pass 0  / pass 15 / unknown 3 / invalid 2
allowlist  15 → 1 (retired 14)
```

**`legacy-pass` 상태의 게임이 0이 됐다.**

## 배치별

| 배치 | 게임 | 결과 |
|---|---|---|
| 1 | keeper-last-light, last-minute-keeper, meteor-dash | pass |
| 2 | sky-archer, market-panic, rush-lane-racer, target-shooter-rush | pass |
| 3 | bullseye-rush, jungle-arcshot, night-market-wok, road-stream-racer | pass |
| 4 | castle-archer, firebreak-commander, parcel-sort-rush | pass |
| 5 | iron-courier-last-line | **미통과** |

v1(compatibility)과 v2(custom-loop-full) 두 경로 모두 실사용에서 통과했다.

## 미통과 1건 — iron-courier-last-line

사전 스윕에서 예측했고, 전체 게이트를 실제로 돌려 확정했다.

```
- projectile-rifle    [core] 350x85  below min side 256px
- projectile-rifle    [core] hf 9.53 > 8 — too noisy/oversharpened (재생성 필요)
- projectile-shotgun  [core] 249x121 below min side 256px
- projectile-rocket   [core] 370x195 below min side 256px
- projectile-grenade  [core] 250x252 below min side 256px

영수증: 미발급   표식: 남음   상태: invalid
```

해상도 미달은 재생성 없이 해소되지 않는데, 이 게임은 `asset-plan.json`이 없는 세대다
(`last-light-zero-hour`와 같은 벽). `factory:asset-plan-recover`로 계획 골격은 복원되지만
프롬프트가 소실돼 있어 사람이 새로 써야 한다. **미통과로 남긴다.**

allowlist에 이 게임 1개를 남겨 둔 것은 "통과한 적이 있다"는 사실 기록이며, 영수증이 없으므로
`pass`가 아니다. 게이트를 통과하는 날 목록에서 내리고 파일을 지우면 `legacy-pass` 개념이
코드에서 사라진다.

## 내 호출 오류 1건

`firebreak-commander` 첫 실행이 `미지원 플래그: --mode custom-loop-full`로 죽었다. 셸 변수를
따옴표로 묶어 두 인자가 하나로 전달된 것이며 **스크립트 결함이 아니라 내 호출 오류**다.
바로잡아 재실행했고 통과했다. Phase 2의 계약 검증이 이 오타를 즉시 잡아 준 사례이기도 하다.

## 스테이징 규율

`git add -A`를 쓰지 않는다. 이전 커밋에서 그 명령이 선언하지 않은 파일을 쓸어 담아 게이트가
`E_SCOPE`를 냈고, 그때는 무시하고 커밋했다. 이번 task는 동시 작업 경로를 **allow로 선언**했고
스테이징도 경로를 명시한다.
