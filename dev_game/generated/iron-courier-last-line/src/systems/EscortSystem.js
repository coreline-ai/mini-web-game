import Phaser from 'phaser';

export class EscortSystem extends Phaser.Events.EventEmitter {
  constructor(scene, transport, options = {}) {
    super();
    this.scene = scene;
    this.transport = transport;
    this.startX = options.startX ?? transport.x;
    this.endX = options.endX ?? this.startX + 1500;
    this.player = options.player ?? null;
    this.maxLead = options.maxLead ?? 460;
    this.maxLag = options.maxLag ?? 340;
    this.catchUpMultiplier = options.catchUpMultiplier ?? 1.35;
    this.active = false;
    this.completed = false;
    this.failed = false;
    this.pauseWhenThreatened = options.pauseWhenThreatened ?? true;
    this.threatProvider = options.threatProvider ?? (() => false);
    this.pauseReason = null;
    this.movementState = 'idle';
    this.threatened = false;
    this.commandedVelocityX = 0;
    transport.on('destroyed', (source) => this.fail('transport-destroyed', source));
    this.player?.once('died', (source) => this.fail('player-died', source));
  }

  start() {
    if (this.completed || this.failed) return false;
    this.active = true;
    this.pauseReason = null;
    this.movementState = 'moving';
    this.emit('started', this.snapshot());
    return true;
  }

  stop(reason = 'stopped') {
    this.active = false;
    this.pauseReason = reason;
    this.movementState = 'stopped';
    this.commandedVelocityX = 0;
    this.transport?.setVelocityX(0);
  }

  update() {
    if (!this.active || this.completed || this.failed || !this.transport?.active) return;
    const playerDelta = this.player?.active ? this.player.x - this.transport.x : 0;
    const playerLead = Math.max(0, playerDelta);
    const playerLag = Math.max(0, -playerDelta);
    this.threatened = Boolean(this.pauseWhenThreatened && this.threatProvider(this.transport));

    // A player who has moved ahead is the signal for ATLAS to follow, not a
    // reason to stop. Only a player lagging behind the vehicle (or a nearby
    // threat) pauses it. `maxLead` now selects catch-up speed and `maxLag`
    // independently owns the wait-for-player rule.
    if (this.threatened) {
      this.pauseReason = 'threatened';
      this.movementState = 'paused-threat';
      this.commandedVelocityX = 0;
    } else if (this.player?.active && playerLag > this.maxLag) {
      this.pauseReason = 'player-behind';
      this.movementState = 'paused-player-lag';
      this.commandedVelocityX = 0;
    } else {
      this.pauseReason = null;
      const catchingUp = playerLead > this.maxLead;
      this.movementState = catchingUp ? 'catching-up' : 'moving';
      this.commandedVelocityX = this.transport.moveSpeed * (catchingUp ? this.catchUpMultiplier : 1);
    }

    this.transport.setVelocityX(this.commandedVelocityX);
    if (this.transport.x >= this.endX) this.complete();
    this.emit('progress', this.snapshot());
  }

  complete() {
    this.active = false;
    this.completed = true;
    this.pauseReason = null;
    this.movementState = 'completed';
    this.commandedVelocityX = 0;
    this.transport.setVelocityX(0);
    this.emit('completed', this.snapshot());
  }

  fail(reason, source = null) {
    if (this.failed || this.completed) return;
    this.active = false;
    this.failed = true;
    this.pauseReason = reason;
    this.movementState = 'failed';
    this.commandedVelocityX = 0;
    this.transport?.setVelocityX(0);
    this.emit('failed', { reason, source, ...this.snapshot() });
  }

  snapshot() {
    const transportX = this.transport?.x ?? this.startX;
    const playerX = this.player?.x ?? null;
    const playerDelta = playerX == null ? 0 : playerX - transportX;
    const playerLead = Math.max(0, playerDelta);
    const playerLag = Math.max(0, -playerDelta);
    const span = Math.max(1, this.endX - this.startX);
    const progress = Phaser.Math.Clamp((transportX - this.startX) / span, 0, 1);
    return {
      active: this.active,
      completed: this.completed,
      failed: this.failed,
      progress,
      progressPercent: Math.round(progress * 100),
      health: this.transport?.health ?? 0,
      maxHealth: this.transport?.maxHealth ?? 0,
      startX: this.startX,
      endX: this.endX,
      transportX,
      playerX,
      playerDelta,
      playerLead,
      playerLag,
      maxLead: this.maxLead,
      maxLag: this.maxLag,
      distanceToPlayer: Math.abs(playerDelta),
      playerAhead: playerLead > 0,
      playerBehind: playerLag > 0,
      remainingDistance: Math.max(0, this.endX - transportX),
      threatened: this.threatened,
      pauseReason: this.pauseReason,
      isPaused: this.active && this.commandedVelocityX === 0,
      movementState: this.movementState,
      vehicleDirectionFromPlayer: playerDelta > 0 ? 'backward' : playerDelta < 0 ? 'forward' : 'same',
      returnDirection: this.pauseReason === 'player-behind' ? 'forward' : null,
      commandedVelocityX: this.commandedVelocityX,
      actualVelocityX: this.transport?.body?.velocity?.x ?? 0,
    };
  }
}

export default EscortSystem;
