// Prints compression / bulge of soft blocks: at rest in each tower, and over time after a strike on tower 10's loaded pink block.
import { initPhysics, Simulation } from '../src/physics.js';
import { TOWERS, resolveTower } from '../src/towers.js';
import { compressions } from '../src/softbody.js';
await initPhysics();
const dir = { x: -0.5714, y: 0, z: -0.8207 };
const strain = b => { const c = compressions(b.soft); return [0,1,2].map(a => ((c[2*a]+c[2*a+1]) / b.size[a]).toFixed(2)).join(','); };
TOWERS.forEach((t, i) => { const sim = new Simulation(resolveTower(t)); if (!sim.blocks.some(b => b.soft)) return;
  console.log(t.name, 'rest strain xyz:', sim.blocks.filter(b => b.soft).map(strain).join('  '), ' y of blocks', sim.blocks.map(b=>b.body.translation().y.toFixed(2)).join(' ')); });
for (const [label, bi, h] of [['strike gray load on pink', 3, 0.5], ['strike pink base', 1, 0.5]]) {
  const sim = new Simulation(TOWERS[9]); const b = sim.blocks[bi], p = b.body.translation();
  sim.applyImpulseAtPoint(b, { x: p.x, y: p.y + (h - 0.5) * b.size[1], z: p.z + b.size[2] / 2 }, dir, 3);
  console.log(label); const pink = sim.blocks[1];
  for (let i = 0; i <= 150; i++) { if (i % 10 === 0 && !pink.removed) console.log(' t=' + (i/120).toFixed(2), 'pink strain', strain(pink), 'wmax', (()=>{const w=pink.body.angvel(); return Math.hypot(w.x,w.y,w.z).toFixed(1)})()); sim.step(); }
}
