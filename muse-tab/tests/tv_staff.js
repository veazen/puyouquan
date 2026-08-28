const { chromium } = require('playwright');
const F=process.env.MUSETAB_URL || 'file://'+require('path').resolve(__dirname,'../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR:'+e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE:'+m.text());});
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.SF_PLAYWAIT = false; });   /* v60.34 回归不等在途音色包 */
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });   // v41.5 单窗口化：测试内直通未保存确认对话（tv_safety 专测该对话）

  // T1: 建五线谱曲谱 + 填音符（含8分组、16分、附点、升降、高低八度、休止、连音线、三连音）
  const t1 = await pg.evaluate(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('staff',{title:'五线谱测试',beats:4,unit:4,key:'G',tempo:90,nMea:4,nVox:1,lyr:1});
    s.measures[0].voxes[0]=[V(1,4,{lyrics:['多']}),V(2,4,{lyrics:['来']}),V(3,8,{lyrics:['米']}),V(4,8,{lyrics:['发']}),V(5,4,{lyrics:['索']})];
    s.measures[1].voxes[0]=[V(6,8),V(7,8),V(1,8,{oct:1}),V(2,8,{oct:1}),V(4,4,{acc:'#',lyrics:['升']}),V(0,4)];
    s.measures[2].voxes[0]=[V(5,2,{dotted:true,tie:true}),V(5,4)];
    s.measures[3].voxes[0]=[V(3,32,{tup:1}),V(3,32,{tup:1}),V(3,32,{tup:1}),V(3,16),V(5,8),V(1,2,{oct:-1})];
    loadSong(s);
    const svg=document.getElementById('score').innerHTML;
    return {
      staffLines:(svg.match(/stroke-width="0\.8"/g)||[]).length,     // 5线×系统数
      heads:['noteheadBlack','noteheadHalf','noteheadWhole'].reduce((a,g)=>{const d='d="'+SMUFL[g].d+'"';let n=0,i=0;while((i=svg.indexOf(d,i))>=0){n++;i+=d.length;}return a+n;},0),
      clef:svg.includes('scale(1)')||svg.includes('translate(')&&svg.includes('22.6'),
      keysig:(()=>{const d='d="'+SMUFL.accidentalSharp.d+'"';let n=0,i=0;while((i=svg.indexOf(d,i))>=0){n++;i+=d.length;}return n;})(),                    // G大调1个升号×系统
      beams:(svg.match(/Z" fill="var\(--ink\)"/g)||[]).length,
      type:docType(song)
    };
  });
  console.log('T1 五线谱新建:', JSON.stringify(t1));
  await pg.waitForTimeout(200);
  await pg.screenshot({path:'staff-1.png', clip:{x:330,y:170,width:820,height:420}});

  // T2: 切回简谱再切回五线谱（同一数据）
  const t2 = await pg.evaluate(()=>{
    sel.row='vox'; sel.vi=0;
    document.getElementById('vn-jp').click();
    const jian=document.getElementById('score').innerHTML.includes('font-size="16" font-weight="500" font-family="var(--font-ui)"');
    document.getElementById('vn-st').click();
    const staff=document.getElementById('score').innerHTML.includes(SMUFL.noteheadBlack.d);
    return {切回简谱显示数字:jian, 再切五线谱显示符头:staff};
  });
  console.log('T2 记谱法互切:', JSON.stringify(t2));

  // T3: 点选/编辑（点击第2小节第1音，敲数字改音高）
  const box=await pg.evaluate(()=>{ const b2=colBoxes['v0:1:0']; const svg=document.getElementById('score'); const r2=svg.getBoundingClientRect(); const sc=r2.width/svg.viewBox.baseVal.width; return b2?{x:r2.left+(b2.x+b2.w/2)*sc, y:r2.top+(b2.y+10)*sc}:null; });
  if(box){ await pg.mouse.click(box.x,box.y); await pg.waitForTimeout(150); }
  const selOK=await pg.evaluate(()=>({mi:sel.mi,ci:sel.ci,row:sel.row}));
  await pg.keyboard.press('3'); await pg.waitForTimeout(150);
  const degNow=await pg.evaluate(()=>song.measures[1].voxes[0][0].deg);
  console.log('T3 点选:', JSON.stringify(selOK), '| 敲3改音高:', degNow, '(期望3)');

  // T4: 降号调（Eb）调号绘制
  const t4=await pg.evaluate(()=>{ song.key='Eb'; render(); const svg=document.getElementById('score').innerHTML; const d='d="'+SMUFL.accidentalFlat.d+'"';let n=0,i=0;while((i=svg.indexOf(d,i))>=0){n++;i+=d.length;}return n; });
  console.log('T4 Eb调降号数(×系统):', t4);
  await pg.evaluate(()=>{ song.key='G'; render(); });

  // T5: 回归——吉他谱预设不受影响
  const t5=await pg.evaluate(()=>{ const s=PRESETS[0].make(); loadSong(s); const ok=document.getElementById('score').innerHTML.length>2000; return ok; });
  console.log('T5 吉他谱预设回归:', t5);

  // T7(v51.1): 谱号直接点击修改——行首谱号热区/弹窗换谱号/联排谱号/小节内小谱号
  const t7 = await (async ()=>{
    const r={};
    // 7a: 行首谱号热区存在 + 真实鼠标点击弹出谱号菜单
    await pg.evaluate(()=>{ const s=createSong('staff',{title:'谱号点击',beats:4,unit:4,key:'C',tempo:90,nMea:2,nVox:1,lyr:0});
      s.measures[0].voxes[0]=[{dur:4,deg:1,acc:'',oct:0,lyrics:[]},{dur:4,deg:3,acc:'',oct:0,lyrics:[]}]; loadSong(s); });
    const hot = await pg.evaluate(()=>{ const el=document.querySelector('[data-clefhead="vox:0"]'); if(!el) return null;
      const b2=el.getBoundingClientRect(); return {x:b2.left+b2.width/2, y:b2.top+b2.height/2}; });
    r.行首热区存在 = !!hot;
    if(hot){ await pg.mouse.click(hot.x, hot.y); await pg.waitForTimeout(150); }
    r.弹窗三谱号 = await pg.evaluate(()=> document.querySelectorAll('#popmenu [data-chd]').length===3);
    // 7b: 选低音谱号 → 声部级谱号改变 + 谱面出现 F 谱号字形
    await pg.evaluate(()=>{ const b2=document.querySelector('#popmenu [data-chd="bass"]'); if(b2) b2.click(); });
    await pg.waitForTimeout(150);
    r.声部改低音 = await pg.evaluate(()=> (song.voxNotations||[])[0]==='bass'
      && document.getElementById('score').innerHTML.includes(SMUFL.fClef.d)
      && !document.getElementById('popmenu'));
    // 7c: 联排五线谱（TAB+五线谱）行首谱号热区 → 换低音 8vb（tabClef）
    await pg.evaluate(()=>{ const s=PRESETS[0].make(); s.tabStaff=true; loadSong(s); });
    const hot2 = await pg.evaluate(()=>{ const el=document.querySelector('[data-clefhead="tab"]'); if(!el) return null;
      const b2=el.getBoundingClientRect(); return {x:b2.left+b2.width/2, y:b2.top+b2.height/2}; });
    r.联排热区存在 = !!hot2;
    if(hot2){ await pg.mouse.click(hot2.x, hot2.y); await pg.waitForTimeout(150); }
    await pg.evaluate(()=>{ const b2=document.querySelector('#popmenu [data-chd="bass"]'); if(b2) b2.click(); });
    await pg.waitForTimeout(150);
    r.联排改低音 = await pg.evaluate(()=> song.tabClef==='bass');
    // 7d: 小节内换谱号小谱号热区 → 点击直达该列谱号菜单并可改换
    await pg.evaluate(()=>{ const s=createSong('staff',{title:'小谱号点击',beats:4,unit:4,key:'C',tempo:90,nMea:2,nVox:1,lyr:0});
      s.measures[0].voxes[0]=[{dur:4,deg:1,acc:'',oct:0,lyrics:[]},{dur:4,deg:3,acc:'',oct:0,lyrics:[]}];
      s.measures[1].voxes[0]=[{dur:4,deg:5,acc:'',oct:0,lyrics:[],clef:'alto'},{dur:4,deg:6,acc:'',oct:0,lyrics:[]}]; loadSong(s); });
    const hot3 = await pg.evaluate(()=>{ const el=document.querySelector('[data-clefmid="1:0:0"]'); if(!el) return null;
      const b2=el.getBoundingClientRect(); return {x:b2.left+b2.width/2, y:b2.top+b2.height/2}; });
    r.小谱号热区存在 = !!hot3;
    if(hot3){ await pg.mouse.click(hot3.x, hot3.y); await pg.waitForTimeout(150); }
    await pg.evaluate(()=>{ const b2=document.querySelector('#popmenu [data-cl="bass"]'); if(b2) b2.click(); });
    await pg.waitForTimeout(150);
    r.列谱号改低音 = await pg.evaluate(()=> song.measures[1].voxes[0][0].clef==='bass');
    return r;
  })();
  const t7fail = Object.entries(t7).filter(([k,v])=>!v).map(([k])=>k);
  console.log('T7 谱号点击修改(v51.1):', JSON.stringify(t7), t7fail.length?('FAIL:'+t7fail.join(',')):'PASS');
  if(t7fail.length) process.exitCode=1;

  // T6: 播放不报错（staff 谱）
  await pg.evaluate(()=>{ const s=createSong('staff',{beats:4,unit:4,key:'C',nMea:2,nVox:1,lyr:0}); s.measures[0].voxes[0]=[{dur:4,deg:1,acc:'',oct:0,lyrics:[]},{dur:4,deg:3,acc:'',oct:0,lyrics:[]},{dur:4,deg:5,acc:'',oct:0,lyrics:[]},{dur:4,deg:1,acc:'',oct:1,lyrics:[]}]; loadSong(s); });
  await pg.evaluate(()=>document.getElementById('b-play').click()); await pg.waitForTimeout(600);
  await pg.evaluate(()=>document.getElementById('b-play').click());
  console.log('T6 五线谱播放启停: 完成');

  console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'NO ERRORS');
  await b.close();
})();
