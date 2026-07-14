#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--project') args.project = argv[++i];
    else if (argv[i] === '--url') args.url = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!args.help && (!args.project || !args.url)) throw new Error('Required: --project <dir> --url <url>');
  return args;
}

function resolveProject(input) {
  const candidates = [path.resolve(process.cwd(), input), path.resolve(process.cwd(), '..', input), path.resolve(process.cwd(), 'generated', input)];
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log('first-play-clarity-qa --project <dir> --url <url>');
  process.exit(0);
}
const projectDir = resolveProject(args.project);
const script = path.join(projectDir, 'qa', 'clarity-qa.mjs');
const reportFile = path.join(projectDir, 'qa-captures', 'clarity-results.json');
if (!fs.existsSync(script)) throw new Error(`clarity adapter missing: ${script}`);
const result = spawnSync(process.execPath, [script], { cwd: projectDir, stdio: 'inherit', env: { ...process.env, FIREBREAK_QA_URL: args.url, GAME_QA_URL: args.url } });
if (result.status !== 0) process.exit(result.status || 1);
if (!fs.existsSync(reportFile)) throw new Error(`clarity adapter did not write ${reportFile}`);
const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
const required = ['goalVisibleBeforePlay', 'firstRunCoachVisible', 'coachStatesWinCondition', 'simulationPausedWhileReading', 'persistentHelpReopensCoach'];
const missing = required.filter((key) => report.assertions?.[key] !== true);
if (report.ok !== true || missing.length || report.browserErrors?.length) {
  console.error(`First-play clarity QA failed: ${missing.join(', ') || 'adapter report not ok'}`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, assertions: Object.keys(report.assertions || {}).length, report: reportFile }, null, 2));
