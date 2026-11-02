'use strict';
/* v69.8 D 组 · 录入（规格 docs/spec-2026-11-v698.md §3.9，复核 N8 前两项）。file:// 直载，真实浏览器；键盘 / 鼠标用 Playwright 真按键、真点击，
   录入类在新外壳（默认）与 ?shell=classic 各跑一遍，两外壳结果串逐字相同。
   V1 时值沿用：空 4/4 小节「r 5 1 1 5」→ 四个八分（纯简谱行 / 五线谱行；六线谱行「r 3 5 5 3」同）·「r 5 1 e 1」→ 八 八 四 ·「t 1 2 3 4 5」第 5 个仍是十六分
   V2 熟手序列不变：每个音前都按时值键的打法、弱起真实打法（Delete×3 → e / r → 5 1 1 5 5 6 6 5 d，tv_v688 FX1b）、32 小节弱起（pk4 / pk8，tv_v688 FX4c 指纹）、
      tv_v696in I3g「e 3 w . 2」、tv_v688 IN10 已有音的列上按时值键——song 数据与 v69.7（cd08ca0，写死在本文件）逐字节相同
   V3 不沿用的：改已有音的音高不改时值 · 连音组内不改 · 改长吸收不够（会超拍）就按原格落 · 附点不沿用、附点的补足格按原样落（「e 3 . 2」「5 r . 6 3」「r 5 . 6 3 . 1」）·
      弱起首小节 / 不完整小节 / 散拍草稿里不记不用 · 选区批量改时值不记 · 插入 / 组合时值搭出的格按原样落 · 0（休止）不套沿用值 · 一步撤销
   V4 鼠标点音进空格同样沿用（五线谱行：先点选中、再点线 / 间定音高）
   V5 清空：打开（loadSong）/ 新建 / 切页签后清空；撤销 / 重做（换 song 对象）同一窗口照旧沿用
   V6 时值钮：光标在空格上按沿用值亮（#eb-dur [data-dur].on，两外壳同一组）；已有音的格按它自己的时值亮
   V7 Delete 统一：普通小节 / 弱起首小节 / 只剩一格 / 六线谱行四种情形，键盘 Delete、点「删除」#eb-delcol2（先断言可见再点）、命令面板「删除音符」（新外壳）三者 song 相同；
      按钮提示旧外壳原文「已删除音符」、新外壳短句「已删除」；Backspace 照旧留休止
   E  页面脚本错误 0
   修前红：MUSETAB_URL 指向 git show cd08ca0:muse-tab/index.html 复跑 10/32——两外壳各红 V1a / V1c / V1d / V3b / V3d / V3e / V4 / V5 / V6 / V7a / V7b；
   绿的是「不变 / 不沿用」守卫 V1b / V2 / V3a / V3c 与 V·shell、E。
   env：MUSETAB_URL 被测页（缺省 ../index.html）· ONLY=V1,V7 只跑部分段 · V698_DUMP=1 打印 V2 指纹（在 cd08ca0 上取基线用）。 */
const { chromium } = require('playwright');
const path = require('path');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
let pass = 0, total = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name.split(' ')[0]); console.log((ok ? '✅' : '❌') + ' ' + name + (d != null && !ok ? '：' + String(d).slice(0, 900) : '')); };
const J = x => JSON.stringify(x);
const W = ms => new Promise(r => setTimeout(r, ms));

/* v69.7（cd08ca0）基线：V2 各序列全曲数据的指纹（__h(JSON.stringify(song.measures))），在修前文件上用 V698_DUMP=1 取得，写死 */
const REF = {"jpEach":"22ea21d959446e61:1296","stEach":"22ea21d959446e61:1296","tabEach":"b33e9cb430bfca6d:1265","i3g":"5d69decfe1a65d41:926","pkE":"50867e5531ac6ec2:779","pkR":"5a6552e37968e64c:779","in10":"8506afa2563d2862:1076","pk4":"fdde2ead3a7ff58:11593","pk8":"85ef62ed46c8eeb7:11593"};

