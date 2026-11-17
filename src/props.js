// Prop library. Every function draws into the GB (geometry batcher) in its current local frame.
// Coordinates: x,z = footprint centre (local), y = base height (local, usually 0 = floor).
import * as THREE from 'three';
import { TPL } from './builder.js';
import { RNG } from './rng.js';

export const W = [1, 1, 1];
export const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
export function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) ** 2.2, f(8) ** 2.2, f(4) ** 2.2];
}
export const rcol = (r, s = [0.3, 0.8], l = [0.3, 0.7]) => hsl(r.range(0, 360), r.range(s[0], s[1]), r.range(l[0], l[1]));
const STEEL = [0.55, 0.57, 0.6], DARK = [0.08, 0.08, 0.09], CHROME = [0.9, 0.9, 0.92], WOOD = [0.55, 0.38, 0.24], WHITE = [0.92, 0.92, 0.9];

// run fn inside a rotated sub-frame
export function at(gb, x, y, z, rot, fn) { gb.push(x, y, z, rot); fn(); gb.pop(); }

export function shadow(gb, M, x, z, sx, sz, y = 0) { gb.shadow(x, z, y, sx, sz, M); }

// ---------------------------------------------------------------- generic furniture
export function bench(gb, M, x, z, rot, len = 2.2) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.wood, 0, 0.42, 0, len, 0.07, 0.5, [0.7, 0.5, 0.32]);
    gb.box(M.wood, 0, 0.5, -0.24, len, 0.4, 0.06, [0.7, 0.5, 0.32]);
    for (const sx of [-len / 2 + 0.15, len / 2 - 0.15]) gb.box(M.metal, sx, 0, 0, 0.08, 0.42, 0.46, DARK);
    shadow(gb, M, 0, 0, len + 0.5, 1.0);
  });
}
export function trashBin(gb, M, x, z) {
  gb.vcyl(M.metal, x, 0, z, 0.25, 0.85, [0.3, 0.32, 0.34]);
  gb.vcyl(M.metal, x, 0.85, z, 0.27, 0.06, [0.15, 0.15, 0.16]);
  shadow(gb, M, x, z, 0.9, 0.9);
}
export function tree(gb, M, x, z, h, r, y = 0, leaf = [0.25, 0.45, 0.18]) {
  gb.cyl(M.bark, [x, y, z], [x, y + h * 0.55, z], 0.08 + h * 0.012, [0.35, 0.25, 0.18]);
  const k = new RNG(Math.floor(x * 13 + z * 7));
  const blobs = 4 + Math.floor(h / 4);
  for (let i = 0; i < blobs; i++) {
    const a = k.range(0, 6.28), d = k.range(0, r * 0.5);
    const s = r * k.range(0.55, 0.85);
    gb.geo(M.foliage, TPL.ico, x + Math.cos(a) * d, y + h * k.range(0.55, 0.85), z + Math.sin(a) * d, s * 2, s * 1.6, s * 2, mul(leaf, k.range(0.8, 1.2)), 0, k.range(0, 6), 0);
  }
  shadow(gb, M, x, z, r * 2.2, r * 2.2, y);
}
export function palm(gb, M, x, z, h, y = 0) {
  const k = new RNG(Math.floor(x * 17 + z * 3));
  const lean = k.range(-0.6, 0.6), lz = k.range(-0.6, 0.6);
  const top = [x + lean, y + h, z + lz];
  gb.cyl(M.bark, [x, y, z], [(x + top[0]) / 2, y + h / 2, (z + top[2]) / 2], 0.17, [0.38, 0.3, 0.22]);
  gb.cyl(M.bark, [(x + top[0]) / 2, y + h / 2, (z + top[2]) / 2], top, 0.13, [0.4, 0.32, 0.23]);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + k.range(0, 0.3);
    const L = k.range(2.2, 3.2);
    const tip = [top[0] + Math.cos(a) * L, top[1] - k.range(0.6, 1.3), top[2] + Math.sin(a) * L];
    const mid = [(top[0] + tip[0]) / 2, top[1] + 0.35, (top[2] + tip[2]) / 2];
    gb.beam(M.foliage, top, mid, 0.7, 0.04, [0.28, 0.5, 0.18], TPL.box, 0);
    gb.beam(M.foliage, mid, tip, 0.5, 0.04, [0.3, 0.52, 0.2], TPL.box, 0);
  }
  shadow(gb, M, x, z, 4, 4, y);
}
export function planter(gb, M, x, z, w, d, kind, rng) {
  const c = [0.85, 0.83, 0.8];
  gb.box(M.stone, x, 0, z, w, 0.65, d, c);
  gb.box(M.grass, x, 0.6, z, w - 0.16, 0.06, d - 0.16, [0.4, 0.3, 0.2]);
  if (kind === 'tree') tree(gb, M, x, z, rng.range(4.5, 6), rng.range(1.2, 1.8), 0.6);
  else if (kind === 'palm') palm(gb, M, x, z, rng.range(5, 7), 0.6);
  else {
    for (let i = 0; i < 5; i++) gb.geo(M.foliage, TPL.ico, x + rng.range(-w / 3, w / 3), 0.85, z + rng.range(-d / 3, d / 3), rng.range(0.5, 0.9), rng.range(0.5, 0.8), rng.range(0.5, 0.9), [0.28, 0.48, 0.2]);
    for (let i = 0; i < 6; i++) gb.sphere(M.plastic, x + rng.range(-w / 2.5, w / 2.5), 0.9, z + rng.range(-d / 2.5, d / 2.5), 0.08, rcol(rng, [0.7, 0.9], [0.5, 0.65]));
  }
  shadow(gb, M, x, z, w + 0.6, d + 0.6);
}
export function kiosk(gb, M, x, z, rot, rng) {
  const col = rcol(rng, [0.4, 0.7], [0.35, 0.55]);
  at(gb, x, 0, z, rot, () => {
    gb.box(M.gloss, 0, 0, 0, 2.6, 1.05, 1.4, col);
    gb.box(M.stone, 0, 1.05, 0, 2.8, 0.06, 1.6, [0.9, 0.9, 0.9]);
    gb.box(M.glass, 0, 1.11, 0, 2.4, 0.35, 1.2, W);
    gb.box(M.products, 0, 1.12, 0, 2.2, 0.25, 1.0, W);
    for (const sx of [-1.3, 1.3]) for (const sz of [-0.7, 0.7]) gb.box(M.metal, sx, 1.1, sz, 0.06, 1.3, 0.06, STEEL);
    gb.box(M.gloss, 0, 2.4, 0, 3.0, 0.3, 1.8, col);
    gb.box(M.light, 0, 2.38, 0, 2.6, 0.02, 1.4, W);
    shadow(gb, M, 0, 0, 3.6, 2.4);
  });
}
export function column(gb, M, x, z, h, r = 0.45) {
  gb.vcyl(M.stone, x, 0, z, r, h, [0.93, 0.91, 0.88], TPL.cyl20);
  gb.vcyl(M.metal, x, 0, z, r + 0.05, 0.12, [0.4, 0.4, 0.42], TPL.cyl20);
}
export function directory(gb, M, x, z, rot) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.gloss, 0, 0, 0, 1.0, 2.1, 0.25, [0.12, 0.13, 0.15]);
    gb.box(M.screen, 0, 0.6, 0.13, 0.8, 1.3, 0.01, W);
    shadow(gb, M, 0, 0, 1.4, 0.8);
  });
}
export function banner(gb, M, x, y, z, rot, col, h = 3.2) {
  at(gb, x, y, z, rot, () => {
    gb.box(M.fabric, 0, -h, 0, 1.0, h, 0.03, col);
    gb.box(M.metal, 0, 0, 0, 1.2, 0.05, 0.05, STEEL);
  });
}

