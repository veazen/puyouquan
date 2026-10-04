import json, sys
from PIL import Image
def load(n):
    d=json.load(open('raw/%s.json'%n)); im=Image.open('raw/%s.png'%n).convert('RGB'); return d, im
def systems(d):
    s={}
    for k,v in d['bands'].items(): s.setdefault(round(v['y'],1),[]).append(int(k))
    return [sorted(v) for k,v in sorted(s.items())]
def sysbox(d, ms, up=48, x1m=None, pad=0):
    """ms: list of measure idx in this system(s). returns content bbox in units"""
    b0=d['bands'][str(ms[0])]; b1=d['bands'][str(ms[-1])]
    top=b0['y']-up; bot=b1['y']+b1['h']
    xs0=d['boxes'][str(ms[0])]['x']
    els=[e for e in d['els'] if top<(e[1]+e[3])/2<bot]
    y0=min(e[1] for e in els); y1=max(e[3] for e in els)
    x0=min(e[0] for e in els)
    if x1m is None: x1=max(e[2] for e in els)
    else:
        bx=d['boxes'][str(x1m)]; x1=bx['x']+bx['w']
        x1=max([x1]+[e[2] for e in els if abs(e[0]-x1)<1.5 and e[2]-e[0]<4])  # include barline thickness
    return [x0,y0,x1,y1]
def cut(d, im, box, out, padu=(0,0,0,0)):
    k=d['k']*d['dpr']; x0,y0,x1,y1=box
    l,t,r,b=padu
    c=im.crop((round((x0-l)*k),round((y0-t)*k),round((x1+r)*k),round((y1+b)*k)))
    c.save(out); return c.size
