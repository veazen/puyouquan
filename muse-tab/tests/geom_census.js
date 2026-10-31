'use strict';
/* v69.7 刻版质量 · 五线谱碰撞普查（可复用工具；套件 tv_v697col 用它出断言，两组实现人在各自工作副本里反复跑看修后计数）。
   原理：index.html 在 window.__pyqGeom 为真时给五线谱声部的绘制元素打 data-g="类别" data-gq="vi:mi:ci"（见 geomTag；缺省不打，谱面逐字节不变）。
   这里在页面里用 renderOffscreen（paperW 870，与正式谱面同一份引擎）把样本谱排出来，取每个带标记的叶子元素：
     · 几何元素（path / line / rect / circle）：getBBox 经 getScreenCTM 映射到谱面坐标得外接框；是否「真墨迹相交」用 isPointInFill / isPointInStroke 在两框交集里按网格逐点判
       （符头、符杠斜块、连音弧、发夹折线都按真实形状算，不是外接框）；
     · 文字（text）：canvas measureText 的 actualBoundingBox（真实字墨范围，非字体行框）按 text-anchor 落位。
   两个元素算「相交」＝交集网格里同时落在两者墨迹内的点 ≥2 且估计面积 ≥0.2 px²（防切点误报）；「贴近」＝不相交、但记号框外扩 1.5px 后碰到墨迹（只统计、不断言）。
   类别对：记号 × 墨迹全算；记号 × 记号（不同类别；同类别不同列）全算；墨迹 × 墨迹只算 INK_PAIRS 列出的（临时记号撞前列、二度符头、符尾撞符头……），
   同一列的「设计上就相接」的（符头 × 符干 / 加线、符干 × 符尾 / 符杠……）不算。谱线、小节线、热区、选区不带标记，不参与。
   另有几项语义 / 几何度量（M*）：符干长度、整小节休止上的延长号、跨小节延音和弦重复临时记号、行首换谱号、人声力度在谱表下、有符杠连音仍画弧、歌词段号 / 相邻音节 / 标点。

   用法（Node）：
     const GC = require('./geom_census');
     const r = await GC.census(page, GC.allSamples(), {paperW:870});   // page 已打开 index.html
     GC.printReport(r);
   命令行：node tests/geom_census.js [--url=被测页] [--only=lib,preset,stress] [--json=输出路径] [--pairs]（列出全部类别对）
          截图：--shot=曲库 id 或样本名:小节下标,…:声部,…:类别,…:输出.png（如 --shot=lib-os-lc5100543:2,3:1,2:ped:/tmp/swan.png；类别写 stemShort 等度量键也可）
   env：CHROMIUM_PATH（缺省 /opt/pw-browsers/chromium）。 */
const fs = require('fs');
const path = require('path');

/* ---------------- 类别 ---------------- */
const MARK = ['ped', 'dyn', 'hairpin', 'dtext', 'tempo', 'expr', 'anno', 'ott', 'tup', 'mnum', 'fing', 'chord', 'lyr', 'lyrp', 'verse', 'ferm', 'artic', 'orn', 'breath', 'nav', 'gliss'];
const INK = ['acc', 'head', 'stem', 'flag', 'beam', 'ledger', 'rest', 'dot', 'tie', 'grace', 'clef', 'clefm', 'keysig', 'tsig', 'brace', 'bracket', 'simile', 'trem'];
/* 墨迹 × 墨迹：只算这些（any＝不论是否同一列；diff＝必须是不同列 / 不同声部，同列是设计上相接） */
const INK_PAIRS = {
  'acc|head': 'any', 'acc|rest': 'any', 'acc|stem': 'diff', 'acc|flag': 'any', 'acc|dot': 'any', 'acc|beam': 'any', 'acc|acc': 'any',
  'acc|ledger': 'diff', 'acc|tie': 'any', 'acc|clefm': 'any', 'acc|grace': 'any', 'acc|keysig': 'any', 'acc|tsig': 'any',
  'head|head': 'any', 'flag|head': 'any', 'beam|head': 'any', 'head|stem': 'diff', 'head|ledger': 'diff', 'head|rest': 'any', 'head|tie': 'any',
  'dot|head': 'diff', 'dot|stem': 'diff', 'dot|flag': 'any', 'dot|beam': 'any', 'dot|rest': 'diff', 'dot|tie': 'any',
  'rest|stem': 'any', 'rest|beam': 'any', 'rest|flag': 'any', 'rest|ledger': 'any', 'rest|rest': 'diff', 'flag|tie': 'any', 'rest|tie': 'any', 'stem|tie': 'diff',
  'grace|head': 'any', 'grace|stem': 'diff', 'grace|ledger': 'any', 'grace|rest': 'any', 'grace|dot': 'any',
  'clefm|head': 'any', 'clefm|stem': 'any', 'clefm|rest': 'any', 'clefm|beam': 'any', 'clefm|dot': 'any', 'clefm|ledger': 'any', 'clefm|flag': 'any',
  'flag|flag': 'diff', 'head|keysig': 'any', 'head|tsig': 'any', 'keysig|stem': 'any', 'stem|tsig': 'any',
};

