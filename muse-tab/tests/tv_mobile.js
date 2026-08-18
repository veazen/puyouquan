/* v44.3 移动端 UX 回归：① 观看模式谱面 fit-to-width（390px 不横向溢出）；
   ② 线上未登录点发布→拉起登录（不再本机演示误导）。file:// 直载。
   v60.2 扩：启动台清场 / 顶栏单行 / 时值条沉底等分 / 播放键可达 / 底栏零重叠 /
   图标无缺字 / 智能抽屉可达——全部为几何与计算样式断言，不接受截图目测。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(700);
  let pass = 0, total = 0; const T = (ok, n, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + n + (d ? ': ' + d : '')); };

  let r = await pg.evaluate(() => {
    window.guardReplace = (p) => p();
    enterShareViewer({ song: JSON.parse(JSON.stringify(createSong('guitar', { title: 't', beats:4, unit:4, key:'C', nMea:8, nTab:1, nVox:1, lyr:1 }))) });
    const w = Math.round(document.getElementById('score').getBoundingClientRect().width);
    return { scoreW: w, vw: innerWidth, overflowX: document.documentElement.scrollWidth > innerWidth + 2 };
  });
  T(r.scoreW <= r.vw + 1 && !r.overflowX, 'T1 移动端看谱 fit-to-width', JSON.stringify(r));

  r = await pg.evaluate(() => {
    document.body.className = 'shell';   // 退出观看态
    window.PYQ_CLOUD = true; ACCT = null;
    const le = { id:'lib1', title:'测试谱', data: createSong('guitar', { title:'测试谱', beats:4, unit:4, key:'C', nMea:2, nTab:1, nVox:1, lyr:0 }) };
    showPublishMenu(le, { left:100, top:100, width:10, bottom:110, right:110 });
    const btn = document.getElementById('pub-go'); const label = btn ? btn.textContent : '';
    if (btn) btn.click();
    return { label, loginOpen: !!document.getElementById('lg-phone'), pubGone: !document.getElementById('pub-go') };
  });
  T(r.label === '登录后发布到谱库' && r.loginOpen && r.pubGone, 'T2 线上未登录发布→拉起登录', JSON.stringify(r));

  /* ── v60.2 移动端信息架构（几何断言，不看截图）──
     修复前实测：顶栏 93px、main-bar 内容 875px、editbar 1559px（75% 在屏外）、
     播放键被 #left-dock 完全遮住不可点、启动台态仍挂着三条工具带。 */
  await pg.goto(F); await pg.waitForTimeout(900);
  r = await pg.evaluate(() => {
    const cs = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).display : '—'; };
    return { padOn: typeof startPadOn === 'function' && startPadOn(),
      topH: +document.getElementById('top').getBoundingClientRect().height.toFixed(1),
      editbar: cs('#editbar'), leftDock: cs('#left-dock'), mixer: cs('#mixer-dock'),
      noHScroll: document.body.scrollWidth <= innerWidth };
  });
  T(r.padOn && r.topH <= 56 && r.editbar === 'none' && r.leftDock === 'none' && r.mixer === 'none' && r.noHScroll,
    'T4 启动台态清场（顶栏≤56px + 三条工具带不出现）', JSON.stringify(r));

  r = await pg.evaluate(() => {
    loadSong(createSong('guitar', { beats:4, unit:4, key:'C', nMea:4, nTab:1, nVox:1, lyr:1 }));
    return true;
  });
  await pg.waitForTimeout(600);
  r = await pg.evaluate(() => {
    const q = s => document.querySelector(s);
    const mb = q('.main-bar'), eb = q('#editbar'), md = q('#mixer-dock'), ld = q('#left-dock'), play = q('#b-play');
    const pr = play.getBoundingClientRect();
    const hit = document.elementFromPoint(pr.x + pr.width / 2, pr.y + pr.height / 2);
    const durs = [...document.querySelectorAll('#eb-dur .eb')].map(x => x.getBoundingClientRect());
    const inter = (a, c) => { const A = a.getBoundingClientRect(), C = c.getBoundingClientRect();
      const x = Math.max(0, Math.min(A.right, C.right) - Math.max(A.left, C.left));
      const y = Math.max(0, Math.min(A.bottom, C.bottom) - Math.max(A.top, C.top)); return Math.round(x * y); };
    return { topH: +q('#top').getBoundingClientRect().height.toFixed(1),
      mainBarNoScroll: mb.scrollWidth <= mb.clientWidth + 1,
      editbarFixed: getComputedStyle(eb).position === 'fixed',
      editbarNoScroll: eb.scrollWidth <= eb.clientWidth + 1,
      durN: durs.length, durMinH: Math.min(...durs.map(d => d.height)),
      playReachable: !!(hit && (hit === play || play.contains(hit) || hit.closest('#b-play'))),
      overlapMixLeft: inter(md, ld), overlapMixEb: inter(md, eb), overlapLeftEb: inter(ld, eb),
      noHScroll: document.body.scrollWidth <= innerWidth };
  });
  T(r.topH <= 56 && r.mainBarNoScroll && r.editbarFixed && r.editbarNoScroll
    && r.durN === 9 && r.durMinH >= 44 && r.playReachable
    && r.overlapMixLeft === 0 && r.overlapMixEb === 0 && r.overlapLeftEb === 0 && r.noHScroll,
    'T5 编辑态：顶栏单行 + 时值条沉底等分 + 播放键可点 + 三条底栏零重叠', JSON.stringify(r));

  r = await pg.evaluate(() => {
    const svgN = [...document.querySelectorAll('#eb-dur .eb .dg')].filter(g => g.querySelector('svg')).length;
    /* 可见文本里不得残留 U+1D1xx 音乐符号扩展区字符——手机系统字体缺字会渲染成豆腐块 */
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let tofu = 0, n;
    while ((n = w.nextNode())) { const t = n.nodeValue || '';
      for (const c of t) if (c.codePointAt(0) >= 0x1D100 && c.codePointAt(0) <= 0x1D1FF) {
        if (n.parentElement && n.parentElement.offsetParent !== null) { tofu++; break; } } }
    return { durSvg: svgN, tofu };
  });
  T(r.durSvg === 8 && r.tofu === 0, 'T6 时值/记号图标为 SVG 且可见文本无缺字字符', JSON.stringify(r));

  /* 一键配伴奏(rt-arr) 只对 vocal/teach/instr 显示（与 b-arrange 同口径）→ 换歌谱。
     必须整页重载再建：同一页里 loadSong 从吉他谱切歌谱时 docType 不刷新（既有行为，
     产品里换谱类走 addDoc/新建向导而非裸 loadSong），沿用旧页会得到假红。 */
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => loadSong(createSong('vocal', { beats:4, unit:4, key:'C', nMea:8, nTab:0, nVox:1, lyr:1 })));
  await pg.waitForTimeout(600);
  r = await pg.evaluate(() => {
    document.getElementById('b-msmart').click();
    const vis = id => { const e = document.getElementById(id); if (!e) return false;
      let n = e; while (n && n !== document.body) { const c = getComputedStyle(n);
        if (c.display === 'none' || c.visibility === 'hidden') return false; n = n.parentElement; } return true; };
    return { sug: vis('rt-sug'), arr: vis('rt-arr'), beat: vis('beat-status'), mask: !!document.getElementById('rsheet-mask') };
  });
  T(r.sug && r.arr && r.beat && r.mask,
    'T7 智能抽屉：一键配和弦/一键配伴奏/节拍检查在手机可达', JSON.stringify(r));

  T(errs.length === 0, 'T3 无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
