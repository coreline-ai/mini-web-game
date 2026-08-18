# 구현 증거 — drop-receipt-attestation

- task: `drop-receipt-attestation`
- 일자: `2026-08-18`

## 왜 되돌리나

사용자 지적이 옳다. 영수증 서명(ed25519 + CI 발급)은 **스킬 작업이 아니었다.**

체인은 이랬다: 스킬이 영수증으로 라우팅한다 → 영수증을 위조할 수 있다 → 위조를 닫자.
그런데 위협 모델을 세우지 않고 3단계로 건너뛰었다. 여기서 "위조자"는 외부 공격자가 아니라
이 저장소에서 일하는 에이전트나 사람이다. JSON 파일 하나를 손으로 못 쓰게 하려고 비대칭
암호와 저장소 시크릿을 붙인 셈이다.

## 결정적인 이유 — 켜면 스킬이 깨진다

`game-factory`는 **로컬에서** 완료 게이트를 돌리라고 지시한다.

```
skills/game-factory/SKILL.md:245
  npm --prefix dev_game run factory:production-gate -- --project ... --require-gpt-imagegen
```

서명 스위치를 켜면 비밀키가 CI에만 있으므로 **로컬 게이트가 만든 영수증은 invalid**가 된다.
켜는 순간 문서화된 워크플로가 깨지고 현재 `pass` 15개가 한꺼번에 무효가 된다.

**활성화하면 스킬을 깨는 기능은 기능이 아니라 함정이다.** 스위치가 꺼져 있어 "무해하다"는
것도 이유가 되지 않는다 — 유지해야 할 죽은 코드이고, 언젠가 켜면 사고가 난다.

## 제거 범위

| 대상 | 처리 |
|---|---|
| `lib/receipt-attestation.mjs` (109줄) | 삭제 |
| `sign-pass-receipt.mjs` (78줄) | 삭제 |
| `lib/production-pass-receipt.mjs` | 서명 검증 호출·상태 문구 원복 |
| `production-pass-receipt-qa.mjs` | 서명 대조군 5건 + CI 배선 대조군 5건 제거 |
| `cli-contracts.json` / `package.json` | `factory:sign-pass-receipt` 제거 |
| `check_cli_parity.mjs` | leaf 6 → 5 (79건) |
| `.github/workflows/dev-game-factory.yml` | `issue-pass-receipt` 잡 + dispatch 입력 제거 |

`asset-plan-recover`의 parity 편입은 **유지한다** — 그건 스킬이 실제로 쓰는 CLI다.

## 남기는 것 — 결정을 코드에 기록

`production-pass-receipt.mjs` 헤더에 왜 닫지 않는지 적었다. 영수증이 막는 것은 "게이트를
안 돌리고 완료라고 말하는 것"이고, 지문·미검증 표식·QA 세션 교차 검증으로 충분히 비싸다.
손으로 쓴 영수증은 여전히 가능하지만 그건 규칙을 어기기로 **작정한** 경우이며, 암호가 아니라
검토가 잡을 문제다.

## 검증

```
receipt QA          exit 0
CLI parity          leaf 5 × 79건
gate controls       52개
gate QA             33 assertions
asset-plan QA       exit 0
게임 상태           pass 15 / unknown 3 / invalid 2   ← 제거 전과 동일
```
