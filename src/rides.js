// Rideable attractions. Each ride owns its moving geometry (built when the player is near),
// animates continuously, and can carry the player: the camera is attached to a seat while the
// player keeps free look. Rides: roller coaster, Ferris wheel, carousel, drop tower, swing ride,
// teacups, bumper cars (drivable), water slides and the ski chairlift.
import * as THREE from 'three';
import { GB, TPL } from './builder.js';
import { hsl } from './props.js';
import { POOL_SURFACE } from './features.js';

const W = [1, 1, 1], DARK = [0.08, 0.08, 0.09];
const ZERO = new THREE.Vector3(), _v = new THREE.Vector3(), _u = new THREE.Vector3(0, 1, 0), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();

function buildGroup(M, fn) {
  const gb = new GB(); fn(gb);
  const g = new THREE.Group(); gb.build(g);
  for (const c of g.children) c.matrixAutoUpdate = true;
  return g;
}
function seatFromBasis(obj, local) {
  obj.updateWorldMatrix(true, false);
  const pos = new THREE.Vector3(...local).applyMatrix4(obj.matrixWorld);
  const quat = new THREE.Quaternion(); obj.getWorldQuaternion(quat);
  return { pos, quat };
}

// ------------------------------------------------------------------ base
class Ride {
  constructor(R, def) { this.R = R; this.G = R.G; this.def = def; this.group = null; this.t = 0; this.riding = false; this.timer = 0; }
  get M() { return this.G.mats; }
  center() { return this.def.plan.x !== undefined ? [this.def.plan.x, this.def.plan.z] : [this.def.board.x, this.def.board.z]; }
  ensure() { if (!this.group) { this.group = new THREE.Group(); this.build(); this.G.scene.add(this.group); } }
  dispose() {
    if (!this.group) return;
    this.G.scene.remove(this.group);
    this.group.traverse((o) => o.geometry && o.geometry.dispose());
    this.group = null;
  }
  board() { this.riding = true; this.timer = 0; }
  exitPoint() { return [this.def.board.x, 0, this.def.board.z]; }
  hud() { return `${this.def.name} · press E to get off`; }
}