/* ---------------- 页面侧（page.evaluate(GC_PAGE) 注入 window.__gcRun） ---------------- */
function GC_PAGE(CFG) {
  const NS = 'http://www.w3.org/2000/svg';
  const MARK = new Set(CFG.MARK), INK = new Set(CFG.INK), INK_PAIRS = CFG.INK_PAIRS, AVM = new Set(CFG.AVM);
  const ORDER = CFG.MARK.concat(CFG.INK);
  const oi = c => { const i = ORDER.indexOf(c); return i < 0 ? 999 : i; };
  let cv = null;
  const ctx2 = () => { if (!cv) cv = document.createElement('canvas').getContext('2d'); return cv; };
  const vis = c => !!c && c !== 'none' && c !== 'transparent' && !/^rgba\(\s*0,\s*0,\s*0,\s*0\s*\)$/.test(c);
  const mapBox = (M, x0, y0, x1, y1) => {
    const ps = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(M));
    return [Math.min(...ps.map(p => p.x)), Math.min(...ps.map(p => p.y)), Math.max(...ps.map(p => p.x)), Math.max(...ps.map(p => p.y))];
  };
  const trY = el => { const m = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\)/.exec(el.getAttribute('transform') || ''); return m ? [+m[1], +m[2]] : null; };

  function collect(svg) {
    const rootInv = svg.getScreenCTM().inverse();
    const items = [];
    svg.querySelectorAll('[data-g]').forEach(el => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'g' || tag === 'title') return;
      const cls = el.getAttribute('data-g'), key = el.getAttribute('data-gq') || '';
      const [vi, mi, ci] = key.split(':').map(Number);
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
      const M = rootInv.multiply(el.getScreenCTM());
      const it = { el, cls, key, vi, mi, ci, tag };
      if (tag === 'text') {
        const anchor = cs.textAnchor, txt = el.textContent || '';
        if (!txt.trim()) return;
        const simple = !el.children.length && !el.hasAttribute('dominant-baseline') && !/\s/.test((el.getAttribute('x') || '').trim());
        if (simple) {
          /* 字墨框按 ×SC 字号量再除回：canvas 的 actualBoundingBox 取整到整像素（且随设备像素比不同），放大量才有亚像素精度、各机器同一结果 */
          const c = ctx2(), SC = 16, fs = parseFloat(cs.fontSize) || 10;
          c.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + (fs * SC) + 'px ' + cs.fontFamily;
          c.textAlign = anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left'; c.textBaseline = 'alphabetic';
          const m = c.measureText(txt), x = +el.getAttribute('x') || 0, y = +el.getAttribute('y') || 0;
          it.box = mapBox(M, x - m.actualBoundingBoxLeft / SC, y - m.actualBoundingBoxAscent / SC, x + m.actualBoundingBoxRight / SC, y + m.actualBoundingBoxDescent / SC);
        } else { const b = el.getBBox(); it.box = mapBox(M, b.x, b.y, b.x + b.width, b.y + b.height); }
        it.kind = 'text'; it.txt = txt;
      } else {
        const fillOn = vis(cs.fill) && +cs.fillOpacity !== 0, strokeOn = vis(cs.stroke) && +cs.strokeOpacity !== 0;
        if (!fillOn && !strokeOn) return;
        const b = el.getBBox(), sw = strokeOn ? (parseFloat(cs.strokeWidth) || 1) / 2 + 0.5 : 0;
        it.box = mapBox(M, b.x - sw, b.y - sw, b.x + b.width + sw, b.y + b.height + sw);
        it.kind = 'geom'; it.fillOn = fillOn; it.strokeOn = strokeOn; it.Minv = M.inverse();
        it.tr = trY(el);
        if (tag === 'line') it.ln = ['x1', 'y1', 'x2', 'y2'].map(k => +el.getAttribute(k));
      }
      items.push(it);
    });
    return items;
  }
  const inside = (it, x, y) => {
    if (it.kind === 'text') return x >= it.box[0] && x <= it.box[2] && y >= it.box[1] && y <= it.box[3];
    const p = new DOMPoint(x, y).matrixTransform(it.Minv);
    return (it.fillOn && it.el.isPointInFill(p)) || (it.strokeOn && it.el.isPointInStroke(p));
  };
  /* 交集网格逐点：返回 {n, area}（同时在两者墨迹里的点数 / 估计面积） */
  const hit = (a, b, padA) => {
    const pa = padA || 0;
    const x0 = Math.max(a.box[0] - pa, b.box[0]), y0 = Math.max(a.box[1] - pa, b.box[1]);
    const x1 = Math.min(a.box[2] + pa, b.box[2]), y1 = Math.min(a.box[3] + pa, b.box[3]);
    if (x1 - x0 <= 0.05 || y1 - y0 <= 0.05) return { n: 0, area: 0 };
    if (a.kind === 'text' && b.kind === 'text' && !pa) { const ar = (x1 - x0) * (y1 - y0); return { n: ar >= 0.5 ? 9 : 0, area: ar }; }
    const sx = Math.max(0.3, (x1 - x0) / 14), sy = Math.max(0.3, (y1 - y0) / 14);
    let n = 0;
    for (let y = y0 + sy / 2; y < y1; y += sy) for (let x = x0 + sx / 2; x < x1; x += sx) {
      const inA = pa ? (x >= a.box[0] - pa && x <= a.box[2] + pa && y >= a.box[1] - pa && y <= a.box[3] + pa) : inside(a, x, y);
      if (inA && inside(b, x, y)) n++;
    }
    return { n, area: n * sx * sy };
  };
  function rule(a, b) {
    const A = a.cls, B = b.cls, mA = MARK.has(A), mB = MARK.has(B), same = a.key === b.key;
    if (A === B) {
      if (same && A !== 'head' && A !== 'acc') return null;   /* 同一列同一记号的几个部件（Ped. 文字 / 线 / *、和弦框 / 字……） */
      if (!mA && !['head', 'acc', 'rest', 'flag', 'dot', 'tie', 'grace'].includes(A)) return null;
      return A + '×' + A;
    }
    if ((A === 'lyr' && B === 'lyrp') || (A === 'lyrp' && B === 'lyr')) { if (same) return null; }
    if (mA || mB) { const [x, y] = oi(A) <= oi(B) ? [A, B] : [B, A]; return x + '×' + y; }
    const k = [A, B].sort().join('|'), md = INK_PAIRS[k];
    if (!md) return null;
    if (md === 'diff' && same) return null;
    const [x, y] = oi(A) <= oi(B) ? [A, B] : [B, A];
    return x + '×' + y;
  }
  function pairs(items, nearPad) {   /* nearPad：贴近的外扩量（缺省 1.5；tv_v697col A6 用更宽的 2.5 判「谱面干净」） */
    const NP = nearPad || 1.5;
    const CELL = 16, grid = new Map(), out = [], near = [];
    items.forEach((it, i) => {
      const [x0, y0, x1, y1] = it.box;
      for (let gx = Math.floor((x0 - 2) / CELL); gx <= Math.floor((x1 + 2) / CELL); gx++)
        for (let gy = Math.floor((y0 - 2) / CELL); gy <= Math.floor((y1 + 2) / CELL); gy++) {
          const k = gx + ',' + gy; let L = grid.get(k); if (!L) grid.set(k, L = []); L.push(i);
        }
    });
    const seen = new Set();
    grid.forEach(L => {
      for (let p = 0; p < L.length; p++) for (let q = p + 1; q < L.length; q++) {
        const i = Math.min(L[p], L[q]), j = Math.max(L[p], L[q]); const sk = i * 1e6 + j;
        if (seen.has(sk)) continue; seen.add(sk);
        const a = items[i], b = items[j];
        const cat = rule(a, b); if (!cat) continue;
        const ov = a.box[0] < b.box[2] + 2 && b.box[0] < a.box[2] + 2 && a.box[1] < b.box[3] + 2 && b.box[1] < a.box[3] + 2;
        if (!ov) continue;
        const h = hit(a, b);
        if (h.n >= 2 && h.area >= 0.2) { out.push({ cat, a: i, b: j, area: +h.area.toFixed(2) }); continue; }
        /* 贴近：记号 × 墨迹不相交，但记号框外扩 1.5px 碰到墨迹；
           v69.7 验收 B1：谱表上下的避让记号（AVM：踏板 / 力度类 / 发夹 / 标注 / 八度线）× 和弦名（框 + 字，避让把它当墨迹）同样量贴近 */
        const mA = MARK.has(a.cls), mB = MARK.has(b.cls);
        if (mA !== mB) { const [m, k2] = mA ? [a, b] : [b, a]; const h2 = hit(m, k2, NP); if (h2.n >= 1) near.push({ cat, a: i, b: j }); }
        else if (mA && mB && (a.cls === 'chord') !== (b.cls === 'chord') && (AVM.has(a.cls) || AVM.has(b.cls))) {
          const [m, k2] = a.cls === 'chord' ? [b, a] : [a, b]; const h2 = hit(m, k2, NP); if (h2.n >= 1) near.push({ cat, a: i, b: j }); }
      }
    });
    return { out, near };
  }
  /* 语义 / 几何度量 */
  function metrics(svg, items, song0, r) {
    const SG = 7.5, res = {};
    const byKey = new Map(); items.forEach(it => { let L = byKey.get(it.key); if (!L) byKey.set(it.key, L = []); L.push(it); });
    const hitRect = (vi, mi, ci) => svg.querySelector(`rect[data-row="vox"][data-vi="${vi}"][data-mi="${mi}"][data-ci="${ci}"][data-staffb]`);
    /* M1 符干长度（线距）：自离符尾最近的符头量到符干端；单符干（不在符杠组）< 3.25 记一处；符杠组另计（只打印） */
    const st = { single: [], beamed: [] };
    items.filter(it => it.cls === 'stem' && it.ln).forEach(it => {
      const heads = (byKey.get(it.key) || []).filter(h => h.cls === 'head' && h.tr);
      if (!heads.length) return;
      const [, y1, , y2] = it.ln, up = y2 < y1, hy = heads.map(h => h.tr[1]);
      const len = up ? (Math.min(...hy) - y2) / SG : (y2 - Math.max(...hy)) / SG;
      const beamed = !(byKey.get(it.key) || []).some(h => h.cls === 'flag') && (() => {
        const col = (((song0.measures[it.mi] || {}).voxes || [])[it.vi] || [])[it.ci]; return col && col.dur >= 8; })();
      (beamed ? st.beamed : st.single).push({ it, len: +len.toFixed(2), up });
    });
    res.stemShort = st.single.filter(s => s.len < 3.25).map(s => ({ a: s.it, v: s.len }));
    res.stemShortBeamed = st.beamed.filter(s => s.len < 2.75).map(s => ({ a: s.it, v: s.len }));
    /* M2 整小节休止上的延长号：延长号中心与全休止中心横向差 > 1.5 */
    res.fermRest = [];
    items.filter(it => it.cls === 'ferm').forEach(f => {
      const rw = (byKey.get(f.vi + ':' + f.mi + ':-1') || []).find(x => x.cls === 'rest');
      if (!rw) return;
      const d = Math.abs((f.box[0] + f.box[2]) / 2 - (rw.box[0] + rw.box[2]) / 2);
      if (d > 1.5) res.fermRest.push({ a: f, v: +d.toFixed(1) });
    });
    /* M3 跨小节延音（行内或跨行）的和弦：延音进来的音又写了临时记号 */
    res.tieAcc = [];
    (song0.voxNotations || []).forEach((nt, vi) => {
      if (!(nt === 'staff' || nt === 'bass' || nt === 'alto')) return;
      song0.measures.forEach((m, mi) => {
        if (!mi) return;
        const c0 = ((m.voxes || [])[vi] || [])[0], pc = ((song0.measures[mi - 1].voxes || [])[vi] || []), l = pc[pc.length - 1];
        if (!c0 || !c0.deg || !l || !l.deg) return;
        const sameP = (x, y) => x && y && x.deg === y.deg && (x.oct || 0) === (y.oct || 0) && (x.acc || '') === (y.acc || '');
        const tin = [];
        const allL = [l].concat((l.adds || []).filter(a => a && a.deg));
        [c0].concat((c0.adds || []).filter(a => a && a.deg)).forEach(n => {
          const src = allL.find(x => sameP(x, n));
          if (src && src.tie) tin.push(n);   /* 主音看 l.tie、附加音看 a.tie（与刻版 tiedIn0 / 和音逐音连音弧同口径） */
        });
        if (!tin.length) return;
        const hr = hitRect(vi, mi, 0); if (!hr) return;
        const sB = +hr.getAttribute('data-staffb'), sBot = +hr.getAttribute('data-sbot');
        const keep = song; let K; try { song = song0; K = staffKeyInfoAt(mi); } finally { song = keep; }
        const accs = (byKey.get(vi + ':' + mi + ':0') || []).filter(x => x.cls === 'acc' && x.tr);
        tin.forEach(n => {
          const keep2 = song; let s2; try { song = song0; s2 = n === c0 ? staffStep(c0, K) : K.step0 + (n.deg - 1) + (n.oct || 0) * 7 + ottStep(c0); } finally { song = keep2; }
          const y = sB - (s2 - sBot) * (SG / 2);
          const a = accs.find(x => Math.abs(x.tr[1] - y) < 0.3);
          if (a) res.tieAcc.push({ a, v: c0.adds && c0.adds.length ? 'chord' : 'single' });
        });
      });
    });
    /* M4 行首换谱号：系统首小节第 0 列的换谱号画成小号中途谱号（行首谱号仍是旧谱号） */
    const rowFirst = new Set((r.sysMea || []).map(x => x[0]));
    res.rowClef = items.filter(it => it.cls === 'clefm' && it.ci === 0 && rowFirst.has(it.mi)).map(a => ({ a }));
    /* M5 人声（有歌词的五线谱声部）力度类记号画在谱表下方（把歌词推远） */
    const lyrV = new Set(); song0.measures.forEach(m => (m.voxes || []).forEach((cs, vi) => (cs || []).forEach(c => { if (c && (c.lyrics || []).some(x => x && String(x).trim())) lyrV.add(vi); })));
    res.vocalDynBelow = [];
    const dynSeen = new Set();
    /* 跨行的发夹 / cresc. 虚线续段画在终点那一行：按元素所在那一行（离它最近的谱表）比，不拿起点列那一行的谱表底线比 */
    const sBs = {}; const sBof = vi => sBs[vi] || (sBs[vi] = [...new Set([...svg.querySelectorAll(`rect[data-row="vox"][data-vi="${vi}"][data-staffb]`)].map(r => +r.getAttribute('data-staffb')))]);
    items.filter(it => ['dyn', 'hairpin', 'dtext', 'tempo', 'expr'].includes(it.cls) && lyrV.has(it.vi)).forEach(it => {
      if (dynSeen.has(it.key + it.cls)) return;
      const hr = hitRect(it.vi, it.mi, it.ci); if (!hr) return;
      const cy = (it.box[1] + it.box[3]) / 2, L = sBof(it.vi);
      const sB = L.length ? L.reduce((b, v) => Math.abs(v - 15 - cy) < Math.abs(b - 15 - cy) ? v : b, L[0]) : +hr.getAttribute('data-staffb');
      if (it.box[1] > sB) { dynSeen.add(it.key + it.cls); res.vocalDynBelow.push({ a: it }); }
    });
    /* M6 整组在一条符杠下的连音仍画弧线（有符杠的连音应只写数字） */
    res.tupArcBeamed = [];
    items.filter(it => it.cls === 'tup' && it.tag === 'path').forEach(t => {
      const bm = items.find(b => b.cls === 'beam' && b.vi === t.vi && b.mi === t.mi && b.box[0] <= t.box[0] + 3 && b.box[2] >= t.box[2] - 3);
      if (bm) res.tupArcBeamed.push({ a: t });
    });
    /* M7 歌词：段号不写「1.」/ 段号贴首字（净距 <3）；同一行相邻音节相贴（净距 <2，含相交）；标点与词之间有空隙（>1.5） */
    res.verseFmt = []; res.verseGap = []; res.lyrTight = []; res.puncGap = [];
    const lyrs = items.filter(it => it.cls === 'lyr' || it.cls === 'lyrp');
    items.filter(it => it.cls === 'verse').forEach(v => {
      if (!/\.$/.test(v.txt.trim())) res.verseFmt.push({ a: v });
      const cy = (v.box[1] + v.box[3]) / 2;
      const nx = lyrs.filter(l => l.box[1] < cy && l.box[3] > cy && l.box[0] >= v.box[0]).sort((p, q) => p.box[0] - q.box[0])[0];
      if (nx && nx.box[0] - v.box[2] < 3) res.verseGap.push({ a: v, b: nx, v: +(nx.box[0] - v.box[2]).toFixed(1) });
    });
    const rows = new Map();
    lyrs.forEach(l => { const k = Math.round(+l.el.getAttribute('y')) + ':' + l.vi; let L = rows.get(k); if (!L) rows.set(k, L = []); L.push(l); });
    rows.forEach(L => {
      L.sort((p, q) => p.box[0] - q.box[0]);
      for (let i = 1; i < L.length; i++) {
        const p = L[i - 1], q = L[i];
        if (p.key === q.key) {
          /* 标点空隙＝标点实际起笔 x − 「词（去掉尾空格）照常排字时标点该在的 x」：词以 text-anchor middle 排在 nx，标点紧接其后才是自然间距（字体自带的字间距不算空隙） */
          if (p.cls === 'lyr' && q.cls === 'lyrp') {
            const c = ctx2(), cs = getComputedStyle(p.el), SC = 16; c.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + ((parseFloat(cs.fontSize) || 16) * SC) + 'px ' + cs.fontFamily;
            const full = c.measureText(p.txt).width / SC, trim = c.measureText(p.txt.replace(/\s+$/, '')).width / SC;
            const extra = +q.el.getAttribute('x') - (+p.el.getAttribute('x') - full / 2 + trim);
            if (extra > 1.5) res.puncGap.push({ a: p, b: q, v: +extra.toFixed(1) });
          }
          continue;
        }
        if (q.box[0] - p.box[2] < 2) res.lyrTight.push({ a: p, b: q, v: +(q.box[0] - p.box[2]).toFixed(1) });
      }
    });
    return res;
  }
  const desc = it => it && { cls: it.cls, vi: it.vi, mi: it.mi, ci: it.ci, txt: it.txt, box: it.box.map(v => +v.toFixed(1)), tr: it.tr || undefined };

  /* 排一份谱并普查：sample={name, song}（song 先经 migrate 规范化）；opt.svg＝直接普查已有的谱面 svg（如编辑器 #score，调用方先开 __pyqGeom 再 render） */
  window.__gcRun = (sample, opt) => {
    opt = opt || {};
    let svg = opt.svg ? document.querySelector(opt.svg) : null, host = null, r = {}, song0 = null;
    if (!svg) {
      host = document.createElement('div'); host.style.cssText = 'position:absolute;left:-30000px;top:0;width:4000px;pointer-events:none';
      svg = document.createElementNS(NS, 'svg'); host.appendChild(svg); document.body.appendChild(host);
      song0 = migrate(JSON.parse(JSON.stringify(sample.song)));
      window.__pyqGeom = true;
      try { r = renderOffscreen({ song: song0, target: svg, paperW: opt.paperW || 870, crop: true }) || {}; } finally { window.__pyqGeom = false; }
      const vb = svg.viewBox.baseVal; svg.setAttribute('width', vb.width); svg.setAttribute('height', vb.height);
    } else { song0 = song; r = { sysMea: (window.__gcSysMea || []) }; }
    const items = collect(svg);
    const P = pairs(items, opt.nearPad), Mx = metrics(svg, items, song0, r);
    let lbl = null; try { lbl = meaNoBuild(song0).lbl; } catch (_) {}
    const mno = mi => lbl && lbl[mi] ? String(lbl[mi]) : (mi + 1) + '（不编号）';
    const cnt = {}; items.forEach(it => { cnt[it.cls] = (cnt[it.cls] || 0) + 1; });
    const ex = (a, b) => ({ m: mno(a.mi), mi: a.mi, vi: a.vi, ci: a.ci, a: desc(a), b: desc(b) });
    const out = {
      name: sample ? sample.name : opt.svg, nItems: items.length, cnt, svgH: svg.viewBox.baseVal.height,
      pairs: P.out.map(x => Object.assign({ cat: x.cat, area: x.area }, ex(items[x.a], items[x.b]))),
      near: P.near.map(x => Object.assign({ cat: x.cat }, ex(items[x.a], items[x.b]))),
      metrics: Object.fromEntries(Object.entries(Mx).map(([k, L]) => [k, L.map(x => Object.assign({ v: x.v }, ex(x.a, x.b || x.a)))])),
    };
    if (opt.keep) { window.__gcLast = { svg, host, items }; } else if (host) host.remove();
    return out;
  };
  window.__gcPresets = () => PRESETS.map((p, i) => ({ name: '预设' + i + '·' + p.name, song: p.make() }));
  return true;
}

