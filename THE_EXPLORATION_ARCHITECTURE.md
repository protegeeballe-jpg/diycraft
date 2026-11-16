# The Exploration — Repository-Aware Architecture and Implementation Plan

**Status:** Architecture baseline for the dedicated `the-exploration` work branch  
**Audit reference:** DIYCraft `main` at `48cfa5a9b9f00ba596ef7219041ab566e5f71a1c` (16 November 2026)  
**Scope:** Preserve DIYCraft `main`; evolve a separate game edition for Onnea.

## 1. Repository audit

The current production game is already a lightweight, modular Three.js browser game. It should be extended in its existing architecture rather than rewritten in React/Vite or replaced with a new engine.

### Production entry and renderer

- `index.html` is the production entry and uses a Three.js r128 renderer.
- `offline/index.html` mirrors the production page with adjusted relative asset paths. The CI workflow explicitly checks that the two pages stay identical apart from those paths.
- `three-world-live.js` is the current live renderer and game orchestration layer.
- The page loads 23 reviewed local scripts. Its Content Security Policy restricts scripts, connections and workers to the same origin.
- `js/three.js` is bundled locally; the game does not need a runtime CDN dependency.
- `js/three-compact-hud.js` handles the compact existing controls.
- `js/three-player-physics.js`, `js/three-player-camera.js` and `js/three-player-model.js` separate movement, camera and avatar concerns.
- `js/three-world-edit-sandbox.js` owns world editing operations. `js/three-world-adapter.js` converts validated saved data into an immutable renderer snapshot.
- Existing world modules include terrain-window generation, watercolor materials, doors, plants, animals, raycasting, world-time presentation and neighbor/NPC protection and routing.

### Important distinction: legacy and live code

`diycraft.js` is the older Canvas-era game implementation. The production Three.js `index.html` does not load it. However, compatibility tests still use its version-1 world validator and starter-world helpers.

**Do not casually refactor or replace `diycraft.js` as part of The Exploration.** The first implementation should leave it untouched and preserve the existing version-1 compatibility tests.

### Existing save and backup behavior

- The current browser recovery save uses the key `diycraft_peaceful_voxel_v1`.
- `js/three-world-storage.js` validates the saved world, compresses it with `CompressionStream` where available, and falls back to JSON if compression is unavailable or ineffective.
- The storage module has 24 MB compressed and 32 MB expanded safety limits. These are application guards, **not guarantees that a browser will grant that much localStorage quota**.
- `js/three-world-file-save.js` supports portable `.diycraft` files. IndexedDB stores a remembered file handle; the world itself is written to the selected file.
- The save queue uses generation checks so an older asynchronous compression operation cannot overwrite a newer snapshot. Page-hide/visibility handlers flush the current state.

The Exploration must use a different save namespace and a versioned save format. It must never overwrite DIYCraft's existing localStorage key or reuse the `.diycraft` file signature for a different schema.

### Existing world and interaction constraints

- The validated world adapter currently accepts up to 18,000 blocks, 12,000 ground cells, 100 animals, 20 artworks and 550,000 characters of artwork data.
- Existing materials and crafted inventory are represented as 60-slot arrays. The Material Bucket is separate.
- Existing animal species include sheep, cat, dog, cow, horse, bird and giraffe.
- Existing touch movement uses directional controls, plus a Jump action. Keyboard movement is also supported.
- Player physics uses fixed-step updates. The performance profile selects low, balanced and high tiers with frame caps of 30, 45 and 60 FPS respectively.
- The current game is intentionally peaceful. Its animal-care UI explicitly says animals cannot be hurt, attacked or removed. This conflicts with the requested kill-and-meat-drop mechanic and needs an explicit product decision before that mechanic is implemented.

### CI and offline requirements

The repository has Node-based module tests, Playwright/browser smoke tests and GitHub Actions validation. The validation workflow checks local script references, security policy, production/offline entry parity, save protections, starter-world parity, movement, geometry and other engine behavior.

Every new runtime module must be:
1. Referenced by the production entry.
2. Referenced by the offline entry with the correct relative path.
3. Added to the service-worker precache list.
4. Covered by workflow path filters and appropriate tests.
5. Syntax-checked and tested before the next gameplay stage begins.

The service-worker cache name must be incremented when the shipped offline shell or module set changes.

## 2. Architecture decisions for The Exploration

### Keep the proven engine

Continue with plain JavaScript modules and the current Three.js renderer. Follow the existing module style: a small, isolated API exposed on `globalThis` in the browser and through `module.exports` for Node tests. Keep gameplay logic free of DOM and renderer dependencies wherever possible.

Do not add a framework migration, online asset CDN, remote authentication requirement or large runtime dependency to the MVP.

### Deterministic authored world

Build a finite, seeded world with authored landmarks:

