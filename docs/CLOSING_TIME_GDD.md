# CLOSING TIME — Complete Game Design Document

**Working title:** CLOSING TIME  
**Genre:** Cooperative VR workplace simulator / survival horror / chaos management  
**Players:** 5–10 online co-op (five-player minimum; designed primarily for groups of friends)  
**Perspective:** First-person VR, tracked hands and head  
**Movement:** Arm-swinging, hand-driven locomotion inspired by Gorilla Tag  
**Campaign:** Nine workdays; each open-store shift lasts exactly 10 minutes  
**Document status:** Living design specification — updated with Amendment 1  

---

## 0. Instructions for the implementation team

Treat this document as the source of truth for the first playable version. Preserve the game's defining combination of **physical VR work, overlapping responsibilities, suspicious customers, escalating supernatural threats, and a shared five-star store rating**. Do not turn the game into a conventional wave-based monster shooter or a menu-driven tycoon game. The store should feel like a real, physical place that players operate with their hands while trying to notice everything going wrong around them.

The details below are a complete proposed baseline. Numerical values such as penalties, spawn rates, prices, and task durations are starting balance values, not untouchable laws. Put them in data/configuration assets so they can be tuned without rewriting systems.

### Non-negotiable design requirements

1. Support **5–10 players per active game**. A lobby must have at least five players before a weekly run can begin.
2. Five roles are mandatory in every run: **Manager, Checkout Operator, Store Clerk, Janitor, and Shelf Stocker**. These roles are assigned first, one to each of five different players. Any additional players (up to five) receive unique randomly selected specialties from the remaining role pool. No two players share a role in the same run. The assigned role remains theirs for the nine-day run.
3. The game has **30 total job specialties**, including the five mandatory roles. The mandatory role slots are guaranteed; the remaining players’ specialties are randomly selected from the other 25 roles.
4. The store has an unlimited-duration, safe preparation phase before every workday. No customers, pests, or monsters attack during preparation. Preparation is limited to staging and setup; operational work does not begin until the store opens.
5. Any player can initiate opening the store by default. A lobby setting may restrict this to the host or the Shift Manager role.
6. Every open-store day lasts **10 real-time minutes**. The clock does not pause while players are talking, hiding, or doing tasks.
7. Each day begins at **five stars**. The team shares one rating visible to every player. Bad service, dirt, empty shelves, theft, damage, pests, and monster incidents reduce the rating. Corrective work can restore lost rating before the team reaches one star.
8. Reaching **one star** triggers the supernatural District Manager fail sequence. The team is eliminated and the weekly run restarts at Day 1.
9. The campaign contains **nine days**. Survive Day 9 to complete the week and receive a final team score.
10. The team's score is shared equally among eligible workers and converted into persistent worker coins. Worker coins are used for cosmetics and personal customization. Store funds are a separate run-based economy used for store upgrades, equipment, supplies, and operational perks.
11. The experience must be genuinely playable in VR: grabbing, carrying, scanning, stocking, cleaning, repairing, locking, pushing, using tools, and interacting with NPCs must use tracked hands and physical objects wherever practical.
12. Threats must create different problems and counterplay. Do not make every monster a fast enemy that simply chases players.
13. Essential tasks must remain possible even when the corresponding specialist role is absent. A specialist performs that work faster, more safely, or with extra information; a missing role must not soft-lock a run.

### Design assumptions used to complete the brief

- The game is cooperative, not player-versus-player. Players may joke, bump into each other, or accidentally get in one another's way, but deliberate teammate killing is not a core mechanic.
- The active game requires 5–10 human players. A separate developer/test override may bypass the minimum for solo testing and QA, but normal public and private lobbies enforce five players.
- Job assignment is random and unique per player for the entire nine-day run. Roles are rerolled when a new weekly run begins.
- Preparation is genuinely untimed. The open-store portion alone uses the 10-minute clock.
- The one-star event is a true campaign fail state. Recovering rating is possible before one star, not after the District Manager has triggered the wipe.
- “Pests” is the in-world operational category for nuisances and threats. Human intruders are defined by harmful behavior (theft, harassment, vandalism, trespassing, or robbery), not by poverty or housing status. Do not portray homelessness itself as a monster or an evil trait.

---

# 1. Game vision

## 1.1 High concept

A group of employees must keep a strange grocery store operating for nine increasingly dangerous workdays. Each worker has a randomized job specialty, but no one can focus on only one thing. Customers need help, shelves empty, deliveries arrive, spills spread, pests get into food, suspicious people steal merchandise, and monsters disguise themselves as ordinary shoppers. The team must serve customers, maintain the store, protect the building, and identify threats before the store's shared reputation collapses.

The horror comes from **workload and uncertainty** as much as from monsters. A player may be scanning groceries while hearing a crash in the next aisle, noticing a customer standing motionless, receiving a radio call about a freezer alarm, and seeing the star rating drop. The player must decide what deserves attention first and communicate with the team.

## 1.2 Core player fantasy

“I have a job, a physical workplace, tools, coworkers, and a shift to survive. I know how to do my job, but I cannot control everything happening in the store. My friends and I have to coordinate under pressure, notice what is wrong, and get through the day.”

## 1.3 Design pillars

### Pillar A — Physical work, not menu work

Most important actions happen in the world. Players lift boxes, place products, wipe spills, scan barcodes, push carts, repair equipment, turn keys, check cameras, inspect customers, and close doors with their hands. Menus support the experience; they do not replace it.

### Pillar B — Too many things happening at once

The store creates overlapping demands. A task can be simple in isolation but stressful when three other issues emerge. The director should create pressure through timing, competing priorities, and information gaps—not through unfair instant failure.

### Pillar C — Jobs create teamwork, not dependency traps

Every role has a meaningful specialty. The team benefits from a well-rounded roster, but players can cross-cover tasks when a specialist is busy, incapacitated, or absent.

### Pillar D — Customers are believable until they are not

Most customers are ordinary shoppers with understandable goals. Some have extra mechanics or hidden agendas. Monsters can imitate customer behavior, and the team must observe patterns rather than rely only on obvious visual tells.

### Pillar E — Consequences are visible and recoverable

The star rating, customer mood, cleanliness, inventory, power, and security state make the store's condition understandable. Players can fix many mistakes. A run should fail because the team allowed problems to compound, not because the game hid an unavoidable rule.

### Pillar F — Every week tells a different story

Customer combinations, special modifiers, event timing, threat mixes, and the store's upgrade choices change each run. The nine-day arc is consistent, but the exact incidents should not be identical.

## 1.4 Intended emotional rhythm

- **Preparation:** calm, social, strategic, and tactile.
- **Opening minutes:** busy but understandable; players settle into roles.
- **Middle of shift:** overlapping requests, time pressure, and first suspicious incidents.
- **Late shift:** high pressure, low resources, closing tasks, and dangerous interruptions.
- **Evaluation:** relief, embarrassment, excitement, or dread as the team sees the result.
- **Next preparation:** players discuss what failed and buy improvements before starting again.

---

# 2. Campaign and round structure

## 2.1 The nine-day week

A weekly run consists of nine consecutive workdays. Each day follows the same main structure, while customer volume, store complexity, and threat combinations increase over the campaign.

| Phase | Duration | What happens |
|---|---:|---|
| Lobby and role assignment | Before Day 1 | Players join, receive unique random jobs, and see the store briefing. |
| Preparation | Unlimited | Safe setup: stock, move boxes, buy upgrades, place tools, repair damage, plan roles. |
| Open store | 10 minutes | Customers enter; tasks and threats run; rating changes dynamically. |
| Close and audit | 20–40 seconds | Doors close, remaining customers are resolved, day score is calculated, and incidents are summarized. |
| Intermission / next prep | Unlimited | Spend store funds, review the report, reorganize, and start the next day. |

Preparation and intermission are part of the game loop but do not consume the 10-minute shift clock. Players can spend as long as they want organizing. No hostile entity, customer wave, or monster attack may interrupt the standard preparation phase.

## 2.2 Starting the day

A physical **OPEN STORE** control is mounted near the manager's office or front entrance. Any player can activate it by default. Activation starts a visible 10-second countdown with lights and a public-address announcement. During the countdown, any player can cancel it by interacting with the control again. This prevents accidental starts and gives the team a final warning.

Lobby settings may change who can start the day:

- **Open to all (default):** any player can start or cancel the countdown.
- **Host / Shift Manager only:** only the host or the player assigned Shift Manager can start the day.

At countdown completion, the entrance unlocks, the store signage changes to OPEN, the shift timer begins at 10:00, and the Customer Director begins spawning shoppers.

## 2.3 The 10-minute shift

The shift timer counts down in real time. The design target is a readable escalation curve:

- **10:00–8:00 — Opening flow:** ordinary shoppers, restocking gaps, early requests, low threat pressure.
- **8:00–5:00 — Busy period:** customer volume rises; one or more nuisance incidents may occur; first special event can trigger.
- **5:00–2:00 — Pressure period:** task overlap increases; threat director may introduce a monster or a major operational incident depending on the day.
- **2:00–0:00 — Closing rush:** customers become impatient, the team must finish sales and close tasks, and the director can create one final complication.

The Director must not spawn every type of threat at once. It uses a threat budget, cooldowns, player-count scaling, and a maximum active-incident count.

At 0:00, the store stops admitting new customers. Customers already inside attempt to finish checkout or leave. The game then enters the short closing audit. Any unfinished task is recorded, but the rating does not continue decreasing indefinitely after the day ends.

## 2.4 Preparation phase rules

Preparation is a protected space in the gameplay loop. During this phase:

- No hostile AI can enter or attack.
- No customer AI is active.
- Players can move boxes, stock shelves, organize carts, move equipment, assign tools, and inspect the building.
- Players can buy store upgrades and place purchased equipment.
- Players can read the prior day's report and see known issues.
- Players may practice ordinary interactions.
- The store's star rating is displayed as “Ready: 5 Stars” for the upcoming day.

Some prep tasks may be optional challenges that award small bonuses, such as completing a planogram or preparing a display. They must not be required to open the store.

### Preparation is staging, not store operation

Preparation is an untimed setup window, not an early version of the work shift. Players may physically arrange the environment and get ready, but **no operational task may be completed or receive credit before the day starts**.

**Allowed during preparation**
- Move unopened delivery boxes from the loading area to designated staging locations or stock carts.
- Move empty carts, ladders, bins, and equipment into useful positions.
- Arrange tools and supplies at their stations.
- Choose or review store upgrades and purchase approved supplies.
- Review the day’s forecast, task board, known hazards, and team assignments.
- Decide who will cover which aisles, registers, doors, and specialist stations.
- Set up permitted equipment such as empty cleaning carts, safety cones, and monitoring equipment.
- Walk the store, communicate, and inspect the layout.

**Not allowed until the store opens**
- Place products onto shelves or displays.
- Complete customer orders, scan purchases, or serve customers.
- Clean operational messes or remove moldy/expired food for task credit.
- Repair faults, process returns, complete inspections, or resolve incidents.
- Catch or eliminate pests, confront intruders, or fight monsters.
- Complete any task-board objective or earn operational rating/profit credit.

Boxes may be staged close to their destination, but shelf stocking itself begins only after opening. Preparation saves travel and setup time; the actual workday is when employees perform operational duties under pressure.

## 2.5 Day-by-day escalation

| Day | Theme | New pressure introduced | Target experience |
|---|---|---|---|
| 1 — Orientation | Normal grocery operations | Ordinary customer needs, stocking, cleaning, checkout | Teach the store without lethal threats. A subtle anomaly may be visible but should not overwhelm new players. |
| 2 — The Mess | Cleanliness and pests | Spills, odor events, flies, rats, blocked aisles | Teach that neglected messes compound and that pest control is a real job. |
| 3 — Missing Stock | Theft and inventory | Shoplifters, suspicious carts, delivery discrepancies, stock shortages | Teach loss prevention, receiving, and inventory management. |
| 4 — Flicker | Facilities failures | Light or refrigeration faults, power interruptions, unusual sounds | Teach repairs, emergency procedures, and keeping customers calm. |
| 5 — Familiar Faces | Mimic introduction | First customer mimic, suspicious behavior, false alarms | Teach observation, verification, and safe containment. |
| 6 — After Hours | More complex threats | Multiple suspicious customers, stockroom movement, stronger monster behavior | Require coordination between front entrance, security, and floor staff. |
| 7 — Incident Day | Human security incident | A rare scripted robbery or major disturbance can occur alongside other tasks | Teach hide/secure/alert protocols. Do not turn this into a gunfight. |
| 8 — Everything at Once | High workload | Higher customer traffic, mixed pests, equipment failure, and one major monster encounter | Test whether the team has prepared and bought useful upgrades. |
| 9 — Final Inspection | Campaign finale | Highest customer pressure, a curated threat combination, final audit, and District Manager presence | A difficult but fair final shift that tests every core system. |

Day 9 does not need a conventional boss fight. The final challenge is to operate the store under the District Manager's scrutiny while the store's other systems are under maximum pressure. If the team reaches one star at any point, the normal fail-state sequence still triggers.

### Escalation principle: every day is harder than the last

Difficulty rises across all nine days. Do not rely only on increasing enemy health or movement speed. The game becomes harder through higher customer volume, more simultaneous tasks, more complex customer modifiers, more dangerous threat selections, less recovery time, and incidents that interact with one another.

