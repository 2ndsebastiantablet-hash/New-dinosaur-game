// Lightweight CPU particle system (splashes, coins, cash, popcorn, steam, confetti, sparks).
import * as THREE from 'three';

const MAX = 4000;
export class FX {
  constructor(scene) {
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX * 3); this.col = new Float32Array(MAX * 3);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    this.mat = new THREE.PointsMaterial({ size: 0.09, map: new THREE.CanvasTexture(c), vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    scene.add(this.points);
    this.p = [];
  }
  emit(x, y, z, vx, vy, vz, life, col, grav = 9.8, drag = 0) {
    if (this.p.length >= MAX) this.p.shift();
    this.p.push({ x, y, z, vx, vy, vz, life, col, grav, drag });
  }
  burst(type, x, y, z, n = 30, opt = {}) {
    const R = Math.random;
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, sp = R();
      switch (type) {
        case 'splash': this.emit(x + (R() - 0.5) * 0.6, y, z + (R() - 0.5) * 0.6, Math.cos(a) * sp * 2.5, 2 + R() * 4 * (opt.power || 1), Math.sin(a) * sp * 2.5, 0.7 + R() * 0.6, [0.75, 0.9, 1]); break;
        case 'ripple': this.emit(x + Math.cos(a) * 0.4, y + 0.02, z + Math.sin(a) * 0.4, Math.cos(a) * 1.2, 0.3, Math.sin(a) * 1.2, 0.5, [0.8, 0.95, 1], 0.5); break;
        case 'coins': this.emit(x, y, z, Math.cos(a) * sp * 2, 2 + R() * 3, Math.sin(a) * sp * 2, 1.2, [1, 0.8, 0.25]); break;
        case 'cash': this.emit(x, y, z, (opt.dx || 0) * 2 + Math.cos(a) * sp, 1 + R() * 2, (opt.dz || 0) * 2 + Math.sin(a) * sp, 1.8, [0.45, 0.8, 0.4], 2.5, 1.5); break;
        case 'popcorn': this.emit(x + (R() - 0.5) * 0.3, y, z + (R() - 0.5) * 0.3, Math.cos(a) * sp, 1.5 + R() * 2.5, Math.sin(a) * sp, 1.2, [1, 0.97, 0.8]); break;
        case 'steam': this.emit(x + (R() - 0.5) * 0.2, y, z + (R() - 0.5) * 0.2, (R() - 0.5) * 0.4 + (opt.dx || 0), 0.8 + R(), (R() - 0.5) * 0.4 + (opt.dz || 0), 1.5, [0.9, 0.9, 0.92], -0.3, 0.8); break;
        case 'confetti': this.emit(x, y, z, Math.cos(a) * sp * 4, 3 + R() * 5, Math.sin(a) * sp * 4, 3, [R(), R(), R()], 3, 1.2); break;
        case 'sparks': this.emit(x, y, z, Math.cos(a) * sp * 3, R() * 3, Math.sin(a) * sp * 3, 0.5, [1, 0.8, 0.3]); break;
        case 'snow': this.emit(x + (R() - 0.5) * 0.5, y, z + (R() - 0.5) * 0.5, Math.cos(a) * sp * 1.5, 0.5 + R() * 1.5, Math.sin(a) * sp * 1.5, 0.8, [1, 1, 1], 6); break;
        case 'food': this.emit(x + (R() - 0.5) * 0.3, y, z + (R() - 0.5) * 0.3, (R() - 0.5) * 0.4, 0, (R() - 0.5) * 0.4, 2.5, [0.8, 0.55, 0.3], 0.3, 1.5); break;
        case 'stream': this.emit(x + (R() - 0.5) * 0.02, y, z + (R() - 0.5) * 0.02, 0, -0.5, 0, 0.45, [0.8, 0.92, 1]); break;
        case 'stars': this.emit(x, y, z, Math.cos(a) * sp * 2, 2 + R() * 2, Math.sin(a) * sp * 2, 1.2, [1, 1, 0.6], 2); break;
        default: break;
      }
    }
  }
  update(dt) {
    const p = this.p;
    let j = 0;
    for (let i = 0; i < p.length; i++) {
      const q = p[i];
      q.life -= dt;
      if (q.life <= 0) continue;
      q.vy -= q.grav * dt;
      if (q.drag) { const k = Math.max(0, 1 - q.drag * dt); q.vx *= k; q.vy *= k; q.vz *= k; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      p[j++] = q;
    }
    p.length = j;
    for (let i = 0; i < j; i++) {
      const q = p[i], f = Math.min(1, q.life * 2);
      this.pos[i * 3] = q.x; this.pos[i * 3 + 1] = q.y; this.pos[i * 3 + 2] = q.z;
      this.col[i * 3] = q.col[0] * f; this.col[i * 3 + 1] = q.col[1] * f; this.col[i * 3 + 2] = q.col[2] * f;
    }
    this.geo.setDrawRange(0, j);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}
