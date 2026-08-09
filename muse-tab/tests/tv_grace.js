/* v52.7/52.8 倚音跨谱类统一 + 连音线同一线径回归：
   - tieSVG 同一线径（v52.8 产品拍板）：中部厚度恒为 th、与跨度无关，两端细尖
   - TAB 倚音 col.grace/graceA {notes:[{s,f}],dur}：入口按钮 → askText 品位输入；渲染小品位数字
     + 小连音弧 + 可点热区（v52.8：TAB 行不画斜杠，斜杠仅五线谱行）；联排五线谱同步小符头；布局宽度占位
   - showTabGraceMenu 弹窗逐音改弦/品/时值
   - MusicXML：<grace slash> + string/fret 出入往返
   - vox 倚音（简谱/五线谱）行为不回归 */
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

  // T1 tieSVG 同一线径（v52.8）+ 线径细化 ×0.6（v52.9）：中部厚度=th×0.6 恒定
  //    （跨度 8/60/200 相同、不随跨度加粗/收细）；两端细尖=内外缘共起终点
  //    （几何断言：厚度=|qy-q2|/2，从 path d 反解）
  let r = await pg.evaluate(() => {
    const parse = (svg) => svg.match(/d="([^"]+)"/)[1].split(/[MQZ\s]+/).filter(Boolean).map(Number);
    const thick = (svg) => { const t = parse(svg); return Math.abs(t[3] - t[7]) / 2; };   // [x1,y1, mx,qy,x2,y2, mx,q2,x1,y1]
    const sharp = (svg) => { const t = parse(svg); return t[0] === t[8] && t[1] === t[9]; };
    return {
      s8: thick(tieSVG(0, 0, 8, 0, -10, 1.8)),
      s60: thick(tieSVG(0, 0, 60, 0, -10, 1.8)),
      s200: thick(tieSVG(0, 0, 200, 0, -10, 1.8)),
      dft: thick(tieSVG(0, 0, 60, 0, -10)),             // 缺省 th=1.9 → 1.14
      sharp: sharp(tieSVG(0, 0, 60, 0, -10)),           // 两端细尖（内外缘共点）
    };
  });
  // 容差 0.06：path 坐标 toFixed(1) 量化 ±0.05（1.08→读出 1.1、1.14→1.15）
  T(Math.abs(r.s8 - 1.08) < 0.06 && Math.abs(r.s60 - 1.08) < 0.06 && Math.abs(r.s200 - 1.08) < 0.06
    && Math.abs(r.dft - 1.14) < 0.06 && Math.abs(r.s8 - r.s200) < 0.06 && r.sharp,
    'T1 tieSVG同一线径细化+两端细尖', JSON.stringify(r));

  // T2 TAB 倚音渲染：小品位数字（font-size=8）+ 前/后热区 + 数字在主音左/右（几何）
  //    + v52.8 不画斜杠（加倚音前后 <line> 数不变——数字/弧/热区分别是 text/path/rect）
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 'g', beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 0, lyr: 0 });
    const mk4 = (f, st) => ({ dur: 4, dotted: false, chord: '', notes: [{ s: st, f }], strum: '', tech: '' });
    s.measures[0].tabs[0] = [mk4(5, 3), mk4(7, 3), mk4(5, 2), mk4(3, 2)];
    loadSong(s); blurSel = true; render();
    const lineN = () => (document.getElementById('score').innerHTML.match(/<line /g) || []).length;
    const l0 = lineN();
    song.measures[0].tabs[0][1].grace = { notes: [{ s: 3, f: 5 }, { s: 3, f: 7 }], dur: 16 };
    song.measures[0].tabs[0][2].graceA = { notes: [{ s: 2, f: 8 }], dur: 8 };
    render();
    const h = document.getElementById('score').innerHTML;
    const pre = document.querySelector('[data-tabgrace="0:1:0:pre"]'), post = document.querySelector('[data-tabgrace="0:2:0:post"]');
    // 几何：前倚音数字 x < 主音 x；后倚音数字 x > 主音 x
    const gx = [...document.querySelectorAll('#score text[font-size="8"]')].map(t => +t.getAttribute('x'));
    const mainX1 = colBoxes['t0:0:1'].x + colBoxes['t0:0:1'].w / 2;
    return { pre: !!pre, post: !!post, n8: gx.length,
      preLeft: gx.length >= 2 && gx[0] < mainX1 && gx[1] < mainX1,
      noSlash: lineN() === l0,
      nan: h.includes('NaN') };
  });
  T(r.pre && r.post && r.n8 === 3 && r.preLeft && r.noSlash && !r.nan, 'T2 TAB倚音渲染+热区+无斜杠', JSON.stringify(r));

  // T3 联排五线谱同步：tabStaff 打开后，倚音新增 ≥2 枚小符头（noteheadBlack 字形计数）
  r = await pg.evaluate(() => {
    const cnt = () => { const d0 = SMUFL.noteheadBlack.d.slice(0, 24);
      return document.getElementById('score').innerHTML.split(d0).length - 1; };
    song.tabStaff = 1; delete song.measures[0].tabs[0][1].grace; render();
    const before = cnt();
    song.measures[0].tabs[0][1].grace = { notes: [{ s: 3, f: 5 }, { s: 3, f: 7 }], dur: 16 }; render();
    const after = cnt();
    return { before, after, gained: after - before };
  });
  T(r.gained >= 2, 'T3 联排五线谱小符头同步', JSON.stringify(r));

  // T4 布局占位：带倚音的列宽 > 去掉倚音后的同列宽
  r = await pg.evaluate(() => {
    const w1 = colBoxes['t0:0:1'].w;
    const g = song.measures[0].tabs[0][1].grace;
    delete song.measures[0].tabs[0][1].grace; render();
    const w0 = colBoxes['t0:0:1'].w;
    song.measures[0].tabs[0][1].grace = g; render();
    return { w1, w0 };
  });
  T(r.w1 > r.w0 + 5, 'T4 倚音宽度占位', JSON.stringify(r));

  // T5 入口按钮 + askText 品位输入落数据（落在当前弦位）
  r = await pg.evaluate(() => {
    const btns = document.querySelectorAll('#mark-body [data-tabgr]').length;
    sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 3 }; noteSel = []; selRange = null; blurSel = false; render();
    document.querySelector('#mark-body [data-tabgr="pre"]').click();
    const inp = document.getElementById('ask-in');
    if (!inp) return { btns, noPopup: true };
    inp.value = '5 7';
    document.getElementById('ask-ok').click();
    const g = song.measures[0].tabs[0][0].grace;
    return { btns, g: JSON.stringify(g) };
  });
  T(r.btns === 2 && r.g === JSON.stringify({ notes: [{ s: 3, f: 5 }, { s: 3, f: 7 }], dur: 8 }),
    'T5 入口按钮+品位输入', JSON.stringify(r));

  // T6 编辑弹窗：改弦位 / 品位± / 时值 / 删除
  r = await pg.evaluate(() => {
    showTabGraceMenu(0, 0, 0, 'pre', 100, 100);
    const pm = document.getElementById('popmenu');
    if (!pm) return { noPopup: true };
    pm.querySelector('[data-gs="0:2"]').click();          // 音符1 → 2弦
    const s2 = normTabGrace(song.measures[0].tabs[0][0].grace).notes[0].s;
    document.querySelector('#popmenu [data-gp="1"]').click();   // 音符2 品+ → 8
    const f2 = normTabGrace(song.measures[0].tabs[0][0].grace).notes[1].f;
    document.querySelector('#popmenu [data-gt="32"]').click();  // 时值 32
    const d32 = normTabGrace(song.measures[0].tabs[0][0].grace).dur;
    document.querySelector('#popmenu [data-gx]').click();       // 删除
    const gone = !song.measures[0].tabs[0][0].grace;
    return { s2, f2, d32, gone };
  });
  T(r.s2 === 2 && r.f2 === 8 && r.d32 === 32 && r.gone, 'T6 弹窗编辑弦/品/时值/删除', JSON.stringify(r));

  // T7 MusicXML 往返：<grace slash> + string/fret + 组内时值
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 'gx', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    const mk4 = (f, st) => ({ dur: 4, dotted: false, chord: '', notes: [{ s: st, f }], strum: '', tech: '' });
    s.measures[0].tabs[0] = [mk4(5, 3), mk4(7, 3), mk4(5, 2), mk4(3, 4)];
    s.measures[0].tabs[0][1].grace = { notes: [{ s: 2, f: 3 }, { s: 2, f: 5 }], dur: 16 };
    loadSong(s);
    const xml = exportMusicXML(song);
    const hasX = xml.includes('<grace slash="yes"/>') && /<grace slash="yes"\/>[\s\S]*?<type>16th<\/type>[\s\S]*?<string>2<\/string><fret>3<\/fret>/.test(xml);
    const r2 = importMusicXML(xml);
    const g = r2.song && r2.song.measures[0].tabs[0].map(c => c.grace ? normTabGrace(c.grace) : null).find(Boolean);
    return { hasX, g: JSON.stringify(g), err: (r2 && r2.error) || '' };
  });
  T(r.hasX && r.g === JSON.stringify({ notes: [{ s: 2, f: 3 }, { s: 2, f: 5 }], dur: 16 }) && !r.err,
    'T7 MusicXML倚音往返', JSON.stringify(r));

  // T8 vox 倚音回归：简谱倚音仍渲染 data-grace 热区（数据/交互不受 TAB 倚音改动影响）
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('vocal', { title: 'v', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 0, nVox: 1, lyr: 1 });
    s.measures[0].voxes[0] = Array.from({ length: 4 }, (_, i) => ({ dur: 4, dotted: false, deg: i + 1, acc: '', oct: 0, lyrics: [], tie: false }));
    s.measures[0].voxes[0][1].grace = { notes: [{ deg: 3, oct: 0 }], dur: 8 };
    loadSong(s); blurSel = true; render();
    const z = document.querySelector('[data-grace="0:1:0:pre"]');
    return { z: !!z, nan: document.getElementById('score').innerHTML.includes('NaN') };
  });
  T(r.z && !r.nan, 'T8 vox倚音回归', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
