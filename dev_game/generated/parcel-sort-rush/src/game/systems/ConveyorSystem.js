import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { BINS, CONVEYOR } from '../config/sortingConfig.js';

export default class ConveyorSystem {
  constructor(scene) {
    this.scene = scene;
    this.beltLines = [];
    this.binSprites = [];
    this.warningPulse = 0;
    this.draw();
  }

  draw() {
    const { width, height } = SPEC.canvas;
    this.bgDay = this.scene.add.image(width / 2, height / 2, ASSET_KEYS.backgrounds.day).setDisplaySize(width, height).setDepth(-60);
    this.bgRush = this.scene.add.image(width / 2, height / 2, ASSET_KEYS.backgrounds.rush).setDisplaySize(width, height).setDepth(-59).setAlpha(0);
    this.scene.add.rectangle(0, 0, width, height, 0x001424, 0.12).setOrigin(0).setDepth(-58);

    this.beltDeck = this.scene.add.rectangle(CONVEYOR.x, 940, 590, 1240, 0x103b42, 0.86).setDepth(-48);
    this.beltDeck.setStrokeStyle(8, 0x73eeff, 0.52);
    // The generated conveyor art is a complete machine segment with end caps, not a
    // seamless tile. Using it as a tileSprite repeats the end caps through the middle
    // of the lane and makes the belt look broken. Render it once as the static
    // machine body, then animate only the light/slat markers below.
    this.belt = this.scene.add.image(CONVEYOR.x, 940, ASSET_KEYS.conveyorTile).setDepth(-44).setAlpha(0.96);
    this.belt.setDisplaySize(560, 1210);
    this.scene.add.rectangle(CONVEYOR.x, 940, 540, 1230, 0x0ae6ff, 0.035).setStrokeStyle(5, 0x79e2ff, 0.35).setDepth(-43);
    this.beltBounds = this.scene.add.rectangle(CONVEYOR.x, 940, 560, 1210, 0xffffff, 0.001).setDepth(-42);
    this.scene.add.rectangle(CONVEYOR.x - 300, 940, 18, 1240, 0x07212d, 0.36).setStrokeStyle(2, 0x73eeff, 0.16).setDepth(-41);
    this.scene.add.rectangle(CONVEYOR.x + 300, 940, 18, 1240, 0x07212d, 0.36).setStrokeStyle(2, 0x73eeff, 0.16).setDepth(-41);

    this.scannerBody = this.scene.add.rectangle(CONVEYOR.x, CONVEYOR.gateY - 44, 520, 126, 0x062334, 0.16).setDepth(-33);
    this.scannerBody.setStrokeStyle(3, 0x63e7ff, 0.18);
    this.scanner = this.scene.add.image(CONVEYOR.x, CONVEYOR.gateY - 46, ASSET_KEYS.scanner)
      .setDisplaySize(640, 169)
      .setDepth(-32);
    this.missLine = this.scene.add.rectangle(CONVEYOR.x, CONVEYOR.missY, 620, 9, 0xffd35a, 0.64).setDepth(-25);
    this.scene.add.text(CONVEYOR.x, CONVEYOR.missY - 28, 'SORT BEFORE THIS LINE', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '24px',
      color: '#fff0a6',
      stroke: '#00131a',
      strokeThickness: 5,
      align: 'center',
    }).setOrigin(0.5).setDepth(-24).setAlpha(0.86);
    for (let i = 0; i < 8; i += 1) {
      const line = this.scene.add.rectangle(CONVEYOR.x, 320 + i * 145, 420, 10, 0x9eeaff, 0.20).setDepth(-36);
      this.beltLines.push(line);
    }

    this.floorPanel = this.scene.add.rectangle(width / 2, 1694, width - 80, 300, 0x07111a, 0.82).setDepth(-22);
    this.floorPanel.setStrokeStyle(5, 0x62d7ff, 0.24);
    this.floorBounds = this.scene.add.rectangle(width / 2, 1694, width - 140, 270, 0xffffff, 0.001).setDepth(-21);
    for (const bin of BINS) this.drawBin(bin);
  }

  drawBin(bin) {
    const texture = ASSET_KEYS.chutes[bin.id] || ASSET_KEYS.chutes.north;
    const color = Phaser.Display.Color.HexStringToColor(bin.color).color;
    const hitZone = this.scene.add.rectangle(bin.x, bin.y + 18, 222, 282, 0x061826, 0.58).setDepth(-16);
    hitZone.setStrokeStyle(5, color, 0.84);
    const glow = this.scene.add.rectangle(bin.x, bin.y + 18, 202, 258, color, 0.08).setDepth(-15);
    glow.setStrokeStyle(2, 0xffffff, 0.18);
    const shadow = this.scene.add.ellipse(bin.x, bin.y + 74, 180, 32, 0x000000, 0.38).setDepth(-13);
    // Keep the destination label below the chute artwork. The previous badge
    // overlapped the front lip of all four chute sprites, making the bins look
    // visually "broken" in the live game even though the PNGs were valid.
    const chute = this.scene.add.image(bin.x, bin.y - 42, texture).setDisplaySize(174, 204).setDepth(-10);
    const badgeY = bin.y + 126;
    const badgeW = bin.id === 'fragile' ? 184 : 166;
    const badge = this.scene.add.rectangle(bin.x, badgeY, badgeW, 52, 0x07111a, 0.94).setDepth(-9);
    badge.setStrokeStyle(3, color, 0.95);
    const label = this.scene.add.text(bin.x, badgeY, bin.label, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: bin.id === 'fragile' ? '24px' : '29px',
      color: bin.color,
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center',
    }).setOrigin(0.5).setDepth(-8);
    this.binSprites.push({ id: bin.id, shadow, chute, hitZone, glow, badge, label });
  }

  update(delta, speed, rushActive) {
    const move = speed * (delta / 1000) * 0.72;
    this.bgRush.setAlpha(Phaser.Math.Linear(this.bgRush.alpha, rushActive ? 0.8 : 0, 0.08));
    this.scanner.setTint(rushActive ? 0xffd35a : 0xffffff);
    for (const line of this.beltLines) {
      line.y += move;
      if (line.y > CONVEYOR.missY) line.y = CONVEYOR.topY;
      line.setFillStyle(rushActive ? 0xff6a3d : 0xffffff, rushActive ? 0.52 : 0.2);
    }
  }

  binAt(x, y) {
    return BINS.find((bin) => Math.abs(x - bin.x) <= 110 && Math.abs(y - bin.y) <= 130) || null;
  }

  getBinCenter(id) {
    const bin = BINS.find((b) => b.id === id);
    return bin ? { x: bin.x, y: bin.y } : null;
  }

  getLayoutItems() {
    return [
      { id: 'game-belt', object: this.beltBounds, allowOverlap: true },
      { id: 'game-floor-panel', object: this.floorBounds, allowOverlap: true },
      { id: 'game-scanner', object: this.scanner, allowOverlap: true },
      { id: 'game-miss-line', object: this.missLine, allowOverlap: true },
      ...this.binSprites.flatMap((bin) => [
        { id: `game-bin-hit-zone-${bin.id}`, object: bin.hitZone, allowOverlap: true },
        { id: `game-bin-${bin.id}`, object: bin.chute, allowOverlap: true },
        { id: `game-bin-label-${bin.id}`, object: bin.label, allowOverlapWith: [`game-bin-hit-zone-${bin.id}`, `game-bin-${bin.id}`] },
      ]),
    ];
  }
}
