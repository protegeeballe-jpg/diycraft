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

### Stage 0 — Read-only data boundary (this branch)
- Establish a pure adapter that maps validated saved-world fields to renderer snapshots.
- Cover blocks, custom colors/textures, doors, 20 tile patterns, player appearance/pose, excavations, layered water, fish and animals.
- Keep the source object unchanged and make the resulting snapshot immutable.
- Run unit tests for malformed data, legacy water saves, limits and exact color preservation.

### Stage 1 — Render the real starter world
- Feed the adapter output into a Three.js scene in a separate preview route.
- Render block coordinates and types using reusable painterly materials.
- Render the player spawn, starter buildings, plants, pond columns and animals from the actual world data.
- Compare scene counts and positions to the source snapshot. No game input or save writes.

### Stage 2 — Editing parity in a sandbox
- Add raycast selection, block placement/removal, door operation and tile placement against a cloned/in-memory test world.
- Reuse the current UI and color-picker values where practical.
- Test edits against the Canvas 2D engine using the same action fixtures.
- Do not write the sandbox world to production storage.

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
