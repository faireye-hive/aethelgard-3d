import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {loadSeed} from './seed.js';
import {loadCatalog,saveCatalog,validateCatalog,createAsset,createScatter} from './assets.js';
import {TREE_TYPES,TREE_LABELS,isTreeType,autoTreeAt,clearTreeIndexes,plantTrees,eraseTrees,REALISTIC_OAK,MAX_REALISTIC_OAKS} from './forest.js';
import {createRealisticOak,getOakOptions,saveOakOptions,oakOptions,OAK_STORAGE_KEY} from './oak-realistic.js';
const $=id=>document.getElementById(id),palette=['#317fa0','#a5b777','#4a7750','#918e86','#dfb676','#dce4db','#c9b68d'];
const names=['Mar','Pradaria','Floresta','Montanhas','Deserto','Neve','Planícies'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.82});
const cube=(g,m,x=0,y=0,z=0)=>{const a=new THREE.Mesh(g,m);a.position.set(x,y,z);return a};
let world,seed,scene,camera,renderer,controls,terrain,trees,rocks,sites,water,hero,avatar,legs=[],arms=[],cloak,ray;
let assetCatalog=loadCatalog();
let mode='explore',tool='inspect',follow=true,path=[],pathIndex=0,keys=new Set,joystick={x:0,y:0},sprintMobile=false,jumpV=0,jumpY=0,step=0;
let history=[],redoStack=[],pointDown=null,painting=false,changed=false,strokeBefore='',noticeTimer;
const at=(x,y)=>y*world.cols+x;
const grid=(p)=>({x:clamp(Math.round((p.x/world.worldWidth+.5)*(world.cols-1)),0,world.cols-1),y:clamp(Math.round((p.z/world.worldDepth+.5)*(world.rows-1)),0,world.rows-1)});
const pos=(x,y)=>new THREE.Vector3((x/(world.cols-1)-.5)*world.worldWidth,0,(y/(world.rows-1)-.5)*world.worldDepth);
const height=(x,y)=>world.biome[at(x,y)]===0?-.9:world.height[at(x,y)]*.115;
const valid=(x,y)=>x>=0&&y>=0&&x<world.cols&&y<world.rows&&world.biome[at(x,y)]!==0;
const pixel=(x,y)=>({x:clamp(Math.round((x-19)/987*(world.cols-1)),0,world.cols-1),y:clamp(Math.round((y-51)/482*(world.rows-1)),0,world.rows-1)});
function tell(msg){$('message').textContent=msg;$('message').classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('message').classList.remove('show'),2800)}
function validate(o){if(!o||o.version!==1||o.cols!==168||o.rows!==84||!Array.isArray(o.biome)||!Array.isArray(o.height)||o.biome.length!==14112||o.height.length!==14112||!Array.isArray(o.objects)||!o.spawn||o.objects.length>10000||o.biome.some(n=>!Number.isInteger(n)||n<0||n>6)||o.height.some(n=>!Number.isInteger(n)||n<0||n>100)||!o.objects.every(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&x.name.length<=100&&(['city','castle','port','rock','ruins'].includes(x.type)||isTreeType(x.type))&&Number.isFinite(x.x)&&Number.isFinite(x.y)))throw Error('JSON inválido: use um mapa Aethelgard v1');if(o.clearedTrees!==undefined&&(!Array.isArray(o.clearedTrees)||o.clearedTrees.length>14112||o.clearedTrees.some(i=>!Number.isInteger(i)||i<0||i>=14112)))throw Error('Máscara de floresta inválida');o.clearedTrees??=[];return o}
function state(){try{localStorage.setItem('aethelgard-editor-v1',JSON.stringify(world))}catch{tell('Sem espaço: exporte o JSON')}$('undo').disabled=!history.length;$('redo').disabled=!redoStack.length;$('status').textContent='Alterações salvas'}
function commit(before){history.push(before);if(history.length>25)history.shift();redoStack=[];rebuild();state()}
function undo(){if(!history.length)return;redoStack.push(JSON.stringify(world));world=JSON.parse(history.pop());rebuild();state()}
function redo(){if(!redoStack.length)return;history.push(JSON.stringify(world));world=JSON.parse(redoStack.pop());rebuild();state()}
function setMode(m){mode=m;if(mode==='edit'){follow=false;path=[];keys.clear()}else follow=true;$('explore').classList.toggle('active',m==='explore');$('edit').classList.toggle('active',m==='edit');$('follow').classList.toggle('active',follow);$('mobile').hidden=m==='edit';$('modeBadge').textContent=m==='edit'?'● MODO EDITOR':'● MODO EXPLORAÇÃO'}
function groupClear(g){for(const o of [...g.children]){g.remove(o);o.traverse(n=>{n.geometry?.dispose();if(n.material){const ms=Array.isArray(n.material)?n.material:[n.material];for(const m of ms){m.map?.dispose();m.dispose()}}})}}
function treeInstance(g,m,rows){if(!rows.length)return;const inst=new THREE.InstancedMesh(g,m,rows.length),o=new THREE.Object3D;rows.forEach(([x,y,z,s],i)=>{o.position.set(x,y,z);o.scale.setScalar(s);o.rotation.y=(i*2.4)%6.28;o.updateMatrix();inst.setMatrixAt(i,o.matrix)});inst.instanceMatrix.needsUpdate=true;inst.frustumCulled=false;trees.add(inst)}
function makeTag(value){const c=document.createElement('canvas');c.width=360;c.height=72;const q=c.getContext('2d');q.fillStyle='#13231edc';q.fillRect(0,8,360,56);q.font='bold 25px Georgia';q.fillStyle='#ffe1ac';q.textAlign='center';q.fillText(String(value).slice(0,30),180,43,345);const t=new THREE.CanvasTexture(c),s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false}));s.scale.set(13,2.6,1);return s}
function rebuild(){
 if(!terrain)return;
 const a=terrain.geometry.attributes.position,c=terrain.geometry.attributes.color,colors=palette.map(v=>new THREE.Color(v));
 for(let y=0;y<world.rows;y++)for(let x=0;x<world.cols;x++){const i=at(x,y),b=world.biome[i],n=((i*1664525+1013904223)>>>3)%37/37;a.setY(i,height(x,y));const v=colors[b].clone().multiplyScalar(.86+.19*n);c.setXYZ(i,v.r,v.g,v.b)}
 a.needsUpdate=true;c.needsUpdate=true;terrain.geometry.computeVertexNormals();terrain.geometry.computeBoundingSphere();


 groupClear(trees);groupClear(rocks);groupClear(sites);
 const grouped=Object.fromEntries(TREE_TYPES.map(type=>[type,[]])),rocky=[],realisticOaks=[];
 const cleared=clearTreeIndexes(world);
 for(let y=1;y<world.rows-1;y++)for(let x=1;x<world.cols-1;x++){
  const i=at(x,y),b=world.biome[i],n=((i*1103515245+12345)>>>2)%1000/1000,p=pos(x,y),h=height(x,y);
  const type=cleared.has(i)?null:autoTreeAt(world,x,y);
  if(type)grouped[type].push([p.x,h,p.z,.55+n*.37]);
  if(b===3&&n>.78)rocky.push([p.x,h,p.z,.55+n*.38]);
 }
 // Árvores plantadas usam instancing; um modelo pode ter dezenas de galhos
 // sem gerar uma draw call para cada cópia dentro do mundo.
 for(const o of world.objects){
  if(isTreeType(o.type)){
   const c=pixel(o.x,o.y),p=pos(c.x,c.y);
   if(o.type===REALISTIC_OAK)realisticOaks.push([p.x,height(c.x,c.y),p.z]);
   else grouped[o.type].push([p.x,height(c.x,c.y),p.z,.82]);
   continue;
  }
  const c=pixel(o.x,o.y),p=pos(c.x,c.y),kind=assetCatalog.assets[o.type]?o.type:'ruins';
  const g=createAsset(kind,assetCatalog,THREE).group;
  g.position.set(p.x,height(c.x,c.y),p.z);
  const tag=makeTag(o.name);tag.position.y=kind==='castle'?6:4;g.add(tag);sites.add(g)
 }
 for(const kind of TREE_TYPES)if(grouped[kind].length)trees.add(createScatter(kind,assetCatalog,THREE,grouped[kind]));
 if(rocky.length)rocks.add(createScatter('rock',assetCatalog,THREE,rocky));
 if(realisticOaks.length){
  const template=createRealisticOak(THREE,getOakOptions(),'world').group;
  realisticOaks.slice(0,MAX_REALISTIC_OAKS).forEach(([x,y,z],i)=>{
   const instance=i===0?template:template.clone(true);
   instance.position.set(x,y,z);
   trees.add(instance);
  });
 }
 trees.visible=$('vegetation').checked;sites.visible=$('places').checked;drawMap();updatePlaces()
}
function createHero(){
 if(hero){scene.remove(hero);groupClear(hero)}
 hero=new THREE.Group;scene.add(hero);
 const {group,pivots,meshes}=createAsset('player',assetCatalog,THREE);
 avatar=group;hero.add(avatar);
 arms=[pivots.armL,pivots.armR];legs=[pivots.legL,pivots.legR];
 cloak=meshes.cape||new THREE.Object3D;
 const circle=cube(new THREE.TorusGeometry(.46,.045,8,38),new THREE.MeshBasicMaterial({color:'#f5c580'}),0,.045,0);
 circle.rotation.x=-Math.PI/2;hero.add(circle);
 spawnHero();
}
function spawnHero(){if(!hero)return;const c=pixel(world.spawn.x,world.spawn.y),p=pos(c.x,c.y);hero.position.set(p.x,height(c.x,c.y),p.z);path=[];pathIndex=0;jumpY=jumpV=0}
function findPath(start,end){
 if(!valid(end.x,end.y))return[];
 const n=world.cols*world.rows,dist=new Float64Array(n).fill(Infinity),came=new Int32Array(n).fill(-1),closed=new Uint8Array(n),q=[];
 const src=at(start.x,start.y),goal=at(end.x,end.y);dist[src]=0;q.push([src,0]);let count=0;
 while(q.length&&count++<n*10){q.sort((a,b)=>b[1]-a[1]);const [id]=q.pop();if(closed[id])continue;closed[id]=1;if(id===goal){const out=[];for(let i=id;i!==-1;i=came[i])out.push({x:i%world.cols,y:Math.floor(i/world.cols)});return out.reverse()}
  const x=id%world.cols,y=Math.floor(id/world.cols);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy||!valid(x+dx,y+dy))continue;if(dx&&dy&&(!valid(x+dx,y)||!valid(x,y+dy)))continue;const nx=x+dx,ny=y+dy,j=at(nx,ny);if(closed[j])continue;const cost=dist[id]+Math.hypot(dx,dy)*(world.biome[j]===3?2:world.biome[j]===2?1.25:1);if(cost<dist[j]){dist[j]=cost;came[j]=id;q.push([j,cost+Math.hypot(end.x-nx,end.y-ny)])}}}
 return []
}
function move(d,dt,run){if(d.lengthSq()<.0001)return false;d.normalize();const speed=run?8.1:4.3,x=hero.position.x+d.x*speed*dt,z=hero.position.z+d.z*speed*dt,p=grid({x,z}),a=grid({x,z:hero.position.z}),b=grid({x:hero.position.x,z}),old=grid(hero.position);if(Math.abs(x)>=world.worldWidth/2-.1||Math.abs(z)>=world.worldDepth/2-.1||!valid(p.x,p.y)||!valid(a.x,a.y)||!valid(b.x,b.y)||Math.abs(height(p.x,p.y)-height(old.x,old.y))>4.2)return false;hero.position.x=x;hero.position.z=z;hero.rotation.y=Math.atan2(d.x,d.z);return true}
function animateHero(dt,t){
 const dir=new THREE.Vector3;camera.getWorldDirection(dir);dir.y=0;dir.normalize();
 const right=new THREE.Vector3(-dir.z,0,dir.x),vx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'))+joystick.x,vy=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'))+joystick.y,d=dir.multiplyScalar(vy).addScaledVector(right,vx);
 const fast=keys.has('shift')||sprintMobile;let walking=false;
 if(mode==='explore'&&d.lengthSq()>.01){path=[];walking=move(d,dt,fast)}
 else if(mode==='explore'&&pathIndex<path.length){const p=pos(path[pathIndex].x,path[pathIndex].y),go=p.sub(hero.position);go.y=0;if(go.length()<.13){pathIndex++;if(pathIndex>=path.length)path=[]}else{walking=move(go,dt,false);if(!walking)path=[]}}
 const c=grid(hero.position);hero.position.y+=(height(c.x,c.y)-hero.position.y)*Math.min(1,dt*12);
 if(jumpV||jumpY){jumpY=Math.max(0,jumpY+jumpV*dt);jumpV-=18*dt;if(jumpY===0)jumpV=0}
 if(walking)step+=dt*(fast?15:10);const s=walking?Math.sin(step)*(fast?.74:.49):0;
 arms[0].rotation.x+=(s-arms[0].rotation.x)*Math.min(1,dt*12);arms[1].rotation.x+=(-s-arms[1].rotation.x)*Math.min(1,dt*12);legs[0].rotation.x+=(-s-legs[0].rotation.x)*Math.min(1,dt*12);legs[1].rotation.x+=(s-legs[1].rotation.x)*Math.min(1,dt*12);
 avatar.position.y=jumpY+(walking?Math.abs(Math.sin(step))*.052:Math.sin(t*1.8)*.015);cloak.rotation.x=(walking?.10:0)+Math.sin(t*2.5)*.06;
 $('coords').textContent='X '+c.x+' · Y '+c.y;
 if(follow&&mode==='explore'){const target=hero.position.clone().add(new THREE.Vector3(0,.85,0)),delta=target.sub(controls.target),alpha=1-Math.exp(-dt*8);controls.target.addScaledVector(delta,alpha);camera.position.addScaledVector(delta,alpha)}
}
function clickWorld(e){const r=$('game').getBoundingClientRect();if(!r.width||!r.height)return null;ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hits=ray.intersectObject(terrain);if(!hits.length)return null;return grid(hits[0].point)}
function inspect(p){if(!p)return;const b=world.biome[at(p.x,p.y)];$('selection').textContent=names[b]+' · Altitude '+height(p.x,p.y).toFixed(1)+' · X '+p.x+', Y '+p.y}
function paint(p){
 if(!p)return false;let changed=false;
 if(['biome','raise','lower','flatten','plant-tree','remove-tree'].includes(tool)){const r=Number($('radius').value),power=Number($('strength').value),target=world.height[at(p.x,p.y)];for(let y=Math.max(0,p.y-r);y<=Math.min(world.rows-1,p.y+r);y++)for(let x=Math.max(0,p.x-r);x<=Math.min(world.cols-1,p.x+r);x++){const d=Math.hypot(x-p.x,y-p.y);if(d>r)continue;const i=at(x,y),before=world.height[i];if(tool==='biome')world.biome[i]=Number($('biome').value);else if(tool==='flatten')world.height[i]=Math.round(before*.82+target*.18);else world.height[i]=clamp(before+(tool==='raise'?1:-1)*Math.max(1,Math.round(power*(1-d/(r+.2)))),0,100);changed=changed||world.height[i]!==before||tool==='biome'}}
 else if(tool==='plant-tree'){return plantTrees(world,p,$('treeVariant').value,{radius:Number($('radius').value),density:$('treeDensity').value})>0}
 else if(tool==='remove-tree'){return eraseTrees(world,p,Number($('radius').value))>0}
 else if(tool==='object'){const type=$('object').value;world.objects.push({id:'new-'+Date.now()+'-'+world.objects.length,type,name:'Novo '+type,x:19+p.x/(world.cols-1)*987,y:51+p.y/(world.rows-1)*482});changed=true}
 else if(tool==='erase'){const before=world.objects.length;world.objects=world.objects.filter(o=>{const c=pixel(o.x,o.y);return Math.hypot(c.x-p.x,c.y-p.y)>3});changed=before!==world.objects.length}
 else if(tool==='spawn'){if(!valid(p.x,p.y)){tell('Escolha um ponto em terra');return false}world.spawn={x:19+p.x/(world.cols-1)*987,y:51+p.y/(world.rows-1)*482};spawnHero();changed=true}
 return changed
}
function drawMap(){const cv=$('minimap'),ctx=cv.getContext('2d'),cw=cv.width/world.cols,ch=cv.height/world.rows;for(let y=0;y<world.rows;y++)for(let x=0;x<world.cols;x++){ctx.fillStyle=palette[world.biome[at(x,y)]];ctx.fillRect(x*cw,y*ch,cw+.5,ch+.5)}if(hero){const p=grid(hero.position);ctx.fillStyle='#fff2c7';ctx.beginPath();ctx.arc(p.x*cw,p.y*ch,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#173328';ctx.stroke()}}
function updatePlaces(){const list=$('list'),old=list.value;list.replaceChildren(new Option('Escolher local...',''),...world.objects.map(o=>new Option(o.name,o.id)));if(world.objects.some(o=>o.id===old))list.value=old}
function focus(x,y){const p=pos(x,y),delta=p.clone().sub(controls.target);controls.target.copy(p);camera.position.add(delta);follow=false;$('follow').classList.remove('active')}
function events(){
 $('explore').onclick=()=>setMode('explore');$('edit').onclick=()=>setMode('edit');
 for(const b of document.querySelectorAll('[data-tool]'))b.onclick=()=>{tool=b.dataset.tool;setMode('edit');for(const t of document.querySelectorAll('[data-tool]'))t.classList.toggle('active',t===b)};
 $('undo').onclick=undo;$('redo').onclick=redo;
 $('radius').oninput=e=>$('radiusOut').textContent=e.target.value;
 $('treeVariant').onchange=()=>{if(tool!=='plant-tree')document.querySelector('[data-tool="plant-tree"]').click()};
 $('treeDensity').onchange=()=>{if(tool!=='plant-tree')document.querySelector('[data-tool="plant-tree"]').click()};$('strength').oninput=e=>$('strengthOut').textContent=e.target.value;
 $('vegetation').onchange=e=>trees.visible=e.target.checked;$('places').onchange=e=>sites.visible=e.target.checked;
 $('follow').onclick=()=>{if(mode!=='explore')setMode('explore');else follow=!follow;$('follow').classList.toggle('active',follow)};
 $('overview').onclick=()=>{camera.position.set(0,97,135);controls.target.set(0,0,0);follow=false;$('follow').classList.remove('active')};
 $('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(world,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='aethelgard-world.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 $('exportProject').onclick=()=>{
  const payload={format:'aethelgard-project',version:1,world,assets:assetCatalog,realisticOak:getOakOptions()};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='aethelgard-projeto-completo.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);tell('Projeto completo exportado: mapa e modelos 3D');
 };
 $('import').onclick=()=>$('file').click();$('file').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(f.size>3000000){tell('JSON muito grande');return}try{const parsed=JSON.parse(await f.text());
 const packageFile=parsed?.format==='aethelgard-project'&&parsed.version===1;
 const w=validate(packageFile?parsed.world:parsed);
 const newCatalog=packageFile?validateCatalog(parsed.assets):null;
 const importedOak=packageFile&&parsed.realisticOak?oakOptions(parsed.realisticOak):null;
 history.push(JSON.stringify(world));redoStack=[];world=w;
 if(newCatalog){assetCatalog=saveCatalog(newCatalog);createHero();}
 if(importedOak)saveOakOptions(importedOak);
 else spawnHero();
 rebuild();state();tell(packageFile?'Mapa e modelos 3D importados':'Mapa importado')}catch(err){tell(err.message)}e.target.value=''};
 $('reset').onclick=()=>{if(!confirm('Restaurar o mundo inicial? Exporte o mapa editado antes.'))return;history.push(JSON.stringify(world));redoStack=[];world=structuredClone(seed);spawnHero();rebuild();state()};
 $('list').onchange=e=>{const o=world.objects.find(v=>v.id===e.target.value);$('name').disabled=!o;$('rename').disabled=!o;$('name').value=o?.name||'';if(o){const c=pixel(o.x,o.y);focus(c.x,c.y);inspect(c)}};
 $('rename').onclick=()=>{const o=world.objects.find(v=>v.id===$('list').value),name=$('name').value.trim();if(!o||!name)return;const before=JSON.stringify(world);o.name=name;commit(before)};
 $('minimap').onclick=e=>{const r=e.target.getBoundingClientRect(),x=clamp(Math.round((e.clientX-r.left)/r.width*(world.cols-1)),0,world.cols-1),y=clamp(Math.round((e.clientY-r.top)/r.height*(world.rows-1)),0,world.rows-1);focus(x,y);inspect({x,y})};
 const canvas=$('game');canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointDown={x:e.clientX,y:e.clientY,drag:false};painting=mode==='edit'&&['biome','raise','lower','flatten'].includes(tool);if(painting){strokeBefore=JSON.stringify(world);changed=false;controls.enabled=false;changed=paint(clickWorld(e))||changed}});
 canvas.addEventListener('pointermove',e=>{const p=clickWorld(e);if(p)inspect(p);if(pointDown&&Math.hypot(e.clientX-pointDown.x,e.clientY-pointDown.y)>6)pointDown.drag=true;if(painting&&p)changed=paint(p)||changed});
 const end=e=>{if(!pointDown)return;if(painting){painting=false;controls.enabled=true;if(changed)commit(strokeBefore)}else if(!pointDown.drag&&e.target===canvas){const p=clickWorld(e);if(p){inspect(p);if(mode==='edit'){if(tool!=='inspect'){const before=JSON.stringify(world);if(paint(p))commit(before)}}else{if(!valid(p.x,p.y)){tell('É mar aberto! Viaje por terra.')}else{const from=grid(hero.position),route=findPath(from,p);if(route.length>1){path=route;pathIndex=1;tell('Rota definida')}else tell('Não há caminho terrestre.')}}}}pointDown=null};
 canvas.addEventListener('pointerup',end);window.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',()=>{if(painting&&changed)commit(strokeBefore);painting=false;controls.enabled=true;pointDown=null});
 window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;const k=e.key.toLowerCase();if(mode==='explore'&&['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift',' '].includes(k)){e.preventDefault();keys.add(k);if(k===' '&&jumpY===0)jumpV=6.4}if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();e.shiftKey?redo():undo()}if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();redo()}if(k==='escape')path=[];if(k==='1')setMode('explore');if(k==='2')setMode('edit')});
 window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();joystick={x:0,y:0}});
 const stick=$('stick'),knob=$('knob');let active=null;
 function stickMove(e){const r=stick.getBoundingClientRect(),w=r.width*.34;let x=(e.clientX-r.left-r.width/2)/w,y=(r.top+r.height/2-e.clientY)/w,l=Math.hypot(x,y);if(l>1){x/=l;y/=l}joystick={x,y};knob.style.transform='translate('+x*32+'px,'+(-y*32)+'px)'}
 stick.addEventListener('pointerdown',e=>{active=e.pointerId;stick.setPointerCapture(active);stickMove(e)});stick.addEventListener('pointermove',e=>{if(e.pointerId===active)stickMove(e)});
 function release(e){if(e.pointerId!==active)return;active=null;joystick={x:0,y:0};knob.style.transform=''}stick.addEventListener('pointerup',release);stick.addEventListener('pointercancel',release);
 $('jump').onclick=()=>{if(jumpY===0)jumpV=6.4};$('run').onclick=()=>{sprintMobile=!sprintMobile;$('run').classList.toggle('active',sprintMobile)};

 // Se outro separador editar o catálogo, reflete as alterações no jogo.
 window.addEventListener('storage',e=>{if(e.key===OAK_STORAGE_KEY){rebuild();tell('Carvalho realista atualizado');return}
 if(e.key==='aethelgard-assets-v1'){
  const prev=hero?.position.clone(),yaw=hero?.rotation.y||0;
  assetCatalog=loadCatalog();rebuild();createHero();
  if(prev){hero.position.copy(prev);hero.rotation.y=yaw;}
  tell('Modelos 3D atualizados pelo Estúdio de Assets');
 }});
 state();setMode('explore')
}
async function init(){
 seed=validate(await loadSeed());world=structuredClone(seed);
 try{const saved=localStorage.getItem('aethelgard-editor-v1');if(saved)world=validate(JSON.parse(saved))}catch{tell('Salvamento anterior inválido; carregando atlas inicial')}
 scene=new THREE.Scene();scene.background=new THREE.Color('#86a9b2');scene.fog=new THREE.Fog('#86a9b2',135,330);scene.add(new THREE.HemisphereLight(0xdbeae2,0x76684d,2.1));const sun=new THREE.DirectionalLight('#ffe1a8',2.05);sun.position.set(-70,125,65);scene.add(sun);
 camera=new THREE.PerspectiveCamera(55,1,.1,700);renderer=new THREE.WebGLRenderer({canvas:$('game'),antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
 controls=new OrbitControls(camera,$('game'));controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=5;controls.maxDistance=260;controls.maxPolarAngle=1.48;controls.screenSpacePanning=false;
 ray=new THREE.Raycaster;const geo=new THREE.PlaneGeometry(world.worldWidth,world.worldDepth,world.cols-1,world.rows-1);geo.rotateX(-Math.PI/2);geo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(world.cols*world.rows*3),3));terrain=cube(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));scene.add(terrain);
 water=cube(new THREE.PlaneGeometry(world.worldWidth+10,world.worldDepth+10),new THREE.MeshPhongMaterial({color:0x2e84a1,transparent:true,opacity:.92,depthWrite:false}),0,-.23,0);water.rotation.x=-Math.PI/2;scene.add(water);
 trees=new THREE.Group;rocks=new THREE.Group;sites=new THREE.Group;scene.add(trees,rocks,sites);rebuild();createHero();camera.position.copy(hero.position).add(new THREE.Vector3(0,5.4,10.5));controls.target.copy(hero.position).add(new THREE.Vector3(0,.85,0));controls.update();events();
 const size=()=>{const box=$('view');if(box.clientWidth&&box.clientHeight){renderer.setSize(box.clientWidth,box.clientHeight,false);camera.aspect=box.clientWidth/box.clientHeight;camera.updateProjectionMatrix()}};new ResizeObserver(size).observe($('view'));size();
 let last=performance.now(),mini=0;function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;animateHero(dt,now*.001);controls.update();renderer.render(scene,camera);if(now-mini>300){drawMap();mini=now}}requestAnimationFrame(frame);$('status').textContent='Aventureiro pronto para explorar'
}
init().catch(err=>{console.error(err);$('status').textContent='Erro na inicialização';tell('Falha ao iniciar WebGL ou baixar Three.js')});
