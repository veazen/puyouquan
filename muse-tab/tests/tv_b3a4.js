/* v65.4 B3a 互操作保真（四）（2026-10 评审团 §6.3 B3a ⑦⑧：P2-13 x/2 拍号·弱起·移调乐器（D-14 ②）、P2-28 自定义定弦、P3-05 MIDI 元事件与音色）
   T1 2/2 拍：两个二分音 beatErrors 0、单位音符 2 个四分长；MusicXML 写 beats 2 / beat-type 2，导入回 unit 2 无跳过；MIDI 拍号元事件 2/2 回读 unit 2；三处拍号选择器含 2
   T2 弱起：导出首小节 number="0" implicit="yes"、第二小节 number="1"；导入回 pickup=true、小节数不变；第三方 number="0" → pickup
   T3 移调乐器：导入 <transpose><chromatic>-2 → song.transp=-2，谱面 deg 1 不变（记谱音）、voxMidi 58、MIDI 首音 58、再导出 chromatic -2、页头提示「移调乐器」
   T4 MIDI 自定义定弦：Drop D 谱 6 弦空弦 → MIDI 最低音 38（此前固定标准定弦 40）
   T5 MIDI 逐小节元事件：第 3 小节 3/4、第 2 小节转 1=G → 元事件轨 2 个拍号 + 2 个调号事件
   T6 MIDI 音色按混音台：vox:0 flute → program 73（通道 0）、tab:0 elecdist → program 30（通道 1）；无条目沿用 0 / 24
   突变实证：对 v65.4 之前的文件复跑，T1–T6 全部报红。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto('file://' + FILE); await pg.waitForTimeout(1000);
  await pg.evaluate(() => {
    guardReplace = (p) => p(); hideStartPad(); blurSel = true;
    window.V = (d, u, o) => Object.assign({ dur: u, dotted: false, deg: d, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
    window.MX = (measures, attrExtra) => '<?xml version="1.0"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Tpt</part-name></score-part></part-list><part id="P1">' +
      measures.map((m, i) => `<measure number="${m.num != null ? m.num : i + 1}"${m.implicit ? ' implicit="yes"' : ''}>` + (i === 0 ? `<attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef>${attrExtra || ''}</attributes>` : '') + m.body + '</measure>').join('') + '</part></score-partwise>';
    window.N = (step, oct) => `<note><pitch><step>${step}</step><octave>${oct || 4}</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>`;
    /* 扫 SMF 字节：统计 FF 58 / FF 59 元事件、读各轨 program change */
    window.scanSMF = (u8) => { const out = { ts: 0, ks: 0, prog: [] }; for (let i = 0; i < u8.length - 2; i++) { if (u8[i] === 0xFF && u8[i + 1] === 0x58) out.ts++; if (u8[i] === 0xFF && u8[i + 1] === 0x59) out.ks++; if ((u8[i] & 0xF0) === 0xC0 && i > 0 && u8[i - 1] === 0) out.prog.push(((u8[i] & 0x0F)) + ':' + u8[i + 1]); } return out; };
  });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = f => pg.evaluate(f).catch(e => ({ err: e.message }));

  /* T1 */
  let r = await EV(() => { const s = createSong('vocal', { title: '二二', key: 'C', beats: 2, unit: 2, nMea: 2, nVox: 1, lyr: 0 });
    s.measures.forEach(m => { m.voxes[0] = [V(1, 2), V(3, 2)]; }); loadSong(s); render();
    const xml = exportMusicXML(song); const im = importMusicXML(xml); const smf = parseSMF(exportMIDI(song).bytes);
    return { be: beatErrors().length, us: +unitSeconds(song, 1).toFixed(3), xml: /<beats>2<\/beats><beat-type>2<\/beat-type>/.test(xml), unit: im.song && im.song.unit, sk: im.skip && im.skip.other, midiUnit: smf.ts && smf.ts.unit }; });
  { const src = require('fs').readFileSync(FILE, 'utf8');   /* 三处拍号选择器（新建向导 ×2、变拍子菜单、曲谱信息）都列出 2 */
    r.pm = (src.match(/sels\('nw-unit',\[2,4,8\],4\)/g) || []).length === 2 && /sels\('pm-unit',\[2,4,8\]/.test(src) && /id="mm-unit"><option \$\{song\.unit===2\?'selected':''\}>2<\/option>/.test(src); }
  T(!r.err && r.be === 0 && r.us === 1.333 && r.xml && r.unit === 2 && r.sk === 0 && r.midiUnit === 2 && r.pm === true, 'T1 2/2 拍：排版/播放/MusicXML/MIDI/拍号选择器', JSON.stringify(r));

  /* T2 */
  r = await EV(() => { const s = createSong('vocal', { title: '弱起', key: 'C', beats: 4, unit: 4, nMea: 3, nVox: 1, lyr: 0 }); s.pickup = true;
    s.measures[0].voxes[0] = [V(5, 4)]; s.measures.slice(1).forEach(m => { m.voxes[0] = [V(1, 4), V(2, 4), V(3, 4), V(5, 4)]; }); loadSong(s);
    const xml = exportMusicXML(song); const im = importMusicXML(xml);
    const third = importMusicXML(MX([{ num: 0, implicit: true, body: N('G', 4) }, { num: 1, body: N('C', 4) + N('D', 4) + N('E', 4) + N('F', 4) }]));
    return { m0: /<measure number="0" implicit="yes">/.test(xml), m1: /<measure number="1">/.test(xml) && !/<measure number="3">/.test(xml), pk: !!(im.song && im.song.pickup), n: im.song && im.song.measures.length, pk3: !!(third.song && third.song.pickup), n3: third.song && third.song.measures.length }; });
  T(!r.err && r.m0 && r.m1 && r.pk && r.n === 3 && r.pk3 && r.n3 === 2, 'T2 弱起小节 implicit 出入', JSON.stringify(r));

  /* T3 */
  r = await EV(() => { const xml = MX([{ body: N('C', 4) + N('D', 4) + N('E', 4) + N('F', 4) }], '<transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose>');
    const im = importMusicXML(xml); if (!im.song) return { err: im.error }; loadSong(im.song); render();
    const c0 = song.measures[0].voxes[0][0]; const smf = parseSMF(exportMIDI(song).bytes); const first = smf.tracks && smf.tracks[0] && smf.tracks[0].notes.slice().sort((a, b2) => a.start - b2.start)[0];
    const xml2 = exportMusicXML(song);
    return { tr: song.transp, deg: c0.deg, acc: c0.acc, midi: voxMidi(c0, 0), first: first && first.midi, re: /<transpose><diatonic>-1<\/diatonic><chromatic>-2<\/chromatic><\/transpose>/.test(xml2), hdr: (document.getElementById('ri-ts') || {}).textContent || '' }; });
  T(!r.err && r.tr === -2 && r.deg === 1 && r.acc === '' && r.midi === 58 && r.first === 58 && r.re && /移调乐器/.test(r.hdr), 'T3 移调乐器：记谱音谱面、实音播放/MIDI、transpose 往返', JSON.stringify(r));

  /* T4 */
  r = await EV(() => { const s = createSong('guitar', { title: 'DropD', key: 'C', beats: 4, unit: 4, nMea: 1, nTab: 1, nVox: 0, lyr: 0, tuning: [38, 45, 50, 55, 59, 64] });
    s.measures[0].tabs[0] = [{ dur: 4, dotted: false, notes: [{ s: 6, f: 0 }] }, { dur: 4, dotted: false, notes: [{ s: 1, f: 0 }] }, { dur: 2, dotted: false, notes: [] }]; loadSong(s);
    const smf = parseSMF(exportMIDI(song).bytes); const all = (smf.tracks || []).flatMap(t => t.notes.map(n => n.midi));
    return { tun: JSON.stringify(song.tuning), lo: Math.min(...all), hi: Math.max(...all) }; });
  T(!r.err && r.lo === 38 && r.hi === 64, 'T4 MIDI 导出读自定义定弦（Drop D 最低音 38）', JSON.stringify(r));

  /* T5 */
  r = await EV(() => { const s = createSong('vocal', { title: '变拍转调', key: 'C', beats: 4, unit: 4, nMea: 3, nVox: 1, lyr: 0 });
    s.measures.forEach(m => { m.voxes[0] = [V(1, 4), V(2, 4), V(3, 4), V(5, 4)]; }); s.measures[1].keyTo = 'G'; s.measures[2].beats = 3; s.measures[2].voxes[0] = [V(1, 4), V(2, 4), V(3, 4)]; loadSong(s);
    const sc = scanSMF(exportMIDI(song).bytes); return sc; });
  T(!r.err && r.ts === 2 && r.ks === 2, 'T5 MIDI 元事件逐小节：变拍 2 个拍号、转调 2 个调号', JSON.stringify(r));

  /* T6 */
  r = await EV(() => { const s = createSong('guitar', { title: '音色', key: 'C', beats: 4, unit: 4, nMea: 1, nTab: 1, nVox: 1, lyr: 0 });
    s.measures[0].voxes[0] = [V(1, 4), V(2, 4), V(3, 4), V(5, 4)]; s.measures[0].tabs[0] = [{ dur: 1, dotted: false, notes: [{ s: 1, f: 0 }] }];
    s.mixer = { 'vox:0': { on: true, solo: false, inst: 'flute', vol: 1, pan: null }, 'tab:0': { on: true, solo: false, inst: 'elecdist', vol: 1, pan: null } }; loadSong(s);
    const a = scanSMF(exportMIDI(song).bytes).prog.join(' '); delete song.mixer; const b2 = scanSMF(exportMIDI(song).bytes).prog.join(' '); return { a, b: b2 }; });
  T(!r.err && r.a === '0:73 1:30' && r.b === '0:0 1:24', 'T6 MIDI 音色按混音台映射（无条目沿用默认）', JSON.stringify(r));

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