| Day | Campaign feel | Threat and workload direction |
|---|---|---|
| 1 | Orientation under pressure | Low threat ratings dominate; teach core store systems and readable warning signs. |
| 2 | First complications | More customers, spills, theft attempts, and basic pests. |
| 3 | Unreliable customers | First serious mimic possibilities and multi-step incidents. |
| 4 | Store systems strain | More equipment faults, food contamination, and coordinated pest activity. |
| 5 | Midweek escalation | Threats combine; higher-rated pests can appear with less warning. |
| 6 | No quiet departments | Several zones need attention simultaneously; stronger monster variants enter the pool. |
| 7 | Security breakdown | High-risk intruders, advanced mimics, colony threats, and dangerous environmental chains. |
| 8 | Near-collapse | High threat density, overlapping special events, and fewer safe gaps between incidents. |
| 9 | Final shift | The hardest fair combinations, including rare high-threat encounters; the team must use everything learned. |

The director must preserve counterplay. Escalation increases the number and complexity of decisions, not the chance of unavoidable failure. Never spawn multiple catastrophic threats together without readable warning and a realistic response window.

## 2.6 Campaign failure and restart

When the shared rating reaches one star:

1. The rating display locks at one star and changes to a distinct warning state.
2. The public-address system announces that the District Manager is on the way.
3. Store lighting and ambience change; customers flee or freeze according to the event.
4. The District Manager enters through the main entrance or appears in a deliberately impossible location.
5. A short, unmistakable scripted sequence eliminates the employees. Its gore presentation follows the player’s gore-intensity setting and must remain VR-comfort-aware.
6. The team sees a run-failure report and returns to Day 1.

A failed week resets that run's store funds, temporary upgrades, daily progress, and run-specific inventory state. Persistent worker coins, owned cosmetics, unlocked cosmetic items, and account progression are not removed. This makes failure meaningful without deleting earned personal rewards.

## 2.7 Completing the week

Survive the Day 9 audit to finish the campaign. Show:

- Final weekly team score.
- Each day's score and star performance.
- Customer satisfaction, cleanliness, stocking, security, and task-completion breakdowns.
- Major incidents and successful recoveries.
- Store revenue and spending summary.
- Secret objectives completed.
- Equal worker-coin payout for every eligible worker.
- New cosmetic unlocks or achievement progress, if any.

---

# 3. Job system — all 30 possible roles

## 3.1 How job assignment works

**Mandatory roster rule:** a normal game cannot start with fewer than five players. The first five role slots are always Manager, Checkout Operator, Store Clerk, Janitor, and Shelf Stocker. These are assigned to five different players. If the lobby has 6–10 players, each additional player receives one unique random specialty from the other 25 jobs. No role duplicates occur within the same run. A player keeps their role for all nine days.

The mandatory role names map to the existing role definitions as follows:
- **Manager** → Shift Manager.
- **Checkout Operator** → Cashier.
- **Store Clerk** → Customer Service Associate, with a broad floor-support task set.
- **Janitor** → Janitor.
- **Shelf Stocker** → Stocking Associate.

The role name **Shelf Stocker** must not be confused with the supernatural **Shelf Stalker** monster.


The five mandatory roles are assigned first, one per player. For players six through ten, the game randomly selects unique specialties from the remaining 25 roles. No duplicates are permitted within the same run. A player’s role remains fixed for all nine days, making the group learn each other’s responsibilities and build habits.

The optional-role selection should be random but balanced. The selection algorithm may use coverage weights to avoid repeatedly producing a roster with no operational, customer-facing, or security capability. It must still feel random and should not allow players to choose roles in standard mode. A separate custom-lobby role preference option may be considered later.

### Critical fairness rule

Every player can perform baseline actions such as picking up a box, placing an item, wiping a small spill, helping a customer, pressing an alarm, or closing a door. A role grants specialist speed, better information, exclusive efficiency, or access to advanced tools. It does not make a task completely impossible for everyone else.

If a role is not present, its tasks can still be completed by any worker at a slower speed or with a less efficient method. Critical customer service, checkout, cleaning, repairs, and security can never be completely blocked by role assignment.

## 3.2 Role details

### 1. Shift Manager

- **Primary responsibility:** Overall shift coordination, store status, opening and closing decisions.
- **Signature equipment:** Manager's key ring, store status tablet, public-address microphone.
- **Special ability:** Can see a prioritized overview of active incidents, overdue department tasks, and store condition. Can call one short team-wide priority announcement on a cooldown.
- **Daily duties:** Check the briefing, confirm opening readiness, respond to customer escalations, authorize certain refunds or emergency closures, and complete the manager's closing checklist.
- **Specialist advantage:** Manager tools reveal which department is most at risk and allow quick authorization of high-value actions.
- **Important balance:** This is not a command role that controls other players. It cannot force coworkers to obey orders or prevent them from doing tasks.

### 2. Assistant Manager

- **Primary responsibility:** Fill coverage gaps and keep the floor moving.
- **Signature equipment:** Portable task board, radio, spare keys.
- **Special ability:** Can mark a task as “claimed,” “help needed,” or “urgent” for all players. Can temporarily reduce the time required for one nearby coworker's task by assisting.
- **Daily duties:** Check on departments, handle manager overflow, redirect attention to critical incidents, and help close the store.
- **Specialist advantage:** Faster task reassignment and better view of task status.

### 3. Cashier

- **Primary responsibility:** Checkout, scanning, payment, and queue management.
- **Signature equipment:** Handheld scanner, till, receipt printer, counter controls.
- **Special ability:** Scans products and resolves normal checkout errors faster. Can identify a deliberately incorrect barcode or price mismatch.
- **Daily duties:** Scan customer baskets, process payments, handle bagging, keep the queue moving, and call for help during unusual transactions.
- **Specialist advantage:** Faster checkout and fewer accidental price errors.

### 4. Customer Service Associate

- **Primary responsibility:** Complaints, questions, customer assistance, and lost-child procedures.
- **Signature equipment:** Service-desk bell, store map, return clipboard, radio.
- **Special ability:** Can calm unhappy customers more efficiently and reveal the correct resolution steps for customer requests.
- **Daily duties:** Handle complaints, locate products, provide directions, contact guardians during a lost-child event, and escalate suspicious incidents.
- **Specialist advantage:** More customer patience during a resolved complaint and a clearer lost-child objective.

### 5. Greeter and Door Attendant

- **Primary responsibility:** Entrance flow, customer welcome, and entrance observation.
- **Signature equipment:** Door counter, handheld mirror or inspection tool, door controls.
- **Special ability:** Receives a subtle indicator when a customer enters with an unusual behavior pattern. This is a clue, not an automatic mimic detector.
- **Daily duties:** Welcome customers, monitor entrance congestion, keep carts organized, notice suspicious entry behavior, and help secure the front entrance during an emergency.
- **Specialist advantage:** Better early-warning clues at the entrance.

### 6. Stocking Associate

- **Primary responsibility:** Refill shelves and keep products faced and organized.
- **Signature equipment:** Stock cart, box opener, shelf label guide.
- **Special ability:** Places products faster and can identify which shelf slots are low without checking each one manually.
- **Daily duties:** Move cases from the stockroom, replenish shelves, front products, and clear misplaced boxes.
- **Specialist advantage:** Faster shelf restocking and improved shelf presentation score.

### 7. Inventory Controller

- **Primary responsibility:** Track stock levels, shortages, expiry, and product movement.
- **Signature equipment:** Inventory scanner, count sheet, handheld terminal.
- **Special ability:** Scanning a shelf shows the stock level and whether the recorded count matches the physical quantity.
- **Daily duties:** Audit stock, detect missing items, prepare replenishment requests, and investigate unusual inventory discrepancies.
- **Specialist advantage:** Faster inventory audits and better early detection of theft or tampering.

### 8. Receiving Dock Clerk

- **Primary responsibility:** Accept and inspect deliveries.
- **Signature equipment:** Delivery scanner, clipboard, seal cutter, inspection light.
- **Special ability:** Can inspect shipping seals and identify damaged or substituted cases more reliably.
- **Daily duties:** Verify incoming crates, compare delivery manifests, mark rejected goods, and route accepted deliveries to storage.
- **Specialist advantage:** Faster receiving and earlier detection of fake or contaminated deliveries.

### 9. Pallet Jack Operator

- **Primary responsibility:** Move heavy stock and pallets between loading, storage, and sales floor.
- **Signature equipment:** Manual pallet jack, lifting straps, dock key.
- **Special ability:** Moves pallet loads with less effort and has better control of heavy-load handling.
- **Daily duties:** Reposition pallets, clear loading areas, move bulk deliveries, and stage stock for restocking.
- **Specialist advantage:** Better handling and faster movement of large loads. Pallet jack use must be physically safe and should not enable vehicle-like high-speed ramming.

### 10. Produce Specialist

- **Primary responsibility:** Produce freshness, displays, and produce-related customer requests.
- **Signature equipment:** Produce sprayer, freshness gauge, display basket.
- **Special ability:** Can quickly identify spoiled produce and restore display quality with the correct handling action.
- **Daily duties:** Rotate produce, remove spoiled items, water or mist displays where appropriate, and help customers find produce.
- **Specialist advantage:** Better freshness and reduced produce spoilage penalties.

### 11. Meat and Deli Specialist

- **Primary responsibility:** Deli counter service, packaged meat stock, and hygiene.
- **Signature equipment:** Deli tongs, counter scale, sanitation kit.
- **Special ability:** Serves deli requests faster and can identify unsafe counter conditions.
- **Daily duties:** Prepare packaged orders, refill counters, clean food-contact surfaces, and check temperature warnings.
- **Specialist advantage:** Faster deli service and fewer hygiene mistakes.

### 12. Bakery Specialist

- **Primary responsibility:** Bakery preparation, oven operation, and baked-goods restocking.
- **Signature equipment:** Oven mitts, baking tray, timer, bakery tongs.
- **Special ability:** Can prepare products faster and recognizes an oven or batch that is about to fail.
- **Daily duties:** Bake or finish assigned items, restock displays, remove stale goods, and respond to oven alarms.
- **Specialist advantage:** Faster bakery preparation and improved bakery freshness.

### 13. Dairy and Frozen Specialist

- **Primary responsibility:** Refrigerated and frozen inventory, temperature checks, freezer aisle condition.
- **Signature equipment:** Temperature probe, insulated gloves, freezer key.
- **Special ability:** Receives earlier warnings for temperature instability and can restore cold storage more efficiently.
- **Daily duties:** Rotate stock, check temperatures, close cooler doors, and respond to freezer-related anomalies.
- **Specialist advantage:** Better cold-chain control and early warning when a freezer entity or equipment failure is nearby.

### 14. Merchandiser and Display Planner

- **Primary responsibility:** Shelf layout, endcaps, promotional displays, and store presentation.
- **Signature equipment:** Display plan card, shelf tags, portable signage.
- **Special ability:** Can identify high-value display locations and earn a small customer-attraction bonus from completed displays.
- **Daily duties:** Build displays, correct shelf layouts, face products, remove clutter, and keep promotional areas organized.
- **Specialist advantage:** Higher presentation score and improved value from displays.

### 15. Pricing and Promotions Clerk

- **Primary responsibility:** Price tags, discounts, coupons, and promotional offers.
- **Signature equipment:** Price gun, label roll, promotion board.
- **Special ability:** Can correct mismatched prices quickly and create approved short-term promotions.
- **Daily duties:** Replace missing labels, resolve coupon issues, set promotional signage, and prevent checkout disputes.
- **Specialist advantage:** Faster price fixes and fewer coupon-related complaints.

### 16. Janitor

- **Primary responsibility:** Cleanliness, spills, trash, odors, and restroom condition.
- **Signature equipment:** Mop, broom, bucket, trash bags, cleaning spray.
- **Special ability:** Cleans larger messes faster and can identify the source of persistent odors or contamination.
- **Daily duties:** Mop spills, sweep debris, empty bins, clean restrooms, remove odor sources, and restore dirty aisles.
- **Specialist advantage:** Faster cleaning and more rating recovery from resolved cleanliness incidents.

### 17. Sanitation Inspector

- **Primary responsibility:** Food safety, sanitation checks, contamination, and hazard reporting.
- **Signature equipment:** Inspection light, swab kit, hazard tags, checklist.
- **Special ability:** Can inspect surfaces and products to distinguish harmless dirt from contamination that requires a specific response.
- **Daily duties:** Check food areas, identify contaminated stock, verify cleaning work, and report sanitation risks.
- **Specialist advantage:** Better hazard identification and fewer incorrect cleanup attempts.

### 18. Maintenance Technician

- **Primary responsibility:** Physical repairs to shelves, doors, carts, plumbing, and fixtures.
- **Signature equipment:** Repair kit, wrench, screwdriver, spare parts box.
- **Special ability:** Completes mechanical repairs faster and can temporarily stabilize a damaged object while awaiting parts.
- **Daily duties:** Fix broken shelves, doors, carts, leaky pipes, damaged signs, and jammed equipment.
- **Specialist advantage:** Faster repairs and longer-lasting temporary fixes.

### 19. Facilities and Refrigeration Technician

- **Primary responsibility:** Power, lighting, refrigeration, ventilation, and breaker systems.
- **Signature equipment:** Voltage tester, insulated gloves, fuse kit, circuit map.
- **Special ability:** Can diagnose faults from the facilities panel rather than checking each device individually.
- **Daily duties:** Restore power, repair lighting, maintain refrigeration, reset breakers, and inspect ventilation.
- **Specialist advantage:** Faster power recovery and earlier warnings for building-wide faults.

### 20. Security Guard

- **Primary responsibility:** Store security, emergency response, doors, cameras, and customer protection.
- **Signature equipment:** Radio, flashlight, camera monitor access, alarm key.
- **Special ability:** Can lock designated doors faster and receives clearer camera alerts during security incidents.
- **Daily duties:** Monitor cameras, investigate disturbances, secure entrances, guide customers to safety, and activate emergency protocols.
- **Specialist advantage:** Better security information and quicker lockdown actions.

### 21. Loss Prevention Investigator

