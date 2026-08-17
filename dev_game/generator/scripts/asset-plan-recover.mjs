#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertArgv, isMainModule } from './lib/cli-contract.mjs';

// asset-plan 복원 — 규약 이전 세대 게임에서 targeted 재생성 경로를 되살린다.
//
// ── 왜 필요한가 ──────────────────────────────────────────────────────────────
// `game-factory`·`game-polish`는 나쁜 아트를 만나면 **재생성하라**고 지시하고, 그 명령은
// `factory:imagegen -- --project <p> --skip-existing --id <asset>`이다. 그런데 그 명령은
// `asset-plan.json`을 요구하고, 생성 게임 19개 중 4개는 그 파일이 없다(실측 2026-08-17):
// `last-light-zero-hour`, `iron-courier-last-line`, `firebreak-commander`, `parcel-sort-rush`.
//
// 실제로 두 게임이 그 벽에 막혔다. `last-light-zero-hour`는 fx 하나가 hf 7.08 > 6으로
// 게이트에서 떨어졌고, `iron-courier-last-line`은 core 스프라이트 4장이 최소 변 256px 미달이다.
// 둘 다 게이트가 "재생성 필요"라고 말하는데 재생성할 방법이 없었다. **스킬이 시키는 일을
// 실행할 수 없는 상태**였고, 그것이 이 스크립트가 닫는 구멍이다.
//
// ── 재생성 단위는 자산이 아니라 "생성 묶음"이다 ─────────────────────────────
// Path B에서는 프롬프트 하나가 시트 한 장을 만들고 거기서 여러 자산을 잘라냈다. 그 관계는
// **이미 manifest에 있다** — 같은 `provenance.promptHash`를 공유한다.
// 실측: firebreak-commander는 자산 12개가 해시 2개를 공유하고(스프라이트 6 / fx·ui 6),
// keeper-last-light(Path A)는 11개가 전부 고유하다.
// `generationGroups()`가 그 묶음을 뽑고, `codex-imagegen`이 묶음을 쪼개는 재생성을 막는다.
//
// ── 무엇을 복원할 수 있고 무엇은 못 하는가 ──────────────────────────────────
// manifest는 id·path·role·type·minWidth·minHeight·requiresAlpha를 담는다. 계획에 필요한 것
// 중 **프롬프트만 없다** — manifest에는 `promptHash`만 있고 원문은 없다.
//
//   art-prompts.md 가 있는 게임 (Path B)  → 프롬프트를 여기서 회수한다
//   둘 다 없는 게임                        → 프롬프트는 소실됐다. 사람이 새로 써야 한다
//
// 소실된 경우 빈 프롬프트로 계획을 채우고 **exit 1**로 끝난다. 조용히 통과시키면
// `codex-imagegen`이 크로마키 보일러플레이트만으로 이미지를 만들어 production 자산으로
// 기록한다(그 방어는 imagegen 쪽에도 따로 넣었다). 여기서도 fail-closed로 둔다.

export const CLI_CONTRACT_ID = 'factory:asset-plan-recover';

