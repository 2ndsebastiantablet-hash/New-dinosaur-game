import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
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
let seed = parseInt(params.get('seed'), 10);
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
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.5;
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
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.45, 0.45, 1.5);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
}

// ------------------------------------------------------------------ state
let mall, mats, world, player, hud;
const input = { forward: 0, strafe: 0, sprint: false, jump: false, up: 0, down: 0, lookX: 0, lookY: 0 };
const keys = new Set();
let running = false, paused = true, elevatorOpen = false, nearElevator = null, showPerf = false;

async function boot() {
  setLoading('Generating floor plan…');
  await nextFrame();
  const t0 = performance.now();
  mall = generateMall(seed);
  setLoading('Painting textures & materials…');
  await nextFrame();
  mats = makeMaterials(isTouch);
  setLoading('Drawing the mall directory…');
  await nextFrame();
  const imgs = renderLevelImages(mall);
  world = new World(mall, mats, scene);
  world.setRadius(isTouch ? 4 : 6);
  player = new Player(camera, world);
  player.spawn(mall.spawn);
  // face down the longest open direction from spawn
  player.yaw = bestYaw(mall.spawn);
  hud = new HUD(mall, imgs, (x, y, z) => { player.teleport(x, y, z); toggleMap(false); });
  setLoading('Building the area around you…');
  await nextFrame();
  world.update(player.pos.x, player.pos.z, player.level, 2500);
  setupComposer();
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
  window.__THREE = THREE;
  window.__mall = { mall, world, player, camera, renderer, scene, render: renderOnce, hud, mats, setBloom: (b) => { bloomOn = b; } };
  if (params.has('shot')) window.__noloop = true;
  running = true;
  requestAnimationFrame(loop);
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
function start() {
  $('start').style.display = 'none';
  $('hud').style.display = 'block';
  paused = false;
  if (!isTouch) canvas.requestPointerLock();
  else $('touch').style.display = 'block';
}
$('enter').onclick = start;
$('reseed').onclick = () => { const v = parseInt($('seed').value, 10); location.search = `?seed=${Number.isFinite(v) ? v : Math.floor(Math.random() * 1e6)}`; };
$('random').onclick = () => { location.search = `?seed=${Math.floor(Math.random() * 1e6)}`; };
canvas.addEventListener('click', () => { if (!paused && !isTouch && document.pointerLockElement !== canvas && !hud.mapOpen && !elevatorOpen) canvas.requestPointerLock(); });
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== canvas && !paused && !hud.mapOpen && !elevatorOpen && !isTouch) { paused = true; $('pause').style.display = 'flex'; }
});
$('resume').onclick = () => { $('pause').style.display = 'none'; paused = false; canvas.requestPointerLock(); };
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) { input.lookX += e.movementX * 0.0022; input.lookY += e.movementY * 0.0022; }
});
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  keys.add(e.code);
  if (e.code === 'KeyM' || (e.code === 'Escape' && hud && hud.mapOpen)) { toggleMap(); e.preventDefault(); }
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
  else if (!isTouch && !paused) canvas.requestPointerLock();
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
  if (!isTouch && !paused) canvas.requestPointerLock();
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
  
  scene.environmentIntensity = 0.5 * (0.4 + 0.6 * ambient);
  fogTarget.set(lvl < 0 ? 0x1e2024 : 0xb9b2a6).multiplyScalar(lvl < 0 ? 1 : 0.55 + 0.45 * ambient);
  fogCol.copy(fog.color).lerp(fogTarget, Math.min(1, dt * 2));
  fog.color.copy(fogCol);
  const range = world.radius * CHUNK * CELL;
  fog.far = lvl < 0 ? Math.min(140, range) : range * 0.95;
  fog.near = lvl < 0 ? 15 : 60;
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
