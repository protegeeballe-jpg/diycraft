'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const protection=require('../js/three-world-protection.js');
globalThis.DIYCraftThreeWorldProtection=protection;
const sandbox=require('../js/three-world-edit-sandbox.js');
const source=fs.readFileSync('diycraft.js','utf8');
const start=source.indexOf('function isProtectedDigCell(x,z){');
const end=source.indexOf('\nfunction canStoreItem',start);
if(start<0||end<0)throw new Error('Could not extract the production isProtectedDigCell() function.');
const originalFunction=source.slice(start,end).trim();
const homesStart=source.indexOf('const PROTECTED_NEIGHBOR_HOMES=');
const homesEnd=source.indexOf(';',homesStart);
if(homesStart<0||homesEnd<0)throw new Error('Could not extract original protected neighbor home coordinates.');
const productionHomes=new Function('return '+source.slice(homesStart+'const PROTECTED_NEIGHBOR_HOMES='.length,homesEnd)+';')();


function test(name,fn){
 try{fn();console.log('PASS '+name);}
 catch(error){console.error('FAIL '+name+'\n'+(error.stack||error));process.exitCode=1;}
}
function productionCheck(x,z,context){
 const now=(context.timeSeconds||0)*1000;
 const execute=new Function(
  'PROTECTED_NEIGHBOR_HOMES','performance','getTimePalette','currentNeighbors','animalPositions',
  originalFunction+'\nreturn isProtectedDigCell;'
 );
 const fn=execute(
  productionHomes,{now:()=>now},()=>({mode:context.mode||'day'}),
  ()=>context.neighbors||[],()=>context.animals||[]
 );
 return fn(x,z);
}
test('uses the exact protected home coordinates authored in Canvas 2D',()=>{
 assert.deepEqual(protection.HOMES,productionHomes);
});
test('protects the same three fixed neighbor-home rectangles as Canvas 2D',()=>{
 const points=[
  [-14,-8,true],[-9,-3,true],[10,-18,true],[14,-13,true],
  [15,-10,true],[20,-5,true],[-20,20,false],[0,0,false]
 ];
 for(const [x,z,expected] of points){
  assert.equal(protection.isProtectedCell(x,z,{}),expected);
  assert.equal(productionCheck(x,z,{mode:'day'}),expected);
 }
});
test('matches the exact neighbor proximity threshold and strict comparison',()=>{
 const context={mode:'day',neighbors:[{id:'n',x:.5,z:.5}],animals:[]};
 assert.equal(protection.isProtectedCell(0,0,context),true);
 assert.equal(protection.isProtectedCell(1,0,context),true,'A 1.0-block offset remains inside the protection radius.');
 assert.equal(protection.isProtectedCell(2,0,context),false);
 const boundary={mode:'day',neighbors:[{x:1.55,z:.5}],animals:[]};
 assert.equal(protection.isProtectedCell(0,0,boundary),false,'The original comparison is strictly less than 1.05.');
 for(const [x,z] of [[0,0],[1,0],[-1,1],[12,-6]])
  assert.equal(protection.isProtectedCell(x,z,context),productionCheck(x,z,context));
});
test('matches the exact animal proximity threshold and strict comparison',()=>{
 const context={mode:'day',neighbors:[],animals:[{id:'pet',x:.5,z:.5}]};
 assert.equal(protection.isProtectedCell(0,0,context),true);
 assert.equal(protection.isProtectedCell(1,0,context),false,'A one-cell offset is beyond the 0.7-block radius.');
 const boundary={neighbors:[],animals:[{x:1.2,z:.5}]};
 assert.equal(protection.isProtectedCell(0,0,boundary),false,'The original comparison is strictly less than 0.7.');
 for(const [x,z] of [[0,0],[1,0],[-1,1],[12,-6]])
  assert.equal(protection.isProtectedCell(x,z,context),productionCheck(x,z,context));
});
test('builds seven default moving neighbors and seven resident animals',()=>{
 const world={timeMode:'day',animals:[]},atZero=protection.actorContext(world,0),later=protection.actorContext(world,8);
 assert.equal(atZero.neighbors.length,7);
 assert.equal(atZero.animals.length,7);
 assert.ok(atZero.neighbors.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.z)));
 assert.ok(atZero.animals.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.z)));
 assert.notDeepEqual(atZero.neighbors,later.neighbors,'Neighbor protection positions must advance with time.');
 assert.notDeepEqual(atZero.animals,later.animals,'Resident animal protection positions must advance with time.');
});
test('uses night sleep spots and the same automatic day/sunset/night thresholds',()=>{
 const world={timeMode:'night',animals:[]},night=protection.actorContext(world,2);
 assert.equal(night.mode,'night');assert.equal(night.night,true);
 assert.deepEqual(night.neighbors.find(a=>a.id==='hyacinth'),{id:'hyacinth',x:-10.85,z:-4.85});
 assert.deepEqual(night.neighbors.find(a=>a.id==='theo'),{id:'theo',x:12.15,z:-14.85});
 const auto={timeMode:'auto',animals:[]};
 assert.equal(protection.actorContext(auto,0).mode,'day');
 assert.equal(protection.actorContext(auto,100).mode,'sunset');
 assert.equal(protection.actorContext(auto,140).mode,'night');
});
test('includes saved animals exactly once while preserving default resident identities',()=>{
 const world={animals:[
  {id:'sheep',x:100,z:100},
  {id:'saved-cat',x:30,z:30},
  {id:'saved-dog',x:40,z:40}
 ]};
 const context=protection.actorContext(world,3);
 assert.equal(context.animals.length,9);
 const sheep=context.animals.find(a=>a.id==='sheep');
 assert.ok(sheep.x<0&&sheep.z<0,'A saved record with a resident ID must not replace the resident roaming animal.');
 assert.deepEqual(context.animals.find(a=>a.id==='saved-cat'),{id:'saved-cat',x:30,z:30});
 assert.deepEqual(context.animals.find(a=>a.id==='saved-dog'),{id:'saved-dog',x:40,z:40});
});
test('rejects invalid coordinates and invalid protection clocks',()=>{
 assert.throws(()=>protection.isProtectedCell(NaN,0),/finite/);
 assert.throws(()=>protection.actorContext({},Infinity),/finite seconds/);
});
console.log('Three.js world protection tests complete.');


