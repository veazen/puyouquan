'use strict';
/* v70.1 P2b A 组「新建：第一步按谱种」（规格 docs/spec-2026-11-v701.md §14.1；共享 helper tests/lib/nfpick.js §15.1；零差异基线 fixtures/v701_base.json＝1122ea3 §14.3）。
   第 0 步（本提交，界面零变化）只有数据与零差异两段；F1 / F2 / F4–F13 由 A 组后续各步补进来（规格 §14.1 表）。
   P0  数据：NWP.PZ_FORMS 24 行与规格 §3.1 逐字段相同（字段名固定）；谱种顺序＝PQ_KIND.PZ、形态名 ≤4 字（id 的二级在谱库表里时与二级同名）；每谱种恰一个 def、＝PZ_DEF；
       PZ_IC＝CC_PZ_IC；24 行 fmApply(干净状态, id, true) 后 fmMatch 真、st.pick＝该形态、planOf＝等价深链 planOf（逐字节）、fresh({form}) 同；fresh 不带 form 时 pick＝''；
       同用途换形态只写本形态的 v 与旋律（合唱谱两形态保留三部、弹唱 ↔ 纯伴奏旋律保留、清 st.link）；
       全部可达组合（tv_newpanel 43 组合 ＋ tv_v700new 金表 ＋ 本表 36 行 ＋ §8.1 深链表 ＋ 自选）fmHome＝nfpick.NF_MAP（两处各写一遍互核），§8.1 深链落点逐条；
       GOLD 36 行 linkApply → planOf → realCreate：面板谱行 / 建成谱行 / 谱名（面板＝建成＝docTypeLabel＝页签）/ 主谱种 › 二级 / 也在 / intent；
       建谱后 musetab-nw-last 的键集合不变（st.pick 不进本机键）
   F3  零差异（第 0 步口径）：?next=0 / ?shell=classic 11 个用途 .nf-shell（去预览框）与 fixture n0.sc / classic.sc 逐字节；回滚副本（nfpick.rollbackUrl）新形态 11 个用途、#spd-nx、
       Alt+N 键序列与 fixture nx.* 逐字节；源码里「const NW_P2B = 1;」恰一处；**第 0 步**当前页新形态 11 个用途也与 fixture nx.sc 逐字节（界面零变化）——A 组 ② 落左栏后此条改为「不同」（防开关失效）
   E   页面脚本错误 0
   用法：node tv_v701new.js [--write-base | --diff-base]
     --write-base  用 git show 1122ea3:muse-tab/index.html 的副本生成 fixtures/v701_base.json（§14.3 全部键，含 B 组读的 nx.qm / nx.cmd / nx.file / n0.* / classic.*；其余键原样保留）
     --diff-base   只打印：当前页与回滚副本的整份快照逐键对 fixture（定位差异用，不断言）
   env：MUSETAB_URL 被测页（file://）· ONLY=P0,F3 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const NFP = require('./lib/nfpick');
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
}
async function open(b, url, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(INIT);
  const pg = await ctx.newPage(); pg.setDefaultTimeout(6000);
  pg.on('pageerror', e => pageErrs.push((o.tag || '') + ' ' + e.message));
  await pg.goto(url); await W(o.wait || 1500);
  await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });
  return { ctx, pg };
}
const guard = async (id, fn) => { try { await fn(); } catch (e) { T(id, false, '异常', String(e.stack || e).split('\n').slice(0, 3).join(' | ')); } };
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

    /* ===== F3 零差异（第 0 步口径） ===== */
    if (want('F3') && FX.nx) await guard('F3', async () => {
      const cmp = (a, z) => Object.keys(z || {}).filter(k => (a || {})[k] !== z[k]);
      for (const [q, key] of [['next=0', 'n0'], ['shell=classic', 'classic']]) {
        const c = await NFP.snapShell(b, withQ(URL0, q), ['sc'], { errs: pageErrs, tag: 'F3 ' + q });
        const d = cmp(NFP.hashSc(c.sc), FX[key].sc);
        T('F3', !d.length && Object.keys(FX[key].sc).length === 11, '?' + q + '：11 个用途 .nf-shell（去预览框）与 fixture ' + key + '.sc（' + BASE_COMMIT.slice(0, 7) + '）逐字节相同', '不同：' + d.join(' '));
      }
      const RB = NFP.rollbackUrl(URL0);
      const rb = await NFP.snapShell(b, RB, ['sc', 'spd'], { errs: pageErrs, tag: 'F3 回滚' });
      const d1 = cmp(NFP.hashSc(rb.sc), FX.nx.sc);
      T('F3', !d1.length && NFP.sha(rb.spd) === FX.nx.spd, '回滚副本（NW_P2B＝0）新形态：11 个用途 .nf-shell 与 #spd-nx 与 fixture nx.* 逐字节相同', J({ sc: d1, spd: NFP.sha(rb.spd) === FX.nx.spd }));
      const ks = await NFP.keySeq(b, RB), kz = FX.nx.keys || [];
      const kd = ks.map((x, i) => x === kz[i] ? null : [i, x, kz[i]]).filter(Boolean);
      T('F3', !kd.length && ks.length === kz.length && ks.length >= 20, '回滚副本 Alt+N 后键序列 ' + ks.length + ' 步与 fixture nx.keys 逐步相同', J(kd.slice(0, 3)));
      const src = /^file:\/\//.test(URL0) ? fs.readFileSync(decodeURIComponent(URL0.replace(/^file:\/\//, '').replace(/[?#].*$/, '')), 'utf8') : '';
      T('F3', src.split(NFP.NEEDLE).length - 1 === 1 && (src.split('\n').find(l => l.includes(NFP.NEEDLE)) || '') === NFP.NEEDLE, '源码里「const NW_P2B = 1;」恰一处、独占一行（回滚副本按这串字替换）');
      const cur = await NFP.snapShell(b, URL0, ['sc'], { errs: pageErrs, tag: 'F3 当前' });
      const d2 = cmp(NFP.hashSc(cur.sc), FX.nx.sc);
      /* 第 0 步：界面零变化。A 组 ② 落左栏 ＋ chip 后把这条改成「不同」（规格 §14.1 F3「当前页新形态与 fixture nx.sc 不同（防开关失效）」） */
      T('F3', !d2.length, '第 0 步：当前页新形态 11 个用途 .nf-shell 与 fixture nx.sc 逐字节相同（界面零变化）', '不同：' + d2.join(' '));
    });

    T('E', !pageErrs.length, '页面脚本错误 0', pageErrs.slice(0, 5).join(' | '));
  } finally { await b.close(); }
  console.log('（单跑 ' + Math.round((Date.now() - t0) / 1000) + ' 秒；被测 ' + URL0 + '）');
  console.log('PASS ' + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})();
