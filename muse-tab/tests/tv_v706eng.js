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
   Z  零差异守卫（G10 后半的可常驻部分）：分层谱（F07 / F06 / F21 / F17）离屏谱面——?shell=classic 与 ?next=0 下＝7af5743；回滚副本新外壳下＝7af5743 新外壳；
      Z3（G11）没有 voxLayer 的谱（F02 / 4 份预设）新外壳离屏谱面＝7af5743；Z4（G12 后半）简谱行的层（不生效、hid 照画 0）＝7af5743；Z5（G16）宿主开了简谱对照的层对＝7af5743
   G  刻版几何（规格 §12.2 规则 0–15，§12.6 口径：线距 SG＝7.5px，谱位 p＝(中线 y − 字形原点 y0)/(SG/2)；新外壳离屏排版 paperW 870、__pyqGeom 标记取元素）
      G1  符干：两声部小节宿主朝上、层朝下（F04 m2–m3、FX.heads）；对方整小节 hid 的小节（F04 m1 / m4）宿主符干方向＝v70.5 同列
      G2a 休止 p 为整数；层 p≤−4、宿主 p≥+4；与对方符头框净距 ≥1.875px（FX.rests m0 / m1）
      G2b 同时值同起拍的可见休止合并（m2 只剩宿主一个、居中）；hid 不画；对方同时段 hid 时居中（m5，p＝v70.5）
      G2c 偏到谱表外的全 / 二分休止（m3 宿主整小节、m4 层二分）带 data-g=ledger，加线与休止 |Δy|<0.5
      G3a 二度 / 交叉 ≤7 谱位：两符头中心 Δx＝DX±0.3、声部 1 在右；三度 / 交叉 >7 谱位 |Δx|≤0.5
      G3b 同形同附点同度共用一个符头（四分对八分：只有宿主的符头，层的符干照画）；二分对四分、附点对不附点不共用（Δx＝两符头半宽和 −0.25 ±0.3）
      G3c 增一度错开、两个变音记号都在、♯ 在外侧
      G4  声部 2 线上音的附点 cy−符头 cy＝+3.75±0.5；有错开时两声部附点 x 对齐（|Δ|<0.5）在最右符头右侧
      G5  弧向：宿主连音线弧向上、层向下；连音数字在符干端外侧（宿主在符杠上方、层在符杠下方）
      G6  临时记号按谱表进位：宿主 ♯F 后同小节层 F 印 ♮；层先 ♯F、宿主后 ♯F 不重标（方案验收原文；Gould 提示 ♯ 由审核② 核定）
      G7  合唱：层词排在宿主各段之后（单段第 2 行、两段第 3 行；同词只印一行）；声部名合并「女高 / 女低」
      G12 叠放的五线谱行上 hid 列没有 rest 元素（FX.rests m2、F04 层的整小节 hid）
      G13 竖向：层与宿主同 y（谱表底线相同）；宿主加线区覆盖层的最低音（层有低音时两张谱表的间距变大、层符干端不进下一张谱表）
      G14 括线：分层钢琴 [RH, RH·2, LH, LH·2] 只有 1 个花括号、跨 2 张物理谱表；闭合二部合唱 [S, A(层)] 不画方括号
      G15 力度：宿主力度在谱表下方、与 v70.5 同列同 y（相对谱表底线）；两声部同起拍力度不同时宿主的在谱表上方、层的在下方；相同只印一个
   C  碰撞普查（G8）：56 份标准样本＋分层夹具（FX＋v705 导入的分层夹具），跨声部类别 C21–C25 0 处；分层夹具其余 B 组类别 0 处；标准样本 C17 只降不升（≤218）
   B  回滚与基线（G10）：tests/fixtures/v706_v705_base.json（提交进仓库的 v70.5 存档，git show 7af5743 页面生成：node tv_v706eng.js --write-base）——
      B1 回滚副本（VOX_LAYER_DRAW = 0）在新外壳 / ?shell=classic / ?next=0 / 观看页 / 谱架 / 390px 六种环境下 #score、离屏 SVG、打印切片、页数、SYS_GEO 与存档逐字节相同
      B2 置 1：?shell=classic 与 ?next=0 同存档；B3 新外壳 / 观看页 / 谱架 / 390px 四处都叠放（谱线少于存档），新外壳 / 观看页 / 谱架页数与系统数相同、四处打印页数相同
      B4 0 / 1 两种取值下 JSON、MusicXML、MIDI 字节相同，排版不改 song
   E  页面脚本错误 0
   修前红：MUSETAB_URL 指 git show 7af5743:muse-tab/index.html 的副本复跑——S1 S2 S3 H1–H6 红（没有常量 / FLOW.shellNew / helper）；Z 的 classic / ?next=0 / Z3–Z5 是零差异守卫（基线与自己比，绿），
   Z 的回滚条红（基线没有那串字，回滚副本建不出来）；G 段几何断言在基线上红（层按独立谱表画）；C 段跨声部类别在基线上没有 data-gst（0 处，守卫）；B1 红（回滚副本建不出来）、B3 红（不叠放）。
   env：MUSETAB_URL 被测页（缺省 ../index.html）· V706_REF 基线页（缺省 git show 7af5743，v70.5 行为）· ONLY=S,H,Z,G,C,B 只跑部分段 · --write-base 用基线页重写存档 */
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
const EFX = require('./fixtures/v706/eng_fx.js').FX;   /* v70.6 刻版夹具（构造的 song JSON） */
const BASE_PATH = path.join(__dirname, 'fixtures', 'v706_v705_base.json');
const H1 = s => crypto.createHash('sha1').update(String(s)).digest('hex');
const SG = 7.5;
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

