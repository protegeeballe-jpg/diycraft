# DIYCraft: staged Three.js migration

## Current architecture

- `diycraft.js` is the production Canvas 2D engine. It owns movement, collision, world editing, UI, animation, world validation, autosave, backup/restore and offline behavior.
- `js/three.js` is the repository's bundled Three.js r128 library.
- `js/script.js` is an early Three.js proof-of-concept, not a complete replacement for the current game.
- `three-painterly-preview.html/js` is an isolated visual study. It proves local WebGL rendering and procedural watercolor/pencil texture generation, but it does not yet render the user's saved world or implement the production controls.
- `js/three-world-adapter.js` is the first migration boundary. It converts an already validated world object into an immutable, renderer-only snapshot.

## Non-negotiable safety rules

1. Canvas 2D remains the production renderer and the known-good rollback path during migration.
2. The Three.js renderer receives a read-only snapshot. It must never mutate `world`, write `localStorage`, or change the backup format.
3. Do not recolor or normalize saved user hex values. A rendering material may derive textures from a color, but the saved value remains exact.
4. Never replace or delete saved fields merely because the new renderer does not understand them yet. Preserve the existing `validWorld`, save, import, export and gzip paths until parity tests prove otherwise.
5. Feature work lands in small, independently testable commits on this branch. No direct edits to `main`; do not make Three.js the default until the migration gate is met.
6. Include the local Three.js library and required rendering modules in offline-cache planning before any production route is enabled. No third-party CDN dependency.
7. Do not optimize by removing visible detail or disabling existing interactions. Use measured chunking, geometry batching, instancing and texture reuse.

## Migration stages

### Stage 0 — Read-only data boundary
**Status: Complete**
- Pure adapter maps validated saved-world fields to immutable renderer snapshots.
- Covers blocks, custom colors/textures, doors, 20 tile patterns, player appearance/pose, excavations, layered water, fish, animals, Material Bucket, and normalized 60-slot materials/crafted inventories. The snapshot keeps renderer-default solid appearance separate from explicitly configured saved styles.
- Source data is not mutated; there is no DOM, storage, or Three.js dependency in the adapter.
- Regression tests cover malformed data, legacy water saves, limits, duplicate animal IDs and exact color preservation.
- CI validation passed: https://github.com/protegeeballe-jpg/diycraft/actions/runs/41766918674

### Stage 1 — Render the real starter world
**Status: Complete**
- Added shared procedural watercolor and colored-pencil texture materials in `js/three-painterly-materials.js`.
- Added an isolated read-only preview route at `three-world-preview.html`.
- The CI test extracts the actual production `freshWorld()` function from `diycraft.js`, generates the starter-world fixture, adapts it, and renders it with the bundled local Three.js r128 library.
- The latest starter scene contains 232 source blocks, including 17 animated flower plants, with the player drawn at the saved spawn coordinates and painterly materials reused across geometry groups.
- Solid voxel blocks are batched with `InstancedMesh`; the preview never reads or writes browser storage.
- `js/three-performance-profile.js` selects conservative, balanced or high rendering settings from device signals. The low-end profile caps rendering at 30 FPS, clamps pixel ratio to 1, disables multisample antialiasing and realtime shadows, and reduces procedural texture resolution/detail without removing painterly materials.
- `js/three-plant-geometry.js` builds flowers and tall grass as one vertex-colored, painterly mesh per plant. This keeps the full plant count and sway motion while reducing draw submissions.
- Automated browser checks assert that every source block is represented, the original world object remains unchanged, the WebGL render loop advances, and painterly materials and instanced groups are present.
- CI validation passed: https://github.com/protegeeballe-jpg/diycraft/actions/runs/41767639398
- Screenshot artifact: `diycraft-three-actual-starter-world` (retained for 7 days by CI).

