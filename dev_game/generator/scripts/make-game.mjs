#!/usr/bin/env node
// make-game.mjs — ONE-COMMAND production-MVP pipeline.
// Runs the whole dev_game flow end to end and produces a high-quality first
// production-demo game:
//   0) preflight     host-preflight  can this host make art at all? (skipped with --skip-art)
//   1) scaffold      cli.mjs         Phaser/Vite Foundation
//   2) productionize productionize   planning docs + asset-plan + manifest(provenance)
//   3) ai-art        codex-imagegen  real AI backgrounds/sprites/ui/fx + game wiring
//   4) qa            full production-gate (default) — build + browser + layout + composite +
//                    strict provenance. --gate artifact-contract-only checks the asset
//                    contract alone and is NOT a completion gate.
//
// Usage:
//   node generator/scripts/make-game.mjs --spec examples/poop-dodge.spec.json --out ../generated/poop-dodge
//   node generator/scripts/make-game.mjs --name "Meteor Dash" --out ../generated/meteor-dash
//   ... [--stages 3] [--skip-art] [--gate none|artifact-contract-only|full] [--codex <bin>]

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifyPassReceipt } from './lib/production-pass-receipt.mjs';
import { assertArgv, isMainModule } from './lib/cli-contract.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = __dirname;
const CLI = path.resolve(SCRIPTS, '..', 'src', 'cli.mjs');
const GEN_ROOT = path.resolve(SCRIPTS, '..');
const DEFAULT_OUT_ROOT = path.resolve(GEN_ROOT, '..', 'generated');

export const CLI_CONTRACT_ID = 'factory:make';

/**
 * 부팅 경로와 parity harness가 **같은** 함수를 쓴다. 공용 계약을 자기 파싱보다 먼저 부르므로
 * 문서 검사기와 이 leaf의 accept/reject가 정의상 일치한다. 부작용은 없다.
 */
export function parseCliArgs(argv) {
  assertArgv(CLI_CONTRACT_ID, argv);
  return parseArgs(argv);
}

function parseArgs(argv) {
  const args = { stages: 3, gate: 'full', passthrough: [] };
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
    else if (a === '--from') args.from = argv[++i];
    else if (a === '--gate') args.gate = argv[++i];
    else if (a === '--with-pwa') args.passthrough.push('--with-pwa');
    else if (a === '--no-sfx') args.passthrough.push('--no-sfx');
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.help && !args.spec && !args.name) throw new Error('Provide --spec <file> or --name <name>');
  // 'demo'는 오해를 부르는 이름이었다 — 아티팩트 계약만 보고 빌드·브라우저·레이아웃을 전혀
  // 보지 않는데 결과를 "Production-demo"라고 불렀다. 이름과 판정을 함께 바꾼다.
  if (args.gate === 'demo') args.gate = 'artifact-contract-only';
  if (!['none', 'artifact-contract-only', 'full'].includes(args.gate)) {
    throw new Error('--gate must be none|artifact-contract-only|full (구 이름 demo는 artifact-contract-only로 매핑된다)');
  }
  if (args.from && !['scaffold', 'productionize', 'art', 'qa'].includes(args.from)) throw new Error('--from must be scaffold|productionize|art|qa');
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
  --from scaffold|productionize|art|qa       resume from a stage (earlier outputs must exist)
                                             --from art passes --skip-existing to imagegen
                                             (resume keeps valid art; invalid art is redrawn)
  --gate none|artifact-contract-only|full    QA after build (default full — the only gate that
                                             makes a completion claim). artifact-contract-only
                                             checks manifest/provenance/asset specs only and
                                             leaves PRODUCTION-DEMO-NOT-VERIFIED.json behind.
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

// full gate를 통과한 빌드에서 미검증 표식을 지운다. 지우는 코드가 없어서, 나중에 게이트를
// 통과시켜도 "검증된 적 없음" 표식이 영원히 남아 있었다.
function clearIncompleteMarker(projectDir) {
  const pass = verifyPassReceipt(projectDir);
  if (!pass.ok) throw new Error(`full gate returned without a valid PASS receipt: ${pass.reason}`);
  const file = path.join(projectDir, 'PRODUCTION-DEMO-NOT-VERIFIED.json');
  if (!fs.existsSync(file)) return pass;
  try {
    fs.unlinkSync(file);
    console.log('  ▸ removed PRODUCTION-DEMO-NOT-VERIFIED.json — full gate receipt verified.');
  } catch (error) { throw new Error(`could not remove incomplete marker: ${error.message}`); }
  return pass;
}

