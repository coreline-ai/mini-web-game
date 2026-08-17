import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PASS_RECEIPT_RELATIVE = 'qa-captures/production-demo-pass.json';

function listFiles(root, relative = '') {
  const dir = path.join(root, relative);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.posix.join(relative.split(path.sep).join('/'), entry.name);
    if (entry.isDirectory()) out.push(...listFiles(root, rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out.sort();
}

function fileSha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function projectFingerprint(projectDir) {
  const entries = ['package.json', 'assets/asset-manifest.json'];
  entries.push(...listFiles(projectDir, 'src'));
  const hash = crypto.createHash('sha256');
  for (const rel of [...new Set(entries)].sort()) {
    const file = path.join(projectDir, rel);
    hash.update(rel).update('\0');
    hash.update(fs.existsSync(file) ? fileSha256(file) : 'MISSING').update('\n');
  }
  return hash.digest('hex');
}

export function passReceiptPath(projectDir) {
  return path.join(projectDir, PASS_RECEIPT_RELATIVE);
}

export function writePassReceipt(projectDir, { gateProfile, spec = {} } = {}) {
  const output = passReceiptPath(projectDir);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  let qaSession = null;
  const qaSessionPath = path.join(projectDir, 'qa-captures', 'qa-session-report.json');
  try { qaSession = JSON.parse(fs.readFileSync(qaSessionPath, 'utf8')); } catch {}
  const receipt = {
    schemaVersion: 1,
    status: 'PASS',
    gateProfile,
    gameSpecVersion: spec.schemaVersion || null,
    buildDecision: spec.buildDecision || null,
    projectFingerprint: projectFingerprint(projectDir),
    qaRunId: qaSession?.runId || null,
    generatedAt: new Date().toISOString(),
  };
  const temp = `${output}.tmp-${process.pid}`;
  fs.writeFileSync(temp, `${JSON.stringify(receipt, null, 2)}\n`);
  fs.renameSync(temp, output);
  return { output, receipt };
}

export function verifyPassReceipt(projectDir) {
  const file = passReceiptPath(projectDir);
  if (!fs.existsSync(file)) return { ok: false, reason: 'missing production-demo PASS receipt', file };
  let receipt;
  try { receipt = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { return { ok: false, reason: `invalid PASS receipt JSON: ${error.message}`, file }; }
  if (receipt.schemaVersion !== 1 || receipt.status !== 'PASS' || !receipt.gateProfile
    || !receipt.projectFingerprint || !receipt.generatedAt) {
    return { ok: false, reason: 'incomplete production-demo PASS receipt', file, receipt };
  }
  const current = projectFingerprint(projectDir);
  if (receipt.projectFingerprint !== current) {
    return { ok: false, reason: 'stale production-demo PASS receipt: project inputs changed', file, receipt, current };
  }
  return { ok: true, reason: 'production-demo PASS receipt is current', file, receipt, current };
}

function resolveProject(projectArg) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const devGame = path.resolve(here, '..', '..', '..');
  const candidates = [
    path.resolve(process.cwd(), projectArg),
    path.resolve(devGame, projectArg),
    path.resolve(devGame, '..', projectArg),
  ];
  return candidates.find((candidate) => {
    try { return fs.statSync(candidate).isDirectory(); } catch { return false; }
  }) || candidates[0];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage: node production-pass-receipt.mjs --project <generated-game-dir>');
    process.exit(0);
  }
  const index = argv.indexOf('--project');
  if (index < 0 || !argv[index + 1]) {
    console.error('Missing required --project <generated-game-dir>');
    process.exit(1);
  }
  const projectDir = resolveProject(argv[index + 1]);
  const result = verifyPassReceipt(projectDir);
  const printable = { ...result, receipt: result.receipt || null };
  console.log(JSON.stringify(printable, null, 2));
  process.exit(result.ok ? 0 : 1);
}
