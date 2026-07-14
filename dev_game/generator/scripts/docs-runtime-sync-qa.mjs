#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const projectArg = argv.includes('--project') ? argv[argv.indexOf('--project') + 1] : null;
if (!projectArg) throw new Error('Required: --project <dir>');
const candidates = [path.resolve(process.cwd(), projectArg), path.resolve(process.cwd(), '..', projectArg), path.resolve(process.cwd(), 'generated', projectArg)];
const projectDir = candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
const spec = JSON.parse(fs.readFileSync(path.join(projectDir, 'src/game/data/game-spec.json'), 'utf8'));
const gddFile = path.join(projectDir, 'docs/01-GDD.md');
const gdd = fs.readFileSync(gddFile, 'utf8');
const match = gdd.match(/<!-- RULES-CONTRACT:START -->\s*```json\s*([\s\S]*?)```\s*<!-- RULES-CONTRACT:END -->/);
if (!match) throw new Error('GDD is missing the structured RULES-CONTRACT block');
const documented = JSON.parse(match[1]);
const expected = {
  durationSeconds: spec.rules.durationSeconds,
  goal: spec.rules.goal,
  progressMetric: spec.rules.progressMetric,
  requiredObjectives: spec.rules.requiredObjectives || [],
  failConditions: spec.rules.failConditions,
  commands: spec.rules.commands,
};
const errors = [];
for (const key of Object.keys(expected)) {
  if (JSON.stringify(documented[key]) !== JSON.stringify(expected[key])) errors.push(`${key} differs from game-spec v2`);
}
if (errors.length) {
  console.error('Docs/runtime sync QA failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
const report = { ok: true, gameId: spec.game.id, checked: Object.keys(expected), gdd: path.relative(projectDir, gddFile) };
const output = path.join(projectDir, 'qa-captures/docs-runtime-sync-results.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report, report: output }, null, 2));