/* ---------------- 样本 ---------------- */
const LIB_PATH = path.join(__dirname, '..', '..', 'api', 'seed-library.json');
function libSamples() {
  const L = JSON.parse(fs.readFileSync(LIB_PATH, 'utf8'));
  return L.map(x => ({ name: x.title || x.data.title, id: x.id, song: x.data, kind: 'lib' }));
}
/* 压力小样：每份一个主题，专门把容易相撞的记号放到最容易撞的位置（低音加线、加线上方、密集临时记号、连音带词…） */
const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
const R = (dur, o) => V(0, dur, o);
const SONG = (title, voices, nots, meas, extra) => Object.assign({
  v: 3, title, singer: '', lyricist: '', composer: '', maker: '', key: 'C', beats: 4, unit: 4, tempo: 80, capo: 0, customChords: {},
  tabVoices: [], voxVoices: voices, voxNotations: nots, lyricLines: 1, measures: meas.map(vx => ({ tabs: [], voxes: vx })),
}, extra || {});
function stressSamples() {
  const S = [];
  /* S1 钢琴大谱表：右手下加线低音 + 左手下加线低音 + 每小节踏板（天鹅之歌同型） */
  { const M = [];
    for (let k = 0; k < 6; k++) {
      const rh = [R(8, { ped: k ? 'off' : undefined }), V(6, 16, { oct: -1, ped: 'on' }), V(1, 16), V(5, 16, { oct: -1 }), V(3, 16, { oct: -1 }), R(8, { ped: 'off' }), V(4, 16, { oct: -1, ped: 'on' }), V(6, 16, { oct: -1 }), V(1, 16), V(4, 16, { oct: -1 })];
      const lh = [V(5, 4, { dotted: true, oct: -2, adds: [{ deg: 1, acc: '', oct: -1 }] }), V(1, 4, { dotted: true, oct: -2, ped: k === 5 ? 'off' : undefined })];
      M.push([rh, lh]);
    }
    S.push({ name: '压力·低音加线＋踏板', kind: 'stress', song: SONG('低音加线踏板', ['右手', '左手'], ['staff', 'bass'], M, { beats: 6, unit: 8, voxGroups: [{ type: 'brace', from: 0, to: 1 }] }) }); }
  /* S2 力度 / 发夹 / cresc. 文字虚线：落在下加线低音与上方高音下 */
  { const M = [];
    for (let k = 0; k < 6; k++) M.push([[V(5, 8, { oct: -1, dyn: ['p', 'f', 'mf', 'sfz', 'pp', 'ff'][k] }), V(6, 8, { oct: -1 }), V(3, 8, { oct: -1, dyn: k % 2 ? '<' : '>', dynTo: { mi: k, ci: 5 } }), V(1, 8), V(4, 8, { oct: -1, dyn: k === 2 ? 'cresc.' : k === 4 ? 'dim.' : undefined, dynTo: (k === 2 || k === 4) ? { mi: k + 1, ci: 2 } : undefined }), V(2, 8, { oct: -1 }), V(5, 8, { oct: -1, dyn: k === 1 ? 'rit.' : k === 3 ? 'dolce' : undefined }), V(1, 8, { oct: -1 })]]);
    S.push({ name: '压力·力度发夹低音', kind: 'stress', song: SONG('力度发夹', ['旋律'], ['staff'], M) }); }
  /* S3 文字标注 [sim.] / 表情词 / 速度术语：放在上方有符杠的高音上 */
  { const M = [];
    for (let k = 0; k < 4; k++) M.push([[V(6, 16, { anno: ['[sim.]', 'leggiero', 'animato', '(Tempo I)'][k] }), V(1, 16, { oct: 1 }), V(3, 16, { oct: 1 }), V(5, 16, { oct: 1 }), V(6, 16, { oct: 1, anno: k === 1 ? 'cresc. poco a poco' : undefined }), V(4, 16, { oct: 1 }), V(2, 16, { oct: 1 }), V(7, 16), V(5, 16), V(1, 16, { oct: 1 }), V(3, 16, { oct: 1 }), V(5, 16, { oct: 1 }), V(4, 4, { oct: 1 })]]);
    S.push({ name: '压力·文字标注符杠', kind: 'stress', song: SONG('文字标注', ['旋律'], ['staff'], M) }); }
  /* S4 8va / 8vb 线：高音加线上方 / 低音加线下方 */
  { const M = [];
    M.push([[V(3, 8, { oct: 1, ott: '8va', ottTo: { mi: 1, ci: 3 } }), V(5, 8, { oct: 1 }), V(1, 8, { oct: 2 }), V(3, 8, { oct: 2 }), V(5, 4, { oct: 1 }), V(1, 4, { oct: 2 })]]);
    M.push([[V(2, 8, { oct: 2 }), V(7, 8, { oct: 1 }), V(5, 8, { oct: 1 }), V(3, 8, { oct: 1 }), V(1, 2, { oct: 1 })]]);
    M.push([[V(5, 8, { oct: -1, ott: '8vb', ottTo: { mi: 3, ci: 3 } }), V(3, 8, { oct: -1 }), V(1, 8, { oct: -1 }), V(6, 8, { oct: -2 }), V(5, 4, { oct: -2 }), V(1, 4, { oct: -1 })]]);
    M.push([[V(4, 8, { oct: -1 }), V(2, 8, { oct: -1 }), V(7, 8, { oct: -2 }), V(5, 8, { oct: -2 }), V(1, 2, { oct: -1 })]]);
    S.push({ name: '压力·八度线', kind: 'stress', song: SONG('八度线', ['旋律'], ['staff'], M) }); }
  /* S5 连音：有符杠（八分三连音）/ 无符杠（四分三连音）/ 带歌词 / 高低音 */
  { const M = [];
    const lz = ['ta', 'ka', 'di', 'mi', 'la', 'so'];
    for (let k = 0; k < 4; k++) M.push([[V(1 + k, 8, { tup: 3, oct: k > 1 ? 1 : 0, lyrics: [lz[0]] }), V(2 + k, 8, { tup: 3, lyrics: [lz[1]] }), V(3 + k, 8, { tup: 3, lyrics: [lz[2]] }), V(5, 4, { tup: 3, oct: k % 2 ? 1 : -1, lyrics: [lz[3]] }), V(4, 4, { tup: 3, lyrics: [lz[4]] }), V(3, 4, { tup: 3, lyrics: [lz[5]] }), V(2, 16, { tup: 3 }), V(4, 16, { tup: 3 }), V(6, 16, { tup: 3 }), R(8)]]);
    S.push({ name: '压力·连音带词', kind: 'stress', song: SONG('连音', ['人声'], ['staff'], M) }); }
  /* S6 密集临时记号与和弦重升号：十六分音符逐音变化音、和弦内三度 / 二度带升号、重升号 */
  { const M = [];
    M.push([[V(1, 16, { acc: '#' }), V(2, 16, { acc: '#' }), V(4, 16, { acc: '#' }), V(5, 16, { acc: '#' }), V(6, 16, { acc: 'b' }), V(7, 16, { acc: 'b' }), V(2, 16, { acc: 'b', oct: 1 }), V(3, 16, { acc: 'b', oct: 1 }), V(1, 4, { acc: '#', adds: [{ deg: 3, acc: '#', oct: 0 }, { deg: 5, acc: '#', oct: 0 }] }), V(4, 4, { acc: 'x', adds: [{ deg: 5, acc: 'x', oct: 0 }, { deg: 6, acc: '#', oct: 0 }] })]]);
    M.push([[V(3, 8, { acc: '#', adds: [{ deg: 4, acc: '#', oct: 0 }] }), V(4, 8, { acc: 'b', adds: [{ deg: 5, acc: 'b', oct: 0 }] }), V(6, 8, { acc: '#', adds: [{ deg: 7, acc: '#', oct: 0 }, { deg: 2, acc: '#', oct: 1 }] }), V(1, 8, { oct: 1, acc: 'b' }), V(2, 16, { acc: '#', oct: 1 }), V(2, 16, { oct: 1 }), V(2, 16, { acc: 'b', oct: 1 }), V(5, 16, { acc: '#' }), V(5, 4, { acc: 'x' })]]);
    M.push([[V(7, 8, { acc: '#', oct: -1, adds: [{ deg: 2, acc: '#', oct: 0 }, { deg: 4, acc: '#', oct: 0 }] }), V(1, 8, { acc: 'x' }), V(2, 8, { acc: 'x' }), V(3, 8, { acc: '#' }), V(4, 2, { acc: '#', adds: [{ deg: 5, acc: '#', oct: 0 }, { deg: 6, acc: '#', oct: 0 }, { deg: 7, acc: '#', oct: 0 }] })]]);
    S.push({ name: '压力·密集临时记号', kind: 'stress', song: SONG('密集临时记号', ['旋律'], ['staff'], M) }); }
  /* S7 跨小节延音和弦（带升降号，含跨行）＋ 二度和音（干上 / 干下）＋ 朝下符尾 */
  { const CH = o => V(4, 8, Object.assign({ acc: '#', adds: [{ deg: 6, acc: 'b', oct: 0 }, { deg: 1, acc: '#', oct: 1 }] }, o));
    const M = [];
    for (let k = 0; k < 6; k++) M.push([[CH(), V(6, 8, { oct: 1, adds: [{ deg: 7, acc: 'b', oct: 1 }] }), V(4, 16, { oct: 1 }), V(5, 16, { oct: 1 }), V(3, 8, { oct: 1 }), V(1, 4, { acc: '#', adds: [{ deg: 2, acc: '', oct: 0 }] }),
      V(4, 4, { acc: '#', tie: true, adds: [{ deg: 6, acc: 'b', oct: 0, tie: true }, { deg: 1, acc: '#', oct: 1, tie: true }] })]]);
    const s = SONG('跨小节延音和弦', ['旋律'], ['staff'], M);
    s.measures[2].brk = 1;   /* 第 3 → 4 小节的延音跨行 */
    S.push({ name: '压力·延音和弦与二度', kind: 'stress', song: s }); }
  /* S8 整小节休止 + 延长号；方括号组（合唱）＋ 多行（小节号在方括号组首行） */
  { const M = [];
    for (let k = 0; k < 9; k++) {
      const sop = k % 3 === 2 ? [R(4, { ferm: true }), R(4), R(4), R(4)] : [V(3, 4, { lyrics: ['la'] }), V(5, 4, { lyrics: ['la'] }), V(1, 2, { oct: 1, lyrics: ['la'], dyn: k === 0 ? 'mf' : undefined })];
      const alt = [V(1, 2), V(3, 2)];
      const ten = k % 3 === 1 ? [R(4, { ferm: true }), R(4), R(4), R(4)] : [V(5, 2, { oct: -1 }), V(1, 2)];
      const bas = [V(1, 2, { oct: -1 }), V(5, 2, { oct: -2 })];
      M.push([sop, alt, ten, bas]);
    }
    S.push({ name: '压力·整小节休止延长号与方括号', kind: 'stress', song: SONG('合唱方括号', ['女高', '女低', '男高', '男低'], ['staff', 'staff', 'staff', 'bass'], M, { voxGroups: [{ type: 'bracket', from: 0, to: 3 }] }) }); }
  /* S9 人声力度 + 歌词（人声谱表下的力度把歌词推远）＋ 多段歌词段号 / 标点 */
  { const M = [];
    const w1 = ['Ich', 'hab', 'im', 'Traum', 'ge-', 'wei-', 'net,', 'mir', 'träum-', 'te,', 'du', 'lä-', 'gest', 'im', 'Grab.', 'Ich'];
    const w2 = ['Und', 'wenn', 'die', 'Son-', 'ne', 'scheint', 'weckt', '.', 'mich', 'ich', 'wach-', 'te', 'auf', 'und', 'die', 'Thrä-'];
    for (let k = 0; k < 4; k++) M.push([[V(3, 8, { lyrics: [w1[k * 4], w2[k * 4]], dyn: ['p', 'mf', '<', 'f'][k], dynTo: k === 2 ? { mi: 2, ci: 3 } : undefined }), V(4, 8, { lyrics: [w1[k * 4 + 1], w2[k * 4 + 1]] }), V(5, 4, { lyrics: [w1[k * 4 + 2], w2[k * 4 + 2]] }), V(6, 8, { lyrics: [w1[k * 4 + 3], w2[k * 4 + 3]] }), V(5, 8, { oct: 0, lyrics: ['', ''] }), V(1, 4, { oct: 1, lyrics: ['', ''] })]]);
    S.push({ name: '压力·人声力度与歌词', kind: 'stress', song: SONG('人声力度歌词', ['人声'], ['staff'], M, { lyricLines: 2 }) }); }
  /* S10 行首换谱号（换谱号落在换行后第一小节的第 0 列）＋ 小节中途换谱号 */
  { const M = [];
    for (let k = 0; k < 6; k++) M.push([[V(1, 4, { oct: k > 2 ? -2 : 0, clef: k === 3 ? 'bass' : undefined }), V(3, 4, { oct: k > 2 ? -2 : 0 }), V(5, 4, { oct: k > 2 ? -2 : 0, clef: k === 1 ? 'bass' : k === 4 ? 'staff' : undefined }), V(1, 4, { oct: k === 1 ? -1 : k > 2 && k !== 4 ? -1 : 1 })]]);
    const s = SONG('行首换谱号', ['旋律'], ['staff'], M);
    s.measures[2].brk = 1;   /* 第 4 小节（index 3）起新行，换谱号落在新行行首 */
    S.push({ name: '压力·行首换谱号', kind: 'stress', song: s }); }
  /* S11（v69.7 验收 B1）人声五线谱行：高音区旋律 + 每小节和弦名（智能配和弦写入的 c.chord）+ 力度 / 发夹 / cresc. + 8va + [sim.]——
     人声力度画在谱表上方后要让开和弦名框（框是纸色底 + 描边，此前不算墨迹，力度落进框里） */
  { const M = [], ly = ['春', '风', '吹', '过', '大', '地', '花', '开'];
    for (let k = 0; k < 8; k++) M.push([[
      V(5, 4, { oct: 1, chord: ['C', 'Am', 'F', 'G7'][k % 4], dyn: ['mf', 'p', 'f', '<', 'sfz', 'pp', '>', 'ff'][k], dynTo: (k === 3 || k === 6) ? { mi: k, ci: 3 } : undefined, lyrics: [ly[k]],
        ott: k === 2 ? '8va' : undefined, ottTo: k === 2 ? { mi: 2, ci: 1 } : undefined, anno: k === 4 ? '[sim.]' : undefined }),
      V(3, 4, { oct: 2, lyrics: ['啊'] }), V(1, 4, { oct: 2, lyrics: ['呀'], acc: k % 2 ? '#' : '' }),
      V(6, 4, { oct: 1, lyrics: ['哦'], dyn: k === 5 ? 'cresc.' : undefined, dynTo: k === 5 ? { mi: 6, ci: 2 } : undefined })]]);
    S.push({ name: '压力·人声力度与和弦名', kind: 'stress', song: SONG('人声力度和弦名', ['旋律'], ['staff'], M) }); }
  return S;
}
const allSamples = (only) => {
  const want = k => !only || !only.length || only.includes(k);
  return [].concat(want('lib') ? libSamples() : [], want('stress') ? stressSamples() : []);
};

