/* v43.5 变拍子（per-measure 拍号 mea.beats/mea.unit）回归：
   T1 meaMeter/beatsOf：mea 覆盖优先；beatsOf(c,unit) 按传入 unit
   T2 beatErrors 按本小节拍号：3/4 小节放 3 拍不报错、放 4 拍报错；4/4 小节 4 拍不报错
   T3 beamGroups 按本小节 unit：6/8(unit8) 八分按 3 成组、4/4(unit4) 按 1
   T4 渲染变拍号：简谱中途转 3/4 → 小节头标 "3/4" 文字；五线谱多一枚拍号字形
   T5 播放 measureSeconds 按本小节拍号（3/4=3拍、4/4=4拍）
   T6 MusicXML 往返：<time> 变更导出 + 导入还原 mea.beats/unit
   T7 showMeaMeterMenu 逻辑：mea.beats/unit 设置 + autoFix 补齐
   file:// 直载；guardReplace 直通；载入前清 undoStack。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(800);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 meaMeter + beatsOf 单位
  let r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('vocal',{title:'x',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:0});
    s.measures[1].beats=3; s.measures[1].unit=4; loadSong(s);
    const q={dur:4,dotted:false,deg:1};
    return {m0:meaMeter(0), m1:meaMeter(1), q4:beatsOf(q,4), q8:beatsOf(q,8)}; })()`);
  T(r.m0.beats===4 && r.m0.unit===4 && r.m1.beats===3 && r.m1.unit===4 && r.q4===1 && r.q8===2, 'T1 meaMeter+beatsOf 单位', JSON.stringify(r));

  // T2 beatErrors 按本小节拍号
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('vocal',{title:'x',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V(1,4),V(2,4),V(3,4),V(4,4)];       // 4/4 满
    s.measures[1].beats=3; s.measures[1].unit=4;
    s.measures[1].voxes[0]=[V(1,4),V(2,4),V(3,4)];              // 3/4 满
    loadSong(s); const e1=beatErrors().length;
    s.measures[1].voxes[0]=[V(1,4),V(2,4),V(3,4),V(4,4)];       // 3/4 超拍
    loadSong(s); const e2=beatErrors().filter(e=>e.mi===1).length;
    return {e1, e2}; })()`);
  T(r.e1===0 && r.e2>=1, 'T2 beatErrors 按本小节拍号', JSON.stringify(r));

  // T3 beamGroups 按本小节 unit
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('vocal',{title:'x',key:'C',beats:6,unit:8,nMea:1,nVox:1,lyr:0}); loadSong(s);
    const E=()=>({dur:8,dotted:false,deg:1,acc:'',oct:0,lyrics:[],tie:false});
    const g68=beamGroups(Array.from({length:6},E),null,8).map(x=>x.idx.length);
    const g44=beamGroups(Array.from({length:6},E),null,4).map(x=>x.idx.length);
    return {g68, g44}; })()`);
  T(JSON.stringify(r.g68)==='[3,3]' && JSON.stringify(r.g44)==='[2,2,2]', 'T3 beamGroups 按本小节 unit(6/8=3+3, 4/4=2+2+2)', JSON.stringify(r));

  // T4 渲染变拍号（简谱中途转 3/4）
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('vocal',{title:'x',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V(1,4),V(2,4),V(3,4),V(4,4)];
    s.measures[1].beats=3; s.measures[1].unit=4; s.measures[1].voxes[0]=[V(1,4),V(2,4),V(3,4)];
    loadSong(s); const h=document.getElementById('score').innerHTML;
    return {jp34:h.indexOf('>3/4</text>')>=0, clean:h.indexOf('NaN')<0}; })()`);
  T(r.jp34 && r.clean, 'T4 简谱中途变拍号标注', JSON.stringify(r));

  // T5 measureSeconds 按本小节拍号
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('vocal',{title:'x',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V(1,4),V(2,4),V(3,4),V(4,4)];
    s.measures[1].beats=3; s.measures[1].unit=4; s.measures[1].voxes[0]=[V(1,4),V(2,4),V(3,4)];
    loadSong(s);
    return {s0:measureSeconds(0,0.5), s1:measureSeconds(1,0.5)}; })()`);
  T(Math.abs(r.s0-2)<1e-6 && Math.abs(r.s1-1.5)<1e-6, 'T5 measureSeconds 按本小节拍号', JSON.stringify(r));

  // T6 MusicXML 往返 <time> 变更
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('instr',{title:'x',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:0,clef:'staff'});
    s.measures[0].voxes[0]=[V(1,4),V(2,4),V(3,4),V(4,4)];
    s.measures[1].beats=3; s.measures[1].unit=4; s.measures[1].voxes[0]=[V(1,4),V(2,4),V(3,4)];
    loadSong(s); const xml=exportMusicXML(song);
    const r6=importMusicXML(xml).song;
    return {exp34:xml.indexOf('<time><beats>3</beats><beat-type>4</beat-type></time>')>=0,
      rt:r6.measures[1].beats===3 && r6.measures[1].unit===4, rt0:!r6.measures[0].beats}; })()`);
  T(r.exp34 && r.rt && r.rt0, 'T6 MusicXML 变拍号往返', JSON.stringify(r));

  // T7 showMeaMeterMenu 数据效果（直接调 mutate 等价逻辑：设 mea.beats/unit + autoFix）
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('vocal',{title:'x',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:0});
    s.measures[1].voxes[0]=[V(1,4),V(2,4),V(3,4),V(4,4)]; loadSong(s);
    sel={mi:1,row:'vox',vi:0,ci:0,si:1};
    const m=song.measures[1]; m.beats=3; m.unit=4; autoFixMeasure(1,'vox',0);
    const sum=song.measures[1].voxes[0].reduce((a,c)=>a+beatsOf(c,4),0);
    return {beats:m.beats, unit:m.unit, sum, noErr:beatErrors().filter(e=>e.mi===1).length===0}; })()`);
  T(r.beats===3 && r.unit===4 && Math.abs(r.sum-3)<1e-6 && r.noErr, 'T7 设本小节拍号+autoFix', JSON.stringify(r));

  T(errs.length === 0, '全程无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
