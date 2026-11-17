// Builds the architectural shell of a chunk: floors, ceilings + lights, walls, storefronts,
// railings, entrances, skylights, escalators, stairs, elevators, fountains and signage.
import * as THREE from 'three';
import { CELL, LEVEL_H, SLAB, CEIL, CHUNK, E, TOP, levelY, li, LEVEL_NAMES } from './config.js';
import { GB, TPL } from './builder.js';
import { rngFor, RNG } from './rng.js';
import { drawSign } from './textures.js';
import * as C from './catalog.js';
import { buildLandmarks } from './decor.js';

const W1 = [1, 1, 1];
const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
export function hsl(h, s, l) {
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) ** 2.2, f(8) ** 2.2, f(4) ** 2.2];
}

export const THEME = {
  themepark: { wall: [0.55, 0.72, 0.92], mat: 'plaster' }, waterpark: { wall: [0.55, 0.85, 0.95], mat: 'tile' },
  skislope: { wall: [0.82, 0.9, 1.0], mat: 'plaster' }, garden: { wall: [0.62, 0.42, 0.36], mat: 'brick' },
  icerink: { wall: [0.85, 0.9, 0.96], mat: 'plaster' }, aquarium: { wall: [0.06, 0.14, 0.28], mat: 'paint' },
  museum: { wall: [0.82, 0.76, 0.66], mat: 'stone' }, arena: { wall: [0.13, 0.13, 0.16], mat: 'paint' },
  bowling: { wall: [0.13, 0.1, 0.24], mat: 'paint' }, cinema: { wall: [0.22, 0.05, 0.08], mat: 'fabric' },
  auditorium: { wall: [0.12, 0.04, 0.06], mat: 'fabric' }, foodcourt: { wall: [0.95, 0.88, 0.76], mat: 'stone' },
  arcade: { wall: [0.07, 0.05, 0.12], mat: 'paint' }, trampoline: { wall: [0.2, 0.45, 0.85], mat: 'paint' },
  minigolf: { wall: [0.05, 0.05, 0.12], mat: 'paint' }, gym: { wall: [0.25, 0.25, 0.28], mat: 'concrete' },
  supermarket: { wall: [0.95, 0.96, 0.92], mat: 'paint' }, kidszone: { wall: [0.98, 0.85, 0.4], mat: 'paint' },
  hotel: { wall: [0.6, 0.45, 0.32], mat: 'stone' }, casinoLounge: { wall: [0.18, 0.06, 0.2], mat: 'fabric' },
  department: { wall: [0.95, 0.94, 0.91], mat: 'paint' },
};
const DARK_VENUES = new Set(['bowling', 'cinema', 'auditorium', 'arcade', 'minigolf', 'aquarium', 'arena', 'casinoLounge']);

export function wallStyle(room, mall) {
  if (!room) return null;
  let mat = 'paint', col = W1, k = 0.78;
  switch (room.kind) {
    case 'concourse': mat = 'stone'; col = [0.95, 0.93, 0.9]; k = 0.85; break;
    case 'store': mat = 'paint'; col = room.wallColor || [0.9, 0.9, 0.9]; break;
    case 'restroom': mat = 'tile'; col = [0.82, 0.88, 0.92]; break;
    case 'service': mat = 'cinder'; col = [0.92, 0.9, 0.84]; k = 0.7; break;
    case 'back': mat = room.type === 'office' || room.type === 'security' || room.type === 'breakroom' ? 'paint' : 'cinder'; col = room.type === 'office' ? [0.85, 0.82, 0.75] : [0.88, 0.88, 0.86]; k = 0.7; break;
    case 'stair': mat = 'cinder'; col = [0.9, 0.88, 0.78]; break;
    case 'tunnel': mat = 'concrete'; col = [0.75, 0.75, 0.72]; k = 0.6; break;
    case 'garage': mat = 'concrete'; col = [0.85, 0.85, 0.83]; k = 0.7; break;
    case 'basement': mat = 'cinder'; col = [0.78, 0.78, 0.76]; k = 0.65; break;
    case 'anchor': mat = 'paint'; col = THEME.department.wall; break;
    default: { // venue / attraction / void
      const th = THEME[room.type] || { wall: [0.9, 0.9, 0.9], mat: 'paint' };
      mat = th.mat; col = th.wall;
    }
  }
  return { mat, col, k };
}
export function floorStyle(room) {
  const r = new RNG(room.seed);
  let mat = room.floor || 'concrete', col = W1;
  if (mat === 'carpet') {
    const dark = DARK_VENUES.has(room.type);
    col = dark ? hsl(r.range(220, 360), 0.5, 0.18) : hsl(r.range(0, 360), r.range(0.1, 0.35), r.range(0.35, 0.6));
  } else if (mat === 'wood') col = mul(W1, r.range(0.8, 1.1));
  else if (mat === 'concrete') col = room.kind === 'service' || room.kind === 'back' ? [0.8, 0.8, 0.78] : mul(W1, r.range(0.85, 1.05));
  else if (mat === 'tile' && room.kind === 'store') col = mul(W1, r.range(0.9, 1.0));
  else if (mat === 'rubber' && room.type === 'trampoline') col = [0.8, 0.85, 1];
  return { mat, col };
}
export function ceilStyle(room) {
  switch (room.kind) {
    case 'concourse': return { h: CEIL, mat: 'plaster', col: [0.98, 0.97, 0.95], lights: 'down' };
    case 'store': return { h: 4.6, mat: room.type === 'luxury' || room.type === 'jewelry' ? 'plaster' : 'ceilingTile', col: W1, lights: 'panel' };
    case 'restroom': return { h: 3.3, mat: 'ceilingTile', col: W1, lights: 'panel' };
    case 'service': return { h: 3.8, mat: 'concrete', col: [0.8, 0.8, 0.8], lights: 'tube' };
    case 'back': return room.type === 'office' || room.type === 'security' || room.type === 'breakroom' ? { h: 3.2, mat: 'ceilingTile', col: W1, lights: 'panel' } : { h: 4.4, mat: 'concrete', col: [0.75, 0.75, 0.75], lights: 'tube' };
    case 'stair': return { h: CEIL, mat: 'concrete', col: [0.8, 0.8, 0.8], lights: 'tube' };
    case 'tunnel': return { h: 3.4, mat: 'concrete', col: [0.6, 0.6, 0.6], lights: 'cage' };
    case 'garage': return { h: 3.5, mat: 'concrete', col: [0.8, 0.8, 0.8], lights: 'tube' };
    case 'basement': return { h: 4.2, mat: 'concrete', col: [0.7, 0.7, 0.7], lights: 'tube' };
    case 'anchor': return { h: CEIL, mat: 'ceilingTile', col: W1, lights: 'panel' };
    default: {
      const dark = DARK_VENUES.has(room.type);
      return { h: CEIL, mat: dark ? 'paint' : 'plaster', col: dark ? [0.08, 0.08, 0.1] : [0.95, 0.95, 0.95], lights: dark ? 'spot' : 'down' };
    }
  }
}