// ------------------------------------------------------------------ roller coaster
class Coaster extends Ride {
  build() {
    const pts = this.def.plan.pts, N = pts.length;
    this.pts = pts.map((p) => new THREE.Vector3(...p));
    this.s = [0];
    for (let i = 1; i <= N; i++) this.s.push(this.s[i - 1] + this.pts[i - 1].distanceTo(this.pts[i % N]));
    this.len = this.s[N];
    this.st = this.s[this.def.plan.station];
    let peak = 0; for (let i = 0; i < N; i++) if (pts[i][1] > pts[peak][1]) peak = i;
    this.peakRel = ((this.s[peak] - this.st) % this.len + this.len) % this.len;
    this.peakH = pts[peak][1];
    this.cars = [];
    for (let c = 0; c < 5; c++) {
      const car = buildGroup(this.M, (gb) => {
        const col = c === 0 ? [0.95, 0.75, 0.1] : [0.9, 0.15, 0.2];
        gb.box(this.M.gloss, 0, -0.35, 0, 1.4, 0.75, 2.0, col);
        gb.box(this.M.gloss, 0, 0.1, -0.85, 1.4, 0.22, 0.2, DARK);
        gb.box(this.M.leather, 0, 0.1, 0.1, 1.2, 0.1, 0.9, DARK);
        gb.box(this.M.leather, 0, 0.1, 0.55, 1.2, 0.6, 0.12, DARK);
        gb.box(this.M.chrome, 0, 0.6, 0.0, 1.2, 0.06, 0.06, [0.9, 0.9, 0.9]);
        if (c === 0) gb.box(this.M.gloss, 0, -0.35, -1.1, 1.4, 0.4, 0.3, [0.95, 0.75, 0.1]);
      });
      this.group.add(car); this.cars.push(car);
    }
    this.rel = 0; this.v = 0; this.state = 'station'; this.wait = 4;
  }
  at(sAbs) {
    const L = this.len; sAbs = ((sAbs % L) + L) % L;
    let lo = 0, hi = this.s.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.s[m] <= sAbs) lo = m; else hi = m; }
    const f = (sAbs - this.s[lo]) / (this.s[lo + 1] - this.s[lo] || 1);
    const a = this.pts[lo % this.pts.length], b = this.pts[(lo + 1) % this.pts.length];
    return { p: new THREE.Vector3().lerpVectors(a, b, f), d: new THREE.Vector3().subVectors(b, a).normalize() };
  }
  animate(dt) {
    if (this.state === 'station') { this.v = 0; this.wait -= dt; if (this.wait <= 0) { this.state = 'lift'; this.G.audio.play('chain'); } }
    else if (this.state === 'lift') { this.v = 4.5; if (this.rel >= this.peakRel) this.state = 'run'; }
    else if (this.state === 'run') {
      const h = this.at(this.st + this.rel).p.y;
      this.v = Math.min(30, Math.sqrt(Math.max(9, 4.5 * 4.5 + 2 * 9.8 * (this.peakH - h))) * 0.97);
      const toStation = this.len - this.rel;
      if (toStation < 30) this.v = Math.max(1.0, Math.min(this.v, toStation * 0.45));
      if (toStation < 0.6) { this.rel = 0; this.state = 'station'; this.wait = 6; if (this.riding) this.R.finish('What a ride! Back at the station'); }
    }
    this.rel += this.v * dt;
    if (this.state === 'run' && this.rel >= this.len) { this.rel = 0; this.state = 'station'; this.wait = 6; if (this.riding) this.R.finish('What a ride!'); }
    for (let c = 0; c < this.cars.length; c++) {
      const { p, d } = this.at(this.st + this.rel - c * 2.3);
      const car = this.cars[c];
      car.position.set(p.x, p.y + 0.45, p.z);
      _m.lookAt(ZERO, d, _u);
      car.quaternion.setFromRotationMatrix(_m);
    }
    if (this.riding) this.G.audio.setLoopRate('rumble', 120 + this.v * 18);
  }
  board() { super.board(); if (this.state !== 'station') { this.rel = 0; this.state = 'station'; } this.wait = 3; this.G.audio.loop('rumble', true, 0.25); }
  seat() { return seatFromBasis(this.cars[0], [0, 0.7, 0.2]); }
  hud() { return `${this.def.name} · ${(this.v * 3.6).toFixed(0)} km/h · ${this.state === 'station' ? 'departing soon' : this.state === 'lift' ? 'climbing the lift hill' : 'hold on!'} · E to get off`; }
}

