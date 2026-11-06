'use strict';
/* v70.1 P2b B 组「入口」：快速新建 ▾ · 命令面板「新建：<谱种> <形态>」· 新外壳谱友圈卡片指法调（规格 docs/spec-2026-11-v701.md §9 / §10 / §11.1 / §14.2；
   共享 helper tests/lib/nfpick.js §15.1；零差异基线 fixtures/v701_base.json＝1122ea3 §14.3，由 tv_v701new --write-base 生成，本套件只读）。
   Q1  快速新建结构（新形态，预置固定「上次」nfpick.QM_LS）：首项 outerHTML 与回滚副本（＝v70.0）逐字节同（图标 / 读屏名 / 调拍小标签 / 键帽）；两组 role=group，组名 .nf-qh「常用」「谱种」
       （role=presentation、非 menuitem、无 data-q / tabindex / title，aria-labelledby 指向它）；data-q 序列＝last pacc kids sight teach pz:jianpu … pz:gongneng panel；
       小标＝考编 师范 艺考 课堂；谱种项图标＝pqIcon(PZ_IC)、读屏名＝「谱种 · 默认形态」；项名 ≤6 字、无副标题、无 title；↑↓ / Home / End 只在 menuitem 间走（跳过组名）、
       roving tabindex 恰一个 0 且＝焦点；点组名不建谱不关菜单；文件 ▾ 行尾 ▾ 读屏名「快速新建：按上次 / 常用 / 谱种」、title 不变
   Q2  快速新建行为：7 个谱种项各真实点一次 → 新窗口（docs+1）；song 与「等价深链 → NWP.fresh → realCreate」逐字节同、与面板「点该谱种 → 创建」逐字节同（接缝 ②，依赖 A 组面板）；
       intent＝默认形态用途、谱名 / 谱行＝nfpick.GOLD；create_stack＝<用途>:<谱行>:menu:<用途>:1；musetab-nw-last 随之更新、键集合不变；
       textaudit quickmenu 总字 ≤160、可点控件组 ≤74、悬停字 ≤373、说明字 0（同屏同名组另记 ℹ️）
   Q3  零差异：?next=0 / ?shell=classic 快速新建 HTML 与 fixture n0.qm / classic.qm 逐字节；回滚副本 nx 快速新建与 fixture nx.qm、文件 ▾ 行尾 ▾ 与 nx.file 逐字节；
       当前页两项与 fixture 不同（防开关失效）
   C1  命令表：新形态开机后首次 FLOW.cmd.list() 含 19 条 nf:*、全在表尾、id / 标题 / 图标与规格 §10 表逐字、sp:1、关键词无 2 字母整词与禁用词、既有条目＝fixture nx.cmdTxt 逐条；
       ?next=0 与回滚副本 0 条、命令表 id＋标题序列与 fixture n0.cmd / nx.cmd 逐字节
   C2  命令执行：19 条逐条 FLOW.cmd.run(id) → 面板打开、st.pick＝该形态 / 常用卡、回车建成的 song 与等价计划（深链 / 用途）逐字节同、与在面板里点同一目标逐字节同（接缝 ①，依赖 A 组面板）；
       ui_cmd＝cmd:go:<id> 过 FLOW.track 格式、最近用过记 id；启动台上也能执行（sp:1）
   C3  搜索：「简谱合唱」首条 nf:hechang:jianpu、「简谱 带伴奏」「带伴奏」nf:pacc、「尤克里里」nf:uku:tanchang、「钢琴独奏」nf:gangqin:duzou；回归 24 个既有查询首条与回滚副本相同；
       真实路径 Ctrl+/ 输入「简谱合唱」→ 首行 → Enter → 面板落合唱谱 › 简谱合唱
   K1  谱友圈指法调：新外壳谱友圈（离线本地示例 ＋ 同一卡片数据造的接口卡片）吉他 / 尤克里里卡片写「X调指法」（有夹位加「 · 夹N」），与对同一卡片数据跑官网 PYQ_PZ.fkeyText 逐字同；
       简谱 / 五线谱 / 钢琴卡片照旧（1=C / C 调 / a 小调）；?shell=classic / ?next=0 谱友圈卡片不写指法调、调名照旧（同 tv_libpz Z13 口径）
   E   页面脚本错误 0；musetab-* 键集合差为空（与回滚副本做同类动作比）
   修前红：被测页指向基线副本时 Q1 / Q2 / C1–C3（新条目）/ K1 红，Q3 与 C1 的零差异段绿。
   跑法：Q1–Q3 与 C1–C3 ＋ K1 两路并行（各段结果先进缓冲，最后按段序打印），本机单跑约 90 秒；E 在两路之后。
   env：MUSETAB_URL 被测页（file://；没有回滚开关的基线副本也能跑：回滚副本＝它自己）· ONLY=Q1,C2 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), vm = require('vm');
const NFP = require('./lib/nfpick');
const TA = require('./lib/textaudit/states.js'), M = require('./lib/textaudit/metrics.js');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = NFP.withQ;
const FIX = path.join(__dirname, 'fixtures', 'v701_base.json');
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const J = x => JSON.stringify(x), W = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, total = 0; const pageErrs = [];
const T = (id, ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅ ' : '❌ ') + id + ' ' + name + (!ok && d != null ? '\n     ' + String(d).slice(0, 1800) : '')); };
const NOTE = s => console.log('ℹ️ ' + s);
const guard = async (T, id, fn) => { try { await fn(); } catch (e) { T(id, false, '异常', String(e.stack || e).split('\n').slice(0, 3).join(' | ')); } };
/* 各段的 T / NOTE 写进自己的缓冲（两路并行跑，最后按段序打印） */
const mkT = buf => (id, ok, name, d) => { total++; if (ok) pass++; buf.push((ok ? '✅ ' : '❌ ') + id + ' ' + name + (!ok && d != null ? '\n     ' + String(d).slice(0, 1800) : '')); };

