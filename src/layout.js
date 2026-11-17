// Procedural mega-mall floor plan generator.
// Produces a multi-level cell grid (4m cells) with rooms, voids, edges (walls, storefronts,
// railings, doors), escalators, stairwells, elevators and basement tunnels.
import { RNG, rngFor } from './rng.js';
import { CELL, LEVEL_H, CEIL, LEVELS, E, TOP, levelY, li } from './config.js';
import { ColliderGrid, box } from './collide.js';
import * as C from './catalog.js';
import { addFeatures, featureColliders } from './features.js';

const SIDES = ['N', 'S', 'W', 'E'];

export class Mall {
  constructor(seed, W, H) {
    this.seed = seed; this.W = W; this.H = H;
    this.rooms = [];
    this.grid = LEVELS.map(() => ({ room: new Int32Array(W * H).fill(-1), vk: new Uint8Array(W * H) }));
    this.over = LEVELS.map(() => new Map());
    this.reserved = LEVELS.map(() => new Set());
    this.ramps = [];
    this.rampGrid = new Map();
    this.static = new ColliderGrid();
    this.escalators = [];
    this.stairs = [];
    this.elevators = [];
    this.fountains = [];
    this.groups = [];
    this.labels = []; // map labels
  }
  idx(x, z) { return z * this.W + x; }
  inb(x, z) { return x >= 0 && z >= 0 && x < this.W && z < this.H; }
  roomId(l, x, z) { return this.inb(x, z) && l >= -1 && l <= TOP ? this.grid[li(l)].room[this.idx(x, z)] : -1; }
  room(l, x, z) { const id = this.roomId(l, x, z); return id >= 0 ? this.rooms[id] : null; }
  vk(l, x, z) { return this.inb(x, z) && l >= -1 && l <= TOP ? this.grid[li(l)].vk[this.idx(x, z)] : 0; }
  isVoid(l, x, z) { return this.vk(l, x, z) > 0; }
  hasFloor(l, x, z) { return this.roomId(l, x, z) >= 0 && !this.isVoid(l, x, z); }
  set(l, x, z, id, vk = 0) {
    if (!this.inb(x, z)) return;
    const g = this.grid[li(l)], i = this.idx(x, z);
    g.room[i] = id; g.vk[i] = vk;
  }
  setRect(l, x0, z0, x1, z1, id, vk = 0) {
    for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) this.set(l, x, z, id, vk);
  }
  setVoid(l, x, z, vk) { if (this.inb(x, z)) this.grid[li(l)].vk[this.idx(x, z)] = vk; }
  addRoom(r) {
    r.id = this.rooms.length;
    r.seed = rngFor(this.seed, 'room', r.id).s;
    r.signs = r.signs || [];
    this.rooms.push(r);
    return r;
  }
  // edge keys
  vkey(x, z) { return (x * this.H + z) * 2; }       // vertical edge at X=x between cells (x-1,z),(x,z)
  hkey(x, z) { return (z * this.W + x) * 2 + 1; }   // horizontal edge at Z=z between (x,z-1),(x,z)
  keyBetween(ax, az, bx, bz) {
    if (az === bz) return this.vkey(Math.max(ax, bx), az);
    return this.hkey(ax, Math.max(az, bz));
  }
  setEdge(l, ax, az, bx, bz, type) { this.over[li(l)].set(this.keyBetween(ax, az, bx, bz), type); }
  edgeV(l, x, z) { return this.edges[li(l)].v[x * this.H + z]; }
  edgeH(l, x, z) { return this.edges[li(l)].h[z * this.W + x]; }
  edgeBetween(l, ax, az, bx, bz) {
    if (az === bz) return this.edgeV(l, Math.max(ax, bx), az);
    return this.edgeH(l, ax, Math.max(az, bz));
  }
  addRamp(r) {
    this.ramps.push(r);
    const minT = Math.min(r.t0, r.t0 + r.dir * r.len), maxT = Math.max(r.t0, r.t0 + r.dir * r.len);
    const [x0, x1, z0, z1] = r.axis === 'z' ? [r.lo, r.hi, minT, maxT] : [minT, maxT, r.lo, r.hi];
    r.x0 = x0; r.x1 = x1; r.z0 = z0; r.z1 = z1;
    for (let cx = Math.floor(x0 / CELL); cx <= Math.floor((x1 - 0.001) / CELL); cx++)
      for (let cz = Math.floor(z0 / CELL); cz <= Math.floor((z1 - 0.001) / CELL); cz++) {
        const k = this.idx(cx, cz);
        if (!this.rampGrid.has(k)) this.rampGrid.set(k, []);
        this.rampGrid.get(k).push(r);
      }
  }
  rampsAt(x, z) { return this.rampGrid.get(this.idx(Math.floor(x / CELL), Math.floor(z / CELL))) || null; }
  levelOfY(y) { return Math.max(-1, Math.min(TOP, Math.floor((y + 2.0) / LEVEL_H))); }
}

export function rampHeight(r, x, z) {
  const p = r.axis === 'z' ? z : x;
  let f = ((p - r.t0) * r.dir) / r.len;
  f = Math.max(0, Math.min(1, f));
  return r.y0 + f * (r.y1 - r.y0);
}

