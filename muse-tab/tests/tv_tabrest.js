/* v60.60 六线谱时值线与空小节骨架（用户报告三项）：
   T1 新建项目/新增小节：吉他谱空小节 = 跟拍号相等的休止列（4/4→4 个四分；此前每拍两个八分共 8 列）
   T2 空小节渲染：**一根时值线都不画**、谱表内也不画休止字形（全空小节的骨架保持干净，
      v60.64 恢复休止字形时仍不反转这一条——见 tv_detail1 T2/T14）
      （v60.60 原为「一拍一条」，v60.63 产品指示「单独占一拍的休止符不需要时值线」→ 跟随改口径）
   T3 休止与实音同一拍：休止列也有时值线，并与同拍实音并进同一条符杠
   T4 倚音技巧字母＝普通两音技法字母同款（11px / 600 / 纸底描边 2.4），由 8px/700/2.2 放大
   T5 双倚音输入：空格分隔「5 7」两音；连写「57」也按两音；读不出品位时报错而**不静默删除**
   T6 护栏：简谱/五线谱声部的休止字形照旧（本版只动六线谱）
   T7 空小节按拍号：数量＝分子、时值＝分母（6/8＝6 个八分；旧版 6 个四分＝12 拍，超一倍）
   T8 混合小节：同拍休止连杠 / 单独拍休止不画 / **单独四分音符的符干不被误伤**
      （四分不进符杠组，若照组判会连它一起抹掉——本版实测 3→2 根，已用本项钉住）
   对 v60.59 旧文件跑：T1/T3/T4/T5 当场红；对 v60.62 旧文件跑：T2/T7 当场红（突变实证）。
   file:// 直载。 */
