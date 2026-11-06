'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const liveRuntimeSource=fs.readFileSync('three-world-live.js','utf8');
for(const id of ['world-name-apply','backup-download','backup-restore','neighborhood-toggle','erase-toggle']){
 const count=(liveRuntimeSource.match(new RegExp("getElementById\\('"+id+"'\\)\\.addEventListener\\(",'g'))||[]).length;
 assert.equal(count,1,'Production control #'+id+' must register exactly one event handler.');
}

const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');

(async()=>{
 const server=spawn('python3',['-m','http.server','4173','--bind','127.0.0.1'],{stdio:'ignore'});
 const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1,serviceWorkers:'allow',acceptDownloads:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.stack||error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'networkidle',timeout:60000});
  try{await page.waitForFunction(()=>window.__DIYCRAFT_THREE_EDIT__?.frames>=5,null,{timeout:45000});}
  catch(error){throw new Error(error.message+'\\nBrowser errors: '+errors.join('\\n'));}
  await page.waitForFunction(()=>!!localStorage.getItem('diycraft_peaceful_voxel_v1'),null,{timeout:20000});
  const initial=await page.evaluate(async()=>{
   const stored=localStorage.getItem('diycraft_peaceful_voxel_v1');
   const raw=await window.DIYCraftThreeWorldStorage.decode(stored);
   const world=JSON.parse(raw),diagnostics=window.__DIYCRAFT_THREE_EDIT__;
   return {
    revision:window.THREE?.REVISION,world,storageSource:diagnostics?.storageSource,
    storageReadFailed:diagnostics?.storageReadFailed,
    canvas:{width:document.getElementById('three-world')?.width,height:document.getElementById('three-world')?.height},
    hasCanvas2DWorld:!!document.getElementById('game'),
    hasSafetyOverlay:!!document.getElementById('safety'),
    hasWebGL:!!(document.getElementById('three-world')?.getContext('webgl2')||document.getElementById('three-world')?.getContext('webgl')),
    saveControls:!!document.getElementById('save-now'),
    neighborhoodControl:!!document.getElementById('neighborhood-toggle'),
    eraseControl:!!document.getElementById('erase-toggle'),
    neighborhoodStats:diagnostics?.getNeighborhoodStats?.(),
    terrainStats:diagnostics?.getTerrainStats?.(),
    runtimeScripts:[...document.scripts].map(script=>script.getAttribute('src')).filter(Boolean)
   };
  });
  assert.equal(initial.revision,'128','The live world must use the pinned local Three.js r128 build.');
  assert.equal(initial.storageSource,'starter','A clean profile must load the canonical starter-world source.');
  assert.equal(initial.storageReadFailed,false);
  assert.equal(initial.neighborhoodControl,true,'The production HUD must expose the Visit neighborhood control.');
  assert.equal(initial.eraseControl,true,'The production HUD must expose a direct erase mode.');
  assert.equal(initial.neighborhoodStats?.houseCount,3,'All three neighborhood houses must be present in the live 3D scene.');
  const neighborGround=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getNeighborStats?.());
  assert.equal(neighborGround?.total,7,'All seven roaming neighbors must remain represented.');
  assert.ok(neighborGround.actors.every(actor=>Number.isFinite(actor.supportY)&&actor.position&&
   Math.abs(actor.position.y-(actor.supportY+actor.footOffset))<1e-6),
   'Every neighbor root must use the sampled terrain height plus its measured shoe support offset.');
  const animalGround=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getAnimalStats?.());
  assert.ok(animalGround?.all?.length>=7&&animalGround.all.every(animal=>Number.isFinite(animal.groundY)),
   'Every resident and saved ground animal must receive a finite terrain support height.');
  assert.ok(initial.neighborhoodStats.houses.every(house=>house.visible&&house.meshCount>=10),'Each neighborhood house must contain visible 3D geometry.');
  assert.equal(initial.terrainStats?.hasGrassTexture,true,'The ground must use a visible painterly grass texture.');
  assert.equal(initial.hasSafetyOverlay,false,'The floating upper-right HUD must be absent from the production viewport.');
  const skySamples=[];
  for(const mode of ['day','sunset','night']){
   const sky=await page.evaluate(mode=>{
    const select=document.getElementById('time-mode');select.value=mode;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    return window.__DIYCRAFT_THREE_EDIT__?.getVisualTimeStats?.();
   },mode);
   assert.equal(sky?.mode,mode,'The '+mode+' world mode must activate its own watercolor sky.');
   assert.equal(sky?.skyTexture?.hasMap,true,'The '+mode+' sky must be painted onto the actual sky-dome material.');
   assert.ok(sky.skyTexture.width>=384&&sky.skyTexture.height>=192,'The '+mode+' sky texture must have enough detail for the world dome.');
   assert.ok(sky.skyTexture.signature>0,'The '+mode+' watercolor sky must contain canvas pigment.');
   assert.equal(sky.starsVisible,mode==='night','Stars must remain visible only at night.');
   skySamples.push(sky.skyTexture.signature);
  }
  assert.equal(new Set(skySamples).size,3,'Day, sunset and night must each paint a distinct sky.');
  const distantGroundPoint=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.focusGroundCellForTest?.(100000,-100000));
  assert.ok(distantGroundPoint?.visible,'The ground test cell must remain visible far from the original world origin.');
  await page.waitForFunction(()=>{
   const stats=window.__DIYCRAFT_THREE_EDIT__?.getWorldBackdropStats?.();
   return stats&&Math.abs(stats.floor.x-stats.camera.x)<=.5&&Math.abs(stats.floor.z-stats.camera.z)<=.5&&
    Math.abs(stats.sky.x-stats.camera.x)<1e-6&&Math.abs(stats.sky.y-stats.camera.y)<1e-6&&Math.abs(stats.sky.z-stats.camera.z)<1e-6;
  },null,{timeout:5000});
  const distantBackdrop=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getWorldBackdropStats?.());
  // A real long-press must cut an opening through the textured ground and expose dirt walls.
  const groundPoint=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getGroundScreenPointForTest?.(100000,-100000));
  assert.ok(groundPoint?.visible,'The distant ground test cell must be visible and targetable.');
  const groundCanvas=page.locator('#three-world'),groundBounds=await groundCanvas.boundingBox();
  await groundCanvas.click({position:{x:groundPoint.x-groundBounds.x,y:groundPoint.y-groundBounds.y},delay:750});
  await page.waitForFunction(()=>window.__DIYCRAFT_THREE_EDIT__?.getTerrainStats?.().visibleHoleCells===1,null,{timeout:8000});
  const dugTerrain=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getTerrainStats?.());
  assert.equal(dugTerrain.excavatedCells,1,'The successful dig must be stored in the world.'); 
  assert.equal(dugTerrain.visibleHoleCells,1,'The 3D grass surface must omit the excavated cell.'); 
  assert.ok(dugTerrain.dirtFaces>=5,'The hole must render a dirt bottom and exposed side walls.');
  assert.ok(dugTerrain.hasGrassTexture&&dugTerrain.grassTextureSize>=64,'The ground must retain its painterly grass texture after digging.');

  // A separate eraser mode lets a young builder tap a placed block instead of relying on a long press.
  const placedForErase=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.debugPlaceObstacleForTest?.({type:'stone',x:100000,y:0,z:-100000}));
  assert.ok(placedForErase?.key,'The test block must be placed in the live sandbox.');
  const erasePoint=await page.evaluate(key=>window.__DIYCRAFT_THREE_EDIT__?.getBlockScreenPointForTest?.(key),placedForErase.key);
  assert.ok(erasePoint?.visible,'The test block must be visible for eraser interaction.');
  const eraseBounds=await groundCanvas.boundingBox();
  await page.locator('#erase-toggle').click();
  assert.equal(await page.locator('#erase-toggle').getAttribute('aria-pressed'),'true');
  await groundCanvas.click({position:{x:erasePoint.x-eraseBounds.x,y:erasePoint.y-eraseBounds.y}});
  await page.waitForFunction(key=>!window.__DIYCRAFT_THREE_EDIT__?.getState?.().world.blocks.some(block=>block.key===key),placedForErase.key,{timeout:8000});
  assert.equal(await page.locator('#erase-toggle').getAttribute('aria-pressed'),'true','The eraser remains active for multiple mistakes.');
  await page.locator('#erase-toggle').click();


  assert.equal(distantBackdrop.floor.width,90,'The continuous ground keeps its existing bounded 90-unit mesh.');
  assert.ok(Math.abs(distantBackdrop.floor.x-distantBackdrop.camera.x)<=.5&&
   Math.abs(distantBackdrop.floor.z-distantBackdrop.camera.z)<=.5,
   'The ground plane must follow the camera at distant world coordinates instead of ending at the origin.');
  assert.ok(Math.abs(distantBackdrop.sky.x-distantBackdrop.camera.x)<1e-6&&
   Math.abs(distantBackdrop.sky.z-distantBackdrop.camera.z)<1e-6,
   'The sky dome must remain centered on the camera while exploring distant world coordinates.');

  await page.evaluate(()=>{const select=document.getElementById('time-mode');select.value='day';select.dispatchEvent(new Event('change',{bubbles:true}));});
  const plantStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getPlantStats?.());
  assert.ok(plantStats?.flowerCount>0,'The production starter world must render actual flower meshes.');
  for(const flower of plantStats.flowers.filter(item=>item.type==='flower')){
   assert.equal(flower.flowerVolume,true,'Every production flower must use closed volume geometry.');
   assert.equal(flower.petalCount,8);
   assert.equal(flower.petalCrossSectionSegments,8);
   assert.equal(flower.petalLongitudinalRings,7);
   assert.ok(flower.petalThickness>=.03);
   assert.ok(flower.petalRise>=.20,'Live flower petals must climb upward around the flower heart.');
   assert.ok(flower.petalCupDepth>.14&&flower.petalCupDepth<.25,
    'Live blossom must have a visibly cupped side profile, not a flat disk.');
   assert.equal(flower.petalProfiles.length,8);
   assert.ok(flower.petalProfiles.every(profile=>profile.tipY>flower.flowerCenterY+.14),
    'Every petal rim must stand above the recessed flower center.');
   assert.equal(flower.stalkVolume,true);
   assert.equal(flower.basalLeavesVolume,true);
   assert.ok(flower.leafThickness>.015);
   assert.ok(flower.indexCount>flower.vertexCount*2,'The live flower must include indexed three-dimensional surfaces.');
  }
  assert.equal(initial.world.version,1);
  assert.ok(Array.isArray(initial.world.blocks)&&initial.world.blocks.length>0);
  assert.equal(initial.hasCanvas2DWorld,false,'The Canvas 2D world canvas must no longer be the game renderer.');
  assert.equal(initial.hasWebGL,true,'The live page must have a WebGL context.');
  assert.equal(initial.saveControls,true);
  assert.ok(initial.canvas.width>200&&initial.canvas.height>200);
  assert.ok(initial.runtimeScripts.includes('./three-world-live.js'));
  assert.ok(!initial.runtimeScripts.some(source=>source.includes('diycraft.js')||source.includes('three-world-edit-preview.js')));
  assert.equal(initial.storageReadFailed,false);
  const birdVisualBefore=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getAnimalStats?.());
  assert.ok(birdVisualBefore?.birdWingBatches>=1,'The live scene must build a separate pair of pivoted bird wing batches.');
  assert.ok(birdVisualBefore?.birdWingInstances>=1,'The live bird wings must have per-bird instance transforms.');
  assert.ok(birdVisualBefore.birdFlightY>.45,'Chirpy should be rendered airborne above the ground.');
  assert.ok(birdVisualBefore.birdWingPivotY>=1,'Bird wing pivots must sit at shoulder height above the torso rather than inside it.');
  assert.ok(birdVisualBefore.quadrupedLegBatches>=1,'Ground animals must use separate pivoted leg batches.');
  assert.ok(birdVisualBefore.quadrupedLegInstances>=4,'Each ground animal must have four leg instances.');
  await page.waitForFunction(({bird,legs})=>{
   const current=window.__DIYCRAFT_THREE_EDIT__?.getAnimalStats?.();
   return current&&Math.abs(current.birdFlapAngle-bird)>.03&&
    Math.abs(current.groundLegSwingAngle-legs)>.01;
  },{bird:birdVisualBefore.birdFlapAngle,legs:birdVisualBefore.groundLegSwingAngle},{timeout:3000});
  const birdVisualAfter=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getAnimalStats?.());
  assert.ok(Math.abs(birdVisualAfter.birdFlapAngle-birdVisualBefore.birdFlapAngle)>.03,'Bird wings must flap over time rather than remain a static wobbling body.');
  assert.ok(Math.abs(birdVisualAfter.groundLegSwingAngle-birdVisualBefore.groundLegSwingAngle)>.01,'Ground-animal legs must swing over time instead of remaining rigid pegs.');
  assert.equal(birdVisualAfter.groundLegRotationOrder,'YXZ','Ground-animal gait must apply stride around the local side-to-side hip axis after heading.');
  assert.ok(Math.abs(birdVisualAfter.groundLegRotationX-birdVisualAfter.groundLegSwingAngle)<1e-9,
   'The live leg transform must place the gait swing angle on Euler X.');
  assert.ok(Number.isFinite(birdVisualAfter.groundLegRotationY),
   'The live leg transform must retain the animal heading on Euler Y.');

  const openSettingsPanel=async()=>{
   if(!(await page.locator('#settings-panel').isVisible()))await page.locator('#settings-toggle').click();
   const files=page.locator('details.settings-section').filter({hasText:'World file & backup'});
   if(!(await files.evaluate(element=>element.open)))await files.locator('summary').click();
  };
  const togglePlayModeFromSettings=async()=>{
   await page.locator('#view-toggle').click();
   const inPlay=(await page.locator('#play-mode').textContent()).trim()==='Exit Play Mode';
   await page.locator('[data-view-mode="'+(inPlay?'build':'third')+'"]').click();
  };

  // Exercise a real build action and wait for the version-1 device save.
  await page.locator('[data-hud-tool="green"]').click();
  await page.getByRole('button',{name:'Grass',exact:true}).click();
  await page.locator('#quick-picker-content .hud-picker-primary').click();
  const beforePausedBuild=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getState?.().world.blocks.length);
  await page.locator('[data-hud-tool="pause-build"]').click();
  assert.equal(await page.locator('[data-hud-tool="pause-build"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.buildPaused),true);
  for(const id of ['add','water-add','fish-add','fill-hole']){
   await page.locator('#'+id).evaluate(button=>button.click());
  }
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getState?.().world.blocks.length),beforePausedBuild,
   'The hand must block canvas taps and every hidden legacy block, water and creature placement route.');
  assert.match(await page.locator('#status').textContent(),/Building is paused/);
  await page.locator('[data-hud-tool="pause-build"]').click();
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.buildPaused),false);
  await page.locator('#add').evaluate(button=>button.click());
  const immediateBuild=await page.evaluate(()=>({
   selectedMaterial:document.getElementById('block-type')?.value,
   addDisabled:document.getElementById('add')?.disabled,
   liveBlocks:window.__DIYCRAFT_THREE_EDIT__?.getState?.().world.blocks.length,
   revision:window.__DIYCRAFT_THREE_EDIT__?.getState?.().revision,
   status:document.getElementById('status')?.textContent,
   feedback:document.getElementById('backup-feedback')?.textContent,
   stored:!!localStorage.getItem('diycraft_peaceful_voxel_v1'),
   persistence:window.__DIYCRAFT_THREE_EDIT__?.getPersistenceStats?.()
  }));
  console.log('live build action diagnostic: '+JSON.stringify(immediateBuild));
  const expectedBlocks=initial.world.blocks.length+1;
  const targetGeneration=immediateBuild.persistence?.saveGeneration;
  assert.ok(Number.isInteger(targetGeneration)&&targetGeneration>0,'A new autosave generation must be queued after building.');
  await page.waitForFunction(async({generation,expected})=>{
   const diagnostics=window.__DIYCRAFT_THREE_EDIT__?.getPersistenceStats?.();
   if(!diagnostics||diagnostics.savedGeneration<generation||diagnostics.hasPendingSave||diagnostics.saveInFlight||diagnostics.saveTimerActive)return false;
   const stored=localStorage.getItem('diycraft_peaceful_voxel_v1');if(!stored)return false;
   const world=JSON.parse(await window.DIYCraftThreeWorldStorage.decode(stored));
   return world.blocks.length>=expected;
  },{generation:targetGeneration,expected:expectedBlocks},{timeout:20000});
  const afterBuild=await page.evaluate(async()=>({
   world:JSON.parse(await window.DIYCraftThreeWorldStorage.decode(localStorage.getItem('diycraft_peaceful_voxel_v1'))),
   persistence:window.__DIYCRAFT_THREE_EDIT__?.getPersistenceStats?.(),
   feedback:document.getElementById('backup-feedback')?.textContent
  }));
  console.log('build persistence comparison: '+JSON.stringify({
   initialBlocks:initial.world.blocks.length,expectedBlocks,
   immediateLiveBlocks:immediateBuild.liveBlocks,savedBlocks:afterBuild.world.blocks.length,
   immediatePersistence:immediateBuild.persistence,finalPersistence:afterBuild.persistence,feedback:afterBuild.feedback
  }));
  assert.ok(afterBuild.world.blocks.length>=expectedBlocks,'A build action must persist the changed blocks. Expected '+expectedBlocks+' blocks from '+initial.world.blocks.length+', but storage contains '+afterBuild.world.blocks.length+'. Live sandbox count was '+immediateBuild.liveBlocks+'.');

  // Verify the visible toolbar save icon calls the existing world-save path.
  await page.locator('[data-hud-tool="save-world"]').click();
  await page.waitForFunction(()=>/Saved to browser recovery|Saved to .* and browser recovery/.test(document.getElementById('backup-feedback').textContent),null,{timeout:10000});

  // Confirm that position changes in Play Mode are persisted to the same player record.
  await togglePlayModeFromSettings();
  const beforeMove=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getPlayerState().player.z);
  await page.keyboard.down('w');
  await page.waitForTimeout(650);
  await page.keyboard.up('w');
  await page.waitForFunction(async(before)=>{
   const stored=localStorage.getItem('diycraft_peaceful_voxel_v1');if(!stored)return false;
   const world=JSON.parse(await window.DIYCraftThreeWorldStorage.decode(stored));
   return Math.abs(world.player.z-before)>.12;
  },beforeMove,{timeout:12000});
  await togglePlayModeFromSettings();

  // Animal placement is part of the actual UI and does not change the build mode.
  const savedAnimalCount=await page.evaluate(async()=>{
   const world=JSON.parse(await window.DIYCraftThreeWorldStorage.decode(localStorage.getItem('diycraft_peaceful_voxel_v1')));
   return (world.animals||[]).length;
  });
  await page.locator('[data-hud-tool="animal"]').click();
  await page.locator('#quick-picker-content .hud-picker-grid button').filter({hasText:'Cat'}).click();
  const canvas=page.locator('#three-world'),bounds=await canvas.boundingBox();
  let placed=false;
  for(const [fx,fy] of [[.88,.84],[.12,.84],[.88,.34],[.12,.34],[.5,.88],[.94,.55],[.06,.55]]){
   await canvas.click({position:{x:bounds.width*fx,y:bounds.height*fy}});
   await page.waitForTimeout(120);
   if(!(await page.locator('#animal-care').isVisible().catch(()=>false))&&
      !(await page.locator('#neighbor-coloring').isVisible().catch(()=>false))){ }
   else{
    if(await page.locator('#animal-care').isVisible().catch(()=>false))await page.locator('#animal-care-close').click();
    if(await page.locator('#neighbor-coloring').isVisible().catch(()=>false))await page.locator('#neighbor-color-close').click();
   }
   const count=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getAnimalStats?.().animals?.length||0);
   if(count>savedAnimalCount){placed=true;break;}
  }
  assert.equal(placed,true,'The Place an animal mode must add a saved animal through the world interface.');
  await page.waitForFunction(async(expected)=>{
   const stored=localStorage.getItem('diycraft_peaceful_voxel_v1');if(!stored)return false;
   const world=JSON.parse(await window.DIYCraftThreeWorldStorage.decode(stored));
   return (world.animals||[]).length>expected;
  },savedAnimalCount,{timeout:12000});

  // Downloaded backup must be original version-1 JSON, not renderer-only data.
  await openSettingsPanel();
  let backupDownloadCount=0;
  page.on('download',()=>{backupDownloadCount++;});
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#backup-download').click()]);
  await page.waitForTimeout(80);
  assert.equal(backupDownloadCount,1,'One backup-button click must produce exactly one download.');
  const downloadPath=await download.path();
  assert.ok(downloadPath,'Backup download must produce a file.');
  const backup=JSON.parse(fs.readFileSync(downloadPath,'utf8'));
  assert.equal(backup.version,1);
  assert.ok(Array.isArray(backup.blocks));
  assert.ok(!Object.prototype.hasOwnProperty.call(backup,'source'));
  assert.ok(!Object.prototype.hasOwnProperty.call(backup,'counts'));

  // Invalid restore must leave the existing saved world unchanged.
  const beforeInvalid=await page.evaluate(()=>localStorage.getItem('diycraft_peaceful_voxel_v1'));
  await page.locator('#backup-restore').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"blocks":')});
  await page.waitForFunction(()=>document.getElementById('backup-feedback').textContent.includes('Backup not restored'),null,{timeout:10000});
  const afterInvalid=await page.evaluate(()=>localStorage.getItem('diycraft_peaceful_voxel_v1'));
  assert.equal(afterInvalid,beforeInvalid,'A malformed backup must not overwrite the current device save.');

  // Focus the actual resident models for visual review at the gameplay camera distance.
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.focusAnimalForTest?.('bird_chirpy')),true,'Chirpy should be focusable for the bird close-up.');
  await page.waitForTimeout(180);
  await page.screenshot({path:'three-animal-bird.png',fullPage:false});
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.focusAnimalForTest?.('sheep')),true,'Pip should be focusable for the sheep close-up.');
  await page.waitForTimeout(180);
  await page.screenshot({path:'three-animal-sheep.png',fullPage:false});

  // The offline worker must cache every production script, then serve the game after disconnect.
  await page.waitForFunction(()=>!!navigator.serviceWorker?.controller,null,{timeout:20000}).catch(async()=>{
   await page.reload({waitUntil:'networkidle',timeout:60000});
   await page.waitForFunction(()=>!!navigator.serviceWorker?.controller,null,{timeout:20000});
  });
  const shellCacheName=fs.readFileSync('sw.js','utf8').match(/const CACHE_NAME\s*=\s*['"]([^'"]+)['"]/)?.[1];
  assert.ok(shellCacheName,'The service worker must declare its versioned shell cache name.');
  const cacheCheck=await page.evaluate(async(expectedName)=>{
   const names=await caches.keys();
   const name=names.find(value=>value===expectedName);
   if(!name)return {name:null,assets:[]};
   const cache=await caches.open(name),requests=await cache.keys();
   return {name,assets:requests.map(request=>new URL(request.url).pathname)};
  },shellCacheName);
  assert.equal(cacheCheck.name,shellCacheName,'The updated offline worker must install its declared Three.js shell cache.');
  for(const asset of ['/diycraft/three-world-live.js','/diycraft/js/three.js','/diycraft/js/three-viewport.js','/diycraft/js/three-world-storage.js','/diycraft/js/three-world-starter.js','/diycraft/js/three-plant-geometry.js','/diycraft/js/three-compact-hud.js','/diycraft/js/three-world-file-save.js']){
   assert.ok(cacheCheck.assets.some(path=>path.endsWith(asset.replace('/diycraft','')))||cacheCheck.assets.some(path=>path.endsWith(asset)),
    'Offline cache is missing '+asset);
  }
  // A versioned legacy-engine URL must use its canonical precached key while offline.
  await context.setOffline(true);
  const versionedEngineFallback=await page.evaluate(async()=>{
   const response=await fetch('./diycraft.js?offline-cache-audit=1',{cache:'no-store'});
   return {ok:response.ok,status:response.status,bytes:(await response.arrayBuffer()).byteLength};
  });
  assert.ok(versionedEngineFallback.ok&&versionedEngineFallback.bytes>0,
   'The offline worker must serve the canonical diycraft.js cache for a query-suffixed same-origin request.');
  await context.setOffline(false);

  await page.screenshot({path:'three-live-main.png',fullPage:false});
  const flowerFocus=await page.evaluate(()=>{
   const panel=document.getElementById('settings-panel'),toggle=document.getElementById('settings-toggle');
   if(panel)panel.hidden=true;if(toggle)toggle.setAttribute('aria-expanded','false');
   return window.__DIYCRAFT_THREE_EDIT__?.focusFlowerForTest?.(0);
  });
  assert.ok(flowerFocus,'The live scene must expose a flower for visual close-up validation.');
  await page.waitForTimeout(220);
  await page.screenshot({path:'three-flower-closeup.png',fullPage:false});
  // The restored house icon must safely return the player to the starter neighborhood.
  const beforeNeighborhoodVisit=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getPlayerState()?.player);
  assert.ok(beforeNeighborhoodVisit,'The live player state must be available before visiting the neighborhood.');
  await page.locator('#neighborhood-toggle').click();
  await page.waitForFunction(()=>{
   const player=window.__DIYCRAFT_THREE_EDIT__?.getPlayerState()?.player;
   return player&&Math.hypot(player.x-4.5,player.z+5.5)<=2&&
    document.getElementById('status')?.textContent.includes('Welcome back! You are home in the neighborhood.');
  },null,{timeout:8000});
  const neighborhoodVisit=await page.evaluate(()=>({
   player:window.__DIYCRAFT_THREE_EDIT__?.getPlayerState()?.player,
   playMode:window.__DIYCRAFT_THREE_EDIT__?.playerMode,
   status:document.getElementById('status')?.textContent
  }));
  assert.equal(neighborhoodVisit.playMode,false,'Neighborhood return must leave the player in build mode.');
  assert.ok(Math.hypot(neighborhoodVisit.player.x-4.5,neighborhoodVisit.player.z+5.5)<=2,
   'Neighborhood return must use a safe position close to the original village entrance.');
  assert.match(neighborhoodVisit.status,/Welcome back! You are home in the neighborhood/);

  // The original village must keep its own ground after the camera travels far away
  // and looks back. The moving exploration floor must not be the only ground owner.
  const distantVillage=await page.evaluate(()=>{
   const api=window.__DIYCRAFT_THREE_EDIT__;
   const far=api.focusNeighborhoodFromDistanceForTest(120);
   // Use the open southeast edge of the village patch, away from houses and blocks,
   // so the ray test measures the floor rather than an object in front of it.
   const point=api.getGroundScreenPointForTest(28,8);
   const target=point?.visible?api.getPointerTargetForTest(point.x,point.y):null;
   return {
    far,point,target,
    coverage:api.getGroundCellCoverageForTest(28,8),
    ground:api.getNeighborhoodGroundStats(),
    houses:api.getNeighborhoodStats().houses,
    neighbors:api.getNeighborStats().actors,
    residents:api.getAnimalStats().residents,
    backdrop:api.getWorldBackdropStats()
   };
  });
  assert.ok(distantVillage.far,'The far-look test must move the camera away while aiming back at the village.');
  assert.ok(Math.hypot(distantVillage.backdrop.floor.x-distantVillage.ground.center.x,
   distantVillage.backdrop.floor.z-distantVillage.ground.center.z)>45,
   'The camera-following terrain must be outside the neighborhood while looking back from afar.');
  assert.ok(distantVillage.ground.grassCells>2000,
   'A persistent fixed ground patch must cover the neighborhood and its residents.');
  assert.equal(distantVillage.ground.center.y,0,'The neighborhood terrain must stay on the world ground plane.');
  const inVillageBounds=(actor)=>actor.x>=distantVillage.ground.bounds.minX&&actor.x<distantVillage.ground.bounds.maxX&&
   actor.z>=distantVillage.ground.bounds.minZ&&actor.z<distantVillage.ground.bounds.maxZ;
  assert.ok(distantVillage.houses.every(house=>house.position.y===0&&inVillageBounds(house.position)),
   'All three cottage roots must remain attached to the anchored village terrain.');
  assert.ok(distantVillage.neighbors.length===7&&distantVillage.neighbors.every(inVillageBounds),
   'All seven roaming neighbors must remain inside the anchored village terrain.');
  assert.ok(distantVillage.residents.length===7&&distantVillage.residents.every(inVillageBounds),
   'All seven resident animals must remain inside the anchored village terrain.');
  assert.deepEqual(distantVillage.coverage,{neighborhood:true,moving:false,owners:1,owner:'neighborhood'},
   'The village must have exactly one ground owner, without overlapping moving terrain.');
  assert.ok(distantVillage.point?.visible,'The village ground must remain visible from the distant camera.');
  assert.equal(distantVillage.target?.kind,'ground',
   'The fixed village terrain must remain raycastable for normal building and digging.');

  await context.setOffline(true);
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__DIYCRAFT_THREE_EDIT__?.frames>=3,null,{timeout:30000});
  const offlineStatus=await page.evaluate(()=>({
   revision:window.THREE?.REVISION,
   source:window.__DIYCRAFT_THREE_EDIT__?.storageSource,
   blocks:window.__DIYCRAFT_THREE_EDIT__?.blockCount
  }));
  assert.equal(offlineStatus.revision,'128','Offline startup must still use Three.js.');
  assert.ok(offlineStatus.blocks>0,'Offline startup must render the real saved world.');
  await context.setOffline(false);
  if(errors.length)throw new Error('Browser console/page errors:\n'+errors.join('\n\n'));
  console.log('Three.js live browser integration passed: '+JSON.stringify({
   initialBlocks:initial.world.blocks.length,afterBuild:afterBuild.world.blocks.length,
   playerStartZ:beforeMove,animals:savedAnimalCount,cacheFiles:cacheCheck.assets.length,offlineStatus
  }));
  await context.close();
 }finally{
  await browser.close();server.kill('SIGTERM');
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
