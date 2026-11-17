// Catalog of everything that can exist in the mall: store categories, attractions,
// back-of-house rooms, districts and the fictional brand-name generator.

// floor: material key, wall: interior wall colour, accent: sign colours
export const STORE_CATS = {
  fashion:    { label: 'Fashion',          floor: 'wood',    wall: [0.93, 0.91, 0.88], light: 'warm' },
  denim:      { label: 'Denim & Casual',   floor: 'concrete',wall: [0.80, 0.82, 0.86], light: 'warm' },
  shoes:      { label: 'Footwear',         floor: 'wood',    wall: [0.95, 0.95, 0.95], light: 'cool' },
  kids:       { label: 'Kids Fashion',     floor: 'carpet',  wall: [0.98, 0.93, 0.80], light: 'warm' },
  sportswear: { label: 'Sportswear',       floor: 'rubber',  wall: [0.25, 0.27, 0.30], light: 'cool' },
  luxury:     { label: 'Luxury Boutique',  floor: 'marble',  wall: [0.20, 0.18, 0.17], light: 'warm' },
  jewelry:    { label: 'Jewelry',          floor: 'carpet',  wall: [0.18, 0.16, 0.22], light: 'warm' },
  watches:    { label: 'Watches',          floor: 'marble',  wall: [0.25, 0.25, 0.27], light: 'warm' },
  electronics:{ label: 'Electronics',      floor: 'tile',    wall: [0.97, 0.97, 0.98], light: 'cool' },
  phones:     { label: 'Mobile & Tech',    floor: 'wood',    wall: [0.95, 0.95, 0.96], light: 'cool' },
  gaming:     { label: 'Video Games',      floor: 'carpet',  wall: [0.12, 0.12, 0.18], light: 'neon' },
  books:      { label: 'Books',            floor: 'wood',    wall: [0.55, 0.40, 0.28], light: 'warm' },
  toys:       { label: 'Toys',             floor: 'tile',    wall: [0.98, 0.98, 0.95], light: 'cool' },
  home:       { label: 'Home & Décor',     floor: 'wood',    wall: [0.90, 0.88, 0.84], light: 'warm' },
  furniture:  { label: 'Furniture',        floor: 'concrete',wall: [0.92, 0.92, 0.92], light: 'warm' },
  beauty:     { label: 'Beauty',           floor: 'tile',    wall: [0.98, 0.94, 0.95], light: 'cool' },
  pharmacy:   { label: 'Pharmacy',         floor: 'tile',    wall: [0.96, 0.98, 0.98], light: 'cool' },
  sports:     { label: 'Sporting Goods',   floor: 'rubber',  wall: [0.88, 0.90, 0.92], light: 'cool' },
  outdoor:    { label: 'Outdoor & Camping',floor: 'wood',    wall: [0.55, 0.60, 0.50], light: 'warm' },
  music:      { label: 'Music Instruments',floor: 'wood',    wall: [0.30, 0.22, 0.18], light: 'warm' },
  pets:       { label: 'Pet Store',        floor: 'tile',    wall: [0.85, 0.93, 0.90], light: 'cool' },
  cafe:       { label: 'Café',             floor: 'wood',    wall: [0.70, 0.55, 0.42], light: 'warm' },
  restaurant: { label: 'Restaurant',       floor: 'wood',    wall: [0.45, 0.30, 0.25], light: 'warm' },
  candy:      { label: 'Candy & Sweets',   floor: 'tile',    wall: [0.99, 0.85, 0.90], light: 'cool' },
  grocery:    { label: 'Market',           floor: 'tile',    wall: [0.95, 0.96, 0.92], light: 'cool' },
  optical:    { label: 'Optical',          floor: 'wood',    wall: [0.95, 0.95, 0.95], light: 'cool' },
  gifts:      { label: 'Gifts & Cards',    floor: 'wood',    wall: [0.96, 0.92, 0.86], light: 'warm' },
  art:        { label: 'Art Gallery',      floor: 'concrete',wall: [0.98, 0.98, 0.98], light: 'cool' },
  bank:       { label: 'Bank',             floor: 'marble',  wall: [0.85, 0.87, 0.90], light: 'cool' },
  salon:      { label: 'Hair Salon',       floor: 'tile',    wall: [0.20, 0.20, 0.22], light: 'warm' },
  arcadeMini: { label: 'Game Zone',        floor: 'carpet',  wall: [0.10, 0.08, 0.15], light: 'neon' },
  lingerie:   { label: 'Lingerie',         floor: 'carpet',  wall: [0.80, 0.55, 0.62], light: 'warm' },
  bags:       { label: 'Bags & Luggage',   floor: 'wood',    wall: [0.42, 0.33, 0.28], light: 'warm' },
  vacant:     { label: 'Coming Soon',      floor: 'concrete',wall: [0.75, 0.75, 0.73], light: 'cool' },
};

