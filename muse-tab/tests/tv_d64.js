/* v52.4 64分音符最小时值回归：
   - beatsOf 64分=1/16拍；附点档位整体下移（16分可双附点、32分可单附点、64分不可）
   - 拆分 32分→2×64分；64分不可再拆
   - 渲染：TAB 四层符杠 / 简谱四条减时线 / 五线谱 64分符尾与休止合成字形，无 NaN
   - MusicXML：divisions=96、type 64th 出/入往返（含附点32分）
   - 键盘 Y/U = 32/64分 */
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

  // T1 时值算术 + 附点档位 + 合成字形注册
  let r = await pg.evaluate(() => {
    return { b64: beatsOf({ dur: 64, dotted: false }, 4), dots: [maxDotLevel(16), maxDotLevel(32), maxDotLevel(64)],
      f64: !!SMUFL.flag64thUp && !!SMUFL.flag64thDown, r64: !!SMUFL.rest64th,
      svg: smg('rest64th', 0, 0, 7.5).indexOf('<path') === 0,
      bbOk: SMUFL.rest64th && SMUFL.rest64th.bb[1] < -2.5 && !SMUFL.rest64th.d.includes('NaN') };
  });
  T(Math.abs(r.b64 - 0.0625) < 1e-9 && JSON.stringify(r.dots) === '[2,1,0]' && r.f64 && r.r64 && r.svg && r.bbOk,
    'T1 时值算术+附点档位+字形合成', JSON.stringify(r));

  // T2 拆分链：16→2×32→2×64→不可再拆；64分附点被拒
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 'd64', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s.measures[0].tabs[0] = [{ dur: 16, dotted: false, chord: '', notes: [{ s: 2, f: 5 }], strum: '', tech: '' },
      { dur: 4, dotted: false, chord: '', notes: [], strum: '', tech: '' }];
    loadSong(s); sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 2 }; selRange = null;
    splitNote();   // 16 → 2×32
    const d1 = song.measures[0].tabs[0][0].dur;
    splitNote();   // 32 → 2×64
    const d2 = song.measures[0].tabs[0][0].dur;
    splitNote();   // 64 拒绝
    const d3 = song.measures[0].tabs[0][0].dur;
    const guard = document.getElementById('toast').textContent.indexOf('64分音符不能再拆分') >= 0;
    toggleDot();   // 64分附点被拒
    const noDot = !song.measures[0].tabs[0][0].dotted;
    const dotGuard = document.getElementById('toast').textContent.indexOf('128') >= 0;
    return { d1, d2, d3, guard, noDot, dotGuard };
  });
  T(r.d1 === 32 && r.d2 === 64 && r.d3 === 64 && r.guard && r.noDot && r.dotGuard, 'T2 拆分链+附点守卫', JSON.stringify(r));

  // T3 TAB 四层符杠（几何）：一组 4×64分 → 主梁+16+32+64 = 4 条杠 rect（height 2.2）
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 'd64b', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    const mk = (d) => ({ dur: d, dotted: false, chord: '', notes: [{ s: 2, f: 5 }], strum: '', tech: '' });
    s.measures[0].tabs[0] = [mk(64), mk(64), mk(64), mk(64), mk(4), mk(4), mk(4)];
    loadSong(s); blurSel = true; render();
    const beams = (document.getElementById('score').innerHTML.match(/height="2\.2"/g) || []).length;
    const nan = document.getElementById('score').innerHTML.includes('NaN');
    return { beams, nan };
  });
  T(r.beams === 4 && !r.nan, 'T3 TAB四层符杠', JSON.stringify(r));

  // T4 简谱四条减时线（相对断言：64分组比 32分组多 1 条 1.1 宽横线）
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const V = (dur) => ({ dur, dotted: false, deg: 1, acc: '', oct: 0, lyrics: [], tie: false });
    const mkSong = (dur) => { const s = createSong('vocal', { title: 'x', beats: 4, unit: 4, key: 'C', nMea: 1, nVox: 1, lyr: 0 });
      s.measures[0].voxes[0] = [V(dur), V(dur), V(dur), V(dur), V(4), V(4), V(4)]; return s; };
    const count = () => (document.getElementById('score').innerHTML.match(/stroke-width="1\.1"/g) || []).length;
    loadSong(mkSong(32)); blurSel = true; render(); const c32 = count();
    if (typeof undoStack !== 'undefined') undoStack.length = 0;
    loadSong(mkSong(64)); blurSel = true; render(); const c64 = count();
    const nan = document.getElementById('score').innerHTML.includes('NaN');
    return { c32, c64, delta: c64 - c32, nan };
  });
  T(r.delta === 1 && !r.nan, 'T4 简谱第四条减时线', JSON.stringify(r));

  // T5 五线谱孤立 64分符尾 + 64分休止渲染无 NaN
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const V = (deg, dur) => ({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false });
    const s = createSong('vocal', { title: 'x', beats: 4, unit: 4, key: 'C', nMea: 1, nVox: 1, lyr: 0 });
    s.measures[0].voxes[0] = [V(3, 64), V(0, 64), V(3, 32), V(5, 8), V(1, 4), V(1, 2)];
    loadSong(s); setVoxNotation('staff'); blurSel = true; render();
    const h = document.getElementById('score').innerHTML;
    return { nan: h.includes('NaN'), undef: h.includes('undefined') };
  });
  T(!r.nan && !r.undef, 'T5 五线谱64分渲染', JSON.stringify(r));

  // T6 MusicXML 往返：64分 + 附点32分 → divisions=96 / type 64th → 导回保真
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const V = (deg, dur, dot) => ({ dur, dotted: !!dot, deg, acc: '', oct: 0, lyrics: [], tie: false });
    const s = createSong('vocal', { title: 'x', beats: 4, unit: 4, key: 'C', nMea: 1, nVox: 1, lyr: 0 });
    s.measures[0].voxes[0] = [V(1, 64), V(2, 64), V(3, 32, true), V(5, 16), V(6, 8), V(1, 4), V(2, 4), V(3, 2)];
    loadSong(s);
    const xml = exportMusicXML(song);
    const div96 = xml.indexOf('<divisions>96</divisions>') >= 0;
    const t64 = xml.indexOf('<type>64th</type>') >= 0;
    const r2 = importMusicXML(xml);
    const c = r2.song.measures[0].voxes[0];
    return { div96, t64, back: [c[0].dur, c[1].dur, c[2].dur, !!c[2].dotted], err: r2.error || '' };
  });
  T(r.div96 && r.t64 && JSON.stringify(r.back) === '[64,64,32,true]' && !r.err, 'T6 MusicXML 64分往返', JSON.stringify(r));

  // T7 键盘 Y/U 换时值
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 'd64k', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s.measures[0].tabs[0][0].notes = [{ s: 2, f: 5 }];
    loadSong(s); blurSel = false; sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 2 }; render();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y' }));
    const d32 = song.measures[0].tabs[0][0].dur;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'u' }));
    const d64 = song.measures[0].tabs[0][0].dur;
    return { d32, d64 };
  });
  T(r.d32 === 32 && r.d64 === 64, 'T7 键盘Y/U=32/64分', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
