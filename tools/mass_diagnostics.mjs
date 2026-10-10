// Diagnostics: do heavy (gray) blocks really behave differently from ordinary (blue) blocks of identical size?
import { initPhysics, Simulation } from '../src/physics.js';
import { MATERIALS } from '../src/materials.js';
await initPhysics();
const WIDE = { size: [40, 0.6, 40], center: [0, 0], color: 0 };      // wide enough that nothing falls off
const dir = { x: -0.5714, y: 0, z: -0.8207 };
const size = [0.8, 0.6, 0.6];
console.log(`gray/blue density ratio in MATERIALS: ${MATERIALS.gray.density / MATERIALS.blue.density}`);
console.log('\n1. mass & inertia of identical 0.8x0.6x0.6 blocks');
for (const m of ['blue', 'gray']) { const s = new Simulation({ platform: WIDE, blocks: [{ size, pos: [0, 0.3, 0], material: m }] }); const b = s.blocks[0].body;
  const I = b.principalInertia(); console.log(' ', m.padEnd(5), 'mass', b.mass().toFixed(3), 'principal inertia', [I.x, I.y, I.z].map(v => v.toFixed(4)).join(', ')); }
console.log('\n2. same impulse J applied at the face centre, height fraction 0.5 (platform is wide: nothing leaves it)');
console.log('   J     material  peak speed  sliding distance  peak |angvel|');
for (const J of [0.5, 1.0, 2.0, 3.0]) for (const m of ['blue', 'gray']) {
  const s = new Simulation({ platform: WIDE, blocks: [{ size, pos: [0, 0.3, 0], material: m }] }); const b = s.blocks[0]; const p = b.body.translation();
  s.applyImpulseAtPoint(b, { x: p.x, y: p.y, z: p.z + size[2] / 2 }, dir, J);
  let v = 0, w = 0; for (let i = 0; i < 1200; i++) { s.step(); const lv = b.body.linvel(), av = b.body.angvel(); v = Math.max(v, Math.hypot(lv.x, lv.z)); w = Math.max(w, Math.hypot(av.x, av.y, av.z)); }
  const q = b.body.translation(); console.log(`   ${J.toFixed(1)}   ${m.padEnd(8)}  ${v.toFixed(2).padStart(6)}      ${Math.hypot(q.x - p.x, q.z - p.z).toFixed(2).padStart(6)}            ${w.toFixed(2)}`); }
console.log('\n3. collision: a striker slides at the SAME speed (2.0) into a resting blue block (identical size) - effect of mass on what it does to others');
for (const m of ['blue', 'gray']) {
  const s = new Simulation({ platform: WIDE, blocks: [{ size, pos: [0, 0.3, 1.0], material: m }, { size, pos: [0, 0.3, 0.0], material: 'blue' }] });
  const [A, T] = s.blocks; A.body.setLinvel({ x: 0, y: 0, z: -2 }, true);
  const t0 = T.body.translation(); let tv = 0;
  for (let i = 0; i < 1200; i++) { s.step(); const lv = T.body.linvel(); tv = Math.max(tv, Math.hypot(lv.x, lv.z)); }
  const t1 = T.body.translation(); console.log(`   striker ${m.padEnd(5)} (mass ${A.body.mass().toFixed(2)}): target peak speed ${tv.toFixed(2)}, target pushed ${Math.hypot(t1.x - t0.x, t1.z - t0.z).toFixed(2)}`); }
console.log('\n4. falling impact: a 0.5 cube dropped from 1.5 high onto the top edge of a tall standing blue block (0.4x1.2x0.4)');
for (const m of ['blue', 'gray']) {
  const s = new Simulation({ platform: WIDE, blocks: [{ size: [0.4, 1.2, 0.4], pos: [0, 0.6, 0], material: 'blue' }, { size: [0.5, 0.5, 0.5], pos: [0.28, 2.1, 0.0], material: m }] });
  const [T, D] = s.blocks; const t0 = T.body.translation();
  for (let i = 0; i < 600; i++) s.step();
  const t1 = T.body.translation(); console.log(`   dropped ${m.padEnd(5)} (mass ${D.body.mass().toFixed(2)}): standing block pushed ${Math.hypot(t1.x - t0.x, t1.z - t0.z).toFixed(2)}, centre height ${t1.y.toFixed(2)} (0.60 = still standing)`); }