// District themes: weighted store category mixes
export const DISTRICTS = [
  { name: 'Fashion District', mix: { fashion: 6, denim: 3, shoes: 3, lingerie: 1, bags: 2, kids: 1, cafe: 1 } },
  { name: 'Luxury Galleria', mix: { luxury: 6, jewelry: 3, watches: 2, bags: 2, beauty: 1, art: 1, restaurant: 1 } },
  { name: 'Tech Quarter', mix: { electronics: 5, phones: 3, gaming: 3, arcadeMini: 1, cafe: 1, optical: 1 } },
  { name: 'Home & Living', mix: { home: 5, furniture: 4, gifts: 2, art: 1, cafe: 1 } },
  { name: "Kids' Kingdom", mix: { toys: 6, kids: 4, candy: 3, gaming: 1, pets: 2 } },
  { name: 'Sports Arena District', mix: { sportswear: 5, sports: 4, outdoor: 3, shoes: 2, pharmacy: 1 } },
  { name: 'Beauty Boulevard', mix: { beauty: 6, salon: 3, pharmacy: 2, optical: 1, lingerie: 1, cafe: 1 } },
  { name: 'Dining Terrace', mix: { restaurant: 6, cafe: 4, candy: 2, grocery: 1 } },
  { name: 'Culture Corner', mix: { books: 5, music: 3, art: 3, gifts: 2, cafe: 2 } },
  { name: 'Global Bazaar', mix: { gifts: 3, grocery: 2, bags: 2, fashion: 2, candy: 2, pets: 1, bank: 1 } },
];

// Attractions. span: blocks wide/deep; levels: how many levels tall (from base level)
export const MULTI_ATTRACTIONS = [
  { type: 'themepark', name: 'Galaxy Adventure Park', bw: 2, bd: 2, height: 3, count: 1, floor: 'pavement' },
  { type: 'waterpark', name: 'Tidal Wave Waterpark', bw: 2, bd: 1, height: 3, count: 1, floor: 'poolTile' },
  { type: 'skislope', name: 'Polar Peak Snow Dome', bw: 2, bd: 1, height: 3, count: 1, floor: 'snow', chance: 0.85 },
  { type: 'garden', name: 'Evergreen Botanical Atrium', names: ['Evergreen Botanical Atrium', 'Lotus Sky Garden'], bw: 1, bd: 1, height: 3, count: 2, floor: 'grass' },
  { type: 'icerink', name: 'Glacier Ice Arena', bw: 1, bd: 1, height: 2, count: 1, floor: 'rubber' },
  { type: 'aquarium', name: 'Deep Blue Aquarium', bw: 1, bd: 1, height: 2, count: 1, floor: 'darkTile' },
  { type: 'museum', name: 'Dino Discovery Hall', bw: 1, bd: 1, height: 2, count: 1, floor: 'marble' },
  { type: 'arena', name: 'Mega Events Arena', bw: 1, bd: 1, height: 2, count: 1, floor: 'concrete', chance: 0.7 },
];

