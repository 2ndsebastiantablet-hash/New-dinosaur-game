// Simple rigid-body props: spheres/cylinders/boxes with gravity, bouncing, friction, wall
// collisions, buoyancy, rolling, player kicks, and pick-up / throw.
import * as THREE from 'three';
import { zonesAt, inZone } from './features.js';

const DEFS = {
  can: { shape: 'cyl', size: [0.033, 0.12], r: 0.06, bounce: 0.35, color: 'rand', label: 'soda can', float: true },
  ball: { shape: 'sphere', r: 0.12, bounce: 0.75, color: 'rand', label: 'ball', float: true, roll: true },
  bowling: { shape: 'sphere', r: 0.109, bounce: 0.08, color: 'rand', label: 'bowling ball', roll: true, heavy: true, fric: 0.08 },
  golf: { shape: 'sphere', r: 0.03, bounce: 0.3, color: [1, 1, 1], label: 'golf ball', roll: true, fric: 1.6 },
  plush: { shape: 'sphere', r: 0.16, bounce: 0.25, color: 'rand', label: 'plush toy', float: true },
  coin: { shape: 'cyl', size: [0.015, 0.004], r: 0.02, bounce: 0.2, color: [1, 0.8, 0.3], label: 'coin', metal: true },
  box: { shape: 'box', size: [0.5, 0.38, 0.42], r: 0.24, bounce: 0.15, color: [0.72, 0.56, 0.38], label: 'cardboard box', float: true },
  product: { shape: 'box', size: [0.14, 0.22, 0.09], r: 0.1, bounce: 0.2, color: 'rand', label: 'product' },
  book: { shape: 'box', size: [0.16, 0.23, 0.04], r: 0.1, bounce: 0.1, color: 'rand', label: 'book', float: true },
  shirt: { shape: 'box', size: [0.32, 0.05, 0.26], r: 0.12, bounce: 0.05, color: 'rand', label: 'folded shirt', float: true },
  gift: { shape: 'box', size: [0.22, 0.22, 0.22], r: 0.12, bounce: 0.2, color: 'rand', label: 'gift box', float: true },
  gadget: { shape: 'box', size: [0.08, 0.16, 0.012], r: 0.08, bounce: 0.2, color: [0.08, 0.08, 0.1], label: 'phone' },
  laptop: { shape: 'box', size: [0.34, 0.025, 0.24], r: 0.14, bounce: 0.1, color: [0.75, 0.75, 0.78], label: 'laptop' },
  shoes: { shape: 'box', size: [0.12, 0.1, 0.28], r: 0.1, bounce: 0.2, color: 'rand', label: 'shoe' },
  beauty: { shape: 'cyl', size: [0.03, 0.12], r: 0.06, bounce: 0.2, color: 'rand', label: 'perfume bottle' },
  burger: { shape: 'box', size: [0.14, 0.08, 0.14], r: 0.08, bounce: 0.1, color: [0.95, 0.75, 0.2], label: 'burger', float: true },
  popcorn: { shape: 'cyl', size: [0.09, 0.2], r: 0.1, bounce: 0.1, color: [0.85, 0.1, 0.1], label: 'popcorn bucket', float: true },
  coffee: { shape: 'cyl', size: [0.04, 0.12], r: 0.06, bounce: 0.1, color: [0.95, 0.95, 0.92], label: 'coffee cup', float: true },
  soda: { shape: 'cyl', size: [0.045, 0.16], r: 0.07, bounce: 0.1, color: [0.9, 0.15, 0.1], label: 'soda cup', float: true },
  'cotton candy': { shape: 'sphere', r: 0.14, bounce: 0.1, color: [1, 0.6, 0.85], label: 'cotton candy', float: true },
};
export const ITEM_LABEL = (k) => (DEFS[k] ? DEFS[k].label : k);

