// Gameplay features derived from the floor plan: physics zones (ice, water, trampolines, snow,
// foam), recessed swimming pools, and the layouts of rideable attractions. Both the renderer
// (structure/decor) and the simulation (player, rides) read from these plans so they always agree.
import { CELL, li } from './config.js';
import { rngFor } from './rng.js';
import { frameOf, toWorld } from './frame.js';
import { box } from './collide.js';

export const POOL_BOTTOM = -1.8, POOL_SURFACE = -0.3;

export function addFeatures(mall) {
  mall.zones = [];
  mall.zoneGrid = new Map();
  mall.poolCells = new Set();
  mall.pools = [];
  mall.rides = [];
  mall.plans = {};
  const addZone = (z) => {
    mall.zones.push(z);
    for (let cx = Math.floor(z.x0 / CELL); cx <= Math.floor(z.x1 / CELL); cx++) for (let cz = Math.floor(z.z0 / CELL); cz <= Math.floor(z.z1 / CELL); cz++) {
      const k = mall.idx(cx, cz);
      if (!mall.zoneGrid.has(k)) mall.zoneGrid.set(k, []);
      mall.zoneGrid.get(k).push(z);
    }
    return z;
  };
  mall.addZone = addZone;

  // fountains: shallow water you can wade into
  for (const f of mall.fountains) addZone({ type: 'water', circle: true, cx: f.x, cz: f.z, r: 4.4, x0: f.x - 4.4, x1: f.x + 4.4, z0: f.z - 4.4, z1: f.z + 4.4, y0: 0, y1: 0.62, name: 'Fountain' });

  for (const room of mall.rooms) {
    if (room.kind === 'attraction') {
      const x0 = room.x0 * CELL, z0 = room.z0 * CELL, x1 = room.x1 * CELL, z1 = room.z1 * CELL;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
      if (room.type === 'themepark') mall.plans.themepark = themeparkPlan(mall, room, cx, cz, w, d);
      if (room.type === 'waterpark') mall.plans.waterpark = waterparkPlan(mall, room, addZone);
      if (room.type === 'icerink') {
        const rw = w - 16, rd = d - 22;
        room.rink = { x0: cx - rw / 2, x1: cx + rw / 2, z0: cz - rd / 2, z1: cz + rd / 2 };
        addZone({ type: 'ice', ...room.rink, y0: -0.1, y1: 0.2, name: 'Ice rink' });
      }
      if (room.type === 'garden') addZone({ type: 'water', circle: true, cx, cz, r: 6.4, x0: cx - 6.4, x1: cx + 6.4, z0: cz - 6.4, z1: cz + 6.4, y0: 0, y1: 0.4, name: 'Pond' });
      if (room.type === 'skislope' && room.slope) {
        addZone({ type: 'snow', x0, z0, x1, z1, y0: -0.1, y1: 30, name: 'Snow' });
        mall.plans.ski = skiPlan(mall, room);
      }
    }
    if (room.kind === 'venue' && room.type === 'trampoline') {
      const f = frameOf(room, room.fronts && room.fronts[0]);
      for (let x = 4; x < f.w - 4; x += 3.3) for (let z = 6; z < f.d * 0.65; z += 3.3) {
        const [wx, wz] = toWorld(f, x, z);
        addZone({ type: 'tramp', x0: wx - 1.25, x1: wx + 1.25, z0: wz - 1.25, z1: wz + 1.25, y0: -1, y1: room.level * 7 + 0.41, level: room.level });
      }
      const pz = f.d * 0.82;
      const [ax, az] = toWorld(f, 4, pz - 4), [bx, bz] = toWorld(f, f.w - 4, pz + 4);
      addZone({ type: 'foam', x0: Math.min(ax, bx), x1: Math.max(ax, bx), z0: Math.min(az, bz), z1: Math.max(az, bz), y0: room.level * 7 - 1, y1: room.level * 7 + 1.2, level: room.level });
    }
  }
}

export function zonesAt(mall, x, z) {
  return mall.zoneGrid.get(mall.idx(Math.floor(x / CELL), Math.floor(z / CELL))) || null;
}
export function inZone(zn, x, z) {
  if (zn.circle) return (x - zn.cx) ** 2 + (z - zn.cz) ** 2 <= zn.r * zn.r;
  return x >= zn.x0 && x <= zn.x1 && z >= zn.z0 && z <= zn.z1;
}

