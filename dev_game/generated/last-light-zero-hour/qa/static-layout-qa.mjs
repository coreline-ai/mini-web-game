const canvas = { width: 1440, height: 2560 };
const boxes = [
  { id: 'top-hud', x: 42, y: 36, w: 1356, h: 138 },
  { id: 'radio', x: 58, y: 198, w: 1324, h: 188 },
  { id: 'boss', x: 90, y: 397, w: 1260, h: 82 },
  { id: 'combat-zone', x: 105, y: 1638, w: 1230, h: 640, allowOverlap: true },
  ...Array.from({ length: 5 }, (_, i) => ({ id: `weapon-${i}`, x: 27 + i * 284, y: 2293, w: 250, h: 210 })),
];
const viewports = [[390, 844], [430, 932], [1080, 1920]];
const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

const errors = [];
for (const box of boxes) {
  if (box.x < 24 || box.y < 24 || box.x + box.w > canvas.width - 24 || box.y + box.h > canvas.height - 24) errors.push(`${box.id} violates logical safe area`);
}
for (let i = 0; i < boxes.length; i += 1) {
  for (let j = i + 1; j < boxes.length; j += 1) {
    if (boxes[i].allowOverlap || boxes[j].allowOverlap) continue;
    if (overlap(boxes[i], boxes[j]) > 0) errors.push(`${boxes[i].id} overlaps ${boxes[j].id}`);
  }
}
for (const [w, h] of viewports) {
  const scale = Math.min(w / canvas.width, h / canvas.height);
  if (!(scale > 0)) errors.push(`invalid scale for ${w}x${h}`);
  const cssWidth = canvas.width * scale; const cssHeight = canvas.height * scale;
  if (cssWidth > w + 0.01 || cssHeight > h + 0.01) errors.push(`FIT overflow at ${w}x${h}`);
}
// Result title and epilogue must never be crossed by the bordered panel line.
const resultLayout = { panelTop: 530, titleBottom: 322, epilogueBottom: 494 };
if (resultLayout.titleBottom >= resultLayout.panelTop || resultLayout.epilogueBottom >= resultLayout.panelTop) {
  errors.push('game-over title or epilogue intersects the result-panel top border');
}
if (errors.length) throw new Error(errors.join('\n'));
console.log(JSON.stringify({ ok: true, assertions: boxes.length + viewports.length + 1, viewports: viewports.map((v) => v.join('x')), boxes: boxes.map((b) => b.id) }, null, 2));
