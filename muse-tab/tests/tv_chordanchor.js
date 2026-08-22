/* tv_chordanchor —— v60.27「选中音符设和弦 + 和弦图对齐锚定音符」回归
   用户指示：设和弦改为选中音符后设置（全谱类），和弦图横向对齐该音符；
   撤销「六线谱上方点空白设和弦」热区。
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

  /* 图=编辑入口：点简谱锚定的和弦图 → 选中锚定列 + 级数构建器 */
  r = await pg.evaluate(() => {
    sel.mi = 0; sel.ci = 0; sel.row = 'tab';         // 先把选择挪走，验证点击会带回锚定列
    const g = document.querySelector('#score g[data-vchord="1:2:0"]');
    const bb = g.getBoundingClientRect();
    const ev = new PointerEvent('pointerdown', { bubbles: true, clientX: bb.x + bb.width / 2, clientY: bb.y + bb.height / 2, button: 0 });
    g.dispatchEvent(ev);
    const menu = !!document.getElementById('vc-ok');
    const selOK = sel.row === 'vox' && sel.mi === 1 && sel.ci === 2;
    closePop();
    return { menu, selOK };
  });
  T(r.menu && r.selOK, 'T3 点击简谱锚定和弦图→选中该列+编辑器', JSON.stringify(r));

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

  /* 快捷浮条统一入口：按选中行分派 */
  r = await pg.evaluate(() => {
    closePop(); sel.row = 'vox'; sel.vi = 0; sel.mi = 2; sel.ci = 1; render();
    showQuickbar(400, 300, true);
    const btn = document.querySelector('#quickbar [data-qb="chord"]');
    if (!btn) return { btn: false };
    btn.dispatchEvent(new PointerEvent('click', { bubbles: true, clientX: 400, clientY: 300 }));
    const voxMenu = !!document.getElementById('vc-ok');
    closePop();
    sel.row = 'tab'; sel.mi = 0; sel.ci = 0; render();
    showQuickbar(400, 300, true);
    const btn2 = document.querySelector('#quickbar [data-qb="chord"]');
    btn2.dispatchEvent(new PointerEvent('click', { bubbles: true, clientX: 400, clientY: 300 }));
    const tabEditor = !!document.getElementById('ce-bass');
    closeModal(); closePop();
    return { btn: true, voxMenu, tabEditor };
  });
  T(r.btn && r.voxMenu && r.tabEditor, 'T6 快捷浮条「和弦」按行分派编辑器', JSON.stringify(r));

  /* 和弦层面板入口跟随选中行（不再强制切 tab） */
  r = await pg.evaluate(() => {
    sel.row = 'vox'; sel.vi = 0; sel.mi = 2; sel.ci = 0; render();
    document.getElementById('b-chord-edit').click();
    const voxMenu = !!document.getElementById('vc-ok');
    const rowKept = sel.row === 'vox';
    closePop();
    return { voxMenu, rowKept };
  });
  T(r.voxMenu && r.rowKept, 'T7 和弦层面板入口跟随选中行', JSON.stringify(r));

  /* ＋和弦悬停位扩展到弹唱谱（此前仅功能谱/钢琴弹唱） */
  r = await pg.evaluate(() => {
    const z = document.querySelector('#score g.vcz[data-vchord]');
    if (!z) return { z: false };
    const seg = z.dataset.vchord.split(':').map(Number);
    z.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 300, clientY: 200, button: 0 }));
    const menu = !!document.getElementById('vc-ok');
    const selOK = sel.row === 'vox' && sel.mi === seg[0] && sel.ci === seg[1];
    closePop();
    return { z: true, menu, selOK };
  });
  T(r.z && r.menu && r.selOK, 'T8 弹唱谱＋和弦悬停位可用', JSON.stringify(r));

  /* 歌谱（无 TAB）：简谱和弦仍为名字框（不出图带，谱类各安其位） */
  r = await pg.evaluate(() => {
    loadSong(createSong('vocal', { title: 'v', beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 0, nVox: 1, lyr: 0 }));
    sel.row = 'vox'; sel.vi = 0; sel.mi = 0; sel.ci = 1;
    setVoxChord('F', true);
    const g = document.querySelector('#score g[data-vchord="0:1:0"]');
    return { g: !!g, hasBox: !!(g && g.querySelector('rect')) };
  });
  T(r.g && r.hasBox, 'T9 歌谱和弦名字框不回归', JSON.stringify(r));

  T(errs.length === 0, 'T10 无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
