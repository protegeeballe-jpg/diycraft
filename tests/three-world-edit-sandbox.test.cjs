'use strict';
const assert=require('node:assert/strict');
globalThis.DIYCraftThreeWorldProtection=require('../js/three-world-protection.js');
const sandbox=require('../js/three-world-edit-sandbox.js');
function test(name,fn){
 try{fn();console.log('PASS '+name);}
 catch(error){console.error('FAIL '+name+'\n'+(error.stack||error));process.exitCode=1;}
}
function fixture(){
 return {
  source:'diycraft-world-v1',name:'Sandbox garden',
  blocks:[
   {key:'block-0',type:'grass',x:0,y:0,z:0,color:'#70b85a'},
   {key:'block-1',type:'door',x:1,y:0,z:0,color:'#a97545',style:'garden',orientation:'ew',swing:-1,open:false},
   {key:'block-2',type:'tile',x:2,y:0,z:0,color:'#C5A98A',tilePattern:'spiral'}
  ],
  player:{x:0,y:0,z:4,yaw:1.4},customBlock:{color:'#aa83d8',texture:'custom'},
  doorDesign:{color:'#a97545',style:'garden'},tileDesign:{color:'#c5a98a',pattern:'spiral'},
  solidStyles:{stone:{color:'#334455',texture:'brick'}},excavations:[{x:8,z:8,depth:2}],counts:{blocks:3}
 };
}
test('clones snapshot and exposes immutable state without mutating source',()=>{
 const source=fixture(),before=JSON.stringify(source),edit=sandbox.create(source),state=edit.getState();
 assert.equal(JSON.stringify(source),before);
 assert.equal(state.world.blocks.length,3);
 assert.ok(Object.isFrozen(state));
 assert.ok(Object.isFrozen(state.world.blocks));
 assert.equal(state.sourceUnchanged,true);
});
test('changes only the isolated sandbox time mode and rejects invalid values atomically',()=>{
 const source=fixture(),before=JSON.stringify(source),edit=sandbox.create(source);
 const initial=edit.getState();
 for(const [index,mode] of ['day','sunset','night','auto'].entries()){
  const next=edit.setTimeMode(mode);
  assert.equal(next.world.timeMode,mode);
  assert.ok(Object.isFrozen(next));
  assert.equal(next.revision,initial.revision+index+1);
 }
 const after=edit.getState();
 assert.throws(()=>edit.setTimeMode('midnight'),/Choose day/);
 assert.equal(edit.getState().revision,after.revision);
 assert.equal(JSON.stringify(source),before,'Time-mode changes must not mutate the original snapshot.');
 assert.equal(after.sourceUnchanged,true);
});
test('crafts all four original recipes and consumes material stacks exactly',()=>{
 const world=fixture();
 world.materials=[
  {id:'wood',count:4,label:''},{id:'seed',count:1,label:''},{id:'stone',count:1,label:''},
  {id:'bread',count:1,label:''},{id:'apple',count:1,label:''},
  ...Array.from({length:55},()=>null)
 ];
 const before=JSON.stringify(world),edit=sandbox.create(world);
 assert.deepEqual(sandbox.recipes.map(recipe=>recipe.id),['flowerpot','bench','picture','picnic']);
 let state=edit.craftRecipe('flowerpot');
 assert.deepEqual(state.world.materials.slice(0,2),[{id:'wood',count:3,label:''},null]);
 assert.deepEqual(state.world.crafted[0],{id:'flowerpot',count:1,label:''});
 state=edit.craftRecipe('bench');
 assert.deepEqual(state.world.materials[0],{id:'wood',count:1,label:''});
 assert.deepEqual(state.world.crafted[1],{id:'bench',count:1,label:''});
 state=edit.craftRecipe('picture');
 assert.equal(state.world.materials[0],null,'The picture frame consumes the final wood piece.');
 assert.equal(state.world.materials[2],null);
 assert.deepEqual(state.world.crafted[2],{id:'picture',count:1,label:''});
 state=edit.craftRecipe('picnic');
 assert.deepEqual(state.world.materials.slice(3,5),[null,null]);
 assert.deepEqual(state.world.crafted[3],{id:'picnic',count:1,label:''});
 assert.equal(state.sourceUnchanged,true);
 assert.equal(JSON.stringify(world),before,'Crafting must mutate only the isolated sandbox clone.');
});
test('refuses insufficient materials or a full crafted pouch without partial consumption',()=>{
 const short=fixture();short.materials=[{id:'wood',count:1,label:''},...Array.from({length:59},()=>null)];
 const edit=sandbox.create(short),before=edit.getState();
 assert.throws(()=>edit.craftRecipe('flowerpot'),/Collect the listed materials/);
 assert.deepEqual(edit.getState().world.materials,before.world.materials);
 assert.equal(edit.getState().revision,before.revision);
 const full=fixture();
 full.materials=[{id:'wood',count:2,label:''},...Array.from({length:59},()=>null)];
 full.crafted=Array.from({length:60},(_,index)=>({id:'item-'+index,count:1,label:''}));
 const fullEdit=sandbox.create(full),fullBefore=fullEdit.getState();
 assert.throws(()=>fullEdit.craftRecipe('bench'),/crafted pouch is full/);
 assert.deepEqual(fullEdit.getState().world.materials,fullBefore.world.materials);
 assert.deepEqual(fullEdit.getState().world.crafted,fullBefore.world.crafted);
 assert.equal(fullEdit.getState().revision,fullBefore.revision);
 assert.throws(()=>fullEdit.craftRecipe('unknown'),/supported recipe/);
});
test('stacks crafted outputs to ninety-nine then uses a free slot',()=>{
 const world=fixture();
 world.materials=[{id:'wood',count:100,label:''},...Array.from({length:59},()=>null)];
 world.crafted=[{id:'bench',count:98,label:''},...Array.from({length:59},()=>null)];
 const edit=sandbox.create(world);
 let state=edit.craftRecipe('bench');
 assert.deepEqual(state.world.crafted[0],{id:'bench',count:99,label:''});
 state=edit.craftRecipe('bench');
 assert.deepEqual(state.world.crafted[0],{id:'bench',count:99,label:''});
 assert.deepEqual(state.world.crafted[1],{id:'bench',count:1,label:''});
});
test('selects only existing block keys',()=>{
 const edit=sandbox.create(fixture());
 assert.equal(edit.select('block-1').selectedKey,'block-1');
 assert.equal(edit.select('missing').selectedKey,null);
});
test('adds supported block types in empty cells and preserves exact supplied colors',()=>{
 const edit=sandbox.create(fixture());
 const state=edit.addBlock({type:'custom',x:3,y:0,z:0,color:'#Aa83D8',texture:'flower'});
 assert.equal(state.world.blocks.length,4);
 assert.equal(state.world.blocks[3].color,'#Aa83D8');
 assert.equal(state.world.blocks[3].texture,'flower');
 assert.equal(state.selectedKey,state.world.blocks[3].key);
 assert.equal(state.revision,1);
});
test('rejects occupied cells, invalid coordinates, unsupported types and invalid custom colors',()=>{
 const edit=sandbox.create(fixture());
 assert.throws(()=>edit.addBlock({type:'stone',x:0,y:0,z:0}),/occupied/);
 assert.throws(()=>edit.addBlock({type:'stone',x:1.5,y:0,z:2}),/coordinates/);
 assert.throws(()=>edit.addBlock({type:'lava',x:3,y:0,z:0}),/Unsupported/);
 assert.throws(()=>edit.addBlock({type:'custom',x:3,y:0,z:0,color:'purple'}),/color/);
 assert.equal(edit.getState().world.blocks.length,3);
 assert.equal(edit.getState().revision,0);
});
test('removes a selected block and frees its cell for reuse',()=>{
 const edit=sandbox.create(fixture());
 edit.select('block-0');
 const removed=edit.remove('block-0');
 assert.equal(removed.world.blocks.length,2);
 assert.equal(removed.selectedKey,null);
 const added=edit.addBlock({type:'stone',x:0,y:0,z:0,color:'#9ca6a1'});
 assert.equal(added.world.blocks.length,3);
});
test('removes blocks into the Material Bucket and frees door clearance',()=>{
 const edit=sandbox.create(fixture());
 const removedGrass=edit.remove('block-0');
 assert.equal(removedGrass.world.blocks.length,2);
 assert.deepEqual(removedGrass.world.bucket[0],{type:'grass',color:'#70b85a',texture:'grass'});
 const removedDoor=edit.remove('block-1');
 assert.equal(removedDoor.world.bucket[1].type,'door');
 assert.equal(removedDoor.world.bucket[1].style,'garden');
 const added=edit.addBlock({type:'stone',x:1,y:1,z:0});
 assert.equal(added.world.blocks.at(-1).y,1);
});
test('refuses removal when the Material Bucket is full without changing the world',()=>{
 const world=fixture();world.bucket=Array.from({length:120},()=>({type:'stone'}));
 const sourceBefore=JSON.stringify(world),edit=sandbox.create(world),before=edit.getState();
 assert.throws(()=>edit.remove('block-0'),/Material Bucket is full/);
 const after=edit.getState();
 assert.equal(after.world.blocks.length,before.world.blocks.length);
 assert.equal(after.world.bucket.length,120);
 assert.equal(after.revision,before.revision);
});
test('operates doors only and preserves orientation/style',()=>{
 const edit=sandbox.create(fixture());
 const opened=edit.toggleDoor('block-1');
 const door=opened.world.blocks.find(block=>block.key==='block-1');
 assert.equal(door.open,true);
 assert.equal(door.orientation,'ew');
 assert.equal(door.style,'garden');
 assert.equal(door.swing,-1);
 assert.throws(()=>edit.toggleDoor('block-0'),/door/);
});
test('changes only supported tile patterns on tile blocks',()=>{
 const edit=sandbox.create(fixture());
 const changed=edit.setTilePattern('block-2','waves');
 assert.equal(changed.world.blocks.find(block=>block.key==='block-2').tilePattern,'waves');
 assert.throws(()=>edit.setTilePattern('block-2','unknown'),/Unsupported/);
 assert.throws(()=>edit.setTilePattern('block-0','waves'),/tile/);
});

