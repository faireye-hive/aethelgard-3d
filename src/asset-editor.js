import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {ASSET_NAMES,ASSET_ORDER,DEFAULT_ASSETS,loadCatalog,saveCatalog,validateCatalog,cloneCatalog,createAsset} from './assets.js';

const $=id=>document.getElementById(id), fmt=x=>Number(x).toFixed(2).replace(/\.?0+$/,'');
const ICONS={player:'🧍',tree:'🌲',rock:'🪨',castle:'🏰',city:'🏘',port:'⚓',ruins:'🏛'};
const KIND={player:'Herói',tree:'Natureza',rock:'Natureza',castle:'Construções',city:'Construções',port:'Construções',ruins:'Construções'};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
let catalog=loadCatalog(),selected='player',selectedPart='body',history=[],future=[];
let renderer,scene,camera,controls,model,modelParts={},previewGroup,outline,ground,grid;
let showGrid=true,wire=false,mode='json',lastSnapshot=null,activeEdit=false;
let toastTimer;
const config=()=>catalog.assets[selected];
const part=()=>config().parts.find(p=>p.id===selectedPart);
function notice(msg){$('status').textContent=msg;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('status').textContent='Estúdio pronto · alterações locais',5000)}
function save(){try{catalog=saveCatalog(catalog);$('saveStatus').textContent='● Salvo neste navegador';$('saveStatus').style.color='#9bcca7';}
 catch(e){$('saveStatus').textContent='● Não foi possível salvar';$('saveStatus').style.color='#ffc4a4';notice(e.message)} }
