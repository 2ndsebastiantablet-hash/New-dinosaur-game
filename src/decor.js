// Furnishing ("detail" LOD) for every room type, plus big landmark rides that load at long range.
import * as THREE from 'three';
import { CELL, CEIL, CHUNK, LEVEL_H, E, TOP, levelY, li } from './config.js';
import { GB, TPL } from './builder.js';
import { RNG, rngFor } from './rng.js';
import { box } from './collide.js';
import * as P from './props.js';

const { W, mul, hsl, rcol } = P;
const DARK = [0.08, 0.08, 0.09];

function makeCtx(S, l, ccx, ccz, gb, mode) {
  const { mall, mats } = S;
  const X0 = ccx * CHUNK, Z0 = ccz * CHUNK, X1 = Math.min(mall.W, X0 + CHUNK), Z1 = Math.min(mall.H, Z0 + CHUNK);
  const wx0 = X0 * CELL, wz0 = Z0 * CELL, wx1 = X1 * CELL, wz1 = Z1 * CELL;
  const Y = levelY(l);
  const colliders = [];
  const ctx = {
    S, mall, M: mats, gb, l, Y, X0, Z0, X1, Z1, colliders, mode,
    inW: (wx, wz) => wx >= wx0 && wx < wx1 && wz >= wz0 && wz < wz1,
    inL: (lx, lz) => { const p = gb.tp(lx, 0, lz); return ctx.inW(p[0], p[2]); },
    colL: (lx0, lz0, lx1, lz1, h = 2.2, y0 = 0) => {
      const a = gb.tp(lx0, 0, lz0), b = gb.tp(lx1, 0, lz1);
      colliders.push(box(a[0], gb.y + y0, a[2], b[0], gb.y + y0 + h, b[2]));
    },
    colC: (lx, lz, sx, sz, h = 2.2) => ctx.colL(lx - sx / 2, lz - sz / 2, lx + sx / 2, lz + sz / 2, h),
  };
  return ctx;
}

export function buildDetail(S, l, ccx, ccz) {
  const gb = new GB();
  const ctx = makeCtx(S, l, ccx, ccz, gb, 'detail');
  const { mall } = ctx;
  const ids = new Set();
  for (let z = ctx.Z0; z < ctx.Z1; z++) for (let x = ctx.X0; x < ctx.X1; x++) { const id = mall.roomId(l, x, z); if (id >= 0) ids.add(id); }
  for (const id of ids) {
    const room = mall.rooms[id];
    try { decorate(ctx, room); } catch (e) { console.warn('decor failed', room.kind, room.type, e); }
  }
  const group = new THREE.Group();
  group.userData.verts = gb.build(group);
  return { group, colliders: ctx.colliders };
}

// Landmarks: large rides drawn with the long-range structure pass
export function buildLandmarks(S, l, ccx, ccz, gb) {
  const ctx = makeCtx(S, l, ccx, ccz, gb, 'landmark');
  const ids = new Set();
  for (let z = ctx.Z0; z < ctx.Z1; z++) for (let x = ctx.X0; x < ctx.X1; x++) { const id = ctx.mall.roomId(l, x, z); if (id >= 0) ids.add(id); }
  for (const id of ids) {
    const room = ctx.mall.rooms[id];
    if (room.kind !== 'attraction') continue;
    const fn = ATTR[room.type];
    if (fn) { try { fn(ctx, room); } catch (e) { console.warn('landmark failed', room.type, e); } }
  }
}

function decorate(ctx, room) {
  switch (room.kind) {
    case 'concourse': return concourse(ctx, room);
    case 'store': return store(ctx, room);
    case 'restroom': return restroom(ctx, room);
    case 'service': return service(ctx, room);
    case 'back': case 'basement': return backroom(ctx, room);
    case 'tunnel': return tunnel(ctx, room);
    case 'garage': return garage(ctx, room);
    case 'anchor': return department(ctx, room);
    case 'venue': { const fn = VENUE[room.type]; return fn && fn(ctx, room); }
    case 'attraction': { const fn = ATTR[room.type]; return fn && fn(ctx, room); }
    case 'stair': return stair(ctx, room);
    default: return null;
  }
}

// local frame for a room: front side at local z=0, depth along +z, width along +x
function frameOf(room, side) {
  side = side || (room.fronts && room.fronts[0]) || room.stripSide || 'N';
  const { x0, x1, z0, z1 } = room;
  if (side === 'N') return { ox: x0 * CELL, oz: z0 * CELL, rot: 0, w: (x1 - x0) * CELL, d: (z1 - z0) * CELL, side };
  if (side === 'S') return { ox: x1 * CELL, oz: z1 * CELL, rot: Math.PI, w: (x1 - x0) * CELL, d: (z1 - z0) * CELL, side };
  if (side === 'W') return { ox: x0 * CELL, oz: z1 * CELL, rot: Math.PI / 2, w: (z1 - z0) * CELL, d: (x1 - x0) * CELL, side };
  return { ox: x1 * CELL, oz: z0 * CELL, rot: -Math.PI / 2, w: (z1 - z0) * CELL, d: (x1 - x0) * CELL, side };
}
function inFrame(ctx, room, side, fn) {
  const f = frameOf(room, side);
  ctx.gb.push(f.ox, ctx.Y, f.oz, f.rot);
  fn(f);
  ctx.gb.pop();
}

// ======================================================================= concourse
function concourse(ctx, room) {
  const { mall, gb, M, l } = ctx;
  for (let z = ctx.Z0; z < ctx.Z1; z++) for (let x = ctx.X0; x < ctx.X1; x++) {
    if (mall.roomId(l, x, z) !== room.id || mall.isVoid(l, x, z)) continue;
    const cl = mall.colLanes.find((ln) => x >= ln.x0 && x < ln.x1);
    const rl = mall.rowLanes.find((ln) => z >= ln.z0 && z < ln.z1);
    const reserved = mall.reserved[li(l)].has(mall.idx(x, z));
    const r = rngFor(mall.seed, 'cc', l, x, z);
    const wx = (x + 0.5) * CELL, wz = (z + 0.5) * CELL;
    gb.push(wx, ctx.Y, wz, 0);
    if (cl && rl) {
      // intersection: directory screens at corners on L1
      if (l === 0 && x === cl.x0 && z === rl.z0) { P.directory(gb, M, -1.2, -1.2, Math.PI / 4); ctx.colC(-1.2, -1.2, 1, 1); }
    } else {
      const lane = cl || rl;
      const isCol = !!cl;
      const off = isCol ? x - lane.x0 : z - lane.z0;
      const t = isCol ? z : x;
      const rot = isCol ? 0 : Math.PI / 2;
      const center = lane.main ? 2 : 1;
      const voidEdges = lane.main ? [1, 4] : [];
      // structural columns along the void edges (every 3 cells)
      if (lane.main && t % 3 === 0 && (off === 0 || off === 4)) {
        const cOff = off === 0 ? CELL / 2 : -CELL / 2;
        const [cx, cz] = isCol ? [cOff, -CELL / 2] : [-CELL / 2, cOff];
        const edgeX = isCol ? x + (off === 0 ? 1 : 0) : x, edgeZ = isCol ? z : z + (off === 0 ? 1 : 0);
        const railOk = l === 0 || (isCol ? mall.edgeV(l, edgeX, z) === E.RAIL : mall.edgeH(l, x, edgeZ) === E.RAIL);
        if (railOk) {
          const top = l === TOP ? CEIL : LEVEL_H;
          P.column(gb, M, cx + (isCol ? (off === 0 ? -0.3 : 0.3) : 0), cz + (isCol ? 0 : (off === 0 ? -0.3 : 0.3)), top);
          ctx.colC(cx + (isCol ? (off === 0 ? -0.3 : 0.3) : 0), cz + (isCol ? 0 : (off === 0 ? -0.3 : 0.3)), 1, 1, 7);
        }
      }
      if (off === center && !reserved && l === 0 && lane.main) {
        // ground floor under the atrium: planters with trees, kiosks, seating
        const k = ((t % 6) + 6) % 6;
        if (k === 0) { P.planter(gb, M, 0, 0, isCol ? 2.4 : 3.4, isCol ? 3.4 : 2.4, r.chance(0.5) ? 'palm' : 'tree', r); ctx.colC(0, 0, isCol ? 2.4 : 3.4, isCol ? 3.4 : 2.4, 1); }
        else if (k === 2) { P.kiosk(gb, M, 0, 0, rot + Math.PI / 2, r); ctx.colC(0, 0, isCol ? 1.6 : 2.8, isCol ? 2.8 : 1.6, 2); }
        else if (k === 4) { P.bench(gb, M, -1.0, 0, rot + Math.PI / 2, 2.2); P.bench(gb, M, 1.0, 0, rot - Math.PI / 2, 2.2); P.trashBin(gb, M, 0, 1.6); }
      } else if (off === center && !reserved && !lane.main) {
        const k = ((t % 5) + 5) % 5;
        if (k === 0) { P.kiosk(gb, M, 0, 0, rot + Math.PI / 2, r); ctx.colC(0, 0, isCol ? 1.6 : 2.8, isCol ? 2.8 : 1.6, 2); }
        else if (k === 2) { P.planter(gb, M, 0, 0, 1.6, 1.6, r.chance(0.6) ? 'shrub' : 'tree', r); ctx.colC(0, 0, 1.6, 1.6, 1); }
        else if (k === 3 && r.chance(0.6)) { P.bench(gb, M, 0, 0, rot, 2.0); }
      } else if (lane.main && l > 0 && (off === 0 || off === 4) && ((t % 7) + 7) % 7 === 3) {
        // benches along the balcony rail
        const s = off === 0 ? 1 : -1;
        const bx = isCol ? s * 1.2 : 0, bz = isCol ? 0 : s * 1.2;
        P.bench(gb, M, bx, bz, isCol ? (s > 0 ? -Math.PI / 2 : Math.PI / 2) : (s > 0 ? Math.PI : 0), 2.0);
      }
      // hanging banners on upper floors over the void edge
      if (lane.main && l > 0 && (off === 1 || off === 3) && ((t % 8) + 8) % 8 === 1 && mall.isVoid(l, x, z)) { /* void cells skipped above */ }
    }
    gb.pop();
  }
  // banners hanging into the atrium voids (attached to the slab edge) — drawn per void cell
  for (let z = ctx.Z0; z < ctx.Z1; z++) for (let x = ctx.X0; x < ctx.X1; x++) {
    if (mall.roomId(l, x, z) !== room.id || !mall.isVoid(l, x, z) || l === 0) continue;
    const cl = mall.colLanes.find((ln) => x >= ln.x0 && x < ln.x1);
    const rl = mall.rowLanes.find((ln) => z >= ln.z0 && z < ln.z1);
    if ((cl && rl) || !(cl || rl)) continue;
    const lane = cl || rl, isCol = !!cl;
    const off = isCol ? x - lane.x0 : z - lane.z0, t = isCol ? z : x;
    if (off !== 2 || ((t % 5) + 5) % 5 !== 2) continue;
    if (l < TOP && mall.isVoid(l + 1, x, z)) continue; // only hang from the level that has a ceiling over the void
    const r = rngFor(mall.seed, 'ban', l, x, z);
    const col = hsl(r.range(0, 360), 0.65, 0.5);
    const top = ctx.Y + CEIL - 0.1 + (l === TOP ? 2.4 : 0);
    for (const s of [-0.9, 0.9]) P.banner(gb, M, (x + 0.5) * CELL + (isCol ? s : 0), top, (z + 0.5) * CELL + (isCol ? 0 : s), isCol ? 0 : Math.PI / 2, col, 6);
  }
}