test('matches saved style defaults and player-facing door orientation',()=>{
 const edit=sandbox.create(fixture());
 const stone=edit.addBlock({type:'stone',x:4,y:0,z:0}).world.blocks.at(-1);
 assert.equal(stone.color,'#334455');
 assert.equal(stone.texture,'brick');
 const tile=edit.addBlock({type:'tile',x:5,y:0,z:0}).world.blocks.at(-1);
 assert.equal(tile.color,'#c5a98a');
 assert.equal(tile.tilePattern,'spiral');
 const door=edit.addBlock({type:'door',x:6,y:0,z:0}).world.blocks.at(-1);
 assert.equal(door.style,'garden');
 assert.equal(door.orientation,'ew');
});
test('enforces two-cell door clearance and excavation depth bounds',()=>{
 const edit=sandbox.create(fixture());
 assert.throws(()=>edit.addBlock({type:'stone',x:1,y:1,z:0}),/occupied/);
 assert.throws(()=>edit.addBlock({type:'door',x:4,y:64,z:0}),/two clear/);
 assert.throws(()=>edit.addBlock({type:'stone',x:9,y:-1,z:9}),/coordinates/);
 const dug=edit.addBlock({type:'stone',x:8,y:-2,z:8});
 assert.equal(dug.world.blocks.at(-1).y,-2);
});

