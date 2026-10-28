/* v67.0 连音线逐音映射回归（负责人：「导入谱时要考虑……另外连音线要映射进去」）
   数据：TAB 音符 note.tieIn＝同一 TAB 声部同弦前一音的延音（tabTieMap 判有效：同品、中间无休止 / 扫弦 / 𝄎）；
   旧谱的列级 col.tie 与纯连音线 tk 原样保留。识别只看谱面形态（tieSVG 闭合双二次曲线的几何），新旧版都能数——突变实证有效。
   ① GP5 夹具：一拍两弦只有一弦延音 → 只那根弦有弧、另一弦照常重拨；跨小节同行直连 + 终点写「(2)」；跨行两段式（行末出线 + 行首进入）
   ② GPIF（.gp）夹具同一段音乐：逐弦映射、弧与发声与 GP5 逐项相同
   ③ MusicXML：简谱声部 tie / 只有 <tied> 的音都成 col.tie；TAB 声部 tie stop → 逐弦 tieIn（和弦里只连那根弦）；
      MIDI→TAB：跨小节长音的延续列逐音 tieIn、不再写列级 col.tie，谱面有弧
   ④ 几何：TAB 弧端点贴两数字（±1）、平基线在本弦上方 9.5；简谱联排行（tabJp）连音弧端点贴两个唱名、在数字之上，
      跨行两段（行末上升段止于行尾、行首下降段止于首个唱名）；联排五线谱同源连音弧；
      和弦里部分弦延音且上一根弦有数字 → 弦线上两数字间的小弧，整和弦延留 → 只在最高音一条弧，任何弧不压品位数字
   ⑤ let ring + 延音：v66.8 延续线不被延音列切断（1 段），弧与虚线 / 文字墨迹不相交
   ⑥ 播放调度表（playInst 记录器）：延音终点不产生新的发声事件、起点延音覆盖终点；MIDI 导出音符数 = 音数 − 连音数、合并时值
   ⑦ 旧谱：列级 col.tie（TAB）不画弧不加括号、渲染与去掉 col.tie 逐字节相同、播放逐事件相同；纯连音线 tk 照旧画弧并静默终点；
      设 MUSETAB_REF=v66.9 页面时另做严格对拍：16 预设 × 1280/390 宽 + 旧式连音线谱，#score 逐字节、播放逐事件与 v66.9 一致
      （v67.1 起旧式连音线谱只留联排五线谱副本：联排行 tabJp 改走简谱声部刻版代码，与旧版必然不同，由 tv_jpsame 覆盖）
   ⑧ MusicXML 导出再导入：TAB 逐弦连音对与简谱 tie 不丢
   ⑨ 编辑器：选中导入连音线的起点按 ~ 取消（只去掉终点 tieIn，起点的 let ring 保留）
   验收补（对抗式验收发现的缺陷，修前全红、修后全绿）：
   ⑩ 延音终点带滑音 / 推弦 / 滑出：终点保留发声（去音头连奏），音效不被静默吞掉
   ⑪ 同弦前倚音 / 后倚音打断延音：谱面不画弧、播放重拨（两边同口径）
   ⑫ 1 弦延音弧遇 TAB 上方标注带（揉弦波浪 / 第二轨和弦名 / b↑ / h·S 字母）改画弦线内小弧，与任何墨迹不相交
   ⑬ 联排五线谱：同行跨小节线的延音终点不重复临时记号（Gould）、同小节后面的同音照常写；跨行重写、进入弧不碰记号
   ⑭ 弦线内小弧跨过中间列（下一弦有数字）不压数字　⑮ 扫弦延留 + 行内和弦图：图带让位　⑯ 终点改写品位去掉 tieIn
   ⑰ 连音链经过小节首列「(0)」走弦线内小弧：进出两条小弧都不压括号
   对 v66.9 原版跑（MUSETAB_URL=…/v669.html）：①②③④⑤⑥⑧⑨ 当场红，⑦a 两版都绿（回归护栏）。 */
const { chromium } = require('playwright');
const zlib = require('zlib');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
const REF = process.env.MUSETAB_REF || '';

