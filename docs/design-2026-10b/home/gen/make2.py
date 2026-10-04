from crop import *
from PIL import Image
import json
OUT='../img/'
meta={}
def emit(name, src, box, scale, pad=(3,3,3,3)):
    d,im=load(src); k=d['k']*d['dpr']
    l,t,r,b=pad; x0,y0,x1,y1=max(0,box[0]-l),box[1]-t,min(d['vbw'],box[2]+r),box[3]+b
    c=im.crop((round(x0*k),round(y0*k),round(x1*k),round(y1*k)))
    dw=round((x1-x0)*scale); dh=round((y1-y0)*scale)
    c=c.resize((dw*2,dh*2),Image.LANCZOS)
    c.save(OUT+name+'.png',optimize=True)
    meta[name]={'w':dw,'h':dh,'scale':round(scale,3)}
def sysms(src, idxs):
    d,_=load(src); S=systems(d); return d, sum([S[i] for i in idxs],[])
def withband(d, bx, mi):
    b=d['bands'][str(mi)]; return [bx[0],min(bx[1],b['y']),bx[2],max(bx[3],b['y']+b['h'])]
# hero
d,ms=sysms('hero',[0]); emit('hero','hero',sysbox(d,ms,up=0),1.2)
d,ms=sysms('m-hero',[0]); bx=sysbox(d,ms,up=0); emit('m-hero','m-hero',bx,334/(min(d['vbw'],bx[2]+3)-max(0,bx[0]-3)))
# tri (playhead band on measure index 1 kept inside the crop)
# 简谱无谱号列：用引擎在较窄版宽下的排版（小节宽与五线谱一致），裁切后整体右移，使第 2、3 小节与另两张谱逐列对齐
for pre,W,jp in [('tri-',736,'tri-jp2'),('m-tri-',334,'m-tri-jp2')]:
    boxes={}
    for n in ['tab','staff']:
        d,ms=sysms(pre+n,[0]); boxes[n]=withband(d,sysbox(d,ms,up=0),1)
    X0=max(0,min(b[0] for b in boxes.values())-3); X1=max(b[2] for b in boxes.values())
    sc=W/(X1+3-X0)
    for n,b in boxes.items(): emit(pre+n,pre+n,[X0,b[1],X1,b[3]],sc,pad=(0,2,3,2))
    ds,_=load(pre+'staff'); dj,ms=sysms(jp,[0])
    off=ds['boxes']['1']['x']-dj['boxes']['1']['x']
    bj=withband(dj,sysbox(dj,ms,up=0),1); j0=max(0,bj[0]-3)
    emit(pre+'jp',jp,[j0,bj[1],bj[2],bj[3]],sc,pad=(0,2,3,2))
    meta[pre+'jp']['ml']=round((j0+off-X0)*sc,1)
    print(pre,'jp offset units',round(off,1),'ml px',meta[pre+'jp']['ml'],'end px',round(meta[pre+'jp']['ml']+meta[pre+'jp']['w'],1),'of',W)
# scenes
S=0.8
d,ms=sysms('sc-canon-m',[0]); emit('sc-canon','sc-canon-m',sysbox(d,ms,up=0,x1m=0),S)
d,ms=sysms('sc-minuet',[0,1]); emit('sc-minuet','sc-minuet',sysbox(d,ms,up=0),S)
d,ms=sysms('sc-tiger',[0]); emit('sc-tiger','sc-tiger',sysbox(d,ms,up=0),S)
d,ms=sysms('sc-func',[0,1]); emit('sc-func','sc-func',sysbox(d,ms,up=0),S)
# library page tops: full page width, y 4..360
L=0.83
for n in ['songbie','piano','twinkle']:
    d,_=load('lib-'+n); emit('lib-'+n,'lib-'+n,[0,4,d['vbw'],366],L,pad=(0,0,0,0))
json.dump(meta,open(OUT+'meta.json','w'),indent=1)
for k,v in meta.items(): print(k,v)