const T = 0.15; // half wall thickness
function styleAt(st, y) { const f = st.k + (1 - st.k) * Math.min(1, Math.max(0, y / 5)); return mul(st.col, f); }

// ---------------------------------------------------------------------------
export function buildStructure(S, l, ccx, ccz) {
  const { mall, mats } = S;
  const gb = new GB();
  const X0 = ccx * CHUNK, Z0 = ccz * CHUNK, X1 = Math.min(mall.W, X0 + CHUNK), Z1 = Math.min(mall.H, Z0 + CHUNK);
  const Y = levelY(l);
  const signs = [];
  const M = (k) => mats[k] || mats.paint;
  const wallTop = l === TOP ? CEIL : LEVEL_H;

  // ---- floors (run-merged per room)
  for (let z = Z0; z < Z1; z++) {
    let x = X0;
    while (x < X1) {
      const id = mall.roomId(l, x, z);
      if (id < 0 || mall.isVoid(l, x, z)) { x++; continue; }
      let x2 = x + 1;
      while (x2 < X1 && mall.roomId(l, x2, z) === id && !mall.isVoid(l, x2, z)) x2++;
      const fs = floorStyle(mall.rooms[id]);
      gb.floor(M(fs.mat), x * CELL, z * CELL, x2 * CELL, (z + 1) * CELL, Y, fs.col);
      x = x2;
    }
  }

  // ---- ceilings / roof / skylights
  for (let z = Z0; z < Z1; z++) for (let x = X0; x < X1; x++) {
    const room = mall.room(l, x, z);
    if (!room) continue;
    const wx = x * CELL, wz = z * CELL;
    const voidHere = mall.isVoid(l, x, z);
    if (l === TOP) {
      if (voidHere) {
        // raised skylight lantern
        const sy = Y + CEIL + 2.6;
        gb.floor(mats.sky, wx, wz, wx + CELL, wz + CELL, sy, W1, true, 1e9);
        const b = gb.bucket(mats.sky); const n = b.u.length;
        // world-based UV for sky
        for (let k = 0; k < 4; k++) { b.u[n - 8 + k * 2] = (b.p[b.p.length - 12 + k * 3]) / 60; b.u[n - 7 + k * 2] = (b.p[b.p.length - 12 + k * 3 + 2]) / 60; }
        gb.boxA(mats.metal, wx, sy - 0.25, wz - 0.06, wx + CELL, sy, wz + 0.06, [0.85, 0.85, 0.88]);
        gb.boxA(mats.metal, wx - 0.06, sy - 0.25, wz, wx + 0.06, sy, wz + CELL, [0.85, 0.85, 0.88]);
        gb.boxA(mats.metal, wx + 1.94, sy - 0.12, wz, wx + 2.06, sy, wz + CELL, [0.85, 0.85, 0.88]);
        gb.floor(mats.glass, wx, wz, wx + CELL, wz + CELL, sy + 0.05, [0.7, 0.85, 0.95]);
        // clerestory walls where void meets roof (inner + outer faces)
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (mall.isVoid(l, x + dx, z + dz) && mall.roomId(l, x + dx, z + dz) >= 0) continue;
          const st = [0.95, 0.95, 0.95], so = [0.8, 0.8, 0.78];
          if (dx === 1) { gb.wallX(mats.plaster, wz, wz + CELL, wx + CELL, Y + CEIL, sy, -1, st); gb.wallX(mats.stone, wz, wz + CELL, wx + CELL + 0.02, Y + LEVEL_H, sy + 0.1, 1, so); }
          if (dx === -1) { gb.wallX(mats.plaster, wz, wz + CELL, wx, Y + CEIL, sy, 1, st); gb.wallX(mats.stone, wz, wz + CELL, wx - 0.02, Y + LEVEL_H, sy + 0.1, -1, so); }
          if (dz === 1) { gb.wallZ(mats.plaster, wx, wx + CELL, wz + CELL, Y + CEIL, sy, -1, st); gb.wallZ(mats.stone, wx, wx + CELL, wz + CELL + 0.02, Y + LEVEL_H, sy + 0.1, 1, so); }
          if (dz === -1) { gb.wallZ(mats.plaster, wx, wx + CELL, wz, Y + CEIL, sy, 1, st); gb.wallZ(mats.stone, wx, wx + CELL, wz - 0.02, Y + LEVEL_H, sy + 0.1, -1, so); }
        }
        continue;
      }
    } else if (mall.isVoid(l + 1, x, z) && mall.roomId(l + 1, x, z) >= 0) continue;
    if (voidHere && l < TOP && mall.roomId(l + 1, x, z) < 0) continue;
    const cs = ceilStyle(room);
    const cy = Y + cs.h;
    if (l === TOP) {
      // roof membrane + occasional rooftop plant
      gb.floor(mats.concrete, wx, wz, wx + CELL, wz + CELL, Y + LEVEL_H, [0.78, 0.78, 0.76]);
      const h = (x * 73856093) ^ (z * 19349663);
      if ((h & 63) === 7) { gb.box(mats.metal, wx + 2, Y + LEVEL_H, wz + 2, 2.6, 1.6, 1.8, [0.75, 0.76, 0.74]); gb.box(mats.metal, wx + 2, Y + LEVEL_H + 1.6, wz + 2, 1.2, 0.3, 1.2, [0.4, 0.4, 0.42]); }
    }
    gb.floor(M(cs.mat), wx, wz, wx + CELL, wz + CELL, cy, cs.col, true);
    // light fixtures
    const lc = room.kind === 'garage' || room.kind === 'tunnel' ? [0.9, 0.95, 1] : [1, 0.96, 0.88];
    if (cs.lights === 'down') {
      for (const [ox, oz] of [[1, 1], [3, 1], [1, 3], [3, 3]]) gb.geo(mats.light, TPL.disc, wx + ox, cy - 0.01, wz + oz, 0.36, 1, 0.36, lc, Math.PI, 0, 0);
    } else if (cs.lights === 'panel') {
      gb.floor(mats.light, wx + 1.4, wz + 0.8, wx + 2.6, wz + 1.4, cy - 0.01, lc, true);
      gb.floor(mats.light, wx + 1.4, wz + 2.6, wx + 2.6, wz + 3.2, cy - 0.01, lc, true);
    } else if (cs.lights === 'tube') {
      if ((x + z) % 2 === 0) { gb.boxA(mats.metal, wx + 0.8, cy - 0.12, wz + 1.9, wx + 3.2, cy, wz + 2.1, [0.7, 0.7, 0.7]); gb.boxA(mats.light, wx + 0.85, cy - 0.16, wz + 1.93, wx + 3.15, cy - 0.12, wz + 2.07, lc); }
    } else if (cs.lights === 'cage') {
      gb.sphere(mats.light, wx + 2, cy - 0.25, wz + 2, 0.12, [1, 0.85, 0.6]);
      gb.boxA(mats.metal, wx + 1.85, cy - 0.12, wz + 1.85, wx + 2.15, cy, wz + 2.15, [0.4, 0.4, 0.4]);
    } else if (cs.lights === 'spot') {
      if ((x + z) % 2 === 0) gb.geo(mats.light, TPL.disc, wx + 2, cy - 0.01, wz + 2, 0.22, 1, 0.22, [1, 0.8, 0.6], Math.PI, 0, 0);
    }
  }

  // ---- walls on edges
  const ext = []; // exterior openings for outdoor scenery
  const edgeLocal = (orient, x, z, type) => {
    // returns A/B cells for local frame
    let ax, az, bx, bz;
    if (orient === 'h') { ax = x; az = z - 1; bx = x; bz = z; gb.push(x * CELL, Y, z * CELL, 0); }
    else { ax = x - 1; az = z; bx = x; bz = z; gb.push(x * CELL, Y, (z + 1) * CELL, Math.PI / 2); }
    const ra = mall.room(l, ax, az), rb = mall.room(l, bx, bz);
    drawEdge(type, ra, rb, mall.isVoid(l, ax, az), mall.isVoid(l, bx, bz), orient, x, z);
    gb.pop();
  };
  const faces = (x0, x1, y0, y1, A, B) => {
    if (A) gb.wallZ(M(A.mat), x0, x1, -T, y0, y1, -1, styleAt(A, y1), styleAt(A, y0));
    if (B) gb.wallZ(M(B.mat), x0, x1, T, y0, y1, 1, styleAt(B, y1), styleAt(B, y0));
  };
  const opening = (A, B, ox0, ox1, oh, top) => {
    faces(0, ox0, 0, top, A, B); faces(ox1, CELL, 0, top, A, B); faces(ox0, ox1, oh, top, A, B);
    const st = A || B;
    gb.wallX(M(st.mat), -T, T, ox0, 0, oh, 1, styleAt(st, oh), styleAt(st, 0));
    gb.wallX(M(st.mat), -T, T, ox1, 0, oh, -1, styleAt(st, oh), styleAt(st, 0));
    gb.floor(M(st.mat), ox0, -T, ox1, T, oh, styleAt(st, oh), true, 1);
  };
  const drawEdge = (type, ra, rb, va, vb, orient, ex, ez) => {
    const A = wallStyle(ra, mall), B = wallStyle(rb, mall);
    switch (type) {
      case E.WALL: faces(0, CELL, 0, wallTop, A, B); break;
      case E.EXTERIOR: {
        faces(0, CELL, 0, wallTop, A, B);
        if (l >= 0) {
          const fac = { mat: 'stone', col: [0.8, 0.78, 0.74], k: 0.8 };
          const top = l === TOP ? LEVEL_H + 1.0 : LEVEL_H;
          faces(0, CELL, 0, top, ra ? null : fac, rb ? null : fac);
          if (l === TOP) gb.boxA(mats.stone, 0, LEVEL_H + 1.0, -T, CELL, LEVEL_H + 1.15, T, [0.7, 0.7, 0.68]);
          if (l === 0) gb.boxA(mats.metal, 0, 6.6, ra ? T : -T - 0.6, CELL, 6.9, ra ? T + 0.6 : -T, [0.35, 0.36, 0.38]);
        }
        break;
      }
      case E.DOOR: {
        opening(A, B, 1.3, 2.7, 2.3, wallTop);
        const fc = [0.35, 0.36, 0.38];
        gb.boxA(mats.metal, 1.22, 0, -T - 0.03, 1.3, 2.38, T + 0.03, fc);
        gb.boxA(mats.metal, 2.7, 0, -T - 0.03, 2.78, 2.38, T + 0.03, fc);
        gb.boxA(mats.metal, 1.22, 2.3, -T - 0.03, 2.78, 2.38, T + 0.03, fc);
        // open door leaf swung into side B (or A if B missing)
        const sgn = rb ? 1 : -1;
        const leafCol = ra && rb && (ra.kind === 'concourse' || rb.kind === 'concourse') ? [0.55, 0.57, 0.6] : [0.5, 0.52, 0.55];
        gb.boxA(mats.plastic, 1.32, 0.02, sgn * T, 1.37, 2.26, sgn * (T + 1.3), leafCol);
        // little sign on concourse side
        if (ra && ra.kind === 'concourse' || rb && rb.kind === 'concourse') {
          const s = ra && ra.kind === 'concourse' ? -1 : 1;
          signs.push({ text: 'STAFF ONLY', sub: 'Service Corridor', bg: '#c9282d', fg: '#ffffff', font: 'Arial', style: 'plain', local: true, frame: gb.stack.length ? [gb.x, gb.y, gb.z, gb.rot] : null, x: 2.0, y: 2.65, z: s * (T + 0.02), w: 1.0, h: 0.32, n: s });
        }
        break;
      }
      case E.OPEN: opening(A, B, 0.4, 3.6, 3.6, wallTop); break;
      case E.STOREFRONT: case E.ENTRANCE: {
        const aConc = ra && ra.kind === 'concourse';
        const K = aConc ? A : B; // concourse-side style
        const st = aConc ? B : A;
        const sgnK = aConc ? -1 : 1; // concourse side direction
        const kk = K ? { mat: 'stone', col: [0.93, 0.91, 0.88], k: 1 } : null;
        const top = 4.0;
        faces(0, CELL, top, wallTop, aConc ? kk : A, aConc ? B : kk);
        gb.floor(mats.stone, 0, -T, CELL, T, top, [0.9, 0.9, 0.9], true, 1);
        gb.boxA(mats.metal, 0, top - 0.12, -0.06, CELL, top, 0.06, [0.25, 0.25, 0.27]);
        if (type === E.STOREFRONT) {
          gb.quad(mats.glass, [[0, 0.25, 0], [CELL, 0.25, 0], [CELL, top - 0.12, 0], [0, top - 0.12, 0]], [0, 0, 1], W1, [[0, 0], [1, 0], [1, 1], [0, 1]]);
          gb.boxA(mats.metal, 0, 0, -0.07, CELL, 0.25, 0.07, [0.2, 0.2, 0.22]);
          gb.boxA(mats.metal, CELL / 2 - 0.03, 0.25, -0.04, CELL / 2 + 0.03, top - 0.12, 0.04, [0.3, 0.3, 0.32]);
        } else {
          // rolled-up security grille housing (store side)
          gb.boxA(mats.metal, 0, top - 0.42, -sgnK * 0.05, CELL, top - 0.12, -sgnK * 0.32, [0.55, 0.56, 0.58]);
        }
        break;
      }
      case E.RAIL: {
        const floorB = !vb && rb; // which side has floor
        const s = floorB ? 1 : -1;
        gb.quad(mats.glass, [[0, 0.1, s * 0.12], [CELL, 0.1, s * 0.12], [CELL, 1.05, s * 0.12], [0, 1.05, s * 0.12]], [0, 0, 1], [0.9, 1, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
        gb.boxA(mats.metal, 0, 1.05, s * 0.12 - 0.04, CELL, 1.12, s * 0.12 + 0.04, [0.8, 0.8, 0.82]);
        gb.boxA(mats.metal, 0, 0, s * 0.12 - 0.05, CELL, 0.1, s * 0.12 + 0.05, [0.6, 0.6, 0.62]);
        if (l > -1) gb.boxA(mats.stone, 0, -SLAB - 0.75, 0, CELL, 0.0, s * 0.35, [0.96, 0.95, 0.93]);
        break;
      }
      case E.MAIN_ENTRANCE: case E.WINDOW: case E.GLASSWALL: {
        const inside = ra ? A : B;
        const sIn = ra ? -1 : 1;
        const g0 = type === E.WINDOW ? 0.9 : 0;
        const g1 = type === E.MAIN_ENTRANCE ? CEIL - 0.4 : CEIL - 0.6;
        if (type === E.WINDOW) faces(0, CELL, 0, g0, ra ? A : null, ra ? null : B);
        faces(0, CELL, g1, wallTop, ra ? A : null, ra ? null : B);
        {
          const fac = { mat: 'stone', col: [0.8, 0.78, 0.74], k: 0.8 };
          const top = l === TOP ? LEVEL_H + 1.0 : LEVEL_H;
          faces(0, CELL, g1, top, ra ? null : fac, ra ? fac : null);
          if (type === E.WINDOW) faces(0, CELL, 0, g0, ra ? null : fac, ra ? fac : null);
        }
        gb.quad(mats.glass, [[0, g0, 0], [CELL, g0, 0], [CELL, g1, 0], [0, g1, 0]], [0, 0, 1], [0.85, 1, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
        const mc = [0.22, 0.23, 0.25];
        for (const mx of [0.05, CELL / 2, CELL - 0.05]) gb.boxA(mats.metal, mx - 0.05, g0, -0.09, mx + 0.05, g1, 0.09, mc);
        for (const my of type === E.MAIN_ENTRANCE ? [2.6, 4.6] : [g0 + 0.05, 3.2]) gb.boxA(mats.metal, 0, my - 0.05, -0.09, CELL, my + 0.05, 0.09, mc);
        if (type === E.MAIN_ENTRANCE) {
          // door frames + push bars
          for (const dx of [0.25, 2.1]) {
            gb.boxA(mats.metal, dx, 0, -0.06, dx + 1.65, 0.12, 0.06, mc);
            gb.boxA(mats.chrome, dx + 0.2, 1.0, sIn * 0.1, dx + 1.45, 1.06, sIn * 0.14, [0.9, 0.9, 0.9]);
          }
          // entrance mat inside
          gb.boxA(mats.carpet, 0.2, 0, sIn * 0.3, CELL - 0.2, 0.02, sIn * 3.0, [0.2, 0.2, 0.22]);
          // canopy outside
          gb.boxA(mats.metal, -0.3, 4.4, -sIn * 0.2, CELL + 0.3, 4.6, -sIn * 3.5, [0.3, 0.3, 0.33]);
        }
        // outdoor scenery in world coords
        ext.push({ orient, ex, ez, outSign: -sIn });
        break;
      }
      default: break;
    }
  };
  for (let z = Z0; z < Z1; z++) for (let x = X0; x < X1 + (X1 === mall.W ? 1 : 0); x++) {
    const t = mall.edgeV(l, x, z);
    if (t !== E.NONE) edgeLocal('v', x, z, t);
  }
  for (let z = Z0; z < Z1 + (Z1 === mall.H ? 1 : 0); z++) for (let x = X0; x < X1; x++) {
    const t = mall.edgeH(l, x, z);
    if (t !== E.NONE) edgeLocal('h', x, z, t);
  }
  // ---- outdoor scenery beyond entrances/windows
  for (const o of ext) {
    const ground = [0.75, 0.72, 0.68];
    if (o.orient === 'h') {
      const zEdge = o.ez * CELL, dir = o.outSign; // +1 means outside is +z
      const far = dir > 0 ? mall.H * CELL + 45 : -45;
      const cx = (o.ex + 0.5) * CELL;
      const za = Math.min(zEdge, far), zb = Math.max(zEdge, far);
      gb.floor(mats.pavement, cx - 40, za, cx + 40, zb, -0.03, ground);
      gb.wallZ(mats.outdoor, cx - 60, cx + 60, far, -2, 40, -dir, W1);
      fixOutdoorUV(gb, mats, cx - 60, cx + 60);
    } else {
      const xEdge = o.ex * CELL, dir = o.outSign;
      const far = dir > 0 ? mall.W * CELL + 45 : -45;
      const cz = (o.ez + 0.5) * CELL;
      const xa = Math.min(xEdge, far), xb = Math.max(xEdge, far);
      gb.floor(mats.pavement, xa, cz - 40, xb, cz + 40, -0.03, ground);
      gb.wallX(mats.outdoor, cz - 60, cz + 60, far, -2, 40, -dir, W1);
      fixOutdoorUV(gb, mats, cz - 60, cz + 60);
    }
  }

  // ---- posts at wall junctions
  const solid = (t) => t !== E.NONE && t !== E.RAIL && t !== E.NORAIL && t !== E.ENTRANCE;
  for (let z = Z0; z < Z1; z++) for (let x = X0; x < X1; x++) {
    const es = [mall.edgeV(l, x, z), z > 0 ? mall.edgeV(l, x, z - 1) : 0, mall.edgeH(l, x, z), x > 0 ? mall.edgeH(l, x - 1, z) : 0];
    const n = es.filter(solid).length;
    if (!n) continue;
    const rooms = [mall.room(l, x, z), mall.room(l, x - 1, z), mall.room(l, x, z - 1), mall.room(l, x - 1, z - 1)];
    const concAdj = rooms.some((r) => r && r.kind === 'concourse');
    let st = concAdj ? { mat: 'stone', col: [0.9, 0.88, 0.85], k: 0.9 } : wallStyle(rooms.find((r) => r), mall);
    if (!st) continue;
    gb.box(M(st.mat), x * CELL, Y, z * CELL, 0.4, wallTop, 0.4, styleAt(st, wallTop), { grad: st.k, skip: ['b', 't'] });
  }

  // ---- escalators, stairs, elevators, fountains
  const inChunk = (wx, wz) => wx >= X0 * CELL && wx < X1 * CELL && wz >= Z0 * CELL && wz < Z1 * CELL;
  for (const e of mall.escalators) {
    if (e.level !== l) continue;
    const mid = e.t0 + e.dir * e.len / 2;
    const [mx, mz] = e.axis === 'z' ? [e.cc, mid] : [mid, e.cc];
    if (!inChunk(mx, mz)) continue;
    buildEscalator(gb, mats, e);
    // level marker signs at the bottom
    const sx = e.axis === 'z' ? e.cc + 2.25 : e.t0 - e.dir * 0.6, sz = e.axis === 'z' ? e.t0 - e.dir * 0.6 : e.cc + 2.25;
    signs.push({ text: `▲ ${LEVEL_NAMES[l + 1]}`, sub: '', bg: '#1d2b3a', fg: '#ffffff', font: 'Arial', style: 'plain', x: sx, y: Y + 2.6, z: sz, w: 1.6, h: 0.5, n: 0, axis: e.axis, dir: -e.dir, post: true });
  }
  for (const st of mall.stairs) {
    const r = st.rooms[l];
    if (!r || !inChunk((st.x0 + 1) * CELL, (st.z0 + 2.5) * CELL)) continue;
    buildStairs(gb, mats, st, l);
  }
  for (const ev of mall.elevators) {
    if (!inChunk(ev.x, ev.z) || l < 0) continue;
    buildElevator(gb, mats, ev, l, mall);
  }
  if (l === 0) for (const f of mall.fountains) if (inChunk(f.x, f.z)) buildFountain(gb, mats, f);

  // ---- store / venue signs
  for (const room of S.roomsByLevel[li(l)]) {
    for (const sg of room.signs) {
      const horiz = sg.side === 'N' || sg.side === 'S';
      const mid = (sg.a + sg.b) / 2;
      const wx = horiz ? mid * CELL : (sg.side === 'W' ? room.x0 : room.x1) * CELL;
      const wz = horiz ? (sg.side === 'N' ? room.z0 : room.z1) * CELL : mid * CELL;
      if (!inChunk(wx - (sg.side === 'E' ? 0.01 : 0), wz - (sg.side === 'S' ? 0.01 : 0))) continue;
      const span = (sg.b - sg.a) * CELL;
      const big = room.kind !== 'store' && room.kind !== 'restroom';
      const r = rngFor(room.seed, 'sign');
      const pal = r.pick(C.SIGN_PALETTES);
      let style = r.pick(['plain', 'plain', 'frame', 'band', 'glow']);
      let font = r.pick(C.SIGN_FONTS);
      let [bg, fg] = pal;
      let text = room.name, sub = '';
      if (room.kind === 'store') sub = C.STORE_CATS[room.type].label;
      if (room.kind === 'restroom') { text = 'RESTROOMS'; sub = 'Family · Accessible'; bg = '#24527a'; fg = '#ffffff'; font = 'Arial'; style = 'plain'; }
      if (room.kind === 'anchor') { sub = room.dept; style = 'plain'; bg = '#101010'; fg = '#f2e6c9'; font = 'Didot'; }
      if (room.kind === 'attraction' || room.kind === 'venue') { style = 'glow'; }
      if (room.type === 'luxury') { bg = '#0c0c0c'; fg = '#d9c38c'; font = r.pick(['Didot', 'Georgia', 'Palatino']); style = 'plain'; }
      const w = Math.min(span * (big ? 0.7 : 0.78), big ? 18 : 9.5);
      const h = big ? 1.5 : 0.95;
      const out = sg.side === 'N' ? [0, -1] : sg.side === 'S' ? [0, 1] : sg.side === 'W' ? [-1, 0] : [1, 0];
      signs.push({ text: big ? text.toUpperCase() : text, sub, bg, fg, font, style, x: wx + out[0] * (T + 0.08), y: Y + (big ? 5.25 : 4.85), z: wz + out[1] * (T + 0.08), w, h, nx: out[0], nz: out[1] });
    }
  }
  // ---- hanging lane signs
  if (l >= 0) for (const lane of [...mall.colLanes, ...mall.rowLanes]) {
    const isCol = lane.axis === 'z';
    const segs = [];
    if (isCol) for (let j = 0; j < mall.NBZ; j++) { if (mall.colSeg(lane.i, j)) segs.push([mall.blocks[0][j].z0, mall.blocks[0][j].z1]); }
    else for (let i = 0; i < mall.NBX; i++) { if (mall.rowSeg(i, lane.j)) segs.push([mall.blocks[i][0].x0, mall.blocks[i][0].x1]); }
    for (const [s0, s1] of segs) for (const [t, d] of [[s0 + 1, -1], [s1 - 1, 1]]) {
      const crossCell = lane.main && l > 0 ? (isCol ? lane.x0 : lane.z0) + 0.5 : (isCol ? lane.x0 : lane.z0) + lane.w / 2;
      const wx = isCol ? crossCell * CELL : t * CELL, wz = isCol ? t * CELL : crossCell * CELL;
      if (!inChunk(wx, wz)) continue;
      const blk = isCol ? mall.blocks[lane.i][0] : null;
      signs.push({ text: lane.name.toUpperCase(), sub: `Level ${l + 1}`, bg: '#16324f', fg: '#ffffff', font: 'Helvetica', style: 'band', x: wx, y: Y + 4.3, z: wz, w: 3.6, h: 0.7, hang: true, axis: isCol ? 'z' : 'x', ceil: Y + CEIL });
    }
  }

  buildLandmarks(S, l, ccx, ccz, gb);
  const group = new THREE.Group();
  buildSigns(gb, mats, signs, group);
  const verts = gb.build(group);
  group.userData.verts = verts;
  return group;
}

function fixOutdoorUV(gb, mats, a, b) {
  const bk = gb.bucket(mats.outdoor);
  const n = bk.u.length;
  // wall quads: u along, v up -> map to texture: u world/120, v from -2..40 => 0..1 with horizon around 0.4
  for (let k = 0; k < 4; k++) {
    const ui = n - 8 + k * 2;
    bk.u[ui] = bk.u[ui] / 120;
    bk.u[ui + 1] = (bk.u[ui + 1] + 2) / 42;
  }
}

// ---------------------------------------------------------------------------
function buildEscalator(gb, mats, e) {
  // local frame: origin at start edge, +z along travel, x across
  const ang = e.axis === 'z' ? (e.dir > 0 ? 0 : Math.PI) : (e.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  const [ox, oz] = e.axis === 'z' ? [e.cc, e.t0] : [e.t0, e.cc];
  gb.push(ox, e.y0, oz, ang);
  const L = e.len, Hh = e.y1 - e.y0;
  const slope = Math.atan2(Hh, L);
  const truss = [0.78, 0.79, 0.82];
  for (const cx of [-0.85, 0.85]) {
    // steps
    const n = 30;
    for (let i = 0; i < n; i++) {
      const z0 = (i / n) * L, z1 = ((i + 1) / n) * L;
      const y = Hh * (i / n) + 0.02;
      gb.boxA(mats.steps, cx - 0.5, y - 0.2, z0, cx + 0.5, y + Hh / n, z1, W1);
    }
    // landing plates
    gb.boxA(mats.metal, cx - 0.55, 0, -1.2, cx + 0.55, 0.03, 0, [0.7, 0.7, 0.72]);
    gb.boxA(mats.metal, cx - 0.55, Hh, L, cx + 0.55, Hh + 0.03, L + 1.2, [0.7, 0.7, 0.72]);
    // balustrades (glass) + handrails
    for (const sx of [cx - 0.62, cx + 0.62]) {
      gb.quad(mats.glass, [[sx, 0.15, -0.8], [sx, Hh + 0.15, L + 0.8], [sx, Hh + 1.0, L + 0.8], [sx, 1.0, -0.8]], [1, 0, 0], [0.9, 1, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
      gb.beam(mats.plastic, [sx, 1.02, -1.0], [sx, 1.02, 0], 0.09, 0.07, [0.05, 0.05, 0.05]);
      gb.beam(mats.plastic, [sx, 1.02, 0], [sx, Hh + 1.02, L], 0.09, 0.07, [0.05, 0.05, 0.05]);
      gb.beam(mats.plastic, [sx, Hh + 1.02, L], [sx, Hh + 1.02, L + 1.0], 0.09, 0.07, [0.05, 0.05, 0.05]);
      // newel ends
      gb.box(mats.metal, sx, 0, -1.0, 0.12, 1.0, 0.3, [0.6, 0.6, 0.62]);
      gb.box(mats.metal, sx, Hh, L + 1.0, 0.12, 1.0, 0.3, [0.6, 0.6, 0.62]);
    }
  }
  // truss body underneath (side skirts + underside)
  const tw = 1.75;
  for (const sx of [-tw, tw]) {
    gb.quad(mats.metal, [[sx, -0.9, 0], [sx, Hh - 0.9, L], [sx, Hh + 0.1, L], [sx, 0.1, 0]], [sx > 0 ? 1 : -1, 0, 0], truss, [[0, 0], [4, 0], [4, 1], [0, 1]]);
    gb.quad(mats.metal, [[sx, 0.1, 0], [sx, Hh + 0.1, L], [sx, Hh - 0.9, L], [sx, -0.9, 0]], [sx > 0 ? -1 : 1, 0, 0], truss, [[0, 0], [4, 0], [4, 1], [0, 1]]);
  }
  gb.quad(mats.metal, [[-tw, -0.9, 0], [tw, -0.9, 0], [tw, Hh - 0.9, L], [-tw, Hh - 0.9, L]], [0, -Math.cos(slope), Math.sin(slope)], truss, [[0, 0], [1, 0], [1, 4], [0, 4]]);
  gb.box(mats.metal, 0, 0, -0.05, 0.1, 1.0, 0.2, [0.3, 0.3, 0.32]);
  gb.pop();
}

function buildStairs(gb, mats, st, l) {
  const mod2 = (k) => ((k % 2) + 2) % 2;
  const Y = levelY(l);
  // flight from this level upward
  if (l < TOP) {
    const lane = mod2(l), dir = mod2(l) === 0 ? 1 : -1;
    const xx = (st.x0 + lane) * CELL;
    const tA = (st.z0 + 1) * CELL, L = 3 * CELL;
    const n = 36;
    for (let i = 0; i < n; i++) {
      const f = i / n;
      const z0 = dir > 0 ? tA + f * L : tA + L - (i + 1) / n * L;
      const z1 = z0 + L / n;
      const y1 = Y + (i + 1) / n * LEVEL_H;
      gb.boxA(mats.concrete, xx + 0.15, y1 - 0.45, z0, xx + CELL - 0.15, y1, z1, [0.8, 0.8, 0.78]);
      gb.boxA(mats.metal, xx + 0.15, y1 - 0.01, dir > 0 ? z0 : z1 - 0.05, xx + CELL - 0.15, y1 + 0.01, dir > 0 ? z0 + 0.05 : z1, [0.9, 0.75, 0.1]);
    }
    // handrail along outer wall
    const zs = dir > 0 ? tA : tA + L, ze = dir > 0 ? tA + L : tA;
    const hx = lane === 0 ? xx + 0.25 : xx + CELL - 0.25;
    gb.beam(mats.metal, [hx, Y + 0.95, zs], [hx, Y + LEVEL_H + 0.95, ze], 0.06, 0.06, [0.85, 0.65, 0.1]);
  }
  // divider wall
  const dx = (st.x0 + 1) * CELL;
  const top = l === TOP ? CEIL : LEVEL_H;
  const c = [0.85, 0.84, 0.76];
  gb.boxA(mats.cinder, dx - 0.12, Y, (st.z0 + 1) * CELL, dx + 0.12, Y + top, (st.z0 + 4) * CELL, c, { grad: 0.8 });
  // level number painted on the wall
}

function buildElevator(gb, mats, ev, l, mall) {
  const Y = levelY(l);
  const top = l === TOP ? CEIL : LEVEL_H;
  const h = 1.5;
  const fc = [0.2, 0.21, 0.23];
  // corner posts
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) gb.box(mats.metal, ev.x + sx * h, Y, ev.z + sz * h, 0.14, top, 0.14, fc);
  // glass sides
  for (const [ax, az, bx, bz, nx, nz] of [[-h, -h, h, -h, 0, -1], [h, -h, h, h, 1, 0], [h, h, -h, h, 0, 1], [-h, h, -h, -h, -1, 0]]) {
    gb.quad(mats.glass, [[ev.x + ax, Y, ev.z + az], [ev.x + bx, Y, ev.z + bz], [ev.x + bx, Y + top, ev.z + bz], [ev.x + ax, Y + top, ev.z + az]], [nx, 0, nz], [0.85, 1, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  }
  // floor band
  gb.boxA(mats.metal, ev.x - h, Y - 0.5, ev.z - h, ev.x + h, Y + 0.12, ev.z + h, fc);
  gb.boxA(mats.metal, ev.x - h, Y + top - 0.2, ev.z - h, ev.x + h, Y + top, ev.z + h, fc);
  // doors on lane-facing sides
  const alongZ = mall.colLanes.some((ln) => ev.cx >= ln.x0 && ev.cx < ln.x1);
  for (const s of [-1, 1]) {
    const [dx, dz] = alongZ ? [0, s * (h + 0.02)] : [s * (h + 0.02), 0];
    if (alongZ) gb.boxA(mats.chrome, ev.x - 0.6, Y + 0.12, ev.z + dz - 0.03, ev.x + 0.6, Y + 2.3, ev.z + dz + 0.03, [0.8, 0.8, 0.82]);
    else gb.boxA(mats.chrome, ev.x + dx - 0.03, Y + 0.12, ev.z - 0.6, ev.x + dx + 0.03, Y + 2.3, ev.z + 0.6, [0.8, 0.8, 0.82]);
    // call panel
    if (alongZ) gb.boxA(mats.light, ev.x + 0.75, Y + 1.1, ev.z + dz - 0.04, ev.x + 0.9, Y + 1.3, ev.z + dz + 0.04, [0.5, 1.2, 0.6]);
    else gb.boxA(mats.light, ev.x + dx - 0.04, Y + 1.1, ev.z + 0.75, ev.x + dx + 0.04, Y + 1.3, ev.z + 0.9, [0.5, 1.2, 0.6]);
  }
  // cab parked at a pseudo-random level
  const cabLevel = Math.floor((ev.cx * 7 + ev.cz * 13) % 3);
  if (cabLevel === l) {
    gb.boxA(mats.gloss, ev.x - 1.3, Y + 0.12, ev.z - 1.3, ev.x + 1.3, Y + 0.3, ev.z + 1.3, [0.15, 0.15, 0.17]);
    gb.boxA(mats.gloss, ev.x - 1.3, Y + 2.6, ev.z - 1.3, ev.x + 1.3, Y + 2.9, ev.z + 1.3, [0.15, 0.15, 0.17]);
    gb.boxA(mats.light, ev.x - 0.8, Y + 2.58, ev.z - 0.8, ev.x + 0.8, Y + 2.6, ev.z + 0.8, W1);
    gb.boxA(mats.chrome, ev.x - 1.3, Y + 0.95, ev.z - 1.3, ev.x - 1.25, Y + 1.0, ev.z + 1.3, [0.9, 0.9, 0.9]);
  }
  // cables
  gb.box(mats.metal, ev.x, Y, ev.z, 0.04, top, 0.04, [0.2, 0.2, 0.2]);
}

function buildFountain(gb, mats, f) {
  const stone = [0.92, 0.9, 0.86];
  gb.vcyl(mats.stone, f.x, 0, f.z, 4.6, 0.7, stone, TPL.cyl20);
  gb.geo(mats.water, TPL.disc, f.x, 0.62, f.z, 8.6, 1, 8.6, [0.8, 0.95, 1]);
  gb.vcyl(mats.stone, f.x, 0, f.z, 1.3, 1.4, stone, TPL.cyl20);
  gb.vcyl(mats.stone, f.x, 1.4, f.z, 2.0, 0.3, stone, TPL.cyl20);
  gb.geo(mats.water, TPL.disc, f.x, 1.72, f.z, 3.8, 1, 3.8, [0.8, 0.95, 1]);
  gb.vcyl(mats.stone, f.x, 1.7, f.z, 0.4, 1.4, stone);
  gb.vcyl(mats.stone, f.x, 3.1, f.z, 0.9, 0.2, stone);
  // water jets
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x0 = f.x + Math.cos(a) * 3.6, z0 = f.z + Math.sin(a) * 3.6;
    gb.cyl(mats.water, [x0, 0.6, z0], [f.x + Math.cos(a) * 2.4, 2.6, f.z + Math.sin(a) * 2.4], 0.05, [0.9, 1, 1]);
    gb.cyl(mats.water, [f.x + Math.cos(a) * 2.4, 2.6, f.z + Math.sin(a) * 2.4], [f.x + Math.cos(a) * 1.7, 1.75, f.z + Math.sin(a) * 1.7], 0.05, [0.9, 1, 1]);
  }
  gb.cyl(mats.water, [f.x, 3.3, f.z], [f.x, 6.0, f.z], 0.12, [0.9, 1, 1]);
  gb.sphere(mats.water, f.x, 6.0, f.z, 0.4, [0.9, 1, 1]);
}

// ---------------------------------------------------------------------------
// Sign atlas
function buildSigns(gb, mats, signs, group) {
  if (!signs.length) return;
  const AW = 1024, AH = 2048;
  let canvas = null, g = null, y = 0, mat = null;
  const flush = () => { };
  const newAtlas = () => {
    canvas = document.createElement('canvas'); canvas.width = AW; canvas.height = AH;
    g = canvas.getContext('2d'); y = 0;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.15, 1.15, 1.15) });
    mat.userData.owned = true; mat.name = 'sign';
  };
  newAtlas();
  const used = [mat];
  for (const s of signs) {
    const aspect = s.w / s.h;
    const sh = Math.max(48, Math.min(256, Math.round(AW / aspect)));
    if (y + sh > AH) { mat.map.needsUpdate = true; newAtlas(); used.push(mat); }
    drawSign(g, 0, y, AW, sh, s);
    const v0 = 1 - (y + sh) / AH, v1 = 1 - y / AH;
    y += sh + 2;
    const uv = [[0, v0], [1, v0], [1, v1], [0, v1]];
    const dk = [0.08, 0.08, 0.09];
    if (s.local) {
      // inside an edge frame (door signs)
      const [fx, fy, fz, fr] = s.frame;
      gb.push(0, 0, 0); gb.x = fx; gb.y = fy; gb.z = fz; gb.rot = fr; gb.c = Math.cos(fr); gb.s = Math.sin(fr);
      const zz = s.z;
      if (s.n > 0) gb.quad(mat, [[s.x - s.w / 2, s.y, zz], [s.x + s.w / 2, s.y, zz], [s.x + s.w / 2, s.y + s.h, zz], [s.x - s.w / 2, s.y + s.h, zz]], [0, 0, 1], W1, uv);
      else gb.quad(mat, [[s.x + s.w / 2, s.y, zz], [s.x - s.w / 2, s.y, zz], [s.x - s.w / 2, s.y + s.h, zz], [s.x + s.w / 2, s.y + s.h, zz]], [0, 0, -1], W1, uv);
      gb.pop();
      continue;
    }
    if (s.hang) {
      // double sided hanging sign perpendicular to lane axis
      const rot = s.axis === 'z' ? 0 : Math.PI / 2;
      gb.push(s.x, s.y, s.z, rot);
      gb.box(mats.metal, 0, -0.05, 0, s.w + 0.1, s.h + 0.1, 0.1, [0.15, 0.16, 0.18]);
      gb.quad(mat, [[-s.w / 2, -0.0, 0.06], [s.w / 2, 0, 0.06], [s.w / 2, s.h, 0.06], [-s.w / 2, s.h, 0.06]], [0, 0, 1], W1, uv);
      gb.quad(mat, [[s.w / 2, 0, -0.06], [-s.w / 2, 0, -0.06], [-s.w / 2, s.h, -0.06], [s.w / 2, s.h, -0.06]], [0, 0, -1], W1, uv);
      for (const rx of [-s.w / 2 + 0.2, s.w / 2 - 0.2]) gb.box(mats.metal, rx, s.h, 0, 0.03, s.ceil - s.y - s.h, 0.03, [0.3, 0.3, 0.3]);
      gb.pop();
      continue;
    }
    if (s.post) {
      // free-standing post sign facing along the axis
      const rot = s.axis === 'z' ? (s.dir > 0 ? 0 : Math.PI) : (s.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      gb.push(s.x, s.y, s.z, rot);
      gb.box(mats.metal, 0, -s.y + s.y - 2.6, 0, 0.08, 2.6, 0.08, [0.2, 0.2, 0.22]);
      gb.box(mats.metal, 0, 0, 0, s.w + 0.08, s.h + 0.08, 0.08, dk);
      gb.quad(mat, [[-s.w / 2, 0.04, 0.05], [s.w / 2, 0.04, 0.05], [s.w / 2, s.h + 0.04, 0.05], [-s.w / 2, s.h + 0.04, 0.05]], [0, 0, 1], W1, uv);
      gb.pop();
      continue;
    }
    // wall-mounted sign: face normal (nx,nz)
    const rot = s.nz === 1 ? 0 : s.nz === -1 ? Math.PI : s.nx === 1 ? Math.PI / 2 : -Math.PI / 2;
    gb.push(s.x, s.y - s.h / 2, s.z, rot);
    gb.box(mats.matte, 0, -0.06, -0.05, s.w + 0.16, s.h + 0.12, 0.16, dk);
    gb.quad(mat, [[-s.w / 2, 0, 0.035], [s.w / 2, 0, 0.035], [s.w / 2, s.h, 0.035], [-s.w / 2, s.h, 0.035]], [0, 0, 1], W1, uv);
    gb.pop();
  }
  mat.map.needsUpdate = true;
}
