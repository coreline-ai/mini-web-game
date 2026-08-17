export function productionGateProfile(spec = {}, requestedMode = 'auto') {
  const isV2 = spec.schemaVersion === '2.0.0';
  if (requestedMode === 'compatibility' && isV2) {
    throw new Error('schema v2 cannot use compatibility mode; custom-loop-full is required');
  }
  if (requestedMode === 'custom-loop-full') return 'custom-loop-full';
  if (requestedMode !== 'auto') throw new Error(`Unknown production gate mode: ${requestedMode}`);
  // schema v2의 buildDecision은 설계 출발점이지 QA 강도를 낮추는 스위치가 아니다.
  // custom-loop, hybrid, archetype-start 모두 capture/session/docs gates를 거친다.
  return isV2 ? 'custom-loop-full' : 'compatibility';
}
