// Regras puras de plantio e remoção, compartilhadas pelo editor e pelos testes.
// Os elementos removidos do bosque procedural são registrados em clearedTrees;
// assim a remoção não destrói o bioma de floresta.
export const TREE_TYPES = ['tree','tree_oak','tree_pine','tree_birch','tree_willow','tree_palm','tree_cherry','tree_dead'];
export const TREE_LABELS = {
 tree:'Abeto clássico',tree_oak:'Carvalho',tree_pine:'Pinheiro',
 tree_birch:'Bétula',tree_willow:'Salgueiro',
 tree_palm:'Palmeira',tree_cherry:'Cerejeira',tree_dead:'Árvore seca'
};
export const isTreeType = kind => TREE_TYPES.includes(kind);
export const hashCell = (x,y,salt=0) => {
 let n=Math.imul(x+salt+1,374761393)^Math.imul(y+17,668265263);
 n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;
};
export function autoTreeAt(world,x,y){
 if(x<1||y<1||x>=world.cols-1||y>=world.rows-1)return null;
 const i=y*world.cols+x,b=world.biome[i],r=hashCell(x,y);
 if(b===2&&r>.26){
  const pool=['tree_oak','tree_pine','tree_birch','tree','tree_willow','tree_oak','tree_cherry'];
  return pool[Math.floor(hashCell(x,y,7)*pool.length)];
 }
 if(b===5&&r>.88)return 'tree_pine';
 if(b===4&&r>.96)return 'tree_palm';
 return null;
}
export function clearTreeIndexes(world){
 if(!Array.isArray(world.clearedTrees))world.clearedTrees=[];
 return new Set(world.clearedTrees);
}
export function hasTree(world,x,y){
 if(world.objects.some(o=>isTreeType(o.type)&&Math.round((o.x-19)/987*(world.cols-1))===x&&Math.round((o.y-51)/482*(world.rows-1))===y))return true;
 return !clearTreeIndexes(world).has(y*world.cols+x)&&!!autoTreeAt(world,x,y);
}
export function plantTrees(world,p,kind,{radius=1,density='single'}={}){
 if(!isTreeType(kind))return 0;
 if(world.objects.length>=10000)return 0;
 const placed=new Set(world.objects.filter(o=>isTreeType(o.type)).map(o=>{
  const x=Math.round((o.x-19)/987*(world.cols-1)),y=Math.round((o.y-51)/482*(world.rows-1));return y*world.cols+x;
 }));
 const radiusNum=Math.max(1,Math.min(9,Math.round(radius)));
 const candidates=[];
 if(density==='single')candidates.push([p.x,p.y]);
 else for(let y=Math.max(1,p.y-radiusNum);y<Math.min(world.rows-1,p.y+radiusNum+1);y++)
  for(let x=Math.max(1,p.x-radiusNum);x<Math.min(world.cols-1,p.x+radiusNum+1);x++){
   if(Math.hypot(x-p.x,y-p.y)>radiusNum)continue;
   if(hashCell(x,y,world.objects.length%19)> (density==='grove'?.27:.67))continue;
   candidates.push([x,y]);
  }
 let count=0;
 for(const [x,y] of candidates){
  if(x<1||y<1||x>=world.cols-1||y>=world.rows-1)continue;
  const i=y*world.cols+x;if(world.biome[i]===0||placed.has(i))continue;
  if(world.objects.length>=10000)break;
  world.objects.push({
   id:'planted-'+Date.now().toString(36)+'-'+i.toString(36)+'-'+world.objects.length,
   type:kind,name:TREE_LABELS[kind],
   x:19+x/(world.cols-1)*987,y:51+y/(world.rows-1)*482
  });
  placed.add(i);count++;
 }
 return count;
}
export function eraseTrees(world,p,radius=2){
 const r=Math.max(1,Math.min(9,Math.round(radius)));
 const nearby=(x,y)=>Math.hypot(x-p.x,y-p.y)<=r;
 const before=world.objects.length;
 world.objects=world.objects.filter(o=>{
  if(!isTreeType(o.type))return true;
  const x=Math.round((o.x-19)/987*(world.cols-1)),y=Math.round((o.y-51)/482*(world.rows-1));
  return !nearby(x,y);
 });
 const hidden=clearTreeIndexes(world),prior=hidden.size;
 for(let y=Math.max(1,p.y-r);y<Math.min(world.rows-1,p.y+r+1);y++)
 for(let x=Math.max(1,p.x-r);x<Math.min(world.cols-1,p.x+r+1);x++){
  if(nearby(x,y)&&autoTreeAt(world,x,y))hidden.add(y*world.cols+x);
 }
 world.clearedTrees=[...hidden].sort((a,b)=>a-b);
 return before-world.objects.length+hidden.size-prior;
}