// ------------------------------------------------------------------ Ferris wheel
class Wheel extends Ride {
  build() {
    const p = this.def.plan, M = this.M, R = p.R;
    this.base = new THREE.Group(); this.base.position.set(p.x, 0, p.z); this.base.rotation.y = p.rot; this.group.add(this.base);
    this.hubY = R + 2.2;
    this.wheel = buildGroup(M, (gb) => {
      for (const sx of [-0.9, 0.9]) {
        for (let i = 0; i < 48; i++) {
          const a0 = (i / 48) * Math.PI * 2, a1 = ((i + 1) / 48) * Math.PI * 2;
          gb.beam(M.metal, [sx, Math.sin(a0) * R, Math.cos(a0) * R], [sx, Math.sin(a1) * R, Math.cos(a1) * R], 0.18, 0.18, [0.92, 0.92, 0.95]);
          if (i % 3 === 0) gb.sphere(M.light, sx * 1.1, Math.sin(a0) * R, Math.cos(a0) * R, 0.09, i % 2 ? [1.4, 1.1, 0.5] : [0.6, 1.0, 1.5]);
        }
        for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; gb.beam(M.metal, [sx, 0, 0], [sx, Math.sin(a) * R, Math.cos(a) * R], 0.08, 0.08, [0.92, 0.92, 0.95]); }
      }
    });
    this.wheel.position.y = this.hubY;
    this.base.add(this.wheel);
    this.gondolas = [];
    for (let i = 0; i < 16; i++) {
      const c = hsl((i * 360) / 16, 0.75, 0.55);
      const g = buildGroup(M, (gb) => {
        gb.beam(M.metal, [0, 0, 0], [0, -0.9, 0], 0.05, 0.05, DARK);
        gb.box(M.gloss, 0, -2.75, 0, 1.5, 0.15, 1.4, c);
        gb.box(M.gloss, 0, -2.6, 0.65, 1.5, 0.75, 0.1, c); gb.box(M.gloss, 0, -2.6, -0.65, 1.5, 0.75, 0.1, c);
        gb.box(M.glass, 0, -1.85, 0, 1.52, 0.75, 1.42, W);
        gb.geo(M.gloss, TPL.cone, 0, -0.7, 0, 1.7, 0.4, 1.6, c);
        gb.box(M.leather, 0, -2.6, -0.3, 1.3, 0.12, 0.5, DARK);
      });
      this.base.add(g); this.gondolas.push(g);
    }
    this.ang = 0; this.omega = 0.11;
  }
  animate(dt) {
    this.ang += this.omega * dt;
    this.wheel.rotation.x = this.ang;
    const R = this.def.plan.R;
    this.gondolas.forEach((g, i) => { const a = (i / 16) * Math.PI * 2 + this.ang; g.position.set(0, this.hubY + Math.sin(a) * R, Math.cos(a) * R); });
    if (this.riding) {
      this.timer += dt;
      const a = (this.k / 16) * Math.PI * 2 + this.ang;
      if (this.timer > 20 && Math.sin(a) < -0.995) this.R.finish('Thanks for riding the Ferris wheel!');
    }
  }
  board() {
    super.board();
    let best = 0, by = 1e9;
    this.gondolas.forEach((g, i) => { if (g.position.y < by) { by = g.position.y; best = i; } });
    this.k = best;
  }
  seat() { return seatFromBasis(this.gondolas[this.k], [0, -2.0, -0.3]); }
  hud() { const g = this.gondolas[this.k]; return `${this.def.name} · ${g.position.y.toFixed(0)} m up · E to get off`; }
}

// ------------------------------------------------------------------ carousel
class Carousel extends Ride {
  build() {
    const p = this.def.plan, M = this.M, R = p.R;
    this.spin = buildGroup(M, (gb) => {
      gb.vcyl(M.wood, 0, 0, 0, R, 0.45, [0.85, 0.75, 0.55], TPL.cyl20);
      gb.vcyl(M.gold, 0, 0.45, 0, 0.5, 4.2, [1, 0.85, 0.5], TPL.cyl20);
      gb.vcyl(M.gloss, 0, 4.4, 0, R + 0.3, 0.5, [0.9, 0.2, 0.25], TPL.cyl20);
      gb.geo(M.gloss, TPL.cone, 0, 5.65, 0, (R + 0.5) * 2, 2.0, (R + 0.5) * 2, [0.98, 0.95, 0.9]);
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; gb.sphere(M.light, Math.cos(a) * (R + 0.32), 4.6, Math.sin(a) * (R + 0.32), 0.07, [1.5, 1.3, 0.7]); }
    });
    this.spin.position.set(p.x, 0, p.z);
    this.group.add(this.spin);
    this.horses = [];
    for (let ring = 0; ring < 2; ring++) {
      const rr = R * (ring ? 0.55 : 0.82), n = ring ? 8 : 14;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ring * 0.2;
        const c = i % 3 === 0 ? W : i % 3 === 1 ? [0.45, 0.3, 0.2] : [0.15, 0.15, 0.15];
        this.spin.add(buildGroup(M, (gb) => { gb.vcyl(M.gold, Math.cos(a) * rr, 0.45, Math.sin(a) * rr, 0.035, 3.95, [1, 0.85, 0.5]); }));
        const h = buildGroup(M, (gb) => {
          gb.box(M.gloss, 0, 0, 0, 0.32, 0.45, 1.1, c); gb.box(M.gloss, 0, 0.3, 0.55, 0.25, 0.5, 0.3, c);
          for (const [lx, lz] of [[-0.1, -0.4], [0.1, -0.4], [-0.1, 0.4], [0.1, 0.4]]) gb.box(M.gloss, lx, -0.5, lz, 0.07, 0.5, 0.07, c);
          gb.box(M.leather, 0, 0.45, 0, 0.34, 0.06, 0.4, [0.8, 0.1, 0.15]);
        });
        h.userData = { a, rr, ph: i * 0.9 };
        h.rotation.y = -a;
        this.spin.add(h); this.horses.push(h);
      }
    }
    this.ang = 0;
  }
  animate(dt) {
    this.t += dt;
    this.ang += 0.55 * dt;
    this.spin.rotation.y = this.ang;
    for (const h of this.horses) { const u = h.userData; h.position.set(Math.cos(u.a) * u.rr, 1.3 + Math.sin(this.t * 2.4 + u.ph) * 0.3, Math.sin(u.a) * u.rr); }
    if (this.riding) { this.timer += dt; if (this.timer > 40) this.R.finish('The carousel slows to a stop'); }
  }
  seat() { return seatFromBasis(this.horses[0], [0, 0.5, 0]); }
}

