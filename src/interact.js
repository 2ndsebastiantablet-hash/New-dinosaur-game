// Interaction system: finds what the player is looking at, shows a prompt, and runs the action.
// Also owns the dynamic world objects that interactions drive: doors, sliding entrance doors,
// bowling pins, mini-golf, cinema screens.
import * as THREE from 'three';
import { CELL, LEVEL_NAMES, levelY } from './config.js';
import { ITEM_LABEL } from './phys.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler();
const Y_AXIS = new THREE.Vector3(0, 1, 0);

function frameAt(frame, lx, ly, lz) {
  const c = Math.cos(frame[3]), s = Math.sin(frame[3]);
  return [frame[0] + lx * c + lz * s, frame[1] + ly, frame[2] - lx * s + lz * c];
}
function setInst(mesh, i, pos, yaw, quat) {
  if (quat) _q.copy(quat); else _q.setFromAxisAngle(Y_AXIS, yaw);
  _m.compose(_v.set(pos[0], pos[1], pos[2]), _q, _s);
  mesh.setMatrixAt(i, _m);
}
const hide = (mesh, i) => { _m.makeScale(0, 0, 0); mesh.setMatrixAt(i, _m); };

// ------------------------------------------------------------------ doors
class Doors {
  constructor(G) {
    this.G = G;
    this.state = new Map();
    const leaf = new THREE.BoxGeometry(1.38, 2.24, 0.05).translate(0.69, 1.12, 0);
    this.mesh = new THREE.InstancedMesh(leaf, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.3 }), 2048);
    this.mesh.frustumCulled = false; this.mesh.count = 2048;
    for (let i = 0; i < 2048; i++) hide(this.mesh, i);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(2048 * 3).fill(0.6), 3);
    const pane = new THREE.BoxGeometry(1.75, 2.42, 0.04).translate(0.875, 1.21, 0);
    this.auto = new THREE.InstancedMesh(pane, new THREE.MeshStandardMaterial({ color: 0xcfe6ee, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.2, depthWrite: false }), 1024);
    this.auto.frustumCulled = false;
    for (let i = 0; i < 1024; i++) hide(this.auto, i);
    G.scene.add(this.mesh, this.auto);
    this.free = Array.from({ length: 2048 }, (_, i) => 2047 - i);
    this.freeA = Array.from({ length: 1024 }, (_, i) => 1023 - i);
    this.active = new Set();
  }
  st(key) { let s = this.state.get(key); if (!s) { s = { t: 0, target: 0, timer: 0 }; this.state.set(key, s); } return s; }
  add(it, rec) {
    const d = it.data;
    const s = this.st(d.key);
    s.it = it; s.frame = d.frame;
    if (it.kind === 'door') {
      s.idx = this.free.pop();
      if (s.idx === undefined) return;
      const c = d.staff ? [0.62, 0.64, 0.68] : [0.45, 0.5, 0.58];
      this.mesh.instanceColor.setXYZ(s.idx, c[0], c[1], c[2]);
      this.mesh.instanceColor.needsUpdate = true;
      const a = frameAt(d.frame, 1.3, 0, -0.08), b = frameAt(d.frame, 2.7, 2.3, 0.08);
      s.col = { x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), z0: Math.min(a[2], b[2]), z1: Math.max(a[2], b[2]), y0: a[1], y1: b[1], off: false };
    } else {
      s.idx = this.freeA.pop(); s.idx2 = this.freeA.pop();
      if (s.idx2 === undefined) return;
      const a = frameAt(d.frame, 0.25, 0, -0.1), b = frameAt(d.frame, 3.75, 3, 0.1);
      s.col = { x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), z0: Math.min(a[2], b[2]), z1: Math.max(a[2], b[2]), y0: a[1], y1: b[1], off: false };
    }
    rec.colliders.push(s.col);
    this.active.add(s);
    this.pose(s);
  }
  release(it) {
    const s = this.state.get(it.data.key);
    if (!s || s.idx === undefined) return;
    if (it.kind === 'door') { hide(this.mesh, s.idx); this.free.push(s.idx); this.mesh.instanceMatrix.needsUpdate = true; }
    else { hide(this.auto, s.idx); hide(this.auto, s.idx2); this.freeA.push(s.idx, s.idx2); this.auto.instanceMatrix.needsUpdate = true; }
    s.idx = s.idx2 = undefined;
    this.active.delete(s);
  }
  toggle(it) {
    const s = this.st(it.data.key);
    s.target = s.target ? 0 : 1; s.timer = 0;
    this.G.audio.play(s.target ? 'door' : 'doorClose');
  }
  pose(s) {
    if (s.idx === undefined) return;
    const d = s.it.data;
    if (s.it.kind === 'door') {
      const p = frameAt(s.frame, 1.3, 0, 0);
      setInst(this.mesh, s.idx, p, s.frame[3] - d.swing * s.t * Math.PI * 0.5 * 0.95);
      s.col.off = s.t > 0.35;
      this.mesh.instanceMatrix.needsUpdate = true;
    } else {
      const off = s.t * 1.6;
      setInst(this.auto, s.idx, frameAt(s.frame, 0.25 - off, 0, 0), s.frame[3]);
      setInst(this.auto, s.idx2, frameAt(s.frame, 2.0 + off, 0, 0), s.frame[3]);
      s.col.off = s.t > 0.6;
      this.auto.instanceMatrix.needsUpdate = true;
    }
  }
  update(dt) {
    const P = this.G.player.pos;
    for (const s of this.active) {
      const it = s.it;
      const dist = Math.hypot(it.x - P.x, it.z - P.z);
      if (it.kind === 'autodoor') {
        const want = dist < 5 && Math.abs(it.y - 1.2 - P.y) < 3 ? 1 : 0;
        if (want !== s.target) { s.target = want; this.G.audio.play('slide', { vol: 0.5 }); }
      } else if (s.target === 1) {
        s.timer += dt;
        if (s.timer > 14 && dist > 3) { s.target = 0; this.G.audio.play('doorClose', { vol: 0.5 }); }
      }
      if (s.t !== s.target) {
        const sp = it.kind === 'autodoor' ? 2.2 : 2.6;
        s.t = s.target > s.t ? Math.min(s.target, s.t + dt * sp) : Math.max(s.target, s.t - dt * sp);
        this.pose(s);
      }
    }
  }
}

