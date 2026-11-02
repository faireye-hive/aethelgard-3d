import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ASSET_ORDER,ASSET_NAMES,VERSION,DEFAULT_ASSETS,defaultCatalog,validateCatalog,createAsset,cloneCatalog} from '../src/assets.js';
import {TREE_TYPES} from '../src/forest.js';

const check=(label,fn)=>{fn();console.log('✓ '+label)};
check('14 assets criados (personagem, oito espécies de árvores, pedra e construções)',()=>{
 assert.equal(ASSET_ORDER.length,14);
 assert.equal(TREE_TYPES.length,8);
 for(const k of ASSET_ORDER)assert.ok(ASSET_NAMES[k]&&DEFAULT_ASSETS[k]);
});
check('catálogo padrão válido; cada peça tem identificador único',()=>{
 const x=validateCatalog(defaultCatalog());assert.equal(x.version,VERSION);
 for(const k of ASSET_ORDER){const ids=x.assets[k].parts.map(p=>p.id);assert.equal(ids.length,new Set(ids).size)}
});
check('escala inicial do personagem é menor que a anterior',()=>{
 assert.equal(DEFAULT_ASSETS.player.scale,.55);
});
check('exportação e importação JSON preservam peças, cores e escalas',()=>{
 const x=defaultCatalog();x.assets.tree.scale=1.35;x.assets.rock.parts[0].color='#112233';x.assets.player.axes[1]=.8;
 const y=validateCatalog(JSON.parse(JSON.stringify(x)));
 assert.equal(y.assets.tree.scale,1.35);assert.equal(y.assets.rock.parts[0].color,'#112233');assert.equal(y.assets.player.axes[1],.8);
});
check('editar um asset não altera os outros modelos padrão',()=>{
 const x=defaultCatalog();x.assets.tree.parts[0].size[0]=8;
 assert.notEqual(x.assets.tree.parts[0].size[0],DEFAULT_ASSETS.tree.parts[0].size[0]);
 assert.equal(cloneCatalog(x).assets.rock.parts.length,DEFAULT_ASSETS.rock.parts.length);
});
check('importação rejeita peças maliciosas ou dimensões inválidas',()=>{
 const x=defaultCatalog();x.assets.rock.parts[0].shape='script';assert.throws(()=>validateCatalog(x));
 const y=defaultCatalog();y.assets.player.scale=-1;assert.throws(()=>validateCatalog(y));
 const z=defaultCatalog();z.assets.tree.parts[0].pos=[0,NaN,0];assert.throws(()=>validateCatalog(z));
 const w=defaultCatalog();w.assets.tree.parts.push(cloneCatalog(w.assets.tree.parts[0]));assert.throws(()=>validateCatalog(w));
});
check('geometria compartilhada gera as peças e pivôs animáveis',()=>{
 class Coordinates{set(){return this}fromArray(){return this}}
 class Node{
  constructor(){this.children=[];this.scale=new Coordinates;this.position=new Coordinates;this.rotation=new Coordinates;this.userData={}}
  add(child){this.children.push(child)}
 }
 class Group extends Node{}
 class Mesh extends Node{constructor(geo,material){super();this.geometry=geo;this.material=material}}
 const empty=class{constructor(...args){this.args=args}};
 const THREE={
  BoxGeometry:empty,ConeGeometry:empty,CylinderGeometry:empty,SphereGeometry:empty,DodecahedronGeometry:empty,
  MeshStandardMaterial:empty,Group,Mesh,MathUtils:{degToRad:n=>n*Math.PI/180}
 };
 const catalog=defaultCatalog(),a=createAsset('player',catalog,THREE);
 assert.equal(a.group.children.length,catalog.assets.player.parts.filter(p=>!p.pivot).length+4); // root meshes + 4 pivots
 assert.ok(a.pivots.armL&&a.pivots.armR&&a.pivots.legL&&a.pivots.legR);
 assert.ok(a.meshes.head&&a.meshes.backpack&&a.meshes.swordBlade);
 assert.equal(a.group.scale.constructor,Coordinates);
 const tree=createAsset('tree',catalog,THREE);
 assert.equal(Object.keys(tree.meshes).length,catalog.assets.tree.parts.length);
 for(const kind of TREE_TYPES)assert.ok(catalog.assets[kind].parts.length>=3);
});
check('o mundo usa o catálogo de assets e contém link para editor',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(app.includes("createScatter('tree'")&&app.includes("createAsset('player'")&&app.includes("assetCatalog=loadCatalog()"));
 assert.ok(html.includes('href="./asset-editor.html"'));
});

check('catálogos antigos recebem as novas espécies, preservando edição prévia',()=>{
 const old=defaultCatalog();old.assets.tree.scale=1.23;
 for(const key of TREE_TYPES.slice(1))delete old.assets[key];
 const upgraded=validateCatalog(old);
 assert.equal(upgraded.assets.tree.scale,1.23);
 for(const key of TREE_TYPES)assert.ok(upgraded.assets[key]);
});
console.log('Catálogo de assets: todos os testes passaram.');
