// Does the soft-body spring system pull the block back toward a world position? Zero gravity, block floating, one strike;
// then follow the centre of mass: it should coast at constant velocity (momentum conserved) while the shape recovers.
import { initPhysics, Simulation } from '../src/physics.js';
import { CONFIG } from '../src/config.js';
import { compressions } from '../src/softbody.js';
await initPhysics();
CONFIG.gravity = 0;
for (const size of [[0.8, 0.8, 0.8], [1.4, 0.9, 1.0]]) {
  const sim = new Simulation({ platform: { size: [40, 0.6, 40], center: [0, 0], color: 0 }, blocks: [{ size, pos: [0, 5, 0], material: 'pink' }] });
  const b = sim.blocks[0], soft = b.soft;
  const M = soft.core.mass() + soft.plates.reduce((s, p) => s + p.body.mass(), 0);
  const com = () => { let x = 0, y = 0, z = 0; for (const body of b.bodies) { const t = body.translation(), m = body.mass(); x += t.x * m; y += t.y * m; z += t.z * m; } return [x / M, y / M, z / M]; };
  const mom = () => { let x = 0, z = 0; for (const body of b.bodies) { const v = body.linvel(), m = body.mass(); x += v.x * m; z += v.z * m; } return Math.hypot(x, z); };
  const p = soft.core.translation(); const J = CONFIG.impulseMagnitude * (1 - b.props.soft.strikeAbsorption);
  sim.applyImpulseAtPoint(b, { x: p.x, y: p.y, z: p.z + size[2] / 2 }, { x: -0.5714, y: 0, z: -0.8207 }, CONFIG.impulseMagnitude);
  console.log(`size [${size}]  total mass ${M.toFixed(3)}  expected momentum after absorption ${J.toFixed(2)}  -> expected COM speed ${(J / M).toFixed(2)}`);
  let c0 = com();
  for (let i = 1; i <= 360; i++) { sim.step(); if ([6, 12, 24, 60, 120, 240, 360].includes(i)) { const c = com(); const comp = compressions(soft); console.log(`  t=${(i / 120).toFixed(2)}s  momentum ${mom().toFixed(3)}  COM travelled ${Math.hypot(c[0] - c0[0], c[2] - c0[2]).toFixed(3)}  max|face compression| ${Math.max(...comp.map(Math.abs)).toFixed(3)}`); } }
}