// ======================================================================= stores
const STYLE = {
  fashion: 'apparel', denim: 'apparel', kids: 'apparel', sportswear: 'apparel', lingerie: 'apparel',
  luxury: 'luxury', watches: 'jewel', jewelry: 'jewel', bags: 'luxury',
  shoes: 'shoes', electronics: 'tech', phones: 'tech', gaming: 'tech', arcadeMini: 'arcade',
  books: 'books', toys: 'aisles', candy: 'aisles', gifts: 'aisles', pharmacy: 'aisles', grocery: 'aisles', pets: 'pets',
  beauty: 'beauty', salon: 'salon', home: 'home', furniture: 'home', cafe: 'food', restaurant: 'food',
  music: 'music', optical: 'optical', art: 'art', bank: 'bank', outdoor: 'outdoor', sports: 'sports', vacant: 'vacant',
};
function store(ctx, room) {
  const style = STYLE[room.type] || 'apparel';
  inFrame(ctx, room, null, (f) => {
    const r = new RNG(room.seed);
    STORE[style](ctx, room, f, r);
  });
}
// helpers within store frame
function backCounter(ctx, f, r, col) {
  const x = f.w - 2.4, z = f.d - 2.2;
  if (!ctx.inL(x, z)) return;
  P.counter(ctx.gb, ctx.M, x, z, Math.PI, 3.2, col || [0.2, 0.2, 0.22]);
  ctx.colC(x, z, 3.4, 0.9, 1.1);
}
function sideWalls(ctx, f, fn, start = 2.5, endPad = 3.5, step = 3) {
  for (let z = start; z < f.d - endPad; z += step) {
    if (ctx.inL(0.35, z + step / 2)) fn(0.35, z + step / 2, Math.PI / 2, step - 0.2, 'L');
    if (ctx.inL(f.w - 0.35, z + step / 2)) fn(f.w - 0.35, z + step / 2, -Math.PI / 2, step - 0.2, 'R');
  }
}
function grid(f, x0, z0, x1, z1, dx, dz, fn) {
  for (let z = z0; z <= z1; z += dz) for (let x = x0; x <= x1; x += dx) fn(x, z);
}
const STORE = {
  apparel(ctx, room, f, r) {
    const { gb, M } = ctx;
    const base = rcol(r, [0.2, 0.6], [0.3, 0.6]);
    // window mannequins
    const n = Math.max(1, Math.floor(f.w / 5));
    for (let i = 0; i < n; i++) { const x = (i + 0.5) * f.w / n + (i % 2 ? 1.4 : -1.4); if (ctx.inL(x, 1.4)) P.mannequin(gb, M, x, 1.4, Math.PI, mul(base, r.range(0.6, 1.4))); }
    sideWalls(ctx, f, (x, z, rot, len) => { P.clothingRack(gb, M, x, z, rot, len, new RNG(room.seed + Math.floor(z * 10))); ctx.colC(x, z, 0.7, len, 1.6); }, 2.5, 4.5);
    grid(f, 3.2, 4.0, f.w - 3.2, f.d - 7.5, 3.6, 3.4, (x, z) => {
      const k = new RNG(room.seed + x * 31 + z * 7);
      if (!ctx.inL(x, z)) return;
      if (k.chance(0.35)) { P.foldTable(gb, M, x, z, 0, k); ctx.colC(x, z, 1.9, 1.0, 1); }
      else if (k.chance(0.5)) { P.roundRack(gb, M, x, z, k); ctx.colC(x, z, 1.7, 1.7, 1.5); }
      else { P.clothingRack(gb, M, x, z, 0, 2.2, k); ctx.colC(x, z, 2.3, 0.7, 1.6); }
    });
    if (ctx.inL(2.8, f.d - 1.0) && f.w > 9) { P.fittingRooms(gb, M, 2.8, f.d - 1.0, Math.PI, 3); ctx.colC(2.8, f.d - 1.0, 4.0, 1.5, 2.3); }
    backCounter(ctx, f, r);
  },
  luxury(ctx, room, f, r) {
    const { gb, M } = ctx;
    if (ctx.inL(f.w / 2, f.d / 2)) { gb.box(M.carpet, f.w / 2, 0, f.d / 2, Math.min(8, f.w - 3), 0.015, 6, [0.5, 0.42, 0.32]); P.sofa(gb, M, f.w / 2, f.d / 2 + 1.6, Math.PI, [0.75, 0.68, 0.58], 2.4); }
    for (const x of [f.w * 0.3, f.w * 0.7]) if (ctx.inL(x, 1.6)) P.mannequin(gb, M, x, 1.6, Math.PI, rcol(r, [0, 0.3], [0.1, 0.5]));
    sideWalls(ctx, f, (x, z, rot, len) => { P.wallShelf(gb, M, x, z, rot, len * 0.8, 2.4, null, [0.12, 0.1, 0.08]); for (let i = 0; i < 4; i++) gb.box(M.leather, x + (rot > 0 ? 0.1 : -0.1), 1.0 + (i % 2) * 0.6, z - len * 0.3 + i * len * 0.2, 0.3, 0.25, 0.35, rcol(r, [0.2, 0.6], [0.2, 0.5])); }, 3, 4, 4);
    grid(f, f.w * 0.3, f.d * 0.35, f.w * 0.7, f.d * 0.35, f.w * 0.4, 1, (x, z) => { if (ctx.inL(x, z)) { P.glassCase(gb, M, x, z, 0, 2.0, r); ctx.colC(x, z, 2.2, 0.8, 1.2); } });
    backCounter(ctx, f, r, [0.12, 0.1, 0.08]);
  },
  jewel(ctx, room, f, r) {
    const { gb, M } = ctx;
    for (let z = 3; z < f.d - 4; z += 3) {
      for (const x of [2.0, f.w - 2.0]) if (ctx.inL(x, z)) { P.glassCase(gb, M, x, z, Math.PI / 2, 2.4, r); ctx.colC(x, z, 0.8, 2.6, 1.2); }
    }
    grid(f, f.w / 2, 5, f.w / 2, f.d - 7, 1, 4, (x, z) => { if (ctx.inL(x, z) && f.w > 9) { P.glassCase(gb, M, x, z, 0, 2.6, r); ctx.colC(x, z, 2.8, 0.8, 1.2); } });
    backCounter(ctx, f, r, [0.1, 0.08, 0.1]);
  },
  shoes(ctx, room, f, r) {
    const { gb, M } = ctx;
    sideWalls(ctx, f, (x, z, rot, len) => { P.wallShelf(gb, M, x, z, rot, len, 2.4, M.products, [0.95, 0.95, 0.95]); ctx.colC(x, z, 0.6, len, 2.4); }, 2, 3);
    grid(f, 3.5, 4, f.w - 3.5, f.d - 6, 4, 4, (x, z) => {
      if (!ctx.inL(x, z)) return;
      const k = new RNG(room.seed + x * 3 + z);
      if (k.chance(0.5)) { P.displayTable(gb, M, x, z, 0, 1.6, 0.9, 'shoes', k); ctx.colC(x, z, 1.7, 1.0, 1); }
      else { gb.box(M.leather, x, 0, z, 2.0, 0.45, 0.6, rcol(k, [0.1, 0.4], [0.2, 0.5])); P.shadow(gb, M, x, z, 2.4, 1); }
    });
    backCounter(ctx, f, r);
  },
  tech(ctx, room, f, r) {
    const { gb, M } = ctx;
    if (ctx.inL(f.w / 2, f.d - 0.4)) P.tvWall(gb, M, f.w / 2, f.d - 0.4, Math.PI, Math.min(f.w - 2, 14));
    sideWalls(ctx, f, (x, z, rot, len) => { P.wallShelf(gb, M, x, z, rot, len, 2.2, M.products, [0.95, 0.95, 0.97]); ctx.colC(x, z, 0.6, len, 2.2); }, 2, 3);
    grid(f, 3.2, 3.5, f.w - 3.2, f.d - 5, 3.4, 3.2, (x, z) => {
      if (!ctx.inL(x, z)) return;
      const k = new RNG(room.seed + x * 3 + z);
      P.displayTable(gb, M, x, z, 0, 2.2, 1.1, k.chance(0.5) ? 'laptop' : 'gadget', k); ctx.colC(x, z, 2.3, 1.2, 1);
    });
    backCounter(ctx, f, r, [0.95, 0.95, 0.97]);
  },
  arcade(ctx, room, f, r) {
    const { gb, M } = ctx;
    sideWalls(ctx, f, (x, z, rot, len) => { for (let i = 0; i < 3; i++) P.arcadeCab(gb, M, x + (rot > 0 ? 0.3 : -0.3), z - 1 + i * 1, rot, new RNG(room.seed + z * 10 + i)); ctx.colC(x, z, 1.4, len, 2); }, 1.5, 2);
    grid(f, f.w / 2, 4, f.w / 2, f.d - 4, 1, 3, (x, z) => { if (ctx.inL(x, z)) { P.clawMachine(gb, M, x, z, new RNG(room.seed + z)); ctx.colC(x, z, 1.1, 1.1, 2); } });
  },
  books(ctx, room, f, r) {
    const { gb, M } = ctx;
    sideWalls(ctx, f, (x, z, rot, len) => { P.bookcase(gb, M, x, z, rot, len, 2.6); ctx.colC(x, z, 0.6, len, 2.6); }, 2, 2);
    for (let x = 3.5; x < f.w - 3; x += 3.2) for (let z = 4.5; z < f.d - 4; z += 5) {
      if (!ctx.inL(x, z)) continue;
      at2(ctx, x, z, Math.PI / 2, () => { P.bookcase(gb, M, 0, -0.28, 0, 3.6, 1.8); P.bookcase(gb, M, 0, 0.28, Math.PI, 3.6, 1.8); });
      ctx.colC(x, z, 1.2, 3.7, 1.8);
    }
    if (ctx.inL(f.w / 2, 2.2)) P.displayTable(gb, M, f.w / 2, 2.2, 0, 2.4, 1.2, 'books', r);
    if (ctx.inL(2.5, f.d - 2.5)) { P.sofa(gb, M, 2.5, f.d - 2.5, Math.PI / 2, [0.45, 0.25, 0.18], 1.6); }
    backCounter(ctx, f, r, [0.35, 0.22, 0.15]);
  },
  aisles(ctx, room, f, r) {
    const { gb, M } = ctx;
    const col = room.type === 'pharmacy' ? [0.95, 0.97, 0.97] : room.type === 'candy' ? [1, 0.75, 0.85] : room.type === 'toys' ? [0.95, 0.95, 0.6] : [0.92, 0.92, 0.92];
    sideWalls(ctx, f, (x, z, rot, len) => { P.wallShelf(gb, M, x, z, rot, len, 2.3, M.products, col); ctx.colC(x, z, 0.6, len, 2.3); }, 2, 2);
    for (let x = 3.3; x < f.w - 2.5; x += 2.9) {
      const z = 3 + (f.d - 7.5) / 2, len = f.d - 9;
      if (len < 2 || !ctx.inL(x, z)) continue;
      P.gondola(gb, M, x, z, Math.PI / 2, len, 1.8, M.products, col);
      ctx.colC(x, z, 1.2, len, 1.8);
    }
    if (room.type === 'toys' && ctx.inL(f.w / 2, 2)) { gb.geo(M.fabric, TPL.sphere, f.w / 2, 0.9, 2, 1.6, 1.8, 1.4, [0.6, 0.4, 0.25]); gb.geo(M.fabric, TPL.sphere, f.w / 2, 2.1, 2, 1.1, 1.1, 1.0, [0.6, 0.4, 0.25]); }
    backCounter(ctx, f, r, col);
  },
  pets(ctx, room, f, r) {
    const { gb, M } = ctx;
    sideWalls(ctx, f, (x, z, rot, len) => {
      at2(ctx, x, z, rot, () => {
        gb.box(M.metal, 0, 0, 0, len, 0.8, 0.6, [0.2, 0.2, 0.22]);
        for (let i = 0; i < 2; i++) { gb.box(M.tank, -len / 4 + i * len / 2, 0.8, 0, len / 2 - 0.1, 0.6, 0.55, [0.5, 0.8, 1]); for (let k = 0; k < 4; k++) P.fish(gb, M, -len / 4 + i * len / 2 + r.range(-0.5, 0.5), 1.1, r.range(-0.1, 0.1), r.range(0, 6), 0.12, hsl(r.range(0, 360), 0.9, 0.55)); }
        gb.box(M.light, 0, 1.42, 0, len, 0.04, 0.5, [0.8, 1, 1.3]);
      });
      ctx.colC(x, z, 0.7, len, 1.5);
    }, 2, 2);
    for (let x = 4; x < f.w - 3; x += 4) { const z = f.d / 2; if (ctx.inL(x, z)) { P.gondola(gb, M, x, z, Math.PI / 2, f.d - 10, 1.6, M.products); ctx.colC(x, z, 1.2, f.d - 10, 1.6); } }
    backCounter(ctx, f, r);
  },
  beauty(ctx, room, f, r) {
    const { gb, M } = ctx;
    sideWalls(ctx, f, (x, z, rot, len) => {
      at2(ctx, x, z, rot, () => { gb.box(M.gloss, 0, 0, 0, len, 0.9, 0.5, [0.98, 0.98, 0.98]); gb.box(M.chrome, 0, 1.2, -0.2, len, 1.2, 0.03, [0.9, 0.9, 0.95]); gb.box(M.products, 0, 0.9, 0, len - 0.2, 0.2, 0.35, W); gb.box(M.light, 0, 2.45, -0.2, len, 0.05, 0.1, W); });
      ctx.colC(x, z, 0.6, len, 1.2);
    }, 2, 2);
    grid(f, 3.5, 4, f.w - 3.5, f.d - 5, 3.8, 3.6, (x, z) => { if (ctx.inL(x, z)) { P.displayTable(gb, M, x, z, 0, 2.0, 1.2, 'beauty', new RNG(room.seed + x + z * 9)); ctx.colC(x, z, 2.1, 1.3, 1); } });
    backCounter(ctx, f, r, [0.98, 0.9, 0.92]);
  },
  salon(ctx, room, f, r) {
    const { gb, M } = ctx;
    for (let z = 3; z < f.d - 3; z += 2.2) for (const [x, rot] of [[1.0, Math.PI / 2], [f.w - 1.0, -Math.PI / 2]]) {
      if (!ctx.inL(x, z)) continue;
      at2(ctx, x, z, rot, () => {
        gb.box(M.chrome, 0, 0.9, -0.62, 0.9, 1.2, 0.03, [0.9, 0.92, 0.95]);
        gb.box(M.gloss, 0, 0.7, -0.5, 1.0, 0.06, 0.3, [0.95, 0.95, 0.95]);
        gb.box(M.leather, 0, 0.35, 0.3, 0.6, 0.15, 0.6, DARK);
        gb.box(M.leather, 0, 0.5, 0.58, 0.6, 0.7, 0.08, DARK);
        gb.vcyl(M.chrome, 0, 0, 0.3, 0.25, 0.35, [0.9, 0.9, 0.9]);
      });
      ctx.colC(x, z, 1.4, 1.0, 1.2);
    }
    backCounter(ctx, f, r, [0.1, 0.1, 0.1]);
  },
  home(ctx, room, f, r) {
    const { gb, M } = ctx;
    grid(f, 3.5, 3.5, f.w - 3.5, f.d - 4, 4.5, 4.5, (x, z) => {
      if (!ctx.inL(x, z)) return;
      const k = new RNG(room.seed + x * 13 + z * 3);
      const t = k.int(0, 3);
      if (t === 0) { P.sofa(gb, M, x, z, k.pick([0, Math.PI]), rcol(k, [0.1, 0.5], [0.25, 0.6]), 2.4); ctx.colC(x, z, 2.6, 1.0, 1); gb.box(M.wood, x, 0, z + 1.4, 1.1, 0.42, 0.6, [0.5, 0.36, 0.25]); }
      else if (t === 1) { P.bed(gb, M, x, z, k.pick([0, Math.PI / 2]), rcol(k, [0.2, 0.6], [0.3, 0.6])); ctx.colC(x, z, 2.2, 2.2, 1); }
      else if (t === 2) { P.diningSet(gb, M, x, z, k, false, 4); ctx.colC(x, z, 1.3, 0.9, 1); }
      else { P.displayTable(gb, M, x, z, 0, 1.8, 1.0, 'gift', k); ctx.colC(x, z, 1.9, 1.1, 1); gb.vcyl(M.metal, x + 1.3, 0, z, 0.02, 1.6, DARK); gb.geo(M.fabric, TPL.cone, x + 1.3, 1.7, z, 0.5, 0.4, 0.5, [0.95, 0.9, 0.8]); }
    });
    sideWalls(ctx, f, (x, z, rot, len) => { P.wallShelf(gb, M, x, z, rot, len, 2.0, M.products, [0.85, 0.8, 0.72]); }, 3, 4, 4);
    backCounter(ctx, f, r, [0.5, 0.38, 0.28]);
  },
  food(ctx, room, f, r) {
    const { gb, M } = ctx;
    const resto = room.type === 'restaurant';
    // kitchen at back
    if (ctx.inL(f.w / 2, f.d - 1.0)) {
      gb.box(M.metal, f.w / 2, 0, f.d - 0.6, f.w - 1, 0.95, 0.8, [0.8, 0.8, 0.82]);
      gb.box(M.metal, f.w / 2, 1.6, f.d - 0.4, f.w - 1, 0.7, 0.5, [0.75, 0.75, 0.77]);
      ctx.colC(f.w / 2, f.d - 0.6, f.w - 1, 0.9, 1);
    }
    const cz = f.d - 4.5;
    if (ctx.inL(f.w / 2, cz)) {
      P.counter(gb, M, f.w / 2, cz, 0, Math.min(f.w - 3, 7), resto ? [0.3, 0.18, 0.12] : [0.45, 0.3, 0.2], [0.85, 0.85, 0.82]);
      if (!resto) { gb.box(M.chrome, f.w / 2 - 1.5, 1.05, cz, 0.6, 0.45, 0.45, [0.85, 0.85, 0.85]); gb.box(M.glass, f.w / 2 + 1.2, 1.05, cz + 0.1, 1.4, 0.5, 0.5, W); }
      ctx.colC(f.w / 2, cz, Math.min(f.w - 3, 7) + 0.2, 0.9, 1.1);
    }
    grid(f, 2.5, 2.6, f.w - 2.5, cz - 2.5, resto ? 2.8 : 2.4, resto ? 2.8 : 2.4, (x, z) => { if (ctx.inL(x, z)) P.diningSet(gb, M, x, z, new RNG(room.seed + x * 7 + z), !resto || (x + z) % 2 > 1, resto ? 4 : 3, resto ? [0.9, 0.9, 0.88] : null); });
    if (resto) for (let z = 3; z < f.d - 6; z += 2.4) for (const x of [0.6, f.w - 0.6]) if (ctx.inL(x, z)) gb.box(M.light, x, 2.2, z, 0.15, 0.15, 0.15, [1.4, 1.1, 0.6]);
  },
  music(ctx, room, f, r) {
    const { gb, M } = ctx;
    sideWalls(ctx, f, (x, z, rot, len) => P.guitarWall(gb, M, x, z, rot, len, new RNG(room.seed + z * 10)), 2, 3);
    grid(f, 4, 5, f.w - 4, f.d - 6, 4.5, 4.5, (x, z) => { if (ctx.inL(x, z)) { P.piano(gb, M, x, z, 0.3); ctx.colC(x, z, 1.8, 2, 1); } });
    backCounter(ctx, f, r, [0.2, 0.12, 0.08]);
  },
  optical(ctx, room, f, r) {
    const { gb, M } = ctx;
    sideWalls(ctx, f, (x, z, rot, len) => { at2(ctx, x, z, rot, () => { gb.box(M.wood, 0, 0, -0.1, len, 2.4, 0.1, [0.85, 0.8, 0.72]); for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) gb.box(M.gloss, -len / 2 + 0.3 + i * (len - 0.6) / 5, 0.8 + j * 0.3, 0.02, 0.18, 0.05, 0.05, rcol(r, [0, 0.5], [0.05, 0.4])); }); }, 2, 3);
    grid(f, f.w / 2, 5, f.w / 2, f.d - 6, 1, 4, (x, z) => { if (ctx.inL(x, z)) { P.desk(gb, M, x, z, 0, 1); ctx.colC(x, z, 1.7, 0.8, 1); } });
  },
  art(ctx, room, f, r) {
    const { gb, M } = ctx;
    sideWalls(ctx, f, (x, z, rot, len) => { at2(ctx, x, z, rot, () => { gb.box(M.wood, 0, 1.2, -0.05, 2.0, 1.4, 0.06, [0.1, 0.08, 0.06]); gb.box(M.posters, 0, 1.3, 0, 1.8, 1.2, 0.01, rcol(r, [0, 0.4], [0.6, 0.9])); gb.box(M.light, 0, 2.9, 0.4, 0.4, 0.06, 0.1, W); }); }, 2, 2, 3.5);
    grid(f, f.w / 2, 5, f.w / 2, f.d - 5, 1, 5, (x, z) => { if (ctx.inL(x, z)) { gb.box(M.paint, x, 0, z, 0.9, 1.0, 0.9, [0.97, 0.97, 0.97]); gb.geo(M.gloss, TPL.ico, x, 1.5, z, 0.7, 1.0, 0.7, rcol(r, [0.3, 0.9], [0.3, 0.6]), 0.4, 0.3); ctx.colC(x, z, 1, 1, 1.5); } });
  },
  bank(ctx, room, f, r) {
    const { gb, M } = ctx;
    if (ctx.inL(f.w / 2, f.d - 3)) { P.counter(gb, M, f.w / 2, f.d - 3, 0, f.w - 3, [0.25, 0.28, 0.35]); gb.box(M.glass, f.w / 2, 1.05, f.d - 3, f.w - 3, 1.2, 0.04, W); ctx.colC(f.w / 2, f.d - 3, f.w - 3, 0.9, 2.2); }
    for (let x = 2; x < f.w - 2; x += 1.4) if (ctx.inL(x, 0.8)) { gb.box(M.gloss, x, 0, 0.8, 0.9, 1.7, 0.6, [0.3, 0.32, 0.36]); gb.box(M.screen, x, 1.1, 0.48, 0.5, 0.35, 0.01, W); }
    grid(f, 3, 5, f.w - 3, f.d - 7, 4, 3, (x, z) => { if (ctx.inL(x, z)) P.desk(gb, M, x, z, 0, 1); });
  },
  outdoor(ctx, room, f, r) {
    const { gb, M } = ctx;
    grid(f, 4, 4, f.w - 4, f.d - 6, 5, 5, (x, z) => {
      if (!ctx.inL(x, z)) return;
      const k = new RNG(room.seed + x * 5 + z);
      if (k.chance(0.5)) { gb.geo(M.fabric, TPL.cone, x, 1.0, z, 3.2, 2.0, 3.2, rcol(k, [0.5, 0.8], [0.3, 0.5]), 0, k.range(0, 1)); ctx.colC(x, z, 3, 3, 1.5); }
      else { gb.geo(M.gloss, TPL.sphere, x, 0.8, z, 0.7, 0.5, 4.2, rcol(k, [0.6, 0.9], [0.4, 0.55]), 0, k.range(0, 3)); P.clothingRack(gb, M, x + 1.5, z, Math.PI / 2, 2, k); }
    });
    sideWalls(ctx, f, (x, z, rot, len) => P.wallShelf(gb, M, x, z, rot, len, 2.4, M.products, [0.45, 0.35, 0.25]), 2, 3);
    backCounter(ctx, f, r, [0.45, 0.35, 0.25]);
  },
  sports(ctx, room, f, r) {
    const { gb, M } = ctx;
    grid(f, 3.5, 3.5, f.w - 3.5, f.d - 5, 3.5, 3.5, (x, z) => {
      if (!ctx.inL(x, z)) return;
      const k = new RNG(room.seed + x * 9 + z);
      const t = k.int(0, 3);
      if (t === 0) { P.treadmill(gb, M, x, z, 0); ctx.colC(x, z, 0.9, 2, 1.3); }
      else if (t === 1) { P.bike(gb, M, x, z, 0); }
      else if (t === 2) { gb.vcyl(M.metal, x, 0, z, 0.6, 0.7, [0.2, 0.2, 0.22]); for (let i = 0; i < 9; i++) gb.sphere(M.gloss, x + k.range(-0.35, 0.35), 0.75 + k.range(0, 0.2), z + k.range(-0.35, 0.35), 0.12, k.pick([[0.9, 0.4, 0.1], W, [0.1, 0.2, 0.6]])); ctx.colC(x, z, 1.2, 1.2, 1); }
      else { P.clothingRack(gb, M, x, z, 0, 2.2, k); ctx.colC(x, z, 2.3, 0.7, 1.6); }
    });
    sideWalls(ctx, f, (x, z, rot, len) => P.wallShelf(gb, M, x, z, rot, len, 2.4, M.products, [0.2, 0.2, 0.22]), 2, 3);
    backCounter(ctx, f, r);
  },
  vacant(ctx, room, f, r) {
    const { gb, M } = ctx;
    for (let i = 0; i < 4; i++) { const x = r.range(2, f.w - 2), z = r.range(3, f.d - 3); if (ctx.inL(x, z)) P.boxStack(gb, M, x, z, r, 4); }
    if (ctx.inL(f.w / 2, 0.6)) gb.box(M.paint, f.w / 2, 0, 0.45, f.w - 0.4, 3.9, 0.05, [0.92, 0.9, 0.85]); // hoarding behind the glass
    if (ctx.inL(f.w / 2, f.d / 2)) { gb.beam(M.metal, [f.w / 2 - 0.5, 0, f.d / 2], [f.w / 2, 2.5, f.d / 2 + 0.3], 0.05, 0.05, [0.9, 0.7, 0.1]); gb.beam(M.metal, [f.w / 2 + 0.5, 0, f.d / 2], [f.w / 2, 2.5, f.d / 2 + 0.3], 0.05, 0.05, [0.9, 0.7, 0.1]); }
  },
};
function at2(ctx, x, z, rot, fn) { ctx.gb.push(x, 0, z, rot); fn(); ctx.gb.pop(); }

