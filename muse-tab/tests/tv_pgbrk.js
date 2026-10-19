'use strict';
/* v68.5「此处换页」(measures[].pgbrk＝1) ＋「页码设置」(song.layout.pgno＝{on,pos,start,first}) 回归——引擎段（数据 / 断行 / 分页 / 页码 / 成品 / 缓存 / MusicXML）。
   file:// 直载，真实浏览器，几何断言优先（页数、每页首末小节、行 y0 / y1、页码坐标与字框、标记坐标），容差 ±0.5。
   夹具 L60：PRESETS[0]（小星星，15 小节）复制成 60 小节、layout.fixed——1440×900、A4：PAGE_W=870、PG_H=1230、页步 1256、MARGIN=56；
   基线 3 页，各页首小节 0 / 20 / 44，每行 4 小节。
   Z  缺省零差异（PB1 / PN1 / MX1）：16 预设 + L60 + 4 种谱行组合 × 两种外壳——#score、PV_GEO / SYS_GEO、成品快照（分页 withCleanSnap + scoreExportClone）、
      打印切片 #print-pages、MusicXML、song JSON 与基线页（env PGBRK_REF；缺省 git show 71c9cce＝v68.4）逐字节相同；
      本版内：无效 / 中性字段（第 1 小节换页、pgbrk 不是数字 1、pgno 关着或不是 true）与不带字段逐字节相同（JSON 除外）。
   G  分页几何：PB2 换页 @12 · PB3 行中换页 @14 · PB4 连续换页无空白页 · PB5 换页落在本来就翻页的行 · PB6 第 1 小节无效 · PB7 pull 并存 · PB8 brk 并存 ·
      PB9 纯和弦谱乐句从换页处重新数 · PB10 不换行长带（竖线标记、预览照样分页）· PB19 书写标记几何 · PB20 预览页数 · PB21 两种外壳一致。
   N  页码：PN2 底部居中 · PN3 底部外侧单双数 · PN4 顶部外侧（第 1 页压在题头之上、第 2 页起版心下移 51）· PN5 不与页头相交（含长曲名、390 手机编辑）·
      PN6 起始页码 · PN7 底部避让与净距 · PN8 关掉复原 · PN10 字号字体墨色 · PN13 规范化 · PN14 数据整洁 · PN15 离屏渲染。
   O  成品：PB11 窄屏观看长卷（打印时分页、印页码）· PB12 打印切片 · PB13 PDF 页数 · PB14 PNG · PB15 分享卡 · PB16 缩图 · PB18 标记只在书写谱面 ·
      PN9 预览 / 打印 / PNG 三处页码逐页一致。
   C  缓存（PB17）：缓存开 / window.__noRenderCache 两个全新页面跑同一编辑序列——书写 #score 逐步逐字节相同（缓存开另查增量拼接＝整份解析）；
      排版模式 PV.content 逐步相同、可视预览页＝PV.cks 按页取舍的按序子序列、逐页滚到每页都是。
   X  MusicXML / .mtab / 粘贴：MX2 每个 part 同一小节开头 <print new-page="yes"/> · MX3 往返 · MX4 第三方 / 无 software 不认 · IO1 .mtab 往返 · IO2 粘贴与插入。
   R  行级规则（两种外壳共用的 sysAct / sysBreakAt / sysRowLocked / sysPageBreak / pgnoSet）：拒绝路径与提示、恢复默认保留换页、锁行两端判定、一步撤销。
   K  旧版兼容（PB22，需基线页）：v68.4 打开带新字段的谱不报错、改纸张不丢 pgno。
   Q  收尾回归：PN16 顶部页码与页首行真实上冒 ≥2mm（ENG-1）· PN17 跨页行那一页不印页码（ENG-3）· PB23 互动谱快照摘换页标记（ENG-5）· PB24 预览卡不显示页码（REG-4）。
   收尾另改：PN2 / PN3 / PN8 印页码时屏幕页码照画（UX-7）；R7 每行 − 遇下一行换页拒绝（UX-3 / REG-2）；拿不到基线时 CI 判红（REG-1，基线 SHA 见 pgbrk_ref.json）。
   env：MUSETAB_URL 被测页（缺省 ../index.html）· PGBRK_REF 基线页（文件路径或 file:// URL）· ONLY=Z,G 只跑部分。
   修前红修后绿：MUSETAB_URL 指向基线 71c9cce 复跑，Z 段全绿、其余各段红（见交付报告）。 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
/* v68.5 收尾 REG-1：基线提交写在 tests/pgbrk_ref.json（完整 SHA，deploy.yml 浅克隆后按它单独 fetch 这一个提交）；
   CI 里拿不到基线＝判红（同 tv_shellflow S0 的口径——此前只打 ⚠️，CI 浅克隆 + 新 runner 没有缓存时零差异对拍静默跳过、部署闸拦不住缺省输出回归）。
   本地显式跳过：PGBRK_REF=none */
const REFJ = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'pgbrk_ref.json'), 'utf8')); } catch (_) { return {}; } })();
const REF_COMMIT = process.env.PGBRK_REF_COMMIT || REFJ.commit || '71c9cce8d9d95f44344e1d058cdd72ef3a5871b4';
const IN_CI = !!process.env.CI && process.env.PGBRK_REF !== 'none';
let REF = process.env.PGBRK_REF && process.env.PGBRK_REF !== 'none' ? toUrl(process.env.PGBRK_REF) : null;
if (!REF && process.env.PGBRK_REF !== 'none') {   /* 缺省：基线提交（v68.4）的 index.html 落到临时目录（按 SHA 命名，换基线不会读到旧缓存） */
  try { const t = path.join(os.tmpdir(), 'pgbrk_ref_' + REF_COMMIT.slice(0, 12) + '.html');
    if (!fs.existsSync(t) || fs.statSync(t).size < 1e5) fs.writeFileSync(t, execFileSync('git', ['-C', path.resolve(__dirname, '..', '..'), 'show', REF_COMMIT + ':muse-tab/index.html'], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }));
    REF = 'file://' + t; } catch (_) { REF = null; }
}
const NOREF = what => IN_CI ? T(false, what + ' CI 里拿不到对拍基线（git show ' + REF_COMMIT.slice(0, 12) + ' 失败）：判红', 'deploy.yml 的 test job 要先 git fetch --depth=1 origin <pgbrk_ref.json 的 commit>')
  : console.log('⚠️ ' + what + ' 跳过：没有基线页（git show ' + REF_COMMIT.slice(0, 12) + ' 失败；可设 env PGBRK_REF=基线 index.html，PGBRK_REF=none 为显式跳过）');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
let pass = 0, total = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name); console.log((ok ? '✅' : '❌') + ' ' + name + (d ? '：' + d : '')); };
const J = x => JSON.stringify(x);
const near = (a, b, t) => Math.abs(a - b) <= (t == null ? 0.5 : t);
const __rows = g => g.rows.map(r => r.pg + ':' + r.m1 + '-' + r.m2).join(' ');   /* 同页内 __rows（Node 侧用） */

/* ---------- 页内工具（addInitScript 注入）---------- */
const HELP = () => {
  window.__h = s => { s = String(s); let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16) + ':' + s.length; };
  window.__rep = (s, k) => { const base = JSON.parse(JSON.stringify(s.measures)); for (let i = 1; i < k; i++) s.measures.push(...JSON.parse(JSON.stringify(base))); return s; };
  window.__L60 = () => { const s = __rep(PRESETS[0].make(), 4); s.layout = { fixed: true }; return s; };
  window.__fill = s => { (s.measures || []).forEach((m, mi) => {
      (m.tabs || []).forEach((cols, vi) => { const c = cols && cols[0]; if (c) { c.notes = [{ s: 2 + ((mi + vi) % 4), f: (mi * 3 + vi) % 6 }]; if (mi % 3 === 0) c.chord = ['C', 'Am', 'F', 'G7'][mi % 4]; } });
      (m.voxes || []).forEach((cols, vi) => { (cols || []).forEach((c, ci) => { if (!c) return; c.deg = ((mi * 2 + ci + vi) % 7) + 1; if (vi === 0) c.lyrics = [['春', '风', '又', '绿', '江', '南', '岸'][(mi + ci) % 7]]; }); });
    }); return s; };
  /* 造谱：{p:预设号, rep:复制份数} · {l60:1} · {k:谱行组合}；mod＝中性字段（本版应与不带字段逐字节相同） */
  window.__mk = c => { let s;
    if (c.l60) s = __L60(); else if (c.k) s = __fill(NWB.build(c.k, { title: '谱行' + c.k, nMea: 6 })); else s = __rep(PRESETS[c.p].make(), c.rep || 1);
    if (c.mod === 'neutral') { const M = s.measures, n = M.length; M[0].pgbrk = 1; if (n > 2) M[Math.min(2, n - 1)].pgbrk = '1'; if (n > 3) M[3].pgbrk = true; if (n > 1) M[n - 1].pgbrk = 2;
      s.layout = Object.assign({}, s.layout || {}, { pgno: { on: false, pos: 'to', start: 5, first: true } }); }
    if (c.mod === 'neutral2') { s.layout = Object.assign({}, s.layout || {}, { pgno: { on: 'yes', pos: 'bo' } }); if (s.measures[1]) s.measures[1].pgbrk = 0; }
    return s; };
  window.__ld = s => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    if (typeof undoStack !== 'undefined') { undoStack.length = 0; redoStack.length = 0; }
    loadSong(s); sel = { mi: 0, row: (song.tabVoices || []).length ? 'tab' : 'vox', vi: 0, ci: 0, si: 1 }; clampSel(); blurSel = true; render(); return song.measures.length; };
  window.__toast = () => ((document.getElementById('toast') || {}).textContent || '');
  window.__sc = () => document.getElementById('score');
  /* 分页取样（成品口径）：页数、每行首末小节与所在页、行 y0 / y1、页码（文字 / 坐标 / 字框 / 属性）、屏幕页码与标记个数 */
  window.__geo = () => { let o = null; withCleanSnap(() => { const g = PV_GEO, step = g.pgH + g.gap, sv = __sc(); const rows = []; let last = null;
      song.measures.forEach((_, mi) => { const bb = meaBands[mi]; if (!bb) return; if (!last || last.y0 !== bb.y) { last = { y0: bb.y, y1: bb.y + bb.h, m1: mi, m2: mi, pg: Math.floor((bb.y + 0.5) / step) }; rows.push(last); } else last.m2 = mi; });
      const fol = [...sv.querySelectorAll('.pgfolio')].map(t => { const b = t.getBBox(); const y = +t.getAttribute('y');
        return { t: t.textContent, x: +t.getAttribute('x'), y, an: t.getAttribute('text-anchor'), fs: t.getAttribute('font-size'), ff: t.getAttribute('font-family'), fill: t.getAttribute('fill'),
          pg: Math.floor((y + 0.5) / step), bb: { x: +b.x.toFixed(2), y: +b.y.toFixed(2), x2: +(b.x + b.width).toFixed(2), y2: +(b.y + b.height).toFixed(2) } }; }).sort((a, b) => a.pg - b.pg);
      o = { n: g.n, W: g.W, pgH: g.pgH, gap: g.gap, step, rows, sys: SYS_GEO.map(x => [x.y0, x.y1]), fol, pageno: sv.querySelectorAll('.pageno').length, mk: sv.querySelectorAll('.pgbrk-mk').length,
        pnx: [...sv.querySelectorAll('.pageno')].map(t => [+t.getAttribute('y'), t.getAttribute('x') + ':' + t.getAttribute('text-anchor')]).sort((a, b) => a[0] - b[0]).map(x => x[1]),
        PAGE_W, MARGIN, MM: PAGE_W / PAGE_MM[layoutCfg().page][0], topMargin: Math.round(12 * PAGE_W / PAGE_MM[layoutCfg().page][0]) }; }, { paging: true }); return o; };
  window.__rows = g => g.rows.map(r => r.pg + ':' + r.m1 + '-' + r.m2).join(' ');
  /* 零差异记录：书写谱面 · 分页几何 · 成品快照 · MusicXML · JSON · 打印切片 */
  window.__rec = () => { const sc = __sc(), o = { score: __h(sc.innerHTML), vb: sc.getAttribute('viewBox'), geo: J(PV_GEO), sys: J(SYS_GEO) };
    o.snap = withCleanSnap(() => __h(scoreExportClone().innerHTML) + '|' + J(PV_GEO) + '|' + J(SYS_GEO), { paging: true });
    let x = ''; try { x = exportMusicXML(song) || ''; } catch (e) { x = 'ERR ' + e.message; } o.mxl = __h(x);
    o.json = __h(JSON.stringify(song));
    dispatchEvent(new Event('beforeprint')); const pp = document.getElementById('print-pages'); o.print = __h(pp ? pp.innerHTML : ''); dispatchEvent(new Event('afterprint'));
    o.after = __h(sc.innerHTML); return o; };
  function J(x) { return JSON.stringify(x); }
  /* 增量拼出的 DOM ＝ 同源字符串整份解析（同 tv_perf2 __incCheck 的整份口径） */
  window.__incCheck = () => { const sc = __sc(), st = sc.__pqInc; if (!st) return 'noinc';
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); t.innerHTML = st.cks.map(c => c.s).join('');
    return t.innerHTML === sc.innerHTML ? 'ok' : 'MISMATCH'; };
  /* 预览页 svg 的内容＝PV.cks 的按序子序列（首段「页底＋页头」与末两段必在；关缓存 / 没分段时＝整份 PV.content），同 tv_perf2 __pvSub */
  window.__pvSub = svg => { const h = svg.innerHTML, C = PV.cks;
    if (!C || window.__noRenderCache) { const t = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); t.innerHTML = PV.content; return { ok: h === t.innerHTML, kept: -1 }; }
    let pos = 0, kept = 0;
    for (let i = 0; i < C.length; i++) { const c = C[i]; if (!c) continue;
      if (h.startsWith(c, pos)) { pos += c.length; kept++; } else if (i === 0 || i >= C.length - 2) return { ok: false, kept, at: i }; }
    return { ok: pos === h.length, kept }; };
  /* 一张 svg 里落在第 k 页窗口内的页码（viewBox 开窗的预览页 / 打印切片 / PNG 都用） */
  window.__folIn = (root, y0, y1) => [...root.querySelectorAll('.pgfolio')].filter(t => { const y = +t.getAttribute('y'); return y >= y0 && y <= y1; })
    .map(t => t.textContent + '@' + t.getAttribute('x') + ',' + t.getAttribute('y') + ',' + t.getAttribute('text-anchor'));
  /* 捕获 svgResolveVars 的输出（PNG / 缩图的成品 SVG 串） */
  window.__cap = fn => { const o = svgResolveVars; const got = []; svgResolveVars = s => { const x = o(s); got.push(x); return x; }; try { fn(); } finally { svgResolveVars = o; } return got; };
};

