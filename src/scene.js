// Rendering layer (Three.js): scene, fixed camera, lights, block meshes, picking. No physics logic.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export class SceneView {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.background);

    const c = CONFIG.camera;
    this.camera = new THREE.PerspectiveCamera(c.fov, 1, 0.1, 100);
    this.camera.position.set(...c.position);
    this.camera.lookAt(...c.target);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9da4, 1.0));
    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(-4, 11, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 7, bottom: -4, near: 1, far: 30 });
    sun.shadow.radius = 4; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    this.scene.add(sun);

    this._buildPlatform();
    this.group = new THREE.Group();   // block meshes of the current tower
    this.scene.add(this.group);
    this.meshes = [];   // pickable mesh per block (for soft blocks: the deformable inner box)
    this.roots = [];    // object whose pose follows the body (== mesh for rigid blocks, parent group for soft)
    this.raycaster = new THREE.Raycaster();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /** (Re)build the platform slab; `plat` = { size, center, color } (defaults to CONFIG.platform). */
  _buildPlatform(plat = CONFIG.platform) {
    if (this.platform) { this.scene.remove(this.platform); this.platform.geometry.dispose(); this.platform.material.dispose(); this.platform.children.forEach(c => { c.geometry.dispose(); c.material.dispose(); }); }
    const [w, h, d] = plat.size;
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: CONFIG.platform.color, roughness: 0.9 }));
    mesh.position.set(plat.center[0], -h / 2, plat.center[1]);
    mesh.receiveShadow = true;
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x6f737c })));
    this.platform = mesh;
    this.scene.add(mesh);
  }
  setPlatform(plat) { this._buildPlatform(plat ?? CONFIG.platform); }

  /** Create meshes for every block of a Simulation. */
  buildBlocks(sim) {
    this.clearBlocks();
    for (const b of sim.blocks) {
      const [sx, sy, sz] = b.size;
      // soft blocks get a rounded body and no outline (a constant, static look for the material)
      const geo = b.soft ? new RoundedBoxGeometry(sx, sy, sz, 5, 0.12 * Math.min(sx, sy, sz)) : new THREE.BoxGeometry(sx, sy, sz);
      const color = new THREE.Color(b.props.color);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0 }));
      mesh.castShadow = mesh.receiveShadow = true;
      if (!b.soft) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: color.clone().multiplyScalar(0.28) })));
      mesh.userData.block = b;
      if (b.soft) {                       // pivot at the core pose; inner box is squashed per face compression
        const pivot = new THREE.Group(); pivot.add(mesh); this.group.add(pivot); this.roots[b.id] = pivot;
      } else { this.group.add(mesh); this.roots[b.id] = mesh; }
      this.meshes[b.id] = mesh;
    }
    this.sync(sim);
  }

  clearBlocks() {
    for (const m of this.meshes) {
      m.geometry.dispose(); m.material.dispose();
      m.children.forEach(c => { c.geometry.dispose(); c.material.dispose(); });
    }
    this.group.clear(); this.meshes = []; this.roots = [];
  }

  /** Copy physics poses onto meshes. */
  sync(sim) {
    for (const b of sim.blocks) {
      const m = this.meshes[b.id], root = this.roots[b.id];
      if (b.removed) { root.visible = false; continue; }
      const t = b.body.translation(), q = b.body.rotation();
      root.position.set(t.x, t.y, t.z);
      root.quaternion.set(q.x, q.y, q.z, q.w);
      const comp = sim.compression(b);    // soft blocks: face compressions from the physics plates
      if (comp) {
        const sc = [0, 0, 0], off = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
          sc[i] = (b.size[i] - comp[2 * i] - comp[2 * i + 1]) / b.size[i];
          off[i] = (comp[2 * i] - comp[2 * i + 1]) / 2;
        }
        m.scale.set(sc[0], sc[1], sc[2]); m.position.set(off[0], off[1], off[2]);
      }
    }
    this.group.updateMatrixWorld(true);
  }

  render() { this.renderer.render(this.scene, this.camera); }

  /** Nearest visible block surface under a client-space pixel (null if platform/background is hit first). */
  pick(clientX, clientY) {
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects([this.platform, ...this.meshes.filter((m, i) => this.roots[i].visible)], false);
    if (!hits.length || !hits[0].object.userData.block) return null;
    const h = hits[0];
    return { block: h.object.userData.block, localPoint: h.object.worldToLocal(h.point.clone()) };
  }

  worldPointOf(blockId, localPoint) { return this.meshes[blockId].localToWorld(localPoint.clone()); }

  /** Horizontal unit vector pointing from the camera into the scene (+ optional elevation). */
  pushDirection() {
    const t = new THREE.Vector3(...CONFIG.camera.target), p = this.camera.position;
    const d = new THREE.Vector3(t.x - p.x, 0, t.z - p.z).normalize();
    const e = THREE.MathUtils.degToRad(CONFIG.impulseElevationDeg);
    return new THREE.Vector3(d.x * Math.cos(e), Math.sin(e), d.z * Math.cos(e));
  }

  screenPointOf(world) {
    const v = world.clone().project(this.camera), r = this.renderer.domElement.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / h, c = CONFIG.camera;
    this.camera.aspect = aspect;
    // keep the whole scene in view on narrow windows
    const minAspect = 1.5;
    this.camera.fov = aspect >= minAspect ? c.fov
      : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(c.fov) / 2) * minAspect / aspect));
    this.camera.updateProjectionMatrix();
  }
}