// Single-level, whole-block venues: preferred level(s)
export const BLOCK_VENUES = [
  { type: 'bowling', name: 'Strike Zone Bowling', levels: [1], count: 1, floor: 'carpet' },
  { type: 'cinema', name: 'MegaPlex Cinemas 20', levels: [2], count: 1, floor: 'carpet' },
  { type: 'foodcourt', name: 'Grand Food Court', names: ['Sky Terrace Food Court', 'Grand Food Court'], levels: [2, 1], count: 2, floor: 'tile' },
  { type: 'arcade', name: 'Pixel Palace Arcade', levels: [1, 2], count: 1, floor: 'neonCarpet' },
  { type: 'trampoline', name: 'Bounce Universe', levels: [2], count: 1, floor: 'rubber' },
  { type: 'minigolf', name: 'Glow Putt Mini Golf', levels: [2], count: 1, floor: 'darkTile' },
  { type: 'gym', name: 'Iron Peak Fitness', levels: [2], count: 1, floor: 'rubber' },
  { type: 'supermarket', name: 'FreshWay Hypermarket', levels: [0], count: 1, floor: 'tile' },
  { type: 'kidszone', name: 'Jungle Jam Play Zone', levels: [1], count: 1, floor: 'rubber' },
  { type: 'hotel', name: 'The Grand Mall Hotel', levels: [0], count: 1, floor: 'marble' },
  { type: 'casinoLounge', name: 'Skyline Lounge & Billiards', levels: [2], count: 1, floor: 'carpet' },
];

export const ANCHOR_NAMES = [
  'Harrowgate & Finch', 'Maison Lumière', 'Bellamy Department Store', 'Northcrest', 'The Emporium',
  'Sterling & Rowe', 'Galleria Moda', 'Ashford House', 'Vantage Department Store', 'Halcyon & Co.',
];

export const BACKROOMS = [
  ['storage', 4], ['stockroom', 3], ['mechanical', 2], ['electrical', 1.5], ['security', 0.7],
  ['breakroom', 1], ['janitor', 0.8], ['office', 1], ['server', 0.6], ['trash', 0.6], ['loading', 0.8],
];

export const BASEMENT_ROOMS = [
  ['mechanical', 3], ['boiler', 2], ['electrical', 2], ['generator', 1.5], ['storage', 4],
  ['watertank', 1.5], ['loading', 2], ['trash', 1], ['security', 0.6], ['server', 0.8], ['laundry', 0.6],
];

export const BACKROOM_LABELS = {
  storage: 'Storage', stockroom: 'Stock Room', mechanical: 'Mechanical Room', electrical: 'Electrical Room',
  security: 'Security Office', breakroom: 'Staff Break Room', janitor: "Janitor's Closet", office: 'Management Office',
  server: 'Server Room', trash: 'Waste & Recycling', loading: 'Loading Dock', boiler: 'Boiler Room',
  generator: 'Generator Room', watertank: 'Water Tank Room', laundry: 'Laundry',
};

export const LANE_NAMES = [
  'Grand', 'Crystal', 'Palm', 'Sapphire', 'Orchid', 'Harbor', 'Sunset', 'Aurora', 'Galleria', 'Emerald',
  'Royal', 'Liberty', 'Coral', 'Willow', 'Monarch', 'Starlight', 'Cedar', 'Maple', 'Summit', 'Bayview',
  'Silver', 'Golden', 'Lotus', 'Meridian', 'Juniper', 'Riviera', 'Oasis', 'Horizon',
];

