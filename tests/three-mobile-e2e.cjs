'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');

(async()=>{
 const server=spawn('python3',['-m','http.server','4179','--bind','127.0.0.1'],{stdio:'ignore'});
 const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 try{
  const context=await browser.newContext({
   viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,
   serviceWorkers:'allow',acceptDownloads:true
  });
  const page=await context.newPage(),errors=[];
  await page.addInitScript(()=>{
   try{
    Object.defineProperty(navigator,'deviceMemory',{configurable:true,value:2});
    Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,value:4});
   }catch(_){}
  });
  page.on('pageerror',error=>errors.push(error.stack||error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto('http://127.0.0.1:4179/index.html',{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>window.__DIYCRAFT_THREE_EDIT__?.frames>=5 ||
   document.getElementById('status')?.textContent.startsWith('DIYCraft could not start:'),null,{timeout:60000});
  const startupStatus=await page.locator('#status').textContent();
  assert.ok((await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.frames||0))>=5,
   'Mobile game startup must complete before UI tests. Status: '+startupStatus+' Browser errors: '+errors.join(' | '));
  await page.waitForFunction(()=>!!localStorage.getItem('diycraft_peaceful_voxel_v1'),null,{timeout:20000});

  const startup=await page.evaluate(()=>({
   width:document.getElementById('three-world').width,
   height:document.getElementById('three-world').height,
   viewport:{width:innerWidth,height:innerHeight},
   revision:THREE.REVISION,
   storageReadFailed:window.__DIYCRAFT_THREE_EDIT__?.storageReadFailed
  }));
  assert.equal(startup.revision,'128');
  assert.equal(startup.storageReadFailed,false);

  const proportions=await page.evaluate(()=>{
   const edit=window.__DIYCRAFT_THREE_EDIT__;
   return {blocks:edit?.getBlockRepresentationStats?.(),plants:edit?.getPlantStats?.(),
    character:edit?.getCharacterStats?.(),animals:edit?.getAnimalStats?.()};
  });
  assert.deepEqual(proportions.blocks?.cellDimensions,{width:1,height:1,depth:1},
   'Regular building blocks must stay true cubes; special tiles and doors keep their intended shapes.');
  assert.ok(proportions.plants?.flowerCount>0&&proportions.plants.flowers.every(item=>item.renderScale===.72),
   'Every live flower and tall-grass plant must use the smaller proportional render scale.');
  assert.deepEqual(proportions.character?.modelScale,{x:.90,y:1,z:1},
   'The player avatar must be narrower without changing its height or depth.');
  assert.equal(proportions.animals?.renderScale,.74,'All animal species must use the shared smaller scale.');
  assert.ok(proportions.animals?.instanceScale&&
   [proportions.animals.instanceScale.x,proportions.animals.instanceScale.y,proportions.animals.instanceScale.z]
    .every(value=>Number.isFinite(value)&&Math.abs(value-.74)<1e-5),
   'The actual animal instance matrix must apply the smaller scale on every axis within Float32 precision.');

  // The local painterly generator must produce a visibly distinct surface for every design.
  const textureCoverage=await page.evaluate(()=>{
   const api=window.DIYCraftPainterlyMaterials;
   const fingerprint=(kind)=>{
    const canvas=api.generateCanvas('#b9a17f',0x51a7,kind,{textureSize:128});
    const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let hash=2166136261;
    for(let i=0;i<data.length;i+=4){hash=Math.imul(hash^data[i],16777619)>>>0;hash=Math.imul(hash^data[i+1],16777619)>>>0;hash=Math.imul(hash^data[i+2],16777619)>>>0;}
    return hash;
   };
   const patterns=['grid','brick','checker','diagonal','diamond','hexagon','herringbone','basket','mosaic','terrazzo','waves','dots','floral','stars','sunburst','scallop','parquet','pebble','cross','spiral'];
   const surfaces=['grass','stone','wood','leaves','brick','dirt','sand','snow','glass','flower','custom'];
   const patternHashes=patterns.map(value=>fingerprint('tile-'+value));
   const surfaceHashes=surfaces.map(fingerprint);
   return {patterns:patterns.length,uniquePatterns:new Set(patternHashes).size,
    surfaces:surfaces.length,uniqueSurfaces:new Set(surfaceHashes).size};
  });
  assert.equal(textureCoverage.patterns,20);
  assert.equal(textureCoverage.uniquePatterns,20,
   'Each named tile pattern must have its own visual motif, not share the generic diagonal fallback.');
  assert.equal(textureCoverage.uniqueSurfaces,textureCoverage.surfaces,
   'Stone, grass, wood, leaves and the other solid finishes must have distinct surface motifs.');

  // Settings start collapsed; compact utility and building controls stay available.
  const settingsPanel=page.locator('#settings-panel'),settingsToggle=page.locator('#settings-toggle');
  const openSettingsPanel=async()=>{if(!(await settingsPanel.isVisible()))await settingsToggle.click();};
  const togglePlayModeFromSettings=async()=>{await openSettingsPanel();await page.locator('#play-mode').click();};
  assert.equal(await settingsPanel.isVisible(),false,'The settings panel must start closed to maximize the world view.');
  assert.equal(await settingsToggle.getAttribute('aria-expanded'),'false','The closed panel must be reflected by the toggle.');
  assert.equal(await page.locator('#quick-tools').count(),0,'There must be no floating quick-action toolbar.');
  assert.equal(await page.locator('#gesture-guide').count(),0,'Tap and long-press are built-in gestures, not screen controls.');
  assert.equal(await page.locator('#quick-play-toggle').count(),0,'Play Mode belongs in the organized settings panel.');
  assert.equal(await page.locator('#player-controls').isVisible(),true,'The movement D-pad must stay visible even before Play Mode starts.');
  assert.equal(await page.locator('#player-actions').isVisible(),true,'The Jump/Fly/Dance/Sit pad must stay visible even before Play Mode starts.');
  const initialHud=await page.evaluate(()=>{
   const d=document.getElementById('player-controls').getBoundingClientRect();
   const a=document.getElementById('player-actions').getBoundingClientRect();
   const g=document.getElementById('settings-toggle').getBoundingClientRect();
   const t=document.getElementById('top-controls').getBoundingClientRect();
   return {d:{left:d.left,right:d.right,bottom:d.bottom},a:{left:a.left,right:a.right,bottom:a.bottom},
    gear:{left:g.left,right:g.right},toolbar:{left:t.left,right:t.right}};
  });
  assert.ok(initialHud.gear.left>=initialHud.toolbar.left&&initialHud.gear.right<=initialHud.toolbar.right,
   'The gear icon must be inside the upper-right utility row.');
  assert.ok(Math.abs(initialHud.gear.right-initialHud.toolbar.right)<1,
   'The gear icon must be the rightmost icon in the upper-right utility row.');
  assert.ok(initialHud.d.right<initialHud.a.left,'The always-visible lower-corner touch pads must not overlap.');
  assert.ok(Math.abs(initialHud.d.bottom-initialHud.a.bottom)<3,'Both touch pads must share the same bottom alignment.');

  assert.equal(await page.locator('#top-controls button').count(),3,'Exactly three utility icons must appear at the upper right.');
  assert.equal(await page.locator('#build-toolbar [data-hud-tool]').count(),8,'The compact build toolbar must contain eight requested tools.');
  assert.equal(await page.locator('#settings-toggle').getAttribute('aria-expanded'),'false');
  const dpadGrid=await page.evaluate(()=>Object.fromEntries(['forward','left','back','right'].map(key=>{
   const node=document.querySelector('#player-controls [data-move="'+key+'"]');
   const style=getComputedStyle(node);return [key,{column:style.gridColumnStart,row:style.gridRowStart}];
  })));
  assert.deepEqual(dpadGrid,{forward:{column:'2',row:'1'},left:{column:'1',row:'2'},back:{column:'2',row:'2'},right:{column:'3',row:'2'}},
   'The movement pad must be a fixed 2-by-3 D-pad: up centered above left/down/right.');

  for(const id of ['add','remove','water-add','fill-hole','dig-ground']){
   assert.equal(await page.locator('#'+id).count(),1,'Legacy gesture handler #'+id+' must remain wired.');
   assert.equal(await page.locator('#'+id).isVisible(),false,'Gesture action #'+id+' must not appear as a screen control.');
  }
  for(const section of ['Build & Materials','World & Water','Characters & Animals','Creative Studios & Collection']){
   assert.equal(await page.locator('details.settings-section').filter({hasText:section}).count(),1,'Settings must have one organized '+section+' group.');
  }
  await openSettingsPanel();
  await page.locator('#hud-choices-block-type [data-value="water"]').click();
  assert.equal(await page.locator('#block-type').inputValue(),'water','Material selection remains available inside organized Settings.');
  await page.locator('#hud-choices-block-type [data-value="grass"]').click();
  await page.locator('details.settings-section').filter({hasText:'Creative Studios & Collection'}).locator('summary').click();
  await page.locator('#inventory-open').click();
  assert.equal(await page.locator('#inventory-panel').isVisible(),true,'Inventory remains accessible from its Settings group.');
  await page.locator('#inventory-close').click();
  await openSettingsPanel();
  await page.locator('details.settings-section').filter({hasText:'Characters & Animals'}).locator('summary').click();
  await page.locator('#play-mode').click();
  assert.equal(await page.locator('#player-controls').isVisible(),true,'Play Mode remains available from its organized Settings group.');
  await openSettingsPanel();
  await page.locator('#play-mode').click();
  assert.equal(await page.locator('#player-controls').isVisible(),true,'The D-pad remains available after returning to Build Mode.');
  assert.equal(await page.locator('#player-actions').isVisible(),true,'The action pad remains available after returning to Build Mode.');
  for(const [activity,expectedY,expectedZ] of [['sleep',.72,1],['transformer',1.04,1.04],['sit',.82,1],['work',1,1],['dance',1,1]]){
   await page.locator('#activity-mode').selectOption(activity);
   await page.locator('#activity-apply').click();
   await page.waitForTimeout(150);
   const scale=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getCharacterStats?.().modelScale);
   assert.deepEqual(scale,{x:.90,y:expectedY,z:expectedZ},
    'The '+activity+' animation must preserve the narrower character width.');
  }
  await page.locator('#activity-mode').selectOption('stop');
  await page.locator('#activity-apply').click();
  await page.waitForTimeout(150);
  assert.deepEqual(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getCharacterStats?.().modelScale),{x:.90,y:1,z:1},
   'Stopping an activity must restore normal height and depth while preserving the narrower width.');
  await settingsToggle.click();
  assert.equal(await settingsPanel.isVisible(),false,'The controls toggle must collapse the panel.');
  await settingsToggle.click();
  assert.equal(await settingsPanel.isVisible(),true,'The same toggle must reopen the controls panel.');
  assert.equal(await settingsToggle.getAttribute('aria-expanded'),'true');
  for(const id of ['bucket-item','block-type','inventory-open','character-open','art-open','gallery-open',
   'solid-design-open','door-design-open','tile-design-open','animal-place','world-name','save-now',
   'backup-download','backup-restore','status','offline-ready-note']){
   assert.equal(await page.locator('#'+id).count(),1,'Existing control #'+id+' must remain available exactly once.');
  }
  await page.locator('#settings-close').click();
  assert.equal(await settingsPanel.isVisible(),false,'The close button must collapse settings.');
  await settingsToggle.click();
  await page.keyboard.press('Escape');
  assert.equal(await settingsPanel.isVisible(),false,'Escape must dismiss the settings dashboard.');
  assert.equal(await settingsToggle.getAttribute('aria-expanded'),'false');
  await settingsToggle.click();
  await page.locator('body').dispatchEvent('pointerdown',{
   pointerId:34,pointerType:'touch',isPrimary:true,button:0,buttons:1
  });
  assert.equal(await settingsPanel.isVisible(),true,'Tapping the world must not make the controls disappear.');

  assert.ok(startup.width<=390&&startup.height<=844,
   'Mobile rendering must clamp the drawing buffer to the mobile viewport rather than multiplying by device pixel ratio.');

  // Inventory: all four tabs must open and populate without changing the world.
  await openSettingsPanel();
  await page.locator('#inventory-open').click();
  assert.equal(await page.locator('#inventory-panel').isVisible(),true);
  for(const tab of ['materials','crafted','bucket','recipes']){
   await page.locator('[data-inventory-tab="'+tab+'"]').click();
   assert.equal(await page.locator('[data-inventory-tab="'+tab+'"]').getAttribute('class')?.then(v=>v.includes('active')),true);
  }
  assert.ok(await page.locator('#inventory-recipes').isVisible());
  await page.locator('#inventory-close').click();

  // Character studio: preset application updates the actual player model and save state.
  await openSettingsPanel();
  await page.locator('#character-open').click();
  await page.locator('[data-character-look="artist"]').click();
  await page.locator('#character-apply').click();
  const character=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getCharacterStats?.());
  assert.equal(character?.player?.accessory,'flower','The artist preset must update the saved player appearance.');
  assert.equal(await page.locator('#character-studio').isVisible(),false);

  // All three designers must apply valid state into the same world sandbox.
  await openSettingsPanel();
  await page.locator('#solid-design-open').click();
  await page.locator('#hud-choices-solid-design-type [data-value="stone"]').click();
  await page.locator('#solid-design-color').fill('#8b91a0');
  await page.locator('#hud-choices-solid-design-texture [data-value="brick"]').click();
  const solidPreview=await page.locator('#solid-design-chip').evaluate(element=>getComputedStyle(element).backgroundImage);
  assert.ok(solidPreview.startsWith('url("data:image/png;base64,'),
   'The solid designer preview must show the actual selected texture pattern.');
  await page.locator('#solid-design-apply').click();
  assert.equal((await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getDesignStats?.().solidStyles?.stone?.color)),'#8b91a0');

  await openSettingsPanel();
  await page.locator('#door-design-open').click();
  await page.locator('#hud-choices-door-design-style [data-value="window"]').click();
  await page.locator('#door-design-color').fill('#6d9f8a');
  await page.locator('#door-design-apply').click();
  assert.equal((await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getDesignStats?.().doorDesign?.style)),'window');

  await openSettingsPanel();
  await page.locator('#tile-design-open').click();
  await page.locator('#hud-choices-tile-design-pattern [data-value="herringbone"]').click();
  const tilePreview=await page.locator('#tile-design-chip').evaluate(element=>getComputedStyle(element).backgroundImage);
  assert.ok(tilePreview.startsWith('url("data:image/png;base64,'),
   'The tile designer preview must show the actual selected pattern.');
  await page.locator('#tile-design-color').fill('#c48b72');
  await page.locator('#tile-design-apply').click();
  assert.equal((await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getDesignStats?.().tileDesign?.pattern)),'herringbone');

  // Changing a solid finish must override any temporary green-picker color and reach the renderer.
  await page.locator('#hud-choices-block-type [data-value="grass"]').click();
  await page.evaluate(()=>{window.DIYCraftQuickMaterialColors.grass='#ef2244';});
  await page.locator('#solid-design-open').click();
  await page.locator('#hud-choices-solid-design-type [data-value="grass"]').click();
  await page.locator('#solid-design-color').fill('#3c9555');
  await page.locator('#hud-choices-solid-design-texture [data-value="leaves"]').click();
  await page.locator('#solid-design-apply').click();
  const placedStyleBlocks=await page.evaluate(()=>{
   const debug=window.__DIYCRAFT_THREE_EDIT__;
   const stone=debug.debugPlaceObstacleForTest({type:'stone',x:84,y:0,z:82});
   const grass=debug.debugPlaceObstacleForTest({type:'grass',x:86,y:0,z:82});
   const tall=debug.debugPlaceObstacleForTest({type:'tall_grass',x:88,y:0,z:82,color:'#25a85c'});
   const blocks=debug.getState().world.blocks;
   const find=(x)=>blocks.find(block=>block.x===x&&block.z===82);
   return {stoneKey:stone.key,grassKey:grass.key,tallKey:tall.key,
    stone:find(84),grass:find(86),tall:find(88),
    stoneVisual:debug.getBlockVisualStats(stone.key),grassVisual:debug.getBlockVisualStats(grass.key),
    tallVisual:debug.getBlockVisualStats(tall.key)};
  });
  assert.equal(placedStyleBlocks.stone.color,'#8b91a0');
  assert.equal(placedStyleBlocks.stone.texture,'brick');
  assert.equal(placedStyleBlocks.grass.color,'#3c9555',
   'The chosen grass finish must win over a stale temporary color-picker override.');
  assert.equal(placedStyleBlocks.grass.texture,'leaves');
  assert.equal(placedStyleBlocks.stoneVisual.materialKind,'brick');
  assert.equal(placedStyleBlocks.grassVisual.materialKind,'leaves');
  assert.equal(placedStyleBlocks.stoneVisual.hasCanvasMap,true);
  assert.equal(placedStyleBlocks.grassVisual.hasCanvasMap,true);
  assert.equal(placedStyleBlocks.tallVisual.plantBaseColor,'#25a85c',
   'Tall-grass geometry must use the selected custom green.');
  assert.equal(placedStyleBlocks.tallVisual.hasGeometry,true);

  // A selected tile must not overwrite the saved design for the next tile placement.
  await page.evaluate(()=>{
   window.__DIYCRAFT_THREE_EDIT__.debugPlaceObstacleForTest({type:'tile',x:82,y:0,z:82});
  });
  const firstTile=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getState?.().world.blocks.find(block=>block.x===82&&block.z===82));
  assert.equal(firstTile?.color,'#c48b72','New tiles must use the selected design color.');
  assert.equal(firstTile?.tilePattern,'herringbone','New tiles must use the selected pattern instead of the reset Grid value.');
  const tileVisual=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getBlockVisualStats?.(
   window.__DIYCRAFT_THREE_EDIT__?.getState?.().world.blocks.find(block=>block.x===82&&block.z===82)?.key));
  assert.equal(tileVisual?.materialKind,'tile-herringbone');
  assert.equal(tileVisual?.hasCanvasMap,true);

  // Art Studio: draw with touch-style PointerEvents, save PNG, and render it in Gallery.
  await openSettingsPanel();
  await page.locator('#art-open').click();
  const artBefore=await page.locator('#art-canvas').evaluate(canvas=>canvas.toDataURL('image/png'));
  await page.locator('#art-name').fill('Mobile meadow');
  await page.locator('#art-canvas').evaluate(canvas=>{
   const rect=canvas.getBoundingClientRect();
   const event=(type,x,y)=>canvas.dispatchEvent(new PointerEvent(type,{
    bubbles:true,cancelable:true,pointerId:7,pointerType:'touch',isPrimary:true,
    button:0,buttons:type==='pointerup'?0:1,clientX:x,clientY:y
   }));
   event('pointerdown',rect.left+rect.width*.25,rect.top+rect.height*.35);
   event('pointermove',rect.left+rect.width*.72,rect.top+rect.height*.68);
   event('pointerup',rect.left+rect.width*.72,rect.top+rect.height*.68);
  });
  const artAfter=await page.locator('#art-canvas').evaluate(canvas=>canvas.toDataURL('image/png'));
  assert.notEqual(artAfter,artBefore,'A touch-style drawing gesture must change the artwork canvas.');
  await page.locator('#art-save').click();
  const gallery=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getGalleryStats?.());
  assert.equal(gallery?.artworks?.length,1);
  assert.equal(gallery?.artworks?.[0]?.name,'Mobile meadow');
  await openSettingsPanel();
  await page.locator('#gallery-open').click();
  assert.equal(await page.locator('#gallery-panel').isVisible(),true);
  assert.equal(await page.locator('#gallery-artworks .gallery-card').count(),1);
  await page.locator('#gallery-close').click();

  // Touch movement: pointer-down must move the player; pointer-cancel must release it.
  await togglePlayModeFromSettings();
  assert.equal(await settingsPanel.isVisible(),true,'The controls panel must remain visible in Play Mode.');
  assert.equal(await page.locator('#player-controls').isVisible(),true,'The movement D-pad must appear in Play Mode.');
  assert.equal(await page.locator('#player-actions').isVisible(),true,'Jump, Fly, Dance and Sit controls must appear opposite the D-pad.');
  assert.equal(await page.locator('#player-actions .player-action-button').count(),4,'The action pad must contain Jump, Fly, Dance and Sit.');
  const hudPositions=await page.evaluate(()=>{
   const d=document.getElementById('player-controls').getBoundingClientRect();
   const a=document.getElementById('player-actions').getBoundingClientRect();
   return {dpad:{left:d.left,right:d.right,top:d.top,bottom:d.bottom},
    actions:{left:a.left,right:a.right,top:a.top,bottom:a.bottom},viewport:{width:innerWidth,height:innerHeight}};
  });
  assert.ok(hudPositions.dpad.left<hudPositions.actions.left &&
   hudPositions.dpad.right<hudPositions.actions.left,
   'The D-pad must stay on the left and the Jump/Fly cluster on the right without overlap.');
  assert.ok(Math.abs(hudPositions.dpad.bottom-hudPositions.actions.bottom)<3,
   'Both touch clusters must share a common bottom safe-area alignment.');
  assert.equal(await page.locator('#flight-vertical-controls').isVisible(),false,
   'Vertical flight controls must stay hidden before flight is enabled.');
  await page.locator('#flight').click();
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getPlayerState?.().flying),true,
   'The right-side Fly button must toggle flight on.');
  const flightPad=page.locator('#flight-vertical-controls');
  assert.equal(await flightPad.isVisible(),true,
   'Turning flight on must reveal dedicated UP and DOWN touch controls.');
  assert.equal(await page.locator('[data-flight-vertical]').count(),2,
   'The vertical flight pad must contain exactly UP and DOWN controls.');
  const flightLayout=await page.evaluate(()=>{
   const vertical=document.getElementById('flight-vertical-controls').getBoundingClientRect();
   const actions=document.getElementById('player-actions').getBoundingClientRect();
   return {vertical:{left:vertical.left,right:vertical.right,top:vertical.top,bottom:vertical.bottom},
    actions:{left:actions.left,right:actions.right}};
  });
  assert.ok(flightLayout.vertical.right<flightLayout.actions.left,
   'The vertical flight pad must not overlap Jump/Fly/Dance/Sit actions.');
  const beforeRise=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getPlayerState?.().player?.y);
  const rise=page.locator('#flight-rise');
  await rise.dispatchEvent('pointerdown',{pointerId:41,pointerType:'touch',isPrimary:true,button:0,buttons:1});
  await page.waitForTimeout(480);
  await rise.dispatchEvent('pointerup',{pointerId:41,pointerType:'touch',isPrimary:true,button:0,buttons:0});
  const afterRise=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getPlayerState?.().player?.y);
  assert.ok(Number.isFinite(beforeRise)&&Number.isFinite(afterRise)&&afterRise>beforeRise+.2,
   'Holding UP while flying must raise the player.');
  const beforeDescend=afterRise;
  const descend=page.locator('#flight-descend');
  await descend.dispatchEvent('pointerdown',{pointerId:42,pointerType:'touch',isPrimary:true,button:0,buttons:1});
  await page.waitForTimeout(480);
  await descend.dispatchEvent('pointerup',{pointerId:42,pointerType:'touch',isPrimary:true,button:0,buttons:0});
  const afterDescend=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getPlayerState?.().player?.y);
  assert.ok(Number.isFinite(afterDescend)&&afterDescend<beforeDescend-.2,
   'Holding DOWN while flying must lower the player.');
  await page.locator('#flight').click();
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getPlayerState?.().flying),false,
   'The right-side Fly button must toggle flight off.');
  assert.equal(await flightPad.isVisible(),false,
   'Turning flight off must hide the vertical UP/DOWN controls.');
  await page.locator('#play-mode').click(); // Exit Play Mode before testing first-touch activation.
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.playerMode),false);
  const firstTouch=page.locator('#player-controls [data-move="forward"]');
  await firstTouch.dispatchEvent('pointerdown',{pointerId:20,pointerType:'touch',isPrimary:true,button:0,buttons:1});
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.playerMode),true,
   'Touching a visible movement arrow must enter Play Mode automatically.');
  await firstTouch.dispatchEvent('pointerup',{pointerId:20,pointerType:'touch',isPrimary:true,button:0,buttons:0});
  const before=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getPlayerState?.().player?.z);
  const forward=page.locator('#player-controls [data-move="forward"]');
  await forward.dispatchEvent('pointerdown',{pointerId:21,pointerType:'touch',isPrimary:true,button:0,buttons:1});
  await page.waitForTimeout(520);
  const during=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getPlayerState?.().player?.z);
  assert.ok(Number.isFinite(before)&&Number.isFinite(during)&&Math.abs(during-before)>.08,
   'A held mobile forward control must move the player in Play Mode.');
  await forward.dispatchEvent('pointercancel',{pointerId:21,pointerType:'touch',isPrimary:true,button:0,buttons:0});
  const released=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getPlayerState?.().player?.z);
  await page.waitForTimeout(280);
  const afterRelease=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getPlayerState?.().player?.z);
  assert.ok(Math.abs(afterRelease-released)<.06,
   'A cancelled touch gesture must release movement and must not leave the player walking.');
  await togglePlayModeFromSettings();

  // Persist the combined changes and verify a clean reload reconstructs them.
  await openSettingsPanel();
  await page.locator('#save-now').click();
  await page.waitForFunction(()=>document.getElementById('backup-feedback').textContent.includes('Saved successfully'),null,{timeout:15000});
  const saved=await page.evaluate(async()=>{
   const raw=await window.DIYCraftThreeWorldStorage.decode(localStorage.getItem('diycraft_peaceful_voxel_v1'));
   const world=JSON.parse(raw);
   return {appearance:world.player,doorDesign:world.doorDesign,tileDesign:world.tileDesign,
    solidStyles:world.solidStyles,artworks:world.artworks,player:world.player};
  });
  assert.equal(saved.appearance.accessory,'flower');
  assert.equal(saved.doorDesign.style,'window');
  assert.equal(saved.tileDesign.pattern,'herringbone');
  assert.equal(saved.solidStyles.stone.color,'#8b91a0');
  assert.equal(saved.artworks.length,1);
  await page.reload({waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>window.__DIYCRAFT_THREE_EDIT__?.frames>=5,null,{timeout:45000});
  const restored=await page.evaluate(()=>({
   character:window.__DIYCRAFT_THREE_EDIT__?.getCharacterStats?.().player?.accessory,
   designs:window.__DIYCRAFT_THREE_EDIT__?.getDesignStats?.(),
   gallery:window.__DIYCRAFT_THREE_EDIT__?.getGalleryStats?.()
  }));
  assert.equal(restored.character,'flower');
  assert.equal(restored.designs.doorDesign.style,'window');
  assert.equal(restored.designs.tileDesign.pattern,'herringbone');
  assert.equal(restored.designs.solidStyles.stone.color,'#8b91a0');
  assert.equal(restored.gallery.artworks.length,1);

  // The main world canvas restores the original builder controls: tap to build/fill,
  // hold 0.6 seconds to dig/remove. Use real projected positions in the running scene.
  await openSettingsPanel();
  await page.locator('#hud-choices-block-type [data-value="grass"]').click();
  await page.locator('#settings-close').click();
  // Enter Play Mode with every movement arrow; Tap and Press world actions must remain available.
  for(const [pointerId,direction] of [[31,'forward'],[32,'back'],[33,'left'],[34,'right']]){
   const arrow=page.locator('#player-controls [data-move="'+direction+'"]');
   await arrow.dispatchEvent('pointerdown',{pointerId,pointerType:'touch',isPrimary:true,button:0,buttons:1});
   await arrow.dispatchEvent('pointerup',{pointerId,pointerType:'touch',isPrimary:true,button:0,buttons:0});
   assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.playerMode),true,
    'Movement arrow '+direction+' must activate Play Mode.');
   assert.equal(await page.locator('#player-controls').isVisible(),true,
    'The movement controls must remain visible after '+direction+'.');
   assert.equal(await page.locator('#player-actions').isVisible(),true,
    'The world Tap/Press actions must remain visible after '+direction+'.');
  }
  const buildCell=await page.evaluate(()=>{
   const debug=window.__DIYCRAFT_THREE_EDIT__,state=debug.getState(),occupied=new Set(state.world.blocks.map(block=>block.x+','+block.y+','+block.z));
   for(let z=-5;z<=8;z++)for(let x=-5;x<=8;x++){
    if(occupied.has(x+',0,'+z)||debug.isProtectedDigCell(x,z))continue;
    const point=debug.getGroundScreenPointForTest(x,z);
    if(!point?.visible)continue;
    const target=debug.getPointerTargetForTest(point.x,point.y);
    const actor=debug.getActorPickForTest(point.x,point.y);
    if(target?.kind==='ground'&&target.x===x&&target.z===z&&!actor)return {x,z,point};
   }
   return null;
  });
  assert.ok(buildCell,'The mobile scene must expose a clear, unprotected ground cell for touch building.');
  const dispatchTouch=async(point,pointerId,holdMs=0,drift=0)=>page.evaluate(async({point,pointerId,holdMs,drift})=>{
   const canvas=document.getElementById('three-world'),base={bubbles:true,cancelable:true,pointerId,pointerType:'touch',isPrimary:true,button:0};
   canvas.dispatchEvent(new PointerEvent('pointerdown',{...base,buttons:1,clientX:point.x,clientY:point.y}));
   if(holdMs)await new Promise(resolve=>setTimeout(resolve,Math.min(holdMs,180)));
   if(drift){
    canvas.dispatchEvent(new PointerEvent('pointermove',{...base,buttons:1,clientX:point.x+drift,clientY:point.y+drift}));
    if(holdMs>180)await new Promise(resolve=>setTimeout(resolve,holdMs-180));
   }else if(holdMs)await new Promise(resolve=>setTimeout(resolve,holdMs-180));
   canvas.dispatchEvent(new PointerEvent('pointerup',{...base,buttons:0,clientX:point.x+drift,clientY:point.y+drift}));
  },{point,pointerId,holdMs,drift});
  const startingBlocks=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getState?.().world.blocks.length);
  await dispatchTouch(buildCell.point,61);
  try{
   await page.waitForFunction(({x,z,count})=>{
    const blocks=window.__DIYCRAFT_THREE_EDIT__?.getState?.().world.blocks||[];
    return blocks.length===count+1&&blocks.some(block=>block.x===x&&block.y===0&&block.z===z&&block.type==='grass');
   },{x:buildCell.x,z:buildCell.z,count:startingBlocks},{timeout:10000});
  }catch(error){
   const diagnostics=await page.evaluate(({x,z,point})=>{
    const debug=window.__DIYCRAFT_THREE_EDIT__,world=debug?.getState?.().world;
    return {blocks:world?.blocks?.length,matching:world?.blocks?.filter(block=>block.x===x&&block.z===z),
     target:debug?.getPointerTargetForTest?.(point.x,point.y),actor:debug?.getActorPickForTest?.(point.x,point.y),
     status:document.getElementById('status')?.textContent};
   },{x:buildCell.x,z:buildCell.z,point:buildCell.point});
   throw new Error('Single-touch build did not create the expected grass block: '+JSON.stringify(diagnostics)+'; '+error.message);
  }
  const builtBlock=await page.evaluate(({x,z})=>{
   const debug=window.__DIYCRAFT_THREE_EDIT__,block=debug.getState().world.blocks.find(item=>item.x===x&&item.y===0&&item.z===z&&item.type==='grass');
   return block?{key:block.key,point:debug.getBlockScreenPointForTest(block.key)}:null;
  },{x:buildCell.x,z:buildCell.z});
  assert.ok(builtBlock?.point?.visible,'The newly placed block must be directly targetable for digging.');
  const blockTarget=await page.evaluate(point=>window.__DIYCRAFT_THREE_EDIT__?.getPointerTargetForTest?.(point.x,point.y),builtBlock.point);
  assert.equal(blockTarget?.kind,'block');
  assert.equal(blockTarget?.key,builtBlock.key);
  assert.equal(blockTarget?.step?.[1],1,'A tap on the top face must build one block above the target.');
  await dispatchTouch(builtBlock.point,62);
  try{
   await page.waitForFunction(({x,z})=>(window.__DIYCRAFT_THREE_EDIT__?.getState?.().world.blocks||[]).some(block=>block.x===x&&block.y===1&&block.z===z&&block.type==='grass'),{x:buildCell.x,z:buildCell.z},{timeout:10000});
  }catch(error){
   const diagnostics=await page.evaluate(({x,z,point})=>{
    const debug=window.__DIYCRAFT_THREE_EDIT__,world=debug?.getState?.().world;
    return {blocks:world?.blocks?.filter(block=>block.x===x&&block.z===z),target:debug?.getPointerTargetForTest?.(point.x,point.y),
     actor:debug?.getActorPickForTest?.(point.x,point.y),status:document.getElementById('status')?.textContent};
   },{x:buildCell.x,z:buildCell.z,point:builtBlock.point});
   throw new Error('Tap on the block did not stack another grass block: '+JSON.stringify(diagnostics)+'; '+error.message);
  }
  const upperBlock=await page.evaluate(({x,z})=>{
   const debug=window.__DIYCRAFT_THREE_EDIT__,block=debug.getState().world.blocks.find(item=>item.x===x&&item.y===1&&item.z===z&&item.type==='grass');
   return block?{key:block.key,point:debug.getBlockScreenPointForTest(block.key)}:null;
  },{x:buildCell.x,z:buildCell.z});
  assert.ok(upperBlock?.point?.visible);
  await dispatchTouch(upperBlock.point,63,680);
  await page.waitForFunction(key=>!(window.__DIYCRAFT_THREE_EDIT__?.getState?.().world.blocks||[]).some(block=>block.key===key),upperBlock.key,{timeout:10000});
  let editState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getState?.().world);
  assert.ok(editState.bucket.some(item=>item.type==='grass'),'Holding a placed block must remove it and recover it to the Material Bucket.');
  const basePoint=await page.evaluate(key=>window.__DIYCRAFT_THREE_EDIT__?.getBlockScreenPointForTest?.(key),builtBlock.key);
  assert.ok(basePoint?.visible);
  await dispatchTouch(basePoint,64,680);
  await page.waitForFunction(key=>!(window.__DIYCRAFT_THREE_EDIT__?.getState?.().world.blocks||[]).some(block=>block.key===key),builtBlock.key,{timeout:10000});
  editState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getState?.().world);
  assert.ok(editState.bucket.filter(item=>item.type==='grass').length>=2,'Holding a second block must recover it too.');
  const groundPoint=await page.evaluate(({x,z})=>window.__DIYCRAFT_THREE_EDIT__?.getGroundScreenPointForTest?.(x,z),{x:buildCell.x,z:buildCell.z});
  assert.ok(groundPoint?.visible);
  await dispatchTouch(groundPoint,65,680);
  await page.waitForFunction(({x,z})=>(window.__DIYCRAFT_THREE_EDIT__?.getState?.().world.excavations||[]).some(cell=>cell.x===x&&cell.z===z&&cell.depth===1),{x:buildCell.x,z:buildCell.z},{timeout:10000});
  editState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getState?.().world);
  assert.ok(editState.bucket.some(item=>item.type==='dirt'),'Holding the ground must dig one layer and recover dirt.');
  await dispatchTouch(groundPoint,66);
  await page.waitForFunction(({x,z})=>{
   const world=window.__DIYCRAFT_THREE_EDIT__?.getState?.().world;
   return !(world.excavations||[]).some(cell=>cell.x===x&&cell.z===z)&&world.blocks.some(block=>block.x===x&&block.y===-1&&block.z===z&&block.type==='grass');
  },{x:buildCell.x,z:buildCell.z},{timeout:10000});

  // Pool worksite regression: the default pool cell must remain diggable even
  // while family characters follow their routes. Hold gestures tolerate small finger drift.
  const poolPoint=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.focusGroundCellForTest?.(14,-5));
  assert.ok(poolPoint?.visible,'The default swimming-pool worksite must be visible for touch excavation.');
  const poolDebug=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getPoolSiteProtectionForTest?.());
  assert.equal(poolDebug?.protected,false,'Moving neighbors must not block the reserved pool dig cell.');
  const poolHit=await page.evaluate(point=>window.__DIYCRAFT_THREE_EDIT__?.getPointerTargetForTest?.(point.x,point.y),poolPoint);
  assert.equal(poolHit?.kind,'ground','The pool site must raycast to the editable ground surface.');
  await dispatchTouch(poolPoint,67,680,8);
  await page.waitForFunction(()=>(window.__DIYCRAFT_THREE_EDIT__?.getState?.().world.excavations||[])
   .some(cell=>cell.x===14&&cell.z===-5&&cell.depth===1),null,{timeout:10000});
  const poolResult=await page.evaluate(()=>({
   excavation:window.__DIYCRAFT_THREE_EDIT__?.getState?.().world.excavations?.find(cell=>cell.x===14&&cell.z===-5),
   dirt:window.__DIYCRAFT_THREE_EDIT__?.getState?.().world.bucket?.some(item=>item.type==='dirt'),
   feedback:document.getElementById('world-feedback')?.textContent
  }));
  assert.equal(poolResult.excavation?.depth,1,'A long-press must excavate the swimming-pool cell.');
  assert.equal(poolResult.dirt,true,'Pool digging must recover dirt into the Material Bucket.');

  // Measure real frame pacing on the emulated low-end mobile profile.
  const pacing=await page.evaluate(async()=>{
   const start=window.__DIYCRAFT_THREE_EDIT__?.frames||0,begin=performance.now();
   await new Promise(resolve=>setTimeout(resolve,1200));
   const end=window.__DIYCRAFT_THREE_EDIT__?.frames||0;
   return {fps:(end-start)/((performance.now()-begin)/1000),frames:end-start};
  });
  assert.ok(pacing.frames>3,'The mobile renderer must continue producing frames.');
  assert.ok(pacing.fps<=34,'The low-end mobile profile must respect its 30 FPS cap (with small timing tolerance).');
  if(errors.length)throw new Error('Mobile E2E browser errors:\n'+errors.join('\n\n'));
  console.log('DIYCraft mobile UI E2E passed: '+JSON.stringify({startup,pacing,modules:['inventory','character-studio','solid-designer','door-designer','tile-designer','art-studio','gallery','touch-controls','save-reload']}));
  await context.close();
 }finally{await browser.close();server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exitCode=1;});
