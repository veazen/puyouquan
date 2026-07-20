const { chromium } = require('playwright');
const F=process.env.MUSETAB_URL || 'file://'+require('path').resolve(__dirname,'../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR:'+e.message)); pg.on('console',m=>{if(m.type()==='error'&&!/sounds|CORS|Failed to load|TUNNEL/.test(m.text()))errs.push('CONSOLE:'+m.text());});
  await pg.goto(F); await pg.waitForTimeout(900);

  // T1: 吉他预设 C→D（+2）：和弦与品位经由曲谱信息弹窗自动移调
  const t1 = await pg.evaluate(()=>{
    loadSong(PRESETS[0].make());
    const chordsBefore=[], fretsBefore=[];
    song.measures.forEach(m=>m.tabs.forEach(cs=>cs.forEach(c=>{ if(c.chord) chordsBefore.push(c.chord); (c.notes||[]).forEach(n=>fretsBefore.push(n.f)); })));
    document.getElementById('b-meta').click();
    document.getElementById('mm-key').value='D';
    document.getElementById('mm-ok').click();
    const chordsAfter=[], fretsAfter=[];
    song.measures.forEach(m=>m.tabs.forEach(cs=>cs.forEach(c=>{ if(c.chord) chordsAfter.push(c.chord); (c.notes||[]).forEach(n=>fretsAfter.push(n.f)); })));
    return { key:song.key,
      chPairs:[...new Set(chordsBefore.map((c,i)=>c+'→'+chordsAfter[i]))],
      fretOK: fretsBefore.every((f,i)=>fretsAfter[i]===f+2),
      degSame: true };
  });
  console.log('T1 C→D: key='+t1.key, '和弦:', t1.chPairs.join(' '), '| 品位全部+2:', t1.fretOK?'✅':'❌');

  // T2: 再 D→C 还原（-2）：回到原状
  const t2 = await pg.evaluate(()=>{
    const before=JSON.stringify(song.measures.map(m=>m.tabs));
    document.getElementById('b-meta').click();
    document.getElementById('mm-key').value='C';
    document.getElementById('mm-ok').click();
    const orig=PRESETS[0].make();
    return { same: JSON.stringify(song.measures.map(m=>m.tabs))===JSON.stringify(orig.measures.map(m=>m.tabs)) };
  });
  console.log('T2 D→C 还原与原版一致:', t2.same?'✅':'❌');

  // T3: C→A（-3）：低把位不越界则整体-3；含空弦(0品)时自动+9（八度补偿）
  const t3 = await pg.evaluate(()=>{
    const T=(f,s2)=>({dur:4,dotted:false,chord:'',notes:[{s:s2||1,f}],strum:''});
    const s=createSong('guitar',{title:'',beats:4,unit:4,key:'C',nMea:1,nTab:1,nVox:0,lyr:0});
    s.measures[0].tabs[0]=[T(0,1),T(2,2),T(1,3),T(3,4)];   // 含空弦
    loadSong(s);
    document.getElementById('b-meta').click();
    document.getElementById('mm-key').value='A';
    document.getElementById('mm-ok').click();
    return { frets: song.measures[0].tabs[0].map(c=>c.notes[0].f) };
  });
  console.log('T3 C→A 含空弦: 品位='+JSON.stringify(t3.frets)+' (期望整体+9: [9,11,10,12])', JSON.stringify(t3.frets)==='[9,11,10,12]'?'✅':'❌');

  // T4: 降调系拼写（C→F 应用降记号拼写：A♯→B♭ 类）+ 斜杠和弦/复合名
  const t4 = await pg.evaluate(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('func',{title:'',beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V(1,4,{chord:'C/E'}),V(4,4,{chord:'Fmaj7'}),V(5,4,{chord:'G7sus4'}),V(6,4,{chord:'Am7b5'})];
    loadSong(s);
    document.getElementById('b-meta').click();
    document.getElementById('mm-key').value='F';
    document.getElementById('mm-ok').click();
    return { chords: song.measures[0].voxes[0].map(c=>c.chord) };
  });
  const exp4=["F/A","Bbmaj7","C7sus4","Dm7b5"];
  console.log('T4 C→F 和弦拼写: '+JSON.stringify(t4.chords)+' 期望'+JSON.stringify(exp4), JSON.stringify(t4.chords)===JSON.stringify(exp4)?'✅':'❌');

  // T5: 简谱唱名不变 + Ctrl+Z 撤销整个换调
  const t5 = await pg.evaluate(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('vox',{title:'',beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V(1,4,{chord:'C'}),V(2,4),V(3,4),V(5,4)];
    loadSong(s);
    document.getElementById('b-meta').click();
    document.getElementById('mm-key').value='G';
    document.getElementById('mm-ok').click();
    const degs=song.measures[0].voxes[0].map(c=>c.deg).join('');
    const ch=song.measures[0].voxes[0][0].chord;
    return { degs, ch, key:song.key };
  });
  console.log('T5 C→G: 唱名='+t5.degs+'(期望1235不变) 和弦='+t5.ch+'(期望G) key='+t5.key, t5.degs==='1235'&&t5.ch==='G'?'✅':'❌');
  await pg.keyboard.press('Control+z'); await pg.waitForTimeout(200);
  const t5b = await pg.evaluate(()=>({ key:song.key, ch:song.measures[0].voxes[0][0].chord }));
  console.log('T5b Ctrl+Z 撤销: key='+t5b.key+'(期望C) 和弦='+t5b.ch+'(期望C)', t5b.key==='C'&&t5b.ch==='C'?'✅':'❌');

  console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'NO ERRORS');
  await b.close();
})();
