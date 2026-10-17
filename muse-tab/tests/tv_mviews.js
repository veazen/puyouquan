/* v50.9 手机编辑轻量适配回归（双视口）：
   手机(390px iPhone13)：T1 顶栏单行横滑（#top 总高显著下降、主栏 nowrap、页面无横向溢出）
                        T2 编辑态谱面 fit-width（score 宽 ≤ 窗宽）
                        T3 手动缩放 → body.mzoom（退出适配）；点缩放标签回 100% → 恢复
   桌面(1280px)：T4 主栏仍 wrap、无 mzoom 类、谱面保持原生宽（>窗宽的 fit 规则不生效）
   file:// 直载。
   v68.2 切默认（flow）：T1–T5b 断言的是旧外壳手机布局（#top .main-bar 单行横滑、#mixer-dock 迷你条 / 三排卡片、#left-flyout）与旧外壳桌面——钉 ?shell=classic。
   文末 flow 段（默认外壳，手机 body.flw-m）断言同一意图：MF1 顶栏 #flw-mtop 单行 ≤56、页面无横向溢出 · MF2 谱面 fit-width · MF3 手动缩放挂 mzoom / 复位回适配 ·
   MF3b 播放键（#flw-mplay）≥44 可点中 · MF3c 触摸解锁 AudioContext · MF3d 手机开机忽略存储缩放 · MF3e 离开启动台不自动弹抽屉 ·
   MF4 桌面 flow：存储缩放带入、无 mzoom、无 fit 上限、左栏 #flw-left 常驻（旧外壳「左栏自动展开」的对应）。抽屉 / 触控 / 底条几何另见 tv_modes M16。
   T5b 读法加固：卷动态背景有 CSS 过渡，120ms 时可能还没开始（高负载下偶发读到起始色），改为等到过渡起色（≤1s）再读——断言不变 */