test('exposes the original seven roaming animals and merges saved animals without duplicate identities',()=>{
 const world=fixture();
 world.animals=[
  {id:'saved-mochi',species:'cat',name:'Mochi Two',x:31.5,z:-4.5,facing:.7,phase:1.2,body:'#c5b9a6',accent:'#eee1d2'},
  {id:'sheep',species:'cat',name:'Duplicate Sheep',x:90,z:90}
 ];
 const before=JSON.stringify(world),edit=sandbox.create(world),animals=edit.animalStates(5);
 assert.equal(animals.length,8,'Seven original residents plus one new saved animal should be available.');
 assert.deepEqual(animals.slice(0,7).map(a=>a.id),[
  'sheep','cat_mochi','dog_buddy','cow_bessie','horse_spirit','bird_chirpy','giraffe_raffy'
 ]);
 assert.equal(animals.find(a=>a.id==='sheep').name,'Pip the sheep',
  'A saved record that duplicates a resident ID must not replace the original animal.');
 const saved=animals.find(a=>a.id==='saved-mochi');
 assert.equal(saved.name,'Mochi Two');assert.equal(saved.species,'cat');assert.equal(saved.emoji,'🐱');
 assert.ok(Number.isFinite(saved.x)&&Number.isFinite(saved.z)&&Number.isFinite(saved.facing));
 assert.equal(JSON.stringify(world),before,'Animal state prediction must not mutate the sandbox input.');
});
test('records all four gentle animal-care actions, preserves per-animal counts, and caps at 999',()=>{
 const world=fixture();
 world.animals=[{id:'saved-mochi',species:'cat',name:'Mochi Two',x:31.5,z:-4.5,facing:0,phase:0}];
 world.animalCare={sheep:998,'saved-mochi':2};
 const before=JSON.stringify(world),edit=sandbox.create(world);
 const first=edit.careForAnimal('sheep','snack');
 assert.equal(first.world.animalCare.sheep,999);
 assert.equal(first.world.animalCare['saved-mochi'],2);
 assert.equal(first.revision,1);
 const second=edit.careForAnimal('sheep','water');
 assert.equal(second.world.animalCare.sheep,999,'The counter must never exceed the production 999 limit.');
 assert.equal(second.revision,2,'Care actions remain individually recorded even at the counter cap.');
 for(const action of ['brush','play'])edit.careForAnimal('saved-mochi',action);
 assert.equal(edit.getState().world.animalCare['saved-mochi'],4);
 assert.equal(edit.getState().revision,4);
 assert.equal(JSON.stringify(world),before,'Care actions may change only the isolated clone, never the source snapshot.');
 assert.equal(edit.getState().sourceUnchanged,true);
});
test('rejects unknown animals and unsupported care actions without changing state',()=>{
 const edit=sandbox.create(fixture()),before=edit.getState();
 assert.throws(()=>edit.careForAnimal('missing-animal','snack'),/not available/);
 assert.throws(()=>edit.careForAnimal('sheep','feed'),/supported/);
 assert.throws(()=>edit.careForAnimal('../bad','brush'),/valid animal/);
 assert.equal(edit.getState().revision,before.revision);
 assert.deepEqual(edit.getState().world.animalCare||{},before.world.animalCare||{});
});
test('rejects invalid input snapshot and keeps snapshots detached from internal state',()=>{
 assert.throws(()=>sandbox.create(null),TypeError);
 const edit=sandbox.create(fixture()),first=edit.getState();
 assert.throws(()=>first.world.blocks.pop(),TypeError);
 assert.equal(edit.getState().world.blocks.length,3);
});
test('plants remain pass-through while closed doors block and open doors release movement',()=>{
 const edit=sandbox.create(fixture());
 const flower=edit.addBlock({type:'flower',x:20,y:0,z:20}).world.blocks.at(-1);
 const grass=edit.addBlock({type:'tall_grass',x:21,y:0,z:20}).world.blocks.at(-1);
 const stone=edit.addBlock({type:'stone',x:22,y:0,z:20}).world.blocks.at(-1);
 const door=edit.addBlock({type:'door',x:23,y:0,z:20}).world.blocks.at(-1);
 assert.equal(edit.isMovementSolidAt(flower.x,flower.y,flower.z),false);
 assert.equal(edit.isMovementSolidAt(grass.x,grass.y,grass.z),false);
 assert.equal(edit.isMovementSolidAt(stone.x,stone.y,stone.z),true);
 assert.equal(edit.isMovementSolidAt(door.x,door.y,door.z),true);
 assert.equal(edit.isMovementSolidAt(door.x,door.y+1,door.z),true,'Closed doors occupy both vertical collision cells.');
 edit.toggleDoor(door.key);
 assert.equal(edit.isMovementSolidAt(door.x,door.y,door.z),false);
 assert.equal(edit.isMovementSolidAt(23,1,20),false,'The door upper clearance remains non-blocking when open.');
});
test('nudges an embedded player to the first safe nearby position without changing height',()=>{
 const edit=sandbox.create(fixture());
 const player={x:.5,y:0,z:.5,yaw:.4,pitch:-.1};
 const moved=edit.nudgePlayerOutOfBlocks(player);
 assert.equal(moved.moved,true);
 assert.equal(moved.saveRequested,true);
 assert.equal(moved.y,player.y);
 assert.equal(moved.yaw,player.yaw);
 assert.equal(moved.pitch,player.pitch);
 assert.equal(edit.playerCollisionAt(moved.x,moved.z,moved.y),false);
 assert.equal(player.x,.5,'The input player state must remain unchanged.');
 assert.equal(player.z,.5,'The input player state must remain unchanged.');
 const safe=edit.nudgePlayerOutOfBlocks({x:10,y:0,z:10,yaw:0});
 assert.equal(safe.moved,false);
 assert.equal(safe.saveRequested,false);
 assert.equal(safe.x,10);assert.equal(safe.z,10);
});
test('player capsule collision matches tile step-height, body-height and radius rules',()=>{
 const edit=sandbox.create(fixture());
 assert.equal(edit.playerCollisionAt(.5,.5,0),true,'A player standing inside a full solid block must collide.');
 assert.equal(edit.playerCollisionAt(-.23,.5,0),false,'Exact tangency at the player radius is not penetration.');
 assert.equal(edit.playerCollisionAt(-.22,.5,0),true,'A sub-radius overlap with a solid block must collide.');
 assert.equal(edit.playerCollisionAt(2.5,.5,0),false,'A decorative tile below the 0.18 step allowance must not block walking.');
 assert.equal(edit.playerCollisionAt(2.5,.5,-.2),true,'A tile slab above the player step allowance must collide.');
 assert.equal(edit.playerCollisionAt(2.5,.5,.16),false,'The player body must clear a tile when feet are above its top.');
 assert.throws(()=>edit.playerCollisionAt(NaN,0,0),/finite/);
});
test('player capsule collision treats plants as pass-through and doors as closed/open two-cell obstacles',()=>{
 const world=fixture();
 world.blocks.push(
  {key:'block-plant',type:'flower',x:3,y:0,z:0},
  {key:'block-grass',type:'tall_grass',x:4,y:0,z:0}
 );
 const edit=sandbox.create(world);
 assert.equal(edit.playerCollisionAt(3.5,.5,0),false);
 assert.equal(edit.playerCollisionAt(4.5,.5,0),false);
 assert.equal(edit.playerCollisionAt(1.5,.5,0),true,'Closed door lower half must block.');
 assert.equal(edit.playerCollisionAt(1.5,.5,1),false,'The legacy Canvas 2D player-collision approximation checks the lower one-cell door collider.');
 assert.equal(edit.isMovementSolidAt(1,1,0),true,'The upper door cell remains reserved for placement and occupancy checks.');
 edit.toggleDoor('block-1');
 assert.equal(edit.playerCollisionAt(1.5,.5,0),false,'Opening a door releases lower collision.');
 assert.equal(edit.playerCollisionAt(1.5,.5,1),false,'Opening a door releases upper collision.');
});
test('player capsule collision respects the excavated terrain floor and its radius',()=>{
 const world=fixture();world.excavations.push({x:80,z:80,depth:2});
 const edit=sandbox.create(world);
 assert.equal(edit.playerCollisionAt(8.5,8.5,-2.5),true,'The player must not pass below the dug pool floor.');
 assert.equal(edit.playerCollisionAt(8.5,8.5,-1.9),false,'The player may occupy the excavation above its floor.');
 assert.equal(edit.playerCollisionAt(80.23,80.5,-.5),false,'Exact-radius tangency at the far excavation edge does not overlap adjacent terrain.');
 assert.equal(edit.playerCollisionAt(80.22,80.5,-.5),true,'The player capsule cannot clip through the vertical edge of the excavation.');
});
test('Material Bucket items can be selected, reused with exact appearance and retained until explicitly cleared',()=>{
 const world=fixture();
 world.bucket=[
  {type:'wood',color:'#123456',texture:'brick'},
  {type:'tile',color:'#ab4567',tilePattern:'spiral'},
  {type:'door',color:'#56789a',style:'garden',orientation:'ew',swing:-1}
 ];
 const edit=sandbox.create(world),before=JSON.stringify(world.bucket);
 assert.throws(()=>edit.selectBucketItem(-1),/no longer available/);
 assert.throws(()=>edit.selectBucketItem(99),/no longer available/);
 const chosen=edit.selectBucketItem(0);
 assert.deepEqual(chosen.selectedBucketItem,world.bucket[0]);
 const wood=edit.addBlock({type:'wood',x:30,y:0,z:30});
 assert.equal(wood.world.blocks.at(-1).color,'#123456');
 assert.equal(wood.world.blocks.at(-1).texture,'brick');
 assert.equal(JSON.stringify(wood.world.bucket),before,'Using a recovered item must not consume its Material Bucket entry.');
 const again=edit.addBlock({type:'wood',x:31,y:0,z:30});
 assert.deepEqual(again.world.blocks.at(-1).color,wood.world.blocks.at(-1).color);
 assert.deepEqual(again.world.blocks.at(-1).texture,wood.world.blocks.at(-1).texture);
 const tileChoice=edit.selectBucketItem(1);
 const tile=edit.addBlock({type:'tile',x:32,y:0,z:30}).world.blocks.at(-1);
 assert.deepEqual(tileChoice.selectedBucketItem,world.bucket[1]);
 assert.equal(tile.color,'#ab4567');assert.equal(tile.tilePattern,'spiral');
 edit.selectBucketItem(2);
 const door=edit.addBlock({type:'door',x:33,y:0,z:30}).world.blocks.at(-1);
 assert.equal(door.color,'#56789a');assert.equal(door.style,'garden');
 assert.equal(door.orientation,'ew');assert.equal(door.swing,-1);assert.equal(door.open,false);
 assert.equal(JSON.stringify(edit.getState().world.bucket),before);
 const cleared=edit.clearBucketSelection();
 assert.equal(cleared.selectedBucketItem,null);
});
test('excavates ground one layer at a time and recovers dirt into both inventories',()=>{
 const world=fixture();world.materials=Array.from({length:60},()=>null);
 const edit=sandbox.create(world);
 const first=edit.excavateGround(10,10);
 assert.deepEqual(first.world.excavations.find(cell=>cell.x===10&&cell.z===10),{x:10,z:10,depth:1});
 assert.deepEqual(first.world.bucket[0],{type:'dirt',color:'#9a7049',texture:'dirt'});
 assert.deepEqual(first.world.materials[0],{id:'dirt',count:1,label:''});
 assert.equal(first.revision,1);
 const second=edit.excavateGround(10,10);
 assert.deepEqual(second.world.excavations.find(cell=>cell.x===10&&cell.z===10),{x:10,z:10,depth:2});
 assert.equal(second.world.bucket.length,2);
 assert.deepEqual(second.world.materials[0],{id:'dirt',count:2,label:''});
 assert.equal(second.revision,2);
});
test('digging an existing water surface collects a layer instead of excavating it',()=>{
 const world=fixture();
 world.water=[{x:8,z:8,level:2,depth:2}];
 world.fish=[{key:'fish-a',x:8,z:8},{key:'fish-b',x:8,z:8}];
 world.bucket=[];world.materials=Array.from({length:60},()=>null);
 const edit=sandbox.create(world);
 const top=edit.excavateGround(8,8);
 assert.equal(top.world.excavations.find(cell=>cell.x===8&&cell.z===8).depth,2);
 assert.equal(top.world.water[0].level,1);
 assert.equal(top.world.fish.length,2);
 assert.deepEqual(top.world.bucket[0],{type:'water'});
 assert.equal(top.world.materials.filter(item=>item&&item.id==='dirt').length,0);
 const last=edit.excavateGround(8,8);
 assert.equal(last.world.water.length,0);
 assert.equal(last.world.fish.length,0);
 assert.deepEqual(last.world.bucket.map(item=>item.type),['water','water']);
 assert.equal(last.world.excavations.find(cell=>cell.x===8&&cell.z===8).depth,2);
});
test('excavation prechecks depth, ground-cell count, materials capacity and bucket capacity',()=>{
 const invalid= sandbox.create(fixture()),before=invalid.getState();
 assert.throws(()=>invalid.excavateGround(1.5,2),/whole-number/);
 const deepWorld=fixture();deepWorld.excavations=[{x:30,z:30,depth:1000000000}];
 const deep=sandbox.create(deepWorld),deepBefore=deep.getState();
 assert.throws(()=>deep.excavateGround(30,30),/safe digging depth/);
 assert.equal(deep.getState().revision,deepBefore.revision);
 const fullGround=fixture();fullGround.excavations=Array.from({length:12000},(_,i)=>({x:10000+i,z:0,depth:1}));
 const ground=sandbox.create(fullGround),groundBefore=ground.getState();
 assert.throws(()=>ground.excavateGround(50000,0),/safe excavation limit/);
 assert.equal(ground.getState().revision,groundBefore.revision);
 const fullMaterials=fixture();fullMaterials.materials=Array.from({length:60},()=>({id:'stone',count:99,label:''}));
 const materials=sandbox.create(fullMaterials),materialsBefore=materials.getState();
 assert.throws(()=>materials.excavateGround(10,10),/resources pouch is full/);
 assert.equal(materials.getState().revision,materialsBefore.revision);
 assert.deepEqual(materials.getState().world.bucket,materialsBefore.world.bucket);
 const fullBucket=fixture();fullBucket.bucket=Array.from({length:120},()=>({type:'stone'}));fullBucket.materials=Array.from({length:60},()=>null);
 const bucket=sandbox.create(fullBucket),bucketBefore=bucket.getState();
 assert.throws(()=>bucket.excavateGround(10,10),/Material Bucket is full/);
 assert.equal(bucket.getState().revision,bucketBefore.revision);
 assert.deepEqual(bucket.getState().world.excavations,bucketBefore.world.excavations);
});
test('fills an excavation atomically and clears its water and fish without recovering them',()=>{
 const world=fixture();
 world.water=[{x:8,z:8,level:2,depth:2}];
 world.fish=[{key:'fish-1',x:8,z:8},{key:'fish-2',x:8,z:8}];
 world.bucket=[{type:'water'},{type:'water'}];
 const edit=sandbox.create(world),bucketBefore=JSON.stringify(world.bucket);
 const filled=edit.fillExcavation(8,8,{type:'stone'});
 const blocks=filled.world.blocks.filter(block=>block.x===8&&block.z===8).sort((a,b)=>a.y-b.y);
 assert.deepEqual(blocks.map(block=>block.y),[-2,-1]);
 assert.ok(blocks.every(block=>block.type==='stone'));
 assert.equal(filled.world.excavations.some(cell=>cell.x===8&&cell.z===8),false);
 assert.equal(filled.world.water.some(cell=>cell.x===8&&cell.z===8),false);
 assert.equal(filled.world.fish.some(fish=>fish.x===8&&fish.z===8),false);
 assert.equal(JSON.stringify(filled.world.bucket),bucketBefore,'Filling a hole clears water/fish without adding or removing bucket items.');
 assert.equal(filled.selectedKey,blocks[1].key);
 assert.equal(filled.revision,1);
 assert.equal(edit.playerCollisionAt(8.5,8.5,-1.5),true,'The filled excavation becomes solid block terrain again.');
});
test('reuses a selected bucket appearance for every layer of a filled excavation',()=>{
 const world=fixture();world.bucket=[{type:'stone',color:'#345678',texture:'brick'}];
 const edit=sandbox.create(world);edit.selectBucketItem(0);
 const filled=edit.fillExcavation(8,8,{type:'stone'});
 const blocks=filled.world.blocks.filter(block=>block.x===8&&block.z===8);
 assert.equal(blocks.length,2);
 assert.ok(blocks.every(block=>block.color==='#345678'&&block.texture==='brick'));
 assert.equal(filled.world.bucket.length,1,'The selected bucket item remains reusable after filling the hole.');
 assert.deepEqual(filled.selectedBucketItem,{type:'stone',color:'#345678',texture:'brick'});
});
test('rejects invalid, non-dug, door, blocked and over-capacity excavation fills without partial mutation',()=>{
 const edit=sandbox.create(fixture()),before=edit.getState();
 assert.throws(()=>edit.fillExcavation(7,7,{type:'stone'}),/already at its original level/);
 assert.throws(()=>edit.fillExcavation(8,8,{type:'door'}),/Choose a solid building block/);
 assert.throws(()=>edit.fillExcavation(8,8,{type:'water'}),/supported building block/);
 assert.throws(()=>edit.fillExcavation(1.5,8,{type:'stone'}),/whole-number/);
 assert.equal(edit.getState().revision,before.revision);
 assert.equal(edit.getState().world.blocks.length,before.world.blocks.length);
 const obstructed=fixture();obstructed.blocks.push({key:'block-in-hole',type:'stone',x:8,y:-1,z:8});
 const blockedEdit=sandbox.create(obstructed),blockedBefore=blockedEdit.getState();
 assert.throws(()=>blockedEdit.fillExcavation(8,8,{type:'dirt'}),/already occupying/);
 assert.equal(blockedEdit.getState().world.blocks.length,blockedBefore.world.blocks.length);
 assert.deepEqual(blockedEdit.getState().world.excavations,blockedBefore.world.excavations);
 const full=fixture();full.blocks=Array.from({length:18000},(_,index)=>({key:'full-'+index,type:'stone',x:index,y:0,z:100}));
 const fullEdit=sandbox.create(full),fullBefore=fullEdit.getState();
 assert.throws(()=>fullEdit.fillExcavation(8,8,{type:'stone'}),/Not enough building space/);
 assert.equal(fullEdit.getState().revision,fullBefore.revision);
});
test('blocks digging and removal inside protected homes and near live neighbors or animals',()=>{
 const world=fixture();
 world.blocks.push({key:'protected-block',type:'stone',x:30,y:0,z:30});
 const edit=sandbox.create(world);
 const neighborContext={neighbors:[{id:'nearby',x:30.5,z:30.5}],animals:[]};
 const animalContext={neighbors:[],animals:[{id:'pet',x:32.5,z:32.5}]};
 assert.equal(edit.isProtectedDigCell(-14,-7,{}),true,'The fixed Hyacinth home rectangle must remain protected.');
 assert.throws(()=>edit.excavateGround(-14,-7,{}),/protected/);
 assert.equal(edit.isProtectedDigCell(30,30,neighborContext),true);
 assert.throws(()=>edit.excavateGround(30,30,neighborContext),/protected/);
 assert.throws(()=>edit.remove('protected-block',neighborContext),/protected/);
 assert.equal(edit.isProtectedDigCell(32,32,animalContext),true);
 assert.throws(()=>edit.excavateGround(32,32,animalContext),/protected/);
 assert.equal(edit.getState().world.excavations.length,1,'Blocked digging must not change excavations.');
 assert.equal(edit.getState().world.blocks.some(b=>b.key==='protected-block'),true,'Blocked removal must preserve the block.');
 assert.equal((edit.getState().world.bucket||[]).length,0,'Blocked removal must not recover an item.');
});
test('protects water filling and collection but preserves the original unprotected hole-fill rule',()=>{
 const world=fixture();
 world.excavations.push({x:30,z:30,depth:2},{x:31,z:30,depth:2},{x:-14,z:-7,depth:1});
 world.water=[{x:30,z:30,level:1,depth:2}];
 const edit=sandbox.create(world),nearAnimal={neighbors:[],animals:[{id:'pet',x:30.5,z:30.5}]};
 assert.throws(()=>edit.addWaterLayer(30,30,nearAnimal),/protected/);
 assert.throws(()=>edit.collectWaterLayer(30,30,nearAnimal),/protected/);
 const filled=edit.fillExcavation(-14,-7,{type:'stone'});
 assert.equal(filled.world.excavations.some(cell=>cell.x===-14&&cell.z===-7),false,
  'Canvas 2D fillAtScreen does not use the dig protection guard, so sandbox fill behavior stays unchanged.');
 assert.equal(filled.world.blocks.some(block=>block.x===-14&&block.z===-7),true);
});
test('water respects dug depth, stacks by layer, and fish are limited to three per wet cell',()=>{
 const edit=sandbox.create(fixture());
 assert.throws(()=>edit.addFish(8,8),/Add water/);
 const first=edit.addWaterLayer(8,8);
 assert.deepEqual(first.world.water.find(cell=>cell.x===8&&cell.z===8),{x:8,z:8,level:1,depth:2});
 edit.addFish(8,8);edit.addFish(8,8);edit.addFish(8,8);
 assert.equal(edit.getState().world.fish.length,3);
 assert.throws(()=>edit.addFish(8,8),/three fish/);
 const second=edit.addWaterLayer(8,8);
 assert.equal(second.world.water[0].level,2);
 assert.throws(()=>edit.addWaterLayer(8,8),/full to the rim/);
 const collectedTop=edit.collectWaterLayer(8,8);
 assert.equal(collectedTop.world.water[0].level,1);
 assert.equal(collectedTop.world.fish.length,3,'Fish remain while the cell still contains water.');
 const collectedLast=edit.collectWaterLayer(8,8);
 assert.equal(collectedLast.world.water.length,0);
 assert.equal(collectedLast.world.fish.length,0,'Production removes fish when the last water layer is collected.');
 assert.deepEqual(collectedLast.world.bucket.slice(-2),[{type:'water'},{type:'water'}]);
});
test('water collection respects Material Bucket capacity and leaves full-bucket state unchanged',()=>{
 const world=fixture();world.water=[{x:8,z:8,level:1,depth:2}];
 world.bucket=Array.from({length:120},()=>({type:'stone'}));
 const edit=sandbox.create(world),before=edit.getState();
 assert.throws(()=>edit.collectWaterLayer(8,8),/Material Bucket is full/);
 const after=edit.getState();
 assert.deepEqual(after.world.water,before.world.water);
 assert.equal(after.world.bucket.length,120);
 assert.equal(after.revision,before.revision);
});
test('water operations reject undug and invalid cells without mutation',()=>{
 const edit=sandbox.create(fixture()),before=edit.getState();
 assert.throws(()=>edit.addWaterLayer(7,7),/Dig a pool cell/);
 assert.throws(()=>edit.addWaterLayer(1.25,8),/coordinates/);
 assert.throws(()=>edit.collectWaterLayer(8,8),/no water layer/);
 assert.equal(edit.getState().revision,before.revision);
});

