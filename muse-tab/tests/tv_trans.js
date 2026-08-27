const { chromium } = require('playwright');
const F=process.env.MUSETAB_URL || 'file://'+require('path').resolve(__dirname,'../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR:'+e.message)); pg.on('console',m=>{if(m.type()==='error'&&!/sounds|CORS|Failed to load|TUNNEL/.test(m.text()))errs.push('CONSOLE:'+m.text());});
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });   // v41.5 单窗口化：测试内直通未保存确认对话（tv_safety 专测该对话）

  /* v60.50 编辑器换调升级 v60.39 重排引擎（产品指示：编辑与浏览一致）——
     旧断言钉「品位全部+delta 逐品平移」正是被替换的行为（图与谱面演奏错位的根源）。
     新口径：伴奏列随新和弦图取形（逐弦在图上）、旋律列音高精确 ±delta、和弦名平移；
     往返（C→D→C）断言演奏音高与和弦还原（重排是正规化过程，不承诺逐字段字节还原）。 */
  const SNAP=`(()=>{
    const out=[];
    song.measures.forEach(m=>m.tabs.forEach(cs=>{ let cur='';
      cs.forEach(c=>{ if(c.chord) cur=c.chord;
        out.push({ chord:c.chord||'', cur,
          ps:(c.notes||[]).filter(n=>!n.x&&typeof n.f==='number').map(n=>tuningOf()[n.s-1]+n.f).sort((a,b2)=>a-b2) }); });
    }));
    return out; })()`;
  // T1: 吉他预设 C→D（+2）：和弦平移；逐列 伴奏在新图上 或 音高精确+2
  const t1 = await pg.evaluate(`(()=>{
    loadSong(PRESETS[0].make());
    const before=${SNAP};
    document.getElementById('b-meta').click();
    document.getElementById('mm-key').value='D';
    document.getElementById('mm-ok').click();
    const after=${SNAP};
    const chPairs=[...new Set(before.map((x,i)=>x.chord? x.chord+'→'+after[i].chord:'').filter(Boolean))];
    let badCol=-1;
    /* 逐列核验（直接扫谱面列，序与快照一致） */
    let i=0, ok=true;
    song.measures.forEach(m=>m.tabs.forEach(cs=>cs.forEach(c=>{
      const x=before[i], y=after[i]; i++;
      const real=(c.notes||[]).filter(n=>!n.x&&typeof n.f==='number');
      if(!real.length) return;
      const sh=chordShape(y.cur);
      const onShape= !!sh && real.every(n=>shapeString(sh,n.s)===n.f);
      const shifted= x.ps.length===y.ps.length && x.ps.every((pp,k)=>y.ps[k]===pp+2);
      if(!(onShape||shifted)){ ok=false; if(badCol<0) badCol=i-1; }
    })));
    return { key:song.key, chPairs, ok, badCol };
  })()`);
  console.log('T1 C→D: key='+t1.key, '和弦:', t1.chPairs.join(' '), '| 逐列 伴奏随图/旋律+2:', t1.ok?'✅':('❌ 首个不符列 '+t1.badCol));

  // T2: 再 D→C（-2）：和弦名/调号还原，逐列仍音乐正确（伴奏在 C 图上 / 旋律音高还原）。
  //     注意：往返不承诺字节还原——C 图 5 发声弦→D 图 4 弦（rank 映射多余随图裁）属 v60.39
  //     拍板语义，往返后织体被正规化（Ctrl+Z 可整体找回），断言按「音乐正确」口径。
  const t2 = await pg.evaluate(`(()=>{
    const beforeD=${SNAP};
    document.getElementById('b-meta').click();
    document.getElementById('mm-key').value='C';
    document.getElementById('mm-ok').click();
    const after=${SNAP};
    const orig=(()=>{ const o=PRESETS[0].make(); const out=[];
      o.measures.forEach(m=>m.tabs.forEach(cs=>{ let cur='';
        cs.forEach(c=>{ if(c.chord) cur=c.chord; out.push({ch:c.chord||''}); }); }));
      return out; })();
    const chSame= orig.length===after.length && orig.every((x,i)=> x.ch===after[i].chord);
    let i=0, ok=true, bad=-1;
    song.measures.forEach(m=>m.tabs.forEach(cs=>cs.forEach(c=>{
      const x=beforeD[i], y=after[i]; i++;
      const real=(c.notes||[]).filter(n=>!n.x&&typeof n.f==='number');
      if(!real.length) return;
      const sh=chordShape(y.cur);
      const onShape= !!sh && real.every(n=>shapeString(sh,n.s)===n.f);
      const shifted= x.ps.length===y.ps.length && x.ps.every((pp,k)=>y.ps[k]===pp-2);
      if(!(onShape||shifted)){ ok=false; if(bad<0) bad=i-1; }
    })));
    return { chSame, ok, bad, key:song.key };
  })()`);
  console.log('T2 D→C 往返（和弦还原+逐列音乐正确）: key='+t2.key, (t2.chSame&&t2.ok&&t2.key==='C')?'✅':('❌ '+JSON.stringify({chSame:t2.chSame,ok:t2.ok,bad:t2.bad})));

  // T3: C→A（-3）无和弦语境：旋律重排音高精确 -3（不再逐品平移+八度补偿）
  const t3 = await pg.evaluate(()=>{
    const T=(f,s2)=>({dur:4,dotted:false,chord:'',notes:[{s:s2||1,f}],strum:''});
    const s=createSong('guitar',{title:'',beats:4,unit:4,key:'C',nMea:1,nTab:1,nVox:0,lyr:0});
    s.measures[0].tabs[0]=[T(0,1),T(2,2),T(1,3),T(3,4)];   // 音高 64,61,56,53
    loadSong(s);
    document.getElementById('b-meta').click();
    document.getElementById('mm-key').value='A';
    document.getElementById('mm-ok').click();
    return { ps: song.measures[0].tabs[0].map(c=>{ const n=c.notes[0]; return tuningOf()[n.s-1]+n.f; }) };
  });
  console.log('T3 C→A 旋律重排: 音高='+JSON.stringify(t3.ps)+' (期望精确-3: [61,58,53,50])', JSON.stringify(t3.ps)==='[61,58,53,50]'?'✅':'❌');

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