const { chromium, devices } = require('playwright');
const path = require('path');
const F0 = 'file://' + path.resolve(__dirname, '../index.html');
const F = F0 + '?shell=classic';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // ---- 手机 ----
  const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'zh-CN' });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.SF_PLAYWAIT = false; });   /* v60.34 回归不等在途音色包 */
  await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0; loadSong(PRESETS[0].make()); })()`);
  await pg.waitForTimeout(800);
  let r = await pg.evaluate(`(()=>({
    topH: document.getElementById('top').getBoundingClientRect().height,
    wrap: getComputedStyle(document.querySelector('#top .main-bar')).flexWrap,
    overX: document.documentElement.scrollWidth - window.innerWidth,
    scoreW: Math.round(document.getElementById('score').getBoundingClientRect().width),
    winW: window.innerWidth
  }))()`);
  // 顶栏 281→~211：主栏单行化省 70px；编辑栏因触屏热区加大（.eb 38px）各行略增，属有意取舍
  T(r.topH < 230 && r.wrap === 'nowrap' && r.overX <= 0, 'T1 顶栏单行横滑+无横向溢出', JSON.stringify(r));
  T(r.scoreW <= r.winW, 'T2 编辑态谱面 fit-width', JSON.stringify({ scoreW: r.scoreW, winW: r.winW }));
  r = await pg.evaluate(`(()=>{
    setViewZoom(1.5);
    const zoomed = document.body.classList.contains('mzoom');
    const wideW = Math.round(document.getElementById('score').getBoundingClientRect().width);
    setViewZoom(1);
    const back = !document.body.classList.contains('mzoom');
    const fitW = Math.round(document.getElementById('score').getBoundingClientRect().width);
    return {zoomed, wideW, back, fitW, winW: window.innerWidth}; })()`);
  T(r.zoomed && r.wideW > r.winW && r.back && r.fitW <= r.winW, 'T3 手动缩放退出/恢复 fit-width', JSON.stringify(r));
  T(errs.length === 0, '手机端无报错', errs.join('|') || 'none');
  // T3b v60.36 播放条三排卡片（撤 v51.0 单行横滑+吸左——56% 控件屏外要横划，产品拍板改版）：
  //    折行布局、条内无横向滚动、播放键为大胶囊（细粒度几何断言在 tv_mobile T8/T9）
  //    v64.1 B7 ⑧ 起默认是 56px 单行迷你条，点「⋯」展开回三排卡片——两态都量
  r = await pg.evaluate(`(()=>{ const bar=document.querySelector('.mx-bar'); const out={};
    const m=()=>{ const s=getComputedStyle(bar), p=document.getElementById('b-play').getBoundingClientRect();
      return {wrap:s.flexWrap, noScroll:bar.scrollWidth<=bar.clientWidth+1, playH:Math.round(p.height), h:Math.round(document.getElementById('mixer-dock').getBoundingClientRect().height)}; };
    out.mini=m(); const mm=document.getElementById('mx-more'); if(mm) mm.click(); out.full=m(); if(mm) mm.click(); return out; })()`);
  T(r.mini.wrap === 'nowrap' && r.mini.noScroll && r.mini.playH >= 44 && r.mini.h <= 56 && r.full.wrap === 'wrap' && r.full.noScroll && r.full.playH >= 44,
    'T3b 播放条：默认 56px 迷你条，⋯ 展开三排卡片（折行无横滚+大播放胶囊）', JSON.stringify(r));
  // T3c v51.0 首次触摸解锁音频（audio.ctx 建立）
  await pg.tap('#score').catch(()=>{});
  await pg.waitForTimeout(300);
  r = await pg.evaluate(`(()=>({ctx: !!(typeof audio!=='undefined' && audio.ctx)}))()`);
  T(r.ctx, 'T3c 触摸解锁创建 AudioContext', JSON.stringify(r));
  await ctx.close();

  // T3d v51.0 手机开机忽略桌面存的缩放（fit-width 恒生效）+ 离开启动台不自动弹左栏
  const ctxZ = await b.newContext({ ...devices['iPhone 13'], locale: 'zh-CN' });
  const pgZ = await ctxZ.newPage();
  const errsZ = []; pgZ.on('pageerror', e => errsZ.push(e.message));
  await pgZ.addInitScript(`localStorage.setItem('musetab-zoom','1.5')`);
  await pgZ.goto(F); await pgZ.waitForTimeout(900);
  await pgZ.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0; hideStartPad(); loadSong(PRESETS[0].make()); })()`);
  await pgZ.waitForTimeout(800);
  r = await pgZ.evaluate(`(()=>({
    vz: viewZoom, mz: document.body.classList.contains('mzoom'),
    scoreW: Math.round(document.getElementById('score').getBoundingClientRect().width), winW: window.innerWidth,
    flyHidden: document.getElementById('left-flyout').classList.contains('hidden')
  }))()`);
  T(r.vz === 1 && !r.mz && r.scoreW <= r.winW, 'T3d 手机开机忽略存储缩放·fit生效', JSON.stringify(r));
  T(r.flyHidden, 'T3e 离开启动台左栏面板保持关闭', JSON.stringify({ flyHidden: r.flyHidden }));
  T(errsZ.length === 0, 'T3 组无报错', errsZ.join('|') || 'none');
  await ctxZ.close();

  // ---- 桌面守护 ----
  const pg2 = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs2 = []; pg2.on('pageerror', e => errs2.push(e.message));
  await pg2.addInitScript(`localStorage.setItem('musetab-zoom','1.5')`);
  await pg2.goto(F); await pg2.waitForTimeout(900);
  await pg2.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0; loadSong(PRESETS[0].make()); })()`);
  await pg2.waitForTimeout(800);
  r = await pg2.evaluate(`(()=>{
    const vzBoot = viewZoom;   // v51.0 桌面守护：存储缩放照常带入（手机才强制 1）
    const flyHidden = document.getElementById('left-flyout').classList.contains('hidden');
    setViewZoom(1.5); const noCls = !document.body.classList.contains('mzoom'); setViewZoom(1);
    return {
      wrap: getComputedStyle(document.querySelector('#top .main-bar')).flexWrap,
      noCls, vzBoot, flyHidden,
      /* v55.2 经典版退役：#b-shell 有意隐藏、仅保留给回归套件程序化切换——断言改为「存在但不可见」 */
      shellBtn: !!document.getElementById('b-shell') && getComputedStyle(document.getElementById('b-shell')).display==='none',
      fitMax: getComputedStyle(document.getElementById('score')).maxWidth
    }; })()`);
  T(r.wrap === 'wrap' && r.noCls && r.shellBtn && r.fitMax !== '100%', 'T4 桌面不受影响（wrap/无mzoom/经典入口隐存/无fit上限）', JSON.stringify(r));
  T(r.vzBoot === 1.5 && r.flyHidden === false, 'T4b 桌面守护：存储缩放带入·左栏自动展开保持', JSON.stringify({ vzBoot: r.vzBoot, flyHidden: r.flyHidden }));
  /* T5 v60.38 谱架栏配色语义（修「白字白底」：.primary 白字存活、朱砂底被 #standbar button
     高特异性规则盖成 var(--panel)——退出谱架恒隐形、自动卷谱在卷动中隐形；v60.37 旧文件跑本条即红）。
     断言：自动卷谱=朱砂胶囊白字、卷动中转深色按压态且文案变暂停、退出钮深字非白、无隐形（字色≠底色）。
     ⚠ 读法（Chrome 149 实测坑，与 tv_frame T16「先掐过渡」同族）：同一元素读过一次计算样式后，
     类变更在同任务/下一帧 rAF 里再读仍拿**陈旧值**（rAF 先于样式重算；实测约 300ms 后视觉才对）——
     idle 与卷动态必须拆成两次 evaluate、中间跨真实 paint，否则断言假红。 */
  r = await pg2.evaluate(`(()=>{
    window.guardReplace = p => p();
    loadSong(createSong('vocal', { title:'st', beats:4, unit:4, key:'C', nMea:30, nTab:0, nVox:1, lyr:0 }));
    enterStand();
    const cs = id => { const c = getComputedStyle(document.getElementById(id)); return { color:c.color, bg:c.backgroundColor }; };
    const idle = { go: cs('sb-go'), exit: cs('sb-exit') };
    startAutoScroll();
    return idle;
  })()`);
  await pg2.waitForTimeout(120);
  await pg2.waitForFunction(bg0 => getComputedStyle(document.getElementById('sb-go')).backgroundColor !== bg0, r.go.bg, { timeout: 1000 }).catch(() => {});
  const r5b = await pg2.evaluate(`(()=>{
    const c = getComputedStyle(document.getElementById('sb-go'));
    const run = { bg: c.backgroundColor, color: c.color, txt: document.getElementById('sb-go').textContent.trim() };
    stopAutoScroll();
    const back = document.getElementById('sb-go').textContent.trim();
    exitStand();
    return { run, back };
  })()`);
  T(r.go.color === 'rgb(255, 255, 255)' && r.go.bg !== r.go.color
    && r.exit.color !== 'rgb(255, 255, 255)' && r.exit.color !== r.exit.bg,
    'T5 谱架栏：卷谱钮朱砂白字·退出钮深字（无白字白底隐形）', JSON.stringify(r));
  T(/暂停/.test(r5b.run.txt) && r5b.run.bg !== r.go.bg && r5b.run.color === 'rgb(255, 255, 255)'
    && /自动卷谱/.test(r5b.back),
    'T5b 卷动中按压态（深色+暂停文案）·停止复原', JSON.stringify(r5b));
  T(errs2.length === 0, '桌面端无报错', errs2.join('|') || 'none');
  await pg2.close();

  /* ===================== flow 段（默认外壳）===================== */
  {
    const ctxF = await b.newContext({ ...devices['iPhone 13'], locale: 'zh-CN' });
    const pf = await ctxF.newPage();
    const errsF = []; pf.on('pageerror', e => errsF.push(e.message));
    await pf.goto(F0); await pf.waitForTimeout(900);
    await pf.evaluate(() => { window.SF_PLAYWAIT = false; });
    await pf.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0; loadSong(PRESETS[0].make()); })()`);
    await pf.waitForTimeout(800);
    let f = await pf.evaluate(`(()=>{ const mt=document.getElementById('flw-mtop'); const bs=[...mt.querySelectorAll('button')].filter(x=>x.getClientRects().length);
      const tops=[...new Set(bs.map(x=>{ const q=x.getBoundingClientRect(); return Math.round((q.top+q.height/2)/4); }))];
      return { flwM: document.body.classList.contains('flw-m'), topH: Math.round(mt.getBoundingClientRect().height), rows: tops.length, mtNoScroll: mt.scrollWidth<=mt.clientWidth+1,
        overX: document.documentElement.scrollWidth - innerWidth, scoreW: Math.round(document.getElementById('score').getBoundingClientRect().width), winW: innerWidth }; })()`);
    T(f.flwM && f.topH <= 56 && f.rows === 1 && f.mtNoScroll && f.overX <= 0, 'MF1 flow 手机：顶栏 #flw-mtop 单行（≤56）、无横向溢出', JSON.stringify(f));
    T(f.scoreW <= f.winW, 'MF2 flow 手机：编辑态谱面 fit-width', JSON.stringify({ scoreW: f.scoreW, winW: f.winW }));
    f = await pf.evaluate(`(()=>{ setViewZoom(1.5); const zoomed=document.body.classList.contains('mzoom'); const wideW=Math.round(document.getElementById('score').getBoundingClientRect().width);
      setViewZoom(1); const back=!document.body.classList.contains('mzoom'); const fitW=Math.round(document.getElementById('score').getBoundingClientRect().width);
      return {zoomed, wideW, back, fitW, winW: innerWidth, overX: document.documentElement.scrollWidth - innerWidth}; })()`);
    T(f.zoomed && f.wideW > f.winW && f.back && f.fitW <= f.winW && f.overX <= 0, 'MF3 flow 手机：手动缩放退出 / 恢复 fit-width（页面不横溢）', JSON.stringify(f));
    f = await pf.evaluate(`(()=>{ const p=document.getElementById('flw-mplay'); if(!p) return {has:false}; const q=p.getBoundingClientRect(); const h=document.elementFromPoint(q.left+q.width/2, q.top+q.height/2);
      const bar=document.getElementById('flw-mbar').getBoundingClientRect();
      return {has:true, hit: !!h && !!h.closest('#flw-mplay'), w: Math.round(q.width), h: Math.round(q.height), inBar: q.top>=bar.top-1 && q.bottom<=bar.bottom+1, barB: Math.round(bar.bottom), ih: innerHeight}; })()`);
    T(f.has && f.hit && f.h >= 44 && f.w >= 44 && f.inBar && Math.abs(f.barB - f.ih) <= 1, 'MF3b flow 手机：底条播放键 #flw-mplay ≥44 且可点中（底条贴底）', JSON.stringify(f));
    await pf.tap('#score').catch(() => {});
    await pf.waitForTimeout(300);
    f = await pf.evaluate(`(()=>({ctx: !!(typeof audio!=='undefined' && audio.ctx)}))()`);
    T(f.ctx, 'MF3c flow 手机：触摸解锁创建 AudioContext', JSON.stringify(f));
    T(errsF.length === 0, 'MF 手机端无报错', errsF.join('|') || 'none');
    await ctxF.close();

    const ctxZ2 = await b.newContext({ ...devices['iPhone 13'], locale: 'zh-CN' });
    const pz = await ctxZ2.newPage();
    const errsZ2 = []; pz.on('pageerror', e => errsZ2.push(e.message));
    await pz.addInitScript(`localStorage.setItem('musetab-zoom','1.5')`);
    await pz.goto(F0); await pz.waitForTimeout(900);
    await pz.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0; hideStartPad(); loadSong(PRESETS[0].make()); })()`);
    await pz.waitForTimeout(800);
    f = await pz.evaluate(`(()=>{ const sh=document.getElementById('flw-msheet'); return {
      flwM: document.body.classList.contains('flw-m'), vz: viewZoom, mz: document.body.classList.contains('mzoom'),
      scoreW: Math.round(document.getElementById('score').getBoundingClientRect().width), winW: window.innerWidth,
      sheetOpen: !!sh && sh.getClientRects().length>0 && getComputedStyle(sh).visibility!=='hidden' }; })()`);
    T(f.flwM && f.vz === 1 && !f.mz && f.scoreW <= f.winW, 'MF3d flow 手机开机忽略存储缩放·fit 生效', JSON.stringify(f));
    T(!f.sheetOpen, 'MF3e flow 离开启动台不自动弹抽屉', JSON.stringify({ sheetOpen: f.sheetOpen }));
    T(errsZ2.length === 0, 'MF3 组无报错', errsZ2.join('|') || 'none');
    await ctxZ2.close();

    const pd = await b.newPage({ viewport: { width: 1280, height: 950 } });
    const errsD = []; pd.on('pageerror', e => errsD.push(e.message));
    await pd.addInitScript(`localStorage.setItem('musetab-zoom','1.5')`);
    await pd.goto(F0); await pd.waitForTimeout(900);
    await pd.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0; loadSong(PRESETS[0].make()); })()`);
    await pd.waitForTimeout(800);
    f = await pd.evaluate(`(()=>{ const vzBoot=viewZoom; setViewZoom(1.5); const noCls=!document.body.classList.contains('mzoom'); setViewZoom(1);
      const fl=document.getElementById('flw-left').getBoundingClientRect();
      return { flow: document.body.classList.contains('flow'), vzBoot, noCls, flwLeft: Math.round(fl.width), fitMax: getComputedStyle(document.getElementById('score')).maxWidth,
        overX: document.documentElement.scrollWidth - innerWidth }; })()`);
    T(f.flow && f.vzBoot === 1.5 && f.noCls && f.flwLeft === 248 && f.fitMax !== '100%' && f.overX <= 0, 'MF4 flow 桌面不受手机规则影响（存储缩放带入 / 无 mzoom / 无 fit 上限 / 左栏常驻 248）', JSON.stringify(f));
    T(errsD.length === 0, 'MF 桌面端无报错', errsD.join('|') || 'none');
    await pd.close();
  }

  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
