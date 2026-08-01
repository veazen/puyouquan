/* v51.4 N:M 自定连音回归：
   - 预设 3/5/6/7 行为不变（拆分/整体切换，不写 tupM——旧版兼容）
   - 自定 N:M：选中 N 个等时值音整体切换（M 任意 1–16）；单音拆分（M 须为 2 的幂）
   - beatsOf ×M/N；括线标 N:M、断口随标宽自适应；弹窗改标=连续同标组整组改
   - MusicXML：time-modification 真实 N:M 出/入往返（修 5/6/7 误写 3:2 的旧缺陷）
   - 时值线（拍区）选中整拍 → 自定连音套用 */
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

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
