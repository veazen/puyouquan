/* v59.1 左栏记号面板改造回归：
   T1 扫弦按钮单箭头（data-sic 双重注入修复）
   T2 滑音弹窗（5 项）选择落 tech 字段
   T3 泛音弹窗（4 项）选择落 hmT 字段
   T4 记谱法点亮：吉他声部 五线谱/简谱 联排开关（tabStaff/tabJp）+ 点亮态同步
   T5 TAB+简谱联排行渲染：data-tabjp 组存在 + 首调翻译数字正确（几何/内容断言）
   T6 旋律声部点亮：简谱↔五线谱叠亮 = staff+dual 映射
   T7 无 NaN/undefined（tabStaff+tabJp 双开） */
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

  // T1 扫弦按钮：无 .sicon 重复注入，图标区恰一个箭头字形
  let r = await pg.evaluate(() => {
    const d = document.getElementById('b-strum-d'), u = document.getElementById('b-strum-u');
    return { sic: !!(d.querySelector('.sicon') || u.querySelector('.sicon')),
      dArrow: (d.querySelector('.g') || {}).textContent || '', uArrow: (u.querySelector('.g') || {}).textContent || '' };
  });
  T(!r.sic && r.dArrow === '↑' && r.uArrow === '↓', 'T1 扫弦单箭头', JSON.stringify(r));

  // T2 滑音弹窗：5 项；选「无头上滑」落 tech='su'
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 'lp', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    const mk8 = (f, st) => ({ dur: 8, dotted: false, chord: '', notes: [{ s: st, f }], strum: '', tech: '' });
    s.measures[0].tabs[0] = [mk8(5, 3), mk8(7, 3), mk8(5, 2), mk8(7, 2), mk8(5, 1), mk8(7, 1), mk8(5, 2), mk8(3, 2)];
    loadSong(s); blurSel = false;
    sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 3 }; noteSel = []; render();
    showSlideMenu(200, 200);
    const n5 = document.querySelectorAll('#popmenu [data-pki]').length;
    document.querySelector('#popmenu [data-pki="1"]').click();   // 无头上滑
    const tech = song.measures[0].tabs[0][0].notes[0].tech;
    return { n5, tech, panelHasMenu: !!document.querySelector('#tech-host [data-slidemenu]') || !!document.querySelector('#sign-host-tab [data-slidemenu]') };
  });
  T(r.n5 === 5 && r.tech === 'su' && r.panelHasMenu, 'T2 滑音弹窗', JSON.stringify(r));

  // T3 泛音弹窗：4 项；选 A.H 落 hmT='A'
  r = await pg.evaluate(() => {
    sel = { mi: 0, row: 'tab', vi: 0, ci: 1, si: 3 }; noteSel = [{ mi: 0, ci: 1, si: 3, vi: 0, row: 'tab' }]; render();
    showHarmMenu(200, 200);
    const n4 = document.querySelectorAll('#popmenu [data-pki]').length;
    document.querySelector('#popmenu [data-pki="1"]').click();   // 人工泛音 A.H
    const n = song.measures[0].tabs[0][1].notes[0];
    noteSel = [];
    return { n4, hmT: n.hmT, tech: n.tech };
  });
  T(r.n4 === 4 && r.hmT === 'A' && r.tech === 'hm', 'T3 泛音弹窗', JSON.stringify(r));

  // T4 记谱法点亮（吉他声部）：五线谱/简谱开关 + 点亮态
  r = await pg.evaluate(() => {
    setRibbon('tab');
    document.getElementById('nl-tabst').click();
    const st1 = !!song.tabStaff, lit1 = document.getElementById('nl-tabst').classList.contains('on');
    document.getElementById('nl-tabjp').click();
    const jp1 = !!song.tabJp, lit2 = document.getElementById('nl-tabjp').classList.contains('on');
    const lit6 = document.getElementById('nl-tab6').classList.contains('on');
    return { st1, lit1, jp1, lit2, lit6 };
  });
  T(r.st1 && r.lit1 && r.jp1 && r.lit2 && r.lit6, 'T4 吉他声部点亮开关', JSON.stringify(r));

  // T5 TAB+简谱联排行：data-tabjp 组 + 首调翻译（C 调，1弦空弦 E4 → 3、5弦3品 C3 → 低八度 1）
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 'jp', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    const mk4 = (f, st) => ({ dur: 4, dotted: false, chord: '', notes: [{ s: st, f }], strum: '', tech: '' });
    s.measures[0].tabs[0] = [mk4(0, 1), mk4(3, 5), mk4(1, 2), mk4(3, 2)];   // E4→3 / C3→1(低8) / C4→1 / D4→2
    s.tabJp = true;
    loadSong(s); blurSel = false;
    const h = document.getElementById('score').innerHTML;
    const gi = h.indexOf('data-tabjp="0"');
    const seg = gi >= 0 ? h.slice(gi, h.indexOf('</g>', gi)) : '';
    const digits = (seg.match(/>(\d)<\/text>/g) || []).map(x => x.replace(/\D/g, ''));
    return { hasGroup: gi >= 0, digits: digits.join(''), hasDot: seg.includes('<circle'), nan: h.includes('NaN') };
  });
  T(r.hasGroup && r.digits === '3112' && r.hasDot && !r.nan, 'T5 简谱联排行翻译', JSON.stringify(r));

  // T6 旋律声部点亮：简谱→点亮五线谱=staff+dual 双亮；再点简谱=退 dual
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('vocal', { title: 'v', beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 0, nVox: 1, lyr: 1 });
    loadSong(s); setRibbon('vox');
    sel = { mi: 0, row: 'vox', vi: 0, ci: 0 }; render();
    document.getElementById('nl-voxst').click();
    const st = (song.voxNotations || [])[0], dual = !!(song.voxDual || [])[0];
    const litJ = document.getElementById('nl-voxjp').classList.contains('on');
    const litS = document.getElementById('nl-voxst').classList.contains('on');
    document.getElementById('nl-voxjp').click();
    const dual2 = !!(song.voxDual || [])[0];
    return { st, dual, litJ, litS, dual2 };
  });
  T(r.st === 'staff' && r.dual && r.litJ && r.litS && !r.dual2, 'T6 旋律声部叠亮映射', JSON.stringify(r));

  // T7 双联排（五线谱+简谱行+TAB）无 NaN/undefined
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 'dj', beats: 4, unit: 4, key: 'G', nMea: 2, nTab: 1, nVox: 1, lyr: 1 });
    const mk8 = (f, st) => ({ dur: 8, dotted: false, chord: '', notes: [{ s: st, f }], strum: '', tech: '' });
    s.measures[0].tabs[0] = [mk8(0, 6), mk8(2, 5), mk8(3, 5), mk8(0, 4), mk8(2, 4), mk8(0, 3), mk8(0, 2), mk8(1, 2)];
    s.tabStaff = true; s.tabJp = true;
    loadSong(s);
    const h = document.getElementById('score').innerHTML;
    return { nan: h.includes('NaN'), undef: h.includes('undefined'), hasJp: h.includes('data-tabjp'), hasStaff: h.includes('data-clefhead="tab"') };
  });
  T(!r.nan && !r.undef && r.hasJp && r.hasStaff, 'T7 双联排无NaN', JSON.stringify(r));

  // T8 v59.7 哑音不再哑失败：吉他谱有音符→打×并记住原品位；再点还原；光标在简谱行→给指引 toast 不静默
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 'mute', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 1, lyr: 1 });
    const mk = (f, st) => ({ dur: 8, dotted: false, chord: '', notes: [{ s: st, f }], strum: '', tech: '' });
    s.measures[0].tabs[0] = [mk(3, 5), mk(2, 4), mk(0, 3), mk(1, 2), mk(0, 1), mk(3, 5), mk(2, 4), mk(0, 3)];
    loadSong(s); setRibbon('tab'); blurSel = false;
    const btn = document.querySelector('[data-tech2="mute"]');
    sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 5 }; noteSel = []; selRange = null; render();
    btn.click();
    const n1 = song.measures[0].tabs[0][0].notes[0];
    const on = { x: !!n1.x, xf: n1.xf, f: n1.f };
    btn.click();   // 再点还原原品位
    const n2 = song.measures[0].tabs[0][0].notes[0];
    const off = { x: !!n2.x, f: n2.f, noXf: n2.xf == null };
    // 光标在简谱行：不改数据，但必须有指引提示（此前静默）
    sel = { mi: 0, row: 'vox', vi: 0, ci: 0 }; render();
    const before = JSON.stringify(song.measures[0]);
    const tEl = document.getElementById('toast'); if (tEl) tEl.textContent = '';
    btn.click();
    return { on, off, voxUnchanged: JSON.stringify(song.measures[0]) === before,
      voxHint: ((document.getElementById('toast') || {}).textContent || '').includes('吉他谱声部') };
  });
  T(r.on.x && r.on.xf === 3 && r.on.f === 0 && !r.off.x && r.off.f === 3 && r.off.noXf
    && r.voxUnchanged && r.voxHint, 'T8 哑音×往返+非吉他谱指引', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
