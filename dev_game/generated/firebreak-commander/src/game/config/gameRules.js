import { FIREBREAK_CONFIG } from './firebreakConfig.js';

const { simulation, resources } = FIREBREAK_CONFIG;

export const GAME_RULES = Object.freeze({
  schemaVersion: '1.0.0',
  durationSeconds: simulation.stageDurationSeconds,
  goal: 'active-fire-zero',
  progressMetric: 'activeFireCells',
  requiredObjectives: Object.freeze(['village', 'substation']),
  failConditions: Object.freeze(['required-objective-lost', 'time-expired-with-active-fire']),
  commands: Object.freeze({
    firebreak: Object.freeze({ id: 'firebreak', label: '방화선', input: '숲·초지를 연속으로 드래그', costs: Object.freeze({ fuelPerCell: resources.firebreakFuelPerCell }) }),
    helicopter: Object.freeze({ id: 'helicopter', label: '헬기', input: '불꽃 칸을 탭', costs: Object.freeze({ water: resources.helicopterWater, fuel: resources.helicopterFuel }) }),
    engine: Object.freeze({ id: 'engine', label: '소방차', input: '남쪽 회색 도로 칸을 탭', costs: Object.freeze({ fuel: resources.engineFuel }), maxUnits: resources.maxEngines }),
  }),
});

export const RULE_TEXT = Object.freeze({
  homeTagline: `산불보다 먼저 길을 끊으세요\n${GAME_RULES.durationSeconds}초 동안 마을과 변전소를 지키는 전략 게임`,
  winShort: `승리  ${GAME_RULES.durationSeconds}초 안에 모든 불꽃을 0으로 만들기`,
  failShort: '패배  마을·변전소가 0이 되거나 시간이 끝남',
  goalTitle: '목표  모든 불꽃 0',
  coachGoal: `${GAME_RULES.durationSeconds}초 안에 불을 모두 끄세요.\n마을 또는 변전소가 0이면 즉시 패배!`,
  initialStatus: '승리: 불꽃 0 · 패배: 마을/변전소 0',
  recommendedFirstAction: '추천 첫 행동: 주황색 위험 칸 아래에 방화선을 그리세요',
  engineLimit: `소방차는 최대 ${GAME_RULES.commands.engine.maxUnits}대까지 배치할 수 있습니다`,
  commandLine: Object.freeze({
    firebreak: `${GAME_RULES.commands.firebreak.input} · 연료 ${GAME_RULES.commands.firebreak.costs.fuelPerCell}/칸`,
    helicopter: `${GAME_RULES.commands.helicopter.input} · 물 ${GAME_RULES.commands.helicopter.costs.water} / 연료 ${GAME_RULES.commands.helicopter.costs.fuel}`,
    engine: `회색 도로 칸 탭 · 연료 ${GAME_RULES.commands.engine.costs.fuel}`,
  }),
});

export function getGameRulesSnapshot() {
  return JSON.parse(JSON.stringify(GAME_RULES));
}
