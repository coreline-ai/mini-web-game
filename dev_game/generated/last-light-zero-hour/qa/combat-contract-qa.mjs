import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const spec = JSON.parse(read('game-spec.json'));
const manifest = JSON.parse(read('assets/asset-manifest.json'));
const game = read('src/game/scenes/GameScene.js');
const weapons = read('src/game/data/weaponConfig.js');
const director = read('src/game/systems/EnemyWaveDirector.js');
const controller = read('src/game/systems/HybridAimController.js');
const progression = read('src/game/systems/SaveData.js');
const loading = read('src/game/scenes/LoadingScene.js');
const battleLoading = read('src/game/scenes/BattleLoadingScene.js');
const home = read('src/game/scenes/HomeScene.js');
const feedback = read('src/game/systems/CombatFeedbackSystem.js');
const gdd = read('docs/01-GDD.md');

const assertions = [];
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  assertions.push(message);
};

assert(spec.canvas.width === 1440 && spec.canvas.height === 2560, 'portrait QHD canvas is 1440x2560');
assert(manifest.qualityTier === 'production-demo', 'asset manifest is production-demo');
assert(manifest.stageBackgrounds.length === 5, 'five day/night phase backgrounds are delivered');
assert(manifest.images.some((a) => a.role === 'player'), 'generated player core asset is delivered');
assert(manifest.images.filter((a) => a.type === 'sprite-sheet').length >= 6, 'six character and weapon motion sheets are delivered');
assert(/WEAPON_ORDER = \['gatling', 'scatter', 'arc', 'rocket', 'rail'\]/.test(weapons), 'five switchable weapons are configured');
assert(/heatPerShot/.test(weapons) && /coolPerSecond/.test(weapons), 'gatling heat and cooling are configured');
assert(/chargePerSecond/.test(weapons) && /chargePerKill/.test(weapons), 'special weapons charge from time and kills');
assert(/type: 'scatter'.*life: 2400/.test(read('src/game/systems/WeaponSystem.js')), 'scatter pellets cross the full battlefield');
assert(/chains: 5, range: 1500, chainRange: 480/.test(weapons) && /arcBolt/.test(feedback), 'arc coil has a visible five-target chain-lightning identity');
assert(/radius: 360/.test(weapons) && /blastArea/.test(feedback) && /shockwave/.test(feedback) && /rocketTrail/.test(feedback), 'rocket uses a wider blast radius with trail and layered explosion feedback');
assert(/getManualAim/.test(game) && /findNearest/.test(game), 'manual aim and nearest-target auto aim are both wired');
assert(/combatTop/.test(game) && /combatBottom/.test(game), 'player movement is clamped to the lower combat zone');
assert(/activeEnemies/.test(director) && /separationRadius/.test(director), 'swarm separation steering is implemented');
assert(/runner/.test(director) && /spitter/.test(director) && /brute/.test(director) && /titan/.test(director), 'small, ranged, large and boss infected roles exist');
assert(/bossTime/.test(director) && /spawnedBossDays/.test(director), 'boss scheduling repeats by survival day');
assert(/buyUpgrade/.test(progression) && /awardRun/.test(progression), 'persistent currency award and weapon upgrade purchase are implemented');
assert(/player-gunner-motion\.png/.test(battleLoading) && /weapon-models\.png/.test(loading) && /BATTLE_LOADING/.test(home), 'separate player-body and weapon layers load before battle while home stays lightweight');
assert(/화면 \*\*상단\*\*을 바라본다/.test(gdd) && /얼굴과 흉부 전면은 보이지/.test(gdd), 'upward-facing rear-view art contract is documented');
assert(/this\.player\.setRotation\(0\)/.test(game) && /weaponModel.*setRotation\(weaponRotation\)/.test(game), 'player body stays north-facing while the separate weapon layer aims');
assert(!/sideEntry/.test(director) && /Between\(-210, -80\)/.test(director), 'infected enter from the northern approach');
assert(/__GAME_QA_STATE__/.test(game) && /__GAME_DEBUG__/.test(game), 'runtime QA state and debug hooks are exposed');
assert(/this\.active = true/.test(controller) && /this\.move/.test(controller), 'drag controller produces simultaneous movement and aim');

console.log(JSON.stringify({ ok: true, assertions: assertions.length, details: assertions }, null, 2));