// ---------------------------------------------------------------- retail fixtures
export function clothingRack(gb, M, x, z, rot, len, rng) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.chrome, 0, 1.45, 0, len, 0.04, 0.04, CHROME);
    for (const sx of [-len / 2, len / 2]) { gb.box(M.chrome, sx, 0, 0, 0.04, 1.47, 0.04, CHROME); gb.box(M.chrome, sx, 0, 0, 0.05, 0.03, 0.6, CHROME); }
    const n = Math.floor(len / 0.09);
    const base = rcol(rng, [0.2, 0.7], [0.2, 0.7]);
    for (let i = 0; i < n; i++) {
      if (rng.chance(0.15)) continue;
      const c = rng.chance(0.6) ? mul(base, rng.range(0.7, 1.3)) : rcol(rng, [0.1, 0.7], [0.15, 0.8]);
      const h = rng.range(0.6, 1.0);
      gb.box(M.fabric, -len / 2 + 0.06 + i * 0.09, 1.42 - h, 0, 0.035, h, rng.range(0.42, 0.52), c);
    }
    shadow(gb, M, 0, 0, len + 0.4, 0.9);
  });
}
export function roundRack(gb, M, x, z, rng) {
  gb.vcyl(M.chrome, x, 0, z, 0.03, 1.3, CHROME);
  gb.geo(M.chrome, TPL.torus, x, 1.3, z, 1.6, 1.6, 1.6, CHROME, Math.PI / 2);
  const base = rcol(rng, [0.2, 0.7], [0.25, 0.7]);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    gb.geo(M.fabric, TPL.box, x + Math.cos(a) * 0.8, 0.95, z + Math.sin(a) * 0.8, 0.04, 0.7, 0.45, mul(base, rng.range(0.7, 1.3)), 0, -a, 0);
  }
  shadow(gb, M, x, z, 2.2, 2.2);
}
export function foldTable(gb, M, x, z, rot, rng) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.wood, 0, 0.75, 0, 1.8, 0.06, 0.9, [0.85, 0.75, 0.6]);
    for (const sx of [-0.8, 0.8]) gb.box(M.wood, sx, 0, 0, 0.08, 0.75, 0.8, [0.8, 0.7, 0.55]);
    for (let i = 0; i < 6; i++) {
      const c = rcol(rng, [0.1, 0.6], [0.2, 0.8]);
      const hgt = rng.int(3, 7) * 0.035;
      gb.box(M.fabric, -0.6 + (i % 3) * 0.6, 0.81, i < 3 ? -0.2 : 0.22, 0.42, hgt, 0.32, c);
    }
    shadow(gb, M, 0, 0, 2.3, 1.4);
  });
}
export function mannequin(gb, M, x, z, rot, col, base = 0) {
  at(gb, x, base, z, rot, () => {
    gb.vcyl(M.chrome, 0, 0, 0, 0.2, 0.03, CHROME);
    gb.vcyl(M.chrome, 0, 0, 0, 0.02, 0.9, CHROME);
    gb.geo(M.fabric, TPL.cyl, 0, 1.0, 0, 0.36, 0.4, 0.24, mul(col, 0.8));
    gb.geo(M.fabric, TPL.cyl, 0, 1.4, 0, 0.42, 0.5, 0.26, col);
    gb.geo(M.gloss, TPL.sphere, 0, 1.79, 0, 0.2, 0.25, 0.2, WHITE);
    gb.vcyl(M.gloss, 0, 1.62, 0, 0.05, 0.1, WHITE);
    shadow(gb, M, 0, 0, 0.7, 0.7);
  });
}
// shelving unit against a wall, front faces +z
export function wallShelf(gb, M, x, z, rot, len, h, mat, frameCol = [0.9, 0.9, 0.9]) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.plastic, 0, 0, -0.25, len, h, 0.05, frameCol);
    for (const sx of [-len / 2, len / 2]) gb.box(M.plastic, sx, 0, 0, 0.05, h, 0.5, frameCol);
    const n = Math.max(2, Math.round(h / 0.45));
    for (let i = 0; i < n; i++) {
      const y = 0.12 + i * ((h - 0.2) / n);
      gb.box(M.plastic, 0, y, 0, len, 0.03, 0.5, frameCol);
      if (mat) gb.box(mat, 0, y + 0.03, 0.02, len - 0.08, (h - 0.2) / n - 0.06, 0.4, W, { skip: ['b'] });
    }
  });
}
export function gondola(gb, M, x, z, rot, len, h, mat, col = [0.92, 0.92, 0.92]) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.plastic, 0, 0, 0, len, h, 0.08, col);
    gb.box(M.plastic, 0, 0, 0, len, 0.12, 1.1, mul(col, 0.6));
    const n = Math.max(2, Math.round(h / 0.42));
    for (let i = 0; i < n; i++) {
      const y = 0.12 + i * ((h - 0.15) / n);
      gb.box(M.plastic, 0, y, 0, len, 0.025, 1.1, col);
      gb.box(mat, 0, y + 0.025, 0.28, len - 0.05, (h - 0.15) / n - 0.05, 0.46, W, { skip: ['b'] });
      gb.box(mat, 0, y + 0.025, -0.28, len - 0.05, (h - 0.15) / n - 0.05, 0.46, W, { skip: ['b'] });
    }
    shadow(gb, M, 0, 0, len + 0.4, 1.6);
  });
}
export function counter(gb, M, x, z, rot, len, col = [0.25, 0.25, 0.27], top = [0.9, 0.9, 0.9]) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.gloss, 0, 0, 0, len, 1.0, 0.7, col);
    gb.box(M.stone, 0, 1.0, 0, len + 0.1, 0.05, 0.8, top);
    gb.box(M.plastic, len / 2 - 0.5, 1.05, 0, 0.35, 0.12, 0.3, DARK);
    gb.box(M.screen, len / 2 - 0.5, 1.17, 0.05, 0.3, 0.22, 0.03, W);
    gb.box(M.plastic, -len / 2 + 0.6, 1.05, 0.1, 0.25, 0.04, 0.2, [0.2, 0.2, 0.2]);
    shadow(gb, M, 0, 0, len + 0.6, 1.3);
  });
}
export function displayTable(gb, M, x, z, rot, w, d, kind, rng) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.wood, 0, 0.8, 0, w, 0.06, d, [0.85, 0.82, 0.78]);
    gb.box(M.plastic, 0, 0, 0, w - 0.2, 0.8, d - 0.2, [0.95, 0.95, 0.95]);
    const n = Math.floor(w / 0.5);
    for (let i = 0; i < n; i++) {
      const px = -w / 2 + 0.25 + i * (w - 0.3) / Math.max(1, n - 1) * ((n - 1) / n) + 0.1;
      for (const pz of [-d / 4, d / 4]) {
        if (kind === 'gadget') { gb.box(M.plastic, px, 0.86, pz, 0.32, 0.02, 0.22, DARK); gb.box(M.screen, px, 0.88, pz, 0.28, 0.005, 0.18, W); }
        else if (kind === 'laptop') { gb.box(M.metal, px, 0.86, pz, 0.36, 0.02, 0.25, [0.7, 0.7, 0.72]); at(gb, px, 0.88, pz - 0.12, 0, () => gb.geo(M.screen, TPL.box, 0, 0.12, -0.02, 0.36, 0.24, 0.01, W, -0.25)); }
        else if (kind === 'shoes') { gb.box(M.leather, px, 0.86, pz, 0.12, 0.1, 0.28, rcol(rng, [0.1, 0.6], [0.15, 0.6])); }
        else if (kind === 'books') { gb.box(M.books, px, 0.86, pz, 0.3, 0.08, 0.22, W); }
        else if (kind === 'gift') { gb.box(M.gloss, px, 0.86, pz, 0.22, 0.22, 0.22, rcol(rng, [0.6, 0.9], [0.4, 0.6])); }
        else if (kind === 'beauty') { gb.vcyl(M.gloss, px, 0.86, pz, 0.04, 0.16, rcol(rng, [0.4, 0.9], [0.3, 0.7])); gb.vcyl(M.gloss, px + 0.12, 0.86, pz, 0.05, 0.1, rcol(rng, [0.4, 0.9], [0.5, 0.8])); }
        else gb.box(M.fabric, px, 0.86, pz, 0.36, 0.12, 0.28, rcol(rng, [0.1, 0.6], [0.2, 0.8]));
      }
    }
    shadow(gb, M, 0, 0, w + 0.4, d + 0.4);
  });
}
export function glassCase(gb, M, x, z, rot, len, rng) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.gloss, 0, 0, 0, len, 0.85, 0.6, [0.12, 0.1, 0.12]);
    gb.box(M.light, 0, 0.85, 0, len - 0.1, 0.02, 0.5, [1.2, 1.1, 1]);
    for (let i = 0; i < len / 0.3; i++) gb.box(M.gold, -len / 2 + 0.15 + i * 0.3, 0.87, rng.range(-0.15, 0.15), 0.06, 0.03, 0.06, rng.chance(0.3) ? [0.8, 0.8, 0.85] : [1, 0.8, 0.4]);
    gb.box(M.glass, 0, 0.87, 0, len, 0.35, 0.6, W);
    shadow(gb, M, 0, 0, len + 0.4, 1.1);
  });
}
export function tvWall(gb, M, x, z, rot, len, h = 3) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.plastic, 0, 0, -0.1, len, h, 0.1, DARK);
    const n = Math.floor(len / 1.4);
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
      const px = -len / 2 + 0.7 + i * 1.4;
      gb.box(M.plastic, px, 0.9 + j * 0.95, 0, 1.3, 0.78, 0.05, DARK);
      gb.box(M.screen, px, 0.94 + j * 0.95, 0.03, 1.22, 0.7, 0.01, W);
    }
  });
}
export function fittingRooms(gb, M, x, z, rot, n) {
  at(gb, x, 0, z, rot, () => {
    for (let i = 0; i <= n; i++) gb.box(M.paint, -n * 0.65 + i * 1.3, 0, 0, 0.06, 2.3, 1.4, [0.92, 0.9, 0.86]);
    gb.box(M.paint, 0, 0, -0.7, n * 1.3, 2.3, 0.06, [0.92, 0.9, 0.86]);
    for (let i = 0; i < n; i++) gb.box(M.fabric, -n * 0.65 + 0.65 + i * 1.3, 0.25, 0.7, 1.1, 2.0, 0.04, [0.4, 0.25, 0.3]);
  });
}
export function sofa(gb, M, x, z, rot, col, len = 2.2) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.fabric, 0, 0.1, 0, len, 0.35, 0.9, col);
    gb.box(M.fabric, 0, 0.1, -0.35, len, 0.85, 0.22, mul(col, 0.9));
    for (const sx of [-len / 2 + 0.1, len / 2 - 0.1]) gb.box(M.fabric, sx, 0.1, 0, 0.22, 0.6, 0.9, mul(col, 0.85));
    gb.box(M.wood, 0, 0, 0, len - 0.1, 0.1, 0.8, DARK);
    shadow(gb, M, 0, 0, len + 0.5, 1.4);
  });
}
export function bed(gb, M, x, z, rot, col) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.wood, 0, 0, 0, 1.7, 0.35, 2.1, [0.45, 0.32, 0.22]);
    gb.box(M.fabric, 0, 0.35, 0.05, 1.6, 0.25, 2.0, WHITE);
    gb.box(M.fabric, 0, 0.6, 0.35, 1.62, 0.06, 1.4, col);
    gb.box(M.wood, 0, 0, -1.05, 1.8, 1.1, 0.1, [0.4, 0.28, 0.2]);
    for (const sx of [-0.45, 0.45]) gb.box(M.fabric, sx, 0.6, -0.75, 0.6, 0.15, 0.35, WHITE);
    shadow(gb, M, 0, 0, 2.3, 2.7);
  });
}
export function diningSet(gb, M, x, z, rng, round = true, chairs = 4, col, chairCol) {
  const tc = col || (rng.chance(0.5) ? [0.9, 0.9, 0.9] : [0.45, 0.32, 0.22]);
  if (round) { gb.vcyl(M.wood, x, 0.72, z, 0.45, 0.04, tc, TPL.cyl20); }
  else gb.box(M.wood, x, 0.72, z, 1.2, 0.04, 0.8, tc);
  gb.vcyl(M.metal, x, 0, z, 0.05, 0.72, DARK);
  gb.vcyl(M.metal, x, 0, z, 0.25, 0.03, DARK);
  const cc = chairCol || (rng.chance(0.5) ? DARK : rcol(rng, [0.3, 0.7], [0.3, 0.6]));
  for (let i = 0; i < chairs; i++) {
    const a = (i / chairs) * Math.PI * 2 + 0.4;
    const cx = x + Math.cos(a) * 0.75, cz = z + Math.sin(a) * 0.75;
    at(gb, cx, 0, cz, -a + Math.PI / 2, () => {
      gb.box(M.plastic, 0, 0.44, 0, 0.42, 0.05, 0.42, cc);
      gb.box(M.plastic, 0, 0.44, 0.19, 0.42, 0.45, 0.04, cc);
      for (const sx of [-0.18, 0.18]) for (const sz of [-0.18, 0.18]) gb.box(M.metal, sx, 0, sz, 0.03, 0.44, 0.03, DARK);
    });
  }
  shadow(gb, M, x, z, 2.2, 2.2);
}
export function bookcase(gb, M, x, z, rot, len, h = 2.2) {
  wallShelf(gb, M, x, z, rot, len, h, M.books, [0.4, 0.27, 0.17]);
}
export function guitarWall(gb, M, x, z, rot, len, rng) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.wood, 0, 0, -0.05, len, 3, 0.05, [0.35, 0.22, 0.15]);
    for (let i = 0; i < len / 0.5; i++) for (let j = 0; j < 2; j++) {
      const c = rcol(rng, [0.4, 0.9], [0.2, 0.6]);
      const gx = -len / 2 + 0.25 + i * 0.5, gy = 0.6 + j * 1.3;
      gb.geo(M.gloss, TPL.sphere, gx, gy, 0.05, 0.36, 0.45, 0.08, c);
      gb.box(M.wood, gx, gy + 0.2, 0.05, 0.05, 0.65, 0.03, [0.3, 0.2, 0.1]);
    }
  });
}
export function piano(gb, M, x, z, rot) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.gloss, 0, 0.6, 0, 1.5, 0.35, 1.8, DARK);
    for (const [px, pz] of [[-0.6, -0.7], [0.6, -0.7], [0, 0.7]]) gb.box(M.gloss, px, 0, pz, 0.1, 0.6, 0.1, DARK);
    gb.box(M.gloss, 0, 0.62, -0.95, 1.5, 0.1, 0.25, WHITE);
    shadow(gb, M, 0, 0, 2, 2.4);
  });
}
export function treadmill(gb, M, x, z, rot) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.rubber, 0, 0, 0, 0.8, 0.22, 1.9, DARK);
    for (const sx of [-0.38, 0.38]) gb.box(M.metal, sx, 0.2, -0.75, 0.05, 1.1, 0.05, STEEL);
    gb.box(M.plastic, 0, 1.25, -0.8, 0.8, 0.12, 0.3, DARK);
    gb.box(M.screen, 0, 1.36, -0.78, 0.4, 0.02, 0.2, W);
    shadow(gb, M, 0, 0, 1.2, 2.3);
  });
}
export function bike(gb, M, x, z, rot) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.metal, 0, 0, 0, 0.5, 0.06, 1.1, DARK);
    gb.beam(M.metal, [0, 0.05, 0.4], [0, 0.95, 0.15], 0.07, 0.07, STEEL);
    gb.beam(M.metal, [0, 0.05, -0.35], [0, 1.1, -0.3], 0.07, 0.07, STEEL);
    gb.box(M.leather, 0, 0.95, 0.15, 0.2, 0.06, 0.3, DARK);
    gb.box(M.metal, 0, 1.1, -0.3, 0.5, 0.04, 0.05, DARK);
    gb.geo(M.metal, TPL.cyl, 0, 0.4, -0.35, 0.5, 0.06, 0.5, [0.3, 0.3, 0.3], 0, 0, Math.PI / 2);
    shadow(gb, M, 0, 0, 0.9, 1.5);
  });
}
export function weightRack(gb, M, x, z, rot) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.metal, 0, 0, 0, 2.2, 0.08, 0.6, DARK);
    for (const sx of [-1, 1]) gb.box(M.metal, sx, 0, 0, 0.08, 1.0, 0.5, DARK);
    for (const y of [0.45, 0.85]) {
      gb.box(M.metal, 0, y, 0, 2.1, 0.04, 0.5, STEEL);
      for (let i = 0; i < 8; i++) gb.geo(M.rubber, TPL.cyl, -0.9 + i * 0.26, y + 0.12, 0, 0.18, 0.14, 0.18, DARK, 0, 0, Math.PI / 2);
    }
    shadow(gb, M, 0, 0, 2.6, 1.0);
  });
}
export function arcadeCab(gb, M, x, z, rot, rng) {
  const c = rcol(rng, [0.6, 0.95], [0.3, 0.55]);
  at(gb, x, 0, z, rot, () => {
    gb.box(M.gloss, 0, 0, 0, 0.75, 1.85, 0.8, c);
    gb.box(M.screen, 0, 1.15, 0.38, 0.6, 0.45, 0.03, W);
    gb.box(M.plastic, 0, 0.9, 0.45, 0.72, 0.12, 0.35, DARK);
    gb.box(M.neon, 0, 1.7, 0.4, 0.7, 0.18, 0.02, rcol(rng, [0.9, 1], [0.55, 0.7]));
    shadow(gb, M, 0, 0, 1.1, 1.3);
  });
}
export function clawMachine(gb, M, x, z, rng) {
  const c = rcol(rng, [0.6, 0.9], [0.45, 0.6]);
  gb.box(M.gloss, x, 0, z, 1.0, 0.9, 1.0, c);
  gb.box(M.glass, x, 0.9, z, 0.96, 1.0, 0.96, W);
  for (let i = 0; i < 10; i++) gb.sphere(M.fabric, x + rng.range(-0.35, 0.35), 0.98, z + rng.range(-0.35, 0.35), 0.1, rcol(rng, [0.5, 0.9], [0.5, 0.7]));
  gb.box(M.gloss, x, 1.9, z, 1.0, 0.3, 1.0, c);
  gb.box(M.neon, x, 1.95, z + 0.51, 0.8, 0.15, 0.01, [1, 0.9, 0.3]);
  shadow(gb, M, x, z, 1.4, 1.4);
}
export function car(gb, M, x, z, rot, col) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.gloss, 0, 0.3, 0, 1.8, 0.62, 4.4, col);
    gb.box(M.gloss, 0, 0.92, 0.15, 1.6, 0.5, 2.2, col);
    gb.box(M.glass, 0, 0.94, 0.15, 1.64, 0.44, 2.24, [0.3, 0.4, 0.5]);
    gb.box(M.plastic, 0, 0.94, 0.15, 1.55, 0.42, 2.1, [0.05, 0.06, 0.08]);
    for (const sx of [-0.85, 0.85]) for (const sz of [-1.4, 1.35]) gb.geo(M.rubber, TPL.cyl, sx, 0.33, sz, 0.66, 0.24, 0.66, DARK, 0, 0, Math.PI / 2);
    gb.box(M.light, 0, 0.6, 2.2, 1.5, 0.12, 0.02, [1.4, 1.4, 1.3]);
    gb.box(M.neon, 0, 0.65, -2.2, 1.5, 0.1, 0.02, [1.2, 0.1, 0.05]);
    shadow(gb, M, 0, 0, 2.4, 5.0);
  });
}
export function pallet(gb, M, x, z, rot, rng, h = 1.2) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.wood, 0, 0, 0, 1.2, 0.14, 1.0, [0.7, 0.58, 0.4]);
    const lay = Math.max(1, Math.round(h / 0.35));
    for (let i = 0; i < lay; i++) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
      if (rng.chance(0.1)) continue;
      gb.box(M.matte, -0.29 + a * 0.58, 0.14 + i * 0.36, -0.24 + b * 0.48, 0.56, 0.34, 0.46, mul([0.72, 0.56, 0.38], rng.range(0.85, 1.1)));
    }
  });
}
export function palletRack(gb, M, x, z, rot, len, rng, h = 4) {
  at(gb, x, 0, z, rot, () => {
    const bays = Math.max(1, Math.round(len / 2.7));
    for (let i = 0; i <= bays; i++) for (const sz of [-0.5, 0.5]) gb.box(M.metal, -len / 2 + (i * len) / bays, 0, sz, 0.08, h, 0.08, [0.15, 0.3, 0.65]);
    for (const y of [1.4, 2.8]) for (const sz of [-0.5, 0.5]) gb.box(M.metal, 0, y, sz, len, 0.12, 0.06, [0.95, 0.45, 0.1]);
    for (let i = 0; i < bays; i++) for (const y of [0, 1.52, 2.92]) for (const k of [-0.6, 0.6]) {
      if (rng.chance(0.22) || y + 1 > h) continue;
      at(gb, -len / 2 + ((i + 0.5) * len) / bays + k, y, 0, 0, () => pallet(gb, M, 0, 0, 0, rng, 0.95));
    }
    shadow(gb, M, 0, 0, len + 0.6, 1.8);
  });
}
export function boxStack(gb, M, x, z, rng, n = 4) {
  for (let i = 0; i < n; i++) {
    const s = rng.range(0.35, 0.7);
    gb.geo(M.matte, TPL.box, x + rng.range(-0.4, 0.4), s / 2 + (i > 2 ? 0.5 : 0), z + rng.range(-0.4, 0.4), s, s * rng.range(0.6, 1), s * rng.range(0.7, 1.1), mul([0.72, 0.56, 0.38], rng.range(0.85, 1.1)), 0, rng.range(0, 1.5), 0);
  }
  shadow(gb, M, x, z, 1.6, 1.6);
}
export function tank(gb, M, x, z, r, h, col = [0.7, 0.72, 0.75]) {
  gb.vcyl(M.metal, x, 0.3, z, r, h, col, TPL.cyl20);
  gb.geo(M.metal, TPL.hemi, x, 0.3 + h, z, r * 2, r * 1.2, r * 2, col);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) gb.box(M.metal, x + sx * r * 0.6, 0, z + sz * r * 0.6, 0.12, 0.35, 0.12, DARK);
  gb.cyl(M.metal, [x + r, 0.3 + h * 0.7, z], [x + r + 0.6, 0.3 + h * 0.7, z], 0.1, [0.6, 0.3, 0.2]);
  shadow(gb, M, x, z, r * 2.6, r * 2.6);
}
export function hvac(gb, M, x, z, rot) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.metal, 0, 0, 0, 2.6, 1.8, 1.4, [0.75, 0.76, 0.74]);
    gb.box(M.dark, 0, 0.3, 0.71, 2.2, 1.0, 0.01, W);
    for (let i = 0; i < 8; i++) gb.box(M.metal, -1.0 + i * 0.28, 0.3, 0.72, 0.03, 1.0, 0.02, [0.5, 0.5, 0.5]);
    gb.box(M.metal, 0, 1.8, 0, 1.0, 1.4, 1.0, [0.7, 0.71, 0.69]);
    shadow(gb, M, 0, 0, 3.0, 1.9);
  });
}
export function panels(gb, M, x, z, rot, n) {
  at(gb, x, 0, z, rot, () => {
    for (let i = 0; i < n; i++) {
      gb.box(M.metal, -n * 0.45 + 0.45 + i * 0.9, 0, 0, 0.85, 2.1, 0.45, [0.6, 0.62, 0.6]);
      gb.box(M.plastic, -n * 0.45 + 0.45 + i * 0.9, 1.2, 0.23, 0.3, 0.2, 0.01, [0.9, 0.9, 0.85]);
      gb.box(M.neon, -n * 0.45 + 0.3 + i * 0.9, 1.8, 0.23, 0.04, 0.04, 0.01, i % 3 ? [0.2, 1.4, 0.3] : [1.4, 0.3, 0.2]);
    }
  });
}
export function serverRack(gb, M, x, z, rot) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.gloss, 0, 0, 0, 0.6, 2.1, 1.0, [0.06, 0.06, 0.07]);
    for (let i = 0; i < 14; i++) gb.box(M.neon, -0.2 + (i % 3) * 0.08, 0.2 + i * 0.13, 0.51, 0.03, 0.02, 0.01, i % 4 ? [0.2, 1.5, 0.4] : [0.3, 0.6, 1.5]);
  });
}
export function desk(gb, M, x, z, rot, monitors = 1) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.wood, 0, 0.74, 0, 1.6, 0.04, 0.75, [0.75, 0.68, 0.58]);
    for (const sx of [-0.75, 0.75]) gb.box(M.metal, sx, 0, 0, 0.05, 0.74, 0.7, DARK);
    for (let i = 0; i < monitors; i++) {
      const mx = (i - (monitors - 1) / 2) * 0.55;
      gb.box(M.plastic, mx, 0.78, -0.2, 0.52, 0.34, 0.04, DARK);
      gb.box(M.screen, mx, 0.8, -0.175, 0.48, 0.3, 0.01, W);
      gb.box(M.plastic, mx, 0.78, -0.2, 0.05, 0.1, 0.1, DARK);
    }
    gb.box(M.plastic, 0, 0.45, 0.55, 0.5, 0.06, 0.5, DARK);
    gb.box(M.plastic, 0, 0.5, 0.78, 0.5, 0.55, 0.06, DARK);
    shadow(gb, M, 0, 0.2, 2, 1.6);
  });
}
export function vending(gb, M, x, z, rot, rng) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.gloss, 0, 0, 0, 0.95, 1.9, 0.8, rcol(rng, [0.6, 0.9], [0.3, 0.5]));
    gb.box(M.products, -0.1, 0.5, 0.41, 0.6, 1.2, 0.01, W);
    gb.box(M.light, 0.35, 1.2, 0.41, 0.15, 0.3, 0.01, W);
    shadow(gb, M, 0, 0, 1.2, 1.1);
  });
}
export function lockers(gb, M, x, z, rot, n) {
  at(gb, x, 0, z, rot, () => {
    for (let i = 0; i < n; i++) {
      gb.box(M.metal, -n * 0.2 + 0.2 + i * 0.4, 0, 0, 0.38, 1.9, 0.5, [0.35, 0.45, 0.6]);
      gb.box(M.dark, -n * 0.2 + 0.2 + i * 0.4, 1.6, 0.251, 0.2, 0.03, 0.01, W);
    }
  });
}
export function pipe(gb, M, a, b, r, col = [0.55, 0.56, 0.58]) { gb.cyl(M.metal, a, b, r, col); }
export function cart(gb, M, x, z, rot) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.metal, 0, 0.3, 0, 0.6, 0.55, 0.95, [0.6, 0.62, 0.64]);
    gb.box(M.metal, 0, 0.85, 0.45, 0.55, 0.04, 0.05, STEEL);
    for (const sx of [-0.25, 0.25]) for (const sz of [-0.4, 0.4]) gb.vcyl(M.rubber, sx, 0, sz, 0.06, 0.12, DARK);
  });
}
export function stall(gb, M, x, z, rot, w, col, rng) {
  // food-court / theme-park style stall with menu board and awning
  at(gb, x, 0, z, rot, () => {
    gb.box(M.gloss, 0, 0, 0, w, 1.05, 0.8, col);
    gb.box(M.stone, 0, 1.05, 0, w + 0.1, 0.06, 0.9, [0.9, 0.9, 0.9]);
    gb.box(M.paint, 0, 0, -2.0, w, 3.2, 0.1, mul(col, 0.6));
    gb.box(M.light, 0, 2.2, -1.94, w - 0.6, 0.8, 0.02, [1.1, 1.05, 0.9]);
    gb.box(M.screen, 0, 2.25, -1.92, w - 0.8, 0.7, 0.01, W);
    gb.box(M.metal, 0, 0.9, -1.4, w - 0.2, 0.9, 0.6, CHROME);
    for (let i = 0; i < Math.floor(w); i++) gb.box(M.fabric, -w / 2 + 0.5 + i, 2.9, 0.1, 0.98, 0.08, 1.5, i % 2 ? WHITE : col);
    shadow(gb, M, 0, -0.6, w + 0.4, 2.2);
  });
}

