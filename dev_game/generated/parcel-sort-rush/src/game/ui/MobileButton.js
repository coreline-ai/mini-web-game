function wireButton(scene, bg, pieces, onClick, txtOverride = null) {
  bg.setInteractive({ useHandCursor: true });
  const initial = pieces.map((piece) => ({ piece, scaleX: piece.scaleX, scaleY: piece.scaleY }));
  const applyScale = (factor) => {
    for (const { piece, scaleX, scaleY } of initial) piece.setScale(scaleX * factor, scaleY * factor);
  };
  const reset = () => applyScale(1);
  bg.on('pointerdown', () => {
    applyScale(0.97);
    onClick?.();
  });
  bg.on('pointerup', reset);
  bg.on('pointerout', reset);
  return {
    bg,
    txt: txtOverride || pieces.find((p) => p.type === 'Text') || null,
    pieces,
    setVisible: (v) => { for (const p of pieces) p.setVisible(v); },
    destroy: () => { for (const p of pieces) p.destroy(); },
  };
}

export function makeTextButton(scene, x, y, label, onClick, width = 360, height = 92, fill = 0x23c95a, fontSize = '42px') {
  const shadow = scene.add.rectangle(x, y + 10, width, height, 0x000000, 0.35).setDepth(30);
  const bg = scene.add.rectangle(x, y, width, height, fill, 1).setStrokeStyle(5, 0xffffff, 0.82).setDepth(31);
  const shine = scene.add.rectangle(x, y - height * 0.28, width * 0.82, height * 0.16, 0xffffff, 0.2).setDepth(32);
  const txt = scene.add.text(x, y, label, { fontFamily: 'Arial Black, Arial', fontSize, color: '#ffffff', stroke: '#000000', strokeThickness: 7 }).setOrigin(0.5).setDepth(33);
  return wireButton(scene, bg, [shadow, bg, shine, txt], onClick);
}

export function makeImageTextButton(scene, x, y, label, texture, onClick, width = 420, height = 104, fontSize = '44px') {
  if (!label) {
    const bg = scene.add.image(x, y, texture).setDisplaySize(width, height).setDepth(31);
    return wireButton(scene, bg, [bg], onClick);
  }

  const theme = String(texture || '').includes('sound')
    ? { fill: 0x16bed0, dark: 0x077385, light: 0x64ffff, stroke: 0xb9ffff }
    : String(texture || '').includes('home')
      ? { fill: 0x167ad8, dark: 0x073f88, light: 0x62ccff, stroke: 0xb9eaff }
      : String(texture || '').includes('resume')
        ? { fill: 0xf2a72a, dark: 0x9a5510, light: 0xffdf73, stroke: 0xfff0b8 }
        : { fill: 0x43d900, dark: 0x147a05, light: 0xaaff42, stroke: 0xdbff8c };

  const container = scene.add.container(x, y).setDepth(30);
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.34);
  shadow.fillRoundedRect(-width / 2 + 8, -height / 2 + 12, width - 16, height, 25);

  const body = scene.add.graphics();
  body.fillStyle(theme.dark, 1);
  body.fillRoundedRect(-width / 2, -height / 2 + 6, width, height, 25);
  body.fillStyle(theme.fill, 1);
  body.fillRoundedRect(-width / 2, -height / 2, width, height - 8, 25);
  body.lineStyle(5, theme.stroke, 0.95);
  body.strokeRoundedRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 14, 22);
  body.lineStyle(2, 0xffffff, 0.42);
  body.strokeRoundedRect(-width / 2 + 12, -height / 2 + 12, width - 24, height - 31, 16);
  // Avoid a long gray "slot" at the top of buttons. A previous wide translucent
  // shine bar looked like a broken/transparent cut line after scene compositing.
  body.lineStyle(3, theme.light, 0.22);
  body.beginPath();
  body.moveTo(-width * 0.34, -height * 0.32);
  body.lineTo(width * 0.34, -height * 0.32);
  body.strokePath();
  body.fillStyle(0x00131a, 0.16);
  for (let ix = -width * 0.34; ix <= width * 0.35; ix += 18) {
    for (let iy = height * 0.18; iy <= height * 0.34; iy += 16) {
      body.fillCircle(ix, iy, 1.8);
    }
  }

  const bg = scene.add.rectangle(0, 0, width, height, 0xffffff, 0.001);
  const txt = scene.add.text(0, height * 0.03, label, {
    fontFamily: 'Arial Black, Arial',
    fontSize,
    color: '#ffffff',
    stroke: '#061019',
    strokeThickness: Math.max(6, Math.round(Number.parseFloat(fontSize) * 0.14)),
    align: 'center',
  }).setOrigin(0.5).setDepth(33);
  container.add([shadow, body, bg, txt]);
  container.setSize(width, height);
  return wireButton(scene, bg, [container], onClick, txt);
}
