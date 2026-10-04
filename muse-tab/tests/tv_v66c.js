/* v66.2 v4「画廊」三期：编辑器 Apple 生产力布局（预览开关 ?skin=next）
   T1 缺省不启用：无 body.sn，顶栏 / 播放条 / 左栏保持原结构（#mixer-dock 不在 #top 内）
   T2 ?skin=next（1440×900）：body.sn；#mixer-dock 整节点在工具栏中段、#b-play 仍可点；#ribbon 在右栏「格式」页；左栏隐藏；
      musetab-skin 记住（重开不带参数仍启用）；?skin=off 关闭
   T3 钩子只搬不删：#b-new #b-open #b-save #b-savemine #b-layout #b-preview #b-print #b-library #b-circle #b-theme #b-invert #b-member #seg-undo #mixer-dock 都还在 DOM
   T4 工具栏：信息窗显示小节 / 速度 / 调号 / 拍号，点「♩」打开速度弹窗；「导出」打开打印 / 导出弹窗；文档名＝曲名
   T5 实心蓝只在「导出」（工具栏内一处）；播放键为墨色
   T6 谱面占比（1440×900）≥ 58%，谱面不被裁（svg 宽 ≤ 纸宽）
   T7 轨 ▾：菜单列出图层，点「旋律」切到旋律图层（左轨 .ltab.on 跟随、轨胶囊文字更新）
   T8 检查器：点检查器钮收起 / 再展开（记忆 musetab-insp）；1280 宽默认收起，展开后为浮层（position:fixed）
   T9 保存状态：编辑后显示「正在保存…」，落盘后「已存本机」
   T10 手机看谱迷你胶囊：曲名 + 第 n / N 小节、高 64 胶囊、实心蓝播放、谱架留在胶囊（v60.97 产品指示）、节拍器 / 音轨 / 设置收进面板
   T11 「⋯」展开为底部面板；T12 播放中下滑 → 页首收起、胶囊缩小，停播复原（?autohide=1）；T13 测试环境默认不自动收起
   突变实证：对 v66.1 文件复跑，T2–T9 报红（T1 为护栏）。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const open = async (q, c) => { const pg = await (c || ctx).newPage(); pg.on('pageerror', e => errs.push(e.message)); await pg.goto('file://' + FILE + (q || '')); await pg.waitForTimeout(1000);
    await pg.evaluate(() => { guardReplace = p => p(); hideStartPad(); loadSong(PRESETS[0].make()); render(); }); await pg.waitForTimeout(300); return pg; };
  /* T1 */
  let pg = await open();
  let r = await pg.evaluate(() => ({ sn: document.body.classList.contains('sn'), dockInTop: !!document.querySelector('#top #mixer-dock'), left: getComputedStyle(document.getElementById('left-dock')).display }));
  await pg.close();
  T(!r.sn && !r.dockInTop && r.left !== 'none', 'T1 缺省不启用新布局', JSON.stringify(r));
  /* T2 */
  pg = await open('?skin=next');
  r = await pg.evaluate(() => ({ sn: document.body.classList.contains('sn'), dockInC: !!document.querySelector('#top .sn-c #mixer-dock'), play: !!document.querySelector('#top #b-play'),
    rib: !!document.querySelector('#right-dock [data-rt="fmt"] #ribbon'), fmtTab: !!document.querySelector('#rtabs .rtab[data-p="fmt"]'), left: getComputedStyle(document.getElementById('left-dock')).display,
    key: localStorage.getItem('musetab-skin') }));
  const pgR = await open(''); const rem = await pgR.evaluate(() => document.body.classList.contains('sn')); await pgR.close();
  const pgO = await open('?skin=off'); const off = await pgO.evaluate(() => ({ sn: document.body.classList.contains('sn'), key: localStorage.getItem('musetab-skin') })); await pgO.close();
  T(r.sn && r.dockInC && r.play && r.rib && r.fmtTab && r.left === 'none' && r.key === 'next' && rem && !off.sn && off.key === null, 'T2 ?skin=next 新布局（播放坞进工具栏、格式页接管面板、记住 / 可关闭）', JSON.stringify({ r, rem, off }));
  await pg.close(); pg = await open('?skin=next');
  /* T3 */
  r = await pg.evaluate(() => ['b-new', 'b-open', 'b-save', 'b-savemine', 'b-layout', 'b-preview', 'b-print', 'b-library', 'b-circle', 'b-theme', 'b-invert', 'b-member', 'seg-undo', 'mixer-dock', 'left-flyout', 'ribbon', 'eb-zoom'].filter(id => !document.getElementById(id)));
  T(r.length === 0, 'T3 钩子只搬不删', JSON.stringify(r));
  /* T4 */
  r = await pg.evaluate(async () => { const lcd = document.getElementById('sn-lcd'); const txt = lcd.textContent; const doc = document.getElementById('sn-doc').textContent;
    lcd.querySelector('[data-h="tempo"]').click(); await new Promise(r => setTimeout(r, 120)); const tp = !!document.getElementById('tp-val') || !!document.querySelector('.popmenu'); closePop(); closeModal();
    document.getElementById('sn-export').click(); await new Promise(r => setTimeout(r, 120)); const ex = !!document.querySelector('.modal') && /打印|导出/.test(document.querySelector('.modal').textContent); closeModal();
    return { txt, doc, tp, ex }; });
  T(/小节 1/.test(r.txt) && /= 92/.test(r.txt) && /1 = C/.test(r.txt) && /4\/4/.test(r.txt) && /小星星/.test(r.doc) && r.tp && r.ex, 'T4 信息窗 / 速度弹窗 / 导出 / 文档名', JSON.stringify(r));
  /* T5 */
  r = await pg.evaluate(() => { const blue = [...document.querySelectorAll('#top *')].filter(e => /rgb\(0, 113, 227\)/.test(getComputedStyle(e).backgroundColor) && e.getBoundingClientRect().width > 8).map(e => e.id);
    return { blue, play: getComputedStyle(document.getElementById('b-play')).backgroundColor }; });
  T(r.blue.length === 1 && r.blue[0] === 'sn-export' && /29, 29, 31/.test(r.play), 'T5 实心蓝只给导出，播放墨色', JSON.stringify(r));
  /* T6 */
  r = await pg.evaluate(() => { const sv = document.getElementById('score').getBoundingClientRect(), P = document.getElementById('paper'), wr = document.getElementById('score-wrap').getBoundingClientRect();
    return { pct: Math.round(100 * Math.min(sv.width, wr.width) * (innerHeight - wr.top) / (innerWidth * innerHeight)), svgW: Math.round(sv.width), paperW: P.clientWidth }; });
  T(r.pct >= 58 && r.svgW <= r.paperW + 1, 'T6 谱面占比 ≥58%、不被裁', JSON.stringify(r));
  /* T7 */
  r = await pg.evaluate(async () => { document.getElementById('sn-trk').click(); await new Promise(r => setTimeout(r, 60)); const items = [...document.querySelectorAll('#popmenu [data-sn-t]')].map(x => x.textContent);
    const mel = [...document.querySelectorAll('#popmenu [data-sn-t]')].find(x => /旋律/.test(x.textContent)); if (mel) mel.click(); await new Promise(r => setTimeout(r, 120));
    return { items, on: (document.querySelector('#left-rail .ltab.rtrk.on .lb') || document.querySelector('#left-rail .ltab.rtrk.on') || {}).textContent, trk: document.getElementById('sn-trk').textContent }; });
  T(r.items.length >= 3 && /旋律/.test(r.on || '') && /旋律/.test(r.trk), 'T7 轨 ▾ 切换图层', JSON.stringify(r));
  /* T8 */
  r = await pg.evaluate(async () => { const ins = document.getElementById('sn-insp'); const a = getComputedStyle(document.getElementById('right-dock')).display; ins.click(); await new Promise(r => setTimeout(r, 80));
    const b2 = getComputedStyle(document.getElementById('right-dock')).display; const k = localStorage.getItem('musetab-insp'); ins.click(); await new Promise(r => setTimeout(r, 80));
    return { a, b2, k, c: getComputedStyle(document.getElementById('right-dock')).display }; });
  await pg.close();
  const c2 = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const pg2 = await open('?skin=next', c2);
  const r2 = await pg2.evaluate(async () => { const off = document.body.classList.contains('sn-insp-off'); document.getElementById('sn-insp').click(); await new Promise(r => setTimeout(r, 80));
    return { off, pos: getComputedStyle(document.getElementById('right-dock')).position }; });
  T(r.a !== 'none' && r.b2 === 'none' && r.k === '0' && r.c !== 'none' && r2.off && r2.pos === 'fixed', 'T8 检查器开合与记忆；1280 默认收起、展开为浮层', JSON.stringify({ r, r2 }));
  /* T9 */
  r = await pg2.evaluate(async () => { mutate(() => { song.title = '保存状态测试'; }); const a = document.getElementById('sn-save').textContent; await new Promise(r => setTimeout(r, 500)); return { a, b2: document.getElementById('sn-save').textContent }; });
  T(r.a === '正在保存…' && r.b2 === '已存本机', 'T9 保存状态胶囊', JSON.stringify(r));
  await pg2.close();
  /* T10–T12 手机看谱迷你胶囊 */
  const c3 = await b.newContext({ viewport: { width: 390, height: 844 } });
  const pg3 = await c3.newPage(); pg3.on('pageerror', e => errs.push(e.message));
  await pg3.goto('file://' + FILE + '?autohide=1'); await pg3.waitForTimeout(1000);
  r = await pg3.evaluate(async () => { guardReplace = p => p(); hideStartPad(); toast = () => {}; enterShareViewer({ song: PRESETS[10].make() }); await new Promise(r => setTimeout(r, 300));
    const mini = document.getElementById('vw-mini'); const dock = document.getElementById('mixer-dock'); const dr = dock.getBoundingClientRect(); const play = getComputedStyle(document.getElementById('b-play'));
    const o = { title: mini && mini.querySelector('b').textContent, sub: mini && mini.querySelector('span').textContent, h: Math.round(dr.height), rad: getComputedStyle(dock).borderRadius, playBg: play.backgroundColor,
      hidden: ['b-metro', 'mx-expand', 'b-vwset'].map(id => getComputedStyle(document.getElementById(id)).display), stand: getComputedStyle(document.getElementById('b-stand')).display };
    document.getElementById('mx-more').click(); await new Promise(r => setTimeout(r, 80)); o.sheet = document.body.classList.contains('mxfull') && getComputedStyle(dock).borderTopLeftRadius === '18px';
    document.getElementById('mx-more').click(); await new Promise(r => setTimeout(r, 80));
    audio.playing = true; highlight('v0', 6, 0, true); window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 50)); window.scrollTo(0, 200); window.dispatchEvent(new Event('scroll')); await new Promise(r => setTimeout(r, 50));
    o.quiet = document.body.classList.contains('vw-quiet'); o.sub2 = mini.querySelector('span').textContent;
    audio.playing = false; stopPlay(); await new Promise(r => setTimeout(r, 50)); o.back = !document.body.classList.contains('vw-quiet') && !document.body.classList.contains('vw-playing'); return o; });
  T(r.title === '送别' && /第 1 \/ \d+ 小节/.test(r.sub) && r.h === 64 && r.rad === '980px' && r.playBg === 'rgb(0, 113, 227)' && r.hidden.every(d => d === 'none') && r.stand !== 'none', 'T10 手机看谱：迷你胶囊（曲名 / 小节 / 实心蓝播放 / 谱架，其余控件收进面板）', JSON.stringify(r));
  T(r.sheet, 'T11 「⋯」展开为底部面板（18 圆角 + 拖手）', JSON.stringify({ sheet: r.sheet }));
  T(r.quiet && /第 7/.test(r.sub2) && r.back, 'T12 播放中下滑 → 页首收起、胶囊缩小；停播复原', JSON.stringify(r));
  await pg3.close();
  const pg4 = await c3.newPage(); await pg4.goto('file://' + FILE); await pg4.waitForTimeout(900);
  const r4 = await pg4.evaluate(async () => { guardReplace = p => p(); hideStartPad(); toast = () => {}; enterShareViewer({ song: PRESETS[10].make() }); await new Promise(r => setTimeout(r, 200));
    audio.playing = true; highlight('v0', 3, 0, true); window.scrollTo(0, 300); window.dispatchEvent(new Event('scroll')); await new Promise(r => setTimeout(r, 50)); const q = document.body.classList.contains('vw-quiet'); audio.playing = false; stopPlay(); return q; });
  await pg4.close();
  T(r4 === false, 'T13 自动化测试环境默认不自动收起（护栏）', String(r4));
  T(!errs.length, '无页面脚本错误', errs.slice(0, 3).join(' | '));
  console.log(`\nPASS ${pass}/${total}`); await b.close(); process.exit(pass === total ? 0 : 1);
})();
