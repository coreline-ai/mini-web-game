# 스킬·계약 정합성 비교 — adapter-gl-drift-closure

## 비교 대상
- `AGENTS.md` — drift가 나면 멈춘다, 해소는 `--supersede`로만, 해시를 고쳐 맞추지 않는다
- `dev_game/docs/skill-workflow/lastlight-fx-regen-implementation.md` — 같은 패턴의 선례

## 대조

| 요구 | 실제 | 판정 |
|---|---|---|
| drift가 나면 해시를 고쳐 맞추지 않는다 | 상태 파일을 손대지 않고 supersede로 닫았다 | MATCH |
| supersede가 옮겨 오는 drift는 기록한다 | `SUPERSEDE_DRIFT`가 상태 파일에 남는다 | MATCH |
| 반복되는 실패는 규칙으로 승격한다 | 삭제 케이스의 순서 규칙(`git rm` → PASS → 커밋)을 문서로 남겼다 | MATCH |
| 필요 없는 봉인을 만들지 않는다 | `qa/`와 영수증을 범위에 넣지 않았다 — 넣으면 다음 게이트가 같은 문턱에 걸린다 | MATCH |
| 게임 파일·로직 변경 없음 | 이 task는 문서만 만든다 | MATCH |

## 판정
`MATCH`
