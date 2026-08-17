# 스킬·계약 정합성 비교 — legacy-receipt-migration

## 대조

| 요구 | 실제 | 판정 |
|---|---|---|
| 완료 명령: v2는 `--mode custom-loop-full`, v1은 `--require-gpt-imagegen` | 그대로 실행 | MATCH |
| 게이트 실패는 **production-demo 미통과**로 보고, 완료로 쓰지 않는다 | `last-light-zero-hour` 미통과 보고, 영수증 미발급 | MATCH |
| 캡처에서 나온 결함은 고치고 재캡처, known gap으로 낮추지 않는다 | 재생성 시도 → 경로 부재로 차단. 낮추지 않고 미통과 유지 | MATCH |
| 라우팅을 바꾸려고 증거를 만들지 않는다 | 게이트 통과로만 발급. 증거 파일 실험은 자격을 바꾸지 못함을 확인 후 제거 | MATCH |
| `game-polish`는 `pass`/`legacy-pass`에서만 진입 | pass 4 / legacy-pass 12 = 16개 진입 가능, 3개는 factory | MATCH |

## 라우팅 변화

```
전: legacy-pass 15 / pass 1 / unknown 3
후: legacy-pass 12 / pass  4 / unknown 2 / invalid 1
```

`invalid` 1건은 `last-light-zero-hour` — 게이트를 돌렸고 실패했다는 뜻이며, `unknown`(모름)보다
정확한 상태다.

## 판정
`MATCH`
