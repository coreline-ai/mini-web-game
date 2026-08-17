import fs from 'node:fs';
import { MISSION_SCHEDULE } from '../src/game/systems/MissionDirector.js';
import { isMissileLockReady, shouldRecoverFromOverheat, shotsForDuration } from '../src/game/config/combatMath.js';

const spec = JSON.parse(fs.readFileSync(new URL('../src/game/data/game-spec.json', import.meta.url), 'utf8'));
const assert = (value, message) => { if (!value) throw new Error(message); };
let assertionCount = 0;
const verify = (value, message) => { assertionCount += 1; assert(value, message); };

verify(spec.rules.durationSeconds === spec.session.durationSeconds, 'documented mission duration differs from session duration');
verify(spec.weapon.gun.rateMs === 100 && spec.weapon.gun.heatPerShot === 4, '30mm tuning contract drift');
verify(spec.weapon.gun.overheatAt === 100 && spec.weapon.gun.readyAt === 40, 'heat boundary contract drift');
verify(spec.weapon.missile.ammo === 4 && spec.weapon.missile.lockMs === 650, 'missile tuning contract drift');
verify(spec.convoy.maxHp === 1000, 'convoy HP contract drift');
verify(MISSION_SCHEDULE.every((entry, index) => index === 0 || entry.at >= MISSION_SCHEDULE[index - 1].at), 'mission schedule is not monotonic');
verify(MISSION_SCHEDULE.some((entry) => entry.type === 'apc' && entry.at === 42), 'APC beat missing');
verify(MISSION_SCHEDULE.some((entry) => entry.type === 'boss' && entry.at === 65), 'boss beat missing');
verify(Math.max(...MISSION_SCHEDULE.slice(1).map((entry, index) => entry.at - MISSION_SCHEDULE[index].at)) <= 8, 'mission schedule has an empty threat gap');
verify(isMissileLockReady(0, true, 1) === false, '0ms missile lock boundary failed');
verify(isMissileLockReady(649, true, 1) === false, '649ms missile lock boundary failed');
verify(isMissileLockReady(650, true, 1) === true, '650ms missile lock boundary failed');
verify(isMissileLockReady(650, true, 0) === false, 'zero-ammo missile lock boundary failed');
verify(isMissileLockReady(650, true, 4) === true, 'full-ammo missile lock boundary failed');
verify([0, 39, 40].every((heat) => shouldRecoverFromOverheat(heat)), 'low heat recovery boundaries failed');
verify([99, 100].every((heat) => !shouldRecoverFromOverheat(heat)), 'high heat lock boundaries failed');
verify(shotsForDuration(1000, spec.weapon.gun.rateMs) === 10, '30mm rate contract failed');
verify([0, 9999, 999999].map((score) => String(score).padStart(6, '0')).join(',') === '000000,009999,999999', 'score display boundaries failed');
verify([1000, 1, 0].map((hp) => hp <= 0).join(',') === 'false,false,true', 'convoy HP terminal boundaries failed');
verify([0, 2, 3].map((strikes) => strikes >= 3).join(',') === 'false,false,true', 'civilian strike terminal boundaries failed');

const result = { ok: true, assertions: assertionCount, scheduleEntries: MISSION_SCHEDULE.length };
fs.mkdirSync(new URL('../qa-captures/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../qa-captures/logic-results.json', import.meta.url), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(new URL('../qa-captures/rules-sync-results.json', import.meta.url), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