// ------------------------------------------------------------------ drop tower
class Drop extends Ride {
  build() {
    const p = this.def.plan, M = this.M;
    this.ring = buildGroup(M, (gb) => {
      gb.vcyl(M.gloss, 0, 0, 0, 2.4, 1.2, [0.15, 0.2, 0.6], TPL.cyl20);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; gb.push(Math.cos(a) * 2.6, -0.9, Math.sin(a) * 2.6, -a + Math.PI / 2); gb.box(M.plastic, 0, 0, 0, 0.55, 0.9, 0.5, [0.95, 0.85, 0.2]); gb.box(M.chrome, 0, 0.9, 0.25, 0.5, 0.06, 0.06, [0.9, 0.9, 0.9]); gb.pop(); }
    });
    this.ring.position.set(p.x, 1.0, p.z);
    this.group.add(this.ring);
    this.phase = 'load'; this.pt = 0; this.y = 1.0; this.v = 0;
  }
  animate(dt) {
    const h = this.def.plan.h;
    this.pt += dt;
    if (this.phase === 'load') { this.y = 1.0; if (this.pt > (this.riding ? 3 : 6)) { this.phase = 'up'; this.pt = 0; } }
    else if (this.phase === 'up') { this.y = Math.min(h - 2.5, this.y + 1.6 * dt); if (this.y >= h - 2.5) { this.phase = 'hold'; this.pt = 0; } }
    else if (this.phase === 'hold') { if (this.pt > 2.5) { this.phase = 'drop'; this.pt = 0; this.v = 0; if (this.riding) this.G.audio.play('whoosh'); } }
    else if (this.phase === 'drop') {
      if (this.y > 6) this.v += 9.8 * dt; else this.v = Math.max(1, this.v - 30 * dt);
      this.y -= this.v * dt;
      if (this.y <= 1.0) { this.y = 1.0; this.phase = 'load'; this.pt = 0; if (this.riding) this.R.finish('Your stomach is still up there!'); }
    }
    this.ring.position.y = this.y;
    this.ring.rotation.y += dt * 0.1;
  }
  board() { super.board(); if (this.phase !== 'load') { this.phase = 'load'; this.y = 1; } this.pt = 0; }
  seat() { return seatFromBasis(this.ring, [2.6, -0.4, 0]); }
  hud() { return `${this.def.name} · ${this.y.toFixed(0)} m · ${this.phase === 'hold' ? 'wait for it...' : this.phase} · E to get off`; }
}

