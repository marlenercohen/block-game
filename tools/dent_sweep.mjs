// peak +z dent (fraction of depth), time spent above 50% of the peak, and base travel, for SOFT parameter sets (JSON list arg), scene C pink base
import { initPhysics, Simulation } from '../src/physics.js';
import { PLAYGROUND } from '../src/towers.js';
import { SOFT } from '../src/materials.js';
import { compressions } from '../src/softbody.js';
await initPhysics();
const base = { ...SOFT };
for (const cfg of JSON.parse(process.argv[2])) { Object.assign(SOFT, base, cfg);
  const sc = PLAYGROUND[2]; const sim = new Simulation(sc); const b = sim.blocks[1], t = sim.blocks[3], p = b.body.translation(), t0 = t.body.translation();
  const rest = compressions(b.soft)[5];
  sim.applyImpulseAtPoint(b, { x: p.x, y: p.y - 0.1, z: p.z + b.size[2] / 2 }, { x: -0.5714, y: 0, z: -0.8207 }, sc.impulse);
  const ser = []; let w = 0; for (let i = 0; i < 240; i++) { sim.step(); ser.push((compressions(b.soft)[5] - rest) / b.size[2]); const a = b.body.angvel(); w = Math.max(w, Math.hypot(a.x, a.y, a.z)); }
  const pk = Math.max(...ser), above = ser.filter(v => v > 0.5 * pk).length / 120;
  const q = b.body.translation(), t1 = t.body.translation();
  console.log(JSON.stringify(cfg).padEnd(52), `peak dent ${(pk * 100).toFixed(0)}% of depth, >50% of peak for ${above.toFixed(2)}s, base slid ${Math.hypot(q.x - p.x, q.z - p.z).toFixed(2)}, top tipped dy ${(t1.y - t0.y).toFixed(2)}, wmax ${w.toFixed(1)}`); }
