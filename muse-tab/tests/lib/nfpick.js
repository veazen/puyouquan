'use strict';
/* v70.1 P2b「新建：第一步按谱种」共享 helper（规格 docs/spec-2026-11-v701.md §15.1；A 组第 0 步写，B / C 组用）。
   新外壳新形态的新建面板第一步不再列 gtr / vocal / solo / inst / chord 五张用途卡（换成谱种行 ＋ 形态 chip）；常用 4 卡（pacc / kids / sight / teach）与空白谱 / 自选照旧。
   迁移口径：卡可见就点卡（旧外壳 / ?next=0 / 窄档 / 常用卡——与迁移前逐字同行为），否则按 NF_MAP 先断言谱种行可见再点、再断言形态 chip 可见再点（v68.9 教训）。

   NF_MAP(scene, v, mel, fam)   旧「用途＋变体＋旋律用」→ 归属：{card} 或 {pz, form, fixed}（fixed＝该形态 hid，调用方据它跳过已由形态定下的点击）。
                                与编辑器 NWP.fmHome 各写一遍，tv_v701new P0 逐个互核；mel 只在「真给了」时传（深链 mel= / 亲手点的），未给＝undefined
   nfPick(pg, scene, v, mel)    面板已开时点到该用途（卡或谱种行＋形态 chip）；不可见就 throw（带选择器）。返回 {via:'card'|'form', pz, form, fixed}
   nfHome(pg, scene, v, mel)    期望落点 pick 串（'sc:…' / 'fm:…'），乐器族从页面 PQ_KIND.INST_FAM 读
   nfSel(pg)                    当前左栏选中 → pick 串（读 DOM）
   PAGE_INIT                    字符串，pg.evaluate(PAGE_INIT) 后页面里有 window.__nfPick(scene, v, mel)（同步点击，true / false；结果另放 window.__nfPicked）、__nfHome、__nfSel、__NF_MAP
   rollbackUrl(url)             被测页 const NW_P2B = 1; 换成 0 的临时副本（os.tmpdir()），返回 file:// 地址；非 file 地址 / 那串字不是恰一处就抛错
   GOLD                         §3.1 的 36 行金表（24 形态 ＋ 12 个参数变体 a–l；2026-11-06 在 e7af09b 上用 linkApply → planOf → realCreate 实测）
   QM_LS / baseSnap / keySeq    零差异快照（fixtures/v701_base.json 的写法；tv_v701new --write-base 生成、F3 读，tv_v701ent Q3 / C1 用同一段代码对拍） */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');

/* ---- NF_MAP：自包含（PAGE_INIT 把源码原样注入页面），不引用外部名字 ---- */
function NF_MAP(scene, v, mel, fam) {
  const HID = { 'jianpu.gequ': ['mel', 'parts'], 'jianpu.qiyue': ['mel', 'tacc'], 'jianpu.shichang': ['mel'], 'wuxian.gequ': ['mel', 'parts'], 'wuxian.qiyue': ['mel'],
    'gangqin.duzou': [], 'gangqin.chunban': ['acc'], 'jita.tanchang': ['inst'], 'jita.zhitan': ['inst'], 'uku.tanchang': ['inst'], 'uku.zhitan': ['inst'],
    'hechang.jianpu': ['mel'], 'hechang.wuxian': ['mel'], 'gongneng.jishu': ['ftype'], 'gongneng.hexian': ['ftype'] };
  v = v || {};
  const M = mel == null || mel === '' ? '' : String(mel).trim().toUpperCase();
  const fm = id => { const a = id.split('.'); return { pz: a[0], form: a[1], fixed: HID[id].slice() }; };
  const card = c => ({ card: c });
  switch (scene) {
    case 'gtr': return fm((v.inst === 'uku' ? 'uku' : 'jita') + '.tanchang');
    case 'solo': return fm((v.inst === 'uku' ? 'uku' : 'jita') + '.zhitan');
    case 'vocal': return fm((+v.parts || 1) >= 2 ? (M === 'S' ? 'hechang.wuxian' : 'hechang.jianpu') : (M === 'S' ? 'wuxian.gequ' : 'jianpu.gequ'));
    case 'inst': {
      const ik = v.instKey || 'piano', f = fam || (ik === 'piano' ? 'kbd' : '');
      if (!f) throw new Error('NF_MAP：器乐缺乐器族（instKey=' + ik + '）');
      if (f === 'kbd') return fm('gangqin.duzou');
      if (v.tacc === 'with' || f === 'other') return fm('wuxian.qiyue');
      if (M === 'J') return fm('jianpu.qiyue');
      if (M === 'S') return fm('wuxian.qiyue');
      return fm(f === 'jianpu' ? 'jianpu.qiyue' : 'wuxian.qiyue');
    }
    case 'chord': return fm(v.ftype === 'CJ' ? 'gongneng.jishu' : 'gongneng.hexian');
    case 'pacc': return v.acc === 'pure' ? fm('gangqin.chunban') : card('pacc');
    case 'sight': return M === 'J' ? fm('jianpu.shichang') : card('sight');
    case 'kids': case 'teach': case 'blank': case 'custom': return card(scene);
  }
  throw new Error('NF_MAP：不认识的用途 ' + scene);
}
const pickOf = m => m.card ? 'sc:' + m.card : 'fm:' + m.pz + '.' + m.form;

