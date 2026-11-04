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
- Covers blocks, custom colors/textures, doors, 20 tile patterns, player appearance/pose, excavations, layered water, fish and animals.
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
- Automated browser checks assert that every source block is represented, the original world object remains unchanged, the WebGL render loop advances, and painterly materials and instanced groups are present.
- CI validation passed: https://github.com/protegeeballe-jpg/diycraft/actions/runs/41767639398
- Screenshot artifact: `diycraft-three-actual-starter-world` (retained for 7 days by CI).

### Stage 2 — Editing parity in a sandbox
**Status: In progress — isolated data actions and selection resolver complete; browser interaction not yet connected**
- `js/three-world-edit-sandbox.js` clones the immutable renderer snapshot into private in-memory state and exposes selection, validated block placement/removal, door toggling and tile-pattern changes.
- Each operation returns a detached, deeply frozen state snapshot. The original renderer snapshot is checked for unchanged content; no storage APIs or production-world references are used.
- `js/three-world-raycast.js` resolves Three.js intersections to stable block keys for both instanced blocks and ordinary meshes/groups.
- Regression tests cover valid/invalid placement, occupied cells, removal/reuse, exact custom colors, door orientation/style/swing, tile patterns, immutable state and nearest-hit selection.
- CI runs the adapter, editing-sandbox and raycast tests independently.
- `three-world-edit-preview.html` and `three-world-edit-preview.js` provide a separate interactive browser sandbox with real 3D raycast selection, adjacent block placement, removal, door open/close, and tile-pattern changes. It loads the CI-generated production starter-world fixture and uses the painterly material library.
- Browser regression coverage in `tests/three-world-edit-preview.cjs` verifies real projected selection, add/remove, door operation, tile-pattern changes, unchanged source data, and zero browser-storage keys.
- `tests/three-world-canvas-parity.test.cjs` extracts the actual production Canvas 2D `addBlock()` function and compares its resulting block records with the Three.js sandbox for custom blocks, tiles, doors, styled solids and flowers.
- Cross-engine checks also cover two-cell door occupancy, excavation depth, the world-height ceiling and duplicate-cell rejection. The migration guard runs these alongside the adapter, sandbox and raycast suites.
- Remaining before Stage 2 completion: verify face-adjacent placement from raycast face normals, removal/inventory behavior, and special-block interactions. Do not connect production controls or storage.

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
