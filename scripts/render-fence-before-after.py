#!/usr/bin/env python3
"""Render map rows 3-8 / columns 0-19 before and after the roof-fence change.
Uses only Python's standard library. Run from any directory:
  python3 scripts/render-fence-before-after.py
Set FENCE_BASE_REF to override the baseline commit.
"""
from __future__ import annotations
import json, os, struct, subprocess, zlib
from pathlib import Path

BASE_REF=os.environ.get("FENCE_BASE_REF","a5217855ae54e563128057d79ef9dcf019858818")
ROOT=Path(__file__).resolve().parents[1]
MAP_REL=Path("src/assets/tiles/ninja-village/MAP.json")
ASSET_DIR=ROOT/"src/assets/tiles/ninja-village"
OUT_PATH=ROOT/"docs/fence-before-after.png"
SCALE=3; X0,X1=0,19; Y0,Y1=3,8; TILE=16; HEADER=36; GAP=14; MARGIN=16
FONT={
"A":("01110","10001","10001","11111","10001","10001","10001"),"B":("11110","10001","10001","11110","10001","10001","11110"),
"C":("01111","10000","10000","10000","10000","10000","01111"),"D":("11110","10001","10001","10001","10001","10001","11110"),
"E":("11111","10000","10000","11110","10000","10000","11111"),"F":("11111","10000","10000","11110","10000","10000","10000"),
"G":("01111","10000","10000","10111","10001","10001","01110"),"H":("10001","10001","10001","11111","10001","10001","10001"),
"I":("11111","00100","00100","00100","00100","00100","11111"),"J":("00111","00010","00010","00010","10010","10010","01100"),
"K":("10001","10010","10100","11000","10100","10010","10001"),"L":("10000","10000","10000","10000","10000","10000","11111"),
"M":("10001","11011","10101","10101","10001","10001","10001"),"N":("10001","11001","10101","10011","10001","10001","10001"),
"O":("01110","10001","10001","10001","10001","10001","01110"),"P":("11110","10001","10001","11110","10000","10000","10000"),
"Q":("01110","10001","10001","10001","10101","10010","01101"),"R":("11110","10001","10001","11110","10100","10010","10001"),
"S":("01111","10000","10000","01110","00001","00001","11110"),"T":("11111","00100","00100","00100","00100","00100","00100"),
"U":("10001","10001","10001","10001","10001","10001","01110"),"V":("10001","10001","10001","10001","10001","01010","00100"),
"W":("10001","10001","10001","10101","10101","10101","01010"),"X":("10001","10001","01010","00100","01010","10001","10001"),
"Y":("10001","10001","01010","00100","00100","00100","00100"),"Z":("11111","00001","00010","00100","01000","10000","11111"),
"0":("01110","10001","10011","10101","11001","10001","01110"),"1":("00100","01100","00100","00100","00100","00100","01110"),
"2":("01110","10001","00001","00010","00100","01000","11111"),"3":("11110","00001","00001","01110","00001","00001","11110"),
"4":("00010","00110","01010","10010","11111","00010","00010"),"5":("11111","10000","10000","11110","00001","00001","11110"),
"6":("01110","10000","10000","11110","10001","10001","01110"),"7":("11111","00001","00010","00100","01000","01000","01000"),
"8":("01110","10001","10001","01110","10001","10001","01110"),"9":("01110","10001","10001","01111","00001","00001","01110"),
"-":("00000","00000","00000","11111","00000","00000","00000"),"/":("00001","00010","00010","00100","01000","01000","10000")," ":("00000",)*7
}
def paeth(a,b,c):
 p=a+b-c; pa,pb,pc=abs(p-a),abs(p-b),abs(p-c)
 return a if pa<=pb and pa<=pc else b if pb<=pc else c
