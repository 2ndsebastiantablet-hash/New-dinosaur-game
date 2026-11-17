// Usage: node tools/shot.mjs <seed> <outdir> [views.json]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import fs from 'fs';
const seed = process.argv[2] || '12345';
const out = process.argv[3] || 'shots';
const views = JSON.parse(process.argv[4] || '[]');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(120000);
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning' || m.text().includes('generated')) console.log('[page]', m.type(), m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:4173/?seed=${seed}&shot`);
await page.waitForFunction(() => window.__mall, null, { timeout: 120000 });
await page.screenshot({ path: `${out}/00-start.png` });
await page.click('#enter');
await page.waitForTimeout(300);
let i = 1;
for (const v of views) {
  await page.evaluate((v) => {
    const M = window.__mall;
    if (v.spawn) { M.player.spawn(M.mall.spawn); }
    if (v.x !== undefined) M.player.teleport(v.x, v.y, v.z);
    if (v.find) {
      const C = 4, f = v.find;
      const cands = M.mall.rooms.filter((r) => (!f.kind || r.kind === f.kind) && (!f.type || r.type === f.type) && (f.level === undefined || r.level === f.level) && r.x0 != null);
      const r = cands[f.idx || 0];
      if (r) {
        const ly = r.level * 7;
        let x = (r.x0 + r.x1) / 2 * C, z = (r.z0 + r.z1) / 2 * C, yaw = 0;
        const side = (r.fronts && r.fronts[0]) || 'N';
        const dirs = { N: [0, 1], S: [0, -1], W: [1, 0], E: [-1, 0] };
        const [dx, dz] = dirs[side];
        if (v.pos === 'front') { // just inside the entrance looking in
          if (side === 'N') z = r.z0 * C + 1.5; if (side === 'S') z = r.z1 * C - 1.5; if (side === 'W') x = r.x0 * C + 1.5; if (side === 'E') x = r.x1 * C - 1.5;
        } else if (v.pos === 'outside') {
          if (side === 'N') z = r.z0 * C - 3; if (side === 'S') z = r.z1 * C + 3; if (side === 'W') x = r.x0 * C - 3; if (side === 'E') x = r.x1 * C + 3;
        } else if (v.pos === 'corner') { x = r.x0 * C + 3; z = r.z0 * C + 3; }
        yaw = Math.atan2(-dx, -dz);
        if (v.pos === 'corner') yaw = Math.atan2(-1, -1);
        M.player.teleport(x + (v.ox || 0), ly + (v.dy || 0), z + (v.oz || 0));
        M.player.yaw = v.yaw !== undefined ? v.yaw : yaw;
        if (v.fly) M.player.pos.y = ly + v.dy;
      } else console.log('no room for', JSON.stringify(f));
    }
    if (v.esc !== undefined) { const e = M.mall.escalators[v.esc]; const C = 4; const back = e.t0 - e.dir * 7; const [x, z] = e.axis === 'z' ? [e.cc + (v.ox || 0), back] : [back, e.cc + (v.ox || 0)]; M.player.teleport(x, e.y0, z); M.player.yaw = e.axis === 'z' ? (e.dir > 0 ? Math.PI : 0) : (e.dir > 0 ? -Math.PI / 2 : Math.PI / 2); }
    if (v.stair !== undefined) { const st = M.mall.stairs[v.stair]; M.player.teleport((st.x0 + 0.5) * 4, (v.lv || 0) * 7, (st.z0 + 0.5) * 4); M.player.yaw = Math.PI; }
    if (v.lane) { // {main, level, off, t, axis}
      const lanes = v.lane.axis === 'x' ? M.mall.rowLanes : M.mall.colLanes;
      const ln = lanes.filter((l) => !!l.main === !!v.lane.main)[v.lane.idx || 0];
      const C = 4, lv = v.lane.level || 0;
      if (v.lane.axis === 'x') M.player.teleport(M.mall.W * C * (v.lane.t || 0.5), lv * 7 + (v.dy || 0), (ln.z0 + (v.lane.off ?? 0.5)) * C);
      else M.player.teleport((ln.x0 + (v.lane.off ?? 0.5)) * C, lv * 7 + (v.dy || 0), M.mall.H * C * (v.lane.t || 0.5));
      if (v.fly) M.player.pos.y = lv * 7 + v.dy;
    }
    if (v.yaw !== undefined && !v.find) M.player.yaw = v.yaw;
    M.player.pitch = v.pitch || 0;
    M.player.fly = !!v.fly;
    if (v.fly && !v.find && v.y !== undefined) { M.player.pos.y = v.y; }
    M.player.applyCamera(1, 0);
    M.world.update(M.player.pos.x, M.player.pos.z, M.player.level, 60000);
    if (v.map) { M.hud.openMap(true, M.player); if (v.map.level !== undefined) { M.hud.mapLevel = v.map.level; } if (v.map.zoom) M.hud.zoomAt(640, 360, v.map.zoom); M.hud.drawMap(); }
    else M.hud.openMap(false, M.player);
  }, v);
  await page.waitForTimeout(400);
  const info = await page.evaluate(() => { const M = window.__mall; M.setBloom(false); M.render(); const ri = M.renderer.info.render; const perf = `${ri.calls} draws ${Math.round(ri.triangles / 1000)}k tris`; M.setBloom(true); M.hud.locate(M.player.pos.x, M.player.pos.y, M.player.pos.z, M.player.level); M.hud.drawMini(M.player.pos.x, M.player.pos.z, M.player.yaw, M.player.level); M.render(); const r = M.renderer.info.render; return `${perf} chunks ${M.world.stats.chunks} loc ${document.getElementById('loc-name').textContent} / ${document.getElementById('loc-sub').textContent}`; });
  const name = `${out}/${String(i).padStart(2, '0')}-${v.name || 'view'}.png`;
  await page.screenshot({ path: name });
  console.log(name, info);
  i++;
}
await browser.close();
