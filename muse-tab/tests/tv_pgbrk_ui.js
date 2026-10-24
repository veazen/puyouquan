'use strict';
/* v68.5 B 轨（界面）：「此处换页」与「页头 · 页码」的界面断言（规格 §10 / §12.1 U1–U12 的界面部分，另加本轨 U13–U16）。几何断言优先、真实点击 / 按键，file:// 直载。
   夹具 L45：示例曲谱第 1 首（小星星，15 小节）接 3 遍＝45 小节、layout {fixed:true}；1440×900 A4 基线 3 页、每行 4 小节（行首 0 4 8 12 16 …）。
   引擎（A 轨：分页遵守 measures[].pgbrk、印页码、换页标记）在不在被测页里：载入后探一次（第 15 小节临时设 pgbrk，分页口径 layoutSystems 有一行从 15 起＝在）；
   只依赖引擎的断言（版面检查里的页号、第 2 页首行、单行页提示抑制、两端钉住不多写 brk）v68.5 集成后引擎已在主线：缺省即判红（引擎不在＝回归）；只有 NEED_ENGINE=0 时才退回「跳过（引擎未合入）」（单测 B 轨旧分支用）。
   U1  1440 排版：工具组 #flw-eng-pbrk 可见、不带「即将推出」；光标在第 1 行时 aria-disabled，原因「第 1 行本来就在第 1 页」（真实点击 toast 同一句，不改谱）；换到第 4 行可点
   U2  第 4 行（行首第 13 小节）真实点击：measures[12].pgbrk===1、aria-pressed=true、字「已换页」、撤销栈 +1、toast「已从第 13 小节起另起一页（Ctrl+Z 撤销）」；
       再点取消（JSON 回到原样）；再点后 Ctrl+Z 一次 JSON 回到原样。引擎在：版面检查里第 13 小节那一行在第 2 页、是第 2 页首行
   U3  右栏「本行」的「此处换页」与工具组同一状态（按下态 / 字 / 灰显），真实点击右栏的也切换
   U4  拒绝路径（不悄悄删换页）：第 13 小节有换页时，第 3 行「每行 ＋」灰显（原因「下一行另起一页」），走动作给 toast「下一行另起一页，先在那一行取消「此处换页」」、谱不变；
       第 4 行「并入上一行」灰显（「本行另起一页」），走动作 toast「本行另起一页，先取消「此处换页」」、谱不变；右栏同两键同状态；「本行恢复默认」后 pgbrk 仍在。
       引擎在：第 4 行「每行 −」后第 12 小节（换页前一小节）没有被写上 brk（两端钉住遇到换页那一端不写）
   U5  撤销后状态同步（突变：工具组签名不含 pgbrk → 红）：点换页 → Ctrl+Z → aria-pressed=false、字「此处换页」；Ctrl+Y → 又是「已换页」
   U6  版面检查：摘要含「手动换页 1 处」；「手动换页」段一项「第 n 页起 · 第 13 小节」（引擎在：n＝2；「页面」区第 2 页前有换页小图标、文字格式不变）；
       真实点这一项 → sel.mi＝12（选中那一行）
   U7  （引擎在）「第 n 页只有 1 行」在下一页由手动换页起始时不报：第 13、17 小节都换页 → 第 2 页只有一行、不报第 2 页；无换页时第 3 页单行照报
   U8  命令面板：搜「换页」首条 lay:pagebrk；第 4 行 ok＝''，回车进排版并切换当前行的换页；第 1 行 ok＝「第 1 行本来就在第 1 页」，回车不执行、toast 说原因；
       搜「页码」首条仍是「页头与页码…」（lay:meta），「印页码」首条 lay:pno
   U9  右栏「页头 · 页码」（1440 停靠 / 1280 竖条浮出）：初始「不印」按下、位置 / 首页 / 起始页码三组 aria-disabled（原因「先选「印」」）；
       点「印」→ layout.pgno={on:true,pos:'bc',start:1,first:false}；位置 / 首页 / ± / 就地输入（Enter＝37、Esc 不改、2000→999、0 失焦→1）都写对，每次有效改动撤销栈 +1、点已按下的不记；
       − 在 1 时灰显；控件命中区 ≥28、文字对底对比度 ≥4.5（按下 / 未按下）；位置三枚同一 top、都在 #right-dock 内、字不折行；Ctrl+Z 逐步退回到原 JSON
   U10 「页头与页码…」真实点击（1440 / 1280）：右栏「版式」打开（1280 浮出）、#flw-lay-hdpn 在右栏可视区内、焦点在页码开关当前那一枚；区里「页头」行打开曲谱信息弹窗
   U11 命令面板「印页码」：回车切换开关、toast「已印页码（底部居中）」/「已不印页码」
   U12 旧外壳 ?shell=classic：#layout-pop 有「页码」一行 4 键（不印 / 底部居中 / 底部外侧 / 顶部外侧）；点「底部外侧」→ pgno={on:true,pos:'bo',start:1,first:false}、只有它 .on；
       Ctrl+Z 撤销；「底部居中」再「不印」→ pgno 删掉、JSON 回原样；1280×800 / 1366×768 浮层不出视口、「完成」滚得到；新外壳里这一行不可见（getClientRects 为空）
   U13 书写谱面的换页标记（页间灰缝）：第 21 小节换页（第 2 页本来就从它起，引擎在不在都成立）→ 灰缝里左键点一下出小菜单「取消换页」，点它 → pgbrk 删掉；
       右键同样出菜单；点没有换页的灰缝（第 2、3 页之间）不出菜单；#score 上不多任何属性。不换行长带里右键第 14|15 小节线 → 小节线菜单多一项「取消换页 · 第15小节起」，点了删掉换页
   U14 ui_cmd：真改了换页记 lay:pgbrk、真改了页码设置记 lay:pgno；点已按下的「不印」不记
   收尾（验收发现）：U1c / U2 / U3 / U5 键名「本行换页」恒定、读屏名＝可见字、悬停说明带行首小节号（UX-1 / UX-9）· U4e 每行 − 遇下一行换页拒绝（UX-3）·
       U8d / U11 / U11b 命令面板开关拆对、输出模式不切模式（UX-6）· U9b / U12 / U16 开页码的提示（UX-2）· U10 焦点环与闪显（UX-8）· U12 旧外壳撤销后页码行按下态刷新 ·
       U13f 胶囊命中收窄与悬停示能（UX-4）· U15 A3 打 A4 页码提示（ENG-4）· U17 换页小菜单过期处理（UX-10）· U18 旧外壳点胶囊出小节线菜单「取消换页」（UX-5）· U19 书写右栏换页行（UX-4）
   v69.1 B（规格 f91 §4 B1.3 / B1.6 / B2.2 / §6.2）有意迁移：排版工具新形态在悬浮条与行工具条 #flw-rowt（同 id；键字 ≤4：「换页」「换行」，读屏名照旧「本行换页」等）、
       右栏「版式」页撤「本行」区与「页头…」行（区名「页码」）、行 2 无「页头与页码…」（右栏竖条 / 页签「版式」进页码区，命令面板 lay:meta 照旧聚焦页码开关）、
       输出 #flw-out-pnw 搬左栏（短读数 + 「改 A4」）——U1–U6 / U9 / U10 / U15 / U16 两种形态各跑（?next=0＝原断言）
   RL  数据红线：song 新增字段 ⊆ {M.pgbrk, L.pgno}（外加排版动作本来就写的现有字段 brk / pull / wf）；不新增 musetab-* 本机键
   env：MUSETAB_URL 被测页（缺省 ../index.html）· ONLY=U1,U9 · SHOTS=目录 存截图 · NEED_ENGINE=0（不要求引擎在场；缺省要求） */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => { const i = u.indexOf('#'), base = i >= 0 ? u.slice(0, i) : u, h = i >= 0 ? u.slice(i) : ''; return base + (base.includes('?') ? '&' : '?') + q + h; };
