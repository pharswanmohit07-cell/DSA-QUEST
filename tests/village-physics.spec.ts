import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
const expected=JSON.parse(fs.readFileSync(path.resolve('tests/village-expected-behavior.json'),'utf8'))
const village=JSON.parse(fs.readFileSync(path.resolve('src/game/map/villageCells.json'),'utf8'))
const map=JSON.parse(fs.readFileSync(path.resolve('src/assets/tiles/ninja-village/MAP.json'),'utf8'))
type Point={x:number;y:number}
async function startGame(page:Page){await page.goto('/?debug=1');await page.getByRole('button',{name:/^PLAY$/i}).click();await page.waitForSelector('#game-container canvas');await page.waitForFunction(()=>Boolean((globalThis as {__dsaVillagePhysicsProbe?:unknown}).__dsaVillagePhysicsProbe))}
async function setPlayer(page:Page,p:Point){await page.evaluate(v=>{const q=(globalThis as {__dsaVillagePhysicsProbe?:{setPlayerTile:(x:number,y:number)=>void}}).__dsaVillagePhysicsProbe;if(!q)throw new Error('probe unavailable');q.setPlayerTile(v.x,v.y)},p)}
async function getPlayer(page:Page){return page.evaluate(()=>{const q=(globalThis as {__dsaVillagePhysicsProbe?:{getPlayerTile:()=>Point}}).__dsaVillagePhysicsProbe;if(!q)throw new Error('probe unavailable');return q.getPlayerTile()})}
async function getTile(page:Page,p:Point){return page.evaluate(v=>{const q=(globalThis as {__dsaVillagePhysicsProbe?:{getTile:(x:number,y:number)=>unknown}}).__dsaVillagePhysicsProbe;if(!q)throw new Error('probe unavailable');return q.getTile(v.x,v.y)},p)}
async function debugEnabled(page:Page){return page.evaluate(()=>{const q=(globalThis as {__dsaVillagePhysicsProbe?:{getDebugOverlayEnabled:()=>boolean}}).__dsaVillagePhysicsProbe;return q?.getDebugOverlayEnabled()??false})}
const startFor=(b:[number,number],d:string):Point=>d==='north'?{x:b[0],y:b[1]-1}:d==='south'?{x:b[0],y:b[1]+1}:d==='west'?{x:b[0]-1,y:b[1]}:{x:b[0]+1,y:b[1]}
const keyFor:Record<string,string>={north:'ArrowDown',south:'ArrowUp',west:'ArrowRight',east:'ArrowLeft'}
test.describe.serial('explicit village physics',()=>{
 test('debug overlay works with ?debug=1 and F3',async({page})=>{await startGame(page);expect(await debugEnabled(page)).toBe(true);await page.keyboard.press('F3');await page.waitForFunction(()=>Boolean((globalThis as {__dsaVillagePhysicsProbe?:{getDebugOverlayEnabled:()=>boolean}}).__dsaVillagePhysicsProbe?.getDebugOverlayEnabled()===false));expect(await debugEnabled(page)).toBe(false);await page.keyboard.press('F3');await page.waitForFunction(()=>Boolean((globalThis as {__dsaVillagePhysicsProbe?:{getDebugOverlayEnabled:()=>boolean}}).__dsaVillagePhysicsProbe?.getDebugOverlayEnabled()===true))})
 test('real object bases block from all four sides and upper art is walk-behind',async({page})=>{await startGame(page);const failures=[];for(const object of expected.objects){const from=village.objects.find((o:any)=>o.name===object.name);if(!from)continue;const bases=(from.base?.length?from.base:from.solidCells) as [number,number][];for(const side of['north','south','west','east']){const b=bases[0];await setPlayer(page,startFor(b,side));const before=await getPlayer(page);await page.keyboard.down(keyFor[side]);await page.waitForTimeout(300);await page.keyboard.up(keyFor[side]);const after=await getPlayer(page);if(after.x!==before.x||after.y!==before.y)failures.push({object:from.name,side,before,after})}if(from.upper?.length){const u=from.upper[0];await setPlayer(page,{x:u[0],y:u[1]-2});await page.keyboard.down('ArrowDown');await page.waitForTimeout(220);await page.keyboard.up('ArrowDown');const state=await getTile(page,u);if(state.collides||!state.abovePlayer)failures.push({object:from.name,upper:u,state})}}console.table(failures);expect(failures).toEqual([])})
 test('route points reachable',()=>{const ground=map.layers.find((l:any)=>l.name==='0_Ground').data,obstacles=map.layers.find((l:any)=>l.name==='1_Obstacles').data;const walk=[1289,1290,1291,1322,1323,1324,1761,1762,1763,1794,1795,1796,1827,1828,1829,1260,1261,1678,1679,1745,1777,1814,1847,1880,1588,2330,2331,2332,2333,2411,510,541,948,971,973];const non=[1239,1240,1241,1285,1286,1287,1318,1319,1320,1487,1488,1489,1490,1491,1492,1493,1494,1495,1520,1521,1522,1523,1524,1525,1526,1527,1528,1553,1555,1556,1557,1558,1559,1560,1561,1586,1588,1693,1777,1897,1898,1921,1922,2011,2012,2013,2014,2035,2036,2037,2038,2059,2060,2061,2062,2077,2078,2101,2102,2315,2316,2317,2321,2322,2323,2339,2340,2341,2345,2346,2347,2363,2364,2365,2369,2370,2371,2403,2404,2415,2416,2428];const passable=(x:number,y:number)=>{if(x<0||y<0||x>=map.width||y>=map.height)return false;const c=village.cells[x+','+y];if(c)return !c.solid;const g=ground[y*map.width+x],o=obstacles[y*map.width+x];if(g===68||g===124||[1542,1543,1544,1575,1576,1577].includes(g))return false;return o<=0||walk.includes(o)||non.includes(o)};const bfs=(t:Point)=>{const q=[expected.routes.spawn],seen=new Set([expected.routes.spawn.x+','+expected.routes.spawn.y]);for(let i=0;i<q.length;i++){const p=q[i];if(p.x===t.x&&p.y===t.y)return true;for(const[dX,dY]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=p.x+dX,ny=p.y+dY,k=nx+','+ny;if(!seen.has(k)&&passable(nx,ny)){seen.add(k);q.push({x:nx,y:ny})}}}return false};const results=Object.entries(expected.routes).filter(([n])=>n!=='spawn').map(([name,target])=>({name,pass:bfs(target)}));console.table(results);expect(results.filter(r=>!r.pass)).toEqual([])})
 test('village overlay cells use same-cell art sources and reject the west-yard picket regression',()=>{
  const obstacles=map.layers.find((l:any)=>l.name==='1_Obstacles').data
  const baselineAbove=map.layers.find((l:any)=>l.name==='2_AbovePlayer').data
  const provenanceFailures:{cell:string;obstacle:number;baselineAbove:number}[]=[]
  const villageOverlayFailures:{cell:string;gid:number}[]=[]
  for(let y=village.bounds.minY;y<=village.bounds.maxY;y++){
    for(let x=village.bounds.minX;x<=village.bounds.maxX;x++){
      const key=x+','+y,cell=village.cells[key]
      if(!cell?.overlay)continue
      const gid=obstacles[y*map.width+x]||0
      const baseline=baselineAbove[y*map.width+x]||0
      if(gid===0&&baseline===0)provenanceFailures.push({cell:key,obstacle:gid,baselineAbove:baseline})
    }
  }
  for(const key of ['1,18','7,18','8,18']){
    const cell=village.cells[key]
    const [x,y]=key.split(',').map(Number)
    const gid=obstacles[y*map.width+x]||0
    if(cell?.overlay)villageOverlayFailures.push({cell:key,gid})
  }
  console.table({provenanceFailures,villageOverlayFailures})
  expect(provenanceFailures).toEqual([])
  expect(villageOverlayFailures).toEqual([])
 })
 test('lower-half hashes unchanged',()=>{const layers={ground:map.layers.find((l:any)=>l.name==='0_Ground').data.slice(25*map.width),obstacles:map.layers.find((l:any)=>l.name==='1_Obstacles').data.slice(25*map.width),abovePlayer:map.layers.find((l:any)=>l.name==='2_AbovePlayer').data.slice(25*map.width)};const relevantWalk=[1289,1290,1291,1322,1323,1324,1761,1762,1763,1794,1795,1796,1827,1828,1829,1260,1261,1678,1679,1745,1777,1814,1847,1880,1588,2330,2331,2332,2333,2411,510,541,948,971,973].filter(g=>layers.obstacles.includes(g)).sort((a,b)=>a-b);const relevantNon=[1239,1240,1241,1285,1286,1287,1318,1319,1320,1487,1488,1489,1490,1491,1492,1493,1494,1495,1520,1521,1522,1523,1524,1525,1526,1527,1528,1553,1555,1556,1557,1558,1559,1560,1561,1586,1588,1693,1777,1897,1898,1921,1922,2011,2012,2013,2014,2035,2036,2037,2038,2059,2060,2061,2062,2077,2078,2101,2102,2315,2316,2317,2321,2322,2323,2339,2340,2341,2345,2346,2347,2363,2364,2365,2369,2370,2371,2403,2404,2415,2416,2428].filter(g=>layers.obstacles.includes(g)).sort((a,b)=>a-b);expect(fnv(JSON.stringify(layers))).toBe(expected.lowerHalfHash.expectedVisualLayerFNV1a);expect(fnv(JSON.stringify({layers,relevantWalk,relevantNon,playerBody:'10x8@3,7',depth:'ground=0;obstacles=10;abovePlayer=1000;character=100+body.bottom'}))).toBe(expected.lowerHalfHash.expectedCollisionDepthFNV1a)})
 test('debug screenshot',async({page})=>{await startGame(page);await page.screenshot({path:path.resolve('test-results/village-debug.png'),fullPage:true})})
})
function fnv(s:string){let h=0x811c9dc5>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return h.toString(16).padStart(8,'0')}