test('updates the isolated player appearance while preserving position and every unrelated player field',()=>{
 const world=fixture();
 world.player={...world.player,hair:'#493127',skin:'#efc39d',shirt:'#d94b3d',pants:'#397d8f',shoes:'#bd4540',eyes:'#302820',
  hairStyle:'short',outfitStyle:'hoodie',accessory:'none',accessoryColor:'#f4a8bb',bed:{x:4,y:0,z:5,yaw:.25}};
 const before=JSON.stringify(world),edit=sandbox.create(world),initial=edit.getState();
 const appearance={hairStyle:'pigtails',outfitStyle:'overalls',accessory:'glasses',hair:'#efbd43',skin:'#f2cda9',
  shirt:'#48a78b',pants:'#219da5',shoes:'#e6b64d',eyes:'#302820',accessoryColor:'#ec83ba'};
 const next=edit.setPlayerAppearance(appearance);
 assert.deepEqual(Object.fromEntries(Object.keys(appearance).map(key=>[key,next.world.player[key]])),appearance);
 assert.deepEqual(
  {x:next.world.player.x,y:next.world.player.y,z:next.world.player.z,yaw:next.world.player.yaw,bed:next.world.player.bed},
  {x:initial.world.player.x,y:initial.world.player.y,z:initial.world.player.z,yaw:initial.world.player.yaw,bed:initial.world.player.bed},
  'Character Studio must not change player position, facing or bed assignment.'
 );
 assert.equal(next.revision,initial.revision+1);
 assert.equal(next.sourceUnchanged,true);
 assert.equal(JSON.stringify(world),before,'Character changes must not mutate the renderer snapshot.');
});

