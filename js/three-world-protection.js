/* Dynamic DIYCraft neighbor/animal digging protection.
   Home rectangles and proximity thresholds match Canvas 2D. Route positions are
   predicted along the authored waypoint legs; full obstacle-aware NPC path
   parity remains part of the later NPC-navigation increment. */
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
   {x:-5,z:-8,pause:2.8},{x:-7,z:-7,pause:2.0},{x:-10,z:-1.8,pause:2.7},{x:-10,z:-9.5,pause:2.5},{x:-6,z:-11,pause:2.4}
  ],
  theo:[
   {x:5,z:-11,pause:2.3},{x:8,z:-10,pause:2.0},{x:12,z:-12.1,pause:2.8},{x:9,z:-8.5,pause:2.2},{x:4,z:-7,pause:2.8}
  ]
 });
 const FAMILY_ROUTES=Object.freeze({
  dad:[{x:14,z:-4.8,pause:1.4},{x:14,z:-1.4,pause:2},{x:17,z:-.8,pause:1},{x:19.5,z:-2,pause:1.8},{x:17,z:-3.3,pause:1.1}],
  mom:[{x:22,z:-4.4,pause:2.4},{x:23.5,z:-1.8,pause:2.1},{x:20.8,z:-.5,pause:2.8},{x:19.8,z:-2.5,pause:2}],
  lia:[{x:15.2,z:-1.1,pause:1.4},{x:16.5,z:-.4,pause:1},{x:17.3,z:-1.7,pause:1.2},{x:16.2,z:-2.7,pause:1}],
  maya:[{x:19.2,z:-1.2,pause:1.1},{x:21.4,z:-.8,pause:1.5},{x:22.3,z:-2.2,pause:1},{x:20.4,z:-3.2,pause:1.3}],
  nico:[{x:13.2,z:-7.7,pause:.7},{x:13.6,z:-5.5,pause:.6},{x:14.8,z:-3.9,pause:.9},{x:13.7,z:-2.5,pause:.6},{x:12.8,z:-4.7,pause:.8}]
 });
 const SLEEP_SPOTS=Object.freeze({
  hyacinth:{x:-10.85,z:-4.85},theo:{x:12.15,z:-14.85},
  dad:{x:17,z:-7.9},mom:{x:19.1,z:-7.9},lia:{x:17,z:-6.2},maya:{x:19.1,z:-6.2},nico:{x:18.1,z:-8.35}
 });
 const FAMILY=Object.freeze([
  {id:'dad',route:FAMILY_ROUTES.dad,speed:1.12,phase:1.5},
  {id:'mom',route:FAMILY_ROUTES.mom,speed:.92,phase:8.2},
  {id:'lia',route:FAMILY_ROUTES.lia,speed:1.42,phase:3.4},
  {id:'maya',route:FAMILY_ROUTES.maya,speed:1.30,phase:12.7},
  {id:'nico',route:FAMILY_ROUTES.nico,speed:1.68,phase:5.9}
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
   const phase=((timeSeconds%180)+180)%180/180;
   return phase<.55?'day':phase<.68?'sunset':'night';
  }
  return ['day','sunset','night'].includes(timeMode)?timeMode:'day';
 }
 function routePosition(route,tick,phase,speed=1.05){
  const segments=route.map((point,index)=>{
   const next=route[(index+1)%route.length],length=Math.hypot(next.x-point.x,next.z-point.z);
   return {point,next,length,travel:Math.max(1.8,length/speed),pause:point.pause||1};
  });
  const cycle=segments.reduce((sum,item)=>sum+item.pause+item.travel,0);
  let time=((tick+phase)%cycle+cycle)%cycle;
  for(const segment of segments){
   if(time<segment.pause)return {x:segment.point.x,z:segment.point.z};
   time-=segment.pause;
   if(time<segment.travel&&segment.length>.001){
    const raw=Math.max(0,Math.min(1,time/segment.travel)),progress=raw*raw*(3-2*raw);
    return {
     x:segment.point.x+(segment.next.x-segment.point.x)*progress,
     z:segment.point.z+(segment.next.z-segment.point.z)*progress
    };
   }
   time-=segment.travel;
  }
  return {x:route[0].x,z:route[0].z};
 }
 function actorContext(world={},timeSeconds=0){
  if(!finite(timeSeconds))throw new TypeError('Protection time must be finite seconds.');
  const mode=modeAt(timeSeconds,world.timeMode),night=mode==='night';
  const neighbors=[];
  const neighborRoutes=[
   {id:'hyacinth',route:NEIGHBOR_ROUTES.hyacinth,phase:0,speed:1.05},
   {id:'theo',route:NEIGHBOR_ROUTES.theo,phase:11,speed:1.05},
   ...FAMILY
  ];
  for(const actor of neighborRoutes){
   const pos=night?SLEEP_SPOTS[actor.id]:routePosition(actor.route,timeSeconds,actor.phase,actor.speed);
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
 return Object.freeze({HOMES,modeAt,routePosition,actorContext,isProtectedCell});
});