/* ---- 页面侧（PAGE_INIT 与 Playwright 两路同口径） ---- */
function PAGE_FNS() {
  const vis = e => { if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false; } return true; };
  const famOf = v => { const ik = (v && v.instKey) || 'piano'; try { return PQ_KIND.INST_FAM[ik] || ''; } catch (_) { return ''; } };
  window.__nfVis = vis;
  window.__nfHome = (scene, v, mel) => { const m = window.__NF_MAP(scene, v || {}, mel, famOf(v)); return m.card ? 'sc:' + m.card : 'fm:' + m.pz + '.' + m.form; };
  window.__nfSel = () => {
    const o = document.querySelector('.nf-modal [role=listbox] [role=option][aria-selected="true"]'); if (!o) return '';
    if (o.dataset.scene) return 'sc:' + o.dataset.scene;
    if (o.dataset.pz) { const c = document.querySelector('.nf-modal [data-form][aria-checked="true"]'); return 'fm:' + (c ? c.dataset.form : o.dataset.pz + '.'); }
    return '';
  };
  /* 同步点击（面板重画是同步的：onClick → draw → morph）；找不到 / 不可见＝false，原因在 window.__nfPicked.err */
  window.__nfPick = (scene, v, mel) => {
    window.__nfPicked = null;
    const cs = '.nf-modal [data-scene="' + scene + '"]', c = document.querySelector(cs);
    if (c && vis(c)) { c.click(); window.__nfPicked = { via: 'card', pz: '', form: '', fixed: [] }; return true; }
    let m; try { m = window.__NF_MAP(scene, v || {}, mel, famOf(v)); } catch (e) { window.__nfPicked = { err: String(e.message || e) }; return false; }
    if (m.card) { window.__nfPicked = { err: '卡不可见：' + cs }; return false; }
    const ps = '.nf-modal [data-pz="' + m.pz + '"]', p = document.querySelector(ps);
    if (!p || !vis(p)) { window.__nfPicked = { err: '谱种行不可见：' + ps }; return false; }
    p.click();
    const fs2 = '.nf-modal [data-form="' + m.pz + '.' + m.form + '"]', f = document.querySelector(fs2);
    if (!f || !vis(f)) { window.__nfPicked = { err: '形态不可见：' + fs2 }; return false; }
    f.click();
    window.__nfPicked = { via: 'form', pz: m.pz, form: m.form, fixed: m.fixed.slice() };
    return true;
  };
}
const PAGE_INIT = '(()=>{ window.__NF_MAP = ' + NF_MAP.toString() + '; (' + PAGE_FNS.toString() + ')(); })()';

