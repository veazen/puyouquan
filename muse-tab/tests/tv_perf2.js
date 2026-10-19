'use strict';
/* v68.4 P2-b 轨 B（长谱每笔 / 排版模式每笔提速）——逐字节对拍 + 相对性能。file:// 直载，真实浏览器。
   被测：svgIncSet（#score 按谱行增量替换）· RMEMO（单次渲染记忆：tabTieMap / sysMetrics 整曲部分）· 同值不重写 #score 的 viewBox / 宽高 ·
         paperFitGuard 挪到换内容之后 · 排版 / 输出模式快照排进 SNAP_SVG + scoreExportParts 逐段序列化 + 预览页按段克隆填（fillSvg / applySnap）·
         pvBuild 保留 flw-pick · syncTools 一次查完。参考：window.__noRenderCache=true（整份 innerHTML、不记忆、快照写 #score、整份重建预览页＝v68.3 路径）。
   P0 分段前提：svgIncSafe 判定（自平衡 / 首尾 / 注释 CDATA / foreign content 跳出标签）；含跳出标签的段退回整份赋值。
   P1 书写逐字节：16 预设 + 14 种谱行组合（NWB.build，填入品位 / 音高 / 歌词 / 和弦）各跑 14 步编辑序列——写音 · 删音 · 改时值 · 加歌词 · 加和弦 ·
      换记谱法 · 移调 · 换谱类（lbSwitch）· 改版宽（纸张 A5 / 窗口 1280↔1440）· 缩放（显示 setViewZoom + 内容大小 layApply scale）· 换窗口（addDoc / switchDocTo）·
      撤销重做 · 主题深浅 · 不换行开关；缓存开 / 关两个全新页面各跑一遍，每一步 #score.innerHTML 的哈希与长度逐步相同（失败打印首个不同处）；
      缓存开那一遍每一步另查「#score 的 DOM 序列化 ＝ 同源字符串（各段源串相接）整份解析后的序列化」，并确认走的是增量（#score.__pqInc 在）。
   P2 长谱：200 小节和弦谱 / 双轨谱 / 120 小节钢琴谱，加两份特例——两轨在不同小节 / 弦上各有逐音连音线的双轨谱、只有一小节有下加线低音的 48 小节教学对照谱（同 P1 口径）。
   P3 外来改动：改播放头属性 · 改某一行深处元素的属性 · 往 #score 插节点 · 整份赋值空串 · 删掉一个顶层节点 之后再渲染，与关缓存逐字节相同。
   P4 排版 / 输出模式（新外壳）：进排版 → 此处换行 → 并入上一行 → 纸张 A5 → 内容大小 + → 撤销 → 预览尺寸悄悄变了再改曲名 → 进输出 → 回书写，每步 PV.content 哈希与关缓存相同、页壳宽高 / viewBox 相同；
      可视页 svg ＝ 整份解析 PV.content；逐页滚到后每页都相同；回书写后 #score 同关缓存；排版模式 pvBuild 不冲掉 #pv-pages.flw-pick。
   P5 旧外壳 ?shell=classic：P1 抽 4 份 + 打印预览 pvOpen 的 PV.content 与关缓存相同。
   P6 性能（相对口径，同一页面开 / 关缓存交替成块测，真实按键，帧时间＝事件时间戳→rAF→setTimeout0）：200 小节和弦谱 / 双轨谱每笔 开 ≤ 关×0.6；
      排版模式 150 小节和弦谱点「此处换行 / 并入上一行」到预览更新 开 ≤ 关×0.8。打印中位数 / IQR 与绝对值。
   P7「我的曲谱」只读快照 libLoadRO（剖析 B6 大库）：新外壳 / 旧外壳各一遍——存入、落盘后本机内容＝当前谱；外部直接改库后页签 / 保存胶囊立刻认；
      本机写不进（配额满）时快照不留就地改过的那份；libSave 之后快照跟上。
   P8 v68.4 收尾：预览页只放与本页相交的谱行段（PERF-3 / PERF-7）——逐页「页内容＝PV.cks 的按序子序列」+ 几何等价（整份谱面落在本页可见区的顶层元素一个不缺）；
      排版 / 此处换行之后 / 输出三种排布；回书写放掉预览页、离文档快照与分段串（PERF-4 / PERF-6）；页壳复用时旧页先藏起（C2 / UX-3）；
      输出模式里撤销 / 换窗口后进谱架第一帧不露旧谱面（UX-1）；排版模式下分享卡 / 成品克隆 / 打印切片与关缓存相同（C5）。
   P9 v68.4 收尾：变了的段按顶层元素复用（svgMorphCk，PERF-2）——两种外壳 × 5 份谱 × 10 步与关缓存逐字节相同、逐段边界正确；长谱移调确实留下过半原节点，__noMorph 对照。
   （P1 / P2 每步的增量检查 __incCheck 另查逐段边界与段首记号。）
   env：MUSETAB_URL 被测页（缺省 ../index.html）· REF_URL 参考页（缺省＝被测页加 __noRenderCache；给 v68.3 基线的 index.html 即跨版本逐字节对拍）·
        ONLY=P1,P4 只跑部分 · PERF=0 跳过 P6 */