test('validates all original character style and color options atomically',()=>{
 const world=fixture();
 const sourceBefore=JSON.stringify(world),edit=sandbox.create(world),before=edit.getState();
 for(const value of ['short','bob','long','ponytail','pigtails','curly','buns'])
  assert.equal(edit.setPlayerAppearance({hairStyle:value}).world.player.hairStyle,value);
 for(const value of ['hoodie','sweater','overalls','dress','tee'])
  assert.equal(edit.setPlayerAppearance({outfitStyle:value}).world.player.outfitStyle,value);
 for(const value of ['none','bow','flower','glasses','cap'])
  assert.equal(edit.setPlayerAppearance({accessory:value}).world.player.accessory,value);
 for(const value of ['#123456','#ABCDEF','#000000','#ffffff'])
  assert.equal(edit.setPlayerAppearance({hair:value}).world.player.hair,value);
 const current=edit.getState();
 assert.throws(()=>edit.setPlayerAppearance({hairStyle:'unknown'}),/supported hairStyle/);
 assert.throws(()=>edit.setPlayerAppearance({outfitStyle:'armor'}),/supported outfitStyle/);
 assert.throws(()=>edit.setPlayerAppearance({accessory:'sword'}),/supported accessory/);
 assert.throws(()=>edit.setPlayerAppearance({shirt:'red'}),/six-digit hex/);
 assert.throws(()=>edit.setPlayerAppearance({skin:'#12'}),/six-digit hex/);
 assert.throws(()=>edit.setPlayerAppearance(null),/must be an object/);
 assert.throws(()=>edit.setPlayerAppearance({}),/at least one/);
 assert.equal(edit.getState().revision,current.revision,'Invalid changes must not increment the revision.');
 assert.deepEqual(edit.getState().world.player,current.world.player,'Invalid changes must not partially update the player.');
 assert.equal(JSON.stringify(world),sourceBefore,'Rejected character changes must never mutate the source fixture.');
 assert.equal(before.sourceUnchanged,true);
});

