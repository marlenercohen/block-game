# Handoff: block physics game

A browser game (Three.js + Rapier + Vite) built as a proof of concept for a neuroscience experiment: monkeys will eventually learn to knock
block towers off a platform by looking at them, and learn that colour predicts material (blue = ordinary, dark gray = heavy, pink = soft).
For now it is a mouse-controlled demo for a lab. Live: https://marlenercohen.github.io/block-game/  Repo: https://github.com/marlenercohen/block-game
(owner: marlenercohen; `main` auto-deploys to GitHub Pages via `.github/workflows/deploy.yml`).

Read `README.md` for user-facing instructions and parameter tables. This file is the "why" and the pitfalls.

## 1. The experimental constraints (do not break these)
The game will later be used during neural recordings, and the *point* is that players discover physics by observation:
- No flashes, highlights, outlines, colour changes, progress indicators, countdowns, particles or decorative animations tied to targeting. The ONLY visible response to an action is the blocks' physical motion/deformation.
- No camera movement during play. (The camera is rolled 180 degrees only when an inverted tower is *loaded*.)
- The tower must be perfectly still before the player acts.
- **No player-facing text that reveals materials, towers' purposes or strategies**: no legend, no tower names (only "Tower N", "Version A-D", "Scene A-C"), no hints. Descriptive names/hints live only in `src/towers.js` and the collapsed *Developer* panel. `MATERIALS.*.label` strings exist in source but are never displayed - keep it that way.
- Deterministic, repeatable physics: a reset must reproduce exactly the same tower and the same strike must give the same outcome.
- Press-and-hold timing: the experiment spec is "hold 500 ms, one impulse per press, release early cancels, nothing visible during the hold". The demo currently runs in click mode (`CONFIG.holdMs = 0`, any click fires) at the owner's request; set `holdMs: 500` (or the Developer slider) to restore the experimental behaviour. The hold code path is still there and tested.

## 2. Layout
```
index.html            HUD (tower menu, Version menu, Reset, Pause, Demo Mode, counts, status, message) + collapsed Developer panel
src/config.js         all global constants (timestep, impulse, hold, camera, platform, clear/settle thresholds, demo delay, soft substeps)
src/materials.js      MATERIALS table, GRAY_DENSITY_RATIO, SOFT parameters, resolveMaterial()
src/towers.js         TOWERS (plain data), PLAYGROUND scenes, resolveTower() (variants), label helpers, inverted copies
src/physics.js        Simulation: Rapier world per tower, pre-settle, step/sub-steps, impulses, pulses, clearing
src/softbody.js       the marshmallow model (core + 6 sprung skin plates, bulge)
src/scene.js          SceneView: Three.js scene, camera, lights, meshes (soft = rounded + deformable), picking, inverted camera
src/main.js           game state, input, fixed-step loop, HUD, Developer panel, Demo Mode, window.__game test hooks
src/behaviors.js      empty hook table for future special rules (e.g. red blocks that fly up)
tools/*.mjs           headless (no browser) physics diagnostics - see section 8
tools/browser/*.mjs   puppeteer-driven browser tests/screenshot scripts - see section 8
diagnostics/          screenshots produced while testing (committed; safe to delete)
```
`physics.js`/`softbody.js`/`materials.js`/`towers.js`/`config.js` have no DOM or Three.js dependency, so they run in plain Node (that is how most tuning was done).

## 3. Core design
- **Fixed step 1/120 s**, accumulator loop in `main.js`. A **new Rapier world is built for every load/reset**, so resets are exactly repeatable.
- **Pre-settle** (`Simulation._preSettle`): after building a tower, the world is stepped (hidden) until all bodies are asleep (rigid towers) or genuinely still (soft towers, which creep slowly), then everything is forced asleep. The player never sees blocks settling. Sleeping state from construction does NOT work (bodies created asleep fall through gaps before contacts exist) - hence the warm-up.
- **Impulse**: `applyImpulseAtPoint(block, worldPoint, dir, magnitude)`; `dir` is the camera's horizontal forward vector (same for every click), magnitude `CONFIG.impulseMagnitude` (3.0). The point is from a raycast on the *rendered* mesh at press time (stored in the block's local frame, converted at fire time). Different points => different torques. Rigid blocks get the whole impulse instantly.
- **Cleared** = block centre below `clearY` (-1.5); body removed from physics below `removeY` (-12). Win = no uncleared blocks.
- **"Ready for next action"** = all non-cleared bodies below speed thresholds (0.08 lin / 0.2 ang) for 0.3 s, 5 s cap (`CONFIG.settle`); blocks already past the platform edge and below its top surface are ignored (`Simulation._isOffPlatform`). Presses while busy are ignored (no visual feedback) unless the Developer toggle "Click while blocks are moving" (`CONFIG.allowClickWhileMoving`) is on. `tools/settle_times.mjs` measures waits per tower.
- **Materials by name**: blocks say `material: 'blue'|'gray'|'pink'`; blue is the default, so the original towers have no field. Gray = blue density x `GRAY_DENSITY_RATIO` (8). Mass is density x volume (verified exact; same impulse => speed ~ 1/mass; no code compensates for mass).
- **Towers are data** (`src/towers.js`): blocks with `size`, `pos` (centre; y=0 is the platform top), optional `rot`. Place blocks in exact contact. Optional per-tower: `variants` (material swaps, shown as Version A-D), `platform` override, `impulse` override (playground), `inverted`.
- **Scene sets**: `TOWERS` (player-facing, numbered in array order - **append only, never reorder or insert**, because numbers are the player-facing identity and tests/docs refer to them) and `PLAYGROUND` (lab scenes, reached via Developer panel -> Scene set).

