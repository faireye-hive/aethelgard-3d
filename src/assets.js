// Modelos procedurais compartilhados entre a exploração e o Estúdio de Assets.
// Todas as dimensões são em unidades do mundo 3D. O ponto (0,0,0) é o chão.
export const STORAGE_KEY = 'aethelgard-assets-v1';
export const VERSION = 1;
const P = (id,label,shape,pos,size,color,pivot='') => ({id,label,shape,pos,size,color,pivot,rot:[0,0,0]});
export const ASSET_NAMES = {
  player:'Aventureiro', tree:'Árvore', rock:'Pedra', castle:'Castelo',
  city:'Cidade', port:'Porto', ruins:'Ruínas'
};
export const ASSET_ORDER = Object.keys(ASSET_NAMES);
export const DEFAULT_ASSETS = {
 player:{scale:.55,axes:[1,1,1],parts:[
  P('body','Torso','box',[0,1.57,0],[.81,.95,.5],'#286375'),
  P('waist','Cinto','box',[0,1.08,0],[.78,.25,.55],'#77503b'),
  P('buckle','Fivela','box',[0,1.09,.33],[.25,.2,.08],'#d9b879'),
  P('neck','Pescoço','cylinder',[0,2.12,0],[.34,.2,.34],'#d9aa89'),
  P('head','Cabeça','box',[0,2.43,.02],[.57,.6,.50],'#d9aa89'),
  P('hair','Cabelo','box',[0,2.75,-.02],[.61,.22,.55],'#382923'),
  P('eyeL','Olho esquerdo','box',[-.16,2.48,.30],[.07,.055,.06],'#243033'),
  P('eyeR','Olho direito','box',[.16,2.48,.30],[.07,.055,.06],'#243033'),
  P('armL','Braço esquerdo','box',[0,-.53,0],[.33,.84,.39],'#286375','armL'),
  P('armR','Braço direito','box',[0,-.53,0],[.33,.84,.39],'#286375','armR'),
  P('handL','Mão esquerda','box',[0,-1.04,0],[.28,.2,.31],'#d9aa89','armL'),
  P('handR','Mão direita','box',[0,-1.04,0],[.28,.2,.31],'#d9aa89','armR'),
  P('legL','Perna esquerda','box',[0,-.49,0],[.34,.89,.40],'#3d4d51','legL'),
  P('legR','Perna direita','box',[0,-.49,0],[.34,.89,.40],'#3d4d51','legR'),
  P('bootL','Bota esquerda','box',[0,-.99,.11],[.36,.21,.56],'#77503b','legL'),
  P('bootR','Bota direita','box',[0,-.99,.11],[.36,.21,.56],'#77503b','legR'),
  P('backpack','Mochila','box',[0,1.60,-.46],[.74,.88,.39],'#77503b'),
  P('packBelt','Alça da mochila','box',[0,1.85,-.67],[.70,.1,.10],'#d9b879'),
  P('swordBlade','Espada nas costas','box',[.45,1.92,-.68],[.14,1.24,.11],'#bcc6cf'),
  P('swordHilt','Cabo da espada','cylinder',[.45,2.64,-.68],[.16,.40,.16],'#765138'),
  P('swordGuard','Guarda da espada','box',[.45,2.43,-.68],[.38,.11,.13],'#d9b879')
 ]},
 tree:{scale:1,axes:[1,1,1],parts:[
  P('trunk','Tronco','cylinder',[0,.77,0],[.42,1.55,.42],'#72513b'),
  P('leavesLower','Copa inferior','cone',[0,1.87,0],[2.1,2.65,2.1],'#3a7850'),
  P('leavesUpper','Copa superior','cone',[0,2.94,0],[1.50,2.22,1.50],'#518d5a')
 ]},
 rock:{scale:1,axes:[1,1,1],parts:[
  P('body','Rocha','rock',[0,.56,0],[1.60,1.12,1.37],'#979c9c'),
  P('upper','Pedra superior','rock',[-.27,1.0,.15],[.7,.55,.68],'#b6aaa0')
 ]},
 castle:{scale:1,axes:[1,1,1],parts:[
  P('base','Base','cylinder',[0,.25,0],[3.8,.5,3.8],'#7c806f'),
  P('hall','Muralhas','box',[0,1.42,0],[3.4,2.4,3.0],'#c8b9a1'),
  P('roof','Telhado central','cone',[0,3.07,0],[3.65,1.25,3.65],'#955e52'),
  ...[-1,1].flatMap((sx)=>[-1,1].flatMap((sz)=>{
    const id=(sx===-1?'W':'E')+(sz===-1?'N':'S');return [
      P('tower'+id,'Torre '+id,'cylinder',[sx*1.69,1.50,sz*1.50],[.88,2.9,.88],'#bcb5a8'),
      P('cap'+id,'Telhado torre '+id,'cone',[sx*1.69,3.23,sz*1.50],[1.12,1.4,1.12],'#87564e')
    ]})),
  P('gate','Portão','box',[0,.87,1.59],[.78,1.56,.08],'#674e40')
 ]},
 city:{scale:1,axes:[1,1,1],parts:[
  P('base','Base','cylinder',[0,.18,0],[3.3,.36,3.3],'#877f65'),
  P('home1','Casa central','box',[0,1.06,0],[1.5,1.68,1.34],'#c8b99a'),
  P('roof1','Telhado central','cone',[0,2.15,0],[2,1.08,2],'#a36a4e'),
  P('home2','Casa lateral','box',[-1.05,.7,.76],[1,1.1,.97],'#b8ac97'),
  P('roof2','Telhado lateral','cone',[-1.05,1.52,.76],[1.4,.85,1.4],'#aa6c52'),
  P('home3','Casa menor','box',[1.09,.68,-.65],[.95,1,.9],'#d0bb95'),
  P('roof3','Telhado menor','cone',[1.09,1.37,-.65],[1.35,.76,1.35],'#865944')
 ]},
 port:{scale:1,axes:[1,1,1],parts:[
  P('platform','Cais','box',[0,.31,0],[3.6,.4,2.7],'#8f7757'),
  P('plank1','Tábua esquerda','box',[-1,.56,0],[.25,.13,2.8],'#c59e68'),
  P('plank2','Tábua direita','box',[1,.56,0],[.25,.13,2.8],'#c59e68'),
  P('shed','Armazém','box',[0,1.30,-.64],[2,1.66,1.3],'#ae9781'),
  P('shedRoof','Telhado','cone',[0,2.37,-.64],[2.7,1.10,2],'#87644e'),
  P('mast','Mastro','cylinder',[1.45,2.10,1],[.12,3.8,.12],'#624b38'),
  P('flag','Bandeira','box',[1.97,3.16,1],[1,.59,.06],'#d7be7b')
 ]},
 ruins:{scale:1,axes:[1,1,1],parts:[
  P('floor','Piso antigo','cylinder',[0,.20,0],[3.2,.4,3.2],'#898b78'),
  P('pillarL','Coluna esquerda','cylinder',[-1,.95,0],[.58,1.9,.58],'#adafa2'),
  P('pillarR','Coluna direita','cylinder',[1,.68,-.2],[.63,1.36,.63],'#a5a898'),
  P('pillarRear','Coluna traseira','cylinder',[0,.92,-1],[.43,1.84,.43],'#8b9289'),
  P('broken','Entulho','rock',[.5,.3,1],[1.15,.57,.77],'#9a9d8d')
 ]}
};
export function cloneDefaults(){return JSON.parse(JSON.stringify(DEFAULT_ASSETS))}
export function cloneCatalog(value){return JSON.parse(JSON.stringify(value))}
const goodNumber=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
const vec=(x,min,max)=>Array.isArray(x)&&x.length===3&&x.every(v=>goodNumber(v,min,max));
const shapes=new Set(['box','cone','cylinder','sphere','rock']);
export function validateCatalog(data){
 if(!data||typeof data!=='object'||data.version!==VERSION||!data.assets||typeof data.assets!=='object')throw new Error('Formato incorreto. Use um catálogo Aethelgard versão 1.');
 const ret={version:VERSION,assets:{}};
 for(const key of ASSET_ORDER){
  const item=data.assets[key];
  if(!item||!goodNumber(item.scale,.05,20)||!vec(item.axes,.05,10)||!Array.isArray(item.parts)||item.parts.length<1||item.parts.length>80)throw new Error('Modelo inválido: '+key);
  const ids=new Set;
  for(const part of item.parts){
   if(!part||typeof part.id!=='string'||!/^[a-zA-Z0-9_-]{1,40}$/.test(part.id)||ids.has(part.id)||typeof part.label!=='string'||part.label.length>60||!shapes.has(part.shape)||!vec(part.pos,-30,30)||!vec(part.size,.02,30)||!vec(part.rot,-360,360)||!/^#[0-9a-fA-F]{6}$/.test(part.color)||!['','armL','armR','legL','legR'].includes(part.pivot||''))throw new Error('Peça inválida em '+key);
   ids.add(part.id);
  }
  ret.assets[key]=cloneCatalog(item);
 }
 return ret;
}
export function defaultCatalog(){return {version:VERSION,assets:cloneDefaults()}}
export function loadCatalog(){
 try{const v=localStorage.getItem(STORAGE_KEY);return v?validateCatalog(JSON.parse(v)):defaultCatalog()}
 catch(e){console.warn('Catálogo de assets inválido, usando padrões',e);return defaultCatalog()}
}
export function saveCatalog(catalog){const valid=validateCatalog(catalog);localStorage.setItem(STORAGE_KEY,JSON.stringify(valid));return valid}
function geo(shape,THREE){
 switch(shape){
  case 'cone':return new THREE.ConeGeometry(.5,1,6);
  case 'cylinder':return new THREE.CylinderGeometry(.5,.5,1,8);
  case 'sphere':return new THREE.SphereGeometry(.5,12,8);
  case 'rock':return new THREE.DodecahedronGeometry(.62,0);
  default:return new THREE.BoxGeometry(1,1,1);
 }
}
export function makePartMesh(part,THREE){
 const mesh=new THREE.Mesh(geo(part.shape,THREE),new THREE.MeshStandardMaterial({color:part.color,roughness:.85}));
 mesh.name=part.label;mesh.userData.partId=part.id;mesh.position.fromArray(part.pos);mesh.scale.fromArray(part.size);
 mesh.rotation.set(...part.rot.map(v=>THREE.MathUtils.degToRad(v)));mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
// Retorna um THREE.Group e os pivôs para animar braços e pernas no jogo.
export function createAsset(kind,catalog,THREE){
 const config=catalog.assets[kind];if(!config)throw new Error('Asset desconhecido: '+kind);
 const group=new THREE.Group;group.name=kind;
 group.scale.set(...config.axes.map(n=>n*config.scale));
 const pivots={};if(kind==='player'){
  const bases={armL:[-.55,1.94,0],armR:[.55,1.94,0],legL:[-.20,1.05,0],legR:[.20,1.05,0]};
  for(const [name,position] of Object.entries(bases)){
   const p=new THREE.Group;p.name=name;p.position.fromArray(position);group.add(p);pivots[name]=p;
  }
 }
 const meshes={};
 for(const part of config.parts){const mesh=makePartMesh(part,THREE);(pivots[part.pivot]||group).add(mesh);meshes[part.id]=mesh}
 return {group,pivots,meshes};
}
// Floresta procedural eficiente: 1 InstancedMesh por peça do modelo.
export function createScatter(kind,catalog,THREE,points){
 const config=catalog.assets[kind],outer=new THREE.Group;
 const o=new THREE.Object3D,partMatrix=new THREE.Matrix4,outerMatrix=new THREE.Matrix4;
 const euler=new THREE.Euler,position=new THREE.Vector3,size=new THREE.Vector3;
 for(const part of config.parts){
  const mesh=new THREE.InstancedMesh(geo(part.shape,THREE),new THREE.MeshStandardMaterial({color:part.color,roughness:.92}),points.length);
  position.fromArray(part.pos);size.fromArray(part.size);euler.set(...part.rot.map(v=>THREE.MathUtils.degToRad(v)));const quat=new THREE.Quaternion().setFromEuler(euler);
  partMatrix.compose(position,quat,size);
  points.forEach(([x,y,z,scale],i)=>{
   o.position.set(x,y,z);o.scale.set(config.scale*config.axes[0]*scale,config.scale*config.axes[1]*scale,config.scale*config.axes[2]*scale);
   o.rotation.set(0,(i*2.4)%(Math.PI*2),0);o.updateMatrix();
   outerMatrix.multiplyMatrices(o.matrix,partMatrix);mesh.setMatrixAt(i,outerMatrix);
  });mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;outer.add(mesh);
 }
 return outer;
}