### Stage 2 — Editing parity in a sandbox
**Status: In progress — block editing, doors, all tile patterns, animals, water/fish, Material Bucket reuse, ground digging/refilling, player collision and home/neighbor/animal protection have isolated regression coverage; production remains untouched**
- `js/three-world-edit-sandbox.js` clones the immutable renderer snapshot into private in-memory state and exposes selection, validated block placement/removal, door toggling, tile-pattern changes, stacked water-layer addition/collection and fish placement. Removal recovers the original block appearance into a bounded 120-item Material Bucket and refuses destructive edits when the bucket is full.
- Water edits follow the production rules: only excavated cells can be filled, each cell is capped at its recorded depth, collection recovers a water item into the Material Bucket, and collecting the final layer removes fish in that cell. A wet cell accepts up to three fish.
- Terrain editing now covers both directions. `excavateGround()` adds one layer per dig, creates the matching dirt Material Bucket item, increments a stackable dirt entry in the 60-slot materials pouch, and enforces the production 99-item stack, 120-item Bucket, 12,000 ground-cell and safe-depth limits. If the targeted cell contains water, digging collects a water layer instead. `fillExcavation()` prechecks the full cell range, fills all underground layers with the selected block, then clears the excavation, water and fish together without altering the Bucket. Both use normalized `{x,z,depth}` records inside the sandbox.
- The adapter preserves the validated materials and crafted pouches as bounded 60-slot arrays, plus the original bounded per-animal care counters (including counters for saved animals). It also distinguishes renderer-only default material values from user-configured solid styles, so default colors are rendered without being incorrectly written into placed block records.
- Material Bucket selection is now exposed in the sandbox. A recovered item can be selected and reused repeatedly; block color, texture, tile pattern, and door style/orientation/swing are restored from the bucket record. The item remains in the bucket, matching Canvas 2D. Water bucket entries route to water-layer placement rather than becoming voxel blocks.
- The edit preview renders each pool as a combined animated vertex mesh and fish as instanced meshes. The low-end profile draws at most 48 fish and updates water vertices at 15 FPS while the overall scene remains capped at 30 FPS; this limits animation cost without deleting any fish from sandbox data.
- `js/three-world-protection.js` preserves the three fixed neighbor-home rectangles and the original strict proximity thresholds: less than 1.05 blocks from a neighbor and less than 0.7 blocks from an animal. The sandbox applies these checks to ground digging, block removal, and water addition/collection, while leaving hole filling unchanged as in Canvas 2D. Saved animals and the seven default roaming animals contribute to the protection context. Active neighbor waypoint routes, phases, speeds and night sleep positions are cross-checked against Canvas 2D. Neighbor path prediction uses the production half-block obstacle grid (0.23 collision radius, 2.16 navigation height), the same solid/door/plant/tile/excavation rules, nearest-open-cell search, ordered eight-direction breadth-first search, diagonal corner clearance, and eased distance-based travel timing. Navigation and route caches are keyed to the sandbox world revision. The same module now ports the seven default animal strolling paths and saved-animal merge rules, plus the original closest-animal screen hit test and its strict 66-pixel radius; tests compare both `animalPositions()` and `animalAtScreen()` directly with the Canvas 2D source.
- Movement parity includes a port of the production player-capsule calculation: radius 0.23, body height 1.72, step allowance 0.18, tile slab thickness 0.13 / base offset 0.02, plant pass-through, and terrain-floor collision at excavation depth. Cell occupancy is tested separately: a closed door reserves both vertical cells for placement; the legacy Canvas 2D player collider itself retains its existing one-cell-high approximation and open/closed behavior. The migration does not silently change that existing movement rule.
- Each operation returns a detached, deeply frozen state snapshot. The original renderer snapshot is checked for unchanged content; no storage APIs or production-world references are used.
- Compatible solids and tiles are grouped by material and 16×16 world chunk into `InstancedMesh` batches. This allows the renderer to cull distant chunks as units instead of submitting one draw object per block. Animated plants remain individually addressable one-mesh objects; doors remain separate so their hinges can animate.
- `js/three-world-raycast.js` resolves Three.js intersections to stable block keys for both instanced blocks and ordinary meshes/groups. Browser placement uses the clicked face normal and rejects occupied cells.
- `js/three-door-motion.js` provides a pure smoothstep animation helper using the production 260 ms duration and 1.32-radian open angle. It supports continuous reversal while the door is moving; the browser preview animates the door leaf and its selection outline together.
- Regression tests cover valid/invalid placement, occupied cells, removal/reuse, exact custom colors, reusable Material Bucket items, Canvas 2D default bucket colors for every solid type, door orientation/style/swing, all 20 tile patterns, plant pass-through, player capsule radius/body/step-height rules, tile and excavation collision, two-cell door occupancy, ground digging and layer-by-layer filling, dirt materials/Bucket rewards and limits, water depth/stacking/collection, fish limits, bucket-full protection, immutable state and nearest-hit selection. A parity harness extracts the actual Canvas 2D placement, removal, ground-digging, hole-filling and player-collision functions and compares their results with the Three.js sandbox. The door helper has deterministic endpoint, midpoint and reversal tests. Fixed-home coordinates and neighbor/animal distance checks are also compared directly against the original `isProtectedDigCell()` function.
- CI runs the adapter, editing-sandbox and raycast tests independently.
- `three-world-edit-preview.html` and `three-world-edit-preview.js` provide a separate interactive browser sandbox with real 3D raycast selection, face-normal block placement, removal, door open/close, and tile-pattern changes. Occupied face targets are rejected rather than silently shifted. It loads the CI-generated production starter-world fixture and uses the painterly material library.
- Browser regression coverage in `tests/three-world-edit-preview.cjs` verifies projected selection, face-normal placement, add/remove, Material Bucket recovery/reuse, door style textures/hinges/animation, all 20 tile patterns, water filling/stacking/collection, fish placement/limits and live animation, hole refilling, repeated digging with both inventory rewards, all seven default roaming animals alongside saved animals, and tap-to-care interactions for a built-in resident and a saved pet. Care tests cover the four original gentle actions, the 999 counter ceiling, animal-first selection before block raycasting, and isolation from the source snapshot and browser storage. It runs on a touch-enabled 390×844 phone viewport at 3× device scale factor with the low-end profile. The phone test additionally attempts digging inside a protected home and near a moving neighbor, and adding/collecting water near saved roaming animals; these operations must be rejected without changing the world.
- `tests/three-world-canvas-parity.test.cjs` extracts the actual production Canvas 2D `addBlock()` function and compares its resulting block records with the Three.js sandbox for custom blocks, tiles, doors, styled solids and flowers.
- Cross-engine checks also cover two-cell door occupancy, excavation depth, the world-height ceiling and duplicate-cell rejection. The migration guard now runs the door-motion timing tests alongside the adapter, sandbox, raycast and Canvas 2D/Three.js parity suites.
- Latest previously confirmed CI runs: migration guard `41788559232` and touch-enabled browser / Play Mode / large-world stress run `41788512966`. The 2,032-block editable world measured 78 render objects, 90 draw calls, 34 geometries and 14 textures at a 390×844 low-end canvas; the corresponding read-only stress scene measured 86 draw calls, 33 geometries and 14 textures. Since those runs, production-extracted obstacle-aware route and time-cycle parity tests, neighbor visual detour checks, default/saved animal movement and hit-test parity, isolated animal-care actions, and mobile animal-care browser scenarios have been added. In the latest local execution harness, adapter, protection, editing-sandbox and neighbor-model suites pass 16, 19, 34 and 3 cases respectively; the preview and browser-test scripts parse. The expanded mobile browser test is configured in `.github/workflows/three-world-preview.yml`, but a new GitHub Actions result for this change set is not yet confirmed. These software-WebGL CI measurements are not physical-phone FPS guarantees; representative low-cost Android devices remain necessary before cutover.
- Remaining before Stage 2 completion: continue terrain/door interaction checks, verify the complete editing flow on representative low-cost Android devices, and finish the remaining visual/input/UI parity. Do not connect production controls or storage.