/* 页内：离屏排一份（__pyqGeom 标记开），取每个带 data-g 的叶子元素的几何（谱面坐标）：
   {g 类别, vi, mi, ci, gst, box[x0,y0,x1,y1], tr 字形原点, ln 线端点, c 圆心, t/x/y 文字, d 路径}；sb['vi:mi']＝列热区的 data-staffb（谱表底线） */
const GEO_DEF = () => { window.__geo = s => {
  const NS = 'http://www.w3.org/2000/svg', host = document.createElement('div'); host.style.cssText = 'position:absolute;left:-30000px;top:0;width:4000px';
  const svg = document.createElementNS(NS, 'svg'); host.appendChild(svg); document.body.appendChild(host);
  window.__pyqGeom = true; let r = null;
  try { r = renderOffscreen({ song: migrate(JSON.parse(JSON.stringify(s))), target: svg, paperW: 870, crop: true }); } finally { window.__pyqGeom = false; }
  const vb = svg.viewBox.baseVal; svg.setAttribute('width', vb.width); svg.setAttribute('height', vb.height);
  const inv = svg.getScreenCTM().inverse(), items = [];
  svg.querySelectorAll('[data-g]').forEach(el => { const tg = el.tagName.toLowerCase(); if (tg === 'g' || tg === 'title') return;
    const b = el.getBBox(), M = inv.multiply(el.getScreenCTM());
    const P = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(M));
    const [vi, mi, ci] = (el.getAttribute('data-gq') || '').split(':').map(Number);
    const o = { g: el.getAttribute('data-g'), vi, mi, ci, gst: el.getAttribute('data-gst') || '', tag: tg,
      box: [Math.min(...P.map(p => p.x)), Math.min(...P.map(p => p.y)), Math.max(...P.map(p => p.x)), Math.max(...P.map(p => p.y))] };
    const tr = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\)/.exec(el.getAttribute('transform') || ''); if (tr) o.tr = [+tr[1], +tr[2]];
    if (tg === 'line') o.ln = ['x1', 'y1', 'x2', 'y2'].map(k => +el.getAttribute(k));
    if (tg === 'circle') o.c = [+el.getAttribute('cx'), +el.getAttribute('cy')];
    if (tg === 'text') { o.t = el.textContent; o.x = +el.getAttribute('x'); o.y = +el.getAttribute('y'); }
    if (tg === 'path') o.d = el.getAttribute('d') || '';
    items.push(o); });
  const sb = {}; svg.querySelectorAll('rect[data-row="vox"][data-staffb]').forEach(q => { const k = q.getAttribute('data-vi') + ':' + q.getAttribute('data-mi'); if (sb[k] == null) sb[k] = +q.getAttribute('data-staffb'); });
  const out = { items, sb, braces: svg.querySelectorAll('[data-g="brace"]').length, brackets: svg.querySelectorAll('[data-grp="bracket"]').length,
    rown: [...svg.querySelectorAll('[data-rown]')].map(e => e.textContent), nat: SMUFL.accidentalNatural.d, sharp: SMUFL.accidentalSharp.d,
    hw: { black: smw('noteheadBlack') * 7.5, half: smw('noteheadHalf') * 7.5, whole: smw('noteheadWhole') * 7.5 }, h: vb.height };
  host.remove(); return out; }; };
