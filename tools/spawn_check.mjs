// Does every scene survive its hidden pre-settle (blocks end up where the tower data put them)?
import { initPhysics, Simulation } from '../src/physics.js';
import { TOWERS, PLAYGROUND, resolveTower } from '../src/towers.js';
await initPhysics();
for (const [set, list] of [['tower', TOWERS], ['playground', PLAYGROUND]]) list.forEach((t, ti) => (t.variants ?? [null]).forEach((v, vi) => {
  const tt = resolveTower(t, vi); const sim = new Simulation(tt);
  let worst = 0, wi = -1, tilt = 0; sim.blocks.forEach((b, i) => { const p = b.body.translation(), s = tt.blocks[i].pos;
    const horiz = Math.hypot(p.x - s[0], p.z - s[2]); const vert = s[1] - p.y; // sag allowed only for soft blocks / things resting on them
    const d = Math.max(horiz, 0); if (d > worst) { worst = d; wi = i; } });
  console.log(`${set} ${ti + 1}${v ? ' [' + v.name + ']' : ''}`.padEnd(40), 'max horizontal shift during pre-settle', worst.toFixed(2), worst > 0.15 ? `<-- block ${wi} moved: structure not stable` : 'ok'); }));
