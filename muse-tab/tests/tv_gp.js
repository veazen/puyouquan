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

  // T5 第2小节：变拍 3/4；三连音；推弦 b；连音线（v67.0 起逐弦落到延音目标音 note.tieIn，不再归前列 col.tie）
  const t5 = await pg.evaluate(() => {
    const m = window.__song.measures[1], c = m.tabs[0];
    return { beats: m.beats, tup: c[0].tup, bend: c[3].notes[0].tech, colTie: !!c[3].tie, tieIn: !!c[4].notes[0].tieIn, len: c.length };
  });
  T(t5.beats === 3 && t5.tup === 1 && t5.bend === 'b' && t5.colTie === false && t5.tieIn === true && t5.len === 5, 'T5 小节2(3/4+三连+b+tie→目标音 tieIn)', JSON.stringify(t5));

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

  /* ===== v55.9 旧格式：GP5/GP4 二进制夹具（镜像读取器布局）+ GPX（BCFZ+BCFS） ===== */
  const mkW = () => { const a = [];
    const w = { arr: a,
      b: v => a.push(v & 255),
      i: v => a.push(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >> 24) & 255),
      sh: v => a.push(v & 255, (v >> 8) & 255),
      z: n => { for (let i = 0; i < n; i++) a.push(0); },
      bss: (s, size) => { const bf = Buffer.from(s, 'utf8'); a.push(Math.min(bf.length, size));
        for (let i = 0; i < size; i++) a.push(i < bf.length ? bf[i] : 0); },
      ibs: s => { const bf = Buffer.from(s, 'utf8'); w.i(bf.length + 1); a.push(bf.length); bf.forEach(x => a.push(x)); },
      iss: s => { const bf = Buffer.from(s, 'utf8'); w.i(bf.length); bf.forEach(x => a.push(x)); } };
    return w; };
  const gp5Buf = (() => {
    const w = mkW();
    w.bss('FICHIER GUITAR PRO v5.10', 30);
    ['T5测试', '', '歌手5', '', '词', '曲', '', '制谱', ''].forEach(s => w.ibs(s)); w.i(0);   // 9 信息串+0 注释
    w.i(0); for (let i = 0; i < 5; i++) { w.i(0); w.iss(''); }        // 歌词
    w.i(0); w.z(4); w.z(11);                                          // RSE 主效果(5.1)
    w.z(30); for (let i = 0; i < 10; i++) w.ibs('');                  // 页面设置
    w.ibs('');                                                        // 速度文本
    w.i(100); w.b(0);                                                 // tempo + hideTempo
    w.b(2); w.i(0);                                                   // key=D(2) + octave
    for (let i = 0; i < 64; i++) { w.i(0); w.z(8); }                  // 通道
    w.z(42);                                                          // 指示记号
    w.i(2); w.i(1);                                                   // 2 小节 1 轨
    w.b(0x07); w.b(4); w.b(4); w.z(4); w.z(1); w.b(0);                // 头1：4/4+反复开始+beams+pad+tripletFeel
    w.z(1); w.b(0x00); w.z(1); w.b(0);                                // 头2：间隔字节+flags0+pad+tripletFeel
    w.z(1); w.b(0);                                                   // 轨1：前导字节+flags
    w.bss('Lead', 40); w.i(6);
    [64, 59, 55, 50, 45, 40, 0].forEach(v => w.i(v));                 // 标准定弦（弦1 高音e 在前）
    w.i(1); w.i(1); w.i(2); w.i(24); w.i(1); w.i(0);                  // port/ch/chE/frets/capo=1/color
    w.z(29);                                                          // flags2+autoAccent+bank+humanize+24 未知
    w.i(0); w.i(0); w.i(0); w.i(0);                                   // RSE 乐器 3 ints + effectNumber(5.1)
    w.z(4); w.ibs(''); w.ibs('');                                     // 均衡+效果名×2
    w.z(1);                                                           // 全部轨后 skip(1)（5.1）
    /* 小节1 轨1：声部1=2 拍（四分音 弦1品7 + 四分休止），声部2=0 拍，行尾字节 */
    w.i(2);
    w.b(0x00); w.b(0); w.b(0x40); w.b(0x20); w.b(1); w.b(7); w.z(1); w.sh(0);   // 音拍：dur0+弦1+note(type1,f7)+pad+short
    w.b(0x40); w.b(0x02); w.b(0); w.b(0x00); w.sh(0);                            // 休止拍
    w.i(0); w.b(0);
    /* 小节2 轨1：声部1=1 拍（四分 弦1品9 tie 目标→本音 tieIn、品位取 7；v66.9 前落成前列 col.tie），声部2=0，行尾 */
    w.i(1);
    w.b(0x00); w.b(0); w.b(0x40); w.b(0x20); w.b(2); w.b(9); w.z(1); w.sh(0);
    w.i(0); w.b(0);
    return Buffer.from(w.arr);
  })();
  /* v66.7 GP5.00 夹具：5.00 与 5.10 的布局差异（无 RSE 主效果 / 无 hideTempo / 每轨前导字节 / 乐器 effectNumber=short+1 / 轨后 skip2），
     外加一个带混音变化（变速 120）的拍：混音块按 TuxGuitar readMixChange 的写法「乐器号 + 16 字节」写，不照抄读取器结构——
     读取器若少读 1 字节，后面的音符就会错位 */
  const gp500Buf = (() => {
    const w = mkW();
    w.bss('FICHIER GUITAR PRO v5.00', 30);
    ['T500测试', '', '歌手500', '', '词', '曲', '', '制谱', ''].forEach(s => w.ibs(s)); w.i(0);
    w.i(0); for (let i = 0; i < 5; i++) { w.i(0); w.iss(''); }
    w.z(30); for (let i = 0; i < 10; i++) w.ibs('');
    w.ibs(''); w.i(90);                                               // 速度文本 + tempo（5.00 无 hideTempo）
    w.b(0); w.i(0);
    for (let i = 0; i < 64; i++) { w.i(0); w.z(8); }
    w.z(42);
    w.i(1); w.i(1);                                                   // 1 小节 1 轨
    w.b(0x03); w.b(4); w.b(4); w.z(4); w.z(1); w.b(0);
    w.z(1); w.b(0);                                                   // 轨前导字节（5.00 每轨都有）+ flags
    w.bss('Lead', 40); w.i(6); [64, 59, 55, 50, 45, 40, 0].forEach(v => w.i(v));
    w.i(1); w.i(1); w.i(2); w.i(24); w.i(0); w.i(0);
    w.z(29);
    w.i(0); w.i(0); w.i(0); w.sh(0); w.z(1);                          // RSE 乐器：3 ints + short + 1（5.00）
    w.z(2);                                                           // 全部轨后 skip(2)（5.00）
    w.i(2);
    /* 拍1：带混音变化（flags 0x10）——乐器号 -1 + 16 字节 + 6 项数值全 -1 + 速度文本 + tempo 120 + 速度过渡 + 标志 + wah；音符 弦1品5 */
    w.b(0x10); w.b(0);
    w.b(0xFF); w.z(16); for (let i = 0; i < 6; i++) w.b(0xFF); w.ibs(''); w.i(120); w.b(0); w.b(0); w.b(0xFF);
    w.b(0x40); w.b(0x20); w.b(1); w.b(5); w.z(1); w.sh(0);
    /* 拍2：普通音符 弦1品7 */
    w.b(0x00); w.b(0); w.b(0x40); w.b(0x20); w.b(1); w.b(7); w.z(1); w.sh(0);
    w.i(0);                                                           // 声部2：0 拍；末小节不写换行标记（同转谱站文件）
    return Buffer.from(w.arr);
  })();
  const gp4Buf = (() => {
    const w = mkW();
    w.bss('FICHIER GUITAR PRO v4.06', 30);
    ['T4测试', '', '', '', '', '', '', ''].forEach(s => w.ibs(s)); w.i(0);   // 8 信息串（无「曲」）
    w.b(0);                                                           // tripletFeel
    w.i(0); for (let i = 0; i < 5; i++) { w.i(0); w.iss(''); }        // 歌词
    w.i(88);                                                          // tempo
    w.b(0); w.i(0);                                                   // key C + octave
    for (let i = 0; i < 64; i++) { w.i(0); w.z(8); }
    w.i(1); w.i(1);                                                   // 1 小节 1 轨
    w.b(0x03); w.b(3); w.b(4);                                        // 头：3/4
    w.b(0); w.bss('Gtr', 40); w.i(6);
    [64, 59, 55, 50, 45, 40, 0].forEach(v => w.i(v));
    w.i(1); w.i(1); w.i(2); w.i(24); w.i(0); w.i(0);
    w.i(1);                                                           // 1 拍
    w.b(0x00); w.b(0); w.b(0x20); w.b(0x20); w.b(1); w.b(5);          // 四分 弦2(bit5) note f5
    return Buffer.from(w.arr);
  })();
  const gpxBuf = (() => {
    const content = Buffer.from(GPIF);
    const nSec = 2 + Math.ceil(content.length / 0x1000);
    const fsB = Buffer.alloc(nSec * 0x1000);
    fsB.write('BCFS', 0, 'latin1');
    fsB.writeInt32LE(2, 0x1000); fsB.write('score.gpif', 0x1004, 'latin1');
    fsB.writeInt32LE(content.length, 0x1000 + 0x8C);
    for (let i = 0; i < nSec - 2; i++) fsB.writeInt32LE(2 + i, 0x1000 + 0x94 + i * 4);
    content.copy(fsB, 0x2000);
    const bits = [];
    const pushB = (v, n, msb) => { for (let i = 0; i < n; i++) bits.push(msb ? (v >> (n - 1 - i)) & 1 : (v >> i) & 1); };
    for (let i = 0; i < fsB.length; i += 3) {
      const sz = Math.min(3, fsB.length - i);
      bits.push(0); pushB(sz, 2, false);
      for (let k = 0; k < sz; k++) pushB(fsB[i + k], 8, true);
    }
    const bytes = []; for (let i = 0; i < bits.length; i += 8) { let v = 0; for (let k = 0; k < 8; k++) v = (v << 1) | (bits[i + k] || 0); bytes.push(v); }
    const head = Buffer.alloc(8); head.write('BCFZ', 0, 'latin1'); head.writeInt32LE(fsB.length, 4);
    return Buffer.concat([head, Buffer.from(bytes)]);
  })();

  // T10 GP5 二进制：元数据/调号/变调夹/音符/休止/跨小节 tie/反复
  const t10 = await pg.evaluate((s) => {
    const u8 = Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const r = parseGP(u8.buffer);
    if (r.error) return { error: r.error };
    const br = buildSongFromGP345(r.gp, [0]);
    if (br.error) return { error: br.error };
    const sg = br.song, c0 = sg.measures[0].tabs[0], c1 = sg.measures[1].tabs[0];
    return { kind: r.gp.kind, ver: r.gp.ver, title: sg.title, singer: sg.singer, tempo: sg.tempo, key: sg.key,
      capo: sg.capo, nMea: sg.measures.length, repS: sg.measures[0].repeatStart,
      n0: c0[0].notes[0], tie0: !!c0[0].tie, rest: c0[1].notes.length === 0, n1: c1[0].notes[0],   /* v67.0 tie → 目标音 n1.tieIn，前列不再写 col.tie */
      tuningStd: sg.tuning === undefined };
  }, gp5Buf.toString('base64'));
  T(!t10.error && t10.kind === 'bin' && t10.ver === '5.10' && t10.title === 'T5测试' && t10.singer === '歌手5'
    && t10.tempo === 100 && t10.key === 'D' && t10.capo === 1 && t10.nMea === 2 && t10.repS === true
    && t10.n0 && t10.n0.s === 1 && t10.n0.f === 7 && t10.tie0 === false && t10.rest
    && t10.n1 && t10.n1.f === 7 && t10.n1.tieIn === true && t10.tuningStd, 'T10 GP5 二进制导入（v66.8 延音目标音品位取同弦上一音：夹具写 9、应读 7；v67.0 延音落到目标音 tieIn）', JSON.stringify(t10));

  // T10b v66.7 GP5 末小节缺「换行标记」字节（转谱站导出的 GP5 常见，PyGuitarPro 按可缺省读）：去掉文件最后 1 字节仍完整导入、
  //   结果与原文件一致；去掉 3 字节（真截断，缺的是音符数据）仍报「文件截断」，不静默吞掉
  const t10b = await pg.evaluate((s) => {
    const u8 = Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const full = parseGP(u8.buffer), cut1 = parseGP(u8.slice(0, u8.length - 1).buffer), cut3 = parseGP(u8.slice(0, u8.length - 3).buffer);
    const sum = r => { if (r.error) return { error: r.error }; const br = buildSongFromGP345(r.gp, [0]); if (br.error) return { error: br.error };
      return JSON.stringify(br.song.measures.map(m => m.tabs[0].map(c => (c.notes || []).map(n => n.s + ':' + n.f).join('+') + '/' + c.dur))); };
    return { full: sum(full), cut1: sum(cut1), cut3err: cut3.error || null };
  }, gp5Buf.toString('base64'));
  T(typeof t10b.full === 'string' && t10b.cut1 === t10b.full && /文件截断/.test(t10b.cut3err || ''),
    'T10b GP5 末小节缺换行标记字节仍可导入（与完整文件结果一致），真截断仍报错', JSON.stringify(t10b).slice(0, 300));

  // T10c v66.7 GP5.00：混音变化之后的音符不错位（5.00 乐器号后 16 字节，此前少读 1 字节）+ 5.00 布局整体可读 + 末尾无换行标记
  const t10c = await pg.evaluate((s) => {
    const u8 = Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const r = parseGP(u8.buffer); if (r.error) return { error: r.error };
    const br = buildSongFromGP345(r.gp, [0]); if (br.error) return { error: br.error };
    const cs = br.song.measures[0].tabs[0];
    return { ver: r.gp.ver, title: br.song.title, tempo: br.song.tempo, n: cs.map(c => (c.notes[0] || {}).f), s: cs.map(c => (c.notes[0] || {}).s) };
  }, gp500Buf.toString('base64'));
  T(!t10c.error && t10c.ver === '5.0' && t10c.title === 'T500测试' && t10c.tempo === 90 && JSON.stringify(t10c.n) === '[5,7]' && JSON.stringify(t10c.s) === '[1,1]',
    'T10c GP5.00 混音变化后的音符不错位（乐器号后 16 字节）、5.00 布局与缺换行标记都可读', JSON.stringify(t10c));

  // T11 GP4 二进制：3/4 拍号 + 弦2 音符
  const t11 = await pg.evaluate((s) => {
    const u8 = Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const r = parseGP(u8.buffer);
    if (r.error) return { error: r.error };
    const br = buildSongFromGP345(r.gp, [0]);
    if (br.error) return { error: br.error };
    const sg = br.song;
    return { ver: r.gp.ver, title: sg.title, tempo: sg.tempo, beats: sg.beats,
      n0: sg.measures[0].tabs[0][0].notes[0] };
  }, gp4Buf.toString('base64'));
  T(!t11.error && t11.ver === '4.6' && t11.title === 'T4测试' && t11.tempo === 88 && t11.beats === 3
    && t11.n0 && t11.n0.s === 2 && t11.n0.f === 5, 'T11 GP4 二进制导入', JSON.stringify(t11));

  // T12 GPX（GP6 BCFZ 容器）：解压后复用 GPIF 管线
  const t12 = await pg.evaluate((s) => {
    const u8 = Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const r = parseGP(u8.buffer);
    if (r.error) return { error: r.error };
    const br = buildSongFromGP(r.gp, [0]);
    return { kind: r.gp.kind, title: r.gp.title, nMea: br.song ? br.song.measures.length : 0 };
  }, gpxBuf.toString('base64'));
  T(!t12.error && t12.kind === 'gpif' && t12.title === 'GP导入测试' && t12.nMea === 3, 'T12 GPX(BCFZ) 导入', JSON.stringify(t12));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
