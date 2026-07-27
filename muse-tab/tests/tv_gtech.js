/* v42.3 吉他三分类 + 演奏技巧符号回归：
   - gtype='lead'(电吉他独奏)/'finger'(指弹) 专属技法面板按 song.gtype 显隐并随切换刷新
   - 电吉他：摇把 note.bar / 泛音细分 note.hmT(A.H/P.H/T.H) / let ring note.tech='lr' / 特殊调弦 song.tuning 谱首标注
   - 指弹：右手指法 note.rhFing(pima) / 打板 col.perc
   - N.C. 无和弦；applyGtech 落字段；清除技法一并清 bar/hmT/rhFing
   file:// 直载；每次载入前清 undoStack 绕过 guardReplace。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(800);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 电吉他独奏：gtype/tuning 落地 + 专属技法面板（摇把/泛音/let ring，无指弹按钮）
  let r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('solo',{title:'x',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead',tuning:TUNINGS.dropD.t});
    s.measures[0].tabs[0][0].notes=[{s:1,f:7}]; loadSong(s); setRibbon('tab');
    const g=[...document.querySelectorAll('[data-gtech]')].map(x=>x.dataset.gtech);
    return {dt:docType(song), gt:song.gtype, tune:!!song.tuning, hasBar:g.includes('bar:dive'), hasHm:g.includes('hm:A'), hasLr:g.includes('tech:lr'), noFinger:!g.includes('rhFing:p'), n:g.length}; })()`);
  T(r.dt === 'solo' && r.gt === 'lead' && r.tune && r.hasBar && r.hasHm && r.hasLr && r.noFinger && r.n === 8, 'T1 电吉他gtype+专属面板', JSON.stringify(r));

  // T2 电吉他记号渲染 + Drop D 谱首标注 + N.C.
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('solo',{title:'x',key:'C',beats:4,unit:4,nMea:2,nTab:1,nVox:0,lyr:0,gtype:'lead',tuning:TUNINGS.dropD.t});
    const mk=(o)=>({dur:8,dotted:false,chord:o.chord||'',notes:o.notes||[],strum:'',tech:''});
    s.measures[0].tabs[0]=[mk({notes:[{s:1,f:7,tech:'hm',hmT:'A'}]}),mk({notes:[{s:2,f:5,tech:'hm',hmT:'P'}]}),mk({notes:[{s:3,f:7,bar:'dive'}]}),mk({notes:[{s:1,f:5,tech:'lr',tk:{mi:0,ci:5,si:1}}]}),mk({notes:[{s:1,f:7}]}),mk({notes:[{s:1,f:8}]}),mk({notes:[{s:1,f:5}]}),mk({chord:'N.C.',notes:[{s:1,f:7}]})];
    loadSong(s); const h=document.getElementById('score').innerHTML;
    return {ah:h.includes('A.H'),ph:h.includes('P.H'),bar:h.includes('w/bar'),lr:h.includes('let ring'),drop:h.includes('Drop D'),nc:h.includes('N.C.'),nan:h.includes('NaN'),undef:h.includes('undefined')}; })()`);
  T(r.ah && r.ph && r.bar && r.lr && r.drop && r.nc && !r.nan && !r.undef, 'T2 电吉他记号+调弦标注', JSON.stringify(r));

  // T3 applyGtech 落字段（摇把/泛音细分）
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('solo',{title:'x',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
    s.measures[0].tabs[0][0].notes=[{s:1,f:7}]; loadSong(s);
    sel={mi:0,row:'tab',vi:0,ci:0,si:1}; noteSel=[{mi:0,ci:0,si:1,vi:0,row:'tab'}];
    applyGtech('bar','dive'); applyGtech('hm','T');
    const n=song.measures[0].tabs[0][0].notes[0];
    return {bar:n.bar, hm:n.hmT, tech:n.tech}; })()`);
  T(r.bar === 'dive' && r.hm === 'T' && r.tech === 'hm', 'T3 applyGtech摇把/泛音', JSON.stringify(r));

  // T4 指弹：切换后面板刷新（pima/打板/let ring，无摇把）
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('solo',{title:'y',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'finger'});
    s.measures[0].tabs[0][0].notes=[{s:3,f:0}]; loadSong(s); setRibbon('tab');
    const g=[...document.querySelectorAll('[data-gtech]')].map(x=>x.dataset.gtech);
    return {gt:song.gtype, hasRh:g.includes('rhFing:p'), hasPerc:g.includes('perc:bass'), hasLr:g.includes('tech:lr'), noBar:!g.includes('bar:dive'), n:g.length}; })()`);
  T(r.gt === 'finger' && r.hasRh && r.hasPerc && r.hasLr && r.noBar && r.n === 8, 'T4 指弹面板刷新', JSON.stringify(r));

  // T5 指弹记号渲染（pima + 打板×2）
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('solo',{title:'y',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'finger'});
    const mk=(o)=>({dur:8,dotted:false,chord:'',notes:o.notes||[],strum:'',tech:'',perc:o.perc});
    s.measures[0].tabs[0]=[mk({notes:[{s:5,f:0,rhFing:'p'}]}),mk({notes:[{s:3,f:0,rhFing:'i'}]}),mk({notes:[{s:2,f:1,rhFing:'m'}]}),mk({notes:[{s:1,f:0,rhFing:'a'}]}),mk({perc:'bass'}),mk({perc:'snare'})];
    loadSong(s); const h=document.getElementById('score').innerHTML;
    return {pima:h.includes('>p</text>')&&h.includes('>a</text>'), perc:(h.match(/>×<\\/text>/g)||[]).length, nan:h.includes('NaN'), undef:h.includes('undefined')}; })()`);
  T(r.pima && r.perc === 2 && !r.nan && !r.undef, 'T5 指弹pima+打板渲染', JSON.stringify(r));

  // T6 applyGtech 指弹字段（rhFing 音符级 / perc 列级）
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('solo',{title:'y',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'finger'});
    s.measures[0].tabs[0][0].notes=[{s:3,f:0}]; loadSong(s);
    sel={mi:0,row:'tab',vi:0,ci:0,si:3}; noteSel=[{mi:0,ci:0,si:3,vi:0,row:'tab'}];
    applyGtech('rhFing','m'); const rh=song.measures[0].tabs[0][0].notes[0].rhFing;
    sel={mi:0,row:'tab',vi:0,ci:1,si:1}; noteSel=[]; applyGtech('perc','golpe');
    const pc=song.measures[0].tabs[0][1].perc;
    return {rh, pc}; })()`);
  T(r.rh === 'm' && r.pc === 'golpe', 'T6 applyGtech指弹字段', JSON.stringify(r));

  // T7 清除技法一并清 bar/hmT/rhFing
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('solo',{title:'z',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
    s.measures[0].tabs[0][0].notes=[{s:1,f:7,tech:'hm',hmT:'A',bar:'dive',rhFing:'p'}]; loadSong(s);
    sel={mi:0,row:'tab',vi:0,ci:0,si:1}; noteSel=[{mi:0,ci:0,si:1,vi:0,row:'tab'}];
    applyTech(''); const n=song.measures[0].tabs[0][0].notes[0];
    return {tech:n.tech, hmT:n.hmT, bar:n.bar, rhFing:n.rhFing}; })()`);
  T(!r.tech && !r.hmT && !r.bar && !r.rhFing, 'T7 清除技法全清', JSON.stringify(r));

  // T8 弹唱谱(guitar)不显示 gtype 专属技法（无 gtype）
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('tanchang',{title:'弹唱',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:1,lyr:1});
    loadSong(s); setRibbon('tab');
    const g=[...document.querySelectorAll('[data-gtech]')].map(x=>x.dataset.gtech);
    return {dt:docType(song), gt:song.gtype||null, n:g.length}; })()`);
  T(r.dt === 'guitar' && r.gt === null && r.n === 0, 'T8 弹唱无gtype技法', JSON.stringify(r));

  // T8b v49.5 框选：鼠标拖框圈选 TAB 音符 → noteSel 批量入选 → P.M. 范围落数据
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('solo',{title:'mq',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
    const mk=(o)=>({dur:4,dotted:false,chord:'',notes:o.notes||[],strum:o.strum||'',tech:''});
    s.measures[0].tabs[0]=[mk({strum:'d',notes:[{s:1,f:0},{s:2,f:1},{s:3,f:2}]}),mk({notes:[{s:1,f:3}]}),mk({notes:[{s:1,f:5}]}),mk({notes:[{s:1,f:7}]})];
    loadSong(s); noteSel=[];
    let x1=1e9,y1=1e9,x2=-1e9,y2=-1e9;
    document.querySelectorAll('#score .strcell, #score .strumcell').forEach(c=>{ if(+c.dataset.mi!==0) return;
      const r2=c.getBoundingClientRect(); x1=Math.min(x1,r2.left); y1=Math.min(y1,r2.top); x2=Math.max(x2,r2.right); y2=Math.max(y2,r2.bottom); });
    return {x1:x1-3,y1:y1-3,x2:x2+3,y2:y2+3}; })()`);
  await pg.mouse.move(r.x1, r.y1);
  await pg.mouse.down();
  await pg.mouse.move((r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2, { steps: 4 });
  await pg.mouse.move(r.x2, r.y2, { steps: 4 });
  await pg.mouse.up();
  await pg.waitForTimeout(200);
  r = await pg.evaluate(`(()=>{
    const nsel=noteSel.length;
    applyTech('pm');
    const c0=song.measures[0].tabs[0][0], n0=c0.notes.find(n=>n.s===1);
    const last=song.measures[0].tabs[0][3].notes[0];
    return {nsel, tech:n0&&n0.tech, tk:n0&&n0.tk? n0.tk.mi+':'+n0.tk.ci+':'+n0.tk.si : null,
      midClean: !song.measures[0].tabs[0][1].notes[0].tech}; })()`);
  T(r.nsel === 6 && r.tech === 'pm' && r.tk === '0:3:1' && r.midClean,
    'T8b 框选6音符→P.M.范围（首音带记号连至末音，中间不重复标）', JSON.stringify(r));

  // T8c v49.7 Shift+点击多选（Ctrl 等效键——避开本机双击 Ctrl 全局热键误唤系统搜索）
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('solo',{title:'sh',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
    const mk=(o)=>({dur:4,dotted:false,chord:'',notes:o.notes||[],strum:'',tech:''});
    s.measures[0].tabs[0]=[mk({notes:[{s:1,f:5}]}),mk({notes:[{s:1,f:7}]}),mk({notes:[{s:1,f:8}]}),mk({notes:[{s:1,f:5}]})];
    loadSong(s); noteSel=[];
    const cell=(ci)=>[...document.querySelectorAll('#score .strcell')].find(c=>+c.dataset.mi===0&&+c.dataset.ci===ci&&+c.dataset.si===1);
    [0,1].forEach(ci=>cell(ci).dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,shiftKey:true,pointerType:'mouse',button:0})));
    return {n:noteSel.length, k:noteSel.map(q=>q.ci).join(',')}; })()`);
  T(r.n === 2 && r.k === '0,1', 'T8c Shift+点击多选（Ctrl 等效键）', JSON.stringify(r));

  // T8d v50.1 连线滑弦方向斜杠：目标高→上行 ╱（y1>y2），目标低→下行 ╲（y1<y2）
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('solo',{title:'sd',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
    const mk=(o)=>({dur:4,dotted:false,chord:'',notes:o.notes||[],strum:'',tech:''});
    s.measures[0].tabs[0]=[mk({notes:[{s:2,f:5,tech:'sl',tk:{mi:0,ci:1,si:2}}]}),mk({notes:[{s:2,f:7}]}),
      mk({notes:[{s:2,f:7,tech:'sl',tk:{mi:0,ci:3,si:2}}]}),mk({notes:[{s:2,f:5}]})];
    loadSong(s);
    const ls=[...document.querySelectorAll('#score line.sldg')].map(l=>({y1:+l.getAttribute('y1'),y2:+l.getAttribute('y2')}));
    return {n:ls.length, up:ls[0]&&ls[0].y1>ls[0].y2, dn:ls[1]&&ls[1].y1<ls[1].y2}; })()`);
  T(r.n === 2 && r.up && r.dn, 'T8d 连线滑弦方向斜杠（高→╱ 低→╲）', JSON.stringify(r));

  // T8e v50.2 普通滑音（无 tk）自带斜杠：自动向后找最近音符定方向；无后续音符→默认向上短斜杠
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('solo',{title:'se',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
    const mk=(o)=>({dur:4,dotted:false,chord:'',notes:o.notes||[],strum:'',tech:''});
    s.measures[0].tabs[0]=[mk({notes:[{s:2,f:5,tech:'sl'}]}),mk({notes:[{s:2,f:9}]}),
      mk({notes:[{s:2,f:9,tech:'sl'}]}),mk({notes:[{s:2,f:5,tech:'sl'}]})];
    loadSong(s);
    const ls=[...document.querySelectorAll('#score line.sldg')].map(l=>({y1:+l.getAttribute('y1'),y2:+l.getAttribute('y2')}));
    return {n:ls.length, up:ls[0]&&ls[0].y1>ls[0].y2, dn:ls[1]&&ls[1].y1<ls[1].y2,
      tail:ls[2]&&ls[2].y1>ls[2].y2}; })()`);
  T(r.n === 3 && r.up && r.dn && r.tail, 'T8e 普通滑音自带斜杠（自动找后续音符/无后续默认↗）', JSON.stringify(r));

  T(errs.length === 0, 'T9 全程无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
