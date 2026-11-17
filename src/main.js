import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { generateMall } from './layout.js';
import { makeMaterials } from './materials.js';
import { World } from './world.js';
import { Player } from './player.js';
import { HUD, renderLevelImages } from './ui.js';
import { CELL, LEVEL_NAMES, CHUNK, levelY } from './config.js';
import { STORE_CATS } from './catalog.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const hashSeed = /^#seed-(\d+)$/.exec(location.hash);
let seed = hashSeed ? parseInt(hashSeed[1], 10) : parseInt(params.get('seed'), 10);
if (!Number.isFinite(seed)) seed = Math.floor(Math.random() * 1e6);

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const setLoading = (t) => { $('loading-text').textContent = t; };

// ------------------------------------------------------------------ renderer
const renderer = new THREE.WebGLRenderer({ antialias: !isTouch, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.25 : 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.78;
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const BG = new THREE.Color(0xa9c9ea);
scene.background = BG;
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 1200);
scene.add(camera);
const pmrem = new THREE.PMREMGenerator(renderer);
// soft "mall interior" environment for reflections: warm grey hall with rows of ceiling panels
function makeEnvScene() {
  const s = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(80, 24, 80), new THREE.MeshBasicMaterial({ color: 0x8c877e, side: THREE.BackSide }));
  room.position.y = 9; s.add(room);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ color: 0x57524a }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2.9; s.add(floor);
  const lm = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.1, 2.9) });
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5), lm);
    p.rotation.x = Math.PI / 2; p.position.set(i * 10, 20.9, j * 10); s.add(p);
  }
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(20, 80), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.8, 2.1) }));
  sky.rotation.x = Math.PI / 2; sky.position.set(0, 20.8, 0); s.add(sky);
  return s;
}
scene.environment = pmrem.fromScene(makeEnvScene(), 0.03).texture;
scene.environmentIntensity = 0.9;
const hemi = new THREE.HemisphereLight(0xfff4e6, 0x7a6e60, 1.05);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dd, 0.0);
sun.position.set(0.35, 1, 0.25);
scene.add(sun);
const fog = new THREE.Fog(0xb9b2a6, 60, 260);
scene.fog = fog;
const flashlight = new THREE.SpotLight(0xfff2dd, 0, 45, 0.48, 0.55, 1.1);
flashlight.position.set(0.25, -0.2, 0);
camera.add(flashlight);
camera.add(flashlight.target);
flashlight.target.position.set(0, -0.3, -5);

let composer = null, bloomOn = !isTouch;
function setupComposer() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.35, 0.4, 1.5);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
}

// ------------------------------------------------------------------ state
let mall, mats, world, player, hud;
const input = { forward: 0, strafe: 0, sprint: false, jump: false, up: 0, down: 0, lookX: 0, lookY: 0 };
const keys = new Set();
let running = false, paused = true, elevatorOpen = false, nearElevator = null, showPerf = false;

let ground = null;
async function boot() {
  setLoading('Painting textures & materials…');
  await nextFrame();
  mats = makeMaterials(isTouch);
  // the parking lot / plaza around the building (seen from entrances and drone mode)
  const gt = mats._tex.garage.clone();
  const size = 2400;
  gt.repeat.set(size / 8, size / 8); gt.needsUpdate = true;
  ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: gt, color: 0x8a8a88, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  setupComposer();
  await buildMall(seed);
  window.__THREE = THREE;
  window.__mall = { get mall() { return mall; }, get world() { return world; }, get player() { return player; }, camera, renderer, scene, render: renderOnce, get hud() { return hud; }, mats, setBloom: (b) => { bloomOn = b; } };
  if (params.has('shot')) window.__noloop = true;
  running = true;
  requestAnimationFrame(loop);
}