const CLASSICU = withQ(URL0, 'shell=classic'), NX0U = withQ(URL0, 'next=0');   /* v69.1 B：?next=0＝v69.0 形态 */
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const SHOTS = process.env.SHOTS || '';
const NEED_ENGINE = process.env.NEED_ENGINE !== '0';   /* v68.5 集成：引擎已合入，缺省要求在场 */
const J = x => JSON.stringify(x);
/* 数据红线的「已有键名」：基线提交（v68.4）源码里出现过的 musetab-* 键名都算已有（同 tv_flowdef RL 口径）；拿不到基线就用被测源码 */
const KNOWN = (() => { const lit = t => new Set((String(t || '').match(/musetab-[a-z0-9-]+/g) || []));
  try { return lit(require('child_process').execFileSync('git', ['-C', __dirname, 'show', (process.env.MUSETAB_REF_COMMIT || '71c9cce') + ':muse-tab/index.html'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] })); }
  catch (_) { try { return lit(fs.readFileSync(URL0.replace(/^file:\/\//, '').replace(/[?#].*$/, ''), 'utf8')); } catch (__) { return new Set(); } } })();

function INIT() {
  window.__vis = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e || !e.isConnected) return false;
    const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    if (getComputedStyle(e).visibility !== 'visible') return false;   /* v69.1 B：visibility 可被子孙覆盖（排版模式 #score-wrap 隐藏、悬浮条显式 visible）——只看自身计算值 */
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.opacity === '0') return false; }
    return true; };
  window.__keys = () => Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort();
  window.__fields = () => { const S = new Set(), s = song; if (!s) return [];
    Object.keys(s).forEach(k => S.add('S.' + k));
    if (s.layout && typeof s.layout === 'object') Object.keys(s.layout).forEach(k => S.add('L.' + k));
    (s.measures || []).forEach(m => { if (m) Object.keys(m).forEach(k => S.add('M.' + k)); });
    return [...S].sort(); };
  /* L45：示例曲谱第 1 首接 3 遍，固定版宽；光标落在第 mi 小节 */
  window.__L45 = (mi, o) => { o = o || {};
    window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
    try { hideStartPad(); } catch (_) {}
    const s = migrate(PRESETS[0].make()); const more = [];
    for (let k = 0; k < 2; k++) migrate(PRESETS[0].make()).measures.forEach(m => more.push(m));
    s.measures = s.measures.concat(more);
    if (!o.noLayout) s.layout = { fixed: true }; else delete s.layout;
    (o.pb || []).forEach(i => { s.measures[i].pgbrk = 1; });
    addDoc(s, () => {}); closeDocAt(0);
    sel = { mi: mi || 0, row: 'vox', vi: 0, ci: 0, si: 1 }; try { clampSel(); } catch (_) {}
    try { blurSel = false; lastEnt = null; selRange = null; measureRange = null; measureSel = null; noteSel = []; } catch (_) {}
    render();
    try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {}
    return { n: song.measures.length };
  };
  /* 引擎探针：第 15 小节临时设 pgbrk，分页口径排一次，看有没有一行从它起（量完原样放回） */
  window.__engine = () => { const M = song.measures, had = M[14].pgbrk, pp = PRINT_PAGING; let st = [];
    M[14].pgbrk = 1; PRINT_PAGING = true;
    try { st = layoutSystems().map(s => s.measures[0].mi); } catch (_) {} finally { PRINT_PAGING = pp; if (had === undefined) delete M[14].pgbrk; else M[14].pgbrk = had; }
    return st.includes(14); };
  window.__pbs = () => song.measures.map((m, i) => m.pgbrk === 1 ? i : -1).filter(i => i >= 0);
  window.__tb = () => { const b = document.getElementById('flw-eng-pbrk'); if (!b) return null; const l = b.querySelector('.flw-glb, .flw-rtl');   /* v69.1 B：新形态在行工具条（字在 .flw-rtl） */
    return { vis: __vis(b), dis: b.getAttribute('aria-disabled'), why: b.dataset.why || '', pr: b.getAttribute('aria-pressed'), t: l ? l.textContent : b.textContent, al: b.getAttribute('aria-label') || '', title: b.title }; };
  window.__rp = () => { const b = document.querySelector('#flw-rp-lay [data-fa="lay:pbrk"]'); if (!b) return null; const l = b.querySelector('.flw-glb');
    return { vis: __vis(b), dis: b.getAttribute('aria-disabled'), pr: b.getAttribute('aria-pressed'), t: l ? l.textContent : b.textContent }; };
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const errs = [], OUT = {};
  let pass = 0, total = 0, skip = 0;
  const T = (id, ok, name, d) => { total++; if (ok) pass++; (OUT[id] = OUT[id] || []).push((ok ? '✅ ' : '❌ ') + name + (d ? ': ' + d : '')); };
  const NOTE = (id, s) => (OUT[id] = OUT[id] || []).push(s);
  /* 只依赖引擎的断言：引擎不在＝判红（NEED_ENGINE=0 时跳过） */
  const TE = (id, eng, ok, name, d) => { if (eng) return T(id, ok, name, d); if (NEED_ENGINE) return T(id, false, name + '（引擎未合入）', d); skip++; NOTE(id, '⏭  ' + name + '：跳过（引擎未合入，集成后跑）'); };
  const prep = pg => pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
    window.__toasts = []; try { const ot = toast; toast = function (m) { __toasts.push(String(m)); try { return ot.apply(this, arguments); } catch (_) {} }; } catch (_) {}
    window.__trk = []; try { if (typeof FLOW !== 'undefined' && FLOW.track) { const t0 = FLOW.track; FLOW.track = function (id) { __trk.push(String(id)); return t0.apply(this, arguments); }; Object.assign(FLOW.track, t0); } } catch (_) {}
    if (!document.getElementById('tv-pb-notrans')) { const st = document.createElement('style'); st.id = 'tv-pb-notrans'; st.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}'; document.head.appendChild(st); } });
  const open = async (w, h, o = {}) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: o.scheme || 'light' });
    ctx.setDefaultTimeout(6000);
    await ctx.addInitScript(INIT);
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errs.push((o.tag || (w + 'x' + h)) + ' PAGEERR:' + e.message));
    await pg.goto(o.url || URL0); await pg.waitForTimeout(o.wait || 1200);
    await prep(pg);
    pg.__ctx = ctx; return pg;
  };
  const close = pg => pg.__ctx.close();
  const EV = (pg, fn, a) => pg.evaluate(fn, a);
  const wait = (pg, ms) => pg.waitForTimeout(ms);
  const L45 = async (pg, mi, o) => { const r = await EV(pg, ([mi, o]) => __L45(mi, o), [mi, o || {}]); await wait(pg, 200); return r; };
  const mode = async (pg, m) => { await pg.click('#flw-mode-' + m); await wait(pg, m === 'write' ? 300 : 900); };
  const pick = async (pg, mi) => { await EV(pg, mi => FLOW.lay.pick(mi, 0), mi); await wait(pg, 150); };
  const settle = pg => wait(pg, 700);   /* 一笔之后：快照重拍、左栏 / 工具组同步 */
  const shot = async (pg, name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(SHOTS, name + '.png') }); };
  const SAFE = async (id, name, fn) => { try { await fn(); } catch (e) { T(id, false, name + ' 执行异常', String(e && e.message || e).split('\n')[0]); } };
  const pool = async (jobs, n) => { const q = jobs.slice(); const run1 = async () => { while (q.length) { const j = q.shift(); await j(); } }; await Promise.all(Array.from({ length: n }, run1)); };
  const RL = [];
  const redBase = pg => EV(pg, () => ({ f: __fields(), k: __keys() }));
  const redEnd = async (id, pg, base) => { const now = await redBase(pg);
    const nf = now.f.filter(x => !base.f.includes(x)), badF = nf.filter(x => !['M.pgbrk', 'L.pgno', 'S.layout', 'M.brk', 'M.pull', 'M.wf'].includes(x));   /* 本版新字段只有 pgbrk / pgno；brk / pull / wf 是排版动作本来就写的现有字段 */
    const nk = now.k.filter(x => !base.k.includes(x) && !KNOWN.has(x));   /* 既有键（不换行、命令面板最近用过等）照常写；本版不新增键 */
    RL.push({ id, ok: !badF.length && !nk.length, d: id + (nf.length ? ' 新字段 ' + nf.join(',') : '') + (nk.length ? ' 新键 ' + nk.join(',') : '') }); };
  const jobs = [];
  let ENGINE = null;
  const lum = c => { const m = String(c).match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
  const cr = (x, y) => { const A = lum(x), B = lum(y); return Math.round((Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05) * 100) / 100; };

  /* ================= U1 U2 U3 U5 工具组 / 右栏「此处换页」================= */
  /* v69.1 B：两种形态各跑——新形态键在行工具条，可见字「换页」（≤4 字）、读屏名仍「本行换页」（含可见字，WCAG 2.5.3）、悬停同原；「此处换行」可见字「换行」；
     右栏「本行」区整段撤（读数进行工具条读屏名「本行：第 N 行 · 第 a–b 小节」，「本行恢复默认」＝行工具条「复原」#flw-rowt-reset） */
  if (['U1', 'U2', 'U3', 'U5'].some(want)) for (const nx0 of [true, false]) jobs.push(() => SAFE('U1', 'U1–U5' + (nx0 ? ' ?next=0' : ''), async () => {
    const pg = await open(1440, 900, { tag: 'U1' + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : URL0 });
    const X = nx0 ? '（?next=0）' : '（新形态）', LB = nx0 ? '本行换页' : '换页', LBRK = nx0 ? '此处换行' : '换行';
    await L45(pg, 0); const base = await redBase(pg);
    ENGINE = await EV(pg, () => __engine());
    NOTE('U1', 'ℹ️  引擎（A 轨分页遵守 pgbrk）' + (ENGINE ? '在' : '不在') + '被测页里');
    await mode(pg, 'engrave');
    const a0 = await EV(pg, () => __tb());
    await pg.click('#flw-eng-pbrk', { force: true }); await wait(pg, 200);   /* aria-disabled 的键 Playwright 不点：force 照真实点击派发 */
    const a1 = await EV(pg, () => ({ pbs: __pbs(), toasts: __toasts.slice(-2), undo: undoStack.length }));
    T('U1', !!a0 && a0.vis && a0.dis === 'true' && a0.why === '第 1 行本来就在第 1 页' && /^本行换页/.test(a0.al) && !/即将推出/.test(a0.title + a0.al) && a1.pbs.length === 0 && a1.toasts.includes('第 1 行本来就在第 1 页'),
      'U1 ' + X + '工具组「本行换页」可见、不再「即将推出」；第 1 行 aria-disabled、原因「第 1 行本来就在第 1 页」，真实点击 toast 同一句、不改谱', J({ a0, a1 }));
    await pick(pg, 13);
    const a2 = await EV(pg, () => __tb());
    /* v68.7 S1 迁移（规格 §6.C4，P2 悬停只写「名称 · 读数」）：悬停 /第 13 小节（本行行首）起另起一页/ → ＝「本行换页 · 第 13 小节起」（名称 + 换页落点读数，UX-9 的「第几小节」照留）；修前红：5cddfb8 悬停是整句说明，不等于新串 */
    T('U1', a2.vis && a2.dis === null && a2.pr === 'false' && a2.t === LB && a2.al === '本行换页' && a2.al.indexOf(a2.t) >= 0 && a2.title === '本行换页 · 第 13 小节起', 'U1b ' + X + '选中第 4 行（第 13–16 小节）后可点、未按下、字「' + LB + '」（读屏名「本行换页」含可见字）、悬停「本行换页 · 第 13 小节起」（名称 + 落点）', J(a2));
    /* U1c（收尾 UX-1）：光标在行中间（第 15 小节）时，字与悬停说明都说清作用于本行行首第 13 小节——与紧挨着的「此处换行」（作用于光标所在小节）字面上区分开 */
    await pick(pg, 14);
    const a3 = await EV(pg, () => ({ tb: __tb(), brk: (() => { const b = document.getElementById('flw-eng-brk'); return b ? (b.querySelector('.flw-glb, .flw-rtl') || b).textContent : null; })() }));
    /* v68.7 S1 迁移（规格 §6.C4，P2 悬停只写「名称 · 读数」）：/第 13 小节（本行行首）/ → ＝「本行换页 · 第 13 小节起」（光标在第 15 小节时落点仍读出行首 13，意图不变）；修前红同上 */
    T('U1', a3.tb.t === LB && a3.brk === LBRK && a3.tb.title === '本行换页 · 第 13 小节起', 'U1c ' + X + '光标在第 15 小节（第 4 行中间）：换页键字「' + LB + '」、悬停读数「第 13 小节起」（本行行首），与「' + LBRK + '」（光标所在小节）字面不同', J(a3));
    await pick(pg, 13);
    await shot(pg, 'U1-engrave-1440' + (nx0 ? '-nx0' : ''));

    /* U2 真实点击 → 换页；再点取消；再点 + Ctrl+Z */
    const J0 = await EV(pg, () => JSON.stringify(song)), u0 = await EV(pg, () => undoStack.length);
    await pg.click('#flw-eng-pbrk'); await settle(pg);
    const b1 = await EV(pg, () => ({ pbs: __pbs(), tb: __tb(), rp: __rp(), undo: undoStack.length, toast: __toasts.slice(-1)[0], pull: song.measures[12].pull,
      rep: (() => { const R = FLOW.lay.report(); if (!R) return null; const r = R.rows.find(x => x.m1 === 12); const p1 = R.pageRanges[1]; return { pg: r ? r.pg : null, p1a: p1 ? p1.a : null, n: R.pages }; })() }));
    T('U2', J(b1.pbs) === '[12]' && b1.tb.pr === 'true' && b1.tb.t === LB && b1.tb.al === '本行换页' && b1.tb.al.indexOf(b1.tb.t) >= 0 && b1.tb.title === '本行换页 · 已从第 13 小节起' /* v68.7 S1 迁移：/已从第 13 小节（本行行首）起另起一页/ → ＝「本行换页 · 已从第 13 小节起」（P2 名称 + 读数）；修前红：5cddfb8 悬停为整句 */ && b1.undo === u0 + 1 && b1.toast === '已从第 13 小节起另起一页（Ctrl+Z 撤销）',
      'U2 ' + X + '第 4 行真实点击：measures[12].pgbrk＝1、aria-pressed=true、字仍是「本行换页」且读屏名含可见字（收尾 UX-9，WCAG 2.5.3；此前按下后字变「已换页」、读屏名「此处换页」）、悬停说明「已从第 13 小节…」、撤销栈 +1、toast「已从第 13 小节起另起一页（Ctrl+Z 撤销）」', J(b1));
    TE('U2', ENGINE, !!b1.rep && b1.rep.pg === 1 && b1.rep.p1a === 12, 'U2e 版面检查（快照那一次分页）：第 13 小节那一行在第 2 页、是第 2 页首行', J(b1.rep));
    /* v68.7 S1 迁移（规格 §6.C4 去重 / 功能保全 #22）：右栏「本行」不再有「本行换页」（与行 2 同名同效）——原断言「右栏那一枚与工具组同步」改为「右栏没有 lay:pbrk、只留读数与「本行恢复默认」，行 2 那一枚是唯一入口且按下」；修前红：5cddfb8 右栏有 lay:pbrk（rp 非空）、有小节数 / 断行 / 此处换行 / 并入上一行 */
    const u3r = await EV(pg, () => { const r = document.getElementById('flw-rp-lay'), t = document.getElementById('flw-rowt'), rs = document.getElementById('flw-rowt-reset');
      return { rowt: (document.getElementById('flw-lay-rowt') || {}).textContent || '', reset: !!(r && r.querySelector('[data-fa="lay:reset"]')), rowh: !!document.getElementById('flw-lay-rowh'),
        dup: r ? ['lay:bars', 'lay:lock', 'lay:brk', 'lay:join', 'lay:pbrk'].filter(k => r.querySelector('[data-fa="' + k + '"]')) : ['无右栏'], note: !!(r && r.querySelector('.flw-rxnote')),
        tAl: t && t.getAttribute('aria-label'), tRs: !!rs && __vis(rs) && rs.dataset.fa === 'lay:reset' && !!rs.closest('#flw-rowt'), tPb: !!(t && t.contains(document.getElementById('flw-eng-pbrk'))) }; });
    if (nx0) T('U3', b1.rp === null && b1.tb.vis && b1.tb.pr === 'true' && /^第 \d+ 行 · 第 13–\d+ 小节$/.test(u3r.rowt) && u3r.reset && !u3r.dup.length && !u3r.note,
      'U3（?next=0）右栏「本行」只留读数「第 N 行 · 第 13–… 小节」与「本行恢复默认」（小节数 / 断行 / 此处换行 / 并入上一行 / 本行换页只在行 2），行 2「本行换页」按下', J({ rp: b1.rp, u3r }));
    else T('U3', b1.rp === null && b1.tb.vis && b1.tb.pr === 'true' && !u3r.rowh && !u3r.rowt && !u3r.reset && !u3r.dup.length && !u3r.note && /^本行：第 4 行 · 第 13–16 小节$/.test(u3r.tAl || '') && u3r.tRs && u3r.tPb,
      'U3（新形态）右栏「本行」区整段撤（无读数 / 无「本行恢复默认」/ 无同名键）；读数进行工具条读屏名「本行：第 4 行 · 第 13–16 小节」，「复原」（lay:reset）与按下的「换页」都在行工具条', J({ rp: b1.rp, u3r }));
    await pg.click('#flw-eng-pbrk'); await settle(pg);
    const b2 = await EV(pg, () => ({ pbs: __pbs(), tb: __tb(), rp: __rp(), J: JSON.stringify(song), toast: __toasts.slice(-1)[0] }));
    T('U2', J(b2.pbs) === '[]' && b2.tb.pr === 'false' && b2.tb.t === LB && b2.J === J0 && b2.toast === '已取消第 13 小节前的换页（Ctrl+Z 撤销）',
      'U2b ' + X + '再点取消：pgbrk 删掉、JSON 与点之前逐字节相同、按下态还原、toast「已取消第 13 小节前的换页」', J({ pbs: b2.pbs, tb: b2.tb, toast: b2.toast, same: b2.J === J0 }));
    T('U3', b2.rp === null && b2.tb.pr === 'false', 'U3b 取消后行 2 那一枚还原、右栏仍没有第二枚（v68.7 S1 迁移：原「右栏同步还原」；修前红：5cddfb8 b2.rp 非空）', J({ rp: b2.rp, tb: b2.tb }));
    /* v68.7 S1 迁移（规格 §6.C4）：原「真实点右栏「本行换页」＝同一动作」→ 改点行 2 #flw-eng-pbrk（同一 lay:pbrk 动作、同一状态），另断言右栏不再有 lay:pbrk；修前红：5cddfb8 b3.rp 非空 */
    await pg.click('#flw-eng-pbrk'); await settle(pg);
    const b3 = await EV(pg, () => ({ pbs: __pbs(), tb: __tb(), rp: __rp() }));
    T('U3', J(b3.pbs) === '[12]' && b3.tb.pr === 'true' && b3.rp === null, 'U3c 再点行 2「本行换页」：pgbrk 写上、按下；右栏没有第二枚（同名键只在行 2）', J(b3));
    /* U5 Ctrl+Z / Ctrl+Y 之后按下态跟着走（工具组签名含本行换页） */
    await pg.keyboard.press('Control+z'); await settle(pg);
    const c1 = await EV(pg, () => ({ pbs: __pbs(), tb: __tb(), rp: __rp(), J: JSON.stringify(song) }));
    T('U5', J(c1.pbs) === '[]' && c1.J === J0 && c1.tb.pr === 'false' && c1.tb.t === LB && c1.rp === null /* v68.7 S1 迁移：右栏那一枚已撤（规格 §6.C4），原 c1.rp.pr === 'false' → c1.rp === null；修前红：5cddfb8 c1.rp 非空 */, 'U5 ' + X + 'Ctrl+Z 一次：JSON 回到原样、工具组与右栏的按下态 / 字跟着还原', J({ tb: c1.tb, rp: c1.rp, same: c1.J === J0 }));
    await pg.keyboard.press('Control+y'); await settle(pg);
    const c2 = await EV(pg, () => ({ pbs: __pbs(), tb: __tb() }));
    T('U5', J(c2.pbs) === '[12]' && c2.tb.pr === 'true' && c2.tb.t === LB, 'U5b ' + X + 'Ctrl+Y 重做：又是按下态（aria-pressed=true）', J(c2));
    await shot(pg, 'U2-pressed-1440' + (nx0 ? '-nx0' : ''));
    await redEnd('U1–U5' + (nx0 ? '-nx0' : ''), pg, base);
    await close(pg);
  }));

  /* ================= U4 拒绝路径 ================= */
  /* v69.1 B：两种形态各跑——新形态每行 ± 在悬浮条（#flw-sbar）、并入在行工具条（同 id） */
  if (want('U4')) for (const nx0 of [true, false]) jobs.push(() => SAFE('U4', 'U4' + (nx0 ? ' ?next=0' : ''), async () => {
    const pg = await open(1440, 900, { tag: 'U4' + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : URL0 });
    const X = nx0 ? '（?next=0）' : '（新形态）', HOME = nx0 ? '#flw-eng ' : '#flw-sbar ';
    await L45(pg, 9, { pb: [12] }); const base = await redBase(pg);
    const eng = await EV(pg, () => __engine());
    await mode(pg, 'engrave');
    const st = () => EV(pg, () => { const q = s => [...document.querySelectorAll(s)].map(b => ({ dis: b.getAttribute('aria-disabled'), why: b.dataset.why || '' }));
      return { bars: q('[data-fa="lay:bars"][data-d="1"]'), minus: q('[data-fa="lay:bars"][data-d="-1"]'), join: q('[data-fa="lay:join"]'),
        rp: document.querySelectorAll('#flw-rp-lay [data-fa="lay:bars"], #flw-rp-lay [data-fa="lay:join"]').length }; });
    /* v68.7 S1 迁移（规格 §6.C4 去重）：右栏「本行」的小节数 ± /「并入上一行」已撤，同名键只在行 2——原「工具组与右栏两处」length >= 2 → 行 2 一处（length >= 1）+ 右栏 0 枚（rp === 0）；灰显原因与走动作 toast 断言不变。修前红：5cddfb8 rp 为 3 */
    const s3 = await st();
    const J0 = await EV(pg, () => JSON.stringify(song));
    await pg.click(HOME + '[data-fa="lay:bars"][data-d="1"]', { force: true }); await wait(pg, 150);
    await EV(pg, () => FLOW.lay.act('lay:bars', { dataset: { d: '1' } }, null)); await settle(pg);
    const r3 = await EV(pg, () => ({ J: JSON.stringify(song), t: __toasts.slice(-2) }));
    T('U4', s3.bars.length >= 1 && s3.rp === 0 && s3.bars.every(x => x.dis === 'true' && x.why === '下一行另起一页') && r3.J === J0 && r3.t[0] === '下一行另起一页' && r3.t[1] === '下一行另起一页，先取消那一行的换页',
      'U4a ' + X + '第 3 行（下一行行首第 13 小节换页）：工具组与右栏「每行 ＋」灰显、原因「下一行另起一页」；真实点击说原因，走动作 toast「下一行另起一页，先取消那一行的换页」，谱不变', J({ s3, t: r3.t, same: r3.J === J0 }));
    /* U4e（收尾 UX-3）：同一行「每行 −」也不越过下一行的换页——灰显（原因同上），走动作 toast 说「…只会单独成行…」、谱不变（此前把第 12 小节在第 1 页单独排成一行，toast 却说「移到下一行」） */
    await pg.click(HOME + '[data-fa="lay:bars"][data-d="-1"]', { force: true }); await wait(pg, 150);
    await EV(pg, () => FLOW.lay.act('lay:bars', { dataset: { d: '-1' } }, null)); await settle(pg);
    const r3m = await EV(pg, () => ({ J: JSON.stringify(song), t: __toasts.slice(-2), rows: FLOW.lay.rowsNow().map(r => r.m1 + '-' + r.m2).slice(1, 4) }));
    T('U4', s3.minus.length >= 1 && s3.minus.every(x => x.dis === 'true' && x.why === '下一行另起一页') && r3m.J === J0 && r3m.t[0] === '下一行另起一页' && /行尾小节移过去只会单独成行/.test(r3m.t[1]) && !r3m.rows.includes('11-11'),
      'U4e ' + X + '第 3 行「每行 −」：灰显、原因「下一行另起一页」；走动作 toast「…行尾小节移过去只会单独成行——先取消那一行的换页」，谱不变、不出现第 12 小节孤立行（收尾 UX-3 / REG-2）', J({ minus: s3.minus, t: r3m.t, rows: r3m.rows, same: r3m.J === J0 }));
    await pick(pg, 13);
    const s4 = await st();
    await pg.click('#flw-eng-join', { force: true }); await wait(pg, 150);
    await EV(pg, () => FLOW.lay.act('lay:join', { dataset: {} }, null)); await settle(pg);
    const r4 = await EV(pg, () => ({ J: JSON.stringify(song), t: __toasts.slice(-2) }));
    T('U4', s4.join.length >= 1 && s4.rp === 0 && s4.join.every(x => x.dis === 'true' && x.why === '本行另起一页') && r4.J === J0 && r4.t[0] === '本行另起一页' && r4.t[1] === '本行另起一页，先取消本行的换页',
      'U4b ' + X + '第 4 行（行首换页）：工具组与右栏「并入上一行」灰显、原因「本行另起一页」；走动作 toast「本行另起一页，先取消本行的换页」，谱不变（不悄悄删换页）', J({ s4, t: r4.t, same: r4.J === J0 }));
    await EV(pg, () => FLOW.lay.act('lay:reset', { dataset: {} }, null)); await settle(pg);
    const r5 = await EV(pg, () => __pbs());
    T('U4', J(r5) === '[12]', 'U4c ' + X + '「本行恢复默认」之后第 13 小节的换页仍在（换页有自己的开关）', J(r5));
    /* 两端钉住：第 4 行「每行 −」——行首第 13 小节已是换页，前一小节（第 12 小节）不写 brk */
    await EV(pg, () => FLOW.lay.act('lay:bars', { dataset: { d: '-1' } }, null)); await settle(pg);
    const r6 = await EV(pg, () => ({ brk11: song.measures[11].brk, rows: FLOW.lay.rowsNow().map(r => r.m1 + '-' + r.m2).slice(2, 5), t: __toasts.slice(-1)[0] }));
    TE('U4', eng, r6.brk11 === undefined && r6.rows.includes('12-14'), 'U4d ' + X + '第 4 行「每行 −」：本行变 13–15 小节，行首是换页的那一端不再写 brk（measures[11].brk 仍无）', J(r6));
    await redEnd('U4' + (nx0 ? '-nx0' : ''), pg, base);
    await close(pg);
  }));

  /* ================= U6 U7 版面检查 ================= */
  /* v69.1 B：两种形态各跑——新形态摘要拆成三枚读数（「n 页」「m 行」「每行 …」，规格 B1.2），手动换页的个数看「手动换页」段条目（不再在摘要句里） */
  if (['U6', 'U7'].some(want)) for (const nx0 of [true, false]) jobs.push(() => SAFE('U6', 'U6/U7' + (nx0 ? ' ?next=0' : ''), async () => {
    const pg = await open(1440, 900, { tag: 'U6' + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : URL0 });
    const X = nx0 ? '（?next=0）' : '（新形态）';
    await L45(pg, 13); const base = await redBase(pg);
    const eng = await EV(pg, () => __engine());
    await mode(pg, 'engrave');
    const lone0 = await EV(pg, () => (FLOW.lay.report() || { issues: [] }).issues.filter(x => x.k === 'lonely').map(x => x.pg));
    await pg.click('#flw-eng-pbrk'); await settle(pg);
    const a = await EV(pg, () => { const box = document.getElementById('flw-lay-rep'), sum = (box.querySelector('.flw-lrsum') || {}).textContent || '';
      const it = [...box.querySelectorAll('[data-fa="lay:go"][data-k="pb"]')].map(x => ({ n: (x.querySelector('.flw-lrn') || {}).textContent, g: (x.querySelector('.flw-lrg') || {}).textContent, mi: x.dataset.mi, title: x.title }));
      const heads = [...box.querySelectorAll('.flw-lrh .flw-lrt')].map(x => x.textContent);
      const pages = [...box.querySelectorAll('[data-fa="lay:pg"]')].map(x => ({ t: x.textContent, ic: !!x.querySelector('.flw-lrpb'), title: x.title }));
      return { sum, it, heads, pages }; });
    T('U6', (nx0 ? /共\s*\d+\s*页\s*·\s*\d+\s*行/.test(a.sum) && /手动换页 1 处/.test(a.sum) : /^\d+\s*页\d+\s*行每行/.test(a.sum) && !/共|·/.test(a.sum)) && a.it.length === 1 && a.it[0].g === '第 13 小节' && /^第 \d+ 页起$/.test(a.it[0].n) && a.it[0].mi === '12'
      && a.heads.indexOf('手动换页') > 0 && a.heads.indexOf('手动换页') < a.heads.indexOf('页面') && a.pages.every(p => /^第 \d+ 页第 \d+(–\d+)? 小节 · \d+ 行$/.test(p.t)),
      'U6 ' + X + '版面检查：摘要' + (nx0 ? '「共 n 页 · m 行 …· 手动换页 1 处」' : '三枚读数「n 页」「m 行」「每行 …」（不成句）') + '；「手动换页」段在提示之后、「页面」之前，一项「第 n 页起 · 第 13 小节」；「页面」区每项文字格式不变', J(a));
    TE('U6', eng, a.it[0] && a.it[0].n === '第 2 页起' && a.pages[1] && a.pages[1].ic && /手动换页/.test(a.pages[1].title) && !a.pages[0].ic, 'U6e 引擎在：「第 2 页起」；「页面」区第 2 页前有换页小图标、悬停写「（手动换页）」，第 1 页没有', J(a.pages));
    await pick(pg, 0);
    await pg.click('#flw-lay-rep [data-k="pb"]'); await settle(pg);
    const c = await EV(pg, () => ({ mi: sel.mi, row: (FLOW.lay.rowsNow().find(r => sel.mi >= r.m1 && sel.mi <= r.m2) || {}).m1, tb: __tb() }));
    T('U6', c.mi === 12 && c.tb.pr === 'true', 'U6b 真实点「手动换页」那一项：选中第 13 小节那一行（sel.mi＝12），工具组「本行换页」随即按下、可再点取消', J(c));
    await shot(pg, 'U6-report-1440' + (nx0 ? '-nx0' : ''));
    /* U7：第 13、17 小节都换页 → 第 2 页只有一行，但下一页由手动换页起始 → 不报 */
    await EV(pg, () => { FLOW.lay.pick(16, 0); }); await wait(pg, 150);
    await pg.click('#flw-eng-pbrk'); await settle(pg);
    const d = await EV(pg, () => { const R = FLOW.lay.report(); return { pbs: __pbs(), lone: R.issues.filter(x => x.k === 'lonely').map(x => x.pg), pr: R.pageRanges.map(p => p.rows + (p.pb ? 'pb' : '')) }; });
    TE('U7', eng, J(d.pbs) === '[12,16]' && d.pr[1] === '1pb' && d.pr[2] && /pb$/.test(d.pr[2]) && !d.lone.includes(1), 'U7 第 13、17 小节都换页：第 2 页只有一行、不报「第 2 页只有 1 行」（下一页由手动换页起始）', J(d));
    T('U7', lone0.length >= 1, 'U7b 无换页时单行页照报（L45 第 3 页只有 1 行）', J(lone0));
    await redEnd('U6' + (nx0 ? '-nx0' : ''), pg, base);
    await close(pg);
  }));

  /* ================= U8 U11 命令面板 ================= */
  if (['U8', 'U11'].some(want)) jobs.push(() => SAFE('U8', 'U8/U11', async () => {
    const pg = await open(1280, 800, { tag: 'U8' });
    await L45(pg, 13); const base = await redBase(pg);
    const s = await EV(pg, () => { const f = q => (FLOW.cmd.search(q).hits || []).map(c => c.id);
      const c = (FLOW.cmd.search('换页').hits || [])[0];
      return { hy: f('换页').slice(0, 2), ym: f('页码').slice(0, 3), yy: f('印页码')[0], ok: c && c.ok ? c.ok() : 'x', w: c && (typeof c.w === 'function' ? c.w() : c.w) }; });
    T('U8', s.hy[0] === 'lay:pagebrk' && s.ok === '' && s.ym[0] === 'lay:meta' && s.ym.includes('lay:pno') && s.yy === 'lay:pno' && !/即将推出/.test(String(s.w)),
      'U8 命令面板：「换页」首条「本行换页」（lay:pagebrk，可用、说明不再写「即将推出」）；「页码」首条仍是「页头与页码…」，「印页码」首条 lay:pno', J(s));
    const run = async q => { await pg.keyboard.press('Control+Slash'); await wait(pg, 200); await pg.keyboard.type(q); await wait(pg, 200); await pg.keyboard.press('Enter'); await settle(pg); };
    await run('换页');
    const e1 = await EV(pg, () => ({ mode: FLOW.mode.cur, pbs: __pbs(), tb: __tb() }));
    T('U8', e1.mode === 'engrave' && J(e1.pbs) === '[12]' && e1.tb.pr === 'true', 'U8b 第 4 行回车执行「本行换页」：进排版、第 13 小节换页、工具组按下', J(e1));
    /* U8d（收尾 UX-6）：开关类命令拆成一对、名字不随状态变——已换页时「本行换页」灰显（说「本行已经换页…」）、「换页」首条变成「取消本行换页」；执行它才取消；再「本行换页」又加回 */
    const sx = await EV(pg, () => { const L = FLOW.cmd.search('换页').hits || [], f = id => L.find(c => c.id === id); const a = f('lay:pagebrk'), x = f('lay:pagebrkx');
      return { first: L[0] && L[0].id, a: a && a.ok ? a.ok() : 'x', x: x && x.ok ? x.ok() : 'x', xt: x && x.t }; });
    await run('取消本行换页');
    const ex = await EV(pg, () => ({ pbs: __pbs(), tb: __tb(), t: __toasts.slice(-1)[0] }));
    await run('本行换页');
    const ey = await EV(pg, () => ({ pbs: __pbs(), tb: __tb() }));
    T('U8', sx.first === 'lay:pagebrkx' && sx.xt === '取消本行换页' && /^本行已经换页/.test(sx.a) && sx.x === '' && J(ex.pbs) === '[]' && ex.tb.pr === 'false' && /已取消第 13 小节前的换页/.test(ex.t) && J(ey.pbs) === '[12]' && ey.tb.pr === 'true',
      'U8d 已换页时：「本行换页」灰显（「本行已经换页…」）、「换页」首条是「取消本行换页」；执行它取消，再执行「本行换页」加回（收尾 UX-6：此前同一条名字不变、回车反而取消）', J({ sx, ex, ey }));
    await EV(pg, () => { setMode('write'); sel.mi = 2; clampSel(); render(); }); await wait(pg, 400);
    const ok1 = await EV(pg, () => { const c = FLOW.cmd.search('换页').hits[0]; return c.ok ? c.ok() : ''; });
    await run('换页');
    const e2 = await EV(pg, () => ({ pbs: __pbs(), t: __toasts.slice(-1)[0] }));
    T('U8', ok1 === '第 1 行本来就在第 1 页' && J(e2.pbs) === '[12]' && e2.t === '本行换页：第 1 行本来就在第 1 页', 'U8c 第 1 行：ok 返回「第 1 行本来就在第 1 页」，回车不执行、toast 说原因', J({ ok1, e2 }));
    await pg.keyboard.press('Escape'); await wait(pg, 200);   /* 不可用的那一条回车后面板还开着：先收起 */
    /* U11 印页码 */
    await EV(pg, () => setMode('write')); await wait(pg, 300);
    await run('印页码');
    const f1 = await EV(pg, () => ({ mode: FLOW.mode.cur, pn: song.layout && song.layout.pgno, t: __toasts.slice(-1)[0] }));
    await run('印页码');
    const f1b = await EV(pg, () => ({ pn: song.layout && song.layout.pgno, t: __toasts.slice(-1)[0] }));
    await pg.keyboard.press('Escape'); await wait(pg, 200);   /* 灰显那一条回车后面板还开着 */
    await run('不印页码');
    const f2 = await EV(pg, () => ({ pn: song.layout && song.layout.pgno, t: __toasts.slice(-1)[0], L: song.layout }));
    T('U11', f1.mode === 'engrave' && J(f1.pn) === J({ on: true, pos: 'bc', start: 1, first: false }) && /^已印页码（底部居中）：从第 2 页起印/.test(f1.t)
      && J(f1b.pn) === J(f1.pn) && f1b.t === '印页码：已经在印页码' && f2.pn === undefined && f2.t === '已不印页码' && J(f2.L) === J({ fixed: true }),
      'U11 命令面板「印页码」：回车开（{on:true,pos:"bc",start:1,first:false}、toast「已印页码（底部居中）：从第 2 页起印…」）；已在印时这一条灰显（「已经在印页码」，不再是回车即关）；「不印页码」关（pgno 删掉、layout 回 {fixed:true}）（收尾 UX-2 / UX-6）', J({ f1, f1b, f2 }));
    /* U11b（收尾 UX-6）：输出模式里执行「印页码」就地改、不切回排版 */
    await EV(pg, () => setMode('output')); await wait(pg, 900);
    await run('印页码');
    const f3 = await EV(pg, () => ({ mode: FLOW.mode.cur, on: !!(song.layout && song.layout.pgno && song.layout.pgno.on) }));
    await run('不印页码');
    T('U11', f3.mode === 'output' && f3.on, 'U11b 输出模式执行「印页码」：页码打开、仍停在输出（此前被切回排版）', J(f3));
    await EV(pg, () => setMode('write')); await wait(pg, 300);
    await redEnd('U8', pg, base);
    await close(pg);
  }));

  /* ================= U9 U10 U14 右栏「页头 · 页码」 ================= */
  /* v69.1 B：两种形态各跑——新形态行 2 没有「页头与页码…」（规格 B1.5 / B1.6）：真实点右栏「版式」（1440 页签 / 1280 竖条）进页码区（区名「页码」、无「页头…」行、无「本行」区），
     命令面板 lay:meta / lay:pno 同一 openPn（聚焦页码开关、整区闪一下）照旧；?next=0 跑原断言（点行 2 #flw-eng-meta） */
  for (const nx0 of [true, false]) for (const [w, h] of [[1440, 900], [1280, 800]]) if (['U9', 'U10', 'U14'].some(want)) jobs.push(() => SAFE('U9', 'U9/U10 ' + w + (nx0 ? ' ?next=0' : ''), async () => {
    const pg = await open(w, h, { tag: 'U9-' + w + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : URL0 });
    const X = nx0 ? '（?next=0）' : '（新形态）';
    await L45(pg, 13); const base = await redBase(pg);
    await mode(pg, 'engrave');
    const J0 = await EV(pg, () => JSON.stringify(song));
    /* U10 真实点击「页头与页码…」（新形态：先真实点右栏「版式」，再走命令面板同一路径 lay:meta） */
    if (nx0) { await pg.click('#flw-eng-meta'); await wait(pg, 400); }
    else {
      const em = await EV(pg, () => !!document.getElementById('flw-eng-meta'));
      await pg.click('[data-p="lay"]:is([data-fa="rd:page"],[data-fa="rd:tab"]) >> visible=true'); await wait(pg, 400);
      const v = await EV(pg, () => { const sec = document.getElementById('flw-lay-hdpn'), rd = document.getElementById('right-dock'); const r = sec && sec.getBoundingClientRect(), q = rd.getBoundingClientRect();
        return { page: FLOW.rd.page(), rdVis: __vis(rd), inView: !!r && r.top >= q.top - 1 && r.top < q.bottom - 40, head: (document.getElementById('flw-lay-hdh') || {}).textContent, hd: !!(sec && sec.querySelector('[data-fa="lay:hd"]')),
          row: !!document.getElementById('flw-lay-rowh'), pno: !!(sec && sec.querySelector('[data-fa="lay:pno"][data-v="1"]')) && __vis(sec.querySelector('[data-fa="lay:pno"][data-v="1"]')) }; });
      T('U10', !em && v.page === 'lay' && v.rdVis && v.inView && v.head === '页码' && !v.hd && !v.row && v.pno,
        'U10a ' + w + X + '行 2 没有「页头与页码…」；真实点右栏「版式」→ 页码区（区名「页码」）在可视区、「印」可点；没有「页头…」行与「本行」区（页头在谱面页头 / 文件 ▾）', J({ em, v }));
      await EV(pg, () => FLOW.lay.act('lay:meta', document.querySelector('[data-fa="rd:page"][data-p="lay"], [data-fa="rd:tab"][data-p="lay"]'), null)); await wait(pg, 400);
    }
    const o = await EV(pg, () => { const sec = document.getElementById('flw-lay-hdpn'), rd = document.getElementById('right-dock'), ae = document.activeElement;
      const r = sec.getBoundingClientRect(), q = rd.getBoundingClientRect();
      return { dock: document.body.classList.contains('flw-rd'), ro: FLOW.rd.isOpen(), page: FLOW.rd.page(), rdVis: __vis(rd), inView: r.top >= q.top - 1 && r.top < q.bottom - 40,
        ae: ae && ae.dataset ? ae.dataset.fa + ':' + ae.dataset.v : null, aeIn: !!(ae && sec.contains(ae)), aePr: ae && ae.getAttribute && ae.getAttribute('aria-pressed'),
        fv: !!ae && getComputedStyle(ae).outlineStyle === 'solid' && parseFloat(getComputedStyle(ae).outlineWidth) >= 2, flash: sec.classList.contains('flw-flash') }; });
    T('U10', o.page === 'lay' && o.rdVis && (w >= 1440 && nx0 ? o.dock : (o.ro && !o.dock)) && o.inView && o.aeIn && o.ae === 'lay:pno:0' && o.aePr === 'true' && o.fv && o.flash,
      'U10 ' + w + X + (nx0 ? ' 真实点「页头与页码…」' : ' 命令面板同一路径 lay:meta') + '：右栏「版式」' + (w >= 1440 && nx0 ? '（停靠）' : '浮出（新形态 v69.1 D5 竖条，1440 也不停靠）') + '、「页头 · 页码」区在右栏可视区里、焦点在页码开关当前那一枚（不印）且鼠标点开也显示 2px 焦点环、整区闪一下（.flw-flash）——收尾 UX-8', J(o));
    await shot(pg, 'U10-hdpn-' + w + (nx0 ? '-nx0' : ''));
    /* 初始：不印；三组灰显 */
    const st = () => EV(pg, () => { const sec = document.getElementById('flw-lay-hdpn'), q = s => [...sec.querySelectorAll(s)];
      return { pno: q('[data-fa="lay:pno"]').map(b => b.dataset.v + ':' + b.getAttribute('aria-pressed')).join(','),
        pos: q('[data-fa="lay:pnpos"]').map(b => b.dataset.v + ':' + b.getAttribute('aria-pressed')).join(','),
        first: q('[data-fa="lay:pnfirst"]').map(b => b.dataset.v + ':' + b.getAttribute('aria-pressed')).join(','),
        dis: q('[aria-disabled="true"]').map(b => b.dataset.fa + (b.dataset.v || b.dataset.d || '')), why: [...new Set(q('[aria-disabled="true"]').map(b => b.dataset.why))],
        st: (document.getElementById('flw-lay-pnst') || {}).textContent, pn: song.layout && song.layout.pgno, undo: undoStack.length }; });
    const s0 = await st();
    T('U9', s0.pno === '0:true,1:false' && s0.dis.length === 8 && J(s0.why) === J(['先选「印」']) && s0.pn === undefined,
      'U9 ' + w + X + ' 初始「不印」按下；位置 3 · 首页 2 · 起始页码 ± 与值键共 8 枚 aria-disabled、原因「先选「印」」', J(s0));
    const clk = async (sel, ms) => { await pg.click('#flw-lay-hdpn ' + sel); await wait(pg, ms || 350); return st(); };
    const s1 = await clk('[data-fa="lay:pno"][data-v="1"]');
    const t1 = await EV(pg, () => __toasts.slice(-1)[0]);
    T('U9', J(s1.pn) === J({ on: true, pos: 'bc', start: 1, first: false }) && s1.pno === '0:false,1:true' && s1.pos === 'bc:true,bo:false,to:false' && J(s1.dis) === J(['lay:pnstart-1']) && s1.undo === s0.undo + 1 && /^已印页码（底部居中）：从第 2 页起印（首页按出版惯例不印）$/.test(t1 || ''),
      'U9b ' + w + ' 点「印」：layout.pgno＝{on:true,pos:"bc",start:1,first:false}、三组可点（只剩 − 在 1 时灰显）、撤销栈 +1；toast「已印页码（底部居中）：从第 2 页起印（首页按出版惯例不印）」（收尾 UX-2：此前屏幕上什么都不变、没有提示）', J({ s1, t1 }));
    const s2 = await clk('[data-fa="lay:pnpos"][data-v="bo"]');
    const s2b = await clk('[data-fa="lay:pnpos"][data-v="bo"]');
    const s3 = await clk('[data-fa="lay:pnpos"][data-v="to"]');
    const s4 = await clk('[data-fa="lay:pnfirst"][data-v="1"]');
    const s5 = await clk('[data-fa="lay:pnstart"][data-d="1"]');
    const s6 = await clk('[data-fa="lay:pnstart"][data-d="-1"]');
    T('U9', s2.pn.pos === 'bo' && s2.pos === 'bc:false,bo:true,to:false' && s2b.undo === s2.undo && s3.pn.pos === 'to' && s4.pn.first === true && s4.first === '0:false,1:true'
      && s5.pn.start === 2 && s5.st === '2' && s6.pn.start === 1 && s6.st === '1' && [s2, s3, s4, s5, s6].every((x, i, a) => x.undo === (i ? a[i - 1].undo : s1.undo) + 1),
      'U9c ' + w + ' 位置「底部外侧」「顶部外侧」、首页「印」、起始页码 ＋ / − 都写对、值键跟着变；每次一步撤销；再点已按下的「底部外侧」不记撤销点', J({ s2: s2.pn, s3: s3.pn, s4: s4.pn, s5: s5.pn, s6: s6.pn, u: [s1.undo, s2.undo, s2b.undo, s3.undo, s4.undo, s5.undo, s6.undo] }));
    /* 就地输入 */
    const typeIn = async (v, key) => { await pg.click('#flw-lay-pnst'); await wait(pg, 120);
      const f = await EV(pg, () => { const i = document.getElementById('flw-lay-pnin'); return { inp: !!i, foc: document.activeElement === i, btnHidden: document.getElementById('flw-lay-pnst').hidden }; });
      await pg.keyboard.press('Control+a'); await pg.keyboard.type(v);
      if (key === 'blur') await pg.click('#flw-lay-hdh'); else await pg.keyboard.press(key);
      await wait(pg, 350); return Object.assign(f, await st(), { gone: await EV(pg, () => !document.getElementById('flw-lay-pnin') && !document.getElementById('flw-lay-pnst').hidden), mode: await EV(pg, () => FLOW.mode.cur) }); };
    const i1 = await typeIn('37', 'Enter'), i2 = await typeIn('5', 'Escape'), i3 = await typeIn('2000', 'Enter'), i4 = await typeIn('0', 'blur');
    T('U9', i1.inp && i1.foc && i1.btnHidden && i1.pn.start === 37 && i1.st === '37' && i1.gone && i1.mode === 'engrave' && i2.pn.start === 37 && i2.undo === i1.undo && i3.pn.start === 999 && i4.pn.start === 1 && i4.gone,
      'U9d ' + w + ' 起始页码就地输入：点值键出数字框并聚焦；37 Enter → 37（打数字不切回书写）；Esc 不改；2000 → 999；0 失焦 → 1；收起后值键回来', J({ i1: [i1.inp, i1.foc, i1.pn.start, i1.mode], i2: i2.pn.start, i3: i3.pn.start, i4: i4.pn.start }));
    /* 命中区 / 对比度 / 位置组几何 */
    const g = await EV(pg, () => { const sec = document.getElementById('flw-lay-hdpn'), rd = document.getElementById('right-dock').getBoundingClientRect();
      const effBg = el => { for (let x = el; x; x = x.parentElement) { const c = getComputedStyle(x).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; } return 'rgb(255, 255, 255)'; };
      const ctl = [...sec.querySelectorAll('button')].filter(__vis);
      const pos = [...sec.querySelectorAll('[data-fa="lay:pnpos"]')].map(b => { const r = b.getBoundingClientRect(); return { t: Math.round(r.top * 10) / 10, l: r.left, r: r.right, h: r.height, wrap: b.scrollWidth > b.clientWidth + 1 }; });
      return { min: Math.min(...ctl.map(b => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); })),
        con: ctl.filter(b => b.getAttribute('aria-disabled') !== 'true').map(b => ({ k: (b.dataset.fa || '') + (b.dataset.v || b.dataset.d || ''), c: getComputedStyle(b).color, bg: effBg(b) })),
        pos, rd: [rd.left, rd.right] }; });
    const cons = g.con.map(x => ({ k: x.k, r: cr(x.c, x.bg) })), lowC = cons.filter(x => !(x.r >= 4.5));
    T('U9', g.min >= 28 && !lowC.length && g.pos.length === 3 && g.pos.every(p => Math.abs(p.t - g.pos[0].t) <= 0.5 && p.l >= g.rd[0] && p.r <= g.rd[1] + 0.5 && !p.wrap && p.h <= 30),
      'U9e ' + w + ' 控件命中区 ≥28（最小 ' + g.min + '）、可点控件文字对底 ≥4.5；位置三枚同一 top、都在 #right-dock 内、字不折行', J({ lowC, pos: g.pos, rd: g.rd, min: g.min }));
    await shot(pg, 'U9-hdpn-on-' + w + (nx0 ? '-nx0' : ''));
    /* 「不印」→ 关；Ctrl+Z 逐步退回原 JSON */
    const z0 = await clk('[data-fa="lay:pno"][data-v="0"]');
    T('U9', z0.pn && z0.pn.on === false && z0.dis.length === 8, 'U9f ' + w + ' 点「不印」：on＝false（其余设置非缺省，保留 {on:false,…}），三组又灰显', J(z0.pn));
    const nUndo = z0.undo - s0.undo;
    await EV(pg, () => { const a = document.activeElement; if (a && a.blur) a.blur(); });
    for (let i = 0; i < nUndo; i++) { await pg.keyboard.press('Control+z'); await wait(pg, 120); }
    await settle(pg);
    const z1 = await EV(pg, () => ({ J: JSON.stringify(song), pno: [...document.querySelectorAll('#flw-lay-hdpn [data-fa="lay:pno"]')].map(b => b.getAttribute('aria-pressed')).join(',') }));
    T('U9', z1.J === J0 && z1.pno === 'true,false', 'U9g ' + w + ' Ctrl+Z ' + nUndo + ' 次：JSON 回到原样（layout 回 {fixed:true}）、页码开关按下态跟着回「不印」', J({ same: z1.J === J0, pno: z1.pno }));
    /* U10b 区里「页头」行开曲谱信息（新形态这一行撤了——页头＝谱面页头 / 文件 ▾「曲谱信息…」：断言区里没有它） */
    if (nx0) {
      await pg.click('#flw-lay-hdpn [data-fa="lay:hd"]'); await wait(pg, 350);
      const m = await EV(pg, () => ({ modal: !!document.getElementById('modal-mask'), t: ((document.querySelector('#modal-mask .modal') || {}).textContent || '').slice(0, 40) }));
      T('U10', m.modal && /曲谱信息|标题/.test(m.t), 'U10b ' + w + X + ' 区里「页头」行打开曲谱信息弹窗', J(m));
      await EV(pg, () => { try { closeModal(); } catch (_) {} });
    } else T('U10', await EV(pg, () => !document.querySelector('#flw-lay-hdpn [data-fa="lay:hd"]')), 'U10b ' + w + X + ' 页码区没有「页头…」行（规格 B1.5 去重）');
    /* U14 ui_cmd */
    if (w === 1440) {
      const tr = await EV(pg, () => __trk.filter(x => /^lay:pg/.test(x)));
      await EV(pg, () => { __trk.length = 0; }); await pg.click('#flw-lay-hdpn [data-fa="lay:pno"][data-v="0"]'); await wait(pg, 200);
      const tr2 = await EV(pg, () => __trk.slice());
      T('U14', tr.filter(x => x === 'lay:pgno').length >= 8 && !tr.includes('lay:pgbrk') && tr2.length === 0, 'U14 ui_cmd：页码设置每次真改了记 lay:pgno（上面 ' + tr.filter(x => x === 'lay:pgno').length + ' 次）；点已按下的「不印」不记', J({ tr, tr2 }));
    }
    await redEnd('U9-' + w + (nx0 ? '-nx0' : ''), pg, base);
    await close(pg);
  }));

  /* ================= U12 旧外壳 #layout-pop「页码」================= */
  if (want('U12')) jobs.push(() => SAFE('U12', 'U12', async () => {
    const pg = await open(1440, 900, { tag: 'U12', url: CLASSICU });
    await L45(pg, 13, { noLayout: true }); const base = await redBase(pg);
    const J0 = await EV(pg, () => JSON.stringify(song));
    await pg.click('#b-layout'); await wait(pg, 250);
    const a = await EV(pg, () => ({ flow: document.body.classList.contains('flow'), row: __vis('#lp-pgno-row'), btn: [...document.querySelectorAll('#lp-pgno button')].map(b => b.textContent + (b.classList.contains('on') ? '*' : '')), lab: (document.querySelector('#lp-pgno-row .lp-lab') || {}).textContent }));
    await pg.click('#lp-pgno [data-pn="bo"]'); await wait(pg, 300);
    const b1 = await EV(pg, () => ({ pn: song.layout && song.layout.pgno, on: [...document.querySelectorAll('#lp-pgno button.on')].map(b => b.dataset.pn), t: __toasts.slice(-1)[0] }));
    await pg.keyboard.press('Control+z'); await wait(pg, 300);
    const b2 = await EV(pg, () => JSON.stringify(song));
    const b2on = await EV(pg, () => ({ open: document.getElementById('layout-pop').classList.contains('on'), on: [...document.querySelectorAll('#lp-pgno button.on')].map(b => b.dataset.pn) }));
    if (!(await EV(pg, () => document.getElementById('layout-pop').classList.contains('on')))) { await pg.click('#b-layout'); await wait(pg, 200); }
    await pg.click('#lp-pgno [data-pn="bc"]'); await wait(pg, 250);
    const b3 = await EV(pg, () => ({ pn: song.layout && song.layout.pgno, on: [...document.querySelectorAll('#lp-pgno button.on')].map(b => b.dataset.pn) }));
    await pg.click('#lp-pgno [data-pn=""]'); await wait(pg, 250);
    const b4 = await EV(pg, () => ({ J: JSON.stringify(song), on: [...document.querySelectorAll('#lp-pgno button.on')].map(b => b.dataset.pn) }));
    await shot(pg, 'U12-classic-layout-pop');
    T('U12', !a.flow && a.row && J(a.btn) === J(['不印*', '底部居中', '底部外侧', '顶部外侧']) && a.lab === '页码' && J(b1.pn) === J({ on: true, pos: 'bo', start: 1, first: false }) && J(b1.on) === J(['bo'])
      && b2 === J0 && J(b3.pn) === J({ on: true, pos: 'bc', start: 1, first: false }) && J(b3.on) === J(['bc']) && b4.J === J0 && J(b4.on) === J([''])
      && /^已印页码（底部外侧）：从第 2 页起印/.test(b1.t || '') && b2on.open && J(b2on.on) === J(['']),
      'U12 旧外壳 #layout-pop「页码」一行 4 键（初始「不印」）；点「底部外侧」→ pgno={on:true,pos:"bo",start:1,first:false}、只它 .on、toast「已印页码（底部外侧）：从第 2 页起印…」；Ctrl+Z 回原样且浮层开着时按下态跟着回「不印」（收尾：此前停在「底部外侧」）；「底部居中」再「不印」→ pgno 与 layout 都删掉、JSON 回原样',
      J({ a, b1, b2on, b3, b2same: b2 === J0, b4same: b4.J === J0, b4on: b4.on }));
    await redEnd('U12', pg, base);
    await close(pg);
    /* 1280×800：浮层多了一行后限高、内部滚动——「完成」滚得到、浮层底不出视口（基线 1366×768 就已掉出） */
    for (const [vw, vh] of [[1280, 800], [1366, 768]]) {
      const pc = await open(vw, vh, { tag: 'U12c', url: CLASSICU });
      await L45(pc, 0); await pc.click('#b-layout'); await wait(pc, 250);
      const g = await EV(pc, () => { const P = document.getElementById('layout-pop'), p = P.getBoundingClientRect(); P.scrollTop = 1e4; const d = document.getElementById('lp-done').getBoundingClientRect();
        return { bottom: Math.round(p.bottom), ih: innerHeight, done: [Math.round(d.top), Math.round(d.bottom)], sh: P.scrollHeight, ch: P.clientHeight }; });
      T('U12', g.bottom <= g.ih && g.done[0] >= 0 && g.done[1] <= g.ih && g.done[1] <= g.bottom, 'U12c 旧外壳 ' + vw + '×' + vh + '：「排版」浮层底不出视口（限高、内部滚动），滚到底「完成」整个看得见', J(g));
      await close(pc);
    }
    const pf = await open(1440, 900, { tag: 'U12f' });
    await L45(pf, 13); await mode(pf, 'engrave');
    await EV(pf, () => { if (!FLOW.rd.dockOn()) FLOW.rd.open('lay'); }); await wait(pf, 150);   /* v69.1 D5：新形态右栏默认竖条——浮出「版式」页再看 */
    const f = await EV(pf, () => { const r = document.getElementById('lp-pgno-row'); return { inDock: !!(r && r.closest('#flw-rp-lay')), rects: r ? r.getClientRects().length : -1, pop: __vis('#layout-pop') }; });
    T('U12', f.inDock && f.rects === 0 && f.pop, 'U12b 新外壳：#layout-pop 搬进右栏「版式」后「页码」行不可见（getClientRects 为空）——用「页头 · 页码」区，不出两套控件', J(f));
    await close(pf);
  }));

  /* ================= U13 书写谱面的换页标记（页间灰缝 / 小节线菜单）================= */
  if (want('U13')) jobs.push(() => SAFE('U13', 'U13', async () => {
    const pg = await open(1440, 900, { tag: 'U13' });
    await L45(pg, 0, { pb: [20] }); const base = await redBase(pg);
    const attrs0 = await EV(pg, () => document.getElementById('score').getAttributeNames().sort().join(','));
    /* 灰缝中点（谱面坐标 → 屏幕）：第 k 页与第 k+1 页之间 */
    /* 收尾 UX-4：命中区收到胶囊（页宽正中，半宽 22＋12）——dx＝离胶囊中心的谱面横向偏移 */
    const gapAt = (k, dx) => EV(pg, ([k, dx]) => { const svg = document.getElementById('score'), g = PV_GEO, step = g.pgH + g.gap, y = (k + 1) * step - g.gap / 2;
      const wrap = document.getElementById('score-wrap'); const m0 = svg.getScreenCTM(); const p0 = svg.createSVGPoint(); p0.x = g.W / 2 + (dx || 0); p0.y = y; let q = p0.matrixTransform(m0);
      wrap.scrollTop += q.y - innerHeight / 2; const m = svg.getScreenCTM(); q = p0.matrixTransform(m);
      const t = document.elementFromPoint(q.x, q.y); return { x: q.x, y: q.y, n: g.n, top: t ? (t.id || t.tagName) : null, pgs: FLOW.lay.rowsNow().filter(r => r.m1 === 20).length }; }, [k, dx || 0]);
    /* U13f / U13g（收尾 UX-4）：离胶囊 120 单位的灰缝不再命中（此前整条灰缝都弹菜单）；指针停在胶囊上 #paper 得 .pbhov（手形）与悬停说明，移开撤掉；#score 不多属性 */
    { const far = await gapAt(0, 120); await pg.mouse.click(far.x, far.y); await wait(pg, 250);
      const mf = await EV(pg, () => ({ menu: !!document.getElementById('popmenu'), blur: blurSel }));
      const on = await gapAt(0, 0); await pg.mouse.move(on.x, on.y); await wait(pg, 120);
      const h1 = await EV(pg, () => { const p = document.getElementById('paper'); return { cls: p.classList.contains('pbhov'), title: p.title, cur: getComputedStyle(document.getElementById('score')).cursor }; });
      await pg.mouse.move(far.x, far.y); await wait(pg, 120);
      const h2 = await EV(pg, () => { const p = document.getElementById('paper'); return { cls: p.classList.contains('pbhov'), title: p.getAttribute('title') }; });
      await EV(pg, () => { blurSel = false; render(); });
      T('U13', !mf.menu && h1.cls && h1.title === '第 21 小节起另起一页（点一下可取消）' && h1.cur === 'pointer' && !h2.cls && h2.title === null,
        'U13f 灰缝里离胶囊 120 单位点一下不出菜单（命中收到胶囊 ±12）；指针停在胶囊上：手形光标 + 悬停说明「第 21 小节起另起一页（点一下可取消）」，移开即撤（收尾 UX-4）', J({ mf, h1, h2 })); }
    const p = await gapAt(0);
    await pg.mouse.click(p.x, p.y); await wait(pg, 250);
    const m1 = await EV(pg, () => { const d = document.getElementById('popmenu'); return d ? { it: [...d.querySelectorAll('[data-fa]')].map(b => b.dataset.fa + ':' + b.dataset.mi + ':' + b.textContent.trim()), h: (d.querySelector('.flw-mh') || {}).textContent, blur: blurSel } : null; });
    await shot(pg, 'U13-gap-menu');
    T('U13', p.n >= 2 && !!m1 && J(m1.it) === J(['lay:pboff:20:取消换页']) && m1.h === '第 21 小节起另起一页' && m1.blur === false,
      'U13 书写谱面第 1、2 页之间的灰缝（第 2 页由第 21 小节的手动换页起始）左键点一下：出小菜单「第 21 小节起另起一页 · 取消换页」，不清光标 / 选区', J({ p, m1 }));
    await pg.click('#popmenu [data-fa="lay:pboff"]'); await wait(pg, 300);
    const r1 = await EV(pg, () => ({ pbs: __pbs(), t: __toasts.slice(-1)[0], menu: !!document.getElementById('popmenu') }));
    T('U13', J(r1.pbs) === '[]' && r1.t === '已取消第 21 小节前的换页（Ctrl+Z 撤销）' && !r1.menu, 'U13b 点「取消换页」：第 21 小节的 pgbrk 删掉、toast、菜单收起', J(r1));
    await pg.keyboard.press('Control+z'); await wait(pg, 400);
    const p2 = await gapAt(0);
    await pg.mouse.click(p2.x, p2.y, { button: 'right' }); await wait(pg, 250);
    const m2 = await EV(pg, () => { const d = document.getElementById('popmenu'); return { pbs: __pbs(), it: d ? [...d.querySelectorAll('[data-fa]')].map(b => b.dataset.fa) : null, qb: !!(document.getElementById('quickbar') && document.getElementById('quickbar').classList.contains('on')) }; });
    T('U13', J(m2.pbs) === '[20]' && J(m2.it) === J(['lay:pboff']) && !m2.qb, 'U13c Ctrl+Z 换页回来；右键灰缝同样出「取消换页」菜单（不弹音符快捷浮条）', J(m2));
    await EV(pg, () => { try { FLOW.menu.close(); } catch (_) {} });
    const p3 = await gapAt(1);
    await pg.mouse.click(p3.x, p3.y); await wait(pg, 250);
    const m3 = await EV(pg, () => ({ menu: !!document.getElementById('popmenu'), blur: blurSel }));
    const attrs1 = await EV(pg, () => document.getElementById('score').getAttributeNames().sort().join(','));
    T('U13', p3.n >= 3 && !m3.menu && m3.blur === true && attrs1 === attrs0, 'U13d 点没有手动换页的灰缝（第 2、3 页之间）：不出菜单、照旧是「点空白」（熄光标）；#score 上没有多任何属性（成品克隆的是它）', J({ m3, attrs0, attrs1 }));
    /* 不换行长带：右键第 14|15 小节之间的小节线 → 小节线菜单「取消换页 · 第15小节起」 */
    await EV(pg, () => { song.measures[14].pgbrk = 1; setNoWrap(true); }); await wait(pg, 500);
    const bl = await EV(pg, () => { const el = [...document.querySelectorAll('#score [data-bar]')].find(e => /^13:14:/.test(e.dataset.bar)); if (!el) return null;
      el.scrollIntoView({ block: 'center', inline: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    let bm = null;
    if (bl) { await pg.mouse.click(bl.x, bl.y, { button: 'right' }); await wait(pg, 250);
      bm = await EV(pg, () => { const d = document.getElementById('popmenu'); return d ? [...d.querySelectorAll('[data-k]')].map(b => b.dataset.k + ':' + b.textContent.trim()).filter(t => /^pgx/.test(t)) : null; });
      await pg.click('#popmenu [data-k="pgx"]').catch(() => {}); await wait(pg, 300); }
    const r4 = await EV(pg, () => ({ pbs: __pbs(), t: __toasts.slice(-1)[0] }));
    await EV(pg, () => setNoWrap(false)); await wait(pg, 300);
    T('U13', !!bl && J(bm) === J(['pgx:取消换页 · 第15小节起']) && J(r4.pbs) === '[20]' && r4.t === '已取消第 15 小节前的换页（Ctrl+Z 撤销）',
      'U13e 不换行长带：右键第 14|15 小节之间的小节线，菜单多一项「取消换页 · 第15小节起」，点了删掉第 15 小节的换页（第 21 小节的不动）', J({ bl, bm, r4 }));
    await redEnd('U13', pg, base);
    await close(pg);
  }));

  /* ================= U15 A3 版面打 A4 纸的页码提示（收尾 ENG-4）================= */
  if (want('U15')) jobs.push(() => SAFE('U15', 'U15', async () => {
    const pg = await open(1440, 900, { tag: 'U15', url: NX0U });   /* v69.1 B：原断言跑 ?next=0（右栏发布与导出页）；新形态（左栏警示条 + 「改 A4」）见 U15n */
    await L45(pg, 0);
    const f = await EV(pg, () => { const r = {}; song.layout = { fixed: true, page: 'A3', pgno: { on: true, pos: 'bc', start: 1, first: false } }; render();
      r.a3 = pnPrintWarn('A4'); r.a3L = pnPrintWarn('A4L'); r.letter = pnPrintWarn('Letter'); r.fit = pnPrintWarn('fit');
      song.layout = { fixed: true, page: 'A4', pgno: { on: true, pos: 'bc', start: 1, first: false } }; render(); r.a4 = pnPrintWarn('A4');
      song.layout = { fixed: true, page: 'A3' }; render(); r.off = pnPrintWarn('A4');
      song.layout = { fixed: true, page: 'A3', pgno: { on: true, pos: 'to', start: 1, first: false } }; render(); return r; });
    await mode(pg, 'output'); await EV(pg, () => FLOW.rd.open('pub', null, false)); await wait(pg, 400);
    const o = await EV(pg, () => { const e = document.getElementById('flw-out-pnw'); return { vis: !!e && __vis(e), t: e ? e.textContent : null }; });
    await close(pg);
    const pc = await open(1440, 900, { tag: 'U15c', url: CLASSICU });
    await L45(pc, 0); await EV(pc, () => { song.layout = { fixed: true, page: 'A3', pgno: { on: true, pos: 'bo', start: 1, first: false } }; render(); });
    await pc.click('#b-print'); await wait(pc, 300);
    const c1 = await EV(pc, () => { const e = document.getElementById('ex-pnw'); return { hid: e ? e.hidden : null, t: e ? e.textContent : null }; });
    /* 不印页码的谱：弹窗里根本没有这一段（弹窗 HTML 与此前相同，tv_modes M23c 对拍） */
    await pc.selectOption('#ex-size', 'fit'); await wait(pc, 100);
    const c2 = await EV(pc, () => { const e = document.getElementById('ex-pnw'); return !e || e.hidden; });
    await EV(pc, () => closeModal()); await close(pc);
    T('U15', /页码离纸边只剩约 5mm/.test(f.a3) && /A4/.test(f.a3) && f.a3L && /信纸/.test(f.letter) && f.fit === '' && f.a4 === '' && f.off === '' && o.vis && /页码离纸边/.test(o.t || '') && c1.hid === false && /页码离纸边/.test(c1.t || '') && c2 === true,
      'U15（?next=0）A3 版面、印页码、打到 A4 / A4 横向 / 信纸：选纸张的地方提示「页码离纸边只剩约 5mm…」（新外壳输出右栏 #flw-out-pnw、旧外壳「打印 / 导出」弹窗 #ex-pnw）；A4 版面、不印页码、自适应纸张不提示（收尾 ENG-4）', J({ f, o, c1, c2 }));
  }));

  /* v69.1 B（规格 B2.2）：新形态 #flw-out-pnw 搬到输出模式左栏格式卡之上（同 id，出错才出）——短读数「页码可能印不到」（悬停「页码离纸边约 5mm」）+ 按钮「改 A4」
     （原句的建议做成动作：排版纸张改 A4，同 #lp-page 撤销点）；点了警示条消失、版面 A4、一步撤销回 A3 */
  if (want('U15')) jobs.push(() => SAFE('U15', 'U15n', async () => {
    const pg = await open(1440, 900, { tag: 'U15n' });
    await L45(pg, 0);
    await EV(pg, () => { song.layout = { fixed: true, page: 'A3', pgno: { on: true, pos: 'bc', start: 1, first: false } }; render(); });
    await mode(pg, 'output');
    const o = await EV(pg, () => { const e = document.getElementById('flw-out-pnw'), b = e && e.querySelector('button'), sp = e && e.querySelector('span');
      return { vis: !!e && __vis(e), left: !!(e && e.closest('#flw-left')), above: !!(e && document.getElementById('flw-out-fmt') && (e.compareDocumentPosition(document.getElementById('flw-out-fmt')) & Node.DOCUMENT_POSITION_FOLLOWING)),
        t: e ? e.textContent.trim() : null, title: sp && sp.title, btn: b && b.textContent, bfa: b && b.dataset.fa, bvis: !!b && __vis(b), rd: !!document.getElementById('flw-rp-pub') }; });
    const u0 = await EV(pg, () => undoStack.length);
    if (o.bvis) await pg.click('#flw-out-pnw button'); await wait(pg, 700);
    const a = await EV(pg, () => ({ page: song.layout && song.layout.page, hid: (document.getElementById('flw-out-pnw') || {}).hidden, undo: undoStack.length, t: __toasts.slice(-1)[0], mode: FLOW.mode.cur }));
    await pg.keyboard.press('Control+z'); await wait(pg, 700);
    const z = await EV(pg, () => ({ page: song.layout && song.layout.page, vis: __vis('#flw-out-pnw') }));
    T('U15', o.vis && o.left && o.above && /页码可能印不到/.test(o.t) && o.title === '页码离纸边约 5mm' && o.btn === '改 A4' && o.bfa === 'out:pnfix' && !o.rd
      && a.page === 'A4' && a.hid === true && a.undo === u0 + 1 && /版面已改 A4/.test(a.t || '') && a.mode === 'output' && z.page === 'A3' && z.vis,
      'U15n（新形态）A3 版面印页码、打印纸 A4：左栏格式卡之上出警示条「页码可能印不到」（悬停「页码离纸边约 5mm」）+「改 A4」；点了版面改 A4、警示条消失、仍在输出、一步撤销（Ctrl+Z 回 A3、警示条回来）', J({ o, a, z }));
    await close(pg);
  }));

  /* ================= U16 只有 1 页的谱打开页码（收尾 UX-2）================= */
  if (want('U16')) for (const nx0 of [true, false]) jobs.push(() => SAFE('U16', 'U16' + (nx0 ? ' ?next=0' : ''), async () => {
    const pg = await open(1440, 900, { tag: 'U16' + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : URL0 });   /* v69.1 B：新形态行 2 没有「页头与页码…」，点右栏「版式」页签进页码区 */
    await EV(pg, () => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} const s = migrate(PRESETS[0].make()); s.layout = { fixed: true }; addDoc(s, () => {}); closeDocAt(0); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); });
    await mode(pg, 'engrave');
    await pg.click(nx0 ? '#flw-eng-meta' : '[data-p="lay"]:is([data-fa="rd:page"],[data-fa="rd:tab"]) >> visible=true'); await wait(pg, 400);
    await pg.click('#flw-lay-hdpn [data-fa="lay:pno"][data-v="1"]'); await wait(pg, 400);
    const a = await EV(pg, () => ({ n: PV_GEO.n, t: __toasts.slice(-1)[0], fol: document.querySelectorAll('#pv-pages .pgfolio').length }));
    await pg.click('#flw-lay-hdpn [data-fa="lay:pnfirst"][data-v="1"]'); await wait(pg, 600);
    const b2 = await EV(pg, () => ({ t: __toasts.slice(-1)[0], fol: document.querySelectorAll('#pv-pages .pgfolio').length }));
    T('U16', a.n === 1 && /本谱只有 1 页，首页按出版惯例不印，所以看不到页码；要印请把右栏「首页」选「印」/.test(a.t || '') && a.fol === 0 && b2.fol === 1,
      'U16' + (nx0 ? '（?next=0）' : '（新形态）') + ' 只有 1 页的谱点「印」：toast 说明「本谱只有 1 页，首页按出版惯例不印…要印请把右栏「首页」选「印」」；照做后预览里出现页码（收尾 UX-2）', J({ a, b2 }));
    await close(pg);
  }));

  /* ================= U17 换页小菜单的过期处理（收尾 UX-10）================= */
  if (want('U17')) jobs.push(() => SAFE('U17', 'U17', async () => {
    const pg = await open(1440, 900, { tag: 'U17' });
    await L45(pg, 0, { pb: [20] });
    const at = () => EV(pg, () => { const svg = document.getElementById('score'), g = PV_GEO, step = g.pgH + g.gap, y = step - g.gap / 2, wrap = document.getElementById('score-wrap');
      const p0 = svg.createSVGPoint(); p0.x = g.W / 2; p0.y = y; let q = p0.matrixTransform(svg.getScreenCTM()); wrap.scrollTop += q.y - innerHeight / 2; q = p0.matrixTransform(svg.getScreenCTM()); return { x: q.x, y: q.y }; });
    let p = await at(); await pg.mouse.click(p.x, p.y); await wait(pg, 250);
    const m0 = await EV(pg, () => !!document.getElementById('popmenu'));
    await pg.mouse.wheel(0, 400); await wait(pg, 300);
    const m1 = await EV(pg, () => !!document.getElementById('popmenu'));
    p = await at(); await pg.mouse.click(p.x, p.y); await wait(pg, 250);
    const m2 = await EV(pg, () => !!document.getElementById('popmenu'));
    await EV(pg, () => { sysPageBreak(20, false); }); await wait(pg, 300);
    const m3 = await EV(pg, () => !!document.getElementById('popmenu'));
    await EV(pg, () => FLOW.lay.act('lay:pboff', { dataset: { mi: '20' } }, null)); await wait(pg, 150);
    const t = await EV(pg, () => __toasts.slice(-1)[0]);
    T('U17', m0 && !m1 && m2 && !m3 && t === '第 21 小节前已经没有换页', 'U17 换页小菜单：谱面一滚就收起；那一处换页被别处取消 / 撤销后收起；过期的「取消换页」再点给提示「第 21 小节前已经没有换页」（收尾 UX-10：此前菜单悬着、点了静默）', J({ m0, m1, m2, m3, t }));
    await close(pg);
  }));

  /* ================= U18 旧外壳点书写谱面的「换页」胶囊（收尾 UX-5）================= */
  if (want('U18')) jobs.push(() => SAFE('U18', 'U18', async () => {
    const pg = await open(1280, 800, { tag: 'U18', url: CLASSICU });
    await L45(pg, 0, { pb: [20] });
    const at = () => EV(pg, () => { const svg = document.getElementById('score'), g = PV_GEO, step = g.pgH + g.gap, y = step - g.gap / 2;
      const p0 = svg.createSVGPoint(); p0.x = g.W / 2; p0.y = y; let q = p0.matrixTransform(svg.getScreenCTM());
      const sc = (typeof scoreScroller === 'function' && scoreScroller()) || document.scrollingElement; sc.scrollTop += q.y - innerHeight / 2; q = p0.matrixTransform(svg.getScreenCTM()); return { x: q.x, y: q.y }; });
    const p = await at(); await pg.mouse.move(p.x, p.y); await wait(pg, 120);
    const hov = await EV(pg, () => document.getElementById('paper').classList.contains('pbhov'));
    await pg.mouse.click(p.x, p.y); await wait(pg, 300);
    const m = await EV(pg, () => { const d = document.getElementById('popmenu'); return d ? [...d.querySelectorAll('[data-k="pgx"]')].map(b => b.textContent.trim()) : null; });
    await shot(pg, 'U18-classic-capsule-menu');
    if (m && m.length) { await pg.click('#popmenu [data-k="pgx"]'); await wait(pg, 300); }
    const r = await EV(pg, () => ({ pbs: __pbs(), t: __toasts.slice(-1)[0], flow: document.body.classList.contains('flow') }));
    T('U18', !r.flow && hov && J(m) === J(['取消换页 · 第21小节起']) && J(r.pbs) === '[]' && r.t === '已取消第 21 小节前的换页（Ctrl+Z 撤销）',
      'U18 旧外壳：指针停在胶囊上有手形；点胶囊打开那条小节线的菜单，里面有「取消换页 · 第21小节起」，点了删掉换页（收尾 UX-5：此前点了没反应、旧外壳没有任何取消入口）', J({ hov, m, r }));
    await close(pg);
  }));

  /* ================= U19 书写右栏「小节」里的换页行（收尾 UX-4）================= */
  if (want('U19')) jobs.push(() => SAFE('U19', 'U19', async () => {
    const pg = await open(1440, 900, { tag: 'U19' });
    await L45(pg, 20, { pb: [20] }); await wait(pg, 400);
    await EV(pg, () => { if (!FLOW.rd.dockOn()) FLOW.rd.open('prop'); }); await wait(pg, 150);   /* v69.1 D5：新形态右栏默认竖条——浮出「属性」页（同点竖条「属性」） */
    const a = await EV(pg, () => { const b = document.querySelector('#right-dock [data-fa="lay:pboff"][data-mi="20"]'); const kv = b && b.closest('.flw-rx-kv');
      return { vis: !!b && __vis(b), al: b && b.getAttribute('aria-label'), row: b ? (b.parentElement.textContent || '') : '' }; });
    await EV(pg, () => { sel.mi = 3; clampSel(); render(); }); await wait(pg, 300);
    const none = await EV(pg, () => !document.querySelector('#right-dock [data-fa="lay:pboff"]'));
    await EV(pg, () => { sel.mi = 20; clampSel(); render(); }); await wait(pg, 300);
    if (a.vis) { await pg.click('#right-dock [data-fa="lay:pboff"][data-mi="20"]'); await wait(pg, 300); }
    const r = await EV(pg, () => ({ pbs: __pbs(), mode: FLOW.mode.cur }));
    T('U19', a.vis && /本小节起另起一页/.test(a.row) && a.al === '取消第 21 小节起的换页' && none && J(r.pbs) === '[]' && r.mode === 'write',
      'U19 书写模式右栏「小节 21」多一行「换页：本小节起另起一页 · 取消」（没有换页的小节没有这一行）；点「取消」删掉换页、仍在书写（收尾 UX-4：此前书写右栏查不到换页）', J({ a, none, r }));
    await close(pg);
  }));

  await pool(jobs, 2);
  await b.close();
  const order = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19'];
  order.forEach(k => (OUT[k] || []).forEach(l => console.log(l)));
  Object.keys(OUT).filter(k => !order.includes(k)).forEach(k => OUT[k].forEach(l => console.log(l)));
  if (RL.length) { const bad = RL.filter(x => !x.ok); total++; if (!bad.length) pass++;
    console.log((bad.length ? '❌ ' : '✅ ') + 'RL 数据红线：song 新增字段 ⊆ {M.pgbrk, L.pgno}、不新增 musetab-* 键：' + RL.map(x => x.d).join('；')); }
  if (errs.length) { total++; console.log('❌ 页面报错 ' + errs.length + '：' + errs.slice(0, 5).join(' | ')); } else { total++; pass++; console.log('✅ 页面无报错'); }
  console.log('\n' + pass + '/' + total + ' 通过' + (skip ? '，' + skip + ' 项依赖引擎的断言跳过' : ''));
  process.exit(pass === total ? 0 : 1);
})();