// ---------------------------------------------------------------------------
export function generateMall(seed) {
  const rng = new RNG(seed);
  const NBX = 8, NBZ = 8, M = 3;
  const bw = [], bd = [];
  for (let i = 0; i < NBX; i++) bw.push(rng.int(16, 22));
  for (let j = 0; j < NBZ; j++) bd.push(rng.int(16, 22));
  const pickMains = (n) => {
    const s = new Set([Math.floor((n - 1) / 2)]);
    let t = 0;
    while (s.size < 3 && t++ < 60) { const k = rng.int(0, n - 1); if (![...s].some((v) => Math.abs(v - k) < 2)) s.add(k); }
    return s;
  };
  const colMain = pickMains(NBX - 1), rowMain = pickMains(NBZ - 1);
  const names = rng.shuffle([...C.LANE_NAMES]);
  let ni = 0;
  const bx0 = [], bx1 = [], colLanes = [];
  let x = M;
  for (let i = 0; i < NBX; i++) {
    bx0[i] = x; x += bw[i]; bx1[i] = x;
    if (i < NBX - 1) {
      const main = colMain.has(i), w = main ? 5 : 3;
      colLanes.push({ axis: 'z', i, x0: x, x1: x + w, w, main, name: names[ni++] + (main ? ' Boulevard' : ' Avenue') });
      x += w;
    }
  }
  const W = x + M;
  const bz0 = [], bz1 = [], rowLanes = [];
  let z = M;
  for (let j = 0; j < NBZ; j++) {
    bz0[j] = z; z += bd[j]; bz1[j] = z;
    if (j < NBZ - 1) {
      const main = rowMain.has(j), w = main ? 5 : 3;
      rowLanes.push({ axis: 'x', j, z0: z, z1: z + w, w, main, name: names[ni++] + (main ? ' Promenade' : ' Walk') });
      z += w;
    }
  }
  const H = z + M;
  const mall = new Mall(seed, W, H);
  mall.colLanes = colLanes; mall.rowLanes = rowLanes;
  mall.NBX = NBX; mall.NBZ = NBZ;

  // ---- blocks
  const blocks = [];
  for (let i = 0; i < NBX; i++) {
    blocks.push([]);
    for (let j = 0; j < NBZ; j++) blocks[i].push({ i, j, x0: bx0[i], x1: bx1[i], z0: bz0[j], z1: bz1[j], exists: true, group: null, anchor: null, venue: {}, district: {} });
  }
  mall.blocks = blocks;
  const B = (i, j) => (i >= 0 && j >= 0 && i < NBX && j < NBZ ? blocks[i][j] : null);
  for (const [ci, cj, di, dj] of [[0, 0, 1, 1], [NBX - 1, 0, -1, 1], [0, NBZ - 1, 1, -1], [NBX - 1, NBZ - 1, -1, -1]]) {
    if (!rng.chance(0.8)) continue;
    blocks[ci][cj].exists = false;
    if (rng.chance(0.5)) blocks[ci + di][cj].exists = false;
    if (rng.chance(0.5)) blocks[ci][cj + dj].exists = false;
  }
  // a few notches along the edges
  for (let k = 0; k < 2; k++) {
    if (!rng.chance(0.6)) continue;
    const side = rng.int(0, 3);
    const t = rng.int(2, (side < 2 ? NBX : NBZ) - 3);
    const b = side === 0 ? B(t, 0) : side === 1 ? B(t, NBZ - 1) : side === 2 ? B(0, t) : B(NBX - 1, t);
    if (b) b.exists = false;
  }

  // ---- multi-block attractions
  const free = (i, j) => { const b = B(i, j); return b && b.exists && !b.group && !b.anchor && Object.keys(b.venue).length === 0; };
  const ci = (NBX - 1) / 2, cj = (NBZ - 1) / 2;
  for (const def of C.MULTI_ATTRACTIONS) {
    if (def.chance && !rng.chance(def.chance)) continue;
    for (let c = 0; c < def.count; c++) {
      const cands = [];
      for (let i = 0; i + def.bw <= NBX; i++) for (let j = 0; j + def.bd <= NBZ; j++) {
        let ok = true;
        for (let a = 0; a < def.bw && ok; a++) for (let b = 0; b < def.bd && ok; b++) if (!free(i + a, j + b)) ok = false;
        if (!ok) continue;
        const dc = Math.hypot(i + def.bw / 2 - 0.5 - ci, j + def.bd / 2 - 0.5 - cj);
        const score = (def.type === 'themepark' ? -dc * 2 : -Math.abs(dc - 2.5)) + rng.next() * 3;
        cands.push({ i, j, score });
      }
      if (!cands.length) break;
      cands.sort((a, b) => b.score - a.score);
      const { i, j } = cands[0];
      const g = { ...def, name: def.names ? def.names[c % def.names.length] : def.name, i0: i, j0: j, i1: i + def.bw - 1, j1: j + def.bd - 1, base: 0 };
      g.x0 = bx0[g.i0]; g.x1 = bx1[g.i1]; g.z0 = bz0[g.j0]; g.z1 = bz1[g.j1];
      g.idx = mall.groups.length;
      mall.groups.push(g);
      for (let a = i; a <= g.i1; a++) for (let b = j; b <= g.j1; b++) blocks[a][b].group = g;
    }
  }
  const sameGroup = (a, b) => a && b && a.group && a.group === b.group;

  // ---- anchors (department stores, all retail levels)
  {
    const cands = [];
    for (let i = 0; i < NBX; i++) for (let j = 0; j < NBZ; j++) if (free(i, j)) {
      const edge = i === 0 || j === 0 || i === NBX - 1 || j === NBZ - 1;
      cands.push({ i, j, score: (edge ? 1.5 : 0) + rng.next() * 2 });
    }
    cands.sort((a, b) => b.score - a.score);
    const anchorNames = rng.shuffle([...C.ANCHOR_NAMES]);
    let n = 0;
    for (const c of cands) {
      if (n >= 5) break;
      // keep anchors apart
      let near = false;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const bb = B(c.i + a, c.j + b); if (bb && bb.anchor) near = true; }
      if (near) continue;
      blocks[c.i][c.j].anchor = { name: anchorNames[n % anchorNames.length] };
      n++;
    }
  }
  // ---- single-level venues
  for (const def of C.BLOCK_VENUES) {
    for (let c = 0; c < def.count; c++) {
      const l = def.levels[c % def.levels.length];
      const cands = [];
      for (let i = 0; i < NBX; i++) for (let j = 0; j < NBZ; j++) {
        const b = blocks[i][j];
        if (!b.exists || b.group || b.anchor || b.venue[l]) continue;
        if (Object.keys(b.venue).length >= 2) continue;
        cands.push(b);
      }
      if (!cands.length) continue;
      const b = rng.pick(cands);
      b.venue[l] = { ...def, name: def.names ? def.names[c % def.names.length] : def.name, level: l };
    }
  }
  // ---- districts per level
  const districtSeeds = {};
  for (const l of [0, 1, 2]) {
    const ds = rng.shuffle([...C.DISTRICTS]).slice(0, 5);
    districtSeeds[l] = ds.map((d) => ({ d, i: rng.range(0, NBX - 1), j: rng.range(0, NBZ - 1) }));
    for (let i = 0; i < NBX; i++) for (let j = 0; j < NBZ; j++) {
      let best = null, bd2 = 1e9;
      for (const s of districtSeeds[l]) { const dd = (s.i - i) ** 2 + (s.j - j) ** 2; if (dd < bd2) { bd2 = dd; best = s.d; } }
      blocks[i][j].district[l] = best;
    }
  }

  // ---- concourse
  const conc = {};
  for (const l of [0, 1, 2]) conc[l] = mall.addRoom({ kind: 'concourse', type: 'concourse', level: l, name: 'Concourse', floor: 'marble' });
  const colSeg = (i, j) => { const a = B(i, j), b = B(i + 1, j); return !!(a && b && a.exists && b.exists && !sameGroup(a, b)); };
  const rowSeg = (i, j) => { const a = B(i, j), b = B(i, j + 1); return !!(a && b && a.exists && b.exists && !sameGroup(a, b)); };
  const interActive = (i, j) => colSeg(i, j) || colSeg(i, j + 1) || rowSeg(i, j) || rowSeg(i + 1, j);
  mall.colSeg = colSeg; mall.rowSeg = rowSeg;
  for (const l of [0, 1, 2]) {
    const id = conc[l].id;
    for (const lane of colLanes) {
      for (let j = 0; j < NBZ; j++) if (colSeg(lane.i, j)) {
        for (let zz = bz0[j]; zz < bz1[j]; zz++) for (let xx = lane.x0; xx < lane.x1; xx++) {
          const v = lane.main && l >= 1 && xx > lane.x0 && xx < lane.x1 - 1 ? 1 : 0;
          mall.set(l, xx, zz, id, v);
        }
      }
    }
    for (const lane of rowLanes) {
      for (let i = 0; i < NBX; i++) if (rowSeg(i, lane.j)) {
        for (let xx = bx0[i]; xx < bx1[i]; xx++) for (let zz = lane.z0; zz < lane.z1; zz++) {
          const v = lane.main && l >= 1 && zz > lane.z0 && zz < lane.z1 - 1 ? 1 : 0;
          mall.set(l, xx, zz, id, v);
        }
      }
    }
    for (const cl of colLanes) for (const rl of rowLanes) {
      if (!interActive(cl.i, rl.j)) continue;
      for (let xx = cl.x0; xx < cl.x1; xx++) for (let zz = rl.z0; zz < rl.z1; zz++) {
        const v = cl.main && rl.main && l >= 1 && xx > cl.x0 && xx < cl.x1 - 1 && zz > rl.z0 && zz < rl.z1 - 1 ? 1 : 0;
        mall.set(l, xx, zz, id, v);
      }
    }
  }
  // fountains at main x main atriums (ground floor)
  for (const cl of colLanes) for (const rl of rowLanes) {
    if (!cl.main || !rl.main || !interActive(cl.i, rl.j)) continue;
    const fx = (cl.x0 + 2.5) * CELL, fz = (rl.z0 + 2.5) * CELL;
    mall.fountains.push({ x: fx, z: fz, r: 5 });
    for (let a = 1; a < 4; a++) for (let b = 1; b < 4; b++) mall.reserved[li(0)].add(mall.idx(cl.x0 + a, rl.z0 + b));
    mall.static.add(box(fx - 1.2, 0, fz - 1.2, fx + 1.2, 4, fz + 1.2));
    mall.labels.push({ level: 1, x: fx, z: fz, text: 'Atrium', kind: 'atrium' });
  }

  // ---- escalator helper
  const escalatorPair = (level, axis, dir, cross, start, makeVoid, roomCheck = true) => {
    const cell = (t) => (axis === 'z' ? [cross, t] : [t, cross]);
    const run = [1, 2, 3].map((k) => cell(start + dir * k));
    const [sx, sz] = cell(start), [ax, az] = cell(start + dir * 4);
    if (makeVoid) for (const [rx, rz] of run) mall.setVoid(level + 1, rx, rz, 1);
    const [r1x, r1z] = run[0], [r3x, r3z] = run[2];
    mall.setEdge(level, sx, sz, r1x, r1z, E.NORAIL);
    mall.setEdge(level + 1, r3x, r3z, ax, az, E.NORAIL);
    for (const [rx, rz] of [[sx, sz], ...run]) mall.reserved[li(level)].add(mall.idx(rx, rz));
    mall.reserved[li(level + 1)].add(mall.idx(ax, az));
    const cc = (cross + 0.5) * CELL;
    const t0 = dir > 0 ? (start + 1) * CELL : start * CELL;
    const y0 = levelY(level), y1 = levelY(level + 1), len = 3 * CELL;
    const esc = { level, axis, dir, cross, start, t0, cc, y0, y1, len };
    mall.escalators.push(esc);
    [[-0.85, 1], [0.85, -1]].forEach(([off, move]) => {
      mall.addRamp({ kind: 'escalator', axis, dir, t0, len, y0, y1, lo: cc + off - 0.55, hi: cc + off + 0.55, move });
    });
    // collision: balustrades + underside slices
    const tA = Math.min(t0, t0 + dir * len), tB = Math.max(t0, t0 + dir * len);
    const mk = (c0, c1, t_0, t_1, ya, yb) => (axis === 'z' ? box(c0, ya, t_0, c1, yb, t_1) : box(t_0, ya, c0, t_1, yb, c1));
    for (const c of [cc - 1.72, cc - 0.05, cc + 1.72]) mall.static.add(mk(c - 0.12, c + 0.12, tA + 0.1, tB - 0.1, y0, y1 + 1.2));
    const N = 8;
    for (let k = 0; k < N; k++) {
      const ta = tA + (k * len) / N, tb = tA + ((k + 1) * len) / N;
      const lowEndT = dir > 0 ? ta : tb;
      const f = ((lowEndT - t0) * dir) / len;
      const top = y0 + f * (y1 - y0) - 0.3;
      if (top - y0 > 0.55) mall.static.add(mk(cc - 1.7, cc + 1.7, ta, tb, y0, top));
    }
    return esc;
  };

  // ---- boulevard voids: bridges and escalator groups
  const laneEsc = (lane, isCol) => {
    const segs = [];
    if (isCol) { for (let j = 0; j < NBZ; j++) if (colSeg(lane.i, j)) segs.push([bz0[j], bz1[j]]); }
    else { for (let i = 0; i < NBX; i++) if (rowSeg(i, lane.j)) segs.push([bx0[i], bx1[i]]); }
    const cross = isCol ? lane.x0 + 2 : lane.z0 + 2;
    const axis = isCol ? 'z' : 'x';
    const voidCross = isCol ? [lane.x0 + 1, lane.x0 + 2, lane.x0 + 3] : [lane.z0 + 1, lane.z0 + 2, lane.z0 + 3];
    const bridge = (t) => { for (const l of [1, 2]) for (const c of voidCross) { if (isCol) mall.setVoid(l, c, t, 0); else mall.setVoid(l, t, c, 0); } };
    for (const [s0, s1] of segs) {
      const L = s1 - s0;
      if (L >= 14 && rng.chance(0.8)) {
        const dir = rng.chance(0.5) ? 1 : -1;
        const off = rng.int(2, L - 11);
        const t0 = dir > 0 ? s0 + off : s1 - 1 - off;
        const row = (k) => t0 + dir * k;
        bridge(row(4)); bridge(row(8));
        escalatorPair(0, axis, dir, cross, row(0), false);
        escalatorPair(1, axis, dir, cross, row(4), false);
      } else {
        const t = s0 + Math.floor(L / 2);
        bridge(t);
      }
    }
  };
  for (const lane of colLanes) if (lane.main) laneEsc(lane, true);
  for (const lane of rowLanes) if (lane.main) laneEsc(lane, false);

  // ---- glass elevators in secondary lanes
  const addElevator = (cx, cz) => {
    const wx = (cx + 0.5) * CELL, wz = (cz + 0.5) * CELL;
    mall.elevators.push({ x: wx, z: wz, cx, cz, levels: [0, 1, 2] });
    mall.static.add(box(wx - 1.55, 0, wz - 1.55, wx + 1.55, levelY(TOP) + CEIL, wz + 1.55));
    for (const l of [0, 1, 2]) mall.reserved[li(l)].add(mall.idx(cx, cz));
  };
  for (const lane of colLanes) if (!lane.main) for (let j = 0; j < NBZ; j++) {
    if (colSeg(lane.i, j) && rng.chance(0.45)) addElevator(lane.x0 + 1, Math.floor((bz0[j] + bz1[j]) / 2));
  }
  for (const lane of rowLanes) if (!lane.main) for (let i = 0; i < NBX; i++) {
    if (rowSeg(i, lane.j) && rng.chance(0.45)) addElevator(Math.floor((bx0[i] + bx1[i]) / 2), lane.z0 + 1);
  }

  // ---- helpers for frontage
  const isConcFloor = (l, xx, zz) => { const r = mall.room(l, xx, zz); return r && r.kind === 'concourse' && !mall.isVoid(l, xx, zz); };
  const sideCells = (r, side) => { // list of [inside cell, outside cell]
    const out = [];
    if (side === 'N') for (let xx = r.x0; xx < r.x1; xx++) out.push([xx, r.z0, xx, r.z0 - 1]);
    if (side === 'S') for (let xx = r.x0; xx < r.x1; xx++) out.push([xx, r.z1 - 1, xx, r.z1]);
    if (side === 'W') for (let zz = r.z0; zz < r.z1; zz++) out.push([r.x0, zz, r.x0 - 1, zz]);
    if (side === 'E') for (let zz = r.z0; zz < r.z1; zz++) out.push([r.x1 - 1, zz, r.x1, zz]);
    return out;
  };
  // Make storefronts on all concourse-facing sides. entranceEvery: spacing for entrances
  const makeFronts = (r, entranceWidth, entranceEvery, signAll = false) => {
    const l = r.level;
    const fronts = [];
    for (const side of SIDES) {
      const cells = sideCells(r, side).filter(([ix, iz, ox, oz]) => isConcFloor(l, ox, oz) && mall.roomId(l, ix, iz) === r.id);
      if (!cells.length) continue;
      for (const [ix, iz, ox, oz] of cells) mall.setEdge(l, ix, iz, ox, oz, E.STOREFRONT);
      fronts.push({ side, cells });
    }
    fronts.sort((a, b) => b.cells.length - a.cells.length);
    r.fronts = fronts.map((f) => f.side);
    fronts.forEach((f, fi) => {
      const n = f.cells.length;
      const count = Math.max(1, Math.round(n / entranceEvery));
      const ew = Math.min(entranceWidth, n);
      for (let k = 0; k < count; k++) {
        const center = Math.floor(((k + 0.5) * n) / count);
        const a = Math.max(0, Math.min(n - ew, center - Math.floor(ew / 2)));
        for (let q = a; q < a + ew; q++) {
          const [ix, iz, ox, oz] = f.cells[q];
          mall.setEdge(l, ix, iz, ox, oz, E.ENTRANCE);
        }
      }
      if (fi === 0 || signAll || (fi === 1 && n >= 4)) {
        const c0 = f.cells[0], c1 = f.cells[n - 1];
        r.signs.push({ side: f.side, a: f.side === 'N' || f.side === 'S' ? c0[0] : c0[1], b: (f.side === 'N' || f.side === 'S' ? c1[0] : c1[1]) + 1 });
      }
    });
    return fronts;
  };
  const doorTo = (r, targetId, preferMid = true) => {
    const l = r.level;
    const cand = [];
    for (const side of SIDES) for (const [ix, iz, ox, oz] of sideCells(r, side)) {
      if (mall.roomId(l, ix, iz) === r.id && mall.roomId(l, ox, oz) === targetId && !mall.isVoid(l, ox, oz)) cand.push([ix, iz, ox, oz]);
    }
    if (!cand.length) return false;
    const c = preferMid ? cand[Math.floor(cand.length / 2)] : cand[rngFor(r.seed, 'door').int(0, cand.length - 1)];
    mall.setEdge(l, c[0], c[1], c[2], c[3], E.DOOR);
    r.doors = r.doors || [];
    r.doors.push(c);
    return true;
  };

  // ---- stairwell (spans B1..L3)
  const stairwell = (blk, sx, sz) => {
    const st = { x0: sx, z0: sz, rooms: {} };
    for (const l of LEVELS) {
      const r = mall.addRoom({ kind: 'stair', type: 'stair', level: l, name: 'Emergency Stairwell', x0: sx, z0: sz, x1: sx + 2, z1: sz + 5, floor: 'concrete' });
      mall.setRect(l, sx, sz, sx + 2, sz + 5, r.id);
      st.rooms[l] = r;
    }
    const mod2 = (k) => ((k % 2) + 2) % 2;
    for (let k = -1; k <= 1; k++) {
      const lane = mod2(k), dir = mod2(k) === 0 ? 1 : -1;
      const startRow = dir > 0 ? 0 : 4;
      const xx = sx + lane;
      for (let q = 1; q <= 3; q++) mall.setVoid(k + 1, xx, sz + q, 2);
      // railing at the low end on the level above
      mall.setEdge(k + 1, xx, sz + startRow, xx, sz + startRow + dir, E.RAIL);
      const t0 = dir > 0 ? (sz + 1) * CELL : (sz + 4) * CELL;
      const y0 = levelY(k), y1 = levelY(k + 1), len = 3 * CELL;
      mall.addRamp({ kind: 'stairs', axis: 'z', dir, t0, len, y0, y1, lo: xx * CELL + 0.12, hi: (xx + 1) * CELL - 0.12, move: 0 });
      const tA = (sz + 1) * CELL, tB = (sz + 4) * CELL;
      const N = 8;
      for (let q = 0; q < N; q++) {
        const ta = tA + (q * len) / N, tb = tA + ((q + 1) * len) / N;
        const lowEndT = dir > 0 ? ta : tb;
        const top = y0 + (((lowEndT - t0) * dir) / len) * (y1 - y0) - 0.3;
        if (top - y0 > 0.55) mall.static.add(box(xx * CELL + 0.1, y0, ta, (xx + 1) * CELL - 0.1, top, tb));
      }
    }
    mall.static.add(box((sx + 1) * CELL - 0.12, levelY(-1), (sz + 1) * CELL, (sx + 1) * CELL + 0.12, levelY(TOP) + CEIL, (sz + 4) * CELL));
    for (const l of LEVELS) {
      const row = mod2(l) === 0 ? 0 : 4;
      mall.setEdge(l, sx, sz + row, sx - 1, sz + row, E.DOOR);
    }
    mall.stairs.push(st);
    blk.stair = st;
    return st;
  };

  // ---- store category picking
  const pickCat = (blk, l, r) => {
    const d = blk.district[l];
    if (r.chance(0.04)) return 'vacant';
    if (r.chance(0.72) && d) return r.weighted(Object.entries(d.mix));
    return r.weighted(Object.keys(C.STORE_CATS).filter((k) => k !== 'vacant').map((k) => [k, 1]));
  };

  // ---- retail block layout (one level)
  const retailBlock = (blk, l) => {
    const r = rngFor(seed, 'blk', blk.i, blk.j, l);
    const { x0, x1, z0, z1 } = blk;
    const mx = Math.floor((x0 + x1) / 2), mz = Math.floor((z0 + z1) / 2);
    const f = { N: isConcFloor(l, mx, z0 - 1), S: isConcFloor(l, mx, z1), W: isConcFloor(l, x0 - 1, mz), E: isConcFloor(l, x1, mz) };
    const minDim = Math.min(x1 - x0, z1 - z0);
    const d = minDim >= 19 ? 6 : 5;
    const ix0 = x0 + (f.W ? d : 0), ix1 = x1 - (f.E ? d : 0), iz0 = z0 + (f.N ? d : 0), iz1 = z1 - (f.S ? d : 0);
    const district = blk.district[l];
    // service ring
    const ring = mall.addRoom({ kind: 'service', type: 'corridor', level: l, name: 'Service Corridor', x0: ix0, z0: iz0, x1: ix1, z1: iz1, floor: 'concrete', district: district && district.name });
    for (let zz = iz0; zz < iz1; zz++) for (let xx = ix0; xx < ix1; xx++) {
      if (xx === ix0 || xx === ix1 - 1 || zz === iz0 || zz === iz1 - 1) mall.set(l, xx, zz, ring.id);
    }
    // strips
    const strips = [];
    if (f.N) strips.push({ side: 'N', a: x0, b: x1, lo: z0, hi: z0 + d, cornerA: f.W, cornerB: f.E });
    if (f.S) strips.push({ side: 'S', a: x0, b: x1, lo: z1 - d, hi: z1, cornerA: f.W, cornerB: f.E });
    if (f.W) strips.push({ side: 'W', a: iz0, b: iz1, lo: x0, hi: x0 + d });
    if (f.E) strips.push({ side: 'E', a: iz0, b: iz1, lo: x1 - d, hi: x1 });
    let hallways = 0, restrooms = 0;
    for (const s of strips) {
      const L = s.b - s.a;
      const widths = [];
      let rem = L;
      const first = s.cornerA ? d + 1 + r.int(0, 1) : 0, last = s.cornerB ? d + 1 + r.int(0, 1) : 0;
      rem -= first + last;
      while (rem > 0) {
        let w;
        if (hallways < 2 && rem >= 6 && r.chance(0.18)) { w = -1; hallways++; }
        else if (restrooms < 1 && rem >= 6 && r.chance(0.12)) { w = -2; restrooms++; }
        else w = r.weighted([[2, 2], [3, 5], [4, 4], [5, 2], [6, 1]]);
        const ww = w === -1 ? 1 : w === -2 ? 2 : w;
        if (rem - ww === 1 || ww > rem) { widths.push(rem); rem = 0; break; }
        widths.push(w); rem -= ww;
      }
      const list = [];
      if (first) list.push(first);
      list.push(...widths);
      if (last) list.push(last);
      let p = s.a;
      for (const w of list) {
        const ww = w === -1 ? 1 : w === -2 ? 2 : w;
        const rect = s.side === 'N' || s.side === 'S' ? { x0: p, x1: p + ww, z0: s.lo, z1: s.hi } : { x0: s.lo, x1: s.hi, z0: p, z1: p + ww };
        p += ww;
        if (w === -1) {
          mall.setRect(l, rect.x0, rect.z0, rect.x1, rect.z1, ring.id);
          // door from concourse into the service hallway
          const [ix, iz, ox, oz] = sideCells(rect, s.side)[0];
          mall.setEdge(l, ix, iz, ox, oz, E.DOOR);
          ring.hallDoors = ring.hallDoors || [];
          ring.hallDoors.push({ x: ix, z: iz, side: s.side });
          continue;
        }
        let room;
        if (w === -2) room = mall.addRoom({ kind: 'restroom', type: 'restroom', level: l, name: 'Restrooms', ...rect, floor: 'tile', wallColor: [0.85, 0.88, 0.9] });
        else {
          const cat = pickCat(blk, l, r);
          const nr = rngFor(seed, 'name', blk.i, blk.j, l, p, s.side);
          room = mall.addRoom({ kind: 'store', type: cat, level: l, name: C.brandName(cat, nr), ...rect, floor: C.STORE_CATS[cat].floor, wallColor: C.STORE_CATS[cat].wall, district: district && district.name });
        }
        mall.setRect(l, rect.x0, rect.z0, rect.x1, rect.z1, room.id);
        room.stripSide = s.side;
      }
    }
    // after all strips are placed, fronts and back doors
    const stripRooms = mall.rooms.filter((rm) => rm.level === l && (rm.kind === 'store' || rm.kind === 'restroom') && rm.x0 >= x0 && rm.x1 <= x1 && rm.z0 >= z0 && rm.z1 <= z1 && !rm.fronts);
    for (const rm of stripRooms) {
      makeFronts(rm, rm.x1 - rm.x0 >= 4 && rm.z1 - rm.z0 >= 4 ? 2 : 1, 99);
      if (rm.kind === 'store') doorTo(rm, ring.id, false);
    }
    // core
    const cx0 = ix0 + 1, cx1 = ix1 - 1, cz0 = iz0 + 1, cz1 = iz1 - 1;
    if (cx1 - cx0 < 1 || cz1 - cz0 < 1) return;
    let sliceStart = cx0;
    if (blk.wantStair && cz1 - cz0 >= 5 && cx1 - cx0 >= 3) {
      if (!blk.stair) stairwell(blk, cx0, cz0);
      sliceStart = cx0; // first slice shortened
    }
    let p = cx0;
    let k = 0;
    while (p < cx1) {
      let w = r.int(3, 6);
      if (cx1 - p - w < 3) w = cx1 - p;
      const rects = [];
      let zA = cz0;
      if (blk.stair && p < cx0 + 2) {
        // column next to stairwell
        if (w < 2) w = 2;
        if (p === cx0) {
          if (w > 2) { rects.push({ x0: p + 2, x1: p + w, z0: cz0, z1: cz1 }); }
          rects.push({ x0: p, x1: p + 2, z0: cz0 + 5, z1: cz1 });
          zA = null;
        }
      }
      if (zA !== null) {
        if (cz1 - cz0 >= 9) {
          const mid = cz0 + Math.floor((cz1 - cz0) / 2);
          rects.push({ x0: p, x1: p + w, z0: cz0, z1: mid }, { x0: p, x1: p + w, z0: mid, z1: cz1 });
        } else rects.push({ x0: p, x1: p + w, z0: cz0, z1: cz1 });
      }
      for (const rc of rects) {
        if (rc.x1 - rc.x0 < 1 || rc.z1 - rc.z0 < 1) continue;
        const type = r.weighted(C.BACKROOMS);
        const rm = mall.addRoom({ kind: 'back', type, level: l, name: C.BACKROOM_LABELS[type], ...rc, floor: type === 'office' || type === 'security' ? 'carpet' : 'concrete' });
        mall.setRect(l, rc.x0, rc.z0, rc.x1, rc.z1, rm.id);
        k++;
      }
      p += w;
    }
    // doors for core rooms (after all set)
    for (const rm of mall.rooms) if (rm.level === l && rm.kind === 'back' && rm.x0 >= cx0 && rm.x1 <= cx1 && rm.z0 >= cz0 && rm.z1 <= cz1 && !rm.doors) doorTo(rm, ring.id, true);
  };

  // ---- venue / anchor / attraction blocks
  const venueBlock = (blk, l, v) => {
    const room = mall.addRoom({ kind: 'venue', type: v.type, level: l, name: v.name, x0: blk.x0, x1: blk.x1, z0: blk.z0, z1: blk.z1, floor: v.floor });
    mall.setRect(l, blk.x0, blk.z0, blk.x1, blk.z1, room.id);
    const fronts = makeFronts(room, 2, 10);
    mall.labels.push({ level: l, x: (blk.x0 + blk.x1) / 2 * CELL, z: (blk.z0 + blk.z1) / 2 * CELL, text: v.name, kind: v.type });
    if (v.type === 'cinema' && fronts.length) {
      // lobby along the main front, auditoriums behind
      const side = fronts[0].side, D = 6;
      const lob = side === 'N' ? [blk.z0, blk.z0 + D] : side === 'S' ? [blk.z1 - D, blk.z1] : side === 'W' ? [blk.x0, blk.x0 + D] : [blk.x1 - D, blk.x1];
      room.lobbySide = side;
      const r = rngFor(room.seed, 'aud');
      const along = side === 'N' || side === 'S' ? [blk.x0, blk.x1] : [blk.z0, blk.z1];
      let p = along[0], n = 1;
      while (p < along[1]) {
        let w = r.int(5, 7);
        if (along[1] - p - w < 5) w = along[1] - p;
        let rc;
        if (side === 'N') rc = { x0: p, x1: p + w, z0: lob[1], z1: blk.z1 };
        else if (side === 'S') rc = { x0: p, x1: p + w, z0: blk.z0, z1: lob[0] };
        else if (side === 'W') rc = { x0: lob[1], x1: blk.x1, z0: p, z1: p + w };
        else rc = { x0: blk.x0, x1: lob[0], z0: p, z1: p + w };
        const a = mall.addRoom({ kind: 'venue', type: 'auditorium', level: l, name: `Auditorium ${n++}`, ...rc, floor: 'carpet', parent: room.id, screenSide: side === 'N' ? 'S' : side === 'S' ? 'N' : side === 'W' ? 'E' : 'W' });
        mall.setRect(l, rc.x0, rc.z0, rc.x1, rc.z1, a.id);
        p += w;
      }
      // auditoriums only open onto the lobby
      room.signs = room.signs.filter((sg) => sg.side === side);
      for (const a of mall.rooms) if (a.parent === room.id) {
        for (const sd of SIDES) for (const [ix, iz, ox, oz] of sideCells(a, sd)) if (isConcFloor(l, ox, oz)) mall.setEdge(l, ix, iz, ox, oz, E.WALL);
      }
      for (const a of mall.rooms) if (a.parent === room.id) {
        const cells = sideCells(a, side).filter(([ix, iz, ox, oz]) => mall.roomId(l, ox, oz) === room.id);
        if (cells.length) { const c = cells[1] || cells[0]; mall.setEdge(l, c[0], c[1], c[2], c[3], E.OPEN); }
      }
    }
    return room;
  };
  const anchorBlock = (blk, l) => {
    const room = mall.addRoom({ kind: 'anchor', type: 'department', level: l, name: blk.anchor.name, x0: blk.x0, x1: blk.x1, z0: blk.z0, z1: blk.z1, floor: l === 0 ? 'marble' : l === 1 ? 'wood' : 'carpet', dept: ['Cosmetics & Accessories', 'Fashion & Shoes', 'Home & Electronics'][l] });
    mall.setRect(l, blk.x0, blk.z0, blk.x1, blk.z1, room.id);
    makeFronts(room, 2, 9, true);
    if (l === 0) mall.labels.push({ level: 9, x: (blk.x0 + blk.x1) / 2 * CELL, z: (blk.z0 + blk.z1) / 2 * CELL, text: blk.anchor.name, kind: 'anchor' });
    return room;
  };

  // ---- fill blocks
  for (let i = 0; i < NBX; i++) for (let j = 0; j < NBZ; j++) {
    const b = blocks[i][j];
    if (!b.exists || b.group) continue;
    b.wantStair = !b.anchor && Object.keys(b.venue).length === 0;
  }
  // multi-block attractions
  for (const g of mall.groups) {
    const base = mall.addRoom({ kind: 'attraction', type: g.type, level: 0, name: g.name, x0: g.x0, x1: g.x1, z0: g.z0, z1: g.z1, floor: g.floor, group: g.idx, height: g.height });
    mall.setRect(0, g.x0, g.z0, g.x1, g.z1, base.id);
    g.room = base;
    for (let l = 1; l < g.height; l++) {
      const v = mall.addRoom({ kind: 'void', type: g.type, level: l, name: g.name, x0: g.x0, x1: g.x1, z0: g.z0, z1: g.z1, group: g.idx, parent: base.id });
      mall.setRect(l, g.x0, g.z0, g.x1, g.z1, v.id, 1);
    }
    mall.labels.push({ level: 9, x: (g.x0 + g.x1) / 2 * CELL, z: (g.z0 + g.z1) / 2 * CELL, text: g.name, kind: g.type });
  }
  for (const g of mall.groups) makeFronts(g.room, 2, 9, true);
  // walkable indoor ski slope
  for (const g of mall.groups) if (g.type === 'skislope') {
    const axis = g.x1 - g.x0 >= g.z1 - g.z0 ? 'x' : 'z';
    const [a0, a1, c0, c1] = axis === 'x' ? [g.x0, g.x1, g.z0, g.z1] : [g.z0, g.z1, g.x0, g.x1];
    const cm = (c0 + c1) / 2;
    const lo = (cm - 6) * CELL, hi = (cm + 6) * CELL;
    const t0 = (a0 + 6) * CELL, len = (a1 - a0 - 12) * CELL;
    const y0 = 0, y1 = 17;
    const sl = { kind: 'slope', axis, dir: 1, t0, len, y0, y1, lo, hi, move: 0 };
    mall.addRamp(sl);
    g.room.slope = sl;
    const mk = (cA, cB, tA, tB, ya, yb) => (axis === 'z' ? box(cA, ya, tA, cB, yb, tB) : box(tA, ya, cA, tB, yb, cB));
    mall.static.add(mk(lo - 0.3, lo, t0 + 0.5, t0 + len, 0, y1 + 1.3));
    mall.static.add(mk(hi, hi + 0.3, t0 + 0.5, t0 + len, 0, y1 + 1.3));
    mall.static.add(mk(lo, hi, t0 + len, t0 + len + 0.3, 0, y1 + 1.3));
    const N = 24;
    for (let k = 0; k < N; k++) {
      const ta = t0 + (k * len) / N, tb = t0 + ((k + 1) * len) / N;
      const top = y0 + ((ta - t0) / len) * (y1 - y0) - 0.3;
      if (top > 0.55) mall.static.add(mk(lo, hi, ta, tb, 0, top));
    }
  }
  // upper retail levels above 2-level attractions
  for (const g of mall.groups) if (g.height < 3) {
    for (let l = g.height; l <= 2; l++) {
      for (let a = g.i0; a <= g.i1; a++) for (let b = g.j0; b <= g.j1; b++) {
        const blk = blocks[a][b];
        if (blk.venue[l]) venueBlock(blk, l, blk.venue[l]); else retailBlock(blk, l);
      }
    }
  }
  for (let i = 0; i < NBX; i++) for (let j = 0; j < NBZ; j++) {
    const b = blocks[i][j];
    if (!b.exists || b.group) continue;
    for (const l of [0, 1, 2]) {
      if (b.anchor) anchorBlock(b, l);
      else if (b.venue[l]) venueBlock(b, l, b.venue[l]);
      else retailBlock(b, l);
    }
    if (b.anchor) {
      // internal escalators through the department store
      const cx = Math.floor((b.x0 + b.x1) / 2), s = Math.floor((b.z0 + b.z1) / 2) - 4;
      escalatorPair(0, 'z', 1, cx, s, true);
      escalatorPair(1, 'z', 1, cx, s + 4, true);
    }
  }

  // ---- basement
  const tunnel = mall.addRoom({ kind: 'tunnel', type: 'tunnel', level: -1, name: 'Utility Tunnels', floor: 'concrete' });
  for (const lane of colLanes) {
    const c = lane.x0 + Math.floor(lane.w / 2);
    for (let j = 0; j < NBZ; j++) {
      const a = B(lane.i, j), b = B(lane.i + 1, j);
      if (!(a && b && a.exists && b.exists)) continue;
      for (let zz = bz0[j]; zz < bz1[j]; zz++) mall.set(-1, c, zz, tunnel.id);
      const zm = Math.floor((bz0[j] + bz1[j]) / 2);
      for (let xx = lane.x0; xx < lane.x1; xx++) mall.set(-1, xx, zm, tunnel.id);
    }
  }
  for (const lane of rowLanes) {
    const c = lane.z0 + Math.floor(lane.w / 2);
    for (let i = 0; i < NBX; i++) {
      const a = B(i, lane.j), b = B(i, lane.j + 1);
      if (!(a && b && a.exists && b.exists)) continue;
      for (let xx = bx0[i]; xx < bx1[i]; xx++) mall.set(-1, xx, c, tunnel.id);
      const xm = Math.floor((bx0[i] + bx1[i]) / 2);
      for (let zz = lane.z0; zz < lane.z1; zz++) mall.set(-1, xm, zz, tunnel.id);
    }
  }
  const tseg = (i, j, col) => { const a = B(i, j), b = col ? B(i + 1, j) : B(i, j + 1); return a && b && a.exists && b.exists; };
  for (const cl of colLanes) for (const rl of rowLanes) {
    if (!(tseg(cl.i, rl.j, true) || tseg(cl.i, rl.j + 1, true) || tseg(cl.i, rl.j, false) || tseg(cl.i + 1, rl.j, false))) continue;
    const c = cl.x0 + Math.floor(cl.w / 2), rr = rl.z0 + Math.floor(rl.w / 2);
    for (let zz = rl.z0; zz < rl.z1; zz++) mall.set(-1, c, zz, tunnel.id);
    for (let xx = cl.x0; xx < cl.x1; xx++) mall.set(-1, xx, rr, tunnel.id);
  }
  for (let i = 0; i < NBX; i++) for (let j = 0; j < NBZ; j++) {
    const b = blocks[i][j];
    if (!b.exists) continue;
    const r = rngFor(seed, 'b1', i, j);
    const garage = mall.addRoom({ kind: 'garage', type: 'garage', level: -1, name: `Parking ${String.fromCharCode(65 + i)}${j + 1}`, x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1, floor: 'garage' });
    mall.setRect(-1, b.x0, b.z0, b.x1, b.z1, garage.id);
    // service strip
    const st = b.stair;
    const overlaps = (rc) => st && !(rc.x1 <= st.x0 - 1 || rc.x0 >= st.x0 + 3 || rc.z1 <= st.z0 - 1 || rc.z0 >= st.z0 + 6);
    const options = [
      { side: 'S', rc: { x0: b.x0, x1: b.x1, z0: b.z1 - 4, z1: b.z1 } },
      { side: 'E', rc: { x0: b.x1 - 4, x1: b.x1, z0: b.z0, z1: b.z1 } },
      { side: 'N', rc: { x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z0 + 4 } },
    ];
    const opt = r.shuffle(options).find((o) => !overlaps(o.rc));
    if (opt) {
      const horiz = opt.side === 'S' || opt.side === 'N';
      const a0 = horiz ? opt.rc.x0 : opt.rc.z0, a1 = horiz ? opt.rc.x1 : opt.rc.z1;
      let p = a0;
      while (p < a1) {
        let w = r.int(3, 6);
        if (a1 - p - w < 3) w = a1 - p;
        const rc = horiz ? { x0: p, x1: p + w, z0: opt.rc.z0, z1: opt.rc.z1 } : { x0: opt.rc.x0, x1: opt.rc.x1, z0: p, z1: p + w };
        const type = r.weighted(C.BASEMENT_ROOMS);
        const rm = mall.addRoom({ kind: 'basement', type, level: -1, name: C.BACKROOM_LABELS[type], ...rc, floor: 'concrete' });
        mall.setRect(-1, rc.x0, rc.z0, rc.x1, rc.z1, rm.id);
        p += w;
      }
    }
    if (st) {
      mall.setRect(-1, st.x0, st.z0, st.x0 + 2, st.z0 + 5, st.rooms[-1].id);
      // re-apply shaft voids for B1 (setRect cleared them)
    }
  }
  // stair shaft voids at B1 were cleared by setRect above; restore B1 (no flight arrives at B1, so nothing to restore)
  // basement doors
  for (const rm of mall.rooms) if (rm.level === -1 && rm.kind === 'basement') {
    // door into any neighbouring garage
    const l = -1;
    const cand = [];
    for (const side of SIDES) for (const [ix, iz, ox, oz] of sideCells(rm, side)) {
      const o = mall.room(l, ox, oz);
      if (o && (o.kind === 'garage') && mall.roomId(l, ix, iz) === rm.id) cand.push([ix, iz, ox, oz]);
    }
    if (cand.length) { const c = cand[Math.floor(cand.length / 2)]; mall.setEdge(l, c[0], c[1], c[2], c[3], E.DOOR); }
  }
  // tunnel passages: doors where tunnel touches a block
  for (let zz = 0; zz < H; zz++) for (let xx = 0; xx < W; xx++) {
    if (mall.roomId(-1, xx, zz) !== tunnel.id) continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const o = mall.room(-1, xx + dx, zz + dz);
      if (o && o.id !== tunnel.id && o.kind !== 'stair') mall.setEdge(-1, xx, zz, xx + dx, zz + dz, E.DOOR);
    }
  }

  // ---- lane ends: grand entrances (L1) and windows (upper)
  for (const l of [0, 1, 2]) for (let zz = 0; zz < H; zz++) for (let xx = 0; xx < W; xx++) {
    const r = mall.room(l, xx, zz);
    if (!r || r.kind !== 'concourse') continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (mall.roomId(l, xx + dx, zz + dz) === -1) mall.setEdge(l, xx, zz, xx + dx, zz + dz, l === 0 ? E.MAIN_ENTRANCE : E.WINDOW);
    }
  }
  for (const cl of colLanes) mall.labels.push({ level: 8, axis: 'z', lane: cl, text: cl.name, kind: 'lane' });
  for (const rl of rowLanes) mall.labels.push({ level: 8, axis: 'x', lane: rl, text: rl.name, kind: 'lane' });

  addFeatures(mall);
  featureColliders(mall);
  computeEdges(mall);
  // spawn: centre-most main x main intersection, else centre lane
  {
    let best = null, bdist = 1e9;
    for (let zz = 0; zz < H; zz++) for (let xx = 0; xx < W; xx++) {
      const r = mall.room(0, xx, zz);
      if (!r || r.kind !== 'concourse' || mall.reserved[li(0)].has(mall.idx(xx, zz))) continue;
      const dd = (xx - W / 2) ** 2 + (zz - H / 2) ** 2;
      if (dd < bdist) { bdist = dd; best = [xx, zz]; }
    }
    mall.spawn = { x: (best[0] + 0.5) * CELL, y: 0, z: (best[1] + 0.5) * CELL, yaw: 0 };
  }
  // stats
  const stores = mall.rooms.filter((r) => r.kind === 'store');
  let floorCells = 0;
  for (const l of LEVELS) { const g = mall.grid[li(l)]; for (let k = 0; k < W * H; k++) if (g.room[k] >= 0 && !g.vk[k]) floorCells++; }
  mall.stats = {
    stores: stores.length,
    anchors: mall.rooms.filter((r) => r.kind === 'anchor' && r.level === 0).length,
    venues: mall.rooms.filter((r) => r.kind === 'venue' && !r.parent).length + mall.groups.length,
    restaurants: stores.filter((s) => s.type === 'restaurant' || s.type === 'cafe').length,
    backrooms: mall.rooms.filter((r) => r.kind === 'back' || r.kind === 'basement').length,
    escalators: mall.escalators.length * 2,
    elevators: mall.elevators.length,
    stairwells: mall.stairs.length,
    width: W * CELL, depth: H * CELL,
    floorArea: floorCells * CELL * CELL,
  };
  return mall;
}

