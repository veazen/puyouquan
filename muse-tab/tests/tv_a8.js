/* v63.0 A8 出错谱止血（2026-10 评审团 §6.2 A8：P1-26 unit 过滤 / P1-10 导入转调 / P1-11 空小节 / P1-24 单音推弦）：
   T1 织体按「拍数 + 单位」双重过滤：2/4·3/4·4/4·6/8 有织体；6/4·3/8·2/2·12/8 没有（不再把 6/8 织体套给 6/4、把 3/4 套给 3/8）
   T2 两个织体弹窗遇到无匹配拍号时只提示「暂无内置织体」不开弹窗；genAccompaniment 直调不匹配织体时拒绝生成、谱面不动
   T3 支持的四种拍号 × 全部织体生成伴奏后 beatErrors=0
   T4 新建 3/8、6/8（歌谱/钢琴弹唱/弹唱/教学对照）beatErrors=0；插入小节、整小节粘贴补空（覆盖与小节线插入两条分支）后仍为 0
   T5 MusicXML 外部转调文件导入：两个声部、C→G→♭E 两次转调，每个音的播放音高 = 原文件音高（导入 → 播放音高断言）
   T6 单音推弦目标圈 = 起始品位 + 幅度（缺省全音 +2、½ 音 +1）；旧数据 bt 优先；回落 bd 圈内为原品位
   突变实证：对 v63.0 之前的文件复跑，T1/T2/T4/T5/T6 报红（5/6）；T3 为非回归护栏（支持拍号在旧文件本就正确）。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(1000);
  await pg.evaluate(`(()=>{ if(typeof guardReplace!=='undefined') guardReplace=(p)=>p(); if(typeof undoStack!=='undefined') undoStack.length=0;
    if(typeof hideStartPad==='function') hideStartPad(); })()`);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = s => pg.evaluate(s).catch(e => ({ err: e.message }));
  /* 带和弦的钢琴弹唱谱：右手每小节首列标和弦 */
  const MKACC = (bt, u) => `(()=>{ const s=createSong('pianoacc',{title:'织体${bt}/${u}',key:'C',beats:${bt},unit:${u},nMea:4});
    const CH=['C','F','G7','C']; s.measures.forEach((m,mi)=>{ (m.voxes[0][0]||{}).chord=CH[mi%4]; }); return s; })()`;
  const FITS = `(t,bt,u)=>PIANO_TEX.filter(x=>x.beats===bt && (x.unit||(x.beats===6?8:4))===u)`;

  /* ---------- T1 织体双重过滤 ---------- */
  {
    const r = await EV(`(()=>{ const out={};
      const avail=(typeof texAvail==='function')? texAvail : null;
      [[2,4],[3,4],[4,4],[6,8],[6,4],[3,8],[2,2],[12,8]].forEach(([bt,u])=>{ out[bt+'/'+u]= avail? avail(bt,u).length : -1; });
      return out; })()`);
    const has = ['2/4', '3/4', '4/4', '6/8'].every(k => r[k] > 0), none = ['6/4', '3/8', '2/2', '12/8'].every(k => r[k] === 0);
    T(has && none, 'T1 织体按拍数+单位过滤（6/4·3/8·2/2·12/8 无匹配）', JSON.stringify(r));
  }

  /* ---------- T2 弹窗提示 + 直调拒绝 ---------- */
  {
    const r = await EV(`(async()=>{ const out={}; let last='';
      const ot=toast; toast=(m)=>{ last=String(m); };
      const shown=()=>!!document.getElementById('modal-mask');
      loadSong(${MKACC(6, 4)}); closeModal&&closeModal(); last='';
      document.getElementById('b-acctex').onclick(); out.tex64={modal:shown(), msg:last}; closeModal();
      loadSong(${MKACC(3, 8)}); last='';
      document.getElementById('b-acctex').onclick(); out.tex38={modal:shown(), msg:last}; closeModal();
      const v=createSong('vox',{title:'旋律',key:'C',beats:3,unit:8,nMea:2,nVox:1,lyr:1}); loadSong(v); last='';
      document.getElementById('b-arrange').onclick(); out.arr38={modal:shown(), msg:last}; closeModal();
      const v2=createSong('vox',{title:'旋律',key:'C',beats:2,unit:2,nMea:2,nVox:1,lyr:1}); loadSong(v2); last='';
      document.getElementById('b-arrange').onclick(); out.arr22={modal:shown(), msg:last}; closeModal();
      /* 直调：6/8 织体套到 6/4 谱 → 拒绝、谱面不动 */
      loadSong(${MKACC(6, 4)}); const before=JSON.stringify(song.measures);
      const g=genAccompaniment('barc68',0,song.measures.length-1); out.direct={done:g.done, mismatch:!!g.mismatch, same:JSON.stringify(song.measures)===before};
      /* 智能配谱直调同样拒绝错拍号织体 */
      loadSong(v); const ar=arrangeAccompaniment(song,{texId:'slow'}); out.arrDirect={done:ar.gen.done, mismatch:!!ar.gen.mismatch};
      toast=ot; return out; })()`);
    const ok = r.tex64 && !r.tex64.modal && /暂无内置织体/.test(r.tex64.msg) && /6\/4/.test(r.tex64.msg)
      && !r.tex38.modal && /暂无内置织体/.test(r.tex38.msg) && !r.arr38.modal && /暂无内置织体/.test(r.arr38.msg)
      && !r.arr22.modal && /暂无内置织体/.test(r.arr22.msg)
      && r.direct.done === 0 && r.direct.mismatch && r.direct.same && r.arrDirect.done === 0 && r.arrDirect.mismatch;
    T(ok, 'T2 无匹配织体只提示不开弹窗；直调错拍号织体拒绝生成', JSON.stringify(r));
  }

  /* ---------- T3 支持拍号 × 全部织体 beatErrors=0 ---------- */
  {
    const r = await EV(`(()=>{ const bad=[]; let n=0; const fits=${FITS};
      const mk=(bt,u)=>{ const s=createSong('pianoacc',{title:'x',key:'C',beats:bt,unit:u,nMea:4});
        const CH=['C','F','G7','C']; s.measures.forEach((m,mi)=>{ (m.voxes[0][0]||{}).chord=CH[mi%4]; }); return s; };
      [[2,4],[3,4],[4,4],[6,8]].forEach(([bt,u])=>{
        fits(null,bt,u).forEach(t=>{ loadSong(mk(bt,u));
          const g=genAccompaniment(t.id,0,song.measures.length-1); n++;
          const be=beatErrors(); if(!g.done || be.length) bad.push(t.id+'@'+bt+'/'+u+':done'+g.done+',err'+be.length);
        });
      });
      return {n, bad}; })()`);
    T(r.n >= 20 && r.bad && r.bad.length === 0, 'T3 2/4·3/4·4/4·6/8 × 全部织体生成后 beatErrors=0', JSON.stringify(r));
  }

  /* ---------- T4 新建 3/8、6/8 + 插入/粘贴补空 ---------- */
  {
    const r = await EV(`(()=>{ const bad=[]; const out={};
      [['vox',{nVox:1,lyr:1}],['pianoacc',{}],['tanchang',{inst:'guitar',nTab:1,nVox:1,lyr:1}],['teach',{nVox:1,lyr:1}]].forEach(([ty,o])=>{
        [[3,8],[6,8],[2,2]].forEach(([bt,u])=>{
          const s=createSong(ty,Object.assign({title:'空',key:'C',beats:bt,unit:u,nMea:4},o)); loadSong(s);
          const be=beatErrors(); if(be.length) bad.push(ty+'@'+bt+'/'+u+':'+be.length);
        });
      });
      out.newBad=bad;
      /* 6/8 两个简谱声部：插入小节 + 整小节粘贴（剪贴板只有 1 个简谱声部 → 第 2 声部补空）两条分支 */
      const s=createSong('vox',{title:'粘贴',key:'C',beats:6,unit:8,nMea:3,nVox:2,lyr:1}); loadSong(s);
      sel.mi=0; sel.ci=0; insMeasure(); out.ins=beatErrors().length;
      const one={tabs:[], voxes:[Array.from({length:6},()=>({dur:8,dotted:false,deg:1,acc:'',oct:0,lyrics:[],tie:false}))], repeatStart:false, repeatEnd:false};
      clipMeasure=null; clipRow=null; clipCols=null; clipMeasures=[one, JSON.parse(JSON.stringify(one))];
      barSel=null; measureSel=null; measureRange=null; selRange=null; sel.mi=song.measures.length-1;
      pasteMeasure(); out.over=beatErrors().length; out.n1=song.measures.length;
      clipMeasures=[JSON.parse(JSON.stringify(one))]; barSel={L:0,R:1}; pasteMeasure(); out.ins2=beatErrors().length; out.n2=song.measures.length;
      return out; })()`);
    T(r.newBad && r.newBad.length === 0 && r.ins === 0 && r.over === 0 && r.ins2 === 0 && r.n1 === 5 && r.n2 === 6,
      'T4 新建 3/8·6/8·2/2 四谱类 + 插入小节 + 粘贴补空 beatErrors=0', JSON.stringify(r));
  }

  /* ---------- T5 MusicXML 外部转调：导入 → 播放音高 ---------- */
  {
    /* 两声部；第 2、3 小节分别转 G 大调、♭E 大调（每个 part 都带 <key>，与 MuseScore/Sibelius 导出一致） */
    const NOTE = (st, alt, oc) => `<note><pitch><step>${st}</step>${alt ? `<alter>${alt}</alter>` : ''}<octave>${oc}</octave></pitch><duration>24</duration><type>quarter</type></note>`;
    const M = [
      { f: 0, n: [['C', 0, 4], ['E', 0, 4], ['G', 0, 4], ['C', 0, 5]], n2: [['C', 0, 3], ['G', 0, 3], ['E', 0, 3], ['C', 0, 3]] },
      { f: 1, n: [['G', 0, 4], ['B', 0, 4], ['D', 0, 5], ['F', 1, 5]], n2: [['G', 0, 3], ['D', 0, 3], ['B', 0, 2], ['F', 1, 3]] },
      { f: -3, n: [['E', -1, 4], ['G', 0, 4], ['B', -1, 4], ['A', 0, 4]], n2: [['E', -1, 3], ['B', -1, 2], ['C', 0, 3], ['A', -1, 3]] },
    ];
    const L = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const midi = ([st, alt, oc]) => (oc + 1) * 12 + L[st] + alt;
    const part = (id, key2) => `<part id="${id}">` + M.map((m, mi) => `<measure number="${mi + 1}">` +
      (mi === 0 ? `<attributes><divisions>24</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>${id === 'P1' ? 'G' : 'F'}</sign><line>${id === 'P1' ? 2 : 4}</line></clef></attributes>`
        : `<attributes><key><fifths>${m.f}</fifths></key></attributes>`) + m[key2].map(x => NOTE(...x)).join('') + `</measure>`).join('') + `</part>`;
    const xml = `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>旋律</part-name></score-part><score-part id="P2"><part-name>低音</part-name></score-part></part-list>`
      + part('P1', 'n') + part('P2', 'n2') + `</score-partwise>`;
    const want = [M.map(m => m.n.map(midi)), M.map(m => m.n2.map(midi))];
    const r = await EV(`(()=>{ const im=importMusicXML(${JSON.stringify(xml)}); if(im.error) return {error:im.error};
      loadSong(im.song);
      const got=[0,1].map(vi=>song.measures.map((m,mi)=>(m.voxes[vi]||[]).filter(c=>c.deg).map(c=>voxMidi(c,mi))));
      return {got, keyTo:song.measures.map(m=>m.keyTo||''), deg2:song.measures[1].voxes[0].map(c=>c.deg+(c.acc||'')).join(' ')}; })()`);
    const same = !r.error && JSON.stringify(r.got) === JSON.stringify(want);
    T(same && r.keyTo[1] === 'G' && r.keyTo[2] === 'Eb' && r.deg2 === '1 3 5 7',
      'T5 外部转调文件导入后播放音高与原文件一致（两声部 · 两次转调）', JSON.stringify({ want, ...r }));
  }

  /* ---------- T6 单音推弦目标圈 ---------- */
  {
    const r = await EV(`(()=>{ const mk=(o)=>({dur:o.dur||4,dotted:false,chord:'',notes:o.notes||[],strum:'',tech:''});
      const s=createSong('solo',{title:'推弦',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
      s.measures[0].tabs[0]=[mk({notes:[{s:3,f:7,tech:'b'}]}), mk({notes:[{s:2,f:8,tech:'b',bAmt:'1/2'}]}),
        mk({notes:[{s:3,f:5,tech:'b',bt:7}]}), mk({notes:[{s:3,f:9,tech:'bd'}]})];
      loadSong(s); render();
      const h=document.getElementById('score').innerHTML;
      const circ=[...h.matchAll(/<circle cx="([\\d.]+)" cy="[\\d.]+" r="5" fill="var\\(--paper\\)"[^>]*>(?:<\\/circle>)?<text[^>]*>([^<]*)<\\/text>/g)].map(m=>[+m[1],m[2]]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
      return {circ, clean:h.indexOf('NaN')<0 && h.indexOf('undefined')<0}; })()`);
    T(r.circ && r.circ.join(',') === '9,9,7,9' && r.clean, 'T6 单音推弦目标圈＝起始品位+幅度（全音+2 / ½音+1 / 旧 bt 优先 / 回落原品位）', JSON.stringify(r));
  }

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
