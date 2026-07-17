#!/usr/bin/env python3
"""Extract SMuFL glyph outlines from Bravura (SIL OFL 1.1) as SVG paths.
Units: 1.0 = one staff space; Y flipped to SVG convention (down = +).
Registration follows SMuFL: y=0 is the glyph's staff-position anchor line."""
import json, re
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

BASE = '/tmp/claude-0/-home-user-My-claude-code-project/394d17e8-2f77-5e48-9185-52b2decb2b69/scratchpad'
WANT = ['gClef','fClef',
  'noteheadWhole','noteheadHalf','noteheadBlack',
  'restWhole','restHalf','restQuarter','rest8th','rest16th','rest32nd',
  'flag8thUp','flag8thDown','flag16thUp','flag16thDown','flag32ndUp','flag32ndDown',
  'accidentalSharp','accidentalFlat','accidentalNatural','accidentalDoubleSharp','accidentalDoubleFlat',
  'timeSig0','timeSig1','timeSig2','timeSig3','timeSig4','timeSig5','timeSig6','timeSig7','timeSig8','timeSig9',
  'ornamentTrill','ornamentTurn','ornamentTurnInverted','ornamentShortTrill','ornamentMordent','ornamentMordentInverted',
  'segno','coda','augmentationDot','fermataAbove','articAccentAbove','articStaccatoAbove','articTenutoAbove','articMarcatoAbove']

names = json.load(open(f'{BASE}/glyphnames.json'))
meta  = json.load(open(f'{BASE}/bravura_metadata.json'))
font  = TTFont(f'{BASE}/Bravura.otf')
upem  = font['head'].unitsPerEm
sps   = upem/4.0                      # font units per staff space
cmap  = font.getBestCmap()
gset  = font.getGlyphSet()
anchors = meta.get('glyphsWithAnchors', {})
bboxes  = meta.get('glyphBBoxes', {})

out, found, missing = {}, [], []
for nm in WANT:
    if nm not in names: missing.append(nm); continue
    cp = int(names[nm]['codepoint'][2:], 16)
    if cp not in cmap: missing.append(nm+'(nocmap)'); continue
    gname = cmap[cp]
    pen = SVGPathPen(gset, ntos=lambda v: f'{round(v,3):g}')
    tp = TransformPen(pen, Transform().scale(1.0/sps, -1.0/sps))
    gset[gname].draw(tp)
    d = pen.getCommands()
    d = re.sub(r'(\.\d*?)0+\b', r'\1', d).replace('.0 ',' ')
    entry = {'d': d}
    bb = bboxes.get(nm)
    if bb:
        entry['bb'] = [round(bb['bBoxSW'][0],3), round(-bb['bBoxNE'][1],3),
                       round(bb['bBoxNE'][0],3), round(-bb['bBoxSW'][1],3)]  # [x0,y0(top),x1,y1(bot)] SVG coords
    a = anchors.get(nm)
    if a:
        keep = {}
        for k in ('stemUpSE','stemDownNW','stemUpNW','stemDownSW'):
            if k in a: keep[k] = [round(a[k][0],3), round(-a[k][1],3)]
        if keep: entry['an'] = keep
    out[nm] = entry
    found.append(nm)

js = ('/* SMuFL 出版级音乐字形（轮廓取自 Bravura 字体，Steinberg Media，SIL Open Font License 1.1；\n'
      '   单位：1 = 一个谱线距(staff space)，y 向下为正，y=0 为 SMuFL 注册线。*/\n'
      'const SMUFL = ' + json.dumps(out, separators=(',',':'), ensure_ascii=False) + ';\n'
      'function smg(name, x, y, SG, opts){\n'
      '  const g = SMUFL[name]; if(!g) return "";\n'
      '  const s = SG * (opts && opts.scale || 1);\n'
      '  return `<path d="${g.d}" transform="translate(${(+x).toFixed(1)},${(+y).toFixed(1)}) scale(${s.toFixed(3)})" fill="${opts && opts.fill || \'var(--ink)\'}"/>`;\n'
      '}\n'
      'function smw(name){ const b=SMUFL[name]&&SMUFL[name].bb; return b? b[2]-b[0] : 1; }\n')
open(f'{BASE}/glyphs.js','w').write(js)
print('upem', upem, '| found', len(found), '| missing:', missing)
print('size', len(js), 'bytes')
for nm in ('gClef','fClef','noteheadBlack','noteheadWhole','restQuarter','accidentalSharp','flag8thUp','segno','ornamentShortTrill','ornamentMordent'):
    if nm in out:
        e=out[nm]; print(nm, 'bb=', e.get('bb'), 'an=', e.get('an'), 'dlen=', len(e['d']))
