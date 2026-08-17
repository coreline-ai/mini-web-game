# 구현 증거 — receipt-attestation

- task: `receipt-attestation` (supersedes `generation-group-integrity`)
- 일자: `2026-08-17`

## 닫으려는 것

영수증 위조. 이 저장소의 문서가 계속 "문턱만 올랐고 닫히지 않았다"고 적어 온 항목이다.

```
$ 게이트를 한 번도 돌리지 않고 손으로 영수증을 쓴다
  verifyPassReceipt → state: pass, ok: true      ← 위조 성립 (실측)
```

`projectFingerprint`는 공개 파일의 공개 해시라 누구나 계산한다. git 앵커(커밋 요구)는 흔적을
남길 뿐 막지 못한다 — 커밋 권한이 있으면 위조도 커밋된다.

## 왜 비대칭 서명뿐인가

막으려면 **위조자가 갖지 못하는 비밀**이 필요하다.

- **대칭키(HMAC)는 안 된다.** 검증하려면 그 비밀이 있어야 하고, 비밀이 있으면 위조도 된다.
  검증자가 곧 위조자다.
- **비대칭 서명은 된다.** 비밀키는 CI 시크릿에만 두고, 공개키는 저장소에 커밋한다. 누구나
  검증할 수 있고 아무도 그것으로 서명하지 못한다.

## 구현

| 파일 | 내용 |
|---|---|
| `lib/receipt-attestation.mjs` (신규) | ed25519 서명·검증. 서명 대상은 `attestation`을 뺀 키 정렬 JSON |
| `lib/production-pass-receipt.mjs` | 지문 대조 **전에** 서명 검증. 실패 시 `invalid` |
| `sign-pass-receipt.mjs` (신규) | CI 전용 서명기. 비밀키는 환경변수, 재서명 거부, 영수증이 없으면 실패 |
| `.github/workflows/dev-game-factory.yml` | `issue-pass-receipt` 잡 — 게이트 → 서명 → 검증 → 아티팩트 |

## 전환 스위치 — 공개키 파일의 존재

```
공개키 없음  → 지금까지처럼 동작. reason 에 "unattested — no signing key committed" 명시
공개키 있음  → 무서명 영수증은 invalid
```

저장소가 전환 시점을 스스로 정한다. **공개키를 커밋하는 순간 기존 영수증 8건이 전부
무효가 되고 CI가 다시 발급해야 한다** — 켜기 전에 알아야 할 사실이라 코드 주석과 워크플로
주석 양쪽에 절차와 함께 적었다.

## 실측 — 위조가 실제로 닫히는가

```
공개키 없음 + 위조 영수증   → pass      (전환 전 상태)
공개키 커밋 + 위조 영수증   → invalid   "requires CI-signed receipts"
CI 서명 영수증              → pass      attested: fdd69d445d6844fd
서명 후 내용 변조           → invalid   "does not match the receipt"
다른 키로 서명              → invalid   "does not match the committed signing key"
```

## 결함 주입 검증

| 되돌린 것 | 결과 |
|---|---|
| 공개키가 있어도 서명을 요구하지 않음 | `unsigned receipt once a key is committed` ✗ |
| 서명 검증 없이 존재만 확인 | `receipt edited after signing` ✗ |
| keyId 대조 제거 | `receipt signed by a different key` 사유 불일치 ✗ |
| `verifyPassReceipt`의 검증 호출 제거 | 서명 대조군 전부 ✗ |
| CI가 게이트 전에 서명 | `CI must run the production gate before signing` ✗ |

## 대조군 설계에서 두 번 틀렸다

1. 변조 대상을 `gateProfile`로 잡았더니 **spec 대조가 먼저 걸려** 서명 검증이 아닌 이유로
   붉어졌다. 다른 검사가 보지 않는 `generatedAt`으로 바꿨다.
2. 새 pass 대조군의 지문이 기존 pass 지문과 겹쳤다. 지문 배타성 검사가 잡았고, **같은 사유는
   같은 지문**이 맞으므로 통일했다.

## 남은 한계

- **키가 없으면 아직 닫히지 않는다.** 이 작업은 기계를 만든 것이고, 켜는 것은 키 생성과
  시크릿 등록이 필요하다 — 비밀키는 저장소 소유자가 만들어야 하며 내가 만들어 둘 수 없다.
- 서명은 "CI가 게이트를 통과시켰다"를 증명하지, 게이트가 옳다는 것을 증명하지 않는다.
  게이트의 정확성은 여전히 대조군이 담보한다.
