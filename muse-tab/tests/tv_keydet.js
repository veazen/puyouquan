/* v67.0 导入调识别 + 简谱首调 / 固定调 + 「改记谱调（音不变）」回归
   负责人原话：「导入谱时要考虑调的识别，简谱应该要固定调或者可调整的首调」。
   T1 16 个内置预设各取发声音跑 detectKey，与页头调一致（目标 ≥15/16）；同一批预设经 transposeSong 移到 3 个调再测（检测须跟着走，防「偏向 C」）
   T2 GP5 夹具：文件调号 0（1=C）、内容为 A 大调分解和弦（另带一条满是 C 音的鼓轨）→ 弹窗默认「检测 1=A」，导入后 song.key=A
   T3 小调内容（d 小调：Dm–Gm–A–Dm，含导音 ♯C）→ 关系大调 1=F、调式注明「D 小调」、song.mode=minor
   T4 带变调夹的 GP 夹具：G 指法（G–D–Em–C）夹 2 品 → 实际调 1=A、song.key（指法调）=G、capo=2、说明行写「按 1=G 指法」
   T5 GP6/7/8（GPIF）夹具：E 大调内容、AccidentalCount=0 → 默认 1=E
   T6 导入弹窗选「固定调」→ 1=C，简谱联排行出现 ♯（A 大调的 ♯C/♯F/♯G）；选列表里的其他调（1=E）生效
   T7「改记谱调」：小步舞曲（G 大调五线谱，含倚音）/ 功能谱 / 弹唱谱夹 2 品 / 中途转调四份谱：
      TAB 品位逐个相同、vox 绝对音高逐个相同、播放事件音高序列相同、MIDI 导出逐音相同（parseSMF 回读）、
      MusicXML 导出再导入音高相同；页头 1=X 改变；和弦名不动、功能谱级数随新调重算；keyTo 保持绝对调名；一步撤销
   T8 编辑器变调弹窗 UI：「改记谱调（音不变）」开合 → 13 个速选（12 调 + 固定调），当前调标「当前」、点选即改、Ctrl+Z 还原
   T9 MIDI：无调号的 ♭E 大调旋律 → 默认检测 1=♭E；调号写 0 但内容是 ♭E（存疑）→ 仍默认检测并注明不符；调号与内容一致（D 大调）→ 默认文件调号
   T10 MusicXML：fifths=-3 + minor（c 小调）→ 以文件为准 1=♭E + mode:minor；缺 <key> 的 D 大调旋律 → 检测为 1=D 并按 D 重拼唱名（首音为 1）
   T11 倚音：播放八度与谱面同口径（绝对八度，此前误加主音 oct 高一个八度）；改记谱调后调外倚音写 acc、播放音高不变、简谱倚音画 ♯；
       装饰音邻音写 ornAcc（颤音上邻音音高不变，五线谱 ♮ / 简谱 ♯）
   T12 简谱联排行（tabJp）按本谱定弦（Drop D / 尤克里里）与本小节生效调（中途转调）读唱名
   —— 以下为验收补强 ——
   T13 调识别对抗样例：五声民歌（商 / 徵 / 角调式单旋律）→ 1=宫音；主歌 C、副歌 D 的转调谱 → 开头的调（不落「折中调」G）；
       只有分解和弦、无和弦名、不以主和弦收尾的 I–V–vi–IV → 本调（不落下属调）；通篇借用和弦 I–♭VI–♭VII–I → 主和弦的调
   T14 整体降半音调弦（E♭ 标准）的 GP：和弦名是 E 形状的指法名 → 实际调 1=♭E、联排行唱名正确；再夹 2 品（G 形状）→ 1=♭A
   T15 改记谱调的拼写：调内音写调内唱名（1=C 的 ♭3 / ♭6 到 1=E 写 7 / 3，不写 ♭1 / ♭4）；♯C 大调里的还原 G 写 ♭5（不写重升 F）；
       12×12 个调互改无重升 / 重降、往返拼写复原、音高不变
   T16 变调弹窗：改记谱调后「唱 X」不再显示 (+n)（音没动）；撤销后不显示 (−n)；之后真移调 ♯ 照常显示 (+1)
   T17 简谱联排行：有自己夹位的轨（tabCapos）按夹位差折算，同一发声音两条轨读同一个唱名
   T18 编辑栏新输入的倚音默认落在离主音最近的八度（1̇ 上输「2」→ 2̇，播放 D5 紧挨 C5）
   T19 导入弹窗「固定调」说明行：只有六线谱的导入（GP / MIDI 吉他）写「联排行调外音统一写 ♯」，有简谱旋律的（MIDI 歌谱）写「所选调决定 ♯ / ♭」；
       GP 改勾音轨（夹位变）后改选「文件调号」，说明行用新夹位
   突变实证：MUSETAB_URL 指向 v66.9 原版跑本套件应大面积报红；T13–T18 指向实现方初版（验收前）也报红。 */
const { chromium } = require('playwright');
const zlib = require('zlib');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');

/* ---------- 夹具：GP5（v5.10）二进制写出器（镜像 parseGP345 读取布局，同 tv_gp mkW） ---------- */
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
/* tracks:[{name, capo, drum, tuning, bars:[[{d:4|8|2|1, n:[[弦,品]...], chord?}]]}] */
function gp5(o) {
  const w = mkW();
  w.bss('FICHIER GUITAR PRO v5.10', 30);
  [o.title || '调识别测试', '', '', '', '', '', '', '', ''].forEach(s => w.ibs(s)); w.i(0);
  w.i(0); for (let i = 0; i < 5; i++) { w.i(0); w.iss(''); }
  w.i(0); w.z(4); w.z(11);
  w.z(30); for (let i = 0; i < 10; i++) w.ibs('');
  w.ibs(''); w.i(90); w.b(0);
  w.b(o.key || 0); w.i(0);
  for (let i = 0; i < 64; i++) { w.i(0); w.z(8); }
  w.z(42);
  const nM = o.tracks[0].bars.length;
  w.i(nM); w.i(o.tracks.length);
  for (let mi = 0; mi < nM; mi++) { if (mi === 0) { w.b(0x03); w.b(4); w.b(4); w.z(4); w.z(1); w.b(0); } else { w.z(1); w.b(0); w.z(1); w.b(0); } }
  o.tracks.forEach((t, ti) => {
    if (ti === 0) w.z(1);
    w.b(t.drum ? 1 : 0);
    w.bss(t.name || ('T' + ti), 40); w.i(6);
    const tun = t.tuning || [64, 59, 55, 50, 45, 40]; for (let i = 0; i < 7; i++) w.i(tun[i] || 0);
    w.i(1); w.i(t.drum ? 10 : ti + 1); w.i(ti + 2); w.i(24); w.i(t.capo || 0); w.i(0);
    w.z(29); w.i(0); w.i(0); w.i(0); w.i(0); w.z(4); w.ibs(''); w.ibs('');
  });
  w.z(1);
  for (let mi = 0; mi < nM; mi++) o.tracks.forEach(t => {
    const beats = t.bars[mi]; w.i(beats.length);
    beats.forEach(bt => {
      w.b(bt.chord ? 0x02 : 0); w.b(bt.d === 8 ? 1 : bt.d === 2 ? -1 : bt.d === 1 ? -2 : 0);
      if (bt.chord) { w.z(17); w.bss(bt.chord, 21); w.z(4); w.i(0); w.z(28); w.z(32); }
      let sf = 0; bt.n.forEach(([s]) => { sf |= 1 << (7 - s); }); w.b(sf);
      bt.n.slice().sort((a, c) => a[0] - c[0]).forEach(([, f]) => { w.b(0x20); w.b(1); w.b(f); w.z(1); });
      w.sh(0);
    });
    w.i(0); w.b(0);
  });
  return Buffer.from(w.arr);
}
const SH = {   // 和弦指法（[弦,品]，弦 1=高音 e）
  A: [[5, 0], [4, 2], [3, 2], [2, 2], [1, 0]], E: [[6, 0], [5, 2], [4, 2], [3, 1], [2, 0], [1, 0]],
  'F#m': [[6, 2], [5, 4], [4, 4], [3, 2], [2, 2], [1, 2]], D: [[4, 0], [3, 2], [2, 3], [1, 2]],
  Dm: [[4, 0], [3, 2], [2, 3], [1, 1]], Gm: [[6, 3], [5, 5], [4, 5], [3, 3], [2, 3], [1, 3]],
  G: [[6, 3], [5, 2], [4, 0], [3, 0], [2, 0], [1, 3]], Em: [[6, 0], [5, 2], [4, 2], [3, 0], [2, 0], [1, 0]],
  C: [[5, 3], [4, 2], [3, 0], [2, 1], [1, 0]] };
