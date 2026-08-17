# 스킬·계약 정합성 비교 — skybreak-first-receipt

## 비교 대상
- `skills/game-factory/SKILL.md` — 완료 판정과 production-demo 게이트
- `skills/game-polish/SKILL.md` — 첫 PASS 경계 라우팅
- `dev_game/docs/production-demo-quality-contract.md`

## 대조

| 요구 | 실제 | 판정 |
|---|---|---|
| 완료 명령은 `factory:production-gate --mode custom-loop-full` (v2) | 그대로 실행, exit 0 | MATCH |
| 빌드 성공은 완료가 아니다 — 전 게이트 통과만 완료 | 계약·이미지·레이아웃·씬·custom-loop-full 전부 통과 후에만 영수증 | MATCH |
| 최종 증거는 같은 runId의 `qa-session-report.json` | 영수증 `qaRunId` = 세션 `runId` (2026-08-17T13-32-24-752Z) | MATCH |
| `game-polish`는 `pass`/`legacy-pass`에서만 진입 | 이 게임은 이제 `pass` — polish 진입 가능 | MATCH |
| 영수증은 저장소가 공유하는 사실 | 대상 게임을 추적으로 전환해 지문이 재현 가능 | MATCH |
| 라우팅을 바꾸려고 증거를 만들지 않는다 | 게이트를 실제로 통과해 발급 — 손으로 쓴 파일 없음 | MATCH |

## 라우팅 변화

```
이전: skybreak-gunship  unknown      → game-factory
이후: skybreak-gunship  pass         → game-polish (후보정 요청 시)
전체: legacy-pass 15 / pass 1 / unknown 3
```

## 판정
`MATCH`