// ---------------- Fictional brand name generator ----------------
const NAMEPARTS = {
  fashion: [['Urban', 'Velvet', 'Nova', 'Maple', 'Atlas', 'Linen', 'Ivory', 'Saffron', 'Muse', 'Kestrel', 'Noir', 'Sable', 'Wren', 'Juno'], ['& Co.', 'Apparel', 'Studio', 'Collective', 'Wear', 'Atelier', 'Clothing', 'House', 'Label', 'Threads']],
  denim: [['Indigo', 'Rivet', 'Raw', 'Blue Mile', 'Stitch', 'Canyon', 'Selvedge'], ['Denim', 'Jeans Co.', 'Supply', 'Workshop', 'Outfitters']],
  shoes: [['Stride', 'Sole', 'Step', 'Heel', 'Lace', 'Walker', 'Cobble', 'Arch'], ['Shoes', 'Footwear', '& Sole', 'Shoe Co.', 'Kicks', 'Boutique']],
  kids: [['Little', 'Tiny', 'Sprout', 'Bumble', 'Pebble', 'Acorn'], ['Ones', 'Steps', 'Kids', 'Wardrobe', 'Threads']],
  sportswear: [['Velo', 'Peak', 'Pulse', 'Apex', 'Stride', 'Vault', 'Kinetic', 'Sprint'], ['Athletics', 'Sport', 'Active', 'Performance', 'Gear']],
  luxury: [['Maison', 'Casa', 'Atelier', 'Palazzo', 'Bellini', 'Laurent', 'Vionne', 'Castellane', 'Orsini'], ['Rossi', 'Vale', 'Duval', 'Marchetti', 'Moreau', 'Aurelia', 'Valois']],
  jewelry: [['Diamond', 'Gilded', 'Opal', 'Sterling', 'Aurum', 'Lustre', 'Prism'], ['Jewelers', '& Gems', 'Fine Jewelry', 'Atelier', 'Vault']],
  watches: [['Chrono', 'Tempus', 'Meridian', 'Horologe', 'Second Hand', 'Tick'], ['Watches', 'Timepieces', '& Time', 'Horology']],
  electronics: [['Volt', 'Circuit', 'Byte', 'Pixel', 'Nexus', 'Quantum', 'Ion', 'Signal'], ['Electronics', 'Tech', 'Digital', 'World', 'Hub', 'Store']],
  phones: [['Signal', 'Connect', 'Ring', 'Wave', 'Link', 'Orbit'], ['Mobile', 'Phones', 'Wireless', 'Tech']],
  gaming: [['Level Up', 'Respawn', 'Pixel', 'Joystick', 'Boss Fight', 'Combo'], ['Games', 'Gaming', 'Arcade Store', 'Exchange']],
  books: [['Paper', 'Inkwell', 'Chapter', 'Folio', 'Quill', 'Margin', 'Lantern'], ['Books', '& Pages', 'Booksellers', 'Reads', 'Library Shop']],
  toys: [['Toy', 'Wonder', 'Giggle', 'Rocket', 'Puzzle', 'Marble', 'Teddy'], ['Planet', 'Box', 'Workshop', 'Town', 'Galaxy', 'Factory']],
  home: [['Hearth', 'Nest', 'Linden', 'Willow', 'Haven', 'Oak'], ['& Home', 'Living', 'Interiors', 'Décor', 'House']],
  furniture: [['Nord', 'Timber', 'Loft', 'Form', 'Plank', 'Habitat'], ['Furniture', 'Design', 'Living', 'Home Co.', 'Studio']],
  beauty: [['Glow', 'Bloom', 'Lumi', 'Rosé', 'Petal', 'Aura', 'Silk'], ['Beauty', 'Cosmetics', 'Skin', 'Lab', 'Parfumerie']],
  pharmacy: [['Well', 'Care', 'Health', 'Green Cross', 'Remedy'], ['Pharmacy', 'Drugstore', 'Chemist', 'Plus']],
  sports: [['Champion', 'Field', 'Goal', 'Summit', 'Victory', 'Endzone'], ['Sports', 'Sporting Goods', 'Athletics', 'Pro Shop']],
  outdoor: [['Trail', 'Ridge', 'Basecamp', 'Timberline', 'Wild', 'Compass'], ['Outfitters', 'Outdoor', 'Supply', 'Gear Co.']],
  music: [['Tempo', 'Chord', 'Encore', 'Harmony', 'Riff', 'Octave'], ['Music', 'Guitars', 'Instruments', 'Sound']],
  pets: [['Paws', 'Whisker', 'Fetch', 'Furry', 'Tails'], ['& Claws', 'Pet Shop', 'Pets', 'Pet Supply']],
  cafe: [['Bean', 'Brew', 'Crema', 'Roast', 'Steam', 'Mocha', 'Daily Grind'], ['Café', 'Coffee', 'Espresso Bar', 'Roasters']],
  restaurant: [['Olive', 'Saffron', 'Ember', 'Bamboo', 'Harbor', 'Tavola', 'Smoke', 'Kumo'], ['Kitchen', 'Grill', 'Bistro', 'Trattoria', 'Noodle House', 'Steakhouse', 'Sushi Bar']],
  candy: [['Sugar', 'Sweet', 'Lolli', 'Candy', 'Fudge', 'Gumdrop'], ['Rush', 'Shoppe', 'Factory', 'Land', 'Jar']],
  grocery: [['Fresh', 'Green', 'Daily', 'Corner', 'Harvest'], ['Market', 'Grocer', 'Deli', 'Pantry']],
  optical: [['Vision', 'Focus', 'Clear', 'Iris', 'Lens'], ['Optical', 'Eyewear', 'Optics', 'Specs']],
  gifts: [['Wrapped', 'Keepsake', 'Ribbon', 'Treasure', 'Postmark'], ['Gifts', 'Cards', 'Emporium', 'Corner']],
  art: [['Canvas', 'Easel', 'Fresco', 'Prism', 'Gallery'], ['Gallery', 'Art Space', 'Fine Art', 'Studio']],
  bank: [['First Meridian', 'Harbor', 'Summit', 'Unity', 'Crown'], ['Bank', 'Savings', 'Credit Union', 'Financial']],
  salon: [['Shear', 'Mane', 'Lux', 'Curl', 'Strand'], ['Salon', 'Hair Studio', 'Barbers', 'Style Bar']],
  arcadeMini: [['Neon', 'Joy', 'Coin', 'Turbo'], ['Arcade', 'Game Zone', 'Play']],
  lingerie: [['Silk', 'Lace', 'Velour', 'Blush'], ['Intimates', 'Lingerie', '& Lace']],
  bags: [['Satchel', 'Voyage', 'Carry', 'Tote', 'Nomad'], ['Bags', 'Luggage', 'Leather Goods', 'Travel']],
  vacant: [['Coming Soon'], ['']],
};