function restroom(ctx, room) {
  inFrame(ctx, room, null, (f) => {
    const { gb, M } = ctx;
    if (ctx.inL(f.w / 2, f.d / 2)) {
      // partition between men / women
      gb.box(M.tile, f.w / 2, 0, f.d / 2 + 1.5, 0.15, 2.8, f.d - 3, [0.8, 0.86, 0.9]);
      for (let z = 3; z < f.d - 1; z += 1.2) for (const x of [0.75, f.w - 0.75]) {
        gb.box(M.plastic, x, 0.15, z, 1.5, 2.0, 0.04, [0.35, 0.45, 0.55]);
        gb.box(M.gloss, x + (x < 2 ? -0.35 : 0.35), 0, z + 0.6, 0.4, 0.45, 0.55, [0.95, 0.95, 0.95]);
      }
      for (const x of [1.6, f.w - 1.6]) { gb.box(M.stone, x, 0.8, 1.6, 0.6, 0.08, 2.4, [0.2, 0.2, 0.22]); gb.box(M.chrome, x + (x < 2 ? -0.3 : 0.3), 1.0, 1.6, 0.02, 1.0, 2.4, [0.9, 0.92, 0.95]); }
      ctx.colC(f.w / 2, f.d / 2 + 1.5, 0.3, f.d - 3, 3);
    }
  });
}

