import { initPhysics, Simulation } from '../src/physics.js';
await initPhysics();
const dir = { x: -0.5714, y: 0, z: -0.8207 };
const PL = { size: [7.2, 0.6, 4.6], center: [0, -0.5] };
for (const base of [[1.0, 0.7, 0.8], [0.9, 0.6, 0.7]]) for (const top of [[0.5, 1.0, 0.5], [0.7, 0.6, 0.6], [0.6, 1.3, 0.6]]) for (const J of [1.5, 2.5, 3.5]) {
  const out = [];
  for (const mat of ['blue', 'pink']) {
    const hb = base[1] / 2;
    const sc = { platform: PL, blocks: [{ size: base, pos: [0, hb, -0.3], material: mat }, { size: top, pos: [0, base[1] + top[1] / 2, -0.3] }] };
    const sim = new Simulation(sc); const b = sim.blocks[0], t = sim.blocks[1]; const p = b.body.translation(), t0 = t.body.translation();
    sim.applyImpulseAtPoint(b, { x: p.x, y: p.y, z: p.z + base[2] / 2 }, dir, J);
    for (let i = 0; i < 600; i++) sim.step();
    const t1 = t.body.translation(); const q = t.body.rotation(); const tilt = 2 * Math.acos(Math.min(1, Math.abs(q.w))) * 180 / Math.PI;
    out.push(`${mat}: top moved ${Math.hypot(t1.x - t0.x, t1.z - t0.z).toFixed(2)} dy ${(t1.y - t0.y).toFixed(2)} tilt ${tilt.toFixed(0)}deg, base moved ${Math.hypot(b.body.translation().x - p.x, b.body.translation().z - p.z).toFixed(2)}`);
  }
  console.log(`base ${base} top ${top} J=${J} | ${out.join(' | ')}`);
}
