// Room-local frames: front side of a room at local z=0, depth along +z, width along +x.
import { CELL } from './config.js';

export function frameOf(room, side) {
  side = side || (room.fronts && room.fronts[0]) || room.stripSide || 'N';
  const { x0, x1, z0, z1 } = room;
  if (side === 'N') return { ox: x0 * CELL, oz: z0 * CELL, rot: 0, w: (x1 - x0) * CELL, d: (z1 - z0) * CELL, side };
  if (side === 'S') return { ox: x1 * CELL, oz: z1 * CELL, rot: Math.PI, w: (x1 - x0) * CELL, d: (z1 - z0) * CELL, side };
  if (side === 'W') return { ox: x0 * CELL, oz: z1 * CELL, rot: Math.PI / 2, w: (z1 - z0) * CELL, d: (x1 - x0) * CELL, side };
  return { ox: x1 * CELL, oz: z0 * CELL, rot: -Math.PI / 2, w: (z1 - z0) * CELL, d: (x1 - x0) * CELL, side };
}
export function toWorld(f, lx, lz) {
  const c = Math.cos(f.rot), s = Math.sin(f.rot);
  return [f.ox + lx * c + lz * s, f.oz - lx * s + lz * c];
}