- **Primary responsibility:** Shoplifting, suspicious transactions, missing merchandise, and theft evidence.
- **Signature equipment:** Inventory comparison device, incident camera viewer, suspect marker.
- **Special ability:** Can mark a suspected theft pattern for the team without immediately accusing a customer.
- **Daily duties:** Watch suspicious behavior, recover stolen stock, compare receipts with inventory, and report confirmed theft.
- **Specialist advantage:** Better suspect identification and lower false-accusation risk.

### 22. Pest Control Technician

- **Primary responsibility:** Rats, insects, nests, and biological infestations.
- **Signature equipment:** Humane capture trap, insect vacuum, bait station, protective gloves.
- **Special ability:** Can identify pest routes and place more effective traps.
- **Daily duties:** Remove pests, seal entry points, clean nests, reset traps, and protect food areas.
- **Specialist advantage:** Faster pest removal and fewer recurring infestations.

### 23. Cart and Lot Attendant

- **Primary responsibility:** Shopping carts, storefront exterior, parking-lot cleanup, and delivery access.
- **Signature equipment:** Cart strap, litter grabber, high-visibility vest, exterior key.
- **Special ability:** Pushes cart trains more efficiently and notices unusual movement around exterior access points.
- **Daily duties:** Collect carts, clear litter, keep the entrance accessible, and inspect the loading and parking areas.
- **Specialist advantage:** Faster cart recovery and earlier exterior warnings.

### 24. Delivery and Pickup Runner

- **Primary responsibility:** Online orders, curbside pickup, and moving urgent goods.
- **Signature equipment:** Order tablet, insulated tote, pickup shelf labels.
- **Special ability:** Can group nearby order items into a more efficient pickup route.
- **Daily duties:** Pick customer orders, stage bags, deliver orders to the pickup area, and correct missing-item issues.
- **Specialist advantage:** Faster order fulfillment and fewer incomplete pickups.

### 25. POS and IT Technician

- **Primary responsibility:** Checkout terminals, scanners, receipt printers, network devices, and store tablets.
- **Signature equipment:** Diagnostic tablet, cable kit, spare scanner battery.
- **Special ability:** Can diagnose terminal problems quickly and restore a failed terminal without replacing the whole unit.
- **Daily duties:** Repair registers, reconnect scanners, fix receipt printers, and restore internal systems.
- **Specialist advantage:** Faster electronic repairs and better fault diagnosis.

### 26. Prepared Foods and Sampling Clerk

- **Primary responsibility:** Samples, prepared-food counter, and food-related customer engagement.
- **Signature equipment:** Sample tray, serving tongs, food-safe gloves, counter bell.
- **Special ability:** Can set up a sample station that increases customer interest without creating as much mess.
- **Daily duties:** Prepare samples, keep the counter clean, answer food questions, and manage customer flow around the station.
- **Specialist advantage:** Better traffic conversion and fewer sample-area mess penalties.

### 27. Returns and Claims Specialist

- **Primary responsibility:** Returns, damaged merchandise, refunds, and product claims.
- **Signature equipment:** Return scanner, claims labels, damaged-goods bin.
- **Special ability:** Can process valid returns quickly and identify suspicious or fraudulent claims.
- **Daily duties:** Inspect returned goods, process refunds, update stock, and route damaged goods for disposal or credit.
- **Specialist advantage:** Fewer refund errors and better recovery of claim value.

### 28. Safety and Emergency Coordinator

- **Primary responsibility:** First response, evacuation procedures, staff safety, and emergency equipment.
- **Signature equipment:** First-aid kit, emergency radio, extinguisher, evacuation map.
- **Special ability:** Revives or stabilizes an incapacitated player faster and receives clear emergency instructions.
- **Daily duties:** Respond to injuries, guide NPCs during emergencies, operate safety equipment, and coordinate safe routes.
- **Specialist advantage:** Faster teammate recovery and more efficient emergency response.

### 29. Closing Supervisor

- **Primary responsibility:** End-of-day securing, closing checklist, and next-day readiness.
- **Signature equipment:** Closing checklist, lock ring, shutter controls.
- **Special ability:** Sees which closing tasks are still incomplete and can secure multiple linked doors or gates in sequence.
- **Daily duties:** Close exterior doors, secure delivery access, check storage areas, verify lights, and stage the store for the next day.
- **Specialist advantage:** Faster closing and a higher closing-readiness score.

### 30. Quality and Compliance Auditor

- **Primary responsibility:** Product integrity, shelf compliance, suspicious substitutions, and unusual store conditions.
- **Signature equipment:** Inspection scanner, compliance clipboard, UV verification light.
- **Special ability:** Can inspect a suspicious item or shelf and receive more detailed clues about tampering, substitution, or counterfeit labels.
- **Daily duties:** Check date labels, verify high-risk stock, inspect odd customer returns, and identify evidence that something in the store is not behaving normally.
- **Specialist advantage:** Better detection of contaminated or altered products and subtle mimic clues.

## 3.3 Role task generation

Each player should receive:

- **1–2 role-specific recurring responsibilities** each day.
- **1 optional personal challenge** that rewards extra contribution but is never required to win.
- Access to shared urgent tasks that anyone can claim.

Examples:

- Janitor: “Clear the produce spill before it spreads.”
- Cashier: “Process the next four customers without leaving a queue.”
- Facilities Technician: “Restore the freezer circuit.”
- Security Guard: “Verify the east entrance camera alert.”
- Stocking Associate: “Bring cereal stock above 60%.”

Do not flood players with text. Use short task names, clear world markers, and optional detail panels.

---

# 4. Customer AI system

## 4.1 Customer design goals

Customers should feel like people entering a working store for different reasons. Most are not threats. They should have readable goals, believable movement, and understandable reactions. Some have extra modifiers that create more work. A small number may be secretly dangerous.

Customer AI must support a large pool of combinations without requiring a unique hand-authored AI script for every possible shopper.

## 4.2 Customer data model

Every customer spawned by the Customer Director receives a data profile with:

- Customer archetype.
- Visual appearance and voice set.
- Shopping list: product IDs and quantity targets.
- Preferred route through the store.
- Patience and frustration thresholds.
- Walking speed and mobility profile.
- Help-seeking frequency.
- Checkout preferences.
- One or more optional behavior modifiers.
- Optional hidden objective or secret flag.
- Threat flag, if the customer is actually a mimic or other disguised entity.

Customer shopping lists are generated from products currently stocked, with a small number of special requests that may require players to locate an item in back stock or explain that it is unavailable. Do not generate impossible shopping lists that require products the store has never unlocked.

## 4.3 Customer behavior state machine

Recommended base states:

1. **Spawn / Enter:** choose an available entrance, enter, and orient toward the store.
2. **Browse:** travel to the next target aisle and inspect products.
3. **Select:** take requested product(s), place them in a basket or cart, or decide that an item is unavailable.
4. **Request Help:** approach a staff member, service counter, or help point.
5. **Wait:** wait for assistance, checkout, or a requested item.
6. **Checkout:** join a queue, use a register, present items, and pay.
7. **Exit:** leave normally after a completed shopping trip.
8. **Complain / Escalate:** become frustrated if a need is not met or a problem occurs.
9. **Flee / Hide:** react to a dangerous incident, alarm, or monster.
10. **Special Event:** execute a modifier-specific behavior, then return to a normal state where appropriate.

Every state must have clear entry and exit conditions. Avoid NPCs getting stuck indefinitely. If navigation fails, use a short recovery behavior and select a safe alternate route.

## 4.4 Customer archetype pool

Use archetypes as base templates. Modifiers are added on top, allowing more variety.

| Archetype | Normal behavior | Gameplay purpose |
|---|---|---|
| Routine Shopper | Follows a short list, shops calmly, checks out | Baseline customer and revenue source |
| Impatient Shopper | Has a low patience threshold and dislikes queues | Tests checkout coverage and service speed |
| Coupon Hunter | Uses coupons or asks about promotions | Tests pricing and cashier systems |
| Confused Shopper | Frequently asks where products are | Creates small customer-service tasks |
| Bulk Buyer | Takes many units and fills a large cart | Creates stock and movement pressure |
| Parent with Child | Shops while supervising a child NPC | Can trigger a lost-child or distraction event |
| Elderly / Slow-Moving Shopper | Moves slowly and may need accessible routes or help reaching an item | Tests thoughtful assistance and aisle clearance |
| Food Enthusiast | Requests specific produce, bakery, deli, or samples | Exercises specialist departments |
| Regular Customer | Recognizes the store and expects familiar stock | Rewards consistency; notices repeated problems |
| Secret Evaluator | Quietly checks service, cleanliness, and shelf condition | Tests overall store standards |
| Influencer / Photographer | Takes photos and may complain about dirty displays or blocked areas | Tests presentation and customer flow |
| Delivery Pickup Customer | Arrives for a staged order | Tests order fulfillment and pickup operations |
| Suspicious Shopper | Browses unusual routes and may be a thief or simply odd | Creates uncertainty without always being a threat |
| High-Value Customer | Buys expensive products and expects good service | Creates a higher reward and higher complaint risk |
| Late Shopper | Arrives near closing with a short patience window | Creates closing-rush pressure |

## 4.5 Customer modifiers

A customer can receive zero, one, or two modifiers in the early game. Later days may allow more complex combinations, subject to compatibility rules.

| Modifier | Behavior | Player response |
|---|---|---|
| Lost Child | Child becomes separated from guardian and moves to a safe, visible wandering area | Customer Service and Greeter locate and reunite them using the store's lost-child procedure |
| Spill-Prone | Knocks over a drink or drops food while browsing | Janitor cleans the spill before it spreads or attracts pests |
| Strong Odor Event | Leaves a temporary odor source or contaminated item in a designated area | Locate the source, remove it safely, and clean the area; do not attach this behavior to a vulnerable real-world identity group |
| Product Confusion | Repeatedly picks the wrong version or asks for help | Explain the product and guide them to the correct shelf |
| Coupon Dispute | Presents a coupon with a missing, expired, or mismatched condition | Pricing Clerk or Cashier resolves it |
| Allergy / Ingredient Question | Needs a product ingredient check | Staff must use the product label or database rather than guessing |
| Shoplifting Attempt | Conceals one or more products and heads toward an exit | Loss Prevention verifies evidence and recovers goods without false accusation |
| Queue Frustration | Becomes unhappy if checkout wait exceeds a threshold | Open another register or assist the queue |
| Aisle Blocker | Stops in a high-traffic area or leaves a cart across an aisle | Move the cart, redirect the customer, or clear the route |
| Fake Return | Attempts to return an invalid or altered product | Returns Specialist inspects it and follows the claim process |
| Item Search | Requests an unusual or hard-to-find product | Inventory and department staff locate it or explain its status |
| Distracted Shopper | Leaves their cart unattended and wanders | Keep aisles clear and return the cart if needed |
| Aggressive Complaint | Escalates a legitimate or exaggerated complaint | De-escalate, resolve the underlying issue, or call a supervisor |
| Suspicious Camera Avoidance | Avoids camera coverage or repeatedly checks staff positions | Security and Loss Prevention investigate; behavior alone is not proof |
| Mimic Candidate | Looks and acts like a normal customer but is secretly a mimic | Use observation and verification tools; do not reveal the truth automatically |

Modifiers must be selected with compatibility rules. For example, a customer cannot simultaneously be a lost child and an adult shopper, and a genuine customer cannot receive a secret monster-only modifier.

## 4.6 Customer satisfaction and patience

Each customer tracks:

- Current mood: Happy, Neutral, Frustrated, Angry, or Panicked.
- Patience meter.
- Time waiting for service.
- Whether shopping needs are met.
- Whether a complaint has been resolved.
- Whether the customer leaves normally, complains, or flees.

Customer mood changes should be explainable. A shopper becomes frustrated because they waited too long, could not find an item, received an incorrect price, encountered a dirty aisle, or witnessed a frightening incident. Do not randomly change a normal customer's mood without a visible reason.

A satisfied customer contributes to daily customer-service score and store revenue. A customer who leaves unhappy reduces the rating based on severity. A customer who is successfully helped can restore some rating, but recovery must be tied to a real completed interaction rather than repeatedly talking to the same NPC.

## 4.7 Customer spawning and traffic

The Customer Director controls customer volume. It considers:

- Current day number.
- Number of connected players.
- Store attraction / marketing upgrades.
- Current number of active customers.
- Open incidents and path congestion.
- Difficulty setting.

More foot traffic means more possible sales and more work. Marketing upgrades must never be a pure benefit. They should increase customer volume and potential revenue while also increasing queue, cleaning, stocking, and complaint pressure.

Use a soft cap and a hard cap for active customers. Start with a conservative target of approximately 3–5 active customers per player, with a hard cap configured for performance. Scale by testing in the actual VR build; do not blindly multiply all NPCs by player count.

## 4.8 Customer trust and mimic ambiguity

A mimic must be able to pass as an ordinary customer at first glance. Do not mark mimics with an obvious red outline or a permanent UI label.

Possible clues include:

- A reflection or shadow that does not match its movement.
- A customer who never picks up an item despite claiming to shop.
- A shopping list containing impossible combinations or a product that does not exist in the store.
- A barcode scan that returns an impossible product ID.
- A customer who follows a player into staff-only areas without a plausible reason.
- A repeated animation or movement loop.
- A mismatch between a camera view and the customer's current position.
- A subtle lighting or audio anomaly when viewed with the correct tool.

Clues must vary. Some harmless customers should occasionally behave oddly so players cannot use one clue as a guaranteed test. The mimic should remain fair: it needs multiple clues or a clear escalation behavior before it attacks.

---

# 5. Pests, intruders, and supernatural threats

The store's internal operations board categorizes non-customer problems as **Pests and Incidents**. The player-facing design should distinguish ordinary operational nuisances, human security incidents, animal pests, and supernatural monsters. They should not all be treated as the same kind of enemy.

