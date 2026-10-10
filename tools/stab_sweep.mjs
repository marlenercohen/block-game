import { initPhysics, Simulation } from '../src/physics.js';
import { TOWERS, resolveTower } from '../src/towers.js';
import { SOFT } from '../src/materials.js';
await initPhysics();
const dir = { x: -0.5714, y: 0, z: -0.8207 };
function metric() { let worst = 0, flyers = 0, n = 0;
  for (const ti of [5, 6, 7, 9]) { const t = TOWERS[ti];
    t.blocks.forEach((_, bi) => { const sim = new Simulation(t); const b = sim.blocks[bi], p = b.body.translation();
      sim.applyImpulseAtPoint(b, { x: p.x, y: p.y, z: p.z + b.size[2]/2 }, dir, 3);
      let w = 0; for (let i = 0; i < 240; i++) { sim.step(); for (const k of sim.blocks) if (k.soft && !k.removed) { const a = k.body.angvel(); w = Math.max(w, Math.hypot(a.x,a.y,a.z)); } }
      // anything moving faster than 12 u/s after 2 s = launched
      for (const k of sim.blocks) if (!k.removed && Math.hypot(...Object.values(k.body.linvel())) > 12) flyers++;
      worst = Math.max(worst, w); n++; }); }
  return { worstSoftW: +worst.toFixed(1), flyers, n }; }
const configs = JSON.parse(process.argv[2]);
for (const c of configs) { Object.assign(SOFT, c); console.log(JSON.stringify(c), JSON.stringify(metric())); }