// ------------------------------------------------------------------ swing ride
class Swing extends Ride {
  build() {
    const p = this.def.plan, M = this.M;
    this.top = buildGroup(M, (gb) => { gb.geo(M.gloss, TPL.cone, 0, 0.8, 0, 9, 1.8, 9, [0.2, 0.5, 0.9]); gb.vcyl(M.gloss, 0, -0.2, 0, 4.4, 0.3, [0.95, 0.8, 0.2], TPL.cyl20); });
    this.top.position.set(p.x, 12, p.z);
    this.group.add(this.top);
    this.swings = [];
    for (let i = 0; i < 16; i++) {
      const arm = new THREE.Group(); arm.rotation.y = (i / 16) * Math.PI * 2;
      const pivot = new THREE.Group(); pivot.position.set(4.2, -0.2, 0); arm.add(pivot);
      const s = buildGroup(M, (gb) => { gb.beam(M.metal, [0, 0, 0], [0, -6, 0], 0.03, 0.03, DARK); gb.box(M.plastic, 0, -6.5, 0, 0.5, 0.5, 0.5, hsl(i * 22, 0.8, 0.55)); });
      pivot.add(s); this.top.add(arm); this.swings.push(pivot);
    }
    this.ang = 0; this.w = 0;
  }
  animate(dt) {
    this.t += dt;
    const cyc = this.t % 30;
    const target = cyc < 22 ? 1.4 : 0.15;
    this.w += (target - this.w) * Math.min(1, dt * 0.4);
    this.ang += this.w * dt;
    this.top.rotation.y = this.ang;
    const tilt = Math.atan((this.w * this.w * 6) / 9.8);
    for (const p of this.swings) p.rotation.z = tilt;
    this.top.position.y = 12 + Math.min(1, this.w) * 1.5;
    if (this.riding) { this.timer += dt; if (this.timer > 32) this.R.finish('Feet back on the ground'); }
  }
  seat() { return seatFromBasis(this.swings[0], [0, -6.3, 0]); }
}

// ------------------------------------------------------------------ teacups
class Teacups extends Ride {
  build() {
    const p = this.def.plan, M = this.M;
    this.plat = buildGroup(M, (gb) => { gb.vcyl(M.gloss, 0, 0, 0, 8, 0.3, [0.95, 0.85, 0.9], TPL.cyl20); gb.geo(M.gloss, TPL.hemi, 0, 0.3, 0, 3, 3, 3, [0.9, 0.4, 0.6]); });
    this.plat.position.set(p.x, 0, p.z);
    this.group.add(this.plat);
    this.cups = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2, c = hsl(i * 60, 0.7, 0.6);
      const cup = buildGroup(M, (gb) => { gb.geo(M.gloss, TPL.hemi, 0, 1.4, 0, 2.4, 1.2, 2.4, c, Math.PI); gb.geo(M.gloss, TPL.torus, 0, 1.4, 0, 2.4, 2.4, 2.4, [c[0] * 0.8, c[1] * 0.8, c[2] * 0.8], Math.PI / 2); gb.vcyl(M.chrome, 0, 0.3, 0, 0.3, 0.6, [0.9, 0.9, 0.9]); });
      cup.position.set(Math.cos(a) * 5, 0, Math.sin(a) * 5);
      this.plat.add(cup); this.cups.push(cup);
    }
  }
  animate(dt) {
    this.t += dt;
    this.plat.rotation.y += dt * 0.35;
    this.cups.forEach((c, i) => { c.rotation.y += dt * (1.2 + Math.sin(this.t * 0.3 + i) * 1.2); });
    if (this.riding) { this.timer += dt; if (this.timer > 30) this.R.finish('That was dizzying!'); }
  }
  seat() { return seatFromBasis(this.cups[0], [0.6, 0.6, 0]); }
}