async function famOfPg(pg, v) { return pg.evaluate(ik => { try { return PQ_KIND.INST_FAM[ik] || ''; } catch (_) { return ''; } }, (v && v.instKey) || 'piano'); }
async function nfHome(pg, scene, v, mel) { return pickOf(NF_MAP(scene, v || {}, mel, await famOfPg(pg, v))); }
async function nfSel(pg) {
  return pg.evaluate(() => {
    const o = document.querySelector('.nf-modal [role=listbox] [role=option][aria-selected="true"]'); if (!o) return '';
    if (o.dataset.scene) return 'sc:' + o.dataset.scene;
    if (o.dataset.pz) { const c = document.querySelector('.nf-modal [data-form][aria-checked="true"]'); return 'fm:' + (c ? c.dataset.form : o.dataset.pz + '.'); }
    return '';
  });
}
async function nfPick(pg, scene, v, mel) {
  v = v || {};
  await pg.waitForSelector('.nf-modal [data-scene], .nf-modal [data-pz]', { timeout: 4000 }).catch(() => {});
  const cs = '.nf-modal [data-scene="' + scene + '"]';
  if (await pg.locator(cs).first().isVisible().catch(() => false)) { await pg.click(cs); return { via: 'card', pz: '', form: '', fixed: [] }; }
  const m = NF_MAP(scene, v, mel, await famOfPg(pg, v));
  if (m.card) throw new Error('nfPick：卡不可见 ' + cs);
  const ps = '.nf-modal [data-pz="' + m.pz + '"]';
  if (!(await pg.locator(ps).first().isVisible().catch(() => false))) throw new Error('nfPick：谱种行不可见 ' + ps);
  await pg.click(ps);
  const fsel = '.nf-modal [data-form="' + m.pz + '.' + m.form + '"]';
  const ok = await pg.waitForSelector(fsel, { state: 'visible', timeout: 1500 }).then(() => true).catch(() => false);
  if (!ok) throw new Error('nfPick：形态不可见 ' + fsel);
  await pg.click(fsel);
  return { via: 'form', pz: m.pz, form: m.form, fixed: m.fixed.slice() };
}

