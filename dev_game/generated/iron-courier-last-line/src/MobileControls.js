import Phaser from 'phaser';
import { H, W } from './constants.js';

export default class MobileControls {
  constructor(scene, onPause) {
    this.scene = scene; this.moveX = 0; this.moveY = 0; this.crouchDown = false; this.shootDown = false; this.jumpQueued = false; this.grenadeQueued = false; this.joyPointer = null;
    this.actionControls = [];
    this.viewWidth = scene.cameras.main.width; this.viewHeight = scene.cameras.main.height;
    this.joystickX = 120; this.joystickY = this.viewHeight - 105;
    this.objects = [];
    const fixed = (obj) => { obj.setScrollFactor(0).setDepth(500).setData('_screenX', obj.x).setData('_screenY', obj.y); this.objects.push(obj); return obj; };
    this.base = fixed(scene.add.image(this.joystickX, this.joystickY, 'ui-joystick-base').setDisplaySize(148, 148).setAlpha(0.68));
    this.knob = fixed(scene.add.image(this.joystickX, this.joystickY, 'ui-joystick-knob').setDisplaySize(66, 66).setAlpha(0.82));
    this.zone = fixed(scene.add.zone(this.joystickX, this.joystickY, 230, 230).setInteractive());
    this.zone.on('pointerdown', (p) => { if (this.joyPointer == null) { this.joyPointer = p.id; this.updateJoy(p); } });
    this.handlePointerMove = (p) => { if (p.isDown && p.id === this.joyPointer) this.updateJoy(p); };
    this.handlePointerUp = (p) => this.releasePointer(p.id);
    this.handleInputCancelled = () => this.resetAll({ clearQueued: true });
    scene.input.on('pointermove', this.handlePointerMove);
    scene.input.on('pointerup', this.handlePointerUp);
    scene.input.on('pointerupoutside', this.handlePointerUp);
    scene.input.on('gameout', this.handleInputCancelled);
    this.shoot = this.makeAction(this.viewWidth - 128, this.viewHeight - 105, 66, 'ui-action-fire', () => { this.shootDown = true; }, () => { this.shootDown = false; });
    this.jump = this.makeAction(this.viewWidth - 270, this.viewHeight - 80, 57, 'ui-action-jump', () => { this.jumpQueued = true; });
    this.grenade = this.makeAction(this.viewWidth - 190, this.viewHeight - 260, 45, 'ui-action-grenade', () => { this.grenadeQueued = true; });
    // Use the dedicated 1254px pause asset instead of the smaller generic
    // action icon. The top HUD owns a purpose-built recess for this control.
    this.pause = this.makeAction(this.viewWidth - 62, 52, 28, 'ui-pause', onPause);
    this.objects.push(...this.shoot.objects, ...this.jump.objects, ...this.grenade.objects, ...this.pause.objects);
    this.handleScenePause = () => this.resetAll({ clearQueued: true });
    scene.events.on(Phaser.Scenes.Events.PAUSE, this.handleScenePause);
    scene.events.on(Phaser.Scenes.Events.SLEEP, this.handleScenePause);
    if (typeof window !== 'undefined') window.addEventListener('blur', this.handleInputCancelled);
  }
  makeAction(x, y, r, texture, down, up = () => {}) {
    const bg = this.scene.add.image(x, y, texture).setDisplaySize(r * 2, r * 2).setAlpha(0.76).setScrollFactor(0).setDepth(500).setInteractive().setData('_screenX', x).setData('_screenY', y);
    const pressedTexture = this.scene.textures.exists(`${texture}-pressed`) ? `${texture}-pressed` : texture;
    const disabledTexture = this.scene.textures.exists(`${texture}-disabled`) ? `${texture}-disabled` : texture;
    const action = {
      bg,
      texture,
      objects: [bg],
      ownerPointer: null,
      enabled: true,
      baseScaleX: bg.scaleX,
      baseScaleY: bg.scaleY,
      hitAreaDisplayWidth: r * 2,
      hitAreaDisplayHeight: r * 2,
      restoreVisual: () => bg.setTexture(action.enabled ? texture : disabledTexture).setScale(action.baseScaleX, action.baseScaleY).setAlpha(action.enabled ? 0.76 : 0.48),
      setDisplaySize: (width, height = width) => {
        bg.setTexture(texture).setDisplaySize(width, height);
        action.baseScaleX = bg.scaleX;
        action.baseScaleY = bg.scaleY;
        action.restoreVisual();
      },
      applyHitArea: () => {
        const hitArea = bg.input?.hitArea;
        if (!hitArea?.setTo) return;
        const localWidth = action.hitAreaDisplayWidth / Math.max(0.001, Math.abs(bg.scaleX));
        const localHeight = action.hitAreaDisplayHeight / Math.max(0.001, Math.abs(bg.scaleY));
        hitArea.setTo((bg.width - localWidth) / 2, (bg.height - localHeight) / 2, localWidth, localHeight);
      },
      setHitAreaDisplaySize: (width, height = width) => {
        action.hitAreaDisplayWidth = width;
        action.hitAreaDisplayHeight = height;
        action.applyHitArea();
      },
      release: (pointerId, force = false) => {
        if (action.ownerPointer == null || (!force && action.ownerPointer !== pointerId)) return false;
        action.ownerPointer = null;
        action.restoreVisual();
        up();
        return true;
      },
      setEnabled: (enabled) => {
        action.enabled = Boolean(enabled);
        if (!action.enabled) action.release(null, true);
        action.restoreVisual();
        if (action.enabled && bg.visible) { bg.setInteractive(); action.applyHitArea(); } else bg.disableInteractive();
      },
    };
    bg.on('pointerdown', (pointer) => {
      if (!action.enabled || action.ownerPointer != null) return;
      action.ownerPointer = pointer.id;
      bg.setTexture(pressedTexture).setScale(action.baseScaleX * 0.9, action.baseScaleY * 0.9).setAlpha(1);
      down(pointer);
    });
    bg.on('pointerup', (pointer) => action.release(pointer.id));
    bg.on('pointerout', (pointer) => action.release(pointer.id));
    this.actionControls.push(action);
    return action;
  }
  updateJoy(pointer) {
    const dx = pointer.x - this.joystickX; const dy = pointer.y - this.joystickY; const len = Math.hypot(dx, dy) || 1; const scale = Math.min(58, len) / len;
    const knobX = this.joystickX + dx * scale; const knobY = this.joystickY + dy * scale;
    const rawX = Phaser.Math.Clamp(dx / 50, -1, 1);
    const rawY = Phaser.Math.Clamp(dy / 50, -1, 1);
    const deadzone = 0.16;
    this.moveX = Math.abs(rawX) >= deadzone ? rawX : 0;
    this.moveY = Math.abs(rawY) >= deadzone ? rawY : 0;

    // Pulling the stick mostly downward is a dedicated stationary crouch
    // gesture. Snap the small horizontal drift to zero so a thumb does not
    // accidentally turn the intended dodge into a run animation.
    this.crouchDown = this.moveY >= 0.55 && Math.abs(this.moveX) <= 0.65;
    if (this.crouchDown) this.moveX = 0;

    this.knob.setData('_screenX', knobX).setData('_screenY', knobY).setData('_crouchActive', this.crouchDown).setPosition(knobX, knobY)
      .setTint(this.crouchDown ? 0xffc857 : 0xffffff).setAlpha(this.crouchDown ? 1 : 0.82);
    this.base.setData('_crouchActive', this.crouchDown).setAlpha(this.crouchDown ? 0.92 : 0.68);
  }
  resetJoystick() {
    this.joyPointer = null; this.moveX = 0; this.moveY = 0; this.crouchDown = false;
    this.base.setData('_crouchActive', false).setAlpha(0.68);
    this.knob.setData('_screenX', this.joystickX).setData('_screenY', this.joystickY)
      .setData('_crouchActive', false).setPosition(this.joystickX, this.joystickY).setTint(0xffffff).setAlpha(0.82);
  }
  releasePointer(pointerId) {
    if (pointerId === this.joyPointer) this.resetJoystick();
    this.actionControls.forEach((action) => action.release(pointerId));
  }
  resetAll({ clearQueued = true } = {}) {
    this.resetJoystick();
    this.actionControls.forEach((action) => action.release(null, true));
    this.shootDown = false;
    if (clearQueued) { this.jumpQueued = false; this.grenadeQueued = false; }
  }
  resize(viewWidth, viewHeight = H, hudLayout = {}) {
    this.viewWidth = viewWidth; this.viewHeight = viewHeight; this.joystickY = viewHeight - 105;
    const canvasWidth = this.scene.scale?.canvasBounds?.width ?? window.innerWidth;
    const cssScaleY = (this.scene.scale?.canvasBounds?.height ?? viewHeight) / viewHeight;
    const compact = canvasWidth < 1100;
    this.joystickX = compact ? 96 : 120;
    // Compact landscape keeps the visible ring inside a ~24 CSS px edge
    // margin and off the player's spawn silhouette. The larger 230px input
    // zone remains unchanged, so usability is not traded for visual clarity.
    this.base.setDisplaySize(compact ? 120 : 148, compact ? 120 : 148);
    this.knob.setDisplaySize(compact ? 58 : 66, compact ? 58 : 66);
    const pauseVisualSize = hudLayout.pauseVisualSize ?? (compact ? 58 : 42);
    const pauseTouchSize = hudLayout.pauseTouchSize ?? Math.max(pauseVisualSize, 46 / Math.max(0.001, cssScaleY));
    // The visible icon stays inside the authored HUD recess. Accessibility is
    // preserved by a separate hit area that may be larger than the artwork.
    this.pause.setDisplaySize(pauseVisualSize);
    this.pause.setHitAreaDisplaySize(pauseTouchSize);
    const positions = [
      [this.base, this.joystickX, this.joystickY], [this.knob, this.joystickX, this.joystickY], [this.zone, this.joystickX, this.joystickY],
      [this.shoot.bg, viewWidth - 128, viewHeight - 105], [this.jump.bg, viewWidth - 270, viewHeight - 80],
      [this.grenade.bg, viewWidth - 190, viewHeight - 260], [this.pause.bg, hudLayout.pauseX ?? viewWidth - 62, hudLayout.pauseY ?? 52],
    ];
    positions.forEach(([obj, x, y]) => obj.setData('_screenX', x).setData('_screenY', y).setPosition(x, y));
    this.resetAll({ clearQueued: true });
    return this;
  }
  consumeJump() { const value = this.jumpQueued; this.jumpQueued = false; return value; }
  consumeGrenade() { const value = this.grenadeQueued; this.grenadeQueued = false; return value; }
  setVisible(value) {
    this.resetAll({ clearQueued: true });
    [...new Set([this.base, this.knob, ...this.objects])].forEach((o) => {
      o.setVisible(value);
      if (o.input) value ? o.setInteractive() : o.disableInteractive();
    });
    this.actionControls.forEach((action) => {
      action.restoreVisual();
      if (!value || !action.enabled) action.bg.disableInteractive();
      else action.applyHitArea();
    });
  }
  syncCamera() { /* scrollFactor(0) keeps controls camera-fixed without a one-frame lag. */ }
  layoutEntries() { return [{ id: 'joystick', obj: this.base, role: 'touch-control' }, { id: 'shoot-button', obj: this.shoot.bg, role: 'touch-control' }, { id: 'jump-button', obj: this.jump.bg, role: 'touch-control' }, { id: 'grenade-button', obj: this.grenade.bg, role: 'touch-control' }, { id: 'pause-button', obj: this.pause.bg, role: 'touch-control' }]; }
  destroy() {
    this.resetAll({ clearQueued: true });
    this.scene.input.off('pointermove', this.handlePointerMove);
    this.scene.input.off('pointerup', this.handlePointerUp);
    this.scene.input.off('pointerupoutside', this.handlePointerUp);
    this.scene.input.off('gameout', this.handleInputCancelled);
    this.scene.events.off(Phaser.Scenes.Events.PAUSE, this.handleScenePause);
    this.scene.events.off(Phaser.Scenes.Events.SLEEP, this.handleScenePause);
    if (typeof window !== 'undefined') window.removeEventListener('blur', this.handleInputCancelled);
    [...new Set([this.base, this.knob, ...this.objects])].forEach((o) => o?.destroy());
  }
}