// ------------------------------------------------------------------ bumper cars (drivable)
class Bumper extends Ride {
  build() {
    const p = this.def.plan, M = this.M;
    this.cars = [];
    for (let i = 0; i < 10; i++) {
      const col = hsl(i * 36, 0.85, 0.5);
      const g = buildGroup(M, (gb) => { gb.box(M.rubber, 0, 0, 0, 1.4, 0.3, 2.0, DARK); gb.box(M.gloss, 0, 0.3, 0, 1.2, 0.4, 1.7, col); gb.box(M.leather, 0, 0.55, 0.35, 0.8, 0.5, 0.15, DARK); gb.beam(M.metal, [0, 0.7, 0.6], [0, 4.3, 0.6], 0.03, 0.03, DARK); });
      g.position.set(p.x + (i % 5 - 2) * 3.2, 0.15, p.z + (i < 5 ? -3 : 3));
      g.userData = { vx: 0, vz: 0, h: Math.random() * 6, ai: Math.random() * 6 };
      this.group.add(g); this.cars.push(g);
    }
  }
  animate(dt) {
    const p = this.def.plan, I = this.G.input;
    this.t += dt;
    this.cars.forEach((c, i) => {
      const u = c.userData;
      let thr = 0, steer = 0;
      if (i === 0 && this.riding) { thr = I.forward; steer = -I.strafe; }
      else { u.ai -= dt; if (u.ai < 0) { u.ai = 1 + Math.random() * 2; u.st = (Math.random() - 0.5) * 2; } thr = 0.8; steer = u.st || 0; }
      u.h += steer * dt * 2.2 * (Math.abs(thr) > 0.1 ? 1 : 0.3);
      const fx = -Math.sin(u.h), fz = -Math.cos(u.h);
      u.vx += fx * thr * 7 * dt; u.vz += fz * thr * 7 * dt;
      u.vx *= Math.max(0, 1 - 1.5 * dt); u.vz *= Math.max(0, 1 - 1.5 * dt);
      c.position.x += u.vx * dt; c.position.z += u.vz * dt;
      const hx = p.w / 2 - 1.1, hz = p.d / 2 - 1.1;
      if (Math.abs(c.position.x - p.x) > hx) { c.position.x = p.x + Math.sign(c.position.x - p.x) * hx; u.vx = -u.vx * 0.6; if (i === 0 && this.riding) this.G.audio.play('bounce'); }
      if (Math.abs(c.position.z - p.z) > hz) { c.position.z = p.z + Math.sign(c.position.z - p.z) * hz; u.vz = -u.vz * 0.6; if (i === 0 && this.riding) this.G.audio.play('bounce'); }
      c.rotation.y = u.h;
    });
    for (let i = 0; i < this.cars.length; i++) for (let j = i + 1; j < this.cars.length; j++) {
      const a = this.cars[i], b = this.cars[j];
      const dx = b.position.x - a.position.x, dz = b.position.z - a.position.z, d = Math.hypot(dx, dz);
      if (d < 1.7 && d > 1e-3) {
        const nx = dx / d, nz = dz / d, push = (1.7 - d) / 2;
        a.position.x -= nx * push; a.position.z -= nz * push; b.position.x += nx * push; b.position.z += nz * push;
        const ua = a.userData, ub = b.userData;
        const rel = (ub.vx - ua.vx) * nx + (ub.vz - ua.vz) * nz;
        if (rel < 0) { ua.vx += rel * nx; ua.vz += rel * nz; ub.vx -= rel * nx; ub.vz -= rel * nz; if ((i === 0) && this.riding && rel < -1) { this.G.audio.play('bounce'); this.G.fx.burst('sparks', a.position.x, 0.6, a.position.z, 15); } }
      }
    }
  }
  seat() { return seatFromBasis(this.cars[0], [0, 0.6, 0.1]); }
  hud() { return `${this.def.name} · W/S drive, A/D steer · E to get out`; }
  drives() { return true; }
}