/* ---- 回滚副本 ---- */
const NEEDLE = 'const NW_P2B = 1;';
function rollbackUrl(url) {
  const m = /^file:\/\/([^?#]*)([?#].*)?$/.exec(String(url || ''));
  if (!m) throw new Error('rollbackUrl：只认 file:// 地址：' + url);
  const src = decodeURIComponent(m[1]), txt = fs.readFileSync(src, 'utf8');
  const n = txt.split(NEEDLE).length - 1;
  if (n !== 1) throw new Error('rollbackUrl：' + src + ' 里「' + NEEDLE + '」应恰一处，实为 ' + n + ' 处');
  const out = txt.replace(NEEDLE, 'const NW_P2B = 0;');
  const f = path.join(os.tmpdir(), 'v701_rollback_' + crypto.createHash('sha1').update(out).digest('hex').slice(0, 12) + '.html');
  if (!fs.existsSync(f)) { const t = f + '.' + process.pid; fs.writeFileSync(t, out); fs.renameSync(t, f); }
  return 'file://' + f + (m[2] || '');
}

/* ---- GOLD：§3.1 建成列（24 形态 ＋ 参数变体 a–l）。link＝等价深链；pk 面板谱行；bk 建成谱行（NWB.stackOf）；name 谱名（面板＝创建钮＝docTypeLabel＝页签）；
   pz 主谱种.二级；also 也在（无序）；intent＝用途；form＝在面板里从哪个形态点起；set＝选中形态后还要点的（v＝变体，mel＝预览左上旋律）；how＝那一下在哪 ---- */
const G = (id, form, link, pk, bk, name, pz, also, intent, set, how) => ({ id, form, link, pk, bk, name, pz, also, intent, set: set || null, how: how || '' });
const GOLD = [
  G('jianpu.gequ', 'jianpu.gequ', 'new=vocal&parts=1&mel=J', 'J', 'J', '简谱歌谱', 'jianpu.gequ', [], 'vocal'),
  G('jianpu.daiban', 'jianpu.daiban', 'new=pacc&acc=mel&mel=J', 'JG', 'JG', '钢琴伴奏歌谱', 'gangqin.tanchang', ['jianpu.gequ'], 'pacc'),
  G('jianpu.hechang', 'jianpu.hechang', 'new=vocal&parts=4&mel=J', 'J', 'J', '简谱合唱谱', 'hechang.jianpu', ['jianpu.hechang'], 'vocal'),
  G('jianpu.qiyue', 'jianpu.qiyue', 'new=inst&instKey=erhu&mel=J', 'J', 'J', '二胡谱（简谱）', 'jianpu.qiyue', [], 'inst'),
  G('jianpu.shichang', 'jianpu.shichang', 'new=sight&mel=J', 'J', 'J', '简谱歌谱', 'jianpu.shichang', [], 'sight'),
  G('jianpu.duizhao', 'jianpu.duizhao', 'new=teach', 'SJ', 'SJ', '教学对照谱', 'wuxian.duizhao', ['jianpu.duizhao'], 'teach'),
  G('wuxian.gequ', 'wuxian.gequ', 'new=vocal&parts=1&mel=S', 'S', 'S', '五线谱歌谱', 'wuxian.gequ', [], 'vocal'),
  G('wuxian.daiban', 'wuxian.daiban', 'new=pacc&acc=mel&mel=S', 'SG', 'SG', '钢琴伴奏歌谱（五线谱）', 'gangqin.tanchang', ['wuxian.gequ'], 'pacc'),
  G('wuxian.hechang', 'wuxian.hechang', 'new=vocal&parts=4&mel=S', 'S', 'S', '五线谱合唱谱', 'hechang.wuxian', ['wuxian.hechang'], 'vocal'),
  G('wuxian.qiyue', 'wuxian.qiyue', 'new=inst&instKey=violin', 'S', 'S', '小提琴谱（五线谱）', 'wuxian.qiyue', [], 'inst'),
  G('wuxian.shichang', 'wuxian.shichang', 'new=sight', 'S', 'S', '五线谱旋律', 'wuxian.shichang', [], 'sight'),
  G('wuxian.duizhao', 'wuxian.duizhao', 'new=teach', 'SJ', 'SJ', '教学对照谱', 'wuxian.duizhao', ['jianpu.duizhao'], 'teach'),
  G('gangqin.duzou', 'gangqin.duzou', 'new=inst&instKey=piano', 'G', 'G', '钢琴独奏谱', 'gangqin.duzou', [], 'inst'),
  G('gangqin.tanchang', 'gangqin.tanchang', 'new=pacc&acc=mel&mel=J', 'JG', 'JG', '钢琴伴奏歌谱', 'gangqin.tanchang', ['jianpu.gequ'], 'pacc'),
  G('gangqin.erge', 'gangqin.erge', 'new=kids&acc=mel&mel=J', 'JG', 'JG', '钢琴伴奏歌谱', 'gangqin.tanchang', ['jianpu.erge'], 'kids'),
  G('gangqin.chunban', 'gangqin.chunban', 'new=pacc&acc=pure', 'CG', 'CG', '钢琴伴奏谱（纯伴奏）', 'gangqin.banzou', [], 'pacc'),
  G('jita.tanchang', 'jita.tanchang', 'new=gtr&inst=guitar', 'JT', 'JT', '吉他弹唱谱', 'jita.tanchang', [], 'gtr'),
  G('jita.zhitan', 'jita.zhitan', 'new=solo&inst=guitar', 'ST', 'ST', '吉他独奏谱', 'jita.zhitan', [], 'solo'),
  G('uku.tanchang', 'uku.tanchang', 'new=gtr&inst=uku', 'JT', 'JT', '尤克里里弹唱谱', 'uku.tanchang', [], 'gtr'),
  G('uku.zhitan', 'uku.zhitan', 'new=solo&inst=uku', 'ST', 'ST', '尤克里里独奏谱', 'uku.zhitan', [], 'solo'),
  G('hechang.jianpu', 'hechang.jianpu', 'new=vocal&parts=4&mel=J', 'J', 'J', '简谱合唱谱', 'hechang.jianpu', ['jianpu.hechang'], 'vocal'),
  G('hechang.wuxian', 'hechang.wuxian', 'new=vocal&parts=4&mel=S', 'S', 'S', '五线谱合唱谱', 'hechang.wuxian', ['wuxian.hechang'], 'vocal'),
  G('gongneng.jishu', 'gongneng.jishu', 'new=chord&ftype=CJ&mel=J', 'CJ', 'CJ', '功能谱', 'gongneng.jishu', [], 'chord'),
  G('gongneng.hexian', 'gongneng.hexian', 'new=chord&ftype=C', 'C', 'C', '和弦谱', 'gongneng.hexian', [], 'chord'),
  G('a', 'hechang.jianpu', 'new=vocal&parts=4&tacc=with&mel=J', 'JG', 'J', '简谱合唱谱（含钢琴伴奏）', 'hechang.jianpu', ['jianpu.hechang', 'gangqin.banzou'], 'vocal', { v: { tacc: 'with' } }, '参数行「钢琴 · 加伴奏」'),
  G('b', 'hechang.wuxian', 'new=vocal&parts=4&tacc=with&mel=S', 'SG', 'S', '五线谱合唱谱（含钢琴伴奏）', 'hechang.wuxian', ['wuxian.hechang', 'gangqin.banzou'], 'vocal', { v: { tacc: 'with' } }, '参数行「钢琴 · 加伴奏」'),
  G('c', 'hechang.jianpu', 'new=vocal&parts=2&mel=J', 'J', 'J', '简谱合唱谱', 'hechang.jianpu', ['jianpu.hechang'], 'vocal', { v: { parts: 2 } }, '参数行「声部 · 二部」'),
  G('d', 'gangqin.tanchang', 'new=pacc&acc=mel&mel=S', 'SG', 'SG', '钢琴伴奏歌谱（五线谱）', 'gangqin.tanchang', ['wuxian.gequ'], 'pacc', { mel: 'S' }, '预览左上「旋律 · 五线」'),
  G('e', 'gangqin.erge', 'new=kids&acc=mel&mel=S', 'SG', 'SG', '钢琴伴奏歌谱（五线谱）', 'gangqin.tanchang', ['wuxian.gequ'], 'kids', { mel: 'S' }, '预览左上「旋律 · 五线」'),
  G('f', 'gongneng.jishu', 'new=chord&ftype=CJ&mel=S', 'CS', 'CS', '五线谱和弦谱', 'gongneng.jishu', [], 'chord', { mel: 'S' }, '预览左上「旋律 · 五线」'),
  G('g', 'jianpu.qiyue', 'new=inst&instKey=sax&mel=J', 'J', 'J', '萨克斯谱（简谱）', 'jianpu.qiyue', [], 'inst', { v: { instKey: 'sax' } }, '乐器下拉'),
  G('h', 'jianpu.qiyue', 'new=inst&instKey=cello&mel=J', 'J', 'J', '大提琴谱（简谱）', 'jianpu.qiyue', [], 'inst', { v: { instKey: 'cello' } }, '乐器下拉'),
  G('i', 'wuxian.qiyue', 'new=inst&instKey=erhu&mel=S', 'S', 'S', '二胡谱（五线谱）', 'wuxian.qiyue', [], 'inst', { v: { instKey: 'erhu' } }, '乐器下拉'),
  G('j', 'wuxian.qiyue', 'new=inst&instKey=other', 'S', 'S', '器乐谱（五线谱）', 'wuxian.qiyue', [], 'inst', { v: { instKey: 'other' } }, '乐器下拉（⋯ 出谱号）'),
  G('k', 'wuxian.qiyue', 'new=inst&instKey=violin&tacc=with', 'SG', 'SG', '小提琴＋钢琴伴奏谱（五线谱）', 'wuxian.qiyue', ['gangqin.banzou'], 'inst', { v: { tacc: 'with' } }, '⋯「钢琴伴奏 · 加伴奏」'),
  G('l', 'jianpu.gequ', 'new=vocal&parts=1&tacc=with&mel=J', 'JG', 'JG', '钢琴伴奏歌谱', 'gangqin.tanchang', ['jianpu.gequ'], 'vocal', { v: { tacc: 'with' } }, '⋯「钢琴伴奏 · 加伴奏」'),
];

/* ---- 零差异快照（fixtures/v701_base.json；全部存 sha1:长度，nx.keys 与 nx.cmdTxt 存明文） ---- */
const SCENES = ['gtr', 'pacc', 'kids', 'vocal', 'teach', 'sight', 'solo', 'inst', 'chord', 'blank', 'custom'];
/* 快速新建快照前预置的「上次」（固定值，快照只依赖它） */
const QM_LS = JSON.stringify({ scene: 'pacc', stack: 'JG', rows: ['J', 'G'], mel: 'J', v: { key: 'D', mode: 'major', beats: 3, unit: 4, tempo: 88, acc: 'mel' }, t: 1 });
const sha = t => t == null ? null : crypto.createHash('sha1').update(String(t)).digest('hex') + ':' + String(t).length;
const W = ms => new Promise(r => setTimeout(r, ms));
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
function SNAP_INIT() {
  window.__panel = o => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} try { closeModal(); } catch (_) {} showNewWizard(o || {}); };
  window.__shell = () => { const s = document.querySelector('.nf-modal .nf-shell'); if (!s) return null; const c = s.cloneNode(true); const b = c.querySelector('#nf-pvbox'); if (b) b.innerHTML = ''; return c.innerHTML; };
}
async function openPg(b, url, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(SNAP_INIT);
  const pg = await ctx.newPage(); pg.setDefaultTimeout(6000);
  if (o.errs) pg.on('pageerror', e => o.errs.push((o.tag || '') + ' ' + e.message));
  await pg.goto(url); await W(o.wait || 1500);
  await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });
  return { ctx, pg };
}
/* 一个外壳的快照：want ⊆ ['sc','spd','cmd','file','qm']（keys 另走 keySeq）。顺序固定：开机 → 启动台 #spd-nx → 命令表（开机后首次 list()）→ 离台 → 文件 ▾ 行尾 ▾ → 快速新建 → 11 个用途 */
async function snapShell(b, url, want, o) {
  want = want || ['sc', 'spd', 'cmd', 'file', 'qm'];
  const { ctx, pg } = await openPg(b, url, Object.assign({ tag: 'snap' }, o || {}));
  const r = {};
  try {
    if (want.includes('spd')) r.spd = await pg.evaluate(() => { const e = document.getElementById('spd-nx'); return e ? e.outerHTML : null; });
    if (want.includes('cmd')) r.cmdTxt = await pg.evaluate(() => { try { return FLOW.cmd.list().map(c => c.id + '|' + c.t); } catch (e) { return null; } });
    await pg.evaluate(() => { try { hideStartPad(); } catch (_) {} });
    if (want.includes('file')) {
      const has = await pg.evaluate(() => !!document.getElementById('flw-file') && !!(document.getElementById('flw-file').getClientRects().length));
      if (has) { await pg.click('#flw-file'); r.file = await pg.waitForSelector('#popmenu [data-fa="r1:newdd"]', { timeout: 4000 }).then(() => pg.evaluate(() => document.querySelector('#popmenu [data-fa="r1:newdd"]').outerHTML)).catch(() => null);
        await pg.keyboard.press('Escape'); await W(120); await pg.evaluate(() => { try { closePop(); } catch (_) {} }); } else r.file = null;
    }
    if (want.includes('qm')) r.qm = await pg.evaluate(async ls => {
      const w = ms => new Promise(res => setTimeout(res, ms));
      try { localStorage.setItem('musetab-nw-last', ls); } catch (_) {}
      try { NWP.quickMenuClose(); } catch (_) {}
      NWP.quickMenu(document.getElementById('flw-file') || document.getElementById('b-newdd') || null); await w(200);
      const m = document.getElementById('nf-qm'), h = m ? m.innerHTML : null;
      try { NWP.quickMenuClose(); } catch (_) {}
      try { localStorage.removeItem('musetab-nw-last'); } catch (_) {}
      return h;
    }, QM_LS);
    if (want.includes('sc')) r.sc = await pg.evaluate(async SC => {
      const w = ms => new Promise(res => setTimeout(res, ms)), o = {};
      for (const sc of SC) { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} __panel({ scene: sc }); await w(250); o[sc] = __shell(); }
      try { closeModal(); } catch (_) {}
      return o;
    }, SCENES);
  } finally { await ctx.close(); }
  return r;
}
/* Alt+N 后键序列（同 tv_v700new keySeq 的写法与记录格式；点 data-scene="vocal" / "teach"＝只对旧形态 / 回滚副本 / 基线有意义） */
async function keySeq(b, url) {
  const { ctx, pg } = await openPg(b, url, { tag: 'keys' });
  const J = x => JSON.stringify(x), out = [];
  try {
    const rec = async tag => out.push(tag + ' ' + J(await pg.evaluate(() => { const st = NWP.state, m = document.querySelector('.nf-modal');
      const a = document.activeElement; const foc = a ? (a.dataset && (a.dataset.scene ? 'sc:' + a.dataset.scene : a.dataset.act ? a.dataset.act + ':' + (a.dataset.k || '') + ':' + (a.dataset.v || '') : a.id || a.tagName)) : '';
      return st && m ? { o: 1, sc: st.scene, k: NWP.stackOfState(st), foc } : { o: 0, docs: docs.length, k: NWB.stackOf(song), name: docTypeLabel(song) }; })));
    await pg.evaluate(() => { try { hideStartPad(); } catch (_) {} try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} document.body.focus(); });
    await pg.mouse.click(5, 450);
    await pg.keyboard.press('Alt+KeyN'); await W(400); await rec('Alt+N');
    for (const k of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Home', 'End', 'ArrowUp']) { await pg.keyboard.press(k); await W(60); await rec(k); }
    await pg.keyboard.press('Home'); await W(60);
    for (const k of ['4', '1', '2', '5', '3', '3', '1']) { await pg.keyboard.press(k); await W(60); await rec('key' + k); }
    await pg.click('.nf-modal [data-scene="vocal"]'); await W(80);
    const pb = await pg.$('.nf-modal [data-act="var"][data-k="parts"][aria-checked="true"]');
    if (pb) { await pb.focus(); for (const k of ['ArrowRight', 'ArrowRight', 'ArrowLeft']) { await pg.keyboard.press(k); await W(60); await rec('parts ' + k); } }
    await pg.click('.nf-modal [data-scene="teach"]'); await W(80); await pg.focus('.nf-modal [data-scene="teach"]');
    await pg.keyboard.press('Enter'); await W(400); await rec('Enter');
    await pg.keyboard.press('Alt+KeyN'); await W(400); await rec('Alt+N 2');
    await pg.keyboard.press('Escape'); await W(200); await rec('Esc');
    await pg.mouse.click(5, 450);
    await pg.keyboard.press('Alt+Shift+KeyN'); await W(500); await rec('Alt+Shift+N');
  } finally { await ctx.close(); }
  return out;
}
/* 整份快照（＝fixture 的形状）：url 是新外壳默认地址；n0 / classic 由它加 ?next=0 / ?shell=classic */
const hashSc = o => o ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, sha(v)])) : null;
async function baseSnap(b, url, o) {
  const nx = await snapShell(b, url, null, o), n0 = await snapShell(b, withQ(url, 'next=0'), ['sc', 'cmd', 'qm'], o), cl = await snapShell(b, withQ(url, 'shell=classic'), ['sc', 'qm'], o);
  const keys = await keySeq(b, url);
  return {
    qmLs: QM_LS,
    nx: { sc: hashSc(nx.sc), spd: sha(nx.spd), keys, qm: sha(nx.qm), cmd: sha(nx.cmdTxt && nx.cmdTxt.join('\n')), cmdTxt: nx.cmdTxt, file: sha(nx.file) },
    n0: { sc: hashSc(n0.sc), qm: sha(n0.qm), cmd: sha(n0.cmdTxt && n0.cmdTxt.join('\n')) },
    classic: { sc: hashSc(cl.sc), qm: sha(cl.qm) },
  };
}

module.exports = { NF_MAP, pickOf, nfPick, nfHome, nfSel, PAGE_INIT, rollbackUrl, GOLD, NEEDLE, SCENES, QM_LS, sha, withQ, snapShell, keySeq, baseSnap, hashSc };
