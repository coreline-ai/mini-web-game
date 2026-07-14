#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const projectArg = args[args.indexOf('--project') + 1];
const url = args[args.indexOf('--url') + 1];
if (!projectArg || !url) throw new Error('Required: --project <dir> --url <url>');
const candidates = [path.resolve(process.cwd(), projectArg), path.resolve(process.cwd(), '..', projectArg), path.resolve(process.cwd(), 'generated', projectArg)];
const projectDir = candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
const script = path.join(projectDir, 'qa/session-continuity-qa.mjs');
const reportFile = path.join(projectDir, 'qa-captures/session-continuity-results.json');
if (!fs.existsSync(script)) throw new Error(`session continuity adapter missing: ${script}`);
const result = spawnSync(process.execPath, [script], { cwd: projectDir, stdio: 'inherit', env: { ...process.env, FIREBREAK_QA_URL: url, GAME_QA_URL: url } });
if (result.status !== 0) process.exit(result.status || 1);
const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
if (report.ok !== true || report.browserErrors?.length || report.maxBgmInstances > 1) process.exit(1);
console.log(JSON.stringify({ ok: true, assertions: report.assertions, report: reportFile }, null, 2));