/* ---------------- Node 侧：跑与汇总 ---------------- */
/* 谱表上下方向避让的记号（index.html avPlace 放的那几类）：与和弦名框也量贴近（B1） */
const AVM = ['ped', 'dyn', 'hairpin', 'dtext', 'tempo', 'expr', 'anno', 'ott'];
const CFG = { MARK, INK, INK_PAIRS, AVM };
async function inject(page) { return page.evaluate(GC_PAGE, CFG); }
/* samples：[{name, song}]；presets=true 时追加页面里的 16 个预设 */
async function census(page, samples, opt) {
  opt = opt || {};
  await inject(page);
  const list = samples.slice();
  if (opt.presets !== false) { const P = await page.evaluate(() => __gcPresets()); P.forEach(p => list.push(Object.assign(p, { kind: 'preset' }))); }
  const per = [];
  for (const s of list) {
    const r = await page.evaluate(([smp, o]) => __gcRun(smp, o), [{ name: s.name, song: s.song }, { paperW: opt.paperW || 870 }]);
    r.kind = s.kind; per.push(r);
  }
  return summarize(per);
}
/* 汇总：类别对计数 + 例子（曲名 · 第 N 小节 · 类别对），度量计数 + 例子 */
function summarize(per) {
  const cats = {}, near = {}, met = {};
  const add = (T, k, smp, x) => { const o = T[k] || (T[k] = { n: 0, ex: [], songs: {} }); o.n++; o.songs[smp] = (o.songs[smp] || 0) + 1; if (o.ex.length < 6) o.ex.push(smp + ' 第' + x.m + '小节' + (x.vi != null ? '（声部' + x.vi + '）' : '') + (x.a && x.a.txt ? ' 「' + x.a.txt + '」' : '') + (x.b && x.b.txt && x.b !== x.a ? '×「' + x.b.txt + '」' : '')); };
  per.forEach(r => {
    r.pairs.forEach(x => add(cats, x.cat, r.name, x));
    r.near.forEach(x => add(near, x.cat, r.name, x));
    Object.entries(r.metrics).forEach(([k, L]) => { met[k] = met[k] || { n: 0, ex: [], songs: {} }; L.forEach(x => add(met, k, r.name, x)); });
  });
  return { per, cats, near, met };
}
/* 类组（报告 / 断言口径）：把类别对归到负责人可读的若干类 */
const isDynLike = c => ['dyn', 'expr', 'tempo', 'dtext'].includes(c);
const INKSET = new Set(INK);
const GROUPS = [
  { id: 'C01', what: 'Ped. 踏板（文字 / 线 / *）与音符墨迹相撞（低音加线、符头、符干、符杠…）', grp: 'A', test: (a, b) => a === 'ped' && INKSET.has(b) },
  { id: 'C02', what: '力度 / 表情词 / 速度术语 / cresc. 文字与音符墨迹相撞', grp: 'A', test: (a, b) => isDynLike(a) && INKSET.has(b) },
  { id: 'C03', what: '发夹（渐强渐弱楔形）与音符墨迹相撞', grp: 'A', test: (a, b) => a === 'hairpin' && INKSET.has(b) },
  { id: 'C04', what: '文字标注（[sim.]、段落 / 表情文字）与音符墨迹相撞', grp: 'A', test: (a, b) => a === 'anno' && INKSET.has(b) },
  { id: 'C05', what: '八度线 8va / 8vb 与音符墨迹相撞', grp: 'A', test: (a, b) => a === 'ott' && INKSET.has(b) },
  { id: 'C06', what: '歌词 / 段号与音符墨迹相撞（歌词基线没让开低音）', grp: 'A', test: (a, b) => (a === 'lyr' || a === 'lyrp' || a === 'verse') && INKSET.has(b) },
  { id: 'C19', what: '谱表上方记号（人声力度 / 发夹 / cresc. / 8va / [sim.] 标注…）压到和弦名框（v69.7 验收 B1：框被当底色、没算墨迹）', grp: 'A', test: (a, b) => b === 'chord' && AVM.includes(a) },
  { id: 'C07', what: '记号与记号相撞（力度 × 歌词、发夹 × 力度、踏板 × 力度…）', grp: 'A', test: (a, b) => !INKSET.has(a) && !INKSET.has(b) && !['lyr', 'verse'].includes(a) && !(a === 'tup' || b === 'tup') && !(a === 'mnum' || b === 'mnum') },
  { id: 'C08', what: '连音数字 / 弧线与符杠、符干、符头或歌词相撞', grp: 'B', test: (a, b) => a === 'tup' || b === 'tup' },
  { id: 'C09', what: '小节号与方括号钩 / 谱号等相撞', grp: 'B', test: (a, b) => a === 'mnum' || b === 'mnum' },
  { id: 'C10', what: '临时记号与前一列（或同列错位）符头 / 休止 / 加线 / 附点 / 符干 / 拍号相撞（列宽没算临时记号栈）', grp: 'B', test: (a, b) => a === 'acc' && b !== 'acc' && b !== 'tie' && INKSET.has(b) },
  { id: 'C18', what: '连音线 / 圆滑线终点压到下一音的临时记号', grp: 'B', test: (a, b) => a === 'acc' && b === 'tie' },
  { id: 'C17', what: '圆滑线（按连音线导入的长弧）穿过中间音的符干 / 符头 / 符尾', grp: 'later', test: (a, b) => (a === 'tie' || b === 'tie') && INKSET.has(a) && INKSET.has(b) },
  { id: 'C11', what: '和弦内临时记号互相重叠（重升号 / 密集升降号错列不够）', grp: 'B', test: (a, b) => a === 'acc' && b === 'acc' },
  { id: 'C12', what: '符头与符头相嵌（二度和音错位量不足 / 列太挤）', grp: 'B', test: (a, b) => a === 'head' && b === 'head' },
  { id: 'C13', what: '符尾 / 符杠压符头（符干偏短）', grp: 'B', test: (a, b) => (a === 'flag' && b === 'head') || (a === 'head' && b === 'flag') || (a === 'beam' && b === 'head') || (a === 'head' && b === 'beam') },
  { id: 'C14', what: '其余墨迹相撞（附点 / 休止 / 连音线 / 倚音 / 中途谱号 × 他列墨迹）', grp: 'B', test: (a, b) => INKSET.has(a) && INKSET.has(b) },
  { id: 'C15', what: '演奏法记号（跳音 / 重音…）落在符干一侧压符干（方向没跟符杠组）· 和弦名 / 指法 / 延长号 / 装饰音压墨迹', grp: 'B', test: (a, b) => ['chord', 'fing', 'ferm', 'artic', 'orn', 'breath', 'nav', 'gliss'].includes(a) && INKSET.has(b) },
  { id: 'C16', what: '相邻歌词音节 / 段号与首字相撞', grp: 'B', test: (a, b) => (a === 'lyr' && b === 'lyr') || (a === 'lyr' && b === 'verse') || (a === 'verse' && b === 'lyr') },
];
const METRICS = [
  { id: 'M1', key: 'stemShort', what: '单符干（不在符杠组）短于 3.25 线距（标准 3.5；E4 符干偏短）', grp: 'B' },
  { id: 'M2', key: 'fermRest', what: '整小节休止上的延长号没对准全休止（偏到第一列）', grp: 'B' },
  { id: 'M3', key: 'tieAcc', what: '跨小节延音进来的和弦音又写临时记号', grp: 'B' },
  { id: 'M4', key: 'rowClef', what: '行首换谱号画成行内小号谱号（行首仍是旧谱号）', grp: 'B' },
  { id: 'M5', key: 'vocalDynBelow', what: '人声（有歌词）谱表的力度类记号画在谱表下方、把歌词推远', grp: 'A' },
  { id: 'M6', key: 'tupArcBeamed', what: '整组在一条符杠下的连音仍画弧线（有符杠只写数字）', grp: 'B' },
  { id: 'M7', key: 'verseFmt', what: '歌词段号不写「1.」', grp: 'B' },
  { id: 'M8', key: 'verseGap', what: '歌词段号紧贴首字（净距 <3px）', grp: 'B' },
  { id: 'M9', key: 'lyrTight', what: '同一行相邻歌词音节相贴（净距 <2px，含重叠）', grp: 'B' },
  { id: 'M10', key: 'puncGap', what: '歌词标点与词之间多出空隙（比照常排字多 >1.5px，「weckt .」）', grp: 'B' },
  { id: 'M11', key: 'stemShortBeamed', what: '（参考）符杠组内符干短于 2.75 线距', grp: 'B', info: true },
];
function groupCounts(r) {
  const out = {};
  GROUPS.forEach(g => { out[g.id] = { id: g.id, what: g.what, grp: g.grp, n: 0, cats: {}, ex: [] }; });
  Object.entries(r.cats).forEach(([cat, o]) => {
    const [a, b] = cat.split('×');
    const g = GROUPS.find(G => G.test(a, b));
    if (!g) return;
    const O = out[g.id]; O.n += o.n; O.cats[cat] = o.n; o.ex.forEach(e => { if (O.ex.length < 8) O.ex.push(cat + '：' + e); });
  });
  METRICS.forEach(m => { const o = r.met[m.key] || { n: 0, ex: [] }; out[m.id] = { id: m.id, what: m.what, grp: m.grp, n: o.n, ex: o.ex.slice(0, 6), info: !!m.info }; });
  return out;
}
function printReport(r, o) {
  o = o || {};
  const G = groupCounts(r);
  console.log('—— 碰撞普查：' + r.per.length + ' 份谱，标记元素 ' + r.per.reduce((a, x) => a + x.nItems, 0) + ' 个');
  Object.values(G).forEach(g => console.log((g.n ? '✗ ' : '· ') + g.id + ' [' + g.grp + '] ' + g.what + '：' + g.n + (g.cats && Object.keys(g.cats).length ? '  ' + Object.entries(g.cats).sort((p, q) => q[1] - p[1]).map(([k, v]) => k + ' ' + v).join(' · ') : '') + (g.ex.length ? '\n     例：' + g.ex.slice(0, 3).join(' ／ ') : '')));
  if (o.pairs) Object.entries(r.cats).sort((p, q) => q[1].n - p[1].n).forEach(([k, v]) => console.log('  ' + k + '：' + v.n));
  const nn = Object.entries(r.near).sort((p, q) => q[1].n - p[1].n);
  if (nn.length) console.log('  贴近（净空 <1.5px，不计入）：' + nn.slice(0, 12).map(([k, v]) => k + ' ' + v.n).join(' · '));
  return G;
}
/* 截图（修前 / 修后对照用）：把一份样本离屏排出来，按小节（数据下标 mis）× 声部（vis）裁切；红框＝相交（cats 里的类别对）、橙框＝贴近、紫框＝度量（mets 里的键，如 stemShort）。
   page 需 deviceScaleFactor 2 更清楚；o={mis:[2,3], vis:[1,2], cats:['ped'], mets:[], pad:14, file:'out.png'} */
