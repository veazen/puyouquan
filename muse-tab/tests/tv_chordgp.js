/* v61.2 和弦功能 GP 级强化（产品指示：参考 Guitar Pro 逻辑、弹窗可拖动、自家风格 UI）回归：
   T1 后缀解析引擎 chordIvOf：组合后缀（7b9/maj7#11/9#5/括号写法）正确出音程集、
      未知残渣 known=false（旧「兜底大三」口径不破）；chordTones 播放侧同源受益
   T2 chordShape 对组合后缀经 algoShape 推导出图（此前 null 无图）；音集正确
   T3 构建器变化音四行：点 ♭9 → 名称 C(b9)（空性质括号防歧义）+ 构成音行更新；再点取消
   T4 构成音省略（GP 逻辑）：省略五音 → chip 划掉、「推导」把位卡不含五音 pc；至少留两音守卫
   T5 构成音按度数拼写（出版惯例）：Ddim7 → D F A♭ C♭（♭9 不拼成 ♯8 系）
   T6 弹窗拖动 + 应用回路：标题拖动位移生效；应用后 col.chord=完整名称、重开弹窗变化音拆回点亮态
   对 v61.1 旧文件跑：chordIvOf 不存在 → 全红（突变实证）。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1500, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 解析引擎
  let r = await pg.evaluate(() => { try {
    const a = chordIvOf('7b9'), b2 = chordIvOf('maj7#11'), c = chordIvOf('9#5'),
          d = chordIvOf('(b9)'), e = chordIvOf('xyz'), f = chordIvOf('m7b5');
    const ct = chordTones('C7b9'), ctBad = chordTones('Cxyz');
    return { a9: a.iv[9], aK: a.known, b11: b2.iv[11], c5: c.iv[5], d9: d.iv[9], dK: d.known,
      eK: e.known, f5: f.iv[5], ct9: ct.iv[9], bad3: ctBad.iv[3] };
  } catch (e2) { return { err: String(e2 && e2.message || e2) }; } });
  T(r.a9 === 13 && r.aK && r.b11 === 18 && r.c5 === 8 && r.d9 === 13 && r.dK && !r.eK
    && r.f5 === 6 && r.ct9 === 13 && r.bad3 === 4, 'T1 后缀解析引擎', JSON.stringify(r));

  // T2 组合后缀出图 + 音集正确
  r = await pg.evaluate(() => { try {
    window.guardReplace = p => p();
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 0, lyr: 0 });
    loadSong(s); hideStartPad();
    const sh = chordShape('C7b9');
    if (!sh) return { sh: null };
    const want = new Set([0, 4, 7, 10, 1].map(v => v % 12));   // C E G Bb Db
    const pcs = [...sh].map((ch, i) => ch === 'x' ? null : (tuningOf()[strN() - 1 - i] + parseInt(ch, 36)) % 12).filter(v => v != null);
    return { sh, inSet: pcs.every(p => want.has(p)), hasRoot: pcs.includes(0) };
  } catch (e2) { return { err: String(e2 && e2.message || e2) }; } });
  T(!!r.sh && r.inSet && r.hasRoot, 'T2 组合后缀 algoShape 推导出图', JSON.stringify(r));

  // T3 变化音四行 + 括号防歧义命名
  r = await pg.evaluate(() => { try {
    showChordEditor(0, 0, 0);
    ceState.root = 'C'; ceState.qual = ''; ceState.alt = { 5: '', 9: '', 11: '', 13: '' };
    ceState.custom = null; ceState.cname = null; closeModal(); renderChordEditor();
    const rows = document.querySelectorAll('.ce-alt-row').length;
    document.querySelector('[data-calt="9:b"]').click();
    const name1 = document.getElementById('ce-title').textContent;
    const on1 = document.querySelector('[data-calt="9:b"]').classList.contains('on');
    document.querySelector('[data-calt="9:b"]').click();   // 再点取消
    const name2 = document.getElementById('ce-title').textContent;
    return { rows, name1, on1, name2 };
  } catch (e2) { return { err: String(e2 && e2.message || e2) }; } });
  T(r.rows === 4 && r.name1 === 'C(b9)' && r.on1 && r.name2 === 'C', 'T3 变化音行+括号命名', JSON.stringify(r));

  // T4 省略内音 → 推导卡不含五音；两音守卫
  r = await pg.evaluate(() => { try {
    document.querySelector('[data-comit="5"]').click();
    const off = document.querySelector('[data-comit="5"]').classList.contains('off');
    const card = [...document.querySelectorAll('#ce-pos .pat-card')].find(x => x.querySelector('.bt').textContent.includes('推导'));
    let noG = null;
    if (card) { const pcs = [...card.dataset.shape].map((ch, i) => ch === 'x' ? null : (tuningOf()[strN() - 1 - i] + parseInt(ch, 36)) % 12).filter(v => v != null);
      noG = !pcs.includes(7); }
    document.querySelector('[data-comit="3"]').click();    // 只剩根音+三音时再省略应被拦
    const t0 = document.getElementById('toast').textContent = '';
    document.querySelector('[data-comit="1"]').click();
    const guarded = (document.getElementById('toast').textContent || '').includes('至少');
    return { off, hasCard: !!card, noG, guarded };
  } catch (e2) { return { err: String(e2 && e2.message || e2) }; } });
  T(r.off && r.hasCard && r.noG && r.guarded, 'T4 省略内音+推导卡+两音守卫', JSON.stringify(r));

  // T5 度数拼写：Ddim7 → D F A♭ C♭
  r = await pg.evaluate(() => { try {
    ceState.root = 'D'; ceState.qual = 'dim7'; ceState.alt = { 5: '', 9: '', 11: '', 13: '' };
    ceState.omit = {}; ceState.custom = null; ceState.cname = null; closeModal(); renderChordEditor();
    return { line: document.querySelector('.ce-toneline').textContent };
  } catch (e2) { return { err: String(e2 && e2.message || e2) }; } });
  T(r.line === 'D · F · A♭ · C♭', 'T5 构成音度数拼写（GP 同款）', JSON.stringify(r));

  // T6 拖动 + 应用回路 + 变化音拆回
  r = await pg.evaluate(() => { try {
    ceState.root = 'C'; ceState.qual = '7'; ceState.alt = { 5: '', 9: 'b', 11: '', 13: '' };
    ceState.omit = {}; ceState.custom = null; ceState.cname = null; closeModal(); renderChordEditor();
    const modal = document.querySelector('.modal'), h3 = modal.querySelector('h3');
    h3.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 5, clientX: 400, clientY: 30 }));
    h3.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 5, clientX: 560, clientY: 90 }));
    h3.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 5 }));
    const moved = parseFloat(modal.style.marginLeft) > 0;
    document.getElementById('ce-ok').click();
    const applied = song.measures[0].tabs[0][0].chord;
    showChordEditor(0, 0, 0);                                 // 重开：7b9 拆回 qual=7 + ♭9 点亮
    const reQual = ceState.qual, reAlt = (ceState.alt || {})[9];
    const reOn = document.querySelector('[data-calt="9:b"]').classList.contains('on');
    document.getElementById('ce-cancel').click();
    return { moved, applied, reQual, reAlt, reOn };
  } catch (e2) { return { err: String(e2 && e2.message || e2) }; } });
  T(r.moved && r.applied === 'C7b9' && r.reQual === '7' && r.reAlt === 'b' && r.reOn,
    'T6 拖动+应用+变化音拆回', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
