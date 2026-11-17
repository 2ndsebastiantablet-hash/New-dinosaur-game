// Chunk streaming: builds the shell ("structure") of nearby chunks at long range and the
// furnishing ("detail") at shorter range, on every relevant level, within a per-frame time budget.
import * as THREE from 'three';
import { CELL, CHUNK, LEVELS, LEVEL_H, E, TOP, levelY, li } from './config.js';
import { buildStructure } from './structure.js';
import { buildDetail } from './decor.js';
import { disposeGroup } from './builder.js';
import { ColliderGrid, box } from './collide.js';
import { rampHeight } from './layout.js';

export class World {
  constructor(mall, mats, scene) {
    this.mall = mall; this.mats = mats; this.scene = scene;
    const roomsByLevel = LEVELS.map((l) => mall.rooms.filter((r) => r.level === l && r.signs && r.signs.length));
    this.S = { mall, mats, roomsByLevel };
    this.CX = Math.ceil(mall.W / CHUNK); this.CZ = Math.ceil(mall.H / CHUNK);
    this.loaded = new Map(); // key -> {group, colliders}
    this.dyn = new ColliderGrid();
    this.root = new THREE.Group();
    scene.add(this.root);
    this.levelGroups = {};
    for (const l of LEVELS) { const g = new THREE.Group(); g.name = 'L' + l; this.root.add(g); this.levelGroups[l] = g; }
    this.radius = 6; this.detailRadius = 3;
    this.lastKey = '';
    this.queue = [];
    this.nonEmpty = new Set();
    for (const l of LEVELS) for (let cx = 0; cx < this.CX; cx++) for (let cz = 0; cz < this.CZ; cz++) {
      let any = false;
      for (let z = cz * CHUNK; z < Math.min(mall.H, (cz + 1) * CHUNK) && !any; z++) for (let x = cx * CHUNK; x < Math.min(mall.W, (cx + 1) * CHUNK); x++) {
        if (mall.roomId(l, x, z) >= 0) { any = true; break; }
        // a chunk can also hold exterior scenery next to entrances
      }
      if (any) this.nonEmpty.add(`${l}:${cx}:${cz}`);
    }
    this.stats = { chunks: 0, verts: 0 };
  }
  dispose() {
    for (const k of [...this.loaded.keys()]) this.unload(k);
    this.scene.remove(this.root);
  }
  setRadius(r) { this.radius = r; this.detailRadius = Math.max(2, Math.round(r * 0.5)); this.lastKey = ''; }
  radiiFor(l, pl) {
    const d = Math.abs(l - pl);
    const R = this.radius, Rd = this.detailRadius;
    if (l === -1 && pl >= 0) return pl === 0 ? [1, 1] : [0, -1];
    if (pl === -1 && l >= 0) return l === 0 ? [1, 1] : [0, -1];
    if (d === 0) return [R, Rd];
    if (d === 1) return [Math.ceil(R * 0.7), Math.ceil(Rd * 0.7)];
    return [Math.ceil(R * 0.5), Math.max(1, Math.floor(Rd * 0.5))];
  }
  plan(px, pz, pl) {
    const pcx = Math.floor(px / (CHUNK * CELL)), pcz = Math.floor(pz / (CHUNK * CELL));
    const key = `${pcx}:${pcz}:${pl}:${this.radius}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    const want = new Map();
    for (const l of LEVELS) {
      const [rs, rd] = this.radiiFor(l, pl);
      if (rs <= 0) continue;
      for (let cx = pcx - rs; cx <= pcx + rs; cx++) for (let cz = pcz - rs; cz <= pcz + rs; cz++) {
        if (cx < 0 || cz < 0 || cx >= this.CX || cz >= this.CZ) continue;
        const dist = Math.hypot(cx - pcx, cz - pcz);
        if (dist > rs + 0.5) continue;
        const base = `${l}:${cx}:${cz}`;
        if (!this.nonEmpty.has(base)) continue;
        want.set(`s:${base}`, { part: 's', l, cx, cz, dist: dist + Math.abs(l - pl) * 1.5 });
        if (dist <= rd + 0.5) want.set(`d:${base}`, { part: 'd', l, cx, cz, dist: dist + 0.6 + Math.abs(l - pl) * 1.5 });
      }
    }
    // unload what is no longer wanted (with hysteresis)
    for (const [k, c] of this.loaded) {
      if (want.has(k)) continue;
      const [rs, rd] = this.radiiFor(c.l, pl);
      const dist = Math.hypot(c.cx - pcx, c.cz - pcz);
      const lim = (c.part === 's' ? rs : rd) + 1.6;
      if (dist > lim || rs <= 0) this.unload(k);
    }
    this.queue = [...want.entries()].filter(([k]) => !this.loaded.has(k)).map(([k, v]) => ({ k, ...v })).sort((a, b) => a.dist - b.dist);
  }
  unload(k) {
    const c = this.loaded.get(k);
    if (!c) return;
    if (c.group) { c.group.parent && c.group.parent.remove(c.group); disposeGroup(c.group); }
    if (c.colliders && c.colliders.length) this.dyn.removeOwner(k, c.colliders);
    this.stats.verts -= c.verts || 0;
    this.loaded.delete(k);
  }
  update(px, pz, pl, budgetMs = 7) {
    this.plan(px, pz, pl);
    const t0 = performance.now();
    let n = 0;
    while (this.queue.length && (performance.now() - t0 < budgetMs || n === 0)) {
      const job = this.queue.shift();
      if (this.loaded.has(job.k)) continue;
      this.buildJob(job);
      n++;
    }
    this.stats.chunks = this.loaded.size;
    return this.queue.length;
  }
  buildJob(job) {
    let group, colliders = [];
    if (job.part === 's') group = buildStructure(this.S, job.l, job.cx, job.cz);
    else {
      const res = buildDetail(this.S, job.l, job.cx, job.cz);
      group = res.group; colliders = res.colliders;
      for (const b of colliders) this.dyn.add(b, job.k);
    }
    group.name = job.k;
    this.levelGroups[job.l].add(group);
    group.updateMatrixWorld(true);
    const verts = group.userData.verts || 0;
    this.stats.verts += verts;
    this.loaded.set(job.k, { group, colliders, l: job.l, cx: job.cx, cz: job.cz, part: job.part, verts });
  }
  // ------------------------------------------------------------------ collision
  collect(x0, z0, x1, z1, y0, y1, out) {
    const mall = this.mall;
    out.length = 0;
    mall.static.query(x0, z0, x1, z1, out);
    this.dyn.query(x0, z0, x1, z1, out);
    // wall edges
    const cx0 = Math.floor(x0 / CELL) - 1, cx1 = Math.floor(x1 / CELL) + 1;
    const cz0 = Math.floor(z0 / CELL) - 1, cz1 = Math.floor(z1 / CELL) + 1;
    for (const l of LEVELS) {
      const Y = levelY(l);
      if (Y > y1 || Y + LEVEL_H < y0) continue;
      for (let z = cz0; z <= cz1; z++) for (let x = cx0; x <= cx1; x++) {
        if (x < 0 || z < 0 || x > mall.W || z > mall.H) continue;
        if (z < mall.H) this.edgeBoxes(l, 'v', x, z, mall.edgeV(l, x, z), out);
        if (x < mall.W) this.edgeBoxes(l, 'h', x, z, mall.edgeH(l, x, z), out);
      }
    }
    return out;
  }
  edgeBoxes(l, o, x, z, t, out) {
    if (t === E.NONE || t === E.ENTRANCE || t === E.NORAIL) return;
    const Y = levelY(l), th = 0.2;
    const top = t === E.RAIL ? Y + 2.2 : Y + LEVEL_H;
    const segs = t === E.DOOR ? [[0, 1.3], [2.7, CELL]] : t === E.OPEN ? [[0, 0.4], [3.6, CELL]] : [[0, CELL]];
    for (const [a, b] of segs) {
      if (o === 'v') out.push({ x0: x * CELL - th, x1: x * CELL + th, z0: z * CELL + a, z1: z * CELL + b, y0: Y, y1: top });
      else out.push({ x0: x * CELL + a, x1: x * CELL + b, z0: z * CELL - th, z1: z * CELL + th, y0: Y, y1: top });
    }
  }
  groundAt(x, z, feetY, step = 0.6) {
    const mall = this.mall;
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    let best = -Infinity, ramp = null;
    for (const l of LEVELS) {
      const y = levelY(l);
      if (y <= feetY + step && y > best && mall.hasFloor(l, cx, cz)) best = y;
    }
    const rs = mall.rampsAt(x, z);
    if (rs) for (const r of rs) {
      if (x < r.x0 || x > r.x1 || z < r.z0 || z > r.z1) continue;
      const h = rampHeight(r, x, z);
      if (h <= feetY + step && h >= best) { best = h; ramp = r; }
    }
    return { y: best, ramp };
  }
  ceilingAt(x, z, headY) {
    // lowest slab underside above headY
    const mall = this.mall;
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (const l of LEVELS) {
      const under = levelY(l) - 0.45;
      if (under >= headY - 0.3 && mall.hasFloor(l, cx, cz)) return under;
    }
    return Infinity;
  }
}
