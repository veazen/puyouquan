/* v52.5 左右手指法 + 拨片方向回归：
   - 记号层新按钮：左手 T/1-4/0（圆圈字）、右手 pima（全部吉他类型，不再限指弹）、拨片 ⊓/∨
   - 无多选时作用于当前弦位音；同键再点清除；Ctrl+Alt+T/1-4/0 快捷键（GP 对标）
   - 渲染：lhF 标注带圆圈字、rhFing 品位下方、pk 列级 ⊓/∨；清除技法一并清 lhF
   - MusicXML：fingering / pluck / down-bow·up-bow 出入往返 */
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

  // T1 v59.1 记号层收纳：左手/右手两枚手形钮 + 拨片2；点击弹窗内 6/4 个选指项
  let r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 'f', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    const mk8 = (f, st) => ({ dur: 8, dotted: false, chord: '', notes: [{ s: st, f }], strum: '', tech: '' });
    s.measures[0].tabs[0] = [mk8(5, 3), mk8(7, 3), mk8(5, 2), mk8(7, 2), mk8(5, 1), mk8(7, 1), mk8(5, 2), mk8(3, 2)];
    loadSong(s); blurSel = false;
    sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 3 }; noteSel = []; render();
    const hands = document.querySelectorAll('#mark-body [data-hand]').length;
    const pk = document.querySelectorAll('#mark-body [data-pk]').length;
    showHandMenu('lh', 200, 200);
    const lhf = document.querySelectorAll('#popmenu [data-pki]').length;
    closePop(); showHandMenu('rh', 200, 200);
    const rhf = document.querySelectorAll('#popmenu [data-pki]').length;
    closePop();
    return { hands, pk, lhf, rhf };
  });
  T(r.hands === 2 && r.pk === 2 && r.lhf === 6 && r.rhf === 4, 'T1 手形钮+弹窗选指项', JSON.stringify(r));

  // T2 左手指法：无多选作用当前音；同键清除；Ctrl+Alt 快捷键
  r = await pg.evaluate(() => {
    sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 3 }; noteSel = []; selRange = null; render();
    applyFingerMark('lhF', '2');
    const a = song.measures[0].tabs[0][0].notes[0].lhF;
    applyFingerMark('lhF', '2');
    const cleared = !song.measures[0].tabs[0][0].notes[0].lhF;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '3', ctrlKey: true, altKey: true }));
    const kb3 = song.measures[0].tabs[0][0].notes[0].lhF;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 't', ctrlKey: true, altKey: true }));
    const kbT = song.measures[0].tabs[0][0].notes[0].lhF;
    return { a, cleared, kb3, kbT };
  });
  T(r.a === '2' && r.cleared && r.kb3 === '3' && r.kbT === 'T', 'T2 左手标记+快捷键', JSON.stringify(r));

  // T3 右手指法：任意 gtype 可标（v59.1 经弹窗选指），无多选作用当前音
  r = await pg.evaluate(() => {
    sel = { mi: 0, row: 'tab', vi: 0, ci: 1, si: 3 }; noteSel = []; render();
    showHandMenu('rh', 200, 200);
    document.querySelector('#popmenu [data-pki="0"]').click();   // 第一项 = 拇指 p
    const set = song.measures[0].tabs[0][1].notes[0].rhFing;
    const popGone = !document.getElementById('popmenu');
    const svg = document.getElementById('score').innerHTML.indexOf('>p</text>') >= 0;
    return { set, svg, popGone, gtype: song.gtype || '(none)' };
  });
  T(r.set === 'p' && r.svg && r.popGone, 'T3 右手pima弹窗选指', JSON.stringify(r));

  // T4 拨片方向：列级 toggle + ⊓/∨ 渲染
  r = await pg.evaluate(() => {
    sel = { mi: 0, row: 'tab', vi: 0, ci: 2, si: 2 }; noteSel = []; render();
    document.querySelector('#mark-body [data-pk="d"]').click();
    const d = song.measures[0].tabs[0][2].pk;
    const down = document.getElementById('score').innerHTML.indexOf('v -5 h 6.8 v 5') >= 0;
    document.querySelector('#mark-body [data-pk="d"]').click();
    const off = !song.measures[0].tabs[0][2].pk;
    document.querySelector('#mark-body [data-pk="u"]').click();
    const u = song.measures[0].tabs[0][2].pk;
    return { d, down, off, u };
  });
  T(r.d === 'd' && r.down && r.off && r.u === 'u', 'T4 拨片方向toggle+渲染', JSON.stringify(r));

  // T5 lhF 圆圈字渲染 + 清除技法一并清 lhF + 无 NaN
  r = await pg.evaluate(() => {
    sel = { mi: 0, row: 'tab', vi: 0, ci: 3, si: 2 }; noteSel = []; render();
    applyFingerMark('lhF', '4');
    const h = document.getElementById('score').innerHTML;
    const circ = h.indexOf('r="4.7"') >= 0 && h.indexOf('>4</text>') >= 0;
    noteSel = [{ mi: 0, ci: 3, si: 2, vi: 0, row: 'tab' }];
    techFromBar('');   // 清除技法
    const cleared = !song.measures[0].tabs[0][3].notes[0].lhF;
    noteSel = [];
    return { circ, cleared, nan: h.includes('NaN') };
  });
  T(r.circ && r.cleared && !r.nan, 'T5 圆圈字渲染+清除联动', JSON.stringify(r));

  // T6 MusicXML 往返：fingering / pluck / down-bow·up-bow
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 'fx', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    const mk4 = (f, st) => ({ dur: 4, dotted: false, chord: '', notes: [{ s: st, f }], strum: '', tech: '' });
    s.measures[0].tabs[0] = [mk4(5, 3), mk4(7, 3), mk4(5, 2), mk4(3, 4)];
    s.measures[0].tabs[0][0].notes[0].lhF = '3';
    s.measures[0].tabs[0][1].notes[0].rhFing = 'i';
    s.measures[0].tabs[0][2].pk = 'd';
    s.measures[0].tabs[0][3].pk = 'u';
    loadSong(s);
    const xml = exportMusicXML(song);
    const hasX = xml.includes('<fingering>3</fingering>') && xml.includes('<pluck>i</pluck>')
      && xml.includes('<down-bow/>') && xml.includes('<up-bow/>');
    const r2 = importMusicXML(xml);
    const tt = r2.song.measures[0].tabs[0];
    return { hasX, lhF: tt[0].notes[0].lhF, rh: tt[1].notes[0].rhFing, pkD: tt[2].pk, pkU: tt[3].pk, err: r2.error || '' };
  });
  T(r.hasX && r.lhF === '3' && r.rh === 'i' && r.pkD === 'd' && r.pkU === 'u' && !r.err, 'T6 MusicXML 指法/拨片往返', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
