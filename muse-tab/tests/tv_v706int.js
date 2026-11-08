'use strict';
/* v70.6 集成接缝：tv_v706int（规格 docs/spec-2026-11-v705.md §12；录入组 × 刻版组 × v70.5 导入的交界）。
   file:// 直载，真实浏览器（Playwright chromium，CHROMIUM_PATH）；新外壳 1280 为主，旧外壳 / ?next=0 验回落。
   N  录入组「新建第二声部」产出的层在刻版组叠放下画对（新外壳）
      N1 新建后整行隐形休止：layerDrawOk [0,1]；#score 层与宿主同一谱表底线、谱线数不变；层上没有 rest / head（hid 不画）；宿主符干方向与符头 y＝新建前（单声部小节）
      N2 键盘在层上写「音 · 休止 · 音 · 音」（Ctrl+Alt+2 已在层上，时值键 e＋数字，0＝休止）：两声部小节宿主符干朝上、层朝下；层休止 p 为整数且 ≤−4；
         第 2 小节层仍整小节隐形 → 宿主符干＝新建前；层与宿主同拍符头 |Δx|≤0.5（三度以上）
      N3 分层钢琴：导入 F03（右手 / 左手、花括号）后两手各「新建第二声部」——layerDrawOk [0,1,0,1]、只 1 个花括号且跨 2 张物理谱表；组撑到层（左手是组末）；
         旧外壳打开同一份谱：4 张谱表、花括号跨 4 行
      N4 撤销 / 重做：新建第二声部一步撤销（JSON＝新建前、离屏谱面＝新建前），重做（JSON、离屏谱面＝新建后）；层上写的音撤销一步、重做一步 JSON 相等
      N5 拆成独立一行：layerDrawOk null、层回到独立谱表（谱表底线不同）；数据＝剥掉层标记的同一份谱（voxLayer / 见证 / hid 全删）且离屏谱面逐字节相同；撤销回叠放、重做再拆
      N6 列热区：叠放后宿主 / 层同一列的热区上下分开（不重叠），鼠标点上半＝宿主、下半＝层（刻版组交接项）
      N7 谱号接缝：宿主小节中换谱号 → 「新建第二声部」→ 层上按全音符写音不超拍（只带谱号副本的隐形休止可被吸收，副本挪到其后第一列）；
         层的谱号副本不落在宿主换谱号起拍上时，层与宿主同拍符头仍对齐（vlLayClef：叠放的层按宿主换谱号让位）
   I  v70.5 导入的分层夹具（fixtures/v705 里带 voxLayer 的全部，≥20 份）：新外壳叠放（每对每小节谱表底线相同、hid 列没有 rest）；
      ?shell=classic 与 ?next=0 回落（layerDrawOk null、层自带谱表）；其中 8 份（F01 F04 F05 F09 F12 F23 F24 F27）离屏谱面在 classic / ?next=0 下＝7af5743
      （取不到基线页时比 fixtures/v706_ref_snap.json 的 int 段；node tv_v706int.js --write-snap 用基线页重写）
   E  页面脚本错误 0
   env：MUSETAB_URL 被测页（缺省 ../index.html）· V706_REF 基线页（缺省 git show 7af5743）· V706_NOREF=1 模拟 CI 取不到基线（走快照）· ONLY=N,I */
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const SNAPM = require('./v706_snap.js');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const WSNAP = process.argv.includes('--write-snap');
const ONLY = WSNAP ? ['I'] : (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const REF_COMMIT = SNAPM.REF;
const SNAP = WSNAP ? null : SNAPM.section('int');
const H1 = SNAPM.H1;
let pass = 0, total = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name.split(' ')[0]); console.log((ok ? '✅' : '❌') + ' ' + name + (d != null && !ok ? '：' + String(d).slice(0, 1600) : '')); };
const J = x => JSON.stringify(x);
const SG = 7.5;
const FXD = path.join(__dirname, 'fixtures', 'v705');
const FX = n => fs.readFileSync(path.join(FXD, n + '.musicxml'), 'utf8');
const refUrl = () => {
  if (process.env.V706_NOREF) return null;
  if (process.env.V706_REF) return toUrl(process.env.V706_REF);
  try { const t = path.join(os.tmpdir(), 'v706_ref_' + REF_COMMIT + '.html');
    if (!fs.existsSync(t) || fs.statSync(t).size < 1e5) { const x = t + '.' + process.pid; fs.writeFileSync(x, execFileSync('git', ['-C', path.resolve(__dirname, '..', '..'), 'show', REF_COMMIT + ':muse-tab/index.html'], { maxBuffer: 1 << 28 })); fs.renameSync(x, t); }
    return 'file://' + t; } catch (_) { return null; }
};

