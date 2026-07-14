export const NEIGHBOR_OFFSETS = Object.freeze([
  { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
  { x: -1, y: 0 },                         { x: 1, y: 0 },
  { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 },
]);

export function cellKey(x, y) { return `${x},${y}`; }

export function inBounds(x, y, columns, rows) {
  return x >= 0 && y >= 0 && x < columns && y < rows;
}

export function gridIndex(x, y, columns) { return y * columns + x; }

export function interpolateCells(a, b) {
  const cells = [];
  let x0 = a.x;
  let y0 = a.y;
  const x1 = b.x;
  const y1 = b.y;
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    cells.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return cells;
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(v) {
  const length = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / length, y: v.y / length };
}

export function uniqueCells(cells) {
  const seen = new Set();
  return cells.filter((cell) => {
    const key = cellKey(cell.x, cell.y);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
