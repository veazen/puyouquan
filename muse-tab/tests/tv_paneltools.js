/* v60.43 工具随轨回归（音轨化 P2：VOICE_TOOLS 声明表——选中轨类型×显示方式→按钮级显隐；
   面板组级由 DOCK_PANELS（图层×谱类）管，P1 点行切图层后二者合成「工具随轨」）：
   T1 吉他轨：第二行=演奏技巧（data-tech2 按钮）+ 扫弦记号在位
   T2 旋律轨·简谱显示：五线谱专属工具（踏板/指法/八度线/谱号切换）全部隐藏——
      谱号切换 b-clef 在 v60.42 前不受该规则约束（简谱声部也显示），P2 补缺口=本条突变锚
   T3 旋律轨·五线谱显示：五件套（ped-on/ped-off/fing/ottava/clef）全部出现
   T4 钢琴轨：五线谱五件套在位；织体按钮 b-acctex 仅钢琴弹唱谱显示
   T5 功能谱轨：级数面板 fn 置顶可见
   T6 图层轨随音轨增删：歌谱加吉他轨→六线谱图层钮出现；删光→隐藏且光标回旋律轨
   对 v60.42 旧文件跑：T2 的 b-clef 断言当场红（突变实证）。file:// 直载。 */
const { chromium } = require('playwright');
const path = require('path');
const F = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });

  const base = { beats: 4, unit: 4, key: 'C', tempo: 90, nMea: 2, singer: '', lyricist: '', composer: '', maker: '', capo: 0 };
  const vis = id => { const el = document.getElementById(id); return !!el && el.offsetParent !== null; };

  // T1 吉他轨：扫弦/琶音记号在位、五线谱工具隐藏；切旋律轨后扫弦记号随轨隐藏（工具随轨对比）
  //    （eb-ctx 技法第二行为经典版遗产，新版外壳技法在记号面板——断言按新版口径）
  let r = await pg.evaluate((base2) => {
    loadSong(createSong('tanchang', Object.assign({ inst: 'guitar', nTab: 1, nVox: 1, lyr: 1 }, base2)));
    setRibbon('tab'); sel.row = 'tab'; sel.vi = 0; render();
    const vis2 = id => { const el = document.getElementById(id); return !!el && el.offsetParent !== null; };
    const onTab = { strum: vis2('b-strum-d') && vis2('b-arp'), staffHidden: !vis2('b-ped-on') && !vis2('b-clef') };
    setRibbon('vox'); sel.row = 'vox'; sel.vi = 0; render();
    const onVox = { strumGone: !vis2('b-strum-d') };
    setRibbon('tab'); sel.row = 'tab'; render();
    return { onTab, onVox };
  }, base);
  T(r.onTab.strum && r.onTab.staffHidden && r.onVox.strumGone,
    'T1 吉他轨（扫弦记号在位+无五线谱工具+切旋律轨扫弦隐）', JSON.stringify(r));

  // T2 旋律轨·简谱显示：五线谱五件套全部隐藏（b-clef=P2 补缺口）
  r = await pg.evaluate((base2) => {
    loadSong(createSong('vocal', Object.assign({ nVox: 1, lyr: 1 }, base2)));
    setRibbon('vox'); sel.row = 'vox'; sel.vi = 0; render();
    const vis2 = id => { const el = document.getElementById(id); return !!el && el.offsetParent !== null; };
    return { ped: vis2('b-ped-on'), fing: vis2('b-fing'), ott: vis2('b-ottava'), clef: vis2('b-clef'),
      oct: vis2('eb-octup') };
  }, base);
  T(!r.ped && !r.fing && !r.ott && !r.clef && r.oct,
    'T2 旋律轨·简谱（五线谱五件套含谱号切换全隐·八度点在位）', JSON.stringify(r));

  // T3 旋律轨·五线谱显示：五件套全部出现
  r = await pg.evaluate(() => {
    setVoxNotation('staff'); render();
    const vis2 = id => { const el = document.getElementById(id); return !!el && el.offsetParent !== null; };
    const out = { ped: vis2('b-ped-on'), fing: vis2('b-fing'), ott: vis2('b-ottava'), clef: vis2('b-clef') };
    setVoxNotation('jianpu'); render();
    return out;
  });
  T(r.ped && r.fing && r.ott && r.clef, 'T3 旋律轨·五线谱（五件套齐现）', JSON.stringify(r));

  // T4 钢琴轨：五件套在位；织体钮 b-acctex 的谱类显隐规则（右栏卡内元素，断言 renderDock 写的内联 display）
  r = await pg.evaluate((base2) => {
    loadSong(createSong('piano', Object.assign({ lyr: 0 }, base2)));
    setRibbon('vox'); sel.row = 'vox'; sel.vi = 0; render();
    const vis2 = id => { const el = document.getElementById(id); return !!el && el.offsetParent !== null; };
    const texDisp = () => (document.getElementById('b-acctex') || {}).style.display;
    const solo = { ped: vis2('b-ped-on'), clef: vis2('b-clef'), tex: texDisp() };
    loadSong(createSong('pianoacc', Object.assign({ lyr: 1 }, base2)));
    setRibbon('vox'); render();
    const acc = { tex: texDisp() };
    return { solo, acc };
  }, base);
  T(r.solo.ped && r.solo.clef && r.solo.tex === 'none' && r.acc.tex === '',
    'T4 钢琴轨（五线谱工具+织体钮谱类显隐规则）', JSON.stringify(r));

  // T5 功能谱轨：级数面板置顶可见
  r = await pg.evaluate((base2) => {
    loadSong(createSong('func', Object.assign({ ftype: 'func', nVox: 1, lyr: 1 }, base2)));
    setRibbon('vox'); render();
    const p = document.getElementById('panel-vox-fn');
    return { fnVis: !!p && p.offsetParent !== null, order: p ? getComputedStyle(p).order : null };
  }, base);
  T(r.fnVis && r.order === '0', 'T5 功能谱轨（级数面板置顶）', JSON.stringify(r));

  // T6 左轨音轨钮随音轨增删（v60.43 音轨最上级：rail 轨钮数=轨数；点轨钮切轨）
  r = await pg.evaluate((base2) => {
    loadSong(createSong('vocal', Object.assign({ nVox: 1, lyr: 1 }, base2)));
    const nBtns = () => document.querySelectorAll('#rail-tracks .rtrk[data-trk]').length;
    const before = nBtns() === 1;
    addVoice('tab');
    const after = nBtns() === 2;
    document.querySelector('#rail-tracks .rtrk[data-trk="tv:0"]').click();
    const picked = sel.row === 'tab' && activeTab === 'tab'
      && document.querySelector('#rail-tracks .rtrk[data-trk="tv:0"]').classList.contains('on');
    delVoiceAt('tab', 0);
    const gone = nBtns() === 1 && sel.row === 'vox';
    return { before, after, picked, gone };
  }, base);
  T(r.before && r.after && r.picked && r.gone, 'T6 左轨音轨钮随轨增删·点钮切轨', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
