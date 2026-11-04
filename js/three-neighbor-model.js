/* Three.js models for the seven original roaming DIYCraft neighbors.
   Character appearance and motion state come from the isolated protection/route
   adapter. Geometry uses the shared watercolor + colored-pencil paper material. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreeNeighborModels=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function finite(value,fallback=0){return Number.isFinite(value)?value:fallback;}
 function shade(hex,factor){
  const value=parseInt(String(hex||'#808080').slice(1),16);
  const parts=[(value>>16)&255,(value>>8)&255,value&255].map(channel=>Math.max(0,Math.min(255,Math.round(channel*factor))));
  return '#'+parts.map(channel=>channel.toString(16).padStart(2,'0')).join('');
 }
 function geometryFromBoxes(THREE,boxes){
  const positions=[],normals=[],uvs=[],colors=[];
  const unit=new THREE.BoxGeometry(1,1,1);
  for(const box of boxes){
   const geometry=unit.clone();
   geometry.scale(box.w,box.h,box.d);
   geometry.translate(box.x,box.y,box.z);
   const flat=geometry.index?geometry.toNonIndexed():geometry;
   const p=flat.attributes.position.array,n=flat.attributes.normal.array,uv=flat.attributes.uv.array;
   const color=new THREE.Color(box.color);
   for(let i=0;i<p.length;i++)positions.push(p[i]);
   for(let i=0;i<n.length;i++)normals.push(n[i]);
   for(let i=0;i<uv.length;i++)uvs.push(uv[i]);
   for(let i=0;i<p.length/3;i++)colors.push(color.r,color.g,color.b);
   if(flat!==geometry)flat.dispose();
   geometry.dispose();
  }
  unit.dispose();
  const merged=new THREE.BufferGeometry();
  merged.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  merged.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  merged.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  merged.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  merged.computeBoundingSphere();
  return merged;
 }
 function create(THREE,materials,appearance,shadows=false){
  if(!THREE||!materials||!appearance||typeof appearance.id!=='string')
   throw new TypeError('Three.js, painterly materials and neighbor appearance data are required.');
  const root=new THREE.Group(),ownedGeometries=[];
  const surface=materials.get('#ffffff','paper');
  surface.vertexColors=true;surface.needsUpdate=true;
  const scale=Number.isFinite(appearance.scale)?appearance.scale:1;
  const shirt=appearance.shirt||'#d94b3d',hair=appearance.hair||'#493127';
  const skin=appearance.skin||'#efc39d',pants=appearance.pants||'#48617a';
  const shoes=appearance.shoes||'#665348',eyes=appearance.eyes||'#302820';
  const hairStyle=appearance.hairStyle||'short',outfit=appearance.outfitStyle||'hoodie';
  const accessory=appearance.accessory||'none',accent=appearance.accessoryColor||'#f4a8bb';
  const body=[];
  const add=(target,x,y,z,color,w,h,d)=>target.push({x,y,z,color,w,h,d});
  // Torso, clothes and neck.
  add(body,0,.78,0,shirt,.70,.82,.46);
  if(outfit==='hoodie'){
   add(body,0,1.13,-.25,hair,.44,.20,.08);
   add(body,0,.57,.245,shade(shirt,.78),.34,.17,.035);
   add(body,-.12,.58,.27,'#f2e5d4',.025,.07,.015);
   add(body,.12,.58,.27,'#f2e5d4',.025,.07,.015);
  }else if(outfit==='sweater'){
   add(body,0,.40,.02,shade(shirt,1.16),.58,.10,.035);
   add(body,-.25,.55,.24,shade(shirt,.82),.13,.12,.035);
   add(body,.25,.55,.24,shade(shirt,.82),.13,.12,.035);
  }else if(outfit==='overalls'){
   add(body,0,.76,.245,pants,.43,.57,.055);
   add(body,-.18,1.04,.245,pants,.105,.30,.055);
   add(body,.18,1.04,.245,pants,.105,.30,.055);
   add(body,0,.78,.282,'#f0dda7',.12,.10,.025);
  }else if(outfit==='dress'){
   add(body,0,.43,.015,pants||shirt,.86,.48,.54);
   add(body,0,.22,.025,shade(shirt,.90),.74,.08,.55);
  }else if(outfit==='tee'){
   add(body,-.22,.78,.245,shade(shirt,1.12),.12,.45,.035);
   add(body,.22,.78,.245,shade(shirt,1.12),.12,.45,.035);
  }
  // Neck, face, hair cap, front fringe and natural hairstyles.
  add(body,0,1.35,0,skin,.22,.20,.24);
  add(body,0,1.49,0,skin,.60,.62,.56);
  add(body,0,1.99,-.025,hair,.64,.18,.60);
  if(hairStyle==='bob'){
   add(body,-.30,1.25,-.015,hair,.16,.60,.48);
   add(body,.30,1.25,-.015,hair,.16,.60,.48);
  }else if(hairStyle==='long'){
   add(body,-.30,.98,-.035,hair,.15,.92,.42);
   add(body,.30,.98,-.035,hair,.15,.92,.42);
   add(body,0,1.02,-.285,hair,.52,.96,.12);
  }else if(hairStyle==='ponytail'){
   add(body,.27,1.58,-.32,hair,.24,.25,.24);
   add(body,.34,1.27,-.40,hair,.20,.42,.20);
  }else if(hairStyle==='pigtails'){
   add(body,-.39,1.47,-.04,hair,.22,.30,.25);
   add(body,.39,1.47,-.04,hair,.22,.30,.25);
   add(body,-.41,1.22,-.075,hair,.19,.30,.20);
   add(body,.41,1.22,-.075,hair,.19,.30,.20);
  }else if(hairStyle==='curly'){
   for(const [x,y,z] of [[-.27,1.96,-.08],[-.14,2.05,-.08],[0,2.08,-.08],[.14,2.05,-.08],[.27,1.96,-.08],[-.33,1.80,-.07],[.33,1.80,-.07]])
    add(body,x,y,z,hair,.20,.20,.20);
  }else if(hairStyle==='buns'){
   add(body,-.32,2.00,-.03,hair,.26,.25,.26);
   add(body,.32,2.00,-.03,hair,.26,.25,.26);
  }else{
   add(body,-.30,1.49,-.035,hair,.14,.34,.40);
   add(body,.30,1.49,-.035,hair,.14,.34,.40);
  }
  // Face details are attached to the front (+Z), so the head itself occludes them from behind.
  add(body,0,1.94,.3525,hair,.42,.13,.025);
  add(body,-.13,1.78,.3145,eyes,.065,.065,.025);
  add(body,.13,1.78,.3145,eyes,.065,.065,.025);
  add(body,0,1.66,.319,shade('#9a6c5c',.90),.10,.025,.02);
  if(accessory==='bow'){
   add(body,-.255,2.01,.04,accent,.19,.12,.12);
   add(body,-.085,2.01,.04,accent,.19,.12,.12);
   add(body,-.17,2.01,.11,'#f7e8d0',.065,.08,.06);
  }else if(accessory==='flower'){
   add(body,-.34,1.98,.055,accent,.15,.15,.12);
   add(body,-.34,1.84,.07,'#f6d36b',.07,.07,.06);
  }else if(accessory==='glasses'){
   add(body,-.13,1.78,.335,accent,.18,.11,.045);
   add(body,.13,1.78,.335,accent,.18,.11,.045);
   add(body,0,1.78,.355,accent,.07,.03,.025);
  }else if(accessory==='cap'){
   add(body,0,2.04,-.035,accent,.70,.13,.62);
   add(body,0,1.97,.20,accent,.73,.055,.23);
  }
  function meshFor(parts){
   const geometry=geometryFromBoxes(THREE,parts);ownedGeometries.push(geometry);
   const mesh=new THREE.Mesh(geometry,surface);
   mesh.castShadow=!!shadows;mesh.receiveShadow=!!shadows;root.add(mesh);
   return mesh;
  }
  const bodyMesh=meshFor(body);
  function limbGroup(x,y,z,parts){
   const pivot=new THREE.Group();pivot.position.set(x,y,z);root.add(pivot);
   const geometry=geometryFromBoxes(THREE,parts);ownedGeometries.push(geometry);
   const mesh=new THREE.Mesh(geometry,surface);
   mesh.castShadow=!!shadows;mesh.receiveShadow=!!shadows;pivot.add(mesh);
   return pivot;
  }
  const leftArm=limbGroup(-.44,.82,-.005,[
   {x:0,y:0,z:0,color:shirt,w:.22,h:.56,d:.28},
   {x:0,y:-.22,z:.03,color:skin,w:.20,h:.22,d:.22}
  ]);
  const rightArm=limbGroup(.44,.82,-.005,[
   {x:0,y:0,z:0,color:shirt,w:.22,h:.56,d:.28},
   {x:0,y:-.22,z:.03,color:skin,w:.20,h:.22,d:.22}
  ]);
  const leftLeg=limbGroup(-.18,.49,-.025,[
   {x:0,y:-.31,z:0,color:pants,w:.25,h:.62,d:.30},
   {x:0,y:-.465,z:.07,color:shoes,w:.32,h:.16,d:.39}
  ]);
  const rightLeg=limbGroup(.18,.49,-.025,[
   {x:0,y:-.31,z:0,color:pants,w:.25,h:.62,d:.30},
   {x:0,y:-.465,z:.07,color:shoes,w:.32,h:.16,d:.39}
  ]);
  root.scale.setScalar(scale);
  root.userData.neighborId=appearance.id;
  root.userData.bodyMesh=bodyMesh;
  root.userData.limbs={leftArm,rightArm,leftLeg,rightLeg};
  root.userData.sharedMaterial=surface;
  update(root,appearance,0);
  return Object.freeze({
   root,
   update:(pose,timeSeconds)=>update(root,pose,timeSeconds),
   dispose(){
    if(root.parent)root.parent.remove(root);
    for(const geometry of ownedGeometries)geometry.dispose();
   }
  });
 }
 function update(root,pose,timeSeconds=0){
  if(!root||!pose)throw new TypeError('A neighbor model and predicted pose are required.');
  const phase=finite(pose.phase),pace=finite(pose.pace,8),tick=finite(timeSeconds);
  const moving=!!pose.moving,walk=moving?Math.sin(tick*pace+phase):0;
  const bob=moving?Math.abs(Math.sin(tick*pace+phase))*.055:Math.sin(tick*1.7+phase)*.018;
  const legSwing=walk*.13;
  const leftLift=moving?Math.max(0,Math.cos(tick*pace+phase))*.045:0;
  const rightLift=moving?Math.max(0,-Math.cos(tick*pace+phase))*.045:0;
  const armSwing=-legSwing*.72;
  root.position.set(finite(pose.x)+.5,finite(pose.y)+bob,finite(pose.z)+.5);
  root.rotation.y=finite(pose.facing);
  root.visible=!pose.sleeping;
  const limbs=root.userData.limbs;
  limbs.leftArm.position.y=.82+bob;limbs.rightArm.position.y=.82+bob;
  limbs.leftArm.rotation.x=armSwing;limbs.rightArm.rotation.x=-armSwing;
  limbs.leftLeg.position.y=.49+leftLift;limbs.rightLeg.position.y=.49+rightLift;
  limbs.leftLeg.rotation.x=legSwing;limbs.rightLeg.rotation.x=-legSwing;
  return root;
 }
 return Object.freeze({create,update,geometryFromBoxes});
});