- Forest, meadow, hills, lake basins and mountain regions.
- A populated village with homes, farms, paths and shops.
- One distinctive central grand library.
- Fixed story and mystery locations.

Use deterministic terrain functions and authored structure templates. Generate terrain in chunks near the player and cache only the required nearby render window. A given seed and world version must always produce the same base terrain and landmarks.

**Persist the seed and player edits, not every generated terrain cell.** Save sparse modifications (placed/removed blocks, changed terrain cells, opened story gates and player-built structures). This is the main storage and memory optimization.

The current terrain mesh is based on a rolling ground window and excavation depth. Hills, mountains and lake basins will require a height-field-aware terrain surface and corresponding collision/surface-height functions; adding decorative hills on top of a flat collision plane is not sufficient.

### World content and learning

Keep stories, myths, legends, NPC dialogue, quest definitions and educational cards in versioned, bundled content packs. These are static application content and should not be copied into every player save.

The library becomes the central knowledge hub:
- Story and folklore shelves.
- A natural-science and engineering collection.
- A map and exploration desk.
- A mystery/evidence room.
- A private discoveries and journal corner.

Label myths and legends as stories, traditions or fictional world lore. Mystery quests should distinguish observation, evidence, inference, source reliability and uncertainty. The game should reward careful reasoning, not guessing what the author wants.

Real-world quests should be optional, location-independent and safe. A child can complete a challenge through observation, drawing or a written reflection; photographs and GPS must not be required. Provide an indoor alternative and clear safety boundaries.

### Gameplay state and save envelope

Use a dedicated versioned The Exploration save bundle, separate from the DIYCraft v1 save:

```js
{
  schema: "the-exploration",
  schemaVersion: 1,
  world: {
    seed: 0,
    generatorVersion: 1,
    edits: [],
    player: { x: 0, y: 0, z: 0, yaw: 0 }
  },
  player: {
    vitality: 10,
    quickbar: [],
    backpack: {},
    campfire: { slots: [null, null, null, null] }
  },
  progress: {
    completedQuestIds: [],
    discoveredLoreIds: [],
    mysteryEvidence: {}
  },
  journal: {
    pages: {}
  }
}
```

This is a conceptual contract; exact key names and validation limits are to be finalized in the first implementation task.

Primary saves should live in IndexedDB, not in a large localStorage string. Keep localStorage for small preferences and a controlled one-time migration/import path only. Keep an explicit portable backup/export path. Store static content packs in the application cache and avoid duplicating them in the save.

The save adapter must validate all incoming data, enforce size and count limits, reject unknown item IDs, and write atomically. A corrupt or unsupported save must be preserved for recovery and must never be silently replaced with a blank starter world.

### Coupled health and hunger display

Onnea's stated rule can be represented by one integer, `vitality`, from 0 to 10:

- Render 10 hearts and 10 bread icons.
- The first `vitality` icons in both groups are colored; the remaining icons are gray.
- Damage reduces vitality by the requested integer amount, clamped at zero.
- Consuming one valid food item restores one paired heart/bread point, clamped at ten.
- Inventory removal and vitality restoration must be one atomic gameplay mutation. A failed inventory consume must not restore vitality.

This one-counter design means health and hunger are intentionally coupled, not independently simulated. If independent hunger depletion is later desired, introduce two separate counters and revise the design rather than hiding two values behind one integer.

At zero vitality, use a gentle recovery/respawn flow with no permanent save deletion or punitive loss of the child's journal and creations.

### Campfire cooking

Treat the campfire as a reusable placeable item. Its four corner slots accept one valid raw food item each. Cooking starts only when the required four-slot batch is valid. Use a slow gameplay tick (for example, once per second of active play), not per-frame DOM or renderer work.

Persist slot contents and remaining cook progress. Pause cooking when the app is backgrounded; do not create offline catch-up pressure or reward leaving a phone running. Completion must convert each input exactly once into its cooked output. Test duplicate taps, reload during cooking, full inventory and interrupted saves.

### Journal

Provide pages numbered 1–252, but persist only non-empty pages. Enforce the 252-page bound in the data layer as well as the UI. Empty/whitespace-only pages should be removed from the sparse save. Keep page text under a conservative per-page character cap; photographs and large attachments should not be embedded as base64 journal text.

Journal entries can reference discoveries, lore IDs and quest IDs without copying the whole content pack into the save.

### Quickbar and touch controls

Add a 10-slot quickbar as a view over validated inventory state. The backpack opens the larger inventory and reusable block storage. The journal has its own button and modal.

A small virtual joystick can replace or augment the current directional pad, while retaining keyboard controls and the existing Jump behavior. Do not change touch input and HUD layout in one broad rewrite: add the new controls behind focused tests and verify portrait, landscape, notched screens and small viewports.

### Animal-food design decision — release blocker for that feature only

