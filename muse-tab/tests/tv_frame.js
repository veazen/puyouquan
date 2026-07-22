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

  // T10 v40.8 风格页签 + 顶栏排版浮层（右栏不再有排版页签）
  r = await pg.evaluate(() => {
    loadSong(PRESETS[0].make());
    const rtabsShown = document.getElementById('rtabs').offsetParent !== null;
    const noLayoutTab = !document.querySelector('.rtab[data-p="layout"]');
    document.querySelector('.rtab[data-p="style"]').click();
    const stVis = document.getElementById('st-notation').offsetParent !== null
      && document.getElementById('st-diag').offsetParent !== null;
    const f0 = !!song.funcNames;
    document.getElementById('st-fn').click();
    const fnFlips = song.funcNames !== f0;
    document.getElementById('st-fn').click();   // 还原
    document.getElementById('b-layout').click();   // 顶栏排版 → 浮层（新版也走浮层）
    const popFloat = document.getElementById('layout-pop').classList.contains('on')
      && !document.getElementById('layout-pop').closest('#right-dock');
    document.querySelector('#lp-page button[data-page="A3"]').click();
    const pageSet = song.layout.page === 'A3';
    document.querySelector('#lp-page button[data-page="A4"]').click();
    document.getElementById('lp-close').click();
    return { rtabsShown, noLayoutTab, stVis, fnFlips, popFloat, pageSet };
  });
  T(r.rtabsShown && r.noLayoutTab && r.stVis && r.fnFlips && r.popFloat && r.pageSet,
    'T10 风格页签+排版浮层', '风格入口=' + r.stVis + ' 级数切换=' + r.fnFlips + ' 浮层=' + r.popFloat);

  // T11 库页签归纳：节奏型/伴奏织体面板移入右栏库且按谱类显隐
  r = await pg.evaluate(() => {
    const vis = id => document.getElementById(id).offsetParent !== null;
    const inLib = id => !!document.getElementById(id).closest('#lib-host');
    document.querySelector('.rtab[data-p="lib"]').click();
    const g = { tabPat: inLib('panel-tab-pat') && vis('panel-tab-pat'),
      voxPat: inLib('panel-vox-pat') && vis('panel-vox-pat'),
      accHidden: !vis('panel-vox-acc'), chord: vis('rt-chorded'),
      leftNoPat: !document.querySelector('#left-flyout #panel-tab-pat') };
    document.querySelector('.rtab[data-p="ai"]').click();
    const a = { sug: vis('rt-sug'), fill: vis('rt-fill'), hum: vis('rt-hum'), arrHidden: !vis('rt-arr') };
    loadSong(createSong('pianoacc', { beats: 4, unit: 4, key: 'C', nMea: 2, lyr: 0 }));
    document.querySelector('.rtab[data-p="lib"]').click();
    const p = { acc: vis('panel-vox-acc'), tabPatHidden: !vis('panel-tab-pat') };
    return { g, a, p };
  });
  T(r.g.tabPat && r.g.voxPat && r.g.accHidden && r.g.chord && r.g.leftNoPat
    && r.a.sug && r.a.fill && r.a.hum && r.a.arrHidden && r.p.acc && r.p.tabPatHidden,
    'T11 库页签归纳', '弹唱=' + JSON.stringify(r.g) + ' 钢琴织体=' + r.p.acc);

  // T12 经典版：页签条与新卡片隐藏、排版浮层回 body、信息卡全显
  r = await pg.evaluate(() => {
    document.getElementById('b-shell').click();   // → 经典
    const tabsHidden = document.getElementById('rtabs').offsetParent === null;
    const newHidden = ['rt-chorded', 'rt-sug'].every(id => document.getElementById(id).offsetParent === null);
    const patBack = !!document.getElementById('panel-tab-pat').closest('#ribbon');   // v40.8 节奏型面板回左栏
    const popOnBody = document.getElementById('layout-pop').parentElement === document.body
      && !document.getElementById('layout-pop').classList.contains('on');
    const infoShown = document.getElementById('cursor-info').offsetParent !== null
      && document.getElementById('b-changelog').offsetParent !== null;
    document.getElementById('b-layout').click();   // 经典版顶栏排版 → 浮层打开
    const popFloat = document.getElementById('layout-pop').classList.contains('on');
    document.getElementById('lp-close').click();
    document.getElementById('b-shell').click();   // → 新版
    return { tabsHidden, newHidden, patBack, popOnBody, infoShown, popFloat };
  });
  T(r.tabsHidden && r.newHidden && r.patBack && r.popOnBody && r.infoShown && r.popFloat,
    'T12 经典版右栏还原', '页签隐=' + r.tabsHidden + ' 面板回位=' + r.patBack + ' 浮层可开=' + r.popFloat);

  // T13 v40.3 工具行单行化：新版下编辑栏第二行隐藏，技法移入左栏图层且真实生效
  r = await pg.evaluate(() => {
    loadSong(PRESETS[0].make());
    document.querySelector('.ltab[data-t="tab"]').click();
    const bar2Hidden = document.getElementById('editbar2').offsetParent === null;
    const tb = document.querySelector('#panel-tab-tech [data-tech2="h"]');
    const inFly = !!(tb && tb.closest('#left-flyout'));
    let applied = false, cleared = false;
    if (tb) {
      tb.click();
      const col = song.measures[sel.mi].tabs[sel.vi][sel.ci];
      applied = (col.notes || []).some(n => n.tech === 'h');
      tb.click();   // 同技法再点=清除
      cleared = !(col.notes || []).some(n => n.tech === 'h');
    }
    return { bar2Hidden, inFly, applied, cleared };
  });
  T(r.bar2Hidden && r.inFly && r.applied && r.cleared,
    'T13 工具行单行化', '二行隐=' + r.bar2Hidden + ' 技法入图层=' + r.inFly + ' 生效/清除=' + (r.applied && r.cleared));

  // T14 简谱页标识符号面板：装饰记号按钮在左栏图层内
  r = await pg.evaluate(() => {
    document.querySelector('.ltab[data-t="vox"]').click();
    const ob = document.querySelector('#panel-vox-orn [data-orn="up"]');
    const inFly = !!(ob && ob.closest('#left-flyout'));
    const techPanelHidden = document.getElementById('panel-tab-tech').style.display === 'none';
    return { inFly, techPanelHidden, nOrn: document.querySelectorAll('#panel-vox-orn [data-orn]').length };
  });
  T(r.inFly && r.techPanelHidden && r.nOrn >= 7, 'T14 标识符号入图层', '记号数=' + r.nOrn);

  // T15 窄屏 fly 浮层化 + 经典版技法still在二行
  await pg.setViewportSize({ width: 1000, height: 800 });
  await pg.waitForTimeout(300);
  r = await pg.evaluate(() => getComputedStyle(document.getElementById('left-flyout')).position);
  const narrowFixed = r === 'fixed';
  await pg.setViewportSize({ width: 1380, height: 900 });
  await pg.waitForTimeout(300);
  r = await pg.evaluate(() => {
    document.getElementById('b-shell').click();   // → 经典
    document.querySelector('.ltab[data-t="tab"]').click();
    const bar2Shown = document.getElementById('editbar2').offsetParent !== null;
    const techInBar2 = !!document.querySelector('#editbar2 [data-tech2="h"]');
    document.getElementById('b-shell').click();   // → 新版
    return { bar2Shown, techInBar2 };
  });
  T(narrowFixed && r.bar2Shown && r.techInBar2,
    'T15 窄屏浮层+经典还原', '窄屏fixed=' + narrowFixed + ' 经典二行=' + (r.bar2Shown && r.techInBar2));

  // T16 v40.4 通栏应用框架：左右贴边全高列、制版台内部滚动、轨上新建/帮助、经典版还原
  r = await pg.evaluate(() => {
    loadSong(PRESETS[0].make());
    const ld = document.getElementById('left-dock').getBoundingClientRect();
    const rd = document.getElementById('right-dock').getBoundingClientRect();
    const sw = document.getElementById('score-wrap');
    const bodyClipped = getComputedStyle(document.body).overflow === 'hidden';
    const flushL = ld.left <= 1, flushR = Math.abs(rd.right - innerWidth) <= 1;
    const fullCol = ld.height > innerHeight * 0.6 && rd.height > innerHeight * 0.6;
    const innerScroll = getComputedStyle(sw).overflowY === 'auto' && sw.scrollHeight > sw.clientHeight;
    sw.scrollTop = 180; const scrolled = sw.scrollTop > 100; sw.scrollTop = 0;
    /* v40.8 左轨：无新建按钮、纯图标（文字隐去）、选中朱砂底 */
    const noNew = !document.querySelector('.ltab[data-act="new"]');
    const tabBtn = document.querySelector('.ltab[data-t="tab"]');
    const iconOnly = getComputedStyle(tabBtn).fontSize === '0px';
    const onBg = getComputedStyle(document.querySelector('.ltab.on')).backgroundColor;
    const m = /rgba?\((\d+), (\d+), (\d+)/.exec(onBg);
    const redOn = m && +m[1] > 150 && +m[1] > (+m[2] + 60) && +m[1] > (+m[3] + 60);
    document.getElementById('b-shell').click();   // → 经典
    const back = {
      bodyScroll: getComputedStyle(document.body).overflow !== 'hidden',
      centered: document.getElementById('left-dock').getBoundingClientRect().left > 1,
      actHidden: document.querySelector('.ltab[data-act="help"]').offsetParent === null
    };
    document.getElementById('b-shell').click();   // → 新版
    return { bodyClipped, flushL, flushR, fullCol, innerScroll, scrolled, noNew, iconOnly, redOn, back };
  });
  T(r.bodyClipped && r.flushL && r.flushR && r.fullCol && r.innerScroll && r.scrolled
    && r.noNew && r.iconOnly && r.redOn
    && r.back.bodyScroll && r.back.centered && r.back.actHidden,
    'T16 通栏框架+图标轨', '贴边=' + (r.flushL && r.flushR) + ' 内滚=' + (r.innerScroll && r.scrolled)
    + ' 纯图标=' + r.iconOnly + ' 朱砂选中=' + r.redOn + ' 经典还原=' + JSON.stringify(r.back));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
