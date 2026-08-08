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
    song.measures[1].wf = 0.1;   // 超下限 → 按 0.3 生效（v52.2 范围放宽 0.3–3）
    const w03 = measureLayout(song.measures[1]).w;
    delete song.measures[1].wf;
    const wBack = measureLayout(song.measures[1]).w;
    return { ratio2: w2 / w1, ratio03: w03 / w1, back: Math.abs(wBack - w1) < 0.01 };
  });
  T(r.ratio2 > 1.5 && r.ratio03 < 0.6 && r.ratio03 > 0.28 && r.back, 'T1 wf布局缩放+钳制', JSON.stringify(r));

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
  T(r.wf > 1.05 && r.wf <= 3 && r.undone, 'T3 拖宽+一步撤销', JSON.stringify(r));

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

  // T6 v52.0 断行标志机制（相对断言，不依赖自然断行位置）：brk=小节后强制换行；pull=并入上一行且覆盖 brk
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 'b', beats: 4, unit: 4, key: 'C', nMea: 4, nTab: 1, nVox: 0, lyr: 0 });
    const mk4 = (f) => ({ dur: 4, dotted: false, chord: '', notes: [{ s: 2, f }], strum: '', tech: '' });
    s.measures.forEach(m => { m.tabs[0] = [mk4(3), mk4(5), mk4(7), mk4(5)]; });
    loadSong(s); blurSel = true;
    const row0 = sy => sy[0].measures.map(l => l.mi).join(',');
    song.measures[0].brk = 1;
    const afterBrk = row0(layoutSystems());        // 首小节后强制换行 → 首行只有 0
    song.measures[1].pull = 1;
    const afterPull = row0(layoutSystems());       // pull 覆盖 brk → 1 并回首行
    delete song.measures[0].brk; delete song.measures[1].pull; render();
    return { afterBrk, afterPull };
  });
  T(r.afterBrk === '0' && r.afterPull.indexOf('0,1') === 0, 'T6 brk/pull断行机制', JSON.stringify(r));

  // T7 行尾三按钮随宽度手柄显示：每行 ○/+/− 各一（末行 + 置灰=data-sysact 空）
  r = await pg.evaluate(() => {
    render();   // meaHandleOn 已在 T2 留在开启态
    const gs = [...document.querySelectorAll('#score .sysbtn')];
    const acts = gs.map(g => (g.dataset.sysact || '').split(':')[0] || 'off');
    const nSys = layoutSystems().length;
    return { n: gs.length, nSys, hasReset: acts.includes('reset'), hasPush: acts.includes('push'), lastPullOff: acts.includes('off') };
  });
  T(r.n === r.nSys * 3 && r.hasReset && r.hasPush && r.lastPullOff, 'T7 行尾三按钮渲染', JSON.stringify(r));

  // T8 按钮操作（3 稀疏小节自然 1 行）：−（push）拆行 → +（pull）拉回 → ○（reset）清全部布局标志
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 'b3', beats: 4, unit: 4, key: 'C', nMea: 3, nTab: 1, nVox: 0, lyr: 0 });
    const mk4 = (f) => ({ dur: 4, dotted: false, chord: '', notes: [{ s: 2, f }], strum: '', tech: '' });
    s.measures.forEach(m => { m.tabs[0] = [mk4(3), mk4(5), mk4(7), mk4(5)]; });
    loadSong(s); blurSel = true; render();
    const clickBtn = (prefix) => {
      const el = [...document.querySelectorAll('#score .sysbtn')].find(g => (g.dataset.sysact || '').indexOf(prefix) === 0);
      if (!el) return false;
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerType: 'mouse', button: 0 }));
      return true;
    };
    const nat1 = layoutSystems().length === 1;
    const okPush = clickBtn('push:0:2');
    const rowsA = layoutSystems().map(sy => sy.measures.map(l => l.mi).join(','));
    const brkSet = song.measures[1].brk === 1;
    const okPull = clickBtn('pull:0:1');
    const rowsB = layoutSystems().length;
    const pullSet = song.measures[2].pull === 1 && !song.measures[1].brk;
    song.measures[1].wf = 1.4; render();
    const okReset = clickBtn('reset:0:2');
    const clean = song.measures.every(m => !m.brk && !m.pull && !m.wf);
    return { nat1, okPush, rowsA, brkSet, okPull, rowsB, pullSet, okReset, clean };
  });
  T(r.nat1 && r.okPush && JSON.stringify(r.rowsA) === '["0,1","2"]' && r.brkSet
    && r.okPull && r.rowsB === 1 && r.pullSet && r.okReset && r.clean,
    'T8 行尾按钮 −/+/○ 操作', JSON.stringify(r));

  // T9 v52.2 连续增减后剩余小节自由重排：被移动小节的旧 brk 一并清除，不残留钉死后续行
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 'b4', beats: 4, unit: 4, key: 'C', nMea: 4, nTab: 1, nVox: 0, lyr: 0 });
    const mk4 = (f) => ({ dur: 4, dotted: false, chord: '', notes: [{ s: 2, f }], strum: '', tech: '' });
    s.measures.forEach(m => { m.tabs[0] = [mk4(3), mk4(5), mk4(7), mk4(5)]; });
    loadSong(s); blurSel = true; render();
    const clickBtn = (prefix) => {
      const el = [...document.querySelectorAll('#score .sysbtn')].find(g => (g.dataset.sysact || '').indexOf(prefix) === 0);
      if (!el) return false;
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerType: 'mouse', button: 0 }));
      return true;
    };
    const rows = () => layoutSystems().map(sy => sy.measures.map(l => l.mi).join(','));
    const r0 = rows();                                   // 自然 [0,1,2],[3]
    const a1 = clickBtn('push:0:2'); const r1 = rows();  // → [0,1],[2,3]
    const a2 = clickBtn('push:0:1'); const r2 = rows();  // → [0],[1,2,3]（m1 旧 brk 清除，剩余合并重排）
    const staleClean = !song.measures[1].brk;
    const a3 = clickBtn('pull:0:0'); const r3 = rows();  // + 拉回 → [0,1,...]（nm 旧 brk 一并清）
    return { r0, a1, r1, a2, r2, staleClean, a3, first3: r3[0] };
  });
  T(JSON.stringify(r.r0) === '["0,1,2","3"]' && r.a1 && JSON.stringify(r.r1) === '["0,1","2,3"]'
    && r.a2 && JSON.stringify(r.r2) === '["0","1,2,3"]' && r.staleClean
    && r.a3 && r.first3.indexOf('0,1') === 0, 'T9 剩余小节自由重排', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
