# MEGAMALL

A procedurally generated, open-world **mega mall** you can explore in first person in the browser. Every seed builds a different mall. This stage of the project covers the **map/world only**: survival systems, items and NPCs come later.

The art style is realistic rather than voxel. Surfaces are polished marble, wood, glass storefronts, cinder-block back corridors and concrete parking decks, all lit with physically based materials and bloom.

## Scale

A typical seed produces:

| | |
|---|---|
| Footprint | ~750 m × 800 m |
| Walkable floor area | ~1.6 km² over 4 levels (3 retail levels + basement) |
| Shops | ~1,000–1,250 fictional brands across 33 categories, with signs |
| Department stores | 5 anchors, each with three floors and its own escalators |
| Attractions & venues | ~20 |
| Escalators | ~120–160 |
| Back-of-house rooms | ~550 |

## What's in the mall

- **Boulevards and atriums.** Wide main boulevards are open from the ground floor up to skylights, with glass balconies, bridges, escalator banks, fountains, hanging banners, kiosks and planters. Narrower avenues have glass elevators.
- **Districts.** Each wing has a theme that sets its store mix: Fashion District, Luxury Galleria, Tech Quarter, Kids' Kingdom, Dining Terrace, Beauty Boulevard, Culture Corner and others.
- **Stores furnished by category.** Clothing racks and fitting rooms, shoe walls, TV walls and laptop tables, bookcases, supermarket-style aisles, jewelry cases, guitar walls, salons, cafés and restaurants with kitchens, pet aquariums, furniture showrooms, and more.
- **Multi-storey attractions:**
  - Galaxy Adventure Park: roller coaster, Ferris wheel, drop tower, swing ride, carousel, teacups, bumper cars and food stalls under a glass roof
  - Tidal Wave Waterpark: pools, slide towers and palms
  - Polar Peak Snow Dome: a walkable 17 m indoor ski slope with a chairlift
  - Evergreen Botanical Atriums
  - Glacier Ice Arena
  - Deep Blue Aquarium, with a walk-through tunnel
  - Dino Discovery Hall: dinosaur skeletons
  - Mega Events Arena
- **Whole-block venues:**
  - Strike Zone Bowling (about 30 lanes)
  - MegaPlex Cinemas 20: lobby plus auditoriums
  - Grand Food Courts
  - Pixel Palace Arcade
  - Bounce Universe trampoline park
  - Glow Putt mini golf
  - Iron Peak gym
  - FreshWay Hypermarket
  - Jungle Jam play zone
  - The Grand Mall Hotel lobby
  - Skyline Lounge & Billiards
- **Backrooms.** "STAFF ONLY" doors lead into service-corridor rings behind every block of shops. Off those corridors are storage rooms with pallet racking, mechanical and electrical rooms, server rooms, security offices, break rooms, loading docks and stairwells.
- **Basement (B1).** A grid of utility tunnels full of pipes runs under every boulevard, linking underground car parks, boiler rooms, generator rooms, water-tank rooms and waste and loading areas.
- **Outside.** Grand glass entrances at the ends of the boulevards open onto a plaza. Drone mode shows the roof with its skylight lanterns.

## Interactivity

Look at something and press **E** (or USE on touch). Over 40 kinds of things respond.

- **Doors.** Every staff, stairwell and back-room door opens and closes with E, blocks you while it's closed, and swings shut on its own after a while. The grand entrances have automatic sliding doors that lead out to the plaza.
- **Rides.** Galaxy Comet Coaster (a full lap with a chain lift and speed from gravity), Ferris wheel, carousel, drop tower, swing ride, teacups, drivable bumper cars, four water slides that end in a splash in the pool, and the ski chairlift to the summit. You keep free look while riding, and E gets you off.
- **Surfaces.**
  - Ice rinks are slippery.
  - Pools are recessed and swimmable: you float at the surface, Space swims up or climbs out, C dives, and there are steps and walls.
  - Fountains and ponds can be waded into.
  - Trampolines bounce you higher if you time your jumps.
  - The foam pit is soft.
  - The snow slope slides you downhill; hold C to tuck for speed.
- **Games.**
  - Bowling with physics pins, scoring and an automatic pinsetter.
  - Mini-golf with putting, a stroke count and hole-in-one detection.
  - A playable arcade game ("Neon Dodge") on every cabinet.
  - Claw machines that sometimes win you a plush toy.
