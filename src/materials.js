// Material system.
// All opaque lit surfaces share ONE MeshStandardMaterial ("surface") that samples a texture ARRAY.
// Each vertex carries (roughness, metalness, layer) so floors, walls, props etc. of a whole chunk
// render in a single draw call. Named materials (marble, wood, metal...) are lightweight aliases.
import * as THREE from 'three';
import { makeTextures } from './textures.js';

// layer name -> [roughness, metalness]
const SURFACES = {
  white: [0.6, 0], marble: [0.2, 0], darkTile: [0.25, 0], wood: [0.42, 0], carpet: [1, 0], neonCarpet: [0.95, 0],
  concrete: [0.85, 0], garage: [0.7, 0], tile: [0.35, 0], poolTile: [0.2, 0], rubber: [0.95, 0], pavement: [0.8, 0],
  grass: [1, 0], snow: [0.6, 0], ice: [0.1, 0], plaster: [0.88, 0], stone: [0.5, 0], ceilingTile: [1, 0],
  cinder: [0.95, 0], brick: [0.9, 0], metal: [0.35, 0.85], fabric: [1, 0], products: [0.6, 0], books: [0.8, 0],
  garments: [1, 0], rollup: [0.5, 0.6], foliage: [0.85, 0], lane: [0.15, 0], steps: [0.4, 0.6],
  screen: [0.3, 0], posters: [0.5, 0],
};

export function makeMaterials(lowMem = false) {
  const T = makeTextures();
  const M = {};
  const SZ = lowMem ? 256 : 512;
  const names = Object.keys(SURFACES);
  const data = new Uint8Array(SZ * SZ * 4 * names.length);
  const cv = document.createElement('canvas'); cv.width = cv.height = SZ;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const rep = {};
  names.forEach((n, i) => {
    if (n === 'white') { g.fillStyle = '#fff'; g.fillRect(0, 0, SZ, SZ); rep[n] = 1; }
    else { g.drawImage(T[n].image, 0, 0, SZ, SZ); rep[n] = 1 / T[n].repeat.x; }
    data.set(g.getImageData(0, 0, SZ, SZ).data, i * SZ * SZ * 4);
  });
  const arr = new THREE.DataArrayTexture(data, SZ, SZ, names.length);
  arr.format = THREE.RGBAFormat; arr.type = THREE.UnsignedByteType;
  arr.wrapS = arr.wrapT = THREE.RepeatWrapping;
  arr.minFilter = THREE.LinearMipmapLinearFilter; arr.magFilter = THREE.LinearFilter;
  arr.generateMipmaps = true; arr.anisotropy = 8;
  arr.colorSpace = THREE.SRGBColorSpace;
  arr.needsUpdate = true;

  const surface = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  surface.name = 'surface';
  surface.userData.srf = true;
  surface.onBeforeCompile = (sh) => {
    sh.uniforms.uLayers = { value: arr };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 srf;\nvarying vec4 vSrf;\nvarying vec2 vSUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSrf = srf;\nvSUv = uv;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nprecision highp sampler2DArray;\nuniform sampler2DArray uLayers;\nvarying vec4 vSrf;\nvarying vec2 vSUv;')
      .replace('#include <map_fragment>', 'diffuseColor *= texture(uLayers, vec3(vSUv, floor(vSrf.z + 0.5)));')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vSrf.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vSrf.y;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vSrf.w;\ndiffuseColor.rgb *= (1.0 - min(vSrf.w, 1.0));');
  };
  surface.customProgramCacheKey = () => 'surface-array';
  M._surface = surface;
  const alias = (name, layer, rough, metal, cs = 1, emis = 0) => {
    const L = names.indexOf(layer);
    M[name] = { name, isAlias: true, userData: { alias: surface, rm: [rough, metal], layer: L, rep: rep[layer], cs, emis } };
  };
  for (const n of names) if (n !== 'white') alias(n, n, SURFACES[n][0], SURFACES[n][1]);
  // emissive surfaces (lights, neon, screens, posters) also live in the surface material
  alias('light', 'white', 1, 0, 2.2, 1); alias('neon', 'white', 1, 0, 1.6, 1); alias('dark', 'white', 1, 0, 0.05, 1);
  alias('screen', 'screen', 0.3, 0, 1.3, 1); alias('posters', 'posters', 0.5, 0, 1.1, 1);
  alias('paint', 'plaster', 0.8, 0);
  alias('chrome', 'white', 0.25, 1.0);
  alias('plastic', 'white', 0.5, 0);
  alias('gloss', 'white', 0.18, 0);
  alias('matte', 'white', 0.92, 0);
  alias('leather', 'white', 0.45, 0);
  alias('bark', 'white', 0.95, 0);
  alias('gold', 'white', 0.28, 1.0);

  // transparent
  M.glass = new THREE.MeshStandardMaterial({ color: 0xbfd9e0, transparent: true, opacity: 0.14, roughness: 0.04, metalness: 0.1, envMapIntensity: 0.7, depthWrite: false, side: THREE.DoubleSide, vertexColors: true });
  M.glass.name = 'glass';
  M.water = new THREE.MeshStandardMaterial({ map: T.water, color: 0xffffff, transparent: true, opacity: 0.8, roughness: 0.12, metalness: 0.0, envMapIntensity: 0.55, vertexColors: true });
  M.water.name = 'water';
  M.tank = new THREE.MeshStandardMaterial({ color: 0x2a7fb8, transparent: true, opacity: 0.45, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide, vertexColors: true, envMapIntensity: 1.0 });
  M.tank.name = 'tank';
  const basic = (name, o) => { M[name] = new THREE.MeshBasicMaterial({ vertexColors: true, ...o }); M[name].name = name; };
  basic('sky', { map: T.sky, color: new THREE.Color(1.0, 1.0, 1.04), fog: false });
  basic('outdoor', { map: T.outdoor, color: new THREE.Color(1.4, 1.4, 1.4), fog: false });
  M.shadow = new THREE.MeshBasicMaterial({ map: T.shadow, transparent: true, depthWrite: false, color: 0x000000, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  M.shadow.name = 'shadow';
  for (const k of ['glass', 'water', 'tank', 'shadow']) M[k].userData.transparent = true;
  M._tex = T;
  return M;
}
