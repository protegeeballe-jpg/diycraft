/* DIYCraft -> Three.js read-only world adapter.
   This module converts an already validated DIYCraft world into an immutable
   renderer snapshot. It never writes storage and never mutates the input. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreeWorldAdapter=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const WORLD_LIMIT=1000000000,MAX_DIG_DEPTH=1000000000;
 const MAX_BLOCKS=18000,MAX_GROUND_CELLS=12000,MAX_FISH=MAX_GROUND_CELLS*3,MAX_ANIMALS=100,MAX_ARTWORKS=20,MAX_ARTWORK_DATA=550000;
 const HEX=/^#[0-9a-f]{6}$/i;
 const TYPES=new Set(['grass','dirt','stone','wood','leaves','brick','glass','flower','tall_grass','sand','snow','tile','door','custom']);
 const TEXTURES=new Set(['grass','dirt','stone','wood','leaves','brick','glass','flower','sand','snow','custom']);
 const TILE_PATTERNS=new Set(['grid','brick','checker','diagonal','diamond','hexagon','herringbone','basket','mosaic','terrazzo','waves','dots','floral','stars','sunburst','scallop','parquet','pebble','cross','spiral']);
 const DOOR_STYLES=new Set(['classic','window','garden']);
 const TIME_MODES=new Set(['day','sunset','night','auto']);
 const SOLID_TYPES=['grass','dirt','stone','wood','leaves','brick','glass','flower','sand','snow'];
 const BASE_COLORS={
  grass:'#70b85a',dirt:'#9a7049',stone:'#9ca6a1',wood:'#a97545',
  leaves:'#4e9a59',brick:'#c87862',glass:'#a5dce3',flower:'#e9a4c1',
  tall_grass:'#4ea859',sand:'#e8d38b',snow:'#f2f8fa',
  tile:'#c5a98a',door:'#a97545'
 };
 const PLAYER_DEFAULTS={
  x:0,y:0,z:7,yaw:0,pitch:-.12,bed:null,shirt:'#d94b3d',hair:'#493127',
  skin:'#efc39d',pants:'#397d8f',shoes:'#bd4540',eyes:'#302820',
  hairStyle:'short',outfitStyle:'hoodie',accessory:'none',accessoryColor:'#f4a8bb'
 };
 const HAIR_STYLES=new Set(['short','bob','long','ponytail','pigtails','curly','buns']);
 const OUTFIT_STYLES=new Set(['hoodie','sweater','overalls','dress','tee']);
 const ACCESSORIES=new Set(['none','bow','flower','glasses','cap']);
 const ANIMALS=new Set(['sheep','cat','dog','cow','horse','bird','giraffe']);
 const INVENTORY_ITEMS=new Set(['seed','apple','bread','milk','wood','stone','grass','dirt','leaves','brick','glass','flower','tall_grass','sand','snow','tile','custom','paintbrush','wateringcan','flowerpot','bench','picture','picnic']);
 function isObject(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
 function finite(value){return typeof value==='number'&&Number.isFinite(value);}
 function integer(value){return Number.isInteger(value);}
 function inWorld(value){return integer(value)&&Math.abs(value)<=WORLD_LIMIT;}
 function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
 function color(value,fallback){return typeof value==='string'&&HEX.test(value)?value:fallback;}
 function safeName(value,fallback,max){
  return typeof value==='string'&&value.trim()?value.slice(0,max):fallback;
 }
 function freezeDeep(value){
  if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
  Object.keys(value).forEach(key=>freezeDeep(value[key]));
  return Object.freeze(value);
 }
 function normalizePlayer(source){
  const p=isObject(source)?source:{};
  const out={
   x:finite(p.x)?clamp(p.x,-WORLD_LIMIT,WORLD_LIMIT):PLAYER_DEFAULTS.x,
   y:finite(p.y)?clamp(p.y,-MAX_DIG_DEPTH,60):PLAYER_DEFAULTS.y,
   z:finite(p.z)?clamp(p.z,-WORLD_LIMIT,WORLD_LIMIT):PLAYER_DEFAULTS.z,
   yaw:finite(p.yaw)?p.yaw:0,
   pitch:finite(p.pitch)?clamp(p.pitch,-1.25,1.25):PLAYER_DEFAULTS.pitch,
   shirt:color(p.shirt,PLAYER_DEFAULTS.shirt),
   hair:color(p.hair,PLAYER_DEFAULTS.hair),
   skin:color(p.skin,PLAYER_DEFAULTS.skin),
   pants:color(p.pants,PLAYER_DEFAULTS.pants),
   shoes:color(p.shoes,PLAYER_DEFAULTS.shoes),
   eyes:color(p.eyes,PLAYER_DEFAULTS.eyes),
   accessoryColor:color(p.accessoryColor,PLAYER_DEFAULTS.accessoryColor),
   hairStyle:HAIR_STYLES.has(p.hairStyle)?p.hairStyle:PLAYER_DEFAULTS.hairStyle,
   outfitStyle:OUTFIT_STYLES.has(p.outfitStyle)?p.outfitStyle:PLAYER_DEFAULTS.outfitStyle,
   accessory:ACCESSORIES.has(p.accessory)?p.accessory:PLAYER_DEFAULTS.accessory,
   bed:null
  };
  if(isObject(p.bed)&&finite(p.bed.x)&&finite(p.bed.z)&&Math.abs(p.bed.x)<=WORLD_LIMIT&&Math.abs(p.bed.z)<=WORLD_LIMIT){
   out.bed={
    x:clamp(p.bed.x,-WORLD_LIMIT,WORLD_LIMIT),
    y:finite(p.bed.y)?clamp(p.bed.y,-MAX_DIG_DEPTH,64):0,
    z:clamp(p.bed.z,-WORLD_LIMIT,WORLD_LIMIT),
    yaw:finite(p.bed.yaw)?p.bed.yaw:0
   };
  }
  return out;
 }
 function normalizeBlock(block,index,styles,doorDesign,tileDesign){
  if(!isObject(block)||!TYPES.has(block.type)||!inWorld(block.x)||!inWorld(block.z)||
     !integer(block.y)||block.y< -MAX_DIG_DEPTH||block.y>64)return null;
  if(block.type==='custom'&&!(typeof block.color==='string'&&HEX.test(block.color)))return null;
  const type=block.type;
  const out={key:'block-'+index,type,x:block.x,y:block.y,z:block.z};
  if(type==='custom'){
   out.color=block.color;
   out.texture=TEXTURES.has(block.texture)?block.texture:'custom';
  }else if(type==='door'){
   out.color=color(block.color,doorDesign.color);
   out.style=DOOR_STYLES.has(block.style)?block.style:doorDesign.style;
   out.orientation=block.orientation==='ew'?'ew':'ns';
   out.swing=block.swing===-1?-1:1;
   out.open=!!block.open;
  }else if(type==='tile'){
   out.color=color(block.color,tileDesign.color);
   out.tilePattern=TILE_PATTERNS.has(block.tilePattern)?block.tilePattern:tileDesign.pattern;
  }else{
   const style=styles[type];
   out.color=color(block.color,style?.color||BASE_COLORS[type]||'#a0a0a0');
   if(TEXTURES.has(block.texture))out.texture=block.texture;
  }
  return out;
 }
 function normalizeStyles(source){
  const result={};
  for(const type of SOLID_TYPES){
   const item=isObject(source?.[type])?source[type]:{};
   result[type]={
    color:color(item.color,BASE_COLORS[type]),
    texture:TEXTURES.has(item.texture)?item.texture:type
   };
  }
  return result;
 }
 function explicitStyleTypes(source){
  if(!isObject(source))return [];
  return SOLID_TYPES.filter(type=>isObject(source[type]));
 }
 function normalizeExcavations(source){
  const seen=new Set(),out=[];
  if(!Array.isArray(source))return out;
  for(const item of source.slice(0,MAX_GROUND_CELLS)){
   if(!Array.isArray(item)||item.length<3)continue;
   const [x,z,depth]=item;
   if(!inWorld(x)||!inWorld(z)||!integer(depth)||depth<1||depth>MAX_DIG_DEPTH)continue;
   const key=x+','+z;if(seen.has(key))continue;seen.add(key);
   out.push({x,z,depth});
  }
  return out;
 }
 function normalizeWater(world,excavations){
  const depthByCell=new Map(excavations.map(cell=>[cell.x+','+cell.z,cell.depth]));
  const source=Array.isArray(world.waterLevels)?world.waterLevels:null;
  const candidates=source||((Array.isArray(world.waterCells)?world.waterCells:[]).map(v=>Array.isArray(v)?[v[0],v[1],1]:null));
  const seen=new Set(),out=[];
  for(const item of candidates.slice(0,MAX_GROUND_CELLS)){
   if(!Array.isArray(item)||item.length<3)continue;
   const [x,z,level]=item,key=x+','+z,depth=depthByCell.get(key);
   if(!inWorld(x)||!inWorld(z)||!integer(level)||!depth||level<1||level>depth||seen.has(key))continue;
   seen.add(key);out.push({x,z,level,depth});
  }
  return out;
 }
 function normalizeFish(source,water){
  const wet=new Set(water.map(cell=>cell.x+','+cell.z)),counts=new Map(),out=[];
  if(!Array.isArray(source))return out;
  for(const item of source.slice(0,MAX_FISH)){
   if(!Array.isArray(item)||item.length<2)continue;
   const [x,z]=item,key=x+','+z,count=counts.get(key)||0;
   if(!inWorld(x)||!inWorld(z)||!wet.has(key)||count>=3)continue;
   counts.set(key,count+1);out.push({key:'fish-'+out.length,x,z});
  }
  return out;
 }
 function normalizeBucket(source){
  const allowed=new Set([...TYPES,'water']);
  const out=[];
  if(!Array.isArray(source))return out;
  for(const item of source.slice(0,120)){
   if(!isObject(item)||!allowed.has(item.type))continue;
   const saved={type:item.type};
   if(color(item.color,null))saved.color=item.color;
   if(TEXTURES.has(item.texture))saved.texture=item.texture;
   if(TILE_PATTERNS.has(item.tilePattern))saved.tilePattern=item.tilePattern;
   if(DOOR_STYLES.has(item.style))saved.style=item.style;
   if(item.orientation==='ew'||item.orientation==='ns')saved.orientation=item.orientation;
   if(item.type==='door'){saved.open=false;saved.swing=item.swing===-1?-1:1;}
   out.push(saved);
  }
  return out;
 }
 function normalizeInventory(source){
  const out=Array.from({length:60},()=>null);
  if(!Array.isArray(source))return out;
  for(let i=0;i<Math.min(source.length,60);i++){
   const item=source[i];
   if(!isObject(item)||!INVENTORY_ITEMS.has(item.id))continue;
   const numeric=Number(item.count);
   out[i]={
    id:item.id,
    count:clamp(Number.isFinite(numeric)&&numeric?numeric:1,1,99),
    label:typeof item.label==='string'?item.label.slice(0,28):''
   };
  }
  return out;
 }
 function normalizeArtworks(source){
  const out=[];
  if(!Array.isArray(source))return out;
  const validData=/^data:image\\/png;base64,[A-Za-z0-9+/]+={0,2}$/;
  for(const item of source.slice(0,MAX_ARTWORKS)){
   if(!isObject(item)||typeof item.data!=='string'||item.data.length>=MAX_ARTWORK_DATA||!validData.test(item.data))continue;
   out.push({name:String(item.name||'Artwork').slice(0,28),data:item.data});
  }
  return out;
 }
 function normalizeAnimals(source){
  const out=[];
  if(!Array.isArray(source))return out;
  for(let i=0;i<Math.min(source.length,MAX_ANIMALS);i++){
   const animal=source[i];
   if(!isObject(animal)||!ANIMALS.has(animal.species)||!finite(animal.x)||!finite(animal.z)||
      Math.abs(animal.x)>WORLD_LIMIT||Math.abs(animal.z)>WORLD_LIMIT)continue;
   // Keep the saved animal ID exactly as the validated game supplied it.
   // The renderer uses a separate array-position key for internal object identity.
   const id=String(animal.id||'saved_animal_'+i).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,40)||('saved_animal_'+i);
   out.push({
    key:'animal-'+out.length,id,species:animal.species,
    name:safeName(animal.name,animal.species,24),
    x:clamp(animal.x,-WORLD_LIMIT,WORLD_LIMIT),
    z:clamp(animal.z,-WORLD_LIMIT,WORLD_LIMIT),
    facing:finite(animal.facing)?animal.facing:0,
    phase:finite(animal.phase)?animal.phase:i*1.7,
    body:color(animal.body,null),accent:color(animal.accent,null)
   });
  }
  return out;
 }
 function createSnapshot(world){
  if(!isObject(world))throw new TypeError('A validated DIYCraft world object is required.');
  const doorSource=isObject(world.doorDesign)?world.doorDesign:{};
  const tileSource=isObject(world.tileDesign)?world.tileDesign:{};
  const doorDesign={
   color:color(doorSource.color,'#a97545'),
   style:DOOR_STYLES.has(doorSource.style)?doorSource.style:'classic'
  };
  const tileDesign={
   color:color(tileSource.color,'#c5a98a'),
   pattern:TILE_PATTERNS.has(tileSource.pattern)?tileSource.pattern:'grid'
  };
  const customSource=isObject(world.customBlock)?world.customBlock:{};
  const customBlock={
   color:color(customSource.color,'#aa83d8'),
   texture:TEXTURES.has(customSource.texture)?customSource.texture:'custom'
  };
  const solidStyles=normalizeStyles(world.solidStyles);
  const styledSolidTypes=explicitStyleTypes(world.solidStyles);
  const sourceBlocks=Array.isArray(world.blocks)?world.blocks:[];
  const blocks=[];
  for(let i=0;i<Math.min(sourceBlocks.length,MAX_BLOCKS);i++){
   const block=normalizeBlock(sourceBlocks[i],i,solidStyles,doorDesign,tileDesign);
   if(block)blocks.push(block);
  }
  const excavations=normalizeExcavations(world.excavations);
  const water=normalizeWater(world,excavations);
  const fish=normalizeFish(world.fish,water);
  const animals=normalizeAnimals(world.animals);
  const bucket=normalizeBucket(world.bucket);
  const materials=normalizeInventory(world.materials),crafted=normalizeInventory(world.crafted),artworks=normalizeArtworks(world.artworks);
  return freezeDeep({
   source:'diycraft-world-v1',
   version:integer(world.version)?world.version:1,
   name:safeName(world.name,'My Peaceful World',30),
   timeMode:TIME_MODES.has(world.timeMode)?world.timeMode:'day',
   player:normalizePlayer(world.player),
   customBlock,doorDesign,tileDesign,solidStyles,styledSolidTypes,
   blocks,excavations,water,fish,animals,bucket,materials,crafted,artworks,
   counts:{
    blocks:blocks.length,excavations:excavations.length,
    water:water.length,fish:fish.length,animals:animals.length,bucket:bucket.length,artworks:artworks.length
   }
  });
 }
 return Object.freeze({
  createSnapshot,
  limits:Object.freeze({world:WORLD_LIMIT,blocks:MAX_BLOCKS,groundCells:MAX_GROUND_CELLS,fish:MAX_FISH,animals:MAX_ANIMALS,artworks:MAX_ARTWORKS,artworkData:MAX_ARTWORK_DATA})
 });
});