// ------------------------------------------------------------------ bowling (physics pins)
class Bowling {
  constructor(G) {
    this.G = G;
    const pts = [[0, 0], [0.028, 0.0], [0.045, 0.04], [0.06, 0.12], [0.05, 0.2], [0.028, 0.27], [0.032, 0.32], [0.026, 0.37], [0, 0.38]].map(([x, y]) => new THREE.Vector2(x, y));
    const geo = new THREE.LatheGeometry(pts, 12);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.25 }), 1200);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < 1200; i++) hide(this.mesh, i);
    G.scene.add(this.mesh);
    this.free = Array.from({ length: 1200 }, (_, i) => 1199 - i);
    this.lanes = new Map();
  }
  add(it) {
    const L = it.data.lane;
    if (this.lanes.has(L.id)) return;
    const pins = [];
    for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) {
      const idx = this.free.pop();
      if (idx === undefined) return;
      pins.push({ idx, a0: L.len - 1.2 + row * 0.26, s0: (i - row / 2) * 0.3 });
    }
    const lane = { L, pins, it, state: 'ready', timer: 0 };
    this.reset(lane);
    this.lanes.set(L.id, lane);
  }
  release(it) {
    const lane = this.lanes.get(it.data.lane.id);
    if (!lane) return;
    for (const p of lane.pins) { hide(this.mesh, p.idx); this.free.push(p.idx); }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.lanes.delete(it.data.lane.id);
  }
  reset(lane) {
    for (const p of lane.pins) { p.a = p.a0; p.s = p.s0; p.va = 0; p.vs = 0; p.tilt = 0; p.up = true; p.dir = 0; this.posePin(lane, p); }
    lane.state = 'ready'; lane.ball = null;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  w(L, a, s) { return [L.x + L.fx * a + L.sx * s, L.y, L.z + L.fz * a + L.sz * s]; }
  posePin(lane, p) {
    const L = lane.L;
    if (p.a > L.len + 0.2) { hide(this.mesh, p.idx); return; }
    const pos = this.w(L, p.a, p.s);
    // tilt around the axis perpendicular to the fall direction
    const fx = L.fx * Math.cos(p.dir) + L.sx * Math.sin(p.dir), fz = L.fz * Math.cos(p.dir) + L.sz * Math.sin(p.dir);
    _v.set(fz, 0, -fx).normalize();
    _q.setFromAxisAngle(_v, p.tilt);
    setInst(this.mesh, p.idx, [pos[0], pos[1] + 0.06, pos[2]], 0, _q);
  }
  bowl(it) {
    const G = this.G;
    if (G.held) { G.flash('Your hands are full: throw or drop what you are holding first'); return; }
    const lane = this.lanes.get(it.data.lane.id);
    if (lane && lane.state !== 'ready') { G.flash('Wait for the pinsetter to reset the lane'); return; }
    const b = G.phys.spawn('bowling', it.x, it.y, it.z);
    G.hold(b);
    if (lane) { lane.state = 'armed'; lane.ball = b; lane.timer = 0; }
    G.flash(`Lane ${it.data.lane.n}: aim down the lane and press E (or click) to roll`);
  }
  update(dt) {
    const G = this.G;
    let dirty = false;
    for (const lane of this.lanes.values()) {
      if (lane.state === 'ready' || lane.state === 'armed') { if (lane.state === 'armed' && lane.ball && lane.ball.dead) lane.state = 'ready'; if (!(lane.ball && !lane.ball.held)) continue; lane.state = 'rolling'; lane.timer = 0; G.audio.play('roll'); }
      const L = lane.L, b = lane.ball;
      lane.timer += dt;
      if (b && !b.dead && !b.held) {
        const rx = b.x - L.x, rz = b.z - L.z;
        const a = rx * L.fx + rz * L.fz, s = rx * L.sx + rz * L.sz;
        // gutters keep the ball on its lane
        if (a > 0 && a < L.len && Math.abs(s) > 0.55) { const sc = Math.sign(s) * 0.66; b.x = L.x + L.fx * a + L.sx * sc; b.z = L.z + L.fz * a + L.sz * sc; b.gutter = true; }
        if (!b.gutter) for (const p of lane.pins) {
          if (!p.up) continue;
          if (Math.hypot(a - p.a, s - p.s) < 0.17) this.knock(p, b, a, s, L);
        }
        if (a > L.len + 0.4) { G.phys.remove(b); lane.ball = null; }
      }
      // pin-on-pin
      for (const p of lane.pins) {
        if (p.up) continue;
        p.a += p.va * dt; p.s += p.vs * dt;
        p.va *= Math.max(0, 1 - 2 * dt); p.vs *= Math.max(0, 1 - 2 * dt);
        p.tilt = Math.min(Math.PI / 2, p.tilt + dt * 6);
        if (Math.hypot(p.va, p.vs) > 0.5) for (const q of lane.pins) if (q.up && Math.hypot(q.a - p.a, q.s - p.s) < 0.16) {
          q.up = false; q.va = p.va * 0.7 + (Math.random() - 0.5); q.vs = p.vs * 0.7 + (q.s - p.s) * 4; q.dir = Math.atan2(q.vs, q.va);
          G.audio.play('clack', { vol: 0.5 });
        }
        this.posePin(lane, p);
        dirty = true;
      }
      if ((!lane.ball || lane.ball.dead) && lane.state === 'rolling') {
        lane.state = 'scoring'; lane.timer = 0;
        const down = lane.pins.filter((p) => !p.up).length;
        if (down === 10) { G.flash('STRIKE!'); G.audio.play('strike'); G.fx.burst('confetti', ...this.w(L, L.len - 1, 0).map((v, i) => (i === 1 ? v + 1 : v)), 80); }
        else if (down === 0) G.flash('Gutter ball! 0 pins');
        else G.flash(`${down} pin${down > 1 ? 's' : ''} down`);
      }
      if (lane.state === 'rolling' && lane.timer > 12 && lane.ball && !lane.ball.dead) { G.phys.remove(lane.ball); }
      if (lane.state === 'scoring' && lane.timer > 3.5) { this.reset(lane); G.audio.play('chain'); dirty = true; }
    }
    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
  }
  knock(p, b, a, s, L) {
    const vA = b.vx * L.fx + b.vz * L.fz, vS = b.vx * L.sx + b.vz * L.sz;
    p.up = false;
    p.va = Math.max(1.5, vA * 0.6) + Math.random() * 0.5;
    p.vs = vS * 0.5 + (p.s - s) * 6 + (Math.random() - 0.5) * 1.5;
    p.dir = Math.atan2(p.vs, p.va);
    b.vx *= 0.94; b.vz *= 0.94;
    this.G.audio.play('clack', { vol: 0.8 });
  }
}