// ---------------------------------------------------------------- entertainment
export function bowlingLane(gb, M, x, z, len, rng) {
  // lane along +z from z (foul line) to z+len, centred at x
  gb.box(M.lane, x, 0, z + len / 2, 1.06, 0.06, len, [1, 0.95, 0.85]);
  for (const sx of [-0.65, 0.65]) gb.box(M.metal, x + sx, 0, z + len / 2, 0.24, 0.03, len, [0.3, 0.3, 0.32]);
  gb.box(M.neon, x, 0.061, z + 4.5, 0.6, 0.003, 0.05, [0.2, 0.5, 1.4]);
  // pins
  let k = 0;
  for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) {
    const px = x + (i - row / 2) * 0.3, pz = z + len - 1.2 + row * 0.26;
    if (rng.chance(0.08)) continue;
    gb.geo(M.gloss, TPL.cyl, px, 0.25, pz, 0.12, 0.38, 0.12, WHITE);
    gb.sphere(M.gloss, px, 0.46, pz, 0.05, WHITE);
    gb.box(M.neon, px, 0.36, pz, 0.125, 0.03, 0.125, [1.3, 0.1, 0.1]);
    k++;
  }
  // pinsetter hood
  gb.box(M.gloss, x, 1.0, z + len - 1.6, 1.8, 1.4, 0.4, [0.08, 0.06, 0.2]);
  gb.box(M.neon, x, 1.6, z + len - 1.39, 1.5, 0.12, 0.01, rcol(rng, [0.9, 1], [0.55, 0.65]));
}
export function cinemaSeats(gb, M, x, z, rot, n, col) {
  at(gb, x, 0, z, rot, () => {
    for (let i = 0; i < n; i++) {
      const sx = -n * 0.3 + 0.3 + i * 0.6;
      gb.box(M.fabric, sx, 0.25, 0, 0.55, 0.22, 0.55, col);
      gb.box(M.fabric, sx, 0.4, 0.25, 0.55, 0.75, 0.12, col);
      gb.box(M.plastic, sx - 0.29, 0.25, 0.05, 0.05, 0.45, 0.5, DARK);
    }
  });
}
export function trampoline(gb, M, x, z, s) {
  gb.box(M.rubber, x, 0, z, s, 0.35, s, [0.1, 0.1, 0.12]);
  gb.box(M.fabric, x, 0.35, z, s, 0.06, 0.4, [0.1, 0.4, 0.9]);
  gb.box(M.fabric, x, 0.35, z + s / 2 - 0.2, s, 0.06, 0.4, [0.1, 0.4, 0.9]);
  gb.box(M.fabric, x - s / 2 + 0.2, 0.35, z, 0.4, 0.06, s, [0.1, 0.4, 0.9]);
  gb.box(M.fabric, x + s / 2 - 0.2, 0.35, z, 0.4, 0.06, s, [0.1, 0.4, 0.9]);
}

