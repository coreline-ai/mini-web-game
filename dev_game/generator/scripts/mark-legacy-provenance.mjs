#!/usr/bin/env node
// mark-legacy-provenance.mjs — stamp pre-receipt provenance as explicitly legacy.
//
// Generation receipts (outputSha256/runId/generatedAt) did not exist when the tracked games
// were built, so their origin cannot be proven retroactively. Leaving that gap silent would
// either fail every legacy game at the gate or force the gate to accept receiptless
// provenance forever — which is the forgery hole the receipts closed. The marker states the
// unprovable status out loud: gates accept it for these assets only, and any regenerated
// asset gets a real receipt and drops the marker.
//
// Usage: node generator/scripts/mark-legacy-provenance.mjs [--project <dir>]   (default: all generated/*)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const generatedRoot = path.resolve(__dirname, '..', '..', 'generated');

function stamp(projectDir) {
  const mf = path.join(projectDir, 'assets/asset-manifest.json');
  if (!fs.existsSync(mf)) return null;
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(mf, 'utf8')); } catch { return null; }
  let stamped = 0;
  for (const entry of [...(manifest.stageBackgrounds || []), ...(manifest.images || [])]) {
    const p = entry?.provenance;
    if (!p || typeof p !== 'object') continue;
    if (!p.method) continue;               // 출처 주장 자체가 없는 엔트리는 대상 아님
    if (p.outputSha256) continue;          // 영수증이 있으면 레거시가 아니다 — 절대 오염 금지
    if (p.provenanceVersion === 'legacy-1') continue;
    p.provenanceVersion = 'legacy-1';
    stamped += 1;
  }
  if (stamped) fs.writeFileSync(mf, JSON.stringify(manifest, null, 2) + '\n');
  return stamped;
}

const argIdx = process.argv.indexOf('--project');
const targets = argIdx > -1
  ? [path.resolve(process.argv[argIdx + 1])]
  : fs.readdirSync(generatedRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => path.join(generatedRoot, d.name));

let total = 0;
for (const dir of targets) {
  const n = stamp(dir);
  if (n === null) continue;
  if (n > 0) console.log(`  ${path.basename(dir)}: ${n} entr${n === 1 ? 'y' : 'ies'} stamped legacy-1`);
  total += n;
}
console.log(`legacy-1 stamped: ${total} total`);
