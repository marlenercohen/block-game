import { initPhysics, Simulation } from '../src/physics.js';
import { TOWERS } from '../src/towers.js';
import { SOFT } from '../src/materials.js';
import { compressions } from '../src/softbody.js';
await initPhysics();
for (const c of JSON.parse(process.argv[2])) { Object.assign(SOFT, c);
  const sim = new Simulation(TOWERS[9]); const b = sim.blocks[1], p = b.body.translation(); const rest = compressions(b.soft);
  sim.applyImpulseAtPoint(b, { x: p.x, y: p.y, z: p.z + 0.5 }, { x: -0.5714, y: 0, z: -0.8207 }, 3);
  let peak = 0, tpeak = 0, tback = null, w = 0; const fz = [];
  for (let i = 0; i <= 240; i++) { const cc = compressions(b.soft); const d = (cc[5] - rest[5]) / 1.0, dx = (cc[3 - 1 + 0] ); // +z face
    const dent = Math.max(cc[5] - rest[5], cc[1] - rest[1]) ; if (dent > peak) { peak = dent; tpeak = i/120; }
    if (peak > 0.05 && tback === null && dent < peak * 0.2) tback = i/120;
    const a = b.body.angvel(); w = Math.max(w, Math.hypot(a.x,a.y,a.z)); if (i % 20 === 0) fz.push(dent.toFixed(2)); sim.step(); }
  console.log(JSON.stringify(c), 'peak dent', peak.toFixed(2), '(of 1.0 dim) at', tpeak.toFixed(2), 's; recovered by', tback, 'wmax', w.toFixed(1), 'dent series', fz.join(' ')); }