// ------------------------------------------------------------------ mini golf
class Golf {
  constructor(G) { this.G = G; this.balls = []; }
  tee(it) {
    const G = this.G, { tee, hole } = it.data;
    const old = this.balls.find((g) => g.hole === hole);
    if (old && !old.body.dead) G.phys.remove(old.body);
    const body = G.phys.spawn('golf', tee[0], tee[1] + 0.05, tee[2]);
    this.balls = this.balls.filter((g) => !g.body.dead);
    this.balls.push({ body, hole, strokes: 0 });
    G.flash('Ball placed. Look at the ball and press E to putt toward where you aim');
    G.audio.play('click');
  }
  putt(body) {
    const G = this.G, g = this.balls.find((q) => q.body === body);
    const f = G.player.forward2();
    const sp = 3.2;
    body.vx = f[0] * sp; body.vz = f[1] * sp;
    if (g) g.strokes++;
    G.audio.play('clack', { vol: 0.4 });
  }
  update() {
    const G = this.G;
    for (const g of this.balls) {
      const b = g.body;
      if (b.dead) continue;
      const d = Math.hypot(b.x - g.hole[0], b.z - g.hole[2]);
      if (d < 0.13 && Math.hypot(b.vx, b.vz) < 2.8) {
        G.phys.remove(b);
        const n = g.strokes;
        G.flash(n <= 1 ? 'HOLE IN ONE!' : `In the hole in ${n} strokes${n === 2 ? ' (birdie!)' : ''}`);
        G.audio.play('win');
        G.fx.burst(n <= 1 ? 'confetti' : 'stars', g.hole[0], g.hole[1] + 0.3, g.hole[2], n <= 1 ? 90 : 30);
      }
    }
    this.balls = this.balls.filter((g) => !g.body.dead);
  }
}

