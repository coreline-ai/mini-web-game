# 구현 증거 — signer-path-resolution

- task: `signer-path-resolution` (supersedes `receipt-attestation`)
- 일자: `2026-08-18`

## 앞 커밋이 CI에서 실패했을 것이다

`receipt-attestation`의 성공 경로를 **실제로 실행해 본 적이 없었다.** 오류 경로만 확인하고
커밋했다. 임시 키쌍으로 CI와 동일한 호출을 해 보니 바로 깨졌다.

```
$ RECEIPT_SIGNING_KEY=... npm --prefix dev_game run factory:sign-pass-receipt -- \
    --receipt dev_game/docs/qa-evidence/skybreak-gunship-production-pass.json
서명할 영수증이 없다: .../dev_game/dev_game/docs/qa-evidence/...
```

`npm --prefix dev_game run`은 cwd가 `dev_game/`이다. 저장소 루트 기준 경로를 그대로
`path.resolve(cwd, arg)` 하면 `dev_game/dev_game/...`이 된다. **커밋된 워크플로가 정확히
이 형태로 부른다.**

## 두 번째 결함 — 서명기가 자기 위치를 기준으로 삼았다

공개키를 `publicKeyPath(devGame)`에서 읽는데 `devGame`이 **스크립트 위치** 기준이었다.
그래서 다른 트리의 영수증에 이 저장소의 키로 서명하려 들고, 대조군을 쓰려면 실제 저장소에
공개키를 써야 했다 — **시험이 스위치를 켜 버린다.**

이제 **영수증 경로에서 위로 걸어** `dev_game`을 찾는다. 서명기가 자기 위치와 무관하게
"그 영수증이 속한 저장소"의 키를 쓴다.

## 세 번째 — 신규 CLI 두 개가 계약 밖이었다

Phase 2가 "모든 leaf CLI는 공용 계약을 쓰고 parity harness가 대조한다"로 정했는데,
이후 추가한 두 CLI가 그 밖에 있었다.

```
계약 등록:  asset-plan-recover ○ / sign-pass-receipt ✗
parity 편입: asset-plan-recover ✗ / sign-pass-receipt ✗
```

둘 다 편입했다. `sign-pass-receipt`는 손으로 `indexOf` 파싱하던 것을 `assertArgv`로 바꿨다.
parity는 leaf 4개 × 76건 → **6개 × 82건**.

## 결함 주입 검증

| 되돌린 것 | 결과 |
|---|---|
| cwd 부모 후보 제거 (원래 버그 복원) | `the signer must resolve a repo-root path when cwd is dev_game` ✗ |

이 대조군은 **CI가 부르는 형태 그대로 서명기를 실행**한다. 소스 문자열 검사로는 잡히지 않는
종류라 실제 실행으로 건다. fixture는 완전히 샌드박스 안이며 실제 저장소를 건드리지 않는다.

## 실측 — 전체 흐름

임시 키쌍으로 스위치 ON을 재현하고 확인한 뒤 키를 파기했다.

```
공개키 배치        → 기존 영수증 즉시 invalid ("requires CI-signed receipts")
CI 형태로 서명     → 서명 완료 (key dc31e2c0dbbbfa7f)
검증               → state: pass, attested: dc31e2c0dbbbfa7f
재서명             → "이미 서명된 영수증이다"
무서명 다른 게임   → invalid
정리 후            → 저장소 변경 0
```

## 교훈

**오류 경로만 시험하고 성공 경로를 시험하지 않으면 아무것도 증명되지 않는다.** 앞 작업의
대조군은 "키가 없으면 실패한다"까지만 봤고, 그래서 CI에서 반드시 실패할 코드가 통과했다.
