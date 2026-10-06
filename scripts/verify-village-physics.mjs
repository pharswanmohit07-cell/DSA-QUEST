#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const map=JSON.parse(fs.readFileSync(path.join(root,'src/assets/tiles/ninja-village/MAP.json'),'utf8'))
if (!map.layers.find(layer=>layer.name==='1_Obstacles') || !map.layers.find(layer=>layer.name==='0_Ground')) throw new Error('MAP.json missing required layers')
const village=JSON.parse(fs.readFileSync(path.join(root,'src/game/map/villageCells.json'),'utf8'))
const body={width:10,height:8,offsetX:3,offsetY:7}
const rect=(x,y)=>({left:x*16,top:y*16,right:(x+1)*16,bottom:(y+1)*16})
const bodyRect=(x,y)=>({left:x+3,top:y+7,right:x+13,bottom:y+15})
const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top
const solids=[]
for(let y=village.bounds.minY;y<=village.bounds.maxY;y++)for(let x=village.bounds.minX;x<=village.bounds.maxX;x++)if(village.cells[x+','+y]?.solid)solids.push(rect(x,y))
const hit=(sx,sy)=>solids.some(r=>overlap(bodyRect(sx,sy),r))
function blocked(base,dir){
 const[x,y]=base,r=rect(x,y);let sx=r.left+8,sy=r.top+8,ex=sx,ey=sy
 if(dir==='north'){sy=r.top-15;ey=r.top+12}else if(dir==='south'){sy=r.bottom-7;ey=r.bottom-34}else if(dir==='west'){sx=r.left-13;ex=r.left+16}else{sx=r.right-3;ex=r.right-32}
 for(let i=0;i<=60;i++){const q=i/60;if(hit(sx+(ex-sx)*q,sy+(ey-sy)*q))return true}return false
}
function upperPasses(upper,base){
 const sx=upper[0]*16+2,top=upper[1]*16,bt=base[1]*16
 for(let i=0;i<=80;i++){const q=i/80;if(hit(sx,top-15+(bt+1-(top-15))*q))return false}return true
}
const rows=[]
for(const object of village.objects){
 const bases=object.base||object.solidCells||[]
 for(const dir of['north','south','west','east'])for(const b of bases)rows.push({category:object.category,object:object.name,probe:dir+' base '+b.join(','),expected:'blocked',pass:blocked(b,dir)})
 if(object.upper?.length&&bases.length)rows.push({category:object.category,object:object.name,probe:'north upper '+object.upper[0].join(','),expected:'upper-passable-before-base',pass:upperClear(object.upper[0])})
}
console.table(rows)
for(const category of['houses_dojo','pillars_gate_posts','trees']){
 const count=village.objects.filter(o=>o.category===category).length
 if(count<5)console.log('INSUFFICIENT EXAMPLES: '+category+' has '+count+' real map objects; no objects were invented.')
}
const failures=rows.filter(r=>!r.pass)
console.log('AABB body 10x8 offset 3,7 | failures='+failures.length)
if(failures.length)process.exitCode=1
