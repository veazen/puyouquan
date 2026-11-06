'use strict';
/* v70.1 P2b A 组「新建：第一步按谱种」（规格 docs/spec-2026-11-v701.md §14.1；共享 helper tests/lib/nfpick.js §15.1；零差异基线 fixtures/v701_base.json＝1122ea3 §14.3）。
   第 0 步只有 P0 / F3 / E；A 组 ⑤ 补齐 F1 / F2 / F4–F13（规格 §14.1 表）。
   P0  数据：NWP.PZ_FORMS 24 行与规格 §3.1 逐字段相同（字段名固定）；谱种顺序＝PQ_KIND.PZ、形态名 ≤4 字（id 的二级在谱库表里时与二级同名）；每谱种恰一个 def、＝PZ_DEF；
       PZ_IC＝CC_PZ_IC；24 行 fmApply(干净状态, id, true) 后 fmMatch 真、st.pick＝该形态、planOf＝等价深链 planOf（逐字节）、fresh({form}) 同；fresh 不带 form 时 pick＝''；
       同用途换形态只写本形态的 v 与旋律（合唱谱两形态保留三部、弹唱 ↔ 纯伴奏旋律保留、清 st.link）；
       全部可达组合（tv_newpanel 43 组合 ＋ tv_v700new 金表 ＋ 本表 36 行 ＋ §8.1 深链表 ＋ 自选）fmHome＝nfpick.NF_MAP（两处各写一遍互核），§8.1 深链落点逐条；
       GOLD 36 行 linkApply → planOf → realCreate：面板谱行 / 建成谱行 / 谱名（面板＝建成＝docTypeLabel＝页签）/ 主谱种 › 二级 / 也在 / intent；
       建谱后 musetab-nw-last 的键集合不变（st.pick 不进本机键）
   F3  验收③ 零差异与回滚：?next=0 / ?shell=classic 11 个用途 .nf-shell（去预览框）与 fixture n0.sc / classic.sc 逐字节；回滚副本（nfpick.rollbackUrl）新形态 11 个用途、#spd-nx、
       Alt+N 键序列与 fixture nx.* 逐字节；源码里「const NW_P2B = 1;」恰一处；当前页新形态 11 个用途都与 fixture nx.sc 不同（防开关失效；第 0 步时是「相同」）
   F1  验收① 点击数（常用 4 卡 / 7 个谱种默认形态＝2、二胡 3、合唱＋钢琴 3、简谱 › 带伴奏 3、萨克斯简谱 4、尤克里里指弹 3、简谱视唱 3；每一下先断言可见 / 命中 / 在视口与面板内）
       ＋ 几何（6 个视口 × 默认字体 / DejaVu Sans：左栏 13 项高 ≥44、不截断、不滚动；24 形态 chip 高 ≥44；⋯ 弹层不压参数行）
   F2  验收② 36 行真实点击建谱 ↔ 同页等价深链 realCreate：song JSON 逐字节；谱名 / 谱行 / 主谱种 › 二级 / 也在 / intent＝nfpick.GOLD
   F4  验收④ 5 个不再是卡的用途：新形态无 [data-scene]；nfPick / __nfPick 新位置先断言可见再点、落点＝fmHome；旧外壳 / ?next=0 照点卡
   F5  验收⑤ 左栏可见字 ≤59 且 < 回滚副本；textaudit newpanel ≤97 / newpanel-pacc ≤104、说明字 0、悬停字 ≤ 回滚；新元素无 title
   F6  验收⑥ DOM：id 不重复、谱种行 / chip 不带 data-scene、listbox 与 chip 组 roving 单选；对比度 ≥4.5（浅 / 深色）
   F7  键盘：Alt+N 落点、↑↓ Home End 序列、listbox ←→ 无作用、Tab 到 chip、chip ←→↑↓ 循环、chip Enter＝建 / Space 不建、谱种行 Enter、双击、1–5、Ctrl+Z 连 pick、Esc、Alt+Shift+N
   F8  §8.1 深链 24 条落点 ＋ 往返 ＋ 隐藏控件一致；启动台 5 卡落点
   F9  上次：预置 7 种 musetab-nw-last 的落点与「上次的形态只对那一个谱种」；建谱后本机键形状不变
   F10 24 形态的参数行 / MAINV2 / ⋯ / 预览左上 / #nf-inst 选项序列＝规格 §5 / §3.5
   F11 旋律用（形态定死时不随乐器改；常用视唱练耳照 P2a；弹唱 ↔ 纯伴奏 旋律保留）
   F12 7 条建谱路径 intent＝形态用途、create_stack meta 过格式（桩 pyqEvent）
   F13 离屏不变量：交替点 50 次后 Esc，本机存储 / 撤销重做 / 选区 / #paper / #score / 窗口数不变
   E   页面脚本错误 0
   修前红（被测页指向 1122ea3 副本）：P0 / F1 / F2 / F4–F13 红（没有 NWP.PZ_FORMS / 谱种行），F3 的 ?next=0 / 旧外壳零差异段绿、回滚段抛错（基线无 NW_P2B）
   用法：node tv_v701new.js [--write-base | --diff-base]
     --write-base  用 git show 1122ea3:muse-tab/index.html 的副本生成 fixtures/v701_base.json（§14.3 全部键，含 B 组读的 nx.qm / nx.cmd / nx.file / n0.* / classic.*；其余键原样保留）
     --diff-base   只打印：当前页与回滚副本的整份快照逐键对 fixture（定位差异用，不断言）
   env：MUSETAB_URL 被测页（file://）· ONLY=P0,F3 · FONTS=0（F1 几何只跑默认字体） */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const NFP = require('./lib/nfpick');
const TA = require('./lib/textaudit/states.js'), M = require('./lib/textaudit/metrics.js');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = NFP.withQ;
const BASE_COMMIT = '1122ea36c81f1f4e8129e83468e2cc11d294feac';
const FIX = path.join(__dirname, 'fixtures', 'v701_base.json');
const WRITE = process.argv.includes('--write-base'), DIFF = process.argv.includes('--diff-base');
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const J = x => JSON.stringify(x), W = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, total = 0; const pageErrs = [];
const T = (id, ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅ ' : '❌ ') + id + ' ' + name + (!ok && d != null ? '\n     ' + String(d).slice(0, 1800) : '')); };
const NOTE = s => console.log('ℹ️ ' + s);

/* 规格 §3.1 的独立一份（P0 逐字段对 NWP.PZ_FORMS）：[id, n, sc, v, mel, mel0, ks, pc, def, home, hid, ik] */
const SPEC = [
  ['jianpu.gequ', '歌曲', 'vocal', { parts: 1 }, 'J', null, 'J JG', 1, 1, 1, 'mel parts', null],
  ['jianpu.daiban', '带伴奏', 'pacc', { acc: 'mel' }, 'J', null, 'JG', null, null, null, 'mel acc', null],
  ['jianpu.hechang', '合唱', 'vocal', { parts: 4 }, 'J', null, 'J JG', 2, null, null, 'mel', null],
  ['jianpu.qiyue', '器乐', 'inst', { instKey: 'erhu', tacc: 'no' }, 'J', null, 'J', null, null, 1, 'mel tacc', 'jianpu'],
  ['jianpu.shichang', '视唱', 'sight', {}, 'J', null, 'J', null, null, 1, 'mel', null],
  ['jianpu.duizhao', '对照谱', 'teach', {}, null, null, 'SJ SJG', null, null, null, '', null],
  ['wuxian.gequ', '歌曲', 'vocal', { parts: 1 }, 'S', null, 'S SG', 1, 1, 1, 'mel parts', null],
  ['wuxian.daiban', '带伴奏', 'pacc', { acc: 'mel' }, 'S', null, 'SG', null, null, null, 'mel acc', null],
  ['wuxian.hechang', '合唱', 'vocal', { parts: 4 }, 'S', null, 'S SG', 2, null, null, 'mel', null],
  ['wuxian.qiyue', '器乐', 'inst', { instKey: 'violin' }, 'S', null, 'S SG', null, null, 1, 'mel', 'wuxian'],
  ['wuxian.shichang', '视唱', 'sight', {}, 'S', null, 'S', null, null, null, 'mel', null],
  ['wuxian.duizhao', '对照谱', 'teach', {}, null, null, 'SJ SJG', null, null, null, '', null],
  ['gangqin.duzou', '独奏', 'inst', { instKey: 'piano' }, null, null, 'G', null, 1, 1, '', 'gangqin'],
  ['gangqin.tanchang', '弹唱', 'pacc', { acc: 'mel' }, null, 'J', 'JG SG', null, null, null, 'acc', null],
  ['gangqin.erge', '儿歌弹唱', 'kids', { acc: 'mel' }, null, 'J', 'JG SG', null, null, null, 'acc', null],
  ['gangqin.chunban', '纯伴奏', 'pacc', { acc: 'pure' }, null, null, 'CG', null, null, 1, 'acc', null],
  ['jita.tanchang', '弹唱', 'gtr', { inst: 'guitar' }, null, null, 'JT', null, 1, 1, 'inst', null],
  ['jita.zhitan', '指弹', 'solo', { inst: 'guitar' }, null, null, 'ST', null, null, 1, 'inst', null],
  ['uku.tanchang', '弹唱', 'gtr', { inst: 'uku' }, null, null, 'JT', null, 1, 1, 'inst', null],
  ['uku.zhitan', '指弹', 'solo', { inst: 'uku' }, null, null, 'ST', null, null, 1, 'inst', null],
  ['hechang.jianpu', '简谱合唱', 'vocal', { parts: 4 }, 'J', null, 'J JG', 2, 1, 1, 'mel', null],
  ['hechang.wuxian', '五线合唱', 'vocal', { parts: 4 }, 'S', null, 'S SG', 2, null, 1, 'mel', null],
  ['gongneng.jishu', '级数谱', 'chord', { ftype: 'CJ' }, null, 'J', 'CJ CS', null, 1, 1, 'ftype', null],
  ['gongneng.hexian', '和弦格', 'chord', { ftype: 'C' }, null, null, 'C', null, null, 1, 'ftype', null],
];
const FORM_KEYS = ['id', 'pz', 'n', 'sc', 'v', 'mel', 'mel0', 'ks', 'pc', 'def', 'home', 'hid', 'ik'];
/* §8.1 深链落点全表（值＝st.pick） */
const DEEP = [['gtr', 'fm:jita.tanchang'], ['gtr&inst=uku', 'fm:uku.tanchang'], ['pacc', 'sc:pacc'], ['pacc&acc=pure', 'fm:gangqin.chunban'], ['kids', 'sc:kids'],
  ['vocal', 'fm:jianpu.gequ'], ['vocal&mel=S', 'fm:wuxian.gequ'], ['vocal&parts=3', 'fm:hechang.jianpu'], ['vocal&parts=4&tacc=with&mel=S', 'fm:hechang.wuxian'],
  ['vocal&parts=1&tacc=with&mel=J', 'fm:jianpu.gequ'], ['teach', 'sc:teach'], ['sight', 'sc:sight'], ['sight&mel=J', 'fm:jianpu.shichang'], ['solo', 'fm:jita.zhitan'],
  ['solo&inst=uku', 'fm:uku.zhitan'], ['inst', 'fm:gangqin.duzou'], ['inst&instKey=violin', 'fm:wuxian.qiyue'], ['inst&instKey=erhu', 'fm:jianpu.qiyue'],
  ['inst&instKey=sax&mel=J', 'fm:jianpu.qiyue'], ['inst&instKey=violin&tacc=with', 'fm:wuxian.qiyue'], ['chord', 'fm:gongneng.hexian'], ['chord&ftype=CJ&mel=S', 'fm:gongneng.jishu'],
  ['blank', 'sc:blank'], ['custom&rows=JT', 'sc:custom']];
/* tv_newpanel 的 43 组合（[用途, 变体, 旋律用]；深链按 tv_v700new N1 的写法：旋律用只在基线能互换的用途上给） */
const COMBOS = [
  ['gtr', { inst: 'guitar', pen: 'T' }, 'J'], ['gtr', { inst: 'guitar', pen: 'J' }, 'J'], ['gtr', { inst: 'uku', pen: 'T' }, 'J'], ['gtr', { inst: 'uku', pen: 'J' }, 'J'],
  ['pacc', { acc: 'mel' }, 'J'], ['pacc', { acc: 'mel' }, 'S'], ['pacc', { acc: 'pure' }, 'J'], ['kids', { acc: 'mel' }, 'J'], ['kids', { acc: 'mel' }, 'S'], ['kids', { acc: 'pure' }, 'J'],
  ['vocal', { parts: 1 }, 'J'], ['vocal', { parts: 1 }, 'S'], ['vocal', { parts: 2 }, 'J'], ['vocal', { parts: 2 }, 'S'], ['vocal', { parts: 3 }, 'J'], ['vocal', { parts: 3 }, 'S'],
  ['vocal', { parts: 4 }, 'J'], ['vocal', { parts: 4 }, 'S'], ['teach', { tacc: 'no' }, 'J'], ['teach', { tacc: 'with' }, 'J'], ['sight', { clef: 'staff' }, 'J'], ['sight', { clef: 'bass' }, 'J'],
  ['solo', {}, 'J'], ['inst', { instKey: 'piano' }, 'J'], ['inst', { instKey: 'violin' }, 'J'], ['inst', { instKey: 'erhu' }, 'J'], ['inst', { instKey: 'erhu' }, 'S'],
  ['inst', { instKey: 'guzheng' }, 'J'], ['inst', { instKey: 'guzheng' }, 'S'], ['inst', { instKey: 'epiano' }, 'J'], ['inst', { instKey: 'flute' }, 'J'], ['inst', { instKey: 'trombone' }, 'J'],
  ['inst', { instKey: 'bass' }, 'J'], ['inst', { instKey: 'dizi' }, 'J'], ['inst', { instKey: 'dizi' }, 'S'], ['inst', { instKey: 'pipa' }, 'J'], ['inst', { instKey: 'pipa' }, 'S'],
  ['inst', { instKey: 'other' }, 'J'], ['chord', { ftype: 'C' }, 'J'], ['chord', { ftype: 'CJ' }, 'J'], ['chord', { ftype: 'CJ' }, 'S'], ['blank', {}, 'J'], ['blank', {}, 'S'],
];
/* tv_v700new 金表的深链（新组合） */
function V700_LINKS() {
  const STAFF_I = ['violin', 'flute', 'sax', 'trumpet', 'horn', 'trombone', 'cello', 'clarinet', 'bass'];
  const JP_I = ['erhu', 'dizi', 'hulusi', 'suona', 'guzheng', 'pipa', 'yangqin', 'harmonica', 'recorder', 'melodica', 'ocarina', 'xiao'];
  const g = [];
  for (const n of [2, 3, 4]) for (const m of ['J', 'S']) g.push('new=vocal&parts=' + n + '&tacc=with&mel=' + m);
  for (const m of ['J', 'S']) { g.push('new=vocal&parts=1&tacc=with&mel=' + m); g.push('new=vocal&parts=1&tacc=with&mel=' + m + '&lyr=0'); }
  g.push('new=solo&inst=uku');
  for (const k of STAFF_I.concat(JP_I, ['other'])) g.push('new=inst&instKey=' + k + '&tacc=with');
  for (const k of STAFF_I) g.push('new=inst&instKey=' + k + '&mel=J');
  for (const k of ['recorder', 'melodica', 'ocarina', 'xiao', 'cello', 'clarinet']) for (const m of ['J', 'S']) g.push('new=inst&instKey=' + k + '&mel=' + m);
  g.push('new=sight&mel=J', 'new=sight', 'new=sight&clef=bass');
  return g;
}
const CUSTOM = ['new=custom&rows=J', 'new=custom&rows=JT', 'new=custom&rows=SJG', 'new=custom&rows=CS', 'new=blank&mel=S'];

function INIT() {
  window.J = x => JSON.stringify(x);
  window.__panel = o => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} try { closeModal(); } catch (_) {} showNewWizard(o || {}); };
  window.__songInfo = (s) => { s = s || song; const pz = PQ_KIND.pzOf(s);
    return { k: NWB.stackOf(s), name: docTypeLabel(s), kind: NWB.kindOfSong(s).name, dt: docType(s), pz: pz.pz + '.' + pz.sub, also: (pz.also || []).slice().sort(), inst: pz.inst || '', intent: s.intent == null ? null : s.intent }; };
  /* 可见 / 中心命中自身 / 整块在视口与 .nf-modal 内（F1 / F2 / F9 每个被点目标都过它） */
  window.__vis = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false; } return true; };
  window.__hit = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e) return false; const r = e.getBoundingClientRect(); const x = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!x && (x === e || e.contains(x)); };
  window.__inBox = e => { if (typeof e === 'string') e = document.querySelector(e); const m = document.querySelector('.nf-modal'); if (!e || !m) return false; const r = e.getBoundingClientRect(), z = m.getBoundingClientRect();
    return r.left >= Math.max(0, z.left) - 0.5 && r.top >= Math.max(0, z.top) - 0.5 && r.right <= Math.min(innerWidth, z.right) + 0.5 && r.bottom <= Math.min(innerHeight, z.bottom) + 0.5; };
  window.__ok = e => { if (typeof e === 'string') e = document.querySelector(e); return !!e && __vis(e) && __hit(e) && __inBox(e); };
  window.__keys = () => Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort();
}
/* CI 字体模拟（同 tv_v700new FONT_INIT）：界面字体换 DejaVu Sans（中文落到系统 CJK 字体） */
function FONT_INIT() {
  const add = () => { const st = document.createElement('style'); st.id = 'v701-font'; st.textContent = ':root{--font-ui:"DejaVu Sans",sans-serif !important}'; (document.head || document.documentElement).appendChild(st); };
  if (document.documentElement) add(); else document.addEventListener('DOMContentLoaded', add);
}
async function open(b, url, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(INIT);
  if (o.font) await ctx.addInitScript(FONT_INIT);
  const pg = await ctx.newPage(); pg.setDefaultTimeout(6000);
  pg.on('pageerror', e => pageErrs.push((o.tag || '') + ' ' + e.message));
  await pg.goto(url); await W(o.wait || 1500);
  await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });
  return { ctx, pg };
}
const guard = async (id, fn) => { const t0 = Date.now(); try { await fn(); } catch (e) { T(id, false, '异常', String(e.stack || e).split('\n').slice(0, 3).join(' | ')); } NOTE(id + ' 用时 ' + Math.round((Date.now() - t0) / 1000) + ' 秒'); };
/* 并行跑 n 路（每路自己的 context；F1 几何 / F2 / F5 / F8 用，单跑控制在 TIMEOUT 450 秒内） */
const par = (xs, fn) => Promise.all(xs.map((x, i) => fn(x, i)));
const VK = ['instKey', 'inst', 'acc', 'tacc', 'ftype', 'pen', 'parts', 'clef', 'oclef'];

