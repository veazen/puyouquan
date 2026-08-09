/* v53.7 拖选节拍/小节 + 全粒度复制粘贴回归：
   - 拖小节号连选整小节（measureRange，跨全部声部）→ Ctrl+C 多小节剪贴板 → 粘贴逐小节覆盖、不足自动补建
   - 拖拍区连选多拍（selRange 对齐拍边界，可跨小节）
   - 列级片段复制 → 从光标列顺延覆盖粘贴（跨小节、曲末截断）
   - whole 多小节声部（Ctrl+点小节线连选）→ 按小节替换声部粘贴
   - 回归：单小节 clipMeasure / 单声部 clipRow 原路径不变 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  const mkSong = `(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('guitar',{title:'c',beats:4,unit:4,key:'C',nMea:3,nTab:1,nVox:1,lyr:0});
    const mk=(f,st)=>({dur:4,dotted:false,chord:'',notes:[{s:st,f}],strum:'',tech:''});
    for(let m=0;m<3;m++){
      s.measures[m].tabs[0]=[mk(m,3),mk(m+1,3),mk(m+2,3),mk(m+3,3)];
      s.measures[m].voxes[0]=Array.from({length:4},(_,i)=>({dur:4,dotted:false,deg:((m+i)%7)+1,acc:'',oct:0,lyrics:[],tie:false}));
    }
    return s; })()`;

  // T1 拖小节号连选：pointerdown 小节1号牌 → pointermove 到小节2号牌 → measureRange={0,1}
  let r = await pg.evaluate(`(()=>{
    const s=${mkSong}; loadSong(s); blurSel=true; render();
    const z0=document.querySelector('[data-measuresel="0"]');
    z0.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,buttons:1,clientX:100,clientY:300}));
    const singleSel = measureSel===0;
    const z1=document.querySelector('[data-measuresel="1"]');
    z1.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,buttons:1,clientX:300,clientY:300}));
    const mr = measureRange? measureRange.m1+':'+measureRange.m2 : 'null';
    window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
    const hl = document.getElementById('score').innerHTML.split('stroke-dasharray="6 3"').length-1;
    return { singleSel, mr, hl }; })()`);
  T(r.singleSel && r.mr === '0:1' && r.hl === 2, 'T1 拖小节号连选+双小节高亮', JSON.stringify(r));

  // T2 多小节复制粘贴：measureRange {0,1} Ctrl+C → 光标到第3小节 Ctrl+V → 小节3=小节1、自动补建小节4=小节2
  r = await pg.evaluate(`(()=>{
    measureRange={m1:0,m2:1}; measureSel=null; copyMeasure();
    const nClip = clipMeasures? clipMeasures.length : 0;
    measureRange=null; measureSel=null; sel={mi:2,row:'tab',vi:0,ci:0,si:3};
    const nMea0 = song.measures.length;
    pasteMeasure();
    const f=(m)=>song.measures[m].tabs[0].map(c=>c.notes[0].f).join('');
    const d=(m)=>song.measures[m].voxes[0].map(c=>c.deg).join('');
    return { nClip, nMea0, nMea:song.measures.length,
      tabOK: f(2)===f(0) && f(3)===f(1), voxOK: d(2)===d(0) && d(3)===d(1) }; })()`);
  T(r.nClip === 2 && r.nMea0 === 3 && r.nMea === 4 && r.tabOK && r.voxOK, 'T2 多小节复制粘贴+自动补建', JSON.stringify(r));

  // T3 拖拍区连选多拍：pointerdown 第1拍区 → pointermove 第3拍区 → selRange 覆盖 1-3 拍列（对齐拍边界）
  r = await pg.evaluate(`(()=>{
    const s=${mkSong}; loadSong(s); blurSel=true; render();
    const b0=document.querySelector('[data-beatsel="0:0:0"]');
    b0.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,buttons:1,clientX:100,clientY:250}));
    const oneBeat = selRange && selRange.c1===0 && selRange.c2===0;   // 四分列：每拍1列
    const b2=document.querySelector('[data-beatsel="0:0:2"]');
    b2.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,buttons:1,clientX:260,clientY:250}));
    const multi = selRange? selRange.m1+':'+selRange.c1+'-'+selRange.m2+':'+selRange.c2 : 'null';
    window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
    return { oneBeat, multi }; })()`);
  T(r.oneBeat && r.multi === '0:0-0:2', 'T3 拖拍区连选多拍', JSON.stringify(r));

  // T4 列级片段复制→顺延覆盖粘贴（跨小节+曲末截断）
  r = await pg.evaluate(`(()=>{
    const s=${mkSong}; loadSong(s);
    selRange={row:'tab',vi:0,m1:0,c1:0,m2:0,c2:2}; copyMeasure();   // 复制小节1前3列 f=0,1,2
    const seg = clipCols? clipCols.meas[0].length : 0;
    selRange=null; sel={mi:2,row:'tab',vi:0,ci:2,si:3};             // 光标到小节3第3列（仅剩2列→截断）
    pasteMeasure();
    const f=(m)=>song.measures[m].tabs[0].map(c=>c.notes[0].f).join(',');
    return { seg, m2:f(2), nMea:song.measures.length }; })()`);
  T(r.seg === 3 && r.m2 === '2,3,0,1' && r.nMea === 3, 'T4 列级顺延覆盖+曲末截断', JSON.stringify(r));

  // T5 whole 多小节声部：Ctrl+点小节线式 selRange → 复制 → 按小节替换声部（第3小节起，不足补建）
  r = await pg.evaluate(`(()=>{
    const s=${mkSong}; loadSong(s);
    selRange={row:'vox',vi:0,m1:0,c1:0,m2:1,c2:3,whole:true}; copyMeasure();
    const kind = clipCols? (clipCols.whole?'whole':'flat')+clipCols.meas.length : 'none';
    selRange=null; sel={mi:2,row:'vox',vi:0,ci:0,si:3};
    pasteMeasure();
    const d=(m)=>song.measures[m].voxes[0].map(c=>c.deg).join('');
    const tabKept = song.measures[2].tabs[0].map(c=>c.notes[0].f).join('')==='2345';   // 吉他声部不受影响
    return { kind, voxOK: d(2)===d(0) && d(3)===d(1), tabKept, nMea:song.measures.length }; })()`);
  T(r.kind === 'whole2' && r.voxOK && r.tabKept && r.nMea === 4, 'T5 whole多小节声部替换粘贴', JSON.stringify(r));

  // T6 回归：单小节 clipMeasure / 单声部 clipRow 原路径
  r = await pg.evaluate(`(()=>{
    const s=${mkSong}; loadSong(s);
    measureSel=0; measureRange=null; selRange=null; copyMeasure();
    const cm = !!clipMeasure && !clipMeasures && !clipCols;
    measureSel=1; pasteMeasure();
    const pasted = song.measures[1].tabs[0][0].notes[0].f===0;
    selRange={row:'tab',vi:0,m1:2,c1:0,m2:2,c2:3,whole:true}; measureSel=null; copyMeasure();
    const cr = !!clipRow && !clipMeasure;
    return { cm, pasted, cr }; })()`);
  T(r.cm && r.pasted && r.cr, 'T6 单小节/单声部剪贴板回归', JSON.stringify(r));

  // T7 列选→框选音符（v53.8）：vox 列拖选松手后范围内音符进入 noteSel，圈选标记出现
  r = await pg.evaluate(`(()=>{
    const s=${mkSong}; loadSong(s); blurSel=true; render();
    const cell=(mi,ci)=>document.querySelector('[data-mi="'+mi+'"][data-ci="'+ci+'"][data-row="vox"]');
    cell(0,0).dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,buttons:1}));
    cell(0,2).dispatchEvent(new PointerEvent('pointermove',{bubbles:true,buttons:1}));
    const rangeOn = selRange && selRange.c1===0 && selRange.c2===2;
    window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
    const circ=(document.getElementById('score').innerHTML.match(/r="8\\.5"/g)||[]).length;
    return { rangeOn, n:noteSel.length, rows:noteSel.every(q=>q.row==='vox'), circ }; })()`);
  T(r.rangeOn && r.n === 3 && r.rows && r.circ === 3, 'T7 列选松手=框选音符(vox圈×3)', JSON.stringify(r));

  // T8 拍选→框选音符：TAB 拍区拖选两拍松手后 noteSel=拍内音符、TAB 圈选标记出现
  r = await pg.evaluate(`(()=>{
    const s=${mkSong}; loadSong(s); blurSel=true; render();
    document.querySelector('[data-beatsel="0:0:0"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,buttons:1}));
    document.querySelector('[data-beatsel="0:0:1"]').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,buttons:1}));
    window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
    const circ=(document.getElementById('score').innerHTML.match(/r="8" fill="none" stroke="var\\(--accent\\)"/g)||[]).length;
    return { n:noteSel.length, tab:noteSel.every(q=>q.row==='tab'&&q.si===3), circ }; })()`);
  T(r.n === 2 && r.tab && r.circ === 2, 'T8 拍选松手=框选音符(tab圈×2)', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
