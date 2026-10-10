// Game controller: input (press-and-hold), fixed-step loop, game state, HUD.
import { CONFIG } from './config.js';
import { TOWERS, PLAYGROUND, resolveTower, labelFor, versionLabel } from './towers.js';
import { MATERIALS, SOFT } from './materials.js';
import { initPhysics, Simulation } from './physics.js';
import { SceneView } from './scene.js';

const $ = id => document.getElementById(id);
const view = new SceneView($('c'));
await initPhysics();

const game = {
  set: 'towers', towerIndex: 0, variantIndex: 0, sim: null, actions: 0, paused: false,
  status: 'ready',            // 'ready' | 'running'
  restTime: 0, runTime: 0,
  hold: null,                 // { blockId, localPoint, t0 } while the button is held and not yet fired
  won: false,
};

const DEFAULT_IMPULSE = CONFIG.impulseMagnitude;
const currentSet = () => (game.set === 'playground' ? PLAYGROUND : TOWERS);

function fillTowerMenu() {
  const sel = $('tower'); sel.innerHTML = '';
  currentSet().forEach((t, i) => sel.add(new Option(labelFor(game.set, i), i)));
}

function loadTower(i, v = 0) {
  const tw = currentSet()[i];
  game.towerIndex = i; game.variantIndex = v;
  game.sim = new Simulation(resolveTower(tw, v));   // fresh world => exact repeatability
  view.setPlatform(tw.platform);
  if (tw.impulse !== undefined) { CONFIG.impulseMagnitude = tw.impulse; game.impulseOverridden = true; }
  else if (game.impulseOverridden) { CONFIG.impulseMagnitude = DEFAULT_IMPULSE; game.impulseOverridden = false; }
  $('force').value = CONFIG.impulseMagnitude; $('forceVal').textContent = (+CONFIG.impulseMagnitude).toFixed(1);
  $('variantRow').style.display = tw.variants ? '' : 'none';
  if (tw.variants) {
    const vs = $('variant'); vs.innerHTML = '';
    tw.variants.forEach((x, k) => vs.add(new Option(versionLabel(k), k))); vs.value = v;
  }
  // descriptive info is for developers only (Developer panel)
  $('devinfo').textContent = `${tw.name}${tw.variants ? ' / ' + tw.variants[v].name : ''}${tw.variants?.[v]?.hint ? ' - ' + tw.variants[v].hint : ''}`;
  $('tower').value = i;
  view.buildBlocks(game.sim);
  Object.assign(game, { actions: 0, status: 'ready', restTime: 0, runTime: 0, hold: null, won: false });
  updateHud();
}

// ---- input ------------------------------------------------------------------------------------
const canvas = $('c');
canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0 || game.status !== 'ready' || game.paused || game.won || game.hold) return;
  const hit = view.pick(e.clientX, e.clientY);
  if (!hit) return;
  game.hold = { blockId: hit.block.id, localPoint: hit.localPoint, t0: performance.now() };
  if (CONFIG.holdMs <= 0) { const h = game.hold; game.hold = null; fire(h.blockId, h.localPoint); }   // plain click mode
});
const cancelHold = () => { game.hold = null; };
window.addEventListener('pointerup', cancelHold);
window.addEventListener('pointercancel', cancelHold);
window.addEventListener('blur', cancelHold);
document.addEventListener('mouseleave', cancelHold);
canvas.addEventListener('contextmenu', e => e.preventDefault());

function fire(blockId, localPoint) {
  const block = game.sim.blocks[blockId];
  const point = view.worldPointOf(blockId, localPoint);
  game.sim.applyImpulseAtPoint(block, point, view.pushDirection(), CONFIG.impulseMagnitude);
  game.actions++;
  game.status = 'running'; game.restTime = 0; game.runTime = 0;
}

