# 구현 기록 — adapter-gl-drift-closure

## 문제

`revert-adapter-gl` PASS 이후 `verify-all`이 E_PASS_DRIFT를 냈다. 봉인된 네 경로
(`*/qa/_browser-args.mjs`)가 PASS 시점에는 `MISSING`(작업 트리 삭제, 인덱스 잔존)이었고,
삭제 커밋 뒤 git 목록에서 사라져 키 자체가 없어졌다.

그 결과 네 게임의 게이트가 foundation에서 8연속 실패했다(게임당 2회 시도 × 4게임). 게이트가
멈춘 것은 옳다 — 봉인이 깨진 상태에서 새 영수증을 발급하면 그 영수증의 근거가 무엇인지 알 수 없다.

## 조치

1. `adapter-gl-drift-closure.md`(이 task의 target)에 **삭제 케이스의 순서 규칙**을 적었다:
   `git rm` → PASS → 커밋. 저장소에 이미 있던 교훈(스테이징 정리는 drift를 만든다)의 삭제 변종이다.
2. 이 task가 `revert-adapter-gl`을 supersede하며 drift를 상태 파일에 기록한다.
3. `qa/` 디렉터리는 다시 봉인하지 않는다 — 더 바꿀 것이 없고, 봉인하면 다음 게이트가 같은
   문턱에 걸린다. 영수증도 범위에 넣지 않는다(PASS 이후 게이트가 쓰면 자기 봉인이 깨진다).

## 오늘 이 절차에서 막힌 기록 (네 번)

| 순서 | 무엇 | 게이트 반응 |
|---|---|---|
| 1 | 봉인된 게임(skybreak) qa를 선언 없이 편집 | `E_PASS_DRIFT` — 저장소 전체 게이트 정지 |
| 2 | 영수증을 task 범위에 포함 | 순환(PASS 전 게이트 불가 / PASS 후 봉인 깨짐) |
| 3 | 선언보다 편집이 앞섬 | `E_NO_CHANGE` |
| 4 | 삭제를 스테이징하지 않고 PASS | `E_PASS_DRIFT` (이 task가 닫는 것) |

네 번 다 게이트가 먼저 멈춰 세웠고, 범위를 넓히는 대신 되돌리거나 다시 선언했다.

## 검증

`verify-all`이 초록으로 돌아오면 네 게임을 재게이팅해 영수증을 발급한다 — 결과는 이 문서가
아니라 그 영수증이 증명한다.
