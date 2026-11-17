import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
await page.goto(`http://localhost:4173/?seed=12345&shot`);
await page.waitForFunction(() => window.__mall, null, { timeout: 120000 });
const out = await page.evaluate(() => {
  const M = window.__mall, P = M.player, W = M.world, mall = M.mall;
  const inp = (o) => ({ forward: 0, strafe: 0, sprint: false, jump: false, up: 0, down: 0, lookX: 0, lookY: 0, ...o });
  const log = [];
  const e = mall.escalators.find((q) => q.level === 0);
  const startT = e.t0 - e.dir * 2.0;
  const [ex, ez] = e.axis === 'z' ? [e.cc - 0.85, startT] : [startT, e.cc - 0.85];
  P.teleport(ex, 0, ez); W.update(ex, ez, 0, 60000);
  log.push({ e: { axis: e.axis, dir: e.dir, t0: e.t0, cc: e.cc }, start: [ex, ez] });
  for (let s = 0; s < 6; s++) { for (let i = 0; i < 60; i++) P.update(1 / 60, inp({})); log.push([+P.pos.x.toFixed(2), +P.pos.y.toFixed(2), +P.pos.z.toFixed(2), P.ramp && P.ramp.kind, P.ramp && P.ramp.move, P.onGround]); }
  // wall test: inside a store walk toward its back wall
  const st = mall.rooms.find((r) => r.kind === 'store' && r.level === 0 && r.stripSide === 'N' && r.x1 - r.x0 >= 4);
  const cx = (st.x0 + st.x1) / 2 * 4;
  P.teleport(cx + 0.3, 0, st.z0 * 4 + 3); P.yaw = Math.PI; // face +z, toward the back (z1)
  W.update(P.pos.x, P.pos.z, 0, 60000);
  for (let i = 0; i < 600; i++) P.update(1 / 60, inp({ forward: 1, sprint: true }));
  log.push({ store: st.name, backWallZ: st.z1 * 4, endZ: +P.pos.z.toFixed(2), endX: +P.pos.x.toFixed(2) });
  // and diagonal sliding into the side wall
  for (let i = 0; i < 300; i++) P.update(1 / 60, inp({ forward: 1, strafe: 1 }));
  log.push({ sideWallX: [st.x0 * 4, st.x1 * 4], endX: +P.pos.x.toFixed(2), endZ: +P.pos.z.toFixed(2) });
  return log;
});
console.log(JSON.stringify(out));
await browser.close();
