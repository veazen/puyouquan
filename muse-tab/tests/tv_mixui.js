/* v54.3 播放轨道面板回归：
   - 音量条收窄自绘（--p 填充变量、宽度 ≤110px），不再占满整行
   - 每轨小节格：格数=小节数、编号可见
   - 点击小节格：光标跳该轨该小节 + 单小节循环 + 声部段选区（whole）；再点同格取消循环
   - 拖动跨格：多小节循环选段
   v68.2 收尾 ENG-1（PLAN §5.4 列为 P「flow 没有混音台」）：钉旧外壳 ?shell=classic——默认外壳（flow）下 #mixer-dock 的混音台整块隐藏（#mx-tracks 0×0），
   此前不钉时 T1「宽 ≤110」对 0 宽也成立、T3 / T4 用 dispatchEvent 驱动隐藏元素照样过，兜底外壳的混音台等于没有几何覆盖（突变：音量条改 300 宽默认外壳下仍绿）。
   T1 另加可见前提（宽 > 0、#mx-tracks 有尺寸），不再空过。
   flow 下的对应覆盖：混音并进音轨行——静音 / 独奏 / 音量 / 音色见 tv_trktree T8–T9（音轨行与本轨 ⋯ 菜单的混音控件）；
   「每轨小节格（点格跳转 + 单小节循环 / 拖动多小节循环）」是旧混音台独有，flow 改为状态栏小节格（tv_trktree / tv_modes 的 prog 段），按方案口径记为已知差异 */
const { chromium } = require('playwright');
const F0 = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
const F = F0 + (F0.includes('?') ? '&' : '?') + 'shell=classic';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // 建谱：1 吉他轨 + 1 简谱轨 × 6 小节，展开音轨面板
  await pg.evaluate(() => {
    if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 'm', beats: 4, unit: 4, key: 'C', nMea: 6, nTab: 1, nVox: 1, lyr: 0 });
    for (let m = 0; m < 6; m++) {
      s.measures[m].tabs[0] = Array.from({ length: 4 }, (_, i) => ({ dur: 4, dotted: false, chord: '', notes: [{ s: 3, f: m + i }], strum: '', tech: '' }));
      s.measures[m].voxes[0] = Array.from({ length: 4 }, (_, i) => ({ dur: 4, dotted: false, deg: (i % 7) + 1, acc: '', oct: 0, lyrics: [], tie: false }));
    }
    loadSong(s); blurSel = true; render();
    setMixerExpanded(true);
  });

  // T1 音量条收窄自绘：滑杆宽 ≤110、高 4px、带 --p 填充变量；百分比标签正确
  let r = await pg.evaluate(() => {
    const vin = document.querySelector('#mx-tracks .mx-row .mx-vol input');
    const cs = getComputedStyle(vin), tr = document.getElementById('mx-tracks').getBoundingClientRect();
    return { w: vin.getBoundingClientRect().width, h: cs.height, p: vin.style.getPropertyValue('--p'),
      vv: document.querySelector('#mx-tracks .mx-row .mx-vol .vv').textContent, flow: document.body.classList.contains('flow'), tracks: Math.round(tr.width) + 'x' + Math.round(tr.height) };
  });
  T(!r.flow && r.w > 0 && r.w <= 110 && r.h === '4px' && /%$/.test(r.p) && /%$/.test(r.vv) && !/^0x|x0$/.test(r.tracks), 'T1 音量条收窄自绘(--p填充)；旧外壳、混音台可见（宽 > 0，不对隐藏元素空过）', JSON.stringify(r));

  // T2 每轨小节格：2 轨 × 6 格、编号 1-6 全可见（wide 档）
  r = await pg.evaluate(() => {
    const grids = [...document.querySelectorAll('#mx-tracks .mx-cells')];
    return { nGrid: grids.length, nCell: grids.map(g => g.querySelectorAll('.mxtc').length).join(','),
      nums: [...grids[0].querySelectorAll('.mxtc span')].map(x => x.textContent).join('') };
  });
  T(r.nGrid === 2 && r.nCell === '6,6' && r.nums === '123456', 'T2 每轨小节格+编号', JSON.stringify(r));

  // T3 点击简谱轨第 3 格：光标跳 vox/mi=2 + 单小节循环 + 声部段选区 whole
  const clickCell = (g, mi) => `(()=>{
    const grid=[...document.querySelectorAll('#mx-tracks .mx-cells')][${g}];
    const c=grid.querySelector('.mxtc[data-mi="${mi}"]');
    c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,buttons:1}));
    grid.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
  })()`;
  r = await pg.evaluate(`(()=>{ ${clickCell(1, 2)}
    return { sel: sel.row+':'+sel.vi+':'+sel.mi, loop: audio.loop? audio.loop.a+'-'+audio.loop.b:'null',
      rng: selRange? [selRange.row,selRange.m1,selRange.m2,!!selRange.whole].join(':') : 'null',
      cur: (document.querySelectorAll('#mx-tracks .mxtc.cur').length),
      progLoop: document.querySelectorAll('#mx-prog .mxc.loop').length }; })()`);
  T(r.sel === 'vox:0:2' && r.loop === '2-2' && r.rng === 'vox:2:2:true' && r.cur === 1 && r.progLoop === 1,
    'T3 点击小节格=跳光标+单小节循环+声部段选区', JSON.stringify(r));

  // T4 再点同格：取消循环（光标与选区保留）
  r = await pg.evaluate(`(()=>{ ${clickCell(1, 2)}
    return { loop: audio.loop? 'on':'null', sel: sel.row+':'+sel.mi }; })()`);
  T(r.loop === 'null' && r.sel === 'vox:2', 'T4 再点同格取消循环', JSON.stringify(r));

  // T5 吉他轨拖 2→4 格：多小节循环 + 选区 m1=1 m2=3
  r = await pg.evaluate(`(()=>{
    const grid=[...document.querySelectorAll('#mx-tracks .mx-cells')][0];
    grid.querySelector('.mxtc[data-mi="1"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,buttons:1}));
    grid.querySelector('.mxtc[data-mi="3"]').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,buttons:1}));
    grid.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
    return { loop: audio.loop? audio.loop.a+'-'+audio.loop.b:'null', sel: sel.row+':'+sel.mi,
      rng: selRange? [selRange.row,selRange.m1,selRange.m2,!!selRange.whole].join(':') : 'null' }; })()`);
  T(r.loop === '1-3' && r.sel === 'tab:1' && r.rng === 'tab:1:3:true', 'T5 拖动跨格=选段循环', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
