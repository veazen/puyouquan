from crop import *
from PIL import Image
import json
OUT='../img/'
meta={}
def emit(name, src, box, scale, pad=(3,3,3,3)):
    d,im=load(src); k=d['k']*d['dpr']
    l,t,r,b=pad; x0,y0,x1,y1=box[0]-l,box[1]-t,box[2]+r,box[3]+b
    c=im.crop((round(x0*k),round(y0*k),round(x1*k),round(y1*k)))
    dw=round((x1-x0)*scale); dh=round((y1-y0)*scale)
    c=c.resize((dw*2,dh*2),Image.LANCZOS)
    c.save(OUT+name+'.png',optimize=True)
    meta[name]={'w':dw,'h':dh,'scale':round(scale,3),'units':[round(x0,1),round(y0,1),round(x1,1),round(y1,1)]}
    return d
def sysms(src, idxs):
    d,_=load(src); S=systems(d); return d, sum([S[i] for i in idxs],[])
# hero
d,ms=sysms('hero',[0]); emit('hero', 'hero', sysbox(d,ms,up=0), 1.2)
d,ms=sysms('m-hero',[0]); bx=sysbox(d,ms,up=0); emit('m-hero','m-hero',bx, 334/(bx[2]-bx[0]+6))
# tri: common x range
boxes={}
for n in ['tri-tab','tri-staff','tri-jp']:
    d,ms=sysms(n,[0]); boxes[n]=sysbox(d,ms,up=0)
X0=min(b[0] for b in boxes.values()); X1=max(b[2] for b in boxes.values())
sc=736/(X1-X0+6)
for n,b in boxes.items(): emit(n,n,[X0,b[1],X1,b[3]],sc)
boxes={}
for n in ['m-tri-tab','m-tri-staff','m-tri-jp']:
    d,ms=sysms(n,[0]); boxes[n]=sysbox(d,ms,up=0)
X0=min(b[0] for b in boxes.values()); X1=max(b[2] for b in boxes.values())
sc=334/(X1-X0+6)
for n,b in boxes.items(): emit(n,n,[X0,b[1],X1,b[3]],sc)
# scenes
S=0.79
for n,idx in [('sc-canon',[0]),('sc-minuet',[0,1]),('sc-satb',[0]),('sc-func',[0,1])]:
    d,ms=sysms(n,idx); bx=sysbox(d,ms,up=0); emit(n,n,bx,S)
json.dump(meta,open(OUT+'meta.json','w'),indent=1)
for k,v in meta.items(): print(k,v)
