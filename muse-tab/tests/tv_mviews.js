/* v50.9 手机编辑轻量适配回归（双视口）：
   手机(390px iPhone13)：T1 顶栏单行横滑（#top 总高显著下降、主栏 nowrap、页面无横向溢出）
                        T2 编辑态谱面 fit-width（score 宽 ≤ 窗宽）
                        T3 手动缩放 → body.mzoom（退出适配）；点缩放标签回 100% → 恢复
   桌面(1280px)：T4 主栏仍 wrap、无 mzoom 类、谱面保持原生宽（>窗宽的 fit 规则不生效）
   file:// 直载。 */
const { chromium, devices } = require('playwright');
const path = require('path');
const F = 'file://' + path.resolve(__dirname, '../index.html');
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
  r = await pg.evaluate(`(()=>{ const bar=document.querySelector('.mx-bar');
    const s=getComputedStyle(bar), p=document.getElementById('b-play').getBoundingClientRect();
    return {wrap:s.flexWrap, noScroll:bar.scrollWidth<=bar.clientWidth+1, playH:Math.round(p.height)}; })()`);
  T(r.wrap === 'wrap' && r.noScroll && r.playH >= 44, 'T3b 播放条三排卡片（折行无横滚+大播放胶囊）', JSON.stringify(r));
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
  T(errs2.length === 0, '桌面端无报错', errs2.join('|') || 'none');
  await pg2.close();

  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
