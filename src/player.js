// First-person controller: walking with collisions, gravity, stairs/escalators (ramps),
// moving escalators, sprint, jump, crouch, a no-clip "drone" mode, and surface physics:
// slippery ice, swimming & wading in water, bouncy trampolines, soft foam pits and snow slopes.
// Also seated / lying / exercising / riding modes driven by the interaction system.
import * as THREE from 'three';
import { CELL, LEVEL_H, levelY } from './config.js';

const RADIUS = 0.32, HEIGHT = 1.75, EYE = 1.62, STEP = 0.6;

export class Player {
  constructor(camera, world) {
    this.camera = camera; this.world = world;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.onGround = false; this.fly = false;
    this.eyeY = 0; this.bob = 0;
    this.ramp = null;
    this._boxes = [];
    this.crouch = 0;
    this.mode = 'walk';
    this.water = null; this.swimming = false; this.underwater = false;
    this.surface = '';
    this.events = []; // physics events for fx/audio: {type, x, y, z, v}
  }
  spawn(s) {
    this.mode = 'walk';
    this.pos.set(s.x, s.y + 0.05, s.z); this.vel.set(0, 0, 0);
    this.yaw = s.yaw || 0; this.pitch = 0; this.eyeY = this.pos.y + EYE;
  }
  teleport(x, y, z) { this.pos.set(x, y + 0.05, z); this.vel.set(0, 0, 0); this.eyeY = y + EYE; }
  get level() { return this.world.mall.levelOfY(this.pos.y + 0.3); }
  forward2() { return [-Math.sin(this.yaw), -Math.cos(this.yaw)]; }

  // seated / lying on furniture
  sit(it, lying) {
    this.mode = 'seat';
    this.seat = { x: it.x, y: it.y, z: it.z, lying, back: [this.pos.x, this.pos.y, this.pos.z] };
    this.yaw = it.yaw; this.pitch = lying ? 1.2 : 0;
    this.vel.set(0, 0, 0);
  }
  exercise(it) {
    this.mode = 'exercise';
    this.seat = { x: it.x, y: it.y, z: it.z, kind: it.kind, back: [this.pos.x, this.pos.y, this.pos.z], t: 0 };
    this.yaw = it.yaw; this.pitch = 0;
  }
  stand() {
    if (this.mode !== 'seat' && this.mode !== 'exercise') return;
    const b = this.seat.back;
    this.mode = 'walk';
    this.pos.set(b[0], b[1], b[2]); this.vel.set(0, 0, 0);
  }

