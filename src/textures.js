// Procedurally painted canvas textures (no external image assets)
import * as THREE from 'three';
import { RNG } from './rng.js';

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// value noise -------------------------------------------------------------
function makeNoise(seed) {
  const r = new RNG(seed);
  const P = new Float32Array(256 * 256);
  for (let i = 0; i < P.length; i++) P[i] = r.next();
  const at = (x, y) => P[((y & 255) << 8) | (x & 255)];
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}
const N1 = makeNoise(7);
function fbm(x, y, oct = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * N1(x * f, y * f); f *= 2; a *= 0.5; }
  return s;
}
// tileable fbm over period p
function tfbm(x, y, p, oct = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    const P = p * f;
    const xx = x * f, yy = y * f;
    const fx = (xx % P) / P, fy = (yy % P) / P;
    // blend 4 samples for tiling
    const n = N1(xx, yy) * (1 - fx) * (1 - fy) + N1(xx - P, yy) * fx * (1 - fy) + N1(xx, yy - P) * (1 - fx) * fy + N1(xx - P, yy - P) * fx * fy;
    s += a * n; f *= 2; a *= 0.5;
  }
  return s;
}

function noiseLayer(ctx, w, h, period, base, amp, oct = 4, tint = [1, 1, 1]) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = (tfbm((x / w) * period, (y / h) * period, period, oct) - 0.5) * amp;
    const i = (y * w + x) * 4;
    d[i] = Math.max(0, Math.min(255, d[i] + n * 255 * tint[0] + base));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n * 255 * tint[1] + base));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 255 * tint[2] + base));
  }
  ctx.putImageData(img, 0, 0);
}

function speckle(ctx, w, h, count, colors, size = [1, 2], seed = 1) {
  const r = new RNG(seed);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = r.pick(colors);
    const s = r.range(size[0], size[1]);
    ctx.fillRect(r.next() * w, r.next() * h, s, s);
  }
}