/* 页内：六种环境的成品（#score、页数、SYS_GEO、打印切片、离屏 SVG）；mode＝'viewer' 观看页 / 'stand' 谱架 / 缺省编辑器。只用 v70.5 也有的函数（基线页同一套） */
const ENV_REC = ([s, mode]) => {
  const S = migrate(JSON.parse(JSON.stringify(s)));
  if (mode === 'viewer') { try { seedCircle(); } catch (_) {} const L = circlePubs().filter(x => x.pid !== 't706');
    L.unshift({ pid: 't706', libId: null, title: S.title, author: 't', type: 'vox', price: 0, preview: 0, pubAt: '2026-11-08', sales: 0, tips: 0, views: 0, status: 'approved', data: S }); circlePubsSave(L); openPubViewer('t706'); }
  else { loadSong(S); if (mode === 'stand') enterStand(); }
  render();
  const sc = document.getElementById('score'), score = sc.innerHTML, pages = PV_GEO.n, geo = JSON.stringify(SYS_GEO);
  const lines = (score.match(/stroke-width="0\.8"\/?>/g) || []).length;
  let print = '', pp = 0;
  PRINT_PAGING = true;
  try { render(); buildPrintPages(); const P = document.getElementById('print-pages'); print = P ? P.innerHTML : ''; pp = P ? P.querySelectorAll('.pp').length : 0; removePrintPages(); }
  finally { PRINT_PAGING = false; render(); }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(svg); let off = '';
  try { renderOffscreen({ song: S, target: svg, paperW: 870, crop: true }); off = svg.innerHTML; } finally { svg.remove(); }
  try { if (mode === 'stand') exitStand(); if (mode === 'viewer') exitViewer(); } catch (_) {}
  return { score, pages, geo, nsys: SYS_GEO.length, print, pp, off, lines };
};
const ENVS = [['flow', 'x=1', 1280], ['classic', 'shell=classic', 1280], ['next0', 'next=0', 1280], ['viewer', 'x=1', 1280, 'viewer'], ['stand', 'x=1', 1280, 'stand'], ['m390', 'x=1', 390]];
const envRun = async (b, url, env, songs, errs) => {
  const [name, q, w, mode] = env, P = await open(b, url, q, w), out = {};
  for (const [k, s] of songs) { const r = await EV(P.pg, ENV_REC, [s, mode]);
    out[k] = r.err ? { err: r.err } : { score: H1(r.score), pages: r.pages, geo: H1(r.geo), nsys: r.nsys, print: H1(r.print), pp: r.pp, off: H1(r.off), lines: r.lines }; }
  errs.push(...P.errs); await P.ctx.close(); return out;
};
/* G10 存档的样本：v705 导入的分层钢琴 / 合唱 ＋ 构造的符头 / 力度夹具；一律固定版宽（断行与窗口无关，四处可比） */
const BASE_SONGS = async pg => { const im = await EV(pg, xs => xs.map(x => JSON.parse(JSON.stringify(importMusicXML(x).song))), [FX('F07'), FX('F06')]);
  if (im.err) throw new Error('存档取样失败：' + im.err);
  return [['F07', im[0]], ['F06', im[1]], ['heads', EFX.heads], ['dyn', EFX.dyn]].map(([k, s]) => [k, Object.assign(JSON.parse(JSON.stringify(s)), { layout: Object.assign({}, s.layout || {}, { fixed: true }) })]); };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  if (process.argv.includes('--write-base')) {   /* 用基线页（v70.5）重写 G10 存档 */
    const ru = refUrl(); if (!ru) { console.log('❌ 基线页取不到'); process.exit(1); }
    const P = await open(b, ru, 'x=1'), songs = await BASE_SONGS(P.pg); await P.ctx.close();
    const errs = [], env = {};
    for (const E of ENVS) env[E[0]] = await envRun(b, ru, E, songs, errs);
    fs.writeFileSync(BASE_PATH, JSON.stringify({ ref: REF_COMMIT, note: 'v70.6 G10 存档：git show ' + REF_COMMIT + ':muse-tab/index.html 页面在六种环境下的成品摘要（sha1）；node tests/tv_v706eng.js --write-base 生成', songs: Object.fromEntries(songs), env }, null, 1) + '\n');
    console.log('→ ' + BASE_PATH + (errs.length ? '（页面错误 ' + errs.slice(0, 3).join(' | ') + '）' : ''));
    await b.close(); process.exit(errs.length ? 1 : 0);
  }
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
        /* Z3–Z5：新外壳、置 1，下面这些谱不叠放——离屏谱面＝v70.5 */
        const cmpS = async (list, q) => { const P = await open(b, URL0, q), Q = await open(b, ru, q), bad = [];
          await EV(P.pg, OFF); await EV(Q.pg, OFF);
          for (const [k, s] of list) { const x = await EV(P.pg, s => __off(s), s), y = await EV(Q.pg, s => __off(s), s);
            if (typeof x !== 'string' || x !== y) bad.push(k + (typeof x === 'string' && typeof y === 'string' ? ' 长度 ' + x.length + '/' + y.length : ' ' + J(x).slice(0, 80))); }
          allErrs.push(...P.errs, ...Q.errs); await P.ctx.close(); await Q.ctx.close(); return bad; };
        const PRE = await EV(A.pg, () => [0, 3, 7, 12].map(i => PRESETS[i] && JSON.parse(JSON.stringify(PRESETS[i].make()))).filter(Boolean));
        const bad3 = await cmpS([['F02', S02]].concat((Array.isArray(PRE) ? PRE : []).map((s, i) => ['预设' + i, s])), 'x=1');
        T(!bad3.length && Array.isArray(PRE) && PRE.length === 4, 'Z3 新外壳：没有 voxLayer 的谱（F02 / 4 份预设）离屏谱面＝' + REF_COMMIT + '（G11）', bad3.join(' | ') || J(PRE).slice(0, 120));
        const bad4 = await cmpS([['jpLay', EFX.jpLay]], 'x=1');
        T(!bad4.length, 'Z4 新外壳：简谱行的层（voxLayerOk 不生效）hid 照画 0，离屏谱面＝' + REF_COMMIT + '（G12 后半，D-16）', bad4.join(' | '));
        const bad5 = await cmpS([['dual', EFX.dual]], 'x=1');
        T(!bad5.length, 'Z5 新外壳：宿主开了简谱对照的层对不叠放，离屏谱面＝' + REF_COMMIT + '（G16，§16-3）', bad5.join(' | '));
      }
    }

    /* ================= G：刻版几何（§12.6 口径） ================= */
    if (want('G')) {
      const P = keep(await open(b, URL0, 'x=1')); await EV(P.pg, GEO_DEF);
      const ru = refUrl(); let Q = null; if (ru) { Q = keep(await open(b, ru, 'x=1')); await EV(Q.pg, GEO_DEF); }
      const geo = async (pg, s) => { const r = await EV(pg, s => __geo(s), s); if (!r || r.err) throw new Error('排版失败：' + (r && r.err)); return r; };
      const cx = o => (o.box[0] + o.box[2]) / 2, cy = o => (o.box[1] + o.box[3]) / 2, near = (a, c, t) => Math.abs(a - c) <= t;
      const of = (G, g, vi, mi, ci) => G.items.filter(o => o.g === g && o.vi === vi && o.mi === mi && (ci === undefined || o.ci === ci));
      const stems = (G, vi, mi) => of(G, 'stem', vi, mi).filter(o => o.ln).map(o => ({ ci: o.ci, up: o.ln[3] < o.ln[1] }));
      const F04 = await EV(A.pg, x => JSON.parse(JSON.stringify(importMusicXML(x).song)), FX('F04'));
      /* G1 */
      { const g = await geo(P.pg, F04), r = Q ? await geo(Q.pg, F04) : null, Hd = await geo(P.pg, EFX.heads);
        const two = [1, 2].every(mi => stems(g, 0, mi).length && stems(g, 0, mi).every(x => x.up) && stems(g, 1, mi).length && stems(g, 1, mi).every(x => !x.up));
        const twoH = [0, 1, 2, 3].every(mi => stems(Hd, 0, mi).every(x => x.up) && stems(Hd, 1, mi).every(x => !x.up)) && stems(Hd, 1, 1).length > 0;
        const one = !!r && stems(g, 0, 0).length > 0 && [0, 3].every(mi => J(stems(g, 0, mi)) === J(stems(r, 0, mi)));   /* m4 是全音符（没有符干），两边都空 */
        T(two && twoH && one, 'G1 符干：两声部小节宿主朝上、层朝下（F04 m2–m3、FX.heads 全部小节）；对方整小节 hid 的小节（F04 m1 / m4）宿主符干方向＝v70.5 同列',
          J({ two: [1, 2].map(mi => [stems(g, 0, mi), stems(g, 1, mi)]), one: [0, 3].map(mi => [stems(g, 0, mi), r && stems(r, 0, mi)]) })); }
      /* G2 休止 + G12 */
      { const R = await geo(P.pg, EFX.rests), Rr = Q ? await geo(Q.pg, EFX.rests) : null;
        const rests = (G, vi, mi) => of(G, 'rest', vi, mi).filter(o => o.tr);
        const pOf = (G, o) => (((G.sb['0:' + o.mi]) - 2 * SG) - o.tr[1]) / (SG / 2);
        const clr = (G, o, ov) => { const hs = of(G, 'head', ov, o.mi).filter(h => h.box[0] < o.box[2] + 4 && h.box[2] > o.box[0] - 4);
          return hs.length ? Math.min(...hs.map(h => Math.max(h.box[1] - o.box[3], o.box[1] - h.box[3]))) : Infinity; };
        const isInt = p => Math.abs(p - Math.round(p)) < 0.02;
        const m0 = rests(R, 1, 0), m1 = rests(R, 0, 1);
        const a = m0.length === 2 && m0.every(o => isInt(pOf(R, o)) && pOf(R, o) <= -4 && clr(R, o, 0) >= 1.875) && m1.length === 2 && m1.every(o => isInt(pOf(R, o)) && pOf(R, o) >= 4 && clr(R, o, 1) >= 1.875);
        T(a, 'G2a 休止：p 为整数；层 p≤−4、宿主 p≥+4；与对方符头框净距 ≥1.875px（FX.rests m0 / m1）', J({ m0: m0.map(o => [o.ci, +pOf(R, o).toFixed(2), +clr(R, o, 0).toFixed(2)]), m1: m1.map(o => [o.ci, +pOf(R, o).toFixed(2), +clr(R, o, 1).toFixed(2)]) }));
        const m2h = rests(R, 0, 2), m2l = rests(R, 1, 2), m5 = rests(R, 0, 5);
        const refP = (mi, ci) => { const o = Rr && rests(Rr, 0, mi).find(x => x.ci === ci); return o ? pOf(Rr, o) : NaN; };
        const bOk = m2l.length === 0 && m2h.length === 1 && m2h[0].ci === 1 && near(pOf(R, m2h[0]), refP(2, 1), 0.02) && m5.length === 1 && near(pOf(R, m5[0]), refP(5, 0), 0.02);
        T(bOk, 'G2b 同时值同起拍的可见休止合并（m2 只剩宿主一个、p＝v70.5）；hid 不画；对方同时段 hid 时居中（m5，p＝v70.5）',
          J({ m2h: m2h.map(o => [o.ci, +pOf(R, o).toFixed(2)]), m2l: m2l.map(o => o.ci), ref2: refP(2, 1), m5: m5.map(o => +pOf(R, o).toFixed(2)), ref5: refP(5, 0) }));
        const w3 = rests(R, 0, 3).find(o => o.ci === -1), l3 = of(R, 'ledger', 0, 3, -1).filter(o => o.ln), h4 = rests(R, 1, 4).find(o => o.ci === 0), l4 = of(R, 'ledger', 1, 4, 0).filter(o => o.ln);
        const cOk = !!w3 && pOf(R, w3) >= 6 && isInt(pOf(R, w3)) && l3.some(o => Math.abs(o.ln[1] - w3.tr[1]) < 0.5) && !!h4 && pOf(R, h4) <= -6 && isInt(pOf(R, h4)) && l4.some(o => Math.abs(o.ln[1] - h4.tr[1]) < 0.5)
          && clr(R, w3, 1) >= 1.875 && clr(R, h4, 0) >= 1.875;
        T(cOk, 'G2c 偏到谱表外的全 / 二分休止带 data-g=ledger，加线与休止 |Δy|<0.5（m3 宿主整小节休止在上、m4 层二分休止在下）',
          J({ w3: w3 && [+pOf(R, w3).toFixed(2), l3.map(o => o.ln[1]), w3.tr[1]], h4: h4 && [+pOf(R, h4).toFixed(2), l4.map(o => o.ln[1]), h4.tr[1]] }));
        const F4 = await geo(P.pg, F04);
        T(!of(R, 'rest', 1, 2, 0).length && ![0, 3].some(mi => of(F4, 'rest', 1, mi).length || of(F4, 'head', 1, mi).length),
          'G12 叠放的五线谱行上 hid 列没有 rest 元素（FX.rests m2 层第 1 列、F04 层 m1 / m4 整小节 hid）', J([of(R, 'rest', 1, 2, 0).length, [0, 3].map(mi => of(F4, 'rest', 1, mi).length)])); }
      /* G3 / G4 符头与附点 */
      { const Hd = await geo(P.pg, EFX.heads), DX = Hd.hw.black - 0.25;
        const heads = (vi, mi, ci) => of(Hd, 'head', vi, mi, ci);
        const dxOf = (mi, ca, cb) => { const a = heads(0, mi, ca), c = heads(1, mi, cb); return (a.length && c.length) ? cx(a[0]) - cx(c[0]) : NaN; };
        const v = { sec: dxOf(0, 0, 0), third: dxOf(0, 1, 1), cross: dxOf(0, 2, 2), crossFar: dxOf(0, 3, 3) };
        T(near(v.sec, DX, 0.3) && Math.abs(v.third) <= 0.5 && near(v.cross, DX, 0.3) && Math.abs(v.crossFar) <= 0.5,
          'G3a 二度 / 交叉 ≤7 谱位：Δx＝DX±0.3 且声部 1 在右；三度 / 交叉 >7 谱位 |Δx|≤0.5（DX＝' + DX.toFixed(2) + '）', J(v));
        const shareOk = heads(0, 1, 0).length === 1 && heads(1, 1, 0).length === 0 && of(Hd, 'stem', 1, 1, 0).length === 1;
        const hq = dxOf(1, 1, 2), dq = dxOf(2, 0, 0);
        T(shareOk && near(hq, (Hd.hw.half + Hd.hw.black) / 2 - 0.25, 0.3) && near(dq, DX, 0.3),
          'G3b 同形同附点同度共用一个符头（四分对八分：只有宿主的符头、层的符干照画）；二分对四分、附点对不附点不共用、按二度错开', J({ shareOk, hq, dq }));
        const accs = (vi, mi, ci) => of(Hd, 'acc', vi, mi, ci).filter(o => o.d);
        const sh = accs(0, 1, 2).find(o => o.d === Hd.sharp), nt = accs(1, 1, 4).find(o => o.d === Hd.nat);
        T(near(dxOf(1, 2, 4), DX, 0.3) && !!sh && !!nt && sh.box[2] <= nt.box[0] + 0.5,
          'G3c 增一度（F♯5 / F5）错开、两个变音记号都在、♯ 在外侧', J({ dx: dxOf(1, 2, 4), sh: sh && sh.box, nt: nt && nt.box }));
        const dots = (vi, mi, ci) => of(Hd, 'dot', vi, mi, ci).filter(o => o.c);
        const hE = heads(1, 2, 1)[0], dE = dots(1, 2, 1)[0], d3a = dots(0, 3, 0)[0], d3b = dots(1, 3, 0)[0], h3 = heads(0, 3, 0)[0];
        T(!!hE && !!dE && near(dE.c[1] - hE.tr[1], 3.75, 0.5) && !!d3a && !!d3b && Math.abs(d3a.c[0] - d3b.c[0]) < 0.5 && d3a.c[0] > h3.box[2],
          'G4 声部 2 线上音（E4）的附点 cy−符头 cy＝+3.75±0.5；有错开时两声部附点 x 对齐在最右符头右侧', J({ dy: hE && dE && dE.c[1] - hE.tr[1], d3: [d3a && d3a.c, d3b && d3b.c, h3 && h3.box[2]] })); }
      /* G5 弧向与连音数字 */
      { const Ar = await geo(P.pg, EFX.arcs);
        const tq = vi => { const o = of(Ar, 'tie', vi, 0, 0).find(x => x.d); const m = o && /^M (-?[\d.]+) (-?[\d.]+) Q (-?[\d.]+) (-?[\d.]+) /.exec(o.d); return m ? { y1: +m[2], qy: +m[4] } : null; };
        const tH = tq(0), tL = tq(1);
        const tupY = vi => { const o = of(Ar, 'tup', vi, 0).find(x => x.tag === 'text'); return o ? o.y : NaN; };
        const tips = vi => [2, 3, 4].map(ci => of(Ar, 'stem', vi, 0, ci).find(o => o.ln)).filter(Boolean).map(o => o.ln[3]);
        const okT = !!tH && !!tL && tH.qy < tH.y1 && tL.qy > tL.y1, okN = tupY(0) < Math.min(...tips(0)) && tupY(1) - 6.5 > Math.max(...tips(1));
        T(okT && okN, 'G5 弧向：宿主连音线弧向上（弧顶 y 小于端点）、层向下；连音数字在符干端外侧（宿主在符杠上方、层在符杠下方）', J({ tH, tL, tup: [tupY(0), tupY(1)], tips: [tips(0), tips(1)] })); }
      /* G6 临时记号按谱表进位 */
      { const Ac = await geo(P.pg, EFX.accs), acc = (vi, mi, ci) => of(Ac, 'acc', vi, mi, ci).filter(o => o.d);
        T(acc(0, 0, 0).some(o => o.d === Ac.sharp) && acc(1, 0, 1).some(o => o.d === Ac.nat) && acc(1, 1, 0).some(o => o.d === Ac.sharp) && acc(0, 1, 2).length === 0,
          'G6 临时记号按谱表进位：宿主 ♯F5 后同小节层 F5 印 ♮；层先 ♯F5、宿主后 ♯F5 不重标（方案验收原文；Gould 提示性 ♯ 待审核② 核定）',
          J({ m0h: acc(0, 0, 0).length, m0l: acc(1, 0, 1).map(o => o.d === Ac.nat), m1l: acc(1, 1, 0).length, m1h: acc(0, 1, 2).length })); }
      /* G7 合唱 */
      { const C1 = await geo(P.pg, EFX.choir), C2 = await geo(P.pg, EFX.choir2), C3 = await geo(P.pg, EFX.choirSame);
        const ly = (G, vi, t) => G.items.filter(o => o.g === 'lyr' && o.vi === vi && o.t === t).map(o => o.y);
        const d1 = ly(C1, 1, 'lu')[0] - ly(C1, 0, 'la')[0], d2 = ly(C2, 1, 'lu')[0] - ly(C2, 0, 'la')[0], d22 = ly(C2, 0, 'li')[0] - ly(C2, 0, 'la')[0];
        T(near(d1, 21, 0.5) && near(d2, 42, 0.5) && near(d22, 21, 0.5) && !C3.items.some(o => o.g === 'lyr' && o.vi === 1) && ly(C3, 0, 'le').length === 1 && C1.rown.some(t => t === '女高 / 女低') && C2.rown.some(t => t === '女高 / 女低'),
          'G7 合唱：层词排在宿主各段之后（单段第 2 行、两段词第 3 行；与宿主同词只印一行）；声部名合并「女高 / 女低」', J({ d1, d2, d22, same: C3.items.filter(o => o.g === 'lyr').map(o => o.vi + o.t), rown: [C1.rown, C2.rown] })); }
      /* G13 竖向 */
      { const Lw = await geo(P.pg, EFX.low), L0 = await geo(P.pg, EFX.low0);
        const tip = of(Lw, 'stem', 1, 0, 0).find(o => o.ln), hd = of(Lw, 'head', 1, 0, 0)[0], lhTop = Lw.sb['2:0'] - 4 * SG;
        T(Lw.sb['1:0'] === Lw.sb['0:0'] && (Lw.sb['2:0'] - Lw.sb['0:0']) > (L0.sb['2:0'] - L0.sb['0:0']) && !!tip && Math.max(tip.ln[1], tip.ln[3]) < lhTop - 1 && !!hd && hd.box[3] < lhTop - 1,
          'G13 竖向：层与宿主同 y（谱表底线相同）；宿主加线区覆盖层的最低音（层有 G3 时两张谱表间距变大、层符头与朝下的符干端不进下一张谱表）',
          J({ sb: Lw.sb, sb0: L0.sb, tip: tip && tip.ln, hd: hd && hd.box, lhTop })); }
      /* G14 括线 / G15 力度 */
      { const Dn = await geo(P.pg, EFX.dyn), Du = await geo(P.pg, EFX.duo), Dr = Q ? await geo(Q.pg, EFX.dyn) : null;
        const br = Dn.items.find(o => o.g === 'brace'), span = Dn.sb['2:0'] - (Dn.sb['0:0'] - 4 * SG);
        T(Dn.braces === 1 && !!br && near(br.box[3] - br.box[1], span, 3) && Du.brackets === 0 && !Du.items.some(o => o.g === 'bracket'),
          'G14 括线：分层钢琴 [RH, RH·2, LH, LH·2] 只有 1 个花括号、跨 2 张物理谱表；闭合二部合唱 [S, A(层)] 不画方括号', J({ braces: Dn.braces, h: br && br.box[3] - br.box[1], span, brackets: Du.brackets }));
        const dyn = (G, vi, mi) => G.items.filter(o => o.g === 'dyn' && o.tag === 'text' && o.vi === vi && o.mi === mi);
        const h0 = dyn(Dn, 0, 0)[0], r0 = Dr && dyn(Dr, 0, 0)[0], h1 = dyn(Dn, 0, 1)[0], l1 = dyn(Dn, 1, 1)[0];
        const ok = !!h0 && h0.y > Dn.sb['0:0'] && !!r0 && near(h0.y - Dn.sb['0:0'], r0.y - Dr.sb['0:0'], 0.5)
          && !!h1 && h1.y < Dn.sb['0:1'] - 4 * SG && !!l1 && l1.y > Dn.sb['0:1'] && dyn(Dn, 1, 2).length === 0 && dyn(Dn, 0, 2).length === 1;
        T(ok, 'G15 力度：宿主力度在谱表下方、与 v70.5 同列同 y（相对谱表底线）；同起拍力度不同时宿主的在谱表上方、层的在下方；相同只印一个（宿主的）',
          J({ h0: h0 && h0.y - Dn.sb['0:0'], r0: r0 && r0.y - Dr.sb['0:0'], h1: h1 && [h1.y, Dn.sb['0:1'] - 4 * SG], l1: l1 && [l1.y, Dn.sb['0:1']], m2: [dyn(Dn, 0, 2).length, dyn(Dn, 1, 2).length] })); }
    }

    /* ================= C：碰撞普查（G8） ================= */
    if (want('C')) {
      const GC = require('./geom_census.js');
      const P = keep(await open(b, URL0, 'x=1'));
      const imp = await EV(P.pg, L => L.map(([n, x]) => ({ name: n, song: JSON.parse(JSON.stringify(importMusicXML(x).song)) })),
        fs.readdirSync(FXD).filter(f => /\.musicxml$/.test(f)).map(f => [f.replace('.musicxml', ''), fs.readFileSync(path.join(FXD, f), 'utf8')]));
      if (imp.err) T(false, 'C 导入分层夹具', imp.err);
      else {
        const LAY = Object.entries(EFX).map(([k, s]) => ({ name: 'FX·' + k, song: s })).concat(imp.filter(x => x.song.voxLayer).map(x => ({ name: x.name, song: x.song })));
        const RS = await GC.census(P.pg, GC.allSamples(), { paperW: 870 }), RL = await GC.census(P.pg, LAY, { presets: false, paperW: 870 });
        const gS = GC.groupCounts(RS), gL = GC.groupCounts(RL), XV = ['C21', 'C22', 'C23', 'C24', 'C25'];
        T(RS.per.length === 56 && XV.every(k => gS[k] && gS[k].n === 0 && gL[k] && gL[k].n === 0),
          'C1 碰撞普查跨声部类别 C21–C25：56 份标准样本＋分层夹具（' + LAY.length + ' 份）0 处', J({ n: RS.per.length, S: XV.map(k => gS[k] && gS[k].n), L: XV.map(k => gL[k] && [gL[k].n, gL[k].ex.slice(0, 2)]) }));
        const badL = Object.values(gL).filter(g => g.grp !== 'later' && !g.info && g.n > 0);
        T(!badL.length, 'C2 分层夹具叠放后其余类别（A / B 组与度量）0 处', badL.map(g => g.id + ' ' + g.n + ' ' + g.ex.slice(0, 2).join('／')).join(' | '));
        T(gS.C17 && gS.C17.n <= 218, 'C3 标准样本 C17（圆滑线穿中间音）只降不升（≤218）', gS.C17 && gS.C17.n);
      }
    }

    /* ================= B：回滚与基线（G10） ================= */
    if (want('B')) {
      let base = null; try { base = JSON.parse(fs.readFileSync(BASE_PATH, 'utf8')); } catch (e) {}
      if (!base) T(false, 'B 存档读不到：' + BASE_PATH + '（node tests/tv_v706eng.js --write-base 生成）');
      else {
        const songs = Object.entries(base.songs), errs = [];
        let rb = null, rbErr = ''; try { rb = rollbackUrl(URL0); } catch (e) { rbErr = e.message; }
        const R0 = {}, R1 = {};
        for (const E of ENVS) { if (rb) R0[E[0]] = await envRun(b, rb, E, songs, errs); R1[E[0]] = await envRun(b, URL0, E, songs, errs); }
        const FF = ['score', 'off', 'print', 'pages', 'geo'];
        const diff = (X, Y) => { const bad = []; Object.keys(Y || {}).forEach(k => FF.forEach(f => { if (!X || !X[k] || X[k][f] !== Y[k][f]) bad.push(k + '.' + f + (X && X[k] && X[k].err ? '（' + X[k].err.slice(0, 60) + '）' : '')); })); return bad; };
        const b1 = rb ? ENVS.map(E => [E[0], diff(R0[E[0]], base.env[E[0]])]).filter(x => x[1].length) : [['回滚副本', [rbErr]]];
        T(!b1.length, 'B1 回滚副本（VOX_LAYER_DRAW = 0）：新外壳 / ?shell=classic / ?next=0 / 观看页 / 谱架 / 390px 六种环境 #score、离屏 SVG、打印切片、页数、SYS_GEO＝v70.5 存档（' + base.ref + '）', J(b1));
        const b2 = ['classic', 'next0'].map(e => [e, diff(R1[e], base.env[e])]).filter(x => x[1].length);
        T(!b2.length, 'B2 置 1：?shell=classic 与 ?next=0 的五项＝v70.5 存档', J(b2));
        const four = ['flow', 'viewer', 'stand', 'm390'];
        const stacked = four.every(e => songs.every(([k]) => R1[e][k] && base.env[e][k] && R1[e][k].lines < base.env[e][k].lines));
        /* 观看页的 SYS_GEO 另有观看条 / 预览口径（v70.5 存档里同一首也是 4 段），系统数只比谱架；页数三处都比 */
        const same3 = songs.every(([k]) => ['viewer', 'stand'].every(e => R1[e][k].pages === R1.flow[k].pages) && R1.stand[k].nsys === R1.flow[k].nsys
          && ['flow', 'viewer', 'stand'].every(e => R1[e][k].nsys - base.env[e][k].nsys === R1.flow[k].nsys - base.env.flow[k].nsys));
        const samePP = songs.every(([k]) => four.every(e => R1[e][k].pp === R1.flow[k].pp));
        T(stacked && same3 && samePP, 'B3 置 1：新外壳 / 观看页 / 谱架 / 390px 四处都叠放（谱线少于存档）；新外壳 / 观看页 / 谱架页数与系统数相同；四处打印页数相同',
          J(Object.fromEntries(four.map(e => [e, songs.map(([k]) => [k, R1[e][k] && R1[e][k].lines, base.env[e][k] && base.env[e][k].lines, R1[e][k] && R1[e][k].pages, R1[e][k] && R1[e][k].nsys, R1[e][k] && R1[e][k].pp])]))));
        const EXP = L => L.map(([k, s]) => { const S = migrate(JSON.parse(JSON.stringify(s))), j0 = JSON.stringify(S), o0 = song; let X, M;
          try { X = exportMusicXML(JSON.parse(j0)); M = Array.from(exportMIDI0(JSON.parse(j0)).bytes).join(','); } finally { song = o0; }
          loadSong(JSON.parse(j0)); const a = JSON.stringify(song); render(); render(); const c = JSON.stringify(song);
          return { k, j: j0, x: X, m: M, same: a === c }; });
        const ex = async u => { const P = await open(b, u, 'x=1'), r = await EV(P.pg, EXP, songs); errs.push(...P.errs); await P.ctx.close(); return r; };
        const e1 = await ex(URL0), e0 = rb ? await ex(rb) : null;
        const b4 = Array.isArray(e1) && Array.isArray(e0) && e1.every((r, i) => r.same && e0[i].same && r.j === e0[i].j && r.x === e0[i].x && r.m === e0[i].m && typeof r.x === 'string' && r.m.length > 0);
        T(b4, 'B4 0 / 1 两种取值下 JSON、MusicXML、MIDI 字节相同；排版不改 song', J(Array.isArray(e1) ? e1.map((r, i) => [r.k, r.same, e0 && e0[i] && [r.j === e0[i].j, r.x === e0[i].x, r.m === e0[i].m]]) : e1));
        allErrs.push(...errs);
      }
    }
  } catch (e) { console.log('❌ 运行异常 ' + (e.stack || e)); total++; fails.push('异常'); }
  for (const P of pages) { allErrs.push(...P.errs); await P.ctx.close(); }
  T(!allErrs.length, 'E 页面脚本错误 0', allErrs.slice(0, 5).join(' | '));
  await b.close();
  console.log('\n' + pass + '/' + total + ' 通过' + (fails.length ? '；失败：' + fails.join(' ') : ''));
  process.exit(fails.length ? 1 : 0);
})();
