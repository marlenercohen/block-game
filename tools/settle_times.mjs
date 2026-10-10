// How long does "ready for next click" take after a strike? (same rule as main.js: all non-cleared bodies below speed thresholds for 0.6 s)
import { initPhysics, Simulation } from '../src/physics.js';
import { TOWERS } from '../src/towers.js';
import { CONFIG } from '../src/config.js';
await initPhysics();
const dir = { x: -0.5714, y: 0, z: -0.8207 }; const rows = [];
TOWERS.forEach((t, ti) => { const times = []; let softT = 0;
  t.blocks.forEach((_, bi) => { const sim = new Simulation(t); const b = sim.blocks[bi], p = b.body.translation();
    sim.applyImpulseAtPoint(b, { x: p.x, y: p.y, z: p.z + b.size[2] / 2 }, dir, 3);
    let rest = 0, T = null, tFirstSlow = null;
    for (let i = 0; i < 120 * 14; i++) { sim.step(); rest = sim.isAtRest() ? rest + CONFIG.fixedDt : 0; if (rest >= CONFIG.settle.seconds) { T = (i + 1) * CONFIG.fixedDt; break; } }
    times.push(T ?? 14); });
  times.sort((a, b) => a - b); const med = times[Math.floor(times.length / 2)];
  rows.push(`Tower ${String(ti + 1).padStart(2)}  median ${med.toFixed(1)}s  max ${times[times.length - 1].toFixed(1)}s  (of which the fixed 0.6 s confirmation window is included)`); });
console.log(rows.join('\n'));