/* 页内助手：__ld 载入（清撤销栈）· __off 离屏 SVG 文本 · __geo 离屏几何（data-g 叶子元素的谱面坐标；sb＝列热区 data-staffb）· __scr #score 摘要 */
const PAGE_INIT = () => {
  window.SF_PLAYWAIT = false; window.guardReplace = p => p();
  try { hideStartPad(); } catch (_) {} try { const t = document.querySelector('#flw-tour'); if (t) t.remove(); } catch (_) {}
  window.__C = (deg, dur, x) => Object.assign({ dur: dur || 4, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, x || {});
  window.__ld = s => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    undoStack.length = 0; redoStack.length = 0; loadSong(migrate(JSON.parse(JSON.stringify(s))));
    sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; clampSel(); selRange = null; noteSel = []; measureSel = null; measureRange = null; blurSel = false; render(); return true; };
  window.__S = () => JSON.parse(JSON.stringify(song));
  window.__strip = s => { s = JSON.parse(JSON.stringify(s)); delete s.voxLayer; Object.values(s.mixer || {}).forEach(e => { if (e && typeof e === 'object') delete e.lay; });
    (s.measures || []).forEach(m => ((m && m.voxes) || []).forEach(r => (r || []).forEach(c => { if (c) delete c.hid; }))); return s; };
  window.__canon = x => { const f = v => Array.isArray(v) ? v.map(f) : (v && typeof v === 'object') ? Object.fromEntries(Object.keys(v).sort().map(k => [k, f(v[k])])) : v; return JSON.stringify(f(x)); };
  window.__off = s => { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(svg); let h = null;
    try { renderOffscreen({ song: migrate(JSON.parse(JSON.stringify(s))), target: svg, paperW: 870, crop: true }); h = svg.innerHTML; } finally { svg.remove(); } return h; };
  window.__geo = s => {
    const NS = 'http://www.w3.org/2000/svg', host = document.createElement('div'); host.style.cssText = 'position:absolute;left:-30000px;top:0;width:4000px';
    const svg = document.createElementNS(NS, 'svg'); host.appendChild(svg); document.body.appendChild(host);
    window.__pyqGeom = true;
    try { renderOffscreen({ song: migrate(JSON.parse(JSON.stringify(s))), target: svg, paperW: 870, crop: true }); } finally { window.__pyqGeom = false; }
    const vb = svg.viewBox.baseVal; svg.setAttribute('width', vb.width); svg.setAttribute('height', vb.height);
    const inv = svg.getScreenCTM().inverse(), items = [];
    svg.querySelectorAll('[data-g]').forEach(el => { const tg = el.tagName.toLowerCase(); if (tg === 'g' || tg === 'title') return;
      const b = el.getBBox(), M = inv.multiply(el.getScreenCTM());
      const P = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(M));
      const [vi, mi, ci] = (el.getAttribute('data-gq') || '').split(':').map(Number);
      const o = { g: el.getAttribute('data-g'), vi, mi, ci, box: [Math.min(...P.map(p => p.x)), Math.min(...P.map(p => p.y)), Math.max(...P.map(p => p.x)), Math.max(...P.map(p => p.y))] };
      const tr = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\)/.exec(el.getAttribute('transform') || ''); if (tr) o.tr = [+tr[1], +tr[2]];
      if (tg === 'line') o.ln = ['x1', 'y1', 'x2', 'y2'].map(k => +el.getAttribute(k));
      items.push(o); });
    const sb = {}; svg.querySelectorAll('rect[data-row="vox"][data-staffb]').forEach(q => { const k = q.getAttribute('data-vi') + ':' + q.getAttribute('data-mi'); if (sb[k] == null) sb[k] = +q.getAttribute('data-staffb'); });
    const out = { items, sb, braces: svg.querySelectorAll('[data-g="brace"]').length, bracePath: [...svg.querySelectorAll('[data-g="brace"]')].map(e => { const r = e.getBBox(); const M = inv.multiply(e.getScreenCTM());
      const a = new DOMPoint(r.x, r.y).matrixTransform(M), z = new DOMPoint(r.x + r.width, r.y + r.height).matrixTransform(M); return [Math.min(a.y, z.y), Math.max(a.y, z.y)]; }) };
    host.remove(); return out; };
  window.__scr = () => { const sc = document.getElementById('score'), sb = {};
    sc.querySelectorAll('rect[data-row="vox"][data-staffb]').forEach(q => { const k = q.getAttribute('data-vi') + ':' + q.getAttribute('data-mi'); if (sb[k] == null) sb[k] = +q.getAttribute('data-staffb'); });
    return { sb, lines: (sc.innerHTML.match(/stroke-width="0\.8"\/?>/g) || []).length }; };
  return true;
};
async function open(b, url, q, w) {
  const ctx = await b.newContext({ viewport: { width: w || 1280, height: 900 } });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.dismiss().catch(() => {}));
  await pg.goto(withQ(url, q || 'x=1'));
  await pg.waitForFunction(() => typeof importMusicXML === 'function' && typeof loadSong === 'function' && document.readyState === 'complete', null, { timeout: 30000 });
  await pg.waitForTimeout(300);
  await pg.evaluate(PAGE_INIT);
  return { ctx, pg, errs };
}
const EV = (pg, fn, arg) => pg.evaluate(fn, arg).catch(e => ({ err: String(e.message || e).slice(0, 400) }));
const wait = (pg, ms) => pg.waitForTimeout(ms);
const toBody = pg => pg.evaluate(() => { const ae = document.activeElement; if (ae && ae !== document.body && ae.blur) ae.blur(); try { closePop(); } catch (_) {} try { FLOW.menu.close(); } catch (_) {} return true; });
/* 几何小工具（Node 端） */
const of = (G, g, vi, mi, ci) => G.items.filter(o => o.g === g && o.vi === vi && o.mi === mi && (ci === undefined || o.ci === ci));
const stems = (G, vi, mi) => of(G, 'stem', vi, mi).filter(o => o.ln).map(o => ({ ci: o.ci, up: o.ln[3] < o.ln[1] }));
const heads = (G, vi, mi) => of(G, 'head', vi, mi).map(o => ({ ci: o.ci, x: (o.box[0] + o.box[2]) / 2, y: +((o.box[1] + o.box[3]) / 2).toFixed(2) }));
const pOf = (G, o, h) => (((G.sb[h + ':' + o.mi]) - 2 * SG) - o.tr[1]) / (SG / 2);
const LAYFX = fs.readdirSync(FXD).filter(f => /\.musicxml$/.test(f)).map(f => f.replace('.musicxml', '')).sort();
const REF8 = ['F01', 'F04', 'F05', 'F09', 'F12', 'F23', 'F24', 'F27'];

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const allErrs = [], ctxs = [];
  const keep = A => { ctxs.push(A); allErrs.push(A.errs); return A; };
  try {
    const A = keep(await open(b, URL0, 'x=1')), P = A.pg;

    /* ================= N：新建第二声部 × 叠放 ================= */
    if (want('N')) {
      /* N1 */
      const s0 = await EV(P, () => { const s = createSong('instr', { nMea: 2, beats: 4, unit: 4, nVox: 1 }); s.title = '接缝';
        const C = window.__C; s.measures[0].voxes[0] = [C(5, 4), C(4, 4), C(3, 4), C(2, 4)]; s.measures[1].voxes[0] = [C(1, 2), C(5, 2)]; return s; });
      await EV(P, s => window.__ld(s), s0);
      const n1 = await EV(P, () => { const o = {}; o.J0 = JSON.stringify(song); o.g0 = window.__geo(song); o.off0 = window.__off(song); o.scr0 = window.__scr();
        o.at = voxLayerNew(0); o.J1 = JSON.stringify(song); o.draw = layerDrawOk(song); o.scr1 = window.__scr(); o.g1 = window.__geo(song); o.off1 = window.__off(song);
        o.sel = [sel.vi, sel.mi, sel.ci]; o.lay = song.measures.map(m => m.voxes[1].map(c => (c.hid === 1 ? 'h' : c.deg) + '/' + c.dur).join(' ')); return o; });
      if (n1.err) T(false, 'N1 运行', n1.err);
      else {
        const sameSb = [0, 1].every(mi => n1.scr1.sb['0:' + mi] != null && n1.scr1.sb['0:' + mi] === n1.scr1.sb['1:' + mi]);
        const noInk = !n1.g1.items.some(o => o.vi === 1 && (o.g === 'rest' || o.g === 'head' || o.g === 'stem'));
        const st = [0, 1].every(mi => J(stems(n1.g1, 0, mi)) === J(stems(n1.g0, 0, mi)) && J(heads(n1.g1, 0, mi).map(h => h.y)) === J(heads(n1.g0, 0, mi).map(h => h.y)));
        T(n1.at === 1 && J(n1.draw) === '[0,1]' && sameSb && n1.scr1.lines === n1.scr0.lines && noInk && st && J(n1.sel) === '[1,0,0]',
          'N1 新建第二声部（整行隐形休止）：layerDrawOk [0,1]；#score 层与宿主同一谱表底线、谱线数不变；层上没有 rest / head / stem；宿主符干方向与符头 y＝新建前；光标落到层',
          J({ at: n1.at, draw: n1.draw, sb: n1.scr1.sb, lines: [n1.scr0.lines, n1.scr1.lines], noInk, st, sel: n1.sel, lay: n1.lay }));
        /* N2 键盘写层 */
        await toBody(P);
        for (const k of ['e', '1', '0', '1', '2']) { await P.keyboard.press(k); await wait(P, 40); }
        const n2 = await EV(P, () => ({ lay: song.measures.map(m => m.voxes[1].map(c => (c.hid === 1 ? 'h' : c.deg) + '/' + c.dur).join(' ')), g: window.__geo(song), scr: window.__scr(), J2: JSON.stringify(song) }));
        if (n2.err) T(false, 'N2 运行', n2.err);
        else {
          const G = n2.g, up0 = stems(G, 0, 0), dn0 = stems(G, 1, 0);
          const rs = of(G, 'rest', 1, 0).filter(o => o.tr), p = rs.map(o => pOf(G, o, 0));
          const hx = heads(G, 0, 0), lx = heads(G, 1, 0);
          const al = lx.every(l => { const h = hx.find(x => x.ci === l.ci); return h && Math.abs(h.x - l.x) <= 0.5; });   /* 层与宿主同为四分、同列号＝同起拍；音程都是三度以上（5/1、3/1、2/2 同度共用除外） */
          T(n2.lay[0] === '1/4 0/4 1/4 2/4' && /^h/.test(n2.lay[1]) && up0.length === 4 && up0.every(x => x.up) && dn0.length >= 2 && dn0.every(x => !x.up)
            && rs.length === 1 && p.every(v => Math.abs(v - Math.round(v)) < 0.02 && v <= -4)
            && J(stems(G, 0, 1)) === J(stems(n1.g0, 0, 1)) && n2.scr.sb['0:0'] === n2.scr.sb['1:0'] && al,
            'N2 键盘在层上写「1 · 0 · 1 · 2」（时值键 e）：两声部小节宿主符干朝上、层朝下；层休止 p 为整数且 ≤−4；第 2 小节层仍隐形 → 宿主符干＝新建前；层与宿主同列符头 |Δx|≤0.5',
            J({ lay: n2.lay, up0, dn0, p, m1: [stems(G, 0, 1), stems(n1.g0, 0, 1)], sb: n2.scr.sb, hx, lx }));
          /* N4 撤销 / 重做（先撤层上写的 5 步，再撤新建） */
          const n4 = await EV(P, ({ J0, J1, J2, off0, off1 }) => { const o = {};
            undo(); o.u1 = JSON.stringify(song) !== J2; redo(); o.r1 = JSON.stringify(song) === J2;
            for (let i = 0; i < 20 && JSON.stringify(song) !== J1; i++) undo();
            o.atJ1 = JSON.stringify(song) === J1; o.offJ1 = window.__off(song) === off1;
            undo(); o.atJ0 = JSON.stringify(song) === J0; o.offJ0 = window.__off(song) === off0; o.draw0 = layerDrawOk(song);
            redo(); o.reJ1 = JSON.stringify(song) === J1; o.reOff1 = window.__off(song) === off1; o.draw1 = layerDrawOk(song);
            for (let i = 0; i < 20 && JSON.stringify(song) !== J2; i++) redo(); o.reJ2 = JSON.stringify(song) === J2; return o; }, { J0: n1.J0, J1: n1.J1, J2: n2.J2, off0: n1.off0, off1: n1.off1 });
          T(!n4.err && n4.u1 && n4.r1 && n4.atJ1 && n4.offJ1 && n4.atJ0 && n4.offJ0 && n4.draw0 === null && n4.reJ1 && n4.reOff1 && J(n4.draw1) === '[0,1]' && n4.reJ2,
            'N4 撤销 / 重做：层上写音撤一步、重做一步 JSON 相等；新建第二声部一步撤销（JSON 与离屏谱面＝新建前、不叠放），重做（JSON 与离屏谱面＝新建后、叠放）', J(n4));
          /* N6 列热区（#score，叠放） */
          await EV(P, () => { render(); return 1; });
          const hz = await EV(P, () => { const r = vi => { const e = document.querySelector('#score rect[data-row="vox"][data-vi="' + vi + '"][data-mi="0"][data-ci="2"]:not([data-zone])'); if (!e) return null; const q = e.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom]; };
            return { h: r(0), l: r(1) }; });
          let n6 = { hz };
          if (hz && hz.h && hz.l) {
            await P.evaluate(() => window.scrollTo(0, 0));
            const H = await EV(P, () => { const e = document.querySelector('#score rect[data-row="vox"][data-vi="0"][data-mi="0"][data-ci="2"]:not([data-zone])'); e.scrollIntoView({ block: 'center' }); const q = e.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom]; });
            const L = await EV(P, () => { const e = document.querySelector('#score rect[data-row="vox"][data-vi="1"][data-mi="0"][data-ci="2"]:not([data-zone])'); const q = e.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom]; });
            await P.mouse.click((H[0] + H[2]) / 2, (H[1] + H[3]) / 2); await wait(P, 80);
            n6.ch = await EV(P, () => [sel.row, sel.vi, sel.mi, sel.ci]);
            await P.mouse.click((L[0] + L[2]) / 2, (L[1] + L[3]) / 2); await wait(P, 80);
            n6.cl = await EV(P, () => [sel.row, sel.vi, sel.mi, sel.ci]);
            n6.H = H; n6.L = L;
          }
          T(!!(n6.H && n6.L) && (n6.H[3] <= n6.L[1] + 0.5 || n6.L[3] <= n6.H[1] + 0.5) && J(n6.ch) === J(['vox', 0, 0, 2]) && J(n6.cl) === J(['vox', 1, 0, 2]),
            'N6 列热区：叠放后宿主 / 层同一列热区上下分开不重叠；点宿主那半＝光标到宿主、点层那半＝光标到层（同列）', J(n6));
          /* N5 拆成独立一行 */
          const n5 = await EV(P, () => { const o = {}; const before = window.__S(); o.Jb = JSON.stringify(song);
            o.ok = voxLayerSplit(1); o.draw = layerDrawOk(song); o.scr = window.__scr();
            o.dataEq = window.__canon(window.__S()) === window.__canon(window.__strip(before));
            o.offEq = window.__off(song) === window.__off(window.__strip(before)); o.vl = song.voxLayer === undefined; o.lay = Object.values(song.mixer || {}).some(e => e && e.lay);
            o.hid = song.measures.some(m => m.voxes.some(r => r.some(c => 'hid' in c)));
            const Js = JSON.stringify(song); undo(); o.uJ = JSON.stringify(song) === o.Jb; o.uDraw = layerDrawOk(song); o.uScr = window.__scr();
            redo(); o.rJ = JSON.stringify(song) === Js; o.rDraw = layerDrawOk(song); return o; });
          T(!n5.err && n5.ok === true && n5.draw === null && n5.scr.sb['0:0'] !== n5.scr.sb['1:0'] && n5.dataEq && n5.offEq && n5.vl && !n5.lay && !n5.hid
            && n5.uJ && J(n5.uDraw) === '[0,1]' && n5.uScr.sb['0:0'] === n5.uScr.sb['1:0'] && n5.rJ && n5.rDraw === null,
            'N5 拆成独立一行：不叠放、层回到独立谱表；数据＝剥掉层标记的同一份谱（voxLayer / 见证 / hid 全删）且离屏谱面逐字节相同；撤销回叠放、重做再拆', J(Object.assign({}, n5, { Jb: undefined })));
        }
      }
      /* N3 分层钢琴：F03（右手 / 左手）两手各新建第二声部 */
      const n3 = await EV(P, x => { const s = importMusicXML(x).song; window.__ld(s); const o = { vv0: song.voxVoices.slice(), g0: J => 0 };
        const G0 = window.__geo(song); o.br0 = [G0.braces, G0.bracePath];
        o.a = voxLayerNew(1); o.b = voxLayerNew(0); o.vv = song.voxVoices.slice(); o.draw = layerDrawOk(song); o.vl = song.voxLayer;
        o.grp = JSON.parse(JSON.stringify(song.voxGroups || song.groups || null)); const G = window.__geo(song);
        o.braces = G.braces; o.bp = G.bracePath; o.sb = G.sb; o.J = JSON.stringify(song); return o; }, FX('F03'));
      if (n3.err) T(false, 'N3 运行', n3.err);
      else {
        const span = n3.sb['2:0'] - (n3.sb['0:0'] - 4 * SG), bh = n3.bp[0] ? n3.bp[0][1] - n3.bp[0][0] : -1;
        const C = keep(await open(b, URL0, 'shell=classic'));
        const cl = await EV(C.pg, J0 => { window.__ld(JSON.parse(J0)); const G = window.__geo(song); return { draw: layerDrawOk(song), braces: G.braces, bp: G.bracePath, sb: G.sb }; }, n3.J);
        const spanC = cl.sb ? cl.sb['3:0'] - (cl.sb['0:0'] - 4 * SG) : 0, bhC = cl.bp && cl.bp[0] ? cl.bp[0][1] - cl.bp[0][0] : -1;
        T(n3.a === 2 && n3.b === 1 && J(n3.draw) === '[0,1,0,1]' && n3.braces === 1 && Math.abs(bh - span) <= 3 && n3.sb['0:0'] === n3.sb['1:0'] && n3.sb['2:0'] === n3.sb['3:0']
          && !cl.err && cl.draw === null && cl.braces === 1 && Math.abs(bhC - spanC) <= 3 && new Set([0, 1, 2, 3].map(i => cl.sb[i + ':0'])).size === 4,
          'N3 分层钢琴（F03 两手各新建第二声部）：layerDrawOk [0,1,0,1]、1 个花括号跨 2 张物理谱表（左手是组末，组撑到层）；旧外壳同一份谱 4 张谱表、花括号跨 4 行',
          J({ a: n3.a, b: n3.b, vv: n3.vv, draw: n3.draw, braces: n3.braces, bh, span, sb: n3.sb, classic: { draw: cl.draw, braces: cl.braces, bhC, spanC, sb: cl.sb, err: cl.err } }));
      }
      /* N7 谱号接缝 */
      const n7 = await EV(P, () => { const C = window.__C, o = {};
        const s = createSong('instr', { nMea: 2, beats: 4, unit: 4, nVox: 1 }); s.measures[0].voxes[0] = [C(5, 4), C(5, 4), C(3, 4, { clef: 'bass', oct: -1 }), C(3, 4, { oct: -1 })];
        s.measures[1].voxes[0] = [C(1, 2, { oct: -1 }), C(5, 2, { oct: -1 })];
        window.__ld(s); voxLayerNew(0);
        o.copy = song.measures[0].voxes[1].map(c => c.clef || '');
        sel = { mi: 0, row: 'vox', vi: 1, ci: 0, si: 1 }; render(); return o; });
      await toBody(P);
      for (const k of ['q', '1']) { await P.keyboard.press(k); await wait(P, 40); }
      const n7b = await EV(P, () => { const u = meaMeter(0).unit; const o = {};
        o.beats = song.measures[0].voxes[1].reduce((a, c) => a + beatsOf(c, u), 0); o.lay = song.measures[0].voxes[1].map(c => (c.hid === 1 ? 'h' : c.deg) + '/' + c.dur + (c.clef ? '@' + c.clef : ''));
        /* 层 [四分, 二分, 四分]，谱号副本在第 3 列（起拍 3 拍）而宿主换谱号在起拍 2 拍：同拍符头仍对齐 */
        const C = window.__C, s = window.__S(); s.measures[0].voxes[1] = [C(1, 4), C(1, 2), C(1, 4, { clef: 'bass', oct: -1 })];
        const G = window.__geo(s); const hd = (vi, ci) => { const e = G.items.find(q => q.g === 'head' && q.vi === vi && q.mi === 0 && q.ci === ci); return e ? (e.box[0] + e.box[2]) / 2 : null; };
        o.x = { h0: hd(0, 0), l0: hd(1, 0), h1: hd(0, 1), l1: hd(1, 1), h3: hd(0, 3), l2: hd(1, 2) }; return o; });
      T(!n7.err && !n7b.err && J(n7.copy) === J(['', '', 'bass', '']) && Math.abs(n7b.beats - 4) < 1e-6 && J(n7b.lay) === J(['1/1'])
        && [['h0', 'l0'], ['h1', 'l1'], ['h3', 'l2']].every(([a, c]) => n7b.x[a] != null && n7b.x[c] != null && Math.abs(n7b.x[a] - n7b.x[c]) <= 0.5),
        'N7 谱号接缝：宿主小节中换谱号 → 新建第二声部（副本落在起拍 2 拍的隐形休止）→ 层上写全音符不超拍（吸收带副本的隐形休止）；层副本不在宿主换谱号起拍上时同拍符头仍对齐',
        J({ copy: n7.copy, b: n7b }));
    }

    /* ================= I：v70.5 导入的分层夹具 ================= */
    if (want('I')) {
      const imp = await EV(P, L => L.map(([n, x]) => [n, JSON.parse(JSON.stringify(importMusicXML(x).song))]), LAYFX.map(n => [n, FX(n)]));
      if (imp.err) T(false, 'I 导入', imp.err);
      else {
        const LAY = imp.filter(([, s]) => Array.isArray(s.voxLayer) && s.voxLayer.some(x => x === 1));
        const chk = async (pg) => EV(pg, L => L.map(([n, s]) => { const S = migrate(JSON.parse(JSON.stringify(s))); const G = window.__geo(S), L2 = PQ_KIND.voxLayerOk(S);
          const pairs = []; (L2 || []).forEach((v, i) => { if (v) pairs.push([i - 1, i]); });
          const nm = S.measures.length, same = pairs.every(([h, l]) => Array.from({ length: nm }, (_, mi) => mi).every(mi => G.sb[h + ':' + mi] == null || G.sb[h + ':' + mi] === G.sb[l + ':' + mi]));
          const own = pairs.every(([h, l]) => Array.from({ length: nm }, (_, mi) => mi).every(mi => G.sb[h + ':' + mi] == null || G.sb[h + ':' + mi] !== G.sb[l + ':' + mi]));
          const hidInk = pairs.some(([, l]) => G.items.some(o => o.vi === l && (o.g === 'rest' || o.g === 'head') && ((S.measures[o.mi] || {}).voxes || [])[l] && (S.measures[o.mi].voxes[l][o.ci] || {}).hid === 1));
          return { n, draw: layerDrawOk(S), pairs: pairs.length, same, own, hidInk }; }), LAY);
        const rf = await chk(P);
        const cls = {};
        for (const [k, q] of [['classic', 'shell=classic'], ['next0', 'next=0']]) { const Q = keep(await open(b, URL0, q)); cls[k] = await chk(Q.pg); }
        const badF = Array.isArray(rf) ? rf.filter(r => !(r.draw && r.pairs > 0 && r.same && !r.hidInk)).map(r => r.n) : ['运行失败 ' + J(rf).slice(0, 200)];
        T(LAY.length >= 20 && !badF.length, 'I1 新外壳：v70.5 导入的 ' + LAY.length + ' 份分层夹具全部叠放（每对每小节谱表底线相同、hid 列没有 rest / head）', badF.join(' ') + ' ' + J((rf || []).filter && rf.filter(r => badF.includes(r.n))).slice(0, 600));
        const badC = ['classic', 'next0'].flatMap(k => Array.isArray(cls[k]) ? cls[k].filter(r => !(r.draw === null && r.own)).map(r => k + ':' + r.n) : [k + ' 运行失败']);
        T(!badC.length, 'I2 ?shell=classic 与 ?next=0：同 ' + LAY.length + ' 份回落（layerDrawOk null、层自带谱表）', badC.join(' '));
        /* I3 8 份与 v70.5 逐字节（离屏谱面） */
        const IS = SNAP && SNAP.songs ? SNAP : null;
        const smp = IS ? REF8.map(n => [n, IS.songs[n]]) : REF8.map(n => [n, (LAY.find(x => x[0] === n) || [])[1]]);
        const hashRun = async (url, q) => { const Q = await open(b, url, q); const o = {};
          for (const [n, s] of smp) { const x = await EV(Q.pg, s => window.__off(s), s); o[n] = typeof x === 'string' ? H1(x) + ':' + x.length : 'ERR ' + J(x).slice(0, 80); }
          allErrs.push(Q.errs); await Q.ctx.close(); return o; };
        const ru = refUrl(); let RH = null, src = '';
        if (ru) { RH = { classic: await hashRun(ru, 'shell=classic'), next0: await hashRun(ru, 'next=0') }; src = REF_COMMIT; }
        else if (IS) { RH = IS.h; src = REF_COMMIT + '（快照）'; }
        if (WSNAP) {
          if (!RH || !ru) throw new Error('--write-snap：基线页取不到');
          SNAPM.save('int', { songs: Object.fromEntries(smp), h: RH }); console.log('→ ' + SNAPM.FILE + '（int 段）');
        } else if (!RH) T(false, 'I3 基线页取不到（git show ' + REF_COMMIT + '），也没有快照 int 段');
        else {
          const cur = { classic: await hashRun(URL0, 'shell=classic'), next0: await hashRun(URL0, 'next=0') };
          const bad = ['classic', 'next0'].flatMap(k => REF8.filter(n => cur[k][n] !== RH[k][n]).map(n => k + ':' + n + ' ' + cur[k][n] + ' / ' + RH[k][n]));
          T(!bad.length && smp.every(x => x[1]), 'I3 ' + REF8.join(' ') + ' 在 ?shell=classic 与 ?next=0 下离屏谱面＝' + src + '（回落形态逐字节）', bad.join(' | '));
        }
      }
    }
  } catch (e) { T(false, 'RUN 运行异常', String(e && e.stack || e).slice(0, 800)); }
  const errs = allErrs.flat().filter(Boolean);
  if (!WSNAP) T(errs.length === 0, 'E 页面脚本错误 0', errs.slice(0, 5).join(' | '));
  for (const c of ctxs) { try { await c.ctx.close(); } catch (_) {} }
  await b.close();
  console.log('\nPASS ' + pass + '/' + total + (fails.length ? '；失败：' + fails.join(' ') : ''));
  process.exit(fails.length ? 1 : 0);
})();
