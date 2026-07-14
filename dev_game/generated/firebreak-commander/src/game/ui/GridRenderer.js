import { FIREBREAK_CONFIG, TERRAIN_COLORS } from '../config/firebreakConfig.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';

const OBJECTIVE_COLORS = { village: 0xf3d894, substation: 0x84cdf4, refuge: 0xa8e46d };

export default class GridRenderer {
  constructor(scene, simulation, config = FIREBREAK_CONFIG) {
    this.scene = scene;
    this.simulation = simulation;
    this.config = config;
    this.graphics = scene.add.graphics().setDepth(10);
    const { originX, originY, columns, rows, cellSize } = config.grid;
    this.hitZone = scene.add.rectangle(originX, originY, columns * cellSize, rows * cellSize, 0xffffff, 0.001).setOrigin(0).setInteractive().setDepth(30);
    this.objectiveImages = [];
    this.engineSprites = new Map();
    this.cellFxSprites = new Map();
    const objectiveKeys = { village: ASSET_KEYS.village, substation: ASSET_KEYS.substation, refuge: ASSET_KEYS.refuge };
    this.objectiveLabels = simulation.objectives.map((objective) => {
      const center = objective.cells.reduce((acc, cell) => ({ x: acc.x + cell.x, y: acc.y + cell.y }), { x: 0, y: 0 });
      center.x /= objective.cells.length; center.y /= objective.cells.length;
      const cx = originX + (center.x + 0.5) * cellSize;
      const cy = originY + (center.y + 0.5) * cellSize;
      if (scene.textures.exists(objectiveKeys[objective.id])) {
        this.objectiveImages.push(scene.add.image(cx, cy, objectiveKeys[objective.id]).setDisplaySize(66, 66).setDepth(21));
      }
      return scene.add.text(cx, cy + 25, objective.label, {
        fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '10px', color: '#07120e', align: 'center', stroke: '#ffffff', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(22);
    });
  }

  cellFromWorld(x, y) {
    const { originX, originY, columns, rows, cellSize, touchTargetSize = 44 } = this.config.grid;
    // Keep the visual cells at 36px, but use a nearest-centre touch halo of at
    // least 44px.  This avoids requiring pixel-perfect taps while preserving
    // deterministic cell coordinates for drag interpolation and simulation.
    const nearestX = Math.round((x - originX) / cellSize - 0.5);
    const nearestY = Math.round((y - originY) / cellSize - 0.5);
    // Clamp only for edge cells so their 44px target can extend a few pixels
    // beyond the rendered board; the distance check below still rejects far
    // outside taps.
    const xIndex = Math.max(0, Math.min(columns - 1, nearestX));
    const yIndex = Math.max(0, Math.min(rows - 1, nearestY));
    const centerX = originX + (xIndex + 0.5) * cellSize;
    const centerY = originY + (yIndex + 0.5) * cellSize;
    const halfTarget = Math.max(cellSize / 2, touchTargetSize / 2);
    if (Math.abs(x - centerX) > halfTarget || Math.abs(y - centerY) > halfTarget) return null;
    return { x: xIndex, y: yIndex };
  }

  draw({ risk = [], preview = [], invalid = [], engines = [] } = {}) {
    const g = this.graphics;
    const { originX, originY, columns, rows, cellSize } = this.config.grid;
    const riskMap = new Map(risk.slice(0, 18).map((cell) => [`${cell.x},${cell.y}`, cell.risk]));
    const previewMap = new Set(preview.map((cell) => `${cell.x},${cell.y}`));
    const invalidMap = new Set(invalid);
    const engineMap = new Map(engines.map((engine) => [`${engine.x},${engine.y}`, engine]));
    g.clear();
    g.fillStyle(0x02110d, 0.96); g.fillRoundedRect(originX - 6, originY - 6, columns * cellSize + 12, rows * cellSize + 12, 10);
    g.lineStyle(2, 0x7bbda4, 0.55); g.strokeRoundedRect(originX - 6, originY - 6, columns * cellSize + 12, rows * cellSize + 12, 10);
    for (const cell of this.simulation.cells) {
      const x = originX + cell.x * cellSize;
      const y = originY + cell.y * cellSize;
      let color = TERRAIN_COLORS[cell.terrain];
      if (cell.fireState === 'burned') color = 0x1a1c1c;
      g.fillStyle(color, 1); g.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
      if (cell.terrain === 'forest' && cell.fireState !== 'burned') {
        g.fillStyle(0x163e2b, 0.7); g.fillTriangle(x + 7, y + 27, x + 16, y + 8, x + 25, y + 27);
      } else if (cell.terrain === 'river') {
        g.lineStyle(2, 0x79d8e8, 0.65); g.lineBetween(x + 4, y + 13, x + 32, y + 10); g.lineBetween(x + 4, y + 24, x + 32, y + 21);
      } else if (cell.terrain === 'road') {
        g.lineStyle(2, 0xc1c6bf, 0.42); g.lineBetween(x + 5, y + 18, x + 31, y + 18);
      }
      if (cell.fireState === 'burned') {
        // Ash cells use a crossed hatch so the burned state is not conveyed by
        // the dark fill alone (including in greyscale/high-glare conditions).
        g.lineStyle(1.5, 0xa2aaa4, 0.62);
        g.lineBetween(x + 8, y + 9, x + 14, y + 15); g.lineBetween(x + 22, y + 9, x + 28, y + 15);
        g.lineBetween(x + 8, y + 27, x + 14, y + 21); g.lineBetween(x + 22, y + 27, x + 28, y + 21);
        g.fillCircle(x + 18, y + 18, 2);
      }
      if (cell.structureId) {
        g.fillStyle(OBJECTIVE_COLORS[cell.structureId], 0.82); g.fillRoundedRect(x + 3, y + 3, cellSize - 6, cellSize - 6, 5);
      }
      if (riskMap.has(`${cell.x},${cell.y}`) && cell.fireState !== 'burning') {
        g.fillStyle(0xffb84c, 0.24); g.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
        g.lineStyle(1, 0xffd180, 0.7); g.strokeRect(x + 4, y + 4, cellSize - 8, cellSize - 8);
        // A warning glyph and diagonal hatch make risk legible without colour.
        g.lineStyle(1.5, 0xffedb0, 0.9);
        g.lineBetween(x + 7, y + 27, x + 15, y + 19);
        g.lineBetween(x + 15, y + 27, x + 23, y + 19);
        g.fillTriangle(x + 25, y + 8, x + 31, y + 19, x + 19, y + 19);
        g.lineStyle(1.4, 0x3b2411, 0.9); g.lineBetween(x + 25, y + 12, x + 25, y + 16);
        g.fillCircle(x + 25, y + 18, 1);
      }
      if (cell.firebreak) {
        g.fillStyle(0x2a211a, 0.95); g.fillRect(x + 3, y + 13, cellSize - 6, 10);
        g.lineStyle(2, 0xf0c27a, 0.9); g.lineBetween(x + 4, y + 18, x + cellSize - 4, y + 18);
      }
      if (cell.fireState === 'heating') {
        g.lineStyle(2, 0xffa14b, 0.8); g.strokeCircle(x + 18, y + 18, 9);
        // Rising chevrons distinguish heating from a merely warm terrain tile.
        g.lineStyle(1.5, 0xffe2a0, 0.9);
        g.lineBetween(x + 12, y + 10, x + 15, y + 7); g.lineBetween(x + 15, y + 7, x + 18, y + 10);
        g.lineBetween(x + 18, y + 10, x + 21, y + 7); g.lineBetween(x + 21, y + 7, x + 24, y + 10);
      } else if (cell.fireState === 'burning' && !this.scene.textures.exists(ASSET_KEYS.fxFire)) {
        g.fillStyle(0xff452f, 0.92); g.fillCircle(x + 18, y + 21, 10);
        g.fillStyle(0xffae32, 0.95); g.fillTriangle(x + 9, y + 21, x + 18, y + 4, x + 27, y + 21);
        g.fillStyle(0xffef8b, 0.95); g.fillTriangle(x + 13, y + 21, x + 19, y + 10, x + 23, y + 21);
      } else if (cell.fireState === 'extinguished' && !this.scene.textures.exists(ASSET_KEYS.fxWater)) {
        g.fillStyle(0x62c7ff, 0.5); g.fillCircle(x + 18, y + 18, 9);
        g.lineStyle(2, 0xc8f3ff, 0.9); g.strokeCircle(x + 18, y + 18, 10);
        g.lineBetween(x + 8, y + 25, x + 15, y + 22); g.lineBetween(x + 15, y + 22, x + 22, y + 25); g.lineBetween(x + 22, y + 25, x + 29, y + 22);
      }
      const key = `${cell.x},${cell.y}`;
      if (previewMap.has(key)) {
        g.fillStyle(invalidMap.has(key) ? 0xff3e3e : 0x7cf1c6, 0.52); g.fillRect(x + 3, y + 3, cellSize - 6, cellSize - 6);
        g.lineStyle(2, invalidMap.has(key) ? 0xfff0d5 : 0xe3fff4, 0.95);
        if (invalidMap.has(key)) {
          g.lineBetween(x + 7, y + 7, x + cellSize - 7, y + cellSize - 7);
          g.lineBetween(x + cellSize - 7, y + 7, x + 7, y + cellSize - 7);
        } else {
          // Corner brackets read as a valid placement preview even in greyscale.
          g.lineBetween(x + 6, y + 10, x + 6, y + 6); g.lineBetween(x + 6, y + 6, x + 10, y + 6);
          g.lineBetween(x + cellSize - 10, y + 6, x + cellSize - 6, y + 6); g.lineBetween(x + cellSize - 6, y + 6, x + cellSize - 6, y + 10);
          g.lineBetween(x + 6, y + cellSize - 10, x + 6, y + cellSize - 6); g.lineBetween(x + 6, y + cellSize - 6, x + 10, y + cellSize - 6);
          g.lineBetween(x + cellSize - 10, y + cellSize - 6, x + cellSize - 6, y + cellSize - 6); g.lineBetween(x + cellSize - 6, y + cellSize - 6, x + cellSize - 6, y + cellSize - 10);
        }
      }
      const engine = engineMap.get(key);
      if (engine && !this.scene.textures.exists(ASSET_KEYS.engine)) {
        g.fillStyle(engine.active ? 0xe9f2f4 : 0x7c8588, 1); g.fillRoundedRect(x + 7, y + 10, 22, 16, 4);
        g.fillStyle(engine.active ? 0x42bff5 : 0x555555, 1); g.fillRect(x + 13, y + 7, 10, 5);
      }
      g.lineStyle(1, 0x082219, 0.38); g.strokeRect(x, y, cellSize, cellSize);
    }
    this.syncEngineSprites(engines);
    this.syncCellFx();
    for (const objective of this.simulation.objectives) {
      const minX = Math.min(...objective.cells.map((cell) => cell.x));
      const minY = Math.min(...objective.cells.map((cell) => cell.y));
      const maxX = Math.max(...objective.cells.map((cell) => cell.x));
      const x = originX + minX * cellSize + 3;
      const y = originY + minY * cellSize + 3;
      const width = (maxX - minX + 1) * cellSize - 6;
      g.fillStyle(0x05120e, 0.82); g.fillRect(x, y - 5, width, 5);
      g.fillStyle(objective.integrity > 35 ? 0x68df94 : 0xff5c4d, 1); g.fillRect(x, y - 5, width * (objective.integrity / 100), 5);
    }
  }

  syncEngineSprites(engines) {
    const activeKeys = new Set();
    const { originX, originY, cellSize } = this.config.grid;
    for (const engine of engines) {
      const key = `${engine.x},${engine.y}`;
      activeKeys.add(key);
      if (!this.scene.textures.exists(ASSET_KEYS.engine)) continue;
      let sprite = this.engineSprites.get(key);
      if (!sprite) {
        sprite = this.scene.add.image(0, 0, ASSET_KEYS.engine).setDepth(23);
        this.engineSprites.set(key, sprite);
      }
      sprite.setPosition(originX + (engine.x + 0.5) * cellSize, originY + (engine.y + 0.5) * cellSize)
        .setDisplaySize(34, 34).setAlpha(engine.active ? 1 : 0.45).setVisible(true);
    }
    for (const [key, sprite] of this.engineSprites) {
      if (!activeKeys.has(key)) { sprite.destroy(); this.engineSprites.delete(key); }
    }
  }

  syncCellFx() {
    const activeKeys = new Set();
    const { originX, originY, cellSize } = this.config.grid;
    for (const cell of this.simulation.cells) {
      let texture = null;
      let size = 0;
      let alpha = 1;
      if (cell.fireState === 'burning' && this.scene.textures.exists(ASSET_KEYS.fxFire)) { texture = ASSET_KEYS.fxFire; size = 31; }
      else if (cell.fireState === 'heating' && this.scene.textures.exists(ASSET_KEYS.fxSmoke)) { texture = ASSET_KEYS.fxSmoke; size = 21; alpha = 0.68; }
      else if (cell.fireState === 'extinguished' && this.scene.textures.exists(ASSET_KEYS.fxWater)) { texture = ASSET_KEYS.fxWater; size = 22; alpha = 0.72; }
      if (!texture) continue;
      const key = `${cell.x},${cell.y}`;
      activeKeys.add(key);
      let entry = this.cellFxSprites.get(key);
      if (!entry || entry.texture !== texture) {
        entry?.sprite.destroy();
        entry = { texture, sprite: this.scene.add.image(0, 0, texture).setDepth(25) };
        this.cellFxSprites.set(key, entry);
      }
      const pulse = cell.fireState === 'burning' ? 1 + ((this.simulation.tick + cell.x + cell.y) % 2) * 0.08 : 1;
      entry.sprite.setPosition(originX + (cell.x + 0.5) * cellSize, originY + (cell.y + 0.5) * cellSize)
        .setDisplaySize(size * pulse, size * pulse).setAlpha(alpha).setAngle(cell.fireState === 'burning' ? (cell.x * 7 + cell.y * 3) % 12 - 6 : 0).setVisible(true);
    }
    for (const [key, entry] of this.cellFxSprites) {
      if (!activeKeys.has(key)) { entry.sprite.destroy(); this.cellFxSprites.delete(key); }
    }
  }
}
