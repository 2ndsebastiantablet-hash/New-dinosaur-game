// Global world constants
export const CELL = 4;            // metres per grid cell
export const LEVEL_H = 7;         // floor-to-floor height
export const SLAB = 0.45;         // slab thickness
export const CEIL = LEVEL_H - SLAB; // clear height of a level (6.55m)
export const LEVELS = [-1, 0, 1, 2];
export const TOP = 2;
export const LEVEL_NAMES = { '-1': 'B1', '0': 'L1', '1': 'L2', '2': 'L3' };
export const LEVEL_TITLES = { '-1': 'Basement · Service & Parking', '0': 'Level 1 · Ground', '1': 'Level 2', '2': 'Level 3 · Upper' };
export const CHUNK = 10;          // cells per chunk side (40m)
export const levelY = (l) => l * LEVEL_H;
export const li = (l) => l + 1;   // level -> array index

// Edge types
export const E = {
  NONE: 0, WALL: 1, STOREFRONT: 2, ENTRANCE: 3, DOOR: 4, RAIL: 5,
  EXTERIOR: 6, MAIN_ENTRANCE: 7, WINDOW: 8, OPEN: 9, GLASSWALL: 10, NORAIL: 11,
};
export const BLOCKING = new Set([E.WALL, E.STOREFRONT, E.RAIL, E.EXTERIOR, E.MAIN_ENTRANCE, E.WINDOW, E.GLASSWALL]);