const { chromium } = require('playwright');
const path = require('path');
const URL0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const REF = process.env.REF_URL ? (/^file:/.test(process.env.REF_URL) ? process.env.REF_URL : 'file://' + path.resolve(process.env.REF_URL)) : null;
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
let pass = 0, total = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name); console.log((ok ? '✅' : '❌') + ' ' + name + (d ? '：' + d : '')); };
const q = a => { const s = a.filter(x => x != null && !isNaN(x)).sort((x, y) => x - y); if (!s.length) return { med: NaN, q1: NaN, q3: NaN };
  const at = p => { const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
  return { med: +at(0.5).toFixed(1), q1: +at(0.25).toFixed(1), q3: +at(0.75).toFixed(1) }; };

/* ---------- 页内工具（每个页面 addInitScript 注入）---------- */
const PAGE_HELPERS = () => {
  window.__h = s => { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16) + ':' + s.length; };
  /* 增量拼出的 DOM ＝ 同源字符串整份解析（只在缓存开、#score 有分段状态时查） */
  window.__incCheck = () => { const sc = document.getElementById('score'), st = sc.__pqInc; if (!st) return 'noinc';
    const NS = 'http://www.w3.org/2000/svg', t = document.createElementNS(NS, 'svg'); t.innerHTML = st.cks.map(c => c.s).join('');
    if (t.innerHTML !== sc.innerHTML) return 'MISMATCH';
    /* v68.4 收尾 PERF-2（元素级复用 svgMorphCk）：逐段边界——每段的节点 f…l 恰是本段源串的解析结果、各段首尾相接盖满全部子节点、
       段首记号（__pqCk）只在段首且指向本段（别的节点上残留本 st 的记号会让外来改动标脏标到作废的段上） */
    const kids = [...sc.childNodes]; let k = 0;
    for (let i = 0; i < st.cks.length; i++) { const c = st.cks[i];
      if (!c.f) { if (c.s) { const e = document.createElementNS(NS, 'svg'); e.innerHTML = c.s; if (e.firstChild) return 'EMPTY@' + i; } continue; }
      if (kids[k] !== c.f || c.f.__pqCk !== c) return 'HEAD@' + i;
      const k0 = k; while (k < kids.length && kids[k] !== c.l) k++; if (k >= kids.length) return 'LAST@' + i;
      for (let j = k0 + 1; j <= k; j++) if (kids[j].__pqCk && kids[j].__pqCk.st === st) return 'MARK@' + i;
      const r = document.createRange(); r.setStartBefore(c.f); r.setEndAfter(c.l);
      const e = document.createElementNS(NS, 'svg'); e.appendChild(r.cloneContents()); const e2 = document.createElementNS(NS, 'svg'); e2.innerHTML = c.s;
      if (e.innerHTML !== e2.innerHTML) return 'SEG@' + i;
      k++; }
    return k === kids.length ? 'ok' : 'TAIL'; };
  /* 填谱：每小节首列写品位 / 音高，首个简谱声部写歌词，部分列写和弦 */
  window.__fill = s => { (s.measures || []).forEach((m, mi) => {
      (m.tabs || []).forEach((cols, vi) => { const c = cols && cols[0]; if (c) { c.notes = [{ s: 2 + ((mi + vi) % 4), f: (mi * 3 + vi) % 6 }]; if (mi % 3 === 0) c.chord = ['C', 'Am', 'F', 'G7'][mi % 4]; } });
      (m.voxes || []).forEach((cols, vi) => { (cols || []).forEach((c, ci) => { if (!c) return; c.deg = ((mi * 2 + ci + vi) % 7) + 1; if (vi === 0) c.lyrics = [['春', '风', '又', '绿', '江', '南', '岸'][(mi + ci) % 7]]; if (vi === 0 && ci === 0 && mi % 2 === 0) c.chord = ['C', 'Dm', 'G', 'Am'][mi % 4]; }); });
    }); return s; };
  window.__longOf = (pfx, n) => { const s = PRESETS.find(x => x.name.indexOf(pfx) === 0).make(); const base = s.measures.slice();
    while (s.measures.length < n) s.measures.push(JSON.parse(JSON.stringify(base[s.measures.length % base.length])));
    s.measures.length = n; s.title = s.title + '·' + n; return s; };
  window.__case = spec => {
    window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    if (typeof undoStack !== 'undefined') { undoStack.length = 0; redoStack.length = 0; }
    let s;
    if (spec.p != null) s = PRESETS[spec.p].make();
    else if (spec.k) s = __fill(NWB.build(spec.k, { title: '谱行' + spec.k, nMea: 6 }));
    else if (spec.long) s = __longOf(spec.long, spec.n);
    else if (spec.custom === 'tie2') {   /* 双轨谱：两轨在不同小节、不同弦上各有逐音连音线（note.tieIn）——单次渲染记忆的键里少了声部号，一轨的连音就会串到另一轨 */
      s = __longOf('两只老虎', 60);
      s.measures.forEach((m, mi) => { [[0, 0, 2, 3], [1, 2, 4, 7]].forEach(([vi, r, st, f]) => { const cols = (m.tabs || [])[vi]; if (!cols || cols.length < 2 || mi % 4 !== r) return;
        cols[0].notes = [{ s: st, f }]; cols[1].notes = [{ s: st, f, tieIn: true }]; delete cols[0].strum; delete cols[1].strum; }); });
    }
    else if (spec.custom === 'duallow') {   /* 教学对照谱：只有第 30 小节有下加线以下的低音——对照行只在那一行让位（sysMetrics 的 relDd 按本行小节取） */
      s = __longOf('欢乐颂（教学对照谱）', 48);
      const c = s.measures[30].voxes[0][0]; c.deg = 5; c.oct = -1;
    }
    loadSong(s);
    sel = { mi: Math.min(1, song.measures.length - 1), row: song.tabVoices.length ? 'tab' : 'vox', vi: 0, ci: 0, si: 2 }; clampSel(); render();
    return { n: song.measures.length, tab: song.tabVoices.length, vox: song.voxVoices.length };
  };
  const vox0 = () => { if (!song.voxVoices.length) return false; sel.row = 'vox'; sel.vi = 0; sel.ci = 0; clampSel(); return true; };
  const tab0 = () => { if (!song.tabVoices.length) return false; sel.row = 'tab'; sel.vi = 0; sel.ci = 0; sel.si = 2; clampSel(); return true; };
  const KINDS = ['J', 'S', 'SJ', 'T', 'JT', 'ST', 'G', 'CG', 'JG', 'SG', 'SJG', 'CJ', 'CS', 'C'];
  window.__OPS = {
    write: () => { sel.mi = Math.min(2, song.measures.length - 1); if (tab0()) { inputDigit('3'); } if (vox0()) { sel.mi = Math.min(3, song.measures.length - 1); inputDigit('5'); } },
    del: () => { sel.mi = Math.min(2, song.measures.length - 1); sel.ci = 0; clampSel(); deleteNote(); },
    dur: () => { sel.mi = Math.min(1, song.measures.length - 1); sel.ci = 0; clampSel(); setDur(8); },
    lyr: () => { if (!song.voxVoices.length) return; mutate(() => { const c = song.measures[0].voxes[0][0]; c.lyrics = ['送']; const c2 = (song.measures[Math.min(1, song.measures.length - 1)].voxes[0] || [])[0]; if (c2) c2.lyrics = ['别', '离']; }); },
    chord: () => { mutate(() => { const m = song.measures[Math.min(1, song.measures.length - 1)]; const c = ((m.tabs || [])[0] || [])[0] || ((m.voxes || [])[0] || [])[0]; if (c) c.chord = 'Em7'; }); },
    nota: () => { if (!vox0()) return; setVoxNotation(isStaffNota((song.voxNotations || [])[0]) ? 'jianpu' : 'staff'); },
    trans: () => { mutate(() => { transposeSong(song, 2); }); },
    /* 换谱类：优先就地换（direct）→ 空谱重建（rebuild）→ 另建一份（copy，新窗口） */
    kind: () => { const from = NWB.stackOf(song), i = KINDS.indexOf(from);
      for (const md of ['direct', 'rebuild', 'copy']) for (let j = 1; j <= KINDS.length; j++) { const to = KINDS[(i + j + KINDS.length) % KINDS.length]; if (lbPlan(song, to).mode === md) { lbSwitch(to); return from + '→' + to + ':' + md; } }
      return from + ':none'; },
    paper: () => { layApply({ page: 'A5' }); },
    paper2: () => { layApply({ page: 'A4' }); },
    zoom: () => { setViewZoom(1.25); render(); layApply({ scale: 1.1 }); },
    zoom2: () => { setViewZoom(1); layApply({ scale: 1 }); },
    win: () => { const i0 = curDocI, s2 = __fill(NWB.build('JT', { title: '另一窗口', nMea: 3 })); addDoc(s2); render(); switchDocTo(i0); return i0 + '/' + docs.length; },
    undo: () => { undo(); undo(); redo(); },
    theme: () => { document.documentElement.dataset.theme = 'dark'; render(); delete document.documentElement.dataset.theme; render(); },
    nowrap: () => { setNoWrap(true); setNoWrap(false); },
  };
  window.__op = name => { try { const r = __OPS[name](); return r == null ? '' : String(r); } catch (e) { return 'ERR ' + e.message; } };
  /* v68.4 收尾 PERF-3：预览页 svg 的内容＝PV.cks 的一个按序子序列（首段「页底＋页头」与末两段「播放头 / 热区」必在；关缓存 / 没分段时＝整份 PV.content） */
  window.__pvSub = svg => { const h = svg.innerHTML, C = PV.cks;
    if (!C || window.__noRenderCache) { const t = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); t.innerHTML = PV.content; return { ok: h === t.innerHTML, kept: -1 }; }
    let pos = 0, kept = 0;
    for (let i = 0; i < C.length; i++) { const c = C[i]; if (!c) continue;
      if (h.startsWith(c, pos)) { pos += c.length; kept++; } else if (i === 0 || i >= C.length - 2) return { ok: false, kept, at: i }; }
    return { ok: pos === h.length, kept, of: C.filter(Boolean).length }; };
  /* 几何等价：把整份 PV.content 填进一张与本页同位置、同属性的临时 svg（同一 .pv-paper 里、同一套样式），逐个顶层元素量屏幕矩形——
     与本页可见区（svg 视口 ∩ .pv-paper）相交（外扩 1px）的元素，其序列化必须在本页的顶层元素里（按多重集计）；本页没有的元素整个落在可见区之外（本来就被裁掉） */
  window.__pvGeo = svg => { const paper = svg.parentNode, t = svg.cloneNode(false); t.removeAttribute('data-flw-v'); t.removeAttribute('data-flw-old');
    t.style.position = 'absolute'; t.style.left = '0'; t.style.top = '0'; t.style.pointerEvents = 'none';
    paper.insertBefore(t, svg); t.innerHTML = PV.content;
    const sr = svg.getBoundingClientRect(), pr = paper.getBoundingClientRect(), tr = t.getBoundingClientRect();
    const dx = sr.left - tr.left, dy = sr.top - tr.top;
    const V = { l: Math.max(sr.left, pr.left) - 1, t: Math.max(sr.top, pr.top) - 1, r: Math.min(sr.right, pr.right) + 1, b: Math.min(sr.bottom, pr.bottom) + 1 };
    const have = new Map(); for (const c of svg.children) { const k = c.outerHTML; have.set(k, (have.get(k) || 0) + 1); }
    let vis = 0, miss = 0, first = null;
    for (const c of t.children) { const q = c.getBoundingClientRect(); if (!(q.width > 0 || q.height > 0)) continue;
      const l = q.left + dx, r = q.right + dx, tp = q.top + dy, bt = q.bottom + dy;
      if (r < V.l || l > V.r || bt < V.t || tp > V.b) continue;
      vis++; const k = c.outerHTML, n = have.get(k) || 0; if (n > 0) have.set(k, n - 1); else { miss++; if (!first) first = k.slice(0, 160); } }
    t.remove(); return { vis, miss, first, kids: svg.children.length }; };
  window.__rec = () => { const sc = document.getElementById('score'); return { h: __h(sc.innerHTML), inc: window.__noRenderCache ? 'off' : __incCheck(), vb: sc.getAttribute('viewBox') + ' ' + sc.getAttribute('width') + 'x' + sc.getAttribute('height') }; };
};

