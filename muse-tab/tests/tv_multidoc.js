/* v60.99 多开项目回归（产品指示：增加多开项目功能支持；v41.5 单窗口化撤销）：
   T1 页签条渲染：单文档 1 页签+「＋新窗口」；addDoc 另开=push 新页签并切换（原窗口保留）
   T2 窗口隔离：两窗口标题/内容互不干扰，切换往返无损，撤销栈不跨窗口
   T3 关闭未入库且有内容的窗口 → 自动转存「我的曲谱」（数据红线：多开关闭绝不丢谱）
   T4 关闭已入库窗口 → 不产生重复库条目；curDocI 收敛正确（v67.8：页签未入库标空心圈、入库后不标、悬停提示「已存入我的曲谱，编辑实时同步」）
   T5 LS_DOCS 多文档启动恢复：cur 指向正确、页签数与文档数一致
   T6 「＋新窗口」直达新建向导；手机窄屏（≤820）页签条隐藏 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 单文档页签 + addDoc 另开切换
  let r = await pg.evaluate(() => { try {
    window.guardReplace = p => p();
    const s1 = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 0 });
    s1.title = '窗口一'; loadSong(s1); hideStartPad();
    docs = [{ song, sel: null }]; curDocI = 0; renderDocTabs();
    const one = document.querySelectorAll('#doc-tabs .dtab').length;
    const addBtn = !!document.getElementById('dt-add');
    const noX = !document.querySelector('#doc-tabs .dt-x');   // 仅剩 1 窗口时不显关闭
    const s2 = createSong('vocal', { beats: 4, unit: 4, key: 'G', nMea: 2, nTab: 0, nVox: 1, lyr: 1 });
    s2.title = '窗口二'; addDoc(s2, () => {});
    const two = document.querySelectorAll('#doc-tabs .dtab').length;
    const onIdx = [...document.querySelectorAll('#doc-tabs .dtab')].findIndex(x => x.classList.contains('on'));
    const vis = document.getElementById('doc-tabs').offsetParent !== null;
    return { one, addBtn, noX, two, onIdx, vis, n: docs.length, cur: song.title };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.one === 1 && r.addBtn && r.noX && r.two === 2 && r.onIdx === 1 && r.vis && r.n === 2 && r.cur === '窗口二',
    'T1 页签渲染+另开新窗口', JSON.stringify(r));

  // T2 窗口隔离：改窗口二内容 → 切回窗口一无污染 → 再切回窗口二内容仍在；撤销栈不跨窗口
  r = await pg.evaluate(() => { try {
    sel = { mi: 0, row: 'vox', vi: 0, ci: 0 }; clampSel();
    mutate(() => { song.measures[0].voxes[0][0].deg = 5; });
    const undo2 = undoStack.length;
    document.querySelector('#doc-tabs .dtab[data-doc="0"]').click();
    const backTitle = song.title, undo1 = undoStack.length;
    const clean = !(song.measures[0].voxes[0] || []).some(c => c && c.deg === 5);
    document.querySelector('#doc-tabs .dtab[data-doc="1"]').click();
    const kept = song.measures[0].voxes[0][0].deg === 5;
    return { undo2, backTitle, undo1, clean, kept, cur: song.title };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.undo2 >= 1 && r.backTitle === '窗口一' && r.undo1 === 0 && r.clean && r.kept && r.cur === '窗口二',
    'T2 窗口隔离+撤销栈不跨窗', JSON.stringify(r));

  // T3 关闭未入库有内容的窗口 → 自动存入「我的曲谱」
  r = await pg.evaluate(() => { try {
    localStorage.setItem('musetab-library-v1', '[]');
    const before = JSON.parse(localStorage.getItem('musetab-library-v1')).length;
    document.querySelector('#doc-tabs .dt-x[data-doc-x="1"]').click();   // 关窗口二（deg=5 有内容、未入库）
    const lib = JSON.parse(localStorage.getItem('musetab-library-v1') || '[]');
    return { before, after: lib.length, saved: lib.some(x => x.title === '窗口二'),
      n: docs.length, cur: song.title,
      toast: (document.getElementById('toast') || {}).textContent || '' };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.before === 0 && r.after === 1 && r.saved && r.n === 1 && r.cur === '窗口一' && r.toast.includes('我的曲谱'),
    'T3 关闭未入库自动转存', JSON.stringify(r));

  // T4 关闭已入库窗口 → 不重复入库；curDocI 收敛
  r = await pg.evaluate(() => { try {
    const s3 = createSong('vocal', { beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 0, nVox: 1, lyr: 0 });
    s3.title = '已入库窗'; s3.measures[0].voxes[0][0].deg = 3;
    addDoc(s3, () => {});
    const dotLocal = !!document.querySelector('#doc-tabs .dtab.on .dt-dot');   // v67.8 未入库：空心圈
    saveToLibrary();                     // 入库（v67.8 起已入库不标圈，悬停提示写明已存入）
    const on = document.querySelector('#doc-tabs .dtab.on');
    const dotSaved = dotLocal && !!on && !on.querySelector('.dt-dot') && /已存入我的曲谱，编辑实时同步/.test(on.title);
    const libN1 = JSON.parse(localStorage.getItem('musetab-library-v1')).length;
    document.querySelector('#doc-tabs .dt-x[data-doc-x="1"]').click();
    const libN2 = JSON.parse(localStorage.getItem('musetab-library-v1')).length;
    return { dotSaved, libN1, libN2, n: docs.length, cur: song.title, curI: curDocI };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.dotSaved && r.libN1 === 2 && r.libN2 === 2 && r.n === 1 && r.cur === '窗口一' && r.curI === 0,
    'T4 已入库关闭不重复入库', JSON.stringify(r));

  // T5 LS_DOCS 多文档启动恢复（cur=1）
  const pg2 = await b.newPage({ viewport: { width: 1440, height: 950 } });
  await pg2.addInitScript(() => {
    const mk = t => { const s = { v: 3, title: t, key: 'C', beats: 4, unit: 4, tempo: 90, capo: 0, customChords: {},
      tabVoices: [], voxVoices: ['旋律1'], lyricLines: 0,
      measures: [{ tabs: [], voxes: [[{ dur: 4, dotted: false, deg: 2, acc: '', oct: 0, lyrics: [] }]], lyrPad: {} }] }; return s; };
    localStorage.setItem('musetab-docs-v1', JSON.stringify({ cur: 1, docs: [mk('恢复一'), mk('恢复二')] }));
  });
  await pg2.goto(F); await pg2.waitForTimeout(1300);
  r = await pg2.evaluate(() => { try {
    hideStartPad(); renderDocTabs();
    return { n: docs.length, cur: song.title, tabs: document.querySelectorAll('#doc-tabs .dtab').length,
      onIdx: [...document.querySelectorAll('#doc-tabs .dtab')].findIndex(x => x.classList.contains('on')) };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.n === 2 && r.cur === '恢复二' && r.tabs === 2 && r.onIdx === 1, 'T5 多文档启动恢复', JSON.stringify(r));
  await pg2.close();

  // T6 「＋新窗口」直达新建向导；≤820 页签条隐藏
  r = await pg.evaluate(() => { try {
    document.getElementById('dt-add').click();
    const wiz = !!document.getElementById('nw-cancel');
    if (wiz) document.getElementById('nw-cancel').click();
    return { wiz };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.waitForTimeout(200);
  const hidden = await pg.evaluate(() => getComputedStyle(document.getElementById('doc-tabs')).display === 'none');
  T(r.wiz && hidden, 'T6 ＋新窗口进向导+窄屏隐藏', JSON.stringify({ wiz: r.wiz, hidden }));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