// ------------------------------------------------------------------ water slide
class Slide extends Ride {
  build() {
    const sl = this.def.plan;
    this.pts = sl.pts.map((p) => new THREE.Vector3(...p));
    this.s = [0];
    for (let i = 1; i < this.pts.length; i++) this.s.push(this.s[i - 1] + this.pts[i - 1].distanceTo(this.pts[i]));
    this.len = this.s[this.s.length - 1];
    this.rider = new THREE.Object3D(); this.group.add(this.rider);
    this.u = 0; this.v = 0;
  }
  animate(dt) {
    if (!this.riding) return;
    const top = this.def.plan.h;
    const i = this.s.findIndex((x) => x > this.u);
    const k = Math.max(1, i < 0 ? this.s.length - 1 : i);
    const a = this.pts[k - 1], b = this.pts[k];
    const f = (this.u - this.s[k - 1]) / (this.s[k] - this.s[k - 1] || 1);
    const p = new THREE.Vector3().lerpVectors(a, b, f);
    this.v = Math.min(16, Math.sqrt(4 + 2 * 9.8 * Math.max(0, top - p.y)) * 0.75);
    this.u += this.v * dt;
    const d = new THREE.Vector3().subVectors(b, a).normalize();
    this.rider.position.copy(p).add(_v.set(0, -0.15, 0));
    _m.lookAt(ZERO, d, _u);
    this.rider.quaternion.setFromRotationMatrix(_m);
    this.G.audio.setLoopRate('slide', 900 + this.v * 120);
    if (this.u >= this.len) {
      const end = this.pts[this.pts.length - 1];
      this.R.finish('SPLASH!', [end.x + d.x * 1.5, POOL_SURFACE - 0.8, end.z + d.z * 1.5], [d.x * 5, 0, d.z * 5]);
      this.G.fx.burst('splash', end.x, POOL_SURFACE, end.z, 90, { power: 1.6 });
      this.G.audio.play('splash');
    }
  }
  board() { super.board(); this.u = 0; this.G.audio.loop('slide', true, 0.15); this.G.flash('You climb the tower stairs... and push off!'); }
  seat() { return { pos: this.rider.position.clone(), quat: this.rider.quaternion.clone() }; }
  hud() { return `${this.def.name} · ${(this.v * 3.6).toFixed(0)} km/h`; }
}

// ------------------------------------------------------------------ ski chairlift
class Lift extends Ride {
  build() {
    const pl = this.def.plan, sl = pl.sl, M = this.M;
    this.cross = pl.c - 1.2;
    this.chairs = [];
    this.N = Math.max(8, Math.floor((sl.len + 6) / 12));
    for (let i = 0; i < this.N; i++) {
      const g = buildGroup(M, (gb) => { gb.box(M.metal, 0, 0, 0, 0.06, 2.3, 0.06, DARK); gb.box(M.gloss, 0, -0.15, 0, sl.axis === 'x' ? 0.7 : 1.4, 0.15, sl.axis === 'x' ? 1.4 : 0.7, [0.85, 0.15, 0.15]); gb.box(M.gloss, sl.axis === 'x' ? -0.35 : 0, 0, sl.axis === 'x' ? 0 : -0.35, sl.axis === 'x' ? 0.08 : 1.4, 0.6, sl.axis === 'x' ? 1.4 : 0.08, [0.85, 0.15, 0.15]); });
      this.group.add(g); this.chairs.push(g);
    }
    this.off = 0;
  }
  posAt(u) { // u along the lift from bottom (t0-2) to top
    const sl = this.def.plan.sl;
    const t = sl.t0 - 2 + u;
    const groundY = t < sl.t0 ? 0 : sl.y0 + Math.min(1, (t - sl.t0) / sl.len) * (sl.y1 - sl.y0);
    const y = groundY + 2.6 + Math.min(1, Math.max(0, u / 6)) * 2.0;
    return sl.axis === 'x' ? [t, y, this.cross] : [this.cross, y, t];
  }
  animate(dt) {
    const sl = this.def.plan.sl, L = sl.len + 2;
    this.off = (this.off + dt * 2.2) % (L / this.N);
    this.chairs.forEach((c, i) => { const u = (this.off + (i * L) / this.N) % L; const p = this.posAt(u); c.position.set(p[0], p[1], p[2]); });
    if (this.riding) {
      this.u += dt * 2.2;
      if (this.u >= L - 1) {
        const top = sl.axis === 'x' ? [sl.t0 + sl.len - 4, sl.y1, (sl.lo + sl.hi) / 2] : [(sl.lo + sl.hi) / 2, sl.y1, sl.t0 + sl.len - 4];
        this.R.finish('You hop off at the summit. Slide back down! (hold C to crouch for speed)', top, null, sl.axis === 'x' ? Math.PI / 2 : 0);
      }
    }
  }
  board() { super.board(); this.u = 0; }
  seat() {
    const p = this.posAt(this.u), sl = this.def.plan.sl;
    _e.set(0, sl.axis === 'x' ? -Math.PI / 2 : Math.PI, 0);
    return { pos: new THREE.Vector3(p[0], p[1] - 0.1, p[2]), quat: new THREE.Quaternion().setFromEuler(_e) };
  }
  hud() { const sl = this.def.plan.sl; return `${this.def.name} · ${(this.u / (sl.len + 2) * 100).toFixed(0)}% to the summit · E to jump off`; }
}