### Stage 3 — Player, physics and animation
**Status: In progress — player movement, jumping, flight, camera modes, collision recovery, obstacle-aware NPC routes, seven neighbor models, seven default roaming animal models and animal-care interactions are implemented in the isolated sandbox; the original game has no swimming mechanic to port**
- `js/three-player-physics.js` ports the original 60 Hz player movement step: keyboard/touch direction normalization, yaw transforms, independent X/Z collision sliding, step-height/floor behavior, gravity/falling/landing, flight controls, world bounds and sleep/bed activity rules. The fixed-step accumulator clamps long frame stalls and never exceeds six physics updates per rendered frame.
- `js/three-player-camera.js` reproduces the original first-person eye offset and third-person follow pose. `js/three-player-model.js` renders the saved player character colors with a lightweight reusable geometry set.
- `js/three-world-protection.js` also exposes the seven original neighbor/family presentation states. These are compared field-by-field against production `currentNeighbors()`, including all seven active route schedules, appearance colors, hair/outfit/accessory choices, pace, scale, activity markers, sleep positions and facing.
- `js/three-neighbor-model.js` builds painterly Three.js character models for Hyacinth, Theo, Miguel, Ana, Lia, Maya and Nico. Each has a merged body mesh plus four animated limb meshes using the shared watercolor/colored-pencil surface material. The edit preview updates each character from the same obstacle-aware route prediction used by digging protection, retains the production movement cadence and camera-distance visibility rule, and hides residents at night as Canvas 2D does. Browser checks verify all seven model identities, original appearance styles and world-space poses. A new mobile-browser integration check places a stone obstacle in a known free starter-world cell, confirms Hyacinth's visible 3D model follows the newly detoured route, then removes the obstacle under the same live protection context and verifies exact route/model-position restoration. The deterministic edit hooks exist only on the experimental preview diagnostics object.
- NPC tap selection now shares a pure tested picker with the preview interaction path. It keeps the original Canvas 2D front-facing anchor offset (0.38 blocks), actor sleep exclusion, nearest-hit choice, first-in-list tie behavior, and strict 66-pixel radius; regression tests execute the actual production `neighborAtScreen()` function as the reference. Animals still take priority over neighbor coloring, and neighbors take priority over block raycasting.
- The editor's animal models now include the seven original residents even when the saved `animals` array is empty, then use the remaining low-end instance budget for the nearest saved animals. Their roaming coordinates and facing follow the production `animalPositions()` formula. Tapping an animal opens an isolated version of the original care panel before neighbor coloring or block raycasting; snack, water, brushing and play update only the cloned sandbox counters, preserve the 999 cap and show the matching care feedback. The floating care emoji remains visible for the original 1.9-second window even after the panel closes. Production saves and `localStorage` remain out of scope.
- Water behavior was audited against production `move(dt)`, `playerCollisionAt()`, `terrainCollisionAt()` and water-surface helpers. Canvas 2D animates pool surfaces and fish, but player movement, gravity, collision, jumping and flight do not read water depth or water level. There is no existing swimming behavior to port; a regression test confirms that adding water to an otherwise identical excavated cell does not change the player physics result.
- The isolated editing preview has a Play Mode with WASD/arrow controls, touch D-pad, drag-to-look, camera switching, jump and flight toggles. Physics updates at 60 Hz while the low-end visual render cap remains 30 FPS.
- Player capsule collision and the original nudge-out-of-blocks recovery are compared directly with the real Canvas 2D functions. Browser tests cover walking, jump arc/landing, flight, camera switching, touch-pad movement and return to Build Mode on a simulated low-end touch phone.
- Neighbor protection prediction uses the same obstacle-aware route calculation as the production NPCs. The regression suite extracts the original Canvas 2D path functions and compares obstacle cells, blocked/direct paths, route positions and eased travel timing across all seven active actors; sandbox placement and removal are also checked for cache invalidation.
- Remaining: continue full world-rendering and UI/input parity checks, then verify movement and frame stability on representative low-cost Android devices. NPC tap selection now has an explicit source-parity helper/test, while the mobile browser flow continues to verify real resident taps and coloring. Swimming should not be invented unless the production game gains that mechanic through a separate, deliberate design change. Keep every addition isolated and test-driven.