/* 分解八分：低音弦起、上行再回落；末小节整小节柱式和弦 */
const arp = (nm, chord) => { const ns = SH[nm].slice().sort((a, b) => b[0] - a[0]);
  const ord = ns.length >= 5 ? [0, 1, 2, 3, 4, 3, 2, 1] : [0, 1, 2, 3, 2, 1, 0, 1];
  return ord.map((k, i) => ({ d: 8, n: [ns[k]], ...(chord && i === 0 ? { chord: nm } : {}) })); };
const strum = nm => [{ d: 1, n: SH[nm] }];
const prog = (names, chords) => [...names, ...names].map(n => arp(n, chords)).concat([strum(names[0])]);

/* ---------- 夹具：GPIF（GP7 .gp = zip）---------- */
function crc32(u8) { const tb = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; tb[n] = c >>> 0; }
  let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = tb[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function makeZip(entries) {
  const chunks = [], central = []; let off = 0;
  for (const e of entries) {
    const raw = Buffer.from(e.data), comp = zlib.deflateRawSync(raw), crc = crc32(raw), name = Buffer.from(e.name);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(name.length, 26);
    chunks.push(lh, name, comp);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42);
    central.push(ch, name); off += lh.length + name.length + comp.length;
  }
  const cd = Buffer.concat(central), eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(off, 16);
  return Buffer.concat([...chunks, cd, eocd]);
}
function gpif(bars) {   // bars:[[{d:8|1, n:[[弦,品]]}]] 单轨标准定弦
  let mb = '', br = '', vc = '', bt = '', nt = ''; let bId = 0, nId = 0;
  bars.forEach((beats, mi) => {
    mb += `<MasterBar>${mi === 0 ? '<Key><AccidentalCount>0</AccidentalCount><Mode>Major</Mode></Key><Time>4/4</Time>' : ''}<Bars>${mi}</Bars></MasterBar>`;
    br += `<Bar id="${mi}"><Voices>${mi} -1 -1 -1</Voices></Bar>`;
    const ids = [];
    beats.forEach(b => { const nids = b.n.map(([s, f]) => { nt += `<Note id="${nId}"><Properties><Property name="String"><String>${6 - s}</String></Property><Property name="Fret"><Fret>${f}</Fret></Property></Properties></Note>`; return nId++; });
      bt += `<Beat id="${bId}"><Rhythm ref="${b.d === 1 ? 'w' : 'e'}"/><Notes>${nids.join(' ')}</Notes></Beat>`; ids.push(bId++); });
    vc += `<Voice id="${mi}"><Beats>${ids.join(' ')}</Beats></Voice>`;
  });
  return `<?xml version="1.0" encoding="utf-8"?><GPIF><Score><Title>GPIF调测试</Title></Score>
 <Tracks><Track id="0"><Name>吉他</Name><Staves><Staff><Properties><Property name="Tuning"><Pitches>40 45 50 55 59 64</Pitches></Property></Properties></Staff></Staves></Track></Tracks>
 <MasterBars>${mb}</MasterBars><Bars>${br}</Bars><Voices>${vc}</Voices><Beats>${bt}</Beats>
 <Rhythms><Rhythm id="e"><NoteValue>Eighth</NoteValue></Rhythm><Rhythm id="w"><NoteValue>Whole</NoteValue></Rhythm></Rhythms><Notes>${nt}</Notes></GPIF>`;
}
/* ---------- 夹具：SMF（format0 单轨，同 tv_midi）---------- */
function vlq(n) { const s = [n & 0x7f]; n >>= 7; while (n) { s.push((n & 0x7f) | 0x80); n >>= 7; } return s.reverse(); }
function smf({ tpq = 480, key = null, notes = [] }) {
  const evs = []; let t = 0;
  notes.forEach(([m, q]) => { const d = Math.round(q * tpq); evs.push([t, 0x90, m, 80], [t + d, 0x80, m, 0]); t += d; });
  evs.sort((a, b) => a[0] - b[0] || (a[1] === 0x80 ? -1 : 1));
  const tk = [0, 0xFF, 0x51, 3, 7, 0xA1, 0x20, 0, 0xFF, 0x58, 4, 4, 2, 24, 8];
  if (key != null) tk.push(0, 0xFF, 0x59, 2, key & 255, 0);
  let last = 0; evs.forEach(([tick, st, d1, d2]) => { tk.push(...vlq(tick - last), st, d1, d2); last = tick; });
  tk.push(0, 0xFF, 0x2F, 0);
  const trk = [0x4D, 0x54, 0x72, 0x6B, (tk.length >> 24) & 255, (tk.length >> 16) & 255, (tk.length >> 8) & 255, tk.length & 255, ...tk];
  return Buffer.from([0x4D, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, (tpq >> 8) & 255, tpq & 255, ...trk]);
}
/* ♭E 大调旋律（含 ♭A、D 区分 ♭B / ♭A 大调），收在主音 */
const EB_MEL = [[63, 1], [67, 1], [70, 1], [67, 1], [68, 1], [65, 1], [62, 1], [65, 1], [67, 1], [63, 1], [70, 1], [68, 1], [67, 1], [65, 1], [63, 2],
  [70, 1], [72, 1], [70, 1], [68, 1], [67, 1], [68, 1], [70, 2], [72, 1], [74, 1], [75, 1], [70, 1], [68, 1], [65, 1], [62, 1], [63, 1], [63, 4]];
const D_MEL = [[62, 1], [66, 1], [69, 1], [66, 1], [67, 1], [64, 1], [61, 1], [64, 1], [66, 1], [62, 1], [69, 1], [67, 1], [66, 1], [64, 1], [62, 2],
  [69, 1], [71, 1], [69, 1], [67, 1], [66, 1], [67, 1], [69, 2], [71, 1], [73, 1], [74, 1], [69, 1], [67, 1], [64, 1], [61, 1], [62, 1], [62, 4]];