## 5.0 Threat ratings and category rules

Every pest, intruder, and monster receives a **Threat Rating from 1 to 5**. The rating is a player-facing indicator of expected danger, disruption, and response complexity; it is not simply a health or damage number.

| Rating | Label | Meaning |
|---|---|---|
| 1 | Minor | Annoying, localized, and usually handled by one worker with basic equipment. |
| 2 | Low | Can damage stock, create mess, or distract a department if ignored. |
| 3 | Serious | Requires prompt attention, a specialist tool, or two players coordinating. |
| 4 | Severe | Can cause major store damage, player incapacitation, or a large rating loss. |
| 5 | Critical | Rare, campaign-defining danger with catastrophic potential and a multi-step response. |

Each threat definition must include spawn-day range, spawn weight, preferred zones, warning signs, behavior states, escalation timer, countermeasures, failure consequences, rating penalty, cleanup aftermath, and co-spawn restrictions. The rating is not a promise that a threat is immediately hostile: a disguised infiltrator may be subtle before discovery, while a low-rated pest may be obvious but costly if ignored.

## 5.1 Ordinary disturbances and human intruders

### Shoplifter

- **Behavior:** Conceals products, avoids staff, and attempts to exit without paying.
- **Counters:** Camera review, inventory check, calm interception, and product recovery.
- **Failure risk:** Lost inventory and reduced security rating. A false accusation creates a customer complaint.

### Organized Grab-and-Run Crew

- **Behavior:** Two or more NPCs create a distraction while another takes merchandise.
- **Counters:** Call security, close the appropriate exit lane, protect high-value goods, and identify the real theft route.
- **Failure risk:** Larger inventory loss if the team reacts to the distraction and ignores the exit.

### Disruptive Trespasser

- **Behavior:** Blocks an entrance or aisle, harasses customers, damages displays, or refuses to leave a restricted area.
- **Counters:** De-escalation, request assistance, guide customers away, and use the store's security protocol.
- **Failure risk:** Customer panic, blocked routes, and property damage.
- **Representation rule:** This character is defined by disruptive behavior, not by homelessness, poverty, or appearance.

### Armed Robber

- **Behavior:** A rare scripted security crisis. The NPC threatens the register or a high-value area and may demand access to the till.
- **Counters:** Do not turn the event into a gunfight. Use cover, keep customers away, activate the silent alarm, follow the security protocol, secure safe routes when appropriate, and wait for the scripted resolution.
- **Failure risk:** High customer panic and a large rating penalty if staff mishandle the event.
- **Design rule:** No realistic firearm tutorial or weapon handling is required. The tension is in evacuation, hiding, alarms, communication, and protecting customers.

### Vandal

- **Behavior:** Damages signs, displays, doors, or stock.
- **Counters:** Security response and Maintenance repair.
- **Failure risk:** Property damage, mess, and blocked shelves.

### False Inspector

- **Behavior:** Claims to be an official inspector and tries to enter restricted rooms or obtain records.
- **Counters:** Ask for valid credentials, use the manager's verification contact, and deny access until verified.
- **Failure risk:** Unauthorized access and store-security penalty.

## 5.2 Animal pests

### Rats

- **Behavior:** Follow wall edges, hide under shelving, enter stock or food areas, and scatter when approached.
- **Counters:** Place traps at routes, seal holes, clear food debris, and use the pest-control vacuum or approved capture tool.
- **Escalation:** A nest can produce more rats until removed.

### Cockroaches

- **Behavior:** Scatter when lights turn on, hide beneath equipment, and spread from a nest.
- **Counters:** Find the nest, use the insect vacuum or treatment station, and clean the area.
- **Escalation:** Food contamination and customer disgust.

### Flies

- **Behavior:** Gather around spills, trash, and spoiled food.
- **Counters:** Remove the source, empty bins, and use approved fly-control devices.
- **Escalation:** Customer complaints and reduced sanitation score.

### Contamination Slime

- **Behavior:** A fictional organic nuisance that slowly spreads across a surface or food storage area.
- **Counters:** Isolate the area, use the correct protective cleaning kit, remove contaminated stock, and report the source.
- **Escalation:** Spreading contamination and equipment damage.

### Terrorist Infiltrator — Threat Rating 5 (Critical)

A hostile human-shaped infiltrator who enters in ordinary customer clothing and behaves plausibly enough to avoid immediate detection. This is a fictional horror-game antagonist, not a depiction of any real-world group or ideology. Its gameplay identity is covert sabotage and a high-stakes store search.

- **Cover behavior:** Enters through the normal customer route, browses, pauses in low-visibility areas, and pretends to shop.
- **Suspicion cues:** Repeatedly visits staff-only or low-traffic areas; lingers near unusual locations; changes direction when watched; ignores normal shopping behavior; appears in camera blind spots; or produces an unusual, brief electronic sound.
- **Planting behavior:** Secretly places fictional, stylized explosive devices at selected store locations. Devices are non-realistic game props and must not depict usable construction details, real components, or real instructions.
- **Detection:** A planted device emits a very faint intermittent beep. The beep is spatialized and can only be heard when a player is within a limited proximity radius; it becomes clearer as the player approaches. Camera review and patrols may reveal suspicious placement.
- **Response:** Players alert the team, clear the immediate area, and use a clearly signposted fictional emergency interaction or specialist tool to secure the device. This is an abstract game mechanic, not a real bomb-disposal simulation.
- **Confrontation risk:** If confronted before planted devices are secured, the infiltrator may trigger a much larger carried explosive effect. This catastrophic encounter can eliminate nearby players, destroy or damage nearby props and fixtures, and create a major store-wide emergency. It requires strong audiovisual warning and a fair response window; it must not be a silent instant wipe.
- **Safety constraint:** Do not provide real-world bomb-making, placement, concealment, or defusal instructions. Keep all device visuals, logic, and interactions fictional and non-transferable.
- **Aftermath:** Debris, broken fixtures, smoke, alarm events, damaged stock, and major cleanup/repair objectives. The event can severely reduce store rating.
- **Spawn rules:** Introduce in the later campaign (recommended Day 5+), with low initial spawn weight. Increase chance and complexity on Days 7–9, but never combine it with another unavoidable catastrophic event.

### Green Goop / Glutton Slime — Threat Rating 2–4 (scales with growth)

A living green mass that sneaks through the store and consumes food. Its threat rating rises as it eats and expands.

- **Behavior:** Moves through shadows, under shelves, behind displays, and through narrow gaps. It seeks exposed food, dropped groceries, open stock boxes, and unattended prepared-food displays.
- **Growth:** Every consumed food item increases its mass, size, and movement capability. At thresholds it can split off a small blob, climb higher surfaces, or consume larger food piles. It begins at rating 2 and can rise to 3 or 4 if ignored.
- **Clues:** Missing food with no customer nearby, wet green residue, faint sticky sounds, a trail beneath shelving, or a display that appears to be sinking into a glossy stain.
- **Counterplay:** Block routes with physical barriers, lure it with a controlled food decoy, use an approved containment bucket/vacuum, and remove contaminated food. Clean the residue after containment.
- **Failure consequences:** Lost inventory, contamination, sticky floor hazards, blocked shelves, and an expanding nuisance that becomes harder to remove.
- **Design rule:** This is a stealth-and-growth problem, not simply a fast chase monster. Growth must be readable and preventable.

### Rat King — Threat Rating 4 (Severe)

A large, unnatural colony organism formed around a nest of ordinary rats. It is a territory-control and infestation threat.

- **Behavior:** Lives in wall gaps, the stockroom, under produce fixtures, or behind shelving. It directs smaller rats to steal food, chew packaging, and spread contamination.
- **Escalation:** The longer the nest remains, the more rats appear and the farther the infestation spreads. It may retreat through holes and reappear in another connected zone.
- **Clues:** Scratching behind walls, clustered droppings, gnawed packaging, moving shadows under shelving, and rats carrying scraps toward the same hidden route.
- **Counterplay:** Track the colony trail, protect food, seal accessible entry points through in-game repair interactions, place approved traps, and remove the nest through a coordinated pest-control objective.
- **Failure consequences:** Large-scale food contamination, inventory loss, customer panic, and multiple simultaneous cleanup tasks.
- **Variant:** A rare **Rat Queen** can replace the Rat King in some runs. It focuses on rapid colony expansion and nest protection rather than direct pursuit.

### Queen Roach — Threat Rating 4 (Severe)

A huge, unsettling cockroach matriarch that turns a localized insect problem into a spreading infestation.

- **Behavior:** Hides in warm, damp, dark spaces such as the bakery back area, drains, utility closets, or stockroom corners. It avoids bright open areas until the colony is established.
- **Colony system:** Egg cases and hidden nests generate smaller cockroaches. The queen can relocate if the nest is disturbed but not properly contained.
- **Clues:** Unusual insect clusters, clicking sounds behind equipment, damaged food packaging, shed shells, and repeated sightings near one wall or drain.
- **Counterplay:** Identify the nest, isolate the zone, protect exposed food, use the correct pest-control equipment, and complete the nest-removal task. Treating only visible roaches causes the colony to return.
- **Failure consequences:** Contaminated food, customer complaints, reduced sanitation score, and an infestation that occupies multiple departments.
- **Variant rule:** The Rat King and Queen Roach should usually be alternative major colony threats. They may both appear only on the highest campaign days and only within a strict difficulty budget.

## 5.3 Supernatural monster roster

Monsters should use distinct behavior patterns, sound cues, and counterplay. A monster encounter is successful when players learn what it does and coordinate the correct response. Avoid making every encounter a simple chase.

### 1. The Mimic Customer

- **Disguise:** A normal-looking customer with a shopping list and customer AI behavior.
- **Behavior:** Browses, watches staff, and tries to separate a player from the group. After enough time or when challenged incorrectly, it reveals its true form and attacks or sabotages the store.
- **Clues:** Impossible purchases, inconsistent reflection, repeated gestures, incorrect checkout data, or unnatural interest in staff-only areas.
- **Counters:** Verify the shopping list, use the UV verification light or inspection scanner, keep it in a monitored public area, and direct it into a designated containment zone once confirmed.
- **Failure risk:** Customer injury/panic, contaminated stock, and a major rating loss.

### 2. The Aisle Lurker

- **Behavior:** Appears at the far end of an aisle, retreats when approached, and advances when players look away. It prefers narrow aisles and uses shelving to break line of sight.
- **Clues:** A faint shelf rattle, a silhouette between products, and movement visible only in peripheral vision.
- **Counters:** Maintain light, approach in pairs, keep the aisle clear, and use the store's alarm chime to force it away from one section.
- **Failure risk:** A player can be separated or trapped in an aisle, creating a rescue task.

### 3. The Shelf Stalker

- **Behavior:** Hides inside or behind shelving and swaps product labels, removes items, or reaches out when players stock nearby.
- **Clues:** Products move after being placed, a shelf row becomes subtly distorted, or the inventory count changes without a customer taking anything.
- **Counters:** Scan the shelf, illuminate the affected bay, remove the tampered products, and repair or seal the shelf section.
- **Failure risk:** Stock errors, contamination, and sudden grab attacks if ignored.

### 4. The Freezer Guest

- **Behavior:** Lives in the freezer aisle or cold room. It causes temperature drops, frost, and door malfunctions. It becomes more active when the cold room is left open.
- **Clues:** Frost appearing in unusual places, a second set of footprints, a temperature display that changes in a pattern, and a voice behind the freezer door.
- **Counters:** Keep the door closed, restore the refrigeration system, use the temperature probe, and follow a specific light-and-door sequence to force it back inside.
- **Failure risk:** Cold-chain failure, spoiled goods, and a monster encounter in a confined space.

### 5. The Cart Husher

- **Behavior:** Moves shopping carts when no one is looking, creates false cart sounds, and blocks paths. It may hide inside a nested cart row.
- **Clues:** A cart moves against the floor slope, wheels rotate without sound, or a cart appears in a place that was just cleared.
- **Counters:** Use the cart return bay, secure the cart chain, and trigger the cart bell or a controlled light pulse.
- **Failure risk:** Blocked routes, player separation, and cart collisions.

### 6. The Ceiling Crawler

- **Behavior:** Travels through vents and ceiling spaces, follows players by sound, and drops into selected areas.
- **Clues:** Ceiling tiles flex, vents rattle, dust falls, and overhead footsteps move against the expected route.
- **Counters:** Check vent access points, use a maintenance light, close vent gates, and lure it toward a sealed service corridor.
- **Failure risk:** Surprise attack and damage to lighting or ventilation.

### 7. The Stockroom Double

- **Disguise:** Can imitate an employee silhouette or appear to be a coworker at a distance, but it is an NPC monster and never copies a real player's voice or personal identity.
- **Behavior:** Appears in the stockroom, moves boxes, misplaces equipment, and tries to lure a worker deeper into the warehouse.
- **Clues:** Wrong job badge, impossible hand movement, no matching radio response, or an item being carried through a solid object.
- **Counters:** Ask for a simple team verification phrase, check the badge, keep stockroom doors open when safe, and use the inspection light.
- **Failure risk:** A player is lured away and essential equipment is misplaced.

### 8. The PA Voice

- **Behavior:** Uses the store's public-address speakers to announce false instructions, wrong department alerts, or a fake closing message.
- **Clues:** Incorrect announcement tone, contradictory task-board information, or a speaker that continues after the PA control is disconnected.
- **Counters:** Verify announcements against the manager board, disconnect the affected speaker circuit, and use radios for confirmed communication.
- **Failure risk:** Players split up, open unsafe doors, or abandon critical duties.

### 9. The Long Customer