// ------------------------------------------------------------------ cinema screens (animated film)
class Movies {
  constructor(G) {
    this.G = G;
    this.canvas = document.createElement('canvas'); this.canvas.width = 256; this.canvas.height = 108;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex, color: new THREE.Color(1.2, 1.2, 1.2) });
    this.screens = new Map(); this.t = 0; this.acc = 0;
  }
  add(it) {
    const d = it.data;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h), this.mat);
    m.position.set(it.x, it.y, it.z);
    m.rotation.y = Math.atan2(d.nx, d.nz);
    this.G.scene.add(m);
    this.screens.set(it, m);
  }
  release(it) { const m = this.screens.get(it); if (m) { this.G.scene.remove(m); m.geometry.dispose(); this.screens.delete(it); } }
  update(dt) {
    if (!this.screens.size) return;
    this.t += dt; this.acc += dt;
    if (this.acc < 1 / 15) return;
    this.acc = 0;
    const g = this.ctx, t = this.t, W = 256, H = 108;
    const scene = Math.floor(t / 6) % 4;
    const gr = g.createLinearGradient(0, 0, 0, H);
    const hues = [[220, 30], [20, 40], [280, 200], [120, 60]][scene];
    gr.addColorStop(0, `hsl(${hues[0]},60%,${25 + 10 * Math.sin(t)}%)`); gr.addColorStop(1, `hsl(${hues[1]},70%,15%)`);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (scene === 0) { // space chase
      for (let i = 0; i < 40; i++) { g.fillStyle = '#fff'; g.fillRect((i * 53 + t * (20 + i % 5 * 15)) % W, (i * 31) % H, 1.5, 1.5); }
      g.fillStyle = '#ddd'; g.beginPath(); g.moveTo(80 + Math.sin(t * 2) * 30, 54 + Math.cos(t * 3) * 15); g.lineTo(60 + Math.sin(t * 2) * 30, 46 + Math.cos(t * 3) * 15); g.lineTo(60 + Math.sin(t * 2) * 30, 62 + Math.cos(t * 3) * 15); g.fill();
    } else if (scene === 1) { // desert sunset with a dinosaur silhouette
      g.fillStyle = '#ffcc66'; g.beginPath(); g.arc(180, 60, 22, 0, 7); g.fill();
      g.fillStyle = '#2a1608'; g.fillRect(0, 80, W, 28);
      const x = (t * 30) % (W + 60) - 60;
      g.fillRect(x, 58, 34, 14); g.fillRect(x + 28, 48, 14, 10); g.fillRect(x - 18, 62, 20, 5); g.fillRect(x + 6, 72, 5, 9); g.fillRect(x + 20, 72, 5, 9);
    } else if (scene === 2) { // neon city
      for (let i = 0; i < 14; i++) { const h = 30 + (i * 37) % 50; g.fillStyle = `hsl(${(i * 40 + t * 40) % 360},70%,30%)`; g.fillRect(i * 19, H - h, 17, h); for (let k = 0; k < 6; k++) { g.fillStyle = Math.sin(t * 3 + i + k) > 0 ? '#ffe066' : '#333'; g.fillRect(i * 19 + 4, H - h + 6 + k * 7, 3, 3); } }
    } else { // ocean waves
      for (let k = 0; k < 6; k++) { g.strokeStyle = `rgba(200,240,255,${0.3 + k * 0.1})`; g.beginPath(); for (let x = 0; x <= W; x += 8) g.lineTo(x, 60 + k * 8 + Math.sin(x * 0.05 + t * 2 + k) * 5); g.stroke(); }
    }
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, W, 8); g.fillRect(0, H - 8, W, 8);
    this.tex.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ the manager
