/* v40.0 阶段1 回归：新版外壳（深色扁平顶栏/底栏）/经典切换/音符组前置/顶栏快速换调 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1380, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(1000);
  let pass = 0, total = 0;
  const T = (ok, name, detail) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (detail ? ': ' + detail : '')); };

  // T1 新版外壳默认开启：顶栏深色、播放条通栏深色、切换按钮显示「经典版」
  let r = await pg.evaluate(() => {
    const mb = document.querySelector('.main-bar');
    const md = document.getElementById('mixer-dock');
    const mbBg = getComputedStyle(mb).backgroundColor;
    const mdRect = md.getBoundingClientRect();
    const dark = c => { const m = /rgba?\((\d+), (\d+), (\d+)/.exec(c); return m && (+m[1] + +m[2] + +m[3]) / 3 < 80; };
    return { shell: document.body.classList.contains('shell'), mbDark: dark(mbBg),
      mdFull: Math.abs(mdRect.width - innerWidth) < 2 && Math.abs(mdRect.bottom - innerHeight) < 2,
      mdDark: dark(getComputedStyle(md).backgroundColor),
      btn: document.getElementById('b-shell').textContent };
  });
  T(r.shell && r.mbDark && r.mdFull && r.mdDark && r.btn === '经典版',
    'T1 新版外壳默认态', '顶栏深=' + r.mbDark + ' 播放条通栏深=' + (r.mdFull && r.mdDark));

  // T2 经典/新版切换并持久化
  r = await pg.evaluate(() => {
    document.getElementById('b-shell').click();
    const off = !document.body.classList.contains('shell') && localStorage.getItem('musetab-shell') === 'classic'
      && document.getElementById('b-shell').textContent === '新版界面';
    document.getElementById('b-shell').click();
    const back = document.body.classList.contains('shell') && localStorage.getItem('musetab-shell') === 'new';
    return { off, back };
  });
  T(r.off && r.back, 'T2 经典切换持久化', '切回经典=' + r.off + ' 再切新版=' + r.back);

  // T3 工具行：音符组排在时值组前面（同一行内 DOM 顺序）
  r = await pg.evaluate(() => {
    const add = document.getElementById('eb-add');
    const dur = document.getElementById('eb-dur');
    const sameRow = add.closest('#editbar') && dur.closest('#editbar');
    const before = !!(add.compareDocumentPosition(dur) & Node.DOCUMENT_POSITION_FOLLOWING);
    const ctxRow2 = !!document.getElementById('eb-ctx').closest('#editbar2');
    return { sameRow: !!sameRow, before, ctxRow2 };
  });
  T(r.sameRow && r.before && r.ctxRow2, 'T3 音符组前置', '同行=' + r.sameRow + ' 音符在前=' + r.before + ' 技法留二行=' + r.ctxRow2);

  // T4 顶栏快速换调：C→C#（和弦联动）→ 还原
  r = await pg.evaluate(() => {
    loadSong(PRESETS[0].make());
    const k0 = song.key, ch0 = song.measures[0].tabs[0][0].chord;
    document.getElementById('k-up').click();
    const k1 = song.key, ch1 = song.measures[0].tabs[0][0].chord;
    document.getElementById('k-dn').click();
    const k2 = song.key, ch2 = song.measures[0].tabs[0][0].chord;
    const kval = document.getElementById('k-val').textContent;
    return { k0, k1, ch0, ch1, restored: k2 === k0 && ch2 === ch0, kval };
  });
  T(r.k0 === 'C' && r.k1 === 'C#' && r.ch1 === 'C#' && r.restored && r.kval === '1=C',
    'T4 顶栏快速换调', r.k0 + '→' + r.k1 + ' 和弦=' + r.ch1 + ' 还原=' + r.restored);

  // T5 谱架/观看模式兼容：新版外壳下进出谱架正常，viewer 隐藏顶栏
  r = await pg.evaluate(() => {
    document.getElementById('b-stand').click();
    const standOn = document.body.classList.contains('stand');
    exitStand();
    const standOff = !document.body.classList.contains('stand');
    return { standOn, standOff };
  });
  T(r.standOn && r.standOff, 'T5 谱架兼容', '进=' + r.standOn + ' 出=' + r.standOff);

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