const TYPES = { coaster: Coaster, wheel: Wheel, carousel: Carousel, drop: Drop, swing: Swing, teacups: Teacups, bumper: Bumper, slide: Slide, lift: Lift };

// ------------------------------------------------------------------ manager
export class Rides {
  constructor(G) { this.G = G; this.list = []; this.active = null; }
  setMall(mall) {
    for (const r of this.list) r.dispose();
    this.list = mall.rides.map((d) => new TYPES[d.type](this, d));
    this.active = null;
  }
  update(dt) {
    const P = this.G.player.pos;
    for (const r of this.list) {
      const [cx, cz] = r.center();
      const near = Math.hypot(cx - P.x, cz - P.z) < 280 && P.y > -3;
      if (near || r.riding) { r.ensure(); r.animate(dt); } else r.dispose();
    }
  }
  board(id) {
    const r = this.list.find((q) => q.def.id === id);
    if (!r || this.active) return;
    r.ensure();
    if (this.G.held) { this.G.phys.remove(this.G.held); this.G.held = null; }
    this.active = r;
    r.board();
    this.G.player.mode = 'ride';
    this.G.player.yaw = 0; this.G.player.pitch = 0;
    this.G.audio.play('beep');
    this.G.flash(`Boarding the ${r.def.name}...`);
  }
  // end of ride: optional custom exit position and launch velocity
  finish(msg, pos, vel, yaw) {
    const r = this.active;
    if (!r) return;
    r.riding = false;
    this.active = null;
    this.G.audio.loop('rumble', false); this.G.audio.loop('slide', false);
    const P = this.G.player;
    const p = pos || r.exitPoint();
    P.mode = 'walk';
    P.teleport(p[0], p[1], p[2]);
    if (vel) { P.vel.set(vel[0], vel[1], vel[2]); }
    P.yaw = yaw !== undefined ? yaw : P.yaw; P.pitch = 0;
    if (msg) this.G.flash(msg);
  }
  exit() { if (this.active) this.finish(`You get off the ${this.active.def.name}`); }
  applyCamera(cam) {
    const r = this.active;
    if (!r) return;
    const { pos, quat } = r.seat();
    const P = this.G.player;
    _e.set(P.pitch, P.yaw, 0, 'YXZ');
    _q.setFromEuler(_e);
    cam.quaternion.copy(quat).multiply(_q);
    cam.position.copy(pos).add(_v.set(0, 0.75, 0).applyQuaternion(quat));
    P.pos.set(cam.position.x, cam.position.y - 1.6, cam.position.z);
  }
}