const TIPS = {
  pc: ['Inventory: 12,847 SKUs in stock.', 'Ticket #4471: "Escalator 12 squeaks". Status: open.', 'CCTV: all 2,304 cameras online.', 'Reminder: staff party in the break room at 6.', 'Server load 23%. All systems nominal.'],
  case: ['Diamond solitaire ring · $4,950', 'Rose-gold chronograph · $12,400', 'Pearl necklace · $1,875', 'Sapphire earrings · $3,200'],
  rack: ['Linen shirt · size M · $39.99', 'Slim-fit jeans · 32/32 · $59.00', 'Wool coat · on sale $149', 'Graphic tee · 2 for $25'],
  weights: ['Bench press: 80 kg × 8. Feel the burn.', 'Deadlift: 120 kg. New personal best!', 'Curls: 15 kg × 12. Looking strong.'],
  locker: ['Empty, apart from a single sock.', 'A forgotten lunchbox. Best not.', 'A name tag that says "Kevin".', 'Spare uniform, neatly folded.'],
  car: ['Locked. The alarm chirps at you.', 'A parking ticket flutters on the windscreen.', 'Beep beep! Someone left their lights on.'],
  valve: ['Steam vents with a loud hiss.', 'The pressure gauge settles at 3.2 bar.'],
  feed: ['The fish swarm toward the food.', 'A pufferfish puffs up at you.', 'A ray glides past the glass.'],
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const PENTA = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3];