// ======================================================================= back of house
function service(ctx, room) {
  const { mall, gb, M, l } = ctx;
  for (let z = ctx.Z0; z < ctx.Z1; z++) for (let x = ctx.X0; x < ctx.X1; x++) {
    if (mall.roomId(l, x, z) !== room.id) continue;
    const r = rngFor(mall.seed, 'svc', l, x, z);
    const ex = mall.roomId(l, x + 1, z) === room.id || mall.roomId(l, x - 1, z) === room.id;
    const ez = mall.roomId(l, x, z + 1) === room.id || mall.roomId(l, x, z - 1) === room.id;
    const wx = x * CELL, wz = z * CELL, Y = ctx.Y;
    const pc = [[0.55, 0.56, 0.58], [0.75, 0.25, 0.2], [0.25, 0.45, 0.7], [0.85, 0.75, 0.2]];
    // overhead pipes along the corridor axis
    if (ex) for (let i = 0; i < 3; i++) P.pipe(gb, M, [wx, Y + 3.25 - i * 0.22, wz + 0.5 + i * 0.25], [wx + CELL, Y + 3.25 - i * 0.22, wz + 0.5 + i * 0.25], 0.07 + i * 0.02, pc[i]);
    if (ez) for (let i = 0; i < 3; i++) P.pipe(gb, M, [wx + 0.5 + i * 0.25, Y + 3.25 - i * 0.22, wz], [wx + 0.5 + i * 0.25, Y + 3.25 - i * 0.22, wz + CELL], 0.07 + i * 0.02, pc[i]);
    if (ex && ez) continue;
    // clutter against walls
    const side = ex ? (r.chance(0.5) ? [0, 1.55] : [0, -1.55]) : (r.chance(0.5) ? [1.55, 0] : [-1.55, 0]);
    const cx = wx + 2 + side[0], cz = wz + 2 + side[1];
    gb.push(cx, Y, cz, ex ? 0 : Math.PI / 2);
    const k = r.next();
    if (k < 0.25) { P.boxStack(gb, M, 0, 0, r, r.int(2, 5)); ctx.colC(0, 0, 1.2, 0.9, 1.2); }
    else if (k < 0.35) { P.cart(gb, M, 0, 0, r.range(-0.3, 0.3)); }
    else if (k < 0.45) { gb.vcyl(M.plastic, 0, 0, 0, 0.35, 0.9, [0.2, 0.35, 0.2]); gb.vcyl(M.plastic, 0.8, 0, 0, 0.35, 0.9, [0.15, 0.2, 0.5]); }
    else if (k < 0.52) { gb.box(M.gloss, 0, 1.1, 0, 0.25, 0.5, 0.18, [0.8, 0.05, 0.05]); gb.box(M.plastic, 0, 1.0, 0, 0.5, 0.7, 0.05, [0.9, 0.9, 0.9]); }
    else if (k < 0.58) { P.vending(gb, M, 0, 0, side[0] + side[1] > 0 ? Math.PI : 0, r); ctx.colC(0, 0, 1.0, 0.9, 2); }
    gb.pop();
    // exit sign over doors
  }
  // EXIT signs and fire extinguishers near the hallway doors
  if (room.hallDoors) for (const hd of room.hallDoors) {
    const wx = (hd.x + 0.5) * CELL, wz = (hd.z + 0.5) * CELL;
    if (!ctx.inW(wx, wz)) continue;
    gb.box(M.neon, wx, ctx.Y + 2.9, wz, 0.5, 0.18, 0.5, [0.1, 1.4, 0.3]);
  }
}
const BACK = {
  storage(ctx, f, r) { const { gb, M } = ctx; for (let x = 1.6; x < f.w - 1.2; x += 3.0) { const z = f.d / 2; if (ctx.inL(x, z)) { P.palletRack(gb, M, x, z, Math.PI / 2, Math.max(2.7, f.d - 3), r, 4); ctx.colC(x, z, 1.4, f.d - 3, 4); } } },
  stockroom(ctx, f, r) { const { gb, M } = ctx; for (let x = 1.2; x < f.w - 1; x += 2.6) { const z = f.d / 2; if (ctx.inL(x, z)) { P.wallShelf(gb, M, x, z, Math.PI / 2, f.d - 2.5, 2.6, M.matte, [0.3, 0.45, 0.7]); ctx.colC(x, z, 0.7, f.d - 2.5, 2.6); } } for (let i = 0; i < 3; i++) { const x = r.range(1, f.w - 1), z = r.range(1, f.d - 1); if (ctx.inL(x, z)) P.boxStack(gb, M, x, z, r, 3); } },
  mechanical(ctx, f, r) { const { gb, M } = ctx; const n = Math.max(1, Math.floor(f.w / 4)); for (let i = 0; i < n; i++) { const x = 2 + i * 4, z = f.d / 2; if (ctx.inL(x, z)) { if (i % 2) { P.hvac(gb, M, x, z, Math.PI / 2); ctx.colC(x, z, 1.5, 2.7, 3); } else { P.tank(gb, M, x, z, 1.1, 2.4); ctx.colC(x, z, 2.2, 2.2, 3); } } } pipeMaze(ctx, f, r); },
  boiler(ctx, f, r) { const { gb, M } = ctx; for (let x = 2.2; x < f.w - 1.5; x += 4.5) { const z = f.d / 2; if (ctx.inL(x, z)) { P.tank(gb, M, x, z, 1.6, 2.8, [0.5, 0.3, 0.25]); ctx.colC(x, z, 3.2, 3.2, 3.5); } } pipeMaze(ctx, f, r); },
  watertank(ctx, f, r) { const { gb, M } = ctx; for (let x = 2.5; x < f.w - 2; x += 5) { const z = f.d / 2; if (ctx.inL(x, z)) { P.tank(gb, M, x, z, 2.0, 3.0, [0.3, 0.45, 0.6]); ctx.colC(x, z, 4, 4, 3.5); } } pipeMaze(ctx, f, r); },
  generator(ctx, f, r) { const { gb, M } = ctx; const x = f.w / 2, z = f.d / 2; if (ctx.inL(x, z)) { gb.box(M.metal, x, 0, z, Math.min(5, f.w - 1.5), 2.2, 2.0, [0.9, 0.7, 0.1]); gb.box(M.metal, x, 2.2, z, 1, 1, 1, [0.3, 0.3, 0.3]); gb.cyl(M.metal, [x, 3.2, z], [x, 4.2, z], 0.25, [0.3, 0.3, 0.3]); ctx.colC(x, z, 5, 2.1, 2.5); } P.panels(gb, M, 1.5, 0.4, 0, 2); },
  electrical(ctx, f, r) { const { gb, M } = ctx; if (ctx.inL(f.w / 2, f.d - 0.4)) { P.panels(gb, M, f.w / 2, f.d - 0.4, Math.PI, Math.max(2, Math.floor((f.w - 1) / 0.9))); ctx.colC(f.w / 2, f.d - 0.4, f.w - 1, 0.6, 2.1); } if (ctx.inL(0.4, f.d / 2)) P.panels(gb, M, 0.4, f.d / 2, Math.PI / 2, Math.max(1, Math.floor((f.d - 3) / 0.9))); },
  server(ctx, f, r) { const { gb, M } = ctx; for (let x = 1.5; x < f.w - 1; x += 1.8) for (let z = 1.8; z < f.d - 1; z += 0.7) if (ctx.inL(x, z)) { P.serverRack(gb, M, x, z, Math.PI / 2); ctx.colC(x, z, 1.0, 0.7, 2.1); } },
  security(ctx, f, r) { const { gb, M } = ctx; if (ctx.inL(f.w / 2, f.d - 0.3)) { gb.box(M.plastic, f.w / 2, 0.9, f.d - 0.3, f.w - 1, 2.0, 0.2, DARK); for (let i = 0; i < Math.floor(f.w - 1) / 0.9; i++) for (let j = 0; j < 3; j++) gb.box(M.screen, 0.9 + i * 0.9, 1.0 + j * 0.62, f.d - 0.42, 0.84, 0.56, 0.01, W); } if (ctx.inL(f.w / 2, f.d - 2)) P.desk(gb, M, f.w / 2, f.d - 2, Math.PI, 3); },
  breakroom(ctx, f, r) { const { gb, M } = ctx; if (ctx.inL(f.w / 2, f.d / 2)) P.diningSet(gb, M, f.w / 2, f.d / 2, r, false, 4); if (ctx.inL(0.6, 1.5)) P.vending(gb, M, 0.6, 1.5, Math.PI / 2, r); if (ctx.inL(f.w - 0.5, f.d / 2)) P.lockers(gb, M, f.w - 0.5, f.d / 2, -Math.PI / 2, Math.floor(f.d / 0.4) - 3); if (ctx.inL(f.w / 2, f.d - 0.4)) { gb.box(M.wood, f.w / 2, 0, f.d - 0.4, 3, 0.9, 0.6, [0.6, 0.5, 0.4]); gb.box(M.metal, f.w / 2 + 1, 0.9, f.d - 0.4, 0.5, 0.3, 0.4, [0.8, 0.8, 0.8]); } },
  janitor(ctx, f, r) { const { gb, M } = ctx; if (ctx.inL(1, 1)) { gb.vcyl(M.plastic, 1, 0, 1, 0.3, 0.45, [0.9, 0.8, 0.1]); gb.beam(M.wood, [1, 0.4, 1], [1.2, 1.6, 1.3], 0.04, 0.04, [0.6, 0.5, 0.3]); } if (ctx.inL(f.w / 2, f.d - 0.4)) P.wallShelf(gb, M, f.w / 2, f.d - 0.4, Math.PI, f.w - 1, 2.2, M.products, [0.7, 0.7, 0.7]); },
  office(ctx, f, r) { const { gb, M } = ctx; for (let x = 2; x < f.w - 1; x += 2.6) for (let z = 2; z < f.d - 1; z += 2.4) if (ctx.inL(x, z)) { P.desk(gb, M, x, z, 0, r.int(1, 2)); ctx.colC(x, z, 1.7, 0.8, 1); } },
  trash(ctx, f, r) { const { gb, M } = ctx; for (let x = 1.5; x < f.w - 1; x += 2.6) { const z = f.d - 1.2; if (ctx.inL(x, z)) { gb.box(M.metal, x, 0.15, z, 2.0, 1.3, 1.4, r.pick([[0.15, 0.35, 0.2], [0.2, 0.3, 0.5], [0.4, 0.4, 0.42]])); gb.box(M.metal, x, 1.45, z, 2.05, 0.08, 1.45, DARK); ctx.colC(x, z, 2, 1.4, 1.5); } } },
  loading(ctx, f, r) { const { gb, M } = ctx; for (let x = 2; x < f.w - 1.5; x += 4) { if (ctx.inL(x, f.d - 0.25)) { gb.box(M.rollup, x, 0, f.d - 0.2, 3.2, 3.6, 0.1, W); gb.box(M.rubber, x, 0, f.d - 0.5, 3.4, 1.2, 0.3, DARK); gb.box(M.neon, x + 1.9, 2.0, f.d - 0.3, 0.1, 0.1, 0.05, r.chance(0.5) ? [0.2, 1.4, 0.3] : [1.4, 0.2, 0.2]); } } for (let i = 0; i < 4; i++) { const x = r.range(1.2, f.w - 1.2), z = r.range(1.2, f.d - 2.5); if (ctx.inL(x, z)) P.pallet(gb, M, x, z, r.range(-0.2, 0.2), r, r.range(0.5, 1.5)); } if (ctx.inL(f.w / 2, f.d / 2)) { gb.box(M.gloss, f.w / 2, 0, f.d / 2, 1.0, 1.2, 2.0, [0.9, 0.6, 0.1]); gb.box(M.metal, f.w / 2, 0, f.d / 2 + 1.4, 1.0, 0.08, 1.0, [0.3, 0.3, 0.3]); } },
  laundry(ctx, f, r) { const { gb, M } = ctx; for (let x = 1; x < f.w - 0.5; x += 1.0) if (ctx.inL(x, f.d - 0.5)) { gb.box(M.gloss, x, 0, f.d - 0.5, 0.9, 1.0, 0.8, [0.95, 0.95, 0.95]); gb.vcyl(M.glass, x, 0.5, f.d - 0.95, 0.25, 0.04, W); } },
};
function pipeMaze(ctx, f, r) {
  const { gb, M } = ctx;
  for (let i = 0; i < 4; i++) {
    const y = 3.0 + i * 0.25, z = 0.6 + i * 0.4;
    if (ctx.inL(f.w / 2, z)) P.pipe(gb, M, [0.2, y, z], [f.w - 0.2, y, z], 0.08 + i * 0.03, [[0.6, 0.3, 0.2], [0.2, 0.4, 0.65], [0.55, 0.56, 0.58], [0.2, 0.55, 0.3]][i]);
  }
}
function backroom(ctx, room) {
  const fn = BACK[room.type];
  if (!fn) return;
  // pick a frame whose front is the side with the door (so things are against the back)
  let side = 'N';
  if (room.doors && room.doors.length) {
    const [ix, iz, ox, oz] = room.doors[0];
    side = oz < iz ? 'N' : oz > iz ? 'S' : ox < ix ? 'W' : 'E';
  } else {
    const fr = frameOf(room, 'N');
    side = fr.w >= fr.d ? 'N' : 'W';
  }
  inFrame(ctx, room, side, (f) => fn(ctx, f, new RNG(room.seed)));
}
function stair(ctx, room) {
  const { gb, M } = ctx;
  // level number painted on the landing wall
  const x = room.x0 * CELL + 0.2, z = room.z0 * CELL + 2;
  if (!ctx.inW(x, z)) return;
  gb.box(M.paint, x, ctx.Y + 1.6, z, 0.02, 1.2, 1.6, [0.15, 0.25, 0.5]);
}

// ======================================================================= basement
function tunnel(ctx, room) {
  const { mall, gb, M, l } = ctx;
  for (let z = ctx.Z0; z < ctx.Z1; z++) for (let x = ctx.X0; x < ctx.X1; x++) {
    if (mall.roomId(l, x, z) !== room.id) continue;
    const ex = mall.roomId(l, x + 1, z) === room.id || mall.roomId(l, x - 1, z) === room.id;
    const ez = mall.roomId(l, x, z + 1) === room.id || mall.roomId(l, x, z - 1) === room.id;
    const wx = x * CELL, wz = z * CELL, Y = ctx.Y;
    const r = rngFor(mall.seed, 'tun', x, z);
    const cols = [[0.55, 0.56, 0.58], [0.7, 0.25, 0.2], [0.25, 0.45, 0.7], [0.3, 0.55, 0.3], [0.8, 0.7, 0.2]];
    if (ex && !ez) {
      for (const s of [0.45, CELL - 0.45]) for (let i = 0; i < 3; i++) P.pipe(gb, M, [wx, Y + 0.6 + i * 0.75, wz + s + (s < 2 ? i * 0.05 : -i * 0.05)], [wx + CELL, Y + 0.6 + i * 0.75, wz + s + (s < 2 ? i * 0.05 : -i * 0.05)], 0.12 + (i === 0 ? 0.08 : 0), cols[(i + (s < 2 ? 0 : 2)) % 5]);
      gb.box(M.metal, wx + 2, Y + 3.0, wz + 0.5, CELL, 0.06, 0.6, [0.5, 0.5, 0.5]);
      if (r.chance(0.25)) gb.geo(M.water, TPL.disc, wx + r.range(1, 3), Y + 0.01, wz + 2 + r.range(-0.6, 0.6), r.range(1, 2.2), 1, r.range(0.8, 1.6), [0.5, 0.6, 0.7]);
      if (r.chance(0.2)) gb.geo(M.gloss, TPL.torus, wx + 2, Y + 1.2, wz + 0.25, 0.6, 0.6, 0.6, [0.8, 0.1, 0.1]);
    } else if (ez && !ex) {
      for (const s of [0.45, CELL - 0.45]) for (let i = 0; i < 3; i++) P.pipe(gb, M, [wx + s + (s < 2 ? i * 0.05 : -i * 0.05), Y + 0.6 + i * 0.75, wz], [wx + s + (s < 2 ? i * 0.05 : -i * 0.05), Y + 0.6 + i * 0.75, wz + CELL], 0.12 + (i === 0 ? 0.08 : 0), cols[(i + (s < 2 ? 0 : 2)) % 5]);
      gb.box(M.metal, wx + 0.5, Y + 3.0, wz + 2, 0.6, 0.06, CELL, [0.5, 0.5, 0.5]);
      if (r.chance(0.25)) gb.geo(M.water, TPL.disc, wx + 2 + r.range(-0.6, 0.6), Y + 0.01, wz + r.range(1, 3), r.range(0.8, 1.6), 1, r.range(1, 2.2), [0.5, 0.6, 0.7]);
    }
    // painted floor line
    gb.box(M.paint, wx + 2, Y, wz + 2, ex ? CELL : 0.12, 0.01, ez ? CELL : 0.12, [0.85, 0.75, 0.1]);
  }
}
function garage(ctx, room) {
  const { gb, M, mall, l } = ctx;
  const r0 = new RNG(room.seed);
  const horiz = (room.x1 - room.x0) >= (room.z1 - room.z0);
  const Y = ctx.Y;
  gb.push(0, Y, 0, 0);
  // columns every 2 cells
  for (let z = room.z0 + 2; z < room.z1; z += 2) for (let x = room.x0 + 2; x < room.x1; x += 2) {
    const wx = x * CELL, wz = z * CELL;
    if (!ctx.inW(wx, wz) || mall.roomId(l, x, z) !== room.id || mall.roomId(l, x - 1, z - 1) !== room.id) continue;
    gb.box(M.concrete, wx, 0, wz, 0.7, 3.5, 0.7, [0.85, 0.85, 0.83], { grad: 0.7 });
    gb.box(M.paint, wx, 0, wz, 0.72, 1.0, 0.72, [0.9, 0.7, 0.1]);
    ctx.colliders.push(box(wx - 0.36, ctx.Y, wz - 0.36, wx + 0.36, ctx.Y + 3.5, wz + 0.36));
    if ((x + z) % 6 === 0) gb.box(M.paint, wx, 2.2, wz, 0.74, 0.6, 0.74, [0.15, 0.3, 0.7]);
  }
  // parking bays: rows across the shorter axis
  const a0 = horiz ? room.x0 : room.z0, a1 = horiz ? room.x1 : room.z1;
  const b0 = horiz ? room.z0 : room.x0, b1 = horiz ? room.z1 : room.x1;
  for (let b = b0 + 1; b + 1.4 < b1; b += 4) {
    for (let a = a0 * CELL + 1.5; a < a1 * CELL - 2; a += 2.6) {
      for (const side of [0, 1]) {
        const cb = (b + side * 1.5) * CELL + (side ? 0.3 : -0.3);
        const [wx, wz] = horiz ? [a + 1.3, cb] : [cb, a + 1.3];
        const cx = Math.floor(wx / CELL), cz = Math.floor(wz / CELL);
        if (!ctx.inW(wx, wz) || mall.roomId(l, cx, cz) !== room.id) continue;
        const r = rngFor(room.seed, Math.round(a * 10), b, side);
        // bay lines
        if (horiz) gb.box(M.paint, a, 0.005, cb, 0.1, 0.01, 5.0, [0.9, 0.9, 0.88]);
        else gb.box(M.paint, cb, 0.005, a, 5.0, 0.01, 0.1, [0.9, 0.9, 0.88]);
        if (r.chance(0.62)) {
          const col = r.pick([[0.8, 0.8, 0.82], [0.05, 0.05, 0.06], [0.6, 0.05, 0.05], [0.1, 0.2, 0.45], [0.5, 0.5, 0.52], [0.9, 0.9, 0.9], [0.2, 0.3, 0.2]]);
          P.car(gb, M, wx, wz, (horiz ? 0 : Math.PI / 2) + (side ? Math.PI : 0) + r.range(-0.05, 0.05), col);
          // car local frame is at floor of level
          ctx.colliders.push(horiz ? box(wx - 1, ctx.Y, wz - 2.3, wx + 1, ctx.Y + 1.4, wz + 2.3) : box(wx - 2.3, ctx.Y, wz - 1, wx + 2.3, ctx.Y + 1.4, wz + 1));
        }
      }
    }
  }
  gb.pop();
}
// car() draws relative to gb frame; garage calls happen with gb in world frame but Y offset needed
const _car = P.car;