console.log('Three.js editing sandbox tests complete.');

test('saves a shared coloring PNG to the sandbox gallery and crafted pouch atomically',()=>{
 const world=fixture(),before=JSON.stringify(world),edit=sandbox.create(world),png='data:image/png;base64,AAAAAA==';
 const saved=edit.saveArtwork('Cozy cottage',png,'Lia');
 assert.deepEqual(saved.world.artworks,[{name:'Cozy cottage with Lia',data:png}]);
 assert.ok(saved.world.crafted.some(item=>item&&item.id==='picture'&&item.count===1&&item.label==='Cozy cottage with Lia'));
 assert.equal(saved.revision,1);
 assert.equal(saved.sourceUnchanged,true);
 assert.equal(JSON.stringify(world),before,'The renderer snapshot passed into the sandbox must remain unchanged.');
});
test('saves a standalone Art Studio picture with the production gallery name and blank crafted label',()=>{
 const world=fixture(),before=JSON.stringify(world),edit=sandbox.create(world),png='data:image/png;base64,AAAAAA==';
 const saved=edit.saveArtwork('My picture',png);
 assert.deepEqual(saved.world.artworks,[{name:'My picture',data:png}]);
 assert.deepEqual(saved.world.crafted[0],{id:'picture',count:1,label:''});
 assert.equal(saved.revision,1);
 assert.equal(saved.sourceUnchanged,true);
 assert.equal(JSON.stringify(world),before,'Art Studio saving must mutate only the sandbox clone.');
});
test('refuses invalid PNG data, oversized artwork, a full gallery, or a full crafted pouch without partial writes',()=>{
 const png='data:image/png;base64,AAAAAA==';
 const invalid=sandbox.create(fixture()),invalidBefore=invalid.getState();
 assert.throws(()=>invalid.saveArtwork('Bad image','data:image/jpeg;base64,AAAA','Lia'),/PNG/);
 assert.equal(invalid.getState().revision,invalidBefore.revision);
 assert.equal(invalid.getState().world.artworks.length,0);
 const oversized=sandbox.create(fixture());
 assert.throws(()=>oversized.saveArtwork('Large image','data:image/png;base64,'+'A'.repeat(550000),'Lia'),/PNG/);
 const fullGallery=fixture();fullGallery.artworks=Array.from({length:20},(_,i)=>({name:'Art '+i,data:png}));
 const gallery=sandbox.create(fullGallery),galleryBefore=gallery.getState();
 assert.throws(()=>gallery.saveArtwork('Another picture',png,'Lia'),/Gallery is full/);
 assert.deepEqual(gallery.getState().world.artworks,galleryBefore.world.artworks);
 assert.equal(gallery.getState().world.crafted.filter(item=>item&&item.id==='picture').length,0);
 const fullCrafted=fixture();fullCrafted.crafted=Array.from({length:60},(_,i)=>({id:'stone',count:1,label:String(i)}));
 const crafted=sandbox.create(fullCrafted),craftedBefore=crafted.getState();
 assert.throws(()=>crafted.saveArtwork('Cozy cottage',png,'Lia'),/crafted pouch is full/);
 assert.deepEqual(crafted.getState().world.artworks,craftedBefore.world.artworks);
 assert.deepEqual(crafted.getState().world.crafted,craftedBefore.world.crafted);
 assert.equal(crafted.getState().revision,craftedBefore.revision);
});