const SEQ = ['write', 'del', 'dur', 'lyr', 'chord', 'nota', 'trans', '#vp1280', 'paper', '#vp1440', 'paper2', 'zoom', 'zoom2', 'win', 'undo', 'theme', 'nowrap', 'kind', 'undo'];
async function openPage(b, nocache, shell) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const pg = await ctx.newPage();
  await pg.addInitScript(PAGE_HELPERS);
  if (nocache) await pg.addInitScript(() => { window.__noRenderCache = true; });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  pg.on('dialog', d => d.dismiss().catch(() => {}));
  const u = (nocache && REF) ? REF : URL0;
  await pg.goto(shell === 'classic' ? withQ(u, 'shell=classic') : u); await pg.waitForTimeout(1300);
  return { ctx, pg, errs };
}
async function runSeq(pg, spec, seq) {
  const out = [];
  const info = await pg.evaluate(s => __case(s), spec);
  out.push(Object.assign({ step: 'load', r: '' }, await pg.evaluate(() => __rec())));
  for (const op of seq) {
    let r = '';
    if (op === '#vp1280') { await pg.setViewportSize({ width: 1280, height: 900 }); await pg.waitForTimeout(350); }
    else if (op === '#vp1440') { await pg.setViewportSize({ width: 1440, height: 900 }); await pg.waitForTimeout(350); }
    else { r = await pg.evaluate(o => __op(o), op); await pg.waitForTimeout(20); }
    out.push(Object.assign({ step: op, r }, await pg.evaluate(() => __rec())));
  }
  return { info, out };
}
async function seqBoth(b, specs, seq, shell) {
  const A = await openPage(b, false, shell), B = await openPage(b, true, shell);
  const res = [];
  for (const sp of specs) {
    const a = await runSeq(A.pg, sp, seq), r = await runSeq(B.pg, sp, seq);
    res.push({ sp, a, r });
  }
  await A.ctx.close(); await B.ctx.close();
  return { res, errs: A.errs.concat(B.errs) };
}
function judge(tag, { res, errs }, needInc) {
  for (const { sp, a, r } of res) {
    const name = sp.p != null ? '预设#' + sp.p : sp.k ? '谱行 ' + sp.k : sp.custom ? '特例 ' + sp.custom : sp.long + '·' + sp.n;
    let bad = null, incBad = null, nInc = 0;
    a.out.forEach((x, i) => { const y = r.out[i];
      if (!bad && (x.h !== y.h || x.r !== y.r || x.vb !== y.vb)) bad = x.step + '（开 ' + x.h + ' / 关 ' + y.h + (x.r !== y.r ? '，返回 ' + x.r + ' / ' + y.r : '') + (x.vb !== y.vb ? '，' + x.vb + ' / ' + y.vb : '') + '）';
      if (x.inc === 'ok') nInc++; else if (!incBad && x.inc !== 'ok') incBad = x.step + ':' + x.inc; });
    T(!bad && (!needInc || !incBad), tag + ' ' + name + '（' + a.info.n + ' 小节）' + a.out.length + ' 步逐字节同关缓存' + (needInc ? '、每步增量拼接＝整份解析' : ''),
      bad ? '首个不同：' + bad : incBad ? '增量检查 ' + incBad : '增量 ' + nInc + '/' + a.out.length + ' 步 · ' + a.out.map(x => x.step + (x.r && !/^ERR/.test(x.r) ? '(' + x.r + ')' : x.r ? '(!)' : '')).join(' '));
  }
  T(!errs.length, tag + ' 无页面异常', errs.slice(0, 3).join(' | '));
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  try {
    /* ---------- P0 分段前提（svgIncSafe）：只有「起于 <、止于 >、标签自平衡、无注释 / CDATA、无 foreign content 跳出标签」的段才走增量 ---------- */
    if (want('P0')) {
      const P = await openPage(b, false);
      const r = await P.pg.evaluate(() => {
        const C = [
          ['', true], ['<g><rect x="1"/><text>1&lt;2</text></g>', true], ['<rect/><path d="M0 0"/>', true], ['<g class="a"><g><line/></g></g><circle r="2"/>', true],
          ['<g>', false], ['</g><g>', false], ['<g></g></g>', false], [' <g/>', false], ['<g/> ', false], ['<g/>x', false],
          ['<!-- c --><g/>', false], ['<g><![CDATA[x]]></g>', false], ['<g>< 1</g>', false],
          ['<g><b>x</b></g>', false], ['<text><span>x</span></text>', false], ['<g><br/></g>', false], ['<g></p></g>', false], ['<text><FONT color="red">x</FONT></text>', false],
          ['<symbol id="s"/><stop/><use href="#s"/><tspan>t</tspan><title>t</title><image/>', true]];
        return C.map(([s, want]) => ({ s, want, got: svgIncSafe(s) }));
      });
      const bad = r.filter(x => x.got !== x.want);
      T(!bad.length, 'P0 svgIncSafe 判定 ' + r.length + ' 例（自平衡 / 首尾非标签 / 注释 CDATA 裸 < / foreign content 跳出标签 b span br p font 一律不走增量；SVG 的 symbol stop use tspan title image 照走）',
        bad.map(x => JSON.stringify(x)).join(' | '));
      /* 段里混进跳出标签：整份赋值（raw），结果仍与整份解析逐字节相同 */
      const r2 = await P.pg.evaluate(() => { const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const strs = ['<g id="a"><rect/></g>', '<text>1<b>2</b></text>', '<g id="c"><line/></g>']; const m = svgIncSet(sv, strs);
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); t.innerHTML = strs.join('');
        return { m, same: sv.innerHTML === t.innerHTML, inc: !!sv.__pqInc }; });
      T(r2.m === 'raw' && r2.same && !r2.inc, 'P0 含跳出标签的段：svgIncSet 退回整份赋值、不留分段状态、与整份解析相同', JSON.stringify(r2));
      await P.ctx.close();
    }
    /* ---------- P1 ---------- */
    if (want('P1')) {
      const n = 16, KINDS = ['J', 'S', 'SJ', 'T', 'JT', 'ST', 'G', 'CG', 'JG', 'SG', 'SJG', 'CJ', 'CS', 'C'];
      const specs = Array.from({ length: n }, (_, i) => ({ p: i })).concat(KINDS.map(k => ({ k })));
      judge('P1', await seqBoth(b, specs, SEQ), true);
    }
    /* ---------- P2 ---------- */
    if (want('P2')) {
      judge('P2', await seqBoth(b, [{ long: '小星星（分解弹唱）', n: 200 }, { long: '两只老虎', n: 200 }, { long: '欢乐颂（钢琴独奏）', n: 120 }, { custom: 'tie2' }, { custom: 'duallow' }],
        ['write', 'del', 'dur', 'chord', 'trans', 'paper', 'paper2', 'undo', 'theme']), true);
    }
    /* ---------- P3 外来改动 ---------- */
    if (want('P3')) {
      const FOREIGN = [
        ['播放头属性', () => { const p = document.getElementById('playhead'); p.setAttribute('opacity', '0.12'); p.setAttribute('width', '33'); }],
        ['深处属性', () => { const t = document.querySelectorAll('#score text'); const e = t[Math.floor(t.length / 2)]; e.setAttribute('fill', 'red'); }],
        ['插节点', () => { const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); r.setAttribute('id', 'zz'); document.getElementById('score').appendChild(r); }],
        ['整份赋值', () => { document.getElementById('score').innerHTML = ''; }],
        ['删顶层节点', () => { const sc = document.getElementById('score'); sc.removeChild(sc.children[Math.floor(sc.children.length / 3)]); }],
        ['改文本', () => { const t = [...document.querySelectorAll('#score text')].find(x => x.firstChild && x.firstChild.nodeType === 3); if (t) t.firstChild.data = 'X'; }],
      ];
      const go = async nocache => { const P = await openPage(b, nocache); const hs = [];
        await P.pg.evaluate(() => __case({ p: 0 }));
        for (const [nm, f] of FOREIGN) {
          await P.pg.evaluate(`(${f.toString()})()`);
          hs.push(await P.pg.evaluate(() => { render(); return __rec(); }));                         /* 谱没变也重渲染：外来改动要被抹掉 */
          hs.push(await P.pg.evaluate(() => { __op('write'); return __rec(); }));
        }
        await P.ctx.close(); return { hs, errs: P.errs }; };
      const A = await go(false), B = await go(true);
      FOREIGN.forEach(([nm], i) => { const a1 = A.hs[i * 2], b1 = B.hs[i * 2], a2 = A.hs[i * 2 + 1], b2 = B.hs[i * 2 + 1];
        T(a1.h === b1.h && a2.h === b2.h && a1.inc === 'ok' && a2.inc === 'ok', 'P3 外来改动「' + nm + '」后重渲染 / 再写一笔与关缓存逐字节相同', a1.h + ' / ' + b1.h + ' · ' + a2.h + ' / ' + b2.h + ' · ' + a1.inc + ',' + a2.inc); });
      T(!A.errs.length && !B.errs.length, 'P3 无页面异常', A.errs.concat(B.errs).slice(0, 2).join(' | '));
    }
    /* ---------- P4 排版 / 输出模式 ---------- */
    if (want('P4')) {
      const STEPS = ['enter', 'brk', 'join', 'A5', 'scale', 'undo', 'quiet', 'output', 'write'];
      const go = async (nocache, spec) => { const P = await openPage(b, nocache); const pg = P.pg; const hs = []; let finMid = null;
        await pg.evaluate(s => { __case(s); sel.mi = Math.floor(song.measures.length / 2); sel.ci = 0; clampSel(); render(); }, spec);
        const rec = () => pg.evaluate(() => { const sv = [...document.querySelectorAll('#pv-pages .pv-paper > svg')];
          const t = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); t.innerHTML = PV.content; const ref = t.innerHTML;
          const ps = document.getElementById('pv-stage'), sr = ps && ps.getBoundingClientRect();
          const vis = sv.filter(x => { const q = x.getBoundingClientRect(); return sr && q.bottom > sr.top && q.top < sr.bottom; });
          return { mode: FLOW.mode.cur, pv: __h(PV.content), n: sv.length, wh: sv.map(x => x.getAttribute('width') + 'x' + x.getAttribute('height') + ' ' + x.getAttribute('viewBox')).join('|'),
            visOk: vis.length > 0 && vis.every(x => __pvSub(x).ok), sc: __h(document.getElementById('score').innerHTML), ref }; });
        for (const st of STEPS) {
          if (st === 'enter') await pg.evaluate(() => setMode('engrave'));
          else if (st === 'brk') await pg.click('#flw-eng-brk');
          else if (st === 'join') await pg.click('#flw-eng-join');
          else if (st === 'A5') await pg.click('#flw-eng [data-fa="lay:page"][data-v="A5"]');
          else if (st === 'scale') await pg.click('#flw-eng [data-fa="lay:scale"][data-d="1"]');
          else if (st === 'undo') await pg.evaluate(() => undo());
          else if (st === 'quiet') { await pg.evaluate(() => { PV.fit = null; PV.zoom = 0.8; mutate(() => { song.title = (song.title || '') + '·'; }); }); }   /* 预览尺寸悄悄变了（还没重建页壳）就来一笔只改内容、不改分页几何的编辑（改曲名）：页壳签名对不上要整份重建 */
          else if (st === 'output') await pg.evaluate(() => setMode('output'));
          else if (st === 'write') await pg.evaluate(() => setMode('write'));
          await pg.waitForTimeout(700);
          const r = await rec();
          let all = null;
          if (st !== 'write') {   /* 逐页滚到：每页 svg 都＝整份解析 PV.content（可视区外先留着上一笔、滚到附近才换的页此时也已换好） */
            const n = r.n; all = true;
            for (let k = 0; k < n; k++) { await pg.evaluate(k => document.querySelectorAll('#pv-pages .pv-page')[k].scrollIntoView(), k); await pg.waitForTimeout(220);
              const ok = await pg.evaluate(k => __pvSub(document.querySelectorAll('#pv-pages .pv-paper > svg')[k]).ok, k); if (!ok) all = false; }
            await pg.evaluate(() => { const ps = document.getElementById('pv-stage'); if (ps) ps.scrollTop = 0; }); await pg.waitForTimeout(150);
          }
          delete r.ref; hs.push(Object.assign(r, { st, all }));
          /* 快照走分段：在输出模式里查（收尾 PERF-4 / PERF-6 起回书写就放掉 PV.src / SNAP_SVG / 预览页，见 P8） */
          if (st === 'output') finMid = await pg.evaluate(() => ({ cks: !!PV.cks, src: !!PV.src, snap: typeof SNAP_SVG !== 'undefined' && !!SNAP_SVG }));
        }
        const fin = finMid || {};
        /* B5(a)：排版模式下重建页壳（pvBuild）不冲掉 #pv-pages 的点选光标类 flw-pick（此前先摘后由 drawSel 再挂，两次全页继承样式重算） */
        await pg.evaluate(() => setMode('engrave')); await pg.waitForTimeout(700);
        fin.pick = await pg.evaluate(() => { const w = document.getElementById('pv-pages'), a = w.classList.contains('flw-pick'); pvBuild(); return a && w.classList.contains('flw-pick'); });
        await pg.evaluate(() => setMode('write')); await pg.waitForTimeout(300);
        await P.ctx.close(); return { hs, errs: P.errs, fin }; };
      for (const spec of [{ long: '小星星（分解弹唱）', n: 64 }, { long: '欢乐颂（钢琴独奏）', n: 64 }, { p: 3 }]) {
        const A = await go(false, spec), B = await go(true, spec), nm = spec.long ? spec.long + '·' + spec.n : '预设#' + spec.p;
        A.hs.forEach((x, i) => { const y = B.hs[i];
          /* 回书写那一步：预览页已收起（收尾 PERF-4 起放掉页壳，v68.3 留着）——跨版本对拍（REF_URL）时页数 / 页壳不比，只比 PV.content 与 #score */
          const ok = x.mode === y.mode && x.pv === y.pv && (x.st === 'write' ? x.sc === y.sc && ((x.n === y.n && x.wh === y.wh) || (!!REF && x.n === 0)) : (x.n === y.n && x.wh === y.wh && x.visOk && x.all));
          T(ok, 'P4 ' + nm + ' ' + x.st + '：PV.content 与关缓存逐字节相同' + (x.st === 'write' ? '、回书写 #score 同关缓存' : '、可视页＝PV.cks 按页取舍的按序子序列（关缓存＝整份）、逐页滚到每页都是'),
            JSON.stringify({ mode: x.mode, pv: x.pv === y.pv, n: x.n + '/' + y.n, shell: x.wh === y.wh, vis: x.visOk, all: x.all, sc: x.st === 'write' ? x.sc === y.sc : '-' })); });
        T(A.fin.cks && A.fin.src && A.fin.snap, 'P4 ' + nm + ' 缓存开时快照走分段（PV.cks / PV.src / SNAP_SVG 在）', JSON.stringify(A.fin));
        T(A.fin.pick, 'P4 ' + nm + ' 排版模式 pvBuild 重建页壳后 #pv-pages 仍带 flw-pick（不先摘再挂）', JSON.stringify(A.fin));
        T(!A.errs.length && !B.errs.length, 'P4 ' + nm + ' 无页面异常', A.errs.concat(B.errs).slice(0, 2).join(' | '));
      }
    }
    /* ---------- P5 旧外壳 ---------- */
    if (want('P5')) {
      judge('P5 旧外壳', await seqBoth(b, [{ p: 0 }, { p: 2 }, { p: 8 }, { k: 'SJG' }], SEQ, 'classic'), true);
      const pvc = async nocache => { const P = await openPage(b, nocache, 'classic'); const r = await P.pg.evaluate(() => { __case({ long: '小星星（分解弹唱）', n: 40 }); pvOpen(); const h = __h(PV.content); pvClose(); __op('write'); pvOpen(); const h2 = __h(PV.content); pvClose(); return [h, h2, __rec().h]; }); await P.ctx.close(); return r; };
      const a = await pvc(false), r = await pvc(true);
      T(a.join() === r.join(), 'P5 旧外壳打印预览 pvOpen：PV.content（两次）与之后的 #score 与关缓存逐字节相同', a.join(' ') + ' / ' + r.join(' '));
    }
    /* ---------- P7「我的曲谱」只读快照（libLoadRO）：落盘写进本机的内容不变；别处改了库（别的标签页 / 直接写本机）立刻认；写不进去不留脏快照 ---------- */
    if (want('P7')) {
      for (const shell of ['flow', 'classic']) {
        const P = await openPage(b, false, shell);
        const r = await P.pg.evaluate(() => {
          const LS = () => localStorage.getItem(LS_LIB), roOk = () => JSON.stringify(libLoadRO()) === LS();
          const ent = () => (JSON.parse(LS()) || []).find(e => e.id === song.id);
          const saved = () => { if (flowOn()) { const b = document.getElementById('flw-save'); return !!b && /已存入/.test(b.textContent); }
            const t = document.querySelector('#doc-tabs .dtab.on'); return !!t && !t.querySelector('.dt-dot'); };
          const o = {};
          __case({ p: 0 }); localStorage.removeItem(LS_LIB); renderDocTabs();
          saveToLibrary(); o.s1 = saved() && roOk();
          /* ① 写一笔 → 落盘：库里这一条＝当前谱，快照＝本机 */
          __op('write'); persistNow(); renderDocTabs();
          o.w1 = JSON.stringify(ent().data) === JSON.stringify(song) && roOk() && saved();
          /* ② 别处把这一条删了（直接写本机）：页签 / 保存胶囊立刻认「未入库」 */
          localStorage.setItem(LS_LIB, JSON.stringify((JSON.parse(LS()) || []).filter(e => e.id !== song.id)));
          renderDocTabs(); o.ext = !saved() && roOk();
          /* ③ 再存入；本机写不进（配额满）时落盘：本机仍是上一版，快照不能是就地改过的那份 */
          saveToLibrary(); const before = LS();
          __op('del'); const SI = Storage.prototype.setItem;
          Storage.prototype.setItem = function (k, v) { if (k === LS_LIB) throw new Error('QuotaExceededError'); return SI.call(this, k, v); };
          try { persistNow(); } finally { Storage.prototype.setItem = SI; }
          o.quota = LS() === before && roOk() && JSON.stringify(ent().data) !== JSON.stringify(song);
          /* ④ libSave（整库替换）之后快照跟上 */
          const L = libLoad(); L[0].title = '改名X'; libSave(L); o.save = libLoadRO()[0].title === '改名X' && roOk();
          /* ⑤ 恢复写入后再落盘：本机＝当前谱 */
          persistNow(); o.w2 = JSON.stringify(ent().data) === JSON.stringify(song) && roOk();
          return o; });
        T(Object.values(r).every(Boolean), 'P7 ' + shell + '「我的曲谱」只读快照：存入 / 落盘内容＝当前谱、外部改库立刻认、写不进不留脏快照、libSave 后跟上', JSON.stringify(r));
        T(!P.errs.length, 'P7 ' + shell + ' 无页面异常', P.errs.slice(0, 2).join(' | '));
        await P.ctx.close();
      }
    }
    /* ---------- P8 v68.4 收尾：预览页只放与本页相交的谱行段（PERF-3 / PERF-7）+ 离开模式放掉预览页与快照（PERF-4 / PERF-6）+ 跳页不露旧谱面（C2 / UX-3）
       + 离开 flow 第一帧不露旧谱面（UX-1）+ 排版模式下的成品出口（C5） ---------- */
    if (want('P8')) {
      const P = await openPage(b, false); const pg = P.pg;
      const pages = async (tag, multi) => {
        const n = await pg.evaluate(() => document.querySelectorAll('#pv-pages .pv-page').length); const rows = [];
        for (let k = 0; k < n; k++) {
          await pg.evaluate(k => document.querySelectorAll('#pv-pages .pv-page')[k].scrollIntoView(), k); await pg.waitForTimeout(260);
          rows.push(await pg.evaluate(k => { const sv = document.querySelectorAll('#pv-pages .pv-paper > svg')[k]; return Object.assign({ k }, __pvSub(sv), __pvGeo(sv)); }, k));
        }
        await pg.evaluate(() => { const ps = document.getElementById('pv-stage'); if (ps) { ps.scrollTop = 0; ps.scrollLeft = 0; } });
        const bad = rows.filter(r => !r.ok || r.miss || !r.vis);
        T(n > 0 && !bad.length && (!multi || rows.every(r => r.kept > 0 && r.kept < r.of)),
          'P8 ' + tag + '：' + n + ' 页逐页——页内容＝PV.cks 的按序子序列' + (multi ? '（每页都比整份少）' : '') + '，整份谱面里落在本页可见区的顶层元素一个不缺（几何等价）',
          JSON.stringify(bad.length ? bad.slice(0, 2) : rows.map(r => r.kept + '/' + r.of + ':' + r.vis)));
      };
      for (const [spec, multi] of [[{ long: '两只老虎', n: 120 }, true], [{ long: '小星星（分解弹唱）', n: 150 }, true], [{ long: '欢乐颂（钢琴独奏）', n: 120 }, true], [{ long: '送别', n: 120 }, true],
        [{ custom: 'duallow' }, true], [{ p: 11 }, false], [{ k: 'SJG' }, false]]) {
        const nm = spec.p != null ? '预设#' + spec.p : spec.k ? '谱行 ' + spec.k : spec.custom ? '特例 ' + spec.custom : spec.long + '·' + spec.n;
        await pg.evaluate(s => { __case(s); sel.mi = Math.floor(song.measures.length / 2); clampSel(); render(); }, spec);
        await pg.evaluate(() => setMode('engrave')); await pg.waitForTimeout(800);
        await pages(nm + ' 排版', multi);
        if (multi && spec.long === '两只老虎') {
          await pg.click('#flw-eng-brk'); await pg.waitForTimeout(700); await pages(nm + ' 排版 · 此处换行之后', multi);
          await pg.evaluate(() => setMode('output')); await pg.waitForTimeout(800);
          for (const v of ['h', 'p', 'w']) { await pg.evaluate(v => FLOW.out.act('out:arr', { dataset: { v } }, null), v); await pg.waitForTimeout(600); await pages(nm + ' 输出 · 排布 ' + v, multi); }
        }
        await pg.evaluate(() => setMode('write')); await pg.waitForTimeout(300);
      }
      /* PERF-4 / PERF-6：回书写后预览页与离文档快照都放掉；再进排版照常重建 */
      { await pg.evaluate(() => { __case({ long: '两只老虎', n: 120 }); }); await pg.evaluate(() => setMode('engrave')); await pg.waitForTimeout(800);
        const a = await pg.evaluate(() => ({ pages: document.querySelectorAll('#pv-pages .pv-page').length, snap: !!SNAP_SVG, nodes: document.querySelectorAll('#pv-pages *').length }));
        await pg.evaluate(() => setMode('write')); await pg.waitForTimeout(300);
        const z = await pg.evaluate(() => ({ pages: document.querySelectorAll('#pv-pages .pv-page').length, snap: !!SNAP_SVG, nodes: document.querySelectorAll('#pv-pages *').length, srcNull: PV.src == null && PV.cks == null }));
        await pg.evaluate(() => setMode('engrave')); await pg.waitForTimeout(800);
        const c = await pg.evaluate(() => ({ pages: document.querySelectorAll('#pv-pages .pv-page').length, snap: !!SNAP_SVG, vis: (() => { const sv = document.querySelector('#pv-pages .pv-paper > svg'); return sv ? __pvSub(sv).ok && !__pvGeo(sv).miss : false; })() }));
        await pg.evaluate(() => setMode('write')); await pg.waitForTimeout(300);
        T(a.pages > 1 && a.snap && z.pages === 0 && z.nodes === 0 && !z.snap && z.srcNull && c.pages === a.pages && c.snap && c.vis,
          'P8 PERF-4 / PERF-6：回书写后 #pv-pages 清空、离文档快照 svg 放掉（PV.src / PV.cks 置空）；再进排版照常重建且页内容正确', JSON.stringify({ a, z, c })); }
      /* C2 / UX-3：页壳复用（applySnap → fill）时可视区外留着上一笔的页先藏起（data-flw-old → visibility:hidden），换成新谱面才露出；一下跳到尾页，绘制前那一刻尾页要么已是新谱面、要么不可见 */
      { await pg.evaluate(() => { __case({ long: '两只老虎', n: 96 }); sel.mi = 95; clampSel(); render(); }); await pg.evaluate(() => setMode('engrave')); await pg.waitForTimeout(800);
        const n = await pg.evaluate(() => document.querySelectorAll('#pv-pages .pv-page').length);
        for (let k = 0; k < n; k++) { await pg.evaluate(k => document.querySelectorAll('#pv-pages .pv-page')[k].scrollIntoView(), k); await pg.waitForTimeout(200); }
        await pg.evaluate(() => { const ps = document.getElementById('pv-stage'); ps.scrollTop = 0; }); await pg.waitForTimeout(300);
        const r = await pg.evaluate(() => new Promise(res => {
          const svs = () => [...document.querySelectorAll('#pv-pages .pv-paper > svg')], last = () => svs()[svs().length - 1];
          const n0 = svs().length, h0 = last().innerHTML;
          mutate(() => { const m = song.measures[95]; const c = (m.tabs[0] || []).find(c => c.notes && c.notes.length); if (c) c.notes[0].f = c.notes[0].f === 5 ? 7 : 5; });
          setTimeout(() => {   /* applySnap 在下一个任务里（PT） */
            const L = last(), same = svs().length === n0, oldHidden = L.dataset.flwOld != null && getComputedStyle(L).visibility === 'hidden', stillOld = L.innerHTML === h0;
            const ps = document.getElementById('pv-stage'); ps.scrollTop = ps.scrollHeight;
            requestAnimationFrame(() => { const L2 = last(); const shown = getComputedStyle(L2).visibility !== 'hidden', isOld = L2.innerHTML === h0;
              setTimeout(() => setTimeout(() => res({ n0, same, oldHidden, stillOld, raf: { shown, isOld }, fin: { old: last().innerHTML === h0, flag: last().dataset.flwOld != null, sub: __pvSub(last()).ok } }), 60), 60); });
          }, 30); }));
        await pg.evaluate(() => setMode('write')); await pg.waitForTimeout(300);
        T(r.same && r.stillOld && r.oldHidden && !(r.raf.shown && r.raf.isOld) && !r.fin.old && !r.fin.flag && r.fin.sub,
          'P8 C2 / UX-3：页壳复用时可视区外的旧页先藏起，跳过去的第一帧不露旧谱面（藏着或已换新），换好后摘掉标记、内容正确', JSON.stringify(r)); }
      /* UX-1：排版 / 输出里改过谱或换过窗口，进谱架（离开 flow）——下一帧绘制前 #score 已是当前谱的正常排版（不露进模式之前那一版 / 另一首谱） */
      for (const how of ['undo', 'win']) {
        const r = await pg.evaluate(how => new Promise(res => {
          __case({ long: '两只老虎', n: 64 }); sel.mi = 10; clampSel(); render(); inputDigit('5');
          if (how === 'win') { addDoc(__fill(NWB.build('JT', { title: '另一窗', nMea: 4 }))); render(); switchDocTo(0); }
          setMode('output');
          setTimeout(() => {
            if (how === 'undo') undo(); else switchDocTo(docs.length - 1);
            setTimeout(() => {
              enterStand();
              requestAnimationFrame(() => { const h = document.getElementById('score').innerHTML;
                window.__noRenderCache = true; render(); const ref = document.getElementById('score').innerHTML; window.__noRenderCache = false; render();
                exitStand(); setMode('write'); res({ same: h === ref, len: [h.length, ref.length] }); });
            }, 60);
          }, 400); }), how);
        T(r.same, 'P8 UX-1 ' + (how === 'undo' ? '输出模式里撤销' : '输出模式里换窗口') + '后进谱架：第一帧绘制前 #score 已＝当前谱的正常排版（逐字节同关缓存整排）', JSON.stringify(r));
      }
      /* C5：排版模式下（#score 子节点停在书写版）的成品出口——分享卡 / 缩图 / 打印切片照样先正常排版，与关缓存逐字节相同 */
      { const go = async nocache => { const Q = await openPage(b, nocache); const r = await Q.pg.evaluate(() => { __case({ long: '小星星（分解弹唱）', n: 48 }); sel.mi = 20; clampSel(); render(); setMode('engrave'); inputDigit('3');
            const out = {}; try { out.card = __h(buildShareCardSVG()); } catch (e) { out.card = 'ERR ' + e.message; }
            try { out.clone = __h(withCleanSnap(() => scoreExportClone().innerHTML, { paging: true, noRender: true })); } catch (e) { out.clone = 'ERR ' + e.message; }
            try { window.dispatchEvent(new Event('beforeprint')); out.print = __h((document.getElementById('print-pages') || {}).innerHTML || ''); window.dispatchEvent(new Event('afterprint')); } catch (e) { out.print = 'ERR ' + e.message; }
            setMode('write'); out.sc = __h(document.getElementById('score').innerHTML); return out; });
          await Q.ctx.close(); return r; };
        const a = await go(false), z = await go(true);
        T(JSON.stringify(a) === JSON.stringify(z) && !/ERR/.test(JSON.stringify(a)), 'P8 C5 排版模式下分享卡 / 成品克隆 / 打印切片 / 回书写谱面与关缓存逐字节相同', JSON.stringify({ a, z })); }
      T(!P.errs.length, 'P8 无页面异常', P.errs.slice(0, 3).join(' | '));
      await P.ctx.close();
    }
    /* ---------- P9 v68.4 收尾 PERF-2：变了的段按顶层元素复用（svgMorphCk）——移调这类每行都变、行内大多数元素逐字相同的笔留原节点；
       每一步 #score 与关缓存逐字节相同、逐段边界 / 段首记号正确（__incCheck）；移调后原节点确实留下一大半（覆盖到复用路径），
       __noMorph 时一个不留（对照）；整行平移（第 1 小节改宽、第 2 小节插小节）退回整段重解析、结果同样相同；
       复用之后再有外来改动（留下的节点深处改属性）照样标脏重建 ---------- */
    if (want('P9')) {
      const STEPS9 = ['trans+', 'foreign', 'trans-', 'r0', 'r0b', 'trans+', 'ins2', 'undo', 'nomorph', 'trans-'];
      for (const shell of [undefined, 'classic']) {
        const go = async nocache => { const P = await openPage(b, nocache, shell); const pg = P.pg; const rows = [];
          for (const spec of [{ long: '两只老虎', n: 200 }, { long: '小星星（分解弹唱）', n: 120 }, { long: '欢乐颂（钢琴独奏）', n: 64 }, { p: 3 }, { k: 'SJG' }]) {
            await pg.evaluate(s => __case(s), spec);
            for (const [si, step] of STEPS9.entries()) rows.push(await pg.evaluate(([si, step, nm]) => {
              const sc = document.getElementById('score'); [...sc.childNodes].forEach(n => { n.__t9 = 1; });
              if (step === 'trans+') mutate(() => transposeSong(song, 1));
              else if (step === 'trans-') mutate(() => transposeSong(song, -1));
              else if (step === 'foreign') {   /* 上一步复用留下的节点（中间那个顶层元素的最深处）改属性，再移调一次：所在段须标脏、整段重建 */
                const ks = [...sc.children].filter(n => n.__t9); let d = ks[Math.floor(ks.length / 2)]; while (d && d.lastElementChild) d = d.lastElementChild;
                if (d) d.setAttribute('data-zz', '1'); mutate(() => transposeSong(song, 1)); }
              else if (step === 'r0') mutate(() => { song.measures[0].wf = 1.6; });
              else if (step === 'r0b') mutate(() => { delete song.measures[0].wf; });
              else if (step === 'ins2') { sel = { mi: Math.min(1, song.measures.length - 1), row: song.tabVoices.length ? 'tab' : 'vox', vi: 0, ci: 0, si: 2 }; clampSel(); insMeasure(); }
              else if (step === 'undo') undo();
              else if (step === 'nomorph') { window.__noMorph = true; try { mutate(() => transposeSong(song, 1)); } finally { window.__noMorph = false; } }
              const kids = [...sc.childNodes];
              return Object.assign({ nm, si, step, kept: kids.filter(n => n.__t9).length, of: kids.length, zz: !!sc.querySelector('[data-zz]') }, __rec()); }, [si, step, spec.long || ('#' + (spec.p != null ? spec.p : spec.k))]));
          }
          await P.ctx.close(); return { rows, errs: P.errs }; };
        const A = await go(false), B = await go(true), sh = shell || 'flow';
        const bad = A.rows.map((x, i) => [x, B.rows[i]]).filter(([x, y]) => x.h !== y.h || x.vb !== y.vb || x.inc !== 'ok' || x.zz);
        T(!bad.length, 'P9 ' + sh + '：5 份谱 × ' + STEPS9.length + ' 步（移调 / 外来改动后移调 / 第 1 小节改宽 / 第 2 小节插小节 / 撤销 / __noMorph）#score 与关缓存逐字节相同、逐段边界与段首记号正确、外来改动被抹掉',
          bad.length ? JSON.stringify(bad[0]).slice(0, 600) : A.rows.filter(x => x.nm === '两只老虎').map(x => x.step + ' ' + x.kept + '/' + x.of).join(' · '));
        const longs = A.rows.filter(x => /两只老虎|小星星/.test(x.nm));
        /* 第一步 C→♯C（调号宽不变）：行内元素大多逐字相同。之后 ♯C↔D 调号宽变了、每行整体右移，几乎没有逐字相同的元素——复用退回整段重解析（正确性同上一条断言） */
        const tr = longs.filter(x => x.si === 0), nm = longs.filter(x => x.step === 'nomorph');
        T(tr.length === 2 && tr.every(x => x.kept > x.of * 0.5) && nm.length === 2 && nm.every(x => x.kept < x.of * 0.1),
          'P9 ' + sh + ' 覆盖：长谱移调（C→♯C）后原顶层节点留下过半（元素级复用生效），__noMorph 对照一成不到', JSON.stringify(longs.map(x => x.nm.slice(0, 2) + ':' + x.step + ' ' + x.kept + '/' + x.of)));
        T(!A.errs.length && !B.errs.length, 'P9 ' + sh + ' 无页面异常', A.errs.concat(B.errs).slice(0, 2).join(' | '));
      }
    }
    /* ---------- P6 性能 ---------- */
    if (want('P6') && process.env.PERF !== '0') {
      const strokes = async (pg, nocache, key, n) => {
        await pg.evaluate(nc => { window.__noRenderCache = nc; render(); }, nocache); await pg.waitForTimeout(400);
        const fr = [];
        for (let i = 0; i < n; i++) {
          await pg.evaluate(() => { window.__pf = null; const st = e => { window.removeEventListener('keydown', st, true); window.removeEventListener('click', st, true); const t0 = e.timeStamp;
            requestAnimationFrame(() => setTimeout(() => { window.__pf = performance.now() - t0; }, 0)); }; window.addEventListener('keydown', st, true); window.addEventListener('click', st, true); });
          if (key === 'eng') await pg.click(i % 2 ? '#flw-eng-join' : '#flw-eng-brk'); else await pg.keyboard.press(String(i % 5 + 1));
          await pg.waitForTimeout(key === 'eng' ? 1300 : 950);
          fr.push(await pg.evaluate(() => window.__pf));
        }
        return fr;
      };
      for (const [nm, pfx, n] of [['和弦谱 200 小节', '小星星（分解弹唱）', 200], ['双轨谱 200 小节', '两只老虎', 200]]) {
        const P = await openPage(b, false); const pg = P.pg;
        await pg.evaluate(([pfx, n]) => { __case({ long: pfx, n }); sel = { mi: Math.floor(n / 2), row: 'tab', vi: 0, ci: 0, si: 3 }; render(); try { document.activeElement.blur(); } catch (_) {} }, [pfx, n]);
        const on = [], off = [];
        for (let r = 0; r < 3; r++) { off.push(...(await strokes(pg, true, 'w', 4)).slice(1)); on.push(...(await strokes(pg, false, 'w', 4)).slice(1)); }
        const a = q(on), z = q(off);
        T(a.med <= z.med * 0.6, 'P6 ' + nm + '（书写，真实按键）每笔：缓存开 ≤ 关×0.6', '开 ' + a.med + 'ms [' + a.q1 + '–' + a.q3 + '] · 关 ' + z.med + 'ms [' + z.q1 + '–' + z.q3 + '] · 比 ' + (a.med / z.med).toFixed(2) + ' · n=' + on.length + '/' + off.length);
        await P.ctx.close();
      }
      { const P = await openPage(b, false); const pg = P.pg;
        await pg.evaluate(() => { __case({ long: '小星星（分解弹唱）', n: 150 }); sel = { mi: 75, row: 'tab', vi: 0, ci: 0, si: 3 }; render(); });
        await pg.evaluate(() => setMode('engrave')); await pg.waitForTimeout(1500);
        const on = [], off = [];
        for (let r = 0; r < 2; r++) { off.push(...(await strokes(pg, true, 'eng', 4)).slice(1)); on.push(...(await strokes(pg, false, 'eng', 4)).slice(1)); }
        const a = q(on), z = q(off);
        T(a.med <= z.med * 0.8, 'P6 排版模式 150 小节和弦谱「此处换行 / 并入上一行」点击到下一帧：缓存开 ≤ 关×0.8', '开 ' + a.med + 'ms [' + a.q1 + '–' + a.q3 + '] · 关 ' + z.med + 'ms [' + z.q1 + '–' + z.q3 + '] · 比 ' + (a.med / z.med).toFixed(2));
        await P.ctx.close(); }
    }
  } catch (e) { T(false, '套件异常', e.stack); }
  await b.close();
  console.log('PASS ' + pass + '/' + total);
  if (fails.length) console.log('FAILED:\n' + fails.join('\n'));
  process.exit(pass === total ? 0 : 1);
})();
