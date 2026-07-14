export const FIREBREAK_CONFIG = Object.freeze({
  grid: {
    columns: 10,
    rows: 15,
    cellSize: 36,
    // The rendered grid remains a crisp 36px tactical map, while touch input
    // snaps to a 44px minimum target around each cell on narrow devices.
    touchTargetSize: 44,
    originX: 15,
    originY: 116,
  },
  simulation: {
    tickMs: 500,
    stageDurationSeconds: 180,
    maxCatchUpTicks: 4,
    baseHeatTransfer: 0.045,
    ambientCooling: 0.012,
    burningHeatGain: 0.018,
    emberWarningSeconds: 5,
  },
  resources: {
    water: 100,
    fuel: 100,
    firebreakFuelPerCell: 3,
    helicopterWater: 20,
    helicopterFuel: 8,
    helicopterCooldownTicks: 16,
    engineFuel: 10,
    engineWaterPerTick: 1,
    maxEngines: 2,
  },
  actions: {
    helicopterRadius: 1.75,
    helicopterCooling: 0.68,
    engineRadius: 1.55,
    engineCooling: 0.16,
    minFirebreakCells: 2,
  },
  objectives: {
    maxIntegrity: 100,
    damagePerBurningCellTick: 2.2,
  },
  scoring: {
    extinguishCell: 100,
    blockedSpread: 40,
    objectiveSurvives: 500,
    burnedCellPenalty: 24,
    resourcePoint: 4,
  },
  terrain: {
    forest: { flammable: true, fuelLoad: 1, moisture: 0.16, ignitionHeat: 0.65, burnRate: 0.018, spread: 1 },
    grass: { flammable: true, fuelLoad: 0.62, moisture: 0.08, ignitionHeat: 0.52, burnRate: 0.028, spread: 1.16 },
    scrub: { flammable: true, fuelLoad: 0.8, moisture: 0.12, ignitionHeat: 0.58, burnRate: 0.022, spread: 1.08 },
    road: { flammable: true, fuelLoad: 0.14, moisture: 0.36, ignitionHeat: 0.8, burnRate: 0.04, spread: 0.2 },
    rock: { flammable: false, fuelLoad: 0, moisture: 1, ignitionHeat: 2, burnRate: 0, spread: 0 },
    river: { flammable: false, fuelLoad: 0, moisture: 1, ignitionHeat: 2, burnRate: 0, spread: 0 },
  },
  windSchedule: [
    { tick: 0, direction: 'E', speed: 1, phase: 'DRY FRONT' },
    { tick: 120, direction: 'SE', speed: 2, phase: 'WIND SHIFT' },
    { tick: 240, direction: 'S', speed: 3, phase: 'EMBER NIGHT' },
  ],
  emberEvent: { warningTick: 250, triggerTick: 260, jumpCells: 2 },
});

export const TERRAIN_COLORS = Object.freeze({
  forest: 0x24533a,
  grass: 0x668f46,
  scrub: 0x8a7040,
  road: 0x4b5360,
  rock: 0x596168,
  river: 0x28799a,
});

export const WIND_VECTORS = Object.freeze({
  N: { x: 0, y: -1 },
  NE: { x: 1, y: -1 },
  E: { x: 1, y: 0 },
  SE: { x: 1, y: 1 },
  S: { x: 0, y: 1 },
  SW: { x: -1, y: 1 },
  W: { x: -1, y: 0 },
  NW: { x: -1, y: -1 },
});