/* ---------- 夹具：同一段音乐（4/4，四分音）；[弦,品,标记] 标记 T=延音目标 L=let ring ---------- */
const MUS = [
  [[[2, 3], [3, 2]], [[2, 3, 'T'], [3, 2]], [[1, 0]], [[4, 2, 'L']]],   // 第 2 拍：2 弦延音、3 弦重拨；第 4 拍 let ring
  [[[4, 2, 'T']], [[1, 0]], [[1, 1]], [[5, 3]]],                       // 跨小节延音（同行）
  [[[5, 3, 'T']], [[1, 0]], [[1, 0]], [[1, 0]]],                       // 跨行延音（第 2 小节后强制换行）
];
const NOTES = MUS.flat().flat().length, TIES = MUS.flat().flat().filter(n => n[2] === 'T').length;
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
/* GP5(5.10) 二进制：与 tv_gp / tv_lrspan 同一写法；延音目标音按转谱站惯例品位字节写 0（v66.8 取同弦上一音） */
const gp5Buf = (() => {
  const w = mkW();
  w.bss('FICHIER GUITAR PRO v5.10', 30);
  ['连音线GP5', '', '', '', '', '', '', '', ''].forEach(s => w.ibs(s)); w.i(0);
  w.i(0); for (let i = 0; i < 5; i++) { w.i(0); w.iss(''); }
  w.i(0); w.z(4); w.z(11);
  w.z(30); for (let i = 0; i < 10; i++) w.ibs('');
  w.ibs(''); w.i(80); w.b(0);
  w.b(0); w.i(0);
  for (let i = 0; i < 64; i++) { w.i(0); w.z(8); }
  w.z(42);
  w.i(MUS.length); w.i(1);
  w.b(0x03); w.b(4); w.b(4); w.z(4); w.z(1); w.b(0);
  for (let k = 1; k < MUS.length; k++) { w.z(1); w.b(0x00); w.z(1); w.b(0); }
  w.z(1); w.b(0);
  w.bss('Acoustic', 40); w.i(6);
  [64, 59, 55, 50, 45, 40, 0].forEach(v => w.i(v));
  w.i(1); w.i(1); w.i(2); w.i(24); w.i(0); w.i(0);
  w.z(29);
  w.i(0); w.i(0); w.i(0); w.i(0);
  w.z(4); w.ibs(''); w.ibs('');
  w.z(1);
  MUS.forEach(mea => {
    w.i(mea.length);
    mea.forEach(ns => {
      w.b(0x00); w.b(0); let sf = 0; ns.forEach(([s]) => { sf |= 1 << (7 - s); }); w.b(sf);
      ns.slice().sort((a, b) => a[0] - b[0]).forEach(([s, f, g]) => {
        if (g === 'T') { w.b(0x20); w.b(2); w.b(0); w.z(1); }
        else if (g === 'L') { w.b(0x28); w.b(1); w.b(f); w.z(1); w.b(0x08); w.b(0x00); }
        else { w.b(0x20); w.b(1); w.b(f); w.z(1); }
      });
      w.sh(0);
    });
    w.i(0); w.b(0);
  });
  return Buffer.from(w.arr);
})();
/* GPIF（GP7/8 .gp = ZIP + Content/score.gpif）：GPIF 弦号 0=最低弦 → 本引擎 s=6−弦号 */
function crc32(u8) {
  const tb = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; tb[n] = c >>> 0; }
  let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = tb[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0;
}
function makeZip(entries) {
  const chunks = [], central = []; let off = 0;
  for (const e of entries) {
    const raw = Buffer.from(e.data), comp = zlib.deflateRawSync(raw), crc = crc32(raw), name = Buffer.from(e.name);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(name.length, 26);
    chunks.push(lh, name, comp);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42);
    central.push(ch, name); off += lh.length + name.length + comp.length;
  }
  const cd = Buffer.concat(central), eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(off, 16);
  return Buffer.concat([...chunks, cd, eocd]);
}
const gpifBuf = (() => {
  let mbs = '', bars = '', voices = '', beats = '', notes = '', bid = 0, nid = 0;
  MUS.forEach((mea, mi) => {
    mbs += `<MasterBar>${mi === 0 ? '<Key><AccidentalCount>0</AccidentalCount><Mode>Major</Mode></Key><Time>4/4</Time>' : ''}<Bars>${mi}</Bars></MasterBar>`;
    bars += `<Bar id="${mi}"><Voices>${mi} -1 -1 -1</Voices></Bar>`;
    const bIds = [];
    mea.forEach(ns => { const nIds = [];
      ns.forEach(([s, f, g]) => { nIds.push(nid);
        notes += `<Note id="${nid}"><Properties><Property name="String"><String>${6 - s}</String></Property><Property name="Fret"><Fret>${f}</Fret></Property>`
          + `${g === 'L' ? '<Property name="LetRing"><Enable/></Property>' : ''}</Properties>${g === 'T' ? '<Tie origin="false" destination="true"/>' : ''}</Note>`;
        nid++; });
      beats += `<Beat id="${bid}"><Rhythm ref="q"/><Notes>${nIds.join(' ')}</Notes></Beat>`; bIds.push(bid++); });
    voices += `<Voice id="${mi}"><Beats>${bIds.join(' ')}</Beats></Voice>`;
  });
  const xml = `<?xml version="1.0" encoding="utf-8"?><GPIF><Score><Title>连音线GPIF</Title></Score>`
    + `<Tracks><Track id="0"><Name>吉他</Name><Staves><Staff><Properties><Property name="Tuning"><Pitches>40 45 50 55 59 64</Pitches></Property></Properties></Staff></Staves></Track></Tracks>`
    + `<MasterBars>${mbs}</MasterBars><Bars>${bars}</Bars><Voices>${voices}</Voices><Beats>${beats}</Beats>`
    + `<Rhythms><Rhythm id="q"><NoteValue>Quarter</NoteValue></Rhythm></Rhythms><Notes>${notes}</Notes></GPIF>`;
  return makeZip([{ name: 'VERSION', data: '7.0' }, { name: 'Content/score.gpif', data: xml }]);
})();
/* MusicXML：P1 简谱声部（tie+tied / 只有 tied）+ P2 TAB 声部（和弦里只有 2 弦 tie stop；跨小节 1 弦） */
const TUNE = [['E', 2], ['A', 2], ['D', 3], ['G', 3], ['B', 3], ['E', 4]].map(([st, o], i) => `<staff-tuning line="${i + 1}"><tuning-step>${st}</tuning-step><tuning-octave>${o}</tuning-octave></staff-tuning>`).join('');
const P = (st, o) => `<pitch><step>${st}</step><octave>${o}</octave></pitch>`;
const TN = (st, o, s, f, d, ty, ex, chord) => `<note>${chord ? '<chord/>' : ''}${P(st, o)}<duration>${d}</duration>${ex.tie || ''}<voice>1</voice><type>${ty}</type><notations>${ex.tied || ''}<technical><string>${s}</string><fret>${f}</fret></technical></notations></note>`;
const MXML = `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><work><work-title>连音线MXL</work-title></work>
<part-list><score-part id="P1"><part-name>旋律</part-name></score-part><score-part id="P2"><part-name>吉他</part-name></score-part></part-list>
<part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
<note>${P('E', 4)}<duration>2</duration><tie type="start"/><voice>1</voice><type>half</type><notations><tied type="start"/></notations></note>
<note>${P('E', 4)}<duration>1</duration><tie type="stop"/><voice>1</voice><type>quarter</type><notations><tied type="stop"/></notations></note>
<note>${P('G', 4)}<duration>1</duration><voice>1</voice><type>quarter</type><notations><tied type="start"/></notations></note></measure>
<measure number="2"><note>${P('G', 4)}<duration>4</duration><voice>1</voice><type>whole</type><notations><tied type="stop"/></notations></note></measure></part>
<part id="P2"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><staff-details><staff-lines>6</staff-lines>${TUNE}</staff-details><clef><sign>TAB</sign><line>5</line></clef></attributes>
${TN('D', 4, 2, 3, 1, 'quarter', { tie: '<tie type="start"/>', tied: '<tied type="start"/>' })}${TN('A', 3, 3, 2, 1, 'quarter', {}, true)}
${TN('D', 4, 2, 3, 1, 'quarter', { tie: '<tie type="stop"/>', tied: '<tied type="stop"/>' })}${TN('A', 3, 3, 2, 1, 'quarter', {}, true)}
${TN('E', 4, 1, 0, 2, 'half', { tie: '<tie type="start"/>', tied: '<tied type="start"/>' })}</measure>
<measure number="2">${TN('E', 4, 1, 0, 4, 'whole', { tie: '<tie type="stop"/>', tied: '<tied type="stop"/>' })}</measure></part></score-partwise>`;
/* MIDI：A2 附点二分 + E3 第 4 拍起两拍（跨小节线）→ 吉他 TAB：延续列 */
function vlq(n) { const s = [n & 0x7f]; n >>= 7; while (n) { s.push((n & 0x7f) | 0x80); n >>= 7; } return s.reverse(); }
const midiB64 = (() => {
  const evs = [[0, 0x90, 45, 80], [1440, 0x80, 45, 0], [1440, 0x90, 52, 80], [2400, 0x80, 52, 0], [2400, 0x90, 57, 80], [3360, 0x80, 57, 0]];
  const tk = [0, 0xFF, 0x51, 3, 0x07, 0xA1, 0x20, 0, 0xFF, 0x58, 4, 4, 2, 24, 8, 0, 0xFF, 0x59, 2, 0, 0];
  let last = 0; evs.forEach(([t, st, d1, d2]) => { tk.push(...vlq(t - last), st, d1, d2); last = t; }); tk.push(0, 0xFF, 0x2F, 0);
  const trk = [0x4D, 0x54, 0x72, 0x6B, (tk.length >> 24) & 255, (tk.length >> 16) & 255, (tk.length >> 8) & 255, tk.length & 255, ...tk];
  return Buffer.from([0x4D, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 1, 224, ...trk]).toString('base64');
})();

