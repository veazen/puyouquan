/* v60.92 四项修正（产品指示）：
   ① 自定义节奏型可选散拍：入库带 span（实际拍数），套用走库内散拍 pat.span 管线（从所选列起填入）
   ② 琶音长时值出版记法：两拍及以上琶音列后方画延音弧（弧长盖满时值跨度），一拍不画
   ③ 自定义音符琶音：弹窗逐弦写品位（lit 标记）→ 谱面画数字（波浪线左移让位）、
      发声按所写（chordImpliedNotes 不再按和弦补空弦）
   ④ 教材式和弦内手输数字以编辑为准：setFret 打 lit，lit 音在教材式下显示数字不折 × */
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

  // T1 散拍自定义节奏型：新建弹窗有散拍勾选（仅 TAB）→ 草稿 2 拍入库带 span=2
  let r = await pg.evaluate(() => {
    const s = createSong('tanchang', { title: 'p1', beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 0, lyr: 0 });
    loadSong(s);
    showPatEditor('tab', null);
    const hasFree = !!document.getElementById('pm-free');
    const hasOne = !![...document.querySelectorAll('#pm-beats option')].find(o => o.value === '1');
    closeModal();
    // 直接走散拍编辑管线：2 拍草稿（两个四分：低音 + 琶音）
    startPatEdit('tab', null, 2, 4, true);
    const barTxt = (document.getElementById('patedit-bar') || {}).textContent || '';
    const shape = chordShape('C');
    const mkN = () => shapeSounded(shape).map(n => ({ s: n.s, f: n.f }));
    const c1 = tcol(); c1.dur = 4; c1.notes = [{ s: 5, f: 3 }];
    const c2 = tcol(); c2.dur = 4; c2.notes = mkN(); c2.strum = 'arp';
    song.measures[0].tabs[0] = [c1, c2];
    window.askText = (t, d, cb) => cb('散拍测试');
    patEditSave();
    closeModal();
    const st = cpatLoad().tab, entry = st[st.length - 1];
    return { hasFree, hasOne, barFree: barTxt.includes('散拍 2 拍'), span: entry && entry.span,
      evN: entry && entry.ev.length, name: entry && entry.name };
  });
  T(r.hasFree && r.hasOne && r.barFree && r.span === 2 && r.evN === 2 && r.name === '散拍测试',
    'T1 散拍勾选+散拍草稿入库带 span', JSON.stringify(r));

  // T2 散拍套用：4/4 小节从所选列起只替换 2 拍，后两拍保留
  r = await pg.evaluate(() => {
    const st = cpatLoad().tab, entry = st[st.length - 1];
    const s = createSong('tanchang', { title: 'p2', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    loadSong(s);
    song.measures[0].tabs[0][0].chord = 'G';
    sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 3 }; noteSel = []; selRange = null; render();
    applyTabPattern(entry);
    const cols = song.measures[0].tabs[0];
    const beats = cols.reduce((a, c) => a + beatsOf(c, 4), 0);
    return { total: +beats.toFixed(2), n: cols.length, arp: cols[1] && cols[1].strum,
      restKept: cols.slice(2).every(c => !c.notes.length) };
  });
  T(r.total === 4 && r.arp === 'arp' && r.restKept, 'T2 散拍套用只占 2 拍、其余保留', JSON.stringify(r));

  // T3 琶音长时值延音弧：全音符琶音画弧（弧长≈列宽）、四分琶音不画
  r = await pg.evaluate(() => {
    const arcRe = /<path d="M ([\d.]+) ([\d.]+) Q [\d.]+ [\d.]+ ([\d.]+) [\d.]+ Q/g;
    const build = (dur) => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
      const s = createSong('tanchang', { title: 'p3', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
      const shape = chordShape('C');
      const c = tcol(); c.dur = dur; c.notes = shapeSounded(shape).map(n => ({ s: n.s, f: n.f })); c.strum = 'arp'; c.chord = 'C';
      const r4 = tcol(); r4.dur = 4;
      s.measures[0].tabs[0] = dur === 1 ? [c] : [c, r4, r4, r4];
      loadSong(s); blurSel = true; render();
      const h = document.getElementById('score').innerHTML;
      const wave = h.match(/<path d="M ([\d.]+) ([\d.]+)(?: q 3\.5 4 0 8)+/);
      const wx = wave ? +wave[1] : -1;
      let arcs = 0, arcLen = 0, m2;
      arcRe.lastIndex = 0;
      while ((m2 = arcRe.exec(h))) { const x1 = +m2[1], x2 = +m2[3]; if (Math.abs(x1 - wx) < 30 && x2 > x1 + 12) { arcs++; arcLen = x2 - x1; } }
      return { wx, arcs, arcLen };
    };
    const whole = build(1), quarter = build(4);
    return { wArcs: whole.arcs, wLen: +whole.arcLen.toFixed(0), qArcs: quarter.arcs, wx: whole.wx };
  });
  T(r.wArcs >= 1 && r.wLen > 60 && r.qArcs === 0, 'T3 全音符琶音画长延音弧、四分不画', JSON.stringify(r));

  // T4 自定义音符琶音渲染：lit 音画数字、波浪线左移；发声不按和弦补空弦
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('tanchang', { title: 'p4', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    const c = tcol(); c.dur = 2; c.strum = 'arp'; c.chord = 'C';
    c.strumTop = 1; c.strumBot = 6;
    c.notes = [{ s: 1, f: 0, lit: 1 }, { s: 2, f: 1, lit: 1 }, { s: 3, f: 2, lit: 1 }, { s: 4, f: 3, lit: 1 }];
    const r2 = tcol(); r2.dur = 2;
    s.measures[0].tabs[0] = [c, r2];
    loadSong(s); blurSel = true; render();
    const h = document.getElementById('score').innerHTML;
    const digits = [...h.matchAll(/<text x="([\d.]+)" y="[\d.]+" font-size="10\.5"[^>]*>(\d+)<\/text>/g)].map(m => ({ x: +m[1], t: m[2] }));
    const wave = h.match(/<path d="M ([\d.]+) [\d.]+(?: q 3\.5 4 0 8)+/);
    const wx = wave ? +wave[1] : -1;
    const dx = digits.length ? digits[0].x : -1;
    const imp = chordImpliedNotes(c, chordShape('C'), false);
    return { dn: digits.map(d => d.t).sort().join(''), waveLeft: wx > 0 && dx > 0 && wx < dx - 5,
      impN: imp.length, impStrs: imp.map(n => n.s).sort().join('') };
  });
  T(r.dn === '0123' && r.waveLeft && r.impN === 4 && r.impStrs === '1234',
    'T4 lit 琶音画数字+波浪线左移+不补空弦', JSON.stringify(r));

  // T5 琶音弹窗逐弦输入：写入带 lit、留空弦删音；恢复随和弦回指法
  // （整段 try/catch：旧版文件没有 data-arp-apply 钮，让突变复跑显示红而不是崩溃）
  r = await pg.evaluate(() => { try { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('tanchang', { title: 'p5', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    const shape = chordShape('C');
    const c = tcol(); c.dur = 2; c.strum = 'arp'; c.chord = 'C';
    c.notes = shapeSounded(shape).map(n => ({ s: n.s, f: n.f }));
    const r2 = tcol(); r2.dur = 2;
    s.measures[0].tabs[0] = [c, r2];
    loadSong(s);
    sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 1 }; noteSel = []; selRange = null; render();
    showStrumMenu(200, 200);
    const inputs = [...document.querySelectorAll('#popmenu [data-sf]')];
    const nIn = inputs.length;
    inputs.forEach(x => { x.value = ''; });
    const put = (sN, v) => { const el = inputs.find(x => +x.dataset.sf === sN); if (el) el.value = v; };
    put(1, '0'); put(2, '1'); put(3, '0');
    document.querySelector('#popmenu [data-arp-apply]').click();
    const after = song.measures[0].tabs[0][0].notes.map(n => n.s + ':' + n.f + (n.lit ? 'L' : '')).sort().join(',');
    showStrumMenu(200, 200);
    document.querySelector('#popmenu [data-arp-reset]').click();
    const back = song.measures[0].tabs[0][0].notes;
    return { nIn, after, backN: back.length, backLit: back.some(n => n.lit) };
  } catch (e) { try { closePop(); } catch (_) {} return { err: String(e && e.message || e) }; } });
  T(r.nIn >= 5 && r.after === '1:0L,2:1L,3:0L' && r.backN >= 5 && !r.backLit,
    'T5 弹窗写入 lit/留空删音/恢复随和弦', JSON.stringify(r));

  // T6 教材式手输优先：同品位和弦内音——无 lit 显示 ×，setFret 手输后显示数字
  r = await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('tanchang', { title: 'p6', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 });
    s.tabNota = 'x';   // 教材式
    const c = tcol(); c.dur = 4; c.chord = 'C'; c.notes = [{ s: 2, f: 1 }];   // C 和弦 2 弦 1 品＝和弦内音
    const r4 = tcol(); r4.dur = 4;
    s.measures[0].tabs[0] = [c, r4, r4, r4];
    loadSong(s); blurSel = true; render();
    const cntX = (h) => (h.match(/>×<\/text>/g) || []).length;   // 和弦图上的 × 恒在，只看差值
    const xBefore = cntX(document.getElementById('score').innerHTML);
    sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 2 }; noteSel = []; selRange = null;
    setFret(1);   // 用户显式输入同一品位
    const h2 = document.getElementById('score').innerHTML;
    const note = song.measures[0].tabs[0][0].notes[0];
    const digitNow = /font-size="10\.5"[^>]*>1<\/text>/.test(h2);
    return { xBefore, lit: note.lit === 1, digitNow, xAfter: cntX(h2) };
  });
  T(r.xBefore >= 1 && r.lit && r.digitNow && r.xAfter === r.xBefore - 1,
    'T6 教材式：手输数字以编辑为准不折 ×（音符 × 消失、和弦图 × 不动）', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
