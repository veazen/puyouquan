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

  // T6 v40.1 六图层轨：新版显示 和弦/小节/段落 图层按钮，经典版隐藏
  r = await pg.evaluate(() => {
    const vis = k => { const el = document.querySelector('.ltab[data-t="' + k + '"]'); return el && el.offsetParent !== null; };
    const shellOn = ['chord', 'mea', 'sect'].every(vis);
    document.getElementById('b-shell').click();
    const classicOff = ['chord', 'mea', 'sect'].every(k => !vis(k));
    const classicBase = ['tab', 'vox', 'lyr'].every(vis);
    document.getElementById('b-shell').click();
    return { shellOn, classicOff, classicBase };
  });
  T(r.shellOn && r.classicOff && r.classicBase, 'T6 六图层轨显隐', '新版6层=' + r.shellOn + ' 经典3页=' + (r.classicOff && r.classicBase));

  // T7 和弦层谱类感知：吉他谱→和弦输入面板；钢琴弹唱（无吉他声部）→级数和弦面板
  r = await pg.evaluate(() => {
    loadSong(PRESETS[0].make());
    document.querySelector('.ltab[data-t="chord"]').click();
    const g = { active: activeTab,
      chordPanel: document.getElementById('panel-tab-chord').style.display !== 'none',
      strumHidden: document.getElementById('panel-tab-strum').style.display === 'none' };
    render();   // 再渲染一次，图层页不被重置
    g.kept = activeTab === 'chord';
    loadSong(createSong('pianoacc', { beats: 4, unit: 4, key: 'C', nMea: 2, lyr: 0 }));
    document.querySelector('.ltab[data-t="chord"]').click();
    const p = { fnPanel: document.getElementById('panel-vox-fn').style.display !== 'none',
      chordHidden: document.getElementById('panel-tab-chord').style.display === 'none' };
    return { g, p };
  });
  T(r.g.active === 'chord' && r.g.chordPanel && r.g.strumHidden && r.g.kept && r.p.fnPanel && r.p.chordHidden,
    'T7 和弦层谱类感知', '吉他=和弦面板 ' + r.g.chordPanel + ' 渲染保持=' + r.g.kept + ' 钢琴=级数面板 ' + r.p.fnPanel);

  // T8 小节/段落层：右栏内容移入左栏图层且按钮真实生效
  r = await pg.evaluate(() => {
    loadSong(PRESETS[0].make());
    document.querySelector('.ltab[data-t="mea"]').click();
    const ins = document.getElementById('b-insmea');
    const inFly = !!ins.closest('#left-flyout');
    const rcHidden = getComputedStyle(document.getElementById('rc-measec')).display === 'none';
    const n0 = song.measures.length; ins.click();
    const insWorks = song.measures.length === n0 + 1;
    document.querySelector('.ltab[data-t="sect"]').click();
    const rep = document.getElementById('b-rep-s');
    const sectInFly = !!rep.closest('#left-flyout');
    const expanded = !document.getElementById('sp-more').classList.contains('hidden');
    sel.mi = 0; rep.click();
    const repWorks = !!song.measures[0].repeatStart;
    rep.click();   // 还原
    mutate(() => { song.measures.pop(); });   // 还原小节数
    return { inFly, rcHidden, insWorks, sectInFly, expanded, repWorks };
  });
  T(r.inFly && r.rcHidden && r.insWorks && r.sectInFly && r.expanded && r.repWorks,
    'T8 小节/段落层', '移入左栏=' + (r.inFly && r.sectInFly) + ' 右卡隐藏=' + r.rcHidden + ' 插入/反复生效=' + (r.insWorks && r.repWorks));

  // T9 经典版还原：小节/段落回右栏原位，图层页回退到基础页
  r = await pg.evaluate(() => {
    document.getElementById('b-shell').click();   // → 经典
    const backIn = !!document.getElementById('sp-mea').closest('#rc-measec')
      && !!document.getElementById('sp-more').closest('#rc-measec');
    const rcShown = getComputedStyle(document.getElementById('rc-measec')).display !== 'none';
    const fellBack = ['tab', 'vox', 'lyr'].includes(activeTab);
    document.getElementById('b-shell').click();   // → 新版
    return { backIn, rcShown, fellBack };
  });
  T(r.backIn && r.rcShown && r.fellBack, 'T9 经典版还原', '节点回位=' + r.backIn + ' 右卡显示=' + r.rcShown + ' 页面回退=' + r.fellBack);

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
