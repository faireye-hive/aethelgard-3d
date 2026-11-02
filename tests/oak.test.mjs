import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OAK_DEFAULTS,oakOptions,oakSerialized,oakImport,estimateOak,createRealisticOak} from '../src/oak-realistic.js';

const run=(name,fn)=>{const start=performance.now();fn();console.log('✓ '+name+' ('+Math.round(performance.now()-start)+'ms)')};

run('Parâmetros de carvalho são estáveis e exportáveis em JSON',()=>{
 const a=oakOptions({...OAK_DEFAULTS,height:17,spread:21,seed:451,season:'autumn'});
 assert.equal(a.height,17);assert.equal(a.spread,21);assert.equal(a.season,'autumn');
 assert.deepEqual(oakImport(oakSerialized(a)),a);
});
run('Arquivos inválidos ou valores extremos são tratados com limites',()=>{
 const x=oakOptions({height:Infinity,spread:100,mainBranches:200,seed:-5,leafSize:0});
 assert.equal(x.height,12);assert.equal(x.spread,30);assert.equal(x.mainBranches,19);
 assert.equal(x.seed,1);assert.equal(x.leafSize,.15);
 assert.throws(()=>oakImport('{"format":"wrong"}'));
});
run('Modelo detalhado monta tronco contínuo e folhas reais em malha 3D',()=>{
 const result=createRealisticOak(THREE,{...OAK_DEFAULTS,seed:42},'draft');
 const {group,wood,leaves,stats}=result;
 assert.ok(group.isGroup&&wood.isMesh&&leaves.isInstancedMesh);
 assert.ok(wood.geometry.attributes.position.count>10000);
 assert.ok(wood.geometry.index.count>10000);
 assert.ok(leaves.geometry.index.count>18);
 assert.ok(leaves.count>=2000);
 assert.ok(stats.branches>120);
 assert.ok(stats.clusters>50);
 const bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3());
 assert.ok(size.x>7&&size.z>7&&size.y>7);
 for(const v of wood.geometry.attributes.position.array)assert.ok(Number.isFinite(v));
 for(const v of wood.geometry.attributes.normal.array)assert.ok(Number.isFinite(v));
 for(const v of wood.geometry.attributes.color.array)assert.ok(Number.isFinite(v));
});
run('A mesma semente gera exatamente a mesma geometria de tronco',()=>{
 const a=createRealisticOak(THREE,{...OAK_DEFAULTS,seed:987},'draft');
 const b=createRealisticOak(THREE,{...OAK_DEFAULTS,seed:987},'draft');
 assert.equal(a.stats.branches,b.stats.branches);assert.equal(a.stats.leaves,b.stats.leaves);
 const p=a.wood.geometry.attributes.position.array,q=b.wood.geometry.attributes.position.array;
 assert.equal(p.length,q.length);
 for(let i=0;i<p.length;i+=19)assert.equal(p[i],q[i]);
});
run('Carvalho pronto para uso no mundo tem menos folhas do que o do laboratório',()=>{
 const world=estimateOak(OAK_DEFAULTS,'world'),hero=estimateOak(OAK_DEFAULTS,'hero');
 assert.ok(world.leafBudget<hero.leafBudget);
 const tree=createRealisticOak(THREE,OAK_DEFAULTS,'world');
 assert.equal(tree.leaves.count,world.leafBudget);
 assert.ok(tree.stats.triangles>tree.stats.branches);
});
console.log('Carvalho realista: testes concluídos.');
