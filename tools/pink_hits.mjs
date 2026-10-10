// How many well-placed hits does it take to remove a single block from an otherwise empty platform?
// usage: node tools/pink_hits.mjs '[{"label":"...", "material":"pink", "soft":{...SOFT overrides}, "friction":0.7}, ...]' [sizeJSON]
import { initPhysics, Simulation } from '../src/physics.js';
import { MATERIALS, SOFT } from '../src/materials.js';
import { CONFIG } from '../src/config.js';
await initPhysics();
const dir = { x: -0.5714, y: 0, z: -0.8207 };
const base = { soft: { ...SOFT }, pinkFriction: MATERIALS.pink.friction };
const sizes = process.argv[3] ? JSON.parse(process.argv[3]) : [[0.8, 0.8, 0.8], [1.0, 0.7, 0.8], [1.4, 0.9, 1.0]];
const starts = [[0, -0.6], [0.9, 0.1], [-0.6, -0.9]];     // centre-ish, front-right, back-left of the platform
function run(size, start, mat) {
  const sim = new Simulation({ blocks: [{ size, pos: [start[0], size[1] / 2, start[1]], material: mat }] }); const b = sim.blocks[0];
  let hits = 0, firstMove = 0, maxCompress = 0;
  for (; hits < 12 && !b.cleared; hits++) {
    const p = b.body.translation(), p0 = { ...p };
    // aim at the middle of whichever of the two camera-facing faces (+z) ; a human would pick the face centre
    sim.applyImpulseAtPoint(b, { x: p.x, y: p.y, z: p.z + size[2] / 2 }, dir, CONFIG.impulseMagnitude);
    let rest = 0; for (let i = 0; i < 120 * 6 && !b.cleared; i++) { sim.step(); rest = sim.isAtRest() ? rest + 1 / 120 : 0; if (rest >= 0.3) break; }
    if (hits === 0 && !b.cleared) { const q = b.body.translation(); firstMove = Math.hypot(q.x - p0.x, q.z - p0.z); }
    if (b.cleared) { hits++; break; }
  }
  return { hits: b.cleared ? hits : '>12', firstMove };
}
for (const cfg of JSON.parse(process.argv[2])) {
  Object.assign(SOFT, base.soft, cfg.soft ?? {}); MATERIALS.pink.friction = cfg.friction ?? base.pinkFriction;
  const out = [];
  for (const size of sizes) { const row = []; for (const st of starts) { const r = run(size, st, cfg.material ?? 'pink'); row.push(`${r.hits}h/${r.firstMove.toFixed(2)}m`); } out.push(`[${size}]: ${row.join('  ')}`); }
  console.log(`${cfg.label.padEnd(34)} ${out.join(' | ')}`);
}
