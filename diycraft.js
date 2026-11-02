(()=>{'use strict';
const $=id=>document.getElementById(id), canvas=$('game'),ctx=canvas.getContext('2d',{alpha:false});
// Practically unbounded horizontal world; nearby ground is drawn around the player each frame.
const WORLD_LIMIT=1000000000,MAX_BLOCKS=18000,MAX_BUCKET_ITEMS=120,STORE_KEY='diycraft_peaceful_voxel_v1';
const MAX_DIG_DEPTH=8,GROUND_DIG_LIMIT=12000;
const BLOCKS=[
 {id:'grass',name:'Grass',emoji:'🟩',color:'#70b85a'}, {id:'dirt',name:'Dirt',emoji:'🟫',color:'#9a7049'},
 {id:'stone',name:'Stone',emoji:'⬜',color:'#9ca6a1'}, {id:'wood',name:'Wood',emoji:'🪵',color:'#a97545'},
 {id:'leaves',name:'Leaves',emoji:'🌳',color:'#4e9a59'}, {id:'brick',name:'Brick',emoji:'🧱',color:'#c87862'},
 {id:'glass',name:'Glass',emoji:'🔹',color:'#a5dce3'}, {id:'flower',name:'Flower',emoji:'🌸',color:'#e9a4c1'},
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
 seed:{name:'Seeds',icon:'🌱'},apple:{name:'Apple',icon:'🍎'},bread:{name:'Bread',icon:'🍞'},milk:{name:'Milk',icon:'🥛'},wood:{name:'Wood pieces',icon:'🪵'},stone:{name:'Stone',icon:'🪨'},grass:{name:'Grass',icon:'🟩'},dirt:{name:'Dirt',icon:'🟫'},leaves:{name:'Leaves',icon:'🌳'},brick:{name:'Brick',icon:'🧱'},glass:{name:'Glass',icon:'🔹'},flower:{name:'Flower',icon:'🌸'},sand:{name:'Sand',icon:'🟨'},snow:{name:'Snow',icon:'❄️'},tile:{name:'Decorative tile',icon:'🧩'},custom:{name:'Custom block pieces',icon:'🎨'},paintbrush:{name:'Paintbrush',icon:'🖌️'},wateringcan:{name:'Watering can',icon:'🚿'},flowerpot:{name:'Flower pot',icon:'🪴'},bench:{name:'Garden bench',icon:'🪑'},picture:{name:'Picture frame',icon:'🖼️'},picnic:{name:'Picnic basket',icon:'🧺'}
};
const RECIPES=[
 {id:'flowerpot',name:'Flower pot',desc:'A little pot for a bright flower.',icon:'🪴',cost:{wood:1,seed:1}},
 {id:'bench',name:'Garden bench',desc:'A comfortable place to sit.',icon:'🪑',cost:{wood:2}},
 {id:'picture',name:'Picture frame',desc:'Keep a favorite drawing.',icon:'🖼️',cost:{wood:1,stone:1}},
 {id:'picnic',name:'Picnic basket',desc:'A peaceful picnic treat.',icon:'🧺',cost:{bread:1,apple:1}}
];
const emptySlots=()=>Array.from({length:60},()=>null);
function freshWorld(){
 const blocks=[];
 const put=(x,y,z,type)=>blocks.push({x,y,z,type});
 // A small welcome cottage and a tree garden, all built from friendly materials.
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

 return {version:1,name:'My Peaceful World',blocks,excavations:[],waterCells:[],waterLevels:[],fish:[],bucket:[],player:{x:0,y:0,z:7,yaw:0,pitch:-.12,shirt:'#d94b3d',hair:'#493127',skin:'#efc39d',pants:'#397d8f',shoes:'#bd4540',eyes:'#302820',hairStyle:'short',outfitStyle:'hoodie',accessory:'none',accessoryColor:'#f4a8bb'},customBlock:{color:'#aa83d8',texture:'custom'},doorDesign:{color:'#a97545',style:'classic'},tileDesign:{color:'#c5a98a',pattern:'grid'},solidStyles:{},timeMode:'day',materials:emptySlots(),crafted:emptySlots(),artworks:[],animalCare:{sheep:0,cat:0,cat_miso:0,cat_tofu:0,dog_buddy:0,dog_biscuit:0,dog_pepper:0}};
}
function validHex(s,f){return /^#[0-9a-f]{6}$/i.test(s||'')?s:f;}
function validWorld(d){
 if(!d||typeof d!=='object')throw new Error('That file is not a DIYCraft world.');
 const w=freshWorld();w.name=String(d.name||w.name).slice(0,30);
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
  // Pre-stacking worlds stored only a wet/dry flag, so preserve each old pool as one layer.
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
 if(d.animalCare&&typeof d.animalCare==='object'){for(const id of Object.keys(w.animalCare))w.animalCare[id]=Math.max(0,Math.min(999,Number(d.animalCare[id])||0));}
 return w;
}
let toastTimer=0,storageUnavailable=false;
function load(){try{const s=localStorage.getItem(STORE_KEY);if(s)return validWorld(JSON.parse(s));}catch(e){storageUnavailable=true;showStatus('Device storage is unavailable. Use Backup to keep your world.');}return freshWorld();}
let world=load(),selected='grass',selectedBucketItem=null,placementPaused=false,toolMode='build',cameraMode='first',flying=false,controllersHidden=false,focusMode=false,moveX=0,moveZ=0,vertical=0,keys={},lastTime=0,artDrawing=false,artLast=null,inventoryTab='bucket',drag=null;
let selectedAnimalId='sheep',selectedAnimalName='Pip the sheep',animalCareFlashUntil=0,animalCareFlashEmoji='💚';
let jumpVelocity=0,playerGrounded=true;
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
 // Older/default solids may not have explicit appearance fields. Freeze their original defaults now.
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
  :placementPaused
   ?'Block placement paused · Choose a block to resume · Hold 0.6s to dig or remove'
   :selected==='water'
    ?'Water block selected · Tap water to stack another layer · Hold to collect a layer'
    :'Tap to build or fill · Hold 0.6s to dig soil or remove a block';
}
function setToolMode(mode,announce=true){
 toolMode=mode==='fish'?'fish':'build';
 syncToolButtons();
 if(announce)showStatus(toolMode==='fish'?'Fish placement enabled. Tap a water cell to add a fish.':'Build mode ready.');
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
function renderHotbar(){
 const root=$('hotbar');root.replaceChildren();
 const categories=[
  {id:'solid',label:'Solid',icon:'🧱',title:'Choose a solid block'},
  {id:'tile',label:'Slabs / Tiles',icon:'▦',title:'Design and select slabs or tiles'},
  {id:'door',label:'Door',icon:'🚪',title:'Design and select a door'},
  {id:'water',label:'Water',icon:'💧',title:'Select the water block'},
  {id:'bucket',label:'Bucket',icon:'🪣',title:'Open the Material Bucket'},
  {id:'pause',label:placementPaused?'No Block':'Pause',icon:'✋',title:'Pause block placement until you choose another block'}
 ];
 categories.forEach(item=>{
  const btn=document.createElement('button');btn.type='button';btn.className='material-category';
  const icon=document.createElement('span');icon.className='emoji';icon.textContent=item.icon;
  const label=document.createElement('small');label.textContent=item.label;btn.append(icon,label);btn.title=item.title;
  const active=(item.id==='pause'&&placementPaused)||(!placementPaused&&((item.id==='solid'&&['grass','dirt','stone','wood','leaves','brick','glass','flower','sand','snow','custom'].includes(selected))
   ||(item.id==='tile'&&selected==='tile')||(item.id==='door'&&selected==='door')||(item.id==='water'&&selected==='water')));
  if(active)btn.classList.add('active');
  btn.addEventListener('click',()=>{
   if(item.id==='pause'){pauseBuildPlacement();return;}
   if(item.id==='solid'){openSolidPicker();return;}
   if(item.id==='tile'){selectedBucketItem=null;setToolMode('build',false);openTileDesigner();return;}
   if(item.id==='door'){selectedBucketItem=null;setToolMode('build',false);openDoorDesigner();return;}
   if(item.id==='water'){chooseMaterial('water');return;}
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
let blockLookup=new Map(),worldGeometryRevision=0,neighborObstacleCache=null,neighborPathCache=new Map();
function invalidateNeighborNavigation(){worldGeometryRevision++;neighborObstacleCache=null;neighborPathCache.clear();}
function rebuildLookup(){invalidateNeighborNavigation();groundDepths.clear();for(const [x,z,depth] of world.excavations||[])groundDepths.set(keyGround(x,z),depth);blockLookup=new Map();for(const b of world.blocks){blockLookup.set(keyBlock(b.x,b.y,b.z),b);if(b.type==='door'&&b.y<64)blockLookup.set(keyBlock(b.x,b.y+1,b.z),b);}}
function solid(x,y,z){return blockLookup.has(keyBlock(Math.floor(x),Math.floor(y),Math.floor(z)));}
function addBlock(x,y,z,type=selected){
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
 invalidateNeighborNavigation();save();return true;
}
function removeBlock(x,y,z){
 const k=keyBlock(x,y,z),b=blockLookup.get(k);if(!b)return false;
 if(isProtectedDigCell(b.x,b.z)){showStatus('This block is inside a protected neighbor area. Their homes stay safe!');return false;}
 if(!addBucketItem(b)){showStatus('Your Material Bucket is full. Use or clear some recovered blocks first.');return false;}
 world.blocks=world.blocks.filter(v=>v!==b);blockLookup.delete(keyBlock(b.x,b.y,b.z));
 if(b.type==='door')blockLookup.delete(keyBlock(b.x,b.y+1,b.z));
 doorMotions.delete(keyBlock(b.x,b.y,b.z));invalidateNeighborNavigation();save();return true;
}
function cameraState(){const p=world.player,cp=Math.cos(p.pitch),sp=Math.sin(p.pitch),sy=Math.sin(p.yaw),cy=Math.cos(p.yaw);if(cameraMode==='first')return {pos:{x:p.x,y:p.y+1.58,z:p.z},yaw:p.yaw,pitch:p.pitch};const target={x:p.x+sy*6,y:p.y+2.1,z:p.z-cy*6},pos={x:p.x-sy*5.6,y:p.y+2.8,z:p.z+cy*5.6};const dx=target.x-pos.x,dy=target.y-pos.y,dz=target.z-pos.z;return {pos,yaw:Math.atan2(dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz))};}
function project(v,cam,w,h){const dx=v.x-cam.pos.x,dy=v.y-cam.pos.y,dz=v.z-cam.pos.z,sy=Math.sin(cam.yaw),cy=Math.cos(cam.yaw),sp=Math.sin(cam.pitch),cp=Math.cos(cam.pitch);const rx=dx*cy+dz*sy,uy=-dx*sy*sp+dy*cp+dz*cy*sp,depth=dx*sy*cp+dy*sp-dz*cy*cp;if(depth<.12)return null;const focal=Math.min(w,h)*.94;return {x:w/2+rx*focal/depth,y:h*.51-uy*focal/depth,d:depth};}
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
// Small, locally generated patterns give every material its own tactile surface.
const texturePatterns=new Map(),textureTiles=new Map();
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
  sand:c=>{for(let i=0;i<115;i++){const x=(i*37)%96,y=(i*61)%96;c.fillStyle=i%3?'#b4945a99':'#fff4c6bb';c.fillRect(x,y,1.4+(i%3),1.2+(i%2));}c.strokeStyle='#fff1bd66';c.lineWidth=1.2;for(let y=18;y<96;y+=29){c.beginPath();c.moveTo(0,y);c.quadraticCurveTo(45,y-8,96,y+1);c.stroke();}},
  snow:c=>{for(let i=0;i<12;i++){const x=(i*29+9)%96,y=(i*41+6)%96;c.strokeStyle=i%2?'#9bc6dcaa':'#ffffffdd';c.lineWidth=1.5;c.beginPath();c.moveTo(x-5,y);c.lineTo(x+5,y);c.moveTo(x,y-5);c.lineTo(x,y+5);c.moveTo(x-3.5,y-3.5);c.lineTo(x+3.5,y+3.5);c.stroke();}for(let i=0;i<25;i++){c.fillStyle='#ffffffdd';c.fillRect((i*17)%96,(i*43)%96,2,2);}},
  custom:c=>{for(let i=0;i<54;i++){c.fillStyle=i%2?'#ffffff66':'#35445a33';c.beginPath();c.arc((i*19)%96,(i*37)%96,1.1+(i%2),0,Math.PI*2);c.fill();}}
 };
 for(const [id,draw] of Object.entries(makers)){const tile=document.createElement('canvas');tile.width=tile.height=96;const c=tile.getContext('2d');draw(c);textureTiles.set(id,tile);texturePatterns.set(id,ctx.createPattern(tile,'repeat'));}
}

// Original tile surfaces: all twenty are drawn locally, with no image downloads.
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
  const tile=document.createElement('canvas');tile.width=tile.height=96;
  const c=tile.getContext('2d');makers[design.id](c);
  textureTiles.set('tile-'+design.id,tile);
  texturePatterns.set('tile-'+design.id,ctx.createPattern(tile,'repeat'));
 }
}

function pushCube(queue,cam,w,h,x,y,z,color,sx=1,sy=1,sz=1,outline=true,material=null,customTint=false){const vs=cubeVerts(x,y,z,sx,sy,sz),cx=x+sx/2,cy=y+sy/2,cz=z+sz/2;for(const f of FACES){const [nx,ny,nz]=f.normal,viewX=cam.pos.x-cx,viewY=cam.pos.y-cy,viewZ=cam.pos.z-cz;if(nx*viewX+ny*viewY+nz*viewZ<=0)continue;const pts=f.ids.map(i=>project(vs[i],cam,w,h));if(pts.some(p=>!p))continue;const avg=pts.reduce((t,p)=>t+p.d,0)/pts.length;queue.push({pts,depth:avg,color:shadeColor(color,f.shade),outline,material,customTint});}}
// Character blocks rotate as complete cuboids, not just as relocated centers.
function pushTileSlab(queue,cam,w,h,b){
 const pattern=TILE_DESIGNS.some(t=>t.id===b.tilePattern)?b.tilePattern:'grid';
 const x=b.x,y=b.y+TILE_BASE_OFFSET,z=b.z;
 const color=validHex(b.color,'#c5a98a');
 const vs=cubeVerts(x,y,z,1,TILE_THICKNESS,1),cx=x+.5,cy=y+TILE_THICKNESS/2,cz=z+.5;
 for(const f of FACES){
  const [nx,ny,nz]=f.normal,viewX=cam.pos.x-cx,viewY=cam.pos.y-cy,viewZ=cam.pos.z-cz;
  if(nx*viewX+ny*viewY+nz*viewZ<=0)continue;
  const pts=f.ids.map(i=>project(vs[i],cam,w,h));
  if(pts.some(p=>!p))continue;
  const depth=pts.reduce((sum,p)=>sum+p.d,0)/pts.length;
  const poly={pts,depth,color:shadeColor(color,f.shade),outline:true,material:null,customTint:false};
  if(ny===1)poly.tileTexture=textureTiles.get('tile-'+pattern);
  queue.push(poly);
 }
}
// Character blocks rotate as complete cuboids, not just as relocated centers.
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
  if(pts.some(p=>!p))continue;
  const avg=pts.reduce((t,p)=>t+p.d,0)/pts.length;
  queue.push({pts,depth:avg,color:shadeColor(color,f.shade),outline,material:null,customTint:false});
 }
}

// Doors are small hinged voxel assemblies. Their animation never changes their saved footprint.
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
  if(pts.some(p=>!p))continue;
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
 // Raised inset panels on both sides, so the door looks finished from either direction.
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
  // A little golden handle on each side.
  draw(.70,.88,side*.083,.07,.13,.055,'#e6bd62');
 }
 // Slim hinge marks along the hanging edge.
 draw(.035,.28,-.078,.05,.12,.036,'#6a4933');
 draw(.035,1.55,-.078,.05,.12,.036,'#6a4933');
}

