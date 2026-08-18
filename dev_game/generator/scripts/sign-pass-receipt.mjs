#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicKeyPath, signReceipt } from './lib/receipt-attestation.mjs';
import { assertArgv, isMainModule } from './lib/cli-contract.mjs';

// CI 전용. 게이트가 발급한 영수증에 서명한다.
//
// 비밀키는 **CI 시크릿에만** 존재한다(`RECEIPT_SIGNING_KEY`). 로컬에 없으므로 로컬에서
// 만든 영수증은 서명될 수 없고, 공개키가 커밋된 뒤에는 `invalid`가 된다. 그것이 이 구조의
// 목적이다 — "게이트를 돌렸다"는 주장을 CI만 발급할 수 있게 만든다.
//
// 서명 대상은 게이트가 방금 쓴 영수증이다. 이 스크립트는 영수증을 **만들지 않는다.**
// 없으면 실패한다 — 서명이 게이트를 대신할 수는 없다.

export const CLI_CONTRACT_ID = 'factory:sign-pass-receipt';

/** 부팅 경로와 parity harness가 같은 계약을 쓴다. 부작용 없음. */
export function parseCliArgs(argv) {
  assertArgv(CLI_CONTRACT_ID, argv);
  return { receipt: argv[argv.indexOf('--receipt') + 1], help: argv.includes('--help') || argv.includes('-h') };
}

function usage() {
  console.log(`Usage: node sign-pass-receipt.mjs --receipt <path>

CI 전용. 게이트가 발급한 영수증에 서명한다.
비밀키는 환경변수 RECEIPT_SIGNING_KEY (PKCS8 PEM) 로 받으며 로컬에는 존재하지 않는다.`);
}

if (isMainModule(import.meta.url)) {
  let args;
  try { args = parseCliArgs(process.argv.slice(2)); }
  catch (error) { console.error(error.message); usage(); process.exit(1); }
  if (args.help) { usage(); process.exit(0); }
  const receiptArg = args.receipt;
  const privatePem = process.env.RECEIPT_SIGNING_KEY;
  if (!privatePem) {
    console.error('RECEIPT_SIGNING_KEY가 없다 — 이 스크립트는 CI에서만 동작한다.');
    process.exit(1);
  }
  // `npm --prefix dev_game run ...` 은 cwd 가 dev_game 이다. 저장소 루트 기준 경로를 그대로
  // 넘기면 `dev_game/dev_game/...` 이 된다 — 실측으로 커밋된 CI 워크플로가 이 경로로 실패했다.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const receiptFile = [
    path.resolve(process.cwd(), receiptArg),
    path.resolve(process.cwd(), '..', receiptArg),
    path.resolve(here, '..', '..', receiptArg),
    path.resolve(here, '..', '..', '..', receiptArg),
  ].find((candidate) => fs.existsSync(candidate));
  if (!receiptFile) {
    console.error(`서명할 영수증이 없다: ${receiptArg}\n  게이트가 통과해야 영수증이 생긴다.`);
    process.exit(1);
  }

  // 공개키는 **영수증이 속한** dev_game 에서 읽는다. 스크립트 위치를 기준으로 삼으면
  // 다른 트리의 영수증에 이 저장소의 키로 서명하게 되고, 시험조차 실제 저장소를 건드린다.
  let devGame = path.dirname(receiptFile);
  while (path.basename(devGame) !== 'dev_game' && path.dirname(devGame) !== devGame) {
    devGame = path.dirname(devGame);
  }
  const keyFile = publicKeyPath(devGame);
  if (!fs.existsSync(keyFile)) {
    console.error(`공개키가 없다: ${keyFile}\n  서명 스위치가 켜져 있지 않다.`);
    process.exit(1);
  }
  const publicPem = fs.readFileSync(keyFile, 'utf8');

  const receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
  if (receipt.attestation) {
    console.error('이미 서명된 영수증이다 — 다시 서명하지 않는다.');
    process.exit(1);
  }
  const signed = signReceipt(receipt, privatePem, publicPem);
  fs.writeFileSync(receiptFile, `${JSON.stringify(signed, null, 2)}\n`);
  console.log(`서명 완료: ${receiptFile}  (key ${signed.attestation.keyId})`);
}