/* ---------- 夹具：MusicXML ---------- */
const STEP = { 0: ['C', 0], 1: ['C', 1], 2: ['D', 0], 3: ['E', -1], 4: ['E', 0], 5: ['F', 0], 6: ['F', 1], 7: ['G', 0], 8: ['A', -1], 9: ['A', 0], 10: ['B', -1], 11: ['B', 0] };
function mxml(keyXml, mel) {
  const per = []; let cur = [], fill = 0;
  mel.forEach(([m, q]) => { const [st, al] = STEP[m % 12];
    cur.push(`<note><pitch><step>${st}</step>${al ? `<alter>${al}</alter>` : ''}<octave>${Math.floor(m / 12) - 1}</octave></pitch><duration>${q}</duration><type>${q === 4 ? 'whole' : q === 2 ? 'half' : 'quarter'}</type></note>`);
    fill += q; if (fill >= 4) { per.push(cur.join('')); cur = []; fill = 0; } });
  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><work><work-title>调号测试</work-title></work>
<part-list><score-part id="P1"><part-name>旋律</part-name></score-part></part-list><part id="P1">`
    + per.map((b, i) => `<measure number="${i + 1}">${i === 0 ? `<attributes><divisions>1</divisions>${keyXml}<time><beats>4</beats><beat-type>4</beat-type></time></attributes>` : ''}${b}</measure>`).join('')
    + '</part></score-partwise>';
}
const CMIN_MEL = [[60, 1], [63, 1], [67, 1], [63, 1], [65, 1], [62, 1], [59, 1], [62, 1], [63, 1], [60, 1], [67, 1], [65, 1], [63, 1], [62, 1], [60, 2]];

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
    window.__toasts = []; const o = window.toast; window.toast = (m, x) => { window.__toasts.push(String(m)); return o(m, x); }; });
  const EV = js => pg.evaluate(js).catch(e => ({ err: e.message }));
  const b64 = buf => buf.toString('base64');
  /* 页面内共用探针：谱面页头 1=X、简谱联排行文本、逐音绝对音高、TAB 品位、播放事件、MIDI 导出逐音、MusicXML 往返音高 */
  await pg.evaluate(() => {
    window.__P = {
      head: () => { const t = [...document.querySelectorAll('#score text')].map(x => x.textContent).find(x => /^1=/.test(x)); return t || null; },
      jp: vi => [...document.querySelectorAll('#score g[data-tabjp="' + (vi || 0) + '"] text')].map(t => t.textContent).join(' '),
      vox: s => { const o0 = song; song = s; try { const r = []; s.measures.forEach((m, mi) => (m.voxes || []).forEach((cols, vi) => (cols || []).forEach(c => {
        if (!c.deg) return; r.push(vi + ':' + voxMidi(c, mi)); (c.adds || []).forEach(a => { if (a && a.deg) r.push(vi + '+' + voxMidi(a, mi)); });
        ['grace', 'graceA'].forEach(k => { if (c[k]) normGrace(c[k]).notes.forEach(g => r.push(vi + 'g' + (keyRefAt(mi) + DEG_SEMI[g.deg] + accSemi(g.acc) + (g.oct || 0) * 12 + voxCapo()))); }); }))); return r; } finally { song = o0; } },
      tabs: s => JSON.stringify(s.measures.map(m => (m.tabs || []).map(cols => (cols || []).map(c => (c.notes || []).map(n => n.s + '/' + n.f + (n.x ? 'x' : '')))))),
      chords: s => JSON.stringify(s.measures.map(m => [...(m.tabs || []), ...(m.voxes || [])].map(cols => (cols || []).map(c => c.chord || '')))),
      /* 播放事件：按起音时刻归组（5ms 内算同一时刻——两次 play() 的时间原点浮点误差约 1ms），组内音高升序 */
      play: () => { const ev = []; const o = playInst;
        playInst = (k, c, bus, f, when) => { if (f > 0) ev.push([when * 1000, Math.round(69 + 12 * Math.log2(f / 440))]); };
        try { play(); } finally { stopPlay(); playInst = o; }
        ev.sort((a, c) => a[0] - c[0]); const t0 = ev.length ? ev[0][0] : 0, g = [];
        ev.forEach(([t, m]) => { const L = g[g.length - 1]; if (L && t - t0 - L.t < 5) L.m.push(m); else g.push({ t: t - t0, m: [m] }); });
        return g.map(x => ({ t: x.t, m: x.m.sort((a, c) => a - c).join(',') })); },
      samePlay: (a, c) => a.length === c.length && a.every((x, i) => x.m === c[i].m && Math.abs(x.t - c[i].t) < 5),
      midi: s => { const r = parseSMF(exportMIDI(s).bytes); return r.tracks.map(t => t.notes.map(n => n.midi + '@' + n.start + '+' + n.dur).join(',')); },
      mxl: s => { const r = importMusicXML(exportMusicXML(s)); return r.song ? __P.vox(r.song) : ['ERR']; },
    };
  });

  /* ===== T1 内置预设 ===== */
  {
    const r = await EV(`(()=>{
      const rows=[]; let ok0=0, okAll=0, n=0;
      PRESETS.forEach((P,pi)=>{ [0,2,7,-3].forEach(d=>{
        loadSong(P.make()); if(d) transposeSong(song, d);
        const det=detectKey(songKeyEvents(song)), want=headKeyOf(song); n++;
        const ok=det.key===want; if(ok){ okAll++; if(!d) ok0++; }
        if(!ok || !d) rows.push((ok?'':'✗')+pi+(d?'('+(d>0?'+':'')+d+')':'')+':'+want+'→'+det.key+'/'+det.tonic+(det.mode==='minor'?'m':'')+' '+det.conf.toFixed(2));
      }); });
      return {ok0, okAll, n, nP:PRESETS.length, rows:rows.filter(x=>x[0]==='✗'||/^\\d+:/.test(x)).join(' ')};
    })()`);
    T(r.nP === 16 && r.ok0 >= 15 && r.okAll >= r.n - 3, 'T1 16 个预设调识别 ' + r.ok0 + '/16（移到 +2/+7/−3 后合计 ' + r.okAll + '/' + r.n + '）', r.rows || JSON.stringify(r));
  }

  /* GP 弹窗驱动：parseGP → showGPTrackModal → 读弹窗 → （可选改选）→ 导入 */
  const gpRun = async (buf, pre) => EV(`(()=>{
    window.__toasts.length=0;
    const u8=Uint8Array.from(atob('${b64(buf)}'), c=>c.charCodeAt(0));
    const r=parseGP(u8.buffer); if(r.error) return {err:r.error};
    showGPTrackModal(r.gp);
    const sel=document.getElementById('kc-key');
    const out={def: sel && sel.value, defTxt: sel && sel.options[sel.selectedIndex].textContent,
      opts: sel? [...sel.options].map(o=>o.value) : [], tip:(document.getElementById('kc-tip')||{}).textContent||''};
    ${pre || ''}
    document.getElementById('gp-go').click();
    return out; })()`);
  const after = () => EV(`(()=>{ render(); return {key:song.key, capo:song.capo||0, mode:song.mode||'', head:__P.head(), toast:window.__toasts.join(' | '), nTab:song.tabVoices.length}; })()`);

  /* ===== T2 GP5：文件 1=C、内容 A 大调 + 鼓轨满是 C ===== */
  const drumBars = prog(['A', 'E', 'F#m', 'D']).map(bar => bar.map(bt => ({ d: bt.d, n: [[1, 36], [2, 48]] })));
  const gpA = gp5({ key: 0, tracks: [{ name: '吉他', bars: prog(['A', 'E', 'F#m', 'D']) }, { name: '鼓', drum: true, tuning: [0, 0, 0, 0, 0, 0], bars: drumBars }] });
  {
    const m = await gpRun(gpA); await pg.waitForTimeout(500); const a = await after();
    T(!m.err && m.def === 'det' && /1=A · 检测（A 大调/.test(m.defTxt) && m.opts.includes('file') && m.opts.filter(v => /^k:/.test(v)).length === 12
      && a.key === 'A' && a.head === '1=A' && /按内容检测/.test(a.toast),
      'T2 GP5 文件调号 0 + A 大调内容（鼓轨不计票）→ 默认检测 1=A', JSON.stringify({ m, a }));
  }
  /* ===== T3 小调 → 关系大调 ===== */
  {
    const gpDm = gp5({ key: 0, tracks: [{ name: '吉他', bars: prog(['Dm', 'Gm', 'A', 'Dm']) }] });
    const m = await gpRun(gpDm); await pg.waitForTimeout(500); const a = await after();
    T(!m.err && /1=F · 检测（D 小调/.test(m.defTxt) && /以 6 为主音/.test(m.tip) && a.key === 'F' && a.mode === 'minor' && a.head === '1=F',
      'T3 d 小调内容 → 关系大调 1=F、注明 D 小调、mode=minor', JSON.stringify({ m, a }));
  }
  /* ===== T4 变调夹：G 指法夹 2 品 ===== */
  {
    const gpCapo = gp5({ key: 0, tracks: [{ name: '吉他', capo: 2, bars: prog(['G', 'D', 'Em', 'C']) }] });
    const m = await gpRun(gpCapo); await pg.waitForTimeout(500); const a = await after();
    T(!m.err && /1=A · 检测/.test(m.defTxt) && /变调夹 2 品 → 按 1=G 指法/.test(m.tip) && a.key === 'G' && a.capo === 2 && a.head === '1=A' && /按 1=G 指法/.test(a.toast),
      'T4 夹 2 品：实际调 1=A、指法调 song.key=G', JSON.stringify({ m, a }));
  }
  /* ===== T5 GPIF ===== */
  {
    const gpE = makeZip([{ name: 'VERSION', data: '7.0' }, { name: 'Content/score.gpif', data: gpif(prog(['E', 'A', 'E', 'A'].slice(0, 2).concat(['E', 'A']))) }]);
    const m = await gpRun(gpE); await pg.waitForTimeout(500); const a = await after();
    T(!m.err && m.def === 'det' && /1=E · 检测/.test(m.defTxt) && a.key === 'E', 'T5 GP7（GPIF）AccidentalCount=0 + E 大调内容 → 1=E', JSON.stringify({ m, a }));
  }
  /* ===== T6 固定调 / 改选其他调 ===== */
  {
    const m = await gpRun(gpA, `document.querySelector('input[name="kc-nota"][value="fixed"]').checked=true;`);
    await pg.waitForTimeout(500);
    const a = await EV(`(()=>{ mutate(()=>{ song.tabJp=true; }); return {key:song.key, head:__P.head(), jp:__P.jp(0), toast:window.__toasts.join(' | ')}; })()`);
    const m2 = await gpRun(gpA, `document.getElementById('kc-key').value='k:E';`);
    await pg.waitForTimeout(500);
    const a2 = await EV(`(()=>{ mutate(()=>{ song.tabJp=true; }); return {key:song.key, head:__P.head(), jp:__P.jp(0)}; })()`);
    /* A 大调分解首小节 A2 E3 A3 ♯C4 E4…：固定调读 6 3 6 ♯1 3；改选 1=E 读 4 1 4 6 1 */
    T(a.key === 'C' && a.head === '1=C' && /♯/.test(a.jp) && /^6 3 6 1 ♯ 3/.test(a.jp) && /固定调/.test(a.toast)
      && a2.key === 'E' && a2.head === '1=E' && /^4 1 4 6 1/.test(a2.jp),
      'T6 导入选「固定调」→ 1=C 且联排行 ♯1/♯4/♯5；改选 1=E 生效', JSON.stringify({ a, a2 }));
  }

  /* ===== T7 改记谱调：音高 / 品位 / 播放 / MIDI / MusicXML 前后一致，可撤销 ===== */
  {
    const r = await EV(`(()=>{
      const cases=[
        {nm:'小步舞曲→固定调', mk:()=>PRESETS[12].make(), to:'C', fixed:true},
        {nm:'小步舞曲→♭E', mk:()=>PRESETS[12].make(), to:'Eb'},
        {nm:'功能谱→G', mk:()=>PRESETS[15].make(), to:'G'},
        {nm:'弹唱夹2→固定调', mk:()=>{ const s=PRESETS[1].make(); s.capo=2; return s; }, to:'C', fixed:true},
        {nm:'弹唱夹2→♯F', mk:()=>{ const s=PRESETS[1].make(); s.capo=2; return s; }, to:'F#'},
        {nm:'中途转调→A', mk:()=>{ const s=PRESETS[10].make(); s.measures[8].keyTo='D'; return s; }, to:'A'},
        {nm:'中途转调→D', mk:()=>{ const s=PRESETS[10].make(); s.measures[8].keyTo='D'; return s; }, to:'D'},
      ];
      return cases.map(cs=>{
        loadSong(cs.mk()); render();
        const h0=__P.head(), v0=__P.vox(song), t0=__P.tabs(song), c0=__P.chords(song), p0=__P.play(), mi0=__P.midi(song), x0=__P.mxl(song);
        const before=JSON.stringify(song);   // play() 会补写 song.mixer，快照取在测量之后
        const deg0=(song.measures.find(m=>(m.voxes[0]||[]).some(c=>c.chord))||{voxes:[[]]}).voxes[0].map(c=>c.chord? chordDegree(c.chord):'').filter(Boolean).join(',');
        const kt0=song.measures.map(m=>m.keyTo||'').join('');
        let st=null; mutate(()=>{ st=respellSongKey(song, cs.to, {fixed:!!cs.fixed}); });
        const h1=__P.head(), v1=__P.vox(song), t1=__P.tabs(song), c1=__P.chords(song), p1=__P.play(), mi1=__P.midi(song), x1=__P.mxl(song);
        const deg1=(song.measures.find(m=>(m.voxes[0]||[]).some(c=>c.chord))||{voxes:[[]]}).voxes[0].map(c=>c.chord? chordDegree(c.chord):'').filter(Boolean).join(',');
        const kt1=song.measures.map(m=>m.keyTo||'').join('');
        const res={nm:cs.nm, h0, h1, key:song.key, capo:song.capo||0, n:st&&st.notes, nVox:v0.length, nPlay:p0.length,
          vox:JSON.stringify(v0)===JSON.stringify(v1), tab:t0===t1, chord:c0===c1, play:__P.samePlay(p0,p1),
          midi:JSON.stringify(mi0)===JSON.stringify(mi1), mxl:JSON.stringify(x0)===JSON.stringify(x1), deg0, deg1, kt0, kt1, graceAcc:st&&st.graceAcc};
        undo(); res.undo=JSON.stringify(song)===before;
        return res; });
    })()`);
    const ok = Array.isArray(r) && r.every(x => x.vox && x.tab && x.chord && x.play && x.midi && x.mxl && x.undo && x.nPlay > 0 && (x.h0 === null || x.h0 !== x.h1))
      && r[0].key === 'C' && r[1].key === 'Eb' && r[0].h0 === null   /* 纯五线谱页头不写 1=X（调号即调性），看 song.key */
      && r[2].h1 === '1=G' && r[2].deg0 !== r[2].deg1
      && r[3].h0 === '1=D' && r[3].h1 === '1=C' && r[3].key === 'Bb' && r[3].capo === 2
      && r[4].h1 === '1=♯F' && r[4].key === 'E'
      && r[5].kt0 === 'D' && r[5].kt1 === 'D' && r[6].kt1 === '';
    T(ok, 'T7 改记谱调 7 例：vox 音高 / TAB 品位 / 和弦名 / 播放 / MIDI / MusicXML 前后一致、页头变、级数重算、keyTo 绝对、一步撤销',
      Array.isArray(r) ? r.map(x => x.nm + '[' + x.h0 + '→' + x.h1 + ' key=' + x.key + ' n=' + x.n + ' vox=' + x.vox + ' tab=' + x.tab + ' ch=' + x.chord + ' play=' + x.play + '(' + x.nPlay + ') midi=' + x.midi + ' mxl=' + x.mxl + ' undo=' + x.undo + (x.deg0 ? ' 级数 ' + x.deg0 + '→' + x.deg1 : '') + (x.kt0 ? ' keyTo ' + x.kt0 + '→' + (x.kt1 || '无') : '') + ']').join(' ') : JSON.stringify(r));
  }

  /* ===== T8 编辑器弹窗 UI ===== */
  {
    const r = await EV(`(()=>{
      loadSong(PRESETS[1].make()); render();
      const before=JSON.stringify(song);
      openEdKeyPop();
      const tg=document.getElementById('ek-resp-tg'), box=document.getElementById('ek-resp');
      const hidden0=box.hidden; tg.click();
      const chips=[...box.querySelectorAll('[data-ekresp]')];
      const cur=box.querySelector('.kp-chip.on'), curTxt=cur && cur.textContent;
      const vis=getComputedStyle(box).display!=='none';
      box.querySelector('[data-ekresp="D"]').click();
      const k1=song.key, h1=__P.head(), on1=(box.querySelector('.kp-chip.on')||{}).dataset;
      const toast1=window.__toasts[window.__toasts.length-1]||'';
      undo();
      const back=JSON.stringify(song)===before;
      document.body.click();
      return {hidden0, vis, n:chips.length, curTxt, k1, h1, on1:on1&&on1.ekresp, toast1, back, closed:!document.getElementById('ekey-pop').classList.contains('on')};
    })()`);
    T(r.hidden0 === true && r.vis && r.n === 13 && /^C当前/.test(r.curTxt || '') && r.k1 === 'D' && r.h1 === '1=D' && r.on1 === 'D'
      && /音高不变/.test(r.toast1) && r.back,
      'T8 变调弹窗「改记谱调（音不变）」：13 个速选、当前调标注、点选即改、撤销还原', JSON.stringify(r));
  }

  /* ===== T9 MIDI ===== */
  {
    const run = (buf, typ) => EV(`(()=>{
      window.__toasts.length=0;
      const u8=Uint8Array.from(atob('${'B64'}'.replace('B64','')+'${b64(buf)}'), c=>c.charCodeAt(0));
      showMidiImport(parseSMF(u8));
      const sel=document.getElementById('kc-key'), head=document.querySelector('.modal p').textContent;
      const out={def:sel.value, defTxt:sel.options[sel.selectedIndex].textContent, head};
      ${typ ? `document.getElementById('mi-type').value='${typ}'; document.getElementById('mi-type').onchange();` : ''}
      document.getElementById('mi-go').click();
      return out; })()`);
    const m1 = await run(smf({ notes: EB_MEL })); await pg.waitForTimeout(400);
    const a1 = await EV(`(()=>{ render(); const v=song.measures[0].voxes[0]; return {key:song.key, head:__P.head(), first:v[0].deg+v[0].acc, degs:v.map(c=>c.deg+c.acc).join(' '), toast:window.__toasts.join('|')}; })()`);
    const m2 = await run(smf({ notes: EB_MEL, key: 0 })); await pg.waitForTimeout(400);
    const a2 = await EV(`(()=>({key:song.key}))()`);
    const m3 = await run(smf({ notes: D_MEL, key: 2 })); await pg.waitForTimeout(400);
    const a3 = await EV(`(()=>({key:song.key, first:song.measures[0].voxes[0][0].deg}))()`);
    T(m1.def === 'det' && /1=♭E · 检测/.test(m1.defTxt) && /未含调号/.test(m1.head) && a1.key === 'Eb' && a1.head === '1=♭E' && a1.first === '1' && a1.degs === '1 3 5 3'
      && m2.def === 'det' && /与内容不符/.test(m2.head) && a2.key === 'Eb'
      && m3.def === 'file' && a3.key === 'D' && a3.first === 1,
      'T9 MIDI：无调号检测 ♭E（唱名 1 3 5 3）/ 调号 0 与内容不符仍取检测 / 调号可信取文件', JSON.stringify({ m1, a1, m2, a2, m3, a3 }));
  }

  /* ===== T10 MusicXML ===== */
  {
    const run = async (xml) => { await pg.evaluate(() => { window.__toasts.length = 0; showNewWizard(); }); await pg.waitForTimeout(100);
      await pg.setInputFiles('#nw-mxlfile', { name: 't.musicxml', mimeType: 'application/xml', buffer: Buffer.from(xml) }); await pg.waitForTimeout(500);
      return EV(`(()=>{ render(); const v=song.measures[0].voxes[0]; return {key:song.key, mode:song.mode||'', head:__P.head(), degs:v.map(c=>c.deg+c.acc).join(' '), toast:window.__toasts.join('|')}; })()`); };
    const a1 = await run(mxml('<key><fifths>-3</fifths><mode>minor</mode></key>', CMIN_MEL));
    const a2 = await run(mxml('', D_MEL));
    const a3 = await run(mxml('<key><fifths>0</fifths></key>', D_MEL));
    T(a1.key === 'Eb' && a1.mode === 'minor' && a1.degs === '6 1 3 1' && /调号按文件 1=♭E（小调/.test(a1.toast)
      && a2.key === 'D' && a2.degs === '1 3 5 3' && /按内容检测为 1=D/.test(a2.toast)
      && a3.key === 'C' && /调号按文件 1=C/.test(a3.toast),
      'T10 MusicXML：fifths+minor 以文件为准（1=♭E、6 为主音）/ 缺 key 检测为 1=D 并重拼 / fifths=0 仍以文件为准', JSON.stringify({ a1, a2, a3 }));
  }

  /* ===== T11 倚音 ===== */
  {
    const r = await EV(`(()=>{
      loadSong(createSong('vocal',{beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0}));
      const V=o=>Object.assign({dur:4,dotted:false,deg:0,acc:'',oct:0,lyrics:[],tie:false},o);
      song.measures[0].voxes[0]=[V({deg:1,oct:1,grace:{notes:[{deg:2,oct:1}],dur:8}}), V({}), V({}), V({})];
      render(); const p=[].concat(...__P.play().map(x=>x.m.split(',').map(Number))).sort((a,c)=>a-c);
      const graceUp = p.length===2? p[1]-p[0] : null;   // 倚音 D5 − 主音 C5 = +2（旧口径倚音落 D6：+14）
      /* G 大调：前倚音 7（♯F5）挂在 1̇（G5）上 → 改固定调后倚音写 ♯4、播放音高不变；简谱倚音画 ♯ */
      loadSong(createSong('vocal',{beats:4,unit:4,key:'G',nMea:1,nVox:1,lyr:0}));
      song.measures[0].voxes[0]=[V({deg:1,oct:0,grace:{notes:[{deg:7,oct:-1}],dur:16}}), V({deg:3}), V({deg:5,graceA:{notes:[{deg:6,oct:0}],dur:16}}), V({deg:1})];
      render(); const p0=__P.play();
      let st=null; mutate(()=>{ st=respellSongKey(song,'C',{fixed:true}); });
      const p1=__P.play();
      const gAcc=[]; song.measures.forEach(m=>(m.voxes[0]||[]).forEach(c=>['grace','graceA'].forEach(k=>{ if(c[k]) normGrace(c[k]).notes.forEach(g=>gAcc.push(g.deg+(g.acc||''))); })));
      render();
      const sharpTiny=[...document.querySelectorAll('#score text')].filter(t=>t.getAttribute('font-size')==='6.5' && t.textContent==='♯').length;
      const mx=exportMusicXML(song), gx=mx.indexOf('<grace slash="yes"/><pitch><step>F</step><alter>1</alter>')>=0;
      const back=importMusicXML(mx), gb=back.song? normGrace(back.song.measures[0].voxes[0][0].grace).notes.map(g=>g.deg+(g.acc||'')).join('') : '';
      return {graceUp, n:p.length, same:__P.samePlay(p0,p1), nP:p0.length, gAcc:gAcc.join(' '), sharpTiny, gx, gb, st};
    })()`);
    T(r.graceUp === 2 && r.same && r.nP >= 4, 'T11a 倚音播放用绝对八度（C5 的前倚音 D5 = +2）；G 大调带倚音的谱改固定调后播放音高序列不变', JSON.stringify(r));
    T(r.gAcc === '4# 3' && r.sharpTiny >= 1 && r.gx && r.gb === '4#', 'T11b 调外倚音写 acc（♯F → ♯4，E → 3）、简谱倚音画 ♯、MusicXML 倚音写 alter 并读回', JSON.stringify(r));
  }

  /* T11c 装饰音邻音：小步舞曲 G→♭E，颤音（G4，上邻音 A4）在 ♭E 调里是 3 的颤音、自然上邻音是 ♭A——写 ornAcc 保住 A4；
     五线谱在颤音记号上方画 ♮（调号有 ♭A），简谱画 ♯（♯4）；播放序列不变 */
  {
    const r = await EV(`(()=>{
      loadSong(PRESETS[12].make()); render(); const p0=__P.play();
      mutate(()=>{ respellSongKey(song,'Eb',{}); });
      const p1=__P.play(); const tr=[]; song.measures.forEach(m=>(m.voxes[0]||[]).forEach(c=>{ if(c.orn) tr.push(c.orn+':'+c.deg+(c.acc||'')+'/'+(c.ornAcc||'')); }));
      const st=[...document.querySelectorAll('#score [data-ornacc]')].map(t=>t.textContent).join('');
      song.voxNotations=[undefined]; render();
      const jp=[...document.querySelectorAll('#score [data-ornacc]')].map(t=>t.textContent).join('');
      return {same:__P.samePlay(p0,p1), tr:tr.join(' '), st, jp};
    })()`);
    T(r.same && /tr:3\/#/.test(r.tr) && /♮/.test(r.st) && /♯/.test(r.jp), 'T11c 装饰音邻音 ornAcc：颤音上邻音保持原音高（五线谱 ♮ / 简谱 ♯）', JSON.stringify(r));
  }

  /* T12 简谱联排行唱名按本谱定弦与本小节生效调：Drop D 六弦空弦 = D（此前按标准弦 E 算成 2）、
     尤克里里一弦空弦 = A4（此前按吉他一弦 E 算成 3）、中途「转1=G」之后按 G 读（此前一律按谱首调） */
  {
    const r = await EV(`(()=>{
      const C=o=>Object.assign({dur:4,dotted:false,chord:'',notes:[],strum:'',tech:''},o);
      loadSong(createSong('guitar',{beats:4,unit:4,key:'D',nMea:2,nTab:1,nVox:0,lyr:0}));
      song.tuning=[64,59,55,50,45,38]; song.tabJp=true;
      song.measures[0].tabs[0]=[C({notes:[{s:6,f:0}]}), C({notes:[{s:4,f:0}]}), C({notes:[{s:3,f:2}]}), C({notes:[{s:2,f:3}]})];
      song.measures[1].keyTo='G';
      song.measures[1].tabs[0]=[C({notes:[{s:3,f:0}]}), C({notes:[{s:2,f:0}]}), C({notes:[{s:4,f:0}]}), C({notes:[{s:3,f:0}]})];
      render(); const dd=__P.jp(0).split(' ').join('');
      loadSong(createSong('uku',{beats:4,unit:4,key:'C',nMea:1,nTab:1,nVox:0,lyr:0}));
      song.tabJp=true; song.measures[0].tabs[0]=[C({notes:[{s:1,f:0}]}), C({notes:[{s:2,f:0}]}), C({notes:[{s:3,f:0}]}), C({notes:[{s:4,f:0}]})];
      render(); const uk=__P.jp(0).split(' ').join('');
      return {dd, uk};
    })()`);
    /* Drop D（1=D）：D2 D3 A3 D4 → 1 1 5 1；转 1=G 后 G3 B3 D3 G3 → 1 3 5 1；尤克里里 A4 E4 C4 G4 → 6 3 1 5 */
    T(r.dd === '11511351' && r.uk === '6315', 'T12 简谱联排行按本谱定弦（Drop D / 尤克里里）与中途转调读唱名', JSON.stringify(r));
  }

  /* ===== T13 调识别对抗样例（页面内生成发声音事件） ===== */
  {
    const r = await EV(`(()=>{
      const NM=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'], QI={'':[0,4,7], m:[0,3,7], '7':[0,4,7,10]};
      const mk=(tonic, prog, o)=>{ o=o||{}; const notes=[], chords=[]; let t=0;
        prog.forEach(([off,q])=>{ const root=((tonic+off)%12+12)%12, iv=QI[q];
          if(o.names!==false) chords.push({name:NM[root]+q, d:4, t});
          const bass=40+((root-4+12)%12), ts=[bass, ...iv.map(x=>52+((root+x-4+24)%12)), 64+((root+iv[1]-4+24)%12)];
          if(o.arp) for(let e=0;e<8;e++) notes.push({m:ts[[0,1,2,3,2,1,4,1][e]%ts.length], d:0.5, t:t+e*0.5});
          else for(let b=0;b<4;b++){ notes.push({m:bass, d:1, t:t+b}); iv.forEach(x=>notes.push({m:52+((root+x-4+24)%12), d:1, t:t+b})); }
          t+=4; });
        return {notes, chords}; };
      const mel=(tonic, semis)=>{ let t=0; return {notes:semis.map(([x,d])=>{ const n={m:60+(tonic>6?-12:0)+tonic+x, d, t}; t+=d; return n; }), chords:[]}; };
      const SHANG=[[2,1],[4,1],[7,1],[4,1],[2,1],[0,1],[2,2],[7,1],[9,1],[7,1],[4,1],[2,1],[0,1],[-3,1],[2,2],[4,1],[2,1],[0,1],[2,1],[-3,1],[0,1],[2,3]];
      const ZHI=[[7,1],[9,1],[12,1],[9,1],[7,1],[4,1],[7,2],[2,1],[4,1],[7,1],[9,1],[7,1],[4,1],[2,1],[0,1],[2,1],[4,1],[7,3]];
      const JUE=[[4,1],[7,1],[9,1],[7,1],[4,1],[2,1],[4,2],[9,1],[12,1],[9,1],[7,1],[4,1],[2,1],[0,1],[2,1],[4,2],[7,1],[4,1],[2,1],[4,3]];
      const AXIS=[[0,''],[7,''],[9,'m'],[5,'']];
      const rows=[];
      const chk=(nm, ev, want)=>{ const d=detectKey(ev); rows.push({nm, want, got:d.key, ok:d.key===want}); };
      [['F',5],['G',7],['D',2],['Bb',10]].forEach(([k,tn])=>{ chk('商调式 1='+k, mel(tn,SHANG), k); chk('徵调式 1='+k, mel(tn,ZHI), k); chk('角调式 1='+k, mel(tn,JUE), k); });
      [['C',0],['G',7],['E',4],['Bb',10]].forEach(([k,tn])=>{
        const a=mk(tn, [...AXIS,...AXIS]), b=mk(tn+2, [...AXIS,...AXIS]); b.notes.forEach(n=>n.t+=32); b.chords.forEach(c=>c.t+=32);
        chk('转调 '+k+'→+2', {notes:[...a.notes,...b.notes], chords:[...a.chords,...b.chords]}, k);
        chk('分解无和弦名 '+k, mk(tn, [...AXIS,...AXIS], {arp:true, names:false}), k);
        chk('I-♭VI-♭VII-I '+k, mk(tn, [[0,''],[8,''],[10,''],[0,''],[0,''],[8,''],[10,''],[0,'']]), k);
      });
      return rows; })()`);
    const bad = Array.isArray(r) ? r.filter(x => !x.ok) : [r];
    T(Array.isArray(r) && r.length === 24 && !bad.length, 'T13 调识别对抗样例：五声商 / 徵 / 角调式 → 宫音、转调谱取开头调、分解无和弦名不落下属调、借用和弦取主和弦（' + (Array.isArray(r) ? r.length - bad.length : 0) + '/24）',
      bad.map(x => x.nm + ' 应 ' + x.want + ' 得 ' + x.got).join('；') || 'all ok');
  }

  /* ===== T14 降半音调弦 + 指法名 ===== */
  {
    const EbT = [63, 58, 54, 49, 44, 39];
    const g1 = gp5({ key: 0, tracks: [{ name: '吉他', tuning: EbT, bars: prog(['E', 'A', 'E', 'A'], true) }] });
    const m1 = await gpRun(g1); await pg.waitForTimeout(400);
    const a1 = await EV(`(()=>{ mutate(()=>{ song.tabJp=true; }); return {key:song.key, head:__P.head(), jp:__P.jp(0).split(' ').slice(0,8).join(' ')}; })()`);
    const g2 = gp5({ key: 0, tracks: [{ name: '吉他', tuning: EbT, capo: 2, bars: prog(['G', 'D', 'Em', 'C'], true) }] });
    const m2 = await gpRun(g2); await pg.waitForTimeout(400);
    const a2 = await EV(`(()=>{ mutate(()=>{ song.tabJp=true; }); return {key:song.key, capo:song.capo, head:__P.head(), jp:__P.jp(0).split(' ').slice(0,8).join(' ')}; })()`);
    /* E 形状分解（E2 B2 E3 G♯3 B3…）实际发 ♭E：1=♭E 读 1 5 1 3 5；G 形状夹 2 品实际 ♭A：读 1 3 5 1 3 */
    T(/1=♭E · 检测/.test(m1.defTxt) && a1.key === 'Eb' && a1.head === '1=♭E' && /^1 5 1 3 5/.test(a1.jp)
      && /1=♭A · 检测/.test(m2.defTxt) && a2.head === '1=♭A' && a2.capo === 2 && /^1 3 5 1 3/.test(a2.jp),
      'T14 降半音调弦：E 形状和弦名按实际音计票 → 1=♭E、联排行 1 5 1 3 5；再夹 2 品的 G 形状 → 1=♭A', JSON.stringify({ m1: m1.defTxt, a1, m2: m2.defTxt, a2 }));
  }

  /* ===== T15 改记谱调的拼写 ===== */
  {
    const r = await EV(`(()=>{
      const V=o=>Object.assign({dur:4,dotted:false,deg:0,acc:'',oct:0,lyrics:[],tie:false},o);
      const sp=s=>s.measures.map(m=>(m.voxes[0]||[]).map(c=>c.deg? (c.acc==='#'?'♯':c.acc==='b'?'♭':c.acc==='x'?'×':c.acc==='bb'?'♭♭':'')+c.deg+(c.oct>0?"'":c.oct<0?',':'') : '').join(' ')).join(' | ');
      const pitches=s=>{ const o0=song; song=s; try{ const r=[]; s.measures.forEach((m,mi)=>(m.voxes[0]||[]).forEach(c=>{ if(c.deg) r.push(voxMidi(c,mi)); })); return r.join(','); } finally{ song=o0; } };
      /* ① 1=C：3 ♭3 6 ♭6 → 1=E：E=1、♭3(E♭)=D♯=7̣、A=4、♭6(A♭)=G♯=3 都是调内音（不写 ♭1 / ♭4） */
      loadSong(createSong('vocal',{beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0}));
      song.measures[0].voxes[0]=[V({deg:3}), V({deg:3,acc:'b'}), V({deg:6}), V({deg:6,acc:'b'})];
      const p0=pitches(song); respellSongKey(song,'E',{}); const s1=sp(song), p1=pitches(song);
      /* ② 1=C 的 1 5 3 1̇ 改到 1=♯C：C=7̣（♯B）、G=♭5（还原 G，不写 ♯4＝重升 F）、E=♭3（还原 E，不写 ♯2＝重升 D）、1̇=7 */
      loadSong(createSong('vocal',{beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0}));
      song.measures[0].voxes[0]=[V({deg:1}), V({deg:5}), V({deg:3}), V({deg:1,oct:1})];
      respellSongKey(song,'C#',{}); const s2=sp(song);
      /* ③ 半音阶 12 音 × 12 个起调 × 12 个目标调：无重升重降、音高不变、往返复原 */
      let dbl=0, pit=0, rt=0, n=0;
      KEY_LIST.forEach(k0=>{ KEY_LIST.forEach(k1=>{ if(k0===k1) return; n++;
        loadSong(createSong('vocal',{beats:4,unit:4,key:k0,nMea:3,nVox:1,lyr:0}));
        const ch=[[1,''],[1,'#'],[2,''],[3,'b'],[3,''],[4,''],[4,'#'],[5,''],[6,'b'],[6,''],[7,'b'],[7,'']];
        song.measures.forEach((m,mi)=>{ m.voxes[0]=ch.slice(mi*4, mi*4+4).map(([d,a])=>V({deg:d,acc:a})); });
        const q0=pitches(song);
        respellSongKey(song,k1,{}); const sA=sp(song);
        if(song.measures.some(m=>m.voxes[0].some(c=>c.acc==='x'||c.acc==='bb'))) dbl++;
        /* 五线谱上的实际升降也不许成重升 / 重降：该级调号升降 + acc */
        const L0='CDEFGAB'.indexOf(k1[0]);
        song.measures.forEach(m=>m.voxes[0].forEach(c=>{ const nat=[0,2,4,5,7,9,11][(L0+c.deg-1)%7], kp=(KEY_PC[k1]+DEG_SEMI[c.deg])%12; let ka=((kp-nat)%12+12)%12; if(ka>6) ka-=12; if(Math.abs(ka+accSemi(c.acc))>1) dbl++; }));
        if(pitches(song)!==q0) pit++;
        respellSongKey(song,k0,{}); respellSongKey(song,k1,{}); if(sp(song)!==sA || pitches(song)!==q0) rt++;   // 往返一趟拼写不漂移（原谱本身的 ♯C 大调 ♯1＝重升 F 这类非常规写法会被规范掉，故比第一次落到 k1 的拼写）
      }); });
      return {s1, same1:p0===p1, s2, dbl, pit, rt, n};
    })()`);
    T(r.s1 === '1 7, 4 3' && r.same1 && r.s2 === '7, ♭5 ♭3 7' && r.dbl === 0 && r.pit === 0 && r.rt === 0 && r.n === 132,
      'T15 改记谱调拼写：调内音写调内唱名（♭3 / ♭6 → 1=E 的 7̣ / 3）、♯C 大调还原 G 写 ♭5、132 组互改无重升重降 / 音高不变 / 往返不漂移', JSON.stringify(r));
  }

  /* ===== T16 变调弹窗：改记谱调不显示 (+n) ===== */
  {
    const r = await EV(`(()=>{
      loadSong(PRESETS[1].make()); render();
      openEdKeyPop();
      const v=()=>document.getElementById('ek-v').textContent;
      const v0=v();
      edRespell('D'); const v1=v(), k1=song.key;
      undo(); updateEdKeyPop(); const v2=v(), k2=song.key;
      edRespell('D'); edTranspose(1); const v3=v(), k3=song.key;
      document.body.click();
      return {v0, v1, k1, v2, k2, v3, k3};
    })()`);
    T(r.v0 === '唱 C' && r.v1 === '唱 D' && r.k1 === 'D' && r.v2 === '唱 C' && r.k2 === 'C' && r.v3 === '唱 Eb (+1)' && r.k3 === 'Eb',
      'T16 变调弹窗：改记谱调后「唱 D」不带 (+2)、撤销后不带 (−2)、再升半音显示 (+1)', JSON.stringify(r));
  }

  /* ===== T17 简谱联排行：逐轨夹位 ===== */
  {
    const r = await EV(`(()=>{
      const C=o=>Object.assign({dur:4,dotted:false,chord:'',notes:[],strum:'',tech:''},o);
      loadSong(createSong('guitar',{beats:4,unit:4,key:'G',nMea:1,nTab:2,nVox:0,lyr:0}));
      song.capo=2; song.tabCapos=[2,0]; song.tabJp=true;
      /* 两条轨同一组发声音 A3 C♯4 E4 A4：参考轨夹 2 品按 G 形状（G3 B3 D4 G4，实际 +2），第二轨不夹 */
      song.measures[0].tabs[0]=[C({notes:[{s:3,f:0}]}), C({notes:[{s:2,f:0}]}), C({notes:[{s:2,f:3}]}), C({notes:[{s:1,f:3}]})];
      song.measures[0].tabs[1]=[C({notes:[{s:3,f:2}]}), C({notes:[{s:2,f:2}]}), C({notes:[{s:1,f:0}]}), C({notes:[{s:1,f:5}]})];
      render();
      return {a:__P.jp(0), b:__P.jp(1), head:__P.head()};
    })()`);
    /* 1=A（G 指法夹 2）：A3 C♯4 E4 A4 → 1 3 5 1；第一轨 G B D G 夹 2 = A C♯ E A；第二轨 A C♯ E A 不夹 */
    T(r.a.replace(/\s/g, '') === '1351' && r.b.replace(/\s/g, '') === '1351', 'T17 简谱联排行：逐轨夹位按夹位差折算，同一发声音两条轨读同一唱名', JSON.stringify(r));
  }

  /* ===== T18 新输入倚音默认最近八度 ===== */
  {
    const r = await EV(`(()=>{
      loadSong(createSong('vocal',{beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0}));
      const V=o=>Object.assign({dur:4,dotted:false,deg:0,acc:'',oct:0,lyrics:[],tie:false},o);
      song.measures[0].voxes[0]=[V({deg:1,oct:1}), V({deg:1}), V({deg:5,oct:-1}), V({})];
      render();
      const oAsk=window.askText; window.askText=(p,d,cb)=>cb(window.__ans);
      const res=[];
      [[0,'2'],[1,'7'],[2,'6']].forEach(([ci,ans])=>{ sel.row='vox'; sel.vi=0; sel.mi=0; sel.ci=ci; lastEnt=null; window.__ans=ans; ornFromBar('grace');
        const g=normGrace(song.measures[0].voxes[0][ci].grace); res.push(g.notes.map(n=>n.deg+'o'+n.oct).join(',')); });
      window.askText=oAsk;
      /* 播放：1̇ 前倚音 2̇ = D5（C5 +2） */
      const ev=[]; const o=playInst; playInst=(k,c,bus,f,when)=>{ if(f>0) ev.push([when, Math.round(69+12*Math.log2(f/440))]); };
      try{ play(); } finally{ stopPlay(); playInst=o; }
      ev.sort((a,b)=>a[0]-b[0]);
      return {res, first:ev.slice(0,2).map(x=>x[1])};
    })()`);
    T(r.res && r.res.join(' ') === '2o1 7o-1 6o-1' && r.first && r.first.join(',') === '74,72',
      'T18 编辑栏新输入倚音默认最近八度（1̇ 上「2」→ 2̇，1 上「7」→ 7̣，5̣ 上「6」→ 6̣；播放 D5→C5）', JSON.stringify(r));
  }

  /* ===== T19 固定调说明行随导入内容 ===== */
  {
    const gpC = gp5({ key: 2, tracks: [{ name: '木吉他', capo: 2, bars: prog(['G', 'D', 'Em', 'C'], true) }, { name: '主音', bars: prog(['A', 'E', 'F#m', 'D']) }] });
    const r = await EV(`(()=>{
      const u8=Uint8Array.from(atob('${b64(gpC)}'), c=>c.charCodeAt(0)); showGPTrackModal(parseGP(u8.buffer).gp);
      const fx=document.querySelector('input[name="kc-nota"][value="fixed"]'); fx.checked=true; fx.onchange();
      const gpFixed=document.getElementById('kc-tip').textContent;
      document.querySelector('input[name="kc-nota"][value="movable"]').checked=true;
      const t0=document.querySelectorAll('.gp-tk')[0]; t0.checked=false; t0.dispatchEvent(new Event('change'));
      const sel=document.getElementById('kc-key'); sel.value='file'; sel.onchange();
      const gpFile=document.getElementById('kc-tip').textContent;
      closeModal();
      const mid=Uint8Array.from(atob('${b64(smf({ notes: EB_MEL }))}'), c=>c.charCodeAt(0)); showMidiImport(parseSMF(mid));
      const fy=document.querySelector('input[name="kc-nota"][value="fixed"]'); fy.checked=true; fy.onchange();
      const miVocal=document.getElementById('kc-tip').textContent;
      const ty=document.getElementById('mi-type'); ty.value='guitar'; ty.dispatchEvent(new Event('change'));
      const miGtr=document.getElementById('kc-tip').textContent;
      closeModal();
      return {gpFixed, gpFile, miVocal, miGtr}; })()`);
    /* 第二轨不夹：取消第一轨后「文件调号」= D（夹 0），说明行不再写变调夹 */
    T(/联排行调外音统一写 ♯/.test(r.gpFixed) && !/决定写/.test(r.gpFixed) && /^首调：简谱 1=D。/.test(r.gpFile)
      && /所选调只决定写 ♯ 还是 ♭/.test(r.miVocal) && /联排行调外音统一写 ♯/.test(r.miGtr),
      'T19 固定调说明行按导入内容区分（六线谱联排行统一写 ♯ / 简谱旋律按所选调）、GP 改勾音轨后文件调号说明用新夹位', JSON.stringify(r));
  }

  T(errs.length === 0, '无页面报错', errs.slice(0, 3).join(' | ') || 'none');
  console.log((pass === total ? 'PASS ' : 'FAIL ') + pass + '/' + total + (pass === total ? ' NO ERRORS' : ''));
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
