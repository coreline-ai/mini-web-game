import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// PASS 영수증 서명 — 위조를 **문턱 올리기**에서 **차단**으로 바꾸는 유일한 수단.
//
// ── 왜 해시로는 안 되는가 ────────────────────────────────────────────────────
// 영수증의 `projectFingerprint`는 공개 파일의 공개 해시다. 누구나 계산할 수 있으므로
// 게이트를 한 번도 돌리지 않고 손으로 쓴 영수증이 통과한다 — 실측으로 재현된다.
// git 앵커(커밋 요구)는 흔적을 남길 뿐 막지는 못한다. 커밋 권한이 있으면 위조도 커밋된다.
//
// 막으려면 **위조자가 갖지 못하는 비밀**이 필요하다. 대칭키(HMAC)는 안 된다 — 검증하려면
// 그 비밀이 있어야 하고, 비밀이 있으면 위조도 된다. 그래서 비대칭 서명이다:
//
//   비밀키   CI 저장소 시크릿에만 존재 (로컬에 없다)
//   공개키   저장소에 커밋 — 누구나 검증할 수 있고, 아무도 그것으로 서명하지 못한다
//
// ── 전환 스위치 ──────────────────────────────────────────────────────────────
// 공개키 파일이 **없으면** 지금까지처럼 동작한다(무서명 영수증도 pass). 공개키가 커밋되는
// 순간부터 무서명 영수증은 `invalid`가 된다. 그래서 전환 시점을 저장소가 스스로 정한다.
//
// **주의**: 공개키를 커밋하면 기존 영수증이 전부 무효가 된다. CI가 다시 발급해야 한다.
// 그 사실을 여기 적어 둔다 — 켜고 나서 놀라는 것보다 낫다.
//
// 켜는 절차 (`.github/workflows/dev-game-factory.yml`의 `issue-pass-receipt` 잡 주석과 동일):
//   openssl genpkey -algorithm ed25519 -out signing.pem
//   openssl pkey -in signing.pem -pubout -out dev_game/docs/qa-evidence/receipt-signing-public.pem
// 그다음 signing.pem 내용을 저장소 시크릿 `RECEIPT_SIGNING_KEY`로 등록하고 로컬 파일은 파기한다.
// 비밀키가 로컬에 남아 있으면 이 구조의 의미가 없다 — 로컬에서 서명할 수 있으면 위조도 된다.

export const PUBLIC_KEY_RELATIVE = 'docs/qa-evidence/receipt-signing-public.pem';

/** 서명 대상 바이트. `attestation` 자체는 제외하고 키 순서를 고정한다. */
export function attestationPayload(receipt) {
  const copy = { ...receipt };
  delete copy.attestation;
  const ordered = Object.fromEntries(Object.keys(copy).sort().map((key) => [key, copy[key]]));
  return Buffer.from(JSON.stringify(ordered), 'utf8');
}

/** 공개키의 짧은 지문. 어느 키로 서명됐는지 영수증에 남긴다. */
export function keyId(publicKeyPem) {
  return crypto.createHash('sha256').update(publicKeyPem.trim()).digest('hex').slice(0, 16);
}

export function publicKeyPath(devGameRoot) {
  return path.join(devGameRoot, ...PUBLIC_KEY_RELATIVE.split('/'));
}

/** 저장소가 서명을 요구하는가. 공개키 파일의 존재가 곧 스위치다. */
export function attestationRequired(devGameRoot) {
  return fs.existsSync(publicKeyPath(devGameRoot));
}

/** CI 전용. 비밀키로 영수증에 서명한다. */
export function signReceipt(receipt, privateKeyPem, publicKeyPem) {
  const signature = crypto.sign(null, attestationPayload(receipt),
    crypto.createPrivateKey(privateKeyPem));
  return {
    ...receipt,
    attestation: {
      algorithm: 'ed25519',
      keyId: keyId(publicKeyPem),
      signature: signature.toString('base64'),
    },
  };
}

/**
 * 서명을 검증한다. 반환은 `{ ok, reason }`.
 * 공개키가 없으면 요구하지 않는다(`ok: true, reason: null`) — 전환 전 상태다.
 */
export function verifyAttestation(receipt, devGameRoot) {
  if (!attestationRequired(devGameRoot)) return { ok: true, reason: null, required: false };
  const publicKeyPem = fs.readFileSync(publicKeyPath(devGameRoot), 'utf8');
  const attestation = receipt.attestation;
  if (!attestation) {
    return {
      ok: false, required: true,
      reason: 'PASS receipt has no attestation — this repo requires CI-signed receipts '
        + `(${PUBLIC_KEY_RELATIVE} is present). A locally written receipt cannot be trusted.`,
    };
  }
  if (attestation.algorithm !== 'ed25519') {
    return { ok: false, required: true, reason: `unsupported attestation algorithm: ${attestation.algorithm}` };
  }
  if (attestation.keyId !== keyId(publicKeyPem)) {
    return {
      ok: false, required: true,
      reason: `attestation keyId ${attestation.keyId} does not match the committed signing key `
        + `${keyId(publicKeyPem)}`,
    };
  }
  let valid = false;
  try {
    valid = crypto.verify(null, attestationPayload(receipt),
      crypto.createPublicKey(publicKeyPem), Buffer.from(attestation.signature, 'base64'));
  } catch (error) {
    return { ok: false, required: true, reason: `attestation signature could not be checked: ${error.message}` };
  }
  if (!valid) {
    return {
      ok: false, required: true,
      reason: 'attestation signature does not match the receipt — it was edited after signing, '
        + 'or it was not signed by CI',
    };
  }
  return { ok: true, reason: null, required: true, keyId: attestation.keyId };
}
