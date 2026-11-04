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
**Status: In progress — block editing, doors, all tile patterns, animals, water/fish, Material Bucket reuse, ground digging/refilling, collision, and low-end mobile behavior have isolated regression coverage; production remains untouched**
- `js/three-world-edit-sandbox.js` clones the immutable renderer snapshot into private in-memory state and exposes selection, validated block placement/removal, door toggling, tile-pattern changes, stacked water-layer addition/collection and fish placement. Removal recovers the original block appearance into a bounded 120-item Material Bucket and refuses destructive edits when the bucket is full.
- Water edits follow the production rules: only excavated cells can be filled, each cell is capped at its recorded depth, collection recovers a water item into the Material Bucket, and collecting the final layer removes fish in that cell. A wet cell accepts up to three fish.
- Terrain editing now covers both directions. `excavateGround()` adds one layer per dig, creates the matching dirt Material Bucket item, increments a stackable dirt entry in the 60-slot materials pouch, and enforces the production 99-item stack, 120-item Bucket, 12,000 ground-cell and safe-depth limits. If the targeted cell contains water, digging collects a water layer instead. `fillExcavation()` prechecks the full cell range, fills all underground layers with the selected block, then clears the excavation, water and fish together without altering the Bucket. Both use normalized `{x,z,depth}` records inside the sandbox.
- The adapter preserves the validated materials and crafted pouches as bounded 60-slot arrays. It also distinguishes renderer-only default material values from user-configured solid styles, so default colors are rendered without being incorrectly written into placed block records.
- Material Bucket selection is now exposed in the sandbox. A recovered item can be selected and reused repeatedly; block color, texture, tile pattern, and door style/orientation/swing are restored from the bucket record. The item remains in the bucket, matching Canvas 2D. Water bucket entries route to water-layer placement rather than becoming voxel blocks.
- The edit preview renders each pool as a combined animated vertex mesh and fish as instanced meshes. The low-end profile draws at most 48 fish and updates water vertices at 15 FPS while the overall scene remains capped at 30 FPS; this limits animation cost without deleting any fish from sandbox data.
- Movement parity includes a port of the production player-capsule calculation: radius 0.23, body height 1.72, step allowance 0.18, tile slab thickness 0.13 / base offset 0.02, plant pass-through, and terrain-floor collision at excavation depth. Cell occupancy is tested separately: a closed door reserves both vertical cells for placement; the legacy Canvas 2D player collider itself retains its existing one-cell-high approximation and open/closed behavior. The migration does not silently change that existing movement rule.
- Each operation returns a detached, deeply frozen state snapshot. The original renderer snapshot is checked for unchanged content; no storage APIs or production-world references are used.
- Compatible solids and tiles are grouped by material and 16×16 world chunk into `InstancedMesh` batches. This allows the renderer to cull distant chunks as units instead of submitting one draw object per block. Animated plants remain individually addressable one-mesh objects; doors remain separate so their hinges can animate.
- `js/three-world-raycast.js` resolves Three.js intersections to stable block keys for both instanced blocks and ordinary meshes/groups. Browser placement uses the clicked face normal and rejects occupied cells.
- `js/three-door-motion.js` provides a pure smoothstep animation helper using the production 260 ms duration and 1.32-radian open angle. It supports continuous reversal while the door is moving; the browser preview animates the door leaf and its selection outline together.
- Regression tests cover valid/invalid placement, occupied cells, removal/reuse, exact custom colors, reusable Material Bucket items, Canvas 2D default bucket colors for every solid type, door orientation/style/swing, all 20 tile patterns, plant pass-through, player capsule radius/body/step-height rules, tile and excavation collision, two-cell door occupancy, ground digging and layer-by-layer filling, dirt materials/Bucket rewards and limits, water depth/stacking/collection, fish limits, bucket-full protection, immutable state and nearest-hit selection. A parity harness extracts the actual Canvas 2D placement, removal, ground-digging, hole-filling and player-collision functions and compares their results with the Three.js sandbox. The door helper has deterministic endpoint, midpoint and reversal tests.
- CI runs the adapter, editing-sandbox and raycast tests independently.
- `three-world-edit-preview.html` and `three-world-edit-preview.js` provide a separate interactive browser sandbox with real 3D raycast selection, face-normal block placement, removal, door open/close, and tile-pattern changes. Occupied face targets are rejected rather than silently shifted. It loads the CI-generated production starter-world fixture and uses the painterly material library.
- Browser regression coverage in `tests/three-world-edit-preview.cjs` verifies projected selection, face-normal placement, add/remove, Material Bucket recovery/reuse, door style textures/hinges/animation, all 20 tile patterns, water filling/stacking/collection, fish placement/limits and live animation, hole refilling, and repeated digging with both inventory rewards. It runs on a touch-enabled 390×844 phone viewport at 3× device scale factor with the low-end profile; it also checks unchanged source data and zero browser-storage keys.
- `tests/three-world-canvas-parity.test.cjs` extracts the actual production Canvas 2D `addBlock()` function and compares its resulting block records with the Three.js sandbox for custom blocks, tiles, doors, styled solids and flowers.
- Cross-engine checks also cover two-cell door occupancy, excavation depth, the world-height ceiling and duplicate-cell rejection. The migration guard now runs the door-motion timing tests alongside the adapter, sandbox, raycast and Canvas 2D/Three.js parity suites.
- Latest verification: migration guard passed at commit `199589e4295450174c33b65e6ce67abea0266f66`, including direct Canvas 2D ground-digging, fill, placement/removal, Material Bucket and player-collision comparisons. Touch-enabled digging/refilling browser checks are in run `41784350659`; the 2,032-block + 18-animal low-end stress run passed in `41782673083`. Water/fish and door-style mobile browser coverage also passed in their preceding runs.
- Remaining before Stage 2 completion: port dynamic protected-zone checks around neighbors and animals alongside NPC/world movement, verify more detailed terrain/door interactions in browser movement scenarios, and continue representative low-cost Android device testing. The current isolated ground-dig helper does not yet enforce those dynamic protection zones. Do not connect production controls or storage.

### Stage 3 — Player, physics and animation
- Port camera modes, movement, collision, flying, jumping, swimming, water-level behavior, plant sway, water motion, animals and NPC navigation in isolated increments.
- Define deterministic tests for movement bounds, collision, depth/occlusion and animation timing.
- Ensure behavior remains accessible on touch devices and low-end hardware.

### Stage 4 — UI, inventory and persistence parity
- Reuse or adapt the existing UI; preserve all 20 tile designs, all color pickers, bucket, crafting, animal care, art gallery, world time, backup and restore.
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
