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
  player:{x:0,y:0,z:4},counts:{blocks:3}
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
test('rejects invalid input snapshot and keeps snapshots detached from internal state',()=>{
 assert.throws(()=>sandbox.create(null),TypeError);
 const edit=sandbox.create(fixture()),first=edit.getState();
 first.world.blocks.pop();
 assert.equal(edit.getState().world.blocks.length,3);
});
console.log('Three.js editing sandbox tests complete.');
