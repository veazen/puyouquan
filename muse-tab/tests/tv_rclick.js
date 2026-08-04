/* v51.3 右键弹窗交互回归：
   - 小节线：鼠标左键=仅选中（barSel 高亮、无弹窗）；右键=弹出反复/终止设置；触屏点按=直接弹出
   - 音符：鼠标左键=仅选中（无快捷浮条）；右键=弹出快捷浮条；触屏点按=自动弹出
   - #score 上 contextmenu 默认菜单被屏蔽 */
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

  await pg.evaluate(() => { if (typeof undoStack !== 'undefined') undoStack.length = 0;
    const s = createSong('guitar', { title: 'r', beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 0, lyr: 0 });
    const mk = (o) => Object.assign({ dur: 4, dotted: false, chord: '', notes: [], strum: '', tech: '' }, o || {});
    s.measures[0].tabs[0] = [mk({ notes: [{ s: 3, f: 5 }] }), mk(), mk(), mk()];
    s.measures[1].tabs[0] = [mk({ notes: [{ s: 1, f: 7 }] }), mk(), mk(), mk()];
    loadSong(s); blurSel = false; });
  const PD = (selDesc, init) => `document.querySelector('${selDesc}').dispatchEvent(new PointerEvent('pointerdown', Object.assign({bubbles:true, composed:true}, ${JSON.stringify(init)})))`;

  // T1 左键点小节线：仅选中（barSel 置位、高亮 0.3、无 #popmenu），pointerup 收尾；
  //    v51.9 音符光标同时熄灭（blurSel）——不再「多处光标亮起」
  let r = await pg.evaluate(`(()=>{
    sel={mi:0,row:'tab',vi:0,ci:0,si:3}; blurSel=false; render();
    ${PD('#score .barzone', { pointerType: 'mouse', button: 0 })};
    document.dispatchEvent(new PointerEvent('pointerup', {bubbles:true}));
    const hi=[...document.querySelectorAll('#score .barzone')].some(z=>z.getAttribute('fill-opacity')==='0.3');
    const noteCur=document.querySelectorAll('#score circle[r="8"][fill-opacity="0.15"]').length;
    return {barSel:!!barSel, pop:!!document.getElementById('popmenu'), hi, noteCur}; })()`);
  T(r.barSel && !r.pop && r.hi && r.noteCur === 0, 'T1 左键小节线=仅选中+音符光标熄灭', JSON.stringify(r));

  // T2 右键点小节线：立即弹出设置菜单（含反复记号项）
  r = await pg.evaluate(`(()=>{
    ${PD('#score .barzone', { pointerType: 'mouse', button: 2 })};
    const pm=document.getElementById('popmenu');
    return {pop:!!pm, hasRep:!!pm&&pm.textContent.indexOf('反复')>=0, barSel:!!barSel}; })()`);
  T(r.pop && r.hasRep && r.barSel, 'T2 右键小节线=弹设置菜单', JSON.stringify(r));

  // T3 触屏点按小节线：保持直接弹出（无右键可用）
  r = await pg.evaluate(`(()=>{ closePop();
    ${PD('#score .barzone', { pointerType: 'touch', button: 0 })};
    document.dispatchEvent(new PointerEvent('pointerup', {bubbles:true}));
    const pop=!!document.getElementById('popmenu'); closePop(); return {pop}; })()`);
  T(r.pop, 'T3 触屏点按小节线=直接弹出', JSON.stringify(r));

  // T4 左键点音符：仅选中（sel 移动、无 quickbar）；右键：弹出 quickbar
  r = await pg.evaluate(`(()=>{
    ${PD('.strcell[data-mi="1"][data-ci="0"][data-si="1"]', { pointerType: 'mouse', button: 0 })};
    const noQb=!document.getElementById('quickbar');
    const selOk=sel.row==='tab'&&sel.mi===1&&sel.ci===0&&sel.si===1;
    ${PD('.strcell[data-mi="1"][data-ci="0"][data-si="1"]', { pointerType: 'mouse', button: 2 })};
    const qb=!!document.getElementById('quickbar'); closeQuickbar();
    return {noQb, selOk, qb}; })()`);
  T(r.noQb && r.selOk && r.qb, 'T4 音符左键仅选中/右键弹浮条', JSON.stringify(r));

  // T5 触屏点按音符：自动弹出保持
  r = await pg.evaluate(`(()=>{
    ${PD('.strcell[data-mi="0"][data-ci="0"][data-si="3"]', { pointerType: 'touch', button: 0 })};
    const qb=!!document.getElementById('quickbar'); closeQuickbar(); return {qb}; })()`);
  T(r.qb, 'T5 触屏点按音符=自动弹出', JSON.stringify(r));

  // T6 #score contextmenu 默认菜单被屏蔽；右键不触发五线谱点击改音高（vocal 谱守卫）
  r = await pg.evaluate(`(()=>{
    const ev=new MouseEvent('contextmenu',{bubbles:true, cancelable:true});
    document.querySelector('#score').dispatchEvent(ev);
    if(typeof undoStack!=='undefined')undoStack.length=0;
    const s2=createSong('vocal',{title:'v',beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0});
    s2.measures[0].voxes[0]=[{dur:4,dotted:false,deg:3,acc:'',oct:0,lyrics:[]},{dur:4,dotted:false,deg:0,acc:'',oct:0,lyrics:[]}];
    loadSong(s2); setVoxNotation('staff'); sel={mi:0,row:'vox',vi:0,ci:0,si:1}; render();
    const cell=document.querySelector('[data-row="vox"][data-mi="0"][data-ci="0"]');
    const r2=cell.getBoundingClientRect();
    cell.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true, composed:true, pointerType:'mouse', button:2,
      clientX:r2.left+r2.width/2, clientY:r2.top+2}));
    const degKeep=song.measures[0].voxes[0][0].deg===3;
    closeQuickbar();
    return {prevented:ev.defaultPrevented, degKeep}; })()`);
  T(r.prevented && r.degKeep, 'T6 默认菜单屏蔽+右键不改音高', JSON.stringify(r));

  // T7 v51.9 多声部只亮被点的行：双吉他声部点吉他1小节线 → 高亮热区全部属 :tab:0，吉他2 不亮
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('guitar',{title:'r2',beats:4,unit:4,key:'C',nMea:2,nTab:2,nVox:0,lyr:0});
    loadSong(s); blurSel=false;
    const z=document.querySelector('#score .barzone[data-bar="0:1:tab:0"]');
    z.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true, composed:true, pointerType:'mouse', button:0}));
    document.dispatchEvent(new PointerEvent('pointerup', {bubbles:true}));
    const lit=[...document.querySelectorAll('#score .barzone')].filter(x=>x.getAttribute('fill-opacity')==='0.3');
    return {n:lit.length, allV0:lit.every(x=>x.dataset.bar.indexOf(':tab:0')>=0),
      v1lit:lit.some(x=>x.dataset.bar.indexOf(':tab:1')>=0)}; })()`);
  T(r.n >= 1 && r.allV0 && !r.v1lit, 'T7 多声部仅亮被点行', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
