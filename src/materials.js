// Central material table. Colour <-> physical properties is a fixed mapping used by every tower.
// Blocks reference a material by name (`material: 'gray'`); per-block overrides are still allowed
// (color, density, friction, restitution) for experiments, but towers should normally not use them.
//
// kind: 'rigid' -> single rigid body.
// kind: 'soft'  -> compliant compound body (rigid core + 6 spring-damper skin plates), see softbody.js.

// ---- the tunable knobs for the demo -----------------------------------------------------------
export const GRAY_DENSITY_RATIO = 8;     // gray density = ratio * blue density
export const PINK_FRICTION = 0.15;       // friction of soft blocks (blue is 0.4; the platform is 0.4 and Rapier averages the pair). Lower = slides more easily
export const SOFT = {
  youngsModulus: 80,         // stiffness E: each face spring k = E * faceArea / thickness (bigger = stiffer)
  lateralFactor: 0.2,        // stiffness of the side (x/z) faces relative to the vertical (y) faces: squashes more when pushed sideways than when loaded from above
  dampingRatio: 2.5,         // damping as a multiple of critical (>1 = over-damped: slow, gooey recovery, no wobble)
  skinMassFraction: 0.10,    // each of the 6 skin plates carries this fraction of the block mass
  travelFraction: 0.3,       // max compression of a face, as fraction of block dimension ...
  maxTravel: 0.3,           // ... but never more than this (world units)
  poisson: 0.45,             // lateral bulge: faces of the other axes are pushed out by poisson * compression strain
  strikeAbsorption: 0.25,    // fraction of the player's strike impulse dissipated by the soft surface
  strikeSteps: 12,           // the remaining impulse is delivered as a force pulse over this many (fixed) physics steps
};
// -----------------------------------------------------------------------------------------------

const BLUE_DENSITY = 1.0;

export const MATERIALS = {
  blue: { label: 'Ordinary', kind: 'rigid', color: 0x2f7fe0, density: BLUE_DENSITY, friction: 0.4, restitution: 0.05, behavior: null },
  gray: { label: 'Heavy',    kind: 'rigid', color: 0x4a4e57, density: BLUE_DENSITY * GRAY_DENSITY_RATIO, friction: 0.4, restitution: 0.05, behavior: null },
  pink: { label: 'Soft',     kind: 'soft',  color: 0xf08cb0, density: BLUE_DENSITY, friction: PINK_FRICTION, restitution: 0.0, behavior: null, soft: SOFT },
  // Later: e.g. red: { kind: 'rigid', color: 0xd62828, ..., behavior: 'flyUp' }
};
MATERIALS.default = MATERIALS.blue;   // backwards compatible name (original towers have no material field)

export function resolveMaterial(spec) {
  const name = spec.material ?? 'blue';
  const base = MATERIALS[name];
  if (!base) throw new Error(`Unknown material "${name}"`);
  const out = { ...base, name };
  for (const k of ['color', 'density', 'friction', 'restitution', 'behavior']) {
    if (spec[k] !== undefined) out[k] = spec[k];
  }
  return out;
}
