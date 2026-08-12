/* v55.8 Guitar Pro (.gp GP7/8) 导入回归：Node 自造 ZIP+gpif 夹具 →
   页面内 parseGP/buildSongFromGP/importMXLBuffer 断言（音轨/调速/拍号继承/技法映射/连音线/倚音/和弦名/.mxl） */
const { chromium } = require('playwright');
const zlib = require('zlib');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');

function crc32(u8){
  const tb=[]; for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1? 0xEDB88320^(c>>>1) : c>>>1; tb[n]=c>>>0; }
  let c=0xFFFFFFFF; for(let i=0;i<u8.length;i++) c=tb[(c^u8[i])&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0;
}
function makeZip(entries, store){
  const chunks=[], central=[]; let off=0;
  for(const e of entries){
    const raw=Buffer.from(e.data);
    const comp=store? raw : zlib.deflateRawSync(raw);
    const method=store?0:8, crc=crc32(raw), name=Buffer.from(e.name);
    const lh=Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50,0); lh.writeUInt16LE(20,4); lh.writeUInt16LE(method,8);
    lh.writeUInt32LE(crc,14); lh.writeUInt32LE(comp.length,18); lh.writeUInt32LE(raw.length,22);
    lh.writeUInt16LE(name.length,26);
    chunks.push(lh,name,comp);
    const ch=Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50,0); ch.writeUInt16LE(20,4); ch.writeUInt16LE(20,6); ch.writeUInt16LE(method,10);
    ch.writeUInt32LE(crc,16); ch.writeUInt32LE(comp.length,20); ch.writeUInt32LE(raw.length,24);
    ch.writeUInt16LE(name.length,28); ch.writeUInt32LE(off,42);
    central.push(ch,name);
    off+=lh.length+name.length+comp.length;
  }
  const cd=Buffer.concat(central), eocd=Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50,0); eocd.writeUInt16LE(entries.length,8); eocd.writeUInt16LE(entries.length,10);
  eocd.writeUInt32LE(cd.length,12); eocd.writeUInt32LE(off,16);
  return Buffer.concat([...chunks,cd,eocd]);
}
/* gpif 夹具：2 轨（6弦吉他 capo2 + 鼓）3 小节；技法/连音线/倚音/和弦/变拍/反复/段落全覆盖 */
const GPIF = `<?xml version="1.0" encoding="utf-8"?>
<GPIF>
 <Score><Title>GP导入测试</Title><Artist>测试歌手</Artist><Music>作曲人</Music><Words>作词人</Words><Tabber>制谱人</Tabber></Score>
 <MasterTrack><Automations><Automation><Type>Tempo</Type><Bar>0</Bar><Value>76 2</Value></Automation></Automations></MasterTrack>
 <Tracks>
  <Track id="0"><Name>主音吉他</Name><Staves><Staff><Properties>
    <Property name="CapoFret"><Fret>2</Fret></Property>
    <Property name="Tuning"><Pitches>40 45 50 55 59 64</Pitches></Property>
    <Property name="DiagramCollection"><Items><Item id="0" name="C"/></Items></Property>
  </Properties></Staff></Staves></Track>
  <Track id="1"><Name>鼓</Name><Staves><Staff><Properties/></Staff></Staves></Track>
 </Tracks>
 <MasterBars>
  <MasterBar><Key><AccidentalCount>1</AccidentalCount><Mode>Major</Mode></Key><Time>4/4</Time><Repeat start="true" end="false"/><Bars>0 1</Bars></MasterBar>
  <MasterBar><Time>3/4</Time><Bars>2 3</Bars></MasterBar>
  <MasterBar><Section><Text>副歌</Text></Section><Repeat start="false" end="true" count="2"/><Bars>4 5</Bars></MasterBar>
 </MasterBars>
 <Bars>
  <Bar id="0"><Voices>0 -1</Voices></Bar><Bar id="1"><Voices>-1 -1</Voices></Bar>
  <Bar id="2"><Voices>1 -1</Voices></Bar><Bar id="3"><Voices>-1 -1</Voices></Bar>
  <Bar id="4"><Voices>2 -1</Voices></Bar><Bar id="5"><Voices>-1 -1</Voices></Bar>
 </Bars>
 <Voices>
  <Voice id="0"><Beats>0 1 2 3 4</Beats></Voice>
  <Voice id="1"><Beats>5 6 7 8 9</Beats></Voice>
  <Voice id="2"><Beats>10 11 12 13</Beats></Voice>
 </Voices>
 <Beats>
  <Beat id="0"><Rhythm ref="q"/><Notes>0</Notes><Chord>0</Chord></Beat>
  <Beat id="1"><Rhythm ref="q"/><Notes>1 2</Notes></Beat>
  <Beat id="2"><Rhythm ref="q"/></Beat>
  <Beat id="3"><Rhythm ref="e"/><Notes>3</Notes></Beat>
  <Beat id="4"><Rhythm ref="e"/><Notes>4</Notes></Beat>
  <Beat id="5"><Rhythm ref="t"/><Notes>5</Notes></Beat>
  <Beat id="6"><Rhythm ref="t"/><Notes>6</Notes></Beat>
  <Beat id="7"><Rhythm ref="t"/><Notes>7</Notes></Beat>
  <Beat id="8"><Rhythm ref="q"/><Notes>8</Notes></Beat>
  <Beat id="9"><Rhythm ref="q"/><Notes>9</Notes></Beat>
  <Beat id="10"><Rhythm ref="s"/><GraceNotes>BeforeBeat</GraceNotes><Notes>10</Notes></Beat>
  <Beat id="11"><Rhythm ref="q"/><Notes>11</Notes></Beat>
  <Beat id="12"><Rhythm ref="q"/><Notes>12</Notes></Beat>
  <Beat id="13"><Rhythm ref="q"/><Notes>13</Notes></Beat>
 </Beats>
 <Rhythms>
  <Rhythm id="q"><NoteValue>Quarter</NoteValue></Rhythm>
  <Rhythm id="e"><NoteValue>Eighth</NoteValue></Rhythm>
  <Rhythm id="t"><NoteValue>Eighth</NoteValue><PrimaryTuplet num="3" den="2"/></Rhythm>
  <Rhythm id="s"><NoteValue>16th</NoteValue></Rhythm>
 </Rhythms>
 <Notes>
  <Note id="0"><Properties><Property name="String"><String>5</String></Property><Property name="Fret"><Fret>3</Fret></Property></Properties></Note>
  <Note id="1"><Properties><Property name="String"><String>0</String></Property><Property name="Fret"><Fret>3</Fret></Property></Properties></Note>
  <Note id="2"><Properties><Property name="String"><String>1</String></Property><Property name="Fret"><Fret>2</Fret></Property></Properties></Note>
  <Note id="3"><Properties><Property name="String"><String>5</String></Property><Property name="Fret"><Fret>5</Fret></Property><Property name="HopoOrigin"><Enable/></Property></Properties></Note>
  <Note id="4"><Properties><Property name="String"><String>5</String></Property><Property name="Fret"><Fret>7</Fret></Property></Properties></Note>
  <Note id="5"><Properties><Property name="String"><String>4</String></Property><Property name="Fret"><Fret>0</Fret></Property></Properties></Note>
  <Note id="6"><Properties><Property name="String"><String>4</String></Property><Property name="Fret"><Fret>2</Fret></Property></Properties></Note>
  <Note id="7"><Properties><Property name="String"><String>4</String></Property><Property name="Fret"><Fret>3</Fret></Property></Properties></Note>
  <Note id="8"><Properties><Property name="String"><String>3</String></Property><Property name="Fret"><Fret>2</Fret></Property><Property name="Bended"><Enable/></Property><Property name="BendDestinationValue"><Float>100</Float></Property></Properties></Note>
  <Note id="9"><Properties><Property name="String"><String>3</String></Property><Property name="Fret"><Fret>2</Fret></Property></Properties><Tie origin="false" destination="true"/></Note>
  <Note id="10"><Properties><Property name="String"><String>5</String></Property><Property name="Fret"><Fret>5</Fret></Property></Properties></Note>
  <Note id="11"><Properties><Property name="String"><String>5</String></Property><Property name="Fret"><Fret>7</Fret></Property></Properties></Note>
  <Note id="12"><Properties><Property name="String"><String>2</String></Property><Property name="Fret"><Fret>9</Fret></Property><Property name="Slide"><Flags>4</Flags></Property></Properties></Note>
  <Note id="13"><Properties><Property name="String"><String>2</String></Property><Property name="Fret"><Fret>12</Fret></Property><Property name="HarmonicType"><HType>Natural</HType></Property></Properties></Note>
 </Notes>
</GPIF>`;
const MXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1"><work><work-title>MXL测试</work-title></work>
<part-list><score-part id="P1"><part-name>声部</part-name></score-part></part-list>
<part id="P1"><measure number="1">
<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
</measure></part></score-partwise>`;

(async () => {
  const gpBuf = makeZip([{name:'VERSION',data:'7.0'},{name:'Content/score.gpif',data:GPIF}]);
  const gpStored = makeZip([{name:'Content/score.gpif',data:GPIF}], true);
  const mxlBuf = makeZip([
    {name:'META-INF/container.xml',data:'<container><rootfiles><rootfile full-path="sc.musicxml"/></rootfiles></container>'},
    {name:'sc.musicxml',data:MXML}]);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  let pass = 0, total = 0;
  const T = (ok, name, detail) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (detail ? ': ' + detail : '')); };
  const b64 = buf => buf.toString('base64');

  // T1 解析：ZIP(deflate) → 轨清单/速度/标题；鼓轨标记
  const t1 = await pg.evaluate((s) => {
    const u8 = Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const r = parseGP(u8.buffer);
    if (r.error) return { error: r.error };
    window.__gp = r.gp;
    return { tracks: r.gp.tracks.length, drum1: r.gp.tracks[1].drum, strings0: r.gp.tracks[0].strings,
      capo0: r.gp.tracks[0].capo, tempo: r.gp.tempo, title: r.gp.title, bars: r.gp.masterBars.length };
  }, b64(gpBuf));
  T(!t1.error && t1.tracks === 2 && t1.drum1 === true && t1.strings0 === 6 && t1.capo0 === 2
    && t1.tempo === 76 && t1.title === 'GP导入测试' && t1.bars === 3, 'T1 parseGP(deflate)', JSON.stringify(t1));

  // T2 stored 方式的 ZIP 同样可解
  const t2 = await pg.evaluate((s) => {
    const u8 = Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const r = parseGP(u8.buffer);
    return r.error ? { error: r.error } : { title: r.gp.title };
  }, b64(gpStored));
  T(!t2.error && t2.title === 'GP导入测试', 'T2 parseGP(stored)', JSON.stringify(t2));

  // T3 建谱：元数据/调号/速度/变调夹/音轨名/小节数/标准定弦不写 tuning
  const t3 = await pg.evaluate(() => {
    const r = buildSongFromGP(window.__gp, [0, 1]);   // 鼓轨自动滤除
    if (r.error) return { error: r.error };
    window.__song = r.song; window.__skip = r.skip;
    const s = r.song;
    return { key: s.key, tempo: s.tempo, capo: s.capo, nMea: s.measures.length,
      tabV: s.tabVoices.length, name0: s.tabVoices[0], inst: s.inst, tuning: s.tuning === undefined,
      singer: s.singer, composer: s.composer };
  });
  T(!t3.error && t3.key === 'G' && t3.tempo === 76 && t3.capo === 2 && t3.nMea === 3
    && t3.tabV === 1 && t3.name0 === '主音吉他' && t3.inst === 'guitar' && t3.tuning
    && t3.singer === '测试歌手' && t3.composer === '作曲人', 'T3 buildSongFromGP 元数据', JSON.stringify(t3));

  // T4 第1小节：反复开始；弦序反转（GP弦5→s1）；和弦名 C；和音双弦；休止；击弦 h+tk
  const t4 = await pg.evaluate(() => {
    const m = window.__song.measures[0], c = m.tabs[0];
    return { repS: m.repeatStart, len: c.length,
      n0: c[0].notes[0], chord: c[0].chord,
      n1: c[1].notes.map(n => n.s + ':' + n.f).sort().join(','),
      rest: c[2].notes.length === 0,
      hTech: c[3].notes[0].tech, hTk: c[3].notes[0].tk };
  });
  T(t4.repS === true && t4.len === 5 && t4.n0.s === 1 && t4.n0.f === 3 && t4.chord === 'C'
    && t4.n1 === '5:2,6:3' && t4.rest && t4.hTech === 'h'
    && t4.hTk && t4.hTk.mi === 0 && t4.hTk.ci === 4 && t4.hTk.si === 1, 'T4 小节1(弦序/和弦/h+tk)', JSON.stringify(t4));

  // T5 第2小节：变拍 3/4；三连音；推弦 b；连音线 tie 归前列
  const t5 = await pg.evaluate(() => {
    const m = window.__song.measures[1], c = m.tabs[0];
    return { beats: m.beats, tup: c[0].tup, bend: c[3].notes[0].tech, tie: !!c[3].tie, len: c.length };
  });
  T(t5.beats === 3 && t5.tup === 1 && t5.bend === 'b' && t5.tie === true && t5.len === 5, 'T5 小节2(3/4+三连+b+tie)', JSON.stringify(t5));

  // T6 第3小节：拍号继承 3/4；段落标签；反复结束；倚音；无头滑 sd；自然泛音 hm
  const t6 = await pg.evaluate(() => {
    const m = window.__song.measures[2], c = m.tabs[0];
    return { beats: m.beats || 3, label: m.label, repE: m.repeatEnd, len: c.length,
      grace: c[0].grace && c[0].grace.notes[0], sd: c[1].notes[0].tech, hm: c[2].notes[0].tech };
  });
  T(t6.beats === 3 && t6.label === '副歌' && t6.repE === true && t6.len === 3
    && t6.grace && t6.grace.s === 1 && t6.grace.f === 5
    && t6.sd === 'sd' && t6.hm === 'hm', 'T6 小节3(继承拍号/倚音/sd/hm)', JSON.stringify(t6));

  // T7 渲染冒烟：导入的 song 直接渲染非空、42 套件外的最小回归
  const t7 = await pg.evaluate(() => {
    window.guardReplace = p => p();
    song = window.__song; sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 1 };
    clampSel(); render();
    return { svg: document.getElementById('score').innerHTML.length > 2000 };
  });
  T(t7.svg, 'T7 导入谱渲染非空', JSON.stringify(t7));

  // T8 .mxl 压缩包导入（container.xml 指路 → importMusicXML）
  const t8 = await pg.evaluate((s) => {
    const u8 = Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const r = importMXLBuffer(u8.buffer);
    return r.error ? { error: r.error } : { title: r.song.title, nMea: r.song.measures.length };
  }, b64(mxlBuf));
  T(!t8.error && t8.title === 'MXL测试' && t8.nMea === 1, 'T8 .mxl 解压导入', JSON.stringify(t8));

  // T9 容错：gpx 头/老 gp5/坏 zip 都给明确错误不抛异常
  const t9 = await pg.evaluate(() => {
    const gpx = parseGP(new Uint8Array([0x42, 0x43, 0x46, 0x5a, 1, 2]).buffer);
    const gp5 = parseGP(new Uint8Array([24, 70, 73, 67, 72]).buffer);
    const bad = parseGP(new Uint8Array([0x50, 0x4b, 9, 9, 9, 9]).buffer);
    return { gpx: /gpx/i.test(gpx.error || ''), gp5: !!gp5.error, bad: !!bad.error };
  });
  T(t9.gpx && t9.gp5 && t9.bad, 'T9 容错(gpx/gp5/坏包)', JSON.stringify(t9));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