- **Disguise:** Appears as an unusually tall, quiet shopper. It may stand among normal customers.
- **Behavior:** Slowly follows a selected player, appears closer each time the player turns away, and blocks exits when the target is isolated.
- **Clues:** Abnormal proportions, the same product held for too long, a reflection that is slightly delayed, and a customer who never checks out.
- **Counters:** Stay with another player, keep it in a lit public area, use a camera to verify position, and guide it through a monitored exit route or containment corridor.
- **Failure risk:** Isolation, panic, and a difficult rescue encounter.

### 10. The District Manager

- **Role:** The campaign's supernatural fail-state entity.
- **Trigger:** The shared store rating reaches one star.
- **Behavior:** Enters during the wipe sequence, treats the failed shift as an unacceptable violation, and eliminates the team in a stylized scripted event.
- **Counterplay:** None after the one-star trigger. The only defense is to prevent the rating from reaching one star.
- **Design goal:** The District Manager should be recognizable across the campaign through distant sightings, impossible office notes, PA references, and brief environmental foreshadowing. Do not reveal the full entity too early.

## 5.4 Physical damage, gore, and cleanup aftermath

The visual direction may include mature, graphic fictional VR horror. Player avatars are stylized fictional creatures/monkeys with visible internal anatomy. Monsters can cause dismemberment, expose fictional internal structures, stain clothing and surfaces with blood, and leave body parts or remains that become physical cleanup objects.

**Gameplay requirements**
- Damage is represented on the avatar and through physical world consequences, not only a flat health bar.
- Specific attacks may detach or damage limbs, expose fictional internal components, or leave a player incapacitated. Dismemberment must be readable and consistent with the avatar rig.
- Blood and organic residue can stain floors, walls, clothing, carts, and equipment.
- Body parts and remains can be picked up using VR hands, placed into designated cleanup containers, and disposed of through a sanitation task.
- Serious incidents generate a cleanup chain: secure the area, rescue/recover the player if possible, collect remains, clean stains, dispose of contaminated materials, and restore the affected department.
- Gore cleanup can affect cleanliness and customer satisfaction if the store remains open. It may also attract certain pests or monsters.
- Different cleaning tools are required for ordinary spills, blood, biological residue, and supernatural contamination. A standard mop must not instantly erase every type of mess.

**Presentation and comfort**
- Provide adjustable gore intensity, including reduced blood, reduced dismemberment detail, and simplified cleanup visuals.
- Players must understand when they are hurt, incapacitated, or in need of rescue.
- Avoid forced camera movement, artificial head shaking, or prolonged close-up gore effects that can cause VR discomfort.
- Keep gore assets fictional and stylized; do not use real-world injury footage or photorealistic medical imagery.

## 5.5 Threat director and encounter rules

A centralized Threat Director schedules disturbances and monster encounters. It uses:

- Day number and difficulty.
- Current player count.
- Store upgrades and security condition.
- Number of active customers.
- Current rating and recent penalty events.
- Threat cooldowns and encounter budget.
- Whether players are already handling a major emergency.

Rules:

1. Never trigger two major monster encounters at the same exact moment in the early campaign.
2. Do not spawn a monster directly in a player's view or on top of a player.
3. Give major threats a tell: sound, light, camera anomaly, environmental effect, or customer behavior.
4. Do not let a single random event remove enough rating to fail a healthy team immediately. Catastrophic events should require multiple missed responses or a clear high-risk decision.
5. Keep at least one route to a relevant objective open unless the encounter is intentionally a temporary containment puzzle.
6. If players are already reviving someone or resolving a major incident, delay optional minor incidents where practical.
7. Scale simultaneous threat pressure with player count, but do not simply multiply every spawn by the number of players.

---

# 6. Store rating, cleanliness, service, and failure

## 6.1 Shared five-star rating

The five-star rating is the main shared survival meter. It is visible to every player at the top of the HUD and on the store's manager board. It begins each day at five stars.

Internally, use a continuous **Store Reputation value from 0 to 100**. Convert the value to visible stars:

| Reputation | Visible rating |
|---:|---:|
| 90–100 | 5 stars |
| 75–89 | 4 stars |
| 55–74 | 3 stars |
| 30–54 | 2 stars |
| 0–29 | 1 star — campaign fail trigger |

The visible rating should update immediately when a threshold is crossed. A subtle progress indicator can show movement within the current star band without cluttering the screen.

## 6.2 Example reputation penalties

These are starting values for balancing. The system should prevent repeated penalties for the same unresolved incident from stacking every frame.

| Incident | Starting penalty |
|---|---:|
| Customer leaves mildly dissatisfied | -2 |
| Customer leaves angry after an unresolved complaint | -4 |
| Customer leaves because the queue is too long | -2 |
| Important shelf remains empty during peak traffic | -1 to -3 over time, with a cooldown |
| Small spill remains uncleared too long | -1 |
| Large spill, odor, or visible contamination remains unresolved | -2 to -4 |
| Pest reaches food display | -3 |
| Theft succeeds | -2 to -5 based on value |
| Vandalism damages a fixture | -2 |
| Delivery stock is accepted despite obvious contamination | -4 |
| False accusation against a normal customer | -3 |
| Major security incident mishandled | -5 to -10 |
| Mimic harms a customer or causes a severe store incident | -5 to -10 |
| Major equipment failure left unresolved | -2 to -5 |

Use incident IDs and resolution states so one incident only applies its main penalty once. Persistent conditions such as dirt or an empty high-demand shelf may apply a small recurring penalty on a long cooldown until repaired.

## 6.3 Reputation recovery

Corrective work can restore reputation before one star is reached. Example starting rewards:

| Successful correction | Starting recovery |
|---|---:|
| Resolve a customer complaint | +1 to +3 |
| Complete a lost-child reunion | +2 |
| Clean a major spill or contamination source | +1 to +3 |
| Restock a high-demand empty shelf | +1 |
| Recover stolen goods | +1 to +2 |
| Remove a pest nest | +2 |
| Restore critical refrigeration or power | +1 to +3 |
| Correct a serious price or checkout error | +1 |
| Complete a major security protocol | +1 to +3 |

Recovery must be tied to a resolved incident or a meaningful store improvement. Players must not be able to farm reputation by repeatedly cleaning an already-clean surface, talking to the same customer, or moving an item back and forth.

The rating cannot exceed 100. Each issue should have a one-time recovery flag. Recovery can move the store back from two stars to three or four stars. Once the rating reaches one star, the District Manager sequence begins and the run cannot be saved.

## 6.4 Other store-condition meters

The rating is the headline survival meter, but supporting systems should be separately tracked:

- **Cleanliness:** floor dirt, spills, trash, odor sources, restroom condition.
- **Shelf availability:** product availability and shelf presentation by department.
- **Customer satisfaction:** current mood, wait times, fulfilled shopping lists, complaints.
- **Security:** confirmed thefts, unlocked restricted doors, incidents, camera coverage.
- **Food safety:** spoiled goods, temperature faults, contamination, sanitation checks.
- **Facilities:** lights, power, refrigeration, doors, plumbing, alarms.
- **Closing readiness:** remaining customers, unsecured entrances, incomplete end-of-day tasks.

These meters contribute to the daily score and may generate incidents that reduce reputation.

## 6.5 Player incapacitation

Ordinary monster contact should usually incapacitate rather than permanently eliminate a player. This preserves co-op participation and gives teammates a rescue objective.

Suggested baseline:

- A player caught by a monster enters a **downed / captured** state for 25–30 seconds.
- The player can call for help and point toward the threat, but cannot complete normal tasks.
- A teammate can complete a short physical rescue interaction.
- If not rescued in time, the player returns to the staff room with a short recovery penalty and the incident may reduce rating.
- A teammate rescue is quicker when performed by the Safety and Emergency Coordinator.
- The District Manager one-star sequence overrides this system and eliminates all players as the weekly fail state.

Avoid long spectator periods. The goal is to make rescue urgent without making a player sit out most of a shift.

---

# 7. Store layout and physical spaces

## 7.1 Core map zones

The first map should be a medium-sized grocery store designed around arm-swing locomotion. It needs enough interconnected routes for chasing, hiding, helping, and carrying items, but should not be so large that players cannot reach one another in time.

Recommended zones:

1. **Front entrance and vestibule:** customer entry, cart area, door controls, greeter station.
2. **Checkout lanes:** registers, queue rails, bagging space, customer exit.
3. **Customer service desk:** returns, complaints, lost-child procedure, store map.
4. **Main aisles:** grocery shelves, promotional endcaps, cross-aisle connections.
5. **Produce:** open displays, misting station, crates, freshness hazards.
6. **Meat and deli:** counter, scale, cold display, sanitation area.
7. **Bakery:** display cases, preparation counter, oven area.
8. **Dairy and frozen:** cold cases, freezer aisle, temperature controls.
9. **Prepared foods and sampling:** counter, sample station, seating or waiting space.
10. **Stockroom:** shelves, boxes, inventory staging, equipment storage.
11. **Receiving dock:** delivery entrance, pallets, delivery inspection point.
12. **Janitorial closet:** cleaning supplies, mop sink, waste bags.
13. **Facilities room:** breaker panel, refrigeration control, ventilation and lighting controls.
14. **Security office:** camera monitors, alarm panel, restricted-door controls.
15. **Manager's office:** task board, store reports, opening/closing control, District Manager foreshadowing.
16. **Staff room:** safe respawn/recovery area, lockers, personal cosmetic mirror.
17. **Restrooms:** cleanliness objectives and possible small incidents.
18. **Exterior / parking area:** carts, litter, delivery access, exterior security.
19. **Service corridors and vents:** monster routes and maintenance shortcuts.

## 7.2 Layout rules

- Provide at least two routes between key areas where practical.
- Do not create long dead ends that trap a player unless a monster encounter deliberately uses one and provides a countermeasure.
- Keep high-traffic intersections wide enough for several avatars and carts.
- Give important rooms clear visual identities and readable signs.
- Provide a safe staff room during preparation and between shifts.
- Keep the loading dock, freezer, and facilities room far enough apart that players must coordinate rather than solve every incident from one location.
- Use shelves, displays, carts, and stock piles as cover and navigation features, not just decoration.
- Design vent and ceiling routes for monster AI and visual storytelling; players should not access every monster route unless a role/tool explicitly enables it.

---

# 8. VR interaction and locomotion specification

## 8.1 Movement model

The primary movement model is arm-driven locomotion inspired by Gorilla Tag. Players push against the world with their tracked hands to move, climb, vault, and maneuver. The game should feel responsive and physical, with no requirement to use a conventional thumbstick for ordinary movement in the default mode.

Core movement behaviors:

- Palm contact with valid surfaces produces movement in the opposite direction of the push.
- Hand release preserves a controlled amount of momentum, tuned for indoor spaces.
- Players can climb approved surfaces and pull themselves over low obstacles.
- Crouching and reaching are represented by the tracked headset and hand positions, within safe play bounds.
- The store must be designed so standard shelves, doors, counters, and carts do not create constant accidental movement exploits.
- Player collisions should be soft and should not allow teammates to launch one another across the map.

Movement parameters must be tunable: push strength, maximum speed, acceleration, momentum retention, climb strength, surface friction, and collision response.

## 8.2 Comfort and accessibility

Keep arm-swing movement as the default identity, but provide comfort settings:

- Reduced acceleration and momentum.
- Optional vignette during high-speed movement.
- Snap turn or smooth turn setting where turning input exists.
- Adjustable reach and interaction distance.
- Seated or reduced-reach assistance mode if technically feasible.
- Toggle for reduced camera shake and reduced monster screen effects.
- Adjustable subtitle size and contrast.
- Separate sliders for voice, ambience, alerts, and music.

Do not use forced artificial camera movement for scares. Scare the player through world events, audio, lighting, and NPC behavior rather than moving the camera independently of the headset.

## 8.3 Hand and object interaction

Use tracked hands as the primary interface. Recommended interaction mapping:

- **Grip input:** grab or hold an object.
- **Trigger / pinch input:** activate a tool, scanner, button, or precise interaction.
- **Palm contact:** push against surfaces for locomotion.
- **Two-hand grip:** stabilize or carry large boxes, heavy items, or long tools.
- **Wrist or belt slots:** store a small number of compact tools for quick access.
- **World buttons and levers:** physical interactions for opening, locking, switching, and activating machinery.

Objects should have clear interaction affordances: grip points, handles, placement sockets, collision shapes, and simple feedback when correctly held or installed.

## 8.4 Core physical tasks

### Stocking a shelf

1. Pick up a box from the stockroom or stock cart.
2. Carry it to the correct aisle.
3. Open it using the designated opening interaction.
4. Take individual products or a small bundle.
5. Place each product into the matching shelf slot.
6. Rotate or face the product if the department requires presentation quality.
7. Dispose of the empty box in the appropriate recycling area.

The inventory system updates when an item is placed in a valid slot. Do not require pixel-perfect placement. Use invisible slot volumes and gentle snap alignment after the player's hand releases the product.

### Checkout

1. Customer places items on the belt or counter.
2. Cashier picks up or moves each item through the scanner zone.
3. Scanner produces a visual and audio confirmation.
4. Total appears on the register.
5. Customer pays using a simple physical cash/card interaction.
6. Items are bagged or returned to the customer.
7. Receipt prints or a digital receipt is confirmed.

Checkout should feel tactile but not demand a realistic 30-step transaction. Use quick-pay options for accessibility and pacing.

### Cleaning

1. Identify spill, trash, dirt, or contamination.
2. Select the correct tool.
3. Physically sweep, mop, vacuum, bag, or spray the affected area.
4. Continue until the surface reaches a clean threshold.
5. Dispose of used materials or refill the tool when required.

Different messes require different methods. A mop should not automatically remove a pest nest or supernatural contamination.

### Customer assistance

Customers can point, gesture, hold a product, or use short voice lines. Players can pick up or point to a store map, retrieve a product, scan an item, answer a question through simple dialogue choices, or escort a customer to a service point.