// ---------------------------------------------------------------- theme park
function themeparkPlan(mall, room, cx, cz, w, d) {
  const pts = [];
  const N = 240;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const rx = w * 0.42 + Math.sin(t * 3) * w * 0.05, rz = d * 0.42 + Math.cos(t * 2) * d * 0.05;
    const h = 3 + 7 * (0.5 + 0.5 * Math.sin(t * 4 + 1)) + (t > 4.6 && t < 5.6 ? 10 * Math.sin((t - 4.6) * Math.PI) : 0);
    pts.push([cx + Math.cos(t) * rx, h, cz + Math.sin(t) * rz]);
  }
  // station = lowest point in the stretch leading up to the big lift hill (short chain lift)
  let peak = 0;
  for (let i = 0; i < N; i++) if (pts[i][1] > pts[peak][1]) peak = i;
  let st = (peak - 10 + N) % N;
  for (let k = 10; k < Math.floor(N * 0.22); k++) { const i = (peak - k + N) % N; if (pts[i][1] < pts[st][1]) st = i; }
  const p = {
    room, cx, cz, w, d,
    coaster: { pts, station: st },
    wheel: { x: cx - w * 0.18, z: cz - d * 0.15, rot: 0.4, R: 15 },
    drop: { x: cx + w * 0.2, z: cz + d * 0.18, h: 19 },
    swing: { x: cx + w * 0.22, z: cz - d * 0.2 },
    carousel: { x: cx, z: cz + d * 0.05, R: 7 },
    teacups: { x: cx - w * 0.22, z: cz + d * 0.22 },
    bumper: { x: cx + w * 0.02, z: cz - d * 0.26, w: 20, d: 13 },
  };
  const sp = pts[st], nx = pts[(st + 1) % N];
  const ang = Math.atan2(nx[0] - sp[0], nx[2] - sp[2]);
  const side = [Math.cos(ang) * 2.4, -Math.sin(ang) * 2.4];
  mall.rides.push(
    { id: 'coaster', type: 'coaster', name: 'Galaxy Comet Coaster', board: { x: sp[0] + side[0], z: sp[2] + side[1] }, plan: p.coaster },
    { id: 'wheel', type: 'wheel', name: 'Starlight Ferris Wheel', board: { x: p.wheel.x + Math.sin(p.wheel.rot) * 4.5, z: p.wheel.z + Math.cos(p.wheel.rot) * 4.5 }, plan: p.wheel },
    { id: 'drop', type: 'drop', name: 'Meteor Drop Tower', board: { x: p.drop.x + 4.3, z: p.drop.z }, plan: p.drop },
    { id: 'swing', type: 'swing', name: 'Orbit Swings', board: { x: p.swing.x + 8, z: p.swing.z }, plan: p.swing },
    { id: 'carousel', type: 'carousel', name: 'Grand Carousel', board: { x: p.carousel.x + 7.8, z: p.carousel.z }, plan: p.carousel },
    { id: 'teacups', type: 'teacups', name: 'Spinning Teacups', board: { x: p.teacups.x + 8.4, z: p.teacups.z }, plan: p.teacups },
    { id: 'bumper', type: 'bumper', name: 'Bumper Cars', board: { x: p.bumper.x, z: p.bumper.z + p.bumper.d / 2 + 1.2 }, plan: p.bumper },
  );
  return p;
}

