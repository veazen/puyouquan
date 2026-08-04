/* v51.8 小节宽度手柄（GP 式）回归：
   - mea.wf 宽度系数进布局：measureLayout 宽度随 wf 缩放（0.6–2.5 钳制）
   - 「宽度手柄」开关：默认隐藏；开启后每小节一个 data-meahandle 手柄
   - 拖动手柄 → wf 变化（一次 mutate 可撤销）；双击手柄 → 复位删除 wf
   - wf 随曲谱 JSON 序列化往返 */
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

  await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 'w', beats: 4, unit: 4, key: 'C', nMea: 3, nTab: 1, nVox: 0, lyr: 0 });
    const mk8 = (f) => ({ dur: 8, dotted: false, chord: '', notes: [{ s: 2, f }], strum: '', tech: '' });
    s.measures.forEach(m => { m.tabs[0] = [mk8(3), mk8(5), mk8(7), mk8(5), mk8(3), mk8(5), mk8(7), mk8(5)]; });
    loadSong(s); blurSel = true; render(); });

  // T1 布局缩放：与自身基线比（首小节含拍号预留 tsLead，不能拿别的小节当基线）——
  //   wf=2 显著加宽、wf=0.3 钳到 0.6 下限、删除 wf 精确回基线
  let r = await pg.evaluate(() => {
    const w1 = measureLayout(song.measures[1]).w;   // 非首小节：无 tsLead 的干净基线
    song.measures[1].wf = 2;
    const w2 = measureLayout(song.measures[1]).w;
    song.measures[1].wf = 0.3;   // 超下限 → 按 0.6 生效
    const w06 = measureLayout(song.measures[1]).w;
    delete song.measures[1].wf;
    const wBack = measureLayout(song.measures[1]).w;
    return { ratio2: w2 / w1, ratio06: w06 / w1, back: Math.abs(wBack - w1) < 0.01 };
  });
  T(r.ratio2 > 1.5 && r.ratio06 < 0.85 && r.ratio06 > 0.55 && r.back, 'T1 wf布局缩放+钳制', JSON.stringify(r));

  // T2 手柄开关：默认隐藏；开启后每小节一个手柄；再点隐藏
  r = await pg.evaluate(() => {
    const off0 = document.querySelectorAll('[data-meahandle]').length;
    document.getElementById('b-meahandle').click();
    const on1 = document.querySelectorAll('[data-meahandle]').length;
    const btnOn = document.getElementById('b-meahandle').classList.contains('on');
    document.getElementById('b-meahandle').click();
    const off2 = document.querySelectorAll('[data-meahandle]').length;
    document.getElementById('b-meahandle').click();   // 留在开启态供后续测试
    return { off0, on1, btnOn, off2, nMea: song.measures.length };
  });
  T(r.off0 === 0 && r.on1 === r.nMea && r.btnOn && r.off2 === 0, 'T2 手柄开关显隐', JSON.stringify(r));

  // T3 拖动调宽：手柄 pointerdown → 右移 60px → pointerup ⇒ wf>1 且一次 undo 撤回
  r = await pg.evaluate(() => {
    const mh = document.querySelector('[data-meahandle="1"]');
    const rb = mh.getBoundingClientRect();
    const sx = rb.left + rb.width / 2, sy = rb.top + rb.height / 2;
    mh.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerType: 'mouse', button: 0, clientX: sx, clientY: sy }));
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: sx + 60, clientY: sy }));
    document.dispatchEvent(new PointerEvent('pointerup', { clientX: sx + 60, clientY: sy }));
    const wf = song.measures[1].wf || 1;
    undo();
    const undone = !song.measures[1].wf;
    return { wf, undone };
  });
  T(r.wf > 1.05 && r.wf <= 2.5 && r.undone, 'T3 拖宽+一步撤销', JSON.stringify(r));

  // T4 双击复位：wf=1.5 → 手柄双击（detail 2）→ wf 清除
  r = await pg.evaluate(() => {
    song.measures[2].wf = 1.5; render();
    const mh = document.querySelector('[data-meahandle="2"]');
    mh.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerType: 'mouse', button: 0, detail: 2 }));
    return { cleared: !song.measures[2].wf, nan: document.getElementById('score').innerHTML.includes('NaN') };
  });
  T(r.cleared && !r.nan, 'T4 双击复位+无NaN', JSON.stringify(r));

  // T5 序列化往返：wf 随 song JSON 保存恢复
  r = await pg.evaluate(() => {
    song.measures[0].wf = 1.8;
    const copy = JSON.parse(JSON.stringify(song));
    const kept = copy.measures[0].wf === 1.8 && !copy.measures[1].wf;
    delete song.measures[0].wf; render();
    return { kept };
  });
  T(r.kept, 'T5 wf序列化往返', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
