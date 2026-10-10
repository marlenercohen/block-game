// Does a freshly loaded soft tower stay perfectly still (no creep after the hidden pre-settle)?
import { initPhysics, Simulation } from '../src/physics.js';
import { TOWERS } from '../src/towers.js';
import { compressions } from '../src/softbody.js';
await initPhysics();
for (const ti of [5, 6, 7, 9]) { const t0 = Date.now(); const sim = new Simulation(TOWERS[ti]); const ms = Date.now() - t0;
  const snap = () => sim.blocks.map(b => b.soft ? compressions(b.soft) : []).flat().concat(sim.blocks.flatMap(b => Object.values(b.body.translation())));
  const a = snap(); for (let i = 0; i < 600; i++) sim.step(); const c = snap();
  console.log(TOWERS[ti].name, 'build ms', ms, 'max change over 5 s', Math.max(...a.map((v, i) => Math.abs(v - c[i]))).toExponential(2)); }