### Repairs

Repairs use physical tool interactions: turn a wrench, connect a cable, replace a fuse, align a shelf bracket, tighten a bolt, or reset a breaker. Keep each repair to a small number of readable steps. Advanced repairs can be longer but should have clear progress feedback.

### Security and monster containment

Security actions use physical controls: camera switches, door locks, alarms, shutters, inspection lights, trap placement, and containment-room levers. Counterplay should reward communication and correct procedure rather than high-speed aiming.

## 8.5 Inventory and carried items

- Players may hold one medium object per hand.
- Large boxes and selected equipment require two hands.
- Small tools can be stored in a limited set of wrist/belt slots.
- A player cannot carry unlimited products while moving at full speed.
- Dropped objects remain in the world for a configurable time and then return to an appropriate storage point if not mission-critical.
- Important equipment should not be permanently lost because a player accidentally drops it into an inaccessible location.
- A small personal task board or wrist display can show the next objective without covering the player's view.

## 8.6 Haptics, audio, and visual feedback

Every important action should have immediate feedback:

- Scanner beep and light.
- Register confirmation and receipt movement.
- Product snap into shelf slot.
- Cleaning surface changes from dirty to clean.
- Repair sound and indicator light.
- Door lock clunk and status light.
- Pest trap click or capture animation.
- Monster warning from spatial sound and environmental cues.
- Star-rating change with a short sound, not an overwhelming alarm for every minor penalty.

Audio must communicate direction and urgency. Important sounds should be distinguishable from background store ambience. Provide visual or haptic redundancy for players who cannot rely on audio alone.

---

# 9. Tasks, incidents, and objective management

### Mandatory floor, shelf, and food-condition work

The store’s cleanliness and merchandising simulation must include more than generic dirt.

- **Food dropped on the floor:** Customers may drop or knock food onto the floor. Employees pick it up, determine whether it is safe to return to stock, and dispose of it when contaminated. Food that touched a dirty floor must never be automatically returned to a shelf.
- **Wrong-place merchandise:** Customers may leave products in the wrong aisle, put frozen or refrigerated items on ordinary shelves, place items on unrelated displays, or abandon products in carts. Employees physically return each item to its correct shelf, cooler, freezer, or designated returns bin.
- **Moldy and spoiled food:** Products can become moldy, expired, damaged, or temperature-abused. Workers identify affected items, remove them from sale, place them in the correct waste/returns container, and clean residue. Moldy food must never be restocked.
- **Empty shelves:** Stockers retrieve the correct box, verify the product/label, open the carton, place products into matching shelf slots, and remove empty cardboard. Incorrect products or misplaced labels can create later complaints.
- **Spills and residue:** Spilled drinks, crushed produce, leaking packages, slime, blood, and pest contamination each have appropriate cleanup steps and tools.
- **Customer-caused disorder:** Customers can scatter products, leave baskets, move displays, create queues, and abandon carts. These become real physical tasks rather than instant background resets.

Track these tasks per object or affected shelf section. Reward corrective work, but do not let one player clear an entire department instantly through a single button press.

## 9.1 Task categories

- Customer requests.
- Stocking and inventory.
- Cleaning and sanitation.
- Repairs and facilities.
- Pest removal.
- Security and theft response.
- Monster investigation and containment.
- Food preparation and freshness.
- Closing and store preparation.

## 9.2 Task priority

Tasks should be prioritized by consequence, not merely by how recently they appeared. The UI can use simple labels:

- **Critical:** failure can cause severe rating loss or a campaign-ending chain reaction.
- **Urgent:** time-sensitive; rating or customer consequences if delayed.
- **Routine:** standard job responsibilities.
- **Optional:** bonus score or store-fund opportunity.

The exact priority must be understandable. A task card should say what is wrong, where it is, and what action resolves it.

## 9.3 Shared task board

The manager's office and a smaller handheld/wrist view show:

- Active tasks.
- Task location.
- Severity and time sensitivity.
- Assigned or claimed worker.
- Required tool or action.
- Current progress.

Players can claim, release, or request help on tasks. Do not force every task to be manually assigned by the Shift Manager. The board should reduce confusion, not become another full-time job.

## 9.4 Incident chains

Some problems create linked consequences:

- Spill → flies → customer complaint → pest cleanup.
- Empty shelf → customer request → impatient customer → rating loss.
- Freezer fault → rising temperature → spoiled goods → contamination cleanup.
- Shoplifter → missing inventory → suspicious customer escalation → security review.
- Mimic enters → camera anomaly → staff split up → employee capture → rescue task.

Incident chains create the feeling of a living store. Keep chains readable and give players opportunities to interrupt them early.

---

# 10. Economy and progression

## 10.1 Two separate currencies

### Store Funds

- Belong to the grocery store and are shared by the team.
- Earned through customer purchases and successful store operations.
- Spent on store upgrades, supplies, equipment, and operational perks during the current weekly run.
- Reset when the weekly run fails or is completed, unless a later meta-progression system explicitly unlocks permanent store options.

### Worker Coins

- Belong to each player.
- Earned from the final weekly team score.
- The team reward is divided equally among eligible workers; every eligible player receives the same payout.
- Persist across runs.
- Spent on cosmetics, avatar customization, emotes, hand effects, nameplate styles, and other non-pay-to-win personal items.

Do not mix the currencies or allow Worker Coins to purchase gameplay power in the standard mode.

## 10.2 Store Funds: revenue and expenses

### Revenue sources

- Customer purchases.
- High-value customer baskets.
- Completed pickup orders.
- Promotional sales.
- Optional daily objectives.
- Efficient stock and low waste.

### Expenses

- Buying replacement inventory.
- Restocking supplies.
- Cleaning materials and pest-control consumables.
- Repair parts.
- Upgrade purchases.
- Emergency service fees after specific events.

### Daily store profit

Use a transparent but simplified model:

`Daily Profit = Sales Revenue - Inventory Cost - Supply Cost - Repair Cost - Incident Losses`

Customer satisfaction, store condition, and checkout speed influence revenue. Do not simulate detailed accounting for every single item unless it directly creates gameplay.

## 10.3 Store upgrades

Upgrades are purchased during preparation or intermission. They are shared by the team and generally persist for the remainder of the current nine-day run. Each upgrade should have a clear cost, effect, tier, and trade-off.

### Operations upgrades

1. **Extra Checkout Lane** — adds another register and reduces queue time.
2. **Self-Checkout Station** — lets eligible customers scan and pay for simple purchases without a dedicated cashier. Customers may need occasional help, and stations can jam, misread items, or be exploited by shoplifters. More stations reduce cashier bottlenecks but do not eliminate the need for a staffed checkout.
3. **Improved Shelf Labels** — makes product placement and price identification easier.
4. **Stockroom Organization Racks** — reduces the time needed to locate boxes.
5. **Automatic Cart Return** — helps return empty carts to the entrance; can jam during high traffic.
6. **Better Cleaning Station** — increases mop/vacuum capacity and reduces refill downtime.
7. **Bulk Storage Expansion** — increases available stock space but creates longer movement routes.

### Security upgrades

8. **Camera Coverage Expansion** — adds camera views and reduces blind spots.
9. **Door Reinforcement** — slows intruders and monsters at selected entrances.
10. **Motion Sensors** — alerts staff to movement in restricted areas.
11. **Improved Alarm System** — faster emergency notification and more reliable activation.
12. **UV Verification Station** — improves mimic and contamination checks in a designated area.
13. **Secure High-Value Cabinet** — reduces theft of premium items but takes time to access.

### Facilities upgrades

14. **Backup Generator** — powers critical lights, cameras, and refrigeration during a blackout.
15. **Refrigeration Backup** — slows food spoilage during a freezer failure.
16. **Reinforced Service Doors** — makes staff-only areas harder for threats to enter.
17. **Improved Lighting** — reduces dark zones and helps players identify visual anomalies.
18. **Vent Seals** — reduces the number of routes available to ceiling-based monsters.

### Marketing and customer upgrades

19. **Window Display** — increases customer attraction and potential revenue.
20. **Local Advertising** — increases foot traffic for the next day.
21. **Loyalty Program** — improves regular-customer patience and repeat purchases.
22. **Premium Product Selection** — unlocks more expensive products and higher basket values.
23. **Sample Station Upgrade** — increases customer interest and sales conversion, but can create more cleanup tasks.

### Staff and supply upgrades

24. **Better Radios** — improves communication range and alert clarity.
25. **Expanded Tool Lockers** — gives staff more accessible tools around the store.
26. **Advanced Pest Kit** — more efficient capture and nest removal.
27. **Repair Parts Cabinet** — reduces repair time and emergency parts cost.
28. **Improved Staff Lighting** — portable lights help investigate dark or suspicious areas.
29. **First-Aid Station** — shortens player recovery time.
30. **Training Posters** — provides small efficiency boosts to selected baseline tasks.

## 10.4 Upgrade trade-offs

Upgrades should introduce choices, not just a straight path to maximum power.

Examples:

- More advertising increases customer traffic and revenue but increases queue, cleaning, and shelf pressure.
- Premium stock increases sales value but attracts theft and raises inventory costs.
- Self-checkout reduces normal queue load but can be targeted by shoplifters or tampered with by mimics.
- More cameras improve coverage but can create more false alerts during monster events.
- Bright lighting helps identify anomalies but may make some monsters more aggressive or cause power demand to rise.
- Larger storage reduces clutter but increases the distance between stock and shelves.

The upgrade screen must describe both the benefit and any meaningful downside.

## 10.5 Worker Coins and cosmetic store

Worker Coins buy personal items that do not affect store performance:

- Fur / body materials and patterns.
- Gloves, wristbands, hats, aprons, employee uniforms, and accessories.
- Nameplates and profile badges.
- Emotes and celebration animations.
- Non-obstructive hand trails or cosmetic effects.
- Cosmetic scanner, mop, flashlight, or radio skins.
- Victory poses or end-of-week presentation items.

Do not sell stronger monster tools, extra stars, role advantages, or campaign revives for Worker Coins. The core game must remain fair across players.

## 10.6 Weekly score and equal payout

Suggested weekly team score: **9,000 points maximum**, with up to 1,000 points available per day.

Daily scoring categories:

| Category | Points per day |
|---|---:|
| Store rating and recovery | 250 |
| Customer satisfaction | 200 |
| Tasks and job responsibilities | 200 |
| Stocking, cleanliness, and food safety | 150 |
| Security and threat handling | 100 |
| Team coordination and rescues | 100 |
| **Total** | **1,000** |

A day score is calculated from measured outcomes, not from role-specific kill counts or individual competition. Optional challenges can add small bonus points but should not allow the team to exceed a defined cap by farming one activity.

At the end of Day 9:

1. Sum the nine daily scores to produce a team score from 0–9,000.
2. Convert the team score into a worker bonus pool using a configurable conversion rate.
3. Divide the pool equally among eligible workers.
4. Display the exact same payout amount to each eligible worker.

Example baseline conversion: `Worker Coin Pool = floor(Weekly Team Score / 9)`; each worker receives `floor(Worker Coin Pool / Eligible Worker Count)`. Tune the conversion rate and pool size during economy testing. If that literal split makes payouts too small in 10-player lobbies, multiply the pool by a configurable scale factor while preserving equal distribution.

Eligible workers are players who joined before the run began and participated in a meaningful portion of the campaign. A reconnecting player retains eligibility. Late joiners should be disabled after Day 1 starts in the initial version to prevent payout abuse.

---

# 11. Multiplayer and online systems

## 11.1 Lobby rules

**Minimum active player count: five. Maximum: ten.** A normal public or private match cannot launch the campaign until five human players are present and ready. The lobby UI clearly shows the five mandatory job slots and assigned players. Players six through ten fill optional specialty slots.

A developer-only test setting may bypass the five-player minimum for solo testing, automated QA, and early development. It must be clearly marked as a test override and must not silently change normal matchmaking rules.


- Maximum 10 players.
- Private and invite-only lobbies should be supported before public matchmaking.
- A lobby can start with any player count from five through ten.
- The five mandatory roles are assigned first; remaining players receive unique random specialties.
- Role assignments are visible to all players on a roster board.
- New players cannot join a campaign after Day 1 starts in the initial version. Disconnected players may reconnect to their original slot.
- Host can select lobby privacy, comfort defaults, difficulty, and whether any player or only the host/Shift Manager can start a day.

## 11.2 Co-op rules

- All players share the same star rating, store funds, day score, and campaign progress.
- Every player receives an equal worker-coin payout at the end of a completed week.
- There is no competitive individual leaderboard during a shift.
- Player contribution can be shown in a private or post-run task summary, but it should not shame low-scoring players or encourage selfish task farming.
- Teammates can help with all baseline tasks, revive one another, pass tools, carry boxes together, and operate two-person mechanisms.

## 11.3 Voice communication

Use proximity-based voice by default:

- Voice is loudest when players are near one another.
- Walls and closed doors reduce voice volume where practical.
- Radios or upgraded communication systems can extend communication range.
- Key alerts must also have visual indicators so players are not dependent on voice chat.
- Monsters may imitate generic prerecorded announcements or NPC lines, but they must not record, clone, or impersonate a real player's voice.

## 11.4 Networking architecture

Use an authoritative simulation for gameplay-critical systems. The exact networking library can follow the existing project, but the architecture should preserve these boundaries:

### Server / host authoritative

- Customer AI state and movement decisions.
- Monster AI and threat director.
- Shared rating and incident penalties/recovery.
- Inventory counts and shelf stock.
- Store funds and upgrade purchases.
- Task completion and daily score.
- Player incapacitation and rescue results.
- Campaign day state and failure/completion.

### Client responsive

- Local hand tracking and immediate hand pose.
- Local locomotion prediction where appropriate.
- Cosmetic avatar rendering.
- Non-critical UI animation and sound playback.
- Object grab prediction, followed by server validation and ownership resolution.

