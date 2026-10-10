// usage: node tools/scan_outcomes.mjs <magnitude> [towerNumbers...]   (prints blocks cleared per strike: low/high on each block's front face)
import { initPhysics, Simulation } from '../src/physics.js';
import { TOWERS, resolveTower } from '../src/towers.js';
await initPhysics();
const mag = +process.argv[2]; const which = process.argv.slice(3).map(Number);
const dir = { x: -0.5714, y: 0, z: -0.8207 };
TOWERS.forEach((t, ti) => { if (which.length && !which.includes(ti + 1)) return;
  (t.variants ?? [null]).forEach((v, vi) => { const tt = resolveTower(t, vi); const res = [];
    tt.blocks.forEach((_, bi) => { const row = [];
      for (const fy of [0.25, 0.75]) { const sim = new Simulation(tt); const b = sim.blocks[bi]; const p = b.body.translation();
        sim.applyImpulseAtPoint(b, { x: p.x, y: p.y + (fy - 0.5) * b.size[1], z: p.z + b.size[2] / 2 }, dir, mag);
        for (let i = 0; i < 1800; i++) sim.step(); row.push(tt.blocks.length - sim.remaining); }
      res.push(row.join('/')); });
    console.log(t.name, v ? `[${v.name}]` : '', 'cleared per block:', res.join('  ')); }); });
