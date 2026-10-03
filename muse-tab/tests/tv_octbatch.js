/* v60.91 简谱记号面板 升/降八度（批量）：
   - 无选中 → 本声部全曲整体移八度（含和音 adds / 倚音 grace；休止列不动）
   - 有选中（Ctrl 多选 noteSel / 区域选区 selRange）→ 只动选中列
   - 越界整体拒绝：任一音已带 3 个八度点则整曲/整选区不动（保相对音高轮廓）
   - 面板钮在新版外壳恢复可见（v41.5 的 display:none 去重规则撤销）；撤销一步还原
   - 顶栏 eb-octup 单音语义不回归（仍只动当前音） */
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

  // T1 无选中 → 全曲升八度：主音 oct 各 +1，休止不动，和音/倚音随动
  let r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
    const s = createSong('vocal', { title: 'o1', beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 0, nVox: 1, lyr: 0 });
    s.measures[0].voxes[0] = [V(1, 4, { oct: -1 }), V(0, 4), V(3, 4, { adds: [{ deg: 5, acc: '', oct: 1 }] }), V(5, 4)];
    s.measures[1].voxes[0] = [V(6, 4, { grace: { notes: [{ deg: 5, oct: 0 }], dur: 8 } }), V(1, 4, { oct: 1 }), V(2, 4), V(2, 4)];
    loadSong(s);
    sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 3 }; noteSel = []; selRange = null; render();
    undoStack.length = 0;   // loadSong 链路自带一条快照，清掉只量本操作
    document.getElementById('b-octup').click();
    /* v63.7 B1 ⑨ 无选区＝全曲，先弹确认 */
    const ask = !!document.getElementById('oc-yes'); if (ask) document.getElementById('oc-yes').click();
    const m0 = song.measures[0].voxes[0], m1 = song.measures[1].voxes[0];
    return { o0: m0[0].oct, rest: m0[1].oct, o2: m0[2].oct, add: m0[2].adds[0].oct,
      g: m1[0].grace.notes[0].oct, o10: m1[0].oct, o11: m1[1].oct, undoN: undoStack.length };
  });
  T(r.o0 === 0 && r.rest === 0 && r.o2 === 1 && r.add === 2 && r.g === 1 && r.o10 === 1 && r.o11 === 2 && r.undoN === 1,
    'T1 无选中→全曲升八度（含和音/倚音，休止不动）', JSON.stringify(r));

  // T2 撤销一步还原全曲位移
  r = await pg.evaluate(() => { undo();
    const m0 = song.measures[0].voxes[0], m1 = song.measures[1].voxes[0];
    return { o0: m0[0].oct, add: m0[2].adds[0].oct, g: m1[0].grace.notes[0].oct };
  });
  T(r.o0 === -1 && r.add === 1 && r.g === 0, 'T2 撤销还原全曲八度位移', JSON.stringify(r));

  // T3 Ctrl 多选 → 只动选中列；选区保留可连击（再点一次再移一个八度）
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
    const s = createSong('vocal', { title: 'o3', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 0, nVox: 1, lyr: 0 });
    s.measures[0].voxes[0] = [V(1, 4), V(2, 4), V(3, 4), V(5, 4)];
    loadSong(s);
    sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 3 }; selRange = null;
    noteSel = [{ mi: 0, ci: 0, si: 0, vi: 0, row: 'vox' }, { mi: 0, ci: 2, si: 0, vi: 0, row: 'vox' }]; render();
    document.getElementById('b-octdn').click();
    const once = song.measures[0].voxes[0].map(c => c.oct).join(',');
    const kept = noteSel.length;
    document.getElementById('b-octdn').click();
    const twice = song.measures[0].voxes[0].map(c => c.oct).join(',');
    noteSel = [];
    return { once, kept, twice };
  });
  T(r.once === '-1,0,-1,0' && r.kept === 2 && r.twice === '-2,0,-2,0',
    'T3 多选只动选中列，选区保留可连击', JSON.stringify(r));

  // T4 区域选区（selRange）→ notesInRange 路径只动选区内列
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
    const s = createSong('vocal', { title: 'o4', beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 0, nVox: 1, lyr: 0 });
    s.measures[0].voxes[0] = [V(1, 4), V(2, 4), V(3, 4), V(5, 4)];
    s.measures[1].voxes[0] = [V(6, 4), V(5, 4), V(3, 4), V(2, 4)];
    loadSong(s);
    sel = { mi: 0, row: 'vox', vi: 0, ci: 1, si: 3 }; noteSel = [];
    selRange = { row: 'vox', vi: 0, m1: 0, m2: 1, c1: 2, c2: 1 };   // 第1小节第3列 ～ 第2小节第2列
    render();
    document.getElementById('b-octup').click();
    const a = song.measures[0].voxes[0].map(c => c.oct).join(',');
    const b2 = song.measures[1].voxes[0].map(c => c.oct).join(',');
    selRange = null;
    return { a, b2 };
  });
  T(r.a === '0,0,1,1' && r.b2 === '1,1,0,0', 'T4 区域选区只动选区内列', JSON.stringify(r));

  // T5 越界整体拒绝：有音已带 3 个高音点 → 全曲不动、不入撤销栈
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
    const s = createSong('vocal', { title: 'o5', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 0, nVox: 1, lyr: 0 });
    s.measures[0].voxes[0] = [V(1, 4), V(2, 4, { oct: 3 }), V(3, 4), V(5, 4)];
    loadSong(s);
    sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 3 }; noteSel = []; selRange = null; render();
    undoStack.length = 0;   // 同 T1：只量本操作
    document.getElementById('b-octup').click();
    return { octs: song.measures[0].voxes[0].map(c => c.oct).join(','), undoN: undoStack.length };
  });
  T(r.octs === '0,3,0,0' && r.undoN === 0, 'T5 越界整体拒绝（不动谱面不入撤销栈）', JSON.stringify(r));

  // T6 面板钮新版外壳可见 + 字形化文案「升八度/降八度」；六线谱声部守卫不炸不改数据
  r = await pg.evaluate(() => {
    const up = document.getElementById('b-octup'), dn = document.getElementById('b-octdn');
    const vis = getComputedStyle(up).display !== 'none' && getComputedStyle(dn).display !== 'none';
    const cap = (up.textContent || '') + '|' + (dn.textContent || '');
    const s = createSong('guitar', { title: 'o6', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s.measures[0].tabs[0] = [{ dur: 4, dotted: false, notes: [{ s: 3, f: 2 }] }];
    loadSong(s);
    sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 3 }; noteSel = []; selRange = null; render();
    let threw = false;
    try { octShiftBatch(1); } catch (_) { threw = true; }
    return { vis, cap, threw, shell: document.body.classList.contains('shell') };
  });
  T(r.vis && r.shell && r.cap.indexOf('升八度') >= 0 && r.cap.indexOf('降八度') >= 0 && !r.threw,
    'T6 面板钮可见+文案+六线谱守卫', JSON.stringify(r));

  // T7 顶栏单音钮语义不回归：eb-octup 仍只动当前音
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
    const s = createSong('vocal', { title: 'o7', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 0, nVox: 1, lyr: 0 });
    s.measures[0].voxes[0] = [V(1, 4), V(2, 4), V(3, 4), V(5, 4)];
    loadSong(s);
    sel = { mi: 0, row: 'vox', vi: 0, ci: 1, si: 3 }; noteSel = []; selRange = null;
    if (typeof lastEnt !== 'undefined') lastEnt = null;
    render();
    bumpOct(1);
    return { octs: song.measures[0].voxes[0].map(c => c.oct).join(',') };
  });
  T(r.octs === '0,1,0,0', 'T7 顶栏单音八度语义不回归', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
