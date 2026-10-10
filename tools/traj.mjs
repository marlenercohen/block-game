import { initPhysics, Simulation } from '../src/physics.js';
import { TOWERS, resolveTower } from '../src/towers.js';
await initPhysics();
const [ti, vi, bi] = process.argv.slice(2).map(Number); const sim = new Simulation(resolveTower(TOWERS[ti], vi));
const b = sim.blocks[bi], p = b.body.translation(); sim.applyImpulseAtPoint(b, { x: p.x, y: p.y, z: p.z + b.size[2]/2 }, { x: -0.5714, y: 0, z: -0.8207 }, 3);
for (let i = 0; i <= 360; i++) { if (i % 30 === 0) console.log((i/120).toFixed(2), sim.blocks.map(k => k.removed ? 'gone' : (t => `${t.x.toFixed(1)},${t.y.toFixed(1)},${t.z.toFixed(1)}`)(k.body.translation()) + (k.soft ? `w${(w=>Math.hypot(w.x,w.y,w.z).toFixed(0))(k.body.angvel())}` : '')).join(' | ')); sim.step(); }
