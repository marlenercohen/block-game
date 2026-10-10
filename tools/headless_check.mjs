import { initPhysics, Simulation } from '../src/physics.js';
import { TOWERS } from '../src/towers.js';
import { CONFIG } from '../src/config.js';
await initPhysics();
const dir = { x: -7.5, y: 0, z: -10.5 }; const n = Math.hypot(dir.x, dir.z); dir.x /= n; dir.z /= n;
function stab(t) {
  const sim = new Simulation(t); const p0 = sim.blocks.map(b => ({ ...b.body.translation() }));
  for (let i = 0; i < 120 * 6; i++) sim.step();
  let d = 0; sim.blocks.forEach((b, i) => { const p = b.body.translation(); d = Math.max(d, Math.hypot(p.x - p0[i].x, p.y - p0[i].y, p.z - p0[i].z)); });
  return d;
}
function hit(t, bi, fy, mag, fx = 0) { // hit block bi's front face (+z side) at fraction fy of height
  const sim = new Simulation(t); const b = sim.blocks[bi]; const p = b.body.translation();
  const pt = { x: p.x + fx * b.size[0], y: p.y + (fy - 0.5) * b.size[1], z: p.z + b.size[2] / 2 };
  sim.applyImpulseAtPoint(b, pt, dir, mag);
  for (let i = 0; i < 120 * 10; i++) sim.step();
  return { rem: sim.remaining };
}
const mode = process.argv[2];
TOWERS.forEach((t, i) => console.log(t.name, 'drift', stab(t).toFixed(5)));
if (mode === 'hit') for (const [ti, bi, fy = 0.5, fx = 0] of JSON.parse(process.argv[3])) for (const m of [1.6, 2.5, 3.5]) {
  const r = hit(TOWERS[ti], bi, fy, m, fx); console.log("T", ti + 1, "blk", bi, "fy", fy, "fx", fx, 'mag', m, 'remaining', r.rem, '/', TOWERS[ti].blocks.length);
}
