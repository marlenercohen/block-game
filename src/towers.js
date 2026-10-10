// Tower definitions: plain data. Every block:
//   size: [x, y, z] full extents      pos: [x, y, z] centre (y = 0 is the platform top)
//   rot: [rx, ry, rz] optional Euler degrees
//   material / color / density / friction / restitution: optional (see materials.js)
//   material: 'blue' (default, ordinary) | 'gray' (heavy) | 'pink' (soft) - see materials.js
// Blocks are listed bottom-up; place them in exact contact (y centre = sum of heights below + h/2).
// A tower may have `variants`: [{ name, hint?, materials: { blockIndex: 'gray' | 'pink' | 'blue' } }]. A variant only swaps
// materials: geometry, positions, camera and force are identical, so outcomes are directly comparable.
export const TOWERS = [
  {
    name: '1 - Simple stack',
    blocks: [
      { size: [1.2, 0.5, 0.9], pos: [0, 0.25, -0.6] },
      { size: [1.2, 0.5, 0.9], pos: [0.1, 0.75, -0.6] },
      { size: [1.2, 0.5, 0.9], pos: [-0.1, 1.25, -0.6] },
      { size: [1.2, 0.5, 0.9], pos: [0.08, 1.75, -0.6] },
      { size: [1.2, 0.5, 0.9], pos: [0, 2.25, -0.6] },
    ],
  },
  {
    name: '2 - Supporting structure',
    blocks: [
      { size: [0.5, 1.5, 0.5], pos: [-1.0, 0.75, -0.6] },   // left support
      { size: [0.5, 1.5, 0.5], pos: [1.0, 0.75, -0.6] },    // right support
      { size: [3.0, 0.4, 0.9], pos: [0, 1.7, -0.6] },       // lintel
      { size: [0.9, 0.6, 0.9], pos: [-0.8, 2.2, -0.6] },
      { size: [0.9, 0.6, 0.9], pos: [0.8, 2.2, -0.6] },
      { size: [2.2, 0.35, 0.9], pos: [0, 2.675, -0.6] },    // cap slab
    ],
  },
  {
    name: '3 - Tall narrow tower',
    blocks: [
      { size: [0.8, 0.6, 0.8], pos: [0, 0.3, -0.6] },
      { size: [0.8, 0.6, 0.8], pos: [0.08, 0.9, -0.6] },
      { size: [0.8, 0.6, 0.8], pos: [-0.06, 1.5, -0.6] },
      { size: [0.8, 0.6, 0.8], pos: [0.1, 2.1, -0.6] },
      { size: [0.8, 0.6, 0.8], pos: [-0.08, 2.7, -0.6] },
      { size: [0.8, 0.6, 0.8], pos: [0.1, 3.3, -0.6] },
      { size: [0.8, 0.6, 0.8], pos: [-0.05, 3.9, -0.6] },
      { size: [0.8, 0.6, 0.8], pos: [0.06, 4.5, -0.6] },
    ],
  },
  {
    name: '4 - Complex structure',
    blocks: [
      // ground floor: four pillars
      { size: [0.5, 1.0, 0.5], pos: [-1.5, 0.5, -1.1] },
      { size: [0.5, 1.0, 0.5], pos: [-1.5, 0.5, 0.1] },
      { size: [0.5, 1.0, 0.5], pos: [1.5, 0.5, -1.1] },
      { size: [0.5, 1.0, 0.5], pos: [1.5, 0.5, 0.1] },
      // first deck: two beams spanning front/back pairs of pillars + a centre block between
      { size: [0.7, 0.3, 1.5], pos: [-1.5, 1.15, -0.5] },
      { size: [0.7, 0.3, 1.5], pos: [1.5, 1.15, -0.5] },
      { size: [3.0, 0.3, 0.9], pos: [0, 1.45, -0.5] },     // bridges the two beams
      // second storey
      { size: [0.5, 1.0, 0.7], pos: [-0.8, 2.1, -0.5] },
      { size: [0.5, 1.0, 0.7], pos: [0.8, 2.1, -0.5] },
      { size: [0.8, 1.0, 0.8], pos: [0, 2.1, -0.5] },      // central block between them
      { size: [2.2, 0.3, 1.0], pos: [0, 2.75, -0.5] },     // upper deck
      // top
      { size: [0.7, 0.7, 0.7], pos: [-0.5, 3.25, -0.5] },
      { size: [0.7, 0.7, 0.7], pos: [0.5, 3.25, -0.5] },
      { size: [1.6, 0.3, 0.8], pos: [0, 3.75, -0.5] },
    ],
  },
  {
    name: '5 - Heavy block on ordinary supports',
    blocks: [
      { size: [0.5, 1.2, 0.7], pos: [-1.0, 0.6, -0.6] },                       // 0 blue support
      { size: [0.5, 1.2, 0.7], pos: [1.0, 0.6, -0.6] },                        // 1 blue support
      { size: [2.8, 0.3, 0.8], pos: [0, 1.35, -0.6] },                         // 2 blue lintel
      { size: [1.0, 0.7, 0.7], pos: [0, 1.85, -0.6], material: 'gray' },       // 3 heavy block
      { size: [0.6, 0.5, 0.6], pos: [0, 2.45, -0.6] },                         // 4 blue cap
    ],
  },
  {
    name: '6 - Marshmallow supports',
    blocks: [
      { size: [1.0, 1.1, 0.9], pos: [-0.95, 0.55, -0.6], material: 'pink' },    // 0 soft support
      { size: [1.0, 1.1, 0.9], pos: [0.95, 0.55, -0.6], material: 'pink' },     // 1 soft support
      { size: [2.8, 0.4, 0.9], pos: [0, 1.3, -0.6] },                          // 2 blue slab
      { size: [0.8, 0.6, 0.8], pos: [-0.7, 1.8, -0.6] },                       // 3
      { size: [0.8, 0.6, 0.8], pos: [0.7, 1.8, -0.6] },                        // 4
      { size: [2.2, 0.3, 0.9], pos: [0, 2.25, -0.6] },                         // 5 blue cap slab
    ],
  },
  {
    name: '7 - Mixed materials',
    blocks: [
      { size: [0.6, 1.0, 0.7], pos: [-1.3, 0.5, -0.6] },                       // 0 blue support
      { size: [0.7, 1.0, 0.7], pos: [0, 0.5, -0.6], material: 'pink' },        // 1 soft support
      { size: [0.6, 1.0, 0.7], pos: [1.3, 0.5, -0.6], material: 'gray' },      // 2 heavy support
      { size: [3.4, 0.3, 0.8], pos: [0, 1.15, -0.6] },                         // 3 blue deck
      { size: [0.7, 0.6, 0.7], pos: [-1.0, 1.6, -0.6], material: 'gray' },     // 4 heavy block
      { size: [0.7, 0.6, 0.7], pos: [0, 1.6, -0.6] },                          // 5 blue block
      { size: [0.7, 0.6, 0.7], pos: [1.0, 1.6, -0.6], material: 'pink' },      // 6 soft block
      { size: [2.8, 0.25, 0.8], pos: [0, 2.025, -0.6] },                       // 7 blue top slab
    ],
  },
  {
    name: '8 - Generalization (staircase)',
    blocks: [
      { size: [0.8, 0.6, 0.8], pos: [-1.4, 0.3, -0.6], material: 'gray' },     // 0 column A
      { size: [0.8, 0.6, 0.8], pos: [-1.4, 0.9, -0.6] },                       // 1
      { size: [0.8, 0.6, 0.8], pos: [0, 0.3, -0.6] },                          // 2 column B
      { size: [0.8, 0.6, 0.8], pos: [0, 0.9, -0.6], material: 'pink' },        // 3
      { size: [2.4, 0.25, 0.9], pos: [-0.7, 1.325, -0.6] },                    // 4 bridge over A+B
      { size: [0.8, 0.6, 0.8], pos: [1.4, 0.3, -0.6], material: 'pink' },      // 5 column C
      { size: [0.7, 0.5, 0.7], pos: [-1.0, 1.7, -0.6], material: 'gray' },     // 6 on bridge
      { size: [0.7, 0.5, 0.7], pos: [-0.2, 1.7, -0.6] },                       // 7 on bridge
    ],
  },
  {
    name: '9 - Material comparison table',
    // Same geometry in every version. Use the Version selector to swap materials, then strike the same spot
    // (suggested: low on the LEFT support).
    variants: [
      { name: 'All blue', hint: 'Baseline: hit low on the left support.' },
      { name: 'Soft (pink) supports', hint: 'Same hit: the soft pillar absorbs it.', materials: { 0: 'pink', 1: 'pink' } },
      { name: 'Heavy (gray) lintel + cap', hint: 'Heavy load on top: same hit.', materials: { 2: 'gray', 5: 'gray' } },
      { name: 'Heavy (gray) supports', hint: 'Same hit: the heavy pillar barely moves.', materials: { 0: 'gray', 1: 'gray' } },
    ],
    blocks: [
      { size: [0.5, 1.4, 0.5], pos: [-1.0, 0.7, -0.6] },
      { size: [0.5, 1.4, 0.5], pos: [1.0, 0.7, -0.6] },
      { size: [3.0, 0.4, 0.9], pos: [0, 1.6, -0.6] },
      { size: [0.9, 0.6, 0.9], pos: [-0.8, 2.1, -0.6] },
      { size: [0.9, 0.6, 0.9], pos: [0.8, 2.1, -0.6] },
      { size: [2.2, 0.35, 0.9], pos: [0, 2.575, -0.6] },
    ],
  },
  {
    name: '10 - Marshmallow load demo',
    // Matched pair: identical blocks and identical heavy loads; the right-hand base is pink. Strike either heavy block
    // (or the pink base) and watch the right column sink, bulge and slowly recover.
    blocks: [
      { size: [1.3, 0.9, 1.0], pos: [-1.1, 0.45, -0.6] },                          // 0 blue base (reference)
      { size: [1.3, 0.9, 1.0], pos: [1.1, 0.45, -0.6], material: 'pink' },        // 1 pink base
      { size: [0.7, 0.5, 0.5], pos: [-1.1, 1.15, -0.6], material: 'gray' },       // 2 heavy load on blue
      { size: [0.7, 0.5, 0.5], pos: [1.1, 1.15, -0.6], material: 'gray' },        // 3 heavy load on pink
    ],
  },
  {
    name: '11 - Wrecking weight (heavy cap on a tall blue column; low blue blocks to its left)',
    blocks: [
      { size: [0.6, 0.6, 0.6], pos: [0.9, 0.3, -0.2] },                        // 0 column
      { size: [0.6, 0.6, 0.6], pos: [0.9, 0.9, -0.2] },                        // 1
      { size: [0.6, 0.6, 0.6], pos: [0.9, 1.5, -0.2] },                        // 2
      { size: [0.7, 0.7, 0.7], pos: [0.9, 2.15, -0.2], material: 'gray' },     // 3 heavy cap
      { size: [0.6, 0.5, 0.6], pos: [-0.2, 0.25, -0.5] },                      // 4 low blocks
      { size: [0.6, 0.5, 0.6], pos: [-0.9, 0.25, -0.5] },                      // 5
      { size: [0.6, 0.5, 0.6], pos: [-1.6, 0.25, -0.5] },                      // 6
    ],
  },
  {
    name: '12 - Two small stacks: one on a soft base, one on a rigid base',
    blocks: [
      { size: [1.0, 0.7, 0.8], pos: [-1.2, 0.35, -0.4], material: 'pink' },    // 0 soft base
      { size: [0.5, 1.0, 0.5], pos: [-1.2, 1.2, -0.4] },                       // 1 tall block on soft base
      { size: [1.0, 0.7, 0.8], pos: [0.9, 0.35, -0.4] },                       // 2 rigid base
      { size: [0.5, 1.0, 0.5], pos: [0.9, 1.2, -0.4] },                        // 3 tall block on rigid base
      { size: [0.5, 0.5, 0.5], pos: [0.9, 1.95, -0.4] },                       // 4 small block on top
    ],
  },
  {
    name: '13 - Heavy on soft (deck leans toward the soft pillar)',
    blocks: [
      { size: [1.3, 0.9, 1.0], pos: [-1.0, 0.45, -0.5], material: 'pink' },    // 0 soft pillar
      { size: [1.0, 0.9, 0.9], pos: [1.0, 0.45, -0.5] },                       // 1 rigid pillar
      { size: [2.6, 0.25, 0.9], pos: [0, 1.025, -0.5] },                       // 2 deck
      { size: [0.5, 0.5, 0.5], pos: [-1.0, 1.4, -0.5], material: 'gray' },     // 3 heavy block over the soft pillar
      { size: [0.5, 0.5, 0.5], pos: [0.1, 1.4, -0.5] },                        // 4 small block on the deck
      { size: [0.5, 0.7, 0.5], pos: [1.0, 1.5, -0.5] },                        // 5 block over the rigid pillar
    ],
  },
];