// 게이트를 돌리지 않고 끝난 빌드에 남기는 표식. production-demo 미통과 상태를 산문이
// 아니라 파일로 남겨, 나중에 "완료로 보고됐지만 검증된 적 없는 빌드"를 식별할 수 있게 한다.
function writeIncompleteMarker(projectDir, reason) {
  const file = path.join(projectDir, 'PRODUCTION-DEMO-NOT-VERIFIED.json');
  const payload = {
    status: 'production-demo-미통과',
    reason,
    note: {
      'skip-art': 'Built with --skip-art: no image assets were generated and no gate was run. This build must not be reported as complete.',
      'gate-none': 'Built with --gate none: no completion gate was run. This build must not be reported as complete.',
      'artifact-contract-only': 'Built with --gate artifact-contract-only: only the manifest/provenance/asset contract was checked. No build, no browser, no layout, no scene composite. A syntax-broken source passes this path. This build must not be reported as complete.',
    }[reason] || 'No completion gate was run. This build must not be reported as complete.',
    clearedBy: 'npm --prefix dev_game run factory:production-gate -- --project <dir>',
    writtenAt: new Date().toISOString(),
  };
  try {
    fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n');
    console.log(`  ▸ wrote ${path.basename(file)} — this build is NOT a production demo until the gate passes.`);
  } catch {}
}

// 재개 실행에서 productionize가 덮어쓸 기획문서를 미리 알린다.
function warnDocOverwrite(projectDir) {
  const docsDir = path.join(projectDir, 'docs');
  let existing = [];
  try {
    existing = fs.readdirSync(docsDir).filter((f) => /^0[1-5]-.*\.md$/.test(f));
  } catch { return; }
  if (!existing.length) return;
  console.log(`  ⚠ productionize will rewrite ${existing.length} planning doc(s): ${existing.join(', ')}`);
  console.log('    Hand edits in these files will be lost. Use --from art to resume past this stage.');
}