function computeEdges(mall) {
  const { W, H } = mall;
  mall.edges = LEVELS.map(() => ({ v: new Uint8Array((W + 1) * H), h: new Uint8Array(W * (H + 1)) }));
  for (const l of LEVELS) {
    const ov = mall.over[li(l)];
    const ed = mall.edges[li(l)];
    const decide = (ax, az, bx, bz, key) => {
      const a = mall.roomId(l, ax, az), b = mall.roomId(l, bx, bz);
      if (a === -1 && b === -1) return E.NONE;
      const o = ov.get(key);
      const va = a >= 0 && mall.isVoid(l, ax, az), vb = b >= 0 && mall.isVoid(l, bx, bz);
      if (o !== undefined) {
        if (o === E.NORAIL) return E.NONE;
        if (o === E.RAIL && a === b && va === vb) return E.NONE;
        return o;
      }
      if (a === -1 || b === -1) return l === -1 ? E.WALL : E.EXTERIOR;
      if (a === b) {
        if (va !== vb) {
          const kind = va ? mall.vk(l, ax, az) : mall.vk(l, bx, bz);
          return kind === 1 ? E.RAIL : E.NONE;
        }
        return E.NONE;
      }
      const ra = mall.rooms[a], rb = mall.rooms[b];
      if (va && vb) return E.NONE;
      if (va || vb) {
        const solid = va ? rb : ra;
        if (solid.kind === 'concourse') return E.RAIL;
        return E.WALL;
      }
      return E.WALL;
    };
    for (let x = 0; x <= W; x++) for (let z = 0; z < H; z++) ed.v[x * H + z] = decide(x - 1, z, x, z, mall.vkey(x, z));
    for (let z = 0; z <= H; z++) for (let x = 0; x < W; x++) ed.h[z * W + x] = decide(x, z - 1, x, z, mall.hkey(x, z));
  }
}

// Find a lane name at a cell
export function laneAt(mall, cx, cz) {
  const cl = mall.colLanes.find((l) => cx >= l.x0 && cx < l.x1);
  const rl = mall.rowLanes.find((l) => cz >= l.z0 && cz < l.z1);
  if (cl && rl) return `${cl.name} & ${rl.name}`;
  return (cl || rl || { name: 'Concourse' }).name;
}

export function blockAt(mall, cx, cz) {
  for (const col of mall.blocks) for (const b of col) if (cx >= b.x0 && cx < b.x1 && cz >= b.z0 && cz < b.z1) return b;
  return null;
}
