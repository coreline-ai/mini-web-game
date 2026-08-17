#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicKeyPath, signReceipt } from './lib/receipt-attestation.mjs';
import { isMainModule } from './lib/cli-contract.mjs';

// CI 전용. 게이트가 발급한 영수증에 서명한다.
//
// 비밀키는 **CI 시크릿에만** 존재한다(`RECEIPT_SIGNING_KEY`). 로컬에 없으므로 로컬에서
// 만든 영수증은 서명될 수 없고, 공개키가 커밋된 뒤에는 `invalid`가 된다. 그것이 이 구조의
// 목적이다 — "게이트를 돌렸다"는 주장을 CI만 발급할 수 있게 만든다.
//
// 서명 대상은 게이트가 방금 쓴 영수증이다. 이 스크립트는 영수증을 **만들지 않는다.**
// 없으면 실패한다 — 서명이 게이트를 대신할 수는 없다.

if (isMainModule(import.meta.url)) {
  const argv = process.argv.slice(2);
  const receiptArg = argv[argv.indexOf('--receipt') + 1];
  if (!argv.includes('--receipt') || !receiptArg) {
    console.error('Usage: node sign-pass-receipt.mjs --receipt <path>\n'
      + '  비밀키는 환경변수 RECEIPT_SIGNING_KEY (PKCS8 PEM) 로 받는다.');
    process.exit(1);
  }
  const privatePem = process.env.RECEIPT_SIGNING_KEY;
  if (!privatePem) {
    console.error('RECEIPT_SIGNING_KEY가 없다 — 이 스크립트는 CI에서만 동작한다.');
    process.exit(1);
  }
  const receiptFile = path.resolve(receiptArg);
  if (!fs.existsSync(receiptFile)) {
    console.error(`서명할 영수증이 없다: ${receiptFile}\n  게이트가 통과해야 영수증이 생긴다.`);
    process.exit(1);
  }
  const here = path.dirname(fileURLToPath(import.meta.url));
  const devGame = path.resolve(here, '..', '..');
  const publicPem = fs.readFileSync(publicKeyPath(devGame), 'utf8');

  const receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
  if (receipt.attestation) {
    console.error('이미 서명된 영수증이다 — 다시 서명하지 않는다.');
    process.exit(1);
  }
  const signed = signReceipt(receipt, privatePem, publicPem);
  fs.writeFileSync(receiptFile, `${JSON.stringify(signed, null, 2)}\n`);
  console.log(`서명 완료: ${receiptFile}  (key ${signed.attestation.keyId})`);
}