// Production-versus-Three.js obstacle-aware neighbor navigation parity.
const NAV_START=source.indexOf('const NAV_CELL_SCALE=');
const NAV_END=source.indexOf('\nfunction neighborOnRoute(',NAV_START);
const ROUTE_FN_START=source.indexOf('function neighborOnRoute(');
const ROUTE_FN_END=source.indexOf('\nconst FAMILY_ROUTES=',ROUTE_FN_START);
if(NAV_START<0||NAV_END<=NAV_START||ROUTE_FN_START<0||ROUTE_FN_END<=ROUTE_FN_START)
 throw new Error('Could not extract the original Canvas 2D neighbor navigation implementation.');
const productionNavigationSource=source.slice(NAV_START,NAV_END);
const productionNeighborOnRouteSource=source.slice(ROUTE_FN_START,ROUTE_FN_END);
function sourceConstant(name){
 const token='const '+name+'=';
 const index=source.indexOf(token);
 if(index<0)throw new Error('Could not locate production '+name+'.');
 const start=index+token.length;
 const stack=[];
 let quote=null,escaped=false;
 for(let i=start;i<source.length;i++){
  const ch=source[i];
  if(quote){
   if(escaped){escaped=false;continue;}
   if(ch==='\\'){escaped=true;continue;}
   if(ch===quote)quote=null;
   continue;
  }
  if(ch==="'"||ch==='"'||ch==='\x60'){quote=ch;continue;}
  if(ch==='{'||ch==='['||ch==='(')stack.push(ch);
  else if(ch==='}'||ch===']'||ch===')')stack.pop();
  else if(ch===';'&&stack.length===0)return new Function('return ('+source.slice(start,i)+');')();
 }
 throw new Error('Could not parse production '+name+'.');
}
function routeGeometry(routes){
 return Object.fromEntries(Object.entries(routes).map(([id,route])=>[
  id,route.map(point=>({x:point.x,z:point.z,pause:point.pause}))
 ]));
}
const productionRoutes=sourceConstant('NEIGHBOR_ROUTES');
const productionFamilyRoutes=sourceConstant('FAMILY_ROUTES');
const productionSleepSpots=sourceConstant('NEIGHBOR_SLEEP_SPOTS');
function productionNavigation(world,revision=1){
 const groundDepths=new Map((world.excavations||[]).map(cell=>[cell.x+','+cell.z,cell.depth]));
 const create=new Function(
  'world','groundDepths','WORLD_LIMIT','isPlantBlock',
  'let worldGeometryRevision='+revision+',neighborObstacleCache=null,neighborPathCache=new Map();\n'+
  productionNavigationSource+'\n'+productionNeighborOnRouteSource+
  '\nreturn {buildNeighborObstacleSet,findNeighborPath,neighborPathLength,getNeighborRouteSegments,neighborOnRoute};'
 );
 return create(world,groundDepths,1000000000,block=>!!block&&(block.type==='flower'||block.type==='tall_grass'));
}
function obstacleWorld(){
 const blocks=[];
 for(let z=-3;z<=3;z++)blocks.push({x:0,y:0,z,type:'stone'});
 blocks.push(
  {x:6,y:0,z:0,type:'door',open:false},
  {x:7,y:0,z:0,type:'door',open:true},
  {x:8,y:0,z:0,type:'flower'},
  {x:9,y:0,z:0,type:'tall_grass'},
  {x:10,y:0,z:0,type:'tile'},
  {x:11,y:3,z:0,type:'stone'},
  {x:12,y:-1,z:0,type:'stone'},
  {x:13,y:2,z:0,type:'dirt'},
  {x:14,y:0,z:0,type:'custom',color:'#aa83d8'}
 );
 return {blocks,excavations:[{x:3,z:-1,depth:2},{x:4,z:-1,depth:1}]};
}
function comparePath(actual,expected,label){
 assert.deepEqual(actual,expected,label);
 assert.ok(actual.length>=1,label+' must always return at least a safe/stuck point.');
 for(const point of actual){
  assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.z),label+' must contain finite coordinates.');
 }
}
test('keeps every neighbor and family waypoint, pause, and sleep coordinate aligned with Canvas 2D',()=>{
 assert.deepEqual(routeGeometry(protection.NEIGHBOR_ROUTES),routeGeometry({hyacinth:productionRoutes.hyacinth,theo:productionRoutes.theo}));
 assert.deepEqual(routeGeometry(protection.FAMILY_ROUTES),routeGeometry(productionFamilyRoutes));
 const nightPositions=protection.actorContext({timeMode:'night'},0).neighbors;
 for(const id of Object.keys(productionSleepSpots)){
  const predicted=nightPositions.find(actor=>actor.id===id);
  assert.deepEqual(
   predicted&&{x:predicted.x,z:predicted.z},
   {x:productionSleepSpots[id].x,z:productionSleepSpots[id].z},
   'Night protection position must match for '+id
  );
 }
});
test('matches the Canvas 2D half-block obstacle raster for solids, doors, plants, tiles, height, and excavations',()=>{
 const world=obstacleWorld(),production=productionNavigation(world),three=protection.createNavigationState(world,1);
 assert.deepEqual(
  [...three.cells].sort(),
  [...production.buildNeighborObstacleSet()].sort(),
  'The Three.js obstacle cells must exactly match Canvas 2D.'
 );
});
test('matches exact production routes for direct, obstructed, blocked-start, blocked-goal, and excavated paths',()=>{
 const world=obstacleWorld(),production=productionNavigation(world),three=protection.createNavigationState(world,1);
 const cases=[
  [{x:-4,z:6},{x:4,z:6},'clear direct route'],
  [{x:-3,z:0},{x:3,z:0},'route around a continuous wall'],
  [{x:6.5,z:.5},{x:9.5,z:.5},'blocked start with an open door and pass-through objects nearby'],
  [{x:4.5,z:.5},{x:6.5,z:.5},'blocked goal at a closed door'],
  [{x:.5,z:.5},{x:4.5,z:.5},'blocked starting cell'],
  [{x:-4,z:-1},{x:3.5,z:-.5},'excavated ground obstacle'],
  [{x:14.5,z:.5},{x:16.5,z:.5},'custom block obstacle']
 ];
 for(const [start,end,label] of cases){
  comparePath(
   protection.findNeighborPath(start,end,three),
   production.findNeighborPath(start,end),
   label
  );
 }
});
test('matches production eased route positions and travel timing for all seven actors over time',()=>{
 const world=obstacleWorld(),production=productionNavigation(world),three=protection.createNavigationState(world,1);
 const times=[0,.25,2.8,3.1,5.75,11,19.25,37.5,81.2,123.45];
 for(const actor of protection.ROUTE_ACTORS){
  for(const tick of times){
   const expected=production.neighborOnRoute(actor.route,tick,actor.phase,actor.speed);
   const actual=protection.routePosition(actor.route,tick,actor.phase,actor.speed,three);
   const pick=point=>({x:point.x,z:point.z,facing:point.facing,moving:point.moving,walk:point.walk});
   assert.deepEqual(pick(actual),pick(expected),actor.id+' at '+tick+' seconds');
  }
 }
});
test('rebuilds its obstacle grid and path cache only when the sandbox world revision advances',()=>{
 const world={blocks:[],excavations:[]},start={x:-2,z:0},end={x:2,z:0};
 const first=protection.createNavigationState(world,0);
 const originalPath=protection.findNeighborPath(start,end,first);
 assert.equal(first.cells.has('1,1'),false);
 world.blocks.push({key:'new-wall',type:'stone',x:0,y:0,z:0});
 const staleRevision=protection.createNavigationState(world,0);
 assert.equal(staleRevision,first,'A revision-stable world should reuse the cached navigation state.');
 assert.deepEqual(protection.findNeighborPath(start,end,staleRevision),originalPath,'A caller must advance the revision when geometry changes.');
 const changed=protection.createNavigationState(world,1);
 assert.notEqual(changed,first,'A changed world revision must rebuild navigation state.');
 assert.equal(changed.cells.has('1,1'),true,'New geometry must be present in the refreshed obstacle grid.');
 assert.notDeepEqual(protection.findNeighborPath(start,end,changed),originalPath,'A new obstacle must produce a newly calculated route.');
});
test('updates NPC protection predictions after sandbox placement and removal without replacing the world',()=>{
 const edit=sandbox.create({blocks:[],excavations:[],animals:[],timeMode:'day',player:{x:0,y:0,z:0,yaw:0}});
 const before=edit.protectionContext(3.1).neighbors.find(actor=>actor.id==='hyacinth');
 const placed=edit.addBlock({type:'stone',x:-6,y:0,z:-8});
 assert.equal(placed.revision,1);
 const detoured=edit.protectionContext(3.1).neighbors.find(actor=>actor.id==='hyacinth');
 assert.notDeepEqual(detoured,before,'A placed obstacle must immediately change the predicted route.');
 const removed=edit.remove(placed.selectedKey);
 assert.equal(removed.revision,2);
 const restored=edit.protectionContext(3.1).neighbors.find(actor=>actor.id==='hyacinth');
 assert.deepEqual(restored,before,'Removing the obstacle must restore the original route prediction.');
 assert.equal(removed.sourceUnchanged,true);
});