### Replication guidance

- Hand and head transforms need smooth frequent updates; use interpolation and appropriate unreliable update channels.
- Critical events—grabbing a unique item, completing a task, purchasing an upgrade, changing a door lock, changing rating, or starting a day—must be reliably acknowledged.
- Give every networked object a stable network ID.
- Avoid sending full object state every frame when only a small state change occurred.
- Use server validation for inventory, currency, task completion, and campaign state so clients cannot award themselves money or stars.
- Ensure only one authority controls each shared AI and shared economy operation.
- Make object ownership transfer safe when players pass tools or disconnect.

### Host migration and disconnection

For the first playable build, a host-authoritative session is acceptable if the selected networking platform supports it reliably. Keep the game-state model separable from the host implementation so dedicated servers or host migration can be added later without rebuilding gameplay.

If the host disconnects, attempt host migration where supported. If migration is not supported in the first version, end the run cleanly and explain the interruption; never silently corrupt the campaign save.

## 11.5 Performance targets

VR frame rate is a priority. Set platform-specific targets based on the headset, but design the game to maintain a stable native refresh rate rather than sacrificing comfort for excessive NPC counts or effects.

Performance priorities:

1. Stable headset rendering.
2. Smooth local hand tracking and locomotion.
3. Low-latency interaction with tools and shared objects.
4. Predictable network updates.
5. Scalable NPC counts and monster effects.

Use LOD, occlusion, pooled NPCs, simplified distant animations, event-driven replication, and conservative physics. Do not run every customer at full simulation fidelity when far away or not relevant to players.

---

# 12. User interface and information design

## 12.1 Main in-shift HUD

Keep the HUD small and readable in VR. Show:

- Shared five-star rating at the top of the player's view or on a wrist display.
- Ten-minute shift timer.
- Current day number.
- A small count or icon for critical active incidents.
- Optional short current objective.

Do not cover the center of the player's view with a large flat screen.

## 12.2 World-based interfaces

Use physical boards and devices wherever possible:

- Manager task board for shared tasks.
- Role board showing each player's job.
- Store status board showing cleanliness, shelf availability, security, and facilities.
- Camera monitor in security office.
- Inventory terminal in stockroom.
- Upgrade board in manager's office or staff room.
- Daily report board during intermission.

A small wrist interface can show a player's task, radio status, and carried tool slots.

## 12.3 Alerts

Use escalating alert design:

- **Informational:** small icon, soft sound, no forced attention.
- **Urgent:** visible directional indicator and distinct audio.
- **Critical:** unmistakable alarm, large location label, and an optional task-board entry.

Avoid constantly flashing the entire HUD. The store environment itself should communicate many problems.

## 12.4 Tutorial and onboarding

Teach the game through the first preparation phase and Day 1:

- How to move with hands.
- How to grab and place objects.
- How to read the star rating.
- How to complete one simple task tied to the player's job.
- How to find the task board and radio.
- How to start the day.

Do not force ten players through a long unskippable tutorial. Use short contextual prompts and optional practice stations.

---

# 13. Difficulty, balancing, and fairness

### 13.0 Campaign difficulty director

The campaign director tracks a **Day Threat Budget** and a separate **Chaos Budget**. Each new day increases both. Threat Budget controls which threat ratings and encounter types can be selected; Chaos Budget controls simultaneous incidents, customer modifiers, and operational complications.

- Days 1–2 primarily use ratings 1–2.
- Days 3–4 introduce rating 3 threats and more complex customer modifiers.
- Days 5–6 can select rating 4 threats, including the Green Goop at higher growth potential and colony threats.
- Days 7–8 can select rare rating 5 threats such as the Terrorist Infiltrator, but spawn weights remain controlled.
- Day 9 can use the full threat roster and strongest fair combinations.

The director also increases customer arrival rate, average shopping-list size, wrong-place item frequency, food drops, mold/spoilage incidents, pest pressure, and concurrent tasks. Use a pacing curve with short lulls so players can regroup. Do not increase every variable at the same rate; variety matters more than a simple linear multiplier. A rating-5 threat consumes a large portion of the catastrophic-risk budget and suppresses other catastrophic encounters until resolved or escaped.

## 13.1 Difficulty settings

Initial version should support at least:

- **Normal:** intended default experience.
- **Hard:** more task overlap, more complex customer modifiers, stronger threat behavior, and less forgiving penalties.
- **Custom:** host can adjust customer volume, threat intensity, rating recovery, and shift timer within safe bounds.

The nine-day campaign structure remains unchanged across difficulties.

## 13.2 Player-count scaling

Scale workload based on both player count and role coverage.

- 1–2 players: lower customer cap, fewer simultaneous incidents, longer customer patience, and fewer complex multi-step events.
- 3–5 players: baseline target.
- 6–8 players: higher traffic and more simultaneous tasks, but preserve clear routes and communication.
- 9–10 players: more customers and role coordination opportunities, but do not scale every hazard linearly.

The store should never require more simultaneous critical tasks than the team can plausibly resolve. Use incident budgets and prioritization.

## 13.3 Anti-frustration rules

- Never place an untelegraphed monster attack directly behind a player as an unavoidable instant capture.
- Never create impossible customer shopping lists.
- Never make a task permanently impossible because a required specialist role was not assigned.
- Never allow the day to start accidentally without warning.
- Never allow one tiny mistake to remove multiple stars without a clear high-severity reason.
- Never allow unresolved low-severity incidents to tick penalties every frame.
- Never spawn a major threat in the prep phase.
- Never require a player to read a long paragraph while an emergency is active.
- Never punish a player for not hearing voice chat when the same critical information can be shown visually.
- Provide a way to recover important dropped tools and mission objects.

---

# 14. Audio and atmosphere

## 14.1 Everyday store ambience

The store initially sounds normal: refrigeration hum, distant music, customer conversations, carts, register beeps, ventilation, footsteps, and public-address announcements. The atmosphere gradually becomes less trustworthy as the campaign progresses.

## 14.2 Horror audio language

Each monster needs a distinct audio identity. Audio clues should communicate location and behavior without always revealing the monster's exact position.

Examples:

- Mimic: an almost-normal customer phrase repeated with the wrong cadence.
- Aisle Lurker: distant shelf movement and a short scrape.
- Freezer Guest: low compressor strain, frost crackle, and a voice muffled by the door.
- Ceiling Crawler: vent rattle, ceiling flex, and falling dust.
- Cart Husher: cart wheels moving without the usual rolling sound.
- PA Voice: announcement timing that conflicts with the actual store system.

Do not make every scare a loud sting. Silence, familiar sounds in the wrong place, and small environmental changes are often more effective.

## 14.3 Music

Keep music minimal during regular operations. The store's normal background music can subtly change as the rating drops or a threat becomes active. During major threats, reduce or distort the store ambience rather than layering a constant action soundtrack over the game.

---

# 15. Art direction and presentation

## 15.1 Visual direction

Use a stylized, readable grocery store aesthetic. The environment should feel familiar enough that players understand how to use it, but strange enough that small anomalies stand out. A slightly exaggerated, tactile art style will help objects remain readable in VR and support multiplayer performance.

## 15.2 Player avatars

- Gorilla Tag-style locomotion should be matched by a simple, expressive avatar rig.
- Hands and head must remain readable at a distance.
- Job role can be communicated with an apron, badge, hat, uniform accent, or held tool.
- Cosmetic customization must not hide important hand poses or collision shapes.
- Avoid visual accessories that obstruct another player's view during close teamwork.

## 15.3 Customer and monster silhouettes

Customers need readable archetypes and animation variety. Monsters need distinct silhouettes, movement rhythms, and visual tells. Do not rely solely on color to distinguish threats; use shape, animation, audio, and behavior.

## 15.4 Environmental storytelling

Foreshadow the District Manager and the store's strange history through:

- Unusual employee notices.
- Old inspection reports.
- A manager office that seems larger inside than outside.
- A store policy that makes no sense.
- Camera footage showing an extra person.
- A locked door with a shift schedule behind it.
- Public-address announcements referring to employees who are not present.

Keep clues optional. They should reward observant players without blocking the main loop.

---

# 16. Data-driven content architecture

Build the game so designers can add jobs, customers, modifiers, tasks, pests, monsters, upgrades, and days using data/configuration assets rather than hard-coding each one into a large script.

Recommended data definitions:

### JobDefinition

- Unique job ID.
- Display name and description.
- Role category.
- Starting equipment.
- Passive bonuses.
- Specialist interaction bonuses.
- Daily task templates.
- UI icon and role color.

### CustomerArchetypeDefinition

- Unique archetype ID.
- Appearance set.
- Shopping list rules.
- Movement profile.
- Patience profile.
- Help-seeking behavior.
- Allowed modifiers.

### CustomerModifierDefinition

- Unique modifier ID.
- Compatibility tags.
- Trigger conditions.
- Behavior overrides.
- Task generation rules.
- Success and failure outcomes.

### ThreatDefinition

- Unique threat ID.
- Spawn conditions.
- Threat budget cost.
- AI state machine.
- Detection clues.
- Counterplay actions.
- Failure consequences.
- Cooldowns and despawn conditions.

### TaskDefinition

- Unique task ID.
- Category and priority.
- Spawn conditions.
- Required object/tool tags.
- Completion conditions.
- Rating impact.
- Store score impact.
- Role bonus tags.

### UpgradeDefinition

- Unique upgrade ID.
- Cost.
- Tier and prerequisites.
- Effect values.
- Drawbacks or added risks.
- Placement requirements.
- Run persistence rules.

### DayDefinition

- Day number and theme.
- Customer traffic range.
- Allowed customer modifiers.
- Allowed pests and threats.
- Threat budget and cooldown profile.
- Special events.
- Daily score targets.

All scoring, costs, penalties, timers, spawn probabilities, and cooldowns should be editable without code changes.

---

# 17. Recommended system architecture

This is an implementation organization suggestion, not a mandate to replace the project's existing engine or networking stack.

Core systems should have clear responsibilities:

1. **GameSessionManager** — lobby, player roster, campaign state, role assignment, host authority.
2. **DayCycleManager** — preparation, opening countdown, 10-minute timer, closing audit, next-day transition.
3. **RoleManager** — unique random assignment, job-specific tools, role task generation.
4. **TaskManager** — task creation, priority, claiming, completion, rewards.
5. **CustomerDirector** — customer spawning, traffic budget, archetype and modifier selection.
6. **CustomerAI** — individual shopper state machine and navigation.
7. **ThreatDirector** — pest and monster scheduling, encounter budget, escalation.
8. **ThreatAI** — individual monster state machine and counterplay.
9. **StoreStateManager** — cleanliness, stock, customer satisfaction, security, food safety, facilities.
10. **ReputationManager** — 0–100 reputation, five-star mapping, penalties, recovery, one-star trigger.
11. **InventoryManager** — product definitions, stockroom quantities, shelf slots, purchases, spoilage, theft.
12. **StoreEconomyManager** — sales revenue, operating costs, store funds, upgrade purchases.
13. **WorkerRewardManager** — weekly score, equal payout calculation, persistent worker coins.
14. **UpgradeManager** — upgrade definitions, purchase validation, placement, tier effects.
15. **VRInteractionSystem** — hands, grabs, physical interactions, tool slots, interaction affordances.
16. **LocomotionSystem** — arm-swing movement, climbing, collision, comfort settings.
17. **NetworkStateManager** — authoritative shared state, replication, ownership, reconnect support.
18. **AudioDirector** — store ambience, alerts, spatial threat audio, PA events.
19. **SaveManager** — persistent cosmetics, worker coins, unlocks, settings, campaign result records.

Avoid a single giant manager script containing all gameplay rules. Keep each system testable in isolation. Use events or explicit interfaces for communication between systems.

---

# 18. Development roadmap for Claude

Do not attempt to build the full game in one unreviewed code-generation pass. Build a playable vertical slice first, then expand. Preserve existing project structure and working systems if a project already exists. Inspect the repository, engine, networking stack, scene setup, and current conventions before making architectural changes.

## Phase 0 — Project inspection and technical plan

- Inspect the current project and identify engine, VR SDK, networking package, input system, asset conventions, and existing scenes.
- Identify what already works and what must be extended.
- Do not replace working movement or networking systems without a concrete reason.
- Produce a short implementation plan with file-level changes before large rewrites.
- Confirm that the target headset/platform supports the intended player count and VR frame rate.

**Exit criteria:** The project architecture is understood; a small implementation plan exists; no unnecessary rebuild has occurred.

## Phase 1 — VR movement and multiplayer foundation

- Establish arm-swing locomotion.
- Add head and hand tracking, hand poses, grabbing, and basic object physics.
- Add a networked lobby with two or more players.
- Test shared movement and object interaction.
- Add player-name labels and basic proximity voice if already supported by the platform.

**Exit criteria:** Multiple players can move, see one another, grab objects, and remain synchronized in a small test room.

## Phase 2 — Grocery store graybox

- Build the core store zones as a readable graybox.
- Add doors, shelves, checkout, stockroom, cleaning closet, manager office, and staff room.
- Add basic navigation routes and collision.
- Add a safe preparation state and the OPEN STORE control.

**Exit criteria:** Players can physically navigate the store and understand its main areas.

## Phase 3 — Core job simulation

Implement the first essential jobs and shared task flow:

- Stocking Associate.
- Cashier.
- Janitor.
- Maintenance Technician.
- Shift Manager.

Build baseline stocking, checkout, cleaning, repair, role assignment, task board, and store status. Other players must be able to help with all of these tasks.

**Exit criteria:** A small team can complete a safe 10-minute store shift with ordinary customers and a functioning rating system.

## Phase 4 — Customer AI and reputation

