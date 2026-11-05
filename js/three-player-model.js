/* One-draw-call player avatar with the original DIYCraft appearance fields.
   The body is a single vertex-colored BufferGeometry using the cached
   watercolor/paper material. Geometry is rebuilt only when appearance changes. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreePlayerModel=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const HAIR_STYLES=new Set(['short','bob','long','ponytail','pigtails','curly','buns']);
 const OUTFIT_STYLES=new Set(['hoodie','sweater','overalls','dress','tee']);
 const ACCESSORIES=new Set(['none','bow','flower','glasses','cap']);
 function shade(hex,factor){
  const value=parseInt(String(hex||'#808080').slice(1),16);
  const parts=[(value>>16)&255,(value>>8)&255,value&255]
   .map(channel=>Math.max(0,Math.min(255,Math.round(channel*factor))));
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
 function create(THREE,materials,player,shadows=false){
  if(!THREE||!materials||!player)throw new TypeError('Three.js, painterly materials and a player appearance are required.');
  const root=new THREE.Group(),boxes=[];
  const skin=player.skin||'#efc39d',shirt=player.shirt||'#d94b3d';
  const pants=player.pants||'#397d8f',shoes=player.shoes||'#bd4540';
  const hair=player.hair||'#493127',eyes=player.eyes||'#302820';
  const accent=player.accessoryColor||'#f4a8bb';
  const hairStyle=HAIR_STYLES.has(player.hairStyle)?player.hairStyle:'short';
  const outfit=OUTFIT_STYLES.has(player.outfitStyle)?player.outfitStyle:'hoodie';
  const accessory=ACCESSORIES.has(player.accessory)?player.accessory:'none';
  const add=(x,y,z,color,w,h,d)=>boxes.push({x,y,z,color,w,h,d});
  // Shoes, legs, torso and arms.
  for(const x of [-.19,.19]){
   add(x,.10,.055,shoes,.28,.18,.36);
   add(x,.34,0,pants,.23,.62,.25);
  }
  add(0,1.02,0,shirt,.62,.78,.36);
  add(-.39,1.03,0,shirt,.20,.58,.28);
  add(.39,1.03,0,shirt,.20,.58,.28);
  add(-.39,.69,.035,skin,.17,.20,.20);
  add(.39,.69,.035,skin,.17,.20,.20);
  // Original outfit styles and their characteristic details.
  if(outfit==='hoodie'){
   add(0,1.31,-.22,shade(hair,.82),.42,.24,.12);
   add(0,.72,.194,shade(shirt,.78),.32,.20,.035);
   add(-.075,.72,.218,'#f2e5d4',.022,.085,.012);
   add(.075,.72,.218,'#f2e5d4',.022,.085,.012);
  }else if(outfit==='sweater'){
   add(0,.63,.19,shade(shirt,1.15),.58,.10,.035);
   add(-.39,.78,.16,shade(shirt,.82),.22,.14,.035);
   add(.39,.78,.16,shade(shirt,.82),.22,.14,.035);
  }else if(outfit==='overalls'){
   add(0,.80,.202,pants,.43,.59,.055);
   add(-.17,1.10,.21,pants,.105,.31,.055);
   add(.17,1.10,.21,pants,.105,.31,.055);
   add(0,.80,.238,'#f0dda7',.12,.10,.018);
   add(-.17,1.18,.244,'#f0dda7',.045,.045,.018);
   add(.17,1.18,.244,'#f0dda7',.045,.045,.018);
  }else if(outfit==='dress'){
   add(0,.48,.012,pants||shirt,.84,.47,.47);
   add(0,.235,.025,shade(shirt,.90),.73,.075,.49);
  }else if(outfit==='tee'){
   add(-.39,1.10,.15,shade(shirt,1.12),.205,.34,.30);
   add(.39,1.10,.15,shade(shirt,1.12),.205,.34,.30);
  }
  // Neck, face and hair base.
  add(0,1.46,0,skin,.22,.20,.24);
  add(0,1.76,.015,skin,.60,.62,.56);
  add(0,1.91,-.035,hair,.66,.30,.62);
  // Back / side lengths for each original saved hairstyle.
  if(hairStyle==='bob'){
   add(-.30,1.43,-.015,hair,.16,.60,.48);
   add(.30,1.43,-.015,hair,.16,.60,.48);
  }else if(hairStyle==='long'){
   add(-.30,1.04,-.035,hair,.15,.92,.42);
   add(.30,1.04,-.035,hair,.15,.92,.42);
   add(0,1.08,-.285,hair,.52,.96,.12);
  }else if(hairStyle==='ponytail'){
   add(.27,1.58,-.32,hair,.24,.25,.24);
   add(.34,1.27,-.40,hair,.20,.42,.20);
  }else if(hairStyle==='pigtails'){
   add(-.39,1.47,-.04,hair,.22,.30,.25);
   add(.39,1.47,-.04,hair,.22,.30,.25);
   add(-.41,1.22,-.075,hair,.19,.30,.20);
   add(.41,1.22,-.075,hair,.19,.30,.20);
  }else if(hairStyle==='curly'){
   for(const [x,y,z] of [[-.27,1.96,-.08],[-.14,2.05,-.08],[0,2.08,-.08],[.14,2.05,-.08],[.27,1.96,-.08],[-.33,1.80,-.07],[.33,1.80,-.07]])
    add(x,y,z,hair,.20,.20,.20);
  }else if(hairStyle==='buns'){
   add(-.32,2.00,-.03,hair,.26,.25,.26);
   add(.32,2.00,-.03,hair,.26,.25,.26);
  }else{
   add(-.30,1.49,-.035,hair,.14,.34,.40);
   add(.30,1.49,-.035,hair,.14,.34,.40);
  }
  // Fringe and face details sit on the front (+Z).
  add(0,1.94,.3525,hair,.42,.13,.025);
  add(-.13,1.78,.3145,eyes,.065,.065,.025);
  add(.13,1.78,.3145,eyes,.065,.065,.025);
  add(0,1.66,.319,shade('#9a6c5c',.90),.10,.025,.02);
  // Original accessory choices.
  if(accessory==='bow'){
   add(-.255,2.01,.04,accent,.19,.12,.12);
   add(-.085,2.01,.04,accent,.19,.12,.12);
   add(-.17,2.01,.11,'#f7e8d0',.065,.08,.06);
  }else if(accessory==='flower'){
   add(-.34,1.98,.055,accent,.15,.15,.12);
   add(-.34,1.84,.07,'#f6d36b',.07,.07,.06);
  }else if(accessory==='glasses'){
   add(-.13,1.78,.335,accent,.18,.11,.045);
   add(.13,1.78,.335,accent,.18,.11,.045);
   add(0,1.78,.355,accent,.07,.03,.025);
  }else if(accessory==='cap'){
   add(0,2.04,-.035,accent,.70,.13,.62);
   add(0,1.97,.20,accent,.73,.055,.23);
  }
  const geometry=geometryFromBoxes(THREE,boxes);
  const surface=materials.get('#ffffff','paper');
  surface.vertexColors=true;surface.needsUpdate=true;
  const mesh=new THREE.Mesh(geometry,surface);
  mesh.castShadow=!!shadows;mesh.receiveShadow=!!shadows;root.add(mesh);
  root.userData.playerMesh=mesh;
  root.userData.playerGeometry=geometry;
  root.userData.sharedMaterial=surface;
  root.userData.appearance={hairStyle,outfitStyle:outfit,accessory,hair,skin,shirt,pants,shoes,eyes,accessoryColor:accent};
  update(root,player);
  return root;
 }
 function update(root,player){
  if(!root||!player)throw new TypeError('A player model and pose are required.');
  root.position.set(player.x+.5,player.y,player.z+.5);
  root.rotation.y=player.yaw||0;
  return root;
 }
 function dispose(root){
  if(!root)return false;
  if(root.parent)root.parent.remove(root);
  const geometry=root.userData&&root.userData.playerGeometry;
  if(geometry&&typeof geometry.dispose==='function')geometry.dispose();
  return true;
 }
 return Object.freeze({create,update,dispose,geometryFromBoxes});
});
