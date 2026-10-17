/* v51.4 N:M 自定连音回归：
   - 预设 3/5/6/7 行为不变（拆分/整体切换，不写 tupM——旧版兼容）
   - 自定 N:M：选中 N 个等时值音整体切换（M 任意 1–16）；单音拆分（M 须为 2 的幂）
   - beatsOf ×M/N；括线标 N:M、断口随标宽自适应；弹窗改标=连续同标组整组改
   - MusicXML：time-modification 真实 N:M 出/入往返（修 5/6/7 误写 3:2 的旧缺陷）
   - 时值线（拍区）选中整拍 → 自定连音套用
   —— v60.59 追加（产品拍板：整拍内一律连成一杠）：
   T19 一拍内两组 3 连音（6 个十六分）并成一条主梁——旧版按「每 N 个一块」拆成两截
   T20 v51.6 口径保留护栏：跨拍的非整拍连音块（8:7）不得被拍界切断
   T21 未涉及场景零变化：整拍三连音 / 普通十六分 / 休止打断 / 6-8 大拍 分组一字不动
   对 v60.58 旧文件跑 T19 当场红（T20/T21 两版同绿＝零副作用实证）。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 预设回归：四分音 → 5连音拆分（5×16分、tup=5 无 tupM、总拍值不变=1拍）
  let r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 't', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    const mk = (o) => Object.assign({ dur: 4, dotted: false, chord: '', notes: [], strum: '', tech: '' }, o || {});
    s.measures[0].tabs[0] = [mk({ notes: [{ s: 3, f: 5 }] }), mk(), mk(), mk()];
    loadSong(s); sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 3 }; selRange = null;
    applyTuplet(5);
    const cols = song.measures[0].tabs[0];
    const five = cols.slice(0, 5);
    return { n: cols.length, durs: five.map(c => c.dur), tups: five.map(c => c.tup), noM: five.every(c => !c.tupM),
      beat: five.reduce((a, c) => a + beatsOf(c, 4), 0) };
  });
  T(r.n === 8 && r.durs.every(d => d === 16) && r.tups.every(t => t === 5) && r.noM && Math.abs(r.beat - 1) < 1e-9,
    'T1 预设5连音拆分不写tupM', JSON.stringify(r));

  // T2 自定 8:7：选中 8 个等时值音整体套用 → tup=8/tupM=7，每音 ×7/8，括线标 8:7
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 't', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    const mk = () => ({ dur: 16, dotted: false, chord: '', notes: [{ s: 2, f: 5 }], strum: '', tech: '' });
    s.measures[0].tabs[0] = Array.from({ length: 8 }, mk);
    loadSong(s); sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 2 };
    selRange = { row: 'tab', vi: 0, m1: 0, c1: 0, m2: 0, c2: 7 };
    applyTuplet(8, 7);
    const cols = song.measures[0].tabs[0];
    const svg = document.getElementById('score').innerHTML;
    return { tups: cols.map(c => c.tup), ms: cols.map(c => c.tupM), b1: beatsOf(cols[0], 4),
      lbl: svg.indexOf('>8:7</text>') >= 0, nan: svg.includes('NaN') };
  });
  T(r.tups.every(t => t === 8) && r.ms.every(m => m === 7) && Math.abs(r.b1 - 0.25 * 7 / 8) < 1e-9 && r.lbl && !r.nan,
    'T2 选区套用8:7+括线标注', JSON.stringify({ b1: r.b1, lbl: r.lbl, nan: r.nan }));

  // T3 再次套用同比例 → 整体取消（tup/tupM 清空）
  r = await pg.evaluate(() => { applyTuplet(8, 7);
    const cols = song.measures[0].tabs[0];
    return { off: cols.every(c => !c.tup && !c.tupM) }; });
  T(r.off, 'T3 同比例再套用=取消', JSON.stringify(r));

  // T4 弹窗单音拆分 9:8（M=2的幂可拆）：四分 → 9×32分 tup=9/tupM=8，总拍值 1
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 't', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    const mk = (o) => Object.assign({ dur: 4, dotted: false, chord: '', notes: [], strum: '', tech: '' }, o || {});
    s.measures[0].tabs[0] = [mk({ notes: [{ s: 1, f: 3 }] }), mk(), mk(), mk()];
    loadSong(s); sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 1 }; selRange = null;
    showTupletMenu(200, 200);
    const pm = document.getElementById('popmenu');
    const has = !!pm && !!pm.querySelector('#tup-n') && !!pm.querySelector('#tup-m');
    pm.querySelector('#tup-n').value = 9; pm.querySelector('#tup-m').value = 8;
    pm.querySelector('#tup-ok').click();
    const nine = song.measures[0].tabs[0].slice(0, 9);
    return { has, durs: nine.map(c => c.dur), tups: nine.map(c => c.tup), ms: nine.map(c => c.tupM),
      beat: nine.reduce((a, c) => a + beatsOf(c, 4), 0), svg97: document.getElementById('score').innerHTML.indexOf('>9:8</text>') >= 0 };
  });
  T(r.has && r.durs.every(d => d === 32) && r.tups.every(t => t === 9) && r.ms.every(m => m === 8)
    && Math.abs(r.beat - 1) < 1e-9 && r.svg97, 'T4 弹窗拆分9:8', JSON.stringify({ beat: r.beat, svg: r.svg97 }));

  // T5 弹窗改标：光标在 9:8 组上 → 确定 6:4 → 连续同标组整组改为 6（缺省M不写tupM）
  r = await pg.evaluate(() => {
    showTupletMenu(200, 200);
    const pm = document.getElementById('popmenu');
    const pre = { n: +pm.querySelector('#tup-n').value, m: +pm.querySelector('#tup-m').value };   // 预填当前 9:8
    pm.querySelector('#tup-n').value = 6; pm.querySelector('#tup-m').value = 4;
    pm.querySelector('#tup-ok').click();
    const nine = song.measures[0].tabs[0].slice(0, 9);
    return { pre, tups: nine.map(c => c.tup), noM: nine.every(c => !c.tupM) };
  });
  T(r.pre.n === 9 && r.pre.m === 8 && r.tups.every(t => t === 6) && r.noM, 'T5 弹窗改标整组9:8→6', JSON.stringify(r.pre));

  // T6 v51.5 M 非 2 的幂单音不硬拆 → 弹出自动补齐弹窗；取消=数据不动；弹窗「移除」清整组
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 't', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    const mk = (o) => Object.assign({ dur: 4, dotted: false, chord: '', notes: [], strum: '', tech: '' }, o || {});
    s.measures[0].tabs[0] = [mk({ notes: [{ s: 1, f: 3 }] }), mk(), mk(), mk()];
    loadSong(s); sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 1 }; selRange = null;
    applyTuplet(4, 3);
    const pm = document.getElementById('popmenu');
    const dlg = !!pm && !!pm.querySelector('#tf-ok') && pm.textContent.indexOf('补齐') >= 0;
    pm.querySelector('#tf-x').click();   // 取消
    const kept = song.measures[0].tabs[0].length === 4 && !song.measures[0].tabs[0][0].tup;
    applyTuplet(3);   // 拆三连音后用 N连音弹窗移除
    showTupletMenu(200, 200);
    document.querySelector('#popmenu #tup-rm').click();
    const cleared = !song.measures[0].tabs[0][0].tup;
    return { dlg, kept, cleared };
  });
  T(r.dlg && r.kept && r.cleared, 'T6 非2幂弹补齐+取消不动+弹窗移除', JSON.stringify(r));

  // T7 MusicXML 往返：简谱声部 3连音 + 8:7 八分 → actual/normal 真实读写
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
    const s = createSong('vocal', { title: 'x', beats: 4, unit: 4, key: 'C', nMea: 2, nVox: 1, lyr: 0 });
    s.measures[0].voxes[0] = [V(1, 8, { tup: 3 }), V(2, 8, { tup: 3 }), V(3, 8, { tup: 3 }), V(5, 4), V(6, 4), V(1, 4)];
    s.measures[1].voxes[0] = Array.from({ length: 8 }, (_, i) => V((i % 7) + 1, 8, { tup: 8, tupM: 7 }));
    loadSong(s);
    const xml = exportMusicXML(song);
    const x87 = xml.indexOf('<actual-notes>8</actual-notes><normal-notes>7</normal-notes>') >= 0;
    const x32 = xml.indexOf('<actual-notes>3</actual-notes><normal-notes>2</normal-notes>') >= 0;
    const r2 = importMusicXML(xml);
    const m0 = r2.song.measures[0].voxes[0], m1 = r2.song.measures[1].voxes[0];
    return { x87, x32, t3: m0.slice(0, 3).every(c => (c.tup === 1 ? 3 : c.tup) === 3 && !c.tupM),
      t87: m1.every(c => c.tup === 8 && c.tupM === 7), err: r2.error || '' };
  });
  T(r.x87 && r.x32 && r.t3 && r.t87 && !r.err, 'T7 MusicXML N:M 往返', JSON.stringify(r));

  // T8 时值线选拍 → 自定连音整拍套用：点拍区选中第1拍（4×16分）→ 4:3
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 't', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    const mk16 = () => ({ dur: 16, dotted: false, chord: '', notes: [{ s: 2, f: 5 }], strum: '', tech: '' });
    const mk4 = () => ({ dur: 4, dotted: false, chord: '', notes: [], strum: '', tech: '' });
    s.measures[0].tabs[0] = [mk16(), mk16(), mk16(), mk16(), mk4(), mk4(), mk4()];
    loadSong(s); blurSel = false;
    document.querySelector('[data-beatsel="0:0:0"]').dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerType: 'mouse', button: 0 }));
    const selOk = !!selRange && selRange.c1 === 0 && selRange.c2 === 3;
    applyTuplet(4, 3);
    const four = song.measures[0].tabs[0].slice(0, 4);
    return { selOk, tups: four.map(c => c.tup), ms: four.map(c => c.tupM),
      lbl: document.getElementById('score').innerHTML.indexOf('>4:3</text>') >= 0 };
  });
  T(r.selOk && r.tups.every(t => t === 4) && r.ms.every(m => m === 3) && r.lbl,
    'T8 时值线选拍套用4:3', JSON.stringify(r));

  // T9 v51.5 选区不足自动补齐：选 3 个16分 → 5连音 → 弹窗确认 → 补 2 个空拍成组
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 't', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    const mk16 = () => ({ dur: 16, dotted: false, chord: '', notes: [{ s: 2, f: 5 }], strum: '', tech: '' });
    const mk4 = () => ({ dur: 4, dotted: false, chord: '', notes: [], strum: '', tech: '' });
    s.measures[0].tabs[0] = [mk16(), mk16(), mk16(), mk4(), mk4(), mk4()];
    loadSong(s); sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 2 };
    selRange = { row: 'tab', vi: 0, m1: 0, c1: 0, m2: 0, c2: 2 };
    applyTuplet(5);
    const pm = document.getElementById('popmenu');
    const dlg = !!pm && pm.textContent.indexOf('补齐 2 个空拍') >= 0;
    pm.querySelector('#tf-ok').click();
    const cols = song.measures[0].tabs[0];
    const five = cols.slice(0, 5);
    return { dlg, n: cols.length, tups: five.map(c => c.tup), durs: five.map(c => c.dur),
      empt: five.slice(3).every(c => !(c.notes || []).length), noM: five.every(c => !c.tupM),
      rangeOk: !!selRange && selRange.c2 === 4 };
  });
  T(r.dlg && r.n === 8 && r.tups.every(t => t === 5) && r.durs.every(d => d === 16) && r.empt && r.noM && r.rangeOk,
    'T9 选区不足→补齐成5连音', JSON.stringify(r));

  // T10 单音 7:6（M非2幂）→ 补齐 6 个空拍成组；时值 ×6/7
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 't', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    const mk = (o) => Object.assign({ dur: 8, dotted: false, chord: '', notes: [], strum: '', tech: '' }, o || {});
    s.measures[0].tabs[0] = [mk({ notes: [{ s: 1, f: 7 }] }), mk(), mk(), mk()];
    loadSong(s); sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 1 }; selRange = null;
    applyTuplet(7, 6);
    document.querySelector('#popmenu #tf-ok').click();
    const cols = song.measures[0].tabs[0];
    const seven = cols.slice(0, 7);
    return { n: cols.length, tups: seven.map(c => c.tup), ms: seven.map(c => c.tupM),
      first: (seven[0].notes || []).length === 1, empt: seven.slice(1).every(c => !(c.notes || []).length),
      b1: beatsOf(seven[0], 4), lbl: document.getElementById('score').innerHTML.indexOf('>7:6</text>') >= 0 };
  });
  T(r.n === 10 && r.tups.every(t => t === 7) && r.ms.every(m => m === 6) && r.first && r.empt
    && Math.abs(r.b1 - 0.5 * 6 / 7) < 1e-9 && r.lbl, 'T10 单音7:6→补齐6空拍', JSON.stringify({ n: r.n, b1: r.b1, lbl: r.lbl }));

  /* T11 时值线（符杠）成组：v51.6 立「连音组不被拍边界拆断」；
     v60.59 产品拍板把「不与同拍普通音并组」这一半改掉——同一拍内一律并成一条主梁，
     跨拍的连音块仍整块隔离（① 8:7 就是这一条的守护）。 */
  r = await pg.evaluate(() => {
    const mk = (dur, tup, tupM) => Object.assign({ dur, dotted: false, notes: [{ s: 1, f: 1 }] },
      tup ? { tup } : {}, tupM ? { tupM } : {});
    // ① 8:7 十六分×8：旧逻辑在 cum 跨 1.0 处拆断——应为一整组 8
    const g1 = beamGroups(Array.from({ length: 8 }, () => mk(16, 8, 7)), null, 4).map(g => g.idx.length);
    /* ② 4:3 十六分×4（0→0.75，整块在第 1 拍内）+ 普通八分×2（0.75→1.25、1.25→1.75）。
       v51.6 曾把连音组与同拍普通音**隔离**成 [4,1,1]；v60.59 产品拍板「整拍内一律连成一杠」，
       第 1 拍内的连音块与紧随的八分并成一条主梁 → [5,1]（连音括线仍按 N 分块，不受影响）。 */
    const g2 = beamGroups([mk(16, 4, 3), mk(16, 4, 3), mk(16, 4, 3), mk(16, 4, 3), mk(8), mk(8)], null, 4).map(g => g.idx.length);
    /* ③ 两组三连音八分×6：每组恰好占满一整拍 → 仍是 [3,3]（跨拍的两拍本就该断，回归守护） */
    const g3 = beamGroups(Array.from({ length: 6 }, () => mk(8, 3)), null, 4).map(g => g.idx.length);
    // ④ 普通四个十六分+四个十六分：按拍成组 [4,4] 不受影响（回归守护）
    const g4 = beamGroups(Array.from({ length: 8 }, () => mk(16)), null, 4).map(g => g.idx.length);
    return { g1, g2, g3, g4 };
  });
  T(JSON.stringify(r.g1) === '[8]' && JSON.stringify(r.g2) === '[5,1]'
    && JSON.stringify(r.g3) === '[3,3]' && JSON.stringify(r.g4) === '[4,4]',
    'T11 连音符杠成组（跨拍块隔离保留 + v60.59 同拍并杠）', JSON.stringify(r));

  // T12 v51.6 预设只留三连音：5/6/7 按钮移除、N连音按钮在（mark/vmark 两宿主）
  /* v68.2 新外壳（默认）：行 2 按计划 §1.4 多一枚 #flw-tup3（[data-tup="3"]，与记号面板那两枚走同一个 ebHandler→applyTuplet），
     N 连音进行 2「更多 ▾」（data-fa="r2:tupn"，与 [data-tupcustom] 同一调用 showTupletMenu）。断言按宿主逐个数，不放宽：
     mark / vmark 各恰好一枚 3 连音 + 一枚 N连音；行 2 恰好一枚且只在新外壳；全文没有任何非 3 的预设。 */
  r = await pg.evaluate(() => {
    const all = [...document.querySelectorAll('[data-tup]')];
    const tups = all.map(b => b.dataset.tup);
    const flow = document.body.classList.contains('flow');
    const inHost = (id, sel) => [...document.querySelectorAll('#' + id + ' ' + sel)].length;
    const r2 = all.filter(b => b.id === 'flw-tup3');
    const hosts = { mark: inHost('mark-body', '[data-tup]'), vmark: inHost('vmark-body', '[data-tup]'), r2: r2.length };
    const other = all.length - hosts.mark - hosts.vmark - hosts.r2;   // 不在这三处的 [data-tup] 一律不许有
    let moreTupN = null;
    if (flow) { const mb = document.getElementById('flw-more'); if (mb) { mb.click();
      const it = [...document.querySelectorAll('#popmenu [data-fa="r2:tupn"]')];
      moreTupN = it.length === 1 && /N 连音/.test(it[0].textContent) && it[0].getAttribute('aria-disabled') !== 'true';
      try { closePop(); } catch (_) {} } }
    return { tups, hosts, other, flow, moreTupN,
      only3: tups.every(t => t === '3') && hosts.mark === 1 && hosts.vmark === 1 && other === 0 && hosts.r2 === (flow ? 1 : 0),
      nBtn: document.querySelectorAll('[data-tupcustom]').length === 2 && inHost('mark-body', '[data-tupcustom]') === 1 && inHost('vmark-body', '[data-tupcustom]') === 1,
      label: [...document.querySelectorAll('[data-tupcustom] span')].every(s => s.textContent === 'N连音') };
  });
  T(r.only3 && r.nBtn && r.label && (!r.flow || r.moreTupN === true), 'T12 预设仅3连音+N连音按钮（新外壳：行 2 的 3 连音 + 更多 ▾「N 连音…」）', JSON.stringify(r));

  // ---- v56.8 三连音深修（用户反馈：4/4 简谱 Ctrl 选中三个四分音符点三连音无效） ----
  // T13 用户场景：简谱 0556(八分×4)+高1·7·6(四分×3)，Ctrl 红圈多选（noteSel）→ applyTuplet(3)
  //     四分三连音成组（tup=3、占2拍、小节4拍无误）+ 括线数字3绘出 + noteSel 升格清空
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('vocal', { title: 't', beats: 4, unit: 4, key: 'C', nMea: 1, nVox: 1, lyr: 1 });
    const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
    s.measures[0].voxes[0] = [V(0, 8), V(5, 8), V(5, 8), V(6, 8), V(1, 4, { oct: 1 }), V(7, 4), V(6, 4)];
    loadSong(s); blurSel = false; selRange = null;
    sel = { row: 'vox', vi: 0, mi: 0, ci: 6 };
    noteSel = [ { mi: 0, ci: 5, si: 0, vi: 0, row: 'vox' },   /* 乱序+含当前列：按 ci 排序后应成组 */
                { mi: 0, ci: 4, si: 0, vi: 0, row: 'vox' },
                { mi: 0, ci: 6, si: 0, vi: 0, row: 'vox' } ];
    applyTuplet(3);
    render();
    const cols = song.measures[0].voxes[0];
    const svg = document.getElementById('score').innerHTML;
    return { tups: cols.map(c => c.tup || 0).join(','), nCols: cols.length,
      beats: +cols.reduce((a, c) => a + beatsOf(c, 4), 0).toFixed(4),
      errN: beatErrors().length, nsCleared: noteSel.length === 0,
      has3: [...document.querySelectorAll('#score text')].some(t => t.textContent === '3' && t.getAttribute('font-style') === 'italic'),
      nan: svg.includes('NaN') };
  });
  T(r.tups === '0,0,0,0,3,3,3' && r.nCols === 7 && r.beats === 4 && r.errN === 0 && r.nsCleared && r.has3 && !r.nan,
    'T13 Ctrl多选三个四分→四分三连音(简谱·占2拍·括线3)', JSON.stringify(r));

  // T14 TAB 四分三连音：Ctrl 多选含同列两弦（重复 ci 去重）→ 成组；括线在符干下方
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 't', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    const mk = (o) => Object.assign({ dur: 4, dotted: false, chord: '', notes: [], strum: '', tech: '' }, o || {});
    s.measures[0].tabs[0] = [mk({ notes: [{ s: 3, f: 0 }] }), mk({ notes: [{ s: 3, f: 2 }, { s: 4, f: 2 }] }),
                             mk({ notes: [{ s: 2, f: 1 }] }), mk({ notes: [{ s: 1, f: 0 }] })];
    loadSong(s); blurSel = false; selRange = null;
    sel = { row: 'tab', vi: 0, mi: 0, ci: 1, si: 3 };
    noteSel = [ { mi: 0, ci: 1, si: 3, vi: 0, row: 'tab' }, { mi: 0, ci: 1, si: 4, vi: 0, row: 'tab' },   /* 同列两弦 */
                { mi: 0, ci: 2, si: 2, vi: 0, row: 'tab' }, { mi: 0, ci: 3, si: 1, vi: 0, row: 'tab' } ];
    applyTuplet(3);
    render();
    const cols = song.measures[0].tabs[0];
    return { tups: cols.map(c => c.tup || 0).join(','),
      beats: +cols.reduce((a, c) => a + beatsOf(c, 4), 0).toFixed(4), errN: beatErrors().length,
      has3: [...document.querySelectorAll('#score text')].some(t => t.textContent === '3' && t.getAttribute('font-style') === 'italic') };
  });
  T(r.tups === '0,3,3,3' && r.beats === 3 && r.errN === 1 && r.has3,
    'T14 TAB四分三连音(同列两弦去重成组)', JSON.stringify(r));

  // T15 五线谱四分三连音：noteSel 路径 + 括线在谱表上方 + 无 NaN
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('vocal', { title: 't', beats: 4, unit: 4, key: 'C', nMea: 1, nVox: 1, lyr: 0 });
    s.voxNotations = ['staff'];
    const V = (deg, dur) => ({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false });
    s.measures[0].voxes[0] = [V(5, 4), V(6, 4), V(7, 4), V(5, 4)];
    loadSong(s); blurSel = false; selRange = null;
    sel = { row: 'vox', vi: 0, mi: 0, ci: 0 };
    noteSel = [ { mi: 0, ci: 0, si: 0, vi: 0, row: 'vox' }, { mi: 0, ci: 1, si: 0, vi: 0, row: 'vox' },
                { mi: 0, ci: 2, si: 0, vi: 0, row: 'vox' } ];
    applyTuplet(3);
    render();
    const cols = song.measures[0].voxes[0];
    return { tups: cols.map(c => c.tup || 0).join(','),
      beats: +cols.reduce((a, c) => a + beatsOf(c, 4), 0).toFixed(4),
      has3: [...document.querySelectorAll('#score text')].some(t => t.textContent === '3' && t.getAttribute('font-style') === 'italic'),
      nan: document.getElementById('score').innerHTML.includes('NaN') };
  });
  T(r.tups === '3,3,3,0' && r.beats === 3 && r.has3 && !r.nan,
    'T15 五线谱四分三连音(noteSel路径)', JSON.stringify(r));

  // T16 非法选区拒绝：不连续（跳列）与时值混杂 → 拒绝且数据不动
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('vocal', { title: 't', beats: 4, unit: 4, key: 'C', nMea: 1, nVox: 1, lyr: 0 });
    const V = (deg, dur) => ({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false });
    s.measures[0].voxes[0] = [V(1, 4), V(2, 4), V(3, 4), V(4, 4)];
    loadSong(s); blurSel = false;
    const toasts = []; const t0 = window.toast; window.toast = (x) => toasts.push(x);
    /* ① 跳列（ci 0,1,3） */
    selRange = null; sel = { row: 'vox', vi: 0, mi: 0, ci: 0 };
    noteSel = [ { mi: 0, ci: 0, si: 0, vi: 0, row: 'vox' }, { mi: 0, ci: 1, si: 0, vi: 0, row: 'vox' }, { mi: 0, ci: 3, si: 0, vi: 0, row: 'vox' } ];
    applyTuplet(3);
    const afterSkip = song.measures[0].voxes[0].map(c => c.tup || 0).join(',');
    /* ② 时值混杂（改 ci1 为八分） */
    song.measures[0].voxes[0][1].dur = 8;
    selRange = null; noteSel = [ { mi: 0, ci: 0, si: 0, vi: 0, row: 'vox' }, { mi: 0, ci: 1, si: 0, vi: 0, row: 'vox' }, { mi: 0, ci: 2, si: 0, vi: 0, row: 'vox' } ];
    applyTuplet(3);
    const afterMix = song.measures[0].voxes[0].map(c => c.tup || 0).join(',');
    window.toast = t0;
    return { afterSkip, afterMix, toasts };
  });
  T(r.afterSkip === '0,0,0,0' && r.afterMix === '0,0,0,0'
    && r.toasts.some(x => /相邻连续/.test(x)) && r.toasts.some(x => /等时值/.test(x)),
    'T16 非法选区拒绝(跳列/混时值)且数据不动', JSON.stringify(r.toasts));

  // T17 四分三连音 MusicXML 往返：type=quarter + 3:2 time-modification → 导入回 tup（拍值等价）
  r = await pg.evaluate(async () => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('vocal', { title: 'RT', beats: 4, unit: 4, key: 'C', nMea: 1, nVox: 1, lyr: 0 });
    const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
    s.measures[0].voxes[0] = [V(0, 8), V(5, 8), V(5, 8), V(6, 8), V(1, 4, { tup: 3 }), V(7, 4, { tup: 3 }), V(6, 4, { tup: 3 })];
    loadSong(s);
    const xml = exportMusicXML(song);
    const hasTM = /<type>quarter<\/type>[\s\S]{0,200}?<time-modification><actual-notes>3<\/actual-notes><normal-notes>2<\/normal-notes><\/time-modification>/.test(xml)
      || /<time-modification><actual-notes>3<\/actual-notes><normal-notes>2<\/normal-notes><\/time-modification>[\s\S]{0,60}?<type>quarter<\/type>/.test(xml)
      || (xml.includes('<actual-notes>3</actual-notes>') && xml.includes('<type>quarter</type>'));
    const r2 = importMusicXML(xml);
    const cols2 = r2.song.measures[0].voxes[0];
    const last3 = cols2.slice(-3);
    const beats2 = +cols2.reduce((a, c) => a + beatsOf(c, 4), 0).toFixed(4);
    return { hasTM, durs: last3.map(c => c.dur).join(','), tupEq: last3.every(c => c.tup && (c.tup === 1 || c.tup === 3) && !c.tupM), beats2 };
  });
  T(r.hasTM && r.durs === '4,4,4' && r.tupEq && r.beats2 === 4,
    'T17 四分三连音MusicXML往返(3:2+quarter)', JSON.stringify(r));

  // T18 v56.9 连音弧与普通连音线同款同规则（用户截图：括线端点压到高音点）：
  //     ① 弧=tieSVG 填充细尖弧（非细描边折弧）② 组内含高八度点时弧整体抬升让位 ③ 数字断口纸底垫块
  r = await pg.evaluate(() => {
    const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
    const tieArcs = () => [...document.querySelectorAll('#score path[fill="var(--ink)"]')]
      .map(p2 => p2.getAttribute('d') || '').filter(d => /^M .+ Q .+ Q .+ Z$/.test(d))
      .map(d => { const nn = d.match(/-?[\d.]+/g).map(Number); return { x1: nn[0], y1: nn[1], x2: nn[4], y2: nn[5] }; });
    const arcNear = (xm) => tieArcs().filter(a => a.x1 < xm && a.x2 > xm && Math.abs(a.y1 - a.y2) < 0.5)
      .sort((a, b) => (b.x2 - b.x1) - (a.x2 - a.x1))[0];
    const num3x = () => { const t = [...document.querySelectorAll('#score text')]
      .find(t2 => t2.textContent === '3' && t2.getAttribute('font-style') === 'italic'); return t ? +t.getAttribute('x') : null; };
    const build = (hi) => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
      const s = createSong('vocal', { title: 't', beats: 4, unit: 4, key: 'C', nMea: 1, nVox: 1, lyr: 0 });
      s.measures[0].voxes[0] = [V(0, 8), V(5, 8), V(5, 8), V(6, 8),
        V(1, 4, { oct: hi ? 1 : 0, tup: 3 }), V(7, 4, { tup: 3 }), V(6, 4, { tup: 3 })];
      loadSong(s); blurSel = true; render();
      const xm = num3x(); const arc = xm != null ? arcNear(xm) : null;
      return { xm, y: arc ? arc.y1 : null,
        mask: !!document.querySelector('#score rect[fill="var(--paper)"]:not(.pagebg)') };
    };
    const hi = build(true), lo = build(false);
    return { hiY: hi.y, loY: lo.y, lifted: hi.y != null && lo.y != null && (lo.y - hi.y) >= 7,
      mask: hi.mask && lo.mask, found: hi.xm != null && lo.xm != null };
  });
  T(r.found && r.lifted && r.mask,
    'T18 连音弧同tie样式(tieSVG+高八度让位+纸底断口)', JSON.stringify(r));

  /* ===== v60.59 追加：符杠按拍并组 ===== */
  const BG = `
    loadSong(createSong('vocal',{beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0}));
    window.__C=(dur,o)=>Object.assign({dur,dotted:false,deg:1,acc:'',oct:0,lyrics:[],tie:false},o||{});
    window.__G=(cols,u)=>beamGroups(cols,null,u||4).map(g=>g.idx.join('-'));
  `;

  // T19 一拍内两组 3 连音 → 一条主梁（产品拍板）
  r = await pg.evaluate(BG + `(()=>{
    const two3=__G([...Array(6)].map(()=>__C(16,{tup:3})));
    const six =__G([...Array(6)].map(()=>__C(16,{tup:6})));
    return {two3, six};
  })()`);
  T(r.two3.length === 1 && r.two3[0] === '0-1-2-3-4-5' && r.six.length === 1,
    'T19 一拍内两组 3 连音并成一条杠（旧版拆两截）', JSON.stringify(r));

  // T20 护栏：跨拍的非整拍连音块（8:7）不得被拍界切断（v51.6 口径）
  r = await pg.evaluate(BG + `(()=>{
    const alone=__G([...Array(8)].map(()=>__C(16,{tup:8,tupM:7})));
    const after=__G([...[1,2].map(()=>__C(16)), ...Array(8).fill(0).map(()=>__C(16,{tup:8,tupM:7}))]);
    return {alone, after};
  })()`);
  T(r.alone.join('|') === '0-1-2-3-4-5-6-7' && r.after.join('|') === '0-1|2-3-4-5-6-7-8-9',
    'T20 护栏：8:7 跨拍连音块不被拍界切断（v51.6 口径保留）', JSON.stringify(r));

  // T21 未涉及场景零变化
  r = await pg.evaluate(BG + `(()=>({
    tri:   __G([...[1,2,3].map(()=>__C(8,{tup:3})), ...[1,2,3,4].map(()=>__C(16))]),
    plain: __G([...Array(8)].map(()=>__C(16))),
    rest:  __G([__C(16),__C(16),Object.assign(__C(16),{deg:0,dur:4}),__C(16),__C(16)]),
    six8:  __G([...Array(6)].map(()=>__C(8)), 8)
  }))()`);
  T(r.tri.join('|') === '0-1-2|3-4-5-6' && r.plain.join('|') === '0-1-2-3|4-5-6-7'
    && r.rest.join('|') === '0-1|3-4' && r.six8.join('|') === '0-1-2|3-4-5',
    'T21 零副作用：整拍三连音/普通十六分/休止打断/6-8 大拍 分组不变', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