(async () => {
  const t0 = Date.now();
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let FX = {}; try { FX = JSON.parse(fs.readFileSync(FIX, 'utf8')); } catch (_) { FX = {}; }
  try {
    /* ===== --write-base：基线 1122ea3 的副本 → fixtures/v701_base.json ===== */
    if (WRITE) {
      const txt = execFileSync('git', ['-C', __dirname, 'show', BASE_COMMIT + ':muse-tab/index.html'], { encoding: 'utf8', maxBuffer: 64 << 20 });
      const f = path.join(os.tmpdir(), 'tv_v701new_base_' + BASE_COMMIT.slice(0, 7) + '.html'); fs.writeFileSync(f, txt);
      const snap = await NFP.baseSnap(b, 'file://' + f);
      let cur = {}; try { cur = JSON.parse(fs.readFileSync(FIX, 'utf8')); } catch (_) {}
      Object.assign(cur, { commit: BASE_COMMIT }, snap);
      fs.mkdirSync(path.dirname(FIX), { recursive: true }); fs.writeFileSync(FIX, JSON.stringify(cur, null, 1) + '\n');
      console.log('已写 ' + FIX + '（基线 ' + BASE_COMMIT.slice(0, 7) + '；nx.sc ' + Object.keys(snap.nx.sc || {}).length + ' 个用途、nx.keys ' + snap.nx.keys.length + ' 步、nx.cmd ' + (snap.nx.cmdTxt || []).length + ' 条）');
      await b.close(); return;
    }
    if (!FX.nx) { T('F3', false, 'fixtures/v701_base.json 缺 nx 键（先跑 --write-base）'); }
    /* ===== --diff-base：逐键打印（不断言） ===== */
    if (DIFF) {
      const flat = (o, p, out) => { for (const [k, v] of Object.entries(o || {})) { const q = p ? p + '.' + k : k; if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, q, out); else out[q] = J(v); } return out; };
      const fx = flat({ nx: FX.nx, n0: FX.n0, classic: FX.classic }, '', {});
      for (const [tag, u] of [['当前页', URL0], ['回滚副本', NFP.rollbackUrl(URL0)]]) {
        const s = flat(await NFP.baseSnap(b, u), '', {}); delete s.qmLs;
        const diff = Object.keys(fx).filter(k => fx[k] !== s[k]);
        NOTE(tag + '：' + (diff.length ? '与 fixture 不同的键 ' + diff.length + ' 个：' + diff.join(' ') : '与 fixture 全部 ' + Object.keys(fx).length + ' 个键逐字节相同'));
      }
      await b.close(); return;
    }

    /* ===== P0 数据 ===== */
    if (want('P0')) await guard('P0', async () => {
      const { ctx, pg } = await open(b, URL0, { tag: 'P0' });
      const all = [...new Set(NFP.GOLD.map(g => g.link).concat(DEEP.map(d => 'new=' + d[0]), V700_LINKS(), CUSTOM))];
      const r = await pg.evaluate(async ([GOLD, LINKS, COMBOS, VK]) => {
        const w = ms => new Promise(res => setTimeout(res, ms));
        try { hideStartPad(); } catch (_) {}
        const o = { p2a: nwP2A(), P2B: NWP.P2B, forms: NWP.PZ_FORMS, def: NWP.PZ_DEF, icSame: J(NWP.PZ_IC) === J(CC_PZ_IC), pz: PQ_KIND.PZ.map(p => ({ id: p.id, name: p.name, subs: p.subs.map(s => s.id + ':' + s.name) })) };
        /* 24 形态：干净状态 fmApply(init) / fresh({form}) ↔ 等价深链 */
        o.apply = NWP.PZ_FORMS.map(f => {
          const g = GOLD.find(x => x.id === f.id), st = NWP.fresh({ clean: true }), ok = NWP.fmApply(st, f.id, true);
          const L = NWP.linkParse('?' + g.link), s2 = NWP.fresh({ clean: true, scene: L.scene, link: L }), s3 = NWP.fresh({ clean: true, form: f.id });
          return { id: f.id, ok, match: NWP.fmMatch('fm:' + f.id, st), pick: st.pick, home: NWP.fmHome(st), same: J(NWP.planOf(st)) === J(NWP.planOf(s2)), same3: J(NWP.planOf(s3)) === J(NWP.planOf(s2)), pick3: s3.pick, lbad: (s2.link || {}).bad || [],
            also: NWP.PZ_FORMS.filter(x => x.id !== f.id && NWP.fmMatch('fm:' + x.id, st)).map(x => x.id) };
        });
        o.pick0 = [NWP.fresh({}).pick, NWP.fresh({ clean: true, scene: 'pacc' }).pick, NWP.fresh({ clean: true, link: NWP.linkParse('?new=vocal') }).pick];
        o.bad = [NWP.fmApply(NWP.fresh({ clean: true }), 'nope.x', true), NWP.fmApply(NWP.fresh({ clean: true }), 'constructor', true), NWP.fmMatch('fm:constructor', NWP.fresh({ clean: true })), NWP.fmMatch('zz', NWP.fresh({ clean: true }))];
        /* 同用途换形态 */
        const sw = {};
        { const st = NWP.fresh({ clean: true }); NWP.fmApply(st, 'hechang.jianpu', true); st.v.parts = 3; NWP.fmApply(st, 'hechang.wuxian'); sw.hc = { parts: st.v.parts, mel: st.mel, pick: st.pick, k: NWP.stackOfState(st) }; }
        { const st = NWP.fresh({ clean: true }); NWP.fmApply(st, 'jianpu.gequ', true); st.v.tacc = 'with'; NWP.fmApply(st, 'jianpu.hechang'); sw.jh = { parts: st.v.parts, tacc: st.v.tacc, pick: st.pick, k: NWP.stackOfState(st) }; }
        { const st = NWP.fresh({ clean: true }); NWP.fmApply(st, 'gangqin.tanchang', true); st.mel = 'S'; NWP.fmApply(st, 'gangqin.chunban'); const a = { mel: st.mel, k: NWP.stackOfState(st) }; NWP.fmApply(st, 'gangqin.tanchang'); sw.pc = { a, mel: st.mel, k: NWP.stackOfState(st), pick: st.pick }; }
        { const L = NWP.linkParse('?new=vocal&tempo=66'), st = NWP.fresh({ clean: true, scene: L.scene, link: L }); const had = !!st.link; NWP.fmApply(st, 'wuxian.gequ'); sw.ln = { had, link: st.link, tempo: st.v.tempo, src: st.src.tempo, mel: st.mel }; }
        { const st = NWP.fresh({ clean: true }); NWP.fmApply(st, 'gongneng.jishu', true); st.mel = 'S'; NWP.fmApply(st, 'gongneng.hexian'); const a = NWP.stackOfState(st); NWP.fmApply(st, 'gongneng.jishu'); sw.gn = { a, k: NWP.stackOfState(st), mel: st.mel }; }
        o.sw = sw;
        /* 可达组合 → fmHome（Node 侧对 NF_MAP） */
        const homes = [];
        for (const q of LINKS) { const L = NWP.linkParse('?' + q), st = NWP.fresh({ clean: true, scene: L.scene, link: L }); homes.push({ q, sc: L.scene, raw: L.raw, home: NWP.fmHome(st), k: NWP.stackOfState(st), fam: PQ_KIND.INST_FAM[L.raw.instKey || 'piano'] || '', bad: (st.link || {}).bad || [] }); }
        for (const [sc, vars, mel] of COMBOS) {
          const v0 = Object.assign({}, NWP.fresh({ clean: true, scene: sc }).v, vars);
          const q = 'new=' + sc + Object.keys(vars).map(k => '&' + k + '=' + vars[k]).join('') + (NWP.melLive(sc, v0) ? '&mel=' + mel : '');
          const L = NWP.linkParse('?' + q), st = NWP.fresh({ clean: true, scene: L.scene, link: L });
          homes.push({ q, sc: L.scene, raw: L.raw, home: NWP.fmHome(st), k: NWP.stackOfState(st), fam: PQ_KIND.INST_FAM[L.raw.instKey || 'piano'] || '', bad: (st.link || {}).bad || [] });
        }
        o.homes = homes;
        /* GOLD 36 行：linkApply → planOf → realCreate */
        const gold = [];
        for (const g of GOLD) {
          const L = NWP.linkParse('?' + g.link), st = NWP.fresh({ clean: true, scene: L.scene, link: L }), P = NWP.planOf(st);
          const d0 = docs.length; realCreate(P, '', null); await w(30);
          const I = __songInfo(song), tip = (document.querySelector('.dtab.on') || {}).title || '';
          gold.push({ id: g.id, P: P.stack, kind: P.kind.name, I, docs: docs.length - d0, tip: tip.indexOf(I.name) >= 0, lbad: (st.link || {}).bad || [] });
          if (docs.length > 3) closeDocAt(curDocI);
        }
        o.gold = gold;
        /* 建谱后本机键 musetab-nw-last 的形状不变（st.pick 不进本机键） */
        try { localStorage.removeItem('musetab-nw-last'); } catch (_) {}
        __panel({ scene: 'vocal' }); await w(250);
        const pk = NWP.state ? NWP.state.pick : null; document.getElementById('nw-create').click(); await w(300);
        let nl = null; try { nl = JSON.parse(localStorage.getItem('musetab-nw-last')); } catch (_) {}
        o.nl = { pk, keys: nl ? Object.keys(nl) : null, vkeys: nl && nl.v ? Object.keys(nl.v).sort() : null };
        if (docs.length > 3) closeDocAt(curDocI);
        return o;
      }, [NFP.GOLD, all, COMBOS, VK]);
      await ctx.close();
      T('P0', r.p2a && r.P2B === 1, '被测页新形态（nwP2A() 真）且 NWP.P2B＝1', J({ p2a: r.p2a, P2B: r.P2B }));
      /* 表与规格逐字段 */
      const F = r.forms, bad = [];
      if (F.length !== 24) bad.push('行数 ' + F.length);
      SPEC.forEach(([id, n, sc, v, mel, mel0, ks, pc, def, home, hid, ik], i) => {
        const f = F[i] || {}, extra = Object.keys(f).filter(k => !FORM_KEYS.includes(k));
        const got = [f.id, f.n, f.sc, J(f.v), f.mel || null, f.mel0 || null, (f.ks || []).join(' '), f.pc || null, f.def || null, f.home || null, (f.hid || []).join(' '), f.ik || null];
        const exp = [id, n, sc, J(v), mel, mel0, ks, pc, def, home, hid, ik];
        if (J(got) !== J(exp) || f.pz !== id.split('.')[0] || extra.length) bad.push(i + 1 + ' ' + J({ got, exp, pz: f.pz, extra }));
      });
      T('P0', !bad.length, 'NWP.PZ_FORMS 24 行与规格 §3.1 逐字段相同（id / pz / n / sc / v / mel / mel0 / ks / pc / def / home / hid / ik，无多余字段）', bad.slice(0, 4).join(' | '));
      const order = [...new Set(F.map(f => f.pz))], contig = order.every(p => { const ix = F.map((f, i) => f.pz === p ? i : -1).filter(i => i >= 0); return ix[ix.length - 1] - ix[0] === ix.length - 1; });
      const subName = F.filter(f => { const p = r.pz.find(x => x.id === f.pz), s = p && p.subs.find(x => x.split(':')[0] === f.id.split('.')[1]); return s && s.split(':')[1] !== f.n; }).map(f => f.id);
      T('P0', J(order) === J(r.pz.map(p => p.id)) && contig && F.every(f => [...f.n].length <= 4 && [...f.n].length >= 2) && !subName.length,
        '谱种顺序＝PQ_KIND.PZ（7 个、各自连续）；形态名 2–4 字；id 的二级在谱库表里时形态名＝二级名（对照谱 / 合唱 / 简谱合唱 …）', J({ order, contig, subName }));
      const defs = r.pz.map(p => F.filter(f => f.pz === p.id && f.def).map(f => f.id));
      T('P0', defs.every(d => d.length === 1) && J(Object.fromEntries(r.pz.map((p, i) => [p.id, defs[i][0]]))) === J(r.def) && r.def.gongneng === 'gongneng.jishu' && r.def.jita === 'jita.tanchang',
        '每个谱种恰一个默认形态（●）且＝PZ_DEF（功能谱 › 级数谱、吉他谱 › 弹唱 …）', J({ defs, def: r.def }));
      T('P0', r.icSame, 'PZ_IC 与新外壳谱友圈 CC_PZ_IC 逐项相同');
      T('P0', F.filter(f => f.home).length === 15, '归属形态 15 个（命令面板 19 条＝15 ＋ 常用 4）', F.filter(f => f.home).map(f => f.id).join(' '));
      const ap = r.apply.filter(a => !(a.ok && a.match && a.pick === 'fm:' + a.id && a.same && a.same3 && a.pick3 === 'fm:' + a.id && !a.lbad.length));
      T('P0', !ap.length, '24 个形态：干净状态 fmApply(st, id, true) 后 fmMatch 真、st.pick＝fm:id、planOf 与等价深链逐字节相同；fresh({clean, form}) 同', J(ap.slice(0, 3)));
      const hm = r.apply.filter(a => { const f = F.find(x => x.id === a.id); return f.home ? a.home !== 'fm:' + a.id : a.home === 'fm:' + a.id; });
      T('P0', !hm.length, '归属形态 fmApply 后 fmHome 落回自身；非归属形态（简谱 › 合唱 / 带伴奏 / 对照谱、五线谱 › 视唱 …）fmHome 落到别处', J(hm.map(a => a.id + '→' + a.home)));
      T('P0', J(r.pick0) === J(['', '', '']) && r.bad.every(x => x === false), 'fresh 不带 form 时 st.pick＝\'\'（上次 / 用途 / 深链）；未知形态 id（含原型链键）fmApply / fmMatch 为假', J({ pick0: r.pick0, bad: r.bad }));
      const s = r.sw;
      T('P0', s.hc.parts === 3 && s.hc.mel === 'S' && s.hc.pick === 'fm:hechang.wuxian' && s.hc.k === 'S' && s.jh.parts === 4 && s.jh.tacc === 'with' && s.jh.k === 'JG' && s.jh.pick === 'fm:jianpu.hechang'
        && s.pc.a.mel === 'S' && s.pc.a.k === 'CG' && s.pc.mel === 'S' && s.pc.k === 'SG' && s.pc.pick === 'fm:gangqin.tanchang' && s.ln.had && s.ln.link === null && s.ln.mel === 'S' && s.gn.a === 'C' && s.gn.k === 'CS',
        '同用途换形态只写本形态的 v 与旋律：合唱谱 简谱 → 五线 保留三部；简谱 歌曲 → 合唱 声部 1 → 4、钢琴伴奏保留；钢琴谱 弹唱 ↔ 纯伴奏 旋律（五线）保留；功能谱 级数 ↔ 和弦格 旋律保留；换形态清深链提示', J(s));
      /* 可达组合 fmHome ↔ NF_MAP */
      const mis = [], deepBad = [], fixBad = [];
      for (const h of r.homes) {
        if (h.bad.length) { mis.push(h.q + ' 没认出 ' + J(h.bad)); continue; }
        const v = {}; VK.forEach(k => { if (h.raw[k] != null) v[k] = h.raw[k]; });
        let m; try { m = NFP.NF_MAP(h.sc, v, h.raw.mel, h.fam); } catch (e) { mis.push(h.q + ' NF_MAP 抛错 ' + e.message); continue; }
        if (NFP.pickOf(m) !== h.home) mis.push(h.q + ' fmHome=' + h.home + ' NF_MAP=' + NFP.pickOf(m) + ' (' + h.k + ')');
        if (!m.card) { const f = F.find(x => x.id === m.pz + '.' + m.form); if (!f || J(f.hid) !== J(m.fixed)) fixBad.push(h.q + ' fixed=' + J(m.fixed) + ' hid=' + J(f && f.hid)); }
      }
      for (const [q, exp] of DEEP) { const h = r.homes.find(x => x.q === 'new=' + q); if (!h || h.home !== exp) deepBad.push(q + '→' + (h && h.home) + '（应 ' + exp + '）'); }
      T('P0', !mis.length && r.homes.length >= 130, '全部可达组合 ' + r.homes.length + ' 个（43 组合 ＋ v70.0 金表 ＋ 36 行 ＋ §8.1 深链 ＋ 自选）：fmHome＝nfpick.NF_MAP（两处各写一遍）', mis.slice(0, 6).join(' | '));
      T('P0', !deepBad.length, '§8.1 深链落点 ' + DEEP.length + ' 条逐条（gtr → 吉他谱 › 弹唱、pacc&acc=pure → 钢琴谱 › 纯伴奏、chord → 功能谱 › 和弦格 …）', deepBad.join(' | '));
      T('P0', !fixBad.length, 'NF_MAP 的 fixed＝该形态 hid', fixBad.slice(0, 4).join(' | '));
      const gb = r.gold.filter(x => { const g = NFP.GOLD.find(y => y.id === x.id);
        return !(x.P === g.pk && x.I.k === g.bk && x.kind === g.name && x.I.name === g.name && x.I.kind === g.name && x.I.pz === g.pz && J(x.I.also) === J(g.also.slice().sort()) && x.I.intent === g.intent && x.docs === 1 && x.tip && !x.lbad.length); });
      T('P0', NFP.GOLD.length === 36 && !gb.length, 'nfpick.GOLD 36 行（24 形态 ＋ 变体 a–l）linkApply → planOf → realCreate：面板谱行 / 建成谱行 / 谱名（面板＝建成＝docTypeLabel＝页签）/ 主谱种 › 二级 / 也在 / intent 与金表相同',
        gb.slice(0, 4).map(x => x.id + ' ' + J(x)).join(' | '));
      T('P0', J(r.nl.keys) === J(['scene', 'stack', 'rows', 'mel', 'v', 't']) && r.nl.vkeys && !r.nl.vkeys.includes('pick'),
        '建谱后 musetab-nw-last 键集合＝scene stack rows mel v t、v 里无 pick（st.pick 不进本机键）', J(r.nl));
    });

    /* ===== F3 验收③ 零差异与回滚 ===== */
    if (want('F3') && FX.nx) await guard('F3', async () => {
      const cmp = (a, z) => Object.keys(z || {}).filter(k => (a || {})[k] !== z[k]);
      let RB = null, rbErr = ''; try { RB = NFP.rollbackUrl(URL0); } catch (e) { rbErr = e.message; }   /* 被测页没有开关（如指向基线副本）：回滚段判红，零差异段照跑 */
      /* 五份快照互不相干：并行跑（结果按原顺序出） */
      const [n0, cl, rb, ks, cur] = await Promise.all([
        NFP.snapShell(b, withQ(URL0, 'next=0'), ['sc'], { errs: pageErrs, tag: 'F3 next=0' }),
        NFP.snapShell(b, withQ(URL0, 'shell=classic'), ['sc'], { errs: pageErrs, tag: 'F3 shell=classic' }),
        RB ? NFP.snapShell(b, RB, ['sc', 'spd'], { errs: pageErrs, tag: 'F3 回滚' }) : { sc: null, spd: null },
        RB ? NFP.keySeq(b, RB) : [],
        NFP.snapShell(b, URL0, ['sc'], { errs: pageErrs, tag: 'F3 当前' })]);
      for (const [q, key, c] of [['next=0', 'n0', n0], ['shell=classic', 'classic', cl]]) {
        const d = cmp(NFP.hashSc(c.sc), FX[key].sc);
        T('F3', !d.length && Object.keys(FX[key].sc).length === 11, '?' + q + '：11 个用途 .nf-shell（去预览框）与 fixture ' + key + '.sc（' + BASE_COMMIT.slice(0, 7) + '）逐字节相同', '不同：' + d.join(' '));
      }
      const d1 = cmp(NFP.hashSc(rb.sc), FX.nx.sc);
      T('F3', !!RB && !d1.length && NFP.sha(rb.spd) === FX.nx.spd, '回滚副本（NW_P2B＝0）新形态：11 个用途 .nf-shell 与 #spd-nx 与 fixture nx.* 逐字节相同', rbErr || J({ sc: d1, spd: NFP.sha(rb.spd) === FX.nx.spd }));
      const kz = FX.nx.keys || [];
      const kd = ks.map((x, i) => x === kz[i] ? null : [i, x, kz[i]]).filter(Boolean);
      T('F3', !kd.length && ks.length === kz.length && ks.length >= 20, '回滚副本 Alt+N 后键序列 ' + ks.length + ' 步与 fixture nx.keys 逐步相同', J(kd.slice(0, 3)));
      const src = /^file:\/\//.test(URL0) ? fs.readFileSync(decodeURIComponent(URL0.replace(/^file:\/\//, '').replace(/[?#].*$/, '')), 'utf8') : '';
      T('F3', src.split(NFP.NEEDLE).length - 1 === 1 && (src.split('\n').find(l => l.includes(NFP.NEEDLE)) || '') === NFP.NEEDLE, '源码里「const NW_P2B = 1;」恰一处、独占一行（回滚副本按这串字替换）');
      const d2 = cmp(NFP.hashSc(cur.sc), FX.nx.sc);
      /* 规格 §14.1 F3：当前页（NW_P2B＝1）新形态 11 个用途都与 fixture nx.sc 不同（左栏换成谱种——防开关失效；第 0 步时这条是「相同」） */
      T('F3', d2.length === 11, '当前页（NW_P2B＝1）新形态 11 个用途 .nf-shell 都与 fixture nx.sc 不同（防开关失效）', '相同的：' + Object.keys(FX.nx.sc).filter(k => !d2.includes(k)).join(' '));
    });

    /* ===== F1 验收① 点击数 ＋ 几何 ===== */
    if (want('F1')) await guard('F1', async () => {
      /* 点击数（首访面板、真实点击、每一下先断言可见 / 命中自身 / 在视口与面板内） */
      const { ctx, pg } = await open(b, URL0, { tag: 'F1' });
      const P = (n, steps, name, intent, want) => ({ n, steps, name, intent, want: want || steps.length + 1 });
      const PATHS = [
        P('常用 钢琴即兴伴奏', [['c', '[data-scene="pacc"]']], '钢琴伴奏歌谱', 'pacc', 2), P('常用 儿歌弹唱', [['c', '[data-scene="kids"]']], '钢琴伴奏歌谱', 'kids', 2),
        P('常用 视唱练耳谱例', [['c', '[data-scene="sight"]']], '五线谱旋律', 'sight', 2), P('常用 教学对照谱', [['c', '[data-scene="teach"]']], '教学对照谱', 'teach', 2),
        P('简谱 ●', [['c', '[data-pz="jianpu"]']], '简谱歌谱', 'vocal', 2), P('五线谱 ●', [['c', '[data-pz="wuxian"]']], '五线谱歌谱', 'vocal', 2),
        P('钢琴谱 ●（钢琴独奏）', [['c', '[data-pz="gangqin"]']], '钢琴独奏谱', 'inst', 2), P('吉他谱 ●', [['c', '[data-pz="jita"]']], '吉他弹唱谱', 'gtr', 2),
        P('尤克里里 ●', [['c', '[data-pz="uku"]']], '尤克里里弹唱谱', 'gtr', 2), P('合唱谱 ●（简谱合唱四部）', [['c', '[data-pz="hechang"]']], '简谱合唱谱', 'vocal', 2),
        P('功能谱 ●', [['c', '[data-pz="gongneng"]']], '功能谱', 'chord', 2),
        P('二胡独奏', [['c', '[data-pz="jianpu"]'], ['c', '[data-form="jianpu.qiyue"]']], '二胡谱（简谱）', 'inst', 3),
        P('合唱＋钢琴', [['c', '[data-pz="hechang"]'], ['c', '#nf-params [data-act="var"][data-k="tacc"][data-v="with"]']], '简谱合唱谱（含钢琴伴奏）', 'vocal', 3),
        P('简谱＋钢琴（简谱 › 带伴奏）', [['c', '[data-pz="jianpu"]'], ['c', '[data-form="jianpu.daiban"]']], '钢琴伴奏歌谱', 'pacc', 3),
        P('萨克斯简谱', [['c', '[data-pz="jianpu"]'], ['c', '[data-form="jianpu.qiyue"]'], ['s', '#nf-inst', 'sax']], '萨克斯谱（简谱）', 'inst', 4),
        P('尤克里里指弹', [['c', '[data-pz="uku"]'], ['c', '[data-form="uku.zhitan"]']], '尤克里里独奏谱', 'solo', 3),
        P('简谱视唱', [['c', '[data-pz="jianpu"]'], ['c', '[data-form="jianpu.shichang"]']], '简谱歌谱', 'sight', 3),
      ];
      const bad = [], got = [];
      for (const p of PATHS) {
        await pg.evaluate(() => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} __panel(); }); await W(220);
        let n = 0; const miss = [];
        for (const [t, s0, v] of p.steps) {
          const s = /^#/.test(s0) ? '.nf-modal ' + s0 : '.nf-modal ' + s0;
          if (!(await pg.evaluate(s => __ok(s), s))) miss.push(s);
          if (t === 's') await pg.selectOption(s, v); else await pg.click(s);
          n++; await W(70);
        }
        if (!(await pg.evaluate(() => __ok('#nw-create')))) miss.push('#nw-create');
        const d0 = await pg.evaluate(() => docs.length);
        await pg.click('.nf-modal #nw-create'); n++; await W(220);
        const I = await pg.evaluate(() => Object.assign(__songInfo(song), { docs: docs.length, open: !!document.querySelector('.nf-modal') }));
        got.push(p.n + ' ' + n);
        if (miss.length || n !== p.want || I.docs !== d0 + 1 || I.open || I.name !== p.name || I.intent !== p.intent) bad.push(p.n + ' ' + J({ n, want: p.want, miss, I }));
        await pg.evaluate(() => { if (docs.length > 3) closeDocAt(curDocI); });
      }
      await ctx.close();
      T('F1', !bad.length, '点击数（首访面板起、含「创建」，每一下先断言可见 / 命中 / 在视口与面板内）：常用 4 卡＝2、7 个谱种默认形态＝2、二胡 3、合唱＋钢琴 3、简谱 › 带伴奏 3、萨克斯简谱 4、尤克里里指弹 3、简谱视唱 3；谱名 / intent 对', bad.join(' | ') || got.join('，'));
      /* 几何：6 个视口 × 默认字体 / DejaVu Sans */
      const VPS = [[1920, 1080], [1440, 900], [1366, 768], [1280, 800], [1280, 720], [1024, 700]];
      const fonts = process.env.FONTS === '0' ? [false] : [false, true];
      for (const font of fonts) {
        const gbad = [];
        await par(VPS, async ([w, h]) => {
          const o = await open(b, URL0, { tag: 'F1g', w, h, font });
          const r = await o.pg.evaluate(async () => {
            const wt = ms => new Promise(res => setTimeout(res, ms)), bad = [];
            try { localStorage.removeItem('musetab-nw-last'); } catch (_) {}
            __panel(); await wt(250);
            const L = document.querySelector('.nf-modal .nf-left');
            if (L.scrollHeight > L.clientHeight + 1) bad.push('左栏要滚动 ' + L.scrollHeight + '>' + L.clientHeight);
            const chkRow = (e, tag) => { const r = e.getBoundingClientRect(), bb = e.querySelector('b');
              if (r.height < 44) bad.push(tag + ' 高 ' + r.height); if (!__ok(e)) bad.push(tag + ' 不可见 / 被挡 / 出框');
              if (bb && bb.scrollWidth > bb.clientWidth) bad.push(tag + ' 截断 ' + bb.scrollWidth + '>' + bb.clientWidth); };
            document.querySelectorAll('.nf-modal .nf-left [role=option]').forEach(e => chkRow(e, e.dataset.pz || e.dataset.scene));
            for (const p of PQ_KIND.PZ) {
              const row = document.querySelector('.nf-modal [data-pz="' + p.id + '"]'); row.click(); await wt(40);
              const ids = [...document.querySelectorAll('.nf-modal #nf-forms [data-form]')].map(c => c.dataset.form);
              if (J(ids) !== J(NWP.PZ_FORMS.filter(f => f.pz === p.id).map(f => f.id))) bad.push(p.id + ' chip 序列 ' + J(ids));
              for (const id of ids) {
                const c = document.querySelector('.nf-modal [data-form="' + id + '"]'); c.click(); await wt(30);
                const c2 = document.querySelector('.nf-modal [data-form="' + id + '"]'), r = c2.getBoundingClientRect();
                if (r.height < 44) bad.push(id + ' chip 高 ' + r.height); if (!__ok(c2)) bad.push(id + ' chip 不可见 / 被挡 / 出框'); if (c2.scrollWidth > c2.clientWidth + 1) bad.push(id + ' chip 截断');
                document.querySelectorAll('.nf-modal #nf-forms [data-form]').forEach(x => { if (!__ok(x)) bad.push(id + ' 时 chip ' + x.dataset.form + ' 不可见'); });
                if (!__ok('#nf-more')) bad.push(id + ' ⋯ 不可见'); if (!__ok('#nw-create')) bad.push(id + ' 创建钮不可见');
                document.querySelector('#nf-more').click(); await wt(30);
                const m = document.querySelector('#nf-more').getBoundingClientRect(), pb = document.querySelector('#nf-moreb'), pr = document.querySelector('#nf-params').getBoundingClientRect();
                if (!pb) bad.push(id + ' ⋯ 弹层没开'); else { const a = pb.getBoundingClientRect(); if (a.top < m.bottom + 4 || a.top < pr.bottom) bad.push(id + ' ⋯ 弹层顶 ' + Math.round(a.top) + ' 压到参数行（⋯ 底 ' + Math.round(m.bottom) + '，参数行底 ' + Math.round(pr.bottom) + '）'); }
                document.querySelector('#nf-more').click(); await wt(20);
              }
            }
            try { closeModal(); } catch (_) {}
            return bad;
          });
          await o.ctx.close();
          r.forEach(x => gbad.push(w + '×' + h + ' ' + x));
        });
        T('F1', !gbad.length, '几何（' + (font ? 'DejaVu Sans' : '默认字体') + '，6 个视口）：左栏 13 项高 ≥44、可见 / 命中 / 在视口与面板内、名字不截断、左栏不滚动；24 个形态的 chip 高 ≥44 且整组可见；⋯ 弹层顶 ≥ ⋯ 底＋4 且不压参数行', gbad.slice(0, 8).join(' | '));
      }
      /* v70.1 验收修①：⋯ 弹层挂到参数行下沿后不越过底栏——弹层底 ≤ .nf-ft2 顶、顶不压 ⋯ 钮与参数行；弹层里每个开关只滚弹层自己（不滚中栏 / 面板体）就能滚到并命中，
         末一个开关真实鼠标点中（状态翻转）。5 个视口 × 吉他谱 › 弹唱 / 合唱谱＋钢琴 / 简谱 › 歌曲 × 两种字体。修前红：1024×700 / 1280×720 / 1024×768 吉他谱弹层（≈464px）压到底栏 */
      const VPM = [[1024, 700], [1280, 720], [1024, 768], [1280, 800], [1440, 900]];
      const MCASE = [['吉他谱 › 弹唱', 'jita', false], ['合唱谱＋钢琴', 'hechang', true], ['简谱 › 歌曲', 'jianpu', false]];
      for (const font of fonts) {
        const mbad = [], mgot = [];
        await par(VPM, async ([w, h]) => {
          const o = await open(b, URL0, { tag: 'F1m', w, h, font });
          for (const [nm, pz, acc] of MCASE) {
            const tag = w + '×' + h + ' ' + nm;
            await o.pg.evaluate(() => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} __panel(); }); await W(220);
            await o.pg.click('.nf-modal [data-pz="' + pz + '"]'); await W(80);
            if (acc) { await o.pg.click('.nf-modal #nf-params [data-act="var"][data-k="tacc"][data-v="with"]'); await W(80); }
            await o.pg.click('.nf-modal #nf-more'); await W(150);
            const r = await o.pg.evaluate(() => {
              const q = s => document.querySelector('.nf-modal ' + s), mb = q('#nf-moreb');
              if (!mb) return { err: '弹层没开' };
              const R = e => e.getBoundingClientRect(), a = R(mb), f = R(q('.nf-ft2')), m = R(q('#nf-more')), p = R(q('#nf-params'));
              const sc = [q('.nf-mid2'), q('.nf-body2')].map(x => x.scrollTop);
              const ctl = [...mb.querySelectorAll('button,select,input')], miss = [];
              const nm = c => c.id || (c.dataset.k ? c.dataset.k + '=' + c.dataset.v : c.dataset.row) || c.tagName;
              for (const c of ctl) {
                const cr = R(c), br = R(mb);
                if (cr.top < br.top + 1) mb.scrollTop -= br.top - cr.top + 6; else if (cr.bottom > br.bottom - 1) mb.scrollTop += cr.bottom - br.bottom + 6;
                if (!__ok(c)) miss.push(nm(c));
              }
              const sc2 = [q('.nf-mid2'), q('.nf-body2')].map(x => x.scrollTop);
              const last = ctl[ctl.length - 1], lr = R(last);
              return { top: Math.round(a.top), bot: Math.round(a.bottom), ft: Math.round(f.top), mo: Math.round(m.bottom), pb: Math.round(p.bottom), n: ctl.length, miss, moved: J(sc) !== J(sc2),
                sh: mb.scrollHeight, ch: mb.clientHeight, last: last && last.dataset.row ? last.dataset.row : '', x: lr.left + lr.width / 2, y: lr.top + lr.height / 2 };
            });
            if (r.err) { mbad.push(tag + ' ' + r.err); continue; }
            let clk = '';
            if (r.last) {   /* 真实鼠标点在末项中心：捕获阶段记下这一下落到哪个开关（不看状态——有的组合点了只出提示） */
              await o.pg.evaluate(() => { window.__clk = null; document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('button,select,input'); window.__clk = t ? (t.dataset.row || t.id || t.tagName) : String(e.target.className || e.target.tagName); }, { capture: true, once: true }); });
              await o.pg.mouse.click(r.x, r.y); await W(150);
              const got = await o.pg.evaluate(() => window.__clk);
              if (got !== r.last) clk = '末项 ' + r.last + ' 没点中（点到 ' + got + '）';
            }
            const e = [];
            if (r.bot > r.ft + 0.5) e.push('弹层底 ' + r.bot + ' > 底栏顶 ' + r.ft);
            if (r.top < r.mo + 4 || r.top < r.pb) e.push('弹层顶 ' + r.top + ' 压到 ⋯（底 ' + r.mo + '）/ 参数行（底 ' + r.pb + '）');
            if (r.miss.length) e.push('只滚弹层够不着 ' + r.miss.join(' '));
            if (r.moved) e.push('中栏 / 面板体被滚动');
            if (clk) e.push(clk);
            if (e.length) mbad.push(tag + ' ' + e.join('；') + ' ' + J({ sh: r.sh, ch: r.ch, n: r.n }));
            mgot.push(tag + ' ' + r.top + '–' + r.bot + '/' + r.ft + (r.sh > r.ch + 1 ? ' 滚' : ''));
            await o.pg.keyboard.press('Escape'); await W(60);
          }
          await o.ctx.close();
        });
        T('F1', !mbad.length, '⋯ 弹层不越过底栏（' + (font ? 'DejaVu Sans' : '默认字体') + '，1024×700 / 1280×720 / 1024×768 / 1280×800 / 1440×900 × 吉他谱 › 弹唱 / 合唱谱＋钢琴 / 简谱 › 歌曲）：弹层底 ≤ 底栏顶、顶不压 ⋯ 与参数行；每个开关只滚弹层就能命中、末项真实点中', mbad.slice(0, 8).join(' | '));
        NOTE('F1 ⋯ 弹层（' + (font ? 'DejaVu' : '默认') + '）：' + mgot.join('，'));
      }
    });

    /* ===== F2 验收② 36 行真实点击 ↔ 等价深链 ===== */
    if (want('F2')) await guard('F2', async () => {
      const bad = [], where = [], LANES = 3;
      await par([...Array(LANES).keys()], async lane => {
      const { ctx, pg } = await open(b, URL0, { tag: 'F2' });
      for (const g of NFP.GOLD.filter((x, i) => i % LANES === lane)) {
        await pg.evaluate(() => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} __panel(); }); await W(200);
        const miss = [], pz = g.form.split('.')[0];
        const ck = async s => { if (!(await pg.evaluate(s => __ok(s), s))) miss.push(s); await pg.click(s); await W(60); };
        await ck('.nf-modal [data-pz="' + pz + '"]'); await ck('.nf-modal [data-form="' + g.form + '"]');
        let at = '';
        for (const [k, v] of Object.entries((g.set && g.set.v) || {})) {
          if (k === 'instKey') { if (!(await pg.evaluate(() => __ok('#nf-inst')))) miss.push('#nf-inst'); await pg.selectOption('#nf-inst', v); await W(60); at = '乐器下拉'; continue; }
          const ps = '#nf-params [data-act="var"][data-k="' + k + '"][data-v="' + v + '"]';
          if (await pg.evaluate(s => !!document.querySelector(s), ps)) { await ck(ps); at = '参数行'; }
          else { await ck('#nf-more'); await ck('#nf-moreb [data-act="var"][data-k="' + k + '"][data-v="' + v + '"]'); at = '⋯'; if (await pg.isVisible('#nf-moreb')) await ck('#nf-more'); }
        }
        if (g.set && g.set.mel) { await ck('#nf-pvmel [data-act="mel"][data-v="' + g.set.mel + '"]'); at = '预览左上'; }
        if (g.set) where.push(g.id + '@' + at);
        const pk = await pg.evaluate(() => ({ k: NWP.stackOfState(NWP.state), kind: document.getElementById('nf-kind').textContent, go: document.getElementById('nf-gokind').textContent, pick: NWP.state.pick }));
        const d0 = await pg.evaluate(() => docs.length);
        await pg.click('.nf-modal #nw-create'); await W(200);
        const A = await pg.evaluate(() => ({ json: JSON.stringify(song), I: __songInfo(song), docs: docs.length, tip: (document.querySelector('.dtab.on') || {}).title || '' }));
        const B = await pg.evaluate(link => { const L = NWP.linkParse('?' + link), st = NWP.fresh({ clean: true, scene: L.scene, link: L }); realCreate(NWP.planOf(st), '', null);
          const r = { json: JSON.stringify(song), bad: (st.link || {}).bad || [] }; return r; }, g.link);
        await pg.evaluate(() => { while (docs.length > 3) closeDocAt(curDocI); });
        const I = A.I, okWhere = !g.set || (g.how.indexOf(at) === 0 || (at === '乐器下拉' && /^乐器下拉/.test(g.how)));
        const ok = !miss.length && okWhere && A.docs === d0 + 1 && A.json === B.json && !B.bad.length && pk.k === g.pk && pk.kind === g.name && pk.go === g.name && I.name === g.name && I.kind === g.name
          && A.tip.indexOf(g.name) >= 0 && I.k === g.bk && I.pz === g.pz && J(I.also) === J(g.also.slice().sort()) && I.intent === g.intent && pk.pick === 'fm:' + g.form;
        if (!ok) bad.push(g.id + ' ' + J({ miss, at, how: g.how, pk, I, same: A.json === B.json, lbad: B.bad, docs: [d0, A.docs] }));
      }
      await ctx.close();
      });
      T('F2', NFP.GOLD.length === 36 && !bad.length, '36 行（24 形态 ＋ 变体 a–l）真实点击（谱种行 → 形态 chip → 参数行 / ⋯ / 乐器下拉 / 预览左上，先断言可见再点）建成的 song 与同页「等价深链 → fresh → realCreate」JSON 逐字节相同；面板谱名＝创建钮读屏名＝docTypeLabel＝页签；谱行 / 主谱种 › 二级 / 也在 / intent＝金表',
        bad.slice(0, 3).join(' | ') || where.join(' '));
    });

    /* ===== F4 验收④ 挪动的入口 ===== */
    if (want('F4')) await guard('F4', async () => {
      const { ctx, pg } = await open(b, URL0, { tag: 'F4' });
      await pg.evaluate(NFP.PAGE_INIT);
      const res = [];
      for (const sc of ['gtr', 'vocal', 'solo', 'inst', 'chord']) {
        await pg.evaluate(() => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} __panel({ scene: 'pacc' }); }); await W(200);
        const absent = await pg.evaluate(sc => !document.querySelector('.nf-modal [data-scene="' + sc + '"]'), sc);
        let r = null, err = '';
        try { r = await NFP.nfPick(pg, sc); } catch (e) { err = e.message; }
        await W(80);
        const pick = await pg.evaluate(() => NWP.state.pick), home = await NFP.nfHome(pg, sc), sel = await NFP.nfSel(pg), scene = await pg.evaluate(() => NWP.state.scene);
        /* 页内同步版（PAGE_INIT 的 __nfPick） */
        const inPage = await pg.evaluate(sc => { __panel({ scene: 'teach' }); const ok = __nfPick(sc); return { ok, sel: __nfSel(), home: __nfHome(sc), via: (window.__nfPicked || {}).via || '', err: (window.__nfPicked || {}).err || '' }; }, sc);
        res.push({ sc, absent, via: r && r.via, err, pick, home, sel, scene, inPage });
      }
      await ctx.close();
      const bad = res.filter(x => !(x.absent && x.via === 'form' && !x.err && x.pick === x.home && x.sel === x.home && x.scene === x.sc && x.inPage.ok && x.inPage.via === 'form' && x.inPage.sel === x.inPage.home && x.inPage.home === x.home));
      T('F4', !bad.length, '5 个不再是卡的用途（gtr / vocal / solo / inst / chord）：新形态 .nf-modal [data-scene] 不存在；nfPick / 页内 __nfPick 先断言谱种行与 chip 可见再点，落点＝fmHome（吉他谱 › 弹唱 · 简谱 › 歌曲 · 吉他谱 › 指弹 · 钢琴谱 › 独奏 · 功能谱 › 和弦格）', J(bad.length ? bad : res.map(x => x.sc + '→' + x.pick)));
      /* nfPick 在旧外壳 / ?next=0 照点卡 */
      const sh = [];
      await par(['next=0', 'shell=classic'], async q => {
        const o = await open(b, withQ(URL0, q), { tag: 'F4 ' + q });
        await o.pg.evaluate(() => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} __panel(); }); await W(250);
        await o.pg.evaluate(NFP.PAGE_INIT);
        const r = await NFP.nfPick(o.pg, 'vocal').catch(e => ({ err: e.message })); await W(80);
        const x = await o.pg.evaluate(() => ({ scene: NWP.state.scene, inPage: (__panel(), __nfPick('chord')), via2: (window.__nfPicked || {}).via, scene2: NWP.state.scene }));
        sh.push(Object.assign({ q, via: r.via, err: r.err }, x)); await o.ctx.close();
      });
      T('F4', sh.every(x => x.via === 'card' && x.scene === 'vocal' && x.inPage && x.via2 === 'card' && x.scene2 === 'chord'), 'nfPick / __nfPick 在 ?next=0 与 ?shell=classic 卡可见就点卡（与迁移前逐字同行为）', J(sh));
    });

    /* ===== F5 验收⑤ 字数 ===== */
    if (want('F5')) await guard('F5', async () => {
      const RB = NFP.rollbackUrl(URL0), lc = {};
      await par([['cur', URL0], ['rb', RB]], async ([tag, u]) => {
        const o = await open(b, u, { tag: 'F5' });
        lc[tag] = await o.pg.evaluate(async () => { const w = ms => new Promise(r => setTimeout(r, ms)); try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} __panel(); await w(250);
          const n = document.querySelector('.nf-modal .nf-left').innerText.replace(/\s/g, '').length;
          let titles = 0; for (const p of (NWP.P2B ? PQ_KIND.PZ : [])) { document.querySelector('.nf-modal [data-pz="' + p.id + '"]').click(); await w(30);
            titles += document.querySelectorAll('.nf-modal .nf-pz[title], .nf-modal .nf-pz [title], .nf-modal .nf-pzg[title], .nf-modal #nf-forms[title], .nf-modal #nf-forms [title], #nf-g-cy[title], #nf-g-pz[title], .nf-modal .nf-pwrap[title]').length; }
          return { n, titles }; });
        await o.ctx.close();
      });
      T('F5', lc.cur.n <= 59 && lc.cur.n < lc.rb.n && lc.cur.titles === 0, '左栏可见字 ' + lc.cur.n + ' ≤59 且 < 回滚副本 ' + lc.rb.n + '；新元素（谱种行 / chip 行）无 title', J(lc));
      const ta = {};
      await par([['cur', URL0], ['rb', RB]].flatMap(([tag, u]) => ['newpanel', 'newpanel-pacc'].map(id => [tag, u, id])), async ([tag, u, id]) => { ta[tag + ':' + id] = M.screen(await TA.runState(b, TA.STATES.find(s => s.id === id), { base: u })); });
      const c1 = ta['cur:newpanel'], c2 = ta['cur:newpanel-pacc'], r1 = ta['rb:newpanel'], r2 = ta['rb:newpanel-pacc'];
      T('F5', c1.total <= 97 && c2.total <= 104 && c1.desc === 0 && c2.desc === 0 && c1.hoverChars <= r1.hoverChars && c2.hoverChars <= r2.hoverChars,
        'textaudit：newpanel 总字 ' + c1.total + ' ≤97（回滚 ' + r1.total + '）、newpanel-pacc ' + c2.total + ' ≤104（回滚 ' + r2.total + '）、说明字 0、悬停字 ' + c1.hoverChars + ' / ' + c2.hoverChars + ' ≤ 回滚 ' + r1.hoverChars + ' / ' + r2.hoverChars,
        J({ c1: [c1.total, c1.desc, c1.hoverChars], c2: [c2.total, c2.desc, c2.hoverChars], r1: [r1.total, r1.hoverChars], r2: [r2.total, r2.hoverChars] }));
    });

    /* ===== F6 验收⑥ DOM ===== */
    if (want('F6')) await guard('F6', async () => {
      const { ctx, pg } = await open(b, URL0, { tag: 'F6' });
      const r = await pg.evaluate(async () => {
        const w = ms => new Promise(res => setTimeout(res, ms)), bad = [];
        try { localStorage.removeItem('musetab-nw-last'); } catch (_) {}
        __panel(); await w(250);
        const targets = [...document.querySelectorAll('.nf-modal .nf-left [role=option]')].map(e => e.dataset.pz ? '[data-pz="' + e.dataset.pz + '"]' : '[data-scene="' + e.dataset.scene + '"]');
        const chk = tag => {
          const ids = [...document.querySelectorAll('.nf-modal [id]')].map(e => e.id), dup = ids.filter((x, i) => ids.indexOf(x) !== i);
          if (dup.length) bad.push(tag + ' 重复 id ' + J(dup));
          if (document.querySelectorAll('.nf-modal [data-form][data-scene], .nf-modal [data-pz][data-scene]').length) bad.push(tag + ' 谱种行 / chip 带了 data-scene');
          const lb = document.querySelector('.nf-modal .nf-left [role=listbox]');
          const s1 = lb.querySelectorAll('[aria-selected="true"]').length, t0 = lb.querySelectorAll('[tabindex="0"]').length;
          if (s1 !== 1 || t0 !== 1) bad.push(tag + ' listbox 选中 ' + s1 + ' / tabindex=0 ' + t0);
          const fm = document.querySelector('.nf-modal #nf-forms');
          if (fm) { const c = fm.querySelectorAll('[aria-checked="true"]').length, z = fm.querySelectorAll('[tabindex="0"]').length; if (c !== 1 || z !== 1) bad.push(tag + ' chip 组 选中 ' + c + ' / tabindex=0 ' + z);
            if (fm.getAttribute('role') !== 'radiogroup' || !fm.getAttribute('aria-label')) bad.push(tag + ' chip 组 role / 读屏名'); }
        };
        for (const t of targets) { document.querySelector('.nf-modal ' + t).click(); await w(30); chk(t);
          const fm = document.querySelector('.nf-modal #nf-forms'); if (fm) for (const c of [...fm.querySelectorAll('[data-form]')].map(x => x.dataset.form)) { document.querySelector('.nf-modal [data-form="' + c + '"]').click(); await w(20); chk(c); } }
        /* 对比度（谱种名 选中 / 未选中、chip 选中 / 未选中；浅色 / 深色） */
        const P = s => { const m = /rgba?\(([^)]+)\)/.exec(s); if (m) { const a = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [a[0], a[1], a[2], a.length > 3 ? a[3] : 1]; }
          const c = /color\(srgb ([^)]+)\)/.exec(s); if (c) { const a = c[1].split(/[ \/]+/).filter(Boolean).map(Number); return [a[0] * 255, a[1] * 255, a[2] * 255, a.length > 3 ? a[3] : 1]; } return [0, 0, 0, 0]; };
        const mix = (f, bk) => [0, 1, 2].map(i => f[i] * f[3] + bk[i] * (1 - f[3]));
        const bgOf = e => { const ch = []; for (let x = e; x; x = x.parentElement) ch.unshift(x); let bk = [255, 255, 255]; ch.forEach(x => { const c = P(getComputedStyle(x).backgroundColor); if (c[3] > 0) bk = mix(c, bk); }); return bk; };
        const L = c => { const v = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
        const cr = e => { const bk = bgOf(e), fg = mix(P(getComputedStyle(e).color), bk), a = L(fg), z = L(bk); return +((Math.max(a, z) + 0.05) / (Math.min(a, z) + 0.05)).toFixed(2); };
        const con = {}, nt = document.head.appendChild(document.createElement('style'));
        nt.textContent = '*,*::before,*::after{transition:none!important}';   /* 量的是终态颜色：关掉全局 .15s 渐变（并行跑时帧被挤掉，渐变会从读值那一刻才开始） */
        for (const th of ['light', 'dark']) {
          document.documentElement.setAttribute('data-theme', th); await w(120);
          document.querySelector('.nf-modal [data-pz="jianpu"]').click(); await w(60);
          con[th] = { pzOn: cr(document.querySelector('.nf-modal [data-pz="jianpu"] b')), pzOff: cr(document.querySelector('.nf-modal [data-pz="wuxian"] b')),
            fmOn: cr(document.querySelector('.nf-modal [data-form="jianpu.gequ"]')), fmOff: cr(document.querySelector('.nf-modal [data-form="jianpu.daiban"]')) };
        }
        document.documentElement.removeAttribute('data-theme'); nt.remove();
        try { closeModal(); } catch (_) {}
        return { bad, con, n: targets.length };
      });
      await ctx.close();
      T('F6', r.n === 13 && !r.bad.length, '13 个左栏目标 × 各自全部 chip：.nf-modal [id] 无重复；[data-form] / [data-pz] 不带 data-scene；listbox 恰一个选中 ＋ 一个 tabindex=0；chip 组（radiogroup，读屏名＝谱种名）恰一个选中 ＋ 一个 tabindex=0', r.bad.slice(0, 6).join(' | '));
      const lo = Object.entries(r.con).flatMap(([th, o]) => Object.entries(o).filter(([, v]) => v < 4.5).map(([k, v]) => th + '.' + k + '=' + v));
      T('F6', !lo.length, '对比度 ≥4.5（谱种名 选中 / 未选中、chip 选中 / 未选中；浅色 / 深色）：' + J(r.con), lo.join(' '));
    });

    /* ===== F7 键盘 ===== */
    if (want('F7')) await guard('F7', async () => {
      const { ctx, pg } = await open(b, URL0, { tag: 'F7' });
      const S = () => pg.evaluate(() => { const st = NWP.state, m = document.querySelector('.nf-modal'), a = document.activeElement;
        const foc = a && a.dataset ? (a.dataset.pz ? 'pz:' + a.dataset.pz : a.dataset.form ? 'fm:' + a.dataset.form : a.dataset.scene ? 'sc:' + a.dataset.scene : a.id || a.tagName) : '';
        return st && m ? { o: 1, pick: st.pick, plan: J(NWP.planOf(st)), foc, docs: docs.length } : { o: 0, docs: docs.length, name: docTypeLabel(song), intent: song.intent || null, foc }; });
      const K = async (k, ms) => { await pg.keyboard.press(k); await W(ms || 70); return S(); };
      const focOf = p => p.slice(0, 3) === 'sc:' ? p : 'pz:' + p.slice(3).split('.')[0];
      const res = {}, ok = {};
      await pg.evaluate(() => { try { hideStartPad(); } catch (_) {} try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} document.body.focus(); });
      await pg.mouse.click(5, 450);
      res.a0 = await K('Alt+KeyN', 450); ok.a0 = res.a0.o && res.a0.pick === 'fm:jita.tanchang' && res.a0.foc === 'pz:jita';
      const seq = [await K('Home')]; for (let i = 0; i < 12; i++) seq.push(await K('ArrowDown'));
      const EXP = 'sc:pacc sc:kids sc:sight sc:teach fm:jianpu.gequ fm:wuxian.gequ fm:gangqin.duzou fm:jita.tanchang fm:uku.tanchang fm:hechang.jianpu fm:gongneng.jishu sc:blank sc:custom'.split(' ');
      res.seq = seq.map(x => x.pick + '@' + x.foc); ok.seq = J(seq.map(x => x.pick)) === J(EXP) && seq.every(x => x.foc === focOf(x.pick));
      const e1 = await K('End'), u1 = await K('ArrowUp'); res.eu = [e1.pick, u1.pick]; ok.eu = e1.pick === 'sc:custom' && u1.pick === 'sc:blank' && u1.foc === 'sc:blank';
      await K('Home'); for (let i = 0; i < 4; i++) await K('ArrowDown');
      const l0 = await S(), l1 = await K('ArrowRight'), l2 = await K('ArrowLeft');
      res.lr = [l0.pick, l1.pick, l2.pick, l1.foc, l2.foc]; ok.lr = l0.pick === 'fm:jianpu.gequ' && [l1, l2].every(x => x.pick === l0.pick && x.plan === l0.plan && x.foc === l0.foc);
      const t1 = await K('Tab'); res.tab = t1.foc; ok.tab = t1.foc === 'fm:jianpu.gequ';
      const cs = []; for (const k of ['ArrowRight', 'ArrowLeft', 'ArrowLeft', 'ArrowDown', 'ArrowUp']) cs.push(await K(k));
      res.chip = cs.map(x => x.pick + '@' + x.foc);
      ok.chip = J(cs.map(x => x.pick)) === J(['fm:jianpu.daiban', 'fm:jianpu.gequ', 'fm:jianpu.duizhao', 'fm:jianpu.gequ', 'fm:jianpu.duizhao']) && cs.every(x => x.foc === 'fm:' + x.pick.slice(3));
      await K('ArrowLeft'); const d0 = (await S()).docs; const en = await K('Enter', 500);
      res.enter = en; ok.enter = !en.o && en.docs === d0 + 1 && en.name === '简谱歌谱' && en.intent === 'sight';
      /* Space：选中不建 */
      await pg.mouse.click(5, 450); await K('Alt+KeyN', 450); await pg.focus('.nf-modal [data-form="jianpu.gequ"]');
      const sp = await K('Space', 200); res.space = sp; ok.space = sp.o && sp.pick === 'fm:jianpu.gequ' && sp.docs === d0 + 1;
      /* 谱种行 Enter＝建 */
      await K('Escape', 200); await pg.mouse.click(5, 450); await K('Alt+KeyN', 450); await K('Home'); for (let i = 0; i < 6; i++) await K('ArrowDown');
      const g0 = await S(), ge = await K('Enter', 500); res.pzEnter = [g0.pick, ge]; ok.pzEnter = g0.pick === 'fm:gangqin.duzou' && !ge.o && ge.docs === g0.docs + 1 && ge.name === '钢琴独奏谱';
      /* 双击谱种行 / chip＝建一份 */
      await pg.mouse.click(5, 450); await K('Alt+KeyN', 450); const n1 = (await S()).docs;
      await pg.dblclick('.nf-modal [data-pz="uku"]'); await W(600); const db1 = await S();
      await pg.mouse.click(5, 450); await K('Alt+KeyN', 450);
      await pg.dblclick('.nf-modal [data-form="uku.zhitan"]'); await W(600); const db2 = await S();
      res.dbl = [db1, db2]; ok.dbl = !db1.o && db1.docs === n1 + 1 && db1.name === '尤克里里弹唱谱' && !db2.o && db2.docs === n1 + 2 && db2.name === '尤克里里独奏谱';
      /* 1–5 离开形态 → 自选卡、焦点跟随；Ctrl+Z 撤销连 pick */
      await pg.mouse.click(5, 450); await K('Alt+KeyN', 450); await K('Home'); for (let i = 0; i < 4; i++) await K('ArrowDown');
      const k3 = await K('3', 120); res.k3 = k3; ok.k3 = k3.pick === 'sc:custom' && k3.foc === 'sc:custom';
      await pg.click('.nf-modal [data-pz="jianpu"]'); await pg.click('.nf-modal [data-form="jianpu.daiban"]'); await W(80);
      await pg.focus('.nf-modal [role=option][aria-selected="true"]');
      const z0 = await K('3', 150), hasUndo = await pg.evaluate(() => !!document.querySelector('.nf-modal #nf-undo')), z1 = await K('Control+KeyZ', 150);
      res.undo = [z0.pick, hasUndo, z1.pick]; ok.undo = z0.pick === 'sc:custom' && hasUndo && z1.pick === 'fm:jianpu.daiban';
      /* Esc 关面板，焦点还给打开它的控件；Alt+Shift+N 照旧 */
      await K('Escape', 200);
      const hasAdd = await pg.isVisible('#dt-add');
      if (hasAdd) { await pg.click('#dt-add'); await W(400); }
      const es = await K('Escape', 250); res.esc = es; ok.esc = hasAdd && !es.o && es.foc === 'dt-add';
      await pg.mouse.click(5, 450); const n2 = (await S()).docs; const as = await K('Alt+Shift+KeyN', 600);
      res.asn = as; ok.asn = !as.o && as.docs === n2 + 1 && as.name === '尤克里里独奏谱';
      await ctx.close();
      const NM = { a0: 'Alt+N：首访落「吉他谱 › 弹唱」、焦点在吉他谱行', seq: 'Home 起 ↓ 12 次 st.pick＝常用 4 → 谱种 7（默认形态）→ 空白谱 → 自选，焦点跟随', eu: 'End＝自选、↑＝空白谱',
        lr: 'listbox 上 ←→ 不改 pick / 计划 / 焦点', tab: 'Tab 从左栏到形态 chip（选中那枚）', chip: 'chip 上 → ← ← ↓ ↑ 组内循环换形态、焦点跟随', enter: 'chip 上 Enter＝创建（简谱 › 视唱 → 简谱歌谱、intent sight）',
        space: 'chip 上 Space＝选中不建', pzEnter: '谱种行 Enter＝创建（钢琴谱 → 钢琴独奏谱）', dbl: '双击谱种行 / chip＝建一份（尤克里里弹唱 / 指弹）', k3: '键 3 离开形态 → 「自选」卡选中、焦点跟随',
        undo: 'Ctrl+Z 撤销连左栏选中项（简谱 › 带伴奏 → 3 → 自选 → 撤销回 简谱 › 带伴奏，不是归属卡）', esc: 'Esc 关面板、焦点还给 ＋ 钮', asn: 'Alt+Shift+N 按上次直接建（照旧）' };
      Object.keys(NM).forEach(k => T('F7', !!ok[k], NM[k], J(res[k])));
    });

    /* ===== F8 深链与反推 ===== */
    if (want('F8')) await guard('F8', async () => {
      const { ctx, pg } = await open(b, URL0, { tag: 'F8' });
      await pg.evaluate(NFP.PAGE_INIT);
      const r = await pg.evaluate(async DEEP => {
        const w = ms => new Promise(res => setTimeout(res, ms)), out = [];
        for (const [q, exp] of DEEP) {
          try { closeModal(); } catch (_) {} try { localStorage.removeItem('musetab-nw-last'); } catch (_) {}
          nwLinkBoot('?new=' + q); await w(120);
          const st = NWP.state, L = NWP.linkParse('?new=' + q), s2 = NWP.fresh({ clean: true, scene: L.scene, link: L });
          const lk = NWP.linkOf(st), L3 = NWP.linkParse(lk.replace(/^[^?]*/, '')), s3 = NWP.fresh({ clean: true, scene: L3.scene, link: L3 });
          const F = NWP.PZ_FORMS.find(f => 'fm:' + f.id === st.pick), hidBad = [];
          if (F) { F.hid.forEach(k => { if (k === 'mel') { if (!document.querySelector('#nf-pvmel.nf-pvro')) hidBad.push('mel'); } else if (document.querySelector('#nf-params [data-act="var"][data-k="' + k + '"]')) hidBad.push(k); });
            const ids = [...document.querySelectorAll('#nf-forms [data-form]')].map(x => x.dataset.form); if (J(ids) !== J(NWP.PZ_FORMS.filter(f => f.pz === F.pz).map(f => f.id))) hidBad.push('chips'); }
          else if (document.querySelector('#nf-forms')) hidBad.push('常用卡下有 chip 行');
          out.push({ q, exp, pick: st.pick, sel: __nfSel(), bad: (st.link || {}).bad || [], lbad: !!document.getElementById('nf-linkbad'), plan: J(NWP.planOf(st)) === J(NWP.planOf(s2)), rt: J(NWP.planOf(s3)) === J(NWP.planOf(st)), hidBad });
        }
        try { closeModal(); } catch (_) {}
        return out;
      }, DEEP);
      await ctx.close();
      const bad = r.filter(x => !(x.pick === x.exp && x.sel === x.exp && !x.bad.length && !x.lbad && x.plan && x.rt && !x.hidBad.length));
      T('F8', r.length === 24 && !bad.length, '§8.1 深链 24 条：落点 st.pick＝表、左栏选中 / chip 选中与之一致、无「没认出」、计划＝fresh({clean, scene, link})、linkOf ∘ linkApply 往返、隐藏控件与落点形态一致', J(bad.slice(0, 4)));
      /* 启动台 5 卡 */
      const sp = [];
      await par([['gtr', 'fm:jita.tanchang'], ['pacc', 'sc:pacc'], ['teach', 'sc:teach'], ['sight', 'sc:sight'], ['kids', 'sc:kids']], async ([k, exp]) => {
        const o = await open(b, URL0, { tag: 'F8 sp' });
        await o.pg.evaluate(NFP.PAGE_INIT);
        const s = '#spd-nx [data-sp="sc:' + k + '"]', vis = await o.pg.isVisible(s).catch(() => false);
        if (vis) { await o.pg.click(s); await W(350); }
        sp.push(Object.assign({ k, exp, vis }, await o.pg.evaluate(() => ({ pick: NWP.state ? NWP.state.pick : null, sel: NWP.state ? __nfSel() : null }))));
        await o.ctx.close();
      });
      T('F8', sp.every(x => x.vis && x.pick === x.exp && x.sel === x.exp), '启动台 5 卡落点：吉他弹唱 → 吉他谱 › 弹唱，钢琴即兴伴奏 / 教学对照 / 视唱练耳 / 儿歌弹唱 → 常用卡', J(sp));
    });

    /* ===== F9 上次 ===== */
    if (want('F9')) await guard('F9', async () => {
      const { ctx, pg } = await open(b, URL0, { tag: 'F9' });
      await pg.evaluate(NFP.PAGE_INIT);
      const r = await pg.evaluate(async () => {
        const w = ms => new Promise(res => setTimeout(res, ms));
        const k0 = __keys();
        /* 与 NWP 的 lastSave 同形状：{scene, stack, rows, mel, v, t} */
        const mk = link => { const L = NWP.linkParse('?' + link), st = NWP.fresh({ clean: true, scene: L.scene, link: L }), P = NWP.planOf(st);
          return JSON.stringify({ scene: P.scene, stack: P.stack, rows: NWB.STACKS[P.stack].rows.slice(), mel: st.mel, v: Object.assign({}, st.v, { title: '', capo: 0 }), t: Date.now() }); };
        const CASES = [
          ['小提琴', mk('new=inst&instKey=violin'), 'fm:wuxian.qiyue', [['jianpu', 'fm:jianpu.gequ'], ['wuxian', 'fm:wuxian.qiyue'], ['gangqin', 'fm:gangqin.duzou']]],
          ['四部简谱合唱', mk('new=vocal&parts=4&mel=J'), 'fm:hechang.jianpu', [['jianpu', 'fm:jianpu.gequ'], ['wuxian', 'fm:wuxian.gequ'], ['hechang', 'fm:hechang.jianpu']]],
          ['纯伴奏', mk('new=pacc&acc=pure'), 'fm:gangqin.chunban', [['jianpu', 'fm:jianpu.gequ'], ['gangqin', 'fm:gangqin.chunban']]],
          ['和弦格', mk('new=chord&ftype=C'), 'fm:gongneng.hexian', [['jianpu', 'fm:jianpu.gequ'], ['gongneng', 'fm:gongneng.hexian']]],
          ['钢琴即兴伴奏', mk('new=pacc&acc=mel&mel=J'), 'sc:pacc', PQ_KIND.PZ.map(p => [p.id, 'fm:' + NWP.PZ_DEF[p.id]])],
          ['大提琴（只记形态）', mk('new=inst&instKey=cello'), 'fm:wuxian.qiyue', [['jianpu', 'fm:jianpu.gequ'], ['wuxian', 'fm:wuxian.qiyue']]],
          ['坏值', '{"scene":"constructor","v":{}}', 'fm:jita.tanchang', [['wuxian', 'fm:wuxian.gequ'], ['jita', 'fm:jita.tanchang']]],
        ];
        const out = [];
        for (const [n, ls, home, clicks] of CASES) {
          try { closeModal(); } catch (_) {} localStorage.setItem('musetab-nw-last', ls); __panel(); await w(200);
          const o = { n, home, pick0: NWP.state.pick, sel0: __nfSel(), seq: [] };
          for (const [pz, exp] of clicks) { const e = document.querySelector('.nf-modal [data-pz="' + pz + '"]'); if (!__ok(e)) o.seq.push(pz + ' 不可见'); e.click(); await w(40); o.seq.push([pz, exp, NWP.state.pick, __nfSel()]); }
          if (n === '大提琴（只记形态）') o.inst = NWP.state.v.instKey;
          out.push(o);
        }
        /* 建谱后 musetab-nw-last 的形状不变（只有 scene stack rows mel v t；v 的键＝面板状态 v 的键） */
        try { closeModal(); } catch (_) {} localStorage.removeItem('musetab-nw-last'); __panel(); await w(150);
        document.querySelector('.nf-modal [data-pz="hechang"]').click(); await w(40); document.querySelector('.nf-modal [data-form="hechang.wuxian"]').click(); await w(40);
        const vk = Object.keys(NWP.state.v).sort(); document.getElementById('nw-create').click(); await w(300);
        let nl = null; try { nl = JSON.parse(localStorage.getItem('musetab-nw-last')); } catch (_) {}
        const shape = { keys: nl ? Object.keys(nl) : null, vk: nl && nl.v ? Object.keys(nl.v).sort() : null, vk0: vk };
        if (docs.length > 3) closeDocAt(curDocI);
        return { out, shape, k0, k9: __keys() };
      });
      await ctx.close();
      const bad = r.out.filter(o => !(o.pick0 === o.home && o.sel0 === o.home && o.seq.every(x => Array.isArray(x) && x[1] === x[2] && x[2] === x[3]) && (o.inst == null || o.inst === 'violin')));
      T('F9', !bad.length, '预置上次（小提琴 / 四部简谱合唱 / 纯伴奏 / 和弦格 / 钢琴即兴伴奏 / 大提琴 / 坏值）：重开落归属；点别的谱种＝默认形态、点回上次的谱种＝上次形态（只对那一个谱种）；上次是常用卡＝各谱种都默认；只记形态不记参数（大提琴 → 器乐回小提琴）', J(bad.slice(0, 3)));
      const extra = r.k9.filter(k => !r.k0.includes(k) && !/^musetab-(nw-last|docs|doc|song|tabs|win|autosave|last|cur)/.test(k));
      T('F9', J(r.shape.keys) === J(['scene', 'stack', 'rows', 'mel', 'v', 't']) && J(r.shape.vk) === J(r.shape.vk0) && !r.shape.vk.includes('pick') && !extra.length,
        '建谱后 musetab-nw-last 键集合＝scene stack rows mel v t、v 的键＝面板状态 v 的键（不多、无 pick）；musetab-* 键集合差为空', J({ shape: r.shape, extra }));
    });

    /* ===== F10 隐藏控件 ===== */
    if (want('F10')) await guard('F10', async () => {
      /* 规格 §5 / §3.5 口径（独立一份）：参数行 chip、MAINV2 有无、⋯ 其余变体、预览左上（RO:读数 / RADIO）、乐器下拉族 */
      const HC = 'parts:2,parts:3,parts:4,tacc:no,tacc:with';
      const E = { 'jianpu.gequ': ['', 0, 'tacc', 'RO:简谱'], 'jianpu.daiban': ['', 0, '', 'RO:简谱'], 'jianpu.hechang': [HC, 1, '', 'RO:简谱'], 'jianpu.qiyue': ['', 0, '', 'RO:简谱', 'jianpu'],
        'jianpu.shichang': ['', 0, '', 'RO:简谱'], 'jianpu.duizhao': ['', 0, 'tacc', 'RO:对照'], 'wuxian.gequ': ['', 0, 'tacc', 'RO:五线'], 'wuxian.daiban': ['', 0, '', 'RO:五线'],
        'wuxian.hechang': [HC, 1, '', 'RO:五线'], 'wuxian.qiyue': ['', 0, 'tacc', 'RO:五线', 'wuxian'], 'wuxian.shichang': ['', 0, 'clef', 'RO:五线'], 'wuxian.duizhao': ['', 0, 'tacc', 'RO:对照'],
        'gangqin.duzou': ['', 0, '', 'RO:大谱表', 'gangqin'], 'gangqin.tanchang': ['', 0, '', 'RADIO'], 'gangqin.erge': ['', 0, '', 'RADIO'], 'gangqin.chunban': ['', 0, '', 'RO:大谱表'],
        'jita.tanchang': ['', 0, 'pen', 'RO:简谱'], 'jita.zhitan': ['', 0, '', 'RO:五线'], 'uku.tanchang': ['', 0, 'pen', 'RO:简谱'], 'uku.zhitan': ['', 0, '', 'RO:五线'],
        'hechang.jianpu': [HC, 1, '', 'RO:简谱'], 'hechang.wuxian': [HC, 1, '', 'RO:五线'], 'gongneng.jishu': ['', 0, '', 'RADIO'], 'gongneng.hexian': ['', 0, '', 'RO:和弦'] };
      const { ctx, pg } = await open(b, URL0, { tag: 'F10' });
      const r = await pg.evaluate(async () => {
        const w = ms => new Promise(res => setTimeout(res, ms)), out = {};
        try { localStorage.removeItem('musetab-nw-last'); } catch (_) {}
        __panel(); await w(200);
        /* 乐器下拉口径从 NW_INSTS 现算（§3.5）：组内顺序同 NW_INSTS、贝斯排组末、空组不出 */
        const IN = NW_INSTS.filter(x => x.fam !== 'tab'), G = f => IN.filter(f).sort((a, c) => (a.k === 'bass') - (c.k === 'bass')).map(x => x.k);
        const MY = x => x.fam === 'jianpu' && /^民乐/.test(x.grp || ''), KT = x => x.fam === 'jianpu' && /^课堂乐器/.test(x.grp || ''), ST = x => x.fam === 'staff';
        const EXPI = { jianpu: [['民乐', G(MY)], ['课堂乐器', G(KT)], ['西洋管弦', G(ST)]], wuxian: [['西洋管弦', G(ST)], ['民乐', G(MY)], ['课堂乐器', G(KT)], ['其他', G(x => x.fam === 'other')]], gangqin: [['键盘', G(x => x.fam === 'kbd')]] };
        for (const f of NWP.PZ_FORMS) {
          document.querySelector('.nf-modal [data-pz="' + f.pz + '"]').click(); await w(30); document.querySelector('.nf-modal [data-form="' + f.id + '"]').click(); await w(30);
          const params = [...document.querySelectorAll('#nf-params [data-act="var"]')].map(x => x.dataset.k + ':' + x.dataset.v).join(','), acc2 = document.querySelectorAll('#nf-params .nf-pcacc').length;
          const pv = document.querySelector('#nf-pvmel'), pvs = pv.classList.contains('nf-pvro') ? 'RO:' + pv.textContent : (pv.getAttribute('role') === 'radiogroup' && pv.querySelectorAll('[data-act="mel"]').length === 3 ? 'RADIO' : '?');
          const sel = document.querySelector('#nf-inst'), inst = sel ? [...sel.querySelectorAll('optgroup')].map(g => [g.label, [...g.querySelectorAll('option')].map(o => o.value)]) : null;
          document.querySelector('#nf-more').click(); await w(30);
          const more = [...new Set([...document.querySelectorAll('#nf-moreb [data-act="var"]')].map(x => x.dataset.k))].join(',');
          document.querySelector('#nf-more').click(); await w(20);
          out[f.id] = { params, acc2, more, pv: pvs, inst, instV: sel ? sel.value : null, expI: f.ik ? EXPI[f.ik] : null, vk: f.v.instKey || null, pick: NWP.state.pick };
        }
        try { closeModal(); } catch (_) {}
        return out;
      });
      await ctx.close();
      const bad = [];
      for (const [id, e] of Object.entries(E)) {
        const x = r[id]; if (!x) { bad.push(id + ' 没测到'); continue; }
        const iOk = e[4] ? (J(x.inst) === J(x.expI) && x.instV === x.vk) : x.inst === null;
        if (x.pick !== 'fm:' + id || x.params !== e[0] || !!x.acc2 !== !!e[1] || x.more !== e[2] || x.pv !== e[3] || !iOk) bad.push(id + ' ' + J({ got: [x.params, x.acc2, x.more, x.pv, x.inst && x.inst.map(g => g[0] + ':' + g[1].length), x.instV], exp: e }));
      }
      const cnt = k => (r[k] && r[k].inst || []).reduce((a, g) => a + g[1].length, 0);
      T('F10', !bad.length && cnt('jianpu.qiyue') === 21 && cnt('wuxian.qiyue') === 22 && cnt('gangqin.duzou') === 4,
        '24 个形态逐个：参数行 chip 集（合唱形态 声部 二 · 三 · 四部 ＋ 钢琴，其余无）、⋯ 其余变体、预览左上只读读数 / 单选、#nf-inst 选项序列（简谱 › 器乐 21 · 五线谱 › 器乐 22 · 钢琴谱 › 独奏 4，组名不带记谱法）＝规格 §5 / §3.5', bad.slice(0, 4).join(' | '));
    });

    /* ===== F11 旋律用 ===== */
    if (want('F11')) await guard('F11', async () => {
      const { ctx, pg } = await open(b, URL0, { tag: 'F11' });
      const S = () => pg.evaluate(() => ({ mel: NWP.state.mel, k: NWP.stackOfState(NWP.state), kind: document.getElementById('nf-kind').textContent, pick: NWP.state.pick }));
      const fresh = async () => { await pg.evaluate(() => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} __panel(); }); await W(200); };
      const C = async s => { await pg.click('.nf-modal ' + s); await W(70); return S(); };
      const res = {}, ok = {};
      await fresh(); await C('[data-pz="jianpu"]'); await C('[data-form="jianpu.qiyue"]');
      await pg.selectOption('#nf-inst', 'violin'); await W(70); const a1 = await S(); await pg.selectOption('#nf-inst', 'cello'); await W(70); const a2 = await S();
      res.jq = [a1, a2]; ok.jq = a1.mel === 'J' && a1.k === 'J' && a1.kind === '小提琴谱（简谱）' && a2.k === 'J' && a2.kind === '大提琴谱（简谱）' && a2.pick === 'fm:jianpu.qiyue';
      await fresh(); await C('[data-pz="wuxian"]'); await C('[data-form="wuxian.qiyue"]'); await pg.selectOption('#nf-inst', 'erhu'); await W(70); const b1 = await S();
      res.wq = b1; ok.wq = b1.mel === 'S' && b1.k === 'S' && b1.kind === '二胡谱（五线谱）' && b1.pick === 'fm:wuxian.qiyue';
      await fresh(); const c1 = await C('[data-scene="sight"]'), c2 = await C('#nf-pvmel [data-act="mel"][data-v="J"]');
      res.sight = [c1, c2]; ok.sight = c1.k === 'S' && c1.kind === '五线谱旋律' && c1.pick === 'sc:sight' && c2.k === 'J' && c2.kind === '简谱歌谱' && c2.pick === 'sc:sight';
      await fresh(); await C('[data-pz="jianpu"]'); const d1 = await C('[data-form="jianpu.shichang"]'), d2 = await C('[data-scene="sight"]');
      res.js = [d1, d2]; ok.js = d1.k === 'J' && d2.pick === 'sc:sight' && d2.k === 'J';
      await fresh(); await C('[data-pz="gangqin"]'); const e1 = await C('[data-form="gangqin.tanchang"]'), e2 = await C('#nf-pvmel [data-act="mel"][data-v="S"]'), e3 = await C('[data-form="gangqin.chunban"]'), e4 = await C('[data-form="gangqin.tanchang"]');
      res.gq = [e1, e2, e3, e4]; ok.gq = e1.k === 'JG' && e2.k === 'SG' && e3.k === 'CG' && e4.k === 'SG' && e4.mel === 'S' && e4.pick === 'fm:gangqin.tanchang';
      await pg.evaluate(() => { try { closeModal(); } catch (_) {} }); await ctx.close();
      const NM = { jq: '简谱 › 器乐 选小提琴 / 大提琴＝简谱（小提琴谱（简谱）/ 大提琴谱（简谱））', wq: '五线谱 › 器乐 选二胡＝五线谱（二胡谱（五线谱））', sight: '常用视唱练耳＝五线谱默认；点「简谱」→ 简谱视唱（左栏仍是常用卡：点的目标对得上计划就不跳，§6.1）',
        js: '简谱 › 视唱 → 常用视唱练耳＝仍是简谱（亲手选过）', gq: '钢琴谱 › 弹唱（旋律改五线）↔ 纯伴奏 → 回弹唱 旋律仍五线' };
      Object.keys(NM).forEach(k => T('F11', !!ok[k], NM[k], J(res[k])));
    });

    /* ===== F12 intent 与埋点 ===== */
    if (want('F12')) await guard('F12', async () => {
      const RE = /^[a-z]+:[A-Z]+:(panel|link|link-bad):[a-z]+:[01]$/;
      const stub = pg => pg.evaluate(() => { window.__evs = []; window.pyqEvent = (n, m) => { window.__evs.push([n, String(m == null ? '' : m)]); }; });
      const last = pg => pg.evaluate(() => { const e = window.__evs.filter(x => x[0] === 'create_stack').pop(); return { meta: e ? e[1] : null, intent: song.intent || null, docs: docs.length, name: docTypeLabel(song) }; });
      const { ctx, pg } = await open(b, URL0, { tag: 'F12' }); await stub(pg);
      const res = [];
      const fresh = async () => { await pg.evaluate(() => { try { closeModal(); } catch (_) {} try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} if (docs.length > 3) closeDocAt(curDocI); __panel(); }); await W(200); };
      await fresh(); await pg.click('.nf-modal [data-pz="wuxian"]'); await pg.click('.nf-modal #nw-create'); await W(250); res.push(['谱种行＋创建', 'vocal', 'panel', await last(pg)]);
      await fresh(); await pg.click('.nf-modal [data-pz="jianpu"]'); await pg.keyboard.press('Tab'); for (let i = 0; i < 3; i++) { await pg.keyboard.press('ArrowRight'); await W(60); }
      await pg.keyboard.press('Enter'); await W(300); res.push(['chip（键盘到 简谱 › 器乐）＋Enter', 'inst', 'panel', await last(pg)]);
      await fresh(); await pg.focus('.nf-modal [role=option][aria-selected="true"]'); await pg.keyboard.press('End'); await W(60); await pg.keyboard.press('ArrowUp'); await W(60); await pg.keyboard.press('ArrowUp'); await W(60);
      await pg.keyboard.press('Enter'); await W(300); res.push(['谱种行（↑↓ 到功能谱）＋Enter', 'chord', 'panel', await last(pg)]);
      await fresh(); await pg.dblclick('.nf-modal [data-pz="uku"]'); await W(400); res.push(['双击谱种行', 'gtr', 'panel', await last(pg)]);
      await fresh(); await pg.click('.nf-modal [data-pz="jita"]'); await pg.dblclick('.nf-modal [data-form="jita.zhitan"]'); await W(400); res.push(['双击 chip', 'solo', 'panel', await last(pg)]);
      await pg.evaluate(() => { try { closeModal(); } catch (_) {} nwLinkBoot('?new=inst&instKey=violin'); }); await W(250); await pg.keyboard.press('Enter'); await W(300); res.push(['深链＋回车', 'inst', 'link', await last(pg)]);
      await ctx.close();
      const o = await open(b, URL0, { tag: 'F12 sp' }); await stub(o.pg);
      const spv = await o.pg.isVisible('#spd-nx [data-sp="sc:gtr"]').catch(() => false);
      if (spv) { await o.pg.click('#spd-nx [data-sp="sc:gtr"]'); await W(300); await o.pg.click('.nf-modal #nw-create'); await W(300); }
      res.push(['启动台 sc:gtr → 创建', 'gtr', 'panel', spv ? await last(o.pg) : { meta: '（启动台卡不可见）' }]);
      await o.ctx.close();
      res.forEach(([tag, it, via, x]) => T('F12', x.intent === it && RE.test(x.meta || '') && (x.meta || '').split(':')[0] === it && (x.meta || '').split(':')[2] === via, tag + ' → intent＝' + it + '、create_stack ' + (x.meta || '无') + ' 过格式（入口 ' + via + '）', J(x)));
    });

    /* ===== F13 离屏不变量 ===== */
    if (want('F13')) await guard('F13', async () => {
      const { ctx, pg } = await open(b, URL0, { tag: 'F13' });
      const r = await pg.evaluate(async () => {
        const w = ms => new Promise(res => setTimeout(res, ms));
        try { hideStartPad(); } catch (_) {}
        try { mutate(() => { song.title = (song.title || '') + '·'; }); mutate(() => { song.title = song.title + '·'; }); undo(); } catch (_) {}
        try { persistNow(); } catch (_) {} await w(400);
        const snap = () => { const P = document.getElementById('paper'), R = P.getBoundingClientRect();
          return { ls: [localStorage.getItem('musetab-song-v1'), localStorage.getItem('musetab-docs-v1')].join('\u0001').length + ':' + [localStorage.getItem('musetab-song-v1'), localStorage.getItem('musetab-docs-v1')].join('\u0001'),
            undo: undoStack.length, redo: redoStack.length, sel: J(sel), noteSel: J(noteSel), paper: [P.getAttribute('style'), P.className, P.clientWidth, P.clientHeight, Math.round(R.width), Math.round(R.height)].join('|'),
            docs: docs.length, cur: curDocI, score: document.getElementById('score').innerHTML, title: song.title }; };
        const a = snap();
        __panel(); await w(250);
        const CY = ['pacc', 'kids', 'sight', 'teach']; let n = 0, waitMax = 0;
        for (let i = 0; i < 50; i++) {
          let t;
          if (i % 3 === 0) t = document.querySelector('.nf-modal [data-pz="' + PQ_KIND.PZ[i % 7].id + '"]');
          else if (i % 3 === 1) { const cs = [...document.querySelectorAll('.nf-modal #nf-forms [data-form]')]; t = cs.length ? cs[i % cs.length] : document.querySelector('.nf-modal [data-pz="jianpu"]'); }
          else t = document.querySelector('.nf-modal [data-scene="' + CY[i % 4] + '"]');
          t.click(); n++;
          const t0 = performance.now(); await w(20);
          while (document.querySelector('#nf-pv[aria-busy="true"]') && performance.now() - t0 < 1500) await w(20);
          waitMax = Math.max(waitMax, performance.now() - t0);
        }
        return { a, n, waitMax: Math.round(waitMax) };
      });
      await pg.focus('.nf-modal [role=option][aria-selected="true"]'); await pg.keyboard.press('Escape'); await W(300);
      const z = await pg.evaluate(() => { const P = document.getElementById('paper'), R = P.getBoundingClientRect();
        return { modal: !!document.querySelector('.nf-modal'), ls: [localStorage.getItem('musetab-song-v1'), localStorage.getItem('musetab-docs-v1')].join('\u0001').length + ':' + [localStorage.getItem('musetab-song-v1'), localStorage.getItem('musetab-docs-v1')].join('\u0001'),
          undo: undoStack.length, redo: redoStack.length, sel: J(sel), noteSel: J(noteSel), paper: [P.getAttribute('style'), P.className, P.clientWidth, P.clientHeight, Math.round(R.width), Math.round(R.height)].join('|'),
          docs: docs.length, cur: curDocI, score: document.getElementById('score').innerHTML, title: song.title }; });
      await ctx.close();
      const diff = Object.keys(r.a).filter(k => r.a[k] !== z[k]);
      T('F13', r.n === 50 && !z.modal && !diff.length && r.a.redo >= 1, '开面板交替点谱种行 / chip / 常用卡 50 次（每次等预览刻完，最长 ' + r.waitMax + ' ms）后 Esc：本机曲谱 / 窗口存储字节、撤销 ' + r.a.undo + ' / 重做 ' + r.a.redo + ' 栈、选区、#paper 尺寸、#score、窗口数不变',
        J({ diff, a: diff.map(k => String(r.a[k]).slice(0, 120)), z: diff.map(k => String(z[k]).slice(0, 120)) }));
    });

    T('E', !pageErrs.length, '页面脚本错误 0', pageErrs.slice(0, 5).join(' | '));
  } finally { await b.close(); }
  console.log('（单跑 ' + Math.round((Date.now() - t0) / 1000) + ' 秒；被测 ' + URL0 + '）');
  console.log('PASS ' + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})();
