/* v43.3 电吉他推弦回放 bend&release + 预推 pre-bend 回归：
   T1 三种类型渲染各异且干净：常规上推 / rel 回放(∧) / pre 预推(竖直上箭头)
   T2 纯预推（无目标音 tk）也能渲染
   T3 bendFromBar：单音点推弦 → tech='b'+bendType='pre'；双音 Ctrl → tech='b'+tk、无 bendType
   T4 清除推弦一并清 bendType
   file:// 直载；载入前清 undoStack。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(800);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 三类型渲染各异
  let r = await pg.evaluate(`(()=>{
    const mk=(bTy)=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
      const s=createSong('solo',{title:'x',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
      const n0={s:3,f:7,tech:'b',tk:{mi:0,ci:1,si:3},bAmt:'full'}; if(bTy)n0.bendType=bTy;
      s.measures[0].tabs[0]=[{dur:4,dotted:false,chord:'',notes:[n0],strum:'',tech:''},
        {dur:4,dotted:false,chord:'',notes:[{s:3,f:9}],strum:'',tech:''},
        {dur:2,dotted:false,chord:'',notes:[{s:1,f:5}],strum:'',tech:''}]; loadSong(s);
      return document.getElementById('score').innerHTML; };
    const hn=mk(null), hr=mk('rel'), hp=mk('pre');
    const clean=x=>x.indexOf('NaN')<0 && x.indexOf('undefined')<0 && x.length>1000;
    return {diffRN:hr!==hn, diffPN:hp!==hn, diffRP:hr!==hp, clean:clean(hn)&&clean(hr)&&clean(hp)}; })()`);
  T(r.diffRN && r.diffPN && r.diffRP && r.clean, 'T1 三类型渲染各异且干净', JSON.stringify(r));

  // T2 纯预推（无 tk）
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('solo',{title:'x',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
    s.measures[0].tabs[0]=[{dur:4,dotted:false,chord:'',notes:[{s:3,f:7,tech:'b',bendType:'pre',bAmt:'1/2'}],strum:'',tech:''},
      {dur:4,dotted:false,chord:'',notes:[{s:2,f:5}],strum:'',tech:''},{dur:2,dotted:false,chord:'',notes:[{s:1,f:3}],strum:'',tech:''}]; loadSong(s);
    const h=document.getElementById('score').innerHTML;
    return {clean:h.indexOf('NaN')<0, half:h.indexOf('>½</text>')>=0}; })()`);
  T(r.clean && r.half, 'T2 纯预推(无tk)渲染', JSON.stringify(r));

  // T3 bendFromBar 单音→pre / 双音→常规
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('solo',{title:'x',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
    s.measures[0].tabs[0]=[{dur:4,dotted:false,chord:'',notes:[{s:3,f:7}],strum:'',tech:''},
      {dur:4,dotted:false,chord:'',notes:[{s:3,f:9}],strum:'',tech:''},{dur:2,dotted:false,chord:'',notes:[{s:1,f:5}],strum:'',tech:''}]; loadSong(s);
    // 单音
    sel={mi:0,row:'tab',vi:0,ci:0,si:3}; noteSel=[]; bendFromBar('b');
    const n0=s.measures[0].tabs[0][0].notes[0];
    const single={tech:n0.tech, pre:n0.bendType, noTk:!n0.tk};
    // 双音
    if(typeof undoStack!=='undefined')undoStack.length=0;
    const s2=createSong('solo',{title:'y',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
    s2.measures[0].tabs[0]=[{dur:4,dotted:false,chord:'',notes:[{s:3,f:7}],strum:'',tech:''},
      {dur:4,dotted:false,chord:'',notes:[{s:3,f:9}],strum:'',tech:''},{dur:2,dotted:false,chord:'',notes:[{s:1,f:5}],strum:'',tech:''}]; loadSong(s2);
    sel={mi:0,row:'tab',vi:0,ci:0,si:3};
    noteSel=[{row:'tab',mi:0,ci:0,vi:0,si:3},{row:'tab',mi:0,ci:1,vi:0,si:3}]; bendFromBar('b');
    const m0=s2.measures[0].tabs[0][0].notes[0];
    const dbl={tech:m0.tech, tk:!!m0.tk, noPre:!m0.bendType};
    return {single, dbl}; })()`);
  T(r.single.tech==='b' && r.single.pre==='pre' && r.single.noTk && r.dbl.tech==='b' && r.dbl.tk && r.dbl.noPre,
    'T3 单音→pre / 双音→常规', JSON.stringify(r));

  // T4 清除推弦一并清 bendType（双音再点=取消路径）
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('solo',{title:'x',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
    s.measures[0].tabs[0]=[{dur:4,dotted:false,chord:'',notes:[{s:3,f:7,tech:'b',tk:{mi:0,ci:1,si:3},bendType:'rel',bAmt:'full'}],strum:'',tech:''},
      {dur:4,dotted:false,chord:'',notes:[{s:3,f:9}],strum:'',tech:''},{dur:2,dotted:false,chord:'',notes:[{s:1,f:3}],strum:'',tech:''}]; loadSong(s);
    sel={mi:0,row:'tab',vi:0,ci:0,si:3};
    noteSel=[{row:'tab',mi:0,ci:0,vi:0,si:3},{row:'tab',mi:0,ci:1,vi:0,si:3}]; bendFromBar('b');   // 同两音再点=取消
    const n0=s.measures[0].tabs[0][0].notes[0];
    return {cleared:!n0.bendType && !n0.tech && !n0.tk}; })()`);
  T(r.cleared, 'T4 取消推弦清 bendType', JSON.stringify(r));

  T(errs.length === 0, '全程无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
