// Carvalho maduro procedural — geometria real 3D, sem sprites, modelos GLTF ou texturas externas.
// Tronco com sulcos, raízes aparentes, ramificação hierárquica e folhas lobadas instanciadas.
// Determinístico para permitir reproduzir/exportar a mesma árvore com um pequeno JSON.
export const OAK_STORAGE_KEY='aethelgard-realistic-oak-v1';
export const OAK_DEFAULTS=Object.freeze({
 version:1,seed:1807,height:12,spread:17,trunkRadius:.80,
 mainBranches:12,leafDensity:1,leafSize:.31,
 leafColor:'#537d40',barkColor:'#705847',season:'summer'
});
const limits={seed:[1,1000000],height:[7,22],spread:[7,30],trunkRadius:[.3,2],
 mainBranches:[6,19],leafDensity:[.15,2.3],leafSize:[.15,.55]};
export function oakOptions(raw={}){
 const a={...OAK_DEFAULTS};
 if(!raw||typeof raw!=='object')return a;
 for(const [key,[low,high]] of Object.entries(limits)){
  const value=Number(raw[key]);if(Number.isFinite(value))a[key]=Math.max(low,Math.min(high,value));
 }
 a.seed=Math.round(a.seed);a.mainBranches=Math.round(a.mainBranches);
 for(const key of ['leafColor','barkColor'])
  if(typeof raw[key]==='string'&&/^#[0-9a-fA-F]{6}$/.test(raw[key]))a[key]=raw[key];
 if(['spring','summer','autumn'].includes(raw.season))a.season=raw.season;
 return a;
}
export function oakSerialized(input){return JSON.stringify({format:'aethelgard-realistic-oak',version:1,oak:oakOptions(input)},null,2)}
export function oakImport(json){
 const x=typeof json==='string'?JSON.parse(json):json;
 if(!x||x.format!=='aethelgard-realistic-oak'||x.version!==1||!x.oak||typeof x.oak!=='object')throw Error('Arquivo não é um carvalho Aethelgard v1');
 return oakOptions(x.oak);
}
export function getOakOptions(){
 try{const raw=localStorage.getItem(OAK_STORAGE_KEY);return raw?oakImport(JSON.parse(raw)):oakOptions()}
 catch{return oakOptions()}
}
export function saveOakOptions(options){
 const safe=oakOptions(options);
 localStorage.setItem(OAK_STORAGE_KEY,oakSerialized(safe));
 return safe;
}
function random(seed){let s=seed>>>0;return()=>{s+=0x6d2b79f5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
const curve=(a,b,c,d,t)=>{const u=1-t;return u*u*u*a+3*u*u*t*b+3*u*t*t*c+t*t*t*d};
const lerp=(a,b,t)=>a+(b-a)*t;
function pathPoint(THREE,arr,t){
 const q=Math.min(arr.length-2,Math.floor(t*(arr.length-1))),f=t*(arr.length-1)-q;
 return new THREE.Vector3().lerpVectors(arr[q],arr[q+1],Math.max(0,Math.min(1,f)));
}
function branchPath(THREE,start,direction,length,lift,bend,rand,steps){
 const dir=direction.clone().normalize(),side=new THREE.Vector3(-dir.z,0,dir.x);
 const out=[];let offset=(rand()-.5)*2;
 for(let i=0;i<=steps;i++){
  const t=i/steps;
  const lateral=(Math.sin(t*Math.PI*1.6+offset)*.11 + Math.sin(t*8.4+offset)*.06)*bend*t;
  const spread=length*t*(1+.028*Math.sin(t*7.1+offset));
  const p=start.clone().addScaledVector(dir,spread).addScaledVector(side,lateral);
  p.y+=lift*(t*t*(3-2*t))+.24*Math.sin(t*4.4+offset)*t;
  out.push(p);
 }
 return out;
}
function leafGeometry(THREE){
 // Contorno lobado inspirado numa folha de carvalho: ponta, incisões e borda recortada.
 const contour=[
 [0,.64],[.13,.52],[.11,.43],[.32,.43],[.34,.32],[.20,.23],[.37,.16],[.38,.01],
 [.17,-.03],[.33,-.17],[.29,-.31],[.11,-.35],[.14,-.46],[0,-.56],
 [-.14,-.46],[-.11,-.35],[-.29,-.31],[-.33,-.17],[-.17,-.03],[-.38,.01],
 [-.37,.16],[-.20,.23],[-.34,.32],[-.32,.43],[-.11,.43],[-.13,.52]
 ];
 const vertices=[0,0,.07],indices=[];
 contour.forEach(([x,y])=>vertices.push(x,y,.10*(1-Math.abs(x))*(.8-Math.abs(y))));
 for(let i=0;i<contour.length;i++)indices.push(0,i+1,(i+1)%contour.length+1);
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geo.setIndex(indices);geo.computeVertexNormals();
 return geo;
}
function makeTube(THREE,points,baseRadius,tipRadius,randomizer,bark,rough=true,radial=8){
 if(points.length<2)return null;
 const positions=[],colors=[],normals=[],indices=[],shade=new THREE.Color(bark),up=new THREE.Vector3(0,1,0);
 for(let i=0;i<points.length;i++){
  const t=i/(points.length-1);
  const tangent=points[Math.min(i+1,points.length-1)].clone().sub(points[Math.max(0,i-1)]).normalize();
  const n=new THREE.Vector3(0,0,1);
  if(Math.abs(tangent.dot(n))>.94)n.copy(up);
  n.addScaledVector(tangent,-n.dot(tangent)).normalize();
  const b=new THREE.Vector3().crossVectors(tangent,n).normalize();
  const r=lerp(baseRadius,tipRadius,Math.pow(t,.85))*(1-.06*t);
  for(let j=0;j<=radial;j++){
   const a=j/radial*Math.PI*2;
   const grooves=rough?(1+.05*Math.sin(a*11+Math.sin(t*14)*.8)+.025*Math.sin(a*21-t*9)):1;
   const p=points[i].clone().addScaledVector(n,Math.cos(a)*r*grooves).addScaledVector(b,Math.sin(a)*r*grooves);
   positions.push(p.x,p.y,p.z);
   const k=1+(rough?.10*Math.sin(a*13+t*4)+.05*Math.sin(a*23-t*11):0);
   const variation=(.91+.11*Math.sin(t*13+a*5))*k;
   colors.push(Math.max(0,shade.r*variation),Math.max(0,shade.g*variation),Math.max(0,shade.b*variation));
  }
 }
 for(let i=0;i<points.length-1;i++)for(let j=0;j<radial;j++){
  const x=i*(radial+1)+j,z=x+radial+1;
  indices.push(x,x+1,z,z,x+1,z+1);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 g.setIndex(indices);g.computeVertexNormals();return g;
}
function combineGeometries(THREE,geometries){
 // A geometria dos centenas de galhos vira um único mesh/uma draw call.
 let vertexN=0,indexN=0;
 for(const g of geometries){vertexN+=g.attributes.position.count;indexN+=g.index.count}
 const p=new Float32Array(vertexN*3),color=new Float32Array(vertexN*3),ids=new Uint32Array(indexN);
 let vertexBase=0,indexBase=0;
 for(const g of geometries){
  p.set(g.attributes.position.array,vertexBase*3);
  color.set(g.attributes.color.array,vertexBase*3);
  const original=g.index.array;for(let j=0;j<original.length;j++)ids[indexBase+j]=original[j]+vertexBase;
  vertexBase+=g.attributes.position.count;indexBase+=original.length;g.dispose();
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(p,3));
 geometry.setAttribute('color',new THREE.BufferAttribute(color,3));
 geometry.setIndex(new THREE.BufferAttribute(ids,1));geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}
export function estimateOak(options={},quality='hero'){
 const c=oakOptions(options),q=quality==='world'?.40:quality==='draft'?.40:1;
 return {height:c.height,spread:c.spread,mainBranches:c.mainBranches,
  leafBudget:Math.min(20000,Math.round((quality==='world'?1500:quality==='draft'?2300:11500)*c.leafDensity)),
  detail:q};
}
export function createRealisticOak(THREE,settings={},quality='hero'){
 const cfg=oakOptions(settings),R=random(cfg.seed),scale=cfg.height/12,
 trunkH=cfg.height*.66,base=cfg.trunkRadius,spread=cfg.spread*.5,level=quality==='hero'?1:.48,
 segments=quality==='hero'?14:8,radial=quality==='hero'?10:6;
 const group=new THREE.Group();
 group.name='Carvalho realista · Aethelgard';
 const wood=[],anchors=[],twigStarts=[],white=new THREE.Color(cfg.leafColor);
 const bark=cfg.barkColor;
 const T=(x,y,z)=>new THREE.Vector3(x,y,z);
 function tube(path,r1,r2){wood.push(makeTube(THREE,path,Math.max(.012,r1),Math.max(.009,r2),R,bark,true,radial))}
 function limb(path,r1,r2,levelNumber=0){
  tube(path,r1,r2);
  if(levelNumber>=2){anchors.push(path[path.length-1].clone());return}
  const count=levelNumber===0?4:3;
  for(let n=0;n<count;n++){
   const t=(levelNumber===0?.32:.46)+(n+R()*.6)*(levelNumber===0?.13:.14);
   const start=pathPoint(THREE,path,Math.min(.93,t));
   const outward=start.clone().sub(T(0,start.y,0));outward.y=0;outward.normalize();
   const angle=(n%2?1:-1)*(levelNumber===0?.42:.65)+(R()-.5)*.43;
   const dir=new THREE.Vector3(outward.x*Math.cos(angle)-outward.z*Math.sin(angle),
    0,outward.x*Math.sin(angle)+outward.z*Math.cos(angle)).normalize();
   if(dir.lengthSq()<.5)dir.set(Math.cos(n*2.4),0,Math.sin(n*2.4));
   const length=(levelNumber===0?spread*.39:spread*.20)*(.78+R()*.43);
   const p=branchPath(THREE,start,dir,length,(levelNumber===0?.9:1.0)+R()*.8,1.5,R,Math.max(5,Math.round(segments*.55)));
   limb(p,r1*(levelNumber===0?.33:.30),r2*(levelNumber===0?.40:.34),levelNumber+1);
  }
 }
 // Tronco vivo com ligeira torção, espessura não uniforme e eixo natural.
 const main=[];
 for(let i=0;i<=30;i++){
  const t=i/30,y=trunkH*t;
  main.push(T(.11*Math.sin(t*4.7)+.12*t*t,.0+y,.09*Math.cos(t*3.4)-.09));
 }
 tube(main,base*1.22,base*.22);
 // Raízes afloradas do solo, não uma base cilíndrica cortada.
 for(let k=0;k<11;k++){
  const a=k*Math.PI*2/11+R()*.3,reach=1.6+R()*2.0;
  const path=[];
  for(let j=0;j<=9;j++){
   const t=j/9;
   path.push(T(Math.cos(a)*(base*.45+reach*t),Math.max(-.06,.62*(1-t)*(1-t))-.04,
    Math.sin(a)*(base*.45+reach*t)));
  }
  tube(path,base*(.34+R()*.24),.022);
 }
 for(let i=0;i<cfg.mainBranches;i++){
  const t=(i+.2+R()*.42)/cfg.mainBranches,a=i*(Math.PI*(3-Math.sqrt(5)))+(R()-.5)*.3;
  const startY=trunkH*(.49+t*.51),start=pathPoint(THREE,main,startY/trunkH);
  const dir=T(Math.cos(a),0,Math.sin(a)),heightLift=1.3+(t-.5)*2.3+R()*.65;
  const length=spread*(.80-t*.27)*(.8+R()*.34);
  const branch=branchPath(THREE,start,dir,length,heightLift,1.6,R,segments);
  const rootR=base*(.39-t*.14)*(0.83+R()*.32);
  limb(branch,rootR,rootR*.26,0);
 }
 // A copa tem volumes de folhas agregados em centenas de brotos reais.
 // Os pontos dos brotos vêm das extremidades das ramificações, não de uma esfera artificial.
 const leafBudget=estimateOak(cfg,quality).leafBudget;
 const geom=combineGeometries(THREE,wood);
 const mesh=new THREE.Mesh(geom,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0}));
 mesh.name='Tronco com raízes, galhos e casca';mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
 const count=Math.max(1,leafBudget);
 const leaves=new THREE.InstancedMesh(leafGeometry(THREE),new THREE.MeshStandardMaterial({
  color:0xffffff,roughness:.95,metalness:0,side:THREE.DoubleSide,alphaTest:0
 }),count);
 leaves.name='Folhas de carvalho com recortes e tonalidades';
 const dummy=new THREE.Object3D(),paint=new THREE.Color(),palette=[];
 const hueSeason=cfg.season==='autumn'?'autumn':cfg.season;
 for(let i=0;i<12;i++){
  const c=white.clone();
  if(hueSeason==='autumn'){c.setHSL(.065+R()*.095,.55+R()*.15,.35+R()*.24)}
  else if(hueSeason==='spring'){c.offsetHSL((R()-.5)*.04,(R()-.5)*.08,(R()-.5)*.16+.09)}
  else c.offsetHSL((R()-.5)*.048,(R()-.5)*.16,(R()-.5)*.23);
  palette.push(c);
 }
 const seeds=anchors.length?anchors:[T(0,trunkH+2,0)];
 for(let i=0;i<count;i++){
  const anchor=seeds[i%seeds.length],r1=R(),r2=R(),r3=R();
  const theta=r1*Math.PI*2,rad=Math.pow(r2,.65)*(quality==='hero'?.91:.96)*scale;
  dummy.position.set(anchor.x+Math.cos(theta)*rad,anchor.y+(r3-.45)*1.5*scale,
   anchor.z+Math.sin(theta)*rad);
  const q=R(),leafScale=cfg.leafSize*(.63+q*.72)*scale;
  dummy.scale.set(leafScale*(.82+R()*.55),leafScale*(1.05+R()*.36),leafScale);
  dummy.rotation.set(R()*Math.PI*2,R()*Math.PI*2,R()*Math.PI*2);dummy.updateMatrix();
  leaves.setMatrixAt(i,dummy.matrix);leaves.setColorAt(i,palette[Math.floor(R()*palette.length)]);
 }
 leaves.instanceMatrix.needsUpdate=true;leaves.instanceColor.needsUpdate=true;leaves.frustumCulled=false;
 leaves.castShadow=false;leaves.receiveShadow=false;group.add(leaves);
 const stat={branches:wood.length,clusters:anchors.length,leaves:count,triangles:geom.index.count/3+leaves.geometry.index.count/3*count};
 group.userData.oakStats=stat;group.userData.oakOptions=cfg;
 group.userData.wood=mesh;group.userData.leaves=leaves;
 return {group,wood:mesh,leaves,stats:stat,options:cfg};
}
