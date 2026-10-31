'use strict';
/* v69.7「刻版质量」第一步：五线谱碰撞普查（复核 docs/review-2026-10-staff-audit.md E3 / E4 / E7 / E8；负责人：「修复截图 PED 和音符重叠的问题，并检查同类型问题」）。
   工具在 tests/geom_census.js（几何口径、类别、样本都在那里；本套件只出断言）。file:// 直载、真实浏览器、离屏排版 paperW 870（与正式谱面同一份引擎）。
   样本：曲库 10 首（api/seed-library.json）＋ 16 个预设（PRESETS）＋ 10 份压力小样（低音加线＋踏板 / 力度发夹 / [sim.] 等文字 / 8va·8vb / 连音带词 / 密集临时记号 /
         跨小节延音和弦与二度 / 整小节休止延长号与方括号 / 人声力度与歌词 / 行首换谱号）。
   Z   调试标记零副作用：Z2 同一页 window.__pyqGeom 开 / 关两次排版，抹掉 data-g / data-gq 两个属性后逐字节相同（全部样本）；Z3 关时谱面里没有任何 data-g，
       开时只标在五线谱声部（纯简谱 / 六线谱谱面零标记）、只标叶子元素；
       Z1（只在 ONLY 含 Z1 或 env V697_REF 给了基线页时跑——本提交的零差异证明；修复组有意改谱面后不再成立，改由 Z2 / Z3 保证标记零副作用）：
       关标记时全部样本的离屏谱面 + 编辑器 #score（两套外壳）与基线 v69.6 e8dc1c8 逐字节相同。
   G   普查（修前红）：类别对 / 度量逐类「全部样本上 0 处」——C01 踏板 × 墨迹 … C18 连音线终点 × 临时记号、M1 符干长度 … M10 标点空隙
       （later 组 C17 圆滑线穿符干与参考度量 M11 只打印、不断言；A / B 两组修完后本套件应全绿）。
   S   截图那一处：天鹅之歌第 3–4 小节 Ped. 与右手下加线低音的符头 / 加线不相交、净空 ≥1.5px（几何）。
   A   A 组（谱表上下方向的避让）细项：A1 A 组 0 处且净空 ≥1.5 · A2 天鹅之歌一行一个踏板高度（Ped. / 线 / * 同高）· A3 圣母颂 / 夏威夷骊歌第 1 页踏板 ·
       A4 人声力度在谱表上方、歌词基线与去掉力度时相同 · A5 净空临时调大时补行距重排后仍 0 处 · A6 只在相撞时才挪（关避让 window.__pyqAvOff 对拍）·
       A7（验收 B1）和弦名框算墨迹：欢乐颂（教学对照谱，预设 #13）第 1、5 小节加和弦名 / 每小节加和弦名、压力·人声力度与和弦名——谱表上方记号 × 和弦名框 0 处、净空 ≥1.5，力度排在框上方。
   E   编辑器抽查（两套外壳）：载入天鹅之歌、开标记 render()，#score 普查踏板 × 墨迹 0 处；关标记重排后 #score 无 data-g；E3 预设 #13 加和弦名后 #score 记号 × 和弦名框 0 处。
   L   （验收 L1）断行轻压：B 组列宽加了临时记号栈与墨迹净距后刚杆普遍 +4–10%，圣母颂前奏两小节刚杆 715 > 行宽 705 被拆成两行（7→8 页）。
       现在刚杆之和超行宽 ≤2% 时，只压五线谱声部「简谱数字口径硬底 → 真墨迹 + 1.5」之间的弹性空白（MF2）：
       L1 编辑器（固定版宽 870，两套外壳）圣母颂回到 13 行 7 页、确有轻压行；全部行里相邻两列的墨迹净距仍 ≥1.5（staffColPlan 口径）；#score 普查各类 0 处、记号对墨迹净空 ≥1.5；
       L2 曲库 10 首编辑器页数都不多于 v69.6（e8dc1c8）。
   B   B 组（横向与符号细节）专段：B1 本组类别逐类 0 处 · B2 符杠组符干 ≥2.75（M11 打开）· B3 连音 / 小节号 / 段号与墨迹净空 ≥1.5px ·
       B4 纯简谱 / 六线谱样本离屏谱面与 v69.6 逐字节相同 · B5 几何口径（符干长度、二度错位量、段号「1.」右对齐，简谱段号不变）。
   env：MUSETAB_URL 被测页（缺省 ../index.html）· V697_REF 基线页（文件或 file:// URL；缺省 git show e8dc1c8，Z1 / B4 用）· ONLY=Z,Z1,G,S,A,B,E 只跑部分。 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const GC = require('./geom_census');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length ? k !== 'Z1' || !!process.env.V697_REF : ONLY.includes(k);
const AVE = 'lib-os-lc6389103';   /* 圣母颂（验收 L1；按 id 找不到时按曲名） */
const REF_COMMIT = 'e8dc1c8';   /* v69.6 线上版 */
let pass = 0, total = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name.split(' ')[0]); console.log((ok ? '✅' : '❌') + ' ' + name + (d ? '：' + d : '')); };
const J = x => JSON.stringify(x);
const SWAN = 'lib-os-lc5100543';

