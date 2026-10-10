// All tunable constants live here. Units are arbitrary "world units" (~metres); density 1 => mass = volume.
export const CONFIG = {
  fixedDt: 1 / 120,          // physics step (s) - fixed for determinism
  maxStepsPerFrame: 12,
  softSubsteps: 8,           // towers containing soft blocks run the solver this many times per fixed step (stiff/viscous springs need it)
  gravity: -9.81,

  // ---- THE FORCE: magnitude of the impulse applied to the clicked block (mass*velocity units) ----
  impulseMagnitude: 3.0,
  impulseElevationDeg: 0,    // 0 = purely horizontal, "away from camera"; positive tilts upward
  holdMs: 0,                 // mouse must be held this long before the impulse fires (0 = any click fires at once; the experiment uses 500)

  // A block is cleared once its centre is below this height (platform top is y = 0).
  clearY: -1.5,
  // Cleared bodies are deleted from the physics world below this height.
  removeY: -12,

  // Ready-for-next-action criteria
  settle: { linSpeed: 0.06, angSpeed: 0.15, seconds: 0.6, maxWaitSeconds: 12 },

  platform: {
    size: [4.4, 0.6, 3.2],     // full extents x, y, z; top surface sits at y = 0
    center: [0, 0, -0.45],    // x, z of the platform centre
    friction: 0.4,
    restitution: 0.0,
    color: 0xb9bcc2,
  },

  camera: { position: [7.5, 6.2, 10.5], target: [0, 1.3, -0.45], fov: 29 },
  background: 0xe9eaec,
};
