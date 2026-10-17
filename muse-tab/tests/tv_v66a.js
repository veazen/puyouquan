/* v66.0 v4「画廊」一期（零视觉变化）+ D7 裁切修复
   T1 D7：向导新建的固定版宽歌谱，1440×900 左右面板全开时末小节线不被裁（显示缩放 ≥70%）
      （v67.7 版宽 870 ＋ 自动收起门槛 FIT_DOCK 90%：1440 停靠只有 87% → 左栏自动收起一次，改判「收起、显示 ≥90%、不裁」）
   T2 D7：1366×768 放不下 → 左栏面板自动收起一次、谱面完整；用户再打开面板 → 面板改浮层（body.paper-tight），谱面不被挤窄也不被裁
   T3 D7：手动放大到放不下 → #paper.paper-xs 可横向滚动，滚到底末小节线可见
   T4 非固定版宽预设不受影响：无 paper-tight、无 paper-xs，面板保持停靠（v67.7：同页 T1 已把左栏自动收起，先点「小节」页签再打开，非固定谱面板应停靠）
   T5 动效 / 材质开关：测试环境无 html.fx、有 html.noglass，--fx-pop=0ms；?fx=1 → html.fx 且 --fx-pop=340ms；?glass=1 → 无 noglass
   T6 谱面令牌隔离层：#paper 的 --accent / --muted / --border 取纸面常量（＝:root --ed-brand / --ed-print-muted / --ed-print-border），
      浅深两主题相同（谱纸恒浅）、界面 #top 随主题变；改 :root --sc-pen 只改谱面不改界面
      （v66.5 换色前本条断言「#paper 与界面相同」——那是 v66.0 零视觉变化期的过渡状态，v66.5 起谱面定纸面值）
   T7 打印：深色主题下打印，谱面刻版灰字回到纸面值（＝--ed-print-muted，不是深色主题浅灰；v66.5 前期望值写死 #6b6357）
   T8 --font-chrome：按钮与顶栏字体＝正文字体（此版零变化）
   突变实证：对 v65.7 文件复跑，T1–T3、T5–T7 报红。
   v68.2 切默认（flow）：T1–T4 是 D7（旧外壳左栏 #left-flyout 自动收起 / 浮层 paper-tight）——这一段钉 ?shell=classic；T5–T8（动效材质开关 / 令牌 / 打印 / 字体）外壳无关，
   在默认外壳跑。另加 flow 段 T1f–T4f：同一「固定版宽谱在常见桌面视口完整显示」意图在新外壳的口径——flow 左栏 #flw-left 常驻 248（没有 D7：
   不收起、不挂 paper-tight、FLY_AUTO_CLOSED 不消耗），1440 / 1366 新建谱末小节线不裁、显示 ≥ FIXED_A4×FIT_DOCK；手动放大放不下 → #paper.paper-xs 横滚到底可见；
   非固定预设无兜底类（1280 / 1440 的谱纸宽另见 tv_trktree T26） */