### Stage 4 — UI, inventory and persistence parity
- The isolated editing preview now renders the original day/sunset/night palettes and auto-cycle boundaries using a single vertex-colored sky dome, one celestial mesh, and one 44-point star mesh. Palette changes reuse existing geometry/materials; no new watercolor texture is generated for a time transition. A time selector changes only the sandbox clone and never persists to browser storage.
- The world-time palette helper preserves the exact original Canvas 2D sky, ground and sun colors/overlays. Automated tests compare static colors and auto-cycle thresholds; browser checks cover the selector, actual light/sky updates, night stars, and automatic transition states.

- Reuse or adapt the existing UI; preserve all 20 tile designs, all color pickers, bucket, crafting, animal care, art gallery, world time, backup and restore.
- Stage 4 inventory increment: the isolated preview now includes the original 60-slot Resources/Crafted pouches, the 120-item Material Bucket, and the four original recipes. Crafting prechecks material quantities and output capacity before consumption, mutates only the sandbox clone, and preserves 99-item stack behavior. Unit and phone-browser tests cover all recipes, insufficient materials, full output pouch, output stacking, unchanged source snapshot and zero storage writes. The browser protection flow now reads its pre-edit revision from the sandbox state after prior care actions, rather than relying on the cached frame-diagnostic revision field.
- Keep the same world serialization schema and gzip prefix.
- Test round-trips: old save -> load -> render -> edit -> save -> reload -> compare fields.
- Test offline reload with the local Three.js and adapter assets cached by the service worker.

### Stage 5 — Performance, visual QA and controlled cutover
- Use the capability-based profiles in `js/three-performance-profile.js`: low-end devices use a 30 FPS render cap, 1× pixel ratio, no realtime shadows or antialiasing, 128 px painterly textures and reduced procedural stroke count; balanced devices use 45 FPS / 1.2× / 192 px; higher-capability devices use up to 60 FPS / 1.5× / 256 px.
- Compatible solid meshes are grouped by 16×16 world chunk and material, while plants use one vertex-colored painterly mesh each. Chunk-level frustum culling, cached materials and bounded texture anisotropy are part of the performance baseline.
- Browser CI exercises both the real starter world and a synthetic 2,032-block world in a 390×844 mobile viewport at 3× device scale factor, with low-end hardware signals. Both the read-only renderer and the interactive editing sandbox are measured. The editor stress pass checks representation coverage, batch/render-object counts, draw calls, geometry and texture counts, storage isolation, unchanged source data and actual canvas pixel dimensions after the 1× cap. The normal interactive editing test also runs as a touch-enabled phone viewport.
- Low-end software-WebGL CI measurements: the 232-block starter scene with 18 test animals used 41 draw calls, 33 geometries and 12 cached textures, retaining all 18 animal records while drawing the nearest 12 in 7 batches. The synthetic 2,032-block + 18-animal read-only scene used 54 spatial/material groups, 86 draw calls, 33 geometries and 14 textures. The same interactive editor used 54 instanced block batches, 78 render objects, 79 draw calls, 26 geometries and 8 textures at a 390×844 canvas, with all 18 animal records retained and 12 rendered. These are repeatable software-WebGL CI measurements, not physical-phone FPS guarantees; representative low-cost Android devices must still be part of final cutover QA.
- Measure frame time, memory, draw calls, geometry and texture counts on desktop and mobile.
- Use instancing/merged chunk meshes and frustum/occlusion culling where they preserve visible details.
- Verify no new console errors, lost save data, changed color values, broken controls or missing offline assets.
- Ship a deliberate renderer switch only after all acceptance tests pass and a tested rollback route exists.

## Acceptance gate before cutover

- All existing world-schema and backup tests pass.
- Existing saves load without rewrite or migration loss.
- All block types, custom textures, doors and tile patterns render and remain editable.
- Player movement, camera modes, collision, water, animals, plants and other animations work.
- Color picker spectrum and stored color strings are unchanged.
- Mobile touch controls and offline play pass browser tests.
- Performance is measured against the current Canvas 2D baseline on representative devices.
- Canvas 2D remains available as an explicit rollback until the new renderer has proven stable.