async function buildMall(newSeed) {
  seed = newSeed;
  try { history.replaceState(null, '', `#seed-${seed}`); } catch (e) { /* sandboxed */ }
  $('loading').style.display = 'flex';
  setLoading(`Generating mall #${seed} — floor plan…`);
  await nextFrame();
  const t0 = performance.now();
  mall = generateMall(seed);
  setLoading('Drawing the mall directory…');
  await nextFrame();
  const imgs = renderLevelImages(mall);
  if (world) world.dispose();
  world = new World(mall, mats, scene);
  ground.position.set((mall.W * CELL) / 2, -0.12, (mall.H * CELL) / 2);
  world.setRadius(isTouch ? 4 : 6);
  if (!player) player = new Player(camera, world); else player.world = world;
  player.fly = false;
  player.spawn(mall.spawn);
  player.yaw = bestYaw(mall.spawn);
  if (!hud) hud = new HUD(mall, imgs, (x, y, z) => { player.teleport(x, y, z); toggleMap(false); });
  else hud.setMall(mall, imgs);
  setLoading('Building the area around you…');
  await nextFrame();
  world.update(player.pos.x, player.pos.z, player.level, 2500);
  // start screen stats
  const s = mall.stats;
  $('stats').innerHTML = [
    ['Footprint', `${s.width} × ${s.depth} m`], ['Walkable floor area', `${(s.floorArea / 1e6).toFixed(2)} km²`],
    ['Shops', s.stores.toLocaleString()], ['Department stores', s.anchors], ['Attractions & venues', s.venues],
    ['Cafés & restaurants', s.restaurants], ['Back-of-house rooms', s.backrooms], ['Escalators', s.escalators],
    ['Glass elevators', s.elevators], ['Service stairwells', s.stairwells], ['Levels', '3 retail + basement'],
  ].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
  $('seed').value = seed;
  $('attractions').innerHTML = mall.groups.map((g) => `<li>${g.name}</li>`).join('') +
    mall.rooms.filter((r) => r.kind === 'venue' && r.parent == null).map((r) => `<li>${r.name} <i>${LEVEL_NAMES[r.level]}</i></li>`).join('');
  $('loading').style.display = 'none';
  $('start').style.display = 'flex';
  console.log(`Mall generated in ${(performance.now() - t0).toFixed(0)}ms`, s);
}

function bestYaw(sp) {
  let best = 0, bd = -1;
  for (const [yaw, dx, dz] of [[0, 0, -1], [Math.PI, 0, 1], [Math.PI / 2, -1, 0], [-Math.PI / 2, 1, 0]]) {
    let d = 0, x = sp.x, z = sp.z;
    while (d < 400 && mall.hasFloor(0, Math.floor(x / CELL), Math.floor(z / CELL))) { x += dx * 2; z += dz * 2; d += 2; }
    if (d > bd) { bd = d; best = yaw; }
  }
  return best;
}

// ------------------------------------------------------------------ input
const canvas = renderer.domElement;
// Pointer lock can be unavailable (e.g. inside an embedded/sandboxed page): fall back to drag-to-look
let dragLook = false, dragging = false;
function enableDragLook() {
  if (dragLook) return;
  dragLook = true;
  flash('Mouse look: click and drag to look around');
}
function lockPointer() {
  if (isTouch || dragLook) return;
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => enableDragLook()); } catch (e) { enableDragLook(); }
}
document.addEventListener('pointerlockerror', enableDragLook);
function start() {
  $('start').style.display = 'none';
  $('hud').style.display = 'block';
  paused = false;
  if (!isTouch) lockPointer();
  else $('touch').style.display = 'block';
}
$('enter').onclick = start;
const regen = async (v) => { $('start').style.display = 'none'; await buildMall(v); };
$('reseed').onclick = () => { const v = parseInt($('seed').value, 10); regen(Number.isFinite(v) ? v : Math.floor(Math.random() * 1e6)); };
$('random').onclick = () => regen(Math.floor(Math.random() * 1e6));
canvas.addEventListener('click', () => { if (!paused && !isTouch && !dragLook && document.pointerLockElement !== canvas && !hud.mapOpen && !elevatorOpen) lockPointer(); });
canvas.addEventListener('mousedown', () => { dragging = true; });
window.addEventListener('mouseup', () => { dragging = false; });
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== canvas && !paused && !hud.mapOpen && !elevatorOpen && !isTouch && !dragLook) { paused = true; $('pause').style.display = 'flex'; }
});
$('resume').onclick = () => { $('pause').style.display = 'none'; paused = false; lockPointer(); };
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) { input.lookX += e.movementX * 0.0022; input.lookY += e.movementY * 0.0022; }
  else if (dragLook && dragging && !paused && !hud.mapOpen && !elevatorOpen) { input.lookX += e.movementX * 0.004; input.lookY += e.movementY * 0.004; }
});
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  keys.add(e.code);
  if (e.code === 'KeyM' || (e.code === 'Escape' && hud && hud.mapOpen)) { toggleMap(); e.preventDefault(); return; }
  if (e.code === 'Escape' && dragLook && !paused && !elevatorOpen) { paused = true; $('pause').style.display = 'flex'; }
  if (e.code === 'KeyG' && player) { player.fly = !player.fly; flash(player.fly ? 'Drone mode ON — fly freely (Space/C up/down)' : 'Drone mode OFF'); }
  if (e.code === 'KeyF') { flashlight.intensity = flashlight.intensity ? 0 : 60; }
  if (e.code === 'KeyB') { bloomOn = !bloomOn; flash(`Bloom ${bloomOn ? 'on' : 'off'}`); }
  if (e.code === 'F3' || e.code === 'KeyP') { showPerf = !showPerf; $('perf').style.display = showPerf ? 'block' : 'none'; e.preventDefault(); }
  if (e.code === 'BracketRight') { world.setRadius(Math.min(10, world.radius + 1)); flash(`View distance ${world.radius * CHUNK * CELL} m`); }
  if (e.code === 'BracketLeft') { world.setRadius(Math.max(2, world.radius - 1)); flash(`View distance ${world.radius * CHUNK * CELL} m`); }
  if (e.code === 'KeyE') useAction();
  if (elevatorOpen && /^Digit[1-4]$/.test(e.code)) { const n = +e.code.slice(5); pickFloor(n === 4 ? -1 : n - 1); }
  if (e.code === 'KeyH') $('help').classList.toggle('show');
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
function readKeys() {
  if (isTouch) return;
  input.forward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  input.strafe = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  input.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
  input.jump = keys.has('Space') && !player.fly;
  input.up = keys.has('Space') ? 1 : 0;
  input.down = keys.has('KeyC') || keys.has('ControlLeft') ? 1 : 0;
}
function toggleMap(force) {
  const open = force === undefined ? !hud.mapOpen : force;
  hud.openMap(open, player);
  if (open) { if (document.pointerLockElement) document.exitPointerLock(); }
  else if (!isTouch && !paused) lockPointer();
}
let flashT = 0;
function flash(t) { $('flash').textContent = t; $('flash').style.opacity = 1; flashT = 2.2; }

