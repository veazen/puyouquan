/* tv_strumtie — 扫弦保持（延留）连音线（v60.11）
   用户反馈：「如何选中扫弦并设置连音线？这是扫弦中常用的技巧。」
   查下来是两处都不成立：
     ① 数据层：toggleTie 的 TAB 分支只把**首音连到末音**一条线，放到扫弦列上
        就是从 1 弦斜穿到 6 弦（实测 6 根弦只有 1 根拿到 tk）；
     ② 渲染层：扫弦列走 col.strum 分支只画箭头，根本不进画 tk 弧的那段代码，
        所以哪怕数据对了也一条线都看不见。
   本套件同时钉住这两层，外加「别把原有的两单音跨列相连（推弦目标那种）改坏」。
   位置用几何断言（数值坐标）判定，不看截图。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');

let pass = 0, fail = 0;
const T = (ok, name, detail) => {
  if (ok) { pass++; console.log('✅ ' + name + (detail ? ': ' + detail : '')); }
  else { fail++; console.log('❌ ' + name + (detail ? ': ' + detail : '')); }
};

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const pg = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e.message)));
  await pg.goto(FILE); await pg.waitForTimeout(900);

  const r = await pg.evaluate(() => {
    const out = {};
    const mk = () => ({ dur: 8, dotted: false, chord: '', strum: 'd', tech: '',
      notes: [{ s: 6, f: 3 }, { s: 5, f: 2 }, { s: 4, f: 0 }, { s: 3, f: 0 }, { s: 2, f: 0 }, { s: 1, f: 3 }] });
    /* 只 loadSong 一次；后续每个用例**就地重建列**再跑。
       坑：loadSong 第二次调用不会把 song 换成新对象（实测 song===s 为 false、且上一用例的
       tk 还在），照着「每次 fresh 都重新 loadSong」写会让用例之间串味——
       B 用例当时读到的是 A 留下的连线，toggleTie 正确地把它**取消**了，于是断言假红。
       教训：重置要落到被断言的那份数据上，别假设 loader 会替你清干净。 */
    loadSong(createSong('tanchang', { title: '扫弦保持', inst: 'steel', beats: 4, unit: 4,
      nMea: 1, nTab: 1, nVox: 0, lyr: 0 }));
    const fresh = () => {
      song.measures[0].tabs[0] = [mk(), mk(), mk(), mk()];
      song.measures[0].tabs[0][0].chord = 'G';
      noteSel = []; selRange = null; blurSel = true;
    };
    const col = ci => song.measures[0].tabs[0][ci];
    /* tieSVG 的产物：M x y Q .. Q .. Z 的闭合双二次曲线，用它把连音线从别的 path 里挑出来 */
    const arcs = () => Array.from(document.querySelectorAll('#score path'))
      .map(p2 => p2.getAttribute('d') || '')
      .filter(d => /^M [\d.]+ [\d.]+ Q [\d.]+ [\d.]+ [\d.]+ [\d.]+ Q [\d.]+ [\d.]+ [\d.]+ [\d.]+ Z$/.test(d))
      .map(d => { const m = /^M ([\d.]+) ([\d.]+) Q [\d.]+ [\d.]+ ([\d.]+) ([\d.]+)/.exec(d);
        return { x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4] }; });

    // ── A 数据层：框选两列扫弦 → 逐弦对位相连 ──
    fresh();
    selRange = { row: 'tab', vi: 0, m1: 0, c1: 0, m2: 0, c2: 1 };
    out.poolN = selNotes().length;
    toggleTie();
    out.A = col(0).notes.map(n => ({ s: n.s, tk: n.tk ? [n.tk.ci, n.tk.si] : null }));

    // ── B 只框选一列 → 自动连到本小节下一个有音的列 ──
    fresh();
    selRange = { row: 'tab', vi: 0, m1: 0, c1: 0, m2: 0, c2: 0 };
    toggleTie();
    out.B = col(0).notes.map(n => ({ s: n.s, tk: n.tk ? [n.tk.ci, n.tk.si] : null }));
    // 再点一次 = 取消（开关语义）
    selRange = { row: 'tab', vi: 0, m1: 0, c1: 0, m2: 0, c2: 0 };
    toggleTie();
    out.Boff = col(0).notes.filter(n => n.tk).length;

    // ── C 原有行为不能被改坏：Ctrl 选两个单音仍是「跨列单线」 ──
    fresh();
    noteSel = [{ mi: 0, ci: 0, si: 3, vi: 0, row: 'tab' }, { mi: 0, ci: 2, si: 3, vi: 0, row: 'tab' }];
    toggleTie();
    out.C = { tied: col(0).notes.filter(n => n.tk).length,
      tk: (col(0).notes.find(n => n.s === 3) || {}).tk ? [col(0).notes.find(n => n.s === 3).tk.ci,
        col(0).notes.find(n => n.s === 3).tk.si] : null };

    // ── D 渲染层：扫弦列必须真的画出一条弧，位置在六线谱**上方**，且给和弦图让出了位 ──
    const staffTopNow = () => Math.min(...Array.from(document.querySelectorAll('#score .strumcell'))
      .map(c => c.getBBox().y));
    fresh(); render();
    out.arcBefore = arcs().length;
    out.staffTopNoTie = +staffTopNow().toFixed(1);   // 无连音线时的谱表顶（对照）
    selRange = { row: 'tab', vi: 0, m1: 0, c1: 1, m2: 0, c2: 2 };
    toggleTie(); selRange = null; noteSel = []; blurSel = true; render();
    const aa = arcs();
    out.arcAfter = aa.length;
    if (aa.length === 1) {
      const a = aa[0];
      const bb = Array.from(document.querySelectorAll('#score .strumcell')).map(c => c.getBBox());
      const staffTop = Math.min(...bb.map(b => b.y));
      const cx = i => bb[i].x + bb[i].width / 2;
      out.geo = {
        flat: Math.abs(a.y1 - a.y2) < 0.6,                                // 两端等高（不是斜穿）
        aboveStaff: a.y1 < staffTop,                                      // 画在六线谱上方
        spansPair: a.x1 > cx(1) - 2 && a.x2 < cx(2) + 2 && a.x2 > a.x1,   // 恰好跨第2→第3列
        y: +a.y1.toFixed(1), staffTop: +staffTop.toFixed(1),
        x1: +a.x1.toFixed(1), x2: +a.x2.toFixed(1), c1x: +cx(1).toFixed(1), c2x: +cx(2).toFixed(1),
      };
      /* 让位验证：本行有和弦图（fresh 里给第 1 列挂了 G），加上连音线后整个谱表应被
         diagExtra 往下推 14px——这就是「弧不会压到和弦图」的可复算证据，
         比拿和弦图那张图的墨迹去比对稳得多。 */
      out.headroom = +(staffTop - out.staffTopNoTie).toFixed(1);
    }
    return out;
  });

  T(r.poolN === 12, 'A0 框选两列扫弦展开出 12 个音（2 列 × 6 弦）', 'n=' + r.poolN);
  const okA = r.A.length === 6 && r.A.every(n => n.tk && n.tk[0] === 1 && n.tk[1] === n.s);
  T(okA, 'A1 两列扫弦：每根弦连到下一列的**同一根弦**（不是首音斜连末音）',
    r.A.map(n => n.s + '→' + (n.tk ? n.tk.join('/') : '无')).join(' '));
  const okB = r.B.length === 6 && r.B.every(n => n.tk && n.tk[0] === 1 && n.tk[1] === n.s);
  T(okB, 'B1 只选一列：自动连到下一个有音的列，同样逐弦对位',
    r.B.map(n => n.s + '→' + (n.tk ? n.tk.join('/') : '无')).join(' '));
  T(r.Boff === 0, 'B2 再点一次整列取消（开关语义）', '剩余带线弦数=' + r.Boff);
  T(r.C.tied === 1 && r.C.tk && r.C.tk[0] === 2 && r.C.tk[1] === 3,
    'C 原有「Ctrl 选两单音跨列相连」未被改坏（仍是单线、仍跨到第3列）', JSON.stringify(r.C));
  T(r.arcBefore === 0 && r.arcAfter === 1,
    'D1 扫弦列真的画出连音线，且整个和弦只画一条（无品位数字可依附，逐弦 6 条不合刻版惯例）',
    '前=' + r.arcBefore + ' 后=' + r.arcAfter);
  T(!!(r.geo && r.geo.flat && r.geo.aboveStaff && r.geo.spansPair),
    'D2 弧位几何：两端等高 · 画在六线谱上方 · 恰好跨被连的两列', JSON.stringify(r.geo));
  T(r.headroom >= 13 && r.headroom <= 15,
    'D3 有和弦图时整行被 diagExtra 下推 14px 让出弧位（弧不会压到和弦图）',
    '下推=' + r.headroom + 'px');

  if (errs.length) { fail++; console.log('❌ 页面报错: ' + errs.slice(0, 3).join(' | ')); }
  else console.log('NO ERRORS');
  console.log('PASS ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