// ======================================================================= department store
function department(ctx, room) {
  const { mall, gb, M, l } = ctx;
  for (let z = room.z0 + 1; z < room.z1 - 1; z++) for (let x = room.x0 + 1; x < room.x1 - 1; x++) {
    const wx = (x + 0.5) * CELL, wz = (z + 0.5) * CELL;
    if (!ctx.inW(wx, wz) || mall.isVoid(l, x, z)) continue;
    let near = false;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (mall.reserved[li(l)].has(mall.idx(x + dx, z + dz)) || mall.isVoid(l, x + dx, z + dz) || (l > 0 && mall.reserved[li(l - 1)].has(mall.idx(x + dx, z + dz)))) near = true;
    if (near) continue;
    const r = rngFor(room.seed, x, z);
    if ((x + z) % 2) continue;
    gb.push(wx, ctx.Y, wz, 0);
    if (l === 0) {
      if (r.chance(0.6)) { // cosmetics island
        for (const [sx, sz, rot] of [[0, -1.2, 0], [0, 1.2, Math.PI], [-1.2, 0, Math.PI / 2], [1.2, 0, -Math.PI / 2]]) P.glassCase(gb, M, sx, sz, rot, 1.8, r);
        gb.box(M.gloss, 0, 0, 0, 1.2, 2.4, 1.2, [0.95, 0.95, 0.95]); gb.box(M.light, 0, 2.4, 0, 1.0, 0.1, 1.0, W);
        ctx.colC(0, 0, 3.2, 3.2, 1.2);
      } else { P.displayTable(gb, M, 0, 0, 0, 2.2, 1.2, 'gift', r); P.mannequin(gb, M, 1.6, 0, 0, rcol(r)); ctx.colC(0, 0, 2.3, 1.3, 1); }
    } else if (l === 1) {
      if (r.chance(0.5)) { P.clothingRack(gb, M, 0, -0.8, 0, 2.6, r); P.clothingRack(gb, M, 0, 0.8, 0, 2.6, r); ctx.colC(0, 0, 2.8, 2.4, 1.6); }
      else if (r.chance(0.5)) { P.roundRack(gb, M, 0, 0, r); ctx.colC(0, 0, 1.7, 1.7, 1.5); }
      else { P.mannequin(gb, M, -0.6, 0, 0, rcol(r)); P.mannequin(gb, M, 0.6, 0, 0, rcol(r)); }
    } else {
      const t = r.int(0, 3);
      if (t === 0) { P.sofa(gb, M, 0, 0, 0, rcol(r, [0.1, 0.4], [0.3, 0.6]), 2.4); ctx.colC(0, 0, 2.6, 1, 1); }
      else if (t === 1) { P.bed(gb, M, 0, 0, Math.PI / 2, rcol(r)); ctx.colC(0, 0, 2.2, 2.2, 1); }
      else if (t === 2) { P.displayTable(gb, M, 0, 0, 0, 2.4, 1.2, 'laptop', r); ctx.colC(0, 0, 2.5, 1.3, 1); }
      else { P.diningSet(gb, M, 0, 0, r, true, 4); }
    }
    gb.pop();
  }
}

