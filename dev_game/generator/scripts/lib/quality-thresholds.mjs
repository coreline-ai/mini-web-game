// quality-thresholds.mjs — one home for the numbers that decide "good enough".
//
// The generation-time verifier (codex-imagegen) and the gates (image-quality-qa,
// hq-screen-quality-qa) must agree on these, or an asset passes the moment it is generated
// and fails minutes later at the gate — which is exactly the babysitting loop this session
// set out to remove. Values were MOVED here unchanged, not tuned.

// Backgrounds below this edge-variance read as soft/blurry on a phone. Shared verbatim by
// image-quality-qa (T.background.edge) and hq-screen-quality-qa (hardcoded 60 before).
export const BACKGROUND_EDGE_MIN = 60;

// Role-aware minimum short side for core gameplay sprites (from image-quality-qa).
export const ROLE_MIN_SIDE = {
  player: 320,
  parcel: 220,
  vehicle: 300,
  'sort-bin': 260,
  scanner: 160,
  conveyor: 256,
  collectible: 192,
  reward: 192,
  item: 192,
  powerup: 192,
  target: 192,
  goal: 192,
};

// Minimum opaque-fill ratio inside the alpha bbox (from image-quality-qa). Below this a
// gameplay object reads as a hollow line drawing.
export const FILL_FLOOR = {
  projectile: 0.08,
  hazard: 0.28,
  enemy: 0.28,
  obstacle: 0.28,
  boss: 0.28,
  target: 0.28,
  item: 0.24,
  powerup: 0.24,
};

// Verification-only (no gate uses this yet): how far a generated button's dominant hue may
// drift from the theme accent before we call it the wrong colour. 70° keeps warm-vs-warm
// variation legal while catching the observed failure (gold theme → blue button ≈ 160°).
export const UI_HUE_MAX_DISTANCE = 70;

// 고주파(노이즈/과선명) 상한 — image-quality-qa.mjs의 T.*.hfMax와 같은 숫자여야 한다.
// 생성 시점 검증과 게이트가 다른 숫자를 쓰면 "생성은 통과, 게이트는 거부"가 재발한다.
export const HF_MAX = Object.freeze({ background: 3.6, core: 8.0, ui: 7.0, fx: 6.0 });

// 배경 색수 하한 — image-quality-qa T.background.colors / hq-screen-quality-qa와 같은 숫자.
export const BG_COLORS_MIN = 8000;
