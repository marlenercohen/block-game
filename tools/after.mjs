// usage: node tools/after.mjs <towerNo> <blockIndex> [fy] [mag]  -> where every block ends up after one strike
import { initPhysics, Simulation } from '../src/physics.js';
import { TOWERS } from '../src/towers.js';
await initPhysics();
const [tn, bi, fy = 0.5, mag = 3] = process.argv.slice(2).map(Number);
const sim = new Simulation(TOWERS[tn - 1]); const b = sim.blocks[bi], p = b.body.translation();
sim.applyImpulseAtPoint(b, { x: p.x, y: p.y + (fy - 0.5) * b.size[1], z: p.z + b.size[2] / 2 }, { x: -0.5714, y: 0, z: -0.8207 }, mag);
const f = k => k.removed || k.cleared ? 'OFF' : (t => `(${t.x.toFixed(1)},${t.y.toFixed(1)},${t.z.toFixed(1)})`)(k.body.translation());
console.log('start', sim.blocks.map(k => f(k)).join(' '));
for (let i = 0; i < 720; i++) sim.step();
console.log('end  ', sim.blocks.map(k => f(k)).join(' '), ' remaining', sim.remaining);