function tex(c, repeatMeters = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / repeatMeters, 1 / repeatMeters);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// ---------------------------------------------------------------------------
export function makeTextures() {
  const T = {};
  const S = 512;

  // Polished marble tiles (4x4 tiles, 3m)
  {
    const c = canvas(S), g = c.getContext('2d');
    g.fillStyle = '#e9e4da'; g.fillRect(0, 0, S, S);
    noiseLayer(g, S, S, 4, 0, 0.12, 5, [1, 0.98, 0.95]);
    const r = new RNG(3);
    const ts = S / 4;
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
      const v = r.range(-14, 10);
      g.fillStyle = `rgba(${v > 0 ? 255 : 150},${v > 0 ? 250 : 140},${v > 0 ? 240 : 130},${Math.abs(v) / 260})`;
      g.fillRect(tx * ts, ty * ts, ts, ts);
      // veins
      g.strokeStyle = `rgba(150,140,130,${r.range(0.15, 0.35)})`;
      g.lineWidth = r.range(0.6, 1.6);
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        let x = tx * ts + r.next() * ts, y = ty * ts;
        g.moveTo(x, y);
        for (let s = 0; s < 8; s++) { x += r.range(-14, 14); y += ts / 8; g.lineTo(Math.max(tx * ts, Math.min((tx + 1) * ts, x)), y); }
        g.stroke();
      }
    }
    g.strokeStyle = 'rgba(120,110,100,0.55)'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * ts, 0); g.lineTo(i * ts, S); g.stroke(); g.beginPath(); g.moveTo(0, i * ts); g.lineTo(S, i * ts); g.stroke(); }
    T.marble = tex(c, 3);
  }
  // Dark stone tile
  {
    const c = canvas(S), g = c.getContext('2d');
    g.fillStyle = '#3a3a3e'; g.fillRect(0, 0, S, S);
    noiseLayer(g, S, S, 6, 0, 0.18, 5);
    speckle(g, S, S, 3000, ['#55555a', '#2a2a2e', '#666'], [1, 2], 5);
    g.strokeStyle = 'rgba(10,10,10,0.7)'; g.lineWidth = 3;
    for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * S / 2, 0); g.lineTo(i * S / 2, S); g.stroke(); g.beginPath(); g.moveTo(0, i * S / 2); g.lineTo(S, i * S / 2); g.stroke(); }
    T.darkTile = tex(c, 2);
  }
  // Wood planks (2m)
  {
    const c = canvas(S), g = c.getContext('2d');
    const r = new RNG(11);
    const rows = 8, ph = S / rows;
    for (let i = 0; i < rows; i++) {
      let x = -r.next() * S;
      while (x < S) {
        const len = r.range(S * 0.4, S * 0.9);
        const h = r.range(27, 33), l = r.range(44, 54), s = r.range(32, 42);
        g.fillStyle = `hsl(${h},${s}%,${l}%)`;
        g.fillRect(x, i * ph, len, ph);
        // grain
        for (let k = 0; k < 14; k++) {
          g.strokeStyle = `hsla(${h},${s}%,${l - r.range(5, 15)}%,0.35)`;
          g.lineWidth = r.range(0.5, 1.5);
          const yy = i * ph + r.next() * ph;
          g.beginPath(); g.moveTo(x, yy);
          g.bezierCurveTo(x + len * 0.3, yy + r.range(-3, 3), x + len * 0.6, yy + r.range(-3, 3), x + len, yy + r.range(-2, 2));
          g.stroke();
        }
        g.fillStyle = 'rgba(40,25,15,0.6)'; g.fillRect(x, i * ph, 2, ph);
        x += len;
      }
      g.fillStyle = 'rgba(30,20,10,0.5)'; g.fillRect(0, i * ph, S, 2);
    }
    T.wood = tex(c, 2);
  }
  // Carpet
  {
    const c = canvas(256), g = c.getContext('2d');
    g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, 256, 256);
    noiseLayer(g, 256, 256, 8, 0, 0.25, 3);
    speckle(g, 256, 256, 9000, ['rgba(0,0,0,0.15)', 'rgba(255,255,255,0.12)'], [1, 1.5], 9);
    T.carpet = tex(c, 1.5);
  }
  // Neon carpet (arcade/cinema)
  {
    const c = canvas(S), g = c.getContext('2d');
    g.fillStyle = '#14101f'; g.fillRect(0, 0, S, S);
    const r = new RNG(21);
    const cols = ['#ff2bd6', '#2bf0ff', '#ffe02b', '#7cff2b', '#ff7b2b'];
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = r.pick(cols); g.lineWidth = r.range(2, 5);
      const x = r.next() * S, y = r.next() * S, s = r.range(10, 34);
      g.beginPath();
      const t = r.int(0, 3);
      if (t === 0) g.arc(x, y, s / 2, 0, Math.PI * 2);
      else if (t === 1) { g.moveTo(x, y); g.lineTo(x + s, y + s * 0.3); g.lineTo(x + s * 0.2, y + s); }
      else if (t === 2) g.rect(x, y, s, s * 0.6);
      else { g.moveTo(x, y); for (let k = 0; k < 4; k++) g.lineTo(x + k * s * 0.3, y + (k % 2 ? s * 0.3 : 0)); }
      g.stroke();
    }
    T.neonCarpet = tex(c, 3);
  }
  // Concrete
  {
    const c = canvas(S), g = c.getContext('2d');
    g.fillStyle = '#9c9a96'; g.fillRect(0, 0, S, S);
    noiseLayer(g, S, S, 4, 0, 0.22, 6);
    speckle(g, S, S, 4000, ['rgba(60,60,60,0.25)', 'rgba(200,200,200,0.2)'], [1, 2], 13);
    g.strokeStyle = 'rgba(60,60,60,0.35)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, S / 2); g.lineTo(S, S / 2); g.moveTo(S / 2, 0); g.lineTo(S / 2, S); g.stroke();
    T.concrete = tex(c, 4);
  }
  // Garage floor (sealed concrete with stains)
  {
    const c = canvas(S), g = c.getContext('2d');
    g.fillStyle = '#76787a'; g.fillRect(0, 0, S, S);
    noiseLayer(g, S, S, 3, 0, 0.25, 6);
    const r = new RNG(31);
    for (let i = 0; i < 10; i++) {
      const x = r.next() * S, y = r.next() * S, rad = r.range(10, 50);
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(20,20,20,0.35)'); gr.addColorStop(1, 'rgba(20,20,20,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    T.garage = tex(c, 6);
  }
  // White ceramic tile 30cm
  {
    const c = canvas(256), g = c.getContext('2d');
    g.fillStyle = '#f1f1ee'; g.fillRect(0, 0, 256, 256);
    noiseLayer(g, 256, 256, 4, 0, 0.05, 3);
    g.strokeStyle = 'rgba(150,150,145,0.8)'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke(); }
    T.tile = tex(c, 1.2);
  }
  // Pool tile (small blue mosaic)
  {
    const c = canvas(256), g = c.getContext('2d');
    const r = new RNG(41);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      g.fillStyle = `hsl(${r.range(188, 200)},${r.range(55, 75)}%,${r.range(48, 62)}%)`;
      g.fillRect(x * 16, y * 16, 15, 15);
    }
    g.fillStyle = 'rgba(255,255,255,0.5)';
    T.poolTile = tex(c, 1);
  }
  // Rubber floor
  {
    const c = canvas(256), g = c.getContext('2d');
    g.fillStyle = '#2b2d30'; g.fillRect(0, 0, 256, 256);
    speckle(g, 256, 256, 2500, ['#4d5aa8', '#a83a3a', '#888', '#3a8a5a'], [1, 2.5], 51);
    noiseLayer(g, 256, 256, 4, 0, 0.08, 3);
    T.rubber = tex(c, 1.5);
  }
  // Pavement pavers (theme park)
  {
    const c = canvas(S), g = c.getContext('2d');
    g.fillStyle = '#b9a58a'; g.fillRect(0, 0, S, S);
    const r = new RNG(61);
    const bw = S / 8, bh = S / 16;
    for (let y = 0; y < 16; y++) for (let x = -1; x < 9; x++) {
      const ox = (y % 2) * bw / 2;
      g.fillStyle = `hsl(${r.range(20, 35)},${r.range(20, 35)}%,${r.range(48, 62)}%)`;
      g.fillRect(x * bw + ox + 1, y * bh + 1, bw - 2, bh - 2);
    }
    noiseLayer(g, S, S, 4, 0, 0.1, 4);
    T.pavement = tex(c, 3);
  }
  // Grass
  {
    const c = canvas(S), g = c.getContext('2d');
    g.fillStyle = '#4f7f2f'; g.fillRect(0, 0, S, S);
    noiseLayer(g, S, S, 6, 0, 0.3, 5, [0.6, 1, 0.4]);
    speckle(g, S, S, 12000, ['rgba(140,190,80,0.4)', 'rgba(30,60,20,0.4)'], [1, 2], 71);
    T.grass = tex(c, 4);
  }
  // Snow
  {
    const c = canvas(256), g = c.getContext('2d');
    g.fillStyle = '#eef3f8'; g.fillRect(0, 0, 256, 256);
    noiseLayer(g, 256, 256, 6, 0, 0.12, 4, [0.9, 0.95, 1]);
    T.snow = tex(c, 6);
  }
  // Plaster (walls/ceilings)
  {
    const c = canvas(256), g = c.getContext('2d');
    g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, 256, 256);
    noiseLayer(g, 256, 256, 6, 20, 0.06, 4);
    T.plaster = tex(c, 3);
  }
  // Acoustic ceiling tiles 60cm
  {
    const c = canvas(256), g = c.getContext('2d');
    g.fillStyle = '#e6e6e2'; g.fillRect(0, 0, 256, 256);
    speckle(g, 256, 256, 5000, ['rgba(0,0,0,0.12)'], [1, 1.6], 81);
    g.fillStyle = '#c8c8c4';
    for (let i = 0; i <= 2; i++) { g.fillRect(i * 128 - 2, 0, 4, 256); g.fillRect(0, i * 128 - 2, 256, 4); }
    T.ceilingTile = tex(c, 1.2);
  }
  // Cinder block
  {
    const c = canvas(256), g = c.getContext('2d');
    g.fillStyle = '#bdbab2'; g.fillRect(0, 0, 256, 256);
    noiseLayer(g, 256, 256, 8, 0, 0.12, 4);
    g.strokeStyle = 'rgba(120,118,112,0.9)'; g.lineWidth = 3;
    for (let y = 0; y < 4; y++) {
      g.beginPath(); g.moveTo(0, y * 64); g.lineTo(256, y * 64); g.stroke();
      for (let x = 0; x < 3; x++) { const xx = x * 128 + (y % 2) * 64; g.beginPath(); g.moveTo(xx, y * 64); g.lineTo(xx, y * 64 + 64); g.stroke(); }
    }
    T.cinder = tex(c, 1.6);
  }
  // Stone panel (concourse walls)
  {
    const c = canvas(S), g = c.getContext('2d');
    g.fillStyle = '#d9d2c5'; g.fillRect(0, 0, S, S);
    noiseLayer(g, S, S, 3, 0, 0.08, 5, [1, 0.97, 0.92]);
    g.strokeStyle = 'rgba(140,130,120,0.6)'; g.lineWidth = 2;
    for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(0, i * S / 2); g.lineTo(S, i * S / 2); g.stroke(); }
    g.beginPath(); g.moveTo(S / 2, 0); g.lineTo(S / 2, S); g.stroke();
    T.stone = tex(c, 3);
  }
  // Brushed metal
  {
    const c = canvas(256), g = c.getContext('2d');
    g.fillStyle = '#9a9ea3'; g.fillRect(0, 0, 256, 256);
    const r = new RNG(91);
    for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(${r.next() > 0.5 ? 255 : 0},${r.next() > 0.5 ? 255 : 0},255,0.04)`; g.fillRect(0, r.next() * 256, 256, r.range(0.5, 2)); }
    T.metal = tex(c, 1);
  }
  // Products on shelves (row of colourful packaging)
  {
    const c = canvas(S, 256), g = c.getContext('2d');
    g.fillStyle = '#ddd'; g.fillRect(0, 0, S, 256);
    const r = new RNG(101);
    for (let row = 0; row < 2; row++) {
      let x = 0;
      while (x < S) {
        const w = r.range(18, 46), h = r.range(70, 118);
        const hue = r.range(0, 360);
        g.fillStyle = `hsl(${hue},${r.range(40, 85)}%,${r.range(35, 65)}%)`;
        const y0 = row * 128 + 128 - h;
        g.fillRect(x, y0, w - 2, h);
        g.fillStyle = `hsl(${(hue + 180) % 360},70%,85%)`;
        g.fillRect(x + 3, y0 + h * 0.3, w - 8, h * 0.25);
        g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(x, y0, 3, h);
        x += w;
      }
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, row * 128, S, 6);
    }
    T.products = tex(c, 1.6);
  }
  // Book spines
  {
    const c = canvas(S, 256), g = c.getContext('2d');
    g.fillStyle = '#3a2a1e'; g.fillRect(0, 0, S, 256);
    const r = new RNG(111);
    for (let row = 0; row < 2; row++) {
      let x = 0;
      while (x < S) {
        const w = r.range(6, 16), h = r.range(80, 120);
        g.fillStyle = `hsl(${r.range(0, 360)},${r.range(20, 60)}%,${r.range(20, 55)}%)`;
        g.fillRect(x, row * 128 + 128 - h, w - 1, h);
        g.fillStyle = 'rgba(230,200,120,0.6)';
        g.fillRect(x + 1, row * 128 + 128 - h + 10, w - 3, 2);
        x += w;
      }
    }
    T.books = tex(c, 1.6);
  }
  // Clothing (folded / hanging garments pattern)
  {
    const c = canvas(256), g = c.getContext('2d');
    const r = new RNG(121);
    for (let x = 0; x < 256; x += 8) {
      g.fillStyle = `hsl(${r.range(0, 360)},${r.range(10, 60)}%,${r.range(25, 75)}%)`;
      g.fillRect(x, 0, 8, 256);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 7, 0, 1, 256);
    }
    T.garments = tex(c, 1);
  }
  // Roll-up door
  {
    const c = canvas(256), g = c.getContext('2d');
    g.fillStyle = '#9da3a8'; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 10) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, y, 256, 2); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(0, y + 2, 256, 1); }
    T.rollup = tex(c, 1);
  }
  // Skylight sky (bright)
  {
    const c = canvas(S), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, S);
    gr.addColorStop(0, '#9fc9f0'); gr.addColorStop(1, '#d8ecfb');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    const r = new RNG(131);
    for (let i = 0; i < 40; i++) {
      const x = r.next() * S, y = r.next() * S, rad = r.range(30, 90);
      const cg = g.createRadialGradient(x, y, 0, x, y, rad);
      cg.addColorStop(0, 'rgba(255,255,255,0.7)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = cg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    T.sky = tex(c, 30);
  }
  // Outdoor backdrop (seen through entrances/windows): sky, tree line, plaza
  {
    const c = canvas(S, 256), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 226);
    gr.addColorStop(0, '#6fa5dd'); gr.addColorStop(1, '#d6e8f5');
    g.fillStyle = gr; g.fillRect(0, 0, S, 226);
    const r = new RNG(141);
    for (let i = 0; i < 14; i++) {
      const x = r.next() * S, y = r.range(30, 150), rad = r.range(20, 60);
      const cg = g.createRadialGradient(x, y, 0, x, y, rad);
      cg.addColorStop(0, 'rgba(255,255,255,0.75)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = cg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    g.fillStyle = '#9aa7b0'; g.fillRect(0, 200, S, 26);
    for (let i = 0; i < 60; i++) {
      const x = r.next() * S, h = r.range(6, 22);
      g.fillStyle = `rgb(${r.int(45, 75)},${r.int(80, 110)},${r.int(45, 65)})`;
      g.beginPath(); g.arc(x, 224 - h * 0.5, h * 0.6, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#7d7f80'; g.fillRect(0, 226, S, 30);
    for (let i = 0; i < 40; i++) { g.fillStyle = `hsl(${r.range(0, 360)},45%,${r.range(30, 70)}%)`; g.fillRect(r.next() * S, r.range(230, 250), r.range(10, 18), 6); }
    T.outdoor = tex(c, 1);
    T.outdoor.wrapT = THREE.ClampToEdgeWrapping;
  }
  // Screen content (TVs, monitors, arcade): UI-like layouts and imagery
  {
    const c = canvas(S), g = c.getContext('2d');
    const r = new RNG(151);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const X = x * 128, Y = y * 128;
      const kind = (x + y * 4) % 4;
      const gr = g.createLinearGradient(X, Y, X, Y + 128);
      const h = r.range(180, 280);
      gr.addColorStop(0, `hsl(${h},60%,${r.range(18, 35)}%)`); gr.addColorStop(1, `hsl(${h + 30},70%,${r.range(8, 18)}%)`);
      g.fillStyle = gr; g.fillRect(X, Y, 128, 128);
      if (kind === 0) { // landscape photo
        g.fillStyle = `hsl(${r.range(20, 50)},60%,55%)`; g.beginPath(); g.arc(X + 90, Y + 40, 14, 0, 7); g.fill();
        g.fillStyle = `hsl(${r.range(90, 150)},40%,30%)`; g.beginPath(); g.moveTo(X, Y + 128); g.lineTo(X + 40, Y + 70); g.lineTo(X + 75, Y + 100); g.lineTo(X + 110, Y + 60); g.lineTo(X + 128, Y + 80); g.lineTo(X + 128, Y + 128); g.fill();
      } else if (kind === 1) { // app grid
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = `hsl(${r.range(0, 360)},70%,60%)`; g.fillRect(X + 14 + i * 27, Y + 14 + j * 27, 20, 20); }
      } else if (kind === 2) { // web page
        g.fillStyle = '#f2f2f2'; g.fillRect(X + 6, Y + 6, 116, 116);
        g.fillStyle = `hsl(${r.range(0, 360)},60%,50%)`; g.fillRect(X + 6, Y + 6, 116, 20);
        g.fillStyle = '#bbb'; for (let i = 0; i < 6; i++) g.fillRect(X + 14, Y + 36 + i * 13, r.range(40, 95), 5);
      } else { // game scene
        g.fillStyle = '#0b1a3a'; g.fillRect(X, Y, 128, 128);
        for (let i = 0; i < 20; i++) { g.fillStyle = '#fff'; g.fillRect(X + r.next() * 128, Y + r.next() * 70, 1.5, 1.5); }
        g.fillStyle = `hsl(${r.range(0, 360)},80%,55%)`; g.fillRect(X + 50, Y + 90, 26, 14);
        g.fillStyle = '#3a6'; g.fillRect(X, Y + 110, 128, 18);
      }
    }
    T.screen = tex(c, 1);
  }
  // Movie posters
  {
    const c = canvas(S, 256), g = c.getContext('2d');
    const r = new RNG(161);
    const titles = ['STARFALL', 'THE LAST MALL', 'NEON CITY', 'DINO DAWN', 'DEEP WATER', 'HEIST', 'MOONLIGHT', 'RAPTOR RUN'];
    for (let i = 0; i < 8; i++) {
      const x = i * 64;
      const gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, `hsl(${r.range(0, 360)},60%,${r.range(15, 35)}%)`); gr.addColorStop(1, `hsl(${r.range(0, 360)},70%,${r.range(40, 60)}%)`);
      g.fillStyle = gr; g.fillRect(x + 2, 2, 60, 252);
      g.fillStyle = `hsla(${r.range(0, 360)},80%,70%,0.8)`; g.beginPath(); g.arc(x + 32, 110, r.range(14, 26), 0, 7); g.fill();
      g.fillStyle = '#fff'; g.font = 'bold 9px Arial'; g.textAlign = 'center'; g.fillText(titles[i], x + 32, 220);
    }
    T.posters = tex(c, 1);
  }
  // Step treads (escalator / stairs)
  {
    const c = canvas(128), g = c.getContext('2d');
    g.fillStyle = '#5a5d61'; g.fillRect(0, 0, 128, 128);
    for (let x = 0; x < 128; x += 6) { g.fillStyle = '#3a3c3f'; g.fillRect(x, 0, 3, 128); }
    g.fillStyle = '#e8c21c'; g.fillRect(0, 0, 128, 6);
    T.steps = tex(c, 0.4);
  }
  // Foliage
  {
    const c = canvas(256), g = c.getContext('2d');
    g.fillStyle = '#3d6b2a'; g.fillRect(0, 0, 256, 256);
    noiseLayer(g, 256, 256, 8, 0, 0.45, 4, [0.6, 1, 0.5]);
    speckle(g, 256, 256, 3000, ['rgba(150,200,90,0.45)', 'rgba(20,40,15,0.5)'], [2, 4], 171);
    T.foliage = tex(c, 1.5);
  }
  // Water
  {
    const c = canvas(256), g = c.getContext('2d');
    g.fillStyle = '#3aa6c9'; g.fillRect(0, 0, 256, 256);
    noiseLayer(g, 256, 256, 6, 0, 0.3, 4, [0.6, 0.9, 1]);
    T.water = tex(c, 3);
  }
  // Ice
  {
    const c = canvas(256), g = c.getContext('2d');
    g.fillStyle = '#e8f3fb'; g.fillRect(0, 0, 256, 256);
    noiseLayer(g, 256, 256, 4, 0, 0.08, 4, [0.9, 0.95, 1]);
    const r = new RNG(181);
    g.strokeStyle = 'rgba(180,200,220,0.5)';
    for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(r.next() * 256, r.next() * 256, r.range(10, 80), r.next() * 6, r.next() * 6 + 1); g.stroke(); }
    T.ice = tex(c, 5);
  }
  // Blob shadow
  {
    const c = canvas(128), g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    T.shadow = t;
  }
  // Fabric
  {
    const c = canvas(128), g = c.getContext('2d');
    g.fillStyle = '#bbb'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 128; i += 2) { g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(i, 0, 1, 128); g.fillRect(0, i, 128, 1); }
    noiseLayer(g, 128, 128, 4, 0, 0.08, 3);
    T.fabric = tex(c, 0.5);
  }
  // Brick
  {
    const c = canvas(256), g = c.getContext('2d');
    g.fillStyle = '#8a8580'; g.fillRect(0, 0, 256, 256);
    const r = new RNG(191);
    for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) {
      g.fillStyle = `hsl(${r.range(5, 18)},${r.range(35, 55)}%,${r.range(30, 42)}%)`;
      g.fillRect(x * 64 + (y % 2) * 32 + 2, y * 32 + 2, 60, 28);
    }
    T.brick = tex(c, 1.6);
  }
  // Wood paneling for luxury / bowling lanes
  {
    const c = canvas(256, S), g = c.getContext('2d');
    const r = new RNG(201);
    for (let x = 0; x < 256; x += 16) {
      g.fillStyle = `hsl(${r.range(30, 38)},${r.range(45, 60)}%,${r.range(55, 68)}%)`;
      g.fillRect(x, 0, 16, S);
      g.fillStyle = 'rgba(80,50,20,0.25)'; g.fillRect(x + 15, 0, 1, S);
    }
    noiseLayer(g, 256, S, 4, 0, 0.06, 3);
    T.lane = tex(c, 1.07);
  }
  return T;
}

// ---------------------------------------------------------------------------
// Sign atlas: draws many store signs into one texture per chunk
export function drawSign(g, x, y, w, h, sign) {
  const { text, sub, bg, fg, font, style } = sign;
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = bg; g.fillRect(x, y, w, h);
  if (style === 'frame') { g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(x + 6, y + 6, w - 12, h - 12); }
  if (style === 'band') { g.fillStyle = fg; g.globalAlpha = 0.18; g.fillRect(x, y + h * 0.78, w, h * 0.22); g.globalAlpha = 1; }
  g.fillStyle = fg;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = h * (sub ? 0.5 : 0.62);
  g.font = `${font === 'Arial Black' || font === 'Impact' ? '' : 'bold '}${size}px "${font}", Arial, sans-serif`;
  let m = g.measureText(text).width;
  if (m > w * 0.9) { size *= (w * 0.9) / m; g.font = `${font === 'Arial Black' || font === 'Impact' ? '' : 'bold '}${size}px "${font}", Arial, sans-serif`; }
  if (style === 'glow') { g.shadowColor = fg; g.shadowBlur = h * 0.15; }
  g.fillText(text, x + w / 2, y + h * (sub ? 0.4 : 0.52));
  g.shadowBlur = 0;
  if (sub) {
    g.globalAlpha = 0.8;
    g.font = `${Math.min(h * 0.2, size * 0.5)}px Arial, sans-serif`;
    g.fillText(sub, x + w / 2, y + h * 0.8);
    g.globalAlpha = 1;
  }
  g.restore();
}