export class Interact {
  constructor(G) {
    this.G = G;
    this.doors = new Doors(G);
    this.bowling = new Bowling(G);
    this.golf = new Golf(G);
    this.movies = new Movies(G);
    this.target = null;
    this._near = []; this._bodies = [];
    this.escStopped = new Set();
    G.world.hooks.load = (k, rec) => this.onLoad(rec);
    G.world.hooks.unload = (k, rec) => this.onUnload(rec);
    this.buildGlobals();
  }
  setWorld(world) {
    world.hooks.load = (k, rec) => this.onLoad(rec);
    world.hooks.unload = (k, rec) => this.onUnload(rec);
    this.buildGlobals();
  }
  onLoad(rec) {
    for (const it of rec.inter) {
      if (it.kind === 'door' || it.kind === 'autodoor') this.doors.add(it, rec);
      else if (it.kind === 'bowl') this.bowling.add(it);
      else if (it.kind === 'movie') this.movies.add(it);
    }
  }
  onUnload(rec) {
    for (const it of rec.inter) {
      if (it.kind === 'door' || it.kind === 'autodoor') this.doors.release(it);
      else if (it.kind === 'bowl') this.bowling.release(it);
      else if (it.kind === 'movie') this.movies.release(it);
    }
  }
  buildGlobals() {
    const m = this.G.mall, g = [];
    for (const ev of m.elevators) for (const l of ev.levels) {
      g.push({ kind: 'elevator', x: ev.x, y: levelY(l) + 1.2, z: ev.z, reach: 3.4, label: 'Call the glass elevator', data: ev });
    }
    for (const f of m.fountains) g.push({ kind: 'coin', x: f.x, y: 0.9, z: f.z, reach: 6.5, label: 'Toss a coin in the fountain', data: f });
    for (const z of m.zones) if (z.type === 'water' && z.name === 'Pond') g.push({ kind: 'coin', x: z.cx, y: 0.6, z: z.cz, reach: 8, label: 'Toss a coin in the pond', data: { x: z.cx, z: z.cz } });
    for (const e of m.escalators) {
      const bx = e.axis === 'z' ? e.cc + 1.95 : e.t0 - e.dir * 0.5, bz = e.axis === 'z' ? e.t0 - e.dir * 0.5 : e.cc + 1.95;
      g.push({ kind: 'escstop', x: bx, y: e.y0 + 1.0, z: bz, reach: 2.4, label: 'Press the escalator emergency stop', data: e });
    }
    for (const r of m.rides) g.push({ kind: 'ride', x: r.board.x, y: (r.boardY || 0) + 1.2, z: r.board.z, reach: 4, label: `Ride the ${r.name}`, data: r });
    this.globals = g;
  }
  // nearest thing in front of the camera
  update(dt) {
    const G = this.G, cam = G.camera;
    this.doors.update(dt); this.bowling.update(dt); this.golf.update(dt); this.movies.update(dt);
    if (G.player.mode !== 'walk') { this.setTarget(null); return; }
    const P = cam.position;
    cam.getWorldDirection(_v);
    const near = G.world.interNear(P.x, P.z, G.player.level, this._near);
    let best = null, bs = -1;
    const consider = (it, reach) => {
      if (it.visual || it.kind === 'autodoor') return;
      const dx = it.x - P.x, dy = it.y - P.y, dz = it.z - P.z;
      const d = Math.hypot(dx, dy, dz);
      if (d > reach || Math.abs(dy) > 2.6) return;
      const c = (dx * _v.x + dy * _v.y + dz * _v.z) / (d || 1);
      const need = d < 1.2 ? 0.35 : d < 2 ? 0.75 : 0.88;
      if (c < need) return;
      const sc = c - d * 0.04;
      if (sc > bs) { bs = sc; best = it; }
    };
    for (const it of near) consider(it, it.kind === 'door' ? 2.8 : 2.4);
    for (const it of this.globals) if (Math.abs(it.x - P.x) < 9 && Math.abs(it.z - P.z) < 9) consider(it, it.reach || 2.6);
    this._bodies.length = 0;
    for (const b of G.phys.near(P.x, P.y, P.z, 2.6, this._bodies)) consider({ kind: b.kind === 'golf' ? 'putt' : 'pickup', x: b.x, y: b.y, z: b.z, label: b.kind === 'golf' ? 'Putt the golf ball' : `Pick up the ${ITEM_LABEL(b.kind)}`, body: b }, 2.4);
    this.setTarget(best);
  }
  setTarget(t) {
    let label = null;
    if (t) {
      label = t.label;
      if (t.kind === 'door') { const s = this.doors.st(t.data.key); label = s.target ? 'Close the door' : t.label; }
      if (t.kind === 'escstop') label = this.escStopped.has(t.data) ? 'Restart the escalator' : t.label;
    } else if (this.G.held) label = `Throw the ${ITEM_LABEL(this.G.held.kind)}`;
    this.target = t;
    this.G.hud.prompt(label);
  }
  use() {
    const G = this.G, it = this.target;
    if (!it) { if (G.held) G.throwHeld(); return; }
    const A = G.audio, F = G.fx, P = G.player;
    const fwd = P.forward2();
    const spawnFront = (kind, msg) => {
      const b = G.phys.spawn(kind, it.x + fwd[0] * -0.3, it.y + 0.1, it.z + fwd[1] * -0.3, -fwd[0] * 0.6, 0.5, -fwd[1] * 0.6);
      if (!G.held) G.hold(b);
      if (msg) G.flash(msg);
      return b;
    };
    switch (it.kind) {
      case 'door': this.doors.toggle(it); break;
      case 'elevator': G.openElevator(it.data); break;
      case 'ride': G.rides.board(it.data.id); break;
      case 'seat': case 'bed': P.sit(it, it.kind === 'bed'); G.flash(it.kind === 'bed' ? 'Lying down. Press E or move to get up' : 'Sitting down. Press E or move to stand up'); break;
      case 'treadmill': case 'bike': P.exercise(it); G.flash(it.kind === 'bike' ? 'Pedalling! Press E or move to stop' : 'Running! Press E or move to stop'); A.play('beep'); break;
      case 'pickup': G.hold(it.body); A.play('click'); break;
      case 'putt': this.golf.putt(it.body); break;
      case 'golf': this.golf.tee(it); break;
      case 'bowl': this.bowling.bowl(it); break;
      case 'vend': { A.play('beep'); setTimeout(() => A.play('clunk'), 500); const b = G.phys.spawn('can', it.x + fwd[0] * -0.1, it.y - 0.6, it.z + fwd[1] * -0.1, -fwd[0] * 1.2, 0, -fwd[1] * 1.2); G.flash('Clunk! A cold soda drops into the tray'); void b; break; }
      case 'claw': {
        A.play('arcade'); G.flash('The claw descends...');
        setTimeout(() => {
          if (Math.random() < 0.4) { G.phys.spawn('plush', it.x, it.y + 0.2, it.z, -fwd[0], 1, -fwd[1]); A.play('win'); G.flash('You won a plush toy!'); F.burst('stars', it.x, it.y + 0.5, it.z, 25); }
          else { A.play('lose'); G.flash('So close! The claw drops it.'); }
        }, 1300);
        break;
      }
      case 'arcade': G.arcade.start(); break;
      case 'register': A.play('kaching'); F.burst('popcorn', it.x, it.y + 0.2, it.z, 10); G.flash(`Ka-ching! Receipt printed: $${(Math.random() * 120 + 5).toFixed(2)}`); break;
      case 'atm': A.play('beep'); setTimeout(() => { A.play('kaching'); F.burst('cash', it.x, it.y, it.z, 18, { dx: -fwd[0], dz: -fwd[1] }); }, 400); G.flash('Withdrawal: $200. Please take your cash'); break;
      case 'piano': { const base = Math.floor(Math.random() * 3); for (let i = 0; i < 8; i++) setTimeout(() => A.play('note', { f: PENTA[(base + Math.floor(Math.random() * 6)) % PENTA.length] }), i * 220); G.flash('You play a little tune'); break; }
      case 'guitar': [196, 246.9, 293.7, 392].forEach((f, i) => setTimeout(() => A.play('pluck', { f }), i * 45)); G.flash('Strum! Sounds like a G chord'); break;
      case 'sink': A.play('water'); G.startStream(it.x, it.y + 0.3, it.z, 1.6); G.flash('You wash your hands'); break;
      case 'popcorn': A.play('pop'); F.burst('popcorn', it.x, it.y + 0.4, it.z, 60); spawnFront('popcorn', 'Fresh popcorn!'); break;
      case 'coffee': A.play('steam'); F.burst('steam', it.x, it.y + 0.2, it.z, 30); spawnFront('coffee', 'One flat white, coming up'); break;
      case 'food': A.play('kaching'); spawnFront(it.data && it.data.item ? it.data.item.replace(' ', ' ') : pick(['burger', 'soda', 'popcorn', 'coffee']), 'Order up! Enjoy your meal'); break;
      case 'bell': A.play('ding'); G.flash('Ding! "Welcome to The Grand Mall Hotel, how may I help?"'); break;
      case 'billiards': A.play('clack'); G.flash('Crack! A clean break'); break;
      case 'stage': A.play('cheer'); F.burst('confetti', it.x, it.y + 6, it.z, 300); G.flash('The crowd roars! Lights and confetti fill the arena'); G.flicker(1.2); break;
      case 'exhibit': G.flash(it.data.text, 6); break;
      case 'feed': F.burst('food', it.x, it.y + 0.4, it.z, 25); A.play('plop'); G.flash(pick(TIPS.feed)); break;
      case 'ball': spawnFront('ball', 'Grabbed a ball. Press E or click to throw it'); break;
      case 'box': spawnFront('box', 'You pick up a cardboard box'); break;
      case 'shelf': spawnFront(it.data && it.data.item === 'book' ? 'book' : 'product', null); A.play('click'); break;
      case 'browse': spawnFront(['shirt', 'gadget', 'laptop', 'shoes', 'book', 'gift', 'beauty'].includes(it.data && it.data.item) ? it.data.item : 'gift', null); A.play('click'); break;
      case 'kiosk': spawnFront('gift', 'You pick up a gift from the kiosk'); break;
      case 'rack': A.play('click'); G.flash(pick(TIPS.rack)); spawnFront('shirt'); break;
      case 'case': A.play('ding', { vol: 0.3 }); G.flash(pick(TIPS.case)); break;
      case 'directory': G.openMap(); break;
      case 'trash': if (G.held) { G.phys.remove(G.held); G.held = null; A.play('clunk'); G.flash('Binned'); } else G.flash('The bin is empty. Bring something to throw away'); break;
      case 'weights': A.play('clank'); G.flash(pick(TIPS.weights)); break;
      case 'locker': A.play('clank'); G.flash(pick(TIPS.locker)); break;
      case 'valve': A.play('hiss'); F.burst('steam', it.x, it.y, it.z, 60); G.flash(pick(TIPS.valve)); break;
      case 'breaker': A.play('clunk'); G.flicker(0.8); G.flash('The lights flicker as the breaker trips and resets'); break;
      case 'pc': A.play('beep'); G.flash(pick(TIPS.pc)); break;
      case 'car': A.play('beep'); setTimeout(() => A.play('beep'), 180); G.flash(pick(TIPS.car)); break;
      case 'alarm': G.setAlarm(true); break;
      case 'coin': {
        const f = it.data;
        const b = G.phys.spawn('coin', P.pos.x, P.pos.y + 1.4, P.pos.z, (f.x - P.pos.x) * 0.6, 4, (f.z - P.pos.z) * 0.6);
        void b; A.play('coin'); G.flash(pick(['You make a wish...', 'Make a wish!', 'Plink! Good luck today']));
        break;
      }
      case 'escstop': {
        const e = it.data;
        const ramps = G.mall.ramps.filter((r) => r.kind === 'escalator' && r.t0 === e.t0 && r.axis === e.axis && Math.abs((r.lo + r.hi) / 2 - e.cc) < 2);
        if (this.escStopped.has(e)) { for (const r of ramps) r.move = r._move; this.escStopped.delete(e); G.flash('Escalator restarted'); A.play('beep'); }
        else { for (const r of ramps) { r._move = r.move; r.move = 0; } this.escStopped.add(e); G.flash('Emergency stop! The escalator halts'); A.play('buzz'); }
        break;
      }
      default: G.flash(it.label || 'Nothing happens');
    }
  }
}
