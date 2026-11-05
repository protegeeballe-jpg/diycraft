'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const adapter=require('../js/three-world-adapter.js');
function freshWorld(){
 const source=fs.readFileSync('diycraft.js','utf8');
 const start=source.indexOf('function freshWorld(){');
 const marker='\n}\n\nfunction validHex';
 const end=source.indexOf(marker,start);
 if(start<0||end<0)throw new Error('Could not locate production freshWorld().');
 return new Function('emptySlots','return ('+source.slice(start,end+2)+');')(()=>Array.from({length:60},()=>null))();
}
(async()=>{
 const world=freshWorld();world.excavations.push([100,100,2],[45,50,1],[55,60,1]);world.waterLevels.push([55,60,1]);
 world.animals=[
  {id:'pet-cat-1',species:'cat',name:'Mittens',x:1.5,z:1.5,facing:.2,phase:.4,body:'#c5c0b6',accent:'#d0b6a0'},
  {id:'pet-cat-2',species:'cat',name:'Buttons',x:2.5,z:1.5,facing:-.4,phase:1.3,body:'#c5c0b6',accent:'#d0b6a0'},
  {id:'pet-dog-1',species:'dog',name:'Buddy',x:3.5,z:1.5,facing:1.1,phase:2.1,body:'#c89b6d',accent:'#d0b6a0'},
  {id:'pet-bird-1',species:'bird',name:'Sunny',x:4.5,z:1.5,facing:0,phase:.9,body:'#e8c96d',accent:'#d0b6a0'},
  {id:'pet-giraffe-1',species:'giraffe',name:'Tallulah',x:5.5,z:1.5,facing:-.8,phase:1.7,body:'#d9ad55',accent:'#9a643d'},
  {id:'protection-dog-1',species:'dog',name:'Guard Buddy',x:45.5,z:50.5,facing:0,phase:.2,body:'#c89b6d',accent:'#d0b6a0'},
  {id:'protection-dog-2',species:'dog',name:'Guard Buddy Two',x:55.5,z:60.5,facing:0,phase:.4,body:'#c89b6d',accent:'#d0b6a0'}
 ];
 world.animalCare={...world.animalCare,sheep:4,'pet-cat-1':999};
 world.materials=[{id:'wood',count:4,label:''},{id:'seed',count:1,label:''},{id:'stone',count:1,label:''},{id:'bread',count:1,label:''},{id:'apple',count:1,label:''},...Array.from({length:55},()=>null)];
 const before=JSON.stringify(world),snapshot=adapter.createSnapshot(world);
 assert.equal(snapshot.counts.blocks,world.blocks.length);
 await fs.promises.mkdir('preview-three',{recursive:true});
 await fs.promises.writeFile('preview-three/starter-world.json',before,'utf8');
 const server=spawn('python3',['-m','http.server','4176','--bind','127.0.0.1'],{stdio:'ignore'});
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];
  await page.addInitScript(()=>{try{Object.defineProperty(navigator,'deviceMemory',{configurable:true,value:2});Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,value:4});}catch(_){}});
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://127.0.0.1:4176/three-world-edit-preview.html',{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>window.__DIYCRAFT_THREE_EDIT__?.frames>5,null,{timeout:30000});
  // Time-of-day selector and painterly sky preserve the original world palette.
  // Original pouches and recipe costs, kept inside the isolated sandbox.
  await page.locator('#inventory-open').click();
  assert.equal(await page.locator('#inventory-panel').isVisible(),true);
  assert.equal(await page.locator('[data-inventory-tab="materials"]').innerText(),'Resources · 60');
  assert.equal(await page.locator('#inventory-slots .inventory-slot').count(),60);
  let inventoryStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getInventoryStats());
  assert.equal(inventoryStats.materials[0].id,'wood');
  await page.locator('[data-inventory-tab="recipes"]').click();
  assert.equal(await page.locator('#inventory-recipes .inventory-recipe').count(),4);
  await page.locator('#inventory-recipes button').filter({hasText:'Craft Flower pot'}).click();
  inventoryStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getInventoryStats());
  assert.deepEqual(inventoryStats.materials.slice(0,2),[{id:'wood',count:3,label:''},null]);
  assert.deepEqual(inventoryStats.crafted[0],{id:'flowerpot',count:1,label:''});
  await page.locator('#inventory-recipes button').filter({hasText:'Craft Garden bench'}).click();
  inventoryStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getInventoryStats());
  assert.deepEqual(inventoryStats.materials[0],{id:'wood',count:1,label:''});
  assert.deepEqual(inventoryStats.crafted[1],{id:'bench',count:1,label:''});
  await page.locator('#inventory-recipes button').filter({hasText:'Craft Picture frame'}).click();
  await page.locator('#inventory-recipes button').filter({hasText:'Craft Picnic basket'}).click();
  inventoryStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getInventoryStats());
  assert.deepEqual(inventoryStats.crafted.slice(0,4).map(item=>item.id),['flowerpot','bench','picture','picnic']);
  assert.equal(inventoryStats.materials.slice(0,5).filter(Boolean).length,0);
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.sourceUnchanged),true);
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.storageKeys),0);
  await page.locator('[data-inventory-tab="crafted"]').click();
  assert.equal(await page.locator('#inventory-slots .inventory-slot').count(),60);
  await page.locator('[data-inventory-tab="bucket"]').click();
  assert.equal(await page.locator('#inventory-slots .inventory-slot').count(),0,'The empty bucket does not invent recovered items.');
  await page.locator('#inventory-close').click();

  const initialTimeMode=await page.locator('#time-mode').inputValue();
  assert.ok(['day','sunset','night','auto'].includes(initialTimeMode),'The preview must expose the saved world time mode.');
  await page.locator('#time-mode').selectOption('day');
  let timeStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getVisualTimeStats());
  assert.equal(timeStats.requestedMode,'day');
  assert.equal(timeStats.mode,'day');
  assert.deepEqual(timeStats.skyColors,['#8fc6e2','#d8e9d2','#b3d39a']);
  assert.equal(timeStats.starsVisible,false);
  assert.equal(timeStats.starCount,44);
  assert.ok(timeStats.skyVertexCount>100,'The sky gradient must be a reusable vertex-colored dome.');
  await page.locator('#time-mode').selectOption('sunset');
  timeStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getVisualTimeStats());
  assert.equal(timeStats.mode,'sunset');
  assert.deepEqual(timeStats.skyColors,['#a66e82','#e7a07e','#d7a77f']);
  await page.locator('#time-mode').selectOption('night');
  timeStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getVisualTimeStats());
  assert.equal(timeStats.mode,'night');
  assert.equal(timeStats.starsVisible,true,'Night must enable the single batched star field.');
  assert.deepEqual(timeStats.skyColors,['#14213d','#263858','#52606e']);
  await page.locator('#time-mode').selectOption('auto');
  const automaticModes=await page.evaluate(()=>{
   const api=window.__DIYCRAFT_THREE_EDIT__;
   const modes=[0,100,140].map(seconds=>api.setVisualTimeAtForTest(seconds).mode);
   api.releaseVisualTimeTest();
   return modes;
  });
  assert.deepEqual(automaticModes,['day','sunset','night'],'Automatic transitions must keep the original 180-second cycle boundaries.');
  const timeWorld=await page.evaluate(()=>({mode:window.__DIYCRAFT_THREE_EDIT__.getState().world.timeMode,
   sourceUnchanged:window.__DIYCRAFT_THREE_EDIT__.sourceUnchanged,storageKeys:window.__DIYCRAFT_THREE_EDIT__.storageKeys}));
  assert.equal(timeWorld.mode,'auto');
  assert.equal(timeWorld.sourceUnchanged,true,'Time changes must remain isolated from the original snapshot.');
  assert.equal(timeWorld.storageKeys,0,'Time changes must not write browser storage.');
  let state=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__);
  assert.equal(state.blockCount,world.blocks.length);
  assert.equal(state.sourceUnchanged,true);
  assert.equal(state.storageKeys,0);
  assert.equal(state.animalCount,7,'The adapter must retain all seven valid saved animals.');
  assert.equal(state.residentAnimalCount,7,'All seven original roaming residents must exist even in a fresh world.');
  assert.equal(state.totalAnimalCount,14,'Seven default residents and seven saved animals must coexist without duplicate identities.');
  assert.equal(state.renderedAnimalCount,12,'The low-end animal cap must prioritize all seven residents and the five nearest saved animals.');
  assert.ok(state.animalBatchCount>=7&&state.animalBatchCount<=11,'Identical species and colours must share instanced geometry batches.');
  let animalStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getAnimalStats());
  assert.equal(animalStats.animals.length,7,'Saved animal records must remain intact.');
  assert.equal(animalStats.residents.length,7,'Every built-in roaming animal must be available for rendering and picking.');
  assert.equal(animalStats.all.length,14,'The complete animal state must merge residents and saved records.');
  assert.equal(animalStats.rendered,12);
  assert.equal(animalStats.batches,state.animalBatchCount);
  assert.ok(animalStats.residents.every(animal=>Number.isFinite(animal.x)&&Number.isFinite(animal.z)&&animal.moving),
   'All seven default animals must preserve their original moving world positions.');
  const neighborStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getNeighborStats());
  assert.equal(neighborStats.total,7,'All seven original neighborhood characters must have 3D models.');
  assert.deepEqual(neighborStats.actors.map(actor=>actor.id),['hyacinth','theo','dad','mom','lia','maya','nico']);
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.neighborCount),7,'Each original resident must receive exactly one reusable 3D model.');
  assert.ok(neighborStats.actors.every(actor=>actor.position&&Math.abs(actor.position.x-actor.x)<1e-9&&Math.abs(actor.position.z-actor.z)<1e-9),
   'The rendered model roots must follow their obstacle-aware world-space route coordinates.');
  assert.deepEqual(neighborStats.actors.map(actor=>actor.hairStyle),['bob','pigtails','short','long','pigtails','bob','curly']);
  assert.deepEqual(neighborStats.actors.map(actor=>actor.outfitStyle),['hoodie','overalls','tee','dress','dress','overalls','hoodie']);
  assert.ok(neighborStats.actors.every(actor=>typeof actor.shirt==='string'&&actor.shirt.startsWith('#')));
  assert.ok(neighborStats.rendered>0&&neighborStats.rendered<=7,'Camera-distance culling must render nearby residents without removing their models.');
  const initialAnimalY=animalStats.firstY;

  // Animal selection must precede neighbor and block selection, matching Canvas 2D.
  const selectedBeforeAnimalTap=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState().selectedKey);
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.focusAnimalForTest('sheep')),true,
   'The original Pip resident must be focusable even when the save contains no sheep record.');
  const sheepPoint=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getAnimalScreenPoint('sheep'));
  assert.ok(sheepPoint&&sheepPoint.visible,'The default sheep must project to a tappable phone-screen position.');
  await page.mouse.click(sheepPoint.x,sheepPoint.y);
  await page.waitForFunction(()=>!document.getElementById('animal-care').hidden,null,{timeout:5000});
  assert.match(await page.locator('#animal-care-title').innerText(),/Care for Pip the sheep/);
  assert.match(await page.locator('#animal-care-note').innerText(),/Care activities together: 4/);
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState().selectedKey),selectedBeforeAnimalTap,
   'Tapping an animal must not accidentally select or edit a block.');
  await page.locator('[data-animal-care="snack"]').click();
  let careStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getAnimalCareStats());
  assert.equal(careStats.count,5);
  assert.match(await page.locator('#animal-care-feedback').innerText(),/Pip the sheep is happily nibbling/);
  await page.locator('[data-animal-care="water"]').click();
  careStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getAnimalCareStats());
  assert.equal(careStats.count,6);
  assert.match(await page.locator('#animal-care-feedback').innerText(),/Pip the sheep has had a lovely drink/);
  await page.waitForFunction(()=>{const el=document.getElementById('animal-care-flash');return !el.hidden&&el.textContent==='💧';},null,{timeout:1200});
  assert.equal(await page.locator('#animal-care-flash').innerText(),'💧',
   'The original 1.9-second care emoji must appear at the original species-specific head height.');
  await page.locator('#animal-care-close').click();
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getAnimalCareStats().open),false);
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getAnimalCareStats().flash),true,
   'The care emoji must remain visible immediately after closing the modal.');

  // Saved animals use the same care-only interaction; the original 999 cap is preserved.
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.focusAnimalForTest('pet-cat-1')),true);
  const savedCatPoint=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getAnimalScreenPoint('pet-cat-1'));
  assert.ok(savedCatPoint&&savedCatPoint.visible,'A saved animal must remain individually tappable.');
  await page.mouse.click(savedCatPoint.x,savedCatPoint.y);
  await page.waitForFunction(()=>!document.getElementById('animal-care').hidden,null,{timeout:5000});
  assert.match(await page.locator('#animal-care-title').innerText(),/Care for Mittens/);
  assert.match(await page.locator('#animal-care-note').innerText(),/Care activities together: 999/);
  await page.locator('[data-animal-care="play"]').click();
  careStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getAnimalCareStats());
  assert.equal(careStats.count,999,'The saved animal-care counter must retain the production maximum.');
  assert.match(await page.locator('#animal-care-feedback').innerText(),/Mittens is happily playing/);
  await page.locator('#animal-care-close').click();
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState().world.animalCare.sheep),6);
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState().world.animalCare['pet-cat-1']),999);
  state=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__);
  assert.equal(state.sourceUnchanged,true,'Animal care must mutate only the isolated clone.');
  assert.equal(state.storageKeys,0,'Animal care must never read/write localStorage.');
  let protectionState;
  const protectionContext=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getProtectionContext());
  assert.equal(protectionContext.neighbors.length,7,'Protection must include both individual neighbors and all five family members.');
  assert.ok(protectionContext.animals.some(a=>a.id==='protection-dog-1'),'Saved animals must contribute to live digging protection.');
  assert.ok(protectionContext.animals.some(a=>a.id==='protection-dog-2'&&a.x===55.5&&a.z===60.5),'The second saved animal and its exact cell position must reach the protection context.');
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.isProtectedDigCell(-14,-8)),true,'Fixed neighbor home rectangles must be protected.');
  const liveNeighbor=protectionContext.neighbors[0],neighborCell={x:Math.floor(liveNeighbor.x),z:Math.floor(liveNeighbor.z)};
  assert.equal(await page.evaluate(c=>window.__DIYCRAFT_THREE_EDIT__.isProtectedDigCell(c.x,c.z),neighborCell),true,'Current neighbor positions must be protected.');
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.isProtectedDigCell(45,50)),true,'A saved animal within 0.7 blocks must be protected.');
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.isProtectedDigCell(100,100)),false,'An unrelated remote cell remains editable.');
  const protectedRevision=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState().revision);
  await page.locator('#water-x').fill('-14');await page.locator('#water-z').fill('-8');
  await page.locator('#dig-ground').click();
  protectionState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(protectionState.revision,protectedRevision,'Digging inside a neighbor home must not change the world.');
  assert.match(await page.locator('#status').innerText(),/protected/i);
  await page.locator('#water-x').fill(String(neighborCell.x));await page.locator('#water-z').fill(String(neighborCell.z));
  await page.locator('#dig-ground').click();
  protectionState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(protectionState.revision,protectedRevision,'Digging next to a moving neighbor must be refused.');
  await page.locator('#water-x').fill('45');await page.locator('#water-z').fill('50');
  await page.locator('#water-add').click();
  protectionState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(protectionState.world.water.some(cell=>cell.x===45&&cell.z===50),false,'Water must not be added inside a protected animal area.');
  const collectProtection=await page.evaluate(()=>({context:window.__DIYCRAFT_THREE_EDIT__.getProtectionContext(),protected:window.__DIYCRAFT_THREE_EDIT__.isProtectedDigCell(55,60)}));
  assert.equal(collectProtection.protected,true,'The saved animal must protect its own pool cell before the collect button runs.');
  assert.ok(collectProtection.context.animals.some(a=>a.id==='protection-dog-2'&&a.x===55.5&&a.z===60.5));
  await page.locator('#water-x').fill('55');await page.locator('#water-z').fill('60');
  await page.locator('#water-collect').click();
  protectionState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(protectionState.world.water.some(cell=>cell.x===55&&cell.z===60),true,'Water must not be collected inside a protected animal area.');
  await page.locator('#block-type').selectOption('stone');
  await page.locator('#fill-hole').click();
  protectionState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(protectionState.world.water.some(cell=>cell.x===55&&cell.z===60),false,'The original unprotected hole-fill action must still clear its water.');

  // An actual sandbox edit must immediately detour the rendered 3D resident,
  // and removing that edit must restore the original route and visible model pose.
  const npcRevisionBaseline=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState().revision);
  const npcBaseline=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getNeighborStats(3.1).actors.find(actor=>actor.id==='hyacinth'));
  assert.ok(npcBaseline&&npcBaseline.position,'Hyacinth must have an initialized 3D model before the obstacle test.');
  const npcObstacle=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.debugPlaceObstacleForTest({type:'stone',x:-5,y:0,z:-8},3.1));
  assert.equal(npcObstacle.revision,npcRevisionBaseline+1,'A sandbox obstacle placement must advance the edit revision exactly once.');
  assert.equal(npcObstacle.sourceUnchanged,true,'Obstacle placement must not mutate the source snapshot.');
  const npcDetour=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getNeighborStats(3.1).actors.find(actor=>actor.id==='hyacinth'));
  assert.ok(Math.hypot(npcDetour.x-npcBaseline.x,npcDetour.z-npcBaseline.z)>.05,
   'The production obstacle-aware route must move Hyacinth away from the blocked direct path.');
  assert.ok(npcDetour.position&&Math.abs(npcDetour.position.x-npcDetour.x)<1e-9&&Math.abs(npcDetour.position.z-npcDetour.z)<1e-9,
   'The visible Three.js model must immediately follow the newly predicted obstacle detour.');
  const npcRemoval=await page.evaluate(key=>window.__DIYCRAFT_THREE_EDIT__.debugRemoveObstacleForTest(key,3.1),npcObstacle.key);
  assert.equal(npcRemoval.revision,npcRevisionBaseline+2,'Removing the test obstacle must advance the edit revision once more.');
  assert.equal(npcRemoval.sourceUnchanged,true);
  const npcRestored=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getNeighborStats(3.1).actors.find(actor=>actor.id==='hyacinth'));
  assert.deepEqual({x:npcRestored.x,z:npcRestored.z},{x:npcBaseline.x,z:npcBaseline.z},
   'Removing the obstacle must restore Hyacinth to the exact original production route position.');
  assert.deepEqual({x:npcRestored.position.x,z:npcRestored.position.z},{x:npcBaseline.position.x,z:npcBaseline.position.z},
   'The rendered model must return to its original route position after obstacle removal.');
  state=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__);


  await page.waitForTimeout(350);
  animalStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getAnimalStats());
  assert.ok(Math.abs(animalStats.firstY-initialAnimalY)>.0001,'Animals must retain their idle bobbing animation.');
  const blockRepresentation=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getBlockRepresentationStats());
  assert.equal(blockRepresentation.expectedCount,world.blocks.length+1,
   'The earlier pool-fill scenario must replace one excavated cell with exactly one stone block.');
  assert.equal(blockRepresentation.representedCount,blockRepresentation.expectedCount,
   'Every current sandbox block must be represented by a Three.js batch, plant mesh, or door model.');
  assert.deepEqual(blockRepresentation.missing,[],'No world block may disappear during batching or sandbox edits.');
  assert.deepEqual(blockRepresentation.duplicates,[],'No world block may be represented more than once.');
  assert.ok(state.instanceBatches>0&&state.instanceBatches<=60,'Solid blocks should be consolidated into a small number of instanced batches.');
  assert.ok(state.renderedMeshes<60,'The scene should use far fewer render objects than world blocks.');
  assert.equal(state.performanceProfile.tier,'low','The browser test must exercise the budget-device profile.');
  assert.equal(state.performanceProfile.maxPixelRatio,1);
  assert.equal(state.performanceProfile.antialias,false);
  assert.equal(state.performanceProfile.shadows,false);
  assert.ok(state.canvasSize.width<=390&&state.canvasSize.height<=844,'The interactive sandbox must clamp canvas resolution to the phone viewport instead of rendering at 3x device scale.');
  assert.equal(state.performanceProfile.waterAnimationFps,15,'Low-end water animation should use a lighter update cadence.');
  let playerState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getPlayerState());
  assert.ok(playerState&&playerState.player,'The 3D sandbox must initialize the saved player appearance and pose.');
  const playerStartZ=playerState.player.z;
  await page.locator('#play-mode').click();
  state=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__);
  assert.equal(state.playerMode,true,'The isolated Play Mode must activate.');
  await page.evaluate(()=>{if(document.activeElement&&document.activeElement!==document.body)document.activeElement.blur();});
  assert.equal(await page.evaluate(()=>document.activeElement===document.body),true,
   'Keyboard movement starts with page focus, not a form control that intentionally consumes WASD.');
  await page.keyboard.down('w');
  await page.waitForFunction(startZ=>window.__DIYCRAFT_THREE_EDIT__.getPlayerState().player.z<startZ-.35,playerStartZ,{timeout:1600});
  await page.keyboard.up('w');
  playerState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getPlayerState());
  assert.ok(playerState.player.z<playerStartZ-.35,'Keyboard movement must advance the player forward at the production walk speed.');
  await page.locator('#camera-mode').click();
  state=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__);
  assert.equal(state.cameraMode,'first','The camera control must switch into first-person mode.');
  let playerCamera=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getPlayerCamera());
  assert.ok(Math.abs(playerCamera.pos.y-playerState.player.y-1.58)<1e-6,'First-person view must use the original 1.58-block eye height.');
  await page.locator('#camera-mode').click();
  state=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__);
  assert.equal(state.cameraMode,'third','The camera control must return to third-person mode.');
  await page.waitForFunction(()=>window.__DIYCRAFT_THREE_EDIT__.getPlayerState()?.playerGrounded===true,null,{timeout:3000});
  playerState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getPlayerState());
  const beforeJump=playerState.player.y;
  await page.locator('#jump').click();
  const jumpStart=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getPlayerState());
  assert.ok(jumpStart.jumpVelocity>0&&!jumpStart.playerGrounded,'The jump button must be accepted by the grounded player-physics state.');
  await page.waitForFunction(start=>{
   const state=window.__DIYCRAFT_THREE_EDIT__.getPlayerState();
   return state.player.y>start+.35&&!state.playerGrounded;
  },beforeJump,{timeout:3000});
  playerState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getPlayerState());
  assert.ok(playerState.player.y>beforeJump+.35&&!playerState.playerGrounded,'Jump must produce a visible upward arc.');
  await page.waitForFunction(()=>{
   const state=window.__DIYCRAFT_THREE_EDIT__.getPlayerState();
   return state.playerGrounded&&Math.abs(state.player.y)<.02;
  },null,{timeout:3500});
  playerState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getPlayerState());
  assert.ok(playerState.playerGrounded&&Math.abs(playerState.player.y)<.02,'The player must land back on the ground after a complete jump.');
  const beforeFlight=playerState.player.y;
  await page.locator('#flight').click();
  await page.keyboard.down('Space');
  await page.waitForTimeout(200);
  await page.keyboard.up('Space');
  playerState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getPlayerState());
  assert.ok(playerState.flying&&playerState.player.y>beforeFlight+.5,'Flight mode must move the player upward while Space is held.');
  await page.locator('#flight').click();
  await page.waitForTimeout(900);
  playerState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getPlayerState());
  assert.ok(!playerState.flying&&playerState.playerGrounded&&Math.abs(playerState.player.y)<.02,'Turning flight off must return normal gravity and ground contact.');
  const touchForward=await page.locator('[data-move="forward"]').boundingBox();
  await page.mouse.move(touchForward.x+touchForward.width/2,touchForward.y+touchForward.height/2);
  await page.mouse.down();await page.waitForTimeout(220);await page.mouse.up();
  playerState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getPlayerState());
  assert.ok(playerState.player.z<playerStartZ-.55,'The on-screen touch pad must move the player on a phone viewport.');
  await page.locator('#play-mode').click();
  state=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__);
  assert.equal(state.playerMode,false,'The editor must return to Build Mode without reloading the world.');
  assert.equal(state.sourceUnchanged,true);
  assert.equal(state.storageKeys,0);
  const frameStart=state.frames;
  await page.waitForTimeout(650);
  state=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__);
  const renderedFrameDelta=state.frames-frameStart;
  console.log('Low-end WebGL render sample: '+renderedFrameDelta+' rendered frames in 650 ms; configured cap '+state.performanceProfile.fpsCap+' FPS.');
  assert.ok(renderedFrameDelta>0&&renderedFrameDelta<=25,'The low-end renderer must advance while staying within its 30 FPS cap.');
  assert.ok(state.drawCalls>0&&state.drawCalls<=45,'The initial world must stay within a conservative draw-call budget on a low-end profile.');
  assert.ok(state.geometryCount<100,'The preview must not allocate an excessive number of GPU geometries.');
  assert.ok(state.textureCount<40,'Painterly material textures must remain cached and bounded.');
  const keys=snapshot.blocks.map(b=>b.key);
  let selected=false;
  for(const key of keys){
   await page.evaluate(k=>window.__DIYCRAFT_THREE_EDIT__.pickBlock(k),key);
   // Animal care intentionally has priority over block selection. Close an
   // animal panel if a projected block tap lands on an animal, then keep
   // searching for a genuinely selected block before testing placement.
   if(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getAnimalCareStats().open))
    await page.locator('#animal-care-close').click();
   await page.waitForTimeout(30);
   state=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__);
   const canPlace=await page.evaluate(()=>{const d=window.__DIYCRAFT_THREE_EDIT__,s=d.getState(),b=s.world.blocks.find(v=>v.key===s.selectedKey),p=d.lastPlacement;if(!b||!p)return false;const x=b.x+p.step[0],y=b.y+p.step[1],z=b.z+p.step[2];return !s.world.blocks.some(v=>v.x===x&&v.y===y&&v.z===z);});
   if(state.selectedKey&&canPlace){selected=true;break;}
  }
  assert.ok(selected,'A real projected block click should select a scene object.');
  const selectedBefore=state.selectedKey;
  const selectedBlockBefore=await page.evaluate(()=>{const s=window.__DIYCRAFT_THREE_EDIT__.getState();return s.world.blocks.find(b=>b.key===s.selectedKey);});
  assert.ok(state.lastPlacement&&state.lastPlacement.key===selectedBefore,'Raycast selection must retain the clicked face normal.');
  await page.locator('#block-type').selectOption('stone');
  await page.locator('#add').click();
  let worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(worldState.world.blocks.length,world.blocks.length+2,'The earlier protection scenario also fills one cleared pool cell.');
  const addedStone=worldState.world.blocks.at(-1);
  assert.equal(addedStone.type,'stone');
  const faceDistance=Math.abs(addedStone.x-selectedBlockBefore.x)+Math.abs(addedStone.y-selectedBlockBefore.y)+Math.abs(addedStone.z-selectedBlockBefore.z);
  assert.equal(faceDistance,1,'New blocks must be placed in the cell adjacent to the clicked 3D face.');
  await page.locator('#remove').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(worldState.world.blocks.length,world.blocks.length+1,'Removing the test block must retain the protection-fixture fill.');
  assert.equal(worldState.world.blocks.some(b=>b.key===addedStone.key),false);
  assert.equal(worldState.world.bucket.length,2,
   'The NPC obstacle removal and this block removal must each recover one stone into the Material Bucket.');
  assert.equal(worldState.world.bucket[0].type,'stone','The earlier NPC obstacle must remain recovered in the first slot.');
  assert.equal(worldState.world.bucket[1].type,'stone','The newly removed block must be recovered in the next slot.');
  const recoveredStone={...worldState.world.bucket[1]};
  await page.locator('#bucket-item').selectOption('1');
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.deepEqual(worldState.selectedBucketItem,recoveredStone,'Selecting a bucket slot must retain its recovered appearance data.');
  assert.equal(await page.locator('#block-type').inputValue(),'stone','Selecting a recovered item must select its block type.');
  await page.locator('#add').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  const reusedStone=worldState.world.blocks.at(-1);
  assert.equal(reusedStone.type,'stone');
  assert.equal(reusedStone.color,recoveredStone.color);
  assert.equal(reusedStone.texture,recoveredStone.texture);
  assert.equal(worldState.world.bucket.length,2,'Placing a recovered item must leave both recovered items available for reuse.');
  await page.locator('#block-type').selectOption('door');
  await page.locator('#door-style').selectOption('window');
  await page.locator('#add').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  const door=worldState.world.blocks.at(-1);
  assert.equal(door.type,'door');
  assert.equal(door.style,'window','The selected door style must be saved in the sandbox world.');
  const doorVisual=await page.evaluate(key=>window.__DIYCRAFT_THREE_EDIT__.getDoorVisualStats(key),door.key);
  assert.equal(doorVisual.style,'window');
  assert.equal(doorVisual.textureKind,'door-window');
  assert.equal(doorVisual.hasPainterlyMap,true,'Window door must use its own watercolor/pencil material map.');
  assert.ok(doorVisual.textureWidth>=64&&doorVisual.textureHeight>=64);
  assert.ok(doorVisual.styleSample.b>doorVisual.styleSample.r,'The window inset must retain its blue watercolor glass color.');
  const styleSamples=await page.evaluate(()=>{
   const api=window.DIYCraftPainterlyMaterials;
   const sample=(style,x,y)=>{
    const canvas=api.generateCanvas('#a97545',123,'door-'+style,{textureSize:128,pencilScale:.72}),ctx=canvas.getContext('2d');
    const px=Math.round(x/.84*canvas.width),py=Math.round((1.96-y)/1.96*canvas.height),p=ctx.getImageData(px,py,1,1).data;
    return {style,r:p[0],g:p[1],b:p[2],width:canvas.width,height:canvas.height};
   };
   return {window:sample('window',.42,1.38),garden:sample('garden',.43,1.43),classic:sample('classic',.43,1.43)};
  });
  assert.ok(styleSamples.window.b>styleSamples.window.r,'Window style must contain blue glass.');
  assert.ok(styleSamples.garden.r>styleSamples.garden.g&&styleSamples.garden.g>styleSamples.garden.b,'Garden style must contain its warm yellow flower centre.');
  assert.ok(styleSamples.classic.width===128&&styleSamples.classic.height===128,'Classic style must retain the same low-end painterly texture dimensions.');
  assert.equal(doorVisual.pivot.x,door.x+.08);
  assert.equal(doorVisual.pivot.z,door.z+.5);
  await page.locator('#door').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(worldState.world.blocks.find(b=>b.key===door.key).open,true);
  await page.waitForTimeout(80);
  const openingAngle=await page.evaluate(key=>window.__DIYCRAFT_THREE_EDIT__.getDoorAngle(key),door.key);
  assert.ok(openingAngle>0.02&&openingAngle<1.32,'Door should be visibly partway through its opening animation.');
  await page.waitForTimeout(220);
  const openedAngle=await page.evaluate(key=>window.__DIYCRAFT_THREE_EDIT__.getDoorAngle(key),door.key);
  assert.ok(Math.abs(openedAngle-1.32)<0.01,'Door should finish at the production open angle.');
  await page.locator('#door').click();
  await page.waitForTimeout(80);
  const closingAngle=await page.evaluate(key=>window.__DIYCRAFT_THREE_EDIT__.getDoorAngle(key),door.key);
  assert.ok(closingAngle>0.02&&closingAngle<openedAngle,'Door should smoothly reverse into its closing animation.');
  await page.waitForTimeout(220);
  const closedAngle=await page.evaluate(key=>window.__DIYCRAFT_THREE_EDIT__.getDoorAngle(key),door.key);
  assert.ok(Math.abs(closedAngle)<0.01,'Door should finish at the closed angle.');
  await page.locator('#block-type').selectOption('tile');
  await page.locator('#add').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  const tile=worldState.world.blocks.at(-1);
  assert.equal(tile.type,'tile');
  const expectedPatterns=['grid','brick','checker','diagonal','diamond','hexagon','herringbone','basket','mosaic','terrazzo','waves','dots','floral','stars','sunburst','scallop','parquet','pebble','cross','spiral'];
  const availablePatterns=await page.locator('#pattern option').evaluateAll(options=>options.map(option=>option.value));
  assert.deepEqual(availablePatterns,expectedPatterns,'The editor must expose all twenty original tile patterns.');
  for(const pattern of expectedPatterns){
   await page.locator('#pattern').selectOption(pattern);
   await page.locator('#apply-pattern').click();
   worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
   assert.equal(worldState.world.blocks.find(b=>b.key===tile.key).tilePattern,pattern,'Tile pattern must remain editable: '+pattern);
  }
  await page.locator('#water-x').fill('100');
  await page.locator('#water-z').fill('100');
  await page.locator('#water-add').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.deepEqual(worldState.world.water,[{x:100,z:100,level:1,depth:2}],'Water must be created as one layer in the dug pool cell.');
  let waterStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getWaterStats());
  assert.equal(waterStats.cells,1);
  assert.equal(waterStats.waterVertices,4,'The water surface must be represented by a rendered 3D mesh.');
  await page.locator('#fish-add').click();
  await page.locator('#fish-add').click();
  await page.locator('#fish-add').click();
  waterStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getWaterStats());
  assert.equal(waterStats.fish,3);
  assert.equal(waterStats.renderedFish,3,'Fish should be visible in the water.');
  const initialWaterY=waterStats.surfaceY,initialFishAngle=waterStats.fishAngle;
  await page.waitForTimeout(350);
  waterStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getWaterStats());
  assert.ok(Math.abs(waterStats.surfaceY-initialWaterY)>0.0001,'Water surface vertices must continue to move.');
  const fishAngleDelta=Math.atan2(Math.sin(waterStats.fishAngle-initialFishAngle),Math.cos(waterStats.fishAngle-initialFishAngle));
  assert.ok(Math.abs(fishAngleDelta)>.02,'Fish instances must continue swimming in the water.');
  await page.screenshot({path:'preview-three/three-water-fish-sandbox.png'});
  await page.locator('#fish-add').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(worldState.world.fish.length,3,'A fourth fish in the same water cell must be rejected.');
  await page.locator('#water-add').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(worldState.world.water[0].level,2,'Water must stack one layer at a time up to excavation depth.');
  await page.locator('#water-add').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(worldState.world.water[0].level,2,'A full cell must reject an additional water layer.');
  await page.locator('#water-collect').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(worldState.world.water[0].level,1);
  assert.equal(worldState.world.fish.length,3,'Fish remain while the cell still contains water.');
  await page.locator('#water-collect').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(worldState.world.water.length,0,'Collecting the last water layer empties the pool cell.');
  assert.equal(worldState.world.fish.length,0,'Collecting the last layer removes fish exactly as in Canvas 2D.');
  assert.equal(worldState.world.bucket.filter(item=>item.type==='water').length,2,'Each collected water layer must be recovered into the Material Bucket.');
  waterStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getWaterStats());
  assert.equal(waterStats.waterVertices,0,'The water mesh must be removed when the final layer is collected.');
  assert.equal(waterStats.renderedFish,0,'Fish meshes must be removed with the final water layer.');
  await page.locator('#water-add').click();
  await page.locator('#fish-add').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(worldState.world.water[0].level,1);
  assert.equal(worldState.world.fish.length,1);
  const bucketBeforeFill=worldState.world.bucket.length;
  await page.locator('#block-type').selectOption('dirt');
  await page.locator('#fill-hole').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  const filledBlocks=worldState.world.blocks.filter(block=>block.x===100&&block.z===100).sort((a,b)=>a.y-b.y);
  assert.deepEqual(filledBlocks.map(block=>block.y),[-2,-1],'Filling the pool must replace each dug layer with a block.');
  assert.ok(filledBlocks.every(block=>block.type==='dirt'));
  assert.equal(worldState.world.excavations.some(cell=>cell.x===100&&cell.z===100),false,'Filled pool must no longer be recorded as an excavation.');
  assert.equal(worldState.world.water.some(cell=>cell.x===100&&cell.z===100),false,'Filling a pool must remove its water surfaces.');
  assert.equal(worldState.world.fish.some(fish=>fish.x===100&&fish.z===100),false,'Filling a pool must remove fish from that cell.');
  assert.equal(worldState.world.bucket.length,bucketBeforeFill,'Filling a pool removes water/fish without recovering additional bucket items.');
  waterStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getWaterStats());
  assert.equal(waterStats.waterVertices,0);
  assert.equal(waterStats.renderedFish,0);
  await page.locator('#water-x').fill('101');
  await page.locator('#water-z').fill('100');
  await page.locator('#dig-ground').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.deepEqual(worldState.world.excavations.find(cell=>cell.x===101&&cell.z===100),{x:101,z:100,depth:1});
  assert.equal(worldState.world.bucket.filter(item=>item.type==='dirt').length,1,'Digging one layer recovers one dirt block into the Material Bucket.');
  assert.deepEqual(worldState.world.materials.find(item=>item&&item.id==='dirt'),{id:'dirt',count:1,label:''},'Digging adds one dirt to the materials pouch.');
  await page.locator('#dig-ground').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.deepEqual(worldState.world.excavations.find(cell=>cell.x===101&&cell.z===100),{x:101,z:100,depth:2});
  assert.equal(worldState.world.bucket.filter(item=>item.type==='dirt').length,2);
  assert.deepEqual(worldState.world.materials.find(item=>item&&item.id==='dirt'),{id:'dirt',count:2,label:''});

  // Tap a real projected resident in the phone browser. The same hit test used by
  // ordinary canvas interaction must open coloring before block raycasting.
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.focusNeighborForTest('lia')),true);
  const liaPoint=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getNeighborScreenPoint('lia'));
  assert.ok(liaPoint&&liaPoint.visible,'The focused resident should be inside the mobile viewport.');
  await page.mouse.click(liaPoint.x,liaPoint.y);
  await page.waitForFunction(()=>!document.getElementById('neighbor-coloring').hidden,null,{timeout:5000});
  assert.match(await page.locator('#neighbor-color-note').innerText(),/Lia is sitting beside you/);
  assert.equal(await page.locator('#neighbor-color-templates [data-color-page]').count(),6,'All six original coloring sheets must be available.');
  await page.locator('[data-color-page="flower"]').click();
  await page.waitForFunction(()=>parseFloat(document.getElementById('neighbor-color-progress-fill').style.width)>0,null,{timeout:8000});
  await page.waitForFunction(()=>document.getElementById('neighbor-color-progress-fill').style.width==='100%',null,{timeout:12000});
  let flowerPixel=await page.evaluate(()=>{
   const data=document.getElementById('neighbor-color-canvas').getContext('2d').getImageData(320,112,1,1).data;
   return Array.from(data);
  });
  assert.deepEqual(flowerPixel,[244,182,203,255],'The resident must reproduce their original first flower-petal color.');
  await page.locator('#neighbor-color-brush-tool').click();
  await page.locator('#neighbor-color-color').fill('#4c8d59');
  const colorCanvasBox=await page.locator('#neighbor-color-canvas').boundingBox();
  const brushStart={x:colorCanvasBox.x+colorCanvasBox.width*(60/640),y:colorCanvasBox.y+colorCanvasBox.height*(42/460)};
  const brushEnd={x:colorCanvasBox.x+colorCanvasBox.width*(125/640),y:brushStart.y};
  await page.mouse.move(brushStart.x,brushStart.y);await page.mouse.down();
  await page.mouse.move(brushEnd.x,brushEnd.y,{steps:5});await page.mouse.up();
  let brushPixel=await page.evaluate(()=>{
   const data=document.getElementById('neighbor-color-canvas').getContext('2d').getImageData(90,42,1,1).data;
   return Array.from(data);
  });
  assert.deepEqual(brushPixel,[76,141,89,255],'The freehand brush must paint the selected player color.');
  await page.locator('#neighbor-color-undo').click();
  brushPixel=await page.evaluate(()=>{
   const data=document.getElementById('neighbor-color-canvas').getContext('2d').getImageData(90,42,1,1).data;
   return Array.from(data);
  });
  assert.deepEqual(brushPixel,[255,253,248,255],'Undo must restore the exact uncolored paper pixel.');
  await page.locator('#neighbor-color-save').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(worldState.world.artworks.length,1,'Saving the shared picture must add one gallery artwork.');
  assert.equal(worldState.world.artworks[0].name,'Big happy flower with Lia');
  assert.match(worldState.world.artworks[0].data,/^data:image\/png;base64,/);
  const craftedPicture=worldState.world.crafted.find(item=>item&&item.id==='picture');
  assert.ok(craftedPicture,'Saving the gallery picture must use the original crafted-pouch picture item.');
  assert.equal(craftedPicture.count,2,
   'The existing recipe-crafted picture stack must increment when the shared artwork is saved.');
  assert.equal(craftedPicture.label,'',
   'The original addItem() behavior merges by item ID and retains the existing stack label.');
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getNeighborColoringStats().open),false,
   'Saving should close the shared coloring panel.');
  // Character Studio must use the original appearance controls/presets while changing
  // only the sandbox player's appearance and keeping its one-mesh renderer budget.
  await page.locator('#character-open').click();
  await page.waitForFunction(()=>window.__DIYCRAFT_THREE_EDIT__.characterOpen(),null,{timeout:3000});
  await page.locator('[data-character-look="sunshine"]').click();
  assert.equal(await page.locator('#character-hair-style').inputValue(),'pigtails');
  assert.equal(await page.locator('#character-outfit-style').inputValue(),'overalls');
  assert.equal(await page.locator('#character-accessory').inputValue(),'glasses');
  await page.locator('#character-hair-style').selectOption('curly');
  await page.locator('#character-outfit-style').selectOption('tee');
  await page.locator('#character-accessory').selectOption('cap');
  await page.locator('#character-hair-color').fill('#123456');
  await page.locator('#character-shirt-color').fill('#765432');
  await page.locator('#character-accessory-color').fill('#abcdef');
  await page.locator('#character-apply').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(worldState.world.player.hairStyle,'curly');
  assert.equal(worldState.world.player.outfitStyle,'tee');
  assert.equal(worldState.world.player.accessory,'cap');
  assert.equal(worldState.world.player.hair,'#123456');
  assert.equal(worldState.world.player.shirt,'#765432');
  assert.equal(worldState.world.player.accessoryColor,'#abcdef');
  const characterStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getCharacterStats());
  assert.equal(characterStats.meshCount,1,'Character Studio must rebuild only one painterly player mesh.');
  assert.ok(characterStats.vertexCount>0,'The updated player appearance must have renderable merged geometry.');
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.characterOpen()),false);
  // Art Studio saves production-compatible PNG data and the Gallery reads the saved artwork.
  await page.locator('#art-open').click();
  await page.locator('#art-name').fill('Onnea flower');
  const artBounds=await page.locator('#art-canvas').boundingBox();
  await page.mouse.move(artBounds.x+70,artBounds.y+70);
  await page.mouse.down();
  await page.mouse.move(artBounds.x+190,artBounds.y+125,{steps:6});
  await page.mouse.up();
  await page.locator('#art-save').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(worldState.world.artworks.length,2,'Art Studio must append one PNG to the saved gallery.');
  assert.equal(worldState.world.artworks[1].name,'Onnea flower');
  assert.match(worldState.world.artworks[1].data,/^data:image\/png;base64,/);
  const pictureStack=worldState.world.crafted.find(item=>item&&item.id==='picture');
  assert.equal(pictureStack.count,3,'Art Studio must increment the existing crafted picture stack.');
  assert.equal(pictureStack.label,'','Standalone Art Studio pictures use the original blank crafted-item label.');
  await page.locator('#gallery-open').click();
  await page.waitForFunction(()=>window.__DIYCRAFT_THREE_EDIT__.galleryOpen(),null,{timeout:3000});
  assert.equal(await page.locator('#gallery-artworks .gallery-card').count(),2);
  assert.equal(await page.locator('#gallery-artworks img').count(),2);
  assert.equal(await page.locator('#gallery-artworks .gallery-card strong').nth(1).innerText(),'Onnea flower');
  const galleryStats=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getGalleryStats());
  assert.equal(galleryStats.artworks.length,2);
  await page.locator('#gallery-close').click();
  assert.equal(await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.galleryOpen()),false);


  state=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__);
  assert.equal(state.sourceUnchanged,true,'Sandbox operations must not mutate the renderer snapshot.');
  assert.equal(state.storageKeys,0,'Sandbox must not access browser storage.');
  assert.equal(JSON.stringify(world),before,'Production starter-world fixture must remain unchanged.');
  if(errors.length)throw new Error('Browser errors:\n'+errors.join('\n\n'));
  await page.screenshot({path:'preview-three/three-edit-sandbox.png'});
  console.log('Interactive Three.js sandbox passed: '+JSON.stringify({selectedBefore,blocks:worldState.world.blocks.length,revision:worldState.revision,storageKeys:state.storageKeys,sourceUnchanged:state.sourceUnchanged}));
  await context.close();
 }finally{await browser.close();server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exitCode=1;});
