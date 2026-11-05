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
 const RENDER_SCALE=.74;
 const HEX=/^#[0-9a-f]{6}$/i;
 const DEFAULTS={sheep:'#f0eee6',cat:'#c5c0b6',dog:'#c89b6d',cow:'#f2eee5',horse:'#8a6347',bird:'#e8c96d',giraffe:'#d9ad55'};
 const SPECIES=new Set(Object.keys(DEFAULTS));
 function validColor(value,fallback){return typeof value==='string'&&HEX.test(value)?value:fallback;}
 function quadrupedLayout(species){
  const layouts={
   sheep:{legX:.30,legZ:.36},cat:{legX:.28,legZ:.31},dog:{legX:.31,legZ:.35},
   cow:{legX:.35,legZ:.40},horse:{legX:.34,legZ:.43},giraffe:{legX:.30,legZ:.34}
  };
  return layouts[species]||null;
 }
 function shadeColor(hex,factor){
  const value=parseInt(String(hex).slice(1),16);
  const parts=[(value>>16)&255,(value>>8)&255,value&255].map(channel=>Math.max(0,Math.min(255,Math.round(channel*factor))));
  return '#'+parts.map(channel=>channel.toString(16).padStart(2,'0')).join('');
 }
 function applyQuadrupedLegPose(target,yaw,stride){
  if(!target||!target.rotation||typeof target.rotation.set!=='function'||
     !Number.isFinite(yaw)||!Number.isFinite(stride))
   throw new TypeError('A Three.js transform and finite animal gait angles are required.');
  // In YXZ, Euler X is the local fore/aft hip swing and Euler Y is the animal heading.
  // Keep stride on X and heading on Y; swapping these values makes feet sweep sideways.
  target.rotation.order='YXZ';
  target.rotation.set(stride,yaw,0);
  return target;
 }
 function createQuadrupedLegGeometry(THREE,options={}){
  const species=options.species,layout=quadrupedLayout(species);
  if(!THREE||!THREE.BufferGeometry||!THREE.Float32BufferAttribute||!THREE.Color||!layout)
   throw new TypeError('A supported ground-animal species and Three.js are required for a leg rig.');
  const legColor=species==='horse'?'#594337':'#775941';
  const footColor=species==='horse'||species==='cow'?'#59463d':legColor;
  const positions=[],colors=[],uvs=[];
  function vertex(point,color,uv){
   const c=new THREE.Color(color);
   positions.push(point[0],point[1],point[2]);colors.push(c.r,c.g,c.b);uvs.push(uv[0],uv[1]);
  }
  function triangle(a,b,c,color){
   vertex(a,color,[0,0]);vertex(b,color,[1,0]);vertex(c,color,[1,1]);
  }
  function box(cx,cy,cz,width,height,depth,color){
   const x0=cx-width/2,x1=cx+width/2,y0=cy-height/2,y1=cy+height/2,z0=cz-depth/2,z1=cz+depth/2;
   const faces=[
    [[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],
    [[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]],
    [[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1]],
    [[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]],
    [[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]],
    [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]]
   ];
   const shades=[1,.82,.93,.88,1.08,.72];
   faces.forEach((face,index)=>{
    const tone=shadeColor(color,shades[index]);
    triangle(face[0],face[1],face[2],tone);triangle(face[0],face[2],face[3],tone);
   });
  }
  box(0,-.175,0,.125,.34,.13,legColor);
  box(0,-.365,.045,.205,.11,.225,footColor);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  geometry.userData={animalLimb:'quadruped-leg',species,footKind:species==='horse'||species==='cow'?'hoof':'paw',legLayout:{...layout},pivotY:.41,groundY:-.42};
  return geometry;
 }
 function create(THREE,animal){
  if(!THREE||!animal||!SPECIES.has(animal.species))throw new TypeError('A supported animal and Three.js are required.');
  const species=animal.species,body=validColor(animal.body,DEFAULTS[species]),accent=validColor(animal.accent,'#d0b6a0');
  const positions=[],colors=[],uvs=[],featureBounds={};
  const sphere=new THREE.SphereGeometry(1,12,9),headSphere=new THREE.SphereGeometry(1,10,8);
  const cylinder=new THREE.CylinderGeometry(.055,.07,.42,6);
  const neckCylinder=new THREE.CylinderGeometry(.14,.19,.85,8);
  const earCone=new THREE.ConeGeometry(.10,.25,5),beakCone=new THREE.ConeGeometry(.09,.22,5);
  const fleeceSphere=new THREE.SphereGeometry(.16,8,6),spotSphere=new THREE.SphereGeometry(.055,7,6);
  const eyeSphere=new THREE.SphereGeometry(.042,10,8),eyeWhiteSphere=new THREE.SphereGeometry(.065,10,8),muzzleSphere=new THREE.SphereGeometry(.12,8,6);
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
  const bodyShape=species==='bird'?[.43,.40,.58]:({
   sheep:[.42,.52,.58],cat:[.39,.53,.53],dog:[.44,.55,.58],
   cow:[.50,.56,.64],horse:[.48,.55,.69],giraffe:[.44,.60,.55]
  }[species]);
  if(species==='bird'){
   // The body stays in one static batch; the two wings are separate pivoted instance batches.
   add(sphere,body,0,.62,0,.43,.40,.58,0,0,0,'body');
   add(headSphere,body,0,.89,.52,.23,.21,.23,0,0,0,'head');
   // One visible eye on each side/front surface keeps the bird expressive through turns in flight.
   for(const side of [-1,1]){
    const eyeYaw=side===1?-.42:-Math.PI+.42;
    const eyeX=side*.218,eyeZ=.618;
    add(eyeWhiteSphere,'#fff8ed',eyeX,.91,eyeZ,.48,1,.90,0,eyeYaw,0,'eye');
    add(eyeSphere,'#302820',side*.232,.91,.624,.98,1,.72,0,eyeYaw,0,'eye');
    add(spotSphere,'#fff8e8',side*.245,.925,.630,.18,.18,.18,0,eyeYaw,0,'eyeHighlight');
   }
   add(beakCone,'#e8ad56',0,.85,.78,1.05,1.2,1.1,Math.PI/2,0,0,'beak');
   for(const [x,y,angle] of [[-.12,.58,-.22],[0,.60,0],[.12,.58,.22]])
    add(beakCone,accent,x,y,-.60,.48,.72,.62,-Math.PI/2,0,angle,'tail');
   for(const x of [-.22,.22]){
    add(fleeceSphere,body,x,.36,.055,.55,.62,.55,0,0,0,'legSocket');
    add(cylinder,legColor,x,.15,.06,.72,.72,.72,0,0,0,'leg');
   }
  }else{
   // A compact body leaves room for the face and all four legs to read clearly.
   add(sphere,body,0,.62,0,bodyShape[0],bodyShape[1],bodyShape[2],0,0,0,'body');
   const giraffe=species==='giraffe',headY=giraffe?1.62:(species==='sheep'?1.32:1.27),headZ=giraffe?.57:(species==='horse'?.86:.88);
   if(giraffe){
    add(neckCylinder,body,0,1.24,.28,.88,1,1,0,0,0,'neck');
    for(let i=0;i<5;i++)add(spotSphere,accent,(i%2)*.13-.065,1.00+i*.15,.43,.95,1.05,1,0,0,0,'neckSpot');
   }
   const headShape=species==='sheep'?[.40,.34,.36]:
    species==='cat'?[.31,.27,.30]:
    species==='dog'?[.35,.30,.33]:
    species==='cow'?[.36,.31,.34]:
    species==='horse'?[.34,.29,.31]:[.29,.25,.29];
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
    // Upright triangular ears emerge clearly above the skull with a contrasting inner surface.
    for(const x of [-.205,.205]){
     add(earCone,body,x,headY+.245,headZ-.055,.92,1.34,.90,0,0,x*.62,'ear');
     add(earCone,'#c96f83',x,headY+.255,headZ+.02,.48,.90,.42,0,0,x*.62,'earInner');
    }
   }else if(species==='dog'){
    // Soft floppy ears extend beyond both cheeks rather than being buried in the head.
    for(const side of [-1,1]){
     const x=side*.33;
     add(fleeceSphere,accent,x,headY-.045,headZ-.015,.84,1.42,.62,0,0,side*.22,'ear');
     add(muzzleSphere,'#b96d7c',x+side*.025,headY-.055,headZ+.08,.54,.86,.24,0,0,side*.22,'earInner');
    }
   }else if(species==='cow'){
    for(const x of [-.17,.17])add(earCone,'#f0e7d9',x,headY+.30,headZ-.055,.76,.92,.70,0,0,x*.9,'horn');
    for(const side of [-1,1]){
     const x=side*.425;
     add(fleeceSphere,accent,x,headY+.075,headZ-.035,.92,.46,.62,0,0,side*.12,'ear');
     add(muzzleSphere,'#c97983',x+side*.045,headY+.078,headZ+.105,.54,.30,.22,0,0,side*.12,'earInner');
    }
    add(sphere,'#f0e7d9',0,headY+.055,headZ-.08,.19,.10,.12,0,0,0,'foreheadPatch');
   }else if(species==='horse'){
    for(const side of [-1,1]){
     const x=side*.15;
     add(earCone,body,x,headY+.255,headZ-.045,.72,1.28,.72,0,0,side*.28,'ear');
     add(earCone,'#c77b83',x,headY+.265,headZ+.02,.40,.84,.42,0,0,side*.28,'earInner');
    }
    for(let i=0;i<5;i++)add(fleeceSphere,'#4b372d',0,headY+.12-i*.09,headZ-.20-i*.015,.55,.52,.55,0,0,0,'mane');
   }else if(species==='sheep'){
    for(const [x,y,z] of [[-.24,.78,-.06],[.24,.78,-.06],[-.22,.73,.23],[.22,.73,.23],[0,.89,-.22],[0,.96,-.06]])
     add(fleeceSphere,'#faf7ed',x,y,z,.82,.88,.86,0,0,0,'wool');
    // Broad little ears poke out from the fleece on each side of the face.
    for(const side of [-1,1]){
     const x=side*.405;
     add(fleeceSphere,'#d5b5ad',x,headY+.055,headZ-.025,1.02,.50,.56,0,0,side*.10,'ear');
     add(muzzleSphere,'#c87583',side*.46,headY+.075,headZ+.10,.72,.40,.24,0,0,side*.10,'earInner');
    }
   }else{
    // Giraffe ossicones are distinct from the sideways ears.
    for(const x of [-.10,.10])add(earCone,accent,x,headY+.25,headZ-.025,.52,.90,.56,0,0,x*.7,'horn');
    for(const side of [-1,1]){
     const x=side*.325;
     add(fleeceSphere,accent,x,headY+.045,headZ-.025,.92,.44,.60,0,0,side*.12,'ear');
     add(muzzleSphere,'#b96f6f',x+side*.04,headY+.05,headZ+.08,.52,.28,.22,0,0,side*.12,'earInner');
    }
    for(let i=0;i<4;i++)add(spotSphere,accent,(i%2)*.11-.055,1.78+i*.035,.46,.9,1.1,1,0,0,0,'neckSpot');
   }
   // Hip sockets overlap both torso and upper leg; paws/hooves overlap the lower leg.
   const layout=quadrupedLayout(species);
   for(const x of [-layout.legX,layout.legX])for(const z of [-layout.legZ,layout.legZ])
    add(fleeceSphere,body,x,.39,z,.72,.82,.72,0,0,0,'legSocket');
   add(sphere,body,0,.59,-.56,.10,.10,.18,0,0,0,'tail');
   if(species==='horse')add(fleeceSphere,'#4b372d',0,.58,-.68,.10,.30,.10,0,0,0,'tail');
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  geometry.userData={animalSpecies:species,animalRenderScale:RENDER_SCALE,animalBody:body,animalAccent:accent,animalFeatureBounds:featureBounds,animalBodyShape:species==='bird'?[.43,.40,.58]:bodyShape.slice(),animalHasWingRig:species==='bird',animalLegLayout:quadrupedLayout(species)};
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
 return Object.freeze({create,createBirdWingGeometry,createQuadrupedLegGeometry,applyQuadrupedLegPose,quadrupedLayout,renderScale:RENDER_SCALE,species:Object.freeze(Array.from(SPECIES)),defaults:Object.freeze({...DEFAULTS})});
});
