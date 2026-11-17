// HUD, minimap and the full interactive mall map (with fast-travel)
import { CELL, LEVELS, LEVEL_NAMES, LEVEL_TITLES, E, li, levelY } from './config.js';
import { MAP_COLORS, STORE_CATS } from './catalog.js';
import { laneAt, blockAt } from './layout.js';

const PX = 4; // pixels per cell in the pre-rendered map images

export function roomColor(r) {
  if (!r) return null;
  if (r.kind === 'store') return MAP_COLORS[r.type] || storeHue(r.type);
  if (r.kind === 'attraction' || r.kind === 'void' || r.kind === 'venue') return MAP_COLORS[r.type] || MAP_COLORS.attraction;
  return MAP_COLORS[r.kind] || '#888';
}
const hueCache = {};
function storeHue(type) {
  if (hueCache[type]) return hueCache[type];
  const keys = Object.keys(STORE_CATS);
  const i = keys.indexOf(type);
  return (hueCache[type] = `hsl(${(i * 47) % 360},45%,62%)`);
}

export function renderLevelImages(mall) {
  const imgs = {};
  for (const l of LEVELS) {
    const c = document.createElement('canvas');
    c.width = mall.W * PX; c.height = mall.H * PX;
    const g = c.getContext('2d');
    g.fillStyle = '#0d1117'; g.fillRect(0, 0, c.width, c.height);
    for (let z = 0; z < mall.H; z++) for (let x = 0; x < mall.W; x++) {
      const r = mall.room(l, x, z);
      if (!r) continue;
      let col = roomColor(r);
      if (mall.isVoid(l, x, z)) col = r.kind === 'void' ? shade(roomColor(r), 0.55) : '#1d2a3a';
      g.fillStyle = col;
      g.fillRect(x * PX, z * PX, PX, PX);
    }
    // edges
    const ec = { [E.WALL]: '#20242c', [E.EXTERIOR]: '#000', [E.STOREFRONT]: '#4aa3ff', [E.ENTRANCE]: null, [E.DOOR]: '#ffcc33', [E.RAIL]: '#9fd3ff', [E.MAIN_ENTRANCE]: '#7CFC00', [E.WINDOW]: '#88ccff', [E.OPEN]: null, [E.GLASSWALL]: '#88ccff' };
    for (let z = 0; z < mall.H; z++) for (let x = 0; x <= mall.W; x++) {
      const t = mall.edgeV(l, x, z); const cc = ec[t];
      if (cc) { g.fillStyle = cc; g.fillRect(x * PX - (t === E.MAIN_ENTRANCE ? 1 : 0), z * PX, t === E.MAIN_ENTRANCE ? 3 : 1, PX); }
    }
    for (let z = 0; z <= mall.H; z++) for (let x = 0; x < mall.W; x++) {
      const t = mall.edgeH(l, x, z); const cc = ec[t];
      if (cc) { g.fillStyle = cc; g.fillRect(x * PX, z * PX - (t === E.MAIN_ENTRANCE ? 1 : 0), PX, t === E.MAIN_ENTRANCE ? 3 : 1); }
    }
    // escalators, elevators, stairs
    for (const e of mall.escalators) {
      if (e.level !== l && e.level + 1 !== l) continue;
      const t0 = e.t0 / CELL * PX, t1 = (e.t0 + e.dir * e.len) / CELL * PX, c0 = (e.cc / CELL) * PX;
      g.fillStyle = '#ff8c42';
      if (e.axis === 'z') g.fillRect(c0 - 3, Math.min(t0, t1), 6, Math.abs(t1 - t0));
      else g.fillRect(Math.min(t0, t1), c0 - 3, Math.abs(t1 - t0), 6);
    }
    if (l >= 0) for (const ev of mall.elevators) { g.fillStyle = '#c77dff'; g.fillRect(ev.cx * PX, ev.cz * PX, PX, PX); }
    for (const f of mall.fountains) if (l === 0) { g.fillStyle = '#4cc9f0'; g.beginPath(); g.arc(f.x / CELL * PX, f.z / CELL * PX, 4.5 / CELL * PX, 0, 7); g.fill(); }
    imgs[l] = c;
  }
  return imgs;
}
function shade(col, k) {
  const c = document.createElement('canvas').getContext('2d');
  c.fillStyle = col; const s = c.fillStyle; // normalises to #rrggbb
  const n = parseInt(s.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
}

export class HUD {
  constructor(mall, imgs, onTeleport) {
    this.mall = mall; this.imgs = imgs; this.onTeleport = onTeleport;
    this.el = {
      level: document.getElementById('loc-level'), name: document.getElementById('loc-name'), sub: document.getElementById('loc-sub'),
      prompt: document.getElementById('prompt'), mini: document.getElementById('minimap'), compass: document.getElementById('compass'),
      map: document.getElementById('mapview'), mapCanvas: document.getElementById('mapcanvas'), tabs: document.getElementById('maptabs'),
      stats: document.getElementById('perf'),
    };
    this.miniCtx = this.el.mini.getContext('2d');
    this.mapOpen = false; this.mapLevel = 0;
    this.view = { s: 1, ox: 0, oy: 0 };
    this.lastLoc = '';
    this.setupMap();
  }
  locate(px, py, pz, level) {
    const m = this.mall;
    const cx = Math.floor(px / CELL), cz = Math.floor(pz / CELL);
    const r = m.room(level, cx, cz);
    let name = 'Outside', sub = '';
    if (r) {
      if (r.kind === 'concourse') {
        name = laneAt(m, cx, cz);
        const b = nearestBlock(m, cx, cz);
        sub = b && b.district[Math.max(0, level)] ? b.district[Math.max(0, level)].name : 'Concourse';
        if (m.isVoid(level, cx, cz)) sub = 'Atrium';
      } else if (r.kind === 'store') { name = r.name; sub = `${STORE_CATS[r.type].label}${r.district ? ' · ' + r.district : ''}`; }
      else if (r.kind === 'service') { name = 'Service Corridor'; sub = 'Back of house · Staff only'; }
      else if (r.kind === 'back' || r.kind === 'basement') { name = r.name; sub = 'Back of house'; }
      else if (r.kind === 'void') { const p = m.rooms[r.parent]; name = p ? p.name : r.name; sub = 'Overlook'; }
      else if (r.kind === 'anchor') { name = r.name; sub = `Department Store · ${r.dept}`; }
      else if (r.kind === 'venue') { name = r.name; const p = r.parent != null ? m.rooms[r.parent] : null; sub = p ? p.name : 'Entertainment'; }
      else if (r.kind === 'attraction') { name = r.name; sub = 'Attraction'; }
      else if (r.kind === 'tunnel') { name = 'Utility Tunnels'; sub = 'Maintenance access'; }
      else if (r.kind === 'garage') { name = r.name; sub = 'Underground parking'; }
      else { name = r.name; sub = ''; }
    }
    const key = level + name + sub;
    if (key !== this.lastLoc) {
      this.lastLoc = key;
      this.el.level.textContent = LEVEL_NAMES[level];
      this.el.name.textContent = name;
      this.el.sub.textContent = sub;
    }
    return r;
  }
  drawMini(px, pz, yaw, level) {
    const g = this.miniCtx, c = this.el.mini, img = this.imgs[level];
    const S = c.width, scale = 0.9; // canvas px per map px
    g.fillStyle = '#0d1117'; g.fillRect(0, 0, S, S);
    const mx = (px / CELL) * PX, mz = (pz / CELL) * PX;
    g.save();
    g.translate(S / 2, S / 2);
    g.rotate(yaw);
    g.scale(scale, scale);
    g.imageSmoothingEnabled = false;
    g.drawImage(img, -mx, -mz);
    g.restore();
    // player arrow (always pointing up since map rotates)
    g.fillStyle = '#ff3355'; g.strokeStyle = '#fff'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(S / 2, S / 2 - 9); g.lineTo(S / 2 + 6, S / 2 + 7); g.lineTo(S / 2, S / 2 + 3); g.lineTo(S / 2 - 6, S / 2 + 7); g.closePath(); g.fill(); g.stroke();
    // north marker
    const nx = S / 2 + Math.sin(yaw) * (S / 2 - 10), ny = S / 2 - Math.cos(yaw) * (S / 2 - 10);
    g.fillStyle = '#fff'; g.font = 'bold 12px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', nx, ny);
    const deg = ((-yaw * 180) / Math.PI % 360 + 360) % 360;
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    this.el.compass.textContent = `${dirs[Math.round(deg / 45) % 8]} ${Math.round(deg)}°`;
  }
  // ------------------------------------------------------------------ full map
  setupMap() {
    const cv = this.el.mapCanvas;
    this.el.tabs.innerHTML = '';
    for (const l of [...LEVELS].reverse()) {
      const b = document.createElement('button');
      b.textContent = `${LEVEL_NAMES[l]}`; b.title = LEVEL_TITLES[l]; b.dataset.l = l;
      b.onclick = (e) => { e.stopPropagation(); this.mapLevel = l; this.drawMap(); };
      this.el.tabs.appendChild(b);
    }
    let drag = null, moved = 0;
    const pt = (e) => (e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY });
    const down = (e) => { drag = pt(e); moved = 0; };
    const move = (e) => {
      if (!drag) return;
      const p = pt(e);
      this.view.ox += p.x - drag.x; this.view.oy += p.y - drag.y; moved += Math.abs(p.x - drag.x) + Math.abs(p.y - drag.y);
      drag = p; this.drawMap();
    };
    const up = (e) => {
      if (drag && moved < 6) {
        const rect = cv.getBoundingClientRect();
        const p = e.changedTouches ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY } : { x: e.clientX, y: e.clientY };
        const mx = (p.x - rect.left - this.view.ox) / this.view.s, my = (p.y - rect.top - this.view.oy) / this.view.s;
        const cx = Math.floor(mx / PX), cz = Math.floor(my / PX);
        if (this.mall.hasFloor(this.mapLevel, cx, cz)) this.onTeleport((cx + 0.5) * CELL, levelY(this.mapLevel), (cz + 0.5) * CELL);
      }
      drag = null;
    };
    cv.addEventListener('mousedown', down); window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    cv.addEventListener('touchstart', down, { passive: true }); cv.addEventListener('touchmove', move, { passive: true }); cv.addEventListener('touchend', up);
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = cv.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const k = Math.exp(-e.deltaY * 0.0015);
      this.zoomAt(mx, my, k);
    }, { passive: false });
    document.getElementById('mapzoomin').onclick = (e) => { e.stopPropagation(); this.zoomAt(cv.width / 2, cv.height / 2, 1.5); };
    document.getElementById('mapzoomout').onclick = (e) => { e.stopPropagation(); this.zoomAt(cv.width / 2, cv.height / 2, 1 / 1.5); };
    window.addEventListener('resize', () => this.mapOpen && this.drawMap());
  }
  zoomAt(mx, my, k) {
    const s0 = this.view.s, s1 = Math.max(0.3, Math.min(12, s0 * k));
    this.view.ox = mx - (mx - this.view.ox) * (s1 / s0);
    this.view.oy = my - (my - this.view.oy) * (s1 / s0);
    this.view.s = s1;
    this.drawMap();
  }
  openMap(open, player) {
    this.mapOpen = open;
    this.el.map.style.display = open ? 'flex' : 'none';
    if (open) {
      this.player = player;
      this.mapLevel = player.level;
      const cv = this.el.mapCanvas;
      cv.width = cv.clientWidth; cv.height = cv.clientHeight;
      const s = Math.min(cv.width / (this.mall.W * PX), cv.height / (this.mall.H * PX)) * 2.2;
      this.view.s = s;
      this.view.ox = cv.width / 2 - (player.pos.x / CELL) * PX * s;
      this.view.oy = cv.height / 2 - (player.pos.z / CELL) * PX * s;
      this.drawMap();
    }
  }
  drawMap() {
    const cv = this.el.mapCanvas, g = cv.getContext('2d');
    if (cv.width !== cv.clientWidth || cv.height !== cv.clientHeight) { cv.width = cv.clientWidth; cv.height = cv.clientHeight; }
    const { s, ox, oy } = this.view, m = this.mall, l = this.mapLevel;
    for (const b of this.el.tabs.children) b.classList.toggle('on', +b.dataset.l === l);
    g.fillStyle = '#0a0d12'; g.fillRect(0, 0, cv.width, cv.height);
    g.save(); g.translate(ox, oy); g.scale(s, s);
    g.imageSmoothingEnabled = s < 1.5;
    g.drawImage(this.imgs[l], 0, 0);
    g.restore();
    const toS = (wx, wz) => [ox + (wx / CELL) * PX * s, oy + (wz / CELL) * PX * s];
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // store names when zoomed in
    const cellPx = PX * s;
    if (cellPx > 7) {
      g.font = `${Math.min(13, cellPx * 0.9)}px system-ui`;
      for (const r of m.rooms) {
        if (r.level !== l || r.x0 == null || (r.kind !== 'store' && r.kind !== 'back' && r.kind !== 'basement' && r.kind !== 'restroom' && r.kind !== 'garage' && !(r.kind === 'venue' && r.parent != null))) continue;
        const [sx, sy] = toS(((r.x0 + r.x1) / 2) * CELL, ((r.z0 + r.z1) / 2) * CELL);
        if (sx < -50 || sy < -20 || sx > cv.width + 50 || sy > cv.height + 20) continue;
        const wpx = (r.x1 - r.x0) * cellPx;
        const label = r.name;
        if (g.measureText(label).width > wpx * 1.05 && cellPx < 14) continue;
        g.fillStyle = r.kind === 'store' ? '#0b1a2e' : '#e8e8e8';
        g.fillText(label, sx, sy, wpx * 0.95);
      }
    }
    // lane names
    g.font = `600 ${Math.max(10, Math.min(16, cellPx * 1.6))}px system-ui`;
    for (const lb of m.labels) {
      if (lb.kind !== 'lane' || l < 0) continue;
      const ln = lb.lane;
      g.fillStyle = 'rgba(20,30,40,0.85)';
      if (lb.axis === 'z') {
        const [sx] = toS(((ln.x0 + ln.x1) / 2) * CELL, 0);
        for (let k = 0; k < 3; k++) {
          const wz = (m.H * CELL) * (0.2 + k * 0.3);
          const [, sy] = toS(0, wz);
          g.save(); g.translate(sx, sy); g.rotate(-Math.PI / 2); g.fillText(ln.name, 0, 0); g.restore();
        }
      } else {
        const [, sy] = toS(0, ((ln.z0 + ln.z1) / 2) * CELL);
        for (let k = 0; k < 3; k++) { const [sx] = toS((m.W * CELL) * (0.2 + k * 0.3), 0); g.fillText(ln.name, sx, sy); }
      }
    }
    // big labels
    for (const lb of m.labels) {
      if (lb.kind === 'lane') continue;
      if (!(lb.level === l || (lb.level === 9 && l >= 0) || (lb.kind === 'atrium' && l >= 0))) continue;
      if (lb.kind === 'atrium' && cellPx < 6) continue;
      const [sx, sy] = toS(lb.x, lb.z);
      g.font = `700 ${lb.kind === 'atrium' ? 11 : Math.max(12, Math.min(20, cellPx * 2.6))}px system-ui`;
      const w = g.measureText(lb.text).width;
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(sx - w / 2 - 6, sy - 11, w + 12, 22);
      g.fillStyle = '#fff'; g.fillText(lb.text, sx, sy);
    }
    // player
    const p = this.player;
    if (p) {
      const [sx, sy] = toS(p.pos.x, p.pos.z);
      g.save(); g.translate(sx, sy); g.rotate(-p.yaw);
      g.fillStyle = p.level === l ? '#ff3355' : 'rgba(255,51,85,0.45)'; g.strokeStyle = '#fff'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, -12); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
    // scale bar
    const meters = 100, len = (meters / CELL) * PX * s;
    g.fillStyle = '#fff'; g.fillRect(20, cv.height - 30, len, 4);
    g.font = '12px system-ui'; g.textAlign = 'left'; g.fillText(`${meters} m`, 20, cv.height - 42);
  }
}

function nearestBlock(m, cx, cz) {
  let best = null, bd = 1e9;
  for (const col of m.blocks) for (const b of col) {
    if (!b.exists) continue;
    const dx = Math.max(b.x0 - cx, 0, cx - b.x1), dz = Math.max(b.z0 - cz, 0, cz - b.z1);
    const d = dx + dz;
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}
