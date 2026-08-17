# 구현 증거 — legacy-receipt-migration-b2

- task: `legacy-receipt-migration-b2` (supersedes `legacy-receipt-migration`)
- 일자: `2026-08-17`

## 사전 스윕 — 브라우저 없이 12개 전수

전체 게이트를 돌리기 전에 값싼 게이트 2종(`production-demo-qa`, `image-quality-qa`)으로
남은 12개를 먼저 훑었다. 게임당 수 초이므로 어디에 진짜 문제가 있는지 지도를 먼저 얻는다.

```
계약 게이트  12/12 OK
이미지 품질  11/12 OK   FAIL: iron-courier-last-line
```

## 배치 2 결과

| 게임 | spec | 결과 |
|---|---|---|
| `sky-archer` | v1 | pass |
| `market-panic` | v1 | pass |
| `rush-lane-racer` | v1 | pass |
| `target-shooter-rush` | v1 | pass |

allowlist 12 → 8. 누적: pass 8 / legacy-pass 8 / unknown 2 / invalid 1.

## iron-courier-last-line — 미통과 (게이트 미실행, 사전 스윕에서 차단)

```
- projectile-rifle    [core] 350x85  below min side 256px
- projectile-rifle    [core] hf 9.53 > 8 — too noisy/oversharpened (재생성 필요)
- projectile-shotgun  [core] 249x121 below min side 256px
- projectile-rocket   [core] 370x195 below min side 256px
- projectile-grenade  [core] 250x252 below min side 256px
```

`last-light-zero-hour`와 같은 벽이다 — `asset-plan.json`이 없어 `factory:imagegen`의 targeted
재생성 경로가 존재하지 않는다. 해상도 미달은 재생성 없이는 해소 불가다. 미통과로 남긴다.

## 여기서 멈춘 이유

사용자 지적이 옳다: **게임을 더 도는 것은 스킬 강화가 아니라 처리량이다.** v1(compatibility)과
v2(custom-loop-full) 경로가 실제로 작동한다는 것은 배치 1의 3건에서 이미 증명됐고, 그 뒤
게임마다 얻는 새 정보는 "이 게임도 통과한다" 하나뿐이다.

남은 8개는 같은 명령으로 언제든 이어서 돌릴 수 있다. allowlist의 `migration.stopNote`에
중단 사유를 남겼다.

## 게이트가 또 잡은 것

이 task를 시작하려다 `E_PASS_DRIFT`가 났다 — 배치 2의 영수증과 allowlist 수정이 앞 task
(`legacy-receipt-migration`)의 승인 범위였기 때문이다. 명시적 supersede로만 진행했고 drift는
`supersededDrift`에 기록됐다. **승인 범위를 건드리면 반드시 걸린다**는 것이 다시 확인됐다.
