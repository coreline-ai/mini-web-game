#!/usr/bin/env node
// check_ui_direction.mjs — 게임마다 UI 정체성이 실제로 다른지 검사한다 (계약 §2.0.26).
//
// 왜 필요한가: 같은 작성자가 앞 게임의 씬 배치를 그대로 반복하면 아트만 다르고 UI는 같은
// 앱처럼 보인다. 실측(2026-08-16)에서 두 v2 게임의 LayoutRegistry/AudioManager/MobileButton이
// 100% 동일했고 홈 배치 사다리가 0.16/0.15 · 0.225/0.215 · 0.335/0.345로 겹쳤다.
//
// 이 검사는 **미적 판단을 하지 않는다.** "좋은가"는 사람이 캡처를 봐야 하고, 여기서는
// "다른가"만 기계적으로 잰다. 셋을 본다:
//   1. 존재      — v2 custom-loop 게임에 uiDirection 선언이 있는가
//   2. 충돌      — layoutMetaphor + homeComposition + buttonForm 조합이 다른 게임과 같은가
//   3. 배치 중복 — 홈 씬의 height * 0.xx 값이 다른 게임과 ±0.02 이내로 3개 이상 겹치는가
//
// v1 아케이드 게임은 대상이 아니다. 하나의 템플릿에서 생성되므로 닮은 것이 정상이다.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GENERATED = path.join(ROOT, 'dev_game', 'generated');

const LADDER_TOLERANCE = 0.02;   // 이 안에서 같으면 "같은 위치"로 본다
const LADDER_MAX_SHARED = 2;     // 3개 이상 겹치면 실패

function readSpec(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, 'src/game/data/game-spec.json'), 'utf8'));
  } catch { return null; }
}

// uiDirection.js는 런타임 모듈이라 import 없이 값만 뽑는다(빌드 의존을 만들지 않기 위해).
function readDirection(dir) {
  const file = path.join(dir, 'src/game/config/uiDirection.js');
  if (!fs.existsSync(file)) return null;
  const src = fs.readFileSync(file, 'utf8');
  const pick = (key) => {
    const m = new RegExp(`${key}\\s*:\\s*['"\`]([^'"\`]+)['"\`]`).exec(src);
    return m ? m[1] : null;
  };
  return {
    layoutMetaphor: pick('layoutMetaphor'),
    homeComposition: pick('homeComposition'),
    buttonForm: pick('buttonForm'),
    typeScale: pick('typeScale'),
    motionSignature: pick('motionSignature'),
  };
}

// 홈 씬이 쓰는 세로 배치 비율. 같은 사다리를 재사용하면 화면이 같아 보인다.
function readHomeLadder(dir) {
  const file = path.join(dir, 'src/game/scenes/HomeScene.js');
  if (!fs.existsSync(file)) return [];
  const src = fs.readFileSync(file, 'utf8');
  const values = new Set();
  for (const m of src.matchAll(/height\s*\*\s*(0\.\d+)/g)) values.add(Number(m[1]));
  return [...values].sort((a, b) => a - b);
}

function sharedLadderCount(a, b) {
  let shared = 0;
  for (const x of a) if (b.some((y) => Math.abs(x - y) <= LADDER_TOLERANCE)) shared += 1;
  return shared;
}

const errors = [];
const games = [];

for (const name of fs.readdirSync(GENERATED)) {
  const dir = path.join(GENERATED, name);
  if (!fs.statSync(dir).isDirectory()) continue;
  const spec = readSpec(dir);
  // 검사 대상은 손으로 짜는 v2 custom-loop뿐이다.
  if (spec?.schemaVersion !== '2.0.0' || spec?.buildDecision !== 'custom-loop') continue;
  games.push({ name, direction: readDirection(dir), ladder: readHomeLadder(dir) });
}

for (const g of games) {
  if (!g.direction) {
    errors.push(`${g.name}: src/game/config/uiDirection.js 없음 — v2 custom-loop 게임은 UI 아트 디렉션을 선언해야 한다 (계약 §2.0.26)`);
    continue;
  }
  for (const key of ['layoutMetaphor', 'homeComposition', 'buttonForm']) {
    if (!g.direction[key]) errors.push(`${g.name}: uiDirection.${key} 누락`);
  }
}

// 조합 충돌
const declared = games.filter((g) => g.direction?.layoutMetaphor);
for (let i = 0; i < declared.length; i += 1) {
  for (let j = i + 1; j < declared.length; j += 1) {
    const a = declared[i]; const b = declared[j];
    const same = ['layoutMetaphor', 'homeComposition', 'buttonForm']
      .every((k) => a.direction[k] && a.direction[k] === b.direction[k]);
    if (same) {
      errors.push(`${a.name} ↔ ${b.name}: UI 디렉션 조합이 동일 (${a.direction.layoutMetaphor} / ${a.direction.homeComposition} / ${a.direction.buttonForm})`);
    }
  }
}

// 배치 사다리 중복 — 이번 실패의 기계적 서명
for (let i = 0; i < games.length; i += 1) {
  for (let j = i + 1; j < games.length; j += 1) {
    const a = games[i]; const b = games[j];
    if (a.ladder.length < 3 || b.ladder.length < 3) continue;
    const shared = sharedLadderCount(a.ladder, b.ladder);
    if (shared > LADDER_MAX_SHARED) {
      errors.push(
        `${a.name} ↔ ${b.name}: 홈 화면 세로 배치가 ${shared}개 지점에서 겹침(±${LADDER_TOLERANCE}) `
        + `— 앞 게임의 배치를 재사용하지 않는다 (계약 §2.0.26)\n`
        + `    ${a.name}: ${a.ladder.join(', ')}\n`
        + `    ${b.name}: ${b.ladder.join(', ')}`,
      );
    }
  }
}

if (errors.length) {
  console.error('UI direction check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`ui direction: OK (${games.length} custom-loop game(s) checked, all distinct)`);
for (const g of games) {
  console.log(`  ${g.name.padEnd(24)} ${g.direction.layoutMetaphor} / ${g.direction.homeComposition} / ${g.direction.buttonForm}`);
}
