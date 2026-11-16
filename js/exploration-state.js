/* The Exploration v1 save contract and pure gameplay-state operations.
   No DOM, renderer, browser storage, clocks, or network dependencies. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.TheExplorationState=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SCHEMA='the-exploration',SCHEMA_VERSION=1;
 const MAX_JOURNAL_PAGES=252,MAX_JOURNAL_CHARS=4000,MAX_WORLD_EDITS=12000;
 const MAX_PROGRESS_IDS=1000,MAX_ITEM_TYPES=50,MAX_ITEM_COUNT=999,MAX_INVENTORY_TOTAL=5000;
 const QUICKBAR_SLOTS=10,CAMPFIRE_SLOTS=4,MAX_COORDINATE=512;
 const ITEM_IDS=new Set([
  'wood','stone','dirt','grass','leaves','sand','snow','brick','glass','flower','tall_grass',
  'apple','berry','bread','carrot','potato','corn','cooked_vegetable','campfire'
 ]);
 const FOOD_ITEMS=new Set(['apple','berry','bread','carrot','potato','corn','cooked_vegetable']);
 const RAW_COOKABLE_ITEMS=new Set(['berry','carrot','potato','corn']);
 const ID_PATTERN=/^[a-z0-9][a-z0-9._-]{0,63}$/;
 const owns=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
 function isRecord(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
 function finite(value){return typeof value==='number'&&Number.isFinite(value);}
 function integer(value){return Number.isSafeInteger(value);}
 function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
 function cleanId(value,label){
  if(typeof value!=='string'||!ID_PATTERN.test(value))throw new TypeError((label||'Identifier')+' is invalid.');
  return value;
 }
 function cleanItemId(value,allowNull){
  if(value===null&&allowNull)return null;
  if(typeof value!=='string'||!ITEM_IDS.has(value))throw new TypeError('Unknown item identifier.');
  return value;
 }
 function normalizePosition(source){
  if(!isRecord(source))throw new TypeError('Player position is invalid.');
  const x=source.x,z=source.z,y=source.y,yaw=source.yaw;
  if(!finite(x)||!finite(y)||!finite(z)||!finite(yaw)||Math.abs(x)>MAX_COORDINATE||Math.abs(z)>MAX_COORDINATE||y< -64||y>256)
   throw new RangeError('Player position is outside the supported world bounds.');
  const tau=Math.PI*2;
  return {x,y,z,yaw:((yaw%tau)+tau)%tau};
 }
 function normalizeEdits(source){
  if(!Array.isArray(source)||source.length>MAX_WORLD_EDITS)throw new RangeError('World edit list is invalid or too large.');
  const edits=[],seen=new Set();
  for(const entry of source){
   if(!isRecord(entry)||!integer(entry.x)||!integer(entry.y)||!integer(entry.z)||
      Math.abs(entry.x)>MAX_COORDINATE||Math.abs(entry.z)>MAX_COORDINATE||entry.y< -64||entry.y>256)
    throw new TypeError('A saved world edit has invalid coordinates.');
   if(entry.action!=='place'&&entry.action!=='remove')throw new TypeError('A saved world edit has an invalid action.');
   const itemId=entry.action==='place'?cleanItemId(entry.itemId,false):null;
   const key=entry.x+','+entry.y+','+entry.z;
   if(seen.has(key))throw new TypeError('Saved world edits cannot contain duplicate cell coordinates.');
   seen.add(key);edits.push({x:entry.x,y:entry.y,z:entry.z,action:entry.action,itemId});
  }
  return edits;
 }
 function normalizeBackpack(source){
  if(!isRecord(source))throw new TypeError('Backpack inventory is invalid.');
  const keys=Object.keys(source);
  if(keys.length>MAX_ITEM_TYPES)throw new RangeError('Backpack contains too many item types.');
  const backpack=Object.create(null);let total=0;
  for(const key of keys){
   if(key==='__proto__'||key==='prototype'||key==='constructor')throw new TypeError('Backpack contains a forbidden key.');
   cleanItemId(key,false);const count=source[key];
   if(!integer(count)||count<1||count>MAX_ITEM_COUNT)throw new RangeError('Backpack item quantity is outside the supported range.');
   total+=count;if(total>MAX_INVENTORY_TOTAL)throw new RangeError('Backpack exceeds the total item capacity.');
   backpack[key]=count;
  }
  return backpack;
 }
 function normalizeQuickbar(source,backpack){
  if(!Array.isArray(source)||source.length!==QUICKBAR_SLOTS)throw new TypeError('Quickbar must contain exactly ten slots.');
  return source.map(value=>{
   const itemId=cleanItemId(value,true);
   if(itemId!==null&&!owns(backpack,itemId))throw new TypeError('Quickbar items must exist in the backpack.');
   return itemId;
  });
 }
 function normalizeCampfire(source){
  if(!isRecord(source)||!Array.isArray(source.slots)||source.slots.length!==CAMPFIRE_SLOTS)
   throw new TypeError('Campfire must contain exactly four cooking slots.');
  const slots=source.slots.map(value=>{
   if(value===null)return null;
   const itemId=cleanItemId(value,false);
   if(!RAW_COOKABLE_ITEMS.has(itemId))throw new TypeError('Campfire slots accept only approved raw plant foods.');
   return itemId;
  });
  const cooking=source.cooking;
  if(!isRecord(cooking)||typeof cooking.active!=='boolean'||!integer(cooking.remainingSeconds)||
     cooking.remainingSeconds<0||cooking.remainingSeconds>600)
   throw new TypeError('Campfire cooking state is invalid.');
  const allFilled=slots.every(value=>value!==null);
  if(cooking.active&&(!allFilled||cooking.remainingSeconds<1))throw new TypeError('Active cooking requires four ingredients and positive remaining time.');
  if(!cooking.active&&cooking.remainingSeconds!==0)throw new TypeError('Inactive cooking cannot retain a timer.');
  return {slots,cooking:{active:cooking.active,remainingSeconds:cooking.active?cooking.remainingSeconds:0}};
 }
 function normalizeIdList(source,label){
  if(!Array.isArray(source)||source.length>MAX_PROGRESS_IDS)throw new RangeError(label+' list is invalid or too large.');
  const result=[],seen=new Set();
  for(const value of source){const id=cleanId(value,label);if(!seen.has(id)){seen.add(id);result.push(id);}}
  return result;
 }
 function normalizeJournal(source){
  if(!isRecord(source)||!isRecord(source.pages))throw new TypeError('Journal data is invalid.');
  const pages={};
  for(const key of Object.keys(source.pages)){
   if(!/^(?:[1-9]|[1-9]\d|1\d\d|2[0-4]\d|25[0-2])$/.test(key))throw new RangeError('Journal page number must be between 1 and 252.');
   const value=source.pages[key];
   if(typeof value!=='string'||value.length>MAX_JOURNAL_CHARS)throw new RangeError('Journal page text is invalid or exceeds its character limit.');
   const trimmed=value.trim();if(trimmed)pages[key]=trimmed;
  }
  return {pages};
 }
 function validateSave(input){
  if(!isRecord(input)||input.schema!==SCHEMA||input.schemaVersion!==SCHEMA_VERSION)
   throw new TypeError('This is not a supported The Exploration version-1 save.');
  if(!integer(input.revision)||input.revision<0)throw new TypeError('Save revision is invalid.');
  if(!integer(input.updatedAt)||input.updatedAt<0)throw new TypeError('Save timestamp is invalid.');
  if(!isRecord(input.world)||!integer(input.world.seed)||input.world.seed<0||input.world.seed>0xffffffff||
     input.world.generatorVersion!==1)throw new TypeError('World seed or generator version is unsupported.');
  const backpack=normalizeBackpack(input.player&&input.player.backpack);
  if(!isRecord(input.player)||!integer(input.player.vitality)||input.player.vitality<0||input.player.vitality>10)
   throw new RangeError('Player vitality must be an integer from zero to ten.');
  const campfire=normalizeCampfire(input.player.campfire);
  return {
   schema:SCHEMA,schemaVersion:SCHEMA_VERSION,revision:input.revision,updatedAt:input.updatedAt,
   world:{seed:input.world.seed,generatorVersion:1,edits:normalizeEdits(input.world.edits),player:normalizePosition(input.world.player)},
   player:{vitality:input.player.vitality,quickbar:normalizeQuickbar(input.player.quickbar,backpack),backpack,campfire},
   progress:{
    completedQuestIds:normalizeIdList(input.progress&&input.progress.completedQuestIds,'Quest identifier'),
    discoveredLoreIds:normalizeIdList(input.progress&&input.progress.discoveredLoreIds,'Lore identifier'),
    mysteryEvidenceIds:normalizeIdList(input.progress&&input.progress.mysteryEvidenceIds,'Evidence identifier')
   },
   journal:normalizeJournal(input.journal)
  };
 }
 function createStarterSave(seed){
  const worldSeed=seed===undefined?0:seed;
  if(!integer(worldSeed)||worldSeed<0||worldSeed>0xffffffff)throw new RangeError('World seed must be an unsigned 32-bit integer.');
  return validateSave({schema:SCHEMA,schemaVersion:SCHEMA_VERSION,revision:0,updatedAt:0,
   world:{seed:worldSeed,generatorVersion:1,edits:[],player:{x:0,y:0,z:12,yaw:0}},
   player:{vitality:10,quickbar:Array(QUICKBAR_SLOTS).fill(null),backpack:{},campfire:{slots:Array(CAMPFIRE_SLOTS).fill(null),cooking:{active:false,remainingSeconds:0}}},
   progress:{completedQuestIds:[],discoveredLoreIds:[],mysteryEvidenceIds:[]},journal:{pages:{}}});
 }
 function draft(save){return JSON.parse(JSON.stringify(validateSave(save)));}
 function finish(next){next.revision+=1;return validateSave(next);}
 function applyDamage(save,amount){
  if(!integer(amount)||amount<1||amount>10)throw new RangeError('Damage must be an integer from one to ten.');
  const original=validateSave(save),before=original.player.vitality;
  if(before===0)return Object.freeze({save:original,applied:false,previousVitality:0,vitality:0});
  const next=draft(original);next.player.vitality=clamp(before-amount,0,10);
  return Object.freeze({save:finish(next),applied:next.player.vitality<before,previousVitality:before,vitality:next.player.vitality});
 }
 function addItems(save,itemId,count){
  cleanItemId(itemId,false);if(!integer(count)||count<1||count>MAX_ITEM_COUNT)throw new RangeError('Item quantity is invalid.');
  const next=draft(save),current=next.player.backpack[itemId]||0;
  if(current+count>MAX_ITEM_COUNT||Object.keys(next.player.backpack).length+(current===0?1:0)>MAX_ITEM_TYPES||
     Object.values(next.player.backpack).reduce((sum,n)=>sum+n,0)+count>MAX_INVENTORY_TOTAL)
   return Object.freeze({save:validateSave(save),added:false,reason:'Backpack capacity reached.'});
  next.player.backpack[itemId]=current+count;
  return Object.freeze({save:finish(next),added:true,reason:''});
 }
 function removeItems(save,itemId,count){
  cleanItemId(itemId,false);if(!integer(count)||count<1||count>MAX_ITEM_COUNT)throw new RangeError('Item quantity is invalid.');
  const next=draft(save),current=next.player.backpack[itemId]||0;
  if(current<count)return Object.freeze({save:validateSave(save),removed:false,reason:'Not enough items.'});
  if(current===count){delete next.player.backpack[itemId];next.player.quickbar=next.player.quickbar.map(value=>value===itemId?null:value);}
  else next.player.backpack[itemId]=current-count;
  return Object.freeze({save:finish(next),removed:true,reason:''});
 }
 function consumeFood(save,itemId){
  cleanItemId(itemId,false);const original=validateSave(save);
  if(!FOOD_ITEMS.has(itemId))return Object.freeze({save:original,consumed:false,reason:'This item is not food.'});
  if(original.player.vitality>=10)return Object.freeze({save:original,consumed:false,reason:'Vitality is already full.'});
  if(!owns(original.player.backpack,itemId))return Object.freeze({save:original,consumed:false,reason:'No matching food is available.'});
  const next=draft(original),remaining=next.player.backpack[itemId]-1;
  if(remaining===0){delete next.player.backpack[itemId];next.player.quickbar=next.player.quickbar.map(value=>value===itemId?null:value);}
  else next.player.backpack[itemId]=remaining;
  next.player.vitality=clamp(next.player.vitality+1,0,10);
  return Object.freeze({save:finish(next),consumed:true,reason:''});
 }
 function setQuickbarSlot(save,slot,itemId){
  if(!integer(slot)||slot<0||slot>=QUICKBAR_SLOTS)throw new RangeError('Quickbar slot must be between zero and nine.');
  const next=draft(save),item=cleanItemId(itemId,true);
  if(item!==null&&!owns(next.player.backpack,item))return Object.freeze({save:validateSave(save),updated:false});
  next.player.quickbar[slot]=item;return Object.freeze({save:finish(next),updated:true});
 }
 function setJournalPage(save,pageNumber,text){
  if(!integer(pageNumber)||pageNumber<1||pageNumber>MAX_JOURNAL_PAGES)throw new RangeError('Journal page must be between 1 and 252.');
  if(typeof text!=='string'||text.length>MAX_JOURNAL_CHARS)throw new RangeError('Journal text exceeds the 4,000-character page limit.');
  const next=draft(save),clean=text.trim();
  if(clean)next.journal.pages[String(pageNumber)]=clean;else delete next.journal.pages[String(pageNumber)];
  return finish(next);
 }
 function recordProgress(save,kind,id){
  const fields={quest:'completedQuestIds',lore:'discoveredLoreIds',evidence:'mysteryEvidenceIds'};
  const field=fields[kind];if(!field)throw new TypeError('Unknown progress category.');cleanId(id,'Progress identifier');
  const next=draft(save),list=next.progress[field];
  if(list.includes(id))return Object.freeze({save:validateSave(save),recorded:false});
  if(list.length>=MAX_PROGRESS_IDS)throw new RangeError('Progress record limit reached.');
  list.push(id);return Object.freeze({save:finish(next),recorded:true});
 }
 function setWorldEdit(save,edit){
  const next=draft(save);const normalized=normalizeEdits([edit])[0];
  const index=next.world.edits.findIndex(entry=>entry.x===normalized.x&&entry.y===normalized.y&&entry.z===normalized.z);
  if(index>=0)next.world.edits.splice(index,1);
  if(next.world.edits.length>=MAX_WORLD_EDITS)throw new RangeError('World edit capacity reached.');
  next.world.edits.push(normalized);return finish(next);
 }
 return Object.freeze({
  SCHEMA,SCHEMA_VERSION,MAX_JOURNAL_PAGES,MAX_JOURNAL_CHARS,MAX_WORLD_EDITS,QUICKBAR_SLOTS,CAMPFIRE_SLOTS,
  ITEM_IDS:Object.freeze(Array.from(ITEM_IDS)),FOOD_ITEMS:Object.freeze(Array.from(FOOD_ITEMS)),
  RAW_COOKABLE_ITEMS:Object.freeze(Array.from(RAW_COOKABLE_ITEMS)),
  createStarterSave,validateSave,applyDamage,addItems,removeItems,consumeFood,setQuickbarSlot,setJournalPage,recordProgress,setWorldEdit
 });
});