const { chromium } = require('playwright');
const path = require('path');
const F = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });

  const HELP = `
    window.__tc=o=>Object.assign({dur:4,dotted:false,chord:'',notes:[],strum:'',tech:''},o);
    window.__svg=()=>document.getElementById('score');
    /* 符干＝竖直 line stroke-width=0.85（v60.71 时值线减重）。
       此前符干与小节线同为 1，必须再按 y2 把小节线剔出去；现在两者线径已不同，
       0.85 这一条就唯一锁定符干，旧的「按最左竖线定谱表底线」启发式随之作废。 */
    window.__stemXs=()=>
      [...__svg().querySelectorAll('line')].filter(x=>
        Math.abs(+x.getAttribute('x1')-+x.getAttribute('x2'))<0.3
        && +x.getAttribute('stroke-width')===0.85
        && Math.abs(+x.getAttribute('y2')-+x.getAttribute('y1'))>3)
      .map(x=>+(+x.getAttribute('x1')).toFixed(1)).sort((a,c)=>a-c);
    window.__beams=()=>[...__svg().querySelectorAll('rect')].filter(x=>+x.getAttribute('height')===1.9).length;
    /* 休止字形＝ smg 落地的带 transform 的 path */
    window.__restGlyphs=()=>__svg().querySelectorAll('path[transform]').length;
    window.__mkGuitar=(nMea,beats,unit)=>{
      loadSong(createSong('guitar',{beats:beats||4,unit:unit||4,key:'C',nMea:nMea||1,nTab:1,nVox:0,lyr:0}));
      blurSel=true; render(); return song;
    };
  `;

  // T1 新建/新增小节 = 每拍一个四分音符
  let r = await pg.evaluate(HELP + `(()=>{
    __mkGuitar(1,4,4);
    const m44 = song.measures[0].tabs[0].map(c=>c.dur);
    __mkGuitar(1,3,4);
    const m34 = song.measures[0].tabs[0].map(c=>c.dur);
    /* 新增小节（走 blankMeasure 的插入路径）：拍号跟随本谱 */
    __mkGuitar(2,4,4);
    const n0=song.measures.length;
    song.measures.push(blankMeasure());
    const added = song.measures[song.measures.length-1].tabs[0].map(c=>c.dur);
    /* 加轨也应拿到同一套骨架 */
    addVoice('tab');
    const newTrk = song.measures[0].tabs[1].map(c=>c.dur);
    return {m44, m34, added, newTrk, grew: song.measures.length-n0};
  })()`);
  T(r.m44.join() === '4,4,4,4' && r.m34.join() === '4,4,4'
    && r.added.join() === '4,4,4,4' && r.newTrk.join() === '4,4,4,4' && r.grew === 1,
    'T1 空吉他小节＝每拍一个四分（新建/新增小节/加轨口径一致）', JSON.stringify(r));

  // T2 空小节：一根时值线都不画（v60.63 改口径，见文件头说明）
  r = await pg.evaluate(HELP + `(()=>{
    __mkGuitar(1,4,4);
    const stems=__stemXs(), rests=__restGlyphs();
    /* 对照组：四列都填上音符 → 四根符干照画（证明「不画」只针对独占一拍的休止，
       不是把整套时值线机制关掉了） */
    song.measures[0].tabs[0].forEach(c=>{ c.notes=[{s:3,f:5}]; });
    blurSel=true; render();
    const stemsFilled=__stemXs();
    return {nStem:stems.length, rests, nStemFilled:stemsFilled.length};
  })()`);
  T(r.rests === 0 && r.nStem === 0 && r.nStemFilled === 4,
    'T2 空小节：独占一拍的休止不画时值线（填上音符则四根照画）', JSON.stringify(r));

  // T3 休止与实音同拍：休止列有时值线且并进同一条符杠
  r = await pg.evaluate(HELP + `(()=>{
    __mkGuitar(1,4,4);
    song.measures[0].tabs[0]=[
      __tc({dur:8,notes:[{s:3,f:5}]}), __tc({dur:8}),
      __tc({dur:8,notes:[{s:3,f:7}]}), __tc({dur:8,notes:[{s:3,f:5}]}),
      __tc({dur:4,notes:[{s:2,f:3}]}), __tc({dur:4})
    ];
    blurSel=true; render();
    const groups=beamGroups(song.measures[0].tabs[0], null, 4).map(g=>g.idx.join('-'));
    return {groups, beams:__beams(), rests:__restGlyphs(), nStem:__stemXs().length};
  })()`);
  /* 5 根＝第1拍(音+休止)2 + 第2拍(两个八分)2 + 第3拍(四分音符)1；第4拍独占一拍的休止不画。
     v60.64 起休止字形恢复：本小节有音符，两个休止列各画一枚（不再是 0） */
  T(r.groups.join('|') === '0-1|2-3' && r.beams >= 2 && r.rests === 2 && r.nStem === 5,
    'T3 休止与实音同拍：休止列有时值线并进同一条符杠', JSON.stringify(r));

  // T4 倚音技巧字母＝普通两音技法字母同款
  r = await pg.evaluate(HELP + `(()=>{
    __mkGuitar(1,4,4);
    const cs=song.measures[0].tabs[0];
    cs[0].notes=[{s:3,f:9}]; cs[0].grace={notes:[{s:3,f:7}],dur:16,tk:'h'};
    cs[1].notes=[{s:3,f:5,tech:'h',tk:{mi:0,ci:2,si:3}}];
    cs[2].notes=[{s:3,f:7}];
    blurSel=true; render();
    const it=[...__svg().querySelectorAll('text')].filter(x=>x.getAttribute('font-style')==='italic')
      .map(x=>({t:x.textContent, fs:x.getAttribute('font-size'), fw:x.getAttribute('font-weight'),
        sw:x.getAttribute('stroke-width')}));
    const key=o=>o.fs+'/'+o.fw+'/'+o.sw;
    return {it, same: it.length>=2 && key(it[0])===key(it[1]), style: it.length? key(it[0]):null};
  })()`);
  T(r.same && r.style === '11/600/2.4',
    'T4 倚音技巧字母与普通两音技法同款（11/600/2.4，由 8/700/2.2 放大）', JSON.stringify(r));

  // T5 双倚音输入：空格分隔 / 连写 / 无效输入不静默删除
  r = await pg.evaluate(HELP + `(()=>{
    __mkGuitar(1,4,4);
    const cs=song.measures[0].tabs[0];
    cs[0].notes=[{s:3,f:9}];
    sel={mi:0,row:'tab',vi:0,ci:0,si:3}; render();
    const put=v=>{ window.askText=(t,d,cb)=>cb(v); applyTabGrace('pre');
      const g=song.measures[0].tabs[0][0].grace; return g? g.notes.map(n=>n.f).join(' ') : null; };
    const sep=put('5 7');
    /* 清掉再试连写 */
    put(''); const joined=put('57');
    /* 无效输入：既有倚音必须原样保留（旧版会被静默删除） */
    const before=song.measures[0].tabs[0][0].grace? JSON.stringify(song.measures[0].tabs[0][0].grace.notes):null;
    put('abc');
    const after=song.measures[0].tabs[0][0].grace? JSON.stringify(song.measures[0].tabs[0][0].grace.notes):null;
    return {sep, joined, before, after, kept: before!=null && before===after};
  })()`);
  T(r.sep === '5 7' && r.joined === '5 7' && r.kept,
    'T5 双倚音输入：空格分隔/连写都两音；无效输入不静默删除', JSON.stringify(r));

  // T7 复合拍号空小节：数量＝分子、时值＝分母（v60.63 修「6/8 空小节多出一倍」）
  r = await pg.evaluate(HELP + `(()=>{
    __mkGuitar(1,6,8);
    const cols=song.measures[0].tabs[0];
    const durs=cols.map(c=>c.dur);
    const total=cols.reduce((a,c)=>a+beatsOf(c,8),0);
    const stems=__stemXs().length, beams=__beams();
    /* 对照 3/4 与 4/4：都应正好填满一小节 */
    __mkGuitar(1,3,4);
    const t34=song.measures[0].tabs[0].reduce((a,c)=>a+beatsOf(c,4),0);
    __mkGuitar(1,4,4);
    const t44=song.measures[0].tabs[0].reduce((a,c)=>a+beatsOf(c,4),0);
    return {durs, total, want:6, stems, beams, t34, t44};
  })()`);
  T(r.durs.join() === '8,8,8,8,8,8' && Math.abs(r.total - 6) < 1e-6
    && r.stems === 0 && r.beams === 0
    && Math.abs(r.t34 - 3) < 1e-6 && Math.abs(r.t44 - 4) < 1e-6,
    'T7 空小节按拍号：6/8＝6 个八分正好一小节（旧版 6 个四分＝12 拍，超一倍）', JSON.stringify(r));

  // T8 不能误伤普通音符的符干：四分/二分音符本就不进符杠组，
  //    若拿 beamGroups 的分组来判「该不该画时值线」会把它们的符干一并抹掉
  r = await pg.evaluate(HELP + `(()=>{
    __mkGuitar(1,4,4);
    song.measures[0].tabs[0]=[
      __tc({dur:8,notes:[{s:3,f:2}]}), __tc({dur:8}),   // 第1拍：音＋休止 → 两根符干＋一条杠
      __tc({dur:4}),                                     // 第2拍：独占一拍的休止 → 不画
      __tc({dur:4,notes:[{s:2,f:1}]}),                   // 第3拍：单独四分音符 → 必须有符干
      __tc({dur:4})                                      // 第4拍：独占一拍的休止 → 不画
    ];
    blurSel=true; render();
    const xs=__stemXs();
    return {n:xs.length, beams:__beams(), rests:__restGlyphs(), xs};
  })()`);
  /* 三个休止列各一枚字形（v60.64 恢复）；时值线仍只在有发声的拍上 */
  T(r.n === 3 && r.beams === 1 && r.rests === 3,
    'T8 混合小节：同拍休止连杠、单独拍休止不画时值线（但休止字形照画）、四分音符符干不被误伤', JSON.stringify(r));

  // T6 护栏：简谱声部休止字形照旧（本版只动六线谱）
  r = await pg.evaluate(HELP + `(()=>{
    loadSong(createSong('vocal',{beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0}));
    song.measures[0].voxes[0]=[1,0,3,0].map(d=>({dur:4,dotted:false,deg:d,acc:'',oct:0,lyrics:[],tie:false}));
    blurSel=true; render();
    const zeros=[...__svg().querySelectorAll('text')].filter(x=>x.textContent==='0').length;
    return {zeros};
  })()`);
  T(r.zeros >= 2, 'T6 护栏：简谱休止（0）照旧显示，本版只动六线谱', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
