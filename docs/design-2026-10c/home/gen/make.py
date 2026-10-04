# 从 raw/（引擎 @3x 实出）裁切：只在系统边界 / 小节线；输出 @2x
from crop import *
from PIL import Image
import json, sys
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
HW=int(sys.argv[1]) if len(sys.argv)>1 else 900
# 首屏：送别伴奏对照谱第一系统（4 小节）
d,ms=sysms('hero',[0]); bx=sysbox(d,ms,up=0); emit('hero','hero',bx,HW/(min(d['vbw'],bx[2]+3)-max(0,bx[0]-3)))
d,ms=sysms('m-hero',[0]); bx=sysbox(d,ms,up=0); emit('m-hero','m-hero',bx,334/(min(d['vbw'],bx[2]+3)-max(0,bx[0]-3)))
# 三谱同源：共同 x 范围；简谱用窄版宽排版并右移，使第 2、3 小节与另两张逐列对齐
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
    print(pre,'jp ml',meta[pre+'jp']['ml'],'end',round(meta[pre+'jp']['ml']+meta[pre+'jp']['w'],1),'of',W)
# 场景：同一缩放，谱表大小一致
S=float(sys.argv[2]) if len(sys.argv)>2 else 0.78
d,ms=sysms('sc-canon-m',[0]); emit('sc-canon','sc-canon-m',sysbox(d,ms,up=0,x1m=0),S)
d,ms=sysms('sc-minuet',[0,1]); emit('sc-minuet','sc-minuet',sysbox(d,ms,up=0),S)
d,ms=sysms('sc-tiger',[0]); emit('sc-tiger','sc-tiger',sysbox(d,ms,up=0),S)
d,ms=sysms('sc-func',[0,1]); emit('sc-func','sc-func',sysbox(d,ms,up=0),S)
# 最新上架：整页宽的页首，底边落在系统间空白
for n in ['songbie','piano','twinkle']:
    d,_=load('lib-'+n); emit('lib-'+n,'lib-'+n,[0,4,d['vbw'],366],600/d['vbw']/2*1.0,pad=(0,0,0,0))
json.dump(meta,open(OUT+'meta.json','w'),indent=1)
for k,v in meta.items(): print(k,v)
