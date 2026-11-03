(()=>{'use strict';
const $=id=>document.getElementById(id), canvas=$('game'),ctx=canvas.getContext('2d',{alpha:false});
// Practically unbounded horizontal world; nearby ground is drawn around the player each frame.
const WORLD_LIMIT=1000000000,MAX_BLOCKS=18000,MAX_BUCKET_ITEMS=120,STORE_KEY='diycraft_peaceful_voxel_v1';
const MAX_DIG_DEPTH=1000000000,GROUND_DIG_LIMIT=12000;
const BLOCKS=[
 {id:'grass',name:'Grass',emoji:'🟩',color:'#70b85a'}, {id:'dirt',name:'Dirt',emoji:'🟫',color:'#9a7049'},
 {id:'stone',name:'Stone',emoji:'⬜',color:'#9ca6a1'}, {id:'wood',name:'Wood',emoji:'🪵',color:'#a97545'},
 {id:'leaves',name:'Leaves',emoji:'🌳',color:'#4e9a59'}, {id:'brick',name:'Brick',emoji:'🧱',color:'#c87862'},
 {id:'glass',name:'Glass',emoji:'🔹',color:'#a5dce3'}, {id:'flower',name:'Flower',emoji:'🌸',color:'#e9a4c1'},
 {id:'tall_grass',name:'Tall Grass',emoji:'🌿',color:'#4ea859'},
 {id:'sand',name:'Sand',emoji:'🟨',color:'#e8d38b'}, {id:'snow',name:'Snow',emoji:'❄️',color:'#f2f8fa'},
 {id:'tile',name:'Decorative Tile',emoji:'🧩',color:'#c5a98a'},
 {id:'door',name:'Door',emoji:'🚪',color:'#a97545'}
];
const SOLID_STYLE_TYPES=['grass','dirt','stone','wood','leaves','brick','glass','flower','sand','snow'];
const CUSTOM_TEXTURES=[
 {id:'grass',name:'Grass',emoji:'🌿'},
 {id:'dirt',name:'Dirt',emoji:'🟫'},
 {id:'stone',name:'Stone',emoji:'🪨'},
 {id:'wood',name:'Wood grain',emoji:'🪵'},
 {id:'leaves',name:'Leafy',emoji:'🍃'},
 {id:'brick',name:'Brick',emoji:'🧱'},
 {id:'glass',name:'Glass',emoji:'🔹'},
 {id:'flower',name:'Flower',emoji:'🌸'},
 {id:'sand',name:'Sand',emoji:'🏖️'},
 {id:'snow',name:'Snow',emoji:'❄️'},
 {id:'custom',name:'Speckled',emoji:'✨'}
];
const CUSTOM_COLORS=['#F44336','#FF9800','#FFC107','#FFEB3B','#8BC34A','#4CAF50','#009688','#00BCD4','#03A9F4','#3F51B5','#673AB7','#9C27B0','#E91E63','#795548','#607D8B','#FFFFFF','#222222'];
const TILE_THICKNESS=.13,TILE_BASE_OFFSET=.02;
const TILE_DESIGNS=[
 {id:'grid',name:'Classic Grid',icon:'▦'},
 {id:'brick',name:'Running Brick',icon:'▤'},
 {id:'checker',name:'Checkerboard',icon:'▩'},
 {id:'diagonal',name:'Diagonal Lines',icon:'╱'},
 {id:'diamond',name:'Diamond',icon:'◇'},
 {id:'hexagon',name:'Honeycomb',icon:'⬡'},
 {id:'herringbone',name:'Herringbone',icon:'⌁'},
 {id:'basket',name:'Basket Weave',icon:'▧'},
 {id:'mosaic',name:'Mosaic',icon:'◈'},
 {id:'terrazzo',name:'Terrazzo',icon:'✣'},
 {id:'waves',name:'Ocean Waves',icon:'≈'},
 {id:'dots',name:'Polka Dots',icon:'⠿'},
 {id:'floral',name:'Flower Garden',icon:'✿'},
 {id:'stars',name:'Starry Night',icon:'✦'},
 {id:'sunburst',name:'Sunburst',icon:'☼'},
 {id:'scallop',name:'Scallops',icon:'∩'},
 {id:'parquet',name:'Parquet Wood',icon:'▥'},
 {id:'pebble',name:'Pebbles',icon:'◌'},
 {id:'cross',name:'Little Crosses',icon:'✚'},
 {id:'spiral',name:'Spiral Garden',icon:'◎'}
];
const ITEM_META={
 seed:{name:'Seeds',icon:'🌱'},apple:{name:'Apple',icon:'🍎'},bread:{name:'Bread',icon:'🍞'},milk:{name:'Milk',icon:'🥛'},wood:{name:'Wood pieces',icon:'🪵'},stone:{name:'Stone',icon:'🪨'},grass:{name:'Grass',icon:'🟩'},dirt:{name:'Dirt',icon:'🟫'},leaves:{name:'Leaves',icon:'🌳'},brick:{name:'Brick',icon:'🧱'},glass:{name:'Glass',icon:'🔹'},flower:{name:'Flower',icon:'🌸'},tall_grass:{name:'Tall Grass',icon:'🌿'},sand:{name:'Sand',icon:'🟨'},snow:{name:'Snow',icon:'❄️'},tile:{name:'Decorative tile',icon:'🧩'},custom:{name:'Custom block pieces',icon:'🎨'},paintbrush:{name:'Paintbrush',icon:'🖌️'},wateringcan:{name:'Watering can',icon:'🚿'},flowerpot:{name:'Flower pot',icon:'🪴'},bench:{name:'Garden bench',icon:'🪑'},picture:{name:'Picture frame',icon:'🖼️'},picnic:{name:'Picnic basket',icon:'🧺'}
};
const RECIPES=[
 {id:'flowerpot',name:'Flower pot',desc:'A little pot for a bright flower.',icon:'🪴',cost:{wood:1,seed:1}},
 {id:'bench',name:'Garden bench',desc:'A comfortable place to sit.',icon:'🪑',cost:{wood:2}},
 {id:'picture',name:'Picture frame',desc:'Keep a favorite drawing.',icon:'🖼️',cost:{wood:1,stone:1}},
 {id:'picnic',name:'Picnic basket',desc:'A peaceful picnic treat.',icon:'🧺',cost:{bread:1,apple:1}}
];
const emptySlots=()=>Array.from({length:60},()=>null);
function freshWorld(){
 const blocks=[];const put=(x,y,z,type)=>blocks.push({x,y,z,type});
 for(let x=-3;x<=1;x++)for(let z=-13;z<=-9;z++){put(x,0,z,'wood');if(x===-3||x===1||z===-13||z===-9){put(x,1,z,'brick');put(x,2,z,'brick');}}
 for(let x=-4;x<=2;x++)for(let z=-14;z<=-8;z++)put(x,3,z,'wood');
 for(let x=-4;x<=2;x++){put(x,4,-14,'brick');put(x,4,-8,'brick');}
 put(-1,1,-9,'glass');put(-3,1,-11,'glass');put(1,1,-11,'glass');
 for(let y=0;y<=3;y++)put(9,y,-12,'wood');
 for(let x=7;x<=11;x++)for(let z=-14;z<=-10;z++)put(x,3,z,'leaves');
 for(let x=8;x<=10;x++)for(let z=-13;z<=-11;z++)put(x,4,z,'leaves');
 for(let y=0;y<=3;y++)put(-10,y,-13,'wood');
 for(let x=-12;x<=-8;x++)for(let z=-15;z<=-11;z++)put(x,3,z,'leaves');
 for(let x=-11;x<=-9;x++)for(let z=-14;z<=-12;z++)put(x,4,z,'leaves');
 for(let x=10;x<=13;x++)for(let z=-5;z<=-2;z++)put(x,0,z,'dirt');
 for(let x=10;x<=13;x++)for(let z=-5;z<=-2;z+=2)put(x,1,z,'flower');
 for(let x=-8;x<=-6;x++)for(let z=-9;z<=-7;z++)put(x,0,z,'flower');
 return {version:1,name:'My Peaceful World',blocks,excavations:[],waterCells:[],waterLevels:[],fish:[],bucket:[],animals:[],
  player:{x:0,y:0,z:7,yaw:0,pitch:-.12,bed:{x:-1,y:0,z:-11,yaw:0},shirt:'#d94b3d',hair:'#493127',skin:'#efc39d',pants:'#397d8f',shoes:'#bd4540',eyes:'#302820',hairStyle:'short',outfitStyle:'hoodie',accessory:'none',accessoryColor:'#f4a8bb'},
  customBlock:{color:'#aa83d8',texture:'custom'},doorDesign:{color:'#a97545',style:'classic'},tileDesign:{color:'#c5a98a',pattern:'grid'},solidStyles:{},timeMode:'day',materials:emptySlots(),crafted:emptySlots(),artworks:[],
  animalCare:{sheep:0,cat_mochi:0,dog_buddy:0,cow_bessie:0,horse_spirit:0,bird_chirpy:0,giraffe_raffy:0}};
}

function validHex(s,f){return /^#[0-9a-f]{6}$/i.test(s||'')?s:f;}
function validWorld(d){
 if(!d||typeof d!=='object')throw new Error('That file is not a DIYCraft world.');
 const w=freshWorld();w.name=String(d.name||w.name).slice(0,30);
 if(Array.isArray(d.animals)){
  const allowed=new Set(['sheep','cat','dog','cow','horse','bird','giraffe']);
  w.animals=d.animals.slice(0,100).filter(a=>a&&allowed.has(a.species)&&Number.isFinite(a.x)&&Number.isFinite(a.z)).map((a,i)=>({
   id:String(a.id||('saved_animal_'+i)).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,40)||('saved_animal_'+i),
   species:a.species,name:String(a.name||a.species).slice(0,24),
   x:Math.max(-WORLD_LIMIT,Math.min(WORLD_LIMIT,Number(a.x))),z:Math.max(-WORLD_LIMIT,Math.min(WORLD_LIMIT,Number(a.z))),
   facing:Number.isFinite(a.facing)?a.facing:0,phase:Number.isFinite(a.phase)?a.phase:i*1.7,
   ...(validHex(a.body,'')?{body:validHex(a.body,'')}:{}),...(validHex(a.accent,'')?{accent:validHex(a.accent,'')}: {})
  }));
 }
 if(d.customBlock&&typeof d.customBlock==='object'){
  w.customBlock.color=validHex(d.customBlock.color,w.customBlock.color);
  w.customBlock.texture=CUSTOM_TEXTURES.some(t=>t.id===d.customBlock.texture)?d.customBlock.texture:'custom';
 }
 w.timeMode=['day','sunset','night','auto'].includes(d.timeMode)?d.timeMode:'day';
 if(d.doorDesign&&typeof d.doorDesign==='object'){
  w.doorDesign.color=validHex(d.doorDesign.color,w.doorDesign.color);
  w.doorDesign.style=['classic','window','garden'].includes(d.doorDesign.style)?d.doorDesign.style:'classic';
 }
 if(d.tileDesign&&typeof d.tileDesign==='object'){
  w.tileDesign.color=validHex(d.tileDesign.color,w.tileDesign.color);
  w.tileDesign.pattern=TILE_DESIGNS.some(t=>t.id===d.tileDesign.pattern)?d.tileDesign.pattern:'grid';
 }
 if(d.solidStyles&&typeof d.solidStyles==='object'){
  for(const type of SOLID_STYLE_TYPES){
   const style=d.solidStyles[type];
   if(style&&typeof style==='object')w.solidStyles[type]={
    color:validHex(style.color,BLOCKS.find(b=>b.id===type)?.color||'#a0a0a0'),
    texture:CUSTOM_TEXTURES.some(t=>t.id===style.texture)?style.texture:type
   };
  }
 }
 if(Array.isArray(d.blocks))w.blocks=d.blocks.slice(0,MAX_BLOCKS).filter(b=>b&&Number.isInteger(b.x)&&Number.isInteger(b.y)&&Number.isInteger(b.z)&&Math.abs(b.x)<=WORLD_LIMIT&&Math.abs(b.z)<=WORLD_LIMIT&&b.y>=-MAX_DIG_DEPTH&&b.y<=64&&(BLOCKS.some(t=>t.id===b.type)||(b.type==='custom'&&/^#[0-9a-f]{6}$/i.test(b.color||'')))).map(b=>{
  if(b.type==='custom')return {...b,texture:CUSTOM_TEXTURES.some(t=>t.id===b.texture)?b.texture:'custom'};
  if(b.type==='door')return {...b,color:validHex(b.color,w.doorDesign.color),style:['classic','window','garden'].includes(b.style)?b.style:'classic',orientation:b.orientation==='ew'?'ew':'ns',swing:b.swing===-1?-1:1,open:!!b.open};
  if(b.type==='tile')return {...b,color:validHex(b.color,w.tileDesign.color),tilePattern:TILE_DESIGNS.some(t=>t.id===b.tilePattern)?b.tilePattern:'grid'};
  const meta=BLOCKS.find(t=>t.id===b.type);
  return {...b,...(b.color?{color:validHex(b.color,meta?.color||'#a0a0a0')}:{})
   ,...(b.texture&&CUSTOM_TEXTURES.some(t=>t.id===b.texture)?{texture:b.texture}:{})};
 });
 if(Array.isArray(d.excavations)){
  const seenExcavations=new Set();
  w.excavations=d.excavations.slice(0,GROUND_DIG_LIMIT).filter(v=>{
   if(!Array.isArray(v)||v.length<3)return false;
   const [x,z,depth]=v;
   if(!Number.isInteger(x)||!Number.isInteger(z)||Math.abs(x)>WORLD_LIMIT||Math.abs(z)>WORLD_LIMIT||!Number.isInteger(depth)||depth<1||depth>MAX_DIG_DEPTH)return false;
   const key=x+','+z;if(seenExcavations.has(key))return false;seenExcavations.add(key);return true;
  }).map(v=>[v[0],v[1],v[2]]);
 }
 if(Array.isArray(d.waterCells)){
  const dug=new Set(w.excavations.map(([x,z])=>x+','+z)),seen=new Set();
  w.waterCells=d.waterCells.slice(0,GROUND_DIG_LIMIT).filter(v=>{
   if(!Array.isArray(v)||v.length<2||!Number.isInteger(v[0])||!Number.isInteger(v[1])||Math.abs(v[0])>WORLD_LIMIT||Math.abs(v[1])>WORLD_LIMIT)return false;
   const key=v[0]+','+v[1];if(!dug.has(key)||seen.has(key))return false;seen.add(key);return true;
  }).map(v=>[v[0],v[1]]);
 }
 const dugDepths=new Map(w.excavations.map(([x,z,depth])=>[x+','+z,depth]));
 const waterColumns=new Map();
 if(Array.isArray(d.waterLevels)){
  for(const v of d.waterLevels.slice(0,GROUND_DIG_LIMIT)){
   if(!Array.isArray(v)||v.length<3)continue;
   const [x,z,level]=v,depth=dugDepths.get(x+','+z),key=x+','+z;
   if(!Number.isInteger(x)||!Number.isInteger(z)||!Number.isInteger(level)||Math.abs(x)>WORLD_LIMIT||Math.abs(z)>WORLD_LIMIT||!depth||level<1||level>depth||waterColumns.has(key))continue;
   waterColumns.set(key,[x,z,level]);
  }
 }else{
  for(const [x,z] of w.waterCells){const key=x+','+z,depth=dugDepths.get(key);if(depth)waterColumns.set(key,[x,z,1]);}
 }
 w.waterLevels=Array.from(waterColumns.values());
 w.waterCells=w.waterLevels.map(([x,z])=>[x,z]);
 if(Array.isArray(d.fish)){
  const wet=new Set(w.waterCells.map(([x,z])=>x+','+z)),counts=new Map();
  w.fish=d.fish.slice(0,GROUND_DIG_LIMIT*3).filter(v=>{
   if(!Array.isArray(v)||v.length<2||!Number.isInteger(v[0])||!Number.isInteger(v[1]))return false;
   const key=v[0]+','+v[1],n=counts.get(key)||0;if(!wet.has(key)||n>=3)return false;counts.set(key,n+1);return true;
  }).map(v=>[v[0],v[1]]);
 }
 if(d.player&&typeof d.player==='object'){
  const p=d.player;
  w.player.x=Number.isFinite(p.x)?Math.max(-WORLD_LIMIT,Math.min(WORLD_LIMIT,p.x)):0;
  w.player.y=Number.isFinite(p.y)?Math.max(-MAX_DIG_DEPTH,Math.min(60,p.y)):0;
  w.player.z=Number.isFinite(p.z)?Math.max(-WORLD_LIMIT,Math.min(WORLD_LIMIT,p.z)):4;
  w.player.yaw=Number.isFinite(p.yaw)?p.yaw:0;w.player.pitch=Number.isFinite(p.pitch)?Math.max(-1.25,Math.min(1.25,p.pitch)):0;
  w.player.shirt=validHex(p.shirt,w.player.shirt);w.player.hair=validHex(p.hair,w.player.hair);w.player.skin=validHex(p.skin,w.player.skin);
  w.player.pants=validHex(p.pants,w.player.pants);w.player.shoes=validHex(p.shoes,w.player.shoes);
  w.player.eyes=validHex(p.eyes,w.player.eyes);w.player.accessoryColor=validHex(p.accessoryColor,w.player.accessoryColor);
  w.player.hairStyle=['short','bob','long','ponytail','pigtails','curly','buns'].includes(p.hairStyle)?p.hairStyle:'short';
  w.player.outfitStyle=['hoodie','sweater','overalls','dress','tee'].includes(p.outfitStyle)?p.outfitStyle:'hoodie';
  w.player.accessory=['none','bow','flower','glasses','cap'].includes(p.accessory)?p.accessory:'none';
  w.player.bed=null;
  if(p.bed&&typeof p.bed==='object'&&Number.isFinite(p.bed.x)&&Number.isFinite(p.bed.z)&&Math.abs(p.bed.x)<=WORLD_LIMIT&&Math.abs(p.bed.z)<=WORLD_LIMIT){
   w.player.bed={x:Math.max(-WORLD_LIMIT,Math.min(WORLD_LIMIT,p.bed.x)),y:Number.isFinite(p.bed.y)?Math.max(-MAX_DIG_DEPTH,Math.min(64,p.bed.y)):0,z:Math.max(-WORLD_LIMIT,Math.min(WORLD_LIMIT,p.bed.z)),yaw:Number.isFinite(p.bed.yaw)?p.bed.yaw:0};
  }
 }
 for(const key of ['materials','crafted'])if(Array.isArray(d[key]))w[key]=d[key].slice(0,60).map(s=>s&&ITEM_META[s.id]?{id:s.id,count:Math.max(1,Math.min(99,Number(s.count)||1)),label:typeof s.label==='string'?s.label.slice(0,28):''}:null).concat(emptySlots()).slice(0,60);
 if(Array.isArray(d.bucket)){
  const validTypes=new Set([...BLOCKS.map(b=>b.id),'custom','water']);
  w.bucket=d.bucket.slice(0,MAX_BUCKET_ITEMS).filter(item=>item&&validTypes.has(item.type)).map(item=>{
   const saved={type:item.type};
   if(/^#[0-9a-f]{6}$/i.test(item.color||''))saved.color=item.color;
   if(CUSTOM_TEXTURES.some(t=>t.id===item.texture))saved.texture=item.texture;
   if(TILE_DESIGNS.some(t=>t.id===item.tilePattern))saved.tilePattern=item.tilePattern;
   if(['classic','window','garden'].includes(item.style))saved.style=item.style;
   if(item.orientation==='ew'||item.orientation==='ns')saved.orientation=item.orientation;
   if(item.type==='door'){saved.open=false;saved.swing=item.swing===-1?-1:1;}
   return saved;
  });
 }
 if(Array.isArray(d.artworks))w.artworks=d.artworks.slice(0,20).filter(a=>a&&typeof a.data==='string'&&a.data.startsWith('data:image/png;base64,')&&a.data.length<550000).map(a=>({name:String(a.name||'Artwork').slice(0,28),data:a.data}));
 if(d.animalCare&&typeof d.animalCare==='object'){for(const [id,count] of Object.entries(d.animalCare).slice(0,200)){if(/^[a-zA-Z0-9_-]{1,40}$/.test(id))w.animalCare[id]=Math.max(0,Math.min(999,Number(count)||0));}}
 return w;
}
let toastTimer=0,storageUnavailable=false;
function load(){try{const s=localStorage.getItem(STORE_KEY);if(s)return validWorld(JSON.parse(s));}catch(e){storageUnavailable=true;showStatus('Device storage is unavailable. Use Backup to keep your world.');}return freshWorld();}
let world=load(),selected='grass',selectedBucketItem=null,placementPaused=false,toolMode='build',cameraMode='first',flying=false,controllersHidden=false,focusMode=false,moveX=0,moveZ=0,vertical=0,keys={},lastTime=0,frameAccumulator=0,artDrawing=false,artLast=null,inventoryTab='bucket',drag=null;
let selectedAnimalId='sheep',selectedAnimalName='Pip the sheep',animalCareFlashUntil=0,animalCareFlashEmoji='💚';
let jumpVelocity=0,playerGrounded=true,playerActivity='';
const PLAYER_JUMP_SPEED=6.4,PLAYER_GRAVITY=14.5;
const blockMap=new Map(BLOCKS.map(b=>[b.id,b]));blockMap.set('custom',{id:'custom',name:'Custom color',emoji:'🎨',color:'#aa83d8'});
const TIME_PALETTES={
 day:{sky:['#8fc6e2','#d8e9d2','#b3d39a'],ground:'#80bd65',sun:'#fff2bc'},
 sunset:{sky:['#a66e82','#e7a07e','#d7a77f'],ground:'#9a8967',sun:'#ffcb83',overlay:'rgba(255,123,79,.07)'},
 night:{sky:['#14213d','#263858','#52606e'],ground:'#465848',overlay:'rgba(8,14,37,.24)'}
};
function getTimePalette(tick){
 let mode=world.timeMode||'day';
 if(mode==='auto'){
  const phase=(tick%180)/180;
  mode=phase<.55?'day':phase<.68?'sunset':'night';
 }
 return {...TIME_PALETTES[mode],mode};
}
function showStatus(s){const el=$('status');el.textContent=s;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2100);}
const TIME_MODE_LABELS={day:'☀️ Day',sunset:'🌇 Sunset',night:'🌙 Night',auto:'🔄 Auto'};
function syncTimeControls(){
 const mode=['day','sunset','night','auto'].includes(world.timeMode)?world.timeMode:'day';
 $('timeOfDay').value=mode;
}
function setTimeMode(mode,announce=true){
 if(!['day','sunset','night','auto'].includes(mode))return;
 world.timeMode=mode;syncTimeControls();save();render();
 if(announce)showStatus(mode==='night'?'Night has arrived. Everyone is tucked in for bed.':mode==='auto'?'Automatic day and night cycle enabled.':TIME_MODE_LABELS[mode]+' selected.');
}
function save(silent=true){try{world.name=$('worldName').value.trim().slice(0,30)||world.name;localStorage.setItem(STORE_KEY,JSON.stringify(world));if(!silent)showStatus('World saved on this device.');}catch(e){if(!storageUnavailable){storageUnavailable=true;if(!silent)showStatus('Device storage is unavailable. Use Backup to keep your world.');}}}
function addItem(id,target='crafted',label=''){const arr=world[target];const same=arr.find(v=>v&&v.id===id&&v.count<99);if(same){same.count++;return true;}const i=arr.findIndex(v=>!v);if(i<0)return false;arr[i]={id,count:1,label};return true;}
function addBucketItem(block){
 if(!world.bucket)world.bucket=[];
 if(world.bucket.length>=MAX_BUCKET_ITEMS)return false;
 const item={type:block.type};
 for(const key of ['color','texture','tilePattern','style','orientation','swing'])if(block[key]!==undefined)item[key]=block[key];
 if(SOLID_STYLE_TYPES.includes(block.type)){
  const meta=BLOCKS.find(b=>b.id===block.type);
  if(!item.color)item.color=meta?.color||'#9a9a9a';
  if(!item.texture)item.texture=block.type;
 }
 world.bucket.push(item);return true;
}
function consumeItem(id,target='materials',amount=1){const arr=world[target]||[];let left=amount;for(let i=0;i<arr.length&&left>0;i++){const item=arr[i];if(!item||item.id!==id)continue;const take=Math.min(left,item.count);item.count-=take;left-=take;if(item.count<=0)arr[i]=null;}return left===0;}
function syncToolButtons(){
 const button=$('fishModeToggle');
 if(button)button.textContent='🐟 Fish placement: '+(toolMode==='fish'?'On':'Off');
 $('topHint').textContent=toolMode==='fish'
  ?'Fish placement · Tap a water cell to add a fish'
  :toolMode==='animal'
   ?'Animal placement · Tap anywhere on the ground to drop your animal'
   :placementPaused
    ?'Block placement paused · Choose a block to resume · Hold 0.6s to dig or remove'
    :selected==='water'
     ?'Water block selected · Tap water to stack another layer · Hold to collect a layer'
     :'Tap to build or fill · Hold 0.6s to dig soil or remove a block';
}
function setToolMode(mode,announce=true){
 toolMode=mode==='fish'?'fish':mode==='animal'?'animal':'build';
 syncToolButtons();
 if(announce)showStatus(toolMode==='fish'?'Fish placement enabled. Tap a water cell to add a fish.':toolMode==='animal'?'Animal placement enabled. Tap on the ground to drop your animal.':'Build mode ready.');
}
function pauseBuildPlacement(){
 placementPaused=true;
 selectedBucketItem=null;
 syncToolButtons();
 renderHotbar();
 showStatus('Block placement paused. Choose any block to start building again.');
}
function chooseMaterial(type){
 selected=type;selectedBucketItem=null;placementPaused=false;setToolMode('build',false);renderHotbar();
}
function openBucket(){
 inventoryTab='bucket';
 document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab==='bucket'));
 renderSlots();openShade('inventoryShade');
}
let selectedSpawnSpecies = 'sheep';

function openAnimalPicker(){
 toolMode='animal';
 syncToolButtons();
 renderHotbar();
 let shade=$('animalPickerShade');
 if(!shade){
  shade=document.createElement('div');
  shade.id='animalPickerShade';
  shade.className='menu-shade';
  shade.innerHTML=`<div class="menu-card"><h3>Choose an Animal to Drop 🐾</h3><p class="note">Tap an animal, then tap anywhere on the ground to place it!</p><div id="animalChoices" class="grid-choices" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:12px 0;"></div><button type="button" class="primary" data-close>Done</button></div>`;
  document.body.append(shade);
  shade.addEventListener('pointerdown',e=>{if(e.target===shade)closeShades();});
  shade.querySelector('[data-close]').addEventListener('click',closeShades);
 }
 const container=$('animalChoices');
 container.replaceChildren();
 const list=[
  {species:'sheep',name:'Sheep',emoji:'🐑'},
  {species:'cat',name:'Cat',emoji:'🐱'},
  {species:'dog',name:'Dog',emoji:'🐶'},
  {species:'cow',name:'Cow',emoji:'🐮'},
  {species:'horse',name:'Horse',emoji:'🐴'},
  {species:'bird',name:'Bird',emoji:'🐦'},
  {species:'giraffe',name:'Giraffe',emoji:'🦒'}
 ];
 list.forEach(item=>{
  const btn=document.createElement('button');
  btn.type='button';
  btn.className=selectedSpawnSpecies===item.species?'primary':'';
  btn.style.cssText='padding:10px;font-size:14px;display:flex;align-items:center;gap:8px;justify-content:center;';
  btn.textContent=item.emoji+' '+item.name;
  btn.addEventListener('click',()=>{
   selectedSpawnSpecies=item.species;
   toolMode='animal';
   closeShades();
   showStatus(item.name+' selected! Tap anywhere on the ground to place it.');
   renderHotbar();
   syncToolButtons();
  });
  container.append(btn);
 });
 openShade('animalPickerShade');
}

function spawnWorldElements(px,py,hit){
 const targetHit=hit||rayHitAtScreen(px,py);
 if(!targetHit){showStatus('Tap on the ground to place your animal.');return;}
 const x=targetHit.place?targetHit.place.x:(targetHit.x!==undefined?targetHit.x:world.player.x);
 const z=targetHit.place?targetHit.place.z:(targetHit.z!==undefined?targetHit.z:world.player.z);
 
 if(!Array.isArray(world.animals))world.animals=[];
 const speciesName=selectedSpawnSpecies.charAt(0).toUpperCase()+selectedSpawnSpecies.slice(1);
 world.animals.push({
  id:'spawned_'+Date.now()+'_'+Math.floor(Math.random()*1000),
  species:selectedSpawnSpecies,
  name:speciesName,
  x:x+0.5,
  z:z+0.5,
  facing:Math.random()*Math.PI*2,
  phase:Math.random()*5
 });
 save();
 render();
 showStatus('A new '+speciesName+' appeared in your world! 🎉');
}
function renderHotbar(){
 const root=$('hotbar');root.replaceChildren();
 const categories=[
  {id:'solid',label:'Solid',icon:'🧱',title:'Choose a solid block'},
  {id:'tile',label:'Slabs / Tiles',icon:'▦',title:'Design and select slabs or tiles'},
  {id:'door',label:'Door',icon:'🚪',title:'Design and select a door'},
  {id:'water',label:'Water',icon:'💧',title:'Select the water block'},
  {id:'animal',label:'Animals',icon:'🐄',title:'Choose an animal to drop'}, // <--- Comma fixed here!
  {id:'bucket',label:'Bucket',icon:'🪣',title:'Open the Material Bucket'},
  {id:'pause',label:placementPaused?'No Block':'Pause',icon:'✋',title:'Pause block placement'}
 ];
 categories.forEach(item=>{
  const btn=document.createElement('button');btn.type='button';btn.className='material-category';
  const icon=document.createElement('span');icon.className='emoji';icon.textContent=item.icon;
  const label=document.createElement('small');label.textContent=item.label;btn.append(icon,label);btn.title=item.title;
  
  const active=(item.id==='pause'&&placementPaused)||(!placementPaused&&((item.id==='solid'&&['grass','dirt','stone','wood','leaves','brick','glass','flower','tall_grass','sand','snow','custom'].includes(selected))
   ||(item.id==='tile'&&selected==='tile')||(item.id==='door'&&selected==='door')||(item.id==='water'&&selected==='water')||(item.id==='animal'&&toolMode==='animal')));
  if(active)btn.classList.add('active');
  
  btn.addEventListener('click',()=>{
   if(item.id==='pause'){pauseBuildPlacement();return;}
   if(item.id==='solid'){openSolidPicker();return;}
   if(item.id==='tile'){selectedBucketItem=null;setToolMode('build',false);openTileDesigner();return;}
   if(item.id==='door'){selectedBucketItem=null;setToolMode('build',false);openDoorDesigner();return;}
   if(item.id==='water'){chooseMaterial('water');return;}
   if(item.id==='animal'){openAnimalPicker();return;}
   openBucket();
  });
  root.append(btn);
 });
}
function renderSolidPicker(){
 const root=$('solidPickerChoices');root.replaceChildren();
 const choices=BLOCKS.filter(b=>!['tile','door'].includes(b.id));
 choices.forEach(item=>{
  const btn=document.createElement('button');btn.type='button';
  btn.textContent=item.emoji+' '+item.name;
  btn.className=selected===item.id?'primary':'';
  btn.addEventListener('click',()=>{chooseMaterial(item.id);closeShades();showStatus(item.name+' selected. Tap to build; hold to dig or remove.');});
  root.append(btn);
 });
 const custom=document.createElement('button');custom.type='button';custom.textContent='🎨 Custom solid';custom.className=selected==='custom'?'primary':'';
 custom.addEventListener('click',()=>{chooseMaterial('custom');closeShades();openCustomBlockDesigner();});
 root.append(custom);
}
function openSolidPicker(){renderSolidPicker();openShade('solidPickerShade');}
function keyBlock(x,y,z){return x+','+y+','+z;}
const STARTER_BLOCK_KEYS=new Set(freshWorld().blocks.map(b=>keyBlock(b.x,b.y,b.z)));
function clearPlacedBlocks(){const before=world.blocks.length;world.blocks=world.blocks.filter(b=>STARTER_BLOCK_KEYS.has(keyBlock(b.x,b.y,b.z)));rebuildLookup();save();render();showStatus(Math.max(0,before-world.blocks.length)+' placed blocks cleared. Starter garden and homes are safe.');}
function keyGround(x,z){return Math.floor(x)+','+Math.floor(z);}
let groundDepths=new Map((world.excavations||[]).map(([x,z,depth])=>[keyGround(x,z),depth]));
function groundDepthAt(x,z){return groundDepths.get(keyGround(x,z))||0;}
function syncExcavations(){world.excavations=Array.from(groundDepths,([key,depth])=>{const [x,z]=key.split(',').map(Number);return [x,z,depth];});}
let waterLevels=new Map();
for(const [x,z] of world.waterCells||[])waterLevels.set(keyGround(x,z),1);
for(const [x,z,level] of world.waterLevels||[])waterLevels.set(keyGround(x,z),level);
let waterCells=new Set(waterLevels.keys());
let fishSpots=(world.fish||[]).map(([x,z])=>({x,z}));
const RENDER_CHUNK_SIZE=16;
const BLOCK_RENDER_DISTANCE_CHUNKS=1.5;
const BLOCK_RENDER_RADIUS=RENDER_CHUNK_SIZE*BLOCK_RENDER_DISTANCE_CHUNKS;
let blockRenderChunks=new Map(),excavationRenderChunks=new Map(),waterRenderChunks=new Map(),fishRenderChunks=new Map();
function isPlantBlock(block){return !!block&&(block.type==='flower'||block.type==='tall_grass');}
const MAX_BLOCK_CHUNK_CACHE=16,OPAQUE_CUBE_TYPES=new Set([...SOLID_STYLE_TYPES.filter(type=>type!=='flower'),'custom']);
let blockChunkMeshCache=new Map();
function renderChunkKey(x,z){return Math.floor(x/RENDER_CHUNK_SIZE)+','+Math.floor(z/RENDER_CHUNK_SIZE);}
function isOpaqueCubeBlock(block){return !!block&&!isPlantBlock(block)&&OPAQUE_CUBE_TYPES.has(block.type);}
function invalidateBlockChunkMeshesAt(x,z){
 for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)blockChunkMeshCache.delete(renderChunkKey(x+dx,z+dz));
}
function projectedPolygonVisible(pts,w,h,margin=2){
 if(!pts||!pts.length)return false;
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const p of pts){if(!p)return false;minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}
 return maxX>=-margin&&minX<=w+margin&&maxY>=-margin&&minY<=h+margin;
}
function chunkBoundsVisible(bounds,cam,w,h,margin=16){
 if(!bounds||!(w>0&&h>0))return true;
 let minScreenX=Infinity,minScreenY=Infinity,maxScreenX=-Infinity,maxScreenY=-Infinity;
 for(const x of [bounds.minX,bounds.maxX])for(const y of [bounds.minY,bounds.maxY])for(const z of [bounds.minZ,bounds.maxZ]){
  const point=project({x,y,z},cam,w,h);
  if(!point)return true;
  minScreenX=Math.min(minScreenX,point.x);maxScreenX=Math.max(maxScreenX,point.x);
  minScreenY=Math.min(minScreenY,point.y);maxScreenY=Math.max(maxScreenY,point.y);
 }
 return maxScreenX>=-margin&&minScreenX<=w+margin&&maxScreenY>=-margin&&minScreenY<=h+margin;
}
function blockFaceTexture(block,normal,fallback){
 const [nx,ny,nz]=normal;
 if(block.texture)return fallback;
 if(block.type==='grass'){
  if(ny>0)return 'grass';
  if(ny<0)return 'dirt';
  return nx>0||nz<0?'grass-side-right':'grass-side-bottom';
 }
 if(block.type==='wood'){
  if(ny!==0)return 'wood-end';
  return nx>0||nz<0?'wood-side-horizontal':'wood-side-vertical';
 }
 return fallback;
}
function blockFaceColor(block,normal,baseColor){
 const [nx,ny,nz]=normal;
 if(block.texture)return baseColor;
 if(block.type==='grass'){
  if(ny<0)return '#765039';
  if(ny===0)return '#8e6544';
 }
 if(block.type==='wood'){
  if(ny!==0)return '#b98550';
  return '#98643d';
 }
 return baseColor;
}
function buildBlockChunkMesh(key,items){
 const faces=[],specials=[];
 let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
 for(const block of items){
  const door=block.type==='door',tile=block.type==='tile',plant=isPlantBlock(block);
  const x0=door?block.x-1:block.x,x1=door?block.x+2:block.x+1;
  const z0=door?block.z-1:block.z,z1=door?block.z+2:block.z+1;
  const y0=block.y,y1=block.y+(door?2:tile?TILE_BASE_OFFSET+TILE_THICKNESS:1);
  minX=Math.min(minX,x0);minY=Math.min(minY,y0);minZ=Math.min(minZ,z0);
  maxX=Math.max(maxX,x1);maxY=Math.max(maxY,y1);maxZ=Math.max(maxZ,z1);
  if(door||plant){specials.push(block);continue;}
  if(tile){
   const pattern=TILE_DESIGNS.some(t=>t.id===block.tilePattern)?block.tilePattern:'grid';
   const color=validHex(block.color,'#c5a98a');
   const vertices=cubeVerts(block.x,block.y+TILE_BASE_OFFSET,block.z,1,TILE_THICKNESS,1);
   for(const face of FACES){
    const [nx,ny,nz]=face.normal;
    faces.push({center:{x:block.x+.5+nx*.5,y:block.y+TILE_BASE_OFFSET+TILE_THICKNESS/2+ny*TILE_THICKNESS/2,z:block.z+.5+nz*.5},normal:face.normal,
     vertices:face.ids.map(index=>vertices[index]),color:shadeColor(color,face.shade),material:null,customTint:false,outline:true,
     ...(ny===1?{tileTexture:textureTiles.get('tile-'+pattern)}:{})});
   }
   continue;
  }
  if(!isOpaqueCubeBlock(block))continue;
  const meta=blockMap.get(block.type);
  const color=block.type==='custom'?validHex(block.color,'#aa83d8'):block.color?validHex(block.color,meta?.color||'#a0a0a0'):meta?.color;
  if(!color)continue;
  const texture=block.texture||(block.type==='custom'?'custom':block.type),vertices=cubeVerts(block.x,block.y,block.z);
  for(const face of FACES){
   const [nx,ny,nz]=face.normal,neighbor=blockLookup.get(keyBlock(block.x+nx,block.y+ny,block.z+nz));
   if(isOpaqueCubeBlock(neighbor))continue;
   const material=blockFaceTexture(block,face.normal,texture);
   const faceColor=blockFaceColor(block,face.normal,color);
   faces.push({center:{x:block.x+.5+nx*.5,y:block.y+.5+ny*.5,z:block.z+.5+nz*.5},normal:face.normal,
    vertices:face.ids.map(index=>vertices[index]),color:shadeColor(faceColor,face.shade),material,customTint:!!block.color,outline:true});
  }
 }
 const bounds=Number.isFinite(minX)?{minX,minY,minZ,maxX,maxY,maxZ}:null;
 return {key,faces,specials,bounds};
}
function getBlockChunkMesh(key,items){
 let mesh=blockChunkMeshCache.get(key);
 if(mesh){blockChunkMeshCache.delete(key);blockChunkMeshCache.set(key,mesh);return mesh;}
 mesh=buildBlockChunkMesh(key,items);blockChunkMeshCache.set(key,mesh);
 if(blockChunkMeshCache.size>MAX_BLOCK_CHUNK_CACHE)blockChunkMeshCache.delete(blockChunkMeshCache.keys().next().value);
 return mesh;
}
function visitNearbyBlockChunkMeshes(cam,radius,visit,w,h){
 const minX=Math.floor((cam.pos.x-radius)/RENDER_CHUNK_SIZE),maxX=Math.floor((cam.pos.x+radius)/RENDER_CHUNK_SIZE);
 const minZ=Math.floor((cam.pos.z-radius)/RENDER_CHUNK_SIZE),maxZ=Math.floor((cam.pos.z+radius)/RENDER_CHUNK_SIZE);
 for(let cx=minX;cx<=maxX;cx++)for(let cz=minZ;cz<=maxZ;cz++){
  const key=cx+','+cz,items=blockRenderChunks.get(key);if(!items||!items.length)continue;
  const mesh=getBlockChunkMesh(key,items);
  if(Number.isFinite(w)&&Number.isFinite(h)&&!chunkBoundsVisible(mesh.bounds,cam,w,h,16))continue;
  visit(mesh);
 }
}
function appendBlockChunkMesh(queue,mesh,cam,w,h){
 for(const face of mesh.faces){
  const [nx,ny,nz]=face.normal,viewX=cam.pos.x-face.center.x,viewY=cam.pos.y-face.center.y,viewZ=cam.pos.z-face.center.z;
  if(nx*viewX+ny*viewY+nz*viewZ<=0)continue;
  const pts=face.vertices.map(vertex=>project(vertex,cam,w,h));
  if(pts.some(point=>!point)||!projectedPolygonVisible(pts,w,h,2))continue;
  queue.push({...face,pts,depth:pts.reduce((sum,point)=>sum+point.d,0)/pts.length});
 }
}
function addRenderChunkItem(map,x,z,item){
 const key=renderChunkKey(x,z);let items=map.get(key);
 if(!items){items=[];map.set(key,items);}
 items.push(item);
}
function removeRenderChunkItem(map,x,z,item){
 const key=renderChunkKey(x,z),items=map.get(key);if(!items)return;
 const index=items.indexOf(item);if(index>=0)items.splice(index,1);
 if(!items.length)map.delete(key);
}
function visitNearbyRenderChunks(map,cam,radius,visit){
 const minX=Math.floor((cam.pos.x-radius)/RENDER_CHUNK_SIZE),maxX=Math.floor((cam.pos.x+radius)/RENDER_CHUNK_SIZE);
 const minZ=Math.floor((cam.pos.z-radius)/RENDER_CHUNK_SIZE),maxZ=Math.floor((cam.pos.z+radius)/RENDER_CHUNK_SIZE);
 for(let cx=minX;cx<=maxX;cx++)for(let cz=minZ;cz<=maxZ;cz++){
  const items=map.get(cx+','+cz);if(items)for(let i=0;i<items.length;i++)visit(items[i]);
 }
}
function rebuildFishRenderChunks(){
 fishRenderChunks=new Map();
 fishSpots.forEach((fish,index)=>addRenderChunkItem(fishRenderChunks,fish.x,fish.z,{fish,index}));
}
function rebuildRenderChunks(){
 blockRenderChunks=new Map();excavationRenderChunks=new Map();waterRenderChunks=new Map();blockChunkMeshCache.clear();
 for(const block of world.blocks)addRenderChunkItem(blockRenderChunks,block.x,block.z,block);
 for(const cell of groundDepths.keys()){const [x,z]=cell.split(',').map(Number);addRenderChunkItem(excavationRenderChunks,x,z,cell);}
 for(const cell of waterCells){const [x,z]=cell.split(',').map(Number);addRenderChunkItem(waterRenderChunks,x,z,cell);}
 rebuildFishRenderChunks();
}
function waterLevelAt(x,z){return waterLevels.get(keyGround(x,z))||0;}
function waterTopAt(x,z){
 const depth=groundDepthAt(x,z),level=waterLevelAt(x,z);
 if(depth<1||level<1)return null;
 return -depth+Math.min(depth,level)-(level>=depth?.08:0);
}
function syncWaterLife(){
 world.waterCells=Array.from(waterCells,key=>key.split(',').map(Number));
 world.waterLevels=Array.from(waterLevels,([key,level])=>[...key.split(',').map(Number),level]);
 world.fish=fishSpots.map(f=>[f.x,f.z]);
}
let blockLookup=new Map(),blockColumnBlocks=new Map(),worldGeometryRevision=0,neighborObstacleCache=null,neighborPathCache=new Map();
function invalidateNeighborNavigation(){worldGeometryRevision++;neighborObstacleCache=null;neighborPathCache.clear();}
function rebuildLookup(){
 invalidateNeighborNavigation();groundDepths.clear();
 for(const [x,z,depth] of world.excavations||[])groundDepths.set(keyGround(x,z),depth);
 blockLookup=new Map();blockColumnBlocks=new Map();
 for(const b of world.blocks){
  blockLookup.set(keyBlock(b.x,b.y,b.z),b);
  if(b.type==='door'&&b.y<64)blockLookup.set(keyBlock(b.x,b.y+1,b.z),b);
  if(b.type!=='door'){
   const columnKey=keyGround(b.x,b.z);let column=blockColumnBlocks.get(columnKey);
   if(!column){column=[];blockColumnBlocks.set(columnKey,column);}
   column.push(b);
  }
 }
 rebuildRenderChunks();
}
function solid(x,y,z){const block=blockLookup.get(keyBlock(Math.floor(x),Math.floor(y),Math.floor(z)));return !!block&&!isPlantBlock(block);}
function addBlock(x,y,z,type=selected,saveImmediately=true){
 if(y< -MAX_DIG_DEPTH||y>64||Math.abs(x)>WORLD_LIMIT||Math.abs(z)>WORLD_LIMIT||y< -groundDepthAt(x,z))return false;
 const k=keyBlock(x,y,z),upperKey=keyBlock(x,y+1,z);
 if(blockLookup.has(k))return false;
 if(type==='door'&&(y>=64||blockLookup.has(upperKey)))return false;
 if(world.blocks.length>=MAX_BLOCKS){showStatus('This world has reached its safe building limit. Save a backup before expanding.');return false;}
 const b={x,y,z,type};
 if(type==='custom'){b.color=validHex(world.customBlock.color,'#aa83d8');b.texture=CUSTOM_TEXTURES.some(t=>t.id===world.customBlock.texture)?world.customBlock.texture:'custom';}
 if(SOLID_STYLE_TYPES.includes(type)&&world.solidStyles?.[type]){b.color=world.solidStyles[type].color;b.texture=world.solidStyles[type].texture;}
 if(type==='tile'){b.color=validHex(world.tileDesign.color,'#c5a98a');b.tilePattern=TILE_DESIGNS.some(t=>t.id===world.tileDesign.pattern)?world.tileDesign.pattern:'grid';}
 if(type==='door'){b.color=validHex(world.doorDesign.color,'#a97545');b.style=['classic','window','garden'].includes(world.doorDesign.style)?world.doorDesign.style:'classic';b.orientation=Math.abs(Math.cos(world.player.yaw))>=Math.abs(Math.sin(world.player.yaw))?'ns':'ew';b.swing=1;b.open=false;}
 if(selectedBucketItem&&selectedBucketItem.type===type){
  const item=selectedBucketItem;
  for(const key of ['color','texture','tilePattern','style','orientation','swing'])if(item[key]!==undefined)b[key]=item[key];
  if(type==='door')b.open=false;
 }
 world.blocks.push(b);blockLookup.set(k,b);if(type==='door')blockLookup.set(upperKey,b);
 if(type!=='door'){const columnKey=keyGround(b.x,b.z);let column=blockColumnBlocks.get(columnKey);if(!column){column=[];blockColumnBlocks.set(columnKey,column);}column.push(b);}
 addRenderChunkItem(blockRenderChunks,b.x,b.z,b);invalidateBlockChunkMeshesAt(b.x,b.z);
 invalidateNeighborNavigation();if(saveImmediately)save();return true;
}
function removeBlock(x,y,z){
 const k=keyBlock(x,y,z),b=blockLookup.get(k);if(!b)return false;
 if(isProtectedDigCell(b.x,b.z)){showStatus('This block is inside a protected neighbor area. Their homes stay safe!');return false;}
 if(!addBucketItem(b)){showStatus('Your Material Bucket is full. Use or clear some recovered blocks first.');return false;}
 world.blocks=world.blocks.filter(v=>v!==b);removeRenderChunkItem(blockRenderChunks,b.x,b.z,b);blockLookup.delete(keyBlock(b.x,b.y,b.z));
 if(b.type!=='door'){const columnKey=keyGround(b.x,b.z),column=blockColumnBlocks.get(columnKey);if(column){const index=column.indexOf(b);if(index>=0)column.splice(index,1);if(!column.length)blockColumnBlocks.delete(columnKey);}}
 invalidateBlockChunkMeshesAt(b.x,b.z);
 if(b.type==='door')blockLookup.delete(keyBlock(b.x,b.y+1,b.z));
 doorMotions.delete(keyBlock(b.x,b.y,b.z));invalidateNeighborNavigation();save();return true;
}
function cameraState(){const p=world.player,cp=Math.cos(p.pitch),sp=Math.sin(p.pitch),sy=Math.sin(p.yaw),cy=Math.cos(p.yaw);if(cameraMode==='first')return {pos:{x:p.x,y:p.y+1.58,z:p.z},yaw:p.yaw,pitch:p.pitch};const target={x:p.x+sy*6,y:p.y+2.1,z:p.z-cy*6},pos={x:p.x-sy*5.6,y:p.y+2.8,z:p.z+cy*5.6};const dx=target.x-pos.x,dy=target.y-pos.y,dz=target.z-pos.z;return {pos,yaw:Math.atan2(dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz))};}
function project(v,cam,w,h){
 let basis=cam._projection;
 if(!basis){basis=cam._projection={sy:Math.sin(cam.yaw),cy:Math.cos(cam.yaw),sp:Math.sin(cam.pitch),cp:Math.cos(cam.pitch),width:0,height:0,focal:0};}
 if(basis.width!==w||basis.height!==h){basis.width=w;basis.height=h;basis.focal=Math.min(w,h)*.94;}
 const dx=v.x-cam.pos.x,dy=v.y-cam.pos.y,dz=v.z-cam.pos.z;
 const rx=dx*basis.cy+dz*basis.sy,uy=-dx*basis.sy*basis.sp+dy*basis.cp+dz*basis.cy*basis.sp;
 const depth=dx*basis.sy*basis.cp+dy*basis.sp-dz*basis.cy*basis.cp;
 if(depth<.12)return null;
 return {x:w/2+rx*basis.focal/depth,y:h*.51-uy*basis.focal/depth,d:depth};
}
function skyDirection(azimuth,altitude){
 const horizontal=Math.cos(altitude);
 return {x:Math.sin(azimuth)*horizontal,y:Math.sin(altitude),z:-Math.cos(azimuth)*horizontal};
}
function projectSkyPoint(cam,direction,w,h,distance=700){
 return project({x:cam.pos.x+direction.x*distance,y:cam.pos.y+direction.y*distance,z:cam.pos.z+direction.z*distance},cam,w,h);
}
function drawSkyDecorations(cam,w,h,palette){
 if(palette.mode==='night'){
  for(let i=0;i<44;i++){
   const azimuth=-Math.PI+(i*2.399963229728653)%(Math.PI*2);
   const altitude=.18+((i*37)%76)/100;
   const star=projectSkyPoint(cam,skyDirection(azimuth,altitude),w,h);
   if(!star||star.x<0||star.x>w||star.y<0||star.y>h*.82)continue;
   ctx.globalAlpha=.42+(i%4)*.13;ctx.fillStyle='#fffbe0';ctx.beginPath();ctx.arc(star.x,star.y,.8+(i%3)*.45,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  const moon=projectSkyPoint(cam,skyDirection(-.48,.29),w,h);
  if(moon&&moon.x>-60&&moon.x<w+60&&moon.y>-60&&moon.y<h+60){
   const radius=Math.min(w,h)*.041;
   ctx.save();ctx.shadowColor='#f6f0ce88';ctx.shadowBlur=radius*.9;ctx.fillStyle='#f6f0ce';
   ctx.beginPath();ctx.arc(moon.x,moon.y,radius,0,Math.PI*2);ctx.fill();
   ctx.shadowBlur=0;ctx.fillStyle=palette.sky[0];ctx.beginPath();ctx.arc(moon.x+radius*.43,moon.y-radius*.25,radius*.86,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  return;
 }
 const direction=palette.mode==='sunset'?skyDirection(.98,.12):skyDirection(.42,.29);
 const sun=projectSkyPoint(cam,direction,w,h);
 if(!sun||sun.x<-70||sun.x>w+70||sun.y<-70||sun.y>h+70)return;
 const radius=Math.min(w,h)*(palette.mode==='sunset'?.047:.043);
 ctx.save();const glow=ctx.createRadialGradient(sun.x,sun.y,radius*.25,sun.x,sun.y,radius*2.2);
 glow.addColorStop(0,'#fff4ceaa');glow.addColorStop(1,'#fff4ce00');
 ctx.fillStyle=glow;ctx.beginPath();ctx.arc(sun.x,sun.y,radius*2.2,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=palette.sun;ctx.beginPath();ctx.arc(sun.x,sun.y,radius,0,Math.PI*2);ctx.fill();ctx.restore();
}
const FACES=[{ids:[0,1,2,3],normal:[0,-1,0],shade:.68},{ids:[4,7,6,5],normal:[0,1,0],shade:1.08},{ids:[0,4,5,1],normal:[0,0,-1],shade:.82},{ids:[3,2,6,7],normal:[0,0,1],shade:.90},{ids:[0,3,7,4],normal:[-1,0,0],shade:.76},{ids:[1,5,6,2],normal:[1,0,0],shade:1.0}];
function cubeVerts(x,y,z,sx=1,sy=1,sz=1){return [{x,y,z},{x:x+sx,y,z},{x:x+sx,y,z:z+sz},{x,y,z:z+sz},{x,y:y+sy,z},{x:x+sx,y:y+sy,z},{x:x+sx,y:y+sy,z:z+sz},{x,y:y+sy,z:z+sz}];}
function shadeColor(hex,mul){const n=parseInt(hex.slice(1),16),r=Math.min(255,Math.max(0,Math.round(((n>>16)&255)*mul))),g=Math.min(255,Math.max(0,Math.round(((n>>8)&255)*mul))),b=Math.min(255,Math.max(0,Math.round((n&255)*mul)));return `rgb(${r},${g},${b})`;}
const DEFAULT_FLOWER_PETAL_COLOR='#e9a4c1';
function drawFlowerPlantTexture(c,petalColor=DEFAULT_FLOWER_PETAL_COLOR){
 c.clearRect(0,0,96,96);c.lineCap='round';c.lineJoin='round';
 c.strokeStyle='#397f43';c.lineWidth=5;c.beginPath();c.moveTo(48,94);c.quadraticCurveTo(42,62,49,37);c.stroke();
 c.fillStyle='#4b984b';c.beginPath();c.ellipse(34,70,14,5,-.48,0,Math.PI*2);c.fill();
 c.beginPath();c.ellipse(61,58,13,5,.48,0,Math.PI*2);c.fill();
 const cx=49,cy=26;
 for(let i=0;i<8;i++){const a=i*Math.PI/4;c.fillStyle=shadeColor(petalColor,i%2?.88:1.12);c.beginPath();c.ellipse(cx+Math.cos(a)*12,cy+Math.sin(a)*12,10,6,a,0,Math.PI*2);c.fill();}
 c.fillStyle='#f2cb59';c.beginPath();c.arc(cx,cy,7,0,Math.PI*2);c.fill();
 c.fillStyle='#fff0a0';c.beginPath();c.arc(cx-2,cy-2,2,0,Math.PI*2);c.fill();
}
const TEXTURE_REFERENCE_SIZE=96,TEXTURE_TILE_SIZE=32,TEXTURE_DRAW_SCALE=TEXTURE_TILE_SIZE/TEXTURE_REFERENCE_SIZE;
const texturePatterns=new Map(),textureTiles=new Map();
const flowerPlantTextureCache=new Map();
function getFlowerPlantTexture(color){
 const hex=validHex(color,DEFAULT_FLOWER_PETAL_COLOR).toLowerCase();
 const cached=flowerPlantTextureCache.get(hex);
 if(cached){flowerPlantTextureCache.delete(hex);flowerPlantTextureCache.set(hex,cached);return cached;}
 const tile=document.createElement('canvas');tile.width=tile.height=TEXTURE_TILE_SIZE;
 const c=tile.getContext('2d');c.scale(TEXTURE_DRAW_SCALE,TEXTURE_DRAW_SCALE);
 drawFlowerPlantTexture(c,hex);flowerPlantTextureCache.set(hex,tile);
 if(flowerPlantTextureCache.size>32)flowerPlantTextureCache.delete(flowerPlantTextureCache.keys().next().value);
 return tile;
}
function makeTexturePatterns(){
 const makers={
  grass:c=>{
   for(let i=0;i<58;i++){
    const x=(i*29+7)%96,y=(i*47+5)%96;
    c.strokeStyle=i%5===0?'#dce89caa':i%3===0?'#245d35aa':'#3f833eaa';
    c.lineWidth=1+(i%3)*.55;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-2+(i%5),y-5,x+1,y-8-(i%4));c.stroke();
   }
   for(let i=0;i<34;i++){c.fillStyle=i%4===0?'#e5ce7e99':i%2?'#285e35aa':'#4b963e99';c.beginPath();c.arc((i*31+5)%96,(i*19+11)%96,.8+(i%3)*.8,0,Math.PI*2);c.fill();}
   c.strokeStyle='#a4cf7955';c.lineWidth=1;for(let y=14;y<96;y+=31){c.beginPath();c.moveTo(0,y);c.quadraticCurveTo(37,y-3,96,y+2);c.stroke();}
  },
  dirt:c=>{
   c.fillStyle='#765039';c.fillRect(0,0,96,96);
   for(let i=0;i<150;i++){
    const x=(i*37+11)%96,y=(i*53+7)%96;
    c.fillStyle=i%7===0?'#e0b77a99':i%5===0?'#3f2a2099':i%3===0?'#966b4799':'#5a3c2c99';
    c.beginPath();c.ellipse(x,y,1+(i%4)*.7,.8+(i%3)*.65,i*.39,0,Math.PI*2);c.fill();
   }
   for(let i=0;i<12;i++){
    const x=(i*31+13)%96,y=(i*47+19)%96;
    c.fillStyle=i%2?'#a77b5099':'#4a302499';
    c.beginPath();c.ellipse(x,y,5+(i%3)*2,2.3+(i%2)*1.7,i*.54,0,Math.PI*2);c.fill();
    c.strokeStyle='#d4a87555';c.lineWidth=1;c.beginPath();c.arc(x-1,y-1,3+(i%2),.2,2.5);c.stroke();
   }
   c.strokeStyle='#c99c6b55';c.lineWidth=1.4;
   for(let y=9;y<96;y+=19){c.beginPath();c.moveTo(0,y);c.quadraticCurveTo(24,y-5,49,y+1);c.quadraticCurveTo(73,y+5,96,y-2);c.stroke();}
   for(let i=0;i<26;i++){c.fillStyle='#dcb77a77';c.fillRect((i*23+5)%96,(i*41+3)%96,1,1);}
  },
  stone:c=>{c.fillStyle='#ffffff18';c.fillRect(0,0,96,96);c.strokeStyle='#626e6b99';c.lineWidth=2;[[4,8,24,22],[32,2,47,17],[60,11,83,25],[10,48,31,65],[43,39,57,57],[68,58,91,78],[22,78,42,93]].forEach(a=>{c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(a[2],a[3]);c.lineTo(a[2]-4,a[3]+7);c.stroke();});for(let i=0;i<42;i++){c.fillStyle=i%2?'#f2f5ef88':'#4b555455';c.fillRect((i*23)%96,(i*41)%96,2+(i%3),1.5+(i%2));}},
  wood:c=>{for(let y=4;y<96;y+=13){c.strokeStyle=y%2?'#603818aa':'#eac58a99';c.lineWidth=y%2?2:1.4;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(22,y-5,40,y+5,62,y);c.bezierCurveTo(76,y-3,85,y+4,96,y-1);c.stroke();}[[25,28],[72,70]].forEach(([x,y])=>{c.strokeStyle='#673d2199';c.lineWidth=1.7;c.beginPath();c.ellipse(x,y,9,5,.2,0,Math.PI*2);c.ellipse(x,y,4,2,.2,0,Math.PI*2);c.stroke();});},
  leaves:c=>{for(let i=0;i<42;i++){const x=(i*29)%96,y=(i*47)%96;c.fillStyle=i%3===0?'#b4d979bb':i%2?'#2d773eaa':'#549c4d99';c.beginPath();c.ellipse(x,y,5+(i%4),2.4+(i%3),i*.72,0,Math.PI*2);c.fill();c.strokeStyle='#245e3999';c.lineWidth=.8;c.beginPath();c.moveTo(x-3,y);c.lineTo(x+4,y);c.stroke();}},
  brick:c=>{c.strokeStyle='#f8dfcacc';c.lineWidth=3;[0,32,64,96].forEach(y=>{c.beginPath();c.moveTo(0,y);c.lineTo(96,y);c.stroke();});[[24,0,24,32],[72,0,72,32],[0,32,0,64],[48,32,48,64],[96,32,96,64],[24,64,24,96],[72,64,72,96]].forEach(a=>{c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(a[2],a[3]);c.stroke();});c.strokeStyle='#9f544955';c.lineWidth=1;c.strokeRect(2,2,92,92);},
  glass:c=>{c.strokeStyle='#ffffffcc';c.lineWidth=3;c.beginPath();c.moveTo(8,80);c.lineTo(38,12);c.moveTo(55,88);c.lineTo(86,25);c.stroke();c.strokeStyle='#75c9d888';c.lineWidth=2;c.strokeRect(5,5,86,86);c.fillStyle='#ffffff44';c.fillRect(12,12,12,5);c.fillRect(65,70,18,4);},
  flower:c=>{for(let i=0;i<24;i++){const x=(i*31)%96,y=(i*47)%96;c.fillStyle=i%3?'#f8d5e5bb':'#a84f89aa';for(let p=0;p<5;p++){c.beginPath();c.ellipse(x+Math.cos(p*1.256)*4,y+Math.sin(p*1.256)*4,2.7,1.8,p*1.256,0,Math.PI*2);c.fill();}c.fillStyle='#f6d46c';c.beginPath();c.arc(x,y,1.6,0,Math.PI*2);c.fill();}},
  tall_grass:c=>{
   c.clearRect(0,0,96,96);c.lineCap='round';c.lineJoin='round';
   const blades=[
    [17,8,7,64,-5],[27,20,20,55,-4],[38,7,32,58,3],
    [49,14,59,54,4],[61,6,76,62,7],[75,24,87,60,4],
    [86,34,78,68,-2],[9,34,22,67,5],[45,29,47,62,-1],
    [57,38,42,70,-5],[31,38,12,73,-3]
   ];
   blades.forEach(([x,tip,control,mid,bend],i)=>{
    c.strokeStyle=['#2f783b','#4b9843','#70ad48','#a7ca54'][i%4];
    c.lineWidth=i%3===0?5.4:4.2;c.beginPath();c.moveTo(x,95);
    c.quadraticCurveTo(control+bend,mid,control,tip);c.stroke();
    c.strokeStyle=i%2?'#c4da70aa':'#d8e88b99';c.lineWidth=1.2;
    c.beginPath();c.moveTo(x,93);c.quadraticCurveTo(control+bend,mid+4,control,tip+8);c.stroke();
   });
   c.strokeStyle='#3f873d';c.lineWidth=3;
   [[24,86,10,72],[43,91,54,76],[68,89,84,74]].forEach(([x,y,tx,ty])=>{c.beginPath();c.moveTo(x,y);c.quadraticCurveTo((x+tx)/2,y-5,tx,ty);c.stroke();});
  },
  'flower-plant':c=>drawFlowerPlantTexture(c,DEFAULT_FLOWER_PETAL_COLOR),
  sand:c=>{for(let i=0;i<115;i++){const x=(i*37)%96,y=(i*61)%96;c.fillStyle=i%3?'#b4945a99':'#fff4c6bb';c.fillRect(x,y,1.4+(i%3),1.2+(i%2));}c.strokeStyle='#fff1bd66';c.lineWidth=1.2;for(let y=18;y<96;y+=29){c.beginPath();c.moveTo(0,y);c.quadraticCurveTo(45,y-8,96,y+1);c.stroke();}},
  snow:c=>{for(let i=0;i<12;i++){const x=(i*29+9)%96,y=(i*41+6)%96;c.strokeStyle=i%2?'#9bc6dcaa':'#ffffffdd';c.lineWidth=1.5;c.beginPath();c.moveTo(x-5,y);c.lineTo(x+5,y);c.moveTo(x,y-5);c.lineTo(x,y+5);c.moveTo(x-3.5,y-3.5);c.lineTo(x+3.5,y+3.5);c.stroke();}for(let i=0;i<25;i++){c.fillStyle='#ffffffdd';c.fillRect((i*17)%96,(i*43)%96,2,2);}},
  custom:c=>{for(let i=0;i<54;i++){c.fillStyle=i%2?'#ffffff66':'#35445a33';c.beginPath();c.arc((i*19)%96,(i*37)%96,1.1+(i%2),0,Math.PI*2);c.fill();}}
 };
 for(const [id,draw] of Object.entries(makers)){const tile=document.createElement('canvas');tile.width=tile.height=TEXTURE_TILE_SIZE;const c=tile.getContext('2d');c.scale(TEXTURE_DRAW_SCALE,TEXTURE_DRAW_SCALE);draw(c);textureTiles.set(id,tile);texturePatterns.set(id,ctx.createPattern(tile,'repeat'));}
 const faceMakers={
  'grass-side-right':c=>{
   for(let i=0;i<46;i++){const x=(i*29+7)%96,y=(i*43+11)%96;c.fillStyle=i%3?'#5c3d2d88':'#b2875b88';c.beginPath();c.ellipse(x,y,1+(i%3),.8+(i%2),i*.4,0,Math.PI*2);c.fill();}
   c.fillStyle='#285d32';c.fillRect(0,0,96,4);c.fillStyle='#4d963f';c.fillRect(0,4,96,14);
   for(let x=4;x<96;x+=9){c.strokeStyle=x%2?'#b4d979':'#2c6e35';c.lineWidth=1.5;c.beginPath();c.moveTo(x,14);c.lineTo(x-3,20+(x%3));c.stroke();}
   c.fillStyle='#8fbd5b';for(let x=7;x<96;x+=19)c.fillRect(x,5,5,2);
  },
  'grass-side-bottom':c=>{
   for(let i=0;i<46;i++){const x=(i*29+7)%96,y=(i*43+11)%96;c.fillStyle=i%3?'#5c3d2d88':'#b2875b88';c.beginPath();c.ellipse(x,y,1+(i%3),.8+(i%2),i*.4,0,Math.PI*2);c.fill();}
   c.fillStyle='#285d32';c.fillRect(0,74,96,4);c.fillStyle='#4d963f';c.fillRect(0,78,96,18);
   for(let x=4;x<96;x+=9){c.strokeStyle=x%2?'#b4d979':'#2c6e35';c.lineWidth=1.5;c.beginPath();c.moveTo(x,82);c.lineTo(x-3,76+(x%3));c.stroke();}
   c.fillStyle='#8fbd5b';for(let x=7;x<96;x+=19)c.fillRect(x,87,2,5);
  },
  'wood-side-horizontal':c=>{
   for(let x=5;x<96;x+=13){c.strokeStyle=x%2?'#603818bb':'#e5bd7f99';c.lineWidth=x%2?2.2:1.2;c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x-4,22,x+5,41,x,63);c.bezierCurveTo(x-4,78,x+4,87,x-1,96);c.stroke();}
   for(let i=0;i<11;i++){const x=(i*37+9)%96,y=(i*29+12)%96;c.strokeStyle=i%2?'#58351f99':'#d5a46b99';c.lineWidth=1.4;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-4,y+5,x+1,y+10);c.stroke();}
   [[28,31],[74,72]].forEach(([x,y])=>{c.strokeStyle='#60391fbb';c.lineWidth=1.7;c.beginPath();c.ellipse(x,y,3,8,.08,0,Math.PI*2);c.ellipse(x,y,1.5,3,.08,0,Math.PI*2);c.stroke();});
  },
  'wood-side-vertical':c=>{
   for(let x=5;x<96;x+=13){c.strokeStyle=x%2?'#603818bb':'#e5bd7f99';c.lineWidth=x%2?2.2:1.2;c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x-4,22,x+5,41,x,63);c.bezierCurveTo(x-4,78,x+4,87,x-1,96);c.stroke();}
   for(let i=0;i<11;i++){const x=(i*37+9)%96,y=(i*29+12)%96;c.strokeStyle=i%2?'#58351f99':'#d5a46b99';c.lineWidth=1.4;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-4,y+5,x+1,y+10);c.stroke();}
   [[28,31],[74,72]].forEach(([x,y])=>{c.strokeStyle='#60391fbb';c.lineWidth=1.7;c.beginPath();c.ellipse(x,y,3,8,.08,0,Math.PI*2);c.ellipse(x,y,1.5,3,.08,0,Math.PI*2);c.stroke();});
  },
  'wood-end':c=>{
   const cx=48,cy=48;
   for(let r=42;r>=5;r-=6){c.strokeStyle=(r/6)%2?'#704522bb':'#e3b979bb';c.lineWidth=r%12===0?2:1.3;c.beginPath();c.ellipse(cx+(r%7)-3,cy+(r%5)-2,r,r*.88,0,0,Math.PI*2);c.stroke();}
   c.fillStyle='#6d4327';c.beginPath();c.arc(cx,cy,3.2,0,Math.PI*2);c.fill();
   c.strokeStyle='#754a2caa';c.lineWidth=1.5;
   for(const a of [-2.5,-1.1,.55,2.2]){c.beginPath();c.moveTo(cx+Math.cos(a)*9,cy+Math.sin(a)*8);c.lineTo(cx+Math.cos(a)*44,cy+Math.sin(a)*40);c.stroke();}
   c.strokeStyle='#f0d09a99';c.lineWidth=1;c.beginPath();c.arc(cx-1,cy-1,34,.3,2.3);c.stroke();
  }
 };
 for(const [id,draw] of Object.entries(faceMakers)){const tile=document.createElement('canvas');tile.width=tile.height=TEXTURE_TILE_SIZE;const c=tile.getContext('2d');c.scale(TEXTURE_DRAW_SCALE,TEXTURE_DRAW_SCALE);draw(c);textureTiles.set(id,tile);texturePatterns.set(id,ctx.createPattern(tile,'repeat'));}
}

