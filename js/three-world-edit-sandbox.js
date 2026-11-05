/* Stage 2 editing sandbox.
   All edits apply to a private clone of a renderer snapshot. No storage or
   production-world references are retained or modified. */
(function(root,factory){
 'use strict';
 const api=factory(root&&root.DIYCraftThreeWorldProtection);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreeEditSandbox=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(protectionApi){
 'use strict';
 const MAX_BLOCKS=18000,MAX_COORD=1000000000,MAX_Y=64,MAX_DIG_DEPTH=1000000000,MAX_GROUND_CELLS=12000,MAX_BUCKET_ITEMS=120,MAX_INVENTORY_SLOTS=60,MAX_STACK=99,MAX_ANIMALS=100;
 const ANIMAL_SPECIES=new Set(['sheep','cat','dog','cow','horse','bird','giraffe']);
 const ANIMAL_DEFAULTS={sheep:['#f0eee6','#d0b6a0'],cat:['#c5c0b6','#d0b6a0'],dog:['#c89b6d','#d0b6a0'],cow:['#f2eee5','#514b48'],horse:['#8a6347','#594337'],bird:['#e8c96d','#e8ad56'],giraffe:['#d9ad55','#9a643d']};
 const HEX=/^#[0-9a-f]{6}$/i,PNG_DATA=/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;
 const TYPES=new Set(['grass','dirt','stone','wood','leaves','brick','glass','flower','tall_grass','sand','snow','tile','door','custom']);
 const SOLID_TYPES=new Set(['grass','dirt','stone','wood','leaves','brick','glass','flower','sand','snow']);
 const BASE_COLORS={grass:'#70b85a',dirt:'#9a7049',stone:'#9ca6a1',wood:'#a97545',leaves:'#4e9a59',brick:'#c87862',glass:'#a5dce3',flower:'#e9a4c1',sand:'#e8d38b',snow:'#f2f8fa'};
 const TEXTURES=new Set(['grass','dirt','stone','wood','leaves','brick','glass','flower','sand','snow','custom']);
 const PATTERNS=new Set(['grid','brick','checker','diagonal','diamond','hexagon','herringbone','basket','mosaic','terrazzo','waves','dots','floral','stars','sunburst','scallop','parquet','pebble','cross','spiral']);
 const CRAFT_RECIPES=Object.freeze([
  Object.freeze({id:'flowerpot',name:'Flower pot',desc:'A little pot for a bright flower.',icon:'🪴',cost:Object.freeze({wood:1,seed:1})}),
  Object.freeze({id:'bench',name:'Garden bench',desc:'A comfortable place to sit.',icon:'🪑',cost:Object.freeze({wood:2})}),
  Object.freeze({id:'picture',name:'Picture frame',desc:'Keep a favorite drawing.',icon:'🖼️',cost:Object.freeze({wood:1,stone:1})}),
  Object.freeze({id:'picnic',name:'Picnic basket',desc:'A peaceful picnic treat.',icon:'🧺',cost:Object.freeze({bread:1,apple:1})})
 ]);
 function object(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
 function coord(value){return Number.isInteger(value)&&Math.abs(value)<=MAX_COORD;}
 function clone(value){return JSON.parse(JSON.stringify(value));}
 function freeze(value){
  if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
  Object.keys(value).forEach(key=>freeze(value[key]));
  return Object.freeze(value);
 }
 function cellKey(x,y,z){return x+','+y+','+z;}
 function starterBlockKeys(){
  const keys=new Set(),put=(x,y,z)=>keys.add(cellKey(x,y,z));
  for(let x=-3;x<=1;x++)for(let z=-13;z<=-9;z++){
   put(x,0,z);if(x===-3||x===1||z===-13||z===-9){put(x,1,z);put(x,2,z);}
  }
  for(let x=-4;x<=2;x++)for(let z=-14;z<=-8;z++)put(x,3,z);
  for(let x=-4;x<=2;x++){put(x,4,-14);put(x,4,-8);}
  put(-1,1,-9);put(-3,1,-11);put(1,1,-11);
  for(let y=0;y<=3;y++)put(9,y,-12);
  for(let x=7;x<=11;x++)for(let z=-14;z<=-10;z++)put(x,3,z);
  for(let x=8;x<=10;x++)for(let z=-13;z<=-11;z++)put(x,4,z);
  for(let y=0;y<=3;y++)put(-10,y,-13);
  for(let x=-12;x<=-8;x++)for(let z=-15;z<=-11;z++)put(x,3,z);
  for(let x=-11;x<=-9;x++)for(let z=-14;z<=-12;z++)put(x,4,z);
  for(let x=10;x<=13;x++)for(let z=-5;z<=-2;z++)put(x,0,z);
  for(let x=10;x<=13;x++)for(let z=-5;z<=-2;z+=2)put(x,1,z);
  for(let x=-8;x<=-6;x++)for(let z=-9;z<=-7;z++)put(x,0,z);
  return keys;
 }
 const STARTER_BLOCK_KEYS=starterBlockKeys();
 function create(snapshot){
  if(!object(snapshot)||!Array.isArray(snapshot.blocks))throw new TypeError('A Three.js world snapshot is required.');
  const sourceBefore=JSON.stringify(snapshot);
  const world=clone(snapshot);
  for(const target of ['materials','crafted']){
   const slots=Array.isArray(world[target])?world[target].slice(0,MAX_INVENTORY_SLOTS):[];
   while(slots.length<MAX_INVENTORY_SLOTS)slots.push(null);
   world[target]=slots;
  }
  if(!Array.isArray(world.artworks))world.artworks=[];
  let revision=0,selectedKey=null,selectedBucketItem=null,selectedBucketItemIndex=null,nextId=world.blocks.length,nextAnimalSerial=0;
  const HAIR_STYLES=new Set(['short','bob','long','ponytail','pigtails','curly','buns']);
  const OUTFIT_STYLES=new Set(['hoodie','sweater','overalls','dress','tee']);
  const ACCESSORIES=new Set(['none','bow','flower','glasses','cap']);
  const PLAYER_COLOR_FIELDS=Object.freeze(['hair','skin','shirt','pants','shoes','eyes','accessoryColor']);
  const occupied=new Map(),blockIndex=new Map(),depthByCell=new Map((Array.isArray(world.excavations)?world.excavations:[]).map(cell=>[cell.x+','+cell.z,cell.depth]));
  world.blocks.forEach(block=>{
   if(object(block)&&typeof block.key==='string'&&block.key&&!blockIndex.has(block.key))blockIndex.set(block.key,block);
   if(object(block)&&coord(block.x)&&Number.isInteger(block.y)&&coord(block.z)){
    const key=cellKey(block.x,block.y,block.z);
    if(!occupied.has(key))occupied.set(key,block.key);
    if(block.type==='door'&&block.y<MAX_Y){const upper=cellKey(block.x,block.y+1,block.z);if(!occupied.has(upper))occupied.set(upper,block.key);}
   }
  });
  function isProtectedDigCell(x,z,context={}){
   return !!(protectionApi&&typeof protectionApi.isProtectedCell==='function'&&
    protectionApi.isProtectedCell(x,z,context));
  }
  function find(key){return blockIndex.get(key)||null;}
  function state(){
   const copy=clone(world);
   return freeze({revision,selectedKey,selectedBucketItem:selectedBucketItem?clone(selectedBucketItem):null,selectedBucketItemIndex,world:copy,sourceUnchanged:JSON.stringify(snapshot)===sourceBefore});
  }
  function select(key){
   selectedKey=find(key)?key:null;
   return state();
  }
  function selectBucketItem(index){
   if(!Number.isInteger(index)||index<0||!Array.isArray(world.bucket)||!world.bucket[index]||!object(world.bucket[index]))
    throw new RangeError('That Material Bucket item is no longer available.');
   selectedBucketItem=clone(world.bucket[index]);selectedBucketItemIndex=index;
   return state();
  }
  function clearBucketSelection(){selectedBucketItem=null;selectedBucketItemIndex=null;return state();}
  function addBlockRecord(input){
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
    const hasExplicitStyle=Array.isArray(world.styledSolidTypes)
     ?world.styledSolidTypes.includes(input.type):!!style;
    if(style&&hasExplicitStyle){
     block.color=typeof input.color==='string'&&HEX.test(input.color)?input.color:(style.color||undefined);
     block.texture=TEXTURES.has(input.texture)?input.texture:(TEXTURES.has(style.texture)?style.texture:input.type);
    }else if(typeof input.color==='string'&&HEX.test(input.color))block.color=input.color;
   }else if(typeof input.color==='string'&&HEX.test(input.color))block.color=input.color;
   if(selectedBucketItem&&selectedBucketItem.type===input.type){
    for(const field of ['color','texture','tilePattern','style','orientation','swing'])
     if(selectedBucketItem[field]!==undefined)block[field]=selectedBucketItem[field];
    if(input.type==='door')block.open=false;
   }
   world.blocks.push(block);blockIndex.set(block.key,block);occupied.set(position,block.key);
   if(input.type==='door')occupied.set(upperPosition,block.key);
   selectedKey=block.key;
   return block;
  }
  function addBlock(input){
   addBlockRecord(input);revision++;
   return state();
  }
  function remove(key,protectionContext={}){
   const index=world.blocks.findIndex(block=>block.key===key);
   if(index<0)return state();
   const block=world.blocks[index];
   if(isProtectedDigCell(block.x,block.z,protectionContext))throw new Error('This block is too close to a neighbor or animal. Their homes and little friends are protected!');
   const bucket=Array.isArray(world.bucket)?world.bucket:(world.bucket=[]);
   if(bucket.length>=MAX_BUCKET_ITEMS)throw new RangeError('Your Material Bucket is full. Use or clear recovered blocks first.');
   const item={type:block.type};
   for(const field of ['color','texture','tilePattern','style','orientation','swing'])
    if(block[field]!==undefined)item[field]=block[field];
   if(SOLID_TYPES.has(block.type)){
    if(!item.color)item.color=block.color||BASE_COLORS[block.type]||'#9a9a9a';
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
  function canStoreItem(id,target='materials'){
   const slots=Array.isArray(world[target])?world[target]:[];
   return slots.some(item=>item&&item.id===id&&item.count<MAX_STACK)||slots.some(item=>!item);
  }
  function addItem(id,target='materials',label=''){
   if(!Array.isArray(world[target]))world[target]=Array.from({length:MAX_INVENTORY_SLOTS},()=>null);
   const slots=world[target];
   const same=slots.find(item=>item&&item.id===id&&item.count<MAX_STACK);
   if(same){same.count++;return true;}
   const index=slots.findIndex(item=>!item);
   if(index<0)return false;
   slots[index]={id,count:1,label};return true;
  }
  function craftRecipe(recipeId){
   const recipe=CRAFT_RECIPES.find(item=>item.id===recipeId);
   if(!recipe)throw new TypeError('Choose a supported recipe.');
   const available=id=>(world.materials||[]).reduce((sum,item)=>sum+(item&&item.id===id?Math.max(0,Number(item.count)||0):0),0);
   if(!Object.entries(recipe.cost).every(([id,count])=>available(id)>=count))
    throw new Error('Collect the listed materials first.');
   if(!canStoreItem(recipe.id,'crafted'))
    throw new Error('Your crafted pouch is full.');
   for(const [id,cost] of Object.entries(recipe.cost)){
    let remaining=cost;
    for(let index=0;index<world.materials.length&&remaining>0;index++){
     const item=world.materials[index];
     if(!item||item.id!==id)continue;
     const take=Math.min(remaining,item.count);
     item.count-=take;remaining-=take;
     if(item.count===0)world.materials[index]=null;
    }
    if(remaining>0)throw new Error('Materials changed while crafting. Please try again.');
   }
   if(!addItem(recipe.id,'crafted'))throw new Error('Your crafted pouch is full.');
   revision++;
   return state();
  }
function addAnimal(input){
   if(!object(input)||!ANIMAL_SPECIES.has(input.species))throw new TypeError('Choose a supported animal species.');
   if(!Number.isFinite(input.x)||!Number.isFinite(input.z)||Math.abs(input.x)>MAX_COORD||Math.abs(input.z)>MAX_COORD)
    throw new TypeError('Animal position must contain valid world coordinates.');
   if(!Array.isArray(world.animals))world.animals=[];
   if(world.animals.length>=MAX_ANIMALS)throw new RangeError('This world has reached its 100 saved-animal limit.');
   const defaults=ANIMAL_DEFAULTS[input.species],validColor=value=>typeof value==='string'&&HEX.test(value);
   const ids=new Set(world.animals.map(animal=>animal&&animal.id).filter(value=>typeof value==='string'));
   let id='';
   do{id='pet_'+(++nextAnimalSerial);}while(ids.has(id));
   const rawName=typeof input.name==='string'?input.name.trim():'';
   const name=(rawName||('My '+input.species)).slice(0,24);
   const animal={
    id,species:input.species,name,
    x:input.x,z:input.z,
    facing:Number.isFinite(input.facing)?input.facing:0,
    phase:Number.isFinite(input.phase)?input.phase:world.animals.length*1.37,
    body:validColor(input.body)?input.body:defaults[0],
    accent:validColor(input.accent)?input.accent:defaults[1]
   };
   world.animals.push(animal);
   if(!object(world.animalCare))world.animalCare={};
   world.animalCare[id]=0;
   revision++;
   return state();
  }
  function setPlayerPose(pose){
   if(!object(pose))throw new TypeError('A player pose object is required.');
   const changes={};
   for(const field of ['x','y','z','yaw','pitch']){
    if(pose[field]===undefined)continue;
    if(!Number.isFinite(pose[field])||Math.abs(pose[field])>MAX_COORD)
     throw new TypeError('Player '+field+' must be a finite world value.');
    changes[field]=field==='pitch'?Math.max(-1.25,Math.min(1.25,pose[field])):pose[field];
   }
   if(Object.prototype.hasOwnProperty.call(pose,'bed')){
    if(pose.bed===null)changes.bed=null;
    else if(object(pose.bed)&&['x','y','z','yaw'].every(field=>Number.isFinite(pose.bed[field])&&Math.abs(pose.bed[field])<=MAX_COORD))
     changes.bed={x:pose.bed.x,y:pose.bed.y,z:pose.bed.z,yaw:pose.bed.yaw};
    else throw new TypeError('Player home-bed coordinates are invalid.');
   }
   if(!Object.keys(changes).length)throw new TypeError('At least one player pose value is required.');
   const current=object(world.player)?world.player:{},next={...current,...changes};
   const changed=Object.keys(changes).some(field=>JSON.stringify(current[field])!==JSON.stringify(next[field]));
   if(changed){world.player=next;revision++;}
   return state();
  }
    function animalStates(timeSeconds){
   if(!protectionApi||typeof protectionApi.animalStates!=='function')return [];
   return protectionApi.animalStates(world,timeSeconds);
  }
  function careForAnimal(animalId,action){
   const actions={
    snack:{emoji:'🍎',message:'A tasty snack. '},
    water:{emoji:'💧',message:'Fresh water. '},
    brush:{emoji:'✨',message:'A gentle brush. '},
    play:{emoji:'💚',message:'A little playtime. '}
   };
   if(typeof animalId!=='string'||!/^[a-zA-Z0-9_-]{1,40}$/.test(animalId))
    throw new TypeError('Choose a valid animal friend.');
   const info=actions[action];
   if(!info)throw new TypeError('Choose a supported animal-care activity.');
   if(!animalStates(0).some(animal=>animal.id===animalId))
    throw new Error('That animal is not available in this world.');
   if(!object(world.animalCare))world.animalCare={};
   const current=Math.max(0,Math.min(999,Number(world.animalCare[animalId])||0));
   world.animalCare[animalId]=Math.min(999,current+1);
   revision++;
   return state();
  }
  function saveArtwork(name,data,neighborName=''){
   if(!Array.isArray(world.artworks))world.artworks=[];
   if(world.artworks.length>=20)throw new RangeError('Gallery is full. Export a backup first.');
   if(typeof data!=='string'||data.length>=550000||!PNG_DATA.test(data))
    throw new TypeError('This picture is too detailed or is not a supported PNG image.');
   const artworkName=String(name||'Artwork').slice(0,28);
   const galleryName=neighborName?artworkName+' with '+String(neighborName):artworkName;
   const itemLabel=neighborName?galleryName:'';
   if(!canStoreItem('picture','crafted'))throw new Error('Your crafted pouch is full.');
   world.artworks.push({name:galleryName,data});
   if(!addItem('picture','crafted',itemLabel)){
    world.artworks.pop();
    throw new Error('Your crafted pouch is full.');
   }
   revision++;
   return state();
  }
  function excavateGround(x,z,protectionContext={}){
   if(!coord(x)||!coord(z))throw new TypeError('Excavation coordinates must be valid whole-number cells.');
   if(isProtectedDigCell(x,z,protectionContext))throw new Error('This patch is protected for the neighbors and their homes.');
   const key=x+','+z,currentDepth=depthByCell.get(key)||0;
   if(waterAt(x,z))return collectWaterLayer(x,z);
   if(currentDepth>=MAX_DIG_DEPTH)throw new RangeError('You reached the safe digging depth: '+MAX_DIG_DEPTH+' blocks.');
   if(currentDepth===0&&depthByCell.size>=MAX_GROUND_CELLS)throw new RangeError('This world has reached its safe excavation limit.');
   if(!canStoreItem('dirt','materials'))throw new Error('Your resources pouch is full. Make room before digging.');
   if(!Array.isArray(world.bucket))world.bucket=[];
   if(world.bucket.length>=MAX_BUCKET_ITEMS)throw new RangeError('Your Material Bucket is full.');
   // Both inventory destinations are checked before changing the terrain.
   world.bucket.push({type:'dirt',color:BASE_COLORS.dirt,texture:'dirt'});
   depthByCell.set(key,currentDepth+1);
   world.excavations=Array.from(depthByCell,([position,depth])=>{
    const [cellX,cellZ]=position.split(',').map(Number);return {x:cellX,z:cellZ,depth};
   });
   if(!addItem('dirt','materials'))throw new Error('Dirt could not be stored in the materials pouch.');
   revision++;
   return state();
  }
  function fillExcavation(x,z,input){
   if(!coord(x)||!coord(z))throw new TypeError('Excavation coordinates must be valid whole-number cells.');
   if(!object(input)||!TYPES.has(input.type))throw new TypeError('Choose a supported building block to fill this hole.');
   if(input.type==='door')throw new Error('Choose a solid building block to fill a hole.');
   const key=x+','+z,depth=depthByCell.get(key)||0;
   if(depth<=0)throw new Error('That ground is already at its original level.');
   if(world.blocks.length+depth>MAX_BLOCKS)throw new RangeError('Not enough building space available.');
   if(input.type==='custom'){
    const custom=object(world.customBlock)?world.customBlock:{};
    const color=input.color===undefined?custom.color:input.color;
    if(typeof color!=='string'||!HEX.test(color))throw new TypeError('Custom blocks require a valid six-digit color.');
   }
   for(let y=-depth;y<0;y++){
    if(occupied.has(cellKey(x,y,z)))throw new Error('A block is already occupying part of this excavation.');
   }
   const placed=[];
   for(let y=-depth;y<0;y++)placed.push(addBlockRecord({...input,x,y,z}));
   world.excavations=(world.excavations||[]).filter(cell=>cell.x!==x||cell.z!==z);
   depthByCell.delete(key);
   if(Array.isArray(world.water))world.water=world.water.filter(cell=>cell.x!==x||cell.z!==z);
   if(Array.isArray(world.fish))world.fish=world.fish.filter(fish=>fish.x!==x||fish.z!==z);
   revision++;
   return state();
  }
  function waterAt(x,z){
   return Array.isArray(world.water)?world.water.find(cell=>cell.x===x&&cell.z===z)||null:null;
  }
  function addWaterLayer(x,z,protectionContext={}){
   if(!coord(x)||!coord(z))throw new TypeError('Water coordinates must be valid whole-number cells.');
   if(isProtectedDigCell(x,z,protectionContext))throw new Error('This patch is protected for the neighbors and their homes.');
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
  function collectWaterLayer(x,z,protectionContext={}){
   if(!coord(x)||!coord(z))throw new TypeError('Water coordinates must be valid whole-number cells.');
   if(isProtectedDigCell(x,z,protectionContext))throw new Error('This patch is protected for the neighbors and their homes.');
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
  function nudgePlayerOutOfBlocks(player){
   if(!object(player)||![player.x,player.y,player.z].every(Number.isFinite))
    throw new TypeError('A finite player position is required.');
   const result={...player,moved:false,saveRequested:false};
   if(!playerCollisionAt(player.x,player.z,player.y))return result;
   for(let radius=.3;radius<=1.8;radius+=.15){
    for(let i=0;i<24;i++){
     const angle=i*Math.PI/12,x=player.x+Math.cos(angle)*radius,z=player.z+Math.sin(angle)*radius;
     if(!playerCollisionAt(x,z,player.y)){
      result.x=x;result.z=z;result.moved=true;result.saveRequested=true;return result;
     }
    }
   }
   return result;
  }
  function groundDepthAt(x,z){
   if(!Number.isFinite(x)||!Number.isFinite(z))return 0;
   return depthByCell.get(Math.floor(x)+','+Math.floor(z))||0;
  }
  function surfaceHeightAt(x,z,atOrBelowY=Infinity){
   if(!Number.isFinite(x)||!Number.isFinite(z)||!(Number.isFinite(atOrBelowY)||atOrBelowY===Infinity))
    throw new TypeError('Surface query coordinates and height must be finite.');
   const bx=Math.floor(x),bz=Math.floor(z),ground=-groundDepthAt(bx,bz);
   let highest=ground;
   for(const block of world.blocks){
    if(block.x!==bx||block.z!==bz||block.type==='door'||block.type==='flower'||block.type==='tall_grass')continue;
    const top=block.type==='tile'?block.y+.02+.13:block.y+1;
    if(top<=atOrBelowY+.18&&top>highest)highest=top;
   }
   return highest;
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
  function setCustomBlockDesign(design){
   if(!object(design)||typeof design.color!=='string'||!HEX.test(design.color)||!TEXTURES.has(design.texture))
    throw new TypeError('Custom block design needs a valid color and supported texture.');
   world.customBlock={color:design.color.toLowerCase(),texture:design.texture};revision++;return state();
  }
  function setSolidStyle(type,design){
   if(!SOLID_TYPES.has(type))throw new TypeError('Choose a supported solid material.');
   if(!object(design)||typeof design.color!=='string'||!HEX.test(design.color)||!TEXTURES.has(design.texture))
    throw new TypeError('Solid finish needs a valid color and supported texture.');
   world.solidStyles=object(world.solidStyles)?world.solidStyles:{};
   world.solidStyles[type]={color:design.color.toLowerCase(),texture:design.texture};
   world.styledSolidTypes=Array.isArray(world.styledSolidTypes)?world.styledSolidTypes:[];
   if(!world.styledSolidTypes.includes(type))world.styledSolidTypes.push(type);
   revision++;return state();
  }
  function setDoorDesign(design){
   if(!object(design)||typeof design.color!=='string'||!HEX.test(design.color)||!['classic','window','garden'].includes(design.style))
    throw new TypeError('Door design needs a valid color and supported style.');
   world.doorDesign={color:design.color.toLowerCase(),style:design.style};revision++;return state();
  }
  function setTileDesign(design){
   if(!object(design)||typeof design.color!=='string'||!HEX.test(design.color)||!PATTERNS.has(design.pattern))
    throw new TypeError('Tile design needs a valid color and supported pattern.');
   world.tileDesign={color:design.color.toLowerCase(),pattern:design.pattern};revision++;return state();
  }
  function clearPlacedBlocks(){
  const before=world.blocks.length;
  world.blocks=world.blocks.filter(block=>STARTER_BLOCK_KEYS.has(cellKey(block.x,block.y,block.z)));
  const removed=before-world.blocks.length;
  if(removed){
   blockIndex.clear();occupied.clear();
   world.blocks.forEach(block=>{
    if(object(block)&&typeof block.key==='string'&&block.key&&!blockIndex.has(block.key))blockIndex.set(block.key,block);
    if(object(block)&&coord(block.x)&&Number.isInteger(block.y)&&coord(block.z)){
     const key=cellKey(block.x,block.y,block.z);if(!occupied.has(key))occupied.set(key,block.key);
     if(block.type==='door'&&block.y<MAX_Y){const upper=cellKey(block.x,block.y+1,block.z);if(!occupied.has(upper))occupied.set(upper,block.key);}
    }
   });
   selectedKey=null;revision++;
  }
  return state();
 }
 function clearMaterialBucket(){
   const hadItems=Array.isArray(world.bucket)&&world.bucket.length>0;
   if(hadItems){world.bucket=[];revision++;}
   selectedBucketItem=null;selectedBucketItemIndex=null;
   return state();
  }
  function setPlayerAppearance(appearance){
   if(!object(appearance))throw new TypeError('Character appearance must be an object.');
   const changes={};
   for(const field of ['hairStyle','outfitStyle','accessory']){
    if(appearance[field]===undefined)continue;
    const allowed=field==='hairStyle'?HAIR_STYLES:field==='outfitStyle'?OUTFIT_STYLES:ACCESSORIES;
    if(!allowed.has(appearance[field]))throw new TypeError('Choose a supported '+field+'.');
    changes[field]=appearance[field];
   }
   for(const field of PLAYER_COLOR_FIELDS){
    if(appearance[field]===undefined)continue;
    if(typeof appearance[field]!=='string'||!HEX.test(appearance[field]))
     throw new TypeError('Character '+field+' must be a six-digit hex color.');
    changes[field]=appearance[field];
   }
   if(!Object.keys(changes).length)throw new TypeError('Choose at least one character appearance setting.');
   const current=object(world.player)?world.player:{};
   world.player={...current,...changes};
   revision++;
   return state();
  }
  function setWorldName(name){
   if(typeof name!=='string')throw new TypeError('World name must be text.');
   const value=name.trim().slice(0,30);
   if(value&&world.name!==value){world.name=value;revision++;}
   return state();
  }
  function setTimeMode(mode){
   if(!['day','sunset','night','auto'].includes(mode))
    throw new TypeError('Choose day, sunset, night, or automatic time.');
   if(world.timeMode!==mode){world.timeMode=mode;revision++;}
   return state();
  }
  function setTilePattern(key,pattern){
   const block=find(key);
   if(!block||block.type!=='tile')throw new Error('Select a tile to change its pattern.');
   if(!PATTERNS.has(pattern))throw new TypeError('Unsupported tile pattern.');
   block.tilePattern=pattern;revision++;
   return state();
  }
  return Object.freeze({select,selectBucketItem,clearBucketSelection,addAnimal,setPlayerPose,addBlock,excavateGround,fillExcavation,remove,addWaterLayer,collectWaterLayer,addFish,saveArtwork,craftRecipe,animalStates,careForAnimal,setPlayerAppearance,setWorldName,setCustomBlockDesign,setSolidStyle,setDoorDesign,setTileDesign,clearMaterialBucket,clearPlacedBlocks,isProtectedDigCell,protectionContext:(timeSeconds)=>protectionApi?protectionApi.actorContext(world,timeSeconds,revision):{neighbors:[],animals:[]},characterStates:(timeSeconds)=>protectionApi&&typeof protectionApi.characterStates==='function'?protectionApi.characterStates(world,timeSeconds,revision):[],isMovementSolidAt,playerCollisionAt,nudgePlayerOutOfBlocks,groundDepthAt,surfaceHeightAt,toggleDoor,setTilePattern,setTimeMode,getState:state});
 }
 return Object.freeze({create,recipes:CRAFT_RECIPES,limits:Object.freeze({blocks:MAX_BLOCKS,bucket:MAX_BUCKET_ITEMS})});
});
