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
  const eyeSphere=new THREE.SphereGeometry(.035,8,6),eyeWhiteSphere=new THREE.SphereGeometry(.052,10,8),muzzleSphere=new THREE.SphereGeometry(.12,8,6);
  const sources=[sphere,headSphere,cylinder,neckCylinder,earCone,beakCone,fleeceSphere,spotSphere,eyeSphere,eyeWhiteSphere,muzzleSphere];
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
  const bodyShape=species==='bird'?[.55,.55,.62]:({
   sheep:[.48,.54,.58],cat:[.44,.55,.53],dog:[.50,.57,.58],
   cow:[.56,.58,.64],horse:[.54,.57,.69],giraffe:[.50,.62,.55]
  }[species]);
  if(species==='bird'){
   // The body stays in one static batch; the two wings are separate pivoted instance batches.
   add(sphere,body,0,.62,0,.55,.55,.62,0,0,0,'body');
   add(headSphere,body,0,.89,.52,.21,.19,.21,0,0,0,'head');
   const birdEyeFront=.52+.21*.905+.022;
   for(const x of [-.085,.085]){
    add(eyeWhiteSphere,'#fff8ed',x,.91,birdEyeFront,1,1,.42,0,0,0,'eye');
    add(eyeSphere,'#302820',x+(x<0?.006:-.006),.91,birdEyeFront+.021,.98,.98,.48,0,0,0,'eye');
    add(spotSphere,'#fff8e8',x-.010,.925,birdEyeFront+.036,.18,.18,.18,0,0,0,'eyeHighlight');
   }
   add(beakCone,'#e8ad56',0,.85,.76,.9,1,1,Math.PI/2,0,0,'beak');
   add(sphere,body,0,.57,-.52,.20,.12,.24,0,0,0,'tail');
   for(const x of [-.22,.22]){
    add(fleeceSphere,body,x,.36,.055,.55,.62,.55,0,0,0,'legSocket');
    add(cylinder,legColor,x,.15,.06,.72,.72,.72,0,0,0,'leg');
   }
  }else{
   // A compact body leaves room for the face and all four legs to read clearly.
   add(sphere,body,0,.62,0,bodyShape[0],bodyShape[1],bodyShape[2],0,0,0,'body');
   const giraffe=species==='giraffe',headY=giraffe?1.62:1.16,headZ=giraffe?.57:(species==='horse'?.79:.78);
   if(giraffe){
    add(neckCylinder,body,0,1.24,.28,.88,1,1,0,0,0,'neck');
    for(let i=0;i<5;i++)add(spotSphere,accent,(i%2)*.13-.065,1.00+i*.15,.43,.95,1.05,1,0,0,0,'neckSpot');
   }
   const headShape=species==='sheep'?[.36,.31,.34]:
    species==='cat'?[.29,.25,.28]:
    species==='dog'?[.33,.29,.32]:
    species==='cow'?[.34,.29,.33]:
    species==='horse'?[.32,.27,.30]:[.27,.235,.27];
   if(!giraffe)add(neckCylinder,body,0,headY-.18,headZ-.18,.88,species==='horse'?.92:.82,.88,Math.PI/5,0,0,'neck');
   add(headSphere,body,0,headY,headZ,headShape[0],headShape[1],headShape[2],0,0,0,'head');
   // Surface-mounted, layered eyes sit just proud of the curved head instead of being buried inside it.
   const eyeY=headY+.025,eyeOffset=headShape[0]*.43,eyeFrontZ=headZ+headShape[2]*.905+.022;
   for(const side of [-1,1]){
    const x=side*eyeOffset;
    add(eyeWhiteSphere,'#fff8ed',x,eyeY,eyeFrontZ,1,1,.42,0,0,0,'eye');
    add(eyeSphere,'#302820',x-side*.006,eyeY,eyeFrontZ+.021,.98,.98,.48,0,0,0,'eye');
    add(spotSphere,'#fff8e8',x-.010,eyeY+.014,eyeFrontZ+.036,.18,.18,.18,0,0,0,'eyeHighlight');
   }
   const muzzleY=headY-.085,muzzleFrontZ=headZ+headShape[2]*.96+.045;
   if(species==='dog'||species==='cow'){
    add(muzzleSphere,species==='cow'?'#e8c9bd':accent,0,muzzleY,muzzleFrontZ+.025,1.08,.78,.92,0,0,0,'muzzle');
    add(spotSphere,'#59443b',0,muzzleY+.008,muzzleFrontZ+.115,.58,.58,.46,0,0,0,'muzzle');
   }else if(species==='sheep'){
    add(muzzleSphere,'#e8c4ba',0,muzzleY,muzzleFrontZ,.72,.62,.58,0,0,0,'muzzle');
    add(spotSphere,'#70534b',0,muzzleY+.012,muzzleFrontZ+.055,.36,.36,.34,0,0,0,'muzzle');
   }else if(species==='horse'){
    add(muzzleSphere,'#a9785d',0,muzzleY,muzzleFrontZ+.015,.84,.66,.72,0,0,0,'muzzle');
    add(spotSphere,'#49352c',0,muzzleY+.012,muzzleFrontZ+.085,.42,.42,.32,0,0,0,'muzzle');
   }else{
    add(spotSphere,'#bf8793',0,muzzleY+.025,muzzleFrontZ+.025,.54,.52,.44,0,0,0,'muzzle');
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
    for(const [x,y,z] of [[-.24,.78,-.06],[.24,.78,-.06],[-.22,.73,.23],[.22,.73,.23],[0,.89,-.22],[0,.96,-.06]])
     add(fleeceSphere,'#faf7ed',x,y,z,.82,.88,.86,0,0,0,'wool');
    for(const x of [-.15,.15])add(earCone,'#d6b6aa',x,headY+.03,headZ-.04,.48,.34,.52,0,0,x*.7,'ear');
   }else{
    // Giraffe ossicones and small ears sit above the long neck.
    for(const x of [-.10,.10])add(earCone,accent,x,headY+.21,headZ-.025,.52,.85,.56,0,0,x*.7,'horn');
    for(let i=0;i<4;i++)add(spotSphere,accent,(i%2)*.11-.055,1.78+i*.035,.46,.9,1.1,1,0,0,0,'neckSpot');
   }
   // Hip sockets overlap both torso and upper leg; paws/hooves overlap the lower leg.
   const legX=species==='sheep'?.34:species==='cat'?.32:species==='dog'?.35:species==='cow'?.38:species==='horse'?.36:.33;
   const legZ=species==='sheep'?.36:species==='cat'?.31:species==='dog'?.35:species==='cow'?.40:species==='horse'?.43:.34;
   for(const x of [-legX,legX])for(const z of [-legZ,legZ]){
    add(fleeceSphere,body,x,.39,z,.72,.82,.72,0,0,0,'legSocket');
    add(cylinder,legColor,x,.18,z,.92,1.28,.92,0,0,0,'leg');
    if(species==='horse'||species==='cow')add(muzzleSphere,'#59463d',x,.012,z+.025,.52,.28,.60,0,0,0,'hoof');
    else add(muzzleSphere,legColor,x,.018,z+.025,.42,.28,.48,0,0,0,'paw');
   }
   add(sphere,body,0,.59,-.56,.10,.10,.18,0,0,0,'tail');
   if(species==='horse')add(fleeceSphere,'#4b372d',0,.58,-.68,.10,.30,.10,0,0,0,'tail');
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  geometry.userData={animalSpecies:species,animalBody:body,animalAccent:accent,animalFeatureBounds:featureBounds,animalBodyShape:species==='bird'?[.70,.50,.54]:bodyShape.slice(),animalHasWingRig:species==='bird'};
  sources.forEach(source=>source.dispose());
  return geometry;
 }
 function createBirdWingGeometry(THREE,options={}){
  if(!THREE||typeof THREE.BufferGeometry!=='function'||typeof THREE.Float32BufferAttribute!=='function')
   throw new TypeError('Three.js buffer geometry support is required for bird wings.');
  const side=options.side===-1?-1:options.side===1?1:0;
  if(!side)throw new TypeError('Bird wing side must be -1 or 1.');
  const body=validColor(options.body,DEFAULTS.bird),accent=validColor(options.accent,'#f3bd54');
  const positions=[],colors=[],uvs=[];
  function triangle(points,color){
   const rgb=new THREE.Color(color);
   for(let i=0;i<3;i++){
    positions.push(points[i][0],points[i][1],points[i][2]);
    colors.push(rgb.r,rgb.g,rgb.b);uvs.push(i===1?1:0,i===2?1:0);
   }
  }
  // Local origin is the shoulder pivot. The wing extends outwards and slightly backward.
  const root=[0,0,.16],inner=[side*.18,.025,.21],lead=[side*.48,.045,.12];
  const tip=[side*.72,.015,-.055],trailing=[side*.55,-.01,-.27],innerBack=[side*.15,-.012,-.20];
  const center=[side*.34,.065,-.015];
  triangle([root,inner,center],body);
  triangle([inner,lead,center],body);
  triangle([lead,tip,center],body);
  triangle([tip,trailing,center],body);
  triangle([trailing,innerBack,center],body);
  triangle([innerBack,root,center],body);
  for(let i=0;i<5;i++){
   const start=.17+i*.085,reach=.25+i*.095,back=-.16-i*.018;
   triangle([[side*start,-.004,back],[side*reach,.002,back-.105],[side*(reach+.055),-.008,back+.005]],i%2?accent:body);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  geometry.userData={animalWing:true,wingSide:side,wingSpan:.72,featherCount:5};
  return geometry;
 }
 return Object.freeze({create,createBirdWingGeometry,species:Object.freeze(Array.from(SPECIES)),defaults:Object.freeze({...DEFAULTS})});
});
