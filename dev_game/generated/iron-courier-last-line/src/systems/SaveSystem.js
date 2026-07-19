const KEY = 'iron_courier_last_line_save_v1';
const DEFAULT_SAVE = Object.freeze({ best: 0, clears: 0, muted: false, continueRun: null });

function finite(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function normalizeCheckpoint(value) {
  if (!value || typeof value !== 'object') return null;
  const encounterIndex = Math.floor(finite(value.encounterIndex, -1));
  if (value.stageId !== 'burning-harbor' || encounterIndex < 0 || encounterIndex > 7) return null;
  const ammo = Object.fromEntries(Object.entries(value.weapons?.ammo ?? {}).map(([id, count]) => [id, count === null ? null : Math.max(0, finite(count, 0))]));
  const byType = {
    technician: Math.max(0, Math.floor(finite(value.rescues?.byType?.technician, 0))),
    medic: Math.max(0, Math.floor(finite(value.rescues?.byType?.medic, 0))),
    artillery: Math.max(0, Math.floor(finite(value.rescues?.byType?.artillery, 0))),
  };
  const encounterActors = Array.isArray(value.encounterActors) ? value.encounterActors.slice(0, 16).map((actor, index) => ({
    index,
    role: String(actor?.role ?? ''),
    kind: ['enemy', 'crane', 'ironMole'].includes(actor?.kind) ? actor.kind : 'enemy',
    className: String(actor?.className ?? ''),
    active: actor?.active !== false && finite(actor?.health, 0) > 0,
    health: Math.max(0, finite(actor?.health, 0)),
    x: Math.max(0, finite(actor?.x, 0)),
    y: Math.max(0, finite(actor?.y, 0)),
    phase: Math.max(1, Math.min(3, Math.floor(finite(actor?.phase, 1)))),
    state: String(actor?.state ?? 'idle'),
  })) : [];
  return {
    version: 1,
    stageId: 'burning-harbor',
    encounterIndex,
    encounterId: String(value.encounterId ?? ''),
    segmentName: String(value.segmentName ?? value.encounterId ?? '해안 진입'),
    resumeKind: value.resumeKind === 'death' ? 'death' : 'checkpoint',
    checkpointX: Math.max(0, finite(value.checkpointX, 120)),
    checkpointY: Math.max(0, finite(value.checkpointY, 520)),
    failureReason: String(value.failureReason ?? ''),
    encounterActors,
    score: Math.max(0, Math.floor(finite(value.score, 0))),
    elapsedMs: Math.max(0, finite(value.elapsedMs, 0)),
    playerHealth: Math.max(1, finite(value.playerHealth, 100)),
    weapons: {
      currentWeapon: String(value.weapons?.currentWeapon ?? 'rifle'),
      ammo,
      grenades: Math.max(0, Math.floor(finite(value.weapons?.grenades, 5))),
    },
    rescues: { total: byType.technician + byType.medic + byType.artillery, byType },
    transport: value.transport ? {
      x: finite(value.transport.x, 8260),
      health: Math.max(1, finite(value.transport.health, 500)),
    } : null,
    escort: value.escort ? {
      completed: Boolean(value.escort.completed),
      active: Boolean(value.escort.active),
      progress: Math.max(0, Math.min(1, finite(value.escort.progress, 0))),
    } : null,
    collectedPickups: Array.isArray(value.collectedPickups) ? [...new Set(value.collectedPickups.map(String))] : [],
    savedAt: String(value.savedAt ?? new Date().toISOString()),
  };
}

export const SAVE_KEY = KEY;

export const SaveSystem = {
  load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY)) ?? {};
      return {
        ...DEFAULT_SAVE,
        ...parsed,
        best: Math.max(0, finite(parsed.best, 0)),
        clears: Math.max(0, Math.floor(finite(parsed.clears, 0))),
        muted: Boolean(parsed.muted),
        continueRun: normalizeCheckpoint(parsed.continueRun),
      };
    } catch {
      return { ...DEFAULT_SAVE };
    }
  },

  save(patch) {
    const next = { ...this.load(), ...patch };
    if ('continueRun' in patch) next.continueRun = normalizeCheckpoint(patch.continueRun);
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  },

  getContinue() { return this.load().continueRun; },
  hasContinue() { return Boolean(this.getContinue()); },
  saveContinue(checkpoint) { return this.save({ continueRun: { ...checkpoint, savedAt: new Date().toISOString() } }).continueRun; },
  clearContinue() { return this.save({ continueRun: null }); },

  commitRun(score, cleared) {
    const data = this.load();
    return this.save({
      best: Math.max(data.best || 0, score || 0),
      clears: (data.clears || 0) + (cleared ? 1 : 0),
      ...(cleared ? { continueRun: null } : {}),
    });
  },
};
