// Isolated pink block: strike once, report peak dent, how far it slid, and whether the shape recovers while it moves.
import { initPhysics, Simulation } from '../src/physics.js';
import { CONFIG } from '../src/config.js';
import { compressions } from '../src/softbody.js';
await initPhysics();
for (const size of [[0.8, 0.8, 0.8], [1.4, 0.9, 1.0]]) {
  const sim = new Simulation({ blocks: [{ size, pos: [0.3, size[1] / 2, -0.4], material: 'pink' }] }); const b = sim.blocks[0], p = b.body.translation();
  const rest = compressions(b.soft); sim.applyImpulseAtPoint(b, { x: p.x, y: p.y, z: p.z + size[2] / 2 }, { x: -0.5714, y: 0, z: -0.8207 }, CONFIG.impulseMagnitude);
  let peak = 0, tPeak = 0; const dev = c => Math.max(...c.map((v, i) => Math.abs(v - rest[i]) / size[Math.floor(i / 2)]));
  const marks = {}; for (let i = 1; i <= 720 && !b.cleared; i++) { sim.step(); const d = dev(compressions(b.soft)); if (d > peak) { peak = d; tPeak = i / 120; } if ([12, 24, 48, 96].includes(i)) marks[i / 120] = d; }
  const q = b.body.translation(); console.log(`size [${size}] slid ${Math.hypot(q.x - p.x, q.z - p.z).toFixed(2)} (${b.cleared ? 'left the platform' : 'stayed'}); peak face deformation ${(peak * 100).toFixed(0)}% of dimension at ${tPeak.toFixed(2)}s; deformation at 0.1/0.2/0.4/0.8 s: ${Object.values(marks).map(v => (v * 100).toFixed(0) + '%').join(' / ')}`);
}