function makeTileTexturePatterns(){
 const makers={
  grid:c=>{c.strokeStyle='#fff9';c.lineWidth=3;for(let p=0;p<=96;p+=32){c.beginPath();c.moveTo(p,0);c.lineTo(p,96);c.moveTo(0,p);c.lineTo(96,p);c.stroke();}c.strokeStyle='#354b3d55';c.lineWidth=1;c.strokeRect(2,2,92,92);},
  brick:c=>{c.strokeStyle='#fff9';c.lineWidth=3;for(let y=0;y<=96;y+=24){c.beginPath();c.moveTo(0,y);c.lineTo(96,y);c.stroke();}c.strokeStyle='#354b3d66';for(let row=0;row<4;row++){const y=row*24,off=row%2?0:24;for(let x=off;x<=96;x+=48){c.beginPath();c.moveTo(x,y);c.lineTo(x,y+24);c.stroke();}}},
  checker:c=>{for(let y=0;y<96;y+=24)for(let x=0;x<96;x+=24)if((x/24+y/24)%2===0){c.fillStyle='#fff8';c.fillRect(x,y,24,24);c.strokeStyle='#354b3d55';c.strokeRect(x,y,24,24);}},
  diagonal:c=>{c.strokeStyle='#fff9';c.lineWidth=4;for(let x=-96;x<192;x+=24){c.beginPath();c.moveTo(x,0);c.lineTo(x+96,96);c.stroke();}c.strokeStyle='#354b3d55';c.lineWidth=1.5;for(let x=-96;x<192;x+=24){c.beginPath();c.moveTo(x+9,0);c.lineTo(x+105,96);c.stroke();}},
  diamond:c=>{c.strokeStyle='#fff9';c.lineWidth=3;for(let p=-96;p<=192;p+=32){c.beginPath();c.moveTo(p,0);c.lineTo(p+96,96);c.moveTo(p,96);c.lineTo(p+96,0);c.stroke();}},
  hexagon:c=>{c.strokeStyle='#fff9';c.lineWidth=2.5;for(let y=-18;y<120;y+=32)for(let x=-24;x<120;x+=36){const cx=x+((Math.floor(y/32)%2)?18:0),cy=y;c.beginPath();for(let i=0;i<6;i++){const a=Math.PI/3*i,px=cx+17*Math.cos(a),py=cy+17*Math.sin(a);if(i)c.lineTo(px,py);else c.moveTo(px,py);}c.closePath();c.stroke();}},
  herringbone:c=>{c.strokeStyle='#fff9';c.lineWidth=3;for(let y=-12;y<108;y+=24)for(let x=-24;x<120;x+=32){const off=(Math.floor(y/24)%2)*16;c.beginPath();c.moveTo(x+off,y);c.lineTo(x+off+16,y+12);c.lineTo(x+off,y+24);c.stroke();}c.strokeStyle='#354b3d55';for(let x=0;x<=96;x+=32){c.beginPath();c.moveTo(x,0);c.lineTo(x,96);c.stroke();}},
  basket:c=>{c.strokeStyle='#fff9';c.lineWidth=9;for(let y=8;y<96;y+=24){c.beginPath();c.moveTo(0,y);c.lineTo(96,y);c.stroke();}for(let x=8;x<96;x+=24){c.beginPath();c.moveTo(x,0);c.lineTo(x,96);c.stroke();}c.strokeStyle='#354b3d66';c.lineWidth=2;for(let y=0;y<=96;y+=24){c.beginPath();c.moveTo(0,y);c.lineTo(96,y);c.stroke();}},
  mosaic:c=>{c.lineWidth=2;c.strokeStyle='#fff9';for(let y=0;y<96;y+=32)for(let x=0;x<96;x+=32){c.beginPath();c.moveTo(x,y);c.lineTo(x+32,y+32);c.lineTo(x+32,y);c.closePath();c.stroke();c.beginPath();c.moveTo(x,y);c.lineTo(x,y+32);c.lineTo(x+32,y+32);c.closePath();c.stroke();}},
  terrazzo:c=>{for(let i=0;i<78;i++){const x=(i*37+11)%96,y=(i*59+7)%96;c.fillStyle=i%3===0?'#fff9':i%3===1?'#354b3d66':'#e8c58a99';c.beginPath();c.ellipse(x,y,2+(i%4),1.4+(i%3),i*.73,0,Math.PI*2);c.fill();}},
  waves:c=>{c.strokeStyle='#fff9';c.lineWidth=3;for(let y=10;y<110;y+=24){c.beginPath();for(let x=0;x<=96;x+=4){const py=y+Math.sin(x/10)*7;if(x)c.lineTo(x,py);else c.moveTo(x,py);}c.stroke();}c.strokeStyle='#354b3d55';c.lineWidth=1;for(let y=22;y<110;y+=24){c.beginPath();for(let x=0;x<=96;x+=4){const py=y+Math.sin(x/10)*7;if(x)c.lineTo(x,py);else c.moveTo(x,py);}c.stroke();}},
  dots:c=>{for(let y=8;y<96;y+=24)for(let x=8;x<96;x+=24){c.fillStyle='#fff9';c.beginPath();c.arc(x,y,6,0,Math.PI*2);c.fill();c.strokeStyle='#354b3d66';c.lineWidth=1.5;c.stroke();}},
  floral:c=>{for(let y=16;y<112;y+=48)for(let x=16;x<112;x+=48){c.fillStyle='#fff9';for(let k=0;k<6;k++){const a=k*Math.PI/3;c.beginPath();c.ellipse(x+Math.cos(a)*8,y+Math.sin(a)*8,7,4,a,0,Math.PI*2);c.fill();}c.fillStyle='#e8c58a';c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();}},
  stars:c=>{c.strokeStyle='#fff9';c.lineWidth=3;for(let y=16;y<112;y+=48)for(let x=16;x<112;x+=48){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?5:13,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(i)c.lineTo(px,py);else c.moveTo(px,py);}c.closePath();c.stroke();}},
  sunburst:c=>{c.strokeStyle='#fff9';c.lineWidth=2.5;for(const [x,y] of [[24,24],[72,72]])for(let i=0;i<16;i++){const a=i*Math.PI/8;c.beginPath();c.moveTo(x+Math.cos(a)*7,y+Math.sin(a)*7);c.lineTo(x+Math.cos(a)*22,y+Math.sin(a)*22);c.stroke();}c.strokeStyle='#354b3d55';c.beginPath();c.arc(24,24,8,0,Math.PI*2);c.arc(72,72,8,0,Math.PI*2);c.stroke();},
  scallop:c=>{c.strokeStyle='#fff9';c.lineWidth=3;for(let y=0;y<128;y+=24){c.beginPath();for(let x=-12;x<120;x+=24){c.arc(x+12,y,12,Math.PI,0); }c.stroke();}c.strokeStyle='#354b3d55';c.lineWidth=1;for(let y=12;y<128;y+=24){c.beginPath();for(let x=-12;x<120;x+=24){c.arc(x+12,y,12,Math.PI,0);}c.stroke();}},
  parquet:c=>{c.strokeStyle='#fff9';c.lineWidth=3;for(let y=0;y<96;y+=32){for(let x=0;x<96;x+=48){c.strokeRect(x+(y/32%2)*0,y,48,32);c.beginPath();c.moveTo(x+24,y);c.lineTo(x+24,y+32);c.stroke();}}c.strokeStyle='#354b3d55';c.lineWidth=1;for(let y=8;y<96;y+=32){c.beginPath();c.moveTo(4,y);c.lineTo(44,y);c.moveTo(52,y);c.lineTo(92,y);c.stroke();}},
  pebble:c=>{for(let i=0;i<18;i++){const x=(i*29+7)%96,y=(i*43+13)%96;c.strokeStyle=i%2?'#fff9':'#354b3d66';c.lineWidth=2;c.beginPath();c.ellipse(x,y,7+(i%3)*2,5+(i%2)*2,i*.61,0,Math.PI*2);c.stroke();}},
  cross:c=>{c.strokeStyle='#fff9';c.lineWidth=4;for(let y=12;y<112;y+=32)for(let x=12;x<112;x+=32){c.beginPath();c.moveTo(x-7,y);c.lineTo(x+7,y);c.moveTo(x,y-7);c.lineTo(x,y+7);c.stroke();}c.strokeStyle='#354b3d55';c.lineWidth=1;for(let p=0;p<=96;p+=32){c.strokeRect(p,p,0,0);}},
  spiral:c=>{c.strokeStyle='#fff9';c.lineWidth=3;for(const [x,y] of [[24,24],[72,24],[24,72],[72,72]]){c.beginPath();for(let a=0;a<Math.PI*3;a+=.12){const r=1+a*2,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(a)c.lineTo(px,py);else c.moveTo(px,py);}c.stroke();}}
 };
 for(const design of TILE_DESIGNS){
  const tile=document.createElement('canvas');tile.width=tile.height=TEXTURE_TILE_SIZE;
  const c=tile.getContext('2d');c.scale(TEXTURE_DRAW_SCALE,TEXTURE_DRAW_SCALE);makers[design.id](c);
  textureTiles.set('tile-'+design.id,tile);
  texturePatterns.set('tile-'+design.id,ctx.createPattern(tile,'repeat'));
 }
}

