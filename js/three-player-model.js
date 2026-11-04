/* Lightweight character model matching the original DIYCraft preview proportions. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreePlayerModel=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function create(THREE,materials,player,shadows=false){
  if(!THREE||!materials||!player)throw new TypeError('Three.js, painterly materials and a player appearance are required.');
  const root=new THREE.Group(),body=[];
  const boxGeometry={
   leg:new THREE.BoxGeometry(.23,.62,.25),
   shoe:new THREE.BoxGeometry(.25,.18,.34),
   torso:new THREE.BoxGeometry(.62,.78,.34)
  };
  const sphereGeometry={
   neck:new THREE.SphereGeometry(.14,10,8),
   head:new THREE.SphereGeometry(.31,12,10),
   hair:new THREE.SphereGeometry(.33,12,8),
   eye:new THREE.SphereGeometry(.035,8,6),
   fringe:new THREE.SphereGeometry(.22,10,7)
  };
  const skin=materials.get(player.skin||'#efc39d','skin'),shirt=materials.get(player.shirt||'#d94b3d','cloth');
  const pants=materials.get(player.pants||'#397d8f','cloth'),shoes=materials.get(player.shoes||'#bd4540','cloth');
  const hair=materials.get(player.hair||'#493127','hair');
  const eyes=materials.get(player.eyes||'#302820','skin');
  function add(geometry,material,x,y,z,scale){
   const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);
   if(scale)mesh.scale.set(scale[0],scale[1],scale[2]);
   mesh.castShadow=!!shadows;mesh.receiveShadow=!!shadows;root.add(mesh);body.push(mesh);return mesh;
  }
  for(const x of [-.19,.19]){
   add(boxGeometry.leg,pants,x,.34,0);
   add(boxGeometry.shoe,shoes,x,.10,.055);
  }
  add(boxGeometry.torso,shirt,0,1.02,0);
  add(sphereGeometry.neck,skin,0,1.46,0);
  add(sphereGeometry.head,skin,0,1.76,.015);
  add(sphereGeometry.hair,hair,0,1.91,-.035,[1,.55,1.02]);
  for(const x of [-.11,.11])add(sphereGeometry.eye,eyes,x,1.78,.294);
  add(sphereGeometry.fringe,hair,0,1.9,.20,[1,.27,.42]);
  update(root,player);
  root.userData.bodyMeshes=body;
  root.userData.sharedGeometry=Object.values(boxGeometry).concat(Object.values(sphereGeometry));
  return root;
 }
 function update(root,player){
  if(!root||!player)throw new TypeError('A player model and pose are required.');
  root.position.set(player.x+.5,player.y,player.z+.5);
  root.rotation.y=player.yaw||0;
  return root;
 }
 return Object.freeze({create,update});
});