// ---------------------------------------------------------------- theme park rides
export function ferrisWheel(gb, M, x, z, rot, R, rng) {
  at(gb, x, 0, z, rot, () => {
    const hub = R + 2.2;
    const spokes = 16;
    const col = [0.92, 0.92, 0.95];
    for (const sx of [-0.9, 0.9]) {
      // rims
      for (let i = 0; i < 48; i++) {
        const a0 = (i / 48) * Math.PI * 2, a1 = ((i + 1) / 48) * Math.PI * 2;
        gb.beam(M.metal, [sx, hub + Math.sin(a0) * R, Math.cos(a0) * R], [sx, hub + Math.sin(a1) * R, Math.cos(a1) * R], 0.18, 0.18, col);
        if (i % 3 === 0) gb.sphere(M.light, sx * 1.1, hub + Math.sin(a0) * R, Math.cos(a0) * R, 0.09, i % 2 ? [1.4, 1.1, 0.5] : [0.6, 1.0, 1.5]);
      }
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        gb.beam(M.metal, [sx, hub, 0], [sx, hub + Math.sin(a) * R, Math.cos(a) * R], 0.08, 0.08, col);
      }
      // A-frame legs
      gb.beam(M.metal, [sx * 2.2, 0, -R * 0.45], [sx, hub, 0], 0.4, 0.4, [0.85, 0.2, 0.2]);
      gb.beam(M.metal, [sx * 2.2, 0, R * 0.45], [sx, hub, 0], 0.4, 0.4, [0.85, 0.2, 0.2]);
    }
    gb.geo(M.metal, TPL.cyl, 0, hub, 0, 0.6, 2.6, 0.6, [0.4, 0.4, 0.42], 0, 0, Math.PI / 2);
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      const gy = hub + Math.sin(a) * R, gz = Math.cos(a) * R;
      const c = hsl((i * 360) / spokes, 0.75, 0.55);
      gb.beam(M.metal, [0, gy, gz], [0, gy - 0.9, gz], 0.05, 0.05, DARK);
      gb.box(M.gloss, 0, gy - 2.1, gz, 1.5, 1.3, 1.4, c);
      gb.box(M.glass, 0, gy - 1.6, gz, 1.52, 0.6, 1.42, W);
      gb.geo(M.gloss, TPL.cone, 0, gy - 0.7, gz, 1.7, 0.4, 1.6, c);
    }
    gb.box(M.stone, 0, 0, 0, 7, 0.4, R + 2, [0.8, 0.78, 0.75]);
    shadow(gb, M, 0, 0, 9, R * 2);
  });
}
export function carousel(gb, M, x, z, R, rng) {
  gb.vcyl(M.wood, x, 0, z, R, 0.45, [0.85, 0.75, 0.55], TPL.cyl20);
  gb.vcyl(M.gold, x, 0.45, z, 0.5, 4.2, [1, 0.85, 0.5], TPL.cyl20);
  gb.vcyl(M.gloss, x, 4.4, z, R + 0.3, 0.5, [0.9, 0.2, 0.25], TPL.cyl20);
  gb.geo(M.gloss, TPL.cone, x, 5.65, z, (R + 0.5) * 2, 2.0, (R + 0.5) * 2, [0.98, 0.95, 0.9]);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    gb.sphere(M.light, x + Math.cos(a) * (R + 0.32), 4.6, z + Math.sin(a) * (R + 0.32), 0.07, [1.5, 1.3, 0.7]);
  }
  for (let ring = 0; ring < 2; ring++) {
    const rr = R * (ring ? 0.55 : 0.82), n = ring ? 8 : 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.2;
      const hx = x + Math.cos(a) * rr, hz = z + Math.sin(a) * rr;
      gb.vcyl(M.gold, hx, 0.45, hz, 0.035, 3.95, [1, 0.85, 0.5]);
      at(gb, hx, 1.2 + (i % 2) * 0.3, hz, -a, () => {
        const c = i % 3 === 0 ? WHITE : i % 3 === 1 ? [0.45, 0.3, 0.2] : [0.15, 0.15, 0.15];
        gb.box(M.gloss, 0, 0, 0, 0.32, 0.45, 1.1, c);
        gb.box(M.gloss, 0, 0.3, 0.55, 0.25, 0.5, 0.3, c);
        for (const [lx, lz] of [[-0.1, -0.4], [0.1, -0.4], [-0.1, 0.4], [0.1, 0.4]]) gb.box(M.gloss, lx, -0.5, lz, 0.07, 0.5, 0.07, c);
        gb.box(M.leather, 0, 0.45, 0, 0.34, 0.06, 0.4, [0.8, 0.1, 0.15]);
      });
    }
  }
  shadow(gb, M, x, z, R * 2.4, R * 2.4);
}
export function dropTower(gb, M, x, z, h) {
  gb.vcyl(M.metal, x, 0, z, 1.0, h, [0.85, 0.85, 0.9], TPL.cyl20);
  for (let y = 4; y < h; y += 4) gb.vcyl(M.metal, x, y, z, 1.1, 0.2, [0.9, 0.2, 0.2], TPL.cyl20);
  gb.vcyl(M.gloss, x, h, z, 1.6, 1.5, [0.9, 0.25, 0.2], TPL.cyl20);
  gb.vcyl(M.gloss, x, h * 0.55, z, 2.4, 1.2, [0.15, 0.2, 0.6], TPL.cyl20);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; gb.box(M.plastic, x + Math.cos(a) * 2.2, h * 0.55 - 0.9, z + Math.sin(a) * 2.2, 0.5, 0.9, 0.5, [0.95, 0.85, 0.2]); }
  gb.vcyl(M.stone, x, 0, z, 3.5, 0.5, [0.8, 0.8, 0.8], TPL.cyl20);
  shadow(gb, M, x, z, 8, 8);
}
export function swingRide(gb, M, x, z, rng) {
  gb.vcyl(M.metal, x, 0, z, 0.7, 12, [0.9, 0.85, 0.3], TPL.cyl20);
  gb.geo(M.gloss, TPL.cone, x, 12.8, z, 9, 1.8, 9, [0.2, 0.5, 0.9]);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const tx = x + Math.cos(a) * 4.2, tz = z + Math.sin(a) * 4.2;
    const sx = x + Math.cos(a) * 6.5, sz = z + Math.sin(a) * 6.5;
    gb.beam(M.metal, [tx, 12, tz], [sx, 5.5, sz], 0.03, 0.03, DARK);
    gb.box(M.plastic, sx, 5.0, sz, 0.5, 0.5, 0.5, hsl(i * 22, 0.8, 0.55));
  }
  shadow(gb, M, x, z, 12, 12);
}
export function teacups(gb, M, x, z, rng) {
  gb.vcyl(M.gloss, x, 0, z, 8, 0.3, [0.95, 0.85, 0.9], TPL.cyl20);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const cx = x + Math.cos(a) * 5, cz = z + Math.sin(a) * 5;
    const c = hsl(i * 60, 0.7, 0.6);
    gb.geo(M.gloss, TPL.hemi, cx, 1.4, cz, 2.4, 1.2, 2.4, c, Math.PI);
    gb.geo(M.gloss, TPL.torus, cx, 1.4, cz, 2.4, 2.4, 2.4, mul(c, 0.8), Math.PI / 2);
  }
  gb.geo(M.gloss, TPL.hemi, x, 0.3, z, 3, 3, 3, [0.9, 0.4, 0.6]);
}
export function bumperCars(gb, M, x, z, w, d, rng) {
  gb.box(M.metal, x, 0, z, w, 0.15, d, [0.25, 0.25, 0.28]);
  gb.box(M.gloss, x, 0, z - d / 2, w, 0.6, 0.2, [0.9, 0.8, 0.1]);
  gb.box(M.gloss, x, 0, z + d / 2, w, 0.6, 0.2, [0.9, 0.8, 0.1]);
  gb.box(M.gloss, x - w / 2, 0, z, 0.2, 0.6, d, [0.9, 0.8, 0.1]);
  gb.box(M.gloss, x + w / 2, 0, z, 0.2, 0.6, d, [0.9, 0.8, 0.1]);
  for (const sx of [-w / 2, w / 2]) for (const sz of [-d / 2, d / 2]) gb.box(M.metal, x + sx, 0, z + sz, 0.2, 4.5, 0.2, [0.8, 0.1, 0.1]);
  gb.box(M.metal, x, 4.5, z, w, 0.1, d, [0.2, 0.2, 0.22]);
  for (let i = 0; i < 12; i++) {
    const cx = x + rng.range(-w / 2 + 1.2, w / 2 - 1.2), cz = z + rng.range(-d / 2 + 1.2, d / 2 - 1.2);
    at(gb, cx, 0.15, cz, rng.range(0, 6.28), () => {
      gb.box(M.rubber, 0, 0, 0, 1.4, 0.3, 2.0, DARK);
      gb.box(M.gloss, 0, 0.3, 0, 1.2, 0.4, 1.7, hsl(rng.range(0, 360), 0.85, 0.5));
      gb.beam(M.metal, [0, 0.7, -0.6], [0, 4.3, -0.6], 0.03, 0.03, DARK);
    });
  }
}
export function coaster(gb, M, pts, col, supportCol) {
  // pts: array of [x,y,z] closed loop (already smoothed)
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz) || 1;
    const nx = -dz / L * 0.55, nz = dx / L * 0.55;
    gb.cyl(M.metal, [a[0] + nx, a[1], a[2] + nz], [b[0] + nx, b[1], b[2] + nz], 0.08, col);
    gb.cyl(M.metal, [a[0] - nx, a[1], a[2] - nz], [b[0] - nx, b[1], b[2] - nz], 0.08, col);
    gb.cyl(M.metal, [a[0], a[1] - 0.45, a[2]], [b[0], b[1] - 0.45, b[2]], 0.16, col);
    if (i % 2 === 0) gb.beam(M.metal, [a[0] + nx, a[1] - 0.05, a[2] + nz], [a[0] - nx, a[1] - 0.05, a[2] - nz], 0.08, 0.12, DARK);
    if (i % 5 === 0 && a[1] > 1.2) {
      gb.cyl(M.metal, [a[0], 0, a[2]], [a[0], a[1] - 0.5, a[2]], 0.22, supportCol);
      gb.vcyl(M.stone, a[0], 0, a[2], 0.5, 0.3, [0.75, 0.75, 0.75]);
    }
  }
  // a train
  for (let c = 0; c < 6; c++) {
    const i = (Math.floor(n * 0.62) + c * 2) % n;
    const a = pts[i], b = pts[(i + 1) % n];
    const ang = Math.atan2(b[0] - a[0], b[2] - a[2]);
    at(gb, a[0], a[1] + 0.05, a[2], ang, () => {
      gb.box(M.gloss, 0, 0, 0, 1.3, 0.7, 1.8, [0.95, 0.75, 0.1]);
      gb.box(M.gloss, 0, 0.7, -0.6, 1.3, 0.4, 0.2, [0.1, 0.1, 0.12]);
    });
  }
}
export function waterSlide(gb, M, x, z, h, pts, col) {
  // tower
  for (const [sx, sz] of [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]]) gb.box(M.metal, x + sx, 0, z + sz, 0.25, h + 1.2, 0.25, [0.9, 0.9, 0.92]);
  for (let y = 2.5; y <= h; y += 2.5) gb.box(M.wood, x, y, z, 3.4, 0.15, 3.4, [0.7, 0.6, 0.45]);
  gb.geo(M.gloss, TPL.cone, x, h + 2.2, z, 5, 2, 5, [0.95, 0.4, 0.2]);
  for (let i = 0; i < pts.length - 1; i++) gb.cyl(M.gloss, pts[i], pts[i + 1], 0.6, col, TPL.tube);
  for (let i = 0; i < pts.length - 1; i += 3) if (pts[i][1] > 1.5) gb.cyl(M.metal, [pts[i][0], 0, pts[i][2]], [pts[i][0], pts[i][1] - 0.6, pts[i][2]], 0.1, [0.85, 0.85, 0.88]);
  shadow(gb, M, x, z, 5, 5);
}
export function umbrella(gb, M, x, z, col) {
  gb.vcyl(M.metal, x, 0, z, 0.03, 2.3, [0.9, 0.9, 0.9]);
  gb.geo(M.fabric, TPL.cone, x, 2.45, z, 2.6, 0.5, 2.6, col);
  shadow(gb, M, x, z, 2.6, 2.6);
}
export function lounger(gb, M, x, z, rot) {
  at(gb, x, 0, z, rot, () => {
    gb.box(M.plastic, 0, 0.3, 0.2, 0.7, 0.06, 1.4, WHITE);
    gb.beam(M.plastic, [0, 0.33, -0.5], [0, 0.85, -0.85], 0.7, 0.06, WHITE);
    for (const sx of [-0.3, 0.3]) for (const sz of [-0.4, 0.8]) gb.box(M.plastic, sx, 0, sz, 0.05, 0.3, 0.05, WHITE);
  });
}
export function lampPost(gb, M, x, z, h = 4) {
  gb.vcyl(M.metal, x, 0, z, 0.07, h, [0.1, 0.12, 0.1]);
  gb.sphere(M.light, x, h + 0.15, z, 0.28, [1.4, 1.25, 0.9]);
  gb.vcyl(M.metal, x, 0, z, 0.15, 0.3, [0.1, 0.12, 0.1]);
}
export function fish(gb, M, x, y, z, rot, s, col) {
  at(gb, x, y, z, rot, () => {
    gb.geo(M.gloss, TPL.sphere, 0, 0, 0, s * 0.35, s * 0.5, s, col);
    gb.geo(M.gloss, TPL.cone, 0, 0, -s * 0.6, s * 0.05, s * 0.4, s * 0.35, col, Math.PI / 2);
  });
}
// stylised dinosaur skeleton built from bones (nod to the repo's dinosaur roots)
export function dinoSkeleton(gb, M, x, z, rot, s, kind) {
  const bone = [0.88, 0.84, 0.74];
  at(gb, x, 0, z, rot, () => {
    gb.box(M.stone, 0, 0, 0, 4 * s, 0.6, 10 * s, [0.3, 0.3, 0.32]);
    const hip = [0, 3.4 * s, 0];
    if (kind === 'rex') {
      const spine = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const zz = (t - 0.4) * 11 * s;
        const yy = hip[1] + Math.sin(t * Math.PI) * 0.6 * s - (t > 0.75 ? (t - 0.75) * 3 * s : 0) - (t < 0.15 ? (0.15 - t) * 4 * s : 0);
        spine.push([0, yy + 0.4 * s, zz]);
      }
      for (let i = 0; i < spine.length - 1; i++) gb.cyl(M.matte, spine[i], spine[i + 1], 0.12 * s, bone);
      for (let i = 4; i < 9; i++) {
        const p = spine[i];
        for (const sx of [-1, 1]) gb.beam(M.matte, p, [sx * 0.7 * s, p[1] - 1.2 * s, p[2] + 0.2 * s], 0.06 * s, 0.06 * s, bone);
      }
      const head = spine[spine.length - 1];
      gb.box(M.matte, 0, head[1] - 0.4 * s, head[2] + 0.6 * s, 0.6 * s, 0.9 * s, 1.5 * s, bone);
      gb.box(M.matte, 0, head[1] - 0.7 * s, head[2] + 0.6 * s, 0.5 * s, 0.2 * s, 1.3 * s, bone);
      for (const sx of [-0.45, 0.45]) {
        gb.cyl(M.matte, [sx * s, hip[1], 0.2 * s], [sx * s, 1.8 * s, 0.9 * s], 0.18 * s, bone);
        gb.cyl(M.matte, [sx * s, 1.8 * s, 0.9 * s], [sx * s, 0.65, 0.3 * s], 0.13 * s, bone);
        gb.box(M.matte, sx * s, 0.6, 0.6 * s, 0.3 * s, 0.1, 0.9 * s, bone);
        gb.cyl(M.matte, [sx * 0.3 * s, spine[9][1] - 0.4 * s, spine[9][2]], [sx * 0.35 * s, spine[9][1] - 1.0 * s, spine[9][2] + 0.4 * s], 0.05 * s, bone);
      }
    } else {
      // long-neck sauropod
      const pts = [];
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const zz = (t - 0.45) * 16 * s;
        let yy = hip[1] + 0.6 * s;
        if (t > 0.6) yy += (t - 0.6) * 14 * s;
        if (t < 0.3) yy -= (0.3 - t) * 9 * s;
        pts.push([0, Math.max(0.8, yy), zz]);
      }
      for (let i = 0; i < pts.length - 1; i++) gb.cyl(M.matte, pts[i], pts[i + 1], 0.14 * s, bone);
      for (let i = 6; i < 12; i++) for (const sx of [-1, 1]) gb.beam(M.matte, pts[i], [sx * 0.9 * s, pts[i][1] - 1.4 * s, pts[i][2]], 0.07 * s, 0.07 * s, bone);
      const hd = pts[pts.length - 1];
      gb.box(M.matte, 0, hd[1] - 0.2 * s, hd[2] + 0.3 * s, 0.4 * s, 0.4 * s, 0.8 * s, bone);
      for (const lz of [-1.2, 1.2]) for (const sx of [-0.6, 0.6]) gb.cyl(M.matte, [sx * s, hip[1] + 0.4 * s, lz * s], [sx * s, 0.6, lz * s], 0.2 * s, bone);
    }
  });
}
