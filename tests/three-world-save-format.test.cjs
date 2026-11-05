'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const adapter=require('../js/three-world-adapter.js');

function loadWorldHelpers(source,label){
 const start=source.indexOf('const WORLD_LIMIT=');
 const end=source.indexOf('let toastTimer=',start);
 assert.ok(start>=0&&end>start,'Could not locate '+label+' world validator in diycraft.js.');
 const executable=source.slice(start,end);
 return new Function(executable+'\nreturn {freshWorld,validWorld};')();
}
function test(name,fn){
 try{fn();console.log('PASS '+name);}
 catch(error){console.error('FAIL '+name+'\n'+(error.stack||error));process.exitCode=1;}
}
const mainSource=execFileSync('git',['show','origin/main:diycraft.js'],{encoding:'utf8'});
const branchSource=fs.readFileSync(path.join(__dirname,'..','diycraft.js'),'utf8');
const validators=[
 {label:'untouched production main',helpers:loadWorldHelpers(mainSource,'main')},
 {label:'migration branch save validator',helpers:loadWorldHelpers(branchSource,'migration branch')}
];
const production=validators[0].helpers;

function makeRepresentativeWorld(freshWorld){
 const raw=freshWorld();
 raw.name='Three.js migration garden';raw.timeMode='auto';
 raw.solidStyles={grass:{color:'#83B56C',texture:'leaves'},stone:{color:'#a3aab0',texture:'stone'}};
 raw.blocks.push(
  {x:500,y:0,z:500,type:'grass'},
  {x:501,y:0,z:500,type:'dirt',color:'#AABBCC',texture:'stone'},
  {x:502,y:0,z:500,type:'custom',color:'#9876BA',texture:'flower'},
  {x:503,y:0,z:500,type:'tile',color:'#C5A98A',tilePattern:'spiral'},
  {x:504,y:0,z:500,type:'door',color:'#a97545',style:'garden',orientation:'ew',swing:-1,open:true}
 );
 raw.excavations=[[600,600,3],[601,600,2]];
 raw.waterCells=[[600,600],[601,600]];raw.waterLevels=[[600,600,2],[601,600,1]];
 raw.fish=[[600,600],[600,600],[601,600]];
 raw.animals=[
  {id:'pip-saved',species:'sheep',name:'Pip',x:602.5,z:600.5,facing:.7,phase:1.4,body:'#ffffff',accent:'#e9a4c1'},
  {id:'mochi-saved',species:'cat',name:'Mochi',x:603.5,z:600.5,facing:1.2,phase:2.1}
 ];
 raw.bucket=[
  {type:'stone',color:'#9ca6a1',texture:'stone'},
  {type:'tile',color:'#c5a98a',tilePattern:'spiral'},
  {type:'door',color:'#a97545',style:'garden',orientation:'ew',swing:-1,open:false},
  {type:'water'}
 ];
 raw.materials=Array.from({length:60},()=>null);raw.crafted=Array.from({length:60},()=>null);
 raw.materials[0]={id:'wood',count:3,label:''};raw.materials[5]={id:'seed',count:7,label:'Garden seeds'};
 raw.crafted[0]={id:'picture',count:2,label:''};raw.crafted[3]={id:'bench',count:1,label:'Garden bench'};
 raw.artworks=[{name:'Watercolor flowers',data:'data:image/png;base64,AAAAAA=='}];
 raw.animalCare={sheep:6,cat_mochi:4,dog_buddy:3,'pip-saved':9};
 raw.player={...raw.player,x:8.25,y:0,z:-9.5,yaw:1.1,pitch:-.35,bed:{x:2,y:0,z:3,yaw:.5},
  hairStyle:'pigtails',outfitStyle:'overalls',accessory:'glasses',hair:'#efbd43',shirt:'#48a78b'};
 return raw;
}
function assertRoundTrip(helpers,label){
 const raw=makeRepresentativeWorld(helpers.freshWorld);
 const validatedBefore=helpers.validWorld(raw),snapshot=adapter.createSnapshot(validatedBefore);
 const saved=adapter.toSavedWorld(snapshot),validatedAfter=helpers.validWorld(saved);
 assert.deepEqual(validatedAfter,validatedBefore,
  'A Three.js backup must restore through '+label+' without losing saved fields.');
 assert.deepEqual(Object.keys(saved).sort(),[
  'animalCare','animals','artworks','blocks','bucket','crafted','customBlock','doorDesign',
  'excavations','fish','materials','name','player','solidStyles','tileDesign','timeMode',
  'version','waterCells','waterLevels'
 ].sort(),'The backup must contain only the original DIYCraft world schema.');
 assert.equal('source' in saved,false,'Renderer source markers must not leak into backups.');
 assert.equal('counts' in saved,false,'Renderer diagnostics must not leak into backups.');
 assert.equal('styledSolidTypes' in saved,false,'Adapter style bookkeeping must not leak into backups.');
 assert.equal('key' in saved.blocks.at(-1),false,'Renderer block keys must not leak into backups.');
 assert.equal('savedFields' in saved.blocks.at(-1),false,'Renderer appearance bookkeeping must not leak into backups.');
 assert.equal('key' in saved.animals[0],false,'Renderer animal keys must not leak into backups.');
 assert.deepEqual(saved.excavations[0],[600,600,3]);
 assert.deepEqual(saved.waterLevels,[[600,600,2],[601,600,1]]);
 assert.deepEqual(saved.waterCells,[[600,600],[601,600]]);
 assert.deepEqual(saved.fish,[[600,600],[600,600],[601,600]]);
 assert.equal(saved.blocks.at(-5).type,'grass');
 assert.equal('color' in saved.blocks.at(-5),false,'Renderer default block colors must not become explicit saved block colors.');
 assert.equal(saved.blocks.at(-4).color,'#AABBCC','Explicit saved solid color must be preserved exactly.');
 assert.equal(saved.blocks.at(-4).texture,'stone','Explicit saved solid texture must be preserved.');
 assert.deepEqual(saved.solidStyles,{grass:{color:'#83B56C',texture:'leaves'},stone:{color:'#a3aab0',texture:'stone'}});
}
test('round-trips version-1 backups through both production and migration-branch validators',()=>{
 for(const version of validators)assertRoundTrip(version.helpers,version.label);
});
test('round-trips explicit user-placement provenance through both version-1 validators',()=>{
 for(const version of validators){
  const raw=version.helpers.freshWorld();
  raw.blocks.push({x:500,y:0,z:500,type:'stone',userPlaced:true});
  const before=version.helpers.validWorld(raw),saved=adapter.toSavedWorld(adapter.createSnapshot(before));
  assert.equal(saved.blocks.at(-1).userPlaced,true,'Placement provenance survives adapter serialization for '+version.label+'.');
  const restored=version.helpers.validWorld(saved);
  assert.equal(restored.blocks.at(-1).userPlaced,true,'The original validator preserves the additive marker for '+version.label+'.');
 }
});
test('exports legacy one-layer water as production-compatible coordinate arrays',()=>{
 const legacy=production.validWorld({
  ...production.freshWorld(),excavations:[[10,11,4]],waterCells:[[10,11]],waterLevels:undefined,fish:[[10,11]]
 });
 const saved=adapter.toSavedWorld(adapter.createSnapshot(legacy));
 assert.deepEqual(saved.waterCells,[[10,11]]);
 assert.deepEqual(saved.waterLevels,[[10,11,1]]);
 assert.deepEqual(saved.fish,[[10,11]]);
 assert.deepEqual(production.validWorld(saved),legacy);
});
test('rejects non-snapshot or structurally incomplete backup export inputs',()=>{
 assert.throws(()=>adapter.toSavedWorld(null),/renderer snapshot/);
 assert.throws(()=>adapter.toSavedWorld({source:'other'}),/renderer snapshot/);
 assert.throws(()=>adapter.toSavedWorld({source:'diycraft-world-v1'}),/missing blocks/);
 const complete=adapter.createSnapshot(production.freshWorld());
 assert.throws(()=>adapter.toSavedWorld({...complete,player:null}),/missing its player/);
});
console.log('Three.js saved-world format tests complete.');