function paintTexture(poly){
 if(poly.pts.length!==4)return;
 const image=textureTiles.get(poly.material);
 if(!image)return;
 // Projected 3D faces are perspective quads, not parallelograms.
 // Map both halves separately so the fourth corner cannot drift.
 paintMappedQuad(image,poly.pts,poly.customTint?.42:.72);
}
// All textured quads use the same diagonal and perspective-correct affine
// mapping on each half. A sub-pixel overlap hides antialiased hairline seams.
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
 ctx.transform(a,b,c,d,e,f);ctx.globalAlpha=alpha;ctx.drawImage(image,0,0,96,96);ctx.restore();
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
 // Keep the tile studio's established top-face orientation.
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
// Neighbor navigation: local half-block grid, house walls and player-built obstacles.
const NAV_CELL_SCALE=2,NAV_NEIGHBOR_RADIUS=.23,NAV_NEIGHBOR_HEIGHT=2.16;
const NAV_STEPS=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
function navCellKey(x,z){return x+','+z;}
function navCircleHitsRect(px,pz,x,z,w,d){
 const nx=Math.max(x,Math.min(x+w,px)),nz=Math.max(z,Math.min(z+d,pz));
 const dx=px-nx,dz=pz-nz;
 return dx*dx+dz*dz<NAV_NEIGHBOR_RADIUS*NAV_NEIGHBOR_RADIUS;
}
function markNeighborObstacleRect(set,x,z,w,d){
 const minX=Math.floor((x-NAV_NEIGHBOR_RADIUS)*NAV_CELL_SCALE);
 const maxX=Math.ceil((x+w+NAV_NEIGHBOR_RADIUS)*NAV_CELL_SCALE);
 const minZ=Math.floor((z-NAV_NEIGHBOR_RADIUS)*NAV_CELL_SCALE);
 const maxZ=Math.ceil((z+d+NAV_NEIGHBOR_RADIUS)*NAV_CELL_SCALE);
 for(let ix=minX;ix<=maxX;ix++)for(let iz=minZ;iz<=maxZ;iz++){
  if(navCircleHitsRect(ix/NAV_CELL_SCALE,iz/NAV_CELL_SCALE,x,z,w,d))set.add(navCellKey(ix,iz));
 }
}
function buildNeighborObstacleSet(){
 if(neighborObstacleCache&&neighborObstacleCache.revision===worldGeometryRevision)return neighborObstacleCache.cells;
 const cells=new Set();
 for(const b of world.blocks){
  if(b.type==='tile'||(b.type==='door'&&b.open)||b.y>=NAV_NEIGHBOR_HEIGHT||b.y+1<=0)continue;
  markNeighborObstacleRect(cells,b.x,b.z,1,1);
 }
 for(const [cell,depth] of groundDepths){if(depth>0){const [x,z]=cell.split(',').map(Number);markNeighborObstacleRect(cells,x,z,1,1);}}
 // The three village cottages are drawn scenery, so include their actual wall segments here.
 const houses=[[-13,-7],[10,-17],[16,-9]];
 for(const [x,z] of houses){
  markNeighborObstacleRect(cells,x,z,4.3,.18);
  markNeighborObstacleRect(cells,x,z+.18,.18,3.95);
  markNeighborObstacleRect(cells,x+4.12,z+.18,.18,3.95);
  markNeighborObstacleRect(cells,x,z+4.12,1.58,.18);
  markNeighborObstacleRect(cells,x+2.50,z+4.12,1.80,.18);
 }
 neighborObstacleCache={revision:worldGeometryRevision,cells};
 return cells;
}
function nearestOpenNeighborCell(ix,iz,cells,minX,maxX,minZ,maxZ){
 if(!cells.has(navCellKey(ix,iz)))return {x:ix,z:iz};
 for(let radius=1;radius<=20;radius++)for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){
  if(Math.max(Math.abs(dx),Math.abs(dz))!==radius)continue;
  const x=ix+dx,z=iz+dz;
  if(x<minX||x>maxX||z<minZ||z>maxZ||cells.has(navCellKey(x,z)))continue;
  return {x,z};
 }
 return null;
}
function findNeighborPath(start,end){
 const key=worldGeometryRevision+'|'+start.x.toFixed(2)+','+start.z.toFixed(2)+'>'+end.x.toFixed(2)+','+end.z.toFixed(2);
 const cached=neighborPathCache.get(key);if(cached)return cached;
 const cells=buildNeighborObstacleSet();
 let sx=Math.round(start.x*NAV_CELL_SCALE),sz=Math.round(start.z*NAV_CELL_SCALE);
 let gx=Math.round(end.x*NAV_CELL_SCALE),gz=Math.round(end.z*NAV_CELL_SCALE);
 const margin=24,minX=Math.max(-WORLD_LIMIT*NAV_CELL_SCALE,Math.min(sx,gx)-margin),maxX=Math.min(WORLD_LIMIT*NAV_CELL_SCALE,Math.max(sx,gx)+margin);
 const minZ=Math.max(-WORLD_LIMIT*NAV_CELL_SCALE,Math.min(sz,gz)-margin),maxZ=Math.min(WORLD_LIMIT*NAV_CELL_SCALE,Math.max(sz,gz)+margin);
 const originalStartFree=!cells.has(navCellKey(sx,sz)),originalEndFree=!cells.has(navCellKey(gx,gz));
 const openStart=nearestOpenNeighborCell(sx,sz,cells,minX,maxX,minZ,maxZ);
 const openGoal=nearestOpenNeighborCell(gx,gz,cells,minX,maxX,minZ,maxZ);
 if(!openStart||!openGoal){const stuck=[{x:start.x,z:start.z}];neighborPathCache.set(key,stuck);return stuck;}
 sx=openStart.x;sz=openStart.z;gx=openGoal.x;gz=openGoal.z;
 const directSteps=Math.max(1,Math.ceil(Math.hypot(end.x-start.x,end.z-start.z)*4));
 let clear=true;
 for(let i=0;i<=directSteps;i++){
  const t=i/directSteps,ix=Math.round((start.x+(end.x-start.x)*t)*NAV_CELL_SCALE),iz=Math.round((start.z+(end.z-start.z)*t)*NAV_CELL_SCALE);
  if(cells.has(navCellKey(ix,iz))){clear=false;break;}
 }
 if(clear&&originalStartFree&&originalEndFree){
  const direct=[{x:start.x,z:start.z},{x:end.x,z:end.z}];neighborPathCache.set(key,direct);return direct;
 }
 const width=maxZ-minZ+1,total=(maxX-minX+1)*width,indexOf=(x,z)=>(x-minX)*width+(z-minZ);
 const startIndex=indexOf(sx,sz),goalIndex=indexOf(gx,gz),parent=new Int32Array(total);parent.fill(-1);
 const seen=new Uint8Array(total),queue=new Int32Array(total);
 let head=0,tail=0,found=startIndex===goalIndex;queue[tail++]=startIndex;seen[startIndex]=1;
 while(head<tail&&!found&&tail<total){
  const current=queue[head++],cx=Math.floor(current/width)+minX,cz=current%width+minZ;
  for(const [dx,dz] of NAV_STEPS){
   const nx=cx+dx,nz=cz+dz;
   if(nx<minX||nx>maxX||nz<minZ||nz>maxZ||cells.has(navCellKey(nx,nz)))continue;
   if(dx&&dz&&(cells.has(navCellKey(cx+dx,cz))||cells.has(navCellKey(cx,cz+dz))))continue;
   const next=indexOf(nx,nz);if(seen[next])continue;
   seen[next]=1;parent[next]=current;queue[tail++]=next;
   if(next===goalIndex){found=true;break;}
  }
 }
 if(!found){const stuck=[{x:originalStartFree?start.x:sx/NAV_CELL_SCALE,z:originalStartFree?start.z:sz/NAV_CELL_SCALE}];neighborPathCache.set(key,stuck);return stuck;}
 const reverse=[];let cursor=goalIndex;
 while(cursor!==-1){reverse.push({x:(Math.floor(cursor/width)+minX)/NAV_CELL_SCALE,z:(cursor%width+minZ)/NAV_CELL_SCALE});if(cursor===startIndex)break;cursor=parent[cursor];}
 reverse.reverse();
 const path=[],first=originalStartFree?{x:start.x,z:start.z}:reverse[0];path.push(first);
 for(const point of reverse){const last=path[path.length-1];if(Math.hypot(point.x-last.x,point.z-last.z)>.04)path.push(point);}
 const last=path[path.length-1],destination=originalEndFree?{x:end.x,z:end.z}:reverse[reverse.length-1];
 if(Math.hypot(destination.x-last.x,destination.z-last.z)>.04)path.push(destination);
 neighborPathCache.set(key,path);return path;
}
function neighborPathLength(path){
 let length=0;for(let i=1;i<path.length;i++)length+=Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z);return length;
}
function neighborOnRoute(route,tick,phase,speed=1.05){
 const segments=route.map((point,i)=>{
  const next=route[(i+1)%route.length],path=findNeighborPath(point,next),length=neighborPathLength(path);
  return {point,next,path,length,travel:Math.max(1.8,length/speed),pause:point.pause||1};
 });
 const cycle=segments.reduce((sum,segment)=>sum+segment.pause+segment.travel,0);
 let time=((tick+phase)%cycle+cycle)%cycle;
 for(const segment of segments){
  const path=segment.path,first=path[0]||segment.point,second=path[1]||segment.next;
  const initialFacing=Math.atan2(second.x-first.x,second.z-first.z);
  if(time<segment.pause)return {...segment.point,x:first.x,z:first.z,facing:initialFacing,moving:false,walk:0};
  time-=segment.pause;
  if(time<segment.travel&&segment.length>.001){
   const raw=Math.max(0,Math.min(1,time/segment.travel)),progress=raw*raw*(3-2*raw);
   let distance=progress*segment.length;
   for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
    if(distance<=length||i===path.length-1){
     const ratio=length?Math.min(1,distance/length):0;
     return {x:a.x+dx*ratio,z:a.z+dz*ratio,facing:Math.atan2(dx,dz),moving:true,walk:Math.sin(time*8+phase),activity:''};
    }
    distance-=length;
   }
  }
  time-=segment.travel;
 }
 const first=segments[0]?.path[0]||route[0];
 return {...route[0],x:first.x,z:first.z,facing:0,moving:false,walk:0};
}
const FAMILY_ROUTES={
 dad:[
  {x:14,z:-4.8,pause:1.4,activity:'👋'},
  {x:14,z:-1.4,pause:2.0,activity:'🌳'},
  {x:17,z:-.8,pause:1.0,activity:'☀️'},
  {x:19.5,z:-2.0,pause:1.8,activity:'🏡'},
  {x:17,z:-3.3,pause:1.1,activity:'🌼'}
 ],
 mom:[
  {x:22,z:-4.4,pause:2.4,activity:'🌸'},
  {x:23.5,z:-1.8,pause:2.1,activity:'🌷'},
  {x:20.8,z:-.5,pause:2.8,activity:'☀️'},
  {x:19.8,z:-2.5,pause:2.0,activity:'🏡'}
 ],
 lia:[
  {x:15.2,z:-1.1,pause:1.4,activity:'🦋'},
  {x:16.5,z:-.4,pause:1.0,activity:'🌼'},
  {x:17.3,z:-1.7,pause:1.2,activity:'🌷'},
  {x:16.2,z:-2.7,pause:1.0,activity:'💐'}
 ],
 maya:[
  {x:19.2,z:-1.2,pause:1.1,activity:'🌻'},
  {x:21.4,z:-.8,pause:1.5,activity:'🐾'},
  {x:22.3,z:-2.2,pause:1.0,activity:'🌺'},
  {x:20.4,z:-3.2,pause:1.3,activity:'🌿'}
 ],
 nico:[
  {x:13.2,z:-7.7,pause:.7,activity:'🏃'},
  {x:13.6,z:-5.5,pause:.6,activity:'🐕'},
  {x:14.8,z:-3.9,pause:.9,activity:'⚽'},
  {x:13.7,z:-2.5,pause:.6,activity:'🌳'},
  {x:12.8,z:-4.7,pause:.8,activity:'🏃'}
 ]
};
const NEIGHBOR_SLEEP_SPOTS={
 hyacinth:{x:-10.85,z:-4.85,facing:Math.PI/2},
 theo:{x:12.15,z:-14.85,facing:Math.PI/2},
 dad:{x:17.0,z:-7.9,facing:Math.PI/2},
 mom:{x:19.1,z:-7.9,facing:Math.PI/2},
 lia:{x:17.0,z:-6.2,facing:Math.PI/2},
 maya:{x:19.1,z:-6.2,facing:Math.PI/2},
 nico:{x:18.1,z:-8.35,facing:Math.PI/2}
};
function familyMembers(t,night=false){
 const people=[
  {id:'dad',name:'Miguel',route:FAMILY_ROUTES.dad,speed:1.12,pace:7.2,phase:1.5,scale:1.10,shirt:'#477b9a',hair:'#392b24',skin:'#c9916d',pants:'#40516c',shoes:'#493b35',eyes:'#302820',hairStyle:'short',outfitStyle:'tee',accessory:'none'},
  {id:'mom',name:'Ana',route:FAMILY_ROUTES.mom,speed:.92,pace:6.8,phase:8.2,scale:1.02,shirt:'#bd7896',hair:'#493127',skin:'#edc19e',pants:'#557c65',shoes:'#88516c',eyes:'#302820',hairStyle:'long',outfitStyle:'dress',accessory:'flower',accessoryColor:'#f2c768'},
  {id:'lia',name:'Lia',route:FAMILY_ROUTES.lia,speed:1.42,pace:10.2,phase:3.4,scale:.78,shirt:'#e58eaa',hair:'#57372b',skin:'#f0c9a9',pants:'#83a86c',shoes:'#c75e7c',eyes:'#302820',hairStyle:'pigtails',outfitStyle:'dress',accessory:'bow',accessoryColor:'#f4c4d5'},
  {id:'maya',name:'Maya',route:FAMILY_ROUTES.maya,speed:1.30,pace:9.6,phase:12.7,scale:.75,shirt:'#e6bb58',hair:'#3f3028',skin:'#e8b995',pants:'#5593a0',shoes:'#b87845',eyes:'#302820',hairStyle:'bob',outfitStyle:'overalls',accessory:'flower',accessoryColor:'#f28cae'},
  {id:'nico',name:'Nico',route:FAMILY_ROUTES.nico,speed:1.68,pace:11.4,phase:5.9,scale:.82,shirt:'#6d9b70',hair:'#382921',skin:'#dba77f',pants:'#526d8c',shoes:'#5d4b3e',eyes:'#302820',hairStyle:'curly',outfitStyle:'hoodie',accessory:'none'}
 ];
 return people.map(p=>({
  ...p,
  ...(night?{...NEIGHBOR_SLEEP_SPOTS[p.id],sleeping:true,moving:false,walk:0}:neighborOnRoute(p.route,t,p.phase,p.speed)),
  activity:undefined,homeX:16,homeZ:-9
 }));
}
function currentNeighbors(t=performance.now()/1000,night=getTimePalette(t).mode==='night'){
 const hyacinth=night?{...NEIGHBOR_SLEEP_SPOTS.hyacinth,sleeping:true,moving:false,walk:0}:neighborOnRoute(NEIGHBOR_ROUTES.hyacinth,t,0);
 const theo=night?{...NEIGHBOR_SLEEP_SPOTS.theo,sleeping:true,moving:false,walk:0}:neighborOnRoute(NEIGHBOR_ROUTES.theo,t,11);
 return [
  {id:'hyacinth',name:'hyacinth',...hyacinth,phase:0,shirt:'#d94b3d',hair:'#493127',skin:'#f0c7a3',pants:'#287b8a',shoes:'#bd4540',eyes:'#302820',hairStyle:'bob',outfitStyle:'hoodie',accessory:'none',homeX:-13,homeZ:-7},
  {id:'theo',name:'Theo',...theo,phase:11,shirt:'#48a78b',hair:'#efbd43',skin:'#dfab83',pants:'#219da5',shoes:'#e6b64d',eyes:'#302820',hairStyle:'pigtails',outfitStyle:'overalls',accessory:'glasses',accessoryColor:'#ec83ba',homeX:10,homeZ:-17},
  ...familyMembers(t,night)
 ];
}
function neighborAtScreen(px,py){
 const cam=cameraState(),w=canvas.clientWidth,h=canvas.clientHeight;let hit=null,best=Infinity;
 for(const n of currentNeighbors()){
  if(n.sleeping)continue;
  const facing=n.facing||0;
  const p=project({x:n.x+Math.sin(facing)*.38,y:1.18,z:n.z+Math.cos(facing)*.38},cam,w,h);if(!p)continue;
  const d=Math.hypot(px-p.x,py-p.y);if(d<66&&d<best){best=d;hit=n;}
 }
 return hit;
}
function animalPositions(t=performance.now()/1000){
 const stroll=(x,z,phase,rate=.32)=>({
  x:x+Math.sin(t*rate+phase)*.62,
  z:z+Math.cos(t*(rate*.82)+phase)*.42,
  facing:Math.atan2(rate*Math.cos(t*rate+phase),-rate*.82*Math.sin(t*(rate*.82)+phase)),
  moving:true,phase
 });
 return [
  {id:'sheep',name:'Pip the sheep',species:'sheep',emoji:'🐑',x:-2+Math.sin(t*.32)*.55,z:-7+Math.cos(t*.27)*.45},
  {id:'cat',name:'Mochi',species:'cat',emoji:'🐱',x:3+Math.sin(t*.28)*.5,z:-7+Math.cos(t*.25)*.4,facing:0},
  {id:'cat_miso',name:'Miso',species:'cat',emoji:'🐈',body:'#b5a69a',accent:'#e6d8c8',...stroll(22,-4.2,1.4,.24)},
  {id:'cat_tofu',name:'Tofu',species:'cat',emoji:'🐈',body:'#d8b77e',accent:'#f1e2bd',...stroll(19.5,-8.8,4.7,.20)},
  {id:'dog_buddy',name:'Buddy',species:'dog',emoji:'🐕',body:'#d6a15f',accent:'#f1d7a8',...stroll(17,-1.9,.2,.30)},
  {id:'dog_biscuit',name:'Biscuit',species:'dog',emoji:'🐶',body:'#b87b4b',accent:'#efd2a4',...stroll(22,-7.4,2.2,.27)},
  {id:'dog_pepper',name:'Pepper',species:'dog',emoji:'🐕‍🦺',body:'#eee8dc',accent:'#4c4847',...stroll(14.5,-5.9,3.6,.22)}
 ];
}
function animalAtScreen(px,py){const cam=cameraState(),w=canvas.clientWidth,h=canvas.clientHeight;let hit=null,best=Infinity;for(const a of animalPositions()){const facing=a.facing||0,p=project({x:a.x+Math.sin(facing)*.30,y:.48,z:a.z+Math.cos(facing)*.30},cam,w,h);if(!p)continue;const d=Math.hypot(px-p.x,py-p.y);if(d<64&&d<best){best=d;hit=a;}}return hit;}
function drawPetFigure(queue,cam,w,h,a,tick){
 const facing=a.facing||0,c=Math.cos(facing),s=Math.sin(facing);
 const dog=a.species==='dog',body=a.body||'#d6a15f',accent=a.accent||'#f1d7a8';
 const phase=Number.isFinite(a.phase)?a.phase:0;
 const gaitRate=dog?12.5:7.2;
 const stride=Math.sin(tick*gaitRate+phase);
 const bob=a.moving?Math.abs(Math.sin(tick*gaitRate*2+phase))*(dog?.035:.018):Math.sin(tick*1.2+phase)*.01;
 const wag=Math.sin(tick*(dog?15:6.5)+phase);
 const cube=(dx,y,dz,color,sx,sy,sz)=>{
  const centerX=a.x+dx*c+dz*s,centerZ=a.z-dx*s+dz*c;
  pushCubeFacing(queue,cam,w,h,centerX-sx/2,y,centerZ-sz/2,color,sx,sy,sz,facing,false);
 };
 if(dog){
  cube(0,.20+bob,-.02,body,.62,.40,.86);
  cube(0,.47+bob,.35,body,.43,.43,.42);
  cube(0,.38+bob,.60,accent,.25,.16,.18);
  cube(0,.43+bob,.70,'#39332e',.075,.07,.06);
  for(const dx of [-.13,.13]){
   cube(dx,.55+bob,.57,'#292622',.055,.07,.035);
   cube(dx*1.65,.65+bob,.34,accent,.13,.22,.14);
  }
  for(const [dx,dz,index] of [[-.21,-.28,0],[.21,-.28,Math.PI],[-.21,.28,Math.PI],[.21,.28,0]]){
   const step=stride*Math.cos(index),lift=Math.max(0,Math.sin(tick*gaitRate+phase+index))*.075;
   const legZ=dz+step*.10;
   cube(dx,.015+bob+lift,legZ,body,.15,.27,.16);
   cube(dx,.03+bob+lift,legZ+(dz>0?.015:-.015),accent,.155,.06,.17);
  }
  // A wagging tail makes the dogs look excited rather than frozen.
  cube(wag*.13,.40+bob+Math.abs(wag)*.035,-.53,body,.13,.13,.36);
 }else{
  cube(0,.16+bob,-.03,body,.48,.32,.68);
  cube(0,.43+bob,.29,body,.39,.39,.36);
  for(const dx of [-.14,.14]){
   cube(dx,.68+bob,.34,body,.14,.20,.13);
   cube(dx,.52+bob,.47,'#302b29',.05,.06,.035);
  }
  cube(0,.37+bob,.49,accent,.17,.11,.10);
  cube(0,.41+bob,.55,'#8a6b68',.055,.04,.04);
  for(const [dx,dz,index] of [[-.16,-.25,0],[.16,-.25,Math.PI],[ -.16,.22,Math.PI],[.16,.22,0]]){
   const step=stride*Math.cos(index),lift=Math.max(0,Math.sin(tick*gaitRate+phase+index))*.042;
   const legZ=dz+step*.055;
   cube(dx,.015+bob+lift,legZ,body,.12,.22,.13);
  }
  // Cats keep their tails higher and swish them more slowly.
  cube(.28+wag*.10,.25+bob+Math.abs(wag)*.05,-.34,body,.11,.11,.45);
 }
}
function drawNeighborFigure(queue,cam,w,h,n,bob,tick){
 const facing=n.facing||0,c=Math.cos(facing),s=Math.sin(facing);
 const phase=Number.isFinite(n.phase)?n.phase:0;
 const unitScale=Number.isFinite(n.scale)?n.scale:1;
 const pace=Number.isFinite(n.pace)?n.pace:8;
 const walk=n.moving?Math.sin(tick*pace+phase):0;
 const legSwing=walk*.13;
 const leftLift=n.moving?Math.max(0,Math.cos(tick*pace+phase))*.045:0;
 const rightLift=n.moving?Math.max(0,-Math.cos(tick*pace+phase))*.045:0;
 const armSwing=-legSwing*.72;
 const shoe=n.shoes||'#665348',pants=n.pants||'#48617a';
 const hairStyle=n.hairStyle||'short',outfit=n.outfitStyle||'hoodie';
 const accessory=n.accessory||'none',accent=n.accessoryColor||'#f4a8bb';

 // All x/z inputs below describe the CENTER of each piece.
 // Convert that center to the lower corner expected by pushCube.
 // This keeps the head, torso, limbs and accessories on one shared axis.
 const cube=(dx,y,dz,color,sx,sy,sz)=>{
  const centerX=n.x+dx*unitScale*c+dz*unitScale*s;
  const centerZ=n.z-dx*unitScale*s+dz*unitScale*c;
  pushCubeFacing(queue,cam,w,h,centerX-sx*unitScale/2,y*unitScale,centerZ-sz*unitScale/2,color,sx*unitScale,sy*unitScale,sz*unitScale,facing);
 };

 // Torso and outfit.
 cube(0,.78+bob,0,n.shirt,.70,.82,.46);
 if(outfit==='hoodie'){
  cube(0,1.13+bob,-.25,n.hair,.44,.20,.08);
  cube(0,.57+bob,.245,shadeColor(n.shirt,.78),.34,.17,.035);
  cube(-.12,.58+bob,.27,'#f2e5d4',.025,.07,.015);
  cube(.12,.58+bob,.27,'#f2e5d4',.025,.07,.015);
 }else if(outfit==='sweater'){
  cube(0,.40+bob,.02,shadeColor(n.shirt,1.16),.58,.10,.035);
  cube(-.25,.55+bob,.24,shadeColor(n.shirt,.82),.13,.12,.035);
  cube(.25,.55+bob,.24,shadeColor(n.shirt,.82),.13,.12,.035);
 }else if(outfit==='overalls'){
  cube(0,.76+bob,.245,pants,.43,.57,.055);
  cube(-.18,1.04+bob,.245,pants,.105,.30,.055);
  cube(.18,1.04+bob,.245,pants,.105,.30,.055);
  cube(0,.78+bob,.282,'#f0dda7',.12,.10,.025);
 }else if(outfit==='dress'){
  cube(0,.43+bob,.015,n.pants||n.shirt,.86,.48,.54);
  cube(0,.22+bob,.025,shadeColor(n.shirt,.90),.74,.08,.55);
 }else if(outfit==='tee'){
  cube(-.22,.78+bob,.245,shadeColor(n.shirt,1.12),.12,.45,.035);
  cube(.22,.78+bob,.245,shadeColor(n.shirt,1.12),.12,.45,.035);
 }

 // Legs and shoes connect to the lower edge of the torso.
 cube(-.18,.18+bob+leftLift,-.025+legSwing,pants,.25,.62,.30);
 cube(.18,.18+bob+rightLift,-.025-legSwing,pants,.25,.62,.30);
 cube(-.19,.025+bob+leftLift,.045+legSwing,shoe,.32,.16,.39);
 cube(.19,.025+bob+rightLift,.045-legSwing,shoe,.32,.16,.39);

 // Neck and centered head.
 cube(0,1.35+bob,0,n.skin,.22,.20,.24);
 cube(0,1.49+bob,0,n.skin,.60,.62,.56);

 // Hair cap and hairstyle pieces.
 cube(0,1.99+bob,-.025,n.hair,.64,.18,.60);
 if(hairStyle==='bob'){
  cube(-.30,1.25+bob,-.015,n.hair,.16,.60,.48);
  cube(.30,1.25+bob,-.015,n.hair,.16,.60,.48);
 }else if(hairStyle==='long'){
  cube(-.30,.98+bob,-.035,n.hair,.15,.92,.42);
  cube(.30,.98+bob,-.035,n.hair,.15,.92,.42);
  cube(0,1.02+bob,-.285,n.hair,.52,.96,.12);
 }else if(hairStyle==='ponytail'){
  cube(.27,1.58+bob,-.32,n.hair,.24,.25,.24);
  cube(.34,1.27+bob,-.40,n.hair,.20,.42,.20);
 }else if(hairStyle==='pigtails'){
  cube(-.39,1.47+bob,-.04,n.hair,.22,.30,.25);
  cube(.39,1.47+bob,-.04,n.hair,.22,.30,.25);
  cube(-.41,1.22+bob,-.075,n.hair,.19,.30,.20);
  cube(.41,1.22+bob,-.075,n.hair,.19,.30,.20);
 }else if(hairStyle==='curly'){
  for(const [dx,dy,dz] of [[-.27,1.96,-.08],[-.14,2.05,-.08],[0,2.08,-.08],[.14,2.05,-.08],[.27,1.96,-.08],[-.33,1.80,-.07],[.33,1.80,-.07]]){
   cube(dx,dy+bob,dz,n.hair,.20,.20,.20);
  }
 }else if(hairStyle==='buns'){
  cube(-.32,2.00+bob,-.03,n.hair,.26,.25,.26);
  cube(.32,2.00+bob,-.03,n.hair,.26,.25,.26);
 }else{
  cube(-.30,1.49+bob,-.035,n.hair,.14,.34,.40);
  cube(.30,1.49+bob,-.035,n.hair,.14,.34,.40);
 }

 // Face and fringe are drawn as depth-sorted decals below. They stay attached
 // to the head without tiny cubes being culled at oblique camera angles.

 // Arms swing opposite to the legs; hands meet the sleeves.
 cube(-.44,.82+bob,-.005+armSwing,n.shirt,.22,.56,.28);
 cube(.44,.82+bob,-.005-armSwing,n.shirt,.22,.56,.28);
 cube(-.44,.60+bob,.025+armSwing,n.skin,.20,.22,.22);
 cube(.44,.60+bob,.025-armSwing,n.skin,.20,.22,.22);

 // Accessories are centered and attached to the hairline or face.
 if(accessory==='bow'){
  cube(-.255,2.01+bob,.04,accent,.19,.12,.12);
  cube(-.085,2.01+bob,.04,accent,.19,.12,.12);
  cube(-.17,2.01+bob,.11,'#f7e8d0',.065,.08,.06);
 }else if(accessory==='flower'){
  cube(-.34,1.98+bob,.055,accent,.15,.15,.12);
  cube(-.34,1.84+bob,.07,'#f6d36b',.07,.07,.06);
 }else if(accessory==='glasses'){
  cube(-.13,1.78+bob,.335,accent,.18,.11,.045);
  cube(.13,1.78+bob,.335,accent,.18,.11,.045);
  cube(0,1.78+bob,.355,accent,.07,.03,.025);
 }else if(accessory==='cap'){
  cube(0,2.04+bob,-.035,accent,.70,.13,.62);
  cube(0,1.97+bob,.20,accent,.73,.055,.23);
 }
}
function addCharacterFaceDetails(queue,cam,w,h,n,bob){
 const facing=n.facing||0,c=Math.cos(facing),s=Math.sin(facing),scale=Number.isFinite(n.scale)?n.scale:1;
 const vx=cam.pos.x-n.x,vz=cam.pos.z-n.z,dist=Math.hypot(vx,vz)||1;
 const front=(s*vx+c*vz)/dist;
 // Keep the original face visible through normal turns; fade only as it turns away.
 const alpha=Math.max(0,Math.min(1,(front+.05)/.15));
 if(alpha<=0)return;
 const point=(dx,y,dz)=>{
  const v={x:n.x+dx*scale*c+dz*scale*s,y:y*scale,z:n.z-dx*scale*s+dz*scale*c};
  return project(v,cam,w,h);
 };
 // These flat front faces use the exact sizes and positions of the original
 // little voxel details, but stay in the shared depth queue while the avatar moves.
 const addPatch=(cx,baseY,frontZ,width,height,color)=>{
  const pts=[
   point(cx-width/2,baseY+height,frontZ),
   point(cx+width/2,baseY+height,frontZ),
   point(cx+width/2,baseY,frontZ),
   point(cx-width/2,baseY,frontZ)
  ];
  if(pts.some(p=>!p))return;
  const depth=pts.reduce((sum,p)=>sum+p.d,0)/pts.length-.012;
  queue.push({faceMark:'patch',pts,depth,color:shadeColor(color,.90),alpha,outline:true});
 };
 // Original fringe: 0.42 x 0.13, at the original height.
 addPatch(0,1.94+bob,.3525,.42,.13,n.hair||'#493127');
 // Original tiny square eyes: no oversized white sclera or highlights.
 addPatch(-.13,1.78+bob,.3145,.065,.065,n.eyes||'#302820');
 addPatch(.13,1.78+bob,.3145,.065,.065,n.eyes||'#302820');
 // Original small, narrow nose.
 addPatch(0,1.66+bob,.319,.10,.025,'#9a6c5c');
}
function drawNeighborHome(queue,cam,w,h,x,z,wall,roof,door){pushCube(queue,cam,w,h,x,0,z, '#80654b',4.3,.16,4.3);pushCube(queue,cam,w,h,x,.16,z,wall,4.3,2.25,.18);pushCube(queue,cam,w,h,x,.16,z+4.12,wall,1.05,2.25,.18);pushCube(queue,cam,w,h,x+3.25,.16,z+4.12,wall,1.05,2.25,.18);pushCube(queue,cam,w,h,x,.16,z+.18,wall,.18,2.25,3.95);pushCube(queue,cam,w,h,x+4.12,.16,z+.18,wall,.18,2.25,3.95);pushCube(queue,cam,w,h,x+1.58,.16,z+4.02,door,.92,1.65,.20);pushCube(queue,cam,w,h,x+.52,1.05,z+4.03,'#a9dce8',.65,.58,.05);pushCube(queue,cam,w,h,x+3.12,1.05,z+4.03,'#a9dce8',.65,.58,.05);for(let row=0;row<3;row++){const inset=row*.42;pushCube(queue,cam,w,h,x+inset,2.36+row*.42,z-inset,roof,4.3-inset*2,.48,4.55+inset*2);}pushCube(queue,cam,w,h,x+1.5,2.9,z+4.34,'#e5d49b',1.05,.34,.12);pushCube(queue,cam,w,h,x+.15,.04,z+4.4,'#6b9857',.48,.24,.32);pushCube(queue,cam,w,h,x+3.6,.04,z+4.4,'#6b9857',.48,.24,.32);}
function openAnimalCare(a){selectedAnimalId=a.id;selectedAnimalName=a.name||(a.id==='sheep'?'Pip the sheep':'Mochi');$('animalCareTitle').textContent=(a.emoji||'🐾')+' Care for '+selectedAnimalName;const count=world.animalCare?.[a.id]||0;$('animalCareNote').textContent=selectedAnimalName+' enjoys gentle care. Care activities together: '+count;$('animalCareFeedback').textContent=selectedAnimalName+' is happy to see you.';openShade('animalCareShade');}
function careForAnimal(action){const info={snack:['🍎','A tasty snack. '+selectedAnimalName+' is happily nibbling!'],water:['💧','Fresh water. '+selectedAnimalName+' has had a lovely drink!'],brush:['✨','A gentle brush. '+selectedAnimalName+' looks extra fluffy!'],play:['💚','A little playtime. '+selectedAnimalName+' is happily playing!']}[action];if(!info)return;world.animalCare=world.animalCare||{};world.animalCare[selectedAnimalId]=Math.min(999,(world.animalCare[selectedAnimalId]||0)+1);animalCareFlashUntil=performance.now()+1900;animalCareFlashEmoji=info[0];$('animalCareFeedback').textContent=info[1];$('animalCareNote').textContent=selectedAnimalName+' has enjoyed '+world.animalCare[selectedAnimalId]+' caring moments with you.';save();showStatus(info[1]);}
function pushTerrainFace(queue,cam,w,h,vertices,color,material='dirt'){const pts=vertices.map(v=>project(v,cam,w,h));if(pts.some(p=>!p))return;const depth=pts.reduce((sum,p)=>sum+p.d,0)/pts.length;queue.push({pts,depth,color,outline:true,material});}
function pushGroundSurface(queue,cam,w,h,color){
 const radius=24,cx=Math.floor(cam.pos.x),cz=Math.floor(cam.pos.z);
 const minX=Math.max(-WORLD_LIMIT,cx-radius),maxX=Math.min(WORLD_LIMIT-1,cx+radius);
 const minZ=Math.max(-WORLD_LIMIT,cz-radius),maxZ=Math.min(WORLD_LIMIT-1,cz+radius);
 for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++){
  if(groundDepthAt(x,z)>0)continue;
  const vertices=[{x,y:0,z},{x:x+1,y:0,z},{x:x+1,y:0,z:z+1},{x,y:0,z:z+1}],pts=vertices.map(v=>project(v,cam,w,h));
  if(pts.some(p=>!p))continue;
  const left=Math.min(...pts.map(p=>p.x)),right=Math.max(...pts.map(p=>p.x));
  const top=Math.min(...pts.map(p=>p.y)),bottom=Math.max(...pts.map(p=>p.y));
  if(right< -24||left>w+24||bottom< -24||top>h+24)continue;
  const underground=cam.pos.y<-.15;
  const visibleColor=underground?'#76553d':color;
  queue.push({pts,depth:pts.reduce((sum,p)=>sum+p.d,0)/pts.length,color:visibleColor,outline:false,material:underground?'dirt':'grass'});
 }
}
function pushExcavationTerrain(queue,cam,w,h){for(const [cell,depth] of groundDepths){if(depth<1)continue;const [x,z]=cell.split(',').map(Number);if(Math.abs(x-cam.pos.x)>24||Math.abs(z-cam.pos.z)>24)continue;const floorY=-depth;
 pushTerrainFace(queue,cam,w,h,[{x,y:floorY,z},{x:x+1,y:floorY,z},{x:x+1,y:floorY,z:z+1},{x,y:floorY,z:z+1}],'#775236','dirt');
 const west=groundDepthAt(x-1,z),east=groundDepthAt(x+1,z),north=groundDepthAt(x,z-1),south=groundDepthAt(x,z+1);
 if(west<depth)pushTerrainFace(queue,cam,w,h,[{x,y:floorY,z},{x,y:-west,z},{x,y:-west,z:z+1},{x,y:floorY,z:z+1}],'#98704b','dirt');
 if(east<depth)pushTerrainFace(queue,cam,w,h,[{x:x+1,y:floorY,z:z+1},{x:x+1,y:-east,z:z+1},{x:x+1,y:-east,z},{x:x+1,y:floorY,z}],'#765034','dirt');
 if(north<depth)pushTerrainFace(queue,cam,w,h,[{x,y:floorY,z},{x:x+1,y:floorY,z},{x:x+1,y:-north,z},{x,y:-north,z}],'#8c6543','dirt');
 if(south<depth)pushTerrainFace(queue,cam,w,h,[{x:x+1,y:floorY,z:z+1},{x,y:floorY,z:z+1},{x,y:-south,z:z+1},{x:x+1,y:-south,z:z+1}],'#68482f','dirt');}}
