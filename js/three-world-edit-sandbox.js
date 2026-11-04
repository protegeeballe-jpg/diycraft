/* Stage 2 editing sandbox.
   All edits apply to a private clone of a renderer snapshot. No storage or
   production-world references are retained or modified. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreeEditSandbox=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const MAX_BLOCKS=18000,MAX_COORD=1000000000,MIN_Y=-1000000000,MAX_Y=64;
 const HEX=/^#[0-9a-f]{6}$/i;
 const TYPES=new Set(['grass','dirt','stone','wood','leaves','brick','glass','flower','tall_grass','sand','snow','tile','door','custom']);
 const PATTERNS=new Set(['grid','brick','checker','diagonal','diamond','hexagon','herringbone','basket','mosaic','terrazzo','waves','dots','floral','stars','sunburst','scallop','parquet','pebble','cross','spiral']);
 function object(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
 function coord(value){return Number.isInteger(value)&&Math.abs(value)<=MAX_COORD;}
 function clone(value){return JSON.parse(JSON.stringify(value));}
 function freeze(value){
  if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
  Object.keys(value).forEach(key=>freeze(value[key]));
  return Object.freeze(value);
 }
 function cellKey(x,y,z){return x+','+y+','+z;}
 function create(snapshot){
  if(!object(snapshot)||!Array.isArray(snapshot.blocks))throw new TypeError('A Three.js world snapshot is required.');
  const sourceBefore=JSON.stringify(snapshot);
  const world=clone(snapshot);
  let revision=0,selectedKey=null,nextId=world.blocks.length;
  const occupied=new Map();
  world.blocks.forEach(block=>{
   if(object(block)&&coord(block.x)&&Number.isInteger(block.y)&&coord(block.z)){
    const key=cellKey(block.x,block.y,block.z);
    if(!occupied.has(key))occupied.set(key,block.key);
   }
  });
  function find(key){return world.blocks.find(block=>block.key===key)||null;}
  function state(){
   const copy=clone(world);
   return freeze({revision,selectedKey,world:copy,sourceUnchanged:JSON.stringify(snapshot)===sourceBefore});
  }
  function select(key){
   selectedKey=find(key)?key:null;
   return state();
  }
  function addBlock(input){
   if(!object(input)||!coord(input.x)||!Number.isInteger(input.y)||input.y<MIN_Y||input.y>MAX_Y||!coord(input.z))
    throw new TypeError('Block coordinates must be valid whole-number cells.');
   if(!TYPES.has(input.type))throw new TypeError('Unsupported block type.');
   if(world.blocks.length>=MAX_BLOCKS)throw new RangeError('The editing sandbox block limit has been reached.');
   const position=cellKey(input.x,input.y,input.z);
   if(occupied.has(position))throw new Error('That cell is already occupied.');
   const block={key:'sandbox-'+(++nextId),type:input.type,x:input.x,y:input.y,z:input.z};
   if(input.type==='custom'){
    if(typeof input.color!=='string'||!HEX.test(input.color))throw new TypeError('Custom blocks require a valid six-digit color.');
    block.color=input.color;
    block.texture=TYPES.has(input.texture)?input.texture:'custom';
   }else if(input.type==='tile'){
    block.color=typeof input.color==='string'&&HEX.test(input.color)?input.color:'#c5a98a';
    block.tilePattern=PATTERNS.has(input.tilePattern)?input.tilePattern:'grid';
   }else if(input.type==='door'){
    block.color=typeof input.color==='string'&&HEX.test(input.color)?input.color:'#a97545';
    block.style=['classic','window','garden'].includes(input.style)?input.style:'classic';
    block.orientation=input.orientation==='ew'?'ew':'ns';
    block.swing=input.swing===-1?-1:1;block.open=false;
   }else{
    block.color=typeof input.color==='string'&&HEX.test(input.color)?input.color:'#9ca6a1';
    if(typeof input.texture==='string')block.texture=input.texture;
   }
   world.blocks.push(block);occupied.set(position,block.key);
   selectedKey=block.key;revision++;
   return state();
  }
  function remove(key){
   const index=world.blocks.findIndex(block=>block.key===key);
   if(index<0)return state();
   const block=world.blocks[index];
   world.blocks.splice(index,1);
   occupied.delete(cellKey(block.x,block.y,block.z));
   if(selectedKey===key)selectedKey=null;
   revision++;
   return state();
  }
  function toggleDoor(key){
   const block=find(key);
   if(!block||block.type!=='door')throw new Error('Select a door to operate it.');
   block.open=!block.open;revision++;
   return state();
  }
  function setTilePattern(key,pattern){
   const block=find(key);
   if(!block||block.type!=='tile')throw new Error('Select a tile to change its pattern.');
   if(!PATTERNS.has(pattern))throw new TypeError('Unsupported tile pattern.');
   block.tilePattern=pattern;revision++;
   return state();
  }
  return Object.freeze({select,addBlock,remove,toggleDoor,setTilePattern,getState:state});
 }
 return Object.freeze({create,limits:Object.freeze({blocks:MAX_BLOCKS})});
});