async function open(b, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: o.vp || { width: 1440, height: 900 } });
  const pg = await ctx.newPage();
  await pg.addInitScript(HELP);
  if (o.nocache) await pg.addInitScript(() => { window.__noRenderCache = true; });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.dismiss().catch(() => {}));
  let u = o.url || URL0; if (o.shell === 'classic') u = withQ(u, 'shell=classic');
  await pg.goto(u); await pg.waitForTimeout(1200);
  await pg.evaluate(() => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} });
  return { ctx, pg, errs, close: () => ctx.close() };
}
const EV = (pg, fn, arg) => pg.evaluate(fn, arg).catch(e => ({ err: String(e.message || e).slice(0, 300) }));
const pdfPages = buf => buf ? (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length : -1;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const allErrs = [];
  try {
    /* ================= Z 缺省零差异 ================= */
    if (want('Z')) {
      const CASES = [...Array(16).keys()].map(i => ({ p: i })).concat([{ l60: 1 }, { k: 'SJ' }, { k: 'JT' }, { k: 'CG' }, { k: 'SJG' }]);
      const nm = c => c.l60 ? 'L60' : c.k ? '谱行' + c.k : '预设#' + c.p;
      for (const shell of ['flow', 'classic']) {
        const A = await open(b, { shell });
        /* 跨版本对拍放在最前：两页都是全新页面、按同一顺序载谱（旧外壳载过固定版宽谱后左栏会收起并保持，两边同序才同状态） */
        if (REF) {
          const R = await open(b, { shell, url: REF });
          const diff = []; let nOK = 0;
          for (const c of CASES) {
            const x = await EV(A.pg, c => { __ld(__mk(c)); const r = __rec(); r.pgno = document.querySelectorAll('#score .pgfolio').length; r.pno = document.querySelectorAll('#score .pageno').length; return r; }, c);
            const y = await EV(R.pg, c => { __ld(__mk(c)); const r = __rec(); r.pgno = document.querySelectorAll('#score .pgfolio').length; r.pno = document.querySelectorAll('#score .pageno').length; return r; }, c);
            const ks = ['score', 'vb', 'geo', 'sys', 'snap', 'mxl', 'json', 'print', 'after', 'pgno', 'pno'].filter(k => x[k] !== y[k]);
            if (x.err || y.err || ks.length) diff.push(nm(c) + ':' + (x.err || y.err || ks.join(','))); else nOK++;
          }
          T(!diff.length, `PB1 / PN1 / MX1 [${shell}] 缺省零差异：${CASES.length} 份谱（16 预设 + L60 + 4 种谱行组合）的 #score、PV_GEO / SYS_GEO、成品快照、打印切片、MusicXML、song JSON 与基线 v68.4 逐字节相同；无 .pgfolio、.pageno 照旧`,
            diff.slice(0, 6).join(' | ') || nOK + ' 份全同');
          allErrs.push(...R.errs.map(e => 'REF:' + e)); await R.close();
        } else NOREF('PB1 [' + shell + '] 跨版本对拍');
        /* 本版内：中性字段 ≡ 不带字段（JSON 当然不同，其余逐字节） */
        const bad = [];
        for (const c of CASES) {
          const r = await EV(A.pg, c => { __ld(__mk(c)); const a = __rec(); __ld(__mk(Object.assign({}, c, { mod: 'neutral' }))); const n1 = __rec();
            __ld(__mk(Object.assign({}, c, { mod: 'neutral2' }))); const n2 = __rec(); return { a, n1, n2 }; }, c);
          if (r.err) { bad.push(nm(c) + ':' + r.err); continue; }
          for (const k of ['score', 'vb', 'geo', 'sys', 'snap', 'mxl', 'print', 'after']) { if (r.a[k] !== r.n1[k]) bad.push(nm(c) + ' 中性1 ' + k); if (r.a[k] !== r.n2[k]) bad.push(nm(c) + ' 中性2 ' + k); }
        }
        T(!bad.length, `PB1b [${shell}] 本版内：第 1 小节换页 / pgbrk 不是数字 1 / pgno 关着或 on 不是 true ≡ 不带字段（#score · 几何 · 成品快照 · 打印 · MusicXML 逐字节；${CASES.length} 份谱）`, bad.slice(0, 6).join(' | ') || 'ok');
        allErrs.push(...A.errs); await A.close();
      }
    }

    /* ================= G 分页几何 ================= */
    if (want('G')) {
      const A = await open(b);
      const g = await EV(A.pg, () => { const run = f => { const s = __L60(); if (f) f(s); __ld(s); const o = __geo(); o.score = __h(__sc().innerHTML); o.mkW = __sc().querySelectorAll('.pgbrk-mk').length; return o; };
        const R = {};
        R.base = run(); R.pb12 = run(s => { s.measures[12].pgbrk = 1; }); R.pb14 = run(s => { s.measures[14].pgbrk = 1; });
        R.pb1216 = run(s => { s.measures[12].pgbrk = 1; s.measures[16].pgbrk = 1; });
        R.pb20 = run(s => { s.measures[20].pgbrk = 1; }); R.pb0 = run(s => { s.measures[0].pgbrk = 1; });
        R.pb12pull = run(s => { s.measures[12].pgbrk = 1; s.measures[12].pull = 1; });
        R.pb12brk = run(s => { s.measures[12].pgbrk = 1; s.measures[11].brk = 1; });
        /* PB19 书写谱面的换页标记几何（灰缝胶囊 + 虚线） */
        { const s = __L60(); s.measures[12].pgbrk = 1; s.measures[36].pgbrk = 1; __ld(s);
          const step = PV_GEO.pgH + PV_GEO.gap; R.mk = [...__sc().querySelectorAll('.pgbrk-mk')].map(gq => { const r = gq.querySelector('rect'), l = gq.querySelector('line'), t = gq.querySelector('text');
            return { ry: +r.getAttribute('y'), rh: +r.getAttribute('height'), lx1: +l.getAttribute('x1'), lx2: +l.getAttribute('x2'), ly: +l.getAttribute('y1'), txt: t.textContent, pe: gq.getAttribute('pointer-events'), ah: gq.getAttribute('aria-hidden') }; });
          R.mkTops = [12, 36].map(mi => Math.floor((meaBands[mi].y + 0.5) / step) * step); R.PAGE_W = PAGE_W; R.MARGIN = MARGIN; }
        /* PB9 纯和弦谱（预设 14 ×2）在第 6 小节（下标）换页 */
        const co = f => { const s = __rep(PRESETS[14].make(), 2); s.layout = { fixed: true }; if (f) f(s); __ld(s); return __geo(); };
        R.co0 = co(); R.co6 = co(s => { s.measures[6].pgbrk = 1; });
        return R; });
      if (g.err) T(false, 'G 分页几何取样', g.err);
      else {
        const S = 1256, rowsOf = (o, p) => o.rows.filter(r => r.pg === p);
        const firstOf = (o, p) => (rowsOf(o, p)[0] || {}).m1;
        T(g.base.n === 3 && [0, 1, 2].map(p => firstOf(g.base, p)).join() === '0,20,44' && g.base.step === S, 'G0 夹具 L60 基线：3 页、各页首小节 0 / 20 / 44、页步 1256', __rows(g.base));
        { const o = g.pb12, p1 = rowsOf(o, 1)[0] || {};
          T(o.n === 3 && p1.m1 === 12 && near(p1.y0, S + 44) && __rows(o).startsWith('0:0-3 0:4-7 0:8-11 1:12-') && firstOf(o, 2) === 36,
            'PB2 换页 @12：3 页；第 2 页首行从第 13 小节起、y0＝页顶+44（1300）；之前三行 0–3 / 4–7 / 8–11 不变；第 3 页首小节 36', __rows(o) + ' · y0=' + p1.y0); }
        { const o = g.pb14, r = o.rows.find(x => x.m1 === 14);
          T(!!r && rowsOf(o, r.pg)[0] === r && near(r.y0, r.pg * S + 44), 'PB3 行中换页 @14：有一行从第 15 小节起，且是某一页的首行（y0＝页顶+44）', __rows(o)); }
        { const o = g.pb1216, pgs = [...Array(o.n).keys()].map(p => rowsOf(o, p).length);
          T(o.n === 4 && rowsOf(o, 1).length === 1 && rowsOf(o, 1)[0].m1 === 12 && rowsOf(o, 1)[0].m2 === 15 && firstOf(o, 2) === 16 && pgs.every(k => k >= 1),
            'PB4 连续换页 @12 + @16：4 页；第 2 页恰好一行（13–16 小节）；每页行数 ≥1（没有空白页）', __rows(o) + ' · 每页行数 ' + pgs.join('/')); }
        T(g.pb20.n === g.base.n && __rows(g.pb20) === __rows(g.base) && J(g.pb20.sys) === J(g.base.sys), 'PB5 换页落在本来就自动翻页的行（@20）：页数、各行、各页首小节与不加时相同', __rows(g.pb20));
        T(g.pb0.score === g.base.score && g.pb0.mkW === 0 && J(g.pb0.sys) === J(g.base.sys), 'PB6 第 1 小节的换页无效：#score 与不加时逐字节相同，书写谱面没有标记', J({ same: g.pb0.score === g.base.score, mk: g.pb0.mkW }));
        T(J(g.pb12pull.sys) === J(g.pb12.sys) && __rows(g.pb12pull) === __rows(g.pb12), 'PB7 同一小节 pull=1 与 pgbrk=1 并存：换页优先（仍从这一小节换行换页），SYS_GEO 与只有 pgbrk 时相同', __rows(g.pb12pull));
        T(g.pb12brk.score === g.pb12.score, 'PB8 前一小节 brk=1 ＋ 本小节 pgbrk=1 与只有 pgbrk 时 #score 逐字节相同', g.pb12brk.score + ' / ' + g.pb12.score);
        { const o = g.co6, after = o.rows.filter(r => r.m1 >= 6 && r.m1 < 16);
          T(!!o.rows.find(r => r.m1 === 6 && r.m2 === 9) && after.every(r => (r.m1 - 6) % 4 === 0) && rowsOf(o, o.rows.find(r => r.m1 === 6).pg)[0].m1 === 6,
            'PB9 纯和弦谱（预设 14 ×2）在第 7 小节换页：换页处另起一页，后面的行按 4 小节乐句从换页处重新数（6–9、10–…）', __rows(o) + ' ← 不加：' + __rows(g.co0)); }
        { const m = g.mk || [], tops = g.mkTops || [];
          T(m.length === 2 && m.every((x, i) => x.ry >= tops[i] - 26 - 0.5 && x.ry + x.rh <= tops[i] + 0.5 && near(x.lx1, g.MARGIN) && near(x.lx2, g.PAGE_W - g.MARGIN) && x.txt === '换页' && x.pe === 'none' && x.ah === 'true'),
            'PB19 书写标记几何：胶囊整个落在本页上方的页间灰缝里（y∈[页顶−26, 页顶]），虚线从 MARGIN 到 PAGE_W−MARGIN，写「换页」，不抢点击、读屏隐藏', J(m) + ' 页顶 ' + tops.join(',')); }
      }
      /* PB10 不换行长带 */
      { const r = await EV(A.pg, () => { const s = __L60(); s.measures[12].pgbrk = 1; s.measures[36].pgbrk = 1; s.measures[0].pgbrk = 1; __ld(s); setNoWrap(true); render();
          const mk = [...__sc().querySelectorAll('.pgbrk-mk')].map(gq => { const l = gq.querySelector('line'); return { x: +l.getAttribute('x1'), x2: +l.getAttribute('x2'), y1: +l.getAttribute('y1'), y2: +l.getAttribute('y2'), t: (gq.querySelector('text') || {}).textContent }; });
          const exp = [12, 36].map(mi => { const lm = layoutSystems()[0].measures.find(q => q.mi === mi); return +(meaBoxes[mi].x - (lm.ksBefore || 0) - 3).toFixed(1); });
          const sysN = SYS_GEO.length, fol = __sc().querySelectorAll('.pgfolio').length; const gq = __geo(); setNoWrap(false); render();
          return { sysN, mk, exp, rows: __rows(gq), n: gq.n, fol }; });
        T(!r.err && r.sysN === 1 && r.mk.length === 2 && r.mk.every((m, i) => near(m.x, r.exp[i]) && m.x === m.x2 && m.y2 > m.y1 && m.t === '换页'),
          'PB10 不换行长带：书写谱面 1 行，标记是该小节左小节线前 3 单位的竖虚线，个数＝有效换页数（第 1 小节不算）', J(r).slice(0, 300));
        T(!r.err && r.n === 3 && r.rows.startsWith('0:0-3 0:4-7 0:8-11 1:12-') && r.rows.indexOf(' 2:36-') > 0, 'PB10b 不换行时成品（分页取样）照样换页：页数与 PB2 相同', r.rows); }
      /* PB20 预览页数 */
      { const r = await EV(A.pg, () => { const s = __L60(); s.measures[12].pgbrk = 1; s.measures[16].pgbrk = 1; __ld(s); pvOpen(); const n = document.querySelectorAll('#pv-pages .pv-page').length, gn = PV.geo.n; pvClose(); return { n, gn }; });
        T(!r.err && r.n === 4 && r.gn === 4, 'PB20 打印预览（pvOpen）的页数＝分页排版页数（@12 + @16 → 4 页）', J(r)); }
      allErrs.push(...A.errs); await A.close();
      /* PB21 两种外壳一致 */
      { const fn = () => { const s = __L60(); s.measures[12].pgbrk = 1; s.measures[36].pgbrk = 1; s.layout.pgno = { on: true, pos: 'bo', start: 1, first: true }; __ld(s);
          const mkW = __sc().querySelectorAll('.pgbrk-mk').length; const o = __geo(); return { n: o.n, rows: __rows(o), sys: o.sys, fol: o.fol.map(f => [f.t, f.x, f.y, f.an]), mkW, pv: JSON.stringify(PV_GEO) }; };
        const F = await open(b), C = await open(b, { shell: 'classic' });
        const x = await EV(F.pg, fn), y = await EV(C.pg, fn);
        T(!x.err && !y.err && J(x) === J(y) && x.n === 3 && x.fol.length === 3 && x.mkW === 2, 'PB21 两种外壳一致（默认 / ?shell=classic）：同一份谱（换页 + 页码）的 PV_GEO / SYS_GEO / 每页首末小节 / 页码文字与坐标 / 标记个数全部相等',
          J({ same: J(x) === J(y), n: x.n, fol: x.fol, mk: x.mkW, err: x.err || y.err }));
        allErrs.push(...F.errs, ...C.errs); await F.close(); await C.close(); }
    }

    /* ================= N 页码 ================= */
    if (want('N')) {
      const A = await open(b);
      const r = await EV(A.pg, () => { const run = (pn, f) => { const s = __L60(); if (pn) s.layout.pgno = pn; if (f) f(s); __ld(s); return __geo(); };
        const R = {};
        R.off = run(null); R.bc = run({ on: true, pos: 'bc', start: 1, first: false }); R.bo1 = run({ on: true, pos: 'bo', start: 1, first: true });
        R.bo2 = run({ on: true, pos: 'bo', start: 2, first: true }); R.to2 = run({ on: true, pos: 'to', start: 2, first: true });
        R.st37 = run({ on: true, pos: 'bc', start: 37, first: false });
        /* PN10 字号＝页头署名行字号 */
        { const s = __L60(); s.lyricist = '张三'; s.composer = '李四'; s.layout.pgno = { on: true, pos: 'bc', first: true }; __ld(s);
          const hd = [...__sc().querySelectorAll('text')].find(t => /作词/.test(t.textContent)); const f = __sc().querySelector('.pgfolio');
          R.p10 = { hdFs: hd && hd.getAttribute('font-size'), fs: f && f.getAttribute('font-size'), ff: f && f.getAttribute('font-family'), fill: f && f.getAttribute('fill') };
          const xs = __cap(() => exportPNG(1)); const x = xs[xs.length - 1] || '';
          const d = new DOMParser().parseFromString(x, 'image/svg+xml'); const pf = d.querySelector('.pgfolio');
          const fam = getComputedStyle(document.documentElement).getPropertyValue('--font-num').trim().split(',')[0].replace(/["']/g, '');
          R.p10.png = { n: d.querySelectorAll('.pgfolio').length, ff: pf && pf.getAttribute('font-family'), fill: pf && pf.getAttribute('fill'), fam }; }
        /* PN8 关掉复原 */
        { __ld(__L60()); const h0 = __h(__sc().innerHTML), j0 = JSON.stringify(song), u0 = undoStack.length;
          const a = pgnoSet({ on: true }); const mid = { pno: __sc().querySelectorAll('.pageno').length, fol: __sc().querySelectorAll('.pgfolio').length };
          const c = pgnoSet({ on: false });
          R.p8 = { a, c, mid, pno: __sc().querySelectorAll('.pageno').length, fol: __sc().querySelectorAll('.pgfolio').length, same: __h(__sc().innerHTML) === h0, json: JSON.stringify(song) === j0, undo: undoStack.length - u0 }; }
        return R; });
      if (r.err) T(false, 'N 页码取样', r.err);
      else {
        const S = 1256, at = (o, p) => o.fol.find(f => f.pg === p);
        T(r.off.fol.length === 0 && r.off.pageno === 3, 'PN1 缺省不印页码：没有 .pgfolio，屏幕页码 .pageno 照旧（3 页 3 个）', J({ fol: r.off.fol.length, pageno: r.off.pageno }));
        { const o = r.bc, f1 = at(o, 1), f2 = at(o, 2);
          T(o.n === 3 && o.fol.length === 2 && !at(o, 0) && f1 && f2 && f1.t === '2' && f2.t === '3' && [f1, f2].every(f => near(f.x, 435) && f.an === 'middle' && near(f.y, f.pg * S + 1230 - 29)) && o.pageno === 3 && J(o.pnx) === J(['860:end', '860:end', '860:end']),
            'PN2 底部居中、首页不印：第 2、3 页各一个页码「2」「3」，x＝435（PAGE_W/2）居中，y＝页顶+1230−29（距纸下边 7mm）；第 1 页没有；屏幕页码 .pageno 照画在右下角（收尾 UX-7：此前印页码时整个不画）', J(o.fol.map(f => [f.t, f.x, f.y, f.an]))); }
        { const a = r.bo1.fol.map(f => [f.t, f.x, f.an].join()), c = r.bo2.fol.map(f => [f.t, f.x, f.an].join());
          T(J(a) === J(['1,814,end', '2,56,start', '3,814,end']) && J(c) === J(['2,56,start', '3,814,end', '4,56,start'])
            && J(r.bo1.pnx) === J(['10:start', '860:end', '10:start']) && J(r.bo2.pnx) === J(['860:end', '10:start', '860:end']),
            'PN3 底部外侧、首页印：单数页码在右（x＝PAGE_W−MARGIN＝814、end），双数在左（x＝MARGIN＝56、start）；起始页码改成 2 后左右跟着印出来的页码互换；'
            + '屏幕页码「第 x / N 页」在成品页码占了右下角的页挪到左下角（x＝10、start），其余页照旧在右下（收尾 UX-7）', J({ a, c, pnx1: r.bo1.pnx, pnx2: r.bo2.pnx })); }
        { const o = r.to2, f0 = at(o, 0), y0s = [1, 2].map(p => (o.rows.find(x => x.pg === p) || {}).y0);
          const MM = o.MM, clear = [1, 2].every(p => { const f = at(o, p), rw = o.rows.filter(x => x.pg === p); return f && rw.every(x => f.bb.y2 < x.y0 - 7 && f.bb.y > x.y1 + 7 || f.bb.y2 < x.y0 - 7) && (rw[0].y0 - 7 - f.bb.y2) >= 2 * MM - 0.5; });
          T(f0 && f0.t === '2' && near(f0.x, 56) && f0.an === 'start' && near(f0.y, Math.min(33, o.topMargin - 9)) && y0s.every((y, i) => near(y, (i + 1) * S + 51)) && clear,
            'PN4 顶部外侧、起始 2、首页印：第 1 页「2」在左上（y＝min(8mm, 题头上沿−9)＝33）；第 2 页起各页首行 y0＝页顶+51；页码字框与各行 [y0−7, y1+7] 不相交、净距 ≥2mm',
            J({ f0: f0 && [f0.t, f0.x, f0.y, f0.an], y0s, bb: o.fol.map(f => f.bb), MM: +MM.toFixed(3) })); }
        { const t = r.st37.fol.map(f => f.pg + ':' + f.t).join();
          T(t === '1:38,2:39', 'PN6 起始页码 37、首页不印：第 2、3 页印 38、39', t); }
        { const p = r.p10;
          T(p.hdFs === '12.5' && p.fs === p.hdFs && p.ff === 'var(--font-num)' && p.fill === 'var(--ink)', 'PN10 页码字号＝页头署名行字号（12.5）、字体 var(--font-num)、墨色 var(--ink)', J(p));
          T(p.png && p.png.n === 3 && p.png.fill === '#141414' && p.png.ff && p.png.ff.indexOf(p.png.fam) >= 0 && !/var\(/.test(p.png.ff), 'PN10b PNG 成品里页码的字体解析成实际字体栈（首选 ' + (p.png && p.png.fam) + '）、颜色 #141414', J(p.png)); }
        { const p = r.p8;
          T(p.a === true && p.c === true && p.mid.pno === 3 && p.mid.fol === 3 - 1 && p.pno === 3 && p.fol === 0 && p.same && p.json && p.undo === 2,
            'PN8 打开再关上页码：开着时 .pageno 照画（3 个）、关上后 #score 与从未开过逐字节相同、song JSON 回到原样（layout 原样）；各一步撤销', J(p)); }
      }
      /* PN7 底部避让 + n_on ≥ n_off（L60 与另两份长谱，底部居中 / 底部外侧；顶部外侧另查首行） */
      { const res = await EV(A.pg, () => { const out = [];
          const mk = [['L60', () => __L60()], ['送别×4', () => { const s = __rep(PRESETS[10].make(), 4); s.layout = { fixed: true }; return s; }], ['钢琴×5', () => { const s = __rep(PRESETS[8].make(), 5); s.layout = { fixed: true }; return s; }],
            ['四部合唱×5', () => { const s = __rep(PRESETS[11].make(), 5); return s; }]];
          for (const [nm, f] of mk) {
            __ld(f()); const off = __geo();
            for (const pos of ['bc', 'bo', 'to']) { const s = f(); s.layout = Object.assign({}, s.layout || {}, { pgno: { on: true, pos, start: 1, first: true } }); __ld(s); const o = __geo();
              const bad = [];
              for (let p = 0; p < o.n; p++) { const fo = o.fol.find(x => x.pg === p), rw = o.rows.filter(x => x.pg === p); if (!fo || !rw.length) { bad.push('p' + p + (fo ? '空页' : '无页码')); continue; }
                if (pos === 'to') { if (p > 0 && rw[0].y0 - 7 - fo.bb.y2 < 2 * o.MM - 0.5) bad.push('p' + p + '顶 ' + (rw[0].y0 - 7 - fo.bb.y2).toFixed(1)); }
                else { const last = rw[rw.length - 1]; if (fo.bb.y - (last.y1 + 7) < 2 * o.MM - 0.5) bad.push('p' + p + '底 ' + (fo.bb.y - last.y1 - 7).toFixed(1)); } }
              out.push({ nm, pos, n_on: o.n, n_off: off.n, bad }); } }
          return out; });
        T(!res.err && res.every(x => !x.bad.length && x.n_on >= x.n_off), 'PN7 页码避让：底部页码字框顶到每页末行墨迹上界（y1+7）、顶部页码字框底到第 2 页起首行墨迹上界（y0−7）净距 ≥2mm；n_on ≥ n_off（4 份谱 × 3 种位置，首页印）',
          res.err || res.map(x => x.nm + '/' + x.pos + ' ' + x.n_off + '→' + x.n_on + (x.bad.length ? ' ✗' + x.bad.join(',') : '')).join(' · ')); }
      /* PN5 不与页头相交（题头元素：首行之前的全部文字；屏幕坐标比，变换一并算进去） */
      { const one = async (pg, tag) => EV(pg, tag => { const s = tag === 'long' ? (() => { const x = __rep(PRESETS[0].make(), 2);
            Object.assign(x, { title: '独库公路G217（Live 版）——献给每一位在路上的人', singer: '生命树下', lyricist: '林夕/黄伟文/周耀辉/陈少琪/李焯雄', composer: 'Ed Sheeran / Johnny McDaid / Steve Mac / Amy Wadge', maker: '谱友圈', capo: 1, tempoTerm: 'Allegro ma non troppo' }); return x; })() : __L60();
          const res = [];
          for (const pos of ['to', 'bo', 'bc']) { s.layout = Object.assign({}, s.layout || {}, { pgno: { on: true, pos, start: 1, first: true } }); __ld(JSON.parse(JSON.stringify(s)));
            const sv = __sc(), y0 = SYS_GEO[0].y0, M0 = sv.getScreenCTM().inverse();
            const box = e => { const q = e.getBoundingClientRect(); const a = sv.createSVGPoint(); a.x = q.left; a.y = q.top; const c = sv.createSVGPoint(); c.x = q.right; c.y = q.bottom; const A2 = a.matrixTransform(M0), C2 = c.matrixTransform(M0); return { x: A2.x, y: A2.y, x2: C2.x, y2: C2.y }; };
            const f = [...sv.querySelectorAll('.pgfolio')].find(t => +t.getAttribute('y') < PV_GEO.pgH); if (!f) { res.push(pos + ':无第 1 页页码'); continue; }
            const fb = box(f); if (pos === 'to' && fb.y < -0.5) res.push(pos + ':出纸 ' + fb.y.toFixed(1));
            const hit = [...sv.querySelectorAll('text')].filter(t => t !== f && !t.classList.contains('pageno') && !t.classList.contains('pgfolio')).map(t => [t, box(t)])
              .filter(([t, q]) => q.y2 < y0 && q.x2 > q.x && !(q.x2 < fb.x || q.x > fb.x2 || q.y2 < fb.y || q.y > fb.y2)).map(([t]) => t.textContent.slice(0, 12));
            if (hit.length) res.push(pos + ':与页头相交 ' + hit.join('/')); }
          return { res, PAGE_W, MARGIN }; }, tag);
        const F = await open(b, { vp: { width: 390, height: 844 } });
        const a = await one(A.pg, 'l60'), c = await one(A.pg, 'long'), d = await one(F.pg, 'long');
        T(!a.err && !c.err && !d.err && !a.res.length && !c.res.length && !d.res.length, 'PN5 首页印页码（顶部外侧 / 底部外侧 / 底部居中）不与页头任何文字（曲名、演唱、署名、1=X、速度、变调夹）相交、不出纸——L60、长曲名长署名（1440 与 390 手机编辑）',
          J({ l60: a.res || a.err, long: c.res || c.err, phone: d.res || d.err, phoneW: d.PAGE_W + '/' + d.MARGIN }));
        allErrs.push(...F.errs); await F.close(); }
      /* PN13 规范化 · PN14 数据整洁 */
      { const r2 = await EV(A.pg, () => { const C = (o) => J(pgnoCfg({ layout: { pgno: o } })); function J(x) { return JSON.stringify(x); }
          const cfg = { yes: C({ on: 'yes' }), one: C({ on: 1 }), pos: C({ on: true, pos: 'xx' }), s0: C({ on: true, start: 0 }), sneg: C({ on: true, start: -3 }), sabc: C({ on: true, start: 'abc' }), sbig: C({ on: true, start: 1e9 }),
            sfrac: C({ on: true, start: 2.6 }), sstr: C({ on: true, start: '7' }), ft: C({ on: true, first: 'true' }), nul: J(pgnoCfg({ layout: { pgno: null } })), arr: J(pgnoCfg({ layout: { pgno: [] } })), none: J(pgnoCfg({})), und: J(pgnoCfg(null)) };
          const s = __L60(); const raw = { on: 'yes', pos: 'xx', start: 'abc', first: 'true' }; s.layout.pgno = raw; let thrown = null; try { __ld(s); } catch (e) { thrown = e.message; }
          const kept = J(song.layout.pgno) === J(raw), fol = __sc().querySelectorAll('.pgfolio').length;
          /* PN14：layout 缺失的谱打开再关上 → JSON 原样（layout 删回去）；只关页码、其余非缺省时保留 {on:false,…}；值没变不记撤销点 */
          const s2 = PRESETS[1].make(); delete s2.layout; __ld(s2); const j0 = JSON.stringify(song), u0 = undoStack.length;
          const a1 = pgnoSet({ on: true }), a1b = pgnoSet({ on: true }), mid = J(song.layout), a2 = pgnoSet({ on: false });
          const p14a = { a1, a1b, a2, mid, same: JSON.stringify(song) === j0, hasLayout: 'layout' in song, undo: undoStack.length - u0 };
          pgnoSet({ on: true, start: 5 }); pgnoSet({ on: false }); const p14b = J(song.layout); const keys = Object.keys(song.layout.pgno).join();
          undo(); const p14c = J(song.layout);
          return { cfg, thrown, kept, fol, p14a, p14b, keys, p14c }; });
        const c = r2.cfg || {};
        T(!r2.err && c.yes === 'null' && c.one === 'null' && /"pos":"bc"/.test(c.pos) && [c.s0, c.sneg, c.sabc, c.sbig].every(x => /"start":1,/.test(x)) && /"start":3,/.test(c.sfrac) && /"start":7,/.test(c.sstr) && /"first":false/.test(c.ft)
          && c.nul === 'null' && c.arr === 'null' && c.none === 'null' && c.und === 'null' && r2.thrown === null && r2.kept && r2.fol === 0,
          'PN13 规范化：on 不是 true（"yes" / 1）＝不印；pos 不在白名单按 bc；start 0 / −3 / "abc" / 1e9 按 1、2.6→3、"7"→7；first:"true" 视为 false；都不抛错，载入（migrate）不改写原值', J(r2).slice(0, 400));
        const p = r2.p14a || {};
        T(!r2.err && p.a1 === true && p.a1b === false && p.a2 === true && p.same && !p.hasLayout && p.undo === 2 && r2.p14b === '{"pgno":{"on":false,"pos":"bc","start":5,"first":false}}' && r2.keys === 'on,pos,start,first',
          'PN14 数据整洁：layout 缺失的谱打开再关上页码，song JSON 原样（layout 删回去）、值没变不记撤销点；只关页码、其余非缺省时保留完整四键 {on:false,…}（顺序 on,pos,start,first）', J({ p, b: r2.p14b, keys: r2.keys })); }
      /* PN15 离屏渲染 */
      { const r3 = await EV(A.pg, () => { __ld(__L60()); const h0 = __h(__sc().innerHTML), g0 = JSON.stringify(PV_GEO), sy0 = JSON.stringify(SYS_GEO);
          const s = __L60(); s.measures[12].pgbrk = 1; s.layout.pgno = { on: true, pos: 'bo', start: 1, first: true };
          const t = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(t);
          const o = renderOffscreen({ song: s, target: t, maxSystems: Infinity, crop: false, paperW: 900, fixed: true });
          const fol = [...t.querySelectorAll('.pgfolio')].map(x => x.textContent).join(), mk = t.querySelectorAll('.pgbrk-mk').length;
          const pv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(pv); renderPreview(s, pv, { maxSystems: 99 }); const mk2 = pv.querySelectorAll('.pgbrk-mk').length;
          t.remove(); pv.remove();
          return { pages: o && o.pages, fol, mk, mk2, same: __h(__sc().innerHTML) === h0 && JSON.stringify(PV_GEO) === g0 && JSON.stringify(SYS_GEO) === sy0 }; });
        T(!r3.err && r3.pages === 3 && r3.fol === '3,2,1' && r3.mk === 0 && r3.mk2 === 0 && r3.same, 'PN15 离屏渲染（renderOffscreen 全部行、不裁切；renderPreview）：带页码的谱离屏 svg 里每页一个页码、没有换页标记；#score / PV_GEO / SYS_GEO 不变', J(r3)); }
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= O 成品 ================= */
    if (want('O')) {
      const A = await open(b);
      const SETUP = () => { const s = __L60(); s.measures[0].pgbrk = 1; s.measures[12].pgbrk = 1; s.measures[36].pgbrk = 1; s.layout.pgno = { on: true, pos: 'bo', start: 1, first: false }; __ld(s); };
      /* PB12 打印切片 · PB18（打印） · PN9（打印的页码） */
      const r = await EV(A.pg, SETUP => { (new Function(SETUP))();
        const step = PV_GEO.pgH + PV_GEO.gap; let cap = null;
        const on = () => { const pp = document.getElementById('print-pages'); const src = pp && pp.querySelector('#pp-src');
          cap = { raw: __sc().querySelectorAll('.pgbrk-mk').length, n: PV_GEO.n, pp: pp ? pp.querySelectorAll('.pp').length : -1, vbs: pp ? [...pp.querySelectorAll('.pp > svg')].map(s => s.getAttribute('viewBox')) : [], mk: src ? src.querySelectorAll('.pgbrk-mk').length : -1,
            fol: pp ? [...pp.querySelectorAll('.pp > svg')].map(sv => { const vb = sv.viewBox.baseVal; return __folIn(src, vb.y, vb.y + vb.height); }) : [] }; };
        addEventListener('beforeprint', on); dispatchEvent(new Event('beforeprint')); removeEventListener('beforeprint', on);
        dispatchEvent(new Event('afterprint')); const left = !!document.getElementById('print-pages');
        const mkW = __sc().querySelectorAll('.pgbrk-mk').length;
        return { cap, left, step, mkW }; }, `(${SETUP.toString()})()`);
      const c = r.cap || {};
      T(!r.err && c.n === 3 && c.pp === 3 && c.vbs.every((v, k) => v.split(' ')[1] === String(k * r.step)) && c.mk === 0 && c.raw === 0 && !r.left && r.mkW === 2,
        'PB12 打印：切片张数＝PV_GEO.n（3）、各页 viewBox 的 y＝k·1256、打印期间 #score 与 #pp-src 里都没有换页标记（书写谱面有 2 个）；打完切片容器移除', J({ n: c.n, pp: c.pp, vbs: c.vbs, mk: c.mk, raw: c.raw, left: r.left, mkW: r.mkW, err: r.err }));
      /* PB13 PDF */
      { await EV(A.pg, () => { const s = __L60(); s.measures[12].pgbrk = 1; s.measures[16].pgbrk = 1; __ld(s); });
        const n = await EV(A.pg, () => PV_GEO.n);
        const buf = await A.pg.pdf({ format: 'A4', preferCSSPageSize: true }).catch(() => null);
        T(n === 4 && pdfPages(buf) === 4, 'PB13 PDF（preferCSSPageSize）页数＝分页排版页数（@12 + @16 → 4）', J({ n, pdf: pdfPages(buf) })); }
      /* PB14 PNG · PB15 分享卡 · PB16 缩图 · PB18 各出口无标记 · PN9 三处一致 · PN11 */
      const o = await EV(A.pg, SETUP => { (new Function(SETUP))();
        const step = PV_GEO.pgH + PV_GEO.gap, n = PV_GEO.n, G = { n, step };
        const xs = __cap(() => exportPNG(1)); const x = xs[xs.length - 1] || '';
        const d = new DOMParser().parseFromString(x, 'image/svg+xml'), root = d.documentElement;
        G.png = { mk: /pgbrk-mk/.test(x), vbH: +(root.getAttribute('viewBox') || '').split(' ')[3], fol: [...Array(n).keys()].map(k => __folIn(root, k * step, k * step + PV_GEO.pgH)) };
        /* 预览页（pvOpen：每页 viewBox 开窗） */
        pvOpen(); G.pv = [...document.querySelectorAll('#pv-pages .pv-page .pv-paper > svg')].map(sv => { const vb = sv.viewBox.baseVal; return __folIn(sv, vb.y, vb.y + vb.height); });
        G.pvMk = /pgbrk-mk/.test(PV.content); pvClose();
        G.clone = withCleanSnap(() => scoreExportClone().querySelectorAll('.pgbrk-mk').length, { paging: true });
        G.raw = withCleanSnap(() => __sc().querySelectorAll('.pgbrk-mk').length, { paging: true }) + withCleanSnap(() => __sc().querySelectorAll('.pgbrk-mk').length);   /* 门控本身：成品取样那一次 render 就不画（不靠后面的摘除） */
        /* 分享卡：顶部外侧 + 首页印（页码会落在第 1 页角上）——卡里不该有 */
        { const s = JSON.parse(JSON.stringify(song)); s.layout.pgno = { on: true, pos: 'to', start: 1, first: true }; __ld(s); }
        const card = buildShareCardSVG(); const m = card.match(/<svg x="25" y="96" width="700" height="([\d.]+)" viewBox="0 0 ([\d.]+) ([\d.]+)"/);
        const pr = withCleanSnap(() => SYS_GEO.slice(), { paging: true }), p0 = pr.filter(g => g.y0 < PV_GEO.pgH), p1 = pr.filter(g => g.y0 >= step && g.y0 < 2 * step);
        G.card = { mk: /pgbrk-mk/.test(card), fol: /pgfolio/.test(card), cropH: m ? +m[3] : null, last0: p0.length ? p0[p0.length - 1].y1 : null, first1: p1.length ? p1[0].y0 : null };
        /* 缩图（借谱烤图，取 svgResolveVars 的输入串） */
        const ts = __cap(() => buildThumbCanvas(JSON.parse(JSON.stringify(song)), () => {}, () => {})); const t = ts[ts.length - 1] || '';
        G.thumb = { len: t.length, fol: /pgfolio/.test(t), mk: /pgbrk-mk/.test(t) };
        /* 谱架 */
        enterStand(); render(); G.stand = __sc().querySelectorAll('.pgbrk-mk').length; exitStand(); render(); G.mkBack = __sc().querySelectorAll('.pgbrk-mk').length;
        return G; }, `(${SETUP.toString()})()`);
      if (o.err) T(false, 'O 成品取样', o.err);
      else {
        const n = o.n, H = n * 1230 + (n - 1) * 26 + 6;
        T(!o.png.mk && near(o.png.vbH, H) && o.png.fol.every((f, k) => f.length === (k === 0 ? 0 : 1)), 'PB14 PNG 整页图：没有换页标记，viewBox 高＝n·PG_H+(n−1)·26+6（' + H + '），每页各自的页码（首页不印）', J({ vbH: o.png.vbH, fol: o.png.fol }));
        T(!o.card.mk && !o.card.fol && o.card.cropH != null && o.card.cropH <= o.card.last0 + 16 + 0.5 && o.card.cropH < o.card.first1, 'PB15 / PN11 分享卡：不含换页标记、不含页码（顶部外侧＋首页印也不上卡）；裁切高度 ≤ 第 1 页末行下沿+16，且小于第 2 页首行 y0', J(o.card));
        T(o.thumb.len > 1000 && !o.thumb.fol && !o.thumb.mk, 'PB16 / PN11 缩图：烤图 SVG 不含页码、不含换页标记', J(o.thumb));
        T(!o.pvMk && o.clone === 0 && o.raw === 0 && o.stand === 0 && o.mkBack === 2, 'PB18 标记只在书写谱面：成品取样（withCleanSnap 分页 / 不分页）那一次 render 就不画；打印预览 PV.content、成品克隆、谱架里都没有（PNG / 打印 / 卡片 / 缩图 / 离屏见 PB12–PB16、PN15）；出谱架回到书写谱面又画出 2 个',
          J({ pv: o.pvMk, clone: o.clone, raw: o.raw, stand: o.stand, back: o.mkBack }));
        T(J(o.pv) === J(r.cap && r.cap.fol) && J(o.pv) === J(o.png.fol) && o.pv.length === 3 && o.pv[1].length === 1,
          'PN9 三处一致：打印预览每页、打印切片每张、PNG 各页区间内的页码文字与坐标逐页相同', J({ pv: o.pv, print: r.cap && r.cap.fol, png: o.png.fol }));
      }
      allErrs.push(...A.errs); await A.close();
      /* PB18（观看态）· PB11 窄屏观看长卷 */
      const viewer = async (vp, tag) => { const P = await open(b, { vp });
        const v = await EV(P.pg, async () => { const s = __L60(); s.measures[12].pgbrk = 1; s.measures[36].pgbrk = 1; s.layout.pgno = { on: true, pos: 'bc', start: 1, first: false };
          const oa = apiCall; apiCall = async p => { if (/^\/pub\/scores\//.test(p)) return { score: { id: 'tvpgbrk01', title: '换页测试', data: s, author: 'x' } }; return {}; };
          try { await openRemotePub('tvpgbrk01'); } finally { apiCall = oa; }
          await new Promise(r => setTimeout(r, 300)); render();
          const rows = []; let last = null; song.measures.forEach((_, mi) => { const bb = meaBands[mi]; if (!last || last.y !== bb.y) { last = { y: bb.y, m1: mi }; rows.push(last); } });
          const R = { viewer: !!viewerMode, n: PV_GEO.n, fol: __sc().querySelectorAll('.pgfolio').length, mk: __sc().querySelectorAll('.pgbrk-mk').length, row12: rows.some(r => r.m1 === 12), row36: rows.some(r => r.m1 === 36) };
          let cap = null; const on = () => { const pp = document.getElementById('print-pages'); cap = { pp: pp ? pp.querySelectorAll('.pp').length : -1, fol: pp ? pp.querySelectorAll('#pp-src .pgfolio').length : -1, n: PV_GEO.n }; };
          addEventListener('beforeprint', on); dispatchEvent(new Event('beforeprint')); removeEventListener('beforeprint', on); dispatchEvent(new Event('afterprint'));
          R.print = cap; return R; });
        allErrs.push(...P.errs); await P.close(); return v; };
      { const v = await viewer({ width: 1440, height: 900 });
        T(!v.err && v.viewer && v.mk === 0 && v.fol === 2 && v.n === 3, 'PB18b 观看页（桌面分页）：没有换页标记；分页时印页码（首页不印 → 2 个）', J(v)); }
      { const v = await viewer({ width: 390, height: 844 });
        T(!v.err && v.viewer && v.n === 1 && v.fol === 0 && v.mk === 0 && v.row12 && v.row36 && v.print && v.print.pp === v.print.n && v.print.n > 1 && v.print.fol === v.print.n - 1,
          'PB11 / PN12 窄屏观看长卷（390）：不分页、没有页码、没有标记，换页处仍然换行；打印（beforeprint）时恢复分页并印页码', J(v)); }
    }

    /* ================= C 缓存（PB17） ================= */
    if (want('C')) {
      const WRITE = ['pb12', 'pb36', 'pnon', 'pnpos', 'pnst', 'u', 'u', 'u', 'r', 'A5', 'scale', 'pb36off', 'pull', 'reset'];
      const ENG = ['enter', 'pb20', 'pnto', 'u', 'pb20b', 'A4', 'write'];
      const OPS = () => { window.__opC = k => { const M = song.measures;
        switch (k) { case 'pb12': return sysPageBreak(12, true); case 'pb36': return sysPageBreak(36, true); case 'pnon': return pgnoSet({ on: true }); case 'pnpos': return pgnoSet({ pos: 'bo' });
          case 'pnst': return pgnoSet({ start: 3 }); case 'u': return undo(); case 'r': return redo(); case 'A5': return layApply({ page: 'A5' }); case 'A4': return layApply({ page: 'A4' });
          case 'scale': return layApply({ scale: 1.1 }); case 'pb36off': return sysPageBreak(36, false);
          case 'pull': { const L = layoutSystems(); const r = L.find(s => s.measures[0].mi < 12 && s.measures[s.measures.length - 1].mi >= 8) || L[0]; return sysAct('pull', r.measures[0].mi, r.measures[r.measures.length - 1].mi); }
          case 'reset': return sysAct('reset', 12, 15);
          case 'pb20': return sysPageBreak(20, true); case 'pb20b': return sysPageBreak(20); case 'pnto': return pgnoSet({ on: true, pos: 'to', first: true });
          case 'enter': return setMode('engrave'); case 'write': return setMode('write'); } }; };
      const go = async nocache => { const P = await open(b, { nocache }); const pg = P.pg; await pg.evaluate(OPS);
        await EV(pg, () => { __ld(__L60()); });
        const hs = [];
        for (const k of WRITE) { const r = await EV(pg, k => { const ret = __opC(k); return { k, ret: String(ret), h: __h(__sc().innerHTML), vb: __sc().getAttribute('viewBox'), inc: window.__noRenderCache ? 'off' : __incCheck() }; }, k); hs.push(r); }
        const es = [];
        for (const k of ENG) { await EV(pg, k => __opC(k), k); await pg.waitForTimeout(600);
          const r = await EV(pg, k => { const sv = [...document.querySelectorAll('#pv-pages .pv-paper > svg')]; const ps = document.getElementById('pv-stage'), sr = ps && ps.getBoundingClientRect();
            const vis = sv.filter(x => { const q = x.getBoundingClientRect(); return sr && q.bottom > sr.top && q.top < sr.bottom; });
            return { k, mode: FLOW.mode.cur, pv: __h(PV.content || ''), n: sv.length, wh: sv.map(x => x.getAttribute('viewBox')).join('|'), visOk: !sv.length || (vis.length > 0 && vis.every(x => __pvSub(x).ok)), sc: FLOW.mode.cur === 'write' ? __h(__sc().innerHTML) : '' }; }, k);
          if (r.mode === 'engrave' && r.n) { let all = true; r.fol = [];
            for (let i = 0; i < r.n; i++) { await pg.evaluate(i => document.querySelectorAll('#pv-pages .pv-page')[i].scrollIntoView(), i); await pg.waitForTimeout(200);
              /* 每张预览页：内容是 PV.cks 的按序子序列，且本页窗口里的页码恰好是该印的那个（页码在段 0，按段取舍时每页都放——放进谱行段就会在别的页丢失） */
              const q = await pg.evaluate(i => { const sv = document.querySelectorAll('#pv-pages .pv-paper > svg')[i], vb = sv.viewBox.baseVal, P = pgnoCfg(song);
                const got = __folIn(sv, vb.y, vb.y + vb.height), want = P && (i > 0 || P.first) ? String(P.start + i) : null;
                return { ok: __pvSub(sv).ok, fol: got.length === (want ? 1 : 0) && (!want || got[0].split('@')[0] === want) }; }, i);
              if (!q.ok || !q.fol) all = false; r.fol.push(q.fol ? 1 : 0); }
            await pg.evaluate(() => { const ps = document.getElementById('pv-stage'); if (ps) ps.scrollTop = 0; }); r.all = all; }
          es.push(r); }
        allErrs.push(...P.errs); await P.close(); return { hs, es }; };
      const A = await go(false), B = await go(true);
      const bad = A.hs.map((x, i) => { const y = B.hs[i]; return (x.err || y.err) ? x.k + ':' + (x.err || y.err) : (x.h !== y.h || x.vb !== y.vb || x.ret !== y.ret) ? x.k + '(' + x.h + '/' + y.h + ')' : x.inc !== 'ok' ? x.k + ':inc ' + x.inc : null; }).filter(Boolean);
      T(!bad.length && A.hs[0].ret === 'true' && A.hs[2].ret === 'true', 'PB17 增量缓存（书写）：换页开 · 再开一处 · 页码开 · 改位置 · 改起始 · 撤销×3 · 重做 · 纸张 A5 · 内容 + · 取消换页 · 行尾 + · 本行恢复默认——缓存开与 __noRenderCache 每步 #score 逐字节相同、增量拼接＝整份解析',
        bad.join(' | ') || A.hs.map(x => x.k + '=' + x.ret).join(' '));
      const bad2 = A.es.map((x, i) => { const y = B.es[i]; if (x.err || y.err) return x.k + ':' + (x.err || y.err);
        const ok = x.mode === y.mode && x.pv === y.pv && (x.mode === 'write' ? x.sc === y.sc : (x.n === y.n && x.wh === y.wh && x.visOk && x.all !== false)); return ok ? null : x.k + J({ pv: x.pv === y.pv, n: x.n + '/' + y.n, vis: x.visOk, all: x.all }); }).filter(Boolean);
      T(!bad2.length, 'PB17b 增量缓存（排版模式）：换页 · 页码顶部外侧 · 撤销 · 切换换页 · 纸张 A4 · 回书写——PV.content 与关缓存逐字节相同、页壳相同、可视页＝PV.cks 按页取舍的按序子序列、逐页滚到每页都是；回书写 #score 相同',
        bad2.join(' | ') || A.es.map(x => x.k + ':' + x.n + '页').join(' '));
    }

    /* ================= X MusicXML / .mtab / 粘贴 ================= */
    if (want('X')) {
      const A = await open(b);
      const r = await EV(A.pg, () => { const R = {};
        const chk = (x, idx) => { const d = new DOMParser().parseFromString(x, 'application/xml'); const parts = [...d.querySelectorAll('score-partwise > part')];
          return { parts: parts.length, all: d.querySelectorAll('print[new-page="yes"]').length, prints: d.querySelectorAll('print').length,
            ok: parts.every(p => { const ms = p.querySelectorAll(':scope > measure'); return idx.every(i => { const f = ms[i] && ms[i].firstElementChild; return f && f.tagName === 'print' && f.getAttribute('new-page') === 'yes'; }) && !ms[0].querySelector('print'); }) }; };
        { const s = __L60(); s.measures[12].pgbrk = 1; s.measures[36].pgbrk = 1; s.measures[0].pgbrk = 1; __ld(s); const x = exportMusicXML(song); R.l60 = chk(x, [12, 36]);
          const back = importMusicXML(x).song; R.rt = back.measures.map((m, i) => m.pgbrk === 1 ? i : -1).filter(i => i >= 0);
          const ms = x.replace(/<software>[^<]*<\/software>/, '<software>MuseScore 4.4.2</software>'); R.mscore = importMusicXML(ms).song.measures.filter(m => m.pgbrk).length;
          const ns = x.replace(/<encoding>[\s\S]*?<\/encoding>/, ''); R.nosw = importMusicXML(ns).song.measures.filter(m => m.pgbrk).length;
          R.sw = /<software>谱友圈/.test(x) && !/<software>/.test(ns); }
        { const s = __rep(PRESETS[8].make(), 3); s.measures[12].pgbrk = 1; __ld(s); const x = exportMusicXML(song); R.piano = chk(x, [12]);
          R.pianoStaves = /<staves>2<\/staves>/.test(x); R.pianoRt = importMusicXML(x).song.measures.map((m, i) => m.pgbrk === 1 ? i : -1).filter(i => i >= 0); }
        { const s = __rep(PRESETS[7].make(), 3); s.measures[9].pgbrk = 1; __ld(s); const x = exportMusicXML(song); R.tab = chk(x, [9]); }
        /* IO1 .mtab 往返 */
        { const s = __L60(); s.measures[12].pgbrk = 1; s.layout.pgno = { on: true, pos: 'to', start: 4, first: true }; __ld(s); const h0 = __h(__sc().innerHTML);
          const txt = JSON.stringify(song); __ld(__L60()); __ld(JSON.parse(txt));
          R.io1 = { pg: song.measures.map((m, i) => m.pgbrk === 1 ? i : -1).filter(i => i >= 0), pn: JSON.stringify(song.layout.pgno), same: __h(__sc().innerHTML) === h0, json: JSON.stringify(song) === txt }; }
        /* IO2 粘贴：覆盖粘贴保留目标自己的 pgbrk；源带 pgbrk 不随过去；插入粘贴的新小节不带；换页随原小节顺延 */
        { const s = __L60(); s.measures[12].pgbrk = 1; __ld(s);
          measureSel = 5; measureRange = null; copyMeasure(); measureSel = 12; pasteMeasure({ meter: false }); const a = song.measures[12].pgbrk;
          measureSel = 12; copyMeasure(); measureSel = 20; pasteMeasure({ meter: false }); const c = song.measures[20].pgbrk;
          measureSel = null; barSel = { L: 2, R: 3, row: 'tab', vi: 0 }; pasteMeasure(); barSel = null;
          R.io2 = { a, c, n: song.measures.length, at: song.measures.map((m, i) => m.pgbrk === 1 ? i : -1).filter(i => i >= 0), ins: song.measures[3].pgbrk };
          const g = __geo(); R.io2.rows = __rows(g).split(' ').filter(x => /:13-/.test(x)).join(); }
        return R; });
      if (r.err) T(false, 'X 取样', r.err);
      else {
        T(r.l60.ok && r.l60.parts === 2 && r.l60.all === 4 && r.l60.prints === 4 && r.piano.ok && r.piano.parts === 1 && r.piano.all === 1 && r.pianoStaves && r.tab.ok && r.tab.all === r.tab.parts,
          'MX2 导出：每个 <part> 第 13、37 个 <measure> 的第一个子元素都是 <print new-page="yes"/>（总数＝2×part 数）；第 1 小节没有；钢琴大谱表单 part 双谱表、TAB 独奏谱同样', J({ l60: r.l60, piano: r.piano, staves2: r.pianoStaves, tab: r.tab }));
        T(J(r.rt) === '[12,36]' && J(r.pianoRt) === '[12]', 'MX3 往返：importMusicXML(exportMusicXML(s)) 的 pgbrk 恰在 12、36（钢琴谱 12）', J({ rt: r.rt, piano: r.pianoRt }));
        T(r.sw && r.mscore === 0 && r.nosw === 0, 'MX4 第三方：<software> 换成 MuseScore 4.4.2 / 去掉 <software> 后导入都没有 pgbrk（别家自动翻页不钉进来）', J({ mscore: r.mscore, nosw: r.nosw }));
        T(J(r.io1.pg) === '[12]' && r.io1.pn === '{"on":true,"pos":"to","start":4,"first":true}' && r.io1.same && r.io1.json, 'IO1 .mtab 往返（JSON 存取 + 载入）：pgbrk 与 pgno 原样、#score 逐字节相同', J(r.io1));
        T(r.io2.a === 1 && r.io2.c === undefined && r.io2.n === 61 && J(r.io2.at) === '[13]' && r.io2.ins === undefined && /^1:13-/.test(r.io2.rows),
          'IO2 粘贴：覆盖粘贴保留目标小节自己的换页、带换页的源不把换页带到别的小节、插入粘贴的新小节不带；在前面插入后换页随原小节顺延到下标 13（第 2 页首行从它起）', J(r.io2));
      }
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= R 行级规则（两种外壳） ================= */
    if (want('R')) {
      for (const shell of ['flow', 'classic']) {
        const A = await open(b, { shell });
        const r = await EV(A.pg, () => { const R = {}; const fresh = f => { const s = __L60(); s.measures[12].pgbrk = 1; if (f) f(s); __ld(s); };
          fresh(); let j0 = JSON.stringify(song);
          R.pull = { ret: sysAct('pull', 8, 11), toast: __toast(), same: JSON.stringify(song) === j0 };
          meaHandleOn = true; render();
          { const g = [...__sc().querySelectorAll('g.sysbtn')]; const i = g.findIndex(x => x.getAttribute('data-sysact') === 'reset:8:11'); const pb = g[i + 1];
            R.btn = pb ? { act: pb.getAttribute('data-sysact'), op: pb.getAttribute('opacity'), tip: (pb.querySelector('title') || {}).textContent } : null;
            const q = g.findIndex(x => x.getAttribute('data-sysact') === 'reset:4:7'); R.btnOther = q >= 0 ? g[q + 1].getAttribute('data-sysact') : null; }
          meaHandleOn = false; render();
          R.brkAt = { ret: sysBreakAt(12), toast: __toast() };
          { const u0 = undoStack.length; const ret = sysBreakAt(14, 12); R.brkPin = { ret, b11: song.measures[11].brk, b13: song.measures[13].brk, undo: undoStack.length - u0 }; undo(); }
          { const ret = sysAct('reset', 12, 15); R.reset = { ret, pg: song.measures[12].pgbrk, toast: __toast() }; undo(); }
          { const ret = sysAct('reset', 4, 7); R.reset2 = { toast: __toast() }; undo(); }
          /* 锁行两端判定：行首是换页（上一小节没有 brk）也算强制断点 */
          fresh(s => { s.measures[13].pull = 1; s.measures[14].pull = 1; s.measures[15].pull = 1; s.measures[15].brk = 1; });
          R.locked = sysRowLocked(12, 15); R.lockedNo = sysRowLocked(8, 11);
          /* sysPageBreak：第 1 小节无效；切换；写入删 pull；一步撤销；重复设定不记撤销点 */
          fresh(s => { s.measures[24].pull = 1; }); j0 = JSON.stringify(song); const u0 = undoStack.length;
          R.pb0 = { ret: sysPageBreak(0), toast: __toast(), d: song.measures[0].pgbrk };
          const a = sysPageBreak(24); R.pbOn = { ret: a, v: song.measures[24].pgbrk, pull: song.measures[24].pull, toast: __toast(), undo: undoStack.length - u0, rows: __rows(__geo()) };
          R.pbAgain = { ret: sysPageBreak(24, true), undo: undoStack.length - u0 };
          undo(); R.pbUndo = JSON.stringify(song) === j0;
          sysPageBreak(24); const b2 = sysPageBreak(24); R.pbOff = { ret: b2, v: song.measures[24].pgbrk, toast: __toast() };
          /* 每行 −（push）：v68.5 收尾 UX-3 / REG-2——下一行行首是换页时拒绝（此前移出的小节落在换页之前单独成一行、留在本页，提示却说移到下一行）；
             谱面行尾「−」灰显、悬停说原因；别的行照常 */
          fresh(); j0 = JSON.stringify(song); const rows0 = __rows(__geo());
          R.push = { ret: sysAct('push', 8, 11), toast: __toast(), same: JSON.stringify(song) === j0, rows: __rows(__geo()), rows0 };
          R.push2 = { ret: sysAct('push', 4, 7) }; undo();
          meaHandleOn = true; render();
          { const g = [...__sc().querySelectorAll('g.sysbtn')]; const i = g.findIndex(x => x.getAttribute('data-sysact') === 'reset:8:11'); const pb = g[i + 2];
            R.pbtn = pb ? { act: pb.getAttribute('data-sysact'), op: pb.getAttribute('opacity'), tip: (pb.querySelector('title') || {}).textContent } : null;
            const q = g.findIndex(x => x.getAttribute('data-sysact') === 'reset:4:7'); R.pbtnOther = q >= 0 ? g[q + 2].getAttribute('data-sysact') : null; }
          meaHandleOn = false; render();
          return R; });
        if (r.err) { T(false, `R [${shell}] 取样`, r.err); }
        else {
          T(r.pull.ret === false && /下一行另起一页/.test(r.pull.toast) && r.pull.same, `R1 [${shell}] 下一行行首有换页：sysAct('pull') 拒绝、提示「下一行另起一页…」、数据不变`, J(r.pull));
          T(r.btn && r.btn.act === '' && r.btn.op === '0.3' && /下一行另起一页/.test(r.btn.tip) && /^pull:4:7$/.test(r.btnOther || ''), `R2 [${shell}] 谱面行尾「＋」（宽度手柄打开）：第 3 行灰显、data-sysact 为空、提示写原因；别的行照常`, J({ btn: r.btn, other: r.btnOther }));
          T(r.brkAt.ret === false && /第 13 小节起已另起一页/.test(r.brkAt.toast) && r.brkPin.ret === true && r.brkPin.b11 === undefined && r.brkPin.b13 === 1 && r.brkPin.undo === 1,
            `R3 [${shell}] 此处换行：在换页小节上拒绝并提示「第 13 小节起已另起一页」；行首是换页时只写新断点、不再给行首多写 brk`, J({ a: r.brkAt, b: r.brkPin }));
          T(r.reset.ret === true && r.reset.pg === 1 && /换页保留/.test(r.reset.toast) && !/换页保留/.test(r.reset2.toast), `R4 [${shell}] 本行恢复默认：保留换页、提示末尾加「（换页保留）」；行首没有换页的行提示照旧`, J({ a: r.reset, b: r.reset2 }));
          T(r.locked === true && r.lockedNo === false, `R5 [${shell}] 锁行判定：行首是换页（上一小节没有 brk）也算强制断点`, J({ locked: r.locked, other: r.lockedNo }));
          T(r.pb0.ret === false && /第 1 行本来就在第 1 页/.test(r.pb0.toast) && r.pb0.d === undefined && r.pbOn.ret === true && r.pbOn.v === 1 && r.pbOn.pull === undefined && r.pbOn.undo === 1 && /已从第 25 小节起另起一页/.test(r.pbOn.toast)
            && / 2:24-/.test(r.pbOn.rows) && r.pbAgain.ret === false && r.pbAgain.undo === 1 && r.pbUndo && r.pbOff.ret === true && r.pbOff.v === undefined && /已取消第 25 小节前的换页/.test(r.pbOff.toast),
            `R6 [${shell}] sysPageBreak：第 1 小节拒绝；切换写入 pgbrk=1 并删 pull、提示、一步撤销回原样；重复设定不记撤销点；再点取消`, J({ pb0: r.pb0, on: r.pbOn, again: r.pbAgain, undo: r.pbUndo, off: r.pbOff }).slice(0, 500));
          T(r.push && r.push.ret === false && /行尾小节移过去只会单独成行/.test(r.push.toast) && r.push.same && r.push.rows === r.push.rows0 && / 0:8-11 1:12-/.test(r.push.rows) && r.push2.ret === true
            && r.pbtn && r.pbtn.act === '' && r.pbtn.op === '0.3' && /下一行另起一页/.test(r.pbtn.tip || '') && /^push:4:7$/.test(r.pbtnOther || ''),
            `R7 [${shell}] 每行 −（收尾 UX-3 / REG-2）：下一行行首有换页时 sysAct('push') 拒绝、提示「…只会单独成行…」、数据与分页不变（不再出现第 12 小节孤立成行）；别的行照常；谱面行尾「−」灰显、悬停说原因`, J({ push: r.push, push2: r.push2, btn: r.pbtn, other: r.pbtnOther }));
        }
        allErrs.push(...A.errs); await A.close();
      }
    }

    /* ================= Q 收尾回归（验收发现 ENG-1 / ENG-3 / ENG-5 / REG-4）================= */
    if (want('Q')) {
      const A = await open(b);
      /* 页内：成品取样里第 p 页（p≥1）顶部页码字框底到本页墨迹顶的竖向净距（真实 getBoundingClientRect 折回谱面坐标；透明热区 / 页框 / 屏幕页码不算墨迹） */
      await EV(A.pg, () => { window.__topClear = () => { let out = null; withCleanSnap(() => { const sv = __sc(), g = PV_GEO, step = g.pgH + g.gap, M0 = sv.getScreenCTM().inverse();
          const pt = (x, y) => { const q = sv.createSVGPoint(); q.x = x; q.y = y; return q.matrixTransform(M0); };
          const ink = [...sv.querySelectorAll('text, path, line, circle, ellipse, polygon, polyline, rect, use')].filter(e => !e.closest('.pagebg, .pgfolio, .pageno, .pgbrk-mk, .sysbtn, title')
            && e.getAttribute('fill') !== 'transparent' && e.getAttribute('fill-opacity') !== '0' && e.getAttribute('opacity') !== '0' && !e.classList.contains('barzone') && !(e.tagName === 'text' && !e.textContent.trim()))
            .map(e => { const r = e.getBoundingClientRect(); if (!(r.width > 0 || r.height > 0)) return null; const a = pt(r.left, r.top), c = pt(r.right, r.bottom); return { y: a.y, y2: c.y, t: e.tagName + ':' + (e.textContent || '').slice(0, 8) }; }).filter(Boolean);
          const MM = PAGE_W / PAGE_MM[layoutCfg().page][0];
          out = { n: g.n, MM, pages: [...sv.querySelectorAll('.pgfolio')].map(f => { const bb = f.getBBox(), pg = Math.floor((+f.getAttribute('y') + 0.5) / step), top = pg * step;
            if (pg === 0) return null; const below = ink.filter(o => o.y >= top - 0.5 && o.y < top + g.pgH && o.y2 > bb.y + bb.height - 0.5).sort((a, b) => a.y - b.y)[0];
            return { pg, t: f.textContent, mm: below ? +((below.y - (bb.y + bb.height)) / MM).toFixed(2) : null, by: below && below.t }; }).filter(Boolean) }; }, { paging: true }); return out; }; });
      /* PN16（ENG-1）顶部外侧页码 vs 页首行真实上冒：简谱首行塞满上方记号（和弦 F♯m7♭5 + 延长号 + 颤音 + 高八度 2 + 排练号 + segno + 房子），三组纸张 / 疏密 / 内容大小 */
      { const res = await EV(A.pg, () => { const out = [];
          for (const [k, page, preset, scale] of [['J', 'A4', 'compact', 1], ['J', 'A5', 'compact', 1.2], ['J', 'A3', 'compact', 0.8], ['J', 'A4', 'standard', 1]]) {
            const s0 = __fill(NWB.build(k, { title: '上冒' + k, nMea: 8 })); __rep(s0, 5);
            s0.layout = { page, preset, fixed: true, scale, pgno: { on: true, pos: 'to', start: 1, first: true } }; s0.measures[13].pgbrk = 1; s0.measures[26].pgbrk = 1;
            __ld(JSON.parse(JSON.stringify(s0))); const g0 = __geo(); const firsts = new Set(); g0.rows.forEach((r, i) => { if (i > 0 && g0.rows[i - 1].pg !== r.pg) for (let m = r.m1; m <= r.m2; m++) firsts.add(m); });
            s0.measures.forEach((m, mi) => { if (!firsts.has(mi)) return; m.label = '副歌 B'; m.segno = true; m.volta = 1;
              ((m.voxes || [])[0] || []).forEach(c => { if (c) { c.chord = 'F#m7b5'; c.ferm = true; c.orn = 'tr'; c.oct = 2; c.dyn = 'ff'; } }); });
            __ld(s0); const r = __topClear(); out.push({ tag: [k, page, preset, scale].join('/'), n: r.n, min: Math.min(...r.pages.map(p => p.mm == null ? 99 : p.mm)), pages: r.pages, firsts: firsts.size }); }
          return out; });
        T(!res.err && res.every(x => x.pages.length >= 2 && x.min >= 1.98), 'PN16 顶部外侧页码与页首行真实墨迹（和弦框被延长号 / 高八度 / 颤音顶上去、排练号 / segno / 房子）竖向净距 ≥2mm（真实字框量，收尾 ENG-1：此前按「超出行顶 7」推算，J/A4/紧凑 实测 0.2mm）',
          res.err || res.map(x => x.tag + ' ' + x.n + '页 最小 ' + x.min + 'mm' + (x.min < 1.98 ? ' ✗' + J(x.pages.filter(p => p.mm < 1.98)) : '')).join(' · ')); }
      /* PN17（ENG-3）比一页还高 / 压进页码位置的行：底部页码＝那一页不印（行底越过页脚区上沿＝纸底−padBot），顶部页码＝它伸进去的下一页不印（行底越过纸底）；
         其余页照印，且印出来的页码字框与本页每行 [y0−7, y1+7] 不相交；版面检查对这些页有说明 */
      { const res = await EV(A.pg, () => { const out = {};
          for (const pos of ['bc', 'to']) {
            const s0 = __fill(NWB.build('SJG', { title: '跨页', nMea: 8, lyr: 3 })); __rep(s0, 3);
            s0.layout = { page: 'A5', preset: 'compact', fixed: true, scale: 1.4, pgno: { on: true, pos, start: 1, first: true } };
            s0.measures.forEach(m => (m.voxes || []).forEach(cols => (cols || []).forEach(c => { if (c) { c.oct = -2; c.lyrics = ['低', '低', '低']; } })));
            __ld(s0); const g = __geo(), step = g.step, MM = g.MM, padBot = Math.max(22, Math.round(7 * MM) + 13 + 7 + Math.round(2 * MM));
            const skip = new Set(); g.rows.forEach(r => { const pb = r.pg * step + g.pgH; if (pos === 'to') { if (r.y1 > pb + 0.5) skip.add(r.pg + 1); } else if (r.y1 > pb - padBot + 0.5) skip.add(r.pg); });
            const want = []; for (let p = 0; p < g.n; p++) if (!skip.has(p)) want.push(p);
            const hit = g.fol.filter(f => g.rows.some(r => r.pg === f.pg && !(f.bb.y2 < r.y0 - 7 || f.bb.y > r.y1 + 7))).map(f => f.pg);
            out[pos] = { n: g.n, skip: [...skip].filter(p => p < g.n), fol: g.fol.map(f => f.pg), want, hit, nf: PV_GEO.nf || [] }; }
          return out; });
        const ok = x => x && x.skip.length >= 1 && J(x.fol) === J(x.want) && !x.hit.length;
        T(!res.err && ok(res.bc) && ok(res.to), 'PN17 太高的行：底部页码在行底压进页脚区的那一页不印、顶部页码在跨页行伸进去的下一页不印，其余页照印且字框不碰任何行（收尾 ENG-3：此前页码压在谱线 / 歌词上）', J(res));
        await EV(A.pg, () => setMode('engrave')); await A.pg.waitForTimeout(1200);
        const rep = await EV(A.pg, () => { const R = FLOW.lay.report(); return { iss: (R && R.issues || []).filter(x => x.k === 'cross' || x.k === 'nofol').map(x => x.k + ':' + x.pg + ':' + x.t), nf: PV_GEO.nf || [] }; });
        await EV(A.pg, () => setMode('write')); await A.pg.waitForTimeout(300);
        T(!rep.err && rep.iss.length >= 1 && rep.iss.filter(t => /^cross/.test(t)).every(t => /跨页处不印页码/.test(t)) && rep.nf.every(p => rep.iss.some(t => { const q = +t.split(':')[1]; return q === p || q === p - 1; })),
          'PN17b 版面检查：跨页提示在印页码时补「跨页处不印页码」；没跨出纸但压到页码位置的页另报「这一页不印页码」——每个不印页码的页都有说明', J(rep)); }
      /* PB23（ENG-5）互动谱快照回退（FLOW.snapHTML，两种外壳）里 #score 不带书写模式的换页标记 */
      { const one = async pg => EV(pg, () => { const s = __L60(); s.measures[12].pgbrk = 1; s.measures[36].pgbrk = 1; __ld(s);
          const live = document.querySelectorAll('#score .pgbrk-mk').length;
          const d = new DOMParser().parseFromString(FLOW.snapHTML(), 'text/html'); const sc = d.getElementById('score');
          return { live, snap: sc ? sc.querySelectorAll('.pgbrk-mk').length : -1, bg: sc ? sc.querySelectorAll('.pagebg').length : -1, still: document.querySelectorAll('#score .pgbrk-mk').length }; });
        const C = await open(b, { shell: 'classic' });
        const f = await one(A.pg), c = await one(C.pg);
        T(!f.err && !c.err && [f, c].every(x => x.live === 2 && x.snap === 0 && x.bg >= 3 && x.still === 2), 'PB23 互动谱 DOM 快照回退（FLOW.snapHTML，新 / 旧外壳）：#score 里的 .pgbrk-mk 摘掉（页面上原样还在），谱面其余照旧（收尾 ENG-5）', J({ flow: f, classic: c }));
        allErrs.push(...C.errs); await C.close(); }
      /* PB24（REG-4）导入 / 新建面板的离屏预览卡：带页码的谱，.pgfolio 不显示（.nf-pgrid / .nw-mpv 与 .pagebg / .pageno 同口径） */
      { const r = await EV(A.pg, () => { const out = {};
          for (const cls of ['nf-pgrid', 'nw-mpv']) { const box = document.createElement('div'); box.className = cls; const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); box.appendChild(svg); document.body.appendChild(box);
            const s = __L60(); s.layout.pgno = { on: true, pos: 'to', start: 1, first: true }; NWPV.renderInto(svg, { song: s }, { paperW: 660 });
            const f = svg.querySelectorAll('.pgfolio'); out[cls] = { n: f.length, disp: [...f].map(e => getComputedStyle(e).display) }; box.remove(); }
          return out; });
        T(!r.err && ['nf-pgrid', 'nw-mpv'].every(k => r[k] && r[k].disp.every(d => d === 'none')) && r['nf-pgrid'].n >= 1, 'PB24 离屏预览卡（.nf-pgrid 导入预览 / .nw-mpv 新建面板）不显示成品页码 .pgfolio（收尾 REG-4；引擎照画，tv_pgbrk PN15 要它）', J(r)); }
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= K 旧版兼容（PB22） ================= */
    if (want('K')) {
      if (!REF) NOREF('PB22 旧版兼容');
      else {
        const R = await open(b, { url: REF });
        const r = await EV(R.pg, () => { const s = __L60(); s.measures[12].pgbrk = 1; s.layout.pgno = { on: true, pos: 'bo', start: 3, first: true }; __ld(s);
          layApply({ page: 'A5' }); const a = JSON.stringify(song.layout.pgno), pg = song.measures[12].pgbrk;
          try { document.getElementById('lp-reset') && document.getElementById('lp-reset').click(); } catch (_) {}
          return { a, pg, b: JSON.stringify(song.layout.pgno), n: PV_GEO.n }; });
        T(!r.err && !R.errs.length && r.a === '{"on":true,"pos":"bo","start":3,"first":true}' && r.pg === 1 && r.b === r.a, 'PB22 旧版兼容：v68.4 打开带 pgbrk / pgno 的谱不报错，改纸张（layApply）与「恢复默认」后 pgno、pgbrk 原样保留', J({ r, errs: R.errs.slice(0, 2) }));
        await R.close();
      }
    }
  } catch (e) { T(false, '套件异常', String(e && e.stack || e).slice(0, 400)); }
  console.log('\nPASS ' + pass + '/' + total + (fails.length ? '\n失败：' + fails.join(' | ') : ''));
  const real = allErrs.filter(e => !/^REF:/.test(e) && !/ResizeObserver/.test(e));
  console.log(real.length ? 'ERRORS:\n' + real.slice(0, 10).join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !real.length ? 0 : 1);
})();
