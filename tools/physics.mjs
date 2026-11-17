import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:4173/?seed=${process.argv[2] || 12345}&shot`);
await page.waitForFunction(() => window.__mall, null, { timeout: 120000 });
const out = await page.evaluate(() => {
  const M = window.__mall, P = M.player, W = M.world, mall = M.mall;
  const sim = (secs, inp) => {
    const input = { forward: 0, strafe: 0, sprint: false, jump: false, up: 0, down: 0, lookX: 0, lookY: 0, ...inp };
    for (let t = 0; t < secs * 60; t++) {
      P.update(1 / 60, input);
      if (t % 30 === 0) W.update(P.pos.x, P.pos.z, P.level, 50);
    }
    return { x: +P.pos.x.toFixed(2), y: +P.pos.y.toFixed(2), z: +P.pos.z.toFixed(2), lvl: P.level };
  };
  const res = {};
  // 1. spawn, stand still: should rest on floor y=0
  P.spawn(mall.spawn); W.update(P.pos.x, P.pos.z, 0, 60000);
  res.idle = sim(1, {});
  // 2. walk straight at a storefront for 8s: must not pass through
  P.spawn(mall.spawn); P.yaw = -Math.PI / 2; // face +x
  res.wallStart = { x: +P.pos.x.toFixed(2), z: +P.pos.z.toFixed(2) };
  res.wall = sim(8, { forward: 1 });
  res.wallRoom = (mall.room(0, Math.floor(P.pos.x / 4), Math.floor(P.pos.z / 4)) || {}).kind;
  // 3. escalator up: stand at the start of the up-ramp and walk forward
  const e = mall.escalators.find((q) => q.level === 0);
  const startT = e.t0 - e.dir * 2.0;
  const [ex, ez] = e.axis === 'z' ? [e.cc - 0.85, startT] : [startT, e.cc - 0.85];
  P.teleport(ex, 0, ez);
  P.yaw = e.axis === 'z' ? (e.dir > 0 ? Math.PI : 0) : (e.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
  W.update(P.pos.x, P.pos.z, 0, 60000);
  res.escalator = sim(6, { forward: 1 });
  res.escalatorRide = (() => { P.teleport(ex, 0, ez); return sim(25, {}); })(); // just stand: the moving steps carry you
  // 4. stairs: from L1 active landing walk up flight 0 (lane 0, +z)
  const st = mall.stairs[0];
  P.teleport((st.x0 + 0.5) * 4, 0, (st.z0 + 0.5) * 4); P.yaw = Math.PI; // face +z
  W.update(P.pos.x, P.pos.z, 0, 60000);
  res.stairs = sim(7, { forward: 1 });
  // 5. railing on L2: walk from walkway into the boulevard void
  const lane = mall.colLanes.find((l) => l.main);
  const zMid = (mall.blocks[0][3].z0 + 3) * 4;
  P.teleport((lane.x0 + 0.5) * 4, 7, zMid); P.yaw = -Math.PI / 2; // face +x (towards void)
  W.update(P.pos.x, P.pos.z, 1, 60000);
  res.railStart = { x: +P.pos.x.toFixed(2), void: mall.isVoid(1, lane.x0 + 1, Math.floor(zMid / 4)) };
  res.rail = sim(4, { forward: 1 });
  // 6. jump
  P.spawn(mall.spawn); W.update(P.pos.x, P.pos.z, 0, 60000);
  const jin = { jump: true };
  P.update(1 / 60, { forward: 0, strafe: 0, jump: true, up: 0, down: 0, lookX: 0, lookY: 0 });
  let maxY = 0; for (let i = 0; i < 60; i++) { P.update(1 / 60, { forward: 0, strafe: 0, jump: false, up: 0, down: 0, lookX: 0, lookY: 0 }); maxY = Math.max(maxY, P.pos.y); }
  res.jumpMax = +maxY.toFixed(2); res.jumpEnd = +P.pos.y.toFixed(2);
  // 7. ski slope climb
  const sl = mall.groups.find((g) => g.type === 'skislope');
  if (sl && sl.room.slope) {
    const s = sl.room.slope;
    const c = (s.lo + s.hi) / 2;
    if (s.axis === 'x') { P.teleport(s.t0 - 2, 0, c); P.yaw = -Math.PI / 2; } else { P.teleport(c, 0, s.t0 - 2); P.yaw = Math.PI; }
    W.update(P.pos.x, P.pos.z, 0, 60000);
    res.ski = sim(30, { forward: 1, sprint: true });
    res.skiTop = s.y1;
  }
  return res;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
