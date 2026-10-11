/* v66.8 let ring / P.M. 连续段合并回归（出版惯例：GP / Hal Leonard / Behind Bars 延续线写法）
   ① 两小节 16 个连续 lr → 每行只 1 个「let ring」+ 1 条虚线（首音附近起、越过末音）+ 末端竖钩
   ② 中间插休止 → 断成 2 段
   ③ 跨行 → 首行段尾不收钩、虚线到行尾；新行行首写「(let ring)」、段末收钩
   ④ 同列多音全 lr → 不重复堆叠（只 1 个文字）
   ⑤ P.M. 同理（16 连音 1 段；休止断 2 段；跨行 (P.M.)）
   ⑥ 孤立 lr / 带 tk 范围的手动 lr / 带 tk 的 P.M. 观感保留（旧几何：文字 nx−6、首槽 tabTop−9、虚线 nx+40/nx+22 起到 tk+5）
   ⑦ 段内其他标注（无 tk 的 h 字母、拨片方向、标注文字、左手指法）改到虚线之上、互不相交；
      段内弧线 h（有 tk，字母跟弧）→ 段整体抬到弧顶字母之上，互不相交
   ⑧ GP5 二进制导入（逐音 let ring + 延音目标音不带标记 + 整段 P.M.）→ 渲染只 1 段 let ring、1 段 P.M.
   ⑪ 三连音 / 扫弦列 / 琶音列 / 带倚音列同走一套逻辑；𝄎 省写小节断段
   ⑨ 纵向预留：标注带多层时 TAB 顶线下移（段 + 3 层标注 → 下移 3 槽 34.5）、最高层不越出本系统顶 / 不压行内和弦图；lr+pm 重叠各占一槽；
      房子括线、文字式和弦名、联排五线谱 / 简谱联排行不与延续线相交
   ⑫ 和弦记在简谱行的弹唱谱：延续线横穿 TAB 上方图带时简谱行和弦图缩小让位、不相交 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');

/* GP5(5.10) 二进制夹具：与 tv_gp.js 同一写法（镜像读取器布局） */
const mkW = () => { const a = [];
  const w = { arr: a,
    b: v => a.push(v & 255),
    i: v => a.push(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >> 24) & 255),
    sh: v => a.push(v & 255, (v >> 8) & 255),
    z: n => { for (let i = 0; i < n; i++) a.push(0); },
    bss: (s, size) => { const bf = Buffer.from(s, 'utf8'); a.push(Math.min(bf.length, size));
      for (let i = 0; i < size; i++) a.push(i < bf.length ? bf[i] : 0); },
    ibs: s => { const bf = Buffer.from(s, 'utf8'); w.i(bf.length + 1); a.push(bf.length); bf.forEach(x => a.push(x)); },
    iss: s => { const bf = Buffer.from(s, 'utf8'); w.i(bf.length); bf.forEach(x => a.push(x)); } };
  return w; };
const gp5Ring = (() => {
  const w = mkW();
  w.bss('FICHIER GUITAR PRO v5.10', 30);
  ['LR测试', '', '', '', '', '', '', '', ''].forEach(s => w.ibs(s)); w.i(0);
  w.i(0); for (let i = 0; i < 5; i++) { w.i(0); w.iss(''); }
  w.i(0); w.z(4); w.z(11);
  w.z(30); for (let i = 0; i < 10; i++) w.ibs('');
  w.ibs(''); w.i(80); w.b(0);
  w.b(0); w.i(0);
  for (let i = 0; i < 64; i++) { w.i(0); w.z(8); }
  w.z(42);
  w.i(3); w.i(1);                                                     // 3 小节 1 轨
  w.b(0x03); w.b(4); w.b(4); w.z(4); w.z(1); w.b(0);                  // 头1：4/4
  w.z(1); w.b(0x00); w.z(1); w.b(0);                                  // 头2
  w.z(1); w.b(0x00); w.z(1); w.b(0);                                  // 头3
  w.z(1); w.b(0);
  w.bss('Acoustic', 40); w.i(6);
  [64, 59, 55, 50, 45, 40, 0].forEach(v => w.i(v));
  w.i(1); w.i(1); w.i(2); w.i(24); w.i(0); w.i(0);
  w.z(29);
  w.i(0); w.i(0); w.i(0); w.i(0);
  w.z(4); w.ibs(''); w.ibs('');
  w.z(1);
  const SB = s => 1 << (7 - s);                                       // 弦号 → 拍内弦位标志
  /* 八分音拍：fx=[f1,f2] 音符效果（f1&0x08 let ring / f2&0x02 P.M.）；tie=延音目标音（type 2，品位照转谱站写 0） */
  const beat = (s, f, fx, tie) => {
    w.b(0x00); w.b(1); w.b(SB(s));
    if (tie) { w.b(0x20); w.b(2); w.b(0); w.z(1); }
    else if (fx) { w.b(0x28); w.b(1); w.b(f); w.z(1); w.b(fx[0]); w.b(fx[1]); }
    else { w.b(0x20); w.b(1); w.b(f); w.z(1); }
    w.sh(0);
  };
  const LR = [0x08, 0x00], PM = [0x00, 0x02];
  const ARP = [[5, 3], [4, 2], [3, 0], [2, 1], [1, 0], [2, 1], [3, 0], [4, 2]];
  w.i(8); ARP.forEach(([s, f]) => beat(s, f, LR)); w.i(0); w.b(0);
  w.i(8);
  beat(5, 3, LR); beat(4, 2, LR); beat(2, 1, LR); beat(2, 1, null, true);   // 第 4 拍＝延音目标音（不带 let ring 标记）
  beat(1, 0, LR); beat(2, 1, LR); beat(3, 0, LR); beat(4, 2, LR);
  w.i(0); w.b(0);
  w.i(8); ARP.forEach(([s, f]) => beat(s, f, PM)); w.i(0); w.b(0);
  return Buffer.from(w.arr);
})();