const { chromium } = require('playwright');
const path = require('path');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = [];
  let FA4 = null, DOCK = null;   // v67.7 期望值读页面常量 FIXED_A4（1060→870）/ FIT_DOCK（0.9）
  const open = async (w, h, q) => { const pg = await b.newPage({ viewport: { width: w, height: h } }); pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('file://' + FILE + (q ? '?' + q : '')); await pg.waitForTimeout(900);
    if (FA4 == null) ({ FA4, DOCK } = await pg.evaluate(() => ({ FA4: typeof FIXED_A4 === 'number' ? FIXED_A4 : null, DOCK: typeof FIT_DOCK === 'number' ? FIT_DOCK : null })));
    return pg; };
  const wizard = (pg) => pg.evaluate(`(async()=>{ guardReplace=(p)=>p(); showNewWizard(); await new Promise(r=>setTimeout(r,80));
    const iv=document.querySelector('.nw-int[data-int="vocal"], .nf-modal [data-scene="vocal"]'); if(iv) iv.click();   /* v67.4 新建面板：「歌谱 · 合唱」用途（原声乐意图卡） */ await new Promise(r=>setTimeout(r,80));
    const c=document.getElementById('nw-create'); if(c) c.click(); await new Promise(r=>setTimeout(r,600)); return true; })()`);
  const geo = (pg) => pg.evaluate(() => { const P = document.getElementById('paper'), sv = document.getElementById('score'); const pr = P.getBoundingClientRect();
    let maxR = 0; sv.querySelectorAll('line').forEach(e => { const q = e.getBoundingClientRect(); if (q.height > 10 && q.width < 4 && q.right > maxR) maxR = q.right; });
    const fly = document.getElementById('left-flyout'), fr = fly.getBoundingClientRect(), fl = document.getElementById('flw-left'), flr = fl ? fl.getBoundingClientRect() : null;
    return { fixed: !!(song.layout && song.layout.fixed), svgW: +sv.getAttribute('width'), paperL: Math.round(pr.left), paperR: Math.round(pr.right), barR: Math.round(maxR),
      clipped: Math.max(0, Math.round(maxR - pr.right)), flyHidden: fly.classList.contains('hidden'), flyPos: getComputedStyle(fly).position, flyR: Math.round(fr.right),
      tight: document.body.classList.contains('paper-tight'), xs: P.classList.contains('paper-xs'),
      flow: document.body.classList.contains('flow'), flwL: flr && flr.width > 0 ? Math.round(flr.width) : 0, flwR: flr ? Math.round(flr.right) : 0, autoClosed: typeof FLY_AUTO_CLOSED !== 'undefined' ? !!FLY_AUTO_CLOSED : null }; });

  /* T1（旧外壳段） */
  let pg = await open(1440, 900, 'shell=classic'); await wizard(pg); let g = await geo(pg);
  /* v67.7：1440 停靠 870×0.9 > 可用宽 → 左栏自动收起一次（此前停靠 ≥70% 即可）；收起后显示 ≥FIT_DOCK、不裁、无浮层类 */
  T(g.fixed && g.clipped === 0 && DOCK != null && g.svgW >= Math.floor(FA4 * DOCK) && g.flyHidden && !g.tight && g.flyPos !== 'fixed', 'T1 1440×900 固定版宽谱：左栏自动收起一次（v67.7 门槛 90%）、末小节线不被裁（缩放 ≥90%）', JSON.stringify(g));
  /* T3 */
  await pg.evaluate(() => { for (let i = 0; i < 4; i++) document.getElementById('z-in').click(); });
  await pg.waitForTimeout(500);
  let g3 = await pg.evaluate(() => { const P = document.getElementById('paper'); P.scrollLeft = P.scrollWidth; return { xs: P.classList.contains('paper-xs'), sw: P.scrollWidth, cw: P.clientWidth, ov: getComputedStyle(P).overflowX }; });
  await pg.waitForTimeout(150); const g3b = await geo(pg);
  T(g3.xs && g3.ov === 'auto' && g3.sw > g3.cw && g3b.barR <= g3b.paperR + 1, 'T3 手动放大放不下 → #paper 横向可滚，滚到底末小节线可见', JSON.stringify({ g3, barR: g3b.barR, paperR: g3b.paperR }));
  /* T4 */
  await pg.evaluate(() => { while (viewZoom > 1.001) document.getElementById('z-out').click(); guardReplace = p => p(); loadSong(PRESETS[0].make()); render(); });
  await pg.waitForTimeout(400);
  /* v67.7：T1 已把左栏自动收起（v67.6 1440 不收起），用户再打开左栏（真实点「小节」页签）——非固定版宽谱应停靠、不挂浮层类 */
  if (await pg.evaluate(() => document.getElementById('left-flyout').classList.contains('hidden'))) { await pg.click('.ltab[data-t="mea"]'); await pg.waitForTimeout(500); }
  g = await geo(pg);
  T(!g.fixed && !g.tight && !g.xs && !g.flyHidden && g.clipped === 0, 'T4 非固定版宽预设不受影响（面板停靠、无兜底类）', JSON.stringify(g));
  await pg.close();
  /* T2（旧外壳段） */
  pg = await open(1366, 768, 'shell=classic'); await wizard(pg); g = await geo(pg);
  const t2a = g.clipped === 0 && g.flyHidden && !g.tight && g.svgW >= Math.floor(FA4 * 0.8);   // v67.7 1060 → FIXED_A4
  await pg.evaluate(() => { const b = document.querySelector('.ltab[data-t]'); b.click(); if (document.getElementById('left-flyout').classList.contains('hidden')) b.click(); });
  await pg.waitForTimeout(500); const g2 = await geo(pg);
  T(t2a && !g2.flyHidden && g2.tight && g2.flyPos === 'fixed' && g2.clipped === 0 && g2.svgW >= g.svgW - 2, 'T2 1366×768 面板自动收起一次、谱面完整；再打开 → 浮层，谱面不被挤窄', JSON.stringify({ g, g2 }));
  /* T5 */
  let r = await pg.evaluate(() => ({ fx: document.documentElement.classList.contains('fx'), ng: document.documentElement.classList.contains('noglass'), pop: getComputedStyle(document.documentElement).getPropertyValue('--fx-pop').trim() }));
  await pg.close();
  pg = await open(800, 600, 'fx=1&glass=1');
  const r2 = await pg.evaluate(() => ({ fx: document.documentElement.classList.contains('fx'), ng: document.documentElement.classList.contains('noglass'), pop: getComputedStyle(document.documentElement).getPropertyValue('--fx-pop').trim() }));
  T(!r.fx && r.ng && r.pop === '0ms' && r2.fx && !r2.ng && r2.pop === '340ms', 'T5 动效 / 材质开关（测试环境关、?fx=1 / ?glass=1 开）', JSON.stringify({ r, r2 }));
  await pg.close();
  /* ===== flow 段（默认外壳）：T1f–T4f ===== */
  { const fr = {};
    for (const [w, h] of [[1440, 900], [1366, 768]]) {
      const pf = await open(w, h); await wizard(pf); fr[w] = await geo(pf);
      if (w === 1440) {   /* T3f：手动放大到放不下 → #paper.paper-xs 横滚，滚到底末小节线可见；T4f：非固定预设不挂兜底类 */
        await pf.evaluate(() => { for (let i = 0; i < 4; i++) document.getElementById('z-in').click(); }); await pf.waitForTimeout(500);
        fr.x3 = await pf.evaluate(() => { const P = document.getElementById('paper'); P.scrollLeft = P.scrollWidth; return { xs: P.classList.contains('paper-xs'), sw: P.scrollWidth, cw: P.clientWidth, ov: getComputedStyle(P).overflowX, zoomVis: (() => { const z = document.getElementById('z-in'); return !!z && z.getClientRects().length > 0; })() }; });
        await pf.waitForTimeout(150); fr.x3b = await geo(pf);
        await pf.evaluate(() => { while (viewZoom > 1.001) document.getElementById('z-out').click(); guardReplace = p => p(); loadSong(PRESETS[0].make()); render(); }); await pf.waitForTimeout(400);
        fr.x4 = await geo(pf);
      }
      await pf.close();
    }
    const okF = g => g.flow && g.fixed && g.clipped === 0 && DOCK != null && g.svgW >= Math.floor(FA4 * DOCK) && !g.tight && g.flwL === 248 && g.paperL >= g.flwR - 1 && g.autoClosed === false;
    T(okF(fr[1440]), 'T1f flow 1440×900 固定版宽谱：左栏常驻 248、不自动收起（无 D7 / 无浮层类）、末小节线不裁、显示 ≥' + Math.floor(FA4 * DOCK), JSON.stringify(fr[1440]));
    T(okF(fr[1366]), 'T2f flow 1366×768 固定版宽谱：同上（左栏常驻、谱面完整、显示 ≥' + Math.floor(FA4 * DOCK) + '）', JSON.stringify(fr[1366]));
    T(fr.x3.xs && fr.x3.ov === 'auto' && fr.x3.sw > fr.x3.cw && fr.x3b.barR <= fr.x3b.paperR + 1, 'T3f flow 手动放大放不下 → #paper 横向可滚，滚到底末小节线可见', JSON.stringify({ x3: fr.x3, barR: fr.x3b.barR, paperR: fr.x3b.paperR }));
    T(!fr.x4.fixed && !fr.x4.tight && !fr.x4.xs && fr.x4.clipped === 0 && fr.x4.flwL === 248, 'T4f flow 非固定版宽预设不受影响（无兜底类、左栏常驻）', JSON.stringify(fr.x4));
  }
  /* T6 */
  pg = await open(1440, 900);
  r = await pg.evaluate(() => { const v = (el, n) => getComputedStyle(el).getPropertyValue(n).trim(); const P = document.getElementById('paper'), R = document.documentElement, top = document.getElementById('top');
    const out = {}; for (const th of ['light', 'dark']) { R.dataset.theme = th; out[th] = { pa: v(P, '--accent'), ra: v(top, '--accent'), pm: v(P, '--muted'), rm: v(top, '--muted'), pb: v(P, '--border'), rb: v(top, '--border') }; }
    out.k = { pen: v(R, '--ed-brand'), muted: v(R, '--ed-print-muted'), border: v(R, '--ed-print-border') };
    R.dataset.theme = 'light'; R.style.setProperty('--sc-pen', '#0071e3'); out.iso = { pa: v(P, '--accent'), ta: v(top, '--accent') }; R.style.removeProperty('--sc-pen'); return out; });
  const paperK = (o) => !!r.k.pen && o.pa === r.k.pen && o.pm === r.k.muted && o.pb === r.k.border;
  T(paperK(r.light) && paperK(r.dark) && r.dark.ra !== r.light.ra && r.dark.rm !== r.light.rm && r.iso.pa === '#0071e3' && r.iso.ta === r.light.ra,
    'T6 谱面令牌隔离层：谱面取纸面常量、两主题不漂移，界面随主题变；改 --sc-pen 只动谱面', JSON.stringify(r));
  /* T7 */
  const k7 = await pg.evaluate(() => { const R = document.documentElement; R.dataset.theme = 'dark'; const v = n => getComputedStyle(R).getPropertyValue(n).trim();
    return { printMuted: v('--ed-print-muted'), darkMuted: v('--muted') }; });
  await pg.emulateMedia({ media: 'print' });
  r = await pg.evaluate(() => getComputedStyle(document.getElementById('paper')).getPropertyValue('--muted').trim());
  await pg.emulateMedia({ media: 'screen' });
  T(!!k7.printMuted && r === k7.printMuted && r !== k7.darkMuted, 'T7 深色主题打印：刻版灰字回纸面值（--ed-print-muted）', JSON.stringify({ r, k7 }));
  /* T8 */
  r = await pg.evaluate(() => { document.documentElement.dataset.theme = 'light'; const f = el => getComputedStyle(el).fontFamily; const r1 = [...document.querySelectorAll('#flw-r1 button')].find(x => x.getClientRects().length);   /* v68.2：默认外壳可见的行 1 按钮也读 --font-chrome */
    return { body: f(document.body), btn: f(document.getElementById('b-new')), top: f(document.getElementById('top')), r1: r1 ? f(r1) : null }; });
  T(r.body === r.btn && r.body === r.top && r.r1 === r.body, 'T8 --font-chrome 此版零变化（含 flow 行 1 按钮）', JSON.stringify(r));
  await pg.close();
  T(!errs.length, '无页面脚本错误', errs.slice(0, 3).join(' | '));
  console.log(`\nPASS ${pass}/${total}`); await b.close(); process.exit(pass === total ? 0 : 1);
})();