function pushCube(queue,cam,w,h,x,y,z,color,sx=1,sy=1,sz=1,outline=true,material=null,customTint=false){const vs=cubeVerts(x,y,z,sx,sy,sz),cx=x+sx/2,cy=y+sy/2,cz=z+sz/2;for(const f of FACES){const [nx,ny,nz]=f.normal,viewX=cam.pos.x-cx,viewY=cam.pos.y-cy,viewZ=cam.pos.z-cz;if(nx*viewX+ny*viewY+nz*viewZ<=0)continue;const pts=f.ids.map(i=>project(vs[i],cam,w,h));if(pts.some(p=>!p)||!projectedPolygonVisible(pts,w,h,2))continue;const avg=pts.reduce((t,p)=>t+p.d,0)/pts.length;queue.push({pts,depth:avg,color:shadeColor(color,f.shade),outline,material,customTint});}}
function pushTileSlab(queue,cam,w,h,b){
 const pattern=TILE_DESIGNS.some(t=>t.id===b.tilePattern)?b.tilePattern:'grid';
 const x=b.x,y=b.y+TILE_BASE_OFFSET,z=b.z;
 const color=validHex(b.color,'#c5a98a');
 const vs=cubeVerts(x,y,z,1,TILE_THICKNESS,1),cx=x+.5,cy=y+TILE_THICKNESS/2,cz=z+.5;
 for(const f of FACES){
  const [nx,ny,nz]=f.normal,viewX=cam.pos.x-cx,viewY=cam.pos.y-cy,viewZ=cam.pos.z-cz;
  if(nx*viewX+ny*viewY+nz*viewZ<=0)continue;
  const pts=f.ids.map(i=>project(vs[i],cam,w,h));
  if(pts.some(p=>!p)||!projectedPolygonVisible(pts,w,h,2))continue;
  const depth=pts.reduce((sum,p)=>sum+p.d,0)/pts.length;
  const poly={pts,depth,color:shadeColor(color,f.shade),outline:true,material:null,customTint:false};
  if(ny===1)poly.tileTexture=textureTiles.get('tile-'+pattern);
  queue.push(poly);
 }
}
function pushCubeFacing(queue,cam,w,h,x,y,z,color,sx=1,sy=1,sz=1,yaw=0,outline=true){
 const vs=cubeVerts(x,y,z,sx,sy,sz),cx=x+sx/2,cy=y+sy/2,cz=z+sz/2;
 const c=Math.cos(yaw),s=Math.sin(yaw);
 if(Math.abs(yaw)>1e-7){
  for(const v of vs){
   const dx=v.x-cx,dz=v.z-cz;
   v.x=cx+dx*c+dz*s;
   v.z=cz-dx*s+dz*c;
  }
 }
 for(const f of FACES){
  const [nx,ny,nz]=f.normal;
  const normalX=nx*c+nz*s,normalZ=-nx*s+nz*c;
  const viewX=cam.pos.x-cx,viewY=cam.pos.y-cy,viewZ=cam.pos.z-cz;
  if(normalX*viewX+ny*viewY+normalZ*viewZ<=0)continue;
  const pts=f.ids.map(i=>project(vs[i],cam,w,h));
  if(pts.some(p=>!p)||!projectedPolygonVisible(pts,w,h,2))continue;
  const avg=pts.reduce((t,p)=>t+p.d,0)/pts.length;
  queue.push({pts,depth:avg,color:shadeColor(color,f.shade),outline,material:null,customTint:false});
 }
}