// ======================================================================= venues (single level, whole block)
function roomCenter(room) { return [((room.x0 + room.x1) / 2) * CELL, ((room.z0 + room.z1) / 2) * CELL]; }
function mainFrame(ctx, room, fn) { inFrame(ctx, room, room.lobbySide || (room.fronts && room.fronts[0]) || 'N', fn); }
const VENUE = {
  bowling(ctx, room) {
    const { gb, M } = ctx;
    mainFrame(ctx, room, (f) => {
      const r = new RNG(room.seed);
      const laneLen = 19, start = f.d - laneLen - 2.5;
      const n = Math.floor((f.w - 4) / 2.0);
      for (let i = 0; i < n; i++) {
        const x = 2 + 1.0 + i * 2.0;
        if (ctx.inL(x, start + laneLen / 2)) { P.bowlingLane(gb, M, x, start, laneLen, new RNG(room.seed + i)); ctx.colC(x, start + laneLen / 2 + 1, 1.9, laneLen - 1, 0.7); }
        if (i % 2 === 0) {
          // ball return, scoring screen and seating for each pair
          if (ctx.inL(x + 1, start - 1.5)) {
            gb.box(M.gloss, x + 1, 0, start - 1.6, 0.6, 0.55, 1.4, [0.15, 0.15, 0.3]);
            for (let b = 0; b < 4; b++) gb.sphere(M.gloss, x + 1, 0.68, start - 2.1 + b * 0.32, 0.11, hsl(r.range(0, 360), 0.8, 0.5));
            gb.box(M.screen, x + 1, 3.2, start + 0.5, 1.9, 1.0, 0.06, W);
            gb.box(M.metal, x + 1, 4.2, start + 0.5, 0.05, CEIL - 4.2, 0.05, DARK);
            P.sofa(gb, M, x + 1, start - 4.2, 0, [0.6, 0.12, 0.4], 3.2);
            ctx.colC(x + 1, start - 1.6, 0.7, 1.5, 0.8);
          }
        }
      }
      // shoe counter and bar along the front
      if (ctx.inL(f.w * 0.3, 3)) { P.counter(gb, M, f.w * 0.3, 3, 0, 8, [0.12, 0.08, 0.25]); ctx.colC(f.w * 0.3, 3, 8.2, 0.9, 1.1); gb.box(M.neon, f.w * 0.3, 1.0, 3.36, 8, 0.05, 0.02, [1.2, 0.2, 1.3]); }
      if (ctx.inL(f.w * 0.75, 3)) { P.counter(gb, M, f.w * 0.75, 3, 0, 9, [0.25, 0.12, 0.05]); ctx.colC(f.w * 0.75, 3, 9.2, 0.9, 1.1); }
      for (let x = 4; x < f.w - 4; x += 3.5) if (ctx.inL(x, 7)) P.diningSet(gb, M, x, 7, new RNG(room.seed + x), true, 3, [0.2, 0.2, 0.25]);
      // lounge: billiards and an arcade strip between the bar and the lanes
      for (let x = 6; x < f.w - 6; x += 6) for (let z = 12; z < start - 7; z += 5) {
        if (!ctx.inL(x, z)) continue;
        const k = new RNG(room.seed + x * 7 + z);
        if ((x / 6 + z / 5) % 3 < 1) { for (let i = 0; i < 3; i++) P.arcadeCab(gb, M, x - 0.8 + i * 0.8, z, Math.PI, k); ctx.colC(x, z, 2.5, 0.9, 2); }
        else { gb.box(M.wood, x, 0, z, 2.6, 0.8, 1.5, [0.3, 0.15, 0.08]); gb.box(M.carpet, x, 0.8, z, 2.3, 0.04, 1.2, [0.1, 0.25, 0.6]); gb.box(M.light, x, 2.6, z, 1.8, 0.1, 0.4, [1.4, 1.2, 0.8]); ctx.colC(x, z, 2.6, 1.5, 1); }
      }
    });
  },
  cinema(ctx, room) {
    const { gb, M } = ctx;
    mainFrame(ctx, room, (f) => {
      const r = new RNG(room.seed);
      const D = 6 * CELL;
      if (ctx.inL(f.w / 2, D - 3)) {
        P.counter(gb, M, f.w / 2, D - 4, 0, 14, [0.5, 0.08, 0.1], [0.95, 0.9, 0.7]);
        gb.box(M.light, f.w / 2, 2.6, D - 1.2, 14, 1.4, 0.1, [1.2, 1.1, 0.9]);
        gb.box(M.screen, f.w / 2, 2.6, D - 1.25, 13.4, 1.2, 0.01, W);
        gb.box(M.glass, f.w / 2 - 5, 1.05, D - 4, 1.2, 1.2, 0.8, [1, 0.9, 0.5]);
        ctx.colC(f.w / 2, D - 4, 14.2, 0.9, 1.1);
      }
      for (let x = 3; x < f.w - 2; x += 3.2) {
        if (ctx.inL(x, 0.4) && Math.abs(x - f.w / 2) > 3) { gb.box(M.posters, x, 1.0, 0.45, 1.6, 2.4, 0.04, W); gb.box(M.light, x, 0.95, 0.47, 1.7, 2.5, 0.01, [1.2, 1.2, 1.2]); }
      }
      for (let i = 0; i < 4; i++) { const x = 4 + i * 2.2; if (ctx.inL(x, 9)) { gb.box(M.gloss, x, 0, 9, 0.7, 1.6, 0.5, [0.1, 0.1, 0.12]); gb.box(M.screen, x, 1.0, 9.26, 0.55, 0.45, 0.01, W); } }
      for (let x = 6; x < f.w - 6; x += 8) if (ctx.inL(x, 14)) { P.sofa(gb, M, x, 14, 0, [0.5, 0.1, 0.12], 3); }
    });
  },
  auditorium(ctx, room) {
    const { gb, M } = ctx;
    inFrame(ctx, room, room.screenSide, (f) => {
      if (ctx.inL(f.w / 2, 0.3)) {
        gb.box(M.dark, f.w / 2, 0.8, 0.25, f.w - 0.6, CEIL - 1.2, 0.1, W);
        gb.box(M.screen, f.w / 2, 1.6, 0.32, f.w - 2.4, (f.w - 2.4) / 2.35, 0.01, [0.55, 0.55, 0.6]);
      }
      const col = [0.45, 0.06, 0.08];
      for (let z = 6; z < f.d - 1.5; z += 1.15) {
        const n = Math.floor((f.w - 3) / 0.6);
        if (ctx.inL(f.w / 2, z)) { P.cinemaSeats(gb, M, f.w / 2 - 0.4, z, 0, n - 2, col); ctx.colC(f.w / 2 - 0.4, z + 0.1, (n - 2) * 0.6, 0.7, 0.9); }
      }
      for (let z = 4; z < f.d; z += 3) for (const x of [0.25, f.w - 0.25]) if (ctx.inL(x, z)) gb.box(M.light, x, 3, z, 0.08, 0.3, 0.3, [1.3, 0.8, 0.5]);
    });
  },
  foodcourt(ctx, room) {
    const { gb, M } = ctx;
    const r = new RNG(room.seed);
    const fcChair = r.pick([[0.85, 0.35, 0.15], [0.1, 0.35, 0.3], [0.08, 0.08, 0.09], [0.75, 0.75, 0.72]]);
    const names = ['WOK', 'BURGER', 'TACO', 'PIZZA', 'SUSHI', 'CURRY', 'KEBAB', 'SALAD', 'NOODLE', 'BBQ', 'CREPE', 'GELATO', 'BAO', 'PHO', 'DONUT', 'BOBA'];
    // stalls along the non-front walls
    const fr = mainFrame;
    fr(ctx, room, (f) => {
      for (let x = 3; x < f.w - 3; x += 5.2) {
        const z = f.d - 2.1;
        if (ctx.inL(x, z)) { P.stall(gb, M, x, z, 0, 4.6, hsl(r.range(0, 360), 0.7, 0.45), r); ctx.colC(x, z - 0.6, 4.8, 2.4, 2); }
      }
      for (const [sx, rot] of [[2.1, -Math.PI / 2], [f.w - 2.1, Math.PI / 2]]) for (let z = 6; z < f.d - 6; z += 5.2) {
        if (ctx.inL(sx, z)) { P.stall(gb, M, sx, z, rot + Math.PI, 4.6, hsl(r.range(0, 360), 0.7, 0.45), r); ctx.colC(sx, z, 2.4, 4.8, 2); }
      }
      for (let x = 7; x < f.w - 7; x += 2.6) for (let z = 4; z < f.d - 6.5; z += 2.6) {
        if (!ctx.inL(x, z)) continue;
        const k = new RNG(room.seed + x * 31 + z);
        const ix = Math.round((x - 7) / 2.6), iz = Math.round((z - 4) / 2.6);
        if (ix % 6 === 3 && iz % 4 === 2) { P.planter(gb, M, x, z, 1.6, 1.6, 'palm', k); ctx.colC(x, z, 1.6, 1.6, 1); }
        else P.diningSet(gb, M, x, z, k, k.chance(0.6), 4, [0.95, 0.95, 0.93], fcChair);
      }
    });
  },
  arcade(ctx, room) {
    const { gb, M } = ctx;
    mainFrame(ctx, room, (f) => {
      for (let x = 3; x < f.w - 3; x += 4) for (let z = 4; z < f.d - 4; z += 3) {
        if (!ctx.inL(x, z)) continue;
        const k = new RNG(room.seed + x * 17 + z);
        const t = k.int(0, 4);
        if (t <= 1) { for (let i = 0; i < 3; i++) P.arcadeCab(gb, M, x - 0.8 + i * 0.8, z, 0, k); ctx.colC(x, z, 2.5, 0.9, 2); }
        else if (t === 2) { P.clawMachine(gb, M, x - 0.6, z, k); P.clawMachine(gb, M, x + 0.6, z, k); ctx.colC(x, z, 2.3, 1.1, 2); }
        else if (t === 3) { gb.box(M.gloss, x, 0, z, 2.2, 0.85, 1.2, [0.1, 0.1, 0.3]); gb.box(M.neon, x, 0.85, z, 2.0, 0.02, 1.0, [0.3, 1.0, 1.4]); ctx.colC(x, z, 2.2, 1.2, 1); }
        else { gb.box(M.gloss, x, 0, z, 1.8, 0.2, 1.8, [0.1, 0.1, 0.1]); for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) gb.box(M.neon, x - 0.45 + a * 0.9, 0.2, z - 0.45 + b * 0.9, 0.7, 0.01, 0.7, hsl(k.range(0, 360), 1, 0.6)); gb.box(M.screen, x, 0, z - 1.2, 1.6, 2.4, 0.3, W); }
      }
      if (ctx.inL(f.w / 2, f.d - 1.5)) { P.counter(gb, M, f.w / 2, f.d - 2, 0, 10, [0.15, 0.05, 0.3]); gb.box(M.products, f.w / 2, 0, f.d - 0.4, 10, 2.6, 0.5, W); ctx.colC(f.w / 2, f.d - 2, 10, 0.9, 1.1); }
    });
  },
  trampoline(ctx, room) {
    const { gb, M } = ctx;
    mainFrame(ctx, room, (f) => {
      for (let x = 4; x < f.w - 4; x += 3.3) for (let z = 6; z < f.d * 0.65; z += 3.3) if (ctx.inL(x, z)) P.trampoline(gb, M, x, z, 3.1);
      // foam pit
      const pz = f.d * 0.82;
      for (let i = 0; i < 160; i++) {
        const x = 4 + ((i * 37) % 100) / 100 * (f.w - 8), z = pz - 4 + ((i * 53) % 100) / 100 * 8;
        if (ctx.inL(x, z)) gb.geo(M.fabric, TPL.box, x, 0.5, z, 0.6, 0.6, 0.6, hsl(i * 47, 0.8, 0.55), i * 0.3, i * 0.7, 0);
      }
      if (ctx.inL(f.w / 2, 2.5)) { P.counter(gb, M, f.w / 2, 2.5, 0, 8, [0.1, 0.3, 0.8]); ctx.colC(f.w / 2, 2.5, 8, 0.9, 1.1); }
    });
  },
  minigolf(ctx, room) {
    const { gb, M } = ctx;
    mainFrame(ctx, room, (f) => {
      const r = new RNG(room.seed);
      for (let x = 5; x < f.w - 5; x += 9) for (let z = 6; z < f.d - 5; z += 7) {
        if (!ctx.inL(x, z)) continue;
        const k = new RNG(room.seed + x * 3 + z);
        const c = hsl(k.range(80, 160), 0.7, 0.3);
        gb.box(M.carpet, x, 0, z, 7, 0.08, 4.5, c);
        for (const [sx, sz, w, d] of [[0, -2.3, 7.2, 0.15], [0, 2.3, 7.2, 0.15], [-3.6, 0, 0.15, 4.6], [3.6, 0, 0.15, 4.6]]) gb.box(M.neon, x + sx, 0, z + sz, w, 0.18, d, hsl(k.range(0, 360), 1, 0.6));
        gb.geo(M.dark, TPL.disc, x + 2.5, 0.085, z, 0.3, 1, 0.3, W);
        const t = k.int(0, 2);
        if (t === 0) { gb.box(M.gloss, x, 0, z, 1.2, 2.2, 1.2, [0.9, 0.2, 0.6]); gb.geo(M.gloss, TPL.cone, x, 2.7, z, 1.6, 1.0, 1.6, [0.3, 0.9, 1]); for (let b = 0; b < 4; b++) gb.beam(M.neon, [x, 2.0, z + 0.62], [x + Math.cos(b * 1.57) * 1.6, 2.0 + Math.sin(b * 1.57) * 1.6, z + 0.65], 0.25, 0.04, [1.3, 1.3, 0.3]); }
        else if (t === 1) { gb.geo(M.gloss, TPL.hemi, x, 0, z, 2.4, 1.6, 2.4, hsl(k.range(0, 360), 0.9, 0.5)); }
        else { for (let q = 0; q < 3; q++) gb.box(M.gloss, x - 1 + q, 0, z + (q % 2 ? 1 : -1), 0.3, 0.6, 1.6, [0.9, 0.9, 0.2]); }
      }
    });
  },
  gym(ctx, room) {
    const { gb, M } = ctx;
    mainFrame(ctx, room, (f) => {
      for (let x = 3; x < f.w - 3; x += 1.6) for (const z of [5, 8]) if (ctx.inL(x, z)) { P.treadmill(gb, M, x, z, 0); ctx.colC(x, z, 0.9, 2, 1.3); }
      for (let x = 3; x < f.w - 3; x += 1.4) if (ctx.inL(x, 11.5)) P.bike(gb, M, x, 11.5, 0);
      for (let x = 4; x < f.w - 4; x += 3.5) for (let z = 16; z < f.d - 5; z += 4) if (ctx.inL(x, z)) { P.weightRack(gb, M, x, z, 0); ctx.colC(x, z, 2.3, 0.7, 1.1); }
      if (ctx.inL(f.w / 2, f.d - 0.3)) gb.box(M.chrome, f.w / 2, 0.2, f.d - 0.25, f.w - 2, 2.6, 0.03, [0.85, 0.87, 0.9]);
      if (ctx.inL(f.w / 2, f.d - 3)) gb.box(M.rubber, f.w / 2, 0, f.d - 3, f.w - 4, 0.02, 4, [0.3, 0.3, 0.6]);
      if (ctx.inL(f.w / 2, 2.2)) { P.counter(gb, M, f.w / 2, 2.2, 0, 6, [0.15, 0.15, 0.16]); ctx.colC(f.w / 2, 2.2, 6.2, 0.9, 1.1); }
    });
  },
  supermarket(ctx, room) {
    const { gb, M } = ctx;
    mainFrame(ctx, room, (f) => {
      // checkouts
      for (let x = 4; x < f.w * 0.6; x += 3.4) if (ctx.inL(x, 5)) {
        gb.box(M.gloss, x, 0, 5, 0.9, 0.9, 3.4, [0.2, 0.45, 0.25]); gb.box(M.rubber, x, 0.9, 5.3, 0.6, 0.02, 2.6, DARK);
        gb.vcyl(M.metal, x + 0.3, 0.9, 3.6, 0.03, 1.4, [0.5, 0.5, 0.5]); gb.box(M.light, x + 0.3, 2.3, 3.6, 0.3, 0.3, 0.05, [0.4, 1.4, 0.6]);
        ctx.colC(x, 5, 0.9, 3.4, 1);
      }
      // carts
      for (let i = 0; i < 6; i++) { const x = f.w * 0.75 + i * 0.5; if (ctx.inL(x, 3)) P.cart(gb, M, x, 3, 0); }
      // aisles
      for (let x = 3.5; x < f.w - 3; x += 3.4) {
        const z = (10 + f.d - 6) / 2, len = f.d - 18;
        if (ctx.inL(x, z)) { P.gondola(gb, M, x, z, Math.PI / 2, len, 2.0, M.products); ctx.colC(x, z, 1.2, len, 2); }
      }
      // fridges along the back
      for (let x = 2; x < f.w - 2; x += 2.4) if (ctx.inL(x, f.d - 0.7)) {
        gb.box(M.gloss, x, 0, f.d - 0.6, 2.3, 2.2, 1.0, [0.9, 0.92, 0.95]);
        gb.box(M.products, x, 0.3, f.d - 1.05, 2.1, 1.7, 0.02, W);
        gb.box(M.glass, x, 0.25, f.d - 1.12, 2.2, 1.8, 0.02, [0.8, 1, 1]);
        gb.box(M.light, x, 2.05, f.d - 1.12, 2.1, 0.08, 0.04, [0.8, 1.1, 1.4]);
        ctx.colC(x, f.d - 0.6, 2.3, 1.0, 2.2);
      }
      // produce tables
      for (let x = f.w * 0.65; x < f.w - 3; x += 3) if (ctx.inL(x, 8)) {
        const k = new RNG(room.seed + x);
        gb.box(M.wood, x, 0, 8, 2.4, 0.8, 1.4, [0.55, 0.38, 0.22]);
        for (let i = 0; i < 18; i++) gb.sphere(M.gloss, x - 1.0 + (i % 6) * 0.4, 0.88, 8 - 0.5 + Math.floor(i / 6) * 0.45, 0.13, k.pick([[0.8, 0.1, 0.05], [0.95, 0.6, 0.05], [0.3, 0.6, 0.1], [0.95, 0.85, 0.1]]));
        ctx.colC(x, 8, 2.4, 1.4, 1);
      }
    });
  },
  kidszone(ctx, room) {
    const { gb, M } = ctx;
    mainFrame(ctx, room, (f) => {
      const r = new RNG(room.seed);
      const cx = f.w / 2, cz = f.d / 2;
      if (ctx.inL(cx, cz)) {
        // big play structure
        for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
          const x = cx - 10 + i * 4, z = cz - 4 + j * 4;
          const c = hsl((i * 60 + j * 30) % 360, 0.85, 0.55);
          for (const [sx, sz] of [[-1.8, -1.8], [1.8, -1.8], [1.8, 1.8], [-1.8, 1.8]]) gb.box(M.gloss, x + sx, 0, z + sz, 0.25, 5.2, 0.25, c);
          gb.box(M.rubber, x, 2.5, z, 3.8, 0.15, 3.8, [0.2, 0.5, 0.9]);
          gb.box(M.fabric, x, 2.65, z - 1.85, 3.8, 0.9, 0.06, [0.3, 0.3, 0.3]);
          gb.geo(M.gloss, TPL.cone, x, 5.9, z, 4.6, 1.4, 4.6, c);
        }
        gb.cyl(M.gloss, [cx + 12, 2.6, cz], [cx + 18, 0.2, cz + 4], 0.7, [0.95, 0.75, 0.1], TPL.tube);
        gb.cyl(M.gloss, [cx - 12, 2.6, cz], [cx - 16, 2.6, cz + 6], 0.6, [0.9, 0.2, 0.3], TPL.tube);
        ctx.colC(cx, cz, 24, 12, 2.4);
      }
      // ball pit
      const bz = f.d - 7;
      if (ctx.inL(cx, bz)) {
        gb.box(M.rubber, cx, 0, bz, 12, 0.7, 7, [0.9, 0.3, 0.5]);
        for (let i = 0; i < 400; i++) gb.sphere(M.gloss, cx + ((i * 37) % 113) / 113 * 11.4 - 5.7, 0.55 + (i % 3) * 0.1, bz + ((i * 71) % 97) / 97 * 6.4 - 3.2, 0.09, hsl(i * 73, 0.9, 0.55), TPL.ico);
      }
      for (let x = 3; x < f.w - 3; x += 6) if (ctx.inL(x, 4)) gb.box(M.rubber, x, 0, 4, 5, 0.06, 3, hsl(x * 20, 0.8, 0.55));
    });
  },
  hotel(ctx, room) {
    const { gb, M } = ctx;
    mainFrame(ctx, room, (f) => {
      const r = new RNG(room.seed);
      if (ctx.inL(f.w / 2, f.d - 6)) { P.counter(gb, M, f.w / 2, f.d - 6, 0, 12, [0.35, 0.22, 0.12], [0.95, 0.92, 0.85]); gb.box(M.wood, f.w / 2, 0, f.d - 0.3, 16, 5, 0.2, [0.4, 0.27, 0.15]); ctx.colC(f.w / 2, f.d - 6, 12.2, 0.9, 1.1); }
      for (let x = 8; x < f.w - 8; x += 10) for (let z = 8; z < f.d - 12; z += 9) {
        if (!ctx.inL(x, z)) continue;
        gb.box(M.carpet, x, 0, z, 6, 0.015, 5, [0.45, 0.12, 0.12]);
        P.sofa(gb, M, x, z - 1.5, 0, [0.85, 0.8, 0.7], 2.8); P.sofa(gb, M, x, z + 1.5, Math.PI, [0.85, 0.8, 0.7], 2.8);
        gb.box(M.wood, x, 0, z, 1.6, 0.45, 0.9, [0.3, 0.2, 0.12]);
        // chandelier
        for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; gb.sphere(M.light, x + Math.cos(a) * 1.2, CEIL - 1.6 - (i % 2) * 0.3, z + Math.sin(a) * 1.2, 0.12, [1.5, 1.3, 0.9]); }
        gb.geo(M.gold, TPL.torus, x, CEIL - 1.5, z, 2.6, 2.6, 2.6, [1, 0.85, 0.5], Math.PI / 2);
        gb.box(M.gold, x, CEIL - 1.5, z, 0.04, 1.5, 0.04, [1, 0.85, 0.5]);
      }
      for (let x = 4; x < f.w - 3; x += 12) if (ctx.inL(x, 3)) P.planter(gb, M, x, 3, 1.4, 1.4, 'palm', r);
    });
  },
  casinoLounge(ctx, room) {
    const { gb, M } = ctx;
    mainFrame(ctx, room, (f) => {
      for (let x = 6; x < f.w - 5; x += 6) for (let z = 7; z < f.d - 8; z += 5) {
        if (!ctx.inL(x, z)) continue;
        gb.box(M.wood, x, 0, z, 2.6, 0.8, 1.5, [0.3, 0.15, 0.08]); gb.box(M.carpet, x, 0.8, z, 2.3, 0.04, 1.2, [0.05, 0.4, 0.15]);
        gb.box(M.light, x, 2.6, z, 1.8, 0.1, 0.4, [1.4, 1.2, 0.8]);
        for (let i = 0; i < 6; i++) gb.sphere(M.gloss, x + Math.sin(i * 3) * 0.8, 0.88, z + Math.cos(i * 5) * 0.4, 0.04, hsl(i * 60, 0.8, 0.5));
        ctx.colC(x, z, 2.6, 1.5, 1);
      }
      if (ctx.inL(f.w / 2, f.d - 3)) { P.counter(gb, M, f.w / 2, f.d - 3, 0, 14, [0.15, 0.05, 0.12], [0.2, 0.2, 0.22]); gb.box(M.products, f.w / 2, 1.2, f.d - 0.4, 14, 2, 0.4, W); gb.box(M.neon, f.w / 2, 1.0, f.d - 2.62, 14, 0.04, 0.02, [1.3, 0.3, 1.2]); ctx.colC(f.w / 2, f.d - 3, 14, 0.9, 1.1); }
      for (let x = 5; x < f.w - 5; x += 7) if (ctx.inL(x, 3)) P.sofa(gb, M, x, 3, 0, [0.4, 0.08, 0.35], 3);
    });
  },
};