## How to run adapter tests

```sh
node tests/three-world-adapter.test.cjs
```

The adapter has no dependency on Three.js, the DOM, canvas or browser storage. This is intentional: data compatibility is tested independently from rendering.


## 2026-11-05 repository audit and migration checkpoint

- Audited all 65 tracked repository files: source modules, production and offline HTML, the service worker, CI workflows, previews, tests, documentation, the SVG icon, the two PNG icon assets, and the empty Pages metadata file. Binary app icons were verified as PNG assets; they are not source files to rewrite.
- The live entry point remains deliberately unchanged: `index.html` loads `diycraft.js`, the existing Canvas 2D engine. The offline entry point does the same. Three.js work remains isolated in the migration previews/sandbox; do not switch production rendering until the full acceptance gate and rollback checks pass.
- The prior migration-guard Actions run passed. The browser-preview workflow did not reach its interactive browser suite: the preceding 2,032-block low-end stress check failed on a stale test ceiling of seven animal appearance batches. Its fixture intentionally renders seven built-in residents plus five saved pets; the selected pets include alternate coats/colors, so the valid batch range is seven through twelve because an individual saved pet can use a different coat/accent from the resident of the same species. The invariant is now tied to the actual visible-animal count (12 on this profile), not an assumed number of distinct appearances. The assertion is corrected without changing renderer limits, animal data, or visibility behavior.
- Neighbor selection now routes through `pickNeighborAtScreen()` in `js/three-world-protection.js`. A dedicated parity test executes the actual Canvas 2D `neighborAtScreen()` implementation and compares screen probes, closest-hit selection, strict 66-pixel edge behavior, sleeping residents, and projection misses.
- Production storage, save schema, gzip encoding, backup/restore, offline behavior, and the Canvas 2D rollback path are not modified by this checkpoint.
- Commit scope: `test: align animal batching and verify NPC tap selection parity`. This commit is confined to the `three-js-migration` branch.

- Follow-up for Stage 4: port the original 20-pattern tile, color-picker, inventory/crafting, art studio, character studio, backup/restore and save interactions in the same isolated, test-first manner. This time-of-day increment intentionally does not connect production persistence or modify the world schema.

- Follow-up browser run `41876943822` passed both low-end 2,032-block stress checks and the real starter-world render, then exposed a test-clock mismatch in the NPC restoration assertion: its expected actor state used a fixed 3.1-second route sample while its baseline Three.js model transform still reflected the live animation clock. The sandbox diagnostic `getNeighborStats(3.1)` now synchronizes the preview model to the same explicit sample time before reporting its position. This only affects the experimental preview diagnostic path; production NPC timing and movement logic are unchanged. Rerun the browser workflow before marking the check green.

- Follow-up browser run `41944853770` passed both low-end 2,032-block stress checks and the real starter-world render, then correctly reported 233 sandbox blocks after the test had filled one previously excavated cell with stone. The assertion had compared against the original 232-block fixture, so its expected count was stale. The preview now exposes a diagnostic that derives represented block keys from actual Three.js chunk batches, plant roots and door roots; the browser test confirms the current edited-world count and asserts zero missing or duplicate representations. This strengthens the parity check instead of relaxing it.

- The editing preview’s low-end draw-call check now includes the always-visible player avatar in Build Mode. The former avatar used multiple individual meshes; it is consolidated into one vertex-colored BufferGeometry using the cached painterly paper material. The geometry preserves all original saved hair styles, outfits, accessories and color fields, and is rebuilt only when appearance changes. A focused unit test covers one-mesh output, style variants, pose updates without geometry rebuild, and disposal. This keeps the original strict 45-call starter-scene budget rather than raising it.

- Browser follow-up on the one-mesh avatar commit passed the 45-draw-call starter-scene budget and reached the real block-placement interaction. The test’s projected-block search can deliberately encounter an animal first because the game prioritizes animal care over block selection; it now closes that expected modal and continues searching, rather than attempting to click build controls underneath the modal. Gameplay selection priority is unchanged.

- The touch-browser jump scenario now synchronizes its assertions with the actual fixed-step physics state: wait until grounded, confirm jump velocity is accepted, wait for measurable ascent, and wait for ground contact. This replaces fixed 180 ms / 850 ms sleeps that were timing-sensitive under variable software-WebGL render scheduling. Physics constants and the gameplay jump implementation are unchanged.

- The browser test’s Material Bucket expectation now includes both deliberate sandbox removals in the scenario: the temporary NPC obstacle is recovered first, and the later user-placed test block is recovered second. The test selects and reuses the second item, then verifies both recovered items remain available. This corrects the fixture baseline; bucket behavior and production rules are unchanged.

- The production Canvas 2D `saveColoring` handler was checked directly. It calls the original `addItem('picture','crafted',label)`, whose stack behavior merges picture entries by item ID, increments the existing count, and retains the first stack label. The browser scenario already crafted a picture frame earlier, so the subsequent shared artwork correctly increments that existing picture stack to two while its actual artwork name/data are stored separately in `world.artworks`. The browser assertion now verifies this exact production behavior instead of expecting an impossible second label on the merged stack; sandbox and production behavior are unchanged.

