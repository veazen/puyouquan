/* v43.2 滑音 gliss 回归：
   T1 五线谱：col.gliss 从本音直线滑到下一音，线斜率随音高（上行 y1>y2）；宽间距标 gliss.
   T2 简谱：同理，方向随 voxMidi
   T3 跨小节：末音 gliss 连到下一小节首音（多出一条线）
   T4 toggleGliss 切换 + 休止豁免；末音无下一音不画
   加线判定：对比有/无 gliss 时 stroke-width="1.1" 线数 +1。file:// 直载；载入前清 undoStack。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(800);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 五线谱 gliss：+1 条线 + gliss. 文字
  let r = await pg.evaluate(`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const mk=(g)=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
      const s=createSong('instr',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0,clef:'staff'});
      s.measures[0].voxes[0]=[V(1,2,g?{gliss:true}:{}),V(5,2,{oct:1})]; loadSong(s);
      return document.getElementById('score').innerHTML; };
    const h0=mk(false), h1=mk(true);
    const n=(h)=>(h.match(/stroke-width="1.1"/g)||[]).length;
    return {diff:n(h1)-n(h0), gliss:h1.indexOf('>gliss.</text>')>=0, clean:h1.indexOf('NaN')<0}; })()`);
  T(r.diff === 1 && r.gliss && r.clean, 'T1 五线谱 gliss 连线+文字', JSON.stringify(r));

  // T2 简谱 gliss
  r = await pg.evaluate(`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const mk=(g)=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
      const s=createSong('vocal',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0});
      s.measures[0].voxes[0]=[V(1,2,g?{gliss:true}:{}),V(6,2)]; loadSong(s);
      return document.getElementById('score').innerHTML; };
    const h0=mk(false), h1=mk(true);
    const n=(h)=>(h.match(/stroke-width="1.1"/g)||[]).length;
    return {diff:n(h1)-n(h0), gliss:h1.indexOf('>gliss.</text>')>=0}; })()`);
  T(r.diff === 1 && r.gliss, 'T2 简谱 gliss 连线', JSON.stringify(r));

  // T3 跨小节 gliss
  r = await pg.evaluate(`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const mk=(g)=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
      const s=createSong('instr',{title:'x',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:0,clef:'staff'});
      s.measures[0].voxes[0]=[V(1,4),V(2,4),V(3,4),V(5,4,g?{gliss:true}:{})];
      s.measures[1].voxes[0]=[V(1,4,{oct:1}),V(2,4),V(3,4),V(4,4)]; loadSong(s);
      return document.getElementById('score').innerHTML; };
    const h0=mk(false), h1=mk(true);
    const n=(h)=>(h.match(/stroke-width="1.1"/g)||[]).length;
    return {diff:n(h1)-n(h0)}; })()`);
  T(r.diff === 1, 'T3 跨小节 gliss 续接', JSON.stringify(r));

  // T4 toggleGliss + 休止豁免 + 末音无下一音不画
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('vocal',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V(1,4),V(0,4),V(3,4),V(5,4)]; loadSong(s);
    sel={mi:0,row:'vox',vi:0,ci:0,si:1}; toggleGliss(); const on=!!song.measures[0].voxes[0][0].gliss;
    toggleGliss(); const off=!!song.measures[0].voxes[0][0].gliss;
    sel={mi:0,row:'vox',vi:0,ci:1,si:1}; toggleGliss(); const rest=!!song.measures[0].voxes[0][1].gliss;
    // 末音 gliss 无下一音：不新增线
    const nBefore=(document.getElementById('score').innerHTML.match(/stroke-width="1.1"/g)||[]).length;
    sel={mi:0,row:'vox',vi:0,ci:3,si:1}; song.measures[0].voxes[0][3].gliss=true; render();
    const nAfter=(document.getElementById('score').innerHTML.match(/stroke-width="1.1"/g)||[]).length;
    return {on, off, rest, lastNoLine:nAfter===nBefore}; })()`);
  T(r.on && !r.off && !r.rest && r.lastNoLine, 'T4 toggle+休止豁免+末音不画', JSON.stringify(r));

  T(errs.length === 0, '全程无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