## 4. The marshmallow (soft) model - read before touching it
A pink block = rigid **core** body (inner box, most of the mass) + **6 skin plates** (thin slabs, one per face). Each plate is joined to the core by a **prismatic joint** (slides only along the face normal; limits [-travel, +0.5*travel]) whose **motor is a spring-damper** (`ForceBased` motor model, k = E*A/L, over-damped). Only plates touch the outside world, so compression, force transmission and energy loss are solved by Rapier's solver. Details/choices:
- Plates of the same block must not collide with each other or the core: a **physics hook** (`filterContactPair`) returns "no contact" for same-block pairs. **Rapier only calls hooks if you pass an `EventQueue` to `world.step`** (non-obvious; without it the hook silently never runs).
- Plate geometry is inset along higher-priority axes (y > x > z) so side plates' rigid edges don't carry load that belongs to the top/bottom plates (this was a bug: soft blocks acted rigid under load).
- **Bulge is physical** (`updateBulge`): each step the motor rest position of every face is moved outward in proportion to the compression strain of the other two axes (Poisson effect). Re-configuring a joint wakes bodies, so it is only done when the target changes by >1e-4.
- **Stability limits** (hard-won): the plates are light, and stiff/viscous springs on light bodies blow up at the base timestep. Fixes: towers containing soft blocks run **8 solver sub-steps** per 1/120 s step (`CONFIG.softSubsteps`; all-rigid towers use exactly one step as in the original game so their results are unchanged); k and c are clamped (`omega*dt<=0.6`, `c*dt/m<=0.6`); `skinMassFraction` must stay <= ~0.12 (6 plates + core must sum to the block mass); `travelFraction`/`maxTravel` above ~0.3 makes the thin core inertia unstable (spin to hundreds of rad/s). `tools/stab_sweep.mjs` is the check for this.
- **Strikes on soft blocks**: `strikeAbsorption` (40%) of the impulse is dissipated; the rest is delivered as a force pulse over `strikeSteps` (12) fixed steps to the struck plate (so it reaches the core only through the spring-damper). This is a modelling choice, not derived physics.
- **Anisotropy**: side (x/z) faces are `lateralFactor` (0.2) as stiff as vertical faces. Reason: a horizontal strike on a block pinned by friction/load only dents it a few percent if stiffness is isotropic (this is why earlier versions "looked rigid"), whereas a sustained vertical load needs enough stiffness not to bottom out. Static sag under load is the clearest cue; the strike dent is brief (peaks ~0.04 s, mostly recovered by ~0.5-1 s) and is the weakest visual cue.
- Rendering: pink meshes use `RoundedBoxGeometry`, no outline, and are drawn as a per-axis squashed box whose face positions are read from the plate bodies (`Simulation.compression`). Shear, and deformation between face centres, are not modelled.
- Limits: ~30% squish per face, then effectively rigid; soft blocks cost ~7 bodies + 6 joints and 8 sub-steps each (towers with soft blocks take a few hundred ms to build because of the pre-settle).

## 5. Inverted towers (14-16) and Demo Mode
- Towers 14/15/16 are `structuredClone`s of Towers 3/7/12 with `inverted: true` (end of `src/towers.js`). `SceneView.setInverted` sets `camera.up = (0,-1,0)` and re-aims: a 180-degree roll about the viewing axis. **The physics world is not touched** (same gravity, same impulse), so the screen shows the original video rotated 180 degrees. Verified: body poses bit-identical to the originals, and rotated screenshots match to <0.05% of pixels. Don't implement it by flipping gravity/geometry - the camera roll is exact and robust (picking, shadows and lighting just work; lighting appears rotated too, as in a rotated video).
- Demo Mode (`main.js`): checkbox in the HUD. On enable it loads a random tower (any of the 16, never the current one); when `game.won` becomes true the existing success message shows and, after `CONFIG.demoDelayMs` (1.5 s), another random tower loads. Any `loadTower` call (manual select, Reset, mode change) clears `game.demoNextAt`, which cancels a pending transition; Demo Mode stays on until unchecked.