// ---- main loop --------------------------------------------------------------------------------
let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(now - last, 100) / 1000; last = now;

  // 500 ms hold elapsed -> exactly one impulse, then the hold is consumed (releasing does nothing more)
  if (game.hold && now - game.hold.t0 >= CONFIG.holdMs) {
    const h = game.hold; game.hold = null;
    fire(h.blockId, h.localPoint);
  }

  if (!game.paused) {
    let n = 0;
    while (acc >= CONFIG.fixedDt && n < CONFIG.maxStepsPerFrame) { stepOnce(); acc -= CONFIG.fixedDt; n++; }
    if (n === CONFIG.maxStepsPerFrame) acc = 0;
  } else acc = 0;

  view.sync(game.sim);
  view.render();
  updateHud();
  requestAnimationFrame(frame);
}

function stepOnce() {
  const sim = game.sim;
  sim.step();
  if (game.status === 'running') {
    game.runTime += CONFIG.fixedDt;
    game.restTime = sim.isAtRest() ? game.restTime + CONFIG.fixedDt : 0;
    if (game.restTime >= CONFIG.settle.seconds || game.runTime >= CONFIG.settle.maxWaitSeconds) game.status = 'ready';
  }
  if (sim.remaining === 0) game.won = true;
}

// ---- HUD --------------------------------------------------------------------------------------
function updateHud() {
  $('remaining').textContent = game.sim.remaining;
  $('actions').textContent = game.actions;
  $('status').textContent = game.paused ? 'paused' : game.status === 'ready' ? 'ready' : 'settling...';
  $('msg').textContent = game.won ? `All blocks cleared in ${game.actions} action${game.actions === 1 ? '' : 's'}!` : '';
}

const sel = $('tower');
fillTowerMenu();
$('mode').addEventListener('change', e => { e.target.blur(); game.set = e.target.value; fillTowerMenu(); loadTower(0, 0); });
sel.addEventListener('change', () => { sel.blur(); loadTower(+sel.value, 0); });
$('variant').addEventListener('change', e => { e.target.blur(); loadTower(game.towerIndex, +e.target.value); });
$('reset').addEventListener('click', e => { e.target.blur(); loadTower(game.towerIndex, game.variantIndex); });
$('pause').addEventListener('click', e => {
  game.paused = !game.paused; e.target.textContent = game.paused ? 'Resume' : 'Pause'; e.target.blur();
});
const force = $('force');
force.value = CONFIG.impulseMagnitude; $('forceVal').textContent = (+force.value).toFixed(1);
$('hold').value = CONFIG.holdMs; $('holdVal').textContent = CONFIG.holdMs;
$('hold').addEventListener('input', () => { CONFIG.holdMs = +$('hold').value; $('holdVal').textContent = CONFIG.holdMs; });
force.addEventListener('input', () => { CONFIG.impulseMagnitude = +force.value; $('forceVal').textContent = (+force.value).toFixed(1); });

const grayS = $('gray'), stiffS = $('stiff'), BLUE_D = MATERIALS.blue.density;
grayS.value = MATERIALS.gray.density / BLUE_D; $('grayVal').textContent = (+grayS.value).toFixed(1);
stiffS.value = SOFT.youngsModulus; $('eVal').textContent = stiffS.value;
grayS.addEventListener('input', () => { MATERIALS.gray.density = BLUE_D * +grayS.value; $('grayVal').textContent = (+grayS.value).toFixed(1); loadTower(game.towerIndex, game.variantIndex); });
stiffS.addEventListener('input', () => { SOFT.youngsModulus = +stiffS.value; $('eVal').textContent = stiffS.value; loadTower(game.towerIndex, game.variantIndex); });

// Debug/test hooks (console): window.__game
window.__game = {
  game, view, CONFIG, loadTower, TOWERS, PLAYGROUND, setMode(m) { $('mode').value = m; game.set = m; fillTowerMenu(); loadTower(0, 0); },
  /** client-pixel position of a point on a block (local coords as fractions of its size, e.g. [0,0,0.5] = middle of +z face) */
  screenPoint(blockId, fx, fy, fz) {
    const b = game.sim.blocks[blockId], m = view.meshes[blockId];
    const p = view.screenPointOf(m.localToWorld(new m.position.constructor(fx * b.size[0], fy * b.size[1], fz * b.size[2])));
    return p;
  },
  fireDirect(blockId, localPoint) { fire(blockId, localPoint); },
};

loadTower(0);
requestAnimationFrame(frame);