/* 规格 §9.1 / §10 的独立一份 */
const PZ_ORDER = ['jianpu', 'wuxian', 'gangqin', 'jita', 'uku', 'hechang', 'gongneng'];
const PZ_DEF = { jianpu: 'jianpu.gequ', wuxian: 'wuxian.gequ', gangqin: 'gangqin.duzou', jita: 'jita.tanchang', uku: 'uku.tanchang', hechang: 'hechang.jianpu', gongneng: 'gongneng.jishu' };
const PZ_ARIA = { jianpu: '简谱 · 歌曲', wuxian: '五线谱 · 歌曲', gangqin: '钢琴谱 · 独奏', jita: '吉他谱 · 弹唱', uku: '尤克里里 · 弹唱', hechang: '合唱谱 · 简谱合唱', gongneng: '功能谱 · 级数谱' };
const PZ_IC = { jianpu: 'nota-jianpu', wuxian: 'nota-staff', gangqin: 'type-piano', jita: 'type-guitar', uku: 'type-uku', hechang: 'type-vocal', gongneng: 'type-func' };
const QSEQ = ['last', 'pacc', 'kids', 'sight', 'teach'].concat(PZ_ORDER.map(p => 'pz:' + p), ['panel']);
/* [id, 标题, 关键词, ic, opt] */
const CMDS = [
  ['nf:jianpu:gequ', '新建：简谱 歌曲', 'xjjpgq jpgq 简谱歌曲 简谱歌谱 新建简谱', 'nota-jianpu', { form: 'jianpu.gequ' }],
  ['nf:jianpu:qiyue', '新建：简谱 器乐', 'jpqiyue 简谱器乐 民乐简谱 二胡简谱 葫芦丝 萨克斯简谱', 'nota-jianpu', { form: 'jianpu.qiyue' }],
  ['nf:jianpu:shichang', '新建：简谱 视唱', 'jpshichang 简谱视唱', 'nota-jianpu', { form: 'jianpu.shichang' }],
  ['nf:wuxian:gequ', '新建：五线谱 歌曲', 'xjwxgq wxpgq 五线谱歌曲 五线谱歌谱 新建五线谱', 'nota-staff', { form: 'wuxian.gequ' }],
  ['nf:wuxian:qiyue', '新建：五线谱 器乐', 'wxqiyue 五线谱器乐 器乐独奏 小提琴谱', 'nota-staff', { form: 'wuxian.qiyue' }],
  ['nf:gangqin:duzou', '新建：钢琴谱 独奏', 'gqpdz gqdz 钢琴独奏 钢琴谱', 'type-piano', { form: 'gangqin.duzou' }],
  ['nf:gangqin:chunban', '新建：钢琴谱 纯伴奏', 'gqcbz 纯伴奏 钢琴伴奏谱', 'type-piano', { form: 'gangqin.chunban' }],
  ['nf:jita:tanchang', '新建：吉他谱 弹唱', 'jtptc jttc 吉他弹唱 吉他谱', 'type-guitar', { form: 'jita.tanchang' }],
  ['nf:jita:zhitan', '新建：吉他谱 指弹', 'jtpzt jtzt 吉他指弹 吉他独奏', 'type-guitar', { form: 'jita.zhitan' }],
  ['nf:uku:tanchang', '新建：尤克里里 弹唱', 'ykll ykltc 尤克里里弹唱 乌克丽丽 尤克里里 ukulele', 'type-uku', { form: 'uku.tanchang' }],
  ['nf:uku:zhitan', '新建：尤克里里 指弹', 'yklzt 尤克里里指弹 尤克里里独奏', 'type-uku', { form: 'uku.zhitan' }],
  ['nf:hechang:jianpu', '新建：合唱谱 简谱合唱', 'hcpjp jphc 简谱合唱 合唱谱 简谱四部合唱', 'type-vocal', { form: 'hechang.jianpu' }],
  ['nf:hechang:wuxian', '新建：合唱谱 五线合唱', 'hcpwx wxhc 五线合唱 五线谱合唱', 'type-vocal', { form: 'hechang.wuxian' }],
  ['nf:gongneng:jishu', '新建：功能谱 级数谱', 'gnpjsp jsp 级数谱 功能谱 和弦简谱', 'type-func', { form: 'gongneng.jishu' }],
  ['nf:gongneng:hexian', '新建：功能谱 和弦格', 'gnphxg hxg 和弦格 小节和弦', 'type-func', { form: 'gongneng.hexian' }],
  ['nf:pacc', '新建：钢琴即兴伴奏', 'gqjxbz jxbz 钢琴即兴伴奏 即兴伴奏 考编 简谱带伴奏 五线谱带伴奏 钢琴谱弹唱', 'type-jg', { scene: 'pacc' }],
  ['nf:kids', '新建：儿歌弹唱', 'egtc 儿歌弹唱 师范 钢琴谱儿歌弹唱', 'type-kids', { scene: 'kids' }],
  ['nf:sight', '新建：视唱练耳谱例', 'scle 视唱练耳 艺考 五线谱视唱', 'type-sight', { scene: 'sight' }],
  ['nf:teach', '新建：教学对照谱', 'jxdzp 教学对照谱 课堂 对照谱 简谱对照谱 五线谱对照谱', 'type-teach', { scene: 'teach' }],
];
const BAN = ['导入', 'midi', '编辑', '模式', '播放', '练习', '四步', '和弦图', '写法', '联排', '配伴奏', '织体'];
const QREG = ['sc', 'bf', 'hy', 'sd', 'zz', 'qy', 'qb', '打印', '横排', '导入MIDI', '编辑模式', '和弦图', '和弦写法', '联排低音谱号', '联排高音谱号', '音色库', '悬浮条', '起步', '智能', '织体', '配伴奏', '新建', '1=D', '3/4'];
const QNEW = [['简谱合唱', 'nf:hechang:jianpu'], ['简谱 带伴奏', 'nf:pacc'], ['带伴奏', 'nf:pacc'], ['尤克里里', 'nf:uku:tanchang'], ['钢琴独奏', 'nf:gangqin:duzou']];
const goldOf = id => NFP.GOLD.find(g => g.id === id);

function INIT() {
  window.__vis = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false; } return true; };
  window.__keys = () => Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort();
  window.__panel = o => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} try { closeModal(); } catch (_) {} showNewWizard(o || {}); };
  window.__ev = []; window.__ui = [];
  /* 埋点桩：create_stack 从 realCreate 走全局 pyqEvent；ui_cmd 从 FLOW.track 走（离线 API_ON 假，桩在 FLOW.track 上） */
  window.__stub = () => { window.pyqEvent = (n, m) => { window.__ev.push([n, String(m)]); }; if (!window.__track0 && window.FLOW && FLOW.track) { const t0 = FLOW.track; window.__track0 = t0; FLOW.track = (id) => { window.__ui.push(t0.norm(id) || '!' + id); return true; }; FLOW.track.norm = t0.norm; } };
  window.__trim = () => { try { while (docs.length > 3) closeDocAt(0); } catch (_) {} };
  window.__info = () => ({ docs: docs.length, k: NWB.stackOf(song), name: docTypeLabel(song), intent: song.intent == null ? null : song.intent, j: JSON.stringify(song) });
  /* 等价计划建谱：深链（link 串）或用途（scene） */
  window.__eq = (o) => { let st; if (o.link) { const L = NWP.linkParse('?' + o.link); st = NWP.fresh({ clean: true, scene: L.scene, link: L }); } else st = NWP.fresh({ clean: true, scene: o.scene });
    const d0 = docs.length; realCreate(NWP.planOf(st), '', null); return Object.assign(__info(), { d: docs.length - d0 }); };
}
/* CI 字体模拟（同 tv_v701new FONT_INIT）：界面字体换 DejaVu Sans（中文落到系统 CJK 字体） */
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
  await pg.evaluate(o => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; __stub(); if (!o.pad) { try { hideStartPad(); } catch (_) {} } }, { pad: !!o.pad });
  return { ctx, pg };
}
/* 快速新建菜单的结构快照（预置固定「上次」后打开） */
async function qmInfo(pg, real) {
  await pg.evaluate(ls => { try { localStorage.setItem('musetab-nw-last', ls); } catch (_) {} try { NWP.quickMenuClose(); } catch (_) {} try { closePop(); } catch (_) {} }, NFP.QM_LS);
  if (real) { await pg.click('#flw-file'); await pg.waitForSelector('#popmenu [data-fa="r1:newdd"]', { state: 'visible' }); await pg.click('#popmenu [data-fa="r1:newdd"]'); }
  else await pg.evaluate(() => NWP.quickMenu(document.getElementById('flw-file')));
  await pg.waitForSelector('#nf-qm', { state: 'visible' }); await W(150);
  return pg.evaluate(() => {
    const m = document.getElementById('nf-qm'), it = [...m.querySelectorAll('[role=menuitem]')];
    const ic1 = k => { const d = document.createElement('div'); d.innerHTML = pqIcon(k, 20); return d.firstElementChild ? d.firstElementChild.outerHTML : ''; };
    return {
      html: m.innerHTML, first: it[0] ? it[0].outerHTML : '', role: m.getAttribute('role'),
      items: it.map(e => ({ q: e.dataset.q, aria: e.getAttribute('aria-label') || '', title: e.hasAttribute('title'), b: (e.querySelector('b') || {}).textContent || '', sub: !!e.querySelector('small, .nf-qv, .nf-qk'),
        svg: (e.querySelector('svg') || {}).outerHTML || '', tag: (e.querySelector('.nf-tag') || {}).textContent || '', grp: (e.parentElement.getAttribute('role') || '') + ':' + (e.parentElement.getAttribute('aria-labelledby') || '') })),
      heads: [...m.querySelectorAll('.nf-qh')].map(h => ({ t: h.textContent, role: h.getAttribute('role'), id: h.id, q: h.dataset.q == null ? null : h.dataset.q, ti: h.getAttribute('tabindex'), title: h.hasAttribute('title'),
        mi: h.matches('[role=menuitem], button'), grp: h.parentElement.getAttribute('role'), lab: h.parentElement.getAttribute('aria-labelledby'), kids: [...h.parentElement.querySelectorAll('[role=menuitem]')].map(e => e.dataset.q) })),
      icons: Object.fromEntries(PQ_KIND.PZ.map(p => [p.id, ic1(NWP.PZ_IC[p.id])])), pzic: NWP.PZ_IC, focus: (document.activeElement && document.activeElement.dataset || {}).q || '',
      nTab0: it.filter(e => e.tabIndex === 0).length,
    };
  });
}

