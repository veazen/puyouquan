'use strict';
/* v68.6 B 轨（界面）：「按演奏者出分谱」的界面断言（规格 docs/spec-2026-10-parts.md §1 / §3.9 / §6.3 PU1–PU15）。几何断言优先、真实点击 / 按键，file:// 直载。
   分谱＝只读派生副本：不新增 song 字段、不新增 musetab-* 本机键，绝不经过 mutate / persist / 撤销栈；缺省（不进分谱视图、不发起分谱打印）与 v68.5 逐字节相同。
   引擎（A 轨：partSong / partRender / partReport / EXPORT_ACT.parts / partPng / partJobNow / beforeprint）与界面同在被测页：全部断言缺省即判，
   不装替身引擎、不按引擎在场与否跳过（v68.6 集成：B 轨单独提交时的引擎探针、替身 partRender 与跳过开关已删）。标「（引擎）」的断言依赖引擎的真实排版结果。
   PU1  单演奏者（钢琴独奏 · 《送别》· 和弦谱）：#flw-out-parts aria-disabled、原因「只有一位演奏者」，真实点击 toast 同一句（#toast role=status），不导出、不打印；
        命令面板「打印分谱」ok()＝同一句；左栏一行灰字「〈谱名〉 · 一位演奏者」（谱名＝NWB.kindOfSong(song).name）；没有勾选框、没有「即将推出」
   PU2  多演奏者（两只老虎 · SATB＋钢琴）：列表结构（总谱行 + 逐份一行；每行原生 checkbox 在名称键之前）、全选框三态、aria-current 在总谱；缺省勾选（可选份不勾、总谱不勾）；
        徽标＝已勾份数；钢琴份等于总谱时名称后「· 总谱」、合并份缩进；全不勾时键灰显、原因「先勾选分谱」、徽标不出、点了 toast 同一句
   PU3  切预览：点名称键 → FLOW.out.cur、aria-current 换到这一份；PV.cks===null、PV.geo.n＝这一份页数、.pv-cap「第 1 / n 页」、右栏「共 n 页」、snapSig 带「|part:id|0」；
        看分谱时「打印 / 存 PDF」title＝「打印〈名称〉」、分享卡 / 互动谱 / MusicXML / MIDI / 曲谱文件＝「〈键名〉 · 总谱」、PNG 不变；
        （引擎）预览页里有 .pgpart、「页面」区＝pagesHTML(partReport(last))；钢琴份（scoreEq）＝总谱快照、「共 n 页」
   PU4  编辑：看分谱时删末尾空小节（真实点「删除这 2 个空小节」）→ 仍看这一份、预览已更新；Ctrl+Z 后同样（引擎：sysMea 末小节随之变）
   PU5  回总谱：点「总谱」→ PV.content、PV.geo、snapSig 与切换前逐字节相同，snapSig 无「|part:」
   PU6  生命周期：回书写再进输出 → 视图是总谱、勾选还在；切窗口 → 视图回总谱、新窗口按缺省勾选、切回原窗口勾选还在；删轨让当前 id 失效 → 静默回总谱、无报错
   PU7  打印对象：看分谱点「打印 / 存 PDF」→ setPrintPage(纸张) 后 print（引擎：partJobNow()＝{ids:[当前], view}）；看总谱同 M8a（setPrintPage(A4) print，无任务）；
        「分谱」键＝EXPORT_ACT.parts(纸张, 勾选集)（勾了总谱时总谱在最前；纸张跟右栏）；看分谱点「图片 PNG」＝EXPORT_ACT.partPng(id)，看总谱＝EXPORT_ACT.png()
   PU8  沿用总谱换行：开关只在 ≥2 份且总谱有 brk / pull 时出现（单演奏者、没有手动换行都不出）；勾上 → FLOW.out.brk、snapSig「|1」；
        （引擎）勾上后这一份在总谱换行处另起一行、缓存里两个键（…|0 与 …|1）
   PU9  键盘与读屏：Tab 顺序（勾选框在名称键之前）；勾选框上空格切换、焦点不动；名称键上 Enter 预览、焦点留在这个键上（不被抢到预览区）
   PU10 无持久化：整套分谱操作（勾选 / 全选 / 切视图 / 沿用换行 / 打印 / PNG / 「分谱」键）前后 song JSON、撤销 / 重做栈长度、保存状态、全部 musetab-* 键值、
        书写态 #score.innerHTML 逐字节相同
   PU11 旧外壳 ?shell=classic：《送别》打印弹窗 innerHTML 与基线（tests/parts_ref.json＝v68.5）逐字节相同；两只老虎：「打印存档」后多一组 [data-grp="parts"]，
        下拉 4 项（全部分谱（3 份）＋逐份），选一份「打印分谱」＝EXPORT_ACT.parts(纸张, [id], 关弹窗)、选「全部」＝缺省集；（引擎）PART_JOB.ids 对；没有任何 flw-out / 勾选框 DOM
   PU12 手机 390×844：《送别》「输出与分享」抽屉 4 项、HTML 与基线逐字节相同；两只老虎 5 项，末项「分谱 · 全部 3 份 · A4」，点了＝setPrintPage(A4) 加 EXPORT_ACT.parts('A4', 缺省集)
   PU13 文案预算：新增按钮 ≤4 字、悬停 / 读屏名的固定部分 ≤12 字、toast ≤12 字；新文案里没有位置词；全文件（更新日志历史条目除外）同一行里「分谱」与「即将推出 / 下一批」为 0；
        跑 deploy/check-wording.js 退出码 0
   PU14 埋点：out:parts · out:view · out:score · out:chk · out:chkall · out:brk（以及命令面板 cmd:go:out:score）都过 FLOW.track 的格式过滤（norm(id)===id），不带分谱名
   PU15 截图与几何（1440 浅 / 深）：列表行在左栏内、勾选框与名称键不相交、名称键 ≥30 高、徽标在键内、开关在右栏内；SHOTS=目录 时存 JT 带夹 3 品（人声份 · 吉他份）、
        SATB＋钢琴（女低音份）、旧外壳弹窗、手机抽屉、打印切片（引擎）各一张
   PU16 收尾（验收 UX）：窄档看分谱时视口里有分谱名（竖条键 / 状态栏 / 页脚）；「分谱」键悬停时勾上的行描边；当前项灰字对比度 ≥4.5；深色勾选框 color-scheme；
        看分谱时导出提示加「（总谱）」；「沿用总谱换行」悬停范围；命令面板「预览总谱」后焦点在预览区
   v69.1 B（规格 f91 §4 B2.1 / B2.2 / §6.2）有意迁移：新形态「分谱」是输出悬浮条「总谱 | 分谱」分段（同 id #flw-out-parts，徽标同；选中＝主按钮「存 PDF」打勾选的分谱，
        没勾时主按钮 #flw-sb-go 灰显「先勾选分谱」）、纸张 #flw-out-psize / 页数 #flw-out-pages 在条上、7 个导出键是左栏格式卡（同 id）、「沿用总谱换行」在左栏分谱表头下；
        PU1 / PU2 / PU3 / PU7 / PU10 / PU14 两种形态各跑（?next=0＝原断言），PU13 / PU15 按形态取读数与容器
   RL   数据红线：song 字段集合不变、不新增 musetab-* 本机键（对基线提交源码里出现过的键名）
   env：MUSETAB_URL 被测页（缺省 ../index.html）· ONLY=PU1,PU3 · SHOTS=目录· PARTS_REF 基线页（缺省按 parts_ref.json 的提交 git show；PARTS_REF=none 跳过，CI 里拿不到判红） */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => { const i = u.indexOf('#'), base = i >= 0 ? u.slice(0, i) : u, h = i >= 0 ? u.slice(i) : ''; return base + (base.includes('?') ? '&' : '?') + q + h; };