const HELP = () => {
  window.__h = s => { s = String(s); let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16) + ':' + s.length; };
  /* 新建 4/4 谱：kind＝'vox'（纯简谱歌谱）/ 'staff'（同上、旋律行五线谱）/ 'tab'（纯六线谱）；o.setup 改数据 */
  window.__fresh = (o) => { o = o || {}; const k = o.kind || 'vox';
    const s = createSong(k === 'tab' ? 'solo' : 'vox', Object.assign({ title: '录入', key: 'C', beats: 4, unit: 4, nMea: 3, nVox: k === 'tab' ? 0 : 1, lyr: k === 'vox' ? 1 : 0 }, o.opt || {}));
    if (k === 'staff') s.voxNotations = ['staff'];
    if (typeof o.setup === 'string') o.setup = (new Function('return ' + o.setup))();
    if (o.setup) o.setup(s); window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    try { const t = document.querySelector('#flw-tour'); if (t) t.remove(); } catch (_) {}
    loadSong(s); undoStack.length = 0; redoStack.length = 0;
    sel = { mi: o.mi || 0, row: k === 'tab' ? 'tab' : 'vox', vi: 0, ci: o.ci || 0, si: o.si || 3 }; lastEnt = null; noteSel = []; selRange = null; clampSel(); render();
    try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {} return true; };
  window.__V = (deg, dur, x) => Object.assign({ dur: dur || 4, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, x || {});
  window.__f = c => (c.deg != null ? c.deg : ((c.notes || []).map(n => n.s + '.' + n.f).join('+') || '0')) + '/' + c.dur + (c.dotted === 2 ? '..' : c.dotted ? '.' : '') + (c.tup ? 't' + c.tup : '') + (c.tie ? '~' : '');
  window.__cols = (mi, row) => { const m = song.measures[mi]; if (!m) return null; row = row || sel.row; return row === 'tab' ? m.tabs[sel.vi] : m.voxes[sel.vi]; };
  window.__dump = (n, row) => song.measures.slice(0, n || 1).map((m, mi) => (__cols(mi, row) || []).map(__f).join(' ')).join(' | ').replace(/o-?\d/g, '');
  window.__st = (n, row) => ({ m: __dump(n, row), be: beatErrors().length, sel: sel.mi + ':' + sel.ci, u: undoStack.length });
  window.__hs = () => __h(JSON.stringify(song.measures));
  window.__lit = () => [...document.querySelectorAll('#eb-dur .eb.on[data-dur]')].map(b => +b.dataset.dur).join(',');
  /* 五线谱第 vi 声部 mi 小节 ci 列、绝对音级 step 的屏幕坐标（同 tv_v696in） */
  window.__pt = (mi, vi, ci, step) => { const rect = document.querySelector('[data-row="vox"][data-vi="' + vi + '"][data-mi="' + mi + '"][data-ci="' + ci + '"][data-staffb]');
    if (!rect) return null; rect.scrollIntoView({ block: 'center' });
    const svg = document.getElementById('score'), R = svg.getBoundingClientRect(), k = R.height / svg.viewBox.baseVal.height, bb = rect.getBoundingClientRect();
    const sb = +rect.dataset.staffb, bot = +rect.dataset.sbot || 37;
    const x = bb.x + bb.width / 2, y = R.top + (sb - 3.75 * (step - bot)) * k, h = document.elementFromPoint(x, y);
    return { x, y, hit: !!(h && h.dataset && h.dataset.staffb !== undefined && +h.dataset.mi === mi && +h.dataset.ci === ci) }; };
};