async function shot(page, sample, o) {
  await inject(page);
  const r = await page.evaluate(([s, o]) => {
    const res = __gcRun(s, { paperW: o.paperW || 870, keep: true });
    const { svg, host, items } = window.__gcLast;
    host.style.cssText = 'position:fixed;left:0;top:0;background:#fff;z-index:2147483000;pointer-events:none';
    const sel = items.filter(it => o.mis.includes(it.mi) && o.vis.includes(it.vi));
    if (!sel.length) { host.remove(); return null; }
    const bx = [Math.min(...sel.map(i => i.box[0])), Math.min(...sel.map(i => i.box[1])), Math.max(...sel.map(i => i.box[2])), Math.max(...sel.map(i => i.box[3]))];
    const mark = (b, c) => { const R = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); R.setAttribute('x', b[0] - 1); R.setAttribute('y', b[1] - 1); R.setAttribute('width', b[2] - b[0] + 2); R.setAttribute('height', b[3] - b[1] + 2); R.setAttribute('fill', 'none'); R.setAttribute('stroke', c); R.setAttribute('stroke-width', '0.8'); svg.appendChild(R); };
    const hitC = cat => (o.cats || []).some(c => cat === c || cat.split('×').includes(c));
    res.near.filter(p => hitC(p.cat) && o.mis.includes(p.mi)).forEach(p => { mark(p.a.box, '#f59e0b'); mark(p.b.box, '#f59e0b'); });
    res.pairs.filter(p => hitC(p.cat) && o.mis.includes(p.mi)).forEach(p => { mark(p.a.box, '#dc2626'); mark(p.b.box, '#dc2626'); });
    (o.mets || []).forEach(k => (res.metrics[k] || []).filter(x => o.mis.includes(x.mi) && o.vis.includes(x.vi)).forEach(x => mark(x.a.box, '#c026d3')));
    const pad = o.pad == null ? 14 : o.pad;
    host.style.top = (-(bx[1] - pad) + 10) + 'px';
    const R0 = svg.getBoundingClientRect();
    return { x: R0.left + bx[0] - pad, y: R0.top + bx[1] - pad, width: bx[2] - bx[0] + 2 * pad, height: bx[3] - bx[1] + 2 * pad };
  }, [{ name: sample.name, song: sample.song }, o]);
  if (!r) return null;
  const vp = page.viewportSize();
  if (vp && (r.y + r.height > vp.height || r.x + r.width > vp.width)) await page.setViewportSize({ width: Math.max(vp.width, Math.ceil(r.x + r.width + 10)), height: Math.max(vp.height, Math.ceil(r.y + r.height + 10)) });
  await page.screenshot({ path: o.file, clip: r });
  await page.evaluate(() => { const L = window.__gcLast; if (L && L.host) L.host.remove(); window.__gcLast = null; });
  return r;
}
module.exports = { MARK, INK, INK_PAIRS, AVM, GROUPS, METRICS, GC_PAGE, CFG, inject, census, summarize, groupCounts, printReport, libSamples, stressSamples, allSamples, shot };

