export const MISSION_SCHEDULE = [
  { at: 1.0, type: 'civilian', x: 298, y: 342 },
  // Put a clearly identifiable hostile in the first Approach beat.
  { at: 1.5, type: 'rifleman', x: 72, y: 250 },
  { at: 5.4, type: 'rifleman', x: 316, y: 286 },
  { at: 9.0, type: 'drone', x: 280, y: 205 },
  { at: 14.0, type: 'civilian', x: 288, y: 340 },
  { at: 16.0, type: 'rocketman', x: 82, y: 245 },
  { at: 20.0, type: 'drone', x: 304, y: 232 },
  { at: 25.0, type: 'rifleman', x: 290, y: 320 },
  { at: 30.0, type: 'rocketman', x: 88, y: 315 },
  { at: 34.0, type: 'drone', x: 195, y: 210 },
  { at: 38.0, type: 'rifleman', x: 320, y: 270 },
  { at: 42.0, type: 'apc', x: 195, y: 250 },
  { at: 48.0, type: 'rocketman', x: 72, y: 282 },
  { at: 54.0, type: 'drone', x: 305, y: 225 },
  { at: 59.0, type: 'rifleman', x: 312, y: 345 },
  { at: 65.0, type: 'boss', x: 195, y: 225 },
  { at: 72.0, type: 'drone', x: 76, y: 280 },
  { at: 79.0, type: 'drone', x: 312, y: 305 },
];

export default class MissionDirector {
  constructor(scene, spawn) { this.scene = scene; this.spawn = spawn; this.index = 0; this.phase = -1; }
  update(seconds) {
    while (this.index < MISSION_SCHEDULE.length && MISSION_SCHEDULE[this.index].at <= seconds) {
      this.spawn(MISSION_SCHEDULE[this.index++]);
    }
    const phase = seconds >= 65 ? 3 : seconds >= 42 ? 2 : seconds >= 15 ? 1 : 0;
    if (phase !== this.phase) {
      this.phase = phase;
      this.scene.setMissionPhase(phase);
    }
  }
}
