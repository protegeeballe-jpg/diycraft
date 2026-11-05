# DIYCraft — Peaceful Voxel World

A self-contained, peaceful voxel-style creative building game. This is an original independent project and is not Minecraft or affiliated with Mojang or Microsoft.

## Build and explore
- Tap the exact point in the world where you want to place a block.
- Drag the world to look around; use the movement pad to walk.
- Use the **JUMP** button or Spacebar to hop onto block steps. Turn flight off to jump.
- Switch between first-person and third-person views.
- Enable creative flight and use UP/DOWN controls to rise and descend.
- Choose building materials from the hotbar; each has an original, locally generated surface texture.
- Design working doors with three styles and tap them to open or close.
- Design decorative tiles with **20 original patterns** and any color from the full color spectrum. Each placed tile keeps its own appearance.
- Choose custom block colors and textures.
- Hide controllers for a larger world view or use Enlarge for browser full-screen where supported.
- Tap an open space to place the selected block. Tap the floor of an excavation to refill one level using one collected Dirt.
- Press and hold for 0.6 seconds on soil to dig one level, or on a block to remove it. The same hold gesture handles both actions.
- The ground and exposed excavation walls use locally generated grass and soil textures; standard blocks use their own material patterns.

## Neighbors and animals
- The player collides with solid blocks and slides along walls. Open doors are walkable; closed doors block the doorway, and thin tiles remain step-up friendly.
- Neighbors use local obstacle-aware paths around cottage walls and player-built blocks. At night (including the automatic night cycle), they go indoors and sleep; little Zzz signs appear above their homes.
- Mira, Theo, and the Santos family are kind, non-verbal neighbors with individual walking routes and homes.
- Tap a neighbor to open a quiet shared coloring activity.
- Tap an animal to open snack, water, brushing, and play activities. Animals cannot be attacked or removed.

## Three.js renderer and offline play

- The live game and its `/offline/` entry point use the same local Three.js/WebGL renderer. Canvas 2D is reserved for the Art Studio, shared coloring canvas, and locally generated surface textures.
- The first online visit caches the Three.js runtime and its local modules for offline startup. Keep the page open until the offline-ready note confirms setup.
- The first time, open DIYCraft while the device is online and wait for the **“Offline play is ready”** message.
- A same-origin service worker then caches the main game, the /offline/ page, and every local Three.js runtime module. Its versioned cache is refreshed when a new offline worker is installed.
- After the ready message, DIYCraft can be reopened from the same browser on that device without an internet connection.
- The game has no remote scripts, images, external game servers, analytics, ads, chat, or gameplay network requests. Only the service worker fetches the two game pages from the same site when refreshing its offline copies.
- Offline caching requires a modern browser with service-worker support and a secure HTTPS page. If browser/site data is cleared, connect again once to rebuild the cache.

## Saving
- The game autosaves locally when browser storage is available.
- Main and /offline/ pages share the same browser origin and local world save.
- Use **Backup world** to export a losslessly compressed `.diycraft.gz` backup when the browser supports it; otherwise it exports JSON. **Restore backup** accepts compressed backups and older JSON backups.
- Keep backups in a parent-controlled folder. Browser storage may be cleared by device settings or browser cleanup; export periodic backups.

Creative mode is intentionally generous, with a technical block limit to protect device performance.
