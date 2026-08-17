#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { productionGateProfile } from './lib/production-gate-profile.mjs';
import { passReceiptPath, verifyPassReceipt, writePassReceipt } from './lib/production-pass-receipt.mjs';

const failures = [];
function check(condition, message) { if (!condition) failures.push(message); }

check(productionGateProfile({ schemaVersion: '1.0.0' }) === 'compatibility', 'v1 auto profile');
for (const buildDecision of ['custom-loop', 'hybrid', 'archetype-start']) {
  check(productionGateProfile({ schemaVersion: '2.0.0', buildDecision }) === 'custom-loop-full',
    `v2 ${buildDecision} must use custom-loop-full`);
}
try {
  productionGateProfile({ schemaVersion: '2.0.0', buildDecision: 'hybrid' }, 'compatibility');
  failures.push('v2 compatibility must throw');
} catch (error) {
  check(/cannot use compatibility/.test(error.message), 'v2 compatibility failure reason');
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'production-pass-receipt-'));
try {
  fs.mkdirSync(path.join(temp, 'src'), { recursive: true });
  fs.mkdirSync(path.join(temp, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(temp, 'package.json'), '{"name":"fixture"}\n');
  fs.writeFileSync(path.join(temp, 'assets', 'asset-manifest.json'), '{"assets":[]}\n');
  fs.writeFileSync(path.join(temp, 'src', 'main.js'), 'export const version = 1;\n');
  const spec = { schemaVersion: '2.0.0', buildDecision: 'hybrid' };
  const written = writePassReceipt(temp, { gateProfile: 'custom-loop-full', spec });
  check(fs.existsSync(written.output), 'receipt must be written');
  check(verifyPassReceipt(temp).ok, 'current receipt must pass');

  fs.writeFileSync(path.join(temp, 'src', 'main.js'), 'export const version = 2;\n');
  const stale = verifyPassReceipt(temp);
  check(!stale.ok && /stale/.test(stale.reason), 'changed source must make receipt stale');

  fs.rmSync(passReceiptPath(temp));
  const missing = verifyPassReceipt(temp);
  check(!missing.ok && /missing/.test(missing.reason), 'missing receipt must fail');

  fs.mkdirSync(path.dirname(passReceiptPath(temp)), { recursive: true });
  fs.writeFileSync(passReceiptPath(temp), '{broken');
  const broken = verifyPassReceipt(temp);
  check(!broken.ok && /invalid/.test(broken.reason), 'invalid receipt JSON must fail');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

const scriptsDir = path.dirname(new URL(import.meta.url).pathname);
const gateSource = fs.readFileSync(path.join(scriptsDir, 'production-gate.mjs'), 'utf8');
const makeSource = fs.readFileSync(path.join(scriptsDir, 'make-game.mjs'), 'utf8');
check(gateSource.lastIndexOf('writePassReceipt(') > gateSource.lastIndexOf('customLoopFullQa'),
  'production gate must write the receipt after the custom-loop gate');
check(makeSource.indexOf('verifyPassReceipt(projectDir)') < makeSource.indexOf('fs.unlinkSync(file)'),
  'make-game must verify the receipt before removing the incomplete marker');

if (failures.length) {
  console.error('production PASS receipt QA failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('production PASS receipt QA OK: v1/v2 profiles + current/stale/missing/invalid receipt');
