// Same strike on identical-size blue vs gray block, free-standing: speed after the hit.
import { initPhysics, Simulation } from '../src/physics.js';
await initPhysics();
for (const m of ['blue', 'gray']) {
  const sim = new Simulation({ blocks: [{ size: [0.8, 0.6, 0.6], pos: [0, 0.3, 0], material: m }] });
  const b = sim.blocks[0];
  sim.applyImpulseAtPoint(b, { x: 0, y: 0.3, z: 0.3 }, { x: 0, y: 0, z: -1 }, 3);
  let v = 0;
  for (let i = 0; i < 480 && !b.removed; i++) { sim.step(); if (b.removed) break; v = Math.max(v, -b.body.linvel().z); }
  console.log(m, 'mass', b.mass.toFixed(2), 'peak speed', v.toFixed(2), b.removed ? 'flew off the platform' : 'slid ' + (-b.body.translation().z).toFixed(2));
}