export function brandName(cat, rng) {
  const p = NAMEPARTS[cat] || NAMEPARTS.fashion;
  if (cat === 'vacant') return 'Coming Soon';
  if (cat === 'luxury' && rng.chance(0.5)) return rng.pick(p[1]).toUpperCase();
  const a = rng.pick(p[0]);
  if (rng.chance(0.12)) return a;
  return `${a} ${rng.pick(p[1])}`.trim();
}

// Sign styles
export const SIGN_FONTS = ['Georgia', 'Helvetica', 'Arial Black', 'Trebuchet MS', 'Palatino', 'Futura', 'Verdana', 'Didot', 'Impact', 'Courier New'];
export const SIGN_PALETTES = [
  ['#111111', '#ffffff'], ['#ffffff', '#111111'], ['#0b2545', '#f4d35e'], ['#7a0019', '#ffffff'],
  ['#1b4332', '#d8f3dc'], ['#f8f4e3', '#8a1c1c'], ['#000000', '#d4af37'], ['#e63946', '#ffffff'],
  ['#264653', '#e9c46a'], ['#ffb703', '#023047'], ['#3a0ca3', '#f72585'], ['#f1faee', '#1d3557'],
  ['#2b2d42', '#8d99ae'], ['#ff006e', '#ffffff'], ['#006d77', '#edf6f9'], ['#14213d', '#fca311'],
];

// Map colours per room kind / type (used by minimap)
export const MAP_COLORS = {
  concourse: '#e9e3d6', store: '#8fb3d9', service: '#6b6b70', back: '#55555c', stair: '#d97a3d',
  restroom: '#9ad1d4', tunnel: '#3e4a52', garage: '#7c8590', basement: '#4d4f57', void: '#1d2633',
  anchor: '#b48ed8', attraction: '#f2a65a', themepark: '#ff6f59', waterpark: '#2ec4f1', skislope: '#e0f4ff',
  garden: '#6ab04c', icerink: '#bde0fe', aquarium: '#1e6fbf', museum: '#c9a66b', arena: '#e85d75',
  bowling: '#f7b267', cinema: '#a05195', foodcourt: '#f4d35e', arcade: '#ef476f', trampoline: '#06d6a0',
  minigolf: '#43aa8b', gym: '#577590', supermarket: '#90be6d', kidszone: '#ffd166', hotel: '#d4a373',
  casinoLounge: '#7b2cbf', vacant: '#a8a8a8',
};
