#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const projectArg = argv.includes('--project') ? argv[argv.indexOf('--project') + 1] : null;
const sinceArg = argv.includes('--since') ? Number(argv[argv.indexOf('--since') + 1]) : 0;
if (!projectArg) throw new Error('Required: --project <dir> [--since <epoch-ms>]');
const candidates = [path.resolve(process.cwd(), projectArg), path.resolve(process.cwd(), '..', projectArg), path.resolve(process.cwd(), 'generated', projectArg)];
const projectDir = candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
const files = {
  visual: 'qa-captures/captured-state/latest-report.json', clarity: 'qa-captures/clarity-results.json',
  input: 'qa-captures/input-hostility-results.json', session: 'qa-captures/session-continuity-results.json',
  rules: 'qa-captures/rules-sync-results.json', docs: 'qa-captures/docs-runtime-sync-results.json',
  longRun: 'qa-captures/lifecycle-soak-results.json', assetFidelity: 'qa-captures/image-quality-results.json',
};
const fragments = {};
const errors = [];
for (const [key, relative] of Object.entries(files)) {
  const file = path.join(projectDir, relative);
  if (!fs.existsSync(file)) { if (!['assetFidelity'].includes(key)) errors.push(`${key}: missing ${relative}`); continue; }
  const stat = fs.statSync(file);
  if (sinceArg && stat.mtimeMs + 1000 < sinceArg && !['longRun'].includes(key)) errors.push(`${key}: stale report (${new Date(stat.mtimeMs).toISOString()})`);
  try { fragments[key] = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { errors.push(`${key}: invalid JSON (${error.message})`); }
  if (fragments[key]?.ok === false) errors.push(`${key}: reported failure`);
}
const runId = fragments.visual?.runId || `session-${Date.now()}`;
const report = {
  schemaVersion: '1.0.0', runId, generatedAt: new Date().toISOString(), gameId: fragments.visual?.gameId,
  visual: fragments.visual || null, clarity: fragments.clarity || null, input: fragments.input || null,
  audio: fragments.session?.audio || { maxBgmInstances: fragments.session?.maxBgmInstances },
  persistence: fragments.session?.persistence || fragments.session || null,
  longRun: fragments.longRun || null, assetFidelity: fragments.assetFidelity || null,
  gates: { rules: fragments.rules || null, docs: fragments.docs || null, session: fragments.session || null },
  errors, ok: errors.length === 0,
};
const output = path.join(projectDir, 'qa-captures/qa-session-report.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ok: report.ok, runId, errors, report: output }, null, 2));
if (!report.ok) process.exit(1);