export class Phys {
  constructor(G) {
    this.G = G;
    this.bodies = [];
    this.geos = {
      sphere: new THREE.SphereGeometry(1, 16, 12),
      cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
      box: new THREE.BoxGeometry(1, 1, 1),
    };
    this._boxes = [];
    this._q = new THREE.Quaternion(); this._ax = new THREE.Vector3();
  }
  spawn(kind, x, y, z, vx = 0, vy = 0, vz = 0) {
    const d = DEFS[kind] || DEFS.box;
    const col = d.color === 'rand' ? new THREE.Color().setHSL(Math.random(), 0.7, 0.5) : new THREE.Color(...d.color);
    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: d.metal ? 0.3 : 0.5, metalness: d.metal ? 1 : 0 });
    const mesh = new THREE.Mesh(this.geos[d.shape], mat);
    if (d.shape === 'sphere') mesh.scale.setScalar(d.r);
    else if (d.shape === 'cyl') mesh.scale.set(d.size[0], d.size[1], d.size[0]);
    else mesh.scale.set(...d.size);
    if (kind === 'bowling') { mat.roughness = 0.15; }
    this.G.scene.add(mesh);
    const b = { kind, def: d, mesh, x, y, z, vx, vy, vz, r: d.r, age: 0, held: false, wx: 0, wz: 0, still: 0 };
    mesh.position.set(x, y, z);
    this.bodies.push(b);
    while (this.bodies.length > 70) this.remove(this.bodies.find((q) => !q.held) || this.bodies[0]);
    return b;
  }
  remove(b) {
    const i = this.bodies.indexOf(b);
    if (i >= 0) this.bodies.splice(i, 1);
    this.G.scene.remove(b.mesh);
    b.mesh.material.dispose();
    b.dead = true;
  }
  clear() { for (const b of [...this.bodies]) this.remove(b); }
  update(dt) {
    const G = this.G, P = G.player;
    for (const b of [...this.bodies]) {
      b.age += dt;
      if (b.held) continue;
      if (Math.hypot(b.x - P.pos.x, b.z - P.pos.z) > 160 || b.y < -40) { this.remove(b); continue; }
      const steps = 3, h = dt / steps;
      for (let s = 0; s < steps; s++) this.step(b, h);
      // visual
      b.mesh.position.set(b.x, b.y - (b.def.shape === 'box' ? 0 : 0), b.z);
      const sp = Math.hypot(b.vx, b.vz);
      if (b.def.roll && sp > 0.01 && b.ground) {
        this._ax.set(b.vz, 0, -b.vx).normalize();
        this._q.setFromAxisAngle(this._ax, (sp * dt) / b.r);
        b.mesh.quaternion.premultiply(this._q);
      } else if (!b.ground && b.def.shape !== 'sphere') {
        b.mesh.rotation.x += b.wx * dt; b.mesh.rotation.z += b.wz * dt;
      } else if (b.ground && b.def.shape !== 'sphere') {
        // settle flat
        b.mesh.rotation.x *= 0.85; b.mesh.rotation.z *= 0.85;
      }
    }
  }
  step(b, h) {
    const G = this.G, W = G.world;
    // water
    let inWater = null;
    const zs = zonesAt(G.mall, b.x, b.z);
    if (zs) for (const zn of zs) if (zn.type === 'water' && b.y < zn.y1 + b.r && b.y > zn.y0 - 1 && inZone(zn, b.x, b.z)) inWater = zn;
    b.vy -= 20 * h;
    if (inWater) {
      const sub = Math.min(1, Math.max(0, (inWater.y1 - (b.y - b.r)) / (2 * b.r)));
      if (b.def.float) b.vy += 34 * sub * h;
      const k = Math.max(0, 1 - 2.5 * h);
      b.vx *= k; b.vz *= k; b.vy *= Math.max(0, 1 - 4 * h);
      if (inWater.wave) b.vx += Math.sin(performance.now() / 900) * 0.4 * h;
      if (!b.wet) { b.wet = true; if (Math.abs(b.vy) > 1.5) { G.fx.burst('splash', b.x, inWater.y1, b.z, 14, { power: 0.5 }); G.audio.play('plop', { vol: 0.6 }); } }
    } else b.wet = false;
    b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
    // ground
    const g = W.groundAt(b.x, b.z, b.y - b.r + 0.25, 0.3);
    b.ground = false;
    if (g.y > -Infinity && b.y - b.r < g.y) {
      b.y = g.y + b.r;
      if (b.vy < -1.2) { b.vy = -b.vy * b.def.bounce; if (b.vy > 0.8 && !b.held) G.audio.play(b.def.heavy ? 'clunk' : 'pop', { vol: Math.min(1, b.vy / 4) }); }
      else b.vy = 0;
      b.ground = true;
      const ice = W.zoneAt(b.x, b.y, b.z, 'ice');
      const fr = ice ? 0.05 : b.def.fric !== undefined ? b.def.fric : b.def.roll ? 0.6 : 4;
      const k = Math.max(0, 1 - fr * h);
      b.vx *= k; b.vz *= k;
      // roll down ramps
      if (g.ramp) { const sl = (g.ramp.y1 - g.ramp.y0) / g.ramp.len; const a = -9.8 * sl * g.ramp.dir * (b.def.roll ? 0.7 : 0.15); if (g.ramp.axis === 'x') b.vx += a * h; else b.vz += a * h; }
    }
    // walls & static props
    const r = b.r;
    const boxes = W.collect(b.x - r - 0.3, b.z - r - 0.3, b.x + r + 0.3, b.z + r + 0.3, b.y - r, b.y + r, this._boxes);
    for (const bx of boxes) {
      if (bx.off || bx.lane || b.y + r < bx.y0 || b.y - r > bx.y1) continue;
      const cx = Math.max(bx.x0, Math.min(b.x, bx.x1)), cz = Math.max(bx.z0, Math.min(b.z, bx.z1));
      const dx = b.x - cx, dz = b.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      // resting on top of a low box (e.g. counters)?
      if (b.y - r > bx.y1 - 0.15 && b.vy <= 0) { b.y = bx.y1 + r; b.vy = 0; b.ground = true; continue; }
      const d = Math.sqrt(d2) || 1e-4, nx = d2 > 1e-8 ? dx / d : 1, nz = d2 > 1e-8 ? dz / d : 0;
      b.x += nx * (r - d); b.z += nz * (r - d);
      const vn = b.vx * nx + b.vz * nz;
      if (vn < 0) { b.vx -= (1 + Math.max(0.2, b.def.bounce)) * vn * nx; b.vz -= (1 + Math.max(0.2, b.def.bounce)) * vn * nz; if (vn < -2) G.audio.play('pop', { vol: 0.4 }); }
    }
    // player kicks
    const P = G.player;
    if (P.mode === 'walk') {
      const dx = b.x - P.pos.x, dz = b.z - P.pos.z, d = Math.hypot(dx, dz);
      if (d < r + 0.34 && b.y > P.pos.y - 0.2 && b.y < P.pos.y + 1.8 && d > 1e-4) {
        const nx = dx / d, nz = dz / d;
        b.x += nx * (r + 0.34 - d); b.z += nz * (r + 0.34 - d);
        const pv = P.vel.x * nx + P.vel.z * nz;
        if (pv > 0.2) { const k = b.def.heavy ? 0.6 : 1.4; b.vx += nx * pv * k; b.vz += nz * pv * k; b.vy += b.def.heavy ? 0 : pv * 0.4; b.wx = (Math.random() - 0.5) * 10; b.wz = (Math.random() - 0.5) * 10; }
      }
    }
  }
  // bodies near a point for pick-up targeting
  near(x, y, z, d, out) {
    for (const b of this.bodies) if (!b.held && Math.abs(b.x - x) < d && Math.abs(b.z - z) < d && Math.abs(b.y - y) < d + 1.5) out.push(b);
    return out;
  }
}