- **Dispensers and buttons.**
  - Food and drink: vending machines, food stalls, coffee machines and popcorn.
  - Machines: ATMs and cash registers.
  - Emergency controls: fire alarm pull stations (siren and strobe), escalator emergency stops, and electrical breakers (the lights flicker).
  - Other buttons: elevator calls, steam valves and the hotel bell.
- **Everyday objects.**
  - Sit on benches, sofas and cinema seats; lie on beds and loungers.
  - Run on treadmills and ride exercise bikes.
  - Play pianos and strum guitars, wash your hands at restroom sinks, toss coins in fountains, feed the fish.
  - Read museum plaques, check computers, open lockers and try car doors.
  - Watch films playing in the cinema auditoriums.
- **Physics props.** Anything you buy or take off a shelf becomes a physical object: drinks, food, books, products, gifts, balls and boxes. Objects bounce, roll down ramps, float in water and slide on ice. You can carry them, throw them (click), drop them (Q), kick them or put them in a bin.
- **Sound.** Synthesized sound effects and crowd ambience. Press N for mall music and K to mute.

## Running it

```bash
npm install
npm run dev        # open the printed URL
npm run build      # static build in dist/
```

Pick a seed on the start screen, or open the page with `#seed-12345` (or `?seed=12345`) in the URL to share a specific mall.

## Controls

| Key | Action |
|---|---|
| WASD / arrows | walk |
| Shift | run |
| Space | jump (drone mode: up) |
| C / Ctrl | crouch (drone mode: down) |
| Mouse | look (click to capture; falls back to click-and-drag) |
| M | mall map: drag to pan, scroll to zoom, click to fast-travel, level tabs |
| E | interact with whatever you're looking at: doors, rides, seats, machines, items |
| Click / Q | throw / drop the item you're holding |
| N / K | mall music / mute |
| G | drone mode: fly anywhere, sprint for speed |
| F | flashlight (useful in the basement) |
| [ / ] | view distance |
| B | bloom on/off |
| P | performance stats |
| H | help |

On touch devices you get a virtual joystick, drag-to-look, and on-screen buttons.

## How it works

| File | Role |
|---|---|
| `src/layout.js` | Pure-data generator: a 4 m cell grid per level with rooms, atrium voids and wall edges (walls, storefronts, entrances, doors, railings, facades), plus escalators, stairwells, elevators, ramps and static colliders. Runs in ~150 ms and also works in Node (`node tools/ascii.mjs <seed> <level>` prints an ASCII plan). |
| `src/structure.js` | Long-range "shell" for each 40 m chunk: floors, ceilings and lights, walls, storefront glazing, railings, skylights, roof, entrances, escalators, stairs, elevators, fountains, and a sign atlas texture per chunk. |
| `src/decor.js`, `src/props.js` | Short-range furnishing for every room type, plus long-range landmarks such as the coaster, Ferris wheel and slides. |
| `src/world.js` | Streams chunks around the player on every relevant level within a per-frame time budget, and handles collision queries. |
| `src/materials.js` | All opaque surfaces share one material backed by a texture array; each vertex carries roughness, metalness, texture layer and emissive. A chunk therefore renders in a handful of draw calls. All textures are painted procedurally on canvases, so there are no image assets. |
| `src/player.js` | Capsule-vs-box collisions, gravity, walkable ramps (stairs, escalators, ski slope), moving escalator steps, drone mode. |
| `src/ui.js` | Location readout, rotating minimap, full map with fast travel. |
| `src/features.js` | Gameplay plans shared by the renderer and the simulation: physics zones (ice, water, trampolines, foam, snow), recessed pools, and ride layouts. |
| `src/interact.js` | Targeting, prompts and actions for every interactable, plus openable doors, sliding entrance doors, bowling pins, mini-golf and cinema screens. |
| `src/rides.js` | The rides and their moving parts. |
| `src/phys.js` | The physics props. |
| `src/audio.js`, `src/fx.js` | Synthesized audio and particles. |
| `src/arcade.js` | The arcade mini-game. |

Dev tools in `tools/` drive headless Chromium for screenshots (`shot.mjs`), draw-call profiling (`diag.mjs`) and physics checks (`physics.mjs`), interaction/ride tests (`interact-test.mjs`) and gameplay screenshots (`play-shots.mjs`). They need `npm run build && npx vite preview --port 4173` running first.
