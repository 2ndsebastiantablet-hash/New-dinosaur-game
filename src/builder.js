// Geometry batching: everything in a chunk is appended into one buffer per material.
import * as THREE from 'three';

const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _v = new THREE.Vector3(), _s = new THREE.Vector3(), _n = new THREE.Vector3(), _nm = new THREE.Matrix3();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _up = new THREE.Vector3();

export const TPL = {};
function tpl() {
  if (TPL.box) return TPL;
  TPL.box = new THREE.BoxGeometry(1, 1, 1);
  TPL.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 12, 1);   // centred, height along Y
  TPL.cyl6 = new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1);
  TPL.cyl20 = new THREE.CylinderGeometry(0.5, 0.5, 1, 20, 1);
  TPL.cone = new THREE.ConeGeometry(0.5, 1, 12, 1);
  TPL.sphere = new THREE.SphereGeometry(0.5, 12, 8);
  TPL.ico = new THREE.IcosahedronGeometry(0.5, 1);
  TPL.torus = new THREE.TorusGeometry(0.5, 0.04, 6, 32);
  TPL.disc = new THREE.CircleGeometry(0.5, 24).rotateX(-Math.PI / 2);
  TPL.ring = new THREE.RingGeometry(0.4, 0.5, 32).rotateX(-Math.PI / 2);
  TPL.hemi = new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  TPL.tube = new THREE.CylinderGeometry(0.5, 0.5, 1, 12, 1, true);
  return TPL;
}

export class GB {
  constructor() {
    this.b = new Map();
    this.x = 0; this.y = 0; this.z = 0; this.c = 1; this.s = 0; this.rot = 0;
    this.stack = [];
    tpl();
  }
  bucket(mat) {
    let rm = null, cs = 1, layer = 0, rep = 1, emis = 0;
    if (mat.isAlias) { const u = mat.userData; rm = u.rm; cs = u.cs; layer = u.layer || 0; rep = u.rep || 1; emis = u.emis || 0; mat = u.alias; }
    this._rm = rm; this._cs = cs; this._layer = layer; this._irep = 1 / rep; this._emis = emis;
    let b = this.b.get(mat);
    if (!b) { b = { p: [], n: [], u: [], c: [], i: [], r: mat.userData.srf ? [] : null }; this.b.set(mat, b); }
    return b;
  }
  // local frame (translation + yaw)
  push(x, y, z, rot = 0) {
    this.stack.push([this.x, this.y, this.z, this.rot]);
    const [wx, wy, wz] = this.tp(x, y, z);
    this.x = wx; this.y = wy; this.z = wz; this.rot += rot;
    this.c = Math.cos(this.rot); this.s = Math.sin(this.rot);
  }
  pop() {
    const [x, y, z, r] = this.stack.pop();
    this.x = x; this.y = y; this.z = z; this.rot = r; this.c = Math.cos(r); this.s = Math.sin(r);
  }
  tp(lx, ly, lz) { return [this.x + lx * this.c + lz * this.s, this.y + ly, this.z - lx * this.s + lz * this.c]; }
  tn(nx, ny, nz) { return [nx * this.c + nz * this.s, ny, -nx * this.s + nz * this.c]; }

