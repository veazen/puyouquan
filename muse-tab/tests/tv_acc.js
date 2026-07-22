const { chromium } = require('playwright');
const F=process.env.MUSETAB_URL || 'file://'+require('path').resolve(__dirname,'../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR:'+e.message)); pg.on('console',m=>{if(m.type()==='error'&&!/sounds|CORS|Failed to load|TUNNEL/.test(m.text()))errs.push('CONSOLE:'+m.text());});
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });   // v41.5 单窗口化：测试内直通未保存确认对话（tv_safety 专测该对话）
  let pass=0;

  // T1 纯和弦谱：斜线数量=拍数×小节、和弦标注、无简谱数字
  const t1 = await pg.evaluate(()=>{
    const s=createSong('func',{ftype:'chord',nVox:1,lyr:0,beats:4,unit:4,key:'C',nMea:4});
    s.measures[0].voxes[0][0].chord='C'; s.measures[1].voxes[0][0].chord='Am';
    s.measures[2].voxes[0][0].chord='F'; s.measures[2].voxes[0][2].chord='G';
    s.measures[3].voxes[0][0].chord='C'; s.measures[3].repeatEnd=true;
    loadSong(s); blurSel=true; render();
    const h=document.getElementById('score').innerHTML;
    return { slashes:(h.match(/stroke-width="2.2"/g)||[]).length,
      chords:(h.match(/data-vchord/g)||[]).length>0,
      noDigits:!/font-size="16\.5"/.test(h), nan:h.includes('NaN'), type:docType(song) };
  });
  console.log('T1 纯和弦谱: 斜线='+t1.slashes+'(期望16) 和弦区='+t1.chords+' 无简谱数字='+t1.noDigits+' type='+t1.type,
    t1.slashes===16&&t1.chords&&t1.noDigits&&!t1.nan?'✅':'❌');
  await pg.waitForTimeout(200);
  let r=await pg.evaluate(()=>{ const r2=document.getElementById('score').getBoundingClientRect(); return {x:r2.x,y:r2.y,w:r2.width}; });
  await pg.screenshot({path:'v374-chart.png', clip:{x:Math.max(0,r.x), y:Math.max(0,r.y+95), width:Math.min(1100,r.w), height:230}});

  // T2 伴奏织体生成：C/G/Am/F → 抒情分解
  const t2 = await pg.evaluate(()=>{
    const s=createSong('pianoacc',{lyr:1,beats:4,unit:4,key:'C',nMea:4,title:'织体测试'});
    ['C','G','Am','F'].forEach((ch,i)=>{ s.measures[i].voxes[0][0].chord=ch; });
    s.measures[0].voxes[0][0].lyrics=['词'];
    loadSong(s);
    let res; mutate(()=>{ res=genAccompaniment('slow',0,3); });
    const m0R=song.measures[0].voxes[0], m0L=song.measures[0].voxes[1];
    const m2L=song.measures[2].voxes[1];
    return { res,
      // C大调 slow：左手 1(C3=oct-1 deg1) 5(G3)；右手8分 3 5 8 5...（deg 3,5,1̇...）
      LH0: m0L.map(c=>c.deg+''+(c.oct||0)).join(' '),
      RH0: m0R.slice(0,4).map(c=>c.deg+''+(c.oct||0)).join(' '),
      chordKept: m0R[0].chord==='C', lyrKept: (m0R[0].lyrics||[])[0]==='词',
      // Am 小三和弦：三音应为小三度 C（deg1）
      AmRH_third: m2L.length===2 && song.measures[2].voxes[0][0].deg!==undefined };
  });
  const okT2 = t2.res.done===4 && t2.LH0==='1-1 5-1' && t2.RH0.startsWith('30 50 11 50') && t2.chordKept && t2.lyrKept;
  console.log('T2 织体生成: done='+t2.res.done+'/4 左手='+t2.LH0+'(期望 1-1 5-1) 右手前4='+t2.RH0+'(期望 30 50 11 50) 和弦保留='+t2.chordKept+' 歌词保留='+t2.lyrKept, okT2?'✅':'❌');
  await pg.waitForTimeout(250);
  r=await pg.evaluate(()=>{ blurSel=true; render(); const r2=document.getElementById('score').getBoundingClientRect(); return {x:r2.x,y:r2.y,w:r2.width}; });
  await pg.screenshot({path:'v375-acc.png', clip:{x:Math.max(0,r.x), y:Math.max(0,r.y+95), width:Math.min(1100,r.w), height:330}});

  // T3 弹窗流程 + 无和弦提示
  const t3 = await pg.evaluate(()=>{
    const s=createSong('pianoacc',{lyr:0,beats:4,unit:4,key:'C',nMea:2});
    loadSong(s);
    const btnVisible = document.getElementById('b-acctex').style.display!=='none';
    document.getElementById('b-acctex').click();
    const modal = !!document.querySelector('input[name="tex"]');
    if(modal) document.getElementById('tex-go').click();
    return {btnVisible, modal};
  });
  console.log('T3 弹窗: 按钮可见='+t3.btnVisible+' 织体列表='+t3.modal, t3.btnVisible&&t3.modal?'✅':'❌');

  // T4 换调联动：生成后 C→D，左手根音移调
  const t4 = await pg.evaluate(()=>{
    const s=createSong('pianoacc',{lyr:0,beats:4,unit:4,key:'C',nMea:1});
    s.measures[0].voxes[0][0].chord='C';
    loadSong(s);
    mutate(()=>genAccompaniment('slow',0,0));
    document.getElementById('b-meta').click();
    document.getElementById('mm-key').value='D';
    document.getElementById('mm-ok').click();
    return { chord:song.measures[0].voxes[0][0].chord, key:song.key };
  });
  console.log('T4 换调联动: C→D 后和弦='+t4.chord+'(期望D)', t4.chord==='D'?'✅':'❌');

  // T5 配和弦建议：清晰旋律 → I F G C；不覆盖已有和弦
  const t5 = await pg.evaluate(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('pianoacc',{lyr:0,beats:4,unit:4,key:'C',nMea:4});
    s.measures[0].voxes[0]=[V(1,4),V(3,4),V(5,4),V(3,4)];
    s.measures[1].voxes[0]=[V(4,4),V(6,4),V(1,4,{oct:1}),V(6,4)];
    s.measures[2].voxes[0]=[V(5,4),V(7,4),V(2,4,{oct:1}),V(7,4)];
    s.measures[3].voxes[0]=[V(1,4),V(1,4),V(1,2)];
    s.measures[1].voxes[0][0].chord='Dm';        // 已有和弦，应保留
    loadSong(s);
    const sug=suggestChords(song,0);
    let n; mutate(()=>{ n=applySuggestChords(); });
    return { sug, n, m1:song.measures[1].voxes[0][0].chord,
      applied:[0,2,3].map(i=>song.measures[i].voxes[0][0].chord) };
  });
  const ok5 = t5.sug.join()==='C,F,G,C' && t5.n===3 && t5.m1==='Dm' && t5.applied.join()==='C,G,C';
  console.log((ok5?'✅':'❌')+' T5 配和弦: 建议='+t5.sug.join(' ')+'(期望 C F G C) 填入='+t5.n+'/3 已有Dm保留='+(t5.m1==='Dm'));
  if(ok5) pass++;
  // T6 难度分级 + 新织体生成
  const t6 = await pg.evaluate(()=>{
    const allLv = PIANO_TEX.every(t=>t.level==='入门'||t.level==='进阶');
    const ids = PIANO_TEX.map(t=>t.id);
    const s=createSong('pianoacc',{lyr:0,beats:4,unit:4,key:'C',nMea:2});
    s.measures[0].voxes[0][0].chord='C'; s.measures[1].voxes[0][0].chord='G';
    loadSong(s);
    mutate(()=>genAccompaniment('march',0,1));
    const r0=song.measures[0].voxes[0], l0=song.measures[0].voxes[1];
    const rOK = r0.length===8 && (r0[1].adds||[]).length===2 && r0[0].deg===0;
    mutate(()=>genAccompaniment('arp16',0,1));
    const r16=song.measures[0].voxes[0].filter(c=>c.deg).length;
    const h=document.getElementById('score').innerHTML;
    return { allLv, hasNew:['march','arp16','kids'].every(i=>ids.includes(i)), n:ids.length,
      marchOK:rOK, arp16Notes:r16, renderOK:h.length>1000 && !h.includes('NaN') };
  });
  const ok6 = t6.allLv && t6.hasNew && t6.n===11 && t6.marchOK && t6.arp16Notes===16 && t6.renderOK;
  console.log((ok6?'✅':'❌')+' T6 织体库: 共'+t6.n+'套(期望11) 分级='+t6.allLv+' 新增齐='+t6.hasNew+' 进行曲后半拍柱式='+t6.marchOK+' 全分解16音='+t6.arp16Notes+' 渲染='+t6.renderOK);
  if(ok6) pass++;
  // T7 弹窗含配和弦按钮与分组
  const t7 = await pg.evaluate(()=>{
    const s=createSong('pianoacc',{lyr:0,beats:4,unit:4,key:'C',nMea:1}); loadSong(s);
    document.getElementById('b-acctex').click();
    const hasSug=!!document.getElementById('tex-sug');
    const radios=document.querySelectorAll('input[name="tex"]').length;
    document.getElementById('tex-cancel').click();
    return {hasSug, radios};
  });
  const ok7 = t7.hasSug && t7.radios===9;   // 4/4 拍织体 9 套
  console.log((ok7?'✅':'❌')+' T7 弹窗: 配和弦按钮='+t7.hasSug+' 4/4织体数='+t7.radios+'(期望9)');
  if(ok7) pass++;
  console.log('PASS(P1A) '+pass);
  console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'NO ERRORS');
  await b.close();
})();
