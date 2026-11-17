// Screenshots of interactive scenes driven through the game tick. Needs vite preview on 4173.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 640 } });
page.setDefaultTimeout(240000);
await page.goto(`http://localhost:4173/?seed=12345&shot`);
await page.waitForFunction(() => window.__mall && window.__mall.G.interact, null);
await page.evaluate(() => { HTMLCanvasElement.prototype.requestPointerLock = function () { return Promise.reject(new Error('x')); }; });
await page.click('#enter');
const ONLY = process.argv[3] ? process.argv[3].split(',') : null;
const scenes = [
  ['park-rides', `const p = mall.plans.themepark; go(p.cx - p.w * 0.05, 0, p.cz + p.d * 0.32); lookAt(p.wheel.x, 10, p.wheel.z); run(3);`],
  ['coaster-ride', `G.rides.board('coaster'); run(26, 10); P.pitch = -0.25;`],
  ['carousel', `const c = mall.plans.themepark.carousel; G.rides.exit(); go(c.x + 13, 0, c.z + 4); lookAt(c.x, 2, c.z); run(2);`],
  ['pool', `const p = mall.pools[0]; go(p.x0 * 4 - 3, 0, (p.z0 + p.z1) / 2 * 4); lookAt((p.x0 + p.x1) / 2 * 4, -1, (p.z0 + p.z1) / 2 * 4); run(1);`],
  ['swimming', `const p = mall.pools[0]; go((p.x0 + 3) * 4, -1.5, (p.z0 + p.z1) / 2 * 4, -Math.PI / 2); run(3); P.pitch = 0.05;`],
  ['bowling', `const room = mall.rooms.find((r) => r.type === 'bowling'); go((room.x0 + room.x1) / 2 * 4, room.level * 7, (room.z0 + room.z1) / 2 * 4); run(0.3); const it = find('bowl'); const L = it.data.lane; go(L.x - L.fx * 1.2 + L.sx * 1.5, L.y, L.z - L.fz * 1.2 + L.sz * 1.5); P.yaw = Math.atan2(-L.fx, -L.fz); G.interact.bowling.bowl(it); run(0.3); G.throwHeld(); run(1.6, 10);`],
  ['door', `go(mall.spawn.x, 0, mall.spawn.z); run(0.3); const d = finds('door').find((q) => q.data.staff && q.y < 3); const f = d.data.frame, c = Math.cos(f[3]), s = Math.sin(f[3]); const side = -d.data.swing; go(f[0] + 2 * c + side * 2.6 * s, f[1], f[2] - 2 * s + side * 2.6 * c); lookAt(d.x, d.y - 0.2, d.z); run(0.2); M.use(); run(1.2);`],
  ['held-item', `const v = finds('vend')[0]; go(v.x - Math.sin(v.yaw) * 1.5, Math.floor(v.y / 7) * 7, v.z - Math.cos(v.yaw) * 1.5); lookAt(v.x, v.y, v.z); run(0.2); M.use(); run(1.5); const b = G.phys.bodies[G.phys.bodies.length - 1]; G.hold(b); P.pitch = -0.2; run(0.2);`],
];
for (const [name, code] of scenes.filter(([n]) => !ONLY || ONLY.includes(n))) {
  const info = await page.evaluate((code) => {
    const M = window.__mall, G = M.G, P = G.player, W = G.world, mall = G.mall;
    const run = (secs, fps = 30) => { for (let i = 0; i < secs * fps; i++) { M.tick(1 / fps); if (i % 10 === 0) W.update(P.pos.x, P.pos.z, P.level, 300); } };
    const go = (x, y, z, yaw = 0) => { if (P.mode === 'ride') G.rides.exit(); P.mode = 'walk'; P.teleport(x, y, z); P.yaw = yaw; P.pitch = 0; W.update(x, z, mall.levelOfY(y + 0.3), 60000); };
    const lookAt = (x, y, z) => { const dx = x - P.pos.x, dz = z - P.pos.z; P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(y - (P.pos.y + 1.6), Math.hypot(dx, dz)); };
    const finds = (k) => { const L = []; for (const c of W.loaded.values()) if (c.inter) for (const it of c.inter) if (it.kind === k) L.push(it); return L; };
    const find = (k) => finds(k)[0];
    eval(code);
    W.update(P.pos.x, P.pos.z, P.level, 60000);
    M.tick(1 / 30);
    M.render();
    return document.getElementById('prompt').textContent + ' | ' + document.getElementById('ridehud').textContent + ' | ' + document.getElementById('flash').textContent;
  }, code);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log(name, info);
}
// arcade overlay
await page.evaluate(() => { const M = window.__mall; M.G.arcade.start(); for (let i = 0; i < 60; i++) M.G.arcade.update(1 / 30, M.keys); });
await page.screenshot({ path: `${out}/arcade.png` });
await browser.close();