const doorMotions=new Map();
function doorVisualAngle(door,now=performance.now()){
 const key=keyBlock(door.x,door.y,door.z),motion=doorMotions.get(key);
 if(!motion)return door.open?1.32:0;
 const t=Math.max(0,Math.min(1,(now-motion.start)/260)),eased=t*t*(3-2*t);
 if(t>=1)doorMotions.delete(key);
 return motion.from+(motion.to-motion.from)*eased;
}
function toggleDoor(door){
 const now=performance.now(),from=doorVisualAngle(door,now);
 door.open=!door.open;
 doorMotions.set(keyBlock(door.x,door.y,door.z),{from,to:door.open?1.32:0,start:now});
 invalidateNeighborNavigation();save();showStatus(door.open?'Door opened. Tap again to close it.':'Door closed.');render();
}
function pushDoorCube(queue,cam,w,h,pivot,x,y,z,sx,sy,sz,color,angle){
 const c=Math.cos(angle),s=Math.sin(angle);
 const local=cubeVerts(x,y,z,sx,sy,sz);
 const rotate=v=>({x:pivot.x+v.x*c+v.z*s,y:pivot.y+v.y,z:pivot.z-v.x*s+v.z*c});
 const vs=local.map(rotate);
 const center=rotate({x:x+sx/2,y:y+sy/2,z:z+sz/2});
 for(const f of FACES){
  const [nx,ny,nz]=f.normal,normalX=nx*c+nz*s,normalZ=-nx*s+nz*c;
  const viewX=cam.pos.x-center.x,viewY=cam.pos.y-center.y,viewZ=cam.pos.z-center.z;
  if(normalX*viewX+ny*viewY+normalZ*viewZ<=0)continue;
  const pts=f.ids.map(i=>project(vs[i],cam,w,h));
  if(pts.some(p=>!p)||!projectedPolygonVisible(pts,w,h,2))continue;
  const depth=pts.reduce((sum,p)=>sum+p.d,0)/pts.length;
  queue.push({pts,depth,color:shadeColor(color,f.shade),outline:true,material:null,customTint:false});
 }
}
function drawVoxelDoor(queue,cam,w,h,door){
 const open=doorVisualAngle(door),baseAngle=door.orientation==='ew'?-Math.PI/2:0;
 const angle=baseAngle+open*(door.swing===-1?-1:1);
 const pivot=door.orientation==='ew'
  ?{x:door.x+.5,y:door.y,z:door.z+.08}
  :{x:door.x+.08,y:door.y,z:door.z+.5};
 const draw=(x,y,z,sx,sy,sz,color)=>pushDoorCube(queue,cam,w,h,pivot,x,y,z,sx,sy,sz,color,angle);
 const wood=validHex(door.color,'#a97545');
 draw(0,0,-.06,.84,1.96,.12,wood);
 for(const side of [-1,1]){
  const face=side*.062,faceDepth=.016;
  if(door.style==='window'){
   draw(.18,1.14,face,.48,.48,faceDepth,'#a9dce8');
   draw(.15,1.10,face,.055,.56,faceDepth,'#704b32');
   draw(.63,1.10,face,.055,.56,faceDepth,'#704b32');
   draw(.18,1.10,face,.50,.055,faceDepth,'#704b32');
   draw(.18,1.62,face,.50,.055,faceDepth,'#704b32');
   draw(.40,1.14,face,.045,.48,faceDepth,'#f4e7c6');
   draw(.18,1.36,face,.48,.045,faceDepth,'#f4e7c6');
   draw(.15,.18,face,.54,.58,faceDepth,'#87552f');
   draw(.19,.22,face,.46,.50,faceDepth,'#b77b48');
  }else{
   draw(.13,1.08,face,.58,.66,faceDepth,'#70482f');
   draw(.17,1.12,face,.50,.58,faceDepth,'#c18a55');
   draw(.13,.18,face,.58,.66,faceDepth,'#70482f');
   draw(.17,.22,face,.50,.58,faceDepth,'#bd854e');
   if(door.style==='garden'){
    draw(.38,1.42,face+side*.018,.13,.13,.018,'#e78baa');
    draw(.48,1.42,face+side*.018,.13,.13,.018,'#e78baa');
    draw(.43,1.50,face+side*.018,.13,.13,.018,'#f2c4d5');
    draw(.43,1.36,face+side*.018,.13,.13,.018,'#f2c4d5');
    draw(.43,1.43,face+side*.032,.10,.10,.018,'#f3d36c');
   }
  }
  draw(.70,.88,side*.083,.07,.13,.055,'#e6bd62');
 }
 draw(.035,.28,-.078,.05,.12,.036,'#6a4933');
 draw(.035,1.55,-.078,.05,.12,.036,'#6a4933');
}

