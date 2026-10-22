/* tv_chordanchor —— v60.27「选中音符设和弦 + 和弦图对齐锚定音符」回归
   用户指示：设和弦改为选中音符后设置（全谱类），和弦图横向对齐该音符；
   撤销「六线谱上方点空白设和弦」热区。
   v60.28 入口模型更正（产品负责人）：和弦/标注=创作辅助双图标（选中音符时可用），
   谱面不留「＋和弦」点击位，浮条「和弦」钮撤销——T6/T8 随之改测新入口。
   断言口径：几何用数值坐标（getBBox / 热区 rect 区间），不看截图。
   变异实证（写入时验证过，红断言才算设防）：
   ── 把简谱锚定和弦图的 x 锚从 nx-10 改 mx+10（小节头）→ T1 当场红；
   ── 把 chordAtCol 退回旧「只扫 tab 行」实现 → T4 当场红。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  let pass = 0, total = 0; const T = (ok, n, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + n + (d ? ': ' + d : '')); };

  /* ── 弹唱谱：简谱音符上设和弦 ── */
  let r = await pg.evaluate(() => {
    window.guardReplace = p => p();   // 免「未保存改动」守卫拦 loadSong（T9 换谱类会触发）
    loadSong(createSong('guitar', { title: 't', beats: 4, unit: 4, key: 'C', nMea: 4, nTab: 1, nVox: 1, lyr: 0 }));
    sel.row = 'vox'; sel.vi = 0; sel.mi = 1; sel.ci = 2;
    setVoxChord('Am', true);
    const g = document.querySelector('#score g[data-vchord="1:2:0"]');
    if (!g) return { g: false };
    const bb = g.getBBox();
    /* 锚定列热区（clx..clx+cw）：图必须与本列横向相交（对齐＝锚在本列，不再落小节头/别列） */
    const cell = document.querySelector('#score rect[data-mi="1"][data-ci="2"][data-row="vox"]:not([data-zone])').getBBox();
    const tabHot = document.querySelector('#score rect[data-mi="1"][data-ci="0"][data-row="tab"]').getBBox();
    const tabTop = tabHot.y + 18;                    // 热区 y = tabTop-18
    const inCell = bb.x < cell.x + cell.width && bb.x + bb.width > cell.x;
    const inLane = bb.y + bb.height <= tabTop + 1;   // 画在六线谱上方图带，不压谱线
    const noBox = !g.querySelector('rect');          // 图带模式下不再画简谱行名字框
    return { g: true, inCell, inLane, noBox, bb: [bb.x, bb.y, bb.width, bb.height].map(v => +v.toFixed(1)),
      cell: [cell.x, cell.width].map(v => +v.toFixed(1)), tabTop: +tabTop.toFixed(1) };
  });
  T(r.g && r.inCell && r.inLane && r.noBox,
    'T1 简谱锚定和弦→图带和弦图对齐本列', JSON.stringify(r));

  r = await pg.evaluate(() => ({ zone: !!document.querySelector('#score [data-zone="chord"]') }));
  T(!r.zone, 'T2 图带空白设和弦热区已撤销', JSON.stringify(r));

  /* 图=编辑入口：点简谱锚定的和弦图 → 选中锚定列 + 中间面板（v60.31 起不直接进编辑器，
     「编辑和弦…」才进级数构建器——用户指示） */
  r = await pg.evaluate(() => {
    sel.mi = 0; sel.ci = 0; sel.row = 'tab';         // 先把选择挪走，验证点击会带回锚定列
    const g = document.querySelector('#score g[data-vchord="1:2:0"]');
    const bb = g.getBoundingClientRect();
    const ev = new PointerEvent('pointerdown', { bubbles: true, clientX: bb.x + bb.width / 2, clientY: bb.y + bb.height / 2, button: 0 });
    g.dispatchEvent(ev);
    const hub = !!document.getElementById('vp-edit') && !document.getElementById('vc-ok');
    const selOK = sel.row === 'vox' && sel.mi === 1 && sel.ci === 2;
    document.getElementById('vp-edit').click();
    const menu = !!document.getElementById('vc-ok');
    closePop();
    return { hub, menu, selOK };
  });
  T(r.hub && r.menu && r.selOK, 'T3 点击简谱锚定和弦图→选中+中间面板→编辑器', JSON.stringify(r));

  /* 合并时间线：简谱锚定的和弦对 TAB 全链路生效（查询 + 节奏型取形实体化） */
  r = await pg.evaluate(() => {
    const before = chordBefore(2, 0), prior = chordPrior(2, 0);
    sel.row = 'tab'; sel.vi = 0; sel.mi = 1; sel.ci = 0; selRange = null;
    applyTabPattern(TAB_PATTERN_GROUPS[0].items[0]);
    const shape = chordShape('Am');
    const cols = song.measures[1].tabs[0];
    const notes = cols.flatMap(c => c.notes || []);
    const allFit = notes.length > 0 && notes.every(n => shapeString(shape, n.s) === n.f);
    const atColLate = chordAtCol(1, 0, cols.length - 1);   // 末列起拍≥2 → 简谱第3拍的 Am 已生效
    const atCol0 = chordAtCol(1, 0, 0);                    // 首列起拍 0 → Am 尚未生效，如实为空（拍位语义）
    return { before, prior, atColLate, atCol0, notesN: notes.length, allFit };
  });
  T(r.before === 'Am' && r.prior === 'Am' && r.atColLate === 'Am' && r.atCol0 === '' && r.allFit,
    'T4 合并时间线：TAB 查询/节奏型取形吃到简谱锚定和弦', JSON.stringify(r));

  /* TAB 列锚定：和弦图本身可点击编辑（替代空白热区） */
  r = await pg.evaluate(() => {
    mutate(() => { song.measures[0].tabs[0][1].chord = 'C'; });
    const g = document.querySelector('#score g[data-tchord="0:1:0"]');
    if (!g) return { g: false };
    const bb = g.getBoundingClientRect();
    g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: bb.x + 5, clientY: bb.y + 5, button: 0 }));
    const pop = !!document.getElementById('cp-edit');
    const selOK = sel.row === 'tab' && sel.mi === 0 && sel.ci === 1;
    closePop();
    return { g: true, pop, selOK };
  });
  T(r.g && r.pop && r.selOK, 'T5 TAB 锚定和弦图可点击编辑', JSON.stringify(r));

  /* v60.28 创作辅助「和弦」图标：选中音符时可用，按选中行分派编辑器；
     浮条不再有「和弦」钮（入口收敛，产品负责人指示）。
     v68.9 有意迁移（规格 f89 §7.3）：T6 / T7 测的是旧外壳的 #rt-chord / #b-chord-edit（新外壳里这两枚是隐藏按钮）——钉 ?shell=classic 另开一页、断言原样；
     新外壳的对应入口断言在 tv_chordeng E1 */
  const pc = await b.newPage({ viewport: { width: 1440, height: 900 } });
  pc.on('pageerror', e => errs.push('PAGEERR(classic):' + e.message));
  await pc.goto(F + (F.includes('?') ? '&' : '?') + 'shell=classic'); await pc.waitForTimeout(900);
  await pc.evaluate(() => { window.guardReplace = p => p(); loadSong(createSong('guitar', { title: 't', beats: 4, unit: 4, key: 'C', nMea: 4, nTab: 1, nVox: 1, lyr: 0 })); });
  r = await pc.evaluate(() => {
    closePop(); sel.row = 'vox'; sel.vi = 0; sel.mi = 2; sel.ci = 1; render();
    const ic = document.getElementById('rt-chord');
    if (!ic) return { ic: false };
    const enabled = !ic.disabled;
    ic.click();
    const voxMenu = !!document.getElementById('vc-ok');
    closePop();
    sel.row = 'tab'; sel.mi = 0; sel.ci = 0; render();
    ic.click();
    const tabEditor = !!document.getElementById('ce-bass');
    closeModal(); closePop();
    showQuickbar(400, 300, true);
    const qbNoChord = !document.querySelector('#quickbar [data-qb="chord"]');
    closeQuickbar();
    return { ic: true, enabled, voxMenu, tabEditor, qbNoChord };
  });
  T(r.ic && r.enabled && r.voxMenu && r.tabEditor && r.qbNoChord,
    'T6 创作辅助「和弦」图标按行分派（浮条无和弦钮；?shell=classic）', JSON.stringify(r));

  /* 和弦层面板入口跟随选中行（不再强制切 tab） */
  r = await pc.evaluate(() => {
    sel.row = 'vox'; sel.vi = 0; sel.mi = 2; sel.ci = 0; render();
    document.getElementById('b-chord-edit').click();
    const voxMenu = !!document.getElementById('vc-ok');
    const rowKept = sel.row === 'vox';
    closePop();
    return { voxMenu, rowKept };
  });
  T(r.voxMenu && r.rowKept, 'T7 和弦层面板入口跟随选中行（?shell=classic）', JSON.stringify(r));
  await pc.close();

  /* v60.28 谱面不留「＋和弦」点击位（全谱类，含功能谱原有的）+「标注」图标浮层 */
  r = await pg.evaluate(() => {
    const noVcz = !document.querySelector('#score .vcz') && !document.querySelector('#score g.vcz');
    sel.row = 'vox'; sel.vi = 0; sel.mi = 2; sel.ci = 1; render();
    const ia = document.getElementById('rt-anno');
    if (!ia) return { noVcz, ia: false };
    ia.click();
    const pop = document.getElementById('popmenu');
    const words = pop ? pop.querySelectorAll('[data-am]').length : 0;
    const btn = pop && pop.querySelector('[data-am="副歌"]');
    if (btn) btn.click();
    const anno = (song.measures[2].voxes[0][1] || {}).anno;
    setAnno('');   // 还原，避免干扰后续断言
    closePop();
    return { noVcz, ia: true, words, anno };
  });
  T(r.noVcz && r.ia && r.words === 12 && r.anno === '副歌',
    'T8 谱面无＋和弦位；「标注」图标浮层写入 col.anno', JSON.stringify(r));

  /* 歌谱（无 TAB）：简谱和弦仍为名字框（不出图带，谱类各安其位） */
  r = await pg.evaluate(() => {
    loadSong(createSong('vocal', { title: 'v', beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 0, nVox: 1, lyr: 0 }));
    sel.row = 'vox'; sel.vi = 0; sel.mi = 0; sel.ci = 1;
    setVoxChord('F', true);
    const g = document.querySelector('#score g[data-vchord="0:1:0"]');
    return { g: !!g, hasBox: !!(g && g.querySelector('rect')) };
  });
  T(r.g && r.hasBox, 'T9 歌谱和弦名字框不回归', JSON.stringify(r));

  /* v60.30 延长音拍位和弦（用户指示：延长音属于可选音符可编辑和弦）：
     col.chords=[{q,chord}] 槽写入 / 合并时间线拍位（列起+q 个四分拍）/
     图带和弦图锚定该增时线 x / 增时线热区点击选中拍位（sel.q）。
     变异实证：chordEvtsMea 去掉 col.chords 扫描 → 本条当场红（时间线丢 3:G）。 */
  r = await pg.evaluate(() => {
    loadSong(createSong('guitar', { title: 'q', beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 0 }));
    mutate(() => {
      song.measures[0].voxes[0] = [
        { dur: 4, dotted: false, deg: 6, acc: '', oct: 0, lyrics: [], tie: false },
        { dur: 2, dotted: true,  deg: 5, acc: '', oct: 0, lyrics: [], tie: false },   // 附点二分 → 2 条增时线
      ];
    });
    sel.row = 'vox'; sel.vi = 0; sel.mi = 0; sel.ci = 1; sel.q = 0; render();
    setVoxChord('C', true);        // 列头槽
    setVoxChord('G', true, 2);     // 第 2 条增时线拍位槽
    const evs = chordEvtsMea(0).map(e => e.beat + ':' + e.chord).join(',');
    const g2 = document.querySelector('#score g[data-vchord="0:1:0:2"]');
    const z2 = document.querySelector('#score rect[data-q="2"][data-mi="0"][data-ci="1"]');
    let aligned = false;
    if (g2 && z2) {
      const gb = g2.getBBox(), zb = z2.getBBox(), zc = zb.x + zb.width / 2;
      aligned = zc > gb.x - 2 && zc < gb.x + gb.width + 2;   // 拍位图横向罩住该增时线
    }
    if (z2) { const bb = z2.getBoundingClientRect();
      z2.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: bb.x + 4, clientY: bb.y + 4, button: 0 })); }
    const selQ = sel.q === 2 && sel.ci === 1 && sel.row === 'vox';
    const slot = JSON.stringify((song.measures[0].voxes[0][1].chords || []));
    closePop();
    return { evs, g2: !!g2, z2: !!z2, aligned, selQ, slot };
  });
  T(r.evs === '1:C,3:G' && r.g2 && r.z2 && r.aligned && r.selQ,
    'T9b 延长音拍位和弦（槽/时间线/图锚增时线/热区选中）', JSON.stringify(r));

  T(errs.length === 0, 'T10 无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
