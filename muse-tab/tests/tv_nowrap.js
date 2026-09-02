/* v61.1 不换行模式（产品指示：曲谱增加不换行编辑模式和看谱模式）回归：
   T1 编辑态开启：单系统横向长带（meaBands 单行 / meaBoxes x 单调）、viewBox=内容宽、
      单页无页码、页头仍按标准版宽居中在左端首屏、顶栏 ↔ 钮点亮、musetab-nowrap 落盘
   T2 打印兜底：PRINT_PAGING=true 强制回分页排版（标准版宽+多行）、还原后长带回来
   T3 播放横向跟滚：高亮右端小节 → #score-wrap.scrollLeft 前进
   T4 关闭还原：viewBox 回标准版宽、多行分页回归、body.nwrap 摘除（版宽无膨胀残留）
   T5 观看态独立开关（⚙ 观看设置 vs-nowrap）：musetab-nowrap-view 键独立、
      手机 390 fit-to-width 豁免（svg CSS 宽=长带宽不被压屏宽）
   T6 缩图不受长带影响：nowrap 下 buildThumbCanvas 仍按分页排版烤出 2:1 卡片
   对 v61.0 旧文件跑：eb-nowrap 不存在 → T1 起全红（突变实证）。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 编辑态开启
  let r = await pg.evaluate(() => { try {
    window.guardReplace = p => p();
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'G', nMea: 12, nTab: 1, nVox: 1, lyr: 1 });
    s.title = '横带'; loadSong(s); hideStartPad();
    const vb0 = document.getElementById('score').viewBox.baseVal.width;
    document.getElementById('eb-nowrap').click();
    const svg = document.getElementById('score');
    const vb1 = svg.viewBox.baseVal.width;
    const oneRow = new Set(Object.values(meaBands).map(x => Math.round(x.y))).size === 1;
    const xs = Object.values(meaBoxes).map(x => x.x);
    const mono = xs.every((v, i) => i === 0 || v > xs[i - 1]);
    const pages = document.querySelectorAll('#score .pagebg').length;
    const pgno = document.querySelectorAll('#score .pageno').length;
    const titleX = +document.querySelector('#score text[font-size="28"]').getAttribute('x');
    return { vb0, vb1, oneRow, mono, pages, pgno,
      titleLeft: titleX < vb0,                        // 页头在左端首屏（标准版宽内）而非长带中点
      on: document.getElementById('eb-nowrap').classList.contains('on'),
      cls: document.body.classList.contains('nwrap'),
      ls: localStorage.getItem('musetab-nowrap') };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.vb1 > r.vb0 * 1.5 && r.oneRow && r.mono && r.pages === 1 && r.pgno === 0
    && r.titleLeft && r.on && r.cls && r.ls === '1', 'T1 编辑态横向长带', JSON.stringify(r));
  const vbWide = r.vb1, vbStd = r.vb0;

  // T2 打印兜底：强制分页
  r = await pg.evaluate(() => { try {
    PRINT_PAGING = true; render();
    const vb = document.getElementById('score').viewBox.baseVal.width;
    const rows = new Set(Object.values(meaBands).map(x => Math.round(x.y))).size;
    PRINT_PAGING = false; render();
    const back = document.getElementById('score').viewBox.baseVal.width;
    return { vb, rows, back };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.vb === vbStd && r.rows > 1 && r.back === vbWide, 'T2 打印强制回分页', JSON.stringify(r));

  // T3 播放横向跟滚
  r = await pg.evaluate(async () => { try {
    const sw = document.getElementById('score-wrap');
    sw.scrollLeft = 0;
    highlight('t0', 11, 0, true);
    await new Promise(z => setTimeout(z, 500));
    return { moved: sw.scrollLeft > 100, sl: Math.round(sw.scrollLeft) };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.moved, 'T3 播放横向跟滚', JSON.stringify(r));

  // T6（顺路在编辑页做）缩图不受长带影响：nowrap 开着也按分页烤 2:1
  r = await pg.evaluate(() => new Promise(res => { try {
    buildThumbCanvas(JSON.parse(JSON.stringify(song)), cv => {
      const ratio = cv.width / cv.height;
      const backWide = document.getElementById('score').viewBox.baseVal.width;
      res({ ratio: +ratio.toFixed(2), backWide });
    }, () => res({ err: 'thumb-fail' }));
  } catch (e) { res({ err: String(e && e.message || e) }); } }));
  T(!r.err && r.ratio === 2 && r.backWide === vbWide, 'T6 缩图按分页烤+长带复原', JSON.stringify(r));

  // T4 关闭还原
  r = await pg.evaluate(() => { try {
    document.getElementById('eb-nowrap').click();
    const vb = document.getElementById('score').viewBox.baseVal.width;
    const rows = new Set(Object.values(meaBands).map(x => Math.round(x.y))).size;
    return { vb, rows, cls: document.body.classList.contains('nwrap'),
      on: document.getElementById('eb-nowrap').classList.contains('on') };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.vb === vbStd && r.rows > 1 && !r.cls && !r.on, 'T4 关闭还原分页排版', JSON.stringify(r));

  // T5 观看态独立开关 + 手机 fit-width 豁免
  const pg2 = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  pg2.on('pageerror', e => errs.push('PAGEERR-V:' + e.message));
  await pg2.goto(F); await pg2.waitForTimeout(900);
  r = await pg2.evaluate(async () => { try {
    window.guardReplace = p => p();
    const data = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 10, nTab: 1, nVox: 1, lyr: 1 });
    data.title = '看谱横带';
    window.fetch = async () => ({ ok: true, status: 200, json: async () => ({
      score: { id: 'nw1', title: data.title, singer: '测', author: '官', updated_at: 1, data },
      stats: { views: 1, likes: 0, favs: 0 } }) });
    await openRemotePub('nw1'); hideStartPad();
    await new Promise(z => setTimeout(z, 150));
    showVwSettings();
    const hasBtn = !!document.getElementById('vs-nowrap');
    document.getElementById('vs-nowrap').click();
    await new Promise(z => setTimeout(z, 100));
    const svg = document.getElementById('score');
    const vb = svg.viewBox.baseVal.width;
    const cssW = Math.round(svg.getBoundingClientRect().width);
    const sw = document.getElementById('score-wrap');
    return { hasBtn, vb, cssW, fitExempt: cssW > 800,      // 未被压到 390 屏宽
      scrollable: sw.scrollWidth > sw.clientWidth + 50,
      lsV: localStorage.getItem('musetab-nowrap-view'),
      lsE: localStorage.getItem('musetab-nowrap') };       // 编辑键不受观看开关影响
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.hasBtn && r.vb > 1300 && r.fitExempt && r.scrollable && r.lsV === '1' && r.lsE !== '1',
    'T5 观看态开关独立+fit豁免', JSON.stringify(r));
  await pg2.close();

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
