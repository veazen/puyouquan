'use strict';
/* v70.6 同谱表叠放（印得对）刻版组：tv_v706eng（规格 docs/spec-2026-11-v705.md §12.1 / §12.6；本文件是第 0 步骨架，刻版规则 0–15 的几何段 G1–G16 由刻版组后续步骤往下加）。
   file:// 直载，真实浏览器（Playwright chromium，CHROMIUM_PATH）。
   S  开关与判据（§12.1、D-6、§16-2；G10 前半）
      S1 源码 ^const VOX_LAYER_DRAW = 1;$ 恰 1 处（回滚副本按这串字替换）
      S2 layerDrawOn() / FLOW.shellNew() 真值表：新外壳 1280（真）· ?shell=classic（假）· ?next=0（假；shellNew 真、flowOn() 真——证明判据没用 flowOn）·
         新外壳 390px 手机（真；flowOn() 假）· 新外壳谱架（真）· 新外壳观看页（真）· 旧外壳 390px（假）· uiShell 置假（v40 经典版，shellNew 假）
      S3 回滚副本（VOX_LAYER_DRAW = 0）：新外壳下 layerDrawOn() 假、shellNew() 仍真、layerDrawOk / layerDrawPair 一律 null
   H  helper（§12.1 生效层对 ∧ !voxDual[宿主]；voxPairRows 给刻版组与录入组共用）
      H1 F07 分层钢琴 [右手, 右手·2, 左手, 左手·2]：新外壳 layerDrawOk＝voxLayerOk＝[0,1,0,1]；layerDrawPair 宿主 / 层两行都给 [宿主, 层]、越界 null；
         voxPairRows(s,'draw') rows [[0,1],[2,3]]、of [0,0,1,1]；缺省＝PQ_KIND.layerRows(s)；'sync' 同 rows
      H2 宿主开了简谱对照（voxDual，D-16 / §16-3）的层对不叠放：只剩左手一对；缺省 / 'sync' 照折（与外壳、voxDual 无关）
      H3 F06 女高 / 女低同谱表带词（声乐层）：叠放按物理谱表——layerDrawOk [0,1,0]（分类视图里声乐层算独立声部，与叠放无关）
      H4 'sync' 与 voxStaffRows 一致：右手宿主与层一起切简谱后 'sync' 仍折、缺省 / 'draw' 那一对不折（只剩左手一对）
      H5 没有 voxLayer 的谱：layerDrawOk / layerDrawPair / voxPairRows 三种判据全 null；helper 不改入参（JSON 前后相同）
      H6 旧外壳与 ?next=0：layerDrawOk / layerDrawPair / voxPairRows 'draw' 一律 null；缺省 / 'sync' 与新外壳逐项相同
   Z  零差异守卫（G10 后半的可常驻部分）：分层谱（F07 / F06 / F21 / F17）离屏谱面——?shell=classic 与 ?next=0 下＝7af5743；回滚副本新外壳下＝7af5743 新外壳。
      （置 1 时新外壳叠放、彼此断行 / 页数相同，#score / 打印切片 / 页数 / SYS_GEO、观看页 / 谱架 / 390px 的逐字节对拍，由刻版组接线时补进本段）
   E  页面脚本错误 0
   修前红：MUSETAB_URL 指 git show 7af5743:muse-tab/index.html 的副本复跑——S1 S2 S3 H1–H6 红（没有常量 / FLOW.shellNew / helper）；Z 的 classic / ?next=0 两条是零差异守卫（基线与自己比，绿），
   Z 的回滚条红（基线没有那串字，回滚副本建不出来）。
   env：MUSETAB_URL 被测页（缺省 ../index.html）· V706_REF 基线页（缺省 git show 7af5743，v70.5 行为）· ONLY=S,H,Z 只跑部分段 */
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { execFileSync } = require('child_process');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const REF_COMMIT = '7af5743';
let pass = 0, total = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name.split(' ')[0]); console.log((ok ? '✅' : '❌') + ' ' + name + (d != null && !ok ? '：' + String(d).slice(0, 1600) : '')); };
const J = x => JSON.stringify(x);
const FXD = path.join(__dirname, 'fixtures', 'v705');
const FX = n => fs.readFileSync(path.join(FXD, n + '.musicxml'), 'utf8');
const fileOf = u => { const m = /^file:\/\/([^?#]*)/.exec(u); return m ? decodeURIComponent(m[1]) : null; };
const NEEDLE = 'const VOX_LAYER_DRAW = 1;';
const refUrl = () => {
  if (process.env.V706_REF) return toUrl(process.env.V706_REF);
  try { const t = path.join(os.tmpdir(), 'v706_ref_' + REF_COMMIT + '.html');
    if (!fs.existsSync(t) || fs.statSync(t).size < 1e5) { const x = t + '.' + process.pid; fs.writeFileSync(x, execFileSync('git', ['-C', path.resolve(__dirname, '..', '..'), 'show', REF_COMMIT + ':muse-tab/index.html'], { maxBuffer: 1 << 28 })); fs.renameSync(x, t); }
    return 'file://' + t; } catch (_) { return null; }
};
/* 回滚副本：被测页「const VOX_LAYER_DRAW = 1;」（恰一处、独占一行）换成 0，写进 os.tmpdir()；那串字不是恰一处就抛错 */
const rollbackUrl = u => {
  const f = fileOf(u); if (!f) throw new Error('回滚副本只认 file:// 地址：' + u);
  const txt = fs.readFileSync(f, 'utf8'), n = txt.split(NEEDLE).length - 1;
  if (n !== 1) throw new Error('「' + NEEDLE + '」应恰一处，实为 ' + n + ' 处');
  const out = txt.replace(NEEDLE, 'const VOX_LAYER_DRAW = 0;');
  const t = path.join(os.tmpdir(), 'v706_rollback_' + crypto.createHash('sha1').update(out).digest('hex').slice(0, 12) + '.html');
  if (!fs.existsSync(t)) { const x = t + '.' + process.pid; fs.writeFileSync(x, out); fs.renameSync(x, t); }
  return 'file://' + t;
};

async function open(b, url, q, w) {
  const ctx = await b.newContext({ viewport: { width: w || 1280, height: w && w < 600 ? 844 : 900 } });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.dismiss().catch(() => {}));
  await pg.goto(withQ(url, q || 'x=1'));
  await pg.waitForFunction(() => typeof importMusicXML === 'function' && typeof loadSong === 'function' && document.readyState === 'complete', null, { timeout: 30000 });
  await pg.evaluate(() => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} try { const t = document.querySelector('#flw-tour'); if (t) t.remove(); } catch (_) {} });
  return { ctx, pg, errs };
}
const EV = (pg, fn, arg) => pg.evaluate(fn, arg).catch(e => ({ err: String(e.message || e).slice(0, 300) }));
/* 页内读开关：shellNew / nxOn / layerDrawOn / flowOn（没有的函数记 '无'） */
const FLAGS = () => { const f = fn => { try { return fn(); } catch (e) { return '无'; } };
  return { pre: document.documentElement.classList.contains('flow-pre'), shellNew: f(() => FLOW.shellNew()), nxOn: f(() => FLOW.nxOn()), on: f(() => layerDrawOn()), flowOn: f(() => flowOn()),
    flwM: document.body.classList.contains('flw-m'), stand: document.body.classList.contains('stand'), viewer: f(() => viewerMode) }; };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const allErrs = [];
  const pages = [];
  const keep = A => { pages.push(A); return A; };
  try {
    /* 取样（新外壳页导入夹具，JSON 深拷贝后各页 migrate 再用） */
    const A = keep(await open(b, URL0, 'x=1'));
    const SONGS = await EV(A.pg, xs => xs.map(x => JSON.parse(JSON.stringify(importMusicXML(x).song))), [FX('F07'), FX('F06'), FX('F21'), FX('F17'), FX('F02')]);
    if (SONGS.err) throw new Error('取样失败：' + SONGS.err);
    const [S07, S06] = SONGS, S02 = SONGS[4];

    /* ================= S：开关与判据 ================= */
    if (want('S')) {
      { const src = fs.readFileSync(fileOf(URL0), 'utf8'), lines = src.split('\n').filter(l => l === NEEDLE);
        T(lines.length === 1 && (src.match(/^const VOX_LAYER_DRAW = 1;$/mg) || []).length === 1 && src.split('VOX_LAYER_DRAW = ').length - 1 === 1,
          'S1 源码 ^const VOX_LAYER_DRAW = 1;$ 恰 1 处、独占一行（G10；回滚副本按这串字替换）', '独占行 ' + lines.length + '，「VOX_LAYER_DRAW = 」' + (src.split('VOX_LAYER_DRAW = ').length - 1) + ' 处'); }
      const got = {};
      got.flow = await EV(A.pg, FLAGS);
      for (const [k, q, w] of [['classic', 'shell=classic'], ['next0', 'next=0'], ['m390', 'x=1', 390], ['classic390', 'shell=classic', 390]]) {
        const P = await open(b, URL0, q, w); got[k] = await EV(P.pg, FLAGS); allErrs.push(...P.errs); await P.ctx.close(); }
      { /* 谱架（新外壳 1280，有谱才进得去） */
        const P = await open(b, URL0, 'x=1');
        got.stand = await EV(P.pg, s => { loadSong(migrate(s)); enterStand(); const f = (fn => { try { return fn(); } catch (e) { return '无'; } });
          return { stand: document.body.classList.contains('stand'), on: f(() => layerDrawOn()), shellNew: f(() => FLOW.shellNew()), flowOn: f(() => flowOn()) }; }, S07);
        allErrs.push(...P.errs); await P.ctx.close(); }
      { /* 观看页（新外壳 1280；本地示例发布 seedCircle → openPubViewer） */
        const P = await open(b, URL0, 'x=1');
        got.viewer = await EV(P.pg, () => { seedCircle(); const p = circlePubs()[0]; openPubViewer(p && p.pid); const f = (fn => { try { return fn(); } catch (e) { return '无'; } });
          return { viewer: viewerMode, on: f(() => layerDrawOn()), shellNew: f(() => FLOW.shellNew()), flowOn: f(() => flowOn()) }; });
        allErrs.push(...P.errs); await P.ctx.close(); }
      got.uiShell0 = await EV(A.pg, () => { const f = (fn => { try { return fn(); } catch (e) { return '无'; } }); const was = uiShell; uiShell = false;
        try { return { shellNew: f(() => FLOW.shellNew()), on: f(() => layerDrawOn()) }; } finally { uiShell = was; } });
      const g = got;
      T(g.flow.pre === true && g.flow.shellNew === true && g.flow.nxOn === true && g.flow.on === true,
        'S2a 新外壳 1280：shellNew 真、nxOn 真 → layerDrawOn 真', J(g.flow));
      T(g.classic.pre === false && g.classic.shellNew === false && g.classic.on === false && g.classic390.shellNew === false && g.classic390.on === false,
        'S2b ?shell=classic（1280 与 390px）：shellNew 假 → layerDrawOn 假（旧外壳回落形态）', J([g.classic, g.classic390]));
      T(g.next0.shellNew === true && g.next0.nxOn === false && g.next0.on === false && g.next0.flowOn === true,
        'S2c ?next=0：shellNew 真、nxOn 假 → layerDrawOn 假；flowOn() 此时为真（判据不用 flowOn，D-6）', J(g.next0));
      T(g.m390.shellNew === true && g.m390.on === true && g.m390.flowOn === false && g.m390.flwM === true,
        'S2d 新外壳 390px 手机（body.flw-m）：layerDrawOn 真；flowOn() 为假（判据不看宽度）', J(g.m390));
      T(!g.stand.err && g.stand.stand === true && g.stand.on === true && g.stand.shellNew === true,
        'S2e 新外壳谱架（body.stand）：layerDrawOn 真（不看谱架）', J(g.stand));
      T(!g.viewer.err && g.viewer.viewer === true && g.viewer.on === true && g.viewer.shellNew === true,
        'S2f 新外壳观看页（viewerMode）：layerDrawOn 真（不看观看页）', J(g.viewer));
      T(!g.uiShell0.err && g.uiShell0.shellNew === false && g.uiShell0.on === false,
        'S2g uiShell 为假（隐藏的 v40 经典版）：shellNew 假 → layerDrawOn 假', J(g.uiShell0));
      { let rb = null, r = null, rbErr = '';
        try { rb = rollbackUrl(URL0); } catch (e) { rbErr = e.message; }
        if (rb) { const P = await open(b, rb, 'x=1');
          r = await EV(P.pg, s => { s = migrate(s); const f = (fn => { try { return fn(); } catch (e) { return '无'; } });
            return { shellNew: f(() => FLOW.shellNew()), nxOn: f(() => FLOW.nxOn()), on: f(() => layerDrawOn()), ok: f(() => layerDrawOk(s)), pair: f(() => [0, 1, 2, 3].map(i => layerDrawPair(s, i))),
              draw: f(() => voxPairRows(s, 'draw')), dflt: f(() => voxPairRows(s)) }; }, S07);
          allErrs.push(...P.errs); await P.ctx.close(); }
        T(!!rb && r && r.shellNew === true && r.nxOn === true && r.on === false && r.ok === null && J(r.pair) === '[null,null,null,null]' && r.draw === null && r.dflt && J(r.dflt.rows) === '[[0,1],[2,3]]',
          'S3 回滚副本（VOX_LAYER_DRAW = 0）新外壳：layerDrawOn 假、layerDrawOk / layerDrawPair / voxPairRows draw 全 null（缺省判据不看开关，照折）', rbErr || J(r)); }
    }

    /* ================= H：helper ================= */
    if (want('H')) {
      const H = (s, dual) => { s = migrate(JSON.parse(JSON.stringify(s))); if (dual) s.voxDual = dual;
        const before = JSON.stringify(s), f = (fn => { try { return fn(); } catch (e) { return '抛 ' + e.message; } });
        const n = (s.voxVoices || []).length, out = { on: f(() => layerDrawOn()), vlo: f(() => PQ_KIND.voxLayerOk(s)), ok: f(() => layerDrawOk(s)),
          pair: f(() => Array.from({ length: n + 2 }, (_, i) => layerDrawPair(s, i - 1))),
          draw: f(() => voxPairRows(s, 'draw')), sync: f(() => voxPairRows(s, 'sync')), dflt: f(() => voxPairRows(s)), lr: f(() => PQ_KIND.layerRows(s)),
          vsr: f(() => Array.from({ length: n }, (_, i) => voxStaffRows(s, i))) };
        out.same = JSON.stringify(s) === before; return out; };
      const run = (pg, args) => EV(pg, ({ src, args }) => { const H = eval('(' + src + ')'); return args.map(a => H(a[0], a[1])); }, { src: H.toString(), args });
      /* 夹具变体：F07；F07 宿主右手开对照（右手 / 右手·2 都 true，§1.4 两行同值）；F07 只宿主开；F06；F07 右手一对切简谱；F02（没有 voxLayer） */
      const S07jp = JSON.parse(JSON.stringify(S07)); S07jp.voxNotations = [null, null, 'bass', 'bass'];
      const ARGS = [[S07], [S07, [true, true, false, false]], [S07, [true, false, false, false]], [S06], [S07jp], [S02]];
      const R = await run(A.pg, ARGS);
      if (R.err) T(false, 'H 运行', R.err);
      else {
        const [a, d2, d1, c6, jp, no] = R;
        T(J(a.vlo) === '[0,1,0,1]' && J(a.ok) === '[0,1,0,1]' && J(a.pair) === J([null, [0, 1], [0, 1], [2, 3], [2, 3], null]) && J(a.draw) === J({ rows: [[0, 1], [2, 3]], of: [0, 0, 1, 1] })
          && J(a.dflt) === J(a.lr) && J(a.dflt.rows) === '[[0,1],[2,3]]' && J(a.sync) === J(a.draw) && a.same,
          'H1 F07 分层钢琴：layerDrawOk＝voxLayerOk＝[0,1,0,1]；layerDrawPair 宿主 / 层都给 [宿主, 层]、越界 null；voxPairRows draw / sync / 缺省（＝PQ_KIND.layerRows）', J(a));
        T(J(d2.ok) === '[0,0,0,1]' && J(d2.pair) === J([null, null, null, [2, 3], [2, 3], null]) && J(d2.draw && d2.draw.rows) === '[[0],[1],[2,3]]' && J(d2.dflt.rows) === '[[0,1],[2,3]]' && J(d2.sync.rows) === '[[0,1],[2,3]]'
          && J(d1.ok) === '[0,0,0,1]' && J(d1.draw && d1.draw.rows) === '[[0],[1],[2,3]]' && d2.same && d1.same,
          'H2 宿主开了简谱对照（voxDual，D-16 / §16-3）的层对不叠放（两行都开、只宿主开都算）；缺省 / sync 照折', J([d2, d1]));
        T(J(c6.vlo) === '[0,1,0]' && J(c6.ok) === '[0,1,0]' && J(c6.draw && c6.draw.rows) === '[[0,1],[2]]' && J(c6.pair) === J([null, [0, 1], [0, 1], null, null]) && c6.same,
          'H3 F06 女高 / 女低同谱表带词：叠放按物理谱表（layerDrawOk [0,1,0]，声乐层只在分类视图里算独立声部）', J(c6));
        T(J(jp.vlo) === '[0,0,0,1]' && J(jp.ok) === '[0,0,0,1]' && J(jp.draw && jp.draw.rows) === '[[0],[1],[2,3]]' && J(jp.dflt && jp.dflt.rows) === '[[0],[1],[2,3]]' && J(jp.sync && jp.sync.rows) === '[[0,1],[2,3]]'
          && J(jp.vsr) === J([[0, 1], [0, 1], [2, 3], [2, 3]]) && J(jp.pair) === J([null, null, null, [2, 3], [2, 3], null]) && jp.same,
          'H4 右手宿主与层一起切简谱：sync 仍折（与 voxStaffRows 一致）；缺省 / draw 只剩左手一对（叠放只作用于五线谱的生效层对）', J(jp));
        T(no.vlo === null && no.ok === null && no.draw === null && no.sync === null && no.dflt === null && no.pair.every(x => x === null) && no.same,
          'H5 没有 voxLayer 的谱（F02）：layerDrawOk / layerDrawPair / voxPairRows 三种判据全 null；helper 不改入参', J(no));
        const oth = {};
        for (const [k, q] of [['classic', 'shell=classic'], ['next0', 'next=0']]) { const P = await open(b, URL0, q); oth[k] = await run(P.pg, ARGS.slice(0, 2)); allErrs.push(...P.errs); await P.ctx.close(); }
        const offOk = x => Array.isArray(x) && x.every((r, i) => r.on === false && r.ok === null && r.draw === null && r.pair.every(p => p === null) && J(r.dflt) === J(R[i].dflt) && J(r.sync) === J(R[i].sync) && r.same);
        T(offOk(oth.classic) && offOk(oth.next0),
          'H6 ?shell=classic 与 ?next=0：layerDrawOk / layerDrawPair / voxPairRows draw 一律 null；缺省 / sync 与新外壳逐项相同（不看外壳）', J(oth));
      }
    }

    /* ================= Z：零差异守卫（G10 可常驻部分） ================= */
    if (want('Z')) {
      const OFF = () => { window.__off = s => { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(svg); let h = null;
        try { renderOffscreen({ song: migrate(JSON.parse(JSON.stringify(s))), target: svg, paperW: 870, crop: true }); h = svg.innerHTML; } finally { svg.remove(); } return h; }; };
      const ru = refUrl(), smp = SONGS.slice(0, 4);
      const cmp = async (ua, ub, q) => { const P = await open(b, ua, q), Q = await open(b, ub, q), bad = [];
        await EV(P.pg, OFF); await EV(Q.pg, OFF);
        for (let i = 0; i < smp.length; i++) { const x = await EV(P.pg, s => __off(s), smp[i]), y = await EV(Q.pg, s => __off(s), smp[i]);
          if (typeof x !== 'string' || x !== y) bad.push(q + ' #' + i + (typeof x === 'string' && typeof y === 'string' ? ' 长度 ' + x.length + '/' + y.length : ' ' + J(x).slice(0, 80) + ' / ' + J(y).slice(0, 80))); }
        allErrs.push(...P.errs, ...Q.errs); await P.ctx.close(); await Q.ctx.close(); return bad; };
      if (!ru) T(false, 'Z 基线页取不到（git show ' + REF_COMMIT + '）');
      else {
        const bad = [...await cmp(URL0, ru, 'shell=classic'), ...await cmp(URL0, ru, 'next=0')];
        T(!bad.length, 'Z1 置 1 时 ?shell=classic 与 ?next=0：分层谱（F07 / F06 / F21 / F17）离屏谱面＝' + REF_COMMIT + '（G10）', bad.join(' | '));
        let rb = null, rbErr = ''; try { rb = rollbackUrl(URL0); } catch (e) { rbErr = e.message; }
        const bad2 = rb ? await cmp(rb, ru, 'x=1') : ['回滚副本：' + rbErr];
        T(!bad2.length, 'Z2 回滚副本（VOX_LAYER_DRAW = 0）新外壳：分层谱离屏谱面＝' + REF_COMMIT + ' 新外壳（G10）', bad2.join(' | '));
      }
    }
  } catch (e) { console.log('❌ 运行异常 ' + (e.stack || e)); total++; fails.push('异常'); }
  for (const P of pages) { allErrs.push(...P.errs); await P.ctx.close(); }
  T(!allErrs.length, 'E 页面脚本错误 0', allErrs.slice(0, 5).join(' | '));
  await b.close();
  console.log('\n' + pass + '/' + total + ' 通过' + (fails.length ? '；失败：' + fails.join(' ') : ''));
  process.exit(fails.length ? 1 : 0);
})();
