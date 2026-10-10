// usage: node tools/dent_series.mjs  -> per-face compression (as fraction of block dimension) of the pink base in playground scene C right after the strike
import { initPhysics, Simulation } from '../src/physics.js';
import { PLAYGROUND } from '../src/towers.js';
import { compressions } from '../src/softbody.js';
await initPhysics();
const sc = PLAYGROUND[2]; const sim = new Simulation(sc); const b = sim.blocks[1], p = b.body.translation();
const rest = compressions(b.soft); const f = c => c.map((v, i) => ((v) / b.size[Math.floor(i / 2)]).toFixed(2)).join(' ');
console.log('face order: -x +x -y +y -z +z (fraction of dimension; + = pushed in, - = bulged out)');
console.log('rest      ', f(rest));
sim.applyImpulseAtPoint(b, { x: p.x, y: p.y - 0.1, z: p.z + b.size[2] / 2 }, { x: -0.5714, y: 0, z: -0.8207 }, sc.impulse);
for (let i = 1; i <= 60; i++) { sim.step(); if (i % 4 === 0 || i < 4) console.log('t=' + (i / 120).toFixed(3), f(compressions(b.soft))); }