## 6. Tuning guide (what to change for what)
- Heavier/lighter gray: `GRAY_DENSITY_RATIO` (also a Developer slider, which reloads the tower). At 8, a gray block moves ~1/8 as fast as a blue one under the same impulse, so some towers need several clicks.
- Squishier/stiffer pink: `SOFT.youngsModulus` (vertical stiffness; note the clamp makes it ineffective for very light blocks), `lateralFactor`, `dampingRatio` (recovery speed), `poisson` (bulge). After any change run `node tools/stab_sweep.mjs '[{}]'` (want `worstSoftW` ~<30 rad/s) and `node tools/spawn_check.mjs`.
- Force: `impulseMagnitude` (3.0 is what all towers were tuned at; ~3.5+ can clear towers in one hit).
- New tower: append to `TOWERS`; check `node tools/spawn_check.mjs` (blocks must not move during pre-settle) and `node tools/scan_outcomes.mjs 3 <n>` (single-strike outcomes; no single strike should clear everything); then play it.
- New material: add to `MATERIALS` (and optionally a `behaviors.js` entry via `behavior:`; `Simulation.applyImpulseAtPoint` already calls `onActivated(block, sim)`). Keep colour<->behaviour fixed across towers.

## 7. Environment notes
- The dev machine had **no Node.js installed** (the user later installed it). Anything run by the agent used a portable Node tarball unpacked in a scratch dir; there was also trouble launching the Claude preview server (hung), so browser testing used a separate Vite on port 5180 and puppeteer + the installed Google Chrome. `claude-in-chrome` was not connected.
- Run the app: `npm install && npm run dev` (port 5173). Production: `npm run build` (relative base `./`, works under `/block-game/`; Rapier's WASM is embedded in the JS bundle, ~5 MB).
- Deploy: push to `main`. Pages source must be "GitHub Actions" (already set). Pages caches `index.html` ~10 min (`max-age=600`), so a fresh push can take a few minutes to show; check the Actions run for the commit's SHA (the "latest" run may still be the previous one).
- Git: repo root is `block_game/`; a parent-folder backup exists at `../block_game_backup_v1_prototype_2026-10` (prototype) and `../block_game_backup_v2_pre_playground`.

## 8. Testing tools (all optional, none run in CI)
Headless physics (Node, no browser): `tools/headless_check.mjs` (`npm run check`), `spawn_check.mjs` (pre-settle stability of every scene), `scan_outcomes.mjs <force> [tower#...]` (blocks cleared per strike), `stab_sweep.mjs '[{param overrides}]'`, `squish_probe.mjs`, `dent_series.mjs` / `dent_sweep.mjs` (soft strike dent), `mass_diagnostics.mjs` (blue vs gray mass/inertia/impulse/collisions), `playground_probe.mjs`, `after.mjs <tower#> <block> [fy] [mag]`, `rest_check.mjs`, `montage.py` (frame sheets + pink-pixel measurements).
Browser (puppeteer-core + Chrome; `npm i puppeteer-core` somewhere, start `vite --port 5180`, then `node tools/browser/<script>`; paths to Chrome and output dirs are hard-coded for this machine - edit them): `regression.mjs` (stability, hold timing, click mode, determinism, comparison, plays every tower with a click bot), `demo.mjs` (Demo Mode), `inv.mjs` (inverted-vs-original), `seq.mjs` (strike + frame sequence at chosen sim times), `stills.mjs`, `live_site_check.mjs` (deployed site). They rely on `window.__game` hooks exposed by `main.js` (`game`, `view`, `CONFIG`, `loadTower`, `setMode`, `screenPoint`, `fireDirect`, `TOWERS`, `PLAYGROUND`).
**Important when running browser tests:** editing any file under `src/` or `index.html` while a test runs makes Vite reload the page and kills the test.

## 9. Known issues / ideas
- Soft strike dent is brief; consider a longer-lived deformation cue, shear/lean for hits near the top, or a true FEM/spring-mass lattice if more realism is wanted (the plate model cannot shear).
- Heavy blocks at 8x barely move from one click; some towers are tedious (bot needs ~12-24 clicks on towers 5-8, 15). Consider tuning towers or `impulseMagnitude`.
- The impulse direction is the same horizontal camera-forward vector for every click, by design.
- Only tested in Chrome, mouse only. No eye-tracking or experiment timing yet (the physics/render/input split in `main.js` is meant to make that easy to add).
- Bundle is ~5 MB (embedded WASM). Fine for Pages.
- `diagnostics/` contains test screenshots and can be removed from the repo if the owner prefers.
