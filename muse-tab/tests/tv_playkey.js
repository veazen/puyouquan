/* tv_playkey —— v60.29「转调播放跟随 + 音符输入实时回响」回归
   用户报告：「转调时播放不会跟随不会转调」——查实为**中途转调标记 keyTo 只进渲染/
   MusicXML 导出，播放全链路只读谱首调**（整体换调 stepKey/曲谱信息换调本来就跟随，
   T3 一并钉住防退化）。修法：keyAt/keyRefAt 按小节给出生效调，播放构建按小节取调。
   第二件：编辑输入音符即刻回响对应音高（pingCol，主播放同口径）。
   播放断言手法：把 playInst 整体替换为记录器（记 freq/when，不发声），play() 是
   整曲同步预排程，返回后事件已全部落记录器——比对频率即比对音高，不听声。
   变异实证（写入时验证过）：
   ── 播放构建的 voxMidi(col, mi) 去掉 mi（退回谱首调）→ T2 当场红；
   ── setDeg 的 pingCol 挂钩移除 → T4 当场红。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.SF_PLAYWAIT = false; });   /* v60.34 回归不等在途音色包 */
  let pass = 0, total = 0; const T = (ok, n, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + n + (d ? ': ' + d : '')); };
  const near = (a, b2) => Math.abs(a - b2) < 0.01;

  /* 歌谱 4 小节全 deg=1，第 3 小节起「转 1=D」 */
  let r = await pg.evaluate(() => {
    window.guardReplace = p => p();
    loadSong(createSong('vocal', { title: 'k', beats: 4, unit: 4, key: 'C', nMea: 4, nTab: 0, nVox: 1, lyr: 0 }));
    mutate(() => {
      song.measures.forEach(m => { m.voxes[0] = [0, 1, 2, 3].map(() => ({ dur: 4, dotted: false, deg: 1, acc: '', oct: 0, lyrics: [], tie: false })); });
      song.measures[2].keyTo = 'D';
    });
    return { k0: keyAt(0), k2: keyAt(2), k3: keyAt(3), r0: keyRefAt(0), r2: keyRefAt(2),
      vm0: voxMidi(song.measures[0].voxes[0][0], 0), vm2: voxMidi(song.measures[2].voxes[0][0], 2) };
  });
  T(r.k0 === 'C' && r.k2 === 'D' && r.k3 === 'D' && r.r0 === 60 && r.r2 === 62 && r.vm0 === 60 && r.vm2 === 62,
    'T1 keyAt/keyRefAt/voxMidi(mi) 生效调语义', JSON.stringify(r));

  /* 播放事件跟随 keyTo：前 2 小节 C4、后 2 小节 D4（记录器断言，不听声） */
  r = await pg.evaluate(() => {
    window._rec = [];
    const orig = playInst;
    playInst = (k, c, b2, f, w) => { _rec.push({ f: +f.toFixed(2), w: +w.toFixed(3) }); };
    try { play(); } finally { stopPlay(); playInst = orig; }
    const ev = _rec.slice().sort((a, b2) => a.w - b2.w);
    const c4 = +(440 * Math.pow(2, (60 - 69) / 12)).toFixed(2), d4 = +(440 * Math.pow(2, (62 - 69) / 12)).toFixed(2);
    const nC = ev.filter(e => Math.abs(e.f - c4) < 0.01).length, nD = ev.filter(e => Math.abs(e.f - d4) < 0.01).length;
    const lastC = Math.max(...ev.filter(e => Math.abs(e.f - c4) < 0.01).map(e => e.w));
    const firstD = Math.min(...ev.filter(e => Math.abs(e.f - d4) < 0.01).map(e => e.w));
    return { n: ev.length, nC, nD, ordered: lastC < firstD };
  });
  T(r.nC === 8 && r.nD === 8 && r.ordered,
    'T2 播放跟随中途转调标记（前 8 音 C4 → 后 8 音 D4）', JSON.stringify(r));

  /* MIDI 导出同口径跟随 keyTo：导出 → parseSMF 回读，前 8 音 60、后 8 音 62 */
  r = await pg.evaluate(() => {
    const out = exportMIDI(song);
    const smf = parseSMF(out.bytes);
    const ns = smf.tracks.flatMap(t2 => t2.notes).sort((a, b2) => a.start - b2.start);
    return { n: ns.length, head: ns.slice(0, 8).every(n => n.midi === 60), tail: ns.slice(8).every(n => n.midi === 62) };
  });
  T(r.n === 16 && r.head && r.tail, 'T2b MIDI 导出跟随中途转调标记（导出→回读闭环）', JSON.stringify(r));

  /* 整体换调播放跟随（本来就对，钉住防退化）：stepKey(+2) 后同列音高 +2 半音 */
  r = await pg.evaluate(() => {
    mutate(() => { delete song.measures[2].keyTo; });
    const before = voxMidi(song.measures[0].voxes[0][0], 0);
    stepKey(2);
    const after = voxMidi(song.measures[0].voxes[0][0], 0);
    return { key: song.key, before, after };
  });
  T(r.key === 'D' && r.after === r.before + 2, 'T3 整体换调播放跟随（stepKey +2 半音）', JSON.stringify(r));

  /* 输入回响：简谱 setDeg 即刻回响对应音高；主播放中不插响 */
  r = await pg.evaluate(() => {
    window._rec = [];
    const orig = playInst;
    playInst = (k, c, b2, f) => { _rec.push(+f.toFixed(2)); };
    sel.row = 'vox'; sel.vi = 0; sel.mi = 0; sel.ci = 1;
    setDeg(3);
    const got = _rec.slice();
    audio.playing = true; setDeg(5); const inPlay = _rec.length;
    audio.playing = false;
    playInst = orig;
    const want = +(440 * Math.pow(2, ((keyRef() + DEG_SEMI[3]) - 69) / 12)).toFixed(2);
    return { got, want, inPlay };
  });
  T(r.got.length === 1 && near(r.got[0], r.want) && r.inPlay === 1,
    'T4 简谱输入回响（正确音高；播放中不插响）', JSON.stringify(r));

  /* 输入回响：TAB 弦品口径（调弦+品+capo−12）；×闷音不响 */
  r = await pg.evaluate(() => {
    loadSong(createSong('guitar', { title: 'g', beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 0 }));
    mutate(() => { song.capo = 2; });
    window._rec = [];
    const orig = playInst;
    playInst = (k, c, b2, f) => { _rec.push(+f.toFixed(2)); };
    sel.row = 'tab'; sel.vi = 0; sel.mi = 0; sel.ci = 0; sel.si = 5;
    setFret(3);
    const want = +(440 * Math.pow(2, ((tuningOf()[4] + 3 + 2 - 12) - 69) / 12)).toFixed(2);
    const got = _rec.slice();
    /* ×闷音：无确定音高 → 不响 */
    const col = song.measures[0].tabs[0][0];
    col.notes.find(n => n.s === 5).x = true;
    pingCol('tab', 0, 0, col, 5);
    const afterMute = _rec.length;
    playInst = orig;
    return { got, want, afterMute };
  });
  T(r.got.length === 1 && near(r.got[0], r.want) && r.afterMute === 1,
    'T5 TAB 输入回响（调弦+品+capo−12；×闷音不响）', JSON.stringify(r));

  /* keyTo 之后输入回响也按新调（回响与播放同一生效调） */
  r = await pg.evaluate(() => {
    loadSong(createSong('vocal', { title: 'k2', beats: 4, unit: 4, key: 'C', nMea: 4, nTab: 0, nVox: 1, lyr: 0 }));
    mutate(() => { song.measures[2].keyTo = 'D'; });
    window._rec = [];
    const orig = playInst;
    playInst = (k, c, b2, f) => { _rec.push(+f.toFixed(2)); };
    sel.row = 'vox'; sel.vi = 0; sel.mi = 2; sel.ci = 0;
    setDeg(1);
    playInst = orig;
    const want = +(440 * Math.pow(2, (62 - 69) / 12)).toFixed(2);
    return { got: window._rec.slice(), want };
  });
  T(r.got.length === 1 && near(r.got[0], r.want), 'T6 转调标记后输入回响按新调', JSON.stringify(r));

  T(errs.length === 0, 'T7 无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
