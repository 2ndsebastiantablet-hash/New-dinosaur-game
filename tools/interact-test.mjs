// Headless gameplay tests for interactions, surfaces and rides. Needs `npx vite preview --port 4173`.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
page.setDefaultTimeout(180000);
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && !m.text().includes('Clock'))) errs.push(m.text()); });
await page.goto(`http://localhost:4173/?seed=${process.argv[2] || 12345}&shot`);
await page.waitForFunction(() => window.__mall && window.__mall.G.interact, null);
await page.evaluate(() => { HTMLCanvasElement.prototype.requestPointerLock = function () { return Promise.reject(new Error('x')); }; });
await page.click('#enter');
const res = await page.evaluate(() => {
  const M = window.__mall, G = M.G, P = G.player, W = G.world, mall = G.mall;
  const out = {};
  const run = (secs, keys = []) => { for (const k of keys) M.keys.add(k); for (let i = 0; i < secs * 30; i++) { M.tick(1 / 30); if (i % 15 === 0) W.update(P.pos.x, P.pos.z, P.level, 200); } for (const k of keys) M.keys.delete(k); };
  const go = (x, y, z, yaw = 0, pitch = 0) => { P.mode = 'walk'; P.fly = false; P.teleport(x, y, z); P.yaw = yaw; P.pitch = pitch; W.update(x, z, mall.levelOfY(y + 0.3), 60000); run(0.2); };
  const lookAt = (x, y, z) => { const dx = x - P.pos.x, dz = z - P.pos.z; P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(y - (P.pos.y + 1.6), Math.hypot(dx, dz)); P.applyCamera(1, 0); };
  const near = (kind) => { const L = []; for (const c of W.loaded.values()) if (c.inter) for (const it of c.inter) if (it.kind === kind) L.push(it); return L; };
  const tgt = () => G.interact.target && G.interact.target.kind;
  // interactable counts around spawn
  go(mall.spawn.x, 0, mall.spawn.z);
  const counts = {};
  for (const c of W.loaded.values()) if (c.inter) for (const it of c.inter) counts[it.kind] = (counts[it.kind] || 0) + 1;
  out.kinds = counts;
  // ---- doors
  const door = near('door').find((d) => d.y < 3 && d.y > 0);
  if (door) {
    const f = door.data.frame, c = Math.cos(f[3]), s = Math.sin(f[3]);
    const side = -door.data.swing; // stand on the side the door swings away from
    const sx = f[0] + 2.0 * c + side * 1.8 * s, sz = f[2] - 2.0 * s + side * 1.8 * c;
    go(sx, f[1], sz); lookAt(door.x, door.y, door.z); run(0.1);
    out.doorTarget = tgt();
    // walk into the closed door: should be blocked
    const st = G.interact.doors.st(door.data.key);
    const before = [P.pos.x, P.pos.z];
    run(1.5, ['KeyW']);
    out.doorBlocked = Math.hypot(P.pos.x - door.x, P.pos.z - door.z) > 0.25 && st.t === 0;
    go(sx, f[1], sz); lookAt(door.x, door.y, door.z); run(0.1);
    M.use(); run(1);
    out.doorOpen = st.t;
    out.doorColOff = st.col.off;
    run(2.5, ['KeyW']);
    out.walkedThrough = Math.hypot(P.pos.x - sx, P.pos.z - sz).toFixed(2);
  }
  // ---- vending machine / dispensers
  const vend = near('vend')[0] || near('food')[0] || near('register')[0];
  if (vend) {
    go(vend.x + Math.sin(vend.yaw) * -1.6, vend.y > 3 ? Math.floor(vend.y / 7) * 7 : 0, vend.z + Math.cos(vend.yaw) * -1.6);
    lookAt(vend.x, vend.y, vend.z); run(0.1);
    out.vendTarget = tgt();
    const n0 = G.phys.bodies.length; M.use(); run(1.5);
    out.vendSpawned = G.phys.bodies.length - n0;
  }
  // ---- pool swimming
  const pool = mall.pools[0];
  if (pool) {
    const cx = (pool.x0 + pool.x1) / 2 * 4, cz = (pool.z0 + pool.z1) / 2 * 4;
    go(cx, 0.5, cz); run(4);
    out.swim = { y: +P.pos.y.toFixed(2), swimming: P.swimming, surface: P.surface };
    // edge walls: try to swim under the deck
    run(6, ['KeyW']);
    out.swimEdge = { y: +P.pos.y.toFixed(2), inPool: mall.poolCells.has(mall.idx(Math.floor(P.pos.x / 4), Math.floor(P.pos.z / 4))) };
  }
  // ---- ice: slide after releasing the keys
  const rinkRoom = mall.rooms.find((r) => r.rink);
  if (rinkRoom) {
    const r = rinkRoom.rink;
    go((r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2, -Math.PI / 2);
    run(2, ['KeyW']); const v1 = Math.hypot(P.vel.x, P.vel.z); run(1);
    out.ice = { surface: P.surface, speedAfter1sCoast: +Math.hypot(P.vel.x, P.vel.z).toFixed(2), speedWalking: +v1.toFixed(2) };
  }
  // ---- trampoline bounce
  const tr = mall.zones.find((z) => z.type === 'tramp');
  if (tr) {
    go((tr.x0 + tr.x1) / 2, tr.y1, (tr.z0 + tr.z1) / 2);
    let maxY = 0; M.keys.add('Space');
    for (let i = 0; i < 300; i++) { M.tick(1 / 30); maxY = Math.max(maxY, P.pos.y - tr.y1); }
    M.keys.delete('Space');
    out.trampMaxHeight = +maxY.toFixed(2);
  }
  // ---- ski slope slide
  const ski = mall.plans.ski;
  if (ski) {
    const sl = ski.sl, c = (sl.lo + sl.hi) / 2, t = sl.t0 + sl.len * 0.7, y = sl.y0 + 0.7 * (sl.y1 - sl.y0);
    if (sl.axis === 'x') go(t, y, c); else go(c, y, t);
    run(4);
    out.skiSlide = { startY: +y.toFixed(1), endY: +P.pos.y.toFixed(1), speed: +Math.hypot(P.vel.x, P.vel.z).toFixed(1) };
  }
  // ---- rides
  const rideRun = (id, secs) => {
    const r = mall.rides.find((q) => q.id === id);
    go(r.board.x, 0, r.board.z); run(0.5);
    G.rides.board(id);
    const ys = []; let maxY = -99, finished = false;
    for (let i = 0; i < secs * 20; i++) { M.tick(1 / 20); maxY = Math.max(maxY, P.pos.y); if (P.mode === 'walk') { finished = true; break; } if (i % 20 === 0) ys.push(+P.pos.y.toFixed(1)); }
    const o = { maxY: +maxY.toFixed(1), finished, mode: P.mode, end: [P.pos.x, P.pos.y, P.pos.z].map((v) => +v.toFixed(1)), ys: ys.slice(0, 12) };
    if (P.mode === 'ride') G.rides.exit();
    return o;
  };
  out.coaster = rideRun('coaster', 120);
  out.wheel = rideRun('wheel', 90);
  out.drop = rideRun('drop', 40);
  out.slide = rideRun('slide0', 20);
  out.slideAfter = { swimming: P.swimming, surface: P.surface };
  out.lift = rideRun('lift', 120);
  out.carousel = rideRun('carousel', 45);
  // bumper car driving
  { const r = mall.rides.find((q) => q.id === 'bumper'); go(r.board.x, 0, r.board.z); G.rides.board('bumper'); const c = G.rides.active.cars[0]; const p0 = c.position.clone(); M.keys.add('KeyW'); for (let i = 0; i < 60; i++) M.tick(1 / 30); M.keys.delete('KeyW'); out.bumperMoved = +c.position.distanceTo(p0).toFixed(2); G.rides.exit(); }
  // ---- bowling
  const bowl = (() => { for (const c of W.loaded.values()) if (c.inter) for (const it of c.inter) if (it.kind === 'bowl') return it; return null; })();
  out.bowlLoaded = !!bowl;
  return out;
});
console.log(JSON.stringify(res, null, 1));
// bowling: go to the alley
const bowl = await page.evaluate(() => {
  const M = window.__mall, G = M.G, P = G.player, W = G.world, mall = G.mall;
  const room = mall.rooms.find((r) => r.type === 'bowling');
  const run = (secs) => { for (let i = 0; i < secs * 30; i++) M.tick(1 / 30); };
  P.mode = 'walk'; P.teleport((room.x0 + room.x1) / 2 * 4, room.level * 7, (room.z0 + room.z1) / 2 * 4); W.update(P.pos.x, P.pos.z, room.level, 60000); run(0.3);
  let it = null; for (const c of W.loaded.values()) if (c.inter) for (const q of c.inter) if (q.kind === 'bowl' && !it) it = q;
  if (!it) return { err: 'no lane' };
  const L = it.data.lane;
  P.teleport(L.x - L.fx * 1.0, L.y, L.z - L.fz * 1.0); P.yaw = Math.atan2(-L.fx, -L.fz); P.pitch = 0; run(0.2);
  G.interact.bowling.bowl(it); run(0.3);
  const held = G.held && G.held.kind;
  G.throwHeld(); run(5);
  const lane = G.interact.bowling.lanes.get(L.id);
  const down = lane.pins.filter((p) => !p.up).length;
  return { held, down, state: lane.state };
});
console.log('bowling', JSON.stringify(bowl));
console.log('errors', errs.slice(0, 10));
await browser.close();
