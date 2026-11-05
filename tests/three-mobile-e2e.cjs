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

  // Compact HUD: the settings dashboard is collapsed by default and retains all controls.
  const settingsPanel=page.locator('#settings-panel'),settingsToggle=page.locator('#settings-toggle');
  const openSettingsPanel=async()=>{if(!(await settingsPanel.isVisible()))await settingsToggle.click();};
  const togglePlayModeFromSettings=async()=>{await openSettingsPanel();await page.locator('#play-mode').click();};
  assert.equal(await settingsPanel.isVisible(),false,'The settings dashboard must start collapsed.');
  await settingsToggle.click();
  assert.equal(await settingsPanel.isVisible(),true,'The gear must open the settings dashboard.');
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
  await page.locator('#safety').click();
  assert.equal(await settingsPanel.isVisible(),false,'Tapping outside the settings dashboard must dismiss it without blocking the tapped target.');

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
  await page.locator('#solid-design-type').selectOption('stone');
  await page.locator('#solid-design-color').fill('#8b91a0');
  await page.locator('#solid-design-apply').click();
  assert.equal((await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getDesignStats?.().solidStyles?.stone?.color)),'#8b91a0');

  await openSettingsPanel();
  await page.locator('#door-design-open').click();
  await page.locator('#door-design-style').selectOption('window');
  await page.locator('#door-design-color').fill('#6d9f8a');
  await page.locator('#door-design-apply').click();
  assert.equal((await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getDesignStats?.().doorDesign?.style)),'window');

  await openSettingsPanel();
  await page.locator('#tile-design-open').click();
  await page.locator('#tile-design-pattern').selectOption('herringbone');
  await page.locator('#tile-design-color').fill('#c48b72');
  await page.locator('#tile-design-apply').click();
  assert.equal((await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getDesignStats?.().tileDesign?.pattern)),'herringbone');

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
  assert.equal(await settingsPanel.isVisible(),false,'Entering Play Mode must close the settings dashboard.');
  assert.equal(await page.locator('#player-controls').isVisible(),true,'The movement D-pad must appear in Play Mode.');
  assert.equal(await page.locator('#player-actions').isVisible(),true,'Jump/Fly controls must appear opposite the D-pad.');
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
  await page.locator('#flight').click();
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getPlayerState?.().flying),true,
   'The right-side Fly button must toggle flight on.');
  await page.locator('#flight').click();
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getPlayerState?.().flying),false,
   'The right-side Fly button must toggle flight off.');
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