// elevators
function useAction() {
  if (elevatorOpen) { closeElevator(); return; }
  if (nearElevator) {
    elevatorOpen = true;
    if (document.pointerLockElement) document.exitPointerLock();
    const p = $('elevator');
    p.style.display = 'flex';
    const btns = $('elevator-btns');
    btns.innerHTML = '';
    for (const l of [2, 1, 0]) {
      const b = document.createElement('button');
      b.innerHTML = `<b>${LEVEL_NAMES[l]}</b><span>${['Ground · Entrances', 'Level 2', 'Level 3 · Skylights'][l]}</span>`;
      if (l === player.level) b.classList.add('here');
      b.onclick = () => pickFloor(l);
      btns.appendChild(b);
    }
  }
}
function pickFloor(l) {
  if (!nearElevator || l < 0) return;
  const ev = nearElevator;
  const dx = player.pos.x - ev.x, dz = player.pos.z - ev.z, d = Math.hypot(dx, dz) || 1;
  $('fade').style.opacity = 1;
  setTimeout(() => {
    player.teleport(ev.x + (dx / d) * 2.4, levelY(l), ev.z + (dz / d) * 2.4);
    $('fade').style.opacity = 0;
    flash(`${LEVEL_NAMES[l]} — doors opening`);
  }, 350);
  closeElevator();
}
function closeElevator() {
  elevatorOpen = false; $('elevator').style.display = 'none';
  if (!isTouch && !paused) lockPointer();
}
$('elevator-close').onclick = closeElevator;