const HELP = () => {
  window.SF_PLAYWAIT = false;
  try { localStorage.setItem('musetab-humanize', 'off'); } catch (_) {}
  window.__ld = s => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    undoStack.length = 0; redoStack.length = 0; loadSong(JSON.parse(JSON.stringify(s)));
    sel = { mi: 0, row: (song.voxVoices || []).length ? 'vox' : 'tab', vi: 0, ci: 0, si: 1 }; clampSel(); selRange = null; noteSel = []; measureSel = null; blurSel = true; render(); return song.measures.length; };
  /* 离屏排一份（不经 census，直接拿 innerHTML）：geom＝是否开调试标记 */
  window.__off = (s, geom) => { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(svg);
    window.__pyqGeom = !!geom; let h = null;
    try { renderOffscreen({ song: migrate(JSON.parse(JSON.stringify(s))), target: svg, paperW: 870, crop: true }); h = svg.innerHTML; } finally { window.__pyqGeom = false; svg.remove(); }
    return h; };
  window.__strip = h => String(h).replace(/ data-g="[^"]*" data-gq="[^"]*"/g, '');
};
async function open(b, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: o.vp || { width: 1440, height: 900 } });
  const pg = await ctx.newPage();
  await pg.addInitScript(HELP);
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.dismiss().catch(() => {}));
  let u = o.url || URL0; if (o.shell === 'classic') u = withQ(u, 'shell=classic');
  await pg.goto(u); await pg.waitForTimeout(1200);
  await pg.evaluate(() => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} });
  return { ctx, pg, errs, close: () => ctx.close() };
}
const EV = (pg, fn, arg) => pg.evaluate(fn, arg).catch(e => ({ err: String(e.message || e).slice(0, 300) }));
const refUrl = () => {
  if (process.env.V697_REF) return toUrl(process.env.V697_REF);
  try { const t = path.join(os.tmpdir(), 'v697_ref_' + REF_COMMIT + '.html');
    if (!fs.existsSync(t) || fs.statSync(t).size < 1e5) fs.writeFileSync(t, execFileSync('git', ['-C', path.resolve(__dirname, '..', '..'), 'show', REF_COMMIT + ':muse-tab/index.html'], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }));
    return 'file://' + t; } catch (_) { return null; }
};

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const allErrs = [];
  const SAMPLES = GC.allSamples();
  const LIB = SAMPLES.filter(s => s.kind === 'lib');
  try {
    /* ================= Z 调试标记零副作用 ================= */
    if (want('Z') || want('Z1')) {
      const A = await open(b);
      const P = await EV(A.pg, () => PRESETS.map((p, i) => ({ name: '预设' + i, song: p.make() })));
      const ALL = SAMPLES.map(s => ({ name: s.name, song: s.song })).concat(P);
      const offs = await EV(A.pg, L => L.map(s => ({ name: s.name, off: __off(s.song, false), on: __off(s.song, true) })), ALL);
      if (want('Z')) {
        const stripN = h => String(h).replace(/ data-g="[^"]*" data-gq="[^"]*"/g, '');
        const bad = offs.filter(x => !x.off || stripN(x.on) !== x.off).map(x => x.name);
        T(offs.length === ALL.length && !bad.length, 'Z2 调试标记开 / 关两次排版，抹掉 data-g / data-gq 后逐字节相同（' + ALL.length + ' 份：曲库 ' + LIB.length + ' · 压力 ' + SAMPLES.filter(s => s.kind === 'stress').length + ' · 预设 ' + (ALL.length - SAMPLES.length) + '）', bad.join('、') || ALL.length + ' / ' + ALL.length);
        const offTag = offs.filter(x => /data-g(q)?="/.test(x.off)).map(x => x.name);
        const jpOnly = offs.filter((x, i) => { const s = ALL[i].song; return !(s.voxNotations || []).some(n => n === 'staff' || n === 'bass' || n === 'alto'); });
        const jpTag = jpOnly.filter(x => /data-g="/.test(x.on)).map(x => x.name);
        const nonLeaf = offs.filter(x => /<(g|title|svg|tspan)[^>]* data-g="/.test(x.on)).map(x => x.name);
        const nTag = offs.reduce((a, x) => a + ((x.on.match(/ data-g="/g) || []).length), 0);
        T(!offTag.length && !jpTag.length && !nonLeaf.length && nTag > 1000 && jpOnly.length >= 8,
          'Z3 关标记时谱面无 data-g；开时只标五线谱声部（' + jpOnly.length + ' 份纯简谱 / 六线谱谱面零标记）、只标叶子元素（不标 g / title / tspan）',
          J({ offTag, jpTag, nonLeaf, nTag }));
      }
      if (want('Z1')) {
        const RU = refUrl();
        if (!RU) console.log('⚠️ Z1 跳过：拿不到基线页（git show ' + REF_COMMIT + ' 失败；可设 env V697_REF）');
        else {
          const R = await open(b, { url: RU });
          const refs = await EV(R.pg, L => L.map(s => { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(svg);
            renderOffscreen({ song: migrate(JSON.parse(JSON.stringify(s.song))), target: svg, paperW: 870, crop: true }); const h = svg.innerHTML; svg.remove(); return h; }), ALL);
          const diff = offs.filter((x, i) => x.off !== refs[i]).map(x => x.name);
          T(Array.isArray(refs) && !diff.length, 'Z1a 关标记时 ' + ALL.length + ' 份样本的离屏谱面与基线 v69.6（' + REF_COMMIT + '）逐字节相同', diff.join('、') || ALL.length + ' / ' + ALL.length);
          const sw = LIB.find(s => s.id === SWAN).song;
          for (const shell of ['flow', 'classic']) {
            const X = await open(b, { url: RU, shell: shell === 'classic' ? 'classic' : null }), Y = await open(b, { shell: shell === 'classic' ? 'classic' : null });
            const hx = await EV(X.pg, s => { __ld(s); return document.getElementById('score').innerHTML; }, sw);
            const hy = await EV(Y.pg, s => { __ld(s); return document.getElementById('score').innerHTML; }, sw);
            T(typeof hx === 'string' && hx.length > 1000 && hx === hy, 'Z1b 编辑器 #score（' + shell + ' 外壳，天鹅之歌）关标记时与基线逐字节相同', (hx || '').length + ' / ' + (hy || '').length);
            allErrs.push(...X.errs, ...Y.errs); await X.close(); await Y.close();
          }
          allErrs.push(...R.errs); await R.close();
        }
      }
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= G 普查（修前红） ================= */
    let R = null;
    if (want('G') || want('S') || want('B')) {
      const A = await open(b);
      R = await GC.census(A.pg, SAMPLES, { paperW: 870 });
      allErrs.push(...A.errs); await A.close();
    }
    if (want('G') && R) {
      const G = GC.printReport(R);
      Object.values(G).forEach(g => {
        const cats = g.cats && Object.keys(g.cats).length ? '｜' + Object.entries(g.cats).sort((p, q) => q[1] - p[1]).map(([k, v]) => k + ' ' + v).join(' · ') : '';
        const ex = g.ex && g.ex.length ? '｜例：' + g.ex.slice(0, 2).join(' ／ ') : '';
        /* later 组（本版不修：圆滑线避让要等 T3 独立圆滑线字段）与参考度量只打印，不断言——A / B 两组修完后本套件应全绿 */
        if (g.info || g.grp === 'later') { console.log('ℹ️ ' + g.id + ' [' + g.grp + '] ' + g.what + '：' + g.n + ' 处（不断言）' + cats + ex); return; }
        T(g.n === 0, g.id + ' [' + g.grp + '] ' + g.what + '：全部样本 0 处', g.n + ' 处' + cats + ex);
      });
    }

    /* ================= S 截图那一处：天鹅之歌第 3–4 小节 ================= */
    if (want('S') && R) {
      const sw = R.per.find(p => p.name.indexOf('天鹅之歌') >= 0);
      const inM = p => [2, 3].includes(p.mi) && (p.a.cls === 'ped' || p.b.cls === 'ped');
      const hit = sw ? sw.pairs.filter(inM) : null, near = sw ? sw.near.filter(inM) : null;
      T(!!sw && hit.length === 0, 'S1 天鹅之歌第 3–4 小节：Ped.____* 与右手下加线低音的符头 / 加线 / 符干不相交（几何）',
        sw ? hit.length + ' 处 ' + J(hit.slice(0, 3).map(p => p.cat + '@m' + p.m + ' ' + J(p.a.box) + '×' + J(p.b.box))) : '没有排出天鹅之歌');
      T(!!sw && near.length === 0, 'S2 天鹅之歌第 3–4 小节：Ped. 与音符墨迹净空 ≥1.5px（不贴着）',
        sw ? near.length + ' 处 ' + J(near.slice(0, 3).map(p => p.cat + '@m' + p.m)) : '');
    }

    /* ================= A 谱表上下方向的避让（A 组：踏板 / 力度 / 发夹 / cresc.·dim. / 标注 / 八度线 / 人声力度在上方） =================
       A1 普查里 A 组各类 0 处，且这几类文字 / 线条记号与音符墨迹的净空都 ≥1.5（贴近也算；发夹按外接框量贴近没有意义，不计）；
       A2 天鹅之歌：同一行的 Ped. 文字、延续线、* 同高（线 = 文字基线 −3、* 基线 = 线 +3.5，一行只有一个踏板高度）；
       A3 圣母颂 / 夏威夷骊歌第 1 页：踏板与音符墨迹 0 处、净空 ≥1.5；
       A4 人声行的力度画在谱表上方，不再把歌词推远（同一份谱去掉全部力度，歌词基线逐个相同）；
       A5 行距补空：把净空临时调到 18（记号挪得很远）、人声行歌词对音符净空调到 26，重排一遍补空后 A 组各类（含压到下一行 / 歌词 / 下一系统）与歌词 × 音符仍 0 处、确有补空；
       A6 只在真的相撞时才挪：关掉避让（window.__pyqAvOff）排出的谱面若 A 组 0 处、净空足，开避让后逐字节相同（全部样本里逐份比）。 */
    if (want('A')) {
      const A = await open(b);
      const AR = R || await GC.census(A.pg, SAMPLES, { paperW: 870 });
      await GC.inject(A.pg);
      const G = GC.groupCounts(AR);
      const aIds = ['C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C19', 'M5'];
      const aBad = aIds.filter(k => G[k].n).map(k => k + ' ' + G[k].n);
      const AM = ['ped', 'dyn', 'dtext', 'tempo', 'expr', 'anno', 'ott'];
      const nearA = []; AR.per.forEach(p => p.near.forEach(x => { if (AM.includes(x.a.cls) || AM.includes(x.b.cls)) nearA.push(p.name + ' 第' + x.m + '小节 ' + x.cat); }));
      T(!aBad.length && !nearA.length, 'A1 A 组（踏板 / 力度 / 发夹 / cresc.·dim. / 标注 / 八度线 / 人声力度）全部样本 0 处，文字与线条记号对音符墨迹净空 ≥1.5',
        J({ cats: aBad, near: nearA.slice(0, 4), nNear: nearA.length }));
      /* A2 天鹅之歌踏板同高 */
      const sw = LIB.find(s => s.id === SWAN).song;
      const a2 = await EV(A.pg, s => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(svg);
        window.__pyqGeom = true;
        try { renderOffscreen({ song: migrate(JSON.parse(JSON.stringify(s))), target: svg, paperW: 870, crop: true }); } finally { window.__pyqGeom = false; }
        const sBs = {}; [...svg.querySelectorAll('rect[data-row="vox"][data-staffb]')].forEach(r => { const v = r.getAttribute('data-vi'); (sBs[v] = sBs[v] || new Set()).add(+r.getAttribute('data-staffb')); });
        const rowOf = (vi, y) => [...(sBs[vi] || [])].reduce((b, v) => Math.abs(v + 20 - y) < Math.abs(b + 20 - y) ? v : b, -1e9);
        const rows = new Map(); let bad = [];
        svg.querySelectorAll('[data-g="ped"]').forEach(el => {
          const vi = el.getAttribute('data-gq').split(':')[0], tag = el.tagName.toLowerCase();
          const y = tag === 'line' ? +el.getAttribute('y1') : +el.getAttribute('y');
          const k = vi + '@' + rowOf(vi, y); let o = rows.get(k); if (!o) rows.set(k, o = { line: new Set(), ped: [], star: [] });
          if (tag === 'line') { o.line.add(+y.toFixed(1)); if (Math.abs(+el.getAttribute('y2') - y) > 0.01) bad.push('斜线 ' + k); }
          else if ((el.textContent || '').trim() === 'Ped.') o.ped.push(y); else o.star.push(y);
        });
        const out = []; rows.forEach((o, k) => {
          const L = [...o.line];
          if (L.length > 1) bad.push(k + ' 一行 ' + L.length + ' 个高度 ' + J(L));
          const ly = L[0];
          if (ly != null) { o.ped.forEach(y => { if (Math.abs(y - 3 - ly) > 0.06) bad.push(k + ' Ped.基线 ' + y + ' 线 ' + ly); });
            o.star.forEach(y => { if (Math.abs(y - 3.5 - ly) > 0.06) bad.push(k + ' * 基线 ' + y + ' 线 ' + ly); }); }
          out.push(k + ':' + L.join('/'));
        });
        svg.remove(); return { rows: out.length, bad, sample: out.slice(0, 4) };
        function J(x) { return JSON.stringify(x); }
      }, sw);
      T(!a2.err && a2.rows >= 6 && !a2.bad.length, 'A2 天鹅之歌：同一行的 Ped. 文字 / 延续线 / * 同高（线＝文字基线 −3、* 基线＝线 ＋3.5，一行一个踏板高度）', J(a2));
      /* A3 圣母颂 / 夏威夷骊歌第 1 页踏板（页高取同一次离屏排版的分页几何 geo.pgH） */
      const pgH = await EV(A.pg, s => { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(svg);
        const o = renderOffscreen({ song: migrate(JSON.parse(JSON.stringify(s))), target: svg, paperW: 870, crop: true }); svg.remove(); return o.geo.pgH; }, LIB.find(s => /圣母颂/.test(s.name)).song);
      const p1 = AR.per.filter(p => /圣母颂|夏威夷骊歌/.test(p.name)).map(p => {
        const inP1 = x => x.a.box[1] < pgH;
        return { name: p.name, pgH, hit: p.pairs.filter(x => (x.a.cls === 'ped' || x.b.cls === 'ped') && inP1(x)).length, near: p.near.filter(x => (x.a.cls === 'ped' || x.b.cls === 'ped') && inP1(x)).length,
          peds: p.cnt.ped || 0 };
      });
      T(p1.length === 2 && p1.every(x => !x.hit && !x.near && x.peds > 0), 'A3 圣母颂 / 夏威夷骊歌第 1 页：踏板与音符墨迹 0 处、净空 ≥1.5', J(p1));
      /* A4 人声力度画在谱表上方、不把歌词推远 */
      const vs = SAMPLES.find(s => s.name === '压力·人声力度与歌词').song;
      const a4 = await EV(A.pg, s => {
        const one = so => { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(svg);
          window.__pyqGeom = true; try { renderOffscreen({ song: migrate(so), target: svg, paperW: 870, crop: true }); } finally { window.__pyqGeom = false; }
          const sb = [...svg.querySelectorAll('rect[data-row="vox"][data-staffb]')].map(r => +r.getAttribute('data-staffb'));
          const lyr = [...svg.querySelectorAll('[data-g="lyr"]')].map(t => +(+t.getAttribute('y') - Math.max(...sb.filter(v => v <= +t.getAttribute('y')))).toFixed(2));
          const dyn = [...svg.querySelectorAll('[data-g="dyn"],[data-g="hairpin"]')].map(el => { const b = el.getBBox(); return +(b.y + b.height).toFixed(1); });
          const top = Math.min(...sb);
          svg.remove(); return { lyr, dyn, sb: [...new Set(sb)], top };
        };
        const a = one(JSON.parse(JSON.stringify(s)));
        const s2 = JSON.parse(JSON.stringify(s)); s2.measures.forEach(m => m.voxes.forEach(cs => cs.forEach(c => { delete c.dyn; delete c.dynTo; })));
        const b2 = one(s2);
        return { same: JSON.stringify(a.lyr) === JSON.stringify(b2.lyr), nL: a.lyr.length, dynAbove: a.dyn.length > 0 && a.dyn.every(y => a.sb.some(sb => y < sb - 30 && y > sb - 80)), dyn: a.dyn, sb: a.sb };
      }, vs);
      T(!a4.err && a4.same && a4.nL > 20 && a4.dynAbove, 'A4 人声行的力度 / 发夹画在谱表上方（底在谱表顶线之上），歌词基线与去掉全部力度时逐个相同（不再把歌词推远）', J(a4));
      /* A5 补空重排：净空临时调到 18 */
      const PADS = SAMPLES.filter(s => /天鹅|圣母|夏威夷|压力·文字|压力·低音/.test(s.name));
      const a5 = await EV(A.pg, L => {
        const keep = AV_CLR, keepL = AV_LCLR, rc = window.renderCore; let n = 0; window.renderCore = function () { n++; return rc.apply(this, arguments); };
        const AMK = /^(ped|dyn|hairpin|dtext|tempo|expr|anno|ott)×|×(ped|dyn|hairpin|dtext|tempo|expr|anno|ott)$|^(lyr|lyrp|verse)×(acc|head|stem|flag|beam|ledger|rest|dot|tie)$/;
        try {
          AV_CLR = 18; AV_LCLR = 26;
          return L.map(s => { n = 0;
            const so = migrate(JSON.parse(JSON.stringify(s.song)));
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(svg);
            renderOffscreen({ song: so, target: svg, paperW: 870, crop: true }); svg.remove();
            const H = AV_HINT && AV_HINT.get(so), passes = n;
            const c = __gcRun({ name: s.name, song: s.song }, { paperW: 870 });
            const bad = c.pairs.filter(p => AMK.test(p.cat)).map(p => p.cat + '@' + p.m);
            const bPad = H ? [...H.values()].some(v => v.b.some(x => x > 0)) : false;
            return { name: s.name, passes, pads: H ? H.size : 0, bPad, bad };
          });
        } finally { AV_CLR = keep; AV_LCLR = keepL; window.renderCore = rc; }
      }, PADS.map(s => ({ name: s.name, song: s.song })));
      T(Array.isArray(a5) && a5.every(x => !x.bad.length && x.passes <= 2) && a5.some(x => x.pads > 0 && x.passes === 2) && a5.some(x => x.bPad), 'A5 行距补空：净空临时调到 18（人声歌词对音符 26）时记号 / 歌词挪出原有行距 → 补空后重排一遍（第二遍收敛、歌词行确有补空），A 组各类（含压到下一行 / 歌词 / 下一系统）与歌词 × 音符仍 0 处',
        J(a5));
      /* A6 只在真的相撞时才挪 */
      const ALL = SAMPLES.map(s => ({ name: s.name, song: s.song })).concat(await EV(A.pg, () => __gcPresets()));
      const a6 = await EV(A.pg, L => L.map(s => {
        const one = off => { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(svg);
          window.__pyqAvOff = off; try { renderOffscreen({ song: migrate(JSON.parse(JSON.stringify(s.song))), target: svg, paperW: 870, crop: true }); return svg.innerHTML; } finally { window.__pyqAvOff = false; svg.remove(); } };
        const off = one(true), on = one(false);
        window.__pyqAvOff = true; let c; try { c = __gcRun({ name: s.name, song: s.song }, { paperW: 870, nearPad: 2.5 }); } finally { window.__pyqAvOff = false; }   /* 「干净」按 2.5 的贴近判（比避让的 1.5 宽一档：两套几何口径在 1.5 上下的临界样本不拿来比） */
        const AMK = /^(ped|dyn|hairpin|dtext|tempo|expr|anno|ott)×|×(ped|dyn|hairpin|dtext|tempo|expr|anno|ott)$/;
        const clean = !c.pairs.some(p => AMK.test(p.cat)) && !c.near.some(p => AMK.test(p.cat));   /* 这里贴近连发夹也算（按外接框，偏宽——宽了只会少比几份，不会放过挪动） */
        return { name: s.name, clean, same: off === on };
      }), ALL);
      const a6bad = Array.isArray(a6) ? a6.filter(x => x.clean && !x.same).map(x => x.name) : ['异常'];
      const a6clean = Array.isArray(a6) ? a6.filter(x => x.clean).length : 0, a6moved = Array.isArray(a6) ? a6.filter(x => !x.same).length : 0;
      T(Array.isArray(a6) && !a6bad.length && a6clean >= 15 && a6moved >= 8, 'A6 只在真的相撞时才挪：关避让时 A 组 0 处、净空 ≥2.5 的样本（' + a6clean + ' 份），开避让后谱面逐字节相同；有挪动的 ' + a6moved + ' 份都是关避让时有碰撞 / 贴近的',
        J({ bad: a6bad, clean: a6clean, moved: a6moved }));
      /* A7（验收 B1）和弦名框（纸色底 + 描边）算墨迹：人声力度 / 发夹 / 8va / [sim.] 在谱表上方时排到框外 ≥1.5px。
         样本：欢乐颂（教学对照谱，预设 #13）旋律第 1、5 小节首音加和弦名（mf、渐强 < 原压在框上）、每小节都加；压力·人声力度与和弦名（高音区 + 每小节和弦 + 力度 / 发夹 / cresc. / 8va / [sim.]）。
         断言：谱表上方记号 × 和弦名 0 处、贴近 0 处；力度类与和弦框横向重叠时力度底在框顶之上 ≥1.5（排在框上方，不落进框里） */
      const a7 = await EV(A.pg, L => {
        const P13 = mis => { const s = PRESETS[13].make(); const CH = ['C', 'G', 'Am', 'F', 'C', 'G', 'C', 'G'];
          s.measures.forEach((m, mi) => { const c = (m.voxes[0] || [])[0]; if (c && (!mis || mis.includes(mi))) c.chord = CH[mi % 8]; }); return s; };
        const S = [{ name: '预设13·第1、5小节和弦', song: P13([0, 4]) }, { name: '预设13·每小节和弦', song: P13(null) }].concat(L);
        const AVM = ['ped', 'dyn', 'hairpin', 'dtext', 'tempo', 'expr', 'anno', 'ott'];
        const isCh = x => (x.a.cls === 'chord') !== (x.b.cls === 'chord') && (AVM.includes(x.a.cls) || AVM.includes(x.b.cls));
        return S.map(s => {
          const c = __gcRun({ name: s.name, song: s.song }, { paperW: 870, keep: true });
          const items = window.__gcLast.items; if (window.__gcLast.host) window.__gcLast.host.remove(); window.__gcLast = null;
          const boxes = items.filter(it => it.cls === 'chord' && it.tag === 'rect').map(it => it.box);
          const dy = items.filter(it => ['dyn', 'hairpin', 'dtext'].includes(it.cls));
          const inBox = []; let pairsAbove = 0;
          dy.forEach(d => boxes.forEach(bx => { if (d.box[0] < bx[2] && d.box[2] > bx[0] && Math.abs((d.box[1] + d.box[3]) / 2 - (bx[1] + bx[3]) / 2) < 40) {
            pairsAbove++; if (!(d.box[3] <= bx[1] - 1.5)) inBox.push(d.cls + '@' + d.mi + ' ' + JSON.stringify([d.box[1], d.box[3]].map(v => +v.toFixed(1))) + '×' + JSON.stringify([bx[1], bx[3]].map(v => +v.toFixed(1)))); } }));
          return { name: s.name, hit: c.pairs.filter(isCh).map(x => x.cat + '@m' + x.m), near: c.near.filter(isCh).map(x => x.cat + '@m' + x.m), boxes: boxes.length, pairsAbove, inBox };
        });
      }, SAMPLES.filter(s => s.name === '压力·人声力度与和弦名').map(s => ({ name: s.name, song: s.song })));
      T(Array.isArray(a7) && a7.length === 3 && a7.every(x => !x.hit.length && !x.near.length && !x.inBox.length && x.boxes >= 2) && a7.every(x => x.pairsAbove > 0),
        'A7（验收 B1）和弦名框算墨迹：预设 #13 加和弦名（第 1、5 小节 / 每小节）、压力·人声力度与和弦名——谱表上方记号 × 和弦名框 0 处、净空 ≥1.5，力度 / 发夹排在框上方',
        J(a7));
      allErrs.push(...A.errs); await A.close();
    }
    /* ================= B 组（横向与符号细节）：本组类别逐类 0 处 + 收紧 + 简谱 / 六线谱逐字节不变 + 几何口径 =================
       （A / B 两组各在自己的段里加断言，互不改对方的段；G 段仍是全类别总闸） */
    if (want('B') && R) {
      const G = GC.groupCounts(R);
      const mine = Object.values(G).filter(g => g.grp === 'B' && !g.info);
      const bad = mine.filter(g => g.n).map(g => g.id + ' ' + g.n);
      T(mine.length >= 19 && !bad.length, 'B1 本组类别（' + mine.map(g => g.id).join(' ') + '）全部样本 0 处', bad.join('、') || mine.length + ' 类全 0');
      /* 收紧①：参考度量 M11（符杠组最短符干 <2.75 线距）打开为断言 */
      T(G.M11 && G.M11.n === 0, 'B2 符杠组符干不短于 2.75 线距（M11 打开为断言；stemLenSG 符杠组下限 3.0）', G.M11 ? G.M11.n + ' 处' : '无 M11');
      /* 收紧②：本组的记号（连音数字 / 弧、小节号、歌词段号）与墨迹净空 ≥1.5px（普查「贴近」也 0 处） */
      const nearB = Object.entries(R.near).filter(([k]) => /(^|×)(tup|mnum|verse)(×|$)/.test(k)).map(([k, v]) => k + ' ' + v.n);
      T(!nearB.length, 'B3 连音数字 / 弧、行首小节号、歌词段号与墨迹净空 ≥1.5px（贴近 0 处）', nearB.join('、') || '0');
      /* B4 简谱 / 六线谱谱面逐字节不变：不含五线谱声部、也不是联排五线谱的样本（曲库 / 压力 / 预设），离屏谱面与 v69.6 基线相同 */
      const RU = refUrl();
      if (!RU) console.log('⚠️ B4 跳过：拿不到基线页（git show ' + REF_COMMIT + ' 失败；可设 env V697_REF）');
      else {
        const A = await open(b), X = await open(b, { url: RU });
        const P = await EV(A.pg, () => PRESETS.map((p, i) => ({ name: '预设' + i, song: p.make() })));
        const ALL = SAMPLES.map(s => ({ name: s.name, song: s.song })).concat(Array.isArray(P) ? P : []);
        const JP = ALL.filter(x => !(x.song.voxNotations || []).some(n => n === 'staff' || n === 'bass' || n === 'alto') && !x.song.tabStaff);
        const ren = L => L.map(s => { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(svg);
          renderOffscreen({ song: migrate(JSON.parse(JSON.stringify(s.song))), target: svg, paperW: 870, crop: true }); const h = svg.innerHTML; svg.remove(); return h; });
        const now = await EV(A.pg, ren, JP), ref = await EV(X.pg, ren, JP);
        const diff = Array.isArray(now) && Array.isArray(ref) ? JP.filter((x, i) => now[i] !== ref[i]).map(x => x.name) : ['运行失败'];
        T(JP.length >= 8 && !diff.length, 'B4 纯简谱 / 六线谱谱面（' + JP.length + ' 份，含预设）离屏输出与基线 v69.6（' + REF_COMMIT + '）逐字节相同', diff.join('、') || JP.length + ' / ' + JP.length);
        allErrs.push(...A.errs, ...X.errs); await A.close(); await X.close();
      }
      /* B5 几何口径（小样：五线谱人声两段词 + 同词简谱声部）：符干 3.5 / 朝下带符尾 3.75 线距、二度错位＝符头宽 − 0.25、
         五线谱段号「1.」右对齐在首字左缘外 ≥3px、简谱声部段号仍是「1」（不带点，逐字节旧写法） */
      { const A = await open(b);
        const r = await EV(A.pg, () => {
          const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
          const row = () => [V(6, 4, { lyrics: ['Schmer', 'Weckt'] }), V(2, 8, { oct: 1, lyrics: ['zen,', 'mich.'] }), V(0, 8), V(1, 2, { adds: [{ deg: 2, acc: '', oct: 0 }], lyrics: ['la', 'lo'] })];
          const s = { v: 3, title: 'B5', key: 'C', beats: 4, unit: 4, tempo: 80, capo: 0, customChords: {}, tabVoices: [], voxVoices: ['人声', '简谱'], voxNotations: ['staff', 'jianpu'], lyricLines: 2,
            measures: [{ tabs: [], voxes: [row(), row()] }, { tabs: [], voxes: [row(), row()] }] };
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); document.body.appendChild(svg);
          window.__pyqGeom = true; try { renderOffscreen({ song: migrate(s), target: svg, paperW: 870, crop: true }); } finally { window.__pyqGeom = false; }
          const q = (g, k) => [...svg.querySelectorAll('[data-g="' + g + '"][data-gq="' + k + '"]')];
          const tr = el => { const m = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\)/.exec(el.getAttribute('transform') || ''); return m ? [+m[1], +m[2]] : null; };
          const stemLen = k => { const st = q('stem', k)[0], hd = q('head', k).map(tr); if (!st || !hd.length) return null;
            const y1 = +st.getAttribute('y1'), y2 = +st.getAttribute('y2'), up = y2 < y1, hy = hd.map(h => h[1]);
            return +((up ? Math.min(...hy) - y2 : y2 - Math.max(...hy)) / 7.5).toFixed(2); };
          const hx = q('head', '0:0:3').map(tr).map(h => h[0]).sort((a, b) => a - b);
          const vs = [...svg.querySelectorAll('[data-g="verse"]')].map(el => ({ t: el.textContent, x: +el.getAttribute('x'), a: el.getAttribute('text-anchor'), y: +el.getAttribute('y') }));
          const ly0 = [...svg.querySelectorAll('[data-g="lyr"][data-gq="0:0:0"]')].map(el => { const b = el.getBBox(); return { x0: b.x, y: +el.getAttribute('y') }; });
          const jpV = [...svg.querySelectorAll('text[data-lyrsel]')].filter(el => !el.hasAttribute('data-g')).map(el => el.textContent);
          svg.remove();
          return { up4: stemLen('0:0:0'), dn8: stemLen('0:0:1'), dx: hx.length === 2 ? +(hx[1] - hx[0]).toFixed(2) : null, hw: +(smw('noteheadHalf') * 7.5).toFixed(2), vs, ly0, jpV };
        });
        const gapOk = !r.err && r.vs.length === 2 && r.vs.every(v => { const l = r.ly0.find(x => Math.abs(x.y - v.y) < 0.5); return v.a === 'end' && /^\d\.$/.test(v.t) && l && l.x0 - v.x >= 3; });
        T(!r.err && Math.abs(r.up4 - 3.5) < 0.06 && Math.abs(r.dn8 - 3.75) < 0.06 && r.dx != null && Math.abs(r.dx - (r.hw - 0.25)) < 0.11 && gapOk && J(r.jpV) === J(['1', '2']),
          'B5 几何：四分朝上符干 3.5、朝下带符尾八分 3.75 线距；二度错位＝符头宽 − 0.25；五线谱段号「1.」「2.」右对齐、首字左缘外 ≥3px；简谱声部段号仍为「1」「2」',
          J(r.err ? r : { up4: r.up4, dn8: r.dn8, dx: r.dx, hw: r.hw, vs: r.vs.map(v => v.t + '@' + v.x.toFixed(1) + v.a), ly0: r.ly0.map(l => l.x0.toFixed(1)), jpV: r.jpV }));
        allErrs.push(...A.errs); await A.close();
      }
    }

    /* ================= E 编辑器抽查（两套外壳） ================= */
    if (want('E')) {
      const sw = LIB.find(s => s.id === SWAN).song;
      for (const shell of ['flow', 'classic']) {
        const A = await open(b, { shell: shell === 'classic' ? 'classic' : null });
        const sx = shell === 'classic' ? '（旧外壳）' : '（新外壳）';
        await GC.inject(A.pg);
        const r = await EV(A.pg, s => { __ld(s); window.__pyqGeom = true; render(); const out = __gcRun(null, { svg: '#score' }); window.__pyqGeom = false; render();
          return { n: out.nItems, ped: out.pairs.filter(p => p.a.cls === 'ped' || p.b.cls === 'ped').map(p => p.cat + '@m' + p.m), all: out.pairs.length, clean: !document.querySelector('#score [data-g]') }; }, sw);
        T(!r.err && r.n > 1000 && r.clean, 'E1 编辑器 #score 可普查' + sx + '：开标记 render() 后标记元素 > 1000，关标记重排后 #score 无 data-g', J({ n: r.n, clean: r.clean, err: r.err }));
        T(!r.err && r.ped.length === 0, 'E2 编辑器 #score' + sx + '天鹅之歌：踏板 Ped.____* × 音符墨迹 0 处', (r.ped || []).length + ' 处 ' + J((r.ped || []).slice(0, 4)) + '（全部类别对 ' + r.all + ' 处）');
        /* E3（验收 B1 复现路径）：欢乐颂（教学对照谱，预设 #13）旋律第 1、5 小节首音加和弦名 → #score 谱表上方记号 × 和弦名框 0 处、净空 ≥1.5 */
        const r3 = await EV(A.pg, () => { const s = PRESETS[13].make(); [0, 4].forEach(mi => { const c = (s.measures[mi].voxes[0] || [])[0]; if (c) c.chord = mi ? 'G' : 'C'; });
          __ld(s); window.__pyqGeom = true; render(); const out = __gcRun(null, { svg: '#score' }); window.__pyqGeom = false; render();
          const AVM = ['ped', 'dyn', 'hairpin', 'dtext', 'tempo', 'expr', 'anno', 'ott'];
          const isCh = x => (x.a.cls === 'chord') !== (x.b.cls === 'chord') && (AVM.includes(x.a.cls) || AVM.includes(x.b.cls));
          return { ch: out.cnt.chord || 0, dyn: (out.cnt.dyn || 0) + (out.cnt.hairpin || 0), hit: out.pairs.filter(isCh).map(p => p.cat + '@m' + p.m), near: out.near.filter(isCh).map(p => p.cat + '@m' + p.m) }; });
        T(!r3.err && r3.ch >= 4 && r3.dyn >= 2 && !r3.hit.length && !r3.near.length, 'E3 编辑器 #score' + sx + '欢乐颂（教学对照谱）第 1、5 小节加和弦名：力度 / 渐强 × 和弦名框 0 处、净空 ≥1.5', J(r3));
        allErrs.push(...A.errs); await A.close();
      }
    }
    /* ================= L 断行轻压（验收 L1） ================= */
    if (want('L')) {
      const ave = (LIB.find(s => s.id === AVE) || LIB.find(s => /圣母颂/.test(s.name))).song;
      for (const shell of ['flow', 'classic']) {
        const A = await open(b, { shell: shell === 'classic' ? 'classic' : null });
        const sx = shell === 'classic' ? '（旧外壳）' : '（新外壳）';
        await GC.inject(A.pg);
        const r = await EV(A.pg, s => {
          __ld(s);
          const availW = PAGE_W - 2 * MARGIN - STAFF_HEAD_W, pages = document.querySelectorAll('#score .pagebg').length;
          const sys = layoutSystems();
          let sq = 0; const bad = []; let pairs = 0;
          sys.forEach(sy => {
            const rg = sy.measures.reduce((a, lm) => a + (lm.ksBefore || 0) + measureLayout(song.measures[lm.mi]).rigid, 0) + (sy.ksEnd || 0);
            if (rg > availW + 0.5) sq++;
            sy.measures.forEach(lm => (song.measures[lm.mi].voxes || []).forEach((cs, vi) => {
              const P = staffColPlan(lm.mi, vi), xs = lm.L.voxes[vi] && lm.L.voxes[vi].xs; if (!P || !xs) return;
              for (let ci = 0; ci + 1 < cs.length; ci++) {
                const kA = (cs[ci].clef && ci > 0) ? 18 : 0, kB = cs[ci + 1].clef ? 18 : 0;
                const need = P[ci].R + kA + Math.max(0, P[ci + 1].L - kB) + 1.5, got = (xs[ci + 1] - kB) - (xs[ci] - kA);
                pairs++; if (got < need - 0.05) bad.push('m' + (lm.mi + 1) + ' v' + vi + ' c' + ci + ' ' + got.toFixed(2) + '<' + need.toFixed(2));
              }
            }));
          });
          window.__pyqGeom = true; render(); const c = __gcRun(null, { svg: '#score' }); window.__pyqGeom = false; render();
          const later = /^(stem|flag|head|tie)×(stem|flag|head|tie)$/;   /* C17 圆滑线穿中间音（later 组，本版不修）只打印 */
          return { pages, rows: sys.length, sq, pairs, bad: bad.slice(0, 6), nBad: bad.length,
            pairsC: c.pairs.filter(p => !(later.test(p.cat) && /tie/.test(p.cat))).map(p => p.cat + '@m' + p.m).slice(0, 8),
            nearC: c.near.filter(p => p.a.cls !== 'hairpin' && p.b.cls !== 'hairpin').map(p => p.cat + '@m' + p.m).slice(0, 8) };
        }, ave);
        /* 旧外壳纸面窄（行宽 564，三个版本都是 17 行 9 页、没有要轻压的行）：只打印，几何两项照样断言 */
        if (shell === 'flow') T(!r.err && r.pages <= 7 && r.rows === 13 && r.sq >= 1, 'L1a 编辑器' + sx + '圣母颂：刚杆超行宽 ≤2% 的行轻压弹性空白 → 13 行 7 页（合并版 15 行 8 页；v69.6 13 行 7 页）', J({ pages: r.pages, rows: r.rows, sq: r.sq, err: r.err }));
        else console.log('ℹ️ L1a 编辑器' + sx + '圣母颂（不断言）：' + J({ pages: r.pages, rows: r.rows, sq: r.sq }));
        T(!r.err && r.pairs > 500 && !r.nBad, 'L1b 编辑器' + sx + '圣母颂全部行：五线谱声部相邻两列墨迹（临时记号栈 / 错位符头 / 加线 / 附点 / 符干）净距仍 ≥1.5（B 组净距没被压穿）', J({ pairs: r.pairs, nBad: r.nBad, bad: r.bad }));
        T(!r.err && !r.pairsC.length && !r.nearC.length, 'L1c 编辑器' + sx + '圣母颂 #score 普查：记号 / 墨迹相交 0 处（圆滑线 C17 不计）、记号对墨迹净空 ≥1.5', J({ pairs: r.pairsC, near: r.nearC }));
        allErrs.push(...A.errs); await A.close();
      }
      /* L2 曲库 10 首：编辑器（新外壳）页数不多于 v69.6 */
      const RU = refUrl();
      if (!RU) console.log('⚠️ L2 跳过：拿不到基线页（可设 env V697_REF）');
      else {
        const cnt = async (u, shell) => { const X = await open(b, { url: u, shell }); const out = [];
          for (const s of LIB) out.push(await EV(X.pg, so => { __ld(so); return document.querySelectorAll('#score .pagebg').length; }, s.song));
          allErrs.push(...X.errs); await X.close(); return out; };
        const now = await cnt(URL0), ref = await cnt(RU);
        const rows = LIB.map((s, i) => s.name.replace(/（.*/, '') + ' ' + ref[i] + '→' + now[i]);
        const worse = LIB.filter((s, i) => !(now[i] <= ref[i])).map(s => s.name);
        T(LIB.length === 10 && !worse.length, 'L2 曲库 10 首编辑器（默认新外壳）页数不多于 v69.6（' + REF_COMMIT + '）', rows.join('；') + (worse.length ? '｜多了：' + worse.join('、') : ''));
        /* 旧外壳（兜底，纸面窄）只打印：合并版起城市 12→13 页（自然宽 +5% 后断行代价变了，不是刚杆放不下，轻压管不到） */
        const nowC = await cnt(URL0, 'classic'), refC = await cnt(RU, 'classic');
        console.log('ℹ️ L2 旧外壳页数（不断言）：' + LIB.map((s, i) => s.name.replace(/（.*/, '') + ' ' + refC[i] + '→' + nowC[i]).join('；'));
      }
    }
  } catch (e) { T(false, 'ZZ 运行异常', String(e && e.stack || e).slice(0, 600)); }
  T(!allErrs.length, 'ZZ 无页面错误', J(allErrs.slice(0, 5)));
  console.log(`\nPASS ${pass}/${total}` + (fails.length ? '  红：' + fails.join(' ') : ''));
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