function drawWindSwayingPlant(queue,cam,w,h,block,tick){
 const flower=block.type==='flower',material=flower?'flower-plant':'tall_grass';
 const plantImage=flower?getFlowerPlantTexture(block.color||world.solidStyles?.flower?.color||DEFAULT_FLOWER_PETAL_COLOR):textureTiles.get(material);
 if(!plantImage)return;
 const cx=block.x+.5,cz=block.z+.5,baseY=block.y+.018;
 const height=flower ? .86 : .96,halfWidth=flower ? .29 : .37;
 const phase=block.x*.71+block.z*.53+(flower?1.35:0);
 const gust=Math.sin(tick*1.55+phase)+Math.sin(tick*.72+phase*.43)*.34;
 const swayX=gust*.105,swayZ=Math.sin(tick*1.27+phase+1.6)*.075;
 const planes=[
  [
   {x:cx-halfWidth+swayX,y:baseY+height,z:cz},
   {x:cx+halfWidth+swayX,y:baseY+height,z:cz},
   {x:cx+halfWidth,y:baseY,z:cz},
   {x:cx-halfWidth,y:baseY,z:cz}
  ],
  [
   {x:cx,y:baseY+height,z:cz-halfWidth+swayZ},
   {x:cx,y:baseY+height,z:cz+halfWidth+swayZ},
   {x:cx,y:baseY,z:cz+halfWidth},
   {x:cx,y:baseY,z:cz-halfWidth}
  ]
 ];
 for(const vertices of planes){
  const pts=vertices.map(vertex=>project(vertex,cam,w,h));
  if(pts.some(point=>!point)||!projectedPolygonVisible(pts,w,h,2))continue;
  const depth=pts.reduce((sum,point)=>sum+point.d,0)/pts.length;
  queue.push({pts,depth,material,plantTexture:plantImage,faceMark:'plant',alpha:.98,outline:false});
 }
}