The current project explicitly protects animals from harm. The requested cow → beef, sheep → mutton and pig → pork drops introduce a different ethical and gameplay rule.

Before coding this subsystem, choose one:
1. Preserve the peaceful animal-care principle and source food through crops, gathering, trade or non-harmful animal products.
2. Make The Exploration a distinct survival mode with non-graphic animal harvesting, carefully considered age-appropriate framing and a clear respawn/farm rule.

Do not quietly remove the existing no-harm protection or introduce attack controls as a side effect of adding food and cooking.

## 3. Proposed implementation stages

### Stage 0 — Isolated working baseline
- Work only on the `the-exploration` branch.
- Keep `main` and the live DIYCraft deployment unchanged.
- Record the base commit and run existing validation before gameplay changes.
- Confirm the intended final hosting/repository model before public release.

### Stage 1 — Exploration foundation
- Add a new save bundle schema and IndexedDB storage adapter.
- Add deterministic world-seed and content-pack contracts.
- Add pure testable modules for inventory, vitality and journal validation.
- Keep the current renderer and DIYCraft compatibility adapters intact.
- Add migration tests for new saves and import tests for a selected legacy DIYCraft world, if import is desired.

### Stage 2 — Terrain and authored world
- Implement deterministic biome and height-field generation.
- Add chunk-based terrain rendering, collision and surface-height support.
- Place the village, central library, lake, mountain routes and authored landmarks using static templates.
- Add NPC definitions and safe route/navigation data.
- Benchmark chunk generation, draw calls, memory and input responsiveness on the low profile.

### Stage 3 — Survival HUD and inventory
- Add the paired heart/bread HUD and pure vitality rules.
- Add 10 quickbar slots, backpack storage and validated item definitions.
- Add damage sources only after agreeing what should cause damage in this child-friendly world.
- Add a gentle zero-vitality recovery state.

### Stage 4 — Campfire and food
- Add the reusable campfire item, four-slot cooking state machine and cooked-food recipes.
- Implement the approved animal/food sourcing rule.
- Test atomic inventory mutation, cooking persistence and no-duplication behavior.

### Stage 5 — Journal, myths and mysteries
- Add the 252-page sparse journal.
- Add bundled myths/legends and structured mystery chapters.
- Add evidence collection, source evaluation and educational content triggers.
- Keep private reflections local and out of analytics.

### Stage 6 — Offline Bridge and mindful pacing
- Add optional real-world challenges with indoor alternatives.
- Add voluntary check-ins and natural stop/return prompts.
- Do not implement device-wide app surveillance in the PWA. Any future native usage integration must be platform-specific, opt-in and separately reviewed.

### Stage 7 — Hardening and release
- Test offline first launch, repeat launch, storage denial, quota exhaustion, corrupt saves, export/import and interrupted writes.
- Test 320–390 px mobile widths, portrait/landscape, touch controls and keyboard fallback.
- Test seeded world determinism, collision on slopes, lake boundaries, NPC navigation and build placement.
- Verify both production and offline entries, service-worker cache version and all local module paths.
- Publish only after the separate app identity, copyright/license text and hosting configuration are intentionally approved.

## 4. Required regression and acceptance tests

1. The original DIYCraft `main` branch and its deployed site remain unchanged.
2. The Exploration can cold-start and play its core loop with the network disabled after the app shell is installed.
3. The same seed and generator version produce identical terrain and authored landmark positions.
4. Player edits survive reload without serializing the entire generated world.
5. Legacy DIYCraft saves are never overwritten by The Exploration.
6. Vitality changes clamp to 0–10; eating cannot consume nonexistent food or double-apply recovery.
7. The four cooking slots cannot duplicate, lose or cook the same input twice.
8. Journal page navigation and save validation cannot exceed 252; blank pages are omitted.
9. No per-frame DOM redraw is added for HUD counters or modals.
10. Offline and production pages load the same reviewed module set and the service worker caches every required local module.
11. Corrupt data is preserved for recovery; storage write failures are visible and do not claim success.
12. Low-tier renderer tests cover a realistic populated world and preserve responsive movement.

## 5. Scope boundary for the first playable build

The first playable The Exploration build should contain:
- A deterministic small world with a meadow, forest, hills, a lake, one village and the grand library.
- Existing DIYCraft building and peaceful NPC/animal behavior.
- A 10-slot quickbar, backpack, vitality HUD and sparse journal.
- One complete myth/legend and one complete evidence-based mystery.
- One campfire cooking flow using the food-source design selected above.
- At least one optional physical-world quest with an indoor alternative.

Do not start with infinite procedural terrain, online multiplayer, AR, unrestricted social sharing or cross-device identity. Those features can follow after the offline single-device game is stable and measured.

---

**Implementation rule:** Each stage gets its own focused change set and regression checks. Do not combine terrain generation, save-schema changes, HUD redesign and survival mechanics into one large patch.
