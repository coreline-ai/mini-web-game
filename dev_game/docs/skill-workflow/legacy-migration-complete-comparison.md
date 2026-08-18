# 스킬·계약 정합성 비교 — legacy-migration-complete

| 요구 | 실제 | 판정 |
|---|---|---|
| 완료 명령은 v1 `--require-gpt-imagegen` / v2 `--mode custom-loop-full` | 15건 그대로 실행 | MATCH |
| 게이트 실패는 미통과로 보고, 완료로 쓰지 않는다 | iron-courier-last-line 미통과, 영수증 미발급, 표식 잔존 | MATCH |
| 결함을 known gap으로 낮추지 않는다 | 재생성 경로 부재를 사유로 명시, 낮추지 않음 | MATCH |
| 영수증을 번 게임은 allowlist에서 내린다 | 14건 내림, 전부 `pass` 유지 확인 | MATCH |
| 라우팅을 바꾸려고 증거를 만들지 않는다 | 게이트 통과로만 발급 | MATCH |

## 라우팅

```
legacy-pass 0 / pass 15 / unknown 3 / invalid 2
```

`game-polish` 진입 가능 15개가 **전부 현재 유효한 영수증**을 갖는다. 물려받은 자격은 0이다.

## 판정
`MATCH`
