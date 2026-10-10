// Same action in each playground scene on both sides. usage: node tools/playground_probe.mjs
import { initPhysics, Simulation } from '../src/physics.js';
import { PLAYGROUND } from '../src/towers.js';
import { compressions } from '../src/softbody.js';
await initPhysics();
const dir = { x: -0.5714, y: 0, z: -0.8207 };
const pos = b => b.removed ? 'gone' : (t => `(${t.x.toFixed(2)},${t.y.toFixed(2)},${t.z.toFixed(2)})`)(b.body.translation());
function strike(sc, bi, fy, fx = 0) { const sim = new Simulation(sc); const b = sim.blocks[bi], p = b.body.translation();
  const start = sim.blocks.map(pos);
  sim.applyImpulseAtPoint(b, { x: p.x + fx * b.size[0], y: p.y + (fy - 0.5) * b.size[1], z: p.z + b.size[2] / 2 }, dir, sc.impulse);
  let peakV = 0, peakW = 0, minScaleY = 9;
  for (let i = 0; i < 480; i++) { sim.step(); if (b.removed) continue; const v = b.body.linvel(), w = b.body.angvel(); peakV = Math.max(peakV, Math.hypot(v.x, v.y, v.z)); peakW = Math.max(peakW, Math.hypot(w.x, w.y, w.z)); }
  return { sim, start, peakV, peakW }; }
// A
let r = strike(PLAYGROUND[0], 0, 0.5); let g = strike(PLAYGROUND[0], 1, 0.5);
console.log('A blue:', r.start[0], '->', pos(r.sim.blocks[0]), 'peak v', r.peakV.toFixed(2), 'peak w', r.peakW.toFixed(2));
console.log('A gray:', g.start[1], '->', pos(g.sim.blocks[1]), 'peak v', g.peakV.toFixed(2), 'peak w', g.peakW.toFixed(2));
// A with high strike (topple)
r = strike(PLAYGROUND[0], 0, 0.9); g = strike(PLAYGROUND[0], 1, 0.9);
console.log('A high strike blue:', pos(r.sim.blocks[0]), 'w', r.peakW.toFixed(1), ' gray:', pos(g.sim.blocks[1]), 'w', g.peakW.toFixed(1));
// B
let s = new Simulation(PLAYGROUND[1]); console.log('B rest heights: blue base y', s.blocks[0].body.translation().y.toFixed(2), 'pink base y', s.blocks[1].body.translation().y.toFixed(2), 'pink strain', [0,1,2].map(a => { const c = compressions(s.blocks[1].soft); return ((c[2*a]+c[2*a+1])/s.blocks[1].size[a]).toFixed(2) }).join(','));
// C: strike the base (block 0 vs 1) at same relative location, several heights
for (const fy of [0.3, 0.7]) { const a = strike(PLAYGROUND[2], 0, fy), b = strike(PLAYGROUND[2], 1, fy);
  console.log(`C base strike fy=${fy}: blue-side base ${a.start[0]}->${pos(a.sim.blocks[0])} top ${a.start[2]}->${pos(a.sim.blocks[2])} | pink-side base ${b.start[1]}->${pos(b.sim.blocks[1])} top ${b.start[3]}->${pos(b.sim.blocks[3])}`); }