// ---------------------------------------------------------------- waterpark (recessed pools on cells)
function waterparkPlan(mall, room, addZone) {
  const { x0, x1, z0, z1 } = room;
  const W = x1 - x0, D = z1 - z0;
  const long = W >= D;
  const pools = [];
  if (long) {
    pools.push({ x0: x0 + 4, x1: x0 + 4 + Math.round(W * 0.4), z0: z0 + 4, z1: z1 - 4, name: 'Wave Pool' });
    pools.push({ x0: x1 - 4 - Math.round(W * 0.22), x1: x1 - 4, z0: z0 + Math.round(D * 0.45), z1: z1 - 3, name: 'Splash Pool' });
  } else {
    pools.push({ z0: z0 + 4, z1: z0 + 4 + Math.round(D * 0.4), x0: x0 + 4, x1: x1 - 4, name: 'Wave Pool' });
    pools.push({ z0: z1 - 4 - Math.round(D * 0.22), z1: z1 - 4, x0: x0 + Math.round(W * 0.45), x1: x1 - 3, name: 'Splash Pool' });
  }
  for (const p of pools) {
    for (let z = p.z0; z < p.z1; z++) for (let x = p.x0; x < p.x1; x++) {
      mall.poolCells.add(mall.idx(x, z));
      if (mall.roomId(-1, x, z) >= 0) mall.set(-1, x, z, -1); // solid ground under the pool basin
    }
    // basin walls (so swimmers can't slip under the deck)
    const X0 = p.x0 * CELL, X1 = p.x1 * CELL, Z0 = p.z0 * CELL, Z1 = p.z1 * CELL;
    mall.static.add(box(X0 - 0.3, POOL_BOTTOM - 0.5, Z0, X0, -0.02, Z1));
    mall.static.add(box(X1, POOL_BOTTOM - 0.5, Z0, X1 + 0.3, -0.02, Z1));
    mall.static.add(box(X0, POOL_BOTTOM - 0.5, Z0 - 0.3, X1, -0.02, Z0));
    mall.static.add(box(X0, POOL_BOTTOM - 0.5, Z1, X1, -0.02, Z1 + 0.3));
    const zn = addZone({ type: 'water', x0: p.x0 * CELL, x1: p.x1 * CELL, z0: p.z0 * CELL, z1: p.z1 * CELL, y0: POOL_BOTTOM, y1: POOL_SURFACE, name: p.name, pool: true, wave: p.name === 'Wave Pool' });
    p.zone = zn;
    mall.pools.push(p);
    // pool steps: a walkable ramp out of the pool at the middle of one end
    const along = (p.x1 - p.x0) >= (p.z1 - p.z0) ? 'x' : 'z';
    if (along === 'x') {
      const c = Math.floor((p.z0 + p.z1) / 2);
      mall.addRamp({ kind: 'poolsteps', axis: 'x', dir: -1, t0: p.x0 * CELL + 4, len: 4, y0: POOL_BOTTOM, y1: 0, lo: c * CELL + 0.2, hi: (c + 1) * CELL - 0.2, move: 0 });
      p.steps = { axis: 'x', x: p.x0 * CELL, z0: c * CELL, z1: (c + 1) * CELL };
    } else {
      const c = Math.floor((p.x0 + p.x1) / 2);
      mall.addRamp({ kind: 'poolsteps', axis: 'z', dir: -1, t0: p.z0 * CELL + 4, len: 4, y0: POOL_BOTTOM, y1: 0, lo: c * CELL + 0.2, hi: (c + 1) * CELL - 0.2, move: 0 });
      p.steps = { axis: 'z', z: p.z0 * CELL, x0: c * CELL, x1: (c + 1) * CELL };
    }
  }
  // slide towers next to the splash pool, slides end in the pool
  const B = pools[1];
  const bx = ((B.x0 + B.x1) / 2) * CELL, bz = ((B.z0 + B.z1) / 2) * CELL;
  const towers = long ? [[bx - 10, (z0 + 3) * CELL], [bx + 8, (z0 + 3) * CELL]] : [[(x0 + 3) * CELL, bz - 10], [(x0 + 3) * CELL, bz + 8]];
  const slides = [];
  towers.forEach(([tx, tz], ti) => {
    const h = 14 + ti * 3;
    for (let s = 0; s < 2; s++) {
      const pts = [];
      const ex = bx + (s ? 4 : -4) * (long ? 1 : 0), ez = bz + (s ? 4 : -4) * (long ? 0 : 1);
      for (let i = 0; i <= 48; i++) {
        const t = i / 48;
        const ang = t * Math.PI * (2.5 + s) + ti + s * 2;
        const rad = 4 + t * 6;
        const px = tx + (ex - tx) * t * t, pz = tz + (ez - tz) * t * t;
        pts.push([px + Math.cos(ang) * rad * (1 - t) * (1 - t), Math.max(POOL_SURFACE + 0.4, h * (1 - t) + 0.6 * (1 - t)), pz + Math.sin(ang) * rad * (1 - t) * (1 - t)]);
      }
      slides.push({ tower: [tx, tz], h, pts, color: s ? [0.95, 0.5, 0.1] : [0.15, 0.45, 0.95] });
    }
  });
  slides.forEach((sl, i) => mall.rides.push({ id: 'slide' + i, type: 'slide', name: i % 2 ? 'Tornado Tube Slide' : 'Blue Lightning Slide', board: { x: sl.tower[0] + (i % 2 ? 2.3 : -2.3), z: sl.tower[1] + 2.3 }, plan: sl }));
  return { room, pools, towers, slides };
}

// ---------------------------------------------------------------- ski slope chairlift
function skiPlan(mall, room) {
  const sl = room.slope;
  const c = sl.hi - 3;
  const P = (t, y) => (sl.axis === 'x' ? [t, y, c] : [c, y, t]);
  const bottom = P(sl.t0 - 2, 0), top = P(sl.t0 + sl.len - 2, sl.y1);
  const plan = { sl, c, bottom, top, P };
  const boardP = sl.axis === 'x' ? { x: sl.t0 - 4, z: c - 1.5 } : { x: c - 1.5, z: sl.t0 - 4 };
  mall.rides.push({ id: 'lift', type: 'lift', name: 'Polar Peak Chairlift', board: boardP, plan });
  return plan;
}

// static colliders for features (called after addFeatures)
export function featureColliders(mall) {
  const p = mall.plans.themepark;
  if (p) {
    mall.static.add(box(p.wheel.x - 2.6, 0, p.wheel.z - 2.6, p.wheel.x + 2.6, 3, p.wheel.z + 2.6));
    mall.static.add(box(p.drop.x - 3.4, 0, p.drop.z - 3.4, p.drop.x + 3.4, 2, p.drop.z + 3.4));
    mall.static.add(box(p.swing.x - 1, 0, p.swing.z - 1, p.swing.x + 1, 12, p.swing.z + 1));
  }
}
