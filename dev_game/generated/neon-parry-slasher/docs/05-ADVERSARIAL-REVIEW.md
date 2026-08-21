# 05 - Adversarial Review
# Project: Neon Parry: Blade Slasher (`neon-parry-slasher`)

## 1. Potential Edge Cases & Mitigations
* **Slash Spamming Exploit**:
  - *Risk*: Player continuously taps everywhere to deflect all bullets without timing.
  - *Mitigation*: Enforced $120\text{ms}$ cooldown between slashes; slash window lasts only $150\text{ms}$.
* **Audio Context Suspension**:
  - *Risk*: Modern browsers block audio until direct user gesture.
  - *Mitigation*: `ensureContext()` called upon user tap/start button click.
* **Invisible Projectile Hit**:
  - *Risk*: Bullet spawning too close to player.
  - *Mitigation*: Minimum spawn radius locked at $250\text{px}$ from center ($>0.8\text{s}$ reaction window).
