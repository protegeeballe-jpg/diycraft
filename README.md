# DIYCraft — Peaceful Painterly World

DIYCraft is a local-first creative building game. Explore a peaceful world, place and remove blocks, grow a garden, care for friendly animals, customize a character, and make artwork.

**Play:** https://protegeeballe-jpg.github.io/diycraft/

## What is in the game

- A Three.js r128 world with locally generated watercolor and colored-pencil surfaces.
- Daytime, sunset, nighttime and automatic time-of-day palettes.
- Building, digging, block recovery, custom materials, doors and decorative tile patterns.
- Flowers, plants, roaming animals, friendly neighbors and gentle care activities.
- Character Studio, Art Studio, shared neighbor coloring, inventory and crafting.
- Keyboard, touch and responsive portrait/landscape layouts.
- Local autosave, JSON backup and restore.

## License & Copyright

**Copyright © 2026 DIYCraft / Author. All rights reserved.**

This software, its source code, visual design, game mechanics, ideas, and all associated assets are the exclusive intellectual property of the author. 

Strict restrictions apply:
- **No Unauthorized Copying or Distribution:** You are not permitted to copy, duplicate, fork (for redistribution), or distribute this codebase or game build in any form.
- **No Commercial Use:** This project, or any derivative work based on its code, design, or assets, may not be used, hosted, or distributed to generate profit, monetization, or commercial revenue of any kind.
- **No AI / Model Training:** This repository, its source code, design documents, ideas, and textual/visual assets are **strictly prohibited** from being used as training data, fine-tuning datasets, reference weights, or structural models for any artificial intelligence, machine learning model, or automated code/content generation system.

---------------------

## Running locally

Serve the repository from a local web server; opening `index.html` directly as a `file://` URL will not provide service-worker behavior.

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000/ in a modern browser. Keep the page open while the offline setup message confirms that the service worker has prepared the local game files.

## Production entry points

- `index.html` is the main production game.
- `offline/index.html` is the matching alternate entry point. Both use the same local Three.js renderer and saved world.
- `three-world-live.js` connects the renderer, player, animals, world editing, HUD and rendering loop.
- `js/three-world-adapter.js` translates validated world data into renderer state.
- `js/three-world-storage.js` preserves the original version-1 save format and local storage key.
- `sw.js` caches the production pages and local runtime modules for offline use.

Canvas 2D remains in use for the Art Studio, shared coloring canvas and locally generated painterly textures. The world itself is rendered with WebGL.

## Saves and privacy

World data is stored locally in the browser under the original `diycraft_peaceful_voxel_v1` key. Use the in-game backup control to export a copy and keep it somewhere safe. Main and `/offline/` entry points share the same browser storage because they are same-origin.

The game does not use third-party game servers, remote scripts, analytics, ads, chat or multiplayer. The service worker makes same-origin requests to refresh the local pages and runtime scripts.

## Development and checks

The repository includes unit tests, browser integration tests, mobile touch tests, offline-cache checks and GitHub Actions workflows. Core checks can be run with Node.js:

```sh
node tests/three-world-storage.test.cjs
node tests/three-world-starter.test.cjs
node tests/three-world-edit-sandbox.test.cjs
node tests/three-viewport.test.cjs
node tests/three-sky-watercolor.test.cjs
node tests/three-animal-geometry.test.cjs
node tests/three-plant-geometry.test.cjs
```

The Playwright browser tests are `tests/three-live-browser.cjs` and `tests/three-mobile-e2e.cjs`; the GitHub Actions workflow installs the browser dependencies.

## Legacy and preview files

`diycraft.js` and `offline/classic-isometric.html` are retained as legacy/reference material; they are not loaded by the current production entry points. The `three-world-preview*`, `three-world-edit-preview*` and `three-painterly-preview*` files are development/visual-QA previews, not the live game.
