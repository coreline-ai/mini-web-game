#!/usr/bin/env node
// make-game.mjs — ONE-COMMAND production-MVP pipeline.
// Runs the whole dev_game flow end to end and produces a high-quality first
// production-demo game:
//   1) scaffold      cli.mjs         Phaser/Vite Foundation
//   2) productionize productionize   planning docs + asset-plan + manifest(provenance)
//   3) ai-art        codex-imagegen  real AI backgrounds/sprites/ui/fx + game wiring
//   4) qa            production-demo-qa (default) or full production-gate (--gate full)
//
// Usage:
//   node generator/scripts/make-game.mjs --spec examples/poop-dodge.spec.json --out ../generated/poop-dodge
//   node generator/scripts/make-game.mjs --name "Meteor Dash" --out ../generated/meteor-dash
//   ... [--stages 3] [--skip-art] [--gate none|demo|full] [--codex <bin>]

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = __dirname;
const CLI = path.resolve(SCRIPTS, '..', 'src', 'cli.mjs');
const GEN_ROOT = path.resolve(SCRIPTS, '..');
const DEFAULT_OUT_ROOT = path.resolve(GEN_ROOT, '..', 'generated');

function parseArgs(argv) {
  const args = { stages: 3, gate: 'demo', passthrough: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--spec') args.spec = argv[++i];
    else if (a === '--name') args.name = argv[++i];
    else if (a === '--title') args.title = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--stages') args.stages = Number(argv[++i]);
    else if (a === '--codex') args.codex = argv[++i];
    else if (a === '--skip-art') args.skipArt = true;
    else if (a === '--gate') args.gate = argv[++i];
    else if (a === '--with-pwa') args.passthrough.push('--with-pwa');
    else if (a === '--no-sfx') args.passthrough.push('--no-sfx');
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.help && !args.spec && !args.name) throw new Error('Provide --spec <file> or --name <name>');
  if (!['none', 'demo', 'full'].includes(args.gate)) throw new Error('--gate must be none|demo|full');
  return args;
}

function usage() {
  console.log(`make-game — one command from idea/spec to a production-demo game.

  node generator/scripts/make-game.mjs --spec <file> --out <dir>
  node generator/scripts/make-game.mjs --name "My Game" --out <dir>

Options:
  --spec <file> | --name <n> [--title <t>]   spec-driven or name-driven
  --out <dir>                                output dir (default ../generated/<id>)
  --stages <n>                               stage backgrounds (default 3)
  --skip-art                                 scaffold + productionize only (no AI generation)
  --gate none|demo|full                      QA after build (default demo = production-demo-qa)
  --codex <bin>                              codex binary for image_gen (auto-detected)
  --with-pwa | --no-sfx                      passthrough to scaffolder`);
}

function run(label, cmd, cmdArgs) {
  process.stdout.write(`\n▶ ${label}\n  $ ${path.basename(cmd)} ${cmdArgs.join(' ')}\n`);
  const r = spawnSync(cmd, cmdArgs, { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\n✗ ${label} failed (exit ${r.status}).`);
    process.exit(r.status || 1);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); process.exit(0); }

  const node = process.execPath;
  // derive the game id (production-demo-qa requires out-dir basename === spec.game.id)
  let id = 'new-game';
  if (args.spec) { try { id = JSON.parse(fs.readFileSync(path.resolve(args.spec), 'utf8'))?.game?.id || id; } catch {} }
  else if (args.name) id = String(args.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || id;

  // resolve output dir
  let out = args.out ? path.resolve(args.out) : path.join(DEFAULT_OUT_ROOT, id);
  if (path.basename(out) !== id) {
    const fixed = path.join(path.dirname(out), id);
    console.log(`⚠ --out 폴더명 "${path.basename(out)}" ≠ game.id "${id}" — production-demo-qa가 일치를 요구하므로 ${fixed} 로 자동 조정합니다.`);
    out = fixed;
  }

  console.log(`make-game → ${out}`);

  // 1) scaffold
  const scaffoldArgs = [CLI, '--out', out, '--force', ...args.passthrough];
  if (args.spec) scaffoldArgs.push('--spec', path.resolve(args.spec));
  else { scaffoldArgs.push('--name', args.name); if (args.title) scaffoldArgs.push('--title', args.title); }
  run('1/4 Scaffold (Phaser/Vite Foundation)', node, scaffoldArgs);

  // 2) productionize (docs + asset-plan + manifest)
  run('2/4 Productionize (docs + asset-plan + manifest)', node, [path.join(SCRIPTS, 'productionize.mjs'), '--project', out, '--stages', String(args.stages)]);

  // 3) AI art (backgrounds + sprites + ui + fx) + game wiring
  if (args.skipArt) {
    console.log('\n▶ 3/4 AI art — skipped (--skip-art). Run factory:imagegen later.');
  } else {
    const igArgs = [path.join(SCRIPTS, 'codex-imagegen.mjs'), '--project', out, '--only', 'all'];
    if (args.codex) igArgs.push('--codex', args.codex);
    run('3/4 AI art (codex image_gen: backgrounds/sprites/ui/fx)', node, igArgs);
  }

  // 4) QA
  if (args.gate === 'none' || args.skipArt) {
    console.log('\n▶ 4/4 QA — skipped.');
  } else if (args.gate === 'full') {
    run('4/4 QA (full production-gate)', node, [path.join(SCRIPTS, 'production-gate.mjs'), '--project', out]);
  } else {
    run('4/4 QA (production-demo-qa)', node, [path.join(SCRIPTS, 'production-demo-qa.mjs'), '--project', out]);
  }

  console.log(`\n✔ Done. Production-demo game at: ${out}`);
  console.log(`  Run it:  cd ${out} && npm install && npm run dev`);
  if (args.gate !== 'full') console.log('  Full gate:  npm --prefix dev_game run factory:production-gate -- --project ' + out);
}

try { main(); } catch (err) { console.error(err.message || err); usage(); process.exit(1); }
