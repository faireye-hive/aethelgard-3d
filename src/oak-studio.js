import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {OAK_DEFAULTS,oakOptions,oakImport,oakSerialized,getOakOptions,saveOakOptions,createRealisticOak} from './oak-realistic.js';
const $=id=>document.getElementById(id);
const numeric=['height','spread','trunkRadius','mainBranches','leafDensity','leafSize'];
const numericLabel={height:' m',spread:' m',trunkRadius:' m',mainBranches:'',leafDensity:'×',leafSize:' m'};
let settings=getOakOptions(),scene,camera,renderer,controls,ground,oak=null,wire=false,leavesVisible=true,busy=false,scheduled=null;
function label(v){return Number.isInteger(v)?String(v):v.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')}
function drawInputs(){
 for(const key of numeric){$(key).value=settings[key];$(key+'Value').textContent=label(settings[key])+numericLabel[key]}
 for(const key of ['seed','leafColor','barkColor','season'])$(key).value=settings[key];
}
function dispose(group){
 if(!group)return;
 group.traverse(node=>{node.geometry?.dispose();if(node.material){const materials=Array.isArray(node.material)?node.material:[node.material];for(const m of materials){m.map?.dispose();m.dispose()}}});
 group.parent?.remove(group);
}
function frame(){
 if(!oak)return;
 const s=settings,reach=Math.max(s.spread*1.2,s.height*1.3);
 controls.target.set(0,s.height*.55,0);
 camera.position.set(reach*.74,s.height*.88,reach*1.22);
 controls.maxDistance=140;controls.minDistance=1.3;controls.update();
}
function renderData(){
 if(!oak)return;
 const v=oak.stats;
 $('branchCount').textContent=v.branches.toLocaleString('pt-BR');
 $('leafCount').textContent=v.leaves.toLocaleString('pt-BR');
 $('clusterCount').textContent=v.clusters.toLocaleString('pt-BR');
 $('triangleCount').textContent=Math.round(v.triangles).toLocaleString('pt-BR');
}
function setMessage(message){$('status').textContent=message}
function build(fit=false){
 if(busy){scheduled=setTimeout(()=>build(fit),220);return}
 busy=true;$('loading').hidden=false;
 $('loading').textContent='Calculando galhos, raízes e folhas…';
 // Deixa o navegador apresentar o aviso antes de gerar a geometria pesada.
 requestAnimationFrame(()=>setTimeout(()=>{
  try{
   const next=createRealisticOak(THREE,settings,$('quality').value);
   if(oak)dispose(oak.group);
   oak=next;scene.add(next.group);
   next.wood.material.wireframe=wire;
   next.leaves.visible=leavesVisible;
   renderData();if(fit)frame();
   settings=saveOakOptions(settings);
   setMessage('Carvalho salvo · semente '+settings.seed+' · '+oak.stats.leaves.toLocaleString('pt-BR')+' folhas');
  }catch(err){
   console.error(err);setMessage('Falha ao gerar árvore: '+err.message);
  }finally{$('loading').hidden=true;busy=false}
 },30));
}
function requestBuild(fit=false){
 clearTimeout(scheduled);scheduled=setTimeout(()=>build(fit),220)
}
function update(){
 const raw={...settings,seed:Number($('seed').value)};
 for(const key of numeric)raw[key]=Number($(key).value);
 for(const key of ['leafColor','barkColor','season'])raw[key]=$(key).value;
 settings=oakOptions(raw);drawInputs();
}
function saveFile(content,name){
 const blob=new Blob([content],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function events(){
 for(const key of numeric){$(key).addEventListener('input',()=>{update();requestBuild()})}
 for(const key of ['leafColor','barkColor','season'])$(key).addEventListener('input',()=>{update();requestBuild()});
 $('seed').addEventListener('change',()=>{update();requestBuild()});
 $('reroll').onclick=()=>{settings=oakOptions({...settings,seed:Math.floor(Math.random()*999999)+1});drawInputs();build()};
 $('frame').onclick=frame;
 $('wire').onclick=()=>{wire=!wire;if(oak)oak.wood.material.wireframe=wire;$('wire').classList.toggle('active',wire)};
 $('leaves').onclick=()=>{leavesVisible=!leavesVisible;if(oak)oak.leaves.visible=leavesVisible;$('leaves').classList.toggle('active',!leavesVisible)};
 $('build').onclick=()=>{update();build()};
 $('reset').onclick=()=>{if(!confirm('Restaurar as proporções iniciais desta árvore?'))return;settings=oakOptions(OAK_DEFAULTS);drawInputs();build(true)};
 $('export').onclick=()=>{saveFile(oakSerialized(settings),'aethelgard-carvalho-realista.json');setMessage('JSON exportado. Envie esse arquivo na conversa para reproduzir o carvalho.')};
 $('import').onclick=()=>$('file').click();
 $('file').onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
   if(file.size>64000)throw Error('Arquivo maior que 64 KB');
   settings=oakImport(await file.text());drawInputs();build(true);setMessage('Parâmetros do carvalho importados com sucesso.');
  }catch(err){setMessage('Importação inválida: '+err.message)}
  e.target.value='';
 };
 $('copy').onclick=async()=>{
  const data=oakSerialized(settings);
  try{await navigator.clipboard.writeText(data);setMessage('Parâmetros copiados. Cole no ChatGPT.')}
  catch{setMessage('A cópia não foi permitida. Use o botão Exportar JSON.')}
 };
}
function setup(){
 const canvas=$('scene');
 scene=new THREE.Scene();scene.background=new THREE.Color('#e5efe4');scene.fog=new THREE.Fog('#e5efe4',60,180);
 camera=new THREE.PerspectiveCamera(42,1,.1,250);
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(1.7,window.devicePixelRatio||1));
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.45;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 scene.add(new THREE.HemisphereLight('#f4f8e6','#607857',2.6));
 const sun=new THREE.DirectionalLight('#fff2d9',3.1);sun.position.set(-18,30,24);
 sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-25;sun.shadow.camera.right=25;
 sun.shadow.camera.top=25;sun.shadow.camera.bottom=-25;sun.shadow.camera.near=.1;sun.shadow.camera.far=100;
 sun.shadow.bias=-.0007;scene.add(sun);
 const fill=new THREE.DirectionalLight('#b3d5cb',.65);fill.position.set(14,18,-12);scene.add(fill);
 ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:'#dfe9d7',roughness:1}));
 ground.rotation.x=-Math.PI/2;ground.position.y=-.06;ground.receiveShadow=true;scene.add(ground);
 // Anel discreto no chão serve como referência de escala sem parecer um grid.
 const ring=new THREE.Mesh(new THREE.RingGeometry(8.6,8.65,96),new THREE.MeshBasicMaterial({color:'#92a88a',transparent:true,opacity:.28,side:THREE.DoubleSide}));
 ring.rotation.x=-Math.PI/2;ring.position.y=-.055;scene.add(ring);
 controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.065;
 controls.minPolarAngle=.08;controls.maxPolarAngle=Math.PI*.48;controls.enablePan=true;
 const resize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;if(w<2||h<2)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
 new ResizeObserver(resize).observe(canvas);resize();
 let last=performance.now();function animate(t){
  requestAnimationFrame(animate);
  const dt=Math.min((t-last)/1000,.08);last=t;
  if(document.hidden)return;
  controls.update();renderer.render(scene,camera);
 }requestAnimationFrame(animate);
}
try{drawInputs();setup();events();build(true)}catch(err){
 console.error(err);$('loading').textContent='Não foi possível iniciar WebGL';setMessage(err.message)
}