// ======================================================================= big attractions
const ATTR = {
  themepark(ctx, room) {
    const { gb, M } = ctx;
    const r = new RNG(room.seed);
    const x0 = room.x0 * CELL, z0 = room.z0 * CELL, x1 = room.x1 * CELL, z1 = room.z1 * CELL;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    const Y = ctx.Y;
    if (ctx.mode === 'landmark') {
      gb.push(0, Y, 0, 0);
      // roller coaster loop around the park
      const pts = [];
      const N = 240;
      for (let i = 0; i < N; i++) {
        const t = (i / N) * Math.PI * 2;
        const rx = w * 0.42 + Math.sin(t * 3) * w * 0.05, rz = d * 0.42 + Math.cos(t * 2) * d * 0.05;
        const h = 3 + 7 * (0.5 + 0.5 * Math.sin(t * 4 + 1)) + (t > 4.6 && t < 5.6 ? 10 * Math.sin((t - 4.6) * Math.PI) : 0);
        pts.push([cx + Math.cos(t) * rx, h, cz + Math.sin(t) * rz]);
      }
      const segs = [];
      for (let i = 0; i < N; i++) segs.push(i);
      // draw only the segments anchored in this chunk
      const local = [];
      for (let i = 0; i < N; i++) if (ctx.inW(pts[i][0], pts[i][2])) local.push(i);
      if (local.length) {
        const sub = [];
        for (const i of local) {
          const a = pts[i], b = pts[(i + 1) % N];
          const dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz) || 1;
          const nx = (-dz / L) * 0.55, nz = (dx / L) * 0.55;
          const col = [0.85, 0.1, 0.15];
          gb.cyl(M.metal, [a[0] + nx, a[1], a[2] + nz], [b[0] + nx, b[1], b[2] + nz], 0.08, col);
          gb.cyl(M.metal, [a[0] - nx, a[1], a[2] - nz], [b[0] - nx, b[1], b[2] - nz], 0.08, col);
          gb.cyl(M.metal, [a[0], a[1] - 0.45, a[2]], [b[0], b[1] - 0.45, b[2]], 0.17, col);
          if (i % 2 === 0) gb.beam(M.metal, [a[0] + nx, a[1] - 0.05, a[2] + nz], [a[0] - nx, a[1] - 0.05, a[2] - nz], 0.08, 0.12, DARK);
          if (i % 6 === 0) { gb.cyl(M.metal, [a[0], 0, a[2]], [a[0], a[1] - 0.5, a[2]], 0.22, [0.92, 0.92, 0.95]); gb.vcyl(M.stone, a[0], 0, a[2], 0.55, 0.3, [0.75, 0.75, 0.75]); }
          if (i >= 40 && i < 52 && i % 2 === 0) {
            const ang = Math.atan2(dx, dz);
            gb.push(a[0], a[1] + 0.05, a[2], ang);
            gb.box(M.gloss, 0, 0, 0, 1.3, 0.7, 1.9, [0.95, 0.75, 0.1]);
            gb.box(M.gloss, 0, 0.7, -0.7, 1.3, 0.45, 0.2, [0.1, 0.1, 0.12]);
            gb.pop();
          }
        }
      }
      // rides
      const fw = [cx - w * 0.18, cz - d * 0.15];
      if (ctx.inW(fw[0], fw[1])) P.ferrisWheel(gb, M, fw[0], fw[1], 0.4, 15, r);
      const dt = [cx + w * 0.2, cz + d * 0.18];
      if (ctx.inW(dt[0], dt[1])) P.dropTower(gb, M, dt[0], dt[1], 19);
      const sw = [cx + w * 0.22, cz - d * 0.2];
      if (ctx.inW(sw[0], sw[1])) P.swingRide(gb, M, sw[0], sw[1], r);
      gb.pop();
      return;
    }
    gb.push(0, Y, 0, 0);
    // detail: carousel, teacups, bumper cars, stalls, trees, lamps, paths
    const items = [
      ['carousel', cx, cz + d * 0.05], ['teacups', cx - w * 0.22, cz + d * 0.22], ['bumper', cx + w * 0.02, cz - d * 0.26],
    ];
    for (const [t, x, z] of items) {
      if (!ctx.inW(x, z)) continue;
      if (t === 'carousel') { P.carousel(gb, M, x, z, 7, r); ctx.colliders.push(box(x - 7, Y, z - 7, x + 7, Y + 4, z + 7)); }
      if (t === 'teacups') { P.teacups(gb, M, x, z, r); ctx.colliders.push(box(x - 7.5, Y, z - 7.5, x + 7.5, Y + 2, z + 7.5)); }
      if (t === 'bumper') { P.bumperCars(gb, M, x, z, 20, 13, r); ctx.colliders.push(box(x - 10, Y, z - 6.5, x + 10, Y + 1, z + 6.5)); }
    }
    // paths: grass lawns in a grid with pavement between
    for (let gx = x0 + 10; gx < x1 - 10; gx += 24) for (let gz = z0 + 10; gz < z1 - 10; gz += 24) {
      const lx = gx + 7, lz = gz + 7;
      if (!ctx.inW(lx, lz)) continue;
      const k = rngFor(room.seed, gx, gz);
      if (k.chance(0.45)) {
        gb.box(M.grass, lx, 0, lz, 12, 0.08, 12, [0.9, 1, 0.9]);
        for (let i = 0; i < 3; i++) P.tree(gb, M, lx + k.range(-4, 4), lz + k.range(-4, 4), k.range(5, 8), k.range(1.6, 2.4), 0.08);
      } else if (k.chance(0.6)) {
        P.stall(gb, M, lx, lz, k.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]), 4, hsl(k.range(0, 360), 0.8, 0.5), k);
        ctx.colliders.push(box(lx - 2.6, Y, lz - 2.6, lx + 2.6, Y + 2, lz + 2.6));
      } else {
        for (let i = 0; i < 4; i++) P.bench(gb, M, lx + (i % 2 ? 3 : -3), lz + (i < 2 ? -2 : 2), i % 2 ? -Math.PI / 2 : Math.PI / 2, 2);
        P.trashBin(gb, M, lx, lz);
      }
      P.lampPost(gb, M, gx, gz, 4.5);
    }
    gb.pop();
  },
  waterpark(ctx, room) {
    const { gb, M } = ctx;
    const r = new RNG(room.seed);
    const x0 = room.x0 * CELL, z0 = room.z0 * CELL, x1 = room.x1 * CELL, z1 = room.z1 * CELL;
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const long = w >= d;
    const Y = ctx.Y;
    gb.push(0, Y, 0, 0);
    // pools
    const pools = long ? [[cx - w * 0.2, cz, w * 0.35, d * 0.55], [cx + w * 0.25, cz + d * 0.15, w * 0.22, d * 0.3]] : [[cx, cz - d * 0.2, w * 0.55, d * 0.35], [cx + w * 0.15, cz + d * 0.25, w * 0.3, d * 0.22]];
    if (ctx.mode === 'landmark') {
      // slide towers with long tube slides
      const towers = long ? [[cx + w * 0.3, cz - d * 0.28], [cx + w * 0.1, cz - d * 0.32]] : [[cx - w * 0.3, cz + d * 0.3], [cx + w * 0.3, cz + d * 0.05]];
      towers.forEach(([tx, tz], ti) => {
        if (!ctx.inW(tx, tz)) return;
        const h = 14 + ti * 3;
        const [px, pz] = pools[1];
        for (let s = 0; s < 2; s++) {
          const pts = [];
          for (let i = 0; i <= 40; i++) {
            const t = i / 40;
            const ang = t * Math.PI * (2.5 + s) + ti + s * 2;
            const rad = 4 + t * 6;
            const bx = tx + (px - tx) * t * t, bz = tz + (pz - tz) * t * t;
            pts.push([bx + Math.cos(ang) * rad * (1 - t), Math.max(0.6, h * (1 - t) + 0.6), bz + Math.sin(ang) * rad * (1 - t)]);
          }
          P.waterSlide(gb, M, tx, tz, h, pts, s ? [0.95, 0.5, 0.1] : [0.15, 0.45, 0.95]);
        }
      });
      gb.pop();
      return;
    }
    for (const [px, pz, pw, pd] of pools) {
      if (!ctx.inW(px, pz)) continue;
      gb.box(M.stone, px, 0, pz - pd / 2, pw + 1, 0.45, 0.5, [0.9, 0.88, 0.84]);
      gb.box(M.stone, px, 0, pz + pd / 2, pw + 1, 0.45, 0.5, [0.9, 0.88, 0.84]);
      gb.box(M.stone, px - pw / 2, 0, pz, 0.5, 0.45, pd, [0.9, 0.88, 0.84]);
      gb.box(M.stone, px + pw / 2, 0, pz, 0.5, 0.45, pd, [0.9, 0.88, 0.84]);
      gb.box(M.water, px, 0, pz, pw, 0.35, pd, [0.6, 0.9, 1]);
    }
    for (let i = 0; i < 40; i++) {
      const x = x0 + 6 + ((i * 37) % 100) / 100 * (w - 12), z = z0 + 6 + ((i * 61) % 100) / 100 * (d - 12);
      if (!ctx.inW(x, z)) continue;
      if (pools.some(([px, pz, pw, pd]) => Math.abs(x - px) < pw / 2 + 2 && Math.abs(z - pz) < pd / 2 + 2)) continue;
      const k = rngFor(room.seed, i);
      if (i % 3 === 0) P.palm(gb, M, x, z, k.range(6, 9));
      else if (i % 3 === 1) { P.umbrella(gb, M, x, z, hsl(k.range(0, 360), 0.8, 0.55)); P.lounger(gb, M, x + 1.2, z, 0.2); P.lounger(gb, M, x - 1.2, z, -0.2); }
      else P.lounger(gb, M, x, z, k.range(0, 6));
    }
    gb.pop();
  },
  skislope(ctx, room) {
    const { gb, M } = ctx;
    const sl = room.slope;
    if (!sl) return;
    const Y = ctx.Y;
    if (ctx.mode === 'landmark') {
      // the slope itself is architecture: draw it in segments anchored per chunk
      const N = 24;
      for (let i = 0; i < N; i++) {
        const t0 = sl.t0 + (sl.len * i) / N, t1 = sl.t0 + (sl.len * (i + 1)) / N;
        const h0 = sl.y0 + ((t0 - sl.t0) / sl.len) * (sl.y1 - sl.y0), h1 = sl.y0 + ((t1 - sl.t0) / sl.len) * (sl.y1 - sl.y0);
        const mid = (t0 + t1) / 2;
        const [mx, mz] = sl.axis === 'x' ? [mid, (sl.lo + sl.hi) / 2] : [(sl.lo + sl.hi) / 2, mid];
        if (!ctx.inW(mx, mz)) continue;
        const q = (a, b, c, e, n, mat, col) => gb.quad(mat, [a, b, c, e], n, col, [[0, 0], [1, 0], [1, 1], [0, 1]]);
        const P3 = (t, c, y) => (sl.axis === 'x' ? [t, y, c] : [c, y, t]);
        const snow = [1, 1, 1];
        if (sl.axis === 'x') q(P3(t0, sl.hi, h0), P3(t1, sl.hi, h1), P3(t1, sl.lo, h1), P3(t0, sl.lo, h0), [0, 1, 0], M.snow, snow);
        else q(P3(t0, sl.lo, h0), P3(t1, sl.lo, h1), P3(t1, sl.hi, h1), P3(t0, sl.hi, h0), [0, 1, 0], M.snow, snow);
        for (const c of [sl.lo, sl.hi]) {
          const wallC = [0.75, 0.82, 0.9];
          q(P3(t0, c, 0), P3(t1, c, 0), P3(t1, c, h1), P3(t0, c, h0), [0, 0, 1], M.plaster, wallC);
          q(P3(t1, c, 0), P3(t0, c, 0), P3(t0, c, h0), P3(t1, c, h1), [0, 0, -1], M.plaster, wallC);
          // safety netting
          gb.beam(M.metal, P3(t0, c, h0 + 1.2), P3(t1, c, h1 + 1.2), 0.05, 0.05, [0.9, 0.3, 0.1]);
          if (i % 2 === 0) gb.beam(M.metal, P3(t0, c, h0), P3(t0, c, h0 + 1.2), 0.05, 0.05, [0.3, 0.3, 0.3]);
        }
        // chairlift towers and pines
        if (i % 4 === 1) {
          const lc = sl.hi - 3;
          const [px, , pz] = P3(mid, lc, 0);
          const hm = (h0 + h1) / 2;
          gb.vcyl(M.metal, px, hm, pz, 0.25, 7, [0.35, 0.35, 0.38]);
          gb.box(M.metal, px, hm + 7, pz, sl.axis === 'x' ? 0.3 : 3, 0.3, sl.axis === 'x' ? 3 : 0.3, [0.35, 0.35, 0.38]);
          const [cx2, , cz2] = P3(mid, lc - 1.2, 0);
          gb.box(M.gloss, cx2, hm + 4.6, cz2, 1.4, 0.15, 0.7, [0.85, 0.15, 0.15]);
          gb.box(M.metal, cx2, hm + 4.75, cz2, 0.06, 2.3, 0.06, DARK);
        }
        if (i % 3 === 0) for (const off of [2.5, 6]) {
          const [px, , pz] = P3(mid, sl.lo + off, 0);
          const hm = (h0 + h1) / 2;
          gb.cyl(M.bark, [px, hm, pz], [px, hm + 1, pz], 0.12, [0.35, 0.25, 0.18]);
          gb.geo(M.foliage, TPL.cone, px, hm + 3, pz, 2.4, 4, 2.4, [0.25, 0.4, 0.3]);
          gb.geo(M.snow, TPL.cone, px, hm + 4.2, pz, 1.4, 1.8, 1.4, [1, 1, 1]);
        }
      }
      // cable along the lift line
      return;
    }
    // detail: snow piles near the bottom, rental counter
    const x0 = room.x0 * CELL, z0 = room.z0 * CELL;
    gb.push(0, Y, 0, 0);
    const [bx, bz] = sl.axis === 'x' ? [sl.t0 - 8, (sl.lo + sl.hi) / 2] : [(sl.lo + sl.hi) / 2, sl.t0 - 8];
    if (ctx.inW(bx, bz)) { P.counter(gb, M, bx, bz, sl.axis === 'x' ? Math.PI / 2 : 0, 10, [0.1, 0.3, 0.6]); for (let i = 0; i < 12; i++) gb.box(M.gloss, bx + (sl.axis === 'x' ? -2 : -5 + i * 0.8), 0, bz + (sl.axis === 'x' ? -5 + i * 0.8 : -2), 0.1, 1.7, 0.08, hsl(i * 30, 0.8, 0.5)); }
    gb.pop();
  },
  garden(ctx, room) {
    const { gb, M } = ctx;
    const Y = ctx.Y;
    const x0 = room.x0 * CELL, z0 = room.z0 * CELL, x1 = room.x1 * CELL, z1 = room.z1 * CELL;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    gb.push(0, Y, 0, 0);
    if (ctx.mode === 'landmark') {
      // tall trees
      for (let i = 0; i < 26; i++) {
        const k = rngFor(room.seed, 'tt', i);
        const x = k.range(x0 + 5, x1 - 5), z = k.range(z0 + 5, z1 - 5);
        if (Math.abs(x - cx) < 6 || Math.abs(z - cz) < 6) continue;
        if (ctx.inW(x, z)) P.tree(gb, M, x, z, k.range(9, 15), k.range(2.6, 4), 0, k.chance(0.3) ? [0.35, 0.5, 0.15] : [0.2, 0.42, 0.16]);
      }
      gb.pop();
      return;
    }
    // cross paths
    if (ctx.inW(cx, cz)) {
      gb.box(M.pavement, cx, 0, cz, x1 - x0, 0.04, 5, [0.9, 0.85, 0.8]);
      gb.box(M.pavement, cx, 0, cz, 5, 0.04, z1 - z0, [0.9, 0.85, 0.8]);
      // pond + gazebo
      gb.vcyl(M.stone, cx, 0, cz, 7, 0.45, [0.7, 0.68, 0.62], TPL.cyl20);
      gb.geo(M.water, TPL.disc, cx, 0.4, cz, 13, 1, 13, [0.5, 0.8, 0.85]);
      for (let i = 0; i < 6; i++) gb.geo(M.foliage, TPL.disc, cx + Math.cos(i) * 4, 0.42, cz + Math.sin(i * 2) * 4, 0.8, 1, 0.8, [0.3, 0.6, 0.2]);
      ctx.colliders.push(box(cx - 7, Y, cz - 7, cx + 7, Y + 0.9, cz + 7));
    }
    for (let i = 0; i < 70; i++) {
      const k = rngFor(room.seed, 'g', i);
      const x = k.range(x0 + 3, x1 - 3), z = k.range(z0 + 3, z1 - 3);
      if (!ctx.inW(x, z) || Math.abs(x - cx) < 3.5 || Math.abs(z - cz) < 3.5 || Math.hypot(x - cx, z - cz) < 9) continue;
      const t = k.int(0, 4);
      if (t <= 1) P.tree(gb, M, x, z, k.range(4, 7), k.range(1.4, 2.4));
      else if (t === 2) { for (let q = 0; q < 14; q++) gb.sphere(M.plastic, x + k.range(-1.5, 1.5), 0.25, z + k.range(-1.5, 1.5), 0.15, hsl(k.pick([0, 50, 300, 270, 20]), 0.85, 0.6)); for (let q = 0; q < 6; q++) gb.geo(M.foliage, TPL.ico, x + k.range(-1.2, 1.2), 0.2, z + k.range(-1.2, 1.2), 0.6, 0.4, 0.6, [0.3, 0.5, 0.2]); }
      else if (t === 3) P.bench(gb, M, x, z, k.range(0, 6), 2);
      else P.lampPost(gb, M, x, z, 3.6);
    }
    gb.pop();
  },
  icerink(ctx, room) {
    const { gb, M } = ctx;
    if (ctx.mode === 'landmark') return;
    const Y = ctx.Y;
    const x0 = room.x0 * CELL, z0 = room.z0 * CELL, x1 = room.x1 * CELL, z1 = room.z1 * CELL;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const rw = (x1 - x0) - 16, rd = (z1 - z0) - 22;
    gb.push(0, Y, 0, 0);
    // ice surface in tiles so each chunk draws its share
    for (let x = cx - rw / 2; x < cx + rw / 2; x += 8) for (let z = cz - rd / 2; z < cz + rd / 2; z += 8) {
      const xe = Math.min(x + 8, cx + rw / 2), ze = Math.min(z + 8, cz + rd / 2);
      if (ctx.inW((x + xe) / 2, (z + ze) / 2)) gb.floor(M.ice, x, z, xe, ze, 0.03, [0.95, 0.98, 1]);
    }
    // boards
    const boards = [[cx, cz - rd / 2, rw, 0.2], [cx, cz + rd / 2, rw, 0.2], [cx - rw / 2, cz, 0.2, rd], [cx + rw / 2, cz, 0.2, rd]];
    for (const [bx, bz, bw, bd] of boards) {
      const segs = Math.ceil(Math.max(bw, bd) / 8);
      for (let s = 0; s < segs; s++) {
        const along = bw > bd;
        const L = (along ? bw : bd) / segs;
        const px = along ? bx - bw / 2 + L * (s + 0.5) : bx, pz = along ? bz : bz - bd / 2 + L * (s + 0.5);
        if (!ctx.inW(px, pz)) continue;
        if (s === Math.floor(segs / 2) && along) continue; // gate
        const sx = along ? L : 0.2, sz = along ? 0.2 : L;
        gb.box(M.gloss, px, 0, pz, sx, 1.1, sz, [0.95, 0.95, 0.95]);
        gb.box(M.gloss, px, 0, pz, sx + 0.02, 0.2, sz + 0.02, [0.9, 0.75, 0.1]);
        gb.box(M.gloss, px, 1.1, pz, sx + 0.06, 0.08, sz + 0.06, [0.1, 0.3, 0.8]);
        gb.box(M.glass, px, 1.18, pz, sx, 1.6, sz, W);
        ctx.colliders.push(box(px - sx / 2, Y, pz - sz / 2, px + sx / 2, Y + 2.8, pz + sz / 2));
      }
    }
    // centre ice markings
    if (ctx.inW(cx, cz)) { gb.geo(M.neon, TPL.ring, cx, 0.035, cz, 9, 1, 9, [0.2, 0.3, 1.0]); gb.box(M.paint, cx, 0.035, cz, 0.3, 0.005, rd, [0.8, 0.1, 0.1]); }
    // bleachers & benches
    for (let x = cx - rw / 2 + 4; x < cx + rw / 2 - 4; x += 6) for (const s of [-1, 1]) {
      const z = cz + s * (rd / 2 + 4.5);
      if (!ctx.inW(x, z)) continue;
      for (let row = 0; row < 3; row++) gb.box(M.plastic, x, row * 0.45, z + s * row * 0.8, 5.6, 0.45, 0.8, [0.15, 0.35, 0.75]);
      ctx.colliders.push(box(x - 2.8, Y, Math.min(z, z + s * 2.4) - 0.4, x + 2.8, Y + 1.3, Math.max(z, z + s * 2.4) + 0.4));
    }
    gb.pop();
  },
  aquarium(ctx, room) {
    const { gb, M } = ctx;
    const Y = ctx.Y;
    const x0 = room.x0 * CELL, z0 = room.z0 * CELL, x1 = room.x1 * CELL, z1 = room.z1 * CELL;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const long = (x1 - x0) >= (z1 - z0);
    gb.push(0, Y, 0, 0);
    // two giant tanks with a walk-through tunnel between them
    const tw = long ? (x1 - x0) - 18 : 14, td = long ? 14 : (z1 - z0) - 18;
    const tanks = long ? [[cx, cz - 10.5, tw, td], [cx, cz + 10.5, tw, td]] : [[cx - 10.5, cz, tw, td], [cx + 10.5, cz, tw, td]];
    for (const [tx, tz, a, b] of tanks) {
      // split each tank into tiles for chunking
      for (let x = tx - a / 2; x < tx + a / 2 - 0.01; x += 8) for (let z = tz - b / 2; z < tz + b / 2 - 0.01; z += 8) {
        const xe = Math.min(x + 8, tx + a / 2), ze = Math.min(z + 8, tz + b / 2);
        const mx = (x + xe) / 2, mz = (z + ze) / 2;
        if (!ctx.inW(mx, mz)) continue;
        if (ctx.mode === 'landmark') {
          gb.box(M.tank, mx, 0, mz, xe - x, 9, ze - z, [0.35, 0.75, 1]);
        } else {
          const k = rngFor(room.seed, Math.round(x), Math.round(z));
          gb.box(M.darkTile, mx, 0, mz, xe - x, 0.6, ze - z, [0.6, 0.55, 0.45]);
          for (let i = 0; i < 4; i++) gb.geo(M.matte, TPL.ico, mx + k.range(-3, 3), 0.6, mz + k.range(-3, 3), k.range(1, 2.5), k.range(1, 3), k.range(1, 2.5), [0.4, 0.35, 0.3]);
          for (let i = 0; i < 8; i++) { const sx = mx + k.range(-3.5, 3.5), sz = mz + k.range(-3.5, 3.5); gb.beam(M.foliage, [sx, 0.6, sz], [sx + k.range(-0.4, 0.4), k.range(2, 5), sz + k.range(-0.4, 0.4)], 0.15, 0.04, [0.2, 0.6, 0.3]); }
          for (let i = 0; i < 5; i++) gb.sphere(M.gloss, mx + k.range(-3, 3), 0.8, mz + k.range(-3, 3), k.range(0.2, 0.5), hsl(k.pick([0, 20, 300, 40]), 0.8, 0.6));
          for (let i = 0; i < 14; i++) P.fish(gb, M, mx + k.range(-3.8, 3.8), k.range(1.5, 8), mz + k.range(-3.8, 3.8), k.range(0, 6.28), k.range(0.3, 1.0), hsl(k.range(0, 360), 0.9, 0.55));
          if (k.chance(0.25)) P.fish(gb, M, mx, k.range(4, 7), mz, k.range(0, 6), 3.2, [0.45, 0.5, 0.55]); // shark
        }
      }
    }
    if (ctx.mode !== 'landmark') {
      // tunnel arch over the walkway
      const L = long ? tw : td;
      for (let t = -L / 2; t < L / 2; t += 4) {
        const [ax, az] = long ? [cx + t + 2, cz] : [cx, cz + t + 2];
        if (!ctx.inW(ax, az)) continue;
        gb.geo(M.tank, TPL.tube, ax, 0, az, 7, 4, 7, [0.35, 0.75, 1], long ? 0 : Math.PI / 2, 0, Math.PI / 2);
        gb.geo(M.metal, TPL.torus, ax - (long ? 2 : 0), 0, az - (long ? 0 : 2), 7, 7, 7, [0.3, 0.3, 0.35], 0, long ? Math.PI / 2 : 0, 0);
        for (let i = 0; i < 3; i++) P.fish(gb, M, ax + (long ? 0 : (i - 1) * 2), 4.2 + i * 0.3, az + (long ? (i - 1) * 2 : 0), i, 0.5, hsl(i * 120 + t * 10, 0.9, 0.55));
      }
      for (const [tx, tz, a, b] of tanks) {
        const segs = [[tx, tz - b / 2, a, 0.2], [tx, tz + b / 2, a, 0.2], [tx - a / 2, tz, 0.2, b], [tx + a / 2, tz, 0.2, b]];
        for (const [bx, bz, bw, bd] of segs) { const mx = bx, mz = bz; if (ctx.inW(mx, mz)) ctx.colliders.push(box(bx - bw / 2, Y, bz - bd / 2, bx + bw / 2, Y + 9, bz + bd / 2)); }
      }
    }
    gb.pop();
  },
  museum(ctx, room) {
    const { gb, M } = ctx;
    const Y = ctx.Y;
    const x0 = room.x0 * CELL, z0 = room.z0 * CELL, x1 = room.x1 * CELL, z1 = room.z1 * CELL;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    gb.push(0, Y, 0, 0);
    const exhibits = [[cx - 14, cz - 8, 0.4, 1.7, 'rex'], [cx + 12, cz + 6, 2.6, 1.4, 'sauro'], [cx + 14, cz - 14, -0.8, 1.2, 'rex'], [cx - 12, cz + 14, 1.2, 1.0, 'sauro']];
    if (ctx.mode === 'landmark') {
      for (const [x, z, rot, s, kind] of exhibits) if (ctx.inW(x, z)) P.dinoSkeleton(gb, M, x, z, rot, s, kind);
      gb.pop();
      return;
    }
    for (const [x, z, rot, s] of exhibits) if (ctx.inW(x, z)) {
      const hw = 2 * s + 0.5, hd = 5 * s + 0.5;
      ctx.colliders.push(box(x - Math.max(hw, hd), Y, z - Math.max(hw, hd), x + Math.max(hw, hd), Y + 0.7, z + Math.max(hw, hd)));
    }
    for (let x = x0 + 4; x < x1 - 3; x += 6) for (const z of [z0 + 1.2, z1 - 1.2]) {
      if (!ctx.inW(x, z)) continue;
      gb.box(M.wood, x, 0, z, 4, 0.9, 1.2, [0.3, 0.2, 0.15]);
      gb.box(M.glass, x, 0.9, z, 4, 1.0, 1.2, W);
      gb.geo(M.matte, TPL.ico, x, 1.1, z, 0.5, 0.3, 0.6, [0.85, 0.8, 0.7]);
      gb.box(M.paint, x, 2.2, z + (z < cz ? -0.55 : 0.55), 3, 1.4, 0.05, [0.2, 0.25, 0.3]);
      ctx.colliders.push(box(x - 2, Y, z - 0.6, x + 2, Y + 1.9, z + 0.6));
    }
    gb.pop();
  },
  arena(ctx, room) {
    const { gb, M } = ctx;
    const Y = ctx.Y;
    inFrame(ctx, room, room.fronts && room.fronts[0], (f) => {
      if (ctx.mode === 'landmark') {
        // stage and video wall
        if (ctx.inL(f.w / 2, f.d - 6)) {
          gb.box(M.gloss, f.w / 2, 0, f.d - 7, 28, 1.6, 12, [0.05, 0.05, 0.06]);
          for (const sx of [-14, 14]) for (const sz of [-6, 6]) gb.box(M.metal, f.w / 2 + sx, 0, f.d - 7 + sz, 0.4, 11, 0.4, [0.2, 0.2, 0.22]);
          gb.box(M.metal, f.w / 2, 11, f.d - 7, 28.4, 0.6, 12.4, [0.2, 0.2, 0.22]);
          gb.box(M.screen, f.w / 2, 3, f.d - 1.2, 24, 8, 0.1, W);
          for (let i = 0; i < 10; i++) gb.box(M.light, f.w / 2 - 13 + i * 2.9, 10.6, f.d - 7, 0.4, 0.4, 0.6, hsl(i * 36, 1, 0.6));
        }
        return;
      }
      if (ctx.inL(f.w / 2, f.d - 7)) ctx.colL(f.w / 2 - 14, f.d - 13, f.w / 2 + 14, f.d - 1, 1.6);
      // floor seating and tiered stands along the side walls
      for (let z = 8; z < f.d - 16; z += 1.2) if (ctx.inL(f.w / 2, z)) P.cinemaSeats(gb, M, f.w / 2, z, Math.PI, 30, [0.15, 0.2, 0.5]);
      for (const sx of [3, f.w - 3]) for (let z = 6; z < f.d - 4; z += 6) {
        if (!ctx.inL(sx, z)) continue;
        for (let row = 0; row < 6; row++) gb.box(M.concrete, sx + (sx < f.w / 2 ? -1 : 1) * (row * 0.6 - 1.5), row * 0.5, z, 0.9, 0.5, 5.8, [0.7, 0.7, 0.72]);
        ctx.colL(sx - 2, z - 3, sx + 2, z + 3, 3);
      }
    });
  },
};
