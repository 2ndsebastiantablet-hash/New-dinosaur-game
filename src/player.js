// First-person controller: walking with collisions, gravity, stairs/escalators (ramps),
// moving escalators, sprint, jump, crouch and a no-clip "drone" mode for surveying the mall.
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
  }
  spawn(s) {
    this.pos.set(s.x, s.y + 0.05, s.z); this.vel.set(0, 0, 0);
    this.yaw = s.yaw || 0; this.pitch = 0; this.eyeY = this.pos.y + EYE;
  }
  teleport(x, y, z) { this.pos.set(x, y + 0.05, z); this.vel.set(0, 0, 0); this.eyeY = y + EYE; }
  get level() { return this.world.mall.levelOfY(this.pos.y + 0.3); }

  update(dt, input) {
    dt = Math.min(dt, 0.05);
    // look
    this.yaw -= input.lookX; this.pitch -= input.lookY;
    this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch));
    input.lookX = 0; input.lookY = 0;
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = new THREE.Vector3().addScaledVector(fwd, input.forward).addScaledVector(right, input.strafe);
    if (wish.lengthSq() > 1) wish.normalize();

    if (this.fly) {
      const sp = input.sprint ? 60 : 22;
      const v = wish.clone().multiplyScalar(sp);
      v.y = (input.up - input.down) * sp * 0.7;
      // fly along look direction pitch
      if (input.forward) v.y += Math.sin(this.pitch) * sp * input.forward;
      this.vel.lerp(v, 1 - Math.exp(-dt * 6));
      this.pos.addScaledVector(this.vel, dt);
      this.eyeY = this.pos.y + EYE;
      this.applyCamera(dt, 0);
      return;
    }
    this.crouch += ((input.down ? 1 : 0) - this.crouch) * Math.min(1, dt * 10);
    const speed = (input.sprint ? 8.5 : 4.4) * (1 - this.crouch * 0.5);
    const target = wish.multiplyScalar(speed);
    const accel = this.onGround ? 12 : 2.5;
    this.vel.x += (target.x - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (target.z - this.vel.z) * Math.min(1, accel * dt);
    // moving walkway / escalator
    let carry = new THREE.Vector3();
    if (this.onGround && this.ramp && this.ramp.move) {
      const v = 0.75 * this.ramp.move * this.ramp.dir;
      if (this.ramp.axis === 'z') carry.z = v; else carry.x = v;
    }
    if (input.jump && this.onGround) { this.vel.y = 6.2; this.onGround = false; }
    this.vel.y -= 20 * dt;
    if (this.vel.y < -40) this.vel.y = -40;

    // horizontal move with sub-steps
    const dx = (this.vel.x + carry.x) * dt, dz = (this.vel.z + carry.z) * dt;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.15));
    for (let i = 0; i < steps; i++) {
      this.pos.x += dx / steps; this.pos.z += dz / steps;
      this.collide();
    }
    // vertical
    const g = this.world.groundAt(this.pos.x, this.pos.z, this.pos.y, STEP);
    let ny = this.pos.y + this.vel.y * dt;
    if (this.vel.y <= 0 && g.y > -Infinity && ny <= g.y + 0.02) {
      // landing or walking: snap to ground (handles step-up too)
      ny = g.y; this.vel.y = 0; this.onGround = true; this.ramp = g.ramp;
    } else if (this.onGround && g.y > -Infinity && this.pos.y - g.y < 0.45 && this.vel.y <= 0) {
      ny = g.y; this.vel.y = 0; this.ramp = g.ramp; // stick to ramps going down
    } else { this.onGround = false; this.ramp = null; }
    // ceiling
    const head = ny + HEIGHT * (1 - this.crouch * 0.4);
    const ceil = this.world.ceilingAt(this.pos.x, this.pos.z, this.pos.y + HEIGHT);
    if (head > ceil) { ny = ceil - HEIGHT * (1 - this.crouch * 0.4); if (this.vel.y > 0) this.vel.y = 0; }
    this.pos.y = ny;
    if (this.pos.y < -40) this.spawn(this.world.mall.spawn);
    // camera
    const hs = Math.hypot(this.vel.x, this.vel.z);
    this.applyCamera(dt, this.onGround ? hs : 0);
  }
  collide() {
    const p = this.pos;
    const y0 = p.y + STEP * 0.85, y1 = p.y + HEIGHT;
    const boxes = this.world.collect(p.x - 1, p.z - 1, p.x + 1, p.z + 1, y0, y1, this._boxes);
    for (let iter = 0; iter < 2; iter++) for (const b of boxes) {
      if (b.y1 <= y0 || b.y0 >= y1) continue;
      const cx = Math.max(b.x0, Math.min(p.x, b.x1)), cz = Math.max(b.z0, Math.min(p.z, b.z1));
      let ddx = p.x - cx, ddz = p.z - cz;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 >= RADIUS * RADIUS) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2), push = RADIUS - d;
        p.x += (ddx / d) * push; p.z += (ddz / d) * push;
        // kill velocity into the wall
        const nx = ddx / d, nz = ddz / d;
        const vn = this.vel.x * nx + this.vel.z * nz;
        if (vn < 0) { this.vel.x -= vn * nx; this.vel.z -= vn * nz; }
      } else {
        // centre inside box: push out along smallest axis
        const l = p.x - b.x0, r = b.x1 - p.x, f = p.z - b.z0, bk = b.z1 - p.z;
        const m = Math.min(l, r, f, bk);
        if (m === l) p.x = b.x0 - RADIUS; else if (m === r) p.x = b.x1 + RADIUS; else if (m === f) p.z = b.z0 - RADIUS; else p.z = b.z1 + RADIUS;
      }
    }
  }
  applyCamera(dt, hspeed) {
    const target = this.pos.y + EYE - this.crouch * 0.6;
    // smooth step-ups, but follow fast when falling
    const k = this.fly ? 1 : Math.min(1, dt * (Math.abs(target - this.eyeY) > 1.2 ? 30 : 14));
    this.eyeY += (target - this.eyeY) * k;
    this.bob += hspeed * dt * 1.9;
    const bobY = Math.sin(this.bob * 2) * 0.035 * Math.min(1, hspeed / 4);
    this.camera.position.set(this.pos.x, this.eyeY + bobY, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