- Stage 4 Character Studio increment: the isolated preview now provides the four original production starter looks, all seven hairstyles, five outfits, five accessories, and the original seven color controls. The sandbox validates every enum/color before mutating its private player clone, retains position/facing/bed fields, and exposes only an explicit appearance update. The preview rebuilds the one-mesh painterly avatar only when the user applies changes; it does not rebuild per frame or write browser storage. Unit and phone-browser tests cover presets, custom styles/colors, one-mesh geometry and unchanged source state.

- Stage 4 Art Studio and Gallery increment: the sandbox now reproduces the original freehand drawing canvas, pointer/touch painting, brush color/size, clear action, named PNG save and 20-artwork gallery. The gallery reads the original `{name,data}` PNG records without conversion. Standalone Art Studio saves use the production blank crafted-item label; neighbor coloring keeps its neighbor-specific label. Tests cover source isolation, image format, pouch stack behavior, gallery display, gallery capacity and oversized/invalid PNG rejection.

- The Art Studio browser run passed low-end stress and starter-world rendering, but its interactive test reached the existing keyboard-movement check with focus still on a form control from earlier build steps. The game intentionally ignores WASD while an input/select is active. The test now explicitly returns focus to the page, verifies that focus state, and waits for the required measured player displacement; movement controls and physics constants are unchanged.

- Added `adapter.toSavedWorld(snapshot)` as a one-way export boundary from renderer state back to the original version-1 DIYCraft JSON schema. It strips renderer-only block/animal keys, `savedFields`, source markers and diagnostic counts; converts excavations, water layers and fish back to original coordinate arrays; exports only explicitly saved solid styles; and keeps the original player, animal, inventory, Material Bucket, PNG gallery, time and design records. The new compatibility test extracts and runs the real production `freshWorld()` and `validWorld()` functions from `diycraft.js`, then proves a representative Three.js snapshot round-trips through that unchanged validator. Production persistence remains untouched.
- Repository-wide checks of tracked active source, archived HTML, offline files, docs and workflows found no gzip/gunzip, CompressionStream, pako, LZ or compressed-backup prefix in this repository. The current production `localStorage` and `.json` backup paths use plain JSON; no compression wrapper is being added to migration exports.

- A syntax-only guard failure identified an over-escaped slash in the serializer's PNG data-URI validation regex. The source regex is corrected to match the same `data:image/png;base64,` form used by the production validator.

- Save-schema compatibility test was hardened after discovering the migration branch carries a newer save-handler revision than untouched `main`. The guard now fetches `origin/main` read-only and the test executes both real `freshWorld()` / `validWorld()` implementations from production main and the migration branch. Both must accept the serializer's version-1 backup and round-trip all representative game state.

- Added sandbox-only world name editing, JSON backup download and restore controls. Downloads use `adapter.toSavedWorld()` and the original `.json` file naming pattern. Restore rejects non-JSON, non-world, and files above 32 MB, constructs a complete replacement snapshot and editing sandbox before swapping, resets the player model/camera, and leaves the current world untouched when parsing or validation fails. Browser coverage checks exact JSON schema, filename, PNG artworks, character appearance, successful restore, malformed restore rollback, and zero localStorage writes.

- Stage 4 design parity increment: validated solid/custom, door and tile design panels now update only the sandbox's saved design settings. Newly placed materials inherit the selected color/texture, door style/color, or any of the original 20 tile patterns; existing blocks keep their own finish. Empty Material Bucket is also supported and clears its selection. Unit and browser tests cover valid/invalid settings, inherited styling, and source isolation.

- Added safe Clear Placed Blocks parity: the sandbox uses the exact original `freshWorld()` starter coordinates and removes only blocks outside that starter set; its occupancy and key indexes are rebuilt. The preview asks for confirmation before clearing, matching the original warning that starter homes remain. Empty Material Bucket also asks for confirmation and preserves items on dismissal. Browser tests cover dismiss/accept paths, preservation of all 232 starter blocks, and clearing the recovered bucket only after explicit confirmation.


## 2026-11-05 security and regression checkpoint

- Added `tests/three-security-guard.cjs` and wired it into the migration guard workflow. The guard rejects dynamic HTML/code execution sinks, string-based timers, runtime script injection, unreviewed network transports, dynamic imports, remote URL literals (except the fixed W3C SVG namespace used by local coloring artwork), unexpected fetch calls, and browser-storage writes in the isolated renderer.
- The guard validates same-origin-only script tags and restrictive CSP directives on the production, offline, read-only preview and editing-preview pages. It pins the vendored Three.js r128 Git blob to the reviewed SHA-1 `b14f47c0908bab15e890b468d53bb07db0be3a18`; changing the vendor requires an explicit version, provenance and license review.
- Security review found no current dynamic HTML/code sinks or unreviewed network paths in the reviewed migration runtime. The only preview network reads are the same-origin CI-generated `./preview-three/starter-world.json` fixture; the sandbox reads storage length for isolation diagnostics and does not write user storage. This is a static review and CI guard, not a claim that all possible vulnerabilities are eliminated.
- The latest migration guard run `41957292646` passed on commit `e63f067ccd1d016ef0f622ef8a28bf55840f44c0`, including the security guard, both production/migration save-format compatibility checks, editing-sandbox and gameplay parity tests, mobile performance-profile tests, and all remaining unit regressions.
- The latest actual starter-world preview run `41950730948` passed the 2,032-block low-end software-WebGL stress test, real starter-world render and interactive editing browser suite. Its artifact is a CI software-rendering preview, not a physical-device certification.
- The production `main` renderer and offline entry point remain on Canvas 2D. Do not cut over until representative low-cost Android devices pass WebGL availability/context-loss recovery, touch interaction, orientation/resize, memory and frame-time checks, offline cache/reload, save/restore, and rollback acceptance.