const NX0U = withQ(URL0, 'next=0');   /* v69.1 B：?next=0＝v69.0 形态（原断言在这里跑） */
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const SHOTS = process.env.SHOTS || '';
const J = x => JSON.stringify(x);
const ROOT = path.resolve(__dirname, '..', '..');
/* 基线（§6.4）：parts_ref.json 的完整 SHA（v68.5）；页面落到临时目录（与 tv_parts 同名，共用缓存） */
const REFJ = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'parts_ref.json'), 'utf8')); } catch (_) { return {}; } })();
const REF_COMMIT = process.env.PARTS_REF_COMMIT || REFJ.commit || 'c923d00d36e9bed94a029ecf4af6d615245fa864';
const IN_CI = !!process.env.CI && process.env.PARTS_REF !== 'none';
let REF_SRC = '';
let REF = process.env.PARTS_REF && process.env.PARTS_REF !== 'none' ? toUrl(process.env.PARTS_REF) : null;
if (process.env.PARTS_REF !== 'none') {
  try { REF_SRC = REF ? fs.readFileSync(REF.replace(/^file:\/\//, '').replace(/[?#].*$/, ''), 'utf8')
    : execFileSync('git', ['-C', ROOT, 'show', REF_COMMIT + ':muse-tab/index.html'], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (_) { REF_SRC = ''; }
  if (!REF && REF_SRC) { const t = path.join(os.tmpdir(), 'parts_ref_' + REF_COMMIT.slice(0, 12) + '.html');
    try { if (!fs.existsSync(t) || fs.statSync(t).size < 1e5) fs.writeFileSync(t, REF_SRC); REF = 'file://' + t; } catch (_) { REF = null; } }
}
/* 数据红线「已有键名」：基线提交源码里出现过的 musetab-* 键名都算已有（同 tv_pgbrk_ui RL 口径）；拿不到基线就用被测源码 */
const KNOWN = (() => { const lit = t => new Set((String(t || '').match(/musetab-[a-z0-9-]+/g) || []));
  if (REF_SRC) return lit(REF_SRC); try { return lit(fs.readFileSync(URL0.replace(/^file:\/\//, '').replace(/[?#].*$/, ''), 'utf8')); } catch (_) { return new Set(); } })();

function INIT() {
  window.__vis = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e || !e.isConnected) return false;
    const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    if (getComputedStyle(e).visibility !== 'visible') return false;   /* v69.1 B：visibility 可被子孙覆盖（输出模式 #score-wrap 隐藏、悬浮条显式 visible）——只看自身计算值 */
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.opacity === '0') return false; }
    return true; };
  window.__keys = () => Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort();
  window.__kv = () => { const o = {}; __keys().forEach(k => { o[k] = localStorage.getItem(k); }); return o; };
  window.__fields = () => { const S = new Set(), s = song; if (!s) return [];
    Object.keys(s).forEach(k => S.add('S.' + k));
    if (s.layout && typeof s.layout === 'object') Object.keys(s.layout).forEach(k => S.add('L.' + k));
    (s.measures || []).forEach(m => { if (m) Object.keys(m).forEach(k => S.add('M.' + k)); });
    return [...S].sort(); };
  const cl = x => JSON.parse(JSON.stringify(x));
  window.__lyr = (s, vi, w) => { s.measures.forEach(m => { const c = ((m.voxes || [])[vi] || [])[0]; if (c) { c.deg = c.deg || 1; c.lyrics = [w || '啊']; } }); return s; };
  window.__addVox = (s, name, nota) => { const n = s.voxVoices.length; s.voxVoices.push(name);
    if (nota !== undefined || Array.isArray(s.voxNotations)) { s.voxNotations = s.voxNotations || []; while (s.voxNotations.length < n) s.voxNotations.push(undefined); s.voxNotations.push(nota); }
    s.measures.forEach(m => { const cols = cl(m.voxes[0] || []); cols.forEach(c => { if (c) { delete c.lyrics; delete c.chord; delete c.chords; } }); m.voxes.push(cols); }); return s; };
  /* 末尾空小节：复制末小节、去掉音 / 字 / 和弦与小节级记号（trailingEmptyN 认得的「空」） */
  window.__emptyMea = m => { const e = cl(m);
    ['label', 'keyTo', 'volta', 'repeatStart', 'repeatEnd', 'segno', 'coda', 'dc', 'ds', 'fine', 'finalBar', 'brk', 'pull', 'pgbrk', 'wf'].forEach(k => delete e[k]);
    (e.voxes || []).forEach(cs => (cs || []).forEach(c => { if (!c) return; c.deg = 0; delete c.lyrics; delete c.chord; delete c.chords; }));
    (e.tabs || []).forEach(cs => (cs || []).forEach(c => { if (!c) return; c.notes = []; c.strum = ''; c.chord = ''; delete c.perc; }));
    return e; };
  window.__fx = k => { const B = (id, o) => NWB.build(id, Object.assign({ title: '夹具' + id, nMea: 4 }, o || {}));
    let s;
    switch (k) {
      case '两只老虎': s = PRESETS[3].make(); break;
      case '送别': s = PRESETS[10].make(); break;
      case '钢琴独奏': s = PRESETS[8].make(); break;
      case '和弦谱': s = PRESETS[14].make(); break;
      case '小星星': s = PRESETS[0].make(); break;
      case 'JT带夹3品': s = PRESETS[0].make(); s.capo = 3; break;
      case '小星星+换行': s = PRESETS[0].make(); s.measures[6].brk = 1; break;   /* 第 8 小节起另起一行（总谱的手动换行） */
      case '送别+换行': s = PRESETS[10].make(); s.measures[2].brk = 1; break;
      case '小星星+冲突和弦': s = PRESETS[0].make(); {   /* 第一处 TAB 自带和弦的列：同拍的旋律列写一个不同的和弦（拆份时两边各有一个放不下） */
        const mi = s.measures.findIndex(m => ((m.tabs || [])[0] || [])[0] && m.tabs[0][0].chord); const c = s.measures[mi].voxes[0][0]; c.chord = s.measures[mi].tabs[0][0].chord === 'Am' ? 'Dm' : 'Am'; } break;
      case '两只老虎+末尾空2': s = PRESETS[3].make(); { const L = s.measures[s.measures.length - 1]; s.measures.push(__emptyMea(L), __emptyMea(L)); } break;
      case 'SATB+钢琴': s = B('S', { nVox: 4 }); s.voxVoices = ['女高音', '女低音', '男高音', '男低音']; s.voxNotations = ['staff', 'staff', 'staff', 'bass'];
        __addVox(s, '钢琴右手', 'staff'); __addVox(s, '钢琴左手', 'bass'); [0, 1, 2, 3].forEach(i => __lyr(s, i));
        s.voxGroups = [{ type: 'bracket', from: 0, to: 3 }, { type: 'brace', from: 4, to: 5 }]; break;
      default: throw new Error('未知夹具 ' + k);
    }
    return migrate(s); };
  window.__ld = s => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    if (typeof undoStack !== 'undefined') { undoStack.length = 0; redoStack.length = 0; }
    loadSong(s); sel = { mi: 0, row: (song.tabVoices || []).length ? 'tab' : 'vox', vi: 0, ci: 0, si: 1 }; clampSel(); blurSel = true; render();
    try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {}
    return song.measures.length; };
  window.__red = () => ({ song: JSON.stringify(song), u: undoStack.length, r: redoStack.length, st: (() => { try { return saveStatusText(song).text; } catch (_) { return ''; } })(), kv: JSON.stringify(__kv()) });
  /* 调用记录：EXPORT_ACT.parts / partPng / png / print、setPrintPage、window.print（同时记下当时的 partJobNow）、svgPngDownload、exportPNG、pyqEvent */
  window.__spy = () => { window.__EV = [];
    const arg = a => typeof a === 'function' ? 'fn' : JSON.stringify(a);
    const w = (o, k, tag) => { const f = o[k]; o[k] = function () { __EV.push(tag + '(' + [...arguments].map(arg).join(',') + ')'); return f.apply(this, arguments); }; };
    w(EXPORT_ACT, 'parts', 'parts'); w(EXPORT_ACT, 'partPng', 'partPng'); w(EXPORT_ACT, 'png', 'png'); w(EXPORT_ACT, 'print', 'xprint');
    const sp = setPrintPage; setPrintPage = function (s) { __EV.push('setPrintPage(' + s + ')'); return sp.apply(this, arguments); };
    window.print = () => { let j = null; try { j = partJobNow(); } catch (_) {} __EV.push('print' + (j ? ':' + J2(j.ids) + (j.view ? ':view' : '') : '')); };
    window.J2 = x => JSON.stringify(x);
    try { svgPngDownload = function (xml, vb, k, name) { __EV.push('svgpng:' + name); }; } catch (_) {}
    try { exportPNG = function () { __EV.push('fn:exportPNG(' + [...arguments].join(',') + ')'); }; } catch (_) {}
    try { pyqEvent = function (n, m) { __EV.push('ev:' + n + (m ? ':' + m : '')); }; } catch (_) {} };
  window.__take = () => { const r = (window.__EV || []).join(' '); if (window.__EV) __EV.length = 0; return r; };
  /* 列表结构 */
  window.__lst = () => { const box = document.getElementById('flw-out-list'); if (!box) return null;
    /* v68.6 收尾 UX-2：勾选框包在 <label class="flw-ocl"> 里（31×30 命中区），label 是行的第一个子元素、在名称键之前；label 悬停＝读屏名 */
    const rows = [...box.querySelectorAll('.flw-orow')].map(r => { const cb = r.querySelector('input.flw-ock'), nm = r.querySelector('button.flw-onm'), lb = cb && cb.closest('label.flw-ocl');
      const kids = [...r.children], li = lb ? kids.indexOf(lb) : -1; return { id: nm && nm.dataset.id, t: nm ? nm.textContent : '', cbType: cb && cb.type, cbFirst: !!cb && li >= 0 && li < kids.indexOf(nm),
        ck: cb ? cb.checked : null, cbl: cb && cb.getAttribute('aria-label'), cbt: lb ? lb.title : null, cur: nm && nm.getAttribute('aria-current'), title: nm && nm.title, opt: r.classList.contains('flw-oopt'),
        warn: !!r.querySelector('.flw-owarn') }; });
    const a = document.getElementById('flw-out-chkall'), b = document.getElementById('flw-out-parts'), g = b && b.querySelector('.flw-gbn');
    const hd = a && a.closest('.flw-lrh'), af = hd && hd.firstElementChild, lf = box.querySelector('label[for="flw-out-chkall"]');
    return { rows, txt: box.innerText, html: box.innerHTML, all: a ? { ck: a.checked, ind: a.indeterminate, al: a.getAttribute('aria-label'), type: a.type, first: !!af && af.contains(a), lab: lf ? lf.textContent : '' } : null,
      cnt: (box.querySelector('.flw-lrh .flw-lrc') || {}).textContent || '', solo: (box.querySelector('.flw-osolo') || {}).textContent || '',
      btn: b ? { dis: b.getAttribute('aria-disabled'), why: b.dataset.why || '', al: b.getAttribute('aria-label'), title: b.title, lab: (b.querySelector('.flw-glb') || {}).textContent
        || [...b.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim(),   /* v69.1 B：新形态分段键的字是直接文本 */
        badge: g && !g.hidden ? g.textContent : '', pr: b.getAttribute('aria-pressed'), home: b.closest('#flw-sbar') ? 'sbar' : b.closest('#editbar') ? 'row2' : '?' } : null,
      go: (() => { const q = document.getElementById('flw-sb-go'); return q ? { t: q.textContent.trim(), dis: q.getAttribute('aria-disabled'), why: q.dataset.why || '' } : null; })() }; };
  window.__nx = () => !!(typeof FLOW !== 'undefined' && FLOW.nxOn && FLOW.nxOn());
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const errs = [], OUT = {};
  let pass = 0, total = 0;
  const T = (id, ok, name, d) => { total++; if (ok) pass++; (OUT[id] = OUT[id] || []).push((ok ? '✅ ' : '❌ ') + name + (d ? ': ' + d : '')); };
  const NOTE = (id, s) => (OUT[id] = OUT[id] || []).push(s);
  const prep = pg => pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
    window.__toasts = []; try { const ot = toast; toast = function (m) { __toasts.push(String(m)); try { return ot.apply(this, arguments); } catch (_) {} }; } catch (_) {}
    window.__trk = []; try { if (typeof FLOW !== 'undefined' && FLOW.track) { const t0 = FLOW.track; FLOW.track = function (id) { __trk.push(String(id)); return t0.apply(this, arguments); }; Object.assign(FLOW.track, t0); } } catch (_) {}
    if (!document.getElementById('tv-pu-notrans')) { const st = document.createElement('style'); st.id = 'tv-pu-notrans'; st.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}'; document.head.appendChild(st); } });
  const open = async (w, h, o = {}) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: o.scheme || 'light' });
    ctx.setDefaultTimeout(8000);
    await ctx.addInitScript(INIT);
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errs.push((o.tag || (w + 'x' + h)) + ' PAGEERR:' + e.message));
    pg.on('console', m => { if (m.type() === 'error' && /分谱|partRender|partSong/.test(m.text())) errs.push((o.tag || '') + ' CONSOLE:' + m.text().slice(0, 160)); });
    pg.on('dialog', d => d.dismiss().catch(() => {}));
    await pg.goto(o.url || URL0); await pg.waitForTimeout(o.wait || 1200);
    await prep(pg);
    if (o.scheme === 'dark') await pg.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    pg.__ctx = ctx; return pg;
  };
  const close = pg => pg.__ctx.close();
  const EV = (pg, fn, a) => pg.evaluate(fn, a);
  const wait = (pg, ms) => pg.waitForTimeout(ms);
  const ld = async (pg, k) => { const n = await EV(pg, k => __ld(__fx(k)), k); await wait(pg, 250); return n; };
  const mode = async (pg, m) => { await pg.click('#flw-mode-' + m); await wait(pg, m === 'write' ? 350 : 1000); };
  const lst = pg => EV(pg, () => __lst());
  const view = async (pg, id) => { await pg.click('#flw-out-list .flw-onm[data-id="' + id + '"]'); await wait(pg, 700); };
  const shot = async (pg, name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(SHOTS, name + '.png') }); };
  const SAFE = async (id, name, fn) => { try { await fn(); } catch (e) { T(id, false, name + ' 执行异常', String(e && e.message || e).split('\n')[0]); } };
  const pool = async (jobs, n) => { const q = jobs.slice(); const run1 = async () => { while (q.length) { const j = q.shift(); await j(); } }; await Promise.all(Array.from({ length: n }, run1)); };
  const RL = [];
  const redBase = pg => EV(pg, () => ({ f: __fields(), k: __keys() }));
  const redEnd = async (id, pg, base) => { const now = await redBase(pg);
    const nf = now.f.filter(x => !base.f.includes(x)), nk = now.k.filter(x => !base.k.includes(x) && !KNOWN.has(x));
    RL.push({ id, ok: !nf.length && !nk.length, d: id + (nf.length ? ' 新字段 ' + nf.join(',') : '') + (nk.length ? ' 新键 ' + nk.join(',') : '') }); };
  const sigOf = pg => EV(pg, () => FLOW.mode.snapSig());
  /* v69.1 B：「打印勾选的分谱」——?next=0 点行 2「分谱」键；新形态先点悬浮条「分谱」分段（选打哪一份），过了主按钮 600ms 防误点再点「存 PDF」#flw-sb-go */
  const partsGo = async (pg, ms) => { if (await EV(pg, () => __nx())) {
      if (await EV(pg, () => (document.getElementById('flw-out-parts') || {}).getAttribute('aria-pressed') !== 'true')) { await pg.click('#flw-out-parts', { force: true }); await wait(pg, 750); }
      await pg.click('#flw-sb-go', { force: true }); } else await pg.click('#flw-out-parts', { force: true });
    await wait(pg, ms || 300); };
  const jobs = [];

  /* ================= PU1 单演奏者 ================= */
  /* v69.1 B：新形态「分谱」是悬浮条分段键（字「分谱」、悬停 / 读屏名「分谱（只有一位演奏者）」）、左栏读数「〈谱名〉 · 一人」（≤8 字）；?next=0 原断言 */
  if (want('PU1')) for (const nx0 of [true, false]) jobs.push(() => SAFE('PU1', 'PU1' + (nx0 ? ' ?next=0' : ''), async () => {
    const pg = await open(1440, 900, { tag: 'PU1' + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : URL0 });
    const NM = nx0 ? '打印分谱' : '分谱', SOLO = nx0 ? ' · 一位演奏者' : ' · 一人';
    for (const k of ['钢琴独奏', '送别', '和弦谱']) {
      await ld(pg, k); const base = await redBase(pg);
      await mode(pg, 'output');
      await EV(pg, () => { __spy(); __toasts.length = 0; });
      const L = await lst(pg);
      const kn = await EV(pg, () => { try { return NWB.kindOfSong(song).name; } catch (_) { return docTypeLabel(song); } });
      await pg.click('#flw-out-parts', { force: true }); await wait(pg, 300);
      const r = await EV(pg, () => ({ ev: __take(), t: __toasts.slice(), role: document.getElementById('toast').getAttribute('role'),
        ok: (() => { const c = FLOW.cmd.list().find(x => x.id === 'out:parts'); try { return c && c.ok ? c.ok() : null; } catch (e) { return 'ERR'; } })(), plan: partsPlan(song).solo }));
      T('PU1', r.plan && L.btn && L.btn.dis === 'true' && L.btn.why === '只有一位演奏者' && L.btn.lab === '分谱' && !L.btn.badge
        && r.t[r.t.length - 1] === '只有一位演奏者' && r.role === 'status' && r.ev === '' && r.ok === '只有一位演奏者'
        && L.solo === kn + SOLO && L.rows.length === 0 && !/即将推出|下一批/.test(L.txt + L.btn.why + L.btn.title) && L.btn.home === (nx0 ? 'row2' : 'sbar')
        && L.btn.title === NM + '（只有一位演奏者）' /* v68.7 收尾 BUD-2 迁移：灰显悬停「名称（原因）」同 setD 口径（原「打印勾选的分谱——现在用不了：只有一位演奏者」）；13cf7cb 红 */ && L.btn.al === NM + '（只有一位演奏者）' && L.html.indexOf('flw-obx') < 0,
        'PU1 ' + (nx0 ? '（?next=0）' : '（新形态：悬浮条分段）') + k + '（一位演奏者）：「分谱」灰显、原因与点击 toast 都是「只有一位演奏者」（role=status）、不导出不打印；命令面板 ok() 同一句；灰显原因并进悬停与读屏名（收尾 UX-5，同 setD 口径）；左栏「' + kn + SOLO + '」、无勾选框、总谱行不画像勾选框的 ✓ 方框（收尾 UX-12）',
        J({ btn: L.btn, solo: L.solo, rows: L.rows.length, r }));
      await mode(pg, 'write'); await redEnd('PU1' + (nx0 ? '-nx0' : ''), pg, base);
    }
    await close(pg);
  }));

  /* ================= PU2 多演奏者：列表结构 · 缺省勾选 · 三态 · 徽标 ================= */
  /* v69.1 B：新形态分段键字「分谱」、悬停「分谱」、读屏名「分谱（N 份）」，徽标同；全不勾时分段不灰（只是选打哪一份），选了分谱后主按钮「存 PDF」灰显「先勾选分谱」；?next=0 原断言 */
  if (want('PU2')) for (const nx0 of [true, false]) jobs.push(() => SAFE('PU2', 'PU2' + (nx0 ? ' ?next=0' : ''), async () => {
    const pg = await open(1440, 900, { tag: 'PU2' + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : URL0 });
    const X = nx0 ? '（?next=0）' : '（新形态）', NM = nx0 ? '打印分谱' : '分谱', TT = nx0 ? '打印勾选的分谱' : '分谱';
    /* 「灰显、原因先勾选分谱」：?next=0 在「分谱」键上；新形态在主按钮上（分段只选打哪一份） */
    const noneOk = (L, gb) => nx0 ? (L.btn.dis === 'true' && L.btn.why === '先勾选分谱' && L.btn.title === '打印分谱（先勾选分谱）' && L.btn.al === '打印分谱（先勾选分谱）')
      : (L.btn.dis === null && L.btn.title === '分谱' && L.btn.al === '分谱' && !!gb && gb.dis === 'true' && gb.why === '先勾选分谱' && gb.t === '存 PDF');
    for (const k of ['两只老虎', 'SATB+钢琴']) {
      await ld(pg, k); const base = await redBase(pg);
      await mode(pg, 'output');
      const P = await EV(pg, () => partsPlan(song));
      const L = await lst(pg);
      const ids = ['score'].concat(P.parts.map(p => p.id)), req = P.parts.filter(p => !p.opt);
      const structOk = J(L.rows.map(r => r.id)) === J(ids) && L.rows.every(r => r.cbType === 'checkbox' && r.cbFirst)
        && L.rows[0].t === '总谱 · 全部 ' + (await EV(pg, () => song.tabVoices.length + song.voxVoices.length)) + ' 轨' && L.rows[0].cbl === '打印时包含总谱'
        && L.rows.every(r => r.cbt === r.cbl) && L.all.first && L.all.lab === '分谱'
        && L.rows.slice(1).every((r, i) => r.cbl === '打印时包含' + P.parts[i].name && r.title === '预览' + P.parts[i].name && r.opt === P.parts[i].opt
          && r.t === P.parts[i].name + (P.parts[i].scoreEq ? ' · 总谱' : ''))
        && L.rows.filter(r => r.cur === 'true').map(r => r.id).join() === 'score' && L.all && L.all.type === 'checkbox' && L.all.al === '全选分谱' && L.cnt === String(req.length)
        && !/即将推出|按演奏者，不按谱行|下一批/.test(L.txt);
      const defOk = L.rows[0].ck === false && L.rows.slice(1).every((r, i) => r.ck === !P.parts[i].opt) && L.all.ck === true && L.all.ind === false
        && L.btn.dis === null && L.btn.badge === String(req.length) && L.btn.lab === '分谱' && L.btn.al === NM + '（' + req.length + ' 份）' && L.btn.title === TT && L.btn.home === (nx0 ? 'row2' : 'sbar');
      T('PU2', structOk, 'PU2a ' + X + k + '：列表＝总谱行＋' + P.parts.length + ' 份（原生勾选框在名称键之前、读屏名与悬停都是「打印时包含〈名称〉」、名称键 title「预览〈名称〉」' + (k === 'SATB+钢琴' ? '、钢琴份「· 总谱」、合并份缩进' : '') + '）；全选框「全选分谱」在标题行最前、「分谱」两字是它的 label（收尾 UX-3）；aria-current 在总谱；不再有「即将推出」',
        J({ ids, got: L.rows.map(r => [r.id, r.t, r.cbFirst, r.opt]), all: L.all, cnt: L.cnt }));
      T('PU2', defOk, 'PU2b ' + X + k + '：缺省勾选＝全部非可选份（可选份、总谱不勾）、全选框勾上不半选、徽标「' + req.length + '」、键「分谱」读屏名「' + NM + '（' + req.length + ' 份）」title「' + TT + '」',
        J({ ck: L.rows.map(r => r.ck), all: L.all, btn: L.btn }));
      /* 真实点击：去掉一份 → 全选半选、徽标 −1；点全选 → 全勾；再点 → 全不勾 → 键灰显「先勾选分谱」、不出徽标、点了 toast 同一句不导出 */
      const firstPart = P.parts[0].id;
      await pg.click('#flw-out-list input.flw-ock[data-id="' + firstPart + '"]'); await wait(pg, 150);
      const L1 = await lst(pg);
      await pg.click('#flw-out-chkall'); await wait(pg, 150); const L2 = await lst(pg);
      await pg.click('#flw-out-chkall'); await wait(pg, 150); const L3 = await lst(pg);
      await EV(pg, () => { __spy(); __toasts.length = 0; });
      await partsGo(pg, 250);
      const r3 = await EV(pg, () => ({ ev: __take(), t: __toasts.slice(-1)[0], ok: (() => { const c = FLOW.cmd.list().find(x => x.id === 'out:parts'); return c.ok(); })(), go: __lst().go }));
      T('PU2', L1.all.ind === true && L1.all.ck === false && L1.btn.badge === String(req.length - 1) && L1.rows[1].ck === false
        && L2.all.ck === true && L2.all.ind === false && L2.btn.badge === String(req.length) && L2.rows.filter(r => r.opt).every(r => r.ck === false)
        && L3.all.ck === false && L3.all.ind === false && L3.rows.every(r => r.id === 'score' || r.ck === false) && L3.btn.badge === ''
        && noneOk(L3, r3.go) /* v68.7 收尾 BUD-2 迁移：灰显悬停「名称（原因）」；13cf7cb 红 */
        && r3.ev === '' && r3.t === '先勾选分谱' && r3.ok === '先勾选分谱',
        'PU2c ' + X + k + '：去掉一份 → 全选框半选、徽标 ' + (req.length - 1) + '；点全选 → 非可选份全勾（可选份不动）；再点 → 全不勾：键灰显「先勾选分谱」、徽标不出、点了 toast 同一句不导出（命令面板 ok() 同）',
        J({ L1: [L1.all, L1.btn.badge], L2: [L2.all, L2.btn.badge], L3: [L3.all, L3.btn], r3 }));
      if (k === 'SATB+钢琴') {   /* v68.6 收尾 UX-4：徽标＝实际打出几段（总谱与等于总谱的钢琴份并成一段）；只勾总谱＝灰显「先勾选分谱」 */
        await EV(pg, () => document.querySelectorAll('#flw-out-list input.flw-ock[data-fa="out:chk"]').forEach(c => { if (!c.checked) c.click(); })); await wait(pg, 150);
        const La = await lst(pg), segN = await EV(pg, () => partSegN(partsPlan(song), FLOW.out.checked()));
        await EV(pg, () => document.querySelectorAll('#flw-out-list input.flw-ock[data-fa="out:chk"]').forEach(c => { if (c.checked && c.dataset.id !== 'score') c.click(); })); await wait(pg, 150);
        const Lb = await lst(pg);
        await EV(pg, () => { __spy(); __toasts.length = 0; }); await partsGo(pg, 250);
        const rb = await EV(pg, () => ({ ev: __take(), t: __toasts.slice(-1)[0], go: __lst().go }));
        T('PU2', La.rows.every(r => r.ck) && La.btn.badge === '7' && segN === 7 && La.btn.al === NM + '（7 份）' && Lb.rows.filter(r => r.ck).map(r => r.id).join() === 'score'
          && noneOk(Lb, rb.go) && Lb.btn.badge === '' && rb.ev === '' && rb.t === '先勾选分谱',
          'PU2e ' + X + 'SATB＋钢琴全勾（总谱＋4 声部＋钢琴＋2 项合并＝8 项）：徽标「7」＝实际打出 7 段（等于总谱的钢琴份并进总谱），读屏名「打印分谱（7 份）」；只勾总谱：键灰显「先勾选分谱」、不出徽标、点了不打印（收尾 UX-4）',
          J({ a: [La.btn.badge, La.btn.al, segN], b: Lb.btn, rb })); }
      if (k === '两只老虎') await shot(pg, 'PU2-list-1440' + (nx0 ? '-nx0' : ''));
      await mode(pg, 'write'); await redEnd('PU2' + (nx0 ? '-nx0' : ''), pg, base);
    }
    if (!nx0) { await close(pg); return; }   /* PU2d / PU2f（⚠ 和弦放不下）与形态无关，只在 ?next=0 那一遍跑 */
    /* PU2d ⚠「k 个和弦名放不下」（§3.4：只在 carry.dropped>0 时出；引擎）：小星星原样无 ⚠；同拍旋律与 TAB 各写不同和弦 → 有 ⚠，k＝partSong 的 dropped */
    const warnOf = async k => { await ld(pg, k); await mode(pg, 'output'); await wait(pg, 500);
      const r = await EV(pg, () => [...document.querySelectorAll('#flw-out-list .flw-orow')].map(row => { const w = row.querySelector('.flw-owarn'), id = row.querySelector('.flw-onm').dataset.id;
        let d = null; if (id !== 'score') try { d = partSong(partsPlan(song).parts.find(p => p.id === id), { brk: false }).carry.dropped; } catch (_) {}
        return [id, w ? w.getAttribute('title') : '', w ? w.getAttribute('aria-label') : '', d]; }));
      await mode(pg, 'write'); return r; };
    const w0 = await warnOf('小星星'), w1 = await warnOf('小星星+冲突和弦');
    T('PU2', w0.every(x => x[1] === '') && w1.some(x => x[3] > 0) && w1.every(x => x[3] > 0 ? (x[1] === x[3] + ' 个和弦名放不下' && x[2] === x[1]) : x[1] === ''),
      'PU2d（引擎）⚠ 只在有和弦放不下时出、title / 读屏名「k 个和弦名放不下」（k＝这一份的 carry.dropped）：小星星原样无 ⚠；同拍旋律与 TAB 写不同和弦后对应份出 ⚠', J({ w0, w1 }));
    /* v68.6 收尾 UX-8：⚠ 是按钮（≥24×24、可聚焦），点了 toast「第 m 小节和弦名放不下」并跳过去：回书写、光标落在那一小节、本份的第一行 */
    { await mode(pg, 'output'); await wait(pg, 500);
      const wb = await EV(pg, () => { const w = document.querySelector('#flw-out-list .flw-owarn'); if (!w) return null; const r = w.getBoundingClientRect(), id = w.dataset.id, p = partsPlan(song).parts.find(x => x.id === id);
        return { tag: w.tagName, w: r.width, h: r.height, tab: w.tabIndex, id, at: partSong(p, { brk: false }).dropAt, row: p.tab.length ? 'tab' : 'vox', vi: p.tab.length ? p.tab[0] : p.vox[0] }; });
      if (wb) { await EV(pg, () => { __toasts.length = 0; }); await pg.click('#flw-out-list .flw-owarn'); await wait(pg, 600); }
      const wa = await EV(pg, () => ({ t: __toasts.slice(-1)[0], mode: FLOW.mode.cur, sel: { mi: sel.mi, row: sel.row, vi: sel.vi } }));
      T('PU2', !!wb && wb.tag === 'BUTTON' && wb.w >= 24 && wb.h >= 24 && wb.tab === 0 && wb.at >= 0 && wa.t === '第 ' + (wb.at + 1) + ' 小节和弦名放不下' && wa.mode === 'write'
        && wa.sel.mi === wb.at && wa.sel.row === wb.row && wa.sel.vi === wb.vi,
        'PU2f ⚠ 是 ≥24×24 的按钮、可聚焦；点了 toast「第 m 小节和弦名放不下」、回书写并把光标放到那一小节本份的第一行（收尾 UX-8）', J({ wb, wa })); }
    await close(pg);
  }));

  /* ================= PU3 切预览 · PU5 回总谱 ================= */
  /* v69.1 B：两种形态各跑——新形态格式卡同 id、看分谱时悬停同原（作用于当前视图），看总谱时「图片」卡悬停「图片 PNG」（≤12 字）；页数读数在悬浮条（同 id） */
  if (want('PU3') || want('PU5')) for (const nx0 of [true, false]) jobs.push(() => SAFE('PU3', 'PU3/PU5' + (nx0 ? ' ?next=0' : ''), async () => {
    const pg = await open(1440, 900, { tag: 'PU3' + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : URL0 });
    const X = nx0 ? '（?next=0）' : '（新形态）';
    await ld(pg, '两只老虎'); const base = await redBase(pg);
    await mode(pg, 'output');
    const s0 = await EV(pg, () => ({ c: PV.content, g: JSON.stringify(PV.geo), sig: FLOW.mode.snapSig(), pages: document.getElementById('flw-out-pages').textContent,
      tt: ['print', 'png', 'card', 'icard', 'mxl', 'mid', 'mtab'].map(k => document.getElementById('flw-out-' + k).title),
      caps: [...document.querySelectorAll('#pv-pages .pv-cap')].map(x => x.textContent), st: document.getElementById('flw-st-trk').textContent, stT: document.getElementById('flw-st-trk').title }));
    await view(pg, 't1');
    const r = await EV(pg, () => { const L = FLOW.out.last, n = PV.geo.n;
      let ph = ''; try { const R = partReport(L); ph = FLOW.lay.pagesHTML(Object.assign({ paper: layoutCfg().page || 'A4' }, R)); } catch (e) { ph = 'ERR ' + e.message; }
      return { cur: FLOW.out.cur, ac: [...document.querySelectorAll('#flw-out-list .flw-onm[aria-current="true"]')].map(x => x.dataset.id), cks: PV.cks, n, ln: L && L.geo && L.geo.n,
        caps: [...document.querySelectorAll('#pv-pages .pv-cap')].map(x => x.textContent), pages: document.getElementById('flw-out-pages').textContent, sig: FLOW.mode.snapSig(),
        pgpart: document.querySelectorAll('#pv-pages .pgpart').length, pgpartTxt: (document.querySelector('#pv-pages .pgpart') || {}).textContent || '',
        lsIn: document.getElementById('flw-out-list').innerHTML.indexOf(ph) >= 0 && ph.length > 20,
        tt: ['print', 'png', 'card', 'icard', 'mxl', 'mid', 'mtab'].map(k => document.getElementById('flw-out-' + k).title), act: document.activeElement && document.activeElement.dataset.id,
        st: document.getElementById('flw-st-trk').textContent, stT: document.getElementById('flw-st-trk').title, nb: (document.getElementById('flw-nbtn') || {}).textContent }; });
    T('PU3', r.cur === 't1' && J(r.ac) === '["t1"]' && r.cks === null && r.n === r.ln && r.caps.length === r.n && r.caps.every((c, i) => c === '吉他 · 扫弦 · 第 ' + (i + 1) + ' / ' + r.n + ' 页')
      && r.pages === '共 ' + r.n + ' 页' && r.sig === s0.sig + '|part:t1|0' && r.act === 't1' && s0.caps.every((c, i) => c === '第 ' + (i + 1) + ' / ' + s0.caps.length + ' 页'),
      'PU3a ' + X + '点「吉他 · 扫弦」：FLOW.out.cur＝t1、aria-current 只在它；PV.cks＝null、PV.geo.n＝这一份页数 ' + r.n + '、页脚「吉他 · 扫弦 · 第 x / n 页」（收尾 UX-1：每页都写正在看哪一份；看总谱时照旧「第 x / n 页」）、右栏「共 n 页」、snapSig＝总谱签名＋「|part:t1|0」、焦点留在名称键',
      J({ cur: r.cur, ac: r.ac, n: r.n, ln: r.ln, caps: r.caps, caps0: s0.caps, pages: r.pages, sigTail: r.sig.slice(-24), act: r.act }));
    T('PU3', r.tt[0] === '打印吉他 · 扫弦' && r.tt[1] === '图片 · 吉他 · 扫弦' && J(r.tt.slice(2)) === J(['分享卡·总谱', '互动谱·总谱', 'MusicXML·总谱', 'MIDI·总谱', '曲谱文件·总谱'])
      && s0.tt[0] !== r.tt[0] && s0.tt[1] === (nx0 ? '导出高清 PNG 图片（整页谱面）' : '图片 PNG'),
      'PU3b ' + X + '看分谱时悬停说明：「打印 / 存 PDF」＝「打印吉他 · 扫弦」、图片 PNG＝「图片 · 吉他 · 扫弦」（作用于当前视图，收尾 UX-9）、分享卡 / 互动谱 / MusicXML / MIDI / 曲谱文件＝「〈键名〉·总谱」（≤12 字）', J(r.tt));
    /* v68.7 S1 迁移（README P2，规格 B7）：状态栏轨名段平时的悬停「当前编辑的音轨 · 记谱法」→「当前轨」（看分谱时「正在看的分谱」不变）。修前红修后绿：改前 s0.stT 是长句 */
    T('PU3', r.st === '吉他 · 扫弦 · 分谱' && r.stT === '正在看的分谱' && s0.st !== r.st && s0.stT === '当前轨',
      'PU3f 看分谱时状态栏轨名段写正在看的这一份「吉他 · 扫弦 · 分谱」（悬停「正在看的分谱」；此前写光标所在的轨，与画面矛盾——收尾 UX-1）', J({ st: r.st, stT: r.stT, s0: [s0.st, s0.stT] }));
    T('PU3', r.pgpart >= 1 && r.pgpartTxt === '吉他 · 扫弦' && r.lsIn, 'PU3c（引擎）预览页里有分谱名 .pgpart「吉他 · 扫弦」；「页面」区＝pagesHTML(partReport(last))', J({ pgpart: r.pgpart, t: r.pgpartTxt, lsIn: r.lsIn }));
    await shot(pg, 'PU3-view-t1-1440' + (nx0 ? '-nx0' : ''));
    /* PU5 回总谱：内容 / 几何 / 签名与切换前逐字节相同 */
    await view(pg, 'score');
    const s1 = await EV(pg, () => ({ c: PV.content, g: JSON.stringify(PV.geo), sig: FLOW.mode.snapSig(), cur: FLOW.out.cur, pages: document.getElementById('flw-out-pages').textContent,
      tt: ['print', 'png', 'card', 'icard', 'mxl', 'mid', 'mtab'].map(k => document.getElementById('flw-out-' + k).title), last: FLOW.out.last }));
    const s1b = await EV(pg, () => ({ caps: [...document.querySelectorAll('#pv-pages .pv-cap')].map(x => x.textContent), st: document.getElementById('flw-st-trk').textContent, stT: document.getElementById('flw-st-trk').title }));
    T('PU5', s1.cur === 'score' && s1.c === s0.c && s1.g === s0.g && s1.sig === s0.sig && s1.sig.indexOf('|part:') < 0 && s1.pages === s0.pages && J(s1.tt) === J(s0.tt) && s1.last === null
      && J(s1b.caps) === J(s0.caps) && s1b.st === s0.st && s1b.stT === s0.stT,
      'PU5 点「总谱」回来：PV.content、PV.geo、snapSig、右栏页数、工具组悬停说明、页脚、状态栏轨名段与切换前逐字节相同，snapSig 无「|part:」', J({ cur: s1.cur, c: s1.c === s0.c, g: s1.g === s0.g, sig: s1.sig === s0.sig, caps: s1b.caps, st: s1b.st }));
    await mode(pg, 'write'); await redEnd('PU3' + (nx0 ? '-nx0' : ''), pg, base);
    /* SATB＋钢琴：女低音份（引擎：.pgpart）；钢琴份等于总谱：直接用总谱快照、「共 n 页」 */
    await ld(pg, 'SATB+钢琴'); await mode(pg, 'output');
    const sc = await EV(pg, () => ({ c: PV.content, n: PV.geo.n }));
    await view(pg, 'v1');
    const a = await EV(pg, () => ({ cur: FLOW.out.cur, pgpart: (document.querySelector('#pv-pages .pgpart') || {}).textContent || '' }));
    await view(pg, 'p');
    const p = await EV(pg, () => ({ cur: FLOW.out.cur, same: PV.content, n: PV.geo.n, pages: document.getElementById('flw-out-pages').textContent, last: FLOW.out.last, sig: FLOW.mode.snapSig().slice(-10) }));
    T('PU3', a.cur === 'v1' && p.cur === 'p' && p.same === sc.c && p.n === sc.n && p.pages === '共 ' + sc.n + ' 页' && p.last === null && /\|part:p\|0$/.test(p.sig),
      'PU3d SATB＋钢琴：钢琴份（等于总谱）预览＝总谱快照逐字节、右栏「共 ' + sc.n + ' 页」', J({ a: a.cur, p: { cur: p.cur, same: p.same === sc.c, n: p.n, pages: p.pages } }));
    T('PU3', a.pgpart === '女低音', 'PU3e（引擎）SATB＋钢琴「女低音」份预览页有 .pgpart「女低音」', a.pgpart);
    await close(pg);
  }));

  /* ================= PU4 看分谱时编辑 ================= */
  if (want('PU4')) jobs.push(() => SAFE('PU4', 'PU4', async () => {
    const pg = await open(1440, 900, { tag: 'PU4' });
    const n0 = await ld(pg, '两只老虎+末尾空2'); const base = await redBase(pg);
    await mode(pg, 'output'); await view(pg, 'v0');
    const vis = await EV(pg, () => { const b = document.querySelector('#flw-out-trim [data-fa="out:trim"]'); return !!b && __vis(b); });
    const u0 = await EV(pg, () => undoStack.length);
    if (vis) await pg.click('#flw-out-trim [data-fa="out:trim"]'); await wait(pg, 900);
    const a = await EV(pg, () => ({ cur: FLOW.out.cur, n: song.measures.length, sm: FLOW.out.last && FLOW.out.last.sysMea, ac: (document.querySelector('#flw-out-list .flw-onm[aria-current="true"]') || {}).dataset, u: undoStack.length, pg: document.querySelectorAll('#pv-pages .pgpart').length }));
    await EV(pg, () => { const s = FLOW.mode.stage(); if (s) s.focus(); });
    await pg.keyboard.press('Control+z'); await wait(pg, 900);
    const c = await EV(pg, () => ({ cur: FLOW.out.cur, n: song.measures.length, sm: FLOW.out.last && FLOW.out.last.sysMea, mode: FLOW.mode.cur, pg: document.querySelectorAll('#pv-pages .pgpart').length }));
    const mx = sm => (sm || []).reduce((m, x) => Math.max(m, x[1]), -1);
    T('PU4', vis && a.cur === 'v0' && a.n === n0 - 2 && a.u === u0 + 1 && a.ac && a.ac.id === 'v0' && c.cur === 'v0' && c.n === n0 && c.mode === 'output',
      'PU4a 看「人声」份时点「删除这 2 个空小节」：仍看这一份（aria-current 不变）、谱少 2 小节、撤销栈 +1；Ctrl+Z 后仍在输出、仍看这一份、小节数复原', J({ vis, a: { cur: a.cur, n: a.n, u: a.u, u0 }, c: { cur: c.cur, n: c.n, mode: c.mode }, n0 }));
    T('PU4', mx(a.sm) === n0 - 3 && mx(c.sm) === n0 - 1 && a.pg >= 1 && c.pg >= 1, 'PU4b（引擎）预览随之更新：删后这一份末小节＝第 ' + (n0 - 2) + ' 小节、撤销后＝第 ' + n0 + ' 小节，预览页始终有 .pgpart', J({ a: mx(a.sm), c: mx(c.sm), pg: [a.pg, c.pg] }));
    await mode(pg, 'write'); await redEnd('PU4', pg, base);
    await close(pg);
  }));

  /* ================= PU6 生命周期 ================= */
  if (want('PU6')) jobs.push(() => SAFE('PU6', 'PU6', async () => {
    const pg = await open(1440, 900, { tag: 'PU6' });
    await ld(pg, '两只老虎'); const base = await redBase(pg);
    await mode(pg, 'output'); await view(pg, 't1');
    await pg.click('#flw-out-list input.flw-ock[data-id="v0"]'); await wait(pg, 150);
    const a0 = await EV(pg, () => FLOW.out.cur);
    await mode(pg, 'write'); await mode(pg, 'output');
    const a = await lst(pg); const a1 = await EV(pg, () => ({ cur: FLOW.out.cur, sig: FLOW.mode.snapSig().indexOf('|part:') }));
    T('PU6', a0 === 't1' && a1.cur === 'score' && a1.sig < 0 && a.rows.find(r => r.cur === 'true').id === 'score' && a.rows.find(r => r.id === 'v0').ck === false && a.rows.find(r => r.id === 't0').ck === true,
      'PU6a 看「吉他 · 扫弦」时回书写再进输出：视图回总谱（aria-current 在总谱、snapSig 无后缀），勾选（去掉了人声）还在', J({ a0, a1, ck: a.rows.map(r => [r.id, r.ck]) }));
    /* 切窗口：新窗口（SATB＋钢琴）按缺省勾选、视图是总谱；切回原窗口：视图总谱、去掉人声的勾选还在 */
    await view(pg, 't0');
    const i0 = await EV(pg, () => curDocI);
    await EV(pg, () => { addDoc(__fx('SATB+钢琴')); }); await wait(pg, 900);
    const w2 = await lst(pg); const c2 = await EV(pg, () => ({ cur: FLOW.out.cur, mode: FLOW.mode.cur, P: partsPlan(song).parts.map(p => [p.id, p.opt]) }));
    await EV(pg, i0 => switchDocTo(i0), i0); await wait(pg, 900);
    const w1 = await lst(pg); const c1 = await EV(pg, () => ({ cur: FLOW.out.cur, mode: FLOW.mode.cur }));
    T('PU6', c2.cur === 'score' && w2.rows.slice(1).every((r, i) => r.ck === !c2.P[i][1]) && c1.cur === 'score' && w1.rows.find(r => r.id === 'v0').ck === false && w1.rows.find(r => r.cur === 'true').id === 'score',
      'PU6b 看分谱时另开窗口：视图回总谱、新窗口按缺省勾选（非可选份勾）；切回原窗口：视图总谱、原窗口的勾选（去掉人声）还在', J({ c2, c1, w2: w2.rows.map(r => [r.id, r.ck]), w1: w1.rows.map(r => [r.id, r.ck]) }));
    /* 删轨让当前 id 失效：看 t1 时删第 2 条吉他 → 静默回总谱（无报错、无 toast） */
    await view(pg, 't1');
    const e0 = errs.length;
    await EV(pg, () => { __toasts.length = 0; delVoiceAt('tab', 1); }); await wait(pg, 900);
    const d = await EV(pg, () => ({ cur: FLOW.out.cur, ids: partsPlan(song).parts.map(p => p.id), ac: (document.querySelector('#flw-out-list .flw-onm[aria-current="true"]') || {}).dataset, t: __toasts.slice(), sig: FLOW.mode.snapSig().indexOf('|part:') }));
    T('PU6', d.cur === 'score' && d.ids.indexOf('t1') < 0 && d.ac && d.ac.id === 'score' && d.sig < 0 && errs.length === e0 && !d.t.some(t => /分谱|失败/.test(t)),
      'PU6c 看「吉他 · 扫弦」时删掉这条吉他：当前 id 不在新计划里 → 静默回总谱（aria-current 在总谱、无报错、无提示）', J(d));
    await mode(pg, 'write');
    await close(pg);
  }));

  /* ================= PU7 打印对象 · PNG ================= */
  /* v69.1 B：两种形态各跑——新形态「打印」「图片」是左栏格式卡（同 id 同调用）；「分谱」＝悬浮条分段选分谱 → 主按钮「存 PDF」＝EXPORT_ACT.parts(纸张, 勾选集)；纸张 select 在悬浮条（同 id 同 change） */
  if (want('PU7')) for (const nx0 of [true, false]) jobs.push(() => SAFE('PU7', 'PU7' + (nx0 ? ' ?next=0' : ''), async () => {
    const pg = await open(1440, 900, { tag: 'PU7' + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : URL0 });
    const X = nx0 ? '（?next=0）' : '（新形态）';
    await ld(pg, '两只老虎'); const base = await redBase(pg);
    await mode(pg, 'output'); await EV(pg, () => __spy());
    await view(pg, 't1'); await EV(pg, () => __take());
    await pg.click('#flw-out-print'); await wait(pg, 500); const pv = await EV(pg, () => __take());
    await pg.click('#flw-out-png'); await wait(pg, 400); const pp = await EV(pg, () => __take());
    await view(pg, 'score'); await EV(pg, () => __take());
    await pg.click('#flw-out-print'); await wait(pg, 500); const ps = await EV(pg, () => __take());
    await pg.click('#flw-out-png'); await wait(pg, 400); const sp = await EV(pg, () => __take());
    T('PU7', /^xprint\("A4"\) setPrintPage\(A4\) print/.test(pv) && /^xprint\("A4"\) setPrintPage\(A4\) print$/.test(ps) && /^partPng\("t1"\)/.test(pp) && pp.indexOf('png()') < 0 && /^png\(\) /.test(sp) && /fn:exportPNG\(2\)/.test(sp),
      'PU7a ' + X + '看分谱时「打印 / 存 PDF」＝EXPORT_ACT.print(纸张) → setPrintPage 后 print；看总谱同 M8a（无分谱任务）；看分谱时「图片 PNG」＝EXPORT_ACT.partPng(id)，看总谱＝EXPORT_ACT.png()', J({ pv, ps, pp, sp }));
    T('PU7', /print:\["t1"\]:view/.test(pv) && /ev:export_png:part/.test(pp) && /svgpng:两只老虎（双声部）-吉他 · 扫弦/.test(pp), 'PU7b（引擎）看分谱打印时 partJobNow()＝{ids:["t1"], view}；分谱 PNG 记 export_png（meta part）、文件名「曲名-吉他 · 扫弦」', J({ pv, pp }));
    /* 「分谱」键：勾选集（总谱在最前），纸张跟右栏 */
    await pg.click('#flw-out-list input.flw-ock[data-id="score"]'); await wait(pg, 120);
    await pg.click('#flw-out-list input.flw-ock[data-id="t0"]'); await wait(pg, 120);
    await EV(pg, () => { const s = document.getElementById('flw-out-psize'); s.value = 'A4L'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await EV(pg, () => __take());
    await partsGo(pg, 600);
    const k = await EV(pg, () => ({ ev: __take(), job: typeof PART_JOB !== 'undefined' && PART_JOB ? PART_JOB.ids : null, ck: FLOW.out.checked() }));
    T('PU7', /^parts\("A4L",\["score","t1","v0"\]\)/.test(k.ev) && J(k.ck) === '["score","t1","v0"]',
      'PU7c ' + X + (nx0 ? '「分谱」键' : '悬浮条「分谱」→「存 PDF」') + '＝EXPORT_ACT.parts(纸张 A4L, 勾选集 [score, t1, v0]（总谱在最前）)', J(k));
    T('PU7', /^parts\("A4L",\["score","t1","v0"\]\) setPrintPage\(A4L\)/.test(k.ev) && J(k.job) === '["score","t1","v0"]' && /print:\["score","t1","v0"\]$/.test(k.ev.replace(/ ev:[^ ]+/g, '')),
      'PU7d ' + X + '（引擎）随后 setPrintPage(A4L)、分谱任务 PART_JOB.ids＝勾选集，打印时 partJobNow() 读到它', J(k));
    await EV(pg, () => window.dispatchEvent(new Event('afterprint'))); await wait(pg, 300);
    await mode(pg, 'write'); await redEnd('PU7' + (nx0 ? '-nx0' : ''), pg, base);
    await close(pg);
  }));

  /* ================= PU8 沿用总谱换行 ================= */
  if (want('PU8')) jobs.push(() => SAFE('PU8', 'PU8', async () => {
    const pg = await open(1440, 900, { tag: 'PU8' });
    const vis = () => EV(pg, () => { const r = document.getElementById('flw-out-brkr'); return { vis: !!r && !r.hidden && __vis(r), t: r ? r.textContent : null }; });
    await ld(pg, '两只老虎'); await mode(pg, 'output'); const v0 = await vis(); await mode(pg, 'write');
    await ld(pg, '送别+换行'); await mode(pg, 'output'); const v1 = await vis(); await mode(pg, 'write');
    await ld(pg, '小星星+换行'); const base = await redBase(pg); await mode(pg, 'output'); const v2 = await vis();
    T('PU8', !v0.vis && !v1.vis && v2.vis && v2.t === '沿用总谱换行', 'PU8a「沿用总谱换行」只在 ≥2 份且总谱有手动换行时出现：两只老虎（无换行）不出、送别（一位演奏者）不出、小星星＋换行 出', J({ v0, v1, v2 }));
    await view(pg, 'v0');
    const off = await EV(pg, () => ({ sm: FLOW.out.last && FLOW.out.last.sysMea, sig: FLOW.mode.snapSig().slice(-12), brk: FLOW.out.brk }));
    await pg.click('#flw-out-brkr'); await wait(pg, 800);
    const on = await EV(pg, () => ({ sm: FLOW.out.last && FLOW.out.last.sysMea, sig: FLOW.mode.snapSig().slice(-12), brk: FLOW.out.brk, ck: document.getElementById('flw-out-brk').checked, cur: FLOW.out.cur,
      keys: typeof PART_CACHE !== 'undefined' && PART_CACHE.map ? [...PART_CACHE.map.keys()] : [] }));
    T('PU8', off.brk === false && /\|part:v0\|0$/.test(off.sig) && on.brk === true && on.ck === true && /\|part:v0\|1$/.test(on.sig) && on.cur === 'v0',
      'PU8b 真实点「沿用总谱换行」：FLOW.out.brk＝true、勾选框勾上、仍看这一份、snapSig 后缀由「|0」变「|1」（重拍）', J({ off: off.sig, on: on.sig }));
    T('PU8', (off.sm || []).every(x => x[0] !== 7) && (on.sm || []).some(x => x[0] === 7) && on.keys.some(x => /^v0\|.*\|0$/.test(x)) && on.keys.some(x => /^v0\|.*\|1$/.test(x)),
      'PU8c（引擎）勾上后「人声」份在总谱换行处（第 8 小节）另起一行（不勾时没有）；缓存里 v0 两个键（…|0 与 …|1）', J({ off: (off.sm || []).map(x => x[0]), on: (on.sm || []).map(x => x[0]), keys: on.keys }));
    await pg.click('#flw-out-brkr'); await wait(pg, 600);
    await mode(pg, 'write'); await redEnd('PU8', pg, base);
    await close(pg);
  }));

  /* ================= PU9 键盘与读屏 ================= */
  if (want('PU9')) jobs.push(() => SAFE('PU9', 'PU9', async () => {
    const pg = await open(1440, 900, { tag: 'PU9' });
    await ld(pg, '两只老虎'); const base = await redBase(pg);
    await mode(pg, 'output');
    const ae = () => EV(pg, () => { const a = document.activeElement; return a ? (a.tagName.toLowerCase() + ':' + (a.dataset.fa || a.id || '') + ':' + (a.dataset.id || '')) : ''; });
    await EV(pg, () => document.querySelector('#flw-out-list input.flw-ock[data-id="t0"]').focus());
    const f0 = await ae(); await pg.keyboard.press('Tab'); const f1 = await ae(); await pg.keyboard.press('Tab'); const f2 = await ae();
    await pg.keyboard.press('Shift+Tab'); await pg.keyboard.press('Shift+Tab'); const f3 = await ae();
    await pg.keyboard.press('Space'); await wait(pg, 150);
    const s1 = await EV(pg, () => ({ ck: document.querySelector('#flw-out-list input.flw-ock[data-id="t0"]').checked, badge: document.querySelector('#flw-out-parts .flw-gbn').textContent }));
    const f4 = await ae();
    await pg.keyboard.press('Space'); await wait(pg, 150);
    await pg.keyboard.press('Tab'); await pg.keyboard.press('Enter'); await wait(pg, 900);
    const f5 = await ae(); const v = await EV(pg, () => ({ cur: FLOW.out.cur, ac: (document.querySelector('#flw-out-list .flw-onm[aria-current="true"]') || {}).dataset }));
    T('PU9', f0 === 'input:out:chk:t0' && f1 === 'button:out:view:t0' && f2 === 'input:out:chk:t1' && f3 === 'input:out:chk:t0' && s1.ck === false && s1.badge === '2' && f4 === 'input:out:chk:t0'
      && f5 === 'button:out:view:t0' && v.cur === 't0' && v.ac && v.ac.id === 't0',
      'PU9 键盘：Tab 顺序＝勾选框 → 名称键 → 下一份勾选框；勾选框上空格切换（徽标 2）、焦点不动；名称键上 Enter 预览这一份、焦点留在这个键（不被抢）', J({ f0, f1, f2, f3, f4, f5, s1, v: v.cur }));
    await mode(pg, 'write'); await redEnd('PU9', pg, base);
    await close(pg);
  }));

  /* ================= PU10 无持久化 · PU14 埋点 ================= */
  /* v69.1 B：两种形态各跑——新形态「分谱」键＝分段 + 主按钮（partsGo），埋点多一个 out:job（分段：只有命令名） */
  if (want('PU10') || want('PU14')) for (const nx0 of [true, false]) jobs.push(() => SAFE('PU10', 'PU10/PU14' + (nx0 ? ' ?next=0' : ''), async () => {
    const pg = await open(1440, 900, { tag: 'PU10' + (nx0 ? '-nx0' : ''), url: nx0 ? NX0U : URL0 });
    const X = nx0 ? '（?next=0）' : '（新形态）';
    await ld(pg, '小星星+换行'); const base = await redBase(pg);
    await wait(pg, 600);   /* 落盘去抖（350ms）走完再取基线 */
    const r0 = await EV(pg, () => Object.assign(__red(), { sc: document.getElementById('score').innerHTML }));
    await mode(pg, 'output');
    await EV(pg, () => { __spy(); window.__trk.length = 0; });
    await pg.click('#flw-out-list input.flw-ock[data-id="v0"]'); await wait(pg, 120);
    await pg.click('#flw-out-chkall'); await wait(pg, 120);
    await view(pg, 'v0'); await pg.click('#flw-out-brkr'); await wait(pg, 600);
    await pg.click('#flw-out-print'); await wait(pg, 400);
    await pg.click('#flw-out-png'); await wait(pg, 400);
    await view(pg, 't0'); await view(pg, 'score');
    await partsGo(pg, 500);
    await EV(pg, () => window.dispatchEvent(new Event('afterprint'))); await wait(pg, 300);
    await pg.click('#flw-out-brkr'); await wait(pg, 400);
    await EV(pg, () => FLOW.cmd.run('out:score')); await wait(pg, 300);
    const trk = await EV(pg, () => __trk.slice());
    await mode(pg, 'write'); await wait(pg, 600);
    const r1 = await EV(pg, () => Object.assign(__red(), { sc: document.getElementById('score').innerHTML }));
    /* 命令面板「最近用过」（musetab-cmd-recent，v68.1 起的既有偏好键）是执行任何命令都会写的（不是分谱写的）：逐字节比较时除外；新键另由 RL 按基线键名查 */
    const kvOf = r => { const o = JSON.parse(r.kv); delete o['musetab-cmd-recent']; return o; };
    const k0 = kvOf(r0), k1 = kvOf(r1), kd = [...new Set(Object.keys(k0).concat(Object.keys(k1)))].filter(k => k0[k] !== k1[k]);
    const diff = Object.keys(r0).filter(k => k !== 'kv' && r0[k] !== r1[k]).concat(kd.map(k => 'kv:' + k));
    T('PU10', !diff.length, 'PU10 ' + X + '整套分谱操作（勾选 / 全选 / 切视图 / 沿用换行 / 打印 / PNG / 「分谱」键 / 命令面板）前后：song JSON、撤销 / 重做栈长度、保存状态、全部 musetab-* 键值、书写态 #score.innerHTML 逐字节相同',
      diff.length ? '不同：' + diff.join(',') : J({ u: r1.u, r: r1.r, keys: Object.keys(k1).length }));
    const outs = trk.filter(x => /^out:|^cmd:go:out:/.test(x));
    const need = ['out:chk', 'out:chkall', 'out:view', 'out:brk', 'out:score', 'out:parts', 'cmd:go:out:score'].concat(nx0 ? [] : ['out:job']);
    const norm = await EV(pg, ids => ids.map(x => FLOW.track.norm(x) === x), outs);
    T('PU14', need.every(x => outs.includes(x)) && norm.every(Boolean) && outs.every(x => /^[a-z0-9:-]+$/.test(x)),
      'PU14 ' + X + '埋点：out:chk · out:chkall · out:view · out:brk · out:score · out:parts · cmd:go:out:score' + (nx0 ? '' : ' · out:job') + ' 都过 FLOW.track 格式过滤（norm(id)＝id），只有命令名、不带分谱名', J(outs));
    await redEnd('PU10' + (nx0 ? '-nx0' : ''), pg, base);
    await close(pg);
  }));

  /* ================= PU11 旧外壳 ================= */
  if (want('PU11')) jobs.push(() => SAFE('PU11', 'PU11', async () => {
    const modalOf = async (pg, k) => { await ld(pg, k); await EV(pg, () => document.getElementById('b-print').click()); await wait(pg, 250);
      return EV(pg, () => { const m = document.querySelector('#modal-mask .modal'); return m ? m.innerHTML : null; }); };
    const pg = await open(1440, 900, { tag: 'PU11', url: withQ(URL0, 'shell=classic') });
    const m1 = await modalOf(pg, '送别'); await EV(pg, () => closeModal());
    if (REF) { const rp = await open(1440, 900, { tag: 'PU11ref', url: withQ(REF, 'shell=classic'), ref: true });
      const m0 = await modalOf(rp, '送别'); await close(rp);
      T('PU11', !!m0 && m1 === m0 && m1.indexOf('data-grp="parts"') < 0, 'PU11a 旧外壳《送别》（一位演奏者）「打印…」弹窗 innerHTML 与基线 v68.5 逐字节相同（没有分谱组）', J({ len: [m0 && m0.length, m1 && m1.length] }));
    } else if (IN_CI) T('PU11', false, 'PU11a CI 里拿不到对拍基线（git show ' + REF_COMMIT.slice(0, 12) + ' 失败）：判红');
    else NOTE('PU11', '⚠️ PU11a 跳过：没有基线页（PARTS_REF=none 或 git show 失败）');
    await modalOf(pg, '两只老虎'); const base = await redBase(pg);
    const g = await EV(pg, () => { const grp = document.querySelector('#modal-mask .ex-grp[data-grp="parts"]'), prev = grp && grp.previousElementSibling;
      const s = document.getElementById('ex-part'), bt = document.getElementById('ex-part-print');
      return { has: !!grp, after: prev && prev.dataset.grp, h4: grp && grp.querySelector('h4').textContent, opts: s ? [...s.options].map(o => [o.value, o.textContent]) : null, bt: bt && bt.textContent, al: s && s.getAttribute('aria-label'),
        flw: document.querySelectorAll('[id^="flw-out"], .flw-ock, .flw-gbn, #flw-out-list').length, flow: document.body.classList.contains('flow') }; });
    await EV(pg, () => __spy());
    await EV(pg, () => { document.getElementById('ex-size').value = 'A4'; document.getElementById('ex-part').value = 't1'; });
    await pg.click('#ex-part-print'); await wait(pg, 500);
    const one = await EV(pg, () => ({ ev: __take(), modal: !!document.querySelector('#modal-mask .modal #ex-part'), job: typeof PART_JOB !== 'undefined' && PART_JOB ? PART_JOB.ids : null }));
    await EV(pg, () => window.dispatchEvent(new Event('afterprint'))); await wait(pg, 200);
    await EV(pg, () => document.getElementById('b-print').click()); await wait(pg, 250);
    await EV(pg, () => { document.getElementById('ex-part').value = ''; });
    await pg.click('#ex-part-print'); await wait(pg, 500);
    const all = await EV(pg, () => ({ ev: __take(), job: typeof PART_JOB !== 'undefined' && PART_JOB ? PART_JOB.ids : null }));
    T('PU11', g.has && g.after === 'print' && g.h4 === '分谱' && J(g.opts) === J([['', '全部分谱（3 份）'], ['t0', '吉他 · 指弹'], ['t1', '吉他 · 扫弦'], ['v0', '人声']]) && g.bt === '打印分谱' && g.flw === 0 && !g.flow
      && /^parts\("A4",\["t1"\],fn\)/.test(one.ev) && /^parts\("A4",\["t0","t1","v0"\],fn\)/.test(all.ev),
      'PU11b 旧外壳两只老虎：「打印存档」后多一组「分谱」——下拉 4 项（全部分谱（3 份）＋逐份）＋「打印分谱」；选一份＝EXPORT_ACT.parts(纸张, [t1], 关弹窗)、选「全部」＝缺省集；页面里没有任何新外壳的分谱 DOM',
      J({ g, one: one.ev.slice(0, 80), all: all.ev.slice(0, 80) }));
    T('PU11', J(one.job) === '["t1"]' && J(all.job) === '["t0","t1","v0"]' && /^parts\("A4",\["t1"\],fn\) setPrintPage\(A4\)/.test(one.ev) && !one.modal,
      'PU11c（引擎）旧外壳：设纸张 → 关弹窗 → 打印；分谱任务 PART_JOB.ids 正确（单份 [t1]、全部 [t0, t1, v0]）', J({ one: one.job, all: all.job, modal: one.modal }));
    await EV(pg, () => { try { window.dispatchEvent(new Event('afterprint')); closeModal(); } catch (_) {} });
    await EV(pg, () => document.getElementById('b-print').click()); await wait(pg, 250);
    await shot(pg, 'PU11-classic-modal-1440');
    await EV(pg, () => { try { closeModal(); } catch (_) {} });
    await redEnd('PU11', pg, base);
    /* v68.6 收尾 UX-12：SATB＋钢琴——等于总谱的钢琴份在下拉里写「钢琴伴奏 · 总谱」（同新外壳列表「· 总谱」） */
    await modalOf(pg, 'SATB+钢琴');
    const sp = await EV(pg, () => { const s = document.getElementById('ex-part'); return s ? [...s.options].map(o => [o.value, o.textContent]) : null; });
    await EV(pg, () => { try { closeModal(); } catch (_) {} });
    const sP = await EV(pg, () => partsPlan(song).parts.map(p => [p.id, p.name, p.scoreEq]));
    T('PU11', !!sp && sp.length === sP.length + 1 && sP.every((p, i) => sp[i + 1][0] === p[0] && sp[i + 1][1] === p[1] + (p[2] ? ' · 总谱' : '')) && sP.some(p => p[2]),
      'PU11d 旧外壳 SATB＋钢琴：下拉里等于总谱的钢琴份写「〈名称〉 · 总谱」，其余逐份照名称（收尾 UX-12）', J({ sp, sP }));
    await close(pg);
  }));

  /* ================= PU12 手机 390×844 ================= */
  if (want('PU12')) jobs.push(() => SAFE('PU12', 'PU12', async () => {
    const sheet = async (pg, k) => { await ld(pg, k); await EV(pg, () => FLOW.mob.open('out')); await wait(pg, 300);
      return EV(pg, () => { const sh = document.getElementById('flw-msheet'); return { html: sh.innerHTML, rows: [...sh.querySelectorAll('[data-fm="ex"], [data-fm="pc"]')].map(x => [x.dataset.fm, x.dataset.v || '', x.textContent.trim()]), vis: __vis(sh), m: document.body.classList.contains('flw-m') }; }); };
    const pg = await open(390, 844, { tag: 'PU12' });
    const s1 = await sheet(pg, '送别'); await EV(pg, () => { const v = document.getElementById('flw-mveil'); if (v) v.click(); }); await wait(pg, 200);
    if (REF) { const rp = await open(390, 844, { tag: 'PU12ref', url: REF, ref: true }); const s0 = await sheet(rp, '送别'); await close(rp);
      T('PU12', s1.m && s1.rows.length === 4 && s1.html === s0.html, 'PU12a 手机《送别》（一位演奏者）「输出与分享」抽屉 4 项、HTML 与基线 v68.5 逐字节相同', J({ n: s1.rows.length, same: s1.html === s0.html }));
    } else if (IN_CI) T('PU12', false, 'PU12a CI 里拿不到对拍基线：判红');
    else T('PU12', s1.m && s1.rows.length === 4 && s1.html.indexOf('data-v="parts"') < 0, 'PU12a 手机《送别》抽屉 4 项、没有分谱行（无基线页，只验结构）', J(s1.rows));
    const s2 = await sheet(pg, '两只老虎'); const base = await redBase(pg);
    await shot(pg, 'PU12-mobile-out-390');
    await EV(pg, () => __spy());
    await pg.click('#flw-msheet [data-fm="ex"][data-v="parts"]'); await wait(pg, 500);
    const r = await EV(pg, () => ({ ev: __take(), job: typeof PART_JOB !== 'undefined' && PART_JOB ? PART_JOB.ids : null, open: __vis('#flw-msheet') }));
    const last = s2.rows[s2.rows.length - 1] || [];
    T('PU12', s2.rows.length === 5 && last[0] === 'ex' && last[1] === 'parts' && /^打印分谱/.test(last[2]) && /全部 3 份 · A4/.test(last[2])
      && /^parts\("A4",\["t0","t1","v0"\]\)/.test(r.ev) && !r.open,
      'PU12b 手机两只老虎：抽屉 5 项、末项「打印分谱 · 全部 3 份 · A4」（主字是动作，同其余各行与命令面板——收尾 UX-12）；点了收起抽屉、EXPORT_ACT.parts(\'A4\', 缺省集)', J({ rows: s2.rows.map(x => x[1]), last, ev: r.ev.slice(0, 90) }));
    T('PU12', J(r.job) === '["t0","t1","v0"]' && /^parts\("A4",\["t0","t1","v0"\]\) setPrintPage\(A4\)/.test(r.ev), 'PU12c（引擎）手机：setPrintPage(A4)、分谱任务 PART_JOB.ids＝全部非可选份', J({ job: r.job, ev: r.ev.slice(0, 80) }));
    await EV(pg, () => window.dispatchEvent(new Event('afterprint')));
    await redEnd('PU12', pg, base);
    await close(pg);
  }));

  /* ================= PU13 文案预算（源码 + 页面） ================= */
  if (want('PU13')) jobs.push(() => SAFE('PU13', 'PU13', async () => {
    const pg = await open(1440, 900, { tag: 'PU13' });
    await ld(pg, '小星星+换行'); await mode(pg, 'output');
    const c = await EV(pg, () => { const L = __lst(); const cmd = FLOW.cmd.list().filter(x => /^out:(parts|score)$/.test(x.id)).map(x => [x.id, x.t, x.w]);
      return { btn: L.btn, rows: L.rows, all: L.all, brk: document.getElementById('flw-out-brkr').textContent, brkT: document.getElementById('flw-out-brkr').title, cmd }; });
    await view(pg, 't0');
    const tt = await EV(pg, () => ['print', 'card', 'mxl'].map(k => document.getElementById('flw-out-' + k).title));
    await mode(pg, 'write');
    await close(pg);
    const POS = /左栏|右栏|行 ?[12]|上方|下方|底栏|顶栏|左侧|右侧|侧栏|上面|下面|左上|右上/;
    /* 新增文案（名称占位按「〈名称〉」去掉后计字） */
    /* v68.6 收尾：悬停按全文计字（此前先去掉「 · 总谱」再计，「MusicXML · 总谱」13 个字符没拦住——UX-9）；补上收尾新增的读数与提示 */
    const btns = [c.btn.lab, '打印分谱'], tips = [c.btn.title, c.btn.al.replace(/\d+/, ''), c.all.al, '只有一位演奏者', '先勾选分谱', '打印时包含', '预览', '个和弦名放不下', '共 页', c.brk, '全部分谱（ 份）', '全部 份 · A4', '正在排 份分谱…',
      c.brkT, '正在看的分谱', ' · 分谱', '图片 · ', '第  小节和弦名放不下', '（总谱）', '内容 · ']
      .concat(tt.map((t, i) => i === 0 ? t.replace('吉他', '') : t));
    const cmdT = c.cmd.map(x => x[1]);
    const allNew = btns.concat(tips, cmdT, c.cmd.map(x => x[2]), [c.rows[0].cbl, '一位演奏者', '· 总谱']);
    const lenOk = btns.every(x => x.length <= 4) && tips.every(x => x.length <= 12) && cmdT.every(x => x.length <= 6);
    const posHits = allNew.filter(x => POS.test(x));
    T('PU13', lenOk && !posHits.length && c.btn.lab === '分谱' && J(cmdT.sort()) === J(['打印分谱', '预览总谱']),
      'PU13a 新增按钮 ≤4 字（分谱 · 打印分谱）、悬停 / 读屏名 / toast 固定部分 ≤12 字、命令面板项 ≤6 字；新文案里没有位置词', J({ btns, long: tips.filter(x => x.length > 12), posHits, cmd: c.cmd }));
    const src = fs.readFileSync(URL0.replace(/^file:\/\//, '').replace(/[?#].*$/, ''), 'utf8').split('\n');
    const bad = src.map((l, i) => [i + 1, l]).filter(([, l]) => !/<li><span class="v">v\d/.test(l) && /分谱/.test(l) && /即将推出|下一批/.test(l)).map(([n, l]) => n + ':' + l.trim().slice(0, 60));
    let wc = 0, wo = ''; try { wo = execFileSync('node', [path.join(ROOT, 'deploy/check-wording.js')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { wc = e.status || 1; wo = String(e.stdout || '') + String(e.stderr || ''); }
    T('PU13', !bad.length && wc === 0, 'PU13b 全文件（更新日志历史条目除外）同一行「分谱」与「即将推出 / 下一批」0 处；deploy/check-wording.js 退出码 0', J({ bad: bad.slice(0, 4), wc, wo: wo.trim().split('\n').slice(-1)[0] }));
  }));

  /* ================= PU15 几何 + 截图（1440 浅 / 深）================= */
  if (want('PU15')) jobs.push(() => SAFE('PU15', 'PU15', async () => {
    for (const sch of ['light', 'dark']) {
      const pg = await open(1440, 900, { tag: 'PU15' + sch, scheme: sch });
      await ld(pg, 'JT带夹3品'); await EV(pg, () => { song.measures[6].brk = 1; render(); });
      await mode(pg, 'output'); await view(pg, 'v0');
      const geo = await EV(pg, () => { const lf = document.getElementById('flw-left').getBoundingClientRect(), out = [];
        document.querySelectorAll('#flw-out-list .flw-orow').forEach(r => { const a = r.getBoundingClientRect(), cb = r.querySelector('.flw-ock').getBoundingClientRect(), nm = r.querySelector('.flw-onm').getBoundingClientRect();
          out.push({ id: r.querySelector('.flw-onm').dataset.id, inL: a.left >= lf.left - 1 && a.right <= lf.right + 1, sep: cb.right <= nm.left + 0.5, h: Math.round(nm.height), cbIn: cb.top >= a.top - 1 && cb.bottom <= a.bottom + 1 }); });
        const b = document.getElementById('flw-out-parts').getBoundingClientRect(), g = document.querySelector('#flw-out-parts .flw-gbn').getBoundingClientRect();
        const rd = document.getElementById('right-dock').getBoundingClientRect(), br = document.getElementById('flw-out-brkr').getBoundingClientRect();
        const al = document.getElementById('flw-out-chkall').getBoundingClientRect();
        /* v68.6 收尾 UX-2 / UX-3：行左 0–30px（行左缘到名称键之前）任一点都落在勾选框的 label 或勾选框上；全选框与逐行勾选框同一列（x 差 ≤1） */
        const hit = []; document.querySelectorAll('#flw-out-list .flw-orow').forEach(r => { const a = r.getBoundingClientRect(), nm = r.querySelector('.flw-onm').getBoundingClientRect();
          for (let dx = 1; dx < nm.left - a.left - 0.5; dx += 3) for (const fy of [0.15, 0.5, 0.85]) { const e = document.elementFromPoint(a.left + dx, a.top + a.height * fy);
            hit.push(!!e && (e.matches('input.flw-ock') || !!e.closest('label.flw-ocl'))); } });
        const cb0 = document.querySelector('#flw-out-list .flw-orow:not(.flw-oopt) .flw-ock').getBoundingClientRect();
        return { rows: out, badgeIn: g.width > 0 && g.left >= b.left - 0.5 && g.right <= b.right + 0.5 && g.top >= b.top - 0.5 && g.bottom <= b.bottom + 0.5,
          brkIn: br.width > 0 && (__nx() ? br.left >= lf.left - 1 && br.right <= lf.right + 1 && !!document.getElementById('flw-out-brkr').closest('#flw-out-lbody')   /* v69.1 B：新形态在左栏分谱表头下 */
            : br.left >= rd.left - 1 && br.right <= rd.right + 1), allIn: al.width > 0 && al.right <= lf.right + 1,
          hitN: hit.length, hitOk: hit.every(Boolean), allX: Math.abs(al.left - cb0.left) }; });
      T('PU15', geo.rows.length >= 3 && geo.rows.every(r => r.inL && r.sep && r.h >= 30 && r.cbIn) && geo.badgeIn && geo.brkIn && geo.allIn,
        'PU15a ' + sch + '：分谱列表每行在左栏内、勾选框与名称键不相交、名称键 ≥30 高；徽标在「分谱」键内；全选框在左栏内；「沿用总谱换行」在左栏分谱表头下（v69.1 B 新形态；?next=0 在右栏）', J(geo));
      T('PU15', geo.hitN >= 30 && geo.hitOk && geo.allX <= 1,
        'PU15b ' + sch + '：行左缘到名称键之前（约 30px × 行高）' + geo.hitN + ' 个采样点全部落在勾选框或它的 label 上（此前只有 14×14 的框点得中——收尾 UX-2）；全选框与逐行勾选框同一列（Δx＝' + (geo.allX || 0).toFixed(1) + '，收尾 UX-3）', J({ hitN: geo.hitN, hitOk: geo.hitOk, allX: geo.allX }));
      await shot(pg, 'PU15-JT-capo3-voice-' + sch);
      await view(pg, 't0'); await shot(pg, 'PU15-JT-capo3-guitar-' + sch);
      await ld(pg, 'SATB+钢琴'); await mode(pg, 'output'); await view(pg, 'v1'); await shot(pg, 'PU15-SATB-alto-' + sch);
      if (sch === 'light' && SHOTS) {
        /* 打印切片（真引擎）：勾 2 份 →「分谱」键 → 手动派发 beforeprint，按打印媒体截全页 */
        await EV(pg, () => { window.print = () => {}; });
        await partsGo(pg, 400);
        await EV(pg, () => window.dispatchEvent(new Event('beforeprint'))); await wait(pg, 300);
        const n = await EV(pg, () => document.querySelectorAll('#print-pages .pp').length);
        await pg.emulateMedia({ media: 'print' }); await wait(pg, 200);
        await pg.screenshot({ path: path.join(SHOTS, 'PU15-print-slices.png'), fullPage: true });
        await pg.emulateMedia({ media: 'screen' });
        await EV(pg, () => window.dispatchEvent(new Event('afterprint'))); await wait(pg, 300);
        NOTE('PU15', '   📷 打印切片 ' + n + ' 页 → PU15-print-slices.png');
      }
      await mode(pg, 'write');
      await close(pg);
    }
  }));

  /* ================= PU16 收尾（验收 UX-1 / UX-2 选做 / UX-6 / UX-7 / UX-9 / UX-10 / UX-11） ================= */
  if (want('PU16')) jobs.push(() => SAFE('PU16', 'PU16', async () => {
    /* UX-1 窄档 1024：竖条「内容」→ 点女低音 → 点谱面收起浮层 → 滚到第 2 页：视口里至少两处可见文字写着「女低音」（竖条键、状态栏轨名段、页脚、续页眉……） */
    { const pg = await open(1024, 768, { tag: 'PU16n' });
      await EV(pg, () => { const s = __fx('SATB+钢琴'); const M = s.measures.slice(); while (s.measures.length < 120) M.forEach(m => { if (s.measures.length < 120) s.measures.push(JSON.parse(JSON.stringify(m))); }); __ld(migrate(s)); }); await wait(pg, 300);
      { const vis = await EV(pg, () => __vis('#flw-mode-output')); if (vis) await mode(pg, 'output'); else { await EV(pg, () => setMode('output')); await wait(pg, 1000); } }   /* 窄档行 2 模式键可能收进菜单 */
      await pg.click('#flw-nbtn'); await wait(pg, 300);
      await pg.click('#flw-out-list .flw-onm[data-id="v1"]'); await wait(pg, 900);
      await pg.mouse.click(700, 500); await wait(pg, 300);
      const n = await EV(pg, async () => { const ps = document.querySelectorAll('#pv-pages .pv-paper'); if (ps[1]) ps[1].scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 600));
        const inV = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && __vis(e); };
        const vis = [...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && /女低音/.test(e.textContent) && inV(e) && !e.closest('#flw-out-list')).map(e => (e.id || String(e.className && e.className.baseVal != null ? e.className.baseVal : e.className) || e.tagName) + '：' + e.textContent.trim().slice(0, 24));
        return { pages: ps.length, cur: FLOW.out.cur, overlay: document.body.classList.contains('flw-lfo-sec'), vis, nb: document.getElementById('flw-nbtn').textContent, nbA: document.getElementById('flw-nbtn').getAttribute('aria-label'),
          st: document.getElementById('flw-st-trk').textContent }; });
      T('PU16', n.cur === 'v1' && !n.overlay && n.pages >= 2 && n.vis.length >= 2 && n.nb === '女低音' && n.nbA === '内容 · 女低音' && n.st === '女低音 · 分谱',
        'PU16a 窄档 1024：看「女低音」时收起浮层、滚到第 2 页，视口里仍有 ' + n.vis.length + ' 处可见文字写着「女低音」——竖条键字＝分谱名（读屏名「内容 · 女低音」）、状态栏「女低音 · 分谱」、页脚「女低音 · 第 x / n 页」（收尾 UX-1）', J(n));
      await close(pg); }
    const pg = await open(1440, 900, { tag: 'PU16' });
    /* UX-2（选做）：鼠标停在「分谱」键上，勾上的几行加描边；移开就没了 */
    await ld(pg, 'SATB+钢琴'); await mode(pg, 'output');
    const shad = () => EV(pg, () => [...document.querySelectorAll('#flw-out-list .flw-orow')].map(r => [r.querySelector('.flw-onm').dataset.id, r.querySelector('.flw-ock').checked, getComputedStyle(r).boxShadow !== 'none']));
    const h0 = await shad(); await pg.hover('#flw-out-parts'); await wait(pg, 150); const h1 = await shad(); await pg.mouse.move(700, 600); await wait(pg, 150); const h2 = await shad();
    T('PU16', h0.every(x => !x[2]) && h1.every(x => x[2] === x[1]) && h1.some(x => x[1]) && h1.some(x => !x[1]) && h2.every(x => !x[2]),
      'PU16b 鼠标停在「分谱」键上：勾上的行加描边、没勾的不加，移开即消失（用结果代替解释，收尾 UX-2 选做）', J({ h0: h0.filter(x => x[2]).length, h1, h2: h2.filter(x => x[2]).length }));
    /* UX-6 当前项灰字对比度（浅 / 深）≥4.5:1；UX-7 深色时原生勾选框按深色画（color-scheme） */
    const ctr = () => EV(pg, () => { const px = c => { const m = c.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
      const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
      const bgOf = e => { const st = []; for (let x = e; x; x = x.parentElement) { const c = px(getComputedStyle(x).backgroundColor); if (c.a > 0) st.push(c); if (c.a >= 1) break; } let b = { r: 255, g: 255, b: 255, a: 1 }; st.reverse().forEach(c => { b = over(c, b); }); return b; };
      const L = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const e = document.querySelector('#flw-out-list .flw-onm[aria-current="true"] .flw-old'); if (!e) return null;
      let fg = px(getComputedStyle(e).color), op = 1; for (let x = e; x; x = x.parentElement) op *= +getComputedStyle(x).opacity;
      const bg = bgOf(e); fg = over({ r: fg.r, g: fg.g, b: fg.b, a: fg.a * op }, bg); const a = L(fg), b = L(bg);
      const cb = document.querySelector('#flw-out-list input.flw-ock:not(:checked)');
      return { ratio: +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2), cs: cb ? getComputedStyle(cb).colorScheme : null }; });
    const cl = await ctr(); await EV(pg, () => { document.documentElement.dataset.theme = 'dark'; }); await wait(pg, 200); const cd = await ctr(); await EV(pg, () => { delete document.documentElement.dataset.theme; }); await wait(pg, 150);
    T('PU16', !!cl && !!cd && cl.ratio >= 4.5 && cd.ratio >= 4.5, 'PU16c 当前项灰字「 · 全部 N 轨」对比度：浅 ' + (cl && cl.ratio) + ':1、深 ' + (cd && cd.ratio) + ':1，都 ≥4.5:1（此前 3.36 / 4.22——收尾 UX-6）', J({ cl, cd }));
    T('PU16', !!cl && !!cd && cl.cs === 'normal' && cd.cs === 'dark', 'PU16d 深色主题下没勾的原生勾选框 color-scheme＝dark（不再是纯白方块；浅色照旧 normal——收尾 UX-7）', J({ light: cl && cl.cs, dark: cd && cd.cs }));
    /* UX-9 看分谱时导出「始终是总谱」的几项，提示末尾加「（总谱）」；看总谱时不加 */
    await view(pg, 'v1');
    const ex = await EV(pg, async () => { const a = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () {}; const T = () => document.getElementById('toast').textContent, o = {};
      try { for (const k of ['mxl', 'mid', 'mtab']) { document.getElementById('flw-out-' + k).click(); await new Promise(r => setTimeout(r, 250)); o[k] = T(); }
        FLOW.out.view('score'); await new Promise(r => setTimeout(r, 300)); document.getElementById('flw-out-mxl').click(); await new Promise(r => setTimeout(r, 250)); o.score = T(); o.left = TOAST_SFX; }
      finally { HTMLAnchorElement.prototype.click = a; } return o; });
    T('PU16', /（总谱）$/.test(ex.mxl) && /（总谱）$/.test(ex.mid) && ex.mtab === '已导出曲谱文件（总谱）' && !/（总谱）/.test(ex.score) && /^已导出 MusicXML/.test(ex.score) && ex.left === null,
      'PU16e 看「女低音」时导出 MusicXML / MIDI / 曲谱文件：提示末尾加「（总谱）」（导出的始终是总谱）；回到总谱再导出不加（收尾 UX-9）', J(ex));
    /* UX-10「沿用总谱换行」悬停写明只作用于分谱；UX-11 命令面板「预览总谱」后焦点在预览区 */
    await ld(pg, '小星星+换行'); await mode(pg, 'output'); await view(pg, 'v0');
    const bt = await EV(pg, () => { const e = document.getElementById('flw-out-brkr'); return { vis: __vis(e), t: e.title }; });
    await pg.keyboard.press('Control+/'); await wait(pg, 350); await pg.keyboard.type('预览总谱'); await wait(pg, 350); await pg.keyboard.press('Enter'); await wait(pg, 700);
    const fc = await EV(pg, () => ({ a: document.activeElement && document.activeElement.id, cur: FLOW.out.cur }));
    T('PU16', bt.vis && bt.t === '只作用于分谱' && fc.a === 'pv-stage' && fc.cur === 'score',
      'PU16f「沿用总谱换行」悬停「只作用于分谱」（收尾 UX-10）；命令面板回车「预览总谱」后回到总谱、焦点在预览区 #pv-stage（此前掉到 body——收尾 UX-11）', J({ bt, fc }));
    await mode(pg, 'write'); await close(pg);
  }));

  await pool(jobs, 2);
  await b.close();
  const order = ['PU1', 'PU2', 'PU3', 'PU4', 'PU5', 'PU6', 'PU7', 'PU8', 'PU9', 'PU10', 'PU11', 'PU12', 'PU13', 'PU14', 'PU15', 'PU16'];
  order.forEach(k => (OUT[k] || []).forEach(l => console.log(l)));
  Object.keys(OUT).filter(k => !order.includes(k)).forEach(k => OUT[k].forEach(l => console.log(l)));
  if (RL.length) { const bad = RL.filter(x => !x.ok); total++; if (!bad.length) pass++;
    console.log((bad.length ? '❌ ' : '✅ ') + 'RL 数据红线：song 字段集合不变、不新增 musetab-* 键：' + (bad.length ? bad.map(x => x.d).join('；') : RL.length + ' 个场景')); }
  if (errs.length) { total++; console.log('❌ 页面报错 ' + errs.length + '：' + errs.slice(0, 5).join(' | ')); } else { total++; pass++; console.log('✅ 页面无报错'); }
  console.log('\n' + pass + '/' + total + ' 通过');
  process.exit(pass === total ? 0 : 1);
})();
