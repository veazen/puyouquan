'use strict';
/* v69.1 界面简约化 S3 · B 轨「排版模式」（规格 f91 §4 B1；方案 docs/design-2026-10g ③排版 / P10 / D12；PROJECT.md §9.0 TCH-7）。
   被测页＝默认新外壳（flow 新形态）；L0 另开 ?next=0 / ?shell=classic；L8 另开基线 v69.0（git show 658d425，env MUSETAB_BASE）比同名键结果。
   修前（658d425，MUSETAB_URL 指向它）应红：L0 的 ?next=0 / 旧外壳不变量在基线上本来成立，其余各条都以悬浮条排版内容 / 行工具条 / 修 N 处为前提。
   L0  ?next=0：行 2 #flw-eng 原样（纸张 / 疏密 / 每行 / 四键 / 页头与页码…可见）、悬浮条在排版时 visibility:hidden、右栏「版式」有「本行」与「页头…」，没有行工具条 / 角标；
       ?shell=classic：文档里没有 #flw-rowt / .flw-pvshort / .flw-pvfix / #flw-pubp / #flw-out-fmt
   L1  进排版：悬浮条可见（自身 visibility + 主按钮中心 elementFromPoint 命中）、类 flw-sb-m-engrave；内容恰为 纸张 ▾ · 疏密三枚 · 每行 −N＋ · 主按钮 ·（N≥1 时）▾ · 智能 ▾ · 收起，
       没有谱类 ▾ / 记谱法；几何：条底 ≤ #pv-stage 顶、条左右缘＝预览区（±1）、条顶 ≥ 行 2 底；1280 / 1440 / 1920 条内不溢出；回书写条位置与 #score-wrap scrollTop 不变
   L2  行 2 排版只剩模式条 · 撤销 · 搜功能（#flw-eng 不显示）；全文档 id 唯一
   L3  纸张 ▾ → A5：layoutCfg().page==='A5'、预览页数＝PV.geo.n；Ctrl+Z 复原 A4
   L4  《送别》（末行 1 小节 21%）：主按钮「修 1 处」；▾ 1 项「并入第 16」；悬停 ≥400ms → 预览滚到末两行、.flw-pvfix 套住第 3–4 行（几何）、角标「→ 6 小节」；
       点主按钮 → 行数 4→3、撤销栈 +1、Ctrl+Z 回 4 行；《送别》末小节 16 个十六分音符（末行单小节、不算短）＝「并入第 16」同样修好
   L5  不越过锁定行与手动换行（README P10）：锁住第 3 行 → N＝0、主按钮「输出」、角标「并入」aria-disabled「上一行已锁定」；第 3 / 4 行之间是手动「此处换行」→ N＝0「有手动换行」；
       锁住第 2 行 + 第 1 / 2 行之间手动换行、末行单小节可修 → 修后第 2 行 [m1,m2] 不变、所有修前 brk / pgbrk 修后仍为 1。突变：去掉 fixOk 的锁检查 → 本条红
   L6  修完 N=0 → 主按钮换字「输出」；换字后 600ms 内点击无效；再点 → FLOW.mode.cur==='output'（TCH-7）
   L7  行工具条：进排版即在当前行可见、与当前行框相交 0；五键（换行 / 并入 / 锁定 / 换页 / 复原）＝同 id 搬家（#flw-eng-brk 等在 #flw-rowt 里），字 ≤4、悬停 ≤12；
       点预览第 2 行 → 工具条跟到第 2 行；悬停第 3 行出 .flw-pvhov、工具条不动
   L8  工具条各键结果与 v69.0 行 2 同名键逐字节同（同夹具同操作，song JSON 对拍）；第 1 行「并入」「换页」灰显原因同 v69.0
   L9  末行短角标：《送别》第 1 页末行右侧 .flw-pvshort 可见、与该页所有谱行墨迹（行范围 × 行内小节框）相交 0；点「并入」＝L4 主按钮同结果
   L10 去重：排版屏可点控件同名组（命令面板不计、主按钮 × 模式条放行）＝0；纸张 / 疏密 / 每行 / 内容大小各只在一处；版式页无「本行」区、无「页头…」，
       「内容大小」− ＋ 一步 10%、值 #lp-sval 可点就地输入；「固定」字 + 悬停「固定版宽 · 与打印一致」；排版屏说明字 0（textaudit 单屏抽取，TBA9）
   L11 键盘：#pv-stage 聚焦 ↓ / ↑ 照 v69.0 原生滚动预览、不换行（收尾 V2：快捷键含义不改）；Tab 进工具条，工具条上 ↓ / ↑ 换当前行（焦点留在同一键）、
       ← → 在五键间走、Esc 回预览区；数字键回书写落音（M3 行为不变）
   L4e（收尾 V1）「修 N 处」只写 pull：修后强制断点（brk / pgbrk）集合不变、没有任何一行被判成锁定（sysRowLocked）、修过那一行的行工具条「锁定」aria-pressed=false。
       突变：merge 改回钉行首（pinStart 写 brk）→ 本条红
   L12 打印媒体 / FLOW.snapHTML 里没有 #flw-rowt / .flw-pvfix / .flw-pvshort / .flw-pvhov；书写 #score 在进出排版前后逐字节相同
   L13 命令面板 lay:brk / lay:pull / lay:lock：Enter 执行与工具条同效（song JSON 对拍）；描边目标由 C 轨迁移表定（集成后判，ℹ️）
   RL  数据红线：本机键集合差 0；song 字段只多 brk / pull（排版动作本来就写）
   env：MUSETAB_URL 被测页 · MUSETAB_BASE 基线页（缺省 git show 658d425:muse-tab/index.html；none＝本地显式跳过 L8）· ONLY=L1,L5 · SHOTS=目录 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const { runState } = require('./lib/textaudit/states.js');
const M = require('./lib/textaudit/metrics.js');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => { const i = u.indexOf('#'), b = i >= 0 ? u.slice(0, i) : u, h = i >= 0 ? u.slice(i) : ''; return b + (b.includes('?') ? '&' : '?') + q + h; };
const NX0 = withQ(URL0, 'next=0'), CLASSIC = withQ(URL0, 'shell=classic');
/* 基线：v69.0（v69.1 之前的 HEAD）。完整 SHA（CI 浅克隆后按它补取；集成时与 A 轨 inplace_ref.json 同一提交） */
const REFJ = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'inplace_ref.json'), 'utf8')); } catch (_) { return {}; } })();
const BASE_COMMIT = process.env.MUSETAB_BASE_COMMIT || REFJ.commit || '658d4252b780f6534cec556fdf4d9f96609f5928';
const IN_CI = !!process.env.CI && process.env.MUSETAB_BASE !== 'none';
const BASEU = (() => {
  const e = process.env.MUSETAB_BASE;
  if (e) return e === 'none' ? '' : toUrl(e);
  try { const txt = execFileSync('git', ['-C', __dirname, 'show', BASE_COMMIT + ':muse-tab/index.html'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
    const f = path.join(os.tmpdir(), 'tv_layout2_base_' + BASE_COMMIT.slice(0, 7) + '.html'); fs.writeFileSync(f, txt); return 'file://' + f; } catch (_) { return ''; }
})();
/* 数据红线「已有键名」：基线源码里出现过的 musetab-* 键名都算已有（同 tv_pgbrk_ui RL 口径） */
const KNOWN = (() => { try { return new Set((fs.readFileSync(BASEU.replace(/^file:\/\//, ''), 'utf8').match(/musetab-[a-z0-9-]+/g) || [])); } catch (_) { return new Set(); } })();
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const SHOTS = process.env.SHOTS || '';
const J = x => JSON.stringify(x);
const W = ms => new Promise(r => setTimeout(r, ms));
const cnt = s => (String(s || '').match(/[\p{L}\p{N}]/gu) || []).length;
let pass = 0, total = 0; const OUT = {}, fails = [], errs = [];
const T = (id, ok, name, d) => { total++; if (ok) pass++; else fails.push(id + ' ' + name); (OUT[id] = OUT[id] || []).push((ok ? '✅ ' : '❌ ') + id + ' ' + name + (!ok && d != null ? '\n     ' + String(d).slice(0, 1800) : '')); };
const NOTE = (id, s) => { (OUT[id] = OUT[id] || []).push('ℹ️ ' + s); };

/* —— 页面内工具（init 脚本：只定义 window.__*）—— */
function INIT() {
  window.__P = n => { const p = PRESETS.find(x => x.name.indexOf(n) >= 0); if (!p) throw new Error('无预设 ' + n); return migrate(p.make()); };
  /* 可见：自身 visibility（可继承、子可覆盖）+ 祖先 display / opacity；排版模式的悬浮条在 visibility:hidden 的 #score-wrap 里、自身 visible */
  window.__vis = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    if (getComputedStyle(e).visibility !== 'visible') return false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.opacity === '0') return false; } return true; };
  window.__hit = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e) return false; const r = e.getBoundingClientRect(); const x = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!x && (x === e || e.contains(x)); };
  window.__R = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e) return null; const r = e.getBoundingClientRect(), f = v => Math.round(v * 10) / 10; return { x: f(r.left), y: f(r.top), w: f(r.width), h: f(r.height), r: f(r.right), b: f(r.bottom) }; };
  window.__ix = (a, b) => (!a || !b) ? 0 : Math.max(0, Math.min(a.r, b.r) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.y, b.y));
  window.__keys = () => Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort();
  window.__shut = () => { try { FLOW.menu.close(); } catch (_) {} try { closePop(); } catch (_) {} try { closeModal(); } catch (_) {} };
  window.__one = s => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; try { hideStartPad(); } catch (_) {} __shut(); const t = document.querySelector('#flw-tour'); if (t) t.remove();
    addDoc(s, () => {}); while (docs.length > 1) closeDocAt(0); try { closeModal(); } catch (_) {}
    sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; try { blurSel = false; selRange = null; measureRange = null; } catch (_) {} render();
    try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {} return s.measures.length; };
  /* 《送别》末小节换成 16 个十六分音符：末行单小节、宽过半行（「单小节行」而不是「末行短」） */
  window.__dense = () => { const s = __P('送别'); s.measures[15].voxes[0] = Array.from({ length: 16 }, (_, i) => ({ dur: 16, dotted: false, deg: (i % 7) + 1, acc: '', oct: 0, lyrics: ['啊'], tie: false })); return s; };
  window.__ms = () => song.measures.map(m => (m.brk ? 'b' : '') + (m.pull ? 'p' : '') + (m.pgbrk ? 'P' : '') || '.').join(',');
  window.__rows = () => { const pp = PRINT_PAGING; PRINT_PAGING = true; try { return layoutSystems().map(s => [s.measures[0].mi, s.measures[s.measures.length - 1].mi]); } finally { PRINT_PAGING = pp; } };
  window.__ids = () => { const c = {}; document.querySelectorAll('[id]').forEach(e => { c[e.id] = (c[e.id] || 0) + 1; }); return Object.keys(c).filter(k => c[k] > 1); };
  window.__toasts = []; window.__toastT = () => { const t = document.getElementById('toast'); return t ? (t.textContent || '').trim() : ''; };
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const open = async (w, h, o) => { o = o || {};
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: o.scheme || 'light', deviceScaleFactor: 1 });
    ctx.setDefaultTimeout(8000);
    await ctx.addInitScript(INIT);
    const pg = await ctx.newPage(); pg._ctx = ctx;
    pg.on('pageerror', e => errs.push((o.tag || '') + ' PAGEERR: ' + e.message));
    await pg.goto(o.url || URL0); await pg.waitForTimeout(1000);
    await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
      try { const ot = toast; toast = function (m) { __toasts.push(String(m)); try { return ot.apply(this, arguments); } catch (_) {} }; } catch (_) {} });
    return pg; };
  const close = pg => pg._ctx.close().catch(() => {});
  const EV = (pg, f, a) => pg.evaluate(f, a);
  const shot = async (pg, n) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(SHOTS, n + '.png') }); };
  const SAFE = async (id, fn) => { try { await fn(); } catch (e) { T(id, false, '执行异常', String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } };
  const eng = async pg => { await pg.click('#flw-mode-engrave'); await pg.waitForTimeout(1200); };
  const keys0 = {};

  /* ================= L0 ?next=0 / 旧外壳 ================= */
  if (want('L0')) await SAFE('L0', async () => {
    const pg = await open(1440, 900, { url: NX0, tag: 'L0' });
    await EV(pg, () => __one(__P('送别'))); await eng(pg);
    const a = await EV(pg, () => ({ nx: FLOW.nxOn(), eng: __vis('#flw-eng'), engN: document.querySelectorAll('#flw-eng [data-fa]').length, keys: ['#flw-eng-brk', '#flw-eng-join', '#flw-eng-lock', '#flw-eng-pbrk', '#flw-eng-meta'].map(s => __vis(s)),
      sbVis: getComputedStyle(document.getElementById('flw-sbar')).visibility, rowh: !!document.getElementById('flw-lay-rowh'), hd: !!document.querySelector('#flw-rp-lay [data-fa="lay:hd"]'),
      rowt: !!document.getElementById('flw-rowt'), short: document.querySelectorAll('.flw-pvshort').length, nx0: document.body.classList.contains('flw-nx0'), out: (() => { setMode('output'); return null; })() }));
    await pg.waitForTimeout(1000);
    const o = await EV(pg, () => ({ outN: document.querySelectorAll('#flw-out [data-fa^="out:"]').length, pub: !!document.getElementById('flw-pub-go'), fmt: !!document.getElementById('flw-out-fmt'), pages: (document.getElementById('flw-out-pages') || {}).textContent || '' }));
    T('L0', !a.nx && a.nx0 && a.eng && a.engN >= 15 && a.keys.every(Boolean) && a.sbVis === 'hidden' && a.rowh && a.hd && !a.rowt && !a.short && o.outN >= 10 && o.pub && !o.fmt && /基准纸张/.test(o.pages),
      'L0 ?next=0：行 2 排版工具组原样（含「页头与页码…」）、悬浮条排版时 hidden、右栏「本行」「页头…」照有、无行工具条 / 角标；输出仍是行 2 导出组 + 右栏发布卡（v69.0 原样）', J({ a, o }));
    await close(pg);
    const pc = await open(1440, 900, { url: CLASSIC, tag: 'L0c' });
    await EV(pc, () => __one(__P('送别')));
    const c = await EV(pc, () => ({ flow: document.body.classList.contains('flow'), n: document.querySelectorAll('#flw-rowt, .flw-pvshort, .flw-pvfix, .flw-pvhov, #flw-pubp, #flw-out-fmt, #flw-out-lbody').length }));
    T('L0', !c.flow && c.n === 0, 'L0b ?shell=classic：不挂新外壳，文档里没有本版任何新节点（#flw-rowt / 角标 / 预览框 / 发布弹层 / 格式卡）', J(c));
    await close(pc);
  });

  /* ================= L1 L2 悬浮条排版内容 · 几何 · 行 2 ================= */
  if (want('L1') || want('L2')) for (const [w, h] of [[1280, 800], [1440, 900], [1920, 1080]]) await SAFE('L1', async () => {
    const pg = await open(w, h, { tag: 'L1-' + w });
    if (w === 1440) keys0.k = await EV(pg, () => __keys());
    await EV(pg, () => { __one(__P('送别')); FLOW.sbar.toggle({ exp: true }); });
    await EV(pg, () => { const sw = document.getElementById('score-wrap'); sw.scrollTop = 120; }); await pg.waitForTimeout(200);
    const w0 = await EV(pg, () => ({ st: document.getElementById('score-wrap').scrollTop, sb: __R('#flw-sbar') }));
    await eng(pg);
    const a = await EV(pg, () => { const sb = document.getElementById('flw-sbar'), bar = document.getElementById('flw-sb-bar'), pv = __R('#preview-ov'), ps = __R('#pv-stage'), r2 = __R('#editbar'), q = __R(sb);
      const kids = [...bar.querySelectorAll('button, select')].filter(x => __vis(x)).map(x => x.id || ('[' + x.dataset.fa + (x.dataset.v ? '=' + x.dataset.v : '') + (x.dataset.d ? ' ' + x.dataset.d : '') + ']'));
      return { cls: sb.classList.contains('flw-sb-m-engrave'), vis: __vis(sb), hit: __hit('#flw-sb-go'), kids, kind: !!document.getElementById('flw-sb-kind'), mel: bar.querySelectorAll('[data-fa="sbar:mel"]').length,
        geo: { b: q.b, pt: ps.y, l: q.x, r: q.r, pl: pv.x, pr: pv.r, t: q.y, r2b: r2.b }, ovf: bar.scrollWidth - bar.clientWidth, model: FLOW.sbar.model().mode, bars: (document.getElementById('flw-eng-bars') || {}).textContent,
        engVis: __vis('#flw-eng'), r2vis: [...document.querySelectorAll('#editbar > *')].filter(x => __vis(x) && x.getBoundingClientRect().width > 4).map(x => x.id || x.className.split(' ')[0]), ids: __ids() }; });
    const expK = ['flw-sb-page', '[lay:preset=compact]', '[lay:preset=standard]', '[lay:preset=loose]', '[lay:bars -1]', '[lay:bars 1]', 'flw-sb-go', 'flw-sb-dd', 'flw-sb-smart', 'flw-sb-tg'];
    const g = a.geo, geoOk = g.b <= g.pt + 1 && Math.abs(g.l - g.pl) <= 1 && Math.abs(g.r - g.pr) <= 1 && g.t >= g.r2b - 1;
    T('L1', a.cls && a.vis && a.hit && J(a.kids) === J(expK) && !a.kind && !a.mel && a.model === 'engrave' && geoOk && a.ovf <= 1 && /^\d+ 小节$/.test(a.bars || ''),
      'L1 ' + w + ' 进排版：悬浮条可见、主按钮命中、类 flw-sb-m-engrave；内容恰为 纸张 ▾ · 疏密三枚 · 每行 −N＋ · 修 N 处 + ▾ · 智能 ▾ · 收起（无谱类 ▾ / 记谱法）；条底 ≤ 预览顶、左右缘＝预览区、不压行 2、不溢出', J(a));
    if (w === 1440) await shot(pg, 'L1-engrave-1440');
    if (w === 1440) T('L2', !a.engVis && J(a.r2vis.filter(x => !/^(flw-modes|flw-mdd|seg-undo|flw-sep-undo|flw-cmdb|grow|eb-sep)$/.test(x))) === '[]' && !a.ids.length,
      'L2 行 2 排版只剩模式条 · 撤销 · 搜功能（#flw-eng 不显示）；全文档 id 唯一', J({ engVis: a.engVis, r2: a.r2vis, dupIds: a.ids }));
    await pg.click('#flw-mode-write'); await pg.waitForTimeout(700);
    const w1 = await EV(pg, () => ({ st: document.getElementById('score-wrap').scrollTop, sb: __R('#flw-sbar') }));
    T('L1', w1.st === w0.st && Math.abs(w1.sb.y - w0.sb.y) <= 1 && Math.abs(w1.sb.x - w0.sb.x) <= 1 && Math.abs(w1.sb.w - w0.sb.w) <= 1,
      'L1b ' + w + ' 回书写：悬浮条位置 / 宽与 #score-wrap scrollTop 与切换前相同', J({ w0, w1 }));
    await close(pg);
  });

  /* ================= L3 纸张 ▾ ================= */
  if (want('L3')) await SAFE('L3', async () => {
    const pg = await open(1440, 900, { tag: 'L3' });
    await EV(pg, () => __one(__P('送别'))); await eng(pg);
    const u0 = await EV(pg, () => undoStack.length);
    T('L3', await EV(pg, () => __vis('#flw-sb-page') && __hit('#flw-sb-page')), 'L3a 纸张 ▾ 在悬浮条上可见、命中', '');
    await pg.click('#flw-sb-page'); await pg.waitForTimeout(250);
    const m = await EV(pg, () => [...document.querySelectorAll('#popmenu [data-fa="lay:page"]')].map(x => x.dataset.v + ':' + x.getAttribute('aria-checked') + ':' + x.getAttribute('role')));
    await pg.click('#popmenu [data-fa="lay:page"][data-v="A5"]'); await pg.waitForTimeout(1300);
    const a = await EV(pg, () => ({ page: layoutCfg().page, n: PV.geo.n, pages: document.querySelectorAll('#pv-pages .pv-page').length, lab: (document.querySelector('#flw-sb-page .flw-sb-l') || {}).textContent, u: undoStack.length }));
    await pg.keyboard.press('Control+z'); await pg.waitForTimeout(1200);
    const z = await EV(pg, () => ({ page: layoutCfg().page, lab: (document.querySelector('#flw-sb-page .flw-sb-l') || {}).textContent }));
    T('L3', J(m) === J(['A5:false:menuitemradio', 'A4:true:menuitemradio', 'A3:false:menuitemradio']) && a.page === 'A5' && a.n === a.pages && a.lab === 'A5' && a.u === u0 + 1 && z.page === 'A4' && z.lab === 'A4',
      'L3 纸张 ▾ → 菜单 A5 / A4 / A3（menuitemradio、A4 选中）→ A5：layoutCfg().page＝A5、预览页数＝PV.geo.n、条上字 A5、撤销 +1；Ctrl+Z 复原 A4', J({ m, a, z, u0 }));
    await close(pg);
  });

  /* ================= L4 L6 L9 修 N 处（《送别》）================= */
  if (want('L4') || want('L6') || want('L9')) await SAFE('L4', async () => {
    const pg = await open(1440, 900, { tag: 'L4' });
    await EV(pg, () => __one(__P('送别'))); await eng(pg);
    const BRK = () => song.measures.map((m, i) => (m.brk === 1 || m.pgbrk === 1) ? i : -1).filter(i => i >= 0);
    const a = await EV(pg, BRK0 => ({ btn: (document.querySelector('#flw-sb-go .flw-sb-l') || {}).textContent, rows: FLOW.lay.report().rowsN, plan: FLOW.lay.fixPlan().map(x => x.how + ':' + x.mi + ':' + x.n), J0: JSON.stringify(song), u: undoStack.length,
      brk: new Function('return (' + BRK0 + ')()')() }), BRK.toString());
    await pg.click('#flw-sb-dd'); await pg.waitForTimeout(250);
    const dd = await EV(pg, () => [...document.querySelectorAll('#popmenu [data-fa="lay:fix1"]')].map(x => ({ t: (x.querySelector('.flw-ml') || x).textContent.trim(), ti: x.title })));
    await pg.hover('#popmenu [data-fa="lay:fix1"]'); await pg.waitForTimeout(650);
    const pv = await EV(pg, () => { const fx = [...document.querySelectorAll('#pv-pages .flw-pvfix')]; const S = FLOW.lay.report(); const pe = document.querySelector('#pv-pages .pv-page .pv-paper svg');
      const R = pe.getBoundingClientRect(), vb = pe.viewBox.baseVal, k = Math.min(R.width / vb.width, R.height / vb.height), Y = y => R.top + (y - vb.y) * k;
      const r3 = S.rows[2], r4 = S.rows[3], f = fx[0] && fx[0].getBoundingClientRect(), st = document.getElementById('pv-stage').getBoundingClientRect();
      return { n: fx.length, badge: fx[0] ? fx[0].textContent : '', cover: !!f && f.top <= Y(r3.y0) + 1 && f.bottom >= Y(r4.y1) - 1, inView: !!f && f.top >= st.top - 2 && f.top < st.bottom }; });
    await shot(pg, 'L4-fixpv-1440');
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
    const pv2 = await EV(pg, () => document.querySelectorAll('#pv-pages .flw-pvfix').length);
    T('L4', a.btn === '修 1 处' && a.rows === 4 && J(a.plan) === J(['merge:15:6']) && dd.length === 1 && dd[0].t === '并入第 16' && cnt(dd[0].t) <= 6 && cnt(dd[0].ti) <= 12 && pv.n === 1 && pv.badge === '→ 6 小节' && pv.cover && pv.inView && pv2 === 0,
      'L4a 《送别》：主按钮「修 1 处」；▾ 1 项「并入第 16」（≤6 字，悬停 ≤12）；悬停 ≥400ms 预览滚到那里、虚线框套住第 3–4 行、角标「→ 6 小节」；离开即撤', J({ a: Object.assign({}, a, { J0: undefined }), dd, pv, pv2 }));
    await pg.waitForTimeout(400);
    await pg.click('#flw-sb-go'); await pg.waitForTimeout(120);
    /* L6：主按钮换字「输出」后 600ms 内再点无效（防误点，仍在排版） */
    await pg.click('#flw-sb-go'); await pg.waitForTimeout(150);
    const c0 = await EV(pg, () => FLOW.mode.cur);
    await pg.waitForTimeout(1000);
    const b1 = await EV(pg, () => ({ rows: FLOW.lay.report().rowsN, u: undoStack.length, btn: (document.querySelector('#flw-sb-go .flw-sb-l') || {}).textContent, J: JSON.stringify(song), ms: __ms(), short: document.querySelectorAll('.flw-pvshort').length }));
    T('L4', b1.rows === 3 && b1.u === a.u + 1 && b1.btn === '输出' && b1.short === 0, 'L4b 点主按钮：末行并入、行数 4→3、一步撤销；角标消失；主按钮换成「输出」', J(Object.assign({}, b1, { J: undefined })));
    /* L4e（收尾 V1）：修过的行不是「锁定」——强制断点集合不变、没有行判成锁定、该行工具条「锁定」未按下 */
    const e1 = await EV(pg, BRK0 => { const rs = __rows(), z = rs[rs.length - 1]; FLOW.lay.pick(z[0], 0);
      const lk = document.getElementById('flw-eng-lock');
      return { rows: rs, brk: new Function('return (' + BRK0 + ')()')(), locked: rs.filter(r => sysRowLocked(r[0], r[1])).map(r => r.join('-')), lockBtn: lk && lk.getAttribute('aria-pressed'), lockTxt: lk && lk.textContent.trim() }; }, BRK.toString());
    T('L4', J(e1.brk) === J(a.brk) && !e1.locked.length && e1.lockBtn === 'false',
      'L4e 收尾 V1：「修 1 处」只写 pull——强制断点集合修前修后同为 ' + J(a.brk) + '、没有行判成锁定、末行（' + J(e1.rows[e1.rows.length - 1]) + '）工具条「锁定」aria-pressed=false', J(e1));
    await pg.keyboard.press('Control+z'); await pg.waitForTimeout(1300);
    const z = await EV(pg, () => ({ rows: FLOW.lay.report().rowsN, J: JSON.stringify(song), btn: (document.querySelector('#flw-sb-go .flw-sb-l') || {}).textContent }));
    T('L4', z.rows === 4 && z.J === a.J0 && z.btn === '修 1 处', 'L4c Ctrl+Z：回到 4 行、song 与修之前逐字节相同、主按钮回「修 1 处」', J({ rows: z.rows, same: z.J === a.J0, btn: z.btn }));
    /* L9 角标「并入」＝主按钮同结果 */
    const sh = await EV(pg, () => { const el = document.querySelector('#pv-pages .flw-pvshort'); if (!el) return null; const pe = el.closest('.pv-page'), svg = pe.querySelector('.pv-paper svg');
      const R = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, k = Math.min(R.width / vb.width, R.height / vb.height), ox = (R.width - vb.width * k) / 2, oy = (R.height - vb.height * k) / 2;
      const X = x => R.left + ox + x * k, Y = y => R.top + oy + (y - vb.y) * k, rep = FLOW.lay.report(), pg0 = [...document.querySelectorAll('#pv-pages > .pv-page')].indexOf(pe);
      /* 行墨迹：行范围（y0–y1）× 行内小节框（meaBoxes 是快照那一次的；这里用版面检查的行与每行首末小节框 → FLOW.lay 的 S.boxes 不外露，取 #pv-pages 里 svg 的墨迹 bbox 近似：该行 y 带内全部 svg 元素的并集） */
      const inks = rep.rows.filter(r => r.pg === pg0).map(r => { let x0 = 1e9, x1 = -1e9; svg.querySelectorAll('*').forEach(e => { if (!e.getBBox) return; let bb; try { bb = e.getBBox(); } catch (_) { return; } if (!(bb.width > 0 || bb.height > 0)) return;
          const cy = bb.y + bb.height / 2; if (cy < r.y0 || cy > r.y1) return; if (bb.width > vb.width * 0.95) return; x0 = Math.min(x0, bb.x); x1 = Math.max(x1, bb.x + bb.width); });
        return { x: X(x0), r: X(x1), y: Y(r.y0), b: Y(r.y1) }; });
      const q = el.getBoundingClientRect(), box = { x: q.left, r: q.right, y: q.top, b: q.bottom };
      return { vis: __vis(el), txt: [...el.childNodes].map(n => n.textContent.replace(/[\s⚠]+/g, ' ').trim()).filter(Boolean).join(' '), ix: inks.map(i => Math.round(__ix(box, i))), btn: (el.querySelector('[data-fa="lay:shortjoin"]') || {}).getAttribute && el.querySelector('[data-fa="lay:shortjoin"]').getAttribute('aria-disabled') }; });
    await pg.click('#pv-pages .flw-pvshort [data-fa="lay:shortjoin"]'); await pg.waitForTimeout(1300);
    const c1 = await EV(pg, () => ({ J: JSON.stringify(song), rows: FLOW.lay.report().rowsN }));
    T('L9', !!sh && sh.vis && sh.txt === '末行短 并入' && sh.ix.every(v => v === 0) && sh.btn === null && c1.rows === 3 && c1.J === b1.J,
      'L9 末行短角标：可见「末行短 · 并入」、与第 1 页所有谱行墨迹相交 0；点「并入」＝主按钮「修 1 处」同结果（song 逐字节）', J({ sh, rows: c1.rows, same: c1.J === b1.J }));
    await pg.waitForTimeout(700);
    await pg.click('#flw-sb-go'); await pg.waitForTimeout(1200);
    const c2 = await EV(pg, () => FLOW.mode.cur);
    T('L6', c0 === 'engrave' && c2 === 'output', 'L6 修完 N=0 → 主按钮「输出」：换字后 600ms 内点击无效（仍在排版）；之后点 → 进输出（TCH-7）', J({ c0, c2 }));
    /* L4d 末小节 16 个十六分音符（末行单小节、宽过半行）：「并入第 16」同样修好 */
    await EV(pg, () => { setMode('write'); __one(__dense()); }); await pg.waitForTimeout(300); await eng(pg);
    const d0 = await EV(pg, () => ({ iss: FLOW.lay.report().issues.map(x => x.k + ':' + x.mi), plan: FLOW.lay.fixPlan().map(x => x.how + ':' + x.mi), btn: (document.querySelector('#flw-sb-go .flw-sb-l') || {}).textContent }));
    await pg.waitForTimeout(400); await pg.click('#flw-sb-go'); await pg.waitForTimeout(1300);
    const d1 = await EV(pg, () => ({ rows: __rows(), iss: FLOW.lay.report().issues.length }));
    T('L4', J(d0.iss) === J(['single:15']) && J(d0.plan) === J(['join:15']) && d0.btn === '修 1 处' && J(d1.rows[d1.rows.length - 1]) === J([10, 15]) && d1.iss === 0,
      'L4d 末小节 16 个十六分音符：末行单小节（宽过半行，算「单小节行」）→「修 1 处」＝并入上一行，修后末行 [11–16]、版面检查没有问题', J({ d0, d1 }));
    await close(pg);
  });

  /* ================= L5 不越过锁定行与手动换行 ================= */
  if (want('L5')) await SAFE('L5', async () => {
    const pg = await open(1440, 900, { tag: 'L5' });
    /* a 锁住第 3 行（末行的上一行） */
    await EV(pg, () => { __one(__P('送别')); sysLockRow(10, 14, true); }); await eng(pg);
    const a = await EV(pg, () => ({ lk: sysRowLocked(10, 14), plan: FLOW.lay.fixPlan().length, btn: (document.querySelector('#flw-sb-go .flw-sb-l') || {}).textContent, dd: !!document.getElementById('flw-sb-dd'),
      sj: (b => b && [b.getAttribute('aria-disabled'), b.dataset.why])(document.querySelector('.flw-pvshort [data-fa="lay:shortjoin"]')), tr: FLOW.lay.fixTry('short', 15) }));
    const J0 = await EV(pg, () => JSON.stringify(song));
    await pg.click('.flw-pvshort [data-fa="lay:shortjoin"]', { force: true }); await pg.waitForTimeout(600);
    const a2 = await EV(pg, () => ({ same: JSON.stringify(song), t: __toasts.slice(-1)[0] }));
    T('L5', a.lk && a.plan === 0 && a.btn === '输出' && !a.dd && J(a.sj) === J(['true', '上一行已锁定']) && a.tr.why === '上一行已锁定' && a2.same === J0 && a2.t === '上一行已锁定',
      'L5a 锁住第 3 行：末行短这一处不计入 N（N＝0，主按钮「输出」、无 ▾）；角标「并入」aria-disabled 原因「上一行已锁定」、点了只说原因不改谱', J({ a, t: a2.t, same: a2.same === J0 }));
    /* b 第 3 / 4 行之间手动「此处换行」 */
    await EV(pg, () => { setMode('write'); __one(__P('送别')); sysBreakAt(15); }); await pg.waitForTimeout(200); await eng(pg);
    const bq = await EV(pg, () => ({ brk: song.measures[14].brk, plan: FLOW.lay.fixPlan().length, btn: (document.querySelector('#flw-sb-go .flw-sb-l') || {}).textContent, tr: FLOW.lay.fixTry('short', 15),
      sj: (b => b && [b.getAttribute('aria-disabled'), b.dataset.why])(document.querySelector('.flw-pvshort [data-fa="lay:shortjoin"]')) }));
    T('L5', bq.brk === 1 && bq.plan === 0 && bq.btn === '输出' && bq.tr.why === '有手动换行' && J(bq.sj) === J(['true', '有手动换行']),
      'L5b 第 15 / 16 小节之间是手动「此处换行」：末行短不计入 N（N＝0）、角标「并入」灰显「有手动换行」', J(bq));
    /* c 锁住第 2 行 + 第 1 / 2 行之间手动换行；末行单小节（可修）→ 修后锁定行 [m1,m2] 不变、所有既有 brk / pgbrk 仍在 */
    await EV(pg, () => { setMode('write'); __one(__dense()); sysBreakAt(5); }); await pg.waitForTimeout(200);
    const c0 = await EV(pg, () => { const r = __rows(); const r2 = r[1]; sysLockRow(r2[0], r2[1], true); return { rows: __rows(), lk: sysRowLocked(r2[0], r2[1]), r2 }; });
    await eng(pg);
    const c1 = await EV(pg, () => ({ plan: FLOW.lay.fixPlan().map(x => x.how + ':' + x.mi), brks: song.measures.map((m, i) => (m.brk === 1 || m.pgbrk === 1) ? i : -1).filter(i => i >= 0) }));
    await pg.waitForTimeout(400); await pg.click('#flw-sb-go'); await pg.waitForTimeout(1300);
    const c2 = await EV(pg, r2 => ({ rows: __rows(), lk: sysRowLocked(r2[0], r2[1]), brks: song.measures.map((m, i) => (m.brk === 1 || m.pgbrk === 1) ? i : -1).filter(i => i >= 0), iss: FLOW.lay.report().issues.map(x => x.k) }), c0.r2);
    const kept = c1.brks.every(i => c2.brks.includes(i)), r2same = c2.rows.some(r => r[0] === c0.r2[0] && r[1] === c0.r2[1]);
    T('L5', c0.lk && J(c1.plan) === J(['join:15']) && kept && r2same && c2.lk && !c2.iss.includes('single'),
      'L5c 锁住第 2 行 + 第 5 / 6 小节手动换行、末行单小节：修 1 处后第 2 行仍是 [' + c0.r2 + ']（仍锁定）、修前所有 brk / pgbrk 修后仍为 1、末行问题消失', J({ c0, c1, c2 }));
    await close(pg);
  });

  /* ================= L7 L8 行工具条 ================= */
  if (want('L7') || want('L8')) await SAFE('L7', async () => {
    const pg = await open(1440, 900, { tag: 'L7' });
    await EV(pg, () => __one(__P('送别'))); await eng(pg);
    const a = await EV(pg, () => { const t = document.getElementById('flw-rowt'), f = document.querySelector('#pv-pages .flw-pvs');
      const bs = [...t.querySelectorAll('button')].map(x => ({ id: x.id, fa: x.dataset.fa, t: (x.querySelector('.flw-rtl') || {}).textContent, ti: x.title, dis: x.getAttribute('aria-disabled'), vis: __vis(x), hit: __hit(x) }));
      return { vis: __vis(t), ix: __ix(__R(t), __R(f)), below: __R(t).y >= __R(f).b - 1, bs }; });
    const ids = a.bs.map(x => x.id).join(',');
    T('L7', a.vis && a.ix === 0 && ids === 'flw-eng-brk,flw-eng-join,flw-eng-lock,flw-eng-pbrk,flw-rowt-reset' && a.bs.every(x => x.vis && x.hit && cnt(x.t) <= 4 && cnt(x.dis === 'true' ? x.ti.replace(/（[^（）]*）$/, '') : x.ti) <= 12)
      && a.bs.map(x => x.t).join(' ') === '换行 并入 锁定 换页 复原',
      'L7a 进排版即在当前行出行工具条（不等点击）、与当前行框相交 0；五键「换行 并入 锁定 换页 复原」＝同 id 搬家（#flw-eng-brk / -join / -lock / -pbrk + #flw-rowt-reset）、都可见可点、字 ≤4、悬停 ≤12（灰显的按 setD 口径「名称（原因）」，名称部分 ≤12）', J(a));
    await shot(pg, 'L7-rowt-1440');
    /* 点预览第 2 行 → 工具条跟过去；悬停第 3 行出淡行框 */
    const p2 = await EV(pg, () => { const R = FLOW.lay.report(), r = R.rows[1], svg = document.querySelector('#pv-pages .pv-page .pv-paper svg'), q = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, k = Math.min(q.width / vb.width, q.height / vb.height);
      return { x: q.left + (q.width - vb.width * k) / 2 + vb.width * k * 0.5, y: q.top + (q.height - vb.height * k) / 2 + ((r.y0 + r.y1) / 2 - vb.y) * k, y3: q.top + (q.height - vb.height * k) / 2 + ((R.rows[2].y0 + R.rows[2].y1) / 2 - vb.y) * k }; });
    await pg.mouse.click(p2.x, p2.y); await pg.waitForTimeout(400);
    const b = await EV(pg, () => { const t = __R('#flw-rowt'), f = __R('#pv-pages .flw-pvs'), r = FLOW.lay.report().rows; return { mi: sel.mi, r2: r[1].m1 + '-' + r[1].m2, ix: __ix(t, f), near: t.y >= f.b - 1 && t.y - f.b < 30, t }; });
    await pg.mouse.move(p2.x, p2.y3); await pg.waitForTimeout(300);
    const c = await EV(pg, () => ({ hov: [...document.querySelectorAll('#pv-pages .flw-pvhov')].map(e => __R(e)), t: __R('#flw-rowt') }));
    T('L7', b.mi >= 5 && b.mi <= 9 && b.ix === 0 && b.near && c.hov.length === 1 && Math.abs(c.t.y - b.t.y) < 1,
      'L7b 点预览第 2 行 → 选中那一行、工具条跟到它正下方；悬停第 3 行出一个淡行框 .flw-pvhov、工具条不动', J({ b, c }));
    await close(pg);
    /* L8 与 v69.0 行 2 同名键逐字节同 */
    if (!BASEU) { if (IN_CI) T('L8', false, 'L8 拿不到基线 ' + BASE_COMMIT.slice(0, 7) + '（CI 里判红）', ''); else NOTE('L8', '⏭ 基线页拿不到（MUSETAB_BASE=none），跳过 L8'); return; }
    const seq = [['lay:brk', 7], ['lay:join', 7], ['lay:lock', 7], ['lay:pbrk', 7], ['lay:lock', 7], ['lay:reset', 7], ['lay:brk', 12], ['lay:pbrk', 12]];
    const run = async (url, nx) => { const p = await open(1440, 900, { url, tag: 'L8' + (nx ? '' : '-base') }); await EV(p, () => __one(__P('送别'))); await eng(p); const out = [];
      const d0 = await EV(p, () => { const q = id => { const e = document.getElementById(id); return e ? [e.getAttribute('aria-disabled'), e.dataset.why || ''] : null; }; return { join: q('flw-eng-join'), pbrk: q('flw-eng-pbrk') }; });
      for (const [fa, mi] of seq) { await EV(p, mi => FLOW.lay.pick(mi, 0), mi); await p.waitForTimeout(250);
        const id = { 'lay:brk': 'flw-eng-brk', 'lay:join': 'flw-eng-join', 'lay:lock': 'flw-eng-lock', 'lay:pbrk': 'flw-eng-pbrk' }[fa];
        if (fa === 'lay:reset') { if (nx) await p.click('#flw-rowt-reset'); else await p.click('#flw-rp-lay [data-fa="lay:reset"]'); }
        else await p.click('#' + id);
        await p.waitForTimeout(900); out.push(await EV(p, () => JSON.stringify(song.measures))); }
      await close(p); return { d0, out }; };
    const bse = await run(BASEU, false), now = await run(URL0, true);
    const diff = bse.out.map((x, i) => x === now.out[i] ? '' : seq[i].join('@')).filter(Boolean);
    T('L8', !diff.length && J(bse.d0) === J(now.d0) && now.d0.join[0] === 'true' && now.d0.pbrk[0] === 'true',
      'L8 行工具条各键（换行 · 并入 · 锁定 / 解锁 · 换页 · 复原）结果与 v69.0 行 2 同名键（复原＝原右栏「本行恢复默认」）逐字节同（' + seq.length + ' 步）；第 1 行「并入」「换页」灰显原因同 v69.0', J({ diff, d0: [bse.d0, now.d0] }));
  });

  /* ================= L10 去重 + 说明字 0 ================= */
  if (want('L10')) await SAFE('L10', async () => {
    const pg = await open(1440, 900, { tag: 'L10' });
    await EV(pg, () => __one(__P('送别'))); await eng(pg);
    /* v69.1 集成（A 轨 D5）：新形态右栏默认带字竖条（1440 也不停靠）——先断言竖条「版式」键可见再真点开（浮出），再量版式页 */
    const rsv = await EV(pg, () => FLOW.rd.dockOn() ? 'dock' : (__vis('#flw-rstrip [data-fa="rd:tab"][data-p="lay"]') ? 'strip' : 'none'));
    if (rsv === 'strip') { await pg.click('#flw-rstrip [data-fa="rd:tab"][data-p="lay"]'); await pg.waitForTimeout(400); }
    const a = await EV(pg, () => { const vis = s => [...document.querySelectorAll(s)].filter(x => __vis(x)).length; const fx = document.querySelector('#lp-fix button[data-fix="1"]'), sv = document.getElementById('lp-sval');
      const lab = sv && sv.parentNode.querySelector('span');
      return { page: vis('[data-fa="lay:page"]'), pageBtn: vis('#flw-sb-page'), preset: vis('[data-fa="lay:preset"]'), lpPreset: vis('#lp-preset button'), lpPage: vis('#lp-page button'), bars: vis('[data-fa="lay:bars"]'), scale: vis('[data-fa="lay:scale"]'),
        scaleIn: [...document.querySelectorAll('[data-fa="lay:scale"]')].filter(x => __vis(x)).every(x => x.closest('#flw-rp-lay')), rowh: !!document.getElementById('flw-lay-rowh'), hd: !!document.querySelector('[data-fa="lay:hd"]'),
        hdh: (document.getElementById('flw-lay-hdh') || {}).textContent, fix: fx && [fx.textContent, fx.title], lab: lab && lab.textContent, sval: sv && sv.tagName }; });
    await pg.click('#flw-rp-lay .flw-lpb[data-d="1"]'); await pg.waitForTimeout(900);
    const s1 = await EV(pg, () => ({ sc: layoutCfg().scale, v: (document.getElementById('lp-sval') || {}).textContent }));
    await pg.click('#lp-sval'); await pg.waitForTimeout(200); await pg.keyboard.press('Control+a'); await pg.keyboard.type('100'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(900);
    const s2 = await EV(pg, () => ({ sc: layoutCfg().scale, v: (document.getElementById('lp-sval') || {}).textContent }));
    T('L10', rsv !== 'none' && a.page === 0 && a.pageBtn === 1 && a.preset === 3 && a.lpPreset === 0 && a.lpPage === 0 && a.bars === 2 && a.scale === 2 && a.scaleIn && !a.rowh && !a.hd && a.hdh === '页码'
      && J(a.fix) === J(['固定', '固定版宽 · 与打印一致']) && a.lab === '内容大小' && s1.sc === 1.1 && s1.v === '110%' && s2.sc === 1 && s2.v === '100%',
      'L10a 同名控件各一处：纸张＝悬浮条「A4 ▾」、疏密三枚＝悬浮条、每行 ± ＝悬浮条、内容大小 − ＋＝版式页（一步 10%，值 #lp-sval 点了就地输入 100 回到 100%）；版式页无「本行」区、无「页头…」、区名「页码」；「固定」+ 悬停「固定版宽 · 与打印一致」',
      J({ rsv, a, s1, s2 }));
    await close(pg);
    const st = await runState(b, { id: 'engrave', name: '排版模式', go: async p => { await p.evaluate(() => __scn('songbie')); await W(800); await p.click('#flw-mode-engrave'); await W(1800); } }, { base: URL0 });
    const x = M.screen(st);
    const norm = t => String(t).replace(/[…▾›\s·]/g, '').replace(/^＋/, '');
    const by = {}; (st.clicks || []).filter(c => !c.occ && c.region !== 'menu:cmd').forEach(c => { const n = norm(c.label); if (!n || /^\d+$/.test(n) || n.length < 2) return; (by[n] = by[n] || new Set()).add(c.region); });
    const dups = Object.entries(by).filter(([k, v]) => v.size >= 2 && !((k === '输出' || k === '排版') && [...v].sort().join() === 'row2,sbar')).map(([k, v]) => k + '×' + [...v].join('/'));
    T('L10', !dups.length && x.desc === 0 && x.p3 === 0 && !st.err, 'L10b 排版屏（textaudit 单屏抽取）：屏内同名组 0（命令面板不计、主按钮 × 模式条放行）、说明字 0（TBA9）、P3 指路 0；总字 ' + x.total + ' · 悬停 ' + x.hoverChars,
      J({ dups, desc: x.desc, descTexts: (st.groups || []).filter(g => g.k === 'desc' && !g.occ).map(g => g.region + ':' + g.text), p3: x._p3, err: st.err }));
  });

  /* ================= L11 键盘 ================= */
  if (want('L11')) await SAFE('L11', async () => {
    const pg = await open(1440, 900, { tag: 'L11' });
    await EV(pg, () => __one(__P('送别'))); await eng(pg);
    await EV(pg, () => { const ps = document.getElementById('pv-stage'); ps.scrollTop = 0; ps.focus(); });
    const s0 = await EV(pg, () => { const ps = document.getElementById('pv-stage'); return { mi: sel.mi, st: ps.scrollTop, can: ps.scrollHeight > ps.clientHeight + 4 }; });
    /* 收尾 V2：#pv-stage 聚焦时 ↓ 照 v69.0 原生滚动（不换行、不拦截） */
    await EV(pg, () => { window.__dp = null; document.getElementById('pv-stage').addEventListener('keydown', e => { setTimeout(() => { window.__dp = e.defaultPrevented; }, 0); }, { once: true }); });
    await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(250);
    const s1 = await EV(pg, () => ({ mi: sel.mi, st: document.getElementById('pv-stage').scrollTop, dp: window.__dp, ae: document.activeElement.id }));
    T('L11', s1.mi === s0.mi && s1.dp === false && s1.ae === 'pv-stage' && (!s0.can || s1.st > s0.st),
      'L11a 收尾 V2：#pv-stage 聚焦按 ↓ ＝v69.0 原生滚动预览（sel.mi 不变、按键未被拦截' + (s0.can ? '、scrollTop ' + s0.st + '→' + s1.st : '') + '）', J({ s0, s1 }));
    await EV(pg, () => { const ps = document.getElementById('pv-stage'); ps.focus(); });
    await pg.keyboard.press('Tab'); await pg.waitForTimeout(150);
    const t1 = await EV(pg, () => ({ id: document.activeElement.id, inT: !!document.activeElement.closest('#flw-rowt') }));
    await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(250);
    const a1 = await EV(pg, () => ({ mi: sel.mi, ae: document.activeElement.id }));
    await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(250);
    const a2 = await EV(pg, () => sel.mi);
    await pg.keyboard.press('ArrowUp'); await pg.waitForTimeout(250);
    const a3 = await EV(pg, () => ({ mi: sel.mi, ae: document.activeElement.id }));
    await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(100);
    const t2 = await EV(pg, () => document.activeElement.id);
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(150);
    const t3 = await EV(pg, () => ({ id: document.activeElement.id, mode: FLOW.mode.cur }));
    const n0 = await EV(pg, () => JSON.stringify(song));
    await pg.keyboard.press('5'); await pg.waitForTimeout(700);
    const t4 = await EV(pg, n0 => ({ mode: FLOW.mode.cur, changed: JSON.stringify(song) !== n0 }), n0);
    T('L11', t1.inT && t1.id === 'flw-eng-brk' && a1.mi === 5 && a1.ae === 'flw-eng-brk' && a2 === 10 && a3.mi === 5 && a3.ae === 'flw-eng-brk' && t2 === 'flw-eng-join' && t3.id === 'pv-stage' && t3.mode === 'engrave' && t4.mode === 'write' && t4.changed,
      'L11b Tab 进行工具条（换行）；工具条上 ↓ 换到第 2 行（sel.mi 5）、再 ↓ 第 3 行（10）、↑ 回第 2 行，焦点留在「换行」；→ 到「并入」、Esc 回预览区（仍在排版）；数字键 5 回书写落音（M3 不变）', J({ a1, a2, a3, t1, t2, t3, t4 }));
    await close(pg);
  });

  /* ================= L12 打印 / 快照 / #score ================= */
  if (want('L12')) await SAFE('L12', async () => {
    const pg = await open(1440, 900, { tag: 'L12' });
    await EV(pg, () => __one(__P('送别')));
    const s0 = await EV(pg, () => document.getElementById('score').innerHTML);
    await eng(pg);
    await pg.hover('#flw-sb-go'); await pg.waitForTimeout(600);
    const n = await EV(pg, () => ({ rowt: !!document.getElementById('flw-rowt'), fix: document.querySelectorAll('.flw-pvfix').length, short: document.querySelectorAll('.flw-pvshort').length }));
    await pg.emulateMedia({ media: 'print' });
    const pr = await EV(pg, () => ['#flw-rowt', '.flw-pvfix', '.flw-pvshort'].map(s => { const e = document.querySelector(s); return e ? getComputedStyle(e).display : 'none'; }));
    await pg.emulateMedia({ media: 'screen' });
    const snap = await EV(pg, () => { const d = new DOMParser().parseFromString(FLOW.snapHTML(), 'text/html'); return d.querySelectorAll('#flw-rowt, .flw-pvfix, .flw-pvshort, .flw-pvhov, .flw-lpb, [data-flw-txt0]').length + '|' + ((d.querySelector('#lp-fix button[data-fix="1"]') || {}).textContent || ''); });
    await pg.click('#flw-mode-write'); await pg.waitForTimeout(800);
    const s1 = await EV(pg, () => document.getElementById('score').innerHTML);
    T('L12', n.rowt && n.fix >= 1 && n.short === 1 && pr.every(d => d === 'none') && snap === '0|固定（与打印一致）' && s1 === s0,
      'L12 打印媒体下行工具条 / 预览框 / 角标 display:none；FLOW.snapHTML 不带它们、「版式」页共享节点换回原文「固定（与打印一致）」；书写 #score 进出排版前后逐字节相同', J({ n, pr, snap, same: s1 === s0 }));
    await close(pg);
  });

  /* ================= L13 命令面板 ================= */
  if (want('L13')) await SAFE('L13', async () => {
    const res = [];
    for (const via of ['cmd', 'rowt']) {
      const pg = await open(1440, 900, { tag: 'L13-' + via });
      await EV(pg, () => __one(__P('送别')));
      const out = [];
      for (const [id, q, mi] of [['lay:brk', '此处换行', 7], ['lay:pull', '并入上一行', 7], ['lay:lock', '锁定此行', 2]]) {
        if (via === 'cmd') { await EV(pg, mi => { setMode('write'); sel.mi = mi; sel.ci = 0; clampSel(); render(); }, mi); await pg.waitForTimeout(250);
          await pg.keyboard.press('Control+Slash'); await pg.waitForTimeout(250); await pg.keyboard.type(q); await pg.waitForTimeout(250); await pg.keyboard.press('Enter'); await pg.waitForTimeout(1200); }
        else { await EV(pg, mi => { setMode('write'); sel.mi = mi; sel.ci = 0; clampSel(); render(); }, mi); await pg.waitForTimeout(250); await eng(pg);
          await pg.click('#' + { 'lay:brk': 'flw-eng-brk', 'lay:pull': 'flw-eng-join', 'lay:lock': 'flw-eng-lock' }[id]); await pg.waitForTimeout(1000); }
        out.push(await EV(pg, () => ({ m: JSON.stringify(song.measures), mode: FLOW.mode.cur })));
      }
      res.push(out); await close(pg);
    }
    const same = res[0].map((x, i) => x.m === res[1][i].m);
    T('L13', same.every(Boolean) && res[0].every(x => x.mode === 'engrave'), 'L13 命令面板「此处换行 / 并入上一行 / 锁定此行」Enter：先进排版，结果与行工具条同名键逐字节同', J({ same, modes: res[0].map(x => x.mode) }));
    NOTE('L13', '↑↓ 描边落在悬浮条 / 行工具条的真实控件：命令面板的描边表（FLOW.cmd AT）由 C 轨按规格 §5 C3 迁移表改，集成后在 tv_uicmd / 本条复核');
  });

  /* ================= RL 数据红线 ================= */
  if (want('RL') && keys0.k) await SAFE('RL', async () => {
    const pg = await open(1440, 900, { tag: 'RL' });
    const k0 = await EV(pg, () => __keys());
    await EV(pg, () => __one(__P('送别'))); await eng(pg);
    await pg.click('#flw-sb-page'); await pg.waitForTimeout(200); await pg.keyboard.press('Escape');
    await pg.hover('#flw-sb-go'); await pg.waitForTimeout(500);
    await pg.waitForTimeout(300); await pg.click('#flw-sb-go'); await pg.waitForTimeout(1200);
    await pg.click('#flw-mode-write'); await pg.waitForTimeout(500);
    const k1 = await EV(pg, () => __keys());
    const f = await EV(pg, () => { const S = new Set(); song.measures.forEach(m => Object.keys(m).forEach(k => S.add(k))); return [...S].sort(); });
    const base = await EV(pg, () => { const S = new Set(); __P('送别').measures.forEach(m => Object.keys(m).forEach(k => S.add(k))); return [...S].sort(); });
    const nf = f.filter(k => !base.includes(k)), nk = k1.filter(k => !k0.includes(k) && !KNOWN.has(k));
    T('RL', nf.every(k => k === 'brk' || k === 'pull') && !nk.length, 'RL 排版一圈（纸张 ▾、预览、修 1 处、回书写）：小节只多 brk / pull、不新增 musetab-* 本机键', J({ nf, nk }));
    await close(pg);
  });

  await b.close();
  Object.keys(OUT).forEach(k => OUT[k].forEach(l => console.log(l)));
  if (errs.length) { total++; console.log('❌ 页面错误 ' + errs.length + '：' + errs.slice(0, 5).join(' | ')); } else { total++; pass++; console.log('✅ 页面错误 0'); }
  console.log(`\ntv_layout2: ${pass}/${total}` + (fails.length ? '\n失败：' + fails.join('；') : ''));
  process.exit(pass === total ? 0 : 1);
})();