function pushWaterSurfaces(queue,cam,w,h){
 const visible=[];let minY=Infinity,maxY=-Infinity;
 // One shared color field is built from the visible water area, not each cell.
 for(const cell of waterCells){
  const [x,z]=cell.split(',').map(Number),depth=groundDepthAt(x,z),topY=waterTopAt(x,z);
  if(depth<1||topY===null||Math.abs(x-cam.pos.x)>24||Math.abs(z-cam.pos.z)>24)continue;
  const topVertices=[{x,y:topY,z},{x:x+1,y:topY,z},{x:x+1,y:topY,z:z+1},{x,y:topY,z:z+1}];
  const topPts=topVertices.map(v=>project(v,cam,w,h));if(topPts.some(p=>!p))continue;
  for(const p of topPts){minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
  visible.push({x,z,depth,topY,floorY:-depth,topPts});
 }
 if(!visible.length)return;
 const span=Math.max(100,maxY-minY),gradientTop=minY-span*.08,gradientBottom=maxY+span*.08;
 const surfaceGradient=ctx.createLinearGradient(0,gradientTop,0,gradientBottom);
 surfaceGradient.addColorStop(0,'#a8f1ff');surfaceGradient.addColorStop(.42,'#55c5ed');surfaceGradient.addColorStop(1,'#0877b8');
 const sideGradient=ctx.createLinearGradient(0,gradientTop,0,gradientBottom);
 sideGradient.addColorStop(0,'#55c9ed');sideGradient.addColorStop(.48,'#168ec5');sideGradient.addColorStop(1,'#075184');
 for(const item of visible){
  const {x,z,depth,topY,floorY,topPts}=item;
  const averageDepth=topPts.reduce((sum,p)=>sum+p.d,0)/topPts.length;
  const wallCentreY=-depth/2,surfaceBehindRim=Math.max(0,-(topY-wallCentreY)*Math.sin(cam.pitch));
  queue.push({pts:topPts,depth:averageDepth+surfaceBehindRim+.012,color:'#61cfee',alpha:.60,outline:false,waterSurface:true,waterGradient:surfaceGradient,waterX:x,waterZ:z});
  // Neighbor culling: only the pool's exposed shoreline/step edges are drawn.
  const topEdges=[{dx:0,dz:-1,a:0,b:1},{dx:1,dz:0,a:1,b:2},{dx:0,dz:1,a:2,b:3},{dx:-1,dz:0,a:3,b:0}];
  for(const edge of topEdges){
   const neighborTop=waterTopAt(x+edge.dx,z+edge.dz);
   if(neighborTop!==null&&neighborTop>=topY-.001)continue;
   const p=topPts[edge.a],q=topPts[edge.b];
   queue.push({line:true,p,q,depth:(p.d+q.d)/2-.006,color:'rgba(232,251,255,.38)',width:.8,waterBoundary:true});
  }
  const sides=[
   {dx:0,dz:-1,normal:[0,0,-1],verticesAt:(low,high)=>[{x,y:low,z},{x:x+1,y:low,z},{x:x+1,y:high,z},{x,y:high,z}]},
   {dx:0,dz:1,normal:[0,0,1],verticesAt:(low,high)=>[{x:x+1,y:low,z:z+1},{x,y:low,z:z+1},{x,y:high,z:z+1},{x:x+1,y:high,z:z+1}]},
   {dx:-1,dz:0,normal:[-1,0,0],verticesAt:(low,high)=>[{x,y:low,z:z+1},{x,y:low,z},{x,y:high,z},{x,y:high,z:z+1}]},
   {dx:1,dz:0,normal:[1,0,0],verticesAt:(low,high)=>[{x:x+1,y:low,z},{x:x+1,y:low,z:z+1},{x:x+1,y:high,z:z+1},{x:x+1,y:high,z}]}
  ];
  for(const side of sides){
   const neighborTop=waterTopAt(x+side.dx,z+side.dz);
   if(neighborTop!==null&&neighborTop>=topY-.001)continue;
   const exposedFrom=neighborTop===null?floorY:Math.max(floorY,neighborTop);
   const viewX=cam.pos.x-(x+.5),viewZ=cam.pos.z-(z+.5);
   if(side.normal[0]*viewX+side.normal[2]*viewZ<=0)continue;
   const layerCount=Math.ceil(topY-floorY);
   for(let layer=0;layer<layerCount;layer++){
    const layerBottom=floorY+layer,layerTop=Math.min(topY,layerBottom+1),low=Math.max(layerBottom,exposedFrom),high=layerTop;
    if(high-low<.015)continue;
    const pts=side.verticesAt(low,high).map(v=>project(v,cam,w,h));if(pts.some(p=>!p))continue;
    const averageSideDepth=pts.reduce((sum,p)=>sum+p.d,0)/pts.length;
    queue.push({pts,depth:averageSideDepth-.018,color:'#55c9eb',alpha:.37,outline:false,waterSide:true,waterGradient:sideGradient,waterLayer:layer});
   }
  }
 }
}
function paintWaterFace(poly,time){
 const pts=poly.pts;if(!pts||pts.length!==4)return;
 const minX=Math.min(...pts.map(p=>p.x))-3,maxX=Math.max(...pts.map(p=>p.x))+3;
 const minY=Math.min(...pts.map(p=>p.y))-3,maxY=Math.max(...pts.map(p=>p.y))+3;
 const waterX=poly.waterX??0,waterZ=poly.waterZ??0;
 const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
 // Bilinear screen mapping keeps every ripple attached to its world-space
 // position, including where the curve crosses into the neighboring cell.
 const pointAt=(u,v)=>lerp(lerp(pts[0],pts[1],u),lerp(pts[3],pts[2],u),v);
 ctx.save();
 ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip();
 const gradient=poly.waterGradient;
 ctx.fillStyle=gradient||(poly.waterSurface?'#55c5ed':'#168ec5');
 ctx.fillRect(minX,minY,maxX-minX,maxY-minY);
 if(poly.waterSurface){
  // Cross-current A: broad, slow diagonal swells.
  // Its phase is derived from absolute world X/Z, never from a tile-local seed.
  const spacingA=2.9;
  const firstA=Math.floor((waterZ+.35*waterX-.2)/spacingA)-1;
  const lastA=Math.ceil((waterZ+1+.35*(waterX+1)+.2)/spacingA)+1;
  ctx.save();ctx.lineWidth=1.05;ctx.lineCap='round';ctx.lineJoin='round';
  for(let k=firstA;k<=lastA;k++){
   ctx.beginPath();let started=false;
   for(let s=0;s<=16;s++){
    const u=s/16,worldX=waterX+u;
    const worldZ=k*spacingA-.35*worldX-.15*Math.sin(worldX*.82-time*.00048+k*.7);
    const p=pointAt(u,worldZ-waterZ);
    if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);
   }
   ctx.strokeStyle='rgba(239,253,255,.22)';ctx.stroke();
  }
  ctx.restore();
  // Cross-current B: finer ripples travel in a different direction and speed.
  // The curves intersect A to create a subtle interference-like water pattern.
  const spacingB=3.35;
  const firstB=Math.floor((waterX+.48*waterZ-.2)/spacingB)-1;
  const lastB=Math.ceil((waterX+1+.48*(waterZ+1)+.2)/spacingB)+1;
  ctx.save();ctx.lineWidth=.8;ctx.lineCap='round';ctx.lineJoin='round';
  for(let k=firstB;k<=lastB;k++){
   ctx.beginPath();let started=false;
   for(let s=0;s<=16;s++){
    const v=s/16,worldZ=waterZ+v;
    const worldX=k*spacingB-.48*worldZ-.12*Math.sin(worldZ*.94+time*.00072+k*.55);
    const p=pointAt(worldX-waterX,v);
    if(!started){ctx.moveTo(p.x,p.y);started=true;}else ctx.lineTo(p.x,p.y);
   }
   ctx.strokeStyle='rgba(176,237,255,.17)';ctx.stroke();
  }
  ctx.restore();
  // Soft moving highlights add depth without drawing tile-shaped borders.
  const glowPhase=time*.00038+waterX*.31+waterZ*.23;
  const glowU=.5+Math.sin(glowPhase)*.25,glowV=.5+Math.cos(glowPhase*.83)*.22;
  const glowPoint=pointAt(glowU,glowV);
  const radius=Math.max(7,Math.min(20,(maxX-minX)*.18));
  const glow=ctx.createRadialGradient(glowPoint.x,glowPoint.y,1,glowPoint.x,glowPoint.y,radius);
  glow.addColorStop(0,'rgba(245,255,255,.16)');glow.addColorStop(1,'rgba(245,255,255,0)');
  ctx.fillStyle=glow;ctx.fillRect(minX,minY,maxX-minX,maxY-minY);
 }
 ctx.restore();
}
function pushFishOverlays(queue,cam,w,h){
 const time=performance.now()/1000,colors=['#f1ad55','#f28c72','#f2d56b','#72c4cb'];
 fishSpots.forEach((fish,i)=>{
  const depth=groundDepthAt(fish.x,fish.z),key=keyGround(fish.x,fish.z);
  if(depth<1||!waterCells.has(key))return;
  const phase=time*1.05+i*1.9,cx=fish.x+.5+Math.sin(phase)*.055,cz=fish.z+.5+Math.cos(phase*.8)*.055;
  const angle=phase*.48,ca=Math.cos(angle),sa=Math.sin(angle),y=-depth+.59;
  const point=(lx,lz)=>({x:cx+lx*ca-lz*sa,y,z:cz+lx*sa+lz*ca});
  const silhouette=[
   point(-.19,0),point(-.105,-.065),point(-.07,-.052),point(.01,-.078),
   point(.135,-.05),point(.19,0),point(.135,.05),point(.01,.078),
   point(-.07,.052),point(-.105,.065)
  ];
  const pts=silhouette.map(v=>project(v,cam,w,h));
  if(pts.some(p=>!p))return;
  const d=pts.reduce((sum,p)=>sum+p.d,0)/pts.length;
  queue.push({pts,depth:d,color:colors[i%colors.length],outline:false});
  const eye=project(point(.125,-.018),cam,w,h);
  if(eye)queue.push({fishEye:true,x:eye.x,y:eye.y,depth:eye.d,radius:Math.max(.7,Math.min(2.1,10/eye.d))});
 });
}
function render(){const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height;if(!w||!h)return;const dpr=Math.min(devicePixelRatio||1,1.3),W=Math.floor(w*dpr),H=Math.floor(h*dpr);if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}ctx.setTransform(dpr,0,0,dpr,0,0);
 const palette=getTimePalette(performance.now()/1000),cam=cameraState(),polys=[];
 const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,palette.sky[0]);sky.addColorStop(.7,palette.sky[1]);sky.addColorStop(1,palette.sky[2]);ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 // Celestial objects live on the world sky dome, not at fixed screen coordinates.
 drawSkyDecorations(cam,w,h,palette);
 // Draw the ground as camera-visible cells. A single world-sized polygon
 // can have corners behind the camera, causing the entire floor to disappear.
 pushGroundSurface(polys,cam,w,h,palette.ground);
 pushExcavationTerrain(polys,cam,w,h);
 pushWaterSurfaces(polys,cam,w,h);
 // Keep the ground visually continuous. Perspective grid strokes were removed
 // because they created a distracting horizontal line across the world view.
 // Blocks
 for(const b of world.blocks){if(Math.abs(b.x-cam.pos.x)>24||Math.abs(b.z-cam.pos.z)>24)continue;if(b.type==='door'){drawVoxelDoor(polys,cam,w,h,b);continue;}if(b.type==='tile'){pushTileSlab(polys,cam,w,h,b);continue;}const meta=blockMap.get(b.type),color=b.type==='custom'?validHex(b.color,'#aa83d8'):b.color?validHex(b.color,meta?.color||'#a0a0a0'):meta?.color;const texture=b.texture||(b.type==='custom'?'custom':b.type);if(color)pushCube(polys,cam,w,h,b.x,b.y,b.z,color,1,1,1,true,texture,!!b.color);}
 // The starter neighborhood is fixed in world space and only rendered nearby.
 const tick=performance.now()/1000,neighbors=currentNeighbors(tick,palette.mode==='night');
 const nearWorldPoint=(x,z,radius=26)=>Math.hypot(x-cam.pos.x,z-cam.pos.z)<=radius;
 if(nearWorldPoint(-13,-7))drawNeighborHome(polys,cam,w,h,-13,-7,'#e7c6a7','#a96f65','#815b4a');
 if(nearWorldPoint(10,-17))drawNeighborHome(polys,cam,w,h,10,-17,'#b9d4c6','#668f8b','#71594d');
 if(nearWorldPoint(16,-9))drawNeighborHome(polys,cam,w,h,16,-9,'#e8d5b8','#b97870','#80604e');
 // Residents remain on their neighborhood routes instead of following the explorer.
 for(const n of neighbors){
  if(n.sleeping||!nearWorldPoint(n.x,n.z,26))continue;
  const walkPace=Number.isFinite(n.pace)?n.pace:8;
  const bob=n.moving?Math.abs(Math.sin(tick*walkPace+n.phase))*.055:Math.sin(tick*1.7+n.phase)*.018;
  drawNeighborFigure(polys,cam,w,h,n,bob,tick);
  addCharacterFaceDetails(polys,cam,w,h,n,bob);
 }
 if(palette.mode==='night'){
  const sleepHomes=[{x:-10.85,z:-4.85},{x:12.15,z:-14.85},{x:18.15,z:-6.85}];
  for(const home of sleepHomes){
   if(!nearWorldPoint(home.x,home.z,26))continue;
   const hp=project({x:home.x,y:4.45,z:home.z},cam,w,h);
   if(hp){ctx.save();ctx.font='bold 23px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#fffdf4';ctx.strokeText('Zzz',hp.x,hp.y);ctx.fillStyle='#425d78';ctx.fillText('Zzz',hp.x,hp.y);ctx.font='21px system-ui';ctx.fillText('💤',hp.x+22,hp.y-19);ctx.restore();}
  }
 }
 // Gentle, protected animals with visible feet and friendly faces.
 const animals=animalPositions(tick).filter(a=>nearWorldPoint(a.x,a.z,26)),sheep=animals.find(a=>a.id==='sheep'),cat=animals.find(a=>a.id==='cat');
 if(sheep){const sx=sheep.x,sz=sheep.z;pushCube(polys,cam,w,h,sx-.42,.12,sz-.34,'#f4f0e4',.86,.62,1.12);pushCube(polys,cam,w,h,sx+.22,.38,sz+.52,'#f4f0e4',.46,.42,.43);pushCube(polys,cam,w,h,sx+.57,.53,sz+.85,'#47443f',.055,.055,.03);pushCube(polys,cam,w,h,sx+.03,.51,sz+.85,'#47443f',.055,.055,.03);for(const [dx,dz] of [[-.28,-.2],[.32,-.2],[-.28,.38],[.32,.38]])pushCube(polys,cam,w,h,sx+dx,.01,sz+dz,'#d7d0c5',.15,.3,.15);}
 if(cat){const cx=cat.x,cz=cat.z;pushCube(polys,cam,w,h,cx-.36,.12,cz-.3,'#e8c48c',.76,.5,.78);pushCube(polys,cam,w,h,cx-.14,.48,cz+.35,'#e8c48c',.46,.38,.42);pushCube(polys,cam,w,h,cx-.25,.78,cz+.36,'#e8c48c',.18,.27,.18);pushCube(polys,cam,w,h,cx+.07,.78,cz+.36,'#e8c48c',.18,.27,.18);pushCube(polys,cam,w,h,cx-.18,.58,cz+.57,'#3a3935',.055,.055,.03);pushCube(polys,cam,w,h,cx+.13,.58,cz+.57,'#3a3935',.055,.055,.03);pushCube(polys,cam,w,h,cx-.3,.02,cz-.08,'#b88754',.18,.2,.2);pushCube(polys,cam,w,h,cx+.14,.02,cz-.08,'#b88754',.18,.2,.2);}
 for(const pet of animals){if(pet.id!=='sheep'&&pet.id!=='cat')drawPetFigure(polys,cam,w,h,pet,tick);}

 // Third-person avatar; in first-person the child sees through the character's eyes.
 if(cameraMode==='third'){const p=world.player,pc={id:'player',shirt:p.shirt,hair:p.hair,skin:p.skin,pants:p.pants,shoes:p.shoes,eyes:p.eyes,hairStyle:p.hairStyle,outfitStyle:p.outfitStyle,accessory:p.accessory,accessoryColor:p.accessoryColor,x:p.x,z:p.z,facing:p.yaw,phase:0,moving:false};drawNeighborFigure(polys,cam,w,h,pc,0,tick);addCharacterFaceDetails(polys,cam,w,h,pc,0);}
 // Fish are world geometry now, so ground, walls, and blocks can occlude them.
 pushFishOverlays(polys,cam,w,h);
 polys.sort((a,b)=>b.depth-a.depth);
 for(const poly of polys){
  if(poly.faceMark){
   ctx.save();ctx.globalAlpha=poly.alpha??1;
   ctx.beginPath();poly.pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
   ctx.fillStyle=poly.color;ctx.fill();
   if(poly.outline){ctx.strokeStyle='#31453233';ctx.lineWidth=.7;ctx.stroke();}
   ctx.restore();continue;
  }
  if(poly.line){ctx.strokeStyle=poly.color;ctx.lineWidth=poly.width;ctx.beginPath();ctx.moveTo(poly.p.x,poly.p.y);ctx.lineTo(poly.q.x,poly.q.y);ctx.stroke();continue;}
  if(poly.fishEye){ctx.save();ctx.fillStyle='#fffdf4';ctx.beginPath();ctx.arc(poly.x,poly.y,poly.radius,0,Math.PI*2);ctx.fill();ctx.fillStyle='#243c37';ctx.beginPath();ctx.arc(poly.x,poly.y,poly.radius*.52,0,Math.PI*2);ctx.fill();ctx.restore();continue;}
  const isWaterFace=poly.waterSurface||poly.waterSide,translucent=poly.alpha!==undefined;
  if(translucent&&!isWaterFace){ctx.save();ctx.globalAlpha=poly.alpha;}
  ctx.beginPath();poly.pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
  if(isWaterFace){ctx.save();ctx.globalAlpha=(poly.alpha??1)*(.96+Math.sin(performance.now()*.0018)*.025);paintWaterFace(poly,performance.now());ctx.restore();}
  else{ctx.fillStyle=poly.color;ctx.fill();if(poly.tileTexture)paintTileTexture(poly);else if(poly.material)paintTexture(poly);}
  if(poly.outline){ctx.strokeStyle='#31453233';ctx.lineWidth=.7;ctx.stroke();}
  
  if(translucent&&!isWaterFace)ctx.restore();
 }
 if(palette.overlay){ctx.save();ctx.fillStyle=palette.overlay;ctx.fillRect(0,0,w,h);ctx.restore();}
 for(const n of neighbors){if(!n.moving&&n.activity){const hp=project({x:n.x,y:2.35,z:n.z},cam,w,h);if(hp){ctx.save();ctx.font='17px system-ui';ctx.textAlign='center';ctx.fillText(n.activity,hp.x,hp.y);ctx.restore();}}}
 if(animalCareFlashUntil>performance.now()){const a=animalPositions().find(v=>v.id===selectedAnimalId);if(a){const hp=project({x:a.x+.15,y:1.2,z:a.z+.5},cam,w,h);if(hp){ctx.save();ctx.font='28px system-ui';ctx.textAlign='center';ctx.fillText(animalCareFlashEmoji,hp.x,hp.y);ctx.restore();}}}
 // Home labels disappear with their anchored homes at a distance.
 for(const n of neighbors.filter(v=>(v.id==='hyacinth'||v.id==='theo')&&nearWorldPoint(v.homeX,v.homeZ,26))){const hp=project({x:n.homeX+2.1,y:3.55,z:n.homeZ+4.55},cam,w,h);if(hp){ctx.save();ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#fffdf4';ctx.strokeText(n.name+"'s home",hp.x,hp.y);ctx.fillStyle='#35533e';ctx.fillText(n.name+"'s home",hp.x,hp.y);ctx.restore();}}
 if(nearWorldPoint(18.1,-4.65,26)){const familySign=project({x:18.1,y:3.55,z:-4.65},cam,w,h);if(familySign){ctx.save();ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#fffdf4';ctx.strokeText("The Pagibig Family",familySign.x,familySign.y);ctx.fillStyle='#35533e';ctx.fillText("The Pagibig Family",familySign.x,familySign.y);ctx.restore();}}
}
function traceWorldRay(cam,dir,maxDistance,step){
 let prev=null,prevInGround=false,prevInWater=false,prevY=null;
 for(let t=.16;t<maxDistance;t+=step){
  const x=cam.pos.x+dir.x*t,y=cam.pos.y+dir.y*t,z=cam.pos.z+dir.z*t,ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
  if(Math.abs(ix)<=WORLD_LIMIT&&Math.abs(iz)<=WORLD_LIMIT){
   const b=blockLookup.get(keyBlock(ix,iy,iz));
   if(b)return {block:b,place:prev||{x:ix,y:Math.max(-MAX_DIG_DEPTH,iy+1),z:iz}};
   const floorY=-groundDepthAt(ix,iz),topY=waterTopAt(ix,iz);
   const inWater=topY!==null&&y>floorY+.015&&y<topY-.015;
   const enteredThroughTop=dir.y<-.03&&prevY!==null&&prevY>=topY-.015;
   if(inWater&&!prevInWater&&enteredThroughTop)return {water:true,x:ix,z:iz,hitY:y};
   prevInWater=inWater;
   const inGround=y<floorY-.025;
   if(inGround&&!prevInGround)return {ground:true,x:ix,z:iz,hitY:y,place:{x:ix,y:floorY,z:iz}};
   prevInGround=inGround;prev={x:ix,y:iy,z:iz};prevY=y;
  }else{prevInGround=false;prevInWater=false;prev=null;prevY=null;}
 }
 return null;
}
function rayHit(){const cam=cameraState(),sp=Math.sin(cam.pitch),cp=Math.cos(cam.pitch),sy=Math.sin(cam.yaw),cy=Math.cos(cam.yaw),dir={x:sy*cp,y:sp,z:-cy*cp};return traceWorldRay(cam,dir,24,.06);}
function rayHitAtScreen(px,py){const cam=cameraState(),w=canvas.clientWidth,h=canvas.clientHeight,focal=Math.min(w,h)*.94;if(!w||!h)return rayHit();const rx=(px-w/2)/focal,uy=(h*.51-py)/focal,sy=Math.sin(cam.yaw),cy=Math.cos(cam.yaw),sp=Math.sin(cam.pitch),cp=Math.cos(cam.pitch);let dir={x:sy*cp+cy*rx-sy*sp*uy,y:sp+cp*uy,z:-cy*cp+sy*rx+cy*sp*uy};const len=Math.hypot(dir.x,dir.y,dir.z)||1;dir={x:dir.x/len,y:dir.y/len,z:dir.z/len};const hit=traceWorldRay(cam,dir,28,.045);if(hit)return hit;const t=dir.y<-.02?(0.06-cam.pos.y)/dir.y:8;const x=cam.pos.x+dir.x*Math.max(2,Math.min(22,t)),y=cam.pos.y+dir.y*Math.max(2,Math.min(22,t)),z=cam.pos.z+dir.z*Math.max(2,Math.min(22,t));return {place:{x:Math.floor(x),y:Math.max(-MAX_DIG_DEPTH,Math.floor(y)),z:Math.floor(z)}};}
function buildAtScreen(px=canvas.clientWidth/2,py=canvas.clientHeight/2){const hit=rayHitAtScreen(px,py);if(!hit){showStatus('Tap a place in the world to build.');return;}let p=hit.place;if(hit.block&&(!p||solid(p.x,p.y,p.z)))p={x:hit.block.x,y:hit.block.y+1,z:hit.block.z};if(addBlock(p.x,p.y,p.z,selected)){showStatus(selected==='door'?'Door built! Tap it to open or close it.':(blockMap.get(selected)?.name||'Block')+' placed where you tapped.');render();}else showStatus(selected==='door'?'A door needs two clear spaces, one above the other.':'That space is occupied or outside the safe building area.');}
function buildOrFillAtScreen(px=canvas.clientWidth/2,py=canvas.clientHeight/2){
 if(selected==='water'){waterAtScreen(px,py);return;}
 const hit=rayHitAtScreen(px,py);
 if(hit&&hit.ground&&groundDepthAt(hit.x,hit.z)>0){fillAtScreen(px,py);return;}
 buildAtScreen(px,py);
}
function build(){buildOrFillAtScreen();}
function erase(){const hit=rayHit();if(!hit||!hit.block){showStatus('Aim at a block you placed to remove it.');return;}if(removeBlock(hit.block.x,hit.block.y,hit.block.z)){showStatus('Block removed.');render();}}
const PROTECTED_NEIGHBOR_HOMES=[{x:-13,z:-7},{x:10,z:-17},{x:16,z:-9}];
function isProtectedDigCell(x,z){
 const cx=Math.floor(x)+.5,cz=Math.floor(z)+.5;
 for(const home of PROTECTED_NEIGHBOR_HOMES){if(cx>=home.x-.75&&cx<=home.x+5.05&&cz>=home.z-.75&&cz<=home.z+5.05)return true;}
 const tick=performance.now()/1000,night=getTimePalette(tick).mode==='night';
 for(const n of currentNeighbors(tick,night)){if(Math.hypot(cx-n.x,cz-n.z)<1.05)return true;}
 for(const animal of animalPositions(tick)){if(Math.hypot(cx-animal.x,cz-animal.z)<.7)return true;}
 return false;
}
function canStoreItem(id,target='materials'){const slots=world[target]||[];return slots.some(item=>item&&item.id===id&&item.count<99)||slots.some(item=>!item);}
function blockDropItem(block){if(block.type==='door')return 'wood';return ITEM_META[block.type]?block.type:'stone';}
function collectWaterLayer(x,z){
 const key=keyGround(x,z),level=waterLevelAt(x,z);
 if(level<1)return false;
 if(!addBucketItem({type:'water'})){showStatus('Your Material Bucket is full.');return false;}
 if(level>1){waterLevels.set(key,level-1);}
 else{waterLevels.delete(key);waterCells.delete(key);fishSpots=fishSpots.filter(f=>keyGround(f.x,f.z)!==key);}
 syncWaterLife();save();render();
 showStatus(level>1?'Top water layer collected into your Material Bucket.':'Last water layer collected into your Material Bucket.');
 return true;
}
function digAtScreen(px=canvas.clientWidth/2,py=canvas.clientHeight/2){
 const hit=rayHitAtScreen(px,py);
 if(hit&&hit.water){if(isProtectedDigCell(hit.x,hit.z)){showStatus('This patch is protected for the neighbors and their homes.');return;}collectWaterLayer(hit.x,hit.z);return;}
 if(hit&&hit.block){const block=hit.block,itemId=blockDropItem(block);
  if(isProtectedDigCell(block.x,block.z)){showStatus('That block is too close to a neighbor or animal. Their homes and little friends are protected!');return;}
  if(!canStoreItem(itemId,'materials')){showStatus('Your materials pouch is full. Make room before digging.');return;}
  if(removeBlock(block.x,block.y,block.z)){addItem(itemId,'materials');save();render();showStatus('Dug '+(ITEM_META[block.type]?.name||'block')+' · recovered in your Material Bucket.');}
  return;
 }
 if(hit&&hit.ground){const x=hit.x,z=hit.z,depth=groundDepthAt(x,z),key=keyGround(x,z);
  if(isProtectedDigCell(x,z)){showStatus('This patch is protected for the neighbors and their homes.');return;}
  if(waterCells.has(key)){collectWaterLayer(x,z);return;}
  if(depth>=MAX_DIG_DEPTH){showStatus('You reached the safe digging depth: '+MAX_DIG_DEPTH+' blocks.');return;}
  if(!groundDepths.has(key)&&groundDepths.size>=GROUND_DIG_LIMIT){showStatus('This world has reached its safe excavation limit.');return;}
  if(!canStoreItem('dirt','materials')){showStatus('Your resources pouch is full. Make room before digging.');return;}
  if(!addBucketItem({type:'dirt'})){showStatus('Your Material Bucket is full.');return;}
  const newDepth=depth+1;
  if(newDepth<=depth){showStatus('The ground is already at its safe digging depth.');return;}
  groundDepths.set(key,newDepth);syncExcavations();addItem('dirt','materials');invalidateNeighborNavigation();save();render();showStatus('Ground excavated · Dirt recovered in your Material Bucket.');return;
 }
 showStatus('Aim the shovel at a block or a patch of ground, then tap to dig.');
}
function fillAtScreen(px=canvas.clientWidth/2,py=canvas.clientHeight/2){
 const hit=rayHitAtScreen(px,py);if(!hit||!hit.ground){showStatus('Aim at the floor of a hole to fill it.');return;}
 const x=hit.x,z=hit.z,depth=groundDepthAt(x,z),key=keyGround(x,z);
 if(depth<=0){showStatus('That ground is already at its original level.');return;}
 if(selected==='door'){showStatus('Choose a solid building block to fill a hole.');return;}
 if(world.blocks.length+depth>MAX_BLOCKS){showStatus('Not enough building space available.');return;}
 for(let y=-depth;y<0;y++){
  if(!addBlock(x,y,z,selected)){showStatus('Could not place the selected block in this hole.');return;}
 }
 groundDepths.delete(key);waterLevels.delete(key);waterCells.delete(key);fishSpots=fishSpots.filter(f=>keyGround(f.x,f.z)!==key);
 syncExcavations();syncWaterLife();invalidateNeighborNavigation();save();render();
 showStatus('Hole filled with '+(blockMap.get(selected)?.name||'Custom')+'.');
}
function waterAtScreen(px=canvas.clientWidth/2,py=canvas.clientHeight/2){
 const hit=rayHitAtScreen(px,py);
 if(!hit||(!hit.ground&&!hit.water)){showStatus('Aim at a dug pool floor or the surface of existing water.');return;}
 const x=hit.x,z=hit.z,key=keyGround(x,z),depth=groundDepthAt(x,z);
 if(depth<=0){showStatus('Dig a pool cell first, then add water.');return;}
 if(isProtectedDigCell(x,z)){showStatus('This patch is protected for the neighbors and their homes.');return;}
 const level=waterLevelAt(x,z);
 if(level>=depth){showStatus('This pool cell is full to the rim.');return;}
 waterLevels.set(key,level+1);waterCells.add(key);
 syncWaterLife();save();render();
 showStatus(level===0?'Water added to the pool floor! Tap the water again to stack another layer.':'Water layer added on top · '+(level+1)+' of '+depth+' layers.');
}
function fishAtScreen(px=canvas.clientWidth/2,py=canvas.clientHeight/2){
 const hit=rayHitAtScreen(px,py);if(!hit||(!hit.ground&&!hit.water)){showStatus('Aim at a water cell to add a fish.');return;}
 const x=hit.x,z=hit.z,key=keyGround(x,z);
 if(!waterCells.has(key)){showStatus('Add water to this dug cell first.');return;}
 if(fishSpots.filter(f=>keyGround(f.x,f.z)===key).length>=3){showStatus('This water cell already has three fish.');return;}
 fishSpots.push({x,z});syncWaterLife();save();render();showStatus('A little fish is swimming in your water!');
}
function surfaceHeightAt(x,z){
 const bx=Math.floor(x),bz=Math.floor(z);
 for(let y=64;y>=-MAX_DIG_DEPTH;y--){
  const b=blockLookup.get(keyBlock(bx,y,bz));
  if(b&&b.type!=='door')return b.type==='tile'?y+TILE_BASE_OFFSET+TILE_THICKNESS:y+1;
 }
 return -groundDepthAt(bx,bz);
}
const GROUND_BASE_Y=-MAX_DIG_DEPTH;
function terrainCollisionAt(x,z,y){
 if(y>=-.001)return false;
 const minX=Math.floor(x-PLAYER_RADIUS),maxX=Math.floor(x+PLAYER_RADIUS);
 const minZ=Math.floor(z-PLAYER_RADIUS),maxZ=Math.floor(z+PLAYER_RADIUS);
 const head=y+PLAYER_BODY_HEIGHT;
 for(let bx=minX;bx<=maxX;bx++)for(let bz=minZ;bz<=maxZ;bz++){
  const solidTop=-groundDepthAt(bx,bz);
  if(y>=solidTop-.001||head<=GROUND_BASE_Y+.001)continue;
  if(head<=GROUND_BASE_Y+.001||y>=solidTop-.001)continue;
  const nearX=Math.max(bx,Math.min(bx+1,x)),nearZ=Math.max(bz,Math.min(bz+1,z));
  const dx=x-nearX,dz=z-nearZ;
  if(dx*dx+dz*dz<PLAYER_RADIUS*PLAYER_RADIUS)return true;
 }
 return false;
}
const PLAYER_RADIUS=.23,PLAYER_BODY_HEIGHT=1.72,PLAYER_STEP_HEIGHT=.18;
function playerCollisionAt(x,z,y){
 const minX=Math.floor(x-PLAYER_RADIUS),maxX=Math.floor(x+PLAYER_RADIUS);
 const minZ=Math.floor(z-PLAYER_RADIUS),maxZ=Math.floor(z+PLAYER_RADIUS);
 const minY=Math.max(-MAX_DIG_DEPTH,Math.floor(y)),maxY=Math.min(64,Math.floor(y+PLAYER_BODY_HEIGHT));
 const checked=new Set();
 for(let bx=minX;bx<=maxX;bx++)for(let bz=minZ;bz<=maxZ;bz++)for(let by=minY;by<=maxY;by++){
  const b=blockLookup.get(keyBlock(bx,by,bz));if(!b||checked.has(b))continue;checked.add(b);
  if(b.type==='door'&&b.open)continue;
  const bottom=b.type==='tile'?b.y+TILE_BASE_OFFSET:b.y;
  const top=b.type==='tile'?bottom+TILE_THICKNESS:b.y+1;
  if(b.type==='tile'&&top<=y+PLAYER_STEP_HEIGHT+.001)continue;
  if(y>=top-.001||y+PLAYER_BODY_HEIGHT<=bottom+.001)continue;
  const nearX=Math.max(b.x,Math.min(b.x+1,x)),nearZ=Math.max(b.z,Math.min(b.z+1,z));
  const dx=x-nearX,dz=z-nearZ;
  if(dx*dx+dz*dz<PLAYER_RADIUS*PLAYER_RADIUS)return true;
 }
 return terrainCollisionAt(x,z,y);
}
function nudgePlayerOutOfBlocks(){
 const p=world.player;if(!playerCollisionAt(p.x,p.z,p.y))return;
 for(let radius=.3;radius<=1.8;radius+=.15){
  for(let i=0;i<24;i++){
   const angle=i*Math.PI/12,x=p.x+Math.cos(angle)*radius,z=p.z+Math.sin(angle)*radius;
   if(!playerCollisionAt(x,z,p.y)){p.x=x;p.z=z;save(true);showStatus('Moved you clear of a nearby block.');return;}
  }
 }
}
function jump(){
 if(flying){showStatus('Flight is on. Turn it off to use Jump.');return;}
 if(!playerGrounded)return;
 jumpVelocity=PLAYER_JUMP_SPEED;playerGrounded=false;
 showStatus('Jump!');
}
function move(dt){
 const p=world.player,speed=flying?7:4.2;
 nudgePlayerOutOfBlocks();
 let forward=moveZ,right=moveX;
 if(keys.w||keys.ArrowUp)forward+=1;
 if(keys.s||keys.ArrowDown)forward-=1;
 if(keys.a||keys.ArrowLeft)right-=1;
 if(keys.d||keys.ArrowRight)right+=1;
 const len=Math.hypot(forward,right)||1;
 forward/=len;right/=len;
 const dx=(Math.sin(p.yaw)*forward+Math.cos(p.yaw)*right)*speed*dt;
 const dz=(-Math.cos(p.yaw)*forward+Math.sin(p.yaw)*right)*speed*dt;
 const nextX=Math.max(-WORLD_LIMIT+1,Math.min(WORLD_LIMIT-1,p.x+dx));
 const nextZ=Math.max(-WORLD_LIMIT+1,Math.min(WORLD_LIMIT-1,p.z+dz));
 // Resolve axes separately so the player slides along walls instead of sticking on corners.
 if(!playerCollisionAt(nextX,p.z,p.y))p.x=nextX;
 if(!playerCollisionAt(p.x,nextZ,p.y))p.z=nextZ;
 if(flying){
  let v=vertical;
  if(keys[' '])v+=1;
  if(keys.Shift)v-=1;
  const nextY=Math.max(-MAX_DIG_DEPTH,Math.min(60,p.y+v*speed*dt));
  if(!playerCollisionAt(p.x,p.z,nextY))p.y=nextY;
  jumpVelocity=0;playerGrounded=true;
  return;
 }
 const before=p.y;
 if(playerGrounded){
  const floor=surfaceHeightAt(p.x,p.z);
  if(floor<p.y-.04){playerGrounded=false;jumpVelocity=0;}
  else if(floor<=p.y+.18){p.y=floor;return;}
  else return;
 }
 jumpVelocity-=PLAYER_GRAVITY*dt;
 let next=p.y+jumpVelocity*dt;
 if(jumpVelocity>0&&playerCollisionAt(p.x,p.z,next)){jumpVelocity=0;next=p.y;}
 if(jumpVelocity<=0){
  const floor=surfaceHeightAt(p.x,p.z);
  if(next<=floor&&before>=floor-.04){
   p.y=floor;jumpVelocity=0;playerGrounded=true;save(true);return;
  }
  if(next<=-MAX_DIG_DEPTH&&before>=-MAX_DIG_DEPTH){
   p.y=-MAX_DIG_DEPTH;jumpVelocity=0;playerGrounded=true;save(true);return;
  }
 }
 p.y=Math.max(-MAX_DIG_DEPTH,next);
}
function loop(time){requestAnimationFrame(loop);if(time-lastTime<30)return;const dt=Math.min(.05,(time-lastTime)/1000||0);lastTime=time;move(dt);render();}
function renderSlots(){
 const root=$('slots');root.replaceChildren();
 $('clearBucketBtn').classList.toggle('hidden',inventoryTab!=='bucket');
 if(inventoryTab==='bucket'){
  const arr=world.bucket||[];
  if(!arr.length){const note=document.createElement('p');note.className='note';note.textContent='Your Material Bucket is empty. Long-press a block or dig soil to collect it here.';root.append(note);return;}
  arr.forEach((item,index)=>{
   const meta=BLOCKS.find(b=>b.id===item.type),icon=item.type==='water'?'💧':item.type==='custom'?'🎨':item.type==='door'?'🚪':item.type==='tile'?'▦':meta?.emoji||'🧱';
   const name=item.type==='water'?'Water':item.type==='custom'?'Custom solid':item.type==='door'?'Door':item.type==='tile'?'Slab / Tile':meta?.name||item.type;
   const slot=document.createElement('button');slot.type='button';slot.className='slot bucket-item';slot.title='Select this recovered '+name;
   const ico=document.createElement('span');ico.className='ico';ico.textContent=icon;
   const label=document.createElement('small');label.textContent=name;
   const details=document.createElement('small');details.textContent=item.color?item.color.toUpperCase():'Recovered';
   slot.append(ico,label,details);
   slot.addEventListener('click',()=>{
    selectedBucketItem={...item};selected=item.type;placementPaused=false;setToolMode('build',false);renderHotbar();closeShades();
    showStatus(name+' selected from your Material Bucket. It stays available for reuse.');
   });
   root.append(slot);
  });
  return;
 }
 const arr=world[inventoryTab]||[];
 for(let i=0;i<60;i++){
  const slot=document.createElement('div');slot.className='slot';const item=arr[i];
  if(item){const meta=ITEM_META[item.id]||{name:item.id,icon:'📦'};const ico=document.createElement('div');ico.className='ico';ico.textContent=meta.icon;const name=document.createElement('small');name.textContent=item.label||meta.name;const count=document.createElement('small');count.textContent='×'+item.count;slot.append(ico,name,count);}
  else{const n=document.createElement('small');n.textContent=String(i+1);n.style.color='#a7b4a7';slot.append(n);}
  root.append(slot);
 }
}
const CHARACTER_PRESETS={
 explorer:{hairStyle:'short',outfitStyle:'hoodie',accessory:'none',hair:'#493127',skin:'#efc39d',shirt:'#d94b3d',pants:'#397d8f',shoes:'#bd4540',eyes:'#302820',accessoryColor:'#f4a8bb'},
 sunshine:{hairStyle:'pigtails',outfitStyle:'overalls',accessory:'glasses',hair:'#efbd43',skin:'#f2cda9',shirt:'#48a78b',pants:'#219da5',shoes:'#e6b64d',eyes:'#302820',accessoryColor:'#ec83ba'},
 artist:{hairStyle:'bob',outfitStyle:'sweater',accessory:'flower',hair:'#754c3c',skin:'#e8b995',shirt:'#9b79b7',pants:'#48617a',shoes:'#6b527c',eyes:'#302820',accessoryColor:'#ef82a4'},
 garden:{hairStyle:'long',outfitStyle:'dress',accessory:'bow',hair:'#5a3827',skin:'#f0c7a3',shirt:'#e98eae',pants:'#68a96d',shoes:'#d45b80',eyes:'#302820',accessoryColor:'#f4c6dc'}
};
const CHARACTER_FIELDS=['hairStyle','outfitStyle','accessory','accessoryColor','hairColor','skinColor','shirtColor','pantsColor','shoesColor','eyeColor'];
function characterValue(){
 return {
  hairStyle:$('hairStyle').value,outfitStyle:$('outfitStyle').value,accessory:$('accessory').value,
  accessoryColor:$('accessoryColor').value,hair:$('hairColor').value,skin:$('skinColor').value,
  shirt:$('shirtColor').value,pants:$('pantsColor').value,shoes:$('shoesColor').value,eyes:$('eyeColor').value
 };
}
function applyPresetToStudio(key){
 const p=CHARACTER_PRESETS[key];if(!p)return;
 $('hairStyle').value=p.hairStyle;$('outfitStyle').value=p.outfitStyle;$('accessory').value=p.accessory;
 $('accessoryColor').value=p.accessoryColor;$('hairColor').value=p.hair;$('skinColor').value=p.skin;
 $('shirtColor').value=p.shirt;$('pantsColor').value=p.pants;$('shoesColor').value=p.shoes;$('eyeColor').value=p.eyes;
 document.querySelectorAll('[data-look]').forEach(b=>b.classList.toggle('selected',b.dataset.look===key));
 updateCharacterPreview();
}
function setStudioFromPlayer(p){
 $('hairStyle').value=p.hairStyle||'short';$('outfitStyle').value=p.outfitStyle||'hoodie';$('accessory').value=p.accessory||'none';
 $('accessoryColor').value=p.accessoryColor||'#f4a8bb';$('hairColor').value=p.hair||'#493127';$('skinColor').value=p.skin||'#efc39d';
 $('shirtColor').value=p.shirt||'#d94b3d';$('pantsColor').value=p.pants||'#397d8f';$('shoesColor').value=p.shoes||'#bd4540';$('eyeColor').value=p.eyes||'#302820';
 document.querySelectorAll('[data-look]').forEach(b=>b.classList.remove('selected'));
 updateCharacterPreview();
}
function updateCharacterPreview(){
 const p=characterValue(),c=$('characterPreview').getContext('2d');
 const w=256,h=284;
 c.clearRect(0,0,w,h);
 const bg=c.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#d4e9ed');bg.addColorStop(1,'#eff2d8');c.fillStyle=bg;c.fillRect(0,0,w,h);
 c.fillStyle='#94bd78';c.fillRect(0,232,w,52);
 c.fillStyle='#6e9d57';c.fillRect(0,232,w,5);
 // Shoes and legs.
 c.fillStyle=p.shoes;c.fillRect(81,244,42,18);c.fillRect(136,244,42,18);
 c.fillStyle=p.pants;c.fillRect(86,190,32,58);c.fillRect(141,190,32,58);
 // Outfit body and sleeves.
 c.fillStyle=p.shirt;c.fillRect(67,111,122,83);c.fillRect(45,120,26,70);c.fillRect(185,120,26,70);
 c.fillStyle=p.skin;c.fillRect(45,184,26,20);c.fillRect(185,184,26,20);
 if(p.outfitStyle==='dress'){
  c.fillStyle=p.pants;c.beginPath();c.moveTo(67,168);c.lineTo(189,168);c.lineTo(205,221);c.lineTo(51,221);c.closePath();c.fill();
  c.fillStyle=p.shoes;c.fillRect(81,244,42,18);c.fillRect(136,244,42,18);
 }else if(p.outfitStyle==='overalls'){
  c.fillStyle=p.pants;c.fillRect(93,126,70,75);c.fillRect(91,110,16,59);c.fillRect(149,110,16,59);
  c.fillStyle='#f0dda7';c.fillRect(121,151,14,12);
 }else if(p.outfitStyle==='hoodie'){
  c.fillStyle='#00000018';c.fillRect(112,169,32,8);
 }
 // Neck and face.
 c.fillStyle=p.skin;c.fillRect(111,91,34,24);c.fillRect(87,35,82,68);
 c.fillStyle=p.hair;c.fillRect(82,27,92,24);
 if(p.hairStyle==='bob'){c.fillRect(78,44,18,63);c.fillRect(160,44,18,63);}
 if(p.hairStyle==='long'){c.fillRect(77,42,20,125);c.fillRect(160,42,20,125);}
 if(p.hairStyle==='ponytail'){c.fillRect(159,35,29,56);c.fillRect(171,72,18,65);}
 if(p.hairStyle==='pigtails'){c.fillRect(70,48,23,56);c.fillRect(158,48,23,56);c.fillRect(68,88,24,30);c.fillRect(160,88,24,30);}
 if(p.hairStyle==='curly'){for(const [x,y] of [[82,24],[105,14],[130,14],[151,24],[72,43],[166,43]]){c.fillRect(x,y,27,28);}}
 if(p.hairStyle==='buns'){c.fillRect(65,18,35,34);c.fillRect(157,18,35,34);}
 // Front fringe and eyes.
 c.fillStyle=p.hair;c.fillRect(83,46,34,15);c.fillRect(118,35,54,15);
 c.fillStyle=p.eyes;c.fillRect(105,71,8,7);c.fillRect(145,71,8,7);
 c.fillStyle='#9b6959';c.fillRect(124,83,13,4);
 // Accessories.
 if(p.accessory==='bow'){c.fillStyle=p.accessoryColor;c.fillRect(69,30,19,13);c.fillRect(90,30,19,13);c.fillRect(85,32,9,10);}
 if(p.accessory==='flower'){c.fillStyle=p.accessoryColor;c.fillRect(75,31,19,19);c.fillStyle='#f6d36b';c.fillRect(81,37,8,8);}
 if(p.accessory==='glasses'){c.strokeStyle=p.accessoryColor;c.lineWidth=5;c.strokeRect(96,65,27,20);c.strokeRect(137,65,27,20);c.beginPath();c.moveTo(123,74);c.lineTo(137,74);c.stroke();}
 if(p.accessory==='cap'){c.fillStyle=p.accessoryColor;c.fillRect(78,15,100,18);c.fillRect(78,30,115,9);}
 $('characterPreviewName').textContent='Your character';
 $('characterPreviewDescription').textContent=p.hairStyle+' hair · '+p.outfitStyle+' · '+p.accessory;
}
function openCharacterStudio(){
 setStudioFromPlayer(world.player);
 openShade('characterShade');
}
for(const id of CHARACTER_FIELDS){
 const input=$(id);
 input.addEventListener('input',()=>{
  document.querySelectorAll('[data-look]').forEach(b=>b.classList.remove('selected'));
  updateCharacterPreview();
 });
 input.addEventListener('change',updateCharacterPreview);
}
document.querySelectorAll('[data-look]').forEach(b=>b.addEventListener('click',()=>applyPresetToStudio(b.dataset.look)));
function openShade(id){$(id).classList.add('open');}function closeShades(){stopNeighborColoring();document.querySelectorAll('.menu-shade.open').forEach(e=>e.classList.remove('open'));}
let draftCustomColor='#aa83d8',draftCustomTexture='custom',draftSolidType='custom';
function renderCustomPreview(){
 const canvas=$('customPreview'),c=canvas.getContext('2d');
 c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle='#f8faf4';c.fillRect(0,0,canvas.width,canvas.height);
 c.fillStyle=draftCustomColor;c.fillRect(14,14,196,124);
 const tile=textureTiles.get(draftCustomTexture),pattern=tile?c.createPattern(tile,'repeat'):null;
 if(pattern){c.save();c.globalAlpha=.48;c.fillStyle=pattern;c.fillRect(14,14,196,124);c.restore();}
 c.strokeStyle='#31453255';c.lineWidth=3;c.strokeRect(14,14,196,124);
 const texture=CUSTOM_TEXTURES.find(t=>t.id===draftCustomTexture);
 $('customPreviewName').textContent=draftSolidType==='custom'?'Your custom solid':('Your '+(BLOCKS.find(b=>b.id===draftSolidType)?.name||'solid')+' block');
 $('customPreviewDetails').textContent=draftCustomColor.toUpperCase()+' · '+(texture?.name||'Speckled');
}
function renderCustomTextureChoices(){
 const root=$('customTextureChoices');root.replaceChildren();
 CUSTOM_TEXTURES.forEach(t=>{
  const btn=document.createElement('button');btn.type='button';btn.className='texture-choice'+(draftCustomTexture===t.id?' selected':'');
  const emoji=document.createElement('span');emoji.className='texture-emoji';emoji.textContent=t.emoji;
  const label=document.createElement('span');label.textContent=t.name;
  btn.append(emoji,label);btn.addEventListener('click',()=>{draftCustomTexture=t.id;renderCustomTextureChoices();renderCustomPreview();});
  root.append(btn);
 });
}
function renderCustomColorSwatches(){
 const root=$('customColorSwatches');root.replaceChildren();
 CUSTOM_COLORS.forEach(color=>{
  const btn=document.createElement('button');btn.type='button';btn.className='color-swatch';btn.style.background=color;btn.title=color;btn.setAttribute('aria-label','Choose '+color);
  btn.addEventListener('click',()=>setDraftCustomColor(color));root.append(btn);
 });
}
function setDraftCustomColor(color){
 if(!/^#[0-9a-f]{6}$/i.test(color))return;
 draftCustomColor=color.toLowerCase();$('customBlockColor').value=draftCustomColor;$('customBlockHex').value=draftCustomColor.toUpperCase();renderCustomPreview();
}
function openCustomBlockDesigner(){
 draftSolidType=SOLID_STYLE_TYPES.includes(selected)?selected:'custom';
 $('solidDesignType').value=draftSolidType;
 $('solidDesignerTitle').textContent=draftSolidType==='custom'?'🎨 Design a custom solid':('🎨 Design '+(BLOCKS.find(b=>b.id===draftSolidType)?.name||'solid')+' blocks');
 const saved=draftSolidType==='custom'?world.customBlock:world.solidStyles?.[draftSolidType];
 const fallback=BLOCKS.find(b=>b.id===draftSolidType);
 draftCustomColor=saved?.color||fallback?.color||'#aa83d8';
 draftCustomTexture=saved?.texture||(draftSolidType==='custom'?'custom':draftSolidType);
 $('customBlockColor').value=draftCustomColor;$('customBlockHex').value=draftCustomColor.toUpperCase();
 renderCustomTextureChoices();renderCustomColorSwatches();renderCustomPreview();openShade('customBlockShade');
}
$('solidDesignType').addEventListener('change',e=>{
 draftSolidType=SOLID_STYLE_TYPES.includes(e.target.value)?e.target.value:'custom';
 const saved=draftSolidType==='custom'?world.customBlock:world.solidStyles?.[draftSolidType];
 const fallback=BLOCKS.find(b=>b.id===draftSolidType);
 setDraftCustomColor(saved?.color||fallback?.color||'#aa83d8');
 draftCustomTexture=saved?.texture||(draftSolidType==='custom'?'custom':draftSolidType);
 renderCustomTextureChoices();renderCustomPreview();
});
$('customBlockColor').addEventListener('input',e=>setDraftCustomColor(e.target.value));
$('customBlockHex').addEventListener('input',e=>{const v=e.target.value.trim();if(/^#[0-9a-f]{6}$/i.test(v))setDraftCustomColor(v);});
$('customBlockHex').addEventListener('change',e=>{const v=e.target.value.trim();if(/^#[0-9a-f]{6}$/i.test(v))setDraftCustomColor(v);else e.target.value=draftCustomColor.toUpperCase();});
$('applyCustomBlock').addEventListener('click',()=>{
 if(draftSolidType==='custom'){
  world.customBlock={color:draftCustomColor,texture:draftCustomTexture};
  $('customColor').value=draftCustomColor;selected='custom';placementPaused=false;
  showStatus('Custom solid ready. Choose a place to build it.');
 }else{
  world.solidStyles=world.solidStyles||{};
  world.solidStyles[draftSolidType]={color:draftCustomColor,texture:draftCustomTexture};
  selected=draftSolidType;placementPaused=false;
  showStatus((BLOCKS.find(b=>b.id===draftSolidType)?.name||'Solid')+' finish saved. New blocks of this material will use it.');
 }
 selectedBucketItem=null;setToolMode('build',false);save();renderHotbar();closeShades();
});

let draftDoorColor='#a97545',draftDoorStyle='classic';
const DOOR_STYLE_NAMES={classic:'Classic wooden door',window:'Door with a window',garden:'Garden flower door'};
function renderDoorDesignPreview(){
 $('doorPreview').style.setProperty('--door-preview',draftDoorColor);
 $('doorPreviewDetails').textContent=DOOR_STYLE_NAMES[draftDoorStyle]+' · '+draftDoorColor.toUpperCase();
 document.querySelectorAll('[data-door-style]').forEach(button=>button.classList.toggle('selected',button.dataset.doorStyle===draftDoorStyle));
}
function openDoorDesigner(){
 draftDoorColor=world.doorDesign.color||'#a97545';draftDoorStyle=world.doorDesign.style||'classic';
 $('doorColor').value=draftDoorColor;renderDoorDesignPreview();openShade('doorShade');
}
$('doorDesignBtn').addEventListener('click',()=>{closeShades();openDoorDesigner();});
$('doorColor').addEventListener('input',e=>{draftDoorColor=e.target.value;renderDoorDesignPreview();});
document.querySelectorAll('[data-door-style]').forEach(button=>button.addEventListener('click',()=>{
 draftDoorStyle=button.dataset.doorStyle;renderDoorDesignPreview();
}));
$('applyDoorDesign').addEventListener('click',()=>{
 world.doorDesign={color:validHex(draftDoorColor,'#a97545'),style:['classic','window','garden'].includes(draftDoorStyle)?draftDoorStyle:'classic'};
 selected='door';selectedBucketItem=null;placementPaused=false;setToolMode('build',false);save();renderHotbar();closeShades();
 showStatus('Your door design is ready. Choose a clear spot to build it!');
});


let draftTileColor='#c5a98a',draftTilePattern='grid';
function drawTileSwatch(canvas,pattern,color){
 const c=canvas.getContext('2d'),tile=textureTiles.get('tile-'+pattern);
 c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle=color;c.fillRect(0,0,canvas.width,canvas.height);
 if(tile){c.save();c.globalAlpha=.78;c.drawImage(tile,0,0,canvas.width,canvas.height);c.restore();}
 c.strokeStyle='#31453266';c.lineWidth=2;c.strokeRect(1,1,canvas.width-2,canvas.height-2);
}
function renderTilePreview(){
 const design=TILE_DESIGNS.find(t=>t.id===draftTilePattern)||TILE_DESIGNS[0];
 drawTileSwatch($('tilePreview'),design.id,draftTileColor);
 $('tilePreviewName').textContent=design.name;$('tilePreviewDetails').textContent=draftTileColor.toUpperCase();
 document.querySelectorAll('[data-tile-pattern]').forEach(btn=>btn.classList.toggle('selected',btn.dataset.tilePattern===draftTilePattern));
}
function renderTileChoices(){
 const root=$('tileChoices');root.replaceChildren();
 TILE_DESIGNS.forEach(design=>{
  const btn=document.createElement('button');btn.type='button';btn.className='tile-choice'+(draftTilePattern===design.id?' selected':'');btn.dataset.tilePattern=design.id;
  const preview=document.createElement('canvas');preview.width=120;preview.height=58;preview.setAttribute('aria-hidden','true');drawTileSwatch(preview,design.id,draftTileColor);
  const name=document.createElement('small');name.textContent=design.icon+' '+design.name;
  btn.append(preview,name);btn.addEventListener('click',()=>{draftTilePattern=design.id;renderTileChoices();renderTilePreview();});root.append(btn);
 });
}
function renderTileColorSwatches(){
 const root=$('tileColorSwatches');root.replaceChildren();
 CUSTOM_COLORS.forEach(color=>{
  const btn=document.createElement('button');btn.type='button';btn.className='color-swatch';btn.style.background=color;btn.title=color;btn.setAttribute('aria-label','Choose '+color);
  btn.addEventListener('click',()=>setDraftTileColor(color));root.append(btn);
 });
}
function setDraftTileColor(color){
 if(!/^#[0-9a-f]{6}$/i.test(color))return;
 draftTileColor=color.toLowerCase();$('tileColor').value=draftTileColor;$('tileHex').value=draftTileColor.toUpperCase();
 renderTileChoices();renderTilePreview();
}
function openTileDesigner(){
 draftTileColor=world.tileDesign?.color||'#c5a98a';draftTilePattern=world.tileDesign?.pattern||'grid';
 $('tileColor').value=draftTileColor;$('tileHex').value=draftTileColor.toUpperCase();
 renderTileChoices();renderTileColorSwatches();renderTilePreview();openShade('tileShade');
}
$('tileDesignBtn').addEventListener('click',()=>{closeShades();openTileDesigner();});
$('tileColor').addEventListener('input',e=>setDraftTileColor(e.target.value));$('tileColor').addEventListener('change',e=>setDraftTileColor(e.target.value));
$('tileHex').addEventListener('input',e=>{const v=e.target.value.trim();if(/^#[0-9a-f]{6}$/i.test(v))setDraftTileColor(v);});
$('tileHex').addEventListener('change',e=>{const v=e.target.value.trim();if(/^#[0-9a-f]{6}$/i.test(v))setDraftTileColor(v);else e.target.value=draftTileColor.toUpperCase();});
$('applyTileDesign').addEventListener('click',()=>{
 world.tileDesign={color:validHex(draftTileColor,'#c5a98a'),pattern:TILE_DESIGNS.some(t=>t.id===draftTilePattern)?draftTilePattern:'grid'};
 selected='tile';selectedBucketItem=null;placementPaused=false;setToolMode('build',false);save();renderHotbar();closeShades();
 showStatus('Tile design ready! Select a place to build your colorful tiles.');
});

function renderRecipes(){const root=$('recipes');root.replaceChildren();RECIPES.forEach(r=>{const card=document.createElement('div');card.className='recipe';const title=document.createElement('strong');title.textContent=r.icon+' '+r.name;const desc=document.createElement('p');desc.textContent=r.desc+' Materials: '+Object.entries(r.cost).map(([k,v])=>(ITEM_META[k]?.name||k)+' ×'+v).join(', ');const btn=document.createElement('button');btn.textContent='Craft';btn.addEventListener('click',()=>{const ok=Object.entries(r.cost).every(([id,n])=>world.materials.reduce((s,v)=>s+(v&&v.id===id?v.count:0),0)>=n);if(!ok){showStatus('Collect the listed materials first.');return;}if(!world.crafted.some(v=>!v)&&!world.crafted.some(v=>v&&v.id===r.id&&v.count<99)){showStatus('Your crafted pouch is full.');return;}for(const [id,n] of Object.entries(r.cost)){let left=n;for(const slot of world.materials){if(slot&&slot.id===id){const take=Math.min(left,slot.count);slot.count-=take;left-=take;if(slot.count===0)world.materials[world.materials.indexOf(slot)]=null;if(!left)break;}}}if(!addItem(r.id,'crafted')){showStatus('Your crafted pouch is full.');return;}save();renderSlots();showStatus(r.name+' crafted.');});card.append(title,desc,btn);root.append(card);});}
function downloadBackup(){save();const blob=new Blob([JSON.stringify(world,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(world.name.replace(/[^a-z0-9_-]+/gi,'_')||'DIYCraft')+'.json';a.click();URL.revokeObjectURL(url);showStatus('Backup file prepared. Keep it somewhere safe.');}
async function restoreBackup(file){if(!file)return;try{const raw=await file.text(),parsed=JSON.parse(raw);world=validWorld(parsed);$('worldName').value=world.name;rebuildLookup();save();render();showStatus('World backup restored.');}catch(e){showStatus('Backup could not be read. Your current world is unchanged.');}}
function focusToggle(){focusMode=!focusMode;document.body.classList.toggle('focus-mode',focusMode);}
function controlsToggle(){controllersHidden=!controllersHidden;document.body.classList.toggle('controllers-hidden',controllersHidden);$('controlsBtn').textContent=controllersHidden?'Show movement controls':'Hide movement controls';}
function updateFlyControls(){
 $('flyBtn').textContent='🕊 FLY: '+(flying?'ON':'OFF');
 $('flyUpBtn').classList.toggle('hidden',!flying);
 $('flyDownBtn').classList.toggle('hidden',!flying);
}
async function expandToggle(){if(!document.fullscreenElement&&document.documentElement.requestFullscreen){try{await document.documentElement.requestFullscreen();}catch(e){showStatus('Using the larger browser view instead.');}}document.body.classList.add('focus-mode');focusMode=true;}
// Keyboard input is simple, local and has no external communication.
document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();if(!e.repeat)jump();}keys[e.key===' '?' ':e.key]=true;if(e.key.toLowerCase()==='v'){cameraMode=cameraMode==='first'?'third':'first';updateViewButton();}if(e.key.toLowerCase()==='f'){flying=!flying;updateFlyControls();showStatus(flying?'Creative flight enabled.':'Flight turned off.');}if(e.key==='e'||e.key==='E')openBucket();if(e.key==='Escape'){closeShades();if(focusMode)focusToggle();}});
document.addEventListener('keyup',e=>{keys[e.key===' '?' ':e.key]=false;});
// Mouse or finger drag looks around. A single tap builds; a quick double-tap on the same block removes it.
let activePointer=null,movedPointer=false,startPt=null,lastPt=null;
let holdTimer=null,holdTriggered=false,holdBlockKey=null;
const HOLD_TO_REMOVE_MS=600;
function clearBlockHold(){
 if(holdTimer!==null){clearTimeout(holdTimer);holdTimer=null;}
 holdBlockKey=null;
}
function handleWorldTap(px,py){
 const hit=rayHitAtScreen(px,py);
 if(hit&&hit.block&&hit.block.type==='door'&&toolMode==='build'){toggleDoor(hit.block);return;}
 const animal=animalAtScreen(px,py);
 if(animal){openAnimalCare(animal);return;}
 const neighbor=neighborAtScreen(px,py);
 if(neighbor){openColoring(neighbor.name);return;}
 if(toolMode==='fish'){fishAtScreen(px,py);return;}
 if(placementPaused){showStatus('Building is paused. Choose a block to resume placing.');return;}
 buildOrFillAtScreen(px,py);
}
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'&&e.button===2){e.preventDefault();erase();return;}
 if(e.pointerType==='mouse'&&e.button!==0)return;
 activePointer=e.pointerId;movedPointer=false;holdTriggered=false;
 startPt={x:e.clientX,y:e.clientY};lastPt=startPt;
 canvas.setPointerCapture(e.pointerId);
 const rect=canvas.getBoundingClientRect();
 const px=e.clientX-rect.left,py=e.clientY-rect.top;
 if(toolMode==='build'&&!animalAtScreen(px,py)&&!neighborAtScreen(px,py)){
  const hit=rayHitAtScreen(px,py);
  const targetType=hit&&hit.block?'block':hit&&hit.ground?'ground':null;
  const targetKey=targetType==='block'?keyBlock(hit.block.x,hit.block.y,hit.block.z):targetType==='ground'?keyGround(hit.x,hit.z):null;
  if(targetType&&targetKey!==null){
   holdBlockKey=targetType+':'+targetKey;
   const holdId=holdBlockKey;
   holdTimer=setTimeout(()=>{
    if(activePointer!==e.pointerId||movedPointer||holdBlockKey!==holdId)return;
    const current=rayHitAtScreen(px,py);
    const sameBlock=targetType==='block'&&current&&current.block&&keyBlock(current.block.x,current.block.y,current.block.z)===targetKey;
    const sameGround=targetType==='ground'&&current&&current.ground&&keyGround(current.x,current.z)===targetKey;
    if(sameBlock||sameGround){
     holdTriggered=true;clearBlockHold();
     if(sameBlock){
      if(removeBlock(current.block.x,current.block.y,current.block.z)){render();showStatus('Block removed.');}
     }else digAtScreen(px,py);
    }
   },HOLD_TO_REMOVE_MS);
  }
 }
});
canvas.addEventListener('pointermove',e=>{
 if(activePointer!==e.pointerId||!lastPt)return;
 const dx=e.clientX-lastPt.x,dy=e.clientY-lastPt.y;
 if(Math.abs(e.clientX-startPt.x)+Math.abs(e.clientY-startPt.y)>5){
  if(!movedPointer){movedPointer=true;clearBlockHold();}
 }
 if(movedPointer){
  world.player.yaw-=dx*.006;
  world.player.pitch=Math.max(-1.22,Math.min(1.22,world.player.pitch-dy*.005));
 }
 lastPt={x:e.clientX,y:e.clientY};
});
canvas.addEventListener('pointerup',e=>{
 if(activePointer!==e.pointerId)return;
 clearBlockHold();
 if(!movedPointer&&!holdTriggered&&(e.pointerType!=='mouse'||e.button===0)){
  const rect=canvas.getBoundingClientRect();
  handleWorldTap(e.clientX-rect.left,e.clientY-rect.top);
 }
 activePointer=null;startPt=null;lastPt=null;holdTriggered=false;
});
canvas.addEventListener('pointercancel',()=>{
 clearBlockHold();activePointer=null;startPt=null;lastPt=null;holdTriggered=false;
});
// On-screen movement pads support press-and-hold on iPad.
document.querySelectorAll('[data-move]').forEach(btn=>{const vec=btn.dataset.move.split(',').map(Number);const down=e=>{e.preventDefault();moveX=vec[0];moveZ = -vec[1];btn.setPointerCapture?.(e.pointerId);};const up=e=>{e.preventDefault();if(moveX===vec[0]&&moveZ===vec[1]){moveX=0;moveZ=0;}};btn.addEventListener('pointerdown',down);['pointerup','pointercancel','lostpointercapture'].forEach(ev=>btn.addEventListener(ev,up));});
$('fishModeToggle').addEventListener('click',()=>{setToolMode(toolMode==='fish'?'build':'fish');$('fishModeToggle').textContent='🐟 Fish placement: '+(toolMode==='fish'?'On':'Off');closeShades();});
$('solidCustomizeBtn').addEventListener('click',()=>{closeShades();openCustomBlockDesigner();});
$('jumpBtn').addEventListener('click',jump);
$('flyBtn').addEventListener('click',()=>{flying=!flying;vertical=0;updateFlyControls();showStatus(flying?'Creative flight enabled.':'Flight turned off.');});
syncToolButtons();updateFlyControls();const clearButton=$('clearBtn');let clearHoldTimer=null,clearHoldFired=false;function cancelClearHold(){if(clearHoldTimer!==null){clearTimeout(clearHoldTimer);clearHoldTimer=null;}clearButton.classList.remove('holding');}clearButton.addEventListener('pointerdown',e=>{e.preventDefault();cancelClearHold();clearHoldFired=false;clearButton.classList.add('holding');try{clearButton.setPointerCapture(e.pointerId);}catch(_){}showStatus('Keep holding to clear your placed blocks…');clearHoldTimer=setTimeout(()=>{clearHoldTimer=null;clearButton.classList.remove('holding');clearHoldFired=true;if(window.confirm('Clear the blocks you have built? The starter garden and neighbor homes will remain.'))clearPlacedBlocks();else showStatus('Your world was left unchanged.');},1500);});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>clearButton.addEventListener(ev,cancelClearHold));clearButton.addEventListener('contextmenu',e=>e.preventDefault());

$('flyUpBtn').addEventListener('pointerdown',e=>{e.preventDefault();e.currentTarget.setPointerCapture?.(e.pointerId);if(flying)vertical=1;});$('flyDownBtn').addEventListener('pointerdown',e=>{e.preventDefault();e.currentTarget.setPointerCapture?.(e.pointerId);if(flying)vertical=-1;});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>{ $('flyUpBtn').addEventListener(ev,()=>{if(vertical>0)vertical=0;});$('flyDownBtn').addEventListener(ev,()=>{if(vertical<0)vertical=0;});});window.addEventListener('pointerup',()=>{moveX=0;moveZ=0;vertical=0;});window.addEventListener('pointercancel',()=>{moveX=0;moveZ=0;vertical=0;});
function updateViewButton(){$('viewBtn').textContent=cameraMode==='first'?'👁 1st':'👁 3rd';}
$('viewBtn').addEventListener('click',()=>{cameraMode=cameraMode==='first'?'third':'first';updateViewButton();showStatus(cameraMode==='first'?'First-person view':'Third-person view');});updateViewButton();


syncTimeControls();
$('timeOfDay').addEventListener('change',e=>setTimeMode(e.target.value));
$('useCustomColor').addEventListener('click',()=>{world.customBlock.color=validHex($('customColor').value,world.customBlock.color);chooseMaterial('custom');save();renderHotbar();closeShades();showStatus('Custom color selected. Tap the world to build with it.');});
$('neighborsBtn').addEventListener('click',()=>{closeShades();showStatus('Your neighbors wave quietly and enjoy their peaceful activities.');});$('animalCareBtn').addEventListener('click',()=>{closeShades();showStatus('The sheep and cat enjoy gentle care. Every animal stays safe.');});$('customColor').addEventListener('input',()=>{world.customBlock.color=validHex($('customColor').value,world.customBlock.color);if(selected==='custom')renderHotbar();save();});$('controlsBtn').addEventListener('click',()=>{controlsToggle();$('controlsBtn').textContent=controllersHidden?'Show movement controls':'Hide movement controls';closeShades();});$('showControls').addEventListener('click',controlsToggle);$('expandBtn').addEventListener('click',expandToggle);$('focusExit').addEventListener('click',()=>{if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});if(focusMode)focusToggle();});document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&focusMode)focusToggle();});$('menuBtn').addEventListener('click',()=>openShade('menuShade'));$('menuInventory').addEventListener('click',()=>{closeShades();openBucket();});
$('clearBucketBtn').addEventListener('click',()=>{if(!world.bucket.length){showStatus('Your Material Bucket is already empty.');return;}if(!window.confirm('Empty the Material Bucket? Recovered blocks will be discarded.'))return;world.bucket=[];selectedBucketItem=null;save();renderSlots();renderHotbar();showStatus('Material Bucket emptied.');});$('craftBtn').addEventListener('click',()=>{closeShades();renderRecipes();openShade('craftShade');});$('artBtn').addEventListener('click',()=>{closeShades();openShade('artShade');});$('characterBtn').addEventListener('click',()=>{closeShades();openCharacterStudio();});$('saveBtn').addEventListener('click',()=>save(false));$('backupBtn').addEventListener('click',downloadBackup);$('restoreInput').addEventListener('change',e=>{restoreBackup(e.target.files?.[0]);e.target.value='';});$('worldName').addEventListener('change',()=>{world.name=$('worldName').value.slice(0,30);save();});$('clearBtn').addEventListener('click',()=>{if(!confirm('Remove all blocks you placed? Neighbors and animals will stay. Export a backup first if needed.'))return;world.blocks=[];rebuildLookup();save();render();closeShades();showStatus('Placed blocks cleared.');});document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closeShades));document.querySelectorAll('.menu-shade').forEach(s=>s.addEventListener('pointerdown',e=>{if(e.target===s)closeShades();}));document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{inventoryTab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));renderSlots();}));
$('applyCharacter').addEventListener('click',()=>{
 const p=characterValue();
 Object.assign(world.player,{
  hairStyle:p.hairStyle,outfitStyle:p.outfitStyle,accessory:p.accessory,accessoryColor:p.accessoryColor,
  hair:p.hair,skin:p.skin,shirt:p.shirt,pants:p.pants,shoes:p.shoes,eyes:p.eyes
 });
 save();render();closeShades();showStatus('Your new character look is saved!');
});
// Offline coloring sheets: original vector line art is embedded in this file.
const COLOR_PAGES=[
 {id:'cottage',name:'Cozy cottage',svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 460"><rect width="640" height="460" fill="#fffdf8"/><circle cx="520" cy="82" r="42" fill="white" stroke="#263c32" stroke-width="7"/><path d="M500 82h40M520 62v40M492 54l56 56M548 54l-56 56" stroke="#263c32" stroke-width="5" stroke-linecap="round"/><path d="M105 220L320 65l215 155" fill="white" stroke="#263c32" stroke-width="10" stroke-linejoin="round"/><path d="M145 204v205h350V204Z" fill="white" stroke="#263c32" stroke-width="9"/><rect x="270" y="285" width="105" height="124" rx="5" fill="white" stroke="#263c32" stroke-width="8"/><circle cx="355" cy="348" r="6" fill="#263c32"/><rect x="180" y="250" width="70" height="68" fill="white" stroke="#263c32" stroke-width="8"/><path d="M215 250v68M180 284h70" stroke="#263c32" stroke-width="6"/><rect x="405" y="250" width="65" height="68" fill="white" stroke="#263c32" stroke-width="8"/><path d="M437 250v68M405 284h65" stroke="#263c32" stroke-width="6"/><path d="M90 410h460M100 380q25-28 50 0q25-28 50 0M450 380q25-28 50 0q25-28 50 0" fill="none" stroke="#263c32" stroke-width="7" stroke-linecap="round"/><path d="M92 350q-25-25-5-45q25-12 34 10q9-23 32-10q20 24-6 45l-27 22zM520 350q-25-25-5-45q25-12 34 10q9-23 32-10q20 24-6 45l-27 22z" fill="white" stroke="#263c32" stroke-width="6"/></svg>`},
 {id:'butterfly',name:'Garden butterfly',svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 460"><rect width="640" height="460" fill="#fffdf8"/><path d="M318 220C220 50 90 80 100 210c5 70 85 100 190 60C190 390 260 405 318 270C376 405 450 390 350 270c105 40 185 10 190-60C550 80 420 50 322 220Z" fill="white" stroke="#263c32" stroke-width="9" stroke-linejoin="round"/><ellipse cx="320" cy="252" rx="24" ry="88" fill="white" stroke="#263c32" stroke-width="8"/><path d="M306 173q-45-65-66-35M334 173q45-65 66-35" fill="none" stroke="#263c32" stroke-width="7" stroke-linecap="round"/><circle cx="195" cy="190" r="28" fill="white" stroke="#263c32" stroke-width="7"/><circle cx="445" cy="190" r="28" fill="white" stroke="#263c32" stroke-width="7"/><circle cx="235" cy="305" r="25" fill="white" stroke="#263c32" stroke-width="7"/><circle cx="405" cy="305" r="25" fill="white" stroke="#263c32" stroke-width="7"/><path d="M60 400h520M95 400q10-45 25-60q20 30 10 60M520 400q-10-45-25-60q-20 30-10 60" fill="none" stroke="#263c32" stroke-width="7" stroke-linecap="round"/><path d="M160 100q25-25 50 0q-25 25-50 0M430 100q25-25 50 0q-25 25-50 0" fill="white" stroke="#263c32" stroke-width="6"/></svg>`},
 {id:'kitty',name:'Happy kitty',svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 460"><rect width="640" height="460" fill="#fffdf8"/><path d="M170 190L145 75l115 65q60-25 120 0L495 75l-25 115q25 70-5 140q-45 90-138 90t-138-90q-30-70-19-140Z" fill="white" stroke="#263c32" stroke-width="10" stroke-linejoin="round"/><path d="M195 168l-20-65 67 39M445 142l67-39-20 65" fill="none" stroke="#263c32" stroke-width="7"/><ellipse cx="245" cy="245" rx="18" ry="25" fill="white" stroke="#263c32" stroke-width="7"/><ellipse cx="395" cy="245" rx="18" ry="25" fill="white" stroke="#263c32" stroke-width="7"/><path d="M306 292q14-15 28 0q-14 20-28 0M320 310q-24 38-52 8M320 310q24 38 52 8" fill="white" stroke="#263c32" stroke-width="7" stroke-linecap="round"/><path d="M210 300l-95-15M210 325l-100 20M430 300l95-15M430 325l100 20" stroke="#263c32" stroke-width="6" stroke-linecap="round"/><path d="M215 385q-20 45 20 45h170q40 0 20-45" fill="white" stroke="#263c32" stroke-width="8"/><path d="M190 410q-60 0-55-55q5-38 45-35" fill="none" stroke="#263c32" stroke-width="12" stroke-linecap="round"/></svg>`},
 {id:'flower',name:'Big happy flower',svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 460"><rect width="640" height="460" fill="#fffdf8"/><path d="M320 255v170M320 350q-90-70-125 0q65 65 125 0M320 385q90-70 125 0q-65 65-125 0" fill="white" stroke="#263c32" stroke-width="9" stroke-linejoin="round"/><g fill="white" stroke="#263c32" stroke-width="8"><ellipse cx="320" cy="112" rx="42" ry="68"/><ellipse cx="320" cy="250" rx="42" ry="68"/><ellipse cx="250" cy="180" rx="68" ry="42"/><ellipse cx="390" cy="180" rx="68" ry="42"/><ellipse cx="270" cy="130" rx="42" ry="64" transform="rotate(-45 270 130)"/><ellipse cx="370" cy="130" rx="42" ry="64" transform="rotate(45 370 130)"/><ellipse cx="270" cy="230" rx="42" ry="64" transform="rotate(45 270 230)"/><ellipse cx="370" cy="230" rx="42" ry="64" transform="rotate(-45 370 230)"/><circle cx="320" cy="180" r="57"/></g><path d="M90 425h460M130 420q0-55 35-75q35 25 35 75M440 420q0-55 35-75q35 25 35 75" fill="none" stroke="#263c32" stroke-width="7" stroke-linecap="round"/></svg>`},
 {id:'rainbow',name:'Rainbow day',svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 460"><rect width="640" height="460" fill="#fffdf8"/><path d="M95 365a225 225 0 0 1 450 0h-42a183 183 0 0 0-366 0z" fill="white" stroke="#263c32" stroke-width="8" stroke-linejoin="round"/><path d="M137 365a183 183 0 0 1 366 0h-42a141 141 0 0 0-282 0z" fill="white" stroke="#263c32" stroke-width="7"/><path d="M179 365a141 141 0 0 1 282 0h-42a99 99 0 0 0-198 0z" fill="white" stroke="#263c32" stroke-width="7"/><path d="M221 365a99 99 0 0 1 198 0h-42a57 57 0 0 0-114 0z" fill="white" stroke="#263c32" stroke-width="7"/><path d="M80 365q-50-5-44-55q6-44 55-40q25-45 69-20q38 25 16 70q-13 28-45 28zM465 348q-45-40-12-82q32-39 72-7q41-4 54 37q12 42-28 59z" fill="white" stroke="#263c32" stroke-width="8"/><circle cx="320" cy="75" r="37" fill="white" stroke="#263c32" stroke-width="8"/><path d="M320 15v-12M320 135v-15M260 75h-16M396 75h-16M278 33l-12-12M362 117l-12-12M362 33l12-12" stroke="#263c32" stroke-width="7" stroke-linecap="round"/></svg>`},
 {id:'sheep',name:'Fluffy sheep',svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 460"><rect width="640" height="460" fill="#fffdf8"/><g fill="white" stroke="#263c32" stroke-width="8"><circle cx="210" cy="220" r="70"/><circle cx="280" cy="165" r="72"/><circle cx="360" cy="165" r="72"/><circle cx="430" cy="225" r="70"/><circle cx="370" cy="285" r="72"/><circle cx="270" cy="290" r="72"/><circle cx="320" cy="225" r="85"/><path d="M400 205q75-5 80 60q-5 62-80 62q-22-5-28-22v-78q9-18 28-22z"/></g><circle cx="430" cy="245" r="7" fill="#263c32"/><circle cx="470" cy="245" r="7" fill="#263c32"/><path d="M440 278q15 13 30 0M210 320v75M260 335v60M390 335v60M440 320v75M145 395h340" fill="none" stroke="#263c32" stroke-width="9" stroke-linecap="round"/><path d="M105 395q10-40 35-55q25 15 30 55M500 395q10-40 35-55q25 15 30 55" fill="white" stroke="#263c32" stroke-width="7"/></svg>`}
];
let coloringNeighbor='hyacinth',colorPage=null,colorTool='fill',colorUndoStack=[],colorDrawing=false,colorLast=null,colorBaseData=null,neighborColorTimer=null,neighborBrushHideTimer=null,neighborColorStep=0;
const colorCanvas=$('colorCanvas'),colorCtx=colorCanvas.getContext('2d',{willReadFrequently:true});
function openColoring(neighborName='hyacinth'){stopNeighborColoring();coloringNeighbor=neighborName;$('colorNeighborNote').textContent=neighborName+' is sitting beside you for a quiet coloring activity. Choose a picture to share. No talking is needed.';$('neighborPainterTitle').textContent=neighborName+' is ready to color with you';$('neighborPainterStatus').textContent='Pick a picture. You will see their brush and colors appear on the shared page.';$('neighborProgress').style.width='0%';closeShades();renderColorTemplates();$('colorTemplateGrid').classList.remove('hidden');$('colorWorkspace').classList.add('hidden');openShade('coloringShade');}
function svgData(svg){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg.replace('<svg ','<svg width="640" height="460" '));}
function renderColorTemplates(){const root=$('colorTemplateGrid');root.replaceChildren();for(const page of COLOR_PAGES){const btn=document.createElement('button');btn.className='color-template';const img=document.createElement('img');img.alt='Uncolored '+page.name+' line drawing';img.src=svgData(page.svg);const label=document.createElement('span');label.textContent=page.name;btn.append(img,label);btn.addEventListener('click',()=>loadColorPage(page));root.append(btn);}}
function pushColorUndo(){try{colorUndoStack.push(colorCtx.getImageData(0,0,colorCanvas.width,colorCanvas.height));if(colorUndoStack.length>8)colorUndoStack.shift();}catch(e){showStatus('Undo is unavailable for this picture.');}}
function drawColorSvg(page){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{colorCtx.fillStyle='#fffdf8';colorCtx.fillRect(0,0,colorCanvas.width,colorCanvas.height);const scale=Math.min(colorCanvas.width/img.width,colorCanvas.height/img.height),w=img.width*scale,h=img.height*scale;colorCtx.drawImage(img,(colorCanvas.width-w)/2,(colorCanvas.height-h)/2,w,h);colorBaseData=colorCtx.getImageData(0,0,colorCanvas.width,colorCanvas.height);resolve();};img.onerror=reject;img.src=svgData(page.svg);});}
async function loadColorPage(page){try{stopNeighborColoring();await drawColorSvg(page);colorPage=page;colorUndoStack=[];$('colorPageTitle').textContent=page.name+' · coloring together with '+coloringNeighbor;$('colorTemplateGrid').classList.add('hidden');$('colorWorkspace').classList.remove('hidden');colorTool='fill';updateColorToolButtons();startNeighborColoring();}catch(e){showStatus('This coloring picture could not be opened.');}}
function updateColorToolButtons(){$('bucketTool').classList.toggle('primary',colorTool==='fill');$('brushTool').classList.toggle('primary',colorTool==='brush');}
function fillColorRegion(x,y,chosenColor=null,recordUndo=true,onlyWhite=false){const w=colorCanvas.width,h=colorCanvas.height,px=Math.max(0,Math.min(w-1,Math.round(x))),py=Math.max(0,Math.min(h-1,Math.round(y))),img=colorCtx.getImageData(0,0,w,h),data=img.data,idx=(py*w+px)*4;const target=[data[idx],data[idx+1],data[idx+2]],lum=(target[0]+target[1]+target[2])/3;if(lum<115||(onlyWhite&&lum<225))return 0;const chosen=chosenColor||$('coloringColor').value;const fill=[parseInt(chosen.slice(1,3),16),parseInt(chosen.slice(3,5),16),parseInt(chosen.slice(5,7),16)];if(target.every((v,i)=>Math.abs(v-fill[i])<3))return 0;const original=new Uint8ClampedArray(data),seen=new Uint8Array(w*h),stack=new Int32Array(w*h);let top=0,count=0;const start=py*w+px;stack[top++]=start;seen[start]=1;const tol=62;while(top){const p=stack[--top],i=p*4;const dr=original[i]-target[0],dg=original[i+1]-target[1],db=original[i+2]-target[2];if(dr*dr+dg*dg+db*db>tol*tol)continue;data[i]=fill[0];data[i+1]=fill[1];data[i+2]=fill[2];data[i+3]=255;count++;const xx=p%w,yy=(p/w)|0;if(xx>0&&!seen[p-1]){seen[p-1]=1;stack[top++]=p-1;}if(xx<w-1&&!seen[p+1]){seen[p+1]=1;stack[top++]=p+1;}if(yy>0&&!seen[p-w]){seen[p-w]=1;stack[top++]=p-w;}if(yy<h-1&&!seen[p+w]){seen[p+w]=1;stack[top++]=p+w;}}if(count){if(recordUndo)pushColorUndo();colorCtx.putImageData(img,0,0);}return count;}
const NEIGHBOR_COLOR_PLANS={
 cottage:[{x:520,y:60,color:'#f5cb54',label:'the sunny sky'},{x:320,y:238,color:'#efc9a1',label:'the cottage walls'},{x:320,y:330,color:'#8fba83',label:'the front door'}],
 butterfly:[{x:195,y:190,color:'#f2a6bd',label:'a butterfly wing'},{x:445,y:190,color:'#9cc5ed',label:'the other wing'}],
 kitty:[{x:245,y:245,color:'#f4b96b',label:'one kitty eye'},{x:395,y:245,color:'#8fc4df',label:'the other kitty eye'}],
 flower:[{x:320,y:112,color:'#f4b6cb',label:'a flower petal'},{x:250,y:180,color:'#f5d268',label:'another petal'},{x:390,y:180,color:'#a5c98c',label:'a garden petal'}],
 rainbow:[{x:320,y:160,color:'#e99b9b',label:'the outer rainbow'},{x:320,y:205,color:'#f0c46a',label:'the next rainbow band'},{x:320,y:245,color:'#8bb9d9',label:'a lower rainbow band'}],
 sheep:[{x:210,y:220,color:'#c5d9ec',label:'Pip’s fluffy coat'},{x:280,y:165,color:'#f4d58a',label:'a woolly patch'},{x:360,y:165,color:'#eeb9cd',label:'another woolly patch'}]
};
function stopNeighborColoring(){if(neighborColorTimer!==null){clearTimeout(neighborColorTimer);neighborColorTimer=null;}if(neighborBrushHideTimer!==null){clearTimeout(neighborBrushHideTimer);neighborBrushHideTimer=null;}const cursor=$('neighborBrushCursor');if(cursor)cursor.classList.remove('active');}
function showNeighborBrush(x,y,color){const cursor=$('neighborBrushCursor'),rect=colorCanvas.getBoundingClientRect(),wrap=$('colorCanvas').parentElement.getBoundingClientRect();cursor.style.left=(rect.left-wrap.left+x/colorCanvas.width*rect.width)+'px';cursor.style.top=(rect.top-wrap.top+y/colorCanvas.height*rect.height)+'px';cursor.style.background=color;cursor.classList.add('active');if(neighborBrushHideTimer!==null)clearTimeout(neighborBrushHideTimer);}
function startNeighborColoring(){stopNeighborColoring();const actions=NEIGHBOR_COLOR_PLANS[colorPage?.id]||[];neighborColorStep=0;$('neighborPainterTitle').textContent=coloringNeighbor+' is coloring with you';$('neighborPainterStatus').textContent='Watch their brush move and add colors to your shared picture.';$('neighborProgress').style.width='0%';if(!actions.length){$('neighborPainterStatus').textContent=coloringNeighbor+' is here beside you. You can color together.';return;}const next=()=>{if(!colorPage||neighborColorStep>=actions.length){$('neighborPainterTitle').textContent=coloringNeighbor+' finished their colors';$('neighborPainterStatus').textContent='Your shared picture is ready for more colors from you.';$('neighborProgress').style.width='100%';$('neighborBrushCursor').classList.remove('active');neighborColorTimer=null;return;}const action=actions[neighborColorStep];showNeighborBrush(action.x,action.y,action.color);$('neighborPainterStatus').textContent=coloringNeighbor+' is coloring '+action.label+'…';neighborColorTimer=setTimeout(()=>{neighborColorTimer=null;const count=fillColorRegion(action.x,action.y,action.color,true,true);neighborColorStep++;$('neighborProgress').style.width=Math.round(neighborColorStep/actions.length*100)+'%';$('neighborPainterStatus').textContent=count?coloringNeighbor+' added color to '+action.label+'.':'Your area already has color, so '+coloringNeighbor+' is choosing another spot.';neighborBrushHideTimer=setTimeout(()=>$('neighborBrushCursor').classList.remove('active'),350);neighborColorTimer=setTimeout(next,850);},650);};neighborColorTimer=setTimeout(next,900);}
function colorPoint(e){const r=colorCanvas.getBoundingClientRect();return {x:(e.clientX-r.left)*colorCanvas.width/r.width,y:(e.clientY-r.top)*colorCanvas.height/r.height};}
colorCanvas.addEventListener('pointerdown',e=>{if(!colorPage)return;const p=colorPoint(e);if(colorTool==='fill'){fillColorRegion(p.x,p.y);return;}pushColorUndo();colorDrawing=true;colorLast=p;colorCanvas.setPointerCapture(e.pointerId);});
colorCanvas.addEventListener('pointermove',e=>{if(!colorDrawing||!colorLast)return;const p=colorPoint(e);colorCtx.strokeStyle=$('coloringColor').value;colorCtx.lineWidth=Number($('coloringBrush').value);colorCtx.lineCap='round';colorCtx.lineJoin='round';colorCtx.beginPath();colorCtx.moveTo(colorLast.x,colorLast.y);colorCtx.lineTo(p.x,p.y);colorCtx.stroke();colorLast=p;});
['pointerup','pointercancel','lostpointercapture'].forEach(ev=>colorCanvas.addEventListener(ev,()=>{colorDrawing=false;colorLast=null;}));
$('bucketTool').addEventListener('click',()=>{colorTool='fill';updateColorToolButtons();});$('brushTool').addEventListener('click',()=>{colorTool='brush';updateColorToolButtons();});
$('colorUndo').addEventListener('click',()=>{const prev=colorUndoStack.pop();if(prev)colorCtx.putImageData(prev,0,0);else showStatus('There is nothing to undo yet.');});
$('colorBackBtn').addEventListener('click',()=>{stopNeighborColoring();$('colorWorkspace').classList.add('hidden');$('colorTemplateGrid').classList.remove('hidden');});
$('resetColoring').addEventListener('click',()=>{if(colorPage){stopNeighborColoring();colorUndoStack=[];drawColorSvg(colorPage).then(()=>{startNeighborColoring();showStatus('Fresh shared coloring page ready.');});}});
$('saveColoring').addEventListener('click',()=>{if(!colorPage)return;if(world.artworks.length>=20){showStatus('Gallery is full. Export a backup first.');return;}try{const data=colorCanvas.toDataURL('image/png');if(data.length>550000){showStatus('This picture is too detailed to save. Try a simpler coloring page.');return;}if(!addItem('picture','crafted',colorPage.name+' with '+coloringNeighbor)){showStatus('Your crafted pouch is full.');return;}world.artworks.push({name:colorPage.name+' with '+coloringNeighbor,data});save();renderSlots();closeShades();showStatus('Your shared coloring picture has been saved.');}catch(e){showStatus('This picture could not be saved. Try again.');}});
$('coloringBtn').addEventListener('click',()=>openColoring('hyacinth'));
$('animalCareBtn').addEventListener('click',()=>openAnimalCare({id:'sheep'}));$('animalCareShade').addEventListener('click',e=>{const b=e.target.closest('[data-care]');if(b)careForAnimal(b.dataset.care);});
$('inviteArtBtn').addEventListener('click',()=>openColoring('hyacinth'));
// Art studio: local pixel-free line drawing with pointer/touch support.
const art=$('artCanvas'),actx=art.getContext('2d');function clearArt(){actx.fillStyle='#fffdf8';actx.fillRect(0,0,art.width,art.height);actx.strokeStyle='#eee8da';actx.lineWidth=1;for(let x=24;x<art.width;x+=24){actx.beginPath();actx.moveTo(x,0);actx.lineTo(x,art.height);actx.stroke();}for(let y=24;y<art.height;y+=24){actx.beginPath();actx.moveTo(0,y);actx.lineTo(art.width,y);actx.stroke();}}function artPoint(e){const r=art.getBoundingClientRect();return {x:(e.clientX-r.left)*art.width/r.width,y:(e.clientY-r.top)*art.height/r.height};}art.addEventListener('pointerdown',e=>{artDrawing=true;artLast=artPoint(e);art.setPointerCapture(e.pointerId);});art.addEventListener('pointermove',e=>{if(!artDrawing)return;const p=artPoint(e);actx.strokeStyle=$('paintColor').value;actx.lineWidth=Number($('brushSize').value);actx.lineCap='round';actx.lineJoin='round';actx.beginPath();actx.moveTo(artLast.x,artLast.y);actx.lineTo(p.x,p.y);actx.stroke();artLast=p;});['pointerup','pointercancel'].forEach(ev=>art.addEventListener(ev,()=>{artDrawing=false;artLast=null;}));$('clearArt').addEventListener('click',clearArt);$('saveArt').addEventListener('click',()=>{if(world.artworks.length>=20){showStatus('Gallery is full. Export a backup first.');return;}let data=art.toDataURL('image/png');if(data.length>550000){showStatus('Drawing is too large to save.');return;}world.artworks.push({name:$('artName').value.slice(0,28)||'My picture',data});if(!addItem('picture','crafted')){world.artworks.pop();showStatus('Crafted pouch is full.');return;}save();closeShades();clearArt();showStatus('Artwork saved in the crafted pouch.');});

function prepareOfflinePlay(){
 const note=$('offlineReadyNote');
 if(!('serviceWorker' in navigator)||!window.isSecureContext){
  note.textContent='Offline caching is not supported in this browser. Keep the game open while disconnected.';
  showStatus('This browser does not support offline caching.');
  return;
 }
 const onOfflinePage=/\/offline(?:\/index\.html)?\/?$/.test(location.pathname);
 const workerUrl=onOfflinePage?'../sw.js':'./sw.js';
 note.textContent='Preparing the offline copy of both game pages…';
 navigator.serviceWorker.register(workerUrl,{updateViaCache:'none'})
  .then(()=>navigator.serviceWorker.ready)
  .then(()=>{
   note.textContent='Offline ready on this device! You can disconnect and reopen DIYCraft in this same browser.';
   showStatus('Offline play is ready on this device. You can disconnect and reopen DIYCraft here.');
  })
  .catch(()=>{
   note.textContent='Offline setup could not finish. Please open DIYCraft again while connected.';
   showStatus('Offline setup could not finish. Please open DIYCraft again while connected.');
  });
}

// Keep one local autosave. No gameplay networking, analytics, third-party scripts or multiplayer.
makeTexturePatterns();makeTileTexturePatterns();rebuildLookup();$('worldName').value=world.name;$('timeOfDay').value=world.timeMode||'day';$('customColor').value=world.customBlock.color;draftCustomColor=world.customBlock.color;draftCustomTexture=world.customBlock.texture;renderCustomTextureChoices();renderCustomColorSwatches();renderCustomPreview();world.materials[0]=world.materials[0]||{id:'seed',count:12};world.materials[1]=world.materials[1]||{id:'wood',count:12};world.materials[2]=world.materials[2]||{id:'stone',count:6};world.materials[3]=world.materials[3]||{id:'apple',count:4};world.materials[4]=world.materials[4]||{id:'bread',count:3};world.materials[5]=world.materials[5]||{id:'milk',count:2};renderHotbar();clearArt();save();
window.addEventListener('resize',render);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save();});window.addEventListener('beforeunload',()=>save());setInterval(()=>save(),12000);requestAnimationFrame(loop);prepareOfflinePlay();
})();

