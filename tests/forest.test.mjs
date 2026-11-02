import assert from 'node:assert/strict';
import {TREE_TYPES,TREE_LABELS,autoTreeAt,hasTree,plantTrees,eraseTrees,clearTreeIndexes} from '../src/forest.js';
import {defaultCatalog,validateCatalog} from '../src/assets.js';
const world=()=>{
 const cols=168,rows=84,biome=Array(cols*rows).fill(2);
 biome[9*cols+9]=0;
 return {version:1,cols,rows,biome,height:Array(cols*rows).fill(10),objects:[],clearedTrees:[],spawn:{x:140,y:140}};
};
const check=(name,fn)=>{fn();console.log('✓ '+name)};
check('8 espécies de árvores são editáveis e têm ao menos 3 peças',()=>{
 assert.equal(TREE_TYPES.length,8);
 const a=validateCatalog(defaultCatalog());
 for(const t of TREE_TYPES){assert.ok(a.assets[t]);assert.ok(TREE_LABELS[t]);assert.ok(a.assets[t].parts.length>=3)}
});
check('plantio de uma palmeira cria objeto persistente no atlas',()=>{
 const w=world(),p={x:40,y:32};assert.equal(plantTrees(w,p,'tree_palm'),1);
 assert.equal(w.objects.length,1);assert.equal(w.objects[0].type,'tree_palm');
 assert.ok(hasTree(w,40,32));
 const copy=JSON.parse(JSON.stringify(w));assert.equal(copy.objects[0].type,'tree_palm');
});
check('repetir pincel na mesma célula não duplica árvores',()=>{
 const w=world();assert.equal(plantTrees(w,{x:35,y:26},'tree_oak'),1);
 assert.equal(plantTrees(w,{x:35,y:26},'tree_oak'),0);
 assert.equal(w.objects.length,1);
});
check('plantações em área têm densidade distinta e respeitam mar',()=>{
 const single=world(),grove=world(),forest=world();
 const p={x:20,y:20};
 assert.equal(plantTrees(single,p,'tree_birch',{radius:6,density:'single'}),1);
 const a=plantTrees(grove,p,'tree_birch',{radius:6,density:'grove'});
 const b=plantTrees(forest,p,'tree_birch',{radius:6,density:'forest'});
 assert.ok(a>1);assert.ok(b>a);
 const sea=world();assert.equal(plantTrees(sea,{x:9,y:9},'tree_palm'),0);
});
check('remover árvores pintadas não remove construções',()=>{
 const w=world(),p={x:65,y:35};plantTrees(w,p,'tree_willow');
 w.objects.push({id:'castle',type:'castle',name:'Castelo',x:19+65/167*987,y:51+35/83*482});
 const removed=eraseTrees(w,p,1);assert.ok(removed>=1);
 assert.equal(w.objects.length,1);assert.equal(w.objects[0].type,'castle');
});
check('árvores automáticas podem ser apagadas sem mudar o bioma',()=>{
 const w=world();let found;
 for(let y=5;y<40&&!found;y++)for(let x=5;x<70;x++)if(autoTreeAt(w,x,y)){found={x,y};break}
 assert.ok(found);const index=found.y*w.cols+found.x;
 assert.equal(w.biome[index],2);assert.equal(hasTree(w,found.x,found.y),true);
 assert.ok(eraseTrees(w,found,1)>=1);
 assert.ok(clearTreeIndexes(w).has(index));assert.equal(hasTree(w,found.x,found.y),false);
 assert.equal(w.biome[index],2);
});
check('máscara de remoção é exportada em JSON e permanece na importação',()=>{
 const w=world(),p={x:17,y:22};eraseTrees(w,p,4);
 const loaded=JSON.parse(JSON.stringify(w));assert.deepEqual(loaded.clearedTrees,w.clearedTrees);
});
check('limite de objetos impede excesso de árvores e entradas inválidas',()=>{
 const w=world();w.objects=Array.from({length:10000},(_,i)=>({id:String(i),type:'castle',name:'Castelo',x:19,y:51}));
 assert.equal(plantTrees(w,{x:50,y:30},'tree'),0);
 assert.equal(plantTrees(world(),{x:40,y:30},'INVALID'),0);
});
console.log('Pincéis de floresta: todos os testes passaram.');
