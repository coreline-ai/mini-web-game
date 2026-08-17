export function isMissileLockReady(progressMs, targetActive, ammo, lockMs = 650) {
  return Boolean(targetActive) && ammo > 0 && progressMs >= lockMs;
}

export function shouldRecoverFromOverheat(heat, readyAt = 40) {
  return heat <= readyAt;
}

export function shotsForDuration(durationMs, rateMs = 100) {
  return Math.floor(Math.max(0, durationMs) / rateMs);
}