/* ---------------- 命令行 ---------------- */
if (require.main === module) {
  (async () => {
    const arg = k => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
    const { chromium } = require('playwright');
    const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
    const url = arg('url') ? toUrl(arg('url')) : 'file://' + path.resolve(__dirname, '../index.html');
    const only = arg('only') ? arg('only').split(',') : null;
    const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
    try {
      const sh = arg('shot');
      /* 普查口径＝设备像素比 1（与 tv_v697col 同）；截图用 2 倍更清楚 */
      const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: sh ? 2 : 1 })).newPage();
      pg.on('pageerror', e => console.log('pageerror: ' + e.message));
      await pg.goto(url); await pg.waitForTimeout(1200);
      if (sh) {
        const [who, mis, vis, cats, file] = sh.split(':'), S = allSamples();
        const smp = S.find(x => x.id === who || x.name === who || (x.name || '').indexOf(who) >= 0);
        if (!smp) throw new Error('没有这份样本：' + who);
        const cl = (cats || '').split(',').filter(Boolean), num = t => t.split(',').filter(Boolean).map(Number);
        const rr = await shot(pg, smp, { mis: num(mis), vis: num(vis), cats: cl.filter(c => !METRICS.some(m => m.key === c)), mets: cl.filter(c => METRICS.some(m => m.key === c)), file });
        console.log(rr ? '→ ' + file : '这几个小节 / 声部里没有带标记的元素');
        return;
      }
      const r = await census(pg, allSamples(only), { presets: !only || only.includes('preset') });
      printReport(r, { pairs: process.argv.includes('--pairs') });
      const js = arg('json'); if (js) { fs.writeFileSync(js, JSON.stringify({ cats: r.cats, near: r.near, met: r.met, groups: groupCounts(r) }, null, 1)); console.log('→ ' + js); }
    } finally { await b.close(); }
  })().catch(e => { console.error(e); process.exit(1); });
}