// ------------------------------------------------------------------ touch controls
if (isTouch) {
  const stick = $('stick'), knob = $('knob');
  let stickId = null, lookId = null, sx = 0, sy = 0, lx = 0, ly = 0;
  const T = $('touch');
  T.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) {
      if (t.target.closest('.tbtn')) continue;
      if (t.clientX < window.innerWidth * 0.45 && stickId === null) {
        stickId = t.identifier; sx = t.clientX; sy = t.clientY;
        stick.style.left = `${sx - 60}px`; stick.style.top = `${sy - 60}px`; stick.style.opacity = 1;
      } else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
    }
  }, { passive: true });
  T.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        let dx = t.clientX - sx, dy = t.clientY - sy; const d = Math.hypot(dx, dy), m = 55;
        if (d > m) { dx *= m / d; dy *= m / d; }
        knob.style.transform = `translate(${dx}px,${dy}px)`;
        input.strafe = dx / m; input.forward = -dy / m;
        input.sprint = d > m * 0.98 && runToggle;
      } else if (t.identifier === lookId) {
        input.lookX += (t.clientX - lx) * 0.005; input.lookY += (t.clientY - ly) * 0.005; lx = t.clientX; ly = t.clientY;
      }
    }
  }, { passive: true });
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) { stickId = null; input.forward = input.strafe = 0; knob.style.transform = ''; stick.style.opacity = 0.35; }
      if (t.identifier === lookId) lookId = null;
    }
  };
  T.addEventListener('touchend', end); T.addEventListener('touchcancel', end);
  let runToggle = true;
  const bind = (id, down, up) => { const b = $(id); b.addEventListener('touchstart', (e) => { e.preventDefault(); down(); }, { passive: false }); if (up) b.addEventListener('touchend', (e) => { e.preventDefault(); up(); }, { passive: false }); };
  bind('t-jump', () => { input.jump = true; input.up = 1; }, () => { input.jump = false; input.up = 0; });
  bind('t-down', () => { input.down = 1; }, () => { input.down = 0; });
  bind('t-map', () => toggleMap());
  bind('t-use', () => useAction());
  bind('t-fly', () => { player.fly = !player.fly; flash(player.fly ? 'Drone mode ON' : 'Drone mode OFF'); });
  bind('t-light', () => { flashlight.intensity = flashlight.intensity ? 0 : 60; });
}

// ------------------------------------------------------------------ loop
const clock = new THREE.Clock();
let ambient = 1, fpsAcc = 0, fpsN = 0, fps = 0;
const fogCol = new THREE.Color(), fogTarget = new THREE.Color();
const ZONE_LIGHT = { concourse: 1, store: 1, anchor: 1, restroom: 0.95, service: 0.62, back: 0.6, stair: 0.6, tunnel: 0.34, garage: 0.5, basement: 0.42, attraction: 1.05, void: 1 };
const DARK = new Set(['bowling', 'cinema', 'auditorium', 'arcade', 'minigolf', 'aquarium', 'arena', 'casinoLounge']);

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.1);
  if (!running || window.__noloop) return;
  if (!paused && !hud.mapOpen && !elevatorOpen) { readKeys(); player.update(dt, input); input.jump = isTouch ? input.jump : false; }
  else player.applyCamera(dt, 0);
  const lvl = player.level;
  world.update(player.pos.x, player.pos.z, lvl, 6);
  const room = hud.locate(player.pos.x, player.pos.y, player.pos.z, lvl);
  hud.drawMini(player.pos.x, player.pos.z, player.yaw, lvl);
  // ambience
  let target = room ? (ZONE_LIGHT[room.kind] ?? 1) : 1;
  if (room && DARK.has(room.type)) target = 0.5;
  if (player.fly && player.pos.y > 22) target = 1;
  ambient += (target - ambient) * Math.min(1, dt * 2.5);
  hemi.intensity = 1.05 * ambient;
  
  scene.environmentIntensity = 0.9 * (0.4 + 0.6 * ambient);
  fogTarget.set(lvl < 0 ? 0x1e2024 : 0xb9b2a6).multiplyScalar(lvl < 0 ? 1 : 0.55 + 0.45 * ambient);
  fogCol.copy(fog.color).lerp(fogTarget, Math.min(1, dt * 2));
  fog.color.copy(fogCol);
  const range = world.radius * CHUNK * CELL;
  fog.far = lvl < 0 ? Math.min(140, range) : range * 0.95;
  fog.near = lvl < 0 ? 15 : 60;
  mats.outdoor.visible = player.pos.y < 19;
  // elevator proximity
  nearElevator = null;
  if (lvl >= 0) for (const ev of mall.elevators) if (Math.hypot(ev.x - player.pos.x, ev.z - player.pos.z) < 3.2) nearElevator = ev;
  $('prompt').style.display = nearElevator && !elevatorOpen ? 'block' : 'none';
  if (flashT > 0) { flashT -= dt; if (flashT <= 0) $('flash').style.opacity = 0; }
  renderOnce();
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  if (showPerf) {
    const i = renderer.info.render;
    $('perf').textContent = `${fps.toFixed(0)} fps · ${i.calls} draws · ${(i.triangles / 1000).toFixed(0)}k tris · ${world.stats.chunks} chunks · queue ${world.queue.length} · x ${player.pos.x.toFixed(0)} y ${player.pos.y.toFixed(1)} z ${player.pos.z.toFixed(0)}`;
  }
}
function renderOnce() {
  if (bloomOn && composer) composer.render(); else renderer.render(scene, camera);
}
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
});

boot().catch((e) => { console.error(e); setLoading('Error: ' + e.message); });