(async () => {
  const t0 = Date.now();
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let FX = {}; try { FX = JSON.parse(fs.readFileSync(FIX, 'utf8')); } catch (_) { FX = {}; }
  /* 回滚副本；被测页本身没有开关（修前红：指向基线副本 1122ea3）时它就是 v70.0，回滚副本＝它自己 */
  let RB = URL0; try { RB = NFP.rollbackUrl(URL0); } catch (e) { NOTE('被测页没有「' + NFP.NEEDLE + '」（基线副本？）：回滚副本＝被测页本身（' + String(e.message).slice(0, 80) + '）'); }
  const keysCur = new Set(), keysRb = new Set();
  try {
    const S = {};
    T('P', !!(FX.nx && FX.n0 && FX.classic && FX.qmLs === NFP.QM_LS), 'fixture ' + path.relative(__dirname, FIX) + ' 在（基线 ' + String(FX.commit || '').slice(0, 7) + '），qmLs＝nfpick.QM_LS');

    /* ===== Q1 快速新建结构 ===== */
    S.Q1 = async (T, NOTE) => {
      const { ctx, pg } = await open(b, URL0, { tag: 'Q1' });
      const cur = await qmInfo(pg, true);
      /* 键盘：↓ 走一圈 ＋ End / Home / ↑ */
      const ks = [];
      const rec = () => pg.evaluate(() => { const m = document.getElementById('nf-qm'), a = document.activeElement, it = [...m.querySelectorAll('[role=menuitem]')];
        return { q: (a && a.dataset && a.dataset.q) || (a && a.className) || '', t0: it.filter(e => e.tabIndex === 0).map(e => e.dataset.q).join(','), qh: !!(a && a.classList && a.classList.contains('nf-qh')) }; });
      ks.push(await rec());
      for (let i = 0; i < QSEQ.length; i++) { await pg.keyboard.press('ArrowDown'); ks.push(await rec()); }
      for (const k of ['End', 'Home', 'ArrowUp']) { await pg.keyboard.press(k); ks.push(await rec()); }
      /* 点组名：不建谱、菜单不关 */
      const d0 = await pg.evaluate(() => docs.length);
      await pg.click('#nf-qh-pz'); await W(200);
      const hd = await pg.evaluate(d0 => ({ open: !!document.getElementById('nf-qm'), d: docs.length - d0 }), d0);
      await pg.keyboard.press('Escape'); await W(150); await pg.evaluate(() => { try { NWP.quickMenuClose(); } catch (_) {} });
      /* 文件 ▾ 行尾 ▾ */
      await pg.click('#flw-file'); await pg.waitForSelector('#popmenu [data-fa="r1:newdd"]');
      const fl = await pg.evaluate(() => { const e = document.querySelector('#popmenu [data-fa="r1:newdd"]'); return { aria: e.getAttribute('aria-label'), title: e.getAttribute('title'), html: e.outerHTML }; });
      await pg.keyboard.press('Escape'); await ctx.close();
      const r = await open(b, RB, { tag: 'Q1 回滚' }); const rb = await qmInfo(r.pg, false);
      await r.pg.click('#flw-file'); await r.pg.waitForSelector('#popmenu [data-fa="r1:newdd"]');
      const flr = await r.pg.evaluate(() => { const e = document.querySelector('#popmenu [data-fa="r1:newdd"]'); return { aria: e.getAttribute('aria-label'), title: e.getAttribute('title') }; });
      await r.ctx.close();

      T('Q1', cur.first === rb.first && cur.items[0].q === 'last' && /按上次：钢琴即兴伴奏，1=D 3\/4 ♩=88/.test(cur.items[0].aria) && /Alt\+Shift\+N/.test(cur.first),
        '首项与 v70.0（回滚副本）outerHTML 逐字节同：上次用途图标、读屏名「按上次：钢琴即兴伴奏，1=D 3/4 ♩=88」、调拍小标签、键帽 Alt+Shift+N', J({ cur: cur.first.slice(0, 300), rb: rb.first.slice(0, 300) }));
      T('Q1', J(cur.items.map(x => x.q)) === J(QSEQ) && cur.role === 'menu', 'menuitem 的 data-q 序列＝' + QSEQ.join(' ') + '（「新建面板…」在最后）', J(cur.items.map(x => x.q)));
      const H = cur.heads;
      T('Q1', H.length === 2 && H[0].t === '常用' && H[1].t === '谱种' && H.every(h => h.role === 'presentation' && !h.mi && h.q == null && h.ti == null && !h.title && h.grp === 'group' && h.lab === h.id)
        && H[0].id === 'nf-qh-cy' && H[1].id === 'nf-qh-pz' && J(H[0].kids) === J(['pacc', 'kids', 'sight', 'teach']) && J(H[1].kids) === J(PZ_ORDER.map(p => 'pz:' + p)),
        '两组 role=group：组名 .nf-qh「常用」「谱种」（role=presentation、非 menuitem、无 data-q / tabindex / title；group 的 aria-labelledby＝组名 id）；常用组＝pacc kids sight teach、谱种组＝7 个谱种', J(H));
      const ci = cur.items.filter(x => /^(pacc|kids|sight|teach)$/.test(x.q));
      T('Q1', J(ci.map(x => x.tag)) === J(['考编', '师范', '艺考', '课堂']) && J(ci.map(x => x.b)) === J(['钢琴即兴伴奏', '儿歌弹唱', '视唱练耳谱例', '教学对照谱']) && ci.every(x => /^group:nf-qh-cy$/.test(x.grp)),
        '常用 4 项名字与小标＝钢琴即兴伴奏〔考编〕· 儿歌弹唱〔师范〕· 视唱练耳谱例〔艺考〕· 教学对照谱〔课堂〕（写法同 v70.0 用途项）', J(ci));
      const pi = cur.items.filter(x => /^pz:/.test(x.q)), pbad = pi.filter(x => { const p = x.q.slice(3); return x.aria !== PZ_ARIA[p] || x.svg !== cur.icons[p] || x.tag || x.sub || x.grp !== 'group:nf-qh-pz'; });
      T('Q1', pi.length === 7 && !pbad.length && J(cur.pzic) === J(PZ_IC) && J(pi.map(x => x.b)) === J(['简谱', '五线谱', '钢琴谱', '吉他谱', '尤克里里', '合唱谱', '功能谱']),
        '谱种 7 项：名＝PQ_KIND.PZ 名、图标＝pqIcon(PZ_IC)（PZ_IC＝规格 §3.2）、读屏名＝「谱种 · 默认形态」（简谱 · 歌曲 … 功能谱 · 级数谱）、无小标', J(pbad.length ? pbad : cur.pzic));
      const rest = cur.items.slice(1), long = rest.filter(x => [...x.b.replace(/…$/, '')].length > 6 || x.sub || x.title).concat(cur.items[0].title ? [cur.items[0]] : []);
      T('Q1', !long.length && !/title=/.test(cur.html), '项名 ≤6 字、无副标题、整份菜单无 title', J(long));
      const kOk = ks.length === QSEQ.length + 4 && ks.every(x => !x.qh && x.t0 === x.q) && J(ks.slice(0, QSEQ.length + 1).map(x => x.q)) === J(QSEQ.concat(['last'])) && J(ks.slice(-3).map(x => x.q)) === J(['panel', 'last', 'panel']);
      T('Q1', kOk && cur.focus === 'last' && cur.nTab0 === 1, '↓ 走一圈＝' + QSEQ.length + ' 项（跳过组名）回到首项；End＝新建面板…、Home＝首项、↑ 绕到末项；roving tabindex 恰一个 0 且＝焦点', J(ks.map(x => x.q + (x.t0 === x.q ? '' : '≠' + x.t0))));
      T('Q1', hd.open && hd.d === 0, '点组名「谱种」：不建谱（docs 不变）、菜单不关', J(hd));
      T('Q1', fl.aria === '快速新建：按上次 / 常用 / 谱种' && fl.title === '快速新建（Alt+Shift+N 按上次）' && flr.aria === '快速新建：按上次 / 按用途一点直接建' && flr.title === fl.title,
        '文件 ▾ 行尾 ▾ 读屏名「快速新建：按上次 / 常用 / 谱种」（回滚副本原文「按上次 / 按用途一点直接建」），title 不变', J({ fl, flr }));
    };

    /* ===== Q2 快速新建行为 ===== */
    S.Q2 = async (T, NOTE) => {
      const { ctx, pg } = await open(b, URL0, { tag: 'Q2' });
      const rows = [];
      for (const pz of PZ_ORDER) {
        const g = goldOf(PZ_DEF[pz]);
        await pg.evaluate(() => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} __ev.length = 0; __trim(); });
        if (pz === PZ_ORDER[0]) { await pg.click('#flw-file'); await pg.waitForSelector('#popmenu [data-fa="r1:newdd"]'); await pg.click('#popmenu [data-fa="r1:newdd"]'); }
        else await pg.evaluate(() => NWP.quickMenu(document.getElementById('flw-file')));
        await pg.waitForSelector('#nf-qm [data-q="pz:' + pz + '"]', { state: 'visible' });
        const d0 = await pg.evaluate(() => docs.length);
        await pg.click('#nf-qm [data-q="pz:' + pz + '"]'); await W(450);
        const q = await pg.evaluate(d0 => { let nl = null; try { nl = JSON.parse(localStorage.getItem('musetab-nw-last')); } catch (_) {}
          return Object.assign(__info(), { d: docs.length - d0, ev: __ev.filter(e => e[0] === 'create_stack').map(e => e[1]), menu: !!document.getElementById('nf-qm'), nl: nl ? { keys: Object.keys(nl), scene: nl.scene, stack: nl.stack, vkeys: Object.keys(nl.v || {}).sort() } : null }); }, d0);
        await pg.evaluate(() => __trim());
        const eq = await pg.evaluate(link => { const r = __eq({ link }); __trim(); return r; }, g.link);
        /* 面板「点该谱种 → 创建」（A 组面板；谱种行先断言可见再点） */
        await pg.evaluate(() => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} __panel({}); });
        await W(300);
        let pn = null;
        const ps = '.nf-modal [data-pz="' + pz + '"]';
        if (await pg.locator(ps).first().isVisible().catch(() => false)) {
          await pg.click(ps); await W(150);
          const pick = await pg.evaluate(() => NWP.state && NWP.state.pick);
          const dp = await pg.evaluate(() => docs.length);
          await pg.click('#nw-create'); await W(450);
          pn = await pg.evaluate(dp => Object.assign(__info(), { d: docs.length - dp }), dp); pn.pick = pick;
        } else { await pg.evaluate(() => { try { closeModal(); } catch (_) {} }); }
        await pg.evaluate(() => __trim());
        rows.push({ pz, g, q, eq, pn });
      }
      (await pg.evaluate(() => __keys())).forEach(k => keysCur.add(k));
      await ctx.close();
      const sc = pz => goldOf(PZ_DEF[pz]).intent;
      const b1 = rows.filter(r => !(r.q.d === 1 && !r.q.menu && r.q.k === r.g.bk && r.q.name === r.g.name && r.q.intent === r.g.intent && r.q.j === r.eq.j && r.eq.d === 1));
      T('Q2', !b1.length, '7 个谱种项各真实点一次：新窗口（docs+1）、菜单收起；谱行 / 谱名 / intent＝nfpick.GOLD 默认形态行；song 与「等价深链 → NWP.fresh → realCreate」逐字节相同',
        J(b1.map(r => ({ pz: r.pz, d: r.q.d, k: r.q.k, name: r.q.name, intent: r.q.intent, same: r.q.j === r.eq.j, gold: [r.g.bk, r.g.name, r.g.intent] }))));
      const b2 = rows.filter(r => !(r.pn && r.pn.d === 1 && r.pn.pick === 'fm:' + PZ_DEF[r.pz] && r.pn.j === r.q.j));
      T('Q2', !b2.length, '接缝 ②：song 与面板「点该谱种（默认形态 ●）→ 创建」逐字节相同（谱种行先断言可见再点；st.pick＝fm:<默认形态>）',
        J(b2.map(r => ({ pz: r.pz, pn: r.pn ? { d: r.pn.d, pick: r.pn.pick, k: r.pn.k, name: r.pn.name, same: r.pn.j === r.q.j } : '谱种行不可见' }))));
      const RE = /^[a-z]+:[A-Z]+:menu:[a-z]+:[01]$/;
      const b3 = rows.filter(r => !(r.q.ev.length === 1 && RE.test(r.q.ev[0]) && r.q.ev[0] === [sc(r.pz), r.g.pk, 'menu', sc(r.pz), 1].join(':')));
      T('Q2', !b3.length, 'create_stack＝<用途>:<面板谱行>:menu:<用途>:1（入口 menu、from＝用途、格式同 v70.0）', J(b3.map(r => ({ pz: r.pz, ev: r.q.ev }))));
      const b4 = rows.filter(r => !(r.q.nl && J(r.q.nl.keys) === J(['scene', 'stack', 'rows', 'mel', 'v', 't']) && r.q.nl.scene === sc(r.pz) && r.q.nl.stack === r.g.pk && !r.q.nl.vkeys.includes('pick')));
      T('Q2', !b4.length, 'musetab-nw-last 随之更新：键集合＝scene stack rows mel v t、scene＝默认形态用途、stack＝面板谱行（格式不变）', J(b4.map(r => ({ pz: r.pz, nl: r.q.nl }))));
      const ta = await TA.runState(b, TA.STATES.find(s => s.id === 'quickmenu'), { base: URL0 }), x = M.screen(ta);
      T('Q2', !ta.err && x.total <= 160 && x.clickGrp <= 74 && x.hoverChars <= 373 && x.desc === 0 && x.descLines === 0 && x.btnWithSub === 0 && x.dup === 0,
        'textaudit quickmenu：总字 ' + x.total + ' ≤160、可点控件组 ' + x.clickGrp + ' ≤74、悬停字 ' + x.hoverChars + ' ≤373、说明字 ' + x.desc + '＝0、带副标题 ' + x.btnWithSub + '＝0、屏内同名 ' + x.dup + '＝0', J({ err: ta.err, dups: x._dups }));
      /* 集成定口径（v70.1）：谱种项「简谱」× 悬浮条旋律用「简谱」这一对由 metrics exemptPz 窄放行（方案 §8.1 / 规格 §3.1 · §9.1 谱种名必须叫「简谱」），其余同名照旧计 */
      if ((x._dupsPz || []).length) NOTE('quickmenu 放行的同名对（v70.1 集成口径）：' + J(x._dupsPz));
      /* v70.1 验收修②：小屏几何——真实路径（文件 ▾ → 行尾 ▾）打开新形态菜单（两组 13 项），1366×657 / 1280×650 / 1024×700 / 1100×700 × 默认字体 / DejaVu Sans：
         菜单不出滚动条；末项「新建面板…」整块在菜单与视口内且中心命中自身；每个 menuitem 高 ≥44（不小于 v70.0）、整块在菜单内、名字不截断。修前红：菜单 660px 高，四个视口都要滚、末项被裁 */
      const QVP = [[1366, 657], [1280, 650], [1024, 700], [1100, 700]], gq = [], gn = [];
      await Promise.all([false, true].flatMap(font => QVP.map(async ([w, h]) => {
        const o = await open(b, URL0, { tag: 'Q2g', w, h, font });
        await o.pg.evaluate(() => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} });
        await o.pg.click('#flw-file'); await o.pg.waitForSelector('#popmenu [data-fa="r1:newdd"]', { state: 'visible' }); await o.pg.click('#popmenu [data-fa="r1:newdd"]');
        await o.pg.waitForSelector('#nf-qm', { state: 'visible' }); await W(150);
        const r = await o.pg.evaluate(() => {
          const m = document.getElementById('nf-qm'), mr = m.getBoundingClientRect(), it = [...m.querySelectorAll('[role=menuitem]')], L = it[it.length - 1], lr = L.getBoundingClientRect();
          const c = document.elementFromPoint(lr.left + lr.width / 2, lr.top + lr.height / 2), bad = [];
          it.forEach(e => { const x = e.getBoundingClientRect(), bb = e.querySelector('b');
            if (x.height < 44) bad.push(e.dataset.q + ' 高 ' + x.height);
            if (x.left < mr.left - 0.5 || x.right > mr.right + 0.5) bad.push(e.dataset.q + ' 横向出菜单');
            if (bb && bb.scrollWidth > bb.clientWidth + 1) bad.push(e.dataset.q + ' 截断'); });
          return { h: Math.round(mr.height), sh: m.scrollHeight, ch: m.clientHeight, scroll: m.scrollHeight > m.clientHeight + 1, lq: L.dataset.q, lt: Math.round(lr.top), lb: Math.round(lr.bottom), mt: Math.round(mr.top), mb: Math.round(mr.bottom), vh: innerHeight,
            full: lr.top >= mr.top - 0.5 && lr.bottom <= mr.bottom + 0.5 && lr.bottom <= innerHeight + 0.5, hit: !!c && (c === L || L.contains(c)), bad };
        });
        const tag = w + '×' + h + (font ? ' DejaVu' : '');
        gn.push(tag + ' ' + r.mt + '–' + r.mb + '（' + r.sh + '/' + r.ch + '）');
        if (r.scroll || r.lq !== 'panel' || !r.full || !r.hit || r.bad.length) gq.push(tag + ' ' + J({ scroll: r.scroll, sh: r.sh, ch: r.ch, last: r.lq, lt: r.lt, lb: r.lb, mb: r.mb, vh: r.vh, full: r.full, hit: r.hit, bad: r.bad.slice(0, 4) }));
        await o.ctx.close();
      })));
      T('Q2', !gq.length, '小屏几何（真实路径 文件 ▾ → ▾；1366×657 / 1280×650 / 1024×700 / 1100×700 × 默认字体 / DejaVu Sans）：菜单不出滚动条、末项「新建面板…」整块可见且命中、每项高 ≥44 不截断', gq.join(' | '));
      NOTE('快速新建 ▾ 小屏：' + gn.join('，'));
    };

    /* ===== Q3 零差异 ===== */
    S.Q3 = async (T, NOTE) => {
      for (const [q, k] of [['next=0', 'n0'], ['shell=classic', 'classic']]) {
        const s = await NFP.snapShell(b, withQ(URL0, q), ['qm'], { errs: pageErrs, tag: 'Q3 ' + q });
        T('Q3', !!s.qm && NFP.sha(s.qm) === FX[k].qm, '?' + q + '：快速新建 HTML（预置同一「上次」）与 fixture ' + k + '.qm 逐字节相同', NFP.sha(s.qm) + ' vs ' + FX[k].qm);
      }
      const rb = await NFP.snapShell(b, RB, ['qm', 'file'], { errs: pageErrs, tag: 'Q3 回滚' });
      T('Q3', NFP.sha(rb.qm) === FX.nx.qm && NFP.sha(rb.file) === FX.nx.file, '回滚副本（NW_P2B＝0）新形态：快速新建 HTML 与 fixture nx.qm、文件 ▾ 行尾 ▾ outerHTML 与 nx.file 逐字节相同',
        J({ qm: NFP.sha(rb.qm), fqm: FX.nx.qm, file: NFP.sha(rb.file), ffile: FX.nx.file }));
      const cur = await NFP.snapShell(b, URL0, ['qm', 'file'], { errs: pageErrs, tag: 'Q3 当前' });
      T('Q3', !!cur.qm && !!cur.file && NFP.sha(cur.qm) !== FX.nx.qm && NFP.sha(cur.file) !== FX.nx.file, '当前页新形态快速新建 HTML 与文件 ▾ 行尾 ▾ 都与 fixture 不同（防开关失效）');
    };

    /* ===== C1 命令表 ===== */
    S.C1 = async (T, NOTE) => {
      const { ctx, pg } = await open(b, URL0, { tag: 'C1' });
      const L = await pg.evaluate(() => FLOW.cmd.list().map(c => ({ id: c.id, t: c.t, k: String(c.k || ''), ic: c.ic || '', sp: !!c.sp, w: typeof c.w === 'string' ? c.w : '', run: typeof c.run === 'function' })));
      const norm = await pg.evaluate(ids => ids.map(id => FLOW.track.norm('cmd:go:' + id)), CMDS.map(c => c[0]));
      await ctx.close();
      const nf = L.filter(c => /^nf:/.test(c.id)), tail = L.slice(-CMDS.length), head = L.slice(0, L.length - nf.length);
      T('C1', nf.length === 19 && J(tail.map(c => c.id)) === J(CMDS.map(c => c[0])) && J(tail.map(c => c.t)) === J(CMDS.map(c => c[1])),
        '新形态开机后首次 FLOW.cmd.list()：19 条 nf:* 全在表尾，id 与标题按规格 §10 表逐字（新建：简谱 歌曲 … 新建：教学对照谱）', J({ n: nf.length, tail: tail.map(c => c.id + '|' + c.t) }));
      const bad = tail.map((c, i) => { const s = CMDS[i]; const ws = c.k.split(/\s+/).filter(Boolean);
        const e = [];
        if (c.k !== s[2]) e.push('关键词≠规格');
        if (c.ic !== s[3]) e.push('ic=' + c.ic);
        if (!c.sp) e.push('无 sp');
        if (c.w !== '新建面板' || !c.run) e.push('w/run');
        if (ws.some(w => /^[a-z]{2}$/i.test(w))) e.push('2 字母整词');
        if (BAN.some(w => c.k.toLowerCase().includes(w))) e.push('禁用词');
        if (!/^[a-z][a-z0-9]*(:[a-z0-9:-]+)*$/.test(c.id) || norm[i] !== 'cmd:go:' + c.id) e.push('id 格式');
        return e.length ? c.id + ' ' + e.join(',') : null; }).filter(Boolean);
      T('C1', !bad.length, '19 条：关键词＝规格表、无 2 字母整词、不含导入 / midi / 编辑 / 模式 / 播放 / 练习 / 四步 / 和弦图 / 写法 / 联排 / 配伴奏 / 织体；图标＝NWP.PZ_IC / SC[].ic；sp:1；cmd:go:<id> 过 FLOW.track 格式', bad.join(' | '));
      const ht = head.map(c => c.id + '|' + c.t);
      T('C1', J(ht) === J(FX.nx.cmdTxt) && NFP.sha(ht.join('\n')) === FX.nx.cmd, '既有 ' + head.length + ' 条命令（id＋标题）与 fixture nx.cmdTxt 逐条相同（只在表尾追加）',
        J(ht.map((x, i) => x === FX.nx.cmdTxt[i] ? null : [i, x, FX.nx.cmdTxt[i]]).filter(Boolean).slice(0, 4)));
      const n0 = await NFP.snapShell(b, withQ(URL0, 'next=0'), ['cmd'], { errs: pageErrs, tag: 'C1 next=0' });
      const rb = await NFP.snapShell(b, RB, ['cmd'], { errs: pageErrs, tag: 'C1 回滚' });
      T('C1', n0.cmdTxt && !n0.cmdTxt.some(x => /^nf:/.test(x)) && NFP.sha(n0.cmdTxt.join('\n')) === FX.n0.cmd, '?next=0：0 条 nf:*，命令表 id＋标题序列与 fixture n0.cmd 逐字节相同', n0.cmdTxt && n0.cmdTxt.length);
      T('C1', rb.cmdTxt && !rb.cmdTxt.some(x => /^nf:/.test(x)) && NFP.sha(rb.cmdTxt.join('\n')) === FX.nx.cmd, '回滚副本（NW_P2B＝0）：0 条 nf:*，命令表与 fixture nx.cmd 逐字节相同', rb.cmdTxt && rb.cmdTxt.length);
    };

    /* ===== C2 命令执行 ===== */
    S.C2 = async (T, NOTE) => {
      const { ctx, pg } = await open(b, URL0, { tag: 'C2' });
      const rows = [];
      for (const [id, , , , opt] of CMDS) {
        await pg.evaluate(() => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} try { closeModal(); } catch (_) {} __ui.length = 0; __trim(); document.body.focus(); });
        const ran = await pg.evaluate(id => FLOW.cmd.run(id), id);
        await W(350);
        const o = await pg.evaluate(() => ({ open: !!document.querySelector('.nf-modal'), pick: NWP.state ? NWP.state.pick : null, ui: __ui.slice(), rec: FLOW.cmd.recent()[0] || '',
          foc: !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('.nf-modal')) }));
        const d0 = await pg.evaluate(() => docs.length);
        await pg.keyboard.press('Enter'); await W(500);
        const cm = await pg.evaluate(d0 => Object.assign(__info(), { d: docs.length - d0, still: !!document.querySelector('.nf-modal') }), d0);
        await pg.evaluate(() => { try { closeModal(); } catch (_) {} __trim(); });
        const eq = await pg.evaluate(o => { const r = __eq(o); __trim(); return r; }, opt.form ? { link: goldOf(opt.form).link } : { scene: opt.scene });
        /* 在面板里点同一目标（A 组面板）：形态＝谱种行 → 形态 chip；常用＝卡；先断言可见再点 */
        await pg.evaluate(() => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} __panel({}); }); await W(300);
        let pn = null, why = '';
        const s1 = opt.form ? '.nf-modal [data-pz="' + opt.form.split('.')[0] + '"]' : '.nf-modal [data-scene="' + opt.scene + '"]';
        if (await pg.locator(s1).first().isVisible().catch(() => false)) {
          await pg.click(s1); await W(150);
          if (opt.form) { const s2 = '.nf-modal [data-form="' + opt.form + '"]'; if (await pg.locator(s2).first().isVisible().catch(() => false)) { await pg.click(s2); await W(150); } else why = '形态不可见 ' + s2; }
          if (!why) { const pk = await pg.evaluate(() => NWP.state.pick), dp = await pg.evaluate(() => docs.length); await pg.click('#nw-create'); await W(450);
            pn = await pg.evaluate(dp => Object.assign(__info(), { d: docs.length - dp }), dp); pn.pick = pk; }
        } else why = '不可见 ' + s1;
        await pg.evaluate(() => { try { closeModal(); } catch (_) {} __trim(); });
        rows.push({ id, opt, ran, o, cm, eq, pn, why, exp: opt.form ? 'fm:' + opt.form : 'sc:' + opt.scene });
      }
      (await pg.evaluate(() => __keys())).forEach(k => keysCur.add(k));
      await ctx.close();
      const b1 = rows.filter(r => !(r.ran && r.o.open && r.o.foc && r.o.pick === r.exp));
      T('C2', !b1.length, '19 条逐条 FLOW.cmd.run(id)：面板打开、焦点在面板里、st.pick＝该形态（fm:…）/ 常用卡（sc:…）', J(b1.map(r => ({ id: r.id, ran: r.ran, open: r.o.open, foc: r.o.foc, pick: r.o.pick, exp: r.exp }))));
      const b2 = rows.filter(r => !(r.cm.d === 1 && !r.cm.still && r.cm.j === r.eq.j && r.eq.d === 1 && (!r.opt.form || (r.cm.k === goldOf(r.opt.form).pk && r.cm.name === goldOf(r.opt.form).name))));
      T('C2', !b2.length, '回车建成（docs+1、面板收起）的 song 与等价计划（形态＝等价深链、常用＝该用途）逐字节相同，谱行 / 谱名＝nfpick.GOLD',
        J(b2.map(r => ({ id: r.id, d: r.cm.d, still: r.cm.still, k: r.cm.k, name: r.cm.name, same: r.cm.j === r.eq.j }))));
      const b3 = rows.filter(r => !(r.pn && r.pn.d === 1 && r.pn.pick === r.exp && r.pn.j === r.cm.j));
      T('C2', !b3.length, '接缝 ①：命令 → 面板落点 → 回车建成的 song 与在面板里点同一目标（谱种行 ＋ 形态 chip / 常用卡，先断言可见）建成的逐字节相同',
        J(b3.map(r => ({ id: r.id, why: r.why, pick: r.pn && r.pn.pick, same: r.pn && r.pn.j === r.cm.j }))));
      const b4 = rows.filter(r => !(J(r.o.ui) === J(['cmd:go:' + r.id]) && r.o.rec === r.id));
      T('C2', !b4.length, 'ui_cmd＝cmd:go:<id>（过 FLOW.track 格式）；最近用过（musetab-cmd-recent）记 id', J(b4.map(r => ({ id: r.id, ui: r.o.ui, rec: r.o.rec }))));
      /* 启动台上（sp:1） */
      const sp = [];
      for (const [id, exp] of [['nf:jita:tanchang', 'fm:jita.tanchang'], ['nf:pacc', 'sc:pacc']]) {
        const p = await open(b, URL0, { tag: 'C2 启动台', pad: true });
        const a = await p.pg.evaluate(id => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} return { pad: startPadOn(), ran: FLOW.cmd.run(id) }; }, id);
        await W(350);
        const o = await p.pg.evaluate(() => ({ open: !!document.querySelector('.nf-modal'), pick: NWP.state ? NWP.state.pick : null, d: docs.length }));
        await p.pg.keyboard.press('Enter'); await W(600);
        const z = await p.pg.evaluate(() => ({ d: docs.length, pad: startPadOn(), name: docTypeLabel(song) }));
        sp.push({ id, exp, a, o, z }); await p.ctx.close();
      }
      T('C2', sp.every(s => s.a.pad && s.a.ran && s.o.open && s.o.pick === s.exp && s.z.d === s.o.d + 1 && !s.z.pad), '启动台上也能执行（sp:1）：吉他谱 弹唱 / 钢琴即兴伴奏 → 面板落点对、回车建成并离台', J(sp));
    };

    /* ===== C3 搜索 ===== */
    S.C3 = async (T, NOTE) => {
      const top = async url => { const { ctx, pg } = await open(b, url, { tag: 'C3' });
        const r = await pg.evaluate(Q => Object.fromEntries(Q.map(q => [q, ((FLOW.cmd.search(q).hits || [])[0] || {}).id || ''])), QREG.concat(QNEW.map(x => x[0])));
        await ctx.close(); return r; };
      const cur = await top(URL0), rb = await top(RB);
      const nb = QNEW.filter(([q, id]) => cur[q] !== id);
      T('C3', !nb.length, QNEW.map(([q, id]) => '「' + q + '」→ ' + id).join('；'), J(nb.map(([q]) => q + '→' + cur[q])));
      const rg = QREG.filter(q => cur[q] !== rb[q]);
      T('C3', !rg.length, '回归：' + QREG.length + ' 个既有查询（' + QREG.join(' ') + '）首条与回滚副本相同', J(rg.map(q => q + ' cur=' + cur[q] + ' rb=' + rb[q])));
      /* 真实路径：Ctrl+/ → 输入 → 首行 → Enter → 面板 */
      const { ctx, pg } = await open(b, URL0, { tag: 'C3 ui' });
      await pg.evaluate(() => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} document.body.focus(); });
      await pg.mouse.click(5, 450);
      await pg.keyboard.press('Control+Slash'); await pg.waitForSelector('#flw-cmdq', { state: 'visible' });
      await pg.keyboard.type('简谱合唱'); await W(250);
      const r1 = await pg.evaluate(() => { const f = document.querySelector('#flw-cmdl .flw-cmdr'); return { v: f && f.dataset.v, t: f && f.textContent, ic: !!(f && f.querySelector('.flw-mic svg')), sel: f && f.getAttribute('aria-selected') }; });
      await pg.keyboard.press('Enter'); await W(400);
      const r2 = await pg.evaluate(() => ({ open: !!document.querySelector('.nf-modal'), pick: NWP.state && NWP.state.pick, sel: (document.querySelector('.nf-modal [role=listbox] [aria-selected="true"]') || { dataset: {} }).dataset.pz || '',
        chip: (document.querySelector('.nf-modal [data-form][aria-checked="true"]') || { dataset: {} }).dataset.form || '' }));
      await ctx.close();
      T('C3', r1.v === 'nf:hechang:jianpu' && r1.t === '新建：合唱谱 简谱合唱' && r1.ic && r1.sel === 'true' && r2.open && r2.pick === 'fm:hechang.jianpu' && r2.sel === 'hechang' && r2.chip === 'hechang.jianpu',
        '真实路径：Ctrl+/ 输入「简谱合唱」→ 首行「新建：合唱谱 简谱合唱」（带图标、选中）→ Enter → 新建面板落合唱谱 › 简谱合唱（左栏选中合唱谱、chip 选中简谱合唱）', J({ r1, r2 }));
    };

    /* ===== K1 谱友圈指法调 ===== */
    S.K1 = async (T, NOTE) => {
      /* 官网 PYQ_PZ（site/pyq.js 里自成一段的 IIFE）在 node 里求值，对同一卡片数据跑 fkeyText */
      const src = fs.readFileSync(path.join(__dirname, '../site/pyq.js'), 'utf8'), a = src.indexOf('window.PYQ_PZ = (function(){'), z = src.indexOf('\n})();', a);
      const box = { window: {} }; vm.createContext(box); vm.runInContext(src.slice(a, z + 6), box);
      const PYQ_PZ = box.window.PYQ_PZ;
      if (!PYQ_PZ || typeof PYQ_PZ.fkeyText !== 'function') throw new Error('官网 PYQ_PZ.fkeyText 没取到');
      /* 造卡片（接口卡片同形，经 ccNxCard 进本地卡池）＋ 离线本地示例 */
      const SYN = [
        { id: 'k1g0', title: 'K1 吉他', type: 'guitar', key: 'C', pz: 'jita', sub: 'tanchang', fx: { fkey: 'C' }, capo: 0 },
        { id: 'k1g2', title: 'K1 吉他夹二', type: 'guitar', key: 'D', pz: 'jita', sub: 'tanchang', fx: { fkey: 'C' }, capo: 2 },
        { id: 'k1s3', title: 'K1 指弹', type: 'solo', key: 'A', pz: 'jita', sub: 'zhitan', fx: { fkey: 'G' }, capo: 2 },
        { id: 'k1u0', title: 'K1 尤克里里', type: 'uku', key: 'G', pz: 'uku', sub: 'tanchang', fx: { fkey: 'G' }, capo: 0 },
        { id: 'k1u3', title: 'K1 尤克里里夹三', type: 'uku', key: 'Bb', pz: 'uku', sub: 'tanchang', fx: { fkey: 'G' }, capo: 3 },
        { id: 'k1gx', title: 'K1 旧接口吉他', type: 'guitar', key: 'C', pz: 'jita', sub: 'tanchang', fx: null, capo: 1 },
        { id: 'k1jp', title: 'K1 简谱', type: 'vocal', key: 'C', pz: 'jianpu', sub: 'gequ', fx: { fkey: 'C' }, capo: 0 },
        { id: 'k1wx', title: 'K1 五线谱', type: 'instr', key: 'C', pz: 'wuxian', sub: 'qiyue', fx: { fkey: '' }, capo: 0 },
        { id: 'k1pm', title: 'K1 小调钢琴', type: 'piano', key: 'C', mode: 'minor', pz: 'gangqin', sub: 'duzou', fx: { fkey: '' }, capo: 0 },
      ].map(s => Object.assign({ author: 'k1', measures: 8, beats: 4, unit: 4, tempo: 90, cover: [] }, s));
      const nxRun = async () => { const { ctx, pg } = await open(b, URL0, { tag: 'K1' });
        await pg.click('#flw-file'); await pg.waitForSelector('#popmenu [data-old="b-circle"]'); await pg.click('#popmenu [data-old="b-circle"]'); await W(1500);
        const r = await pg.evaluate(SYN => { SYN.forEach(s => { ccNx.extra[s.id] = ccNxCard(s); }); renderCircleNx(); return new Promise(res => setTimeout(() => {
          const cls = document.getElementById('circle').className;
          const pool = ccNxPool().map(pb => ({ pid: pb.pid, pz: pb.pz, fx: pb.fx ? { fkey: pb.fx.fkey } : null, capo: pb.capo, key: pb.key, type: pb.type, mode: pb.mode || '', remote: !!pb.remote,
            fk: ccFkeyText(pb), bits: ccMetaBits(pb, 1), dom: (() => { const m = document.querySelector('#circle .cc-card[data-pub="' + pb.pid + '"] .meta'); return m ? [...m.querySelectorAll('i')].map(i => i.textContent) : null; })() }));
          res({ cls, pool });
        }, 400)); }, SYN);
        await ctx.close(); return r; };
      const nx = await nxRun();
      const exp = c => PYQ_PZ.fkeyText({ pz: c.pz, fx: c.fx, capo: c.capo });
      const loc = nx.pool.filter(c => !c.remote), syn = nx.pool.filter(c => /^k1/.test(c.pid));
      const bad = nx.pool.filter(c => c.fk !== exp(c) || (c.fk ? c.bits[0] !== c.fk || (c.dom && c.dom[0] !== c.fk) : false));
      const W1 = { k1g0: 'C调指法', k1g2: 'C调指法 · 夹2', k1s3: 'G调指法 · 夹2', k1u0: 'G调指法', k1u3: 'G调指法 · 夹3', k1gx: '1=C', k1jp: '1=C', k1wx: 'C 调', k1pm: 'a 小调' };
      const wb = syn.filter(c => !c.dom || c.dom[0] !== W1[c.pid] || c.dom.some(t => /调指法/.test(t)) !== /调指法/.test(W1[c.pid]) || (/调指法/.test(W1[c.pid]) && c.dom.some(t => /^1=|^\S+ 调$/.test(t))));
      T('K1', nx.cls === 'cc-nx' && syn.length === SYN.length && loc.length >= 1 && !bad.length && !wb.length && loc.some(c => /调指法/.test(c.fk)),
        '新外壳谱友圈：吉他 / 尤克里里卡片写「X调指法」（有夹位加「 · 夹N」）且不再写调名，与对同一卡片数据跑官网 PYQ_PZ.fkeyText 逐字同（本地示例 ' + loc.length + ' 张 ＋ 造的接口卡片 ' + syn.length + ' 张）；无 fx 的旧接口卡片 / 简谱 / 五线谱 / 小调钢琴照旧 1=C · C 调 · a 小调',
        J({ cls: nx.cls, bad: bad.slice(0, 4), wb: wb.map(c => c.pid + ' ' + J(c.dom)), loc: loc.map(c => c.pid + ' ' + c.fk) }));
      /* 旧外壳 / ?next=0：卡片 HTML 不写指法调、调名照旧（同 tv_libpz Z13 口径） */
      const old = {};
      for (const q of ['shell=classic', 'next=0']) {
        const { ctx, pg } = await open(b, withQ(URL0, q), { tag: 'K1 ' + q });
        await pg.evaluate(() => openCircle()); await W(1300);
        old[q] = await pg.evaluate(SYN => { const cls = document.getElementById('circle').className, grid = document.getElementById('circle').innerHTML;
          const syn = SYN.map(s => { const pb = Object.assign({ pid: s.id, remote: true }, s); const h = circleCard(pb, {}, {}); const m = /<div class="meta">([\s\S]*?)<\/div>/.exec(h); return { id: s.id, fk: /调指法/.test(h), meta: m ? m[1] : h.slice(0, 200) }; });
          const loc = [...document.querySelectorAll('#circle .cc-card[data-pub] .meta')].map(m => [...m.querySelectorAll('i')].map(i => i.textContent)[0]);
          return { cls, any: /调指法/.test(grid), syn, loc }; }, SYN);
        await ctx.close();
      }
      const OK0 = { k1g0: '1=C', k1g2: '1=D', k1s3: 'A 调', k1u0: '1=G', k1u3: '1=Bb', k1gx: '1=C', k1jp: '1=C', k1wx: 'C 调', k1pm: 'C 调' };
      T('K1', Object.values(old).every(o => o.cls === '' && !o.any && o.syn.every(s => !s.fk && s.meta.indexOf('<i>' + OK0[s.id] + '</i>') === 0) && o.loc.length >= 1 && o.loc.every(t => /^1=/.test(t))),
        '?shell=classic / ?next=0 谱友圈：卡片不写指法调，调名照旧（吉他 / 尤克里里 1=调、独奏 / 五线谱 / 小调钢琴「X 调」）', J(old));
    };

    /* ===== 两路并行：快速新建（Q）与命令面板 ＋ 谱友圈（C / K） ===== */
    const NEED = { Q3: !!FX.nx, C1: !!FX.nx }, bufs = {};
    const grp = async ids => { for (const id of ids) { if (!want(id) || NEED[id] === false || !S[id]) continue; const buf = bufs[id] = [], t = mkT(buf);
      await guard(t, id, () => S[id](t, x => buf.push('ℹ️ ' + x))); } };
    await Promise.all([grp(['Q1', 'Q2', 'Q3']), grp(['C1', 'C2', 'C3', 'K1'])]);
    ['Q1', 'Q2', 'Q3', 'C1', 'C2', 'C3', 'K1'].forEach(id => (bufs[id] || []).forEach(l => console.log(l)));

    /* ===== E ===== */
    if (keysCur.size) {
      const { ctx, pg } = await open(b, RB, { tag: 'E 回滚' });
      await pg.evaluate(async () => { const w = ms => new Promise(r => setTimeout(r, ms));
        try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} NWP.quickCreate('vocal'); await w(300);
        FLOW.cmd.run('r1:new'); await w(300); document.getElementById('nw-create').click(); await w(400); __trim(); });
      (await pg.evaluate(() => __keys())).forEach(k => keysRb.add(k));
      await ctx.close();
      const diff = [...keysCur].filter(k => !keysRb.has(k) && k !== 'musetab-cmd-recent');
      T('E', !diff.length, 'musetab-* 键集合差为空（对回滚副本做同类动作：快速新建 ＋ 命令新建；musetab-cmd-recent 本来就写）', J({ diff, cur: [...keysCur] }));
    }
    T('E', !pageErrs.length, '页面脚本错误 0', pageErrs.slice(0, 5).join(' | '));
  } finally { await b.close(); }
  console.log('（单跑 ' + Math.round((Date.now() - t0) / 1000) + ' 秒；被测 ' + URL0 + '）');
  console.log('PASS ' + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})();
