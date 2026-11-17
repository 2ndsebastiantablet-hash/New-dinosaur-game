// Spatial hash of axis-aligned boxes used for collision (no three.js dependency)
import { CELL } from './config.js';

const BUCKET = 8; // metres

export class ColliderGrid {
  constructor() { this.map = new Map(); }
  key(bx, bz) { return bx * 73856093 ^ bz * 19349663; }
  add(box, owner = null) {
    // box: {x0,y0,z0,x1,y1,z1}
    box.owner = owner;
    const bx0 = Math.floor(box.x0 / BUCKET), bx1 = Math.floor(box.x1 / BUCKET);
    const bz0 = Math.floor(box.z0 / BUCKET), bz1 = Math.floor(box.z1 / BUCKET);
    for (let bx = bx0; bx <= bx1; bx++) for (let bz = bz0; bz <= bz1; bz++) {
      const k = this.key(bx, bz);
      let arr = this.map.get(k);
      if (!arr) { arr = []; this.map.set(k, arr); }
      arr.push(box);
    }
    return box;
  }
  removeOwner(owner, boxes) {
    for (const box of boxes) {
      const bx0 = Math.floor(box.x0 / BUCKET), bx1 = Math.floor(box.x1 / BUCKET);
      const bz0 = Math.floor(box.z0 / BUCKET), bz1 = Math.floor(box.z1 / BUCKET);
      for (let bx = bx0; bx <= bx1; bx++) for (let bz = bz0; bz <= bz1; bz++) {
        const k = this.key(bx, bz);
        const arr = this.map.get(k);
        if (!arr) continue;
        const f = arr.filter((b) => b.owner !== owner);
        if (f.length) this.map.set(k, f); else this.map.delete(k);
      }
    }
  }
  query(x0, z0, x1, z1, out) {
    const bx0 = Math.floor(x0 / BUCKET), bx1 = Math.floor(x1 / BUCKET);
    const bz0 = Math.floor(z0 / BUCKET), bz1 = Math.floor(z1 / BUCKET);
    for (let bx = bx0; bx <= bx1; bx++) for (let bz = bz0; bz <= bz1; bz++) {
      const arr = this.map.get(this.key(bx, bz));
      if (arr) for (const b of arr) if (!out.includes(b)) out.push(b);
    }
    return out;
  }
}

export function box(x0, y0, z0, x1, y1, z1) {
  return { x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1) };
}

export { CELL };
