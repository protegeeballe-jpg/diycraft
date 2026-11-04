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
 const MAX_BLOCKS=18000,MAX_COORD=1000000000,MAX_Y=64,MAX_BUCKET_ITEMS=120;
 const HEX=/^#[0-9a-f]{6}$/i;
 const TYPES=new Set(['grass','dirt','stone','wood','leaves','brick','glass','flower','tall_grass','sand','snow','tile','door','custom']);
 const SOLID_TYPES=new Set(['grass','dirt','stone','wood','leaves','brick','glass','flower','sand','snow']);
 const TEXTURES=new Set(['grass','dirt','stone','wood','leaves','brick','glass','flower','sand','snow','custom']);
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
  const occupied=new Map(),blockIndex=new Map(),depthByCell=new Map((Array.isArray(world.excavations)?world.excavations:[]).map(cell=>[cell.x+','+cell.z,cell.depth]));
  world.blocks.forEach(block=>{
   if(object(block)&&typeof block.key==='string'&&block.key&&!blockIndex.has(block.key))blockIndex.set(block.key,block);
   if(object(block)&&coord(block.x)&&Number.isInteger(block.y)&&coord(block.z)){
    const key=cellKey(block.x,block.y,block.z);
    if(!occupied.has(key))occupied.set(key,block.key);
    if(block.type==='door'&&block.y<MAX_Y){const upper=cellKey(block.x,block.y+1,block.z);if(!occupied.has(upper))occupied.set(upper,block.key);}
   }
  });
  function find(key){return blockIndex.get(key)||null;}
  function state(){
   const copy=clone(world);
   return freeze({revision,selectedKey,world:copy,sourceUnchanged:JSON.stringify(snapshot)===sourceBefore});
  }
  function select(key){
   selectedKey=find(key)?key:null;
   return state();
  }
  function addBlock(input){
   if(!object(input)||!coord(input.x)||!Number.isInteger(input.y)||input.y>MAX_Y||!coord(input.z)||input.y<-(depthByCell.get(input.x+','+input.z)||0))
    throw new TypeError('Block coordinates must be valid whole-number cells.');
   if(!TYPES.has(input.type))throw new TypeError('Unsupported block type.');
   if(world.blocks.length>=MAX_BLOCKS)throw new RangeError('The editing sandbox block limit has been reached.');
   const position=cellKey(input.x,input.y,input.z);
   if(occupied.has(position))throw new Error('That cell is already occupied.');
   const upperPosition=cellKey(input.x,input.y+1,input.z);
   if(input.type==='door'&&(input.y>=MAX_Y||occupied.has(upperPosition)))throw new Error('A door needs two clear vertical cells.');
   const block={key:'sandbox-'+(++nextId),type:input.type,x:input.x,y:input.y,z:input.z};
   if(input.type==='custom'){
    const custom=object(world.customBlock)?world.customBlock:{};
    const color=input.color===undefined?custom.color:input.color;
    if(typeof color!=='string'||!HEX.test(color))throw new TypeError('Custom blocks require a valid six-digit color.');
    block.color=color;
    block.texture=TEXTURES.has(input.texture)?input.texture:(TEXTURES.has(custom.texture)?custom.texture:'custom');
   }else if(input.type==='tile'){
    const design=object(world.tileDesign)?world.tileDesign:{};
    block.color=input.color===undefined?(design.color||'#c5a98a'):(HEX.test(input.color||'')?input.color:'#c5a98a');
    block.tilePattern=PATTERNS.has(input.tilePattern)?input.tilePattern:(PATTERNS.has(design.pattern)?design.pattern:'grid');
   }else if(input.type==='door'){
    const design=object(world.doorDesign)?world.doorDesign:{};
    block.color=input.color===undefined?(design.color||'#a97545'):(HEX.test(input.color||'')?input.color:'#a97545');
    block.style=['classic','window','garden'].includes(input.style)?input.style:(['classic','window','garden'].includes(design.style)?design.style:'classic');
    const yaw=Number.isFinite(world.player?.yaw)?world.player.yaw:0;
    block.orientation=input.orientation==='ew'||input.orientation==='ns'?input.orientation:(Math.abs(Math.cos(yaw))>=Math.abs(Math.sin(yaw))?'ns':'ew');
    block.swing=input.swing===-1?-1:1;block.open=false;
   }else if(SOLID_TYPES.has(input.type)){
    const style=object(world.solidStyles)?world.solidStyles[input.type]:null;
    if(style){block.color=typeof input.color==='string'&&HEX.test(input.color)?input.color:(style.color||undefined);block.texture=TEXTURES.has(input.texture)?input.texture:(TEXTURES.has(style.texture)?style.texture:input.type);}
    else if(typeof input.color==='string'&&HEX.test(input.color))block.color=input.color;
   }else if(typeof input.color==='string'&&HEX.test(input.color))block.color=input.color;
   world.blocks.push(block);blockIndex.set(block.key,block);occupied.set(position,block.key);
   if(input.type==='door')occupied.set(upperPosition,block.key);
   selectedKey=block.key;revision++;
   return state();
  }
  function remove(key){
   const index=world.blocks.findIndex(block=>block.key===key);
   if(index<0)return state();
   const block=world.blocks[index],bucket=Array.isArray(world.bucket)?world.bucket:(world.bucket=[]);
   if(bucket.length>=MAX_BUCKET_ITEMS)throw new RangeError('Your Material Bucket is full. Use or clear recovered blocks first.');
   const item={type:block.type};
   for(const field of ['color','texture','tilePattern','style','orientation','swing'])
    if(block[field]!==undefined)item[field]=block[field];
   if(SOLID_TYPES.has(block.type)){
    if(!item.color)item.color=block.color||'#9a9a9a';
    if(!item.texture)item.texture=block.type;
   }
   bucket.push(item);
   world.blocks.splice(index,1);blockIndex.delete(block.key);
   occupied.delete(cellKey(block.x,block.y,block.z));
   if(block.type==='door')occupied.delete(cellKey(block.x,block.y+1,block.z));
   if(selectedKey===key)selectedKey=null;
   revision++;
   return state();
  }
  function waterAt(x,z){
   return Array.isArray(world.water)?world.water.find(cell=>cell.x===x&&cell.z===z)||null:null;
  }
  function addWaterLayer(x,z){
   if(!coord(x)||!coord(z))throw new TypeError('Water coordinates must be valid whole-number cells.');
   const key=x+','+z,depth=depthByCell.get(key)||0;
   if(depth<1)throw new Error('Dig a pool cell first, then add water.');
   if(!Array.isArray(world.water))world.water=[];
   const current=waterAt(x,z),level=current?current.level:0;
   if(level>=depth)throw new Error('This pool cell is full to the rim.');
   if(current)current.level=level+1;
   else world.water.push({x,z,level:1,depth});
   revision++;
   return state();
  }
  function collectWaterLayer(x,z){
   if(!coord(x)||!coord(z))throw new TypeError('Water coordinates must be valid whole-number cells.');
   const index=Array.isArray(world.water)?world.water.findIndex(cell=>cell.x===x&&cell.z===z):-1;
   if(index<0)throw new Error('There is no water layer to collect here.');
   const bucket=Array.isArray(world.bucket)?world.bucket:(world.bucket=[]);
   if(bucket.length>=MAX_BUCKET_ITEMS)throw new RangeError('Your Material Bucket is full. Use or clear recovered blocks first.');
   bucket.push({type:'water'});
   const cell=world.water[index];
   if(cell.level>1)cell.level--;
   else{
    world.water.splice(index,1);
    if(Array.isArray(world.fish))world.fish=world.fish.filter(fish=>fish.x!==x||fish.z!==z);
   }
   revision++;
   return state();
  }
  function addFish(x,z){
   if(!coord(x)||!coord(z))throw new TypeError('Fish coordinates must be valid whole-number cells.');
   const cell=waterAt(x,z);
   if(!cell)throw new Error('Add water to this dug cell first.');
   if(!Array.isArray(world.fish))world.fish=[];
   const count=world.fish.filter(fish=>fish.x===x&&fish.z===z).length;
   if(count>=3)throw new Error('This water cell already has three fish.');
   world.fish.push({key:'sandbox-fish-'+(world.fish.length+1),x,z});
   revision++;
   return state();
  }
  function circleTouchesCell(x,z,bx,bz,radius){
   const nearestX=Math.max(bx,Math.min(bx+1,x)),nearestZ=Math.max(bz,Math.min(bz+1,z));
   const dx=x-nearestX,dz=z-nearestZ;
   return dx*dx+dz*dz<radius*radius;
  }
  function playerCollisionAt(x,z,y){
   if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(y))
    throw new TypeError('Player collision coordinates must be finite numbers.');
   const radius=.23,bodyHeight=1.72,stepHeight=.18;
   const minX=Math.floor(x-radius),maxX=Math.floor(x+radius);
   const minZ=Math.floor(z-radius),maxZ=Math.floor(z+radius);
   const minY=Math.max(-1000000000,Math.floor(y)),maxY=Math.min(MAX_Y,Math.floor(y+bodyHeight));
   const checked=new Set();
   for(let bx=minX;bx<=maxX;bx++)for(let bz=minZ;bz<=maxZ;bz++)for(let by=minY;by<=maxY;by++){
    const key=cellKey(bx,by,bz),blockKey=occupied.get(key),block=blockKey?find(blockKey):null;
    if(!block||block.type==='flower'||block.type==='tall_grass'||checked.has(block))continue;
    checked.add(block);
    if(block.type==='door'&&block.open)continue;
    const bottom=block.type==='tile'?block.y+.02:block.y;
    const top=block.type==='tile'?bottom+.13:block.y+1;
    if(block.type==='tile'&&top<=y+stepHeight+.001)continue;
    if(y>=top-.001||y+bodyHeight<=bottom+.001)continue;
    if(circleTouchesCell(x,z,block.x,block.z,radius))return true;
   }
   if(y>=-.001)return false;
   const head=y+bodyHeight,groundBaseY=-1000000000;
   for(let bx=minX;bx<=maxX;bx++)for(let bz=minZ;bz<=maxZ;bz++){
    const solidTop=-(depthByCell.get(bx+','+bz)||0);
    if(y>=solidTop-.001||head<=groundBaseY+.001)continue;
    if(head<=groundBaseY+.001||y>=solidTop-.001)continue;
    if(circleTouchesCell(x,z,bx,bz,radius))return true;
   }
   return false;
  }
  function isMovementSolidAt(x,y,z){
   if(!coord(x)||!Number.isInteger(y)||!coord(z))return false;
   const blockKey=occupied.get(cellKey(x,y,z)),block=blockKey?find(blockKey):null;
   if(!block||block.type==='flower'||block.type==='tall_grass')return false;
   return !(block.type==='door'&&block.open);
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
  return Object.freeze({select,addBlock,remove,addWaterLayer,collectWaterLayer,addFish,isMovementSolidAt,playerCollisionAt,toggleDoor,setTilePattern,getState:state});
 }
 return Object.freeze({create,limits:Object.freeze({blocks:MAX_BLOCKS,bucket:MAX_BUCKET_ITEMS})});
});