function main() {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) { usage(); process.exit(0); }

  const node = process.execPath;
  // derive the game id (production-demo-qa requires out-dir basename === spec.game.id)
  let id = 'new-game';
  let sourceSpec = null;
  if (args.spec) { try { sourceSpec = JSON.parse(fs.readFileSync(path.resolve(args.spec), 'utf8')); id = sourceSpec?.game?.id || id; } catch {} }
  else if (args.name) id = String(args.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || id;

  // resolve output dir
  let out = args.out ? path.resolve(args.out) : path.join(DEFAULT_OUT_ROOT, id);
  if (path.basename(out) !== id) {
    const fixed = path.join(path.dirname(out), id);
    console.log(`⚠ --out 폴더명 "${path.basename(out)}" ≠ game.id "${id}" — production-demo-qa가 일치를 요구하므로 ${fixed} 로 자동 조정합니다.`);
    out = fixed;
  }

  console.log(`make-game → ${out}`);

  // --from 재개: 자동 재시도가 있어도 최종 실패는 남는다. 그때 처음부터 다시가 아니라
  // 실패 지점부터 잇는다. 이전 단계 산출물이 없으면 명확히 거부한다.
  const STAGES = ['scaffold', 'productionize', 'art', 'qa'];
  const fromIdx = STAGES.indexOf(args.from || 'scaffold');
  const stageOn = (name) => STAGES.indexOf(name) >= fromIdx;
  if (fromIdx >= 1 && !fs.existsSync(path.join(out, 'src/game'))) {
    throw new Error(`--from ${args.from}: no scaffold at ${out} — run from scaffold first`);
  }
  if (fromIdx >= 2 && !fs.existsSync(path.join(out, 'asset-plan.json'))) {
    throw new Error(`--from ${args.from}: no asset-plan.json at ${out} — run from productionize first`);
  }

  // 1) scaffold
  if (stageOn('scaffold')) {
    const scaffoldArgs = [CLI, '--out', out, '--force', ...args.passthrough];
    if (args.spec) scaffoldArgs.push('--spec', path.resolve(args.spec));
    else { scaffoldArgs.push('--name', args.name); if (args.title) scaffoldArgs.push('--title', args.title); }
    run('1/4 Scaffold (Phaser/Vite Foundation)', node, scaffoldArgs);
  } else {
    console.log(`▶ 1/4 Scaffold — skipped (--from ${args.from})`);
  }

  if (sourceSpec?.schemaVersion === '2.0.0' && sourceSpec?.buildDecision === 'custom-loop') {
    console.log('\n✔ Custom-loop shell generated safely.');
    console.log('  Generic productionize/imagegen is intentionally not run because it would invent arcade player/hazard/coin semantics.');
    console.log('  Implement the genre-defining loop and project QA adapters, then run factory:production-gate -- --mode custom-loop-full.');
    return;
  }

  // 2) productionize (docs + asset-plan + manifest)
  if (stageOn('productionize')) {
    // productionize는 기획문서 01~05를 다시 쓴다. 재개(--from) 실행에서 사람이 손본 문서가
    // 조용히 사라지는 사고를 막기 위해, 덮어쓰기 전에 무엇이 사라지는지 알린다.
    if (args.from && args.from !== 'scaffold') warnDocOverwrite(out);
    run('2/4 Productionize (docs + asset-plan + manifest)', node, [path.join(SCRIPTS, 'productionize.mjs'), '--project', out, '--stages', String(args.stages)]);
  } else {
    console.log(`▶ 2/4 Productionize — skipped (--from ${args.from})`);
  }

  // host preflight — 아트 단계 직전에만 실행한다. custom-loop 셸은 이미지 생성을 하지
  // 않으므로, 분기보다 앞서 검사하면 Codex 없는 호스트에서 만들 수도 없는 것이 막힌다. — the art step needs a working codex host, and finding that out in
  // stage 3 means a scaffold and a productionize pass are already on disk. Skipped for
  // --skip-art, which does not need an art host at all.
  // QA만 다시 돌리는 재개(--from qa)는 이미지 생성을 하지 않는다. 그런데도 preflight를
  // 돌리면 Codex 없는 호스트에서 QA 재실행 자체가 막힌다 — 검사에 필요 없는 의존이다.
  if (!args.skipArt && args.from !== 'qa') {
    const pfArgs = [path.join(SCRIPTS, 'host-preflight.mjs')];
    if (args.codex) pfArgs.push('--codex', args.codex);
    const pf = spawnSync(node, pfArgs, { stdio: 'inherit' });
    if (pf.status !== 0) {
      console.error('\n✗ 0/4 Host preflight failed — this host cannot generate image assets.');
      console.error('  Fix the blockers above, or rerun with --skip-art to build structure only.');
      console.error('  A --skip-art build does NOT satisfy the production-demo contract; report it');
      console.error('  as production-demo 미통과 rather than shipping placeholder art.');
      process.exit(1);
    }
  }

  // 3) AI art (backgrounds + sprites + ui + fx) + game wiring
  if (args.skipArt || !stageOn('art')) {
    console.log(args.skipArt ? '\n▶ 3/4 AI art — skipped (--skip-art). Run factory:imagegen later.' : `\n▶ 3/4 AI art — skipped (--from ${args.from})`);
  } else {
    const igArgs = [path.join(SCRIPTS, 'codex-imagegen.mjs'), '--project', out, '--only', 'all'];
    // `--from art` means RESUME, so it must not redraw art that is already on disk and valid.
    // imagegen's --skip-existing revalidates each existing file at generation-strength
    // thresholds, so this skips only assets that would pass anyway and still regenerates
    // missing/undersized/alpha-less ones. Without it, resuming a run that died in QA burned
    // the whole art set again (~40s per asset).
    if (args.from === 'art') igArgs.push('--skip-existing');
    if (args.codex) igArgs.push('--codex', args.codex);
    run('3/4 AI art (codex image_gen: backgrounds/sprites/ui/fx)', node, igArgs);
  }

  // 4) QA
  if (args.gate === 'none' || args.skipArt) {
    console.log('\n▶ 4/4 QA — skipped.');
    // 게이트를 건너뛴 빌드는 "판정 없음"이지 "통과"가 아니다. 사람이 산문 규칙을 지키는지에
    // 기대는 대신, 산출물 자체에 미통과 상태를 남겨 나중에 기계가 읽을 수 있게 한다.
    writeIncompleteMarker(out, args.skipArt ? 'skip-art' : 'gate-none');
  } else if (args.gate === 'full') {
    // strict provenance는 항상 켠다. 옵트인이면 없는 것과 같다 — 실측으로 영수증을 1바이트
    // 변조한 산출물이 이 플래그 없이는 그대로 통과했다.
    run('4/4 QA (full production-gate)', node,
      [path.join(SCRIPTS, 'production-gate.mjs'), '--project', out, '--require-gpt-imagegen']);
    clearIncompleteMarker(out);
  } else {
    run('4/4 QA (artifact contract only — NOT a completion gate)', node,
      [path.join(SCRIPTS, 'production-demo-qa.mjs'), '--project', out, '--require-gpt-imagegen']);
    // 이 경로는 manifest/provenance/자산 규격만 본다. 빌드도, 브라우저도, 레이아웃도,
    // 씬 합성도 보지 않는다. 실측: 문법이 깨져 vite build가 실패하는 소스가 이 경로를
    // 그대로 통과했다. 따라서 통과해도 "완료"가 아니다.
    writeIncompleteMarker(out, 'artifact-contract-only');
  }

  // **완료는 full gate만 만든다.** 이전에는 `gate !== 'none' && !skipArt`였고, 그래서 기본
  // 경로(계약만 검사)가 자동으로 "Production-demo game"을 출력했다. 사람이 실수로 잘못
  // 말한 것이 아니라 도구가 잘못 말한 것이다.
  const verified = args.gate === 'full' && !args.skipArt;
  console.log(verified
    ? `\n✔ Done. Production-demo game at: ${out}`
    : `\n▲ Done, but NOT a production demo — no completion gate ran. Scaffold at: ${out}`);
  console.log(`  Run it:  cd ${out} && npm install && npm run dev`);
  if (args.gate !== 'full') console.log('  Full gate:  npm --prefix dev_game run factory:production-gate -- --project ' + out);
}

const isMain = isMainModule(import.meta.url);
if (isMain) {
  try { main(); } catch (err) { console.error(err.message || err); usage(); process.exit(1); }
}
