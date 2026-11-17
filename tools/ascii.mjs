import { generateMall } from '../src/layout.js';
import { E, li } from '../src/config.js';
const seed = +(process.argv[2] || 12345);
const lvl = +(process.argv[3] ?? 0);
const t = performance.now();
const m = generateMall(seed);
console.log('gen ms', (performance.now() - t).toFixed(0), 'W', m.W, 'H', m.H, m.stats);
const ch = { concourse: '.', store: 's', service: '#', back: 'b', stair: 'S', restroom: 'r', tunnel: 't', garage: 'g', basement: 'm', void: '~', anchor: 'A', venue: 'V', attraction: 'P' };
let out = '';
for (let z = 0; z < m.H; z++) {
  let row = '';
  for (let x = 0; x < m.W; x++) {
    const r = m.room(lvl, x, z);
    if (!r) { row += ' '; continue; }
    if (m.isVoid(lvl, x, z)) { row += r.kind === 'stair' ? 'v' : '~'; continue; }
    if (m.reserved[li(lvl)].has(m.idx(x, z))) { row += '*'; continue; }
    row += ch[r.kind] || '?';
  }
  out += row + '\n';
}
console.log(out);