  update(dt, input) {
    dt = Math.min(dt, 0.05);
    this.events.length = 0;
    // look
    this.yaw -= input.lookX; this.pitch -= input.lookY;
    this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch));
    input.lookX = 0; input.lookY = 0;
    if (this.mode === 'ride') return; // the ride positions the camera
    if (this.mode === 'seat' || this.mode === 'exercise') {
      if (input.forward || input.strafe || input.jump) { this.stand(); }
      else {
        const s = this.seat;
        s.t = (s.t || 0) + dt;
        let bob = 0;
        if (this.mode === 'exercise') bob = Math.sin(s.t * (s.kind === 'bike' ? 6 : 11)) * (s.kind === 'bike' ? 0.03 : 0.06);
        const eye = s.lying ? 0.35 : this.mode === 'exercise' && s.kind === 'treadmill' ? EYE : 0.78;
        this.camera.position.set(s.x, s.y + eye + bob, s.z);
        this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
        this.pos.set(s.x, s.y, s.z);
        return;
      }
    }
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = new THREE.Vector3().addScaledVector(fwd, input.forward).addScaledVector(right, input.strafe);
    if (wish.lengthSq() > 1) wish.normalize();

    if (this.fly) {
      const sp = input.sprint ? 60 : 22;
      const v = wish.clone().multiplyScalar(sp);
      v.y = (input.up - input.down) * sp * 0.7;
      if (input.forward) v.y += Math.sin(this.pitch) * sp * input.forward;
      this.vel.lerp(v, 1 - Math.exp(-dt * 6));
      this.pos.addScaledVector(this.vel, dt);
      this.eyeY = this.pos.y + EYE;
      this.water = null; this.underwater = false;
      this.applyCamera(dt, 0);
      return;
    }
    const W = this.world;
    // ---- what are we standing in / on?
    const water = W.zoneAt(this.pos.x, this.pos.y, this.pos.z, 'water');
    const depth = water ? water.y1 - this.pos.y : 0;
    const wasIn = !!this.water;
    this.water = water && depth > 0.05 ? water : null;
    this.swimming = !!(this.water && depth > 1.15);
    const ice = this.onGround && W.zoneAt(this.pos.x, this.pos.y, this.pos.z, 'ice');
    const foam = W.zoneAt(this.pos.x, this.pos.y, this.pos.z, 'foam');
    const onSlope = this.onGround && this.ramp && this.ramp.kind === 'slope';
    const snow = this.onGround && (onSlope || W.zoneAt(this.pos.x, this.pos.y, this.pos.z, 'snow'));
    this.surface = this.swimming ? 'swimming' : this.water ? 'wading' : ice ? 'ice' : foam ? 'foam' : onSlope ? 'slope' : snow ? 'snow' : '';
    if (this.water && !wasIn && this.vel.y < -2) this.events.push({ type: 'splash', x: this.pos.x, y: this.water.y1, z: this.pos.z, v: -this.vel.y });

    this.crouch += ((input.down && !this.swimming ? 1 : 0) - this.crouch) * Math.min(1, dt * 10);
    let speed = (input.sprint ? 8.5 : 4.4) * (1 - this.crouch * 0.5);
    let accel = this.onGround ? 12 : 2.5;
    if (this.swimming) { speed = input.sprint ? 3.2 : 2.0; accel = 3; }
    else if (this.water) { speed *= Math.max(0.45, 1 - depth * 0.6); accel = 6; }
    else if (ice) { accel = 0.9; speed *= 1.15; }
    else if (onSlope) { accel = input.forward || input.strafe ? 1.6 : 0.1; }
    else if (snow) { accel = 5; }
    else if (foam) { speed *= 0.4; accel = 4; }
    const target = wish.multiplyScalar(speed);
    this.vel.x += (target.x - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (target.z - this.vel.z) * Math.min(1, accel * dt);
    // snow slope: gravity pulls you downhill (crouch to tuck and go faster)
    if (onSlope) {
      const r = this.ramp, sl = (r.y1 - r.y0) / r.len;
      const a = -9.8 * sl * r.dir * (0.85 + this.crouch * 0.6);
      if (r.axis === 'x') this.vel.x += a * dt; else this.vel.z += a * dt;
      if (Math.hypot(this.vel.x, this.vel.z) > 3) this.events.push({ type: 'snow', x: this.pos.x, y: this.pos.y, z: this.pos.z });
    }
    // moving walkway / escalator
    const carry = new THREE.Vector3();
    if (this.onGround && this.ramp && this.ramp.move) {
      const v = 0.75 * this.ramp.move * this.ramp.dir;
      if (this.ramp.axis === 'z') carry.z = v; else carry.x = v;
    }
    // vertical forces
    if (this.swimming || (this.water && depth > 0.9)) {
      // buoyancy: float with the head above water; Space swims up, C dives
      const floatFeet = this.water.y1 - 1.35;
      const want = input.down ? this.water.y0 : floatFeet + (input.up ? 0.5 : 0);
      this.vel.y += ((want - this.pos.y) * 6 - this.vel.y * 2.5) * dt;
      if (this.water.wave) this.vel.y += Math.sin(performance.now() / 700) * 0.8 * dt;
      // climb out at the edge: jump when near the surface
      if (input.jump && this.pos.y > floatFeet - 0.3) { this.vel.y = 8.6; this.events.push({ type: 'splash', x: this.pos.x, y: this.water.y1, z: this.pos.z, v: 2 }); }
      this.onGround = false;
    } else {
      if (input.jump && this.onGround) {
        this.vel.y = foam ? 2.5 : 6.2; this.onGround = false;
        if (this.tramp) { this.vel.y = Math.max(this.vel.y, 9); }
      }
      this.vel.y -= (foam && this.pos.y < foam.y0 + 2 ? 8 : 20) * dt;
    }
    if (this.vel.y < -40) this.vel.y = -40;

    // horizontal move with sub-steps
    const dx = (this.vel.x + carry.x) * dt, dz = (this.vel.z + carry.z) * dt;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.15));
    for (let i = 0; i < steps; i++) {
      this.pos.x += dx / steps; this.pos.z += dz / steps;
      this.collide();
    }
    // keep within the plaza around the building
    const mx = W.mall.W * CELL, mz = W.mall.H * CELL;
    this.pos.x = Math.max(-38, Math.min(mx + 38, this.pos.x));
    this.pos.z = Math.max(-38, Math.min(mz + 38, this.pos.z));
    // vertical
    W._tramp = null;
    const g = W.groundAt(this.pos.x, this.pos.z, this.pos.y, STEP);
    const tramp = W._tramp && Math.abs(g.y - W._tramp.y1) < 0.01 ? W._tramp : null;
    let ny = this.pos.y + this.vel.y * dt;
    const impact = -this.vel.y;
    if (this.vel.y <= 0 && g.y > -Infinity && ny <= g.y + 0.02) {
      ny = g.y;
      if (tramp && impact > 2.5) {
        // trampoline: bounce back up (jump at the right time to go higher)
        this.vel.y = Math.min(11.5, impact * 0.93 + (input.jump ? 3.5 : 0.6));
        this.onGround = false; this.ramp = null;
        this.events.push({ type: 'bounce', x: this.pos.x, y: ny, z: this.pos.z, v: this.vel.y });
      } else {
        if (impact > 9 && !this.water && !foam) this.events.push({ type: 'thud', v: impact });
        if (foam && impact > 3) this.events.push({ type: 'foam', x: this.pos.x, y: ny, z: this.pos.z });
        this.vel.y = 0; this.onGround = true; this.ramp = g.ramp;
      }
    } else if (this.onGround && g.y > -Infinity && this.pos.y - g.y < 0.45 && this.vel.y <= 0) {
      ny = g.y; this.vel.y = 0; this.ramp = g.ramp;
    } else { this.onGround = false; this.ramp = null; }
    this.tramp = this.onGround ? tramp : null;
    // ceiling
    const head = ny + HEIGHT * (1 - this.crouch * 0.4);
    const ceil = W.ceilingAt(this.pos.x, this.pos.z, this.pos.y + HEIGHT);
    if (head > ceil) { ny = ceil - HEIGHT * (1 - this.crouch * 0.4); if (this.vel.y > 0) this.vel.y = 0; }
    this.pos.y = ny;
    if (this.pos.y < -40) this.spawn(W.mall.spawn);
    // camera
    const hs = Math.hypot(this.vel.x, this.vel.z);
    this.applyCamera(dt, this.onGround && !ice && !onSlope ? hs : 0);
    // sinking into the foam pit
    if (foam) this.camera.position.y -= Math.max(0, 0.8 - (this.pos.y - foam.y0 - 1)) * 0.6;
    this.underwater = !!(water && this.camera.position.y < water.y1);
  }
  collide() {
    const p = this.pos;
    const y0 = p.y + STEP * 0.85, y1 = p.y + HEIGHT;
    const boxes = this.world.collect(p.x - 1, p.z - 1, p.x + 1, p.z + 1, y0, y1, this._boxes);
    for (let iter = 0; iter < 2; iter++) for (const b of boxes) {
      if (b.off || b.y1 <= y0 || b.y0 >= y1) continue;
      const cx = Math.max(b.x0, Math.min(p.x, b.x1)), cz = Math.max(b.z0, Math.min(p.z, b.z1));
      let ddx = p.x - cx, ddz = p.z - cz;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 >= RADIUS * RADIUS) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2), push = RADIUS - d;
        p.x += (ddx / d) * push; p.z += (ddz / d) * push;
        const nx = ddx / d, nz = ddz / d;
        const vn = this.vel.x * nx + this.vel.z * nz;
        if (vn < 0) { this.vel.x -= vn * nx; this.vel.z -= vn * nz; }
      } else {
        const l = p.x - b.x0, r = b.x1 - p.x, f = p.z - b.z0, bk = b.z1 - p.z;
        const m = Math.min(l, r, f, bk);
        if (m === l) p.x = b.x0 - RADIUS; else if (m === r) p.x = b.x1 + RADIUS; else if (m === f) p.z = b.z0 - RADIUS; else p.z = b.z1 + RADIUS;
      }
    }
  }
  applyCamera(dt, hspeed) {
    const target = this.pos.y + EYE - this.crouch * 0.6;
    const k = this.fly ? 1 : Math.min(1, dt * (Math.abs(target - this.eyeY) > 1.2 || this.tramp || !this.onGround ? 30 : 14));
    this.eyeY += (target - this.eyeY) * k;
    this.bob += hspeed * dt * 1.9;
    const bobY = Math.sin(this.bob * 2) * 0.035 * Math.min(1, hspeed / 4);
    this.camera.position.set(this.pos.x, this.eyeY + bobY, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
