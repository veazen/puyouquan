/* v51.2 TAB 弦位圆形光标（GP 式）回归：
   - 选中 TAB 列时在 sel.si 弦线上画圆形光标（fill-opacity 0.15 + accent 描边，r=8）
   - 几何断言：光标圆心与该弦 strcell 热区中心重合；换弦 cy 位移 = 弦距×档差
   - 空弦位（该弦无音符）同样显示；扫弦列不画；blurSel / 选中简谱行不画 */
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
  const CUR = 'circle[r="8"][fill-opacity="0.15"]';

  // 共用曲谱：col0 三弦5品 / col1 空列 / col2 下扫弦 / col3 一弦7品
  await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('guitar',{title:'c',beats:4,unit:4,key:'C',nMea:1,nTab:1,nVox:0,lyr:0});
    const mk=(o)=>Object.assign({dur:4,dotted:false,chord:'',notes:[],strum:'',tech:''},o||{});
    s.measures[0].tabs[0]=[mk({notes:[{s:3,f:5}]}),mk(),mk({strum:'d',notes:[{s:2,f:1},{s:3,f:0}]}),mk({notes:[{s:1,f:7}]})];
    loadSong(s); blurSel=false; noteSel=[]; selRange=null; })()`);

  // T1 几何：光标圆心 = 选中弦 strcell 热区中心（有音符弦位）
  let r = await pg.evaluate(`(()=>{
    sel={mi:0,row:'tab',vi:0,ci:0,si:3}; render();
    const c=document.querySelector('#score ${CUR}');
    const cell=document.querySelector('#score .strcell[data-mi="0"][data-ci="0"][data-si="3"]');
    if(!c||!cell) return {c:!!c, cell:!!cell};
    const cy=+c.getAttribute('cy'), cx=+c.getAttribute('cx');
    const y0=+cell.getAttribute('y')+(+cell.getAttribute('height'))/2;
    const x0=+cell.getAttribute('x'), w=+cell.getAttribute('width');
    return {c:true, cell:true, dy:Math.abs(cy-y0), inX:cx>x0&&cx<x0+w, n:document.querySelectorAll('#score ${CUR}').length}; })()`);
  T(r.c && r.cell && r.dy < 0.6 && r.inX && r.n === 1, 'T1 光标圆心=弦位热区中心', JSON.stringify(r));

  // T2 换弦位移：si 3→5 光标 cy 下移 2×STR_GAP=18；同列 cx 不变
  r = await pg.evaluate(`(()=>{
    sel={mi:0,row:'tab',vi:0,ci:0,si:3}; render();
    const a=document.querySelector('#score ${CUR}');
    const p0={x:+a.getAttribute('cx'), y:+a.getAttribute('cy')};
    sel.si=5; render();
    const b2=document.querySelector('#score ${CUR}');
    return {dx:Math.abs(+b2.getAttribute('cx')-p0.x), dy:+b2.getAttribute('cy')-p0.y}; })()`);
  T(r.dx < 0.01 && Math.abs(r.dy - 18) < 0.01, 'T2 换弦cy位移=2×弦距', JSON.stringify(r));

  // T3 空列/空弦位同样显示（输入落点指示）
  r = await pg.evaluate(`(()=>{
    sel={mi:0,row:'tab',vi:0,ci:1,si:2}; render();
    const c=document.querySelector('#score ${CUR}');
    const cell=document.querySelector('#score .strcell[data-mi="0"][data-ci="1"][data-si="2"]');
    if(!c||!cell) return {c:!!c};
    const dy=Math.abs(+c.getAttribute('cy')-(+cell.getAttribute('y')+(+cell.getAttribute('height'))/2));
    return {c:true, dy}; })()`);
  T(r.c && r.dy < 0.6, 'T3 空弦位显示光标', JSON.stringify(r));

  // T4 扫弦列不画（整列输入无逐弦落点）
  r = await pg.evaluate(`(()=>{
    sel={mi:0,row:'tab',vi:0,ci:2,si:3}; render();
    return {n:document.querySelectorAll('#score ${CUR}').length}; })()`);
  T(r.n === 0, 'T4 扫弦列无弦位光标', JSON.stringify(r));

  // T5 blurSel 隐藏；选中简谱行不画 TAB 光标；谱面无 NaN
  r = await pg.evaluate(`(()=>{
    sel={mi:0,row:'tab',vi:0,ci:0,si:3}; blurSel=true; render();
    const nBlur=document.querySelectorAll('#score ${CUR}').length;
    blurSel=false; sel={mi:0,row:'vox',vi:0,ci:0,si:3}; render();
    const nVox=document.querySelectorAll('#score ${CUR}').length;
    return {nBlur, nVox, nan:document.getElementById('score').innerHTML.includes('NaN')}; })()`);
  T(r.nBlur === 0 && r.nVox === 0 && !r.nan, 'T5 blur/简谱行不画+无NaN', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