/* ---------- 页面内助手（只用两版都有的全局函数；识别弧只看 tieSVG 形态） ---------- */
const HELP = `(()=>{
  window.guardReplace=p=>p(); window.SF_PLAYWAIT=false;
  const sv=()=>document.getElementById('score');
  const RX=/^M ([\\d.-]+) ([\\d.-]+) Q ([\\d.-]+) ([\\d.-]+) ([\\d.-]+) ([\\d.-]+) Q [\\d.-]+ [\\d.-]+ [\\d.-]+ [\\d.-]+ Z$/;
  window.__arcs=(root)=>[...(root||sv()).querySelectorAll('path')].map(p=>{ const m=RX.exec(p.getAttribute('d')||''); if(!m) return null;
    return {x1:+m[1], y1:+m[2], qx:+m[3], qy:+m[4], x2:+m[5], y2:+m[6], el:p, jp:!!p.closest('g[data-tabjp]')}; }).filter(Boolean);
  window.__cell=(mi,ci,vi)=>sv().querySelector('rect.strcell[data-mi="'+mi+'"][data-ci="'+ci+'"][data-vi="'+(vi||0)+'"][data-si="1"]');
  window.__tabTop=(mi,ci,vi)=>{ const r=__cell(mi,ci||0,vi); return r? +r.getAttribute('y')+4.5 : null; };
  /* 本列框内坐在 s 弦上的品位数字（含「(2)」） */
  window.__num=(mi,ci,s,vi)=>{ const r=__cell(mi,ci,vi); if(!r) return null;
    const x0=+r.getAttribute('x'), w=+r.getAttribute('width'), yy=+r.getAttribute('y')+4.5+(s-1)*9;
    const t=[...sv().querySelectorAll('text')].find(e=>{ const x=+e.getAttribute('x'), y=+e.getAttribute('y');
      return x>=x0-0.5 && x<=x0+w+0.5 && Math.abs(y-yy-3.6)<1.2 && e.getAttribute('text-anchor')==='middle' && /^\\(?\\d+\\)?$/.test(e.textContent); });
    return t? {x:+t.getAttribute('x'), y:yy, txt:t.textContent, el:t} : null; };
  /* TAB 区（某声部某系统 TAB 顶线上方 30 到底线）里的弧 */
  window.__tabArcs=(tt)=>__arcs().filter(a=>!a.jp && a.y1>tt-30 && a.y1<tt+52);
  window.__T=(d,ns,o)=>Object.assign({dur:d,dotted:false,chord:'',notes:ns,strum:'',tech:''},o||{});
  window.__song=(nMea,o)=>{ const s=createSong('tanchang',Object.assign({title:'连音线',inst:'steel',beats:4,unit:4,nMea,nTab:1,nVox:0,lyr:0},o||{})); return s; };
  /* 播放调度表：截获 playInst（小曲一次排完；长曲另读 audio.schedQ 剩余队列）→ [频率, 相对起点, 延音, 增益, 闷音] */
  window.__play=()=>{ const rec=[]; const orig=window.playInst;
    window.playInst=(k,c,b2,f,w,ring,g,mute,opt)=>{ rec.push([f,w,ring,g,!!mute,opt||null]); };
    try{ play(); const S=audio.schedQ; if(S) S.q.slice(S.i).forEach(ev=>{ if(ev.k==='playInst'){ const a=ev.a; rec.push([a[3],a[4],a[5],a[6],!!a[7],a[8]||null]); } }); }
    finally{ stopPlay(); window.playInst=orig; }
    const t0=rec.length? Math.min(...rec.map(r=>r[1])) : 0;
    return rec.map(r=>{ const o=r[5]? JSON.parse(JSON.stringify(r[5], (k,v)=> (k==='end'||k==='at')&&typeof v==='number'? +(v-t0).toFixed(4) : (typeof v==='number'? +v.toFixed(4) : v))) : null;
      return [+r[0].toFixed(2), +(r[1]-t0).toFixed(4), +r[2].toFixed(4), +(+r[3]).toFixed(4), r[4], o]; }).sort((a,b)=>a[1]-b[1]||a[0]-b[0]); };
  window.__b64=s=>Uint8Array.from(atob(s), c=>c.charCodeAt(0));
  window.__ties=s=>{ const out=[]; s.measures.forEach((m,mi)=>(m.tabs||[]).forEach((cols,vi)=>(cols||[]).forEach((c,ci)=>(c.notes||[]).forEach(n=>{ if(n.tieIn) out.push(vi+':'+mi+':'+ci+':'+n.s); })))); return out; };
  window.__colTie=s=>s.measures.reduce((a,m)=>a+(m.tabs||[]).reduce((b2,cols)=>b2+(cols||[]).filter(c=>c.tie).length,0),0);
  return true; })()`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(HELP);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const J = o => JSON.stringify(o);

  /* ===== ①②：GP5 / GPIF 导入（同一段音乐） ===== */
  const gpCase = async (b64, kind) => pg.evaluate(([b64, kind, NOTES]) => {
    const r = parseGP(__b64(b64).buffer); if (r.error) return { error: r.error };
    const br = kind === 'bin' ? buildSongFromGP345(r.gp, [0]) : buildSongFromGP(r.gp, [0]); if (br.error) return { error: br.error };
    const s = br.song; s.measures[1].brk = 1;          // 第 2 小节后换行：第 2→3 小节的延音跨行
    loadSong(s); render();
    const c = (mi, ci) => song.measures[mi].tabs[0][ci];
    const nt = (mi, ci, s2) => c(mi, ci).notes.find(n => n.s === s2) || {};
    const data = { s2tie: !!nt(0, 1, 2).tieIn, s3tie: !!nt(0, 1, 3).tieIn, s2f: nt(0, 1, 2).f, m1: !!nt(1, 0, 4).tieIn, m1f: nt(1, 0, 4).f,
      m2: !!nt(2, 0, 5).tieIn, colTie: __colTie(song), ties: __ties(song).length };
    /* 几何 */
    const tt0 = __tabTop(0, 0), tt2 = __tabTop(2, 0), arcs0 = __tabArcs(tt0), arcs2 = __tabArcs(tt2);
    const near = (a, v, e) => Math.abs(a - v) <= (e || 1.2);
    const A = __num(0, 0, 2), B = __num(0, 1, 2), A3 = __num(0, 0, 3), B3 = __num(0, 1, 3);
    const a2 = arcs0.find(a => near(a.x1, A.x + 1) && near(a.x2, B.x - 1));
    const a3 = arcs0.find(a => a.x1 > A3.x - 2 && a.x2 < B3.x + 2 && Math.min(a.y1, a.y2) > A3.y - 9.5 - 3 && Math.min(a.y1, a.y2) < A3.y + 6);   // 3 弦（重拨）不应有弧
    const C = __num(0, 3, 4), D = __num(1, 0, 4);
    const aBar = arcs0.find(a => near(a.x1, C.x + 1) && near(a.x2, D.x - 1));
    const E = __num(1, 3, 5), G = __num(2, 0, 5);
    const out = arcs0.find(a => near(a.x1, E.x + 1) && a.x2 > E.x + 15 && a.y2 < a.y1);
    const inn = arcs2.find(a => near(a.x2, G.x - 1) && a.x1 < G.x - 10 && a.y1 < a.y2);
    const geo = { a2: a2 ? { y: +(a2.y1 - A.y).toFixed(1), flat: Math.abs(a2.y1 - a2.y2) < 0.05, up: a2.qy < a2.y1 } : null, a3: !!a3,
      aBar: !!aBar, paren: D ? D.txt : null, out: !!out, inn: !!inn, sysDiff: tt2 > tt0 + 20 };
    /* 发声 */
    const ev = __play();
    const f = (s2, f2) => +(440 * Math.pow(2, (([64, 59, 55, 50, 45, 40][s2 - 1] + f2) - 69) / 12)).toFixed(2);   /* v69.4 TAB 播放按实音（调弦即实音，不再 −12；同 exportMIDI） */
    const spb = 60 / song.tempo;
    const at = (beat, fq) => ev.filter(e => Math.abs(e[1] - beat * spb) < 0.02 && Math.abs(e[0] - fq) < fq * 0.01);
    const play = { n: ev.length, s2at1: at(1, f(2, 3)).length, s3at1: at(1, f(3, 2)).length, s4at4: at(4, f(4, 2)).length, s5at8: at(8, f(5, 3)).length,
      ringS2: (at(0, f(2, 3))[0] || [])[2] };
    return { data, geo, play };
  }, [b64, kind, NOTES]);
  const g5 = await gpCase(gp5Buf.toString('base64'), 'bin');
  const gx = await gpCase(gpifBuf.toString('base64'), 'gpif');
  for (const [r, nm] of [[g5, '① GP5'], [gx, '② GPIF']]) {
    if (r.error) { T(false, nm + ' 导入', r.error); continue; }
    T(r.data.s2tie && !r.data.s3tie && r.data.s2f === 3 && r.data.m1 && r.data.m1f === 2 && r.data.m2 && r.data.colTie === 0 && r.data.ties === TIES,
      nm + ' 数据：一拍两弦只有 2 弦延音 → 只 2 弦 tieIn（品位取前音），3 弦普通音；跨小节 / 跨行延音逐弦；不再写列级 col.tie', J(r.data));
    T(!!r.geo.a2 && r.geo.a2.flat && r.geo.a2.up && Math.abs(r.geo.a2.y + 9.5) < 0.2 && !r.geo.a3,
      nm + ' 谱面：2 弦弧端点贴两数字（±1）、平基线在本弦上方 9.5、向上弯；3 弦（重拨）没有弧', J(r.geo));
    T(r.geo.aBar && r.geo.paren === '(2)', nm + ' 跨小节同行：弧越过小节线直连、终点小节首列写「(2)」', J(r.geo));
    T(r.geo.out && r.geo.inn && r.geo.sysDiff, nm + ' 跨行：行末出线半弧（自起点上升）+ 新行行首进入半弧（落到终点）', J(r.geo));
    T(r.play.n === NOTES - TIES && r.play.s2at1 === 0 && r.play.s3at1 === 1 && r.play.s4at4 === 0 && r.play.s5at8 === 0 && r.play.ringS2 >= 2 * 0.75 - 1e-6,
      nm + ' 播放：延音终点不拨弦（发声 ' + (NOTES - TIES) + ' 次）、同拍 3 弦照常重拨、起点延音覆盖终点', J(r.play));
  }
  T(!g5.error && !gx.error && J(g5.data) === J(gx.data) && g5.play.n === gx.play.n, '①② GP5 与 GPIF 同口径（数据 / 发声逐项相同）');

  /* ===== ③ MusicXML（简谱 + TAB）与 MIDI ===== */
  const r3 = await pg.evaluate(([xml, mb64]) => {
    const im = importMusicXML(xml); if (im.error) return { error: im.error };
    const s = im.song, vx = s.measures[0].voxes[0], tb = s.measures[0].tabs[0];
    const nt = (c, s2) => (c.notes || []).find(n => n.s === s2) || {};
    const mx = { vTie: vx.map(c => c.tie ? 1 : 0).join(''), tab1s2: !!nt(tb[1], 2).tieIn, tab1s3: !!nt(tb[1], 3).tieIn, m2s1: !!nt(s.measures[1].tabs[0][0], 1).tieIn };
    const smf = parseSMF(__b64(mb64)); const md = buildSongFromMIDI(smf, { mode: 'guitar', a: 0 });
    loadSong(md.song); render();
    const cols = []; md.song.measures.forEach((m, mi) => m.tabs[0].forEach((c, ci) => { if (c.notes.length) cols.push({ mi, ci, c }); }));
    const i = cols.findIndex(o => o.mi === 1 && o.ci === 0), A = cols[i - 1], B = cols[i];
    const sameShape = A && B && A.c.notes.map(n => n.s + ':' + n.f).join() === B.c.notes.map(n => n.s + ':' + n.f).join();
    const nA = A && __num(A.mi, A.ci, A.c.notes[0].s), nB = B && __num(B.mi, B.ci, B.c.notes[0].s);
    const arc = nA && nB && __tabArcs(__tabTop(0, 0)).find(a => Math.abs(a.x1 - nA.x - 1) < 1.2 && Math.abs(a.x2 - nB.x + 1) < 1.2);
    const mi2 = { sameShape: !!sameShape, Bin: !!(B && B.c.notes.every(n => n.tieIn)), Ain: !!(A && A.c.notes.some(n => n.tieIn)), colTie: __colTie(md.song), arc: !!arc,
      events: __play().length };
    return { mx, mi2 };
  }, [MXML, midiB64]);
  if (r3.error) T(false, '③ MusicXML 导入', r3.error);
  else {
    T(r3.mx.vTie === '101', '③a MusicXML 简谱声部：<tie>+<tied> 的音与只写 <tied type="start"> 的音都成 col.tie', J(r3.mx));
    T(r3.mx.tab1s2 && !r3.mx.tab1s3 && r3.mx.m2s1, '③b MusicXML TAB 声部：tie stop → 逐弦 tieIn（和弦里只有 2 弦，3 弦重拨）；跨小节 1 弦', J(r3.mx));
    T(r3.mi2.sameShape && r3.mi2.Bin && !r3.mi2.Ain && r3.mi2.colTie === 0 && r3.mi2.arc && r3.mi2.events === 3,
      '③c MIDI→TAB：跨小节长音的延续列同弦同品、逐音 tieIn、不写 col.tie；谱面跨小节线有弧；播放只发 3 次（不在小节线重拨）', J(r3.mi2));
  }

  /* ===== ④ 简谱联排行（tabJp）与联排五线谱 ===== */
  const r4 = await pg.evaluate(() => {
    const s = __song(2); s.tabJp = true;
    const N = (s2, f, t) => Object.assign({ s: s2, f }, t ? { tieIn: true } : {});
    s.measures[0].tabs[0] = [__T(4, [N(1, 0)]), __T(4, [N(1, 0, 1)]), __T(4, [N(2, 1)]), __T(4, [N(1, 3)])];
    s.measures[1].tabs[0] = [__T(4, [N(1, 3, 1)]), __T(4, [N(1, 5)]), __T(4, [N(1, 5, 1)]), __T(4, [N(1, 0)])];
    s.measures[0].brk = 1;
    loadSong(s); render();
    const g = document.querySelector('g[data-tabjp]'); if (!g) return { error: 'no tabJp' };
    const digs = [...document.querySelectorAll('g[data-tabjp] text')].filter(t => /^\d$/.test(t.textContent)).map(t => ({ x: +t.getAttribute('x'), y: +t.getAttribute('y'), d: t.textContent }));
    const jp = __arcs().filter(a => a.jp);
    const near = (a, v) => Math.abs(a - v) <= 1.2;
    const L1 = digs.filter(d => d.y === digs[0].y), L2 = digs.filter(d => d.y !== digs[0].y);
    const full1 = jp.find(a => near(a.x1, L1[0].x + 1) && near(a.x2, L1[1].x - 1) && a.y1 < L1[0].y - 11 && a.y1 > L1[0].y - 20 && Math.abs(a.y1 - a.y2) < 0.05);
    const full2 = jp.find(a => L2.length > 2 && near(a.x1, L2[1].x + 1) && near(a.x2, L2[2].x - 1));
    const out = jp.find(a => near(a.x1, L1[3].x + 1) && a.y2 < a.y1 && Math.abs(a.y1 - L1[0].y) < 20);
    const inn = jp.find(a => L2.length && near(a.x2, L2[0].x - 1) && a.y1 < a.y2 && Math.abs(a.y2 - L2[0].y) < 20);
    const r = { n: jp.length, d1: L1.map(d => d.d).join(''), d2: L2.map(d => d.d).join(''), full1: !!full1, full2: !!full2, out: !!out, inn: !!inn };
    /* 联排五线谱：同一首切到 TAB+五线谱 → 五线谱里的连音弧（TAB 区以上）≥ 连音对数 + 跨行一段 */
    delete song.tabJp; song.tabStaff = true; render();
    const inStaff = tt => __arcs().filter(a => !a.jp && a.y1 < tt - 22 && a.y1 > tt - 120).length;   // 本行 TAB 顶线以上的五线谱区
    r.staff = inStaff(__tabTop(0, 0)) + inStaff(__tabTop(1, 0));
    return r;
  });
  T(!r4.error && r4.full1 && r4.full2 && r4.d1 === '3315' && r4.d2 === '5663',
    '④a 简谱联排行：同音相邻两列的唱名之间画连音弧（端点贴两数字 ±1、在数字之上、平基线）', J(r4));
  T(!r4.error && r4.out && r4.inn, '④b 简谱联排行跨行：行末上升段 + 行首下降段（两段式续接）', J(r4));
  T(!r4.error && r4.staff >= 4, '④c 联排五线谱同源：每个连音对一条弧（跨行两段）', J(r4));

  /* ===== ④d 和弦里的连音弧不压邻弦数字：部分弦延音且上一根弦有数字 → 弦线上两数字之间的小弧；整和弦延留 → 只在最高音上一条弧 ===== */
  const r4d = await pg.evaluate(() => {
    const s = __song(1);
    s.measures[0].tabs[0] = [__T(4, [{ s: 2, f: 3 }, { s: 3, f: 2 }, { s: 4, f: 2 }]), __T(4, [{ s: 2, f: 1 }, { s: 3, f: 2, tieIn: true }, { s: 4, f: 2, tieIn: true }]),
      __T(4, [{ s: 1, f: 0 }, { s: 2, f: 1 }]), __T(4, [{ s: 1, f: 0, tieIn: true }, { s: 2, f: 1, tieIn: true }])];
    loadSong(s); render();
    const tt = __tabTop(0, 0), arcs = __tabArcs(tt);
    const n = (ci, s2) => __num(0, ci, s2);
    const inl = s2 => arcs.find(a => a.x1 > n(0, s2).x + 3 && a.x2 < n(1, s2).x - 3 && a.y1 > n(0, s2).y && a.y1 < n(0, s2).y + 4 && a.qy > a.y1);
    const hold = arcs.filter(a => a.x1 > n(2, 1).x - 2 && a.x2 < n(3, 1).x + 2);
    const ink = el => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top + r.height * 0.13, b: r.top + r.height * 0.95 }; };
    const digits = [...document.querySelectorAll('#score text')].filter(t => /^\(?\d+\)?$/.test(t.textContent) && Math.abs(+t.getAttribute('y') - tt) < 50).map(ink);
    const hit = (a, b2) => Math.min(a.r, b2.r) - Math.max(a.l, b2.l) > 0.3 && Math.min(a.b, b2.b) - Math.max(a.t, b2.t) > 0.3;
    const clash = arcs.filter(a => { const r = a.el.getBoundingClientRect(); const bx = { l: r.left, r: r.right, t: r.top, b: r.bottom }; return digits.some(d => hit(bx, d)); }).length;
    return { n: arcs.length, s3: !!inl(3), s4: !!inl(4), hold: hold.length, holdTop: hold[0] ? +(hold[0].y1 - n(2, 1).y).toFixed(1) : null, clash };
  });
  T(r4d.n === 3 && r4d.s3 && r4d.s4 && r4d.hold === 1 && r4d.holdTop === -9.5 && r4d.clash === 0,
    '④d 和弦连音：部分弦延音（上一根弦另有数字）画弦线上两数字间的小弧、整和弦延留只在最高音上一条弧；所有弧不压任何品位数字', J(r4d));

  /* ===== ⑤ let ring + 延音：延续线不被延音列切断、弧与虚线不相交 ===== */
  const r5 = await pg.evaluate(() => {
    const s = __song(1);
    s.measures[0].tabs[0] = [__T(8, [{ s: 1, f: 0, tech: 'lr' }]), __T(8, [{ s: 1, f: 0, tieIn: true }]), __T(8, [{ s: 2, f: 1, tech: 'lr' }]), __T(8, [{ s: 2, f: 1, tieIn: true }]),
      __T(8, [{ s: 3, f: 0, tech: 'lr' }]), __T(8, [{ s: 3, f: 2, tech: 'lr' }]), __T(4, [{ s: 3, f: 2, tieIn: true }])];
    loadSong(s); render();
    const txt = [...document.querySelectorAll('#score text')].filter(t => /let ring/.test(t.textContent));
    const dash = [...document.querySelectorAll('#score line')].filter(l => l.getAttribute('stroke-dasharray') === '3.5 2.6');
    const arcs = __tabArcs(__tabTop(0, 0));
    const box = el => { const r = el.getBoundingClientRect();   /* 文字取字身盒内的墨迹带（同 tv_lrspan ink） */
      return el.tagName === 'text' ? { left: r.left, right: r.right, top: r.top + r.height * 0.13, bottom: r.top + r.height * 0.95 } : r; };
    const hit = (a, b2) => Math.min(a.right, b2.right) - Math.max(a.left, b2.left) > 0.3 && Math.min(a.bottom, b2.bottom) - Math.max(a.top, b2.top) > 0.3;
    const lastX = __num(0, 6, 3).x;
    const cross = arcs.some(a => dash.concat(txt).some(e => hit(box(a.el), box(e))));
    return { txt: txt.length, dash: dash.length, x2: dash[0] ? +dash[0].getAttribute('x2') : null, lastX, arcs: arcs.length, cross };
  });
  T(r5.txt === 1 && r5.dash === 1 && r5.x2 >= r5.lastX + 4 && r5.arcs === 3,
    '⑤a let ring 段跨过 3 个延音列不断（1 个文字 + 1 条虚线到末音 +5）', J(r5));
  T(r5.arcs === 3 && !r5.cross, '⑤b 连音弧与 let ring 虚线 / 文字墨迹不相交（延续线让到弧上方）', J(r5));

  /* ===== ⑥ MIDI 导出：延音合并 ===== */
  const r6 = await pg.evaluate(b64 => {
    const r = parseGP(__b64(b64).buffer), s = buildSongFromGP345(r.gp, [0]).song;
    const ex = exportMIDI(s), p2 = parseSMF(ex.bytes);
    const tr = p2.tracks.slice().sort((a, b2) => b2.notes.length - a.notes.length)[0];
    const n2 = tr.notes.filter(n => n.midi === 62).sort((a, b2) => a.start - b2.start);   // 2 弦 3 品（D4=62）
    return { n: tr.notes.length, d0: n2.length ? n2[0].dur : null, tpq: p2.division };
  }, gp5Buf.toString('base64'));
  T(r6.n === NOTES - TIES && r6.d0 === 2 * r6.tpq, '⑥ MIDI 导出：延音终点不另发音（音符数 = 音数 − 连音数）、起点时值合并为两拍', J(r6));

  /* ===== ⑦ 旧谱：列级 col.tie / 纯连音线 tk ===== */
  const r7 = await pg.evaluate(() => {
    const mk = colTie => { const s = __song(1);
      s.measures[0].tabs[0] = [__T(4, [{ s: 2, f: 3 }], colTie ? { tie: true } : {}), __T(4, [{ s: 2, f: 3 }]), __T(4, [{ s: 1, f: 0, tk: { mi: 0, ci: 3, si: 1 } }]), __T(4, [{ s: 1, f: 0 }])];
      return s; };
    loadSong(mk(true)); render(); const h1 = document.getElementById('score').innerHTML, e1 = __play();
    const arcs = __tabArcs(__tabTop(0, 0)).length, paren = [...document.querySelectorAll('#score text')].some(t => /^\(\d+\)$/.test(t.textContent));
    loadSong(mk(false)); render(); const h0 = document.getElementById('score').innerHTML, e0 = __play();
    return { same: h1 === h0, sameEv: JSON.stringify(e1) === JSON.stringify(e0), arcs, paren, ev: e1.length };
  });
  T(r7.same && r7.sameEv && r7.arcs === 1 && !r7.paren && r7.ev === 3,
    '⑦a 旧谱：TAB 列级 col.tie 不画弧、不加括号，渲染与去掉 col.tie 逐字节相同、播放逐事件相同；纯连音线 tk 照旧 1 条弧且终点不重拨', J(r7));
  if (REF) {
    /* ⑦b 严格对拍：同一批谱在本版与参考版（v66.9）渲染 / 播放逐字节、逐事件 */
    const pr = await b.newPage({ viewport: { width: 1280, height: 950 } });
    await pr.goto(REF); await pr.waitForTimeout(900); await pr.evaluate(HELP);
    const SNAP = (wd) => `(()=>{ const out=[];
      const olds=[];
      { const s=__song(3);   /* v67.1 联排行（tabJp）改走简谱声部同一套刻版代码，与 v67.0 必然不同——严格对拍只留它的联排五线谱副本 */
        s.measures[0].tabs[0]=[__T(4,[{s:2,f:3,tech:'lr'}],{tie:true}),__T(4,[{s:2,f:3}]),__T(4,[{s:1,f:0,tk:{mi:1,ci:0,si:1}}]),__T(4,[{s:4,f:2}])];
        s.measures[1].tabs[0]=[__T(4,[{s:1,f:0}]),__T(4,[{s:3,f:2,tk:{mi:2,ci:0,si:3}}],{tie:true}),__T(4,[{s:3,f:2}]),__T(4,[{s:5,f:3,tech:'pm'}],{tie:true})];
        s.measures[2].tabs[0]=[__T(4,[{s:3,f:2}]),__T(4,[{s:5,f:3}]),__T(4,[{s:6,f:0},{s:1,f:0}],{strum:'d',tie:true}),__T(4,[{s:6,f:0},{s:1,f:0}],{strum:'d'})];
        s.measures[0].brk=1;
        const s2=JSON.parse(JSON.stringify(s)); s2.tabStaff=true; olds.push(s2); }
      const all=PRESETS.map(p=>()=>p.make()).concat(olds.map(o=>()=>JSON.parse(JSON.stringify(o))));
      all.forEach((mk,i)=>{ if(typeof undoStack!=='undefined') undoStack.length=0; loadSong(mk()); render();
        out.push({i, h:document.getElementById('score').innerHTML, ev:JSON.stringify(__play())}); });
      return out; })()`;
    let bad = [], n7 = 0;
    for (const wd of [1280, 390]) {
      await pg.setViewportSize({ width: wd, height: 950 }); await pr.setViewportSize({ width: wd, height: 950 });
      const A = await pg.evaluate(SNAP(wd)), B = await pr.evaluate(SNAP(wd));
      A.forEach((a, k) => { n7++; const r2 = B[k]; if (!r2 || r2.h !== a.h) bad.push(wd + '#' + a.i + ':render'); if (!r2 || r2.ev !== a.ev) bad.push(wd + '#' + a.i + ':play'); });
    }
    await pg.setViewportSize({ width: 1280, height: 950 });
    T(bad.length === 0, '⑦b 与参考版（' + REF.split('/').pop() + '）严格对拍：' + n7 + ' 份谱（16 预设 + 旧式连音线谱，1280/390 宽）#score 逐字节、播放逐事件一致', bad.slice(0, 8).join(' '));
    await pr.close();
  } else console.log('· ⑦b 严格对拍跳过（设 MUSETAB_REF=参考版页面 URL 启用）');

  /* ===== ⑧ MusicXML 导出 → 导入：连音线不丢 ===== */
  const r8 = await pg.evaluate(b64 => {
    const r = parseGP(__b64(b64).buffer), s = buildSongFromGP345(r.gp, [0]).song;
    s.voxVoices = ['旋律']; s.voxNotations = [undefined];
    const V = (d, deg, tie) => ({ dur: d, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: !!tie });
    s.measures.forEach((m, mi) => { m.voxes = [mi === 0 ? [V(2, 3, 1), V(4, 3), V(4, 5, 1)] : mi === 1 ? [V(1, 5)] : [V(1, 1)]]; });
    loadSong(s);
    const xml = exportMusicXML(song), im = importMusicXML(xml); if (im.error) return { error: im.error };
    const t0 = __ties(song).sort().join(), t1 = __ties(im.song).sort().join();
    const v0 = song.measures.map(m => m.voxes[0].map(c => c.tie ? 1 : 0).join('')).join('|'), v1 = im.song.measures.map(m => m.voxes[0].map(c => c.tie ? 1 : 0).join('')).join('|');
    return { t0, t1, v0, v1, tiedTab: (xml.match(/<tied type="stop"\/>/g) || []).length };
  }, gp5Buf.toString('base64'));
  T(!r8.error && r8.t0 && r8.t0 === r8.t1 && r8.v0 === r8.v1 && r8.tiedTab >= TIES + 1,
    '⑧ MusicXML 导出再导入：TAB 逐弦连音对（' + TIES + ' 对）与简谱 tie 原样回来', J(r8));

  /* ===== ⑨ 编辑器：选中导入连音线的起点按 ~ 取消 ===== */
  const r9 = await pg.evaluate(() => {
    const s = __song(1);
    s.measures[0].tabs[0] = [__T(4, [{ s: 1, f: 0, tech: 'lr' }]), __T(4, [{ s: 1, f: 0, tieIn: true }]), __T(4, [{ s: 2, f: 1 }]), __T(4, [{ s: 2, f: 1 }])];
    loadSong(s); render();
    const before = __tabArcs(__tabTop(0, 0)).length;
    sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 1 }; noteSel = []; selRange = null;
    toggleTie(); render();
    const c0 = song.measures[0].tabs[0][0].notes[0], c1 = song.measures[0].tabs[0][1].notes[0];
    return { before, after: __tabArcs(__tabTop(0, 0)).length, tieIn: !!c1.tieIn, tk: !!c0.tk, lr: c0.tech };
  });
  T(r9.before === 1 && r9.after === 0 && !r9.tieIn && !r9.tk && r9.lr === 'lr', '⑨ 选中起点按 ~：取消导入的连音线（只去终点 tieIn，起点 let ring 保留，不新建纯连音线）', J(r9));

  /* ===== 验收补（⑩–⑯）：对抗式验收发现的缺陷 ===== */
  /* 墨迹相交助手：选中的弧（沿轮廓取 49 点）落进其它墨迹——文字取字身墨迹带、线段按线宽、非弧路径按填充/描边、圆按半径；
     谱线 / 弦线（长横线）与小节线（长竖线）、编辑器光标 / 选区（accent 色）、透明热区不算 */
  await pg.evaluate(() => {
    window.__hit = (sel) => {
      const sv = document.getElementById('score'), arcs = [...sv.querySelectorAll(sel)], A = new Set(arcs), out = [];
      const obs = [...sv.querySelectorAll('text, line, path, circle')].filter(el => {
        if (A.has(el) || /accent/.test((el.getAttribute('fill') || '') + (el.getAttribute('stroke') || ''))) return false;
        if (el.tagName === 'text') return !!el.textContent.trim();
        if (el.tagName === 'line') { const x1 = +el.getAttribute('x1'), x2 = +el.getAttribute('x2'), y1 = +el.getAttribute('y1'), y2 = +el.getAttribute('y2');
          if (!el.getAttribute('stroke-dasharray') && ((Math.abs(y1 - y2) < 0.01 && Math.abs(x2 - x1) > 40) || (Math.abs(x1 - x2) < 0.01 && Math.abs(y2 - y1) > 40))) return false; }
        return true; });
      arcs.forEach(a => {
        const L = a.getTotalLength(), M = a.getScreenCTM(), pts = [];
        for (let i = 0; i <= 48; i++) { const q = a.getPointAtLength(L * i / 48); pts.push(new DOMPoint(q.x, q.y).matrixTransform(M)); }
        obs.forEach(el => {
          const r = el.getBoundingClientRect(); let hit = false;
          if (el.tagName === 'text') { const t = r.top + r.height * 0.13, b2 = r.top + r.height * 0.95; hit = pts.some(q => q.x > r.left + 0.6 && q.x < r.right - 0.6 && q.y > t + 0.3 && q.y < b2 - 0.3); }
          else { const Mi = el.getScreenCTM().inverse();
            hit = pts.some(q => { const u = q.matrixTransform(Mi);
              if (el.tagName === 'line') { const x1 = +el.getAttribute('x1'), x2 = +el.getAttribute('x2'), y1 = +el.getAttribute('y1'), y2 = +el.getAttribute('y2'), sw = (+el.getAttribute('stroke-width') || 1) / 2;
                const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1; let t = ((u.x - x1) * dx + (u.y - y1) * dy) / l2; t = Math.max(0, Math.min(1, t));
                return Math.hypot(u.x - x1 - t * dx, u.y - y1 - t * dy) < sw + 0.35; }
              const cs = getComputedStyle(el);
              return (cs.fill !== 'none' && el.isPointInFill(u)) || (cs.stroke !== 'none' && el.isPointInStroke(u)); }); }
          if (hit) out.push(el.tagName + ':' + (el.tagName === 'text' ? el.textContent : (el.getAttribute('d') || '').slice(0, 16)));
        });
      });
      return out;
    };
  });
  /* ⑩ 播放：延音终点自己带改变音高的技法（滑音 / 推弦 / 滑出）——终点保留发声（连奏不重拨），技法音效在 */
  const r10 = await pg.evaluate(() => {
    const one = (tech, extra) => { const s = __song(1);
      s.measures[0].tabs[0] = [__T(4, [{ s: 2, f: 5 }]), __T(4, [Object.assign({ s: 2, f: 5, tieIn: true, tech }, extra || {})]), __T(4, [{ s: 2, f: 7 }]), __T(4, [{ s: 2, f: 5 }])];
      loadSong(s); render(); const ev = __play(), spb = 60 / song.tempo;
      const at1 = ev.filter(e => Math.abs(e[1] - spb) < 0.02);
      return { n: ev.length, at1: at1.map(e => (e[5] && e[5].legato ? 'L' : '') + (e[5] && e[5].fx ? Object.keys(e[5].fx).filter(k => k !== 'end').join('') : '')).join(','), ring0: ev[0][2] }; };
    return { sl: one('sl', { tk: { mi: 0, ci: 2, si: 2 } }), b: one('b'), ou: one('ou'), plain: one(undefined) };
  });
  T(r10.sl.at1 === 'Lglide' && r10.b.at1 === 'Lbend' && r10.ou.at1 === 'Lgout' && r10.plain.at1 === '' && r10.plain.n === 3,
    '⑩ 播放：延音终点带滑音 / 推弦 / 滑出时终点保留发声（去音头连奏、不重拨），滑音 / 推弦 / 滑出音效不被吞掉；普通延音终点仍静默', J(r10));
  /* ⑪ 同弦倚音打断延音：谱面不画弧、不写括号，播放照常重拨——两边同口径 */
  const r11 = await pg.evaluate(() => {
    const s = __song(2);
    s.measures[0].tabs[0] = [__T(2, [{ s: 2, f: 5 }]), __T(2, [{ s: 2, f: 5, tieIn: true }], { grace: { notes: [{ s: 2, f: 3 }], dur: 16 } })];
    s.measures[1].tabs[0] = [__T(2, [{ s: 3, f: 2 }], { graceA: { notes: [{ s: 3, f: 4 }], dur: 16 } }), __T(2, [{ s: 3, f: 2, tieIn: true }])];
    loadSong(s); render();
    const spb = 60 / song.tempo, ev = __play();
    return { map: typeof tabTieMap === 'function' ? Object.keys(tabTieMap(song, 0).from).length : -1,   /* 旧版无此函数（突变实证时照常跑完） */ arcs: document.querySelectorAll('#score path.tiea').length, paren: document.querySelectorAll('#score text.tiep').length,
      re1: ev.filter(e => Math.abs(e[1] - 2 * spb) < 0.02).length, re2: ev.filter(e => Math.abs(e[1] - 6 * spb) < 0.02).length };
  });
  T(r11.map === 0 && r11.arcs === 0 && r11.paren === 0 && r11.re1 === 1 && r11.re2 === 1, '⑪ 同弦前倚音 / 后倚音打断延音：不画弧、不写括号、终点照常重拨', J(r11));
  /* ⑫ 1 弦延音弧不压 TAB 上方标注带：揉弦波浪、第二轨和弦名、b↑、S / h 字母——改画弦线内小弧；整页新弧零相交 */
  const r12 = await pg.evaluate(() => {
    const res = {};
    const run = (k, mk) => { const s = mk(); loadSong(s); render();
      const tt = __tabTop(0, 0, s.tabVoices.length > 1 ? 1 : 0);
      res[k] = { n: document.querySelectorAll('#score path.tiea').length, hit: __hit('#score path.tiea'),
        below: __arcs().filter(a => a.el.classList.contains('tiea')).every(a => a.qy > a.y1) }; };
    run('vib', () => { const s = __song(2); s.measures[0].tabs[0] = [__T(2, [{ s: 1, f: 5 }]), __T(2, [{ s: 1, f: 8, tech: 'v' }])];
      s.measures[1].tabs[0] = [__T(2, [{ s: 1, f: 8, tieIn: true, tech: 'v' }]), __T(2, [{ s: 1, f: 5 }])]; return s; });
    run('chord2', () => { const s = __song(1, { nTab: 2 }); s.measures[0].tabs[0] = [__T(1, [{ s: 3, f: 0 }])];
      s.measures[0].tabs[1] = [__T(4, [{ s: 1, f: 3 }], { chord: 'G' }), __T(4, [{ s: 1, f: 3, tieIn: true }], { chord: 'C' }), __T(2, [{ s: 2, f: 1 }])]; return s; });
    run('bend', () => { const s = __song(1); s.measures[0].tabs[0] = [__T(4, [{ s: 1, f: 7, tech: 'b' }]), __T(4, [{ s: 1, f: 7, tieIn: true, tech: 'b', bendType: 'pre' }]), __T(2, [{ s: 1, f: 5 }])]; return s; });
    run('letters', () => { const s = __song(1); s.measures[0].tabs[0] = [__T(8, [{ s: 1, f: 5 }]), __T(8, [{ s: 1, f: 5, tieIn: true, tech: 'h', tk: { mi: 0, ci: 2, si: 1 } }]), __T(8, [{ s: 1, f: 7 }]),
      __T(8, [{ s: 2, f: 5, tech: 'su' }]), __T(8, [{ s: 1, f: 5 }]), __T(8, [{ s: 1, f: 5, tieIn: true, tech: 'ou' }]), __T(4, [{ s: 2, f: 3 }])]; return s; });
    return res;
  });
  T(Object.values(r12).every(o => o.n >= 1 && o.hit.length === 0 && o.below), '⑫ 1 弦延音弧遇标注带（揉弦 / 和弦名 / b↑ / h·S 字母）改画弦线内小弧，与任何墨迹不相交', J(r12));
  /* ⑬ 联排五线谱：同行跨小节线的延音终点不重复临时记号（Gould），同小节后面的同音照常写；跨行重写记号，进入弧收在记号之前 */
  const r13 = await pg.evaluate(() => {
    const mk = brk => { const s = __song(2); s.tabStaff = true; if (brk) s.measures[0].brk = 1;
      s.measures[0].tabs[0] = [__T(4, [{ s: 4, f: 4 }]), __T(4, [{ s: 3, f: 3 }]), __T(4, [{ s: 2, f: 0 }]), __T(4, [{ s: 1, f: 2 }])];
      s.measures[1].tabs[0] = [__T(4, [{ s: 1, f: 2, tieIn: true }]), __T(4, [{ s: 2, f: 0 }]), __T(2, [{ s: 1, f: 2 }])]; return s; };
    /* 某小节某列符头左侧的升号个数（SMuFL accidentalSharp 路径；纵向限本系统五线谱区） */
    const sharpsAt = (mi, ci) => { const c = __num(mi, ci, 1).el.getBoundingClientRect(), cx = c.left + c.width / 2;   /* 列的音符 x＝该列 1 弦品位数字中心 */
      return [...document.querySelectorAll('#score path')].filter(p => (p.getAttribute('d') || '').startsWith('M0.948')).filter(p => { const b2 = p.getBoundingClientRect();
        return b2.right > cx - 16 && b2.right < cx - 3 && b2.bottom < c.top && b2.top > c.top - 110; }).length; };
    const sharpsIn = mi => sharpsAt(mi, 0) + '' + sharpsAt(mi, 2);
    loadSong(mk(false)); render(); const a = { m2: sharpsIn(1), hit: __hit('#score path.sttie'), st: document.querySelectorAll('#score path.sttie').length };
    loadSong(mk(true)); render(); const b2 = { m2: sharpsIn(1), hit: __hit('#score path.sttie'), st: document.querySelectorAll('#score path.sttie').length };
    return { a, b: b2 };
  });
  T(r13.a.m2 === '01' && r13.a.st === 1 && r13.a.hit.length === 0 && r13.b.m2 === '10' && r13.b.st === 2 && r13.b.hit.length === 0,
    '⑬ 联排五线谱：同行跨小节线的延音终点不重复升号、同小节后面的同音仍写升号（终点 0 / 后音 1）；跨行在终点重写升号（之后同音不再写：1 / 0），进入弧不碰升号', J(r13));
  /* ⑭ 弦线内小弧跨过中间列、下一弦另有数字：小弧压浅，不碰那个数字 */
  const r14 = await pg.evaluate(() => { const s = __song(1);
    s.measures[0].tabs[0] = [__T(4, [{ s: 3, f: 2 }, { s: 2, f: 3 }]), __T(4, [{ s: 4, f: 2 }]), __T(4, [{ s: 3, f: 2, tieIn: true }, { s: 2, f: 1 }]), __T(4, [{ s: 1, f: 0 }])];
    loadSong(s); render(); return { n: document.querySelectorAll('#score path.tiea').length, hit: __hit('#score path.tiea') }; });
  T(r14.n === 1 && r14.hit.length === 0, '⑭ 弦线内小弧跨过中间列（下一弦有数字）不压数字', J(r14));
  /* ⑮ 扫弦延留（逐音连音线）+ 行内和弦图：图带让位，弧不穿图 */
  const r15 = await pg.evaluate(() => { const s = __song(1); const G = [{ s: 1, f: 3 }, { s: 2, f: 0 }, { s: 3, f: 0 }, { s: 4, f: 0 }, { s: 5, f: 2 }, { s: 6, f: 3 }];
    s.measures[0].tabs[0] = [__T(4, G.map(n => ({ ...n })), { strum: 'd', chord: 'G' }), __T(4, G.map(n => ({ ...n, tieIn: true })), { strum: 'd' }), __T(4, G.map(n => ({ ...n })), { strum: 'u', chord: 'G' }), __T(4, G.map(n => ({ ...n })), { strum: 'd' })];
    loadSong(s); render(); const arcs = __arcs().filter(a => !a.jp); return { n: arcs.length, hit: (() => { arcs.forEach(a => a.el.classList.add('__t15')); return __hit('#score path.__t15'); })() }; });
  T(r15.n === 1 && r15.hit.length === 0, '⑮ 扫弦延留（tieIn）与行内和弦图同行：图带让位，弧不穿图', J(r15));
  /* ⑯ 编辑器：在延音终点上改写成别的品位＝重新写了这个音 → tieIn 去掉（不留改回同品又悄悄连上的隐藏状态）；写回同品不动 */
  const r16 = await pg.evaluate(() => { const s = __song(1);
    s.measures[0].tabs[0] = [__T(4, [{ s: 1, f: 3 }]), __T(4, [{ s: 1, f: 3, tieIn: true }]), __T(4, [{ s: 2, f: 3 }]), __T(4, [{ s: 2, f: 3, tieIn: true }])];
    loadSong(s); render();
    sel = { mi: 0, row: 'tab', vi: 0, ci: 1, si: 1 }; setFret(5); sel = { mi: 0, row: 'tab', vi: 0, ci: 3, si: 2 }; setFret(3);
    const c = song.measures[0].tabs[0]; return { a: !!c[1].notes[0].tieIn, f: c[1].notes[0].f, b: !!c[3].notes[0].tieIn }; });
  T(!r16.a && r16.f === 5 && r16.b, '⑯ 编辑器：终点改写成别的品位去掉 tieIn；写回同一品位保留', J(r16));

  /* ⑰ 连音链经过小节首列「(0)」且走弦线内小弧（P.M. 段里的 1 弦延音）：进出两条小弧都不压括号 */
  const r17 = await pg.evaluate(() => { const s = __song(2); const N = (f, t) => Object.assign({ s: 1, f, tech: 'pm' }, t ? { tieIn: true } : {});
    s.measures[0].tabs[0] = [__T(2, [{ s: 4, f: 2 }]), __T(4, [{ s: 3, f: 2 }]), __T(4, [N(0)])]; s.measures[1].tabs[0] = [__T(4, [N(0, 1)]), __T(4, [N(0, 1)]), __T(2, [{ s: 4, f: 2 }])];
    loadSong(s); render(); return { n: document.querySelectorAll('#score path.tiea').length, paren: [...document.querySelectorAll('#score text.tiep')].map(t => t.textContent).join(), hit: __hit('#score path.tiea') }; });
  T(r17.n === 2 && r17.paren === '(0)' && r17.hit.length === 0, '⑰ 连音链经过小节首列「(0)」走弦线内小弧：进出两条小弧都不压括号', J(r17));

  if (errs.length) { T(false, '页面报错', errs.slice(0, 3).join(' | ')); }
  else console.log('NO ERRORS');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
