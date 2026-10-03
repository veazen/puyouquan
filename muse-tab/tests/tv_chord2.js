const { chromium } = require('playwright');
const F=process.env.MUSETAB_URL || 'file://'+require('path').resolve(__dirname,'../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR:'+e.message)); pg.on('console',m=>{if(m.type()==='error'&&!/sounds|CORS|Failed to load|TUNNEL/.test(m.text()))errs.push('CONSOLE:'+m.text());});
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.SF_PLAYWAIT = false; });   /* v60.34 回归不等在途音色包 */
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });   // v41.5 单窗口化：测试内直通未保存确认对话（tv_safety 专测该对话）
  const CNT = `const cnt=g=>{const d='d="'+SMUFL[g].d+'"';const h=document.getElementById('score').innerHTML;let n=0,i=0;while((i=h.indexOf(d,i))>=0){n++;i+=d.length;}return n;};`;

  // T1 五线谱和音渲染：C-E-G 柱式（3符头1符干）+ 二度 C-D（翻转）
  const t1 = await pg.evaluate(CNT+`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('staff',{title:'和音',beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[
      V(1,2,{adds:[{deg:3,acc:'',oct:0},{deg:5,acc:'',oct:0}]}),   // C-E-G 柱式
      V(1,2,{adds:[{deg:2,acc:'',oct:0}]})];                       // C-D 二度（翻转）
    loadSong(s); blurSel=true; render();
    const h=document.getElementById('score').innerHTML;
    const halves=cnt('noteheadHalf');
    const stems=(h.match(/stroke-width="1.1"><\\/line>/g)||[]).length;
    // 二度翻转：第2列两个符头 x 相差约6.6
    const key='d="'+SMUFL.noteheadHalf.d+'" transform="translate(';
    const xs=[]; let i=0;
    while((i=h.indexOf(key,i))>=0){ const m=h.slice(i+key.length-12).match(/translate\\(([\\d.-]+),/); xs.push(+m[1]); i+=key.length; }
    xs.sort((a,b2)=>a-b2);
    const flipGap = +(xs[xs.length-1]-xs[xs.length-2]).toFixed(1);
    return {halves, stems, flipGap, nan:h.includes('NaN')};
  })()`);
  console.log('T1 五线谱和音: 符头='+t1.halves+'(期望5) 符干='+t1.stems+'(期望2共用) 二度错位='+t1.flipGap+'(期望6.6)',
    t1.halves===5&&t1.stems===2&&Math.abs(t1.flipGap-6.6)<0.2&&!t1.nan?'✅':'❌');
  await pg.waitForTimeout(200);
  let r=await pg.evaluate(()=>{ const r2=document.getElementById('score').getBoundingClientRect(); return {x:r2.x,y:r2.y,w:r2.width}; });
  await pg.screenshot({path:'v376-chords.png', clip:{x:Math.max(0,r.x), y:Math.max(0,r.y+120), width:Math.min(1100,r.w), height:200}});

  // T2 简谱视图叠置数字
  // v60.14：原断言写死 font-size="12" 字面量，字号后来调整过（现主音 16.5 / 和音 14.5），长期误报。
  // 改为几何断言：和音数字个数 + 与主音同 x、y 更小（叠在主音上方）——与字号脱钩。
  const t2 = await pg.evaluate(()=>{
    document.getElementById('vn-jp').click();
    /* v64.2 起无和弦图的谱不再预留 56 图带、谱面整体上移——改为「页头 1=X 之下」，不写死 y>150 */
    const kt=[...document.getElementById('score').querySelectorAll('text')].find(t=>/^1=/.test(t.textContent||''));
    const yMin=(kt? +kt.getAttribute('y') : 0)+10;
    const ts=[...document.getElementById('score').querySelectorAll('text')]
      .filter(t=>/^[1-7]$/.test((t.textContent||'').trim()) && +t.getAttribute('y')>yMin);
    const fs=t=>+t.getAttribute('font-size'), X=t=>+t.getAttribute('x'), Y=t=>+t.getAttribute('y');
    const top=Math.max.apply(null, ts.map(fs));
    const mains=ts.filter(t=>fs(t)===top), adds=ts.filter(t=>fs(t)<top);
    const stacked=adds.length>0 && adds.every(a=>mains.some(m=>Math.abs(X(m)-X(a))<1 && Y(a)<Y(m)));
    return { small:adds.length, mains:mains.length, stacked };
  });
  console.log('T2 简谱和音叠置: 和音数字='+t2.small+'(期望3) 主音='+t2.mains+'(期望2) 叠在主音上方='+t2.stacked,
    (t2.small===3&&t2.mains===2&&t2.stacked)?'✅':'❌');

  // T3 柱式织体生成（block：右手4个柱式+左手分解）
  const t3 = await pg.evaluate(()=>{
    const s=createSong('pianoacc',{lyr:0,beats:4,unit:4,key:'C',nMea:2});
    s.measures[0].voxes[0][0].chord='C'; s.measures[1].voxes[0][0].chord='Am';
    loadSong(s);
    mutate(()=>genAccompaniment('block',0,1));
    const r0=song.measures[0].voxes[0], r1=song.measures[1].voxes[0];
    return { m0adds:(r0[0].adds||[]).length, m0main:r0[0].deg,
      amAdds:(r1[0].adds||[]).map(a=>a.deg+''+(a.oct||0)).join(' '), amMain:r1[0].deg+''+(r1[0].oct||0) };
  });
  // Am 柱式：主音6(oct-1?) — Am root A=57+12=69? 右手基准 root=(9<8?):36+9=45 +12 = 57 → A3=57: rel=57-60=-3 → oct-1 deg6；3音=C4:60→deg1 oct0；5音=E4:64→deg3 oct0
  console.log('T3 柱式织体: C柱式 adds='+t3.m0adds+'(期望2) 主音='+t3.m0main+'(期望1) | Am 主='+t3.amMain+'(期望6-1) adds='+t3.amAdds+'(期望 10 30)',
    t3.m0adds===2&&t3.m0main===1&&t3.amMain==='6-1'&&t3.amAdds==='10 30'?'✅':'❌');
  await pg.waitForTimeout(200);
  r=await pg.evaluate(()=>{ blurSel=true; render(); const r2=document.getElementById('score').getBoundingClientRect(); return {x:r2.x,y:r2.y,w:r2.width}; });
  await pg.screenshot({path:'v376-block.png', clip:{x:Math.max(0,r.x), y:Math.max(0,r.y+95), width:Math.min(1100,r.w), height:320}});

  // T4 播放启停无报错（含和音）
  await pg.evaluate(()=>document.getElementById('b-play').click()); await pg.waitForTimeout(700);
  await pg.evaluate(()=>document.getElementById('b-play').click());
  console.log('T4 和音播放启停: 完成');

  // T5 和音按钮 + 半分解/圆舞曲柱式在库
  const t5 = await pg.evaluate(()=>({
    btn: !!document.getElementById('b-addnote'),
    tex: PIANO_TEX.map(t=>t.id).join(','),
  }));
  console.log('T5 UI/织体库: 和音按钮='+t5.btn+' 织体='+t5.tex, t5.btn&&t5.tex.includes('block')&&t5.tex.includes('halfbrk')&&t5.tex.includes('waltz2')?'✅':'❌');

  console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'NO ERRORS');
  await b.close();
})();
