#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
const root=process.cwd()
const map=JSON.parse(fs.readFileSync(path.join(root,'src/assets/tiles/ninja-village/MAP.json'),'utf8'))
const out=path.join(root,'src/game/map/villageCells.json')
const current=JSON.parse(fs.readFileSync(out,'utf8'))
const obstacles=map.layers.find(layer=>layer.name==='1_Obstacles').data
const cells={}
for(let y=current.bounds.minY;y<=current.bounds.maxY;y++)for(let x=current.bounds.minX;x<=current.bounds.maxX;x++)cells[x+','+y]={solid:obstacles[y*map.width+x]>0,overlay:false}
for(const object of current.objects){
 for(const c of object.upper||[])cells[c[0]+','+c[1]]={solid:false,overlay:true}
 for(const c of object.base||[])cells[c[0]+','+c[1]]={solid:true,overlay:false}
 for(const c of object.solidCells||[])cells[c[0]+','+c[1]]={solid:true,overlay:false}
}
current.cells=cells
current.generatedFrom={...current.generatedFrom,sourceBlobSha:'regenerated-from-current-MAP.json'}
fs.writeFileSync(out,JSON.stringify(current,null,2)+'\n')
console.log('Wrote '+Object.keys(cells).length+' explicit village cells.')
