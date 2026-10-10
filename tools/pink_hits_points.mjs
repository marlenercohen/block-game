// Hits needed to clear a lone block for many different click points (+z face and +x face, various heights/offsets), 3 start positions.
import { initPhysics, Simulation } from '../src/physics.js';
import { CONFIG } from '../src/config.js';
await initPhysics();
const dir = { x: -0.5714, y: 0, z: -0.8207 };
const starts = [[0, -0.6], [0.9, 0.1], [-0.6, -0.9], [0.5, -1.2]];
const sizes = [[0.8, 0.8, 0.8], [1.4, 0.9, 1.0], [0.7, 0.6, 0.6]];
const clicks = [['z', 0.5, 0], ['z', 0.2, 0], ['z', 0.85, 0], ['z', 0.5, 0.35], ['x', 0.5, 0], ['x', 0.2, 0], ['x', 0.85, 0]];
function run(mat, size, st, [face, fy, off]) {
  const sim = new Simulation({ blocks: [{ size, pos: [st[0], size[1] / 2, st[1]], material: mat }] }); const b = sim.blocks[0]; let hits = 0;
  while (hits < 15 && !b.cleared) { const p = b.body.translation(); const pt = face === 'z' ? { x: p.x + off * size[0], y: p.y + (fy - 0.5) * size[1], z: p.z + size[2] / 2 } : { x: p.x + size[0] / 2, y: p.y + (fy - 0.5) * size[1], z: p.z + off * size[2] };
    sim.applyImpulseAtPoint(b, pt, dir, CONFIG.impulseMagnitude); hits++; let rest = 0; for (let i = 0; i < 120 * 6 && !b.cleared; i++) { sim.step(); rest = sim.isAtRest() ? rest + 1 / 120 : 0; if (rest >= 0.3) break; } }
  return b.cleared ? hits : 99; }
for (const mat of ['blue', 'pink']) { const all = []; for (const size of sizes) for (const st of starts) for (const c of clicks) all.push(run(mat, size, st, c));
  all.sort((a, b) => a - b); console.log(`${mat}: ${all.length} cases, hits needed: median ${all[Math.floor(all.length / 2)]}, 90th pct ${all[Math.floor(all.length * 0.9)]}, worst ${all[all.length - 1] === 99 ? '>15' : all[all.length - 1]}, share needing >=5 hits ${(100 * all.filter(v => v >= 5).length / all.length).toFixed(0)}%`); }