## 2026-11-05 visual renderer direction and animal readability

- The permanent target is Three.js/WebGL for the game world. Canvas 2D remains only where it is a tool rather than the world renderer (for example, local procedural texture generation, drawing/coloring canvases, and parity tests). Canvas 2D scene rendering is not the long-term production direction.
- The Three.js material path now keeps watercolor and colored-pencil treatment deliberately visible on the low-end profile. It uses locally generated, cached CanvasTexture maps with stronger pigment blooms, denser directional pencil hatching, a secondary cross-hatch pass, and paper-tooth detail. Strength is controlled independently from texture resolution; low-cost devices retain the artistic treatment while using 128-pixel textures, capped pixel ratio, no antialiasing, and no real-time shadows.
- Added profile regression assertions so visual strength cannot silently fall back to the earlier reduced low-end pencil settings.
- Rebuilt animal proportions: smaller body ellipsoids, heads projected beyond the body front, visible eyes/muzzles/species details, and four separated legs reaching the ground. Animal species and colors continue to use the same instanced one-mesh path. A geometry regression suite checks the head/body silhouette, eye placement, leg reach/separation and vertex-color alignment for all seven species.
- This is a Three.js migration increment, not the production cutover. The live index.html and offline entry point still require a completed live-storage bridge and full interaction/save parity before they can stop loading the Canvas 2D renderer. The migration branch remains isolated until those gates pass; do not merge or publish a half-migrated app.


## 2026-11-05 production save bridge groundwork

- Added a dedicated Three.js world-storage adapter for the original `diycraft_peaceful_voxel_v1` key and version-1 JSON schema. It reads legacy plain JSON and the lossless gzip-prefixed save representation already introduced on the production branch; it serializes renderer snapshots only through `adapter.toSavedWorld()`.
- Startup distinguishes a missing save from an unreadable save. A corrupt or inaccessible existing save is preserved, reported as recovery-required, and blocks ordinary renderer writes. The explicit restore path parses, validates, normalizes and serializes the replacement before its single storage write; invalid restores leave the existing key untouched.
- Storage write permission is isolated to `js/three-world-storage.js`. The security guard explicitly reviews this one module and continues to reject browser-storage writes in every other Three.js renderer module.
- The adapter is tested against the actual production `freshWorld()` and the existing renderer adapter, including old JSON, compressed JSON, exact version-1 export, corruption preservation, restore rollback, storage-denial and quota errors. This is groundwork only: the live entry point is not yet connected to this module, and the Canvas 2D scene remains active pending the full Three.js runtime and feature-parity cutover.


## 2026-11-05 live Three.js entry-point cutover

- The production `index.html` and `offline/index.html` now load the local Three.js r128 runtime and the shared production editing interface; neither page loads `diycraft.js` as its world renderer.
- The live renderer boots from the canonical version-1 starter world only when the device save is absent. Existing JSON and gzip-prefixed saves are read via the dedicated storage adapter. Renderer state is serialized through the version-1 adapter and auto-saved to the existing `diycraft_peaceful_voxel_v1` key; invalid or inaccessible saves remain protected until the user restores a valid backup.
- Player movement/camera pose is debounced into the same saved player record. Page visibility and page-exit events use the dedicated synchronous JSON save path. Manual Save, version-1 JSON export, JSON/gzip backup restore, animal placement, gentle animal care, home bed, and activity controls are available in the live UI.
- The service worker cache is versioned and precaches all Three.js production modules. Same-origin script requests use network-first caching with a cache fallback, so the Three.js app can start after a first successful online install when offline.
- Canvas elements remain only for Art Studio, neighbor coloring, and local texture generation; the 3D world itself is rendered by WebGL/Three.js. This is the permanent renderer direction.
- Automated production-browser and offline-cache checks are being moved from the retired Canvas 2D expectations to the new live Three.js entry point. Physical low-cost Android validation remains important for final device-specific WebGL support and memory/frame-time behavior.


## 2026-11-05 animal and flower shape refinement

