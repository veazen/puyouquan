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
   E   编辑器抽查（两套外壳）：载入天鹅之歌、开标记 render()，#score 普查踏板 × 墨迹 0 处；关标记重排后 #score 无 data-g。
   env：MUSETAB_URL 被测页（缺省 ../index.html）· V697_REF 基线页（文件或 file:// URL；缺省 git show e8dc1c8，只在跑 Z1 时用）· ONLY=Z,Z1,G,S,E 只跑部分。 */
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
        T(offs.length === ALL.length && !bad.length, 'Z2 调试标记开 / 关两次排版，抹掉 data-g / data-gq 后逐字节相同（' + ALL.length + ' 份：曲库 10 · 压力 10 · 预设 16）', bad.join('、') || ALL.length + ' / ' + ALL.length);
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
    if (want('G') || want('S')) {
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
        allErrs.push(...A.errs); await A.close();
      }
    }
  } catch (e) { T(false, 'ZZ 运行异常', String(e && e.stack || e).slice(0, 600)); }
  T(!allErrs.length, 'ZZ 无页面错误', J(allErrs.slice(0, 5)));
  console.log(`\nPASS ${pass}/${total}` + (fails.length ? '  红：' + fails.join(' ') : ''));
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
