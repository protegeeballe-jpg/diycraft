/* Builds recognizable, low-poly animals as one vertex-coloured mesh.
   Faces, legs and species details are deliberately separated from the body
   silhouette so they remain visible at low-end mobile camera distances. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreeAnimalGeometry=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const HEX=/^#[0-9a-f]{6}$/i;
 const DEFAULTS={sheep:'#f0eee6',cat:'#c5c0b6',dog:'#c89b6d',cow:'#f2eee5',horse:'#8a6347',bird:'#e8c96d',giraffe:'#d9ad55'};
 const SPECIES=new Set(Object.keys(DEFAULTS));
 function validColor(value,fallback){return typeof value==='string'&&HEX.test(value)?value:fallback;}
 function create(THREE,animal){
  if(!THREE||!animal||!SPECIES.has(animal.species))throw new TypeError('A supported animal and Three.js are required.');
  const species=animal.species,body=validColor(animal.body,DEFAULTS[species]),accent=validColor(animal.accent,'#d0b6a0');
  const positions=[],colors=[],uvs=[],featureBounds={};
  const sphere=new THREE.SphereGeometry(1,12,9),headSphere=new THREE.SphereGeometry(1,10,8);
  const cylinder=new THREE.CylinderGeometry(.055,.07,.42,6);
  const neckCylinder=new THREE.CylinderGeometry(.14,.19,.85,8);
  const earCone=new THREE.ConeGeometry(.10,.25,5),beakCone=new THREE.ConeGeometry(.09,.22,5);
  const fleeceSphere=new THREE.SphereGeometry(.16,8,6),spotSphere=new THREE.SphereGeometry(.055,7,6);
  const eyeSphere=new THREE.SphereGeometry(.035,8,6),muzzleSphere=new THREE.SphereGeometry(.12,8,6);
  const sources=[sphere,headSphere,cylinder,neckCylinder,earCone,beakCone,fleeceSphere,spotSphere,eyeSphere,muzzleSphere];
  function add(geometry,color,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,feature=''){
   const position=geometry.attributes.position,uv=geometry.attributes.uv;
   const object=new THREE.Object3D();
   object.position.set(x,y,z);object.rotation.set(rx,ry,rz);object.scale.set(sx,sy,sz);object.updateMatrix();
   const normalMatrix=new THREE.Matrix3().getNormalMatrix(object.matrix);
   const rgb=new THREE.Color(color),indices=geometry.index?geometry.index.array:null,count=indices?indices.length:position.count;
   let bounds=feature?featureBounds[feature]:null;
   if(feature&&!bounds)bounds=featureBounds[feature]={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
   for(let i=0;i<count;i+=3){
    for(let j=0;j<3;j++){
     const sourceIndex=indices?indices[i+j]:i+j;
     const v=new THREE.Vector3().fromBufferAttribute(position,sourceIndex).applyMatrix4(object.matrix);
     positions.push(v.x,v.y,v.z);colors.push(rgb.r,rgb.g,rgb.b);
     if(uv)uvs.push(uv.getX(sourceIndex),uv.getY(sourceIndex));else uvs.push(0,0);
     if(bounds){
      bounds.min[0]=Math.min(bounds.min[0],v.x);bounds.min[1]=Math.min(bounds.min[1],v.y);bounds.min[2]=Math.min(bounds.min[2],v.z);
      bounds.max[0]=Math.max(bounds.max[0],v.x);bounds.max[1]=Math.max(bounds.max[1],v.y);bounds.max[2]=Math.max(bounds.max[2],v.z);
     }
    }
   }
  }
  const legColor=species==='bird'?'#bd8650':species==='horse'?'#594337':'#775941';
  if(species==='bird'){
   add(sphere,body,0,.58,0,.76,.48,.58,0,0,0,'body');
   add(sphere,body,-.49,.62,-.01,.30,.16,.40,0,0,-.16,'wing');
   add(sphere,body,.49,.62,-.01,.30,.16,.40,0,0,.16,'wing');
   add(headSphere,body,0,.89,.52,.21,.19,.21,0,0,0,'head');
   add(beakCone,'#e8ad56',0,.85,.73,.9,1,1,Math.PI/2,0,0,'beak');
   for(const x of [-.085,.085]){
    add(eyeSphere,'#302820',x,.91,.695,.78,.92,.7,0,0,0,'eye');
    add(spotSphere,'#fff8e8',x-.008,.922,.719,.25,.25,.25,0,0,0,'eyeHighlight');
   }
   add(sphere,body,0,.57,-.52,.20,.12,.24,0,0,0,'tail');
   for(const x of [-.22,.22])add(cylinder,legColor,x,.15,.06,.72,.72,.72,0,0,0,'leg');
  }else{
   // A compact body leaves room for the face and all four legs to read clearly.
   add(sphere,body,0,.62,0,.95,.55,.65,0,0,0,'body');
   const giraffe=species==='giraffe',headY=giraffe?1.62:.83,headZ=giraffe?.57:.61;
   if(giraffe){
    add(neckCylinder,body,0,1.24,.28,.88,1,1,0,0,0,'neck');
    for(let i=0;i<5;i++)add(spotSphere,accent,(i%2)*.13-.065,1.00+i*.15,.43,.95,1.05,1,0,0,0,'neckSpot');
   }
   add(headSphere,body,0,headY,headZ,species==='cow'?.25:.235,.215,.24,0,0,0,'head');
   const eyeY=headY+.015,eyeZ=headZ+.19;
   for(const x of [-.098,.098]){
    add(eyeSphere,'#302820',x,eyeY,eyeZ,.95,1,1,0,0,0,'eye');
    add(spotSphere,'#fff8e8',x-.008,eyeY+.012,eyeZ+.021,.23,.23,.23,0,0,0,'eyeHighlight');
   }
   if(species==='dog'||species==='cow'){
    add(muzzleSphere,species==='cow'?'#e8c9bd':accent,0,headY-.075,headZ+.205,1.05,.72,.92,0,0,0,'muzzle');
    add(spotSphere,'#59443b',0,headY-.065,headZ+.298,.70,.70,.58,0,0,0,'nose');
   }else{
    add(spotSphere,species==='cat'?'#a77980':'#59443b',0,headY-.045,headZ+.222,.65,.62,.65,0,0,0,'nose');
   }
   if(species==='cat'){
    for(const x of [-.16,.16])add(earCone,accent,x,headY+.19,headZ-.015,.78,1,.82,0,0,x*.8,'ear');
   }else if(species==='dog'){
    for(const x of [-.19,.19])add(fleeceSphere,accent,x,headY+.035,headZ-.015,.72,1.10,.48,0,0,x*.7,'ear');
   }else if(species==='cow'){
    for(const x of [-.17,.17])add(earCone,'#f0e7d9',x,headY+.12,headZ-.055,.88,.52,1,0,0,x*.9,'horn');
    for(const x of [-.29,.29])add(earCone,accent,x,headY+.08,headZ-.015,.94,.60,.90,0,0,x*.75,'ear');
    add(sphere,'#f0e7d9',0,headY+.055,headZ-.08,.19,.10,.12,0,0,0,'foreheadPatch');
   }else if(species==='horse'){
    for(const x of [-.11,.11])add(earCone,body,x,headY+.21,headZ-.015,.62,1,.64,0,0,x*.6,'ear');
    for(let i=0;i<5;i++)add(fleeceSphere,'#4b372d',0,headY+.12-i*.09,headZ-.20-i*.015,.55,.52,.55,0,0,0,'mane');
   }else if(species==='sheep'){
    for(const [x,y,z] of [[-.31,.78,-.08],[.31,.78,-.08],[-.28,.73,.31],[.28,.73,.31],[0,.91,-.35],[0,1.00,-.12]])
     add(fleeceSphere,'#faf7ed',x,y,z,.95,.92,.96,0,0,0,'wool');
    for(const x of [-.15,.15])add(earCone,'#d6b6aa',x,headY+.03,headZ-.04,.48,.34,.52,0,0,x*.7,'ear');
   }else{
    // Giraffe ossicones and small ears sit above the long neck.
    for(const x of [-.10,.10])add(earCone,accent,x,headY+.21,headZ-.025,.52,.85,.56,0,0,x*.7,'horn');
    for(let i=0;i<4;i++)add(spotSphere,accent,(i%2)*.11-.055,1.78+i*.035,.46,.9,1.1,1,0,0,0,'neckSpot');
   }
   for(const x of [-.34,.34])for(const z of [-.30,.30]){
    add(cylinder,legColor,x,.18,z,1,1.16,1,0,0,0,'leg');
    if(species==='horse'||species==='cow')add(muzzleSphere,'#59463d',x,.012,z,.52,.28,.60,0,0,0,'hoof');
   }
   add(sphere,body,0,.59,-.56,.10,.10,.18,0,0,0,'tail');
   if(species==='horse')add(fleeceSphere,'#4b372d',0,.58,-.68,.10,.30,.10,0,0,0,'tail');
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  geometry.userData={animalSpecies:species,animalBody:body,animalAccent:accent,animalFeatureBounds:featureBounds};
  sources.forEach(source=>source.dispose());
  return geometry;
 }
 return Object.freeze({create,species:Object.freeze(Array.from(SPECIES)),defaults:Object.freeze({...DEFAULTS})});
});