function beforeChange(){return JSON.stringify(catalog)}
function record(before){const after=JSON.stringify(catalog);if(before===after)return;history.push(before);if(history.length>40)history.shift();future=[];updateHistory()}
function updateHistory(){$('undo').disabled=!history.length;$('redo').disabled=!future.length}
function mutate(fn){finalizeEdit();const before=beforeChange();fn();record(before);save();selectAsset(selected,false)}
function finalizeEdit(){if(!activeEdit)return;const before=lastSnapshot;activeEdit=false;lastSnapshot=null;if(before)record(before)}
function beginEdit(){if(!activeEdit){activeEdit=true;lastSnapshot=beforeChange()}}
function applyInput(){save();rebuildPreview(false);renderPartList();renderCode()}
function undo(){
 finalizeEdit();if(!history.length)return;future.push(beforeChange());catalog=JSON.parse(history.pop());updateHistory();save();selectAsset(selected,false)
}
function redo(){
 finalizeEdit();if(!future.length)return;history.push(beforeChange());catalog=JSON.parse(future.pop());updateHistory();save();selectAsset(selected,false)
}
function clearObject(root){if(!root)return;root.traverse(node=>{node.geometry?.dispose();if(node.material){const materials=Array.isArray(node.material)?node.material:[node.material];materials.forEach(m=>m.dispose())}});root.parent?.remove(root)}
function worldBounds(){return new THREE.Box3().setFromObject(previewGroup)}
function resetCamera(){
 if(!previewGroup)return;
 const box=worldBounds(),size=box.getSize(new THREE.Vector3()),ctr=box.getCenter(new THREE.Vector3());
 const radius=Math.max(size.length()*.75,2.2);
 controls.target.copy(ctr);camera.position.copy(ctr).add(new THREE.Vector3(radius*1.15,radius*.72,radius*1.55));
 controls.minDistance=.65;controls.maxDistance=95;controls.update()
}
function rebuildPreview(fit=false){
 if(!scene)return;
 if(outline){outline.parent?.remove(outline);outline.geometry?.dispose();outline.material?.dispose();outline=null}
 clearObject(previewGroup);
 const asset=createAsset(selected,catalog,THREE);previewGroup=asset.group;model=asset;modelParts=asset.meshes;
 scene.add(previewGroup);
 for(const mesh of Object.values(modelParts))mesh.material.wireframe=wire;
 const chosen=modelParts[selectedPart];
 if(chosen){outline=new THREE.BoxHelper(chosen,0xf9d68c);outline.material.depthTest=false;outline.material.transparent=true;outline.material.opacity=.95;scene.add(outline)}
 const bounds=worldBounds(),measure=bounds.getSize(new THREE.Vector3());
 $('sizeText').textContent='Dimensões aproximadas: '+fmt(measure.x)+' largura × '+fmt(measure.y)+' altura × '+fmt(measure.z)+' profundidade (unidades 3D)';
 $('partInfo').textContent=chosen?'Peça selecionada: '+chosen.name:'Selecione uma peça no modelo';
 if(fit)resetCamera();
}
function renderAssets(){
 const root=$('assetList');root.replaceChildren();
 for(const key of ASSET_ORDER){
  const btn=document.createElement('button');btn.type='button';btn.className='asset-btn'+(key===selected?' active':'');
  btn.setAttribute('aria-current',key===selected?'true':'false');
  const icon=document.createElement('span');icon.className='asset-icon';icon.textContent=ICONS[key];
  const info=document.createElement('span');info.textContent=ASSET_NAMES[key];const sub=document.createElement('small');sub.textContent=KIND[key];info.append(sub);
  btn.append(icon,info);btn.addEventListener('click',()=>selectAsset(key,true));root.append(btn)
 }
}
function renderPartList(){
 const root=$('partList');root.replaceChildren();$('partCount').textContent=config().parts.length+' peças';
 for(const p of config().parts){
  const btn=document.createElement('button');btn.type='button';btn.className='part-button'+(p.id===selectedPart?' selected':'');btn.setAttribute('role','option');btn.setAttribute('aria-selected',String(p.id===selectedPart));
  const dot=document.createElement('span');dot.className='dot';dot.style.backgroundColor=p.color;
  const name=document.createElement('span');name.textContent=p.label;btn.append(dot,name);btn.addEventListener('click',()=>selectPart(p.id));root.append(btn)
 }
}
function renderInspector(){
 const c=config();$('modelScale').value=Math.min(4,c.scale);$('scaleNumber').value=c.scale;$('scaleRead').textContent=fmt(c.scale)+'×';
 for(let i=0;i<3;i++)$('axis'+['X','Y','Z'][i]).value=c.axes[i];
 const p=part();if(!p)return;
 $('partLabel').value=p.label;$('partShape').value=p.shape;$('partColor').value=p.color;
 $('pivotRow').hidden=selected!=='player';$('partPivot').value=p.pivot||'';
 for(const [container,key] of [['positionControls','pos'],['sizeControls','size'],['rotationControls','rot']]){
  for(const input of $(container).querySelectorAll('input'))input.value=p[key][Number(input.dataset.axis)];
 }
 $('deletePart').disabled=c.parts.length<=1;$('newPart').disabled=c.parts.length>=80;
 $('animate').disabled=selected!=='player';if(selected!=='player'){$('animate').checked=false}
}
function selectPart(id){
 finalizeEdit();if(!config().parts.some(p=>p.id===id))return;selectedPart=id;renderPartList();renderInspector();rebuildPreview(false)
}
function selectAsset(id,fit){
 finalizeEdit();if(!catalog.assets[id])return;selected=id;
 if(!config().parts.some(p=>p.id===selectedPart))selectedPart=config().parts[0].id;
 // By default, open the first meaningful part when switching between assets.
 if(fit)selectedPart=config().parts[0].id;
 renderAssets();renderPartList();renderInspector();rebuildPreview(fit);renderCode();
 $('assetTitle').textContent=ASSET_NAMES[id];$('previewBadge').textContent=id==='player'?'PERSONAGEM EDITÁVEL':'MODELO PROCEDURAL'
}
function renderCode(){
 const content=mode==='json'?JSON.stringify(catalog,null,2):'// Aethelgard 3D — modelos exportados do Estúdio de Assets\n// Envie este código ou o arquivo JSON no ChatGPT para integrar as mudanças ao projeto.\nexport const EDITED_AETHELGARD_ASSETS = '+JSON.stringify(catalog,null,2)+';\n';
 $('codeOutput').value=content;$('codeTitle').textContent=mode==='json'?'Catálogo JSON · pode ser reimportado':'Código JavaScript · pronto para enviar';
 $('showJson').classList.toggle('selected',mode==='json');$('showJs').classList.toggle('selected',mode==='js')
}
function download(content,name,mime){
 const link=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type:mime}));
 link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1200)
}
function safeNumber(value,min,max){const n=Number(value);return value!==''&&Number.isFinite(n)&&n>=min&&n<=max?n:null}
function bindControls(){
 $('modelScale').addEventListener('input',e=>{beginEdit();config().scale=Number(e.target.value);$('scaleNumber').value=config().scale;$('scaleRead').textContent=fmt(config().scale)+'×';applyInput()});
 $('scaleNumber').addEventListener('input',e=>{const n=safeNumber(e.target.value,.05,20);if(n===null)return;beginEdit();config().scale=n;$('modelScale').value=Math.min(4,n);$('scaleRead').textContent=fmt(n)+'×';applyInput()});
 for(let i=0;i<3;i++)$('axis'+['X','Y','Z'][i]).addEventListener('input',e=>{const n=safeNumber(e.target.value,.05,10);if(n===null)return;beginEdit();config().axes[i]=n;applyInput()});
 $('partLabel').addEventListener('input',e=>{if(!e.target.value.trim())return;beginEdit();part().label=e.target.value;applyInput()});
 $('partShape').addEventListener('change',e=>mutate(()=>{part().shape=e.target.value}));
 $('partColor').addEventListener('input',e=>{beginEdit();part().color=e.target.value;applyInput()});
 $('partPivot').addEventListener('change',e=>mutate(()=>{part().pivot=e.target.value}));
 for(const [container,key,min,max] of [['positionControls','pos',-30,30],['sizeControls','size',.02,30],['rotationControls','rot',-360,360]]){
  for(const input of $(container).querySelectorAll('input')){
   input.addEventListener('input',e=>{const n=safeNumber(e.target.value,min,max);if(n===null)return;beginEdit();part()[key][Number(e.target.dataset.axis)]=n;applyInput()});
  }
 }
 // Uma sessão de digitação/arrasto de slider vira uma única operação Desfazer.
 $('partInspector').addEventListener('focusout',e=>{if(!e.currentTarget.contains(e.relatedTarget)){finalizeEdit()}});
 for(const id of ['modelScale','scaleNumber','axisX','axisY','axisZ'])$(id).addEventListener('change',finalizeEdit);
 for(const id of ['partLabel','partColor'])$(id).addEventListener('change',finalizeEdit);
 for(const box of ['positionControls','sizeControls','rotationControls'])$(box).addEventListener('change',finalizeEdit);
 $('newPart').onclick=()=>mutate(()=>{
  if(config().parts.length>=80){notice('Limite de 80 peças por modelo');return}
  const id='piece_'+Date.now()+'_'+Math.floor(Math.random()*1000);
  config().parts.push({id,label:'Nova peça',shape:'box',pos:[0,1.2,0],size:[.65,.65,.65],rot:[0,0,0],color:'#d3bc98',pivot:''});
  selectedPart=id
 });
 $('clonePart').onclick=()=>mutate(()=>{
  if(config().parts.length>=80){notice('Limite de 80 peças por modelo');return}
  const other=cloneCatalog(part());other.id='piece_'+Date.now()+'_'+Math.floor(Math.random()*1000);other.label=other.label+' (cópia)';
  config().parts.push(other);selectedPart=other.id
 });
 $('deletePart').onclick=()=>mutate(()=>{if(config().parts.length<=1)return;config().parts=config().parts.filter(p=>p.id!==selectedPart);selectedPart=config().parts[0].id});
 $('resetAsset').onclick=()=>{if(!confirm('Restaurar apenas '+ASSET_NAMES[selected]+'?'))return;mutate(()=>{catalog.assets[selected]=cloneCatalog(DEFAULT_ASSETS[selected]);selectedPart=catalog.assets[selected].parts[0].id})};
 $('resetAll').onclick=()=>{if(!confirm('Restaurar TODOS os modelos? Exporte o JSON antes para manter uma cópia.'))return;mutate(()=>{for(const key of ASSET_ORDER)catalog.assets[key]=cloneCatalog(DEFAULT_ASSETS[key]);selectedPart=config().parts[0].id})};
 $('undo').onclick=undo;$('redo').onclick=redo;
 $('resetCamera').onclick=resetCamera;
 $('toggleGrid').onclick=()=>{showGrid=!showGrid;grid.visible=showGrid;ground.visible=showGrid;$('toggleGrid').classList.toggle('selected',showGrid)};
 $('toggleWire').onclick=()=>{wire=!wire;$('toggleWire').classList.toggle('selected',wire);rebuildPreview(false)};
 $('showJson').onclick=()=>{mode='json';renderCode()};
 $('showJs').onclick=()=>{mode='js';renderCode()};
 $('exportJson').onclick=()=>{finalizeEdit();download(JSON.stringify(catalog,null,2),'aethelgard-assets.json','application/json');notice('Catálogo JSON exportado. Anexe este arquivo no ChatGPT.')};
 $('exportJs').onclick=()=>{finalizeEdit();mode='js';renderCode();download($('codeOutput').value,'aethelgard-assets-custom.js','text/javascript');notice('Código JavaScript exportado.')};
 $('importButton').onclick=()=>$('importFile').click();
 $('importFile').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  if(file.size>1000000){notice('Arquivo acima de 1 MB; exporte apenas o catálogo');e.target.value='';return}
  try{
   const loaded=validateCatalog(JSON.parse(await file.text()));
   mutate(()=>{catalog=loaded;selectedPart=catalog.assets[selected].parts[0].id});
   notice('Catálogo importado e aplicado no navegador.')
  }catch(err){notice('Falha ao importar: '+err.message)}
  e.target.value=''
 };
 $('copyCode').onclick=async()=>{
  const out=$('codeOutput');try{await navigator.clipboard.writeText(out.value);notice('Código copiado. Cole-o na conversa.')}
  catch{out.focus();out.select();const ok=document.execCommand?.('copy');notice(ok?'Código copiado.':'Texto selecionado: use Ctrl+C para copiar.')}
 };
 $('animate').onchange=e=>{if(!e.target.checked)for(const pivot of Object.values(model.pivots||{}))pivot.rotation.x=0};
 window.addEventListener('keydown',e=>{
  const editable=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
  if(editable)return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo()}
 });
}
function initScene(){
 scene=new THREE.Scene();scene.background=new THREE.Color('#1d3330');
 scene.fog=new THREE.Fog('#1d3330',50,120);
 scene.add(new THREE.HemisphereLight('#cdeef1','#6b5043',2.2));
 const sun=new THREE.DirectionalLight('#ffe3b2',2.6);sun.position.set(-7,12,10);scene.add(sun);
 const fill=new THREE.DirectionalLight('#82c0bf',1.5);fill.position.set(8,7,-4);scene.add(fill);
 const c=$('preview');renderer=new THREE.WebGLRenderer({canvas:c,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.4;
 camera=new THREE.PerspectiveCamera(48,1,.05,250);controls=new OrbitControls(camera,c);
 controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=.65;controls.maxDistance=95;controls.maxPolarAngle=1.6;
 ground=new THREE.Mesh(new THREE.PlaneGeometry(35,35),new THREE.MeshStandardMaterial({color:'#192c27',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.06;scene.add(ground);
 grid=new THREE.GridHelper(35,35,'#577361','#345046');grid.position.y=-.052;scene.add(grid);
 const resize=()=>{const w=c.clientWidth,h=c.clientHeight;if(w<2||h<2)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
 new ResizeObserver(resize).observe(c);resize();
 let pointer=null;
 c.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY};});
 c.addEventListener('pointerup',e=>{
  if(!pointer||Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>5){pointer=null;return}
  pointer=null;
  const rect=c.getBoundingClientRect(),mouse=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
  const ray=new THREE.Raycaster;ray.setFromCamera(mouse,camera);
  const hit=ray.intersectObjects(Object.values(modelParts),false)[0];
  if(hit?.object?.userData?.partId)selectPart(hit.object.userData.partId)
 });
 c.addEventListener('pointercancel',()=>{pointer=null});
 let time=0,last=performance.now();
 function tick(t){
  requestAnimationFrame(tick);const dt=Math.min(.05,(t-last)/1000);last=t;
  if(!document.hidden){
   time+=dt;
   if(model&&selected==='player'){
    const motion=$('animate').checked?Math.sin(time*5)*.48:0;
    const p=model.pivots;p.armL.rotation.x=motion;p.armR.rotation.x=-motion;p.legL.rotation.x=-motion;p.legR.rotation.x=motion;
   }
   if(outline)outline.update();
   controls.update();renderer.render(scene,camera)
  }
 }
 requestAnimationFrame(tick);
}
function initialize(){
 initScene();bindControls();renderAssets();selectAsset('player',true);
 $('status').textContent='Estúdio pronto · alterações locais';save();
}
try{initialize()}catch(err){
 console.error(err);$('status').textContent='Erro na prévia 3D: '+err.message;
}
