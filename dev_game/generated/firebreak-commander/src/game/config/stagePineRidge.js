const TERRAIN_ROWS = [
  'FFFFRRFFFF',
  'FFFFRFFFFF',
  'FFSFRFFFFF',
  'FFSWWWFFFF',
  'SSSWWGFFFF',
  'GGGWWGGFFF',
  'GGGGGGSSSF',
  'SSSGGGSSSF',
  'GGGGGGGGGG',
  'GGGGRGGGGG',
  'GGDGGGGDGG',
  'DDDDDDDDDD',
  'GGDGGGGDGG',
  'GGDGGGGDGG',
  'GGDGGGGDGG',
];

const TERRAIN_KEYS = Object.freeze({
  F: 'forest',
  G: 'grass',
  S: 'scrub',
  D: 'road',
  R: 'rock',
  W: 'river',
});

export const PINE_RIDGE_STAGE = Object.freeze({
  id: 'pine-ridge-first-response',
  title: 'PINE RIDGE',
  subtitle: 'FIRST RESPONSE',
  seed: 0x51f17e,
  terrainRows: TERRAIN_ROWS,
  ignitionCells: [{ x: 0, y: 0 }, { x: 3, y: 2 }],
  // The response lasts through all three weather phases. Each warning is
  // deterministic and visible before the corresponding wind-borne spot fire.
  minContainmentTick: 360,
  spotFires: [
    { id: 'dry-lightning', label: '건조 낙뢰', warningTick: 110, triggerTick: 120, cells: [{ x: 1, y: 6 }, { x: 6, y: 1 }] },
    { id: 'ember-front', label: '비화 전선', warningTick: 230, triggerTick: 240, cells: [{ x: 2, y: 7 }, { x: 6, y: 7 }] },
    { id: 'south-flank', label: '남쪽 화점', warningTick: 310, triggerTick: 320, cells: [{ x: 1, y: 12 }, { x: 8, y: 12 }] },
  ],
  objectives: [
    { id: 'village', label: '마을', required: true, cells: [{ x: 0, y: 13 }, { x: 1, y: 13 }, { x: 0, y: 14 }, { x: 1, y: 14 }] },
    { id: 'substation', label: '변전소', required: true, cells: [{ x: 8, y: 13 }, { x: 9, y: 13 }, { x: 8, y: 14 }, { x: 9, y: 14 }] },
    { id: 'refuge', label: '보호구역', required: false, cells: [{ x: 8, y: 4 }, { x: 9, y: 4 }, { x: 8, y: 5 }, { x: 9, y: 5 }] },
  ],
});

export function terrainAt(x, y) {
  const token = TERRAIN_ROWS[y]?.[x];
  return TERRAIN_KEYS[token] || 'grass';
}
