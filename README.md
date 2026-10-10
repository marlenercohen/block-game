# Block physics demo

For the demo, any click on a block fires the impulse. (The experimental press-and-hold version: set `holdMs: 500` in `src/config.js`, or use the Developer slider "Hold time".) With a hold time set, press and hold the mouse on a block for that long: it receives one fixed-size impulse at the exact surface point you
pressed, directed away from the camera. Clear every block off the platform. Nothing changes on screen until the
impulse is applied; the only response is the blocks' physical motion and deformation.

Materials (colour is always the same physical material, in every tower; the game deliberately never tells the player what a colour means - there is no legend and towers are just "Tower 1" ... "Tower 13". Descriptive names exist only in `src/towers.js` and the collapsed Developer panel):

| Colour | Material | Physics |
|---|---|---|
| Blue | Ordinary | rigid, density 1 (the original blocks) |
| Dark gray | Heavy | rigid, density = `GRAY_DENSITY_RATIO` (8) x blue. Mass = density x volume |
| Pink | Soft ("marshmallow") | compliant compound body: compresses, dissipates energy, recovers (see below) |

Towers 1-4 are the original all-blue towers. Developer names for 5-13: 5 heavy block on blue supports; 6 soft supports; 7 mixed materials;
8 generalization staircase; 9 material comparison table (Version A-D menu); 10 matched blue/pink bases under identical heavy loads;
11 wrecking weight (heavy cap on a tall blue column, low blue blocks beside it); 12 two small stacks, one on a soft base and one on a rigid base;
13 heavy block on a soft pillar (deck leans toward it).

Towers 14-16 are exact inverted copies of towers 3, 7 and 12 (developer info only): same blocks, materials and physics, shown with the camera
rolled 180 degrees about its viewing axis (`SceneView.setInverted`, flag `inverted: true` in `src/towers.js`). Gravity and impulses are unchanged in the
physics world, so the screen shows the original video rotated by 180 degrees (platform at the top, blocks fall upward). `diagnostics/inverted_vs_original.png` and
the pixel comparison in the report show the equivalence.

**Demo Mode** (checkbox in the main panel): picks a random tower (never the same one twice in a row); when the tower is cleared the usual success message
shows for `demoDelayMs` (1.5 s, `src/config.js`) and another random tower loads, indefinitely. Manually selecting a tower, resetting, or switching Demo Mode off
cancels a pending transition (Demo Mode stays on unless unchecked).

## Behavioural data (local only)
The game logs sessions, trials and every click/tap in the browser (`src/logger.js`) and keeps them in memory + `sessionStorage` (survives an accidental refresh).
Nothing is uploaded. A small, faint **Download data** button (bottom-right; **CSV** next to it for a one-row-per-trial summary) saves
`blockgame_<sessionId>_<date-time>.json`; downloading does not reset anything. Fields: random session ID, date/time, build (git hash), observed
browser/OS/screen/devicePixelRatio/orientation/touch capability, an *inferred* device category (phone/tablet/desktop - a heuristic), counts of the
pointer types actually seen (mouse/touch/pen); per trial: tower number, underlying config number (inverted copies point at the tower they duplicate),
inverted?, Demo Mode?, start/end time, duration, attempts/hits/misses/ignored presses, outcome (`completed`, `reset`, `switched_tower`, `abandoned` = page closed or reloaded, `dev_reload`; `null` = still in progress when downloaded),
physics snapshot (impulse, hold time, gray density ratio, pink friction + soft parameters); per action: time since trial start, screen x/y, 3D hit point, block index and material, hit/miss/ignored/released-early/fired, impulse magnitude + direction, hold duration, pointer type.