async function open(b, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: o.vp || { width: 1440, height: 900 } });
  const pg = await ctx.newPage();
  await pg.addInitScript(HELP);
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.dismiss().catch(() => {}));
  let u = URL0; if (o.shell === 'classic') u = withQ(u, 'shell=classic');
  await pg.goto(u); await pg.waitForTimeout(1200);
  await pg.evaluate(() => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} try { const t = document.querySelector('#flw-tour'); if (t) t.remove(); } catch (_) {} });
  return { ctx, pg, errs };
}
const EV = (pg, fn, arg) => pg.evaluate(fn, arg).catch(e => ({ err: String(e.message || e).slice(0, 300) }));
/* __fresh 的 setup 是函数：过 evaluate 边界前转成源码串（页内 new Function 还原，函数体里的 __V / tcol 是页内的） */
const pack = o => (o && typeof o.setup === 'function') ? Object.assign({}, o, { setup: o.setup.toString() }) : (o || {});
async function keys(pg, seq) { for (const k of seq.split(' ').filter(Boolean)) { await pg.keyboard.press(k); await pg.waitForTimeout(15); } }
async function clickStep(pg, mi, vi, ci, step) {
  const p = await pg.evaluate(a => __pt(a[0], a[1], a[2], a[3]), [mi, vi, ci, step]);
  if (!p || !p.hit) { console.log('   ⚠ 点不到第 ' + (mi + 1) + ' 小节第 ' + (ci + 1) + ' 格的谱表热区（被遮挡）'); return false; }
  await pg.mouse.click(p.x, p.y); await pg.waitForTimeout(80); return true;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const allErrs = [];
  const res = {};
  try {
    for (const sh of ['flow', 'classic']) {
      const A = await open(b, { shell: sh }); const pg = A.pg, tag = '〔' + (sh === 'flow' ? '新外壳' : '旧外壳') + '〕', R = res[sh] = {};
      const run = async (o, seq, n, row) => { const r0 = await EV(pg, o => __fresh(o), pack(o)); if (r0 !== true) console.log('   ⚠ __fresh ' + J(r0)); await keys(pg, seq); return EV(pg, a => __st(a[0], a[1]), [n || 1, row || null]); };
      /* ================= V1 时值沿用 ================= */
      if (want('V1')) {
        R.v1 = { jp: await run({}, 'r 5 1 1 5'), st: await run({ kind: 'staff' }, 'r 5 1 1 5'), jpE: await run({}, 'r 5 1 e 1'), t16: await run({}, 't 1 2 3 4 5') };
        /* 六线谱行（第 3 弦）：r 后连写 4 个品位（两位品位合并窗 700ms：每个之间停 750ms） */
        await EV(pg, () => __fresh({ kind: 'tab', si: 3 })); await keys(pg, 'r');
        for (const f of ['3', '5', '5', '3']) { await keys(pg, f); await W(750); }
        R.v1.tab = await EV(pg, () => __st(1, 'tab'));
        const v = R.v1;
        T(v.jp.m === '5/8 1/8 1/8 5/8 0/4 0/4' && v.jp.be === 0 && v.jp.sel === '0:4' && v.st.m === v.jp.m && v.st.be === 0,
          'V1a' + tag + ' 空 4/4 小节「r 5 1 1 5」→ 四个八分（纯简谱行 / 五线谱行；后面补成同值空格，小节总时值不变、无节拍错误）', J({ jp: v.jp, st: v.st }));
        T(v.jpE.m === '5/8 1/8 1/4 0/4 0/4' && v.jpE.be === 0, 'V1b' + tag + ' 「r 5 1 e 1」→ 八 八 四（按别的时值键改为止）', J(v.jpE));
        T(v.t16.m === '1/16 2/16 3/16 4/16 5/16 0/16 0/16 0/16 0/4 0/4' && v.t16.be === 0, 'V1c' + tag + ' 「t 1 2 3 4 5」→ 第 5 个仍是十六分（跨拍照样沿用）', J(v.t16));
        T(v.tab.m === '3.3/8 3.5/8 3.5/8 3.3/8 0/4 0/4' && v.tab.be === 0, 'V1d' + tag + ' 六线谱行「r 3 5 5 3」→ 四个八分（setFret 往空列写品位同样沿用）', J(v.tab));
      }
      /* ================= V2 熟手序列不变（与 v69.7 逐字节） ================= */
      if (want('V2')) {
        const H = {};
        const hrun = async (nm, o, seq) => { const r0 = await EV(pg, o => __fresh(o), pack(o)); if (r0 !== true) console.log('   ⚠ __fresh ' + J(r0)); await keys(pg, seq); H[nm] = await EV(pg, () => ({ h: __hs(), m: __dump(2), be: beatErrors().length })); };
        /* 每个音前都按时值键：xxx 一小节（5̲6̲5̲4̲ 3 1）＋附点四分＋八分＋预选附点＋十六分 */
        const each = 'r 5 r 6 r 5 r 4 e 3 e 1 e 5 . r 6 e 3 e 1 r 2 . t 3 e 5 e 6';
        await hrun('jpEach', {}, each);
        await hrun('stEach', { kind: 'staff' }, each);
        await EV(pg, () => __fresh({ kind: 'tab', si: 3 }));
        for (const k of ['r', '3', 'r', '5', 'r', '5', 'r', '3', 'e', '2', 'e', '0']) { await keys(pg, k); if (/\d/.test(k)) await W(750); }
        H.tabEach = await EV(pg, () => ({ h: __hs(), m: __dump(2, 'tab'), be: beatErrors().length }));
        await hrun('i3g', {}, 'e 3 w . 2');
        for (const [nm, k] of [['pkE', 'e'], ['pkR', 'r']]) await hrun(nm, { setup: s => { s.pickup = true; } }, 'Delete Delete Delete ' + k + ' 5 1 1 5 5 6 6 5 d');
        await hrun('in10', {}, '5 6 5 4 ArrowLeft ArrowLeft r ArrowLeft t ArrowRight ArrowRight ArrowRight e');
        const rep = (p, n) => Array(n).fill(p).join(' ');
        for (const [nm, k] of [['pk4', 'e'], ['pk8', 'r']]) await hrun(nm, { opt: { nMea: 33 }, setup: s => { s.pickup = true; } }, 'Delete Delete Delete ' + k + ' 5 ' + rep('1 1 5 5', 32));
        R.v2 = H;
        if (process.env.V698_DUMP) console.log('REF V2 ' + J(Object.fromEntries(Object.entries(H).map(([k, v]) => [k, v.h]))));
        const bad = Object.keys(REF).filter(k => !H[k] || H[k].h !== REF[k]);
        T(!bad.length, 'V2' + tag + ' 熟手序列与 v69.7 逐字节相同：每个音前都按时值键（简谱 / 五线谱 / 六线谱行，含附点四分＋八分、预选附点）· 「e 3 w . 2」· 弱起 Delete×3 → e / r → 5 1 1 5 5 6 6 5 d · 已有音的列上按时值键 · 32 小节弱起 pk4 / pk8',
          bad.map(k => k + J(H[k])).join(' | '));
      }
      /* ================= V3 不沿用的 ================= */
      if (want('V3')) {
        const q = {};
        q.repitch = await run({}, 'r 5 6 ArrowLeft ArrowLeft 3 4');                       /* 改已有音的音高：不动时值 */
        q.tup = await run({ setup: s => { s.measures[0].voxes[0] = [__V(0, 8, { tup: 3 }), __V(0, 8, { tup: 3 }), __V(0, 8, { tup: 3 }), __V(0, 4), __V(0, 2)]; } }, 'ArrowRight ArrowRight ArrowRight t ArrowLeft ArrowLeft ArrowLeft 1 2 3');
        q.over = await run({ opt: { beats: 3 } }, 'w 1 2');                                /* 改长吸收不够：按原格落 */
        q.dotA = await run({}, 'e 3 . 2 1');
        q.dotB = await run({}, '5 r . 6 3 1');
        q.dotC = await run({}, 'r 5 . 6 3 . 1');
        q.pk = await run({ setup: s => { s.pickup = true; } }, 'Delete Delete Delete r 5 1 1 5 5', 2);
        await run({ setup: s => { s.pickup = true; }, mi: 1 }, 'r 5');   /* 正常小节记下的沿用值不带进弱起小节 */
        await EV(pg, () => { sel.mi = 0; sel.ci = 1; render(); }); await keys(pg, '1');
        q.pkIn = await EV(pg, () => __st(2));
        q.irr = await run({ setup: s => { s.measures[0].irr = 1; } }, 'Delete Delete Delete r 5 1 1 5 5', 2);
        q.free = await run({ setup: s => { s.freeMeter = true; } }, 'Delete Delete Delete r 5 1 1 5 5', 2);
        q.range = await EV(pg, () => { __fresh(); selRange = { row: 'vox', vi: 0, m1: 0, c1: 0, m2: 0, c2: 1 }; setDur(8); selRange = null; sel.ci = 2; render(); inputDigit(5); inputDigit(6); return __st(1); });
        q.ins = await run({}, 'r Shift+Insert 5 6 3 1');                                   /* 插入搭出的格按原样落，之后按格落（v68.7 老打法照旧） */
        q.combo = await EV(pg, () => { __fresh(); setDur(4); applyDurCombo(DUR_COMBOS.find(c => J0(c.durs) === '[[16],[16],[16],[16]]') || DUR_COMBOS[1]); inputDigit(1); inputDigit(2); inputDigit(3); inputDigit(4); inputDigit(5); return __st(1); function J0(x) { return JSON.stringify(x); } });
        q.rest = await run({}, 'r 5 6 0 1');                                               /* 0（休止）不套沿用值，只走过这一格 */
        q.undo = await EV(pg, () => { __fresh(); const j0 = JSON.stringify(song.measures); setDur(8); inputDigit(5); inputDigit(6); inputDigit(3); const a = __dump(1), u = undoStack.length; undo(); render(); const b1 = __dump(1); undo(); undo(); undo(); render();
          return { a, b1, u, back: JSON.stringify(song.measures) === j0 }; });
        R.v3 = q;
        T(q.repitch.m === '3/8 4/8 0/4 0/4 0/4' && q.tup.m === '1/8t3 2/8t3 3/8t3 0/16 0/16 0/16 0/16 0/2' && q.over.m === '1/2 2/4' && q.over.be === 0,
          'V3a' + tag + ' 改已有音的音高不改时值（「r 5 6 ← ← 3 4」→ 3/8 4/8）· 连音组内不改（三连音格照落八分三连）· 3/4「w 1 2」改长吸收不够 → 2 按原四分格落、不超拍', J({ r: q.repitch.m, t: q.tup.m, o: q.over }));
        T(q.dotA.m === '3/4. 2/8 1/4 0/4' && q.dotB.m === '5/4 6/8. 3/16 1/8 0/8 0/4' && q.dotC.m === '5/8. 6/16 3/8. 1/16 0/4 0/4' && [q.dotA, q.dotB, q.dotC].every(x => x.be === 0),
          'V3b' + tag + ' 附点不沿用、补足格按原样落：「e 3 . 2 1」→ 3/4. 2/8 1/4 ·「5 r . 6 3 1」→ 5/4 6/8. 3/16 1/8（预选附点仍作用于当前格）·「r 5 . 6 3 . 1」→ 5/8. 6/16 3/8. 1/16', J({ a: q.dotA.m, b: q.dotB.m, c: q.dotC.m }));
        T(q.pk.m === '5/8 | 1/4 1/4 5/4 5/4' && q.irr.m === q.pk.m && q.free.m.split(' | ')[1] === '1/4 1/4 5/4 5/4' && q.pkIn.m === '0/4 1/4 0/4 0/4 | 5/8 0/8 0/4 0/4 0/4' && q.pk.be === 0,
          'V3c' + tag + ' 弱起首小节 / 不完整小节 / 散拍草稿里的时值键不记（之后整小节照四分落）；正常小节记下的沿用值不带进弱起小节', J({ pk: q.pk.m, irr: q.irr.m, free: q.free.m, pkIn: q.pkIn.m }));
        T(q.range.m === '0/8 0/8 5/4 6/4' && q.ins.m === '5/8 6/8 3/4 1/4 0/4' && q.ins.be === 0 && /^1\/16 2\/16 3\/16 4\/16 5\/4/.test(q.combo.m) && q.rest.m === '5/8 6/8 0/4 1/8 0/8 0/4',
          'V3d' + tag + ' 选区批量改时值不记 · 插入搭出的格按原样落、之后按格落（「r Shift+Insert 5 6 3 1」→ 5/8 6/8 3/4 1/4，v68.7 老打法）· 组合时值搭出的格按原样落、之后按格落 · 0（休止）不套沿用值', J({ range: q.range.m, ins: q.ins.m, combo: q.combo.m, rest: q.rest.m }));
        T(q.undo.a === '5/8 6/8 3/8 0/8 0/4 0/4' && q.undo.b1 === '5/8 6/8 0/4 0/4 0/4' && q.undo.back, 'V3e' + tag + ' 沿用改格与落音同一步撤销（撤一次回到落 3 之前；全撤回到原 JSON）', J(q.undo));
      }
      /* ================= V4 鼠标点音进空格 ================= */
      if (want('V4')) {
        await EV(pg, () => __fresh({ kind: 'staff' })); await keys(pg, 'r 5 6');
        const ok = await clickStep(pg, 0, 0, 2, 37) && (await W(520), await clickStep(pg, 0, 0, 2, 37));
        R.v4 = Object.assign({ ok }, await EV(pg, () => __st(1)));
        T(ok && R.v4.m === '5/8 6/8 3/8 0/8 0/4 0/4' && R.v4.be === 0, 'V4' + tag + ' 五线谱行「r 5 6」后鼠标点第 3 格（四分空格）的线 / 间定音高 → 八分（同样沿用）', J(R.v4));
      }
      /* ================= V5 清空 / 撤销照旧 ================= */
      if (want('V5')) {
        const v = {};
        v.load = await EV(pg, () => { __fresh(); setDur(8); __fresh(); inputDigit(5); return __dump(1); });
        v.newDoc = await EV(pg, () => { __fresh(); setDur(8); const i0 = curDocI; addDoc(createSong('vox', { title: '新', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 1 })); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); inputDigit(5);
          const a = __dump(1); switchDocTo(i0); sel = { mi: 0, row: 'vox', vi: 0, ci: 2, si: 1 }; render(); inputDigit(3); return { a, b: __dump(1), n: docs.length }; });
        v.redo = await EV(pg, () => { __fresh(); setDur(8); inputDigit(5); undo(); redo(); sel.ci = 1; render(); inputDigit(6); inputDigit(3); return __dump(1); });
        R.v5 = v;
        T(v.load === '5/4 0/4 0/4 0/4' && v.newDoc.a === '5/4 0/4 0/4 0/4' && v.newDoc.b === '0/8 0/8 3/4 0/4 0/4' && v.redo === '5/8 6/8 3/8 0/8 0/4 0/4',
          'V5' + tag + ' 打开 / 新建 / 切页签后清空（新谱、切回原谱都按原格落）；撤销 / 重做后同一窗口照旧沿用', J(v));
      }
      /* ================= V6 时值钮按沿用值亮 ================= */
      if (want('V6')) {
        const v = await EV(pg, () => { __fresh(); const L = []; inputDigit(5); setDur(8); inputDigit(6); L.push(__lit()); inputDigit(7); L.push(__lit());
          sel.ci = 0; render(); L.push(__lit()); sel.ci = 3; render(); L.push(__lit()); setDur(16); L.push(__lit()); __fresh(); L.push(__lit()); return L; });
        R.v6 = v;
        T(v.join('|') === '8|8|4|8|16|4', 'V6' + tag + ' 时值钮（#eb-dur）：「5 r 6 7」后光标在四分空格上亮八分（下一个音是八分）· 光标回到已有音（四分）亮四分 · 按 t 后亮十六分 · 新谱亮四分', J(v));
      }
      /* ================= V7 Delete 统一 ================= */
      if (want('V7')) {
        const cases = {
          norm: { o: { setup: s => { s.measures[0].voxes[0] = [__V(5), __V(6, 8), __V(5, 8), __V(3), __V(1)]; } }, ci: 1 },
          pk: { o: { setup: s => { s.pickup = true; s.beats = 3; s.measures.forEach(m => { m.voxes[0] = [__V(5), __V(0), __V(0)]; }); } }, ci: 1 },
          one: { o: { setup: s => { s.measures[0].voxes[0] = [__V(5, 1)]; } }, ci: 0 },
          tab: { o: { kind: 'tab', si: 3, setup: s => { const c = s.measures[0].tabs[0]; c[0].notes = [{ s: 3, f: 5 }]; c[1].notes = [{ s: 3, f: 7 }]; c[1].dur = 8; c.splice(2, 0, Object.assign(tcol(), { dur: 8, notes: [{ s: 2, f: 3 }] })); } }, ci: 1 } };
        const out = {};
        for (const [nm, c] of Object.entries(cases)) {
          const one = async (how) => {
            await EV(pg, a => { __fresh(a.o); sel.ci = a.ci; clampSel(); render(); }, { o: pack(c.o), ci: c.ci });
            await EV(pg, () => { const t = document.getElementById('toast'); if (t) t.textContent = ''; });
            if (how === 'key') await keys(pg, 'Delete');
            else if (how === 'btn') {
              const vis = await EV(pg, () => { let b = document.getElementById('eb-delcol2'); if (!b) return null; const r = b.getBoundingClientRect(), cs = getComputedStyle(b);
                const h = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                return (r.width && r.height && cs.visibility !== 'hidden' && h && (h === b || b.contains(h))) ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; });
              if (!vis) return { vis: false };
              await pg.mouse.click(vis.x, vis.y); await W(60);
            } else await EV(pg, () => FLOW.cmd.run('r2:del'));
            return Object.assign(await EV(pg, () => ({ h: __hs(), m: __dump(1), be: beatErrors().length, toast: ((document.getElementById('toast') || {}).textContent || '').replace(/撤销$/, '') })), { vis: true });
          };
          out[nm] = { key: await one('key'), btn: await one('btn') };
          if (sh === 'flow') out[nm].cmd = await one('cmd');
        }
        const bs = await run({ setup: s => { s.measures[0].voxes[0] = [__V(5), __V(6, 8), __V(5, 8), __V(3), __V(1)]; }, ci: 1 }, 'Backspace');
        R.v7 = { out, bs: bs.m };
        const same = Object.values(out).every(o => o.btn.vis && o.btn.h === o.key.h && (!o.cmd || o.cmd.h === o.key.h));
        T(same && out.norm.key.m === '5/4 5/4 3/4 1/4' && out.norm.key.be === 0 && out.pk.key.m === '5/4 0/4' && out.one.key.m === '0/4 0/4 0/4 0/4' && out.tab.key.m === '3.5/4 2.3/4 0/4 0/4' && out.tab.key.be === 0,
          'V7a' + tag + ' 普通小节 / 弱起首小节 / 只剩一格 / 六线谱行：键盘 Delete、点「删除」（#eb-delcol2 可见）' + (sh === 'flow' ? '、命令面板「删除音符」' : '') + ' 结果相同（删格并进相邻音 · 弱起直接删 · 只剩一格改成休止）',
          J(Object.fromEntries(Object.entries(out).map(([k, o]) => [k, { key: o.key.m, btn: o.btn.vis ? o.btn.m : '不可见', cmd: o.cmd && o.cmd.m }]))));
        const tw = sh === 'flow' ? '已删除' : '已删除音符';
        T(out.norm.btn.toast === tw && out.one.btn.toast === tw && bs.m === '5/4 0/8 5/8 3/4 1/4', 'V7b' + tag + ' 按钮提示「' + tw + '」（' + (sh === 'flow' ? '新外壳短句' : '旧外壳原文') + '）；Backspace 照旧清成休止、时值不动',
          J({ t: out.norm.btn.toast, t1: out.one.btn.toast, bs: bs.m }));
      }
      allErrs.push(...A.errs.map(x => sh + ': ' + x));
      await A.ctx.close();
    }
    /* 两外壳结果串逐字相同（V7 的提示条文案按外壳不同，不比） */
    if (res.flow && res.classic) {
      const strip = r => { const o = JSON.parse(J(r)); if (o.v7) { Object.values(o.v7.out).forEach(x => { delete x.cmd; delete x.key.toast; delete x.btn.toast; }); } return o; };
      const f = strip(res.flow), c = strip(res.classic), dif = Object.keys(f).filter(k => J(f[k]) !== J(c[k]));
      T(!dif.length, 'V·shell 两套外壳的录入结果串（V1–V7）逐字相同', dif.join(',') || 'ok');
    }
  } catch (e) { console.log('❌ 运行异常 ' + (e && e.stack || e)); fails.push('EXC'); total++; }
  T(!allErrs.length, 'E 页面脚本错误 0', allErrs.slice(0, 5).join(' / '));
  await b.close();
  console.log('\nPASS ' + pass + '/' + total + (fails.length ? '  失败：' + fails.join(' ') : ''));
  console.log(allErrs.length ? 'ERRORS' : 'NO ERRORS');
  process.exit(fails.length ? 1 : 0);
})();
