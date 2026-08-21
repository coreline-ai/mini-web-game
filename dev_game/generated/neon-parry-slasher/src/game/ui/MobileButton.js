export function makeTextButton(
  scene,
  x,
  y,
  label,
  onClick,
  {
    width = 620,
    height = 130,
    oneShot = false,
    fireOn = 'pointerup',
    disabled = false,
    fontSize = null,
    theme = 'cyan' // 'cyan', 'magenta', 'danger'
  } = {}
) {
  const isMagenta = theme === 'magenta';
  const isDanger = theme === 'danger';

  const borderColor = isDanger ? 0xff0055 : isMagenta ? 0xff007f : 0x00f7ff;
  const bgColor = isDanger ? 0x220511 : isMagenta ? 0x1a0624 : 0x08152b;

  // Glow Outer Border Container
  const glow = scene.add.rectangle(x, y, width + 8, height + 8, borderColor, 0.25)
    .setOrigin(0.5);

  const bg = scene.add.rectangle(x, y, width, height, bgColor, 0.92)
    .setStrokeStyle(3, borderColor, 0.95)
    .setOrigin(0.5);

  const calculatedFontSize = fontSize || (height >= 100 ? '42px' : height >= 70 ? '30px' : '24px');

  const txt = scene.add.text(x, y, label, {
    fontFamily: 'Arial Black, Impact, sans-serif',
    fontSize: calculatedFontSize,
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 5,
    letterSpacing: 2
  }).setOrigin(0.5);

  let fired = false;
  let enabled = !disabled;

  const resetVisual = () => {
    bg.setScale(1);
    txt.setScale(1);
    glow.setScale(1).setAlpha(0.25);
  };

  const fire = () => {
    if (!enabled || fired) return;
    if (oneShot) {
      fired = true;
      bg.disableInteractive();
    }
    onClick?.();
  };

  const setEnabled = (value) => {
    enabled = !!value;
    if (enabled && !fired) {
      bg.setInteractive({ useHandCursor: true });
    } else {
      bg.disableInteractive();
    }
    resetVisual();
  };

  setEnabled(enabled);

  bg.on('pointerover', () => {
    if (!enabled || fired) return;
    glow.setAlpha(0.6).setScale(1.03);
    bg.setScale(1.02);
    txt.setScale(1.02);
  });

  bg.on('pointerout', resetVisual);

  bg.on('pointerdown', () => {
    if (!enabled || fired) return;
    bg.setScale(0.96);
    txt.setScale(0.96);
    glow.setAlpha(0.8).setScale(0.96);
    if (fireOn === 'pointerdown') fire();
  });

  bg.on('pointerup', () => {
    if (!enabled || fired) return;
    resetVisual();
    if (fireOn !== 'pointerdown') fire();
  });

  return {
    bg,
    txt,
    glow,
    resetVisual,
    setEnabled,
    destroy() {
      bg.destroy();
      txt.destroy();
      glow.destroy();
    }
  };
}