// Inverted copies: exact duplicates of existing towers (same blocks, materials, physics) presented with the camera rolled
// 180 degrees (see SceneView.setInverted). Appended so they are numbered after the originals. The player-facing name
// is just the number; `name` below is for developers only.
for (const src of [3, 7, 12]) {                       // Tower 3 (tall narrow), Tower 7 (mixed materials), Tower 12 (soft vs rigid base)
  const t = structuredClone(TOWERS[src - 1]);
  TOWERS.push({ ...t, name: `${t.name} [inverted view of tower ${src}]`, inverted: true, configId: src });
}

/** Apply a variant's material swaps and return a plain tower object ready for Simulation. */
export function resolveTower(tower, variantIndex = 0) {
  const v = tower.variants?.[variantIndex];
  if (!v?.materials) return tower;
  return { ...tower, blocks: tower.blocks.map((b, i) => (v.materials[i] ? { ...b, material: v.materials[i] } : b)) };
}

/** Scenes for the lab-only Material Playground (Developer panel). Filled in below. */
const PG_PLATFORM = { size: [7.2, 0.6, 4.6], center: [0, -0.5] };   // wider than the tower platform so nothing leaves it by accident
export const PLAYGROUND = [
  {
    name: 'A: equal impulse, blue vs gray (identical size)',
    platform: PG_PLATFORM, impulse: 1.0,
    blocks: [
      { size: [0.8, 0.6, 0.6], pos: [-1.8, 0.3, -0.2], material: 'blue' },
      { size: [0.8, 0.6, 0.6], pos: [1.8, 0.3, -0.2], material: 'gray' },
    ],
  },
  {
    name: 'B: identical heavy load on a blue base vs a pink base',
    platform: PG_PLATFORM, impulse: 1.0,
    blocks: [
      { size: [1.4, 0.9, 1.0], pos: [-1.7, 0.45, -0.3], material: 'blue' },
      { size: [1.4, 0.9, 1.0], pos: [1.7, 0.45, -0.3], material: 'pink' },
      { size: [0.8, 0.5, 0.6], pos: [-1.7, 1.15, -0.3], material: 'gray' },
      { size: [0.8, 0.5, 0.6], pos: [1.7, 1.15, -0.3], material: 'gray' },
    ],
  },
  {
    name: 'C: same blow on a blue-supported vs a pink-supported structure',
    platform: PG_PLATFORM, impulse: 2.5,
    blocks: [
      { size: [1.0, 0.7, 0.8], pos: [-1.7, 0.35, -0.3], material: 'blue' },
      { size: [1.0, 0.7, 0.8], pos: [1.7, 0.35, -0.3], material: 'pink' },
      { size: [0.5, 1.0, 0.5], pos: [-1.7, 1.2, -0.3] },
      { size: [0.5, 1.0, 0.5], pos: [1.7, 1.2, -0.3] },
    ],
  },
];

/** Player-facing label: deliberately uninformative. Descriptive `name`s stay in the source / Developer panel only. */
export const labelFor = (set, i) => (set === 'playground' ? `Scene ${'ABCDEFGH'[i]}` : `Tower ${i + 1}`);
export const versionLabel = k => `Version ${'ABCDEFGH'[k]}`;