def decode_png(path):
 blob=path.read_bytes()
 if blob[:8]!=b"\x89PNG\r\n\x1a\n": raise ValueError("Not PNG: "+str(path))
 pos=8; w=h=depth=ctype=interlace=0; idat=bytearray(); palette=b""; trans=b""
 while pos<len(blob):
  size=struct.unpack(">I",blob[pos:pos+4])[0]; kind=blob[pos+4:pos+8]; data=blob[pos+8:pos+8+size]; pos+=size+12
  if kind==b"IHDR": w,h,depth,ctype,_,_,interlace=struct.unpack(">IIBBBBB",data)
  elif kind==b"IDAT": idat.extend(data)
  elif kind==b"PLTE": palette=data
  elif kind==b"tRNS": trans=data
  elif kind==b"IEND": break
 if depth!=8 or interlace!=0: raise ValueError(f"Unsupported PNG format {depth}-bit interlace={interlace}: {path}")
 channels={0:1,2:3,3:1,4:2,6:4}.get(ctype)
 if channels is None: raise ValueError(f"Unsupported PNG color type {ctype}: {path}")
 stride=w*channels; raw=zlib.decompress(idat); px=bytearray(h*stride); prev=bytearray(stride); off=0
 for y in range(h):
  ft=raw[off]; off+=1; row=bytearray(raw[off:off+stride]); off+=stride
  for i in range(stride):
   left=row[i-channels] if i>=channels else 0; up=prev[i]; ul=prev[i-channels] if i>=channels else 0
   if ft==1: row[i]=(row[i]+left)&255
   elif ft==2: row[i]=(row[i]+up)&255
   elif ft==3: row[i]=(row[i]+(left+up)//2)&255
   elif ft==4: row[i]=(row[i]+paeth(left,up,ul))&255
   elif ft!=0: raise ValueError("Unknown PNG filter")
  px[y*stride:(y+1)*stride]=row; prev=row
 rgba=bytearray(w*h*4)
 for i in range(w*h):
  src=i*channels; dst=i*4
  if ctype==6: rgba[dst:dst+4]=px[src:src+4]
  elif ctype==2: rgba[dst:dst+3]=px[src:src+3]; rgba[dst+3]=255
  elif ctype==0: rgba[dst:dst+3]=bytes((px[src],)*3); rgba[dst+3]=255
  elif ctype==4: rgba[dst:dst+3]=bytes((px[src],)*3); rgba[dst+3]=px[src+1]
  elif ctype==3:
   k=px[src]; p=k*3; rgba[dst:dst+3]=palette[p:p+3]; rgba[dst+3]=trans[k] if k<len(trans) else 255
 return w,h,rgba
def chunk(kind,data): return struct.pack(">I",len(data))+kind+data+struct.pack(">I",zlib.crc32(kind+data)&0xffffffff)
def save_png(path,w,h,rgba):
 raw=bytearray(); stride=w*4
 for y in range(h): raw.append(0); raw.extend(rgba[y*stride:(y+1)*stride])
 out=b"\x89PNG\r\n\x1a\n"+chunk(b"IHDR",struct.pack(">IIBBBBB",w,h,8,6,0,0,0))+chunk(b"IDAT",zlib.compress(bytes(raw),9))+chunk(b"IEND",b"")
 path.parent.mkdir(parents=True,exist_ok=True); path.write_bytes(out)
def rect(canvas,w,x,y,rw,rh,color):
 h=len(canvas)//(w*4)
 for yy in range(max(0,y),min(h,y+rh)):
  for xx in range(max(0,x),min(w,x+rw)):
   i=(yy*w+xx)*4; canvas[i:i+4]=bytes(color)
def text(canvas,w,x,y,value,color,scale=2):
 for ci,ch in enumerate(value.upper()):
  glyph=FONT.get(ch,FONT[" "])
  for gy,row in enumerate(glyph):
   for gx,bit in enumerate(row):
    if bit=="1": rect(canvas,w,x+(ci*6+gx)*scale,y+gy*scale,scale,scale,color)
def blend(canvas,w,x,y,p):
 r,g,b,a=p
 if a==0:return
 i=(y*w+x)*4
 if a==255: canvas[i:i+4]=bytes((r,g,b,255)); return
 inv=255-a; canvas[i]=(r*a+canvas[i]*inv)//255; canvas[i+1]=(g*a+canvas[i+1]*inv)//255; canvas[i+2]=(b*a+canvas[i+2]*inv)//255; canvas[i+3]=255
def render_layer(canvas,cw,map_data,layer,sheets,panel_y):
 tw=int(map_data["tilewidth"]); th=int(map_data["tileheight"]); mw=int(map_data["width"])
 for y in range(Y0,Y1+1):
  for x in range(X0,X1+1):
   raw_gid=int(layer["data"][y*mw+x]); gid=raw_gid&0x1FFFFFFF
   if not gid: continue
   ts=max((t for t in map_data["tilesets"] if int(t["firstgid"])<=gid),key=lambda t:int(t["firstgid"]))
   name=Path(ts["source"]).with_suffix(".png").name
   if name not in sheets: sheets[name]=decode_png(ASSET_DIR/name)
   sw,_,sheet=sheets[name]; cols=sw//tw; ti=gid-int(ts["firstgid"]); sx=(ti%cols)*tw; sy=(ti//cols)*th
   ox=MARGIN+(x-X0)*tw*SCALE; oy=panel_y+(y-Y0)*th*SCALE
   fh=bool(raw_gid&0x80000000); fv=bool(raw_gid&0x40000000); fd=bool(raw_gid&0x20000000)
   for py in range(th):
    for px in range(tw):
     qx,qy=(py,px) if fd else (px,py)
     if fh: qx=tw-1-qx
     if fv: qy=th-1-qy
     si=((sy+qy)*sw+(sx+qx))*4; p=tuple(sheet[si:si+4]); dx=ox+px*SCALE; dy=oy+py*SCALE
     for yy in range(SCALE):
      for xx in range(SCALE): blend(canvas,cw,dx+xx,dy+yy,p)
def load_ref(ref):
 return json.loads(subprocess.run(["git","show",f"{ref}:{MAP_REL.as_posix()}"],cwd=ROOT,check=True,capture_output=True,text=True).stdout)
def composite(before,after):
 pw=(X1-X0+1)*TILE*SCALE; ph=HEADER+(Y1-Y0+1)*TILE*SCALE; w=MARGIN*2+pw; h=MARGIN+ph+GAP+ph+MARGIN
 canvas=bytearray(w*h*4)
 for i in range(0,len(canvas),4): canvas[i:i+4]=bytes((20,22,28,255))
 sheets={}
 panels=[(MARGIN,before,False,"BEFORE CURRENT",(255,199,96,255)),(MARGIN+ph+GAP,after,True,"AFTER PROPOSED",(110,245,165,255))]
 for py,map_data,decor,title,color in panels:
  rect(canvas,w,0,py,w,HEADER,(17,18,23,255)); text(canvas,w,MARGIN,py+10,title,color,2)
  byname={l["name"]:l for l in map_data["layers"]}
  order=["0_Ground"]+(["0b_GroundDecor"] if decor and "0b_GroundDecor" in byname else [])+["1_Obstacles","2_AbovePlayer"]
  for n in order:
   if n in byname: render_layer(canvas,w,map_data,byname[n],sheets,py+HEADER)
 return w,h,canvas
def main():
 before=load_ref(BASE_REF); after=json.loads((ROOT/MAP_REL).read_text(encoding="utf-8"))
 w,h,pixels=composite(before,after); save_png(OUT_PATH,w,h,pixels)
 print(f"Rendered {OUT_PATH.relative_to(ROOT)} ({w}x{h})")
 print(f"Region: columns {X0}-{X1}, rows {Y0}-{Y1}, tile scale {SCALE}x")
 print("Layer order: 0_Ground -> optional 0b_GroundDecor -> 1_Obstacles -> 2_AbovePlayer")
if __name__=="__main__": main()