## Run locally
Requires Node.js 18+ (https://nodejs.org).
```
cd block_game
npm install
npm run dev        # open http://localhost:5173
```
Other scripts: `npm run build` (production build into `dist/`), `npm run preview` (serve the build), `npm run check`
(headless physics stability check of all towers).

## Material Playground (lab / debugging)
Developer panel (bottom-left, collapsed by default) -> "Scene set" -> *Material playground*. Three controlled scenes (the Tower menu then shows Scene A-C; all use the same camera and a wider platform; each scene sets its own, identical-for-both-sides impulse, shown in the Developer panel):
- **A** equal impulse: identical-size blue and gray blocks at equivalent positions.
- **B** compression: an identical heavy gray block on top of a large blue base (left) and a large pink base (right).
- **C** impact absorption: a small blue-supported and a pink-supported stack; strike each base at the same place with the same impulse.
`tools/mass_diagnostics.mjs`, `tools/playground_probe.mjs`, `tools/dent_series.mjs`, `tools/spawn_check.mjs` reproduce the numbers; `diagnostics/` holds screenshots.

## Material comparison mode
Pick "9 - Material comparison table". A **Version** menu appears: *All blue*, *Soft (pink) supports*, *Heavy (gray)
lintel + cap*, *Heavy (gray) supports*. Switching versions resets the tower; geometry, camera, impulse strength and
everything else are identical, only the materials of selected blocks change (`variants` in `src/towers.js`).
Striking the same spot (low on the left support) gives: all blue - the table collapses; pink supports - the soft pillar
absorbs the blow and the table stays up; gray supports - the heavy pillar barely moves.

## Changing material properties
All in `src/materials.js`:
- `GRAY_DENSITY_RATIO` (top of file) - heavy/ordinary density ratio. Also on the in-page Developer slider.
- `MATERIALS.<name>`: `color`, `density`, `friction`, `restitution`, `kind` ('rigid' | 'soft'), `behavior` (hook for future special rules, `src/behaviors.js`).
- `SOFT`: marshmallow parameters - `youngsModulus` (stiffness; lower = squishier), `lateralFactor` (side faces are this much softer than the vertical faces, so a horizontal push dents it clearly), `dampingRatio` (>1 = over-damped, slower gooey recovery), `poisson` (sideways bulge), `skinMassFraction`, `travelFraction`/`maxTravel` (maximum squish per face; keep <= 0.3, larger values destabilise the solver), `strikeAbsorption`, `strikeSteps`. `softSubsteps` in `src/config.js` sets the solver sub-steps used by towers that contain pink blocks.
- Add a material: add an entry to `MATERIALS` and use `material: 'name'` in a tower block. Blocks reference a material by name; per-block overrides still work but towers should not need them.
- Force magnitude: `impulseMagnitude` in `src/config.js` (or the Developer slider).
- New towers: edit `src/towers.js` (plain data: `size`, `pos`, optional `rot`, `material`).

## How the marshmallow physics works
A soft block is built from ordinary Rapier bodies (`src/softbody.js`): a rigid **core** (inner box, most of the mass) plus
six thin **skin plates**, one per face. Each plate is attached to the core by a *prismatic joint* that lets it slide only
along the face normal, with a joint **motor acting as a spring-damper** (k = E x face area / thickness, strongly
over-damped so shape changes and recovery take a few tenths of a second). Everything that touches a soft block touches a
plate, so squishing is solved by the same constraint solver as everything else:
- loads (blocks resting on it, impacts) push plates in, the spring force transmits to the core, the damper dissipates energy;
- **bulge is physical**: each face's spring rest position is moved outward in proportion to the compression of the other two axes (Poisson effect), so a squashed block really gets wider and pushes on neighbours;
- a blue block resting on pink compresses it, a heavier (gray) load compresses it more, and when the load goes the plates spring back (the pink block in tower 10 sinks to ~65% height under the gray block and recovers over ~0.5 s when it is knocked off);
- the strike: part of the player's impulse (`strikeAbsorption`) is dissipated in the surface and the rest is delivered as a short force pulse on the struck plate, so it reaches the core only through the spring-damper (rigid blocks receive the whole impulse instantly);
- the renderer draws the box where its plates really are (per-axis squash + the physical bulge); soft blocks have a rounded, outline-free look that never changes. No extra effects are added.
- Towers with pink blocks run the solver in 8 sub-steps per 1/120 s step (stiff, viscous springs need it); all-rigid towers run exactly as in the original game.
Parts of one soft block never collide with each other (physics hook).

### Limitations
- Compression is per face along the three axes; there is no shear and no deformation between the face centres. Edge/corner hits are approximated, and the rounded corners are only a visual.
- Maximum squish is ~30% per face (~60% of a dimension in total); beyond that the block behaves rigidly. Heavily loaded soft blocks can sit near that limit.
- A horizontal strike on a braced block produces a modest, brief dent (hundreds of ms); the dramatic, long compression comes from sustained load and from cascades (blocks falling on pink).
- `strikeAbsorption` is a modelling choice (a soft surface dissipates part of a blow), not derived from first principles.
- Soft blocks cost ~7 bodies + 6 joints each and 8 sub-steps; loading a soft tower takes a few hundred ms (hidden pre-settle).
- Pre-loaded soft blocks start already compressed (their settled state, identical after every reset); you see the sag by comparison with a blue block, not as an animation.

## Publish to GitHub Pages (when you are ready)
Nothing here publishes anything by itself. The project is already configured:
- `vite.config.js` uses a relative base (`./`), which works under any `https://<user>.github.io/<repo>/` path (override with `VITE_BASE=/<repo>/` if you want an absolute path). Rapier's WebAssembly is embedded in the JS bundle, so there are no extra files to serve.
- `.github/workflows/deploy.yml` builds and deploys on every push to `main`.

Steps: (1) create a GitHub repository whose root is this `block_game` folder (`git init`, commit, add the remote, push to `main`);
(2) on GitHub: *Settings -> Pages -> Build and deployment -> Source: GitHub Actions*; (3) the "Deploy to GitHub Pages"
workflow runs; the URL appears in the workflow run and under Settings -> Pages. A free GitHub account can only host Pages
from a public repository (private-repo Pages needs a paid plan), so making the repo public is a decision for you.

## Code layout
`src/config.js` constants - `src/materials.js` materials - `src/towers.js` tower data and variants - `src/physics.js` Rapier world (headless-capable) -
`src/softbody.js` compliant block - `src/behaviors.js` special-rule hooks - `src/scene.js` Three.js rendering/picking - `src/main.js` input, loop, HUD.
`tools/` has headless scripts (stability checks, outcome scans). The pre-materials prototype is backed up in `../block_game_backup_v1_prototype_2026-10`.

## Other notes
- Physics: fixed 1/120 s step; a new world is built on every reset (same tower + same impulse = identical result).
- Towers start asleep after a hidden pre-settle, so nothing moves before the player acts.
- A block counts as cleared when its centre falls below y = -1.5; it is removed from physics at y = -12.
- Impulse direction is the camera's horizontal forward vector for every click.
- Tested in Chrome only. No eye-tracking/experiment timing yet.
