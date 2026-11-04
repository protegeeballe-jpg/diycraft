/* Dynamic DIYCraft neighbor/animal digging protection.
   Home rectangles, proximity thresholds, active route schedules, and obstacle-
   aware path timing follow Canvas 2D. Navigation is rebuilt from each isolated
   sandbox world revision; no production world or storage is touched. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreeWorldProtection=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const HOMES=Object.freeze([
  Object.freeze({x:-13,z:-7}),Object.freeze({x:10,z:-17}),Object.freeze({x:16,z:-9})
 ]);
 const NEIGHBOR_ROUTES=Object.freeze({
  hyacinth:[
   {x:-5,z:-8,pause:2.8,activity:'👋'},{x:-7,z:-7,pause:2.0,activity:'🌼'},{x:-10,z:-1.8,pause:2.7,activity:'🏡'},{x:-10,z:-9.5,pause:2.5,activity:'🌳'},{x:-6,z:-11,pause:2.4,activity:'🌸'}
  ],
  theo:[
   {x:5,z:-11,pause:2.3,activity:'👋'},{x:8,z:-10,pause:2.0,activity:'🌱'},{x:12,z:-12.1,pause:2.8,activity:'🏡'},{x:9,z:-8.5,pause:2.2,activity:'☀️'},{x:4,z:-7,pause:2.8,activity:'🐑'}
  ]
 });
 const FAMILY_ROUTES=Object.freeze({
  dad:[{x:14,z:-4.8,pause:1.4,activity:'👋'},{x:14,z:-1.4,pause:2,activity:'🌳'},{x:17,z:-.8,pause:1,activity:'☀️'},{x:19.5,z:-2,pause:1.8,activity:'🏡'},{x:17,z:-3.3,pause:1.1,activity:'🌼'}],
  mom:[{x:22,z:-4.4,pause:2.4,activity:'🌸'},{x:23.5,z:-1.8,pause:2.1,activity:'🌷'},{x:20.8,z:-.5,pause:2.8,activity:'☀️'},{x:19.8,z:-2.5,pause:2,activity:'🏡'}],
  lia:[{x:15.2,z:-1.1,pause:1.4,activity:'🦋'},{x:16.5,z:-.4,pause:1,activity:'🌼'},{x:17.3,z:-1.7,pause:1.2,activity:'🌷'},{x:16.2,z:-2.7,pause:1,activity:'💐'}],
  maya:[{x:19.2,z:-1.2,pause:1.1,activity:'🌻'},{x:21.4,z:-.8,pause:1.5,activity:'🐾'},{x:22.3,z:-2.2,pause:1,activity:'🌺'},{x:20.4,z:-3.2,pause:1.3,activity:'🌿'}],
  nico:[{x:13.2,z:-7.7,pause:.7,activity:'🏃'},{x:13.6,z:-5.5,pause:.6,activity:'🐕'},{x:14.8,z:-3.9,pause:.9,activity:'⚽'},{x:13.7,z:-2.5,pause:.6,activity:'🌳'},{x:12.8,z:-4.7,pause:.8,activity:'🏃'}]
 });
 const SLEEP_SPOTS=Object.freeze({
  hyacinth:{x:-10.85,z:-4.85},theo:{x:12.15,z:-14.85},
  dad:{x:17,z:-7.9},mom:{x:19.1,z:-7.9},lia:{x:17,z:-6.2},maya:{x:19.1,z:-6.2},nico:{x:18.1,z:-8.35}
 });
 const FAMILY=Object.freeze([
  {id:'dad',name:'Miguel',route:FAMILY_ROUTES.dad,speed:1.12,pace:7.2,phase:1.5,scale:1.10,shirt:'#477b9a',hair:'#392b24',skin:'#c9916d',pants:'#40516c',shoes:'#493b35',eyes:'#302820',hairStyle:'short',outfitStyle:'tee',accessory:'none',homeX:16,homeZ:-9},
  {id:'mom',name:'Ana',route:FAMILY_ROUTES.mom,speed:.92,pace:6.8,phase:8.2,scale:1.02,shirt:'#bd7896',hair:'#493127',skin:'#edc19e',pants:'#557c65',shoes:'#88516c',eyes:'#302820',hairStyle:'long',outfitStyle:'dress',accessory:'flower',accessoryColor:'#f2c768',homeX:16,homeZ:-9},
  {id:'lia',name:'Lia',route:FAMILY_ROUTES.lia,speed:1.42,pace:10.2,phase:3.4,scale:.78,shirt:'#e58eaa',hair:'#57372b',skin:'#f0c9a9',pants:'#83a86c',shoes:'#c75e7c',eyes:'#302820',hairStyle:'pigtails',outfitStyle:'dress',accessory:'bow',accessoryColor:'#f4c4d5',homeX:16,homeZ:-9},
  {id:'maya',name:'Maya',route:FAMILY_ROUTES.maya,speed:1.30,pace:9.6,phase:12.7,scale:.75,shirt:'#e6bb58',hair:'#3f3028',skin:'#e8b995',pants:'#5593a0',shoes:'#b87845',eyes:'#302820',hairStyle:'bob',outfitStyle:'overalls',accessory:'flower',accessoryColor:'#f28cae',homeX:16,homeZ:-9},
  {id:'nico',name:'Nico',route:FAMILY_ROUTES.nico,speed:1.68,pace:11.4,phase:5.9,scale:.82,shirt:'#6d9b70',hair:'#382921',skin:'#dba77f',pants:'#526d8c',shoes:'#5d4b3e',eyes:'#302820',hairStyle:'curly',outfitStyle:'hoodie',accessory:'none',homeX:16,homeZ:-9}
 ]);
 const ROUTE_ACTORS=Object.freeze([
  Object.freeze({id:'hyacinth',name:'hyacinth',route:NEIGHBOR_ROUTES.hyacinth,phase:0,speed:1.05,pace:8,scale:1,shirt:'#d94b3d',hair:'#493127',skin:'#f0c7a3',pants:'#287b8a',shoes:'#bd4540',eyes:'#302820',hairStyle:'bob',outfitStyle:'hoodie',accessory:'none',homeX:-13,homeZ:-7}),
  Object.freeze({id:'theo',name:'Theo',route:NEIGHBOR_ROUTES.theo,phase:11,speed:1.05,pace:8,scale:1,shirt:'#48a78b',hair:'#efbd43',skin:'#dfab83',pants:'#219da5',shoes:'#e6b64d',eyes:'#302820',hairStyle:'pigtails',outfitStyle:'overalls',accessory:'glasses',accessoryColor:'#ec83ba',homeX:10,homeZ:-17}),
  ...FAMILY.map(actor=>Object.freeze(actor))
 ]);
 const RESIDENTS=Object.freeze([
  {id:'sheep',x:-2,z:-7,phase:.2,rate:.22,rx:.42,rz:.30},
  {id:'cat_mochi',x:3,z:-7,phase:1.6,rate:.25,rx:.42,rz:.30},
  {id:'dog_buddy',x:-5,z:-5,phase:2.8,rate:.26,rx:.48,rz:.34},
  {id:'cow_bessie',x:8,z:-2.2,phase:.5,rate:.18,rx:.52,rz:.36},
  {id:'horse_spirit',x:-6,z:-12,phase:2.1,rate:.24,rx:.56,rz:.36},
  {id:'bird_chirpy',x:5,z:-10,phase:4,rate:.42,rx:.34,rz:.24},
  {id:'giraffe_raffy',x:14,z:-14,phase:1.8,rate:.16,rx:.48,rz:.34}
 ]);
 const finite=value=>typeof value==='number'&&Number.isFinite(value);
 function modeAt(timeSeconds,timeMode='day'){
  if(timeMode==='auto'){
   const phase=(timeSeconds%180)/180;
   return phase<.55?'day':phase<.68?'sunset':'night';
  }
  return ['day','sunset','night'].includes(timeMode)?timeMode:'day';
 }
 const NAV_CELL_SCALE=2,NAV_NEIGHBOR_RADIUS=.23,NAV_NEIGHBOR_HEIGHT=2.16;
 const NAV_STEPS=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 const navigationCache=new WeakMap();
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
 function createNavigationState(world,revision){
  let cached=navigationCache.get(world);
  if(cached&&cached.revision===revision)return cached;
  const cells=new Set();
  for(const block of Array.isArray(world.blocks)?world.blocks:[]){
   if(!block||block.type==='flower'||block.type==='tall_grass'||block.type==='tile'||
      (block.type==='door'&&block.open)||block.y>=NAV_NEIGHBOR_HEIGHT||block.y+1<=0)continue;
   markNeighborObstacleRect(cells,block.x,block.z,1,1);
  }
  for(const cell of Array.isArray(world.excavations)?world.excavations:[]){
   if(cell&&cell.depth>0)markNeighborObstacleRect(cells,cell.x,cell.z,1,1);
  }
  // These three cottage wall rectangles are scenery in Canvas 2D, not world blocks.
  const houses=[[-13,-7],[10,-17],[16,-9]];
  for(const [x,z] of houses){
   markNeighborObstacleRect(cells,x,z,4.3,.18);
   markNeighborObstacleRect(cells,x,z+.18,.18,3.95);
   markNeighborObstacleRect(cells,x+4.12,z+.18,.18,3.95);
   markNeighborObstacleRect(cells,x,z+4.12,1.58,.18);
   markNeighborObstacleRect(cells,x+2.50,z+4.12,1.80,.18);
  }
  cached={revision,cells,pathCache:new Map(),routeCache:new WeakMap()};
  navigationCache.set(world,cached);
  return cached;
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
 function findNeighborPath(start,end,nav){
  const key=start.x.toFixed(2)+','+start.z.toFixed(2)+'>'+end.x.toFixed(2)+','+end.z.toFixed(2);
  const cached=nav.pathCache.get(key);if(cached)return cached;
  const cells=nav.cells;
  let sx=Math.round(start.x*NAV_CELL_SCALE),sz=Math.round(start.z*NAV_CELL_SCALE);
  let gx=Math.round(end.x*NAV_CELL_SCALE),gz=Math.round(end.z*NAV_CELL_SCALE);
  const worldLimit=1000000000,margin=24;
  const minX=Math.max(-worldLimit*NAV_CELL_SCALE,Math.min(sx,gx)-margin);
  const maxX=Math.min(worldLimit*NAV_CELL_SCALE,Math.max(sx,gx)+margin);
  const minZ=Math.max(-worldLimit*NAV_CELL_SCALE,Math.min(sz,gz)-margin);
  const maxZ=Math.min(worldLimit*NAV_CELL_SCALE,Math.max(sz,gz)+margin);
  const originalStartFree=!cells.has(navCellKey(sx,sz)),originalEndFree=!cells.has(navCellKey(gx,gz));
  const openStart=nearestOpenNeighborCell(sx,sz,cells,minX,maxX,minZ,maxZ);
  const openGoal=nearestOpenNeighborCell(gx,gz,cells,minX,maxX,minZ,maxZ);
  if(!openStart||!openGoal){
   const stuck=[{x:start.x,z:start.z}];nav.pathCache.set(key,stuck);return stuck;
  }
  sx=openStart.x;sz=openStart.z;gx=openGoal.x;gz=openGoal.z;
  const directSteps=Math.max(1,Math.ceil(Math.hypot(end.x-start.x,end.z-start.z)*4));
  let clear=true;
  for(let i=0;i<=directSteps;i++){
   const t=i/directSteps,ix=Math.round((start.x+(end.x-start.x)*t)*NAV_CELL_SCALE);
   const iz=Math.round((start.z+(end.z-start.z)*t)*NAV_CELL_SCALE);
   if(cells.has(navCellKey(ix,iz))){clear=false;break;}
  }
  if(clear&&originalStartFree&&originalEndFree){
   const direct=[{x:start.x,z:start.z},{x:end.x,z:end.z}];nav.pathCache.set(key,direct);return direct;
  }
  const width=maxZ-minZ+1,total=(maxX-minX+1)*width,indexOf=(x,z)=>(x-minX)*width+(z-minZ);
  const startIndex=indexOf(sx,sz),goalIndex=indexOf(gx,gz);
  const parent=new Int32Array(total);parent.fill(-1);
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
  if(!found){
   const stuck=[{x:originalStartFree?start.x:sx/NAV_CELL_SCALE,z:originalStartFree?start.z:sz/NAV_CELL_SCALE}];
   nav.pathCache.set(key,stuck);return stuck;
  }
  const reverse=[];let cursor=goalIndex;
  while(cursor!==-1){
   reverse.push({x:(Math.floor(cursor/width)+minX)/NAV_CELL_SCALE,z:(cursor%width+minZ)/NAV_CELL_SCALE});
   if(cursor===startIndex)break;cursor=parent[cursor];
  }
  reverse.reverse();
  const path=[],first=originalStartFree?{x:start.x,z:start.z}:reverse[0];path.push(first);
  for(const point of reverse){
   const last=path[path.length-1];
   if(Math.hypot(point.x-last.x,point.z-last.z)>.04)path.push(point);
  }
  const last=path[path.length-1],destination=originalEndFree?{x:end.x,z:end.z}:reverse[reverse.length-1];
  if(Math.hypot(destination.x-last.x,destination.z-last.z)>.04)path.push(destination);
  nav.pathCache.set(key,path);return path;
 }
 function neighborPathLength(path){
  let length=0;
  for(let i=1;i<path.length;i++)length+=Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z);
  return length;
 }
 function getNeighborRouteSegments(route,speed,nav){
  let cached=nav.routeCache.get(route);
  if(cached&&cached.speed===speed)return cached;
  const segments=route.map((point,index)=>{
   const next=route[(index+1)%route.length],path=findNeighborPath(point,next,nav),length=neighborPathLength(path);
   return {point,next,path,length,travel:Math.max(1.8,length/speed),pause:point.pause||1};
  });
  cached={speed,segments,cycle:segments.reduce((sum,segment)=>sum+segment.pause+segment.travel,0)};
  nav.routeCache.set(route,cached);return cached;
 }
 function routePosition(route,tick,phase,speed=1.05,nav=null){
  const {segments,cycle}=getNeighborRouteSegments(route,speed,nav||{cells:new Set(),pathCache:new Map(),routeCache:new WeakMap()});
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
 function actorContext(world={},timeSeconds=0,geometryRevision=0){
  if(!finite(timeSeconds))throw new TypeError('Protection time must be finite seconds.');
  const mode=modeAt(timeSeconds,world.timeMode),night=mode==='night';
  const neighbors=[];
  const nav=night?null:createNavigationState(world,geometryRevision);
  for(const actor of ROUTE_ACTORS){
   const pos=night?SLEEP_SPOTS[actor.id]:routePosition(actor.route,timeSeconds,actor.phase,actor.speed,nav);
   neighbors.push({id:actor.id,x:pos.x,z:pos.z});
  }
  const animals=RESIDENTS.map(a=>({
   id:a.id,
   x:a.x+Math.sin(timeSeconds*a.rate+a.phase)*a.rx,
   z:a.z+Math.cos(timeSeconds*(a.rate*.82)+a.phase)*a.rz
  }));
  const ids=new Set(animals.map(a=>a.id));
  for(const animal of Array.isArray(world.animals)?world.animals:[]){
   if(!animal||typeof animal.id!=='string'||ids.has(animal.id)||!finite(animal.x)||!finite(animal.z))continue;
   animals.push({id:animal.id,x:animal.x,z:animal.z});ids.add(animal.id);
  }
  return Object.freeze({
   timeSeconds,mode,night,
   neighbors:Object.freeze(neighbors.map(a=>Object.freeze({...a}))),
   animals:Object.freeze(animals.map(a=>Object.freeze({...a})))
  });
 }
 function characterStates(world={},timeSeconds=0,geometryRevision=0){
  if(!finite(timeSeconds))throw new TypeError('Character animation time must be finite seconds.');
  const mode=modeAt(timeSeconds,world.timeMode),night=mode==='night';
  const nav=night?null:createNavigationState(world,geometryRevision);
  return Object.freeze(ROUTE_ACTORS.map(actor=>{
   const pose=night
    ?{...SLEEP_SPOTS[actor.id],sleeping:true,moving:false,walk:0}
    :routePosition(actor.route,timeSeconds,actor.phase,actor.speed,nav);
   const {route,speed,pace,scale,...appearance}=actor;
   const familyMember=FAMILY.some(member=>member.id===actor.id);
   return Object.freeze({
    ...appearance,...pose,
    id:actor.id,name:actor.name,
    x:pose.x,z:pose.z,
    phase:actor.phase,
    ...(familyMember?{pace,speed,scale}:{}),
    activity:familyMember?undefined:pose.activity,
    ...(night?{sleeping:true}:{}),
    moving:night?false:!!pose.moving,
    walk:night?0:finite(pose.walk)?pose.walk:0,
    y:0
   });
  }));
 }
 function isProtectedCell(x,z,context={}){
  if(!finite(x)||!finite(z))throw new TypeError('Protection cell coordinates must be finite.');
  const cx=Math.floor(x)+.5,cz=Math.floor(z)+.5;
  for(const home of HOMES){
   if(cx>=home.x-.75&&cx<=home.x+5.05&&cz>=home.z-.75&&cz<=home.z+5.05)return true;
  }
  for(const neighbor of Array.isArray(context.neighbors)?context.neighbors:[]){
   if(neighbor&&finite(neighbor.x)&&finite(neighbor.z)&&Math.hypot(cx-neighbor.x,cz-neighbor.z)<1.05)return true;
  }
  for(const animal of Array.isArray(context.animals)?context.animals:[]){
   if(animal&&finite(animal.x)&&finite(animal.z)&&Math.hypot(cx-animal.x,cz-animal.z)<.7)return true;
  }
  return false;
 }
 return Object.freeze({HOMES,NEIGHBOR_ROUTES,FAMILY_ROUTES,FAMILY,ROUTE_ACTORS,modeAt,routePosition,actorContext,characterStates,isProtectedCell,createNavigationState,findNeighborPath,neighborPathLength});
});
