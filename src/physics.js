// Physics layer: wraps Rapier. No rendering / DOM code here so it can be run headless.
import RAPIER from '@dimforge/rapier3d-compat';
import { CONFIG } from './config.js';
import { resolveMaterial } from './materials.js';
import { BEHAVIORS } from './behaviors.js';
import { createSoftBlock, compressions, updateBulge, Quat } from './softbody.js';

export async function initPhysics() { await RAPIER.init(); }

function eulerDegToQuat([x, y, z]) { // XYZ order, same as three.js
  const r = Math.PI / 360;
  const c1 = Math.cos(x * r), c2 = Math.cos(y * r), c3 = Math.cos(z * r);
  const s1 = Math.sin(x * r), s2 = Math.sin(y * r), s3 = Math.sin(z * r);
  return {
    x: s1 * c2 * c3 + c1 * s2 * s3, y: c1 * s2 * c3 - s1 * c2 * s3,
    z: c1 * c2 * s3 + s1 * s2 * c3, w: c1 * c2 * c3 - s1 * s2 * s3,
  };
}

export class Simulation {
  /** A fresh world is built for every tower load/reset, so resets are exactly repeatable. */
  constructor(tower) {
    this.world = new RAPIER.World({ x: 0, y: CONFIG.gravity, z: 0 });
    this.world.timestep = CONFIG.fixedDt;
    this.world.numSolverIterations = 8;
    this.world.integrationParameters.contact_natural_frequency = 60; // stiffer contacts => less stack sag
    this.time = 0;
    this.events = new RAPIER.EventQueue(false);   // (a queue must be passed for physics hooks to run)
    this.pulses = [];                       // in-flight force pulses delivered to soft blocks
    this.softOf = new Map();                // rigid-body handle -> soft block id (parts of one soft block never collide)
    this.hooks = {
      filterContactPair: (c1, c2, b1, b2) => {
        const a = this.softOf.get(b1);
        return a !== undefined && a === this.softOf.get(b2) ? 0 : RAPIER.SolverFlags.COMPUTE_IMPULSE;
      },
      filterIntersectionPair: () => true,
    };

    const plat = tower.platform ?? CONFIG.platform;
    const [pw, ph, pd] = plat.size;
    const pb = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(plat.center[0], -ph / 2, plat.center[1]));
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(pw / 2, ph / 2, pd / 2)
        .setFriction(CONFIG.platform.friction).setRestitution(CONFIG.platform.restitution), pb);

    this.blocks = tower.blocks.map((spec, id) => {
      const props = resolveMaterial(spec);
      const q = eulerDegToQuat(spec.rot ?? [0, 0, 0]);
      const [sx, sy, sz] = spec.size;
      if (props.kind === 'soft') {
        const soft = createSoftBlock(this.world, spec, props, q, id, this.softOf);
        return { id, spec, props, size: spec.size, body: soft.core, soft, bodies: [soft.core, ...soft.plates.map(p => p.body)],
                 mass: soft.M, cleared: false, removed: false };
      }
      const body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(...spec.pos).setRotation(q)
          .setCanSleep(true)
          .setCcdEnabled(true));
      const collider = this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(sx / 2, sy / 2, sz / 2)
          .setDensity(props.density).setFriction(props.friction).setRestitution(props.restitution), body);
      return { id, spec, props, size: spec.size, body, collider, soft: null, bodies: [body], mass: body.mass(), cleared: false, removed: false };
    });
    this._preSettle();
  }

  /**
   * Hidden warm-up: let the freshly built tower settle under gravity (a few mm of contact compression),
   * then freeze it asleep. The player therefore only ever sees a perfectly stationary tower, and every
   * reset reproduces exactly the same settled state.
   */
  _preSettle() {
    const anySoft = this.softOf.size > 0;
    let calm = 0;
    for (let i = 0; i < 120 * 12 && calm < (anySoft ? 120 : 1); i++) {
      this._worldStep();
      // soft towers creep slowly (viscous springs), so wait until everything is genuinely still, not just asleep
      const still = !anySoft ? this.blocks.every(b => b.bodies.every(x => x.isSleeping())) : this.blocks.every(b => b.bodies.every(x => x.isSleeping() || (Math.hypot(...Object.values(x.linvel())) < 2e-4 && Math.hypot(...Object.values(x.angvel())) < 2e-3)));
      calm = still ? calm + 1 : 0;
    }
    for (const b of this.blocks) for (const x of b.bodies) {
      x.setLinvel({ x: 0, y: 0, z: 0 }, false); x.setAngvel({ x: 0, y: 0, z: 0 }, false); x.sleep();
    }
    this.time = 0;
  }

  /**
   * One fixed step. All-rigid towers: a single world step exactly as in the original game. Towers with soft blocks: the
   * step is split into CONFIG.softSubsteps sub-steps so the stiff/viscous skin springs stay stable; strike pulses are
   * delivered per sub-step.
   */
  _worldStep() {
    if (!this.softOf.size) { this.world.step(); return; }
    const n = CONFIG.softSubsteps;
    this.world.timestep = CONFIG.fixedDt / n;
    for (const b of this.blocks) if (b.soft && !b.removed) updateBulge(b.soft);
    for (let i = 0; i < n; i++) { this._deliverPulses(); this.world.step(this.events, this.hooks); }
    this.world.timestep = CONFIG.fixedDt;
  }

  step() {
    this._worldStep();
    this.time += CONFIG.fixedDt;
    for (const b of this.blocks) {
      if (b.removed) continue;
      const y = b.body.translation().y;
      if (!b.cleared && y < CONFIG.clearY) b.cleared = true;
      if (y < CONFIG.removeY) { for (const x of b.bodies) this.world.removeRigidBody(x); b.removed = true; }
    }
  }

  get remaining() { return this.blocks.filter(b => !b.cleared).length; }

  /** True when all not-yet-cleared blocks are (nearly) motionless. */
  isAtRest() {
    const { linSpeed, angSpeed } = CONFIG.settle;
    for (const b of this.blocks) {
      if (b.cleared || b.removed) continue;
      for (const x of b.bodies) {
        if (x.isSleeping()) continue;
        const v = x.linvel(), w = x.angvel();
        if (Math.hypot(v.x, v.y, v.z) > linSpeed || Math.hypot(w.x, w.y, w.z) > angSpeed) return false;
      }
    }
    return true;
  }

  /**
   * Apply the player's impulse at a world-space point (NOT the centre of mass).
   * Rigid blocks get an instantaneous impulse. Soft blocks dissipate part of the strike in their surface
   * (material.soft.strikeAbsorption) and receive the rest as a short force pulse on the struck skin plate,
   * so it reaches the core only through the plate's spring-damper.
   */
  applyImpulseAtPoint(block, point, dir, magnitude) {
    if (block.soft) this._startPulse(block, point, dir, magnitude);
    else block.body.applyImpulseAtPoint({ x: dir.x * magnitude, y: dir.y * magnitude, z: dir.z * magnitude }, point, true);
    const beh = block.props.behavior && BEHAVIORS[block.props.behavior];
    if (beh?.onActivated) beh.onActivated(block, this);
  }

  _startPulse(block, point, dir, magnitude) {
    const S = block.props.soft, soft = block.soft;
    const c = soft.core.translation(), q = new Quat(soft.core.rotation());
    const u = q.applyInv([point.x - c.x, point.y - c.y, point.z - c.z]);
    // which face was struck: the one the point is closest to
    let best = 0, bf = -1;
    for (let a = 0; a < 3; a++) { const f = Math.abs(u[a]) / (block.size[a] / 2); if (f > bf) { bf = f; best = a; } }
    const plate = soft.plates[best * 2 + (u[best] > 0 ? 1 : 0)];
    const pc = plate.body.translation(), pq = new Quat(plate.body.rotation());
    const local = pq.applyInv([point.x - pc.x, point.y - pc.y, point.z - pc.z]);
    const nSub = S.strikeSteps * CONFIG.softSubsteps;
    const J = magnitude * (1 - S.strikeAbsorption) / nSub;
    this.pulses.push({ block, plate, local, imp: { x: dir.x * J, y: dir.y * J, z: dir.z * J }, left: nSub });
  }

  _deliverPulses() {                  // called once per physics sub-step
    if (!this.pulses.length) return;
    this.pulses = this.pulses.filter(p => !p.block.removed);
    for (const p of this.pulses) {
      const t = p.plate.body.translation(), q = new Quat(p.plate.body.rotation());
      const w = q.apply(p.local);
      p.plate.body.applyImpulseAtPoint(p.imp, { x: t.x + w[0], y: t.y + w[1], z: t.z + w[2] }, true);
      p.left--;
    }
    this.pulses = this.pulses.filter(p => p.left > 0);
  }

  /** Per-face compression of a soft block (world units, 6 entries axis*2+side), or null for rigid blocks. */
  compression(block) { return block.soft && !block.removed ? compressions(block.soft) : null; }
}
