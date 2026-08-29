/* v53.3 简谱和音（col.adds）编辑功能与显示样式回归：
   - 显示：数字 12→14.5 放大、纵列动态间距、每音自带高/低八度点（此前缺失）、
     变音记号放大左置、data-vadds 点击热区、和弦框避让和音纵列（jpAddsH）
   - 编辑：showAddsMenu 弹窗（唱名/八度±/变音/加删音/清空）；b-addnote 钮改开弹窗；
     谱面点和音纵列同入口；五线谱 Ctrl+点击线/间既有路径不动
   - 回归：adds 变音 ×/♭♭ 符号仍渲染（tv_dblacc 口径） */
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

  // T1 显示样式：15 号和音数字（v60.75 随简谱数字 17 重算） ×2、八度点（高+低各一枚）、♯ 左置、热区存在、无 NaN
  let r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
    const s = createSong('vocal', { title: 'a', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 0, nVox: 1, lyr: 0 });
    s.measures[0].voxes[0] = [V(1, 4, { adds: [{ deg: 3, acc: '#', oct: -1 }, { deg: 5, acc: '', oct: 1 }] }), V(2, 4), V(3, 4), V(5, 4)];
    loadSong(s); blurSel = true; render();
    const digits = [...document.querySelectorAll('#score text[font-size="15"][font-family="var(--font-ui)"]')];
    const dots = [...document.querySelectorAll('#score circle[r="1.4"]')];
    const zone = document.querySelector('[data-vadds="0:0:0"]');
    const h = document.getElementById('score').innerHTML;
    // 几何：和音数字 y 全部高于主音基线（更小的 y）；低八度点 y 介于两数字之间
    const dy = digits.map(t => +t.getAttribute('y'));
    const mainY = +[...document.querySelectorAll('#score text[font-size="17"][font-family="var(--font-ui)"]')][0].getAttribute('y');
    return { n145: digits.length, dots: dots.length, zone: !!zone,
      above: dy.every(y => y < mainY - 10), asc: dy.length === 2 && dy[1] < dy[0],
      sharp: h.indexOf('>♯</text>') >= 0, nan: h.includes('NaN') };
  });
  T(r.n145 === 2 && r.dots === 2 && r.zone && r.above && r.asc && r.sharp && !r.nan,
    'T1 和音显示：放大数字+八度点+♯+热区', JSON.stringify(r));

  // T2 和弦框避让：同列加 3 个和音后，和弦标注框上移 ≈3×13.5px（双渲染差值）
  r = await pg.evaluate(() => {
    const build = (withAdds) => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
      const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
      const s = createSong('vocal', { title: 'c', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 0, nVox: 1, lyr: 0 });
      s.measures[0].voxes[0] = [V(1, 4, { chord: 'C' }), V(2, 4), V(3, 4), V(5, 4)];
      if (withAdds) s.measures[0].voxes[0][0].adds = [{ deg: 3, acc: '', oct: 0 }, { deg: 5, acc: '', oct: 0 }, { deg: 1, acc: '', oct: 1 }];
      loadSong(s); blurSel = true; render();
      const t = [...document.querySelectorAll('#score text[font-size="14"]')].find(x => x.getAttribute('font-weight') === '600');
      return +t.getAttribute('y');
    };
    const y0 = build(false), y1 = build(true);
    return { y0, y1, delta: +(y0 - y1).toFixed(1), expect: +jpAddsH({ adds: [{ deg: 3 }, { deg: 5 }, { deg: 1, oct: 1 }] }).toFixed(1) };
  });
  T(Math.abs(r.delta - r.expect) < 0.6 && r.delta > 38, 'T2 和弦框避让和音纵列', JSON.stringify(r));

  // T3 编辑弹窗：改唱名/八度+/变音/加音（上方三度）/删音/清空
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
    const s = createSong('vocal', { title: 'e', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 0, nVox: 1, lyr: 0 });
    s.measures[0].voxes[0] = [V(1, 4, { adds: [{ deg: 3, acc: '', oct: 0 }] }), V(2, 4), V(3, 4), V(5, 4)];
    loadSong(s);
    showAddsMenu(0, 0, 0, 120, 120);
    const q = (sel2) => document.querySelector('#popmenu ' + sel2);
    q('[data-ad="0:4"]').click();                          // 唱名 3→4
    const deg4 = song.measures[0].voxes[0][0].adds[0].deg;
    q('[data-ap="0"]').click();                            // 八度 +1
    const oct1 = song.measures[0].voxes[0][0].adds[0].oct;
    q('[data-aa="0:b"]').click();                          // 变音 ♭
    const accB = song.measures[0].voxes[0][0].adds[0].acc;
    q('[data-aab]').click();                               // 加音：4(oct1) 上方三度 → 6(oct1)
    const a1 = song.measures[0].voxes[0][0].adds[1];
    q('[data-ar="0"]').click();                            // 删第1音 → 剩 6
    const left = song.measures[0].voxes[0][0].adds.map(a => a.deg).join('');
    q('[data-ax]').click();                                // 清空
    const gone = !song.measures[0].voxes[0][0].adds;
    return { deg4, oct1, accB, add2: a1 && (a1.deg + ':' + a1.oct), left, gone };
  });
  T(r.deg4 === 4 && r.oct1 === 1 && r.accB === 'b' && r.add2 === '6:1' && r.left === '6' && r.gone,
    'T3 弹窗编辑唱名/八度/变音/加删/清空', JSON.stringify(r));

  // T4 入口：b-addnote 钮开弹窗（不再是 askText 输入框）；谱面点和音纵列开弹窗
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
    const s = createSong('vocal', { title: 'k', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 0, nVox: 1, lyr: 0 });
    s.measures[0].voxes[0] = [V(1, 4, { adds: [{ deg: 3, acc: '', oct: 0 }] }), V(2, 4), V(3, 4), V(5, 4)];
    loadSong(s);
    sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 3 }; noteSel = []; selRange = null; render();
    document.getElementById('b-addnote').click();
    const btnPopup = !!document.getElementById('popmenu') && !document.getElementById('ask-in');
    closePop();
    const z = document.querySelector('[data-vadds="0:0:0"]');
    z.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 300, clientY: 300 }));
    const zonePopup = !!document.getElementById('popmenu') && (document.getElementById('popmenu').textContent || '').includes('和音');
    closePop();
    return { btnPopup, zonePopup };
  });
  T(r.btnPopup && r.zonePopup, 'T4 按钮/谱面热区双入口开弹窗', JSON.stringify(r));

  // T5 回归：adds 变音 ×/♭♭ 仍渲染（tv_dblacc 口径）+ 五线谱 Ctrl 加和音数据路径不受影响
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
    const s = createSong('vocal', { title: 'r', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 0, nVox: 1, lyr: 0 });
    s.measures[0].voxes[0] = [V(4, 4, { acc: 'b', adds: [{ deg: 6, acc: 'x', oct: 0 }, { deg: 7, acc: 'bb', oct: 0 }] }), V(2, 4), V(3, 4), V(5, 4)];
    loadSong(s); blurSel = true; render();
    const h = document.getElementById('score').innerHTML;
    return { hasX: h.indexOf('>×</text>') >= 0, hasBB: h.indexOf('>♭♭</text>') >= 0, nan: h.includes('NaN') };
  });
  T(r.hasX && r.hasBB && !r.nan, 'T5 adds 重升/重降符号回归', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