/** 부팅 경로와 parity harness가 같은 계약을 쓴다. 부작용 없음. */
export function parseCliArgs(argv) {
  assertArgv(CLI_CONTRACT_ID, argv);
  const args = { force: false, allowMissingPrompts: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--project') args.project = argv[++i];
    else if (a === '--force') args.force = true;
    else if (a === '--allow-missing-prompts') args.allowMissingPrompts = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

/**
 * `art-prompts.md`에서 프롬프트를 회수한다. 형식은 `## 제목` + ```text 블록이고,
 * 자산 id가 적혀 있지 않으므로 **블록 뒤의 `Raw built-in output: <path>` 줄**로 자산을 잇는다.
 * 그 줄이 없는 블록은 어느 자산인지 특정할 수 없으므로 버린다 — 잘못 이어 붙이면 엉뚱한
 * 프롬프트로 재생성하게 되고, 그건 원문 소실보다 나쁘다.
 */
export function promptsFromArtPrompts(markdown) {
  const found = new Map();
  const blocks = [...markdown.matchAll(/```text\n([\s\S]*?)```/g)];
  for (const block of blocks) {
    const after = markdown.slice(block.index + block[0].length, block.index + block[0].length + 400);
    const raw = /Raw built-in output:\s*`([^`]+)`/.exec(after);
    if (!raw) continue;
    // `assets/_source/stage-1-dry-front-raw.png` → `stage-1-dry-front`
    const stem = path.basename(raw[1]).replace(/\.[a-z0-9]+$/i, '').replace(/-raw$/, '');
    found.set(stem, block[1].trim());
  }
  return found;
}

/** manifest 항목 하나를 계획 항목으로. 프롬프트는 별도로 채운다. */
function planEntry(entry, prompt) {
  return {
    id: entry.id,
    path: entry.path,
    ...(entry.role ? { role: entry.role } : {}),
    width: entry.minWidth ?? null,
    height: entry.minHeight ?? null,
    prompt,
  };
}

/**
 * 자산 id/경로 stem으로 프롬프트를 찾는다. 확신이 없으면 **비운다.**
 *
 * 1:1로 이어지는 것은 사실상 배경뿐이다. 스프라이트·UI·FX는 프롬프트 하나가 **시트 한 장**을
 * 만들고 거기서 여러 자산을 잘라낸 경우가 많다(실측: `response-objects-sheet` 한 프롬프트가
 * 스프라이트 6개를 만들었다). 그런 프롬프트를 개별 자산에 붙이면 "자산 하나 재생성"이
 * 시트 전체 재생성이 되고, 원문 소실보다 나쁜 결과를 낸다. 그래서 붙이지 않는다.
 */
function lookupPrompt(entry, prompts) {
  const stem = path.basename(entry.path).replace(/\.[a-z0-9]+$/i, '');
  for (const key of [entry.id, stem]) {
    if (prompts.has(key)) return prompts.get(key);
  }
  return '';
}

/**
 * 한 번의 생성에서 나온 자산 묶음. `provenance.promptHash`를 공유하는 항목들이다.
 *
 * Path B에서는 프롬프트 하나가 **시트 한 장**을 만들고 거기서 여러 자산을 잘라냈다. 그 관계는
 * 이미 manifest에 기록돼 있다 — 실측(firebreak-commander): 자산 12개가 해시 2개를 공유한다
 * (스프라이트 6개 / fx·ui 6개). Path A는 자산마다 고유 해시다(keeper-last-light 11/11).
 *
 * 이 묶음이 **재생성 단위**다. 하나만 다시 만들면 나머지는 여전히 옛 해시를 주장하므로
 * "한 번의 생성에서 나왔다"는 관계가 거짓이 된다.
 */
export function generationGroups(manifest) {
  const groups = new Map();
  const all = [...(manifest.stageBackgrounds || []), ...(manifest.images || [])];
  for (const entry of all) {
    const hash = entry?.provenance?.promptHash;
    if (!hash || !entry.id) continue;
    if (!groups.has(hash)) groups.set(hash, []);
    groups.get(hash).push(entry.id);
  }
  // 혼자인 해시는 묶음이 아니다.
  return new Map([...groups].filter(([, ids]) => ids.length > 1));
}

export function recoverPlan(projectDir) {
  const manifestFile = path.join(projectDir, 'assets', 'asset-manifest.json');
  if (!fs.existsSync(manifestFile)) {
    throw new Error(`asset-manifest.json이 없다: ${manifestFile} — 복원할 근거가 없다`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));

  const artPromptsFile = path.join(projectDir, 'art-prompts.md');
  const prompts = fs.existsSync(artPromptsFile)
    ? promptsFromArtPrompts(fs.readFileSync(artPromptsFile, 'utf8'))
    : new Map();

  // 배경은 `images`가 아니라 `stageBackgrounds`에 별도로 산다(실측). 여기를 안 보면
  // backgrounds가 0개로 복원돼, 정작 1:1 회수가 가능한 유일한 종류를 통째로 놓친다.
  const images = manifest.images || [];
  const backgrounds = (manifest.stageBackgrounds || []).filter((bg) => bg && bg.path);

  const plan = {
    gameId: path.basename(path.resolve(projectDir)),
    recoveredFrom: 'assets/asset-manifest.json',
    recoveredAt: new Date().toISOString(),
    backgrounds: [],
    sprites: [],
    ui: [],
    fx: [],
  };

  for (const bg of backgrounds) plan.backgrounds.push(planEntry(bg, lookupPrompt(bg, prompts)));
  for (const entry of images) {
    const bucket = entry.type === 'ui' ? 'ui' : entry.type === 'fx' ? 'fx' : 'sprites';
    plan[bucket].push(planEntry(entry, lookupPrompt(entry, prompts)));
  }

  // 생성 묶음을 계획에 실어 둔다. 재생성 단위가 자산이 아니라 묶음이라는 사실이
  // 계획을 읽는 사람과 도구 모두에게 보이게 한다.
  const groups = generationGroups(manifest);
  if (groups.size) {
    plan.generationGroups = [...groups].map(([promptHash, members]) => ({ promptHash, members }));
    const memberOf = new Map();
    for (const [hash, members] of groups) for (const id of members) memberOf.set(id, hash);
    for (const bucket of ['backgrounds', 'sprites', 'ui', 'fx']) {
      for (const entry of plan[bucket]) {
        const hash = memberOf.get(entry.id);
        if (hash) entry.generationGroup = hash;
      }
    }
  }

  const missing = ['backgrounds', 'sprites', 'ui', 'fx']
    .flatMap((bucket) => plan[bucket].filter((e) => !e.prompt).map((e) => `${bucket}/${e.id}`));
  return { plan, missing, groups, promptSource: prompts.size ? 'art-prompts.md' : null };
}

function usage() {
  console.log(`Usage:
  npm --prefix dev_game run factory:asset-plan-recover -- --project generated/<game-id>

manifest에서 asset-plan.json을 복원한다. asset-plan 규약 이전 세대 게임에서
targeted 재생성(factory:imagegen --id <asset>)을 다시 쓸 수 있게 한다.

  --force                    기존 asset-plan.json을 덮어쓴다
  --allow-missing-prompts    프롬프트가 소실된 항목이 있어도 파일을 쓰고 exit 0

프롬프트는 manifest에 없다(promptHash만 있다). art-prompts.md가 있으면 회수하고,
없으면 빈 값으로 남긴 뒤 exit 1로 끝난다 — 빈 프롬프트로 생성하면 보일러플레이트만으로
만든 이미지가 production 자산이 된다.

1:1로 회수되는 것은 사실상 배경뿐이다. 실측(firebreak-commander): 배경 3개는 프롬프트가
회수됐고, 스프라이트·UI·FX 12개는 프롬프트 하나가 시트 한 장을 만든 것이라 자산별 대응이
없다. 그 프롬프트를 개별 자산에 붙이면 "자산 하나 재생성"이 시트 전체 재생성이 된다.`);
}

if (isMainModule(import.meta.url)) {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) { usage(); process.exit(0); }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const devGame = path.resolve(here, '..', '..');
  const projectDir = [
    path.resolve(process.cwd(), args.project),
    path.resolve(devGame, args.project),
    path.resolve(devGame, '..', args.project),
  ].find((candidate) => { try { return fs.statSync(candidate).isDirectory(); } catch { return false; } });
  if (!projectDir) {
    console.error(`프로젝트 디렉터리를 찾을 수 없다: ${args.project}`);
    process.exit(1);
  }

  const output = path.join(projectDir, 'asset-plan.json');
  if (fs.existsSync(output) && !args.force) {
    console.error(`이미 asset-plan.json이 있다: ${output}\n  덮어쓰려면 --force`);
    process.exit(1);
  }

  const { plan, missing, groups, promptSource } = recoverPlan(projectDir);
  const total = plan.backgrounds.length + plan.sprites.length + plan.ui.length + plan.fx.length;

  fs.writeFileSync(output, `${JSON.stringify(plan, null, 2)}\n`);
  console.log(`asset-plan 복원: ${output}`);
  console.log(`  항목 ${total}개 — backgrounds ${plan.backgrounds.length} / sprites ${plan.sprites.length}`
    + ` / ui ${plan.ui.length} / fx ${plan.fx.length}`);
  console.log(`  프롬프트 출처: ${promptSource || '없음 (manifest는 promptHash만 담는다)'}`);
  if (groups.size) {
    console.log(`  생성 묶음 ${groups.size}개 — 이 자산들은 한 번의 생성에서 나왔고 재생성 단위는 묶음이다:`);
    for (const [hash, members] of groups) console.log(`    ${hash}  ${members.join(', ')}`);
  }

  if (missing.length) {
    console.error(`\n프롬프트가 소실된 항목 ${missing.length}개:`);
    for (const id of missing) console.error(`  - ${id}`);
    console.error('\n이 항목들은 프롬프트를 새로 작성해야 재생성할 수 있다.');
    console.error('빈 프롬프트로 factory:imagegen을 돌리면 보일러플레이트만으로 만든 이미지가');
    console.error('production 자산으로 기록된다 — imagegen이 그것을 거부한다.');
    if (!args.allowMissingPrompts) process.exit(1);
  }
}
