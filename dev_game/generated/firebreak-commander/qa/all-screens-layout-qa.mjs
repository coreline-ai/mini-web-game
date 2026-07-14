import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runner = path.resolve(projectDir, '..', '..', 'generator', 'scripts', 'captured-state-qa.mjs');
const url = process.env.FIREBREAK_QA_URL || process.env.GAME_QA_URL || 'http://127.0.0.1:5188';
const result = spawnSync(process.execPath, [runner, '--project', projectDir, '--url', url], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
