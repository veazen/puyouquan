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
/* v68.2 切默认（flow）：T1–T6 断言的是旧外壳左栏面板按钮（#b-strum-d / #b-ped-on / #b-clef / #panel-vox-fn / #rail-tracks）——这一段钉 ?shell=classic；
   文末「flow 段」在默认外壳（不带参数）里断言同一「工具随轨」意图：F1–F3 记号面板 FLOW.pal 按语境出格 · F4 右栏「智能」页按谱类出「伴奏织体」·
   F5 功能谱：音轨区表头 ⋯ 出「和弦 / 级数…」并弹级数菜单 · F6 音轨树行随轨增删、点行切轨（另见 tv_trktree T15 / T16 / T12 / T13、tv_modes M10d） */
const F0 = 'file://' + path.resolve(__dirname, '../index.html');
const F = F0 + '?shell=classic';
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

  /* ===================== flow 段（默认外壳，不带参数）===================== */
  const pf = await b.newPage({ viewport: { width: 1440, height: 950 } });
  pf.on('pageerror', e => errs.push('flow:' + e.message));
  await pf.goto(F0); await pf.waitForTimeout(900);
  await pf.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
    /* 记号组全部展开（低频组默认折叠）——与 tv_trktree T16 ALLOPEN 同口径；折叠只影响显示，格子判定看「出格」与可见两层 */
    localStorage.setItem('musetab-pal', JSON.stringify({ line: false, art: false, dyn: false, orn: false, piano: false, tempo: false, keys: false, bar: false, jump: false, strum: false, gtech: false }));
    window.__vis = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
      for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden') return false; } return true; };
    /* 格子：出格（DOM 里有 .flw-sg[data-v]）且可见、且不是灰格 */
    window.__cell = id => { const c = document.querySelector('#flw-pgrid .flw-sg[data-v="' + id + '"]'); return !!c && __vis(c) && !c.classList.contains('flw-sg-na'); };
    window.__sync = () => { render(); try { FLOW.sync(); } catch (_) {} try { FLOW.pal.on(); } catch (_) {} }; });
  const fl = await pf.evaluate(() => ({ flow: document.body.classList.contains('flow'), mounted: typeof FLOW !== 'undefined' && !!FLOW.mounted, key: localStorage.getItem('musetab-flow') }));
  T(fl.flow && fl.mounted && fl.key !== '0', 'flow 段前提：不带参数＝新外壳（body.flow、FLOW 已挂载）', JSON.stringify(fl));

  // F1 吉他轨：六线谱语境出「扫弦 · 拨弦」格（下扫 / 琶音）、无五线谱专属格（踏板 / 谱号）；切旋律轨后扫弦格随语境撤下
  r = await pf.evaluate((base2) => {
    loadSong(createSong('tanchang', Object.assign({ inst: 'guitar', nTab: 1, nVox: 1, lyr: 1 }, base2))); hideStartPad();
    sel.row = 'tab'; sel.vi = 0; sel.mi = 0; sel.ci = 0; __sync();
    const onTab = { ctx: FLOW.ctx(), strum: __cell('strum-down') && __cell('arp-up'), staffHidden: !__cell('ped') && !__cell('clef') };
    sel.row = 'vox'; sel.vi = 0; __sync();
    const onVox = { ctx: FLOW.ctx(), strumGone: !__cell('strum-down') && !__cell('arp-up') };
    return { onTab, onVox };
  }, base);
  T(r.onTab.ctx === 'tab' && r.onTab.strum && r.onTab.staffHidden && r.onVox.ctx === 'jp' && r.onVox.strumGone,
    'F1 flow 吉他轨：记号面板出扫弦 / 琶音格、无踏板 / 谱号格；切旋律轨扫弦格撤下', JSON.stringify(r));

  // F2 旋律轨·简谱：五线谱专属格（踏板 / 指法 / 八度线 / 谱号）全不出；八度点（行 2 #eb-octup）在位
  r = await pf.evaluate((base2) => {
    loadSong(createSong('vocal', Object.assign({ nVox: 1, lyr: 1 }, base2))); sel.row = 'vox'; sel.vi = 0; __sync();
    return { ctx: FLOW.ctx(), ped: __cell('ped'), fing: __cell('fingering'), ott: __cell('ottava'), clef: __cell('clef'), oct: __vis('#eb-octup') };
  }, base);
  T(r.ctx === 'jp' && !r.ped && !r.fing && !r.ott && !r.clef && r.oct, 'F2 flow 旋律轨·简谱：踏板 / 指法 / 八度线 / 谱号格全不出、八度点在位', JSON.stringify(r));

  // F3 旋律轨·五线谱：四件套格齐现（踏板收 / 踏板 / 指法 / 八度线 / 谱号）
  r = await pf.evaluate(() => {
    setVoxNotation('staff'); __sync();
    const out = { ctx: FLOW.ctx(), ped: __cell('ped') && __cell('ped-up'), fing: __cell('fingering'), ott: __cell('ottava'), clef: __cell('clef') };
    setVoxNotation('jianpu'); __sync(); out.back = FLOW.ctx(); return out;
  });
  T(r.ctx === 'st' && r.ped && r.fing && r.ott && r.clef && r.back === 'jp', 'F3 flow 旋律轨·五线谱：踏板 / 指法 / 八度线 / 谱号格齐现，切回简谱即撤', JSON.stringify(r));

  // F4 钢琴轨：五线谱格在位；右栏「智能」页「伴奏织体」只在钢琴伴奏歌谱出（钢琴独奏不出）——与委托钮 #b-acctex 的谱类显隐同一规则
  const smartItems = () => pf.evaluate(() => { FLOW.rd.show('smart'); const items = [...document.querySelectorAll('#flw-rx-ai [data-fa="rdp:ai"]')].map(x => x.dataset.v);
    const tb = document.getElementById('b-acctex'); return { items, tex: items.includes('tex'), del: !!tb && tb.style.display !== 'none', vis: __vis('#flw-rx-ai') }; });
  await pf.evaluate((base2) => { loadSong(createSong('piano', Object.assign({ lyr: 0 }, base2))); sel.row = 'vox'; sel.vi = 0; __sync(); }, base);
  const pSolo = Object.assign(await pf.evaluate(() => ({ ctx: FLOW.ctx(), ped: __cell('ped'), clef: __cell('clef') })), await smartItems());
  await pf.evaluate((base2) => { loadSong(createSong('pianoacc', Object.assign({ lyr: 1 }, base2))); sel.row = 'vox'; sel.vi = 0; __sync(); }, base);
  const pAcc = await smartItems();
  T(pSolo.ctx === 'st' && pSolo.ped && pSolo.clef && pSolo.vis && !pSolo.tex && !pSolo.del && pAcc.vis && pAcc.tex && pAcc.del,
    'F4 flow 钢琴轨：踏板 / 谱号格在位；「智能」页伴奏织体——钢琴独奏无、钢琴伴奏歌谱有（＝#b-acctex 显隐）', JSON.stringify({ solo: pSolo, acc: pAcc }));

  // F5 功能谱：音轨区表头「⋯」菜单出「和弦 / 级数…」，点它弹出级数和弦菜单（与旧左栏 #vf-edit 同一 showVoxChordMenu）
  await pf.evaluate((base2) => { loadSong(createSong('func', Object.assign({ ftype: 'func', nVox: 1, lyr: 1 }, base2))); sel.row = 'vox'; sel.vi = 0; sel.mi = 0; sel.ci = 0; __sync(); }, base);
  await pf.click('#flw-thd [data-fa="tree:hdr"]'); await pf.waitForTimeout(200);
  const f5a = await pf.evaluate(() => ({ dt: docType(song), item: __vis('#popmenu [data-fa="tree:vfedit"]'), names: !!document.querySelector('#popmenu [data-fa]') }));
  let f5b = { pop: false };
  if (f5a.item) { await pf.click('#popmenu [data-fa="tree:vfedit"]'); await pf.waitForTimeout(250);
    f5b = await pf.evaluate(() => { const m = document.getElementById('popmenu'); const r2 = m && m.getBoundingClientRect(); const L = document.getElementById('flw-left').getBoundingClientRect();
      return { pop: !!m && __vis(m), flwMenu: !!m && m.classList.contains('flw-mn'), right: r2 ? Math.round(r2.left) : null, leftEdge: Math.round(L.right), txt: m ? m.textContent.slice(0, 40) : '' }; });
    await pf.keyboard.press('Escape'); await pf.waitForTimeout(100); }
  T(f5a.dt === 'func' && f5a.item && f5b.pop && !f5b.flwMenu && f5b.right >= f5b.leftEdge,
    'F5 flow 功能谱：表头 ⋯ 有「和弦 / 级数…」，点了在左栏右侧弹级数和弦菜单', JSON.stringify({ f5a, f5b }));

  // F6 音轨树行随音轨增删：歌谱加吉他轨 → 多一行；真实点该行＝切到六线谱轨；删掉 → 行消失、光标回旋律轨
  await pf.evaluate((base2) => { loadSong(createSong('vocal', Object.assign({ nVox: 1, lyr: 1 }, base2))); sel.row = 'vox'; sel.vi = 0; __sync(); }, base);
  const nRows = () => pf.evaluate(() => document.querySelectorAll('#flw-tlist .flw-trow').length);
  const f6 = { before: await nRows() };
  await pf.evaluate(() => { addVoice('tab'); __sync(); });
  f6.after = await nRows();
  await pf.click('#flw-tr-tab-0 .flw-tn'); await pf.waitForTimeout(200);
  f6.picked = await pf.evaluate(() => sel.row === 'tab' && activeTab === 'tab' && document.getElementById('flw-tr-tab-0').classList.contains('on'));
  await pf.evaluate(() => { delVoiceAt('tab', 0); __sync(); });
  f6.gone = (await nRows()) === f6.before && await pf.evaluate(() => sel.row === 'vox' && !document.getElementById('flw-tr-tab-0'));
  T(f6.after === f6.before + 1 && f6.picked && f6.gone, 'F6 flow 音轨树行随轨增删·真实点行切轨', JSON.stringify(f6));
  await pf.close();

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