  // quad given 4 local points (counter-clockwise when seen from the front), normal, uv per vertex
  quad(mat, p, n, col, uv, colB) {
    const b = this.bucket(mat);
    const base = b.p.length / 3;
    const [nx, ny, nz] = this.tn(n[0], n[1], n[2]);
    for (let k = 0; k < 4; k++) {
      const q = this.tp(p[k][0], p[k][1], p[k][2]);
      b.p.push(q[0], q[1], q[2]); b.n.push(nx, ny, nz);
      if (b.r) b.u.push(uv[k][0] * this._irep, uv[k][1] * this._irep); else b.u.push(uv[k][0], uv[k][1]);
      const cc = colB && (k === 0 || k === 1) ? colB : col;
      const cs = this._cs;
      b.c.push(cc[0] * cs, cc[1] * cs, cc[2] * cs);
      if (b.r) b.r.push(this._rm ? this._rm[0] : 0.6, this._rm ? this._rm[1] : 0, this._layer, this._emis);
    }
    b.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  // Horizontal rectangle facing up (or down) in WORLD-ish local coords; uv from local coords
  floor(mat, x0, z0, x1, z1, y, col, down = false, uvScale = 1) {
    const u0 = (this.x + x0) / uvScale, u1 = (this.x + x1) / uvScale, v0 = (this.z + z0) / uvScale, v1 = (this.z + z1) / uvScale;
    if (!down) this.quad(mat, [[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]], [0, 1, 0], col, [[u0, v1], [u1, v1], [u1, v0], [u0, v0]]);
    else this.quad(mat, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], [0, -1, 0], col, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]);
  }
  // Vertical wall face along X (constant z), facing +z (dir=1) or -z (dir=-1)
  wallZ(mat, x0, x1, z, y0, y1, dir, col, colBottom) {
    const ua = this.x + x0, ub = this.x + x1;
    if (dir > 0) this.quad(mat, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], [0, 0, 1], col, [[ua, y0], [ub, y0], [ub, y1], [ua, y1]], colBottom);
    else this.quad(mat, [[x1, y0, z], [x0, y0, z], [x0, y1, z], [x1, y1, z]], [0, 0, -1], col, [[-ub, y0], [-ua, y0], [-ua, y1], [-ub, y1]], colBottom);
  }
  // Vertical wall face along Z (constant x), facing +x (dir=1) or -x
  wallX(mat, z0, z1, x, y0, y1, dir, col, colBottom) {
    const ua = this.z + z0, ub = this.z + z1;
    if (dir > 0) this.quad(mat, [[x, y0, z1], [x, y0, z0], [x, y1, z0], [x, y1, z1]], [1, 0, 0], col, [[-ub, y0], [-ua, y0], [-ua, y1], [-ub, y1]], colBottom);
    else this.quad(mat, [[x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]], [-1, 0, 0], col, [[ua, y0], [ub, y0], [ub, y1], [ua, y1]], colBottom);
  }
  // Axis-aligned (in local frame) box: x,z centre, y bottom
  box(mat, x, y, z, sx, sy, sz, col, opt) {
    const x0 = x - sx / 2, x1 = x + sx / 2, z0 = z - sz / 2, z1 = z + sz / 2, y0 = y, y1 = y + sy;
    const skip = opt && opt.skip;
    const cb = opt && opt.grad ? [col[0] * opt.grad, col[1] * opt.grad, col[2] * opt.grad] : null;
    if (!skip || !skip.includes('t')) this.quad(mat, [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], col, [[x0, z1], [x1, z1], [x1, z0], [x0, z0]]);
    if (!skip || !skip.includes('b')) this.quad(mat, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], col, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]);
    if (!skip || !skip.includes('s')) this.quad(mat, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], col, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], cb);
    if (!skip || !skip.includes('n')) this.quad(mat, [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], col, [[-x1, y0], [-x0, y0], [-x0, y1], [-x1, y1]], cb);
    if (!skip || !skip.includes('e')) this.quad(mat, [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], col, [[-z1, y0], [-z0, y0], [-z0, y1], [-z1, y1]], cb);
    if (!skip || !skip.includes('w')) this.quad(mat, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], col, [[z0, y0], [z1, y0], [z1, y1], [z0, y1]], cb);
  }
  // Box from corner coords (local)
  boxA(mat, x0, y0, z0, x1, y1, z1, col, opt) {
    this.box(mat, (x0 + x1) / 2, Math.min(y0, y1), (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), col, opt);
  }
  // Template geometry with arbitrary transform (local frame). pos is centre of template.
  geo(mat, g, x, y, z, sx, sy, sz, col, rx = 0, ry = 0, rz = 0) {
    _e.set(rx, ry, rz, 'YXZ');
    _q.setFromEuler(_e);
    _m.compose(_v.set(x, y, z), _q, _s.set(sx, sy, sz));
    this.geoM(mat, g, _m, col);
  }
  geoM(mat, g, m, col) {
    // frame matrix
    _m2.makeRotationY(this.rot).setPosition(this.x, this.y, this.z).multiply(m);
    _nm.getNormalMatrix(_m2);
    const b = this.bucket(mat);
    const cs = this._cs, rm0 = this._rm ? this._rm[0] : 0.6, rm1 = this._rm ? this._rm[1] : 0, lay = this._layer, irep = this._irep, em = this._emis;
    const base = b.p.length / 3;
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    for (let k = 0; k < P.count; k++) {
      _v.fromBufferAttribute(P, k).applyMatrix4(_m2);
      b.p.push(_v.x, _v.y, _v.z);
      _n.fromBufferAttribute(N, k).applyMatrix3(_nm).normalize();
      b.n.push(_n.x, _n.y, _n.z);
      if (U) { if (b.r) b.u.push(U.getX(k) * irep, U.getY(k) * irep); else b.u.push(U.getX(k), U.getY(k)); } else b.u.push(0, 0);
      b.c.push(col[0] * cs, col[1] * cs, col[2] * cs);
      if (b.r) b.r.push(rm0, rm1, lay, em);
    }
    if (g.index) { const I = g.index.array; for (let k = 0; k < I.length; k++) b.i.push(base + I[k]); }
    else for (let k = 0; k < P.count; k++) b.i.push(base + k);
  }
  // Oriented element between two local points (box or cylinder template)
  beam(mat, p0, p1, w, h, col, g = TPL.box, roll = 0) {
    _a.set(p0[0], p0[1], p0[2]); _b.set(p1[0], p1[1], p1[2]);
    _c.subVectors(_b, _a);
    const L = _c.length();
    if (L < 1e-5) return;
    _c.divideScalar(L);
    _up.set(0, 1, 0);
    if (Math.abs(_c.y) > 0.99) _up.set(1, 0, 0);
    const xAxis = new THREE.Vector3().crossVectors(_up, _c).normalize();
    const yAxis = new THREE.Vector3().crossVectors(_c, xAxis).normalize();
    if (roll) { xAxis.applyAxisAngle(_c, roll); yAxis.applyAxisAngle(_c, roll); }
    if (g === TPL.box) {
      _m.makeBasis(xAxis.multiplyScalar(w), yAxis.multiplyScalar(h), _c.clone().multiplyScalar(L));
    } else {
      // cylinder-like: template axis is Y
      _m.makeBasis(xAxis.multiplyScalar(w), _c.clone().multiplyScalar(L), yAxis.multiplyScalar(h));
    }
    _m.setPosition((_a.x + _b.x) / 2, (_a.y + _b.y) / 2, (_a.z + _b.z) / 2);
    this.geoM(mat, g, _m, col);
  }
  cyl(mat, p0, p1, r, col, g = TPL.cyl) { this.beam(mat, p0, p1, r * 2, r * 2, col, g); }
  // vertical cylinder: x,z centre, y bottom
  vcyl(mat, x, y, z, r, h, col, g = TPL.cyl) { this.geo(mat, g, x, y + h / 2, z, r * 2, h, r * 2, col); }
  sphere(mat, x, y, z, r, col, g = TPL.sphere) { this.geo(mat, g, x, y, z, r * 2, r * 2, r * 2, col); }
  shadow(x, z, y, sx, sz, mats) { this.floor(mats.shadow, x - sx / 2, z - sz / 2, x + sx / 2, z + sz / 2, y + 0.015, [1, 1, 1], false, 1e9); this._fixShadowUV(mats.shadow); }
  _fixShadowUV(mat) {
    const b = this.bucket(mat);
    const n = b.u.length;
    b.u[n - 8] = 0; b.u[n - 7] = 1; b.u[n - 6] = 1; b.u[n - 5] = 1; b.u[n - 4] = 1; b.u[n - 3] = 0; b.u[n - 2] = 0; b.u[n - 1] = 0;
  }
  // Build meshes
  build(group) {
    let verts = 0;
    for (const [mat, b] of this.b) {
      if (!b.i.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3));
      if (b.r) g.setAttribute('srf', new THREE.Float32BufferAttribute(b.r, 4));
      const nv = b.p.length / 3;
      g.setIndex(nv > 65535 ? new THREE.Uint32BufferAttribute(b.i, 1) : new THREE.Uint16BufferAttribute(b.i, 1));
      g.computeBoundingSphere();
      g.computeBoundingBox();
      const mesh = new THREE.Mesh(g, mat);
      mesh.matrixAutoUpdate = false;
      if (mat.userData && mat.userData.transparent) mesh.renderOrder = mat.name === 'shadow' ? 1 : 2;
      group.add(mesh);
      verts += nv;
    }
    this.b.clear();
    return verts;
  }
}

export function disposeGroup(group) {
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material && o.material.userData && o.material.userData.owned) {
      if (o.material.map) o.material.map.dispose();
      o.material.dispose();
    }
  });
}