function paintTexture(poly){
 if(poly.pts.length!==4)return;
 const image=textureTiles.get(poly.material);
 if(!image)return;
 const alpha=poly.material==='dirt' ? .82 : (poly.material.startsWith('grass-side-') ? .92 : (poly.customTint ? .42 : .72));
 paintMappedQuad(image,poly.pts,alpha);
}
function paintTileTriangle(image,src,dst,alpha=.9,overlap=.45){
 const [s0,s1,s2]=src,[d0,d1,d2]=dst;
 const sx1=s1.x-s0.x,sy1=s1.y-s0.y,sx2=s2.x-s0.x,sy2=s2.y-s0.y;
 const det=sx1*sy2-sx2*sy1;
 if(Math.abs(det)<1e-8)return;
 const dx1=d1.x-d0.x,dy1=d1.y-d0.y,dx2=d2.x-d0.x,dy2=d2.y-d0.y;
 const a=(dx1*sy2-dx2*sy1)/det,c=(dx2*sx1-dx1*sx2)/det;
 const b=(dy1*sy2-dy2*sy1)/det,d=(dy2*sx1-dy1*sx2)/det;
 const e=d0.x-a*s0.x-c*s0.y,f=d0.y-b*s0.x-d*s0.y;
 const center={x:(d0.x+d1.x+d2.x)/3,y:(d0.y+d1.y+d2.y)/3};
 const clipPoint=p=>{
  const dx=p.x-center.x,dy=p.y-center.y,len=Math.hypot(dx,dy)||1;
  return {x:p.x+dx/len*overlap,y:p.y+dy/len*overlap};
 };
 const c0=clipPoint(d0),c1=clipPoint(d1),c2=clipPoint(d2);
 ctx.save();
 ctx.beginPath();ctx.moveTo(c0.x,c0.y);ctx.lineTo(c1.x,c1.y);ctx.lineTo(c2.x,c2.y);ctx.closePath();ctx.clip();
 ctx.transform(a,b,c,d,e,f);ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,TEXTURE_REFERENCE_SIZE,TEXTURE_REFERENCE_SIZE);ctx.restore();
}
function clipProjectedQuad(points){
 ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip();
}
function paintMappedQuad(image,points,alpha=.9){
 if(!image||points.length!==4)return;
 const [p0,p1,p2,p3]=points;
 ctx.save();clipProjectedQuad(points);
 paintTileTriangle(image,[{x:0,y:0},{x:96,y:0},{x:96,y:96}],[p0,p1,p2],alpha);
 paintTileTriangle(image,[{x:0,y:0},{x:96,y:96},{x:0,y:96}],[p0,p2,p3],alpha);
 ctx.restore();
}
function paintTileTexture(poly){
 const image=poly.tileTexture;if(!image||poly.pts.length!==4)return;
 const [p0,p1,p2,p3]=poly.pts;
 ctx.save();clipProjectedQuad(poly.pts);
 paintTileTriangle(image,[{x:0,y:0},{x:0,y:96},{x:96,y:96}],[p0,p1,p2],.9);
 paintTileTriangle(image,[{x:0,y:0},{x:96,y:96},{x:96,y:0}],[p0,p2,p3],.9);
 ctx.restore();
}
function line3(queue,cam,w,h,a,b,color,width=1){const p=project(a,cam,w,h),q=project(b,cam,w,h);if(p&&q)queue.push({line:true,p,q,depth:(p.d+q.d)/2,color,width});}
const NEIGHBOR_ROUTES={
 hyacinth:[
  {x:-5,z:-8,pause:2.8,activity:'👋'},
  {x:-7,z:-7,pause:2.0,activity:'🌼'},
  {x:-10,z:-1.8,pause:2.7,activity:'🏡'},
  {x:-10,z:-9.5,pause:2.5,activity:'🌳'},
  {x:-6,z:-11,pause:2.4,activity:'🌸'}
 ],
 theo:[
  {x:5,z:-11,pause:2.3,activity:'👋'},
  {x:8,z:-10,pause:2.0,activity:'🌱'},
  {x:12,z:-12.1,pause:2.8,activity:'🏡'},
  {x:9,z:-8.5,pause:2.2,activity:'☀️'},
  {x:4,z:-7,pause:2.8,activity:'🐑'}
 ],
 family:[
  {x:18,z:-2,pause:3.0,activity:'🌼'},
  {x:21,z:-3,pause:2.5,activity:'🐾'},
  {x:21,z:-6,pause:3.0,activity:'🏡'},
  {x:18,z:-7,pause:2.5,activity:'🌳'},
  {x:15,z:-5,pause:2.8,activity:'🌸'}
 ]
};
const NAV_CELL_SCALE=2,NAV_NEIGHBOR_RADIUS=.23,NAV_NEIGHBOR_