- Animal body ellipsoids now use compact species-specific proportions instead of one broad generic body. Head, legs, species markings, instance batching and painterly surface material remain unchanged.
- Flowers now use eight folded, cupped petals with raised ridges, a raised center and two dimensional leaves. The flower remains one merged mesh per plant, preserving the low-draw-call strategy.
- Tall grass blades use folded two-facet geometry to retain visible volume from multiple camera angles.
- Dedicated tests check animal body width/height and flower petal relief, color/UV alignment, normals, and the geometry budget.


- Autosave timing refinement: completed world edits (placement, removal, inventory/care/design changes) now begin the save immediately; continuous player movement/camera pose remains debounced. The page-exit synchronous writer still supersedes any older in-flight compressed snapshot.


- Sheep silhouette refinement: the fleece cluster was tightened around the torso and the head enlarged slightly so the sheep reads as a sheep rather than a domed shell. All species use a slightly more upright body profile after visual review of the rendered screenshot.


- Animal close-up refinement: non-giraffe heads sit higher and have more readable face proportions; sheep fleece is tighter, with legs set farther from the torso so the silhouette reads as a four-legged animal. The giraffe's neck/head design and bird body remain species-specific.


- Animal silhouette structure: mammal torsos are now narrower across X and longer along the front-to-back Z axis; non-giraffe mammals have a short angled neck connecting torso to raised head; leg stance follows the broader torso footprint. Bird and giraffe profiles remain intentionally distinct.


- Sheep/animal face visibility pass: reduced torso height slightly and lifted non-giraffe heads and necks toward the front (+Z) so faces remain separate from the body at the normal isometric camera distance. Head sizes were increased proportionally, while the body widths and one-batch animal geometry budget remain bounded.


## 2026-11-05 animal articulation and face-attachment refinement

- Faces are built as small, layered watercolor-colored geometry decals positioned just outside the curved head surface. This avoids eye, pupil, highlight, nose and muzzle geometry being occluded inside the head sphere; no remote textures or network requests are introduced.
- Four-legged animals use upper-leg sockets that overlap the torso and limb geometry, and their paws/hooves overlap the lower leg. The overlap makes the connections read as joints rather than detached table legs.
- Bird bodies remain instanced, while left/right feathered wings use separate instanced meshes whose matrices are composed from shoulder pivots each frame. The wing tips flap in opposing local rotations, with a gentle airborne bob and bank. This retains batching rather than creating one Three.js draw call per bird.
- Existing watercolor + colored-pencil materials are reused on every added feature; no extra texture downloads or shadow-map requirements are introduced.
- Automated checks cover visible face geometry, joined leg sockets, the mirrored shoulder-wing shapes, airborne height and changing wing angles in the live browser.


- Visual-angle correction from the focused screenshots: ground animals now turn their face direction toward the current orbit camera so the eyes and muzzles remain visible while players explore from different sides. Birds retain their flight heading. Bird wing shoulder pivots have been raised to the upper body line so the feathered wings no longer disappear behind the torso from the normal elevated camera.


- Bird silhouette pass after close-up review: the torso was reduced to a leaner flight body, the head and beak were enlarged slightly, and three short tail feathers replace the blunt tail ball. The wing pivots, wing instances and flight motion are unchanged.


- Ground-animal proportion pass: mammal torsos were narrowed laterally, heads raised and scaled slightly larger, and leg sockets moved inward to remain attached to the narrower body footprint. The aim is a distinct head/neck/torso silhouette rather than a broad oval, while preserving the existing watercolor surface and instanced rendering.


- Bird face visibility: the two eye assemblies now sit on opposing side/front surfaces of the head rather than only on the front plane. The bird can maintain its flight heading and still show the near-side eye as it turns. Eye whites and pupils were enlarged slightly across the animal set for readability at normal gameplay scale.


- Ground-animal gait refinement: mammal torsos retain four visible hip sockets while the four legs and paws/hooves are separate instanced geometry, pivoted at each hip. Each leg swings in an alternating diagonal gait. Four legs per animal are stored in one instanced mesh per appearance, rather than four draw calls per animal.
- The browser test checks that each ground animal receives four leg instances and that the swing angle changes over time; geometry tests verify the leg spans the hip-to-ground range and includes a paw or hoof.


- Ear visibility correction: cat, dog, sheep, cow, horse and giraffe outer ears now extend beyond the head silhouette, with contrasting inner-ear detail; giraffe ossicones remain separate horns. Geometry tests require ears to exist outside the head rather than merely being present in source.
- Gait-axis correction: ground-leg transforms use the YXZ Euler order so the animal heading is applied before the local hip swing. This keeps the swing axis attached to the animal's body coordinate frame instead of the global X axis. Browser diagnostics assert the live rotation order.


- Live UI event-listener audit: removed duplicate world-name apply, backup-download and backup-restore registrations. Browser tests now count registrations for these controls and assert that a single backup click produces exactly one download.


- Corrected local gait-axis assignment: the previous helper had mistakenly assigned animal heading to Euler X and stride to Euler Y. The live transform now assigns stride to Euler X and heading to Euler Y under YXZ order. A vertical leg consequently swings forward/back along local Z instead of sweeping inward/outward along local X. Unit tests now assert the specific Euler components and the expected local foot displacement; live browser diagnostics expose both components for verification.