- Add customer archetypes and shopping lists.
- Implement browse, select, request help, checkout, and exit states.
- Add patience and complaint logic.
- Add the 0–100 reputation model and five-star display.
- Add incident-based penalties and recovery.

**Exit criteria:** Customers can shop, request service, become frustrated for understandable reasons, and affect store rating correctly.

## Phase 5 — Preparation, economy, and campaign loop

- Add unlimited preparation.
- Add store funds, basic sales, operating costs, and purchases.
- Add temporary store upgrades.
- Add nine-day progression and daily score reports.
- Add one-star fail state and successful week completion.

**Exit criteria:** A complete nine-day campaign can be played with basic systems and a final score.

## Phase 6 — First horror content

Implement a small, polished selection before adding the entire bestiary:

- Rats and flies.
- Shoplifter.
- Mimic Customer.
- Aisle Lurker.
- District Manager fail sequence.

Add the Threat Director and make encounters readable, fair, and network-authoritative.

**Exit criteria:** The store can produce a frightening but fair shift with at least two distinct threat types and a functioning fail state.

## Phase 7 — Expand to all 30 jobs and content pools

- Add remaining roles using the shared JobDefinition format.
- Add remaining customer archetypes and modifiers.
- Add more pests, monsters, upgrades, and day themes.
- Add store systems such as refrigeration, facilities, returns, delivery, and security.

**Exit criteria:** Every role has distinct tasks and specialist value; every major content definition can be tuned through data.

## Phase 8 — Polish, optimization, and release preparation

- Optimize VR frame rate and network traffic.
- Test 1, 2, 4, 6, 8, and 10-player lobbies.
- Test reconnection, host loss, object ownership, and score integrity.
- Balance customer traffic, threat pressure, economy, and rating recovery.
- Add accessibility options, settings, cosmetics, onboarding, achievements, and final audio/visual polish.

**Exit criteria:** A stable nine-day campaign can be completed repeatedly in full lobbies without serious desync, performance collapse, or unfair fail states.

---

# 19. Testing checklist and acceptance criteria

## 19.1 Core campaign tests

- [ ] A new lobby can start with 5–10 players.
- [ ] Every player receives exactly one role.
- [ ] No two players receive the same role in the same run.
- [ ] Role assignments persist through all nine days.
- [ ] Preparation has no active hostile AI and no shift timer.
- [ ] Any authorized player can start the day.
- [ ] The open-store timer runs for exactly 10 minutes.
- [ ] The day transitions into a closing audit.
- [ ] Every new day begins at five stars.
- [ ] The team can regain reputation by fixing valid incidents.
- [ ] Repeatedly performing an already-completed action cannot farm reputation.
- [ ] Reaching one star triggers the District Manager fail sequence.
- [ ] A failed week resets run-based progression but preserves worker coins and cosmetics.
- [ ] Surviving Day 9 produces a final team score and equal worker payout.

## 19.2 Job tests

- [ ] All 30 roles have a unique identity, tool set, and specialist advantage.
- [ ] A missing specialist does not block an essential action.
- [ ] Role tools can be dropped, recovered, and passed to teammates.
- [ ] Role-specific tasks are readable and completable.
- [ ] No role receives consistently impossible or excessively time-consuming daily duties.

## 19.3 Customer tests

- [ ] Customer shopping lists contain valid or intentionally unavailable products.
- [ ] Customers navigate aisles and checkout without persistent path failures.
- [ ] Patience and mood changes are explainable.
- [ ] Customer modifiers do not produce incompatible combinations.
- [ ] Lost-child events have clear safe resolution steps.
- [ ] Mimics have multiple possible clues and are not automatically obvious.
- [ ] Normal customers can occasionally behave oddly without being punished unfairly.

## 19.4 Threat tests

- [ ] Each monster has a distinct behavior and counterplay loop.
- [ ] Threats do not spawn during preparation.
- [ ] Major events have readable warnings.
- [ ] Player-count scaling does not overwhelm small or large teams.
- [ ] A player caught by an ordinary monster can be rescued or returned to play quickly.
- [ ] The District Manager only triggers from the one-star fail condition.

## 19.5 VR and interaction tests

- [ ] Arm-swing locomotion remains stable at target headset refresh rate.
- [ ] Players can pick up, carry, drop, and pass objects.
- [ ] Shelf placement is forgiving and reliable.
- [ ] Scanners, registers, doors, alarms, and tools work with tracked hands.
- [ ] Object physics do not launch players or cause frequent collision bugs.
- [ ] Comfort settings work without breaking the main interaction model.
- [ ] Important sound cues also have visual or haptic alternatives.

## 19.6 Multiplayer tests

- [ ] Shared rating is identical for every client.
- [ ] Store funds and upgrades are identical for every client.
- [ ] Customer and monster state is consistent across clients.
- [ ] Task completion is awarded once, not once per client.
- [ ] Two players cannot duplicate a unique item or spend the same store funds twice.
- [ ] Reconnecting players regain their correct role and state.
- [ ] A host disconnect does not corrupt saved campaign results.

---

# 20. First playable build: exact scope

The first playable build should be small enough to finish but representative of the final game. Do not create all 30 roles and 10 monsters before testing whether the basic loop is fun.

### Include

- One grocery store map with the core zones.
- 1–4 player networking initially, with architecture prepared for 10.
- Arm-swing locomotion and physical object interaction.
- Random unique role assignment from a small initial subset of 5 roles.
- Safe unlimited preparation phase.
- 10-minute open-store timer.
- Three customer archetypes: Routine Shopper, Impatient Shopper, Confused Shopper.
- Three customer modifiers: Spill-Prone, Coupon Dispute, Lost Child.
- Three core tasks: stock shelf, clean spill, checkout customer.
- Shared five-star rating with penalties and recovery.
- Store Funds and two or three purchasable upgrades.
- One ordinary pest type: rats or flies.
- One human incident: shoplifter.
- One monster: Mimic Customer.
- One-star District Manager fail sequence.
- A basic nine-day campaign state, even if early days reuse a smaller event pool.

### Do not include in the first playable build

- All 30 complete role implementations.
- Every customer archetype and modifier.
- Every monster.
- Large cosmetic catalog.
- Complex public matchmaking.
- Deep permanent account progression.
- Elaborate financial simulation.
- Multiple store maps.

The first build is successful when a group can play a complete shift, understand why the rating changes, coordinate to fix problems, and feel pressure from one hidden threat. Expand only after this loop is fun and reliable.

---

# 21. Guidance for future content expansion

When adding a new job, customer modifier, pest, monster, or upgrade, answer these questions before implementation:

1. What new decision does this content create for players?
2. Which existing system does it connect to?
3. How does a player notice it is happening?
4. What physical VR action resolves it?
5. Can another role help if the specialist is absent?
6. What happens if the team ignores it?
7. Does it create a meaningful trade-off or simply add more busywork?
8. Can it be balanced through data rather than hard-coded logic?
9. Does it work in 5–10 player lobbies?
10. Does it preserve VR comfort and performance?

A new feature should deepen the core loop rather than create a disconnected minigame.

---

# 22. Final creative direction

CLOSING TIME should make players laugh, panic, argue about priorities, and celebrate barely surviving a shift. One player is trying to restock cereal while another is trapped in a freezer aisle, the cashier has a line of impatient customers, the Janitor is cleaning a spill that is attracting flies, and the Greeter has just noticed that the same customer has entered the store twice. The team should have to decide whether to finish the sale, rescue the coworker, secure the entrance, or investigate the impossible customer.

The grocery store is the central character. Its routines, sounds, equipment, customers, stock, lights, and back rooms should be familiar enough to operate but increasingly untrustworthy. The strongest horror moments should emerge from the collision between ordinary work and impossible events.

**The central rule:** The players are not entering a haunted building to fight monsters. They are employees trying to keep a grocery store running while the building, its customers, and eventually the store's management become something they cannot explain.

---

# 23. Copy-ready instruction to Claude

Use this document as the game's foundational design specification. First inspect the existing project and report the current engine, VR framework, networking solution, input setup, scene structure, and systems that already work. Do not replace working systems or rewrite the project from scratch without a specific technical reason.

Then propose a phased implementation plan beginning with the first playable build in Section 20. Implement in small, testable milestones. Prioritize stable VR locomotion, physical interactions, multiplayer synchronization, the preparation/open-store/day loop, ordinary customers, stocking, checkout, cleaning, the shared five-star rating, and the first mimic encounter. Keep gameplay data-driven so the 30 jobs, customer modifiers, monsters, upgrades, and day events can be added without rewriting core systems.

Preserve every non-negotiable design requirement in Section 0. If an implementation detail conflicts with the current project or target headset, explain the conflict and propose the smallest change that preserves the intended gameplay. Do not silently remove, simplify, or omit major features. Keep a running list of completed systems, known bugs, and remaining milestones. After each milestone, test the result in the actual VR multiplayer environment before expanding scope.


---

# AMENDMENT 1 — New design decisions and authoritative updates

**Status:** Accepted into the design. If an older paragraph conflicts with this amendment, use the newer rule below.

## A1. Mandatory five-player lobby and job roster

- Normal matches require **at least five players** and support up to ten.
- The five mandatory roles are **Manager, Checkout Operator, Store Clerk, Janitor, and Shelf Stocker**.
- The five mandatory roles are assigned before optional roles. Each is assigned to a different player.
- Additional players receive unique random roles from the remaining 25 specialties.
- The 30-role catalog remains intact. Mandatory role names map to the existing Shift Manager, Cashier, Customer Service Associate, Janitor, and Stocking Associate definitions.
- If a player disconnects, preserve the run. Reassign that role to an eligible unassigned teammate or temporarily use simple role-support AI for critical baseline tasks. Clearly indicate any temporary coverage.

## A2. Preparation phase boundary

Preparation is strictly for **staging and setup**. Players can move unopened boxes to staging areas, arrange carts, position tools, choose upgrades, inspect the store, and plan assignments. They cannot stock shelves, serve customers, clean operational messes, process returns, repair faults, remove moldy food, complete tasks, or earn shift credit until the day begins. The goal is to save time through smart physical setup without allowing actual work to be completed before the shift timer starts.

## A3. Daily operational work

The store simulates persistent physical disorder: customers drop food, leave products in wrong places, abandon refrigerated/frozen goods outside temperature-controlled areas, and cause products to become moldy, spoiled, damaged, or contaminated. Employees must return misplaced products to correct locations, remove unsafe food, restock empty shelves, clean spills, and dispose of waste. Corrective actions can recover cleanliness, food safety, merchandising, and reputation.

## A4. Threat escalation and threat ratings

Every pest and monster has an individual Threat Rating from 1–5. Ratings describe danger and response complexity. Campaign difficulty rises each day through threat budget, chaos budget, customer traffic, modifier complexity, concurrent incidents, and reduced quiet time. Day 9 is the hardest shift.

New threat roster entries:
1. **Terrorist Infiltrator (Rating 5):** disguised as a normal shopper, exhibits suspicious patterns, secretly places fictional explosive devices, and creates a faint proximity-only beeping clue. If confronted before planted devices are secured, it may trigger a much larger carried explosive event with catastrophic local destruction. All explosive interactions must remain fictional, abstract, and non-instructional.
2. **Green Goop / Glutton Slime (Rating 2–4):** sneaks through the store, eats food, grows larger and more dangerous, and leaves contamination that must be cleaned.
3. **Rat King / Rat Queen (Rating 4):** a colony leader that coordinates rats, spreads infestation, and creates a nest-removal objective.
4. **Queen Roach (Rating 4):** a giant cockroach matriarch that generates and protects a spreading roach colony.

The Rat King and Queen Roach are major infestation encounters. They should generally be alternative encounters until the late campaign.

## A5. Gore and physical aftermath

The game may feature mature, graphic fictional VR horror. Player avatars can be visibly damaged, dismembered, and expose fictional internal anatomy. Blood can stain the store and clothing. Body parts and remains can become physical objects that employees must collect and dispose of. Serious incidents generate multi-step cleanup work. Provide gore intensity options, including reduced blood and simplified dismemberment. Preserve VR comfort and clear damage feedback. Do not use real injury imagery.

## A6. Store upgrade: self-checkout

Self-checkout stations are a purchasable store upgrade. They let eligible customers complete simple purchases without requiring a cashier to scan every item. They can malfunction, require assistance, or be exploited, so they reduce workload rather than remove the checkout role. Multiple stations may be purchased if supported by the upgrade system.

## A7. Implementation priority for this amendment

1. Enforce five-player minimum and mandatory role assignment.
2. Add preparation-phase task locks so no operational task can be completed before opening.
3. Add dropped-food cleanup, misplaced merchandise returns, mold/spoilage disposal, and shelf restocking.
4. Add day-by-day Threat Budget and Chaos Budget escalation.
5. Add per-threat rating data and UI.
6. Add the Green Goop growth/consumption loop.
7. Add Rat King and Queen Roach infestation/nest systems.
8. Add the Terrorist Infiltrator as a late-campaign high-risk stealth encounter, with fictional proximity audio and abstract emergency response.
9. Add gore, dismemberment, body-part cleanup, and comfort settings.
10. Add self-checkout as a purchasable, networked store upgrade.

## A8. Required Claude workflow

Treat this as a living specification. Before coding, inspect the existing repository and identify the engine, VR framework, networking layer, current scenes, interaction system, and existing gameplay systems. Do not rebuild working systems merely to match a preferred architecture. Identify conflicts between existing code and this specification, then propose the smallest safe integration plan. Implement one milestone at a time, preserving playable builds. Make day curves, threat ratings, spawn weights, task values, upgrade costs, and penalties data-driven. Add multiplayer tests for role assignment, object ownership, task completion, threat state, store rating, and shift transitions. Never silently omit a requirement; record anything deferred as a named backlog item with its dependency.
