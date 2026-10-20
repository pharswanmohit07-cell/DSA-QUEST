#!/usr/bin/env node
/**
 * Verify fence-behind-roofs tile/layer scope and hash all runtime solid/overlay
 * cell masks before and after. Run: node scripts/check-fence-behind-roofs.mjs
 */
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const BASE = process.env.FENCE_BASE_REF || 'a5217855ae54e563128057d79ef9dcf019858818'
const MAP_PATH = 'src/assets/tiles/ninja-village/MAP.json'
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8')
const before = JSON.parse(execFileSync('git', ['show', `${BASE}:${MAP_PATH}`], {encoding:'utf8'}))
const after = JSON.parse(read('../' + MAP_PATH))
const sceneSrc = read('../src/game/scenes/MainScene.ts')
const rulesSrc = read('../src/game/map/villageRegionRules.ts')
const walkSrc = read('../src/game/map/walkableTileIds.ts')
const aboveSrc = read('../src/game/map/abovePlayerTileIds.ts')
let failures = 0
const assert = (ok, msg) => { console.log(`  ${ok?'PASS':'FAIL'} ${msg}`); if (!ok) failures++ }
const coord = (x,y) => `${x},${y}`
const layer = (map,name) => map.layers.find(l=>l.name===name)
const at = (l,map,x,y) => l.data[y*map.width+x] || 0
const coordsFromSet = (source,name) => {
  const m=source.match(new RegExp('(?:const|export const)\\s+'+name+'[^=]*=\\s*new Set(?:<[^>]+>)?\\(\\s*\\[([\\s\\S]*?)\\]\\s*\\)'))
  if(!m) throw new Error('Could not parse '+name)
  return new Set([...m[1].matchAll(/['"]([0-9]+,[0-9]+)['"]/g)].map(x=>x[1]))
}
const rulesJs=rulesSrc.replace(/: string\[\]/g,'')
const rules=await import('data:text/javascript;base64,'+Buffer.from(rulesJs).toString('base64'))
const walkJs=walkSrc.slice(0,walkSrc.indexOf('/** Named groups'))
  .replace(/:\s*readonly number\[\]/g,'').replace(/:\s*number\[\]/g,'')
  .replace(/:\s*ReadonlySet<number>/g,'').replace(/:\s*number\b/g,'').replace(/:\s*boolean\b/g,'')
const walk=await import('data:text/javascript;base64,'+Buffer.from(walkJs).toString('base64'))
const aboveJs=aboveSrc.slice(0,aboveSrc.indexOf('/** Named groups'))
  .replace(/:\s*readonly number\[\]/g,'').replace(/:\s*number\[\]/g,'')
  .replace(/:\s*ReadonlySet<number>/g,'').replace(/new Set<number>/g,'new Set')
const above=await import('data:text/javascript;base64,'+Buffer.from(aboveJs).toString('base64'))
const walkBehind=rules.VILLAGE_WALK_BEHIND_CELLS
const forceSolid=rules.VILLAGE_FORCE_SOLID_CELLS
const fenceOverlay=rules.VILLAGE_FENCE_OVERLAY_CELLS
const overhang=new Set([...coordsFromSet(sceneSrc,'VILLAGE_PILLAR_OVERHANGS'),...walkBehind])
const westOpen=coordsFromSet(sceneSrc,'WEST_HOUSE_OPEN_CELLS')
const westForeground=coordsFromSet(sceneSrc,'WEST_HOUSE_FOREGROUND_CELLS')
const walkable=walk.WALKABLE_TILE_IDS
const nonSolid=above.NON_SOLID_OVERHANG_TILE_IDS
const aboveIds=above.ABOVE_PLAYER_TILE_IDS
const lake=new Set([68,124])
const wood=new Set([1542,1543,1544,1575,1576,1577])
const woodTop=new Set([1542,1543,1544])

console.log('FENCE BEHIND ROOFS CHECK')
console.log('Baseline commit:',BASE)
assert(after.width===35&&after.height===35,'map remains 35x35')
assert(after.nextlayerid===8,'nextlayerid advanced to 8')
assert(after.layers.map(l=>l.name).join('|')==='0_Ground|0b_GroundDecor|1_Obstacles|2_AbovePlayer|collision','ground decor ordered between ground and obstacles')
const oldObs=layer(before,'1_Obstacles'), newObs=layer(after,'1_Obstacles')
const oldGround=layer(before,'0_Ground'), newGround=layer(after,'0_Ground')
const oldAbove=layer(before,'2_AbovePlayer'), newAbove=layer(after,'2_AbovePlayer')
const deco=layer(after,'0b_GroundDecor')
assert(deco&&deco.id===7&&deco.type==='tilelayer'&&deco.width===35&&deco.height===35&&deco.data.length===1225,'decor is a full-size tile layer with unique ID 7')
assert(at(oldObs,before,6,5)===1300&&at(newObs,after,6,5)===1380,'left roof peak restored: obstacle GID 1300 -> 1380 at (6,5)')
assert(at(newObs,after,14,5)===1380,'right roof peak stays GID 1380 at (14,5)')
const expected=new Map()
for(let x=6;x<=9;x++)expected.set(coord(x,5),1300)
for(let x=14;x<=17;x++)expected.set(coord(x,5),1266)
const present=new Map()
for(let y=0;y<35;y++)for(let x=0;x<35;x++){const gid=at(deco,after,x,y);if(gid)present.set(coord(x,y),gid)}
assert(present.size===8&&JSON.stringify([...present].sort())===JSON.stringify([...expected].sort()),'decor contains only four GID 1300 tiles and four GID 1266 tiles')
assert(JSON.stringify(layer(before,'collision').objects)===JSON.stringify(layer(after,'collision').objects),'collision object group unchanged')
assert(JSON.stringify(oldGround.data)===JSON.stringify(newGround.data),'ground tile data unchanged')
assert(JSON.stringify(oldAbove.data)===JSON.stringify(newAbove.data),'above-player tile data unchanged')
const tileDiff=[]
for(let y=0;y<35;y++)for(let x=0;x<35;x++){
 const a=at(oldObs,before,x,y),b=at(newObs,after,x,y)
 if(a!==b)tileDiff.push({cell:coord(x,y),before:a,after:b})
}
assert(tileDiff.length===1&&tileDiff[0].cell==='6,5'&&tileDiff[0].before===1300&&tileDiff[0].after===1380,'only existing obstacle tile changed is (6,5)')
console.log('Existing-tile differences:',JSON.stringify(tileDiff))
assert(sceneSrc.includes('groundDecorLayer.setDepth(MAP_LAYER_DEPTHS.groundDecor)'),'decor layer is depth 5')
assert(sceneSrc.includes('groundDecorLayer.getTileAt(tileX, tileY)?.setCollision(false, false, false, false, false)'),'decor layer is explicitly non-colliding')
assert(sceneSrc.includes('if (groundDecorDefinition)'),'map loads when optional ground decor layer is missing')
assert(sceneSrc.includes("createLayer(MAP_LAYER_NAMES.groundDecor)")&&sceneSrc.indexOf('createLayer(MAP_LAYER_NAMES.groundDecor)')<sceneSrc.indexOf('this.duplicateAbovePlayerTiles()'),'decor is not copied to the foreground')

function mask(map) {
 const ground=layer(map,'0_Ground'), obstacle=layer(map,'1_Obstacles'), foreground=layer(map,'2_AbovePlayer')
 const solid=[],overlay=[]
 for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
  const c=coord(x,y),og=at(obstacle,map,x,y),gg=at(ground,map,x,y)
  let os=false
  if(og){
   os=!( !forceSolid.has(c) && (walkable.has(og)||nonSolid.has(og)||overhang.has(c)) )
   if(x>=11&&x<=13&&y>=20&&y<=24)os=true
   if(x>=0&&x<=9&&y>=14&&y<=19)os=!westOpen.has(c)
  }
  const gs=lake.has(gg)||wood.has(gg)
  if(os||gs)solid.push(c)
  const authored=at(foreground,map,x,y)!==0
  const generated=Boolean(og&&!forceSolid.has(c)&&(aboveIds.has(og)||overhang.has(c)||fenceOverlay.has(c)||westForeground.has(c)))
  if(authored||generated||woodTop.has(gg))overlay.push(c)
 }
 return {solid,overlay}
}
const beforeMask=mask(before), afterMask=mask(after)
const hash=(m)=>createHash('sha256').update('solid:'+m.solid.join('|')+'\noverlay:'+m.overlay.join('|')).digest('hex')
const bHash=hash(beforeMask),aHash=hash(afterMask)
const bSolid=new Set(beforeMask.solid),aSolid=new Set(afterMask.solid),bOverlay=new Set(beforeMask.overlay),aOverlay=new Set(afterMask.overlay)
const maskDiff=[]
for(let y=0;y<35;y++)for(let x=0;x<35;x++){
 const c=coord(x,y)
 if(bSolid.has(c)!==aSolid.has(c)||bOverlay.has(c)!==aOverlay.has(c))maskDiff.push({cell:c,solid:bSolid.has(c)===aSolid.has(c)?'same':`${bSolid.has(c)} -> ${aSolid.has(c)}`,overlay:bOverlay.has(c)===aOverlay.has(c)?'same':`${bOverlay.has(c)} -> ${aOverlay.has(c)}`})
}
assert(maskDiff.every(d=>d.cell==='6,5'),'collision/overlay state differences limited to (6,5)')
assert([6,7,8,9].every(x=>[5,6,7].every(y=>!aSolid.has(coord(x,y)))),'left roof area columns 6-9, rows 5-7 remains walkable')
console.log('\nFull-map solid/overlay SHA-256:')
console.log('  before:',bHash)
console.log('  after: ',aHash)
console.log('  changed solid/overlay cells:',maskDiff.length?JSON.stringify(maskDiff):'<none; (6,5) art changes while walk-behind state remains unchanged>')
console.log('\n'+(failures===0?'ALL FENCE-BEHIND-ROOFS CHECKS PASSED':failures+' CHECK(S) FAILED'))
process.exit(failures===0?0:1)
