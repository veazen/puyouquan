const { chromium } = require('playwright');
const F=process.env.MUSETAB_URL || 'file://'+require('path').resolve(__dirname,'../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR:'+e.message)); pg.on('console',m=>{if(m.type()==='error'&&!/sounds|CORS|Failed to load|TUNNEL/.test(m.text()))errs.push('CONSOLE:'+m.text());});
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });   // v41.5 单窗口化：测试内直通未保存确认对话（tv_safety 专测该对话）

  // T1: 吉他谱预设 + 开启联排
  const t1 = await pg.evaluate(()=>{
    const s=PRESETS[0].make(); loadSong(s);
    document.getElementById('tn-both').click();
    const svg=document.getElementById('score').innerHTML;
    return { tabStaff:!!song.tabStaff,
      heads:(()=>{const d='d="'+SMUFL.noteheadBlack.d+'"';let n=0,i=0;while((i=svg.indexOf(d,i))>=0){n++;i+=d.length;}return n;})(),
      xheads:(svg.match(/stroke-width="1\.3" fill="none"\/>/g)||[]).length,
      btnOn:document.getElementById('tn-both').classList.contains('on') };
  });
  console.log('T1 联排开启:', JSON.stringify(t1));
  await pg.waitForTimeout(250);
  const y=await pg.evaluate(()=>{ const svg=document.getElementById('score'); const r=svg.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width}; });
  await pg.screenshot({path:'combo-1.png', clip:{x:Math.max(0,y.x), y:Math.max(0,y.y+140), width:Math.min(1280,y.w), height:430}});

  // T2: 切回仅 TAB
  const t2 = await pg.evaluate(()=>{ document.getElementById('tn-tab').click();
    return { off:!song.tabStaff, heads:document.getElementById('score').innerHTML.includes(SMUFL.noteheadBlack.d)?1:0 }; });
  console.log('T2 切回TAB:', JSON.stringify(t2));

  // T3: 五线谱倚音（vox staff）
  const t3 = await pg.evaluate(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('staff',{title:'',beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V(3,4,{grace:{notes:[{deg:2,oct:0}],dur:16}}),V(5,4,{grace:{notes:[{deg:4,oct:0},{deg:5,oct:0}],dur:16}}),V(1,2,{oct:1})];
    loadSong(s);
    const svg=document.getElementById('score').innerHTML;
    return { graceZones:(svg.match(/data-grace/g)||[]).length, smallHeads:(svg.match(/scale\(4\.650\)/g)||[]).length };
  });
  console.log('T3 五线谱倚音: 热区', t3.graceZones, '| 小符头', t3.smallHeads);

  // T4: 编辑回归（联排下点选 TAB 输品位）
  await pg.evaluate(()=>{ const s=PRESETS[0].make(); s.tabStaff=true; loadSong(s); sel.row='tab'; sel.vi=0; sel.mi=0; sel.ci=0; sel.si=3; blurSel=false; render(); });
  await pg.keyboard.press('5'); await pg.waitForTimeout(200);
  const t4=await pg.evaluate(()=>{ const n=(song.measures[0].tabs[0][0].notes||[]).find(n2=>n2.s===sel.si); return n&&n.f; });
  console.log('T4 联排下TAB输入品位:', t4, '(期望5)');

  // T5: 打印预览含联排
  await pg.evaluate(()=>document.getElementById('b-preview').click()); await pg.waitForTimeout(350);
  const t5=await pg.evaluate(()=>document.getElementById('preview-ov').classList.contains('on'));
  await pg.keyboard.press('Escape');
  console.log('T5 预览:', t5);

  console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'NO ERRORS');
  await b.close();
})();