/* 页面内助手：造曲 / 读延续线段 / 墨迹盒 / 相交检测 */
const HELPERS = () => {
  const N = (s, f, t, ex) => Object.assign({ s, f }, t ? { tech: t } : {}, ex || {});
  const C = (notes, dur, ex) => Object.assign({ dur: dur || 8, dotted: false, chord: '', notes, strum: '' }, ex || {});
  const ARP = [[5, 3], [4, 2], [3, 0], [2, 1], [1, 0], [2, 1], [3, 0], [4, 2]];
  const svg = () => document.getElementById('score');
  /* 按输出顺序把 文字/虚线/竖钩 组装成段——只认谱面形态（文字内容 + 3.5/2.6 虚线 + 紧随其后、与虚线末端相接的竖线），
     不依赖类名：旧版（逐音各写一个）同样能数，突变实证才有意义 */
  const RING_TXT = /^\(?(let ring|P\.M\.)\)?$/;
  const pieces = () => {
    const out = []; let lastDash = null;
    svg().querySelectorAll('text,line').forEach(el => {
      if (el.tagName === 'text') {
        if (RING_TXT.test(el.textContent)) { out.push({ K: /P\.M\./.test(el.textContent) ? 'pm' : 'lr', txt: el.textContent, x: +el.getAttribute('x'), y: +el.getAttribute('y'), el, line: null, hook: null }); lastDash = null; }
        return;
      }
      const cur = out[out.length - 1];
      if (el.getAttribute('stroke-dasharray') === '3.5 2.6') {
        if (cur && !cur.line) { cur.line = { x1: +el.getAttribute('x1'), x2: +el.getAttribute('x2'), y: +el.getAttribute('y1'), el }; lastDash = cur.line; }
        return;
      }
      if (lastDash && cur && !cur.hook && +el.getAttribute('x1') === +el.getAttribute('x2') && Math.abs(+el.getAttribute('x1') - lastDash.x2) < 0.05 && Math.abs(+el.getAttribute('y1') - lastDash.y) < 0.05)
        cur.hook = { x: +el.getAttribute('x1'), y1: +el.getAttribute('y1'), y2: +el.getAttribute('y2'), el };
      lastDash = null;
    });
    return out;
  };
  /* TAB 顶线（strcell si=1 的 y + 4.5）与列框 */
  const cell = (mi, ci, vi) => svg().querySelector(`rect.strcell[data-mi="${mi}"][data-ci="${ci}"][data-vi="${vi || 0}"][data-si="1"]`);
  const tabTop = (mi, ci, vi) => { const r = cell(mi, ci || 0, vi); return r ? +r.getAttribute('y') + 4.5 : null; };
  /* 音符 x：本列框内、坐在 s 弦上的品位数字 */
  const noteX = (mi, ci, s, vi) => {
    const r = cell(mi, ci, vi); if (!r) return null;
    const x0 = +r.getAttribute('x'), w = +r.getAttribute('width'), tt = +r.getAttribute('y') + 4.5;
    const yy = tt + (s - 1) * 9;
    const t = [...svg().querySelectorAll('text')].find(e => { const x = +e.getAttribute('x'), y = +e.getAttribute('y');
      return x >= x0 - 0.5 && x <= x0 + w + 0.5 && Math.abs(y - yy) < 4.5 && e.getAttribute('text-anchor') === 'middle'; });
    return t ? +t.getAttribute('x') : null;
  };
  /* 墨迹盒（屏幕坐标）：文字取字身盒内的墨迹带（顶 0.13h、底 0.95h，h=1.2em），线段按线宽外扩 */
  const ink = el => {
    const r = el.getBoundingClientRect();
    if (el.tagName === 'text') return { l: r.left, r: r.right, t: r.top + r.height * 0.13, b: r.top + r.height * 0.95 };
    if (el.tagName === 'line') return { l: r.left - 0.4, r: r.right + 0.4, t: r.top - 0.4, b: r.bottom + 0.4 };
    return { l: r.left, r: r.right, t: r.top, b: r.bottom };
  };
  const hit = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.3 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.3;
  /* 全谱墨迹元素（排除透明热区、选区色块、页底、谱线；排除延续线自身） */
  const inkEls = (skip) => [...svg().querySelectorAll('text,line,path,circle,polygon,rect')].filter(el => {
    if (skip && skip.has(el)) return false;
    const f = el.getAttribute('fill'), st = el.getAttribute('stroke');
    if (el.tagName === 'rect' && (f === 'transparent' || f === 'none' && !st || (f || '').includes('accent') || el.classList.contains('pagebg'))) return false;
    if ((el.getAttribute('opacity') || '1') === '0') return false;
    if (el.tagName === 'text' && !el.textContent.trim()) return false;
    if (el.classList.contains('pageno')) return false;
    if (el.tagName === 'line' && el.getAttribute('y1') === el.getAttribute('y2') && ['0.6', '0.8'].includes(el.getAttribute('stroke-width')) && Math.abs(+el.getAttribute('x2') - +el.getAttribute('x1')) > 120) return false;   // 谱线（房子括线等其他长横线照常参与）
    return true;
  });
  /* 延续线（文字/虚线/竖钩）与谱面其他墨迹的相交对 */
  const ringEls = () => pieces().flatMap(p => [p.el, p.line && p.line.el, p.hook && p.hook.el].filter(Boolean));
  const ringClashes = () => {
    const rs = ringEls(), rset = new Set(rs);
    const others = inkEls(rset).map(el => ({ el, b: ink(el) }));
    const bad = [];
    rs.forEach(r => { const a = ink(r); others.forEach(o => { if (hit(a, o.b)) bad.push((r.textContent || r.getAttribute('class')) + '×' + o.el.tagName + ':' + (o.el.textContent || o.el.getAttribute('d') || '').slice(0, 14)); }); });
    return bad;
  };
  /* 延续线之间相交（不同段） */
  const ringSelfClash = () => {
    const ps = pieces(); const bad = [];
    const els = p => [p.el, p.line && p.line.el, p.hook && p.hook.el].filter(Boolean);
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++)
      els(ps[i]).forEach(a => els(ps[j]).forEach(b => { if (hit(ink(a), ink(b))) bad.push(ps[i].txt + '×' + ps[j].txt); }));
    return bad;
  };
  const mk = (nMea, fill, opts) => {
    const s = createSong((opts && opts.type) || 'guitar', Object.assign({ beats: 4, unit: 4, key: 'C', nMea, nTab: 1, nVox: 0, lyr: 0 }, opts || {}));
    for (let mi = 0; mi < nMea; mi++) s.measures[mi].tabs[0] = fill(mi);
    return s;
  };
  const show = s => { window.guardReplace = p => p(); loadSong(s); blurSel = true; render(); };
  const count = re => (svg().innerHTML.match(re) || []).length;
  window.LR = { N, C, ARP, pieces, ringEls, tabTop, noteX, ink, hit, ringClashes, ringSelfClash, mk, show, count, inkEls, svg };
};

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(HELPERS);
  let pass = 0, total = 0;
  /* 断言可传函数：旧版缺字段时判失败而不是抛错中断（突变实证要跑完全部用例） */
  const T = (ok, name, detail) => { let v; try { v = typeof ok === 'function' ? !!ok() : !!ok; } catch (_) { v = false; }
    total++; if (v) pass++; console.log((v ? '✅' : '❌') + ' ' + name + (detail ? ': ' + detail : '')); };
  const J = o => JSON.stringify(o);
  /* 页面内断言脚本抛错（如旧版缺段）记为该项失败，不中断后续用例 */
  const ev = async (fn, arg) => { try { return await pg.evaluate(fn, arg); } catch (e) { return { error: String(e.message || e).split('\n')[0] }; } };

  // ① 两小节 16 个连续 let ring（同一行）
  let r = await ev(() => { const { N, C, ARP, mk, show, pieces, noteX, tabTop, count, ringClashes } = LR;
    show(mk(2, () => ARP.map(([s, f]) => C([N(s, f, 'lr')]))));
    const ps = pieces().filter(p => p.K === 'lr');
    const x0 = noteX(0, 0, 5), xL = noteX(1, 7, 4), tt = tabTop(0, 0);
    const sameRow = tabTop(1, 7) === tt;
    return { n: count(/let ring/g), ps: ps.map(p => ({ txt: p.txt, x: p.x, y: p.y, line: p.line && { x1: p.line.x1, x2: p.line.x2, y: p.line.y }, hook: p.hook && { x: p.hook.x, y1: p.hook.y1, y2: p.hook.y2 } })),
      x0, xL, tt, sameRow, clash: ringClashes() };
  });
  { const p = r.ps[0] || {};
    T(() => r.sameRow && r.n === 1 && r.ps.length === 1 && p.txt === 'let ring' && p.line && p.hook
      && Math.abs(p.x - (r.x0 - 6)) < 0.6 && Math.abs(p.y - (r.tt - 9)) < 0.6
      && p.line.x1 > r.x0 && p.line.x1 < r.x0 + 50 && p.line.x2 >= r.xL && p.line.x2 <= r.xL + 8
      && Math.abs(p.hook.x - p.line.x2) < 0.1 && p.hook.y2 > p.hook.y1 + 4 && Math.abs(p.hook.y1 - p.line.y) < 0.1
      && !r.clash.length,
      '① 16 连续 lr → 1 文字 + 1 虚线(首音→末音) + 末端竖钩', J({ n: r.n, p, x0: r.x0, xL: r.xL, clash: r.clash.slice(0, 3) })); }

  // ② 中间插休止 → 2 段（各自文字 + 虚线 + 钩）
  r = await ev(() => { const { N, C, ARP, mk, show, pieces, noteX, count } = LR;
    show(mk(2, mi => ARP.map(([s, f], ci) => (mi === 1 && ci === 2) ? C([]) : C([N(s, f, 'lr')]))));
    const ps = pieces();
    return { n: count(/let ring/g), k: ps.length, lines: ps.filter(p => p.line).length, hooks: ps.filter(p => p.hook).length,
      end1: ps[0] && ps[0].line && ps[0].line.x2, x11: noteX(1, 1, 4), x12r: noteX(1, 3, 2), st2: ps[1] && ps[1].x };
  });
  T(() => r.n === 2 && r.k === 2 && r.lines === 2 && r.hooks === 2 && r.end1 >= r.x11 && r.end1 < r.x11 + 8 && Math.abs(r.st2 - (r.x12r - 6)) < 0.6,
    '② 休止断段 → 2 段', J(r));

  // ③ 跨行：4 小节 lr，第 2 小节后强制换行
  r = await ev(() => { const { N, C, ARP, mk, show, pieces, noteX, tabTop, ringClashes } = LR;
    const s = mk(4, () => ARP.map(([st, f]) => C([N(st, f, 'lr')]))); s.measures[1].brk = 1; show(s);
    const ps = pieces();
    const t1 = tabTop(0, 0), t2 = tabTop(2, 0);
    return { ps: ps.map(p => ({ txt: p.txt, x: p.x, y: p.y, x2: p.line && p.line.x2, hook: !!p.hook })), t1, t2,
      xLast1: noteX(1, 7, 4), xFirst2: noteX(2, 0, 5), xLast2: noteX(3, 7, 4), clash: ringClashes() };
  });
  { const [a, c] = r.ps;
    T(() => r.ps.length === 2 && r.t2 > r.t1 && a.txt === 'let ring' && !a.hook && a.x2 > r.xLast1 + 5 && Math.abs(a.y - (r.t1 - 9)) < 0.6
      && c.txt === '(let ring)' && c.hook && Math.abs(c.x - (r.xFirst2 - 6)) < 0.6 && Math.abs(c.y - (r.t2 - 9)) < 0.6
      && c.x2 >= r.xLast2 && c.x2 < r.xLast2 + 8 && !r.clash.length,
      '③ 跨行：首行段尾不收钩到行尾、新行行首 (let ring) + 收钩', J(r).slice(0, 400)); }

  // ④ 同列多音全 lr（三音和弦列 × 8）→ 只 1 个文字；孤立多音列同样只写 1 次
  r = await ev(() => { const { N, C, ARP, mk, show, pieces, count } = LR;
    show(mk(2, mi => mi === 0 ? ARP.map(([s, f]) => C([N(s, f, 'lr'), N(6, 0, 'lr'), N(1, 0, 'lr')]))
      : [C([], 4), C([N(1, 0, 'lr'), N(2, 1, 'lr'), N(3, 0, 'lr')], 4), C([N(2, 1)], 4), C([N(3, 0)], 4)]));   // 首列休止：与上一小节的段断开
    return { n: count(/let ring/g), k: pieces().length, ys: pieces().map(p => p.y) };
  });
  T(() => r.n === 2 && r.k === 2 && r.ys[0] === r.ys[1], '④ 同列多音全 lr 不重复堆叠（连续段 1 次 + 孤立和弦列 1 次，同一槽高）', J(r));

  // ⑤ P.M.：16 连续 1 段；休止断 2 段；跨行 (P.M.)
  r = await ev(() => { const { N, C, ARP, mk, show, pieces, noteX, count } = LR;
    const out = {};
    show(mk(2, () => ARP.map(([s, f]) => C([N(s, f, 'pm')]))));
    let ps = pieces(); out.a = { n: count(/P\.M\./g), k: ps.length, hook: !!(ps[0] && ps[0].hook), x2: ps[0] && ps[0].line && ps[0].line.x2, xL: noteX(1, 7, 4) };
    show(mk(2, mi => ARP.map(([s, f], ci) => (mi === 0 && ci === 5) ? C([]) : C([N(s, f, 'pm')]))));
    ps = pieces(); out.b = { n: count(/P\.M\./g), k: ps.length, hooks: ps.filter(p => p.hook).length };
    const s = mk(3, () => ARP.map(([st, f]) => C([N(st, f, 'pm')]))); s.measures[0].brk = 1; show(s);
    ps = pieces(); out.c = ps.map(p => ({ txt: p.txt, hook: !!p.hook }));
    return out;
  });
  T(() => r.a.n === 1 && r.a.k === 1 && r.a.hook && r.a.x2 >= r.a.xL && r.a.x2 < r.a.xL + 8
    && r.b.n === 2 && r.b.k === 2 && r.b.hooks === 2
    && r.c.length === 2 && r.c[0].txt === 'P.M.' && !r.c[0].hook && r.c[1].txt === '(P.M.)' && r.c[1].hook,
    '⑤ P.M. 合并（1 段 / 休止断 2 段 / 跨行 (P.M.) 续段）', J(r));

  // ⑥ 孤立音与手动 tk 范围观感保留（旧几何口径）
  r = await ev(() => { const { N, C, mk, show, pieces, noteX, tabTop } = LR;
    const out = {};
    /* a 孤立 lr（无 tk，四分列）：只有文字，nx−6 / tabTop−9 */
    show(mk(1, () => [C([N(1, 5, 'lr')], 4), C([N(1, 7)], 4), C([N(1, 8)], 4), C([N(2, 8)], 4)]));
    let ps = pieces(); out.a = { k: ps.length, dx: ps[0] && ps[0].x - (noteX(0, 0, 1) - 6), dy: ps[0] && ps[0].y - (tabTop(0, 0) - 9), line: !!(ps[0] && ps[0].line) };
    /* b 手动 tk 范围 lr（首音 tk→第 3 列）：文字 + 虚线 nx+40 → tk+5，无钩（旧口径） */
    show(mk(1, () => [C([N(1, 5, 'lr', { tk: { mi: 0, ci: 2, si: 1 } })], 4), C([N(1, 7)], 4), C([N(1, 8)], 4), C([N(2, 8)], 4)]));
    ps = pieces(); const x0 = noteX(0, 0, 1), x2 = noteX(0, 2, 1);
    out.b = { k: ps.length, x1: ps[0] && ps[0].line && ps[0].line.x1 - (x0 + 40), x2: ps[0] && ps[0].line && ps[0].line.x2 - (x2 + 5), hook: !!(ps[0] && ps[0].hook), dy: ps[0] && ps[0].y - (tabTop(0, 0) - 9) };
    /* c 手动 tk 范围 P.M.：文字 + 虚线 nx+22 → tk+5 + 竖钩（旧口径） */
    show(mk(1, () => [C([N(5, 0, 'pm', { tk: { mi: 0, ci: 3, si: 5 } })], 4), C([N(5, 0)], 4), C([N(5, 2)], 4), C([N(5, 3)], 4)]));
    ps = pieces(); const y0 = noteX(0, 0, 5), y3 = noteX(0, 3, 5);
    out.c = { k: ps.length, x1: ps[0] && ps[0].line && ps[0].line.x1 - (y0 + 22), x2: ps[0] && ps[0].line && ps[0].line.x2 - (y3 + 5), hook: !!(ps[0] && ps[0].hook) };
    /* d 孤立 P.M.（无 tk）：只有文字 */
    show(mk(1, () => [C([N(5, 0, 'pm')], 4), C([N(5, 2)], 4), C([N(5, 3)], 4), C([N(5, 2)], 4)]));
    ps = pieces(); out.d = { k: ps.length, line: !!(ps[0] && ps[0].line) };
    /* e tk 范围 lr 后紧接另一段连续 lr（范围与段不相连）→ 各自成段 */
    show(mk(1, () => [C([N(1, 5, 'lr', { tk: { mi: 0, ci: 1, si: 1 } })]), C([N(1, 7)]), C([N(2, 5, 'lr')]), C([N(2, 7, 'lr')]), C([N(3, 5, 'lr')]), C([]), C([], 4)]));
    ps = pieces(); out.e = ps.map(p => p.txt + (p.hook ? '┘' : ''));
    return out;
  });
  T(() => r.a.k === 1 && Math.abs(r.a.dx) < 0.6 && Math.abs(r.a.dy) < 0.6 && !r.a.line
    && r.b.k === 1 && Math.abs(r.b.x1) < 0.6 && Math.abs(r.b.x2) < 0.6 && !r.b.hook && Math.abs(r.b.dy) < 0.6
    && r.c.k === 1 && Math.abs(r.c.x1) < 0.6 && Math.abs(r.c.x2) < 0.6 && r.c.hook
    && r.d.k === 1 && !r.d.line,
    '⑥ 孤立 lr / tk 范围 lr / tk 范围 P.M. 观感保留（旧几何；v66.7 同样通过）', J({ a: r.a, b: r.b, c: r.c, d: r.d }));
  T(() => r.e.length === 2 && r.e[1] === 'let ring┘', '⑥e tk 范围之后另起的连续段各自成段（范围不吞并后段）', J(r.e));

  // ⑦ 让位：段内列的 h（无 tk）/ 拨片 / 标注 / 左手指法 → 在虚线之上不相交；段内弧线 h（有 tk）→ 段抬到弧顶字母之上
  r = await ev(() => { const { N, C, ARP, mk, show, pieces, ink, hit, ringClashes, svg } = LR;
    const out = {};
    show(mk(2, mi => ARP.map(([s, f], ci) => {
      if (mi === 0 && ci === 2) return C([N(s, f, 'h'), N(6, 0, 'lr')]);      // 无 tk 的 h：标注带字母（同列另一音 lr，本列仍在段内）
      if (mi === 0 && ci === 3) return C([N(s, f, 'lr'), N(5, 3, 'h')]);      // 同列另一音 h（无 tk）
      if (mi === 0 && ci === 5) return C([N(s, f, 'lr')], 8, { pk: 'd' });
      if (mi === 1 && ci === 1) return C([N(s, f, 'lr', { lhF: '2' })], 8, { anno: 'rit.' });
      return C([N(s, f, 'lr')]);
    })));
    const ps = pieces(); const seg = ps.find(p => p.line && p.line.x2 > 300) || ps[ps.length - 1];
    const lineY = seg.line.y;
    const letters = [...svg().querySelectorAll('text')].filter(t => t.textContent === 'h' || t.textContent === 'rit.');
    const pk = [...svg().querySelectorAll('path')].find(p => /v -5 h 6\.8 v 5/.test(p.getAttribute('d') || ''));
    const lh = svg().querySelector('circle[r="4.7"]');
    const items = letters.concat(pk ? [pk] : [], lh ? [lh] : []);
    const segEls = [seg.el, seg.line.el, seg.hook && seg.hook.el].filter(Boolean);
    out.a = { k: ps.length, items: items.length, above: items.every(el => ink(el).b < ink(seg.line.el).t - 0.5),
      inter: items.filter(el => segEls.some(s2 => hit(ink(el), ink(s2)))).length, clash: ringClashes() };
    /* b 段内弧线 h（一弦 tk→下一列）：弧与弧顶字母留在原位，延续线整段抬到其上方 */
    show(mk(1, () => ARP.map(([s, f], ci) => ci === 3 ? C([N(1, 0, 'h', { tk: { mi: 0, ci: 4, si: 1 } }), N(5, 3, 'lr')])
      : ci === 4 ? C([N(1, 2, 'lr')]) : C([N(s === 1 ? 2 : s, f, 'lr')]))));
    const p2 = pieces();
    const hT = [...svg().querySelectorAll('text')].find(t => t.textContent === 'h');
    out.b = { k: p2.length, letterBelow: hT && ink(hT).t > ink(p2[0].line.el).b, clash: ringClashes() };
    return out;
  });
  T(() => r.a.items === 5 && r.a.above && r.a.inter === 0 && !r.a.clash.length && r.b.k === 1 && r.b.letterBelow && !r.b.clash.length,
    '⑦ 段内标注（h/拨片/标注/指法）让到虚线之上；弧线 h 字母留弧顶、段抬其上，均不相交', J(r));

  // ⑧ GP5 导入：逐音 let ring（含延音目标音不带标记）+ 整段 P.M. → 1 段 let ring、1 段 P.M.
  r = await ev((b64) => { const { show, pieces, count, ringClashes } = LR;
    const u8 = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const pr = parseGP(u8.buffer); if (pr.error) return { error: pr.error };
    const br = buildSongFromGP345(pr.gp, [0]); if (br.error) return { error: br.error };
    const sg = br.song;
    const lrN = sg.measures.reduce((a, m) => a + m.tabs[0].reduce((x, c) => x + c.notes.filter(n => n.tech === 'lr').length, 0), 0);
    const pmN = sg.measures[2].tabs[0].filter(c => c.notes.some(n => n.tech === 'pm')).length;
    const tieCol = sg.measures[1].tabs[0][3];
    show(sg);
    const ps = pieces();
    return { lrN, pmN, tieNoLr: tieCol && !tieCol.notes.some(n => n.tech), lrTxt: count(/let ring/g), pmTxt: count(/P\.M\./g),
      ps: ps.map(p => p.txt + (p.line ? '—' : '') + (p.hook ? '┘' : '')), clash: ringClashes() };
  }, gp5Ring.toString('base64'));
  T(!r.error && r.lrN === 15 && r.pmN === 8 && r.tieNoLr && r.lrTxt === 1 && r.pmTxt === 1
    && r.ps.length === 2 && r.ps.includes('let ring—┘') && r.ps.includes('P.M.—┘') && !r.clash.length,
    '⑧ GP5 导入逐音 let ring/P.M. → 渲染只 1 段 let ring + 1 段 P.M.（延音目标音不断段）', J(r));

  // ⑨ 纵向预留与避让
  r = await ev(() => { const { N, C, ARP, mk, show, pieces, ink, hit, ringClashes, ringSelfClash, tabTop, svg } = LR;
    const out = {};
    const base = () => mk(3, () => ARP.map(([s, f]) => C([N(s, f)])));
    /* a 无延续线、每列至多一层：TAB 顶线与旧版一致（基准） */
    show(base()); const t0 = [tabTop(0, 0), tabTop(2, 0)];
    /* b lr 段 + 段内 pk + anno + 指法 → 标注带 3 层：TAB 顶线下移 2 槽（23px），最高层不越出系统顶（meaBands.y） */
    const sb = base();
    sb.measures[0].tabs[0] = ARP.map(([s, f], ci) => C([N(s, f, 'lr', ci === 2 ? { lhF: '1' } : {})], 8, ci === 2 ? { pk: 'u', anno: 'cresc.' } : {}));
    show(sb);
    const t1 = tabTop(0, 0);
    const sysTop = meaBands[0].y;
    const anno = [...svg().querySelectorAll('text')].find(t => t.textContent === 'cresc.');
    const topY = Math.min(ink(anno).t, ...pieces().map(p => ink(p.el).t));
    const ctm = svg().getScreenCTM(), sysTopScr = ctm.f + ctm.d * sysTop;
    out.b = { dT: +(t1 - t0[0]).toFixed(1), topOK: topY >= sysTopScr - 0.5, clash: ringClashes() };
    /* c lr 与 pm 范围重叠：两段各占一槽（相距 11.5）、互不相交 */
    const sc = base();
    sc.measures[0].tabs[0] = ARP.map(([s, f], ci) => C([N(s, f, ci < 6 ? 'pm' : 'lr'), N(6, 0, ci >= 2 ? 'lr' : 'pm')]));
    show(sc);
    const pc = pieces();
    out.c = { ks: pc.map(p => p.K + ':' + p.y.toFixed(1)), self: ringSelfClash(), clash: ringClashes() };
    /* d 房子括线 + 段落标记 + 行内和弦图（缩小让位）：不相交 */
    const sd = base();
    sd.measures[0].tabs[0] = ARP.map(([s, f], ci) => C([N(s, f, 'lr')], 8, ci === 0 ? { chord: 'C' } : (ci === 4 ? { chord: 'G' } : {})));
    sd.measures[1].tabs[0] = ARP.map(([s, f]) => C([N(s, f, 'lr')]));
    sd.measures[1].volta = 1; sd.measures[1].label = 'A';
    show(sd);
    const diag = [...svg().querySelectorAll('g[data-tchord] *')];
    const rEls = LR.ringEls();
    out.d = { k: pieces().length, diagHit: rEls.filter(a => diag.some(d => hit(ink(a), ink(d)))).length, clash: ringClashes() };
    /* e 文字式和弦名（和弦图隐藏）+ 第二条 TAB 声部：段抬到和弦名之上、两声部不相交 */
    const se = mk(2, () => ARP.map(([s, f], ci) => C([N(s, f, 'lr')], 8, ci === 0 ? { chord: 'Am' } : {})), { nTab: 2 });
    se.diagPos = 'off';
    se.measures.forEach(m => { m.tabs[1] = ARP.map(([s, f], ci) => C([N(s, f, 'pm')], 8, ci === 0 ? { chord: 'Em' } : {})); });
    show(se);
    out.e = { k: pieces().length, clash: ringClashes(), self: ringSelfClash() };
    return out;
  });
  T(() => r.b.dT === 34.5 && r.b.topOK && !r.b.clash.length
    && r.c.ks.length === 2 && Math.abs(Math.abs(parseFloat(r.c.ks[0].split(':')[1]) - parseFloat(r.c.ks[1].split(':')[1])) - 11.5) < 0.05 && !r.c.self.length && !r.c.clash.length
    && r.d.k === 1 && r.d.diagHit === 0 && !r.d.clash.length
    && r.e.k === 2 && !r.e.clash.length && !r.e.self.length,
    '⑨ 纵向预留（多层下移、不越系统顶）/ lr+pm 各占一槽 / 房子括线·段落标记·和弦图·和弦名·双声部不相交', J(r).slice(0, 600));

  // ⑩ 联排五线谱（solo）与 TAB+简谱联排行：延续线不与上方谱表 / 简谱数字相交
  r = await ev(() => { const { N, C, ARP, mk, show, pieces, ringClashes } = LR;
    const out = {};
    const s1 = mk(2, () => ARP.map(([s, f]) => C([N(s, f, 'lr')])), { type: 'solo' });
    s1.tabStaff = true; s1.voxVoices = []; s1.measures.forEach(m => { m.voxes = []; });
    show(s1); out.staff = { k: pieces().length, clash: ringClashes() };
    const s2 = mk(2, () => ARP.map(([s, f]) => C([N(s, f, 'pm')])));
    s2.tabJp = true; show(s2); out.jp = { k: pieces().length, clash: ringClashes() };
    return out;
  });
  T(() => r.staff.k === 1 && !r.staff.clash.length && r.jp.k === 1 && !r.jp.clash.length,
    '⑩ 联排五线谱 / 简谱联排行：延续线 1 段且不相交', J(r));

  // ⑪ 三连音 / 扫弦列 / 琶音列 / 带倚音列同走一套：段内照常合并；𝄎 省写小节断段
  r = await ev(() => { const { N, C, mk, show, pieces, ringClashes } = LR;
    const out = {};
    const s = mk(2, mi => mi === 0
      ? [C([N(5, 3, 'lr')], 8, { tup: 1 }), C([N(4, 2, 'lr')], 8, { tup: 1 }), C([N(3, 0, 'lr')], 8, { tup: 1 }),
         C([N(1, 0, 'lr'), N(2, 1, 'lr'), N(3, 0, 'lr'), N(4, 2, 'lr'), N(5, 3, 'lr')], 4, { strum: 'd' }),
         C([N(1, 0, 'lr'), N(2, 1, 'lr'), N(3, 0, 'lr')], 4, { strum: 'arp' }),
         C([N(2, 3, 'lr')], 4, { grace: { notes: [{ s: 2, f: 1 }], dur: 16, tks: ['h'] } })]
      : [C([N(1, 0, 'lr')], 4), C([N(2, 1, 'lr')], 4), C([N(3, 0, 'lr')], 4), C([N(2, 1, 'lr')], 4)]);
    show(s);
    out.a = { ps: pieces().map(p => p.txt + (p.line ? '—' : '') + (p.hook ? '┘' : '')), clash: ringClashes() };
    const s2 = mk(3, () => [C([N(1, 0, 'lr')], 4), C([N(2, 1, 'lr')], 4), C([N(3, 0, 'lr')], 4), C([N(2, 1, 'lr')], 4)]);
    s2.measures[1].simile = 1; show(s2);
    out.b = { ps: pieces().map(p => p.txt + (p.hook ? '┘' : '')) };
    return out;
  });
  T(() => r.a.ps.length === 1 && r.a.ps[0] === 'let ring—┘' && !r.a.clash.length && r.b.ps.length === 2 && r.b.ps.every(t => t === 'let ring┘'),
    '⑪ 三连音/扫弦/琶音/倚音列段内照常合并、不相交；𝄎 省写小节断段', J(r));

  // ⑫ 和弦记在简谱行（弹唱谱）：行内和弦图画在 TAB 上方图带，延续线横穿图带时图同 TAB 列和弦图口径缩小让位、不相交；
  //    无延续线的行和弦图尺寸不变（验收补测：此前简谱行和弦图从不缩小，整行虚线穿过每张图的底边）
  r = await ev(() => { const { N, C, ARP, show, ringClashes, svg } = LR;
    const mkV = t => { const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 3, nTab: 1, nVox: 1, lyr: 1 });
      const CH = ['C', 'G', 'Am', 'F', 'Em', 'Dm'];
      s.measures.forEach((m, mi) => {
        m.tabs[0] = ARP.map(([st, f]) => C([N(st, f, t)]));
        m.voxes[0] = [1, 2, 3, 4].map((d, q) => ({ dur: 4, dotted: false, deg: d, acc: '', oct: 0, lyrics: ['啦'], tie: false, chord: q % 2 === 0 ? CH[(mi * 2 + q / 2) % 6] : '' }));
      });
      return s; };
    const wOf = () => [...svg().querySelectorAll('g[data-vchord]')].map(g => +g.getBBox().width.toFixed(1));
    show(mkV(null)); const w0 = wOf();
    show(mkV('lr')); const w1 = wOf(), c1 = ringClashes();
    /* P.M.（11 号字）文字与 0.75 缩图底边的净距是行内和弦图既有口径（TAB 列和弦图同样 ≈0），此处只验虚线 / 竖钩不穿图 */
    show(mkV('pm')); const c2 = ringClashes().filter(x => /^ring(ln|hk)/.test(x));
    return { n: w0.length, w0: w0[0], w1: w1[0], allSmall: w1.every((w, i) => w < w0[i] - 3), c1: c1.slice(0, 3), c2: c2.slice(0, 3) };
  });
  T(() => r.n === 6 && r.allSmall && !r.c1.length && !r.c2.length,
    '⑫ 简谱行和弦图：延续线横穿时缩小让位、不相交（无延续线时尺寸不变）', J(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
