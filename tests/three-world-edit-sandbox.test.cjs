'use strict';
const assert=require('node:assert/strict');
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
 const edit=sandbox.create(world),before=edit.getState();
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
 const edit=sandbox.create(fixture());
 assert.equal(edit.playerCollisionAt(8.5,8.5,-2.5),true,'The player must not pass below the dug pool floor.');
 assert.equal(edit.playerCollisionAt(8.5,8.5,-1.9),false,'The player may occupy the excavation above its floor.');
 assert.equal(edit.playerCollisionAt(80.23,80.5,-2.5),false,'Exact-radius tangency at the far excavation edge does not overlap adjacent terrain.');
 assert.equal(edit.playerCollisionAt(80.22,80.5,-2.5),true,'The player capsule cannot clip through the edge of the excavation floor.');
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
console.log('Three.js editing sandbox tests complete.');
