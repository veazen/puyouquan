/* v60.60 六线谱时值线与空小节骨架（用户报告三项）：
   T1 新建项目/新增小节：吉他谱空小节 = 每拍一个四分音符（此前每拍两个八分共 8 列）
   T2 空小节渲染：一拍一条时值线、谱表内不画休止字形（「点击节奏时只出现时值线」）
   T3 休止与实音同一拍：休止列也有时值线，并与同拍实音并进同一条符杠
   T4 倚音技巧字母＝普通两音技法字母同款（11px / 600 / 纸底描边 2.4），由 8px/700/2.2 放大
   T5 双倚音输入：空格分隔「5 7」两音；连写「57」也按两音；读不出品位时报错而**不静默删除**
   T6 护栏：简谱/五线谱声部的休止字形照旧（本版只动六线谱）
   对 v60.59 旧文件跑：T1/T2/T3/T4/T5 当场红（突变实证）。file:// 直载。 */
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
    /* 符干＝竖直 line stroke-width=1（小节线更长且成对，按长度过滤不掉，故按 x 聚合比对） */
    window.__stemXs=()=>[...__svg().querySelectorAll('line')].filter(x=>
        Math.abs(+x.getAttribute('x1')-+x.getAttribute('x2'))<0.3
        && +x.getAttribute('stroke-width')===1
        && Math.abs(+x.getAttribute('y2')-+x.getAttribute('y1'))>3)
      .map(x=>+(+x.getAttribute('x1')).toFixed(1)).sort((a,c)=>a-c);
    window.__beams=()=>[...__svg().querySelectorAll('rect')].filter(x=>+x.getAttribute('height')===2.2).length;
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

  // T2 空小节：一拍一条时值线 + 谱表内无休止字形
  r = await pg.evaluate(HELP + `(()=>{
    __mkGuitar(1,4,4);
    const stems=__stemXs(), rests=__restGlyphs();
    /* 与「同一张谱但四列都填上音符」对照：符干条数应一致（休止与实音同待遇） */
    song.measures[0].tabs[0].forEach(c=>{ c.notes=[{s:3,f:5}]; });
    blurSel=true; render();
    const stemsFilled=__stemXs();
    return {nStem:stems.length, rests, nStemFilled:stemsFilled.length,
      sameXs: stems.join()===stemsFilled.join()};
  })()`);
  T(r.rests === 0 && r.nStem === r.nStemFilled && r.sameXs && r.nStem >= 4,
    'T2 空小节：一拍一条时值线、无休止字形（与填满音符时符干位置一致）', JSON.stringify(r));

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
  T(r.groups.join('|') === '0-1|2-3' && r.beams >= 2 && r.rests === 0 && r.nStem >= 6,
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
