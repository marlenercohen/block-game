// Compliant ("marshmallow") block built from ordinary Rapier rigid bodies and joints.
//
//   core  : a rigid body holding most of the mass (inner box, inset by the skin thickness)
//   plates: 6 thin slabs, one per face, each attached to the core by a PRISMATIC joint that can slide
//           only along the face normal, limited to [-travel, 0], with a position MOTOR acting as a
//           spring-damper (stiffness k, damping c) pulling it back to its rest position.
//
// Everything that touches a soft block touches a plate, so the plate being pushed in, the spring
// force that transmits load to the core, and the damper that dissipates energy are all solved by the
// same constraint solver as the rest of the world. Compression is therefore *physical*: it changes
// where the surface is, how forces are transmitted, and how much energy is lost. The renderer reads
// the plate displacements back to draw the squashed shape.
//
// Axes: local axis index 0/1/2 = x/y/z, plate index p = axis*2 + (0: -side, 1: +side).
import RAPIER from '@dimforge/rapier3d-compat';
import { SOFT } from './materials.js';
import { CONFIG } from './config.js';

const GAP = 0.0; // plates exactly tile the faces (they are filtered from colliding with their own block)

export function createSoftBlock(world, spec, props, q, id, registry) {
  const S = props.soft ?? SOFT;
  const size = spec.size, pos = spec.pos;
  const volume = size[0] * size[1] * size[2];
  const M = props.density * volume;
  const t = size.map(s => Math.min(S.travelFraction * s, S.maxTravel));   // skin thickness == max travel per axis
  const mPlate = S.skinMassFraction * M;
  const mCore = M - 6 * mPlate;

  const core = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(...pos).setRotation(q).setCanSleep(true).setAdditionalSolverIterations(6));
  // Inner core collider (only ever touched if a plate bottoms out completely).
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(size[0] / 2 - t[0], size[1] / 2 - t[1], size[2] / 2 - t[2])
      .setMass(mCore).setFriction(props.friction).setRestitution(props.restitution)
      .setActiveHooks(RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS), core);

  const rot = new Quat(q);
  const plates = [];
  for (let axis = 0; axis < 3; axis++) for (let side = 0; side < 2; side++) {
    const sgn = side ? 1 : -1;
    const half = [size[0] / 2, size[1] / 2, size[2] / 2];
    const center = [0, 0, 0]; center[axis] = sgn * (half[axis] - t[axis] / 2);
    // Plates must not poke into the face region of a higher-priority axis (y > x > z), otherwise their rigid
    // edges would carry load that belongs to the compliant face plate. Own-block overlaps are filtered out.
    const he = [...half]; he[axis] = t[axis] / 2;
    for (const b of [1, 0, 2]) { if (b === axis) break; he[b] = half[b] - t[b]; }
    const w = rot.apply(center);
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(pos[0] + w[0], pos[1] + w[1], pos[2] + w[2]).setRotation(q)
        .setCanSleep(true).setAdditionalSolverIterations(6));
    const col = world.createCollider(
      RAPIER.ColliderDesc.cuboid(he[0], he[1], he[2])
        .setMass(mPlate).setFriction(props.friction).setRestitution(props.restitution)
        .setActiveHooks(RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS), body);
    // joint: anchor on the core at the plate's rest centre, on the plate at its own origin
    const axisV = [0, 0, 0]; axisV[axis] = sgn;
    const jd = RAPIER.JointData.prismatic({ x: center[0], y: center[1], z: center[2] }, { x: 0, y: 0, z: 0 },
      { x: axisV[0], y: axisV[1], z: axisV[2] });
    jd.limitsEnabled = true; jd.limits = [-t[axis], 0.5 * t[axis]];   // inward = compression, outward = lateral bulge
    const joint = world.createImpulseJoint(jd, core, body, true);
    // spring constant from a modulus: k = E * A / L (A = face area, L = block size along the axis).
    // c is a multiple of critical damping for the plate alone; with softSubsteps it is clamped for solver
    // stability (c*dtSub/m <= 0.6, omega*dtSub <= 0.6).
    const A = (size[0] * size[1] * size[2]) / size[axis];
    const dtSub = CONFIG.fixedDt / CONFIG.softSubsteps;
    const E = S.youngsModulus * (axis === 1 ? 1 : S.lateralFactor);   // softer sideways than vertically (see materials.js)
    const k = Math.min(E * A / size[axis], 0.36 * mPlate / (dtSub * dtSub));
    const c = Math.min(2 * S.dampingRatio * Math.sqrt(k * mPlate), 0.6 * mPlate / dtSub);
    joint.configureMotorModel(RAPIER.MotorModel.ForceBased);   // k, c in real force units (not mass-normalised)
    joint.configureMotorPosition(0, k, c);
    registry.set(body.handle, id);
    plates.push({ body, col, joint, axis, sgn, restCenter: center, t: t[axis], k, c, target: 0 });
  }
  registry.set(core.handle, id);
  return { core, plates, size, t, M, poisson: S.poisson };
}

// --- tiny quaternion helper (physics.js stays free of three.js) ------------------------------
export class Quat {
  constructor(q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; }
  apply([vx, vy, vz]) {                 // rotate vector by this quaternion
    const { x, y, z, w } = this;
    const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx);
    return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)];
  }
  applyInv([vx, vy, vz]) { return new Quat({ x: -this.x, y: -this.y, z: -this.z, w: this.w }).apply([vx, vy, vz]); }
}

/** Signed compression (world units, >0 = pushed in, <0 = bulged out) of each of the 6 faces, indexed axis*2+side. */
export function compressions(soft) {
  const q = new Quat(soft.core.rotation()), c = soft.core.translation();
  return soft.plates.map(p => {
    const pt = p.body.translation();
    const rel = q.applyInv([pt.x - c.x, pt.y - c.y, pt.z - c.z]);
    const off = rel[p.axis] * p.sgn;                        // distance of plate centre from core centre along outward normal
    return p.restCenter[p.axis] * p.sgn - off;
  });
}

/**
 * Lateral bulge (Poisson effect), done in the physics: the motor rest position of each face is moved outward in
 * proportion to the compression strain of the OTHER two axes, so the squashed block really gets wider (and pushes on
 * neighbours / catches things differently), instead of just being drawn wider.
 */
export function updateBulge(soft) {
  const comp = compressions(soft), strain = [0, 1, 2].map(a => (comp[2 * a] + comp[2 * a + 1]) / soft.size[a]);
  for (const p of soft.plates) {
    const o1 = (p.axis + 1) % 3, o2 = (p.axis + 2) % 3;
    const s = Math.max(0, strain[o1]) + Math.max(0, strain[o2]);
    const out = Math.min(soft.poisson * s * soft.size[p.axis] / 2, 0.5 * p.t);
    if (Math.abs(out - p.target) > 1e-4) { p.joint.configureMotorPosition(out, p.k, p.c); p.target = out; }   // (re-configuring wakes bodies, so only when it changed)
  }
}
